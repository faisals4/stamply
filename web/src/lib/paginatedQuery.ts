import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { Paginated } from '@/types/pagination'

/**
 * Thin wrapper around `useQuery` for server-paginated endpoints. Uses
 * `keepPreviousData` so clicking "next page" doesn't flash an empty table —
 * the old data stays visible until the new page arrives.
 *
 * Usage:
 *   const { data, isLoading } = usePaginatedQuery(
 *     ['stamps-report', { q, reason }],
 *     (p) => fetchStampsReport({ page: p, q, reason }),
 *     page,
 *   )
 */
export function usePaginatedQuery<T>(
  key: unknown[],
  fetcher: (page: number) => Promise<Paginated<T>>,
  page: number,
) {
  return useQuery({
    queryKey: [...key, page],
    queryFn: () => fetcher(page),
    placeholderData: keepPreviousData,
  })
}
