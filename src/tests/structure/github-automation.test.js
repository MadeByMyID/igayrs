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
  testIgrsFetchWorkerUsesAtomicValidatedDownloads,
  testGitHubAutomationFilesUseLfLineEndings
];

for (const test of tests) {
  test();
}

console.log(`github-automation: ${tests.length} checks passed`);
