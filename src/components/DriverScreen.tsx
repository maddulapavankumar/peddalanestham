import React, { useState, useEffect, useRef } from 'react';
import { 
  Car, 
  Phone, 
  MapPin, 
  Power, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  Volume2, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  User, 
  ShieldCheck, 
  Navigation, 
  Clock,
  Radio
} from 'lucide-react';
import { RealDriver, RealRideRequest } from '../types';
import { 
  registerOrUpdateDriver, 
  setDriverOnlineStatus, 
  subscribeToPendingRideRequests, 
  acceptRideRequest, 
  rejectRideRequest, 
  completeRideRequest,
  auth,
  loginWithGoogle
} from '../utils/firebase';
import { playTapSound, speakTelugu } from '../utils/audio';
import { useLanguage } from '../utils/i18n';

interface DriverScreenProps {
  onGoHome: () => void;
  isLargeFont: boolean;
  currentAddress?: string;
  lat?: number | null;
  lng?: number | null;
}

export const DriverScreen: React.FC<DriverScreenProps> = ({
  onGoHome,
  isLargeFont,
  currentAddress = '',
  lat = null,
  lng = null,
}) => {
  const { language, t } = useLanguage();
  // Check local saved driver profile
  const [driver, setDriver] = useState<RealDriver | null>(() => {
    const saved = localStorage.getItem('peddala_nestham_real_driver_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [isEditing, setIsEditing] = useState<boolean>(() => !driver);
  const [name, setName] = useState<string>(driver?.name || '');
  const [phone, setPhone] = useState<string>(driver?.phone || '');
  const [autoNumber, setAutoNumber] = useState<string>(driver?.autoNumber || '');
  const [currentLocation, setCurrentLocation] = useState<string>(driver?.currentLocation || currentAddress || '');
  const [driverLat, setDriverLat] = useState<number | null>(driver?.lat ?? lat ?? null);
  const [driverLng, setDriverLng] = useState<number | null>(driver?.lng ?? lng ?? null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>(() => {
    return (driver?.lat && driver?.lng) ? 'granted' : 'idle';
  });
  const [isOnline, setIsOnline] = useState<boolean>(driver?.isOnline ?? true);

  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<RealRideRequest[]>([]);
  const [activeAcceptedRide, setActiveAcceptedRide] = useState<RealRideRequest | null>(null);

  // Sound notification for new ride request
  const prevReqCount = useRef<number>(0);

  // Load existing driver on mount if available
  useEffect(() => {
    if (driver) {
      setName(driver.name);
      setPhone(driver.phone);
      setAutoNumber(driver.autoNumber);
      setCurrentLocation(driver.currentLocation);
      setIsOnline(driver.isOnline);
      if (driver.lat) setDriverLat(driver.lat);
      if (driver.lng) setDriverLng(driver.lng);
      if (driver.lat && driver.lng) setGpsStatus('granted');
    }
  }, [driver]);

  // Request live GPS location with permission
  const requestLiveLocation = (announce = true): Promise<{ lat: number; lng: number } | null> => {
    if (!navigator.geolocation) {
      if (announce) speakTelugu('ఈ పరికరంలో GPS సదుపాయం లేదు.');
      setGpsStatus('denied');
      return Promise.resolve(null);
    }

    setGpsStatus('requesting');
    if (announce) speakTelugu('లైవ్ GPS స్థానం తీసుకుంటున్నాం, దయచేసి అనుమతించండి.');

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          setDriverLat(latitude);
          setDriverLng(longitude);
          setGpsStatus('granted');

          // Try reverse geocoding for human-readable stand/locality
          try {
            // 1. Primary: Server reverse geocoding API with multi-provider fallback
            let resolvedAddress = '';
            try {
              const apiResp = await fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`);
              if (apiResp.ok) {
                const apiData = await apiResp.json();
                if (apiData.display_name) {
                  resolvedAddress = apiData.display_name.split(',').slice(0, 3).map((s: string) => s.trim()).join(', ');
                }
              }
            } catch (err) {
              console.warn('Backend reverse-geocode failed, falling back to OSM:', err);
            }

            // 2. Fallback: Direct Nominatim OpenStreetMap
            if (!resolvedAddress) {
              const resp = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=te,en`
              );
              if (resp.ok) {
                const data = await resp.json();
                resolvedAddress = data.display_name?.split(',').slice(0, 3).map((s: string) => s.trim()).join(', ') || '';
              }
            }

            if (resolvedAddress) {
              setCurrentLocation(resolvedAddress);
              if (driver) {
                await setDriverOnlineStatus(driver.id, isOnline, resolvedAddress, { lat: latitude, lng: longitude });
              }
            }
          } catch (e) {
            // fallback coords
            if (!currentLocation) {
              const coordStr = `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
              setCurrentLocation(coordStr);
              if (driver) {
                await setDriverOnlineStatus(driver.id, isOnline, coordStr, { lat: latitude, lng: longitude });
              }
            }
          }

          if (announce) {
            speakTelugu('లైవ్ GPS లొకేషన్ విజయవంతంగా షేర్ చేయబడింది.');
          }
          resolve({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.warn('Driver GPS permission error:', error);
          setGpsStatus('denied');
          if (announce) {
            speakTelugu('GPS అనుమతి లభించలేదు. దయచేసి లొకేషన్ ఆన్ చేసి అనుమతించండి.');
          }
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  };

  // Continuous watchPosition when driver is online to ensure passengers get live moving updates
  useEffect(() => {
    if (!driver || !isOnline || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDriverLat(latitude);
        setDriverLng(longitude);
        setGpsStatus('granted');
        setDriverOnlineStatus(driver.id, true, currentLocation, { lat: latitude, lng: longitude }).catch(() => {});
      },
      (err) => {
        console.warn('Live location watch error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [driver?.id, isOnline, currentLocation]);

  // Subscribe to pending ride requests when online
  useEffect(() => {
    if (!driver || !isOnline) {
      setIncomingRequests([]);
      return;
    }

    const unsub = subscribeToPendingRideRequests((requests) => {
      setIncomingRequests(requests);

      // If new request arrived, announce and chime
      if (requests.length > prevReqCount.current) {
        playTapSound();
        const latest = requests[0];
        speakTelugu(`కొత్త సవారీ అభ్యర్థన వచ్చింది! ${latest.passengerName} గారు ఆటో కోరుతున్నారు.`);
      }
      prevReqCount.current = requests.length;
    });

    return () => unsub();
  }, [driver, isOnline]);

  // Update online status in Firestore
  const handleToggleOnline = async () => {
    if (!driver) return;
    playTapSound();
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);

    let coords: { lat: number; lng: number } | null = null;
    if (nextStatus) {
      // Prompt for GPS live location when turning Available ON
      coords = await requestLiveLocation(false);
      if (!coords && driverLat && driverLng) {
        coords = { lat: driverLat, lng: driverLng };
      }
    }

    try {
      await setDriverOnlineStatus(driver.id, nextStatus, currentLocation, coords);
      setDriver((prev) => prev ? { 
        ...prev, 
        isOnline: nextStatus,
        lat: coords?.lat ?? prev.lat,
        lng: coords?.lng ?? prev.lng
      } : null);

      if (nextStatus) {
        speakTelugu('Available for Rides ఆన్ చేయబడింది. మీరు సవారీలకు సిద్ధంగా ఉన్నారు.');
      } else {
        speakTelugu('Available for Rides ఆఫ్ చేయబడింది. మీరు సవారీలకు అందుబాటులో లేరు.');
      }
    } catch (err) {
      console.error('Failed to toggle online status:', err);
    }
  };

  // Fill current GPS address into location field
  const handleUseCurrentGps = async () => {
    playTapSound();
    await requestLiveLocation(true);
  };

  // Save / Register Driver Profile
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    playTapSound();
    setFormError(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanAuto = autoNumber.trim().toUpperCase();
    const cleanLoc = currentLocation.trim();

    if (!cleanName) {
      setFormError('దయచేసి డ్రైవర్ పేరు నమోదు చేయండి.');
      speakTelugu('దయచేసి డ్రైవర్ పేరు నమోదు చేయండి.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      setFormError('దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి.');
      speakTelugu('దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి.');
      return;
    }
    if (!cleanAuto) {
      setFormError('దయచేసి ఆటో నంబర్ నమోదు చేయండి (ఉదా: AP 16 TX 1234).');
      speakTelugu('దయచేసి ఆటో నంబర్ నమోదు చేయండి.');
      return;
    }
    if (!cleanLoc) {
      setFormError('దయచేసి మీ ప్రస్తుత లొకేషన్ లేదా ఆటో స్టాండ్ నమోదు చేయండి.');
      speakTelugu('దయచేసి మీ ప్రస్తుత లొకేషన్ నమోదు చేయండి.');
      return;
    }

    setSaving(true);
    try {
      // Ensure GPS coordinates are obtained if possible
      let coords: { lat: number; lng: number } | null = null;
      if (driverLat && driverLng) {
        coords = { lat: driverLat, lng: driverLng };
      } else {
        coords = await requestLiveLocation(false);
      }

      const driverId = driver?.id || `driver_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      const updated = await registerOrUpdateDriver({
        id: driverId,
        name: cleanName,
        phone: cleanPhone,
        autoNumber: cleanAuto,
        currentLocation: cleanLoc,
        lat: coords?.lat ?? driverLat ?? null,
        lng: coords?.lng ?? driverLng ?? null,
        isOnline: isOnline,
        rating: driver?.rating || 4.9,
      });

      setDriver(updated);
      setIsEditing(false);
      speakTelugu('డ్రైవర్ రిజిస్ట్రేషన్ విజయవంతమైంది! మీరు ఆన్‌లైన్‌లో ఉన్నారు.');
    } catch (err: any) {
      console.error('Error saving driver:', err);
      setFormError('వివరాలు సేవ్ చేయడంలో సమస్య వచ్చింది. దయచేసి మళ్లీ ప్రయత్నించండి.');
    } finally {
      setSaving(false);
    }
  };

  // Accept Ride Request
  const handleAcceptRide = async (req: RealRideRequest) => {
    if (!driver) return;
    playTapSound();
    try {
      await acceptRideRequest(req.id, driver);
      setActiveAcceptedRide(req);
      // Remove from pending list locally
      setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));
      speakTelugu(`సవారీ ఆమోదించబడింది! ${req.passengerName} గారి వద్దకు వెళ్లండి.`);
    } catch (err) {
      console.error('Error accepting ride:', err);
    }
  };

  // Reject Ride Request
  const handleRejectRide = async (reqId: string) => {
    playTapSound();
    try {
      await rejectRideRequest(reqId);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== reqId));
      speakTelugu('సవారీ అభ్యర్థన తిరస్కరించబడింది.');
    } catch (err) {
      console.error('Error rejecting ride:', err);
    }
  };

  // Complete Ride
  const handleCompleteRide = async () => {
    if (!activeAcceptedRide) return;
    playTapSound();
    try {
      await completeRideRequest(activeAcceptedRide.id);
      setActiveAcceptedRide(null);
      speakTelugu('సవారీ విజయవంతంగా పూర్తయింది! ధన్యవాదాలు.');
    } catch (err) {
      console.error('Error completing ride:', err);
    }
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      {/* Top Navigation & Mode Indicator */}
      <div className="flex items-center justify-between gap-2">
        <button
          id="driver-back-home-btn"
          onClick={() => {
            playTapSound();
            onGoHome();
          }}
          type="button"
          className="py-2 px-3 sm:px-4 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 rounded-xl font-bold text-sm sm:text-base flex items-center gap-2 border border-stone-300 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-stone-700" />
          <span>{t('appName')}</span>
        </button>

        <button
          id="driver-speak-guidance-btn"
          onClick={() => {
            playTapSound();
            speakTelugu('ఇది ఆటో డ్రైవర్ పోర్టల్. మీరు ఆన్‌లైన్‌లో ఉంటే ప్రయాణీకుల నుంచి సవారీ అభ్యర్థనలు వస్తాయి.');
          }}
          type="button"
          className="p-2 bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-950 rounded-xl font-black text-sm flex items-center gap-1.5 border border-amber-300 cursor-pointer"
          title="సహాయం వినండి"
        >
          <Volume2 className="w-5 h-5 text-amber-800" />
          <span className="hidden sm:inline">{language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'వాయిస్ వివరణ'}</span>
        </button>
      </div>

      {/* Screen Title Card */}
      <div 
        id="driver-portal-header"
        className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-stone-950 p-4 sm:p-5 rounded-2xl shadow-md border-3 border-amber-600 flex items-center gap-4"
      >
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-amber-400">
          <Car className="w-10 h-10 text-amber-950" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1 bg-amber-950 text-amber-200 px-2.5 py-0.5 rounded-full text-xs font-black mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>{language === 'en' ? 'Real-Time Driver Network (Live Driver Mode)' : language === 'hi' ? 'लाइव ड्राइवर नेटवर्क (Live Driver Mode)' : language === 'ta' ? 'நிகழ்நேர ஓட்டுநர் நெட்வொர்க்' : 'రియల్-టైమ్ డ్రైవర్ నెట్‌వర్క్ (Live Driver Mode)'}</span>
          </div>
          <h2 className={`font-black text-stone-950 truncate ${isLargeFont ? 'text-3xl' : 'text-2xl'}`}>
            🛺 {language === 'en' ? 'Auto Driver Portal' : language === 'hi' ? 'ऑटो ड्राइवर पोर्टल' : language === 'ta' ? 'ஆட்டோ ஓட்டுநர் போர்ட்டல்' : 'ఆటో డ్రైవర్ పోర్టల్'}
          </h2>
          <p className="font-bold text-stone-900 text-xs sm:text-sm mt-0.5">
            {language === 'en' ? "Receive passenger ride requests directly from Elder's Friend" : language === 'hi' ? 'बुजुर्गों के मित्र ऐप से सीधे सवारी अनुरोध प्राप्त करें' : language === 'ta' ? 'பயணிகளின் சவாரி கோரிக்கைகளை நேரடியாகப் பெறுங்கள்' : 'పెద్దల నేస్తం ప్రయాణీకుల సవారీలను నేరుగా అందుకోండి'}
          </p>
        </div>
      </div>

      {/* ========================================================
          ACTIVE ACCEPTED RIDE VIEW (If ongoing)
         ======================================================== */}
      {activeAcceptedRide && (
        <div 
          id="driver-active-ride-card" 
          className="bg-emerald-50 border-4 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in"
        >
          <div className="flex items-center gap-3 border-b border-emerald-200 pb-3">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="bg-emerald-200 text-emerald-950 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-400">
                ✓ మీరు ఆమోదించిన సవారీ (Accepted Ride)
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">
                {activeAcceptedRide.passengerName}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-300 space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-stone-500 block">ఎక్కే ప్రదేశం (Pickup Location):</span>
                <span className="font-black text-stone-950 text-base sm:text-lg">
                  {activeAcceptedRide.pickupLocation}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 border-t border-stone-200 pt-2">
              <Navigation className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-stone-500 block">గమ్యస్థానం (Destination):</span>
                <span className="font-black text-stone-950 text-base sm:text-lg">
                  {activeAcceptedRide.destination}
                </span>
              </div>
            </div>

            <div className="bg-amber-100 p-3 rounded-xl border border-amber-300 flex items-center justify-between">
              <span className="text-xs font-black text-amber-900">
                🔐 రైడ్ ఓటీపీ (Ride OTP):
              </span>
              <span className="text-2xl font-mono font-black text-amber-950 tracking-widest">
                {activeAcceptedRide.rideOtp || '1234'}
              </span>
            </div>
          </div>

          {/* Action buttons for ongoing ride */}
          <div className="space-y-2.5">
            {activeAcceptedRide.passengerPhone && (
              <a
                id="btn-call-passenger"
                href={`tel:${activeAcceptedRide.passengerPhone}`}
                onClick={() => playTapSound()}
                className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-2xl flex items-center justify-center gap-3 text-xl shadow-lg border-2 border-emerald-400 transition-all text-center"
              >
                <Phone className="w-7 h-7 text-white animate-bounce shrink-0" />
                <span>ప్రయాణీకుడికి కాల్ చేయండి</span>
              </a>
            )}

            <button
              id="btn-complete-ride"
              type="button"
              onClick={handleCompleteRide}
              className="w-full py-3.5 bg-stone-900 hover:bg-black active:scale-95 text-white font-black rounded-xl text-base shadow-md transition-all cursor-pointer"
            >
              ✓ సవారీ పూర్తయింది (Complete Ride)
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          ONLINE / OFFLINE TOGGLE & STATUS DASHBOARD
         ======================================================== */}
      {driver && !isEditing && (
        <div 
          id="driver-status-panel"
          className="bg-white rounded-3xl p-4 sm:p-5 border-3 border-stone-300 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-black text-stone-950 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
                  {driver.name}
                </h3>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black px-2 py-0.5 rounded-md font-mono">
                  {driver.autoNumber}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-stone-600 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>{driver.currentLocation}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-edit-driver-profile"
                type="button"
                onClick={() => {
                  playTapSound();
                  setIsEditing(true);
                }}
                className="py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-black rounded-xl border border-stone-300 transition-all cursor-pointer"
              >
                వివరాలు మార్చండి (Edit)
              </button>
              <button
                id="btn-new-driver-registration"
                type="button"
                onClick={() => {
                  playTapSound();
                  setDriver(null);
                  setName('');
                  setPhone('');
                  setAutoNumber('');
                  setCurrentLocation(currentAddress || '');
                  setDriverLat(null);
                  setDriverLng(null);
                  setGpsStatus('idle');
                  setIsEditing(true);
                  speakTelugu('కొత్త డ్రైవర్ రిజిస్ట్రేషన్ ఫారమ్ తెరవబడింది. మీ వివరాలు నమోదు చేయండి.');
                }}
                className="py-1.5 px-3 bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-black rounded-xl border border-amber-300 transition-all cursor-pointer"
                title="వేరే లేదా కొత్త డ్రైవర్‌గా రిజిస్టర్ అవ్వండి"
              >
                + కొత్త డ్రైవర్
              </button>
            </div>
          </div>

          {/* Available for Rides ON/OFF Status & Toggle Switch */}
          <div className="pt-1 space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-100 border-2 border-stone-200">
              <div>
                <span className="text-xs font-black uppercase text-stone-600 block">
                  “Available for Rides” హోదా (Ride Status):
                </span>
                <span className={`text-base sm:text-lg font-black ${isOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isOnline ? '🟢 ON (సవారీలకు అందుబాటులో ఉన్నారు)' : '🔴 OFF (సవారీలకు అందుబాటులో లేరు)'}
                </span>
              </div>
              <span className={`text-xs font-black px-3 py-1.5 rounded-full border shadow-xs ${
                isOnline 
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-400' 
                  : 'bg-rose-100 text-rose-950 border-rose-400'
              }`}>
                {isOnline ? 'ఆన్‌లైన్ • కనిపిస్తారు' : 'ఆఫ్‌లైన్ • కనిపించరు'}
              </span>
            </div>

            <button
              id="driver-toggle-online-btn"
              type="button"
              onClick={handleToggleOnline}
              className={`w-full py-5 px-4 rounded-2xl font-black text-lg sm:text-xl shadow-lg border-3 transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-[0.98] ${
                isOnline
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-400 ring-4 ring-emerald-300/40 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-400 ring-4 ring-rose-300/40 shadow-rose-600/20'
              }`}
            >
              <Power className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 ${isOnline ? 'animate-pulse' : ''}`} />
              <span>
                {isOnline ? '🟢 “Available for Rides”: ON (ఆపడానికి తాకండి)' : '🔴 “Available for Rides”: OFF (ఆన్ చేయడానికి తాకండి)'}
              </span>
            </button>
            <p className="text-xs sm:text-sm font-bold text-center text-stone-600 mt-1">
              {isOnline 
                ? 'సవారీలకు అందుబాటులో ఉన్నారు • ప్రయాణీకులకు మీ ఆటో కనిపిస్తుంది' 
                : 'సవారీలకు అందుబాటులో లేరు • ప్రయాణీకులకు మీ ఆటో కనిపించదు'}
            </p>
          </div>

          {/* Live GPS Sharing Status Badge */}
          <div className="bg-stone-50 border-2 border-stone-200 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                driverLat && driverLng 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                <Navigation className={`w-5 h-5 ${driverLat && driverLng ? 'text-emerald-700 animate-spin-slow' : 'text-amber-700'}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-stone-900">
                    {driverLat && driverLng ? 'లైవ్ GPS లొకేషన్ షేర్ అవుతోంది' : 'లైవ్ GPS లొకేషన్ అనుమతి'}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    driverLat && driverLng 
                      ? 'bg-emerald-200 text-emerald-950 border border-emerald-400' 
                      : 'bg-amber-200 text-amber-950 border border-amber-400'
                  }`}>
                    {driverLat && driverLng ? '🟢 యాక్టివ్' : 'లొకేషన్ అవసరం'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 font-semibold truncate mt-0.5">
                  {driverLat && driverLng 
                    ? `అక్షాంశం: ${driverLat.toFixed(4)}, రేఖాంశం: ${driverLng.toFixed(4)}`
                    : 'ప్రయాణీకులకు మీ దూరం ఖచ్చితంగా తెలియడానికి GPS ని షేర్ చేయండి'}
                </p>
              </div>
            </div>

            <button
              id="driver-share-gps-btn"
              type="button"
              onClick={handleUseCurrentGps}
              disabled={gpsStatus === 'requesting'}
              className="py-2 px-3 bg-amber-400 hover:bg-amber-500 active:scale-95 text-stone-950 font-black text-xs rounded-xl border border-amber-600 shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto"
            >
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              <span>{gpsStatus === 'requesting' ? 'గుర్తిస్తున్నాం...' : 'GPS అప్‌డేట్'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          INCOMING RIDE REQUESTS LIST (Real-time Live Requests)
         ======================================================== */}
      {driver && !isEditing && (
        <div id="driver-incoming-requests-section" className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className={`font-black text-stone-900 flex items-center gap-2 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
              <span>🔔 సవారీ అభ్యర్థనలు (Ride Requests)</span>
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                incomingRequests.length > 0 
                  ? 'bg-amber-400 text-stone-950 border-amber-500 animate-bounce' 
                  : 'bg-stone-200 text-stone-700 border-stone-300'
              }`}>
                {incomingRequests.length} అందుబాటులో ఉన్నాయి
              </span>
            </h3>
          </div>

          {!isOnline ? (
            <div className="bg-stone-100 border-2 border-stone-300 rounded-2xl p-6 text-center space-y-2">
              <p className="font-bold text-stone-600 text-base">
                మీరు ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉన్నారు.
              </p>
              <p className="text-xs text-stone-500">
                సవారీ అభ్యర్థనలను చూడటానికి పైనున్న ఆకుపచ్చ బటన్ నొక్కి ఆన్‌లైన్ అవ్వండి.
              </p>
            </div>
          ) : incomingRequests.length === 0 ? (
            <div className="bg-amber-50/60 border-2 border-dashed border-amber-300 rounded-2xl p-6 text-center space-y-3">
              <div className="w-14 h-14 bg-amber-100 rounded-full mx-auto flex items-center justify-center border-2 border-amber-300 animate-pulse">
                <Radio className="w-7 h-7 text-amber-800" />
              </div>
              <p className="font-black text-stone-900 text-base sm:text-lg">
                కొత్త సవారీ అభ్యర్థనల కోసం వేచి చూస్తున్నాం...
              </p>
              <p className="text-xs sm:text-sm font-semibold text-stone-600 max-w-md mx-auto">
                సీనియర్ సిటిజన్ "పెద్దల నేస్తం" యాప్‌లో ఆటో బుక్ చేయగానే, తక్షణమే ఇక్కడ ప్రత్యక్షమవుతుంది.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  id={`incoming-ride-${req.id}`}
                  className="bg-white rounded-3xl p-5 sm:p-6 border-3 border-amber-500 shadow-xl space-y-4 animate-in slide-in-from-top-4 duration-300 ring-4 ring-amber-400/20"
                >
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center font-black text-amber-900 border border-amber-300">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-stone-500 block">ప్రయాణీకుడి పేరు (Passenger):</span>
                        <h4 className="font-black text-xl sm:text-2xl text-stone-950">
                          {req.passengerName}
                        </h4>
                      </div>
                    </div>
                    <span className="bg-red-100 text-red-900 text-xs font-black px-2.5 py-1 rounded-full border border-red-300 animate-pulse">
                      తక్షణం కావాలి (Immediate)
                    </span>
                  </div>

                  {/* Pickup & Drop Details */}
                  <div className="bg-stone-50 rounded-2xl p-3.5 sm:p-4 border border-stone-200 space-y-2.5 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-1" />
                      <div>
                        <span className="text-xs font-bold text-stone-500 block">ఎక్కే ప్రదేశం (Pickup Location):</span>
                        <span className="font-black text-stone-900 text-base">
                          {req.pickupLocation}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 border-t border-stone-200/80 pt-2">
                      <Navigation className="w-4 h-4 text-amber-600 shrink-0 mt-1" />
                      <div>
                        <span className="text-xs font-bold text-stone-500 block">గమ్యస్థానం (Destination):</span>
                        <span className="font-black text-stone-900 text-base">
                          {req.destination}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Accept & Reject Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      id={`btn-accept-ride-${req.id}`}
                      type="button"
                      onClick={() => handleAcceptRide(req)}
                      className="py-4 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-lg sm:text-xl rounded-2xl flex items-center justify-center gap-2 shadow-lg border-2 border-emerald-500 cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-6 h-6 shrink-0" />
                      <span>ఆమోదించండి (Accept)</span>
                    </button>

                    <button
                      id={`btn-reject-ride-${req.id}`}
                      type="button"
                      onClick={() => handleRejectRide(req.id)}
                      className="py-4 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-lg sm:text-xl rounded-2xl flex items-center justify-center gap-2 shadow-md border-2 border-rose-500 cursor-pointer transition-all"
                    >
                      <XCircle className="w-6 h-6 shrink-0" />
                      <span>తిరస్కరించండి (Reject)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          DRIVER REGISTRATION / EDIT FORM
         ======================================================== */}
      {(!driver || isEditing) && (
        <form
          id="driver-registration-form"
          onSubmit={handleSaveProfile}
          className="bg-white rounded-3xl p-5 sm:p-6 border-3 border-amber-400 shadow-xl space-y-4"
        >
          <div className="border-b border-stone-200 pb-3">
            <h3 className="text-xl sm:text-2xl font-black text-stone-950 flex items-center gap-2">
              <span>✍️ డ్రైవర్ రిజిస్ట్రేషన్ (Driver Details)</span>
            </h3>
            <p className="text-xs sm:text-sm font-bold text-stone-600 mt-0.5">
              ఈ వివరాలు నేరుగా Firebase లో నమోదవుతాయి మరియు సమీపంలోని సీనియర్లకు కనిపిస్తాయి
            </p>
          </div>

          {formError && (
            <div className="bg-rose-100 border border-rose-400 text-rose-950 p-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1">
            <label className="block text-xs sm:text-sm font-black text-stone-800">
              డ్రైవర్ పూర్తి పేరు (Driver Name) *
            </label>
            <input
              id="input-driver-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ఉదా: శ్రీనివాస్ రావు"
              className="w-full p-3.5 rounded-xl border-2 border-stone-300 focus:border-amber-500 focus:outline-none text-base font-bold text-stone-950"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className="block text-xs sm:text-sm font-black text-stone-800">
              మొబైల్ ఫోన్ నంబర్ (Phone Number) *
            </label>
            <input
              id="input-driver-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="ఉదా: 9848012345"
              className="w-full p-3.5 rounded-xl border-2 border-stone-300 focus:border-amber-500 focus:outline-none text-base font-bold font-mono text-stone-950"
            />
          </div>

          {/* Auto Number */}
          <div className="space-y-1">
            <label className="block text-xs sm:text-sm font-black text-stone-800">
              ఆటో నంబర్ (Auto Registration Number) *
            </label>
            <input
              id="input-driver-auto-number"
              type="text"
              required
              value={autoNumber}
              onChange={(e) => setAutoNumber(e.target.value)}
              placeholder="ఉదా: AP 16 TX 4521"
              className="w-full p-3.5 rounded-xl border-2 border-stone-300 focus:border-amber-500 focus:outline-none text-base font-black uppercase font-mono text-stone-950"
            />
          </div>

          {/* Location Permission & Sharing Guidance Card */}
          <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-amber-800 shrink-0" />
                <span className="text-xs sm:text-sm font-black text-amber-950">
                  📍 లైవ్ లొకేషన్ అనుమతి (Live GPS Permission)
                </span>
              </div>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                gpsStatus === 'granted'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : gpsStatus === 'denied'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                {gpsStatus === 'granted'
                  ? '🟢 అనుమతించబడింది (Active)'
                  : gpsStatus === 'denied'
                  ? '🔴 నిరాకరించబడింది (Denied)'
                  : 'అనుమతి అవసరం'}
              </span>
            </div>
            <p className="text-xs font-bold text-stone-700 leading-relaxed">
              డ్రైవర్లు తమ లైవ్ లొకేషన్‌ను అనుమతితో షేర్ చేయడం ద్వారా, సమీపంలోని సీనియర్లకు మీ ఆటో దూరం, ప్రయాణ సమయం మరియు లైవ్ మ్యాప్ పిన్ ఆటోమేటిక్‌గా కనిపిస్తాయి.
            </p>
            {gpsStatus !== 'granted' && (
              <button
                type="button"
                onClick={handleUseCurrentGps}
                disabled={gpsStatus === 'requesting'}
                className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 text-xs font-black rounded-xl border border-amber-600 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <MapPin className="w-4 h-4 text-stone-950" />
                <span>{gpsStatus === 'requesting' ? 'GPS అనుమతి అడుగుతున్నాం...' : '📍 లైవ్ GPS అనుమతించండి & నా స్థానం తీసుకోండి'}</span>
              </button>
            )}
          </div>

          {/* Current Location */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs sm:text-sm font-black text-stone-800">
                ప్రస్తుత లొకేషన్ / స్టాండ్ (Current Location) *
              </label>
              <button
                type="button"
                onClick={handleUseCurrentGps}
                disabled={gpsStatus === 'requesting'}
                className="text-xs font-black text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                <span>{gpsStatus === 'requesting' ? 'GPS గుర్తిస్తున్నాం...' : '📍 నా లైవ్ GPS స్థానం తీసుకోండి'}</span>
              </button>
            </div>
            <input
              id="input-driver-location"
              type="text"
              required
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="ఉదా: బెంజ్ సర్కిల్ ఆటో స్టాండ్, విజయవాడ"
              className="w-full p-3.5 rounded-xl border-2 border-stone-300 focus:border-amber-500 focus:outline-none text-base font-bold text-stone-950"
            />
            {driverLat && driverLng && (
              <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 mt-1">
                <span>✓ లైవ్ GPS అక్షాంశాలు సిద్ధం: {driverLat.toFixed(4)}, {driverLng.toFixed(4)}</span>
              </p>
            )}
          </div>

          {/* “Available for Rides” ON/OFF status choice during registration */}
          <div className="bg-stone-50 border-2 border-stone-300 rounded-2xl p-4 space-y-2">
            <label className="block text-xs sm:text-sm font-black text-stone-900">
              “Available for Rides” హోదా (సవారీలకు అందుబాటులో ఉన్నారా?) *
            </label>
            <p className="text-xs text-stone-600 font-bold">
              కేవలం 'ON' చేసిన డ్రైవర్లు మాత్రమే సమీప ఆటోలు కోరే ప్రయాణీకులకు కనిపిస్తారు.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                id="btn-reg-status-on"
                onClick={() => {
                  playTapSound();
                  setIsOnline(true);
                  speakTelugu('Available for Rides: ఆన్ ఎంచుకున్నారు');
                }}
                className={`py-3 px-3 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  isOnline
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                <span>🟢 ON (అందుబాటులో ఉన్నాను)</span>
              </button>
              <button
                type="button"
                id="btn-reg-status-off"
                onClick={() => {
                  playTapSound();
                  setIsOnline(false);
                  speakTelugu('Available for Rides: ఆఫ్ ఎంచుకున్నారు');
                }}
                className={`py-3 px-3 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  !isOnline
                    ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                <span>🔴 OFF (అందుబాటులో లేను)</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 space-y-2">
            <button
              id="btn-save-driver-profile"
              type="submit"
              disabled={saving}
              className="w-full py-4 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-black text-xl rounded-2xl shadow-lg border-2 border-amber-600 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>నమోదు చేస్తున్నాం...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  <span>డ్రైవర్‌గా రిజిస్టర్ అవ్వండి / భద్రపరచండి</span>
                </>
              )}
            </button>

            {driver && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs sm:text-sm cursor-pointer"
              >
                రద్దు చేయండి (Cancel)
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
