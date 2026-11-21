/**
 * Bramy języka widocznej treści (ADR 0014).
 *
 * Baza opowiada historię, nie proces jej powstawania. Testy w tym pliku tną
 * tekst tak, jak widzi go czytelnik — zdejmują znaczniki, kod silnika i dosłowne
 * cytaty scen — i sprawdzają, czy nie została w nim mowa o bazie, dostawie,
 * właścicielu, interfejsie albo pracy redakcyjnej.
 *
 * Dosłowne słowa sceny są wyłączone ze sprawdzenia świadomie: bohater może mówić
 * o „dostawie ładunku” albo „stronie świata”, a archiwum jest nietykalne.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { zbudujDane } from '../tools/build.mjs';
import { wczytajStrony, wczytajCoNowego } from '../tools/content-loader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Słowa, których nie ma w głosie opowieści. Świadomie wąskie: chodzi o terminy,
 * które zdradzają, że tekst mówi o projekcie, a nie o świecie.
 */
const META = new RegExp([
  // baza i proces
  // „właściciel” tu nie należy: to zwykłe słowo o świecie (właściciel miecza, gospodarstwa).
  // Meta jest dopiero „właściciel bazy/kroniki/projektu” — to łapie WŁASCICIEL_PROJEKTU niżej.
  '\\bbaz[aeyi]\\b', '\\bbazie\\b', '\\bdostaw[a-ząćęłńóśźż]*\\b',
  // Miejscownik „materiale” pisze się bez „ł” — wzorzec na „materiał” go nie łapał.
  '\\barchiwum\\b', '\\bmateria[łl][a-ząćęłńóśźż]*\\b', '\\bmodel[a-ząćęłńóśźż]*\\b', '\\bagent[a-ząćęłńóśźż]*\\b',
  '\\bprompt\\b', '\\bADR\\b', '\\bcommit\\b', '\\brepozytori[um]\\b', '\\bbuild\\b', '\\brender[a-ząćęłńóśźż]*\\b',
  // redakcja
  '\\bwpis[a-ząćęłńóśźż]*\\b', '\\bwpisy\\b', '\\bsekcj[a-ząćęłńóśźż]*\\b', '\\bodsyłacz[a-ząćęłńóśźż]*\\b',
  '\\bkotwic[a-ząćęłńóśźż]*\\b', '\\btag(?:i|ów|iem|u|ach|ami)?\\b', '\\bpodstron[a-ząćęłńóśźż]*\\b',
  '\\binterfejs[a-ząćęłńóśźż]*\\b', '\\bkafelk[a-ząćęłńóśźż]*\\b', '\\bfiltr[a-ząćęłńóśźż]*\\b',
  // gra jako program, nie świat
  '\\bw grze\\b', '\\bw tej grze\\b', '\\bmechanik[a-ząćęłńóśźż]*\\b', '\\bprofil[a-ząćęłńóśźż]*\\b',
  '\\brekord[a-ząćęłńóśźż]*\\b', '\\bnumera?cj[a-ząćęłńóśźż]*\\b', '\\bnumer sceny\\b',
].join('|'), 'giu');

/**
 * „Właściciel” sam w sobie mówi o świecie — o człowieku, do którego coś należy.
 * Meta zaczyna się dopiero wtedy, gdy właściciel jest właścicielem kroniki, a nie rzeczy.
 */
/**
 * Zdania, które pokazują czytelnikowi tekst, którego ten nie widzi: „jej opis w zapasie”,
 * „według opisu przedmiotu”, „w tym opisie”. Opowieść mówi o świecie — jeśli coś jest
 * w „zapisie” albo „materiale”, to albo cytat, albo zdanie o pracy nad kroniką.
 * „Opis” jako tytuł boksu jest wyjątkiem: to etykieta wymuszona funkcją (ADR 0014).
 */
const UKRYTE_ZRODLO = new RegExp([
  '\\bw (?:tym |samym )?opisie\\b', '\\bwedług (?:tego )?opisu\\b', '\\bz opisu\\b',
  '\\bjej opis\\b', '\\bjego opis\\b', '\\bten opis\\b', '\\bta? opis\\b',
  '\\bopis (?:przedmiotu|techniki|broni|strzały|łuku|włóczni|hełmu)\\b',
  '\\bw zapasie\\b', '\\bz zapasu\\b', '\\bw ekwipunku\\b', '\\bw inwentarzu\\b',
  '\\bkompendium\\b',
].join('|'), 'giu');

