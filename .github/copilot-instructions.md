# Copilot Instructions for Mental Scribe

## Project Overview

Mental Scribe is a HIPAA-aware clinical documentation assistant powered by AI to help mental health professionals create structured clinical notes. The application emphasizes security, privacy, and accessibility while providing AI-powered analysis and documentation tools.

**Key Principles:**
- Security and privacy are paramount (HIPAA-aware design)
- Never log or store Protected Health Information (PHI)
- All user inputs must be sanitized before rendering or export
- Comprehensive test coverage (aim for 80%+)
- Accessibility compliance (WAI-ARIA, keyboard navigation)

## Tech Stack

- **Frontend:** React 18.3+ with TypeScript
- **Build Tool:** Vite 7.x
- **UI Framework:** shadcn/ui components with Tailwind CSS
- **Backend:** Supabase (Database, Auth, Storage, Edge Functions)
- **AI Integration:** OpenAI API via Supabase Edge Functions
- **Testing:** Vitest + React Testing Library + Playwright
- **Linting:** ESLint 9.x with TypeScript support

## Project Structure

```
mental-scribe-app/
├── src/
│   ├── components/       # React components (with __tests__ subdirs)
│   ├── pages/           # Page-level components
│   ├── lib/             # Utility functions and helpers
│   ├── constants/       # Templates, prompts, and constants
│   ├── hooks/           # Custom React hooks
│   ├── integrations/    # API integrations (Supabase)
│   └── index.css        # Global styles and CSS variables
├── docs/                # Documentation and guides
├── supabase/            # Supabase configuration and migrations
├── test/                # E2E tests (Playwright)
├── security/            # Security artifacts and reports
└── .github/
    └── workflows/       # CI/CD workflows
```

## Development Workflow

### Setup and Running

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Type checking
npm run type-check

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e
```

### Testing Requirements

- **Test Location:** Place tests in `__tests__` directories next to the code they test
- **Coverage Target:** 80%+ for critical logic, UI components, and security features
- **Test Categories:**
  - Authentication and authorization
  - File upload and validation
  - Content sanitization
  - Accessibility (ARIA, keyboard navigation)
  - Consent management
  - Form validation

- **Test Commands:**
  ```bash
  npm test              # Run all tests
  npm run test:ui       # Run tests with UI
  npm run test:coverage # Generate coverage report
  npm run test:e2e      # Run Playwright E2E tests
  ```

## Code Standards

### TypeScript

- **Required:** All new code must be TypeScript
- **Types:** Define explicit types for all props, function parameters, and return values
- **Avoid `any`:** Use proper types or `unknown` when necessary
- **Interfaces:** Use interfaces for object shapes, types for unions/intersections

### Styling

- **Use semantic tokens:** Always use CSS variables from `src/index.css`
  - ✅ `bg-background`, `text-foreground`, `border-border`
  - ❌ `bg-blue-500`, `text-gray-900`
- **Responsive design:** Use Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`)
- **Dark mode:** All components must support dark mode via CSS variables
- **Accessibility:** Follow WAI-ARIA guidelines, semantic HTML, 44x44px minimum touch targets

### Component Guidelines

- **shadcn/ui:** Use existing shadcn components from `src/components/ui/`
- **Custom components:** Place in appropriate directories with clear naming
- **Error boundaries:** Wrap critical UI sections with `<ErrorBoundary>`
- **Exports:** Use named exports for better tree-shaking

### Import Conventions

```typescript
// ✅ Use path aliases
import { Button } from '@/components/ui/button';
import { sanitizeContent } from '@/lib/sanitization';

// ❌ Don't use relative paths for cross-directory imports
import { Button } from '../../../components/ui/button';
```

## Security Requirements

### Critical Security Rules

1. **Content Sanitization:**
   - Use `DOMPurify.sanitize()` for all user-generated content before export or rendering
   - Sanitize HTML in PDF exports, clipboard operations, and dynamic content

2. **No PHI in Logs:**
   - Never log Protected Health Information
   - Remove console.log statements from production code
   - Use proper error handling without exposing sensitive data

3. **Input Validation:**
   - Use Zod schemas for all form inputs
   - Validate file uploads (type, size, content)
   - Check for path traversal, XSS, and injection attacks

4. **Authentication:**
   - All API calls must include authentication
   - Use Row Level Security (RLS) policies in Supabase
   - Implement account lockout after failed login attempts

