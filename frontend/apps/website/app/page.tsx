import type {Metadata} from 'next';

import CoachEasyLanding from '@/@components/CoachEasyLanding';

export const metadata: Metadata = {
  title: 'CoachEasy - All-in-One Fitness Coaching Platform',
  description:
    'CoachEasy replaces the spreadsheets, scattered chats, and Razorpay links with one platform built for how Indian fitness coaches actually work.',
  openGraph: {
    title: 'CoachEasy - All-in-One Fitness Coaching Platform',
    description:
      'CoachEasy replaces the spreadsheets, scattered chats, and Razorpay links with one platform built for how Indian fitness coaches actually work.',
    url: 'https://coacheasy.app',
    type: 'website',
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
  },
  alternates: {
    canonical: 'https://coacheasy.app',
  },
};

export default function Home() {
  return <CoachEasyLanding />;
}
