import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import LanguageSwitcher from './LanguageSwitcher';

interface NavigationItem {
  label: string;
  href: string;
  icon?: ReactNode;
  primary?: boolean; // Pour le style différent (rouge vs gris)
}

interface LayoutProps {
  children: ReactNode;
  navigationItems?: NavigationItem[];
}

export function Navigation({ navigationItems = [] }: { navigationItems?: NavigationItem[] }) {
  const { t } = useTranslation('common');

  return (
    <nav className="container mx-auto px-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <img
            src="/sentry-guard-logo.svg"
            alt="SentryGuard Logo"
            className="w-20 h-20"
          />
          <h1 className="text-2xl font-bold">{t('SentryGuard')}</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          {navigationItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 w-full sm:w-auto justify-center font-medium ${
                item.primary
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  : 'text-gray-700 hover:text-red-600'
              }`}
            >
              {item.icon}
              {t(item.label)}
            </Link>
          ))}
          <LanguageSwitcher />
          <a
            href="https://github.com/abarghoud/SentryGuard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors duration-200 w-full sm:w-auto justify-center"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            {t('GitHub')}
          </a>
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  const { t } = useTranslation('common');

  return (
    <footer className="container mx-auto px-6 py-8 border-t border-gray-300">
      <div className="text-center text-gray-700 text-sm">
        <p>
          {t('© {{year}} SentryGuard. All rights reserved.', {
            year: new Date().getFullYear(),
          })}
        </p>
        <p className="mt-2">
          {t(
            'Not affiliated with Tesla, Inc. Tesla and the Tesla logo are trademarks of Tesla, Inc.'
          )}
        </p>
        <p className="mt-2">
          {t(
            'SentryGuard is a non-profit, open-source project developed by the community for Tesla owners.'
          )}
        </p>
      </div>
    </footer>
  );
}

export default function Layout({ children, navigationItems = [] }: LayoutProps) {
  return (
    <main className="min-h-screen bg-gray-50 text-black">
      <Navigation navigationItems={navigationItems} />
      {children}
      <Footer />
    </main>
  );
}