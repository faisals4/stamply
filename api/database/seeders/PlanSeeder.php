<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

/**
 * Seeds the four subscription plans. Idempotent — uses updateOrCreate
 * on slug so it can be re-run safely after schema changes.
 */
class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
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
                'sort_order' => 0,
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
                'sort_order' => 1,
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
                'sort_order' => 2,
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
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(
                ['slug' => $plan['slug']],
                $plan,
            );
        }
    }
}
