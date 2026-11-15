#!/usr/bin/env node
/**
 * Runner testów: uruchamia wszystkie pliki `test/*.test.js` przez wbudowany
 * runner node:test. Zero zależności — zgodnie z ADR 0002.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pliki = fs.readdirSync(path.join(root, 'test'))
  .filter((n) => n.endsWith('.test.js'))
  .sort();

if (pliki.length === 0) {
  console.error('Brak plików testowych w test/');
  process.exit(1);
}

const konkurencja = Math.max(2, Number(process.env.TEST_CONCURRENCY ?? 0) || 4);
console.error(`[run-tests] plików=${pliki.length} konkurencja=${konkurencja}`);
const wynik = spawnSync(
  process.execPath,
  ['--test', `--test-concurrency=${konkurencja}`, ...pliki.map((f) => path.join('test', f))],
  { cwd: root, stdio: 'inherit' },
);
process.exit(wynik.status ?? 1);
