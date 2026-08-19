import React from 'react';

export type AiBadgePosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface AiIllustrationWrapperProps {
  children: React.ReactNode;
  locale?: string;
  position?: AiBadgePosition;
  className?: string;
  label?: string;
  tooltipText?: string;
}

const POSITION_CLASSES: Record<AiBadgePosition, string> = {
  'bottom-right': 'bottom-3 right-3',
  'bottom-left': 'bottom-3 left-3',
  'top-right': 'top-3 right-3',
  'top-left': 'top-3 left-3',
};

export function EuAiIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 567 567"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="283.5" cy="283.5" r="182.75" fill="white" />
      <g fill="#1d1d1b">
        <path d="M170.79 353.74c-1.08 0-2.05-.43-2.92-1.31-.88-.87-1.31-1.84-1.31-2.92 0-.67.07-1.27.2-1.81l47.34-129.32c.4-1.48 1.24-2.79 2.52-3.93 1.27-1.14 3.05-1.71 5.34-1.71h29.81c2.28 0 4.06.57 5.34 1.71 1.27 1.14 2.11 2.45 2.52 3.93l47.14 129.32c.27.54.4 1.14.4 1.81 0 1.08-.44 2.05-1.31 2.92s-1.91 1.31-3.12 1.31h-24.78c-2.01 0-3.52-.5-4.53-1.51-1.01-1.01-1.65-1.91-1.91-2.72l-7.86-20.55h-53.78l-7.65 20.55c-.27.81-.88 1.71-1.81 2.72-.94 1.01-2.55 1.51-4.83 1.51h-24.78ZM218.13 299.96h37.47l-18.93-53.18-18.53,53.18Z" />
        <path d="M328.11 353.74c-1.48 0-2.69-.47-3.63-1.41-.94-.94-1.41-2.15-1.41-3.63v-130.93c0-1.48.47-2.68,1.41-3.63s2.15-1.41,3.63-1.41h26.99c1.48 0 2.68.47 3.63 1.41.94.94 1.41 2.15 1.41 3.63v130.93c0,1.48-.47,2.69-1.41,3.63-.94.94-2.15,1.41-3.63,1.41h-26.99Z" />
      </g>
    </svg>
  );
}

export function AiIllustrationWrapper({
  children,
  locale = 'en',
  position = 'bottom-right',
  className = '',
  label,
  tooltipText,
}: AiIllustrationWrapperProps) {
  const isFrench = locale === 'fr';
  const defaultLabel = isFrench ? 'Généré par IA' : 'AI Generated';
  const displayLabel = label ?? defaultLabel;
  const defaultTooltip = isFrench
    ? "Illustration générée par intelligence artificielle (conformément aux lignes directrices de l'UE)"
    : 'AI-generated illustration (in compliance with EU guidelines)';
  const displayTooltip = tooltipText ?? defaultTooltip;
  const positionClass = POSITION_CLASSES[position];

  return (
    <div className={`relative group/ai ${className}`}>
      {children}
      <div
        className={`absolute ${positionClass} z-10 pointer-events-auto`}
        role="note"
        aria-label={displayTooltip}
      >
        <div
          title={displayTooltip}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/20 text-white shadow-lg transition-all duration-300 select-none group-hover/ai:border-white/40 cursor-default"
        >
          <EuAiIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-[11px] font-medium tracking-tight whitespace-nowrap text-gray-200">
            {displayLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AiIllustrationWrapper;
