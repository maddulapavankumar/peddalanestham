import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { ScreenType } from './types';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { AutoScreen } from './components/AutoScreen';
import { HospitalScreen } from './components/HospitalScreen';
import { AmbulanceScreen } from './components/AmbulanceScreen';
import { PhoneScreen } from './components/PhoneScreen';
import { SosScreen } from './components/SosScreen';
import { LocationScreen } from './components/LocationScreen';
import { FamilyScreen } from './components/FamilyScreen';
import { HelpScreen } from './components/HelpScreen';
import { DriverScreen } from './components/DriverScreen';
import { HelplineScreen } from './components/HelplineScreen';
import { CountryCode } from './components/CountrySelector';
import { Home, PhoneCall, ShieldAlert, Smartphone } from 'lucide-react';
import { playTapSound, speakInLanguage, stopSpeaking, isVoiceEnabled, toggleVoiceEnabled } from './utils/audio';
import { setDetectedCountry, detectCountryFromDevice } from './utils/countryDetection';
import { fetchCompleteReadableAddress, buildCompleteReadableAddress } from './utils/reverseGeocode';
import { isInsideIframePreview } from './utils/previewHelper';
import { LanguageProvider, useLanguage } from './utils/i18n';

function MainAppContent() {
  const { language, t } = useLanguage();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [globalCountry, setGlobalCountry] = useState<CountryCode>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('peddala_global_country');
      if (saved === 'USA' || saved === 'IN') return saved;
    }
    return 'IN';
  });

  const handleSelectCountry = (country: CountryCode) => {
    setGlobalCountry(country);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('peddala_global_country', country);
      }
    } catch {
      // ignore
    }
    // Also align the phone-number default country
    if (country === 'USA') {
      setDetectedCountry('US');
    } else {
      setDetectedCountry('IN');
    }
  };
  const [isLargeFont, setIsLargeFont] = useState<boolean>(() => {
    return localStorage.getItem('peddala_nestham_large_font') === 'true';
  });
  const [isVoiceOn, setIsVoiceOn] = useState<boolean>(() => isVoiceEnabled());

  const initialAddressText = language === 'en' ? 'Detecting GPS location...' : language === 'hi' ? 'जीपीएस स्थान पहचान रहे हैं...' : language === 'ta' ? 'ஜிபிஎஸ் இருப்பிடத்தை கண்டறிகிறது...' : 'స్థానాన్ని గుర్తిస్తున్నాం...';
  const [address, setAddress] = useState<string>(initialAddressText);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isLocLoading, setIsLocLoading] = useState<boolean>(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [locErrorCode, setLocErrorCode] = useState<number | 'UNSUPPORTED' | null>(null);
  const lastGeocodedCoords = useRef<{ lat: number; lng: number } | null>(null);
  const latRef = useRef<number | null>(null);
  const addressRef = useRef<string>(initialAddressText);
  const activeFetchPromise = useRef<Promise<{ lat: number; lng: number; address: string } | null> | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  useEffect(() => {
    latRef.current = lat;
  }, [lat]);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  // Helper for clear GPS error reason in selected language
  const getGpsErrorMessage = (code: number | 'UNSUPPORTED', isIframe: boolean = false): string => {
    if (language === 'en') {
      if (code === 1) {
        if (isIframe) {
          return 'Location permission denied (blocked by browser security in preview frame).';
        }
        return 'Location permission denied. Please allow location access to get your GPS address.';
      }
      if (code === 2) return 'GPS signal unavailable. Please ensure Location/GPS is turned on in your device settings.';
      if (code === 3) return 'GPS request timed out. Please try again.';
      if (code === 'UNSUPPORTED') return 'GPS location is not supported on this browser or device.';
      return 'An error occurred while getting location. Please try again.';
    }
    if (language === 'hi') {
      if (code === 1) {
        if (isIframe) {
          return 'लोकेशन अनुमति अस्वीकृत (ब्राउज़र सुरक्षा के कारण पूर्वावलोकन में अनुमति अवरुद्ध)।';
        }
        return 'लोकेशन अनुमति अस्वीकृत। GPS प्राप्त करने के लिए कृपया अनुमति दें।';
      }
      if (code === 2) return 'डिवाइस पर GPS सिग्नल नहीं मिल रहा है। कृपया फ़ोन में Location/GPS चालू करें।';
      if (code === 3) return 'स्थान प्राप्त करने में समय समाप्त हो गया। कृपया पुन: प्रयास करें।';
      if (code === 'UNSUPPORTED') return 'इस ब्राउज़र या डिवाइस पर GPS स्थान उपलब्ध नहीं है।';
      return 'स्थान प्राप्त करने में त्रुटि हुई। कृपया पुन: प्रयास करें।';
    }
    if (language === 'ta') {
      if (code === 1) {
        if (isIframe) {
          return 'இருப்பிட அனுமதி மறுக்கப்பட்டது (உலவிப் பாதுகாப்பு காரணமாக அனுமதி தடுக்கப்பட்டுள்ளது).';
        }
        return 'இருப்பிட அனுமதி மறுக்கப்பட்டது. GPS பெற அனுமதியை இயக்கவும்.';
      }
      if (code === 2) return 'சாதனத்தில் GPS சிக்னல் கிடைக்கவில்லை. தயவுசெய்து தொலைபேசியில் Location/GPS ஐ இயக்கவும்.';
      if (code === 3) return 'இருப்பிடத்தைப் பெறுவதற்கான நேரம் முடிந்துவிட்டது. மீண்டும் முயற்சிக்கவும்.';
      if (code === 'UNSUPPORTED') return 'இந்த உலாவியில் அல்லது சாதனத்தில் GPS வசதி கிடைக்கவில்லை.';
      return 'இருப்பிடத்தைப் பெறுவதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.';
    }
    // Default Telugu
    if (code === 1) {
      if (isIframe) {
        return 'లొకేషన్ అనుమతి నిరాకరించబడింది (Google AI Studio Preview ఐఫ్రేమ్‌లో బ్రౌజర్ సెక్యూరిటీ వల్ల అనుమతి నిరోధించబడింది).';
      }
      return 'లొకేషన్ అనుమతి నిరాకరించబడింది (Location Permission Denied). GPS పొందడానికి దయచేసి అనుమతిని ఆన్ చేయండి.';
    }
    if (code === 2) {
      return 'పరికరంలో GPS సిగ్నల్ అందడం లేదు (GPS Signal Unavailable). దయచేసి ఫోన్‌లో Location/GPS ఆన్ చేసి మళ్లీ ప్రయత్నించండి.';
    }
    if (code === 3) {
      return 'లొకేషన్ పొందడానికి సమయం మించింది (GPS Request Timed Out). దయచేసి మళ్లీ ప్రయత్నించండి.';
    }
    if (code === 'UNSUPPORTED') {
      return 'ఈ బ్రౌజర్‌లో లేదా పరికరంలో GPS లొకేషన్ సదుపాయం అందుబాటులో లేదు.';
    }
    return 'లొకేషన్ పొందడంలో లోపం ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి.';
  };

  // Helper to format structured real address with maximum precision
  const formatAddressData = (data: any, latitude: number, longitude: number): string => {
    return buildCompleteReadableAddress(data, latitude, longitude);
  };

  // Dedicated multi-provider reverse geocoding resolver using device's real GPS
  const resolveAddress = useCallback(async (latitude: number, longitude: number): Promise<string> => {
    const res = await fetchCompleteReadableAddress(latitude, longitude);
    if (res.countryCode) {
      setDetectedCountry(res.countryCode);
    }
    return res.address;
  }, []);

  // Fetch real device GPS location dynamically at this exact moment (maximumAge: 0, no cached location)
  const fetchLocation = useCallback((silent: boolean = false, forceGeocode: boolean = true): Promise<{ lat: number; lng: number; address: string } | null> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocErrorCode('UNSUPPORTED');
      setLocError(getGpsErrorMessage('UNSUPPORTED'));
      setAddress('GPS location unavailable');
      setIsLocLoading(false);
      return Promise.resolve(null);
    }

    // Reuse in-flight promise if another request was triggered within milliseconds (prevents iOS Safari duplicate prompt cancellation)
    if (isFetchingRef.current && activeFetchPromise.current) {
      return activeFetchPromise.current;
    }

    isFetchingRef.current = true;

    // Show loading placeholder if not a background silent update
    if (!silent) {
      setIsLocLoading(true);
      setLocError(null);
      setLocErrorCode(null);
      if (latRef.current === null) {
        setAddress('మీ పరికరం నుండి నిజమైన జీపీఎస్ స్థానాన్ని గుర్తిస్తున్నాం...');
      }
    }

    const promise = new Promise<{ lat: number; lng: number; address: string } | null>((resolve) => {
      let isDone = false;
      const finish = (val: { lat: number; lng: number; address: string } | null) => {
        if (!isDone) {
          isDone = true;
          isFetchingRef.current = false;
          activeFetchPromise.current = null;
          resolve(val);
        }
      };

      const handlePosSuccess = async (pos: GeolocationPosition) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        const acc = pos.coords.accuracy;

        // GPS coordinates నిజంగా వచ్చిన తర్వాత మాత్రమే లొకేషన్ విజయవంతమైందని చూపించాలి.
        if (
          typeof latitude === 'number' &&
          typeof longitude === 'number' &&
          !isNaN(latitude) &&
          !isNaN(longitude) &&
          (latitude !== 0 || longitude !== 0)
        ) {
          setLat(latitude);
          setLng(longitude);
          setAccuracy(acc);
          setLocError(null);
          setLocErrorCode(null);

          const prev = lastGeocodedCoords.current;
          const hasMoved = !prev || Math.abs(prev.lat - latitude) > 0.00006 || Math.abs(prev.lng - longitude) > 0.00006;
          const currentAddr = addressRef.current;
          const needsGeocode = forceGeocode || hasMoved || !currentAddr || currentAddr.includes('గుర్తిస్తున్నాం') || currentAddr.includes('unavailable');

          if (needsGeocode) {
            lastGeocodedCoords.current = { lat: latitude, lng: longitude };
            const formatted = await resolveAddress(latitude, longitude);
            setAddress(formatted);
            setIsLocLoading(false);
            finish({ lat: latitude, lng: longitude, address: formatted });
          } else {
            setIsLocLoading(false);
            finish({ lat: latitude, lng: longitude, address: currentAddr });
          }
        } else {
          setIsLocLoading(false);
          setLocErrorCode(2);
          setLocError(getGpsErrorMessage(2));
          finish(null);
        }
      };

      // Tier 1: Try high accuracy (satellite GPS) with maximumAge: 0 for fresh coordinates
      // 15 seconds allows adequate time on iPhone for the user to tap "Allow" in system prompt
      navigator.geolocation.getCurrentPosition(
        handlePosSuccess,
        (highAccErr) => {
          const inIframe = isInsideIframePreview();
          if (highAccErr.code === 1) {
            // User explicitly denied permission, or iOS disabled location, or Preview iframe blocked
            setIsLocLoading(false);
            setLocErrorCode(1);
            setLocError(getGpsErrorMessage(1, inIframe));
            setAddress('GPS location unavailable');
            finish(null);
            return;
          }

          // Tier 2: Timeout or signal unavailable - try standard accuracy with maximumAge: 0
          navigator.geolocation.getCurrentPosition(
            handlePosSuccess,
            (lowAccErr) => {
              setIsLocLoading(false);
              const errCode = (lowAccErr.code as number) || (highAccErr.code as number) || 2;
              setLocErrorCode(errCode);
              setLocError(getGpsErrorMessage(errCode, inIframe));
              if (latRef.current === null) {
                setAddress('GPS location unavailable');
              }
              finish(null);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
          );
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

    activeFetchPromise.current = promise;
    return promise;
  }, [resolveAddress]);

  useEffect(() => {
    fetchLocation(true, true);
    detectCountryFromDevice();
  }, [fetchLocation]);

  // Monitor permission state changes if supported by browser
  useEffect(() => {
    if (typeof window !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((status) => {
        status.onchange = () => {
          if (status.state === 'granted') {
            fetchLocation();
          }
        };
      }).catch(() => {});
    }
  }, [fetchLocation]);

  // Main scroll container ref for top-of-screen resets on navigation
  const mainRef = useRef<HTMLElement | null>(null);
  const isNavigatingRef = useRef<boolean>(false);

  // Continuously watch dynamic GPS updates while user is on location, sos, auto, or hospital screen.
  // If the user is travelling in an auto or car, automatically updates to user's new current position!
  useEffect(() => {
    if (
      (currentScreen !== 'location' && currentScreen !== 'sos' && currentScreen !== 'auto' && currentScreen !== 'hospital') ||
      typeof window === 'undefined' ||
      !navigator.geolocation ||
      locErrorCode === 1
    ) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        
        if (
          typeof latitude === 'number' &&
          typeof longitude === 'number' &&
          !isNaN(latitude) &&
          !isNaN(longitude) &&
          (latitude !== 0 || longitude !== 0)
        ) {
          // When user moves from one place to another (e.g. travelling in an auto or car), automatically update location and re-resolve address!
          const prev = lastGeocodedCoords.current;
          const hasSignificantMove = !prev || Math.abs(prev.lat - latitude) > 0.00006 || Math.abs(prev.lng - longitude) > 0.00006;
          
          if (hasSignificantMove) {
            setLat(latitude);
            setLng(longitude);
            setAccuracy(pos.coords.accuracy);
            setLocError(null);
            setLocErrorCode(null);
            lastGeocodedCoords.current = { lat: latitude, lng: longitude };
            const formatted = await resolveAddress(latitude, longitude);
            setAddress(formatted);
          }
        }
      },
      (err) => {
        const inIframe = isInsideIframePreview();
        if (err.code === 1) {
          setLocErrorCode(1);
          setLocError(getGpsErrorMessage(1, inIframe));
        } else if (err.code === 2) {
          setLocErrorCode(2);
          setLocError(getGpsErrorMessage(2, inIframe));
        } else if (err.code === 3) {
          setLocErrorCode(3);
          setLocError(getGpsErrorMessage(3, inIframe));
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [currentScreen, resolveAddress]);

  useEffect(() => {
    setAddress(prev => {
      const loadingTexts = [
        'స్థానాన్ని గుర్తిస్తున్నాం...',
        'Detecting GPS location...',
        'जीपीएस स्थान पहचान रहे हैं...',
        'ஜிபிஎஸ் இருப்பிடத்தை கண்டறிகிறது...',
        'GPS location unavailable'
      ];
      if (loadingTexts.includes(prev)) {
        return initialAddressText;
      }
      return prev;
    });
  }, [language, initialAddressText]);

  const toggleFontSize = () => {
    const nextVal = !isLargeFont;
    setIsLargeFont(nextVal);
    localStorage.setItem('peddala_nestham_large_font', String(nextVal));
    const fontSpeech = nextVal
      ? (language === 'en' ? 'Large text selected' : language === 'hi' ? 'बड़े अक्षर चुने गए' : language === 'ta' ? 'பெரிய எழுத்துக்கள் தேர்ந்தெடுக்கப்பட்டன' : 'పెద్ద అక్షరాలు ఎంచుకున్నారు')
      : (language === 'en' ? 'Normal text selected' : language === 'hi' ? 'सामान्य अक्षर चुने गए' : language === 'ta' ? 'வழக்கமான எழுத்துக்கள் தேர்ந்தெடுக்கப்பட்டன' : 'సాధారణ అక్షరాలు ఎంచుకున్నారు');
    speakInLanguage(fontSpeech, language);
  };

  const handleToggleVoice = () => {
    const nextVal = toggleVoiceEnabled();
    setIsVoiceOn(nextVal);
    playTapSound();
    if (nextVal) {
      const voiceOnMsg = language === 'en' ? 'Voice turned on' : language === 'hi' ? 'आवाज़ चालू की गई' : language === 'ta' ? 'குரல் இயக்கப்பட்டது' : 'వాయిస్ ఆన్ చేయబడింది';
      speakInLanguage(voiceOnMsg, language);
    } else {
      stopSpeaking();
    }
  };

  // Only scroll to top on explicit, intentional screen navigation
  const handleNavigate = (screen: ScreenType) => {
    isNavigatingRef.current = true;
    setCurrentScreen(screen);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 50);

    // When user taps "నా లొకేషన్", "ఆటో బుకింగ్", "ఆసుపత్రులు", "SOS", "హెల్ప్‌లైన్", or "అంబులెన్స్", trigger fresh GPS location request immediately
    if (screen === 'location') {
      fetchLocation(false, true);
    } else if (screen === 'auto' || screen === 'hospital' || screen === 'sos' || screen === 'helpline' || screen === 'ambulance') {
      fetchLocation(true, true);
    }
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'auto':
        return (
          <AutoScreen
            onGoHome={() => handleNavigate('home')}
            isLargeFont={isLargeFont}
            currentAddress={address}
            lat={lat}
            lng={lng}
            onRefreshLocation={fetchLocation}
            onOpenDriverPortal={() => handleNavigate('driver')}
            selectedCountry={globalCountry}
          />
        );
      case 'driver':
        return (
          <DriverScreen
            onGoHome={() => handleNavigate('home')}
            isLargeFont={isLargeFont}
            currentAddress={address}
            lat={lat}
            lng={lng}
          />
        );
      case 'hospital':
        return (
          <HospitalScreen
            onGoHome={() => handleNavigate('home')}
            isLargeFont={isLargeFont}
            currentAddress={address}
            lat={lat}
            lng={lng}
            onRefreshLocation={fetchLocation}
            selectedCountry={globalCountry}
          />
        );
      case 'ambulance':
        return (
          <AmbulanceScreen
            onGoHome={() => handleNavigate('home')}
            isLargeFont={isLargeFont}
            currentAddress={address}
            lat={lat}
            lng={lng}
            onRefreshLocation={fetchLocation}
          />
        );
      case 'phone':
        return (
          <PhoneScreen
            onGoHome={() => handleNavigate('home')}
            isLargeFont={isLargeFont}
          />
        );
      case 'sos':
        return (
          <SosScreen
            onGoHome={() => handleNavigate('home')}
            isLargeFont={isLargeFont}
            currentAddress={address}
            lat={lat}
            lng={lng}
            onRefreshLocation={fetchLocation}
            onNavigateToFamily={() => handleNavigate('family')}
            selectedCountry={globalCountry}
          />
        );
      case 'location':
        return (
          <LocationScreen
            onGoHome={() => handleNavigate('home')}
            isLargeFont={isLargeFont}
            address={address}
            lat={lat}
            lng={lng}
            accuracy={accuracy}
            locError={locError}
            locErrorCode={locErrorCode}
            isLoading={isLocLoading}
            onRefreshLocation={fetchLocation}
            selectedCountry={globalCountry}
          />
        );
      case 'family':
        return (
          <FamilyScreen
            onGoHome={() => handleNavigate('home')}
            isLargeFont={isLargeFont}
            currentAddress={address}
            selectedCountry={globalCountry}
          />
        );
      case 'help':
        return (
          <HelpScreen
            onGoHome={() => handleNavigate('home')}
            isLargeFont={isLargeFont}
            currentAddress={address}
          />
        );
      case 'helpline':
        return (
          <HelplineScreen
            onGoHome={() => handleNavigate('home')}
            isLargeFont={isLargeFont}
            currentAddress={address}
            lat={lat}
            lng={lng}
            onRefreshLocation={fetchLocation}
            selectedCountry={globalCountry}
          />
        );
      case 'home':
      default:
        return (
          <HomeScreen
            onNavigate={handleNavigate}
            isLargeFont={isLargeFont}
            isVoiceOn={isVoiceOn}
            onToggleVoice={handleToggleVoice}
            onOpenDriverPortal={() => handleNavigate('driver')}
            selectedCountry={globalCountry}
            onSelectCountry={handleSelectCountry}
          />
        );
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-stone-100 flex flex-col items-center justify-start sm:py-4 overflow-hidden">
      {/* Mobile Shell Frame */}
      <div className="w-full max-w-lg bg-amber-50/50 h-full sm:h-[92vh] sm:max-h-[92vh] sm:rounded-3xl shadow-2xl border-0 sm:border-8 border-stone-800 flex flex-col overflow-hidden relative">
        {/* Fixed Stable Header */}
        <div className="shrink-0 z-30">
          <Header
            isLargeFont={isLargeFont}
            onToggleFontSize={toggleFontSize}
            isVoiceOn={isVoiceOn}
            onToggleVoice={handleToggleVoice}
            onQuickSos={() => handleNavigate('sos')}
            currentScreen={currentScreen}
            onOpenDriverPortal={() => handleNavigate('driver')}
            onGoHome={() => handleNavigate('home')}
          />
        </div>

        {/* Scrollable Active Screen Content - High Performance Touch Scroll */}
        <main
          ref={mainRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-6 smooth-scroll-container"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {renderActiveScreen()}
        </main>

        {/* Fixed Stable Android Bottom Navigation Bar */}
        <nav
          aria-label={t('navAria')}
          className="shrink-0 z-40 bg-stone-950 text-white px-3 py-2 border-t-2 border-stone-800 shadow-2xl pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          <div className="max-w-lg mx-auto flex items-center justify-around gap-2">
            {/* Home Navigation Button */}
            <button
              id="android-nav-home"
              type="button"
              onClick={() => {
                playTapSound();
                speakInLanguage(t('voiceNavHome'), language);
                handleNavigate('home');
              }}
              className={`flex-1 py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all ${
                currentScreen === 'home'
                  ? 'bg-amber-400 text-stone-950 font-black shadow-md'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Home className="w-6 h-6 sm:w-7 sm:h-7" />
              <span className="text-xs sm:text-sm font-bold mt-0.5">{t('navHome')}</span>
            </button>

            {/* Quick Phone Call Navigation Button */}
            <button
              id="android-nav-phone"
              type="button"
              onClick={() => {
                playTapSound();
                speakInLanguage(t('voiceNavPhone'), language);
                handleNavigate('phone');
              }}
              className={`flex-1 py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all ${
                currentScreen === 'phone'
                  ? 'bg-emerald-500 text-white font-black shadow-md'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <PhoneCall className="w-6 h-6 sm:w-7 sm:h-7" />
              <span className="text-xs sm:text-sm font-bold mt-0.5">{t('navPhone')}</span>
            </button>

            {/* Quick SOS Navigation Button */}
            <button
              id="android-nav-sos"
              type="button"
              onClick={() => {
                playTapSound();
                speakInLanguage(t('voiceNavSos'), language);
                handleNavigate('sos');
              }}
              className={`flex-1 py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all ${
                currentScreen === 'sos'
                  ? 'bg-red-600 text-white font-black shadow-md ring-2 ring-red-400'
                  : 'text-rose-400 hover:text-rose-300 hover:bg-white/10'
              }`}
            >
              <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
              <span className="text-xs sm:text-sm font-black mt-0.5">{t('navSos')}</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainAppContent />
    </LanguageProvider>
  );
}
