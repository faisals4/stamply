import { View, Text } from 'react-native';

type Props = {
  title: string;
  /** Optional element rendered at the inline-end of the header row
   *  (left in RTL, right in LTR). Used by the Cards screen for the
   *  "المتاجر" shortcut. When omitted the title takes full width. */
  endAction?: React.ReactNode;
};

/**
 * Single source of truth for the title row at the top of every
 * customer-app tab screen (Cards, Order now, Settings, Offers).
 *
 * Keeps the px/pt/pb spacing and typography in lockstep across
 * every tab so a future restyle only needs to touch this file.
 * The text follows the document writing direction so it naturally
 * aligns to the inline-start in both RTL and LTR.
 */
export function PageHeader({ title, endAction }: Props) {
  return (
    <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
      <Text className="text-2xl font-bold text-gray-900">{title}</Text>
      {endAction ?? null}
    </View>
  );
}
