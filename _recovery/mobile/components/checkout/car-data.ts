/**
 * Car brands + colors data ported from orders4
 * (`web/client/src/data/cars.ts`).
 *
 * Brand logos point to Wikimedia Commons SVGs rendered as PNGs.
 * Colors are the 13 most common Saudi car colors.
 */

export type CarBrand = {
  id: string;
  name: string;
  nameEn: string;
  logo: string;
};

export type CarColor = {
  id: string;
  name: string;
  nameEn: string;
  hex: string;
};

export const carBrands: CarBrand[] = [
  { id: 'toyota', name: 'تويوتا', nameEn: 'TOYOTA', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Toyota_logo_%28Red%29.svg/200px-Toyota_logo_%28Red%29.svg.png' },
  { id: 'hyundai', name: 'هيونداي', nameEn: 'HYUNDAI', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Hyundai_Motor_Company_logo.svg/200px-Hyundai_Motor_Company_logo.svg.png' },
  { id: 'kia', name: 'كيا', nameEn: 'KIA', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Kia-logo.svg/200px-Kia-logo.svg.png' },
  { id: 'nissan', name: 'نيسان', nameEn: 'NISSAN', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Nissan_logo.svg/200px-Nissan_logo.svg.png' },
  { id: 'honda', name: 'هوندا', nameEn: 'HONDA', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Honda.svg/200px-Honda.svg.png' },
  { id: 'chevrolet', name: 'شيفروليه', nameEn: 'CHEVROLET', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Chevrolet-logo.svg/200px-Chevrolet-logo.svg.png' },
  { id: 'ford', name: 'فورد', nameEn: 'FORD', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Ford_logo_flat.svg/200px-Ford_logo_flat.svg.png' },
  { id: 'mercedes', name: 'مرسيدس', nameEn: 'MERCEDES', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/200px-Mercedes-Logo.svg.png' },
  { id: 'bmw', name: 'بي ام دبليو', nameEn: 'BMW', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/200px-BMW.svg.png' },
  { id: 'lexus', name: 'لكزس', nameEn: 'LEXUS', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Lexus_logo.svg/200px-Lexus_logo.svg.png' },
  { id: 'audi', name: 'أودي', nameEn: 'AUDI', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Audi-Logo_2016.svg/200px-Audi-Logo_2016.svg.png' },
  { id: 'cadillac', name: 'كاديلاك', nameEn: 'CADILLAC', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Cadillac_Crest_2014.svg/200px-Cadillac_Crest_2014.svg.png' },
  { id: 'gmc', name: 'جي ام سي', nameEn: 'GMC', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/GMC_logo.svg/200px-GMC_logo.svg.png' },
  { id: 'dodge', name: 'دودج', nameEn: 'DODGE', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Dodge_logo.svg/200px-Dodge_logo.svg.png' },
  { id: 'mitsubishi', name: 'ميتسوبيشي', nameEn: 'MITSUBISHI', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Mitsubishi_logo.svg/200px-Mitsubishi_logo.svg.png' },
  { id: 'porsche', name: 'بورش', nameEn: 'PORSCHE', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Porsche_logo.svg/200px-Porsche_logo.svg.png' },
  { id: 'range-rover', name: 'رينج روفر', nameEn: 'RANGE ROVER', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Land_Rover_logo.svg/200px-Land_Rover_logo.svg.png' },
  { id: 'genesis', name: 'جينيسيس', nameEn: 'GENESIS', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Genesis_logo.svg/200px-Genesis_logo.svg.png' },
  { id: 'volvo', name: 'فولفو', nameEn: 'VOLVO', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Volvo_logo.svg/200px-Volvo_logo.svg.png' },
  { id: 'infiniti', name: 'إنفينيتي', nameEn: 'INFINITI', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Infiniti_logo.svg/200px-Infiniti_logo.svg.png' },
  { id: 'tesla', name: 'تسلا', nameEn: 'TESLA', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Tesla_Motors.svg/200px-Tesla_Motors.svg.png' },
  { id: 'byd', name: 'بي واي دي', nameEn: 'BYD', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/BYD_Auto_Logo.svg/200px-BYD_Auto_Logo.svg.png' },
  { id: 'geely', name: 'جيلي', nameEn: 'GEELY', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Geely_Auto_logo.svg/200px-Geely_Auto_logo.svg.png' },
  { id: 'changan', name: 'شانجان', nameEn: 'CHANGAN', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Changan_logo.svg/200px-Changan_logo.svg.png' },
  { id: 'haval', name: 'هافال', nameEn: 'HAVAL', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Haval_logo.svg/200px-Haval_logo.svg.png' },
  { id: 'chery', name: 'شيري', nameEn: 'CHERY', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Chery_logo.svg/200px-Chery_logo.svg.png' },
  { id: 'jetour', name: 'جيتور', nameEn: 'JETOUR', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Jetour_logo.svg/200px-Jetour_logo.svg.png' },
  { id: 'ferrari', name: 'فيراري', nameEn: 'FERRARI', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Ferrari-Logo.svg/200px-Ferrari-Logo.svg.png' },
  { id: 'bentley', name: 'بنتلي', nameEn: 'BENTLEY', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Bentley_logo.svg/200px-Bentley_logo.svg.png' },
  { id: 'lucid', name: 'لوسيد', nameEn: 'LUCID', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Lucid_Motors_logo.svg/200px-Lucid_Motors_logo.svg.png' },
];

export const carColors: CarColor[] = [
  { id: 'black', name: 'أسود', nameEn: 'Black', hex: '#000000' },
  { id: 'white', name: 'أبيض', nameEn: 'White', hex: '#FFFFFF' },
  { id: 'silver', name: 'فضي', nameEn: 'Silver', hex: '#D1D5DB' },
  { id: 'gray', name: 'رمادي', nameEn: 'Gray', hex: '#9CA3AF' },
  { id: 'red', name: 'أحمر', nameEn: 'Red', hex: '#EF4444' },
  { id: 'blue', name: 'أزرق', nameEn: 'Blue', hex: '#3B82F6' },
  { id: 'green', name: 'أخضر', nameEn: 'Green', hex: '#4ADE80' },
  { id: 'gold', name: 'ذهبي', nameEn: 'Gold', hex: '#C4A052' },
  { id: 'brown', name: 'بني', nameEn: 'Brown', hex: '#78350F' },
  { id: 'orange', name: 'برتقالي', nameEn: 'Orange', hex: '#F97316' },
  { id: 'yellow', name: 'أصفر', nameEn: 'Yellow', hex: '#FACC15' },
  { id: 'sky-blue', name: 'سماوي', nameEn: 'Sky Blue', hex: '#38BDF8' },
  { id: 'pink', name: 'وردي', nameEn: 'Pink', hex: '#F9A8D4' },
];

/** Convert Arabic-Indic numerals (٠١٢…) to Western digits (012…). */
export function arabicToEnglishDigits(str: string): string {
  const arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (d) => arabic.indexOf(d).toString());
}
