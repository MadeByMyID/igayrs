#!/usr/bin/env node
'use strict';

/**
 * Bundle Size CI Check
 *
 * Measures gzipped JS and CSS sizes in the dist/ directory and compares
 * against configurable thresholds defined in config/bundle-size.json.
 * Exits non-zero if any threshold is exceeded or if the config is invalid.
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const DIST_ASSETS = path.join(ROOT, 'dist', 'assets');
const CONFIG_PATH = path.join(ROOT, 'config', 'bundle-size.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(
      `\x1b[31mError: Bundle size configuration file not found at config/bundle-size.json\x1b[0m`
    );
    process.exit(1);
  }

  let raw;
  try {
    raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  } catch (error) {
    console.error(
      `\x1b[31mError: Unable to read bundle size configuration: ${error.message}\x1b[0m`
    );
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (error) {
    console.error(
      `\x1b[31mError: Bundle size configuration is not valid JSON: ${error.message}\x1b[0m`
    );
    process.exit(1);
  }

  if (
    !config ||
    typeof config !== 'object' ||
    !config.thresholds ||
    typeof config.thresholds !== 'object'
  ) {
    console.error(
      `\x1b[31mError: Bundle size configuration is invalid — missing "thresholds" object\x1b[0m`
    );
    process.exit(1);
  }

  const { javascript, css } = config.thresholds;

  if (typeof javascript !== 'number' || javascript <= 0) {
    console.error(
      `\x1b[31mError: Bundle size configuration is invalid — "thresholds.javascript" must be a positive number (KB)\x1b[0m`
    );
    process.exit(1);
  }

  if (typeof css !== 'number' || css <= 0) {
    console.error(
      `\x1b[31mError: Bundle size configuration is invalid — "thresholds.css" must be a positive number (KB)\x1b[0m`
    );
    process.exit(1);
  }

  return { javascript, css };
}

function getGzippedSize(filePath) {
  const content = fs.readFileSync(filePath);
  const gzipped = zlib.gzipSync(content, { level: 9 });
  return gzipped.length;
}

function collectFiles(directory, extension) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory)
    .filter(file => file.endsWith(extension))
    .map(file => path.join(directory, file));
}

function measureBundleSize(extension) {
  const files = collectFiles(DIST_ASSETS, extension);
  let totalBytes = 0;

  for (const file of files) {
    totalBytes += getGzippedSize(file);
  }

  return { totalBytes, fileCount: files.length };
}

function formatKB(bytes) {
  return (bytes / 1024).toFixed(2);
}

function main() {
  const thresholds = loadConfig();

  if (!fs.existsSync(DIST_ASSETS)) {
    console.error(
      `\x1b[31mError: dist/assets directory not found. Run "npm run build" first.\x1b[0m`
    );
    process.exit(1);
  }

  const js = measureBundleSize('.js');
  const css = measureBundleSize('.css');

  const jsKB = Number(formatKB(js.totalBytes));
  const cssKB = Number(formatKB(css.totalBytes));

  console.log('Bundle Size Report');
  console.log('──────────────────────────────────────────');
  console.log(`  JavaScript: ${formatKB(js.totalBytes)} KB gzipped (${js.fileCount} files)`);
  console.log(`  CSS:        ${formatKB(css.totalBytes)} KB gzipped (${css.fileCount} files)`);
  console.log('──────────────────────────────────────────');
  console.log(`  JS threshold:  ${thresholds.javascript} KB`);
  console.log(`  CSS threshold: ${thresholds.css} KB`);
  console.log('──────────────────────────────────────────');

  let failed = false;

  if (jsKB > thresholds.javascript) {
    const diff = (jsKB - thresholds.javascript).toFixed(2);
    console.error(
      `\n\x1b[31m✗ JavaScript bundle size exceeded threshold\x1b[0m\n` +
      `  Measured: ${formatKB(js.totalBytes)} KB | Threshold: ${thresholds.javascript} KB | Over by: ${diff} KB`
    );
    failed = true;
  } else {
    console.log(`\n\x1b[32m✓ JavaScript bundle size within threshold\x1b[0m`);
  }

  if (cssKB > thresholds.css) {
    const diff = (cssKB - thresholds.css).toFixed(2);
    console.error(
      `\n\x1b[31m✗ CSS bundle size exceeded threshold\x1b[0m\n` +
      `  Measured: ${formatKB(css.totalBytes)} KB | Threshold: ${thresholds.css} KB | Over by: ${diff} KB`
    );
    failed = true;
  } else {
    console.log(`\x1b[32m✓ CSS bundle size within threshold\x1b[0m`);
  }

  if (failed) {
    console.error('\nBundle size check failed. Update config/bundle-size.json if the increase is intentional.');
    process.exit(1);
  }

  console.log('\nBundle size check passed.');
}

main();
