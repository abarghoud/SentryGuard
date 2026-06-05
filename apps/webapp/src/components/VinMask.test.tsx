import { render, screen, fireEvent } from '@testing-library/react';
import VinMask from './VinMask';

describe('The VinMask component', () => {
  const vin = '5YJ3E1EB8KF123456';
  const expectedMaskedVin = '5YJ••••••••••••••';

  describe('When rendered by default', () => {
    beforeEach(() => {
      render(<VinMask vin={vin} />);
    });

    it('should display the masked VIN', () => {
      expect(screen.getByText(expectedMaskedVin)).toBeInTheDocument();
    });
  });

  describe('When the eye icon button is clicked', () => {
    beforeEach(() => {
      render(<VinMask vin={vin} />);
      fireEvent.click(screen.getByRole('button', { name: /Show VIN/i }));
    });

    it('should display the full unmasked VIN', () => {
      expect(screen.getByText(vin)).toBeInTheDocument();
    });
  });

  describe('When the eye icon button is clicked twice', () => {
    beforeEach(() => {
      render(<VinMask vin={vin} />);
      fireEvent.click(screen.getByRole('button', { name: /Show VIN/i }));
      fireEvent.click(screen.getByRole('button', { name: /Hide VIN/i }));
    });

    it('should display the masked VIN again', () => {
      expect(screen.getByText(expectedMaskedVin)).toBeInTheDocument();
    });
  });
});
