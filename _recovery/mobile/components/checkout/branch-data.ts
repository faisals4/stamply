/**
 * Mock branch + address data for the `BranchSelectionModal`.
 * Copied verbatim from orders4 (`data/branches.ts`) so the demo
 * feels populated with real-looking Riyadh neighborhoods.
 *
 * Replace with a real `/api/app/branches` fetch once the backend
 * location service ships — no UI code needs to change, only the
 * data source in the modal's props.
 */

export type BranchStatus = 'open' | 'busy' | 'closed';

export type Branch = {
  id: string;
  name: string;
  address: string;
  distance: string;
  lat: number;
  lng: number;
  status: BranchStatus;
  busyUntil?: string;
  nextOpenTime?: string;
  preOrderAvailable?: boolean;
};

export type SavedAddress = {
  id: string;
  label: string;
  details: string;
};

export const pickupBranches: Branch[] = [
  { id: 'p1', name: 'فرع الملقا', address: 'حي الملقا - شارع الأمير محمد', distance: '3.28', lat: 24.8116, lng: 46.6234, status: 'open', preOrderAvailable: true },
  { id: 'p2', name: 'فرع الياسمين', address: 'حي الياسمين - شارع ٢٣', distance: '4.52', lat: 24.8216, lng: 46.6334, status: 'open', preOrderAvailable: true },
  { id: 'p-cafe', name: 'فرع الواحة', address: 'حي الواحة - طريق أنس بن مالك', distance: '2.15', lat: 24.798, lng: 46.615, status: 'open', preOrderAvailable: true },
  { id: 'p3', name: 'فرع النرجس', address: 'حي النرجس - طريق الملك سلمان', distance: '5.10', lat: 24.8316, lng: 46.6434, status: 'busy', busyUntil: '12 مارس 02:23' },
  { id: 'p4', name: 'فرع الرحاب', address: 'حي الرحاب - شارع الإمام سعود', distance: '6.25', lat: 24.7916, lng: 46.7034, status: 'closed', nextOpenTime: '04:00 م' },
  { id: 'p5', name: 'فرع العليا', address: 'حي العليا - شارع التحلية', distance: '7.80', lat: 24.6916, lng: 46.6834, status: 'open', preOrderAvailable: true },
  { id: 'p6', name: 'فرع السليمانية', address: 'حي السليمانية - طريق الملك عبدالعزيز', distance: '8.15', lat: 24.7116, lng: 46.7134, status: 'open', preOrderAvailable: true },
  { id: 'p7', name: 'فرع الورود', address: 'حي الورود - شارع العروبة', distance: '9.20', lat: 24.7216, lng: 46.6934, status: 'busy', busyUntil: '12 مارس 03:00' },
  { id: 'p8', name: 'فرع الربوة', address: 'حي الربوة - طريق خريص', distance: '10.50', lat: 24.7516, lng: 46.7534, status: 'open', preOrderAvailable: true },
  { id: 'p9', name: 'فرع حطين', address: 'حي حطين - شارع التخصصي', distance: '2.15', lat: 24.768, lng: 46.635, status: 'open', preOrderAvailable: true },
  { id: 'p10', name: 'فرع الغدير', address: 'حي الغدير - طريق الإمام سعود', distance: '5.75', lat: 24.852, lng: 46.613, status: 'open', preOrderAvailable: true },
  { id: 'p11', name: 'فرع الصحافة', address: 'حي الصحافة - شارع أنس بن مالك', distance: '6.40', lat: 24.841, lng: 46.653, status: 'open', preOrderAvailable: true },
  { id: 'p12', name: 'فرع العقيق', address: 'حي العقيق - طريق الملك فهد', distance: '4.10', lat: 24.778, lng: 46.628, status: 'open', preOrderAvailable: true },
  { id: 'p13', name: 'فرع الازدهار', address: 'حي الازدهار - شارع المعذر', distance: '7.30', lat: 24.735, lng: 46.665, status: 'busy', busyUntil: '12 مارس 01:45' },
  { id: 'p14', name: 'فرع المونسية', address: 'حي المونسية - طريق الدمام', distance: '11.20', lat: 24.763, lng: 46.812, status: 'open', preOrderAvailable: true },
  { id: 'p15', name: 'فرع الروابي', address: 'حي الروابي - شارع الحسن بن الحسين', distance: '8.90', lat: 24.678, lng: 46.735, status: 'open', preOrderAvailable: true },
  { id: 'p16', name: 'فرع الشفا', address: 'حي الشفا - طريق ديراب', distance: '13.50', lat: 24.581, lng: 46.672, status: 'closed', nextOpenTime: '08:00 ص' },
  { id: 'p17', name: 'فرع الخليج', address: 'حي الخليج - طريق خريص', distance: '9.65', lat: 24.741, lng: 46.795, status: 'open', preOrderAvailable: true },
  { id: 'p18', name: 'فرع الندى', address: 'حي الندى - شارع سعد بن عبدالرحمن', distance: '3.90', lat: 24.845, lng: 46.67, status: 'open', preOrderAvailable: true },
  { id: 'p19', name: 'فرع المرسلات', address: 'حي المرسلات - شارع أبو بكر الصديق', distance: '6.10', lat: 24.795, lng: 46.685, status: 'open', preOrderAvailable: true },
  { id: 'p20', name: 'فرع الحمراء', address: 'حي الحمراء - شارع صلاح الدين', distance: '14.80', lat: 24.671, lng: 46.713, status: 'open', preOrderAvailable: true },
];

