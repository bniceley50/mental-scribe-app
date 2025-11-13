#!/usr/bin/env node

/**
 * Comprehensive Code Review Automation Script
 * 
 * This script automates the comprehensive code review process outlined in
 * COMPREHENSIVE_CODE_REVIEW_PROMPT.md by running automated checks and
 * generating structured reports.
 * 
 * Usage:
 *   node scripts/comprehensive-review.mjs [options]
 * 
 * Options:
 *   --full          Run all checks (default)
 *   --security      Run only security checks
 *   --quality       Run only code quality checks
 *   --performance   Run only performance checks
 *   --output DIR    Output directory (default: review)
 */

import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Configuration
const config = {
  outputDir: 'review',
  artifactsDir: 'review/artifacts',
  timestamp: new Date().toISOString().split('T')[0],
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  full: args.includes('--full') || args.length === 0,
  security: args.includes('--security'),
  quality: args.includes('--quality'),
  performance: args.includes('--performance'),
  outputDir: args.includes('--output') ? args[args.indexOf('--output') + 1] : config.outputDir,
};

// Ensure output directories exist
function ensureDirectories() {
  [options.outputDir, `${options.outputDir}/artifacts`].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Helper function to run commands and capture output
async function runCommand(command, description) {
  console.log(`🔍 ${description}...`);
  try {
    const { stdout, stderr } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, stdout: error.stdout || '', stderr: error.stderr || error.message };
  }
}

// Helper to save results
function saveResult(filename, content) {
  const filepath = path.join(options.outputDir, 'artifacts', filename);
  fs.writeFileSync(filepath, content);
  console.log(`  ✅ Saved: ${filepath}`);
}

// Security Checks
async function runSecurityChecks() {
  console.log('\n📋 Running Security Checks...\n');
  const results = {};

  // 1. npm audit
  const audit = await runCommand('npm audit --json', 'Running npm audit');
  saveResult('npm-audit.json', audit.stdout);
  try {
    const auditData = JSON.parse(audit.stdout);
    results.vulnerabilities = {
      critical: auditData.metadata?.vulnerabilities?.critical || 0,
      high: auditData.metadata?.vulnerabilities?.high || 0,
      moderate: auditData.metadata?.vulnerabilities?.moderate || 0,
      low: auditData.metadata?.vulnerabilities?.low || 0,
    };
  } catch (e) {
    results.vulnerabilities = { error: 'Failed to parse npm audit' };
  }

  // 2. Check for hardcoded secrets
  const secrets = await runCommand(
    'rg "api.?key.*=.*[\'\\"]|secret.*=.*[\'\\"]|password.*=.*[\'\\"]" src/ --type ts --json || true',
    'Scanning for hardcoded secrets'
  );
  saveResult('secret-scan.txt', secrets.stdout);
  results.secrets = secrets.stdout.split('\n').filter(line => line.trim()).length;

  // 3. Check RLS on sensitive tables
  const rls = await runCommand(
    'rg "FORCE ROW LEVEL SECURITY" supabase/migrations/ || true',
    'Checking Row-Level Security'
  );
  saveResult('rls-check.txt', rls.stdout);
  const rlsCount = rls.stdout.split('\n').filter(line => line.includes('FORCE ROW LEVEL SECURITY')).length;
  results.rlsTables = rlsCount;

  // 4. Check for anonymous blocking policies
  const anonBlock = await runCommand(
    'rg "RESTRICTIVE.*FOR ALL.*USING \\(false\\)" supabase/migrations/ || true',
    'Checking anonymous blocking policies'
  );
  saveResult('anon-block-check.txt', anonBlock.stdout);
  results.anonBlockPolicies = anonBlock.stdout.split('\n').filter(line => line.includes('RESTRICTIVE')).length;

  // 5. Check for CSP headers in edge functions
  const csp = await runCommand(
    'rg "Content-Security-Policy" supabase/functions/ || true',
    'Checking CSP headers in edge functions'
  );
  saveResult('csp-check.txt', csp.stdout);
  const cspFiles = new Set(csp.stdout.split('\n')
    .filter(line => line.includes('Content-Security-Policy'))
    .map(line => line.split(':')[0]));
  results.cspFunctions = cspFiles.size;

  // 6. Check for localStorage usage (should be sessionStorage for PHI)
  const storage = await runCommand(
    'rg "localStorage\\." src/ --type ts || true',
    'Checking localStorage usage'
  );
  saveResult('storage-check.txt', storage.stdout);
  results.localStorageUsage = storage.stdout.split('\n').filter(line => line.trim()).length;

  return results;
}

