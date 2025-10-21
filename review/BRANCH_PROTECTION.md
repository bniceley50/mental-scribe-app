# Branch Protection Settings

## Recommended Settings for `main` Branch

### 1. Navigate to Repository Settings
```
GitHub → Your Repo → Settings → Branches → Add rule
```

### 2. Branch name pattern
```
main
```

### 3. Protection Rules

#### Require a pull request before merging
- ✅ Enable
- Require approvals: **1** (or more for stricter control)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners (optional, if you have CODEOWNERS file)

#### Require status checks to pass before merging
- ✅ Enable
- ✅ Require branches to be up to date before merging
- Status checks that are required:
  - `Preview CSP Smoke` (or `smoke / smoke` depending on your workflow name)
  - Add any other CI checks you have (lint, test, build, etc.)

#### Require conversation resolution before merging
- ✅ Enable (ensures all review comments are addressed)

#### Require signed commits (optional, high-security)
- ⬜ Enable only if your team uses GPG signing

#### Require linear history (optional, cleaner git log)
- ✅ Enable (forces rebase or squash merges, prevents merge commits)

#### Include administrators
- ⬜ Disable (allows admins to bypass for emergency hotfixes)
- ✅ Enable (for maximum security, even admins must follow rules)

#### Restrict who can push to matching branches (optional)
- ⬜ Enable only if you want to limit direct push access to specific teams

#### Allow force pushes
- ❌ Disable (prevents history rewriting on main)

#### Allow deletions
- ❌ Disable (prevents accidental branch deletion)

---

## Quick Setup (1 minute)

**Minimal Protection:**
1. ✅ Require pull request with 1 approval
2. ✅ Require status check: `Preview CSP Smoke`
3. ✅ Require branches up to date
4. ❌ Allow force pushes
5. ❌ Allow deletions

**Result:** No direct commits to main, all changes go through PR + CI.

---

## Verify Protection is Active

```bash
# Try to push directly to main (should fail)
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "test direct push"
git push

# Expected error:
# remote: error: GH006: Protected branch update failed
```

✅ If you see this error, protection is working!

---

## Emergency Bypass (for admins only)

If you need to bypass protection for a critical hotfix:

1. GitHub → Settings → Branches → Edit rule
2. Temporarily uncheck "Include administrators"
3. Push your hotfix
4. Re-enable "Include administrators"

**Better approach:** Use emergency branch:
```bash
git checkout -b hotfix/critical-fix
# make changes
git push origin hotfix/critical-fix
# Create PR, get rapid review, merge normally
```
