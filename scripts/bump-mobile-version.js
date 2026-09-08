const fs = require('fs');
const path = require('path');

let semver;
try {
  semver = require('semver');
} catch {
  semver = null;
}

const APP_JSON_PATH = path.resolve(__dirname, '../apps/mobile/app.json');
const PACKAGE_JSON_PATH = path.resolve(__dirname, '../apps/mobile/package.json');

const VALID_RELEASE_TYPES = ['patch', 'minor', 'major'];

function parseSemver(version) {
  const match = String(version).trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) {
    return null;
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
  };
}

function compareSemver(versionA, versionB) {
  if (semver) {
    return semver.compare(versionA, versionB);
  }
  const parsedA = parseSemver(versionA);
  const parsedB = parseSemver(versionB);
  if (!parsedA || !parsedB) {
    return 0;
  }
  if (parsedA.major !== parsedB.major) return parsedA.major > parsedB.major ? 1 : -1;
  if (parsedA.minor !== parsedB.minor) return parsedA.minor > parsedB.minor ? 1 : -1;
  if (parsedA.patch !== parsedB.patch) return parsedA.patch > parsedB.patch ? 1 : -1;
  return 0;
}

function calculateNextVersion(currentVersion, bumpInput) {
  if (!bumpInput) {
    throw new Error('Missing bump argument. Provide patch, minor, major, or an exact semver version (e.g. 1.0.1).');
  }

  const normalizedInput = bumpInput.trim().toLowerCase();

  if (VALID_RELEASE_TYPES.includes(normalizedInput)) {
    if (semver) {
      const next = semver.inc(currentVersion, normalizedInput);
      if (next) return next;
    }
    const parsed = parseSemver(currentVersion);
    if (!parsed) {
      throw new Error(`Current version "${currentVersion}" is not a valid SemVer.`);
    }
    if (normalizedInput === 'major') return `${parsed.major + 1}.0.0`;
    if (normalizedInput === 'minor') return `${parsed.major}.${parsed.minor + 1}.0`;
    if (normalizedInput === 'patch') return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }

  const exactParsed = parseSemver(bumpInput.trim());
  if (exactParsed) {
    const exactVersion = `${exactParsed.major}.${exactParsed.minor}.${exactParsed.patch}${exactParsed.prerelease ? `-${exactParsed.prerelease}` : ''}`;
    if (compareSemver(exactVersion, currentVersion) <= 0) {
      throw new Error(`Specified version ${exactVersion} must be greater than current version ${currentVersion}`);
    }
    return exactVersion;
  }

  throw new Error(`Invalid bump argument "${bumpInput}". Expected patch, minor, major, or valid semver string.`);
}

function bumpMobileVersion(bumpInput, options = {}) {
  const dryRun = options.dryRun || false;
  const appJsonPath = options.appJsonPath || APP_JSON_PATH;
  const packageJsonPath = options.packageJsonPath || PACKAGE_JSON_PATH;

  const appJsonRaw = fs.readFileSync(appJsonPath, 'utf8');
  const appJson = JSON.parse(appJsonRaw);

  const currentVersion = appJson.expo?.version;
  if (!currentVersion) {
    throw new Error(`Could not find expo.version in ${appJsonPath}`);
  }

  const nextVersion = calculateNextVersion(currentVersion, bumpInput);

  if (!dryRun) {
    appJson.expo.version = nextVersion;
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

    if (fs.existsSync(packageJsonPath)) {
      const pkgRaw = fs.readFileSync(packageJsonPath, 'utf8');
      const pkg = JSON.parse(pkgRaw);
      pkg.version = nextVersion;
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
    }
  }

  return {
    previousVersion: currentVersion,
    nextVersion,
  };
}

if (require.main === module) {
  const bumpArg = process.argv[2];
  const isDryRun = process.argv.includes('--dry-run');

  try {
    const result = bumpMobileVersion(bumpArg, { dryRun: isDryRun });
    console.log(result.nextVersion);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  calculateNextVersion,
  bumpMobileVersion,
};
