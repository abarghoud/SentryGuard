'use client';

import { MouseEvent, ReactNode, useCallback, useState } from 'react';

interface PublicNavigationMenuProps {
  brand: ReactNode;
  closeMenuLabel: string;
  menuItems: ReactNode;
  openMenuLabel: string;
  persistentControls: ReactNode;
}

const PUBLIC_NAVIGATION_MENU_ID = 'public-navigation-menu';

export function PublicNavigationMenu({
  brand,
  closeMenuLabel,
  menuItems,
  openMenuLabel,
  persistentControls,
}: PublicNavigationMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const onMenuToggle = useCallback(() => {
    setIsMenuOpen((wasMenuOpen) => !wasMenuOpen);
  }, []);

  const onMenuClick = useCallback((mouseEvent: MouseEvent<HTMLDivElement>) => {
    const clickedElement = mouseEvent.target as HTMLElement;

    if (clickedElement.closest('a')) {
      setIsMenuOpen(false);
    }
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-y-3">
      <div className="order-1">{brand}</div>
      <div className="order-2 lg:order-3 flex items-center gap-2 lg:ml-4">
        {persistentControls}
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-gray-700 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          aria-controls={PUBLIC_NAVIGATION_MENU_ID}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? closeMenuLabel : openMenuLabel}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>
      </div>
      <div
        id={PUBLIC_NAVIGATION_MENU_ID}
        onClick={onMenuClick}
        className={`order-3 lg:order-2 basis-full lg:basis-auto lg:ml-auto overflow-hidden lg:overflow-visible transition-all duration-300 ease-in-out lg:max-h-none lg:opacity-100 lg:visible ${
          isMenuOpen ? 'max-h-screen opacity-100 visible' : 'max-h-0 opacity-0 invisible'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-4 p-2 lg:p-0 rounded-xl lg:rounded-none bg-white lg:bg-transparent border border-gray-200 lg:border-0 shadow-sm lg:shadow-none">
          {menuItems}
        </div>
      </div>
    </div>
  );
}
