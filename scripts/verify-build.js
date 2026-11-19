#!/usr/bin/env node

/**
 * Build verification script for MarketSage
 * 
 * This script checks for common issues in the project before building:
 * - Validates package.json structure and dependencies
 * - Checks for required configuration files
 * - Verifies manifest.json for Chrome extension requirements
 * - Looks for common code issues
 */

const fs = require('fs');
const path = require('path');

// Define paths
const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const srcDir = path.join(rootDir, 'src');

// Verification results
const issues = [];
const warnings = [];
const passes = [];

console.log('🔍 Starting build verification...');

// Check if package.json exists and is valid
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  passes.push('✅ package.json is valid JSON');
  
  // Check for required dependencies
  const requiredDeps = ['react', 'react-dom', 'rxjs', '@tensorflow/tfjs'];
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  
  if (missingDeps.length > 0) {
    issues.push(`❌ Missing required dependencies: ${missingDeps.join(', ')}`);
  } else {
    passes.push('✅ All required dependencies are present');
  }
  
  // Check for scripts
  const requiredScripts = ['build', 'test'];
  const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
  
  if (missingScripts.length > 0) {
    warnings.push(`⚠️ Missing recommended scripts: ${missingScripts.join(', ')}`);
  } else {
    passes.push('✅ All recommended scripts are present');
  }
  
} catch (error) {
  issues.push(`❌ package.json is invalid: ${error.message}`);
}

// Check if tsconfig.json exists and is valid
try {
  const tsconfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8'));
  passes.push('✅ tsconfig.json is valid JSON');
  
  // Check for strict mode
  if (!tsconfig.compilerOptions?.strict) {
    warnings.push('⚠️ TypeScript strict mode is not enabled');
  } else {
    passes.push('✅ TypeScript strict mode is enabled');
  }
  
} catch (error) {
  issues.push(`❌ tsconfig.json is invalid: ${error.message}`);
}

// Check for manifest.json
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(srcDir, 'manifest.json'), 'utf8'));
  passes.push('✅ manifest.json is valid JSON');
  
  // Check for required manifest fields
  const requiredFields = ['manifest_version', 'name', 'version', 'description'];
  const missingFields = requiredFields.filter(field => !manifest[field]);
  
  if (missingFields.length > 0) {
    issues.push(`❌ manifest.json is missing required fields: ${missingFields.join(', ')}`);
  } else {
    passes.push('✅ manifest.json has all required fields');
  }

  if (manifest.manifest_version !== 3) {
    issues.push(`❌ manifest.json must use manifest_version 3 (found ${manifest.manifest_version})`);
  } else {
    passes.push('✅ manifest.json uses Manifest V3');
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (pkg.version && manifest.version && pkg.version !== manifest.version) {
    issues.push(`❌ Version mismatch: package.json (${pkg.version}) vs src/manifest.json (${manifest.version})`);
  } else {
    passes.push(`✅ manifest.json version (${manifest.version}) matches package.json`);
  }
  
  // Check permissions
  if (!manifest.permissions || !Array.isArray(manifest.permissions)) {
    warnings.push('⚠️ manifest.json has no permissions defined');
  } else {
    passes.push('✅ manifest.json has permissions defined');
  }
  
} catch (error) {
  issues.push(`❌ manifest.json is invalid: ${error.message}`);
}

// Check for common code issues
try {
  // Check for StateManager.ts
  if (fs.existsSync(path.join(srcDir, 'common', 'state', 'StateManager.ts'))) {
    passes.push('✅ StateManager.ts exists');
  } else {
    issues.push('❌ StateManager.ts is missing');
  }
  
  // Check for ErrorHandler.ts
  if (fs.existsSync(path.join(srcDir, 'common', 'errors', 'ErrorHandler.ts'))) {
    passes.push('✅ ErrorHandler.ts exists');
  } else {
    issues.push('❌ ErrorHandler.ts is missing');
  }
} catch (error) {
  issues.push(`❌ Error checking code files: ${error.message}`);
}

// Output results
console.log('\n🔍 Verification Results:');

if (passes.length > 0) {
  console.log('\n✅ Passes:');
  passes.forEach(pass => console.log(pass));
}

if (warnings.length > 0) {
  console.log('\n⚠️ Warnings:');
  warnings.forEach(warning => console.log(warning));
}

if (issues.length > 0) {
  console.log('\n❌ Issues:');
  issues.forEach(issue => console.log(issue));
}

// Final summary
console.log('\n📊 Summary:');
console.log(`Passes: ${passes.length}, Warnings: ${warnings.length}, Issues: ${issues.length}`);

if (issues.length > 0) {
  console.log('\n❌ Verification failed. Please fix the issues above.');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('\n⚠️ Verification passed with warnings.');
  process.exit(0);
} else {
  console.log('\n✅ Verification passed successfully!');
  process.exit(0);
}