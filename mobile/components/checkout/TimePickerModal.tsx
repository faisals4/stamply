import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useIsRTL } from '../../lib/rtl';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { ModalShell } from '../ui/ModalShell';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (day: string, slot: string) => void;
  initialDay?: string | null;
  initialSlot?: string | null;
};

// ─── Day helpers ─────────────────────────────────────────────

const AR_DAYS = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_COUNT = 7;

type DayOption = {
  key: string;
  label: string;
  dateLabel: string;
  isToday: boolean;
  /** Hour the merchant "opens" on this day — slots before this
   *  hour are filtered out. Today also filters past the current
   *  clock hour. */
  openHour: number;
  /** Hour the merchant "closes" — slots at or after this hour
   *  are excluded. */
  closeHour: number;
};

/** Mock open/close per weekday index (0=Sun..6=Sat). In the real
 *  backend this comes from the merchant's operating schedule. */
const MOCK_HOURS: Record<number, [number, number]> = {
  0: [8, 23],   // الأحد / Sun
  1: [6, 24],   // الاثنين / Mon
  2: [6, 24],   // الثلاثاء / Tue
  3: [7, 23],   // الأربعاء / Wed
  4: [7, 24],   // الخميس / Thu
  5: [9, 24],   // الجمعة / Fri  — opens late
  6: [8, 24],   // السبت / Sat
};

function generateDays(isRTL: boolean): DayOption[] {
  const now = new Date();
  const currentHour = now.getHours();
  const days: DayOption[] = [];

  for (let i = 0; i < DAY_COUNT; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);

    const isToday = i === 0;
    const isTomorrow = i === 1;

    const dayName = isToday
      ? isRTL
        ? 'اليوم'
        : 'Today'
      : isTomorrow
        ? isRTL
          ? 'غداً'
          : 'Tomorrow'
        : isRTL
          ? AR_DAYS[d.getDay()]
          : EN_DAYS[d.getDay()];

    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    const [merchantOpen, merchantClose] = MOCK_HOURS[d.getDay()] ?? [6, 24];
    // Today: the effective open hour is whichever is later —
    // the merchant's opening or the current clock hour + 1 (you
    // can't order a slot in the past).
    const effectiveOpen = isToday
      ? Math.max(merchantOpen, currentHour + 1)
      : merchantOpen;

    days.push({
      key: `${d.getFullYear()}-${mm}-${dd}`,
      label: dayName,
      dateLabel: `${d.getFullYear()}/${mm}/${dd}`,
      isToday,
      openHour: effectiveOpen,
      closeHour: merchantClose,
    });
  }
  return days;
}

// ─── Time slot helpers ───────────────────────────────────────

type TimeSlot = {
  key: string;
  label: string;
};

function fmt(h: number, m: number, isRTL: boolean): string {
  const period = h < 12 ? (isRTL ? 'ص' : 'AM') : (isRTL ? 'م' : 'PM');
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function generateSlots(
  openHour: number,
  closeHour: number,
  isRTL: boolean
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let h = openHour; h < closeHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      const eM = (m + 15) % 60;
      const eH = m + 15 >= 60 ? h + 1 : h;
      if (eH > closeHour || (eH === closeHour && eM > 0)) continue;
      slots.push({
        key: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        label: `${fmt(h, m, isRTL)} - ${fmt(eH, eM, isRTL)}`,
      });
    }
  }
  return slots;
}

// ─── Component ───────────────────────────────────────────────

/**
 * Full-featured time picker modal.
 *
 *   1. Title — "حدد الوقت"
 *   2. Horizontal day pills — اليوم / غداً / then real names,
 *      each pill has two lines (name + MM/DD)
 *   3. "الآن" button (today only)
 *   4. Vertical list of 15-min range slots specific to the
 *      selected day's open/close hours. Today filters out past
 *      hours automatically.
 *   5. "حفظ" button with loading spinner
 */
