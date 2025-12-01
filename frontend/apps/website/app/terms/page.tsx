import type { Metadata } from "next";
import Header from "@/@components/header";
import Footer from "@/@components/home/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for CoachEasy coaching platform. Read our terms governing access and use of our fitness coaching software.",
  openGraph: {
    title: "Terms of Service | CoachEasy",
    description:
      "Terms of Service for CoachEasy coaching platform. Read our terms governing access and use of our fitness coaching software.",
    url: "https://coacheasy.app/terms",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CoachEasy Terms of Service",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service | CoachEasy",
    description:
      "Terms of Service for CoachEasy coaching platform. Read our terms governing access and use of our fitness coaching software.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://coacheasy.app/terms",
  },
};

export default function TermsOfServicePage() {
  return (
    <main>
      <Header />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Effective Date: 10 Sept, 2025</p>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700 mb-6">
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of
            CoachEasy (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;). CoachEasy provides a software
            platform that enables professional coaches to manage clients, deliver
            coaching programs, schedule sessions, and communicate securely. By
            accessing or using the platform, you agree to these Terms and our
            Privacy Policy. If you do not agree, do not use the Services.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>&quot;Coach&quot;</strong> – A registered user who provides
                coaching services.
              </li>
              <li>
                <strong>&quot;Client&quot;</strong> – An individual whose data is managed
                by a Coach within the platform.
              </li>
              <li>
                <strong>&quot;Content&quot;</strong> – Any data, messages, documents,
                notes, goals, or materials uploaded or created in the platform.
              </li>
              <li>
                <strong>&quot;Services&quot;</strong> – The CoachEasy web application,
                website, features, and related offerings.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              2. Account Registration & Security
            </h2>
            <p className="text-gray-700">
              You must provide accurate information when creating an account. You
              are responsible for safeguarding login credentials and all activity
              under your account. Notify us promptly of unauthorized access. We
              may suspend accounts involved in suspicious or abusive behavior.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Acceptable Use</h2>
            <p className="text-gray-700 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                Upload unlawful, defamatory, abusive, or infringing content.
              </li>
              <li>
                Attempt to probe, breach, or disable security or integrity of the
                platform.
              </li>
              <li>Misuse messaging or notifications to spam clients.</li>
              <li>
                Reverse engineer, modify, or create derivative works of the
                Services.
              </li>
              <li>Use another user&apos;s account without permission.</li>
            </ul>
            <p className="text-gray-700 mt-4">
              We reserve the right to investigate and take appropriate action
              against violations, including termination.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              4. Client Data & Responsibility
            </h2>
            <p className="text-gray-700">
              Coaches are data controllers for the personal information of clients
              they input or collect. You must ensure you have proper consent and a
              lawful basis before storing client information. Do not collect
              sensitive categories unless necessary and legally permitted.
              CoachEasy acts as a processor for such data and processes it only to
              provide the Services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              5. Content Ownership & License
            </h2>
            <p className="text-gray-700">
              You retain ownership of Content you submit. By using the Services,
              you grant us a limited, revocable, non-exclusive, worldwide license
              to host, process, transmit, and display your Content solely to
              operate and improve the Services. We do not sell your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              6. Intellectual Property
            </h2>
            <p className="text-gray-700">
              The platform, underlying software, branding, and design elements are
              owned by CoachEasy or its licensors. Except for the limited right to
              access and use the Services, no rights are granted. You may not
              copy, distribute, resell, frame, or exploit any part of the platform
              without written consent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              7. Beta / Early Access
            </h2>
            <p className="text-gray-700">
              During beta or trial phases, features may be incomplete, change
              frequently, or become unavailable. We provide early access on an
              as-is basis without warranties. Feedback you submit may be used to
              improve the Services without obligation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              8. Payment & Subscriptions
            </h2>
            <p className="text-gray-700">
              If subscription plans are introduced, pricing, billing intervals,
              and renewal terms will be disclosed at purchase. Unless canceled
              before renewal, subscriptions renew automatically. You authorize us
              or our payment processor to charge applicable fees. Fees are
              generally non-refundable except where required by law or explicitly
              stated.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
            <p className="text-gray-700">
              You may stop using the Services at any time. We may suspend or
              terminate access for violations, fraud, security concerns, or
              non-payment. Upon termination, we may delete or restrict access to
              Content after a reasonable retention period unless legally required
              to retain it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              10. Third-Party Services
            </h2>
            <p className="text-gray-700">
              We may integrate with calendar, email, analytics, or payment
              providers. Use of third-party tools is subject to their terms. We
              are not responsible for third-party acts or omissions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              11. Service Availability & Disclaimer
            </h2>
            <p className="text-gray-700">
              We aim for high availability but do not guarantee uninterrupted or
              error-free operation. Services are provided &quot;as is&quot; without
              warranties, express or implied (including fitness for a particular
              purpose, merchantability, or non-infringement), to the maximum
              extent permitted by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              12. Limitation of Liability
            </h2>
            <p className="text-gray-700">
              To the fullest extent permitted by law, CoachEasy and its officers,
              directors, employees, and partners will not be liable for indirect,
              incidental, special, consequential, exemplary, or punitive damages,
              or loss of profits, data, goodwill, or revenue, even if advised of
              the possibility. Our aggregate liability for claims arising out of
              these Terms or the Services will not exceed the greater of (a)
              amounts paid by you in the preceding 6 months or (b) INR 10,000.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Indemnification</h2>
            <p className="text-gray-700">
              You agree to indemnify and hold harmless CoachEasy from claims
              arising out of (a) your misuse of the Services; (b) violation of
              these Terms; (c) infringement of intellectual property or privacy
              rights; or (d) Content you submit.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              14. Governing Law & Dispute Resolution
            </h2>
            <p className="text-gray-700">
              These Terms are governed by the laws of India. Courts located in
              Bengaluru, Karnataka (or another specified jurisdiction if updated)
              will have exclusive jurisdiction, except that we may seek injunctive
              or equitable relief in any court of competent jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">15. Changes to Terms</h2>
            <p className="text-gray-700">
              We may revise these Terms periodically. Material changes will be
              communicated (e.g., email or in-app notice). Continued use after the
              effective date constitutes acceptance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">16. Notices & Contact</h2>
            <p className="text-gray-700">
              Formal legal notices and questions should be sent to:{" "}
              <a
                href="mailto:contact@coacheasy.app"
                className="text-blue-500 hover:underline"
              >
                contact@coacheasy.app
              </a>
            </p>
            <p className="text-gray-700 mt-4 italic">
              If you are entering client data, ensure your coaching practice
              complies with applicable professional and privacy standards.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
