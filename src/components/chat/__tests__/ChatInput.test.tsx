import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '../ChatInput';

// Mock dependencies
vi.mock('@/components/VoiceInput', () => ({
  VoiceInput: ({ onResult, disabled }: any) => (
    <button disabled={disabled} onClick={() => onResult('voice text')}>
      Voice Input
    </button>
  ),
}));

vi.mock('@/components/SpeakButton', () => ({
  SpeakButton: ({ text, disabled }: any) => (
    <button disabled={disabled}>Speak: {text}</button>
  ),
}));

vi.mock('@/components/ExamplePrompts', () => ({
  ExamplePrompts: ({ onSelectExample, disabled }: any) => (
    <div>
      <button disabled={disabled} onClick={() => onSelectExample('Example prompt')}>
        Try an example
      </button>
    </div>
  ),
}));

vi.mock('@/components/clients/ClientSelector', () => ({
  ClientSelector: ({ value, onChange }: any) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select Client</option>
      <option value="client-1">Client 1</option>
    </select>
  ),
}));

describe('ChatInput', () => {
  const defaultProps = {
    input: '',
    onInputChange: vi.fn(),
    onSubmit: vi.fn(),
    onClear: vi.fn(),
    loading: false,
    conversationId: null,
    showExamples: false,
    onSelectExample: vi.fn(),
    isPart2Protected: false,
    onPart2Change: vi.fn(),
    selectedClientId: '',
    onClientChange: vi.fn(),
    showFileUpload: false,
    onToggleFileUpload: vi.fn(),
    onStopGeneration: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render textarea input', () => {
      const { getByPlaceholderText } = render(<ChatInput {...defaultProps} />);
      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      expect(textarea).toBeInTheDocument();
    });

    it('should render Analyze Notes button', () => {
      const { getByRole } = render(<ChatInput {...defaultProps} />);
      const button = getByRole('button', { name: /Analyze Notes/i });
      expect(button).toBeInTheDocument();
    });

    it('should show example prompts when showExamples is true', () => {
      const { getByText } = render(<ChatInput {...defaultProps} showExamples={true} />);
      expect(getByText(/Try an example/i)).toBeInTheDocument();
    });

    it('should not show example prompts when showExamples is false', () => {
      const { queryByText } = render(<ChatInput {...defaultProps} showExamples={false} />);
      expect(queryByText(/Try an example/i)).not.toBeInTheDocument();
    });
  });

  describe('Text Input', () => {
    it('should call onInputChange when user types', async () => {
      const user = userEvent.setup();
      const onInputChange = vi.fn();
      const { getByPlaceholderText } = render(
        <ChatInput {...defaultProps} onInputChange={onInputChange} />
      );

      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.type(textarea, 'Test note');

      expect(onInputChange).toHaveBeenCalled();
    });

    it('should display current input value', () => {
      const { getByPlaceholderText } = render(
        <ChatInput {...defaultProps} input="Test content" />
      );
      const textarea = getByPlaceholderText(/Enter your session notes here/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe('Test content');
    });

    it('should auto-focus textarea on mount', () => {
      const { getByPlaceholderText } = render(<ChatInput {...defaultProps} />);
      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      expect(textarea).toHaveAttribute('autoFocus');
    });

    it('should handle Ctrl+Enter to submit', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const { getByPlaceholderText } = render(
        <ChatInput {...defaultProps} input="Test" onSubmit={onSubmit} />
      );

      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      await user.click(textarea);
      await user.keyboard('{Control>}{Enter}{/Control}');

      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    it('should disable submit button when input is empty', () => {
      const { getByRole } = render(<ChatInput {...defaultProps} input="" />);
      const button = getByRole('button', { name: /Analyze Notes/i });
      expect(button).toBeDisabled();
    });

    it('should enable submit button when input has content', () => {
      const { getByRole } = render(<ChatInput {...defaultProps} input="Test content" />);
      const button = getByRole('button', { name: /Analyze Notes/i });
      expect(button).not.toBeDisabled();
    });

    it('should disable all inputs when loading', () => {
      const { getByRole, getByPlaceholderText } = render(
        <ChatInput {...defaultProps} input="Test" loading={true} />
      );
      const textarea = getByPlaceholderText(/Enter your session notes here/i);
      const button = getByRole('button', { name: /Analyzing/i });
      
      expect(textarea).toBeDisabled();
      expect(button).toBeDisabled();
    });
  });

  describe('Character Count', () => {
    it('should display character count when input has content', () => {
      const { getByText } = render(<ChatInput {...defaultProps} input="Test content here" />);
      expect(getByText(/18 characters/i)).toBeInTheDocument();
    });

    it('should display word count when input has content', () => {
      const { getByText } = render(<ChatInput {...defaultProps} input="Test content here" />);
      expect(getByText(/3 words/i)).toBeInTheDocument();
    });

    it('should show estimated processing time', () => {
      const longInput = 'word '.repeat(100); // 100 words
      const { getByText } = render(<ChatInput {...defaultProps} input={longInput} />);
      expect(getByText(/processing time/i)).toBeInTheDocument();
    });
  });

  describe('Part 2 Protection', () => {
    it('should show Part 2 checkbox when no conversation exists', () => {
      const { getByLabelText } = render(<ChatInput {...defaultProps} conversationId={null} />);
      const checkbox = getByLabelText(/substance use disorder treatment/i);
      expect(checkbox).toBeInTheDocument();
    });

    it('should not show Part 2 checkbox when conversation exists', () => {
      const { queryByLabelText } = render(<ChatInput {...defaultProps} conversationId="conv-1" />);
      const checkbox = queryByLabelText(/substance use disorder treatment/i);
      expect(checkbox).not.toBeInTheDocument();
    });

    it('should call onPart2Change when checkbox is toggled', async () => {
      const user = userEvent.setup();
      const onPart2Change = vi.fn();
      const { getByLabelText } = render(
        <ChatInput {...defaultProps} onPart2Change={onPart2Change} />
      );

      const checkbox = getByLabelText(/substance use disorder treatment/i);
      await user.click(checkbox);

      expect(onPart2Change).toHaveBeenCalledWith(true);
    });
  });

  describe('Client Selection', () => {
    it('should show client selector when no conversation exists', () => {
      const { getByRole } = render(<ChatInput {...defaultProps} conversationId={null} />);
      const select = getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should not show client selector when conversation exists', () => {
      const { queryByRole } = render(<ChatInput {...defaultProps} conversationId="conv-1" />);
      const select = queryByRole('combobox');
      expect(select).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should call onToggleFileUpload when upload button is clicked', async () => {
      const user = userEvent.setup();
      const onToggleFileUpload = vi.fn();
      const { getByRole } = render(
        <ChatInput {...defaultProps} onToggleFileUpload={onToggleFileUpload} />
      );

      const button = getByRole('button', { name: /Upload Document/i });
      await user.click(button);

      expect(onToggleFileUpload).toHaveBeenCalled();
    });

    it('should call onClear when clear button is clicked', async () => {
      const user = userEvent.setup();
      const onClear = vi.fn();
      const { getByRole } = render(
        <ChatInput {...defaultProps} input="Test" onClear={onClear} />
      );

      const button = getByRole('button', { name: /Clear/i });
      await user.click(button);

      expect(onClear).toHaveBeenCalled();
    });

    it('should disable clear button when input is empty', () => {
      const { getByRole } = render(<ChatInput {...defaultProps} input="" />);
      const button = getByRole('button', { name: /Clear/i });
      expect(button).toBeDisabled();
    });

    it('should show stop button when loading', () => {
      const { getByTestId } = render(<ChatInput {...defaultProps} loading={true} />);
      const stopButton = getByTestId('stop-generation');
      expect(stopButton).toBeInTheDocument();
    });

    it('should call onStopGeneration when stop button is clicked', async () => {
      const user = userEvent.setup();
      const onStopGeneration = vi.fn();
      const { getByTestId } = render(
        <ChatInput {...defaultProps} loading={true} onStopGeneration={onStopGeneration} />
      );

      const stopButton = getByTestId('stop-generation');
      await user.click(stopButton);

      expect(onStopGeneration).toHaveBeenCalled();
    });
  });

  describe('Draft Auto-save Badge', () => {
    it('should show draft auto-saved badge when no conversation exists', () => {
      const { getByText } = render(
        <ChatInput {...defaultProps} input="Test" conversationId={null} />
      );
      expect(getByText(/Draft auto-saved/i)).toBeInTheDocument();
    });

    it('should not show draft badge when conversation exists', () => {
      const { queryByText } = render(
        <ChatInput {...defaultProps} input="Test" conversationId="conv-1" />
      );
      expect(queryByText(/Draft auto-saved/i)).not.toBeInTheDocument();
    });
  });

  describe('Voice Input', () => {
    it('should integrate voice input correctly', async () => {
      const user = userEvent.setup();
      const onInputChange = vi.fn();
      const { getByRole } = render(
        <ChatInput {...defaultProps} onInputChange={onInputChange} />
      );

      const voiceButton = getByRole('button', { name: /Voice Input/i });
      await user.click(voiceButton);

      expect(onInputChange).toHaveBeenCalledWith('voice text');
    });
  });
});
