import type { Metadata } from "next";
import Header from "@/@components/header";
import FaqSection from "@/@components/home/FaqSection";
import Features from "@/@components/home/features";
import Footer from "@/@components/home/Footer";
import Hero from "@/@components/home/hero";
import PricingSection from "@/@components/home/PricingSection";
import SimplicitySection from "@/@components/home/SimplicitySection";
import { IconBrandWhatsapp } from "@tabler/icons-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CoachEasy - All-in-One Fitness Coaching Platform",
  description:
    "The simplest all-in-one coaching platform for fitness professionals. Manage clients, create training & nutrition plans, track progress, accept payments, and grow your coaching business.",
  openGraph: {
    title: "CoachEasy - All-in-One Fitness Coaching Platform",
    description:
      "The simplest all-in-one coaching platform for fitness professionals. Manage clients, create plans, track progress, and grow your business.",
    url: "https://coacheasy.app",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CoachEasy - Fitness Coaching Platform Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CoachEasy - All-in-One Fitness Coaching Platform",
    description:
      "The simplest all-in-one coaching platform for fitness professionals. Manage clients, create plans, track progress, and grow your business.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://coacheasy.app",
  },
};

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <Features />
      <SimplicitySection />
      <PricingSection />
      <FaqSection />

      <div className="w-full bg-gradient-to-r from-blue-50 to-purple-50 p-8 md:p-12 mx-auto flex flex-col gap-4">
        <h3 className="font-funnel text-2xl md:text-3xl font-medium mb-2">
          Built With Coaches, For Coaches
        </h3>
        <p className="text-gray-600 text-lg max-w-2xl">
          We don&apos;t build in isolation. Every feature starts with real feedback from coaches like you.
          Join our WhatsApp community to share ideas, report issues, and help shape what we build next.
        </p>
        <div className="flex flex-wrap gap-4 mt-2">
          <Link
            href="https://chat.whatsapp.com/J2KRTVSsTS48wNi3gx1nsp"
            target="_blank"
            rel="noopener noreferrer"
            className="w-max py-3 px-6 bg-green-600 text-white flex justify-center items-center font-medium transition-all hover:bg-green-700 hover:shadow-lg gap-2"
          >
            <IconBrandWhatsapp size={20} />
            Join WhatsApp Community
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
