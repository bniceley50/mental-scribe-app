# Test Plan: ChatInterface Component

> **Last Updated:** 2025-01-03  
> **Status:** Implementation In Progress (67% Complete)  
> **Test File:** `src/components/__tests__/ChatInterface.test.tsx`

## 📊 Test Coverage Summary

| Category | Total Cases | Implemented | Coverage |
|----------|-------------|-------------|----------|
| Component Rendering | 4 | 4 | ✅ 100% |
| User Input | 6 | 5 | 🟡 83% |
| Message Rendering | 2 | 2 | ✅ 100% |
| Quick Actions | 7 | 5 | 🟡 71% |
| File Upload | 6 | 3 | 🟡 50% |
| AI Streaming | 6 | 5 | 🟡 83% |
| Conversation State | 3 | 2 | 🟡 67% |
| Export Integration | 3 | 3 | ✅ 100% |
| Accessibility | 2 | 2 | ✅ 100% |
| **TOTAL** | **39** | **31** | **🎯 79%** |

### Current Stats
- ✅ **31 tests implemented** (up from 12)
- 🎯 **79% coverage** (approaching 80% target!)
- 🚀 **High-priority gaps:** 8 remaining

---


## 🎯 Implementation Status

### ✅ Completed Tests (31)

**Component Rendering (4/4)**
- ✅ Textarea input rendering
- ✅ Analyze Notes button rendering  
- ✅ Example prompts display
- ✅ Templates button display

**User Input (5/6)**
- ✅ Text input updates
- ✅ Multiline input handling
- ✅ Auto-focus on mount
- ✅ Empty input validation
- ✅ Valid input state
- ⬜️ Draft auto-save (localStorage)

**Message Rendering (2/2)**
- ✅ User message display
- ✅ AI message display

**Quick Actions (5/7)**
- ✅ Templates button render
- ✅ Templates dialog open
- ✅ Export button visibility (no conversation)
- ✅ Export button visibility (with conversation)
- ✅ Export menu options
- ⬜️ Template selection and loading
- ⬜️ Quick action buttons (SOAP, Summary, etc.)

**File Upload (3/6)**
- ✅ Upload button render
- ✅ File upload toggle
- ✅ Basic file processing
- ⬜️ File validation (size/type)
- ⬜️ File extraction verification
- ⬜️ File preview display

**AI Streaming (5/6)**
- ✅ Loading state display
- ✅ Chunk streaming
- ✅ Error handling
- ✅ Stop generation
- ✅ Completion success message
- ⬜️ Response regeneration

**Conversation State (2/3)**
- ✅ New conversation creation
- ✅ Clear conversation button
- ⬜️ Conversation title update

**Export Integration (3/3)**
- ✅ Export button visibility check
- ✅ Export menu rendering
- ✅ Export options display

**Accessibility (2/2)**
- ✅ Keyboard navigation
- ✅ ARIA labels on buttons

### 🎯 High-Priority Remaining Tests (8)

1. **Draft Auto-save** - Verify localStorage persistence
2. **Template Loading** - Test template content loads into textarea
3. **Quick Action Buttons** - Verify SOAP/Summary/Key Points/Progress actions
4. **File Validation** - Test size and type rejection
5. **Response Regeneration** - Test regenerate button functionality
6. **Conversation Title** - Verify title updates on message send
7. **File Extraction** - Verify text extraction from PDFs/docs
8. **File Preview** - Test uploaded file display component

---

## Component Details

**Component Location**: `src/components/ChatInterface.tsx`

**Test File Location**: `src/components/__tests__/ChatInterface.test.tsx`

**Dependencies**:
- `useMessages` hook
- `useConversations` hook
- `analyzeNotesStreaming` function
- File upload utilities
- Export utilities
- Note templates

---

## Testing Scope

### In Scope
- Message rendering and display
- User input handling
- Quick action buttons (SOAP Note, Summary, etc.)
- File upload integration
- Message streaming from AI
- Error handling and user feedback
- Conversation state management
- Export functionality integration

