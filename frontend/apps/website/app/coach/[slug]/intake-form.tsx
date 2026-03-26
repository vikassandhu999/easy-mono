'use client';

import {useState} from 'react';

import type {IntakeQuestion, PublicLeadCreateRequest, PublicOffer} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function IntakeForm({
  intakeQuestions,
  offers,
  selectedOfferId,
  slug,
}: {
  intakeQuestions: IntakeQuestion[];
  offers: PublicOffer[];
  selectedOfferId: null | string;
  slug: string;
}) {
  const [formState, setFormState] = useState({
    email: '',
    instagram_handle: '',
    name: '',
    phone: '',
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [offerId, setOfferId] = useState<null | string>(selectedOfferId);
  const [status, setStatus] = useState<'error' | 'idle' | 'submitted' | 'submitting'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const selectedOffer = offers.find((o) => o.id === offerId);

  const handleFieldChange = (field: string, value: string) => {
    setFormState((prev) => ({...prev, [field]: value}));
  };

  const handleAnswerChange = (label: string, value: string) => {
    setAnswers((prev) => ({...prev, [label]: value}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    const body: PublicLeadCreateRequest = {
      email: formState.email,
      instagram_handle: formState.instagram_handle || undefined,
      intake_answers: Object.keys(answers).length > 0 ? answers : undefined,
      name: formState.name,
      offer_id: offerId ?? undefined,
      phone: formState.phone,
      source: 'storefront',
    };

    try {
      const res = await fetch(`${API_BASE}/v1/public/coaches/${slug}/leads`, {
        body: JSON.stringify(body),
        headers: {'Content-Type': 'application/json'},
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error_message ?? 'Something went wrong. Please try again.');
      }

      setStatus('submitted');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (status === 'submitted') {
    return (
      <section
        className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16"
        id="get-started"
      >
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <h2 className="text-xl font-bold text-green-800">Application submitted!</h2>
          <p className="mt-2 text-sm text-green-700">
            Thank you for your interest. The coach will review your application and get back to you soon.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16"
      id="get-started"
    >
      <h2 className="mb-2 text-center text-xl font-bold sm:text-2xl">Get Started</h2>

      {selectedOffer && (
        <p className="mb-6 text-center text-sm text-gray-600">
          Selected: {selectedOffer.name}
          {selectedOffer.price_display && ` · ${selectedOffer.price_display}`}
        </p>
      )}

      {/* Offer selector (if multiple offers and none pre-selected) */}
      {offers.length > 1 && (
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            I&apos;m interested in
          </label>
          <select
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            onChange={(e) => setOfferId(e.target.value || null)}
            value={offerId ?? ''}
          >
            <option value="">Choose a program...</option>
            {offers.map((o) => (
              <option
                key={o.id}
                value={o.id}
              >
                {o.name}
                {o.price_display && ` — ${o.price_display}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        {/* Default fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="lead_name"
            >
              Name *
            </label>
            <input
              className="min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              id="lead_name"
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Your name"
              required
              type="text"
              value={formState.name}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="lead_email"
            >
              Email *
            </label>
            <input
              className="min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              id="lead_email"
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="you@email.com"
              required
              type="email"
              value={formState.email}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="lead_phone"
            >
              Phone *
            </label>
            <input
              className="min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              id="lead_phone"
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              placeholder="+91 98765 43210"
              required
              type="tel"
              value={formState.phone}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="lead_instagram"
            >
              Instagram
            </label>
            <input
              className="min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              id="lead_instagram"
              onChange={(e) => handleFieldChange('instagram_handle', e.target.value)}
              placeholder="@your_handle"
              type="text"
              value={formState.instagram_handle}
            />
          </div>
        </div>

        {/* Dynamic custom questions */}
        {intakeQuestions.map((q, index) => (
          <div
            className="flex flex-col gap-1.5"
            key={index}
          >
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor={`q_${index}`}
            >
              {q.label}
              {q.required && ' *'}
            </label>

            {q.type === 'select' && q.options ? (
              <select
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                id={`q_${index}`}
                onChange={(e) => handleAnswerChange(q.label, e.target.value)}
                required={q.required}
                value={answers[q.label] ?? ''}
              >
                <option value="">Select...</option>
                {q.options.map((opt) => (
                  <option
                    key={opt}
                    value={opt}
                  >
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                id={`q_${index}`}
                onChange={(e) => handleAnswerChange(q.label, e.target.value)}
                placeholder={q.type === 'number' ? '0' : ''}
                required={q.required}
                type={q.type === 'number' ? 'number' : 'text'}
                value={answers[q.label] ?? ''}
              />
            )}
          </div>
        ))}

        {status === 'error' && errorMessage && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}

        <button
          className="min-h-11 w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          disabled={status === 'submitting'}
          type="submit"
        >
          {status === 'submitting' ? 'Submitting...' : 'Submit application'}
        </button>
      </form>
    </section>
  );
}
