/**
 * Direct iPhone Safari & Mobile-compatible links for ride services:
 * - Uber Auto (with GPS pickup coordinates)
 * - Ola Auto (with GPS pickup coordinates and category auto)
 * - Rapido Auto (official mobile app / web portal)
 *
 * Requirements:
 * - Direct iPhone-compatible links (pure anchor href without pop-up windows or timers)
 * - No Android Intent URLs
 * - No window.open pop-ups
 * - Pass current pickup GPS coordinates whenever supported
 */

export interface RideCoords {
  lat: number;
  lng: number;
  address?: string;
}

/**
 * Resolves safe coordinates ensuring pickup latitude and longitude are never left blank.
 * Defaults to currentCoords, or detected city coordinates (Vijayawada / Hyderabad).
 */
export function getSafeRideCoords(
  currentLat: number | null | undefined,
  currentLng: number | null | undefined,
  cityRegion?: string,
  currentAddress?: string
): RideCoords {
  const isLatValid = currentLat !== null && currentLat !== undefined && !isNaN(currentLat) && currentLat !== 0;
  const isLngValid = currentLng !== null && currentLng !== undefined && !isNaN(currentLng) && currentLng !== 0;

  let lat = isLatValid ? currentLat! : 16.5062;
  let lng = isLngValid ? currentLng! : 80.6480;

  if (!isLatValid || !isLngValid) {
    if (cityRegion === 'hyderabad') {
      lat = 17.3850;
      lng = 78.4867;
    } else {
      lat = 16.5062;
      lng = 80.6480;
    }
  }

  const cleanAddr = currentAddress && !currentAddress.includes('గుర్తిస్తున్నాం')
    ? currentAddress
    : 'Current Location';

  return { lat, lng, address: cleanAddr };
}

/**
 * Uber Auto official direct link:
 * Uses m.uber.com/ul/?action=setPickup with exact GPS pickup latitude and longitude.
 * Passes exact GPS coordinates without relying on broad locality or place name strings.
 * On iPhone Safari:
 * - If the Uber app is installed, iOS Universal Links natively launches the Uber app with pickup set.
 * - If not installed, opens the official m.uber.com mobile web booking page with pickup coordinates.
 */
export function getUberAutoUrl(coords: RideCoords): string {
  const { lat, lng } = coords;
  return `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${lat}&pickup[longitude]=${lng}`;
}

/**
 * Official Uber Universal Link for USA and India:
 * - Uses Uber's officially supported Universal Link: https://m.uber.com/ul/?action=setPickup
 * - Uses exact GPS latitude and longitude coordinates as the pickup location.
 * - Does NOT convert the GPS coordinates into a broad address (such as Vijayawada, Tadigadapa, Kanuru)
 *   before handing the location to Uber. The exact GPS latitude and longitude are the source of truth.
 * - If Uber itself converts the coordinates into its own readable address after opening, Uber resolves it normally.
 * - Automatically opens native Uber app if installed or falls back to Uber's mobile web booking page.
 * - Passes destination coordinates (dropoff[latitude], dropoff[longitude]) and address when entered.
 * - Officially supported parameters:
 *   - action=setPickup
 *   - pickup[latitude]=<lat>&pickup[longitude]=<lng>
 *   - dropoff[latitude]=<lat>&dropoff[longitude]=<lng>&dropoff[nickname]=<name>&dropoff[formatted_address]=<address>
 */
export function getUberRideUrl(
  coords: RideCoords,
  destination?: string,
  destCoords?: DestCoords | null
): string {
  const { lat, lng } = coords;
  
  // Exact GPS latitude and longitude as pickup location source of truth
  let url = `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${lat}&pickup[longitude]=${lng}`;

  if (destCoords && destCoords.lat && destCoords.lng) {
    const destName = encodeURIComponent(destCoords.name || destination?.trim() || 'Destination');
    url += `&dropoff[latitude]=${destCoords.lat}&dropoff[longitude]=${destCoords.lng}&dropoff[nickname]=${destName}&dropoff[formatted_address]=${destName}`;
  } else if (destination && destination.trim()) {
    const destName = encodeURIComponent(destination.trim());
    url += `&dropoff[nickname]=${destName}&dropoff[formatted_address]=${destName}`;
  }

  return url;
}

