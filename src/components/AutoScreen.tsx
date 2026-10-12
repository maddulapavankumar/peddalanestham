import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HomeButton } from './HomeButton';
import { 
  Volume2, 
  RefreshCw, 
  X, 
  ExternalLink 
} from 'lucide-react';
import { playTapSound, speakInLanguage } from '../utils/audio';
import { 
  CityRegion, 
  ResolvedCityInfo, 
  detectCityRegion 
} from '../utils/locationCity';
import { 
  getSafeRideCoords, 
  getOlaAutoUrl,
  getUberRideUrl,
  getUberAppSchemeUrl,
  DestCoords
} from '../utils/rideAppDeepLinks';
import { fetchCompleteReadableAddress } from '../utils/reverseGeocode';
import { CountryCode } from './CountrySelector';
import { useLanguage } from '../utils/i18n';

export type { CityRegion, ResolvedCityInfo };
export { detectCityRegion };

const getOlaReturnVoice = (lang: string) => {
  if (lang === 'en') return 'To return to Peddala Nestham, tap the square Tabs button at the bottom right, then tap the Peddala Nestham tab.';
  if (lang === 'hi') return 'पेद्दला नेस्तम पर वापस जाने के लिए, नीचे दाईं ओर चौकोर टैब बटन दबाएं, फिर पेद्दला नेस्तम टैब चुनें।';
  if (lang === 'ta') return 'பெத்தலா நேஸ்தத்திற்கு திரும்ப, கீழே வலதுபுறத்தில் உள்ள சதுர டேப் பொத்தானைத் தட்டவும்.';
  return 'అండి, పెద్దల నేస్తానికి మళ్లీ వెళ్లాలంటే, కింద కుడివైపు ఉన్న చతురస్రాకారంలో కనిపించే Tabs బటన్ను నొక్కండి. ఆ తర్వాత ‘పెద్దల నేస్తం’ ట్యాబ్ను నొక్కండి.';
};

interface AutoScreenProps {
  onGoHome: () => void;
  isLargeFont: boolean;
  currentAddress?: string;
  lat?: number | null;
  lng?: number | null;
  onRefreshLocation?: () => void;
  onOpenDriverPortal?: () => void;
  selectedCountry?: CountryCode;
}

