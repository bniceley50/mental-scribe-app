# Development Guide - Mental Scribe App

Quick reference guide for developers working on technical debt remediation and ongoing development.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+
- Git

### Initial Setup
```bash
# Clone repository
git clone https://github.com/bniceley50/mental-scribe-app.git
cd mental-scribe-app

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

---

## 📋 Common Commands

### Development
```bash
npm run dev              # Start dev server (http://localhost:8080)
npm run build            # Production build
npm run build:dev        # Development build
npm run preview          # Preview production build
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically
npm run type-check       # Check TypeScript types
npm run type-check:watch # Watch mode for type checking
```

### Testing
```bash
npm test                 # Run unit tests
npm run test:ui          # Run tests with UI
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run E2E tests with Playwright
npm run test:e2e:ui      # Run E2E tests with Playwright UI
```

### Validation (before commit)
```bash
npm run validate         # Run type-check + lint + tests
```

### Security
```bash
npm audit                # Check for vulnerabilities
npm audit fix            # Fix vulnerabilities automatically
npm run sec:prove        # Run security proof suite
```

---

## 📁 Project Structure

```
mental-scribe-app/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── clients/        # Client management
│   │   └── ...             # Feature components
│   ├── pages/              # Page components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and helpers
│   ├── integrations/       # Third-party integrations
│   │   └── supabase/       # Supabase client & types
│   ├── constants/          # Constants and config
│   ├── utils/              # Utility functions
│   └── test/               # Test utilities
├── test/                   # E2E tests
├── security-tests/         # Security test suite
├── public/                 # Static assets
├── docs/                   # Documentation
└── scripts/                # Build and utility scripts
```

---

## 🔧 Code Style Guide

### TypeScript

**DO** ✅
```typescript
// Use explicit types
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return fetch(`/api/users/${id}`).then(r => r.json());
}

// Use type guards
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}
```

**DON'T** ❌
```typescript
// Don't use 'any'
function getUser(id: any): any {  // ❌
  return fetch(`/api/users/${id}`).then(r => r.json());
}

// Don't use implicit any
function processData(data) {  // ❌
  return data.map(item => item.value);
}
```

### React Components

**DO** ✅
```typescript
// Use function components with TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// Use proper hook dependencies
useEffect(() => {
  fetchData();
}, [fetchData]); // Include dependencies
```

**DON'T** ❌
```typescript
// Don't omit prop types
export function Button({ label, onClick }) {  // ❌
  return <button onClick={onClick}>{label}</button>;
}

// Don't ignore dependency warnings
useEffect(() => {
  fetchData();
}, []); // ❌ Missing fetchData dependency
```

### Error Handling

**DO** ✅
```typescript
import { handleError, AppError, ErrorCode } from '@/lib/errors';

try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  if (error instanceof NetworkError) {
    throw new AppError(
      'Network error occurred',
      ErrorCode.API_NETWORK_ERROR,
      'medium'
    );
  }
  handleError(error, 'RiskyOperation');
  throw error;
}
```

**DON'T** ❌
```typescript
// Don't swallow errors
try {
  await riskyOperation();
} catch (error) {
  console.log(error);  // ❌
}

// Don't show technical errors to users
} catch (error) {
  toast.error(error.stack);  // ❌
}
```

### Logging

**DO** ✅
```typescript
import { logger } from '@/lib/logger';

