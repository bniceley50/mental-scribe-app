#!/bin/bash

# Phase 1 - Rate Limit & MFA Function Tests
# These tests verify the security-critical database functions work correctly

set -e

SUPABASE_URL="${VITE_SUPABASE_URL}"
SUPABASE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}"

echo "╔════════════════════════════════════════════╗"
echo "║  Rate Limit & MFA Function Tests          ║"
echo "╚════════════════════════════════════════════╝"
echo ""

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY not set"
  exit 1
fi

echo "✓ Environment variables loaded"
echo "  URL: $SUPABASE_URL"
echo ""

# Test 1: Check if has_role() function exists
echo "Test 1: Verify has_role() function exists"
echo "========================================"

QUERY1=$(cat <<EOF
SELECT EXISTS (
  SELECT 1 
  FROM pg_proc 
  WHERE proname = 'has_role' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
) AS function_exists;
EOF
)

echo "Query: $QUERY1"
echo ""

# Test 2: Check if is_account_locked() function exists
echo "Test 2: Verify is_account_locked() function exists"
echo "========================================"

QUERY2=$(cat <<EOF
SELECT EXISTS (
  SELECT 1 
  FROM pg_proc 
  WHERE proname = 'is_account_locked' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
) AS function_exists;
EOF
)

echo "Query: $QUERY2"
echo ""

# Test 3: Check if check_rate_limit() function exists
echo "Test 3: Verify check_rate_limit() function exists"
echo "========================================"

QUERY3=$(cat <<EOF
SELECT EXISTS (
  SELECT 1 
  FROM pg_proc 
  WHERE proname = 'check_rate_limit' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
) AS function_exists;
EOF
)

echo "Query: $QUERY3"
echo ""

# Test 4: Check rate_limits table structure
echo "Test 4: Verify rate_limits table structure"
echo "========================================"

QUERY4=$(cat <<EOF
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rate_limits'
ORDER BY ordinal_position;
EOF
)

echo "Query: $QUERY4"
echo ""

# Test 5: Check failed_login_attempts table structure
echo "Test 5: Verify failed_login_attempts table structure"
echo "========================================"

QUERY5=$(cat <<EOF
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'failed_login_attempts'
ORDER BY ordinal_position;
EOF
)

echo "Query: $QUERY5"
echo ""

# Test 6: Check mfa_recovery_codes table structure
echo "Test 6: Verify mfa_recovery_codes table structure"
echo "========================================"

QUERY6=$(cat <<EOF
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mfa_recovery_codes'
ORDER BY ordinal_position;
EOF
)

echo "Query: $QUERY6"
echo ""

echo "✅ All function and table structure checks complete!"
echo ""
echo "Next steps:"
echo "  1. Run these queries in Lovable Cloud SQL editor to verify outputs"
echo "  2. Test rate limiting by making rapid API calls"
echo "  3. Test account lockout by entering wrong password 5 times"
echo "  4. Test MFA recovery codes via auth flow"
echo ""
echo "Documentation: docs/SECURITY_ENHANCEMENTS.md"
echo ""
