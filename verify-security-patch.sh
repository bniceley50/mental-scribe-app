#!/bin/bash

# Security Compliance Patch - Verification Script
# Run this script after deployment to verify all security measures are in place

echo "════════════════════════════════════════════════════════════════════"
echo "   Security Compliance Patch - Post-Deployment Verification"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
ALL_CHECKS_PASSED=true

# Function to print check result
print_check() {
  local name=$1
  local passed=$2
  if [ "$passed" = true ]; then
    echo -e "${GREEN}✅ PASS${NC}: $name"
  else
    echo -e "${RED}❌ FAIL${NC}: $name"
    ALL_CHECKS_PASSED=false
  fi
}

echo "1. Checking .env file status..."
echo "─────────────────────────────────────────────────────────────────"

# Check 1: .env not tracked in git
if ! git ls-files | grep -q "^\.env$"; then
  print_check ".env not tracked in git" true
else
  print_check ".env not tracked in git" false
fi

# Check 2: .env in .gitignore
if grep -q "^\.env$" .gitignore 2>/dev/null || grep -q "^\.env$" .gitignore 2>/dev/null; then
  print_check ".env in .gitignore" true
else
  print_check ".env in .gitignore" false
fi

# Check 3: .env.example exists
if [ -f .env.example ]; then
  print_check ".env.example exists" true
else
  print_check ".env.example exists" false
fi

echo ""
echo "2. Checking PHI redaction utilities..."
echo "─────────────────────────────────────────────────────────────────"

# Check 4: Edge function utility exists
if [ -f supabase/functions/utils/redactPHI.ts ]; then
  print_check "Edge function redactPHI utility exists" true
else
  print_check "Edge function redactPHI utility exists" false
fi

# Check 5: Shared TypeScript utility exists
if [ -f src/lib/phi/redactPHI.ts ]; then
  print_check "Shared redactPHI utility exists" true
else
  print_check "Shared redactPHI utility exists" false
fi

# Check 6: PHI redaction in analyze-field
if grep -q "redactPHI" supabase/functions/analyze-field/index.ts 2>/dev/null; then
  print_check "PHI redaction in analyze-field" true
else
  print_check "PHI redaction in analyze-field" false
fi

# Check 7: PHI redaction in analyze-clinical-notes
if grep -q "redactPHI" supabase/functions/analyze-clinical-notes/index.ts 2>/dev/null; then
  print_check "PHI redaction in analyze-clinical-notes" true
else
  print_check "PHI redaction in analyze-clinical-notes" false
fi

echo ""
echo "3. Checking signed URL configuration..."
echo "─────────────────────────────────────────────────────────────────"

# Check 8: Signed URL TTL is 60 seconds
if grep -q "SIGNED_URL_EXPIRY = 60" src/lib/signedUrls.ts 2>/dev/null; then
  print_check "Signed URL TTL set to 60 seconds" true
else
  print_check "Signed URL TTL set to 60 seconds" false
fi

echo ""
echo "4. Checking test coverage..."
echo "─────────────────────────────────────────────────────────────────"

# Check 9: PHI redaction tests exist
if [ -f src/lib/__tests__/redactPHI.test.ts ]; then
  print_check "PHI redaction tests exist" true
else
  print_check "PHI redaction tests exist" false
fi

# Check 10: Tests can run (if npx vitest is available)
if command -v npx &> /dev/null; then
  echo "Running tests..."
  if npx vitest run src/lib/__tests__/redactPHI.test.ts src/lib/__tests__/signedUrls.test.ts --run 2>&1 | grep -q "37 passed"; then
    print_check "All tests passing (37/37)" true
  else
    print_check "All tests passing (37/37)" false
  fi
else
  echo -e "${YELLOW}⚠️  SKIP${NC}: Tests not run (npx vitest not available)"
fi

echo ""
echo "5. Checking documentation..."
echo "─────────────────────────────────────────────────────────────────"

# Check 11: SECURITY.md updated
if grep -q "2025-10-13: Security Compliance Patch" SECURITY.md 2>/dev/null; then
  print_check "SECURITY.md updated" true
else
  print_check "SECURITY.md updated" false
fi

# Check 12: Validation guide exists
if [ -f SECURITY_PATCH_VALIDATION.md ]; then
  print_check "Validation guide exists" true
else
  print_check "Validation guide exists" false
fi

# Check 13: Implementation summary exists
if [ -f IMPLEMENTATION_SUMMARY.md ]; then
  print_check "Implementation summary exists" true
else
  print_check "Implementation summary exists" false
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
if [ "$ALL_CHECKS_PASSED" = true ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
  echo ""
  echo "Security compliance patch successfully implemented!"
  echo ""
  echo "Next steps:"
  echo "1. Rotate any exposed API keys (see SECURITY.md)"
  echo "2. Deploy edge functions"
  echo "3. Test PHI redaction in production"
  echo "4. Monitor logs for any issues"
  exit 0
else
  echo -e "${RED}❌ SOME CHECKS FAILED${NC}"
  echo ""
  echo "Please review the failed checks and ensure all security measures"
  echo "are properly implemented before deploying to production."
  exit 1
fi
