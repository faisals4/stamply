/**
 * Standard envelope for every paginated list response in the API. Shape is
 * chosen to mirror Laravel's `LengthAwarePaginator->toArray()` so the backend
 * can return `$paginator->toArray()` directly (wrapped under `data`).
 */
export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}
