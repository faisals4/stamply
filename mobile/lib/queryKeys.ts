/**
 * Centralized React Query keys for the customer app.
 *
 * Every `useQuery({ queryKey: ... })` call must reference one of
 * these factories instead of writing the array literal inline. This
 * gives:
 *
 *   - One place to grep for "what queries exist"
 *   - Type-safe parameters (e.g. `card(serial)` enforces a string)
 *   - Safe invalidation: `queryClient.invalidateQueries({ queryKey:
 *     queryKeys.card(serial) })` matches the same array shape, no
 *     typos, no drift between fetch and invalidation
 *
 * Pattern follows the standard "queryKey factories" recipe from the
 * React Query docs.
 */
export const queryKeys = {
  /** All cards belonging to the authenticated customer (non-archived). */
  cards: () => ['cards'] as const,

  /** Cards the customer has hidden from the home screen. */
  archivedCards: () => ['archived-cards'] as const,

  /** Single card payload by wallet serial. */
  card: (serial: string) => ['card', serial] as const,

  /** Paginated activity timeline for a single card. */
  cardActivity: (serial: string) => ['card-activity', serial] as const,

  /** All card templates for a tenant + subscribed status. */
  tenantCards: (tenantId: number) => ['tenant-cards', tenantId] as const,

  /** Authenticated customer profile. */
  me: () => ['me'] as const,
} as const;
