import { renderHook, act } from '@testing-library/react';
import { useFaqHashNavigation } from './use-faq-hash-navigation';

describe('The useFaqHashNavigation() hook', () => {
  let scrollToMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    window.location.hash = '';
    scrollToMock = jest.fn();
    window.scrollTo = scrollToMock;
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('When mounted without hash', () => {
    it('should initialize with no open items and no highlighted item', () => {
      const { result } = renderHook(() => useFaqHashNavigation());

      expect(result.current.openItems.size).toBe(0);
      expect(result.current.highlightedId).toBeNull();
    });
  });

  describe('When toggling items manually', () => {
    it('should add and remove items from openItems set', () => {
      const { result } = renderHook(() => useFaqHashNavigation());

      act(() => {
        result.current.toggleItem('item-1');
      });

      expect(result.current.isItemOpen('item-1')).toBe(true);

      act(() => {
        result.current.toggleItem('item-1');
      });

      expect(result.current.isItemOpen('item-1')).toBe(false);
    });

    it('should support explicit setItemOpen', () => {
      const { result } = renderHook(() => useFaqHashNavigation());

      act(() => {
        result.current.setItemOpen('item-2', true);
      });

      expect(result.current.isItemOpen('item-2')).toBe(true);

      act(() => {
        result.current.setItemOpen('item-2', false);
      });

      expect(result.current.isItemOpen('item-2')).toBe(false);
    });
  });

  describe('When mounted with a hash matching an element', () => {
    it('should expand the item, highlight it, and scroll to it', () => {
      const targetDiv = document.createElement('div');
      targetDiv.id = 'what-is-sentryguard';
      targetDiv.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 500,
        bottom: 600,
        height: 100,
      });
      document.body.appendChild(targetDiv);

      window.location.hash = '#what-is-sentryguard';

      const { result } = renderHook(() => useFaqHashNavigation());

      act(() => {
        jest.advanceTimersByTime(60);
      });

      expect(result.current.isItemOpen('what-is-sentryguard')).toBe(true);
      expect(result.current.highlightedId).toBe('what-is-sentryguard');

      act(() => {
        jest.advanceTimersByTime(160);
      });

      expect(scrollToMock).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: 'smooth',
        })
      );
    });
  });

  describe('When scrollToTarget is invoked directly', () => {
    it('should open the item and trigger smooth scroll', () => {
      const targetDiv = document.createElement('div');
      targetDiv.id = 'why-telegram';
      targetDiv.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 400,
        bottom: 500,
        height: 100,
      });
      document.body.appendChild(targetDiv);

      const { result } = renderHook(() => useFaqHashNavigation());

      act(() => {
        result.current.scrollToTarget('why-telegram');
      });

      expect(result.current.isItemOpen('why-telegram')).toBe(true);
      expect(result.current.highlightedId).toBe('why-telegram');

      act(() => {
        jest.advanceTimersByTime(160);
      });

      expect(scrollToMock).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: 'smooth',
        })
      );
    });
  });

  describe('When user scrolls manually during hash navigation', () => {
    it('should stop automatic retries after user interaction', () => {
      const targetDiv = document.createElement('div');
      targetDiv.id = 'why-telegram';
      targetDiv.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 400,
        bottom: 500,
        height: 100,
      });
      document.body.appendChild(targetDiv);

      const { result } = renderHook(() => useFaqHashNavigation());

      act(() => {
        result.current.scrollToTarget('why-telegram');
      });

      act(() => {
        window.dispatchEvent(new Event('wheel'));
      });

      scrollToMock.mockClear();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(scrollToMock).not.toHaveBeenCalled();
    });
  });

  describe('When 2500ms elapsed after highlighting', () => {
    it('should reset highlightedId to null', () => {
      const targetDiv = document.createElement('div');
      targetDiv.id = 'is-sentryguard-free';
      targetDiv.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 300,
        bottom: 400,
        height: 100,
      });
      document.body.appendChild(targetDiv);

      window.location.hash = '#is-sentryguard-free';

      const { result } = renderHook(() => useFaqHashNavigation());

      act(() => {
        jest.advanceTimersByTime(60);
      });

      expect(result.current.highlightedId).toBe('is-sentryguard-free');

      act(() => {
        jest.advanceTimersByTime(2500);
      });

      expect(result.current.highlightedId).toBeNull();
    });
  });
});
