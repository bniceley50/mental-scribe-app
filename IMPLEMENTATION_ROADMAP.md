# Technical Debt Remediation - Implementation Roadmap

**Project**: Mental Scribe App  
**Version**: 1.1.0  
**Roadmap Created**: October 21, 2025  
**Status**: In Progress

---

## Overview

This document provides a detailed, actionable roadmap for addressing the technical debt identified in [TECHNICAL_DEBT_ANALYSIS.md](TECHNICAL_DEBT_ANALYSIS.md). Each item includes specific steps, code examples, and acceptance criteria.

---

## Progress Tracker

### Quick Wins (Completed) ✅
- [x] Fixed npm audit vulnerabilities (critical libxmljs2)
- [x] Removed deprecated @types/dompurify
- [x] Updated .env.example with comprehensive docs
- [x] Removed Windows-specific platform packages
- [x] Strengthened ESLint rules
- [x] Fixed React hook dependency warnings

### Phase 1: Critical & High Priority (In Progress)
- [ ] Address remaining npm audit vulnerabilities
- [ ] Improve TypeScript configuration
- [ ] Fix explicit `any` types in source code
- [ ] Remove console statements from production code
- [ ] Add package.json scripts for developer workflow

### Phase 2: Medium Priority (Planned)
- [ ] Refactor ChatInterface.tsx
- [ ] Refactor StructuredNoteForm.tsx
- [ ] Standardize error handling
- [ ] Enhance accessibility features
- [ ] Add component unit tests

### Phase 3: Low Priority (Backlog)
- [ ] Implement Zustand state management
- [ ] Performance optimizations
- [ ] Pre-commit hooks setup
- [ ] JSDoc documentation
- [ ] Bundle size analysis

---

## Phase 1: Critical & High Priority

### 1.1 Address Remaining npm Vulnerabilities

**Status**: ⏳ Pending  
**Priority**: 🔴 CRITICAL  
**Effort**: 30 minutes  
**Owner**: DevOps/Backend

**Current State**:
```
2 moderate severity vulnerabilities remain:
- esbuild <=0.24.2 (GHSA-67mh-4wv8-2f99)
- Requires vite@7.1.11 (breaking change)
```

**Tasks**:
1. Review Vite 7 breaking changes documentation
2. Test with `npm audit fix --force`
3. Run full test suite to verify compatibility
4. Update vite.config.ts if needed
5. Document any breaking changes in CHANGELOG.md

**Acceptance Criteria**:
- [ ] `npm audit` reports 0 vulnerabilities
- [ ] All tests pass
- [ ] Application builds successfully
- [ ] Dev server runs without errors

**Commands**:
```bash
# Backup current state
git checkout -b vite-upgrade

# Try forced upgrade
npm audit fix --force

# Test
npm run build
npm test
npm run dev

# If successful, commit
git add package.json package-lock.json
git commit -m "fix: upgrade vite to address esbuild vulnerability"
```

---

### 1.2 Improve TypeScript Configuration

**Status**: ⏳ Pending  
**Priority**: 🔴 HIGH  
**Effort**: 3-5 days (incremental)  
**Owner**: Frontend Team

**Current State**:
```typescript
// tsconfig.json - Current (too permissive)
{
  "noImplicitAny": false,
  "noUnusedParameters": false,
  "noUnusedLocals": false,
  "strictNullChecks": false
}
```

**Implementation Strategy**:

#### Phase 1.2.1: Enable Warnings (Day 1)
```typescript
// tsconfig.json - Step 1
{
  "noImplicitAny": true,      // Enable with errors
  "noUnusedParameters": false, // Keep off for now
  "noUnusedLocals": false,    // Keep off for now
  "strictNullChecks": false   // Keep off for now
}
```

**Tasks**:
1. Update tsconfig.json
2. Run `npm run type-check` to see all errors
3. Create spreadsheet/issue list of all type errors
4. Prioritize by file/module
5. Fix 10-20 errors per day

