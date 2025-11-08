'use client';

import { useEffect } from 'react';

export default function BuyMeACoffeeWidget() {
  useEffect(() => {
    // Wait for BMC script to load, then trigger DOMContentLoaded
    const checkAndInit = setInterval(() => {
      if ((window as any).bmcWidget) {
        clearInterval(checkAndInit);
        const event = new Event('DOMContentLoaded', {
          bubbles: true,
          cancelable: true,
        });
        window.dispatchEvent(event);
      }
    }, 100);

    return () => {
      clearInterval(checkAndInit);
    };
  }, []);

  return null;
}

