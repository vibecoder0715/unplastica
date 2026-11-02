import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const GAME_DIR = path.resolve(ROOT_DIR, 'game');
const STAGING_DIR = path.resolve(ROOT_DIR, 'tmp_game_assets_staging');
const TARGET_ZIP_ROOT = path.resolve(ROOT_DIR, 'game_assets.zip');
const TARGET_ZIP_GAME = path.resolve(GAME_DIR, 'game_assets.zip');

function copyRecursive(src, dest, filterFn) {
  if (filterFn && !filterFn(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item), filterFn);
    }
  } else {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log('Packaging all Wild Malaysia Sanctuary Game Assets into a clean zipfile...');

// Clean any previous staging
if (fs.existsSync(STAGING_DIR)) {
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
}
fs.mkdirSync(STAGING_DIR, { recursive: true });

const targetGameFolder = path.join(STAGING_DIR, 'game');
fs.mkdirSync(targetGameFolder, { recursive: true });

// 1. Copy game_assets (Vector generator definitions & rigs)
console.log('Copying vector asset generators (game/game_assets)...');
copyRecursive(
  path.join(GAME_DIR, 'game_assets'),
  path.join(targetGameFolder, 'game_assets')
);

// 2. Copy src (worldRenderer, scene, mechanics, turtle rig, roster, index.ts, index.css, bg.svg)
console.log('Copying game source & mechanics (game/src)...');
copyRecursive(
  path.join(GAME_DIR, 'src'),
  path.join(targetGameFolder, 'src')
);

// 3. Copy public (assets, individual roster PNGs, audio, but skip nested archives)
console.log('Copying static assets & species roster PNGs (game/public)...');
copyRecursive(
  path.join(GAME_DIR, 'public'),
  path.join(targetGameFolder, 'public'),
  (srcPath) => !srcPath.endsWith('.zip')
);

// 4. Copy standalone runner & configs
const rootGameFiles = [
  'index.html',
  'package.json',
  'tsconfig.json',
  'types.d.ts',
  'metadata.json',
  'README.md',
];
for (const f of rootGameFiles) {
  const srcF = path.join(GAME_DIR, f);
  if (fs.existsSync(srcF)) {
    fs.copyFileSync(srcF, path.join(targetGameFolder, f));
  }
}

// 5. Copy React web integration wrappers for consumer convenience
console.log('Copying web integration components (GamePage & LoadingOverlay)...');
const integrationsFolder = path.join(targetGameFolder, 'integrations', 'react');
fs.mkdirSync(integrationsFolder, { recursive: true });
const webGamePage = path.join(ROOT_DIR, 'apps', 'web', 'src', 'components', 'GamePage.tsx');
const webLoading = path.join(ROOT_DIR, 'apps', 'web', 'src', 'components', 'GameLoadingOverlay.tsx');
if (fs.existsSync(webGamePage)) fs.copyFileSync(webGamePage, path.join(integrationsFolder, 'GamePage.tsx'));
if (fs.existsSync(webLoading)) fs.copyFileSync(webLoading, path.join(integrationsFolder, 'GameLoadingOverlay.tsx'));

// 6. Create archive using tar.exe
console.log(`Compressing to ${TARGET_ZIP_ROOT} ...`);
if (fs.existsSync(TARGET_ZIP_ROOT)) fs.rmSync(TARGET_ZIP_ROOT);
if (fs.existsSync(TARGET_ZIP_GAME)) fs.rmSync(TARGET_ZIP_GAME);

execSync(`tar.exe -a -cf "${TARGET_ZIP_ROOT}" -C "${STAGING_DIR}" game`, { stdio: 'inherit' });

// Also copy to game/ directory
fs.copyFileSync(TARGET_ZIP_ROOT, TARGET_ZIP_GAME);

// Clean staging
fs.rmSync(STAGING_DIR, { recursive: true, force: true });

const rootStats = fs.statSync(TARGET_ZIP_ROOT);
console.log(`Successfully generated game_assets.zip!`);
console.log(`  Root location: ${TARGET_ZIP_ROOT} (${(rootStats.size / (1024 * 1024)).toFixed(2)} MB)`);
console.log(`  Game location: ${TARGET_ZIP_GAME} (${(rootStats.size / (1024 * 1024)).toFixed(2)} MB)`);