5. **File Upload Security:**
   - 10MB file size limit
   - PDF magic byte verification
   - User-scoped file paths (never expose user IDs in paths)
   - Generate signed URLs (not public URLs)

### Security Testing

When adding security-sensitive features, include tests for:
- Input validation (edge cases, malicious input)
- Authentication and authorization
- Content sanitization
- File upload validation
- XSS prevention

Example test structure:
```typescript
describe('Security: Input Validation', () => {
  it('should sanitize HTML in user input', () => {
    const malicious = '<script>alert("XSS")</script>';
    const sanitized = sanitizeContent(malicious);
    expect(sanitized).not.toContain('<script>');
  });
});
```

## Documentation Standards

- **JSDoc:** All exported functions must have JSDoc comments
- **README updates:** Update README.md when adding major features
- **CHANGELOG:** Document all user-facing changes
- **Inline comments:** Use sparingly, prefer self-documenting code

### JSDoc Example

```typescript
/**
 * Sanitizes user-generated content to prevent XSS attacks.
 * 
 * @param content - The raw HTML content to sanitize
 * @param options - DOMPurify configuration options
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeContent(content: string, options?: object): string {
  return DOMPurify.sanitize(content, options);
}
```

## Templates and Constants

Clinical templates and prompts are defined in:
- `src/constants/noteTemplates.ts` - Clinical note templates
- `src/constants/examplePrompts.ts` - Example AI prompts

When modifying templates:
1. Follow existing type structure
2. Include all required properties (`id`, `name`, `description`, `content`, `category`)
3. Add corresponding tests
4. Use clinical terminology appropriately
5. Use placeholder syntax `[...]` for dynamic fields

## Common Patterns

### Error Handling

```typescript
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error('Operation failed:', error.message);
  toast.error('Unable to complete operation. Please try again.');
  throw error; // Re-throw for component error boundaries
}
```

### Form Validation with Zod

```typescript
import { z } from 'zod';

const formSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
});

type FormData = z.infer<typeof formSchema>;
```

### Accessibility

```tsx
// ✅ Good accessibility
<button
  aria-label="Close dialog"
  onClick={handleClose}
  className="min-h-[44px] min-w-[44px]"
>
  <X className="h-4 w-4" />
  <span className="sr-only">Close</span>
</button>

// ❌ Poor accessibility
<div onClick={handleClose}>
  <X />
</div>
```

## CI/CD Workflows

The repository includes comprehensive GitHub Actions workflows:
- `security.yml` - Security scanning and vulnerability checks
- `e2e-tests.yml` - End-to-end Playwright tests
- `coverage.yml` - Test coverage reporting
- `lighthouse-ci.yml` - Performance and accessibility audits
- `pr-security.yml` - PR-level security checks

All checks must pass before merging PRs.

## Environment Variables

- Environment variables are automatically configured via Lovable Cloud
- Do not manually edit `.env` file
- Use `.env.example` as reference for required variables
- Never commit secrets or API keys to the repository

## Branching Strategy

- **Feature branches:** `feature/description`
- **Bug fixes:** `fix/description`
- **Keep branches up-to-date** with `main`
- **Delete branches** after merging
- **Conventional commits:** Use descriptive commit messages

## AI Integration Notes

- AI analysis is performed via Supabase Edge Functions
- All AI requests are logged for compliance (without PHI)
- Rate limiting and error handling are implemented
- AI responses must be sanitized before display

## Performance Considerations

- Lazy load components where appropriate
- Optimize images and assets
- Use React.memo() for expensive components
- Implement pagination for large data sets
- Monitor bundle size (use build analyzer)

## Accessibility Requirements

- **ARIA labels:** All interactive elements must have proper ARIA labels
- **Keyboard navigation:** Full keyboard support required
- **Screen readers:** Ensure proper announcements with sr-only text
- **Color contrast:** Minimum 4.5:1 for normal text, 3:1 for large text
- **Touch targets:** Minimum 44x44px for mobile
- **Focus management:** Visible focus indicators required

Test accessibility with:
```bash
npm run test:e2e  # Includes automated accessibility checks
```

## Contact and Support

- **Issues:** Use GitHub Issues for bugs and feature requests
- **Security:** Report security issues privately (see SECURITY.md)
- **Documentation:** Check `docs/` directory for detailed guides
- **Contributing:** Review CONTRIBUTING.md before submitting PRs

---

**Remember:** This is a healthcare application. Security, privacy, and accuracy are non-negotiable. When in doubt, err on the side of caution and ask for review.
