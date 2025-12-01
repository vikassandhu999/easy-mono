"use client";
import { IconCheck, IconArrowRight } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

const APP_LOGIN_URL = "https://admin.coacheasy.app/login";

const PRICING_PLANS = [
  {
    id: "starter",
    name: "Starter",
    description:
      "Perfect for coaches just starting out with a small client base.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    priceDetail: "Forever",
    clients: "Up to 2 clients",
    buttonText: "Start Free",
    buttonStyle: "bg-black text-white hover:bg-gray-800",
    popular: false,
    features: [
      "Client Management",
      "Workout Builder",
      "Nutrition Plans",
      "Progress Tracking",
      "1-1 Chat Messaging",
      "Mobile App Access",
      "Basic Analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description:
      "For growing coaches ready to scale their business with more clients.",
    monthlyPrice: 99,
    yearlyPrice: 92, // 7% discount
    priceDetail: "per client/month",
    clients: "3-50 clients",
    buttonText: "Start Free Trial",
    buttonStyle: "bg-blue-500 text-white hover:bg-blue-600",
    popular: true,
    features: [
      "Everything in Starter",
      "Up to 50 clients",
      "Custom Exercise Library",
      "Habit Coaching",
      "Forms & Questionnaires",
      "Group Chat",
      "Payment Processing",
      "Website Builder",
      "Advanced Analytics",
      "Priority Support",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    description:
      "For established coaches and small teams managing multiple clients.",
    monthlyPrice: 79,
    yearlyPrice: 73, // 7% discount
    priceDetail: "per client/month",
    clients: "51-500 clients",
    buttonText: "Start Free Trial",
    buttonStyle: "bg-blue-500 text-white hover:bg-blue-600",
    popular: false,
    features: [
      "Everything in Pro",
      "Up to 500 clients",
      "Team Collaboration",
      "White Label Branding",
      "API Access",
      "Custom Integrations",
      "Dedicated Account Manager",
      "Advanced Reporting",
      "Bulk Client Management",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description:
      "For large organizations and corporate wellness programs with 500+ clients.",
    monthlyPrice: null,
    yearlyPrice: null,
    priceDetail: "Let's talk",
    clients: "500+ clients",
    buttonText: "Contact Us",
    buttonStyle: "bg-black text-white hover:bg-gray-800",
    popular: false,
    features: [
      "Everything in Studio",
      "Unlimited clients",
      "Custom Development",
      "SLA & Uptime Guarantee",
      "On-premise Deployment",
      "Advanced Security",
      "Custom Onboarding",
      "24/7 Premium Support",
    ],
  },
];

const PricingSection = () => {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="px-4 md:px-0 w-full mx-auto font-sans py-20 md:py-32 bg-gradient-to-r from-blue-50 to-purple-50">
      <main className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="font-funnel text-3xl md:text-4xl lg:text-5xl xl:text-7xl font-normal leading-tight">
            Pricing That Makes Sense
          </h1>
          <p className="text-gray-600 text-lg md:text-xl mt-6 max-w-2xl mx-auto">
            Choose the plan that fits your coaching business. Start free and
            scale as you grow.
          </p>

          {/* Monthly/Yearly Switcher */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span
              className={`text-sm font-medium transition-colors ${
                !isYearly ? "text-gray-900" : "text-gray-500"
              }`}
            >
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-14 h-7 bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{
                backgroundColor: isYearly ? "#3b82f6" : "#d1d5db",
              }}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white transition-transform ${
                  isYearly ? "translate-x-7" : ""
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium transition-colors ${
                isYearly ? "text-gray-900" : "text-gray-500"
              }`}
            >
              Yearly
            </span>
            {isYearly && (
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1">
                Save 7%
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {PRICING_PLANS.map((plan) => {
            const displayPrice =
              plan.monthlyPrice === null
                ? "Custom"
                : plan.monthlyPrice === 0
                  ? "Free"
                  : isYearly
                    ? `₹${plan.yearlyPrice}`
                    : `₹${plan.monthlyPrice}`;

            return (
              <div
                key={plan.id}
                className={`relative bg-white border-2 p-8 transition-all hover:shadow-xl ${
                  plan.popular
                    ? "border-blue-500 shadow-lg"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-semibold px-4 py-1">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {plan.name}
                    </h3>
                    {plan.popular && (
                      <div className="w-8 h-1 bg-blue-500"></div>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm min-h-[60px]">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="mb-1">
                    <span className="text-xs text-gray-500 uppercase">
                      {plan.id === "starter"
                        ? plan.priceDetail
                        : isYearly
                          ? "per client/month (billed yearly)"
                          : plan.priceDetail}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-gray-900">
                      {displayPrice}
                    </span>
                    {displayPrice !== "Free" && displayPrice !== "Custom" && (
                      <span className="text-gray-500 text-sm">/mo</span>
                    )}
                  </div>
                  {isYearly &&
                    plan.monthlyPrice !== null &&
                    plan.monthlyPrice !== 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        ₹
                        {Math.round(
                          (isYearly ? plan.yearlyPrice : plan.monthlyPrice) *
                            12,
                        )}{" "}
                        billed annually
                      </p>
                    )}
                  <p className="text-sm text-gray-600 mt-2 font-medium">
                    {plan.clients}
                  </p>
                </div>

                <Link
                  href={APP_LOGIN_URL}
                  className={`w-full py-3 px-6 font-semibold transition-all hover:shadow-lg flex items-center justify-center gap-2 mb-8 ${plan.buttonStyle}`}
                >
                  {plan.buttonText}
                  <IconArrowRight size={20} />
                </Link>

                {plan.id !== "starter" && plan.id !== "enterprise" && (
                  <p className="text-center text-xs text-gray-500 mb-6">
                    No credit card required
                  </p>
                )}

                <div className="space-y-3 pt-6 border-t border-gray-200">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <IconCheck
                        size={20}
                        className={`flex-shrink-0 mt-0.5 ${
                          plan.popular ? "text-blue-500" : "text-gray-400"
                        }`}
                      />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            All plans include a 14-day free trial. Cancel anytime.
          </p>
          <p className="text-sm text-gray-500">
            Need a custom plan?{" "}
            <Link
              href="/support"
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              Contact Us
            </Link>
          </p>
        </div>
      </main>
    </section>
  );
};

export default PricingSection;
