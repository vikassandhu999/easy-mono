import {getSession} from '../api/session';

type SavedCheckout = {requestId: string; seats: number};
const key = () => `coachapp:checkout:${getSession()?.id}`;
export function readCheckoutRequest(): SavedCheckout | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key()) || 'null');
    if (
      value &&
      typeof value === 'object' &&
      'requestId' in value &&
      typeof value.requestId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.requestId) &&
      'seats' in value &&
      typeof value.seats === 'number' &&
      Number.isInteger(value.seats) &&
      value.seats >= 1 &&
      value.seats <= 100
    ) {
      return {requestId: value.requestId, seats: value.seats};
    }
  } catch {
    /* Storage may be unavailable; the server also retains accepted requests. */
  }
  return null;
}
export function saveCheckoutRequest(value: SavedCheckout) {
  try {
    sessionStorage.setItem(key(), JSON.stringify(value));
  } catch {
    /* Same-page retry still retains the request. */
  }
}
export function clearCheckoutRequest() {
  try {
    sessionStorage.removeItem(key());
  } catch {
    /* A completed request remains safe to replay. */
  }
}