**Example Fixes**:
```typescript
// Before (implicit any)
function handleData(data) {
  return data.map(item => item.value);
}

// After (explicit types)
interface DataItem {
  value: string;
}

function handleData(data: DataItem[]): string[] {
  return data.map(item => item.value);
}
```

#### Phase 1.2.2: Enable Strict Null Checks (Week 2)
```typescript
// tsconfig.json - Step 2
{
  "noImplicitAny": true,
  "noUnusedParameters": true,
  "noUnusedLocals": true,
  "strictNullChecks": true
}
```

**Acceptance Criteria**:
- [ ] `noImplicitAny: true` with 0 errors
- [ ] `strictNullChecks: true` enabled
- [ ] All files have proper type annotations
- [ ] Type coverage > 95%

---

### 1.3 Fix Explicit `any` Types

**Status**: ⏳ Pending  
**Priority**: 🔴 HIGH  
**Effort**: 2-3 days  
**Owner**: Frontend Team

**Current State**: 56 instances of explicit `any` types

**Priority Files** (most impactful):
1. `src/components/ChatInterface.tsx` - 3 instances
2. `src/components/VoiceInput.tsx` - 6 instances
3. `src/components/clients/ClientDialog.tsx` - 3 instances
4. Security test files - 38 instances (can use `unknown` for tests)

**Implementation Approach**:

#### Example 1: VoiceInput.tsx
```typescript
// Before
const SpeechRecognition = (window as any).SpeechRecognition || 
                         (window as any).webkitSpeechRecognition;

// After - Create proper type definition
interface WindowWithSpeech extends Window {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
}

const windowWithSpeech = window as WindowWithSpeech;
const SpeechRecognition = windowWithSpeech.SpeechRecognition || 
                         windowWithSpeech.webkitSpeechRecognition;
```

#### Example 2: Event Handlers
```typescript
// Before
const handleEvent = (e: any) => {
  console.log(e.target.value);
};

// After
const handleEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
  console.log(e.target.value);
};
```

#### Example 3: API Responses
```typescript
// Before
const response: any = await fetch('/api/data');

// After
interface ApiResponse {
  data: DataItem[];
  status: string;
  message?: string;
}

const response: ApiResponse = await fetch('/api/data').then(r => r.json());
```

**Tasks**:
1. Create `src/types/global.d.ts` for browser API extensions
2. Create `src/types/api.ts` for API response types
3. Fix all source file `any` types (skip test files initially)
4. Run `npm run lint` to verify
5. Create separate PR for test file types

**Acceptance Criteria**:
- [ ] 0 `any` types in `src/components/`
- [ ] 0 `any` types in `src/lib/`
- [ ] 0 `any` types in `src/pages/`
- [ ] Proper type definitions in `src/types/`
- [ ] Test files can use `unknown` for now

---

### 1.4 Remove Console Statements

**Status**: ⏳ Pending  
**Priority**: 🟡 MEDIUM  
**Effort**: 4-6 hours  
**Owner**: Frontend Team

**Current State**: ~40 console.log/warn statements in source code

**Implementation Strategy**:

#### Create Logging Utility
```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = import.meta.env.MODE === 'development';
  
  private log(level: LogLevel, message: string, data?: unknown) {
    if (!this.isDevelopment && level === 'debug') {
      return; // Skip debug logs in production
    }
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'error':
        console.error(prefix, message, data);
        // TODO: Send to error tracking service
        break;
      case 'warn':
        console.warn(prefix, message, data);
        break;
      case 'info':
      case 'debug':
        if (this.isDevelopment) {
          console.log(prefix, message, data);
        }
        break;
    }
  }
  
  debug(message: string, data?: unknown) {
    this.log('debug', message, data);
  }
  
  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }
  
  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }
  
  error(message: string, error?: unknown) {
    this.log('error', message, error);
  }
}

export const logger = new Logger();
```

#### Replace Console Statements
```typescript
// Before
console.log("StructuredNoteForm: Auto-save triggered");

// After
import { logger } from '@/lib/logger';
logger.debug("StructuredNoteForm: Auto-save triggered");
```

