import React from 'react';
import { FAQItemComponent, TranslatedFaqItem } from './FAQItem';
import { CopyLinkButton } from './CopyLinkButton';

export interface TranslatedFaqCategory {
  id: string;
  title: string;
  items: TranslatedFaqItem[];
}

export function FAQCategoryComponent({
  category,
  openItems,
  highlightedId,
  onToggleItem,
  copyLabel,
  copiedLabel,
}: {
  category: TranslatedFaqCategory;
  openItems: Set<string>;
  highlightedId?: string | null;
  onToggleItem: (id: string) => void;
  copyLabel?: string;
  copiedLabel?: string;
}) {
  return (
    <div
      id={category.id}
      className="rounded-2xl shadow-sm border overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 scroll-mt-28 transition-all duration-300"
    >
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between group">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {category.title}
        </h3>
        <CopyLinkButton
          targetId={category.id}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        />
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {category.items.map((item) => {
          const isOpen = openItems.has(item.id);
          const isHighlighted = highlightedId === item.id;

          return (
            <FAQItemComponent
              key={item.id}
              item={item}
              isOpen={isOpen}
              isHighlighted={isHighlighted}
              onToggle={onToggleItem}
              copyLabel={copyLabel}
              copiedLabel={copiedLabel}
            />
          );
        })}
      </div>
    </div>
  );
}
