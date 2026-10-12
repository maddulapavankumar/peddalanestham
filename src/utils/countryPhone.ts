/**
 * Comprehensive Country Code System for Peddala Nestham.
 * Supports:
 * - All international calling codes (India +91, USA +1, UK +44, and all world countries)
 * - Automatic detection from device location / GPS / timezone
 * - Clean digit extraction, composing full international phone numbers
 * - Formatting with flags and senior-friendly spacing
 * - Native dialable URI generation (tel:+...)
 * - WhatsApp wa.me link generation
 */

export interface CountryPhoneConfig {
  iso: string; // ISO 3166-1 alpha-2 (e.g. 'IN', 'US', 'GB')
  name: string; // English Name
  nameTe: string; // Telugu Name
  code: string; // Calling Code with '+' (e.g. '+91', '+1', '+44')
  flag: string; // Emoji Flag
  labelTe: string; // Display label in Telugu
  phoneLength: number; // Typical national significant number length
  placeholder: string; // Sample placeholder
  voiceDescTe: string; // Spoken voice confirmation in Telugu
}

// Major / Popular country configurations with full Telugu translations
export const POPULAR_COUNTRIES: CountryPhoneConfig[] = [
  {
    iso: 'IN',
    name: 'India',
    nameTe: 'భారతదేశం',
    code: '+91',
    flag: '🇮🇳',
    labelTe: 'భారతదేశం (+91)',
    phoneLength: 10,
    placeholder: '98765 43210',
    voiceDescTe: 'భారతదేశం కోడ్ ప్లస్ తొంభై ఒకటి ఎంపికైంది.',
  },
  {
    iso: 'US',
    name: 'United States',
    nameTe: 'అమెరికా (USA)',
    code: '+1',
    flag: '🇺🇸',
    labelTe: 'అమెరికా (+1)',
    phoneLength: 10,
    placeholder: '555 123 4567',
    voiceDescTe: 'అమెరికా కోడ్ ప్లస్ ఒకటి ఎంపికైంది.',
  },
  {
    iso: 'GB',
    name: 'United Kingdom',
    nameTe: 'యునైటెడ్ కింగ్‌డమ్ (UK)',
    code: '+44',
    flag: '🇬🇧',
    labelTe: 'యుకే (+44)',
    phoneLength: 10,
    placeholder: '7911 123456',
    voiceDescTe: 'యునైటెడ్ కింగ్‌డమ్ కోడ్ ప్లస్ నలభై నాలుగు ఎంపికైంది.',
  },
  {
    iso: 'CA',
    name: 'Canada',
    nameTe: 'కెనడా',
    code: '+1',
    flag: '🇨🇦',
    labelTe: 'కెనడా (+1)',
    phoneLength: 10,
    placeholder: '416 555 0199',
    voiceDescTe: 'కెనడా కోడ్ ప్లస్ ఒకటి ఎంపికైంది.',
  },
  {
    iso: 'AU',
    name: 'Australia',
    nameTe: 'ఆస్ట్రేలియా',
    code: '+61',
    flag: '🇦🇺',
    labelTe: 'ఆస్ట్రేలియా (+61)',
    phoneLength: 9,
    placeholder: '412 345 678',
    voiceDescTe: 'ఆస్ట్రేలియా కోడ్ ప్లస్ అరవై ఒకటి ఎంపికైంది.',
  },
  {
    iso: 'AE',
    name: 'United Arab Emirates',
    nameTe: 'యూఏఈ (దుబాయ్)',
    code: '+971',
    flag: '🇦🇪',
    labelTe: 'యూఏఈ (+971)',
    phoneLength: 9,
    placeholder: '50 123 4567',
    voiceDescTe: 'యూఏఈ కోడ్ ప్లస్ తొమ్మిది వందల డెబ్బై ఒకటి ఎంపికైంది.',
  },
  {
    iso: 'SA',
    name: 'Saudi Arabia',
    nameTe: 'సౌదీ అరేబియా',
    code: '+966',
    flag: '🇸🇦',
    labelTe: 'సౌదీ అరేబియా (+966)',
    phoneLength: 9,
    placeholder: '50 123 4567',
    voiceDescTe: 'సౌదీ అరేబియా కోడ్ ప్లస్ తొమ్మిది వందల అరవై ఆరు ఎంపికైంది.',
  },
  {
    iso: 'KW',
    name: 'Kuwait',
    nameTe: 'కువైట్',
    code: '+965',
    flag: '🇰🇼',
    labelTe: 'కువైట్ (+965)',
    phoneLength: 8,
    placeholder: '9123 4567',
    voiceDescTe: 'కువైట్ కోడ్ ప్లస్ తొమ్మిది వందల అరవై ఐదు ఎంపికైంది.',
  },
  {
    iso: 'QA',
    name: 'Qatar',
    nameTe: 'ఖతార్',
    code: '+974',
    flag: '🇶🇦',
    labelTe: 'ఖతార్ (+974)',
    phoneLength: 8,
    placeholder: '3312 3456',
    voiceDescTe: 'ఖతార్ కోడ్ ప్లస్ తొమ్మిది వందల డెబ్బై నాలుగు ఎంపికైంది.',
  },
  {
    iso: 'OM',
    name: 'Oman',
    nameTe: 'ఒమన్',
    code: '+968',
    flag: '🇴🇲',
    labelTe: 'ఒమన్ (+968)',
    phoneLength: 8,
    placeholder: '9123 4567',
    voiceDescTe: 'ఒమన్ కోడ్ ప్లస్ తొమ్మిది వందల అరవై ఎనిమిది ఎంపికైంది.',
  },
  {
    iso: 'SG',
    name: 'Singapore',
    nameTe: 'సింగపూర్',
    code: '+65',
    flag: '🇸🇬',
    labelTe: 'సింగపూర్ (+65)',
    phoneLength: 8,
    placeholder: '8123 4567',
    voiceDescTe: 'సింగపూర్ కోడ్ ప్లస్ అరవై ఐదు ఎంపికైంది.',
  },
  {
    iso: 'MY',
    name: 'Malaysia',
    nameTe: 'మలేషియా',
    code: '+60',
    flag: '🇲🇾',
    labelTe: 'మలేషియా (+60)',
    phoneLength: 9,
    placeholder: '12 345 6789',
    voiceDescTe: 'మలేషియా కోడ్ ప్లస్ అరవై ఎంపికైంది.',
  },
  {
    iso: 'DE',
    name: 'Germany',
    nameTe: 'జర్మనీ',
    code: '+49',
    flag: '🇩🇪',
    labelTe: 'జర్మనీ (+49)',
    phoneLength: 10,
    placeholder: '151 23456789',
    voiceDescTe: 'జర్మనీ కోడ్ ప్లస్ నలభై తొమ్మిది ఎంపికైంది.',
  },
  {
    iso: 'FR',
    name: 'France',
    nameTe: 'ఫ్రాన్స్',
    code: '+33',
    flag: '🇫🇷',
    labelTe: 'ఫ్రాన్స్ (+33)',
    phoneLength: 9,
    placeholder: '6 12 34 56 78',
    voiceDescTe: 'ఫ్రాన్స్ కోడ్ ప్లస్ ముప్పై మూడు ఎంపికైంది.',
  },
  {
    iso: 'NZ',
    name: 'New Zealand',
    nameTe: 'న్యూజిలాండ్',
    code: '+64',
    flag: '🇳🇿',
    labelTe: 'న్యూజిలాండ్ (+64)',
    phoneLength: 9,
    placeholder: '21 123 4567',
    voiceDescTe: 'న్యూజిలాండ్ కోడ్ ప్లస్ అరవై నాలుగు ఎంపికైంది.',
  },
  {
    iso: 'ZA',
    name: 'South Africa',
    nameTe: 'దక్షిణాఫ్రికా',
    code: '+27',
    flag: '🇿🇦',
    labelTe: 'దక్షిణాఫ్రికా (+27)',
    phoneLength: 9,
    placeholder: '82 123 4567',
    voiceDescTe: 'దక్షిణాఫ్రికా కోడ్ ప్లస్ ఇరవై ఏడు ఎంపికైంది.',
  },
  {
    iso: 'JP',
    name: 'Japan',
    nameTe: 'జపాన్',
    code: '+81',
    flag: '🇯🇵',
    labelTe: 'జపాన్ (+81)',
    phoneLength: 10,
    placeholder: '90 1234 5678',
    voiceDescTe: 'జపాన్ కోడ్ ప్లస్ ఎనభై ఒకటి ఎంపికైంది.',
  },
  {
    iso: 'IT',
    name: 'Italy',
    nameTe: 'ఇటలీ',
    code: '+39',
    flag: '🇮🇹',
    labelTe: 'ఇటలీ (+39)',
    phoneLength: 10,
    placeholder: '312 345 6789',
    voiceDescTe: 'ఇటలీ కోడ్ ప్లస్ ముప్పై తొమ్మిది ఎంపికైంది.',
  },
  {
    iso: 'IE',
    name: 'Ireland',
    nameTe: 'ఐర్లాండ్',
    code: '+353',
    flag: '🇮🇪',
    labelTe: 'ఐర్లాండ్ (+353)',
    phoneLength: 9,
    placeholder: '85 123 4567',
    voiceDescTe: 'ఐర్లాండ్ కోడ్ ప్లస్ మూడు వందల యాభై మూడు ఎంపికైంది.',
  },
  {
    iso: 'CH',
    name: 'Switzerland',
    nameTe: 'స్విట్జర్లాండ్',
    code: '+41',
    flag: '🇨🇭',
    labelTe: 'స్విట్జర్లాండ్ (+41)',
    phoneLength: 9,
    placeholder: '78 123 45 67',
    voiceDescTe: 'స్విట్జర్లాండ్ కోడ్ ప్లస్ నలభై ఒకటి ఎంపికైంది.',
  },
  {
    iso: 'NL',
    name: 'Netherlands',
    nameTe: 'నెదర్లాండ్స్',
    code: '+31',
    flag: '🇳🇱',
    labelTe: 'నెదర్లాండ్స్ (+31)',
    phoneLength: 9,
    placeholder: '6 12345678',
    voiceDescTe: 'నెదర్లాండ్స్ కోడ్ ప్లస్ ముప్పై ఒకటి ఎంపికైంది.',
  },
  {
    iso: 'SE',
    name: 'Sweden',
    nameTe: 'స్వీడన్',
    code: '+46',
    flag: '🇸🇪',
    labelTe: 'స్వీడన్ (+46)',
    phoneLength: 9,
    placeholder: '70 123 45 67',
    voiceDescTe: 'స్వీడన్ కోడ్ ప్లస్ నలభై ఆరు ఎంపికైంది.',
  },
  {
    iso: 'BD',
    name: 'Bangladesh',
    nameTe: 'బంగ్లాదేశ్',
    code: '+880',
    flag: '🇧🇩',
    labelTe: 'బంగ్లాదేశ్ (+880)',
    phoneLength: 10,
    placeholder: '1712 345678',
    voiceDescTe: 'బంగ్లాదేశ్ కోడ్ ప్లస్ ఎనిమిది వందల ఎనభై ఎంపికైంది.',
  },
  {
    iso: 'LK',
    name: 'Sri Lanka',
    nameTe: 'శ్రీలంక',
    code: '+94',
    flag: '🇱🇰',
    labelTe: 'శ్రీలంక (+94)',
    phoneLength: 9,
    placeholder: '71 234 5678',
    voiceDescTe: 'శ్రీలంక కోడ్ ప్లస్ తొంభై నాలుగు ఎంపికైంది.',
  },
  {
    iso: 'NP',
    name: 'Nepal',
    nameTe: 'నేపాల్',
    code: '+977',
    flag: '🇳🇵',
    labelTe: 'నేపాల్ (+977)',
    phoneLength: 10,
    placeholder: '981 2345678',
    voiceDescTe: 'నేపాల్ కోడ్ ప్లస్ తొమ్మిది వందల డెబ్బై ఏడు ఎంపికైంది.',
  },
  {
    iso: 'PK',
    name: 'Pakistan',
    nameTe: 'పాకిస్తాన్',
    code: '+92',
    flag: '🇵🇰',
    labelTe: 'పాకిస్తాన్ (+92)',
    phoneLength: 10,
    placeholder: '301 2345678',
    voiceDescTe: 'పాకిస్తాన్ కోడ్ ప్లస్ తొంభై రెండు ఎంపికైంది.',
  },
  {
    iso: 'BH',
    name: 'Bahrain',
    nameTe: 'బహ్రెయిన్',
    code: '+973',
    flag: '🇧🇭',
    labelTe: 'బహ్రెయిన్ (+973)',
    phoneLength: 8,
    placeholder: '3912 3456',
    voiceDescTe: 'బహ్రెయిన్ కోడ్ ప్లస్ తొమ్మిది వందల డెబ్బై మూడు ఎంపికైంది.',
  },
  {
    iso: 'PH',
    name: 'Philippines',
    nameTe: 'ఫిలిప్పీన్స్',
    code: '+63',
    flag: '🇵🇭',
    labelTe: 'ఫిలిప్పీన్స్ (+63)',
    phoneLength: 10,
    placeholder: '917 123 4567',
    voiceDescTe: 'ఫిలిప్పీన్స్ కోడ్ ప్లస్ అరవై మూడు ఎంపికైంది.',
  },
];

