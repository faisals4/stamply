import { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { type Country, sanitizePhone } from '../../lib/countries';
import { CountryPickerModal } from './CountryPickerModal';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  country: Country;
  onCountryChange: (c: Country) => void;
};

export function PhoneInput({ value, onChange, placeholder, country, onCountryChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleChange = (raw: string) => {
    onChange(sanitizePhone(raw, country));
  };

  return (
    <>
      <View
        style={{
          height: 56,
          flexDirection: 'row',
          alignItems: 'center',
          overflow: 'hidden',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#D1D5DB',
          backgroundColor: '#ffffff',
          direction: 'ltr',
        }}
      >
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => ({
            height: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderRightWidth: 1,
            borderRightColor: '#E5E7EB',
            paddingHorizontal: 14,
            backgroundColor: pressed ? '#F9FAFB' : 'transparent',
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', lineHeight: 22 }}>
             ▾  {country.flag}  {country.dialCode}
          </Text>
        </Pressable>

        <TextInput
          style={{
            flex: 1,
            paddingHorizontal: 16,
            fontSize: 16,
            color: '#111827',
            textAlign: 'left',
            writingDirection: 'ltr',
          }}
          keyboardType="number-pad"
          maxLength={country.maxLength}
          placeholder={country.example}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={handleChange}
        />
      </View>

      <CountryPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(c) => {
          onCountryChange(c);
          onChange('');
        }}
      />
    </>
  );
}
