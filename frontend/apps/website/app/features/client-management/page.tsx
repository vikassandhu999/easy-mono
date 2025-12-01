import type { Metadata } from "next";
import Header from "@/@components/header";
import Footer from "@/@components/home/Footer";
import {
  IconUsers,
  IconUserPlus,
  IconMessage,
  IconCalendar,
  IconFileText,
  IconChartBar,
} from "@tabler/icons-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Client Management",
  description:
    "Manage all your coaching clients in one place. Track progress, communicate seamlessly, and build stronger relationships with CoachEasy.",
  openGraph: {
    title: "Client Management | CoachEasy",
    description:
      "Manage all your coaching clients in one place. Track progress, communicate seamlessly, and build stronger relationships.",
    url: "https://coacheasy.app/features/client-management",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CoachEasy Client Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Client Management | CoachEasy",
    description:
      "Manage all your coaching clients in one place. Track progress, communicate seamlessly, and build stronger relationships.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://coacheasy.app/features/client-management",
  },
};

const features = [
  {
    icon: IconUserPlus,
    title: "Easy Onboarding",
    description:
      "Invite clients via email or share a join link. They can sign up and access their personalized portal in minutes.",
  },
  {
    icon: IconFileText,
    title: "Client Profiles",
    description:
      "Store all client information in one place—contact details, goals, health history, preferences, and notes.",
  },
  {
    icon: IconMessage,
    title: "In-App Messaging",
    description:
      "Communicate directly with clients through secure messaging. No need for external apps or scattered conversations.",
  },
  {
    icon: IconCalendar,
    title: "Session Scheduling",
    description:
      "Schedule and manage coaching sessions effortlessly. Clients receive reminders and can view upcoming appointments.",
  },
  {
    icon: IconChartBar,
    title: "Progress Overview",
    description:
      "Get a quick snapshot of each client's progress, goals achieved, and areas that need attention.",
  },
  {
    icon: IconUsers,
    title: "Group Management",
    description:
      "Organize clients into groups for batch programs, challenges, or team coaching sessions.",
  },
];

export default function ClientManagementPage() {
  return (
    <main>
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 text-sm font-medium mb-6">
              <IconUsers size={18} />
              Client Management
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              All Your Clients, One Powerful Dashboard
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Stop juggling spreadsheets and scattered notes. CoachEasy gives
              you a centralized hub to manage every client relationship with
              ease and professionalism.
            </p>
            <Link
              href="https://admin.coacheasy.app/login"
              className="inline-flex items-center gap-2 bg-blue-500 text-white px-8 py-4 font-semibold hover:bg-blue-600 transition-all hover:scale-105 shadow-lg"
            >
              Start Managing Clients
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-4">
            Everything You Need to Manage Clients
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            From onboarding to ongoing communication, CoachEasy streamlines
            every aspect of client management.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-6 border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 bg-blue-100 flex items-center justify-center mb-4">
                    <Icon size={24} className="text-blue-600" />
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
              <h2 className="text-3xl font-bold mb-6">
                Build Stronger Client Relationships
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Never Miss a Detail</h4>
                    <p className="text-gray-600">
                      Keep all client information, notes, and history in one
                      accessible place.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Stay Connected</h4>
                    <p className="text-gray-600">
                      Communicate efficiently without switching between apps or
                      platforms.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Scale Your Practice</h4>
                    <p className="text-gray-600">
                      Handle more clients without sacrificing the personal touch
                      that makes you great.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 shadow-xl">
              <div className="space-y-4">
                <div className="h-4 bg-gray-100 w-3/4"></div>
                <div className="h-4 bg-gray-100 w-1/2"></div>
                <div className="h-32 bg-blue-50 flex items-center justify-center">
                  <IconUsers size={48} className="text-blue-300" />
                </div>
                <div className="h-4 bg-gray-100 w-5/6"></div>
                <div className="h-4 bg-gray-100 w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Simplify Client Management?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join coaches who are saving hours every week with CoachEasy&apos;s
            intuitive client management tools.
          </p>
          <Link
            href="https://admin.coacheasy.app/login"
            className="inline-flex items-center gap-2 bg-blue-500 text-white px-8 py-4 font-semibold hover:bg-blue-600 transition-all hover:scale-105 shadow-lg"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
