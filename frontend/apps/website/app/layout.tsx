import type { Metadata } from "next";
import { Inter, Intel_One_Mono } from "next/font/google";
import "./globals.css";

const nunitoSans = Inter({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

const nunito = Intel_One_Mono({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://coacheasy.app"),
  title: {
    default: "CoachEasy - All-in-One Fitness Coaching Platform",
    template: "%s | CoachEasy",
  },
  description:
    "The simplest all-in-one coaching platform for fitness professionals. Manage clients, create training & nutrition plans, track progress, accept payments, and grow your coaching business.",
  keywords: [
    "fitness coaching platform",
    "personal trainer software",
    "client management for coaches",
    "online coaching platform",
    "fitness business software",
    "nutrition planning app",
    "workout builder",
    "coaching CRM",
    "fitness coach tools",
    "personal training app",
  ],
  authors: [{ name: "CoachEasy", url: "https://coacheasy.app" }],
  creator: "CoachEasy",
  publisher: "CoachEasy",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://coacheasy.app",
    siteName: "CoachEasy",
    title: "CoachEasy - All-in-One Fitness Coaching Platform",
    description:
      "The simplest all-in-one coaching platform for fitness professionals. Manage clients, create plans, track progress, and grow your business.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CoachEasy - Fitness Coaching Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CoachEasy - All-in-One Fitness Coaching Platform",
    description:
      "The simplest all-in-one coaching platform for fitness professionals. Manage clients, create plans, track progress, and grow your business.",
    images: ["/og-image.png"],
    creator: "@coacheasyapp",
  },
  alternates: {
    canonical: "https://coacheasy.app",
  },
  category: "Technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CoachEasy",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "All-in-one fitness coaching platform for personal trainers and fitness coaches to manage clients, create training and nutrition plans, track progress, and accept payments.",
    url: "https://coacheasy.app",
    author: {
      "@type": "Organization",
      name: "CoachEasy",
      url: "https://coacheasy.app",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      description: "Free starter plan available",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "50",
    },
    featureList: [
      "Client Management",
      "Training Plan Builder",
      "Nutrition Planning",
      "Progress Tracking",
      "Payment Processing",
      "Website Builder",
      "1-on-1 Messaging",
      "Group Chats",
      "Mobile App Access",
    ],
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CoachEasy",
    url: "https://coacheasy.app",
    logo: "https://coacheasy.app/logo.png",
    description:
      "Building the simplest coaching platform for fitness professionals.",
    founders: [
      {
        "@type": "Person",
        name: "Navraj Sandhu",
      },
      {
        "@type": "Person",
        name: "Vikas Sandhu",
      },
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "contact@coacheasy.app",
      telephone: "+91-76960-78183",
      contactType: "customer support",
      availableLanguage: ["English", "Hindi"],
    },
    sameAs: ["https://www.instagram.com/coacheasyapp/"],
    address: {
      "@type": "PostalAddress",
      addressRegion: "Punjab",
      addressCountry: "IN",
    },
  };

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      <body className={`${nunitoSans.variable} ${nunito.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
