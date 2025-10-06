# Test Coverage Setup & Monitoring

## Overview

Mental Scribe uses **Vitest** with built-in coverage reporting via **v8** (default) or **istanbul** for comprehensive test coverage metrics.

## Current Test Configuration

**File:** `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.{ts,tsx}',
        'src/integrations/supabase/types.ts'
      ],
      include: ['src/**/*.{ts,tsx}'],
      all: true,
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

## Running Tests with Coverage

### Generate Coverage Report

```bash
# Run all tests with coverage
npm run test:coverage

# Or using Vitest directly
npx vitest run --coverage
```

### Watch Mode with Coverage

```bash
# Watch mode (no coverage)
npm test

# Watch mode with coverage updates
npx vitest --coverage
```

### Coverage Output

Coverage reports are generated in multiple formats:

```
coverage/
├── index.html           # Interactive HTML report
├── lcov.info           # LCOV format (for CI/badges)
├── coverage-final.json # JSON format
└── lcov-report/        # Detailed HTML reports
```

**View HTML Report:**
```bash
open coverage/index.html
```

## Coverage Thresholds

**Current Thresholds:** 70% for all metrics

| Metric | Threshold | Description |
|--------|-----------|-------------|
| **Lines** | 70% | Percentage of executed code lines |
| **Functions** | 70% | Percentage of called functions |
| **Branches** | 70% | Percentage of executed conditional branches |
| **Statements** | 70% | Percentage of executed statements |

**Adjust Thresholds:**
```typescript
// vitest.config.ts
coverage: {
  lines: 80,      // Increase to 80%
  functions: 75,
  branches: 70,
  statements: 80
}
```

## Adding Coverage Badges to README

### Option 1: Codecov (Recommended)

**1. Sign up:** https://codecov.io  
**2. Install:** `npm install --save-dev @codecov/vite-plugin`

**3. Add to `vite.config.ts`:**
```typescript
import { defineConfig } from 'vite'
import codecov from '@codecov/vite-plugin'

