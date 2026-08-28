import { render, screen } from '@testing-library/react';
import { FormattedDate } from './FormattedDate';

describe('The FormattedDate component', () => {
  const testIsoDate = '2026-08-16T12:00:00.000Z';

  describe('When rendered with a valid date string and French locale', () => {
    beforeEach(() => {
      render(<FormattedDate date={testIsoDate} locale="fr-FR" />);
    });

    it('should render a time element with the ISO datetime attribute', () => {
      const timeElement = screen.getByText(/16 août 2026/i);
      expect(timeElement).toBeInTheDocument();
      expect(timeElement).toHaveAttribute('dateTime', testIsoDate);
    });
  });

  describe('When rendered with a Date object and English locale', () => {
    beforeEach(() => {
      render(<FormattedDate date={new Date(testIsoDate)} locale="en-US" />);
    });

    it('should format using English date style', () => {
      const timeElement = screen.getByText(/Aug 16, 2026/i);
      expect(timeElement).toBeInTheDocument();
    });
  });
});
