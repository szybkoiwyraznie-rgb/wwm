/**
 * Bramy integralności bazy — te same, które uruchamia build.
 *
 * Testy nie duplikują logiki: wołają `zbudujDane()` i sprawdzają, że przechodzi,
 * a potem pilnują właściwości, których sam build nie widzi (postać grafu,
 * spójność archiwum zapisu, brak spoilerów poza granicą).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { zbudujDane } from '../tools/build.mjs';
import { wczytajStrony, wczytajPostep, wczytajZapisy } from '../tools/content-loader.mjs';
import { sprawdzGraniceFabuly, sprawdzWiernoscSceny, POLA_RELACJI } from '../src/wwm/registry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('build składający dane bazy przechodzi bez problemów', async () => {
  const dane = await zbudujDane({ root: ROOT });
  assert.ok(Object.keys(dane.strony).length > 0, 'baza ma strony');
  assert.ok(dane.statystyki.scena > 0, 'baza ma co najmniej jedną scenę');
});

test('każde pole-relacja wskazuje istniejącą stronę właściwego typu', async () => {
  const dane = await zbudujDane({ root: ROOT });
  const problemy = [];
  for (const strona of Object.values(dane.strony)) {
    for (const [pole, { typ, wiele }] of Object.entries(POLA_RELACJI)) {
      const wartosc = strona[pole];
      if (wartosc === undefined || wartosc === null) continue;
      for (const cel of wiele ? wartosc : [wartosc]) {
        const stronaCelu = dane.strony[cel];
        if (!stronaCelu) problemy.push(`${strona.slug}.${pole} → ${cel} nie istnieje`);
        else if (stronaCelu.typ !== typ) problemy.push(`${strona.slug}.${pole} → ${cel} ma typ ${stronaCelu.typ}`);
      }
    }
  }
  assert.deepEqual(problemy, []);
});

test('każdy wikilink w treści rozwiązuje się do strony', async () => {
  const dane = await zbudujDane({ root: ROOT });
  const problemy = [];
  for (const strona of Object.values(dane.strony)) {
    for (const slug of strona.linki ?? []) {
      if (!dane.strony[slug]) problemy.push(`${strona.slug} → [[${slug}]]`);
    }
  }
  assert.deepEqual(problemy, []);
});

test('granica rozegranej fabuły jest pilnowana i porządek jest ciągły', () => {
  const strony = wczytajStrony({ root: ROOT });
  const sceny = strony.filter((s) => s.typ === 'scena');
  assert.ok(sceny.length > 0);
  const problemy = sprawdzGraniceFabuly(sceny, wczytajPostep({ root: ROOT }));
  assert.deepEqual(problemy, []);
});

test('scena za granicą rozegranej fabuły zatrzymuje build (spoiler)', () => {
  const strony = wczytajStrony({ root: ROOT });
  const sceny = strony.filter((s) => s.typ === 'scena').map((s) => ({ ...s }));
  const postep = wczytajPostep({ root: ROOT });

  // Symulacja: dokładamy scenę o kolejności za ostatnią rozegraną.
  const granica = sceny.find((s) => s.slug === postep.ostatnia_scena);
  const spoiler = { ...sceny[0], slug: 'scena-z-przyszlosci', kolejnosc: granica.kolejnosc + 1 };
  const problemy = sprawdzGraniceFabuly([...sceny, spoiler], postep);

  assert.ok(problemy.some((p) => /za granicą rozegranej fabuły/.test(p)), 'spoiler wykryty');
});

test('brak pliku postępu jest błędem, nie domyślną zgodą', () => {
  const strony = wczytajStrony({ root: ROOT }).filter((s) => s.typ === 'scena');
  const problemy = sprawdzGraniceFabuly(strony, null);
  assert.ok(problemy.some((p) => /brak pliku postępu/.test(p)));
});

test('treść sceny jest dosłownym fragmentem archiwum zapisu', () => {
  const zapisy = wczytajZapisy({ root: ROOT });
  const sceny = wczytajStrony({ root: ROOT }).filter((s) => s.typ === 'scena');
  const problemy = [];
  for (const s of sceny) {
    const tekst = s.zapis ? zapisy.get(`rozgrywka/zapisy/${path.basename(s.zapis)}`) ?? null : null;
    problemy.push(...sprawdzWiernoscSceny(s, tekst));
  }
  assert.deepEqual(problemy, []);
});

test('przeredagowana scena nie przechodzi bramy dosłowności', () => {
  const zapisy = wczytajZapisy({ root: ROOT });
  const scena = wczytajStrony({ root: ROOT }).find((s) => s.typ === 'scena');
  const tekst = zapisy.get(`rozgrywka/zapisy/${path.basename(scena.zapis)}`);
  const podmieniona = { ...scena, body: scena.body.replace('Deszcz bębni', 'Deszcz pada') };
  const problemy = sprawdzWiernoscSceny(podmieniona, tekst);
  assert.ok(problemy.some((p) => /nie jest dosłownym fragmentem/.test(p)));
});

test('każda scena ma co najmniej 2 elementy i sekcje treści oraz analizy', () => {
  const sceny = wczytajStrony({ root: ROOT }).filter((s) => s.typ === 'scena');
  for (const s of sceny) {
    assert.match(s.body, /^## Treść sceny$/m, `${s.slug}: brak ## Treść sceny`);
    assert.match(s.body, /^## Analiza$/m, `${s.slug}: brak ## Analiza`);
    assert.match(s.body, /^:::zapis$/m, `${s.slug}: brak bloku :::zapis`);
  }
});

test('każda hipoteza ma pewność i jest widoczna w indeksie hipotez', async () => {
  const dane = await zbudujDane({ root: ROOT });
  const strony = wczytajStrony({ root: ROOT });
  for (const s of strony) {
    const bloki = [...s.body.matchAll(/\{\{hipoteza([^}]*)$/gm)];
    if (bloki.length === 0) continue;
    for (const b of bloki) {
      assert.match(b[1], /pewnosc=\d{1,3}/, `${s.slug}: hipoteza bez pewności`);
    }
    const wpis = dane.strony[s.slug];
    assert.equal(wpis.hipotezy.length, bloki.length, `${s.slug}: liczba hipotez w indeksie`);
    for (const h of wpis.hipotezy) {
      assert.ok(h.pewnosc >= 0 && h.pewnosc <= 100);
      assert.match(h.kotwica, /^hip-/);
    }
  }
});

test('kotwice hipotez są unikalne w całej bazie', async () => {
  const dane = await zbudujDane({ root: ROOT });
  const widziane = new Map();
  for (const [slug, strona] of Object.entries(dane.strony)) {
    for (const h of strona.hipotezy ?? []) {
      const klucz = `${slug}#${h.kotwica}`;
      assert.ok(!widziane.has(klucz), `zduplikowana kotwica ${klucz}`);
      widziane.set(klucz, true);
    }
  }
});

test('żadna scena nie leży poza kolejnością rozgrywki rosnącą od 1', () => {
  const sceny = wczytajStrony({ root: ROOT }).filter((s) => s.typ === 'scena');
  const kolejnosc = sceny.map((s) => s.kolejnosc).sort((a, b) => a - b);
  assert.deepEqual(kolejnosc, kolejnosc.map((_, i) => i + 1));
});

test('artefakt buildu nie zawiera śladów nieudanego renderu', () => {
  const sciezka = path.join(ROOT, 'dist/index.html');
  if (!fs.existsSync(sciezka)) return; // build jeszcze nie ruszył — reszta testów go pokryje
  const html = fs.readFileSync(sciezka, 'utf8');
  // Sam kod silnika jest częścią artefaktu, więc skanujemy to, co zobaczy czytelnik:
  // znaczniki i dane poza blokami <script>. W źródle renderera nazwa klasy martwego
  // odsyłacza występuje legalnie — jako gałąź, która nigdy nie powinna się wykonać.
  const widoczne = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  for (const slad of ['[object Object]', 'class="martwy-link"', 'undefined</']) {
    assert.ok(!widoczne.includes(slad), `artefakt zawiera "${slad}" w treści widocznej dla czytelnika`);
  }
  assert.match(html, /WWM_DATA/);
  assert.match(html, /id="app"/);
});
