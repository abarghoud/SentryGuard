import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CopyLinkButton } from './CopyLinkButton';

describe('The CopyLinkButton component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
    window.history.pushState = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('When rendered with targetId', () => {
    it('should render a button with copy label', () => {
      render(
        <CopyLinkButton
          targetId="what-is-sentryguard"
          copyLabel="Copy link"
          copiedLabel="Copied!"
        />
      );

      const button = screen.getByRole('button', { name: 'Copy link' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('When clicked', () => {
    it('should copy full url with targetId to clipboard and update window history', async () => {
      render(
        <CopyLinkButton
          targetId="why-telegram"
          copyLabel="Copy link"
          copiedLabel="Copied!"
        />
      );

      const button = screen.getByRole('button', { name: 'Copy link' });

      await act(async () => {
        fireEvent.click(button);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('#why-telegram')
      );
      expect(window.history.pushState).toHaveBeenCalledWith(
        null,
        '',
        '#why-telegram'
      );
      expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Copied!');
    });

    it('should stop event propagation when clicked', async () => {
      const parentClickHandler = jest.fn();

      render(
        <div onClick={parentClickHandler}>
          <CopyLinkButton targetId="some-id" />
        </div>
      );

      const button = screen.getByRole('button');

      await act(async () => {
        fireEvent.click(button);
      });

      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe('When 2000ms elapsed after clicking', () => {
    it('should reset copied state back to default copy label', async () => {
      render(
        <CopyLinkButton
          targetId="why-telegram"
          copyLabel="Copy link"
          copiedLabel="Copied!"
        />
      );

      const button = screen.getByRole('button', { name: 'Copy link' });

      await act(async () => {
        fireEvent.click(button);
      });

      expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    });
  });
});
