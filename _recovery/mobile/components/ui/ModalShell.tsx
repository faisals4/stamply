import { Modal, Pressable } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Maximum width of the centered card. Default 340. */
  maxWidth?: number;
  /** Maximum height constraint. Use `'80%'` for scrollable
   *  modals like the address picker. Default undefined = auto. */
  maxHeight?: string | number;
};

/**
 * Shared modal shell — a dimmed backdrop + a centered rounded
 * card. Every popup in the customer app (InfoPopup, ConfirmModal,
 * AddressPickerModal, TimePickerModal, OrderSuccessModal) used to
 * define its own copy of this pattern. Now they all compose
 * `ModalShell` and only supply their inner card content.
 *
 * The backdrop is tappable to close the modal. The inner card
 * swallows taps so clicking inside doesn't dismiss.
 *
 * Consumers are responsible for their own header row (title +
 * close chip) and their own action buttons — `ModalShell` is
 * intentionally a structural primitive with zero opinion about
 * content layout.
 */
export function ModalShell({
  visible,
  onClose,
  children,
  maxWidth = 340,
  maxHeight,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 16 }}
      >
        {/* Inner Pressable swallows taps so clicking inside the
            card doesn't close it. */}
        <Pressable
          onPress={() => {}}
          className="rounded-3xl bg-white p-5"
          style={[
            {
              width: '100%',
              maxWidth,
            },
            maxHeight !== undefined ? { maxHeight } : undefined,
          ] as any}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
