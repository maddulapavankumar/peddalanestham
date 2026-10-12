import React, { useState, useEffect, useRef } from 'react';
import { HomeButton } from './HomeButton';
import { 
  ShieldAlert, 
  Phone, 
  BellRing, 
  BellOff, 
  MessageCircle, 
  AlertOctagon, 
  Volume2, 
  Shield, 
  ShieldCheck, 
  AlertTriangle, 
  Check, 
  X,
  HeartHandshake,
  Users,
  PhoneCall,
  Plus
} from 'lucide-react';
import { playTapSound, speakInLanguage, startEmergencySiren, stopEmergencySiren, playSosAlertSound } from '../utils/audio';
import { getStoredContacts } from '../utils/storage';
import { FamilyContact } from '../types';
import { CountryCode } from './CountrySelector';
import {
  getDialableNumber,
  formatPhoneNumber,
  getWhatsAppNumber,
} from '../utils/countryPhone';
import { cleanAddressString, fetchCompleteReadableAddress } from '../utils/reverseGeocode';
import { useLanguage } from '../utils/i18n';

// Re-export helpers for backward compatibility
export { getDialableNumber, formatPhoneNumber };

interface SosScreenProps {
  onGoHome: () => void;
  isLargeFont: boolean;
  currentAddress?: string;
  lat?: number | null;
  lng?: number | null;
  onRefreshLocation?: (silent?: boolean, forceGeocode?: boolean) => void;
  onNavigateToFamily?: () => void;
  selectedCountry?: CountryCode;
}

/**
 * Creates the standardized clear SOS Emergency WhatsApp message containing
 * the exact emergency alert wording, current address, and Google Maps location.
 */
export function buildSosEmergencyWhatsAppMessage(
  addressText: string,
  latitude?: number | null,
  longitude?: number | null
): string {
  const mapUrl = latitude && longitude
    ? `https://maps.google.com/?q=${latitude},${longitude}`
    : 'https://maps.google.com';

  let addressClean = addressText && 
    !addressText.includes('అందుబాటులో లేదు') &&
    !addressText.includes('గుర్తిస్తున్నాం') &&
    !addressText.includes('అనుమతి అవసరం')
    ? addressText
    : 'GPS Location Shared';

  // If it's a resolved address, ensure generic administrative areas like "Vijayawada Urban" are cleaned
  if (addressClean && !addressClean.startsWith('GPS') && !addressClean.startsWith('అక్షాంశం:')) {
    const refined = cleanAddressString(addressClean);
    if (refined && refined.length > 3) {
      addressClean = refined;
    }
  }

  return (
    `🚨 SOS EMERGENCY — Please contact me immediately. My current location is attached.\n\n` +
    `🆘 అత్యవసరం! దయచేసి నన్ను వెంటనే సంప్రదించండి. నా ప్రస్తుత లొకేషన్ ఇక్కడ జతచేయబడింది.\n\n` +
    `📍 నా ప్రస్తుత చిరునామా (Current Address):\n${addressClean}\n\n` +
    `🗺️ గూగుల్ మ్యాప్స్ లొకేషన్ (Google Maps Location):\n${mapUrl}\n\n` +
    `⚠️ దయచేసి వెంటనే కాల్ లేదా సహాయం చేయండి!`
  );
}

interface EmergencyService {
  id: string;
  number: string;
  titleEn: string;
  titleTe: string;
  titleHi: string;
  titleTa: string;
  subEn: string;
  subTe: string;
  subHi: string;
  subTa: string;
  descEn: string;
  descTe: string;
  descHi: string;
  descTa: string;
  badgeEn: string;
  badgeTe: string;
  badgeHi: string;
  badgeTa: string;
  borderColor: string;
  bgColor: string;
  btnBg: string;
  iconBg: string;
  Icon: React.ElementType;
}

const EMERGENCY_SERVICES: EmergencyService[] = [
  {
    id: 'service-112',
    number: '112',
    titleEn: '112 - National Emergency',
    titleTe: '112 - జాతీయ అత్యవసర హెల్ప్‌లైన్',
    titleHi: '112 - राष्ट्रीय आपातकालीन हेल्पलाइन',
    titleTa: '112 - தேசிய அவசர உதவி எண்',
    subEn: 'All Emergencies (Police, Fire, Ambulance)',
    subTe: 'అన్ని అత్యవసరాల కోసం (పోలీస్, ఫైర్, అంబులెన్స్)',
    subHi: 'सभी आपात स्थितियों के लिए (पुलिस, फायर, एम्बुलेंस)',
    subTa: 'அனைத்து அவசரங்களுக்கும் (காவல்துறை, தீயணைப்பு, ஆம்புலன்ஸ்)',
    descEn: 'Single emergency number across India for immediate help in any crisis.',
    descTe: 'ఏదైనా ఆపదలో ఉన్నప్పుడు దేశవ్యాప్తంగా తక్షణ సహాయం కోసం ఒకే ఒక్క నంబర్.',
    descHi: 'संकट के समय तुरंत सहायता के लिए पूरे देश में एकल नंबर।',
    descTa: 'ஆபத்தில் இருக்கும்போது உடனடி உதவிக்கான ஒரே எண்.',
    badgeEn: 'National Helpline • 24/7',
    badgeTe: 'జాతీయ హెల్ప్‌లైన్ • 24 గంటలు',
    badgeHi: 'राष्ट्रीय हेल्पलाइन • 24 घंटे',
    badgeTa: 'தேசிய உதவி எண் • 24 மணிநேரம்',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-50',
    btnBg: 'bg-red-600 hover:bg-red-700 active:bg-red-800 border-red-500',
    iconBg: 'bg-red-600',
    Icon: ShieldAlert,
  },
  {
    id: 'service-100',
    number: '100',
    titleEn: '100 - Police Control Room',
    titleTe: '100 - పోలీస్ కంట్రోల్ రూమ్',
    titleHi: '100 - पुलिस कंट्रोल रूम',
    titleTa: '100 - காவல் கட்டுப்பாட்டு அறை',
    subEn: 'Police Immediate Protection & Security',
    subTe: 'పోలీస్ తక్షణ రక్షణ & సహాయం',
    subHi: 'पुलिस सुरक्षा एवं तत्काल सहायता',
    subTa: 'காவல்துறை உடனடி பாதுகாப்பு & உதவி',
    descEn: 'Call local police in cases of threat, theft, danger or safety emergency.',
    descTe: 'దొంగతనం, గొడవలు, రక్షణ లేకపోవడం లేదా ఆపద సమయాల్లో స్థానిక పోలీసులకు కాల్ చేయండి.',
    descHi: 'चोरी, विवाद, सुरक्षा खतरा या संकट के समय स्थानीय पुलिस को कॉल करें।',
    descTa: 'திருட்டு, சண்டை, பாதுகாப்பு அச்சுறுத்தல் நேரத்தில் உள்ளூர் காவல்துறையை அழைக்கவும்.',
    badgeEn: 'Police Protection • Quick Response',
    badgeTe: 'పోలీస్ రక్షణ • శీఘ్ర స్పందన',
    badgeHi: 'पुलिस सुरक्षा • त्वरित प्रतिक्रिया',
    badgeTa: 'காவல்துறை பாதுகாப்பு • விரைவு நடவடிக்கை',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-50',
    btnBg: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 border-blue-500',
    iconBg: 'bg-blue-600',
    Icon: Shield,
  },
  {
    id: 'service-108',
    number: '108',
    titleEn: '108 - Emergency Ambulance',
    titleTe: '108 - అత్యవసర అంబులెన్స్',
    titleHi: '108 - आपातकालीन एम्बुलेंस',
    titleTa: '108 - அவசர ஆம்புலன்ஸ்',
    subEn: 'Government Free Medical Ambulance',
    subTe: 'ప్రభుత్వ ఉచిత వైద్య అంబులెన్స్',
    subHi: 'सरकारी मुफ्त चिकित्सा एम्बुलेंस',
    subTa: 'அரசு இலவச அவசர ஆம்புலன்ஸ்',
    descEn: 'Free ambulance service for severe illness, heart attack, falls, or hospital transit.',
    descTe: 'తీవ్ర అనారోగ్యం, గుండెపోటు, పడిపోవడం లేదా తక్షణ ఆసుపత్రి రవాణా కోసం ఉచిత సేవ.',
    descHi: 'गंभीर बीमारी, दिल का दौरा, चोट या अस्पताल पहुंचने के लिए मुफ्त सेवा।',
    descTa: 'தீவிர நோய், மாரடைப்பு, காயம் அல்லது மருத்துவமனை செல்ல இலவச சேவை.',
    badgeEn: 'Free Medical Service • 24/7',
    badgeTe: 'ఉచిత వైద్య సేవ • 24/7',
    badgeHi: 'मुफ्त चिकित्सा सेवा • 24/7',
    badgeTa: 'இலவச மருத்துவ சேவை • 24/7',
    borderColor: 'border-rose-500',
    bgColor: 'bg-rose-50',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 border-emerald-500',
    iconBg: 'bg-rose-600',
    Icon: Phone,
  },
  {
    id: 'service-1090',
    number: '1090',
    titleEn: '1090 - Senior Citizen Helpline',
    titleTe: '1090 - సీనియర్ సిటిజన్ & మహిళా భద్రత',
    titleHi: '1090 - वरिष्ठ नागरिक सुरक्षा हेल्पलाइन',
    titleTa: '1090 - முதியோர் பாதுகாப்பு உதவி எண்',
    subEn: 'Senior Citizen Protection & Crime Stopper',
    subTe: 'వృద్ధుల రక్షణ & క్రైమ్ స్టాపర్ హెల్ప్‌లైన్',
    subHi: 'बुजुर्गों की सुरक्षा एवं शिकायत निवारण',
    subTa: 'முதியோர் பாதுகாப்பு & புகார்கள் பிரிவு',
    descEn: 'Dedicated helpline for elder harassment, fraud, abuse and security protection.',
    descTe: 'వృద్ధులపై వేధింపులు, మోసాలు, భద్రతా సమస్యల పరిష్కారం కోసం ప్రత్యేక విభాగం.',
    descHi: 'बुजुर्गों के साथ दुर्व्यवहार, धोखाधड़ी और सुरक्षा समस्याओं के समाधान के लिए विशेष सेवा।',
    descTa: 'முதியோர் துன்புறுத்தல், மோசடி மற்றும் பாதுகாப்பு பிரச்சனைகளுக்கான சிறப்பு பிரிவு.',
    badgeEn: 'Senior Protection Helpline',
    badgeTe: 'సీనియర్ సిటిజన్ రక్షణ హెల్ప్‌లైన్',
    badgeHi: 'वरिष्ठ नागरिक सुरक्षा हेल्पलाइन',
    badgeTa: 'முதியோர் பாதுகாப்பு உதவி எண்',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-50',
    btnBg: 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 border-purple-500',
    iconBg: 'bg-purple-600',
    Icon: HeartHandshake,
  },
];

