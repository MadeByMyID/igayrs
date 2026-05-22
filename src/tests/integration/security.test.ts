// @vitest-environment node
import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const HOST = '127.0.0.1';
let child: ChildProcess | null = null;

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, HOST, () => {
      const address = server.address();
      server.close(() => resolve(typeof address === 'object' && address ? address.port : 0));
    });
  });
}

function request(pathname: string, port: number): Promise<{ body: string; statusCode: number }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: HOST, method: 'GET', path: pathname, port }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
      });
      response.on('end', () => resolve({ body, statusCode: response.statusCode || 0 }));
    });
    req.setTimeout(3000, () => {
      req.destroy(new Error('Timed out waiting for dev server response'));
    });
    req.on('error', reject);
    req.end();
  });
}

async function waitForServer(port: number, processRef: ChildProcess): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    if (processRef.exitCode !== null) throw new Error('Vite dev server exited before readiness');
    try {
      const response = await request('/', port);
      if (response.statusCode === 200) return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  throw new Error('Timed out waiting for Vite dev server readiness');
}

afterEach(() => {
  child?.kill();
  child = null;
});

async function startViteServer(): Promise<number> {
  const port = await getFreePort();
  child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config', 'config/vite.config.ts', '--host', HOST, '--port', String(port)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  await waitForServer(port, child);
  return port;
}

describe('Vite dev server hardening', () => {
  it('does not expose hidden repository files', async () => {
    const port = await startViteServer();
    const response = await request('/.git/config', port);
    expect(response.statusCode).not.toBe(200);
    expect(response.body).not.toContain('[core]');
  }, 15000);

  it('keeps Vite internal dependency modules reachable', async () => {
    const port = await startViteServer();
    const main = await request('/main.tsx', port);
    expect(main.statusCode).toBe(200);

    const dependencyPath = main.body.match(/from "([^"]*node_modules\/\.vite\/deps\/react[^"]*)"/)?.[1];
    expect(dependencyPath).toBeTruthy();

    const dependency = await request(dependencyPath || '/', port);
    expect(dependency.statusCode).toBe(200);
    expect(dependency.body).toContain('react');
  }, 15000);
});
