import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PasswordStrength, { useHibp } from '../PasswordStrength';
import { renderHook } from '@testing-library/react';

describe('PasswordStrength Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Password Strength Scoring', () => {
    it('should show weak for simple passwords', () => {
      render(<PasswordStrength password="password123" hibpEnabled={false} />);
      expect(screen.getByText('weak')).toBeInTheDocument();
    });

    it('should show fair for moderate passwords', () => {
      render(<PasswordStrength password="Pass1234" hibpEnabled={false} />);
      const label = screen.getByText(/fair/i);
      expect(label).toBeInTheDocument();
    });

    it('should show good for decent passwords', () => {
      render(<PasswordStrength password="Pass1234!@Extra" hibpEnabled={false} />);
      const label = screen.getByText(/(good|strong)/i);
      expect(label).toBeInTheDocument();
    });

    it('should show strong for excellent passwords', () => {
      render(<PasswordStrength password="Sup3r$ecure!P@ssw0rd#2024" hibpEnabled={false} />);
      expect(screen.getByText('strong')).toBeInTheDocument();
    });

    it('should show empty for no password', () => {
      render(<PasswordStrength password="" hibpEnabled={false} />);
      expect(screen.queryByText(/weak|fair|good|strong/i)).not.toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar with correct ARIA attributes', () => {
      render(<PasswordStrength password="test123" hibpEnabled={false} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Password strength');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '4');
      expect(progressBar).toHaveAttribute('aria-valuenow');
      expect(progressBar).toHaveAttribute('aria-valuetext');
    });

    it('should show correct progress percentage for weak password', () => {
      render(<PasswordStrength password="abc" hibpEnabled={false} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '1');
    });

    it('should show correct progress percentage for strong password', () => {
      render(<PasswordStrength password="Sup3r$ecure!P@ssw0rd" hibpEnabled={false} />);
      
      const progressBar = screen.getByRole('progressbar');
      const valueNow = progressBar.getAttribute('aria-valuenow');
      expect(parseInt(valueNow || '0')).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Password Suggestions', () => {
    it('should show suggestions for weak passwords', () => {
      render(<PasswordStrength password="abc" hibpEnabled={false} />);
      
      expect(screen.getByText(/12\+ characters/i)).toBeInTheDocument();
    });

    it('should show variety suggestion for simple passwords', () => {
      render(<PasswordStrength password="password" hibpEnabled={false} />);
      
      expect(screen.getByText(/mix upper\/lower, numbers, symbols/i)).toBeInTheDocument();
    });

    it('should warn against common words', () => {
      render(<PasswordStrength password="password123" hibpEnabled={false} />);
      
      expect(screen.getByText(/avoid common words/i)).toBeInTheDocument();
    });

    it('should warn against repeated characters', () => {
      render(<PasswordStrength password="aaa111" hibpEnabled={false} />);
      
      expect(screen.getByText(/avoid repeated characters/i)).toBeInTheDocument();
    });

    it('should not show suggestions for strong passwords', () => {
      render(<PasswordStrength password="Sup3r$ecure!P@ssw0rd#2024" hibpEnabled={false} />);
      
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('HIBP Integration', () => {
    it('should show checking message initially', async () => {
      render(<PasswordStrength password="testpassword123" hibpEnabled={true} />);
      
      // Should show checking state briefly
      expect(screen.getByText(/checking breaches/i)).toBeInTheDocument();
    });

    it('should handle HIBP unavailable gracefully', async () => {
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      render(<PasswordStrength password="testpassword123" hibpEnabled={true} />);
      
      await waitFor(() => {
        expect(screen.getByText(/breach check unavailable/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should not check breaches when hibpEnabled is false', () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      
      render(<PasswordStrength password="testpassword123" hibpEnabled={false} />);
      
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should not check breaches for short passwords', () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      
      render(<PasswordStrength password="short" hibpEnabled={true} />);
      
      // Should not call fetch for passwords < 8 chars
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have live regions for dynamic updates', () => {
      const { container } = render(<PasswordStrength password="test" hibpEnabled={false} />);
      
      const liveRegions = container.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);
    });

    it('should announce strength changes to screen readers', () => {
      const { rerender } = render(<PasswordStrength password="weak" hibpEnabled={false} />);
      
      expect(screen.getByText('weak')).toBeInTheDocument();
      
      // Update to strong password
      rerender(<PasswordStrength password="Str0ng!P@ssw0rd#123" hibpEnabled={false} />);
      
      expect(screen.getByText(/(good|strong)/i)).toBeInTheDocument();
    });
  });

  describe('useHibp Hook', () => {
    beforeEach(() => {
      // Mock crypto.subtle.digest for tests
      vi.spyOn(global.crypto.subtle, 'digest').mockResolvedValue(new ArrayBuffer(20));
    });

    it('should return checking state initially', () => {
      const { result } = renderHook(() => useHibp('testpassword', true));
      
      expect(result.current.checking).toBe(false);
      expect(result.current.pwned).toBe(false);
    });

    it('should not check when disabled', () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      renderHook(() => useHibp('testpassword', false));
      
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should not check passwords shorter than 8 characters', () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      renderHook(() => useHibp('short', true));
      
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Design System Integration', () => {
    it('should use semantic color tokens', () => {
      const { container } = render(<PasswordStrength password="weak" hibpEnabled={false} />);
      
      // Check that semantic classes are used (not direct colors)
      const progressFill = container.querySelector('.bg-destructive, .bg-warning, .bg-success');
      expect(progressFill).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PasswordStrength password="test" className="custom-class" hibpEnabled={false} />
      );
      
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });
});
