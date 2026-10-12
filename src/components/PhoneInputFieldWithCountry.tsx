import React, { useEffect, useRef, useState } from 'react';
import { getCountryConfig } from '../utils/countryPhone';
import { 
  detectCountryFromDevice, 
  COUNTRY_DETECTED_EVENT,
  getDetectedCountry,
  startCountryLocationWatch 
} from '../utils/countryDetection';
import { PhoneCountrySelector } from './PhoneCountrySelector';
import { useLanguage } from '../utils/i18n';
import { MapPin, CheckCircle2 } from 'lucide-react';

export interface PhoneInputFieldWithCountryProps {
  country: string; // ISO code (e.g. 'IN', 'US', 'GB')
  onCountryChange: (countryIso: string) => void;
  phoneDigits: string;
  onPhoneDigitsChange: (digits: string) => void;
  isLargeFont?: boolean;
  idPrefix?: string;
  required?: boolean;
  label?: string;
  helperText?: string;
  hasManualOverride?: boolean;
  onManualOverrideChange?: (manual: boolean) => void;
}

/**
 * Reusable Senior-Friendly Phone Input with Automatic Device Location Country Detection:
 * - Automatically detects country from device location when app opens or when user enters phone field
 * - Supports India (+91), USA (+1), UK (+44), and all world international calling codes
 * - Automatically updates country code when user changes country/location
 * - Keeps manual country selector prominently available so user can correct/override anytime
 * - Formats digits and displays real-time country code prefix badge
 */
