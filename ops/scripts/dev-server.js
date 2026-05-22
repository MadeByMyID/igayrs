#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 5173;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function printHelp() {
  console.log(`Usage: npm run dev -- [options]

Options:
  --host <host>    Host to bind. Defaults to ${DEFAULT_HOST}.
  --port <port>    Port to bind. Defaults to ${DEFAULT_PORT} or PORT.
  --root <path>    Directory to serve. Defaults to the project root.
  --help           Show this help.

Examples:
  npm run dev
  npm run dev -- --port 8080
  npm run dev -- --host 0.0.0.0 --port 8080`);
}

function parseArgs(argv) {
  const options = {
    host: process.env.HOST || DEFAULT_HOST,
    port: process.env.PORT || String(DEFAULT_PORT),
    root: process.env.SERVE_ROOT || PROJECT_ROOT
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--host') {
      options.host = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--port') {
      options.port = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--root') {
      options.root = argv[index + 1];
      index += 1;
      continue;
    }
    throw Object.assign(new Error(`Unknown option: ${arg}`), { exitCode: 2 });
  }

  if (!options.host) {
    throw Object.assign(new Error('Missing host value.'), { exitCode: 2 });
  }

  const port = Number(options.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw Object.assign(new Error('Port must be an integer from 1 to 65535.'), { exitCode: 2 });
  }
  options.port = port;

  const root = path.resolve(PROJECT_ROOT, options.root);
  const relative = path.relative(PROJECT_ROOT, root);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw Object.assign(new Error('Root must stay inside the project directory.'), { exitCode: 2 });
  }
  options.root = root;

  return options;
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  });
  response.end(message);
}

function hasHiddenPathSegment(requestPath) {
  return requestPath
    .split(/[\\/]+/)
    .some(segment => segment.length > 1 && segment.startsWith('.'));
}

function resolveRequestPath(root, requestPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch {
    return { error: 400 };
  }

  if (hasHiddenPathSegment(decodedPath)) {
    return { error: 403 };
  }

  const resolved = path.resolve(root, `.${decodedPath}`);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return { error: 403 };
  }

  return { resolved };
}

function withSecurityHeaders(headers) {
  return {
    ...headers,
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  };
}

function fileHeaders(filePath, stat) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || 'application/octet-stream';
  const headers = { 'Content-Type': contentType };
  if (stat?.size !== undefined) headers['Content-Length'] = stat.size;
  return headers;
}

function sendFileHead(response, filePath, statusCode, stat) {
  response.writeHead(statusCode, withSecurityHeaders(fileHeaders(filePath, stat)));
  response.end();
}

function serveFile(response, filePath, statusCode = 200, stat = null) {
  response.writeHead(statusCode, withSecurityHeaders(fileHeaders(filePath, stat)));
  fs.createReadStream(filePath)
    .on('error', error => {
      if (!response.headersSent) {
        sendText(response, 500, 'Internal Server Error');
        return;
      }
      response.destroy(error);
    })
    .pipe(response);
}

function serveNotFound(root, response, headOnly = false) {
  const fallback404 = path.join(root, '404.html');
  let stat;
  try {
    stat = fs.statSync(fallback404);
  } catch {
    sendText(response, 404, 'Not Found');
    return;
  }

  if (!stat.isFile()) {
    sendText(response, 404, 'Not Found');
    return;
  }

  if (headOnly) {
    sendFileHead(response, fallback404, 404, stat);
    return;
  }

  serveFile(response, fallback404, 404, stat);
}

function createServer(root) {
  return http.createServer((request, response) => {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();
    let statusCode = 200;

    response.on('finish', () => {
      const latencyMs = Math.round(performance.now() - startedAt);
      console.log(JSON.stringify({
        requestId,
        method: request.method,
        path: request.url,
        statusCode: response.statusCode || statusCode,
        latencyMs
      }));
    });

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      statusCode = 405;
      response.writeHead(statusCode, withSecurityHeaders({
        Allow: 'GET, HEAD',
        'Content-Type': 'text/plain; charset=utf-8'
      }));
      response.end('Method Not Allowed');
      return;
    }

    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const result = resolveRequestPath(root, url.pathname);
    if (result.error) {
      statusCode = result.error;
      sendText(response, statusCode, statusCode === 400 ? 'Bad Request' : 'Forbidden');
      return;
    }

    let filePath = result.resolved;
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      statusCode = 404;
      serveNotFound(root, response, request.method === 'HEAD');
      return;
    }

    if (stat.isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        statusCode = 308;
        response.writeHead(statusCode, withSecurityHeaders({ Location: `${url.pathname}/${url.search}` }));
        response.end();
        return;
      }
      filePath = path.join(filePath, 'index.html');
      try {
        stat = fs.statSync(filePath);
      } catch {
        statusCode = 404;
        serveNotFound(root, response, request.method === 'HEAD');
        return;
      }
    }

    if (!stat.isFile()) {
      statusCode = 404;
      serveNotFound(root, response, request.method === 'HEAD');
      return;
    }

    if (request.method === 'HEAD') {
      sendFileHead(response, filePath, statusCode, stat);
      return;
    }

    serveFile(response, filePath, statusCode, stat);
  });
}

function main() {
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

  const server = createServer(options.root);
  server.on('error', error => {
    console.error(JSON.stringify({
      code: 'DEV_SERVER_START_FAILED',
      message: error.message
    }));
    process.exit(1);
  });

  server.listen(options.port, options.host, () => {
    const url = `http://${options.host}:${options.port}/`;
    console.log(`IGRSDB dev server running at ${url}`);
    console.log('Press Ctrl+C to stop.');
  });
}

main();