export const curbsideBranches: Branch[] = [
  { id: 'c1', name: 'فرع الملز', address: 'حي الملز - شارع الستين', distance: '2.50', lat: 24.6816, lng: 46.7234, status: 'open', preOrderAvailable: true },
  { id: 'c2', name: 'فرع الروضة', address: 'حي الروضة - شارع الأمير فيصل', distance: '3.75', lat: 24.7016, lng: 46.7434, status: 'open', preOrderAvailable: true },
  { id: 'c3', name: 'فرع النخيل', address: 'حي النخيل - طريق الملك فهد', distance: '4.80', lat: 24.7816, lng: 46.6134, status: 'open', preOrderAvailable: true },
  { id: 'c4', name: 'فرع الصحافة', address: 'حي الصحافة - شارع أنس بن مالك', distance: '5.60', lat: 24.8416, lng: 46.6534, status: 'busy', busyUntil: '12 مارس 02:45' },
  { id: 'c5', name: 'فرع المروج', address: 'حي المروج - طريق عثمان بن عفان', distance: '7.25', lat: 24.7616, lng: 46.6734, status: 'open', preOrderAvailable: true },
  { id: 'c6', name: 'فرع العزيزية', address: 'حي العزيزية - طريق الحرمين', distance: '9.85', lat: 24.6516, lng: 46.7334, status: 'busy', busyUntil: '12 مارس 03:30' },
  { id: 'c7', name: 'فرع السويدي', address: 'حي السويدي - شارع البطحاء', distance: '8.40', lat: 24.615, lng: 46.653, status: 'open', preOrderAvailable: true },
  { id: 'c8', name: 'فرع الشهداء', address: 'حي الشهداء - طريق عمر بن الخطاب', distance: '10.30', lat: 24.728, lng: 46.765, status: 'open', preOrderAvailable: true },
  { id: 'c9', name: 'فرع الفيحاء', address: 'حي الفيحاء - شارع الأمير عبدالله', distance: '6.50', lat: 24.692, lng: 46.748, status: 'open', preOrderAvailable: true },
  { id: 'c10', name: 'فرع النسيم', address: 'حي النسيم - طريق الأمير سعد', distance: '11.40', lat: 24.705, lng: 46.785, status: 'open', preOrderAvailable: true },
  { id: 'c11', name: 'فرع الريان', address: 'حي الريان - شارع الوادي', distance: '4.20', lat: 24.748, lng: 46.648, status: 'open', preOrderAvailable: true },
  { id: 'c12', name: 'فرع الروابي', address: 'حي الروابي - شارع الجزيرة', distance: '8.90', lat: 24.677, lng: 46.734, status: 'busy', busyUntil: '12 مارس 04:15' },
  { id: 'c13', name: 'فرع البديعة', address: 'حي البديعة - شارع الهدا', distance: '12.60', lat: 24.635, lng: 46.628, status: 'open', preOrderAvailable: true },
  { id: 'c14', name: 'فرع المنفوحة', address: 'حي المنفوحة - شارع الإمام فيصل', distance: '13.10', lat: 24.618, lng: 46.712, status: 'closed', nextOpenTime: '09:00 ص' },
  { id: 'c15', name: 'فرع الخزامى', address: 'حي الخزامى - طريق المطار', distance: '5.30', lat: 24.715, lng: 46.658, status: 'open', preOrderAvailable: true },
  { id: 'c16', name: 'فرع الملك فهد', address: 'حي الملك فهد - طريق مكة المكرمة', distance: '7.60', lat: 24.688, lng: 46.695, status: 'open', preOrderAvailable: true },
  { id: 'c17', name: 'فرع الواحة', address: 'حي الواحة - شارع التخصصي', distance: '3.10', lat: 24.792, lng: 46.635, status: 'open', preOrderAvailable: true },
  { id: 'c18', name: 'فرع الدار البيضاء', address: 'حي الدار البيضاء - طريق الحائر', distance: '15.20', lat: 24.558, lng: 46.765, status: 'closed', nextOpenTime: '07:00 ص' },
  { id: 'c19', name: 'فرع قرطبة', address: 'حي قرطبة - شارع سعيد بن زيد', distance: '9.40', lat: 24.755, lng: 46.778, status: 'open', preOrderAvailable: true },
  { id: 'c20', name: 'فرع الفلاح', address: 'حي الفلاح - شارع ابن تيمية', distance: '1.85', lat: 24.805, lng: 46.665, status: 'open', preOrderAvailable: true },
];