**Tasks**:
1. Create `src/lib/logger.ts`
2. Find all console statements: `grep -rn "console\." src/`
3. Replace with appropriate logger method
4. Remove development-only logs
5. Verify ESLint no longer warns

**Files to Update** (priority order):
1. src/components/StructuredNoteForm.tsx - 3 statements
2. src/components/VoiceInput.tsx - 1 statement
3. src/components/VoiceInterface.tsx - 1 statement
4. Other components as identified

**Acceptance Criteria**:
- [ ] `src/lib/logger.ts` created and tested
- [ ] 0 console statements in src/components/
- [ ] 0 console statements in src/lib/
- [ ] 0 console statements in src/pages/
- [ ] Logger suppresses debug logs in production

---

### 1.5 Add Developer Workflow Scripts

**Status**: ⏳ Pending  
**Priority**: 🟡 MEDIUM  
**Effort**: 30 minutes  
**Owner**: DevOps

**Add to package.json**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "preview": "vite preview --port 4173",
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx}\"",
    "validate": "npm run type-check && npm run lint && npm test",
    "sec:clean": "node -e \"try{fs=require('fs');fs.rmSync('security/artifacts',{recursive:true,force:true});fs.rmSync('security/summary.json',{force:true});fs.mkdirSync('security/artifacts',{recursive:true})}catch(e){}\"",
    "sec:prove": "npm run build && node scripts/run-all-proof.mjs all && node scripts/security-score.mjs"
  }
}
```

**Acceptance Criteria**:
- [ ] All scripts documented in README.md
- [ ] `npm run validate` works end-to-end
- [ ] Team knows about new scripts

---

## Phase 2: Medium Priority

### 2.1 Refactor ChatInterface.tsx

**Status**: 📋 Planned  
**Priority**: 🟡 MEDIUM  
**Effort**: 2-3 days  
**Owner**: Frontend Team

**Current State**: 1,076 lines - Too large to maintain effectively

**Target Structure**:
```
src/components/chat/
├── ChatInterface.tsx          # Main orchestrator (~150 lines)
├── ChatInput.tsx              # Input area + voice (~150 lines)
├── ChatMessages.tsx           # Message list display (~150 lines)
├── ChatMessageItem.tsx        # Single message component (~100 lines)
├── ChatActions.tsx            # Export/clear/delete actions (~100 lines)
├── ChatFileManager.tsx        # File upload/preview (~150 lines)
└── hooks/
    ├── useChatMessages.ts     # Message CRUD operations
    ├── useChatFiles.ts        # File operations
    ├── useChatDraft.ts        # Draft auto-save
    └── useChatAnalysis.ts     # AI analysis
```

**Implementation Steps**:

#### Step 1: Extract Custom Hooks (Day 1)
```typescript
// src/components/chat/hooks/useChatMessages.ts
export function useChatMessages(conversationId: string | null) {
  const { messages, addMessage, hasMore, loadOlderMessages, loading } = 
    useMessages(conversationId);
  const [displayMessages, setDisplayMessages] = useState<DBMessage[]>([]);
  
  useEffect(() => {
    setDisplayMessages(messages);
  }, [messages]);
  
  return {
    messages: displayMessages,
    addMessage,
    hasMore,
    loadOlderMessages,
    loading,
    setDisplayMessages,
  };
}
```

#### Step 2: Extract ChatInput Component (Day 1-2)
```typescript
// src/components/chat/ChatInput.tsx
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: string) => void;
  loading: boolean;
  conversationId: string | null;
}

