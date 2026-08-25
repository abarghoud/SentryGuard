'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';

interface CopyLinkButtonProps {
  targetId: string;
  copyLabel?: string;
  copiedLabel?: string;
  className?: string;
  iconClassName?: string;
  showTooltip?: boolean;
}

export function CopyLinkButton({
  targetId,
  copyLabel = 'Copy link',
  copiedLabel = 'Copied!',
  className = '',
  iconClassName = 'w-4 h-4',
  showTooltip = true,
}: CopyLinkButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      console.error('Error when trying to copy text to clipboard');
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }, []);

  const onCopy = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const url =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}#${targetId}`
          : `#${targetId}`;

      const didCopy = await copyToClipboard(url);

      if (didCopy) {
        if (typeof window !== 'undefined' && window.history?.pushState) {
          window.history.pushState(null, '', `#${targetId}`);
        }

        setIsCopied(true);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      }
    },
    [targetId, copyToClipboard]
  );

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={isCopied ? copiedLabel : copyLabel}
      title={isCopied ? copiedLabel : copyLabel}
      className={`relative inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-gray-700/50 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
        isCopied ? 'text-green-600 dark:text-green-400' : ''
      } ${className}`}
    >
      {isCopied ? (
        <svg
          className={`${iconClassName} transition-transform duration-200 scale-110`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      )}

      {showTooltip && isCopied ? (
        <span
          role="status"
          className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-md pointer-events-none whitespace-nowrap animate-fade-in"
        >
          {copiedLabel}
        </span>
      ) : null}
    </button>
  );
}
