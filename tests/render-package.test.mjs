// Regression gate for the Render static preview. No deployment or network required.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { posix as path } from 'node:path';

const root = new URL('../', import.meta.url);
const source = file => readFileSync(new URL(file, root), 'utf8');
const yaml = source('render.yaml');
const build = yaml.match(/^\s*buildCommand:\s*(.+)$/m)?.[1];
assert.ok(build, 'Render static build command must be present');

// The blueprint uses simple cp statements so we can validate the actual
// publish paths without running Render or relying on a YAML package.
function publishedFiles(command) {
  const shipped = new Set();
  for (const part of command.split('&&').map(s => s.trim())) {
    if (part.startsWith('mkdir ')) continue;
    const match = /^cp\s+(.+?)\s+(dist(?:\/v2)?\/)$/u.exec(part);
    assert.ok(match, 'Unexpected build command; update the packaging test: ' + part);
    const destination = match[2].replace(/^dist\//, '');
    for (const file of match[1].trim().split(/\s+/u)) {
      assert.ok(existsSync(new URL(file, root)), 'Source file missing: ' + file);
      shipped.add(destination + path.basename(file));
    }
  }
  return shipped;
}
const shipped = publishedFiles(build);

test('Render preview publishes all catalog, Pro, authentication and brand dependencies', () => {
  for (const file of [
    'index.html', 'editor.html', 'cuenta.html', 'editor.js',
    'editor-pro.mjs', 'editor-catalog.mjs', 'auth-storage.mjs',
    'auth-captcha.mjs', 'cuenta.js', 'config.js', 'brand.css',
    'brand-mark.png', 'brand-symbol.svg', 'v2/catalog-core.mjs',
    'v2/pro-editor-core.mjs', 'v2/pro-mexico-tools.mjs'
  ]) assert.ok(shipped.has(file), 'Missing from static publish: ' + file);
});

test('Local HTML assets and relative ESM imports resolve inside dist', () => {
  for (const file of ['index.html', 'editor.html', 'cuenta.html']) {
    const html = source(file);
    for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gu)) {
      const value = match[1].split(/[?#]/u)[0];
      if (!value || value === './' || /^(?:[a-z]+:|\/|#)/iu.test(value)) continue;
      const target = path.normalize(path.join(path.dirname(file), value));
      assert.ok(shipped.has(target), file + ' references unpublished asset ' + target);
    }
  }
  for (const file of [
    'cuenta.js', 'editor-pro.mjs', 'editor-catalog.mjs',
    'v2/catalog-core.mjs', 'v2/pro-editor-core.mjs', 'v2/pro-mexico-tools.mjs'
  ]) {
    for (const match of source(file).matchAll(/\b(?:from\s*|import\s*)["'](\.[^"']+)["']/gu)) {
      const target = path.normalize(path.join(path.dirname(file), match[1]));
      assert.ok(shipped.has(target), file + ' imports unpublished module ' + target);
    }
  }
});
