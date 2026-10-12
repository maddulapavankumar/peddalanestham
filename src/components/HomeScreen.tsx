import React, { useEffect } from 'react';
import { ScreenType } from '../types';
import { 
  Car, 
  Building2, 
  ShieldAlert, 
  MapPin, 
  Users, 
  HeartHandshake,
  Volume2
} from 'lucide-react';
import { playTapSound, speakInLanguage } from '../utils/audio';
import { CountrySelector, CountryCode } from './CountrySelector';
import { useLanguage } from '../utils/i18n';

interface HomeScreenProps {
  onNavigate: (screen: ScreenType) => void;
  isLargeFont: boolean;
  isVoiceOn?: boolean;
  onToggleVoice?: () => void;
  onOpenDriverPortal?: () => void;
  selectedCountry: CountryCode;
  onSelectCountry: (country: CountryCode) => void;
}

interface HomeActionItem {
  id: ScreenType;
  number: string;
  emoji: string;
  title: string;
  subtitle: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconBg: string;
  iconColor: string;
  Icon: React.ComponentType<{ className?: string }>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  isLargeFont,
  selectedCountry,
  onSelectCountry,
}) => {
  const { language, t } = useLanguage();

  const buttons: HomeActionItem[] = [
    {
      id: 'family',
      number: '1',
      emoji: '👨‍👩‍👧',
      title: t('homeCardFamilyTitle'),
      subtitle: t('homeCardFamilySub'),
      bgColor: 'bg-purple-50 hover:bg-purple-100 active:bg-purple-200',
      borderColor: 'border-purple-400',
      textColor: 'text-purple-950',
      iconBg: 'bg-purple-600',
      iconColor: 'text-white',
      Icon: Users,
    },
    {
      id: 'hospital',
      number: '2',
      emoji: '🏥',
      title: selectedCountry === 'USA' ? t('homeCardHospitalTitleUsa') : t('homeCardHospitalTitleIndia'),
      subtitle: selectedCountry === 'USA' ? t('homeCardHospitalSubUsa') : t('homeCardHospitalSubIndia'),
      bgColor: 'bg-rose-50 hover:bg-rose-100 active:bg-rose-200',
      borderColor: 'border-rose-400',
      textColor: 'text-rose-950',
      iconBg: 'bg-rose-600',
      iconColor: 'text-white',
      Icon: Building2,
    },
    {
      id: 'sos',
      number: '3',
      emoji: '🆘',
      title: t('homeCardSosTitle'),
      subtitle: selectedCountry === 'USA' ? t('homeCardSosSubUsa') : t('homeCardSosSubIndia'),
      bgColor: 'bg-red-100 hover:bg-red-200 active:bg-red-300',
      borderColor: 'border-red-700',
      textColor: 'text-red-950',
      iconBg: 'bg-red-700',
      iconColor: 'text-white',
      Icon: ShieldAlert,
    },
    {
      id: 'location',
      number: '4',
      emoji: '📍',
      title: t('homeCardLocationTitle'),
      subtitle: t('homeCardLocationSub'),
      bgColor: 'bg-blue-50 hover:bg-blue-100 active:bg-blue-200',
      borderColor: 'border-blue-400',
      textColor: 'text-blue-950',
      iconBg: 'bg-blue-600',
      iconColor: 'text-white',
      Icon: MapPin,
    },
    {
      id: 'auto',
      number: '5',
      emoji: selectedCountry === 'USA' ? '🚗' : '🛺',
      title: selectedCountry === 'USA' ? t('homeCardAutoTitleUsa') : t('homeCardAutoTitleIndia'),
      subtitle: selectedCountry === 'USA' ? t('homeCardAutoSubUsa') : t('homeCardAutoSubIndia'),
      bgColor: selectedCountry === 'USA' 
        ? 'bg-blue-50 hover:bg-blue-100 active:bg-blue-200' 
        : 'bg-amber-100/90 hover:bg-amber-200 active:bg-amber-300',
      borderColor: selectedCountry === 'USA' ? 'border-blue-500' : 'border-amber-500',
      textColor: selectedCountry === 'USA' ? 'text-blue-950' : 'text-amber-950',
      iconBg: selectedCountry === 'USA' ? 'bg-blue-600 text-white' : 'bg-amber-400 border-2 border-amber-600 text-stone-950',
      iconColor: selectedCountry === 'USA' ? 'text-white' : 'text-stone-950',
      Icon: Car,
    },
    {
      id: 'helpline',
      number: '6',
      emoji: '🧓',
      title: selectedCountry === 'USA' ? t('homeCardHelplineTitleUsa') : t('homeCardHelplineTitleIndia'),
      subtitle: selectedCountry === 'USA' ? t('homeCardHelplineSubUsa') : t('homeCardHelplineSubIndia'),
      bgColor: 'bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200',
      borderColor: 'border-emerald-500',
      textColor: 'text-emerald-950',
      iconBg: 'bg-emerald-600',
      iconColor: 'text-white',
      Icon: HeartHandshake,
    },
  ];

  useEffect(() => {
    speakInLanguage(t('voiceWelcome'), language, { delayMs: 400 });
  }, [language, t]);

  const handleItemClick = (item: HomeActionItem) => {
    playTapSound();
    let msg = `${item.number}. ${item.title} ఓపెన్ చేస్తున్నాం.`;
    if (language === 'en') msg = `Opening ${item.number}. ${item.title}.`;
    else if (language === 'hi') msg = `${item.number}. ${item.title} खोल रहे हैं।`;
    else if (language === 'ta') msg = `${item.number}. ${item.title} திறக்கப்படுகிறது.`;
    speakInLanguage(msg, language);
    onNavigate(item.id);
  };

  const handleSpeakItem = (e: React.MouseEvent, item: HomeActionItem) => {
    e.stopPropagation();
    playTapSound();
    speakInLanguage(`${item.number}. ${item.title}. ${item.subtitle}.`, language);
  };

  const handleReadScreenSummary = () => {
    playTapSound();
    speakInLanguage(t('voiceWelcome'), language);
  };

  const greetingHeading = language === 'te' ? 'నమస్కారం!' : language === 'hi' ? 'नमस्ते!' : language === 'ta' ? 'வணக்கம்!' : 'Welcome!';
  const greetingPrompt = language === 'te' ? 'కింది బటన్లలో మీకు కావలసిన దానిపై తాకండి:' : language === 'hi' ? 'नीचे दिए गए किसी भी बटन पर टैप करें:' : language === 'ta' ? 'கீழே உள்ள பொத்தான்களில் ஒன்றைத் தட்டவும்:' : 'Tap any big button below:';
  const listenLabel = language === 'te' ? 'అన్ని సేవలను వినండి' : language === 'hi' ? 'सभी सेवाएं सुनें' : language === 'ta' ? 'அனைத்து சேவைகளையும் கேளுங்கள்' : 'Listen to services';

  return (
    <div className="p-3 sm:p-5 max-w-2xl mx-auto space-y-4">
      {/* 🇮🇳 INDIA and 🇺🇸 USA country selector */}
      <CountrySelector
        selectedCountry={selectedCountry}
        onSelectCountry={onSelectCountry}
      />

      {/* Friendly Senior Greeting Banner */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-stone-200 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🙏</span>
            <h2 className={`font-bold text-stone-900 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
              {greetingHeading}
            </h2>
          </div>
          <p className={`text-stone-600 font-medium mt-1 ${isLargeFont ? 'text-lg' : 'text-base'}`}>
            {greetingPrompt}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReadScreenSummary}
            type="button"
            className="p-3 bg-stone-100 hover:bg-stone-200 rounded-2xl active:scale-95 transition-all text-stone-700 shrink-0 cursor-pointer"
            title={listenLabel}
            aria-label={listenLabel}
          >
            <Volume2 className="w-6 h-6 text-red-700" />
          </button>
        </div>
      </div>

      {/* Exactly 6 Big Senior-Friendly Buttons List */}
      <div className="space-y-3.5" role="list">
        {buttons.map((item) => {
          const IconComponent = item.Icon;
          return (
            <div
              key={item.id}
              role="listitem"
              onClick={() => handleItemClick(item)}
              className={`w-full rounded-2xl border-3 shadow-sm transition-all flex items-center justify-between gap-2 overflow-hidden cursor-pointer select-none active:scale-[0.99] ${item.bgColor} ${item.borderColor}`}
            >
              {/* Main Action Touch Target */}
              <button
                id={`home-btn-${item.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleItemClick(item);
                }}
                type="button"
                className="flex-1 min-w-0 text-left p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 cursor-pointer"
                aria-label={`${item.number}. ${item.title}`}
              >
                {/* Number & Icon Badge */}
                <div className="relative shrink-0">
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-md ${item.iconBg} ${item.iconColor}`}
                  >
                    {item.id === 'auto' ? (
                      <span className="text-3xl sm:text-4xl select-none leading-none" role="img" aria-label={item.title}>
                        {item.emoji}
                      </span>
                    ) : (
                      <IconComponent className="w-8 h-8 sm:w-9 sm:h-9" />
                    )}
                  </div>
                  <span className="absolute -top-1.5 -left-1.5 w-6 h-6 bg-stone-900 text-white rounded-full text-xs font-black flex items-center justify-center shadow">
                    {item.number}
                  </span>
                </div>

                {/* Title and Subtitle */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl sm:text-2xl">{item.emoji}</span>
                    <h3
                      className={`font-black tracking-tight leading-snug ${item.textColor} ${
                        isLargeFont ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                      }`}
                    >
                      {item.title}
                    </h3>
                  </div>
                  <p
                    className={`text-stone-600 font-medium mt-1 truncate ${
                      isLargeFont ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
                    }`}
                  >
                    {item.subtitle}
                  </p>
                </div>
              </button>

              {/* Audio Listen button on each item */}
              <button
                id={`home-speak-btn-${item.id}`}
                type="button"
                onClick={(e) => handleSpeakItem(e, item)}
                className="p-3 mr-3 sm:mr-4 rounded-xl bg-white/80 hover:bg-white text-stone-700 shadow-sm shrink-0 border border-stone-200 transition-colors active:scale-95 cursor-pointer"
                title={language === 'en' ? 'Listen to this option' : language === 'hi' ? 'इस विकल्प का नाम सुनें' : language === 'ta' ? 'இந்த தேர்வின் பெயரைக் கேளுங்கள்' : 'ఈ బటన్ పేరు వినండి'}
                aria-label={language === 'en' ? `Listen to ${item.title}` : language === 'hi' ? `${item.title} सुनें` : language === 'ta' ? `${item.title} கேளுங்கள்` : `${item.title} పేరు వినండి`}
              >
                <Volume2 className="w-5 h-5 text-stone-800" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Helpful bottom note */}
      <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl text-center text-stone-700 font-medium text-sm sm:text-base">
        {language === 'en' ? (
          <>💡 <span className="font-bold">Tip:</span> A Home button is always available at the top and bottom. Tap it anytime to return here.</>
        ) : language === 'hi' ? (
          <>💡 <span className="font-bold">सुझाव:</span> हर पेज के ऊपर और नीचे होम (Home) बटन है। वापस आने के लिए इसे कभी भी दबाएं।</>
        ) : language === 'ta' ? (
          <>💡 <span className="font-bold">உதவிக்குறிப்பு:</span> ஒவ்வொரு பக்கத்திலும் மேலே அல்லது கீழே முகப்பு (Home) பொத்தான் உள்ளது. மீண்டும் வர அதைத் தட்டவும்.</>
        ) : (
          <>💡 <span className="font-bold">సలహా:</span> ప్రతి పేజీలో పైభాగంలో లేదా క్రింద హోమ్ (Home) బటన్ ఉంటుంది. దాన్ని నొక్కితే మళ్ళీ ఇక్కడికి రావచ్చు.</>
        )}
      </div>
    </div>
  );
};