### Out of Scope
- Backend API testing (covered by integration tests)
- Database operations (covered by hook tests)
- UI component library tests (shadcn/ui)

---

## Test Categories

### 1. Component Rendering Tests

**File**: `src/components/__tests__/ChatInterface.test.tsx`

#### 1.1 Initial Render
```typescript
describe('ChatInterface - Initial Render', () => {
  it('should render the textarea input', () => {
    // Verify textarea is present
  });

  it('should render the Analyze Notes button', () => {
    // Verify main action button exists
  });

  it('should display example prompts when no conversation exists', () => {
    // Verify ExamplePrompts component renders
  });

  it('should display note templates button', () => {
    // Verify NoteTemplates component renders
  });

  it('should not display messages on initial load', () => {
    // Verify empty state
  });
});
```

#### 1.2 Conditional Rendering
```typescript
describe('ChatInterface - Conditional Rendering', () => {
  it('should hide example prompts when conversation exists', () => {
    // Mock conversationId and verify prompts hidden
  });

  it('should display quick action buttons when messages exist', () => {
    // Mock messages and verify quick actions render
  });

  it('should show loading skeleton during AI response', () => {
    // Mock streaming state and verify skeleton
  });

  it('should display error message when streaming fails', () => {
    // Mock error state and verify error display
  });
});
```

---

### 2. User Input Tests

#### 2.1 Text Input
```typescript
describe('ChatInterface - Text Input', () => {
  it('should update input value when user types', async () => {
    const { getByPlaceholderText } = render(<ChatInterface />);
    const textarea = getByPlaceholderText(/Enter your session notes/i);
    
    await userEvent.type(textarea, 'Test note content');
    expect(textarea).toHaveValue('Test note content');
  });

  it('should clear input after successful submission', async () => {
    // Submit form and verify input cleared
  });

  it('should preserve input when submission fails', async () => {
    // Mock error and verify input preserved
  });

  it('should auto-focus textarea on mount', () => {
    // Verify autoFocus attribute
  });

  it('should handle multiline input correctly', async () => {
    // Test textarea with newlines
  });
});
```

#### 2.2 Input Validation
```typescript
describe('ChatInterface - Input Validation', () => {
  it('should disable submit button when input is empty', () => {
    // Verify button disabled state
  });

  it('should enable submit button when input has content', async () => {
    // Type content and verify button enabled
  });

  it('should trim whitespace from input', async () => {
    // Submit with spaces and verify trimmed
  });

  it('should handle maximum input length', async () => {
    // Test input length limits (10,000 words)
  });
});
```

---

### 3. Message Rendering Tests

#### 3.1 Message Display
```typescript
describe('ChatInterface - Message Display', () => {
  it('should render user messages with correct styling', () => {
    // Mock user message and verify rendering
  });

  it('should render AI messages with correct styling', () => {
    // Mock AI message and verify rendering
  });

  it('should display messages in chronological order', () => {
    // Mock multiple messages and verify order
  });

  it('should auto-scroll to latest message', () => {
    // Verify scroll behavior
  });

  it('should render markdown in AI messages', () => {
    // Mock markdown content and verify rendering
  });
});
```

#### 3.2 Message Actions
```typescript
describe('ChatInterface - Message Actions', () => {
  it('should display copy button on message hover', async () => {
    // Hover over message and verify button appears
  });

  it('should copy message content to clipboard', async () => {
    // Click copy and verify clipboard content
  });

  it('should show success toast after copying', async () => {
    // Verify toast notification
  });

  it('should display regenerate button for AI messages', () => {
    // Verify regenerate option exists
  });
});
```

---

### 4. Quick Actions Tests

