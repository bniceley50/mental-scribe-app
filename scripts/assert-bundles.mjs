// scripts/assert-bundles.mjs
import fs from "node:fs"; 
import path from "node:path"; 
import zlib from "node:zlib";

const dist = path.resolve("dist/assets");

// Bundle size budgets (in bytes, gzipped)
const budgets = [
  { pattern: /^index-.*\.js$/, maxGzip: 180 * 1024, name: "Main App Bundle" },
  { pattern: /^(vendor|react|ui)-.*\.js$/, maxGzip: 350 * 1024, name: "Vendor Bundles" },
  { pattern: /^.*\.css$/, maxGzip: 50 * 1024, name: "CSS Bundles" }
];

if (!fs.existsSync(dist)) {
  console.error("❌ dist/assets directory not found. Run 'npm run build' first.");
  process.exit(1);
}

let failed = false;
const results = [];

console.log("📦 Checking bundle size budgets...\n");

for (const file of fs.readdirSync(dist)) {
  if (!file.endsWith(".js") && !file.endsWith(".css")) continue;
  
  const filePath = path.join(dist, file);
  const stats = fs.statSync(filePath);
  const gzipped = zlib.gzipSync(fs.readFileSync(filePath));
  const gzipSize = gzipped.length;
  
  // Check against budgets
  for (const budget of budgets) {
    if (budget.pattern.test(file)) {
      const status = gzipSize <= budget.maxGzip ? "✅" : "❌";
      const percentage = ((gzipSize / budget.maxGzip) * 100).toFixed(1);
      
      results.push({
        file,
        size: stats.size,
        gzipSize,
        budget: budget.maxGzip,
        budgetName: budget.name,
        status,
        percentage
      });
      
      if (gzipSize > budget.maxGzip) {
        console.error(`❌ ${file}`);
        console.error(`   Size: ${(gzipSize / 1024).toFixed(1)}KB gzipped`);
        console.error(`   Budget: ${(budget.maxGzip / 1024).toFixed(1)}KB (${budget.name})`);
        console.error(`   Exceeded by: ${((gzipSize - budget.maxGzip) / 1024).toFixed(1)}KB\n`);
        failed = true;
      } else {
        console.log(`✅ ${file}`);
        console.log(`   Size: ${(gzipSize / 1024).toFixed(1)}KB gzipped (${percentage}% of budget)`);
        console.log(`   Budget: ${(budget.maxGzip / 1024).toFixed(1)}KB (${budget.name})\n`);
      }
      break;
    }
  }
}

// Summary
console.log("📊 Bundle Size Summary:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

const totalSize = results.reduce((sum, r) => sum + r.gzipSize, 0);
const totalBudget = results.reduce((sum, r) => sum + r.budget, 0);
const overallPercentage = ((totalSize / totalBudget) * 100).toFixed(1);

console.log(`Total Bundle Size: ${(totalSize / 1024).toFixed(1)}KB gzipped`);
console.log(`Total Budget: ${(totalBudget / 1024).toFixed(1)}KB`);
console.log(`Budget Utilization: ${overallPercentage}%`);

if (failed) {
  console.error("\n❌ Bundle size budget exceeded!");
  console.error("Consider:");
  console.error("  - Code splitting large dependencies");
  console.error("  - Tree-shaking unused imports");
  console.error("  - Using dynamic imports for heavy features");
  console.error("  - Analyzing bundle with 'npm run build -- --analyze'");
  process.exit(1);
}

console.log("\n✅ All bundle budgets within limits!");

// Save results for CI artifacts
const reportPath = path.resolve("dist/bundle-report.json");
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  totalSize,
  totalBudget,
  budgetUtilization: overallPercentage,
  files: results
}, null, 2));

console.log(`📋 Bundle report saved to: ${reportPath}`);