import { FaqCategoryData, FaqItemData } from './faq-data';

export function toFaqSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getFaqItemSlug(item: FaqItemData): string {
  return toFaqSlug(item.questionKey);
}

export function getFaqCategorySlug(category: FaqCategoryData): string {
  return toFaqSlug(category.titleKey);
}

export function normalizeFaqHash(hash: string): string {
  return decodeURIComponent(hash.replace(/^#/, '').replace(/\/$/, '')).trim();
}
