declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {open: () => void};
  }
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

function loadScript(): Promise<void> {
  if (window.Razorpay) {
    return Promise.resolve();
  }
  const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error('Failed to load Razorpay checkout'));
    };
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(opts: {
  keyId: string;
  subscriptionId: string;
  onSuccess: () => void;
  onDismiss?: () => void;
}): Promise<void> {
  await loadScript();
  new window.Razorpay({
    key: opts.keyId,
    subscription_id: opts.subscriptionId,
    name: 'CoachEasy',
    handler: opts.onSuccess,
    modal: {ondismiss: opts.onDismiss},
  }).open();
}
