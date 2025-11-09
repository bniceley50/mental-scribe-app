import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageList } from '../MessageList';
import type { Message } from '@/hooks/useMessages';

// Mock dependencies
vi.mock('@/components/MessageActions', () => ({
  MessageActions: ({ content, onRegenerate, onEdit }: any) => (
    <div>
      <button onClick={onRegenerate}>Regenerate</button>
      <button onClick={onEdit}>Edit</button>
    </div>
  ),
  StreamingMessage: ({ content, isStreaming }: any) => (
    <div>
      {content}
      {isStreaming && <span>Streaming...</span>}
    </div>
  ),
}));

describe('MessageList', () => {
  const defaultProps = {
    messages: [] as Array<Message & { isStreaming?: boolean }>,
    hasMore: false,
    onLoadMore: vi.fn(),
    messagesLoading: false,
    conversationId: 'conv-123',
    onRegenerate: vi.fn(),
    onEditMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when messages array is empty', () => {
      const { container } = render(<MessageList {...defaultProps} messages={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render user messages', () => {
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '1',
          role: 'user',
          content: 'Test user message',
          created_at: new Date().toISOString(),
        },
      ];
      const { getByText } = render(<MessageList {...defaultProps} messages={messages} />);
      expect(getByText('Test user message')).toBeInTheDocument();
    });

    it('should render assistant messages', () => {
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '2',
          role: 'assistant',
          content: 'Test AI response',
          created_at: new Date().toISOString(),
        },
      ];
      const { getByText } = render(<MessageList {...defaultProps} messages={messages} />);
      expect(getByText('Test AI response')).toBeInTheDocument();
    });

    it('should render multiple messages in order', () => {
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '1',
          role: 'user',
          content: 'First message',
          created_at: '2025-01-01T10:00:00Z',
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Second message',
          created_at: '2025-01-01T10:01:00Z',
        },
        {
          id: '3',
          role: 'user',
          content: 'Third message',
          created_at: '2025-01-01T10:02:00Z',
        },
      ];
      const { getAllByText } = render(<MessageList {...defaultProps} messages={messages} />);
      
      expect(getAllByText(/message/i)).toHaveLength(3);
    });

    it('should show streaming indicator for streaming messages', () => {
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '1',
          role: 'assistant',
          content: 'Streaming content',
          created_at: new Date().toISOString(),
          isStreaming: true,
        },
      ];
      const { getByText } = render(<MessageList {...defaultProps} messages={messages} />);
      expect(getByText('Streaming...')).toBeInTheDocument();
    });
  });

  describe('Message Styling', () => {
    it('should apply correct styling to user messages', () => {
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '1',
          role: 'user',
          content: 'User message',
          created_at: new Date().toISOString(),
        },
      ];
      const { container } = render(<MessageList {...defaultProps} messages={messages} />);
      const messageContainer = container.querySelector('.justify-end');
      expect(messageContainer).toBeInTheDocument();
    });

    it('should apply correct styling to assistant messages', () => {
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '2',
          role: 'assistant',
          content: 'AI response',
          created_at: new Date().toISOString(),
        },
      ];
      const { container } = render(<MessageList {...defaultProps} messages={messages} />);
      const messageContainer = container.querySelector('.justify-start');
      expect(messageContainer).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should show load more button when hasMore is true', () => {
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '1',
          role: 'user',
          content: 'Message',
          created_at: new Date().toISOString(),
        },
      ];
      const { getByRole } = render(
        <MessageList {...defaultProps} messages={messages} hasMore={true} />
      );
      const button = getByRole('button', { name: /Load older messages/i });
      expect(button).toBeInTheDocument();
    });

    it('should not show load more button when hasMore is false', () => {
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '1',
          role: 'user',
          content: 'Message',
          created_at: new Date().toISOString(),
        },
      ];
      const { queryByRole } = render(
        <MessageList {...defaultProps} messages={messages} hasMore={false} />
      );
      const button = queryByRole('button', { name: /Load older messages/i });
      expect(button).not.toBeInTheDocument();
    });

    it('should not show load more button when conversationId is null', () => {
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '1',
          role: 'user',
          content: 'Message',
          created_at: new Date().toISOString(),
        },
      ];
      const { queryByRole } = render(
        <MessageList {...defaultProps} messages={messages} hasMore={true} conversationId={null} />
      );
      const button = queryByRole('button', { name: /Load older messages/i });
      expect(button).not.toBeInTheDocument();
    });

    it('should call onLoadMore when load more button is clicked', async () => {
      const user = userEvent.setup();
      const onLoadMore = vi.fn();
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '1',
          role: 'user',
          content: 'Message',
          created_at: new Date().toISOString(),
        },
      ];
      const { getByRole } = render(
        <MessageList {...defaultProps} messages={messages} hasMore={true} onLoadMore={onLoadMore} />
      );

      const button = getByRole('button', { name: /Load older messages/i });
      await user.click(button);

      expect(onLoadMore).toHaveBeenCalled();
    });

    it('should disable load more button when loading', () => {
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '1',
          role: 'user',
          content: 'Message',
          created_at: new Date().toISOString(),
        },
      ];
      const { getByRole } = render(
        <MessageList {...defaultProps} messages={messages} hasMore={true} messagesLoading={true} />
      );
      const button = getByRole('button', { name: /Loading/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Message Actions', () => {
    it('should call onRegenerate when regenerate button is clicked', async () => {
      const user = userEvent.setup();
      const onRegenerate = vi.fn();
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '1',
          role: 'assistant',
          content: 'AI message',
          created_at: new Date().toISOString(),
        },
      ];
      const { getByRole } = render(
        <MessageList {...defaultProps} messages={messages} onRegenerate={onRegenerate} />
      );

      const button = getByRole('button', { name: /Regenerate/i });
      await user.click(button);

      expect(onRegenerate).toHaveBeenCalled();
    });

    it('should call onEditMessage when edit button is clicked', async () => {
      const user = userEvent.setup();
      const onEditMessage = vi.fn();
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '1',
          role: 'assistant',
          content: 'AI message',
          created_at: new Date().toISOString(),
        },
      ];
      const { getByRole } = render(
        <MessageList {...defaultProps} messages={messages} onEditMessage={onEditMessage} />
      );

      const button = getByRole('button', { name: /Edit/i });
      await user.click(button);

      expect(onEditMessage).toHaveBeenCalledWith(messages[0]);
    });
  });

  describe('Timestamps', () => {
    it('should format and display message timestamps', () => {
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '1',
          role: 'user',
          content: 'Message',
          created_at: '2025-01-01T14:30:00Z',
        },
      ];
      const { container } = render(<MessageList {...defaultProps} messages={messages} />);
      const timestamp = container.querySelector('.text-muted-foreground');
      expect(timestamp).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-live attribute on load more button', () => {
      const messages: Array<Message & { isStreaming?: boolean }> = [
        {
          id: '1',
          role: 'user',
          content: 'Message',
          created_at: new Date().toISOString(),
        },
      ];
      const { getByRole } = render(
        <MessageList {...defaultProps} messages={messages} hasMore={true} />
      );
      const button = getByRole('button', { name: /Load older messages/i });
      expect(button).toHaveAttribute('aria-live', 'polite');
    });
  });
});
