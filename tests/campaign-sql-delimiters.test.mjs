import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../migrations/20261027_pf_campaign_drafts_stage_only.sql', import.meta.url), 'utf8');

function checkedDoBlocks(source) {
  const clean = source.replace(/--[^\n]*/g, '');
  const count = (clean.match(/\bDO\b/gi) || []).length;
  const blocks = [...clean.matchAll(/\bDO\s+(\$\$|\$[A-Za-z_][A-Za-z_0-9]*\$)([\s\S]*?)\1\s*;/gi)];
  assert.equal(blocks.length, count, 'every DO block must use paired dollar-quote delimiters');
  return blocks;
}

test('both PL/pgSQL preflight guards have valid paired dollar quotes', () => {
  const blocks = checkedDoBlocks(sql);
  assert.equal(blocks.length, 2);
  assert.match(blocks[0][2], /pf_catalog_items/);
  assert.match(blocks[1][2], /pf_campaign_drafts/);
});

test('regression: malformed second DO delimiter is rejected', () => {
  const damaged = sql.replace(
    /DO \$\$(?=\s*\nBEGIN\s*\n\s*IF to_regclass\('public\.pf_campaign_drafts'\))/,
    'DO $'
  );
  assert.notEqual(damaged, sql, 'mutation must target the second preflight guard');
  assert.throws(() => checkedDoBlocks(damaged), /paired dollar-quote delimiters/);
});
