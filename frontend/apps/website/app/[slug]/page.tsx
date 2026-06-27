import type {Metadata} from 'next';
import {notFound} from 'next/navigation';

import {fetchLandingPage} from '@/lib/api';

import LandingClient from './landing-client';

export const revalidate = 60;

type Props = {params: Promise<{slug: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params;
  const page = await fetchLandingPage(slug);
  if (!page) {
    return {title: 'Page not found'};
  }
  const title = `${page.business_name} — Apply for coaching`;
  return {
    title,
    description: page.headline,
    openGraph: {title, description: page.headline, type: 'website'},
  };
}

export default async function LandingPageRoute({params}: Props) {
  const {slug} = await params;
  const page = await fetchLandingPage(slug);
  if (!page) {
    notFound();
  }
  return <LandingClient page={page} />;
}
