import { useState, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Stamp as StampIcon, Award, ChevronDown } from 'lucide-react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, CardActivityEntry } from '../../lib/api';
import { surfaces } from '../../lib/surfaces';
import { queryKeys } from '../../lib/queryKeys';
import { colors } from '../../lib/colors';

type Props = {
  serial: string;
  /** Seed data rendered instantly before the first paginated fetch.
   *  Comes from the cards index endpoint so the preview appears
   *  without an extra network call. */
  initialStamps?: Array<{ id: number; created_at: string | null }>;
  initialRedemptions?: Array<{
    id: number;
    reward_name: string | null;
    created_at: string | null;
  }>;
};

const PREVIEW_COUNT = 3;
const PAGE_SIZE = 10;

/**
 * Format an ISO timestamp as Gregorian Latin-digit text, e.g.
 * `09 Apr 2026, 11:01 PM`. The web `Intl.DateTimeFormat` honours the
 * explicit `en-GB-u-ca-gregory-nu-latn` locale override so the output
 * is identical regardless of the app's display language.
 *
 * Previously we called `toLocaleString('ar-SA', ...)` which emitted
 * Hijri calendar + Arabic-Indic digits — fine for rich text but hard
 * to skim in a log list where the customer wants a quick-scan of
 * "when did this happen".
 */
function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    // Force Gregorian + Latin digits via locale extensions.
    const s = d.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    // `toLocaleString` on some environments (older Safari, RNW) can
    // still emit Arabic-Indic digits if the document is dir="rtl".
    // `onlyDigits` normalises back to 0-9 but drops separators —
    // which isn't what we want here. Instead do a targeted replace
    // over Arabic-Indic + Persian digit ranges.
    return s.replace(/[\u0660-\u0669]/g, (ch) =>
      String(ch.charCodeAt(0) - 0x0660),
    ).replace(/[\u06F0-\u06F9]/g, (ch) =>
      String(ch.charCodeAt(0) - 0x06f0),
    );
  } catch {
    return iso;
  }
}

/**
 * A unified activity feed for a single card:
 *   - Renders a compact preview of the 3 most recent events inline.
 *   - A "show more" button opens the full paginated history below,
 *     fetched 10 rows at a time via `useInfiniteQuery`.
 *
 * Each row labels its type (stamp vs redemption) so the customer
 * understands what actually happened — not just "something on this
 * date". Merchant redemptions get the reward name + an award icon;
 * stamps get a stamp icon.
 */
