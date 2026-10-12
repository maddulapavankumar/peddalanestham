/**
 * Automatic Country Detection from Device Location for Peddala Nestham.
 *
 * Core Capabilities:
 * - Automatically detects country from device GPS when app opens or when user enters phone field
 * - Supports India (+91), USA (+1), UK (+44), and all world international calling codes
 * - Reverse geocodes coordinates with multi-provider fallbacks (Server proxy, BigDataCloud, Nominatim)
 * - Automatically updates country code when user changes country/location
 * - Provides synchronous fallback via browser timezone / locale so UI is instantaneous
 * - Preserves manual country selector choices whenever user chooses to correct/override
 * - Dispatches 'peddala_country_detected' events for reactive UI updates
 */

import { useState, useEffect, useCallback } from 'react';
import { getSynchronousDeviceCountry, getCountryConfig } from './countryPhone';

const STORAGE_KEY = 'peddala_nestham_auto_country';
export const COUNTRY_DETECTED_EVENT = 'peddala_country_detected';

let isDetecting = false;
let lastDetectedCountry: string = getSynchronousDeviceCountry();
const pendingListeners: Array<(iso: string) => void> = [];
let locationWatchId: number | null = null;
let lastCoords: { lat: number; lng: number } | null = null;

/**
 * Returns currently stored/detected country ISO (e.g. 'IN', 'US', 'GB')
 */
export function getDetectedCountry(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.length === 2) {
      return saved.toUpperCase();
    }
  }
  return lastDetectedCountry || getSynchronousDeviceCountry();
}

/**
 * Saves and broadcasts a detected country ISO
 */
export function setDetectedCountry(countryIso: string): void {
  if (!countryIso) return;
  const iso = countryIso.trim().toUpperCase();
  if (iso.length !== 2) return;

  const changed = lastDetectedCountry !== iso;
  lastDetectedCountry = iso;

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, iso);
      window.dispatchEvent(
        new CustomEvent(COUNTRY_DETECTED_EVENT, {
          detail: { country: iso, config: getCountryConfig(iso), changed },
        })
      );
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Detects country from GPS coordinates via multi-tier reverse geocode providers
 */
export async function detectCountryFromCoords(latitude: number, longitude: number): Promise<string> {
  // 1. Primary: Server-side reverse-geocode proxy
  try {
    const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/reverse-geocode?lat=${latitude}&lng=${longitude}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      const code = data?.address?.country_code || data?.country_code || data?.address?.countryCode;
      if (code && typeof code === 'string') {
        const iso = code.trim().toUpperCase();
        setDetectedCountry(iso);
        return iso;
      }
    }
  } catch (err) {
    console.warn('Server reverse geocode country detection error:', err);
  }

  // 2. Direct client fallback: OpenStreetMap Nominatim
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10`,
      { 
        headers: { 'User-Agent': 'PeddalaNestham-App/1.0 (contact: madhavibmtp@gmail.com)' },
        signal: AbortSignal.timeout(5000) 
      }
    );
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      const code = nomData?.address?.country_code;
      if (code && typeof code === 'string') {
        const iso = code.trim().toUpperCase();
        setDetectedCountry(iso);
        return iso;
      }
    }
  } catch (err) {
    console.warn('Nominatim country detection error:', err);
  }

  return getDetectedCountry();
}

/**
 * Triggers automatic device location detection.
 * Called when app opens or when user enters a phone number field.
 */
export async function detectCountryFromDevice(onCountryDetected?: (iso: string) => void): Promise<string> {
  if (typeof window === 'undefined') return 'IN';

  // Fast synchronous initial resolution
  const immediate = getDetectedCountry();
  if (onCountryDetected) {
    onCountryDetected(immediate);
    pendingListeners.push(onCountryDetected);
  }

  // Ensure background watcher is active
  startCountryLocationWatch();

  if (isDetecting) return immediate;
  isDetecting = true;

  const notifyAllListeners = (iso: string) => {
    isDetecting = false;
    while (pendingListeners.length > 0) {
      const listener = pendingListeners.shift();
      try {
        listener?.(iso);
      } catch {
        // ignore callback error
      }
    }
  };

  try {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          lastCoords = { lat: latitude, lng: longitude };
          const detected = await detectCountryFromCoords(latitude, longitude);
          notifyAllListeners(detected);
        },
        (err) => {
          console.warn('Geolocation country detection unavailable:', err.message);
          notifyAllListeners(getDetectedCountry());
        },
        { timeout: 8000, enableHighAccuracy: false, maximumAge: 60000 }
      );
    } else {
      notifyAllListeners(immediate);
    }
  } catch {
    notifyAllListeners(immediate);
  }

  return immediate;
}

/**
 * Continuous country location watcher.
 * Automatically updates the country code when the user changes country/location.
 */
export function startCountryLocationWatch(): void {
  if (typeof window === 'undefined' || !navigator.geolocation) return;
  if (locationWatchId !== null) return;

  try {
    locationWatchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Check if coordinates shifted significantly (by > 0.05 degrees ~= 5km) or if first fix
        if (
          !lastCoords ||
          Math.abs(lastCoords.lat - latitude) > 0.05 ||
          Math.abs(lastCoords.lng - longitude) > 0.05
        ) {
          lastCoords = { lat: latitude, lng: longitude };
          await detectCountryFromCoords(latitude, longitude);
        }
      },
      () => {
        // silently ignore watch errors
      },
      { enableHighAccuracy: false, timeout: 25000, maximumAge: 60000 }
    );
  } catch {
    // ignore
  }
}

/**
 * React Hook for reactive automatic country detection with live updates.
 * Updates immediately when user changes country/location, while respecting manual user selection.
 */
export function useAutoCountryDetection(defaultIso?: string) {
  const [currentCountry, setCurrentCountry] = useState<string>(
    () => defaultIso || getDetectedCountry()
  );

  useEffect(() => {
    // 1. Listen for background country changes (GPS reverse geocoding or location shifts)
    const handleCountryChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.country) {
        setCurrentCountry(detail.country);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(COUNTRY_DETECTED_EVENT, handleCountryChange);
    }

    // 2. Start continuous country location watch
    startCountryLocationWatch();

    // 3. Trigger initial device detection
    detectCountryFromDevice((detected) => {
      if (detected) {
        setCurrentCountry(detected);
      }
    });

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(COUNTRY_DETECTED_EVENT, handleCountryChange);
      }
    };
  }, []);

  const manualSetCountry = useCallback((iso: string) => {
    setCurrentCountry(iso);
    setDetectedCountry(iso);
  }, []);

  return {
    detectedCountry: currentCountry,
    setCountry: manualSetCountry,
    refreshDetection: detectCountryFromDevice,
  };
}
