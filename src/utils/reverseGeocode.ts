/**
 * Reverse Geocoding Utility for Peddala Nestham
 * Resolves GPS coordinates into complete, accurate, human-readable addresses
 * with building/house number, street/road, locality, city, district, state, and pincode.
 * Strictly filters out generic administrative labels like "Vijayawada Urban",
 * "Guntur Urban", "Nampally mandal", etc.
 */

export function isGenericAdministrativeArea(text: string): boolean {
  if (!text) return true;
  const s = text.trim();
  if (!s) return true;

  // Single word admin tokens
  if (/^(urban|rural|పట్టణ|గ్రామీణ|mandal|మండలం|tehsil|taluk|district|division|cantonment)$/i.test(s)) return true;

  // Contains mandal, tehsil, taluk, or revenue division in Telugu or English
  if (/\b(mandal|మండలం|tehsil|taluk|revenue division|revenue mandal)\b/i.test(s)) return true;

  // Suffix checks (e.g. "Vijayawada Urban", "Guntur Rural", "Nampally mandal")
  if (/^(.*)\s+(urban|rural|mandal|tehsil|taluk|division|revenue mandal)$/i.test(s)) return true;

  // Parenthesized checks (e.g. "Vijayawada (Urban)", "Guntur (Rural)")
  if (/^(.*)\s*[\(\[](urban|rural|mandal|tehsil|taluk)[\)\]]$/i.test(s)) return true;

  // Telugu suffix checks
  if (/^(.*)\s+(పట్టణ|గ్రామీణ|మండలం|తాలూకా|అర్బన్|రూరల్)$/i.test(s)) return true;
  if (/^(.*)\s*[\(\[](పట్టణ|గ్రామీణ|మండలం|తాలూకా)[\)\]]$/i.test(s)) return true;

  // Administrative subdivisions (wards, circles, zones, municipal corporations)
  if (/^ward\s+\d+.*$/i.test(s)) return true;
  if (/^circle\s+\d+.*$/i.test(s)) return true;
  if (/^zone\s+\d+.*$/i.test(s)) return true;
  if (/greater\s+.*municipal\s+corporation/i.test(s)) return true;
  if (/municipal\s+corporation/i.test(s)) return true;
  if (/municipality/i.test(s)) return true;

  return false;
}

/**
 * Strips generic administrative tokens out of comma-separated address strings
 */
export function cleanAddressString(rawAddress: string): string {
  if (!rawAddress) return '';
  const parts = rawAddress.split(',').map((p) => p.trim()).filter(Boolean);
  const filtered = parts.filter((part) => {
    if (!part) return false;
    // Exclude country names
    if (/^(india|భారత దేశం|భారతదేశం|bharat|united states|usa)$/i.test(part)) return false;
    // Exclude generic admin labels
    if (isGenericAdministrativeArea(part)) return false;
    return true;
  });

  const unique: string[] = [];
  for (const item of filtered) {
    if (!unique.some((u) => u.toLowerCase() === item.toLowerCase())) {
      unique.push(item);
    }
  }

  return unique.join(', ');
}

const teEnEntityPairs: [string, string][] = [
  ['కానూరు', 'kanuru'],
  ['తాడిగడప', 'tadigadapa'],
  ['విజయవాడ', 'vijayawada'],
  ['హైదరాబాదు', 'hyderabad'],
  ['గుంటూరు', 'guntur'],
  ['పెనమలూరు', 'penamaluru'],
  ['పోరంకి', 'poranki'],
  ['కృష్ణా', 'krishna'],
  ['ఆంధ్ర ప్రదేశ్', 'andhra pradesh'],
  ['పటమట', 'patamata'],
];

export function isSameEntity(a: string, b: string): boolean {
  if (!a || !b) return false;
  const aL = a.trim().toLowerCase();
  const bL = b.trim().toLowerCase();
  if (aL === bL) return true;
  for (const [te, en] of teEnEntityPairs) {
    if ((aL.includes(te) && bL.includes(en)) || (aL.includes(en) && bL.includes(te))) {
      return true;
    }
  }
  return false;
}

export interface StructuredAddressComponents {
  placeName?: string;
  houseNumber?: string;
  road?: string;
  locality?: string;
  city?: string;
  district?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
}

/**
 * Builds a complete readable address from reverse geocoding payloads (Nominatim / Photon / Server)
 * Example output:
 * "Sidaratha Xerox Shop, Siddartha College Road, Patamata Lanka, Vijayawada, Andhra Pradesh - 520001"
 */
