#!/usr/bin/env node
// Orchestrates: serve dist, run Playwright, scan dist for secrets, evaluate CSP.
// Writes artifacts under security/artifacts and leaves summary to security-score.mjs

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";

const isWin = process.platform === "win32";
const NPX = isWin ? "npx.cmd" : "npx";
const ART_DIR = path.join("security", "artifacts");
const DIST = "dist";

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }
function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const ps = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"], ...opts });
    let out = "", err = "";
    ps.stdout.on("data", (d) => (out += d.toString()));
    ps.stderr.on("data", (d) => (err += d.toString()));
    ps.on("close", (code) => resolve({ code, out, err }));
  });
}

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

async function scanDistSecrets() {
  await ensureDir(ART_DIR);
  const outFile = path.join(ART_DIR, "dist-secrets.txt");
  const exts = new Set([".js", ".html", ".css", ".map"]);
  let total = 0;
  let lines = [];
  if (!fssync.existsSync(DIST)) {
    await fs.writeFile(outFile, "dist/ not found\n", "utf8");
    return { total: 0 };
  }
  const files = (await walk(DIST)).filter((p) => exts.has(path.extname(p)));
  const reJWT = /([A-Za-z0-9_-]+\.){2}[A-Za-z0-9_-]+/g;
  for (const f of files) {
    const txt = await fs.readFile(f, "utf8").catch(() => "");
    if (!txt) continue;
    const matches = txt.match(reJWT) || [];
    if (matches.length) {
      total += matches.length;
      lines.push(`${f}: ${matches.length}`);
      // write some examples for debugging (not PHI; build artifacts only)
      for (const m of matches.slice(0, 3)) lines.push(`  • ${m}`);
    }
  }
  if (lines.length === 0) lines = ["No JWT-like tokens found"];
  lines.unshift(`Total matches: ${total}`);
  await fs.writeFile(outFile, lines.join("\n") + "\n", "utf8");
  return { total };
}

async function evaluateCSP() {
  await ensureDir(ART_DIR);
  const outFile = path.join(ART_DIR, "csp-evaluator.txt");
  const indexHtml = path.join(DIST, "index.html");
  if (!fssync.existsSync(indexHtml)) {
    await fs.writeFile(outFile, "dist/index.html not found\n", "utf8");
    return { code: 1 };
  }
  const html = await fs.readFile(indexHtml, "utf8");
  const m = html.match(/http-equiv=["']Content-Security-Policy["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/content=["']([^"']+)["'][^>]*http-equiv=["']Content-Security-Policy["']/i);
  if (!m) {
    await fs.writeFile(outFile, "No CSP meta tag found in dist/index.html\n", "utf8");
    return { code: 1 };
  }
  const csp = m[1];
  
  // Simple CSP analysis since csp-evaluator package doesn't exist
  const analysis = [];
  analysis.push(`# CSP Analysis\n`);
  analysis.push(`CSP: ${csp}\n`);
  
  // Basic checks
  if (csp.includes("'unsafe-inline'")) {
    analysis.push("❌ SEVERITY HIGH: 'unsafe-inline' found - allows inline scripts");
  }
  if (csp.includes("'unsafe-eval'")) {
    analysis.push("❌ SEVERITY HIGH: 'unsafe-eval' found - allows eval()");
  }
  if (csp.includes("*")) {
    analysis.push("⚠️  SEVERITY MEDIUM: Wildcard (*) found in CSP");
  }
  if (!csp.includes("default-src")) {
    analysis.push("⚠️  SEVERITY MEDIUM: No default-src directive");
  }
  
  const hasIssues = analysis.some(line => line.includes("SEVERITY HIGH"));
  if (!hasIssues) {
    analysis.push("✅ No high-severity CSP issues detected");
  }
  
  await fs.writeFile(outFile, analysis.join("\n") + "\n", "utf8");
  return { code: hasIssues ? 1 : 0 };
}

let serverProc;
async function startServer() {
  await ensureDir(ART_DIR);
  if (!fssync.existsSync(DIST)) {
    return { started: false, reason: "dist/ not found (build first)" };
  }
  serverProc = spawn(NPX, ["serve", "-s", "dist", "-l", "4173"], { detached: true, stdio: "ignore" });
  serverProc.unref();
  await new Promise((r) => setTimeout(r, 1500));
  return { started: true };
}
function stopServer() {
  try {
    if (!serverProc) return;
    if (isWin) process.kill(serverProc.pid);
    else process.kill(-serverProc.pid);
  } catch {}
}

async function runPlaywright() {
  await ensureDir(ART_DIR);
  const env = { ...process.env, BASE_URL: process.env.BASE_URL || "http://localhost:4173" };
  const { code, out, err } = await run(NPX, ["playwright", "test", "--reporter=json"], { env });
  // The reporter already writes security/artifacts/playwright.json via config
  const logPath = path.join(ART_DIR, "playwright-run.log");
  await fs.writeFile(logPath, out + (err ? `\n[stderr]\n${err}` : ""), "utf8");
  return { code };
}

async function main() {
  await ensureDir(ART_DIR);
  const mode = process.argv[2] || "all";
  const results = {};

  if (mode === "all" || mode === "scan") {
    results.secrets = await scanDistSecrets();
    results.csp = await evaluateCSP();
  }
  if (mode === "all" || mode === "e2e") {
    const srv = await startServer();
    results.server = srv;
    if (srv.started) {
      results.playwright = await runPlaywright();
      stopServer();
    }
  }
  // dump a small status file for debugging
  await fs.writeFile(path.join(ART_DIR, "run-all-proof.status.json"), JSON.stringify(results, null, 2));
  if (results.playwright?.code > 0) process.exitCode = results.playwright.code;
}
process.on("exit", stopServer);
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});