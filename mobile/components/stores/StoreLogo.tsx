import { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { colors } from '../../lib/colors';

type Props = {
  name: string;
  logoUrl: string | null;
  size?: number;
  borderRadius?: number;
};

/**
 * Store logo with automatic fallback.
 *
 * Handles three cases:
 *   1. Valid image URL or data URI → shows the image
 *   2. Image fails to load → falls back to initial letter
 *   3. No logo → shows initial letter immediately
 *
 * The fallback is a colored circle with the store's first letter,
 * matching the Leaflet web markers' visual style.
 */
export function StoreLogo({ name, logoUrl, size = 70, borderRadius = 16 }: Props) {
  const [errored, setErrored] = useState(false);
  const initial = (name ?? '?').charAt(0);
  const showImage = !!logoUrl && !errored;

  if (showImage) {
    return (
      <View style={{ width: size, height: size, borderRadius, overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
        <Image
          source={{ uri: logoUrl }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setErrored(true)}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#6B7280', fontWeight: '700', fontSize: size * 0.35 }}>
        {initial}
      </Text>
    </View>
  );
}
