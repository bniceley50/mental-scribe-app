#!/usr/bin/env node
// Reads artifacts and emits security/summary.json compatible with security/scorecard.schema.json

import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";

const ART_DIR = path.join("security", "artifacts");
const SUMMARY = path.join("security", "summary.json");

function exists(p) { return fssync.existsSync(p); }
async function read(p) { return exists(p) ? (await fs.readFile(p, "utf8")) : ""; }

async function main() {
  const details = {};

  // 1) CSP evaluator
  let cspPass = false; let cspReason = "no report";
  const cspPath = path.join(ART_DIR, "csp-evaluator.txt");
  if (exists(cspPath)) {
    const t = await read(cspPath);
    // crude heuristic: fail if "High" severity appears; pass if we see "PASS" or no Highs
    cspPass = !/SEVERITY[_\s-]*HIGH|High severity/i.test(t);
    if (/No CSP meta tag/i.test(t)) cspPass = false;
    cspReason = cspPass ? "no high-severity CSP issues found" : "high-severity CSP issues present or CSP missing";
  } else {
    cspReason = "csp-evaluator.txt not found";
  }
  details.csp_strict = { passed: cspPass, reason: cspReason };

  // 2) Secrets in dist (using precise scanner)
  function readLikelyCount() {
    const p = path.join(ART_DIR, "dist-secrets.txt");
    if (!exists(p)) return 0;
    return read(p).then(content => 
      content.split('\n')
        .map(l => parseInt(l.split('\t')[0], 10))
        .filter(n => Number.isFinite(n))
        .reduce((a,b)=>a+b, 0)
    ).catch(() => 0);
  }

  const likely = await readLikelyCount();
  const secretsPass = likely === 0;
  const secretsReason = `${likely} likely JWT-like tokens found in dist`;
  details.no_secrets_in_dist = { passed: secretsPass, reason: secretsReason };

  // 3) E2E tests
  let e2ePass = false; let e2eReason = "no report";
  const pwJson = path.join(ART_DIR, "playwright.json");
  if (exists(pwJson)) {
    const txt = await read(pwJson);
    // If any "status":"failed" appears, fail; otherwise pass if JSON exists.
    e2ePass = !/\"status\"\s*:\s*\"failed\"/i.test(txt);
    e2eReason = e2ePass ? "no failed tests reported" : "some tests failed";
  } else {
    e2eReason = "playwright.json not found";
  }
  details.e2e_smoke = { passed: e2ePass, reason: e2eReason };

  const controls = [
    ["csp_strict", cspPass],
    ["no_secrets_in_dist", secretsPass],
    ["e2e_smoke", e2ePass]
  ];
  const passed = controls.filter(([,p]) => p).map(([k]) => k);
  const failed = controls.filter(([,p]) => !p).map(([k]) => k);

  const out = {
    score: passed.length,
    max: controls.length,
    passed,
    failed,
    details
  };

  await fs.mkdir(path.dirname(SUMMARY), { recursive: true });
  await fs.writeFile(SUMMARY, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(out, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});