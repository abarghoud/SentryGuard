'use client';

import { OnboardingStep } from '../../lib/useOnboarding';

interface OnboardingProgressProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
}

const STEPS = [
  { id: OnboardingStep.TELEGRAM_LINK, label: 'Link Telegram' },
  { id: OnboardingStep.VIRTUAL_KEY_SETUP, label: 'Virtual Key' },
  { id: OnboardingStep.TELEMETRY_ACTIVATION, label: 'Enable Telemetry' },
];

export default function OnboardingProgress({
  currentStep,
  completedSteps,
}: OnboardingProgressProps) {
  return (
    <div className="flex items-center justify-between gap-2 sm:gap-4 mb-8">
      {STEPS.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = currentStep === step.id;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center flex-1">
              <div
                className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm sm:text-base transition-all ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
            </div>

            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-1 mx-1 sm:mx-2 rounded-full transition-all ${
                  isCompleted
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
