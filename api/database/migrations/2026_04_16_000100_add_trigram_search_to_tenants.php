<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Production-grade tenant-name search via PostgreSQL's `pg_trgm`
 * extension + a GIN index on the name column.
 *
 * Why pg_trgm?
 *   - Arabic + English substring search out of the box (Unicode-safe
 *     trigram segmentation).
 *   - Plain `ILIKE '%foo%'` on a large table is O(n) without the
 *     index; the GIN + gin_trgm_ops lookup is effectively O(log n)
 *     and scales to millions of rows in single-digit milliseconds.
 *   - Enables `similarity(name, q)` ranking for "best match first"
 *     without changing the query shape.
 *
 * Scope: only customer-facing discovery (public `/api/app/discover/*`)
 * uses this index. Admin dashboard tenant listing sorts by created_at
 * and doesn't need trigram.
 */
return new class extends Migration
{
    public function up(): void
    {
        // pg_trgm is bundled with every PostgreSQL release since 9.1;
        // it's not a contrib-package install, just an `EXTENSION`
        // the admin has to create once per database. `IF NOT EXISTS`
        // makes this idempotent so re-running on a DB where a prior
        // extension migration already enabled it stays a no-op.
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        // GIN index on the tenant name. `gin_trgm_ops` is the
        // pg_trgm-provided operator class that teaches GIN how to
        // handle trigrams. With this in place a query like
        //   WHERE name ILIKE '%مقهى%'
        // does an index scan instead of the default sequential scan.
        DB::statement(
            'CREATE INDEX IF NOT EXISTS tenants_name_trgm_idx '.
            'ON tenants USING GIN (name gin_trgm_ops)'
        );
    }

    public function down(): void
    {
        Schema::table('tenants', function () {
            DB::statement('DROP INDEX IF EXISTS tenants_name_trgm_idx');
        });
        // Intentionally NOT dropping the extension — other tables may
        // depend on it in the future, and `CREATE EXTENSION` is
        // harmless to re-run.
    }
};
