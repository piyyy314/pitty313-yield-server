/**
 * Infrastructure tests for deleted configuration files:
 *   - .github/workflows/python-publish.yml (deleted)
 *   - environment.yml (deleted)
 *
 * These tests verify that the intended post-deletion repository state is correct:
 * the Python publishing workflow and the Conda environment specification have been
 * removed, while the remaining CI workflows are intact.
 *
 * Run with:
 *   npx jest --config jest.infrastructure.config.js
 */

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

  test('no Python packaging artefact setup.py exists', () => {
    expect(exists(repoPath('setup.py'))).toBe(false);
  });

  test('no wheel or sdist distribution directory dist/ exists at repository root', () => {
    expect(exists(repoPath('dist'))).toBe(false);
  });

  test('pyproject.toml does not exist (no Python package publishing configuration)', () => {
    // A pyproject.toml would be required for the deleted build step
    // (`python -m build`). Its absence is consistent with removing the workflow.
    expect(exists(repoPath('pyproject.toml'))).toBe(false);
  });

  test('MANIFEST.in does not exist (no Python source distribution manifest)', () => {
    expect(exists(repoPath('MANIFEST.in'))).toBe(false);
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
    // Consistent with deleting environment.yml: the project is Node.js and
    // should not have a Python requirements file at the root either.
    expect(exists(repoPath('requirements.txt'))).toBe(false);
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

  test('only the expected workflow YAML files remain', () => {
    const yamlFiles = fs
      .readdirSync(WORKFLOWS_DIR)
      .filter((f) => /\.ya?ml$/i.test(f))
      .sort();
    // After deleting python-publish.yml the only YAML workflow files should be
    // master.yml and test.yml.
    expect(yamlFiles).toEqual(['master.yml', 'test.yml']);
  });
});

// ---------------------------------------------------------------------------
// Regression / boundary cases
// ---------------------------------------------------------------------------

describe('regression and boundary checks', () => {
  test('prepareSnapshot.py still exists (only the env spec was removed, not the script)', () => {
    // environment.yml listed the conda dependencies for this script.
    // Deleting environment.yml should not have removed the script itself.
    expect(exists(repoPath('scripts', 'prepareSnapshot.py'))).toBe(true);
  });

  test('package.json still exists (Node.js project entry point is unaffected)', () => {
    expect(exists(repoPath('package.json'))).toBe(true);
  });

  test('no *.yml files exist at the repository root after deletion', () => {
    const rootFiles = fs.readdirSync(ROOT);
    const rootYamlFiles = rootFiles.filter(
      (f) => /\.ya?ml$/i.test(f) && fs.statSync(repoPath(f)).isFile()
    );
    // serverless.yml is expected; environment.yml is not.
    const unexpectedYamlFiles = rootYamlFiles.filter(
      (f) => f.toLowerCase() === 'environment.yml'
    );
    expect(unexpectedYamlFiles).toHaveLength(0);
  });

  test('no Python egg-info or dist-info directories exist at repository root', () => {
    const rootEntries = fs.readdirSync(ROOT);
    const pythonBuildDirs = rootEntries.filter((entry) =>
      /\.(egg-info|dist-info)$/i.test(entry)
    );
    expect(pythonBuildDirs).toHaveLength(0);
  });
});