'use strict';

/**
 * Infrastructure tests for PR changes:
 *   - .github/workflows/python-publish.yml (deleted)
 *   - environment.yml (restored for conda CI workflow)
 *   - .github/workflows/python-package-conda.yml (added)
 *   - package.json dependency version updates:
 *       axios   ^1.15.0  → ^0.30.0
 *       express ^4.19.2  → ^4.20.0
 *       lodash  ^4.17.23 → ^4.18.1
 *   - src/adaptors/package.json dependency version updates:
 *       axios   ^1.15.0  → ^1.12.0
 *       lodash  ^4.18.0  → ^4.17.23
 *
 * Run with:
 *   npx jest --config jest.infrastructure.config.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');
const ADAPTORS_DIR = path.join(ROOT, 'src', 'adaptors');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function repoPath(...segments) {
  return path.join(ROOT, ...segments);
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readPackageJson() {
  return readJson(repoPath('package.json'));
}

function readPackageLockJson() {
  return readJson(repoPath('package-lock.json'));
}

function readAdaptorsPackageJson() {
  return readJson(path.join(ADAPTORS_DIR, 'package.json'));
}

function readAdaptorsPackageLockJson() {
  return readJson(path.join(ADAPTORS_DIR, 'package-lock.json'));
}

// ---------------------------------------------------------------------------
// python-publish.yml – deletion verification
// ---------------------------------------------------------------------------

describe('python-publish.yml workflow (deleted)', () => {
  const publishWorkflow = repoPath('.github', 'workflows', 'python-publish.yml');

  test('python-publish.yml must not exist in the repository', () => {
    expect(exists(publishWorkflow)).toBe(false);
  });

  test('no PyPI publishing workflow file exists under .github/workflows/', () => {
    const workflowFiles = fs.readdirSync(WORKFLOWS_DIR);
    const pypiFiles = workflowFiles.filter((f) =>
      /(pypi|python[-_]publish|upload[-_]python[-_]package)/i.test(f)
    );
    expect(pypiFiles).toHaveLength(0);
  });

  test('no files named python-publish.* exist anywhere in .github/workflows/', () => {
    const workflowFiles = fs.readdirSync(WORKFLOWS_DIR);
    const matches = workflowFiles.filter((f) =>
      /^python[-_]publish\./i.test(f)
    );
    expect(matches).toHaveLength(0);
  });

  test('no Python packaging setup.py exists at repository root', () => {
    expect(exists(repoPath('setup.py'))).toBe(false);
  });

  test('no wheel or sdist distribution directory dist/ exists at repository root', () => {
    expect(exists(repoPath('dist'))).toBe(false);
  });

  test('pyproject.toml does not exist (no Python package publishing configuration)', () => {
    expect(exists(repoPath('pyproject.toml'))).toBe(false);
  });

  test('MANIFEST.in does not exist (no Python source distribution manifest)', () => {
    expect(exists(repoPath('MANIFEST.in'))).toBe(false);
  });

  // Boundary: ensure the workflow directory itself still exists
  test('.github/workflows/ directory still exists after deletion of python-publish.yml', () => {
    expect(exists(WORKFLOWS_DIR)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// environment.yml – presence verification (restored for conda CI workflow)
// ---------------------------------------------------------------------------

describe('environment.yml Conda environment file', () => {
  const envYml = repoPath('environment.yml');

  test('environment.yml exists at the repository root', () => {
    expect(exists(envYml)).toBe(true);
  });

  test('environment.yml contains required conda dependencies', () => {
    const content = fs.readFileSync(envYml, 'utf8');
    expect(content).toMatch(/python/);
    expect(content).toMatch(/flake8/);
    expect(content).toMatch(/pytest/);
  });

  test('environment.yml has a name field (valid conda env file structure)', () => {
    const content = fs.readFileSync(envYml, 'utf8');
    expect(content).toMatch(/^name:/m);
  });

  test('environment.yml has a channels field (valid conda env file structure)', () => {
    const content = fs.readFileSync(envYml, 'utf8');
    expect(content).toMatch(/^channels:/m);
  });

  test('no conda .condarc file exists at repository root', () => {
    expect(exists(repoPath('.condarc'))).toBe(false);
  });

  test('requirements.txt does not exist (project managed via package.json, not pip/conda)', () => {
    expect(exists(repoPath('requirements.txt'))).toBe(false);
  });

  test('no Python egg-info or dist-info directories exist at repository root', () => {
    const rootEntries = fs.readdirSync(ROOT);
    const pythonBuildDirs = rootEntries.filter((entry) =>
      /\.(egg-info|dist-info)$/i.test(entry)
    );
    expect(pythonBuildDirs).toHaveLength(0);
  });

  // Boundary: confirm no YAML environment file with alternate extension
  test('no environment.yaml (alternate extension) exists at repository root', () => {
    expect(exists(repoPath('environment.yaml'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// package.json – dependency version changes
// ---------------------------------------------------------------------------

describe('package.json dependency version changes', () => {
  let pkg;

  beforeAll(() => {
    pkg = readPackageJson();
  });

  // axios: ^1.15.0 → ^0.30.0
  test('axios dependency is set to ^0.30.0', () => {
    expect(pkg.dependencies.axios).toBe('^0.30.0');
  });

  test('axios dependency is NOT the old ^1.15.0 version', () => {
    expect(pkg.dependencies.axios).not.toBe('^1.15.0');
  });

  test('axios dependency uses the 0.x series (downgraded from 1.x)', () => {
    expect(pkg.dependencies.axios).toMatch(/^\^0\./);
  });

  test('axios dependency is a valid semver range string', () => {
    expect(typeof pkg.dependencies.axios).toBe('string');
    expect(pkg.dependencies.axios.length).toBeGreaterThan(0);
  });

  // express: ^4.19.2 → ^4.20.0
  test('express dependency is set to ^4.20.0', () => {
    expect(pkg.dependencies.express).toBe('^4.20.0');
  });

  test('express dependency is NOT the old ^4.19.2 version', () => {
    expect(pkg.dependencies.express).not.toBe('^4.19.2');
  });

  test('express major version is still 4.x', () => {
    expect(pkg.dependencies.express).toMatch(/^\^4\./);
  });

  test('express minor version is at least 20', () => {
    const version = pkg.dependencies.express.replace(/^\^/, '');
    const [, minor] = version.split('.').map(Number);
    expect(minor).toBeGreaterThanOrEqual(20);
  });

  test('express dependency is a valid semver range string', () => {
    expect(typeof pkg.dependencies.express).toBe('string');
    expect(pkg.dependencies.express.length).toBeGreaterThan(0);
  });

  // lodash: ^4.17.23 → ^4.18.1
  test('lodash dependency is set to ^4.18.1', () => {
    expect(pkg.dependencies.lodash).toBe('^4.18.1');
  });

  test('lodash dependency is NOT the old ^4.17.23 version', () => {
    expect(pkg.dependencies.lodash).not.toBe('^4.17.23');
  });

  test('lodash major version is still 4.x', () => {
    expect(pkg.dependencies.lodash).toMatch(/^\^4\./);
  });

  test('lodash minor version is at least 18 (not a 4.17.x patch)', () => {
    const version = pkg.dependencies.lodash.replace(/^\^/, '');
    const [, minor] = version.split('.').map(Number);
    expect(minor).toBeGreaterThanOrEqual(18);
  });

  test('lodash dependency is a valid semver range string', () => {
    expect(typeof pkg.dependencies.lodash).toBe('string');
    expect(pkg.dependencies.lodash.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// package-lock.json – resolved version verification
// ---------------------------------------------------------------------------

describe('package-lock.json resolved dependency versions', () => {
  let lock;

  beforeAll(() => {
    lock = readPackageLockJson();
  });

  test('package-lock.json exists and is parseable', () => {
    expect(lock).toBeDefined();
    expect(typeof lock).toBe('object');
  });

  test('package-lock.json lockfileVersion is present', () => {
    expect(lock.lockfileVersion).toBeDefined();
  });

  test('package-lock.json name matches package.json name', () => {
    const pkg = readPackageJson();
    expect(lock.name).toBe(pkg.name);
  });

  // axios
  test('top-level axios in package-lock.json entry exists', () => {
    expect(lock.packages['node_modules/axios']).toBeDefined();
  });

  test('top-level axios in package-lock.json resolves to 0.30.0', () => {
    const axiosEntry = lock.packages['node_modules/axios'];
    expect(axiosEntry.version).toBe('0.30.0');
  });

  test('top-level axios in package-lock.json does NOT resolve to 1.15.0', () => {
    const axiosEntry = lock.packages['node_modules/axios'];
    expect(axiosEntry.version).not.toBe('1.15.0');
  });

  test('top-level axios resolved version is in the 0.x series', () => {
    const axiosEntry = lock.packages['node_modules/axios'];
    expect(axiosEntry.version).toMatch(/^0\./);
  });

  test('top-level axios resolved version major is 0 (correctly downgraded)', () => {
    const axiosEntry = lock.packages['node_modules/axios'];
    const [major] = axiosEntry.version.split('.').map(Number);
    expect(major).toBe(0);
  });

  // express
  test('top-level express in package-lock.json entry exists', () => {
    expect(lock.packages['node_modules/express']).toBeDefined();
  });

  test('top-level express in package-lock.json resolves to 4.20.0', () => {
    const expressEntry = lock.packages['node_modules/express'];
    expect(expressEntry.version).toBe('4.20.0');
  });

  test('top-level express in package-lock.json does NOT resolve to 4.19.2', () => {
    const expressEntry = lock.packages['node_modules/express'];
    expect(expressEntry.version).not.toBe('4.19.2');
  });

  test('top-level express resolved version minor is at least 20', () => {
    const expressEntry = lock.packages['node_modules/express'];
    const [, minor] = expressEntry.version.split('.').map(Number);
    expect(minor).toBeGreaterThanOrEqual(20);
  });

  // lodash
  test('top-level lodash in package-lock.json entry exists', () => {
    expect(lock.packages['node_modules/lodash']).toBeDefined();
  });

  test('top-level lodash in package-lock.json resolves to 4.18.1', () => {
    const lodashEntry = lock.packages['node_modules/lodash'];
    expect(lodashEntry.version).toBe('4.18.1');
  });

  test('top-level lodash in package-lock.json does NOT resolve to 4.17.23', () => {
    const lodashEntry = lock.packages['node_modules/lodash'];
    expect(lodashEntry.version).not.toBe('4.17.23');
  });

  test('top-level lodash resolved version minor is at least 18', () => {
    const lodashEntry = lock.packages['node_modules/lodash'];
    const [, minor] = lodashEntry.version.split('.').map(Number);
    expect(minor).toBeGreaterThanOrEqual(18);
  });
});

// ---------------------------------------------------------------------------
// src/adaptors/package.json – dependency version changes
// ---------------------------------------------------------------------------

describe('src/adaptors/package.json dependency version changes', () => {
  let pkg;

  beforeAll(() => {
    pkg = readAdaptorsPackageJson();
  });

  // axios: ^1.15.0 → ^1.12.0
  test('axios dependency is set to ^1.12.0', () => {
    expect(pkg.dependencies.axios).toBe('^1.12.0');
  });

  test('axios dependency is NOT the old ^1.15.0 version', () => {
    expect(pkg.dependencies.axios).not.toBe('^1.15.0');
  });

  test('axios dependency remains in the 1.x series', () => {
    expect(pkg.dependencies.axios).toMatch(/^\^1\./);
  });

  test('axios minor version is at most 12 (downgraded from 15)', () => {
    const version = pkg.dependencies.axios.replace(/^\^/, '');
    const [, minor] = version.split('.').map(Number);
    expect(minor).toBeLessThanOrEqual(12);
  });

  test('axios dependency is a valid semver range string', () => {
    expect(typeof pkg.dependencies.axios).toBe('string');
    expect(pkg.dependencies.axios.length).toBeGreaterThan(0);
  });

  // lodash: ^4.18.0 → ^4.17.23
  test('lodash dependency is set to ^4.17.23', () => {
    expect(pkg.dependencies.lodash).toBe('^4.17.23');
  });

  test('lodash dependency is NOT the old ^4.18.0 version', () => {
    expect(pkg.dependencies.lodash).not.toBe('^4.18.0');
  });

  test('lodash major version is still 4.x', () => {
    expect(pkg.dependencies.lodash).toMatch(/^\^4\./);
  });

  test('lodash minor version is 17 (downgraded from 18)', () => {
    const version = pkg.dependencies.lodash.replace(/^\^/, '');
    const [, minor] = version.split('.').map(Number);
    expect(minor).toBe(17);
  });

  test('lodash dependency is a valid semver range string', () => {
    expect(typeof pkg.dependencies.lodash).toBe('string');
    expect(pkg.dependencies.lodash.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// src/adaptors/package-lock.json – resolved version verification
// ---------------------------------------------------------------------------

describe('src/adaptors/package-lock.json resolved dependency versions', () => {
  let lock;

  beforeAll(() => {
    lock = readAdaptorsPackageLockJson();
  });

  test('src/adaptors/package-lock.json exists and is parseable', () => {
    expect(lock).toBeDefined();
    expect(typeof lock).toBe('object');
  });

  test('src/adaptors/package-lock.json lockfileVersion is present', () => {
    expect(lock.lockfileVersion).toBeDefined();
  });

  test('src/adaptors/package-lock.json name matches src/adaptors/package.json name', () => {
    const pkg = readAdaptorsPackageJson();
    expect(lock.name).toBe(pkg.name);
  });

  // axios
  test('axios in adaptors package-lock.json entry exists', () => {
    expect(lock.packages['node_modules/axios']).toBeDefined();
  });

  test('axios in adaptors package-lock.json resolves to 1.12.0', () => {
    const axiosEntry = lock.packages['node_modules/axios'];
    expect(axiosEntry.version).toBe('1.12.0');
  });

  test('axios in adaptors package-lock.json does NOT resolve to 1.15.0', () => {
    const axiosEntry = lock.packages['node_modules/axios'];
    expect(axiosEntry.version).not.toBe('1.15.0');
  });

  test('axios in adaptors package-lock.json remains in 1.x series', () => {
    const axiosEntry = lock.packages['node_modules/axios'];
    expect(axiosEntry.version).toMatch(/^1\./);
  });

  test('axios in adaptors package-lock.json minor version is at most 12', () => {
    const axiosEntry = lock.packages['node_modules/axios'];
    const [, minor] = axiosEntry.version.split('.').map(Number);
    expect(minor).toBeLessThanOrEqual(12);
  });

  // lodash
  test('lodash in adaptors package-lock.json entry exists', () => {
    expect(lock.packages['node_modules/lodash']).toBeDefined();
  });

  test('lodash in adaptors package-lock.json resolves to 4.17.23', () => {
    const lodashEntry = lock.packages['node_modules/lodash'];
    expect(lodashEntry.version).toBe('4.17.23');
  });

  test('lodash in adaptors package-lock.json does NOT resolve to 4.18.0', () => {
    const lodashEntry = lock.packages['node_modules/lodash'];
    expect(lodashEntry.version).not.toBe('4.18.0');
  });

  test('lodash in adaptors package-lock.json minor version is 17', () => {
    const lodashEntry = lock.packages['node_modules/lodash'];
    const [, minor] = lodashEntry.version.split('.').map(Number);
    expect(minor).toBe(17);
  });
});

// ---------------------------------------------------------------------------
// Remaining CI workflows – integrity checks
// ---------------------------------------------------------------------------

describe('remaining GitHub Actions workflows are intact', () => {
  test('.github/workflows/ directory still exists', () => {
    expect(exists(WORKFLOWS_DIR)).toBe(true);
  });

  test('test.yml workflow still exists', () => {
    expect(exists(repoPath('.github', 'workflows', 'test.yml'))).toBe(true);
  });

  test('master.yml workflow still exists', () => {
    expect(exists(repoPath('.github', 'workflows', 'master.yml'))).toBe(true);
  });

  test('commentResult.js helper still exists', () => {
    expect(exists(repoPath('.github', 'workflows', 'commentResult.js'))).toBe(true);
  });

  test('getFileList.js helper still exists', () => {
    expect(exists(repoPath('.github', 'workflows', 'getFileList.js'))).toBe(true);
  });

  test('python-package-conda.yml workflow exists (added for conda CI)', () => {
    expect(exists(repoPath('.github', 'workflows', 'python-package-conda.yml'))).toBe(true);
  });

  test('only the expected YAML workflow files remain in .github/workflows/', () => {
    const yamlFiles = fs
      .readdirSync(WORKFLOWS_DIR)
      .filter((f) => /\.ya?ml$/i.test(f))
      .sort();
    expect(yamlFiles).toEqual(['master.yml', 'python-package-conda.yml', 'test.yml']);
  });

  test('test.yml is a non-empty file', () => {
    const content = fs.readFileSync(
      repoPath('.github', 'workflows', 'test.yml'),
      'utf8'
    );
    expect(content.trim().length).toBeGreaterThan(0);
  });

  test('master.yml is a non-empty file', () => {
    const content = fs.readFileSync(
      repoPath('.github', 'workflows', 'master.yml'),
      'utf8'
    );
    expect(content.trim().length).toBeGreaterThan(0);
  });

  // Boundary: ensure python-publish.yml is specifically absent
  test('python-publish.yml is specifically not listed in workflows directory', () => {
    const allFiles = fs.readdirSync(WORKFLOWS_DIR);
    expect(allFiles).not.toContain('python-publish.yml');
  });
});

// ---------------------------------------------------------------------------
// Regression / boundary cases
// ---------------------------------------------------------------------------

describe('regression and boundary checks', () => {
  test('package.json still exists (Node.js project entry point is unaffected)', () => {
    expect(exists(repoPath('package.json'))).toBe(true);
  });

  test('package-lock.json still exists', () => {
    expect(exists(repoPath('package-lock.json'))).toBe(true);
  });

  test('src/adaptors/package.json still exists', () => {
    expect(exists(path.join(ADAPTORS_DIR, 'package.json'))).toBe(true);
  });

  test('src/adaptors/package-lock.json still exists', () => {
    expect(exists(path.join(ADAPTORS_DIR, 'package-lock.json'))).toBe(true);
  });

  test('environment.yml exists at the repository root (restored for conda CI workflow)', () => {
    const rootFiles = fs.readdirSync(ROOT);
    const envYamlFiles = rootFiles.filter(
      (f) => f.toLowerCase() === 'environment.yml'
    );
    expect(envYamlFiles).toHaveLength(1);
  });

  test('environment.yml at repository root is the conda environment file', () => {
    const rootFiles = fs.readdirSync(ROOT);
    const rootYamlFiles = rootFiles.filter(
      (f) =>
        /\.ya?ml$/i.test(f) &&
        fs.statSync(repoPath(f)).isFile()
    );
    const condaEnvFiles = rootYamlFiles.filter(
      (f) => f.toLowerCase() === 'environment.yml'
    );
    expect(condaEnvFiles).toHaveLength(1);
  });

  // Verify root package-lock.json axios is 0.x (not 1.x)
  test('root axios resolved version major is 0, confirming the 0.x downgrade', () => {
    const lock = readPackageLockJson();
    const axiosEntry = lock.packages['node_modules/axios'];
    const [major] = axiosEntry.version.split('.').map(Number);
    expect(major).toBe(0);
  });

  // Verify express minor >= 20
  test('root express resolved version minor is at least 20', () => {
    const lock = readPackageLockJson();
    const expressEntry = lock.packages['node_modules/express'];
    const [, minor] = expressEntry.version.split('.').map(Number);
    expect(minor).toBeGreaterThanOrEqual(20);
  });

  // Verify root lodash minor >= 18
  test('root lodash resolved version minor is at least 18', () => {
    const lock = readPackageLockJson();
    const lodashEntry = lock.packages['node_modules/lodash'];
    const [, minor] = lodashEntry.version.split('.').map(Number);
    expect(minor).toBeGreaterThanOrEqual(18);
  });

  // Verify adaptors axios still 1.x (not downgraded to 0.x like root)
  test('adaptors axios resolved version remains in 1.x (different from root 0.x)', () => {
    const lock = readAdaptorsPackageLockJson();
    const axiosEntry = lock.packages['node_modules/axios'];
    const [major] = axiosEntry.version.split('.').map(Number);
    expect(major).toBe(1);
  });

  // Verify adaptors lodash is 4.17.23 (lower than root 4.18.1)
  test('adaptors lodash resolved version (4.17.x) is lower minor than root (4.18.x)', () => {
    const rootLock = readPackageLockJson();
    const adaptorsLock = readAdaptorsPackageLockJson();
    const rootLodashMinor = Number(
      rootLock.packages['node_modules/lodash'].version.split('.')[1]
    );
    const adaptorsLodashMinor = Number(
      adaptorsLock.packages['node_modules/lodash'].version.split('.')[1]
    );
    expect(adaptorsLodashMinor).toBeLessThan(rootLodashMinor);
  });

  // Negative: root axios is not the same version as adaptors axios
  test('root axios version (0.x) is different from adaptors axios version (1.x)', () => {
    const rootLock = readPackageLockJson();
    const adaptorsLock = readAdaptorsPackageLockJson();
    const rootVersion = rootLock.packages['node_modules/axios'].version;
    const adaptorsVersion = adaptorsLock.packages['node_modules/axios'].version;
    expect(rootVersion).not.toBe(adaptorsVersion);
  });
});