export function ChatInput({ value, onChange, onSubmit, loading, conversationId }: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  return (
    <div className="flex gap-2">
      <Textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe your clinical session..."
        className="min-h-[100px]"
      />
      <VoiceInput onTranscript={(text) => onChange(value + ' ' + text)} />
      <Button onClick={() => onSubmit(value)} disabled={loading}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

#### Step 3: Extract ChatMessages Component (Day 2)
```typescript
// src/components/chat/ChatMessages.tsx
interface ChatMessagesProps {
  messages: DBMessage[];
  loading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  conversationId: string | null;
}

export function ChatMessages({ messages, loading, onLoadMore, hasMore, conversationId }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className="flex flex-col gap-4">
      {hasMore && (
        <Button onClick={onLoadMore} variant="ghost">
          Load older messages
        </Button>
      )}
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} conversationId={conversationId} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
```

#### Step 4: Refactor Main Component (Day 3)
```typescript
// src/components/chat/ChatInterface.tsx
export function ChatInterface({ conversationId, onConversationCreated }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const { messages, addMessage, loading, hasMore, loadOlderMessages } = useChatMessages(conversationId);
  const { files, uploadFile, deleteFile } = useChatFiles(conversationId);
  const { saveDraft, loadDraft } = useChatDraft(conversationId);
  
  const handleSubmit = async (message: string) => {
    // Submit logic
  };
  
  return (
    <div className="flex flex-col h-full">
      <ChatMessages 
        messages={messages}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadOlderMessages}
        conversationId={conversationId}
      />
      <ChatFileManager files={files} onUpload={uploadFile} onDelete={deleteFile} />
      <ChatInput 
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        loading={loading}
        conversationId={conversationId}
      />
      <ChatActions conversationId={conversationId} />
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] ChatInterface.tsx < 200 lines
- [ ] Each sub-component < 150 lines
- [ ] All existing tests pass
- [ ] No functionality lost
- [ ] Code coverage maintained or improved

---

### 2.2 Refactor StructuredNoteForm.tsx

**Status**: 📋 Planned  
**Priority**: 🟡 MEDIUM  
**Effort**: 2 days  
**Owner**: Frontend Team

**Current State**: 773 lines - Complex form management

**Target Structure**:
```
src/components/notes/
├── StructuredNoteForm.tsx       # Main form (~150 lines)
├── NoteFormField.tsx            # Reusable field component
├── NoteFormSection.tsx          # Section grouping
├── NoteAutoSave.tsx             # Auto-save indicator
└── hooks/
    ├── useNoteForm.ts           # Form state management
    └── useNoteAutoSave.ts       # Auto-save logic
```

**Implementation Strategy**:

#### Create Reusable Field Component
```typescript
// src/components/notes/NoteFormField.tsx
interface NoteFormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  voiceInputEnabled?: boolean;
}

export function NoteFormField({
  label,
  value,
  onChange,
  maxLength = 4000,
  required,
  placeholder,
  helpText,
  voiceInputEnabled = true,
}: NoteFormFieldProps) {
  const remaining = maxLength - value.length;
  
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="min-h-[100px]"
        />
        {voiceInputEnabled && (
          <div className="absolute top-2 right-2">
            <VoiceInput onTranscript={(text) => onChange(value + ' ' + text)} />
          </div>
        )}
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        {helpText && <span>{helpText}</span>}
        <span>{remaining} characters remaining</span>
      </div>
    </div>
  );
}
```

#### Extract Auto-Save Hook
```typescript
// src/components/notes/hooks/useNoteAutoSave.ts
export function useNoteAutoSave(
  formData: StructuredNote,
  conversationId: string,
  isRecording: boolean
) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const saveNote = useCallback(async (autoSave = false) => {
    setIsSaving(true);
    try {
      // Save logic
      setLastSaved(new Date());
      if (!autoSave) {
        toast.success("Note saved");
      }
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [formData, conversationId]);
  
  useEffect(() => {
    if (isRecording) return;
    
    const timer = setTimeout(() => {
      if (Object.values(formData).some(v => v !== "" && v !== false)) {
        saveNote(true);
      }
    }, 30000);
    
    return () => clearTimeout(timer);
  }, [formData, isRecording, saveNote]);
  
  return { lastSaved, isSaving, saveNote };
}
```

**Acceptance Criteria**:
- [ ] StructuredNoteForm.tsx < 200 lines
- [ ] Reusable field components created
- [ ] Auto-save logic extracted
- [ ] All existing functionality maintained
- [ ] Form validation works correctly

---

### 2.3 Standardize Error Handling

**Status**: 📋 Planned  
**Priority**: 🟡 MEDIUM  
**Effort**: 2-3 days  
**Owner**: Full Team

**Create Error Handling System**:

```typescript
// src/lib/errors.ts
export enum ErrorCode {
  // Authentication
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  
  // API
  API_NETWORK_ERROR = 'API_NETWORK_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  
  // Database
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR = 'DB_QUERY_ERROR',
  
  // Validation
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  
  // File Upload
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_TYPE_INVALID = 'FILE_TYPE_INVALID',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public severity: 'low' | 'medium' | 'high' | 'critical',
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      context: this.context,
    };
  }
}

