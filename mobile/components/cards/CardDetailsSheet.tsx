import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { api, ApiError, API_URL, CardFull, Tenant } from '../../lib/api';
import { detectWalletTarget } from '../../lib/detectWallet';
import { CardVisual } from './CardVisual';
import { BottomSheet } from '../BottomSheet';
import { ActivityTimeline } from './ActivityTimeline';
import { RewardReadyBanner } from './RewardReadyBanner';
import { RewardLadder } from './RewardLadder';
import { colors } from '../../lib/colors';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';

type Props = {
  card: CardFull | null;
  tenant: Tenant | null;
  visible: boolean;
  onClose: () => void;
  /** Whether this card is currently archived. Drives the button label. */
  isArchived?: boolean;
  /** Called when the user taps "Hide Card" or "Restore Card". */
  onArchiveToggle?: () => void;
  /** Show a spinner on the archive button while the mutation is in flight. */
  archiveLoading?: boolean;
};

/**
 * Card details modal — opens when the customer taps a card on the
 * home screen. Composes the shared `<BottomSheet>` primitive so the
 * dim/slide animation, max-width clamp, and backdrop tap-to-close
 * behaviour all live in one place.
 *
 * Body content (top to bottom):
 *   1. Full `<CardVisual>` (with QR + secondary row)
 *   2. Optional ready-to-redeem green banner
 *   3. Official Apple/Google wallet badges (device-aware)
 *   4. Multi-reward ladder when the card has more than one reward
 *   5. Recent stamps history
 */

/**
 * Build an absolute URL to one of the official wallet badge SVGs
 * that ship in `api/public/wallet-badges/`. The variant depends on
 * the app's current locale: Arabic or English artwork. Uses the
 * API base URL as the host on native and same-origin on web.
 */
function walletBadgeUrl(provider: 'apple' | 'google', locale: string): string {
  const lang = locale?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  const file = `add-to-${provider}-wallet-${lang}.svg`;
  // API_URL ends in `/api`; strip it to get the host origin.
  const host = API_URL.replace(/\/api\/?$/, '');
  return `${host}/wallet-badges/${file}`;
}