export type CarInfo = {
  id: string;
  brand: string;
  plate: string;
  color: string;
  colorName: string;
};

export const savedCars: CarInfo[] = [
  { id: 'c1', brand: 'كاديلاك', plate: '9191 د ع ي', color: '#000000', colorName: 'أسود' },
  { id: 'c2', brand: 'بي ام دبليو', plate: '2233 ح ب س', color: '#FFFFFF', colorName: 'أبيض' },
  { id: 'c3', brand: 'تويوتا', plate: '4455 ر ه ن', color: '#C0C0C0', colorName: 'فضي' },
  { id: 'c4', brand: 'مرسيدس', plate: '6677 ط م ك', color: '#1B2A4A', colorName: 'كحلي' },
  { id: 'c5', brand: 'لكزس', plate: '8899 و ف ل', color: '#8B0000', colorName: 'أحمر غامق' },
  { id: 'c6', brand: 'هوندا', plate: '1122 ج د ع', color: '#1E90FF', colorName: 'أزرق' },
  { id: 'c7', brand: 'نيسان', plate: '3344 ب ن ص', color: '#696969', colorName: 'رمادي' },
  { id: 'c8', brand: 'فورد', plate: '5566 خ ش ق', color: '#006400', colorName: 'أخضر' },
  { id: 'c9', brand: 'شيفروليه', plate: '7788 ت ز م', color: '#DAA520', colorName: 'ذهبي' },
];

export const savedAddresses: SavedAddress[] = [
  { id: 'a1', label: 'البيت', details: 'بيت رقم ١٠١ - شارع صديق' },
  { id: 'a2', label: 'المكتب', details: 'عمارة رقم ٣٤ الدور الثاني' },
  { id: 'a3', label: 'بيت العائلة', details: 'حي الملقا - شارع الأمير محمد' },
  { id: 'a4', label: 'الشقة', details: 'برج النخيل - الدور ١٥' },
  { id: 'a5', label: 'بيت الوالد', details: 'حي الياسمين - شارع ٢٣' },
  { id: 'a6', label: 'العمل الجديد', details: 'مركز الرياض المالي - برج ٢' },
  { id: 'a7', label: 'النادي', details: 'نادي الشباب - بوابة ٣' },
  { id: 'a8', label: 'بيت الأخ', details: 'حي النرجس - فيلا ٨٨' },
  { id: 'a9', label: 'المستشفى', details: 'مستشفى الملك فيصل - مبنى العيادات' },
  { id: 'a10', label: 'الجامعة', details: 'جامعة الملك سعود - كلية الهندسة' },
  { id: 'a11', label: 'مكتب الشريك', details: 'برج المملكة - الدور ٣٠' },
  { id: 'a12', label: 'بيت الجد', details: 'حي العليا - شارع التحلية' },
];
