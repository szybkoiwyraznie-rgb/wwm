/**
 * Model wieloplikowy (ADR 0017): powłoka + `dist/data/`.
 *
 * Test uruchamia prawdziwy kod ładowania z powłoki zbudowanej przez build,
 * podstawia `fetch` czytający z `dist/data/` i sprawdza, że po dociągnięciu
 * strony renderer dostaje pełne dane. Bez tego „działa na mojej maszynie”
 * kończy się pustą sceną u czytelnika.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { zbuduj, podzielDane, zbudujDane } from '../tools/build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POWLOKA = path.join(ROOT, 'dist/index.html');
const DANE = path.join(ROOT, 'dist/data');

let przygotowane = false;
async function przygotuj() {
  if (przygotowane) return;
  await zbuduj({ root: ROOT });
  przygotowane = true;
}

/** Wyciąga z powłoki indeks i ustawia środowisko ładowania. */
function wczytajPowłokę() {
  const html = fs.readFileSync(POWLOKA, 'utf8');
  const b64 = html.match(/globalThis\.WWM_B64 = "([^"]+)"/)?.[1];
  assert.ok(b64, 'powłoka zawiera spakowany indeks');
  globalThis.atob ??= (s) => Buffer.from(s, 'base64').toString('binary');
  globalThis.WWM_B64 = b64;
  globalThis.WWM_TRYB = 'pliki';
  delete globalThis.WWM_DATA;
  return html;
}

/** `fetch` czytający z katalogu `dist/data/`, jak serwer statyczny. */
function podstawFetch() {
  globalThis.fetch = async (adres) => {
    const nazwa = String(adres).split('/data/').at(-1).replace(/^data\//, '');
    const plik = path.join(DANE, nazwa);
    if (!fs.existsSync(plik)) return new Response('brak', { status: 404 });
    return new Response(fs.readFileSync(plik, 'utf8'), { status: 200 });
  };
}

test('powłoka startuje z indeksu i nie niesie ciał stron', async () => {
  await przygotuj();
  wczytajPowłokę();
  podstawFetch();
  const ladowanie = await import('../src/wwm/ladowanie.js');
  const dane = await ladowanie.zaladujDane();

  assert.ok(Object.keys(dane.strony).length > 0, 'indeks ma strony');
  const scena = dane.strony['zaslepka-sc01'];
  assert.ok(scena, 'scena jest w indeksie');
  assert.equal(scena.sekcje, undefined, 'ciało sceny nie jedzie w powłoce');
  assert.ok(scena.tytul, 'metadane są dostępne bez dociągania');
  assert.ok(Array.isArray(dane.coNowego) && dane.coNowego.length > 0, 'dziennik dociągnięty na starcie');
});

test('dociągnięta scena renderuje pełną treść', async () => {
  await przygotuj();
  wczytajPowłokę();
  podstawFetch();
  const ladowanie = await import('../src/wwm/ladowanie.js');
  await ladowanie.zaladujDane();
  const przed = globalThis.WWM_DATA.strony['zaslepka-sc01'];
  assert.equal(przed.sekcje, undefined);

  await ladowanie.dociagnijStrone('zaslepka-sc01');
  const po = globalThis.WWM_DATA.strony['zaslepka-sc01'];
  assert.ok(Array.isArray(po.sekcje) && po.sekcje.length > 0, 'sekcje po dociągnięciu');

  const { renderScena } = await import('../src/wwm/render-scena.js');
  const html = renderScena('zaslepka-sc01');
  assert.match(html, /Treść sceny/);
  assert.match(html, /z opowieści/);
  assert.doesNotMatch(html, /undefined/);
});

test('lista i chronologia działają bez dociągania ciał', async () => {
  await przygotuj();
  wczytajPowłokę();
  podstawFetch();
  const ladowanie = await import('../src/wwm/ladowanie.js');
  await ladowanie.zaladujDane();

  const { renderChronologia } = await import('../src/wwm/chronologia.js');
  const { renderListe } = await import('../src/wwm/render-listy.js');
  assert.match(renderChronologia(), /Chronologia|Rozdział/);
  assert.match(renderListe('scena', {}), /scena|sceny/i);
});

test('wyszukiwanie dociąga indeks pełnotekstowy dopiero na żądanie', async () => {
  await przygotuj();
  wczytajPowłokę();
  podstawFetch();
  const ladowanie = await import('../src/wwm/ladowanie.js');
  const dane = await ladowanie.zaladujDane();
  const slug = Object.keys(dane.strony)[0];
  assert.equal(dane.strony[slug].tekst, undefined, 'tekst nie jedzie w indeksie');

  await ladowanie.dociagnijTeksty();
  assert.ok(dane.strony[slug].tekst, 'tekst po dociągnięciu');
});

test('podział danych nie gubi pól i nie duplikuje ciała', async () => {
  const dane = await zbudujDane({ root: ROOT });
  const { indeks, ciala, teksty } = podzielDane(dane);
  for (const [slug, strona] of Object.entries(dane.strony)) {
    for (const pole of ['html', 'boksy', 'sekcje']) {
      if (strona[pole] === undefined) continue;
      assert.ok(!(pole in indeks.strony[slug]), `indeks nie ma ${pole} dla ${slug}`);
      assert.deepEqual(ciala[slug][pole], strona[pole], `ciało ${pole} dla ${slug} bez zmian`);
    }
    if (strona.tekst !== undefined) assert.equal(teksty[slug], strona.tekst);
  }
});

test('tryb jednoplikowy nadal działa (archiwum offline)', async () => {
  await zbuduj({ root: ROOT, single: true, out: path.join(ROOT, 'dist/jeden-plik.html') });
  const html = fs.readFileSync(path.join(ROOT, 'dist/jeden-plik.html'), 'utf8');
  assert.match(html, /globalThis\.WWM_DATA = \{/, 'całość w jednym pliku');
  // Sprawdzamy dane, nie źródła modułów: tekst `WWM_TRYB = 'pliki'` stoi w komentarzu ładowania.
  assert.doesNotMatch(html, /globalThis\.WWM_TRYB = 'pliki'/);
  assert.doesNotMatch(html, /globalThis\.WWM_B64 =/);
  fs.rmSync(path.join(ROOT, 'dist/jeden-plik.html'), { force: true });
  // Przywróć powłokę, żeby podgląd i kolejne testy widziały tryb plikowy.
  await zbuduj({ root: ROOT });
});
