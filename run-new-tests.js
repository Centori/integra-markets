#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const testFiles = [
  '__tests__/e2e/googleOnboarding.simple.test.ts',
  '__tests__/integration/backendAPI.simple.test.ts'
];

console.log('🧪 Running new test suites for Integra Markets...\n');

async function runTest(testFile) {
  return new Promise((resolve) => {
    console.log(`\n📋 Running ${testFile}...`);
    
    const test = spawn('npm', ['test', '--', testFile, '--passWithNoTests', '--no-coverage'], {
      stdio: 'inherit',
      shell: true
    });

    test.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${testFile} passed!`);
      } else {
        console.log(`❌ ${testFile} failed with code ${code}`);
      }
      resolve(code);
    });
  });
}

async function runAllTests() {
  let totalPassed = 0;
  let totalFailed = 0;

  for (const testFile of testFiles) {
    const exitCode = await runTest(testFile);
    if (exitCode === 0) {
      totalPassed++;
    } else {
      totalFailed++;
    }
  }

  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📁 Total: ${testFiles.length}`);

  if (totalFailed > 0) {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

runAllTests();
