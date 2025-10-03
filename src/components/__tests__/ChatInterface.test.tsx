import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from '../ChatInterface';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('@/hooks/useMessages', () => ({
  useMessages: vi.fn(() => ({
    messages: [],
    loading: false,
    addMessage: vi.fn(),
    refreshMessages: vi.fn(),
  })),
}));

vi.mock('@/hooks/useConversations', () => ({
  useConversations: vi.fn(() => ({
    conversations: [],
    loading: false,
    createConversation: vi.fn(() => Promise.resolve({ data: { id: 'conv-123' }, error: null })),
    deleteConversation: vi.fn(),
  })),
}));

vi.mock('@/lib/openai', () => ({
  analyzeNotesStreaming: vi.fn(async ({ onChunk, onComplete }) => {
    await new Promise(resolve => setTimeout(resolve, 10));
    onChunk('Mock ');
    onChunk('streaming ');
    onChunk('response');
    onComplete();
  }),
}));

vi.mock('@/lib/fileUpload', () => ({
  extractTextFromFile: vi.fn(() => Promise.resolve('Extracted file content')),
  uploadFileToStorage: vi.fn(() => Promise.resolve('file-url')),
  saveFileMetadata: vi.fn(() => Promise.resolve()),
  getConversationFiles: vi.fn(() => Promise.resolve({ data: [], error: null })),
  deleteFile: vi.fn(() => Promise.resolve()),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// Helper to render ChatInterface
const renderChatInterface = (conversationId: string | null = null) => {
  return render(
    <TestWrapper>
      <ChatInterface conversationId={conversationId} />
    </TestWrapper>
  );
};

describe('ChatInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // 1. Component Rendering Tests
  // ========================================
  describe('Initial Render', () => {
    it('should render the textarea input', () => {
      const { getByPlaceholderText } = renderChatInterface();
      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      expect(textarea).toBeInTheDocument();
    });

    it('should render the Analyze Notes button', () => {
      const { getByRole } = renderChatInterface();
      const button = getByRole('button', { name: /Analyze Notes/i });
      expect(button).toBeInTheDocument();
    });

    it('should display example prompts when no conversation exists', () => {
      const { getByText } = renderChatInterface();
      expect(getByText(/Try an example to get started/i)).toBeInTheDocument();
    });

    it('should display note templates button', () => {
      const { getByRole } = renderChatInterface();
      const templatesButton = getByRole('button', { name: /Templates/i });
      expect(templatesButton).toBeInTheDocument();
    });
  });

  // ========================================
  // 2. User Input Tests
  // ========================================
  describe('Text Input', () => {
    it('should update input value when user types', async () => {
      const user = userEvent.setup();
      const { getByPlaceholderText } = renderChatInterface();

      const textarea = getByPlaceholderText(/Enter your session notes here/i) as HTMLTextAreaElement;
      await user.type(textarea, 'Test note content');

      expect(textarea.value).toBe('Test note content');
    });

    it('should handle multiline input correctly', async () => {
      const user = userEvent.setup();
      const { getByPlaceholderText } = renderChatInterface();

      const textarea = getByPlaceholderText(/Enter your session notes here/i) as HTMLTextAreaElement;
      await user.type(textarea, 'Line 1{Enter}Line 2{Enter}Line 3');

      expect(textarea.value).toContain('Line 1');
      expect(textarea.value).toContain('Line 2');
      expect(textarea.value).toContain('Line 3');
    });

    it('should auto-focus textarea on mount', () => {
      const { getByPlaceholderText } = renderChatInterface();
      const textarea = getByPlaceholderText(/Enter your session notes here/i) as HTMLTextAreaElement;
      expect(textarea).toHaveAttribute('autoFocus');
    });
  });

  describe('Input Validation', () => {
    it('should disable submit button when input is empty', () => {
      const { getByRole } = renderChatInterface();
      const button = getByRole('button', { name: /Analyze Notes/i });
      expect(button).toBeDisabled();
    });

    it('should enable submit button when input has content', async () => {
      const user = userEvent.setup();
      const { getByPlaceholderText, getByRole } = renderChatInterface();

      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.type(textarea, 'Test content');

      const button = getByRole('button', { name: /Analyze Notes/i });
      expect(button).not.toBeDisabled();
    });
  });

  // ========================================
  // 3. Message Rendering Tests
  // ========================================
  describe('Message Display', () => {
    it('should render user messages', async () => {
      const { useMessages } = await import('@/hooks/useMessages');
      vi.mocked(useMessages).mockReturnValue({
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Test user message',
            created_at: new Date().toISOString(),
          },
        ],
        loading: false,
        addMessage: vi.fn(),
        refreshMessages: vi.fn(),
      });

      const { getByText } = renderChatInterface();
      expect(getByText('Test user message')).toBeInTheDocument();
    });

    it('should render AI messages', async () => {
      const { useMessages } = await import('@/hooks/useMessages');
      vi.mocked(useMessages).mockReturnValue({
        messages: [
          {
            id: '2',
            role: 'assistant',
            content: 'Test AI response',
            created_at: new Date().toISOString(),
          },
        ],
        loading: false,
        addMessage: vi.fn(),
        refreshMessages: vi.fn(),
      });

      const { getByText } = renderChatInterface();
      expect(getByText('Test AI response')).toBeInTheDocument();
    });
  });

  // ========================================
  // 4. Accessibility Tests
  // ========================================
  describe('Accessibility', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const { getByPlaceholderText, getByRole } = renderChatInterface();

      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.type(textarea, 'Test');
      
      await user.keyboard('{Tab}');
      
      const button = getByRole('button', { name: /Analyze Notes/i });
      expect(button).toHaveFocus();
    });
  });
});