export default defineConfig({
  plugins: [
    codecov({
      uploadToken: process.env.CODECOV_TOKEN
    })
  ]
})
```

**4. Update README.md:**
```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/mental-scribe-app/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/mental-scribe-app)
```

### Option 2: Coveralls

**1. Sign up:** https://coveralls.io  
**2. Install:** `npm install --save-dev coveralls`

**3. Add script to `package.json`:**
```json
{
  "scripts": {
    "coverage:upload": "cat ./coverage/lcov.info | coveralls"
  }
}
```

**4. Add badge to README:**
```markdown
[![Coverage Status](https://coveralls.io/repos/github/YOUR_USERNAME/mental-scribe-app/badge.svg?branch=main)](https://coveralls.io/github/YOUR_USERNAME/mental-scribe-app?branch=main)
```

### Option 3: Shields.io (Self-Hosted)

**1. Generate `coverage/badge.json`:**

Create `scripts/generate-coverage-badge.js`:
```javascript
const fs = require('fs')
const coverage = require('../coverage/coverage-final.json')

const calculateCoverage = (data) => {
  let total = 0
  let covered = 0
  
  Object.values(data).forEach(file => {
    total += file.s ? Object.keys(file.s).length : 0
    covered += file.s ? Object.values(file.s).filter(v => v > 0).length : 0
  })
  
  return Math.round((covered / total) * 100)
}

const percentage = calculateCoverage(coverage)
const color = percentage >= 80 ? 'brightgreen' : percentage >= 70 ? 'yellow' : 'red'

const badge = {
  schemaVersion: 1,
  label: 'coverage',
  message: `${percentage}%`,
  color: color
}

fs.writeFileSync('coverage/badge.json', JSON.stringify(badge))
```

**2. Add to `package.json`:**
```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage && node scripts/generate-coverage-badge.js"
  }
}
```

**3. Add badge to README:**
```markdown
![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/YOUR_USERNAME/mental-scribe-app/main/coverage/badge.json)
```

### Option 4: Manual Badge (Simple)

**Add to README.md:**
```markdown
![Coverage](https://img.shields.io/badge/coverage-70%25-yellow)
```

**Update manually after each coverage run.**

## CI/CD Integration

### GitHub Actions Example

**`.github/workflows/test.yml`:**
```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with coverage
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: true
      
      - name: Comment PR with coverage
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Improving Test Coverage

### Identify Untested Code

```bash
# Generate coverage and view HTML report
npm run test:coverage
open coverage/index.html
```

**Red = Not covered  
Yellow = Partially covered  
Green = Fully covered**

### Coverage Report Example

```
---------------------------|---------|----------|---------|---------|
File                       | % Stmts | % Branch | % Funcs | % Lines |
---------------------------|---------|----------|---------|---------|
All files                  |   72.15 |    68.42 |   71.23 |   72.15 |
 src                       |     100 |      100 |     100 |     100 |
  App.tsx                  |     100 |      100 |     100 |     100 |
  main.tsx                 |     100 |      100 |     100 |     100 |
 src/components            |   68.92 |    64.28 |   66.67 |   68.92 |
  ChatInterface.tsx        |   85.71 |    77.78 |   83.33 |   85.71 |
  ErrorBoundary.tsx        |     100 |      100 |     100 |     100 |
  VoiceInput.tsx           |   45.45 |    33.33 |      40 |   45.45 |  ← LOW
 src/lib                   |   78.26 |    72.22 |   80.00 |   78.26 |
  openai.ts                |      75 |    66.67 |   77.78 |      75 |
  utils.ts                 |     100 |      100 |     100 |     100 |
---------------------------|---------|----------|---------|---------|
```

### Priority Testing Targets

**1. Critical Business Logic:**
- Authentication flows
- Payment processing
- Data validation
- Security functions

**2. High-Risk Areas:**
- Edge functions
- RLS policy helpers
- Data export/import
- File upload handlers

**3. Commonly Used Utilities:**
- Date formatting
- Data transformers
- API client wrappers

### Writing Tests for Uncovered Code

**Example: Testing `lib/openai.ts`**

```typescript
// src/lib/__tests__/openai.test.ts
import { describe, it, expect, vi } from 'vitest'
import { generateNote } from '../openai'

describe('openai', () => {
  describe('generateNote', () => {
    it('should generate a clinical note from messages', async () => {
      const messages = [
        { role: 'user' as const, content: 'Patient reports anxiety.' }
      ]
      
      const note = await generateNote(messages)
      
      expect(note).toBeDefined()
      expect(note).toContain('anxiety')
    })
    
    it('should handle API errors gracefully', async () => {
      const messages = []
      
      await expect(generateNote(messages)).rejects.toThrow()
    })
  })
})
```

## Test Coverage Best Practices

### 1. Focus on Critical Paths

**Priority Order:**
1. Authentication & Authorization
2. Data mutations (Create, Update, Delete)
3. Edge functions
4. Business logic
5. Utility functions
6. UI components (interaction-focused)

### 2. Avoid Testing Implementation Details

```typescript
// ❌ Bad: Testing internal state
expect(component.state.isOpen).toBe(true)

// ✅ Good: Testing behavior
expect(screen.getByRole('dialog')).toBeInTheDocument()
```

### 3. Use Data-Driven Tests

```typescript
describe.each([
  { input: 'john@example.com', expected: true },
  { input: 'invalid-email', expected: false },
  { input: '', expected: false }
])('validateEmail($input)', ({ input, expected }) => {
  it(`should return ${expected}`, () => {
    expect(validateEmail(input)).toBe(expected)
  })
})
```

### 4. Mock External Dependencies

```typescript
// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  }
}))

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({ choices: [{ message: { content: 'Test' } }] })
      }
    }
  }))
}))
```

### 5. Test Error States

```typescript
it('should display error message when fetch fails', async () => {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } })
  })
  
  render(<ClientsList />)
  
  expect(await screen.findByText(/network error/i)).toBeInTheDocument()
})
```

## Coverage Reports in README

### Example Coverage Summary Table

Add to `README.md`:

```markdown
## Test Coverage

| Metric | Coverage | Target |
|--------|----------|--------|
| Lines | ![Coverage](https://img.shields.io/badge/coverage-72%25-yellow) | 70% |
| Branches | ![Coverage](https://img.shields.io/badge/coverage-68%25-yellow) | 70% |
| Functions | ![Coverage](https://img.shields.io/badge/coverage-71%25-yellow) | 70% |
| Statements | ![Coverage](https://img.shields.io/badge/coverage-72%25-yellow) | 70% |

**Last Updated:** October 6, 2025

<details>
<summary>View detailed coverage report</summary>

```
File                       | % Stmts | % Branch | % Funcs | % Lines |
---------------------------|---------|----------|---------|---------|
All files                  |   72.15 |    68.42 |   71.23 |   72.15 |
 components/               |   68.92 |    64.28 |   66.67 |   68.92 |
  ChatInterface.tsx        |   85.71 |    77.78 |   83.33 |   85.71 |
  ErrorBoundary.tsx        |     100 |      100 |     100 |     100 |
 lib/                      |   78.26 |    72.22 |   80.00 |   78.26 |
  openai.ts                |      75 |    66.67 |   77.78 |      75 |
```

</details>
```

## Monitoring Coverage Over Time

### Track Coverage Trends

**1. Store coverage history:**
```bash
# Add to package.json scripts
"coverage:save": "cp coverage/coverage-summary.json coverage/history/$(date +%Y%m%d).json"
```

**2. Generate trend chart:**
Use tools like **codecov.io** or **coveralls.io** for automatic trend visualization.

### Set Coverage Gates

**Fail CI if coverage drops:**
```typescript
// vitest.config.ts
coverage: {
  lines: 70,
  functions: 70,
  branches: 70,
  statements: 70,
  thresholdAutoUpdate: false  // Prevent auto-lowering
}
```

**GitHub Action:**
```yaml
- name: Check coverage thresholds
  run: |
    npm run test:coverage
    if [ $? -ne 0 ]; then
      echo "Coverage thresholds not met"
      exit 1
    fi
```

## Excluding Files from Coverage

**Already Excluded:**
- `node_modules/`
- Test files (`**/*.test.{ts,tsx}`)
- Type definitions (`**/*.d.ts`)
- Config files (`**/*.config.*`)
- Auto-generated types (`src/integrations/supabase/types.ts`)

**Add Custom Exclusions:**
```typescript
// vitest.config.ts
coverage: {
  exclude: [
    // ... existing excludes
    'src/components/ui/**',  // Exclude shadcn/ui components
    'src/mockData/**',       // Exclude mock data
    'src/**/*.stories.tsx'   // Exclude Storybook stories
  ]
}
```

## Next Steps

1. **Run baseline coverage:** `npm run test:coverage`
2. **Choose badge provider:** Codecov (recommended) or manual
3. **Update README.md** with coverage badges
4. **Set up CI/CD** with coverage reporting
5. **Create testing plan** to improve low-coverage areas
6. **Schedule quarterly reviews** to maintain coverage targets

---

**Test Framework:** Vitest v3.2.4  
**Coverage Provider:** v8 (default)  
**Last Updated:** October 6, 2025
