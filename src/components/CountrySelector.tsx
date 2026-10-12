import React from 'react';
import { Globe2 } from 'lucide-react';
import { playTapSound, speakInLanguage } from '../utils/audio';
import { useLanguage } from '../utils/i18n';

export type CountryCode = 'IN' | 'USA';

interface CountrySelectorProps {
  selectedCountry: CountryCode;
  onSelectCountry: (country: CountryCode) => void;
  title?: string;
  featureNameTe?: string;
  className?: string;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry,
  onSelectCountry,
  title,
  featureNameTe,
  className = '',
}) => {
  const { language, t } = useLanguage();

  const displayTitle = title || t('countrySelectLabel');

  const indiaLabel = language === 'te' ? 'భారతదేశం' : language === 'hi' ? 'भारत' : language === 'ta' ? 'இந்தியா' : 'India';
  const usaLabel = language === 'te' ? 'అమెరికా' : language === 'hi' ? 'अमेरिका' : language === 'ta' ? 'அமெரிக்கா' : 'USA';
  const currentBadgePrefix = language === 'te' ? 'ప్రస్తుతం:' : language === 'hi' ? 'वर्तमान:' : language === 'ta' ? 'தற்போது:' : 'Current:';

  const handleSelect = (country: CountryCode) => {
    if (country === selectedCountry) return;
    playTapSound();
    onSelectCountry(country);
    if (country === 'IN') {
      const msg = language === 'te' ? 'భారతదేశం ఎంపికైంది.' : language === 'hi' ? 'भारत चुना गया।' : language === 'ta' ? 'இந்தியா தேர்ந்தெடுக்கப்பட்டது.' : 'India selected.';
      speakInLanguage(featureNameTe ? `${featureNameTe} - ${msg}` : msg, language);
    } else {
      const msg = language === 'te' ? 'అమెరికా ఎంపికైంది.' : language === 'hi' ? 'अमेरिका चुना गया।' : language === 'ta' ? 'அமெரிக்கா தேர்ந்தெடுக்கப்பட்டது.' : 'USA selected.';
      speakInLanguage(featureNameTe ? `${featureNameTe} - ${msg}` : msg, language);
    }
  };

  return (
    <div id="feature-country-selector" className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <span className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
          <Globe2 className="w-4.5 h-4.5 text-amber-700" />
          <span>{displayTitle}</span>
        </span>
        <span className="text-xs font-bold text-stone-600 bg-white px-2.5 py-0.5 rounded-full border border-stone-200 shadow-xs">
          {selectedCountry === 'IN' ? `${currentBadgePrefix} 🇮🇳 ${indiaLabel}` : `${currentBadgePrefix} 🇺🇸 ${usaLabel}`}
        </span>
      </div>

      {/* 🇮🇳 INDIA & 🇺🇸 USA SIDE-BY-SIDE LARGE SENIOR-FRIENDLY BUTTONS */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* 🇮🇳 INDIA BUTTON */}
        <button
          id="btn-country-selector-india"
          type="button"
          onClick={() => handleSelect('IN')}
          className={`min-h-[82px] sm:min-h-[92px] p-3.5 sm:p-4 rounded-3xl font-black text-center border-4 transition-all cursor-pointer shadow-md flex items-center justify-center gap-3 sm:gap-4 active:scale-95 ${
            selectedCountry === 'IN'
              ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-stone-950 border-orange-600 ring-4 ring-orange-300 shadow-xl scale-[1.02]'
              : 'bg-white hover:bg-orange-50/80 text-stone-700 border-stone-300 opacity-90 hover:opacity-100'
          }`}
          aria-label={`${indiaLabel} select`}
          aria-pressed={selectedCountry === 'IN'}
        >
          <span className="text-4xl sm:text-5xl shrink-0 drop-shadow-sm">🇮🇳</span>
          <div className="text-left">
            <div className="text-2xl sm:text-3xl font-black tracking-wide leading-tight text-stone-950">
              INDIA
            </div>
            <div
              className={`text-xs sm:text-sm font-black mt-0.5 ${
                selectedCountry === 'IN' ? 'text-amber-950' : 'text-stone-500'
              }`}
            >
              {indiaLabel}
            </div>
          </div>
        </button>

        {/* 🇺🇸 USA BUTTON */}
        <button
          id="btn-country-selector-usa"
          type="button"
          onClick={() => handleSelect('USA')}
          className={`min-h-[82px] sm:min-h-[92px] p-3.5 sm:p-4 rounded-3xl font-black text-center border-4 transition-all cursor-pointer shadow-md flex items-center justify-center gap-3 sm:gap-4 active:scale-95 ${
            selectedCountry === 'USA'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white border-blue-800 ring-4 ring-blue-300 shadow-xl scale-[1.02]'
              : 'bg-white hover:bg-blue-50/80 text-stone-700 border-stone-300 opacity-90 hover:opacity-100'
          }`}
          aria-label={`${usaLabel} select`}
          aria-pressed={selectedCountry === 'USA'}
        >
          <span className="text-4xl sm:text-5xl shrink-0 drop-shadow-sm">🇺🇸</span>
          <div className="text-left">
            <div className="text-2xl sm:text-3xl font-black tracking-wide leading-tight">
              USA
            </div>
            <div
              className={`text-xs sm:text-sm font-black mt-0.5 ${
                selectedCountry === 'USA' ? 'text-blue-100' : 'text-stone-500'
              }`}
            >
              {usaLabel}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
