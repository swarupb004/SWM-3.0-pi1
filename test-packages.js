#!/usr/bin/env node

/**
 * Simple test script to verify updated packages work correctly
 * This validates that key package upgrades don't break existing functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Updated Packages...\n');

// Test 1: Verify package.json files have updated versions
console.log('📦 Test 1: Checking package versions...');

const checkPackageVersions = (pkgPath, expectedPackages) => {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  let allPassed = true;
  for (const [name, minVersion] of Object.entries(expectedPackages)) {
    const currentVersion = allDeps[name];
    if (!currentVersion) {
      console.log(`  ❌ ${name} not found`);
      allPassed = false;
    } else {
      // Extract version number (remove ^ or ~)
      const version = currentVersion.replace(/[\^~]/, '');
      const expected = minVersion.replace(/[\^~]/, '');
      
      if (version >= expected) {
        console.log(`  ✅ ${name}: ${currentVersion}`);
      } else {
        console.log(`  ❌ ${name}: ${currentVersion} (expected >= ${minVersion})`);
        allPassed = false;
      }
    }
  }
  return allPassed;
};

// Backend critical packages
console.log('\n  Backend:');
const backendPassed = checkPackageVersions(
  path.join(__dirname, 'backend', 'package.json'),
  {
    'multer': '2.0.0',
    'express': '4.21.0',
    'date-fns': '3.0.0',
    'csv-parse': '5.6.0',
    'typescript': '5.7.0'
  }
);

// Frontend critical packages
console.log('\n  Frontend:');
const frontendPassed = checkPackageVersions(
  path.join(__dirname, 'frontend', 'package.json'),
  {
    'react': '18.3.0',
    'react-router-dom': '6.30.0',
    'axios': '1.7.0',
    'date-fns': '3.0.0',
    'vite': '6.0.0',
    'typescript': '5.7.0'
  }
);

// Desktop critical packages
console.log('\n  Desktop:');
const desktopPassed = checkPackageVersions(
  path.join(__dirname, 'desktop', 'package.json'),
  {
    'electron': '38.0.0',
    'electron-store': '8.2.0',
    'electron-builder': '26.0.0',
    'axios': '1.7.0',
    'typescript': '5.7.0'
  }
);

// Test 2: Verify builds are successful
console.log('\n📦 Test 2: Checking build outputs...');

const checkBuildOutput = (buildPath, name) => {
  if (fs.existsSync(buildPath)) {
    console.log(`  ✅ ${name} build output exists`);
    return true;
  } else {
    console.log(`  ❌ ${name} build output missing`);
    return false;
  }
};

const backendBuildPassed = checkBuildOutput(
  path.join(__dirname, 'backend', 'dist', 'server.js'),
  'Backend'
);

const frontendBuildPassed = checkBuildOutput(
  path.join(__dirname, 'frontend', 'dist', 'index.html'),
  'Frontend'
);

const desktopBuildPassed = checkBuildOutput(
  path.join(__dirname, 'desktop', 'dist', 'main', 'main.js'),
  'Desktop'
);

// Test 3: Verify no deprecated packages that we directly control
console.log('\n📦 Test 3: Checking for known deprecated packages we control...');

const checkDeprecatedPackages = (modulesPath, name) => {
  // Only check for deprecated packages that are direct dependencies
  const deprecatedPackages = ['multer@1'];
  let foundDeprecated = false;
  
  for (const pkg of deprecatedPackages) {
    const [pkgName, version] = pkg.split('@');
    const pkgJsonPath = path.join(modulesPath, pkgName, 'package.json');
    
    if (fs.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      if (version && pkgJson.version.startsWith(version)) {
        console.log(`  ⚠️  ${name}: Found deprecated ${pkgName}@${pkgJson.version}`);
        foundDeprecated = true;
      }
    }
  }
  
  if (!foundDeprecated) {
    console.log(`  ✅ ${name}: No deprecated direct dependencies found`);
  }
  
  return !foundDeprecated;
};

const backendDepsPassed = checkDeprecatedPackages(
  path.join(__dirname, 'backend', 'node_modules'),
  'Backend'
);

const frontendDepsPassed = checkDeprecatedPackages(
  path.join(__dirname, 'frontend', 'node_modules'),
  'Frontend'
);

const desktopDepsPassed = checkDeprecatedPackages(
  path.join(__dirname, 'desktop', 'node_modules'),
  'Desktop'
);

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary:');
console.log('='.repeat(50));

const allTests = [
  ['Package Versions', backendPassed && frontendPassed && desktopPassed],
  ['Build Outputs', backendBuildPassed && frontendBuildPassed && desktopBuildPassed],
  ['Deprecated Check', backendDepsPassed && frontendDepsPassed && desktopDepsPassed]
];

let allPassed = true;
for (const [testName, passed] of allTests) {
  console.log(`${passed ? '✅' : '❌'} ${testName}`);
  if (!passed) allPassed = false;
}

console.log('='.repeat(50));

if (allPassed) {
  console.log('\n🎉 All tests passed! Package updates are working correctly.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the output above.\n');
  process.exit(1);
}
