import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { X, Search } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { countries, countryName, type Country } from '../../lib/countries';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
};

export function CountryPickerModal({ visible, onClose, onSelect }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || 'ar';
  const isRTL = lang.startsWith('ar');
  const [search, setSearch] = useState('');

  const filtered = search
    ? countries.filter(
        (c) =>
          c.nameAr.includes(search) ||
          c.nameEn.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase()),
      )
    : countries;

  const handleSelect = (country: Country) => {
    onSelect(country);
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6',
            direction: 'ltr',
          }}
        >
          <Pressable
            onPress={() => { setSearch(''); onClose(); }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X color="#6B7280" size={18} />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>
            {isRTL ? 'اختر الدولة' : 'Select Country'}
          </Text>
        </View>

        {/* Search */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              paddingHorizontal: 12,
              height: 44,
              direction: 'ltr',
            }}
          >
            <Search color="#9CA3AF" size={18} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={isRTL ? 'بحث بالاسم أو رمز الدولة...' : 'Search by name or code...'}
              placeholderTextColor="#9CA3AF"
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 15,
                color: '#111827',
                textAlign: isRTL ? 'right' : 'left',
              }}
              autoFocus
            />
          </View>
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelect(item)}
              style={({ pressed }) => ({
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: pressed ? '#F9FAFB' : '#fff',
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
              })}
            >
              {/* Force a true horizontal row with web-safe styles */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  direction: 'ltr',
                  ...(Platform.OS === 'web' ? { display: 'flex' as any, flexWrap: 'nowrap' as any } : {}),
                }}
              >
                <Text style={{ fontSize: 24, width: 36, textAlign: 'center', marginLeft: 4 }}>{item.flag}</Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: '#6B7280',
                    width: 52,
                    textAlign: 'left',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {item.dialCode}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: '#374151',
                    textAlign: 'left',
                  }}
                >
                  {countryName(item, lang)}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
                {isRTL ? 'لا توجد نتائج' : 'No results'}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}
