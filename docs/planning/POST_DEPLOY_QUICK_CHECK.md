# Post-Deploy Quick Check

## 🚀 **Deployment Verification - v1.3.0**

**Deploy Date:** October 21, 2025  
**Version:** v1.3.0  
**Environment:** Production

## ⚡ **Quick Health Check (2 minutes)**

### **1. Site Accessibility**

```bash
# Basic connectivity test
curl -I https://YOUR_VERCEL_URL
# Expected: HTTP/2 200 OK
```

**Manual Check:**
- [ ] **Homepage loads** without errors
- [ ] **Authentication page** renders correctly
- [ ] **Main application** is accessible

### **2. Security Headers Verification**

```bash
# Comprehensive security headers check
curl -sI https://YOUR_VERCEL_URL | awk 'BEGIN{IGNORECASE=1} /content-security-policy|x-frame-options|strict-transport-security|cross-origin-opener-policy|cross-origin-resource-policy|referrer-policy|permissions-policy/'
```

**Expected Headers:**
- ✅ `content-security-policy: script-src 'nonce-[random]' 'strict-dynamic'`
- ✅ `strict-transport-security: max-age=31536000`
- ✅ `x-frame-options: DENY`
- ✅ `cross-origin-opener-policy: same-origin`
- ✅ `cross-origin-resource-policy: same-origin`
- ✅ `referrer-policy: strict-origin-when-cross-origin`
- ✅ `permissions-policy: geolocation=(), microphone=(), camera=()`

### **3. CSP Compliance Test**

```bash
# Automated CSP smoke test
BASE_URL="https://YOUR_VERCEL_URL" npx playwright test -g "CSP smoke" --reporter=line
```

**Expected Result:** All CSP tests pass with no violations

### **4. Core Functionality Spot Check**

**Authentication Flow:**
- [ ] Navigate to `/auth`
- [ ] **No console errors** in browser dev tools
- [ ] **Login/signup** forms render correctly
- [ ] **Authentication** redirects work properly

**Message Interface:**
- [ ] **Chat interface** loads without errors
- [ ] **Send message** functionality works
- [ ] **Message history** displays correctly
- [ ] **Pagination** ("Load older messages") functions properly

**Performance Check:**
- [ ] **Page load time** <3 seconds for initial load
- [ ] **Scroll performance** smooth in long conversations
- [ ] **No memory leaks** in dev tools performance tab

## 🔍 **Detailed Verification (5 minutes)**

### **Browser Console Check**

1. Open **Chrome DevTools** (F12)
2. Navigate through the application
3. Check for:
   - [ ] **No JavaScript errors** in console
   - [ ] **No CSP violations** reported
   - [ ] **No 404 errors** for resources
   - [ ] **No uncaught promise rejections**

### **Network Tab Analysis**

1. Open **Network tab** in DevTools
2. Reload the page
3. Verify:
   - [ ] **All resources load** successfully (no red entries)
   - [ ] **Security headers** present on main document
   - [ ] **API calls** return expected status codes
   - [ ] **Bundle sizes** within expected ranges

### **Performance Metrics**

```bash
# Bundle size check
npm run build && node scripts/assert-bundles.mjs
```

**Expected Results:**
- [ ] **Main bundle** <180KB gzipped
- [ ] **Vendor bundles** <350KB gzipped
- [ ] **CSS bundles** <50KB gzipped
- [ ] **Overall budget** utilization <90%

## 🚨 **Issue Detection & Rollback**

### **Red Flags - Immediate Rollback**
- ❌ **Site completely inaccessible**
- ❌ **Authentication completely broken**
- ❌ **Critical security headers missing**
- ❌ **Console flooded with JavaScript errors**
- ❌ **Database connection failures**

### **Yellow Flags - Monitor Closely**
- ⚠️ **Slow page load times** (>5 seconds)
- ⚠️ **Non-critical console warnings**
- ⚠️ **Bundle size slightly over budget**
- ⚠️ **Accessibility issues** in specific browsers

### **Rollback Procedure**

**Option 1: Revert Git Tag**
```bash
git tag -d v1.3.0 && git push --delete origin v1.3.0
```

**Option 2: Revert Merge Commit**
```bash
git checkout main
git log --oneline  # Find merge commit SHA
git revert -m 1 <MERGE_SHA>
git push origin main
```

**Option 3: Vercel Rollback**
- Go to Vercel dashboard
- Select previous deployment
- Click "Promote to Production"

## 📊 **Success Criteria**

### **All Systems Green ✅**
- [ ] **Site loads** in <3 seconds
- [ ] **7/7 security headers** present
- [ ] **0 CSP violations** detected
- [ ] **Authentication** works end-to-end
- [ ] **Message functionality** operates correctly
- [ ] **Bundle sizes** within budget
- [ ] **No critical console errors**

### **Monitoring Setup**
- [ ] **Error tracking** active (Sentry/similar)
- [ ] **Performance monitoring** enabled
- [ ] **Security monitoring** in place
- [ ] **Weekly audit** workflow confirmed

## 📞 **Emergency Contacts**

### **Technical Issues**
- **GitHub Actions:** Check workflow logs for deployment failures
- **Vercel Dashboard:** Monitor deployment status and errors
- **Browser Console:** Check for runtime errors and CSP violations

### **Security Concerns**
- **CSP Violations:** Review browser console for policy violations
- **Header Issues:** Use curl commands above to verify security headers
- **Authentication Problems:** Check Supabase dashboard for auth errors

## ✅ **Deploy Success Confirmation**

Once all checks pass:

1. **Post in team chat:** "v1.3.0 deploy verified ✅ - all systems green"
2. **Update monitoring:** Confirm all alerts and dashboards are operational
3. **Document any issues:** Record any minor issues for future improvement
4. **Schedule review:** Plan post-deploy review meeting if needed

---

**🎊 Deployment verification complete!**

**Next Steps:**
- Monitor performance for 24 hours
- Weekly security audit will run Monday
- Update release notes with any deployment-specific notes