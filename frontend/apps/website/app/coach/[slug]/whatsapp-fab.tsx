'use client';

import {MessageCircle} from 'lucide-react';
import {useEffect, useState} from 'react';

const DEFAULT_MESSAGE = "Hi! I'm interested in your coaching services.";

/**
 * Floating WhatsApp action button — fixed bottom-right corner.
 * Appears after 2 seconds with a scale+fade animation.
 * Position: bottom-20 on mobile (above sticky CTA bar), bottom-6 on md+.
 */
export default function WhatsAppFab({
  message,
  whatsappNumber,
}: {
  message: null | string;
  whatsappNumber: string;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const cleanNumber = whatsappNumber.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message || DEFAULT_MESSAGE);
  const href = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;

  return (
    <a
      aria-label="Message on WhatsApp"
      className={`fixed right-4 bottom-20 z-50 flex size-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 md:bottom-6 md:right-6 ${
        shown ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
      }`}
      href={href}
      rel="noopener noreferrer"
      style={{backgroundColor: '#25D366'}}
      target="_blank"
    >
      <MessageCircle
        className="text-white"
        size={24}
      />
    </a>
  );
}
