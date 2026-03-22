import type { Metadata } from "next";
import Header from "@/@components/header";
import Footer from "@/@components/home/Footer";
import Link from "next/link";
import {
  IconDeviceMobile,
  IconBell,
  IconCloudDownload,
  IconLock,
  IconRefresh,
  IconArrowRight,
  IconCheck,
} from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Mobile App",
  description:
    "Give your clients a branded mobile app experience. Access workouts, nutrition plans, and messaging on the go with CoachEasy.",
  openGraph: {
    title: "Mobile App | CoachEasy",
    description:
      "Give your clients a branded mobile app experience. Access workouts, nutrition plans, and messaging on the go with CoachEasy.",
    url: "https://coacheasy.app/features/mobile-app",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CoachEasy Mobile App Feature",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mobile App | CoachEasy",
    description:
      "Give your clients a branded mobile app experience. Access workouts, nutrition plans, and messaging on the go.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://coacheasy.app/features/mobile-app",
  },
};

const FEATURES = [
  {
    icon: IconDeviceMobile,
    title: "Client Mobile App",
    description:
      "Your clients get a dedicated mobile app to access their workouts, nutrition plans, progress tracking, and messages—all in one place.",
  },
  {
    icon: IconBell,
    title: "Push Notifications",
    description:
      "Keep clients engaged with workout reminders, session notifications, and motivational messages delivered right to their phone.",
  },
  {
    icon: IconCloudDownload,
    title: "Offline Access",
    description:
      "Clients can download their workouts and view them offline at the gym—no internet required once plans are synced.",
  },
  {
    icon: IconRefresh,
    title: "Real-Time Sync",
    description:
      "Changes you make to plans sync instantly to client devices. Update a workout and they see it immediately.",
  },
  {
    icon: IconLock,
    title: "Secure & Private",
    description:
      "All data is encrypted and securely stored. Clients can only access their own information with authenticated login.",
  },
];

const CLIENT_APP_FEATURES = [
  "View assigned training plans and workouts",
  "Log workout completion and track weights",
  "Access nutrition plans and meal guidance",
  "Track progress with photos and measurements",
  "Message their coach directly in-app",
  "Receive reminders and notifications",
  "View upcoming scheduled sessions",
  "Check-in and submit progress updates",
];

const APP_LOGIN_URL = "https://admin.coacheasy.app/login";

export default function MobileAppPage() {
  return (
    <main>
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-50 to-pink-50 py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-1 bg-purple-100 text-purple-700 text-sm font-medium mb-4">
                Mobile App
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Your Coaching Business in Your{" "}
                <span className="text-purple-600">Client&apos;s Pocket</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Give your clients a seamless mobile experience. They can access
                workouts, track progress, and stay connected with you—anytime,
                anywhere.
              </p>
              <Link
                href={APP_LOGIN_URL}
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-8 py-4 font-semibold hover:bg-purple-700 transition-all hover:scale-105 shadow-lg"
              >
                Get Started
                <IconArrowRight size={20} />
              </Link>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                {/* Phone mockup */}
                <div className="w-64 h-[500px] bg-gray-900 p-3 shadow-2xl">
                  <div className="w-full h-full bg-white overflow-hidden">
                    <div className="bg-purple-600 h-20 flex items-end pb-3 px-4">
                      <span className="text-white font-semibold text-lg">
                        CoachEasy
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="bg-gray-100 p-3">
                        <div className="text-sm font-medium">
                          Today&apos;s Workout
                        </div>
                        <div className="text-xs text-gray-500">
                          Upper Body Strength
                        </div>
                      </div>
                      <div className="bg-gray-100 p-3">
                        <div className="text-sm font-medium">Nutrition</div>
                        <div className="text-xs text-gray-500">
                          2,100 cal remaining
                        </div>
                      </div>
                      <div className="bg-purple-100 p-3">
                        <div className="text-sm font-medium text-purple-700">
                          New Message
                        </div>
                        <div className="text-xs text-purple-600">
                          Coach sent you feedback
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Mobile Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything your clients need to stay on track, delivered through a
              beautiful mobile experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-6 bg-white border border-gray-100 hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 bg-purple-100 flex items-center justify-center mb-4">
                    <Icon size={24} className="text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What Clients Can Do */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                What Your Clients Can Do
              </h2>
              <p className="text-gray-600 text-lg mb-8">
                The CoachEasy client app puts everything at their fingertips,
                making it easy to stay committed and see results.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CLIENT_APP_FEATURES.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <IconCheck size={12} className="text-green-600" />
                    </div>
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 shadow-lg">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 flex items-center justify-center">
                    <IconDeviceMobile size={24} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold">iOS & Android</div>
                    <div className="text-sm text-gray-500">
                      Available on both platforms
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 flex items-center justify-center">
                    <IconRefresh size={24} className="text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold">Always Updated</div>
                    <div className="text-sm text-gray-500">
                      Real-time sync with your dashboard
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 flex items-center justify-center">
                    <IconLock size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold">Secure Access</div>
                    <div className="text-sm text-gray-500">
                      Protected login for each client
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-purple-600">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Give Your Clients the Mobile Experience They Deserve
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Stand out from other coaches with a professional mobile app that
            keeps clients engaged and accountable.
          </p>
          <Link
            href={APP_LOGIN_URL}
            className="inline-flex items-center gap-2 bg-white text-purple-600 px-8 py-4 font-semibold hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
          >
            Start Free Trial
            <IconArrowRight size={20} />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
