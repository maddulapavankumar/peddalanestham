import React from 'react';
import { Check, Globe, X } from 'lucide-react';
import { LANGUAGES, Language, useLanguage } from '../utils/i18n';
import { playTapSound } from '../utils/audio';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { language, setLanguage, t } = useLanguage();

  if (!isOpen) return null;

  const handleSelectLanguage = (code: Language) => {
    playTapSound();
    setLanguage(code);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border-4 border-amber-400 overflow-hidden text-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-700 via-red-800 to-rose-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
              <Globe className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 id="language-modal-title" className="text-xl font-black leading-tight text-white drop-shadow-xs">
                {t('selectLanguageTitle')}
              </h2>
              <p className="text-xs text-amber-200/90 font-medium mt-0.5">
                {t('selectLanguageSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Languages List */}
        <div className="p-4 space-y-3 bg-amber-50/50 max-h-[70vh] overflow-y-auto">
          {LANGUAGES.map((item) => {
            const isSelected = language === item.code;
            return (
              <button
                key={item.code}
                id={`lang-option-${item.code}`}
                type="button"
                onClick={() => handleSelectLanguage(item.code)}
                className={`w-full p-4 rounded-2xl border-3 flex items-center justify-between text-left transition-all active:scale-[0.98] cursor-pointer shadow-xs ${
                  isSelected
                    ? 'bg-amber-100 border-red-600 ring-2 ring-red-400 shadow-md'
                    : 'bg-white hover:bg-stone-50 border-stone-200'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-lg font-black text-red-700 border border-stone-200">
                    {item.code.toUpperCase()}
                  </span>
                  <div>
                    <div className="text-xl font-black text-stone-900 leading-tight">
                      {item.name}
                    </div>
                    <div className="text-sm font-semibold text-stone-500 mt-0.5">
                      {item.englishName}
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <div className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xs">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{t('selected')}</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-stone-300" />
                )}
              </button>
            );
          })}
        </div>

        {/* Close Button Footer */}
        <div className="p-3 bg-stone-100 border-t border-stone-200 text-center">
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-sm transition-all active:scale-95 cursor-pointer"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