// src/lib/errorHandler.ts
import { logger } from './logger';
import { toast } from 'sonner';

export function handleError(error: unknown, context: string) {
  if (error instanceof AppError) {
    logger.error(`[${context}] ${error.message}`, error.toJSON());
    
    // Show user-friendly message
    const userMessage = getUserFriendlyMessage(error);
    toast.error(userMessage);
    
    // Send to monitoring service if critical
    if (error.severity === 'critical') {
      // TODO: Send to Sentry/error tracking
    }
  } else if (error instanceof Error) {
    logger.error(`[${context}] ${error.message}`, { stack: error.stack });
    toast.error('An unexpected error occurred. Please try again.');
  } else {
    logger.error(`[${context}] Unknown error`, error);
    toast.error('Something went wrong. Please try again.');
  }
}

function getUserFriendlyMessage(error: AppError): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.AUTH_REQUIRED]: 'Please sign in to continue',
    [ErrorCode.AUTH_INVALID]: 'Invalid credentials. Please try again.',
    [ErrorCode.AUTH_EXPIRED]: 'Your session has expired. Please sign in again.',
    [ErrorCode.API_NETWORK_ERROR]: 'Network error. Please check your connection.',
    [ErrorCode.API_TIMEOUT]: 'Request timed out. Please try again.',
    [ErrorCode.API_RATE_LIMIT]: 'Too many requests. Please wait a moment.',
    [ErrorCode.DB_CONNECTION_ERROR]: 'Database connection error. Please try again.',
    [ErrorCode.DB_QUERY_ERROR]: 'Failed to fetch data. Please try again.',
    [ErrorCode.VALIDATION_FAILED]: 'Please check your input and try again.',
    [ErrorCode.FILE_TOO_LARGE]: 'File is too large. Maximum size is 10MB.',
    [ErrorCode.FILE_TYPE_INVALID]: 'Invalid file type. Please upload a PDF or text file.',
    [ErrorCode.UNKNOWN_ERROR]: 'Something went wrong. Please try again.',
  };
  
  return messages[error.code] || error.message;
}
```

**Usage Example**:
```typescript
// Before
try {
  const result = await someApiCall();
} catch (error) {
  console.error("API call failed:", error);
  toast.error("Something went wrong");
}

// After
import { handleError, AppError, ErrorCode } from '@/lib/errors';

try {
  const result = await someApiCall();
} catch (error) {
  if (error.response?.status === 429) {
    throw new AppError(
      'Rate limit exceeded',
      ErrorCode.API_RATE_LIMIT,
      'medium'
    );
  }
  handleError(error, 'ApiCall');
}
```

**Acceptance Criteria**:
- [ ] Error handling utilities created
- [ ] All API calls use standardized error handling
- [ ] User-friendly error messages shown
- [ ] Errors logged with proper context
- [ ] Critical errors tracked

---

### 2.4 Enhance Accessibility

**Status**: 📋 Planned  
**Priority**: 🟡 MEDIUM  
**Effort**: 2-3 days  
**Owner**: Frontend Team

**Improvements Needed**:

1. **Keyboard Navigation**
```typescript
// Add keyboard shortcuts to ChatInterface
const ChatInterface = () => {
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleSubmit]);
  
  return (
    // Component JSX
  );
};
```

2. **ARIA Live Regions**
```typescript
// Add status announcements
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {loading && "AI is analyzing your notes"}
  {error && `Error: ${error}`}
  {success && "Analysis complete"}
