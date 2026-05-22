#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function walkFiles(relativePath, predicate = () => true) {
  const root = path.join(ROOT, relativePath);
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(child, predicate));
      continue;
    }
    if (predicate(child)) files.push(child);
  }
  return files;
}

function testPackageUsesModernFrontendStack() {
  const pkg = readJson('package.json');
  const dependencies = pkg.dependencies || {};
  const devDependencies = pkg.devDependencies || {};

  assert(pkg.name === 'igrsdb', 'package.json: expected package name');
  assert(/^\d+\.\d+\.\d+/.test(pkg.version), 'package.json: version should use semantic versioning');
  assert(pkg.description && !/todo|placeholder/i.test(pkg.description), 'package.json: expected production description');
  assert(pkg.private === true, 'package.json: static app package should stay private');
  assert(pkg.license === 'UNLICENSED', 'package.json: private app should declare UNLICENSED package metadata');
  assert(pkg.main === 'src/main.tsx', 'package.json: expected source entry metadata');
  assert(pkg.homepage === 'https://igrs.madeby.my.id/', 'package.json: expected deployed homepage metadata');
  assert(pkg.scripts.dev === 'vite --config config/vite.config.ts --host 127.0.0.1', 'package.json: dev should run Vite with grouped config');
  assert(pkg.scripts.build === 'tsc -b config/tsconfig.json && vite --config config/vite.config.ts build', 'package.json: build should typecheck and run Vite without mutating branch-root Pages files');
  assert(pkg.scripts['build:pages-root'] === 'npm run build && node ops/scripts/sync-pages-root.js', 'package.json: branch-root Pages sync should be explicit');
  assert(pkg.scripts.preview === 'vite --config config/vite.config.ts preview --host 127.0.0.1', 'package.json: preview should run Vite preview with grouped config');
  assert(pkg.scripts.typecheck === 'tsc -b config/tsconfig.json', 'package.json: typecheck should use TypeScript build mode');
  assert(pkg.scripts.test === 'vitest --config config/vite.config.ts run', 'package.json: test should use Vitest with grouped config');
  assert(pkg.scripts.check.includes('npm run lint'), 'package.json: check should include linting');
  assert(pkg.scripts.check.includes('npm run test'), 'package.json: check should include tests');
  assert(pkg.scripts.check.includes('npm run build'), 'package.json: check should include production build');

  for (const name of ['@vitejs/plugin-react', '@tailwindcss/vite', 'lightningcss', 'typescript', 'vite', 'vitest']) {
    assert(devDependencies[name], `package.json: expected devDependency ${name}`);
  }

  for (const name of ['@vitejs/plugin-react', '@tailwindcss/vite']) {
    assert(!dependencies[name], `package.json: ${name} should stay out of runtime dependencies`);
  }

  for (const name of ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'valibot']) {
    assert(dependencies[name], `package.json: expected dependency ${name}`);
  }
}

function testProjectRootStaysGrouped() {
  for (const relativePath of ['config', 'ops', 'public', 'src']) {
    assert(exists(relativePath), `${relativePath}: expected grouped top-level project directory`);
  }

  for (const relativePath of ['app', 'tests', 'scripts', 'tools', 'worker']) {
    assert(!exists(relativePath), `${relativePath}: expected implementation details to be grouped away from the project root`);
  }
}

function testGitHubPagesBranchRootHasBuiltEntrypoint() {
  const rootIndex = read('index.html');
  assert(rootIndex.includes('<div id="root"></div>'), 'index.html: branch-root Pages should serve the app, not README.md');
  assert(rootIndex.includes('src="./assets/main-'), 'index.html: branch-root Pages should load the built JS bundle');
  assert(rootIndex.includes('href="./assets/main-'), 'index.html: branch-root Pages should load the built CSS bundle');
  assert(exists('assets/data/json/igrs.games.json'), 'assets/data/json/igrs.games.json: branch-root Pages should include public data');
  assert(exists('assets/data/images/favicon.svg'), 'assets/data/images/favicon.svg: branch-root Pages should include public images');
  assert(exists('search/index.html'), 'search/index.html: branch-root Pages should include the search route entrypoint');
  assert(exists('ratings/index.html'), 'ratings/index.html: branch-root Pages should include the ratings route entrypoint');
  assert(exists('steamchecker/index.html'), 'steamchecker/index.html: branch-root Pages should include the Steam checker route entrypoint');
  assert(exists('.nojekyll'), '.nojekyll: branch-root Pages should not run Jekyll processing');

  const syncScript = read('ops/scripts/sync-pages-root.js');
  assert(syncScript.includes('PUBLISH_PATHS'), 'ops/scripts/sync-pages-root.js: expected explicit publish path allowlist');
  assert(syncScript.includes('assertInsideProject'), 'ops/scripts/sync-pages-root.js: sync should guard write paths');
}

