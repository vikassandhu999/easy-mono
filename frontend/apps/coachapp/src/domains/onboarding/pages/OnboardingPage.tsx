import { Spinner } from "@heroui/react";
import React, { useState } from "react";
import { Navigate } from "react-router";

import { useGetMyBusinessQuery } from "@/services/business/business";

import BusinessStep from "../components/BusinessStep";
import CoachProfileStep from "../components/CoachProfileStep";

const STEPS = [
  { label: "Business", description: "Set up your business" },
  { label: "Profile", description: "Complete your profile" },
] as const;

/**
 * Multi-step onboarding wizard.
 * Step 1: Create business (name, handle, about)
 * Step 2: Complete coach profile (name, title, bio)
 *
 * Once both steps are done, redirects to the app.
 */
const OnboardingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Check if business already exists (user refreshed mid-onboarding)
  const { data: business, isLoading } = useGetMyBusinessQuery();

  // If business already exists, skip to step 2
  React.useEffect(() => {
    if (business && currentStep === 0) {
      setCurrentStep(1);
    }
  }, [business, currentStep]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isComplete) {
    return <Navigate replace to="/" />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-neutral-900">
          Welcome! Let&apos;s get you set up.
        </h1>
      </header>

      {/* Step indicator */}
      <div className="mx-auto w-full max-w-xl px-6 pt-8">
        <div className="flex items-center gap-2">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.label}>
              {/* Step circle + label */}
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                    index < currentStep
                      ? "bg-green-600 text-white"
                      : index === currentStep
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-200 text-neutral-500"
                  }`}
                >
                  {index < currentStep ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    index <= currentStep
                      ? "text-neutral-900"
                      : "text-neutral-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line between steps */}
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    index < currentStep ? "bg-green-600" : "bg-neutral-200"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step description */}
        <p className="mt-2 text-sm text-neutral-500">
          {STEPS[currentStep]?.description}
        </p>
      </div>

      {/* Step content */}
      <div className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
        {currentStep === 0 && (
          <BusinessStep onComplete={() => setCurrentStep(1)} />
        )}
        {currentStep === 1 && (
          <CoachProfileStep onComplete={() => setIsComplete(true)} />
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
