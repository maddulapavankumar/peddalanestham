import React, { useState, useEffect } from 'react';
import { HomeButton } from './HomeButton';
import { 
  Users, 
  Phone, 
  MessageCircle, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Volume2, 
  ArrowLeft,
  PhoneCall,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { FamilyContact } from '../types';
import { getStoredContacts, saveStoredContacts } from '../utils/storage';
import { playTapSound, speakInLanguage } from '../utils/audio';
import { CountryCode } from './CountrySelector';
import {
  PhoneCountry,
  getCountryConfig,
  getCountryFromPhone,
  extractRawPhoneDigits,
  composeFullPhoneNumber,
  getDialableNumber,
  formatPhoneNumber,
  getWhatsAppNumber,
} from '../utils/countryPhone';
import { getDetectedCountry, detectCountryFromDevice } from '../utils/countryDetection';
import { PhoneInputFieldWithCountry } from './PhoneInputFieldWithCountry';
import { useLanguage, getRelationPresets } from '../utils/i18n';

// Re-export phone helpers for any external components
export { getDialableNumber, formatPhoneNumber, getWhatsAppNumber };

interface FamilyScreenProps {
  onGoHome: () => void;
  isLargeFont: boolean;
  currentAddress?: string;
  selectedCountry?: CountryCode;
}

const AVATAR_COLORS = [
  'bg-emerald-600',
  'bg-indigo-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-teal-600',
  'bg-blue-600',
  'bg-cyan-700'
];

export const FamilyScreen: React.FC<FamilyScreenProps> = ({
  onGoHome,
  isLargeFont,
  currentAddress = 'నా ఇంటి వద్ద',
  selectedCountry = 'IN',
}) => {
  const { language, t } = useLanguage();
  const relationPresets = getRelationPresets(language);
  const [contacts, setContacts] = useState<FamilyContact[]>(getStoredContacts());
  
  // Screen mode: 'list' for main cards view, 'form' for senior-friendly add/edit screen
  const [screenMode, setScreenMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Active calling modal state for instant visual feedback and fallback
  const [activeCallingContact, setActiveCallingContact] = useState<{ name: string; phone: string } | null>(null);

  // Form Inputs: country code (IN / US / GB etc.), name, phone, relation
  const [contactCountry, setContactCountry] = useState<PhoneCountry>(() => getDetectedCountry());
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [relationInput, setRelationInput] = useState(() => relationPresets[0] || (language === 'en' ? 'Son' : 'కొడుకు'));

  // Accidental delete confirmation dialog state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const speak = (te: string, en: string, hi: string, ta: string, opts?: { delayMs?: number }) => {
    const text = language === 'en' ? en : language === 'hi' ? hi : language === 'ta' ? ta : te;
    speakInLanguage(text, language, opts);
  };

  // Voice guide explaining the page
  const handleVoiceGuide = () => {
    playTapSound();
    if (screenMode === 'form') {
      const config = getCountryConfig(contactCountry);
      const desc = language === 'en' ? config.voiceDescEn : language === 'hi' ? config.voiceDescHi : language === 'ta' ? config.voiceDescTa : config.voiceDescTe;
      speak(
        `ఇక్కడ ${desc} పది అంకెల మొబైల్ నంబర్ మరియు పేరు నమోదు చేసి, ఆకుపచ్చ రంగులో ఉన్న సేవ్ చేయండి బటన్ నొక్కండి.`,
        `Here enter ${desc}, the 10-digit mobile number and name, then tap the green Save button.`,
        `यहाँ ${desc}, 10 अंकों का मोबाइल नंबर और नाम दर्ज करें, फिर हरे रंग का सुरक्षित करें बटन दबाएं।`,
        `இங்கு ${desc}, 10 இலக்க மொபைல் எண் மற்றும் பெயரை உள்ளிட்டு, பச்சை சேமி பொத்தானை அழுத்தவும்.`
      );
    } else {
      speak(
        'కుటుంబ సభ్యుల పేజీ. ఇక్కడ మీ ఆత్మీయుల పేర్లు, ఫోన్ నంబర్లు ఉన్నాయి. వారికి కాల్ చేయడానికి పెద్ద ఆకుపచ్చ కాల్ చేయండి బటన్ నొక్కండి. కొత్త వారిని చేర్చడానికి పైన ఉన్న కొత్త కుటుంబ సభ్యుడిని చేర్చండి బటన్ నొక్కండి.',
        'Family Contacts page. Your loved ones names and phone numbers are listed here. Tap the large green call button to dial. Tap Add New Family Member above to add contacts.',
        'परिवार संपर्क पेज। आपके परिजनों के नाम और फोन नंबर यहाँ हैं। कॉल करने के लिए बड़ा हरा कॉल बटन दबाएं। नए सदस्य जोड़ने के लिए ऊपर जोड़ें बटन दबाएं।',
        'குடும்ப தொடர்புகள் பக்கம். உங்கள் அன்புக்குரியவர்களின் பெயர்கள் மற்றும் எண்கள் உள்ளன. அழைக்க பச்சை பட்டனை அழுத்தவும். புதிய உறுப்பினரைச் சேர்க்க மேலே தொடவும்.'
      );
    }
  };

  // One-tap direct phone call using saved family member's complete number with country code
  const handleCall = (contact: FamilyContact, e?: React.MouseEvent) => {
    playTapSound();
    const completeNumber = getDialableNumber(contact.phone);
    speak(
      `${contact.name} గారికి ఫోన్ కలుపుతున్నాం. మాట్లాడండి.`,
      `Calling ${contact.name}. Please speak once connected.`,
      `${contact.name} को कॉल मिला रहे हैं। बात करें।`,
      `${contact.name} அவர்களை அழைக்கிறோம். பேசவும்.`
    );
    
    // Set active calling contact to provide clear on-screen confirmation
    setActiveCallingContact({
      name: contact.name,
      phone: completeNumber,
    });

    // Open phone dialer with this exact saved family member's complete phone number with country code
    try {
      window.location.href = `tel:${completeNumber}`;
    } catch {
      window.open(`tel:${completeNumber}`, '_self');
    }
  };

  // Quick WhatsApp message using sanitized number with country code
  const handleWhatsApp = (contact: FamilyContact) => {
    playTapSound();
    const defaultText = language === 'en'
      ? 'Hello! I need to speak with you. Please call me back.'
      : language === 'hi'
      ? 'नमस्ते! मुझे आपसे बात करनी है। कृपया मुझे कॉल करें।'
      : language === 'ta'
      ? 'வணக்கம்! நான் உங்களுடன் பேச வேண்டும். தயவுசெய்து அழைக்கவும்.'
      : 'నమస్కారం! నేను మాట్లాడాలి. దయచేసి నాకు కాల్ చేయండి.';
    const text = encodeURIComponent(defaultText);
    speak(
      `${contact.name} గారికి వాట్సాప్ సందేశం పంపుతున్నారు`,
      `Sending WhatsApp message to ${contact.name}`,
      `${contact.name} को व्हाट्सएप संदेश भेज रहे हैं`,
      `${contact.name} அவர்களுக்கு வாட்ஸ்அப் செய்தி அனுப்புகிறோம்`
    );
    const waNumber = getWhatsAppNumber(contact.phone);
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
  };

  // Open simple add screen (empty inputs ready for new member at any time)
  const openAddScreen = () => {
    playTapSound();
    setEditingId(null);
    setNameInput('');
    setPhoneInput('');
    setRelationInput('');
    setContactCountry(getDetectedCountry());
    setScreenMode('form');
    // Ensure latest country from device location
    detectCountryFromDevice((detectedIso) => {
      if (detectedIso) {
        setContactCountry(detectedIso);
      }
    });
    speak(
      'కొత్త కుటుంబ సభ్యుని దేశం కోడ్, పేరు, మొబైల్ నంబర్ మరియు సంబంధం నమోదు చేయండి',
      'Enter country code, name, mobile number and relation for the new family member',
      'नए परिवार सदस्य का देश कोड, नाम, मोबाइल नंबर और संबंध दर्ज करें',
      'புதிய குடும்ப உறுப்பினரின் நாட்டு குறியீடு, பெயர், மொபைல் எண் மற்றும் உறவை உள்ளிடவும்'
    );
  };

  // Open simple edit screen (detect country code and extract 10 digits for input)
  const openEditScreen = (contact: FamilyContact) => {
    playTapSound();
    setEditingId(contact.id);
    
    // Extract base name if contact.name had parenthesized relation
    const cleanName = contact.name.replace(/\s*\([^)]*\)/g, '').trim();
    setNameInput(cleanName || contact.name);
    
    // Detect country code and extract 10 digits
    setContactCountry(getCountryFromPhone(contact.phone));
    setPhoneInput(extractRawPhoneDigits(contact.phone));

    setRelationInput(contact.relation || '');
    setScreenMode('form');
    speak(
      `${contact.name} వివరాలు సవరించండి.`,
      `Editing details for ${contact.name}.`,
      `${contact.name} का विवरण संपादित करें।`,
      `${contact.name} விவரங்களைத் திருத்தவும்.`
    );
  };

  // Cancel and return to list
  const cancelForm = () => {
    playTapSound();
    setScreenMode('list');
    setEditingId(null);
    setNameInput('');
    setPhoneInput('');
    setRelationInput('');
    speak(
      'రద్దు చేసి జాబితాకు తిరిగి వచ్చాము',
      'Cancelled and returned to list',
      'रद्द करके सूची पर वापस आए',
      'ரத்து செய்து பட்டியலுக்குத் திரும்பினோம்'
    );
  };

  // Save Contact handler: prepends selected country code (+91 or +1), supports any custom relationship such as Other
  const handleSaveContact = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    playTapSound();

    const trimmedName = nameInput.trim();
    const rawDigits = phoneInput.trim().replace(/[^0-9]/g, '');
    const tenDigits = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;

    if (!trimmedName) {
      speak(
        'దయచేసి కుటుంబ సభ్యుని పేరు నమోదు చేయండి',
        'Please enter the family member name',
        'कृपया परिवार सदस्य का नाम दर्ज करें',
        'தயவுசெய்து குடும்ப உறுப்பினரின் பெயரை உள்ளிடவும்'
      );
      return;
    }

    if (!tenDigits || tenDigits.length !== 10) {
      speak(
        'దయచేసి 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి',
        'Please enter a 10 digit mobile number',
        'कृपया 10 अंकों का मोबाइल नंबर दर्ज करें',
        'தயவுசெய்து 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்'
      );
      return;
    }

    // Automatically compose complete phone number with selected country code (+91 or +1)
    const fullPhoneNumber = composeFullPhoneNumber(tenDigits, contactCountry);

    // Clean relationship string (preserves custom values like Other, Doctor, Uncle, etc.)
    const cleanRelation = relationInput.trim();

    // Format display name with relationship for easy recognition
    const displayName = trimmedName.includes('(')
      ? trimmedName
      : cleanRelation
        ? `${trimmedName} (${cleanRelation})`
        : trimmedName;

    let updatedContacts: FamilyContact[];

    if (editingId) {
      updatedContacts = contacts.map((c) =>
        c.id === editingId
          ? {
              ...c,
              name: displayName,
              relation: cleanRelation || 'Other',
              phone: fullPhoneNumber,
            }
          : c
      );
    } else {
      const colorIndex = contacts.length % AVATAR_COLORS.length;
      const newContact: FamilyContact = {
        id: `family-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        name: displayName,
        relation: cleanRelation || 'Other',
        phone: fullPhoneNumber,
        avatarColor: AVATAR_COLORS[colorIndex],
      };
      updatedContacts = [...contacts, newContact];
    }

    setContacts(updatedContacts);
    saveStoredContacts(updatedContacts);
    setScreenMode('list');
    setEditingId(null);
    setNameInput('');
    setPhoneInput('');
    setRelationInput('');

    const config = getCountryConfig(contactCountry);
    speak(
      `కుటుంబ సభ్యుని వివరాలు ${config.code} కోడ్‌తో భద్రపరచబడ్డాయి`,
      `Family contact saved with country code ${config.code}`,
      `परिवार सदस्य का विवरण सुरक्षित कर लिया गया है`,
      `குடும்ப உறுப்பினர் விவரங்கள் சேமிக்கப்பட்டன`
    );
  };

  // Delete contact
  const handleConfirmDelete = (id: string) => {
    playTapSound();
    const contactToDelete = contacts.find((c) => c.id === id);
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    saveStoredContacts(updated);
    setDeleteConfirmId(null);
    speak(
      `${contactToDelete ? contactToDelete.name : 'నంబర్'} తొలగించబడింది`,
      `${contactToDelete ? contactToDelete.name : 'Contact'} removed`,
      `${contactToDelete ? contactToDelete.name : 'संपर्क'} हटा दिया गया`,
      `${contactToDelete ? contactToDelete.name : 'தொடர்பு'} நீக்கப்பட்டது`
    );
  };

  // Initial screen speech
  useEffect(() => {
    const greetingTe = contacts.length > 0
      ? `కుటుంబ సభ్యుల పేజీ. ఇందులో ${contacts.length} మంది ఆత్మీయులు ఉన్నారు. కాల్ చేయడానికి వారి పేరు పక్కన ఉన్న ఆకుపచ్చ బటన్ నొక్కండి.`
      : 'కుటుంబ సభ్యుల పేజీ. ఇక్కడ మీ బంధువులు, ఆత్మీయుల ఫోన్ నంబర్లను భద్రపరచవచ్చు.';
    const greetingEn = contacts.length > 0
      ? `Family Contacts page. You have ${contacts.length} contacts saved. Tap the green call button next to their name to call.`
      : 'Family Contacts page. You can save your family and loved ones phone numbers here.';
    const greetingHi = contacts.length > 0
      ? `परिवार संपर्क पेज। आपके पास ${contacts.length} संपर्क सुरक्षित हैं। कॉल करने के लिए नाम के आगे हरा बटन दबाएं।`
      : 'परिवार संपर्क पेज। यहाँ आप अपने परिजनों के फोन नंबर सुरक्षित कर सकते हैं।';
    const greetingTa = contacts.length > 0
      ? `குடும்ப தொடர்புகள் பக்கம். ${contacts.length} தொடர்புகள் உள்ளன. அழைக்க பச்சை பொத்தானை அழுத்தவும்.`
      : 'குடும்ப தொடர்புகள் பக்கம். உங்கள் குடும்பத்தினர் எண்களை இங்கு சேமிக்கலாம்.';
    speak(greetingTe, greetingEn, greetingHi, greetingTa, { delayMs: 300 });
  }, []);

  // -------------------------------------------------------------
  // VIEW 1: DEDICATED SENIOR-FRIENDLY ADD / EDIT SCREEN
  // -------------------------------------------------------------
  if (screenMode === 'form') {
    const isEditing = Boolean(editingId);

    return (
      <div className="p-3 sm:p-5 max-w-2xl mx-auto space-y-4 pb-12">
        {/* Top Navigation: Back Button & Voice Help */}
        <div className="flex items-center justify-between gap-3">
          <button
            id="btn-back-to-family-list"
            type="button"
            onClick={cancelForm}
            className="py-3 px-4 bg-stone-200 hover:bg-stone-300 text-stone-900 rounded-2xl border-2 border-stone-400 font-black text-base flex items-center gap-2 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[3]" />
            <span>{t('btnBack')}</span>
          </button>

          <button
            id="btn-form-voice-help"
            type="button"
            onClick={handleVoiceGuide}
            className="p-3 bg-purple-100 text-purple-950 hover:bg-purple-200 rounded-2xl border-2 border-purple-300 font-bold active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            title={language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'వాయిస్ సహాయం'}
            aria-label={language === 'en' ? 'Listen to Voice Guide' : language === 'hi' ? 'आवाज़ सहायता सुनें' : language === 'ta' ? 'குரல் உதவி கேட்கவும்' : 'సహాయక స్వరం వినండి'}
          >
            <Volume2 className="w-6 h-6 text-purple-900" />
            <span className="text-xs font-black">{language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'వాయిస్ సహాయం'}</span>
          </button>
        </div>

        {/* Screen Title Card */}
        <div 
          id="family-form-header-card"
          className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-4 sm:p-5 rounded-3xl shadow-md border-3 border-purple-900 flex items-center gap-3.5"
        >
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/30 text-2xl shadow-inner">
            {isEditing ? '✏️' : '➕'}
          </div>
          <div>
            <h2 className={`font-black tracking-tight ${isLargeFont ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
              {isEditing ? `${t('btnEdit')} ${t('familyTitle')}` : t('familyAddBtn')}
            </h2>
            <p className="font-semibold text-purple-100 text-xs sm:text-sm mt-0.5">
              {t('familySub')}
            </p>
          </div>
        </div>

        {/* The Simple Senior-Friendly Form */}
        <form 
          id="form-add-edit-family"
          onSubmit={handleSaveContact} 
          className="bg-white p-4 sm:p-6 rounded-3xl border-3 border-purple-300 shadow-lg space-y-5"
        >
          {/* 1. Name Field */}
          <div className="space-y-1.5">
            <label 
              htmlFor="input-family-name" 
              className={`block font-black text-stone-900 flex items-center gap-2 ${isLargeFont ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`}
            >
              <span className="text-purple-700">👤</span>
              <span>{t('familyInputName')}:</span>
            </label>
            <input
              id="input-family-name"
              type="text"
              required
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Name..."
              className="w-full p-4 sm:p-5 border-3 border-stone-300 focus:border-purple-600 focus:bg-purple-50/40 focus:outline-hidden rounded-2xl text-xl sm:text-2xl font-black bg-stone-50 text-stone-950 placeholder:text-stone-400 shadow-inner transition-all"
            />
          </div>

          {/* 2. Reusable Phone Input with 🇮🇳 +91 and 🇺🇸 +1 Country Code System */}
          <PhoneInputFieldWithCountry
            country={contactCountry}
            onCountryChange={setContactCountry}
            phoneDigits={phoneInput}
            onPhoneDigitsChange={setPhoneInput}
            isLargeFont={isLargeFont}
            idPrefix="input-family-phone"
            hasManualOverride={editingId !== null}
          />

          {/* 3. Relation Selection with Custom Relationship Input & Presets */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label 
                htmlFor="input-custom-relation"
                className={`block font-black text-stone-900 flex items-center gap-2 ${isLargeFont ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`}
              >
                <span className="text-rose-600">❤️</span>
                <span>{t('familyInputRelation')}:</span>
              </label>
            </div>

            {/* Direct Editable Relationship input */}
            <div className="space-y-1">
              <input
                id="input-custom-relation"
                type="text"
                value={relationInput}
                onChange={(e) => setRelationInput(e.target.value)}
                placeholder="Relation..."
                className="w-full p-4 sm:p-5 border-3 border-stone-300 focus:border-purple-600 focus:bg-purple-50/40 focus:outline-hidden rounded-2xl text-xl sm:text-2xl font-black bg-stone-50 text-stone-950 placeholder:text-stone-400 shadow-inner transition-all"
              />
            </div>

            {/* Quick Relationship Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {relationPresets.map((rel) => {
                const isSelected = relationInput === rel;
                return (
                  <button
                    key={rel}
                    id={`btn-rel-${rel.replace(/[^a-zA-Z0-9]/g, '-')}`}
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setRelationInput(rel);
                    }}
                    className={`py-2.5 px-3 rounded-xl border-2 font-black text-xs sm:text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-purple-700 text-white border-purple-900 shadow-md scale-[1.02]'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
                    }`}
                  >
                    <span className="truncate">{rel}</span>
                    {isSelected && <Check className="w-4 h-4 stroke-[3] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Large Action Buttons */}
          <div className="pt-4 space-y-3">
            {/* Big Green Save Button */}
            <button
              id="btn-save-family-member"
              type="submit"
              className="w-full py-4 sm:py-5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white font-black rounded-2xl shadow-lg border-3 border-emerald-500 flex items-center justify-center gap-3 text-xl sm:text-2xl transition-all cursor-pointer min-h-[64px]"
            >
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <span>{t('btnSave')}</span>
            </button>

            {/* Cancel Button */}
            <button
              id="btn-cancel-family-member"
              type="button"
              onClick={cancelForm}
              className="w-full py-3.5 px-4 bg-stone-100 hover:bg-stone-200 active:scale-98 text-stone-800 font-bold rounded-2xl border-2 border-stone-300 flex items-center justify-center gap-2 text-base sm:text-lg transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
              <span>{t('btnCancel')}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: SAVED FAMILY MEMBERS LIST AS LARGE EASY-TO-READ CARDS
  // -------------------------------------------------------------
  return (
    <div className="p-3 sm:p-5 max-w-2xl mx-auto space-y-4 pb-12">
      {/* Top Navigation & Audio Help */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
        </div>
        <button
          id="family-voice-guide-btn"
          onClick={handleVoiceGuide}
          type="button"
          className="p-3.5 bg-purple-100 text-purple-950 hover:bg-purple-200 rounded-2xl border-2 border-purple-300 font-bold active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          title={language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'వాయిస్ గైడ్'}
          aria-label={language === 'en' ? 'Voice Guide' : language === 'hi' ? 'आवाज़ सहायता' : language === 'ta' ? 'குரல் உதவி' : 'వాయిస్ సహాయం'}
        >
          <Volume2 className="w-7 h-7 text-purple-900" />
          <span className="hidden sm:inline text-xs font-black">{t('voiceOn')}</span>
        </button>
      </div>

      {/* Screen Title Card */}
      <div 
        id="family-title-card"
        className="bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 text-white p-4 sm:p-5 rounded-3xl shadow-lg border-3 border-purple-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-white/30 text-3xl">
            👨‍👩‍👧
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-black text-white mb-1">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{t('familyTitle')}</span>
            </div>
            <h2 className={`font-black tracking-tight ${isLargeFont ? 'text-3xl' : 'text-2xl'}`}>
              {t('familyTitle')}
            </h2>
            <p className="font-semibold text-purple-100 text-xs sm:text-sm mt-0.5">
              {t('familySub')}
            </p>
          </div>
        </div>

        {/* Top Quick Add Button */}
        <button
          id="btn-header-add-family-member"
          type="button"
          onClick={openAddScreen}
          className="w-full sm:w-auto py-3 px-4.5 bg-white text-purple-950 hover:bg-purple-50 active:scale-95 rounded-2xl font-black text-base shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all border-2 border-white/80 shrink-0"
        >
          <Plus className="w-5 h-5 stroke-[3] text-purple-700" />
          <span>{t('familyAddBtn')}</span>
        </button>
      </div>

      {/* PROMINENT "+ ADD FAMILY MEMBER" BUTTON CARD */}
      <button
        id="btn-add-family-member"
        type="button"
        onClick={openAddScreen}
        className="w-full p-4 sm:p-5 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 hover:bg-purple-100 active:scale-[0.99] border-3 border-dashed border-purple-500 rounded-3xl shadow-sm flex items-center justify-center gap-3 text-purple-950 font-black text-xl sm:text-2xl transition-all cursor-pointer"
      >
        <div className="w-11 h-11 rounded-2xl bg-purple-700 text-white flex items-center justify-center shadow-xs shrink-0">
          <Plus className="w-7 h-7 stroke-[3]" />
        </div>
        <span>{t('familyAddBtn')}</span>
      </button>

      {/* Accidental Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div 
          id="family-delete-confirm-dialog"
          className="bg-rose-50 border-3 border-rose-400 p-4 sm:p-5 rounded-3xl shadow-lg space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-rose-950 text-base sm:text-lg">
                {t('familyDeleteConfirm')}
              </h4>
              <p className="text-xs sm:text-sm font-bold text-rose-800">
                {contacts.find(c => c.id === deleteConfirmId)?.name}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              id="btn-confirm-delete-yes"
              type="button"
              onClick={() => handleConfirmDelete(deleteConfirmId)}
              className="py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black rounded-xl border-2 border-rose-700 transition-all cursor-pointer text-sm sm:text-base"
            >
              {t('btnDelete')}
            </button>
            <button
              id="btn-confirm-delete-cancel"
              type="button"
              onClick={() => {
                playTapSound();
                setDeleteConfirmId(null);
              }}
              className="py-3 px-4 bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-900 font-bold rounded-xl border border-stone-400 transition-all cursor-pointer text-sm sm:text-base"
            >
              {t('btnCancel')}
            </button>
          </div>
        </div>
      )}

      {/* SAVED FAMILY MEMBERS - LARGE EASY-TO-READ CARDS */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className={`font-black text-stone-900 flex items-center gap-2 ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
            <span>{t('familyTitle')} ({contacts.length}):</span>
          </h3>
          <span className="text-xs font-bold text-purple-900 bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200">
            {t('familyCallBtn')}
          </span>
        </div>

        {contacts.length === 0 ? (
          <div 
            id="family-empty-state"
            className="p-8 sm:p-10 bg-white border-3 border-dashed border-purple-300 rounded-3xl text-center space-y-4 shadow-sm"
          >
            <p className="text-5xl">👨‍👩‍👧</p>
            <div className="space-y-1">
              <h4 className="font-black text-stone-900 text-xl sm:text-2xl">
                {t('familyNoContactsNotice')}
              </h4>
              <p className="text-stone-600 text-sm sm:text-base font-bold max-w-md mx-auto">
                {t('familySub')}
              </p>
            </div>
            <button
              id="btn-empty-add-family-member"
              type="button"
              onClick={openAddScreen}
              className="py-4 px-6 bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-black text-lg sm:text-xl rounded-2xl shadow-md cursor-pointer transition-all inline-flex items-center gap-2.5 border-2 border-purple-900"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
              <span>{t('familyAddBtn')}</span>
            </button>
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.id}
              id={`family-card-${contact.id}`}
              className="bg-white p-4 sm:p-5 rounded-3xl border-3 border-stone-200 hover:border-purple-300 shadow-md space-y-4 transition-all"
            >
              {/* Member Details: Avatar, Name, Relationship, Phone & Edit/Delete actions */}
              <div className="flex items-start justify-between border-b pb-3.5 border-stone-100 gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Large Avatar */}
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-md shrink-0 ${contact.avatarColor || 'bg-purple-600'}`}
                  >
                    {contact.name.charAt(0)}
                  </div>
                  
                  {/* Name, Relation & Phone */}
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`font-black text-stone-950 leading-tight truncate ${
                        isLargeFont ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                      }`}
                    >
                      {contact.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {contact.relation && (
                        <span className="text-xs font-black bg-purple-100 text-purple-950 px-2.5 py-0.5 rounded-full border border-purple-200">
                          {contact.relation}
                        </span>
                      )}
                      <span className="text-stone-800 font-bold font-mono text-base sm:text-lg">
                        📞 {formatPhoneNumber(contact.phone, true)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id={`btn-edit-family-${contact.id}`}
                    type="button"
                    onClick={() => openEditScreen(contact)}
                    className="p-3 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 rounded-xl border border-stone-300 cursor-pointer flex items-center gap-1"
                    title={t('btnEdit')}
                    aria-label={`${contact.name} ${t('btnEdit')}`}
                  >
                    <Edit2 className="w-4 h-4 text-purple-700" />
                    <span className="text-xs font-black hidden sm:inline">{t('btnEdit')}</span>
                  </button>

                  <button
                    id={`btn-delete-family-${contact.id}`}
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setDeleteConfirmId(contact.id);
                      speakInLanguage(`${contact.name}`, language);
                    }}
                    className="p-3 bg-stone-100 hover:bg-rose-100 active:scale-95 text-rose-700 rounded-xl border border-stone-300 hover:border-rose-300 cursor-pointer"
                    title={t('btnDelete')}
                    aria-label={`${contact.name} ${t('btnDelete')}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* VERY LARGE, PROMINENT SENIOR-FRIENDLY "CALL" BUTTON */}
              <div>
                <a
                  id={`btn-call-family-${contact.id}`}
                  href={`tel:${getDialableNumber(contact.phone)}`}
                  onClick={(e) => {
                    handleCall(contact, e);
                  }}
                  className="w-full py-4 sm:py-5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white font-black rounded-2xl shadow-lg border-3 border-emerald-500 flex items-center justify-center gap-3.5 text-2xl sm:text-3xl transition-all cursor-pointer min-h-[64px] sm:min-h-[72px]"
                  aria-label={`${contact.name} ${t('familyCallBtn')}`}
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center shadow-xs shrink-0">
                    <Phone className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <span className="tracking-wide">{t('familyCallBtn')}</span>
                </a>
              </div>

              {/* Secondary WhatsApp Quick Chat */}
              <div className="pt-0.5">
                <button
                  id={`btn-whatsapp-family-${contact.id}`}
                  type="button"
                  onClick={() => handleWhatsApp(contact)}
                  className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 active:scale-98 text-emerald-950 border border-emerald-300 font-bold rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t('familyWhatsAppBtn')}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Senior-Friendly Dialer Feedback Modal / Prompt */}
      {activeCallingContact && (
        <div 
          id="family-calling-modal"
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
                id="btn-reopen-family-dialer"
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
                id="btn-close-family-dialer-modal"
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

      {/* Bottom Sticky Home Button */}
      <div className="pt-2">
        <HomeButton onGoHome={onGoHome} isLargeFont={isLargeFont} />
      </div>
    </div>
  );
};
