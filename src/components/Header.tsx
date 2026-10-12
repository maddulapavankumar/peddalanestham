import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Type, Wifi, Battery, BatteryCharging, ShieldAlert, Car, Home, Globe } from 'lucide-react';
import { playTapSound, speakInLanguage } from '../utils/audio';
import { ScreenType } from '../types';
import { useLanguage, LANGUAGES } from '../utils/i18n';
import { LanguageSelectorModal } from './LanguageSelectorModal';

interface HeaderProps {
  isLargeFont: boolean;
  onToggleFontSize: () => void;
  isVoiceOn?: boolean;
  onToggleVoice?: () => void;
  title?: string;
  tagline?: string;
  onQuickSos?: () => void;
  currentScreen?: ScreenType;
  onOpenDriverPortal?: () => void;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isLargeFont,
  onToggleFontSize,
  isVoiceOn = true,
  onToggleVoice,
  title,
  tagline,
  onQuickSos,
  currentScreen = 'home',
  onOpenDriverPortal,
  onGoHome,
}) => {
  const { language, t } = useLanguage();
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  const displayTitle = title || t('appName');
  const displayTagline = tagline || t('appTagline');

  // Live real device battery detection using Web Battery Status API
  useEffect(() => {
    let batteryInstance: any = null;

    const handleBatteryUpdate = () => {
      if (batteryInstance) {
        setBatteryLevel(Math.round(batteryInstance.level * 100));
        setIsCharging(Boolean(batteryInstance.charging));
      }
    };

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any)
        .getBattery?.()
        .then((b: any) => {
          batteryInstance = b;
          handleBatteryUpdate();
          b.addEventListener('levelchange', handleBatteryUpdate);
          b.addEventListener('chargingchange', handleBatteryUpdate);
        })
        .catch(() => {
          // If permission is denied or unsupported, batteryLevel remains null
        });
    }

    return () => {
      if (batteryInstance) {
        batteryInstance.removeEventListener('levelchange', handleBatteryUpdate);
        batteryInstance.removeEventListener('chargingchange', handleBatteryUpdate);
      }
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      let ampm = t('morning');
      if (language === 'en') {
        ampm = hours >= 12 ? 'PM' : 'AM';
      } else {
        ampm = hours >= 12 ? t('evening') : t('morning');
      }
      const formattedHours = (hours % 12 || 12).toString().padStart(2, '0');
      setCurrentTime(`${ampm} ${formattedHours}:${minutes}`);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [language, t]);

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <>
      <header className="bg-gradient-to-r from-red-700 via-red-800 to-rose-900 text-white shadow-md">
        {/* Android Status Bar Simulation */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-black/25 text-xs tracking-wide text-white/90 border-b border-white/10">
          <div className="flex items-center gap-2 font-medium">
            <span>{currentTime || '09:30'}</span>
            <span className="text-[10px] bg-red-600/80 px-1.5 py-0.5 rounded text-white">{t('android')}</span>
          </div>
          <div className="flex items-center gap-3">
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center gap-1" title={batteryLevel != null ? `${t('battery')}: ${batteryLevel}%` : t('battery')}>
              {batteryLevel != null && (
                <span className="text-[10px] font-mono">{batteryLevel}%</span>
              )}
              {isCharging ? (
                <BatteryCharging className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Battery className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
        </div>

        {/* Main App Brand Header */}
        <div className="px-4 pt-3 pb-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1
                id="app-main-title"
                className={`font-black tracking-tight drop-shadow-sm truncate ${
                  isLargeFont ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-3xl'
                }`}
              >
                {displayTitle}
              </h1>
              <p
                id="app-tagline"
                className={`font-medium text-amber-200/95 drop-shadow-sm mt-0.5 truncate ${
                  isLargeFont ? 'text-xs sm:text-base' : 'text-xs sm:text-sm'
                }`}
              >
                {displayTagline}
              </p>
            </div>

            {/* Quick Access Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Voice ON/OFF Toggle Button */}
              {onToggleVoice && (
                <button
                  id="voice-toggle-btn"
                  onClick={() => {
                    playTapSound();
                    onToggleVoice();
                  }}
                  type="button"
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all active:scale-95 shadow-sm cursor-pointer ${
                    isVoiceOn
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-300 ring-1 ring-emerald-300'
                      : 'bg-stone-900/90 hover:bg-stone-800 text-stone-200 border-white/30'
                  }`}
                  title={isVoiceOn ? t('voiceOnTitle') : t('voiceOffTitle')}
                  aria-label={isVoiceOn ? t('voiceOnAria') : t('voiceOffAria')}
                >
                  {isVoiceOn ? (
                    <>
                      <Volume2 className="w-4 h-4 text-emerald-100 animate-pulse shrink-0" />
                      <span className="whitespace-nowrap font-black">{t('voiceOn')}</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4 text-rose-300 shrink-0" />
                      <span className="whitespace-nowrap font-black text-rose-200">{t('voiceOff')}</span>
                    </>
                  )}
                </button>
              )}

              {/* Font Size Toggle Button */}
              <button
                id="font-size-toggle-btn"
                onClick={() => {
                  playTapSound();
                  onToggleFontSize();
                }}
                type="button"
                className="flex items-center gap-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border border-white/20 transition-all cursor-pointer"
                title={t('fontToggleTitle')}
              >
                <Type className="w-4 h-4 text-amber-300" />
                <span>{isLargeFont ? t('fontNormal') : t('fontLarge')}</span>
              </button>

              {/* Quick SOS Badge Button */}
              {onQuickSos && (
                <button
                  id="quick-sos-header-btn"
                  onClick={() => {
                    playTapSound();
                    onQuickSos();
                  }}
                  type="button"
                  className="flex items-center gap-1 bg-amber-400 text-stone-950 hover:bg-amber-300 active:scale-95 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black border border-amber-300 shadow-sm transition-all cursor-pointer"
                  title={t('quickSos')}
                >
                  <ShieldAlert className="w-4 h-4 text-red-700" />
                  <span>SOS</span>
                </button>
              )}

              {/* Auto Driver Portal Quick Switch */}
              {currentScreen === 'driver' ? (
                onGoHome && (
                  <button
                    id="header-back-home-btn"
                    onClick={() => {
                      playTapSound();
                      speakInLanguage(t('voiceNavHome'), language);
                      onGoHome();
                    }}
                    type="button"
                    className="flex items-center gap-1 bg-amber-400 text-stone-950 hover:bg-amber-300 active:scale-95 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black border border-amber-300 shadow-sm transition-all cursor-pointer"
                    title={t('home')}
                  >
                    <Home className="w-4 h-4 text-stone-950" />
                    <span>{t('home')}</span>
                  </button>
                )
              ) : (
                onOpenDriverPortal && (
                  <button
                    id="header-driver-mode-btn"
                    onClick={() => {
                      playTapSound();
                      speakInLanguage(t('voiceDriverPortal'), language);
                      onOpenDriverPortal();
                    }}
                    type="button"
                    className="flex items-center gap-1 bg-amber-400/20 hover:bg-amber-400/30 active:scale-95 text-amber-200 hover:text-white px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border border-amber-400/40 transition-all cursor-pointer"
                    title={t('driverMode')}
                  >
                    <Car className="w-4 h-4 text-amber-300" />
                    <span className="hidden sm:inline">{t('driverMode')}</span>
                    <span className="sm:hidden">{t('driverModeShort')}</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Prominent "🌐 భాష / Language" Button Bar */}
          <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between gap-2">
            <button
              id="header-language-selection-btn"
              onClick={() => {
                playTapSound();
                setIsLangModalOpen(true);
              }}
              type="button"
              className="flex-1 flex items-center justify-between bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-stone-950 px-3.5 py-1.5 sm:py-2 rounded-xl font-black text-xs sm:text-sm border-2 border-amber-200 shadow-sm transition-all cursor-pointer"
              title={t('selectLanguageTitle')}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-red-800 stroke-[2.5]" />
                <span className="tracking-wide">
                  {language === 'en' ? '🌐 Language' : language === 'hi' ? '🌐 भाषा (Language)' : language === 'ta' ? '🌐 மொழி (Language)' : '🌐 భాష / Language'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-stone-950 text-amber-300 px-2 py-0.5 rounded-lg text-xs font-bold shadow-inner">
                <span>{currentLangObj.name}</span>
                <span className="text-[10px] text-amber-100/70">({currentLangObj.englishName})</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
      />
    </>
  );
};
