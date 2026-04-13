import type { Store } from './types';

/**
 * Hardcoded example merchant directory used by the Stores screen
 * until the real `/api/app/stores` endpoint exists.
 *
 * Cover URLs point at the public Unsplash CDN so the demo screen
 * renders real photography without bundling assets. Logos use a
 * solid color square + Arabic text label so they don't depend on
 * any merchant having uploaded a real logo file.
 *
 * Replace this entire file with a real fetch + transform once the
 * backend ships — no other file in `components/stores/` should need
 * to change.
 */
export const STORES: Store[] = [
  {
    id: '1',
    name: 'مقهى نمق',
    cover: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
    logoLabel: 'نمق',
    logoColor: '#1F2937',
    logoUrl: '/logos/namq.jpeg',
    categories: ['قهوة', 'حلويات', 'مخبوزات'],
    rating: 4.8,
    distanceKm: 1.2,
    express: true,
    // ── Detail tier: this merchant powers the full detail screen.
    // All other merchants still have `menuSections === undefined`
    // and the detail route falls back to this mock data when the
    // user taps any other card.
    minOrder: 15,
    deliveryTime: { min: 20, max: 35 },
    deliveryFee: 19,
    featured: true,
    promos: [
      {
        id: 'promo-delivery',
        kind: 'delivery_discount',
        fee: 5,
        minOrder: 35,
      },
      {
        id: 'promo-discount',
        kind: 'item_discount',
        percent: 25,
        scope: 'أصناف مختارة',
        hasMin: false,
      },
    ],
    menuSections: [
      {
        id: 'best-sellers',
        name: 'الأكثر مبيعًا',
        layout: 'grid',
        products: [
          {
            id: 'b1',
            name: 'قهوة مثلجة سبانيش لاتيه',
            image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80',
            price: 22,
            brandLabel: 'SAUDI MADE',
            description:
              'إسبريسو مثلج مع حليب مكثّف محلّى، يقدّم بارداً مع مكعبات ثلج. مزيج حلو متوازن بنكهة القهوة القوية مع لمسة كراميل طبيعية.',
            prepMinutes: 10,
            calories: 210,
            allergens: ['الحليب ومنتجاته', 'السمسم وبذوره', 'الجلوتين'],
            nutritionFacts: [
              { label: 'مجموع الدهون', value: '12g' },
              { label: 'الدهون المشبعة', value: '7g' },
              { label: 'الدهون المتحولة', value: '0g' },
              { label: 'الكوليسترول', value: '35mg' },
              { label: 'الصوديوم', value: '95mg' },
              { label: 'الكربوهيدرات', value: '24g' },
              { label: 'الألياف', value: '0g' },
              { label: 'مجموع السكريات', value: '21g' },
              { label: 'السكريات المضافة', value: '18g' },
              { label: 'البروتين', value: '5g' },
            ],
            // Cross-sell: 5 items from different sections of the
            // same merchant — pulled from the grid + list + combos
            // + cold drinks + desserts sections for variety.
            crossSellIds: ['b2', 'v1', 'c1', 'd1', 'de1'],
            addonGroups: [
              {
                id: 'size',
                title: 'الحجم',
                required: true,
                type: 'radio',
                options: [
                  { id: 'size_medium', name: 'وسط' },
                  { id: 'size_large', name: 'كبير', price: 6 },
                ],
              },
              {
                id: 'milk',
                title: 'نوع الحليب',
                required: true,
                type: 'radio',
                options: [
                  { id: 'milk_whole', name: 'حليب كامل الدسم' },
                  { id: 'milk_skim', name: 'حليب خالي الدسم' },
                  { id: 'milk_oat', name: 'حليب الشوفان', price: 4 },
                  { id: 'milk_almond', name: 'حليب اللوز', price: 4 },
                ],
              },
              {
                id: 'flavors',
                title: 'النكهات',
                subtitle: 'يمكنك اختيار نكهة واحدة أو أكثر',
                required: false,
                type: 'checkbox',
                options: [
                  { id: 'flavor_vanilla', name: 'فانيلا', price: 3, calories: 20 },
                  { id: 'flavor_caramel', name: 'كراميل', price: 3, calories: 25 },
                  { id: 'flavor_hazelnut', name: 'بندق', price: 3, calories: 22 },
                  { id: 'flavor_coconut', name: 'جوز الهند', price: 3, calories: 18, soldOut: true },
                ],
              },
              {
                id: 'extras',
                title: 'زيادات',
                subtitle: 'يمكنك إضافة حتى 4 خيارات',
                required: false,
                type: 'quantity',
                maxSelections: 4,
                options: [
                  { id: 'extra_shot', name: 'شوت إضافي إسبريسو', price: 5, calories: 5, maxQuantity: 2 },
                  { id: 'extra_cream', name: 'كريمة مخفوقة', price: 3, calories: 60 },
                  { id: 'extra_ice', name: 'ثلج إضافي' },
                  { id: 'extra_sugar', name: 'سكر إضافي' },
                ],
              },
            ],
          },
          {
            id: 'b2',
            name: 'كرواسون بالجبنة',
            image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
            price: 16,
            brandLabel: 'SAUDI MADE',
            // 3 cross-sell items — a drink pairing + two desserts
            crossSellIds: ['b1', 'b4', 'de2'],
          },
          {
            id: 'b3',
            name: 'كيك الجزر الطبقات',
            image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=600&q=80',
            price: 28,
            brandLabel: 'SAUDI MADE',
            // 2 cross-sell items — a coffee and a side dessert
            crossSellIds: ['b1', 'de3'],
          },
          {
            id: 'b4',
            name: 'ميني براوني بايتس',
            image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
            price: 19,
            brandLabel: 'SAUDI MADE',
            // 4 cross-sell items
            crossSellIds: ['b1', 'b2', 'd1', 'd2'],
          },
        ],
      },
      {
        id: 'value-meals',
        name: 'وجبات التوفير',
        layout: 'list',
        products: [
          {
            id: 'v1',
            name: 'وجبة إفطار كلاسيكية',
            description: 'قهوة مثلجة + كرواسون بالجبنة + عصير طازج. توفير بنسبة 25% عن السعر الأصلي.',
            image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=600&q=80',
            price: 33,
            discountPrice: 24.75,
            discountPercent: 25,
          },
          {
            id: 'v2',
            name: 'وجبة الظهيرة السريعة',
            description: 'ساندويتش الديك الرومي مع سلطة جانبية ومشروب بارد. خيار مثالي لاستراحة الغداء.',
            image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80',
            price: 45,
          },
          {
            id: 'v3',
            name: 'وجبة العائلة المشتركة',
            description: 'مجموعة متنوعة من المخبوزات الطازجة مع أربعة مشروبات ساخنة أو باردة حسب اختيارك.',
            image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
            price: 89,
          },
        ],
      },
      {
        id: 'combos',
        name: 'المجموعات',
        layout: 'list',
        products: [
          {
            id: 'c1',
            name: 'أمريكانو مثلج وكرواسون الجبنة',
            description: 'طعم قوي ومنعش للأمريكانو المثلج يتوازن بشكل رائع مع نكهة الكرواسون بالجبنة اللذيذة.',
            image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
            price: 34,
            customizable: true,
          },
          {
            id: 'c2',
            name: 'لاتيه بالفانيلا وكيك الجزر',
            description: 'نكهة كريمية حلوة للاتيه بالفانيلا تتناغم بشكل مثالي مع طبقات كيك الجزر الغنية.',
            image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
            price: 40,
            customizable: true,
          },
          {
            id: 'c3',
            name: 'كابتشينو وبراوني الشوكولاتة',
            description: 'كابتشينو إيطالي كلاسيكي مع براوني الشوكولاتة الدارك لاستراحة مثالية بعد الظهر.',
            image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80',
            price: 38,
            customizable: true,
          },
        ],
      },
      {
        id: 'cold-drinks',
        name: 'مشروبات باردة',
        layout: 'list',
        products: [
          {
            id: 'd1',
            name: 'ماتشا لاتيه مثلج',
            description: 'شاي ماتشا ياباني أخضر فاخر مع حليب بارد ورغوة ناعمة، يقدم مع الثلج.',
            image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
            price: 24,
          },
          {
            id: 'd2',
            name: 'عصير البرتقال الطازج',
            description: 'عصير برتقال طبيعي 100% معصور يومياً، غني بفيتامين C ونكهة منعشة.',
            image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
            price: 18,
          },
          {
            id: 'd3',
            name: 'ليموناضة النعناع',
            description: 'ليموناضة منزلية بنكهة النعناع الطازج، مثالية للأيام الحارة.',
            image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=600&q=80',
            price: 16,
          },
        ],
      },
      {
        id: 'desserts',
        name: 'الحلويات',
        layout: 'list',
        products: [
          {
            id: 'de1',
            name: 'تشيز كيك التوت البري',
            description: 'تشيز كيك كريمي ناعم مع طبقة من التوت البري الطازج وقاعدة بسكويت مقرمشة.',
            image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80',
            price: 32,
          },
          {
            id: 'de2',
            name: 'تيراميسو إيطالي',
            description: 'حلى إيطالي تقليدي من طبقات بسكويت السافوياردي المبلل بالقهوة وكريمة الماسكاربوني.',
            image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
            price: 29,
          },
          {
            id: 'de3',
            name: 'كنافة بالقشطة',
            description: 'كنافة ناعمة بالقشطة الطازجة، مزينة بالفستق المطحون ومغموسة بالقطر.',
            image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=600&q=80',
            price: 26,
          },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'أفران الحطب',
    cover: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    logoLabel: 'الحطب',
    logoColor: '#7C2D12',
    logoUrl: '/logos/alhatab.jpeg',
    categories: ['مخبوزات', 'مشروبات', 'سلطات'],
    rating: 4.6,
    distanceKm: 2.4,
    express: true,
  },
  {
    id: '3',
    name: 'مطاعم الأفراح',
    cover: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80',
    logoLabel: 'الأفراح',
    logoColor: '#991B1B',
    logoUrl: '/logos/alafrah.jpg',
    categories: ['الافطار', 'سعودي', 'مخبوزات'],
    rating: 4.5,
    distanceKm: 3.8,
    express: true,
  },
  {
    id: '4',
    name: 'كنافة بيروت',
    cover: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=800&q=80',
    logoLabel: 'كنافة',
    logoColor: '#B45309',
    categories: ['حلويات', 'مشروبات', 'بقلاوة'],
    rating: 4.7,
    distanceKm: 1.8,
  },
  {
    id: '5',
    name: 'شاورما الريم',
    cover: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=800&q=80',
    logoLabel: 'الريم',
    logoColor: '#0F766E',
    categories: ['مأكولات سريعة', 'شاورما', 'سندويتشات'],
    rating: 4.4,
    distanceKm: 2.1,
    express: true,
  },
  {
    id: '6',
    name: 'برجر هاوس',
    cover: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    logoLabel: 'برجر',
    logoColor: '#111827',
    categories: ['برجر', 'مأكولات سريعة', 'مشروبات'],
    rating: 4.3,
    distanceKm: 4.5,
  },
  {
    id: '7',
    name: 'مطعم الدار',
    cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    logoLabel: 'الدار',
    logoColor: '#78350F',
    categories: ['سعودي', 'كبسة', 'مشاوي'],
    rating: 4.9,
    distanceKm: 5.2,
    express: true,
  },
  {
    id: '8',
    name: 'عصائر فريش',
    cover: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=800&q=80',
    logoLabel: 'فريش',
    logoColor: '#15803D',
    categories: ['عصائر', 'مشروبات', 'فواكه'],
    rating: 4.5,
    distanceKm: 0.9,
    express: true,
  },
  {
    id: '9',
    name: 'بيتزا روما',
    cover: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    logoLabel: 'روما',
    logoColor: '#B91C1C',
    categories: ['بيتزا', 'إيطالي', 'مكرونة'],
    rating: 4.6,
    distanceKm: 3.3,
  },
  {
    id: '10',
    name: 'حلويات السعد',
    cover: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80',
    logoLabel: 'السعد',
    logoColor: '#BE185D',
    categories: ['حلويات', 'بقلاوة', 'مكسرات'],
    rating: 4.8,
    distanceKm: 6.1,
  },
];

/**
 * Filter chips shown above the store list. The first entry is the
 * default selection — the screen treats it as a no-op filter that
 * shows every merchant.
 */
export const CATEGORIES: string[] = [
  'كل المتاجر',
  'مأكولات سريعة',
  'سعودي',
  'برجر',
  'حلويات',
  'بيتزا',
  'مشروبات',
  'قهوة',
];
