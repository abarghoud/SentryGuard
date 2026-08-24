'use client';

import { useMemo } from 'react';
import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { FAQCategoryComponent } from './FAQCategory';
import { ContactSection } from './ContactSection';
import { faqCategories } from '../../core/faq/faq-data';
import {
  getFaqCategorySlug,
  getFaqItemSlug,
} from '../../core/faq/faq.helper';
import { useFaqHashNavigation } from './use-faq-hash-navigation';

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
  const { openItems, toggleItem, highlightedId } = useFaqHashNavigation();

  const translatedCategories = useMemo(
    () =>
      faqCategories.map((category) => ({
        id: getFaqCategorySlug(category),
        title: t(category.titleKey),
        items: category.items.map((item) => ({
          id: getFaqItemSlug(item),
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
        {translatedCategories.map((category) => (
          <FAQCategoryComponent
            key={category.id}
            category={category}
            openItems={openItems}
            highlightedId={highlightedId}
            onToggleItem={toggleItem}
            copyLabel={t('Copy link')}
            copiedLabel={t('Copied!')}
          />
        ))}
      </div>
      <ContactSection />
    </>
  );
}