</div>
```

3. **Focus Management**
```typescript
// Trap focus in dialogs
import { useFocusTrap } from '@/hooks/useFocusTrap';

const Dialog = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);
  
  return (
    <div ref={dialogRef} role="dialog" aria-modal="true">
      {/* Dialog content */}
    </div>
  );
};
```

4. **Screen Reader Support**
```typescript
// Announce messages as they arrive
<div role="log" aria-live="polite" aria-label="Chat messages">
  {messages.map(msg => (
    <div key={msg.id} role="article" aria-label={`Message from ${msg.role}`}>
      {msg.content}
    </div>
  ))}
</div>
```

**Testing Checklist**:
- [ ] All interactive elements reachable via keyboard
- [ ] Focus visible on all elements
- [ ] Screen reader announces state changes
- [ ] ARIA labels present where needed
- [ ] Color contrast ratio > 4.5:1
- [ ] Touch targets > 44x44px on mobile
- [ ] Run axe-core accessibility tests
- [ ] Manual testing with screen reader

---

### 2.5 Add Component Unit Tests

**Status**: 📋 Planned  
**Priority**: 🟡 MEDIUM  
**Effort**: 5-7 days  
**Owner**: Frontend Team

**Target Coverage**: 50-60% (up from current ~20%)

**Priority Test Targets**:

1. **ChatInterface Tests**
```typescript
// src/components/chat/__tests__/ChatInterface.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../ChatInterface';
import { renderWithProviders } from '@/test/utils';

describe('ChatInterface', () => {
  it('should render input area', () => {
    renderWithProviders(<ChatInterface conversationId={null} />);
    expect(screen.getByPlaceholderText(/describe your clinical session/i)).toBeInTheDocument();
  });
  
  it('should submit message on button click', async () => {
    const user = userEvent.setup();
    const onConversationCreated = vi.fn();
    
    renderWithProviders(
      <ChatInterface conversationId={null} onConversationCreated={onConversationCreated} />
    );
    
    const input = screen.getByPlaceholderText(/describe your clinical session/i);
    await user.type(input, 'Test message');
    
    const submitButton = screen.getByRole('button', { name: /send/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(onConversationCreated).toHaveBeenCalled();
    });
  });
  
  it('should show loading state during analysis', async () => {
    renderWithProviders(<ChatInterface conversationId="123" />);
    
    // Trigger analysis
    // Assert loading indicator appears
  });
  
  it('should handle errors gracefully', async () => {
    // Mock API error
    // Trigger action that causes error
    // Assert error message shown
  });
});
```

2. **Hook Tests**
```typescript
// src/hooks/__tests__/useMessages.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useMessages } from '../useMessages';