logger.debug('User action', { userId, action: 'click' });
logger.info('Operation completed', { duration: '2s' });
logger.warn('Deprecated API used', { endpoint: '/old-api' });
logger.error('Operation failed', error);
```

**DON'T** ❌
```typescript
// Don't use console directly in source code
console.log('Debug info');      // ❌
console.error('Error:', error); // ❌ (use logger.error)
```

---

## 🧪 Testing Guidelines

### Unit Tests

```typescript
// src/components/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    
    render(<Button label="Click me" onClick={onClick} />);
    
    await user.click(screen.getByRole('button'));
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  
  it('should be disabled when disabled prop is true', () => {
    render(<Button label="Click me" onClick={vi.fn()} disabled />);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Test File Naming
- Component tests: `ComponentName.test.tsx`
- Hook tests: `useHookName.test.ts`
- Utility tests: `utilityName.test.ts`
- Place tests in `__tests__` folder next to source

### Test Coverage Goals
- Critical components: > 80%
- Utilities: > 90%
- Hooks: > 80%
- Overall: > 50%

---

## 🎨 Component Development

### Creating New Components

1. **Use the component template**:
```typescript
// src/components/MyNewComponent.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface MyNewComponentProps {
  title: string;
  onAction: () => void;
}

export function MyNewComponent({ title, onAction }: MyNewComponentProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async () => {
    try {
      setIsLoading(true);
      await onAction();
      logger.info('Action completed', { component: 'MyNewComponent' });
    } catch (error) {
      logger.error('Action failed', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div>
      <h2>{title}</h2>
      <Button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Click me'}
      </Button>
    </div>
  );
}
```

2. **Create corresponding test file**:
```typescript
// src/components/__tests__/MyNewComponent.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyNewComponent } from '../MyNewComponent';

describe('MyNewComponent', () => {
  it('should render with title', () => {
    render(<MyNewComponent title="Test Title" onAction={vi.fn()} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });
});
```

3. **Add to exports** (if creating a new feature module):
```typescript
// src/components/myfeature/index.ts
export { MyNewComponent } from './MyNewComponent';
export { AnotherComponent } from './AnotherComponent';
```

### Component Best Practices

- ✅ Keep components < 200 lines
- ✅ Extract complex logic into custom hooks
- ✅ Use composition over prop drilling
- ✅ Implement proper loading and error states
- ✅ Add accessibility attributes (aria-label, role, etc.)
- ✅ Use semantic HTML
- ✅ Test user interactions

---

## 🔌 Custom Hooks

### Creating Custom Hooks

```typescript
// src/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage', error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage', error);
    }
  }, [key, value]);

  return [value, setValue] as const;
}
```

### Hook Testing
```typescript
// src/hooks/__tests__/useLocalStorage.test.ts
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useLocalStorage('test', 'default'));
    expect(result.current[0]).toBe('default');
  });
  
  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test', 'initial'));
    
    act(() => {
      result.current[1]('updated');
    });
    
    expect(localStorage.getItem('test')).toBe('"updated"');
  });
});
```

---

## 🐛 Debugging Tips

### React DevTools
```bash
# Install browser extension
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools/
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools/
```

### TypeScript Compiler Debugging
```bash
# Generate declaration files to see type inference
npm run type-check -- --declaration --emitDeclarationOnly

# See what TypeScript thinks a type is
// In code: hover over variable in VSCode
// Or use type assertions to check:
const test: typeof myVariable = {} as any;
```

### Supabase Debugging
```typescript
// Enable query logging in development
import { supabase } from '@/integrations/supabase/client';

// Log queries
const { data, error } = await supabase
  .from('table')
  .select('*')
  .then(result => {
    console.log('Query result:', result);
    return result;
  });
```

---

## 📦 Dependencies

### Adding New Dependencies

1. **Check for security vulnerabilities first**:
```bash
npm audit
```

2. **Search for alternatives** on npm trends:
   - https://npmtrends.com

3. **Install and document**:
```bash
npm install package-name

# Document in CHANGELOG.md why it was added
```

4. **Update .gitignore if needed**:
```
# Add any new build artifacts or generated files
```

### Dependency Guidelines

- ✅ Prefer well-maintained packages (updated in last 6 months)
- ✅ Check bundle size impact (use bundlephobia.com)
- ✅ Verify license compatibility
- ✅ Read security advisories
- ❌ Avoid packages with many open issues
- ❌ Avoid unmaintained packages
- ❌ Don't add if native solution exists

---

## 🔐 Security Best Practices

### Environment Variables
```typescript
// Always use import.meta.env for environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// Never commit .env files
// Always provide .env.example with safe placeholders
```

### Input Sanitization
```typescript
import DOMPurify from 'dompurify';

// Sanitize user input before rendering
const cleanHtml = DOMPurify.sanitize(userInput);
```

### Authentication
```typescript
// Always check authentication before sensitive operations
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  throw new AppError('Authentication required', ErrorCode.AUTH_REQUIRED, 'high');
}
```

---

## 🎯 Git Workflow

### Branch Naming
- Feature: `feature/description`
- Bug fix: `fix/description`
- Hotfix: `hotfix/description`
- Technical debt: `tech-debt/description`

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new voice input component
fix: resolve authentication timeout issue
docs: update README with setup instructions
refactor: extract chat logic into custom hook
test: add tests for useMessages hook
chore: update dependencies
```

### Pull Request Process
1. Create feature branch from `main`
2. Make changes and commit frequently
3. Run `npm run validate` before pushing
4. Create PR with clear description
5. Address review comments
6. Squash and merge when approved

---

## 📚 Useful Resources

### Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Tools
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)

### Learning Resources
- [Testing Library Guide](https://testing-library.com/docs/react-testing-library/intro/)
- [React Patterns](https://reactpatterns.com/)
- [Web Accessibility](https://www.w3.org/WAI/WCAG21/quickref/)

---

## ❓ FAQ

### Q: Why are we using sessionStorage instead of localStorage?
**A**: For security and HIPAA compliance. Session storage is cleared when the tab closes, reducing the risk of PHI persistence.

### Q: How do I run tests for a specific file?
**A**: 
```bash
npm test -- path/to/file.test.tsx
```

### Q: The build is failing with a type error. How do I debug?
**A**:
```bash
# Run type checker with verbose output
npm run type-check -- --pretty

# Check specific file
npx tsc --noEmit src/path/to/file.tsx
```

### Q: How do I add a new shadcn/ui component?
**A**:
```bash
npx shadcn-ui@latest add component-name
```

### Q: Where should I put shared types?
**A**: 
- Component-specific types: Same file as component
- Shared feature types: `src/types/featureName.ts`
- Global types: `src/types/global.d.ts`

### Q: How do I mock Supabase in tests?
**A**: Use the mock utilities in `src/test/utils.tsx`

---

## 🆘 Getting Help

### Internal Resources
1. Check [TECHNICAL_DEBT_ANALYSIS.md](TECHNICAL_DEBT_ANALYSIS.md) for known issues
2. Check [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) for planned fixes
3. Search existing GitHub issues
4. Ask in team chat

### External Resources
1. Check component documentation
2. Search Stack Overflow
3. Check GitHub issues for dependencies
4. Read official documentation

---

## 📝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

### Quick Checklist
- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] `npm run validate` passes
- [ ] PR description is clear
- [ ] No console statements in source
- [ ] No `any` types added
- [ ] Accessibility considered

---

**Last Updated**: October 21, 2025  
**Maintained By**: Development Team  
**Questions?** Open a GitHub issue or ask in team chat
