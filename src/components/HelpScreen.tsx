import React, { useState, useEffect } from 'react';
import { HomeButton } from './HomeButton';
import { 
  HeartHandshake, 
  Pill, 
  Utensils, 
  Hospital, 
  Users, 
  Car, 
  HelpCircle, 
  Phone, 
  MessageCircle, 
  Volume2, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { playTapSound, speakInLanguage } from '../utils/audio';
import { getStoredContacts } from '../utils/storage';
import {
  getDialableNumber,
  formatPhoneNumber,
  getWhatsAppNumber,
} from '../utils/countryPhone';
import { useLanguage } from '../utils/i18n';

interface HelpScreenProps {
  onGoHome: () => void;
  isLargeFont: boolean;
  currentAddress?: string;
  onNavigateToAuto?: () => void;
}

interface HelpCategory {
  id: string;
  name: string;
  categoryNameEn: string;
  subtitle: string;
  emoji: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultMessage: string;
  badgeColor: string;
}

export const HelpScreen: React.FC<HelpScreenProps> = ({
  onGoHome,
  isLargeFont,
  currentAddress = 'నా ఇంటి వద్ద',
  onNavigateToAuto,
}) => {
  const { language, t } = useLanguage();

  const categories: HelpCategory[] = [
    {
      id: 'auto',
      name: language === 'en' ? 'Auto / Cab Ride' : language === 'hi' ? 'ऑटो / कैब यात्रा' : language === 'ta' ? 'ஆட்டோ / வாடகை வண்டி' : 'ఆటో ప్రయాణం (Auto)',
      categoryNameEn: 'Auto / Ride',
      subtitle: language === 'en' ? 'Auto to go outside or return home' : language === 'hi' ? 'बाहर जाने या घर लौटने के लिए ऑटो' : language === 'ta' ? 'வெளியே செல்ல அல்லது வீட்டிற்கு வர ஆட்டோ' : 'బయటకు వెళ్లడానికి లేదా ఇంటికి రావడానికి ఆటో',
      emoji: '🛺',
      icon: Car,
      defaultMessage: language === 'en' ? 'Hello! I need an auto/ride urgently. Please call me or send an auto.' : language === 'hi' ? 'नमस्ते! मुझे तत्काल एक ऑटो चाहिए। कृपया मुझे कॉल करें।' : language === 'ta' ? 'வணக்கம்! எனக்கு உடனடியாக ஒரு ஆட்டோ தேவை. தயவுசெய்து அழைக்கவும்.' : 'నమస్కారం! నాకు అత్యవసరంగా ఒక ఆటో కావాలి. దయచేసి నాకు కాల్ చేయండి లేదా ఆటో పంపించండి.',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    {
      id: 'hospital',
      name: language === 'en' ? 'Hospital / Clinic' : language === 'hi' ? 'अस्पताल (Hospital)' : language === 'ta' ? 'மருத்துவமனை (Hospital)' : 'ఆసుపత్రి (Hospital)',
      categoryNameEn: 'Hospital / Clinic',
      subtitle: language === 'en' ? 'Companion to visit doctor or clinic' : language === 'hi' ? 'डॉक्टर जांच या अस्पताल जाने के लिए साथ' : language === 'ta' ? 'மருத்துவர் பரிசோதனைக்கு செல்ல துணை' : 'డాక్టర్ పరీక్ష లేదా ఆసుపత్రికి వెళ్లడానికి తోడు',
      emoji: '🏥',
      icon: Hospital,
      defaultMessage: language === 'en' ? 'Hello! I need to visit the hospital/doctor. Please accompany me or call.' : language === 'hi' ? 'नमस्ते! मुझे अस्पताल या डॉक्टर के पास जाना है। कृपया साथ आएं या कॉल करें।' : language === 'ta' ? 'வணக்கம்! நான் மருத்துவமனை செல்ல வேண்டும். தயவுசெய்து துணையாக வரவும்.' : 'నమస్కారం! నేను ఆసుపత్రి లేదా డాక్టర్ వద్దకు వెళ్ళాలి. దయచేసి నాకు తోడు రండి లేదా కాల్ చేయండి.',
      badgeColor: 'bg-red-100 text-red-900 border-red-300',
    },
    {
      id: 'medicine',
      name: language === 'en' ? 'Need Medicines' : language === 'hi' ? 'दवाइयां चाहिए (Medicine)' : language === 'ta' ? 'மருந்துகள் தேவை (Medicine)' : 'మందులు కావాలి (Medicine)',
      categoryNameEn: 'Medicine',
      subtitle: language === 'en' ? 'Get pills or tablets from pharmacy' : language === 'hi' ? 'मेडिकल स्टोर से दवाइयां लानी हैं' : language === 'ta' ? 'மருந்தகத்தில் இருந்து மருந்துகள் வாங்க வேண்டும்' : 'మెడికల్ షాప్ నుండి మాత్రలు, మందులు తెప్పించాలి',
      emoji: '💊',
      icon: Pill,
      defaultMessage: language === 'en' ? 'Hello! My medications have run out. Please help me get them.' : language === 'hi' ? 'नमस्ते! मेरी दवाइयां समाप्त हो गई हैं। कृपया मदद करें।' : language === 'ta' ? 'வணக்கம்! எனது மருந்துகள் தீர்ந்துவிட்டன. தயவுசெய்து உதவவும்.' : 'నమస్కారం! నా మందుల మాత్రలు అయిపోయాయి, మెడికల్ షాప్ నుండి తేవాలి. దయచేసి సహాయం చేయండి.',
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
    },
    {
      id: 'food',
      name: language === 'en' ? 'Food & Groceries' : language === 'hi' ? 'भोजन एवं राशन (Food)' : language === 'ta' ? 'உணவு & மளிகை (Food)' : 'ఆహారం & సరుకులు (Food)',
      categoryNameEn: 'Food / Groceries',
      subtitle: language === 'en' ? 'Meals, milk, tiffin or daily groceries' : language === 'hi' ? 'भोजन, दूध, टिफिन या किराना सामान' : language === 'ta' ? 'உணவு, பால், டிபன் அல்லது சமையல் தேவைகள்' : 'భోజనం, పాలు, టిఫిన్ లేదా వంట నిత్యావసరాలు',
      emoji: '🍲',
      icon: Utensils,
      defaultMessage: language === 'en' ? 'Hello! I need food or milk/groceries. Please help.' : language === 'hi' ? 'नमस्ते! मुझे भोजन या दूध/सामान चाहिए। कृपया मदद करें।' : language === 'ta' ? 'வணக்கம்! எனக்கு உணவு அல்லது பால்/மளிகை தேவை. உதவவும்.' : 'నమస్కారం! నాకు భోజనం లేదా పాలు/సరుకులు కావాలి. దయచేసి సహాయం చేయండి.',
      badgeColor: 'bg-orange-100 text-orange-900 border-orange-300',
    },
    {
      id: 'family',
      name: language === 'en' ? 'Family Help' : language === 'hi' ? 'पारिवारिक सहायता (Family)' : language === 'ta' ? 'குடும்ப உதவி (Family)' : 'కుటుంబ సహాయం (Family)',
      categoryNameEn: 'Family Help',
      subtitle: language === 'en' ? 'To talk with family or need company' : language === 'hi' ? 'परिवार से बात करने या साथ के लिए' : language === 'ta' ? 'குடும்பத்தினருடன் பேச அல்லது துணைக்கு' : 'కుటుంబ సభ్యులతో మాట్లాడటానికి లేదా తోడు కోసం',
      emoji: '👨‍👩‍👧',
      icon: Users,
      defaultMessage: language === 'en' ? 'Hello! I want to talk to you or need your company. Please call me.' : language === 'hi' ? 'नमस्ते! मुझे आपसे बात करनी है या साथ चाहिए। कृपया कॉल करें।' : language === 'ta' ? 'வணக்கம்! நான் உங்களுடன் பேச வேண்டும். தயவுசெய்து அழைக்கவும்.' : 'నమస్కారం! నేను మీతో మాట్లాడాలి లేదా నాకు తోడు కావాలి. దయచేసి నాకు వెంటనే కాల్ చేయండి.',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    },
    {
      id: 'other',
      name: language === 'en' ? 'Other Help' : language === 'hi' ? 'अन्य सहायता (Other Help)' : language === 'ta' ? 'இதர உதவி (Other Help)' : 'ఇతర సహాయం (Other Help)',
      categoryNameEn: 'Other Help',
      subtitle: language === 'en' ? 'Electrician/plumber repair, bank work' : language === 'hi' ? 'बिजली/प्लंबर रिपेयर, बैंक या अन्य काम' : language === 'ta' ? 'மின்/குழாய் பழுது, வங்கி வேலை' : 'కరెంట్/ప్లంబర్ రిపేరు, బ్యాంక్ లేదా ఇతర పనులు',
      emoji: '🤝',
      icon: HelpCircle,
      defaultMessage: language === 'en' ? 'Hello! I need assistance with a household task. Please contact me.' : language === 'hi' ? 'नमस्ते! मुझे घर के किसी काम में मदद चाहिए। कृपया संपर्क करें।' : language === 'ta' ? 'வணக்கம்! எனக்கு வீட்டில் ஒரு வேலையில் உதவி தேவை. தொடர்புகொள்ளவும்.' : 'నమస్కారం! నాకు ఇంట్లో ఒక పనిలో సహాయం కావాలి. దయచేసి నన్ను సంప్రదించండి.',
      badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
    },
  ];

  const [selectedCategory, setSelectedCategory] = useState<HelpCategory>(categories[0]);
  const [customNote, setCustomNote] = useState('');
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  const contacts = getStoredContacts();

  // Automatic voice readout on screen mount
  useEffect(() => {
    const welcomeSpeech = language === 'en'
      ? 'I Need Help page. You can request help for ride, hospital, medicines, food, family, or other tasks. Select a category below, then tap Call or WhatsApp.'
      : language === 'hi'
      ? 'मुझे सहायता चाहिए पेज। आप सवारी, अस्पताल, दवाइयां, भोजन, परिवार या अन्य कार्यों के लिए मदद ले सकते हैं। नीचे एक श्रेणी चुनें, फिर कॉल या व्हाट्सएप दबाएं।'
      : language === 'ta'
      ? 'எனக்கு உதவி தேவை பக்கம். சவாரி, மருத்துவமனை, மருந்துகள், உணவு, குடும்பம் அல்லது பிற பணிகளுக்கு உதவி பெறலாம். கீழே ஒரு பிரிவைத் தேர்ந்தெடுக்கவும், பின் அழைப்பு அல்லது வாட்ஸ்அப் தட்டவும்.'
      : 'నాకు సహాయం కావాలి పేజీ. ఆటో ప్రయాణం, ఆసుపత్రి, మందులు, భోజనం, కుటుంబం మరియు ఇతర పనుల కోసం సహాయం పొందవచ్చు. కింద ఉన్న సహాయ విభాగాలలో ఒకదాన్ని ఎంచుకోండి. తర్వాత కాల్ చేయండి లేదా వాట్సాప్ బటన్ నొక్కండి.';
    speakInLanguage(welcomeSpeech, language, { delayMs: 400 });
  }, [language]);

  const handleSelectCategory = (cat: HelpCategory) => {
    playTapSound();
    setSelectedCategory(cat);
    const catSpeech = language === 'en'
      ? `Selected ${cat.name}. ${cat.subtitle}. Tap the Call button below for help.`
      : language === 'hi'
      ? `${cat.name} चुना गया। ${cat.subtitle}। मदद के लिए नीचे दिए गए कॉल बटन को दबाएँ।`
      : language === 'ta'
      ? `${cat.name} தேர்ந்தெடுக்கப்பட்டது. ${cat.subtitle}. உதவிக்கு கீழே உள்ள அழைப்பு பொத்தானைத் தட்டவும்.`
      : `${cat.name} ఎంచుకున్నారు. ${cat.subtitle}. సహాయం కోసం కింద ఉన్న కాల్ బటన్ నొక్కండి.`;
    speakInLanguage(catSpeech, language);
  };

  const handleCallContact = (phone: string, name: string) => {
    playTapSound();
    const callSpeech = language === 'en'
      ? `Calling ${name}. Please speak.`
      : language === 'hi'
      ? `${name} को कॉल जोड़ रहे हैं। कृपया बात करें।`
      : language === 'ta'
      ? `${name} அவர்களுக்கு அழைக்கப்படுகிறது. பேசவும்.`
      : `${name} గారికి ఫోన్ కలుపుతున్నాం. మాట్లాడండి.`;
    speakInLanguage(callSpeech, language);
    window.location.href = `tel:${getDialableNumber(phone)}`;
  };

  const handleSendWhatsAppHelp = (phone: string, name: string) => {
    playTapSound();
    const noteText = customNote.trim() ? `\n${language === 'en' ? 'Details' : language === 'hi' ? 'विवरण' : language === 'ta' ? 'விவரம்' : 'వివరాలు'}: ${customNote.trim()}` : '';
    const greetingWord = language === 'en' ? 'Hello!' : language === 'hi' ? 'नमस्ते!' : language === 'ta' ? 'வணக்கம்!' : 'నమస్కారం!';
    const catPrefix = language === 'en' ? 'Help Category' : language === 'hi' ? 'सहायता श्रेणी' : language === 'ta' ? 'உதவி பிரிவு' : 'సహాయ విభాగం';
    const locPrefix = language === 'en' ? '📍 My Current Location' : language === 'hi' ? '📍 मेरा वर्तमान स्थान' : language === 'ta' ? '📍 எனது தற்போதைய இடம்' : '📍 నా ప్రస్తుత లొకేషన్';
    const timePrefix = language === 'en' ? 'Time' : language === 'hi' ? 'समय' : language === 'ta' ? 'நேரம்' : 'సమయం';
    
    const message = encodeURIComponent(
      `${greetingWord}\n${catPrefix}: ${selectedCategory.name}\n${selectedCategory.defaultMessage}${noteText}\n${locPrefix}: ${currentAddress}\n${timePrefix}: ${new Date().toLocaleTimeString()}`
    );
    const waSpeech = language === 'en'
      ? `Sending help message to ${name} via WhatsApp`
      : language === 'hi'
      ? `${name} को व्हाट्सएप पर मदद का संदेश भेजा जा रहा है`
      : language === 'ta'
      ? `${name} அவர்களுக்கு வாட்ஸ்அப்பில் உதவி செய்தி அனுப்பப்படுகிறது`
      : `${name} గారికి సహాయం కోరుతూ సందేశం పంపుతున్నారు`;
    speakInLanguage(waSpeech, language);
    setRequestStatus(waSpeech);
    const waNumber = getWhatsAppNumber(phone);
    window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
  };

  const handleVoiceGuide = () => {
    playTapSound();
    const guideSpeech = language === 'en'
      ? `I Need Help page. Current category: ${selectedCategory.name}. Tap buttons below to call family members or auto driver for assistance.`
      : language === 'hi'
      ? `मुझे सहायता चाहिए पेज। वर्तमान श्रेणी: ${selectedCategory.name}। परिवार या ऑटो ड्राइवर को कॉल करने के लिए नीचे दिए गए बटन दबाएं।`
      : language === 'ta'
      ? `எனக்கு உதவி தேவை பக்கம். தற்போதைய பிரிவு: ${selectedCategory.name}. குடும்பத்தினர் அல்லது ஆட்டோ ஓட்டுநரை அழைக்க கீழே உள்ள பொத்தான்களை அழுத்தவும்.`
      : `నాకు సహాయం కావాలి పేజీ. ప్రస్తుత విభాగం: ${selectedCategory.name}. కింద ఉన్న బటన్ల ద్వారా కుటుంబ సభ్యులకు లేదా ఆటో డ్రైవర్‌కు కాల్ చేసి సహాయం పొందవచ్చు.`;
    speakInLanguage(guideSpeech, language);
  };

  return (
    <div className="p-3 sm:p-5 max-w-2xl mx-auto space-y-4 pb-12">
      {/* Top Bar with Home and Speech */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
        </div>
        <button
          id="help-voice-guide-btn"
          onClick={handleVoiceGuide}
          type="button"
          className="p-3.5 bg-teal-100 text-teal-950 hover:bg-teal-200 rounded-2xl border-2 border-teal-300 font-bold active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          title={language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'సహాయక స్వరం (వాయిస్ గైడ్)'}
          aria-label={language === 'en' ? 'Listen to Voice Guide' : language === 'hi' ? 'आवाज़ सहायता सुनें' : language === 'ta' ? 'குரல் உதவி கேளுங்கள்' : 'సహాయక స్వరం వినండి'}
        >
          <Volume2 className="w-7 h-7 text-teal-900" />
          <span className="hidden sm:inline text-xs font-black">{language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'వాయిస్ సహాయం'}</span>
        </button>
      </div>

      {/* Screen Title Card */}
      <div 
        id="help-title-card"
        className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 text-white p-4 sm:p-5 rounded-2xl shadow-lg border-3 border-teal-900 flex items-center gap-4"
      >
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-white/30">
          <HeartHandshake className="w-10 h-10 text-white" />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-black text-white mb-1">
            <span>{language === 'en' ? 'Daily Living Needs & Companion Care' : language === 'hi' ? 'दैनिक जीवन आवश्यकताएं एवं सहयोग' : language === 'ta' ? 'அன்றாட வாழ்க்கை தேவைகள் & உதவி' : 'నిత్య జీవిత అవసరాలు & రోజువారీ చేదోడు'}</span>
          </div>
          <h2 className={`font-black tracking-tight ${isLargeFont ? 'text-3xl' : 'text-2xl'}`}>
            🤝 {t('homeCardHelpTitle')}
          </h2>
          <p className="font-semibold text-teal-100 text-xs sm:text-sm mt-0.5">
            {t('homeCardHelpSub')}
          </p>
        </div>
      </div>

      {/* 1. SIMPLE HELP CATEGORIES SELECTION GRID */}
      <div id="help-categories-selection" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className={`font-black text-stone-900 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
            {language === 'en' ? '1. What help do you need? (Select):' : language === 'hi' ? '1. आपको क्या सहायता चाहिए? (चुनें):' : language === 'ta' ? '1. உங்களுக்கு என்ன உதவி தேவை? (தேர்வுசெய்க):' : '1. మీకు ఏ సహాయం కావాలి? (ఎంచుకోండి):'}
          </h3>
          <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
            {language === 'en' ? '6 Categories' : language === 'hi' ? '6 श्रेणियाँ' : language === 'ta' ? '6 பிரிவுகள்' : '6 విభాగాలు'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat) => {
            const isSelected = selectedCategory.id === cat.id;
            return (
              <button
                key={cat.id}
                id={`help-cat-${cat.id}`}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className={`p-4 rounded-3xl border-3 text-left transition-all flex items-start gap-3.5 shadow-sm active:scale-[0.98] cursor-pointer ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50/95 ring-3 ring-teal-500/40 shadow-md scale-[1.01]'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
                aria-pressed={isSelected}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-xs border ${
                  isSelected ? 'bg-teal-600 text-white border-teal-700' : 'bg-stone-100 text-stone-800 border-stone-200'
                }`}>
                  {cat.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-black text-stone-950 text-lg sm:text-xl leading-tight">
                      {cat.name}
                    </h4>
                    {isSelected && (
                      <CheckCircle2 className="w-6 h-6 text-teal-700 shrink-0" />
                    )}
                  </div>
                  <p className="text-stone-600 text-xs sm:text-sm font-semibold mt-1 leading-snug">
                    {cat.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SELECTED CATEGORY DETAILS & OPTIONAL NOTE */}
      <div 
        id="help-active-request-box"
        className="bg-white p-5 rounded-3xl border-3 border-teal-400 shadow-md space-y-4"
      >
        <div className="bg-teal-50/90 p-4 rounded-2xl border-2 border-teal-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-teal-900 uppercase tracking-wider">
              {language === 'en' ? 'Selected Help Category:' : language === 'hi' ? 'चुनी गई सहायता श्रेणी:' : language === 'ta' ? 'தேர்ந்தெடுக்கப்பட்ட உதவி பிரிவு:' : 'ఎంచుకున్న సహాయ విభాగం:'}
            </span>
            <button
              type="button"
              onClick={() => {
                playTapSound();
                const speech = language === 'en'
                  ? `You selected: ${selectedCategory.name}. ${selectedCategory.subtitle}`
                  : language === 'hi'
                  ? `आपने चुना: ${selectedCategory.name}। ${selectedCategory.subtitle}`
                  : language === 'ta'
                  ? `நீங்கள் தேர்வு செய்தது: ${selectedCategory.name}. ${selectedCategory.subtitle}`
                  : `మీరు ఎంచుకున్న సహాయం: ${selectedCategory.name}. ${selectedCategory.subtitle}`;
                speakInLanguage(speech, language);
              }}
              className="text-xs font-bold text-teal-800 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>{language === 'en' ? 'Listen' : language === 'hi' ? 'सुनें' : language === 'ta' ? 'கேளுங்கள்' : 'వినండి'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">{selectedCategory.emoji}</span>
            <div>
              <p className="text-xl sm:text-2xl font-black text-teal-950">
                {selectedCategory.name}
              </p>
              <p className="text-xs sm:text-sm text-stone-600 font-bold">
                {selectedCategory.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Optional Note Box */}
        <div>
          <label htmlFor="input-help-custom-note" className="block text-xs sm:text-sm font-black text-stone-800 mb-1.5">
            {language === 'en' ? '✍️ Add details or notes (Optional):' : language === 'hi' ? '✍️ कोई विशेष विवरण या बात (वैकल्पिक):' : language === 'ta' ? '✍️ கூடுதல் குறிப்பு (விருப்பமானது):' : '✍️ ఇంకా ఏమైనా చెప్పాలా? (ఐచ్ఛికం / Optional Note):'}
          </label>
          <input
            id="input-help-custom-note"
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder={
              language === 'en'
                ? (selectedCategory.id === 'auto'
                    ? 'e.g., Need to go to bus stand or clinic...'
                    : selectedCategory.id === 'medicine'
                    ? 'e.g., Need BP tablets or pain balm...'
                    : selectedCategory.id === 'food'
                    ? 'e.g., Need 2 packets of milk & fruits...'
                    : 'e.g., Please come visit my home for a bit...')
                : language === 'hi'
                ? (selectedCategory.id === 'auto'
                    ? 'उदा: बस स्टैंड या क्लिनिक जाना है...'
                    : selectedCategory.id === 'medicine'
                    ? 'उदा: बीपी की गोलियां लानी हैं...'
                    : selectedCategory.id === 'food'
                    ? 'उदा: 2 पैकेट दूध और फल चाहिए...'
                    : 'उदा: कृपया कुछ समय के लिए घर आएं...')
                : language === 'ta'
                ? (selectedCategory.id === 'auto'
                    ? 'உதா: பேருந்து நிலையம் செல்ல வேண்டும்...'
                    : selectedCategory.id === 'medicine'
                    ? 'உதா: பிபி மாத்திரைகள் தேவை...'
                    : selectedCategory.id === 'food'
                    ? 'உதா: 2 பாக்கெட் பால் & பழங்கள் வேண்டும்...'
                    : 'உதா: சிறிது நேரம் வீட்டிற்கு வரவும்...')
                : (selectedCategory.id === 'auto' 
                    ? 'ఉదా: బస్టాండ్ లేదా గుడికి వెళ్ళాలి...' 
                    : selectedCategory.id === 'medicine'
                    ? 'ఉదా: బీపీ టాబ్లెట్లు 1 అట్ట కావాలి...'
                    : selectedCategory.id === 'food'
                    ? 'ఉదా: 2 ప్యాకెట్ల పాలు మరియు పండ్లు...'
                    : 'ఉదా: దయచేసి కాసేపు మా ఇంటికి రండి...')
            }
            className="w-full p-3.5 border-2 border-stone-300 focus:border-teal-600 focus:outline-hidden rounded-2xl text-base font-bold bg-stone-50 text-stone-900"
          />
        </div>

        {/* 3. WAYS TO REQUEST HELP: DIRECT CALL OR WHATSAPP */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm sm:text-base font-black text-stone-900">
              {language === 'en' ? '2. Who to call or message for help?' : language === 'hi' ? '2. सहायता के लिए किसे कॉल या संदेश भेजें?' : language === 'ta' ? '2. உதவிக்கு யாரை அழைக்க அல்லது செய்தி அனுப்ப வேண்டும்?' : '2. సహాయం కోసం ఎవరికి కాల్ లేదా మెసేజ్ చేయాలి?'}
            </h4>
            <span className="text-xs font-bold text-stone-500">
              {language === 'en' ? '1-Tap' : language === 'hi' ? 'एक टैप' : language === 'ta' ? 'ஒரே தொடுதல்' : 'ఒకే నొక్కుతో'}
            </span>
          </div>

          {/* Special Auto section redirect if Auto category selected */}
          {selectedCategory.id === 'auto' && onNavigateToAuto && (
            <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-300 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛺</span>
                  <div>
                    <h5 className="font-black text-amber-950 text-base">
                      {language === 'en' ? 'Live Auto Network' : language === 'hi' ? 'लाइव ऑटो नेटवर्क' : language === 'ta' ? 'நேரடி ஆட்டோ நெட்வொர்க்' : 'ప్రత్యక్ష ఆటో నెట్‌వర్క్ (Live Autos)'}
                    </h5>
                    <p className="text-xs text-stone-600 font-bold">
                      {language === 'en' ? 'Check available autos nearby you' : language === 'hi' ? 'अपने पास उपलब्ध ऑटो देखें' : language === 'ta' ? 'அருகிலுள்ள ஆட்டோக்களைக் காண்க' : 'మీ దగ్గరలో అందుబాటులో ఉన్న ఆటోలను చూడండి'}
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-300 font-black px-2 py-0.5 rounded-md">
                  {language === 'en' ? 'Auto Map' : language === 'hi' ? 'ऑटो मैप' : language === 'ta' ? 'ஆட்டோ வரைபடம்' : 'ఆటో మ్యాప్'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  onNavigateToAuto();
                }}
                className="w-full py-3.5 px-3 bg-amber-500 hover:bg-amber-600 active:scale-98 text-stone-950 font-black rounded-xl flex items-center justify-center gap-2 text-base shadow-sm cursor-pointer border-2 border-amber-600"
              >
                <Car className="w-5 h-5" />
                <span>🛺 {language === 'en' ? 'Open Nearby Autos Section' : language === 'hi' ? 'समीप के ऑटो सेक्शन खोलें' : language === 'ta' ? 'அருகிலுள்ள ஆட்டோக்கள் பகுதியைத் திறக்கவும்' : 'సమీప ఆటోల విభాగం తెరవండి'}</span>
              </button>
            </div>
          )}

          {/* Saved Family Contacts List */}
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div 
                key={contact.id} 
                id={`help-contact-row-${contact.id}`}
                className="p-3.5 sm:p-4 bg-stone-50 rounded-2xl border-2 border-stone-200 hover:border-teal-300 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg ${contact.avatarColor || 'bg-teal-600'}`}>
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <h5 className="font-black text-stone-900 text-base sm:text-lg leading-tight">
                        {contact.name}
                      </h5>
                      <span className="text-xs font-bold text-stone-500 font-mono">
                        📞 {formatPhoneNumber(contact.phone, true)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full">
                    {contact.relation}
                  </span>
                </div>

                {/* Two large clear buttons for each contact: One-tap Call & One-tap WhatsApp Help */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    id={`btn-help-call-${contact.id}`}
                    type="button"
                    onClick={() => handleCallContact(contact.phone, contact.name)}
                    className="w-full py-3.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-98 text-white font-black rounded-xl shadow-sm flex items-center justify-center gap-2 text-base sm:text-lg transition-all cursor-pointer"
                  >
                    <Phone className="w-5 h-5" />
                    <span>{language === 'en' ? 'Call Now' : language === 'hi' ? 'कॉल करें' : language === 'ta' ? 'அழைக்கவும்' : 'కాల్ చేయండి'}</span>
                  </button>

                  <button
                    id={`btn-help-whatsapp-${contact.id}`}
                    type="button"
                    onClick={() => handleSendWhatsAppHelp(contact.phone, contact.name)}
                    className="w-full py-3.5 px-3 bg-teal-700 hover:bg-teal-800 active:scale-98 text-white font-black rounded-xl shadow-sm flex items-center justify-center gap-2 text-base sm:text-lg transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{language === 'en' ? 'WhatsApp Help' : language === 'hi' ? 'व्हाट्सएप सहायता' : language === 'ta' ? 'வாட்ஸ்அப் உதவி' : 'సహాయం సందేశం (WhatsApp)'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {requestStatus && (
            <div className="p-3 bg-emerald-100 text-emerald-950 font-bold rounded-xl border border-emerald-300 flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>{requestStatus}</span>
            </div>
          )}
        </div>
      </div>

      {/* Elderline National Senior Citizens Free Helpline (14567) - PRESERVED */}
      <div 
        id="elderline-helpline-card"
        className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:p-5 rounded-3xl border-3 border-amber-400 shadow-sm space-y-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-black text-amber-950 text-lg sm:text-xl">
              {language === 'en' ? 'National Elder Helpline (14567)' : language === 'hi' ? 'राष्ट्रीय वृद्ध हेल्पलाइन (14567)' : language === 'ta' ? 'தேசிய முதியோர் உதவி எண் (14567)' : 'వృద్ధుల జాతీయ హెల్ప్‌లైన్ (14567)'}
            </h4>
            <p className="text-stone-700 text-xs sm:text-sm font-bold mt-0.5">
              {language === 'en' ? 'Free Govt support, counselling, care & security' : language === 'hi' ? 'सरकारी मुफ्त सहायता, परामर्श, सहारा एवं सुरक्षा' : language === 'ta' ? 'அரசு இலவச உதவி, ஆலோசனை & பாதுகாப்பு' : 'ప్రభుత్వ ఉచిత సహాయం, కౌన్సిలింగ్, ఆసరా మరియు రక్షణ'}
            </p>
          </div>
          <span className="bg-amber-500 text-stone-950 text-xs font-black px-3 py-1 rounded-full border border-amber-600">
            {language === 'en' ? 'Free' : language === 'hi' ? 'मुफ्त' : language === 'ta' ? 'இலவசம்' : 'ఉచితం'}
          </span>
        </div>

        <a
          id="btn-call-elderline-14567"
          href="tel:14567"
          onClick={() => {
            playTapSound();
            const elderlineSpeech = language === 'en'
              ? 'Calling National Elder Helpline 14567'
              : language === 'hi'
              ? 'राष्ट्रीय वृद्ध हेल्पलाइन 14567 पर कॉल कर रहे हैं'
              : language === 'ta'
              ? 'தேசிய முதியோர் உதவி எண் 14567 ஐ அழைக்கிறீர்கள்'
              : 'వృద్ధుల జాతీయ హెల్ప్‌లైన్ 14567 కు కాల్ చేస్తున్నారు';
            speakInLanguage(elderlineSpeech, language);
          }}
          className="w-full py-4 bg-amber-500 hover:bg-amber-600 active:scale-98 text-stone-950 font-black text-xl rounded-2xl shadow-md flex items-center justify-center gap-3 transition-transform cursor-pointer border-2 border-amber-600"
        >
          <Phone className="w-7 h-7 animate-bounce text-stone-950" />
          <span>{language === 'en' ? 'Call 14567 Directly' : language === 'hi' ? '14567 पर सीधे कॉल करें' : language === 'ta' ? '14567 ஐ நேரடியாக அழைக்கவும்' : '14567 కు నేరుగా కాల్ చేయండి'}</span>
        </a>
      </div>

      {/* Bottom Sticky Home Button */}
      <div className="pt-2">
        <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
      </div>
    </div>
  );
};

