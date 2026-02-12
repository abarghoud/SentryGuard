'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

function SessionExpiredContent() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const isExpired = searchParams.get('expired') === 'true';

  return isExpired ? (
    <div className="max-w-4xl mx-auto mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
      <p className="text-blue-800 font-medium">
        {t('Your session has expired. Please log in again.')}
      </p>
    </div>
  ) : null;
}

export default function SessionExpiredBanner() {
  return (
    <Suspense fallback={null}>
      <SessionExpiredContent />
    </Suspense>
  );
}
