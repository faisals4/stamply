import { api } from './api'

export interface DashboardStats {
  customers: number
  cards: number
  active_cards: number
  issued_cards: number

  stamps_today: number
  redemptions_today: number
  new_customers_today: number

  stamps_week: number
  active_customers_week: number

  new_customers_month: number
  total_rewards_redeemed: number

  upcoming_birthdays_week: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<{ data: DashboardStats }>('/dashboard/stats')
  return data.data
}
