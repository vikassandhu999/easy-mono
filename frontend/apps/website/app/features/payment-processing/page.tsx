import type { Metadata } from "next";
import Header from "@/@components/header";
import Footer from "@/@components/home/Footer";
import Link from "next/link";
import {
  IconCreditCard,
  IconReceipt,
  IconCash,
  IconShieldCheck,
  IconChartBar,
  IconCalendarRepeat,
  IconArrowRight,
} from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Payment Processing",
  description:
    "Accept payments, manage subscriptions, and track revenue seamlessly with CoachEasy's integrated payment processing for coaches.",
  openGraph: {
    title: "Payment Processing | CoachEasy",
    description:
      "Accept payments, manage subscriptions, and track revenue seamlessly with CoachEasy's integrated payment processing for coaches.",
    url: "https://coacheasy.app/features/payment-processing",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CoachEasy Payment Processing Feature",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Payment Processing | CoachEasy",
    description:
      "Accept payments, manage subscriptions, and track revenue seamlessly with CoachEasy's integrated payment processing.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://coacheasy.app/features/payment-processing",
  },
};

const FEATURES = [
  {
    icon: IconCreditCard,
    title: "Easy Payment Collection",
    description:
      "Accept credit cards, debit cards, and UPI payments directly through the platform. Clients can pay with a single click.",
  },
  {
    icon: IconCalendarRepeat,
    title: "Recurring Subscriptions",
    description:
      "Set up monthly or custom billing cycles for ongoing coaching packages. Payments are collected automatically.",
  },
  {
    icon: IconReceipt,
    title: "Automated Invoicing",
    description:
      "Generate and send professional invoices automatically. Keep records organized for tax time and business tracking.",
  },
  {
    icon: IconShieldCheck,
    title: "Secure Transactions",
    description:
      "All payments are processed through industry-standard secure gateways. Your clients' financial data is always protected.",
  },
  {
    icon: IconChartBar,
    title: "Revenue Analytics",
    description:
      "Track your earnings, monitor payment trends, and understand your business performance with detailed reports.",
  },
  {
    icon: IconCash,
    title: "Flexible Pricing Options",
    description:
      "Create one-time packages, payment plans, or subscription tiers. Offer the pricing structure that works for your business.",
  },
];

const APP_LOGIN_URL = "https://admin.coacheasy.app/login";

export default function PaymentProcessingPage() {
  return (
    <main>
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-50 to-indigo-100 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-4 py-1 bg-purple-100 text-purple-700 text-sm font-medium mb-4">
              Payment Processing
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Get Paid{" "}
              <span className="text-purple-600">On Time, Every Time</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Stop chasing payments. CoachEasy&apos;s integrated payment system
              makes it easy to collect fees, manage subscriptions, and track
              your coaching revenue—all in one place.
            </p>
            <Link
              href={APP_LOGIN_URL}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-8 py-4 font-semibold hover:bg-purple-700 transition-all hover:scale-105 shadow-lg"
            >
              Start Accepting Payments
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
              Everything You Need to Manage Payments
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional payment tools designed specifically for coaches and
              fitness professionals.
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

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Focus on Coaching, Not Collecting
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Chasing payments is awkward and time-consuming. With CoachEasy,
                payments happen automatically so you can focus on what you do
                best—transforming lives.
              </p>
              <div className="space-y-4">
                {[
                  "Reduce payment delays by up to 80%",
                  "Professional invoices with your branding",
                  "Automatic payment reminders",
                  "Support for multiple currencies",
                  "Detailed transaction history",
                  "Easy refunds and adjustments",
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-purple-100 flex items-center justify-center">
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
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white shadow-xl p-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b">
                  <span className="font-semibold">This Month</span>
                  <span className="text-sm text-gray-500">Revenue</span>
                </div>
                <div className="text-center py-6">
                  <div className="text-5xl font-bold text-purple-600 mb-2">
                    ₹1,24,500
                  </div>
                  <div className="text-green-600 text-sm font-medium">
                    ↑ 23% from last month
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subscriptions</span>
                    <span className="font-medium">₹98,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">One-time packages</span>
                    <span className="font-medium">₹26,500</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pending</span>
                    <span className="font-medium text-orange-600">₹8,500</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Models Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Flexible Pricing for Your Business
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Create the perfect pricing structure for your coaching services
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-6 border border-gray-200 text-center">
              <div className="w-16 h-16 bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <IconCash size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">One-Time Packages</h3>
              <p className="text-gray-600">
                Perfect for consultations, assessments, or short-term coaching
                programs.
              </p>
            </div>
            <div className="bg-white p-6 border-2 border-purple-500 text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs px-3 py-1">
                Popular
              </div>
              <div className="w-16 h-16 bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <IconCalendarRepeat size={32} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Subscriptions</h3>
              <p className="text-gray-600">
                Recurring monthly or yearly billing for ongoing coaching
                relationships.
              </p>
            </div>
            <div className="bg-white p-6 border border-gray-200 text-center">
              <div className="w-16 h-16 bg-green-100 flex items-center justify-center mx-auto mb-4">
                <IconReceipt size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Payment Plans</h3>
              <p className="text-gray-600">
                Split larger packages into manageable installments for clients.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-purple-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Streamline Your Payments?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join coaches who are getting paid faster and spending less time on
            admin work.
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
