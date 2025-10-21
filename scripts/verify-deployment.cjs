#!/usr/bin/env node

console.log('🔒 Running post-deployment security verification...\n');

const PRODUCTION_URL = 'https://mental-scribe-app.vercel.app';

async function checkSecurityHeaders() {
  try {
    console.log('📋 Checking security headers...');
    
    const response = await fetch(PRODUCTION_URL, { method: 'HEAD' });
    const headers = response.headers;
    
    const securityChecks = [
      {
        name: 'Content-Security-Policy',
        header: 'content-security-policy',
        required: true,
        description: 'CSP header prevents XSS attacks'
      },
      {
        name: 'X-Frame-Options',
        header: 'x-frame-options',
        required: true,
        description: 'Prevents clickjacking attacks'
      },
      {
        name: 'X-Content-Type-Options',
        header: 'x-content-type-options',
        required: true,
        description: 'Prevents MIME type sniffing'
      },
      {
        name: 'Referrer-Policy',
        header: 'referrer-policy',
        required: true,
        description: 'Controls referrer information'
      },
      {
        name: 'Permissions-Policy',
        header: 'permissions-policy',
        required: false,
        description: 'Controls browser features'
      }
    ];

    let passedChecks = 0;
    let totalChecks = securityChecks.length;

    for (const check of securityChecks) {
      const headerValue = headers.get(check.header);
      if (headerValue) {
        console.log(`  ✅ ${check.name}: ${headerValue.substring(0, 80)}${headerValue.length > 80 ? '...' : ''}`);
        passedChecks++;
      } else if (check.required) {
        console.log(`  ❌ ${check.name}: MISSING (${check.description})`);
      } else {
        console.log(`  ⚠️  ${check.name}: OPTIONAL (${check.description})`);
        passedChecks++; // Don't penalize optional headers
      }
    }

    console.log(`\n📊 Security Headers Score: ${passedChecks}/${totalChecks} (${Math.round(passedChecks/totalChecks*100)}%)\n`);
    
    return passedChecks === totalChecks;
  } catch (error) {
    console.error('❌ Failed to check security headers:', error.message);
    return false;
  }
}

async function checkCSPCompliance() {
  try {
    console.log('🛡️  Checking CSP compliance...');
    
    const response = await fetch(PRODUCTION_URL);
    const cspHeader = response.headers.get('content-security-policy');
    
    if (!cspHeader) {
      console.log('❌ No CSP header found');
      return false;
    }

    const requiredDirectives = [
      'default-src',
      'script-src',
      'style-src',
      'img-src',
      'font-src',
      'connect-src'
    ];

    let compliantDirectives = 0;
    
    for (const directive of requiredDirectives) {
      if (cspHeader.includes(directive)) {
        console.log(`  ✅ ${directive} directive present`);
        compliantDirectives++;
      } else {
        console.log(`  ❌ ${directive} directive missing`);
      }
    }

    console.log(`\n📊 CSP Compliance Score: ${compliantDirectives}/${requiredDirectives.length} (${Math.round(compliantDirectives/requiredDirectives.length*100)}%)\n`);
    
    return compliantDirectives === requiredDirectives.length;
  } catch (error) {
    console.error('❌ Failed to check CSP compliance:', error.message);
    return false;
  }
}

async function checkAppFunctionality() {
  try {
    console.log('🚀 Checking app functionality...');
    
    const response = await fetch(PRODUCTION_URL);
    const html = await response.text();
    
    const functionalityChecks = [
      { name: 'React App', check: html.includes('id="root"') },
      { name: 'Vite Bundle', check: html.includes('type="module"') },
      { name: 'Title Present', check: html.includes('<title>') },
      { name: 'Meta Viewport', check: html.includes('name="viewport"') }
    ];

    let passedChecks = 0;
    
    for (const check of functionalityChecks) {
      if (check.check) {
        console.log(`  ✅ ${check.name}`);
        passedChecks++;
      } else {
        console.log(`  ❌ ${check.name}`);
      }
    }

    console.log(`\n📊 Functionality Score: ${passedChecks}/${functionalityChecks.length} (${Math.round(passedChecks/functionalityChecks.length*100)}%)\n`);
    
    return passedChecks === functionalityChecks.length;
  } catch (error) {
    console.error('❌ Failed to check app functionality:', error.message);
    return false;
  }
}

async function main() {
  console.log(`🌐 Testing deployment: ${PRODUCTION_URL}\n`);
  
  const [headersPass, cspPass, functionalityPass] = await Promise.all([
    checkSecurityHeaders(),
    checkCSPCompliance(), 
    checkAppFunctionality()
  ]);

  console.log('📈 FINAL RESULTS:');
  console.log(`  Security Headers: ${headersPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  CSP Compliance: ${cspPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  App Functionality: ${functionalityPass ? '✅ PASS' : '❌ FAIL'}`);
  
  const overallPass = headersPass && cspPass && functionalityPass;
  console.log(`\n🎯 OVERALL: ${overallPass ? '✅ DEPLOYMENT VERIFIED' : '❌ ISSUES DETECTED'}`);
  
  if (overallPass) {
    console.log('\n🚀 Mental Scribe v1.3.0 is successfully deployed and secure!');
    console.log(`   Production URL: ${PRODUCTION_URL}`);
  }
  
  process.exit(overallPass ? 0 : 1);
}

main().catch(console.error);