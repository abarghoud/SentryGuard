'use client';

import { useState, useMemo } from 'react';
import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { FAQCategoryComponent } from './FAQCategory';
import { ContactSection } from './ContactSection';
import { faqCategories } from '../../lib/faq-data';

const linkClassName =
  'text-blue-400 hover:text-blue-300 underline transition-colors duration-200';

function createLink(
  href: string,
  target = '_blank',
  rel = 'noopener noreferrer'
) {
  return <a href={href} target={target} rel={rel} className={linkClassName} />;
}

export default function FAQContent() {
  const { t } = useTranslation('common');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const translatedCategories = useMemo(
    () =>
      faqCategories.map((category) => ({
        title: t(category.titleKey),
        items: category.items.map((item) => ({
          question: t(item.questionKey),
          answer: item.answerLinks ? (
            <Trans
              i18nKey={item.answerKey}
              components={item.answerLinks.map((link) =>
                createLink(link.href)
              )}
            />
          ) : (
            t(item.answerKey)
          ),
        })),
      })),
    [t]
  );

  return (
    <>
      <div className="space-y-6">
        {translatedCategories.map((category, categoryIndex) => (
          <FAQCategoryComponent
            key={categoryIndex}
            category={category}
            categoryIndex={categoryIndex}
            openItems={openItems}
            onToggleItem={toggleItem}
          />
        ))}
      </div>
      <ContactSection />
    </>
  );
}
