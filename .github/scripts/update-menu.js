#!/usr/bin/env node
/**
 * update-menu.js
 *
 * Scans all subfolders that contain an index.html and, for any folder not yet
 * listed in the root index.html, adds:
 *  - a <a class="game-card"> entry in index.html
 *  - a table row in README.md
 *
 * Metadata is read from <game-folder>/game.json:
 *   { "name": "My Game", "icon": "🎮", "description": "Short blurb." }
 * If game.json is absent the folder name is used as a title fallback.
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '../..');
const INDEX_PATH  = path.join(ROOT, 'index.html');
const README_PATH = path.join(ROOT, 'README.md');

// Directories that are never game folders
const SKIP = new Set(['.git', '.github', 'node_modules']);

// ── Helpers ────────────────────────────────────────────────────────────────

function titleCase(str) {
  return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getMeta(folder) {
  const metaPath = path.join(ROOT, folder, 'game.json');
  if (fs.existsSync(metaPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      return {
        name:        raw.name        || titleCase(folder),
        icon:        raw.icon        || '🎮',
        description: raw.description || '',
      };
    } catch (e) {
      console.warn(`  ⚠ Could not parse ${metaPath}: ${e.message}`);
    }
  }
  return { name: titleCase(folder), icon: '🎮', description: '' };
}

// ── Discover game folders ──────────────────────────────────────────────────

const gameFolders = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory() && !SKIP.has(d.name) && !d.name.startsWith('.'))
  .filter(d => fs.existsSync(path.join(ROOT, d.name, 'index.html')))
  .map(d => d.name)
  .sort();

console.log(`Found game folders: ${gameFolders.join(', ')}`);

// ── Load files (normalise to LF so regexes work cross-platform) ────────────

let indexHtml = fs.readFileSync(INDEX_PATH, 'utf8').replace(/\r\n/g, '\n');
let readme    = fs.readFileSync(README_PATH, 'utf8').replace(/\r\n/g, '\n');

let indexChanged  = false;
let readmeChanged = false;

// ── Process each folder ────────────────────────────────────────────────────

for (const folder of gameFolders) {
  // Skip if already referenced in index.html
  if (indexHtml.includes(`href="${folder}/"`)) {
    console.log(`  ✓ ${folder} already in index.html`);
    continue;
  }

  console.log(`  + Adding ${folder} …`);
  const meta = getMeta(folder);

  // ── index.html: insert card before the closing </div> of .game-grid ──
  //    The marker we look for is the blank line + </div> + blank line + <footer
  const cardHtml = `
      <a class="game-card" href="${folder}/">
        <div class="card-icon">${meta.icon}</div>
        <div class="card-name">${meta.name}</div>
        <p class="card-desc">${meta.description}</p>
        <span class="card-cta">&#9658; Play</span>
      </a>
`;

  // Insert just before the game-grid closing tag
  const GRID_CLOSE = /(\s*<\/div>\s*\n\s*<footer)/;
  if (GRID_CLOSE.test(indexHtml)) {
    indexHtml = indexHtml.replace(GRID_CLOSE, `${cardHtml}\n    </div>\n\n    <footer`);
    indexChanged = true;
  } else {
    console.error('  ✗ Could not find game-grid closing marker in index.html');
  }

  // ── README.md: append a row to the Games table ──────────────────────
  // Match the last row of the | Folder | Game | Description | table
  const TABLE_ROW = /((?:\| \[`[^`]+`\]\([^)]+\) \|[^\n]+\|\n)+)/;
  const row = `| [\`${folder}/\`](${folder}/) | ${meta.icon} ${meta.name} | ${meta.description} |\n`;
  if (TABLE_ROW.test(readme)) {
    readme = readme.replace(TABLE_ROW, `$1${row}`);
    readmeChanged = true;
  } else {
    console.error('  ✗ Could not find game table in README.md');
  }
}

// ── Write back ─────────────────────────────────────────────────────────────

if (indexChanged) {
  fs.writeFileSync(INDEX_PATH, indexHtml, 'utf8');
  console.log('Wrote index.html');
}
if (readmeChanged) {
  fs.writeFileSync(README_PATH, readme, 'utf8');
  console.log('Wrote README.md');
}

if (!indexChanged && !readmeChanged) {
  console.log('Nothing to update.');
}
