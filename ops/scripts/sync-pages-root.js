#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DIST_ROOT = path.join(PROJECT_ROOT, 'dist');
const PUBLISH_PATHS = [
  '404.html',
  'assets',
  'index.html',
  'ratings',
  'search',
  'steamchecker'
];

function assertInsideProject(targetPath) {
  const resolved = path.resolve(targetPath);
  const relative = path.relative(PROJECT_ROOT, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside project root: ${targetPath}`);
  }
}

function removePublishPath(relativePath) {
  const target = path.join(PROJECT_ROOT, relativePath);
  assertInsideProject(target);
  fs.rmSync(target, { recursive: true, force: true });
}

function copyPublishPath(relativePath) {
  const source = path.join(DIST_ROOT, relativePath);
  const target = path.join(PROJECT_ROOT, relativePath);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing build output: ${path.relative(PROJECT_ROOT, source)}`);
  }
  assertInsideProject(target);
  fs.cpSync(source, target, { recursive: true });
}

function main() {
  if (!fs.existsSync(path.join(DIST_ROOT, 'index.html'))) {
    throw new Error('dist/index.html is missing. Run the Vite build before syncing Pages files.');
  }

  for (const relativePath of PUBLISH_PATHS) {
    removePublishPath(relativePath);
    copyPublishPath(relativePath);
  }

  fs.writeFileSync(path.join(PROJECT_ROOT, '.nojekyll'), '', 'utf8');
  console.log('pages-root: synced dist output to branch root');
}

main();
