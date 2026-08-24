import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PublicFaqList, PublicFaqCategory } from './PublicFaqList';

describe('The PublicFaqList component', () => {
  const mockCategories: PublicFaqCategory[] = [
    {
      id: 'general-questions',
      title: 'General Questions',
      items: [
        {
          id: 'what-is-sentryguard',
          question: 'What is SentryGuard?',
          answer: 'SentryGuard is a Tesla monitoring app.',
        },
      ],
    },
  ];

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

  describe('When rendered with categories', () => {
    it('should render category title and question text', () => {
      render(
        <PublicFaqList
          categories={mockCategories}
          copyLinkText="Copy link"
          copiedText="Copied!"
        />
      );

      expect(screen.getByText('General Questions')).toBeInTheDocument();
      expect(screen.getByText('What is SentryGuard?')).toBeInTheDocument();
      expect(
        screen.getByText('SentryGuard is a Tesla monitoring app.')
      ).toBeInTheDocument();
    });

    it('should have correct id attributes for category and question anchors', () => {
      const { container } = render(
        <PublicFaqList
          categories={mockCategories}
          copyLinkText="Copy link"
          copiedText="Copied!"
        />
      );

      expect(container.querySelector('#general-questions')).not.toBeNull();
      expect(container.querySelector('#what-is-sentryguard')).not.toBeNull();
    });
  });

  describe('When a question title is clicked', () => {
    it('should toggle question open state', () => {
      render(
        <PublicFaqList
          categories={mockCategories}
          copyLinkText="Copy link"
          copiedText="Copied!"
        />
      );

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

  describe('When copy link button is clicked on a question', () => {
    it('should copy link without toggling question expansion', async () => {
      render(
        <PublicFaqList
          categories={mockCategories}
          copyLinkText="Copy link"
          copiedText="Copied!"
        />
      );

      const questionButton = screen.getByRole('button', {
        name: 'What is SentryGuard?',
      });
      const copyButtons = screen.getAllByRole('button', { name: 'Copy link' });
      const questionCopyButton = copyButtons[1];

      await act(async () => {
        fireEvent.click(questionCopyButton);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('#what-is-sentryguard')
      );
      expect(questionButton).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
