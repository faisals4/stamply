<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Central Customer Profile refactor — normalise personal information
 * out of the tenant-scoped `customers` table into a new
 * `customer_profiles` table keyed by phone.
 *
 * Before:
 *   customers(id, tenant_id, phone, first_name, last_name, email,
 *             birthdate, phone_verified_at, locale, source_utm,
 *             last_activity_at)
 *   unique(tenant_id, phone)
 *
 *   Same real person signed up at 3 merchants → 3 rows with duplicated
 *   (and potentially diverging) personal fields.
 *
 * After:
 *   customer_profiles(id, phone UNIQUE, first_name, last_name, email,
 *                     birthdate, gender, phone_verified_at,
 *                     locked_fields JSON)
 *
 *   customers(id, tenant_id, customer_profile_id, locale, source_utm,
 *             last_activity_at)
 *   unique(tenant_id, customer_profile_id)
 *
 *   Personal data lives in one row; the per-tenant `customers` row
 *   holds only the relationship (which merchant, what locale they
 *   prefer to be messaged in, when they last visited this merchant).
 *
 * Smart-merge backfill: when the same phone has multiple rows with
 * different names/emails, the "winner" for the single profile is
 * picked by this order:
 *   1. any row with phone_verified_at != null
 *   2. the most recently updated row
 *   3. the row with the most non-null personal fields
 *   4. the oldest row (first signup)
 *
 * Every discarded candidate is logged to storage/logs/
 * profile-migration-conflicts.log so the operator can reconcile
 * manually if needed.
 *
 * The migration runs in a single transaction (Postgres default for
 * Schema + DML). Any failure mid-way rolls back the entire change,
 * so a partial DB state is impossible.
 */
