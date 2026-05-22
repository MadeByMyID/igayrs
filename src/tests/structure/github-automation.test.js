#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function testCiWorkflowRunsProjectChecksWithReadOnlyPermissions() {
  const workflowPath = '.github/workflows/ci.yml';
  const workflow = read(workflowPath);

  assert(workflow.includes('name: CI'), `${workflowPath}: expected CI workflow name`);
  assert(workflow.includes('pull_request:'), `${workflowPath}: expected pull request coverage`);
  assert(workflow.includes('workflow_dispatch:'), `${workflowPath}: expected manual dispatch support`);
  assert(/permissions:\s*\n\s+contents:\s+read/.test(workflow), `${workflowPath}: CI should use read-only repository contents permission`);
  assert(!/contents:\s+write/.test(workflow), `${workflowPath}: CI should not request write permissions`);
  assert(workflow.includes('uses: actions/checkout@v6'), `${workflowPath}: expected current pinned checkout major version`);
  assert(workflow.includes('persist-credentials: false'), `${workflowPath}: CI checkout should not persist push credentials`);
  assert(workflow.includes('uses: actions/setup-node@v6'), `${workflowPath}: expected current Node setup step`);
  assert(workflow.includes('node-version: 20'), `${workflowPath}: expected stable Node version`);
  assert(workflow.includes('cache: npm'), `${workflowPath}: npm dependency cache should be enabled`);
  assert(workflow.includes('cache-dependency-path: package-lock.json'), `${workflowPath}: npm cache should be keyed by the lockfile`);
  assert(workflow.includes('npm ci --ignore-scripts'), `${workflowPath}: expected deterministic npm install from the lockfile`);
  assert(workflow.includes('npm run check'), `${workflowPath}: expected full project check gate`);
  assert(workflow.includes('timeout-minutes:'), `${workflowPath}: CI job should have a bounded runtime`);
  assert(fs.existsSync(path.join(ROOT, 'package-lock.json')), 'package-lock.json: expected deterministic npm lockfile for CI');
}

function testDatasetUpdateWorkflowHasSafeBoundsAndFallbacks() {
  const workflowPath = '.github/workflows/update-igrs-db.yml';
  const workflow = read(workflowPath);

  assert(workflow.includes('timeout-minutes:'), `${workflowPath}: update job should have a bounded runtime`);
  assert(workflow.includes('OUTPUT_DIR="public/assets/data/json"'), `${workflowPath}: dataset output should match the Vite public assets path`);
  assert(workflow.includes('git add public/assets/data/json/igrs.meta.json public/assets/data/json/igrs.games.json public/assets/data/json/igrs.extra.json'), `${workflowPath}: commit step should stage Vite public dataset files`);
  assert(workflow.includes('test -s "${OUTPUT_DIR}/igrs.meta.json"'), `${workflowPath}: metadata fallback should require an existing non-empty meta file`);
  assert(workflow.includes('jq -e'), `${workflowPath}: generated JSON files should be validated before commit`);
  assert(workflow.includes('rm -f "$BATCH_FAILED_IDS_FILE"'), `${workflowPath}: temporary failure logs should be cleaned up`);
}

function testPagesWorkflowDeploysBuiltViteArtifact() {
  const workflowPath = '.github/workflows/pages.yml';
  const workflow = read(workflowPath);

  assert(workflow.includes('name: Deploy GitHub Pages'), `${workflowPath}: expected Pages deployment workflow name`);
  assert(/push:\s*\n\s+branches:\s*\n\s+- gh-pages/.test(workflow), `${workflowPath}: Pages deployment should follow the gh-pages branch source`);
  assert(workflow.includes('workflow_dispatch:'), `${workflowPath}: expected manual deployment support`);
  assert(/permissions:\s*\n\s+contents:\s+read/.test(workflow), `${workflowPath}: default permissions should be read-only`);
  assert(workflow.includes('uses: actions/checkout@v6'), `${workflowPath}: expected current checkout action`);
  assert(workflow.includes('persist-credentials: false'), `${workflowPath}: build checkout should not persist push credentials`);
  assert(workflow.includes('uses: actions/setup-node@v6'), `${workflowPath}: expected current Node setup action`);
  assert(workflow.includes('cache: npm'), `${workflowPath}: build should cache npm dependencies`);
  assert(workflow.includes('npm ci --ignore-scripts'), `${workflowPath}: build should install from the lockfile deterministically`);
  assert(workflow.includes('npm run build'), `${workflowPath}: Pages artifact should come from the Vite production build`);
  assert(workflow.includes('cp CNAME dist/CNAME'), `${workflowPath}: Pages artifact should preserve the custom domain file`);
  assert(workflow.includes('uses: actions/upload-pages-artifact@v5'), `${workflowPath}: expected current Pages artifact upload action`);
  assert(workflow.includes('path: dist'), `${workflowPath}: Pages artifact should upload the Vite dist directory`);
  assert(workflow.includes('needs: build'), `${workflowPath}: deployment should wait for the build artifact`);
  assert(/permissions:\s*\n\s+pages:\s+write\s*\n\s+id-token:\s+write/.test(workflow), `${workflowPath}: deploy job should use minimum Pages deployment permissions`);
  assert(workflow.includes('environment:'), `${workflowPath}: Pages deployment should target an environment`);
  assert(workflow.includes('name: github-pages'), `${workflowPath}: Pages deployment should target the github-pages environment`);
  assert(workflow.includes('uses: actions/deploy-pages@v5'), `${workflowPath}: expected current Pages deployment action`);
}

function testIgrsFetchWorkerUsesAtomicValidatedDownloads() {
  const scriptPath = '.github/scripts/fetch-igrs-game.sh';
  const script = read(scriptPath);

  assert(script.includes('mkdir -p "$RAW_DIR"'), `${scriptPath}: worker should create the output directory defensively`);
  assert(script.includes('TEMP_FILE="${RAW_DIR}/${ID}.json"'), `${scriptPath}: expected stable final output path`);
  assert(script.includes('DOWNLOAD_FILE="${TEMP_FILE}.'), `${scriptPath}: worker should download to a temporary file first`);
  assert(script.includes('trap cleanup EXIT'), `${scriptPath}: worker should clean temporary files on every exit path`);
  assert(script.includes('--connect-timeout'), `${scriptPath}: curl should have a connection timeout`);
  assert(script.includes('--retry-all-errors'), `${scriptPath}: curl should retry transient failures broadly`);
  assert(script.includes('(.id | tostring) == $requestedId'), `${scriptPath}: worker should validate the response ID matches the requested ID`);
  assert(script.includes('mv "$MINIFIED_FILE" "$TEMP_FILE"'), `${scriptPath}: worker should publish only validated minified JSON`);
}

function testGitHubAutomationFilesUseLfLineEndings() {
  const attributesPath = '.gitattributes';
  const attributes = read(attributesPath);

  assert(attributes.includes('.github/workflows/*.yml text eol=lf'), `${attributesPath}: workflow YAML should be LF-normalized`);
  assert(attributes.includes('.github/scripts/*.sh text eol=lf'), `${attributesPath}: GitHub shell helpers should be LF-normalized`);
}

const tests = [
  testCiWorkflowRunsProjectChecksWithReadOnlyPermissions,
  testDatasetUpdateWorkflowHasSafeBoundsAndFallbacks,
  testPagesWorkflowDeploysBuiltViteArtifact,
  testIgrsFetchWorkerUsesAtomicValidatedDownloads,
  testGitHubAutomationFilesUseLfLineEndings
];

for (const test of tests) {
  test();
}

console.log(`github-automation: ${tests.length} checks passed`);
