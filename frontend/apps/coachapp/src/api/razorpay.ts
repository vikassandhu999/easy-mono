import type {BillingCheckoutPayload} from './billing';

type Checkout = {open: () => void; close: () => void};
type Options = {
  key: string;
  subscription_id: string;
  name: string;
  handler: () => void;
  modal: {ondismiss: () => void; confirm_close: boolean};
};
declare global {
  interface Window {
    Razorpay?: new (options: Options) => Checkout;
  }
}
let loading: Promise<void> | undefined;
function loadCheckout() {
  if (window.Razorpay) {
    return Promise.resolve();
  }
  if (loading) {
    return loading;
  }
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(failed, 15_000);
    function failed() {
      window.clearTimeout(timeout);
      script.remove();
      loading = undefined;
      reject(new Error('Payment checkout could not load. Check your connection and open it again.'));
    }
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      window.clearTimeout(timeout);
      if (typeof window.Razorpay !== 'function') {
        failed();
        return;
      }
      resolve();
    };
    script.onerror = failed;
    document.head.append(script);
  });
  return loading;
}
export async function prepareCheckout(payload: BillingCheckoutPayload, onComplete: () => void, onDismiss: () => void) {
  await loadCheckout();
  if (!window.Razorpay) {
    throw new Error('Payment checkout is unavailable. Try again.');
  }
  return new window.Razorpay({
    key: payload.key_id,
    subscription_id: payload.subscription_id,
    name: 'easy',
    handler: onComplete,
    modal: {ondismiss: onDismiss, confirm_close: true},
  });
}
