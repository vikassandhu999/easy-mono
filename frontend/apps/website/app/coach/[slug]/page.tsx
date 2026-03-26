import type {Metadata} from 'next';

import {notFound} from 'next/navigation';

import type {PublicStorefront} from './types';

import HeroSection from './hero-section';
import StorefrontClient from './storefront-client';
import TrustBar from './trust-bar';

const THEME_COLORS: Record<string, string> = {
  blue: '#2563EB',
  green: '#16A34A',
  orange: '#EA580C',
  purple: '#7C3AED',
};

// const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

async function getStorefront(slug: string): Promise<PublicStorefront | null> {
  try {
    const res = await fetch(`http://192.168.1.8:4000/v1/public/coaches/${slug}/profile`, {
      next: {revalidate: 60}, // ISR: revalidate every 60 seconds
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {data: PublicStorefront};
    return json.data;
  } catch {
    return null;
  } 
}

// ── Dynamic metadata ─────────────────────────────────────────

type PageParams = {params: Promise<{slug: string}>};

export async function generateMetadata({params}: PageParams): Promise<Metadata> {
  const {slug} = await params;
  const data = await getStorefront(slug);
  if (!data) return {title: 'Coach Not Found'};

  return {
    description: data.profile.bio ?? `Check out ${data.profile.display_name}'s coaching services`,
    openGraph: {
      ...(data.profile.photo_url && {images: [data.profile.photo_url]}),
      description: data.profile.bio ?? undefined,
      title: data.profile.display_name,
      type: 'profile',
    },
    title: data.profile.display_name,
  };
}

// ── Page ─────────────────────────────────────────────────────

export default async function CoachStorefrontPage({
  params,
  searchParams,
}: PageParams & {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const {slug} = await params;
  const resolvedSearchParams = await searchParams;
  const data = await getStorefront(slug);

  if (!data) notFound();

  // Resolve offer from ?offer=slug query param
  const offerSlug = typeof resolvedSearchParams.offer === 'string' ? resolvedSearchParams.offer : null;
  const initialOfferId = offerSlug ? (data.offers.find((o) => o.slug === offerSlug)?.id ?? null) : null;

  const themeHex = THEME_COLORS[data.profile.theme_color] ?? THEME_COLORS.orange;

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{'--theme': themeHex} as React.CSSProperties}
    >
      <HeroSection profile={data.profile} />
      <TrustBar stats={data.profile.trust_stats} />

      <StorefrontClient
        data={data}
        initialOfferId={initialOfferId}
        slug={slug}
      />

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 text-center">
        <p className="text-xs text-gray-400">
          Powered by{' '}
          <a
            className="inline-flex min-h-11 items-center font-medium text-gray-500 hover:text-gray-700"
            href="https://coacheasy.app"
          >
            CoachEasy
          </a>
        </p>
      </footer>
    </div>
  );
}