function testViteTypescriptTailwindConfigurationExists() {
  for (const relativePath of [
    'config/vite.config.ts',
    'config/tsconfig.json',
    'config/tsconfig.app.json',
    'config/tsconfig.node.json',
    'config/tsconfig.test.json',
    'config/tailwind.config.ts',
    'config/eslint.config.js',
    'src/vite-env.d.ts'
  ]) {
    assert(exists(relativePath), `${relativePath}: expected modern stack configuration`);
  }

  const viteConfig = read('config/vite.config.ts');
  assert(viteConfig.includes('@vitejs/plugin-react'), 'vite.config.ts: expected React plugin');
  assert(viteConfig.includes('@tailwindcss/vite'), 'vite.config.ts: expected Tailwind Vite plugin');
  assert(viteConfig.includes("base: './'"), 'vite.config.ts: built asset URLs should be relative for GitHub project Pages');
  assert(viteConfig.includes("transformer: 'lightningcss'"), 'vite.config.ts: expected Lightning CSS transformer');
  assert(viteConfig.includes("cssMinify: 'lightningcss'"), 'vite.config.ts: expected Lightning CSS minifier');
  assert(viteConfig.includes("../public"), 'vite.config.ts: expected grouped public asset directory');
  assert(viteConfig.includes("'search/index.html'"), 'vite.config.ts: expected search page build entry');
  assert(viteConfig.includes("'ratings/index.html'"), 'vite.config.ts: expected ratings page build entry');
  assert(viteConfig.includes("'steamchecker/index.html'"), 'vite.config.ts: expected steam checker build entry');

  const appTsConfig = readJson('config/tsconfig.app.json');
  assert(appTsConfig.compilerOptions.strict === true, 'tsconfig.app.json: strict mode should be enabled');
  assert(appTsConfig.compilerOptions.jsx === 'react-jsx', 'tsconfig.app.json: expected React JSX transform');
  assert(appTsConfig.compilerOptions.noUncheckedIndexedAccess === true, 'tsconfig.app.json: expected indexed access checks');
}

function testProjectPagesAssetPathsArePortable() {
  const constants = read('src/core/constants.ts');
  assert(constants.includes('APP_BASE_PATH'), 'src/core/constants.ts: expected deployed app base path helper');
  assert(constants.includes('import.meta.url'), 'src/core/constants.ts: asset base should derive from the deployed module URL');
  assert(constants.includes("publicAssetPath('assets/data')"), 'src/core/constants.ts: public data assets should be rooted under the deployed app base');

  const app = read('src/app/App.tsx');
  assert(app.includes('basename={routerBasename}'), 'src/app/App.tsx: BrowserRouter should use the deployed app basename');

  const htmlEntries = [
    { favicon: '%BASE_URL%assets/data/images/favicon.svg', path: 'src/index.html' },
    { favicon: '%BASE_URL%assets/data/images/favicon.svg', path: 'src/404.html' },
    { favicon: '../assets/data/images/favicon.svg', path: 'src/search/index.html' },
    { favicon: '../assets/data/images/favicon.svg', path: 'src/ratings/index.html' },
    { favicon: '../assets/data/images/favicon.svg', path: 'src/steamchecker/index.html' }
  ];
  for (const { favicon, path: relativePath } of htmlEntries) {
    const html = read(relativePath);
    assert(html.includes(`href="${favicon}"`), `${relativePath}: favicon should use a path that resolves under the deployed app base`);
    assert(!html.includes('href="/assets/data/images/favicon.svg"'), `${relativePath}: favicon should not use a domain-root asset path`);
  }

  const hardcodedAssetFiles = walkFiles('src', relativePath => /\.(ts|tsx)$/.test(relativePath))
    .filter(relativePath => read(relativePath).includes('"/assets/data'));
  assert(hardcodedAssetFiles.length === 0, `source files should not hard-code root /assets paths: ${hardcodedAssetFiles.join(', ')}`);
}

function testReactApplicationBoundariesExist() {
  for (const relativePath of [
    'src/main.tsx',
    'src/app/App.tsx',
    'src/app/providers/language-provider.tsx',
    'src/app/providers/data-provider.tsx',
    'src/shared/api/data-service.ts',
    'src/shared/api/steam-api.ts',
    'src/shared/components/app-shell.tsx',
    'src/shared/components/rating-badge.tsx',
    'src/shared/types.ts',
    'src/features/home/home-page.tsx',
    'src/features/search/search-page.tsx',
    'src/features/ratings/ratings-page.tsx',
    'src/features/steam-checker/steam-checker-page.tsx',
    'src/features/fallback/not-found-page.tsx',
    'src/styles/app.css'
  ]) {
    assert(exists(relativePath), `${relativePath}: expected typed React application boundary`);
  }

  const main = read('src/main.tsx');
  assert(main.includes('createRoot'), 'src/main.tsx: expected React root creation');
  assert(main.includes("import './styles/app.css'"), 'src/main.tsx: expected centralized Vite CSS import');

  const app = read('src/app/App.tsx');
  assert(app.includes('react-router-dom'), 'src/app/App.tsx: expected React Router integration');
  assert(app.includes('<DataProvider>'), 'src/app/App.tsx: expected shared data provider');
  assert(app.includes('<LanguageProvider>'), 'src/app/App.tsx: expected shared language provider');
}

