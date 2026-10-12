/**
 * Senior-friendly Audio Feedback Utilities using Web Audio API and Speech Synthesis
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// Gentle pleasant tactile tap sound
export function playTapSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Ignore audio failures safely
  }
}

// Emergency alert siren generator
let sirenInterval: number | null = null;
let sirenOsc: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;

// Cached Blob URL for HTML5 Audio emergency buzzer element fallback
let cachedBuzzerWavBlobUrl: string | null = null;

function getEmergencyBuzzerBlobUrl(): string {
  if (cachedBuzzerWavBlobUrl) return cachedBuzzerWavBlobUrl;
  try {
    const sampleRate = 22050;
    const duration = 1.48;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Int16Array(numSamples);

    // 4 intense emergency buzzer bursts
    const pulses = [
      [0.0, 0.28],
      [0.36, 0.64],
      [0.72, 1.00],
      [1.08, 1.46],
    ];

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let inPulse = false;
      for (const [start, end] of pulses) {
        if (t >= start && t <= end) {
          inPulse = true;
          break;
        }
      }
      if (!inPulse) {
        buffer[i] = 0;
        continue;
      }

      // Piercing buzzer tone with rich square & sawtooth harmonics + electrical buzzer buzz
      const buzz = Math.sin(2 * Math.PI * 50 * t);
      const modFreq = 860 + 60 * buzz;
      const waveSquare = Math.sin(2 * Math.PI * modFreq * t) >= 0 ? 1 : -1;
      const waveSaw = (2 * ((t * 1280) % 1)) - 1;
      const sample = 0.65 * waveSquare + 0.35 * waveSaw;
      buffer[i] = Math.floor(sample * 27000);
    }

    const wavBytes = 44 + numSamples * 2;
    const arrayBuffer = new ArrayBuffer(wavBytes);
    const view = new DataView(arrayBuffer);

    // RIFF identifier
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, wavBytes - 8, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // "fmt " chunk
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    // "data" chunk
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, numSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      view.setInt16(offset, buffer[i], true);
      offset += 2;
    }

    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    cachedBuzzerWavBlobUrl = URL.createObjectURL(blob);
    return cachedBuzzerWavBlobUrl;
  } catch {
    return '';
  }
}

/**
 * Plays a clear, loud emergency buzzer / alert sound on the user's phone immediately after SOS is activated.
 * Generates an unmistakable, high-penetration emergency buzzer pattern with dual frequencies
 * and harmonic buzz. Uses dual-engine playback (Web Audio API synthesis + HTML5 Audio fallback)
 * to guarantee that the buzzer is actually audible and never silent, muted, cut off, or skipped.
 */
export function playSosAlertSound() {
  try {
    // 1. Primary Engine: High-volume Web Audio API dual-oscillator buzzer with compressor
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime + 0.01;
      const bursts = [
        [0.0, 0.28],
        [0.36, 0.64],
        [0.72, 1.00],
        [1.08, 1.46],
      ];

      // Compressor to avoid distortion and boost perceived alarm loudness on phone speakers
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-10, now);
      comp.knee.setValueAtTime(4, now);
      comp.ratio.setValueAtTime(8, now);
      comp.attack.setValueAtTime(0.002, now);
      comp.release.setValueAtTime(0.04, now);
      comp.connect(ctx.destination);

      for (const [startOffset, endOffset] of bursts) {
        const start = now + startOffset;
        const stop = now + endOffset;

        // Osc 1: Sharp square wave (860 Hz - loud piercing alarm buzzer tone)
        const osc1 = ctx.createOscillator();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(860, start);
        osc1.frequency.linearRampToValueAtTime(920, stop);

        // Osc 2: Harmonic sawtooth wave (1280 Hz - distinctive emergency distress overtone)
        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(1280, start);

        // Sub buzz LFO for rasping mechanical buzzer timbre
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sawtooth';
        lfo.frequency.setValueAtTime(50, start);
        lfoGain.gain.setValueAtTime(35, start);
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);

        const burstGain = ctx.createGain();
        burstGain.gain.setValueAtTime(0.001, start);
        burstGain.gain.linearRampToValueAtTime(0.88, start + 0.012);
        burstGain.gain.setValueAtTime(0.88, stop - 0.02);
        burstGain.gain.exponentialRampToValueAtTime(0.001, stop);

        osc1.connect(burstGain);
        osc2.connect(burstGain);
        burstGain.connect(comp);

        lfo.start(start);
        osc1.start(start);
        osc2.start(start);
        lfo.stop(stop);
        osc1.stop(stop);
        osc2.stop(stop);
      }
    }

    // 2. Secondary Engine: HTML5 Audio element fallback using pre-rendered emergency buzzer WAV
    // Ensures audio plays through the OS media channel even if AudioContext was suspended or restricted
    try {
      const blobUrl = getEmergencyBuzzerBlobUrl();
      if (blobUrl) {
        const audio = new Audio(blobUrl);
        audio.volume = 1.0;
        audio.play().catch(() => {
          // Handled gracefully if browser restricted
        });
      }
    } catch {
      // ignore
    }

    // 3. Physical haptic vibration pattern matching the 4 emergency buzzer pulses
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([280, 80, 280, 80, 280, 80, 380]);
      } catch {
        // ignore
      }
    }
  } catch {
    // Ignore safely
  }
}

