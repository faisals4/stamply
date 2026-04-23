import type { Store } from './types';

/**
 * Demo merchant directory with realistic Arabic menus.
 * Each store has 10+ menu sections for scroll testing.
 */
export const STORES: Store[] = [
  {
    id: '1',
    name: 'شواية تربيعة',
    cover: 'https://images.deliveryhero.io/image/hungerstation/restaurant/android_cover_photo/30f7d2a00c8e56ad3d5017d704a7d81c.jpg',
    logoLabel: 'تربيعة',
    logoColor: '#7C2D12',
    logoUrl: 'https://images.deliveryhero.io/image/hungerstation/restaurant/logo_ar/63566c83d1a30e120961dd97c6c90e63.jpg',
    categories: ['مشويات', 'لحوم', 'سعودي'],
    rating: 4.7, distanceKm: 2.5, express: true,
    minOrder: 30, deliveryTime: { min: 25, max: 40 }, deliveryFee: 15, featured: true,
    menuSections: [
      { id: 's1', name: 'شوايه', layout: 'grid', products: [
        { id: '1a', name: 'حبة دجاج شوايه مع بطاطس', image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=600&q=80', price: 53, brandLabel: 'مميز' },
        { id: '1b', name: 'نص دجاج شواية سادة', image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=600&q=80', price: 19 },
        { id: '1c', name: 'نص دجاج شوايه مع بطاطس', image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=600&q=80', price: 26 },
        { id: '1d', name: 'نص دجاج شواية مع رز', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', price: 26 },
      ]},
      { id: 's2', name: 'شوايه — تكملة', layout: 'list', products: [
        { id: '1e', name: 'دجاج شوايه مع رز كامله', description: 'حبة دجاج شوايه كاملة مع أرز', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', price: 53 },
        { id: '1f', name: 'عرض شوايه بطاطس', description: 'حبة دجاج شوايه مع بطاطس مع 2 كنزا', image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=600&q=80', price: 53 },
        { id: '1g', name: 'بخاري', description: 'دجاج شواية متبّل بتوابل البخاري الأصيلة، مطبوخ بعناية ليحافظ على لونه الذهبي وطعمه الغني، يقدم مع أرز بخاري مفلفل', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=600&q=80', price: 27 },
      ]},
      { id: 's3', name: 'العروض', layout: 'list', products: [
        { id: '1h', name: 'عرض العزيمة', description: 'دجاج مشوي مع بطاطس مقلية بالإضافة إلى البصل المشوي والفلفل المشوي والطماطم المشوية مع الثوم والصوص السبايسي والمخلل مع 3 بيبسي', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80', price: 128, brandLabel: 'عرض' },
      ]},
      { id: 's4', name: 'دجاج على الفحم', layout: 'list', products: [
        { id: '1i', name: 'نص دجاج على الفحم مع رز', description: 'صحن أرز مع نص حبة دجاج مشوي مسحب مع الطماطم المشوي والبصل والصوص الحار', image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=600&q=80', price: 26 },
        { id: '1j', name: 'دجاج على الفحم مع بطاطس', description: 'نص حبة دجاج مشوي مع البطاطس المقلي بالإضافة إلى البصل المشوي والفلفل المشوي والطماطم المشوية مع الثوم والصوص السبايسي والمخلل', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80', price: 26 },
      ]},
      { id: 's5', name: 'مشاوي', layout: 'list', products: [
        { id: '1k', name: 'مشاوي مشكل 4 اصياخ', description: 'أسياخ المشاوي مع الرز والبقدونس والبصل والطماطم بالإضافة إلى صوص الثوم والصوص الحار', image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=600&q=80', price: 47 },
      ]},
      { id: 's6', name: 'عزيمة تربيعة', layout: 'list', products: [
        { id: '1l', name: 'عزيمة تربيعة دجاج على الفحم', description: 'صحن عزيمة فاخر يجمع بين نكهات الفحم وتتبيلة مميزة، أرز شهي وخمسة أنصاص دجاج مشوي على الفحم مع بطاطس وخضار مشوية وصوصات', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80', price: 137, brandLabel: 'عزيمة' },
        { id: '1m', name: 'عزيمة مشاوي', description: 'صينية مشاوي فاخرة تجمع بين أسياخ المشاوي المشكلة من كباب وأوصال وشيش طاووق والأرز والخضروات المشوية والصوص الحار مع البطاطس والباذنجان المقلي وصوص الطحينة', image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=600&q=80', price: 259, brandLabel: 'عزيمة' },
        { id: '1n', name: 'شواية عزيمة 5 انصاص', description: 'صحن فاخر من أرز الكبسة المبهّر مع خمسة أنصاف دجاج شواية بتتبيلة خاصة مزين بالمكسرات المحمصة والخضار', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=600&q=80', price: 135, brandLabel: 'عزيمة' },
      ]},
      { id: 's7', name: 'الاضافات الجانبية', layout: 'list', products: [
        { id: '1o', name: 'بطاطس مكعبات', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80', price: 8 },
        { id: '1p', name: 'سلطة خضراء', description: 'مزيج من الخس والخيار والبصل والطماطم مع الليمون وزيت الزيتون', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', price: 8 },
        { id: '1q', name: 'حمص', description: 'حمص مع زيت الزيتون', image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=600&q=80', price: 12 },
        { id: '1r', name: 'رز ساده', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', price: 9 },
        { id: '1s', name: 'بطاطس شواية', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80', price: 8 },
      ]},
      { id: 's8', name: 'الصوصات والمخللات', layout: 'list', products: [
        { id: '1t', name: 'مخلل', description: 'صحن مخلل', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=600&q=80', price: 3 },
        { id: '1u', name: 'صوص ثوم', image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=600&q=80', price: 3 },
        { id: '1v', name: 'طحينة', description: 'صوص طحينة', image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=600&q=80', price: 3 },
        { id: '1w', name: 'صوص سبايسي ثوم', image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=600&q=80', price: 3 },
        { id: '1x', name: 'صوص دقوس', image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=600&q=80', price: 2 },
      ]},
      { id: 's9', name: 'المشروبات', layout: 'list', products: [
        { id: '1y', name: 'لبن', description: 'مشروب لبن', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80', price: 2 },
        { id: '1z', name: 'كينزا', description: 'مشروب الكنزا الغازي', image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=600&q=80', price: 5 },
        { id: '1aa', name: 'مشروب غازي', description: 'مشروب غازي من اختيارك', image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=600&q=80', price: 6 },
        { id: '1ab', name: 'ماء', description: 'ماء صغير', image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=600&q=80', price: 3 },
      ]},
    ],
  },
  {
    id: '2',
    name: 'كرانشي تشكن',
    cover: 'https://images.deliveryhero.io/image/hungerstation/restaurant/android_cover_photo/4cbd7eb60e9b3999c9f986b8c6951360.jpeg',
    logoLabel: 'كرانشي',
    logoColor: '#DC2626',
    logoUrl: 'https://images.deliveryhero.io/image/hungerstation/restaurant/logo_ar/7fd5aa2d755ce367f774d80670e235e2.jpg',
    categories: ['دجاج', 'مأكولات سريعة', 'مشروبات'],
    rating: 4.3, distanceKm: 3.1, express: true,
    minOrder: 20, deliveryTime: { min: 15, max: 30 }, deliveryFee: 12,
    menuSections: [
      { id: 'c1', name: 'الأكثر طلباً', layout: 'grid', products: [
        { id: '2a', name: 'وجبة دجاج مقرمش ٣ قطع', image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=600&q=80', price: 28, brandLabel: 'الأكثر طلباً' },
        { id: '2b', name: 'ستربس دجاج ٥ قطع', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80', price: 22 },
        { id: '2c', name: 'برجر دجاج كرسبي', image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=600&q=80', price: 25 },
        { id: '2d', name: 'وجبة عائلية ١٢ قطعة', image: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=600&q=80', price: 75, brandLabel: 'عائلية' },
      ]},
      { id: 'c2', name: 'الوجبات الفردية', layout: 'list', products: [
        { id: '2e', name: 'وجبة ستربس ٣ قطع', description: 'ستربس + بطاطس + مشروب', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80', price: 24 },
        { id: '2f', name: 'وجبة برجر دجاج', description: 'برجر كرسبي + بطاطس + مشروب', image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=600&q=80', price: 28 },
      ]},
      { id: 'c3', name: 'البرجر', layout: 'list', products: [
        { id: '2g', name: 'برجر كلاسيك', description: 'دجاج مقرمش مع خس وطماطم ومايونيز', image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=600&q=80', price: 20 },
        { id: '2h', name: 'برجر سبايسي', description: 'دجاج حار مع صلصة سبايسي وهالبينو', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', price: 22 },
        { id: '2i', name: 'برجر مزدوج', description: 'طبقتين دجاج مقرمش مع جبنة شيدر', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', price: 30 },
      ]},
      { id: 'c4', name: 'الرابات', layout: 'list', products: [
        { id: '2j', name: 'راب دجاج كلاسيك', description: 'دجاج مقرمش ملفوف بخبز تورتيلا مع خضار', image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=80', price: 18 },
        { id: '2k', name: 'راب دجاج سبايسي', description: 'دجاج حار مع صلصة رانش وخس', image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=80', price: 20 },
      ]},
      { id: 'c5', name: 'القطع المنفردة', layout: 'list', products: [
        { id: '2l', name: 'دجاج مقرمش قطعة', description: 'قطعة دجاج واحدة مقرمشة', image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=600&q=80', price: 8 },
        { id: '2m', name: 'ناجتس ٦ قطع', description: 'قطع صغيرة مقرمشة مع صوص', image: 'https://images.unsplash.com/photo-1562967916-eb82221dfb44?auto=format&fit=crop&w=600&q=80', price: 15 },
      ]},
      { id: 'c6', name: 'الإضافات', layout: 'list', products: [
        { id: '2n', name: 'بطاطس مقلية كبير', description: 'بطاطس ذهبية مقرمشة', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80', price: 10 },
        { id: '2o', name: 'كول سلو', description: 'ملفوف وجزر بصوص كريمي', image: 'https://images.unsplash.com/photo-1625938145744-533e6c2d0571?auto=format&fit=crop&w=600&q=80', price: 8 },
        { id: '2p', name: 'ذرة بالزبدة', description: 'ذرة حلوة بالزبدة والملح', image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80', price: 8 },
      ]},
      { id: 'c7', name: 'الصوصات', layout: 'list', products: [
        { id: '2q', name: 'صوص باربكيو', image: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=600&q=80', price: 2 },
        { id: '2r', name: 'صوص رانش', image: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=600&q=80', price: 2 },
        { id: '2s', name: 'صوص ثاوزند آيلاند', image: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=600&q=80', price: 2 },
      ]},
      { id: 'c8', name: 'المشروبات الباردة', layout: 'list', products: [
        { id: '2t', name: 'بيبسي عادي', image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=600&q=80', price: 5 },
        { id: '2u', name: 'عصير برتقال طازج', image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80', price: 12 },
        { id: '2v', name: 'ماء معدني', image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=600&q=80', price: 3 },
      ]},
      { id: 'c9', name: 'الحلويات', layout: 'list', products: [
        { id: '2w', name: 'سينابون', description: 'لفائف قرفة بالكريمة', image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=600&q=80', price: 15 },
        { id: '2x', name: 'آيس كريم شوكولاتة', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80', price: 10 },
      ]},
      { id: 'c10', name: 'عروض اليوم', layout: 'list', products: [
        { id: '2y', name: 'عرض الغداء', description: 'برجر + بطاطس + مشروب', image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=600&q=80', price: 30, discountPrice: 22, discountPercent: 27 },
        { id: '2z', name: 'عرض العائلة', description: '١٢ قطعة + بطاطس كبير + كول سلو + ٤ مشروبات', image: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=600&q=80', price: 89, discountPrice: 69, discountPercent: 22 },
      ]},
    ],
  },
  {
    id: '3',
    name: 'بيت الشاورما',
    cover: 'https://images.deliveryhero.io/image/hungerstation/restaurant/android_cover_photo/8baaeccc63bde3ff985cc137380dc405.jpg',
    logoLabel: 'الشاورما',
    logoColor: '#B45309',
    logoUrl: 'https://images.deliveryhero.io/image/hungerstation/restaurant/logo_ar/0a780aa9b334f270e12a3f12cfea4132.jpg',
    categories: ['شاورما', 'سندويتشات', 'مأكولات سريعة'],
    rating: 4.5, distanceKm: 1.8, express: true,
    minOrder: 15, deliveryTime: { min: 15, max: 25 }, deliveryFee: 10,
    menuSections: [
      { id: 'sh1', name: 'شاورما لحم', layout: 'grid', products: [
        { id: '3a', name: 'شاورما لحم عربي', image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=80', price: 14, brandLabel: 'الأكثر مبيعاً' },
        { id: '3b', name: 'شاورما لحم سبيشل', image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=80', price: 18 },
        { id: '3c', name: 'بلاتو شاورما لحم', image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=600&q=80', price: 45 },
      ]},
      { id: 'sh2', name: 'شاورما دجاج', layout: 'list', products: [
        { id: '3d', name: 'شاورما دجاج عربي', description: 'دجاج مشوي مع طحينة وخضار', image: 'https://images.unsplash.com/photo-1633321702518-7fafe5a78cb9?auto=format&fit=crop&w=600&q=80', price: 12 },
        { id: '3e', name: 'شاورما دجاج بالجبنة', description: 'دجاج مع جبنة ذائبة وصلصة ثوم', image: 'https://images.unsplash.com/photo-1633321702518-7fafe5a78cb9?auto=format&fit=crop&w=600&q=80', price: 15 },
        { id: '3f', name: 'بلاتو شاورما دجاج', description: '٤ ساندويتشات + بطاطس + مخللات', image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=600&q=80', price: 40 },
      ]},
      { id: 'sh3', name: 'الفلافل', layout: 'list', products: [
        { id: '3g', name: 'ساندويتش فلافل', description: 'فلافل مقرمش مع طحينة وخضار', image: 'https://images.unsplash.com/photo-1593001874117-c99c800e3eb6?auto=format&fit=crop&w=600&q=80', price: 10 },
        { id: '3h', name: 'بلاتو فلافل', description: '٨ قطع فلافل مع حمص وسلطة', image: 'https://images.unsplash.com/photo-1593001874117-c99c800e3eb6?auto=format&fit=crop&w=600&q=80', price: 25 },
      ]},
      { id: 'sh4', name: 'ساندويتشات متنوعة', layout: 'list', products: [
        { id: '3i', name: 'ساندويتش كبدة', description: 'كبدة مقلية مع بصل ورمان', image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80', price: 12 },
        { id: '3j', name: 'ساندويتش سجق', description: 'سجق مشوي مع خضار وصلصة', image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80', price: 13 },
      ]},
      { id: 'sh5', name: 'المقبلات', layout: 'list', products: [
        { id: '3k', name: 'حمص', image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=600&q=80', price: 10 },
        { id: '3l', name: 'فول', image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=600&q=80', price: 10 },
        { id: '3m', name: 'بابا غنوج', image: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?auto=format&fit=crop&w=600&q=80', price: 12 },
      ]},
      { id: 'sh6', name: 'السلطات', layout: 'list', products: [
        { id: '3n', name: 'فتوش', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80', price: 12 },
        { id: '3o', name: 'سلطة خضار', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', price: 10 },
      ]},
      { id: 'sh7', name: 'البطاطس', layout: 'list', products: [
        { id: '3p', name: 'بطاطس عادي', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80', price: 8 },
        { id: '3q', name: 'بطاطس بالجبنة', description: 'بطاطس مع جبنة شيدر ذائبة', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80', price: 12 },
      ]},
      { id: 'sh8', name: 'المخللات والإضافات', layout: 'list', products: [
        { id: '3r', name: 'مخللات مشكلة', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=600&q=80', price: 5 },
        { id: '3s', name: 'ثومية', image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=600&q=80', price: 3 },
      ]},
      { id: 'sh9', name: 'المشروبات', layout: 'list', products: [
        { id: '3t', name: 'عيران', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80', price: 5 },
        { id: '3u', name: 'بيبسي', image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=600&q=80', price: 4 },
        { id: '3v', name: 'ماء', image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=600&q=80', price: 2 },
      ]},
      { id: 'sh10', name: 'عروض الشاورما', layout: 'list', products: [
        { id: '3w', name: 'عرض ٣ شاورما + بطاطس', description: 'اختر ٣ ساندويتشات مع بطاطس كبير', image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=80', price: 42, discountPrice: 35, discountPercent: 17 },
      ]},
    ],
  },
  {
    id: '4',
    name: 'سيدلينق سلط',
    cover: 'https://images.deliveryhero.io/image/hungerstation/restaurant/android_cover_photo/9e016199471ab32b23f7519fec265590.jpg',
    logoLabel: 'سلط', logoColor: '#15803D',
    logoUrl: 'https://images.deliveryhero.io/image/hungerstation/restaurant/logo_ar/62349919a58fd15e18e4f1dd74ee620f.png',
    categories: ['سلطات', 'صحي', 'مشروبات'],
    rating: 4.6, distanceKm: 4.2,
    minOrder: 25, deliveryTime: { min: 20, max: 35 }, deliveryFee: 14,
    menuSections: [
      { id: 'sl1', name: 'سلطات كلاسيكية', layout: 'grid', products: [
        { id: '4a', name: 'سلطة سيزر بالدجاج', image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=600&q=80', price: 32, brandLabel: 'صحي', calories: 320 },
        { id: '4b', name: 'سلطة يونانية', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', price: 28, calories: 240 },
        { id: '4c', name: 'سلطة كينوا بالأفوكادو', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80', price: 35, calories: 290 },
      ]},
      { id: 'sl2', name: 'بوكي بول', layout: 'list', products: [
        { id: '4d', name: 'بوكي سلمون', description: 'سلمون طازج مع أرز وأفوكادو وإيدامامي', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', price: 42 },
        { id: '4e', name: 'بوكي تونة', description: 'تونة طازجة مع أرز ومانجو وبصل أخضر', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', price: 40 },
        { id: '4f', name: 'بوكي دجاج', description: 'دجاج مشوي مع أرز بني وخضار مشكلة', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', price: 36 },
      ]},
      { id: 'sl3', name: 'سلطات بروتين', layout: 'list', products: [
        { id: '4g', name: 'سلطة ستيك مشوي', description: 'شرائح ستيك مع خضار مشوية ودريسنج بلسمك', image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=600&q=80', price: 45 },
        { id: '4h', name: 'سلطة روبيان مشوي', description: 'روبيان مشوي مع أفوكادو ومانجو', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80', price: 48 },
      ]},
      { id: 'sl4', name: 'شوربات', layout: 'list', products: [
        { id: '4i', name: 'شوربة عدس', description: 'شوربة عدس تقليدية بالكمون والليمون', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80', price: 16 },
        { id: '4j', name: 'شوربة طماطم', description: 'شوربة طماطم كريمية مع كروتون', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80', price: 18 },
      ]},
      { id: 'sl5', name: 'رابات صحية', layout: 'list', products: [
        { id: '4k', name: 'راب دجاج مشوي', description: 'دجاج مشوي مع خضار وصوص زبادي في تورتيلا قمح', image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=80', price: 26 },
        { id: '4l', name: 'راب فلافل', description: 'فلافل مع حمص وخضار طازجة', image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=80', price: 22 },
      ]},
      { id: 'sl6', name: 'أطباق جانبية', layout: 'list', products: [
        { id: '4m', name: 'بطاطا حلوة مشوية', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80', price: 14 },
        { id: '4n', name: 'أفوكادو توست', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80', price: 22 },
      ]},
      { id: 'sl7', name: 'السموذي', layout: 'list', products: [
        { id: '4o', name: 'سموذي أخضر ديتوكس', description: 'سبانخ وموز وتفاح أخضر', image: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=600&q=80', price: 22 },
        { id: '4p', name: 'سموذي توت مشكل', description: 'توت وفراولة وموز مع زبادي', image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80', price: 24 },
        { id: '4q', name: 'سموذي مانجو وأناناس', description: 'مانجو طازج مع أناناس وحليب جوز الهند', image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80', price: 24 },
      ]},
      { id: 'sl8', name: 'العصائر الطازجة', layout: 'list', products: [
        { id: '4r', name: 'عصير برتقال', image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80', price: 16 },
        { id: '4s', name: 'عصير جزر وزنجبيل', image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80', price: 18 },
      ]},
      { id: 'sl9', name: 'المشروبات الباردة', layout: 'list', products: [
        { id: '4t', name: 'ماء جوز الهند', image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=600&q=80', price: 12 },
        { id: '4u', name: 'آيس تي أخضر', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80', price: 14 },
      ]},
      { id: 'sl10', name: 'الحلويات الصحية', layout: 'list', products: [
        { id: '4v', name: 'آساي بول', description: 'آساي مع جرانولا وفواكه طازجة وعسل', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=600&q=80', price: 32 },
        { id: '4w', name: 'بان كيك بروتين', description: 'بان كيك بدقيق الشوفان مع توت وعسل', image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80', price: 28 },
      ]},
    ],
  },
  {
    id: '5', name: 'بلوت',
    cover: 'https://images.deliveryhero.io/image/hungerstation/restaurant/android_cover_photo/142f44fe9489018ad05bc1f6f312604c.jpg',
    logoLabel: 'بلوت', logoColor: '#1E40AF',
    logoUrl: 'https://images.deliveryhero.io/image/hungerstation/restaurant/logo_ar/beceaf065f282bb979f906a378ce22a9.png',
    categories: ['مأكولات متنوعة', 'مشروبات', 'حلويات'],
    rating: 4.4, distanceKm: 5.0, express: true,
    minOrder: 25, deliveryTime: { min: 25, max: 40 }, deliveryFee: 15,
    menuSections: [
      { id: 'b1', name: 'الستيك', layout: 'grid', products: [
        { id: '5a', name: 'ريب آي ٣٠٠ جرام', image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=600&q=80', price: 89, brandLabel: 'مميز' },
        { id: '5b', name: 'تندرلوين ٢٥٠ جرام', image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=600&q=80', price: 95 },
      ]},
      { id: 'b2', name: 'المأكولات البحرية', layout: 'list', products: [
        { id: '5c', name: 'سلمون مشوي', description: 'فيليه سلمون مع خضار مشوية', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80', price: 72 },
        { id: '5d', name: 'روبيان مقلي', description: 'روبيان مقرمش مع صوص ترتار', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80', price: 58 },
      ]},
      { id: 'b3', name: 'الباستا', layout: 'list', products: [
        { id: '5e', name: 'باستا ألفريدو', description: 'فيتوتشيني مع صوص كريمي ودجاج', image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=600&q=80', price: 42 },
        { id: '5f', name: 'باستا أرابياتا', description: 'بيني مع صلصة طماطم حارة', image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=600&q=80', price: 35 },
      ]},
      { id: 'b4', name: 'الريزوتو', layout: 'list', products: [
        { id: '5g', name: 'ريزوتو مشروم ترافل', image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=600&q=80', price: 55 },
        { id: '5h', name: 'ريزوتو سي فود', image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=600&q=80', price: 62 },
      ]},
      { id: 'b5', name: 'البرجر', layout: 'list', products: [
        { id: '5i', name: 'برجر واقيو', description: 'لحم واقيو مع جبنة غودا وصوص ترافل', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', price: 65 },
        { id: '5j', name: 'برجر كلاسيك', description: 'لحم أنقس مع خس وطماطم ومخلل', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', price: 42 },
      ]},
      { id: 'b6', name: 'السلطات', layout: 'list', products: [
        { id: '5k', name: 'سلطة سيزر', image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=600&q=80', price: 28 },
        { id: '5l', name: 'سلطة بلوت الخاصة', description: 'جرجير وبارميزان وجوز وتفاح أخضر', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80', price: 32 },
      ]},
      { id: 'b7', name: 'المقبلات', layout: 'list', products: [
        { id: '5m', name: 'كالاماري مقلي', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=600&q=80', price: 35 },
        { id: '5n', name: 'بروشيتا طماطم', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=600&q=80', price: 28 },
      ]},
      { id: 'b8', name: 'الحلويات', layout: 'list', products: [
        { id: '5o', name: 'تشيز كيك باسك', image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80', price: 32 },
        { id: '5p', name: 'كريم بروليه', image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?auto=format&fit=crop&w=600&q=80', price: 28 },
        { id: '5q', name: 'تيراميسو', image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80', price: 30 },
      ]},
      { id: 'b9', name: 'المشروبات الساخنة', layout: 'list', products: [
        { id: '5r', name: 'كابتشينو', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80', price: 18 },
        { id: '5s', name: 'لاتيه', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80', price: 20 },
      ]},
      { id: 'b10', name: 'المشروبات الباردة', layout: 'list', products: [
        { id: '5t', name: 'موهيتو', image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=600&q=80', price: 22 },
        { id: '5u', name: 'عصير طازج', image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80', price: 18 },
      ]},
    ],
  },
  {
    id: '6', name: 'ديوان باب شرقي',
    cover: 'https://images.deliveryhero.io/image/hungerstation/restaurant/android_cover_photo/c34df835fa1b250c1f0e639dd2d4b2a2.png',
    logoLabel: 'ديوان', logoColor: '#7E22CE',
    logoUrl: 'https://images.deliveryhero.io/image/hungerstation/restaurant/logo_ar/fc467568cc6462d52f8d6e26628491b6.png',
    categories: ['سعودي', 'شرقي', 'مشاوي'],
    rating: 4.8, distanceKm: 3.7, express: true,
    minOrder: 35, deliveryTime: { min: 30, max: 45 }, deliveryFee: 18, featured: true,
    menuSections: [
      { id: 'd1', name: 'الأطباق السعودية', layout: 'grid', products: [
        { id: '6a', name: 'كبسة لحم', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=600&q=80', price: 55, brandLabel: 'تقليدي' },
        { id: '6b', name: 'مندي دجاج', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', price: 42 },
        { id: '6c', name: 'مظبي حاشي', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80', price: 85, brandLabel: 'مميز' },
      ]},
      { id: 'd2', name: 'الطبخات الشعبية', layout: 'list', products: [
        { id: '6d', name: 'صالونة لحم', description: 'لحم مطبوخ مع خضار وصلصة طماطم', image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80', price: 38 },
        { id: '6e', name: 'مرقوق', description: 'خبز رقيق مع مرق لحم وخضار', image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80', price: 35 },
        { id: '6f', name: 'جريش باللحم', description: 'قمح مجروش مطبوخ مع لحم ولبن', image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80', price: 32 },
      ]},
      { id: 'd3', name: 'المشاوي', layout: 'list', products: [
        { id: '6g', name: 'مشوي مشكل', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80', price: 65 },
        { id: '6h', name: 'كباب لحم', image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=600&q=80', price: 42 },
      ]},
      { id: 'd4', name: 'الفطور', layout: 'list', products: [
        { id: '6i', name: 'فول بالسمن', image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=600&q=80', price: 12 },
        { id: '6j', name: 'بيض بالطماطم (شكشوكة)', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=600&q=80', price: 15 },
        { id: '6k', name: 'معصوب', description: 'خبز مع موز وعسل وقشطة', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=600&q=80', price: 18 },
      ]},
      { id: 'd5', name: 'المقبلات', layout: 'list', products: [
        { id: '6l', name: 'سمبوسة ٥ قطع', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=600&q=80', price: 15 },
        { id: '6m', name: 'كبة مقلية', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=600&q=80', price: 18 },
      ]},
      { id: 'd6', name: 'السلطات', layout: 'list', products: [
        { id: '6n', name: 'سلطة عربية', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', price: 12 },
        { id: '6o', name: 'فتوش', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80', price: 14 },
      ]},
      { id: 'd7', name: 'الأرز', layout: 'list', products: [
        { id: '6p', name: 'أرز بسمتي سادة', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', price: 8 },
        { id: '6q', name: 'أرز بخاري', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', price: 10 },
      ]},
      { id: 'd8', name: 'المشروبات', layout: 'list', products: [
        { id: '6r', name: 'شاي سعودي', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80', price: 5 },
        { id: '6s', name: 'قهوة عربية', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80', price: 8 },
        { id: '6t', name: 'لبن', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80', price: 5 },
      ]},
      { id: 'd9', name: 'الحلويات', layout: 'list', products: [
        { id: '6u', name: 'لقيمات', description: 'كرات عجين ذهبية مع دبس تمر', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=600&q=80', price: 15 },
        { id: '6v', name: 'بسبوسة', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=600&q=80', price: 12 },
      ]},
      { id: 'd10', name: 'الوجبات العائلية', layout: 'list', products: [
        { id: '6w', name: 'ذبيحة كاملة', description: 'ذبيحة مع أرز كبير وسلطات', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=600&q=80', price: 450 },
        { id: '6x', name: 'وجبة ٤ أشخاص', description: 'كبسة + مشوي + سلطتين + مشروبات', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80', price: 150 },
      ]},
    ],
  },
  {
    id: '7', name: 'جاناش',
    cover: 'https://images.deliveryhero.io/image/hungerstation/restaurant/android_cover_photo/7c47657eddd78c9ff8bb5e812d17e167.jpg',
    logoLabel: 'جاناش', logoColor: '#4A2C2A',
    logoUrl: 'https://images.deliveryhero.io/image/hungerstation/restaurant/logo_ar/49a2e169a0cfe3dd93297676bf8b7233.jpeg',
    categories: ['شوكولاتة', 'حلويات', 'قهوة'],
    rating: 4.9, distanceKm: 2.8, featured: true,
    minOrder: 40, deliveryTime: { min: 20, max: 35 }, deliveryFee: 15,
    menuSections: [
      { id: 'g1', name: 'شوكولاتة فاخرة', layout: 'grid', products: [
        { id: '7a', name: 'ترافل داكنة ٩ قطع', image: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=600&q=80', price: 65, brandLabel: 'فاخر' },
        { id: '7b', name: 'علبة بونبون ١٢ قطعة', image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=600&q=80', price: 95, brandLabel: 'هدية' },
        { id: '7c', name: 'ألواح شوكولاتة مشكلة', image: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=600&q=80', price: 45 },
      ]},
      { id: 'g2', name: 'الكيك', layout: 'list', products: [
        { id: '7d', name: 'كيك لافا', description: 'كيك دافئ بقلب شوكولاتة سائل', image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=600&q=80', price: 38 },
        { id: '7e', name: 'تشيز كيك شوكولاتة', image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80', price: 35 },
        { id: '7f', name: 'كيك ريد فلفت', image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=600&q=80', price: 32 },
      ]},
      { id: 'g3', name: 'الحلويات الفرنسية', layout: 'list', products: [
        { id: '7g', name: 'تيراميسو', image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80', price: 32 },
        { id: '7h', name: 'كريم بروليه', image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?auto=format&fit=crop&w=600&q=80', price: 28 },
        { id: '7i', name: 'إكلير شوكولاتة', image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=600&q=80', price: 22 },
      ]},
      { id: 'g4', name: 'البراوني والكوكيز', layout: 'list', products: [
        { id: '7j', name: 'براوني بالمكسرات', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80', price: 28 },
        { id: '7k', name: 'كوكيز شوكولاتة', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80', price: 18 },
      ]},
      { id: 'g5', name: 'الآيس كريم', layout: 'list', products: [
        { id: '7l', name: 'آيس كريم شوكولاتة بلجيكية', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80', price: 22 },
        { id: '7m', name: 'آيس كريم فانيلا', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80', price: 20 },
      ]},
      { id: 'g6', name: 'فوندو', layout: 'list', products: [
        { id: '7n', name: 'فوندو شوكولاتة للشخصين', description: 'شوكولاتة ذائبة مع فواكه ومارشملو', image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=600&q=80', price: 85 },
      ]},
      { id: 'g7', name: 'المشروبات الساخنة', layout: 'list', products: [
        { id: '7o', name: 'هوت شوكولت بلجيكي', description: 'شوكولاتة ساخنة مع كريمة مخفوقة', image: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=600&q=80', price: 24 },
        { id: '7p', name: 'موكا جاناش', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80', price: 22 },
        { id: '7q', name: 'كابتشينو', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80', price: 18 },
      ]},
      { id: 'g8', name: 'المشروبات الباردة', layout: 'list', products: [
        { id: '7r', name: 'آيس موكا', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80', price: 24 },
        { id: '7s', name: 'فرابتشينو شوكولاتة', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80', price: 26 },
      ]},
      { id: 'g9', name: 'هدايا وعلب', layout: 'list', products: [
        { id: '7t', name: 'علبة هدية صغيرة ٦ قطع', image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=600&q=80', price: 55 },
        { id: '7u', name: 'علبة هدية كبيرة ٢٤ قطعة', image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=600&q=80', price: 180 },
      ]},
      { id: 'g10', name: 'عروض خاصة', layout: 'list', products: [
        { id: '7v', name: 'عرض القهوة والكيك', description: 'أي مشروب ساخن + قطعة كيك', image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=600&q=80', price: 45, discountPrice: 35, discountPercent: 22 },
      ]},
    ],
  },
  {
    id: '8', name: 'أسطا عاصم',
    cover: 'https://images.deliveryhero.io/image/hungerstation/restaurant/android_cover_photo/2612f96439500e6f1f06721241a118ea.jpg',
    logoLabel: 'عاصم', logoColor: '#991B1B',
    logoUrl: 'https://images.deliveryhero.io/image/hungerstation/restaurant/logo_ar/ea0a97e1342617712e4d67a3a9cae6ea.jpg',
    categories: ['تركي', 'مشاوي', 'مأكولات بحرية'],
    rating: 4.7, distanceKm: 1.5, express: true,
    minOrder: 30, deliveryTime: { min: 25, max: 40 }, deliveryFee: 14,
    menuSections: [
      { id: 'a1', name: 'الكباب التركي', layout: 'grid', products: [
        { id: '8a', name: 'أضنة كباب', image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=600&q=80', price: 48, brandLabel: 'تركي أصيل' },
        { id: '8b', name: 'إسكندر كباب', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80', price: 55 },
        { id: '8c', name: 'شيش طاووق', image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=600&q=80', price: 38 },
        { id: '8d', name: 'كفتة داغ', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80', price: 42 },
      ]},
      { id: 'a2', name: 'البيدا والمعجّنات', layout: 'list', products: [
        { id: '8e', name: 'بيدا لحم وجبنة', description: 'خبز تركي محشو بلحم وجبنة', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80', price: 35 },
        { id: '8f', name: 'لحم بعجين', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80', price: 18 },
      ]},
      { id: 'a3', name: 'الأطباق الرئيسية', layout: 'list', products: [
        { id: '8g', name: 'طاجن لحم', description: 'لحم مع خضار في طاجن فخاري', image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80', price: 52 },
        { id: '8h', name: 'أرز تركي باللحم', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', price: 45 },
      ]},
      { id: 'a4', name: 'المقبلات الساخنة', layout: 'list', products: [
        { id: '8i', name: 'بورك بالجبنة', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=600&q=80', price: 22 },
        { id: '8j', name: 'سيقارة بورك', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=600&q=80', price: 18 },
      ]},
      { id: 'a5', name: 'المقبلات الباردة', layout: 'list', products: [
        { id: '8k', name: 'حمص تركي', image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=600&q=80', price: 14 },
        { id: '8l', name: 'جاجق', description: 'زبادي مع خيار ونعناع', image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=600&q=80', price: 12 },
      ]},
      { id: 'a6', name: 'الشوربات', layout: 'list', products: [
        { id: '8m', name: 'شوربة عدس تركية', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80', price: 16 },
        { id: '8n', name: 'شوربة يايلا', description: 'شوربة زبادي تركية', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80', price: 18 },
      ]},
      { id: 'a7', name: 'السلطات', layout: 'list', products: [
        { id: '8o', name: 'سلطة راعي', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', price: 14 },
        { id: '8p', name: 'سلطة فصول', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', price: 16 },
      ]},
      { id: 'a8', name: 'الحلويات التركية', layout: 'list', products: [
        { id: '8q', name: 'كنافة تركية', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=600&q=80', price: 28 },
        { id: '8r', name: 'بقلاوة فستق ٦ قطع', image: 'https://images.unsplash.com/photo-1519676867240-f03562e64571?auto=format&fit=crop&w=600&q=80', price: 32 },
        { id: '8s', name: 'حلاوة المولد', image: 'https://images.unsplash.com/photo-1519676867240-f03562e64571?auto=format&fit=crop&w=600&q=80', price: 18 },
      ]},
      { id: 'a9', name: 'المشروبات', layout: 'list', products: [
        { id: '8t', name: 'شاي تركي', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80', price: 8 },
        { id: '8u', name: 'قهوة تركية', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80', price: 12 },
        { id: '8v', name: 'عيران', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80', price: 6 },
      ]},
      { id: 'a10', name: 'وجبات عائلية', layout: 'list', products: [
        { id: '8w', name: 'وجبة عائلية تركية', description: 'مشكل كباب + أرز + سلطتين + خبز + مشروبات', image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=600&q=80', price: 160 },
      ]},
    ],
  },
  {
    id: '9', name: 'سمرقندي',
    cover: 'https://images.deliveryhero.io/image/hungerstation/restaurant/android_cover_photo/35b50cc4d74b958f9b74c025c947fee9.png',
    logoLabel: 'سمرقندي', logoColor: '#0F766E',
    logoUrl: 'https://images.deliveryhero.io/image/hungerstation/restaurant/logo_ar/292f29a81f9f0c2f1414f2e12a4d89a8.jpg',
    categories: ['أوزبكي', 'مشاوي', 'أرز'],
    rating: 4.6, distanceKm: 4.8,
    minOrder: 30, deliveryTime: { min: 30, max: 50 }, deliveryFee: 18,
    menuSections: [
      { id: 'sm1', name: 'الأطباق الرئيسية', layout: 'grid', products: [
        { id: '9a', name: 'بلوف أوزبكي', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', price: 48, brandLabel: 'تقليدي' },
        { id: '9b', name: 'منتو', image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80', price: 38 },
        { id: '9c', name: 'لحم مشوي', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80', price: 62 },
      ]},
      { id: 'sm2', name: 'الشوربات', layout: 'list', products: [
        { id: '9d', name: 'شوربة لاغمان', description: 'نودلز مع مرق لحم وخضار', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80', price: 28 },
        { id: '9e', name: 'شوربة شوربا', description: 'مرق لحم تقليدي مع خضار', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80', price: 22 },
      ]},
      { id: 'sm3', name: 'المعجّنات', layout: 'list', products: [
        { id: '9f', name: 'سمسا لحم', description: 'معجّنات محشوة بلحم ضأن متبّل', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=600&q=80', price: 25 },
        { id: '9g', name: 'سمسا بطاطس', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=600&q=80', price: 18 },
      ]},
      { id: 'sm4', name: 'المشاوي', layout: 'list', products: [
        { id: '9h', name: 'شيشليك لحم', image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=600&q=80', price: 52 },
        { id: '9i', name: 'شيشليك دجاج', image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=600&q=80', price: 38 },
      ]},
      { id: 'sm5', name: 'النودلز', layout: 'list', products: [
        { id: '9j', name: 'لاغمان مقلي', description: 'نودلز مقلية مع لحم وخضار', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80', price: 32 },
      ]},
      { id: 'sm6', name: 'السلطات', layout: 'list', products: [
        { id: '9k', name: 'أتشيك تشوتشوك', description: 'طماطم وبصل وفلفل أخضر', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', price: 12 },
        { id: '9l', name: 'سلطة خضار', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', price: 10 },
      ]},
      { id: 'sm7', name: 'الخبز', layout: 'list', products: [
        { id: '9m', name: 'خبز تنور أوزبكي', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80', price: 8 },
        { id: '9n', name: 'خبز بالبصل', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80', price: 10 },
      ]},
      { id: 'sm8', name: 'المقبلات', layout: 'list', products: [
        { id: '9o', name: 'حمص أوزبكي', image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=600&q=80', price: 12 },
      ]},
      { id: 'sm9', name: 'المشروبات', layout: 'list', products: [
        { id: '9p', name: 'شاي أخضر أوزبكي', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80', price: 8 },
        { id: '9q', name: 'كومبوت فواكه', description: 'مشروب فواكه مطبوخة باردة', image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=600&q=80', price: 10 },
      ]},
      { id: 'sm10', name: 'الحلويات', layout: 'list', products: [
        { id: '9r', name: 'حلاوة أوزبكية', image: 'https://images.unsplash.com/photo-1519676867240-f03562e64571?auto=format&fit=crop&w=600&q=80', price: 15 },
        { id: '9s', name: 'نافات (سكر نبات)', image: 'https://images.unsplash.com/photo-1519676867240-f03562e64571?auto=format&fit=crop&w=600&q=80', price: 12 },
      ]},
    ],
  },
  {
    id: '10', name: 'وينق ستوب',
    cover: 'https://images.deliveryhero.io/image/hungerstation/restaurant/android_cover_photo/26725c6fdec89f89993e60733b7fb26e.png',
    logoLabel: 'وينق', logoColor: '#166534',
    logoUrl: 'https://images.deliveryhero.io/image/hungerstation/restaurant/logo_ar/2e77d83a3b36d27c888bdf93a9091cfd.png',
    categories: ['دجاج', 'أجنحة', 'مأكولات سريعة'],
    rating: 4.5, distanceKm: 3.3, express: true,
    minOrder: 25, deliveryTime: { min: 20, max: 35 }, deliveryFee: 12,
    menuSections: [
      { id: 'w1', name: 'الأجنحة الكلاسيكية', layout: 'grid', products: [
        { id: '10a', name: 'أجنحة باربكيو ٨ قطع', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80', price: 35, brandLabel: 'الأكثر طلباً' },
        { id: '10b', name: 'أجنحة بافالو حارة ٨ قطع', image: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=600&q=80', price: 35 },
        { id: '10c', name: 'أجنحة عسل وخردل ٨ قطع', image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=600&q=80', price: 35 },
      ]},
      { id: 'w2', name: 'أجنحة مميزة', layout: 'list', products: [
        { id: '10d', name: 'أجنحة ليمون وفلفل', description: 'نكهة حمضية منعشة مع حرارة خفيفة', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80', price: 38 },
        { id: '10e', name: 'أجنحة ترياكي', description: 'صلصة ترياكي يابانية حلوة', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80', price: 38 },
        { id: '10f', name: 'أجنحة ثوم بارميزان', description: 'ثوم محمّر مع جبنة بارميزان', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80', price: 38 },
      ]},
      { id: 'w3', name: 'البوكسات', layout: 'list', products: [
        { id: '10g', name: 'بوكس مشكل ١٦ قطعة', description: 'اختر ٢ نكهات مفضلة', image: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=600&q=80', price: 65 },
        { id: '10h', name: 'بوكس عائلي ٢٤ قطعة', description: 'اختر ٣ نكهات', image: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=600&q=80', price: 89, brandLabel: 'عائلي' },
      ]},
      { id: 'w4', name: 'الستربس والتندرز', layout: 'list', products: [
        { id: '10i', name: 'تندرز كلاسيك ٥ قطع', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80', price: 28 },
        { id: '10j', name: 'تندرز حار ٥ قطع', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80', price: 28 },
      ]},
      { id: 'w5', name: 'البرجر', layout: 'list', products: [
        { id: '10k', name: 'برجر أجنحة كرسبي', description: 'دجاج مقرمش مع صلصة بافالو', image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=600&q=80', price: 30 },
      ]},
      { id: 'w6', name: 'الإضافات', layout: 'list', products: [
        { id: '10l', name: 'بطاطس بالجبنة', description: 'بطاطس مع جبنة شيدر وهالبينو', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80', price: 18 },
        { id: '10m', name: 'حلقات بصل', image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=600&q=80', price: 15 },
        { id: '10n', name: 'كول سلو', image: 'https://images.unsplash.com/photo-1625938145744-533e6c2d0571?auto=format&fit=crop&w=600&q=80', price: 10 },
      ]},
      { id: 'w7', name: 'الصوصات الإضافية', layout: 'list', products: [
        { id: '10o', name: 'صوص رانش', image: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=600&q=80', price: 3 },
        { id: '10p', name: 'صوص بلو تشيز', image: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=600&q=80', price: 3 },
        { id: '10q', name: 'صوص باربكيو', image: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=600&q=80', price: 3 },
      ]},
      { id: 'w8', name: 'المشروبات', layout: 'list', products: [
        { id: '10r', name: 'ليموناضة منزلية', image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=600&q=80', price: 14 },
        { id: '10s', name: 'آيس تي خوخ', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80', price: 12 },
        { id: '10t', name: 'بيبسي', image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=600&q=80', price: 5 },
      ]},
      { id: 'w9', name: 'الحلويات', layout: 'list', products: [
        { id: '10u', name: 'براوني شوكولاتة', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80', price: 18 },
        { id: '10v', name: 'كوكيز', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80', price: 12 },
      ]},
      { id: 'w10', name: 'عروض اليوم', layout: 'list', products: [
        { id: '10w', name: 'عرض الأصدقاء', description: '١٦ جناح مشكل + بطاطس كبير + ٢ مشروب', image: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=600&q=80', price: 85, discountPrice: 65, discountPercent: 24 },
        { id: '10x', name: 'عرض الفردي', description: '٨ أجنحة + بطاطس + مشروب', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80', price: 48, discountPrice: 38, discountPercent: 21 },
      ]},
    ],
  },
];

export const CATEGORIES: string[] = [
  'كل المتاجر',
  'مأكولات سريعة',
  'سعودي',
  'مشويات',
  'دجاج',
  'شاورما',
  'حلويات',
  'مشروبات',
  'صحي',
  'تركي',
];
