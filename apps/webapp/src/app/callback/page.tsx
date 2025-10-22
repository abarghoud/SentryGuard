'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setUserId } from '../../lib/api';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      // Check if this is a redirect from our API's callback endpoint
      // The API callback endpoint should redirect to this page with userId in query params
      const userId = searchParams.get('userId');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Authentication failed: ${error}`);
        return;
      }

      if (userId) {
        // Save userId to localStorage
        setUserId(userId);
        setStatus('success');
        setMessage('Authentication successful! Redirecting to dashboard...');
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setStatus('error');
        setMessage('No user ID received. Please try logging in again.');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
        <div className="text-center">
          {status === 'loading' && (
            <div className="mb-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="mb-4">
              <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}
          
          {status === 'error' && (
            <div className="mb-4">
              <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}

          <h1 className="text-2xl font-bold mb-2">
            {status === 'loading' && 'Authenticating...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authentication Failed'}
          </h1>
          
          <p className="text-gray-400">{message}</p>

          {status === 'error' && (
            <a
              href="/"
              className="mt-6 inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Return to Home
            </a>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
            <h1 className="text-2xl font-bold mb-2">Authenticating...</h1>
            <p className="text-gray-400">Please wait</p>
          </div>
        </div>
      </main>
    }>
      <CallbackContent />
    </Suspense>
  );
}

