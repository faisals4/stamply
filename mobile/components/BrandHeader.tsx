import { View, Text, Image } from 'react-native';
import { Tenant } from '../lib/api';

type Props = {
  tenant: Tenant | null;
};

/**
 * Section header for a tenant's group of cards in the list,
 * and full-width header on the card detail screen.
 */
export function BrandHeader({ tenant }: Props) {
  if (!tenant) return null;

  return (
    <View className="flex-row items-center bg-gray-50 px-4 py-3">
      {tenant.logo_url ? (
        <Image
          source={{ uri: tenant.logo_url }}
          style={{ width: 40, height: 40, borderRadius: 8 }}
          className="bg-white"
        />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-gray-200">
          <Text className="text-base font-bold text-gray-600">
            {tenant.name?.[0] ?? '?'}
          </Text>
        </View>
      )}
      <Text className="ms-3 text-lg font-bold text-gray-900">{tenant.name}</Text>
    </View>
  );
}
