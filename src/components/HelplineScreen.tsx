import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HomeButton } from './HomeButton';
import { 
  Phone, 
  Volume2, 
  ShieldCheck, 
  Clock, 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  MapPin, 
  RefreshCw, 
  HeartHandshake,
  Navigation,
  Compass,
  AlertCircle
} from 'lucide-react';
import { playTapSound, speakTelugu } from '../utils/audio';
import { 
  US_PRIMARY_HELPLINES, 
  US_NATIONAL_ADDITIONAL_RESOURCES,
  resolveUSStateCode, 
  isLocationInUSA,
  StateSeniorResources
} from '../utils/usSeniorServices';
import { CountryCode } from './CountrySelector';
import { useLanguage } from '../utils/i18n';

export interface ElderlyHome {
  id: string;
  name: string;
  lat: number;
  lng: number;
  phone: string;
  address: string;
  country: string;
  category: string;
  badgeTe: string;
  distanceMiles: number;
  distanceKm: number;
  directionsUrl: string;
}

interface IndiaSeniorHelpline {
  id: string;
  nameTe: string;
  nameEn: string;
  phone: string;
  emoji: string;
  badgeTe: string;
  hoursTe: string;
  descriptionTe: string;
  buttonLabelTe: string;
}

/**
 * 🇮🇳 Verified Official Senior-Citizen Support & Elderly Welfare Helplines for India
 * (Zero general emergency / ambulance / police numbers)
 */
const INDIA_ADDITIONAL_SENIOR_HELPLINES: IndiaSeniorHelpline[] = [
  {
    id: 'in-helpage',
    nameTe: 'హెల్ప్‌ఏజ్ ఇండియా — వృద్ధుల సంరక్షణ & ఆసరా',
    nameEn: 'HelpAge India National Senior Citizens Helpline',
    phone: '1800-180-1253',
    emoji: '🧓',
    badgeTe: 'జాతీయ గుర్తింపు పొందిన సంస్థ • టోల్ ఫ్రీ',
    hoursTe: 'ఉదయం 9:00 - సాయంత్రం 6:00',
    descriptionTe: 'వృద్ధుల సంరక్షణ, కౌన్సిలింగ్, ఆత్మీయ సంభాషణ, వృద్ధుల హక్కులు, మరియు వేధింపుల నివారణకు దేశవ్యాప్త ఉచిత సేవ.',
    buttonLabelTe: '1800-180-1253 కి కాల్ చేయండి',
  },
  {
    id: 'in-dignity',
    nameTe: 'డిగ్నిటీ ఫౌండేషన్ — సీనియర్ సిటిజన్స్ హెల్ప్‌లైన్',
    nameEn: 'Dignity Foundation Senior Citizens Helpline',
    phone: '1800-267-8780',
    emoji: '🤝',
    badgeTe: 'వృద్ధుల గౌరవప్రద జీవనం • టోల్ ఫ్రీ',
    hoursTe: 'సోమ - శని: 10:00 AM - 5:00 PM',
    descriptionTe: 'ఒంటరితనంతో బాధపడే వృద్ధులకు స్నేహపూర్వక సహచర్యం, భావోద్వేగ ఆసరా, మరియు జీవన నాణ్యత మెరుగుదల కౌన్సిలింగ్.',
    buttonLabelTe: '1800-267-8780 కి కాల్ చేయండి',
  },
  {
    id: 'in-agewell',
    nameTe: 'ఏజ్‌వెల్ ఫౌండేషన్ — వృద్ధుల సంక్షేమ సేవలు',
    nameEn: 'Agewell Foundation Helpline for Older Persons',
    phone: '011-29836486',
    emoji: '🏛️',
    badgeTe: 'ఐక్యరాజ్యసమితి గుర్తింపు పొందిన NGO',
    hoursTe: 'కార్యాలయ వేళలు (సోమ - శుక్ర)',
    descriptionTe: 'వృద్ధుల చట్టపరమైన సలహాలు, ఆర్థిక మార్గదర్శకత్వం, ఆరోగ్య సంరక్షణ సలహాలు మరియు ఒంటరితన నివారణ సహాయం.',
    buttonLabelTe: '011-29836486 కి కాల్ చేయండి',
  },
  {
    id: 'in-telemanas',
    nameTe: 'టెలి-మానస్ — వృద్ధుల మానసిక ఆరోగ్య ఆసరా',
    nameEn: 'Tele-MANAS National Mental Health Helpline (Govt of India)',
    phone: '14416',
    emoji: '🧠',
    badgeTe: 'భారత ప్రభుత్వం • 24/7 ఉచిత సేవ',
    hoursTe: '24 గంటలు అందుబాటులో ఉంటుంది',
    descriptionTe: 'నిద్రలేమి, ఆందోళన, ఒంటరితనం లేదా మానసిక భయాలు ఉన్న వృద్ధుల కోసం భారత ప్రభుత్వం ఏర్పాటు చేసిన ఉచిత టెలి-కౌన్సెలింగ్.',
    buttonLabelTe: '14416 కి కాల్ చేయండి',
  },
];

interface HelplineScreenProps {
  onGoHome: () => void;
  isLargeFont: boolean;
  currentAddress?: string;
  lat?: number | null;
  lng?: number | null;
  onRefreshLocation?: () => void;
  selectedCountry?: CountryCode;
}

