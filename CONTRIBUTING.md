# Contributing to Mental Scribe

Thank you for your interest in contributing to Mental Scribe! This guide will help you get started with development, testing, and submitting your changes. Whether you're fixing a bug, improving documentation, or adding a new feature, your contributions are welcome.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Testing Workflow](#testing-workflow)
- [Code Standards](#code-standards)
- [Design System](#design-system)
- [Branching & PR Strategy](#branching--pr-strategy)
- [Documentation & Resources](#documentation--resources)
- [Templates & Constants](#templates--constants)
- [Security & Error Handling](#security--error-handling)
- [Getting Help](#getting-help)

---

## Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/bniceley50/mental-scribe-app.git
   cd mental-scribe-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Backend Configuration**

   - This project uses Lovable Cloud for backend services (authentication, database, storage)
   - Environment variables are automatically configured—no manual setup required
   - See `.env` for auto-generated Supabase connection details (do not edit manually)

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open the app**

   Visit the local development URL shown in your terminal (typically `http://localhost:5173`)

---

## Testing Workflow

Automated tests are essential for reliability and confidence in code changes.

- **Test Runner:** [Vitest](https://vitest.dev/)  
- **Component Testing:** [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- **Test Files:** Located in `src/components/__tests__/`, `src/lib/__tests__/`, and `src/constants/__tests__/`
- **Test Coverage:** Aim for 80%+ on critical logic and UI

### Commands

- Run all tests:
  ```bash
  npm test
  ```
- Run tests with UI:
  ```bash
  npm run test:ui
  ```
- View coverage report:
  ```bash
  npm run test:coverage
  ```

### Writing & Expanding Tests

- See [`docs/TEST_PLAN_ChatInterface.md`](docs/TEST_PLAN_ChatInterface.md) for detailed test cases and examples
- Write tests for new components or utilities you add
- Mocks: Use provided utility mocks for API and file interactions
- Follow existing test patterns in `__tests__` directories

#### Test Categories & Coverage

Mental Scribe has comprehensive test coverage across multiple categories:

1. **Authentication Tests** (`src/pages/__tests__/Auth.test.tsx`)
   - Email validation edge cases (whitespace, length limits, normalization)
   - Password complexity requirements
   - Account lockout after failed attempts
   - MFA code validation
   - Network error handling
   - Accessibility (ARIA labels, screen reader support)

2. **File Upload Tests** (`src/lib/__tests__/fileUpload.test.ts`)
   - File size validation (10MB limit)
   - PDF magic byte verification
   - XSS prevention via content sanitization
   - User-scoped file paths for security
   - Signed URL generation (not public URLs)
   - Storage quota handling
   - Path traversal attack prevention

3. **Consent Management Tests** (`src/components/__tests__/consent.test.tsx`)
   - Part 2 consent creation and validation
   - Expiration logic (null vs. future dates)
   - Revocation immutability
   - Disclosure purpose validation
   - Audit trail verification

4. **Accessibility Tests** (`src/components/__tests__/accessibility.test.tsx`)
   - ARIA compliance for all interactive elements
   - Keyboard navigation support
   - Screen reader announcements
   - Color contrast validation
   - Touch target sizes (44x44px minimum)
   - Focus management

#### Best Practices for Writing Tests

- **Edge Cases First**: Test boundary conditions (empty strings, max lengths, null values)
- **Security-Focused**: Validate sanitization, authentication, and authorization
- **Accessibility**: Include ARIA, keyboard, and screen reader tests for UI components
- **Descriptive Names**: Use `it('should reject email exceeding 255 characters')` not `it('test email')`
- **Arrange-Act-Assert**: Structure tests clearly with setup, execution, and verification
- **Mock External Dependencies**: Use vi.mock() for Supabase, toast, and external libraries

---

## Code Standards

- **Language:** TypeScript (required for all components and utilities)
- **Linting:** ESLint is configured; fix lint errors before committing
- **Formatting:** Consistent formatting enforced via Prettier
- **Documentation:** Use JSDoc for all exported functions and interfaces
- **Imports:** Use path aliases (e.g., `@/components/...`) for internal modules

### Code Quality Checklist

- ✅ TypeScript types defined for all props and functions
- ✅ JSDoc comments for exported utilities
- ✅ No console.log statements in production code
- ✅ Proper error handling with try/catch
- ✅ Input validation using Zod schemas

---

## Design System

Mental Scribe uses a semantic design system for consistent, maintainable styling.

- **UI Framework:** [shadcn/ui](https://ui.shadcn.com/) components
- **Styling:** Tailwind CSS with semantic tokens
- **Icons:** [Lucide React](https://lucide.dev/)
- **Theming:** Defined in `src/index.css` and `tailwind.config.ts`

### Design Guidelines

- **Use semantic tokens:** Always use CSS variables from `index.css` (e.g., `bg-background`, `text-foreground`) instead of hard-coded colors
- **Responsive design:** Use Tailwind's responsive utilities (`sm:`, `md:`, `lg:`)
- **Accessibility:** Follow WAI-ARIA guidelines; use semantic HTML
- **Dark mode:** All components must support dark mode via CSS variables

### Example

```tsx
// ❌ Don't use hard-coded colors
<Button className="bg-blue-500 text-white">

// ✅ Use semantic tokens
<Button variant="default">
```

---

## Branching & PR Strategy

- **Branching:**  
  - Use feature branches: `feature/your-change`, `fix/bug-description`
  - Keep branches up-to-date with `main`
  - Delete branches after merging

- **Commit Messages:**  
  - Use descriptive messages (e.g., `fix: sanitize exported content`, `feat: add session summary template`)
  - Follow conventional commits format

- **Pull Requests:**  
  - Reference related issues in PR description
  - Ensure all tests pass before requesting review
  - Add/expand tests for your changes
  - Update documentation if needed
  - Respond to feedback promptly

### PR Checklist

- [ ] All tests passing (`npm test`)
- [ ] New tests added for new features
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Accessibility tested

---

## Documentation & Resources

- **Release Notes:** [`CHANGELOG.md`](CHANGELOG.md), [`docs/RELEASE_v1.1.0.md`](docs/RELEASE_v1.1.0.md)
- **Test Plans:** [`docs/TEST_PLAN_ChatInterface.md`](docs/TEST_PLAN_ChatInterface.md)
- **Templates & Prompts:** [`src/constants/noteTemplates.ts`](src/constants/noteTemplates.ts), [`src/constants/examplePrompts.ts`](src/constants/examplePrompts.ts)

---

## Templates & Constants

Clinical note templates and example prompts are defined in dedicated constant files:

- **Note Templates:** `src/constants/noteTemplates.ts`
- **Example Prompts:** `src/constants/examplePrompts.ts`

When adding or modifying templates:

1. Follow the existing type structure
2. Include all required properties (`id`, `name`, `description`, `content`, `category`)
3. Add tests in corresponding `__tests__` directory
4. Use clinical terminology appropriately
5. Include placeholder syntax (`[...]`) for dynamic fields

---

## Security & Error Handling

Security and privacy are paramount in a healthcare application.

### Security Best Practices

- **Content Sanitization:** All user-generated content must be sanitized before export or rendering (using DOMPurify)
- **No PHI Storage:** Never log or store Protected Health Information
- **Input Validation:** Use Zod schemas for all form inputs
- **Secrets Management:** Never commit API keys or secrets to the repository
- **RLS Policies:** Backend uses Row Level Security for data access control
- **Password Security:** HIBP breach detection, password history prevention (last 5 passwords)
- **MFA Support:** Multi-factor authentication available for high-security accounts
- **Session Management:** 30-minute inactivity timeout, 12-hour absolute timeout recommended

### Security Testing

When adding security-sensitive features:
- **Input Validation Tests:** Cover edge cases (empty, null, malicious input)
- **Authentication Tests:** Verify proper error handling and lockout mechanisms
- **File Upload Tests:** Check MIME type validation, size limits, and signed URL generation
- **RLS Policy Tests:** Test with different user roles (admin, user, anonymous)
- **Accessibility Tests:** Use `jest-axe` for ARIA compliance checking

See [`docs/SECURITY_OPTIONAL_ENHANCEMENTS.md`](docs/SECURITY_OPTIONAL_ENHANCEMENTS.md) for latest security enhancements.

### Error Handling

- Use the `ErrorBoundary` component for critical UI sections
- Wrap new components with error boundaries as needed
- Provide user-friendly error messages
- Log errors appropriately (without exposing sensitive data)

### Example

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

---

## Getting Help

- **Issues:** Open a [GitHub Issue](https://github.com/bniceley50/mental-scribe-app/issues) for bugs or feature requests
- **Questions:** Review existing documentation and test plans first
- **Reviews:** Tag appropriate reviewers for design, security, or architecture discussions
- **Resources:** Check `docs/` directory for detailed guides and plans

---

## Recognition

Contributors will be recognized in release notes and project documentation. Thank you for helping make Mental Scribe better for mental health professionals!

---

**Built with ❤️ for mental health professionals**
