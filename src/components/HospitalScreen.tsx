import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { HomeButton } from './HomeButton';
import { 
  Building2, 
  Phone, 
  Heart, 
  Activity, 
  MapPin, 
  Volume2, 
  Edit3, 
  Check, 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  Navigation, 
  Sparkles, 
  Ambulance, 
  BellRing, 
  BellOff, 
  AlertTriangle, 
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';
import { getStoredProfile, saveStoredProfile } from '../utils/storage';
import { playTapSound, speakInLanguage, startEmergencySiren, stopEmergencySiren } from '../utils/audio';
import { isLocationInUSA } from '../utils/usSeniorServices';
import { CountryCode } from './CountrySelector';
import { useLanguage } from '../utils/i18n';
import {
  getCountryFromPhone,
  extractRawPhoneDigits,
  composeFullPhoneNumber,
  getDialableNumber,
  formatPhoneNumber,
} from '../utils/countryPhone';
import { PhoneCountrySelector } from './PhoneCountrySelector';

export interface RealNearbyHospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  phone: string;
  ambulancePhone?: string;
  address: string;
  type?: 'government' | 'private';
  emergency: boolean;
  distanceMiles: number;
  distanceKm: number;
  directionsUrl: string;
}

interface HospitalScreenProps {
  onGoHome: () => void;
  isLargeFont: boolean;
  currentAddress?: string;
  lat?: number | null;
  lng?: number | null;
  onRefreshLocation?: () => void;
  selectedCountry?: CountryCode;
}

