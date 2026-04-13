import type { CardDesign, CardType, CardStatus, RegistrationField } from './card'

export interface PublicTemplate {
  kind: 'card'
  id: number
  public_slug?: string | null
  name: string
  description: string | null
  type: CardType
  design: CardDesign
  settings: {
    welcomeStamps?: number
    registrationFields?: RegistrationField[]
    [k: string]: unknown
  }
  rewards: { id: number; name: string; stamps_required: number }[]
  tenant: {
    name: string
    subdomain: string
    description?: string | null
    logo?: string | null
  }
}

/** Returned when /c/{subdomain} matches a tenant with 2+ active cards. */
export interface PublicCatalog {
  kind: 'catalog'
  tenant: {
    name: string
    subdomain: string
    description?: string | null
    logo?: string | null
  }
  cards: {
    id: number
    public_slug: string | null
    name: string
    description: string | null
    type: CardType
    design: CardDesign
    rewards: { id: number; name: string; stamps_required: number }[]
  }[]
}

export type PublicTemplateOrCatalog = PublicTemplate | PublicCatalog

export interface IssuedCardView {
  serial_number: string
  stamps_count: number
  status: string
  issued_at: string
  /** How many times the customer has redeemed a reward on this card. */
  total_redemptions: number
  customer: {
    phone: string
    name: string
    /** ISO 8601 timestamp when the customer proved phone ownership via
     *  the /i/:serial OTP flow. `null` means the phone is not yet
     *  verified — the public card page shows a prompt block. */
    phone_verified_at: string | null
  }
  /** Platform-wide feature flags set by the SaaS operator. The public
   *  page uses these to decide which optional UI blocks to show. */
  features?: {
    /** When false, the post-signup OTP prompt is hidden entirely. */
    phone_verification: boolean
  }
  template: {
    id: number
    name: string
    description: string | null
    design: CardDesign
    rewards: { id: number; name: string; stamps_required: number }[]
  }
  tenant?: {
    name: string
    subdomain: string
    description?: string | null
    logo?: string | null
  }
}

export interface CashierCardView {
  serial_number: string
  stamps_count: number
  status: string
  last_used_at: string | null
  customer: { id: number; phone: string; name: string }
  template: {
    id: number
    name: string
    design: CardDesign
    rewards: {
      id: number
      name: string
      stamps_required: number
      can_redeem: boolean
    }[]
  }
}

/**
 * Field names the customer can lock on their central profile. When a
 * field is in `locked_fields` the merchant API returns 423 Locked on
 * any attempt to edit it through the tenant customer controller.
 *
 * Keep this in sync with the backend `CustomerProfileController::LOCKABLE_FIELDS`
 * constant and the mobile `LockableField` type.
 */
export type LockableField =
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'birthdate'
  | 'gender'

export type Gender = 'male' | 'female'

export interface Customer {
  id: number
  phone: string
  first_name: string | null
  last_name: string | null
  full_name: string
  email: string | null
  birthdate: string | null
  gender: Gender | null
  /** ISO 8601 timestamp — set when the customer proves phone ownership
   *  via OTP. Read-only from the merchant side. */
  phone_verified_at: string | null
  /** Profile fields the customer has locked from merchant edits. Any
   *  field listed here will cause PUT /customers/{id} to return 423
   *  if the merchant tries to change it. */
  locked_fields: LockableField[]
  source_utm: string | null
  issued_cards_count: number
  last_activity_at: string | null
  created_at: string
}

export interface ActivityEntry {
  kind: 'stamp' | 'redemption'
  // Stamp fields
  count?: number
  reason?: string
  by?: string | null
  // Redemption fields
  reward_name?: string | null
  stamps_used?: number
  status?: string
  code?: string
  // Common
  at: string
}

/** Summary shape returned inline with CustomerDetail. Activity is NOT
 * returned here anymore — call `fetchCardActivity` for the paginated feed. */
export interface CustomerCardDetail {
  id: number
  serial_number: string
  stamps_count: number
  status: string
  issued_at: string
  last_used_at: string | null
  view_url: string
  template: { id: number; name: string; design: CardDesign }
  stats: { stamps_earned: number; rewards_redeemed: number; total_activity?: number }
}

export interface CustomerDetail extends Customer {
  stats: {
    cards_count: number
    total_stamps_earned: number
    total_rewards_redeemed: number
    days_since_signup: number | null
  }
  issued_cards: CustomerCardDetail[]
}

// Re-export commonly used
export type { CardDesign, CardType, CardStatus }
