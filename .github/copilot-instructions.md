# GitHub Copilot Instructions for Mental Scribe

## Project Overview

Mental Scribe is a HIPAA-aware clinical documentation assistant powered by AI to help mental health professionals create structured clinical notes. The application prioritizes **security, privacy, and accessibility** in a healthcare context.

**Key Characteristics:**
- Healthcare application handling sensitive clinical information
- HIPAA-compliant design with row-level security
- Focus on accessibility (WCAG 2.1 AA compliance)
- Content sanitization for XSS prevention
- Comprehensive test coverage (80%+ target)

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind CSS with semantic design tokens
- **Backend:** Supabase (Database, Auth, Storage, Edge Functions)
- **AI Integration:** OpenAI API via Supabase Edge Functions
- **Testing:** Vitest, React Testing Library, Playwright
- **Package Manager:** npm (primary), with pnpm and bun support

## Build & Development Commands

### Development
```bash
npm run dev              # Start development server (Vite)
npm run build            # Production build
npm run build:dev        # Development build
npm run preview          # Preview production build
```

### Testing
```bash
npm test                 # Run unit tests with Vitest
npm run test:ui          # Run tests with Vitest UI
npm run test:coverage    # Run tests with coverage report
npm run test:e2e         # Run Playwright end-to-end tests
```

### Linting & Type Checking
```bash
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run lint:quiet       # Lint without warnings
npm run type-check       # TypeScript type checking
npm run type-check:watch # Type check in watch mode
```

### Security Validation
```bash
npm run sec:clean        # Clean security artifacts
npm run sec:prove        # Run security proof pipeline
```

## Code Standards & Best Practices

### TypeScript
- **Required** for all components, utilities, and types
- Use strict mode (`tsconfig.json` strict flags enabled)
- Define explicit types for all props, function parameters, and return values
- Use Zod schemas for runtime validation and form handling
- Leverage path aliases: `@/components`, `@/lib`, `@/hooks`, etc.

### React Components
- Use functional components with TypeScript
- Follow React hooks best practices
- Implement proper error boundaries for critical sections
- Use `React.memo()` for performance-critical components
- Prefer composition over inheritance

### Styling
- **Always use semantic design tokens** from `src/index.css`
- Use CSS variables: `bg-background`, `text-foreground`, `border`, etc.
- Never hard-code colors (e.g., `bg-blue-500`)
- Support dark mode via CSS variable theming
- Use Tailwind responsive utilities: `sm:`, `md:`, `lg:`
- Follow mobile-first design principles

### File Organization
```
src/
├── components/        # React components
│   └── __tests__/    # Component tests
├── lib/              # Utility libraries
│   └── __tests__/    # Library tests
├── hooks/            # Custom React hooks
├── constants/        # Constants and templates
│   └── __tests__/    # Constant tests
├── pages/            # Page components
│   └── __tests__/    # Page tests
├── integrations/     # External service integrations
└── types/            # TypeScript type definitions
```

## Testing Requirements

### Test Coverage Targets
- **Critical Business Logic:** 90%+
- **UI Components:** 80%+
- **Utility Functions:** 85%+
- **Overall Project:** 80%+

### Writing Tests
- Place tests in `__tests__` directories adjacent to source files
- Name test files: `ComponentName.test.tsx` or `utilityName.test.ts`
- Use React Testing Library for component tests
- Mock external dependencies (Supabase, toast, etc.)
- Follow Arrange-Act-Assert pattern
- Write descriptive test names: `it('should reject email exceeding 255 characters')`

### Test Categories to Cover
1. **Happy Path:** Normal user flows
2. **Edge Cases:** Boundary conditions, empty states, max values
3. **Error Handling:** Network failures, validation errors
4. **Security:** XSS prevention, input sanitization, authentication
5. **Accessibility:** ARIA compliance, keyboard navigation, screen readers