export function startEmergencySiren() {
  try {
    stopEmergencySiren();
    const ctx = getAudioContext();
    if (!ctx) return;

    sirenOsc = ctx.createOscillator();
    sirenGain = ctx.createGain();
    
    sirenOsc.type = 'sawtooth';
    sirenOsc.frequency.setValueAtTime(650, ctx.currentTime);
    
    sirenGain.gain.setValueAtTime(0.3, ctx.currentTime);
    
    sirenOsc.connect(sirenGain);
    sirenGain.connect(ctx.destination);
    sirenOsc.start();

    let high = false;
    sirenInterval = window.setInterval(() => {
      if (sirenOsc && ctx) {
        high = !high;
        sirenOsc.frequency.setTargetAtTime(high ? 950 : 600, ctx.currentTime, 0.1);
      }
    }, 450);
  } catch {
    // Graceful fallback
  }
}

export function stopEmergencySiren() {
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
  if (sirenOsc) {
    try {
      sirenOsc.stop();
      sirenOsc.disconnect();
    } catch {
      // ignore
    }
    sirenOsc = null;
  }
  if (sirenGain) {
    try {
      sirenGain.disconnect();
    } catch {
      // ignore
    }
    sirenGain = null;
  }
}

// Active HTML5 Audio element for natural, smooth, studio-quality Telugu voice playback
let currentAudioElement: HTMLAudioElement | null = null;

function getGlobalAudioElement(): HTMLAudioElement {
  if (!currentAudioElement && typeof window !== 'undefined') {
    currentAudioElement = new Audio();
    // Enable seamless iOS Safari inline playback
    currentAudioElement.setAttribute('playsinline', 'true');
    currentAudioElement.preload = 'auto';
  }
  return currentAudioElement!;
}

// Speak text using browser speech synthesis as a pristine fallback
let cachedVoices: SpeechSynthesisVoice[] = [];

const VOICE_STORAGE_KEY = 'peddala_nestham_voice_enabled';

// Initialize voice state from localStorage (default: true)
let isVoiceActive: boolean = true;
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(VOICE_STORAGE_KEY);
    if (saved !== null) {
      isVoiceActive = saved === 'true';
    }
  } catch {
    isVoiceActive = true;
  }
}

export function isVoiceEnabled(): boolean {
  return isVoiceActive;
}

export function setVoiceEnabled(enabled: boolean): void {
  isVoiceActive = enabled;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(VOICE_STORAGE_KEY, String(enabled));
    }
  } catch {
    // ignore
  }
  if (!enabled) {
    stopSpeaking();
  }
}

export function toggleVoiceEnabled(): boolean {
  const nextVal = !isVoiceActive;
  setVoiceEnabled(nextVal);
  return nextVal;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices();
    } catch {
      // ignore
    }
  };
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

export type AudioLanguage = 'te' | 'en' | 'hi' | 'ta';

let currentAudioLanguage: AudioLanguage = 'te';

export function setAudioLanguage(lang: AudioLanguage) {
  currentAudioLanguage = lang;
}

export function getAudioLanguage(): AudioLanguage {
  return currentAudioLanguage;
}

