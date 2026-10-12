import { isGenericAdministrativeArea } from './reverseGeocode';

export type CityRegion = 'vijayawada' | 'hyderabad' | 'other' | 'detecting';

export interface ResolvedCityInfo {
  region: CityRegion;
  cityDisplayNameTe: string;
  localAreaTe: string;
  stateTe: string;
}

// Helpers to extract city and area from reverse-geocoded response
export function extractLocalArea(addressText: string, rawAddressObj?: any): string {
  if (rawAddressObj?.address) {
    const a = rawAddressObj.address;
    const candidates = [a.suburb, a.neighbourhood, a.quarter, a.residential, a.subdistrict, a.road];
    for (const cand of candidates) {
      if (cand && typeof cand === 'string' && !isGenericAdministrativeArea(cand)) {
        return cand.trim();
      }
    }
  }
  if (addressText && !addressText.includes('గుర్తిస్తున్నాం') && !addressText.startsWith('అక్షాంశం')) {
    const parts = addressText.split(',').map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part && !isGenericAdministrativeArea(part)) {
        return part;
      }
    }
  }
  return '';
}

export function extractCityName(addressText: string, rawAddressObj?: any): string {
  if (rawAddressObj?.address) {
    const a = rawAddressObj.address;
    const candidates = [a.city, a.town, a.municipality, a.village, a.city_district];
    for (const cand of candidates) {
      if (cand && typeof cand === 'string' && !isGenericAdministrativeArea(cand)) {
        return cand.trim();
      }
    }
  }
  if (addressText && !addressText.includes('గుర్తిస్తున్నాం') && !addressText.startsWith('అక్షాంశం')) {
    const parts = addressText.split(',').map((s) => s.trim()).filter(Boolean);
    // Find the first part that is a city and not generic administrative
    for (let i = 1; i < parts.length; i++) {
      if (parts[i] && !isGenericAdministrativeArea(parts[i])) {
        return parts[i];
      }
    }
    if (parts[0] && !isGenericAdministrativeArea(parts[0])) {
      return parts[0];
    }
  }
  return '';
}

// Detect region from GPS coordinates and reverse-geocode address text
export function detectCityRegion(
  latitude: number | null,
  longitude: number | null,
  addressText: string,
  rawAddressObj?: any
): ResolvedCityInfo {
  const isGenericLoading = 
    !addressText || 
    addressText.includes('గుర్తిస్తున్నాం') || 
    addressText === 'స్థానం గుర్తింపబడలేదు' ||
    addressText === 'నా ప్రస్తుత ప్రాంతం' ||
    addressText.includes('అనుమతి అవసరం');

  if ((latitude === null || longitude === null) && isGenericLoading) {
    return {
      region: 'detecting',
      cityDisplayNameTe: 'గుర్తిస్తున్నాం...',
      localAreaTe: '',
      stateTe: '',
    };
  }

  // 1. Check real GPS coordinates first
  if (latitude !== null && longitude !== null) {
    // Vijayawada bounding box: roughly lat 16.35 - 16.65, lng 80.45 - 80.80
    if (latitude >= 16.35 && latitude <= 16.65 && longitude >= 80.45 && longitude <= 80.80) {
      const area = extractLocalArea(addressText, rawAddressObj) || '';
      return {
        region: 'vijayawada',
        cityDisplayNameTe: 'విజయవాడ',
        localAreaTe: area,
        stateTe: 'ఆంధ్ర ప్రదేశ్',
      };
    }

    // Hyderabad bounding box: roughly lat 17.15 - 17.65, lng 78.15 - 78.75
    if (latitude >= 17.15 && latitude <= 17.65 && longitude >= 78.15 && longitude <= 78.75) {
      const area = extractLocalArea(addressText, rawAddressObj) || '';
      return {
        region: 'hyderabad',
        cityDisplayNameTe: 'హైదరాబాద్',
        localAreaTe: area,
        stateTe: 'తెలంగాణ',
      };
    }
  }

  // 2. Check dynamic address text / raw address object
  const combined = `${addressText} ${JSON.stringify(rawAddressObj || '')}`.toLowerCase();

  const isVijayawada = /(vijayawada|విజయవాడ|బెజవాడ|patamata|పటమట|benz circle|బెంజ్ సర్కిల్|gunadala|గుణదల|bhavanipuram|భవానిపురం|ntr|krishna|కృష్ణా)/i.test(combined);
  if (isVijayawada) {
    const area = extractLocalArea(addressText, rawAddressObj) || '';
    return {
      region: 'vijayawada',
      cityDisplayNameTe: 'విజయవాడ',
      localAreaTe: area,
      stateTe: 'ఆంధ్ర ప్రదేశ్',
    };
  }

  const isHyderabad = /(hyderabad|హైదరాబా|secunderabad|సికింద్రాబాద్|cyberabad|సైబరాబాద్|ghmc|koti|కోఠి|ameerpet|అమీర్‌పేట్|banjara|బంజారా|jubilee|జూబ్లీ|dilsukhnagar|దిల్సుఖ్‌నగర్|kukatpally|కూకట్‌పల్లి|gachibowli|గచ్చిబౌలి|charminar|చార్మినార్|rangareddy|రంగారెడ్డి|medchal|మేడ్చల్)/i.test(combined);
  if (isHyderabad) {
    const area = extractLocalArea(addressText, rawAddressObj) || '';
    return {
      region: 'hyderabad',
      cityDisplayNameTe: 'హైదరాబాద్',
      localAreaTe: area,
      stateTe: 'తెలంగాణ',
    };
  }

  // 3. Any other town / city dynamically derived from GPS
  const detectedCity = extractCityName(addressText, rawAddressObj) || 'స్థానిక ప్రాంతం';
  const detectedArea = extractLocalArea(addressText, rawAddressObj) || '';

  return {
    region: 'other',
    cityDisplayNameTe: detectedCity,
    localAreaTe: detectedArea,
    stateTe: '',
  };
}
