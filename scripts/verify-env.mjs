// scripts/verify-env.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_OPENAI_API_BASE" // or KEY if you use server-side proxy
];

const OPTIONAL = [
  "BAA_SIGNED", 
  "VITE_ENABLE_PHI_REDACTION",
  "VITE_API_BASE_URL",
  "VITE_FEATURE_FLAGS"
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dotenvPath = path.resolve(root, ".env");

// Load .env file if it exists (minimal parser to avoid dependencies)
if (fs.existsSync(dotenvPath)) {
  const lines = fs.readFileSync(dotenvPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      // Remove quotes if present
      const value = match[2].replace(/^["']|["']$/g, '');
      process.env[match[1]] = value;
    }
  }
}

// Check for missing required variables
const missing = REQUIRED.filter(key => !process.env[key] || process.env[key] === ""); 

if (missing.length) {
  console.error("❌ Missing required environment variables:");
  missing.forEach(key => console.error(` - ${key}`));
  console.error("\nPlease check your .env file or environment configuration.");
  console.error("See .env.example for required variables.");
  process.exit(1);
}

// Report status
const presentOptional = OPTIONAL.filter(key => !!process.env[key]);
console.log("✅ Environment validation passed!");
console.log(`📋 Required variables: ${REQUIRED.length}/${REQUIRED.length} present`);
if (presentOptional.length > 0) {
  console.log(`🔧 Optional variables present: ${presentOptional.join(", ")}`);
} else {
  console.log("🔧 Optional variables present: none");
}