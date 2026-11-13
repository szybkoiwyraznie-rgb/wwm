/**
 * Bramy dokumentacji i spójności repo.
 *
 * Dokumentacja jest częścią projektu, nie komentarzem obok: jeśli README
 * obiecuje plik, który nie istnieje, następna sesja traci czas na szukanie.
 * Tu pilnujemy struktury, słownika i tego, żeby zasady nie rozjechały się
 * z kodem, który je egzekwuje.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TYPY_STRON, POLA_DOZWOLONE, POLA_RELACJI, RODZAJE_EPIZODU } from '../src/wwm/registry.js';
import { POZIOMY_BLOKU } from '../src/wwm/markdown.js';
import { KATALOGI } from '../tools/content-loader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const czytaj = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const PLIKI_STARTOWE = [
  'README.md',
  'AGENTS.md',
  'ENVIRONMENT.md',
  'content/README.md',
  'rozgrywka/README.md',
  'docs/decisions/README.md',
  'docs/guides/SCHEMAT_DANYCH.md',
  'docs/guides/PRZEPLYW_SCENY.md',
  'docs/guides/ENVIRONMENT.md',
  'docs/LESSONS.md',
];

test('wszystkie pliki startowe istnieją', () => {
  for (const rel of PLIKI_STARTOWE) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `brak ${rel}`);
  }
});

test('README wymienia jedyny plik startowy sesji agenta', () => {
  const readme = czytaj('README.md');
  assert.match(readme, /AGENTS\.md/);
  assert.match(readme, /npm test/);
  assert.match(readme, /npm run build/);
});

test('AGENTS.md opisuje wszystkie katalogi treści', () => {
  const agents = czytaj('AGENTS.md');
  for (const { katalog } of KATALOGI) {
    assert.ok(agents.includes(katalog.replace('content/', 'content/')), `AGENTS.md nie wspomina ${katalog}`);
  }
});

test('każdy typ strony ma katalog, trasę i tabelę w schemacie', () => {
  const schemat = czytaj('docs/guides/SCHEMAT_DANYCH.md');
  const katalogi = new Map(KATALOGI.map((k) => [k.typ, k.katalog]));
  for (const typ of TYPY_STRON) {
    assert.ok(katalogi.has(typ), `typ ${typ} bez katalogu`);
    assert.ok(schemat.includes(`\`${typ}\``), `schemat nie opisuje typu ${typ}`);
  }
  assert.equal(katalogi.size, TYPY_STRON.length, 'każdy katalog obsługuje inny typ');
});

test('schemat danych wymienia wszystkie poziomy wiarygodności', () => {
  const schemat = czytaj('docs/guides/SCHEMAT_DANYCH.md');
  for (const poziom of POZIOMY_BLOKU) {
    assert.ok(schemat.includes(`{{${poziom}`), `schemat nie opisuje poziomu {{${poziom}}}`);
  }
});

test('schemat danych wymienia wszystkie pola-relacje', () => {
  const schemat = czytaj('docs/guides/SCHEMAT_DANYCH.md');
  for (const pole of Object.keys(POLA_RELACJI)) {
    assert.ok(schemat.includes(pole), `schemat nie opisuje pola ${pole}`);
  }
});

test('schemat wymienia rodzaje zadań zgodne z walidatorem', () => {
  const schemat = czytaj('docs/guides/SCHEMAT_DANYCH.md');
  for (const rodzaj of RODZAJE_EPIZODU) {
    assert.ok(schemat.includes(rodzaj), `schemat nie opisuje rodzaju ${rodzaj}`);
  }
});

test('pola dozwolone w rejestrze pokrywają się z tabelą schematu', () => {
  const schemat = czytaj('docs/guides/SCHEMAT_DANYCH.md');
  const brakujace = [];
  for (const [typ, pola] of Object.entries(POLA_DOZWOLONE)) {
    for (const pole of pola) {
      if (['typ', 'slug'].includes(pole)) continue;
      if (!schemat.includes(pole)) brakujace.push(`${typ}.${pole}`);
    }
  }
  assert.deepEqual(brakujace, []);
});

test('każdy ADR ma nagłówek ze statusem i numerem w nazwie pliku', () => {
  const katalog = path.join(ROOT, 'docs/decisions');
  const pliki = fs.readdirSync(katalog).filter((f) => f.endsWith('.md') && f !== 'README.md');
  assert.ok(pliki.length >= 5, 'rejestr decyzji nie jest pusty');
  for (const plik of pliki) {
    const tresc = fs.readFileSync(path.join(katalog, plik), 'utf8');
    assert.match(plik, /^\d{4}-[a-z0-9-]+\.md$/, `${plik}: nazwa bez numeru`);
    assert.match(tresc, /^# \d{4} — /m, `${plik}: brak nagłówka "# NNNN — tytuł"`);
    assert.match(tresc, /\*\*Status:\*\*/, `${plik}: brak statusu`);
  }
});

