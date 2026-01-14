import React from 'react';

export interface FAQItem {
  question: string;
  answer: string | (() => React.ReactNode);
}

export function FAQItemComponent({
  item,
  itemId,
  isOpen,
  onToggle,
  renderAnswer
}: {
  item: FAQItem;
  itemId: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  renderAnswer: (item: FAQItem) => React.ReactNode;
}) {
  return (
    <div className="transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <button
        onClick={() => onToggle(itemId)}
        className="w-full px-6 py-5 text-left flex items-start justify-between gap-4 focus:outline-none rounded-none transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
        aria-expanded={isOpen}
      >
        <span className="text-base font-medium flex-1 text-left text-gray-900 dark:text-white">
          {item.question}
        </span>
        <svg
          className={`w-5 h-5 flex-shrink-0 transition-all duration-300 mt-0.5 text-gray-400 ${
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
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-5 pt-0">
          <p className="leading-relaxed text-sm text-gray-600 dark:text-gray-300">
            {renderAnswer(item)}
          </p>
        </div>
      </div>
    </div>
  );
}