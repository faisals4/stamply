<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();            // trial, basic, growth, business
            $table->string('name_ar');
            $table->string('name_en');
            $table->decimal('monthly_price', 8, 2)->default(0);
            $table->decimal('yearly_price', 8, 2)->default(0);
            $table->integer('max_cards')->default(1);
            $table->integer('max_locations')->default(1);
            $table->integer('max_users')->default(1);
            $table->integer('trial_days')->default(0);    // 14 for trial plan
            $table->json('features')->nullable();          // ميزات إضافية مرنة
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Seed default plans
        $now = now();
        DB::table('plans')->insert([
            [
                'slug' => 'trial',
                'name_ar' => 'تجريبي',
                'name_en' => 'Trial',
                'monthly_price' => 0,
                'yearly_price' => 0,
                'max_cards' => 1,
                'max_locations' => 1,
                'max_users' => 2,
                'trial_days' => 14,
                'features' => null,
                'is_active' => true,
                'sort_order' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'basic',
                'name_ar' => 'الأساسي',
                'name_en' => 'Basic',
                'monthly_price' => 40,
                'yearly_price' => 384,
                'max_cards' => 1,
                'max_locations' => 1,
                'max_users' => 5,
                'trial_days' => 0,
                'features' => null,
                'is_active' => true,
                'sort_order' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'growth',
                'name_ar' => 'النمو',
                'name_en' => 'Growth',
                'monthly_price' => 80,
                'yearly_price' => 768,
                'max_cards' => 3,
                'max_locations' => 3,
                'max_users' => 10,
                'trial_days' => 0,
                'features' => null,
                'is_active' => true,
                'sort_order' => 2,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'business',
                'name_ar' => 'الأعمال',
                'name_en' => 'Business',
                'monthly_price' => 120,
                'yearly_price' => 1152,
                'max_cards' => 10,
                'max_locations' => 10,
                'max_users' => 50,
                'trial_days' => 0,
                'features' => null,
                'is_active' => true,
                'sort_order' => 3,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