export function findBestVoiceForLanguage(lang: AudioLanguage): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const femaleKeywords = /female|woman|girl|lady|shruthi|shruti|chitra|swara|vani|aditi|priya|veena|lekha|shreya|ananya|heera|neerja|kavya|sangeeta|kalpana|sunita|geeta|maya|samantha|zira|kavita|kalpana|tef|hif|taf/i;
  const maleKeywords = /male|man|boy|guy|david|ravi|george|mark|mohan|hemanth|madhav|tem|him|tam/i;

  const langCode = lang === 'te' ? 'te' : lang === 'hi' ? 'hi' : lang === 'ta' ? 'ta' : 'en';

  // 1. Language-matched female voice
  const matchedFemale = voices.find(v => {
    const isLang = v.lang.toLowerCase().startsWith(langCode);
    return isLang && femaleKeywords.test(v.name) && !maleKeywords.test(v.name);
  });
  if (matchedFemale) return matchedFemale;

  // 2. Language-matched non-male voice
  const matchedNonMale = voices.find(v => {
    const isLang = v.lang.toLowerCase().startsWith(langCode);
    return isLang && !maleKeywords.test(v.name);
  });
  if (matchedNonMale) return matchedNonMale;

  // 3. Any voice of that language
  const anyLang = voices.find(v => v.lang.toLowerCase().startsWith(langCode));
  if (anyLang) return anyLang;

  // Fallback to Telugu or default
  return findBestFemaleTeluguVoice();
}

export function findBestFemaleTeluguVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const femaleKeywords = /female|woman|girl|lady|shruthi|shruti|chitra|swara|vani|aditi|priya|veena|lekha|shreya|ananya|heera|neerja|kavya|sangeeta|kalpana|sunita|geeta|maya|tef/i;
  const maleKeywords = /male|man|boy|guy|david|ravi|george|mark|mohan|hemanth|madhav|tem/i;

  // 1. Direct Telugu voice explicitly female or known female name (e.g. Microsoft Shruthi, te-in-x-tef)
  const teluguFemale = voices.find(v => {
    const isTe = v.lang.startsWith('te') || v.lang.includes('te-IN') || v.name.toLowerCase().includes('telugu');
    return isTe && femaleKeywords.test(v.name) && !maleKeywords.test(v.name);
  });
  if (teluguFemale) return teluguFemale;

  // 2. Direct Telugu voice not explicitly male (Google Telugu on Chrome & Android is a high quality female voice)
  const teluguNonMale = voices.find(v => {
    const isTe = v.lang.startsWith('te') || v.lang.includes('te-IN') || v.name.toLowerCase().includes('telugu');
    return isTe && !maleKeywords.test(v.name);
  });
  if (teluguNonMale) return teluguNonMale;

  // 3. Any Telugu voice
  const anyTelugu = voices.find(v => 
    v.lang.startsWith('te') || v.lang.includes('te-IN') || v.name.toLowerCase().includes('telugu')
  );
  if (anyTelugu) return anyTelugu;

  // 4. Indian language female voice (natural Indic phoneme articulation)
  const indianFemale = voices.find(v => {
    const isIndian = /IN$/i.test(v.lang) || /india/i.test(v.name);
    return isIndian && femaleKeywords.test(v.name) && !maleKeywords.test(v.name);
  });
  if (indianFemale) return indianFemale;

  // 5. Any female voice
  const anyFemale = voices.find(v => femaleKeywords.test(v.name) && !maleKeywords.test(v.name));
  if (anyFemale) return anyFemale;

  // 6. Default voice
  return voices.find(v => v.default) || voices[0] || null;
}

export interface SpeakOptions {
  stopPrevious?: boolean;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
  delayMs?: number;
  lang?: AudioLanguage;
}

let currentSpeechSessionId = 0;
let currentTimerId: number | null = null;
const persistentUtterances = new Set<SpeechSynthesisUtterance>();

export function stopSpeaking() {
  currentSpeechSessionId++;
  if (currentTimerId !== null) {
    clearTimeout(currentTimerId);
    currentTimerId = null;
  }
  persistentUtterances.clear();

  // Stop HTML5 Audio if currently playing
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
      currentAudioElement.onended = null;
      currentAudioElement.onerror = null;
    } catch {
      // ignore
    }
  }

  // Stop browser SpeechSynthesis
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export function isSpeaking(): boolean {
  if (typeof window === 'undefined') return false;
  const isAudioPlaying = currentAudioElement ? !currentAudioElement.paused && currentAudioElement.currentTime > 0 : false;
  const isSynthSpeaking = ('speechSynthesis' in window) ? window.speechSynthesis.speaking : false;
  return isAudioPlaying || isSynthSpeaking || persistentUtterances.size > 0 || currentTimerId !== null;
}

/**
 * Splits longer text into whole, complete sentences without chopping mid-sentence at colons or commas.
 * Sentences are only divided at true sentence boundaries (. ! ? । or newlines)
 * so that each sentence is spoken completely and smoothly from beginning to end.
 */
