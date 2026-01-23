'use client';

interface OnboardingStepLayoutProps {
  title: string;
  description?: string;
  stepNumber: number;
  totalSteps: number;
  children: React.ReactNode;
}

export default function OnboardingStepLayout({
  title,
  description,
  stepNumber,
  totalSteps,
  children,
}: OnboardingStepLayoutProps) {
  return (
    <div>
      <div>
        {/* Step counter */}
        <div className="mb-8">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Step {stepNumber} of {totalSteps}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h1>
          {description && (
            <p className="text-gray-600 dark:text-gray-400">{description}</p>
          )}
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-8 border border-gray-200 dark:border-gray-700">
          {children}
        </div>
      </div>
    </div>
  );
}