const WLASCICIEL_PROJEKTU = new RegExp(
  '\\bwłaściciel[a-ząćęłńóśźż]*\\s+(?:tej\\s+)?(?:baz|kronik|repozytori|projekt|stron|witryn)',
  'giu');

/** Zdejmuje kod silnika i znaczniki — zostaje to, co czyta człowiek. */
function tekstWidoczny(html) {
  return String(html)
    // „wiedza modelu” to nazwa pochodzenia nadana przez właściciela — mówi o źródle
    // twierdzenia, nie o narzędziu, którym kronika powstała. Poza tą frazą słowo
    // „model” w widocznym tekście jest naruszeniem.
    .replace(/wiedza modelu/gi, ' ').replace(/modelu wiedzy/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<div class="zapis-tekst">[\s\S]*?<\/div>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ');
}

let dane;
test.before(async () => { dane = await zbudujDane({ root: ROOT }); });

test('widoczne strony nie mówią o bazie, procesie ani interfejsie', () => {
  const problemy = [];
  for (const [slug, strona] of Object.entries(dane.strony)) {
    // Tytuł boksu jest widoczny tak samo jak jego treść — „Strzała bez właściciela”
    // przeszła kiedyś obok bramy, bo sprawdzała tylko html, nie nagłówki.
    const naglowki = [...(strona.boksy ?? []), ...(strona.sekcje ?? [])]
      .map((b) => b.tytul ?? '').join(' ');
    const html = [strona.html ?? '', naglowki, ...(strona.boksy ?? []).map((b) => b.html),
      ...(strona.sekcje ?? []).map((s) => s.html)].join(' ');
    const tekst = tekstWidoczny(html);
    const trafienia = [...new Set([...tekst.matchAll(META), ...tekst.matchAll(WLASCICIEL_PROJEKTU),
      ...tekst.matchAll(UKRYTE_ZRODLO)].map((m) => m[0]))];
    if (trafienia.length > 0) problemy.push(`${slug}: ${trafienia.join(', ')}`);
  }
  assert.deepEqual(problemy, []);
});

test('właściciel rzeczy jest ze świata, właściciel kroniki już nie', () => {
  // Lista zakazanych słów ma ciąć meta, nie zwykłe słownictwo. „Właściciel miecza”
  // to zdanie o świecie; dopiero „właściciel kroniki” mówi o projekcie.
  const zeSwiata = ['właściciel miecza', 'właściciel gospodarstwa', 'właściciel domu',
    'właściciela konia', 'właściciel tej chaty'];
  for (const zdanie of zeSwiata) {
    assert.deepEqual([...zdanie.matchAll(META)].map((m) => m[0]), [], `„${zdanie}” jest ze świata`);
    assert.deepEqual([...zdanie.matchAll(WLASCICIEL_PROJEKTU)].map((m) => m[0]), [],
      `„${zdanie}” nie mówi o projekcie`);
  }
  const oProjekcie = ['właściciel bazy', 'właściciela kroniki', 'właściciel projektu',
    'właściciel tej strony'];
  for (const zdanie of oProjekcie) {
    assert.ok([...zdanie.matchAll(WLASCICIEL_PROJEKTU)].length > 0, `„${zdanie}” to meta`);
  }
});

test('proza nie pokazuje tekstu, którego czytelnik nie widzi', () => {
  // „Jej opis w zapasie jest niemalże wierszem” — czytelnik nie ma ani zapasu,
  // ani opisu: ma rzecz i zdanie o niej. Tytuł boksu „Opis” zostaje dozwolony.
  const zakazane = ['jej opis jest krótki', 'według opisu przedmiotu', 'w tym opisie',
    'z opisu wynika', 'hełm z zapasu', 'leży w zapasie bohatera', 'w Kompendium stoi'];
  for (const zdanie of zakazane) {
    assert.ok([...zdanie.matchAll(UKRYTE_ZRODLO)].length > 0, `„${zdanie}” powinno być zatrzymane`);
  }
  const dozwolone = ['## Opis', 'Opis jest krótki jak zdanie o broni', 'opisuje broń, nie ruch'];
  for (const zdanie of dozwolone) {
    assert.deepEqual([...zdanie.matchAll(UKRYTE_ZRODLO)].map((m) => m[0]), [], `„${zdanie}” ma przejść`);
  }
});

test('streszczenia i opisy na listach są językiem opowieści', () => {
  const problemy = [];
  for (const [slug, strona] of Object.entries(dane.strony)) {
    const tekst = String(strona.streszczenie ?? '');
    const trafienia = [...new Set([...tekst.matchAll(META)].map((m) => m[0]))];
    if (trafienia.length > 0) problemy.push(`${slug}: ${trafienia.join(', ')}`);
  }
  assert.deepEqual(problemy, []);
});

test('dziennik zmian mówi o opowieści, nie o pracy nad nią', () => {
  const wpisy = wczytajCoNowego({ root: ROOT });
  assert.ok(wpisy.length > 0, 'dziennik ma wpisy');
  const problemy = [];
  for (const w of wpisy) {
    for (const linia of String(w.tekst ?? '').split('\n')) {
      const trafienia = [...new Set([...linia.matchAll(META)].map((m) => m[0]))];
      if (trafienia.length > 0) problemy.push(`${w.data}: ${trafienia.join(', ')} — „${linia.trim().slice(0, 60)}”`);
    }
  }
  assert.deepEqual(problemy, []);
});

test('każdy wpis dziennika ma nagłówek z datą i niepustą treść', () => {
  for (const w of wczytajCoNowego({ root: ROOT })) {
    assert.match(w.data, /^\d{4}-\d{2}-\d{2}$/, `data wpisu ${w.data}`);
    assert.ok(String(w.tekst ?? '').trim().length > 0, `wpis ${w.data} jest pusty`);
  }
});

test('opisy encji mówią o świecie, nie o grze jako programie', () => {
  const strony = wczytajStrony({ root: ROOT }).filter((s) => ['postac', 'sekta', 'kraina', 'miejsce', 'pojecie', 'kontekst', 'watek'].includes(s.typ));
  const ZAKAZANE = /\bw grze\b|\bw tej grze\b|\bprofil[a-ząćęłńóśźż]*\b|\brekord[a-ząćęłńóśźż]*\b|\bmechanik[a-ząćęłńóśźż]*\b/giu;
  for (const s of strony) {
    const m = String(s.body).match(/##\s+Opis[ \t]*\n+([\s\S]*?)(?:\n##\s|\n\}\}|$)/);
    if (!m) continue;
    const trafienia = [...new Set([...m[1].matchAll(ZAKAZANE)].map((x) => x[0]))];
    assert.deepEqual(trafienia, [], `${s.slug}: opis zbliża się do języka programu`);
  }
});

test('wikilink bez etykiety pokazuje tytuł strony, nie slug', () => {
  const problemy = [];
  for (const [slug, strona] of Object.entries(dane.strony)) {
    const html = [strona.html ?? '', ...(strona.boksy ?? []).map((b) => b.html),
      ...(strona.sekcje ?? []).map((s) => s.html)].join(' ');
    // Slug w widocznym tekście odsyłacza to adres, nie nazwa — czytelnik ma zobaczyć
    // „Pochodzenie wędrowca”, a nie „watek-pochodzenia”.
    for (const m of html.matchAll(/<a [^>]*>([a-z0-9]+(?:-[a-z0-9]+)+)<\/a>/g)) {
      if (dane.strony[m[1]]) problemy.push(`${slug}: odsyłacz pokazuje slug „${m[1]}”`);
      else if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(m[1])) problemy.push(`${slug}: odsyłacz pokazuje slug „${m[1]}”`);
    }
  }
  assert.deepEqual(problemy, []);
});

test('tytuł boksu jest jeden — plakietka nie powtarza rodzaju treści', () => {
  const problemy = [];
  for (const [slug, strona] of Object.entries(dane.strony)) {
    const html = [...(strona.boksy ?? []).map((b) => b.html), ...(strona.sekcje ?? []).map((s) => s.html)].join(' ');
    // Plakietka przy nagłówku niesie pochodzenie; osobny „poziom-etykieta”
    // powtarzałby nazwę sekcji („Wątki w scenie” + „spis powiązań”).
    if (/poziom-etykieta/.test(html)) problemy.push(`${slug}: druga etykieta przy tytule`);
  }
  assert.deepEqual(problemy, []);
});

test('menu nie prowadzi do działów, których nie ma', () => {
  const trasy = new Set(['chronologia', 'rozdzialy', 'watki', 'postacie', 'krainy', 'sekty', 'konteksty']);
  const strony = wczytajStrony({ root: ROOT });
  const typy = new Set(strony.map((s) => s.typ));
  assert.ok(typy.has('rozdzial'), 'opowieść ma rozdział');
  assert.ok(trasy.has('chronologia'));
});
