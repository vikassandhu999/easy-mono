import {useCallback, useEffect, useState} from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
}

const DISMISSED_KEY = 'pwa-install-dismissed';

/**
 * Captures the browser's `beforeinstallprompt` event and exposes
 * `canInstall` (true when installable) and `promptInstall()` to trigger
 * the native install dialog.
 *
 * Respects a localStorage flag so the banner stays hidden after the user
 * explicitly dismisses it for the current session.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(() => sessionStorage.getItem(DISMISSED_KEY) === '1');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const {outcome} = await deferredPrompt.userChoice;

    // Prompt can only be used once
    setDeferredPrompt(null);

    if (outcome === 'dismissed') {
      sessionStorage.setItem(DISMISSED_KEY, '1');
      setIsDismissed(true);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setIsDismissed(true);
  }, []);

  return {
    canInstall: !!deferredPrompt && !isDismissed,
    dismiss,
    promptInstall,
  };
}