export const AutoScreen: React.FC<AutoScreenProps> = ({
  onGoHome,
  isLargeFont,
  currentAddress,
  lat,
  lng,
  onRefreshLocation,
  selectedCountry = 'IN',
}) => {
  const { language, t } = useLanguage();
  const [indiaRideService, setIndiaRideService] = useState<'ola' | 'uber'>('ola');

  const [displayLocation, setDisplayLocation] = useState<string>(() => {
    if (currentAddress && currentAddress !== 'స్థానాన్ని గుర్తిస్తున్నాం...') {
      return currentAddress;
    }
    return 'మీ పరికరం నుండి నిజమైన జీపీఎస్ స్థానాన్ని గుర్తిస్తున్నాం...';
  });

  const [currentCoords, setCurrentCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat,
    lng,
  });

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [cityInfo, setCityInfo] = useState<ResolvedCityInfo>(() => {
    return detectCityRegion(lat, lng, currentAddress);
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [destinationText, setDestinationText] = useState<string>('');

  // Destination geocoded coordinates
  const [destCoords, setDestCoords] = useState<DestCoords | null>(null);

  // Tracks if official Ola Auto booking page was launched
  const [olaOpened, setOlaOpened] = useState<boolean>(false);
  const hasAwaitedExternalOlaOpenRef = useRef<boolean>(false);
  const hasAttemptedOlaVoiceRef = useRef<boolean>(false);
  const olaOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const RIDE_STATE_KEY = 'peddala_nestham_ola_booking_state';

  // Restore previous destination if returning from ride app
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RIDE_STATE_KEY) || localStorage.getItem(RIDE_STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Date.now() - (parsed.timestamp || 0) < 4 * 60 * 60 * 1000) {
          if (parsed.destinationText) {
            setDestinationText(parsed.destinationText);
          }
          if (parsed.destCoords) {
            setDestCoords(parsed.destCoords);
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Request fresh GPS coordinates whenever screen mounts
  useEffect(() => {
    if (onRefreshLocation) {
      onRefreshLocation();
    }
  }, [onRefreshLocation]);

  // Dynamically resolve actual GPS coordinates to verified precise address using the exact same logic as My Location
  const resolveCoordinates = useCallback(async (latitude: number, longitude: number) => {
    setIsLocating(true);
    try {
      const res = await fetchCompleteReadableAddress(latitude, longitude);
      if (res.address && !res.address.startsWith('అక్షాంశం:')) {
        setDisplayLocation(res.address);
        setCityInfo(detectCityRegion(latitude, longitude, res.address));
      } else {
        const fallbackCoordStr = `అక్షాంశం: ${latitude.toFixed(5)}, రేఖాంశం: ${longitude.toFixed(5)}`;
        setDisplayLocation(fallbackCoordStr);
        setCityInfo(detectCityRegion(latitude, longitude, ''));
      }
    } catch {
      const fallbackCoordStr = `అక్షాంశం: ${latitude.toFixed(5)}, రేఖాంశం: ${longitude.toFixed(5)}`;
      setDisplayLocation(fallbackCoordStr);
      setCityInfo(detectCityRegion(latitude, longitude, ''));
    }
    setIsLocating(false);
  }, []);

  // Update location whenever GPS coordinates or address change from props
  useEffect(() => {
    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      setCurrentCoords({ lat, lng });
      if (!currentAddress || currentAddress.includes('గుర్తిస్తున్నాం') || currentAddress === 'నా ప్రస్తుత ప్రాంతం') {
        resolveCoordinates(lat, lng);
      } else {
        setDisplayLocation(currentAddress);
        setCityInfo(detectCityRegion(lat, lng, currentAddress));
      }
    } else if (currentAddress && currentAddress !== 'స్థానాన్ని గుర్తిస్తున్నాం...') {
      setDisplayLocation(currentAddress);
      setCityInfo(detectCityRegion(null, null, currentAddress));
    }
  }, [lat, lng, currentAddress, resolveCoordinates]);

  // Voice announcement on initial screen load (do not play voice before opening Ola Auto)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedCountry === 'USA') {
        const speech = language === 'en'
          ? 'Uber Ride booking page. Type where you want to go and tap Open Uber.'
          : language === 'hi'
          ? 'यूएसए में उबर राइड बुकिंग पेज। गंतव्य लिखें और ओपन उबर दबाएं।'
          : language === 'ta'
          ? 'ஊபர் ரைடு முன்பதிவு பக்கம். நீங்கள் செல்ல வேண்டிய இடத்தை தட்டச்சு செய்து ஊபர் திறக்கவும் தட்டவும்.'
          : 'అమెరికాలో ఉబెర్ రైడ్ బుకింగ్ పేజీ. ఎక్కడికి వెళ్లాలో టైప్ చేసి ఉబెర్ తెరవండి బటన్ నొక్కండి.';
        speakInLanguage(speech, language);
      } else if (indiaRideService === 'uber') {
        const speech = language === 'en'
          ? 'Uber Ride booking page. Type where you want to go and tap Open Uber.'
          : language === 'hi'
          ? 'उबर राइड बुकिंग पेज। गंतव्य लिखें और ओपन उबर दबाएं।'
          : language === 'ta'
          ? 'ஊபர் முன்பதிவு பக்கம். செல்ல வேண்டிய இடத்தை எழுதி ஊபர் திறக்கவும் அழுத்தவும்.'
          : 'భారతదేశంలో ఉబెర్ రైడ్ బుకింగ్ పేజీ. ఎక్కడికి వెళ్లాలో టైప్ చేసి ఉబెర్ తెరవండి బటన్ నొక్కండి.';
        speakInLanguage(speech, language);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedCountry, indiaRideService, language]);

  // Manual GPS refresh handler with fresh satellite GPS reading
  const handleRefreshLocation = () => {
    playTapSound();
    setIsRefreshing(true);
    const checkingSpeech = language === 'en'
      ? 'Verifying your current GPS location...'
      : language === 'hi'
      ? 'आपका वर्तमान जीपीएस स्थान जांच रहे हैं...'
      : language === 'ta'
      ? 'உங்கள் தற்போதைய ஜிபிஎஸ் இடத்தை சரிபார்க்கிறது...'
      : 'మీ ప్రస్తుత జీపీఎస్ స్థానాన్ని సరిచూస్తున్నాం...';
    speakInLanguage(checkingSpeech, language);

    if (onRefreshLocation) {
      onRefreshLocation();
    }

    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          setCurrentCoords({ lat: newLat, lng: newLng });
          await resolveCoordinates(newLat, newLng);
          setIsRefreshing(false);
          const okSpeech = language === 'en'
            ? 'GPS location verified.'
            : language === 'hi'
            ? 'जीपीएस स्थान सत्यापित हुआ।'
            : language === 'ta'
            ? 'ஜிபிஎஸ் இடம் சரிபார்க்கப்பட்டது.'
            : 'జీపీఎస్ స్థానం సరిచూడబడింది.';
          speakInLanguage(okSpeech, language);
        },
        (err) => {
          setIsRefreshing(false);
          if (err.code === 1) {
            const permSpeech = language === 'en' ? 'Location permission needed.' : language === 'hi' ? 'लोकेशन अनुमति आवश्यक है।' : language === 'ta' ? 'இருப்பிட அனுமதி தேவை.' : 'లొకేషన్ అనుమతి అవసరం.';
            speakInLanguage(permSpeech, language);
          } else {
            const sigSpeech = language === 'en' ? 'GPS signal unavailable.' : language === 'hi' ? 'जीपीएस सिग्नल नहीं मिल रहा।' : language === 'ta' ? 'ஜிபிஎஸ் சிக்னல் கிடைக்கவில்லை.' : 'జీపీఎస్ సిగ్నల్ అందడం లేదు.';
            speakInLanguage(sigSpeech, language);
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      setIsRefreshing(false);
    }
  };

  // Safe coordinates guaranteed for ride apps
  const safeRideCoords = useMemo(() => {
    return getSafeRideCoords(currentCoords.lat, currentCoords.lng, cityInfo.region, currentAddress);
  }, [currentCoords.lat, currentCoords.lng, cityInfo.region, currentAddress]);

  // Geocode destination text whenever senior finishes typing
  useEffect(() => {
    const targetDest = destinationText.trim();
    if (!targetDest || targetDest.length < 2) {
      setDestCoords(null);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const cityParam = cityInfo.region !== 'other' && cityInfo.region !== 'detecting' ? cityInfo.region : '';
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(targetDest)}&lat=${safeRideCoords.lat}&lng=${safeRideCoords.lng}&city=${encodeURIComponent(cityParam)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.lat && data?.lng) {
            setDestCoords({
              lat: data.lat,
              lng: data.lng,
              name: data.name || targetDest,
            });
          }
        }
      } catch {
        // Fallback
      }
    }, 450);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [destinationText, safeRideCoords.lat, safeRideCoords.lng, cityInfo.region]);

  // 🇮🇳 INDIA: Official Ola booking URL with live GPS pickup coordinates, auto category, and destination handoff
  const olaUrl = useMemo(() => {
    return getOlaAutoUrl(safeRideCoords, destinationText.trim() || undefined, destCoords);
  }, [safeRideCoords, destinationText, destCoords]);

  // 🇺🇸 USA & 🇮🇳 India: Official Uber Universal Link with live pickup coordinates and destination parameters
  const uberUrl = useMemo(() => {
    return getUberRideUrl(safeRideCoords, destinationText.trim() || undefined, destCoords);
  }, [safeRideCoords, destinationText, destCoords]);

  // 🇺🇸 USA & 🇮🇳 India: Official Uber Custom Scheme Deep Link (uber://) for direct app opening
  const uberAppUrl = useMemo(() => {
    return getUberAppSchemeUrl(safeRideCoords, destinationText.trim() || undefined, destCoords);
  }, [safeRideCoords, destinationText, destCoords]);

  // Voice guide explaining how to use ride service
  const handleVoiceGuide = () => {
    playTapSound();
    if (selectedCountry === 'USA') {
      if (destinationText.trim()) {
        const speech = language === 'en'
          ? `Uber Ride is ready for your destination ${destinationText.trim()}. Tap the green button to open Uber.`
          : language === 'hi'
          ? `${destinationText.trim()} जाने के लिए उबर तैयार है। उबर खोलने के लिए हरा बटन दबाएं।`
          : language === 'ta'
          ? `${destinationText.trim()} செல்ல ஊபர் தயாராக உள்ளது. ஊபர் திறக்க பச்சை பொத்தானைத் தட்டவும்.`
          : `మీరు ${destinationText.trim()} వెళ్లడానికి ఉబెర్ రైడ్ సిద్ధంగా ఉంది. ఉబెర్ తెరవడానికి ఆకుపచ్చ బటన్ నొక్కండి.`;
        speakInLanguage(speech, language);
      } else {
        const speech = language === 'en'
          ? 'Uber Ride service. Type your destination and tap Open Uber button.'
          : language === 'hi'
          ? 'उबर सेवा। अपना गंतव्य लिखें और ओपन उबर दबाएं।'
          : language === 'ta'
          ? 'ஊபர் சேவை. நீங்கள் செல்லும் இடத்தை எழுதி ஊபர் திறக்கவும் தட்டவும்.'
          : 'అమెరికాలో ఉబెర్ రైడ్ సేవ. ఎక్కడికి వెళ్లాలో టైప్ చేసి, ఉబెర్ తెరవండి బటన్ నొక్కండి.';
        speakInLanguage(speech, language);
      }
    } else if (indiaRideService === 'ola') {
      if (destinationText.trim()) {
        const speech = language === 'en'
          ? `Ola Auto booking ready for ${destinationText.trim()}. Tap Open Ola Auto to proceed.`
          : language === 'hi'
          ? `${destinationText.trim()} के लिए ओला ऑटो तैयार है। ओला ऑटो खोलने के लिए बटन दबाएं।`
          : language === 'ta'
          ? `${destinationText.trim()} செல்ல ஓலா ஆட்டோ தயார். ஓலா ஆட்டோ திறக்க அழுத்தவும்.`
          : `మీరు ${destinationText.trim()} వెళ్లడానికి ఓలా ఆటో బుకింగ్ సిద్ధంగా ఉంది. ఓలా ఆటో తెరవండి బటన్ నొక్కండి.`;
        speakInLanguage(speech, language);
      } else {
        const speech = language === 'en'
          ? 'Ola Auto picks you up at your current location. Type your destination and tap Open Ola Auto.'
          : language === 'hi'
          ? 'ओला ऑटो आपके स्थान पर आएगा। गंतव्य लिखें और ओपन ओला ऑटो दबाएं।'
          : language === 'ta'
          ? 'ஓலா ஆட்டோ நீங்கள் இருக்கும் இடத்திற்கே வரும். செல்ல வேண்டிய இடத்தை எழுதி ஓலா ஆட்டோ திறக்கவும் அழுத்தவும்.'
          : 'మీరు ఉన్న చోటికే ఓలా ఆటో వస్తుంది. ఎక్కడికి వెళ్లాలో టైప్ చేసి, ఓలా ఆటో తెరవండి బటన్ నొక్కండి.';
        speakInLanguage(speech, language);
      }
    } else {
      if (destinationText.trim()) {
        const speech = language === 'en'
          ? `Uber Ride booking ready for ${destinationText.trim()}. Tap Open Uber button.`
          : language === 'hi'
          ? `${destinationText.trim()} के लिए उबर तैयार है। ओपन उबर दबाएं।`
          : language === 'ta'
          ? `${destinationText.trim()} செல்ல ஊபர் தயார். ஊபர் திறக்கவும் அழுத்தவும்.`
          : `మీరు ${destinationText.trim()} వెళ్లడానికి ఉబెర్ రైడ్ బుకింగ్ సిద్ధంగా ఉంది. ఉబెర్ తెరవడానికి ఆకుపచ్చ బటన్ నొక్కండి.`;
        speakInLanguage(speech, language);
      } else {
        const speech = language === 'en'
          ? 'Uber Ride service. Type destination and tap Open Uber.'
          : language === 'hi'
          ? 'उबर सेवा। गंतव्य लिखें और ओपन उबर दबाएं।'
          : language === 'ta'
          ? 'ஊபர் சேவை. செல்ல வேண்டிய இடத்தை எழுதி ஊபர் திறக்கவும் அழுத்தவும்.'
          : 'భారతదేశంలో ఉబెర్ రైడ్ సేవ. ఎక్కడికి వెళ్లాలో టైప్ చేసి ఉబెర్ తెరవండి బటన్ నొక్కండి.';
        speakInLanguage(speech, language);
      }
    }
  };

  // Dedicated in-app return mechanism: returns safely to home screen
  const handleReturnToHome = () => {
    playTapSound();
    if (olaOpenTimerRef.current) {
      clearTimeout(olaOpenTimerRef.current);
      olaOpenTimerRef.current = null;
    }
    try {
      sessionStorage.removeItem(RIDE_STATE_KEY);
      localStorage.removeItem(RIDE_STATE_KEY);
    } catch {
      // ignore
    }
    setOlaOpened(false);
    hasAwaitedExternalOlaOpenRef.current = false;
    hasAttemptedOlaVoiceRef.current = false;
    const homeSpeech = language === 'en'
      ? 'Returned to main home screen.'
      : language === 'hi'
      ? 'मुख्य होम स्क्रीन पर वापस आए।'
      : language === 'ta'
      ? 'முதன்மை முகப்பு திரைக்குத் திரும்பியது.'
      : 'పెద్దల నేస్తం ముఖ్య పేజీకి వచ్చారు.';
    speakInLanguage(homeSpeech, language);
    onGoHome();
  };

  // Only after the external Ola page has successfully opened and the user can see the Ola page,
  // attempt to play the Telugu female voice exactly once.
  // If the app cannot reliably detect that the external Ola page has opened, do not play the voice early.
  useEffect(() => {
    const handleVisibilityOrPageChange = () => {
      if (document.visibilityState === 'hidden') {
        // Document is hidden, indicating the browser has transitioned to the newly opened external Ola page
        if (hasAwaitedExternalOlaOpenRef.current && !hasAttemptedOlaVoiceRef.current) {
          if (olaOpenTimerRef.current) {
            clearTimeout(olaOpenTimerRef.current);
          }
          // Delay to ensure the external Ola page has loaded and the user can see it
          olaOpenTimerRef.current = setTimeout(() => {
            if (document.visibilityState === 'hidden' && !hasAttemptedOlaVoiceRef.current) {
              hasAttemptedOlaVoiceRef.current = true;
              hasAwaitedExternalOlaOpenRef.current = false;
              speakInLanguage(getOlaReturnVoice(language), language, { rate: 0.95 });
            }
          }, 2000);
        }
      } else if (document.visibilityState === 'visible') {
        // If the user returned before the delay completed, cancel the timer so the voice never plays prematurely
        if (olaOpenTimerRef.current) {
          clearTimeout(olaOpenTimerRef.current);
          olaOpenTimerRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrPageChange);
    window.addEventListener('pagehide', handleVisibilityOrPageChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrPageChange);
      window.removeEventListener('pagehide', handleVisibilityOrPageChange);
      if (olaOpenTimerRef.current) {
        clearTimeout(olaOpenTimerRef.current);
        olaOpenTimerRef.current = null;
      }
    };
  }, [language]);

  // Save state before leaving for ride service
  const saveRideStateBeforeLeaving = (dest: string, coords: DestCoords | null) => {
    try {
      const state = {
        fromOla: true,
        destinationText: dest,
        destCoords: coords,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(RIDE_STATE_KEY, JSON.stringify(state));
      localStorage.setItem(RIDE_STATE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  };

  // Handle "🟢 Ola Auto తెరవండి"
  // Keeps official Ola opening and booking flow unchanged.
  // First opens the official Ola Auto page normally.
  // Does NOT play any return voice before opening or while Ola is loading.
  const handleConfirmOlaBooking = () => {
    const finalDest = destinationText.trim();
    saveRideStateBeforeLeaving(finalDest, destCoords);
    setOlaOpened(true);
    hasAwaitedExternalOlaOpenRef.current = true;
    hasAttemptedOlaVoiceRef.current = false;
    if (olaOpenTimerRef.current) {
      clearTimeout(olaOpenTimerRef.current);
      olaOpenTimerRef.current = null;
    }
  };

  // Handle "🟢 Uber Ride తెరవండి"
  const handleConfirmUberBooking = () => {
    playTapSound();
    const finalDest = destinationText.trim();
    saveRideStateBeforeLeaving(finalDest, destCoords);
    if (finalDest) {
      const msg = language === 'en'
        ? `Opening Uber Ride official page. Destination: ${finalDest}.`
        : language === 'hi'
        ? `Uber Ride आधिकारिक साइट खुल रही है। गंतव्य: ${finalDest}।`
        : language === 'ta'
        ? `Uber Ride அதிகாரப்பூர்வ தளம் திறக்கப்படுகிறது. சேருமிடம்: ${finalDest}.`
        : `ఉబెర్ రైడ్ అధికారిక సైట్ తెరవబడుతోంది. గమ్యస్థానం ${finalDest}.`;
      speakInLanguage(msg, language);
    } else {
      const msg = language === 'en'
        ? 'Opening Uber Ride official page.'
        : language === 'hi'
        ? 'Uber Ride आधिकारिक साइट खुल रही है।'
        : language === 'ta'
        ? 'Uber Ride அதிகாரப்பூர்வ தளம் திறக்கப்படுகிறது.'
        : 'ఉబెర్ రైడ్ అధికారిక సైట్ తెరవబడుతోంది.';
      speakInLanguage(msg, language);
    }
  };

  return (
    <div className="p-3 sm:p-5 max-w-2xl mx-auto space-y-4 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <HomeButton onGoHome={handleReturnToHome} isLargeFont={isLargeFont} />
        </div>
        <button
          id="auto-voice-guide-btn"
          onClick={handleVoiceGuide}
          type="button"
          className={`p-3.5 rounded-2xl border-2 font-bold active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
            selectedCountry === 'USA'
              ? 'bg-blue-100 text-blue-950 hover:bg-blue-200 border-blue-300'
              : 'bg-amber-200 text-amber-950 hover:bg-amber-300 border-amber-400'
          }`}
          title={language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'సహాయక స్వరం (వాయిస్ గైడ్)'}
          aria-label={language === 'en' ? 'Listen to Voice Guide' : language === 'hi' ? 'आवाज़ सहायता सुनें' : language === 'ta' ? 'குரல் உதவி கேளுங்கள்' : 'సహాయక స్వరం వినండి'}
        >
          <Volume2 className={`w-7 h-7 ${selectedCountry === 'USA' ? 'text-blue-900' : 'text-amber-900'}`} />
          <span className="hidden sm:inline text-xs font-black">{language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'వాయిస్ సహాయం'}</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* ---------------- 🇮🇳 ONLY INDIA: RIDE OPTIONS --------------- */}
      {/* ============================================================= */}
      {selectedCountry === 'IN' && (
        <div id="section-india-ola" className="space-y-4">
          {/* Screen Title Header Card: Ola Auto or Uber Ride */}
          {indiaRideService === 'ola' ? (
            <div 
              id="auto-title-card"
              className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-stone-950 p-4 sm:p-5 rounded-3xl shadow-md border-3 border-amber-600 flex items-center gap-4"
            >
              <div className="w-16 h-16 bg-stone-950 text-amber-400 rounded-2xl flex items-center justify-center shrink-0 shadow-inner text-3xl">
                🛺
              </div>
              <div className="flex-1 min-w-0">
                <h2 className={`font-black text-stone-950 tracking-tight ${isLargeFont ? 'text-3xl' : 'text-2xl'}`}>
                  {t('homeCardAutoTitleIndia')}
                </h2>
                <p className="font-bold text-stone-800 text-xs sm:text-sm mt-0.5">
                  {t('homeCardAutoSubIndia')}
                </p>
              </div>
            </div>
          ) : (
            <div 
              id="india-uber-title-card"
              className="bg-gradient-to-r from-stone-900 via-zinc-800 to-black text-white p-4 sm:p-5 rounded-3xl shadow-md border-3 border-stone-700 flex items-center gap-4"
            >
              <div className="w-16 h-16 bg-white text-stone-950 rounded-2xl flex items-center justify-center shrink-0 shadow-inner text-3xl font-black">
                🚗
              </div>
              <div className="flex-1 min-w-0">
                <h2 className={`font-black text-white tracking-tight ${isLargeFont ? 'text-3xl' : 'text-2xl'}`}>
                  Uber Ride
                </h2>
                <p className="font-bold text-stone-300 text-xs sm:text-sm mt-0.5">
                  {t('homeCardAutoSubIndia')}
                </p>
              </div>
            </div>
          )}

          {/* 1. SINGLE CURRENT GPS PICKUP LOCATION (Displayed only once) */}
          <div 
            id="auto-pickup-location-card"
            className="bg-amber-50 border-3 border-amber-300 rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-amber-500 text-stone-950 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-xl font-black">
                📍
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                    {t('autoPickupLoc')} ({indiaRideService === 'ola' ? (language === 'te' ? 'ఆటో' : language === 'hi' ? 'ऑटो' : language === 'ta' ? 'ஆட்டோ' : 'Auto') : (language === 'te' ? 'కారు' : language === 'hi' ? 'कार' : language === 'ta' ? 'கார்' : 'Car')}):
                  </span>
                  {isLocating && (
                    <span className="text-xs font-bold text-amber-800 animate-pulse flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      {t('locFetching')}
                    </span>
                  )}
                </div>
                
                <p id="auto-pickup-address-text" className={`font-black text-stone-900 mt-1 leading-relaxed break-words ${isLargeFont ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'} ${displayLocation.includes('గుర్తిస్తున్నాం') ? 'text-amber-900 italic' : displayLocation === 'స్థానం గుర్తింపబడలేదు' ? 'text-red-700' : ''}`}>
                  {displayLocation}
                </p>

                {cityInfo.region !== 'detecting' && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 bg-amber-200 text-amber-950 px-2.5 py-0.5 rounded-full text-xs font-black border border-amber-400">
                      📍 {t('autoCityLabel')} {cityInfo.cityDisplayNameTe}
                    </span>
                    <span className="text-xs font-bold text-stone-600">
                      • {t('autoGpsReady')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between gap-2 flex-wrap border-t border-amber-200">
              <span className="text-xs font-bold text-stone-600">
                {t('locTitle')}:
              </span>
              <button
                id="btn-refresh-auto-gps"
                type="button"
                onClick={handleRefreshLocation}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 text-xs font-black bg-amber-200 hover:bg-amber-300 active:scale-95 text-amber-950 px-3 py-1.5 rounded-xl border border-amber-400 transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{t('autoRefreshGps')}</span>
              </button>
            </div>
          </div>

          {/* 2. Destination Input Section (Enlarged senior-friendly text field) */}
          <div 
            id="auto-destination-card"
            className="bg-white p-5 sm:p-6 rounded-3xl border-3 border-amber-300 shadow-sm space-y-3"
          >
            <label htmlFor="destination-input-field" className="block text-lg sm:text-xl font-black text-amber-950 tracking-wide">
              {t('autoDestPrompt')}
            </label>

            <div className="relative">
              <input
                id="destination-input-field"
                type="text"
                value={destinationText}
                onChange={(e) => setDestinationText(e.target.value)}
                placeholder={t('autoDestPlaceholder')}
                className={`w-full p-5 pr-14 rounded-2xl border-3 text-xl sm:text-2xl font-black transition-all shadow-inner leading-relaxed ${
                  destinationText
                    ? 'bg-amber-50/50 border-amber-500 text-stone-950'
                    : 'bg-white border-stone-300 text-stone-900 placeholder:text-stone-400'
                }`}
              />
              {destinationText && (
                <button
                  type="button"
                  id="btn-clear-destination"
                  onClick={() => {
                    playTapSound();
                    setDestinationText('');
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-2 rounded-xl cursor-pointer active:scale-95"
                  title={t('btnClear')}
                >
                  <X className="w-7 h-7" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Action Booking Section */}
          {indiaRideService === 'ola' ? (
            /* 🛺 Ola Auto Action Buttons */
            <div 
              id="auto-booking-action-card"
              className="space-y-3 pt-1 text-center"
            >
              {/* Post-Open Status Banner */}
              {olaOpened && (
                <div className="bg-emerald-50 border-3 border-emerald-400 rounded-2xl p-4 text-emerald-950 space-y-1 text-left shadow-sm animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    <h4 className="font-black text-emerald-950 text-base sm:text-lg">
                      {language === 'en'
                        ? 'Ola Auto official booking page opened'
                        : language === 'hi'
                        ? 'Ola Auto आधिकारिक बुकिंग पेज खोला गया'
                        : language === 'ta'
                        ? 'Ola Auto அதிகாரப்பூர்வ முன்பதிவு பக்கம் திறக்கப்பட்டது'
                        : 'Ola Auto అధికారిక బుకింగ్ పేజీ తెరవబడింది'}
                    </h4>
                  </div>
                </div>
              )}

              {/* One Large Button: 🟢 Ola Auto */}
              <a
                id="btn-ola-confirm-yes"
                href={olaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleConfirmOlaBooking}
                className="w-full py-5 px-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600 hover:from-emerald-600 hover:to-green-700 active:scale-98 text-white rounded-2xl font-black text-xl sm:text-2xl text-center shadow-xl border-3 border-emerald-700 flex items-center justify-center gap-3 transition-all cursor-pointer min-h-[72px]"
                aria-label="Ola Auto"
              >
                <span>🟢 {language === 'te' ? 'Ola Auto తెరవండి' : language === 'hi' ? 'Ola Auto खोलें' : language === 'ta' ? 'Ola Auto திறக்கவும்' : 'Open Ola Auto'}</span>
                <ExternalLink className="w-6 h-6 text-white/90 shrink-0" />
              </a>

              {/* Cancel Home button */}
              <button
                id="btn-ola-cancel-home"
                type="button"
                onClick={handleReturnToHome}
                className="w-full py-4 px-4 bg-white hover:bg-stone-100 active:scale-98 text-stone-900 rounded-2xl font-black text-lg sm:text-xl text-center shadow-md border-3 border-stone-300 flex items-center justify-center gap-2.5 transition-all cursor-pointer min-h-[64px]"
                aria-label={t('btnCancel')}
              >
                <span>⚪ {language === 'te' ? 'వద్దు — Homeకి వెళ్ళండి' : language === 'hi' ? 'रद्द — होम पर जाएं' : language === 'ta' ? 'ரத்து — முகப்புக்குச் செல்' : 'Cancel — Return Home'}</span>
              </button>

              {/* Option to switch to Uber */}
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setIndiaRideService('uber');
                  speakTelugu('Uber Ride');
                }}
                className="text-xs sm:text-sm font-black text-amber-950 hover:underline pt-2 cursor-pointer block mx-auto"
              >
                {language === 'te' ? '🚗 లేదా Uber Ride బుక్ చేయాలా? ఇక్కడ తాకండి →' : language === 'hi' ? '🚗 या Uber Ride बुक करना है? यहाँ दबाएँ →' : language === 'ta' ? '🚗 அல்லது Uber Ride பதிவு செய்ய வேண்டுமா? இங்கே தட்டவும் →' : '🚗 Or book an Uber Ride instead? Tap here →'}
              </button>
            </div>
          ) : (
            /* 🚗 Uber Ride Action Buttons for India */
            <div 
              id="india-uber-booking-action-card"
              className="space-y-3 pt-1 text-center"
            >
              {/* One Large Button: 🟢 Uber Ride */}
              <a
                id="btn-india-uber-confirm-yes"
                href={uberUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleConfirmUberBooking}
                className="w-full py-5 px-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600 hover:from-emerald-600 hover:to-green-700 active:scale-98 text-white rounded-2xl font-black text-xl sm:text-2xl text-center shadow-xl border-3 border-emerald-700 flex items-center justify-center gap-3 transition-all cursor-pointer min-h-[72px]"
                aria-label="Uber Ride"
              >
                <span>🟢 {language === 'te' ? 'Uber Ride తెరవండి' : language === 'hi' ? 'Uber Ride खोलें' : language === 'ta' ? 'Uber Ride திறக்கவும்' : 'Open Uber Ride'}</span>
                <ExternalLink className="w-6 h-6 text-white/90 shrink-0" />
              </a>

              {/* Cancel Home button */}
              <button
                id="btn-india-uber-cancel-home"
                type="button"
                onClick={handleReturnToHome}
                className="w-full py-4 px-4 bg-white hover:bg-stone-100 active:scale-98 text-stone-900 rounded-2xl font-black text-lg sm:text-xl text-center shadow-md border-3 border-stone-300 flex items-center justify-center gap-2.5 transition-all cursor-pointer min-h-[64px]"
                aria-label={t('btnCancel')}
              >
                <span>⚪ {language === 'te' ? 'వద్దు — Homeకి వెళ్ళండి' : language === 'hi' ? 'रद्द — होम पर जाएं' : language === 'ta' ? 'ரத்து — முகப்புக்குச் செல்' : 'Cancel — Return Home'}</span>
              </button>

              {/* Option to switch back to Ola */}
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setIndiaRideService('ola');
                  speakTelugu('Ola Auto');
                }}
                className="text-xs sm:text-sm font-black text-amber-950 hover:underline pt-2 cursor-pointer block mx-auto"
              >
                {language === 'te' ? '🛺 లేదా Ola Auto బుక్ చేయాలా? ఇక్కడ తాకండి →' : language === 'hi' ? '🛺 या Ola Auto बुक करना है? यहाँ दबाएँ →' : language === 'ta' ? '🛺 அல்லது Ola Auto பதிவு செய்ய வேண்டுமா? இங்கே தட்டவும் →' : '🛺 Or book an Ola Auto instead? Tap here →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* ---------------- 🇺🇸 ONLY USA: UBER RIDE --------------------- */}
      {/* ============================================================= */}
      {selectedCountry === 'USA' && (
        <div id="section-usa-uber" className="space-y-4">
          {/* Header Card */}
          <div 
            id="usa-uber-title-card"
            className="bg-gradient-to-r from-stone-900 via-zinc-800 to-black text-white p-4 sm:p-5 rounded-3xl shadow-md border-3 border-stone-700 flex items-center gap-4"
          >
            <div className="w-16 h-16 bg-white text-stone-950 rounded-2xl flex items-center justify-center shrink-0 shadow-inner text-3xl font-black">
              🚗
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`font-black text-white tracking-tight ${isLargeFont ? 'text-3xl' : 'text-2xl'}`}>
                {t('homeCardAutoTitleUsa')}
              </h2>
              <p className="font-bold text-stone-300 text-xs sm:text-sm mt-0.5">
                {t('homeCardAutoSubUsa')}
              </p>
            </div>
          </div>

          {/* 1. SINGLE CURRENT GPS PICKUP LOCATION */}
          <div 
            id="uber-pickup-location-card"
            className="bg-stone-50 border-3 border-stone-300 rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-stone-900 text-white rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-xl font-black">
                📍
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-stone-800">
                    {t('autoPickupLoc')}:
                  </span>
                  {isLocating && (
                    <span className="text-xs font-bold text-blue-800 animate-pulse flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      {t('locFetching')}
                    </span>
                  )}
                </div>
                
                <p className={`font-black text-stone-950 mt-1.5 leading-snug break-words ${isLargeFont ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`}>
                  {displayLocation}
                </p>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 bg-stone-200 text-stone-900 px-2.5 py-0.5 rounded-full text-xs font-black border border-stone-300">
                    🇺🇸 USA GPS Location
                  </span>
                  <span className="text-xs font-bold text-stone-600">
                    • {t('autoGpsReady')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between gap-2 flex-wrap border-t border-stone-200">
              <span className="text-xs font-bold text-stone-600">
                {t('locTitle')}:
              </span>
              <button
                id="btn-refresh-uber-gps"
                type="button"
                onClick={handleRefreshLocation}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 text-xs font-black bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-900 px-3 py-1.5 rounded-xl border border-stone-400 transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{t('autoRefreshGps')}</span>
              </button>
            </div>
          </div>

          {/* 2. Destination Input Section */}
          <div 
            id="uber-destination-card"
            className="bg-white p-5 sm:p-6 rounded-3xl border-3 border-stone-300 shadow-sm space-y-3"
          >
            <label htmlFor="uber-destination-input" className="block text-lg sm:text-xl font-black text-stone-900 tracking-wide">
              {t('autoDestPrompt')}
            </label>

            <div className="relative">
              <input
                id="uber-destination-input"
                type="text"
                value={destinationText}
                onChange={(e) => setDestinationText(e.target.value)}
                placeholder={t('autoDestPlaceholder')}
                className={`w-full p-5 pr-14 rounded-2xl border-3 text-xl sm:text-2xl font-black transition-all shadow-inner leading-relaxed ${
                  destinationText
                    ? 'bg-stone-50 border-stone-700 text-stone-950'
                    : 'bg-white border-stone-300 text-stone-900 placeholder:text-stone-400'
                }`}
              />
              {destinationText && (
                <button
                  type="button"
                  id="btn-clear-uber-destination"
                  onClick={() => {
                    playTapSound();
                    setDestinationText('');
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-2 rounded-xl cursor-pointer active:scale-95"
                  title={t('btnClear')}
                >
                  <X className="w-7 h-7" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Uber Ride Action Section */}
          <div 
            id="uber-booking-action-card"
            className="space-y-3 pt-1 text-center"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* 🟢 Uber Ride */}
              <a
                id="btn-uber-confirm-yes"
                href={uberUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleConfirmUberBooking}
                className="py-4 sm:py-5 px-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600 hover:from-emerald-600 hover:to-green-700 active:scale-98 text-white rounded-2xl font-black text-xl sm:text-2xl text-center shadow-lg border-3 border-emerald-700 flex items-center justify-center gap-2.5 transition-all cursor-pointer min-h-[72px]"
                aria-label="Uber Ride"
              >
                <span>🟢 {language === 'te' ? 'Uber Ride తెరవండి' : language === 'hi' ? 'Uber Ride खोलें' : language === 'ta' ? 'Uber Ride திறக்கவும்' : 'Open Uber Ride'}</span>
                <ExternalLink className="w-5 h-5 text-white/80 shrink-0" />
              </a>

              {/* ⚪ Cancel / Home */}
              <button
                id="btn-uber-cancel-home"
                type="button"
                onClick={handleReturnToHome}
                className="py-4 sm:py-5 px-4 bg-white hover:bg-stone-100 active:scale-98 text-stone-900 rounded-2xl font-black text-xl sm:text-2xl text-center shadow-md border-3 border-stone-300 flex items-center justify-center gap-2.5 transition-all cursor-pointer min-h-[72px]"
                aria-label={t('btnCancel')}
              >
                <span>⚪ {language === 'te' ? 'వద్దు — Homeకి వెళ్ళండి' : language === 'hi' ? 'रद्द — होम पर जाएं' : language === 'ta' ? 'ரத்து — முகப்புக்குச் செல்' : 'Cancel — Return Home'}</span>
              </button>
            </div>

            {/* Direct fallback / app links */}
            <div className="pt-2 flex flex-col items-center gap-2">
              <a
                id="btn-uber-app-direct-usa"
                href={uberAppUrl}
                onClick={handleConfirmUberBooking}
                className="text-xs sm:text-sm font-black text-stone-800 hover:text-black bg-stone-100 hover:bg-stone-200 py-1.5 px-3 rounded-lg border border-stone-300 transition-all cursor-pointer shadow-xs"
              >
                📱 Uber App Installed? Tap to open in App directly
              </a>
              <a
                href={uberUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm font-black text-stone-700 hover:text-stone-950 underline cursor-pointer"
              >
                🔗 Open Uber Website (Web Booking with GPS)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Home Button */}
      <div className="pt-2">
        <HomeButton onGoHome={handleReturnToHome} isLargeFont={isLargeFont} />
      </div>
    </div>
  );
};
