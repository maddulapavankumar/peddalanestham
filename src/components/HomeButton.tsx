import React from 'react';
import { Home } from 'lucide-react';
import { playTapSound, speakInLanguage } from '../utils/audio';
import { useLanguage } from '../utils/i18n';

interface HomeButtonProps {
  onGoHome: () => void;
  isLargeFont?: boolean;
}

export const HomeButton: React.FC<HomeButtonProps> = ({ onGoHome, isLargeFont }) => {
  const { language, t } = useLanguage();

  const homeLabel = language === 'te' 
    ? 'హోమ్ (ముఖ్య పేజీకి)' 
    : language === 'hi' 
    ? 'होम (मुख्य पृष्ठ)' 
    : language === 'ta' 
    ? 'முகப்பு (முதன்மை பக்கம்)' 
    : 'Home (Main Screen)';

  const handleClick = () => {
    playTapSound();
    speakInLanguage(t('voiceNavHome'), language);
    onGoHome();
  };

  return (
    <button
      id="global-home-button"
      onClick={handleClick}
      type="button"
      className={`w-full flex items-center justify-center gap-3 bg-stone-900 hover:bg-black active:scale-[0.98] text-white font-bold rounded-2xl shadow-lg border-2 border-stone-800 transition-all ${
        isLargeFont ? 'py-4 text-2xl' : 'py-3.5 text-xl'
      }`}
      aria-label={t('navHome')}
    >
      <Home className={isLargeFont ? 'w-8 h-8 text-amber-300' : 'w-7 h-7 text-amber-300'} />
      <span>{homeLabel}</span>
    </button>
  );
};
