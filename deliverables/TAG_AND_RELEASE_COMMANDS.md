# Tag & Release Commands

Pick one of the flows below.

## Git tags only (no package version bump)

```bash
git checkout main && git pull
git merge --no-ff feature/ship-safety-pagination-v1 -m "merge: ship-safety hardening + pagination v1 + A+ security review"
git tag -a vNEXT -m "vNEXT – ship-safety + pagination v1 + A+ security review"
git push && git push --tags
```

## NPM versioning (recommended for minor bump)

```bash
git checkout main && git pull
git merge --no-ff feature/ship-safety-pagination-v1 -m "merge: ship-safety hardening + pagination v1 + A+ security review"
npm version minor -m "chore(release): %s – ship-safety + pagination v1"
git push && git push --tags
```

## Trigger CI auto-publish via tag push

```bash
git tag -a v1.3.0 -m "v1.3.0 – Ship-safety + Pagination v1 + A+ Security Review"
git push origin v1.3.0
```
