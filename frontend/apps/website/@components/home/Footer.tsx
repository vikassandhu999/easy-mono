import Image from "next/image";
import Link from "next/link";
import {
  IconBrandInstagram,
} from "@tabler/icons-react";

const FOOTER_LINKS = {
  features: {
    title: "FEATURES",
    links: [
      { label: "Client Management", href: "/features/client-management" },
      { label: "Training Plans", href: "/features/training-plans" },
      { label: "Nutrition Plans", href: "/features/nutrition-plans" },
      { label: "Progress Tracking", href: "/features/progress-tracking" },
      { label: "Payment Processing", href: "/features/payment-processing" },
      { label: "Website Builder", href: "/features/website-builder" },
    ],
  },
  resources: {
    title: "RESOURCES & SUPPORT",
    links: [
      { label: "Report a Bug", href: "https://coacheasy.notion.site/29338d91a7b880a7808acdab65799f0a?pvs=105" },
      { label: "Request Feature", href: "https://coacheasy.notion.site/29338d91a7b880109e0fef65910b1249?pvs=105" },
      { label: "Contact Support", href: "/support" },
      { label: "Join WhatsApp", href: "https://chat.whatsapp.com/J2KRTVSsTS48wNi3gx1nsp" },
    ],
  },
  company: {
    title: "COMPANY",
    links: [
      { label: "Who are we?", href: "/about" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
};

const SOCIAL_LINKS = [
  { icon: IconBrandInstagram, href: "https://www.instagram.com/coacheasyapp/", label: "Instagram" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use", href: "/terms" },
];

const Footer = () => {
  return (
    <footer className="w-full bg-gray-50 font-sans">
      <div className="container mx-auto px-4 py-16 md:py-20">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          {/* Logo and Description */}
          <div className="lg:col-span-1">
            <Link href="/">
              <Image
                src="/logo.svg"
                alt="CoachEasy logo"
                width={140}
                height={140}
              />
            </Link>
            <p className="text-gray-600 text-sm mt-4">
              The all-in-one coaching platform designed for fitness coaches who
              want simplicity and power.
            </p>
          </div>

          {/* Footer Link Columns */}
          {Object.values(FOOTER_LINKS).map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-gray-900 mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-600 hover:text-blue-500 transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Large Brand Text */}
        <div className="relative mb-12 overflow-hidden">
          <h2 className="font-funnel text-[48px] xs:text-[72px] sm:text-[120px] md:text-[180px] lg:text-[240px] xl:text-[300px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-purple-200 to-blue-300 leading-none select-none text-center">
            coacheasy
          </h2>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-200 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Copyright */}
            <div className="text-gray-600 text-sm">
              © {new Date().getFullYear()} CoachEasy. All rights reserved.
            </div>

            {/* Social Links */}
            <div className="flex gap-4">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                  <Link
                    key={social.label}
                    href={social.href}
                    className="text-gray-600 hover:text-blue-500 transition-colors"
                    aria-label={social.label}
                  >
                    <Icon size={24} />
                  </Link>
                );
              })}
            </div>

            {/* Legal Links */}
            <div className="flex gap-6">
              {LEGAL_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-gray-600 hover:text-blue-500 transition-colors text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
