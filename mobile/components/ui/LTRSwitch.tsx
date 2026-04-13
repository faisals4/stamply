import { View, Switch, type SwitchProps } from 'react-native';
import { colors } from '../../lib/colors';

/**
 * Wrapper around RN Switch that forces LTR direction regardless of
 * the app locale. Without this, the Switch knob renders on the wrong
 * side in RTL layouts — the "off" position appears on the right and
 * "on" on the left, which is visually confusing since toggle switches
 * are universally understood as LTR (off=left, on=right).
 */
export function LTRSwitch(props: SwitchProps) {
  return (
    <View style={{ direction: 'ltr' }}>
      <Switch
        trackColor={{ false: '#D1D5DB', true: colors.brand.DEFAULT }}
        {...props}
      />
    </View>
  );
}
