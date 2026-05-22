#!/usr/bin/env node
'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_HOST = '127.0.0.1';
const REPORT_RELATIVE_PATH = 'artifacts/visual-compat-report.json';
const REPORT_PATH = path.join(ROOT, REPORT_RELATIVE_PATH);

function printHelp() {
  console.log(`Usage: npm run visual:check -- [options]

Options:
  --browser <path>  Chromium, Chrome, or Edge executable. Defaults to CHROME_PATH/BROWSER_PATH lookup.
  --host <host>     Host to bind. Defaults to ${DEFAULT_HOST}.
  --port <port>     Port to bind. Defaults to an available local port.
  --help            Show this help.

Examples:
  npm run visual:check
  npm run visual:check -- --browser "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`);
}

function parseArgs(argv) {
  const options = {
    browser: '',
    host: DEFAULT_HOST,
    port: 0
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--browser') {
      options.browser = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (arg === '--host') {
      options.host = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (arg === '--port') {
      options.port = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    throw Object.assign(new Error(`Unknown option: ${arg}`), { exitCode: 2 });
  }

  if (!options.host) {
    throw Object.assign(new Error('Missing host value.'), { exitCode: 2 });
  }

  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    throw Object.assign(new Error('Port must be an integer from 0 to 65535.'), { exitCode: 2 });
  }

  return options;
}

function browserCandidates(explicitPath) {
  const localAppData = process.env.LOCALAPPDATA || '';
  return [
    explicitPath,
    process.env.CHROME_PATH,
    process.env.BROWSER_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(localAppData, 'Microsoft\\Edge\\Application\\msedge.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge'
  ].filter(Boolean);
}

function findBrowser(explicitPath) {
  for (const candidate of browserCandidates(explicitPath)) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw Object.assign(new Error('No Chromium browser found. Set CHROME_PATH or pass --browser.'), { exitCode: 2 });
}

function getFreePort(host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, host, () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function httpOk(url) {
  return new Promise(resolve => {
    let settled = false;
    const done = value => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const request = http.get(url, response => {
      response.resume();
      done(response.statusCode >= 200 && response.statusCode < 500);
    });
    request.setTimeout(500, () => {
      request.destroy();
      done(false);
    });
    request.on('error', () => done(false));
  });
}

async function waitForServer(url, processRef) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    if (processRef.exitCode !== null) {
      throw new Error('Dev server exited before readiness.');
    }
    if (await httpOk(url)) return;
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  throw new Error('Timed out waiting for dev server readiness.');
}

function runProcess(command, args, options = {}) {
  const timeoutMs = options.timeoutMs || 60000;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Process timed out after ${timeoutMs}ms: ${command}`));
    }, timeoutMs);

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

function decodeHtmlText(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function extractReport(dom) {
  const match = dom.match(/<pre\b[^>]*id=["']visual-compat-result["'][^>]*>([\s\S]*?)<\/pre>/i);
  if (!match) throw new Error('visual compatibility report was not found in browser output');
  const text = decodeHtmlText(match[1]).trim();
  const report = JSON.parse(text);
  if (report.status === 'running') throw new Error('visual compatibility runner did not finish before browser shutdown');
  return report;
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function printReport(report) {
  const totals = report.totals || { total: 0, passed: 0, failed: 0 };
  console.log(`visual-compat: ${totals.passed}/${totals.total} cases passed`);
  console.log(`visual-compat: report written to ${REPORT_RELATIVE_PATH}`);

  for (const entry of report.cases || []) {
    if (entry.passed) continue;
    console.error(`${entry.viewport} ${entry.path}: ${entry.issues.join('; ')}`);
  }
}

function safeRemoveTempDir(directory) {
  const resolved = path.resolve(directory);
  const tempRoot = path.resolve(os.tmpdir());
  const relative = path.relative(tempRoot, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return;
  fs.rmSync(resolved, { recursive: true, force: true });
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(error.exitCode || 1);
  }

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const browser = findBrowser(options.browser);
  const port = options.port || await getFreePort(options.host);
  const baseUrl = `http://${options.host}:${port}`;
  const runnerUrl = `${baseUrl}/tools/visual-compat-runner.html`;
  const userDataDir = path.join(os.tmpdir(), `igrs-visual-compat-${process.pid}`);
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config', 'config/vite.config.ts', '--host', options.host, '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', () => {});
  server.stderr.on('data', () => {});

  try {
    await waitForServer(runnerUrl, server);
    const browserResult = await runProcess(browser, [
      '--headless=new',
      '--disable-background-networking',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-default-browser-check',
      '--no-first-run',
      `--user-data-dir=${userDataDir}`,
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=120000',
      '--window-size=1366,768',
      '--dump-dom',
      runnerUrl
    ], { timeoutMs: 150000 });

    if (browserResult.code !== 0) {
      throw new Error(browserResult.stderr || `Browser exited with code ${browserResult.code}`);
    }

    const report = extractReport(browserResult.stdout);
    writeReport(report);
    printReport(report);

    if (report.status !== 'pass') {
      process.exitCode = 1;
    }
  } finally {
    server.kill();
    safeRemoveTempDir(userDataDir);
  }
}

main().catch(error => {
  console.error(error.message || String(error));
  process.exit(error.exitCode || 1);
});