export function buildCompleteReadableAddress(
  data: any,
  latitude: number,
  longitude: number
): string {
  if (!data) {
    return `అక్షాంశం: ${latitude.toFixed(5)}, రేఖాంశం: ${longitude.toFixed(5)}`;
  }

  // If server already provided pre-formatted clean complete display_name with maximum verified precision
  if (data.isFormattedByServer && data.display_name && typeof data.display_name === 'string') {
    return data.display_name;
  }

  const addr = data.address || {};
  const settlementAddr = data.settlementAddress || {};
  const photonProps = data.features?.[0]?.properties || null;

  // 1. Primary place / apartment / building / landmark / shop / hospital / clinic
  const placeCandidates = [
    photonProps?.name,
    data.name,
    addr.amenity,
    addr.building,
    addr.apartment,
    addr.apartments,
    addr.flats,
    addr.commercial,
    addr.retail,
    addr.complex,
    addr.hotel,
    addr.shop,
    addr.office,
    addr.hospital,
    addr.clinic,
    addr.pharmacy,
    addr.tourism,
    addr.leisure,
    addr.housename && !/^\d+$/.test(addr.housename) ? addr.housename : null,
  ];
  let placeName = '';
  for (const p of placeCandidates) {
    if (p && typeof p === 'string' && !isGenericAdministrativeArea(p)) {
      placeName = p.trim();
      break;
    }
  }

  // 2. Door / House number
  const houseNumber = (
    addr.house_number ||
    (addr.housename && /^\d+/.test(addr.housename) ? addr.housename : '') ||
    photonProps?.housenumber ||
    ''
  ).trim();

  // 3. Street / Road
  const roadCandidates = [
    photonProps?.street,
    addr.road,
    addr.street,
    addr.pedestrian,
    addr.footway,
    addr.path,
  ];
  let road = '';
  for (const r of roadCandidates) {
    if (r && typeof r === 'string' && !isGenericAdministrativeArea(r)) {
      road = r.trim();
      break;
    }
  }

  // Avoid repeating placeName if it matches road
  if (
    placeName &&
    road &&
    (placeName.toLowerCase() === road.toLowerCase() ||
      road.toLowerCase().includes(placeName.toLowerCase()))
  ) {
    placeName = '';
  }

  let streetPart = '';
  if (houseNumber && road) {
    streetPart = `${houseNumber}, ${road}`;
  } else if (houseNumber) {
    streetPart = houseNumber;
  } else if (road) {
    streetPart = road;
  }

  // 4. Locality / Specific Settlement (village, neighbourhood, suburb, quarter, hamlet)
  // Specific settlement level always takes precedence over broad town/mandal
  const specificSettlementCandidates = [
    addr.neighbourhood,
    addr.suburb,
    addr.village,
    settlementAddr.village,
    settlementAddr.suburb,
    settlementAddr.neighbourhood,
    photonProps?.locality,
    addr.quarter,
    addr.hamlet,
    settlementAddr.hamlet,
    addr.residential,
  ];

  const validLocalities: string[] = [];
  for (const cand of specificSettlementCandidates) {
    if (!cand || typeof cand !== 'string') continue;
    const trimmed = cand.trim();
    if (!trimmed || isGenericAdministrativeArea(trimmed)) continue;
    const lower = trimmed.toLowerCase();
    if (
      !validLocalities.some((vl) => isSameEntity(vl, trimmed)) &&
      lower !== road.toLowerCase() &&
      lower !== placeName.toLowerCase()
    ) {
      validLocalities.push(trimmed);
    }
  }

  // 5. City / Town
  // Prefer actual major city (e.g. Vijayawada, Hyderabad).
  // If a broad nearby town (e.g. Tadigadapa) is returned by addr.town,
  // only use it if NO specific settlement was identified. If we already have a more
  // precise locality/village (like Kanuru), do NOT let broad nearby town override it!
  const majorCity =
    (addr.city && !isGenericAdministrativeArea(addr.city) ? addr.city : '') ||
    (settlementAddr.city && !isGenericAdministrativeArea(settlementAddr.city) ? settlementAddr.city : '') ||
    (photonProps?.city && !isGenericAdministrativeArea(photonProps.city) ? photonProps.city : '') ||
    '';

  let city = '';
  if (majorCity && !validLocalities.some((vl) => isSameEntity(vl, majorCity))) {
    city = majorCity;
  } else if (validLocalities.length === 0) {
    const broadTown =
      (addr.town && !isGenericAdministrativeArea(addr.town) ? addr.town : '') ||
      (settlementAddr.town && !isGenericAdministrativeArea(settlementAddr.town) ? settlementAddr.town : '') ||
      (addr.municipality && !isGenericAdministrativeArea(addr.municipality) ? addr.municipality : '') ||
      '';
    city = broadTown;
  }

  // 6. District & State
  const districtCandidate =
    (addr.state_district && !isGenericAdministrativeArea(addr.state_district) ? addr.state_district : '') ||
    (settlementAddr.state_district && !isGenericAdministrativeArea(settlementAddr.state_district) ? settlementAddr.state_district : '') ||
    (addr.district && !isGenericAdministrativeArea(addr.district) ? addr.district : '') ||
    (photonProps?.district && !isGenericAdministrativeArea(photonProps.district) ? photonProps.district : '') ||
    '';

  const district =
    districtCandidate &&
    !isSameEntity(districtCandidate, city) &&
    !validLocalities.some((vl) => isSameEntity(vl, districtCandidate))
      ? districtCandidate
      : '';

  const state = (addr.state || settlementAddr.state || photonProps?.state || '').trim();
  const postcode = (addr.postcode || settlementAddr.postcode || photonProps?.postcode || '').trim();

  // Combine items into clean address
  const items = [
    placeName,
    streetPart,
    ...validLocalities,
    city,
    district,
    state,
  ].filter(Boolean);

  const uniqueParts: string[] = [];
  for (const item of items) {
    const trimmed = String(item).trim();
    if (!trimmed) continue;
    if (/^(india|భారత దేశం|భారతదేశం|bharat|united states|usa)$/i.test(trimmed)) continue;
    if (!uniqueParts.some((u) => isSameEntity(u, trimmed))) {
      uniqueParts.push(trimmed);
    }
  }

  let finalAddress = uniqueParts.join(', ');
  if (postcode && !finalAddress.includes(postcode)) {
    finalAddress += ` - ${postcode}`;
  }

  // Fallback if somehow still empty: clean raw display_name
  if (!finalAddress || isGenericAdministrativeArea(finalAddress)) {
    const rawDisplay = data.display_name || photonProps?.display_name || '';
    if (rawDisplay) {
      const cleaned = cleanAddressString(rawDisplay);
      if (cleaned) return cleaned;
    }
    return `అక్షాంశం: ${latitude.toFixed(5)}, రేఖాంశం: ${longitude.toFixed(5)}`;
  }

  return finalAddress;
}

