#!/usr/bin/env node

/**
 * Sample Test Runner
 * Demonstrates the testing infrastructure
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

// Helper to run commands
function run(command, description) {
  console.log(chalk.blue(`\n📋 ${description}`));
  console.log(chalk.gray(`   Running: ${command}\n`));

  try {
    execSync(command, { stdio: 'inherit' });
    console.log(chalk.green(`✅ ${description} completed successfully!\n`));
    return true;
  } catch (error) {
    console.log(chalk.red(`❌ ${description} failed\n`));
    return false;
  }
}

console.log(chalk.bold.cyan(`
╔════════════════════════════════════════════╗
║   D&D Encounter Manager Test Suite Demo    ║
╚════════════════════════════════════════════╝
`));

console.log(chalk.yellow('This script will demonstrate the testing infrastructure.\n'));

// Run different test scenarios
const tests = [
  {
    command: 'npm test -- tests/unit/services/calculation-service.test.js --verbose',
    description: 'Running CalculationService unit tests'
  },
  {
    command: 'npm test -- tests/unit/services/validation-service.test.js --verbose',
    description: 'Running ValidationService unit tests'
  },
  {
    command: 'npm test -- --coverage --coverageReporters=text-summary',
    description: 'Running all tests with coverage summary'
  }
];

console.log(chalk.cyan('Available test commands:\n'));
console.log('  npm test                  - Run all tests');
console.log('  npm run test:watch        - Run tests in watch mode');
console.log('  npm run test:coverage     - Run tests with full coverage report');
console.log('  npm run test:unit         - Run only unit tests');
console.log('  npm run test:verbose      - Run tests with detailed output\n');

// Ask user if they want to run sample tests
console.log(chalk.yellow('\nStarting sample test runs...\n'));

let passed = 0;
let failed = 0;

for (const test of tests) {
  if (run(test.command, test.description)) {
    passed++;
  } else {
    failed++;
  }
}

// Summary
console.log(chalk.bold.cyan('\n═══════════════════════════════════════════════'));
console.log(chalk.bold.white('                TEST SUITE SUMMARY              '));
console.log(chalk.bold.cyan('═══════════════════════════════════════════════\n'));

console.log(chalk.green(`  ✅ Tests Passed: ${passed}`));
if (failed > 0) {
  console.log(chalk.red(`  ❌ Tests Failed: ${failed}`));
}

console.log(chalk.cyan('\n📊 To view the full HTML coverage report:'));
console.log(chalk.white('   1. Run: npm run test:coverage'));
console.log(chalk.white('   2. Open: coverage/lcov-report/index.html\n'));

console.log(chalk.bold.green('🎉 Testing infrastructure is ready!\n'));