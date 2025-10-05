# Security Policy

## Reporting Security Vulnerabilities

We take the security of ClinicalAI Assistant seriously. If you discover a security vulnerability, please follow these steps:

### 🚨 DO NOT create a public GitHub issue for security vulnerabilities

Instead, please report security issues privately by:

1. **Email**: Send details to your security team contact
2. **Include**: 
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 24-48 hours
- **Initial Assessment**: Within 1 week
- **Fix Timeline**: Critical issues within 2 weeks, others within 30 days
- **Disclosure**: Coordinated disclosure after fix is deployed

## Security Best Practices

### For Developers

1. **Never commit secrets**: API keys, passwords, tokens
2. **Use environment variables**: All sensitive config via Lovable Cloud secrets
3. **Validate all inputs**: Client-side AND server-side validation
4. **Follow RLS policies**: Row-Level Security for all database tables
5. **Audit logging**: Log all PHI access and modifications
6. **Signed URLs only**: Never use public URLs for PHI documents

### For Users

1. **Use strong passwords**: Minimum 8 characters with complexity requirements
2. **Enable MFA**: Multi-factor authentication is strongly recommended
3. **Secure your device**: Keep your system updated and use antivirus
4. **Report suspicious activity**: Contact us immediately if you notice anything unusual

## Security Features

### Authentication & Authorization
- ✅ Supabase authentication with email/password
- ✅ Multi-factor authentication (MFA) support
- ✅ Account lockout after failed login attempts
- ✅ Password leak detection (HIBP integration)
- ✅ Role-based access control (RBAC)

### Data Protection
- ✅ Row-Level Security (RLS) on all database tables
- ✅ Signed URLs for file access (1-hour expiry)
- ✅ Data classification (standard PHI vs Part 2 protected)
- ✅ Encryption at rest and in transit
- ✅ sessionStorage for drafts (cleared on tab close)

### Application Security
- ✅ Security headers (XSS, clickjacking protection)
- ✅ Input validation with Zod schemas
- ✅ Content Security Policy (CSP)
- ✅ No production console logging
- ✅ Audit logging for compliance

### HIPAA Compliance
- ✅ 42 CFR Part 2 consent management
- ✅ Audit trails for PHI access
- ✅ Automatic consent expiry checks
- ✅ Immutable consent records
- ✅ Program-scoped data classification

## Known Security Considerations

### Third-Party Dependencies
- Regular dependency audits via npm audit
- Automated security scanning recommended
- Monthly dependency updates

### Data Retention
- User data is retained as long as the account is active
- Deleted conversations are permanently removed
- Audit logs retained for compliance (configurable)

### Incident Response
1. Identify and contain the threat
2. Assess the scope and impact
3. Notify affected users (if required)
4. Document and learn from the incident
5. Update security measures

## Security Updates

We regularly update our security measures and dependencies. Stay informed about security updates through project communications.

## Compliance

ClinicalAI Assistant is designed with HIPAA and 42 CFR Part 2 requirements in mind:
- ✅ Access controls and authentication
- ✅ Audit logging and monitoring
- ✅ Data encryption (in transit and at rest)
- ✅ Consent management for Part 2 protected information
- ⚠️ **Note**: This application provides tools to help with compliance but does not guarantee HIPAA compliance on its own. Consult with legal/compliance professionals.

## Security Checklist for Production

- [ ] All secrets configured via Lovable Cloud dashboard
- [ ] RLS policies reviewed and tested
- [ ] MFA enabled for admin accounts
- [ ] Audit logging verified
- [ ] Security headers confirmed
- [ ] Input validation tested
- [ ] File upload size limits configured
- [ ] Rate limiting enabled on edge functions
- [ ] Backup and recovery tested
- [ ] Incident response plan documented

## Contact

For security concerns, please contact your security team or project maintainers.

---

**Last Updated**: 2025-10-05
**Version**: 1.1.0
