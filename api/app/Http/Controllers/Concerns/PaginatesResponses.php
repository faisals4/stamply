<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

/**
 * Standard envelope for every paginated list response so the frontend always
 * sees the same shape regardless of which controller served it.
 *
 * Wraps Laravel's LengthAwarePaginator into:
 *   { data: [...], meta: { current_page, last_page, per_page, total, from, to } }
 *
 * Controllers that return lists should:
 *   1. `use PaginatesResponses` at the top
 *   2. `$p = $query->paginate($this->resolvePerPage($request));`
 *   3. `return $this->paginated($p->through(fn ($m) => [...serialized...]));`
 */
trait PaginatesResponses
{
    /**
     * Wrap a paginator into the standard envelope. If `$transformer` is given
     * it's applied to each row before serialization.
     */
    protected function paginated(LengthAwarePaginator $p): JsonResponse
    {
        return response()->json([
            'data' => $p->items(),
            'meta' => [
                'current_page' => $p->currentPage(),
                'last_page' => $p->lastPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'from' => $p->firstItem(),
                'to' => $p->lastItem(),
            ],
        ]);
    }

    /**
     * Resolve a caller-supplied `per_page` query param, clamped to sane
     * bounds. Defaults to 25 (matches the frontend Pagination component).
     */
    protected function resolvePerPage(\Illuminate\Http\Request $request, int $default = 25, int $max = 100): int
    {
        $perPage = (int) $request->query('per_page', $default);
        if ($perPage < 1) {
            return $default;
        }
        return min($perPage, $max);
    }
}
