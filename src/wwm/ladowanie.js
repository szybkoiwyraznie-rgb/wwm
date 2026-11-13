/**
 * Ładowanie danych (ADR 0017).
 *
 * Artefakt to **powłoka**: styl, sklejone moduły i spakowany gzip+base64 **indeks**
 * (metadane stron, graf odsyłaczy, słowniki, statystyki). Ciała stron leżą osobno
 * w `dist/data/<slug>.json` i są dociągane dopiero przy wejściu w stronę.
 * Wyszukiwarka dociąga `dist/data/teksty.json` przy pierwszym zapytaniu, dziennik —
 * na starcie, bo strona główna pokazuje ostatnie wpisy.
 *
 * Powłoka małyje razem z liczbą stron tylko przez indeks; treść rośnie w plikach.
 * Renderery zostają synchroniczne: ciało strony pojawia się w `WWM_DATA.strony[slug]`
 * po `Object.assign`, w tym samym kształcie co wcześniej.
 *
 * Tryb jednoplikowy (`globalThis.WWM_DATA` wstrzyknięte w całości) zostaje dla testów
 * i dla `--single`: wtedy `czyTrybDanych()` jest fałszem i nic nie jest dociągane.
 */

const KATALOG_DANYCH = 'data/';
const PLIK_TEKSTOW = 'teksty.json';
const PLIK_DZIENNIKA = 'co-nowego.json';

const wczytaneStrony = new Set();
let tekstyWczytane = false;
let dziennikWczytany = false;

/** Czy dane są rozbite na pliki (`WWM_TRYB = 'pliki'`). */
export function czyTrybPlikow() {
  return globalThis.WWM_TRYB === 'pliki';
}

/** Czy ciało strony jest już w pamięci — żeby nie migać „wczytywanie” bez potrzeby. */
export function czyStronaWczytana(slug) {
  return !czyTrybPlikow() || wczytaneStrony.has(slug);
}

/** base64 → bajty → gunzip → tekst. Node pakuje (`node:zlib`), przeglądarka rozpakowuje. */
async function rozpakuj(b64) {
  const binarny = globalThis.atob(b64);
  const bajty = new Uint8Array(binarny.length);
  for (let i = 0; i < binarny.length; i += 1) bajty[i] = binarny.charCodeAt(i);
  const Dekompresja = globalThis.DecompressionStream;
  if (typeof Dekompresja !== 'function') {
    throw new Error('ta przeglądarka nie umie rozpakować danych (brak DecompressionStream) — potrzebna nowsza wersja');
  }
  const strumien = new globalThis.Blob([bajty]).stream().pipeThrough(new Dekompresja('gzip'));
  return new globalThis.Response(strumien).text();
}

/** Adres pliku danych względem dokumentu — routing po hashu nie zmienia bazy. */
function adresDanych(nazwa) {
  const baza = globalThis.location?.href ?? globalThis.document?.baseURI ?? '';
  try {
    return new URL(KATALOG_DANYCH + nazwa, baza).href;
  } catch {
    return KATALOG_DANYCH + nazwa;
  }
}

async function pobierzJson(nazwa) {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error(`brak fetch — plik ${nazwa} wymaga serwera HTTP`);
  }
  const odpowiedz = await globalThis.fetch(adresDanych(nazwa));
  if (!odpowiedz.ok) throw new Error(`nie udało się pobrać ${nazwa} (HTTP ${odpowiedz.status})`);
  return odpowiedz.json();
}

/**
 * Start: indeks z powłoki (spakowany) plus dziennik. Gdy dane są wstrzyknięte
 * w całości — nic nie dociągamy, to tryb jednoplikowy.
 */
export async function zaladujDane() {
  if (globalThis.WWM_DATA?.strony) {
    tekstyWczytane = true;
    dziennikWczytany = true;
    for (const slug of Object.keys(globalThis.WWM_DATA.strony)) wczytaneStrony.add(slug);
    return globalThis.WWM_DATA;
  }
  const paczka = globalThis.WWM_B64;
  if (!paczka) throw new Error('powłoka bez danych');
  const dane = JSON.parse(await rozpakuj(paczka));
  globalThis.WWM_DATA = dane;
  await dociagnijCoNowego();
  return dane;
}

/** Ciało jednej strony z `data/<slug>.json`; brak trybu plików = nic do roboty. */
export async function dociagnijStrone(slug) {
  const dane = globalThis.WWM_DATA;
  const strona = dane?.strony?.[slug] ?? null;
  if (!strona || !czyTrybPlikow() || wczytaneStrony.has(slug)) return strona;
  const cialo = await pobierzJson(`${slug}.json`);
  Object.assign(strona, cialo);
  wczytaneStrony.add(slug);
  return strona;
}

/** Indeks pełnotekstowy — dociągany raz, przy pierwszym wyszukiwaniu. */
export async function dociagnijTeksty() {
  const dane = globalThis.WWM_DATA;
  if (!dane?.strony || !czyTrybPlikow() || tekstyWczytane) return dane?.strony ?? {};
  const teksty = await pobierzJson(PLIK_TEKSTOW);
  for (const [slug, tekst] of Object.entries(teksty ?? {})) {
    if (dane.strony[slug]) dane.strony[slug].tekst = tekst;
  }
  tekstyWczytane = true;
  return dane.strony;
}

/** Wpisy dziennika; awaria nie zatrzymuje kroniki. */
export async function dociagnijCoNowego() {
  const dane = globalThis.WWM_DATA;
  if (!dane || !czyTrybPlikow() || dziennikWczytany) return dane?.coNowego ?? [];
  try {
    dane.coNowego = await pobierzJson(PLIK_DZIENNIKA);
  } catch (blad) {
    dane.coNowego = dane.coNowego ?? [];
    globalThis.console?.warn?.(`dziennik niedostępny: ${blad.message}`);
  }
  dziennikWczytany = true;
  return dane.coNowego;
}

/** Czy teksty są w pamięci — dla widoku wyszukiwania. */
export function czyTekstyWczytane() {
  return !czyTrybPlikow() || tekstyWczytane;
}

/** Czy dziennik jest w pamięci. */
export function czyDziennikWczytany() {
  return !czyTrybPlikow() || dziennikWczytany;
}
