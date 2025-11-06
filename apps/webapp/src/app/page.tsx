'use client';

import { useTranslation } from 'react-i18next';
import TeslaLoginButton from '../components/TeslaLoginButton';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function HomePage() {
  const { t } = useTranslation('common');
  return (
    <main className="min-h-screen bg-gray-50 text-black">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-8 h-8 text-red-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 5.362l2.475-3.026h-4.95L12 5.362zm-2.475 4.07L7.05 6.406 2.475 11.93h7.05v-2.5zm4.95 0v2.5h7.05l-4.575-5.525-2.475 3.025zM12 14.407l2.475 3.025 2.475-3.025H12zm-6.525-2.407L2 19.594h9V12H5.475zm13.05 0H14v7.594h9L19.525 12z" />
            </svg>
            <h1 className="text-2xl font-bold">{t('SentryGuard')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <a
              href="https://github.com/abarghoud/SentryGuard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              {t('GitHub')}
            </a>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-transparent bg-clip-text">
            {t('Protect Your Tesla')}
          </h2>
          <p className="text-xl md:text-2xl text-gray-700 mb-8">
            {t(
              'Real-time monitoring and instant alerts for your Tesla vehicle'
            )}
          </p>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            {t(
              "SentryGuard monitors your vehicle's Sentry Mode and sends instant Telegram alerts when suspicious activity is detected. Configure telemetry, track your vehicle, and stay informed 24/7."
            )}
          </p>

          <TeslaLoginButton />

          <p className="text-sm text-gray-600 mt-6">
            {t('Secure OAuth authentication powered by Tesla')}
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl p-6 border border-gray-300 hover:border-red-600 transition-colors duration-300">
          <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('Instant Alerts')}</h3>
          <p className="text-gray-600">
            {t(
              "Receive real-time Telegram notifications when your vehicle's Sentry Mode is triggered."
            )}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-300 hover:border-red-600 transition-colors duration-300">
          <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {t('Telemetry Monitoring')}
          </h3>
          <p className="text-gray-600">
            {t(
              'Configure and monitor vehicle telemetry data for comprehensive security coverage.'
            )}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-300 hover:border-red-600 transition-colors duration-300">
          <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {t('Secure & Private')}
          </h3>
          <p className="text-gray-600">
            {t(
              "End-to-end encrypted communication with Tesla's official API. Your data stays yours."
            )}
          </p>
        </div>
      </div>

      {/* Funding Section */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl font-semibold mb-4 text-gray-600">
            {t('Support SentryGuard')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t(
              'SentryGuard is a non-profit, open-source project built by the community for Tesla owners. It depends on donations to cover server and development costs.'
            )}
          </p>
          <p className="text-gray-600 text-sm mb-6">
            {t(
              'If donations no longer cover expenses, the service may shut down, become paid (at actual cost, around $0.50/user), or be limited to current users. Your support keeps it free and open!'
            )}
          </p>
        </div>
      </div>

      {/* Footer */}
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

      <script
        data-name="BMC-Widget"
        data-cfasync="false"
        src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js"
        data-id="sentryguardorg"
        data-description="Support me on Buy me a coffee!"
        data-message={t("SentryGuard depends on donations to operate. Your support keeps us running! ☕")}
        data-color="#b91c1c"
        data-position="Right"
        data-x_margin="18"
        data-y_margin="18"
      ></script>
    </main>
  );
}