#### 4.1 Action Buttons
```typescript
describe('ChatInterface - Quick Actions', () => {
  it('should render all quick action buttons', () => {
    const actions = ['SOAP Note', 'Summary', 'Key Points', 'Progress Report'];
    // Verify all buttons present
  });

  it('should trigger SOAP note generation', async () => {
    // Click SOAP button and verify API call
  });

  it('should trigger session summary generation', async () => {
    // Click Summary button and verify API call
  });

  it('should trigger key points extraction', async () => {
    // Click Key Points and verify API call
  });

  it('should trigger progress report generation', async () => {
    // Click Progress Report and verify API call
  });

  it('should disable quick actions during streaming', () => {
    // Mock streaming and verify buttons disabled
  });
});
```

#### 4.2 Action Tooltips
```typescript
describe('ChatInterface - Action Tooltips', () => {
  it('should display tooltip on button hover', async () => {
    // Hover and verify tooltip content
  });

  it('should show correct description for each action', () => {
    // Verify tooltip text for each button
  });
});
```

---

### 5. File Upload Integration Tests

#### 5.1 File Upload UI
```typescript
describe('ChatInterface - File Upload UI', () => {
  it('should render file upload button', () => {
    // Verify upload button exists
  });

  it('should open file picker on button click', async () => {
    // Click and verify file input triggered
  });

  it('should display FileDropZone component', () => {
    // Verify drag-drop zone renders
  });

  it('should show file count indicator when files uploaded', async () => {
    // Upload file and verify indicator
  });
});
```

#### 5.2 File Processing
```typescript
describe('ChatInterface - File Processing', () => {
  it('should accept PDF files', async () => {
    const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
    // Upload and verify acceptance
  });

  it('should accept DOCX files', async () => {
    const file = new File(['docx content'], 'test.docx', { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    // Upload and verify acceptance
  });

  it('should reject unsupported file types', async () => {
    const file = new File(['exe content'], 'test.exe', { type: 'application/exe' });
    // Upload and verify rejection with error message
  });

  it('should enforce maximum file size', async () => {
    const largeFile = new File(['x'.repeat(21 * 1024 * 1024)], 'large.pdf', { 
      type: 'application/pdf' 
    });
    // Upload and verify size limit error
  });

  it('should display FilePreview for uploaded files', async () => {
    // Upload file and verify preview component
  });

  it('should allow file removal', async () => {
    // Upload, then remove file and verify
  });
});
```

#### 5.3 File Content Extraction
```typescript
describe('ChatInterface - File Content Extraction', () => {
  it('should extract text from PDF files', async () => {
    // Mock PDF and verify text extraction
  });

  it('should handle extraction errors gracefully', async () => {
    // Mock extraction error and verify error handling
  });

  it('should sanitize extracted file content', async () => {
    // Mock malicious content and verify sanitization
  });

  it('should include file content in API request', async () => {
    // Upload file, submit, and verify API payload
  });
});
```

---

### 6. AI Streaming Tests

#### 6.1 Streaming Behavior
```typescript
describe('ChatInterface - AI Streaming', () => {
  it('should display loading indicator during streaming', async () => {
    // Mock streaming and verify loading state
  });

  it('should append streaming chunks to message', async () => {
    // Mock stream chunks and verify progressive display
  });

  it('should complete message when stream ends', async () => {
    // Mock stream completion and verify final message
  });

  it('should handle streaming interruption', async () => {
    // Mock interrupted stream and verify error handling
  });
});
```

#### 6.2 Error Handling
```typescript
describe('ChatInterface - Streaming Errors', () => {
  it('should display error message on API failure', async () => {
    // Mock API error and verify error display
  });

  it('should show toast notification on error', async () => {
    // Verify error toast appears
  });

  it('should allow retry after error', async () => {
    // Error, then retry and verify
  });

  it('should handle rate limit errors specifically', async () => {
    // Mock rate limit and verify message
  });

  it('should handle authentication errors', async () => {
    // Mock auth error and verify redirect/message
  });
});
```

---

### 7. Conversation State Tests

