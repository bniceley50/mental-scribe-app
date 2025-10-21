#!/usr/bin/env node

// Generate a deployment-safe package-lock.json without Windows binaries
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const lockfilePath = path.join(__dirname, '..', 'package-lock.json');
const backupPath = path.join(__dirname, '..', 'package-lock.json.backup');

console.log('Creating deployment-safe lockfile...');

// Backup the current lockfile
if (fs.existsSync(lockfilePath)) {
  fs.copyFileSync(lockfilePath, backupPath);
}

try {
  // Remove lockfile and node_modules
  if (fs.existsSync(lockfilePath)) fs.unlinkSync(lockfilePath);
  
  // Install with omit optional to create clean lockfile
  console.log('Installing dependencies without optional packages...');
  execSync('npm install --omit=optional', { stdio: 'inherit' });
  
  // Clean the resulting lockfile
  if (fs.existsSync(lockfilePath)) {
    const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));
    
    // Function to clean Windows-specific packages
    const cleanObject = (obj) => {
      if (!obj) return;
      Object.keys(obj).forEach(key => {
        if (key.includes('win32') || key.includes('windows') || 
            (key.includes('rollup') && key.includes('win32')) ||
            (key.includes('swc') && key.includes('win32'))) {
          delete obj[key];
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (obj[key].dependencies) cleanObject(obj[key].dependencies);
          if (obj[key].optionalDependencies) cleanObject(obj[key].optionalDependencies);
          if (obj[key].devDependencies) cleanObject(obj[key].devDependencies);
        }
      });
    };
    
    cleanObject(lockfile.dependencies);
    cleanObject(lockfile.packages);
    
    if (lockfile.packages) {
      Object.values(lockfile.packages).forEach(pkg => {
        if (pkg.dependencies) cleanObject(pkg.dependencies);
        if (pkg.optionalDependencies) cleanObject(pkg.optionalDependencies);
        if (pkg.devDependencies) cleanObject(pkg.devDependencies);
      });
    }
    
    fs.writeFileSync(lockfilePath, JSON.stringify(lockfile, null, 2));
    console.log('✅ Created clean deployment lockfile');
  }
  
} catch (error) {
  console.error('Error creating deployment lockfile:', error);
  // Restore backup if something went wrong
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, lockfilePath);
    console.log('Restored backup lockfile');
  }
  process.exit(1);
}