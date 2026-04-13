import { api } from './client'

export interface SubscriptionInfo {
  plan: string
  plan_name_ar: string
  plan_name_en: string
  subscription_status: 'active' | 'expired' | 'trial' | 'expiring_soon' | 'disabled'
  is_trial: boolean
  trial_ends_at: string | null
  subscription_starts_at: string | null
  subscription_ends_at: string | null
  plan_price: string
  plan_interval: string
  days_remaining: number
  created_at: string
  plan_details: {
    monthly_price: string
    yearly_price: string
    max_cards: number
    max_locations: number
    max_users: number
    trial_days: number
    features: Record<string, unknown> | null
  } | null
  usage: {
    cards: number
    cards_max: number
    locations: number
    locations_max: number
    users: number
    users_max: number
  }
  recent_logs: Array<{
    id: number
    action: string
    plan_from: string | null
    plan_to: string | null
    starts_at: string | null
    ends_at: string | null
    amount: string
    payment_method: string
    notes: string | null
    performed_by_name: string | null
    created_at: string
  }>
}

export async function getSubscription(): Promise<SubscriptionInfo> {
  const { data } = await api.get<{ data: SubscriptionInfo }>('/subscription')
  return data.data
}