// Code Quality Checks
async function runQualityChecks() {
  console.log('\n📋 Running Code Quality Checks...\n');
  const results = {};

  // 1. ESLint
  const eslint = await runCommand('npm run lint -- --format json || true', 'Running ESLint');
  saveResult('eslint.json', eslint.stdout);
  try {
    const eslintData = JSON.parse(eslint.stdout);
    const totalErrors = eslintData.reduce((sum, file) => sum + file.errorCount, 0);
    const totalWarnings = eslintData.reduce((sum, file) => sum + file.warningCount, 0);
    results.eslint = { errors: totalErrors, warnings: totalWarnings };
  } catch (e) {
    results.eslint = { error: 'Failed to parse ESLint output' };
  }

  // 2. TypeScript compilation
  const tsc = await runCommand('npm run type-check 2>&1 || true', 'Running TypeScript check');
  saveResult('tsc.txt', tsc.stdout);
  const tscErrors = (tsc.stdout.match(/error TS\d+:/g) || []).length;
  results.typescript = { errors: tscErrors };

  // 3. Check for 'any' types
  const anyTypes = await runCommand(
    'rg ": any|<any>|any\\[\\]" src/ --type ts || true',
    'Checking for any types'
  );
  saveResult('any-types.txt', anyTypes.stdout);
  results.anyTypes = anyTypes.stdout.split('\n').filter(line => line.trim()).length;

  // 4. Check component sizes
  const componentSizes = await runCommand(
    'find src/components -name "*.tsx" -exec wc -l {} \\; | sort -rn | head -20',
    'Analyzing component sizes'
  );
  saveResult('component-sizes.txt', componentSizes.stdout);
  const largeComponents = componentSizes.stdout.split('\n')
    .map(line => parseInt(line.trim().split(' ')[0]))
    .filter(size => size > 300);
  results.largeComponents = largeComponents.length;

  // 5. Check for TODO/FIXME
  const todos = await runCommand(
    'rg "TODO|FIXME|HACK|XXX" src/ || true',
    'Searching for TODOs and FIXMEs'
  );
  saveResult('todos.txt', todos.stdout);
  results.todos = todos.stdout.split('\n').filter(line => line.trim()).length;

  // 6. Check for console.log
  const consoleLogs = await runCommand(
    'rg "console\\.(log|debug|info)" src/ --type ts || true',
    'Checking for console.log statements'
  );
  saveResult('console-logs.txt', consoleLogs.stdout);
  results.consoleLogs = consoleLogs.stdout.split('\n').filter(line => line.trim()).length;

  return results;
}

// Performance Checks
async function runPerformanceChecks() {
  console.log('\n📋 Running Performance Checks...\n');
  const results = {};

  // 1. Build the project
  const build = await runCommand('npm run build 2>&1', 'Building project');
  saveResult('build.log', build.stdout);
  results.buildSuccess = build.success;

  if (build.success && fs.existsSync('dist')) {
    // 2. Analyze bundle size
    const distSizes = await runCommand(
      'find dist -type f -name "*.js" -exec du -b {} \\; | awk \'{sum+=$1} END {print sum}\'',
      'Calculating bundle size'
    );
    const totalBytes = parseInt(distSizes.stdout.trim());
    results.bundleSize = {
      bytes: totalBytes,
      mb: (totalBytes / 1024 / 1024).toFixed(2),
    };

    // 3. Check for source maps in production
    const sourceMaps = await runCommand(
      'find dist -name "*.map" || true',
      'Checking for source maps'
    );
    saveResult('sourcemaps.txt', sourceMaps.stdout);
    results.sourceMaps = sourceMaps.stdout.split('\n').filter(line => line.trim()).length;

    // 4. List largest files
    const largestFiles = await runCommand(
      'find dist -type f -exec du -h {} \\; | sort -rh | head -10',
      'Finding largest files'
    );
    saveResult('largest-files.txt', largestFiles.stdout);
  }

  // 5. Check for potential N+1 queries
  const n1Queries = await runCommand(
    'rg "\\.map\\(.*supabase|forEach.*supabase" src/ --type ts || true',
    'Checking for potential N+1 queries'
  );
  saveResult('n1-queries.txt', n1Queries.stdout);
  results.potentialN1Queries = n1Queries.stdout.split('\n').filter(line => line.trim()).length;

  return results;
}

