import type { Metadata } from "next";
import Header from "@/@components/header";
import Footer from "@/@components/home/Footer";
import {
  IconBarbell,
  IconCalendarEvent,
  IconClipboardList,
  IconDeviceFloppy,
  IconRepeat,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Training Plans",
  description:
    "Create and deliver personalized training plans for your clients with CoachEasy's intuitive workout builder. Build custom workouts, schedule programs, and track progress.",
  openGraph: {
    title: "Training Plans | CoachEasy",
    description:
      "Create and deliver personalized training plans for your clients with CoachEasy's intuitive workout builder.",
    url: "https://coacheasy.app/features/training-plans",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CoachEasy Training Plans Feature",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Training Plans | CoachEasy",
    description:
      "Create and deliver personalized training plans for your clients with CoachEasy's intuitive workout builder.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://coacheasy.app/features/training-plans",
  },
};

const FEATURES = [
  {
    icon: IconClipboardList,
    title: "Custom Workout Builder",
    description:
      "Build workouts from scratch or use templates. Add exercises, sets, reps, rest periods, and detailed instructions.",
  },
  {
    icon: IconDeviceFloppy,
    title: "Template Library",
    description:
      "Save your best workouts as templates. Quickly assign proven programs to new clients without starting from scratch.",
  },
  {
    icon: IconCalendarEvent,
    title: "Scheduled Programs",
    description:
      "Create multi-week training programs with periodization. Schedule workouts in advance so clients always know what's next.",
  },
  {
    icon: IconRepeat,
    title: "Progressive Overload",
    description:
      "Track progression over time. Automatically suggest weight increases based on client performance and history.",
  },
  {
    icon: IconUsers,
    title: "Group Programs",
    description:
      "Assign the same training plan to multiple clients at once. Perfect for group coaching or challenge programs.",
  },
  {
    icon: IconBarbell,
    title: "Exercise Library",
    description:
      "Access a comprehensive exercise database with videos and instructions. Add custom exercises specific to your coaching style.",
  },
];

const BENEFITS = [
  "Save hours every week with reusable templates",
  "Deliver professional, branded training plans",
  "Clients can log workouts directly in the app",
  "Track completion rates and adherence",
  "Adjust plans on the fly based on feedback",
  "Support for supersets, circuits, and AMRAP",
];

export default function TrainingPlansPage() {
  return (
    <main>
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 text-sm font-medium mb-6">
              <IconBarbell size={18} />
              Training Plans
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Build Training Plans That Get Results
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Create personalized workout programs, track progress, and help
              your clients achieve their fitness goals with our powerful
              training plan builder.
            </p>
            <Link
              href="https://admin.coacheasy.app/login"
              className="inline-flex items-center gap-2 bg-blue-500 text-white px-8 py-3 font-semibold hover:bg-blue-600 transition-all hover:scale-105 shadow-lg"
            >
              Start Creating Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Program Like a Pro
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              From simple daily workouts to complex periodized programs,
              CoachEasy gives you the tools to deliver exceptional training.
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
                  <div className="w-12 h-12 bg-blue-100 flex items-center justify-center mb-4">
                    <Icon size={24} className="text-blue-600" />
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

      {/* Benefits Section */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Coaches Love Our Training Plan Builder
              </h2>
              <p className="text-gray-600 text-lg mb-8">
                Stop wasting time on spreadsheets and PDFs. Our training plan
                builder is designed specifically for coaches who want to deliver
                professional programs without the hassle.
              </p>
              <ul className="space-y-4">
                {BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        className="w-4 h-4 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">
                Ready to transform your coaching?
              </h3>
              <p className="text-blue-100 mb-6">
                Join hundreds of coaches who are delivering better results with
                less effort using CoachEasy&apos;s training plans.
              </p>
              <Link
                href="https://admin.coacheasy.app/login"
                className="inline-block bg-white text-blue-600 px-6 py-3 font-semibold hover:bg-blue-50 transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Start Building Better Training Plans Today
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Create your first training plan in minutes. No credit card required.
          </p>
          <Link
            href="https://admin.coacheasy.app/login"
            className="inline-flex items-center gap-2 bg-blue-500 text-white px-8 py-4 font-semibold hover:bg-blue-600 transition-all hover:scale-105 shadow-lg text-lg"
          >
            Try CoachEasy Free
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
