import fs from 'fs';

function readJSON(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return null; } }
function readText(p, tailLines=0){
  try {
    const t = fs.readFileSync(p,'utf8');
    if(!tailLines) return t;
    const lines = t.split(/\r?\n/);
    return lines.slice(Math.max(0, lines.length-tailLines)).join('\n');
  } catch { return null; }
}
function exists(p){ try { fs.accessSync(p); return true; } catch { return false; } }

fs.mkdirSync('review', {recursive:true});

const summary = readJSON('security/summary.json');
const eslint   = readJSON('review/artifacts/eslint.json') || [];
const tscTail  = readText('review/artifacts/tsc.txt', 20) || 'N/A';
const buildLogTail = readText('review/artifacts/build.log', 30) || 'N/A';
const buildExit = (readText('review/artifacts/build-exit-code.txt')||'').trim();
const sizes    = readJSON('review/artifacts/dist-sizes.json');
const sourcemaps = readText('review/artifacts/sourcemaps.txt') || 'N/A';
const a11yJSON = readJSON('review/artifacts/a11y-results.json');
const a11yTxt  = readText('review/artifacts/a11y.txt');
const envCheck = (readText('review/artifacts/env-example-check.txt')||'').trim();
const ciGate   = readText('review/artifacts/ci-security-gate.txt') || 'N/A';
const testExcl = readText('review/artifacts/test-exclusion.txt') || 'N/A';

const securityPass = summary ? (summary.passed?.includes('csp_strict') && summary.passed?.includes('e2e_smoke') && summary.failed?.length===0 ? 'PASS' : 'PARTIAL/FAIL') : 'MISSING';
const eslintCount = Array.isArray(eslint) ? eslint.length : 0;
const bundleMB = sizes ? (sizes.total/1024/1024).toFixed(2) : 'N/A';
const largest = sizes?.files?.[0] ? `${sizes.files[0].file} (${(sizes.files[0].size/1024).toFixed(1)} KB)` : 'N/A';
const a11yStatus = a11yJSON ? 'Ran' : (a11yTxt?.startsWith('SKIPPED')?'SKIPPED':'N/A');

const executive = `
# Code Review: mental-scribe-app (chore/ci-hardening)

## Executive Summary
| Dimension      | Score / Status | Notes |
|----------------|----------------|-------|
| Security Proof | ${securityPass} | based on security/summary.json |
| Code Quality   | ${eslintCount===0?'A (0 ESLint items)':'See artifacts'} | tsc tail shows ${tscTail.includes('error')?'errors':'no errors seen in tail'} |
| Performance    | ${sizes?'Measured':'N/A'} | bundle total ~ ${bundleMB} MB, largest ${largest} |
| Accessibility  | ${a11yStatus} | see review/artifacts/a11y-* |
| DX             | ${(envCheck==='PASS'?'A':'Needs .env.example')} | CI gate check: ${ciGate.includes('MISSING')?'MISSING':'Present'} |

**Overall**: ${securityPass==='PASS' && eslintCount===0 && buildExit==='0' ? 'SHIP' : 'HOLD'}
`;

const topFindings = `
## Top Findings
- ESLint issues: ${eslintCount} (see \`review/artifacts/eslint.json\`)
- Build exit code: ${buildExit||'N/A'} (see \`review/artifacts/build.log\`)
- Source maps in dist: ${sourcemaps.trim()==='none'?'none':'present (review/artifacts/sourcemaps.txt)'}
`;

const artifacts = `
## Artifact Pointers
- \`security/summary.json\`
- \`review/artifacts/tsc.txt\`
- \`review/artifacts/eslint.json\`
- \`review/artifacts/build.log\`
- \`review/artifacts/dist-sizes.json\`
- \`review/artifacts/sourcemaps.txt\`
- \`review/artifacts/a11y-results.json\` or \`review/artifacts/a11y.txt\`
- \`review/artifacts/env-example-check.txt\`
- \`review/artifacts/ci-security-gate.txt\`
- \`review/artifacts/test-exclusion.txt\`
`;

const buildTailSec = `
## Build Log (last 30 lines)
\`\`\`
${buildLogTail}
\`\`\`
`;

fs.writeFileSync('review/REVIEW.md', [executive, topFindings, artifacts, buildTailSec].join('\n\n'));

const findings = [];
if (sourcemaps && sourcemaps.trim() !== 'none') {
  findings.push({
    id: 'F-BUNDLE-SOURCEMAPS',
    severity: 'medium',
    area: 'build',
    file: 'dist/*.map',
    message: 'Source maps present in production build',
    fix: 'Disable production sourcemaps in Vite config (build.sourcemap = false) or strip in CI.',
    evidencePath: 'review/artifacts/sourcemaps.txt'
  });
}
fs.writeFileSync('review/findings.json', JSON.stringify(findings, null, 2));
console.log('REVIEW.md and findings.json written.');