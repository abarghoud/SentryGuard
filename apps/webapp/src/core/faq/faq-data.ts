export interface FaqItemData {
  questionKey: string;
  answerKey: string;
  answerLinks?: Array<{ href: string }>;
}

export interface FaqCategoryData {
  titleKey: string;
  items: FaqItemData[];
}

export const faqCategories: FaqCategoryData[] = [
  {
    titleKey: 'General Questions',
    items: [
      {
        questionKey: 'What is SentryGuard?',
        answerKey: 'What is SentryGuard description',
      },
      {
        questionKey:
          'Does Sentry Mode need to be activated to receive notifications?',
        answerKey: 'SentryGuard requires active Sentry Mode',
      },
      {
        questionKey: 'Why Telegram?',
        answerKey: 'Why we chose Telegram',
      },
      {
        questionKey: "Why isn't there a mobile app?",
        answerKey: 'Why no mobile app',
      },
      {
        questionKey: 'Is SentryGuard free?',
        answerKey: 'Is SentryGuard free description',
      },
      {
        questionKey: 'Is SentryGuard affiliated with Tesla?',
        answerKey: 'Is SentryGuard affiliated with Tesla description',
      },
      {
        questionKey: 'How does SentryGuard work?',
        answerKey: 'How does SentryGuard work description',
      },
      {
        questionKey: 'Does SentryGuard provide video footage?',
        answerKey: 'SentryGuard video access explanation',
      },
      {
        questionKey:
          'Why is SentryGuard faster than Tesla notifications?',
        answerKey: 'SentryGuard speed advantage explanation',
      },
      {
        questionKey:
          'Do I need Tesla Premium Connectivity to use SentryGuard?',
        answerKey: 'Tesla Premium Connectivity requirement',
      },
    ],
  },
  {
    titleKey: 'Setup & Configuration',
    items: [
      {
        questionKey: 'How do I get started with SentryGuard?',
        answerKey: 'How to get started with SentryGuard',
        answerLinks: [
          { href: '/dashboard/vehicles' },
          { href: '/dashboard/telegram' },
        ],
      },
      {
        questionKey: 'What permissions does SentryGuard need?',
        answerKey: 'What permissions SentryGuard needs',
      },
      {
        questionKey: 'How do I link my Telegram account?',
        answerKey: 'How to link Telegram account',
        answerLinks: [{ href: '/dashboard/telegram' }],
      },
      {
        questionKey:
          "What if I can't enable telemetry for my vehicle?",
        answerKey: 'Cannot enable telemetry help',
      },
      {
        questionKey:
          'What is the purpose of pairing a virtual key with SentryGuard?',
        answerKey: 'Virtual key purpose explanation',
      },
    ],
  },
  {
    titleKey: 'Security & Privacy',
    items: [
      {
        questionKey: 'Is my data secure?',
        answerKey: 'Is my data secure answer',
      },
      {
        questionKey: 'What data does SentryGuard collect?',
        answerKey: 'What data SentryGuard collects',
      },
      {
        questionKey: 'Can I delete my data?',
        answerKey: 'Can I delete my data answer',
        answerLinks: [{ href: 'mailto:hello@sentryguard.org' }],
      },
      {
        questionKey: 'Where is my data stored?',
        answerKey: 'Where is my data stored answer',
      },
    ],
  },
  {
    titleKey: 'Troubleshooting',
    items: [
      {
        questionKey:
          "I'm not receiving Telegram alerts. What should I do?",
        answerKey: 'Not receiving alerts help',
        answerLinks: [
          { href: '/dashboard/telegram' },
          { href: '/dashboard/vehicles' },
        ],
      },
      {
        questionKey:
          "Does SentryGuard impact the vehicle's battery or range?",
        answerKey: 'SentryGuard battery impact',
      },
      {
        questionKey:
          'Why did my Tesla authorization get revoked?',
        answerKey: 'Tesla authorization revoked help',
      },
      {
        questionKey:
          'SentryGuard shows "Virtual Key Not Paired". What does this mean?',
        answerKey: 'Virtual key not paired help',
        answerLinks: [{ href: '/dashboard/vehicles' }],
      },
      {
        questionKey:
          "Why doesn't Sentry Mode trigger when I test it myself?",
        answerKey: 'Sentry Mode testing explanation',
      },
      {
        questionKey:
          'Can I use SentryGuard with multiple vehicles?',
        answerKey: 'Multiple vehicles support',
      },
      {
        questionKey:
          'Does SentryGuard work without internet connection?',
        answerKey: 'Internet connection requirement explanation',
      },
      {
        questionKey:
          'Why does the app crash when I use browser translation?',
        answerKey: 'Browser translation issue explanation',
      },
    ],
  },
  {
    titleKey: 'Waitlist',
    items: [
      {
        questionKey: 'Why is there a waitlist?',
        answerKey: 'Why is there a waitlist answer',
      },
      {
        questionKey: 'How long does waitlist approval take?',
        answerKey: 'How long does waitlist approval take answer',
      },
      {
        questionKey: "What happens after I'm approved?",
        answerKey: "What happens after I'm approved answer",
      },
      {
        questionKey:
          "I signed up but didn't receive an approval email",
        answerKey:
          "I signed up but didn't receive an approval email answer",
      },
      {
        questionKey: 'Can I check my waitlist status?',
        answerKey: 'Can I check my waitlist status answer',
      },
      {
        questionKey:
          'Can I use SentryGuard while on the waitlist?',
        answerKey:
          'Can I use SentryGuard while on the waitlist answer',
      },
      {
        questionKey:
          'What if I try to log in before being approved?',
        answerKey:
          'What if I try to log in before being approved answer',
      },
    ],
  },
  {
    titleKey: 'Support & Donations',
    items: [
      {
        questionKey: 'How can I support SentryGuard?',
        answerKey: 'How to support SentryGuard',
        answerLinks: [
          { href: 'https://github.com/abarghoud/SentryGuard' },
          { href: 'https://buymeacoffee.com/sentryguardorg' },
        ],
      },
      {
        questionKey:
          'How can I report a bug or request a feature?',
        answerKey: 'How to report bugs or request features',
        answerLinks: [
          { href: 'https://github.com/abarghoud/SentryGuard' },
        ],
      },
      {
        questionKey: 'Who can I contact for support?',
        answerKey: 'Who to contact for support',
        answerLinks: [
          { href: 'mailto:hello@sentryguard.org' },
          { href: 'https://github.com/abarghoud/SentryGuard' },
        ],
      },
    ],
  },
];
