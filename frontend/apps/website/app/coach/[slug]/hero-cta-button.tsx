'use client';

/**
 * Thin client component — only exists so the hero section stays a Server Component.
 * Scrolls to the intake form on click.
 */
export default function HeroCtaButton() {
  return (
    <button
      className="min-h-11 w-full rounded-lg bg-[--theme] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80 sm:w-auto"
      onClick={() => document.getElementById('get-started')?.scrollIntoView({behavior: 'smooth'})}
      type="button"
    >
      Get started →
    </button>
  );
}
