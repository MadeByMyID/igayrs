#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

const DIRS = [
  'public/assets/data/images/ratings',
  'public/assets/data/images/descriptors'
];

const WEBP_OPTIONS = { quality: 80, effort: 6 };

async function convertFile(inputPath) {
  const parsed = path.parse(inputPath);
  const outputPath = path.join(parsed.dir, `${parsed.name}.webp`);

  await sharp(inputPath).webp(WEBP_OPTIONS).toFile(outputPath);

  const inputStat = fs.statSync(inputPath);
  const outputStat = fs.statSync(outputPath);
  const savings = ((1 - outputStat.size / inputStat.size) * 100).toFixed(1);

  return { inputPath, outputPath, inputSize: inputStat.size, outputSize: outputStat.size, savings };
}

async function main() {
  let totalInput = 0;
  let totalOutput = 0;
  let fileCount = 0;

  for (const dir of DIRS) {
    const absoluteDir = path.join(PROJECT_ROOT, dir);

    if (!fs.existsSync(absoluteDir)) {
      console.warn(`⚠ Directory not found, skipping: ${dir}`);
      continue;
    }

    const files = fs.readdirSync(absoluteDir).filter(f => f.endsWith('.png'));

    if (files.length === 0) {
      console.log(`  No PNG files in ${dir}`);
      continue;
    }

    console.log(`\nConverting ${files.length} PNG(s) in ${dir}/`);

    for (const file of files) {
      const inputPath = path.join(absoluteDir, file);
      const result = await convertFile(inputPath);

      totalInput += result.inputSize;
      totalOutput += result.outputSize;
      fileCount += 1;

      const relativePath = path.relative(PROJECT_ROOT, result.outputPath);
      console.log(`  ✓ ${relativePath} (${formatBytes(result.inputSize)} → ${formatBytes(result.outputSize)}, -${result.savings}%)`);
    }
  }

  if (fileCount > 0) {
    const totalSavings = ((1 - totalOutput / totalInput) * 100).toFixed(1);
    console.log(`\n✓ Done: ${fileCount} file(s) converted.`);
    console.log(`  Total: ${formatBytes(totalInput)} → ${formatBytes(totalOutput)} (-${totalSavings}%)`);
  } else {
    console.log('\nNo PNG files found to convert.');
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

main().catch(error => {
  console.error('Conversion failed:', error.message);
  process.exit(1);
});
