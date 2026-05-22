import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';

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

export default defineConfig({
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
    transformer: 'lightningcss'
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
    cssMinify: 'lightningcss',
    rollupOptions: {
      input: {
        app: htmlEntry('index.html'),
        fallback: htmlEntry('404.html'),
        ratings: htmlEntry('ratings/index.html'),
        search: htmlEntry('search/index.html'),
        steamchecker: htmlEntry('steamchecker/index.html')
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['test/setup.ts'],
    css: true
  },
  root
});