interface PendingCall {
  number: string;
  title: string;
  desc: string;
}

export const SosScreen: React.FC<SosScreenProps> = ({
  onGoHome,
  isLargeFont,
  currentAddress = 'నా ప్రస్తుత లొకేషన్',
  lat,
  lng,
  onRefreshLocation,
  onNavigateToFamily,
  selectedCountry = 'IN',
}) => {
  const { language, t } = useLanguage();
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null);
  const [activeCallingContact, setActiveCallingContact] = useState<{ name: string; phone: string } | null>(null);
  const [activatedSosState, setActivatedSosState] = useState<{
    contact: FamilyContact;
    sentAt: string;
    address?: string;
  } | null>(null);
  const [noContactsAlert, setNoContactsAlert] = useState(false);
  const [isOptionsHighlighted, setIsOptionsHighlighted] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);
  const [contacts, setContacts] = useState<FamilyContact[]>(() => getStoredContacts());

  const speak = (te: string, en: string, hi: string, ta: string, opts?: { delayMs?: number }) => {
    const text = language === 'en' ? en : language === 'hi' ? hi : language === 'ta' ? ta : te;
    speakInLanguage(text, language, opts);
  };

  // Automatic voice readout and contacts refresh on screen mount
  useEffect(() => {
    setContacts(getStoredContacts());
    if (onRefreshLocation) {
      onRefreshLocation(false, true);
    }
    speak(
      'అత్యవసర సహాయం ఎస్.ఓ.ఎస్ పేజీ. మీ కుటుంబ సభ్యులకు లేదా 112, 108 అత్యవసర సేవలకు తక్షణమే కాల్ చేయవచ్చు. కాల్ చేయడానికి ఆకుపచ్చ కాల్ బటన్ నొక్కండి.',
      'Emergency SOS Page. You can immediately call family members or emergency services like 112 and 108. Tap the green call button to call.',
      'आपातकालीन सहायता एसओएस पेज। आप तुरंत परिवार के सदस्यों या 112, 108 आपातकालीन सेवाओं को कॉल कर सकते हैं। कॉल करने के लिए हरे बटन पर टैप करें।',
      'அவசர உதவி SOS பக்கம். உங்கள் குடும்பத்தினர் அல்லது 112, 108 அவசர சேவைகளுக்கு உடனே அழைக்கலாம். அழைக்க பச்சை பட்டனைத் தொடவும்.',
      { delayMs: 400 }
    );
  }, []);

  // Primary SOS Action: Plays loud emergency buzzer sound, sends WhatsApp with current location, speaks Telugu
  const handleSosButtonClick = () => {
    // 1. Play clear, loud emergency buzzer / alert sound on the user's phone immediately
    playSosAlertSound();

    if (onRefreshLocation) {
      onRefreshLocation(false, true);
    }

    setIsOptionsHighlighted(true);

    const savedContacts = getStoredContacts();
    setContacts(savedContacts);

    // Concurrently fetch fresh real-time GPS coordinates at this exact moment
    let freshCoordinatesPromise: Promise<{ lat: number; lng: number; address?: string } | null> = Promise.resolve(null);
    if (typeof window !== 'undefined' && navigator.geolocation) {
      freshCoordinatesPromise = new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const fLat = pos.coords.latitude;
            const fLng = pos.coords.longitude;
            try {
              const res = await fetchCompleteReadableAddress(fLat, fLng);
              resolve({ lat: fLat, lng: fLng, address: res.address });
            } catch {
              resolve({ lat: fLat, lng: fLng });
            }
          },
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 2500, maximumAge: 0 }
        );
      });
    }

    if (savedContacts.length > 0) {
      // Primary saved emergency contact
      const primaryContact = savedContacts[0];

      setActivatedSosState({
        contact: primaryContact,
        sentAt: new Date().toLocaleTimeString('te-IN', { hour: '2-digit', minute: '2-digit' }),
      });

      // The loud emergency buzzer sounds on the phone immediately for ~1.48 seconds.
      // During this 1.5s buzzer window, fresh GPS coordinates are retrieved at that exact moment.
      // Immediately as the buzzer finishes, launch WhatsApp location sharing and call with fresh coordinates.
      setTimeout(async () => {
        let liveLat = lat;
        let liveLng = lng;
        let liveAddress = currentAddress;

        try {
          const fresh = await Promise.race([
            freshCoordinatesPromise,
            new Promise<null>((r) => setTimeout(() => r(null), 2000)),
          ]);
          if (fresh && fresh.lat && fresh.lng) {
            liveLat = fresh.lat;
            liveLng = fresh.lng;
            if (fresh.address && !fresh.address.startsWith('స్థానాన్ని') && !fresh.address.startsWith('GPS')) {
              liveAddress = fresh.address;
            }
          }
        } catch {
          // fallback to current props
        }

        // Update activated SOS state modal with live address
        setActivatedSosState({
          contact: primaryContact,
          sentAt: new Date().toLocaleTimeString('te-IN', { hour: '2-digit', minute: '2-digit' }),
          address: liveAddress,
        });

        const waNumber = getWhatsAppNumber(primaryContact.phone);
        const sosMessage = buildSosEmergencyWhatsAppMessage(liveAddress, liveLat, liveLng);
        const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(sosMessage)}`;

        // 1. Open WhatsApp to send current location with clear emergency message (unchanged)
        let opened = false;
        try {
          const w = window.open(waUrl, '_blank');
          if (w) opened = true;
        } catch {
          // ignore
        }
        if (!opened) {
          try {
            window.location.href = waUrl;
          } catch {
            // ignore
          }
        }

        // 2. Automatically initiate phone call to saved emergency family member's phone number
        const dialablePhone = getDialableNumber(primaryContact.phone);
        setTimeout(() => {
          try {
            window.location.href = `tel:${dialablePhone}`;
          } catch {
            window.open(`tel:${dialablePhone}`, '_self');
          }
        }, 500);
      }, 1500);

      // Voice guidance after the emergency alert buzzer tone finishes
      speak(
        `అత్యవసర సహాయం ఎస్.ఓ.ఎస్ ప్రారంభించబడింది. మీ అత్యవసర కాంటాక్ట్ ${primaryContact.name} గారికి ప్రస్తుత లొకేషన్ వాట్సాప్ ద్వారా పంపబడింది మరియు కాల్ కలుపుతున్నాం.`,
        `Emergency SOS activated! Current GPS location is sent to ${primaryContact.name} via WhatsApp and phone call is connecting.`,
        `आपातकालीन एसओएस सक्रिय हो गया है! वर्तमान स्थान ${primaryContact.name} को व्हाट्सएप द्वारा भेजा गया है और कॉल मिलाई जा रही है।`,
        `அவசர SOS தொடங்கப்பட்டது! உங்கள் தற்போதைய இடம் ${primaryContact.name} அவர்களுக்கு வாட்ஸ்அப் மூலம் அனுப்பப்பட்டு அழைப்பு இணைக்கப்படுகிறது.`,
        { delayMs: 1600 }
      );
    } else {
      setNoContactsAlert(true);
      speak(
        'అత్యవసర సహాయం ఎస్.ఓ.ఎస్ మోగించబడింది. ఇంకా కుటుంబ సభ్యుల నంబర్ నమోదు చేయలేదు. 112 లేదా 108 కు వెంటనే కాల్ చేయండి.',
        'Emergency SOS sounded. No family contacts saved yet. Please call 112 or 108 immediately.',
        'आपातकालीन सायरन बजाया गया। अभी परिवार का नंबर दर्ज नहीं है। कृपया तुरंत 112 या 108 पर कॉल करें।',
        'அவசர SOS ஒலிக்கப்பட்டது. குடும்பத்தினர் எண் சேமிக்கப்படவில்லை. உடனே 112 அல்லது 108 ஐ அழைக்கவும்.',
        { delayMs: 1600 }
      );
    }

    // Smooth scroll to emergency options
    setTimeout(() => {
      optionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
  };

  // Direct phone call to saved family member using strictly complete +91 number
  const handleCallFamily = (contact: FamilyContact, e?: React.MouseEvent) => {
    playTapSound();
    const completeNumber = getDialableNumber(contact.phone);
    speak(
      `${contact.name} గారికి అత్యవసర కాల్ కలుపుతున్నాం. మాట్లాడండి.`,
      `Calling emergency contact ${contact.name}. Please speak once connected.`,
      `आपातकालीन संपर्क ${contact.name} को कॉल मिला रहे हैं। बात करें।`,
      `அவசர தொடர்பாளர் ${contact.name} அவர்களை அழைக்கிறோம். பேசவும்.`
    );
    
    // Set active calling contact to provide visual feedback and re-dial capability
    setActiveCallingContact({
      name: contact.name,
      phone: completeNumber,
    });

    // Directly open phone dialer with this saved family member's complete +91 number
    try {
      window.location.href = `tel:${completeNumber}`;
    } catch {
      window.open(`tel:${completeNumber}`, '_self');
    }
  };

  const handleRequestCall = (number: string, title: string, desc: string) => {
    playTapSound();
    speak(
      `${number} కు అత్యవసర కాల్ చేయాలా? నిర్ధారించడానికి కింద ఉన్న అవును బటన్ నొక్కండి.`,
      `Do you want to call ${number}? Tap Yes below to confirm.`,
      `क्या ${number} पर कॉल करना चाहते हैं? पुष्टि के लिए नीचे हाँ बटन दबाएं।`,
      `${number} எண்ணிற்கு அழைக்க விரும்புகிறீர்களா? உறுதிப்படுத்த கீழே ஆம் பட்டனை அழுத்தவும்.`
    );
    setPendingCall({ number, title, desc });
  };

  const handleConfirmCall = () => {
    if (!pendingCall) return;
    playTapSound();
    speak(
      `${pendingCall.number} కు వెంటనే కాల్ కలుపుతున్నాం. మాట్లాడండి.`,
      `Connecting call to ${pendingCall.number} now. Please speak.`,
      `${pendingCall.number} पर कॉल मिलाई जा रही है। बात करें।`,
      `${pendingCall.number} எண்ணிற்கு அழைப்பு இணைக்கப்படுகிறது. பேசவும்.`
    );
    const callNumber = pendingCall.number;
    setPendingCall(null);
    window.location.href = `tel:${callNumber}`;
  };

  const handleCancelCall = () => {
    playTapSound();
    speak(
      'కాల్ రద్దు చేయబడింది.',
      'Emergency call cancelled.',
      'कॉल रद्द कर दी गई।',
      'அழைப்பு ரத்து செய்யப்பட்டது.'
    );
    setPendingCall(null);
  };

  const toggleSiren = () => {
    playTapSound();
    if (isSirenActive) {
      stopEmergencySiren();
      setIsSirenActive(false);
      speak(
        'సైరన్ నిలిపివేయబడింది',
        'Emergency siren stopped.',
        'सायरन बंद कर दिया गया।',
        'சைரன் நிறுத்தப்பட்டது.'
      );
    } else {
      startEmergencySiren();
      setIsSirenActive(true);
      speak(
        'ఎమర్జెన్సీ సైరన్ మోగుతోంది. చుట్టుపక్కల వారిని అప్రమత్తం చేస్తున్నాం.',
        'Emergency siren is sounding to alert people nearby.',
        'आपातकालीन सायरन बज रहा है। आस-पास के लोगों को सतर्क कर रहे हैं।',
        'அவசர சைரன் ஒலிக்கிறது. சுற்றியுள்ளவர்களை எச்சரிக்கிறோம்.'
      );
    }
  };

  const handleSendFamilyWhatsApp = async (phone: string, name: string) => {
    // Play alert sound when manually sending emergency WhatsApp
    playSosAlertSound();

    let liveLat = lat;
    let liveLng = lng;
    let liveAddress = currentAddress;

    // Get fresh GPS at this exact moment if available
    if (typeof window !== 'undefined' && navigator.geolocation) {
      try {
        const fresh = await new Promise<{ lat: number; lng: number; address?: string } | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const fLat = pos.coords.latitude;
              const fLng = pos.coords.longitude;
              try {
                const res = await fetchCompleteReadableAddress(fLat, fLng);
                resolve({ lat: fLat, lng: fLng, address: res.address });
              } catch {
                resolve({ lat: fLat, lng: fLng });
              }
            },
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 2500, maximumAge: 0 }
          );
        });
        if (fresh && fresh.lat && fresh.lng) {
          liveLat = fresh.lat;
          liveLng = fresh.lng;
          if (fresh.address && !fresh.address.startsWith('స్థానాన్ని') && !fresh.address.startsWith('GPS')) {
            liveAddress = fresh.address;
          }
        }
      } catch {
        // fallback to live props
      }
    }

    if (onRefreshLocation) {
      onRefreshLocation(false, true);
    }

    const waNumber = getWhatsAppNumber(phone);
    const sosMessage = buildSosEmergencyWhatsAppMessage(liveAddress, liveLat, liveLng);
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(sosMessage)}`;
    window.open(waUrl, '_blank');
    speak(
      `${name} గారికి వాట్సాప్‌లో అత్యవసర లొకేషన్ సందేశం పంపుతున్నాం`,
      `Sending emergency location message to ${name} via WhatsApp.`,
      `व्हाट्सएप पर ${name} को आपातकालीन स्थान संदेश भेजा जा रहा है।`,
      `வாட்ஸ்அப்பில் ${name} அவர்களுக்கு அவசர இருப்பிட செய்தி அனுப்பப்படுகிறது.`,
      { delayMs: 1600 }
    );
  };

  const handleVoiceGuide = () => {
    playTapSound();
    speak(
      'అత్యవసర సహాయం ఎస్.ఓ.ఎస్ పేజీ. 112 జాతీయ అత్యవసర హెల్ప్‌లైన్, 100 పోలీస్, 108 అంబులెన్స్, 1090 సీనియర్ సిటిజన్ భద్రత నంబర్లు ఉన్నాయి. అత్యవసర కాల్ కోసం కింద ఉన్న పెద్ద కాల్ బటన్ నొక్కండి.',
      'Emergency SOS Page. Includes 112 National Emergency, 100 Police, 108 Ambulance, and 1090 Senior Citizen Security. Tap the large green call button to make an emergency call.',
      'आपातकालीन एसओएस पेज। 112 राष्ट्रीय आपातकाल, 100 पुलिस, 108 एम्बुलेंस और 1090 वरिष्ठ सुरक्षा नंबर उपलब्ध हैं। आपातकालीन कॉल के लिए नीचे बड़ा कॉल बटन दबाएं।',
      'அவசர உதவி SOS பக்கம். 112 தேசிய அவசர எண், 100 காவல்துறை, 108 ஆம்புலன்ஸ் மற்றும் 1090 முதியோர் பாதுகாப்பு எண்கள் உள்ளன. அவசர அழைப்பிற்கு கீழே உள்ள பெரிய அழைப்பு பட்டனை அழுத்தவும்.'
    );
  };

  return (
    <div className="p-3 sm:p-5 max-w-2xl mx-auto space-y-4 pb-12">
      {/* Top Bar with Home and Speech */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
        </div>
        <button
          id="sos-voice-guide-btn"
          onClick={handleVoiceGuide}
          type="button"
          className="p-3.5 bg-red-100 text-red-950 hover:bg-red-200 rounded-2xl border-2 border-red-300 font-bold active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          title={language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'సహాయక స్వరం (వాయిస్ గైడ్)'}
          aria-label={language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'సహాయక స్వరం వినండి'}
        >
          <Volume2 className="w-7 h-7 text-red-900" />
          <span className="hidden sm:inline text-xs font-black">{language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'వాయిస్ సహాయం'}</span>
        </button>
      </div>

      {/* Screen Title Card */}
      <div 
        id="sos-title-card"
        className="bg-gradient-to-r from-red-800 via-red-700 to-rose-800 text-white p-4 sm:p-5 rounded-2xl shadow-lg border-3 border-red-900 flex items-center gap-4"
      >
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-white/30">
          <ShieldAlert className="w-10 h-10 text-amber-300 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-black text-white mb-1">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>SOS</span>
          </div>
          <h2 className={`font-black tracking-tight ${isLargeFont ? 'text-3xl' : 'text-2xl'}`}>
            🆘 {t('sosMainTitle')}
          </h2>
          <p className="font-semibold text-red-100 text-xs sm:text-sm mt-0.5">
            {t('sosMainSubtitle')}
          </p>
        </div>
      </div>

      {/* ONE LARGE RED SOS ACTION BUTTON */}
      <div 
        id="sos-hero-card"
        className="bg-gradient-to-b from-red-100 via-rose-50 to-red-100 p-5 sm:p-6 rounded-3xl border-4 border-red-700 shadow-2xl text-center space-y-4"
      >
        <div className="inline-flex items-center gap-2 bg-red-700 text-white px-4 py-1.5 rounded-full font-black text-xs sm:text-sm tracking-wide uppercase shadow-sm">
          <AlertOctagon className="w-4 h-4 text-amber-300 animate-bounce" />
          <span>SOS</span>
        </div>

        {/* Large Red SOS Button */}
        <button
          id="sos-panic-action-button"
          type="button"
          onClick={handleSosButtonClick}
          className="w-full py-7 sm:py-8 px-5 bg-gradient-to-r from-red-600 via-red-700 to-rose-700 hover:from-red-700 hover:to-rose-800 active:scale-[0.98] text-white font-black rounded-3xl shadow-2xl flex flex-col items-center justify-center gap-2.5 text-3xl sm:text-4xl border-4 border-red-900 transition-all cursor-pointer ring-4 ring-red-400/50 select-none"
          aria-label={t('sosMainTitle')}
        >
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center shadow-inner border border-white/40">
            <AlertOctagon className="w-12 h-12 text-amber-300 animate-bounce" />
          </div>
          <div className="tracking-wider text-4xl sm:text-5xl font-black drop-shadow-md">
            🚨 SOS
          </div>
          <span className="text-sm sm:text-base font-bold text-red-100 bg-red-900/40 px-4 py-1.5 rounded-full border border-red-400/40">
            {t('sosMainSubtitle')}
          </span>
        </button>
      </div>

      {/* CLEAR EMERGENCY OPTIONS: SAVED FAMILY MEMBERS AND 112, 100, 108, 1090 */}
      <div 
        ref={optionsRef}
        id="emergency-options-section" 
        className={`space-y-4 pt-2 transition-all duration-300 ${
          isOptionsHighlighted ? 'ring-4 ring-red-500 rounded-3xl p-2 bg-red-50/50' : ''
        }`}
      >
        {/* SAVED FAMILY MEMBERS WITH LARGE CALL BUTTONS */}
        <div 
          id="sos-saved-family-members-section"
          className="space-y-3.5 bg-gradient-to-b from-emerald-50 via-teal-50/40 to-emerald-50 p-4 sm:p-5 rounded-3xl border-3 border-emerald-500 shadow-xl"
        >
          <div className="flex items-center justify-between border-b pb-2.5 border-emerald-200 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`font-black text-emerald-950 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
                  👨‍👩‍👧 {t('sosFamilyContactsTitle')}:
                </h3>
                <p className="text-xs sm:text-sm font-bold text-emerald-800">
                  {t('familySub')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-xs">
                {contacts.length}
              </span>
              {onNavigateToFamily && (
                <button
                  id="btn-sos-add-family-member"
                  type="button"
                  onClick={() => {
                    playTapSound();
                    onNavigateToFamily();
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs sm:text-sm font-black rounded-xl shadow-xs flex items-center gap-1 cursor-pointer transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{t('familyAddBtn')}</span>
                </button>
              )}
            </div>
          </div>

          {contacts.length === 0 ? (
            <div id="sos-family-empty" className="bg-white rounded-2xl p-6 text-center space-y-3 border-2 border-dashed border-emerald-300">
              <p className="text-3xl">👨‍👩‍👧</p>
              <div className="space-y-1">
                <h4 className="font-black text-stone-900 text-base sm:text-lg">
                  {language === 'en' ? 'No family members added yet' : language === 'hi' ? 'अभी कोई परिवार सदस्य नहीं जोड़ा गया' : language === 'ta' ? 'குடும்ப உறுப்பினர்கள் இன்னும் சேர்க்கப்படவில்லை' : 'ఇంకా కుటుంబ సభ్యులు చేర్చబడలేదు'}
                </h4>
                <p className="text-stone-600 font-bold text-xs sm:text-sm">
                  {language === 'en' ? 'Add family members to call with a single tap in an emergency.' : language === 'hi' ? 'आपातकाल में एक टैप में कॉल करने के लिए परिवार के सदस्यों को जोड़ें।' : language === 'ta' ? 'அவசர காலத்தில் ஒரே தொடுதலில் அழைக்க குடும்ப உறுப்பினர்களைச் சேர்க்கவும்.' : 'అత్యవసర సమయంలో ఒకే నొక్కుతో కాల్ చేయడానికి మీ కుటుంబ సభ్యులను చేర్చండి.'}
                </p>
              </div>
              {onNavigateToFamily && (
                <button
                  id="btn-sos-empty-add-family"
                  type="button"
                  onClick={() => {
                    playTapSound();
                    onNavigateToFamily();
                  }}
                  className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black rounded-xl cursor-pointer inline-flex items-center gap-2 shadow-sm text-sm sm:text-base border-2 border-emerald-700"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{t('familyAddBtn')}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {contacts.map((c) => {
                const dialablePhone = getDialableNumber(c.phone);
                const formattedPhone = formatPhoneNumber(c.phone);
                return (
                  <div
                    key={c.id}
                    id={`sos-family-card-${c.id}`}
                    className="bg-white rounded-2xl p-4 sm:p-5 border-3 border-emerald-500 shadow-md space-y-3 hover:shadow-lg transition-all"
                  >
                    {/* Contact Header */}
                    <div className="flex items-center gap-3.5">
                      <div className={`w-14 h-14 rounded-2xl ${c.avatarColor || 'bg-emerald-600'} text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-md border-2 border-white`}>
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-emerald-100 text-emerald-900 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                            {c.relation}
                          </span>
                          <span className="bg-stone-100 text-stone-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            {language === 'en' ? 'Emergency Contact' : language === 'hi' ? 'आपातकालीन संपर्क' : language === 'ta' ? 'அவசர தொடர்பாளர்' : 'అత్యవసర కాంటాక్ట్'}
                          </span>
                        </div>
                        <h4 className={`font-black text-stone-900 mt-1 truncate ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
                          {c.name}
                        </h4>
                        <p className="text-lg sm:text-xl font-mono font-black text-emerald-800 tracking-wide mt-0.5">
                          📞 {formattedPhone}
                        </p>
                      </div>
                    </div>

                    {/* LARGE SENIOR-FRIENDLY CALL BUTTON */}
                    <div>
                      <a
                        id={`btn-call-sos-family-${c.id}`}
                        href={`tel:${dialablePhone}`}
                        onClick={(e) => handleCallFamily(c, e)}
                        className="w-full py-4 sm:py-5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white font-black rounded-2xl shadow-lg border-3 border-emerald-500 flex items-center justify-center gap-3.5 text-2xl sm:text-3xl transition-all cursor-pointer min-h-[64px] sm:min-h-[72px]"
                        aria-label={`${c.name} (${dialablePhone})`}
                      >
                        <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center shadow-xs shrink-0">
                          <Phone className="w-7 h-7 stroke-[2.5]" />
                        </div>
                        <span>📞 {language === 'en' ? 'Call' : language === 'hi' ? 'कॉल करें' : language === 'ta' ? 'அழைக்கவும்' : 'కాల్ చేయండి'}</span>
                      </a>
                    </div>

                    {/* WhatsApp Quick SOS Location message */}
                    <div>
                      <button
                        id={`btn-sos-whatsapp-quick-${c.id}`}
                        type="button"
                        onClick={() => handleSendFamilyWhatsApp(c.phone, c.name)}
                        className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 active:scale-98 text-emerald-950 font-bold rounded-xl border border-emerald-200 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer transition-all"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-700" />
                        <span>{language === 'en' ? 'Send Live Location on WhatsApp' : language === 'hi' ? 'व्हाट्सएप पर लाइव लोकेशन भेजें' : language === 'ta' ? 'வாட்ஸ்அப்பில் நேரலை இருப்பிடம் அனுப்பு' : 'వాట్సాప్‌లో లైవ్ లొకేషన్ మెసేజ్ పంపండి'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Emergency Helplines Heading */}
        <div className="flex items-center justify-between px-1 pt-2">
          <div>
            <h3 className={`font-black text-stone-950 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
              {language === 'en' ? '🚨 Emergency Helplines:' : language === 'hi' ? '🚨 आपातकालीन हेल्पलाइन:' : language === 'ta' ? '🚨 அவசர உதவி எண்கள்:' : '🚨 అత్యవసర నంబర్లు (Emergency Helplines):'}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-stone-600">
              {language === 'en' ? '1-Tap Call (Confirmation dialog appears before calling)' : language === 'hi' ? 'एक टैप में कॉल (कॉल से पहले पुष्टि स्क्रीन)' : language === 'ta' ? '1 தொடுதலில் அழைப்பு (அழைக்கும் முன் உறுதிப்படுத்தல் வரும்)' : 'ఒకే నొక్కుతో కాల్ చేయండి (కాల్ చేసే ముందు నిర్ధారణ వస్తుంది)'}
            </p>
          </div>
          <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-full">
            {language === 'en' ? '4 Key Services' : language === 'hi' ? '4 मुख्य सेवाएं' : language === 'ta' ? '4 முக்கிய சேவைகள்' : '4 ముఖ్య నంబర్లు'}
          </span>
        </div>

        {/* The 4 Emergency Service Cards */}
        <div className="space-y-3.5">
          {EMERGENCY_SERVICES.map((service) => {
            const IconComp = service.Icon;
            const currentBadge = language === 'en' ? service.badgeEn : language === 'hi' ? service.badgeHi : language === 'ta' ? service.badgeTa : service.badgeTe;
            const currentTitle = language === 'en' ? service.titleEn : language === 'hi' ? service.titleHi : language === 'ta' ? service.titleTa : service.titleTe;
            const currentSub = language === 'en' ? service.subEn : language === 'hi' ? service.subHi : language === 'ta' ? service.subTa : service.subTe;
            const currentDesc = language === 'en' ? service.descEn : language === 'hi' ? service.descHi : language === 'ta' ? service.descTa : service.descTe;
            const callBtnText = language === 'en' ? `Call ${service.number}` : language === 'hi' ? `${service.number} पर कॉल करें` : language === 'ta' ? `${service.number} ஐ அழைக்கவும்` : `${service.number} కు కాల్ చేయండి`;

            return (
              <div
                key={service.id}
                id={`emergency-card-${service.number}`}
                className={`bg-white rounded-2xl p-4 sm:p-5 border-3 ${service.borderColor} shadow-md space-y-3 transition-all`}
              >
                {/* Header: Badge & Title */}
                <div className="flex items-start gap-3.5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md ${service.iconBg}`}>
                    <IconComp className="w-8 h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-stone-100 text-stone-800 text-[11px] font-black px-2 py-0.5 rounded-md border border-stone-200">
                        {currentBadge}
                      </span>
                    </div>
                    <h4 className={`font-black text-stone-950 leading-tight mt-1 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
                      {currentTitle}
                    </h4>
                    <p className="text-xs sm:text-sm font-bold text-stone-600 mt-0.5">
                      {currentSub}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className={`text-stone-700 font-medium bg-stone-50 p-2.5 rounded-xl border border-stone-200 ${isLargeFont ? 'text-base' : 'text-sm'}`}>
                  💡 {currentDesc}
                </p>

                {/* Large One-Tap Call Button */}
                <button
                  id={`btn-call-${service.number}`}
                  type="button"
                  onClick={() => handleRequestCall(service.number, currentTitle, currentDesc)}
                  className={`w-full py-4 px-4 text-white font-black rounded-2xl shadow-lg border-2 flex items-center justify-center gap-3 text-xl sm:text-2xl transition-all cursor-pointer ${service.btnBg}`}
                  aria-label={`${currentTitle} - ${service.number}`}
                >
                  <Phone className="w-7 h-7 text-white animate-bounce shrink-0" />
                  <span>📞 {callBtnText}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Siren Sound Toggle Button */}
      <div className="pt-2">
        <button
          id="btn-toggle-sos-siren"
          type="button"
          onClick={toggleSiren}
          className={`w-full p-4 rounded-2xl font-black text-xl border-3 flex items-center justify-center gap-3 shadow-md transition-all active:scale-98 cursor-pointer ${
            isSirenActive
              ? 'bg-red-600 text-white border-red-800 animate-pulse'
              : 'bg-white hover:bg-stone-100 text-stone-900 border-stone-300'
          }`}
        >
          {isSirenActive ? <BellOff className="w-8 h-8" /> : <BellRing className="w-8 h-8 text-red-600" />}
          <span>{isSirenActive ? t('sosSirenStop') : t('sosSirenStart')}</span>
        </button>
      </div>

      {/* WhatsApp SOS to family members */}
      <div 
        id="sos-family-whatsapp-card"
        className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-stone-200 space-y-3 shadow-xs"
      >
        <div className="flex items-center justify-between border-b pb-2 border-stone-100">
          <h4 className="font-black text-stone-900 text-base sm:text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <span>{language === 'en' ? 'Instant Location Message to Family:' : language === 'hi' ? 'परिवार को त्वरित स्थान संदेश:' : language === 'ta' ? 'குடும்பத்தினருக்கு உடனடி இருப்பிட செய்தி:' : 'కుటుంబ సభ్యులకు తక్షణ లొకేషన్ మెసేజ్:'}</span>
          </h4>
          <span className="text-xs font-bold text-stone-500">WhatsApp</span>
        </div>

        <div className="space-y-2">
          {contacts.slice(0, 3).map((c) => (
            <div
              key={c.id}
              className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-3"
            >
              <div>
                <h5 className="font-bold text-stone-900 text-base">{c.name}</h5>
                <p className="text-xs text-stone-500 font-medium">📞 {formatPhoneNumber(c.phone, true)}</p>
              </div>
              <button
                id={`btn-sos-whatsapp-${c.id}`}
                type="button"
                onClick={() => handleSendFamilyWhatsApp(c.phone, c.name)}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl flex items-center gap-2 text-sm shadow-sm cursor-pointer transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{language === 'en' ? 'Send SOS' : language === 'hi' ? 'SOS भेजें' : language === 'ta' ? 'SOS அனுப்பு' : 'SOS పంపండి'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SIMPLE SENIOR CALL CONFIRMATION MODAL */}
      {pendingCall && (
        <div 
          id="sos-call-confirmation-modal"
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border-4 border-red-600 text-center space-y-4 animate-in zoom-in-95 duration-150">
            {/* Warning Badge */}
            <div className="w-20 h-20 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto shadow-inner border-2 border-red-300">
              <AlertTriangle className="w-11 h-11 text-red-600 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-red-800 bg-red-100 px-3 py-1 rounded-full">
                {language === 'en' ? 'Emergency Call Confirmation' : language === 'hi' ? 'आपातकालीन कॉल पुष्टि' : language === 'ta' ? 'அவசர அழைப்பு உறுதிப்படுத்தல்' : 'అత్యవసర కాల్ నిర్ధారణ'}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900 pt-1">
                {language === 'en' ? 'Do you want to call?' : language === 'hi' ? 'क्या आप कॉल करना चाहते हैं?' : language === 'ta' ? 'அழைக்க விரும்புகிறீர்களா?' : 'కాల్ చేయాలా?'}
              </h3>
              <p className="text-lg font-black text-red-700 font-mono">
                {pendingCall.title}
              </p>
              <p className="text-sm font-bold text-stone-600">
                {pendingCall.desc}
              </p>
            </div>

            {/* Note */}
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs font-bold text-amber-950 text-left">
              {language === 'en' ? '⚠️ Tapping this button directly dials the emergency helpline from your phone.' : language === 'hi' ? '⚠️ यह बटन दबाते ही सीधे आपके फोन से आपातकालीन हेल्पलाइन पर कॉल जाएगी।' : language === 'ta' ? '⚠️ இந்த பொத்தானை அழுத்தினால் உங்கள் தொலைபேசியிலிருந்து அவசர எண்ணிற்கு நேரடியாக அழைப்பு செல்லும்.' : '⚠️ ఈ బటన్ నొక్కగానే మీ ఫోన్ ద్వారా నేరుగా అత్యవసర విభాగానికి కాల్ వెళుతుంది.'}
            </div>

            {/* Large Two Action Buttons: Yes, Call & No, Cancel */}
            <div className="space-y-2.5 pt-1">
              {/* Confirm / Yes Call */}
              <button
                id="btn-confirm-emergency-call"
                type="button"
                onClick={handleConfirmCall}
                className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-98 text-white font-black rounded-2xl text-xl sm:text-2xl flex items-center justify-center gap-3 shadow-lg border-2 border-emerald-500 cursor-pointer transition-all"
              >
                <Check className="w-7 h-7 stroke-[3]" />
                <span>{language === 'en' ? 'Yes, Call Now 📞' : language === 'hi' ? 'हाँ, कॉल करें 📞' : language === 'ta' ? 'ஆம், அழைக்கவும் 📞' : 'అవును, కాల్ చేయండి 📞'}</span>
              </button>

              {/* Cancel / No */}
              <button
                id="btn-cancel-emergency-call"
                type="button"
                onClick={handleCancelCall}
                className="w-full py-3.5 px-4 bg-stone-200 hover:bg-stone-300 active:scale-98 text-stone-900 font-black rounded-2xl text-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <X className="w-6 h-6 stroke-[3] text-stone-600" />
                <span>{language === 'en' ? 'No, Cancel' : language === 'hi' ? 'रद्द करें' : language === 'ta' ? 'ரத்து செய்' : 'వద్దు, రద్దు చేయండి (Cancel)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SENIOR-FRIENDLY FAMILY DIALER FEEDBACK MODAL */}
      {activeCallingContact && (
        <div 
          id="sos-family-dialer-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border-4 border-emerald-600 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-20 h-20 mx-auto bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shadow-inner border-2 border-emerald-300">
              <PhoneCall className="w-10 h-10 animate-bounce text-emerald-700" />
            </div>

            <div className="space-y-1">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-black rounded-full uppercase tracking-wider">
                {language === 'en' ? 'Dialer Connected' : language === 'hi' ? 'डायलर कनेक्टेड' : language === 'ta' ? 'டயலர் இணைக்கப்பட்டது' : 'డయలర్ కనెక్ట్ చేయబడింది'}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900 pt-1">
                {activeCallingContact.name}
              </h3>
              <p className="text-2xl sm:text-3xl font-mono font-black text-emerald-700">
                {activeCallingContact.phone}
              </p>
              <p className="text-xs sm:text-sm font-bold text-stone-600 pt-1">
                {language === 'en' ? 'Your phone dialer has been opened. Please speak to the person.' : language === 'hi' ? 'आपका फोन डायलर खुल गया है। कृपया बात करें।' : language === 'ta' ? 'உங்கள் போன் டயலர் திறக்கப்பட்டது. பேசவும்.' : 'మీ ఫోన్ డయలర్ ఓపెన్ చేయబడింది. మాట్లాడండి.'}
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <a
                id="btn-reopen-sos-family-dialer"
                href={`tel:${activeCallingContact.phone}`}
                onClick={() => {
                  playTapSound();
                  window.location.href = `tel:${activeCallingContact.phone}`;
                }}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black rounded-2xl text-lg flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Phone className="w-5 h-5" />
                <span>{language === 'en' ? 'Reopen Phone Dialer' : language === 'hi' ? 'पुनः डायलर खोलें' : language === 'ta' ? 'மீண்டும் டயலர் திறக்கவும்' : 'మళ్ళీ డయలర్ తెరవండి'}</span>
              </a>

              <button
                id="btn-close-sos-family-dialer-modal"
                type="button"
                onClick={() => {
                  playTapSound();
                  setActiveCallingContact(null);
                }}
                className="w-full py-3 px-4 bg-stone-100 hover:bg-stone-200 active:scale-98 text-stone-700 font-black rounded-2xl text-sm cursor-pointer border border-stone-300"
              >
                {language === 'en' ? 'Done (Close)' : language === 'hi' ? 'संपन्न (बंद करें)' : language === 'ta' ? 'முடிந்தது (மூடு)' : 'పూర్తయింది (Close)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SENIOR-FRIENDLY SOS ACTIVATED & WHATSAPP SENT MODAL */}
      {activatedSosState && (
        <div 
          id="sos-activated-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full border-4 border-emerald-600 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header Icon */}
            <div className="w-20 h-20 mx-auto bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shadow-inner border-2 border-emerald-300">
              <MessageCircle className="w-11 h-11 text-emerald-600 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-black rounded-full uppercase tracking-wider">
                {language === 'en' ? '🚨 SOS Activated!' : language === 'hi' ? '🚨 SOS सक्रिय हुआ!' : language === 'ta' ? '🚨 SOS இயக்கப்பட்டது!' : '🚨 SOS యాక్టివేట్ చేయబడింది!'}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900 pt-1">
                {language === 'en' ? 'WhatsApp & Call Initiated' : language === 'hi' ? 'व्हाट्सएप एवं कॉल शुरू हुआ' : language === 'ta' ? 'வாட்ஸ்அப் & அழைப்பு தொடங்கியது' : 'వాట్సాప్ & కాల్ ప్రారంభించబడింది'}
              </h3>
              <p className="text-sm font-bold text-stone-700">
                {language === 'en'
                  ? <>Live GPS location was sent to <strong className="text-emerald-800">{activatedSosState.contact.name}</strong> on WhatsApp and phone call is initiated.</>
                  : language === 'hi'
                  ? <>आपका जीपीएस स्थान <strong className="text-emerald-800">{activatedSosState.contact.name}</strong> को व्हाट्सएप पर भेजा गया है और कॉल शुरू की गई है।</>
                  : language === 'ta'
                  ? <>உங்கள் நேரலை ஜிபிஎஸ் இடம் <strong className="text-emerald-800">{activatedSosState.contact.name}</strong> அவர்களுக்கு வாட்ஸ்அப்பில் அனுப்பப்பட்டு அழைப்பு தொடங்கப்பட்டது.</>
                  : <>మీ ప్రస్తుత GPS లొకేషన్ <strong className="text-emerald-800">{activatedSosState.contact.name}</strong> గారికి వాట్సాప్‌లో పంపబడింది మరియు ఫోన్ కాల్ ప్రారంభించబడింది.</>}
              </p>
            </div>

            {/* Location & Contact Details Card */}
            <div className="bg-emerald-50/80 p-3.5 rounded-2xl border-2 border-emerald-200 text-left space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between border-b pb-1.5 border-emerald-200 font-bold text-emerald-950">
                <span>{language === 'en' ? 'Contact:' : language === 'hi' ? 'संपर्क:' : language === 'ta' ? 'தொடர்பாளர்:' : 'కాంటాక్ట్:'} {activatedSosState.contact.name} ({activatedSosState.contact.relation})</span>
                <span className="font-mono text-xs">{activatedSosState.sentAt}</span>
              </div>
              <p className="text-stone-800 font-medium leading-relaxed">
                📍 <strong>{language === 'en' ? 'Current Address:' : language === 'hi' ? 'वर्तमान पता:' : language === 'ta' ? 'தற்போதைய முகவரி:' : 'ప్రస్తుత చిరునామా:'}</strong> {activatedSosState.address || currentAddress}
              </p>
            </div>

            {/* Quick Senior-Friendly Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {/* Large Call Button */}
              <a
                id="btn-sos-modal-call-contact"
                href={`tel:${getDialableNumber(activatedSosState.contact.phone)}`}
                onClick={(e) => handleCallFamily(activatedSosState.contact, e)}
                className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-98 text-white font-black rounded-2xl text-xl sm:text-2xl flex items-center justify-center gap-3 shadow-lg border-2 border-emerald-500 cursor-pointer transition-all"
              >
                <Phone className="w-6 h-6 stroke-[3]" />
                <span>📞 {language === 'en' ? `Call ${activatedSosState.contact.name}` : language === 'hi' ? `${activatedSosState.contact.name} को कॉल करें` : language === 'ta' ? `${activatedSosState.contact.name} ஐ அழைக்கவும்` : `${activatedSosState.contact.name} కు కాల్ చేయండి`}</span>
              </a>

              {/* Reopen WhatsApp Button */}
              <button
                id="btn-sos-modal-reopen-whatsapp"
                type="button"
                onClick={() => handleSendFamilyWhatsApp(activatedSosState.contact.phone, activatedSosState.contact.name)}
                className="w-full py-3.5 px-4 bg-emerald-50 hover:bg-emerald-100 active:scale-98 text-emerald-950 font-black rounded-2xl text-base flex items-center justify-center gap-2.5 border border-emerald-300 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 text-emerald-700" />
                <span>{language === 'en' ? 'Reopen WhatsApp' : language === 'hi' ? 'व्हाट्सएप पुनः खोलें' : language === 'ta' ? 'வாட்ஸ்அப் மீண்டும் திறக்கவும்' : 'వాట్సాప్ మళ్ళీ తెరవండి (Reopen WhatsApp)'}</span>
              </button>

              {/* If other family contacts exist, offer one-tap send to them too */}
              {contacts.length > 1 && (
                <div className="pt-2 border-t border-stone-200 text-left">
                  <p className="text-xs font-black text-stone-600 mb-2">
                    {language === 'en' ? 'Send location to another family member:' : language === 'hi' ? 'अन्य परिवार सदस्य को भी स्थान भेजें:' : language === 'ta' ? 'மற்றொரு குடும்ப உறுப்பினருக்கும் அனுப்பவும்:' : 'మరొక కుటుంబ సభ్యుడికి కూడా లొకేషన్ పంపండి:'}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {contacts.filter(c => c.id !== activatedSosState.contact.id).map(otherContact => (
                      <button
                        key={otherContact.id}
                        id={`btn-sos-modal-send-other-${otherContact.id}`}
                        type="button"
                        onClick={() => handleSendFamilyWhatsApp(otherContact.phone, otherContact.name)}
                        className="py-2.5 px-3 bg-stone-50 hover:bg-stone-100 active:scale-98 text-stone-900 font-bold rounded-xl border border-stone-200 text-xs flex items-center justify-between cursor-pointer"
                      >
                        <span>{otherContact.name} ({otherContact.relation})</span>
                        <span className="text-emerald-700 font-black flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" /> {language === 'en' ? 'Send' : language === 'hi' ? 'भेजें' : language === 'ta' ? 'அனுப்பு' : 'పంపండి'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                id="btn-close-sos-activated-modal"
                type="button"
                onClick={() => {
                  playTapSound();
                  setActivatedSosState(null);
                }}
                className="w-full py-3 px-4 bg-stone-100 hover:bg-stone-200 active:scale-98 text-stone-800 font-black rounded-2xl text-sm cursor-pointer border border-stone-300 mt-1"
              >
                {language === 'en' ? 'Close' : language === 'hi' ? 'बंद करें' : language === 'ta' ? 'மூடு' : 'సరే, పూర్తయింది (Close)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NO SAVED EMERGENCY CONTACT ALERT MODAL */}
      {noContactsAlert && (
        <div 
          id="sos-no-contacts-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full border-4 border-amber-500 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-20 h-20 mx-auto bg-amber-100 text-amber-800 rounded-full flex items-center justify-center shadow-inner border-2 border-amber-300">
              <AlertTriangle className="w-11 h-11 text-amber-600 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-full uppercase tracking-wider">
                {language === 'en' ? 'No Contact Saved' : language === 'hi' ? 'कोई संपर्क नहीं' : language === 'ta' ? 'தொடர்பு எண் இல்லை' : 'కాంటాక్ట్ నంబర్ లేదు'}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900 pt-1">
                {language === 'en' ? 'No Family Members Saved' : language === 'hi' ? 'परिवार का कोई नंबर नहीं है' : language === 'ta' ? 'குடும்பத்தினர் எண் இல்லை' : 'కుటుంబ సభ్యుల నంబర్ లేదు'}
              </h3>
              <p className="text-sm font-bold text-stone-600">
                {language === 'en' ? 'No emergency contacts have been saved yet. Please call 112 or 108 immediately or add a new family contact.' : language === 'hi' ? 'अभी कोई आपातकालीन संपर्क सुरक्षित नहीं है। तुरंत 112 या 108 पर कॉल करें या नया संपर्क जोड़ें।' : language === 'ta' ? 'இன்னும் அவசர தொடர்புகள் சேமிக்கப்படவில்லை. உடனே 112 அல்லது 108 ஐ அழைக்கவும் அல்லது புதிய தொடர்பைச் சேர்க்கவும்.' : 'ఇంకా ఏ అత్యవసర కాంటాక్ట్ సేవ్ చేయలేదు. వెంటనే 112 లేదా 108 కు కాల్ చేయండి లేదా కొత్త నంబర్ జోడించండి.'}
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                id="btn-no-contacts-call-112"
                type="button"
                onClick={() => {
                  setNoContactsAlert(false);
                  handleRequestCall(
                    '112',
                    language === 'en' ? '112 - National Emergency' : language === 'hi' ? '112 - राष्ट्रीय आपातकाल' : language === 'ta' ? '112 - தேசிய அவசர எண்' : '112 - జాతీయ అత్యవసర హెల్ప్‌లైన్',
                    language === 'en' ? 'Single number for immediate crisis help' : language === 'hi' ? 'तत्काल संकट सहायता के लिए एकल नंबर' : language === 'ta' ? 'உடனடி உதவிக்கான ஒரே எண்' : 'తక్షణ సహాయం కోసం ఒకే ఒక్క నంబర్'
                  );
                }}
                className="w-full py-4 px-4 bg-red-600 hover:bg-red-700 active:scale-98 text-white font-black rounded-2xl text-xl flex items-center justify-center gap-3 shadow-lg border-2 border-red-500 cursor-pointer"
              >
                <Phone className="w-6 h-6" />
                <span>📞 {language === 'en' ? 'Call 112' : language === 'hi' ? '112 पर कॉल करें' : language === 'ta' ? '112 ஐ அழைக்கவும்' : '112 కు కాల్ చేయండి'}</span>
              </button>

              <button
                id="btn-no-contacts-call-108"
                type="button"
                onClick={() => {
                  setNoContactsAlert(false);
                  handleRequestCall(
                    '108',
                    language === 'en' ? '108 - Emergency Ambulance' : language === 'hi' ? '108 - आपातकालीन एम्बुलेंस' : language === 'ta' ? '108 - அவசர ஆம்புலன்ஸ்' : '108 - అత్యవసర అంబులెన్స్',
                    language === 'en' ? 'Free government emergency ambulance' : language === 'hi' ? 'सरकारी मुफ्त आपातकालीन एम्बुलेंस' : language === 'ta' ? 'அரசு இலவச அவசர ஆம்புலன்ஸ்' : 'ఉచిత ప్రభుత్వ అంబులెన్స్ సేవ'
                  );
                }}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black rounded-2xl text-lg flex items-center justify-center gap-3 shadow-md border-2 border-emerald-500 cursor-pointer"
              >
                <Phone className="w-6 h-6" />
                <span>📞 {language === 'en' ? 'Call 108 Ambulance' : language === 'hi' ? '108 एम्बुलेंस को कॉल करें' : language === 'ta' ? '108 ஆம்புலன்ஸை அழைக்கவும்' : '108 అంబులెన్స్‌కు కాల్ చేయండి'}</span>
              </button>

              {onNavigateToFamily && (
                <button
                  id="btn-no-contacts-add-family"
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setNoContactsAlert(false);
                    onNavigateToFamily();
                  }}
                  className="w-full py-3.5 px-4 bg-purple-700 hover:bg-purple-800 active:scale-98 text-white font-black rounded-2xl text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                  <span>{t('familyAddBtn')}</span>
                </button>
              )}

              <button
                id="btn-close-no-contacts-modal"
                type="button"
                onClick={() => {
                  playTapSound();
                  setNoContactsAlert(false);
                }}
                className="w-full py-3 px-4 bg-stone-100 hover:bg-stone-200 active:scale-98 text-stone-700 font-black rounded-2xl text-sm cursor-pointer border border-stone-300"
              >
                {language === 'en' ? 'Cancel' : language === 'hi' ? 'रद्द करें' : language === 'ta' ? 'ரத்து செய்' : 'రద్దు (Cancel)'}
              </button>
            </div>
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

