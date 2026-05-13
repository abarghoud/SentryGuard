'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  useVehicleCommandsAuthorization,
  useRequestVehicleCommandsScope,
} from '../features/auth/presentation/queries/use-vehicle-commands-authorization';

interface RequireVehicleCommandsProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  buttonLabel?: string;
}

export default function RequireVehicleCommands({
  children,
  title,
  description,
  buttonLabel,
}: RequireVehicleCommandsProps) {
  const { t } = useTranslation('common');
  const { data, isLoading } = useVehicleCommandsAuthorization();
  const { mutate: requestScope, isPending } = useRequestVehicleCommandsScope();
  const isAuthorized = data?.authorized ?? false;

  if (isLoading) {
    return (
      <div className="opacity-50 pointer-events-none select-none transition-all duration-300 animate-pulse">
        {children}
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="relative group rounded-md overflow-hidden">
        <div className="opacity-40 blur-[1px] pointer-events-none select-none transition-all duration-300">
          {children}
        </div>

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-white/30 dark:bg-gray-900/40 backdrop-blur-[2px]">
          <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm mb-2">
            <svg
              className="w-4 h-4 text-gray-500 dark:text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {title || t('Unlock commands')}
          </h4>

          <p className="text-[10px] text-gray-700 dark:text-gray-300 mb-3 max-w-[200px] leading-tight">
            {description || t('Authorize SentryGuard to interact with your vehicle.')}
          </p>

          <button
            onClick={() => requestScope()}
            disabled={isPending}
            className="px-4 py-1.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded-full transition-transform active:scale-95 shadow-sm disabled:opacity-50"
          >
            {isPending ? t('Loading...') : buttonLabel || t('Authorize')}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