export function TimePickerModal({
  visible,
  onClose,
  onConfirm,
  initialDay,
  initialSlot,
}: Props) {
  const isRTL = useIsRTL();
  const localeDirStyle = useLocaleDirStyle();

  const days = useMemo(() => generateDays(isRTL), [isRTL]);

  // Resolve `initialDay` — it may be a label ("اليوم", "غداً")
  // or a key ("2026-04-10"). Try key first, then label match.
  const resolvedInitialDay = useMemo(() => {
    if (!initialDay) return days[0]?.key ?? '';
    const byKey = days.find((d) => d.key === initialDay);
    if (byKey) return byKey.key;
    const byLabel = days.find((d) => d.label === initialDay);
    if (byLabel) return byLabel.key;
    return days[0]?.key ?? '';
  }, [initialDay, days]);

  const [selectedDayKey, setSelectedDayKey] = useState<string>(resolvedInitialDay);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(
    initialSlot ?? null
  );
  const [isNow, setIsNow] = useState(false);
  const [saving, setSaving] = useState(false);

  // Re-sync state when modal reopens with different initial values.
  useEffect(() => {
    if (visible) {
      setSelectedDayKey(resolvedInitialDay);
      setSelectedSlot(initialSlot ?? null);
      setIsNow(false);
    }
  }, [visible, resolvedInitialDay, initialSlot]);

  const selectedDay = days.find((d) => d.key === selectedDayKey);

  // Generate slots specific to the selected day's hours.
  const timeSlots = useMemo(
    () =>
      selectedDay
        ? generateSlots(selectedDay.openHour, selectedDay.closeHour, isRTL)
        : [],
    [selectedDay, isRTL]
  );

  const canConfirm = selectedDayKey && (selectedSlot || isNow);

  // ─── Auto-scroll refs ─────────────────────────────────────
  // Instead of computing scroll offsets manually (which breaks in
  // RTL horizontal ScrollViews on react-native-web), we keep refs
  // to the actual DOM/View nodes and call the browser's native
  // `scrollIntoView({ inline: 'center' })`. This is guaranteed to
  // handle RTL correctly because the browser's scroll engine
  // already understands the logical inline direction.
  const dayPillRefs = useRef<Record<string, any>>({});
  const slotRowRefs = useRef<Record<string, any>>({});

  /** Center a day pill in the horizontal days scroll. Uses the
   *  browser-native `scrollIntoView` which is RTL-aware. */
  const scrollToDay = useCallback((dayKey: string) => {
    const node = dayPillRefs.current[dayKey];
    if (!node) return;
    if (typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, []);

  /** Center a time slot row in the vertical slots scroll. */
  const scrollToSlot = useCallback((slotKey: string) => {
    const node = slotRowRefs.current[slotKey];
    if (!node) return;
    if (typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // When the modal opens, auto-scroll to the previously-saved
  // day and slot so the user sees their last choice immediately.
  useEffect(() => {
    if (!visible) return;
    // Two-phase scroll: day pill first (fast — pills are already
    // laid out), then the time slot (slightly later because the
    // slot list re-renders when the day changes and onLayout needs
    // a paint cycle to fire for the new children).
    const dayTimer = setTimeout(() => scrollToDay(selectedDayKey), 200);
    const slotTimer = selectedSlot
      ? setTimeout(() => scrollToSlot(selectedSlot), 400)
      : null;
    return () => {
      clearTimeout(dayTimer);
      if (slotTimer) clearTimeout(slotTimer);
    };
  }, [visible, selectedDayKey, selectedSlot, scrollToDay, scrollToSlot]);

  const handleDayPress = (key: string) => {
    setSelectedDayKey(key);
    setSelectedSlot(null);
    setIsNow(false);
    // Center the newly-selected pill after React commits the
    // re-render + onLayout fires on the now-branded pill. 150 ms
    // is enough for a single state + paint cycle on web.
    setTimeout(() => scrollToDay(key), 150);
  };

  const handleSlotPress = (key: string) => {
    setSelectedSlot(key);
    setIsNow(false);
  };

  const handleNow = () => {
    setIsNow(true);
    setSelectedSlot(null);
  };

  const handleSave = () => {
    if (!canConfirm) return;
    setSaving(true);
    setTimeout(() => {
      // Resolve the slot's display label (with AM/PM range) rather
      // than the raw key ("14:00"). Falls back to the key if the
      // slot isn't found in the current list.
      const slotDisplay = isNow
        ? isRTL
          ? 'الآن'
          : 'Now'
        : timeSlots.find((s) => s.key === selectedSlot)?.label ?? selectedSlot!;
      // Build a day string that includes the name + full date
      // (with year) so the TimeSelectionBlock subtitle reads:
      //   "الاثنين — 2026/04/13 — 02:00 م - 02:15 م"
      const dayWithDate = selectedDay
        ? `${selectedDay.label} — ${selectedDay.dateLabel}`
        : selectedDayKey;
      onConfirm(dayWithDate, slotDisplay);
      setSaving(false);
      onClose();
    }, 600);
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      maxWidth={420}
      maxHeight="85%"
    >
      {/* Title */}
      <Text
        style={localeDirStyle}
        className="mb-4 text-center text-base font-bold text-gray-900"
      >
        {isRTL ? 'حدد الوقت' : 'Select Time'}
      </Text>

      {/* ── Days horizontal scroll ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        className="mb-4"
      >
        {days.map((day) => {
          const isActive = day.key === selectedDayKey;
          return (
            <Pressable
              key={day.key}
              ref={(node: any) => { dayPillRefs.current[day.key] = node; }}
              onPress={() => handleDayPress(day.key)}
              className="items-center justify-center rounded-2xl border px-4"
              style={{
                height: 52,
                minWidth: 80,
                borderColor: isActive
                  ? colors.brand.DEFAULT
                  : colors.ink.border,
                backgroundColor: isActive
                  ? colors.brand.DEFAULT
                  : 'transparent',
              }}
            >
              <Text
                className="text-xs"
                style={{
                  color: isActive ? colors.white : colors.ink.primary,
                }}
              >
                {day.label}
              </Text>
              <Text
                className="mt-0.5 text-3xs"
                style={{
                  color: isActive
                    ? 'rgba(255,255,255,0.8)'
                    : colors.ink.tertiary,
                }}
              >
                {day.dateLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Time slots vertical list ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 320 }}
      >
        {/* "Now" — only for today. */}
        {selectedDay?.isToday ? (
          <Pressable
            onPress={handleNow}
            className="border-b border-gray-100 py-3"
          >
            <Text
              className={`text-center text-sm ${
                isNow ? 'font-bold text-gray-900' : 'text-gray-500'
              }`}
            >
              {isRTL ? 'الآن' : 'Now'}
            </Text>
          </Pressable>
        ) : null}

        {timeSlots.length === 0 ? (
          <Text className="py-6 text-center text-sm text-gray-400">
            {isRTL
              ? 'لا توجد أوقات متاحة لهذا اليوم'
              : 'No available slots for this day'}
          </Text>
        ) : null}

        {timeSlots.map((slot) => {
          const isActive = slot.key === selectedSlot && !isNow;
          return (
            <Pressable
              key={slot.key}
              ref={(node: any) => { slotRowRefs.current[slot.key] = node; }}
              onPress={() => handleSlotPress(slot.key)}
              className="border-b border-gray-100 py-3"
            >
              <Text
                className={`text-center text-sm ${
                  isActive
                    ? 'font-bold text-gray-900'
                    : 'text-gray-500'
                }`}
              >
                {slot.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Save button ── */}
      <Pressable
        onPress={handleSave}
        disabled={!canConfirm || saving}
        className="mt-4 items-center justify-center rounded-2xl"
        style={{
          height: 48,
          backgroundColor: colors.brand.DEFAULT,
          opacity: canConfirm && !saving ? 1 : 0.4,
        }}
      >
        {saving ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text className="text-sm text-white">
            {isRTL ? 'حفظ' : 'Save'}
          </Text>
        )}
      </Pressable>
    </ModalShell>
  );
}
