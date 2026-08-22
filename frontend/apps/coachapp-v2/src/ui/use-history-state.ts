import {useLocation} from 'react-router-dom';

/**
 * A string carried in history state, or undefined.
 *
 * React Router types `location.state` as `any`, and history state SURVIVES a
 * reload — so it can hold whatever an older build (or a hand-crafted push) left
 * there. Screens were declaring a local interface and asserting the state into
 * it; this checks the one field they actually read.
 */
export function useHistoryStateString(key: string): string | undefined {
  const {state} = useLocation();
  if (!state || typeof state !== 'object') {
    return undefined;
  }
  const value: unknown = (state as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}