// Generate comprehensive report
function generateReport(securityResults, qualityResults, performanceResults) {
  const report = `# Comprehensive Code Review Report

**Project**: mental-scribe-app
**Review Date**: ${config.timestamp}
**Reviewer**: Automated Review Script
**Report Type**: ${options.full ? 'Full' : [options.security && 'Security', options.quality && 'Quality', options.performance && 'Performance'].filter(Boolean).join(', ')}

## Executive Summary

This is an automated code review report generated using the Comprehensive Code Review Prompt.

## Security Analysis

${securityResults ? `
### Vulnerability Scan (npm audit)
- **Critical**: ${securityResults.vulnerabilities?.critical || 0}
- **High**: ${securityResults.vulnerabilities?.high || 0}
- **Moderate**: ${securityResults.vulnerabilities?.moderate || 0}
- **Low**: ${securityResults.vulnerabilities?.low || 0}

### Hardcoded Secrets
- **Potential secrets found**: ${securityResults.secrets || 0}

### Row-Level Security
- **Tables with FORCE RLS**: ${securityResults.rlsTables || 0}
- **Anonymous blocking policies**: ${securityResults.anonBlockPolicies || 0}

### Content Security Policy
- **Edge functions with CSP headers**: ${securityResults.cspFunctions || 0}

### Storage Security
- **localStorage usage instances**: ${securityResults.localStorageUsage || 0} ${securityResults.localStorageUsage > 0 ? '⚠️ Should use sessionStorage for PHI' : '✅'}
` : 'Not run'}

## Code Quality Analysis

${qualityResults ? `
### Linting
- **ESLint Errors**: ${qualityResults.eslint?.errors || 0}
- **ESLint Warnings**: ${qualityResults.eslint?.warnings || 0}

### Type Safety
- **TypeScript Errors**: ${qualityResults.typescript?.errors || 0}
- **'any' type usage**: ${qualityResults.anyTypes || 0} ${qualityResults.anyTypes > 10 ? '⚠️' : '✅'}

### Component Size
- **Large components (>300 lines)**: ${qualityResults.largeComponents || 0}

### Code Hygiene
- **TODO/FIXME comments**: ${qualityResults.todos || 0}
- **console.log statements**: ${qualityResults.consoleLogs || 0} ${qualityResults.consoleLogs > 0 ? '⚠️ Should be removed for production' : '✅'}
` : 'Not run'}

## Performance Analysis

${performanceResults ? `
### Build
- **Build Status**: ${performanceResults.buildSuccess ? '✅ Success' : '❌ Failed'}

${performanceResults.bundleSize ? `
### Bundle Size
- **Total Size**: ${performanceResults.bundleSize.mb} MB
- **Source Maps in dist**: ${performanceResults.sourceMaps} ${performanceResults.sourceMaps > 0 ? '⚠️ Should be disabled for production' : '✅'}
` : ''}

### Database Queries
- **Potential N+1 queries**: ${performanceResults.potentialN1Queries || 0} ${performanceResults.potentialN1Queries > 0 ? '⚠️ Review recommended' : '✅'}
` : 'Not run'}

## Recommendations

### Critical Priority
${securityResults?.vulnerabilities?.critical > 0 ? '- ⚠️ Fix critical npm vulnerabilities immediately' : ''}
${securityResults?.secrets > 0 ? '- ⚠️ Remove hardcoded secrets' : ''}
${performanceResults && !performanceResults.buildSuccess ? '- ⚠️ Fix build errors' : ''}

### High Priority
${securityResults?.vulnerabilities?.high > 0 ? '- Fix high severity npm vulnerabilities' : ''}
${qualityResults?.eslint?.errors > 0 ? '- Fix ESLint errors' : ''}
${qualityResults?.typescript?.errors > 0 ? '- Fix TypeScript errors' : ''}
${securityResults?.localStorageUsage > 0 ? '- Replace localStorage with sessionStorage for PHI data' : ''}

### Medium Priority
${qualityResults?.largeComponents > 0 ? '- Refactor large components (>300 lines)' : ''}
${qualityResults?.anyTypes > 10 ? '- Reduce usage of any types' : ''}
${performanceResults?.sourceMaps > 0 ? '- Disable source maps in production build' : ''}

### Low Priority
${qualityResults?.consoleLogs > 0 ? '- Remove console.log statements' : ''}
${qualityResults?.todos > 0 ? '- Address TODO/FIXME comments' : ''}

## Overall Assessment

**Grade**: ${getOverallGrade(securityResults, qualityResults, performanceResults)}

**Ship Decision**: ${getShipDecision(securityResults, qualityResults, performanceResults)}

---

**Detailed artifacts available in**: \`${options.outputDir}/artifacts/\`

**Review Methodology**: See \`COMPREHENSIVE_CODE_REVIEW_PROMPT.md\`
`;

  return report;
}

