import {useCallback} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

/**
 * Returns a `goBack` function that navigates back in history if possible,
 * or falls back to a known route if the user deep-linked / refreshed.
 *
 * Uses `location.key === 'default'` to detect whether there's a previous
 * history entry. When there is, `navigate(-1)` triggers a pop navigation
 * which enables `<ScrollRestoration />` to restore the scroll position.
 */
export function useGoBack(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }, [fallback, location.key, navigate]);
}
