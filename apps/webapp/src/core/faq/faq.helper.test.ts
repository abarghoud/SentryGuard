import { faqCategories } from './faq-data';
import {
  getFaqCategorySlug,
  getFaqItemSlug,
  normalizeFaqHash,
  toFaqSlug,
} from './faq.helper';

describe('The toFaqSlug() function', () => {
  describe('When given a standard question string', () => {
    it('should convert to lowercase and replace spaces and punctuation with hyphens', () => {
      const result = toFaqSlug('What is SentryGuard?');

      expect(result).toBe('what-is-sentryguard');
    });
  });

  describe('When given a string with accents and special characters', () => {
    it('should strip accents and collapse consecutive hyphens', () => {
      const result = toFaqSlug('Sécurité & Confidentialité -- FAQ!');

      expect(result).toBe('securite-confidentialite-faq');
    });
  });

  describe('When given a string with leading or trailing hyphens or spaces', () => {
    it('should trim outer hyphens and whitespace', () => {
      const result = toFaqSlug(' - Setup & Configuration - ');

      expect(result).toBe('setup-configuration');
    });
  });
});

describe('The getFaqCategorySlug() function', () => {
  describe('When extracting a category slug', () => {
    it('should derive the slug from the category titleKey', () => {
      const category = {
        titleKey: 'Setup & Configuration',
        items: [],
      };

      const result = getFaqCategorySlug(category);

      expect(result).toBe('setup-configuration');
    });
  });
});

describe('The getFaqItemSlug() function', () => {
  describe('When extracting an item slug', () => {
    it('should derive the slug from the item questionKey', () => {
      const item = {
        questionKey: 'Why Telegram?',
        answerKey: 'Why we chose Telegram',
      };

      const result = getFaqItemSlug(item);

      expect(result).toBe('why-telegram');
    });
  });
});

describe('The normalizeFaqHash() function', () => {
  describe('When given a hash with leading hash symbol and trailing slash', () => {
    it('should remove the hash symbol and trailing slash', () => {
      const result = normalizeFaqHash('#why-telegram/');

      expect(result).toBe('why-telegram');
    });
  });

  describe('When given an encoded hash string', () => {
    it('should decode URI components', () => {
      const result = normalizeFaqHash('#s%C3%A9curit%C3%A9');

      expect(result).toBe('sécurité');
    });
  });
});

describe('The faqCategories data uniqueness', () => {
  describe('When evaluating all category slugs', () => {
    it('should produce unique and non-empty category slugs', () => {
      const categorySlugs = faqCategories.map((category) =>
        getFaqCategorySlug(category)
      );

      const uniqueCategorySlugs = new Set(categorySlugs);

      expect(categorySlugs.length).toBe(faqCategories.length);
      expect(uniqueCategorySlugs.size).toBe(faqCategories.length);
      categorySlugs.forEach((slug) => {
        expect(slug.length).toBeGreaterThan(0);
      });
    });
  });

  describe('When evaluating all item slugs', () => {
    it('should produce unique and non-empty item slugs across the entire dataset', () => {
      const allItems = faqCategories.flatMap((category) => category.items);
      const itemSlugs = allItems.map((item) => getFaqItemSlug(item));
      const uniqueItemSlugs = new Set(itemSlugs);

      expect(itemSlugs.length).toBe(allItems.length);
      expect(uniqueItemSlugs.size).toBe(allItems.length);
      itemSlugs.forEach((slug) => {
        expect(slug.length).toBeGreaterThan(0);
      });
    });
  });
});
