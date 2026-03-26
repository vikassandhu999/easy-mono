'use client';

import {useState} from 'react';

import {Lock, MessageCircle, Star} from 'lucide-react';

import type {IntakeQuestion, PublicLeadCreateRequest, PublicOffer, PublicTestimonial} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function IntakeForm({
  coachName,
  intakeQuestions,
  microTestimonial,
  offers,
  selectedOfferId,
  slug,
  socialLinks,
}: {
  coachName: string;
  intakeQuestions: IntakeQuestion[];
  microTestimonial: PublicTestimonial | null;
  offers: PublicOffer[];
  selectedOfferId: null | string;
  slug: string;
  socialLinks: Record<string, string>;
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
    const instagramHandle = socialLinks.instagram;
    const whatsappNumber = socialLinks.whatsapp;

    return (
      <section
        className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16"
        id="get-started"
      >
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <h2 className="text-xl font-bold text-green-800">Application submitted!</h2>
          <p className="mt-3 text-sm text-green-700">
            {coachName} will review your application and get back to you within 24 hours.
          </p>

          {(instagramHandle || whatsappNumber) ? (
            <div className="mt-6 flex flex-col items-center gap-3">
              {instagramHandle ? (
                <a
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  href={instagramHandle.startsWith('http') ? instagramHandle : `https://instagram.com/${instagramHandle.replace('@', '')}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Follow on Instagram
                </a>
              ) : null}
              {whatsappNumber ? (
                <a
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <MessageCircle size={16} />
                  Message on WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16"
      id="get-started"
    >
      <h2 className="mb-2 text-center text-xl font-bold sm:text-2xl">Ready to start your transformation?</h2>

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
          className="min-h-11 w-full rounded-lg bg-[--theme] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
          disabled={status === 'submitting'}
          type="submit"
        >
          {status === 'submitting' ? 'Submitting...' : 'Submit application'}
        </button>

        {/* Privacy reassurance */}
        <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Lock size={12} />
          Your information is private and only shared with the coach.
        </p>
      </form>

      {/* Micro-testimonial — one text quote for last-second social proof */}
      {microTestimonial ? (
        <div className="mt-6 flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-white p-4 text-center">
          {microTestimonial.rating ? (
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  className={s <= microTestimonial.rating! ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
                  key={s}
                  size={12}
                />
              ))}
            </div>
          ) : null}
          <p className="text-sm italic text-gray-600">&ldquo;{microTestimonial.quote}&rdquo;</p>
          <p className="text-xs font-medium text-gray-400">&mdash; {microTestimonial.client_name}</p>
        </div>
      ) : null}
    </section>
  );
}
