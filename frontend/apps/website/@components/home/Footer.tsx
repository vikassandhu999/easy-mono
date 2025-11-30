import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandTwitter,
  IconBrandYoutube,
} from "@tabler/icons-react";

const FOOTER_LINKS = {
  features: {
    title: "FEATURES",
    links: [
      { label: "Client Management", href: "#" },
      { label: "Workout Plans", href: "#" },
      { label: "Nutrition Plans", href: "#" },
      { label: "Progress Tracking", href: "#" },
      { label: "Payment Processing", href: "#" },
      { label: "Website Builder", href: "#" },
      { label: "Mobile App", href: "#" },
    ],
  },
  resources: {
    title: "RESOURCES & SUPPORT",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Learning Resources", href: "#" },
      { label: "Report a bug", href: "#" },
      { label: "Request feature", href: "#" },
      { label: "Contact Support", href: "#" },
      { label: "Join whatsapp", href: "#" },
    ],
  },
  company: {
    title: "COMPANY",
    links: [
      { label: "Who are we?", href: "#" },
      { label: "Pricing", href: "#" },
    ],
  },
};

const SOCIAL_LINKS = [
  { icon: IconBrandFacebook, href: "#", label: "Facebook" },
  { icon: IconBrandInstagram, href: "#", label: "Instagram" },
  { icon: IconBrandTwitter, href: "#", label: "Twitter" },
  { icon: IconBrandYoutube, href: "#", label: "YouTube" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms & Conditions", href: "#" },
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

          {/* Newsletter Subscription */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">
              SUBSCRIBE TO OUR NEWSLETTER
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Get the latest updates, tips, and exclusive offers delivered to
              your inbox.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="bg-black text-white p-2 hover:bg-gray-800 transition-all flex-shrink-0">
                <IconArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Large Brand Text */}
        <div className="relative mb-12 overflow-hidden">
          <h2 className="font-funnel text-[120px] sm:text-[180px] md:text-[240px] lg:text-[300px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-purple-200 to-blue-300 leading-none select-none">
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