### Example Test Structure
```typescript
describe('ComponentName', () => {
  it('should render successfully with valid props', () => {
    // Arrange
    const props = { /* ... */ };
    
    // Act
    render(<ComponentName {...props} />);
    
    // Assert
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

## Security Requirements

### Content Sanitization
- **Always** sanitize user-generated content before rendering or exporting
- Use DOMPurify for HTML sanitization
- Never use `dangerouslySetInnerHTML` without sanitization
- Validate all file uploads (size, type, magic bytes)

### Authentication & Authorization
- Implement Row-Level Security (RLS) policies in Supabase
- Never expose sensitive data in client-side code
- Use Supabase Auth for authentication
- Validate user permissions before data access
- Implement session timeouts (30-minute inactivity, 12-hour absolute)

### Input Validation
- Use Zod schemas for all form inputs
- Validate on both client and server side
- Sanitize user inputs before storage
- Prevent path traversal attacks in file operations
- Enforce password complexity requirements

### PHI (Protected Health Information)
- **Never log PHI** to console, analytics, or error tracking
- Use user-scoped file paths for uploads
- Generate signed URLs (not public URLs) for file access
- Implement audit trails for sensitive operations
- Follow HIPAA compliance guidelines

## Documentation Standards

### Code Comments
- Use JSDoc for exported functions and interfaces
- Include parameter descriptions and return types
- Document complex logic with inline comments
- Avoid obvious comments (e.g., `// increment counter`)

### Component Documentation
```typescript
/**
 * Clinical note editor component with auto-save functionality
 * 
 * @param sessionId - Unique identifier for the clinical session
 * @param onSave - Callback fired when note is saved
 * @returns Rendered note editor component
 */
export const NoteEditor: React.FC<NoteEditorProps> = ({ sessionId, onSave }) => {
  // ...
};
```

## Common Patterns

### Error Handling
```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  toast.error('An error occurred. Please try again.');
  throw error;
}
```

### Form Handling with Zod
```typescript
const formSchema = z.object({
  email: z.string().email().max(255),
  message: z.string().min(1).max(5000),
});

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
});
```

### Accessibility
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`)
- Provide ARIA labels for interactive elements
- Ensure keyboard navigation (Tab, Enter, Escape)
- Maintain focus management in modals/dialogs
- Use `role` attributes appropriately
- Test with screen readers

## Commit Message Conventions

Follow conventional commits format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions or modifications
- `refactor:` Code refactoring
- `style:` Code style changes (formatting, etc.)
- `chore:` Maintenance tasks

Example: `feat: add SOAP note generation template`

## Additional Resources

- **Contributing Guide:** `CONTRIBUTING.md`
- **Security Guidelines:** `SECURITY.md`
- **Architecture Overview:** `docs/ARCHITECTURE.md`
- **API Reference:** `docs/API_REFERENCE.md`
- **Test Coverage Setup:** `docs/TEST_COVERAGE_SETUP.md`

## Important Notes for AI Assistance

1. **Healthcare Context:** This is a clinical application. Ensure clinical terminology is used appropriately and accurately.

2. **Privacy First:** Never suggest logging, storing, or exposing PHI in ways that could violate HIPAA.

3. **Test Everything:** Always include tests for new features or bug fixes. Security-sensitive code requires extra test coverage.

4. **Accessibility Matters:** All UI changes must be accessible. Consider keyboard navigation, screen readers, and ARIA attributes.

5. **Performance:** This app may handle large notes and documents. Optimize for performance where appropriate (memoization, lazy loading, virtualization).

6. **Monorepo Structure:** This is a monorepo with packages in `packages/` and apps in `apps/`. Respect the boundaries between modules.

7. **Dependencies:** Only add new dependencies when absolutely necessary. Prefer built-in solutions or existing dependencies.

8. **Breaking Changes:** Avoid breaking changes to APIs or data structures. If necessary, provide migration paths.

## When Making Changes

1. **Understand the Context:** Read related code and tests before making changes
2. **Run Tests Frequently:** `npm test` should pass before and after your changes
3. **Lint Your Code:** `npm run lint:fix` to ensure code quality
4. **Type Check:** `npm run type-check` to catch TypeScript errors
5. **Test Manually:** Run `npm run dev` and test the feature in the browser
6. **Document Changes:** Update relevant documentation if behavior changes
7. **Security Scan:** Run `npm run sec:prove` for security-sensitive changes

## Questions or Issues?

- Check existing documentation in `docs/` directory
- Review `CONTRIBUTING.md` for development guidelines
- Consult `SECURITY.md` for security requirements
- Open a GitHub issue for bugs or feature requests