function testHtmlEntrypointsUseViteReactRoot() {
  const entries = [
    { canonical: 'https://igrs.madeby.my.id/', path: 'src/index.html' },
    { canonical: 'https://igrs.madeby.my.id/404.html', path: 'src/404.html' },
    { canonical: 'https://igrs.madeby.my.id/search/', path: 'src/search/index.html' },
    { canonical: 'https://igrs.madeby.my.id/ratings/', path: 'src/ratings/index.html' },
    { canonical: 'https://igrs.madeby.my.id/steamchecker/', path: 'src/steamchecker/index.html' }
  ];

  for (const { canonical, path: relativePath } of entries) {
    const html = read(relativePath);
    assert(html.includes('<div id="root"></div>'), `${relativePath}: expected React root mount`);
    assert(html.includes('type="module" src="/main.tsx"'), `${relativePath}: expected Vite React entry`);
    assert(html.includes(`<link rel="canonical" href="${canonical}">`), `${relativePath}: expected canonical URL`);
    for (const token of ['property="og:title"', 'property="og:description"', 'property="og:image"', 'property="og:url"', 'property="og:type"', 'name="twitter:card"', 'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image"']) {
      assert(html.includes(token), `${relativePath}: expected social metadata token ${token}`);
    }
    assert(!html.includes('assets/styles/main.css'), `${relativePath}: should not link the legacy stylesheet directly`);
    assert(!html.includes('src="src/main.js"'), `${relativePath}: should not load the legacy app bootstrap`);
  }
}

function testVitePublicAssetsAreCanonical() {
  assert(exists('public/assets/data/json/igrs.meta.json'), 'public/assets/data/json/igrs.meta.json: expected canonical metadata asset');
  assert(exists('public/assets/data/json/igrs.games.json'), 'public/assets/data/json/igrs.games.json: expected canonical games asset');
  assert(exists('public/assets/data/images/favicon.svg'), 'public/assets/data/images/favicon.svg: expected canonical favicon asset');
  assert(exists('assets/data/json/igrs.meta.json'), 'assets/data/json/igrs.meta.json: branch-root Pages should include generated public data');
  assert(!exists('assets/styles/main.css'), 'assets/styles/main.css: source styles should be bundled from src/styles');
}

function testAutomationTargetsVitePublicData() {
  const workflow = read('.github/workflows/update-igrs-db.yml');
  assert(workflow.includes('OUTPUT_DIR="public/assets/data/json"'), '.github/workflows/update-igrs-db.yml: data refresh should write to Vite public assets');
  assert(workflow.includes('git add public/assets/data/json/igrs.meta.json public/assets/data/json/igrs.games.json public/assets/data/json/igrs.extra.json'), '.github/workflows/update-igrs-db.yml: commit step should stage Vite public data assets');

  const runner = read('src/tools/visual-compat-runner.html');
  const visualScript = read('ops/scripts/visual-compat.js');
  assert(visualScript.includes("'--config', 'config/vite.config.ts'"), 'ops/scripts/visual-compat.js: expected grouped Vite config when starting the dev server');
  assert(runner.includes("ready: '[data-route-ready=\"home\"]'"), 'src/tools/visual-compat-runner.html: expected React-ready home selector');
  assert(runner.includes("ready: '[data-route-ready=\"search\"]'"), 'src/tools/visual-compat-runner.html: expected React-ready search selector');
  assert(runner.includes("ready: '[data-route-ready=\"ratings\"]'"), 'src/tools/visual-compat-runner.html: expected React-ready ratings selector');
}

function testRepositoryFinalizationHygiene() {
  const gitignore = read('.gitignore');
  for (const token of ['node_modules/', 'dist/', 'build/', 'coverage/', '.env', '.env.local', '.DS_Store', '*.log']) {
    assert(gitignore.includes(token), `.gitignore: expected ${token}`);
  }

  const productionFiles = walkFiles('src', relativePath => (
    /\.(ts|tsx|js|jsx)$/.test(relativePath)
    && !relativePath.includes('/tests/')
    && !relativePath.includes('\\tests\\')
    && !relativePath.includes('/test/')
    && !relativePath.includes('\\test\\')
  ));

  for (const relativePath of productionFiles) {
    assert(!/\bconsole\.log\s*\(/.test(read(relativePath)), `${relativePath}: production code should not contain console.log debug output`);
  }
}

const tests = [
  testPackageUsesModernFrontendStack,
  testProjectRootStaysGrouped,
  testGitHubPagesBranchRootHasBuiltEntrypoint,
  testViteTypescriptTailwindConfigurationExists,
  testProjectPagesAssetPathsArePortable,
  testReactApplicationBoundariesExist,
  testHtmlEntrypointsUseViteReactRoot,
  testVitePublicAssetsAreCanonical,
  testAutomationTargetsVitePublicData,
  testRepositoryFinalizationHygiene
];

for (const test of tests) {
  test();
}

console.log(`stack: ${tests.length} checks passed`);