return new class extends Migration {
    public function up(): void
    {
        // 1. Create the new central profiles table.
        Schema::create('customer_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 32)->unique();
            $table->timestamp('phone_verified_at')->nullable();
            $table->string('first_name', 100)->nullable();
            $table->string('last_name', 100)->nullable();
            $table->string('email', 255)->nullable();
            $table->date('birthdate')->nullable();
            // male | female | null — CHECK constraint added below.
            $table->string('gender', 10)->nullable();
            // JSON array of field names the customer has locked
            // from merchant edits (e.g. ["first_name","email"]).
            // null or empty = merchant can edit everything.
            $table->json('locked_fields')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('phone_verified_at');
        });

        DB::statement("ALTER TABLE customer_profiles ADD CONSTRAINT customer_profiles_gender_check CHECK (gender IN ('male','female') OR gender IS NULL)");

        // 2. Add a nullable customer_profile_id to customers so we
        //    can backfill before dropping the old columns.
        Schema::table('customers', function (Blueprint $table) {
            $table->unsignedBigInteger('customer_profile_id')->nullable()->after('tenant_id');
        });

        // 3. Backfill: one CustomerProfile per distinct phone, with
        //    smart-merge conflict resolution. We loop in PHP rather
        //    than a giant SQL because we need per-phone ranking.
        $this->backfillProfiles();

        // 4. Revoke any existing Sanctum tokens bound to the old
        //    Customer model — they point at tenant-scoped rows and
        //    would behave incorrectly after the refactor. Users
        //    will re-auth via OTP; the mobile client already
        //    handles 401 by bouncing to /login.
        DB::table('personal_access_tokens')
            ->where('tokenable_type', \App\Models\Customer::class)
            ->delete();

        // 5. Drop the old per-tenant personal columns and the
        //    (tenant_id, phone) unique, now that every row points
        //    at a profile.
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique('customers_tenant_id_phone_unique');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex('customers_phone_verified_at_index');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'phone_verified_at',
                'first_name',
                'last_name',
                'email',
                'birthdate',
            ]);
        });

        // 6. Now make customer_profile_id required, add the FK, and
        //    lock the (tenant_id, customer_profile_id) unique so a
        //    customer can't have two relationships to the same
        //    merchant.
        Schema::table('customers', function (Blueprint $table) {
            // Requires raw SQL because Laravel's ->change() needs
            // doctrine/dbal for Postgres NOT NULL toggles.
        });
        DB::statement('ALTER TABLE customers ALTER COLUMN customer_profile_id SET NOT NULL');

        Schema::table('customers', function (Blueprint $table) {
            $table->foreign('customer_profile_id')
                ->references('id')->on('customer_profiles')
                ->cascadeOnDelete();
            $table->unique(['tenant_id', 'customer_profile_id'], 'customers_tenant_profile_unique');
            $table->index(['customer_profile_id', 'tenant_id'], 'customers_profile_tenant_idx');
        });
    }

    /**
     * Per-phone smart merge. For each distinct non-deleted phone,
     * pick the best row as the profile source and link every
     * customers row with that phone to the new profile.
     *
     * We include soft-deleted rows too so that a later restore has
     * somewhere to point — a deleted relationship row still needs
     * a valid profile FK.
     */
    private function backfillProfiles(): void
    {
        $logPath = storage_path('logs/profile-migration-conflicts.log');
        $logFp = fopen($logPath, 'w');
        fwrite($logFp, "# Profile migration conflict log — ".date('c')."\n");

        // Pull every distinct phone. NULL phones are not allowed by
        // the signup flow so this should be empty, but we guard.
        $phones = DB::table('customers')
            ->whereNotNull('phone')
            ->distinct()
            ->pluck('phone');

        foreach ($phones as $phone) {
            $candidates = DB::table('customers')
                ->where('phone', $phone)
                ->get();

            // Rank: verified > updated_at DESC > most non-null fields > created_at ASC
            $ranked = $candidates->sort(function ($a, $b) {
                // 1. verified first
                $va = $a->phone_verified_at ? 1 : 0;
                $vb = $b->phone_verified_at ? 1 : 0;
                if ($va !== $vb) return $vb <=> $va;

                // 2. most recently updated
                $ua = $a->updated_at ?? '';
                $ub = $b->updated_at ?? '';
                if ($ua !== $ub) return strcmp($ub, $ua);

                // 3. most filled non-null fields
                $fa = $this->fieldCount($a);
                $fb = $this->fieldCount($b);
                if ($fa !== $fb) return $fb <=> $fa;

                // 4. oldest first (stable fallback)
                $ca = $a->created_at ?? '';
                $cb = $b->created_at ?? '';
                return strcmp($ca, $cb);
            });

            $winner = $ranked->first();
            $discarded = $ranked->slice(1);

            // Insert the profile
            $profileId = DB::table('customer_profiles')->insertGetId([
                'phone' => $phone,
                'phone_verified_at' => $winner->phone_verified_at,
                'first_name' => $winner->first_name,
                'last_name' => $winner->last_name,
                'email' => $winner->email,
                'birthdate' => $winner->birthdate,
                'gender' => null,
                'locked_fields' => null,
                'created_at' => $winner->created_at ?? now(),
                'updated_at' => $winner->updated_at ?? now(),
                'deleted_at' => null,
            ]);

            // Point every customers row with this phone at the new profile
            DB::table('customers')
                ->where('phone', $phone)
                ->update(['customer_profile_id' => $profileId]);

            // Log any conflict so a human can reconcile
            if ($discarded->isNotEmpty()) {
                fwrite($logFp, "\nphone={$phone} winner=row#{$winner->id} tenant={$winner->tenant_id}\n");
                fwrite($logFp, "  winner name=".($winner->first_name ?? '')." ".($winner->last_name ?? '')." email=".($winner->email ?? '')." birthdate=".($winner->birthdate ?? '')."\n");
                foreach ($discarded as $d) {
                    fwrite($logFp, "  discarded row#{$d->id} tenant={$d->tenant_id} name=".($d->first_name ?? '')." ".($d->last_name ?? '')." email=".($d->email ?? '')."\n");
                }
            }
        }

        fclose($logFp);
        Log::info('[profile-migration] backfill complete', [
            'profiles_created' => DB::table('customer_profiles')->count(),
            'customers_linked' => DB::table('customers')->whereNotNull('customer_profile_id')->count(),
            'log_file' => $logPath,
        ]);
    }

    private function fieldCount(object $row): int
    {
        return (! empty($row->first_name) ? 1 : 0)
            + (! empty($row->last_name) ? 1 : 0)
            + (! empty($row->email) ? 1 : 0)
            + (! empty($row->birthdate) ? 1 : 0);
    }

    /**
     * Down: restore the old columns and copy the profile data back
     * into every customers row so the old tenant-scoped view of
     * each customer is recreated. Then drop the profiles table.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique('customers_tenant_profile_unique');
            $table->dropIndex('customers_profile_tenant_idx');
            $table->dropForeign(['customer_profile_id']);

            $table->string('phone', 32)->nullable()->after('tenant_id');
            $table->timestamp('phone_verified_at')->nullable()->after('phone');
            $table->string('first_name', 100)->nullable();
            $table->string('last_name', 100)->nullable();
            $table->string('email', 255)->nullable();
            $table->date('birthdate')->nullable();
        });

        // Copy profile data back into every customers row
        $profiles = DB::table('customer_profiles')->get();
        foreach ($profiles as $p) {
            DB::table('customers')
                ->where('customer_profile_id', $p->id)
                ->update([
                    'phone' => $p->phone,
                    'phone_verified_at' => $p->phone_verified_at,
                    'first_name' => $p->first_name,
                    'last_name' => $p->last_name,
                    'email' => $p->email,
                    'birthdate' => $p->birthdate,
                ]);
        }

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('customer_profile_id');
            $table->unique(['tenant_id', 'phone'], 'customers_tenant_id_phone_unique');
            $table->index('phone_verified_at', 'customers_phone_verified_at_index');
        });

        Schema::dropIfExists('customer_profiles');
    }
};
