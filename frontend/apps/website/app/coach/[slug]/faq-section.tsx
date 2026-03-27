'use client';

import {ChevronDown} from 'lucide-react';
import {useState} from 'react';

import type {PublicStoreProfile} from '@easy/storefront-types';

/**
 * FAQ accordion — one item open at a time. Full-row tappable.
 */
export default function FaqSection({items}: {items: PublicStoreProfile['faq_items']}) {
  const [openIndex, setOpenIndex] = useState<null | number>(null);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <h2 className="mb-6 text-center text-xl font-bold sm:text-2xl">Common questions</h2>

      <div className="divide-y divide-gray-200 border-y border-gray-200">
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i}>
              <button
                className="flex min-h-11 w-full items-center justify-between gap-3 py-4 text-left text-sm font-medium text-gray-900"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                type="button"
              >
                {item.question}
                <ChevronDown
                  className={`shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  size={16}
                />
              </button>
              {isOpen ? (
                <div className="pb-4 text-sm text-gray-600">{item.answer}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