function splitIntoCompleteSentences(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];
  const clean = rawText.trim();

  // If text is under 180 characters, keep it as one continuous sentence with natural flow
  if (clean.length <= 180) {
    return [clean];
  }

  // Split strictly on true sentence boundaries (. ! ? । \n), never mid-sentence or at commas
  const parts = clean
    .split(/(?<=[.!?।\n])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return [clean];
  }

  const combined: string[] = [];
  let current = "";
  for (const part of parts) {
    if (!current) {
      current = part;
    } else if ((current + " " + part).length <= 180) {
      current = current + " " + part;
    } else {
      combined.push(current);
      current = part;
    }
  }
  if (current) combined.push(current);

  return combined.length > 0 ? combined : [clean];
}

/**
 * Fallback synthesizer for speech when offline or if audio streaming is unavailable.
 * Strictly uses natural pitch (1.0) and comfortable, natural medium speed (1.0) without trembling, stuttering, or dragging.
 */
function speakFallbackWithSpeechSynthesis(
  text: string, 
  sessionId: number, 
  rate: number, 
  pitch: number, 
  lang: AudioLanguage = 'te',
  onEnd?: () => void
) {
  if (sessionId !== currentSpeechSessionId || !isVoiceActive) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.resume();
  } catch {
    // ignore
  }

  const sentences = splitIntoCompleteSentences(text);
  if (sentences.length === 0) {
    if (onEnd) onEnd();
    return;
  }

  const selectedVoice = findBestVoiceForLanguage(lang);
  let currentIdx = 0;

  // Keep-alive timer for Chrome SpeechSynthesis bug (preventing pauses on long speech)
  let keepAliveInterval: number | null = null;
  const startKeepAlive = () => {
    if (keepAliveInterval !== null) return;
    keepAliveInterval = window.setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else if (keepAliveInterval !== null) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
    }, 4500);
  };
  const stopKeepAlive = () => {
    if (keepAliveInterval !== null) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
  };

  const speakNext = () => {
    if (sessionId !== currentSpeechSessionId || !isVoiceActive) {
      stopKeepAlive();
      return;
    }

    if (currentIdx >= sentences.length) {
      stopKeepAlive();
      persistentUtterances.clear();
      if (onEnd) onEnd();
      return;
    }

    const sentenceText = sentences[currentIdx];
    currentIdx++;

    try {
      const utterance = new SpeechSynthesisUtterance(sentenceText);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.lang = lang === 'te' ? 'te-IN' : lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-IN';
      // Clean, warm pitch: 1.0
      utterance.pitch = pitch;
      // Comfortable natural medium speed: 1.0 (clear, steady, easy to understand for seniors)
      utterance.rate = rate;
      utterance.volume = 1.0;

      persistentUtterances.add(utterance);
      startKeepAlive();

      let isCompleted = false;
      const completeSentence = () => {
        if (isCompleted) return;
        isCompleted = true;
        persistentUtterances.delete(utterance);

        if (sessionId !== currentSpeechSessionId) {
          stopKeepAlive();
          return;
        }

        // Natural short pause only at sentence boundaries (200ms)
        if (currentIdx < sentences.length) {
          currentTimerId = window.setTimeout(() => {
            currentTimerId = null;
            speakNext();
          }, 200);
        } else {
          stopKeepAlive();
          speakNext();
        }
      };

      utterance.onend = completeSentence;
      utterance.onerror = completeSentence;

      // Generous safety timeout so speech is never cut off
      const maxSafetyMs = Math.max(15000, sentenceText.length * 600 + 8000);
      setTimeout(() => {
        if (!isCompleted && sessionId === currentSpeechSessionId) {
          completeSentence();
        }
      }, maxSafetyMs);

      window.speechSynthesis.speak(utterance);
    } catch {
      speakNext();
    }
  };

  speakNext();
}

/**
 * Speaks text using a clear, smooth, steady, and natural Telugu female voice.
 * Primary: High-fidelity natural female Telugu neural TTS audio stream via /api/tts.
 * Fallback: Cleaned-up, artifact-free browser speech synthesis with 1.0 pitch and steady cadence.
 */
