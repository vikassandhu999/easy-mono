import type { Metadata } from "next";
import Header from "@/@components/header";
import Footer from "@/@components/home/Footer";
import Link from "next/link";
import {
  IconChartBar,
  IconCamera,
  IconTrendingUp,
  IconScale,
  IconClipboardCheck,
  IconBell,
  IconArrowRight,
} from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Progress Tracking",
  description:
    "Track client progress with photos, measurements, and performance metrics. Visualize results and keep clients motivated with CoachEasy.",
  openGraph: {
    title: "Progress Tracking | CoachEasy",
    description:
      "Track client progress with photos, measurements, and performance metrics. Visualize results and keep clients motivated.",
    url: "https://coacheasy.app/features/progress-tracking",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CoachEasy Progress Tracking Feature",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Progress Tracking | CoachEasy",
    description:
      "Track client progress with photos, measurements, and performance metrics. Visualize results and keep clients motivated.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://coacheasy.app/features/progress-tracking",
  },
};

const FEATURES = [
  {
    icon: IconCamera,
    title: "Progress Photos",
    description:
      "Clients can upload transformation photos with timestamps. Compare side-by-side images to visualize their journey over weeks and months.",
  },
  {
    icon: IconScale,
    title: "Body Measurements",
    description:
      "Track weight, body fat percentage, and custom measurements like chest, waist, hips, and arms. See trends over time with clear charts.",
  },
  {
    icon: IconChartBar,
    title: "Performance Metrics",
    description:
      "Log strength PRs, cardio performance, and workout completion rates. Watch clients break through plateaus with data-driven insights.",
  },
  {
    icon: IconTrendingUp,
    title: "Visual Analytics",
    description:
      "Beautiful charts and graphs that make progress crystal clear. Clients stay motivated when they can see their improvements visualized.",
  },
  {
    icon: IconClipboardCheck,
    title: "Goal Tracking",
    description:
      "Set measurable goals with target dates. Track completion percentage and celebrate milestones together with your clients.",
  },
  {
    icon: IconBell,
    title: "Check-in Reminders",
    description:
      "Automated reminders prompt clients to log their progress regularly. Consistent tracking leads to better accountability and results.",
  },
];

const APP_LOGIN_URL = "https://admin.coacheasy.app/login";

export default function ProgressTrackingPage() {
  return (
    <main>
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-teal-50 py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block px-4 py-1 bg-green-100 text-green-700 text-sm font-medium mb-4">
              Progress Tracking
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Visualize Every Step of the{" "}
              <span className="text-green-600">Transformation</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Track photos, measurements, and performance metrics in one place.
              Help clients see their progress and stay motivated throughout
              their fitness journey.
            </p>
            <Link
              href={APP_LOGIN_URL}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-3 font-semibold hover:bg-green-700 transition-all hover:scale-105 shadow-lg"
            >
              Start Tracking Progress
              <IconArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Track Results
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive tracking tools that keep clients accountable and
              motivated
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white p-6 border border-gray-100 hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 bg-green-100 flex items-center justify-center mb-4">
                    <Icon className="text-green-600" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Progress Tracking Matters
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Boost Client Retention</h3>
                    <p className="text-gray-600">
                      Clients who see measurable progress are more likely to
                      stick with their programs long-term.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Data-Driven Adjustments</h3>
                    <p className="text-gray-600">
                      Use real data to make informed decisions about program
                      modifications and nutrition changes.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Celebrate Wins Together</h3>
                    <p className="text-gray-600">
                      Milestone notifications help you acknowledge achievements
                      and strengthen the coach-client relationship.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 shadow-lg">
              <div className="text-center">
                <div className="text-6xl font-bold text-green-600 mb-2">87%</div>
                <p className="text-gray-600 mb-6">
                  of clients who track progress consistently achieve their goals
                </p>
                <div className="h-2 bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-teal-500"
                    style={{ width: "87%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Track Client Transformations?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join coaches who use data to deliver better results and keep clients
            motivated.
          </p>
          <Link
            href={APP_LOGIN_URL}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-4 font-semibold hover:bg-green-700 transition-all hover:scale-105 shadow-lg text-lg"
          >
            Get Started Free
            <IconArrowRight size={24} />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
