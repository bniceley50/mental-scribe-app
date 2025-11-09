import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickActions } from '../QuickActions';

// Mock NoteTemplates component
vi.mock('@/components/NoteTemplates', () => ({
  NoteTemplates: ({ onSelectTemplate }: any) => (
    <button onClick={() => onSelectTemplate('Template content')}>
      Templates
    </button>
  ),
}));

describe('QuickActions', () => {
  const defaultProps = {
    onAction: vi.fn(),
    onSelectTemplate: vi.fn(),
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all quick action buttons', () => {
      const { getByRole } = render(<QuickActions {...defaultProps} />);
      
      expect(getByRole('button', { name: /SOAP Note/i })).toBeInTheDocument();
      expect(getByRole('button', { name: /Session Summary/i })).toBeInTheDocument();
      expect(getByRole('button', { name: /Key Points/i })).toBeInTheDocument();
      expect(getByRole('button', { name: /Progress Report/i })).toBeInTheDocument();
    });

    it('should render templates button', () => {
      const { getByRole } = render(<QuickActions {...defaultProps} />);
      const templatesButton = getByRole('button', { name: /Templates/i });
      expect(templatesButton).toBeInTheDocument();
    });

    it('should display Quick Actions label', () => {
      const { getByText } = render(<QuickActions {...defaultProps} />);
      expect(getByText(/Quick Actions/i)).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    it('should call onAction with "soap" when SOAP Note button is clicked', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const { getByRole } = render(<QuickActions {...defaultProps} onAction={onAction} />);

      const button = getByRole('button', { name: /SOAP Note/i });
      await user.click(button);

      expect(onAction).toHaveBeenCalledWith('soap');
    });

    it('should call onAction with "summary" when Session Summary button is clicked', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const { getByRole } = render(<QuickActions {...defaultProps} onAction={onAction} />);

      const button = getByRole('button', { name: /Session Summary/i });
      await user.click(button);

      expect(onAction).toHaveBeenCalledWith('summary');
    });

    it('should call onAction with "keypoints" when Key Points button is clicked', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const { getByRole } = render(<QuickActions {...defaultProps} onAction={onAction} />);

      const button = getByRole('button', { name: /Key Points/i });
      await user.click(button);

      expect(onAction).toHaveBeenCalledWith('keypoints');
    });

    it('should call onAction with "progress" when Progress Report button is clicked', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const { getByRole } = render(<QuickActions {...defaultProps} onAction={onAction} />);

      const button = getByRole('button', { name: /Progress Report/i });
      await user.click(button);

      expect(onAction).toHaveBeenCalledWith('progress');
    });

    it('should call onSelectTemplate when template is selected', async () => {
      const user = userEvent.setup();
      const onSelectTemplate = vi.fn();
      const { getByRole } = render(
        <QuickActions {...defaultProps} onSelectTemplate={onSelectTemplate} />
      );

      const templatesButton = getByRole('button', { name: /Templates/i });
      await user.click(templatesButton);

      expect(onSelectTemplate).toHaveBeenCalledWith('Template content');
    });
  });

  describe('Loading State', () => {
    it('should disable all action buttons when loading', () => {
      const { getByRole } = render(<QuickActions {...defaultProps} loading={true} />);

      const soapButton = getByRole('button', { name: /SOAP Note/i });
      const summaryButton = getByRole('button', { name: /Session Summary/i });
      const keyPointsButton = getByRole('button', { name: /Key Points/i });
      const progressButton = getByRole('button', { name: /Progress Report/i });

      expect(soapButton).toBeDisabled();
      expect(summaryButton).toBeDisabled();
      expect(keyPointsButton).toBeDisabled();
      expect(progressButton).toBeDisabled();
    });

    it('should enable all action buttons when not loading', () => {
      const { getByRole } = render(<QuickActions {...defaultProps} loading={false} />);

      const soapButton = getByRole('button', { name: /SOAP Note/i });
      const summaryButton = getByRole('button', { name: /Session Summary/i });
      const keyPointsButton = getByRole('button', { name: /Key Points/i });
      const progressButton = getByRole('button', { name: /Progress Report/i });

      expect(soapButton).not.toBeDisabled();
      expect(summaryButton).not.toBeDisabled();
      expect(keyPointsButton).not.toBeDisabled();
      expect(progressButton).not.toBeDisabled();
    });
  });

  describe('Styling and Layout', () => {
    it('should use grid layout for action buttons', () => {
      const { container } = render(<QuickActions {...defaultProps} />);
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid?.className).toContain('grid-cols-2');
      expect(grid?.className).toContain('md:grid-cols-4');
    });

    it('should apply hover styles to buttons', () => {
      const { getByRole } = render(<QuickActions {...defaultProps} />);
      const button = getByRole('button', { name: /SOAP Note/i });
      expect(button.className).toContain('hover:bg-primary/10');
    });
  });
});