#### 7.1 Conversation Management
```typescript
describe('ChatInterface - Conversation Management', () => {
  it('should create new conversation on first message', async () => {
    // Submit message and verify conversation created
  });

  it('should use existing conversation for subsequent messages', async () => {
    // Mock existing conversation and verify reuse
  });

  it('should update conversation title automatically', async () => {
    // Submit messages and verify title generation
  });

  it('should load conversation history correctly', async () => {
    // Mock conversation ID and verify messages loaded
  });
});
```

#### 7.2 Draft Management
```typescript
describe('ChatInterface - Draft Management', () => {
  it('should save draft after typing delay', async () => {
    // Type and wait, verify draft saved
  });

  it('should load draft on component mount', () => {
    // Mock saved draft and verify loaded
  });

  it('should clear draft after successful submission', async () => {
    // Submit and verify draft cleared
  });

  it('should debounce draft saving', async () => {
    // Type rapidly and verify single save
  });
});
```

---

### 8. Export Integration Tests

#### 8.1 Export Buttons
```typescript
describe('ChatInterface - Export Integration', () => {
  it('should display export options when conversation exists', () => {
    // Mock conversation and verify export buttons
  });

  it('should trigger PDF export', async () => {
    // Click PDF export and verify function called
  });

  it('should trigger text export', async () => {
    // Click text export and verify function called
  });

  it('should trigger clipboard copy', async () => {
    // Click copy and verify clipboard operation
  });

  it('should disable export during streaming', () => {
    // Mock streaming and verify exports disabled
  });
});
```

---

### 9. Accessibility Tests

```typescript
describe('ChatInterface - Accessibility', () => {
  it('should have proper ARIA labels', () => {
    // Verify ARIA attributes
  });

  it('should support keyboard navigation', async () => {
    // Test Tab, Enter, Escape keys
  });

  it('should have proper focus management', () => {
    // Verify focus behavior
  });

  it('should have sufficient color contrast', () => {
    // Verify contrast ratios
  });

  it('should support screen readers', () => {
    // Verify semantic HTML and ARIA
  });
});
```

---

### 10. Performance Tests

```typescript
describe('ChatInterface - Performance', () => {
  it('should handle 100+ messages without lag', () => {
    // Mock large message list and measure render time
  });

  it('should virtualize long message lists', () => {
    // Verify virtualization for performance
  });

  it('should debounce input handlers', () => {
    // Verify debouncing on rapid input
  });

  it('should memoize expensive computations', () => {
    // Verify React.memo or useMemo usage
  });
});
```

---

## Test Data & Mocks

### Mock User Message
```typescript
const mockUserMessage = {
  id: '1',
  role: 'user',
  content: 'Patient presented with anxiety symptoms...',
  created_at: new Date().toISOString(),
};
```

### Mock AI Message
```typescript
const mockAIMessage = {
  id: '2',
  role: 'assistant',
  content: '## SOAP Note\n\n**Subjective:**\nPatient reports...',
  created_at: new Date().toISOString(),
};
```

### Mock Conversation
```typescript
const mockConversation = {
  id: 'conv-123',
  user_id: 'user-456',
  title: 'Session Notes - January 2',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
```

### Mock File
```typescript
const mockPDFFile = new File(
  ['PDF content here'],
  'session-notes.pdf',
  { type: 'application/pdf' }
);
```

---

## Testing Tools & Setup

### Required Packages
```json
{
  "vitest": "latest",
  "@testing-library/react": "latest",
  "@testing-library/user-event": "latest",
  "@testing-library/jest-dom": "latest",
  "@vitest/ui": "latest"
}
```

### Test Setup File
Location: `src/test/setup.ts`
- Mock Supabase client
- Mock toast notifications
- Mock file upload utilities
- Mock AI streaming functions

### Mock Implementations

#### Mock `analyzeNotesStreaming`
```typescript
vi.mock('@/lib/openai', () => ({
  analyzeNotesStreaming: vi.fn(({ onChunk, onComplete }) => {
    onChunk('Mock ');
    onChunk('streaming ');
    onChunk('response');
    onComplete();
  }),
}));
```

