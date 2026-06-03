import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8')
);

const analyze = process.env.ANALYZE === 'true';

const sourceRootUrl = new URL('../src/', import.meta.url);
const root = fileURLToPath(sourceRootUrl);
const htmlEntry = (relativePath: string) => fileURLToPath(new URL(relativePath, sourceRootUrl));

function hiddenPathGuard(): Plugin {
  return {
    name: 'igrs-hidden-path-guard',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
        if (pathname.startsWith('/@fs/')) {
          next();
          return;
        }

        const hasHiddenSegment = pathname
          .split(/[\\/]+/)
          .some(segment => segment.length > 1 && segment.startsWith('.'));

        if (!hasHiddenSegment) {
          next();
          return;
        }

        response.writeHead(403, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Referrer-Policy': 'no-referrer',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY'
        });
        response.end('Forbidden');
      });
    }
  };
}

export default defineConfig(async () => {
  const rollupPlugins = analyze
    ? [(await import('rollup-plugin-visualizer')).visualizer({
        filename: 'artifacts/bundle-report.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap'
      })]
    : [];

  return {
    base: './',
    define: {
      APP_VERSION: JSON.stringify(pkg.version),
    },
    plugins: [
      hiddenPathGuard(),
      react(),
      tailwindcss()
    ],
    publicDir: fileURLToPath(new URL('../public', import.meta.url)),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('../src', import.meta.url))
      }
    },
    css: {
      transformer: 'lightningcss' as const
    },
    server: {
      fs: {
        strict: true,
        deny: ['**/.git/**', '**/.env', '**/.env.*']
      }
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      cssMinify: 'lightningcss' as const,
      rollupOptions: {
        input: {
          app: htmlEntry('index.html'),
          fallback: htmlEntry('404.html'),
          ratings: htmlEntry('ratings/index.html'),
          search: htmlEntry('search/index.html'),
          steamchecker: htmlEntry('steamchecker/index.html')
        },
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/react-router-dom/') ||
                id.includes('node_modules/lucide-react/') ||
                id.includes('node_modules/valibot/')) {
              return 'vendor';
            }
          }
        },
        plugins: rollupPlugins
      }
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
      setupFiles: ['test/setup.ts'],
      css: true,
      coverage: {
        provider: 'v8' as const,
        thresholds: {
          statements: 55,
          branches: 45,
          functions: 59,
          lines: 59,
        },
        reporter: ['text', 'lcov'],
      } as Record<string, unknown>,
    },
    root
  };
});
