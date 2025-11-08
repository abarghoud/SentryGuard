'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/useAuth';
import MissingScopesBanner from '../../components/MissingScopesBanner';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation('common');
  const { isAuthenticated, isLoading, logout, profile, scopeError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleFixScopes = () => {
    const missingScopes = scopeError?.missingScopes.join(',') || '';
    const currentPath = pathname;
    router.push(
      `/scopes-fix?missing=${missingScopes}&return=${encodeURIComponent(
        currentPath
      )}`
    );
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const navigation = [
    {
      name: t('Dashboard'),
      href: '/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    {
      name: t('Vehicles'),
      href: '/dashboard/vehicles',
      icon: 'M12 5.362l2.475-3.026h-4.95L12 5.362zm-2.475 4.07L7.05 6.406 2.475 11.93h7.05v-2.5zm4.95 0v2.5h7.05l-4.575-5.525-2.475 3.025zM12 14.407l2.475 3.025 2.475-3.025H12zm-6.525-2.407L2 19.594h9V12H5.475zm13.05 0H14v7.594h9L19.525 12z',
    },
    {
      name: t('Telegram'),
      href: '/dashboard/telegram',
      icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Show scope banner if there's a scope error */}
      {scopeError && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <MissingScopesBanner
              missingScopes={scopeError.missingScopes}
              onFixClick={handleFixScopes}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 5.362l2.475-3.026h-4.95L12 5.362zm-2.475 4.07L7.05 6.406 2.475 11.93h7.05v-2.5zm4.95 0v2.5h7.05l-4.575-5.525-2.475 3.025zM12 14.407l2.475 3.025 2.475-3.025H12zm-6.525-2.407L2 19.594h9V12H5.475zm13.05 0H14v7.594h9L19.525 12z" />
                  </svg>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('SentryGuard')}
                  </span>
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-red-600 text-gray-900 dark:text-white'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <LanguageSwitcher />
              {profile && (
                <div className="hidden sm:block text-sm text-gray-700 dark:text-gray-300">
                  {profile.full_name || profile.email || 'User'}
                </div>
              )}
              <button
                onClick={logout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                {t('Logout')}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    isActive
                      ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-900/20'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
            <div className="px-4 space-y-3">
              {profile && (
                <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  {profile.full_name || profile.email || 'User'}
                </div>
              )}
              <LanguageSwitcher />
              <button
                onClick={logout}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                {t('Logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
