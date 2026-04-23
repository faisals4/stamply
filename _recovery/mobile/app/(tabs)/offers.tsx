import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { OfferCard } from '../../components/offers/OfferCard';
import { OFFERS } from '../../components/offers/data';

export default function OffersScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScreenContainer>
        <PageHeader title={t('offers.title')} />

        {OFFERS.length === 0 ? (
          <EmptyState
            title={t('offers.empty_title')}
            subtitle={t('offers.empty_subtitle')}
          />
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 32,
              gap: 16,
            }}
            showsVerticalScrollIndicator={false}
          >
            {OFFERS.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onPress={() => router.push(`/shop/${offer.storeId}`)}
              />
            ))}
          </ScrollView>
        )}
      </ScreenContainer>
    </SafeAreaView>
  );
}
