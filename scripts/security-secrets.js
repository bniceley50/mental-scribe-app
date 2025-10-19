// scripts/security-secrets.js
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const OUT = 'security/artifacts/dist-secrets.txt';

// Require 3 base64url-ish parts, each reasonably long
const JWT_RE = /(?<![A-Za-z0-9_-])([A-Za-z0-9_-]{8,})\.([A-Za-z0-9_-]{8,})\.([A-Za-z0-9_-]{8,})(?![A-Za-z0-9_-])/g;

// Heuristics to filter out obvious noise
function isLikelyJWT(token) {
  // most JWT headers start "eyJ" (= {" in base64url)
  if (!token.startsWith('eyJ')) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const b64 = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const header = JSON.parse(b64(parts[0]));
    const payload = JSON.parse(b64(parts[1]));
    // Expect an algorithm and a JSON payload
    if (!header || typeof header !== 'object' || !header.alg) return false;
    if (!payload || typeof payload !== 'object') return false;
    return true;
  } catch {
    return false;
  }
}

// Ignore noisy files
const EXCLUDE = [/\.map$/i, /vendor/i, /react(-dom)?\.production/i, /vite\./i];

let hits = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!p.startsWith(DIST) || EXCLUDE.some(rx => rx.test(p))) continue;
    const txt = fs.readFileSync(p, 'utf8');
    const m = [...txt.matchAll(JWT_RE)].map(x => x[0]).filter(isLikelyJWT);
    if (m.length) hits.push({ file: p.replace(/\\/g, '/'), count: m.length });
  }
}

if (fs.existsSync(DIST)) walk(DIST);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, hits.map(h => `${h.count}\t${h.file}`).join('\n'));
const total = hits.reduce((a, b) => a + b.count, 0);
console.log('JWT-like (likely) count:', total);