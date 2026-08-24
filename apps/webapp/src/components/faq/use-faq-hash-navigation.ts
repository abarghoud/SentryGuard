'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeFaqHash } from '../../core/faq/faq.helper';

const HEADER_OFFSET_PX = 96;
const SCROLL_TOLERANCE_PX = 40;
const RETRY_DELAYS_MS = [150, 450, 900, 1500];

export function useFaqHashNavigation() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isUserScrollingRef = useRef(false);

  const clearScrollTimeouts = useCallback(() => {
    scrollTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    scrollTimeoutsRef.current = [];
  }, []);

  const toggleItem = useCallback((id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const setItemOpen = useCallback((id: string, isOpen: boolean) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const isItemOpen = useCallback(
    (id: string): boolean => {
      return openItems.has(id);
    },
    [openItems]
  );

  const performElementScroll = useCallback(
    (targetElement: HTMLElement, behavior: ScrollBehavior = 'smooth') => {
      if (typeof window === 'undefined') {
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      const currentScrollTop =
        window.scrollY || document.documentElement.scrollTop;
      const targetTop = Math.max(
        0,
        rect.top + currentScrollTop - HEADER_OFFSET_PX
      );

      window.scrollTo({
        top: targetTop,
        behavior,
      });
    },
    []
  );

  const scrollToTarget = useCallback(
    (targetSlug: string) => {
      const targetElement = document.getElementById(targetSlug);
      if (!targetElement) {
        return;
      }

      setOpenItems((prev) => {
        const next = new Set(prev);
        next.add(targetSlug);
        return next;
      });

      setHighlightedId(targetSlug);

      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedId(null);
      }, 2500);

      clearScrollTimeouts();
      isUserScrollingRef.current = false;

      RETRY_DELAYS_MS.forEach((delay) => {
        const timeoutId = setTimeout(() => {
          if (isUserScrollingRef.current) {
            return;
          }

          const currentRect = targetElement.getBoundingClientRect();
          const distanceFromExpected = Math.abs(
            currentRect.top - HEADER_OFFSET_PX
          );

          if (distanceFromExpected > SCROLL_TOLERANCE_PX) {
            performElementScroll(targetElement, 'smooth');
          }
        }, delay);

        scrollTimeoutsRef.current.push(timeoutId);
      });
    },
    [clearScrollTimeouts, performElementScroll]
  );

  const handleHashChange = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const rawHash = window.location.hash;
    if (!rawHash) {
      return;
    }

    const targetSlug = normalizeFaqHash(rawHash);
    if (targetSlug) {
      scrollToTarget(targetSlug);
    }
  }, [scrollToTarget]);

  useEffect(() => {
    const onUserInteraction = () => {
      isUserScrollingRef.current = true;
    };

    window.addEventListener('wheel', onUserInteraction, { passive: true });
    window.addEventListener('touchmove', onUserInteraction, { passive: true });

    const initialTimer = setTimeout(() => {
      handleHashChange();
    }, 50);

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      clearTimeout(initialTimer);
      clearScrollTimeouts();
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      window.removeEventListener('wheel', onUserInteraction);
      window.removeEventListener('touchmove', onUserInteraction);
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [handleHashChange, clearScrollTimeouts]);

  return {
    openItems,
    toggleItem,
    setItemOpen,
    isItemOpen,
    highlightedId,
    scrollToTarget,
  };
}
