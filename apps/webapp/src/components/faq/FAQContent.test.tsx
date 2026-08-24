import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FAQContent from './FAQContent';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

describe('The FAQContent component', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
    window.history.pushState = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('When rendered', () => {
    it('should render categories and questions with their id anchors', () => {
      const { container } = render(<FAQContent />);

      expect(screen.getByText('General Questions')).toBeInTheDocument();
      expect(screen.getByText('What is SentryGuard?')).toBeInTheDocument();
      expect(container.querySelector('#general-questions')).not.toBeNull();
      expect(container.querySelector('#what-is-sentryguard')).not.toBeNull();
    });
  });

  describe('When clicking on a question in dashboard FAQ', () => {
    it('should toggle question open and closed', () => {
      render(<FAQContent />);

      const questionButton = screen.getByRole('button', {
        name: 'What is SentryGuard?',
      });

      expect(questionButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(questionButton);

      expect(questionButton).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(questionButton);

      expect(questionButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('When clicking copy link button on a category in dashboard FAQ', () => {
    it('should copy category anchor URL to clipboard', async () => {
      render(<FAQContent />);

      const copyButtons = screen.getAllByRole('button', { name: 'Copy link' });
      const categoryCopyButton = copyButtons[0];

      await act(async () => {
        fireEvent.click(categoryCopyButton);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('#general-questions')
      );
    });
  });
});
