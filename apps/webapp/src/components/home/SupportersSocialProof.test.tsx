import React from 'react';
import { render, screen } from '@testing-library/react';
import { SupportersSocialProof } from './SupportersSocialProof';
import { SupporterItem } from '@/core/buymeacoffee/buymeacoffee.types';

describe('The SupportersSocialProof component', () => {
  const mockSupporters: SupporterItem[] = [
    {
      id: 'sup-1',
      name: 'Alexandre D.',
      coffees: 35,
      isSubscriber: true,
      monthlyCoffees: 1,
      supportDate: '2024-01-01',
      message: 'Great work!',
    },
    {
      id: 'sup-2',
      name: 'Sophie M.',
      coffees: 13,
      isSubscriber: false,
      supportDate: '2024-01-02',
    },
  ];

  describe('When rendering with supporters data', () => {
    beforeEach(() => {
      render(
        <SupportersSocialProof
          locale="fr"
          supporters={mockSupporters}
          totalCoffeesCount={48}
          title="Soutenu par notre communauté"
          subtitle="Communauté & Donateurs"
          description="Description test"
          viewAllText="Voir tous les donateurs"
          supportCtaText="Nous offrir un café"
        />
      );
    });

    it('should render the section title and description', () => {
      expect(screen.getByText('Soutenu par notre communauté')).toBeInTheDocument();
      expect(screen.getByText('Description test')).toBeInTheDocument();
    });

    it('should render the top supporter names', () => {
      expect(screen.getByText('Alexandre D.')).toBeInTheDocument();
      expect(screen.getByText('Sophie M.')).toBeInTheDocument();
    });

    it('should render the link to the supporters wall', () => {
      const viewAllLink = screen.getByRole('link', { name: /Voir tous les donateurs/i });
      expect(viewAllLink).toHaveAttribute('href', '/fr/supporters');
    });

    it('should render the external Buy Me a Coffee link', () => {
      const bmcLink = screen.getByRole('link', { name: /Nous offrir un café/i });
      expect(bmcLink).toHaveAttribute('href', 'https://buymeacoffee.com/sentryguardorg');
      expect(bmcLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('When rendering with empty supporters list', () => {
    it('should still render the section call to actions', () => {
      render(
        <SupportersSocialProof
          locale="en"
          supporters={[]}
          totalCoffeesCount={0}
          title="Supported by our community"
          subtitle="Community & Backers"
          description="Empty description"
          viewAllText="View all supporters"
          supportCtaText="Buy us a coffee"
        />
      );

      expect(screen.getByText('Supported by our community')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /View all supporters/i })).toHaveAttribute(
        'href',
        '/en/supporters'
      );
    });
  });
});
