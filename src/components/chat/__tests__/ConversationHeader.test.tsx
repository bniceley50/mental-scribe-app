import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversationHeader } from '../ConversationHeader';

// Mock Part2Badge component
vi.mock('@/components/Part2Badge', () => ({
  Part2Badge: ({ consentStatus }: any) => (
    <div>Part 2 Protected - {consentStatus}</div>
  ),
}));

describe('ConversationHeader', () => {
  const defaultProps = {
    conversationId: 'conv-123',
    conversationTitle: 'Test Conversation',
    messageCount: 5,
    isPart2Protected: false,
    part2ConsentStatus: undefined,
    onExportPDF: vi.fn(),
    onExportText: vi.fn(),
    onCopyToClipboard: vi.fn(),
    onClearConversation: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when conversationId is null', () => {
      const { container } = render(
        <ConversationHeader {...defaultProps} conversationId={null} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should not render when messageCount is 1 or less', () => {
      const { container } = render(
        <ConversationHeader {...defaultProps} messageCount={1} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render when conversationId exists and messageCount > 1', () => {
      const { getByText } = render(<ConversationHeader {...defaultProps} />);
      expect(getByText('Test Conversation')).toBeInTheDocument();
    });

    it('should display conversation title', () => {
      const { getByText } = render(
        <ConversationHeader {...defaultProps} conversationTitle="My Clinical Notes" />
      );
      expect(getByText('My Clinical Notes')).toBeInTheDocument();
    });

    it('should show Part 2 badge when isPart2Protected is true', () => {
      const { getByText } = render(
        <ConversationHeader
          {...defaultProps}
          isPart2Protected={true}
          part2ConsentStatus="verified"
        />
      );
      expect(getByText(/Part 2 Protected - verified/i)).toBeInTheDocument();
    });

    it('should not show Part 2 badge when isPart2Protected is false', () => {
      const { queryByText } = render(
        <ConversationHeader {...defaultProps} isPart2Protected={false} />
      );
      expect(queryByText(/Part 2 Protected/i)).not.toBeInTheDocument();
    });
  });

  describe('Export Menu', () => {
    it('should render export button', () => {
      const { getByRole } = render(<ConversationHeader {...defaultProps} />);
      const exportButton = getByRole('button', { name: /Export/i });
      expect(exportButton).toBeInTheDocument();
    });

    it('should open export menu when clicked', async () => {
      const user = userEvent.setup();
      const { getByRole, findByText } = render(<ConversationHeader {...defaultProps} />);
      
      const exportButton = getByRole('button', { name: /Export/i });
      await user.click(exportButton);

      const pdfOption = await findByText(/Download as PDF/i);
      const textOption = await findByText(/Download as Text/i);
      const copyOption = await findByText(/Copy to Clipboard/i);

      expect(pdfOption).toBeInTheDocument();
      expect(textOption).toBeInTheDocument();
      expect(copyOption).toBeInTheDocument();
    });

    it('should call onExportPDF when PDF option is clicked', async () => {
      const user = userEvent.setup();
      const onExportPDF = vi.fn();
      const { getByRole, findByText } = render(
        <ConversationHeader {...defaultProps} onExportPDF={onExportPDF} />
      );

      const exportButton = getByRole('button', { name: /Export/i });
      await user.click(exportButton);

      const pdfOption = await findByText(/Download as PDF/i);
      await user.click(pdfOption);

      expect(onExportPDF).toHaveBeenCalled();
    });

    it('should call onExportText when text option is clicked', async () => {
      const user = userEvent.setup();
      const onExportText = vi.fn();
      const { getByRole, findByText } = render(
        <ConversationHeader {...defaultProps} onExportText={onExportText} />
      );

      const exportButton = getByRole('button', { name: /Export/i });
      await user.click(exportButton);

      const textOption = await findByText(/Download as Text/i);
      await user.click(textOption);

      expect(onExportText).toHaveBeenCalled();
    });

    it('should call onCopyToClipboard when copy option is clicked', async () => {
      const user = userEvent.setup();
      const onCopyToClipboard = vi.fn();
      const { getByRole, findByText } = render(
        <ConversationHeader {...defaultProps} onCopyToClipboard={onCopyToClipboard} />
      );

      const exportButton = getByRole('button', { name: /Export/i });
      await user.click(exportButton);

      const copyOption = await findByText(/Copy to Clipboard/i);
      await user.click(copyOption);

      expect(onCopyToClipboard).toHaveBeenCalled();
    });
  });

  describe('Clear Conversation', () => {
    it('should render clear conversation button', () => {
      const { getByRole } = render(<ConversationHeader {...defaultProps} />);
      const clearButton = getByRole('button', { name: /Clear Conversation/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('should call onClearConversation when clear button is clicked', async () => {
      const user = userEvent.setup();
      const onClearConversation = vi.fn();
      const { getByRole } = render(
        <ConversationHeader {...defaultProps} onClearConversation={onClearConversation} />
      );

      const clearButton = getByRole('button', { name: /Clear Conversation/i });
      await user.click(clearButton);

      expect(onClearConversation).toHaveBeenCalled();
    });

    it('should have destructive styling on clear button', () => {
      const { getByRole } = render(<ConversationHeader {...defaultProps} />);
      const clearButton = getByRole('button', { name: /Clear Conversation/i });
      expect(clearButton.className).toContain('hover:bg-destructive');
    });
  });
});
