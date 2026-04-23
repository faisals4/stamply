import { useState } from 'react';
import { Pressable } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../lib/colors';
import { ConfirmSheet } from './ConfirmSheet';

type Props = {
  /** Title shown in the confirmation sheet. */
  title: string;
  /** Message shown in the confirmation sheet. */
  message: string;
  /** Called when the user confirms deletion. */
  onConfirm: () => void;
  /** Icon size in px. Defaults to 18. */
  size?: number;
  disabled?: boolean;
  loading?: boolean;
};

/**
 * Shared delete button with ConfirmSheet confirmation modal —
 * same pattern as the logout flow in Settings.
 *
 * Renders a gray trash icon inside a light gray rounded square.
 * Tapping opens a bottom-sheet confirmation (ConfirmSheet) with
 * a destructive red confirm button. Reusable anywhere deletion
 * is needed (merchant cards, branches, staff, rewards, etc.).
 */
export function DeleteButton({
  title,
  message,
  onConfirm,
  size = 18,
  disabled = false,
  loading = false,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        hitSlop={8}
        className="items-center justify-center rounded-xl border border-gray-200 bg-white"
        style={{ width: 40, height: 40, opacity: disabled ? 0.4 : 1 }}
      >
        <Trash2 color={colors.ink.tertiary} size={size} strokeWidth={1.5} />
      </Pressable>

      <ConfirmSheet
        visible={open}
        onClose={() => (loading ? null : setOpen(false))}
        onConfirm={onConfirm}
        title={title}
        message={message}
        confirmLabel={t('merchant.delete_confirm')}
        cancelLabel={t('settings.cancel')}
        icon={Trash2}
        destructive
        loading={loading}
      />
    </>
  );
}
