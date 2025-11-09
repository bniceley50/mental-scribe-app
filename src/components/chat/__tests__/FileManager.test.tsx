import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileManager } from '../FileManager';

// Mock dependencies
vi.mock('@/components/FileDropZone', () => ({
  FileDropZone: ({ onFileSelect, disabled }: any) => (
    <div>
      <button
        onClick={() => {
          const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
          onFileSelect(file);
        }}
        disabled={disabled}
      >
        Drop files here
      </button>
    </div>
  ),
}));

vi.mock('@/components/FilePreview', () => ({
  FilePreview: ({ file, onDelete, onAnalyze }: any) => (
    <div>
      <span>{file.file_name}</span>
      <button onClick={() => onDelete(file.id)}>Delete</button>
      <button onClick={() => onAnalyze(file.processed_content, file.file_name)}>
        Analyze
      </button>
    </div>
  ),
}));

describe('FileManager', () => {
  const mockFile = {
    id: 'file-1',
    file_name: 'test-document.pdf',
    file_type: 'pdf',
    file_url: 'https://example.com/test.pdf',
    processed_content: 'This is the extracted content from the PDF file.',
  };

  const defaultProps = {
    uploadedFiles: [],
    showFileUpload: false,
    loading: false,
    onFileSelect: vi.fn(),
    onDeleteFile: vi.fn(),
    onAnalyzeFile: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render uploaded files section when no files exist', () => {
      const { queryByText } = render(<FileManager {...defaultProps} />);
      expect(queryByText(/Uploaded Documents/i)).not.toBeInTheDocument();
    });

    it('should render uploaded files section when files exist', () => {
      const { getByText } = render(
        <FileManager {...defaultProps} uploadedFiles={[mockFile]} />
      );
      expect(getByText(/Uploaded Documents \(1\)/i)).toBeInTheDocument();
    });

    it('should display correct file count', () => {
      const files = [mockFile, { ...mockFile, id: 'file-2', file_name: 'doc2.pdf' }];
      const { getByText } = render(<FileManager {...defaultProps} uploadedFiles={files} />);
      expect(getByText(/Uploaded Documents \(2\)/i)).toBeInTheDocument();
    });

    it('should render file names', () => {
      const { getByText } = render(
        <FileManager {...defaultProps} uploadedFiles={[mockFile]} />
      );
      expect(getByText('test-document.pdf')).toBeInTheDocument();
    });

    it('should not show file drop zone when showFileUpload is false', () => {
      const { queryByText } = render(
        <FileManager {...defaultProps} showFileUpload={false} />
      );
      expect(queryByText(/Drop files here/i)).not.toBeInTheDocument();
    });

    it('should show file drop zone when showFileUpload is true', () => {
      const { getByText } = render(<FileManager {...defaultProps} showFileUpload={true} />);
      expect(getByText(/Drop files here/i)).toBeInTheDocument();
    });
  });

  describe('File Operations', () => {
    it('should call onFileSelect when file is selected', async () => {
      const user = userEvent.setup();
      const onFileSelect = vi.fn();
      const { getByRole } = render(
        <FileManager {...defaultProps} showFileUpload={true} onFileSelect={onFileSelect} />
      );

      const dropButton = getByRole('button', { name: /Drop files here/i });
      await user.click(dropButton);

      expect(onFileSelect).toHaveBeenCalled();
      expect(onFileSelect.mock.calls[0][0]).toBeInstanceOf(File);
    });

    it('should call onDeleteFile when delete button is clicked', async () => {
      const user = userEvent.setup();
      const onDeleteFile = vi.fn();
      const { getByRole } = render(
        <FileManager {...defaultProps} uploadedFiles={[mockFile]} onDeleteFile={onDeleteFile} />
      );

      const deleteButton = getByRole('button', { name: /Delete/i });
      await user.click(deleteButton);

      expect(onDeleteFile).toHaveBeenCalledWith('file-1');
    });

    it('should call onAnalyzeFile when analyze button is clicked', async () => {
      const user = userEvent.setup();
      const onAnalyzeFile = vi.fn();
      const { getByRole } = render(
        <FileManager
          {...defaultProps}
          uploadedFiles={[mockFile]}
          onAnalyzeFile={onAnalyzeFile}
        />
      );

      const analyzeButton = getByRole('button', { name: /Analyze/i });
      await user.click(analyzeButton);

      expect(onAnalyzeFile).toHaveBeenCalledWith(
        'This is the extracted content from the PDF file.',
        'test-document.pdf'
      );
    });
  });

  describe('Multiple Files', () => {
    it('should render multiple file previews', () => {
      const files = [
        mockFile,
        { ...mockFile, id: 'file-2', file_name: 'document2.pdf' },
        { ...mockFile, id: 'file-3', file_name: 'document3.txt' },
      ];
      const { getByText } = render(<FileManager {...defaultProps} uploadedFiles={files} />);

      expect(getByText('test-document.pdf')).toBeInTheDocument();
      expect(getByText('document2.pdf')).toBeInTheDocument();
      expect(getByText('document3.txt')).toBeInTheDocument();
    });

    it('should handle delete operations on specific files', async () => {
      const user = userEvent.setup();
      const onDeleteFile = vi.fn();
      const files = [
        mockFile,
        { ...mockFile, id: 'file-2', file_name: 'document2.pdf' },
      ];
      const { getAllByRole } = render(
        <FileManager {...defaultProps} uploadedFiles={files} onDeleteFile={onDeleteFile} />
      );

      const deleteButtons = getAllByRole('button', { name: /Delete/i });
      await user.click(deleteButtons[1]);

      expect(onDeleteFile).toHaveBeenCalledWith('file-2');
    });
  });

  describe('Loading State', () => {
    it('should disable file upload when loading', () => {
      const { getByRole } = render(
        <FileManager {...defaultProps} showFileUpload={true} loading={true} />
      );

      const dropButton = getByRole('button', { name: /Drop files here/i });
      expect(dropButton).toBeDisabled();
    });

    it('should enable file upload when not loading', () => {
      const { getByRole } = render(
        <FileManager {...defaultProps} showFileUpload={true} loading={false} />
      );

      const dropButton = getByRole('button', { name: /Drop files here/i });
      expect(dropButton).not.toBeDisabled();
    });
  });

  describe('Empty States', () => {
    it('should render nothing when no files and upload zone hidden', () => {
      const { container } = render(
        <FileManager {...defaultProps} uploadedFiles={[]} showFileUpload={false} />
      );
      expect(container.firstChild?.childNodes.length).toBe(0);
    });
  });
});
