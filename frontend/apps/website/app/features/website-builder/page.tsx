import type { Metadata } from "next";
import Header from "@/@components/header";
import Footer from "@/@components/home/Footer";
import Link from "next/link";
import {
  IconWorld,
  IconPalette,
  IconDeviceMobile,
  IconLink,
  IconPhoto,
  IconArrowRight,
  IconBrandGoogle,
} from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Website Builder",
  description:
    "Create a professional coaching website in minutes. No coding required. Showcase your services, testimonials, and attract new clients with CoachEasy.",
  openGraph: {
    title: "Website Builder | CoachEasy",
    description:
      "Create a professional coaching website in minutes. No coding required. Showcase your services and attract new clients.",
    url: "https://coacheasy.app/features/website-builder",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CoachEasy Website Builder Feature",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Website Builder | CoachEasy",
    description:
      "Create a professional coaching website in minutes. No coding required. Showcase your services and attract new clients.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://coacheasy.app/features/website-builder",
  },
};

const FEATURES = [
  {
    icon: IconPalette,
    title: "Beautiful Templates",
    description:
      "Choose from professionally designed templates tailored for fitness and wellness coaches. Customize colors, fonts, and layouts to match your brand.",
  },
  {
    icon: IconDeviceMobile,
    title: "Mobile Responsive",
    description:
      "Your website looks perfect on every device. Potential clients can browse your services whether they're on desktop, tablet, or phone.",
  },
  {
    icon: IconLink,
    title: "Custom Domain",
    description:
      "Use your own domain name for a professional presence, or start with a free CoachEasy subdomain while you grow.",
  },
  {
    icon: IconPhoto,
    title: "Media Gallery",
    description:
      "Showcase transformation photos, facility images, and videos. Build trust with visual proof of your coaching results.",
  },
  {
    icon: IconBrandGoogle,
    title: "SEO Optimized",
    description:
      "Built-in SEO tools help potential clients find you on Google. Rank higher and attract organic traffic to your coaching business.",
  },
  {
    icon: IconWorld,
    title: "Integrated Booking",
    description:
      "Let visitors book consultations or sign up for programs directly from your website. Convert traffic into paying clients.",
  },
];

const SECTIONS = [
  "Hero section with your value proposition",
  "About you and your coaching philosophy",
  "Services and programs you offer",
  "Client testimonials and success stories",
  "Pricing packages",
  "Contact form and booking integration",
  "FAQ section",
  "Social media links",
];

const APP_LOGIN_URL = "https://admin.coacheasy.app/login";

export default function WebsiteBuilderPage() {
  return (
    <main>
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-50 to-pink-50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-4 py-1 bg-purple-100 text-purple-700 text-sm font-medium mb-4">
              Website Builder
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Your Professional Coaching Website,{" "}
              <span className="text-purple-600">Built in Minutes</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              No coding skills needed. Create a stunning website that showcases
              your expertise, attracts new clients, and grows your coaching
              business—all from one platform.
            </p>
            <Link
              href={APP_LOGIN_URL}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-8 py-4 font-semibold hover:bg-purple-700 transition-all hover:scale-105 shadow-lg"
            >
              Build Your Website
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
              Everything You Need to Build Your Online Presence
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional tools that make it easy to create, customize, and
              launch your coaching website.
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
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What's Included Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Every Section You Need to Convert Visitors
              </h2>
              <p className="text-gray-600 text-lg mb-8">
                Our templates come with all the essential sections that
                successful coaching websites need. Just add your content and
                you&apos;re ready to launch.
              </p>
              <ul className="space-y-3">
                {SECTIONS.map((section) => (
                  <li key={section} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-purple-600"
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
                    <span className="text-gray-700">{section}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-6 shadow-xl">
              <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4">
                <IconWorld size={64} className="text-purple-300" />
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-100 w-3/4"></div>
                <div className="h-4 bg-gray-100 w-1/2"></div>
                <div className="h-4 bg-gray-100 w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why You Need Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Every Coach Needs a Professional Website
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl font-bold text-purple-600 mb-2">81%</div>
              <p className="text-gray-600">
                of people research online before choosing a coach or trainer
              </p>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-purple-600 mb-2">24/7</div>
              <p className="text-gray-600">
                Your website works for you around the clock, even while you
                sleep
              </p>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-purple-600 mb-2">3x</div>
              <p className="text-gray-600">
                Coaches with websites report 3x more client inquiries on average
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Launch Your Coaching Website?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join coaches who are attracting more clients with professional
            websites built on CoachEasy.
          </p>
          <Link
            href={APP_LOGIN_URL}
            className="inline-flex items-center gap-2 bg-white text-purple-600 px-8 py-4 font-semibold hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
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
