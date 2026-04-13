<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Subscription enforcement middleware.
 *
 * Controls access based on the tenant's subscription status:
 *   • Active subscription → all requests proceed
 *   • Expired subscription:
 *       – GET  → allowed (read-only browsing + banner shown in frontend)
 *       – POST/PUT/PATCH/DELETE → blocked with 403 "subscription_expired"
 *
 * Includes a 1-day grace period after expiry before blocking starts.
 * Merges subscription metadata into request attributes for downstream use.
 */
class CheckSubscription
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->tenant) {
            return $next($request);
        }

        $tenant = $user->tenant;

        $subscriptionData = [
            'plan' => $tenant->plan,
            'status' => $tenant->subscriptionStatus(),
            'days_remaining' => $tenant->daysRemaining(),
            'expires_at' => $tenant->expiresAt()?->toIso8601String(),
        ];

        if ($tenant->isSubscriptionActive()) {
            $request->attributes->set('subscription', $subscriptionData);

            return $next($request);
        }

        // Subscription expired — attach expiry info but let the request through.
        // The frontend shows an inline banner instead of a full-page blocker.
        $isTrial = $tenant->isTrial();
        $expiresAt = $tenant->expiresAt();

        $expiredData = [
            'plan' => $tenant->plan,
            'expired_at' => $expiresAt?->toDateString(),
            'is_trial' => $isTrial,
        ];

        if ($isTrial) {
            $trialStartedAt = $tenant->created_at;
            $planModel = $tenant->planModel();
            $trialDaysTotal = $planModel?->trial_days ?? 14;
            $trialDaysUsed = $trialStartedAt
                ? min($trialDaysTotal, (int) $trialStartedAt->diffInDays(now()))
                : $trialDaysTotal;

            $expiredData['message'] = "اشتراكك التجريبي ({$trialDaysTotal} يوم) انتهى. تواصل مع الدعم لتجديد اشتراكك.";
            $expiredData['trial_started_at'] = $trialStartedAt?->toDateString();
            $expiredData['trial_days_total'] = $trialDaysTotal;
            $expiredData['trial_days_used'] = $trialDaysUsed;
        } else {
            $planModel = $tenant->planModel();
            $planName = $planModel ? $planModel->name_ar : $tenant->plan;
            $expiredData['message'] = "اشتراكك في خطة {$planName} انتهى بتاريخ {$expiresAt?->toDateString()}. تواصل مع الدعم لتجديد اشتراكك.";
            $expiredData['subscription_starts_at'] = $tenant->subscription_starts_at?->toDateString();
        }

        $request->attributes->set('subscription', $subscriptionData);
        $request->attributes->set('subscription_expired', $expiredData);

        // Block write operations — read-only access when expired
        if (! $request->isMethod('GET')) {
            return response()->json([
                'error' => 'subscription_expired',
                'message' => $expiredData['message'],
            ], 403);
        }

        return $next($request);
    }
}