test('rejestr ADR linkuje każdy plik decyzji', () => {
  const rejestr = czytaj('docs/decisions/README.md');
  const pliki = fs.readdirSync(path.join(ROOT, 'docs/decisions'))
    .filter((f) => f.endsWith('.md') && f !== 'README.md');
  for (const plik of pliki) {
    assert.ok(rejestr.includes(plik), `rejestr nie linkuje ${plik}`);
  }
});

test('każdy odsyłacz do pliku w dokumentacji prowadzi do istniejącego pliku', () => {
  const dokumenty = [
    'README.md', 'AGENTS.md', 'ENVIRONMENT.md',
    'docs/guides/SCHEMAT_DANYCH.md', 'docs/guides/PRZEPLYW_SCENY.md',
    'docs/guides/ENVIRONMENT.md', 'docs/decisions/README.md', 'docs/LESSONS.md',
    'content/README.md', 'rozgrywka/README.md',
  ];
  const problemy = [];
  for (const rel of dokumenty) {
    const tresc = czytaj(rel);
    const katalogDokumentu = path.dirname(rel);
    for (const m of tresc.matchAll(/\]\(([^)#:]+\.md)\)/g)) {
      const cel = m[1];
      if (/^https?:/.test(cel)) continue;
      const rozwiazany = path.normalize(path.join(ROOT, katalogDokumentu, cel));
      if (!fs.existsSync(rozwiazany)) problemy.push(`${rel} → ${cel}`);
    }
  }
  assert.deepEqual(problemy, []);
});

test('dokumentacja nie obiecuje plików, których nie ma w drzewie repo', () => {
  const readme = czytaj('README.md');
  for (const m of readme.matchAll(/^\| `([^`]+)`/gm)) {
    const sciezka = m[1];
    if (sciezka.includes('<')) continue; // wzorce, nie konkretne pliki
    assert.ok(fs.existsSync(path.join(ROOT, sciezka.replace(/\/$/, ''))), `README obiecuje ${sciezka}`);
  }
});

test('LESSONS.md ma sekcje z wnioskami, nie pusty szkielet', () => {
  const lekcje = czytaj('docs/LESSONS.md');
  assert.match(lekcje, /^## /m);
  assert.ok(lekcje.length > 800, 'LESSONS.md jest szkieletem bez treści');
});

test('ENVIRONMENT.md podaje wersję Node zgodną z package.json', () => {
  const pkg = JSON.parse(czytaj('package.json'));
  const env = czytaj('docs/guides/ENVIRONMENT.md');
  assert.match(String(pkg.engines.node), />=(\d+)/);
  const wersja = pkg.engines.node.match(/>=(\d+)/)[1];
  assert.ok(env.includes(`≥ ${wersja}`) || env.includes(`>= ${wersja}`), `ENVIRONMENT.md nie podaje Node ≥ ${wersja}`);
});

test('pakiet nie ma żadnych zależności runtime ani dev', () => {
  const pkg = JSON.parse(czytaj('package.json'));
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
  assert.equal(pkg.type, 'module');
  assert.ok(pkg.engines.node);
});

test('workflow CI i Pages istnieją i pilnują testów oraz buildu', () => {
  const ci = czytaj('.github/workflows/ci.yml');
  const pages = czytaj('.github/workflows/pages.yml');
  for (const plik of [ci, pages]) {
    assert.match(plik, /npm test/);
    assert.match(plik, /npm run build/);
    assert.match(plik, /fetch-depth: 0/);
  }
  assert.match(pages, /deploy-pages/);
  assert.match(pages, /branches: \[main\]/);
});

test('materiał zaślepkowy jest oznaczony tagiem i policzalny', () => {
  const sciezka = path.join(ROOT, 'content');
  const zTagiem = [];
  const stos = (katalog) => {
    for (const e of fs.readdirSync(katalog, { withFileTypes: true })) {
      const pelna = path.join(katalog, e.name);
      if (e.isDirectory()) stos(pelna);
      else if (e.name.endsWith('.md') && e.name !== 'README.md') {
        if (fs.readFileSync(pelna, 'utf8').includes('zaslepka')) zTagiem.push(path.relative(ROOT, pelna));
      }
    }
  };
  stos(sciezka);
  // Zaślepka musi być rozpoznawalna, żeby dała się usunąć jedną komendą.
  for (const plik of zTagiem) {
    assert.match(fs.readFileSync(path.join(ROOT, plik), 'utf8'), /tagi:.*zaslepka/);
  }
});
