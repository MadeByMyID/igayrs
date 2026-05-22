import type { Config } from 'tailwindcss';

export default {
  content: [
    '../src/index.html',
    '../src/404.html',
    '../src/search/index.html',
    '../src/ratings/index.html',
    '../src/steamchecker/index.html',
    '../src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {}
  }
} satisfies Config;
