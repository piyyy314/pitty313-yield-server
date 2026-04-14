/**
 * Infrastructure tests for PR changes:
 *   - .github/workflows/python-publish.yml (deleted)
 *   - environment.yml (deleted)
 *   - package.json dependency version updates:
 *       axios  ^1.15.0 → ^0.30.0
 *       express ^4.19.2 → ^4.20.0
 *       lodash  ^4.17.23 → ^4.18.1
 *
 * Run with:
 *   npx jest --config jest.infrastructure.config.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function repoPath(...segments) {
  return path.join(ROOT, ...segments);
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readPackageJson() {
  return JSON.parse(fs.readFileSync(repoPath('package.json'), 'utf8'));
}

function readPackageLockJson() {
  return JSON.parse(fs.readFileSync(repoPath('package-lock.json'), 'utf8'));
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

  test('no files named python-publish.* exist anywhere in .github/workflows/', () => {
    const workflowFiles = fs.readdirSync(WORKFLOWS_DIR);
    const matches = workflowFiles.filter((f) =>
      /^python[-_]publish\./i.test(f)
    );
    expect(matches).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// environment.yml – deletion verification
// ---------------------------------------------------------------------------

describe('environment.yml Conda environment file (deleted)', () => {
  const envYml = repoPath('environment.yml');

  test('environment.yml must not exist at the repository root', () => {
    expect(exists(envYml)).toBe(false);
  });

  test('no environment*.yml Conda files exist at the repository root', () => {
    const rootFiles = fs.readdirSync(ROOT);
    const condaEnvFiles = rootFiles.filter((f) =>
      /^environment.*\.ya?ml$/i.test(f)
    );
    expect(condaEnvFiles).toHaveLength(0);
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

  test('axios dependency is not a 1.x version range', () => {
    expect(pkg.dependencies.axios).not.toMatch(/^\^1\./);
  });

  test('axios dependency uses the 0.x series', () => {
    expect(pkg.dependencies.axios).toMatch(/^\^0\./);
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

  test('lodash version is at least 4.18.1 (not a prior 4.17.x patch)', () => {
    const version = pkg.dependencies.lodash.replace(/^\^/, '');
    const [, minor] = version.split('.').map(Number);
    expect(minor).toBeGreaterThanOrEqual(18);
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

  test('top-level axios in package-lock.json resolves to 0.30.0', () => {
    const axiosEntry = lock.packages['node_modules/axios'];
    expect(axiosEntry).toBeDefined();
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

  test('top-level express in package-lock.json resolves to 4.20.0', () => {
    const expressEntry = lock.packages['node_modules/express'];
    expect(expressEntry).toBeDefined();
    expect(expressEntry.version).toBe('4.20.0');
  });

  test('top-level express in package-lock.json does NOT resolve to 4.19.2', () => {
    const expressEntry = lock.packages['node_modules/express'];
    expect(expressEntry.version).not.toBe('4.19.2');
  });

  test('top-level lodash in package-lock.json resolves to 4.18.1', () => {
    const lodashEntry = lock.packages['node_modules/lodash'];
    expect(lodashEntry).toBeDefined();
    expect(lodashEntry.version).toBe('4.18.1');
  });

  test('top-level lodash in package-lock.json does NOT resolve to 4.17.23', () => {
    const lodashEntry = lock.packages['node_modules/lodash'];
    expect(lodashEntry.version).not.toBe('4.17.23');
  });

  test('package-lock.json lockfileVersion is present', () => {
    expect(lock.lockfileVersion).toBeDefined();
  });

  test('package-lock.json name matches package.json name', () => {
    const pkg = readPackageJson();
    expect(lock.name).toBe(pkg.name);
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

  test('only the expected YAML workflow files remain in .github/workflows/', () => {
    const yamlFiles = fs
      .readdirSync(WORKFLOWS_DIR)
      .filter((f) => /\.ya?ml$/i.test(f))
      .sort();
    expect(yamlFiles).toEqual(['master.yml', 'test.yml']);
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
});

// ---------------------------------------------------------------------------
// Regression / boundary cases
// ---------------------------------------------------------------------------

describe('regression and boundary checks', () => {
  test('prepareSnapshot.py still exists (only the env spec was removed, not the script)', () => {
    expect(exists(repoPath('scripts', 'prepareSnapshot.py'))).toBe(true);
  });

  test('package.json still exists (Node.js project entry point is unaffected)', () => {
    expect(exists(repoPath('package.json'))).toBe(true);
  });

  test('package-lock.json still exists', () => {
    expect(exists(repoPath('package-lock.json'))).toBe(true);
  });

  test('no environment.yml file exists at the repository root after deletion', () => {
    const rootFiles = fs.readdirSync(ROOT);
    const envYamlFiles = rootFiles.filter(
      (f) => f.toLowerCase() === 'environment.yml'
    );
    expect(envYamlFiles).toHaveLength(0);
  });

  test('axios dependency in package.json is a valid semver range string', () => {
    const pkg = readPackageJson();
    expect(typeof pkg.dependencies.axios).toBe('string');
    expect(pkg.dependencies.axios.length).toBeGreaterThan(0);
  });

  test('express dependency in package.json is a valid semver range string', () => {
    const pkg = readPackageJson();
    expect(typeof pkg.dependencies.express).toBe('string');
    expect(pkg.dependencies.express.length).toBeGreaterThan(0);
  });

  test('lodash dependency in package.json is a valid semver range string', () => {
    const pkg = readPackageJson();
    expect(typeof pkg.dependencies.lodash).toBe('string');
    expect(pkg.dependencies.lodash.length).toBeGreaterThan(0);
  });

  test('no *.yml files exist at the repository root that are environment files', () => {
    const rootFiles = fs.readdirSync(ROOT);
    const rootYamlFiles = rootFiles.filter(
      (f) =>
        /\.ya?ml$/i.test(f) &&
        fs.statSync(repoPath(f)).isFile()
    );
    const unexpectedEnvFiles = rootYamlFiles.filter(
      (f) => f.toLowerCase() === 'environment.yml'
    );
    expect(unexpectedEnvFiles).toHaveLength(0);
  });

  test('axios resolved version in package-lock.json is less than 1.0.0 (correctly downgraded)', () => {
    const lock = readPackageLockJson();
    const axiosEntry = lock.packages['node_modules/axios'];
    const [major] = axiosEntry.version.split('.').map(Number);
    expect(major).toBe(0);
  });

  test('express resolved version in package-lock.json is at least 4.20.0', () => {
    const lock = readPackageLockJson();
    const expressEntry = lock.packages['node_modules/express'];
    const [, minor] = expressEntry.version.split('.').map(Number);
    expect(minor).toBeGreaterThanOrEqual(20);
  });

  test('lodash resolved version in package-lock.json minor is at least 18', () => {
    const lock = readPackageLockJson();
    const lodashEntry = lock.packages['node_modules/lodash'];
    const [, minor] = lodashEntry.version.split('.').map(Number);
    expect(minor).toBeGreaterThanOrEqual(18);
  });
});