export const PhoneInputFieldWithCountry: React.FC<PhoneInputFieldWithCountryProps> = ({
  country,
  onCountryChange,
  phoneDigits,
  onPhoneDigitsChange,
  isLargeFont = false,
  idPrefix = 'input-phone',
  required = true,
  label,
  helperText,
  hasManualOverride = false,
  onManualOverrideChange,
}) => {
  const { language } = useLanguage();
  const config = getCountryConfig(country);
  
  const defaultLabel = language === 'en'
    ? 'Mobile Phone Number:'
    : language === 'hi'
    ? 'मोबाइल फ़ोन नंबर (Phone Number):'
    : language === 'ta'
    ? 'கைபேசி எண் (Phone Number):'
    : 'మొబైల్ ఫోన్ నంబర్ (Phone Number):';

  const displayLabel = label !== undefined ? label : defaultLabel;
  
  // Track whether user explicitly interacted with manual country selector buttons
  const isManuallyChosenRef = useRef<boolean>(hasManualOverride);
  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(!hasManualOverride);

  // Sync manual override prop changes if passed from parent (e.g. editing an existing contact)
  useEffect(() => {
    isManuallyChosenRef.current = hasManualOverride;
    if (hasManualOverride) {
      setIsAutoDetected(false);
    }
  }, [hasManualOverride]);

  // 1. Reactive automatic detection: runs when app opens or when user changes country/location
  useEffect(() => {
    // Start continuous country location watcher
    startCountryLocationWatch();

    // Listen for country changes when user changes country/location
    const handleLocationCountryChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const detectedIso = detail?.country;
      if (detectedIso && !isManuallyChosenRef.current) {
        if (detectedIso !== country) {
          setIsAutoDetected(true);
          onCountryChange(detectedIso);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(COUNTRY_DETECTED_EVENT, handleLocationCountryChange);
    }

    // Trigger initial device detection if user hasn't explicitly chosen a manual country
    if (!isManuallyChosenRef.current) {
      detectCountryFromDevice((detectedIso) => {
        if (detectedIso && !isManuallyChosenRef.current && detectedIso !== country) {
          setIsAutoDetected(true);
          onCountryChange(detectedIso);
        }
      });
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(COUNTRY_DETECTED_EVENT, handleLocationCountryChange);
      }
    };
  }, [country, onCountryChange]);

  // 2. Trigger automatic country detection when user enters (focuses or clicks) the phone-number field
  const handleEnterPhoneField = () => {
    // If user hasn't locked a manual country selection, ensure latest device location country is applied
    if (!isManuallyChosenRef.current) {
      detectCountryFromDevice((detectedIso) => {
        if (detectedIso && !isManuallyChosenRef.current && detectedIso !== country) {
          setIsAutoDetected(true);
          onCountryChange(detectedIso);
        }
      });
    }
  };

  // 3. User manually selects country from quick buttons or all-countries directory
  const handleManualCountrySelect = (newIso: string) => {
    isManuallyChosenRef.current = true;
    setIsAutoDetected(false);
    onManualOverrideChange?.(true);
    onCountryChange(newIso);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, '');

    // Strip leading calling code if pasted by user
    const pureCode = config.code.replace('+', '');
    if (val.startsWith(pureCode) && val.length > config.phoneLength) {
      val = val.slice(pureCode.length);
    } else if (val.startsWith('0') && val.length > config.phoneLength) {
      val = val.slice(1);
    }

    // Limit to expected phone length (standard 10 or up to 12 digits)
    const maxLen = Math.max(10, config.phoneLength);
    if (val.length > maxLen) {
      val = val.slice(0, maxLen);
    }

    onPhoneDigitsChange(val);
  };

  const isCompleted = phoneDigits.length >= config.phoneLength;

  const autoDetectedText = language === 'en'
    ? 'Auto-detected from device location'
    : language === 'hi'
    ? 'डिवाइस लोकेशन से पहचाना गया (Auto-detected)'
    : language === 'ta'
    ? 'சாதன இருப்பிடத்திலிருந்து கண்டறியப்பட்டது (Auto-detected)'
    : 'పరికర లొకేషన్ నుండి ఆటో-డిటెక్ట్ చేయబడింది (Auto-detected)';

  const selectedCodeText = language === 'en'
    ? 'Selected Country Code'
    : language === 'hi'
    ? 'चुना गया देश कोड (Selected Code)'
    : language === 'ta'
    ? 'தேர்ந்தெடுக்கப்பட்ட நாட்டு குறியீடு (Selected Code)'
    : 'ఎంచుకున్న దేశం కోడ్ (Selected Code)';

  const digitsSuffix = language === 'en'
    ? `${config.phoneLength} Digits`
    : language === 'hi'
    ? `${config.phoneLength} अंक (Digits)`
    : language === 'ta'
    ? `${config.phoneLength} இலக்கங்கள் (Digits)`
    : `${config.phoneLength} అంకెలు / Digits`;

  const ariaInputLabel = language === 'en'
    ? `${config.name} phone number`
    : language === 'hi'
    ? `${config.name} फ़ोन नंबर`
    : language === 'ta'
    ? `${config.name} தொலைபேசி எண்`
    : `${config.labelTe} ఫోన్ నంబర్`;

  const renderDefaultHelper = () => {
    if (language === 'en') {
      return (
        <>
          Selected country code: <b>{config.flag} {config.code}</b> ({config.name}). Please enter only the <b>{config.phoneLength}-digit local number</b>.
        </>
      );
    }
    if (language === 'hi') {
      return (
        <>
          चुना गया देश कोड: <b>{config.flag} {config.code}</b> ({config.name})। कृपया केवल <b>{config.phoneLength} अंकों का स्थानीय नंबर</b> दर्ज करें।
        </>
      );
    }
    if (language === 'ta') {
      return (
        <>
          தேர்ந்தெடுக்கப்பட்ட நாடு: <b>{config.flag} {config.code}</b> ({config.name}). <b>{config.phoneLength} இலக்க உள்ளூர் எண்ணை</b> மட்டும் உள்ளிடவும்.
        </>
      );
    }
    return (
      <>
        ఎంచుకున్న దేశం కోడ్: <b>{config.flag} {config.code}</b> ({config.nameTe}). మీరు కేవలం <b>{config.phoneLength} అంకెల స్థానిక నంబర్</b> మాత్రమే నమోదు చేయండి.
      </>
    );
  };

  return (
    <div className="space-y-3">
      {/* 1. Reusable Manual Country Selector with Quick Buttons & All Countries Directory */}
      <PhoneCountrySelector
        selectedCountry={country}
        onSelectCountry={handleManualCountrySelect}
        isLargeFont={isLargeFont}
        idPrefix={idPrefix}
      />

      {/* Auto-Detection Location Status Indicator */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="flex items-center gap-1 font-bold text-stone-600">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {isAutoDetected ? autoDetectedText : selectedCodeText}
          </span>
        </span>
        <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          {config.flag} {config.code}
        </span>
      </div>

      {/* 2. Phone Input Field with Prefix Badge */}
      <div className="space-y-1.5">
        {displayLabel && (
          <label 
            htmlFor={`${idPrefix}-field`}
            className={`block font-black text-stone-900 flex items-center justify-between ${
              isLargeFont ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
            }`}
          >
            <span>{displayLabel}</span>
            <span className="text-xs font-bold text-stone-500 font-mono">
              ({digitsSuffix})
            </span>
          </label>
        )}

        <div className="flex rounded-2xl border-3 border-stone-300 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-500/20 bg-stone-50 transition-all shadow-inner overflow-hidden">
          {/* Dynamic Country Flag & Calling Code Prefix Badge */}
          <div 
            id={`${idPrefix}-code-badge`}
            className="flex items-center gap-1.5 pl-3.5 sm:pl-5 pr-2.5 py-4 sm:py-5 select-none shrink-0 bg-stone-200/70 border-r-2 border-stone-300"
            title={`${config.name} (${config.code})`}
          >
            <span className="text-2xl sm:text-3xl" aria-hidden="true">{config.flag}</span>
            <span className="font-mono font-black text-xl sm:text-2xl text-stone-950 tracking-tight">
              {config.code}
            </span>
          </div>

          {/* Phone digits input */}
          <input
            id={`${idPrefix}-field`}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={12}
            required={required}
            value={phoneDigits}
            onFocus={handleEnterPhoneField}
            onClick={handleEnterPhoneField}
            onChange={handleInputChange}
            placeholder={config.placeholder}
            className="w-full py-4 sm:py-5 px-3.5 sm:px-4 bg-transparent focus:outline-hidden text-2xl sm:text-3xl font-mono font-black tracking-wider text-stone-950 placeholder:text-stone-300"
            aria-label={ariaInputLabel}
          />

          {/* Character counter / Completed badge */}
          {phoneDigits.length > 0 && (
            <div className="pr-3.5 sm:pr-4 flex items-center shrink-0">
              <span className={`text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg font-mono flex items-center gap-1 ${
                isCompleted 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-stone-200 text-stone-700'
              }`}>
                {phoneDigits.length}/{config.phoneLength} {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
              </span>
            </div>
          )}
        </div>

        {/* Informative explanation note */}
        <p className="text-xs sm:text-sm font-bold text-stone-600 pl-1 flex items-center gap-1.5 flex-wrap">
          <span>ℹ️</span>
          <span>
            {helperText || renderDefaultHelper()}
          </span>
        </p>
      </div>
    </div>
  );
};
