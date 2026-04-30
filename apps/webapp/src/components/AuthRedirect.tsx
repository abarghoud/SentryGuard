'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthQuery } from '../features/auth/di';

export default function AuthRedirect() {
  const { query: authQuery } = useAuthQuery();
  const { data: authData, isLoading } = authQuery;
  const isAuthenticated = authData?.status.authenticated ?? false;
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  if (!isLoading && !isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    </div>
  );
}