export const HelplineScreen: React.FC<HelplineScreenProps> = ({
  onGoHome,
  isLargeFont,
  currentAddress,
  lat,
  lng,
  onRefreshLocation,
  selectedCountry,
}) => {
  const { language, t } = useLanguage();
  // Detected location details
  const [detectedCity, setDetectedCity] = useState<string>('');
  const [detectedState, setDetectedState] = useState<string>('');
  const [detectedCountry, setDetectedCountry] = useState<string>('');
  const [detectedCountryCode, setDetectedCountryCode] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Local state senior resources (e.g. CA, TX, NY)
  const [stateResources, setStateResources] = useState<StateSeniorResources | null>(null);

  // Nearby Verified Elderly Homes / Old Age Homes state
  const [elderlyHomes, setElderlyHomes] = useState<ElderlyHome[]>([]);
  const [isLoadingHomes, setIsLoadingHomes] = useState<boolean>(true);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(
    lat != null && lng != null && !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null
  );

  const prevCoordsRef = useRef<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  // Determine active country
  const detectedIsUSA = useMemo(() => {
    return isLocationInUSA(lat, lng, currentAddress, detectedCountryCode);
  }, [lat, lng, currentAddress, detectedCountryCode]);

  const activeCountry = selectedCountry || (detectedIsUSA ? 'USA' : 'IN');

  // Fetch Nearby Verified Elderly Homes from server using GPS coordinates
  const fetchNearbyElderlyHomes = useCallback(async (latitude: number, longitude: number, country: string) => {
    setIsLoadingHomes(true);
    try {
      const res = await fetch(`/api/nearby-elderly-homes?lat=${latitude}&lng=${longitude}&country=${country}`);
      if (res.ok) {
        const data = await res.json();
        const homes = Array.isArray(data.homes) ? data.homes : [];
        setElderlyHomes(homes);
      } else {
        setElderlyHomes([]);
      }
    } catch {
      setElderlyHomes([]);
    } finally {
      setIsLoadingHomes(false);
    }
  }, []);

  // Resolve location city, state & country dynamically using fresh GPS
  const resolveLocationDetails = useCallback(async (latitude: number, longitude: number) => {
    setIsLocating(true);
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`);
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};

        const city = addr.city || addr.town || addr.village || addr.suburb || addr.state_district || addr.county || '';
        const state = addr.state || '';
        const country = addr.country || '';
        const countryCode = (addr.country_code || '').toLowerCase();

        setDetectedCity(city);
        setDetectedState(state);
        setDetectedCountry(country);
        setDetectedCountryCode(countryCode);

        // Check if in US State for state-level Aging resources
        const resState = resolveUSStateCode(state, `${city}, ${state}`);
        if (resState) {
          setStateResources(resState);
        } else {
          setStateResources(null);
        }
        setIsLocating(false);
        return;
      }
    } catch {
      // Fallback below
    }

    // Secondary fallback using BigDataCloud
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=te`
      );
      if (bdcRes.ok) {
        const bdc = await bdcRes.json();
        const city = bdc.locality || bdc.city || '';
        const state = bdc.principalSubdivision || '';
        const country = bdc.countryName || '';
        const countryCode = (bdc.countryCode || '').toLowerCase();

        setDetectedCity(city);
        setDetectedState(state);
        setDetectedCountry(country);
        setDetectedCountryCode(countryCode);

        const resState = resolveUSStateCode(state, `${city}, ${state}`);
        if (resState) {
          setStateResources(resState);
        } else {
          setStateResources(null);
        }
        setIsLocating(false);
        return;
      }
    } catch {
      // Ignore
    }

    setIsLocating(false);
  }, []);

  // Fresh GPS location on screen mount and on significant movement
  useEffect(() => {
    let isCancelled = false;

    const applyCoordinates = (latitude: number, longitude: number) => {
      if (isCancelled) return;
      const prev = prevCoordsRef.current;
      const hasChanged =
        prev.lat == null ||
        prev.lng == null ||
        Math.abs(prev.lat - latitude) > 0.001 ||
        Math.abs(prev.lng - longitude) > 0.001;

      if (hasChanged) {
        prevCoordsRef.current = { lat: latitude, lng: longitude };
        setCurrentCoords({ lat: latitude, lng: longitude });
        resolveLocationDetails(latitude, longitude);
        fetchNearbyElderlyHomes(latitude, longitude, activeCountry);
      }
    };

    // If props lat/lng are already available, apply immediately
    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      applyCoordinates(lat, lng);
    }

    // Always fetch fresh GPS coordinates on screen open with maximumAge: 0
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          applyCoordinates(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setIsLocating(false);
          setIsLoadingHomes(false);
          if (currentAddress && currentAddress.toLowerCase().includes('usa')) {
            setDetectedCountryCode('us');
            setDetectedCountry('USA');
          } else {
            setDetectedCountryCode('in');
            setDetectedCountry('భారతదేశం (India)');
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
      );
    }
  }, [lat, lng, resolveLocationDetails, fetchNearbyElderlyHomes, currentAddress, activeCountry]);

  // Voice introduction on screen open or country change
  useEffect(() => {
    if (activeCountry === 'USA') {
      speakTelugu(
        'అమెరికా వృద్ధుల హెల్ప్‌లైన్లు మరియు సేవల పేజీ. మీ ప్రాంతంలో ధృవీకరించిన సీనియర్ హోమ్స్, ఎల్డర్‌కేర్ లొకేటర్ 1-800-677-1116, మరియు వృద్ధుల ఫ్రెండ్‌షిప్ లైన్ అందుబాటులో ఉన్నాయి.',
        { delayMs: 300 }
      );
    } else {
      speakTelugu(
        'వృద్ధుల హెల్ప్‌లైన్ మరియు సంక్షేమ పేజీ. మీ ప్రస్తుత ప్రాంతం ప్రకారం ధృవీకరించిన వృద్ధాశ్రమాలు మరియు వృద్ధుల జాతీయ ఉచిత హెల్ప్‌లైన్ 14567 కింద అందుబాటులో ఉన్నాయి.',
        { delayMs: 300 }
      );
    }
  }, [activeCountry]);

  // Voice guide explanation button
  const handleVoiceGuide = () => {
    playTapSound();
    if (activeCountry === 'USA') {
      speakTelugu(
        'అమెరికా వృద్ధుల సేవలు: మీ ప్రస్తుత ప్రాంతం ఆధారంగా సమీపంలోని సీనియర్ హోమ్స్ పైన కనిపిస్తాయి. కాల్ చేయడానికి లేదా గూగుల్ మ్యాప్స్ దారి చూడటానికి బటన్లు ఉన్నాయి. వృద్ధుల సంక్షేమ సహాయానికి ఎల్డర్‌కేర్ లొకేటర్ 1-800-677-1116, మానసిక ఆసరాకు ఫ్రెండ్‌షిప్ లైన్ 1-800-971-0016 అందుబాటులో ఉన్నాయి.'
      );
    } else {
      speakTelugu(
        'వృద్ధుల సహాయ సేవలు: మీ ప్రస్తుత ప్రాంతం ప్రకారం సమీపంలో ఉన్న ధృవీకరించిన వృద్ధాశ్రమాలు, చిరునామా, దూరం మరియు ఫోన్ నంబర్లు పైన కనిపిస్తాయి. మాట్లాడటానికి కాల్ బటన్, దారి చూడటానికి దారి చూపించు బటన్ నొక్కండి. ప్రభుత్వ ఉచిత వృద్ధుల జాతీయ హెల్ప్‌లైన్ 14567 కు ఎప్పుడైనా ఉచితంగా కాల్ చేయవచ్చు.'
      );
    }
  };

  // Safe manual Call button handler
  const handleInitiateCall = (serviceNameTe: string, phoneNumber: string) => {
    playTapSound();
    speakTelugu(`${serviceNameTe} కు కాల్ కలుపుతున్నాం.`);
  };

  const handleDirectionsClick = (homeName: string) => {
    playTapSound();
    speakTelugu(`${homeName} కు గూగుల్ మ్యాప్స్ దారి తెరుస్తున్నాం.`);
  };

  const handleManualLocationRefresh = () => {
    playTapSound();
    speakTelugu('మీ ప్రస్తుత ప్రాంతాన్ని తిరిగి గుర్తిస్తున్నాం.');
    if (onRefreshLocation) {
      onRefreshLocation();
    }
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setIsLocating(true);
      setIsLoadingHomes(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          prevCoordsRef.current = { lat: newLat, lng: newLng };
          setCurrentCoords({ lat: newLat, lng: newLng });
          resolveLocationDetails(newLat, newLng);
          fetchNearbyElderlyHomes(newLat, newLng, activeCountry);
        },
        () => {
          setIsLocating(false);
          setIsLoadingHomes(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  };

  // State-specific official Senior Citizens Welfare department for Andhra Pradesh or Telangana
  const stateSpecificHelpline = useMemo(() => {
    const st = (detectedState || '').toLowerCase();
    const addr = (currentAddress || '').toLowerCase();
    const isAP = st.includes('andhra') || st.includes('ఆంధ్ర') || addr.includes('andhra') || addr.includes('gudivada') || addr.includes('kankipadu') || addr.includes('vijayawada') || addr.includes('guntur');
    const isTS = st.includes('telangana') || st.includes('తెలంగాణ') || addr.includes('telangana') || addr.includes('hyderabad') || addr.includes('secunderabad');

    if (isAP) {
      return {
        id: 'in-ap-welfare',
        nameTe: 'ఆంధ్రప్రదేశ్ వృద్ధుల సంక్షేమ శాఖ (AP Senior Citizens Welfare)',
        nameEn: 'Directorate of Senior Citizens & Disabled Welfare, Govt of Andhra Pradesh',
        phone: '0866-2482202',
        emoji: '🏛️',
        badgeTe: 'ఆంధ్రప్రదేశ్ ప్రభుత్వం • అధికారిక విభాగం',
        hoursTe: 'ఉదయం 10:00 - సాయంత్రం 5:00 (సోమ - శుక్ర)',
        descriptionTe: 'ఆంధ్రప్రదేశ్ రాష్ట్ర ప్రభుత్వం ఆధ్వర్యంలో వృద్ధుల సంరక్షణ, సంక్షేమ పథకాలు, పెన్షన్లు మరియు వృద్ధాశ్రమాల పర్యవేక్షణ అధికారిక విభాగం.',
        buttonLabelTe: '0866-2482202 కి కాల్ చేయండి',
      };
    }

    if (isTS) {
      return {
        id: 'in-ts-welfare',
        nameTe: 'తెలంగాణ వృద్ధుల సంక్షేమ విభాగం (Telangana Senior Citizens Welfare)',
        nameEn: 'Department for Senior Citizens, Govt of Telangana',
        phone: '040-23222380',
        emoji: '🏛️',
        badgeTe: 'తెలంగాణ ప్రభుత్వం • అధికారిక విభాగం',
        hoursTe: 'ఉదయం 10:30 - సాయంత్రం 5:00 (సోమ - శుక్ర)',
        descriptionTe: 'తెలంగాణ రాష్ట్ర ప్రభుత్వ వృద్ధుల సంక్షేమ విభాగం — వృద్ధుల సంరక్షణ, హక్కులు, మరియు ఆసరా పథకాల సహాయం.',
        buttonLabelTe: '040-23222380 కి కాల్ చేయండి',
      };
    }

    return null;
  }, [detectedState, currentAddress]);

  return (
    <div className="p-3 sm:p-5 max-w-2xl mx-auto space-y-5 pb-20">
      {/* Top Bar with Home and Speech Guide */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
        </div>
        <button
          id="helpline-voice-guide-btn"
          onClick={handleVoiceGuide}
          type="button"
          className="p-3.5 bg-amber-100 text-amber-950 hover:bg-amber-200 rounded-2xl border-2 border-amber-300 font-bold active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          title="సహాయక స్వరం (వాయిస్ గైడ్)"
          aria-label="సహాయక స్వరం వినండి"
        >
          <Volume2 className="w-7 h-7 text-amber-900" />
          <span className="hidden sm:inline text-xs font-black">వాయిస్ సహాయం</span>
        </button>
      </div>

      {/* Screen Title Card */}
      <div 
        id="helpline-title-card"
        className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-4 sm:p-5 rounded-3xl shadow-lg border-3 border-amber-800 flex items-center gap-4"
      >
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-white/30 text-3xl">
          {activeCountry === 'USA' ? '🇺🇸' : '🧓'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 bg-white/25 px-2.5 py-0.5 rounded-full text-xs font-black text-white mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Verified Senior Services (Senior Support Only)' : language === 'hi' ? 'सत्यापित वरिष्ठ नागरिक सेवाएँ' : language === 'ta' ? 'சரிபார்க்கப்பட்ட முதியோர் சேவைகள்' : 'ధృవీకరించిన వృద్ధుల సేవలు (Senior Support Only)'}</span>
          </div>
          <h2 className={`font-black text-white tracking-tight ${isLargeFont ? 'text-3xl' : 'text-2xl'}`}>
            {activeCountry === 'USA' ? (language === 'te' ? 'వృద్ధుల ఆసరా & సంరక్షణ నిలయాలు (USA)' : 'Elderly Support & Senior Homes') : t('homeCardHelplineTitle')}
          </h2>
          <p className="text-amber-100 font-bold text-xs sm:text-sm mt-0.5">
            {activeCountry === 'USA'
              ? (language === 'te' ? 'అధికారిక వృద్ధుల సంక్షేమ శాఖ & ఆసరా కేంద్రాలు' : 'Official Senior Citizen Welfare, Elder Care Homes & Aging Support')
              : t('homeCardHelplineSub')}
          </p>
        </div>
      </div>

      {/* GPS Location Area Card */}
      <div 
        id="helpline-location-card"
        className="bg-white p-4 rounded-2xl border-2 border-stone-200 shadow-sm flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-stone-500 uppercase tracking-wider">
              ప్రస్తుత ప్రాంతం (Your Location):
            </p>
            <p className="text-sm sm:text-base font-black text-stone-900 truncate">
              {isLocating
                ? 'ప్రాంతాన్ని గుర్తిస్తున్నాం...'
                : detectedCity || detectedState
                ? `${detectedCity ? detectedCity + ', ' : ''}${detectedState} (${detectedCountry || (activeCountry === 'USA' ? 'USA' : 'India')})`
                : currentAddress && currentAddress !== 'స్థానాన్ని గుర్తిస్తున్నాం...'
                ? currentAddress
                : activeCountry === 'USA' ? 'United States' : 'భారతదేశం'}
            </p>
          </div>
        </div>

        <button
          id="btn-refresh-helpline-location"
          type="button"
          onClick={handleManualLocationRefresh}
          className="p-2.5 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-xl transition-colors active:scale-95 border border-stone-300 shrink-0 cursor-pointer flex items-center gap-1.5"
          title="లొకేషన్ తిరిగి గుర్తించండి"
          aria-label="లొకేషన్ తిరిగి గుర్తించండి"
        >
          <RefreshCw className={`w-5 h-5 ${isLocating || isLoadingHomes ? 'animate-spin text-amber-600' : ''}`} />
          <span className="hidden sm:inline text-xs font-black">రిఫ్రెష్</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* 1. 🏠 NEARBY VERIFIED OLD AGE HOMES / SENIOR CITIZEN HOMES   */}
      {/* ============================================================= */}
      <div id="section-elderly-homes" className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-amber-700" />
            <h3 className={`font-black text-stone-950 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
              {activeCountry === 'USA'
                ? (language === 'te' ? '🏠 సమీప వృద్ధాశ్రమాలు & ఆసరా కేంద్రాలు (USA)' : '🏠 Nearby Verified Senior Living & Elder Homes')
                : (language === 'en' ? '🏠 Nearby Verified Old Age Homes & Elder Centers' : language === 'hi' ? '🏠 निकटतम सत्यापित वृद्धाश्रम एवं सहायता केंद्र' : language === 'ta' ? '🏠 அருகிலுள்ள சரிபார்க்கப்பட்ட முதியோர் இல்லங்கள்' : '🏠 సమీప ధృవీకరించిన వృద్ధాశ్రమాలు & ఆసరా కేంద్రాలు')}
            </h3>
          </div>
          <span className="bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black px-2.5 py-1 rounded-full">
            {detectedCity || detectedState || (activeCountry === 'USA' ? 'Local Area' : 'మీ ప్రాంతం')}
          </span>
        </div>

        <p className="text-xs sm:text-sm font-bold text-stone-600 -mt-1">
          {activeCountry === 'USA'
            ? 'Verified senior care homes and assisted living communities based on your live GPS coordinates:'
            : 'మీ ప్రస్తుత GPS స్థానం ఆధారంగా సమీపంలో ఉన్న ధృవీకరించిన వృద్ధుల ఆశ్రమాలు:'}
        </p>

        {/* Loading State */}
        {isLoadingHomes && (
          <div className="bg-amber-50/70 border-2 border-dashed border-amber-300 p-6 rounded-3xl text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
            <p className="font-black text-amber-950 text-base">
              మీ ప్రస్తుత ప్రాంతంలో వృద్ధాశ్రమాలను శోధిస్తున్నాం...
            </p>
            <p className="text-xs font-bold text-amber-800">
              లైవ్ GPS లొకేషన్ ఆధారంగా ధృవీకరించిన కేంద్రాలు తనిఖీ చేయబడుతున్నాయి.
            </p>
          </div>
        )}

        {/* Empty State: Explicit message required by user prompt */}
        {!isLoadingHomes && elderlyHomes.length === 0 && (
          <div 
            id="empty-elderly-homes-card"
            className="bg-stone-50 border-3 border-stone-300 p-6 rounded-3xl text-center space-y-3 shadow-xs"
          >
            <div className="w-14 h-14 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              🏠
            </div>
            <div className="space-y-1">
              <h4 className="text-base sm:text-lg font-black text-stone-900">
                ఈ ప్రాంతంలో ధృవీకరించిన వృద్ధుల సేవలు ప్రస్తుతం కనుగొనబడలేదు
              </h4>
              <p className="text-xs sm:text-sm font-bold text-stone-600 max-w-md mx-auto">
                {activeCountry === 'USA'
                  ? 'No verified senior citizen homes found within your immediate radius. Please use the official Eldercare Locator below for comprehensive assistance.'
                  : 'మీ ప్రస్తుత ప్రాంతంలో నేరుగా నమోదైన వృద్ధాశ్రమాలు కనుగొనబడలేదు. ఏదైనా సహాయం లేదా ఆసరా కోసం క్రింది జాతీయ వృద్ధుల ఉచిత హెల్ప్‌లైన్ 14567 కు ఉచితంగా కాల్ చేయవచ్చు.'}
              </p>
            </div>
            <div className="pt-1">
              <a
                href={activeCountry === 'USA' ? 'tel:18006771116' : 'tel:14567'}
                onClick={() => handleInitiateCall(activeCountry === 'USA' ? 'Eldercare Locator' : 'వృద్ధుల జాతీయ హెల్ప్‌లైన్ 14567', activeCountry === 'USA' ? '1-800-677-1116' : '14567')}
                className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-black rounded-xl text-sm border-2 border-amber-600 shadow-sm cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>{activeCountry === 'USA' ? 'Call Eldercare: 1-800-677-1116' : 'ఉచిత హెల్ప్‌లైన్ 14567 కు కాల్ చేయండి'}</span>
              </a>
            </div>
          </div>
        )}

        {/* List of Verified Nearby Elderly Homes */}
        {!isLoadingHomes && elderlyHomes.length > 0 && (
          <div className="space-y-3.5">
            {elderlyHomes.map((home, index) => {
              const directionsLink = home.directionsUrl || (currentCoords 
                ? `https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lng}&destination=${home.lat},${home.lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(home.name + ' ' + home.address)}`);

              return (
                <div
                  key={home.id || `home-${index}`}
                  id={`card-${home.id}`}
                  className="bg-white border-3 border-stone-200 hover:border-amber-400 rounded-3xl p-5 shadow-md transition-all space-y-3"
                >
                  {/* Home Header & Badge */}
                  <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner border border-amber-300">
                        🏠
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-full text-xs font-black border border-amber-300 mb-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{home.badgeTe || 'ధృవీకరించిన వృద్ధాశ్రమం'}</span>
                        </div>
                        <h4 className={`font-black text-stone-950 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
                          {home.name}
                        </h4>
                      </div>
                    </div>

                    {/* Live GPS Distance Tag */}
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 font-mono text-sm sm:text-base font-black text-amber-950 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                        <MapPin className="w-3.5 h-3.5 text-amber-700" />
                        <span>{home.distanceKm} {language === 'en' ? 'km' : language === 'hi' ? 'कि.मी.' : language === 'ta' ? 'கி.மீ' : 'కి.మీ'} ({home.distanceMiles} {language === 'en' ? 'miles' : language === 'hi' ? 'मील' : language === 'ta' ? 'மைல்கள்' : 'మైళ్ళు'})</span>
                      </span>
                    </div>
                  </div>

                  {/* Verified Address */}
                  {home.address && (
                    <div className="text-xs sm:text-sm font-bold text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                      <span>{home.address}</span>
                    </div>
                  )}

                  {/* Verified Phone Display */}
                  {home.phone && (
                    <div className="flex items-center justify-between gap-2 px-1">
                      <span className="text-xs font-black text-stone-500 uppercase tracking-wider">
                        {language === 'en' ? 'Phone Number:' : language === 'hi' ? 'फोन नंबर:' : language === 'ta' ? 'தொலைபேசி எண்:' : 'ఫోన్ నంబర్ (Phone):'}
                      </span>
                      <span className="font-mono text-base sm:text-lg font-black text-stone-950">
                        {home.phone}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons: 1. Big Call Button & 2. Big Directions Button */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* Call Button */}
                    {home.phone ? (
                      <a
                        id={`btn-call-home-${home.id}`}
                        href={`tel:${home.phone.replace(/[^0-9]/g, '')}`}
                        onClick={() => handleInitiateCall(home.name, home.phone)}
                        className="py-3.5 px-4 rounded-xl font-black text-base sm:text-lg text-center shadow-md border-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white border-emerald-800 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                        aria-label={`Call ${home.name}`}
                      >
                        <Phone className="w-5 h-5 shrink-0" />
                        <span>{language === 'en' ? 'Call Now' : language === 'hi' ? 'कॉल करें' : language === 'ta' ? 'அழைக்கவும்' : 'కాల్ చేయండి'}</span>
                      </a>
                    ) : (
                      <div className="py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-center bg-stone-100 text-stone-500 border border-stone-300 flex items-center justify-center">
                        {language === 'en' ? 'Phone not available' : language === 'hi' ? 'फोन नंबर उपलब्ध नहीं है' : language === 'ta' ? 'தொலைபேசி எண் இல்லை' : 'ఫోన్ నంబర్ అందుబాటులో లేదు'}
                      </div>
                    )}

                    {/* Directions Button */}
                    <a
                      id={`btn-directions-home-${home.id}`}
                      href={directionsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleDirectionsClick(home.name)}
                      className="py-3.5 px-4 rounded-xl font-black text-base sm:text-lg text-center shadow-md border-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white border-indigo-900 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                      aria-label={`Directions to ${home.name}`}
                    >
                      <Navigation className="w-5 h-5 shrink-0" />
                      <span>{language === 'en' ? 'Get Directions' : language === 'hi' ? 'रास्ता देखें' : language === 'ta' ? 'வழி காட்டு' : 'దారి చూపించు (Directions)'}</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 2. 📞 VERIFIED SENIOR WELFARE HELPLINES                      */}
      {/* ============================================================= */}

      {/* ----------------- 🇮🇳 ONLY INDIA SENIOR HELPLINES ------------ */}
      {activeCountry === 'IN' && (
        <div id="india-helplines-container" className="space-y-5 pt-2">
          {/* Primary Elderline 14567 Card */}
          <div 
            id="elderline-main-card"
            className="bg-gradient-to-b from-amber-50 to-orange-50 p-5 sm:p-6 rounded-3xl border-3 border-amber-500 shadow-lg space-y-4"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-amber-200 text-amber-950 px-3 py-1 rounded-full text-xs font-black border border-amber-400 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-800" />
                  <span>{language === 'en' ? 'Verified Government Helpline (National)' : language === 'hi' ? 'सत्यापित सरकारी हेल्पलाइन' : language === 'ta' ? 'சரிபார்க்கப்பட்ட அரசு உதவி எண்' : 'ధృవీకరించబడిన ప్రభుత్వ హెల్ప్‌లైన్ (Verified Govt)'}</span>
                </div>
                <h3 className={`font-black text-amber-950 ${isLargeFont ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
                  {language === 'en' ? 'National Elder Helpline (Elder Line)' : language === 'hi' ? 'राष्ट्रीय वृद्ध हेल्पलाइन (Elder Line)' : language === 'ta' ? 'தேசிய முதியோர் உதவி எண் (Elder Line)' : 'వృద్ధుల జాతీయ హెల్ప్‌లైన్ (Elder Line)'}
                </h3>
                <p className="text-xs sm:text-sm font-bold text-amber-800 mt-0.5">
                  {detectedState || detectedCity
                    ? `📍 ${detectedCity ? detectedCity + ', ' : ''}${detectedState} — ${language === 'en' ? 'Govt of India Free Service' : language === 'hi' ? 'भारत सरकार की मुफ्त सेवा' : language === 'ta' ? 'இந்திய அரசின் இலவச சேவை' : 'భారత ప్రభుత్వ ఉచిత సేవ'}`
                    : (language === 'en' ? 'Ministry of Social Justice & Empowerment, Govt of India' : language === 'hi' ? 'सामाजिक न्याय एवं अधिकारिता मंत्रालय, भारत सरकार' : language === 'ta' ? 'சமூக நீதி மற்றும் அதிகாரமளித்தல் அமைச்சகம், இந்திய அரசு' : 'సామాజిక న్యాయ & సాధికారత మంత్రిత్వ శాఖ, భారత ప్రభుత్వం')}
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-white text-stone-800 px-3 py-1.5 rounded-full text-xs font-black border border-amber-300 shadow-xs">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{language === 'en' ? '8:00 AM - 8:00 PM' : language === 'hi' ? 'सुबह 8:00 - रात 8:00' : language === 'ta' ? 'காலை 8:00 - இரவு 8:00' : 'ఉదయం 8:00 - రాత్రి 8:00'}</span>
              </div>
            </div>

            {/* Clear Verified Number Display */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-amber-300 text-center shadow-inner space-y-1">
              <p className="text-xs sm:text-sm font-black text-stone-600 uppercase tracking-wider">
                {language === 'en' ? 'Helpline Toll-Free Number:' : language === 'hi' ? 'टोल-फ्री नंबर:' : language === 'ta' ? 'கட்டணமில்லா தொலைபேசி எண்:' : 'హెల్ప్‌లైన్ టోల్ ఫ్రీ నంబర్ (Toll-Free Number):'}
              </p>
              <div className="text-5xl sm:text-6xl font-black text-amber-950 tracking-widest font-mono py-1">
                14567
              </div>
              <p className="text-xs sm:text-sm font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'en' ? 'Free Call • Zero Charges' : language === 'hi' ? 'मुफ्त कॉल • कोई शुल्क नहीं' : language === 'ta' ? 'இலவச அழைப்பு • கட்டணம் இல்லை' : 'ఉచిత కాల్ • ఎలాంటి ఛార్జీలు ఉండవు'}</span>
              </p>
            </div>

            {/* Big Senior-Friendly Call Button */}
            <a
              id="btn-call-elderline-14567"
              href="tel:14567"
              onClick={() => handleInitiateCall('వృద్ధుల జాతీయ హెల్ప్‌లైన్ 14567', '14567')}
              className="w-full py-5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] text-stone-950 text-center rounded-2xl border-3 border-amber-600 shadow-xl flex flex-col items-center justify-center transition-all cursor-pointer min-h-[100px]"
              aria-label="Call 14567"
            >
              <div className="flex items-center justify-center gap-3 font-black text-2xl sm:text-3xl text-stone-950">
                <Phone className="w-9 h-9 animate-bounce text-stone-950 shrink-0" />
                <span>{language === 'en' ? 'Call 14567 Now' : language === 'hi' ? '14567 पर कॉल करें' : language === 'ta' ? '14567 ஐ அழைக்கவும்' : 'కాల్ చేయండి (Call 14567)'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-stone-900 mt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-950 shrink-0" />
                <span>{language === 'en' ? 'Tapping opens phone dialer with 14567' : language === 'hi' ? 'दबाने पर 14567 डायलर में खुल जाएगा' : language === 'ta' ? 'அழுத்தியதும் 14567 டயலரில் திறக்கும்' : 'నొక్కగానే ఫోన్ డయలర్‌లో 14567 ఓపెన్ అవుతుంది'}</span>
              </div>
            </a>

            {/* Elderline Services List */}
            <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-2.5">
              <h4 className="font-black text-stone-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>{language === 'en' ? 'Services provided through 14567:' : language === 'hi' ? '14567 के माध्यम से उपलब्ध सेवाएं:' : language === 'ta' ? '14567 மூலம் கிடைக்கும் சேவைகள்:' : '14567 ద్వారా మీకు లభించే సేవలు:'}</span>
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm font-bold text-stone-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-black">✓</span>
                  <span><strong>{language === 'en' ? 'Emotional Support & Counseling:' : language === 'hi' ? 'भावनात्मक संबल एवं परामर्श:' : language === 'ta' ? 'ஆறுதல் & ஆலோசனை:' : 'ఆసరా & కౌన్సిలింగ్:'}</strong> {language === 'en' ? 'Friendly companion when feeling lonely or anxious.' : language === 'hi' ? 'अकेलेपन और चिंता के समय बात करने हेतु मित्रवत साथ।' : language === 'ta' ? 'தனிமை மற்றும் கவலையின் போது பேச துணை.' : 'ఒంటరితనం, ఆందోళన ఉన్నప్పుడు మాట్లాడటానికి ఆత్మీయమైన తోడు.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-black">✓</span>
                  <span><strong>{language === 'en' ? 'Welfare Schemes & Pensions:' : language === 'hi' ? 'कल्याणकारी योजनाएं एवं पेंशन:' : language === 'ta' ? 'நலத்திட்டங்கள் & ஓய்வூதியம்:' : 'సంక్షేమ పథకాలు:'}</strong> {language === 'en' ? 'Old age pension, govt schemes and senior homes info.' : language === 'hi' ? 'वृद्धावस्था पेंशन, सरकारी योजनाएं और वृद्धाश्रम की जानकारी।' : language === 'ta' ? 'முதியோர் ஓய்வூதியம் மற்றும் முதியோர் இல்லங்கள் தகவல்.' : 'వృద్ధాప్య పెన్షన్, ప్రభుత్వ పథకాలు మరియు వృద్ధాశ్రమాల సమాచారం.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-black">✓</span>
                  <span><strong>{language === 'en' ? 'Legal Aid & Protection:' : language === 'hi' ? 'कानूनी सहायता एवं सुरक्षा:' : language === 'ta' ? 'சட்ட உதவி & பாதுகாப்பு:' : 'రక్షణ & న్యాయ సహాయం:'}</strong> {language === 'en' ? 'Guidance on abuse, property disputes and family issues.' : language === 'hi' ? 'उत्पीड़न, संपत्ति विवाद और पारिवारिक समस्याओं पर मार्गदर्शन।' : language === 'ta' ? 'துன்புறுத்தல், சொத்து தகராறுகளில் வழிகாட்டல்.' : 'వేధింపులు, ఆస్తి వివాదాలు, కుటుంబ సమస్యలపై మార్గదర్శనం.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-black">✓</span>
                  <span><strong>{language === 'en' ? 'Shelter & Rescue:' : language === 'hi' ? 'आश्रय एवं बचाव:' : language === 'ta' ? 'புகலிடம் & மீட்பு:' : 'ఆశ్రయం:'}</strong> {language === 'en' ? 'Protection and shelter for homeless or abandoned seniors.' : language === 'hi' ? 'बेसहारा और असहाय वृद्धों के लिए आश्रय।' : language === 'ta' ? 'ஆதரவற்ற முதியோருக்கான பாதுகாப்பு மற்றும் இல்லம்.' : 'నిరాశ్రయులైన మరియు నిస్సహాయ స్థితిలో ఉన్న వృద్ధులకు రక్షణ.'}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* State Specific Senior Citizen Welfare Department (If AP or Telangana) */}
          {stateSpecificHelpline && (
            <div id={`card-${stateSpecificHelpline.id}`} className="space-y-2.5">
              <h4 className="font-black text-stone-900 text-lg flex items-center gap-2">
                <span>📍 {stateSpecificHelpline.badgeTe}:</span>
              </h4>
              <div className="bg-white border-3 border-stone-200 hover:border-amber-400 rounded-3xl p-5 shadow-md space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner border border-amber-300">
                      {stateSpecificHelpline.emoji}
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-full text-xs font-black border border-amber-300 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{stateSpecificHelpline.badgeTe}</span>
                      </div>
                      <h4 className={`font-black text-stone-950 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
                        {stateSpecificHelpline.nameTe}
                      </h4>
                      <p className="text-xs font-bold text-stone-500 mt-0.5">
                        {stateSpecificHelpline.nameEn}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-xl sm:text-2xl font-black text-amber-950 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 inline-block">
                      {stateSpecificHelpline.phone}
                    </span>
                    <p className="text-[11px] font-bold text-stone-500 mt-1">
                      {stateSpecificHelpline.hoursTe}
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm font-bold text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
                  {stateSpecificHelpline.descriptionTe}
                </p>

                <a
                  id={`btn-call-${stateSpecificHelpline.id}`}
                  href={`tel:${stateSpecificHelpline.phone.replace(/[^0-9]/g, '')}`}
                  onClick={() => handleInitiateCall(stateSpecificHelpline.nameTe, stateSpecificHelpline.phone)}
                  className="w-full py-4 px-4 rounded-2xl font-black text-lg sm:text-xl text-center shadow-lg border-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-stone-950 border-amber-600 flex items-center justify-center gap-3 transition-all cursor-pointer min-h-[68px] active:scale-[0.98]"
                  aria-label={`${stateSpecificHelpline.nameTe} కి కాల్ చేయండి`}
                >
                  <Phone className="w-7 h-7 shrink-0 animate-bounce" />
                  <span>📞 {stateSpecificHelpline.buttonLabelTe}</span>
                </a>
              </div>
            </div>
          )}

          {/* Additional Verified Senior-Citizen Support Helplines in India */}
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between">
              <h3 className={`font-black text-stone-900 ${isLargeFont ? 'text-2xl' : 'text-xl'} flex items-center gap-2`}>
                <HeartHandshake className="w-6 h-6 text-amber-700" />
                <span>అధికారిక వృద్ధుల సహాయ సంస్థలు (Senior Citizen Support):</span>
              </h3>
            </div>
            <p className="text-xs sm:text-sm font-bold text-stone-600 -mt-1">
              వృద్ధుల సంక్షేమం, కౌన్సిలింగ్ మరియు రక్షణ కోసం భారతదేశంలో గుర్తింపు పొందిన అధికారిక సంస్థలు:
            </p>

            <div className="space-y-3.5">
              {INDIA_ADDITIONAL_SENIOR_HELPLINES.map((service) => (
                <div
                  key={service.id}
                  id={`card-${service.id}`}
                  className="bg-white border-3 border-stone-200 hover:border-amber-400 rounded-3xl p-5 shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner border border-amber-300">
                        {service.emoji}
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-full text-xs font-black border border-amber-300 mb-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{service.badgeTe}</span>
                        </div>
                        <h4 className={`font-black text-stone-950 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
                          {service.nameTe}
                        </h4>
                        <p className="text-xs font-bold text-stone-500 mt-0.5">
                          {service.nameEn}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xl sm:text-2xl font-black text-amber-950 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 inline-block">
                        {service.phone}
                      </span>
                      <p className="text-[11px] font-bold text-stone-500 mt-1">
                        {service.hoursTe}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
                    {service.descriptionTe}
                  </p>

                  {/* Large senior-friendly Call Button */}
                  <a
                    id={`btn-call-${service.id}`}
                    href={`tel:${service.phone.replace(/[^0-9]/g, '')}`}
                    onClick={() => handleInitiateCall(service.nameTe, service.phone)}
                    className="w-full py-4 px-4 rounded-2xl font-black text-lg sm:text-xl text-center shadow-lg border-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-stone-950 border-amber-600 flex items-center justify-center gap-3 transition-all cursor-pointer min-h-[68px] active:scale-[0.98]"
                    aria-label={`${service.nameTe} కి కాల్ చేయండి`}
                  >
                    <Phone className="w-7 h-7 shrink-0 animate-bounce" />
                    <span>📞 {service.buttonLabelTe}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- 🇺🇸 ONLY USA SENIOR HELPLINES ------------ */}
      {activeCountry === 'USA' && (
        <div id="usa-helplines-container" className="space-y-5 pt-2">
          <div className="flex items-center justify-between">
            <h3 className={`font-black text-stone-900 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
              🇺🇸 USA Senior Citizen Welfare & Support:
            </h3>
            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black px-2.5 py-1 rounded-full">
              Verified Senior Services
            </span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-stone-600 -mt-2">
            Dedicated official helplines for older adults, caregivers, aging support, and senior protection in the United States:
          </p>

          {/* US National Senior Helplines */}
          <div className="space-y-3.5">
            {US_PRIMARY_HELPLINES.map((service) => (
              <div
                key={service.id}
                id={`card-${service.id}`}
                className="bg-white border-3 border-stone-200 hover:border-amber-400 rounded-3xl p-5 shadow-md transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner border border-amber-300">
                      {service.emoji}
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-full text-xs font-black border border-amber-300 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{service.badgeTe}</span>
                      </div>
                      <h4 className={`font-black text-stone-950 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
                        {service.nameTe}
                      </h4>
                      <p className="text-xs font-bold text-stone-500 mt-0.5">
                        {service.nameEn}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-2xl sm:text-3xl font-black text-amber-950 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 inline-block">
                      {service.phone}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm font-bold text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
                  {service.descriptionTe}
                </p>

                {/* Large senior-friendly Call Button */}
                <a
                  id={`btn-call-${service.id}`}
                  href={`tel:${service.phone.replace(/[^0-9]/g, '')}`}
                  onClick={() => handleInitiateCall(service.nameTe, service.phone)}
                  className="w-full py-4 px-4 rounded-2xl font-black text-lg sm:text-xl text-center shadow-lg border-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-stone-950 border-amber-600 flex items-center justify-center gap-3 transition-all cursor-pointer min-h-[68px] active:scale-[0.98]"
                  aria-label={`${service.nameTe} కి కాల్ చేయండి`}
                >
                  <Phone className="w-7 h-7 shrink-0 animate-bounce" />
                  <span>📞 {service.buttonLabelTe}</span>
                </a>
              </div>
            ))}
          </div>

          {/* Local US State Senior Resources (If detected in a US State like CA, TX, NY, FL, etc.) */}
          {detectedIsUSA && stateResources && stateResources.services.length > 0 && (
            <div id="us-state-resources-section" className="space-y-3 pt-3">
              <div className="flex items-center justify-between">
                <h3 className={`font-black text-stone-900 ${isLargeFont ? 'text-xl' : 'text-lg'}`}>
                  📍 {stateResources.stateNameTe} ({stateResources.stateNameEn}) స్థానిక వృద్ధుల సేవలు:
                </h3>
                <span className="bg-amber-100 text-amber-950 text-xs font-black px-2.5 py-1 rounded-full border border-amber-300">
                  రాష్ట్ర సేవలు
                </span>
              </div>

              <div className="space-y-3">
                {stateResources.services.map((service) => (
                  <div
                    key={service.id}
                    id={`card-${service.id}`}
                    className="bg-white border-2 border-stone-200 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-800 px-2 py-0.5 rounded-full text-xs font-black border border-stone-300 mb-1">
                          <Building2 className="w-3.5 h-3.5 text-amber-700" />
                          <span>{service.badgeTe}</span>
                        </div>
                        <h4 className="font-black text-stone-950 text-lg sm:text-xl">
                          {service.emoji} {service.nameTe}
                        </h4>
                        <p className="text-xs font-bold text-stone-500 mt-0.5">
                          {service.nameEn}
                        </p>
                      </div>
                      <span className="font-mono text-xl sm:text-2xl font-black text-stone-900 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-300 shrink-0">
                        {service.phone}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                      {service.descriptionTe}
                    </p>

                    <a
                      id={`btn-call-${service.id}`}
                      href={`tel:${service.phone.replace(/[^0-9]/g, '')}`}
                      onClick={() => handleInitiateCall(service.nameTe, service.phone)}
                      className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-stone-950 rounded-xl font-black text-base sm:text-lg text-center shadow-md border-2 border-amber-600 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                    >
                      <Phone className="w-6 h-6" />
                      <span>📞 {service.buttonLabelTe}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nationwide Additional Senior Helplines (Medicare 24/7 & SSA) */}
          <div className="space-y-3 pt-2">
            <h3 className={`font-black text-stone-900 ${isLargeFont ? 'text-xl' : 'text-lg'}`}>
              🏛️ అధికారిక ఫెడరల్ వృద్ధుల సేవలు (National US Resources):
            </h3>

            {US_NATIONAL_ADDITIONAL_RESOURCES.map((service) => (
              <div
                key={service.id}
                id={`card-${service.id}`}
                className="bg-white border-2 border-stone-200 rounded-2xl p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full text-xs font-black border border-blue-300 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                      <span>{service.badgeTe}</span>
                    </div>
                    <h4 className="font-black text-stone-950 text-lg sm:text-xl">
                      {service.emoji} {service.nameTe}
                    </h4>
                    <p className="text-xs font-bold text-stone-500 mt-0.5">
                      {service.nameEn}
                    </p>
                  </div>
                  <span className="font-mono text-xl sm:text-2xl font-black text-blue-950 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shrink-0">
                    {service.phone}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-bold text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                  {service.descriptionTe}
                </p>

                <a
                  id={`btn-call-${service.id}`}
                  href={`tel:${service.phone.replace(/[^0-9]/g, '')}`}
                  onClick={() => handleInitiateCall(service.nameTe, service.phone)}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-black text-base sm:text-lg text-center shadow-md border-2 border-blue-700 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <Phone className="w-6 h-6" />
                  <span>📞 {service.buttonLabelTe}</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Sticky Home Button */}
      <div className="pt-2">
        <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
      </div>
    </div>
  );
};
