import { Component, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors } from '../lib/colors';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

/**
 * Global error boundary — catches any uncaught render error in its
 * subtree and shows a friendly fallback UI instead of a white screen.
 *
 * Placed inside the root layout so every screen and modal is covered.
 * Tapping "أعد المحاولة" resets the error state so the tree re-mounts
 * cleanly — usually enough for transient render bugs.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            paddingHorizontal: 32,
            gap: 16,
          }}
        >
          <Text style={{ fontSize: 48 }}>⚠️</Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#1f2937',
              textAlign: 'center',
            }}
          >
            حدث خطأ غير متوقع
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: '#6b7280',
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            {this.state.error?.message ?? 'Unknown error'}
          </Text>
          <Pressable
            onPress={this.handleRetry}
            style={{
              marginTop: 8,
              backgroundColor: colors.brand.DEFAULT,
              paddingHorizontal: 28,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
              أعد المحاولة
            </Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
