import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PublicNavigationMenu } from './PublicNavigationMenu';

describe('The PublicNavigationMenu component', () => {
  const openMenuLabel = 'Open menu';
  const closeMenuLabel = 'Close menu';

  const renderPublicNavigationMenu = () =>
    render(
      <PublicNavigationMenu
        brand={<span>SentryGuard</span>}
        persistentControls={<span>Language</span>}
        openMenuLabel={openMenuLabel}
        closeMenuLabel={closeMenuLabel}
        menuItems={
          <>
            <a href="/fr/faq">FAQ</a>
            <span>Separator</span>
          </>
        }
      />
    );

  const getMenuContainer = () => screen.getByText('FAQ').closest('#public-navigation-menu') as HTMLElement;

  describe('When rendered', () => {
    beforeEach(() => {
      renderPublicNavigationMenu();
    });

    it('should render the brand and the persistent controls', () => {
      expect(screen.getByText('SentryGuard')).toBeInTheDocument();
      expect(screen.getByText('Language')).toBeInTheDocument();
    });

    it('should render the toggle button collapsed', () => {
      expect(screen.getByRole('button', { name: openMenuLabel })).toHaveAttribute('aria-expanded', 'false');
    });

    it('should keep the menu hidden on small screens', () => {
      expect(getMenuContainer()).toHaveClass('invisible');
    });
  });

  describe('When the toggle button is clicked', () => {
    beforeEach(() => {
      renderPublicNavigationMenu();
      fireEvent.click(screen.getByRole('button', { name: openMenuLabel }));
    });

    it('should expand the toggle button with the close label', () => {
      expect(screen.getByRole('button', { name: closeMenuLabel })).toHaveAttribute('aria-expanded', 'true');
    });

    it('should reveal the menu', () => {
      expect(getMenuContainer()).toHaveClass('visible');
    });
  });

  describe('When a menu link is clicked while the menu is open', () => {
    beforeEach(() => {
      renderPublicNavigationMenu();
      fireEvent.click(screen.getByRole('button', { name: openMenuLabel }));
      fireEvent.click(screen.getByText('FAQ'));
    });

    it('should collapse the menu', () => {
      expect(screen.getByRole('button', { name: openMenuLabel })).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('When a non-link menu element is clicked while the menu is open', () => {
    beforeEach(() => {
      renderPublicNavigationMenu();
      fireEvent.click(screen.getByRole('button', { name: openMenuLabel }));
      fireEvent.click(screen.getByText('Separator'));
    });

    it('should keep the menu open', () => {
      expect(screen.getByRole('button', { name: closeMenuLabel })).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
