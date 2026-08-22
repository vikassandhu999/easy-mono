import {Button, Spinner} from '@heroui/react';
import {useEffect, useState} from 'react';

/**
 * Minimal splash shown during initial app load / route hydration.
 *
 * Progression:
 * - 0–500ms: logo only (no distracting spinner for fast loads)
 * - >500ms:  logo + small spinner below (signals "still working")
 * - >3000ms: "Taking longer than usual..." with a retry (reload) button
 *
 * Used as RouterProvider's `fallbackElement` so it renders before the first
 * route paints. Centered on a plain background with the app logo.
 */
export default function SplashScreen() {
  const [elapsed, setElapsed] = useState<'initial' | 'slow' | 'stuck'>('initial');

  useEffect(() => {
    const slowTimer = setTimeout(() => setElapsed('slow'), 500);
    const stuckTimer = setTimeout(() => setElapsed('stuck'), 3000);
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(stuckTimer);
    };
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <img
        alt="CoachEasy"
        className="h-8"
        src="/TextLogo.webp"
      />
      {elapsed === 'slow' && (
        <div className="mt-6">
          <Spinner
            color="accent"
            size="sm"
          />
        </div>
      )}
      {elapsed === 'stuck' && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-center text-sm text-muted">Taking longer than usual...</p>
          <Button
            onPress={handleReload}
            size="sm"
            variant="secondary"
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
