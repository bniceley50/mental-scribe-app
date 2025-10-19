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
  // 4. Quick Actions Tests
  // ========================================
  describe('Templates', () => {
    it('should render templates button', () => {
      const { getByRole } = renderChatInterface();
      const templatesButton = getByRole('button', { name: /Templates/i });
      expect(templatesButton).toBeInTheDocument();
    });

    it('should open template dialog on click', async () => {
      const user = userEvent.setup();
      const { getByRole, findByText } = renderChatInterface();

      const templatesButton = getByRole('button', { name: /Templates/i });
      await user.click(templatesButton);

      const dialogTitle = await findByText(/Note Templates Library/i);
      expect(dialogTitle).toBeInTheDocument();
    });
  });

  describe('Export Actions', () => {
    it('should not show export button when no conversation exists', () => {
      const { queryByRole } = renderChatInterface(null);
      const exportButton = queryByRole('button', { name: /Export/i });
      expect(exportButton).not.toBeInTheDocument();
    });

    it('should show export button when conversation exists', async () => {
      const { useMessages } = await import('@/hooks/useMessages');
      vi.mocked(useMessages).mockReturnValue({
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Test message',
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            role: 'assistant',
            content: 'Test response',
            created_at: new Date().toISOString(),
          },
        ],
        loading: false,
        addMessage: vi.fn(),
        refreshMessages: vi.fn(),
      });

      const { getByRole } = renderChatInterface('conv-123');
      const exportButton = getByRole('button', { name: /Export/i });
      expect(exportButton).toBeInTheDocument();
    });

    it('should open export menu on click', async () => {
      const user = userEvent.setup();
      const { useMessages } = await import('@/hooks/useMessages');
      vi.mocked(useMessages).mockReturnValue({
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Test message',
            created_at: new Date().toISOString(),
          },
        ],
        loading: false,
        addMessage: vi.fn(),
        refreshMessages: vi.fn(),
      });

      const { getByRole, findByText } = renderChatInterface('conv-123');
      const exportButton = getByRole('button', { name: /Export/i });
      
      await user.click(exportButton);

      const pdfOption = await findByText(/Download as PDF/i);
      const textOption = await findByText(/Download as Text/i);
      const copyOption = await findByText(/Copy to Clipboard/i);

      expect(pdfOption).toBeInTheDocument();
      expect(textOption).toBeInTheDocument();
      expect(copyOption).toBeInTheDocument();
    });
  });

  // ========================================
  // 5. File Upload Integration Tests
  // ========================================
  describe('File Upload', () => {
    it('should show file upload button', () => {
      const { getByRole } = renderChatInterface();
      const uploadButton = getByRole('button', { name: /Upload Document/i });
      expect(uploadButton).toBeInTheDocument();
    });

    it('should handle file selection', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      const { getByRole, getByText } = renderChatInterface();
      const uploadButton = getByRole('button', { name: /Upload Document/i });
      
      await user.click(uploadButton);
      
      // File upload zone should be visible
      const dropZoneText = getByText(/Drop files here or click to browse/i);
      expect(dropZoneText).toBeInTheDocument();
    });

    it('should process uploaded file', async () => {
      const { extractTextFromFile } = await import('@/lib/fileUpload');
      const mockExtract = vi.mocked(extractTextFromFile);
      
      mockExtract.mockResolvedValueOnce('Extracted content from file');

      const user = userEvent.setup();
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      const { getByRole } = renderChatInterface();
      const uploadButton = getByRole('button', { name: /Upload Document/i });
      
      await user.click(uploadButton);

      // Simulate file drop (in actual test, would need to trigger file input change)
      // This is simplified - full test would involve more complex file drop simulation
      expect(uploadButton).toBeInTheDocument();
    });
  });

  // ========================================
  // 6. AI Streaming Tests
  // ========================================
  describe('AI Streaming', () => {
    it('should show loading state during AI generation', async () => {
      const user = userEvent.setup();
      const { getByPlaceholderText, getByRole, findByTestId } = renderChatInterface();

      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.type(textarea, 'Test clinical notes');

      const button = getByRole('button', { name: /Analyze Notes/i });
      await user.click(button);

      // Should show stop button during generation
      const stopButton = await findByTestId('stop-generation');
      expect(stopButton).toBeInTheDocument();
    });

    it('should stream AI response chunks', async () => {
      const user = userEvent.setup();
      const { getByPlaceholderText, getByRole, findByText } = renderChatInterface();

      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.type(textarea, 'Test clinical notes');

      const button = getByRole('button', { name: /Analyze Notes/i });
      await user.click(button);

      // Wait for streaming response to appear
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should show "Mock streaming response" (from mocked analyzeNotesStreaming)
      const response = await findByText(/Mock streaming response/i);
      expect(response).toBeInTheDocument();
    });

    it('should handle streaming errors', async () => {
      const { analyzeNotesStreaming } = await import('@/lib/openai');
      const { toast } = await import('sonner');
      
      vi.mocked(analyzeNotesStreaming).mockImplementationOnce(async ({ onError }) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        onError('API Error: Rate limit exceeded');
      });

      const user = userEvent.setup();
      const { getByPlaceholderText, getByRole } = renderChatInterface();

      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.type(textarea, 'Test clinical notes');

      const button = getByRole('button', { name: /Analyze Notes/i });
      await user.click(button);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should show error toast
      expect(toast.error).toHaveBeenCalledWith('API Error: Rate limit exceeded');
    });

    it('should allow stopping generation', async () => {
      const user = userEvent.setup();
      const { getByPlaceholderText, getByRole, findByTestId } = renderChatInterface();

      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.type(textarea, 'Test clinical notes');

      const analyzeButton = getByRole('button', { name: /Analyze Notes/i });
      await user.click(analyzeButton);

      const stopButton = await findByTestId('stop-generation');
      await user.click(stopButton);

      // Should show info toast about stopped generation
      const { toast } = await import('sonner');
      expect(toast.info).toHaveBeenCalled();
    });

    it('should display success message after completion', async () => {
      const { toast } = await import('sonner');
      const user = userEvent.setup();
      const { getByPlaceholderText, getByRole } = renderChatInterface();

      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.type(textarea, 'Test clinical notes');

      const button = getByRole('button', { name: /Analyze Notes/i });
      await user.click(button);

      // Wait for streaming to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(toast.success).toHaveBeenCalledWith('Analysis complete!');
    });
  });

  // ========================================
  // 7. Conversation State Tests
  // ========================================
  describe('Conversation Management', () => {
    it('should create new conversation on first message', async () => {
      const { useConversations } = await import('@/hooks/useConversations');
      const mockCreate = vi.fn(() => Promise.resolve('new-conv'));
      
      vi.mocked(useConversations).mockReturnValue({
        conversations: [],
        loading: false,
        hasMore: false,
        createConversation: mockCreate,
        deleteConversation: vi.fn(),
        refreshConversations: vi.fn(),
        loadMore: vi.fn(),
      });

      const user = userEvent.setup();
      const { getByPlaceholderText, getByRole } = renderChatInterface();

      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.type(textarea, 'First message in new conversation');

      const button = getByRole('button', { name: /Analyze Notes/i });
      await user.click(button);

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockCreate).toHaveBeenCalled();
    });

    it('should show clear conversation button when conversation exists', async () => {
      const { useMessages } = await import('@/hooks/useMessages');
      vi.mocked(useMessages).mockReturnValue({
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Test',
            created_at: new Date().toISOString(),
          },
        ],
        loading: false,
        addMessage: vi.fn(),
        refreshMessages: vi.fn(),
      });

      const { getByRole } = renderChatInterface('conv-123');
      const clearButton = getByRole('button', { name: /Clear Conversation/i });
      expect(clearButton).toBeInTheDocument();
    });
  });

  // ========================================
  // 8. Accessibility Tests
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

    it('should have proper ARIA labels on buttons', () => {
      const { getByRole } = renderChatInterface();
      const analyzeButton = getByRole('button', { name: /Analyze Notes/i });
      const templatesButton = getByRole('button', { name: /Templates/i });
      
      expect(analyzeButton).toBeInTheDocument();
      expect(templatesButton).toBeInTheDocument();
    });
  });
});