/**
 * Official Uber Custom Scheme Deep Link (uber://):
 * Opens native Uber app directly with exact GPS pickup coordinates pre-set.
 */
export function getUberAppSchemeUrl(
  coords: RideCoords,
  destination?: string,
  destCoords?: DestCoords | null
): string {
  const { lat, lng } = coords;
  
  let url = `uber://?action=setPickup&pickup[latitude]=${lat}&pickup[longitude]=${lng}`;

  if (destCoords && destCoords.lat && destCoords.lng) {
    const destName = encodeURIComponent(destCoords.name || destination?.trim() || 'Destination');
    url += `&dropoff[latitude]=${destCoords.lat}&dropoff[longitude]=${destCoords.lng}&dropoff[nickname]=${destName}&dropoff[formatted_address]=${destName}`;
  } else if (destination && destination.trim()) {
    const destName = encodeURIComponent(destination.trim());
    url += `&dropoff[nickname]=${destName}&dropoff[formatted_address]=${destName}`;
  }

  return url;
}

export interface DestCoords {
  lat: number;
  lng: number;
  name?: string;
}

/**
 * Ola Auto official direct link:
 * Passes the exact GPS latitude and longitude coordinates as the Ola pickup location
 * using Ola's officially supported deep-link parameters (lat, lng, pickup_lat, pickup_lng).
 * Does NOT pass any reverse-geocoded locality or address string as pickup_name/pickup_address,
 * so GPS latitude and longitude are the pure source of truth, and Ola can resolve and display
 * its own readable address normally from those coordinates.
 * When destination is provided:
 * - If destination coordinates (drop_lat, drop_lng) are available, passes drop_lat and drop_lng
 * - Also passes drop_name and drop_address as supported parameters
 */
export function getOlaAutoUrl(
  coords: RideCoords,
  destination?: string,
  destCoords?: DestCoords | null
): string {
  const { lat, lng } = coords;
  let url = `https://book.olacabs.com/?lat=${lat}&lng=${lng}&pickup_lat=${lat}&pickup_lng=${lng}&category=auto`;

  if (destCoords && destCoords.lat && destCoords.lng) {
    url += `&drop_lat=${destCoords.lat}&drop_lng=${destCoords.lng}`;
  }

  if (destination && destination.trim()) {
    const enc = encodeURIComponent(destination.trim());
    url += `&drop_name=${enc}&drop_address=${enc}&destination=${enc}`;
  }
  return url;
}

/**
 * Rapido Auto official direct link:
 * Direct iPhone-compatible Universal Link via Rapido's official OneLink service (m.rapido.cc).
 * Passes the phone's current GPS pickup latitude, longitude, and Auto category.
 * On iPhone Safari:
 * - If Rapido app is installed: Launches the official Rapido app directly with pickup coordinates and Auto category pre-set.
 * - If not installed: Directly opens Rapido's official iOS App Store page (id1198464606), avoiding generic landing pages or pop-up blocker issues.
 * - Uses no Android Intent, no pop-up windows, and passes live coordinates.
 */
export function getRapidoAutoUrl(coords: RideCoords): string {
  const { lat, lng } = coords;
  const afDp = encodeURIComponent(`rapido://open/?pickup_lat=${lat}&pickup_lng=${lng}&from_lat=${lat}&from_lng=${lng}&category=auto`);
  return `https://m.rapido.cc/Ewte?af_xp=qr&pid=seo_pages&c=SEO_Route_Pages&is_retargeting=true&af_reengagement_window=30d&af_dp=${afDp}&pickup_lat=${lat}&pickup_lng=${lng}&category=auto`;
}
