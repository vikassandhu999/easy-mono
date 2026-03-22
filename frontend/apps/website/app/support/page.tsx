import type { Metadata } from "next";
import Header from "@/@components/header";
import Footer from "@/@components/home/Footer";
import {
  IconMail,
  IconPhone,
  IconBrandWhatsapp,
  IconMessageCircle,
  IconClock,
} from "@tabler/icons-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help with CoachEasy. Contact our support team via email, phone, or WhatsApp. We typically respond within 24-48 hours.",
  openGraph: {
    title: "Support | CoachEasy",
    description:
      "Get help with CoachEasy. Contact our support team via email, phone, or WhatsApp for quick assistance.",
    url: "https://coacheasy.app/support",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CoachEasy Support",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Support | CoachEasy",
    description:
      "Get help with CoachEasy. Contact our support team via email, phone, or WhatsApp for quick assistance.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://coacheasy.app/support",
  },
};

const CONTACT_OPTIONS = [
  {
    icon: IconMail,
    title: "Email Support",
    description: "For general inquiries and support requests",
    primary: "contact@coacheasy.app",
    secondary: "asyncnavi@gmail.com",
    href: "mailto:contact@coacheasy.app",
    color: "blue",
  },
  {
    icon: IconPhone,
    title: "Phone Support",
    description: "Speak directly with our team",
    primary: "+91 76960 78183",
    secondary: "Available during business hours",
    href: "tel:+917696078183",
    color: "green",
  },
  {
    icon: IconBrandWhatsapp,
    title: "WhatsApp Community",
    description: "Join our community for updates and discussions",
    primary: "Join WhatsApp Group",
    secondary: "Connect with other coaches",
    href: "https://chat.whatsapp.com/J2KRTVSsTS48wNi3gx1nsp",
    color: "emerald",
  },
];

export default function SupportPage() {
  const supportJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "CoachEasy Support",
    description: "Get help with CoachEasy coaching platform",
    url: "https://coacheasy.app/support",
    mainEntity: {
      "@type": "Organization",
      name: "CoachEasy",
      contactPoint: [
        {
          "@type": "ContactPoint",
          email: "contact@coacheasy.app",
          telephone: "+91-76960-78183",
          contactType: "customer support",
          availableLanguage: ["English", "Hindi"],
          areaServed: "Worldwide",
        },
      ],
    },
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(supportJsonLd) }}
      />
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 text-sm font-medium mb-6">
            <IconMessageCircle size={18} />
            Support
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            We&apos;re Here to Help
          </h1>
          <p className="text-xl text-gray-600">
            Have questions or need assistance? Our team is ready to support you
            on your coaching journey. Reach out through any of the channels
            below.
          </p>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-3 gap-8">
            {CONTACT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const bgColor =
                option.color === "blue"
                  ? "bg-blue-100"
                  : option.color === "green"
                    ? "bg-green-100"
                    : "bg-emerald-100";
              const iconColor =
                option.color === "blue"
                  ? "text-blue-600"
                  : option.color === "green"
                    ? "text-green-600"
                    : "text-emerald-600";
              const btnBg =
                option.color === "blue"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : option.color === "green"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-emerald-600 hover:bg-emerald-700";

              return (
                <div
                  key={option.title}
                  className="bg-white p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow text-center"
                >
                  <div
                    className={`w-16 h-16 ${bgColor} flex items-center justify-center mx-auto mb-6`}
                  >
                    <Icon size={32} className={iconColor} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{option.title}</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    {option.description}
                  </p>
                  <div className="mb-4">
                    <div className="font-medium text-gray-900">
                      {option.primary}
                    </div>
                    {option.secondary && (
                      <div className="text-sm text-gray-500 mt-1">
                        {option.secondary}
                      </div>
                    )}
                  </div>
                  <Link
                    href={option.href}
                    target={
                      option.href.startsWith("http") ? "_blank" : undefined
                    }
                    rel={
                      option.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className={`inline-block ${btnBg} text-white px-6 py-2 font-medium transition-colors`}
                  >
                    {option.title === "WhatsApp Community"
                      ? "Join Now"
                      : "Contact"}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Response Time */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white p-8 md:p-12 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-blue-100 flex items-center justify-center">
                  <IconClock size={40} className="text-blue-600" />
                </div>
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold mb-2">
                  Expected Response Time
                </h3>
                <p className="text-gray-600 mb-4">
                  We typically respond to all inquiries within 24-48 hours
                  during business days. For urgent matters, please reach out via
                  phone or WhatsApp for faster assistance.
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="bg-gray-100 px-4 py-2">
                    <span className="text-sm text-gray-500">Email:</span>
                    <span className="font-medium ml-2">24-48 hours</span>
                  </div>
                  <div className="bg-gray-100 px-4 py-2">
                    <span className="text-sm text-gray-500">Phone:</span>
                    <span className="font-medium ml-2">Immediate</span>
                  </div>
                  <div className="bg-gray-100 px-4 py-2">
                    <span className="text-sm text-gray-500">WhatsApp:</span>
                    <span className="font-medium ml-2">Same day</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Teaser */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 mb-8">
            Before reaching out, you might find your answer in our FAQ section
            on the homepage.
          </p>
          <Link
            href="/#faq"
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-3 font-medium hover:bg-gray-800 transition-colors"
          >
            View FAQs
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
