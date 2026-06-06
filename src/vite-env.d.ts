/// <reference types="vite/client" />

/** App version auto-detected from CHANGELOG.md at build time */
declare const APP_VERSION: string;

/** Raw text import for markdown files (Vite ?raw suffix) */
declare module '*.md?raw' {
  const content: string;
  export default content;
}