// Calculate overall grade
function getOverallGrade(security, quality, performance) {
  let score = 100;

  if (security) {
    score -= (security.vulnerabilities?.critical || 0) * 20;
    score -= (security.vulnerabilities?.high || 0) * 10;
    score -= (security.secrets || 0) * 5;
  }

  if (quality) {
    score -= (quality.eslint?.errors || 0) * 2;
    score -= (quality.typescript?.errors || 0) * 2;
    score -= (quality.anyTypes || 0) * 0.5;
  }

  if (performance && !performance.buildSuccess) {
    score -= 30;
  }

  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
}

// Determine ship decision
function getShipDecision(security, quality, performance) {
  const critical = security?.vulnerabilities?.critical || 0;
  const buildFailed = performance && !performance.buildSuccess;

  if (critical > 0 || buildFailed) {
    return '🛑 BLOCKED - Critical issues must be resolved';
  }

  const high = security?.vulnerabilities?.high || 0;
  const eslintErrors = quality?.eslint?.errors || 0;

  if (high > 0 || eslintErrors > 5) {
    return '⚠️ APPROVED WITH CONDITIONS - Address high priority issues within 1 week';
  }

  return '✅ APPROVED - Good to ship';
}

// Main execution
async function main() {
  console.log('🚀 Starting Comprehensive Code Review...\n');
  ensureDirectories();

  let securityResults = null;
  let qualityResults = null;
  let performanceResults = null;

  if (options.full || options.security) {
    securityResults = await runSecurityChecks();
  }

  if (options.full || options.quality) {
    qualityResults = await runQualityChecks();
  }

  if (options.full || options.performance) {
    performanceResults = await runPerformanceChecks();
  }

  // Generate and save report
  const report = generateReport(securityResults, qualityResults, performanceResults);
  const reportPath = path.join(options.outputDir, `review-${config.timestamp}.md`);
  fs.writeFileSync(reportPath, report);

  console.log(`\n✅ Review complete! Report saved to: ${reportPath}`);
  console.log(`📁 Artifacts saved in: ${options.outputDir}/artifacts/`);

  // Also save as JSON for programmatic access
  const jsonReport = {
    timestamp: config.timestamp,
    security: securityResults,
    quality: qualityResults,
    performance: performanceResults,
  };
  const jsonPath = path.join(options.outputDir, `review-${config.timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));

  console.log(`\n📊 View the report:\n`);
  console.log(report);
}

main().catch(error => {
  console.error('❌ Error running review:', error);
  process.exit(1);
});
