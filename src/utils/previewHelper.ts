/**
 * Detection helper for Google AI Studio Preview (iframe) and iOS Safari environments.
 */

export const isInsideIframePreview = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin iframe throws SecurityError when checking window.top
    return true;
  }
};

export const isAiStudioPreview = (): boolean => {
  if (typeof window === 'undefined') return false;
  const inIframe = isInsideIframePreview();
  const host = (window.location && window.location.hostname) || '';
  const isCloudRunDev = host.includes('run.app') || host.includes('aistudio') || host.includes('google');
  return inIframe || (isCloudRunDev && inIframe);
};

export const isIosDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const isSafariBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Safari/.test(ua) && !/Chrome|CriOS|Android/.test(ua);
};

export const getStandaloneUrl = (): string => {
  if (typeof window === 'undefined') return '';
  return window.location.href;
};
