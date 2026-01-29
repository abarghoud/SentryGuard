'use client';

import { useState } from 'react';
import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { FAQCategoryComponent } from './FAQCategory';
import { ContactSection } from './ContactSection';

interface FAQItem {
  question: string;
  answer: string | (() => React.ReactNode);
}

interface FAQCategory {
  title: string;
  items: FAQItem[];
}

export default function FAQContent() {
  const { t } = useTranslation('common');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const linkClassName = 'text-blue-400 hover:text-blue-300 underline transition-colors duration-200';

  const createLink = (href: string, target = '_blank', rel = 'noopener noreferrer') => (
    <a
      href={href}
      target={target}
      rel={rel}
      className={linkClassName}
    />
  );

  const createMailtoLink = (email: string) => (
    <a
      href={`mailto:${email}`}
      className={linkClassName}
    />
  );

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const renderAnswer = (item: FAQItem) => {
    if (typeof item.answer === 'function') {
      return item.answer();
    }

    return t(item.answer);
  };

  const categories: FAQCategory[] = [
    {
      title: t('General Questions'),
      items: [
        {
          question: t('What is SentryGuard?'),
          answer: t('What is SentryGuard description')
        },
        {
          question: t('Does Sentry Mode need to be activated to receive notifications?'),
          answer: t('SentryGuard requires active Sentry Mode')
        },
        {
          question: t('Why Telegram?'),
          answer: t('Why we chose Telegram')
        },
        {
          question: t('Why isn\'t there a mobile app?'),
          answer: t('Why no mobile app')
        },
        {
          question: t('Is SentryGuard free?'),
          answer: t('Is SentryGuard free description')
        },
        {
          question: t('Is SentryGuard affiliated with Tesla?'),
          answer: t('Is SentryGuard affiliated with Tesla description')
        },
        {
          question: t('How does SentryGuard work?'),
          answer: t('How does SentryGuard work description')
        },
        {
          question: t('Does SentryGuard provide video footage?'),
          answer: t('SentryGuard video access explanation')
        },
        {
          question: t('Why is SentryGuard faster than Tesla notifications?'),
          answer: t('SentryGuard speed advantage explanation')
        },
        {
          question: t('Do I need Tesla Premium Connectivity to use SentryGuard?'),
          answer: t('Tesla Premium Connectivity requirement')
        }
      ]
    },
    {
      title: t('Setup & Configuration'),
      items: [
        {
          question: t('How do I get started with SentryGuard?'),
          answer: () => (
            <Trans
              i18nKey="How to get started with SentryGuard"
              components={[
                createLink('/dashboard/vehicles'),
                createLink('/dashboard/telegram')
              ]}
            />
          )
        },
        {
          question: t('What permissions does SentryGuard need?'),
          answer: t('What permissions SentryGuard needs')
        },
        {
          question: t('How do I link my Telegram account?'),
          answer: () => (
            <Trans
              i18nKey="How to link Telegram account"
              components={[createLink('/dashboard/telegram')]}
            />
          )
        },
        {
          question: t('What if I can\'t enable telemetry for my vehicle?'),
          answer: t('Cannot enable telemetry help')
        },
        {
          question: t('What is the purpose of pairing a virtual key with SentryGuard?'),
          answer: t('Virtual key purpose explanation')
        }
      ]
    },
    {
      title: t('Security & Privacy'),
      items: [
        {
          question: t('Is my data secure?'),
          answer: t('Is my data secure answer')
        },
        {
          question: t('What data does SentryGuard collect?'),
          answer: t('What data SentryGuard collects')
        },
        {
          question: t('Can I delete my data?'),
          answer: () => (
            <Trans
              i18nKey="Can I delete my data answer"
              components={[createMailtoLink('hello@sentryguard.org')]}
            />
          )
        },
        {
          question: t('Where is my data stored?'),
          answer: t('Where is my data stored answer')
        }
      ]
    },
    {
      title: t('Troubleshooting'),
      items: [
        {
          question: t('I\'m not receiving Telegram alerts. What should I do?'),
          answer: () => (
            <Trans
              i18nKey="Not receiving alerts help"
              components={[
                createLink('/dashboard/telegram'),
                createLink('/dashboard/vehicles')
              ]}
            />
          )
        },
        {
          question: t('Does SentryGuard impact the vehicle\'s battery or range?'),
          answer: t('SentryGuard battery impact')
        },
        {
          question: t('Why did my Tesla authorization get revoked?'),
          answer: t('Tesla authorization revoked help')
        },
        {
          question: t('SentryGuard shows "Virtual Key Not Paired". What does this mean?'),
          answer: () => (
            <Trans
              i18nKey="Virtual key not paired help"
              components={[createLink('/dashboard/vehicles')]}
            />
          )
        },
        {
          question: t('Why doesn\'t Sentry Mode trigger when I test it myself?'),
          answer: t('Sentry Mode testing explanation')
        },
        {
          question: t('Can I use SentryGuard with multiple vehicles?'),
          answer: t('Multiple vehicles support')
        },
        {
          question: t('Does SentryGuard work without internet connection?'),
          answer: t('Internet connection requirement explanation')
        },
        {
          question: t('Why does the app crash when I use browser translation?'),
          answer: t('Browser translation issue explanation')
        }
      ]
    },
    {
      title: t('Beta & Waitlist'),
      items: [
        {
          question: t('Why is there a waitlist?'),
          answer: t('Why is there a waitlist answer')
        },
        {
          question: t('How long does waitlist approval take?'),
          answer: t('How long does waitlist approval take answer')
        },
        {
          question: t('What happens after I\'m approved?'),
          answer: t('What happens after I\'m approved answer')
        },
        {
          question: t('I signed up but didn\'t receive an approval email'),
          answer: t('I signed up but didn\'t receive an approval email answer')
        },
        {
          question: t('Can I check my waitlist status?'),
          answer: t('Can I check my waitlist status answer')
        },
        {
          question: t('Can I use SentryGuard while on the waitlist?'),
          answer: t('Can I use SentryGuard while on the waitlist answer')
        },
        {
          question: t('What if I try to log in before being approved?'),
          answer: t('What if I try to log in before being approved answer')
        },
        {
          question: t('When is the official launch?'),
          answer: t('When is the official launch answer')
        },
        {
          question: t('Should I wait for the launch or join the beta waitlist?'),
          answer: t('Should I wait for the launch or join the beta waitlist answer')
        }
      ]
    },
    {
      title: t('Support & Donations'),
      items: [
        {
          question: t('How can I support SentryGuard?'),
          answer: () => (
            <Trans
              i18nKey="How to support SentryGuard"
              components={[
                createLink('https://github.com/abarghoud/SentryGuard'),
                createLink('https://buymeacoffee.com/sentryguardorg')
              ]}
            />
          )
        },
        {
          question: t('How can I report a bug or request a feature?'),
          answer: () => (
            <Trans
              i18nKey="How to report bugs or request features"
              components={[createLink('https://github.com/abarghoud/SentryGuard')]}
            />
          )
        },
        {
          question: t('Who can I contact for support?'),
          answer: () => (
            <Trans
              i18nKey="Who to contact for support"
              components={[
                createMailtoLink('hello@sentryguard.org'),
                createLink('https://github.com/abarghoud/SentryGuard')
              ]}
            />
          )
        }
      ]
    }
  ];

  const renderFAQCategories = () => (
    <div className="space-y-6">
      {categories.map((category, categoryIndex) => (
        <FAQCategoryComponent
          key={categoryIndex}
          category={category}
          categoryIndex={categoryIndex}
          openItems={openItems}
          onToggleItem={toggleItem}
          renderAnswer={renderAnswer}
        />
      ))}
    </div>
  );

  return (
    <>
      {renderFAQCategories()}
      <ContactSection />
    </>
  );
}