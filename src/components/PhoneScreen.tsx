import React, { useState, useEffect } from 'react';
import { HomeButton } from './HomeButton';
import { Phone, Delete, Volume2, Shield, Flame, User, HeartHandshake, PhoneCall, RotateCcw, Check } from 'lucide-react';
import { playTapSound, speakInLanguage } from '../utils/audio';
import { getStoredContacts } from '../utils/storage';
import { getDialableNumber, formatPhoneNumber } from '../utils/countryPhone';
import { useLanguage } from '../utils/i18n';

interface PhoneScreenProps {
  onGoHome: () => void;
  isLargeFont: boolean;
}

export const PhoneScreen: React.FC<PhoneScreenProps> = ({ onGoHome, isLargeFont }) => {
  const { language, t } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState('');
  const contacts = getStoredContacts();

  const digitNames: Record<string, { en: string; hi: string; ta: string; te: string }> = {
    '0': { en: 'Zero', hi: 'शून्य', ta: 'பூஜ்ஜியம்', te: 'సున్నా' },
    '1': { en: 'One', hi: 'एक', ta: 'ஒன்று', te: 'ఒకటి' },
    '2': { en: 'Two', hi: 'दो', ta: 'இரண்டு', te: 'రెండు' },
    '3': { en: 'Three', hi: 'तीन', ta: 'மூன்று', te: 'మూడు' },
    '4': { en: 'Four', hi: 'चार', ta: 'நான்கு', te: 'నాలుగు' },
    '5': { en: 'Five', hi: 'पाँच', ta: 'ஐந்து', te: 'ఐదు' },
    '6': { en: 'Six', hi: 'छह', ta: 'ஆறு', te: 'ఆరు' },
    '7': { en: 'Seven', hi: 'सात', ta: 'ஏழு', te: 'ఏడు' },
    '8': { en: 'Eight', hi: 'आठ', ta: 'எட்டு', te: 'ఎనిమిది' },
    '9': { en: 'Nine', hi: 'नौ', ta: 'ஒன்பது', te: 'తొమ్మిది' },
    '*': { en: 'Star', hi: 'स्टार', ta: 'ஸ்டார்', te: 'స్టార్' },
    '#': { en: 'Hash', hi: 'हैश', ta: 'ஹாஷ்', te: 'హ్యాష్' },
  };

  const getSpokenDigit = (d: string) => {
    const entry = digitNames[d];
    if (!entry) return d;
    return language === 'en' ? entry.en : language === 'hi' ? entry.hi : language === 'ta' ? entry.ta : entry.te;
  };

  const keypad = [
    { num: '1', sub: language === 'te' ? '౧' : language === 'hi' ? '१' : language === 'ta' ? '௧' : '', spoken: getSpokenDigit('1') },
    { num: '2', sub: language === 'te' ? '౨' : language === 'hi' ? '२' : language === 'ta' ? '௨' : 'ABC', spoken: getSpokenDigit('2') },
    { num: '3', sub: language === 'te' ? '౩' : language === 'hi' ? '३' : language === 'ta' ? '௩' : 'DEF', spoken: getSpokenDigit('3') },
    { num: '4', sub: language === 'te' ? '౪' : language === 'hi' ? '४' : language === 'ta' ? '௪' : 'GHI', spoken: getSpokenDigit('4') },
    { num: '5', sub: language === 'te' ? '౫' : language === 'hi' ? '५' : language === 'ta' ? '௫' : 'JKL', spoken: getSpokenDigit('5') },
    { num: '6', sub: language === 'te' ? '౬' : language === 'hi' ? '६' : language === 'ta' ? '௬' : 'MNO', spoken: getSpokenDigit('6') },
    { num: '7', sub: language === 'te' ? '౭' : language === 'hi' ? '७' : language === 'ta' ? '௭' : 'PQRS', spoken: getSpokenDigit('7') },
    { num: '8', sub: language === 'te' ? '౮' : language === 'hi' ? '८' : language === 'ta' ? '௮' : 'TUV', spoken: getSpokenDigit('8') },
    { num: '9', sub: language === 'te' ? '౯' : language === 'hi' ? '९' : language === 'ta' ? '௯' : 'WXYZ', spoken: getSpokenDigit('9') },
    { num: '*', sub: '*', spoken: getSpokenDigit('*') },
    { num: '0', sub: language === 'te' ? '౦' : language === 'hi' ? '०' : language === 'ta' ? '௦' : '+', spoken: getSpokenDigit('0') },
    { num: '#', sub: '#', spoken: getSpokenDigit('#') },
  ];

  // Automatic voice readout on screen mount
  useEffect(() => {
    const welcome = language === 'en'
      ? 'Phone Dialer page. Big keypad for easy calling. Tap numbers below, then tap the green Call button. Police 100, Fire 101, and Family contacts are ready below.'
      : language === 'hi'
      ? 'फोन डायलर पेज। आसान कॉलिंग के लिए बड़ा कीपैड। नीचे नंबर दबाएं और हरा कॉल बटन दबाएं। पुलिस 100, फायर 101 और परिवार के संपर्क नीचे तैयार हैं।'
      : language === 'ta'
      ? 'தொலைபேசி டயலர் பக்கம். எளிய அழைப்பிற்கு பெரிய எண்கள். கீழே எண்களைத் தட்டி பச்சை பொத்தானை அழுத்தவும். காவல்துறை 100, தீயணைப்பு 101 தயாராக உள்ளன.'
      : 'ఫోన్ డయలర్ పేజీ. పెద్ద నంబర్లతో ఫోన్ చేయవచ్చు. కింద ఉన్న కీప్యాడ్‌లో నంబర్లను తాకండి. తర్వాత పెద్ద ఆకుపచ్చ కాల్ చేయండి బటన్ నొక్కండి. పోలీస్ 100, ఫైర్ 101, మరియు కుటుంబ సభ్యుల నంబర్లు కింద సిద్ధంగా ఉన్నాయి.';
    speakInLanguage(welcome, language, { delayMs: 400 });
  }, [language]);

  const handleKeyPress = (num: string, spoken?: string) => {
    playTapSound();
    setPhoneNumber((prev) => prev + num);
    if (spoken) {
      speakInLanguage(spoken, language);
    }
  };

  const handleBackspace = () => {
    playTapSound();
    setPhoneNumber((prev) => prev.slice(0, -1));
    const bsSpeech = language === 'en' ? 'Digit removed' : language === 'hi' ? 'एक अंक हटाया गया' : language === 'ta' ? 'ஒரு எண் நீக்கப்பட்டது' : 'ఒక అంకె తొలగించబడింది';
    speakInLanguage(bsSpeech, language);
  };

  const handleClear = () => {
    playTapSound();
    setPhoneNumber('');
    const clrSpeech = language === 'en' ? 'Number cleared' : language === 'hi' ? 'नंबर पूरी तरह हटाया गया' : language === 'ta' ? 'எண் அழிக்கப்பட்டது' : 'నంబర్ పూర్తిగా తొలగించబడింది';
    speakInLanguage(clrSpeech, language);
  };

  const handleReadNumber = () => {
    playTapSound();
    if (!phoneNumber) {
      const emptySpeech = language === 'en' ? 'No number entered yet. Please tap digits below.' : language === 'hi' ? 'अभी कोई नंबर दर्ज नहीं किया गया। नीचे नंबर दबाएं।' : language === 'ta' ? 'எண் எதுவும் தட்டச்சு செய்யப்படவில்லை. எண்களைத் தட்டவும்.' : 'ఇంకా నంబర్ టైప్ చేయలేదు. కింద ఉన్న నంబర్లను నొక్కండి.';
      speakInLanguage(emptySpeech, language);
      return;
    }
    const spokenDigits = phoneNumber
      .split('')
      .map((d) => getSpokenDigit(d))
      .join('. ');
    const readSpeech = language === 'en'
      ? `Entered number: ${spokenDigits}`
      : language === 'hi'
      ? `दर्ज नंबर: ${spokenDigits}`
      : language === 'ta'
      ? `பதிவு செய்த எண்: ${spokenDigits}`
      : `మీరు నమోదు చేసిన నంబర్: ${spokenDigits}.`;
    speakInLanguage(readSpeech, language);
  };

  const handleCall = () => {
    if (!phoneNumber) {
      playTapSound();
      const emptySpeech = language === 'en' ? 'Please dial a phone number using keypad below.' : language === 'hi' ? 'कृपया नीचे दिए गए कीपैड से नंबर डायल करें।' : language === 'ta' ? 'தயவுசெய்து கீபேட் மூலம் தொலைபேசி எண்ணை அழுத்தவும்.' : 'దయచేసి కింద ఉన్న కీప్యాడ్ ద్వారా ఫోన్ నంబర్ నొక్కండి';
      speakInLanguage(emptySpeech, language);
      return;
    }
    playTapSound();
    const callSpeech = language === 'en'
      ? `Calling ${phoneNumber}. Please speak.`
      : language === 'hi'
      ? `${phoneNumber} को कॉल कर रहे हैं। बात करें।`
      : language === 'ta'
      ? `${phoneNumber} எண்ணிற்கு அழைக்கப்படுகிறது. பேசவும்.`
      : `${phoneNumber} కు కాల్ కలుపుతున్నాం. మాట్లాడండి.`;
    speakInLanguage(callSpeech, language);
    window.location.href = `tel:${phoneNumber}`;
  };

  const handleVoiceGuide = () => {
    playTapSound();
    const guideSpeech = language === 'en'
      ? 'Phone Call page. Tap large digits below, then tap the green Call button. Emergency and family contacts are ready below.'
      : language === 'hi'
      ? 'फोन कॉल पेज। नीचे दिए गए बड़े कीपैड से नंबर दबाएं, फिर हरा कॉल बटन दबाएं। आपातकालीन और परिवार संपर्क नीचे तैयार हैं।'
      : language === 'ta'
      ? 'தொலைபேசி அழைப்பு பக்கம். கீழே உள்ள பெரிய எண்களை அழுத்தி பின் பச்சை பொத்தானை அழுத்தவும்.'
      : 'ఫోన్ చేయాలి పేజీ. కింద ఉన్న పెద్ద నంబర్ల కీప్యాడ్ ద్వారా నంబర్ నొక్కి, ఆకుపచ్చ రంగులో ఉన్న కాల్ చేయండి బటన్ నొక్కండి. పోలీస్ 100, ఫైర్ 101 మరియు కుటుంబ సభ్యుల నంబర్లు కింద సిద్ధంగా ఉన్నాయి.';
    speakInLanguage(guideSpeech, language);
  };

  return (
    <div className="p-3 sm:p-5 max-w-2xl mx-auto space-y-4 pb-12">
      {/* Top Bar with Home and Speech Guide */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
        </div>
        <button
          id="phone-voice-guide-btn"
          onClick={handleVoiceGuide}
          type="button"
          className="p-3.5 bg-emerald-100 text-emerald-950 hover:bg-emerald-200 rounded-2xl border-2 border-emerald-300 font-bold active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          title={language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'సహాయక స్వరం (వాయిస్ గైడ్)'}
          aria-label={language === 'en' ? 'Listen to Voice Guide' : language === 'hi' ? 'आवाज़ सहायता सुनें' : language === 'ta' ? 'குரல் உதவி கேளுங்கள்' : 'సహాయక స్వరం వినండి'}
        >
          <Volume2 className="w-7 h-7 text-emerald-900" />
          <span className="hidden sm:inline text-xs font-black">{language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'వాయిస్ సహాయం'}</span>
        </button>
      </div>

      {/* Screen Title Card */}
      <div 
        id="phone-title-card"
        className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white p-4 sm:p-5 rounded-2xl shadow-lg border-3 border-emerald-800 flex items-center gap-4"
      >
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-white/30">
          <Phone className="w-10 h-10 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-black text-white mb-1">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>{t('phoneTitle')}</span>
          </div>
          <h2 className={`font-black tracking-tight ${isLargeFont ? 'text-3xl' : 'text-2xl'}`}>
            📞 {t('phoneTitle')}
          </h2>
          <p className="font-semibold text-emerald-100 text-xs sm:text-sm mt-0.5">
            {t('phoneSub')}
          </p>
        </div>
      </div>

      {/* Number Display Box with Read-Aloud & Clear Tools */}
      <div 
        id="phone-number-display-box"
        className="bg-white p-4 sm:p-5 rounded-2xl border-3 border-stone-300 shadow-inner space-y-2"
      >
        <div className="flex items-center justify-between text-xs font-black text-stone-500 uppercase tracking-wider">
          <span>{t('phoneEnterNumber')}:</span>
          {phoneNumber && (
            <button
              id="btn-read-phone-number"
              type="button"
              onClick={handleReadNumber}
              className="text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer font-bold border border-emerald-200"
              title="Speak"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t('voiceOn')}</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 min-h-[58px]">
          <div className="flex-1 overflow-x-auto py-1">
            <p
              id="phone-number-value"
              className={`font-black tracking-wider text-stone-900 font-mono select-all ${
                isLargeFont ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
              }`}
            >
              {phoneNumber || (
                <span className="text-stone-400 font-normal font-sans text-lg sm:text-xl">
                  {t('phoneEnterNumber')}...
                </span>
              )}
            </p>
          </div>

          {/* Action buttons on input: Delete single digit & Clear all */}
          {phoneNumber && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id="btn-backspace-digit"
                type="button"
                onClick={handleBackspace}
                className="p-3 bg-stone-100 hover:bg-stone-200 active:scale-95 rounded-xl text-stone-700 font-bold border border-stone-300 transition-all cursor-pointer"
                title={t('btnClear')}
                aria-label={t('btnClear')}
              >
                <Delete className="w-6 h-6 text-stone-800" />
              </button>
              <button
                id="btn-clear-all-digits"
                type="button"
                onClick={handleClear}
                className="py-2.5 px-3 bg-rose-100 hover:bg-rose-200 active:scale-95 rounded-xl text-rose-900 font-black text-sm border border-rose-300 transition-all cursor-pointer"
                title={t('btnClear')}
              >
                {t('btnClear')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Large Senior-Friendly Keypad Box */}
      <div 
        id="phone-keypad-box"
        className="bg-stone-100 p-3 sm:p-4 rounded-3xl border-3 border-stone-300 shadow-sm space-y-3"
      >
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
          {keypad.map((k) => (
            <button
              key={k.num}
              id={`keypad-btn-${k.num}`}
              type="button"
              onClick={() => handleKeyPress(k.num, k.spoken)}
              className="h-20 sm:h-24 bg-white hover:bg-emerald-50 active:bg-emerald-200 border-2 border-stone-300 hover:border-emerald-500 rounded-2xl shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer select-none"
              aria-label={`Digit ${k.num}`}
            >
              <span className="text-3xl sm:text-4xl font-black text-stone-900 leading-none">
                {k.num}
              </span>
              {k.sub && (
                <span className="text-xs font-bold text-stone-500 mt-1">
                  {k.sub}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* VERY LARGE "CALL" ACTION BUTTON */}
      <div id="phone-call-action-box">
        <button
          id="btn-phone-call"
          type="button"
          onClick={handleCall}
          className="w-full py-5 sm:py-6 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white font-black rounded-3xl shadow-xl flex items-center justify-center gap-4 text-2xl sm:text-3xl lg:text-4xl border-3 border-emerald-500 transition-all cursor-pointer"
          aria-label={t('phoneCallNow')}
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white text-emerald-600 rounded-2xl flex items-center justify-center shadow-md shrink-0">
            <Phone className="w-8 h-8 sm:w-9 sm:h-9 animate-bounce" />
          </div>
          <span className="tracking-wide">{t('phoneCallNow')}</span>
        </button>
        <p className="text-center text-xs sm:text-sm font-bold text-stone-500 mt-1.5">
          {language === 'en' ? '💡 Dial number above, then tap the green Call button' : language === 'hi' ? '💡 नंबर डायल करने के बाद ऊपर दिए गए हरे बटन को दबाएँ' : language === 'ta' ? '💡 எண்ணைத் தட்டச்சு செய்த பின் மேலே உள்ள பச்சை பொத்தானை அழுத்தவும்' : '💡 నంబర్ డయల్ చేసిన తర్వాత పై ఆకుపచ్చ బటన్ నొక్కండి'}
        </p>
      </div>

      {/* Speed Dial / Important Emergency Numbers (Preserved Feature) */}
      <div 
        id="phone-quick-dial-box"
        className="bg-white p-4 rounded-2xl border-2 border-stone-200 space-y-3 shadow-xs"
      >
        <div className="flex items-center justify-between border-b pb-2 border-stone-100">
          <h4 className="font-black text-stone-900 text-base sm:text-lg flex items-center gap-2">
            <span>⚡ {language === 'en' ? 'Speed Dial (Important Numbers):' : language === 'hi' ? 'त्वरित कॉल (महत्वपूर्ण नंबर):' : language === 'ta' ? 'விரைவு அழைப்புகள் (முக்கிய எண்கள்):' : 'శీఘ్ర కాల్స్ (ముఖ్యమైన నంబర్లు):'}</span>
          </h4>
          <span className="text-xs font-bold text-stone-500">{language === 'en' ? '1-Tap Call' : language === 'hi' ? 'एक टैप में कॉल' : language === 'ta' ? 'ஒரே தொடுதல்' : 'ఒకే నొక్కుతో కాల్'}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Elderline 14567 */}
          <a
            id="btn-speed-elderline"
            href="tel:14567"
            onClick={() => {
              playTapSound();
              const sp = language === 'en' ? 'Calling Elderline 14567' : language === 'hi' ? 'एल्डरलाइन 14567 पर कॉल कर रहे हैं' : language === 'ta' ? 'எல்டர்லைன் 14567 ஐ அழைக்கிறீர்கள்' : 'ఎల్డర్‌లైన్ 14567 కు కాల్ చేస్తున్నారు';
              speakInLanguage(sp, language);
            }}
            className="p-3 bg-teal-50 hover:bg-teal-100 border-2 border-teal-300 rounded-2xl flex items-center justify-between transition-all cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-xs">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-black text-teal-950 text-sm sm:text-base">{language === 'en' ? 'Elder Helpline (14567)' : language === 'hi' ? 'वृद्ध हेल्पलाइन (14567)' : language === 'ta' ? 'முதியோர் உதவி எண் (14567)' : 'వృద్ధుల హెల్ప్‌లైన్ (14567)'}</h5>
                <p className="text-xs font-bold text-teal-700">{language === 'en' ? 'Elderline Free Support' : language === 'hi' ? 'Elderline मुफ्त सहायता' : language === 'ta' ? 'எல்டர்லைன் இலவச உதவி' : 'Elderline ఉచిత సహాయం'}</p>
              </div>
            </div>
            <Phone className="w-5 h-5 text-teal-800 shrink-0" />
          </a>

          {/* Police 112 */}
          <a
            id="btn-speed-police"
            href="tel:112"
            onClick={() => {
              playTapSound();
              const sp = language === 'en' ? 'Calling Police 112' : language === 'hi' ? 'पुलिस 112 पर कॉल कर रहे हैं' : language === 'ta' ? 'காவல்துறை 112 ஐ அழைக்கிறீர்கள்' : 'పోలీస్ 112 కు కాల్ చేస్తున్నారు';
              speakInLanguage(sp, language);
            }}
            className="p-3 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 rounded-2xl flex items-center justify-between transition-all cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-black text-blue-950 text-sm sm:text-base">{language === 'en' ? 'Police (112 / 100)' : language === 'hi' ? 'पुलिस (112 / 100)' : language === 'ta' ? 'காவல்துறை (112 / 100)' : 'పోలీస్ (112 / 100)'}</h5>
                <p className="text-xs font-bold text-blue-700">{language === 'en' ? 'Security & Emergency' : language === 'hi' ? 'सुरक्षा एवं आपातकाल' : language === 'ta' ? 'பாதுகாப்பு & அவசரம்' : 'రక్షణ & అత్యవసరం'}</p>
              </div>
            </div>
            <Phone className="w-5 h-5 text-blue-800 shrink-0" />
          </a>

          {/* Fire 101 */}
          <a
            id="btn-speed-fire"
            href="tel:101"
            onClick={() => {
              playTapSound();
              const sp = language === 'en' ? 'Calling Fire Station 101' : language === 'hi' ? 'दमकल सेवा 101 पर कॉल कर रहे हैं' : language === 'ta' ? 'தீயணைப்பு 101 ஐ அழைக்கிறீர்கள்' : 'ఫైర్ 101 కు కాల్ చేస్తున్నారు';
              speakInLanguage(sp, language);
            }}
            className="p-3 bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 rounded-2xl flex items-center justify-between transition-all cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-xs">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-black text-amber-950 text-sm sm:text-base">{language === 'en' ? 'Fire Brigade (101)' : language === 'hi' ? 'दमकल सेवा (101)' : language === 'ta' ? 'தீயணைப்பு படை (101)' : 'అగ్నిమాపక దళం (101)'}</h5>
                <p className="text-xs font-bold text-amber-700">{language === 'en' ? 'Fire Station Service' : language === 'hi' ? 'फायर स्टेशन सेवा' : language === 'ta' ? 'தீயணைப்பு நிலையம்' : 'ఫైర్ స్టేషన్ సర్వీస్'}</p>
              </div>
            </div>
            <Phone className="w-5 h-5 text-amber-800 shrink-0" />
          </a>

          {/* Quick Family Call first contact */}
          {contacts[0] && (
            <a
              id="btn-speed-family"
              href={`tel:${getDialableNumber(contacts[0].phone)}`}
              onClick={() => {
                 playTapSound();
                 const sp = language === 'en' ? `Calling ${contacts[0].name}` : language === 'hi' ? `${contacts[0].name} को कॉल कर रहे हैं` : language === 'ta' ? `${contacts[0].name} அவர்களுக்கு அழைக்கப்படுகிறது` : `${contacts[0].name} గారికి కాల్ చేస్తున్నారు`;
                 speakInLanguage(sp, language);
              }}
              className="p-3 bg-purple-50 hover:bg-purple-100 border-2 border-purple-300 rounded-2xl flex items-center justify-between transition-all cursor-pointer active:scale-98"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-xs">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-black text-purple-950 text-sm sm:text-base">{contacts[0].name}</h5>
                  <p className="text-xs font-bold text-purple-700">{formatPhoneNumber(contacts[0].phone, true)}</p>
                </div>
              </div>
              <Phone className="w-5 h-5 text-purple-800 shrink-0" />
            </a>
          )}
        </div>
      </div>

      {/* Bottom Sticky Home Button */}
      <div className="pt-2">
        <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
      </div>
    </div>
  );
};

