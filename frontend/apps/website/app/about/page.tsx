import type { Metadata } from "next";
import Header from "@/@components/header";
import Footer from "@/@components/home/Footer";
import {
  IconHeart,
  IconUsers,
  IconBulb,
  IconMapPin,
} from "@tabler/icons-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Who We Are | CoachEasy",
  description:
    "Meet the brothers behind CoachEasy. Learn about our mission to simplify coaching workflows for fitness professionals worldwide.",
  openGraph: {
    title: "Who We Are | CoachEasy",
    description:
      "Meet the brothers behind CoachEasy. Learn about our mission to simplify coaching workflows for fitness professionals worldwide.",
    url: "https://coacheasy.app/about",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CoachEasy - About Us",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Who We Are | CoachEasy",
    description:
      "Meet the brothers behind CoachEasy. Learn about our mission to simplify coaching workflows for fitness professionals worldwide.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://coacheasy.app/about",
  },
};

export default function AboutPage() {
  return (
    <main>
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Our story and Vision
          </h1>
          <p className="text-xl text-gray-600">
            Building the simplest coaching platform—because fitness coaches
            deserve tools that just work.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold mb-8 text-center">Our Story</h2>

            <div className="bg-white p-8 md:p-12 shadow-sm border border-gray-100 mb-12">
              <div className="flex items-center gap-3 mb-6">
                <IconMapPin className="text-blue-500" size={24} />
                <span className="text-gray-600 font-medium">Punjab, India</span>
              </div>

              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                We&apos;re two brothers from Punjab, India—one 21, the other
                25—who believe that software should make life easier, not more
                complicated.
              </p>

              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                My brother brings 5 years of experience building software in the
                industry. I&apos;ve spent the last 2 years working with
                startups, learning what it takes to build products people
                actually love. Together, we started CoachEasy.
              </p>

              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                Before writing a single line of code, we did something simple:
                we listened. We talked to hundreds of fitness coaches—in gyms,
                online, over calls—asking one question:{" "}
                <span className="font-semibold">
                  &quot;What&apos;s making your work harder than it needs to
                  be?&quot;
                </span>
              </p>

              <p className="text-gray-700 text-lg leading-relaxed mb-8">
                The answer was always the same. Coaches were drowning in
                cluttered apps, juggling multiple tools, and spending more time
                on admin work than actually coaching. They didn&apos;t need more
                features. They needed less noise.
              </p>

              <p className="text-gray-500 text-right italic">
                — Navraj Sandhu (Founder @CoachEasy)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Philosophy */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold mb-12 text-center">
            What We Believe
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 shadow-sm">
              <div className="w-14 h-14 bg-blue-100 flex items-center justify-center mb-6">
                <IconBulb size={28} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Simplicity Wins</h3>
              <p className="text-gray-600">
                Every feature we build has to pass one test: does it make a
                coach&apos;s life easier? If not, it doesn&apos;t ship.
              </p>
            </div>

            <div className="bg-white p-8 shadow-sm">
              <div className="w-14 h-14 bg-purple-100 flex items-center justify-center mb-6">
                <IconUsers size={28} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Coaches Know Best</h3>
              <p className="text-gray-600">
                We don&apos;t assume. We ask. Every decision is informed by real
                conversations with real coaches facing real challenges.
              </p>
            </div>

            <div className="bg-white p-8 shadow-sm">
              <div className="w-14 h-14 bg-green-100 flex items-center justify-center mb-6">
                <IconHeart size={28} className="text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Useful Over Flashy</h3>
              <p className="text-gray-600">
                We&apos;d rather give you 10 features that work perfectly than
                100 that you&apos;ll never use. Quality over quantity, always.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Team */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold mb-12 text-center">Meet Us</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 text-center">
              <div className="w-24 h-24 bg-blue-200 mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl font-bold text-blue-600">N</span>
              </div>
              <h3 className="text-xl font-semibold mb-1">Navraj Sandhu</h3>
              <p className="text-blue-600 font-medium mb-4">Co-Founder</p>
              <p className="text-gray-600 text-sm">
                21 years old. 2 years in the startup world. Obsessed with
                building products that people actually want to use.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 text-center">
              <div className="w-24 h-24 bg-purple-200 mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl font-bold text-purple-600">V</span>
              </div>
              <h3 className="text-xl font-semibold mb-1">Vikas Sandhu</h3>
              <p className="text-purple-600 font-medium mb-4">Co-Founder</p>
              <p className="text-gray-600 text-sm">
                25 years old. 5 years of software engineering experience.
                Turning ideas into reliable, scalable code.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Our Mission
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            To remove the clutter from coaching workflows. To build software
            that serves fitness coaches with only what&apos;s useful—nothing
            more, nothing less.
          </p>
          <p className="text-blue-200 italic">
            &quot;We&apos;re not here to bloat your work with features.
            We&apos;re here to help you focus on what you do
            best—coaching.&quot;
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Join Us on This Journey</h2>
          <p className="text-gray-600 text-lg mb-8">
            We&apos;re building CoachEasy in public, with feedback from coaches
            like you. Have ideas? We&apos;d love to hear them.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="https://chat.whatsapp.com/J2KRTVSsTS48wNi3gx1nsp"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 text-white px-8 py-3 font-semibold hover:bg-green-700 transition-colors"
            >
              Join Our WhatsApp Community
            </Link>
            <Link
              href="https://admin.coacheasy.app/login"
              className="bg-blue-600 text-white px-8 py-3 font-semibold hover:bg-blue-700 transition-colors"
            >
              Try CoachEasy Free
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