// Complete ISO-to-DialCode map covering other world countries
const ALL_COUNTRY_DIAL_CODES: Record<string, { code: string; flag: string; name: string }> = {
  AD: { code: '+376', flag: '🇦🇩', name: 'Andorra' },
  AF: { code: '+93', flag: '🇦🇫', name: 'Afghanistan' },
  AL: { code: '+355', flag: '🇦🇱', name: 'Albania' },
  AM: { code: '+374', flag: '🇦🇲', name: 'Armenia' },
  AO: { code: '+244', flag: '🇦🇴', name: 'Angola' },
  AR: { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  AT: { code: '+43', flag: '🇦🇹', name: 'Austria' },
  AZ: { code: '+994', flag: '🇦🇿', name: 'Azerbaijan' },
  BA: { code: '+387', flag: '🇧🇦', name: 'Bosnia' },
  BB: { code: '+1246', flag: '🇧🇧', name: 'Barbados' },
  BE: { code: '+32', flag: '🇧🇪', name: 'Belgium' },
  BG: { code: '+359', flag: '🇧🇬', name: 'Bulgaria' },
  BM: { code: '+1441', flag: '🇧🇲', name: 'Bermuda' },
  BN: { code: '+673', flag: '🇧🇳', name: 'Brunei' },
  BO: { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
  BR: { code: '+55', flag: '🇧🇷', name: 'Brazil' },
  BS: { code: '+1242', flag: '🇧🇸', name: 'Bahamas' },
  BT: { code: '+975', flag: '🇧🇹', name: 'Bhutan' },
  BW: { code: '+267', flag: '🇧🇼', name: 'Botswana' },
  BY: { code: '+375', flag: '🇧🇾', name: 'Belarus' },
  BZ: { code: '+501', flag: '🇧🇿', name: 'Belize' },
  CL: { code: '+56', flag: '🇨🇱', name: 'Chile' },
  CM: { code: '+237', flag: '🇨🇲', name: 'Cameroon' },
  CN: { code: '+86', flag: '🇨🇳', name: 'China' },
  CO: { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  CR: { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  CY: { code: '+357', flag: '🇨🇾', name: 'Cyprus' },
  CZ: { code: '+420', flag: '🇨🇿', name: 'Czech Republic' },
  DK: { code: '+45', flag: '🇩🇰', name: 'Denmark' },
  DO: { code: '+1809', flag: '🇩🇴', name: 'Dominican Republic' },
  DZ: { code: '+213', flag: '🇩🇿', name: 'Algeria' },
  EC: { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  EE: { code: '+372', flag: '🇪🇪', name: 'Estonia' },
  EG: { code: '+20', flag: '🇪🇬', name: 'Egypt' },
  ES: { code: '+34', flag: '🇪🇸', name: 'Spain' },
  ET: { code: '+251', flag: '🇪🇹', name: 'Ethiopia' },
  FI: { code: '+358', flag: '🇫🇮', name: 'Finland' },
  FJ: { code: '+679', flag: '🇫🇯', name: 'Fiji' },
  GE: { code: '+995', flag: '🇬🇪', name: 'Georgia' },
  GH: { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  GR: { code: '+30', flag: '🇬🇷', name: 'Greece' },
  GT: { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
  HK: { code: '+852', flag: '🇭🇰', name: 'Hong Kong' },
  HR: { code: '+385', flag: '🇭🇷', name: 'Croatia' },
  HU: { code: '+36', flag: '🇭🇺', name: 'Hungary' },
  ID: { code: '+62', flag: '🇮🇩', name: 'Indonesia' },
  IL: { code: '+972', flag: '🇮🇱', name: 'Israel' },
  IQ: { code: '+964', flag: '🇮🇶', name: 'Iraq' },
  IR: { code: '+98', flag: '🇮🇷', name: 'Iran' },
  IS: { code: '+354', flag: '🇮🇸', name: 'Iceland' },
  JM: { code: '+1876', flag: '🇯🇲', name: 'Jamaica' },
  JO: { code: '+962', flag: '🇯🇴', name: 'Jordan' },
  KE: { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  KR: { code: '+82', flag: '🇰🇷', name: 'South Korea' },
  KZ: { code: '+7', flag: '🇰🇿', name: 'Kazakhstan' },
  LB: { code: '+961', flag: '🇱🇧', name: 'Lebanon' },
  LT: { code: '+370', flag: '🇱🇹', name: 'Lithuania' },
  LU: { code: '+352', flag: '🇱🇺', name: 'Luxembourg' },
  LV: { code: '+371', flag: '🇱🇻', name: 'Latvia' },
  MA: { code: '+212', flag: '🇲🇦', name: 'Morocco' },
  MD: { code: '+373', flag: '🇲🇩', name: 'Moldova' },
  MM: { code: '+95', flag: '🇲🇲', name: 'Myanmar' },
  MN: { code: '+976', flag: '🇲🇳', name: 'Mongolia' },
  MO: { code: '+853', flag: '🇲🇴', name: 'Macau' },
  MT: { code: '+356', flag: '🇲🇹', name: 'Malta' },
  MU: { code: '+230', flag: '🇲🇺', name: 'Mauritius' },
  MV: { code: '+960', flag: '🇲🇻', name: 'Maldives' },
  MX: { code: '+52', flag: '🇲🇽', name: 'Mexico' },
  NG: { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  NO: { code: '+47', flag: '🇳🇴', name: 'Norway' },
  PA: { code: '+507', flag: '🇵🇦', name: 'Panama' },
  PE: { code: '+51', flag: '🇵🇪', name: 'Peru' },
  PL: { code: '+48', flag: '🇵🇱', name: 'Poland' },
  PT: { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  RO: { code: '+40', flag: '🇷🇴', name: 'Romania' },
  RS: { code: '+381', flag: '🇷🇸', name: 'Serbia' },
  RU: { code: '+7', flag: '🇷🇺', name: 'Russia' },
  RW: { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
  SC: { code: '+248', flag: '🇸🇨', name: 'Seychelles' },
  SI: { code: '+386', flag: '🇸🇮', name: 'Slovenia' },
  SK: { code: '+421', flag: '🇸🇰', name: 'Slovakia' },
  TH: { code: '+66', flag: '🇹🇭', name: 'Thailand' },
  TN: { code: '+216', flag: '🇹🇳', name: 'Tunisia' },
  TR: { code: '+90', flag: '🇹🇷', name: 'Turkey' },
  TT: { code: '+1868', flag: '🇹🇹', name: 'Trinidad and Tobago' },
  TW: { code: '+886', flag: '🇹🇼', name: 'Taiwan' },
  TZ: { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  UA: { code: '+380', flag: '🇺🇦', name: 'Ukraine' },
  UG: { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  UY: { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
  UZ: { code: '+998', flag: '🇺🇿', name: 'Uzbekistan' },
  VE: { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
  VN: { code: '+84', flag: '🇻🇳', name: 'Vietnam' },
  ZW: { code: '+263', flag: '🇿🇼', name: 'Zimbabwe' },
};

export const DEFAULT_COUNTRY = POPULAR_COUNTRIES[0]; // India (+91)

export const ALL_COUNTRIES_LIST: CountryPhoneConfig[] = [
  ...POPULAR_COUNTRIES,
  ...Object.entries(ALL_COUNTRY_DIAL_CODES)
    .filter(([iso]) => !POPULAR_COUNTRIES.some((p) => p.iso === iso))
    .map(([iso, extra]) => ({
      iso,
      name: extra.name,
      nameTe: extra.name,
      code: extra.code,
      flag: extra.flag,
      labelTe: `${extra.name} (${extra.code})`,
      phoneLength: 10,
      placeholder: '1234567890',
      voiceDescTe: `${extra.name} కోడ్ ${extra.code} ఎంపికైంది.`,
    })),
];

/**
 * Maps ISO 3166-1 alpha-2 code to a CountryPhoneConfig.
 */
export function getCountryConfig(isoInput?: string | null): CountryPhoneConfig {
  if (!isoInput) return DEFAULT_COUNTRY;
  const iso = isoInput.trim().toUpperCase();

  // 1. Check popular list
  const foundPopular = POPULAR_COUNTRIES.find((c) => c.iso === iso);
  if (foundPopular) return foundPopular;

  // 2. Check full dictionary
  const extra = ALL_COUNTRY_DIAL_CODES[iso];
  if (extra) {
    return {
      iso,
      name: extra.name,
      nameTe: extra.name,
      code: extra.code,
      flag: extra.flag,
      labelTe: `${extra.name} (${extra.code})`,
      phoneLength: 10,
      placeholder: '1234567890',
      voiceDescTe: `${extra.name} కోడ్ ${extra.code} ఎంపికైంది.`,
    };
  }

  return DEFAULT_COUNTRY;
}

/**
 * Timezone-to-Country ISO lookup table for instant zero-latency detection
 */
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'America/Detroit': 'US',
  'America/Indiana/Indianapolis': 'US',
  'America/Boise': 'US',
  'Pacific/Honolulu': 'US',
  'US/Eastern': 'US',
  'US/Central': 'US',
  'US/Mountain': 'US',
  'US/Pacific': 'US',
  'Europe/London': 'GB',
  'Europe/Belfast': 'GB',
  'GB': 'GB',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Montreal': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Halifax': 'CA',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU',
  'Australia/Darwin': 'AU',
  'Australia/Hobart': 'AU',
  'Asia/Dubai': 'AE',
  'Asia/Abu_Dhabi': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Kuwait': 'KW',
  'Asia/Qatar': 'QA',
  'Asia/Muscat': 'OM',
  'Asia/Singapore': 'SG',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Manila': 'PH',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'Pacific/Auckland': 'NZ',
  'Africa/Johannesburg': 'ZA',
  'Asia/Tokyo': 'JP',
  'Asia/Shanghai': 'CN',
  'Asia/Dhaka': 'BD',
  'Asia/Colombo': 'LK',
  'Asia/Kathmandu': 'NP',
  'Asia/Karachi': 'PK',
  'Europe/Dublin': 'IE',
  'Europe/Zurich': 'CH',
  'Europe/Amsterdam': 'NL',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'Europe/Vienna': 'AT',
  'Europe/Brussels': 'BE',
  'Europe/Warsaw': 'PL',
  'Asia/Bahrain': 'BH',
};

/**
 * Resolves the user's country ISO synchronously from the browser environment
 */
export function getSynchronousDeviceCountry(): string {
  try {
    // 1. Check cached detection from GPS
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem('peddala_nestham_auto_country');
      if (cached && cached.length === 2) {
        return cached.toUpperCase();
      }
    }

    // 2. Check browser timezone
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && TIMEZONE_TO_COUNTRY[tz]) {
        return TIMEZONE_TO_COUNTRY[tz];
      }
    }

    // 3. Check navigator language region
    if (typeof navigator !== 'undefined' && navigator.language) {
      const parts = navigator.language.split('-');
      if (parts.length > 1 && parts[1].length === 2) {
        return parts[1].toUpperCase();
      }
    }
  } catch {
    // ignore
  }

  return 'IN';
}

/**
 * Intelligently identifies the country ISO from any existing saved phone number
 */
export function getCountryFromPhone(phone?: string | null): string {
  if (!phone) return getSynchronousDeviceCountry();
  const clean = phone.trim();

  // If starts with '+'
  if (clean.startsWith('+')) {
    // Try matching longest dial code prefixes first
    const sorted = [...POPULAR_COUNTRIES].sort((a, b) => b.code.length - a.code.length);
    for (const c of sorted) {
      if (clean.startsWith(c.code)) {
        return c.iso;
      }
    }
    // Check all extra countries
    for (const [iso, extra] of Object.entries(ALL_COUNTRY_DIAL_CODES)) {
      if (clean.startsWith(extra.code)) {
        return iso;
      }
    }
  }

  // Digits only
  const digits = clean.replace(/[^0-9]/g, '');
  if (digits.startsWith('91') && digits.length === 12) return 'IN';
  if (digits.startsWith('1') && digits.length === 11) return 'US';
  if (digits.startsWith('44') && digits.length >= 11) return 'GB';

  return getSynchronousDeviceCountry();
}

/**
 * Extracts only the raw digits of the phone number without country code
 */
export function extractRawPhoneDigits(phone?: string | null): string {
  if (!phone) return '';
  let clean = phone.trim();

  if (clean.startsWith('+')) {
    // Find matching country code prefix and strip
    const all = [...POPULAR_COUNTRIES, ...Object.entries(ALL_COUNTRY_DIAL_CODES).map(([iso, c]) => ({ iso, code: c.code }))];
    all.sort((a, b) => b.code.length - a.code.length);
    for (const c of all) {
      if (clean.startsWith(c.code)) {
        clean = clean.slice(c.code.length);
        break;
      }
    }
  }

  const digits = clean.replace(/[^0-9]/g, '');
  return digits;
}

/**
 * Composes a full international phone number with the country's calling code:
 * e.g. '9876543210' + 'IN' -> '+919876543210'
 *      '7911123456' + 'GB' -> '+447911123456'
 */
export function composeFullPhoneNumber(digits: string, countryIso: string): string {
  const cleanDigits = digits.replace(/[^0-9]/g, '');
  const config = getCountryConfig(countryIso);
  return `${config.code}${cleanDigits}`;
}

/**
 * Returns the exact dialable URI string for phone dialers:
 * e.g. '+919876543210', '+447911123456', '+15551234567'
 */
export function getDialableNumber(phone: string): string {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.startsWith('+')) {
    return '+' + clean.replace(/[^0-9]/g, '');
  }

  const digits = clean.replace(/[^0-9]/g, '');
  // Default to +91 if standard 10 digits
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return `+${digits}`;
}

/**
 * Formats a phone number for senior-friendly display with flag and readable spacing
 */
export function formatPhoneNumber(phone: string, showFlag: boolean = false): string {
  if (!phone) return '';
  const clean = phone.trim();
  const iso = getCountryFromPhone(clean);
  const config = getCountryConfig(iso);
  const rawDigits = extractRawPhoneDigits(clean);

  let formattedDigits = rawDigits;
  if (iso === 'IN' && rawDigits.length === 10) {
    formattedDigits = `${rawDigits.slice(0, 5)} ${rawDigits.slice(5)}`;
  } else if ((iso === 'US' || iso === 'CA') && rawDigits.length === 10) {
    formattedDigits = `${rawDigits.slice(0, 3)} ${rawDigits.slice(3, 6)} ${rawDigits.slice(6)}`;
  } else if (iso === 'GB' && rawDigits.length === 10) {
    formattedDigits = `${rawDigits.slice(0, 4)} ${rawDigits.slice(4)}`;
  } else if (rawDigits.length >= 8) {
    const mid = Math.floor(rawDigits.length / 2);
    formattedDigits = `${rawDigits.slice(0, mid)} ${rawDigits.slice(mid)}`;
  }

  const display = `${config.code} ${formattedDigits}`.trim();
  return showFlag ? `${config.flag} ${display}` : display;
}

/**
 * Formats a phone number for WhatsApp wa.me links (digits only with country code)
 */
export function getWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.startsWith('+')) {
    return clean.replace(/[^0-9]/g, '');
  }
  const digits = clean.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

// Type aliases for compatibility
export type PhoneCountry = string;
export const COUNTRY_PHONE_CONFIGS: Record<string, CountryPhoneConfig> = POPULAR_COUNTRIES.reduce(
  (acc, c) => ({ ...acc, [c.iso]: c }),
  {}
);