export function ActivityTimeline({
  serial,
  initialStamps = [],
  initialRedemptions = [],
}: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // Merge + sort the seed data for the preview. We don't use the
  // backend endpoint here on purpose — the index response already
  // ships stamps + redemptions inline, so showing them instantly is
  // cheaper than an extra round trip.
  const preview = useMemo(() => {
    const merged: CardActivityEntry[] = [
      ...initialStamps.map<CardActivityEntry>((s) => ({
        type: 'stamp',
        id: s.id,
        created_at: s.created_at,
        count: 1,
        reason: null,
      })),
      ...initialRedemptions.map<CardActivityEntry>((r) => ({
        type: 'redemption',
        id: r.id,
        created_at: r.created_at,
        reward_name: r.reward_name,
      })),
    ];
    merged.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    return merged.slice(0, PREVIEW_COUNT);
  }, [initialStamps, initialRedemptions]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.cardActivity(serial),
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.cardActivity(serial, pageParam, PAGE_SIZE);
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.has_more ? lastPage.meta.page + 1 : undefined,
    enabled: expanded,
  });

  // Keep showing the preview rows while the first paginated fetch
  // is in-flight, so the block never goes empty mid-expand. Once
  // the first page arrives we switch to the server data. This way
  // the loading indicator appears UNDER the existing rows and
  // nothing jumps.
  const hasFetchedRows = expanded && (data?.pages?.length ?? 0) > 0;
  const fullRows: CardActivityEntry[] = hasFetchedRows
    ? (data?.pages ?? []).flatMap((p) => p.data)
    : preview;
  const isInitialLoading = expanded && !hasFetchedRows && isFetching;

  const hasAnything = fullRows.length > 0;
  if (!hasAnything && !expanded) {
    // Hide the whole block when the card has no stamps or
    // redemptions yet. The block reappears once the customer
    // earns their first stamp.
    return null;
  }

  // A single "loading more" flag that covers both the first
  // expand-triggered fetch AND every follow-up "load more" click.
  // Drives the inline spinner under the last row so the list never
  // collapses to an empty state.
  const showInlineSpinner = isInitialLoading || isFetchingNextPage;

  return (
    <View className={`${surfaces.card} p-4`}>
      <Text className="mb-3 text-2xs font-semibold text-gray-900">
        {t('card_detail.stamps_history')}
      </Text>

      {fullRows.map((row, i) => (
        <ActivityRow
          key={`${row.type}-${row.id}`}
          row={row}
          showDivider={i > 0}
        />
      ))}

      {/* Inline loading indicator — appears directly under the last
          row without removing the rows themselves, so the block
          never goes blank while the next page is in flight. */}
      {showInlineSpinner ? (
        <View className="mt-3 items-center py-2">
          <ActivityIndicator size="small" color={colors.brand.DEFAULT} />
        </View>
      ) : null}

      {/* Show-more toggle. The first press expands from preview →
          paginated mode and kicks off the initial fetch; subsequent
          presses pull the next page. Hidden while the spinner is up
          so the two don't stack. Also hidden when the card has no
          activity yet — nothing to load. */}
      {!showInlineSpinner && !expanded ? (
        <Pressable
          onPress={() => setExpanded(true)}
          className="mt-3 flex-row items-center justify-center gap-1.5 py-2"
        >
          <Text className="text-2xs font-semibold text-brand">
            {t('card_detail.show_more')}
          </Text>
          <ChevronDown color={colors.brand.DEFAULT} size={14} strokeWidth={2} />
        </Pressable>
      ) : !showInlineSpinner && hasNextPage ? (
        <Pressable
          onPress={() => fetchNextPage()}
          disabled={isFetching}
          className="mt-3 flex-row items-center justify-center gap-1.5 py-2"
        >
          <Text className="text-2xs font-semibold text-brand">
            {t('card_detail.load_more')}
          </Text>
          <ChevronDown color={colors.brand.DEFAULT} size={14} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ActivityRow({
  row,
  showDivider,
}: {
  row: CardActivityEntry;
  showDivider: boolean;
}) {
  const { t } = useTranslation();
  const isStamp = row.type === 'stamp';
  const Icon = isStamp ? StampIcon : Award;
  const tint = isStamp ? '#eb592e' : '#D97706';
  const tintBg = isStamp ? '#FEF0EB' : '#FEF3C7';

  // We branch on `count` manually instead of relying on i18next's
  // built-in pluralization because Arabic has six plural rules
  // (`zero`, `one`, `two`, `few`, `many`, `other`) and i18next
  // falls back to English when it can't find the matching form —
  // leaving a mixed-language activity log on Arabic phones.
  // A simple single/multi branch avoids the whole plural engine.
  const stampCount = isStamp ? (row.count ?? 1) : 0;
  const label = isStamp
    ? stampCount === 1
      ? t('card_detail.activity_stamp_single')
      : t('card_detail.activity_stamp_multi', { count: stampCount })
    : t('card_detail.activity_redemption', {
        reward: row.reward_name ?? t('card_detail.rewards'),
      });

  return (
    <View
      className={
        'flex-row items-center py-2 ' +
        (showDivider ? 'border-t border-gray-100' : '')
      }
    >
      <View
        style={{ backgroundColor: tintBg }}
        className="h-7 w-7 items-center justify-center rounded-full"
      >
        <Icon color={tint} size={13} strokeWidth={1.8} />
      </View>
      <View className="ms-3 flex-1">
        {/* Both lines are 11px to match the ready-to-redeem banner
            copy density — the activity log reads as a dense log of
            small events, not a list of headlines. Regular weight
            (not bold) so individual rows don't each look like a
            heading competing for the customer's attention. */}
        <Text className="text-2xs font-normal text-gray-900">{label}</Text>
        <Text
          className="mt-0.5 text-2xs text-gray-500"
          // Dates are Latin-digit Gregorian so force LTR reading
          // order — otherwise the Arabic BiDi engine flips day/month
          // and the time reads as "PM 11:01" instead of "11:01 PM".
          style={{ writingDirection: 'ltr' }}
        >
          {formatDate(row.created_at)}
        </Text>
      </View>
    </View>
  );
}