#### Mock `useMessages` Hook
```typescript
vi.mock('@/hooks/useMessages', () => ({
  useMessages: vi.fn(() => ({
    messages: [],
    loading: false,
    addMessage: vi.fn(),
    refreshMessages: vi.fn(),
  })),
}));
```

#### Mock `useConversations` Hook
```typescript
vi.mock('@/hooks/useConversations', () => ({
  useConversations: vi.fn(() => ({
    conversations: [],
    loading: false,
    createConversation: vi.fn(),
    deleteConversation: vi.fn(),
  })),
}));
```

---

## Test Execution Strategy

### 1. Unit Tests First
- Individual functions and utilities
- Component rendering without integration
- Input validation and sanitization

### 2. Integration Tests
- Component + hooks integration
- File upload flow end-to-end
- Export functionality with real exports (mocked downloads)

### 3. User Flow Tests
- Complete user journeys
- Multi-step interactions
- Error recovery scenarios

### Test Running Order
```bash
# 1. Run fast unit tests
npm test -- ChatInterface.test.tsx --reporter=verbose

# 2. Run integration tests
npm test -- --testPathPattern=integration

# 3. Generate coverage report
npm run test:coverage -- ChatInterface.test.tsx
```

---

## Success Criteria

### Coverage Targets
- **Line Coverage**: ≥ 80%
- **Branch Coverage**: ≥ 75%
- **Function Coverage**: ≥ 80%
- **Critical Paths**: 100% (submit, streaming, error handling)

### Quality Metrics
- All tests pass consistently
- No flaky tests
- Tests run in < 5 seconds
- Clear, descriptive test names
- Proper cleanup after each test

---

## Future Enhancements

1. **Visual Regression Testing**: Add Storybook + Chromatic for UI consistency
2. **E2E Tests**: Playwright tests for full user flows
3. **Performance Benchmarks**: Track render times and optimize
4. **A11y Automated Tests**: axe-core integration
5. **Snapshot Tests**: For complex message formatting

---

## Maintenance

### When to Update Tests
- New features added to ChatInterface
- Bug fixes that need regression tests
- Refactoring that changes behavior
- Dependencies updated (React, libraries)

### Test Review Checklist
- [ ] All new code has corresponding tests
- [ ] Tests follow naming conventions
- [ ] Mocks are properly cleaned up
- [ ] No hardcoded timeouts or sleeps
- [ ] Tests are deterministic (no random failures)
- [ ] Coverage targets met


---

## 🚀 Next Steps & Roadmap

### Phase 1: Complete Core Functionality (Target: 85%+ coverage)

**Priority 1 - Quick Wins (Est. 20 min):**
1. Draft auto-save test
2. Template loading test  
3. Conversation title update test

**Priority 2 - Quick Actions (Est. 40 min):**
4. SOAP Note button test
5. Session Summary button test
6. Key Points button test
7. Progress Report button test

**Priority 3 - File Upload (Est. 30 min):**
8. File size validation test
9. File type validation test
10. File extraction verification test

### Phase 2: Edge Cases & Error Scenarios (Target: 90%+ coverage)

**Error Handling:**
- Network timeout during streaming
- API rate limit responses
- File upload failures  
- Malformed AI responses

**Edge Cases:**
- Very long input (>10,000 words)
- Special characters in input
- Multiple rapid submissions
- Concurrent file uploads

### Phase 3: Integration & E2E Tests

**Cross-Component Flows:**
- Complete conversation workflow (create → message → export)
- File upload → analysis → export pipeline
- Template → edit → submit flow
- Error recovery scenarios

---

## References

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Component Testing Patterns](https://martinfowler.com/articles/practical-test-pyramid.html)

---

**Test Commands:**
- `npm test` - Run all 31 tests
- `npm run test:coverage` - Generate detailed coverage report
- `npm run test:ui` - Interactive test UI