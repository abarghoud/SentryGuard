import { cookies, headers } from 'next/headers';
import { ReactNode } from 'react';

import en from '../locales/en/common.json';
import fr from '../locales/fr/common.json';

const translations: Record<string, Record<string, string>> = { en, fr };

export async function getLocale(): Promise<string> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('locale');

  if (localeCookie?.value && translations[localeCookie.value]) {
    return localeCookie.value;
  }

  const headerStore = await headers();
  const acceptLanguage = headerStore.get('accept-language') || '';

  if (acceptLanguage.toLowerCase().startsWith('fr')) {
    return 'fr';
  }

  return 'en';
}

export function getTranslation(locale: string) {
  const dict = translations[locale] || translations['en'];

  return (key: string, params?: Record<string, string | number>): string => {
    let value = dict[key] || key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replaceAll(`{{${k}}}`, String(v));
      });
    }

    return value;
  };
}

export function renderRichTranslation(
  text: string,
  links: Array<{ href: string }>
): ReactNode[] {
  const result: ReactNode[] = [];
  let lastIndex = 0;
  const regex = /<(\d+)>(.*?)<\/\1>/g;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    const linkIndex = parseInt(match[1]);
    const linkText = match[2];
    const link = links[linkIndex];

    if (link) {
      const isExternal =
        link.href.startsWith('http') || link.href.startsWith('mailto:');
      result.push(
        <a
          key={keyIndex++}
          href={link.href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="text-blue-600 hover:text-blue-800 underline transition-colors duration-200"
        >
          {linkText}
        </a>
      );
    } else {
      result.push(linkText);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

export function stripRichTextTags(text: string): string {
  return text.replace(/<\d+>(.*?)<\/\d+>/g, '$1');
}
