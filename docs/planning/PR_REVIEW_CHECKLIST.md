# PR Review Checklist

## 🔍 **Pre-Review Setup**

- [ ] **Branch is up-to-date** with main/develop
- [ ] **All CI checks passing** (tests, linting, security)
- [ ] **PR description** includes context and testing notes
- [ ] **Issue linked** (if applicable)

## 🧪 **Functional Testing**

### **Core Functionality**
- [ ] **Feature works as described** in PR description
- [ ] **Edge cases handled** appropriately
- [ ] **Error states** display helpful messages
- [ ] **Loading states** provide good UX

### **Integration Testing**
- [ ] **API calls** work correctly
- [ ] **Database operations** are efficient and correct
- [ ] **Authentication** flows work properly
- [ ] **Permissions** are enforced correctly

## 🔒 **Security Review**

### **Input Validation**
- [ ] **User inputs** are properly sanitized
- [ ] **SQL injection** prevention measures in place
- [ ] **XSS protection** implemented
- [ ] **CSRF tokens** used for state-changing operations

### **Authentication & Authorization**
- [ ] **Authentication** checks are present
- [ ] **Authorization** logic is correct
- [ ] **Session management** is secure
- [ ] **Sensitive data** is not exposed

### **Data Protection**
- [ ] **PHI/PII** is handled according to HIPAA requirements
- [ ] **Data encryption** in transit and at rest
- [ ] **Audit logging** for sensitive operations
- [ ] **Access controls** properly implemented

## 📊 **Performance Review**

### **Code Efficiency**
- [ ] **Database queries** are optimized
- [ ] **API calls** are minimized and efficient
- [ ] **Memory usage** is reasonable
- [ ] **Bundle size** impact is acceptable

### **Frontend Performance**
- [ ] **Large lists** are virtualized if needed
- [ ] **Images** are optimized and lazy-loaded
- [ ] **Code splitting** used for large features
- [ ] **Caching** strategies implemented where appropriate

## 🏗️ **Code Quality**

### **Architecture**
- [ ] **Code follows** established patterns
- [ ] **Components** are properly decomposed
- [ ] **Separation of concerns** is maintained
- [ ] **Dependencies** are appropriate and minimal

### **Maintainability**
- [ ] **Code is readable** and well-documented
- [ ] **Complex logic** has explanatory comments
- [ ] **Functions** are focused and not too large
- [ ] **Variable names** are descriptive

### **Testing**
- [ ] **Unit tests** cover new functionality
- [ ] **Integration tests** cover critical paths
- [ ] **Edge cases** are tested
- [ ] **Test coverage** is maintained or improved

## 🎯 **Accessibility (a11y)**

### **Keyboard Navigation**
- [ ] **All interactive elements** are keyboard accessible
- [ ] **Tab order** is logical
- [ ] **Focus indicators** are visible
- [ ] **Keyboard shortcuts** work correctly

### **Screen Reader Support**
- [ ] **ARIA labels** are present and accurate
- [ ] **Semantic HTML** is used appropriately
- [ ] **Alt text** for images is descriptive
- [ ] **Form labels** are properly associated

### **Visual Accessibility**
- [ ] **Color contrast** meets WCAG standards
- [ ] **Text scaling** works up to 200%
- [ ] **Motion** can be reduced/disabled
- [ ] **Error states** are clearly communicated

## 📱 **Responsive Design**

- [ ] **Mobile layout** works correctly
- [ ] **Tablet layout** is functional
- [ ] **Desktop layout** is optimized
- [ ] **Touch targets** are appropriately sized

## 🔧 **Configuration & Environment**

### **Environment Variables**
- [ ] **New environment variables** are documented
- [ ] **Default values** are appropriate
- [ ] **Sensitive data** is not hardcoded
- [ ] **Configuration** is environment-specific

### **Dependencies**
- [ ] **New dependencies** are justified
- [ ] **Version pinning** is appropriate
- [ ] **License compatibility** checked
- [ ] **Bundle size impact** evaluated

## 📋 **Documentation**

### **Code Documentation**
- [ ] **API changes** are documented
- [ ] **Complex algorithms** have explanations
- [ ] **Breaking changes** are highlighted
- [ ] **Migration guides** provided if needed

### **User Documentation**
- [ ] **New features** are documented for users
- [ ] **Configuration changes** are documented
- [ ] **Troubleshooting** information provided
- [ ] **Screenshots/videos** included if helpful

## 🚀 **Deployment Readiness**

### **Release Notes**
- [ ] **Changes** are documented for release notes
- [ ] **Breaking changes** are clearly marked
- [ ] **Migration steps** are provided
- [ ] **Feature flags** are documented

### **Monitoring & Observability**
- [ ] **Error logging** is appropriate
- [ ] **Performance metrics** are tracked
- [ ] **User analytics** events added if needed
- [ ] **Health checks** updated if necessary

## ✅ **Final Checks**

- [ ] **Code compiles** without warnings
- [ ] **All tests pass** locally and in CI
- [ ] **Bundle analysis** shows acceptable impact
- [ ] **Security scan** passes
- [ ] **Performance benchmarks** are met
- [ ] **Manual testing** completed in staging environment

## 💬 **Review Comments**

### **Feedback Template**
```
**Summary**: [Overall assessment of the PR]

**Strengths**: 
- [What was done well]

**Concerns**:
- [Any issues that need addressing]

**Suggestions**:
- [Improvements for future consideration]

**Approval Status**: [Approved/Needs Changes/Blocked]
```

---

**📝 Paste this checklist in your PR reviews to ensure comprehensive coverage!**