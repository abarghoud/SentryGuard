import React from 'react';
import { render, screen } from '@testing-library/react';
import { AiIllustrationWrapper } from './AiIllustrationWrapper';

describe('The AiIllustrationWrapper component', () => {
  describe('When rendering in English by default', () => {
    beforeEach(() => {
      render(
        <AiIllustrationWrapper locale="en">
          <img src="/test.png" alt="Test image" />
        </AiIllustrationWrapper>
      );
    });

    it('should display the English AI generated label', () => {
      expect(screen.getByText('AI Generated')).toBeInTheDocument();
    });

    it('should render the children content', () => {
      expect(screen.getByAltText('Test image')).toBeInTheDocument();
    });

    it('should set an accessible role note and aria label', () => {
      const noteElement = screen.getByRole('note');
      expect(noteElement).toHaveAttribute(
        'aria-label',
        'AI-generated illustration (in compliance with EU guidelines)'
      );
    });
  });

  describe('When rendering in French', () => {
    beforeEach(() => {
      render(
        <AiIllustrationWrapper locale="fr">
          <img src="/test-fr.png" alt="Image de test" />
        </AiIllustrationWrapper>
      );
    });

    it('should display the French label', () => {
      expect(screen.getByText('Généré par IA')).toBeInTheDocument();
    });

    it('should set the French tooltip in aria-label', () => {
      const noteElement = screen.getByRole('note');
      expect(noteElement).toHaveAttribute(
        'aria-label',
        "Illustration générée par intelligence artificielle (conformément aux lignes directrices de l'UE)"
      );
    });
  });

  describe('When providing custom label, tooltip and position', () => {
    beforeEach(() => {
      render(
        <AiIllustrationWrapper
          locale="en"
          position="top-left"
          label="Custom AI"
          tooltipText="Custom tooltip info"
          className="custom-container"
        >
          <img src="/custom.png" alt="Custom" />
        </AiIllustrationWrapper>
      );
    });

    it('should display the custom label', () => {
      expect(screen.getByText('Custom AI')).toBeInTheDocument();
    });

    it('should use the custom tooltip for aria-label', () => {
      const noteElement = screen.getByRole('note');
      expect(noteElement).toHaveAttribute('aria-label', 'Custom tooltip info');
    });

    it('should apply the top-left positioning class', () => {
      const noteElement = screen.getByRole('note');
      expect(noteElement).toHaveClass('top-3', 'left-3');
    });
  });
});