export const HospitalScreen: React.FC<HospitalScreenProps> = ({ 
  onGoHome, 
  isLargeFont,
  currentAddress,
  lat = null,
  lng = null,
  onRefreshLocation,
  selectedCountry = 'IN',
}) => {
  const { language, t } = useLanguage();

  const getHospitalGpsError = (isPermissionDenied: boolean) => {
    if (language === 'en') {
      return isPermissionDenied
        ? 'Please allow GPS location permission on your device.'
        : 'Location signal unavailable. Please ensure GPS is enabled on your device.';
    }
    if (language === 'hi') {
      return isPermissionDenied
        ? 'कृपया अपने डिवाइस पर GPS स्थान की अनुमति दें।'
        : 'लोकेशन सिग्नल नहीं मिल रहा है। कृपया फ़ोन में GPS चालू करें।';
    }
    if (language === 'ta') {
      return isPermissionDenied
        ? 'உங்கள் சாதனத்தில் GPS இருப்பிட அனுமதியை வழங்கவும்.'
        : 'இருப்பிட சிக்னல் கிடைக்கவில்லை. சாதனத்தில் GPS ஐ இயக்கவும்.';
    }
    return isPermissionDenied
      ? 'దయచేసి మీ పరికరంలో జీపీఎస్ లొకేషన్ అనుమతిని ఇవ్వండి.'
      : 'లొకేషన్ సిగ్నల్ అందుబాటులో లేదు. దయచేసి జీపీఎస్ ఆన్ చేయండి.';
  };

  const defaultLocMsg = language === 'en'
    ? 'Detecting current GPS location from your device...'
    : language === 'hi'
    ? 'आपके डिवाइस से वर्तमान जीपीएस स्थान पहचाना जा रहा है...'
    : language === 'ta'
    ? 'சாதனத்திலிருந்து தற்போதைய ஜிபிஎஸ் இடம் கண்டறியப்படுகிறது...'
    : 'మీ పరికరం నుండి తాజా జీపీఎస్ స్థానాన్ని గుర్తిస్తున్నాం...';

  const [displayLocation, setDisplayLocation] = useState<string>(() => {
    if (currentAddress && currentAddress !== 'స్థానాన్ని గుర్తిస్తున్నాం...' && currentAddress !== 'నా ప్రస్తుత ప్రాంతం') {
      return currentAddress;
    }
    return defaultLocMsg;
  });

  const [currentCoords, setCurrentCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: lat,
    lng: lng,
  });

  const [isLocating, setIsLocating] = useState<boolean>(!lat || !lng);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Real Nearby Hospitals from GPS
  const [fetchedHospitals, setFetchedHospitals] = useState<RealNearbyHospital[]>([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState<boolean>(false);
  const [hospitalsFetched, setHospitalsFetched] = useState<boolean>(false);

  const [activeSection, setActiveSection] = useState<'hospitals' | 'ambulance' | 'card'>('hospitals');
  const [isSirenOn, setIsSirenOn] = useState<boolean>(false);

  const [profile, setProfile] = useState(getStoredProfile());
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);
  
  const [filterType, setFilterType] = useState<'all' | 'government' | 'private' | '24hours'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const prevCoordsRef = useRef<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  // Fetch real, verified nearby hospitals using live GPS
  const loadNearbyHospitals = useCallback(async (latitude: number, longitude: number) => {
    setIsLoadingHospitals(true);
    setGpsError(null);
    try {
      const res = await fetch(`/api/nearby-hospitals?lat=${latitude}&lng=${longitude}&country=${selectedCountry}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.hospitals)) {
          setFetchedHospitals(data.hospitals);
          setHospitalsFetched(true);
          setIsLoadingHospitals(false);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to load hospitals:', err);
    }
    setFetchedHospitals([]);
    setHospitalsFetched(true);
    setIsLoadingHospitals(false);
  }, [selectedCountry]);

  // Dynamically resolve actual GPS coordinates to address
  const resolveCoordinates = useCallback(async (latitude: number, longitude: number) => {
    setIsLocating(true);
    let resolvedText = '';

    try {
      const res = await fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`);
      if (res.ok) {
        const rawObj = await res.json();
        if (rawObj?.display_name) {
          resolvedText = rawObj.display_name;
        }
      }
    } catch {
      // Fallback
    }

    if (!resolvedText) {
      try {
        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=te`
        );
        if (bdcRes.ok) {
          const bdc = await bdcRes.json();
          const parts = [bdc.locality || bdc.city, bdc.principalSubdivision, bdc.countryName].filter(Boolean);
          if (parts.length > 0) resolvedText = parts.join(', ');
        }
      } catch {
        // Ignore
      }
    }

    if (resolvedText) {
      setDisplayLocation(resolvedText);
    }

    setIsLocating(false);
    loadNearbyHospitals(latitude, longitude);
  }, [loadNearbyHospitals]);

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
        setGpsError(null);
        resolveCoordinates(latitude, longitude);
      }
    };

    // If props lat/lng are already available, apply immediately
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      applyCoordinates(lat, lng);
    }

    // Always fetch fresh GPS coordinates on screen open with maximumAge: 0
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          applyCoordinates(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          setIsLocating(false);
          setIsLoadingHospitals(false);
          setHospitalsFetched(true);
          if (err.code === err.PERMISSION_DENIED) {
            setGpsError(getHospitalGpsError(true));
          } else {
            setGpsError(getHospitalGpsError(false));
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 9000 }
      );
    } else if (!lat && !lng) {
      setHospitalsFetched(true);
      setIsLocating(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [lat, lng, resolveCoordinates]);

  // Sync display address if updated by parent
  useEffect(() => {
    if (currentAddress && currentAddress !== 'స్థానాన్ని గుర్తిస్తున్నాం...' && currentAddress !== 'నా ప్రస్తుత ప్రాంతం') {
      setDisplayLocation(currentAddress);
    }
  }, [currentAddress]);

  // Clean up siren on unmount
  useEffect(() => {
    return () => {
      stopEmergencySiren();
    };
  }, []);

  const toggleSiren = () => {
    playTapSound();
    if (isSirenOn) {
      stopEmergencySiren();
      setIsSirenOn(false);
      const sirenOffMsg = language === 'en' ? 'Siren turned off.' : language === 'hi' ? 'सायरन बंद कर दिया गया।' : language === 'ta' ? 'சைரன் நிறுத்தப்பட்டது.' : 'సైరన్ ఆపివేయబడింది';
      speakInLanguage(sirenOffMsg, language);
    } else {
      startEmergencySiren();
      setIsSirenOn(true);
      const sirenOnMsg = language === 'en' ? 'Emergency siren sounding. Alerting people nearby.' : language === 'hi' ? 'आपातकालीन सायरन बज रहा है। आस-पास के लोगों को सतर्क कर रहे हैं।' : language === 'ta' ? 'அவசர சைரன் ஒலிக்கிறது. அருகில் உள்ளவர்களை எச்சரிக்கிறோம்.' : 'ఎమర్జెన్సీ సైరన్ మోగుతోంది. చుట్టుపక్కల వారిని అప్రమత్తం చేస్తున్నాం.';
      speakInLanguage(sirenOnMsg, language);
    }
  };

  // Filter hospitals to strictly match selected country
  const countryHospitals = useMemo(() => {
    if (selectedCountry === 'USA') {
      return fetchedHospitals.filter((h) => isLocationInUSA(h.lat, h.lng, h.address));
    } else {
      return fetchedHospitals.filter((h) => !isLocationInUSA(h.lat, h.lng, h.address));
    }
  }, [fetchedHospitals, selectedCountry]);

  // Apply quick filter tabs (All, Government, Private, 24 Hours Emergency)
  const displayedHospitals = useMemo(() => {
    return countryHospitals.filter((h) => {
      if (filterType === '24hours') {
        return h.emergency === true;
      }
      if (filterType === 'government') {
        return (
          h.type === 'government' ||
          h.name.includes('ప్రభుత్వ') || 
          h.name.includes('GGH') || 
          h.name.includes('PHC') || 
          h.name.includes('CHC') ||
          h.name.includes('UPHC') ||
          h.name.toLowerCase().includes('area hospital') ||
          h.name.toLowerCase().includes('district hospital') ||
          h.name.toLowerCase().includes('general hospital') ||
          h.name.toLowerCase().includes('county hospital') ||
          h.name.toLowerCase().includes('public hospital')
        );
      }
      if (filterType === 'private') {
        return (
          h.type === 'private' ||
          (!h.name.includes('ప్రభుత్వ') && !h.name.includes('GGH') && !h.name.includes('PHC') && !h.name.includes('CHC'))
        );
      }
      return true;
    });
  }, [countryHospitals, filterType]);

  // Voice introduction on screen mount or country switch
  useEffect(() => {
    if (selectedCountry === 'USA') {
      const usaIntro = language === 'en'
        ? 'US Hospital and Ambulance page. Official 911 emergency services and verified US hospitals ready.'
        : language === 'hi'
        ? 'यूएस अस्पताल और एम्बुलेंस पेज। आधिकारिक 911 सेवा और अस्पताल तैयार हैं।'
        : language === 'ta'
        ? 'அமெரிக்க மருத்துவமனை மற்றும் ஆம்புலன்ஸ் பக்கம். 911 அவசர சேவை தயாராக உள்ளது.'
        : 'అమెరికా హాస్పిటల్ మరియు అంబులెన్స్ పేజీ. మీ ప్రస్తుత ప్రాంతం ప్రకారం సమీపంలో ఉన్న అధికారిక యుఎస్ హాస్పిటల్స్ మరియు 911 అంబులెన్స్ సేవలు సిద్ధంగా ఉన్నాయి.';
      speakInLanguage(usaIntro, language, { delayMs: 400 });
    } else {
      const inIntro = language === 'en'
        ? 'Hospital and Ambulance page. 108 emergency ambulance and nearby hospitals ready below.'
        : language === 'hi'
        ? 'अस्पताल और एम्बुलेंस पेज। 108 आपातकालीन एम्बुलेंस और नजदीकी अस्पताल नीचे तैयार हैं।'
        : language === 'ta'
        ? 'மருத்துவமனை மற்றும் ஆம்புலன்ஸ் பக்கம். 108 ஆம்புலன்ஸ் மற்றும் அருகிலுள்ள மருத்துவமனைகள் தயாராக உள்ளன.'
        : 'హాస్పిటల్ మరియు అంబులెన్స్ పేజీ. మీ ప్రస్తుత ప్రాంతం ప్రకారం సమీపంలో ఉన్న ప్రభుత్వ, ప్రైవేట్ ఆసుపత్రులు మరియు 108 అత్యవసర అంబులెన్స్ సేవలు కింద సిద్ధంగా ఉన్నాయి.';
      speakInLanguage(inIntro, language, { delayMs: 400 });
    }
  }, [selectedCountry, language]);

  // Voice guide explanation button
  const handleVoiceGuide = () => {
    playTapSound();
    if (selectedCountry === 'USA') {
      const usaGuide = language === 'en'
        ? 'US Hospital & Ambulance section: Call 911 immediately for life-threatening emergencies. Nearby verified US hospitals, phone numbers, and directions are listed below.'
        : language === 'hi'
        ? 'यूएस अस्पताल और एम्बुलेंस: तत्काल आपातकालीन सहायता के लिए 911 पर कॉल करें। नजदीकी अस्पताल और फ़ोन नंबर नीचे देखें।'
        : language === 'ta'
        ? 'அமெரிக்க மருத்துவமனை & ஆம்புலன்ஸ்: அவசர உதவிக்கு 911 ஐ அழைக்கவும். அருகிலுள்ள மருத்துவமனைகளை கீழே காண்க.'
        : 'అమెరికా హాస్పిటల్ & అంబులెన్స్ విభాగం: తక్షణ అత్యవసర సహాయం కోసం 911 కి కాల్ చేయండి. అలాగే మీ ప్రస్తుత జీపీఎస్ స్థానం ఆధారంగా సమీపంలో ఉన్న యుఎస్ ఆసుపత్రులు, దూరం, ఫోన్ నంబర్లు జాబితాగా కనిపిస్తాయి. దారి చూడటానికి దారి చూపించండి బటన్ నొక్కండి.';
      speakInLanguage(usaGuide, language);
    } else {
      const inGuide = language === 'en'
        ? 'Hospital & Ambulance section: Call 108 or 112 immediately for medical emergencies. Call 104 for doctor advice. Nearby hospitals and direct call buttons are available below.'
        : language === 'hi'
        ? 'अस्पताल और एम्बुलेंस: आपातकाल में 108 या 112 पर कॉल करें। डॉक्टर सलाह के लिए 104 पर कॉल करें। नजदीकी अस्पतालों की सूची नीचे देखें।'
        : language === 'ta'
        ? 'மருத்துவமனை & ஆம்புலன்ஸ்: அவசர நிலைகளில் 108 அல்லது 112 ஐ அழைக்கவும். மருத்துவர் ஆலோசனைக்கு 104 ஐ அழைக்கவும்.'
        : 'హాస్పిటల్ & అంబులెన్స్ విభాగం: తీవ్రమైన అత్యవసర సమయాల్లో 108 అంబులెన్స్ లేదా 112 కి వెంటనే కాల్ చేయండి. డాక్టర్ సలహాలకు 104 కాల్ చేయవచ్చు. మీ సమీపంలో ఉన్న ప్రభుత్వ మరియు ప్రైవేట్ ఆసుపత్రులకు కాల్ చేయడానికి కాల్ బటన్, మ్యాప్‌లో దారి చూడటానికి దారి చూపించండి బటన్ నొక్కండి.';
      speakInLanguage(inGuide, language);
    }
  };

  // Safe manual Call button handler (Never makes automatic calls)
  const handleOneTapCall = (name: string, phone: string, purpose?: string) => {
    playTapSound();
    const callMsg = language === 'en'
      ? `Calling ${name}.`
      : language === 'hi'
      ? `${name} को कॉल कर रहे हैं।`
      : language === 'ta'
      ? `${name} ஐ அழைக்கிறோம்.`
      : `${name} కు కాల్ కలుపుతున్నాం.`;
    speakInLanguage(callMsg, language);
    window.location.href = `tel:${phone.replace(/[^0-9+]/g, '')}`;
  };

  // ONLY when user explicitly taps Directions button, open navigation route
  const handleOpenDirections = (name: string, directionsUrl?: string, hLat?: number, hLng?: number) => {
    playTapSound();
    const dirMsg = language === 'en'
      ? `Opening directions to ${name} in Google Maps.`
      : language === 'hi'
      ? `Google Maps में ${name} का रास्ता दिखा रहे हैं।`
      : language === 'ta'
      ? `Google Maps இல் ${name} க்கான வழியைக் காட்டுகிறோம்.`
      : `${name} కు గూగుల్ మ్యాప్స్ దారి చూపిస్తున్నాం.`;
    speakInLanguage(dirMsg, language);
    if (directionsUrl) {
      window.open(directionsUrl, '_blank', 'noopener,noreferrer');
    } else if (hLat != null && hLng != null) {
      const originParam = currentCoords.lat && currentCoords.lng ? `origin=${currentCoords.lat},${currentCoords.lng}&` : '';
      window.open(`https://www.google.com/maps/dir/?api=1&${originParam}destination=${hLat},${hLng}`, '_blank', 'noopener,noreferrer');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle location and hospital refresh with live GPS
  const handleRefresh = () => {
    playTapSound();
    setIsRefreshing(true);
    setGpsError(null);
    const refreshMsg = language === 'en'
      ? 'Refreshing current location and nearby hospitals.'
      : language === 'hi'
      ? 'वर्तमान स्थान और नजदीकी अस्पतालों को रिफ्रेश कर रहे हैं।'
      : language === 'ta'
      ? 'தற்போதைய இருப்பிடம் மற்றும் மருத்துவமனைகள் புதுப்பிக்கப்படுகின்றன.'
      : 'మీ ప్రస్తుత ప్రాంతాన్ని మరియు సమీప ఆసుపత్రులను తాజా చేస్తున్నాం.';
    speakInLanguage(refreshMsg, language);

    if (onRefreshLocation) {
      onRefreshLocation();
    }

    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          prevCoordsRef.current = { lat: latitude, lng: longitude };
          setCurrentCoords({ lat: latitude, lng: longitude });
          resolveCoordinates(latitude, longitude);
          setIsRefreshing(false);
        },
        (err) => {
          setIsRefreshing(false);
          if (err.code === err.PERMISSION_DENIED) {
            setGpsError(getHospitalGpsError(true));
          } else {
            setGpsError(getHospitalGpsError(false));
          }
        },
        { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
      );
    } else {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    playTapSound();
    saveStoredProfile(formData);
    setProfile(formData);
    setIsEditing(false);
    const saveMsg = language === 'en'
      ? 'Your health information has been saved.'
      : language === 'hi'
      ? 'आपकी स्वास्थ्य जानकारी सुरक्षित कर ली गई है।'
      : language === 'ta'
      ? 'உங்கள் சுகாதார தகவல் சேமிக்கப்பட்டது.'
      : 'మీ ఆరోగ్య సమాచారం భద్రపరచబడింది.';
    speakInLanguage(saveMsg, language);
  };

  const defaultBannerAddress = language === 'en'
    ? 'Detecting GPS location...'
    : language === 'hi'
    ? 'जीपीएस स्थान पहचान रहे हैं...'
    : language === 'ta'
    ? 'ஜிபிஎஸ் இருப்பிடத்தை கண்டறிகிறது...'
    : 'లొకేషన్ గుర్తిస్తున్నాం...';

  const locationBannerDisplay = displayLocation || currentAddress || defaultBannerAddress;

  const renderMedicalCard = () => (
    <div 
      id="hospital-senior-profile-card"
      className="bg-white p-4 sm:p-5 rounded-3xl border-3 border-stone-300 shadow-sm space-y-3"
    >
      <div className="flex items-center justify-between border-b pb-2.5 border-stone-200">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-600 fill-red-500" />
          <h3 className={`font-black text-stone-900 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
            {language === 'en' ? 'My Medical Card' : language === 'hi' ? 'मेरा स्वास्थ्य कार्ड' : language === 'ta' ? 'எனது மருத்துவ அட்டை' : 'నా ఆరోగ్య కార్డు (Medical Card)'}
          </h3>
        </div>
        <button
          id="btn-edit-medical-profile"
          type="button"
          onClick={() => {
            playTapSound();
            setIsEditing(!isEditing);
          }}
          className="p-2 bg-stone-100 hover:bg-stone-200 active:scale-95 rounded-xl text-stone-800 font-bold flex items-center gap-1 text-xs sm:text-sm border border-stone-300 cursor-pointer"
        >
          <Edit3 className="w-4 h-4 text-stone-700" />
          <span>
            {isEditing 
              ? (language === 'en' ? 'Cancel' : language === 'hi' ? 'रद्द करें' : language === 'ta' ? 'ரத்து' : 'రద్దు') 
              : (language === 'en' ? 'Edit' : language === 'hi' ? 'संपादित करें' : language === 'ta' ? 'திருத்து' : 'సవరించు')}
          </span>
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSaveProfile} className="space-y-3 pt-1">
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">
              {language === 'en' ? 'Blood Group:' : language === 'hi' ? 'रक्त समूह (Blood Group):' : language === 'ta' ? 'இரத்த வகை (Blood Group):' : 'రక్త వర్గం (Blood Group):'}
            </label>
            <input
              type="text"
              value={formData.bloodGroup}
              onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              className="w-full p-2.5 border-2 border-stone-300 rounded-xl font-bold text-stone-900"
              placeholder={language === 'en' ? 'e.g., O+, B+, A+' : language === 'hi' ? 'उदा: O+, B+, A+' : language === 'ta' ? 'எ.கா: O+, B+, A+' : 'ఉదా: O+, B+, A+'}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">
              {language === 'en' ? 'Medical Conditions:' : language === 'hi' ? 'मौजूदा स्वास्थ्य समस्याएं (Conditions):' : language === 'ta' ? 'தற்போதைய உடல்நலப் பிரச்சனைகள்:' : 'ప్రస్తుత ఆరోగ్య సమస్యలు (Medical Conditions):'}
            </label>
            <input
              type="text"
              value={formData.conditions}
              onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
              className="w-full p-2.5 border-2 border-stone-300 rounded-xl font-bold text-stone-900"
              placeholder={language === 'en' ? 'e.g., Diabetes, BP, Heart issue' : language === 'hi' ? 'उदा: शुगर, बीपी, हृदय समस्या' : language === 'ta' ? 'எ.கா: சர்க்கரை, பிபி, இதய பிரச்சனை' : 'ఉదా: షుగర్, బీపీ, గుండె సమస్యలు'}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">
              {language === 'en' ? 'Regular Medications:' : language === 'hi' ? 'नियमित दवाएं (Medications):' : language === 'ta' ? 'வழக்கமான மருந்துகள் (Medications):' : 'రెగ్యులర్ మందులు (Medications):'}
            </label>
            <input
              type="text"
              value={formData.medications}
              onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
              className="w-full p-2.5 border-2 border-stone-300 rounded-xl font-bold text-stone-900"
              placeholder={language === 'en' ? 'e.g., BP tablet, Insulin' : language === 'hi' ? 'उदा: बीपी गोली, इंसुलिन' : language === 'ta' ? 'எ.கா: பிபி மாத்திரை, இன்சுலின்' : 'ఉదా: బిపి టాబ్లెట్, ఇన్సులిన్'}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                {language === 'en' ? 'Family Doctor Name:' : language === 'hi' ? 'पारिवारिक डॉक्टर का नाम:' : language === 'ta' ? 'குடும்ப மருத்துவர் பெயர்:' : 'కుటుంబ డాక్టర్ పేరు (Doctor Name):'}
              </label>
              <input
                type="text"
                value={formData.doctorName}
                onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                className="w-full p-2.5 border-2 border-stone-300 rounded-xl font-bold text-stone-900"
                placeholder={language === 'en' ? 'Doctor Name' : language === 'hi' ? 'डॉक्टर का नाम' : language === 'ta' ? 'மருத்துவர் பெயர்' : 'డాక్టర్ పేరు'}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                {language === 'en' ? 'Doctor Phone Number:' : language === 'hi' ? 'डॉक्टर फोन नंबर:' : language === 'ta' ? 'மருத்துவர் தொலைபேசி எண்:' : 'డాక్టర్ ఫోన్ నంబర్ (Doctor Phone):'}
              </label>
              <div className="flex gap-2 items-center">
                <PhoneCountrySelector
                  value={getCountryFromPhone(formData.doctorPhone)}
                  onChange={(iso) => {
                    const raw = extractRawPhoneDigits(formData.doctorPhone);
                    const composed = composeFullPhoneNumber(raw, iso);
                    setFormData({ ...formData, doctorPhone: composed });
                  }}
                />
                <input
                  type="tel"
                  value={extractRawPhoneDigits(formData.doctorPhone)}
                  onChange={(e) => {
                    const iso = getCountryFromPhone(formData.doctorPhone);
                    const composed = composeFullPhoneNumber(e.target.value, iso);
                    setFormData({ ...formData, doctorPhone: composed });
                  }}
                  className="flex-1 p-2.5 border-2 border-stone-300 rounded-xl font-mono font-bold text-stone-900"
                  placeholder={language === 'en' ? 'Phone Number' : language === 'hi' ? 'फोन नंबर' : language === 'ta' ? 'தொலைபேசி எண்' : 'ఫోన్ నంబర్'}
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black rounded-xl text-base flex items-center justify-center gap-2 cursor-pointer shadow"
          >
            <Check className="w-5 h-5" />
            <span>{language === 'en' ? 'Save Card' : language === 'hi' ? 'सुरक्षित करें (Save)' : language === 'ta' ? 'சேமிக்கவும் (Save)' : 'భద్రపరచండి (Save)'}</span>
          </button>
        </form>
      ) : (
        <div className="space-y-2 text-xs sm:text-sm font-bold text-stone-800">
          <div className="flex justify-between border-b pb-1.5 border-stone-100">
            <span className="text-stone-500">
              {language === 'en' ? 'Blood Group:' : language === 'hi' ? 'रक्त समूह:' : language === 'ta' ? 'இரத்த வகை:' : 'రక్త వర్గం:'}
            </span>
            <span className="text-red-700 font-black">
              {profile.bloodGroup || (language === 'en' ? 'Not recorded' : language === 'hi' ? 'दर्ज नहीं' : language === 'ta' ? 'பதிவு செய்யப்படவில்லை' : 'నమోదు చేయలేదు')}
            </span>
          </div>
          <div className="flex justify-between border-b pb-1.5 border-stone-100">
            <span className="text-stone-500">
              {language === 'en' ? 'Health Conditions:' : language === 'hi' ? 'स्वास्थ्य समस्याएं:' : language === 'ta' ? 'உடல்நலப் பிரச்சனைகள்:' : 'ఆరోగ్య సమస్యలు:'}
            </span>
            <span>{profile.conditions || (language === 'en' ? 'None' : language === 'hi' ? 'कोई नहीं' : language === 'ta' ? 'எதுவுமில்லை' : 'ఏమీ లేవు')}</span>
          </div>
          <div className="flex justify-between border-b pb-1.5 border-stone-100">
            <span className="text-stone-500">
              {language === 'en' ? 'Medications:' : language === 'hi' ? 'दवाएं:' : language === 'ta' ? 'மருந்துகள்:' : 'మందులు:'}
            </span>
            <span>{profile.medications || (language === 'en' ? 'None' : language === 'hi' ? 'कोई नहीं' : language === 'ta' ? 'எதுவுமில்லை' : 'ఏమీ లేవు')}</span>
          </div>
          {profile.doctorName && (
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-stone-500 block text-xs">
                  {language === 'en' ? 'Family Doctor:' : language === 'hi' ? 'पारिवारिक डॉक्टर:' : language === 'ta' ? 'குடும்ப மருத்துவர்:' : 'ఫ్యామిలీ డాక్టర్:'}
                </span>
                <span className="font-black text-stone-900">{profile.doctorName}</span>
              </div>
              {profile.doctorPhone && (
                <button
                  type="button"
                  onClick={() => handleOneTapCall(`డాక్టర్ ${profile.doctorName}`, getDialableNumber(profile.doctorPhone))}
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 text-xs font-black cursor-pointer shadow-sm active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Call' : language === 'hi' ? 'कॉल' : language === 'ta' ? 'அழை' : 'కాల్'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-3 sm:p-5 max-w-2xl mx-auto space-y-4 pb-20">
      {/* Top Bar with Home and Speech Guide */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
        </div>
        <button
          id="hospital-voice-guide-btn"
          onClick={handleVoiceGuide}
          type="button"
          className="p-3.5 bg-rose-100 text-rose-950 hover:bg-rose-200 rounded-2xl border-2 border-rose-300 font-bold active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          title={language === 'en' ? 'Voice Assistance (Guide)' : language === 'hi' ? 'सहायक आवाज़ (गाइड)' : language === 'ta' ? 'குரல் வழிகாட்டி' : 'సహాయక స్వరం (వాయిస్ గైడ్)'}
          aria-label={language === 'en' ? 'Listen to Voice Guide' : language === 'hi' ? 'सहायक आवाज़ सुनें' : language === 'ta' ? 'குரல் வழிகாட்டியை கேளுங்கள்' : 'సహాయక స్వరం వినండి'}
        >
          <Volume2 className="w-7 h-7 text-rose-900" />
          <span className="hidden sm:inline text-xs font-black">
            {language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'వాయిస్ సహాయం'}
          </span>
        </button>
      </div>

      {/* Screen Title Card */}
      <div 
        id="hospital-title-card"
        className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-4 sm:p-5 rounded-3xl shadow-lg border-3 border-red-800 flex items-center gap-4"
      >
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-white/30 text-3xl">
          {selectedCountry === 'USA' ? '🇺🇸' : '🏥'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-black text-white mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {selectedCountry === 'USA' 
                ? (language === 'en' ? 'United States • 911 & Nearby Hospitals' : language === 'hi' ? 'संयुक्त राज्य अमेरिका • 911 एवं निकटतम अस्पताल' : language === 'ta' ? 'அமெரிக்கா • 911 & அருகிலுள்ள மருத்துவமனைகள்' : 'యునైటెడ్ స్టేట్స్ • 911 & సమీప హాస్పిటల్స్')
                : (language === 'en' ? 'Nearby Hospitals & 108 Ambulance' : language === 'hi' ? 'निकटतम अस्पताल एवं 108 एम्बुलेंस' : language === 'ta' ? 'அருகிலுள்ள மருத்துவமனைகள் & 108 ஆம்புலன்ஸ்' : 'సమీప ఆసుపత్రులు & 108 అంబులెన్స్')}
            </span>
          </div>
          <h2 className={`font-black tracking-tight ${isLargeFont ? 'text-3xl' : 'text-2xl'}`}>
            {selectedCountry === 'USA' 
              ? (language === 'en' ? 'Hospitals & 911 Ambulance' : language === 'hi' ? 'अस्पताल एवं 911 एम्बुलेंस' : language === 'ta' ? 'மருத்துவமனை & 911 ஆம்புலன்ஸ்' : 'హాస్పిటల్ & 911 అంబులెన్స్')
              : t('homeCardHospitalTitle')}
          </h2>
          <p className="font-semibold text-rose-100 text-xs sm:text-sm mt-0.5">
            {selectedCountry === 'USA' 
              ? (language === 'en' ? '911 Emergency Protection & Nearby Official Hospitals' : language === 'hi' ? '911 आपातकालीन सुरक्षा एवं निकटतम अस्पताल' : language === 'ta' ? '911 அவசர பாதுகாப்பு & அருகிலுள்ள மருத்துவமனைகள்' : '911 అత్యవసర రక్షణ & మీ సమీపంలోని అధికారిక ఆసుపత్రులు')
              : t('homeCardHospitalSub')}
          </p>
        </div>
      </div>

      {/* 3-Section Switcher: Hospitals vs Ambulance vs Health Card */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-rose-100/70 p-1.5 rounded-2xl border-2 border-rose-300">
        <button
          id="tab-btn-hospitals"
          type="button"
          onClick={() => {
            playTapSound();
            setActiveSection('hospitals');
            speakInLanguage(t('tabHospitals'), language);
          }}
          className={`py-3 px-1.5 rounded-xl font-black text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
            activeSection === 'hospitals'
              ? 'bg-rose-700 text-white shadow-md'
              : 'text-stone-800 hover:bg-white/60'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('tabHospitals')}</span>
        </button>

        <button
          id="tab-btn-ambulance"
          type="button"
          onClick={() => {
            playTapSound();
            setActiveSection('ambulance');
            speakInLanguage(selectedCountry === 'USA' ? '911 Emergency Ambulance' : t('tabAmbulance'), language);
          }}
          className={`py-3 px-1.5 rounded-xl font-black text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
            activeSection === 'ambulance'
              ? 'bg-red-700 text-white shadow-md'
              : 'text-stone-800 hover:bg-white/60'
          }`}
        >
          <Ambulance className="w-4 h-4 shrink-0" />
          <span className="truncate">{selectedCountry === 'USA' ? '🚨 911' : t('tabAmbulance')}</span>
        </button>

        <button
          id="tab-btn-medical-card"
          type="button"
          onClick={() => {
            playTapSound();
            setActiveSection('card');
            speakInLanguage(t('tabHealthCard'), language);
          }}
          className={`py-3 px-1.5 rounded-xl font-black text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
            activeSection === 'card'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'text-stone-800 hover:bg-white/60'
          }`}
        >
          <Heart className="w-4 h-4 shrink-0 text-red-300 fill-red-400" />
          <span className="truncate">{t('tabHealthCard')}</span>
        </button>
      </div>

      {/* Current Location Banner with Live GPS Refresh */}
      <div 
        id="hospital-current-location-card"
        className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 sm:p-4 flex items-start gap-3 shadow-sm"
      >
        <div className="w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <MapPin className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-rose-900 block">
              {selectedCountry === 'USA' 
                ? (language === 'en' ? 'Your Location (to tell 911 Dispatcher):' : language === 'hi' ? 'आपका स्थान (911 ऑपरेटर को बताने हेतु):' : language === 'ta' ? 'உங்கள் இடம் (911 ஆபரேட்டரிடம் கூற):' : 'మీరు ఉన్న ప్రాంతం (911 ఆపరేటర్‌కు చెప్పడానికి):') 
                : (language === 'en' ? 'Your Location (to tell 108 / Hospital):' : language === 'hi' ? 'आपका स्थान (अस्पताल / 108 को बताने हेतु):' : language === 'ta' ? 'உங்கள் இடம் (108 ஆம்புலன்ஸிடம் கூற):' : 'మీరు ఉన్న ప్రాంతం (ఆసుపత్రి / 108 కి చెప్పడానికి):')}
            </span>
            <button
              id="btn-refresh-hospital-location"
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoadingHospitals}
              className="p-1 px-2.5 bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoadingHospitals ? 'animate-spin' : ''}`} />
              <span>{language === 'en' ? 'Refresh' : language === 'hi' ? 'रीफ्रेश' : language === 'ta' ? 'புதுப்பி' : 'తాజా చేయండి'}</span>
            </button>
          </div>

          <p className={`font-black text-stone-900 mt-1 leading-snug line-clamp-2 ${isLargeFont ? 'text-lg' : 'text-base'}`}>
            {locationBannerDisplay}
          </p>

          <span className="text-xs font-semibold text-stone-600 mt-1 block">
            📍 {language === 'en' ? 'State this address clearly when making an emergency call' : language === 'hi' ? 'आपातकालीन कॉल करते समय यह पता स्पष्ट बताएं' : language === 'ta' ? 'அவசர அழைப்பு செய்யும்போது இந்த முகவரியைக் கூறவும்' : 'అత్యవసర కాల్ చేసినప్పుడు ఈ అడ్రస్ చెప్పండి'}
          </span>
        </div>
      </div>

      {/* GPS Permission Request Card (shown if GPS permission denied or missing) */}
      {gpsError && (
        <div 
          id="hospital-gps-permission-card"
          className="bg-amber-50 border-3 border-amber-400 rounded-2xl p-4 sm:p-5 shadow-md space-y-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-7 h-7 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-stone-950 text-base sm:text-lg">
                {language === 'en' ? 'GPS Location Permission Required' : language === 'hi' ? 'जीपीएस लोकेशन अनुमति आवश्यक' : language === 'ta' ? 'ஜிபிஎஸ் இருப்பிட அனுமதி தேவை' : 'జీపీఎస్ లొకేషన్ అనుమతి అవసరం (GPS Permission Required)'}
              </h4>
              <p className="text-xs sm:text-sm font-bold text-stone-700 mt-0.5">
                {language === 'en' 
                  ? 'Please grant GPS permission to accurately find nearby hospitals and emergency ambulance services.' 
                  : language === 'hi' 
                  ? 'निकटतम अस्पताल और एम्बुलेंस सेवाएं देखने के लिए कृपया जीपीएस अनुमति दें।' 
                  : language === 'ta' 
                  ? 'அருகிலுள்ள மருத்துவமனைகள் மற்றும் ஆம்புலன்ஸ் சேவைகளைக் காண ஜிபிஎஸ் அனுமதியை வழங்கவும்.' 
                  : 'మీరు ప్రస్తుతం ఉన్న ఊరు మరియు సమీపంలోని ప్రభుత్వ, ప్రైవేట్ ఆసుపత్రులు, అంబులెన్స్ సేవలను ఖచ్చితంగా చూపించడానికి దయచేసి జీపీఎస్ లొకేషన్ అనుమతి ఇవ్వండి.'}
              </p>
            </div>
          </div>
          <button
            id="btn-grant-gps-permission"
            type="button"
            onClick={handleRefresh}
            className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-black rounded-xl text-base flex items-center justify-center gap-2 border-2 border-amber-600 shadow-sm cursor-pointer"
          >
            <MapPin className="w-5 h-5" />
            <span>📍 {language === 'en' ? 'Enable GPS / Retry' : language === 'hi' ? 'जीपीएस सक्षम करें / पुनः प्रयास' : language === 'ta' ? 'ஜிபிஎஸ் இயக்கவும் / மீண்டும் முயற்சி' : 'లొకేషన్ అనుమతించండి / రీఫ్రెష్ (Enable GPS / Retry)'}</span>
          </button>
        </div>
      )}

      {/* Safety Notice: Safe manual dialing */}
      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
        <span>
          {language === 'en' 
            ? 'Note: Tapping the call button opens your phone dialer safely. It does not dial automatically.' 
            : language === 'hi' 
            ? 'सूचना: कॉल बटन दबाने पर फोन डायलर सुरक्षित रूप से खुलता है। यह स्वचालित रूप से कॉल नहीं करता।' 
            : language === 'ta' 
            ? 'குறிப்பு: அழைப்பு பொத்தானை அழுத்தினால் போன் டயலர் பாதுகாப்பாக திறக்கும். தானாக அழைக்காது.' 
            : 'గమనిక: కాల్ బటన్ నొక్కితే మీ ఫోన్ డయలర్ ఓపెన్ అవుతుంది. ఆటోమేటిక్‌గా కాల్ చేయబడదు.'}
        </span>
      </div>

      {/* ============================================================= */}
      {/* ------------------- AMBULANCE / EMERGENCY VIEW -------------- */}
      {/* ============================================================= */}
      {activeSection === 'ambulance' && (
        <div id="section-ambulance-emergency" className="space-y-4">
          {/* INDIA: 108 AMBULANCE BANNER */}
          {selectedCountry === 'IN' && (
            <div className="bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white p-5 sm:p-6 rounded-3xl shadow-xl border-4 border-red-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-black uppercase">
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>{language === 'en' ? 'Govt Free Emergency Service' : language === 'hi' ? 'सरकारी मुफ्त आपातकालीन सेवा' : language === 'ta' ? 'அரசு இலவச அவசர சேவை' : 'ప్రభుత్వ ఉచిత అత్యవసర సేవ'}</span>
                </span>
                <span className="bg-yellow-400 text-stone-950 text-xs font-black px-3 py-1 rounded-full">
                  {language === 'en' ? '24/7 Ready' : language === 'hi' ? '24 घंटे तत्पर' : language === 'ta' ? '24 மணிநேரமும் தயார்' : '24 గంటలు సిద్ధం'}
                </span>
              </div>

              <div className="text-center space-y-2 py-2">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner border-2 border-white/30">
                  🚑
                </div>
                <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                  {language === 'en' ? '108 Ambulance' : language === 'hi' ? '108 एम्बुलेंस' : language === 'ta' ? '108 ஆம்புலன்ஸ்' : '108 అంబులెన్స్'}
                </h3>
                <p className="text-sm sm:text-base font-bold text-rose-100 max-w-md mx-auto">
                  {language === 'en' 
                    ? 'Call emergency ambulance immediately without delay during serious emergencies' 
                    : language === 'hi' 
                    ? 'गंभीर आपातकाल में बिना देरी किए तुरंत एम्बुलेंस बुलाएं' 
                    : language === 'ta' 
                    ? 'அவசர காலங்களில் தாமதமின்றி உடனே ஆம்புலன்ஸை அழைக்கவும்' 
                    : 'తీవ్రమైన అత్యవసర సమయాల్లో ఆలస్యం చేయకుండా వెంటనే అంబులెన్స్ పిలవండి'}
                </p>
              </div>

              <button
                id="btn-main-call-108"
                type="button"
                onClick={() => handleOneTapCall('108 అత్యవసర అంబులెన్స్', '108', 'ఉచిత అత్యవసర అంబులెన్స్ సేవలు')}
                className="w-full py-5 bg-yellow-400 hover:bg-yellow-500 active:scale-98 text-stone-950 font-black text-2xl sm:text-3xl rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all cursor-pointer border-3 border-yellow-500 min-h-[72px]"
              >
                <Phone className="w-8 h-8 text-stone-950 fill-stone-950 animate-bounce" />
                <span>{language === 'en' ? 'Call 108 Now' : language === 'hi' ? '108 पर कॉल करें' : language === 'ta' ? '108 ஐ அழைக்கவும்' : '108 కు కాల్ చేయండి'}</span>
              </button>
            </div>
          )}

          {/* USA: 911 EMERGENCY / AMBULANCE BANNER */}
          {selectedCountry === 'USA' && (
            <div className="bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white p-5 sm:p-6 rounded-3xl shadow-xl border-4 border-red-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-black uppercase">
                  <AlertOctagon className="w-4 h-4 text-white" />
                  <span>United States Emergency / Ambulance</span>
                </span>
                <span className="bg-yellow-400 text-stone-950 text-xs font-black px-3 py-1 rounded-full">
                  24/7 Service
                </span>
              </div>

              <div className="text-center space-y-2 py-2">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner border-2 border-white/30">
                  🚨
                </div>
                <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                  911 — Emergency / Ambulance
                </h3>
                <p className="text-sm sm:text-base font-bold text-rose-100 max-w-md mx-auto">
                  {language === 'en' 
                    ? 'Call 911 immediately for life-threatening emergencies, accidents, or urgent medical transport' 
                    : language === 'hi' 
                    ? 'गंभीर जीवन संकट, दुर्घटना या आपातकाल के लिए तुरंत 911 पर कॉल करें' 
                    : language === 'ta' 
                    ? 'உயிர் காக்கும் அவசர நிலைகளுக்கு உடனடியாக 911 ஐ அழைக்கவும்' 
                    : 'తీవ్రమైన ప్రాణాపాయం, ప్రమాదం, గుండెపోటు లేదా అత్యవసర అంబులెన్స్ కోసం 911 కి కాల్ చేయండి'}
                </p>
              </div>

              <button
                id="btn-main-call-911"
                type="button"
                onClick={() => handleOneTapCall('911 అత్యవసరం & అంబులెన్స్', '911', 'US Emergency / Ambulance Services')}
                className="w-full py-5 bg-yellow-400 hover:bg-yellow-500 active:scale-98 text-stone-950 font-black text-2xl sm:text-3xl rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all cursor-pointer border-3 border-yellow-500 min-h-[72px]"
              >
                <Phone className="w-8 h-8 text-stone-950 fill-stone-950 animate-bounce" />
                <span>{language === 'en' ? 'Call 911 Now' : language === 'hi' ? '911 पर कॉल करें' : language === 'ta' ? '911 ஐ அழைக்கவும்' : '911 కి కాల్ చేయండి (Call 911)'}</span>
              </button>
            </div>
          )}

          {/* India Verified Emergency Helplines: 112 & 104 */}
          {selectedCountry === 'IN' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 112 National Emergency Helpline */}
              <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-stone-950 text-base flex items-center gap-1.5">
                    <ShieldCheck className="w-5 h-5 text-red-600" />
                    <span>{language === 'en' ? '112 National Emergency' : language === 'hi' ? '112 राष्ट्रीय आपातकाल' : language === 'ta' ? '112 தேசிய அவசர எண்' : '112 జాతీయ అత్యవసరం'}</span>
                  </span>
                  <span className="bg-red-100 text-red-900 text-xs font-black px-2 py-0.5 rounded-md">
                    {language === 'en' ? 'Police / Ambulance' : language === 'hi' ? 'पुलिस / एम्बुलेंस' : language === 'ta' ? 'காவல்துறை / ஆம்புலன்ஸ்' : 'పోలీస్ / అంబులెన్స్'}
                  </span>
                </div>
                <p className="text-xs text-stone-600 font-bold">
                  {language === 'en' 
                    ? 'Official nationwide single emergency helpline across India.' 
                    : language === 'hi' 
                    ? 'पूरे भारत में सभी आपात स्थितियों के लिए आधिकारिक हेल्पलाइन।' 
                    : language === 'ta' 
                    ? 'இந்தியா முழுவதும் அனைத்து அவசரநிலைகளுக்கும் அதிகாரப்பூர்வ உதவி எண்.' 
                    : 'భారతదేశం అంతటా అన్ని అత్యవసర పరిస్థితులకు అధికారిక హెల్ప్‌లైన్.'}
                </p>
                <button
                  type="button"
                  onClick={() => handleOneTapCall('112 జాతీయ అత్యవసరం', '112', 'National Emergency 112')}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-lg rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Phone className="w-5 h-5" />
                  <span>{language === 'en' ? 'Call 112' : language === 'hi' ? '112 पर कॉल करें' : language === 'ta' ? '112 ஐ அழைக்கவும்' : '112 కి కాల్ చేయండి'}</span>
                </button>
              </div>

              {/* 104 Medical Advice */}
              <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-stone-950 text-base flex items-center gap-1.5">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    <span>{language === 'en' ? '104 Medical Advice' : language === 'hi' ? '104 स्वास्थ्य सलाह' : language === 'ta' ? '104 மருத்துவ ஆலோசனை' : '104 వైద్య సలహాలు'}</span>
                  </span>
                  <span className="bg-emerald-100 text-emerald-900 text-xs font-black px-2 py-0.5 rounded-md">
                    {language === 'en' ? 'Free Doctor Advice' : language === 'hi' ? 'मुफ्त डॉक्टर सलाह' : language === 'ta' ? 'இலவச மருத்துவர் ஆலோசனை' : 'ఉచిత డాక్టర్ సలహా'}
                  </span>
                </div>
                <p className="text-xs text-stone-600 font-bold">
                  {language === 'en' 
                    ? 'Doctor advice for BP, sugar, medicines & first aid.' 
                    : language === 'hi' 
                    ? 'बीपी, शुगर, दवाओं और प्राथमिक उपचार के लिए डॉक्टर की सलाह।' 
                    : language === 'ta' 
                    ? 'இரத்த அழுத்தம், சர்க்கரை, மருந்துகள் மற்றும் முதலுதவிக்கு மருத்துவ ஆலோசனை.' 
                    : 'బీపీ, షుగర్, మందుల సందేహాలు & ప్రథమ చికిత్సకు వైద్యుల సలహా.'}
                </p>
                <button
                  type="button"
                  onClick={() => handleOneTapCall('104 వైద్య సలహా', '104', 'Medical Advice Helpline')}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-lg rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Phone className="w-5 h-5" />
                  <span>{language === 'en' ? 'Call 104' : language === 'hi' ? '104 पर कॉल करें' : language === 'ta' ? '104 ஐ அழைக்கவும்' : '104 కి కాల్ చేయండి'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Emergency Siren Alert Toggle */}
          <div className="bg-amber-50 p-4 sm:p-5 rounded-3xl border-3 border-amber-300 shadow-sm space-y-3">
            <div>
              <h4 className="font-black text-stone-900 text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>{language === 'en' ? 'Emergency Siren (Alert Neighbors)' : language === 'hi' ? 'आपातकालीन सायरन (आसपास के लोगों को बुलाने हेतु)' : language === 'ta' ? 'அவசர சைரன் (அக்கம்பக்கத்தினரை அழைக்க)' : 'ఎమర్జెన్సీ సైరన్ (చుట్టుపక్కల వారిని పిలవడానికి)'}</span>
              </h4>
              <p className="text-xs sm:text-sm font-bold text-stone-600 mt-0.5">
                {language === 'en' 
                  ? 'Sound siren to immediately attract neighbors attention during danger' 
                  : language === 'hi' 
                  ? 'मुसीबत के समय आसपास के लोगों का ध्यान आकर्षित करने के लिए सायरन बजाएं' 
                  : language === 'ta' 
                  ? 'ஆபத்து நேரத்தில் அக்கம்பக்கத்தினரின் கவனத்தை ஈர்க்க சைரனை ஒலிக்கவும்' 
                  : 'ఆపద సమయంలో ఇరుగుపొరుగు వారి దృష్టిని ఆకర్షించడానికి సైరన్ మోగించండి'}
              </p>
            </div>

            <button
              id="btn-toggle-ambulance-siren"
              type="button"
              onClick={toggleSiren}
              className={`w-full py-4 px-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md border-2 ${
                isSirenOn
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-700 animate-pulse'
                  : 'bg-amber-400 hover:bg-amber-500 text-amber-950 border-amber-500 active:scale-98'
              }`}
            >
              {isSirenOn ? (
                <>
                  <BellOff className="w-6 h-6" />
                  <span>{language === 'en' ? 'Stop Siren' : language === 'hi' ? 'सायरन बंद करें' : language === 'ta' ? 'சைரனை நிறுத்து' : 'సైరన్ ఆపివేయండి (Stop Siren)'}</span>
                </>
              ) : (
                <>
                  <BellRing className="w-6 h-6 animate-bounce" />
                  <span>{language === 'en' ? 'Sound Siren' : language === 'hi' ? 'सायरन बजाएं' : language === 'ta' ? 'சைரனை ஒலி' : 'సైరన్ మోగించండి (Sound Siren)'}</span>
                </>
              )}
            </button>
          </div>

          {/* Local Hospital Emergency & Ambulance Numbers (Derived from nearby hospitals) */}
          {countryHospitals.length > 0 && (
            <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-stone-950 text-base sm:text-lg flex items-center gap-2">
                  <Ambulance className="w-5 h-5 text-rose-600" />
                  <span>{language === 'en' ? 'Nearby Hospital Emergency & Ambulance Phones:' : language === 'hi' ? 'निकटतम अस्पताल आपातकालीन / एम्बुलेंस नंबर:' : language === 'ta' ? 'அருகிலுள்ள மருத்துவமனை அவசர / ஆம்புலன்ஸ் எண்கள்:' : 'సమీప ఆసుపత్రుల అత్యవసర / అంబులెన్స్ ఫోన్లు:'}</span>
                </h4>
                <span className="text-xs font-black bg-rose-100 text-rose-900 px-2.5 py-0.5 rounded-full">
                  {language === 'en' ? 'Local Centers' : language === 'hi' ? 'स्थानीय केंद्र' : language === 'ta' ? 'உள்ளூர் மையங்கள்' : 'స్థానిక కేంద్రాలు'}
                </span>
              </div>
              <div className="space-y-2.5">
                {countryHospitals.slice(0, 5).map((h) => (
                  <div key={`amb-${h.id}`} className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black text-stone-900 text-sm truncate">{(language !== 'te' && h.nameEn) ? h.nameEn : h.name}</p>
                      <p className="text-xs font-bold text-stone-500">📍 {h.distanceKm} {language === 'en' ? 'km' : language === 'hi' ? 'कि.मी.' : language === 'ta' ? 'கி.மீ' : 'కి.మీ'} • {h.address}</p>
                    </div>
                    {h.phone ? (
                      <button
                        type="button"
                        onClick={() => handleOneTapCall((language !== 'te' && h.nameEn) ? h.nameEn : h.name, h.phone)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-lg text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Call' : language === 'hi' ? 'कॉल' : language === 'ta' ? 'அழை' : 'కాల్'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOneTapCall('108 అంబులెన్స్', '108')}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black rounded-lg text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>108</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Address guidance for Ambulance Dispatcher */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-stone-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>
                  {selectedCountry === 'USA' 
                    ? (language === 'en' ? 'Address to tell 911 Dispatcher:' : language === 'hi' ? '911 ऑपरेटर को बताने हेतु पता:' : language === 'ta' ? '911 ஆபரேட்டரிடம் கூற வேண்டிய முகவரி:' : '911 డిస్పాచర్‌కు చెప్పాల్సిన చిరునామా:') 
                    : (language === 'en' ? 'Address to tell 108 / Ambulance Operator:' : language === 'hi' ? '108 ऑपरेटर को बताने हेतु पता:' : language === 'ta' ? '108 ஆபரேட்டரிடம் கூற வேண்டிய முகவரி:' : '108 ఆపరేటర్‌కు చెప్పాల్సిన చిరునామా:')}
                </span>
              </span>
              <button
                id="btn-speak-ambulance-address"
                type="button"
                onClick={() => {
                  playTapSound();
                  const addrSpeech = language === 'en'
                    ? `Your current address: ${locationBannerDisplay}. Tell this address to the ambulance dispatcher.`
                    : language === 'hi'
                    ? `आपका वर्तमान पता: ${locationBannerDisplay}। एम्बुलेंस ऑपरेटर को यह पता बताएं।`
                    : language === 'ta'
                    ? `உங்கள் தற்போதைய முகவரி: ${locationBannerDisplay}. இந்த முகவரியை ஆம்புலன்ஸிடம் தெரிவிக்கவும்.`
                    : `మీ ప్రస్తుత చిరునామా: ${locationBannerDisplay}. ఈ చిరునామాను అంబులెన్స్ వారికి చెప్పండి.`;
                  speakInLanguage(addrSpeech, language);
                }}
                className="text-xs font-black bg-rose-100 hover:bg-rose-200 text-rose-900 px-3 py-1.5 rounded-xl border border-rose-300 flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Listen' : language === 'hi' ? 'सुनें' : language === 'ta' ? 'கேளுங்கள்' : 'వినండి'}</span>
              </button>
            </div>
            <p className="font-black text-stone-900 text-base sm:text-lg bg-stone-50 p-3 rounded-xl border border-stone-200">
              {locationBannerDisplay}
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {language === 'en' 
                  ? 'Speak your name and this address clearly as soon as the call connects.' 
                  : language === 'hi' 
                  ? 'कॉल कनेक्ट होते ही अपना नाम और यह पता स्पष्ट रूप से बताएं।' 
                  : language === 'ta' 
                  ? 'அழைப்பு இணைந்தவுடன் உங்கள் பெயரையும் இந்த முகவரியையும் தெளிவாகக் கூறவும்.' 
                  : 'ఫోన్ కలిసిన వెంటనే మీ పేరు మరియు ఈ చిరునామాను స్పష్టంగా చెప్పండి.'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* ------------------- HOSPITALS VIEW -------------------------- */}
      {/* ============================================================= */}
      {activeSection === 'hospitals' && (
        <div id="section-hospitals-list" className="space-y-4">
          {/* Hospital Header & Filter Tabs */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-stone-200 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className={`font-black text-stone-900 flex items-center gap-2 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
                <span>{language === 'en' ? '🏥 Nearby Hospitals List' : language === 'hi' ? '🏥 निकटतम अस्पताल सूची' : language === 'ta' ? '🏥 அருகிலுள்ள மருத்துவமனைகள்' : '🏥 సమీప ఆసుపత్రుల జాబితా'}</span>
                <span className="bg-rose-100 text-rose-900 text-xs font-black px-2.5 py-0.5 rounded-full border border-rose-300">
                  {displayedHospitals.length} {language === 'en' ? 'Hospitals' : language === 'hi' ? 'अस्पताल' : language === 'ta' ? 'மருத்துவமனைகள்' : 'ఆసుపత్రులు'}
                </span>
              </h3>
              <button
                id="hospital-refresh-btn"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoadingHospitals}
                type="button"
                className="p-2 sm:px-3 sm:py-1.5 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 rounded-xl font-black text-xs flex items-center gap-1.5 border border-stone-300 shadow-xs cursor-pointer"
                title={language === 'en' ? 'Search Again' : language === 'hi' ? 'पुनः खोजें' : language === 'ta' ? 'மீண்டும் தேடு' : 'మళ్లీ వెతకండి'}
              >
                <RefreshCw className={`w-3.5 h-3.5 text-stone-700 ${isRefreshing || isLoadingHospitals ? 'animate-spin text-rose-600' : ''}`} />
                <span className="hidden sm:inline">{language === 'en' ? 'Search Again' : language === 'hi' ? 'पुनः खोजें' : language === 'ta' ? 'மீண்டும் தேடு' : 'మళ్లీ వెతకండి'}</span>
              </button>
            </div>

            {/* Quick 1-Tap 108 / 911 Emergency Ambulance Banner */}
            <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-3 sm:p-4 rounded-2xl text-white flex items-center justify-between gap-3 shadow-md border-2 border-red-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl sm:text-3xl">🚑</span>
                <div className="min-w-0">
                  <p className="font-black text-sm sm:text-base leading-tight">
                    {selectedCountry === 'USA' 
                      ? (language === 'en' ? '911 Emergency Ambulance' : language === 'hi' ? '911 आपातकालीन एम्बुलेंस' : language === 'ta' ? '911 அவசர ஆம்புலன்ஸ்' : '911 అత్యవసర అంబులెన్స్')
                      : (language === 'en' ? '108 Emergency Ambulance (Free)' : language === 'hi' ? '108 आपातकालीन एम्बुलेंस (मुफ्त)' : language === 'ta' ? '108 அவசர ஆம்புலன்ஸ் (இலவசம்)' : '108 అత్యవసర అంబులెన్స్ (ఉచితం)')}
                  </p>
                  <p className="text-[11px] sm:text-xs text-rose-100 font-bold truncate">
                    {selectedCountry === 'USA' 
                      ? (language === 'en' ? 'Call immediately for life-threatening emergencies' : language === 'hi' ? 'गंभीर आपातकाल के लिए तुरंत कॉल करें' : language === 'ta' ? 'உயிர் காக்கும் அவசரநிலைகளுக்கு உடனே அழைக்கவும்' : 'తీవ్రమైన ప్రాణాపాయం కోసం వెంటనే కాల్ చేయండి')
                      : (language === 'en' ? '24/7 Government Emergency Medical Service' : language === 'hi' ? '24 घंटे उपलब्ध सरकारी आपातकालीन सेवा' : language === 'ta' ? '24 மணிநேரமும் கிடைக்கும் அரசு அவசர சேவை' : '24 గంటలు అందుబాటులో ఉండే ప్రభుత్వ అత్యవసర సేవ')}
                  </p>
                </div>
              </div>
              <button
                id="btn-quick-108-call"
                type="button"
                onClick={() => handleOneTapCall(selectedCountry === 'USA' ? '911' : '108', selectedCountry === 'USA' ? '911' : '108')}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-yellow-400 hover:bg-yellow-500 active:scale-95 text-stone-950 font-black rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shrink-0 shadow cursor-pointer border-2 border-yellow-500"
              >
                <Phone className="w-4 h-4 fill-stone-950" />
                <span>{selectedCountry === 'USA' ? 'Call 911' : (language === 'en' ? 'Call 108' : language === 'hi' ? '108 कॉल' : language === 'ta' ? '108 அழைப்பு' : '108 కాల్')}</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                id="hospital-filter-all"
                type="button"
                onClick={() => {
                  playTapSound();
                  setFilterType('all');
                  const pillMsg = language === 'en' ? 'All hospitals list' : language === 'hi' ? 'सभी अस्पतालों की सूची' : language === 'ta' ? 'அனைத்து மருத்துவமனைகள்' : 'అన్ని ఆసుపత్రుల జాబితా';
                  speakInLanguage(pillMsg, language);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap border-2 transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                {language === 'en' ? 'All' : language === 'hi' ? 'सभी' : language === 'ta' ? 'அனைத்தும்' : 'అన్నీ'} ({countryHospitals.length})
              </button>

              <button
                id="hospital-filter-govt"
                type="button"
                onClick={() => {
                  playTapSound();
                  setFilterType('government');
                  const pillMsg = language === 'en' ? 'Government hospitals' : language === 'hi' ? 'सरकारी अस्पताल' : language === 'ta' ? 'அரசு மருத்துவமனைகள்' : 'ప్రభుత్వ ఆసుపత్రులు';
                  speakInLanguage(pillMsg, language);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap border-2 transition-all cursor-pointer ${
                  filterType === 'government'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                🏛️ {language === 'en' ? 'Government' : language === 'hi' ? 'सरकारी' : language === 'ta' ? 'அரசு' : 'ప్రభుత్వ ఆసుపత్రులు'}
              </button>

              <button
                id="hospital-filter-private"
                type="button"
                onClick={() => {
                  playTapSound();
                  setFilterType('private');
                  const pillMsg = language === 'en' ? 'Private hospitals' : language === 'hi' ? 'निजी अस्पताल' : language === 'ta' ? 'தனியார் மருத்துவமனைகள்' : 'ప్రైవేట్ ఆసుపత్రులు';
                  speakInLanguage(pillMsg, language);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap border-2 transition-all cursor-pointer ${
                  filterType === 'private'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                🏥 {language === 'en' ? 'Private' : language === 'hi' ? 'निजी' : language === 'ta' ? 'தனியார்' : 'ప్రైవేట్ ఆసుపత్రులు'}
              </button>

              <button
                id="hospital-filter-24hours"
                type="button"
                onClick={() => {
                  playTapSound();
                  setFilterType('24hours');
                  const pillMsg = language === 'en' ? '24 hours emergency hospitals' : language === 'hi' ? '24 घंटे आपातकालीन अस्पताल' : language === 'ta' ? '24 மணிநேர அவசர மருத்துவமனைகள்' : '24 గంటల ఎమర్జెన్సీ ఆసుపత్రులు';
                  speakInLanguage(pillMsg, language);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap border-2 transition-all cursor-pointer ${
                  filterType === '24hours'
                    ? 'bg-red-600 text-white border-red-700 shadow-sm'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                🚨 {language === 'en' ? '24/7 Emergency (ER)' : language === 'hi' ? '24/7 आपातकाल (ER)' : language === 'ta' ? '24/7 அவசர சிகிச்சை (ER)' : '24/7 ఎమర్జెన్సీ (ER)'}
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoadingHospitals && displayedHospitals.length === 0 && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 text-center flex items-center justify-center gap-3 text-stone-800 font-bold shadow-sm">
              <RefreshCw className="w-6 h-6 text-rose-600 animate-spin shrink-0" />
              <span className="text-base sm:text-lg font-black">
                {language === 'en' 
                  ? 'Detecting nearby hospitals based on your GPS location...' 
                  : language === 'hi' 
                  ? 'आपके जीपीएस स्थान के आधार पर निकटतम अस्पतालों की खोज की जा रही है...' 
                  : language === 'ta' 
                  ? 'உங்கள் ஜிபிஎஸ் இருப்பிடத்தின் அடிப்படையில் அருகிலுள்ள மருத்துவமனைகள் தேடப்படுகின்றன...' 
                  : 'మీ ప్రస్తుత GPS స్థానం ఆధారంగా సమీప ఆసుపత్రులను గుర్తిస్తున్నాం...'}
              </span>
            </div>
          )}

          {/* Empty Fallback Notice */}
          {!isLoadingHospitals && hospitalsFetched && displayedHospitals.length === 0 && (
            <div className="bg-stone-50 border-3 border-stone-300 rounded-3xl p-6 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 bg-rose-100 text-rose-800 rounded-2xl flex items-center justify-center mx-auto text-2xl">
                🏥
              </div>
              <div className="space-y-1">
                <p className="text-stone-900 font-black text-lg sm:text-xl">
                  {language === 'en' 
                    ? 'Hospital details are currently unavailable in this specific area.' 
                    : language === 'hi' 
                    ? 'इस क्षेत्र में अस्पताल का विवरण फिलहाल उपलब्ध नहीं है।' 
                    : language === 'ta' 
                    ? 'இந்த பகுதியில் மருத்துவமனை விவரங்கள் தற்போது கிடைக்கவில்லை.' 
                    : 'ఈ ప్రాంతంలో ఆసుపత్రి వివరాలు ప్రస్తుతం అందుబాటులో లేవు.'}
                </p>
                <p className="text-xs sm:text-sm text-stone-600 font-bold">
                  {selectedCountry === 'USA' 
                    ? (language === 'en' ? 'For any medical emergency, please call 🚨 911 immediately.' : language === 'hi' ? 'चिकित्सा आपातकाल के लिए कृपया तुरंत 🚨 911 पर कॉल करें।' : language === 'ta' ? 'மருத்துவ அவசரநிலைக்கு உடனே 🚨 911 ஐ அழைக்கவும்.' : 'అత్యవసర వైద్య పరిస్థితి కోసం పైన ఉన్న 🚨 911 కి వెంటనే కాల్ చేయండి.') 
                    : (language === 'en' ? 'For any emergency, please call free 🚨 108 Ambulance or 112 immediately.' : language === 'hi' ? 'किसी भी आपातकाल के लिए तुरंत मुफ्त 🚨 108 एम्बुलेंस या 112 पर कॉल करें।' : language === 'ta' ? 'அவசரநிலைக்கு இலவச 🚨 108 ஆம்புலன்ஸ் அல்லது 112 ஐ உடனடியாக அழைக்கவும்.' : 'అత్యవసర పరిస్థితి కోసం ఉచిత 🚨 108 అంబులెన్స్ లేదా 112 కి వెంటనే కాల్ చేయండి.')}
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleOneTapCall(selectedCountry === 'USA' ? '911' : '108 అంబులెన్స్', selectedCountry === 'USA' ? '911' : '108')}
                  className="px-6 py-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-lg rounded-2xl shadow-lg border-2 border-red-800 flex items-center justify-center gap-2.5 mx-auto cursor-pointer"
                >
                  <Phone className="w-6 h-6" />
                  <span>{selectedCountry === 'USA' ? 'Call 911' : (language === 'en' ? 'Call 108' : language === 'hi' ? '108 पर कॉल करें' : language === 'ta' ? '108 ஐ அழைக்கவும்' : '108 కి కాల్ చేయండి')}</span>
                </button>
              </div>
            </div>
          )}

          {/* IN-APP HOSPITAL CARDS LIST (Never leaves app automatically) */}
          {displayedHospitals.length > 0 && (
            <div className="space-y-4">
              {displayedHospitals.map((hospital, index) => (
                <div 
                  key={hospital.id || `hosp-${index}`}
                  id={`hospital-card-${index}`}
                  className="bg-white border-3 border-stone-200 hover:border-rose-400 rounded-3xl p-5 shadow-md transition-all space-y-3.5"
                >
                  {/* Card Header & Badges */}
                  <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-rose-100 text-rose-900 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner border border-rose-300">
                        🏥
                      </div>
                      <div>
                        {/* Categorization Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          {hospital.type === 'government' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-950 px-2.5 py-0.5 rounded-full text-xs font-black border border-emerald-300">
                              🏛️ {language === 'en' ? 'Government Hospital' : language === 'hi' ? 'सरकारी अस्पताल' : language === 'ta' ? 'அரசு மருத்துவமனை' : 'ప్రభుత్వ ఆసుపత్రి'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-950 px-2.5 py-0.5 rounded-full text-xs font-black border border-blue-300">
                              🏥 {language === 'en' ? 'Private Hospital' : language === 'hi' ? 'निजी अस्पताल' : language === 'ta' ? 'தனியார் மருத்துவமனை' : 'ప్రైవేట్ ఆసుపత్రి'}
                            </span>
                          )}

                          {hospital.emergency && (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-950 px-2.5 py-0.5 rounded-full text-xs font-black border border-red-300">
                              🚨 {language === 'en' ? '24/7 Emergency (ER)' : language === 'hi' ? '24/7 आपातकाल (ER)' : language === 'ta' ? '24/7 அவசர சிகிச்சை (ER)' : '24/7 ఎమర్జెన్సీ'}
                            </span>
                          )}
                        </div>

                        {/* Hospital Name */}
                        <h4 className={`font-black text-stone-950 leading-tight ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
                          {(language !== 'te' && hospital.nameEn) ? hospital.nameEn : hospital.name}
                        </h4>
                      </div>
                    </div>

                    {/* Live Distance from GPS */}
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 font-mono text-sm sm:text-base font-black text-rose-950 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200">
                        <MapPin className="w-3.5 h-3.5 text-rose-700" />
                        <span>{hospital.distanceKm} {language === 'en' ? 'km' : language === 'hi' ? 'कि.मी.' : language === 'ta' ? 'கி.மீ' : 'కి.మీ'} ({hospital.distanceMiles} {language === 'en' ? 'miles' : language === 'hi' ? 'मील' : language === 'ta' ? 'மைல்கள்' : 'మైళ్ళు'})</span>
                      </span>
                    </div>
                  </div>

                  {/* Verified Address */}
                  {hospital.address && (
                    <div className="text-xs sm:text-sm font-bold text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                      <span>{hospital.address}</span>
                    </div>
                  )}

                  {/* Verified Phone Display */}
                  {hospital.phone && (
                    <div className="flex items-center justify-between gap-2 px-1">
                      <span className="text-xs font-black text-stone-500 uppercase tracking-wider">
                        {language === 'en' ? 'Phone Number:' : language === 'hi' ? 'फोन नंबर:' : language === 'ta' ? 'தொலைபேசி எண்:' : 'ఫోన్ నంబర్ (Phone):'}
                      </span>
                      <span className="font-mono text-base sm:text-lg font-black text-stone-950">
                        {hospital.phone}
                      </span>
                    </div>
                  )}

                  {/* Two Action Buttons: 1. Big Call Button & 2. Big Directions Button */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* Call Button */}
                    {hospital.phone ? (
                      <button
                        id={`btn-call-hospital-${index}`}
                        onClick={() => handleOneTapCall((language !== 'te' && hospital.nameEn) ? hospital.nameEn : hospital.name, hospital.phone, hospital.address)}
                        type="button"
                        className="py-4 px-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-green-700 hover:from-emerald-700 hover:to-green-800 active:scale-[0.98] text-white font-black rounded-2xl shadow-lg border-2 border-emerald-800 flex items-center justify-center gap-2.5 text-lg sm:text-xl transition-all cursor-pointer min-h-[64px]"
                        aria-label={`${hospital.name} Call`}
                      >
                        <Phone className="w-6 h-6 shrink-0" />
                        <span>📞 {language === 'en' ? 'Call Now' : language === 'hi' ? 'कॉल करें' : language === 'ta' ? 'அழைக்கவும்' : 'కాల్ చేయండి (Call)'}</span>
                      </button>
                    ) : (
                      <button
                        id={`btn-call-hospital-fallback-${index}`}
                        onClick={() => handleOneTapCall('108 అత్యవసర అంబులెన్స్', '108')}
                        type="button"
                        className="py-4 px-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 active:scale-[0.98] text-white font-black rounded-2xl shadow-lg border-2 border-red-800 flex items-center justify-center gap-2.5 text-lg sm:text-xl transition-all cursor-pointer min-h-[64px]"
                        aria-label="Emergency Call"
                      >
                        <Phone className="w-6 h-6 shrink-0" />
                        <span>📞 {selectedCountry === 'USA' ? (language === 'en' ? 'Call 911' : language === 'hi' ? '911 पर कॉल करें' : language === 'ta' ? '911 ஐ அழைக்கவும்' : '911 కి కాల్ చేయండి') : (language === 'en' ? 'Call 108' : language === 'hi' ? '108 पर कॉल करें' : language === 'ta' ? '108 ஐ அழைக்கவும்' : '108 కి కాల్ చేయండి')}</span>
                      </button>
                    )}

                    {/* Directions Button — Only when clicked, opens Google Maps route */}
                    <button
                      id={`btn-map-hospital-${index}`}
                      onClick={() => handleOpenDirections(hospital.name, hospital.directionsUrl, hospital.lat, hospital.lng)}
                      type="button"
                      className="py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 active:scale-[0.98] text-white font-black rounded-2xl shadow-lg border-2 border-blue-800 flex items-center justify-center gap-2.5 text-lg sm:text-xl transition-all cursor-pointer min-h-[64px]"
                      title={language === 'en' ? 'View Route on Google Maps' : language === 'hi' ? 'गूगल मैप्स पर रास्ता देखें' : language === 'ta' ? 'கூகிள் வரைபடத்தில் வழியைக் காண்க' : 'గూగుల్ మ్యాప్‌లో దారి చూడండి'}
                    >
                      <Navigation className="w-6 h-6 shrink-0" />
                      <span>🗺️ {language === 'en' ? 'Get Directions' : language === 'hi' ? 'रास्ता देखें' : language === 'ta' ? 'வழி காட்டு' : 'దారి చూపించండి (Directions)'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Senior Personal Emergency Health Profile & Family Doctor */}
          {renderMedicalCard()}
        </div>
      )}

      {/* ============================================================= */}
      {/* ------------------- MEDICAL HEALTH CARD VIEW ---------------- */}
      {/* ============================================================= */}
      {activeSection === 'card' && (
        <div id="section-medical-health-card" className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-4 sm:p-5 rounded-3xl shadow-lg border-3 border-emerald-900 flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner text-3xl">
              ❤️
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`font-black text-white tracking-tight ${isLargeFont ? 'text-3xl' : 'text-2xl'}`}>
                {language === 'en' ? 'My Medical Card' : language === 'hi' ? 'मेरा स्वास्थ्य कार्ड' : language === 'ta' ? 'எனது மருத்துவ அட்டை' : 'నా ఆరోగ్య కార్డు (Medical Card)'}
              </h2>
              <p className="font-bold text-emerald-100 text-xs sm:text-sm mt-0.5">
                {language === 'en' 
                  ? 'Your blood group, medications, and family doctor contact details' 
                  : language === 'hi' 
                  ? 'आपका रक्त समूह, दवाएं और पारिवारिक डॉक्टर की जानकारी' 
                  : language === 'ta' 
                  ? 'உங்கள் இரத்த வகை, மருந்துகள் மற்றும் குடும்ப மருத்துவர் தகவல்' 
                  : 'మీ రక్త వర్గం, మందులు మరియు ఫ్యామిలీ డాక్టర్ సమాచారం'}
              </p>
            </div>
          </div>
          {renderMedicalCard()}
        </div>
      )}

      {/* Bottom Sticky Home Button */}
      <div className="pt-2">
        <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
      </div>
    </div>
  );
};