export function CardDetailsSheet({ card, tenant, visible, onClose, isArchived = false, onArchiveToggle, archiveLoading = false }: Props) {
  const { t, i18n } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  if (!card) {
    return (
      <BottomSheet visible={visible} onClose={onClose} align="top">
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#FFFFFF' }}>
          <ActivityIndicator color={colors.brand.DEFAULT} />
        </View>
      </BottomSheet>
    );
  }

  const firstReward = card.all_rewards?.[0];
  const requiredForNext = firstReward?.stamps_required ?? 0;
  const readyToRedeem =
    requiredForNext > 0 ? Math.floor(card.stamps_count / requiredForNext) : 0;
  // Title fallback chain — mirrors web `CardVisual.tsx`:
  //   1. design.labels.title  (per-card title override set in the editor)
  //   2. card.name             (canonical card template name)
  //   3. tenant.name            (brand name — last-resort fallback)
  const designLabelTitle = (card.design as any)?.labels?.title;
  const title = designLabelTitle || card.name || tenant?.name || '';
  const customerName = card.customer_name ?? '';

  /**
   * Open the pkpass / Google Save URL in a way that actually
   * triggers the native wallet handoff on every platform:
   *
   *   - Safari on iPhone/iPad: Wallet intercepts ANY navigation to
   *     a URL whose response Content-Type is
   *     `application/vnd.apple.pkpass`, but ONLY if the navigation
   *     happens in the current tab. `window.open()` (which is what
   *     react-native-web's `Linking.openURL` does by default) opens
   *     a new tab and Safari just downloads the file instead.
   *     Solution: assign `window.location.href` so the browser
   *     navigates in-place.
   *   - Chrome on Android: the Google Wallet save URL is a regular
   *     HTTPS link — same-tab navigation opens Wallet via deep link.
   *   - macOS Safari 14+: `.pkpass` opens Wallet directly.
   *   - Desktop Chrome/Firefox: the .pkpass downloads as a file and
   *     the customer opens it on their phone. Expected behaviour.
   *   - Native iOS / Android: react-native `Linking.openURL` hands
   *     the URL to the OS and the wallet app opens.
   */
  const openWalletUrl = async (url: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
      return;
    }
    await Linking.openURL(url);
  };

  const target = detectWalletTarget();
  const showApple = target === 'apple' || target === 'both';
  const showGoogle = target === 'google' || target === 'both';

  const addToApple = async () => {
    if (walletLoading) return;
    setWalletError(null);
    setWalletLoading(true);
    try {
      const res = await api.walletApple(card.serial);
      await openWalletUrl(res.data.url);
    } catch (e) {
      const err = e as ApiError;
      setWalletError(err.message ?? t('errors.unknown'));
    } finally {
      setWalletLoading(false);
    }
  };

  const addToGoogle = async () => {
    if (walletLoading) return;
    setWalletError(null);
    setWalletLoading(true);
    try {
      const res = await api.walletGoogle(card.serial);
      await openWalletUrl(res.data.url);
    } catch (e) {
      const err = e as ApiError;
      setWalletError(err.message ?? t('errors.unknown'));
    } finally {
      setWalletLoading(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} align="top">
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: '#FFFFFF' }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
          gap: 14,
        }}
      >
        {/* Card visual — big, at the top of the sheet */}
        <CardVisual
          design={card.design}
          title={title}
          collectedStamps={card.stamps_count}
          customerName={customerName}
          serial={card.serial}
          stampsRequired={requiredForNext || undefined}
          brandLogoUrl={tenant?.logo_url ?? null}
        />

        <RewardReadyBanner count={readyToRedeem} rewardName={firstReward?.name} />

        {/* Official Apple/Google Wallet badges. Device-aware: iPhone
            shows Apple, Android shows Google, desktop shows both. */}
        <View className="items-center" style={{ gap: 12 }}>
          {walletLoading ? (
            <ActivityIndicator color={colors.brand.DEFAULT} />
          ) : (
            <>
              {showApple && (
                <Pressable
                  onPress={addToApple}
                  accessibilityLabel={t('card_detail.add_to_apple_wallet')}
                >
                  <Image
                    source={{ uri: walletBadgeUrl('apple', i18n.language) }}
                    style={{ width: 180, height: 56 }}
                    resizeMode="contain"
                  />
                </Pressable>
              )}
              {showGoogle && (
                <Pressable
                  onPress={addToGoogle}
                  accessibilityLabel={t('card_detail.add_to_google_wallet')}
                >
                  <Image
                    source={{ uri: walletBadgeUrl('google', i18n.language) }}
                    style={{ width: 200, height: 56 }}
                    resizeMode="contain"
                  />
                </Pressable>
              )}
            </>
          )}
        </View>
        {walletError ? (
          <Text className="text-center text-sm text-red-600">{walletError}</Text>
        ) : null}

        <RewardLadder rewards={card.all_rewards ?? []} />

        {/* Activity timeline — preview of the 3 most recent events
            inline, with a "show more" toggle that switches to the
            paginated /activity endpoint for the full history. */}
        <ActivityTimeline
          serial={card.serial}
          initialStamps={card.stamps_history}
          initialRedemptions={card.redemptions_history}
        />

        {/* Archive / Restore toggle — full-width white button with a
            gray border at the very bottom of the sheet. Doesn't affect
            the card's real status — purely a customer display preference. */}
        {onArchiveToggle && (
          <Pressable
            onPress={onArchiveToggle}
            disabled={archiveLoading}
            style={{
              marginTop: 8,
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
              opacity: archiveLoading ? 0.6 : 1,
            }}
          >
            {archiveLoading ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Text style={{ fontSize: 14, color: isArchived ? colors.brand.DEFAULT : '#6B7280' }}>
                {isArchived ? t('cards.unarchive_card') : t('cards.archive_card')}
              </Text>
            )}
          </Pressable>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
