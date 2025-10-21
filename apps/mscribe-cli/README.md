# @mscribe/cli

Command-line interface for Mental Scribe operations, including audit verification, consent management, RLS testing, and FHIR export.

## Installation

```bash
# From workspace root
pnpm install

# Build the CLI
pnpm --filter @mscribe/cli build

# Link globally (optional)
npm link apps/mscribe-cli
```

## Configuration

Create a `.env` file in the workspace root with:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Usage

```bash
# Show all commands
mscribe --help

# Show version
mscribe --version
```

## Commands

### Audit Chain Management

#### Verify Audit Chain Integrity

```bash
# Verify the audit chain
mscribe audit verify

# Verbose output with full details
mscribe audit verify --verbose
```

**Output:**
- ✓ Audit chain is intact
- Total entries count
- Verification timestamp
- Broken link details (if compromised)

#### List Audit Entries

```bash
# List recent 10 entries
mscribe audit list

# List 50 entries
mscribe audit list -n 50

# Filter by action type
mscribe audit list --action session_created
```

#### Export Audit Log

```bash
# Export entire audit log
mscribe audit export

# Export with custom filename
mscribe audit export -o audit-2025-10.json

# Export date range
mscribe audit export --from 2025-10-01 --to 2025-10-31
```

### Patient Consents

#### List Consents

```bash
# List all consents
mscribe consents list

# Filter by patient
mscribe consents list -p patient-uuid

# Show only expired consents
mscribe consents list --expired

# Show only active consents
mscribe consents list --active
```

#### Generate Consent Report

```bash
# Generate comprehensive consent report
mscribe consents report

# Custom output file
mscribe consents report -o monthly-consent-report.json
```

**Report includes:**
- Total consents (active/expired)
- Compliance rate
- Consents expiring in next 30 days
- Detailed breakdown by patient

### Row Level Security (RLS)

#### Test RLS Policies

```bash
# Test RLS policies for a table
mscribe rls test -t user_sessions

# Test with specific user
mscribe rls test -t clinical_notes -u user-uuid
```

**Tests:**
- SELECT policy
- INSERT policy
- UPDATE policy
- DELETE policy

#### List RLS Status

```bash
# Show RLS status for all tables
mscribe rls list
```

### FHIR Export

#### Export Patient Data

```bash
# Export patient data in FHIR format
mscribe fhir export -p patient-uuid

# Custom output file
mscribe fhir export -p patient-uuid -o patient-fhir.json
```

**Exports:**
- Patient resource
- Encounter resources (sessions)
- DocumentReference resources (clinical notes)
- Complete FHIR Bundle

#### Validate FHIR Bundle

```bash
# Validate a FHIR bundle file
mscribe fhir validate -f patient-fhir.json
```

## Examples

### Daily Audit Verification

```bash
#!/bin/bash
# daily-audit-check.sh

echo "Running daily audit verification..."
mscribe audit verify

if [ $? -eq 0 ]; then
  echo "✓ Audit chain integrity verified"
else
  echo "✗ Audit chain compromised - alerting team"
  # Send alert (Slack, email, etc.)
fi
```

### Consent Compliance Check

```bash
#!/bin/bash
# check-consent-compliance.sh

echo "Generating consent compliance report..."
mscribe consents report -o "consent-report-$(date +%Y-%m-%d).json"

# Parse report and check compliance rate
COMPLIANCE=$(jq -r '.summary.complianceRate' "consent-report-$(date +%Y-%m-%d).json")
echo "Compliance rate: $COMPLIANCE"

# Alert if below threshold
if (( $(echo "$COMPLIANCE < 95" | bc -l) )); then
  echo "⚠ Consent compliance below 95%"
fi
```

### Weekly FHIR Backup

```bash
#!/bin/bash
# weekly-fhir-backup.sh

mkdir -p fhir-backups/$(date +%Y-%m-%d)

# Get all patient IDs
PATIENTS=$(psql $DATABASE_URL -t -c "SELECT id FROM clients;")

# Export each patient
for patient in $PATIENTS; do
  echo "Exporting patient: $patient"
  mscribe fhir export -p $patient -o "fhir-backups/$(date +%Y-%m-%d)/${patient}.json"
done

echo "✓ FHIR backup complete"
```

### RLS Policy Testing in CI

```bash
#!/bin/bash
# test-rls-policies.sh

TABLES=("clients" "user_sessions" "clinical_notes" "patient_consents")
FAILED=0

for table in "${TABLES[@]}"; do
  echo "Testing RLS policies for: $table"
  mscribe rls test -t $table
  
  if [ $? -ne 0 ]; then
    FAILED=$((FAILED + 1))
  fi
done

if [ $FAILED -gt 0 ]; then
  echo "✗ $FAILED table(s) failed RLS policy tests"
  exit 1
else
  echo "✓ All RLS policy tests passed"
  exit 0
fi
```

## Development

```bash
# Run in development mode
pnpm --filter @mscribe/cli dev audit verify

# Build
pnpm --filter @mscribe/cli build

# Run tests
pnpm --filter @mscribe/cli test
```

## Error Handling

The CLI uses standard exit codes:
- `0`: Success
- `1`: Error (with descriptive message)

All errors are logged to stderr with helpful context.

## Security Considerations

- **Service Role Key**: Required for admin operations (audit verify, RLS testing)
- **Anon Key**: Used for read operations (consents list, FHIR export)
- **Environment Variables**: Never commit `.env` files
- **Audit Trail**: All CLI operations should be logged in audit chain

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Daily Audit Check

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:

jobs:
  audit-verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 10
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm --filter @mscribe/cli build
      
      - name: Verify Audit Chain
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: pnpm --filter @mscribe/cli dev audit verify
      
      - name: Notify on Failure
        if: failure()
        run: |
          # Send Slack notification
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"❌ Audit chain verification failed!"}'
```

## Troubleshooting

### "Missing Supabase credentials"

Ensure your `.env` file has the required variables:
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # For admin operations
```

### "Permission denied" errors

- Check that the service role key has proper permissions
- Verify RLS policies allow the operation
- Ensure user has required role (e.g., admin)

### "Module not found" errors

Rebuild the CLI:
```bash
pnpm --filter @mscribe/cli build
```

## License

MIT
