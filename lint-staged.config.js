/**
 * lint-staged configuration
 * Runs linting and type checking on staged files only
 */
export default {
  // TypeScript/TSX files - lint and type check
  '**/*.{ts,tsx}': (filenames) => [
    `eslint --fix ${filenames.join(' ')}`,
    'tsc --noEmit -p tsconfig.monorepo.json',
  ],

  // JavaScript/JSX files - lint only
  '**/*.{js,jsx,mjs,cjs}': (filenames) => [
    `eslint --fix ${filenames.join(' ')}`,
  ],

  // JSON files - validate syntax
  '**/*.json': (filenames) => [
    `eslint --fix ${filenames.join(' ')}`,
  ],

  // Markdown files - check for linting issues
  '**/*.md': (filenames) => [
    `eslint --fix ${filenames.join(' ')}`,
  ],
};
