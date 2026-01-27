'use client';

import { useEffect } from 'react';

export default function BuyMeACoffeeWidget() {
  useEffect(() => {
    const checkAndInit = setInterval(() => {
      const bmcWidget = (window as any).bmcWidget;
      if (bmcWidget && typeof bmcWidget.init === 'function') {
        clearInterval(checkAndInit);
        try {
          bmcWidget.init();
        } catch (error) {
          console.error('BMC Widget initialization error:', error);
        }
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(checkAndInit);
    }, 10000);

    return () => {
      clearInterval(checkAndInit);
      clearTimeout(timeout);
    };
  }, []);

  return null;
}

