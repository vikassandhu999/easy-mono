import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://coacheasy.app'),
  title: {
    default: 'CoachEasy - All-in-One Fitness Coaching Platform',
    template: '%s | CoachEasy',
  },
  description:
    'CoachEasy replaces the spreadsheets, scattered chats, and Razorpay links with one platform built for how Indian fitness coaches actually work.',
  keywords: [
    'fitness coaching platform',
    'personal trainer software',
    'client management for coaches',
    'online coaching platform India',
    'fitness business software',
    'nutrition planning app',
    'workout builder',
    'coaching CRM',
    'fitness coach tools',
    'personal training app',
    'UPI payments for coaches',
    'Indian fitness coach platform',
  ],
  authors: [{ name: 'CoachEasy', url: 'https://coacheasy.app' }],
  creator: 'CoachEasy',
  publisher: 'CoachEasy',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://coacheasy.app',
    siteName: 'CoachEasy',
    title: 'CoachEasy - All-in-One Fitness Coaching Platform',
    description:
      'CoachEasy replaces the spreadsheets, scattered chats, and Razorpay links with one platform built for how Indian fitness coaches actually work.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CoachEasy - Fitness Coaching Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CoachEasy - All-in-One Fitness Coaching Platform',
    description:
      'CoachEasy replaces the spreadsheets, scattered chats, and Razorpay links with one platform built for how Indian fitness coaches actually work.',
    images: ['/og-image.png'],
    creator: '@coacheasyapp',
  },
  alternates: {
    canonical: 'https://coacheasy.app',
  },
  category: 'Technology',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'CoachEasy',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'All-in-one fitness coaching platform for Indian personal trainers and fitness coaches to manage clients, create training and nutrition plans, track progress, and accept payments via UPI.',
    url: 'https://coacheasy.app',
    author: {
      '@type': 'Organization',
      name: 'CoachEasy',
      url: 'https://coacheasy.app',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
      description: 'Free starter plan with 2 clients forever',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '50',
    },
    featureList: [
      'Client Management',
      'Training Plan Builder',
      'Nutrition Planning',
      'Progress Tracking',
      'UPI Payment Processing',
      'AI Website Builder',
      '1-on-1 Messaging',
      'Group Chats',
      'Mobile App Access',
    ],
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CoachEasy',
    url: 'https://coacheasy.app',
    logo: 'https://coacheasy.app/logo.png',
    description: 'Building the simplest coaching platform for Indian fitness professionals.',
    founders: [
      {
        '@type': 'Person',
        name: 'Navraj Sandhu',
      },
      {
        '@type': 'Person',
        name: 'Vikas Sandhu',
      },
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'contact@coacheasy.app',
      telephone: '+91-76960-78183',
      contactType: 'customer support',
      availableLanguage: ['English', 'Hindi'],
    },
    sameAs: ['https://www.instagram.com/coacheasyapp/'],
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'Punjab',
      addressCountry: 'IN',
    },
  };

  return (
    <html lang="en">
      <head>
        <link href="/favicon.ico" rel="icon" sizes="any" />
        <link href="/favicon-32x32.png" rel="icon" sizes="32x32" type="image/png" />
        <link href="/favicon-16x16.png" rel="icon" sizes="16x16" type="image/png" />
        <link href="/apple-touch-icon.png" rel="apple-touch-icon" sizes="180x180" />
        <link href="/manifest.json" rel="manifest" />
        <meta content="#F97316" name="theme-color" />
        <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} type="application/ld+json" />
        <script dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} type="application/ld+json" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
