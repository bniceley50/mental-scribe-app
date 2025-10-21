#!/usr/bin/env node

// Clean Windows-specific dependencies from package-lock.json
const fs = require('fs');
const path = require('path');

const lockfilePath = path.join(__dirname, '..', 'package-lock.json');

if (fs.existsSync(lockfilePath)) {
  const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));
  
  // Function to clean Windows-specific packages from an object
  const cleanObject = (obj) => {
    if (!obj) return;
    Object.keys(obj).forEach(key => {
      // Remove packages with Windows-specific names
      if (key.includes('win32') || key.includes('windows') || key.includes('rollup-win32') || key.includes('swc') && key.includes('win32')) {
        delete obj[key];
      }
      // Also clean nested objects
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (obj[key].dependencies) cleanObject(obj[key].dependencies);
        if (obj[key].optionalDependencies) cleanObject(obj[key].optionalDependencies);
        if (obj[key].devDependencies) cleanObject(obj[key].devDependencies);
      }
    });
  };
  
  // Clean all sections
  cleanObject(lockfile.dependencies);
  cleanObject(lockfile.packages);
  
  // Clean any nested dependencies within packages
  if (lockfile.packages) {
    Object.values(lockfile.packages).forEach(pkg => {
      if (pkg.dependencies) cleanObject(pkg.dependencies);
      if (pkg.optionalDependencies) cleanObject(pkg.optionalDependencies);
      if (pkg.devDependencies) cleanObject(pkg.devDependencies);
    });
  }
  
  fs.writeFileSync(lockfilePath, JSON.stringify(lockfile, null, 2));
  console.log('Cleaned Windows-specific dependencies from package-lock.json');
} else {
  console.log('package-lock.json not found');
}