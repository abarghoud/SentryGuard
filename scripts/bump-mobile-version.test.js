const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { calculateNextVersion, bumpMobileVersion } = require('./bump-mobile-version');

function runTests() {
  assert.strictEqual(calculateNextVersion('1.0.0', 'patch'), '1.0.1');
  assert.strictEqual(calculateNextVersion('1.0.0', 'minor'), '1.1.0');
  assert.strictEqual(calculateNextVersion('1.0.0', 'major'), '2.0.0');
  assert.strictEqual(calculateNextVersion('1.0.0', 'PATCH'), '1.0.1');
  assert.strictEqual(calculateNextVersion('1.0.0', '1.2.3'), '1.2.3');

  assert.throws(() => calculateNextVersion('1.0.0', '0.9.0'), /must be greater than current version/);
  assert.throws(() => calculateNextVersion('1.0.0', 'invalid'), /Invalid bump argument/);
  assert.throws(() => calculateNextVersion('1.0.0', ''), /Missing bump argument/);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-test-'));
  const tempAppJson = path.join(tempDir, 'app.json');
  const tempPkgJson = path.join(tempDir, 'package.json');

  fs.writeFileSync(
    tempAppJson,
    JSON.stringify({ expo: { name: 'SentryGuard', version: '1.0.0' } }, null, 2) + '\n'
  );
  fs.writeFileSync(
    tempPkgJson,
    JSON.stringify({ name: '@tesla-guard/mobile', version: '0.0.1' }, null, 2) + '\n'
  );

  const dryRunResult = bumpMobileVersion('patch', {
    dryRun: true,
    appJsonPath: tempAppJson,
    packageJsonPath: tempPkgJson,
  });
  assert.strictEqual(dryRunResult.previousVersion, '1.0.0');
  assert.strictEqual(dryRunResult.nextVersion, '1.0.1');
  assert.strictEqual(JSON.parse(fs.readFileSync(tempAppJson, 'utf8')).expo.version, '1.0.0');

  const actualResult = bumpMobileVersion('minor', {
    dryRun: false,
    appJsonPath: tempAppJson,
    packageJsonPath: tempPkgJson,
  });
  assert.strictEqual(actualResult.previousVersion, '1.0.0');
  assert.strictEqual(actualResult.nextVersion, '1.1.0');
  assert.strictEqual(JSON.parse(fs.readFileSync(tempAppJson, 'utf8')).expo.version, '1.1.0');
  assert.strictEqual(JSON.parse(fs.readFileSync(tempPkgJson, 'utf8')).version, '1.1.0');

  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log('All bump-mobile-version tests passed successfully.');
}

runTests();
