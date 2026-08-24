'use client';

import React from 'react';
import { CopyLinkButton } from './CopyLinkButton';
import { useFaqHashNavigation } from './use-faq-hash-navigation';

export interface PublicFaqItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

export interface PublicFaqCategory {
  id: string;
  title: string;
  items: PublicFaqItem[];
}

interface PublicFaqListProps {
  categories: PublicFaqCategory[];
  copyLinkText?: string;
  copiedText?: string;
}

export function PublicFaqList({
  categories,
  copyLinkText = 'Copy link',
  copiedText = 'Copied!',
}: PublicFaqListProps) {
  const { openItems, toggleItem, highlightedId } = useFaqHashNavigation();

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div
          key={category.id}
          id={category.id}
          className="rounded-2xl shadow-sm border overflow-hidden bg-white border-gray-200 scroll-mt-28 transition-all duration-300"
        >
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between group">
            <h3 className="text-xl font-semibold text-gray-900">
              {category.title}
            </h3>
            <CopyLinkButton
              targetId={category.id}
              copyLabel={copyLinkText}
              copiedLabel={copiedText}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            />
          </div>

          <div className="divide-y divide-gray-200">
            {category.items.map((item) => {
              const isOpen = openItems.has(item.id);
              const isHighlighted = highlightedId === item.id;

              return (
                <div
                  key={item.id}
                  id={item.id}
                  className={`scroll-mt-28 transition-all duration-300 ${
                    isHighlighted
                      ? 'bg-red-50/70 ring-2 ring-red-500/40'
                      : 'hover:bg-gray-50/80'
                  }`}
                >
                  <div className="w-full px-6 py-5 flex items-start justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      aria-expanded={isOpen}
                      className="text-base font-medium flex-1 text-left text-gray-900 focus:outline-none rounded cursor-pointer"
                    >
                      {item.question}
                    </button>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <CopyLinkButton
                        targetId={item.id}
                        copyLabel={copyLinkText}
                        copiedLabel={copiedText}
                      />
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        aria-label={
                          isOpen ? 'Collapse question' : 'Expand question'
                        }
                        className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        <svg
                          className={`w-5 h-5 transition-transform duration-300 ${
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
                      isOpen
                        ? 'max-h-[1000px] opacity-100 pb-5'
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-6 pt-0 leading-relaxed text-sm text-gray-600">
                      {item.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
