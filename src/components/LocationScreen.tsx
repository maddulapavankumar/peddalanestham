import React, { useState, useEffect, useRef } from 'react';
import { HomeButton } from './HomeButton';
import { RealLocationMap } from './RealLocationMap';
import { 
  MapPin, 
  MapPinOff,
  RefreshCw, 
  Share2, 
  Navigation, 
  Volume2, 
  Home, 
  Copy, 
  Check, 
  MessageCircle, 
  Compass, 
  AlertTriangle,
  Radio,
  LocateFixed,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { playTapSound, speakTelugu, stopSpeaking } from '../utils/audio';
import { CountryCode } from './CountrySelector';
import { buildCompleteReadableAddress, fetchCompleteReadableAddress } from '../utils/reverseGeocode';
import { isInsideIframePreview, isIosDevice } from '../utils/previewHelper';
import { useLanguage } from '../utils/i18n';

interface LocationScreenProps {
  onGoHome: () => void;
  isLargeFont: boolean;
  address: string;
  lat: number | null;
  lng: number | null;
  accuracy?: number | null;
  locError?: string | null;
  locErrorCode?: number | 'UNSUPPORTED' | null;
  isLoading: boolean;
  onRefreshLocation: (silent?: boolean, forceGeocode?: boolean) => Promise<{ lat: number; lng: number; address: string } | null> | void;
  selectedCountry?: CountryCode;
}

export const LocationScreen: React.FC<LocationScreenProps> = ({
  onGoHome,
  isLargeFont,
  address,
  lat,
  lng,
  accuracy,
  locError,
  locErrorCode,
  isLoading,
  onRefreshLocation,
  selectedCountry = 'IN',
}) => {
  const { language, t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [homeAddress, setHomeAddress] = useState<string>(() => {
    const saved = localStorage.getItem('peddala_nestham_home_addr');
    if (saved && !saved.startsWith('మా స్వగృహం')) return saved;
    return '';
  });
  const [isDetectingHome, setIsDetectingHome] = useState(false);
  const [detectedHomeAddress, setDetectedHomeAddress] = useState<string | null>(null);
  const [homeGpsError, setHomeGpsError] = useState<string | null>(null);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [isEditingHome, setIsEditingHome] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const hasSpokenVoiceRef = useRef(false);

  // Strictly verify device's real GPS coordinates - only true when genuine numbers exist
  const hasRealLocation = 
    lat !== null && 
    lng !== null && 
    typeof lat === 'number' && 
    typeof lng === 'number' && 
    !isNaN(lat) && 
    !isNaN(lng) && 
    (lat !== 0 || lng !== 0) &&
    locErrorCode === null;
  const isAddressReady = Boolean(
    hasRealLocation &&
    address && 
    address !== 'GPS location unavailable' &&
    address !== 'స్థానాన్ని గుర్తిస్తున్నాం...' && 
    address !== 'మీ పరికరం నుండి నిజమైన జీపీఎస్ స్థానాన్ని గుర్తిస్తున్నాం...' &&
    address !== 'స్థానం గుర్తింపబడలేదు' &&
    address !== 'లొకేషన్ అనుమతి అవసరం' &&
    address !== 'జీపీఎస్ సిగ్నల్ అందడం లేదు' &&
    address !== 'లొకేషన్ సమయం మించింది' &&
    address !== 'లొకేషన్ సదుపాయం అందుబాటులో లేదు' &&
    address !== 'మీ లొకేషన్ను గుర్తించడానికి GPS ఆన్ చేయండి'
  );

  const googleMapsUrl = hasRealLocation ? `https://www.google.com/maps?q=${lat},${lng}` : '';

  // Copy app link so user can test standalone in iPhone Safari
  const handleCopyAppLink = async () => {
    playTapSound();
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      if (url && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setIsLinkCopied(true);
        speakTelugu('యాప్ లింక్ కాపీ చేయబడింది! మీ Safari బ్రౌజర్‌లో పేస్ట్ చేసి తెరవండి.');
        setTimeout(() => setIsLinkCopied(false), 3000);
      }
    } catch {
      speakTelugu('లింక్ కాపీ చేయడంలో సమస్య వచ్చింది.');
    }
  };

  // Request fresh real-time GPS location on initial mount only if not yet fetched and not already loading or errored
  useEffect(() => {
    if (lat === null && !isLoading && locErrorCode === null) {
      onRefreshLocation(false, true);
    }
  }, [lat, isLoading, locErrorCode, onRefreshLocation]);

  // Automatically watch and update location when user moves from place to place without requiring "తాజా చేయండి"
  // ONLY runs when real GPS is active! Does NOT poll repeatedly when permission is denied.
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    if (!hasRealLocation) return;

    const autoUpdateInterval = setInterval(() => {
      onRefreshLocation(true, false);
    }, 5000);

    return () => clearInterval(autoUpdateInterval);
  }, [hasRealLocation, onRefreshLocation]);

  // Construct dynamic voice guidance based on the user's actual real GPS location
  const getVoiceGuidanceScript = () => {
    if (hasRealLocation && isAddressReady) {
      return `మీ ప్రస్తుత చిరునామా: ${address}. కింద ఉన్న పెద్ద ఆకుపచ్చ బటన్ నొక్కి వాట్సాప్ లేదా ఎస్ఎమ్ఎస్ ద్వారా మీ లొకేషన్ను కుటుంబ సభ్యులకు షేర్ చేయవచ్చు.`;
    } else if (isLoading) {
      return 'మీ పరికరం నుండి నిజమైన జీపీఎస్ లొకేషన్ గుర్తిస్తున్నాం. దయచేసి కొన్ని సెకన్లు వేచి ఉండండి.';
    } else {
      return 'మీ లొకేషన్ను గుర్తించడానికి దయచేసి మీ ఫోన్‌లో GPS ఆన్ చేయండి.';
    }
  };

  // Automatic voice guidance on mount or when address is resolved
  useEffect(() => {
    if (!hasSpokenVoiceRef.current && isAddressReady) {
      hasSpokenVoiceRef.current = true;
      speakTelugu(getVoiceGuidanceScript(), { delayMs: 400 });
    }

    return () => {
      stopSpeaking();
    };
  }, [isAddressReady, address]);

  // Obtains a fresh GPS position at that exact moment (maximumAge: 0) and resolves verified address
  const fetchFreshGpsAndAddress = async (): Promise<{ lat: number; lng: number; address: string }> => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      try {
        const fresh = await new Promise<{ lat: number; lng: number; address: string } | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const freshLat = pos.coords.latitude;
              const freshLng = pos.coords.longitude;
              if (
                typeof freshLat === 'number' &&
                typeof freshLng === 'number' &&
                !isNaN(freshLat) &&
                !isNaN(freshLng) &&
                (freshLat !== 0 || freshLng !== 0)
              ) {
                try {
                  const res = await fetchCompleteReadableAddress(freshLat, freshLng);
                  resolve({
                    lat: freshLat,
                    lng: freshLng,
                    address: res.address,
                  });
                } catch {
                  resolve({
                    lat: freshLat,
                    lng: freshLng,
                    address: `అక్షాంశం: ${freshLat.toFixed(5)}, రేఖాంశం: ${freshLng.toFixed(5)}`,
                  });
                }
              } else {
                resolve(null);
              }
            },
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
          );
        });

        if (fresh && fresh.lat && fresh.lng) {
          // Trigger global location update so live map and cards reflect this fresh position
          onRefreshLocation(true, true);
          return fresh;
        }
      } catch {
        // Fallback to current props
      }
    }

    if (lat && lng && !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      return {
        lat,
        lng,
        address: address || 'GPS location unavailable',
      };
    }

    return {
      lat: 0,
      lng: 0,
      address: address || 'GPS location unavailable',
    };
  };

  const handleShareLocation = async () => {
    playTapSound();

    speakTelugu('ప్రస్తుత లైవ్ జీపీఎస్ లొకేషన్ తనిఖీ చేసి షేర్ చేస్తున్నాం...');
    const fresh = await fetchFreshGpsAndAddress();
    const liveLat = fresh.lat || lat;
    const liveLng = fresh.lng || lng;
    const liveAddress = (fresh.address && !fresh.address.startsWith('స్థానాన్ని') && !fresh.address.startsWith('GPS'))
      ? fresh.address
      : address;

    if (!liveLat || !liveLng) {
      speakTelugu('దయచేసి ముందుగా మీ ఫోన్‌లో జీపీఎస్ లొకేషన్ అనుమతి ఇవ్వండి. లొకేషన్ వచ్చిన వెంటనే షేర్ చేయవచ్చు.');
      onRefreshLocation();
      return;
    }

    const liveMapsUrl = `https://www.google.com/maps?q=${liveLat},${liveLng}`;
    const shareText = `నమస్కారం! ఇది నా ప్రస్తుత లొకేషన్:\nచిరునామా: ${liveAddress}\nకోఆర్డినేట్స్: ${liveLat.toFixed(5)}, ${liveLng.toFixed(5)}\nమ్యాప్ లింక్: ${liveMapsUrl}`;

    if (navigator.share) {
      try {
        speakTelugu('లొకేషన్ షేర్ చేస్తున్నారు');
        await navigator.share({
          title: 'నా ప్రస్తుత లొకేషన్ - పెద్దల నేస్తం',
          text: shareText,
          url: liveMapsUrl,
        });
        return;
      } catch {
        // Fallback to WhatsApp if share canceled or not permitted
      }
    }

    // Direct WhatsApp share fallback
    const text = encodeURIComponent(shareText);
    speakTelugu('వాట్సాప్‌లో లొకేషన్ పంపుతున్నారు');
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareWhatsApp = async () => {
    playTapSound();
    speakTelugu('ప్రస్తుత లైవ్ జీపీఎస్ లొకేషన్ వాట్సాప్‌లో పంపుతున్నాం...');
    const fresh = await fetchFreshGpsAndAddress();
    const liveLat = fresh.lat || lat;
    const liveLng = fresh.lng || lng;
    const liveAddress = (fresh.address && !fresh.address.startsWith('స్థానాన్ని') && !fresh.address.startsWith('GPS'))
      ? fresh.address
      : address;

    if (!liveLat || !liveLng) {
      speakTelugu('లొకేషన్ ఇంకా రాలేదు. దయచేసి వేచి ఉండండి లేదా తాజా చేయండి.');
      onRefreshLocation();
      return;
    }

    const liveMapsUrl = `https://www.google.com/maps?q=${liveLat},${liveLng}`;
    const text = encodeURIComponent(
      `నమస్కారం! ఇది నా ప్రస్తుత లొకేషన్:\nచిరునామా: ${liveAddress}\nకోఆర్డినేట్స్: ${liveLat.toFixed(5)}, ${liveLng.toFixed(5)}\nమ్యాప్ లింక్: ${liveMapsUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCopyLocation = async () => {
    playTapSound();
    const fresh = await fetchFreshGpsAndAddress();
    const liveLat = fresh.lat || lat;
    const liveLng = fresh.lng || lng;
    const liveAddress = (fresh.address && !fresh.address.startsWith('స్థానాన్ని') && !fresh.address.startsWith('GPS'))
      ? fresh.address
      : address;

    if (!liveLat || !liveLng) {
      speakTelugu('లొకేషన్ ఇంకా రాలేదు.');
      onRefreshLocation();
      return;
    }

    const liveMapsUrl = `https://www.google.com/maps?q=${liveLat},${liveLng}`;
    const locText = `${liveAddress}\nకోఆర్డినేట్స్: ${liveLat.toFixed(5)}, ${liveLng.toFixed(5)}\nమ్యాప్: ${liveMapsUrl}`;
    navigator.clipboard?.writeText(locText);
    setCopied(true);
    speakTelugu('లొకేషన్ మరియు చిరునామా కాపీ చేయబడింది');
    setTimeout(() => setCopied(false), 2500);
  };

  // Helper to format detailed house/street/locality/city/district/state/postcode address
  const formatDetailedRooftopAddress = (data: any, latitude: number, longitude: number): string => {
    return buildCompleteReadableAddress(data, latitude, longitude);
  };

  const handleDetectHomeLocation = () => {
    playTapSound();
    setHomeGpsError(null);
    setIsDetectingHome(true);
    speakTelugu('ప్రస్తుత లొకేషన్ నుండి ఇంటి చిరునామాను గుర్తిస్తున్నాం.');

    const performReverseGeocode = async (latitude: number, longitude: number) => {
      try {
        const { address: detailed } = await fetchCompleteReadableAddress(latitude, longitude);
        if (detailed && !detailed.startsWith('అక్షాంశం:')) {
          setDetectedHomeAddress(detailed);
          setIsDetectingHome(false);
          speakTelugu('మీ ప్రస్తుత లొకేషన్ చిరునామా గుర్తించబడింది. సేవ్ చేయడానికి సేవ్ బటన్ నొక్కండి.');
          return;
        }
      } catch (e) {
        console.warn('Reverse geocode error:', e);
      }

      // Fallback: If address already provided by parent
      if (address && !address.startsWith('స్థానాన్ని') && !address.startsWith('GPS') && !address.startsWith('మీ పరికరం')) {
        setDetectedHomeAddress(address);
        setIsDetectingHome(false);
        speakTelugu('మీ ప్రస్తుత లొకేషన్ చిరునామా గుర్తించబడింది.');
        return;
      }

      setIsDetectingHome(false);
      setHomeGpsError('లొకేషన్ చిరునామాను పొందడం సాధ్యం కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.');
    };

    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (
            typeof pos.coords.latitude === 'number' &&
            typeof pos.coords.longitude === 'number' &&
            !isNaN(pos.coords.latitude) &&
            !isNaN(pos.coords.longitude) &&
            (pos.coords.latitude !== 0 || pos.coords.longitude !== 0)
          ) {
            performReverseGeocode(pos.coords.latitude, pos.coords.longitude);
          } else {
            setIsDetectingHome(false);
            setHomeGpsError('GPS సిగ్నల్ అందడం లేదు (Signal Unavailable). దయచేసి మళ్లీ ప్రయత్నించండి.');
          }
        },
        (err) => {
          setIsDetectingHome(false);
          if (err.code === 1) {
            setHomeGpsError('లొకేషన్ అనుమతి నిరాకరించబడింది (Location Permission Denied). iPhone Settings ➔ Safari ➔ Location: Allow చేయండి.');
            speakTelugu('లొకేషన్ అనుమతి నిరాకరించబడింది. దయచేసి సెట్టింగ్స్‌లో అనుమతి ఇవ్వండి.');
          } else if (err.code === 2) {
            setHomeGpsError('పరికరంలో GPS సిగ్నల్ అందడం లేదు (GPS Signal Unavailable). దయచేసి ఆరుబయట లేదా కిటికీ దగ్గర మళ్లీ ప్రయత్నించండి.');
            speakTelugu('GPS సిగ్నల్ అందడం లేదు. దయచేసి మళ్లీ ప్రయత్నించండి.');
          } else if (err.code === 3) {
            setHomeGpsError('లొకేషన్ సమయం మించింది (GPS Timeout). దయచేసి మళ్లీ ప్రయత్నించండి.');
            speakTelugu('లొకేషన్ సమయం మించింది. దయచేసి మళ్లీ ప్రయత్నించండి.');
          } else {
            setHomeGpsError('లొకేషన్ అందుబాటులో లేదు. దయచేసి మళ్లీ ప్రయత్నించండి.');
          }
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    } else {
      setIsDetectingHome(false);
      setHomeGpsError('ఈ పరికరంలో GPS లొకేషన్ సదుపాయం అందుబాటులో లేదు.');
    }
  };

  const handleConfirmSaveDetectedHome = () => {
    if (!detectedHomeAddress) return;
    playTapSound();
    localStorage.setItem('peddala_nestham_home_addr', detectedHomeAddress);
    setHomeAddress(detectedHomeAddress);
    setDetectedHomeAddress(null);
    setIsSavedSuccess(true);
    speakTelugu('ఇంటి చిరునామా విజయవంతంగా సేవ్ చేయబడింది.');
    setTimeout(() => setIsSavedSuccess(false), 4000);
  };

  const handleSaveHome = () => {
    if (!homeAddress) return;
    localStorage.setItem('peddala_nestham_home_addr', homeAddress);
    setIsEditingHome(false);
    playTapSound();
    speakTelugu('ఇంటి చిరునామా భద్రపరచబడింది');
  };

  const handleVoiceGuide = () => {
    playTapSound();
    speakTelugu(getVoiceGuidanceScript(), { delayMs: 150 });
  };

  return (
    <div className="p-3 sm:p-5 max-w-2xl mx-auto space-y-4 pb-12">
      {/* Top Bar with Home and Speech */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
        </div>
        <button
          id="location-voice-guide-btn"
          onClick={handleVoiceGuide}
          type="button"
          className="p-3.5 bg-blue-100 text-blue-950 hover:bg-blue-200 rounded-2xl border-2 border-blue-300 font-bold active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          title="సహాయక స్వరం (వాయిస్ గైడ్)"
          aria-label="సహాయక స్వరం వినండి"
        >
          <Volume2 className="w-7 h-7 text-blue-900" />
          <span className="hidden sm:inline text-xs font-black">వాయిస్ సహాయం</span>
        </button>
      </div>

      {/* Screen Title Card */}
      <div 
        id="location-title-card"
        className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-4 sm:p-5 rounded-2xl shadow-lg border-3 border-blue-800 flex items-center gap-4"
      >
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-white/30">
          <LocateFixed className="w-10 h-10 text-white animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-black text-white mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>{t('locMapTitle')}</span>
          </div>
          <h2 className={`font-black tracking-tight ${isLargeFont ? 'text-3xl' : 'text-2xl'}`}>
            📍 {t('locTitle')}
          </h2>
          <p className="font-semibold text-blue-100 text-xs sm:text-sm mt-0.5">
            {t('homeCardLocationSub')}
          </p>
        </div>
      </div>

      {/* 1. CURRENT ADDRESS CLEARLY DISPLAYED */}
      <div 
        id="current-address-card"
        className="bg-white p-5 rounded-3xl border-3 border-blue-300 shadow-md space-y-3"
      >
        <div className="flex items-center justify-between border-b pb-2.5 border-stone-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-900 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
              {t('locAddressTitle')}
            </span>
          </div>
          <button
            id="btn-refresh-location"
            type="button"
            onClick={() => {
              playTapSound();
              speakTelugu('GPS Refresh');
              onRefreshLocation(false, true);
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 active:scale-95 rounded-xl text-blue-900 font-black text-xs sm:text-sm border border-blue-300 transition-colors cursor-pointer"
            title={t('locRefresh')}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isLoading ? t('statusLoading') : t('locRefresh')}</span>
          </button>
        </div>

        {/* Dynamic Display Based on Real GPS State */}
        {hasRealLocation ? (
          /* State A: Real GPS Location Acquired */
          <div className="bg-blue-50/90 p-4 sm:p-5 rounded-2xl border-2 border-blue-300 space-y-3">
            {/* Real GPS Confirmed Success Banner */}
            <div className="flex items-center justify-between gap-2 bg-emerald-100/90 text-emerald-950 border border-emerald-300 px-3 py-1.5 rounded-xl">
              <span className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{language === 'en' ? 'GPS Permission Granted • Location Detected Successfully ✅' : language === 'hi' ? 'जीपीएस अनुमति मिली • स्थान सफलतापूर्वक पहचाना गया ✅' : language === 'ta' ? 'ஜிபிஎஸ் அனுமதி கிடைத்தது • இடம் கண்டறியப்பட்டது ✅' : 'GPS అనుమతి లభించింది • లొకేషన్ విజయవంతంగా గుర్తించబడింది ✅'}</span>
              </span>
              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-[11px] font-black">
                {language === 'en' ? 'Real GPS' : language === 'hi' ? 'वास्तविक जीपीएस' : language === 'ta' ? 'உண்மையான ஜிபிஎஸ்' : 'నిజమైన GPS (Real)'}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                <MapPin className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  id="location-address-text"
                  className={`font-black text-stone-950 leading-relaxed break-words ${
                    isLargeFont ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                  }`}
                >
                  {address}
                </p>
                
                {/* Coordinates and accuracy bar */}
                <div className="flex items-center gap-2 flex-wrap mt-3 pt-2.5 border-t border-blue-200 text-xs sm:text-sm font-bold text-stone-700">
                  <span className="bg-white/80 px-2 py-0.5 rounded-md border border-blue-200">
                    📍 {language === 'en' ? 'Coordinates:' : language === 'hi' ? 'निर्देशांक:' : language === 'ta' ? 'ஆயத்தொலைவுகள்:' : 'కోఆర్డినేట్స్:'} {lat.toFixed(5)}, {lng.toFixed(5)}
                  </span>
                  {accuracy && (
                    <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-300">
                      🎯 {language === 'en' ? 'Accuracy:' : language === 'hi' ? 'सटीकता:' : language === 'ta' ? 'துல்லியம்:' : 'ఖచ్చితత్వం:'} ~{Math.round(accuracy)} {language === 'en' ? 'meters' : language === 'hi' ? 'मीटर' : language === 'ta' ? 'மீட்டர்' : 'మీటర్లు'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          /* State B: Actively Requesting Real GPS Signal */
          <div className="bg-amber-50/90 p-5 rounded-2xl border-2 border-amber-300 text-center space-y-3">
            <div className="w-14 h-14 mx-auto bg-amber-100 text-amber-800 rounded-full flex items-center justify-center border-2 border-amber-300">
              <Radio className="w-8 h-8 animate-pulse text-amber-700" />
            </div>
            <div>
              <h4 className="text-lg sm:text-xl font-black text-amber-950">
                🛰️ {language === 'en' ? 'Detecting real GPS location from your device...' : language === 'hi' ? 'आपके डिवाइस से वास्तविक जीपीएस स्थान पहचाना जा रहा है...' : language === 'ta' ? 'உங்கள் சாதனத்திலிருந்து உண்மையான ஜிபிஎஸ் கண்டறியப்படுகிறது...' : 'మీ పరికరం నుండి నిజమైన జీపీఎస్ స్థానాన్ని గుర్తిస్తున్నాం...'}
              </h4>
              <p className="text-xs sm:text-sm font-bold text-amber-800 mt-1">
                {language === 'en' ? 'Please wait a few seconds. Gathering satellite GPS signal from your phone.' : language === 'hi' ? 'कृपया कुछ सेकंड प्रतीक्षा करें। आपके फोन से सैटेलाइट जीपीएस सिग्नल प्राप्त कर रहे हैं।' : language === 'ta' ? 'தயவுசெய்து சில நொடிகள் காத்திருக்கவும். ஜிபிஎஸ் சிக்னல் சேகரிக்கப்படுகிறது.' : 'దయచేసి కొన్ని సెకన్లు వేచి ఉండండి. మీ ఫోన్ నుండి శాటిలైట్ GPS సిగ్నల్ సేకరిస్తున్నాం.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-black text-amber-900 bg-white/70 py-2 px-3 rounded-xl border border-amber-200 max-w-sm mx-auto">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-700" />
              <span>{language === 'en' ? 'Scanning GPS signal...' : language === 'hi' ? 'जीपीएस सिग्नल स्कैन हो रहा है...' : language === 'ta' ? 'ஜிபிஎஸ் சிக்னல் ஸ்கேன் செய்யப்படுகிறது...' : 'జీపీఎస్ సిగ్నల్ స్కాన్ అవుతోంది...'}</span>
            </div>
          </div>
        ) : (
          /* State C: GPS or Location Permission Off / Error Occurred */
          <div className="bg-amber-50/90 p-5 sm:p-6 rounded-2xl border-2 border-amber-300 space-y-4 text-center">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center border-2 shadow-xs ${
              locErrorCode === 1 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              {locErrorCode === 1 ? (
                <AlertTriangle className="w-8 h-8 text-red-600" />
              ) : locErrorCode === 2 ? (
                <Radio className="w-8 h-8 text-amber-700" />
              ) : (
                <MapPinOff className="w-8 h-8 text-amber-700" />
              )}
            </div>
            
            {/* Clear, specific reason for GPS error */}
            <div className="space-y-1.5 text-left bg-white/80 p-3.5 sm:p-4 rounded-xl border border-amber-200">
              <h4 className={`font-black ${locErrorCode === 1 ? 'text-red-950' : 'text-amber-950'} ${isLargeFont ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`}>
                {locErrorCode === 1
                  ? isInsideIframePreview()
                    ? (language === 'en' ? '⚠️ Location Blocked (Google AI Studio Preview)' : language === 'hi' ? '⚠️ लोकेशन अवरुद्ध (Preview सीमा)' : language === 'ta' ? '⚠️ இருப்பிடம் தடுக்கப்பட்டது (Preview வரம்பு)' : '⚠️ లొకేషన్ అనుమతి ఆపబడింది (Google AI Studio Preview పరిమితి)')
                    : (language === 'en' ? '❌ Location Permission Denied' : language === 'hi' ? '❌ लोकेशन अनुमति अस्वीकृत' : language === 'ta' ? '❌ இருப்பிட அனுமதி மறுக்கப்பட்டது' : '❌ లొకేషన్ అనుమతి నిరాకరించబడింది (Location Permission Denied)')
                  : locErrorCode === 2
                  ? (language === 'en' ? '📡 GPS Signal Unavailable' : language === 'hi' ? '📡 जीपीएस सिग्नल अनुपलब्ध' : language === 'ta' ? '📡 ஜிபிஎஸ் சிக்னல் கிடைக்கவில்லை' : '📡 GPS సిగ్నల్ అందడం లేదు (Signal Unavailable)')
                  : locErrorCode === 3
                  ? (language === 'en' ? '⏱️ Location Timed Out' : language === 'hi' ? '⏱️ लोकेशन टाइमआउट' : language === 'ta' ? '⏱️ இருப்பிட நேரம் முடிந்தது' : '⏱️ లొకేషన్ సమయం మించింది (GPS Timeout)')
                  : locErrorCode === 'UNSUPPORTED'
                  ? (language === 'en' ? '⚠️ GPS Not Supported on Device' : language === 'hi' ? '⚠️ इस डिवाइस पर जीपीएस समर्थित नहीं' : language === 'ta' ? '⚠️ இந்த சாதனத்தில் ஜிபிஎஸ் ஆதரிக்கப்படவில்லை' : '⚠️ ఈ పరికరంలో GPS సదుపాయం లేదు (Unsupported)')
                  : (language === 'en' ? 'Turn on GPS to detect location' : language === 'hi' ? 'स्थान जानने के लिए जीपीएस चालू करें' : language === 'ta' ? 'இருப்பிடத்தைக் கண்டறிய ஜிபிஎஸ் ஆன் செய்க' : 'మీ లొకేషన్ను గుర్తించడానికి GPS ఆన్ చేయండి')}
              </h4>
              <p className="text-xs sm:text-sm font-bold text-stone-800 leading-relaxed">
                <span className="font-black text-stone-900">
                  {language === 'en' ? 'Reason: ' : language === 'hi' ? 'कारण: ' : language === 'ta' ? 'காரணம்: ' : 'స్పష్టమైన కారణం: '}
                </span>
                {locErrorCode === 1
                  ? isInsideIframePreview()
                    ? (language === 'en' ? 'You are viewing inside the Google AI Studio Preview iframe. Browser security blocks GPS permission prompts inside embedded iframes. Open in a standalone tab below to get real GPS.' : language === 'hi' ? 'आप Google AI Studio Preview में हैं। सुरक्षा प्रतिबंधों के कारण अंतर्निहित iframe में GPS ब्लॉक है। वास्तविक GPS के लिए नीचे दिए गए बटन से नए टैब में खोलें।' : language === 'ta' ? 'நீங்கள் Google AI Studio Preview இல் பார்க்கிறீர்கள். பாதுகாப்பு விதிகளால் iframe இல் GPS தடுக்கப்பட்டுள்ளது. உண்மையான GPS பெற கீழே உள்ள பட்டனை அழுத்தவும்.' : 'మీరు Google AI Studio Preview (ఐఫ్రేమ్) లో చూస్తున్నారు. బ్రౌజర్ సెక్యూరిటీ నిబంధనల ప్రకారం (Iframe Permissions Policy), ఐఫ్రేమ్ లోపల నేరుగా GPS అనుమతి అడగడం నిరోధించబడింది. ఇది మీ ఫోన్ లేదా యాప్ లోపం కాదు.')
                    : (language === 'en' ? 'Location permission was denied in your browser or Safari. Browser permission is required to detect your real GPS coordinates.' : language === 'hi' ? 'ब्राउज़र या सफारी में लोकेशन अनुमति अस्वीकृत कर दी गई थी। वास्तविक जीपीएस जानने हेतु अनुमति आवश्यक है।' : language === 'ta' ? 'உங்கள் உலாவியில் இருப்பிட அனுமதி மறுக்கப்பட்டுள்ளது. உண்மையான ஜிபிஎஸ் பெற அனுமதி தேவை.' : 'మీ బ్రౌజర్ లేదా iPhone Safari లో లొకేషన్ అనుమతి నిరాకరించబడింది. నిజమైన GPS స్థానం గుర్తించడానికి బ్రౌజర్‌లో అనుమతి అవసరం. దయచేసి కింద ఇచ్చిన సులువైన మార్గదర్శకత్వాన్ని అనుసరించండి.')
                  : locErrorCode === 2
                  ? (language === 'en' ? 'GPS or satellite signal could not be received. Please enable Location/GPS on your device and retry near a window or outdoors.' : language === 'hi' ? 'उपग्रह जीपीएस सिग्नल नहीं मिल रहा है। कृपया डिवाइस में लोकेशन ऑन करें और खुली जगह पर पुनः प्रयास करें।' : language === 'ta' ? 'ஜிபிஎஸ் சிக்னல் கிடைக்கவில்லை. உங்கள் போனில் இருப்பிடத்தை இயக்கி மீண்டும் முயற்சிக்கவும்.' : 'మీ ఫోన్ నుండి శాటిలైట్ లేదా నెట్‌వర్క్ జీపీఎస్ సిగ్నల్ అందడం లేదు. దయచేసి ఫోన్‌లో Location/GPS ఆన్ చేసి, కిటికీ దగ్గర లేదా ఆరుబయట మళ్లీ ప్రయత్నించండి.')
                  : locErrorCode === 3
                  ? (language === 'en' ? 'GPS lookup took longer than usual. Please tap the Retry button below.' : language === 'hi' ? 'जीपीएस जानकारी प्राप्त करने में अधिक समय लगा। कृपया पुनः प्रयास बटन दबाएं।' : language === 'ta' ? 'ஜிபிஎஸ் பெற அதிக நேரம் பிடித்தது. கீழே உள்ள மீண்டும் முயற்சி பட்டனை அழுத்தவும்.' : 'మీ పరికరం నుండి GPS సమాచారం రావడానికి ఎక్కువ సమయం పట్టింది. దయచేసి కింద ఉన్న మళ్లీ ప్రయత్నించండి బటన్ నొక్కండి.')
                  : locErrorCode === 'UNSUPPORTED'
                  ? (language === 'en' ? 'Geolocation is not supported in this browser. Please open in Chrome or Safari.' : language === 'hi' ? 'इस ब्राउज़र में जीपीएस सुविधा समर्थित नहीं है। कृपया सफारी या क्रोम में खोलें।' : language === 'ta' ? 'இந்த உலாவியில் ஜிபிஎஸ் வசதி இல்லை. சஃபாரி அல்லது குரோமில் திறக்கவும்.' : 'ఈ బ్రౌజర్‌లో లేదా పరికరంలో GPS లొకేషన్ సదుపాయం పనిచేయడం లేదు. దయచేసి Safari లేదా Chrome బ్రౌజర్‌లో తెరవండి.')
                  : (language === 'en' ? 'Please grant location permission to find your exact address and coordinates.' : language === 'hi' ? 'सटीक पता और निर्देशांक जानने के लिए कृपया लोकेशन अनुमति दें।' : language === 'ta' ? 'துல்லியமான இருப்பிடத்தைக் கண்டறிய அனுமதியை வழங்கவும்.' : 'మీ ఫోన్ యొక్క ఖచ్చితమైన GPS స్థానం మరియు చిరునామా తెలుసుకోవడానికి దయచేసి బ్రౌజర్‌లో లొకేషన్ అనుమతించండి.')}
              </p>
            </div>

            {/* 1. Dedicated Recognition & Solution for Google AI Studio Preview Environment */}
            {isInsideIframePreview() && (
              <div className="bg-blue-50 border-2 border-blue-400 rounded-2xl p-4 sm:p-5 text-left space-y-3.5 shadow-xs">
                <div className="flex items-center gap-2 font-black text-blue-950 text-base sm:text-lg border-b border-blue-200 pb-2">
                  <span className="text-2xl">🔍</span>
                  <span>{language === 'en' ? 'Google AI Studio Preview Detected:' : language === 'hi' ? 'Google AI Studio Preview पहचाना गया:' : language === 'ta' ? 'Google AI Studio Preview கண்டறியப்பட்டது:' : 'Google AI Studio Preview సమస్య గుర్తింపు (Preview Detected):'}</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-blue-950 leading-relaxed">
                  {language === 'en' 
                    ? 'You are viewing inside the preview iframe. Open in standalone full tab to allow real GPS sensor prompt.' 
                    : language === 'hi' 
                    ? 'आप पूर्वावलोकन विंडो में हैं। वास्तविक जीपीएस प्राप्त करने के लिए नीचे दिए गए बटन से नए टैब में खोलें।' 
                    : language === 'ta' 
                    ? 'நீங்கள் முன்னோட்ட சாளரத்தில் உள்ளீர்கள். உண்மையான ஜிபிஎஸ் பெற புதிய தாவலில் திறக்கவும்.' 
                    : 'మీరు ప్రస్తుతం Google AI Studio Preview (ఐఫ్రేమ్) విండోలో ఉన్నారు. బ్రౌజర్ భద్రతా నిబంధనల వల్ల ఐఫ్రేమ్ ప్రివ్యూలో బ్రౌజర్ లొకేషన్ పాప్-అప్‌ను బ్లాక్ చేసింది.'}
                </p>
                <div className="bg-white/95 p-3.5 rounded-xl border border-blue-300 text-xs sm:text-sm font-bold text-blue-900 space-y-1.5">
                  <p className="font-black text-blue-950 flex items-center gap-1.5">
                    <span>💡</span>
                    <span>{language === 'en' ? 'Quick Solution:' : language === 'hi' ? 'त्वरित समाधान:' : language === 'ta' ? 'எளிய தீர்வு:' : 'సులువైన తక్షణ పరిష్కారం (Quick Solution):'}</span>
                  </p>
                  <p className="text-stone-700 leading-relaxed">
                    {language === 'en' 
                      ? 'Open this web app directly in a new tab or in Safari / Chrome on your phone to get 100% accurate live GPS location!' 
                      : language === 'hi' 
                      ? 'इस ऐप को सीधे एक नए टैब में या अपने फोन के सफारी / क्रोम ब्राउज़र में खोलें, वास्तविक जीपीएस तुरंत दिखाई देगा!' 
                      : language === 'ta' 
                      ? 'இந்த செயலியை புதிய தாவலில் அல்லது உங்கள் போன் பிரவுசரில் திறந்தால் துல்லியமான ஜிபிஎஸ் உடனே கிடைக்கும்!' 
                      : 'ఈ యాప్‌ను పూర్తి స్క్రీన్ కొత్త ట్యాబ్‌లో లేదా మీ iPhone Safari లో నేరుగా తెరిస్తే, బ్రౌజర్ నిజమైన GPS పర్మిషన్ పాప్-అప్ అడుగుతుంది మరియు మీ అసలైన లొకేషన్ ఖచ్చితంగా కనిపిస్తుంది!'}
                  </p>
                </div>
                <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                  <a
                    href={typeof window !== 'undefined' ? window.location.href : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all border border-blue-700 text-center"
                  >
                    <ExternalLink className="w-5 h-5 shrink-0" />
                    <span>{language === 'en' ? '🌐 Open Standalone for GPS' : language === 'hi' ? '🌐 नए टैब में खोलें और GPS पाएं' : language === 'ta' ? '🌐 புதிய தாவலில் திறந்து GPS பெறவும்' : '🌐 కొత్త ట్యాబ్‌లో ఓపెన్ చేసి GPS పొందండి (Open Standalone)'}</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyAppLink}
                    className="py-3.5 px-4 bg-white hover:bg-stone-50 active:scale-95 text-blue-950 font-black rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all border-2 border-blue-400"
                  >
                    {isLinkCopied ? <Check className="w-5 h-5 text-emerald-600 shrink-0" /> : <Copy className="w-5 h-5 text-blue-700 shrink-0" />}
                    <span>{isLinkCopied 
                      ? (language === 'en' ? '✅ Link Copied!' : language === 'hi' ? '✅ लिंक कॉपी हो गया!' : language === 'ta' ? '✅ இணைப்பு நகலெடுக்கப்பட்டது!' : '✅ లింక్ కాపీ చేయబడింది!') 
                      : (language === 'en' ? '📋 Copy App Link' : language === 'hi' ? '📋 लिंक कॉपी करें' : language === 'ta' ? '📋 இணைப்பை நகலெடு' : '📋 Safari కోసం లింక్ కాపీ చేయండి')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. Comprehensive Guide for iPhone / Safari on How to Enable Location */}
            <div className="bg-amber-50/95 border-2 border-amber-400 rounded-2xl p-4 sm:p-5 text-left space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2.5 text-amber-950 font-black text-base sm:text-lg border-b border-amber-200 pb-2.5">
                <span className="text-2xl">📱</span>
                <span>{language === 'en' ? 'How to Enable Location in Safari / Browser:' : language === 'hi' ? 'सफारी / ब्राउज़र में लोकेशन कैसे सक्षम करें:' : language === 'ta' ? 'சஃபாரி / பிரவுசரில் இருப்பிடத்தை இயக்குவது எப்படி:' : 'iPhone (Safari) లో లొకేషన్ అనుమతించడానికి సరైన మార్గదర్శకత్వం:'}</span>
              </div>

              <div className="space-y-2.5 text-stone-800 text-sm sm:text-base font-bold">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-950 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="leading-snug">
                    {language === 'en' 
                      ? 'Tap the “aA” or Lock (🔒) icon in the browser address bar.' 
                      : language === 'hi' 
                      ? 'एड्रेस बार में “aA” या ताला (🔒) आइकन पर टैप करें।' 
                      : language === 'ta' 
                      ? 'முகவரிப் பட்டியில் உள்ள “aA” அல்லது பூட்டு (🔒) ஐகானைத் தொடவும்.' 
                      : 'Safari బ్రౌజర్ అడ్రస్ బార్‌లో (కింద లేదా పైన) ఉన్న aA లేదా తాళం (🔒) గుర్తుపై తాకండి.'}
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-950 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="leading-snug">
                    {language === 'en' 
                      ? 'Select “Website Settings” from the menu.' 
                      : language === 'hi' 
                      ? 'दिखाई देने वाले मेनू में “Website Settings” चुनें।' 
                      : language === 'ta' 
                      ? 'மெனுவில் “Website Settings” என்பதைத் தேர்ந்தெடுக்கவும்.' 
                      : 'వచ్చిన మెనూలో Website Settings (వెబ్‌సైట్ సెట్టింగ్స్) ను ఎంచుకోండి.'}
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-950 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="leading-snug">
                    {language === 'en' 
                      ? 'Set Location to “Allow”.' 
                      : language === 'hi' 
                      ? 'Location पर जाकर “Allow (अनुमति दें)” चुनें।' 
                      : language === 'ta' 
                      ? 'Location இல் “Allow (அனுமதி)” என்பதைத் தேர்வுசெய்யவும்.' 
                      : 'Location వద్ద Allow (అనుమతించు) లేదా Ask (అడుగు) ఎంచుకోండి.'}
                  </p>
                </div>
              </div>

              {/* iPhone System Settings Tip */}
              <div className="bg-white/90 p-3 rounded-xl border border-amber-300 text-xs sm:text-sm font-bold text-stone-700 space-y-1">
                <p className="font-black text-amber-950 flex items-center gap-1.5">
                  <span>⚙️</span>
                  <span>{language === 'en' ? 'iPhone System Settings:' : language === 'hi' ? 'iPhone सेटिंग्स जांचें:' : language === 'ta' ? 'iPhone அமைப்புகள்:' : 'iPhone ప్రధాన సెట్టింగ్స్‌లో తనిఖీ చేయండి:'}</span>
                </p>
                <p className="text-stone-700 leading-relaxed">
                  {language === 'en' 
                    ? 'Settings ⚙️ ➔ Privacy & Security ➔ Location Services ➔ Safari Websites: Turn on “While Using” and “Precise Location”.' 
                    : language === 'hi' 
                    ? 'Settings ⚙️ ➔ Privacy & Security ➔ Location Services चालू करें ➔ Safari Websites में “While Using” एवं “Precise Location” ऑन करें।' 
                    : language === 'ta' 
                    ? 'Settings ⚙️ ➔ Privacy & Security ➔ Location Services ஆன் செய்க ➔ Safari Websites இல் “While Using” மற்றும் “Precise Location” ஆன் செய்க.' 
                    : 'iPhone Settings ⚙️ ➔ Privacy & Security ➔ Location Services ఆన్ చేయండి ➔ Safari Websites లో "While Using the App" మరియు "Precise Location" ఆన్ చేయండి.'}
                </p>
              </div>

              {/* Android / Chrome Tip */}
              <div className="border-t border-amber-200 pt-2 text-xs sm:text-sm font-bold text-stone-700 flex items-center gap-1.5">
                <span>🤖</span>
                <span>
                  {language === 'en' 
                    ? 'Android / Chrome: Tap Lock (🔒) next to address bar ➔ Permissions ➔ Set Location to “Allow”.' 
                    : language === 'hi' 
                    ? 'Android / Chrome: एड्रेस बार के पास ताला (🔒) दबाकर Permissions में Location “Allow” करें।' 
                    : language === 'ta' 
                    ? 'Android / Chrome: முகவரிப் பட்டி அருகில் உள்ள பூட்டு (🔒) சின்னத்தைத் தொட்டு Location “Allow” செய்யவும்.' 
                    : 'Android / Chrome: అడ్రస్ బార్ పక్కన తాళం (🔒) గుర్తు నొక్కి Permissions లో Location "Allow" చేయండి.'}
                </span>
              </div>
            </div>

            {/* Big Action Button directly calling onRefreshLocation with user gesture */}
            <button
              id="btn-retry-location-permission"
              type="button"
              onClick={() => {
                playTapSound();
                speakTelugu(language === 'en' ? 'Attempting GPS location. Please allow prompt.' : 'జీపీఎస్ లొకేషన్ కోసం ప్రయత్నిస్తున్నాం. స్క్రీన్‌పై వచ్చే అనుమతిని ఒప్పుకోండి.');
                onRefreshLocation(false, true);
              }}
              className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 active:scale-98 text-white font-black rounded-2xl flex items-center justify-center gap-2.5 text-lg sm:text-xl shadow-lg cursor-pointer transition-all border-2 border-blue-800"
            >
              <LocateFixed className="w-6 h-6 animate-pulse" />
              <span>📍 {language === 'en' ? 'Enable Location / Retry GPS' : language === 'hi' ? 'लोकेशन सक्षम करें / पुनः प्रयास' : language === 'ta' ? 'இருப்பிடத்தை இயக்கு / மீண்டும் முயற்சி' : 'లొకేషన్ అనుమతించండి / మళ్లీ ప్రయత్నించండి'}</span>
            </button>
          </div>
        )}

        {/* Read Address Out Loud Button */}
        <button
          id="btn-read-address-loud"
          type="button"
          onClick={handleVoiceGuide}
          className="w-full py-3.5 px-4 bg-amber-100 hover:bg-amber-200 active:scale-[0.98] text-amber-950 font-black rounded-2xl flex items-center justify-center gap-2.5 text-base sm:text-lg border-2 border-amber-300 shadow-xs transition-all cursor-pointer"
        >
          <Volume2 className="w-6 h-6 text-amber-800 shrink-0" />
          <span>🔊 {language === 'en' ? 'Listen to Location Details' : language === 'hi' ? 'स्थान विवरण जोर से सुनें' : language === 'ta' ? 'இருப்பிட விவரங்களைக் கேளுங்கள்' : 'వివరాలను బిగ్గరగా వినండి'}</span>
        </button>
      </div>

      {/* 2. REAL GPS EMBEDDED MAP (NO DEMO HYDERABAD) */}
      <div 
        id="location-simple-map-card"
        className="bg-white p-4 sm:p-5 rounded-3xl border-3 border-blue-300 shadow-md space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Navigation className="w-4 h-4" />
            </div>
            <h3 className={`font-black text-stone-950 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
              🗺️ {language === 'en' ? 'Your Location on Map (Live Map)' : language === 'hi' ? 'मानचित्र पर आपका स्थान (Live Map)' : language === 'ta' ? 'வரைபடத்தில் உங்கள் இடம் (Live Map)' : 'మ్యాప్‌లో మీ స్థానం (Live Map)'}
            </h3>
          </div>
          {hasRealLocation ? (
            <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>{language === 'en' ? 'Live Map' : language === 'hi' ? 'लाइव मैप' : language === 'ta' ? 'நேரலை வரைபடம்' : 'లైవ్ మ్యాప్'}</span>
            </span>
          ) : (
            <span className="text-xs font-black text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-300">
              {language === 'en' ? 'Waiting for GPS' : language === 'hi' ? 'जीपीएस प्रतीक्षारत' : language === 'ta' ? 'ஜிபிஎஸ் காத்திருக்கிறது' : 'GPS వేచి ఉంది'}
            </span>
          )}
        </div>

        {/* Map Container: Shows real device location on map with interactive Leaflet */}
        {hasRealLocation ? (
          <RealLocationMap
            lat={lat}
            lng={lng}
            accuracy={accuracy}
            address={address}
            isLargeFont={isLargeFont}
          />
        ) : (
          /* Clean Non-Demo Placeholder when GPS is pending or not permitted */
          <div className="w-full h-56 sm:h-72 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 flex flex-col items-center justify-center p-6 text-center space-y-3">
            {isLoading ? (
              <>
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-300 text-blue-700">
                  <Radio className="w-8 h-8 animate-spin" />
                </div>
                <div>
                  <h4 className="font-black text-stone-900 text-base sm:text-lg">
                    {language === 'en' ? 'Preparing live map...' : language === 'hi' ? 'लाइव मैप तैयार हो रहा है...' : language === 'ta' ? 'நேரலை வரைபடம் தயாராகிறது...' : 'లైవ్ మ్యాప్ సిద్ధమవుతోంది...'}
                  </h4>
                  <p className="text-xs sm:text-sm font-bold text-stone-600 mt-1 max-w-sm">
                    {language === 'en' 
                      ? 'Live map will appear as soon as real GPS location is detected from your device.' 
                      : language === 'hi' 
                      ? 'डिवाइस से वास्तविक जीपीएस स्थान प्राप्त होते ही यहां लाइव मैप दिखाई देगा।' 
                      : language === 'ta' 
                      ? 'உங்கள் சாதனத்திலிருந்து ஜிபிஎஸ் கிடைத்தவுடன் நேரலை வரைபடம் தோன்றும்.' 
                      : 'మీ పరికరం యొక్క నిజమైన GPS స్థానం రాగానే ఇక్కడ లైవ్ మ్యాప్ కనిపిస్తుంది.'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center border-2 border-stone-300 text-stone-600">
                  <MapPinOff className="w-8 h-8" />
                </div>
                <div>
                  <span className="inline-block bg-stone-200 text-stone-800 text-[11px] font-black px-2.5 py-0.5 rounded-full mb-1 border border-stone-300">
                    GPS location unavailable
                  </span>
                  <h4 className="font-black text-stone-900 text-base sm:text-lg">
                    {language === 'en' ? 'GPS Required for Live Map' : language === 'hi' ? 'मानचित्र के लिए जीपीएस आवश्यक' : language === 'ta' ? 'வரைபடத்திற்கு ஜிபிஎஸ் தேவை' : 'GPS location unavailable (మ్యాప్ కోసం జీపీఎస్ అవసరం)'}
                  </h4>
                  <p className="text-xs sm:text-sm font-bold text-stone-600 mt-1 max-w-sm">
                    {language === 'en' 
                      ? 'Only real verified device GPS is shown on this map. Mock or fake demo locations are not used.' 
                      : language === 'hi' 
                      ? 'इस मानचित्र पर केवल वास्तविक जीपीएस दिखाया जाता है। कोई नकली स्थान उपयोग नहीं किया जाता।' 
                      : language === 'ta' 
                      ? 'இந்த வரைபடத்தில் உண்மையான ஜிபிஎஸ் மட்டுமே காட்டப்படும்.' 
                      : 'మీ ఫోన్ యొక్క నిజమైన GPS లొకేషన్ మాత్రమే మ్యాప్‌లో చూపబడుతుంది. తప్పుడు, డెమో లేదా IP లొకేషన్లు ఉపయోగించబడవు.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    speakTelugu(language === 'en' ? 'Retrying GPS location' : 'జీపీఎస్ లొకేషన్ కోసం మళ్లీ ప్రయత్నిస్తున్నాం. అనుమతి ఇవ్వండి.');
                    onRefreshLocation(false, true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  📍 {language === 'en' ? 'Turn On GPS & Retry' : language === 'hi' ? 'जीपीएस चालू करें और पुनः प्रयास करें' : language === 'ta' ? 'ஜிபிஎஸ் ஆன் செய்து மீண்டும் முயற்சிக்கவும்' : 'GPS ఆన్ చేసి మళ్లీ ప్రయత్నించండి'}
                </button>
              </>
            )}
          </div>
        )}

        <p className="text-stone-500 font-bold text-xs text-center">
          💡 {language === 'en' ? 'The red marker on the map indicates your precise device location.' : language === 'hi' ? 'मानचित्र पर लाल निशान आपके डिवाइस के सटीक स्थान को दर्शाता है।' : language === 'ta' ? 'வரைபடத்தில் உள்ள சிவப்பு குறி உங்கள் துல்லியமான இடத்தைக் குறிக்கிறது.' : 'మ్యాప్‌లో ఎరుపు రంగు గుర్తు మీ పరికరం ఉన్న ఖచ్చితమైన ప్రదేశాన్ని సూచిస్తుంది.'}
        </p>
      </div>

      {/* 3. LARGE "SHARE LOCATION" BUTTON */}
      <div id="location-share-action-box" className="space-y-3">
        <button
          id="btn-share-location-main"
          type="button"
          onClick={handleShareLocation}
          className="w-full py-5 sm:py-6 px-5 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] text-white font-black rounded-3xl shadow-xl flex items-center justify-center gap-4 text-2xl sm:text-3xl border-3 border-emerald-500 transition-all cursor-pointer select-none"
          aria-label={t('btnShare')}
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white text-emerald-700 rounded-2xl flex items-center justify-center shadow-md shrink-0">
            <Share2 className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <span className="tracking-wide">{t('btnShare')}</span>
        </button>

        {/* Quick Share Options (WhatsApp & Copy) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* WhatsApp Direct Share */}
          <button
            id="btn-share-whatsapp"
            type="button"
            onClick={handleShareWhatsApp}
            className="p-3.5 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 rounded-2xl font-bold flex items-center justify-between shadow-xs active:scale-98 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="font-black text-stone-900 text-base">{t('locShareWhatsApp')}</h4>
              </div>
            </div>
            <Share2 className="w-5 h-5 text-emerald-700" />
          </button>

          {/* Copy Address */}
          <button
            id="btn-copy-location"
            type="button"
            onClick={handleCopyLocation}
            className="p-3.5 bg-stone-50 hover:bg-stone-100 border-2 border-stone-300 rounded-2xl font-bold flex items-center justify-between shadow-xs active:scale-98 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-stone-200 text-stone-800 rounded-xl shadow-xs">
                {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </div>
              <div className="text-left">
                <h4 className="font-black text-stone-900 text-base">
                  {copied ? t('statusCopied') : t('locCopy')}
                </h4>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 4. SENIOR HOME ADDRESS WITH 📍 ONE-TAP GPS DETECTION & SAVE */}
      <div 
        id="senior-home-directions-card"
        className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-stone-200 space-y-3.5 shadow-xs"
      >
        <div className="flex items-center justify-between border-b pb-2.5 border-stone-200">
          <div className="flex items-center gap-2">
            <Home className="w-6 h-6 text-amber-700" />
            <h4 className="font-black text-stone-900 text-lg sm:text-xl">{t('locHomeCardTitle')}:</h4>
          </div>
          {homeAddress && (
            <button
              id="btn-edit-home-address"
              type="button"
              onClick={() => {
                playTapSound();
                setIsEditingHome(!isEditingHome);
              }}
              className="text-xs text-blue-700 font-black hover:underline cursor-pointer bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
            >
              {isEditingHome ? t('btnCancel') : t('btnEdit')}
            </button>
          )}
        </div>

        {/* Big Action Button: “📍 Set current location as home” */}
        <button
          id="btn-detect-home-location"
          type="button"
          onClick={handleDetectHomeLocation}
          disabled={isDetectingHome}
          className="w-full py-4 sm:py-5 px-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 active:scale-[0.98] text-stone-950 font-black rounded-2xl shadow-lg border-3 border-amber-600 flex items-center justify-center gap-3 transition-all cursor-pointer min-h-[72px]"
          aria-label={t('locHomeSetCurrent')}
        >
          {isDetectingHome ? (
            <div className="flex items-center justify-center gap-2.5 text-base sm:text-lg">
              <RefreshCw className="w-6 h-6 animate-spin text-stone-950 shrink-0" />
              <span>{t('statusLoading')}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2.5 text-lg sm:text-xl text-center">
              <MapPin className="w-7 h-7 text-stone-950 shrink-0 animate-bounce" />
              <span>📍 {t('locHomeSetCurrent')}</span>
            </div>
          )}
        </button>

        {/* GPS Permission / Error Message if unavailable */}
        {homeGpsError && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-red-900 font-black text-sm sm:text-base">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{language === 'en' ? 'Location Unavailable' : language === 'hi' ? 'स्थान उपलब्ध नहीं' : language === 'ta' ? 'இருப்பிடம் கிடைக்கவில்லை' : 'లొకేషన్ అందుబాటులో లేదు'}</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-red-700">
              {homeGpsError}
            </p>
            <button
              type="button"
              onClick={handleDetectHomeLocation}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs sm:text-sm shadow-xs active:scale-95 cursor-pointer"
            >
              {language === 'en' ? 'Retry' : language === 'hi' ? 'पुनः प्रयास करें' : language === 'ta' ? 'மீண்டும் முயற்சிக்கவும்' : 'మళ్లీ ప్రయత్నించండి (Retry)'}
            </button>
          </div>
        )}

        {/* Detected Address Candidate Card with “🏠 Save as Home Address” */}
        {detectedHomeAddress && (
          <div className="bg-emerald-50 border-3 border-emerald-500 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-emerald-950">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <h5 className="font-black text-xs sm:text-sm uppercase tracking-wider">
                {language === 'en' ? 'Detected Address:' : language === 'hi' ? 'पहचाना गया पता:' : language === 'ta' ? 'கண்டறியப்பட்ட முகவரி:' : 'గుర్తించబడిన ప్రస్తుత చిరునామా (Detected Address):'}
              </h5>
            </div>
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-emerald-300 shadow-inner">
              <p className="font-black text-stone-950 text-base sm:text-lg leading-relaxed">
                📍 {detectedHomeAddress}
              </p>
            </div>
            <button
              id="btn-confirm-save-home"
              type="button"
              onClick={handleConfirmSaveDetectedHome}
              className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black rounded-2xl text-lg sm:text-xl flex items-center justify-center gap-2.5 shadow-lg border-2 border-emerald-700 cursor-pointer transition-all"
            >
              <Home className="w-6 h-6 shrink-0" />
              <span>🏠 {language === 'en' ? 'Save as Home Address' : language === 'hi' ? 'घर के पते के रूप में सुरक्षित करें' : language === 'ta' ? 'வீட்டு முகவரியாக சேமிக்கவும்' : 'ఇంటి చిరునామాగా సేవ్ చేయండి'}</span>
            </button>
          </div>
        )}

        {/* Success Confirmation Notification */}
        {isSavedSuccess && (
          <div className="bg-emerald-100 border-2 border-emerald-400 text-emerald-950 p-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xs animate-in zoom-in-95">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{language === 'en' ? 'Home address saved successfully! ✓' : language === 'hi' ? 'घर का पता सफलतापूर्वक सुरक्षित किया गया! ✓' : language === 'ta' ? 'வீட்டு முகவரி வெற்றிகரமாக சேமிக்கப்பட்டது! ✓' : 'ఇంటి చిరునామా విజయవంతంగా సేవ్ చేయబడింది! ✓'}</span>
          </div>
        )}

        {/* Display Current Saved Home Address */}
        {homeAddress && !isEditingHome && (
          <div className="bg-amber-50/70 p-3.5 sm:p-4 rounded-2xl border-2 border-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 uppercase tracking-wider">
              <Home className="w-4 h-4 text-amber-700" />
              <span>{language === 'en' ? 'Saved Home Address:' : language === 'hi' ? 'सुरक्षित किया गया घर का पता:' : language === 'ta' ? 'சேமிக்கப்பட்ட வீட்டு முகவரி:' : 'సేవ్ చేయబడిన ఇంటి చిరునామా (Saved Home):'}</span>
            </div>
            <p className="font-black text-stone-950 text-base sm:text-lg leading-snug">
              🏡 {homeAddress}
            </p>
          </div>
        )}

        {/* Optional Manual Edit fallback (never mandatory) */}
        {isEditingHome && (
          <div className="space-y-2 pt-1">
            <label htmlFor="input-home-address" className="block text-xs font-bold text-stone-600">
              {language === 'en' ? 'Change or edit address:' : language === 'hi' ? 'पता बदलें या संपादित करें:' : language === 'ta' ? 'முகவரியை மாற்றவும் அல்லது திருத்தவும்:' : 'చిరునామా మార్చండి లేదా సరిచేయండి:'}
            </label>
            <input
              id="input-home-address"
              type="text"
              value={homeAddress}
              onChange={(e) => setHomeAddress(e.target.value)}
              className="w-full p-3.5 border-2 border-stone-300 rounded-xl text-base font-bold bg-white text-stone-900 focus:border-amber-500 focus:outline-hidden shadow-inner"
              placeholder={language === 'en' ? 'e.g., Door No, Street, Area...' : language === 'hi' ? 'उदा: मकान संख्या, सड़क, इलाका...' : language === 'ta' ? 'எ.கா: கதவு எண், தெரு, பகுதி...' : 'ఉదా: ఇంటి నంబర్, వీధి, ఏరియా...'}
            />
            <button
              id="btn-save-home-address"
              type="button"
              onClick={handleSaveHome}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-black rounded-xl cursor-pointer transition-all shadow-sm text-base"
            >
              {t('btnSave')}
            </button>
          </div>
        )}

        {/* Navigation to Saved Home Address */}
        {homeAddress && (
          <a
            id="btn-directions-home"
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(homeAddress)}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              playTapSound();
              speakTelugu('Navigation');
            }}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-amber-950 font-black rounded-xl flex items-center justify-center gap-2 shadow-sm text-base sm:text-lg transition-all cursor-pointer"
          >
            <Navigation className="w-5 h-5 shrink-0" />
            <span>{t('locHomeNavigateBtn')}</span>
          </a>
        )}
      </div>

      {/* Bottom Sticky Home Button */}
      <div className="pt-2">
        <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
      </div>
    </div>
  );
};