export function speakTelugu(text: string, options?: SpeakOptions) {
  // If voice is turned OFF, completely stop and do not speak
  if (!isVoiceActive) return;
  if (!text || !text.trim()) return;

  const cleanText = text.trim();

  const {
    stopPrevious = true,
    rate = 1.0, // Comfortable, natural medium speed (clear, steady, easy to understand for senior citizens)
    pitch = 1.0,  // Natural warm pitch
    onEnd,
    delayMs = 0,
    lang,
  } = options || {};

  const targetLang: AudioLanguage = lang || currentAudioLanguage;

  if (stopPrevious) {
    stopSpeaking();
  }

  const sessionId = ++currentSpeechSessionId;

  const startPlayback = () => {
    if (sessionId !== currentSpeechSessionId || !isVoiceActive) return;

    const sentences = splitIntoCompleteSentences(cleanText);
    if (sentences.length === 0) {
      if (onEnd) onEnd();
      return;
    }

    let sentenceIdx = 0;

    const playNextSentence = () => {
      if (sessionId !== currentSpeechSessionId || !isVoiceActive) return;

      if (sentenceIdx >= sentences.length) {
        if (onEnd) onEnd();
        return;
      }

      const currentSentence = sentences[sentenceIdx];
      sentenceIdx++;

      // 1. Primary Engine: High-fidelity smooth neural TTS audio stream via /api/tts
      if (typeof window !== 'undefined') {
        try {
          const audio = getGlobalAudioElement();
          
          // Stop any currently playing audio
          audio.pause();
          audio.currentTime = 0;
          
          const ttsUrl = `/api/tts?text=${encodeURIComponent(currentSentence)}&tl=${encodeURIComponent(targetLang)}`;
          audio.src = ttsUrl;
          
          // Preserve natural vocal pitch so voice stays warm, clear and non-metallic
          if ('preservesPitch' in audio) {
            (audio as any).preservesPitch = true;
          } else if ('mozPreservesPitch' in audio) {
            (audio as any).mozPreservesPitch = true;
          } else if ('webkitPreservesPitch' in audio) {
            (audio as any).webkitPreservesPitch = true;
          }

          // Comfortable natural medium speed (1.0) without distortion or dragging
          audio.defaultPlaybackRate = rate;
          audio.playbackRate = rate;
          audio.volume = 1.0;

          audio.onplay = () => {
            audio.playbackRate = rate;
          };

          let sentenceDone = false;
          const handleSentenceEnd = () => {
            if (sentenceDone) return;
            sentenceDone = true;
            audio.onended = null;
            audio.onerror = null;

            if (sessionId !== currentSpeechSessionId || !isVoiceActive) return;

            // Natural short pause only at sentence boundaries (200ms)
            if (sentenceIdx < sentences.length) {
              currentTimerId = window.setTimeout(() => {
                currentTimerId = null;
                playNextSentence();
              }, 200);
            } else {
              if (onEnd) onEnd();
            }
          };

          audio.onended = handleSentenceEnd;

          audio.onerror = () => {
            if (sentenceDone) return;
            sentenceDone = true;
            audio.onended = null;
            audio.onerror = null;
            // Fallback to browser SpeechSynthesis for this sentence
            speakFallbackWithSpeechSynthesis(currentSentence, sessionId, rate, pitch, targetLang, () => {
              if (sentenceIdx < sentences.length) {
                currentTimerId = window.setTimeout(() => {
                  currentTimerId = null;
                  playNextSentence();
                }, 200);
              } else {
                if (onEnd) onEnd();
              }
            });
          };

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // If autoplay was blocked or media error, fallback cleanly to speech synthesis
              if (sentenceDone) return;
              sentenceDone = true;
              audio.onended = null;
              audio.onerror = null;
              speakFallbackWithSpeechSynthesis(currentSentence, sessionId, rate, pitch, targetLang, () => {
                if (sentenceIdx < sentences.length) {
                  currentTimerId = window.setTimeout(() => {
                    currentTimerId = null;
                    playNextSentence();
                  }, 200);
                } else {
                  if (onEnd) onEnd();
                }
              });
            });
          }
          return;
        } catch {
          // Fallback below
        }
      }

      // 2. Fallback Engine: Pristine browser speech synthesis
      speakFallbackWithSpeechSynthesis(currentSentence, sessionId, rate, pitch, targetLang, () => {
        if (sentenceIdx < sentences.length) {
          currentTimerId = window.setTimeout(() => {
            currentTimerId = null;
            playNextSentence();
          }, 200);
        } else {
          if (onEnd) onEnd();
        }
      });
    };

    playNextSentence();
  };

  if (delayMs > 0) {
    currentTimerId = window.setTimeout(() => {
      currentTimerId = null;
      startPlayback();
    }, delayMs);
  } else {
    startPlayback();
  }
}

export function speakInLanguage(text: string, lang?: AudioLanguage, options?: SpeakOptions) {
  return speakTelugu(text, { ...options, lang: lang || currentAudioLanguage });
}
