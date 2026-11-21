/**
 * Każda trasa z menu MUSI mieć swoje `case` w `renderuj()`, a każda trasa listy
 * musi zwrócić treść. Bez tego strona po prostu pokazuje „Nie znaleziono” —
 * a wygląda to jak pusta sekcja, nie jak błąd.
 *
 * Ten test powstał po tym, jak `krainy` i `sekty` wypadły z routera i przez
 * kilka rund udawały puste działy. Nie sprawdzał tego żaden test, bo wszystkie
 * patrzyły na dane i widoki encji, a nie na to, czy trasa w ogóle dochodzi.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { zbudujDane } from '../tools/build.mjs';
import { TRASY_ZNAWE } from '../src/wwm/router.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Trasy list i encji: dla każdej musi istnieć dział w routerze. */
const LISTY = {
  epizody: 'epizod', sceny: 'scena', watki: 'watek',
  postacie: 'postac', sekty: 'sekta', krainy: 'kraina', miejsca: 'miejsce',
  konteksty: 'kontekst', pojecia: 'pojecie',
};

test('rozdziały mają własny widok, nie listę encji', async () => {
  const dane = await zbudujDane({ root: ROOT });
  globalThis.WWM_DATA = dane;
  const { renderRozdzialy } = await import('../src/wwm/render-epizod.js');
  const html = renderRozdzialy();
  assert.ok(html.length > 200, 'lista rozdziałów ma treść');
  for (const r of Object.values(dane.strony).filter((s) => s.typ === 'rozdzial')) {
    assert.ok(html.includes(r.tytul), `brak rozdziału „${r.tytul}”`);
  }
});

test('menu prowadzi wyłącznie do tras, które router obsługuje', () => {
  const zrodlo = fs.readFileSync(path.join(ROOT, 'src/wwm/render.js'), 'utf8');
  const menu = [...zrodlo.matchAll(/\{ trasa: '([a-z-]+)', etykieta:/g)].map((m) => m[1]);
  assert.ok(menu.length > 0, 'menu ma pozycje');
  const brak = menu.filter((t) => !TRASY_ZNAWE.includes(t));
  assert.deepEqual(brak, [], 'menu wskazuje trasy spoza słownika routera');
});

test('każda trasa listy ma obsługę w renderuj()', () => {
  const zrodlo = fs.readFileSync(path.join(ROOT, 'src/wwm/main.js'), 'utf8');
  // Wyciągamy etykiety `case '…':` ze switcha w renderuj().
  const obslugiwane = new Set([...zrodlo.matchAll(/case '([a-z-]+)':/g)].map((m) => m[1]));
  const brak = [...Object.keys(LISTY), 'rozdzialy'].filter((t) => !obslugiwane.has(t));
  assert.deepEqual(brak, [], 'trasy list bez case — pokażą „Nie znaleziono”');
});

test('każda trasa listy zwraca treść, a nie pustkę', async () => {
  const dane = await zbudujDane({ root: ROOT });
  globalThis.WWM_DATA = dane;
  const { renderListe } = await import('../src/wwm/render-listy.js');
  const problemy = [];
  for (const [trasa, typ] of Object.entries(LISTY)) {
    const html = renderListe(typ, {});
    if (!html || html.length < 80) {
      problemy.push(`${trasa}: pusta lista`);
      continue;
    }
    // Sekcja bez ani jednej pozycji to nie błąd danych, ale musi się tak nazywać.
    const pusto = /stan-pusty|pusto/.test(html);
    const maPozycje = /<li|<article|<a class="karta/.test(html);
    if (pusto && !maPozycje) problemy.push(`${trasa}: lista twierdzi, że nic nie ma, choć dane mają ${typ}`);
  }
  assert.deepEqual(problemy, []);
});

test('lista pokazuje wszystkie pozycje danego typu', async () => {
  const dane = await zbudujDane({ root: ROOT });
  globalThis.WWM_DATA = dane;
  const { renderListe } = await import('../src/wwm/render-listy.js');
  const problemy = [];
  for (const [trasa, typ] of Object.entries(LISTY)) {
    const strony = Object.values(dane.strony).filter((s) => s.typ === typ);
    if (strony.length === 0) continue;
    const html = renderListe(typ, {});
    for (const s of strony) {
      if (!html.includes(s.tytul)) problemy.push(`${trasa}: brak „${s.tytul}” na liście`);
    }
  }
  assert.deepEqual(problemy, []);
});

test('lista haseł pozwala zawęzić się do rodzaju i pokazuje każdy rodzaj', async () => {
  const dane = await zbudujDane({ root: ROOT });
  globalThis.WWM_DATA = dane;
  const { renderListe } = await import('../src/wwm/render-listy.js');
  const rodzaje = [...new Set(Object.values(dane.strony)
    .filter((s) => s.typ === 'pojecie' && s.rodzaj).map((s) => s.rodzaj))];
  assert.ok(rodzaje.length >= 2, 'hasła mają więcej niż jeden rodzaj — inaczej nie ma czego zawężać');
  const pelna = renderListe('pojecie', {});
  for (const rodzaj of rodzaje) {
    // Rodzaj musi być do wyboru: inaczej część haseł jest nieosiągalna z listy.
    assert.match(pelna, new RegExp(`<option value="${rodzaj}"`), `w filtrze brakuje rodzaju „${rodzaj}”`);
    const wezsza = renderListe('pojecie', { rodzaj });
    const tytuly = Object.values(dane.strony)
      .filter((s) => s.typ === 'pojecie' && s.rodzaj === rodzaj).map((s) => s.tytul);
    for (const tytul of tytuly) assert.ok(wezsza.includes(tytul), `po zawężeniu brak „${tytul}”`);
    for (const inny of Object.values(dane.strony)
      .filter((s) => s.typ === 'pojecie' && s.rodzaj && s.rodzaj !== rodzaj)) {
      assert.ok(!wezsza.includes(inny.tytul), `po zawężeniu do „${rodzaj}” został „${inny.tytul}”`);
    }
  }
});
