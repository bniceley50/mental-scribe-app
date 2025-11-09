import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from '@/components/ChatInterface';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('@/hooks/useMessages', () => ({
  useMessages: vi.fn(() => ({
    messages: [],
    loading: false,
    hasMore: false,
    addMessage: vi.fn(async () => ({ id: 'msg-1', role: 'user', content: 'test', created_at: new Date().toISOString() })),
    refreshMessages: vi.fn(),
    loadOlderMessages: vi.fn(),
  })),
}));

vi.mock('@/hooks/useConversations', () => ({
  useConversations: vi.fn(() => ({
    conversations: [],
    loading: false,
    createConversation: vi.fn(async () => 'new-conv-123'),
    deleteConversation: vi.fn(),
    refreshConversations: vi.fn(),
  })),
}));

vi.mock('@/lib/openai', () => ({
  analyzeNotesStreaming: vi.fn(async ({ onChunk, onComplete }) => {
    await new Promise(resolve => setTimeout(resolve, 10));
    onChunk('AI ');
    onChunk('response');
    await onComplete();
  }),
}));

vi.mock('@/lib/fileUpload', () => ({
  extractTextFromFile: vi.fn(() => Promise.resolve('Extracted content')),
  uploadFileToStorage: vi.fn(() => Promise.resolve({ url: 'file-url' })),
  saveFileMetadata: vi.fn(() => Promise.resolve('file-id')),
  getConversationFiles: vi.fn(() => Promise.resolve([])),
  deleteFile: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/lib/exportUtils', () => ({
  exportConversationToPDF: vi.fn(),
  exportConversationToText: vi.fn(),
  copyConversationToClipboard: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

const renderChatInterface = (conversationId: string | null = null) => {
  return render(
    <TestWrapper>
      <ChatInterface conversationId={conversationId} onConversationCreated={vi.fn()} />
    </TestWrapper>
  );
};

describe('ChatInterface Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete User Flow', () => {
    it('should handle complete message submission flow', async () => {
      const user = userEvent.setup();
      const { getByPlaceholderText, getByRole, findByText } = renderChatInterface();

      // Type a message
      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.type(textarea, 'Patient showed improvement today');

      // Submit the message
      const submitButton = getByRole('button', { name: /Analyze Notes/i });
      await user.click(submitButton);

      // Wait for AI response
      await waitFor(async () => {
        const response = await findByText(/AI response/i);
        expect(response).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should create new conversation on first message', async () => {
      const user = userEvent.setup();
      const { useConversations } = await import('@/hooks/useConversations');
      const mockCreate = vi.fn(async () => 'new-conv-123');
      
      vi.mocked(useConversations).mockReturnValue({
        conversations: [],
        loading: false,
        hasMore: false,
        createConversation: mockCreate,
        deleteConversation: vi.fn(),
        refreshConversations: vi.fn(),
        loadMore: vi.fn(),
      });

      const { getByPlaceholderText, getByRole } = renderChatInterface(null);

      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.type(textarea, 'New session notes');

      const submitButton = getByRole('button', { name: /Analyze Notes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
      });
    });
  });

  describe('Component Integration', () => {
    it('should integrate ChatInput and MessageList correctly', async () => {
      const user = userEvent.setup();
      const { useMessages } = await import('@/hooks/useMessages');
      
      const messages = [
        { id: '1', role: 'user', content: 'Test user message', created_at: new Date().toISOString() },
        { id: '2', role: 'assistant', content: 'Test AI response', created_at: new Date().toISOString() },
      ];

      vi.mocked(useMessages).mockReturnValue({
        messages: messages as any,
        loading: false,
        hasMore: false,
        addMessage: vi.fn(),
        refreshMessages: vi.fn(),
        loadOlderMessages: vi.fn(),
      });

      const { getByText, getByPlaceholderText } = renderChatInterface('conv-123');

      // Messages should be displayed
      expect(getByText('Test user message')).toBeInTheDocument();
      expect(getByText('Test AI response')).toBeInTheDocument();

      // Input should still be functional
      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.type(textarea, 'New message');
      expect(textarea).toHaveValue('New message');
    });

    it('should integrate ConversationHeader with export actions', async () => {
      const user = userEvent.setup();
      const { useMessages } = await import('@/hooks/useMessages');
      const { exportConversationToPDF } = await import('@/lib/exportUtils');

      vi.mocked(useMessages).mockReturnValue({
        messages: [
          { id: '1', role: 'user', content: 'Message 1', created_at: new Date().toISOString() },
          { id: '2', role: 'assistant', content: 'Message 2', created_at: new Date().toISOString() },
        ] as any,
        loading: false,
        hasMore: false,
        addMessage: vi.fn(),
        refreshMessages: vi.fn(),
        loadOlderMessages: vi.fn(),
      });

      const { getByRole, findByText } = renderChatInterface('conv-123');

      const exportButton = getByRole('button', { name: /Export/i });
      await user.click(exportButton);

      const pdfOption = await findByText(/Download as PDF/i);
      await user.click(pdfOption);

      expect(exportConversationToPDF).toHaveBeenCalled();
    });

    it('should integrate QuickActions with message submission', async () => {
      const user = userEvent.setup();
      const { getByRole } = renderChatInterface();

      const soapButton = getByRole('button', { name: /SOAP Note/i });
      await user.click(soapButton);

      // Should trigger analysis
      const { analyzeNotesStreaming } = await import('@/lib/openai');
      await waitFor(() => {
        expect(analyzeNotesStreaming).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      const { analyzeNotesStreaming } = await import('@/lib/openai');
      const { toast } = await import('sonner');

      vi.mocked(analyzeNotesStreaming).mockImplementationOnce(async ({ onError }) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        onError('API Error: Server unavailable');
      });

      const { getByPlaceholderText, getByRole } = renderChatInterface();

      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.type(textarea, 'Test notes');

      const submitButton = getByRole('button', { name: /Analyze Notes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('State Management', () => {
    it('should clear input after successful submission', async () => {
      const user = userEvent.setup();
      const { getByPlaceholderText, getByRole } = renderChatInterface();

      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.type(textarea, 'Test message');
      
      expect(textarea).toHaveValue('Test message');

      const submitButton = getByRole('button', { name: /Analyze Notes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('should maintain conversation state across actions', async () => {
      const user = userEvent.setup();
      const { useMessages } = await import('@/hooks/useMessages');

      const initialMessages = [
        { id: '1', role: 'user', content: 'Message 1', created_at: new Date().toISOString() },
      ];

      vi.mocked(useMessages).mockReturnValue({
        messages: initialMessages as any,
        loading: false,
        hasMore: false,
        addMessage: vi.fn(),
        refreshMessages: vi.fn(),
        loadOlderMessages: vi.fn(),
      });

      const { getByText, getByRole, rerender } = renderChatInterface('conv-123');

      expect(getByText('Message 1')).toBeInTheDocument();

      // Add new message
      const updatedMessages = [
        ...initialMessages,
        { id: '2', role: 'assistant', content: 'Message 2', created_at: new Date().toISOString() },
      ];

      vi.mocked(useMessages).mockReturnValue({
        messages: updatedMessages as any,
        loading: false,
        hasMore: false,
        addMessage: vi.fn(),
        refreshMessages: vi.fn(),
        loadOlderMessages: vi.fn(),
      });

      rerender(
        <TestWrapper>
          <ChatInterface conversationId="conv-123" onConversationCreated={vi.fn()} />
        </TestWrapper>
      );

      expect(getByText('Message 1')).toBeInTheDocument();
      expect(getByText('Message 2')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should render both tabs correctly', () => {
      const { getByRole } = renderChatInterface();

      const freeformTab = getByRole('tab', { name: /Free-form Notes/i });
      const structuredTab = getByRole('tab', { name: /Structured Form/i });

      expect(freeformTab).toBeInTheDocument();
      expect(structuredTab).toBeInTheDocument();
    });

    it('should switch between tabs', async () => {
      const user = userEvent.setup();
      const { getByRole, findByText } = renderChatInterface('conv-123');

      const structuredTab = getByRole('tab', { name: /Structured Form/i });
      await user.click(structuredTab);

      // Structured form should be visible
      // (actual content depends on StructuredNoteForm component)
      expect(structuredTab).toHaveAttribute('data-state', 'active');
    });
  });
});
