import type { Metadata } from "next";
import Header from "@/@components/header";
import Footer from "@/@components/home/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for CoachEasy coaching platform. Learn how we collect, use, and protect your personal information.",
  openGraph: {
    title: "Privacy Policy | CoachEasy",
    description:
      "Privacy Policy for CoachEasy coaching platform. Learn how we collect, use, and protect your personal information.",
    url: "https://coacheasy.app/privacy",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CoachEasy Privacy Policy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | CoachEasy",
    description:
      "Privacy Policy for CoachEasy coaching platform. Learn how we collect, use, and protect your personal information.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://coacheasy.app/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main>
      <Header />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Effective Date: 10 Sept, 2025</p>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700 mb-6">
            CoachEasy (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides a
            software-as-a-service platform that helps professional coaches manage
            clients, deliver programs, schedule sessions, track progress, and
            communicate securely. This Privacy Policy explains how we collect,
            use, disclose, and protect personal information when you access or
            use our website, platform, and related services (collectively, the
            &quot;Services&quot;).
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              1. Information We Collect
            </h2>
            <p className="text-gray-700 mb-4">
              We collect information in three primary ways: (a) information you
              provide directly, (b) information collected automatically, and (c)
              information provided by clients about their own participants (where
              applicable).
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">
              a. Information You Provide
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Account Information:</strong> Name, email address,
                password (hashed), profile details, timezone, and
                organization/team info.
              </li>
              <li>
                <strong>Client & Participant Data:</strong> Names, emails, goals,
                session notes, progress metrics, uploaded documents, and program
                assignments you choose to store.
              </li>
              <li>
                <strong>Billing Information:</strong> If applicable, subscription
                plan, limited payment metadata (payment details are processed by
                our third-party payment processor; we do not store full card
                numbers).
              </li>
              <li>
                <strong>Communications:</strong> Messages you send through in-app
                messaging, support requests, feedback, and email interactions.
              </li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">
              b. Automatically Collected Information
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Usage Data:</strong> Features used, timestamps, pages
                viewed, referral URLs, approximate location (derived from IP),
                and interaction patterns (for improving UX and performance).
              </li>
              <li>
                <strong>Device & Technical Data:</strong> Browser type, operating
                system, device type, screen size, and log files.
              </li>
              <li>
                <strong>Cookies & Similar Technologies:</strong> Session
                management, authentication, preference storage, and analytics.
                You can control cookies via browser settings, but essential
                cookies are required for core functionality.
              </li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">
              c. Client-Provided Data
            </h3>
            <p className="text-gray-700">
              If you are a coach entering information about your clients, you are
              responsible for obtaining any necessary consent and ensuring the
              accuracy and lawful basis for processing that data. We act as a
              data processor for such client-submitted personal information and
              process it only as instructed by you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              2. How We Use Information
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                Provide, operate, and maintain the platform and core coaching
                features.
              </li>
              <li>Authenticate users and secure accounts.</li>
              <li>
                Facilitate scheduling, messaging, program delivery, and progress
                tracking.
              </li>
              <li>
                Send transactional emails (session reminders, updates, account
                notices).
              </li>
              <li>
                Improve performance, reliability, and usability through
                analytics.
              </li>
              <li>
                Detect, prevent, and respond to fraud, abuse, or security
                threats.
              </li>
              <li>
                Comply with legal obligations and enforce terms of service.
              </li>
              <li>
                Communicate product updates, with opt-out for non-essential
                marketing.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              3. Legal Basis (Where Applicable)
            </h2>
            <p className="text-gray-700">
              Depending on jurisdiction, we rely on one or more of the following:
              performance of a contract, legitimate interests (e.g., platform
              improvement, security), consent (marketing, certain analytics), and
              legal compliance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              4. Sharing & Disclosure
            </h2>
            <p className="text-gray-700 mb-4">
              We do not sell personal data. We may share limited data with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Service Providers:</strong> Hosting, analytics, email
                delivery, payment processing, and error monitoring—only as needed
                to perform services.
              </li>
              <li>
                <strong>Business Transfers:</strong> In a merger, acquisition, or
                asset sale, data may be transferred subject to this policy.
              </li>
              <li>
                <strong>Legal & Security:</strong> To comply with law, respond to
                lawful requests, or protect rights, safety, and integrity.
              </li>
              <li>
                <strong>Aggregated / De-Identified Data:</strong> Used for
                insights and product improvement; not linked to identifiable
                individuals.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-gray-700">
              We employ industry-aligned safeguards including encryption in
              transit (HTTPS), role-based access, least-privilege principles,
              monitoring, and routine backups. No method is 100% secure; we
              continuously improve defenses.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-gray-700">
              Account and coaching data are retained while your subscription or
              trial remains active. Upon request or account termination, data may
              be deleted or anonymized unless retention is required for legal,
              billing, dispute resolution, or security reasons. Backups are
              purged on a rolling schedule.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              7. Your Rights & Choices
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Access, correct, export, or delete your personal data.</li>
              <li>Request restriction or object to certain processing.</li>
              <li>Opt out of marketing emails (unsubscribe link included).</li>
              <li>Disable non-essential cookies (where applicable).</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Requests can be submitted via email at{" "}
              <a
                href="mailto:contact@coacheasy.app"
                className="text-blue-500 hover:underline"
              >
                contact@coacheasy.app
              </a>
              . We may verify identity before fulfilling requests.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              8. International Data Transfers
            </h2>
            <p className="text-gray-700">
              Your information may be processed in jurisdictions where our or our
              providers&apos; servers are located. We implement safeguards
              consistent with applicable data protection laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              9. Children&apos;s Privacy
            </h2>
            <p className="text-gray-700">
              Our Services are not directed to children under 16. If we learn
              that personal data of a minor has been collected without consent,
              we will take reasonable steps to delete it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              10. Changes to This Policy
            </h2>
            <p className="text-gray-700">
              We may update this Privacy Policy periodically. Material changes
              will be communicated (e.g., dashboard notice or email). The
              &quot;Effective Date&quot; will always reflect the latest version.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-gray-700">
              For questions, concerns, or data requests, contact:{" "}
              <a
                href="mailto:contact@coacheasy.app"
                className="text-blue-500 hover:underline"
              >
                contact@coacheasy.app
              </a>
            </p>
            <p className="text-gray-700 mt-4 italic">
              If you are a coach entering client data, ensure you have informed
              consent and comply with local privacy regulations relevant to your
              practice.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
