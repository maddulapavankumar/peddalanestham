import React, { useState } from 'react';
import { 
  POPULAR_COUNTRIES, 
  ALL_COUNTRIES_LIST,
  getCountryConfig, 
  CountryPhoneConfig 
} from '../utils/countryPhone';
import { playTapSound, speakInLanguage } from '../utils/audio';
import { useLanguage } from '../utils/i18n';
import { Globe, Check, Search, X, MapPin } from 'lucide-react';

export interface PhoneCountrySelectorProps {
  selectedCountry: string; // ISO code (e.g. 'IN', 'US', 'GB')
  onSelectCountry: (countryIso: string) => void;
  isLargeFont?: boolean;
  label?: string;
  idPrefix?: string;
}

/**
 * Reusable Senior-Friendly Phone Country Code Selector:
 * - Automatically displays detected country code
 * - Quick one-tap buttons for India (+91), USA (+1), UK (+44), and detected country
 * - Full searchable international country directory with all world calling codes
 * - Multi-language voice readout and tactile feedback
 */
export const PhoneCountrySelector: React.FC<PhoneCountrySelectorProps> = ({
  selectedCountry,
  onSelectCountry,
  isLargeFont = false,
  label,
  idPrefix = 'phone-country',
}) => {
  const { language } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const defaultLabel = language === 'en'
    ? 'Country Code:'
    : language === 'hi'
    ? 'देश कोड (Country Code):'
    : language === 'ta'
    ? 'நாட்டு குறியீடு (Country Code):'
    : 'దేశం కోడ్ (Country Code):';

  const displayLabel = label !== undefined ? label : defaultLabel;

  const currentConfig = getCountryConfig(selectedCountry);

  const getCountryVoiceText = (config: CountryPhoneConfig) => {
    if (language === 'en') return `${config.name} country code ${config.code} selected.`;
    if (language === 'hi') return `${config.name} देश कोड ${config.code} चुना गया।`;
    if (language === 'ta') return `${config.name} நாட்டு குறியீடு ${config.code} தேர்ந்தெடுக்கப்பட்டது.`;
    return config.voiceDescTe;
  };

  const handleSelect = (iso: string) => {
    playTapSound();
    onSelectCountry(iso);
    const config = getCountryConfig(iso);
    speakInLanguage(getCountryVoiceText(config), language);
    setIsModalOpen(false);
    setSearchQuery('');
  };

  // Top 3 primary choices always visible: India, USA, UK
  const primaryIsos = ['IN', 'US', 'GB'];
  // If user has another country selected (e.g. CA, AU, AE), include it in quick buttons
  const quickList = [...POPULAR_COUNTRIES.filter((c) => primaryIsos.includes(c.iso))];
  if (!primaryIsos.includes(selectedCountry)) {
    const special = getCountryConfig(selectedCountry);
    quickList.push(special);
  }

  // Filter countries for full directory modal
  const filteredCountries = ALL_COUNTRIES_LIST.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.nameTe.toLowerCase().includes(q) ||
      c.code.includes(q) ||
      c.iso.toLowerCase().includes(q)
    );
  });

  const ariaRadioLabel = language === 'en' ? 'Select country code' : language === 'hi' ? 'देश कोड चुनें' : language === 'ta' ? 'நாட்டு குறியீட்டைத் தேர்ந்தெடுக்கவும்' : 'దేశం కోడ్ ఎంపిక';
  const moreCountriesText = language === 'en' ? 'Other Countries 🌐' : language === 'hi' ? 'अन्य देश 🌐' : language === 'ta' ? 'மற்ற நாடுகள் 🌐' : 'ఇతర దేశాలు 🌐';
  const moreCountriesTitle = language === 'en' ? 'View all country codes' : language === 'hi' ? 'सभी देशों के कोड देखें' : language === 'ta' ? 'அனைத்து நாட்டு குறியீடுகளையும் காண்க' : 'అన్ని దేశాల కోడ్స్ చూడండి';
  const modalTitle = language === 'en' ? 'Select Country Code' : language === 'hi' ? 'देश कोड चुनें' : language === 'ta' ? 'நாட்டு குறியீட்டைத் தேர்ந்தெடுக்கவும்' : 'దేశం కోడ్ ఎంచుకోండి';
  const modalSubtitle = language === 'en' ? 'International Calling Codes' : language === 'hi' ? 'अंतर्राष्ट्रीय कॉलिंग कोड (International Calling Codes)' : language === 'ta' ? 'சர்வதேச அழைப்பு குறியீடுகள் (International Calling Codes)' : 'అంతర్జాతీయ కాలింగ్ కోడ్స్ (International Country Codes)';
  const closeTitle = language === 'en' ? 'Close' : language === 'hi' ? 'बंद करें' : language === 'ta' ? 'மூடு' : 'మూసివేయండి';
  const searchPlaceholder = language === 'en' ? 'Search country name or code (+91, UK, US)...' : language === 'hi' ? 'देश का नाम या कोड खोजें (+91, UK, Dubai)...' : language === 'ta' ? 'நாட்டின் பெயர் அல்லது குறியீட்டைத் தேடுங்கள்...' : 'దేశం పేరు లేదా కోడ్ వెతకండి (ఉదా: +91, UK, Dubai)...';
  const noCountryText = language === 'en' ? 'No country found.' : language === 'hi' ? 'कोई देश नहीं मिला।' : language === 'ta' ? 'எந்த நாடும் கிடைக்கவில்லை.' : 'ఏ దేశం కనుగొనబడలేదు.';
  const noCountrySub = language === 'en' ? 'Please try another name or code.' : language === 'hi' ? 'कृपया दूसरे नाम से खोजें।' : language === 'ta' ? 'தயவுசெய்து வேறு பெயரில் தேடவும்.' : 'దయచేసి మరొక పేరుతో శోధించండి.';
  const closeBtnText = language === 'en' ? 'Close' : language === 'hi' ? 'बंद करें (Close)' : language === 'ta' ? 'மூடு (Close)' : 'పూర్తయింది (Close)';
  const moreCountriesVoice = language === 'en' ? 'Opened list of countries. Select your country.' : language === 'hi' ? 'देशों की सूची खुल गई है। अपना देश चुनें।' : language === 'ta' ? 'நாடுகளின் பட்டியல் திறக்கப்பட்டது. உங்கள் நாட்டைத் தேர்ந்தெடுக்கவும்.' : 'ఇతర దేశాల జాబితా తెరవబడింది. మీ దేశం ఎంచుకోండి.';

  return (
    <div className="space-y-2">
      {/* Label and Current Selection Status */}
      {displayLabel && (
        <div className="flex items-center justify-between gap-2">
          <label 
            className={`font-black text-stone-900 flex items-center gap-1.5 ${
              isLargeFont ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
            }`}
          >
            <span>🌐</span>
            <span>{displayLabel}</span>
          </label>

          <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1 shadow-2xs">
            <MapPin className="w-3 h-3 text-emerald-700" />
            <span>{currentConfig.flag} {currentConfig.code} ({currentConfig.iso})</span>
          </span>
        </div>
      )}

      {/* Quick One-Tap Country Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label={ariaRadioLabel}>
        {quickList.map((country) => {
          const isSelected = selectedCountry === country.iso;
          return (
            <button
              key={country.iso}
              type="button"
              id={`${idPrefix}-btn-${country.iso.toLowerCase()}`}
              onClick={() => handleSelect(country.iso)}
              role="radio"
              aria-checked={isSelected}
              className={`py-3 px-2 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[52px] active:scale-98 ${
                isSelected
                  ? 'bg-amber-400 text-stone-950 shadow-md border-3 border-amber-600 scale-[1.02]'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-850 border-2 border-stone-300'
              }`}
              title={`${country.name} (${country.code})`}
            >
              <span className="text-2xl" aria-hidden="true">{country.flag}</span>
              <span className="tracking-tight font-mono">{country.code}</span>
              <span className="text-xs truncate max-w-[70px]">
                {language === 'en' ? country.name.split(' ')[0] : country.nameTe.split(' ')[0]}
              </span>
            </button>
          );
        })}

        {/* More Countries Button */}
        <button
          type="button"
          id={`${idPrefix}-btn-more`}
          onClick={() => {
            playTapSound();
            setIsModalOpen(true);
            speakInLanguage(moreCountriesVoice, language);
          }}
          className="col-span-2 sm:col-span-1 py-3 px-3 rounded-2xl font-black text-xs sm:text-sm bg-purple-100 hover:bg-purple-200 active:scale-98 text-purple-950 border-2 border-purple-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[52px]"
          title={moreCountriesTitle}
        >
          <Globe className="w-4 h-4 text-purple-800" />
          <span>{moreCountriesText}</span>
        </button>
      </div>

      {/* FULL INTERNATIONAL DIRECTORY MODAL */}
      {isModalOpen && (
        <div 
          id={`${idPrefix}-modal`}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border-4 border-purple-600 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-stone-200 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-black">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-900">
                    {modalTitle}
                  </h3>
                  <p className="text-xs font-bold text-stone-500">
                    {modalSubtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setIsModalOpen(false);
                }}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 cursor-pointer"
                title={closeTitle}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Search Box */}
            <div className="py-3 shrink-0">
              <div className="relative">
                <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border-2 border-stone-300 focus:border-purple-600 rounded-xl font-bold text-base text-stone-900 placeholder:text-stone-400 focus:outline-hidden"
                  autoFocus
                />
              </div>
            </div>

            {/* Country List (Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-stone-100">
              {filteredCountries.map((c) => {
                const isSelected = selectedCountry === c.iso;
                return (
                  <button
                    key={c.iso}
                    type="button"
                    onClick={() => handleSelect(c.iso)}
                    className={`w-full p-3.5 rounded-xl flex items-center justify-between transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-amber-100 border-2 border-amber-500 font-black'
                        : 'hover:bg-purple-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl" aria-hidden="true">{c.flag}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-lg text-stone-950">{c.code}</span>
                          <span className="font-bold text-stone-900 text-sm sm:text-base">{c.name}</span>
                        </div>
                        {language === 'te' && <span className="text-xs font-bold text-stone-500">{c.nameTe}</span>}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}

              {filteredCountries.length === 0 && (
                <div className="p-8 text-center text-stone-500">
                  <p className="font-bold">{noCountryText}</p>
                  <p className="text-xs mt-1">{noCountrySub}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-stone-200 shrink-0">
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setIsModalOpen(false);
                }}
                className="w-full py-3 bg-stone-200 hover:bg-stone-300 active:scale-98 text-stone-900 font-black rounded-xl text-base cursor-pointer"
              >
                {closeBtnText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
