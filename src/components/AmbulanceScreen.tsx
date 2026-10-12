import React, { useState, useEffect } from 'react';
import { HomeButton } from './HomeButton';
import { Ambulance, Phone, AlertTriangle, Volume2, MapPin, BellRing, BellOff, ShieldCheck, HeartPulse, CheckCircle2, Clock } from 'lucide-react';
import { playTapSound, speakInLanguage, startEmergencySiren, stopEmergencySiren } from '../utils/audio';
import { useLanguage } from '../utils/i18n';

interface AmbulanceScreenProps {
  onGoHome: () => void;
  isLargeFont: boolean;
  currentAddress?: string;
  lat?: number | null;
  lng?: number | null;
  onRefreshLocation?: () => void;
}

export const AmbulanceScreen: React.FC<AmbulanceScreenProps> = ({
  onGoHome,
  isLargeFont,
  currentAddress = 'స్థానం గుర్తింపబడలేదు',
  lat = null,
  lng = null,
  onRefreshLocation,
}) => {
  const { language, t } = useLanguage();
  const [isSirenOn, setIsSirenOn] = useState(false);
  const [hasCalled, setHasCalled] = useState(false);
  const [displayAddress, setDisplayAddress] = useState<string>(currentAddress);
  const prevCoordsRef = React.useRef<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  // Sync address from props if provided
  useEffect(() => {
    if (currentAddress && currentAddress !== 'స్థానం గుర్తింపబడలేదు' && currentAddress !== 'స్థానాన్ని గుర్తిస్తున్నాం...') {
      setDisplayAddress(currentAddress);
    }
  }, [currentAddress]);

  // Request fresh device GPS on mount to ensure address is 100% current
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          prevCoordsRef.current = { lat: latitude, lng: longitude };
          try {
            const res = await fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`);
            if (res.ok) {
              const data = await res.json();
              if (data?.display_name) {
                setDisplayAddress(data.display_name);
              }
            }
          } catch {
            // Ignore
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
      );
    }
  }, []);

  // Automatic voice readout on screen mount
  useEffect(() => {
    const activeAddr = displayAddress || currentAddress;
    const addrPrompt = activeAddr && activeAddr !== 'స్థానం గుర్తింపబడలేదు'
      ? (language === 'en'
          ? `Your current address: ${activeAddr}. Share this address with the operator once connected.`
          : language === 'hi'
          ? `आपका वर्तमान पता: ${activeAddr}। कॉल जुड़ने पर ऑपरेटर को यह पता बताएं।`
          : language === 'ta'
          ? `உங்கள் தற்போதைய முகவரி: ${activeAddr}. அழைப்பு இணைந்ததும் ஆபரேட்டரிடம் இந்த முகவரியைக் கூறவும்.`
          : `మీ ప్రస్తుత చిరునామా: ${activeAddr}. ఫోన్ కలిశాక ఈ చిరునామాను ఆపరేటర్‌కు చెప్పండి.`)
      : (language === 'en'
          ? 'Share your current address with the operator once connected.'
          : language === 'hi'
          ? 'कॉल जुड़ने पर ऑपरेटर को अपना वर्तमान पता बताएं।'
          : language === 'ta'
          ? 'அழைப்பு இணைந்ததும் ஆபரேட்டரிடம் உங்கள் தற்போதைய முகவரியைக் கூறவும்.'
          : 'మీ ప్రస్తుత చిరునామాను ఫోన్ కలిశాక ఆపరేటర్‌కు చెప్పండి.');

    const speechText = language === 'en'
      ? `108 Ambulance page. Tap the big red button below for free emergency ambulance service. ${addrPrompt} An emergency siren button is also available.`
      : language === 'hi'
      ? `108 एम्बुलेंस पेज। मुफ्त आपातकालीन एम्बुलेंस के लिए नीचे दिए गए बड़े लाल बटन को दबाएँ। ${addrPrompt} सहायता के लिए साइरन बटन भी उपलब्ध है।`
      : language === 'ta'
      ? `108 ஆம்புலன்ஸ் பக்கம். இலவச அவசர ஆம்புலன்ஸ் சேவைக்கு கீழே உள்ள பெரிய சிவப்பு பொத்தானை அழுத்தவும். ${addrPrompt} உதவிக்கு சைரன் பொத்தானும் உள்ளது.`
      : `108 అంబులెన్స్ పేజీ. అత్యవసర ఉచిత అంబులెన్స్ సేవ కోసం కింద ఉన్న పెద్ద ఎరుపు రంగు బటన్ నొక్కండి. ${addrPrompt} సహాయం కోసం సైరన్ మోగించే బటన్ కూడా అందుబాటులో ఉంది.`;

    speakInLanguage(speechText, language, { delayMs: 400 });
  }, [language]);

  const toggleSiren = () => {
    playTapSound();
    if (isSirenOn) {
      stopEmergencySiren();
      setIsSirenOn(false);
      const sirenOff = language === 'en' ? 'Siren stopped' : language === 'hi' ? 'साइरन बंद किया गया' : language === 'ta' ? 'சைரன் நிறுத்தப்பட்டது' : 'సైరన్ ఆపివేయబడింది';
      speakInLanguage(sirenOff, language);
    } else {
      startEmergencySiren();
      setIsSirenOn(true);
      const sirenOn = language === 'en' ? 'Emergency siren sounding. Alerting people nearby.' : language === 'hi' ? 'आपातकालीन साइरन बज रहा है। आस-पास के लोगों को सतर्क कर रहे हैं।' : language === 'ta' ? 'அவசர சைரன் ஒலிக்கிறது. அருகிலுள்ளவர்களை எச்சரிக்கிறது.' : 'ఎమర్జెన్సీ సైరన్ మోగుతోంది. చుట్టుపక్కల వారిని అప్రమత్తం చేస్తున్నాం.';
      speakInLanguage(sirenOn, language);
    }
  };

  const handleReadAddress = () => {
    playTapSound();
    const activeAddr = displayAddress || currentAddress;
    const readAddr = language === 'en'
      ? `Your current address: ${activeAddr}. Clearly state this address to the 108 ambulance operator.`
      : language === 'hi'
      ? `आपका वर्तमान पता: ${activeAddr}। 108 एम्बुलेंस ऑपरेटर को यह पता स्पष्ट रूप से बताएं।`
      : language === 'ta'
      ? `உங்கள் தற்போதைய முகவரி: ${activeAddr}. 108 ஆம்புலன்ஸ் ஆபரேட்டரிடம் இந்த முகவரியைத் தெளிவாகக் கூறவும்.`
      : `మీ ప్రస్తుత చిరునామా: ${activeAddr}. ఈ చిరునామాను 108 అంబులెన్స్ ఆపరేటర్‌కు స్పష్టంగా చెప్పండి.`;
    speakInLanguage(readAddr, language);
  };

  const handleVoiceGuide = () => {
    playTapSound();
    const activeAddr = displayAddress || currentAddress;
    const addrPrompt = activeAddr && activeAddr !== 'స్థానం గుర్తింపబడలేదు'
      ? (language === 'en' ? `Your address: ${activeAddr}.` : language === 'hi' ? `आपका पता: ${activeAddr}।` : language === 'ta' ? `உங்கள் முகவரி: ${activeAddr}.` : `మీ ప్రస్తుత చిరునామా: ${activeAddr}.`)
      : '';
    const guideSpeech = language === 'en'
      ? `108 Ambulance page. 108 is the government free emergency ambulance service. Tap the big red button to summon an ambulance. ${addrPrompt}`
      : language === 'hi'
      ? `108 एम्बुलेंस पेज। 108 सरकारी मुफ्त आपातकालीन एम्बुलेंस सेवा है। एम्बुलेंस बुलाने के लिए बड़ा लाल बटन दबाएं। ${addrPrompt}`
      : language === 'ta'
      ? `108 ஆம்புலன்ஸ் பக்கம். 108 என்பது அரசு இலவச அவசர ஆம்புலன்ஸ் சேவை. ஆம்புலன்ஸை வரவழைக்க பெரிய சிவப்பு பொத்தானை அழுத்தவும். ${addrPrompt}`
      : `108 అంబులెన్స్ పేజీ. 108 అనేది ప్రభుత్వ ఉచిత అత్యవసర అంబులెన్స్ సర్వీస్. వెంటనే అంబులెన్స్‌ను రప్పించడానికి పెద్ద ఎరుపు రంగు బటన్ నొక్కండి. ${addrPrompt}`;
    speakInLanguage(guideSpeech, language);
  };

  const handleCall108 = () => {
    playTapSound();
    setHasCalled(true);
    const callSpeech = language === 'en'
      ? 'Connecting call to 108 Free Emergency Ambulance Service. Please speak to the operator.'
      : language === 'hi'
      ? '108 मुफ्त आपातकालीन एम्बुलेंस सेवा को कॉल कर रहे हैं। तुरंत बात करें।'
      : language === 'ta'
      ? '108 இலவச அவசர ஆம்புலன்ஸ் சேவைக்கு அழைக்கப்படுகிறது. உடனடியாகப் பேசவும்.'
      : '108 ఉచిత అత్యవసర అంబులెన్స్ సర్వీస్‌కు ఫోన్ కలుపుతున్నాం. వెంటనే మాట్లాడండి.';
    speakInLanguage(callSpeech, language);
  };

  return (
    <div className="p-3 sm:p-5 max-w-2xl mx-auto space-y-4 pb-12">
      {/* Top Bar with Home and Speech Guide */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
        </div>
        <button
          id="ambulance-voice-guide-btn"
          onClick={handleVoiceGuide}
          type="button"
          className="p-3.5 bg-red-100 text-red-950 hover:bg-red-200 rounded-2xl border-2 border-red-300 font-bold active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          title={language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'సహాయక స్వరం (వాయిస్ గైడ్)'}
          aria-label={language === 'en' ? 'Listen to Voice Guide' : language === 'hi' ? 'आवाज़ सहायता सुनें' : language === 'ta' ? 'குரல் உதவி கேளுங்கள்' : 'సహాయక స్వరం వినండి'}
        >
          <Volume2 className="w-7 h-7 text-red-900" />
          <span className="hidden sm:inline text-xs font-black">{language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'వాయిస్ సహాయం'}</span>
        </button>
      </div>

      {/* Screen Title Card */}
      <div 
        id="ambulance-title-card"
        className="bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white p-4 sm:p-5 rounded-2xl shadow-lg border-3 border-red-800 flex items-center gap-4"
      >
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-white/30">
          <Ambulance className="w-10 h-10 text-white animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-black text-white mb-1">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Govt Free Emergency Medical Vehicle' : language === 'hi' ? 'सरकारी मुफ्त आपातकालीन चिकित्सा वाहन' : language === 'ta' ? 'அரசு இலவச அவசர மருத்துவ வாகனம்' : 'ప్రభుత్వ ఉచిత అత్యవసర వైద్య వాహనం'}</span>
          </div>
          <h2 className={`font-black tracking-tight ${isLargeFont ? 'text-3xl' : 'text-2xl'}`}>
            🚑 {language === 'en' ? 'Ambulance (108 Service)' : language === 'hi' ? 'एम्बुलेंस (108 सेवा)' : language === 'ta' ? 'ஆம்புலன்ஸ் (108 சேவை)' : 'అంబులెన్స్ (108 సర్వీస్)'}
          </h2>
          <p className="font-semibold text-red-100 text-xs sm:text-sm mt-0.5">
            {language === 'en' ? '24/7 Available Free Emergency Service' : language === 'hi' ? '24/7 उपलब्ध मुफ्त आपातकालीन सेवा' : language === 'ta' ? '24 மணி நேரமும் கிடைக்கும் இலவச அவசர சேவை' : '24 గంటలు అందుబాటులో ఉండే ఉచిత అత్యవసర సేవ'}
          </p>
        </div>
      </div>

      {/* CLEAR EXPLANATION CARD FOR SENIORS */}
      <div 
        id="ambulance-explanation-banner"
        className="bg-white p-4 sm:p-5 rounded-2xl border-3 border-red-300 shadow-sm space-y-2.5"
      >
        <div className="flex items-center gap-2 text-red-900 font-black text-base sm:text-lg">
          <ShieldCheck className="w-6 h-6 text-red-600 shrink-0" />
          <span>{language === 'en' ? 'What is 108 Ambulance Service?' : language === 'hi' ? '108 एम्बुलेंस सेवा क्या है?' : language === 'ta' ? '108 ஆம்புலன்ஸ் சேவை என்றால் என்ன?' : '108 అంబులెన్స్ సర్వీస్ అంటే ఏమిటి?'}</span>
        </div>
        <p className={`text-stone-800 font-bold leading-relaxed ${isLargeFont ? 'text-lg' : 'text-base'}`}>
          {language === 'en' ? (
            <><strong>108</strong> is the official <strong>Free Emergency Ambulance Service</strong>. Tapping this button instantly connects you to the control room.</>
          ) : language === 'hi' ? (
            <><strong>108</strong> सरकार की <strong>मुफ्त आपातकालीन एम्बुलेंस सेवा</strong> है। यह बटन दबाते ही तुरंत कंट्रोल रूम से कॉल जुड़ जाता है।</>
          ) : language === 'ta' ? (
            <><strong>108</strong> என்பது அரசின் <strong>இலவச அவசர ஆம்புலன்ஸ் சேவை</strong>. இந்த பொத்தானை அழுத்தியதும் உடனடியாக கட்டுப்பாட்டு அறைக்கு அழைப்பு செல்லும்.</>
          ) : (
            <><strong>108</strong> అనేది ఆంధ్రప్రదేశ్ & తెలంగాణ ప్రభుత్వాల <strong>ఉచిత అత్యవసర అంబులెన్స్ సర్వీస్</strong>. ఈ బటన్ నొక్కగానే క్షణాల్లో అంబులెన్స్ కంట్రోల్ రూమ్‌కు ఫోన్ కలుస్తుంది.</>
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs sm:text-sm font-bold text-stone-700">
          <div className="flex items-center gap-2 bg-red-50 p-2 rounded-xl border border-red-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{language === 'en' ? '100% Free Service' : language === 'hi' ? 'पूरी तरह मुफ्त (कोई शुल्क नहीं)' : language === 'ta' ? 'முற்றிலும் இலவசம்' : 'పూర్తిగా ఉచితం (పైసా ఖర్చు లేదు)'}</span>
          </div>
          <div className="flex items-center gap-2 bg-red-50 p-2 rounded-xl border border-red-200">
            <Clock className="w-4 h-4 text-red-600 shrink-0" />
            <span>{language === 'en' ? 'Works 24 Hours / 7 Days' : language === 'hi' ? '24 घंटे निरंतर कार्यशील' : language === 'ta' ? '24 மணி நேரமும் செயல்படுகிறது' : '24 గంటలూ నిరంతరాయంగా పని చేస్తుంది'}</span>
          </div>
        </div>
      </div>

      {/* VERY LARGE 108 EMERGENCY CALL ACTION BOX */}
      <div 
        id="ambulance-main-call-box"
        className="bg-gradient-to-b from-red-50 via-rose-50 to-red-100 p-5 sm:p-7 rounded-3xl border-4 border-red-600 shadow-2xl text-center space-y-4 relative overflow-hidden"
      >
        {/* Animated pulse badge */}
        <div className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-full font-black text-sm sm:text-base tracking-wide uppercase shadow-md animate-pulse">
          <AlertTriangle className="w-5 h-5 text-amber-300 animate-bounce" />
          <span>{language === 'en' ? '1-Tap Emergency Ambulance Call' : language === 'hi' ? 'एक टैप में एम्बुलेंस को कॉल करें' : language === 'ta' ? 'ஒரே தொடுதலில் ஆம்புலன்ஸ் அழைக்கவும்' : 'ఒకే నొక్కుతో అంబులెన్స్ కాల్ చేయండి'}</span>
        </div>

        <div>
          <h3 className={`font-black text-stone-950 ${isLargeFont ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
            {language === 'en' ? 'Tap Here for Emergency Ambulance' : language === 'hi' ? 'आपातकालीन एम्बुलेंस के लिए यहाँ दबाएँ' : language === 'ta' ? 'அவசர ஆம்புலன்ஸுக்கு இங்கே அழுத்தவும்' : 'అత్యవసర అంబులెన్స్ కోసం ఇక్కడ నొక్కండి'}
          </h3>
          <p className="text-stone-700 font-bold text-base sm:text-lg mt-1">
            {language === 'en' ? 'Instantly dials 108 Helpline directly' : language === 'hi' ? 'तुरंत सीधे 108 हेल्पलाइन से जुड़ता है' : language === 'ta' ? 'உடனடியாக 108 உதவி எண்ணிற்கு இணைக்கும்' : 'తక్షణమే 108 హెల్ప్‌లైన్‌కు నేరుగా కనెక్ట్ అవుతుంది'}
          </p>
        </div>

        {/* The Very Large 108 Call Button */}
        <a
          id="btn-call-108"
          href="tel:108"
          onClick={handleCall108}
          className="w-full py-6 sm:py-7 px-4 sm:px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 active:scale-[0.98] text-white font-black rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 text-3xl sm:text-4xl lg:text-5xl border-4 border-red-800 transition-all cursor-pointer ring-4 ring-red-400/40"
          aria-label={t('sosCallAmbulanceIndia')}
        >
          <div className="w-16 h-16 sm:w-18 sm:h-18 bg-white text-red-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <Phone className="w-10 h-10 sm:w-12 sm:h-12 animate-bounce" />
          </div>
          <div className="text-center sm:text-left">
            <div className="tracking-tight font-black leading-none">
              📞 {language === 'en' ? 'Call 108' : language === 'hi' ? '108 पर कॉल करें' : language === 'ta' ? '108 ஐ அழைக்கவும்' : '108 కు కాల్ చేయండి'}
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-red-100 mt-1 uppercase tracking-wider">
              {language === 'en' ? 'Ambulance Service (Free Emergency Call)' : language === 'hi' ? 'एम्बुलेंस सेवा (मुफ्त आपातकालीन कॉल)' : language === 'ta' ? 'ஆம்புலன்ஸ் சேவை (இலவச அவசர அழைப்பு)' : 'అంబులెన్స్ సర్వీస్ (ఉచిత అత్యవసర కాల్)'}
            </div>
          </div>
        </a>

        {hasCalled && (
          <div className="p-3 bg-emerald-100 border-2 border-emerald-400 rounded-xl text-emerald-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{language === 'en' ? '108 dialer opened. Please speak to the operator.' : language === 'hi' ? '108 डायलर खुल गया है। कृपया बात करें।' : language === 'ta' ? '108 டயலர் திறக்கப்பட்டது. தயவுசெய்து பேசவும்.' : '108 డయలర్ తెరవబడింది. దయచేసి మాట్లాడండి.'}</span>
          </div>
        )}
      </div>

      {/* What to tell 108 Operator (Address Helper for seniors) */}
      <div 
        id="ambulance-address-guidance-card"
        className="bg-white p-4 sm:p-5 rounded-2xl border-3 border-amber-400 shadow-md space-y-3"
      >
        <div className="flex items-center justify-between border-b pb-2.5 border-stone-200">
          <div className="flex items-center gap-2 text-stone-900 font-black text-lg sm:text-xl">
            <MapPin className="w-6 h-6 text-red-600 shrink-0" />
            <span>{language === 'en' ? 'Your Address to tell the operator:' : language === 'hi' ? 'ऑपरेटर को बताने के लिए आपका पता:' : language === 'ta' ? 'ஆபரேட்டரிடம் கூற வேண்டிய உங்கள் முகவரி:' : 'ఆపరేటర్‌కు చెప్పాల్సిన మీ చిరునామా:'}</span>
          </div>
          <button
            id="btn-read-ambulance-address"
            type="button"
            onClick={handleReadAddress}
            className="p-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-black rounded-xl flex items-center gap-1.5 text-xs sm:text-sm active:scale-95 transition-all shadow-xs cursor-pointer border border-amber-300"
            title="Listen"
            aria-label="Listen address"
          >
            <Volume2 className="w-4 h-4 text-red-700" />
            <span>{language === 'en' ? 'Listen' : language === 'hi' ? 'सुनें' : language === 'ta' ? 'கேளுங்கள்' : 'వినండి'}</span>
          </button>
        </div>

        {/* Large legible address */}
        <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-300">
          <span className="text-xs font-black uppercase tracking-wider text-amber-900 block mb-1">
            📍 {language === 'en' ? 'Your Current Location:' : language === 'hi' ? 'आपका वर्तमान स्थान:' : language === 'ta' ? 'உங்கள் தற்போதைய இடம்:' : 'మీ ప్రస్తుత ప్రాంతం:'}
          </span>
          <p className={`font-black text-stone-950 leading-relaxed ${isLargeFont ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`}>
            {displayAddress || currentAddress}
          </p>
        </div>

        {/* Clear senior guidance bullet points */}
        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1.5 text-xs sm:text-sm text-stone-700 font-bold">
          <p className="font-black text-stone-900 text-sm flex items-center gap-1">
            <span>💡</span>
            <span>{language === 'en' ? 'Tell these 3 things on the phone:' : language === 'hi' ? 'फोन पर बात करते समय ये 3 बातें बताएं:' : language === 'ta' ? 'போனில் பேசும்போது இந்த 3 விஷயங்களைக் கூறவும்:' : 'ఫోన్‌లో మాట్లాడేటప్పుడు ఈ 3 విషయాలు చెప్పండి:'}</span>
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-stone-800">
            <li><strong>{language === 'en' ? '1. Address & Landmark:' : language === 'hi' ? '1. पता और लैंडमार्क:' : language === 'ta' ? '1. முகவரி & அடையாளம்:' : '1. చిరునామా & సమీప గుర్తు:'}</strong> {language === 'en' ? 'Give the address above or nearby temple/shop/school.' : language === 'hi' ? 'ऊपर दिया गया पता या पास का मंदिर/दुकान/स्कूल का नाम बताएं।' : language === 'ta' ? 'மேலே உள்ள முகவரி அல்லது அருகிலுள்ள கோயில்/கடை/பள்ளி பெயரைச் சொல்லுங்கள்.' : 'పైన ఉన్న చిరునామా లేదా దగ్గర్లోని గుడి/దుకాణం/స్కూల్ పేరు చెప్పండి.'}</li>
            <li><strong>{language === 'en' ? '2. Patient Condition:' : language === 'hi' ? '2. मरीज की स्थिति:' : language === 'ta' ? '2. நோயாளி நிலை:' : '2. రోగి పరిస్థితి:'}</strong> {language === 'en' ? 'State heart issue, breathing difficulty, fall, bleeding etc.' : language === 'hi' ? 'दिल का दौरा, सांस की तकलीफ, गिरना या रक्तस्राव की समस्या बताएं।' : language === 'ta' ? 'மாரடைப்பு, மூச்சுத்திணறல், கீழே விழுந்தது போன்றவற்றைத் தெரிவிக்கவும்.' : 'గుండెపోటు, ఊపిరి ఆడకపోవడం, పడిపోవడం లేదా రక్తస్రావం వంటి సమస్యను తెలపండి.'}</li>
            <li><strong>{language === 'en' ? '3. Phone Number:' : language === 'hi' ? '3. आपका फोन नंबर:' : language === 'ta' ? '3. உங்கள் போன் எண்:' : '3. మీ ఫోన్ నంబర్:'}</strong> {language === 'en' ? 'Give phone number so the driver can call back.' : language === 'hi' ? 'एम्बुलेंस चालक के दोबारा संपर्क करने के लिए नंबर दें।' : language === 'ta' ? 'ஆம்புலன்ஸ் ஓட்டுநர் திரும்ப அழைக்க போன் எண்ணைத் தரவும்.' : 'అంబులెన్స్ డ్రైవర్ మీకు తిరిగి ఫోన్ చేయడానికి నంబర్ ఇవ్వండి.'}</li>
          </ul>
        </div>
      </div>

      {/* Secondary Helpline (102 Mother & Child Transport) & Emergency Siren */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 102 Call */}
        <a
          id="btn-call-102"
          href="tel:102"
          onClick={() => {
            playTapSound();
            const speech102 = language === 'en'
              ? 'Calling 102 Ambulance. This is mother and child medical transport service.'
              : language === 'hi'
              ? '102 एम्बुलेंस को कॉल कर रहे हैं। यह गर्भवती महिलाओं एवं शिशु परिवहन सेवा है।'
              : language === 'ta'
              ? '102 ஆம்புலன்ஸுக்கு அழைக்கப்படுகிறது. இது கர்ப்பிணிப் பெண்கள் மற்றும் குழந்தைகள் மருத்துவ போக்குவரத்து சேவை.'
              : '102 అంబులెన్స్‌కు కాల్ చేస్తున్నారు. ఇది గర్భిణీ స్త్రీలు మరియు శిశు రవాణా సేవ.';
            speakInLanguage(speech102, language);
          }}
          className="p-4 bg-white hover:bg-stone-50 border-2 border-stone-300 rounded-2xl font-bold flex items-center justify-between shadow-sm active:scale-98 transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="bg-blue-100 text-blue-900 text-[11px] font-black px-2 py-0.5 rounded-md">
                {language === 'en' ? 'Mother & Child Care' : language === 'hi' ? 'मातृ एवं शिशु सेवा' : language === 'ta' ? 'தாய் & சேய் சேவை' : 'శిశు & మాతృ సేవ'}
              </span>
            </div>
            <h4 className="font-black text-xl text-stone-900 mt-1">{language === 'en' ? '102 Ambulance' : language === 'hi' ? '102 एम्बुलेंस' : language === 'ta' ? '102 ஆம்புலன்ஸ்' : '102 అంబులెన్స్'}</h4>
            <p className="text-stone-600 text-xs sm:text-sm font-medium">{language === 'en' ? 'Govt Janani Shishu Express Transport' : language === 'hi' ? 'सरकारी जननी शिशु एक्सप्रेस' : language === 'ta' ? 'அரசு தாய் சேய் அவசர ஊர்தி' : 'ప్రభుత్వ జనని శిశు ఎక్స్‌ప్రెస్ రవాణా'}</p>
          </div>
          <div className="p-3.5 bg-red-100 text-red-700 rounded-2xl shrink-0 shadow-xs">
            <Phone className="w-6 h-6" />
          </div>
        </a>

        {/* Siren Alert Toggle */}
        <button
          id="btn-toggle-ambulance-siren"
          type="button"
          onClick={toggleSiren}
          className={`p-4 rounded-2xl font-bold border-2 flex items-center justify-between shadow-sm active:scale-98 transition-colors cursor-pointer ${
            isSirenOn
              ? 'bg-red-600 text-white border-red-700 animate-pulse'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-900 border-stone-300'
          }`}
        >
          <div className="text-left">
            <h4 className="font-black text-xl">
              {isSirenOn 
                ? (language === 'en' ? 'Stop Siren 🛑' : language === 'hi' ? 'साइरन रोकें 🛑' : language === 'ta' ? 'சைரனை நிறுத்து 🛑' : 'సైరన్ ఆపండి 🛑') 
                : (language === 'en' ? 'Emergency Siren 🚨' : language === 'hi' ? 'आपातकालीन साइरन 🚨' : language === 'ta' ? 'அவசர சைரன் 🚨' : 'అత్యవసర సైరన్ 🚨')}
            </h4>
            <p className={`text-xs sm:text-sm font-medium ${isSirenOn ? 'text-red-100' : 'text-stone-600'}`}>
              {language === 'en' ? 'Alert people nearby' : language === 'hi' ? 'आस-पास के लोगों को सतर्क करें' : language === 'ta' ? 'அருகிலுள்ளவர்களை எச்சரிக்கவும்' : 'చుట్టుపక్కల వారిని అప్రమత్తం చేయండి'}
            </p>
          </div>
          <div className={`p-3.5 rounded-2xl shrink-0 ${isSirenOn ? 'bg-white text-red-700' : 'bg-stone-200 text-stone-700'}`}>
            {isSirenOn ? <BellOff className="w-6 h-6" /> : <BellRing className="w-6 h-6" />}
          </div>
        </button>
      </div>

      {/* Bottom Sticky Home Button */}
      <div className="pt-2">
        <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
      </div>
    </div>
  );
};

