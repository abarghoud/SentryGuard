'use client';

import { useEffect } from 'react';

export default function BuyMeACoffeeWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js';
    script.setAttribute('data-name', 'BMC-Widget');
    script.setAttribute('data-cfasync', 'false');
    script.setAttribute('data-id', 'sentryguardorg');
    script.setAttribute('data-description', 'Support me on Buy me a coffee!');
    script.setAttribute(
      'data-message',
      'SentryGuard depends on donations to operate. Your support keeps us running!'
    );
    script.setAttribute('data-color', '#b91c1c');
    script.setAttribute('data-position', 'Right');
    script.setAttribute('data-x_margin', '18');
    script.setAttribute('data-y_margin', '18');
    script.async = true;

    script.onload = () => {
      const event = new Event('DOMContentLoaded', {
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      const bmcButton = document.getElementById('bmc-wbtn');
      if (bmcButton) bmcButton.remove();
    };
  }, []);

  return null;
}