describe('useMessages', () => {
  it('should load messages for conversation', async () => {
    const { result } = renderHook(() => useMessages('conv-123'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.messages).toHaveLength(10);
  });
  
  it('should add new message', async () => {
    const { result } = renderHook(() => useMessages('conv-123'));
    
    await act(async () => {
      await result.current.addMessage({
        content: 'Test message',
        role: 'user',
      });
    });
    
    expect(result.current.messages).toContainEqual(
      expect.objectContaining({ content: 'Test message' })
    );
  });
});
```

3. **Utility Tests**
```typescript
// src/lib/__tests__/sanitization.test.ts
import { sanitizeHtml, sanitizeInput } from '../sanitization';

describe('sanitization', () => {
  it('should remove script tags', () => {
    const dirty = '<script>alert("xss")</script><p>Hello</p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toBe('<p>Hello</p>');
  });
  
  it('should preserve safe HTML', () => {
    const safe = '<p>Hello <strong>world</strong></p>';
    const clean = sanitizeHtml(safe);
    expect(clean).toBe(safe);
  });
});
```

**Test Utilities to Create**:
```typescript
// src/test/utils.tsx
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      })),
    })),
    insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    update: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    delete: vi.fn(() => Promise.resolve({ data: {}, error: null })),
  })),
};
```

**Acceptance Criteria**:
- [ ] Test coverage > 50%
- [ ] All critical components have tests
- [ ] All custom hooks have tests
- [ ] All utility functions have tests
- [ ] Tests run in CI/CD
- [ ] Test utils created and documented

---

## Phase 3: Low Priority

### 3.1 Implement Zustand State Management

**Status**: 📋 Backlog  
**Priority**: 🟢 LOW  
**Effort**: 3-4 days  
**Owner**: Frontend Team

**Create Feature Stores**:

```typescript
// src/stores/chatStore.ts
import create from 'zustand';
import { devtools } from 'zustand/middleware';

interface ChatState {
  currentConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setConversationId: (id: string | null) => void;
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set) => ({
      currentConversationId: null,
      messages: [],
      isLoading: false,
      error: null,
      
      setConversationId: (id) => set({ currentConversationId: id }),
      addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message] 
      })),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      reset: () => set({
        currentConversationId: null,
        messages: [],
        isLoading: false,
        error: null,
      }),
    }),
    { name: 'ChatStore' }
  )
);
```

---

### 3.2 Performance Optimizations

**Status**: 📋 Backlog  
**Priority**: 🟢 LOW  
**Effort**: 2-3 days  
**Owner**: Frontend Team

**Optimizations to Implement**:

1. **React.memo for Pure Components**
2. **useMemo for Expensive Computations**
3. **useCallback for Event Handlers**
4. **Code Splitting with React.lazy**
5. **Image Optimization**
6. **Bundle Analysis and Tree Shaking**

---

### 3.3 Pre-commit Hooks Setup

**Status**: 📋 Backlog  
**Priority**: 🟢 LOW  
**Effort**: 1-2 hours  
**Owner**: DevOps

**Install and Configure**:
```bash
npm install --save-dev husky lint-staged prettier
npx husky install
```

**Configuration**:
```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

---

## Success Metrics

### Code Quality Metrics
- [ ] ESLint errors: 0
- [ ] ESLint warnings: < 10
- [ ] TypeScript strict mode enabled
- [ ] Test coverage: > 50%
- [ ] No `any` types in source code

### Security Metrics
- [ ] npm audit: 0 vulnerabilities
- [ ] No secrets in code
- [ ] CSP headers configured
- [ ] Security tests passing

### Performance Metrics
- [ ] Bundle size < 500KB gzipped
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Lighthouse score > 90

### Developer Experience
- [ ] Build time < 30s
- [ ] Test suite < 60s
- [ ] Hot reload < 2s
- [ ] Clear documentation

---

## Resources

### Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Testing Library](https://testing-library.com/react)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Tools
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Bundle Analyzer](https://www.npmjs.com/package/vite-bundle-visualizer)
- [axe DevTools](https://www.deque.com/axe/devtools/)

---

## Appendix: Code Templates

### Component Template
```typescript
// src/components/MyComponent.tsx
import { useState } from 'react';
import { logger } from '@/lib/logger';

interface MyComponentProps {
  // Props definition
}

export function MyComponent({ }: MyComponentProps) {
  // Component implementation
  
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Hook Template
```typescript
// src/hooks/useMyHook.ts
import { useState, useEffect } from 'react';

export function useMyHook() {
  // Hook implementation
  
  return {
    // Return values
  };
}
```

### Test Template
```typescript
// src/components/__tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />);
    expect(screen.getByText(/something/i)).toBeInTheDocument();
  });
});
```

---

**Last Updated**: October 21, 2025  
**Maintained By**: Development Team  
**Review Cycle**: Bi-weekly
