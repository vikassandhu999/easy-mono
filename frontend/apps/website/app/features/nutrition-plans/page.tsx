import type { Metadata } from "next";
import Header from "@/@components/header";
import Footer from "@/@components/home/Footer";
import Link from "next/link";
import {
  IconApple,
  IconChartBar,
  IconClipboardList,
  IconUsers,
  IconCalendar,
  IconArrowRight,
} from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Nutrition Plans",
  description:
    "Create personalized nutrition plans for your coaching clients. Track macros, meal schedules, and dietary preferences with CoachEasy.",
  openGraph: {
    title: "Nutrition Plans | CoachEasy",
    description:
      "Create personalized nutrition plans for your coaching clients. Track macros, meal schedules, and dietary preferences with CoachEasy.",
    url: "https://coacheasy.app/features/nutrition-plans",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CoachEasy Nutrition Plans Feature",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nutrition Plans | CoachEasy",
    description:
      "Create personalized nutrition plans for your coaching clients. Track macros, meal schedules, and dietary preferences.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://coacheasy.app/features/nutrition-plans",
  },
};

const FEATURES = [
  {
    icon: IconClipboardList,
    title: "Custom Meal Plans",
    description:
      "Build personalized meal plans tailored to each client's goals, preferences, and dietary restrictions.",
  },
  {
    icon: IconChartBar,
    title: "Macro & Calorie Tracking",
    description:
      "Set daily macro targets and calorie goals. Clients can log their intake and track progress over time.",
  },
  {
    icon: IconApple,
    title: "Food Library",
    description:
      "Access a comprehensive food database with nutritional information to quickly build balanced meals.",
  },
  {
    icon: IconUsers,
    title: "Client-Specific Customization",
    description:
      "Account for allergies, intolerances, and preferences. Create plans that clients will actually follow.",
  },
  {
    icon: IconCalendar,
    title: "Scheduled Meal Timing",
    description:
      "Plan meals around training schedules for optimal performance and recovery nutrition.",
  },
];

const APP_LOGIN_URL = "https://admin.coacheasy.app/login";

export default function NutritionPlansPage() {
  return (
    <main>
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-emerald-100 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-4 py-1 bg-green-100 text-green-700 text-sm font-medium mb-4">
              Nutrition Planning
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Fuel Your Clients&apos; Success with{" "}
              <span className="text-green-600">Smart Nutrition Plans</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Create personalized nutrition strategies that complement training
              programs. Help clients achieve their goals with balanced,
              sustainable eating habits.
            </p>
            <Link
              href={APP_LOGIN_URL}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-4 font-semibold hover:bg-green-700 transition-all hover:scale-105 shadow-lg"
            >
              Start Creating Plans
              <IconArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for Nutrition Coaching
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional tools to create, deliver, and track nutrition plans
              that drive real results.
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
                  <div className="w-12 h-12 bg-green-100 flex items-center justify-center mb-4">
                    <Icon size={24} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How Nutrition Planning Works
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {[
                {
                  step: "1",
                  title: "Assess Client Needs",
                  description:
                    "Gather information about goals, dietary preferences, allergies, and lifestyle factors.",
                },
                {
                  step: "2",
                  title: "Build the Plan",
                  description:
                    "Create customized meal plans with specific foods, portions, and timing recommendations.",
                },
                {
                  step: "3",
                  title: "Deliver to Client",
                  description:
                    "Clients access their nutrition plan through the mobile app with easy-to-follow guidance.",
                },
                {
                  step: "4",
                  title: "Track & Adjust",
                  description:
                    "Monitor client adherence and results. Make adjustments based on progress and feedback.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white flex items-center justify-center font-bold text-lg">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Complete the Picture with Nutrition
          </h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Training and nutrition go hand in hand. Give your clients the full
            coaching experience they deserve.
          </p>
          <Link
            href={APP_LOGIN_URL}
            className="inline-flex items-center gap-2 bg-white text-green-600 px-8 py-4 font-semibold hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
          >
            Get Started Free
            <IconArrowRight size={20} />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
