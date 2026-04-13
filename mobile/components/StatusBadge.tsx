import { View, Text } from 'react-native';

type Variant = 'success' | 'warning' | 'danger' | 'neutral';

type Props = {
  label: string;
  variant?: Variant;
};

const VARIANT_STYLES: Record<Variant, { bg: string; text: string }> = {
  success: { bg: '#e9f9ee', text: '#047857' },
  warning: { bg: '#f9f1e6', text: '#f87a2d' },
  danger:  { bg: '#fef2f2', text: '#ef4444' },
  neutral: { bg: '#F3F4F6', text: '#6B7280' },
};

/**
 * Compact colored pill badge for status indicators. Replaces 10+
 * inline `<View className="rounded-full ..."><Text>...</Text></View>`
 * patterns across checkout, orders, and merchant screens.
 *
 * Usage:
 *   <StatusBadge label="مفتوح" variant="success" />
 *   <StatusBadge label="مشغول" variant="warning" />
 *   <StatusBadge label="مغلق" variant="danger" />
 *   <StatusBadge label="مسودة" variant="neutral" />
 */
export function StatusBadge({ label, variant = 'neutral' }: Props) {
  const { bg, text } = VARIANT_STYLES[variant];

  return (
    <View
      className="self-start rounded-full px-2 py-0.5"
      style={{ backgroundColor: bg }}
    >
      <Text className="text-xs" style={{ color: text }}>
        {label}
      </Text>
    </View>
  );
}
