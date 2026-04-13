import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  type LayoutChangeEvent,
} from 'react-native';
import { MapPin, Plus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { ModalShell } from '../ui/ModalShell';
import { PillTabs } from '../ui/PillTabs';
import { CarInfoBlock } from './CarInfoBlock';
import { CarSelectionModal } from './CarSelectionModal';
import { AddAddressModal } from './AddAddressModal';
import { RadioPin } from '../ui/RadioPin';
import { BranchCard } from './BranchCard';
import {
  pickupBranches,
  curbsideBranches,
  savedAddresses,
  savedCars,
  type Branch,
  type SavedAddress,
  type CarInfo,
} from './branch-data';

export type OrderType = 'delivery' | 'pickup' | 'curbside';

type Props = {
  visible: boolean;
  onClose: () => void;
  initialTab?: OrderType;
  /** Called when the user confirms their selection. */
  onConfirm?: (selection: BranchSelection) => void;
};

export type BranchSelection =
  | { type: 'delivery'; address: SavedAddress }
  | { type: 'pickup'; branch: Branch }
  | { type: 'curbside'; branch: Branch };

/**
 * Full branch / address selection modal with 3 tabs:
 *
 *   [ توصيل ]   [ استلام ]   [ من السيارة ]
 *
 * - **توصيل (delivery)**: scrollable list of saved addresses with
 *   radio pins. Each row shows the address label + details.
 *
 * - **استلام (pickup)**: scrollable list of pickup branches using
 *   `BranchCard` with status badges, distance, pre-order flag,
 *   and 3 action icons.
 *
 * - **من السيارة (curbside)**: same layout as pickup, with the
 *   curbside branch pool.
 *
 * State:
 *   - `activeTab` drives which list is visible.
 *   - `selectedId` is PER-TAB — switching tabs doesn't clear the
 *     selection on the other two.
 *   - On confirm, the modal bundles the active tab + selected
 *     item into a `BranchSelection` discriminated union and
 *     closes.
 *
 * Auto-scroll: the selected item scrolls into view when the
 * modal opens (same onLayout + scrollTo pattern used in
 * `TimePickerModal`).
 */
export function BranchSelectionModal({
  visible,
  onClose,
  initialTab = 'pickup',
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = useLocaleDirStyle();
  const EndArrow = isRTL ? ChevronLeft : ChevronRight;

  const TABS = [
    { key: 'delivery' as OrderType, label: t('branch.tab_delivery') },
    { key: 'pickup' as OrderType, label: t('branch.tab_pickup') },
    { key: 'curbside' as OrderType, label: t('branch.tab_curbside') },
  ];

  const [activeTab, setActiveTab] = useState<OrderType>(initialTab);

  // Per-tab selections — persisted across tab switches.
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const [pickupId, setPickupId] = useState<string | null>(null);
  const [curbsideId, setCurbsideId] = useState<string | null>(null);

  // Car selection for curbside — shown inside the modal above
  // the branch list, matching orders4 where CarInfoCard sits
  // between the tabs and the branches in the curbside tab.
  const [selectedCar, setSelectedCar] = useState<CarInfo>(savedCars[0]);
  const [showCarModal, setShowCarModal] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);

  // Mutable copy of addresses so new ones appear instantly in
  // the list without a backend round-trip.
  const [addresses, setAddresses] = useState<SavedAddress[]>(savedAddresses);

  const scrollRef = useRef<ScrollView>(null);
  const itemOffsets = useRef<Record<string, number>>({});

  // Reset offsets when tab changes (different list of items).
  useEffect(() => {
    itemOffsets.current = {};
  }, [activeTab]);

  // Auto-scroll to the selected item when modal opens.
  useEffect(() => {
    if (!visible) return;
    const selectedId =
      activeTab === 'delivery'
        ? deliveryId
        : activeTab === 'pickup'
          ? pickupId
          : curbsideId;
    if (!selectedId) return;
    const timer = setTimeout(() => {
      const y = itemOffsets.current[selectedId];
      if (y !== undefined && scrollRef.current) {
        scrollRef.current.scrollTo({ y: Math.max(0, y - 16), animated: true });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [visible, activeTab, deliveryId, pickupId, curbsideId]);

  const handleItemLayout = useCallback(
    (id: string, e: LayoutChangeEvent) => {
      itemOffsets.current[id] = e.nativeEvent.layout.y;
    },
    []
  );

  // Title changes per tab.
  const title =
    activeTab === 'delivery'
      ? t('branch.title_delivery')
      : activeTab === 'pickup'
        ? t('branch.title_pickup')
        : t('branch.title_curbside');

  // Currently-selected id for the active tab.
  const selectedId =
    activeTab === 'delivery'
      ? deliveryId
      : activeTab === 'pickup'
        ? pickupId
        : curbsideId;

  const canConfirm = selectedId !== null;

  const handleConfirm = () => {
    if (!canConfirm) return;
    if (activeTab === 'delivery') {
      const addr = addresses.find((a) => a.id === selectedId);
      if (addr) onConfirm?.({ type: 'delivery', address: addr });
    } else if (activeTab === 'pickup') {
      const branch = pickupBranches.find((b) => b.id === selectedId);
      if (branch) onConfirm?.({ type: 'pickup', branch });
    } else {
      const branch = curbsideBranches.find((b) => b.id === selectedId);
      if (branch) onConfirm?.({ type: 'curbside', branch });
    }
    onClose();
  };

  // CTA label per tab.
  const ctaLabel =
    activeTab === 'delivery'
      ? t('branch.cta_delivery')
      : activeTab === 'pickup'
        ? t('branch.cta_pickup')
        : t('branch.cta_curbside');

  return (
    <>
    <ModalShell
      visible={visible}
      onClose={onClose}
      maxWidth={440}
      maxHeight="90%"
    >
      {/* Pill tabs */}
      <PillTabs
        tabs={TABS}
        active={activeTab}
        onChange={(key) => setActiveTab(key as OrderType)}
      />

      {/* Section title */}
      <Text
        style={localeDirStyle}
        className="mt-4 text-center text-sm font-bold text-gray-900"
      >
        {title}
      </Text>

      {/* Scrollable list */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        className="mt-3"
        style={{ maxHeight: 420 }}
        contentContainerStyle={{ gap: 10 }}
      >
        {activeTab === 'delivery' ? (
          // ── Address cards ──
          <>
            {addresses.map((addr) => {
              const isActive = deliveryId === addr.id;
              return (
                <Pressable
                  key={addr.id}
                  onPress={() => setDeliveryId(addr.id)}
                  onLayout={(e) => handleItemLayout(addr.id, e)}
                  className="flex-row items-center rounded-2xl border bg-white p-3"
                  style={{
                    gap: 10,
                    borderColor: isActive
                      ? colors.brand.DEFAULT
                      : colors.ink.border,
                    backgroundColor: isActive
                      ? 'rgba(235, 89, 46, 0.04)'
                      : colors.white,
                  }}
                >
                  <RadioPin selected={isActive} />
                  <MapPin
                    color={colors.ink.tertiary}
                    size={18}
                    strokeWidth={2}
                  />
                  <View className="flex-1">
                    <Text
                      style={localeDirStyle}
                      className="text-start text-sm font-medium text-gray-900"
                      numberOfLines={1}
                    >
                      {addr.label}
                    </Text>
                    <Text
                      style={localeDirStyle}
                      className="mt-0.5 text-start text-xs text-gray-500"
                      numberOfLines={1}
                    >
                      {addr.details}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {/* Add new address */}
            <Pressable
              onPress={() => setShowAddAddress(true)}
              className="flex-row items-center justify-center rounded-2xl border border-dashed border-gray-300 py-3"
              style={{ gap: 6 }}
            >
              <Plus color={colors.ink.secondary} size={16} strokeWidth={2} />
              <Text className="text-sm text-gray-500">{t('checkout.add_address_btn')}</Text>
            </Pressable>
          </>
        ) : (
          // ── Branch cards (pickup or curbside) ──
          <>
            {/* Car info card — curbside only, above the branches */}
            {activeTab === 'curbside' ? (
              <CarInfoBlock
                car={selectedCar}
                onChange={() => setShowCarModal(true)}
              />
            ) : null}
            {(activeTab === 'pickup' ? pickupBranches : curbsideBranches).map(
            (branch) => (
              <View
                key={branch.id}
                onLayout={(e) => handleItemLayout(branch.id, e)}
              >
                <BranchCard
                  branch={branch}
                  isSelected={
                    activeTab === 'pickup'
                      ? pickupId === branch.id
                      : curbsideId === branch.id
                  }
                  onSelect={() =>
                    activeTab === 'pickup'
                      ? setPickupId(branch.id)
                      : setCurbsideId(branch.id)
                  }
                />
              </View>
            )
          )}
          </>
        )}
      </ScrollView>

      {/* Confirm CTA */}
      <Pressable
        onPress={handleConfirm}
        disabled={!canConfirm}
        className="mt-4 flex-row items-center justify-center rounded-2xl"
        style={{
          height: 48,
          backgroundColor: colors.brand.DEFAULT,
          opacity: canConfirm ? 1 : 0.4,
          gap: 8,
        }}
      >
        <Text className="text-sm text-white">{ctaLabel}</Text>
        <EndArrow color={colors.white} size={16} strokeWidth={2} />
      </Pressable>

    </ModalShell>

      {/* These modals must be SIBLINGS of ModalShell (not children)
          so they render as independent RN <Modal> layers. Nesting
          a <Modal> inside another <Modal> on react-native-web
          causes the inner one to be trapped behind the outer's
          backdrop and never become interactive. */}
      <CarSelectionModal
        visible={showCarModal}
        onClose={() => setShowCarModal(false)}
        selectedCarId={selectedCar.id}
        onSelect={(car) => setSelectedCar(car)}
      />

      <AddAddressModal
        visible={showAddAddress}
        onClose={() => setShowAddAddress(false)}
        onSave={(newAddr) => {
          setAddresses((prev) => [...prev, newAddr]);
          setDeliveryId(newAddr.id);
        }}
      />
    </>
  );
}
