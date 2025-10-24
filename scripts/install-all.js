#!/usr/bin/env node

/**
 * CS720 Platform - Install All Dependencies
 * Cross-platform installation script
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const packages = [
  { name: 'Root', path: '.' },
  { name: 'Shared', path: 'shared' },
  { name: 'Backend', path: 'services/backend' },
  { name: 'Proxy', path: 'services/proxy' },
  { name: 'AI Service', path: 'services/ai-service' },
  { name: 'Frontend', path: 'frontend' },
];

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function execCommand(command, cwd) {
  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  log('\n============================================', colors.blue);
  log('CS720 Platform - Installing All Dependencies', colors.blue);
  log('============================================\n', colors.blue);

  const rootDir = path.resolve(__dirname, '..');
  let successCount = 0;

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    const pkgPath = path.join(rootDir, pkg.path);

    log(`[${i + 1}/${packages.length}] Installing ${pkg.name} dependencies...`, colors.cyan);

    // Check if package.json exists
    if (!fs.existsSync(path.join(pkgPath, 'package.json'))) {
      log(`  ⚠️  No package.json found in ${pkg.path}, skipping`, colors.yellow);
      continue;
    }

    const success = execCommand('npm install --legacy-peer-deps', pkgPath);

    if (success) {
      log(`  ✓ ${pkg.name} installed successfully\n`, colors.green);
      successCount++;
    } else {
      log(`  ✗ ${pkg.name} installation failed\n`, colors.red);
    }
  }

  log('\n============================================', colors.blue);

  if (successCount === packages.length) {
    log('✓ SUCCESS! All dependencies installed', colors.green);
    log('============================================\n', colors.blue);
    log('Next steps:', colors.cyan);
    log('1. Build shared library: npm run build:shared');
    log('2. Start all services: npm run dev');
    log('3. Check health: npm run health\n');
    process.exit(0);
  } else {
    log(`⚠️  PARTIAL SUCCESS! ${successCount}/${packages.length} packages installed`, colors.yellow);
    log('============================================\n', colors.blue);
    log('Please check the error messages above\n', colors.yellow);
    process.exit(1);
  }
}

main().catch(error => {
  log('\n============================================', colors.red);
  log('ERROR! Installation failed', colors.red);
  log('============================================\n', colors.red);
  console.error(error);
  process.exit(1);
});
