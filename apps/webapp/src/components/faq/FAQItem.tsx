import React from 'react';
import { CopyLinkButton } from './CopyLinkButton';

export interface TranslatedFaqItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

export function FAQItemComponent({
  item,
  isOpen,
  isHighlighted = false,
  onToggle,
  copyLabel = 'Copy link',
  copiedLabel = 'Copied!',
}: {
  item: TranslatedFaqItem;
  isOpen: boolean;
  isHighlighted?: boolean;
  onToggle: (id: string) => void;
  copyLabel?: string;
  copiedLabel?: string;
}) {
  return (
    <div
      id={item.id}
      className={`scroll-mt-28 transition-all duration-300 ${
        isHighlighted
          ? 'bg-red-50/70 dark:bg-red-950/30 ring-2 ring-red-500/40'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
    >
      <div className="w-full px-6 py-5 flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          className="text-base font-medium flex-1 text-left text-gray-900 dark:text-white focus:outline-none cursor-pointer"
          aria-expanded={isOpen}
        >
          {item.question}
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CopyLinkButton
            targetId={item.id}
            copyLabel={copyLabel}
            copiedLabel={copiedLabel}
          />
          <button
            type="button"
            onClick={() => onToggle(item.id)}
            aria-label={isOpen ? 'Collapse question' : 'Expand question'}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
          >
            <svg
              className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${
                isOpen ? 'transform rotate-180 text-red-600' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100 pb-5' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pt-0">
          <div className="leading-relaxed text-sm text-gray-600 dark:text-gray-300">
            {item.answer}
          </div>
        </div>
      </div>
    </div>
  );
}
