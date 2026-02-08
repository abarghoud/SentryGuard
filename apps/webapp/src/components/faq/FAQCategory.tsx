import React from 'react';
import { FAQItemComponent, TranslatedFaqItem } from './FAQItem';

interface TranslatedFaqCategory {
  title: string;
  items: TranslatedFaqItem[];
}

export function FAQCategoryComponent({
  category,
  categoryIndex,
  openItems,
  onToggleItem,
}: {
  category: TranslatedFaqCategory;
  categoryIndex: number;
  openItems: Set<string>;
  onToggleItem: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl shadow-sm border overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {category.title}
        </h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {category.items.map((item, itemIndex) => {
          const itemId = `${categoryIndex}-${itemIndex}`;
          const isOpen = openItems.has(itemId);

          return (
            <FAQItemComponent
              key={itemIndex}
              item={item}
              itemId={itemId}
              isOpen={isOpen}
              onToggle={onToggleItem}
            />
          );
        })}
      </div>
    </div>
  );
}