/**
 * Dedicated multi-provider client-side reverse geocoding resolver
 */
export async function fetchCompleteReadableAddress(
  latitude: number,
  longitude: number
): Promise<{ address: string; countryCode?: string }> {
  // 1. Primary: Server-side API proxy (which merges Nominatim zoom 18 + zoom 14 + Photon)
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`);
    if (res.ok) {
      const data = await res.json();
      const detectedIso = data?.address?.country_code;
      const formatted = buildCompleteReadableAddress(data, latitude, longitude);
      if (formatted && !formatted.startsWith('అక్షాంశం:')) {
        return {
          address: formatted,
          countryCode: typeof detectedIso === 'string' ? detectedIso.toUpperCase() : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('Server reverse-geocode error, falling back to direct providers:', err);
  }

  // 2. Direct client fallback: OpenStreetMap Nominatim (zoom 18 & 14) + Photon in parallel
  try {
    const [nom18Res, nom14Res, photonRes] = await Promise.allSettled([
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=te,en`,
        { signal: AbortSignal.timeout(6000) }
      ).then((r) => (r.ok ? r.json() : null)),
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1&accept-language=te,en`,
        { signal: AbortSignal.timeout(5000) }
      ).then((r) => (r.ok ? r.json() : null)),
      fetch(
        `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}&lang=en`,
        { signal: AbortSignal.timeout(5000) }
      ).then((r) => (r.ok ? r.json() : null)),
    ]);

    const nom18Data = nom18Res.status === 'fulfilled' ? nom18Res.value : null;
    const nom14Data = nom14Res.status === 'fulfilled' ? nom14Res.value : null;
    const phoData = photonRes.status === 'fulfilled' ? photonRes.value : null;

    if (nom18Data || nom14Data || phoData) {
      const merged = {
        ...(nom18Data || nom14Data || {}),
        settlementAddress: nom14Data?.address || {},
        features: phoData?.features || [],
      };
      const detectedIso = nom18Data?.address?.country_code || nom14Data?.address?.country_code;
      const formatted = buildCompleteReadableAddress(merged, latitude, longitude);
      if (formatted && !formatted.startsWith('అక్షాంశం:')) {
        return {
          address: formatted,
          countryCode: typeof detectedIso === 'string' ? detectedIso.toUpperCase() : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('Direct reverse geocode fallback failed:', err);
  }

  // 3. Fallback: Exact GPS coordinates
  return {
    address: `అక్షాంశం: ${latitude.toFixed(5)}, రేఖాంశం: ${longitude.toFixed(5)}`,
  };
}
