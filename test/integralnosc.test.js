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
import zlib from 'node:zlib';
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
  assert.match(html, /id="app"/);
});

test('powłoka trzyma indeks, a ciała stron leżą w dist/data/', () => {
  const sciezka = path.join(ROOT, 'dist/index.html');
  const katalog = path.join(ROOT, 'dist/data');
  if (!fs.existsSync(sciezka) || !fs.existsSync(katalog)) return; // build jeszcze nie ruszył
  const html = fs.readFileSync(sciezka, 'utf8');
  assert.match(html, /WWM_B64/, 'powłoka ma spakowany indeks');
  assert.match(html, /WWM_TRYB = 'pliki'/);
  assert.ok(!html.includes('globalThis.WWM_DATA = {'), 'powłoka nie zawiera ciał stron w całości');

  // Indeks wystarcza listom: metadane są w powłoce, ciała — w plikach.
  const indeks = JSON.parse(zlib.gunzipSync(Buffer.from(html.match(/WWM_B64 = "([^"]+)"/)[1], 'base64')).toString('utf8'));
  const slugi = Object.keys(indeks.strony);
  assert.ok(slugi.length > 0);
  for (const slug of slugi) {
    assert.ok(!('html' in indeks.strony[slug]), `indeks nie niesie ciała strony ${slug}`);
    assert.ok(fs.existsSync(path.join(katalog, `${slug}.json`)), `brak pliku danych dla ${slug}`);
  }
  // Ciało wczytane z pliku ma dokładnie te pola, których oczekują renderery.
  const scena = JSON.parse(fs.readFileSync(path.join(katalog, 'zaslepka-sc01.json'), 'utf8'));
  assert.ok(scena.sekcje || scena.html, 'ciało sceny ma sekcje albo html');
  assert.ok(fs.existsSync(path.join(katalog, 'teksty.json')));
  assert.ok(fs.existsSync(path.join(katalog, 'co-nowego.json')));
});

test('każda strona renderuje się czysto i każdy odsyłacz wewnętrzny ma cel', async () => {
  // Bramy danych nie widzą widoku: chip interpretacji powstaje dopiero przy
  // renderze, więc „pusty” odsyłacz przechodził. Tu renderujemy każdy typ strony.
  const dane = await zbudujDane({ root: ROOT });
  globalThis.WWM_DATA = dane;
  const widoki = {
    scena: (await import('../src/wwm/render-scena.js')).renderScena,
    epizod: (await import('../src/wwm/render-epizod.js')).renderEpizod,
    rozdzial: (await import('../src/wwm/render-epizod.js')).renderRozdzial,
    encja: (await import('../src/wwm/render-encja.js')).renderEncja,
  };
  const problemy = [];
  for (const strona of Object.values(dane.strony)) {
    const render = widoki[strona.typ] ?? widoki.encja;
    const html = render(strona.slug);
    if (!html || html.length < 40) { problemy.push(`${strona.slug}: pusty widok`); continue; }

    const kotwice = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    for (const m of html.matchAll(/href="#([^/][^"]*)"/g)) {
      if (!kotwice.has(m[1])) problemy.push(`${strona.slug}: odsyłacz #${m[1]} bez celu`);
    }
    // W nagłówku nie może leżeć luźny tekst poza <h1>/<p> — tak wyglądał dubel
    // tytułu pod streszczeniem (goły <span> ze ścieżką). Okruszki w <p> są w porządku.
    const naglowek = (html.match(/<header class="naglowek-strony">([\s\S]*?)<\/header>/) ?? [, ''])[1];
    const bezAkapitu = naglowek.replace(/<h1>[\s\S]*?<\/h1>/g, '').replace(/<p[ >][\s\S]*?<\/p>/g, '');
    const resztki = bezAkapitu.replace(/<[^>]*>/g, '').trim();
    if (resztki) problemy.push(`${strona.slug}: w nagłówku luźny tekst „${resztki.slice(0, 60)}”`);
  }
  assert.deepEqual(problemy, []);
});

test('blok z nagłówkiem zachowuje swoje pochodzenie', async () => {
  // `##` w środku bloku zamykał go razem z pochodzeniem, więc treść po nagłówku
  // renderowała się jako domyślne „opracowanie”, a interpretacja traciła kotwicę.
  const { podzielNaBoksy } = await import('../src/wwm/scena-sekcje.js');
  const boksy = podzielNaBoksy('{{model pewnosc=35\n\n## Opis\n\nTekst opisu.\n\n}}\n');
  assert.equal(boksy.length, 1);
  assert.equal(boksy[0].tytul, 'Opis');
  assert.match(boksy[0].bloki[0].otwarcie, /\{\{model pewnosc=35/);
});

test('żaden widok nie pokazuje surowej wartości słownikowej', async () => {
  // `rodzaj: glowny` to wartość z pliku, nie zdanie do czytania: w metryce i przy
  // epizodach musi stać „wątek główny”. Ta sama klasa błędu co „Rodzaj: termin”.
  const dane = await zbudujDane({ root: ROOT });
  globalThis.WWM_DATA = dane;
  const widoki = {
    scena: (await import('../src/wwm/render-scena.js')).renderScena,
    epizod: (await import('../src/wwm/render-epizod.js')).renderEpizod,
    rozdzial: (await import('../src/wwm/render-epizod.js')).renderRozdzial,
    encja: (await import('../src/wwm/render-encja.js')).renderEncja,
  };
  const surowe = /(?:Rodzaj[a-z ]*|wątek|stan|rola):?\s*(glowny|poboczny|tajemnica|romans|mentor|sojusz|mistyczny|polityczny|otwarty|zamkniety)\b/iu;
  const problemy = [];
  for (const strona of Object.values(dane.strony)) {
    const html = (widoki[strona.typ] ?? widoki.encja)(strona.slug);
    const tekst = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    const m = tekst.match(surowe);
    if (m) problemy.push(`${strona.slug}: surowa wartość „${m[0].trim()}”`);
  }
  assert.deepEqual(problemy, []);
});

test('ten sam akapit nie stoi dwa razy na stronie', async () => {
  // Boks „Streszczenie” powtarzał lead pod tytułem; ta sama treść dwa razy na
  // jednym ekranie czyta się jak błąd, nie jak akcent.
  const dane = await zbudujDane({ root: ROOT });
  globalThis.WWM_DATA = dane;
  const widoki = {
    scena: (await import('../src/wwm/render-scena.js')).renderScena,
    epizod: (await import('../src/wwm/render-epizod.js')).renderEpizod,
    rozdzial: (await import('../src/wwm/render-epizod.js')).renderRozdzial,
    encja: (await import('../src/wwm/render-encja.js')).renderEncja,
  };
  const problemy = [];
  for (const strona of Object.values(dane.strony)) {
    const html = (widoki[strona.typ] ?? widoki.encja)(strona.slug);
    const tekst = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    for (const akapit of tekst.match(/[^.!?]{60,300}[.!?]/g) ?? []) {
      const zdanie = akapit.trim();
      const ile = tekst.split(zdanie).length - 1;
      if (ile > 1) problemy.push(`${strona.slug}: powtórzony akapit „${zdanie.slice(0, 70)}…”`);
    }
  }
  assert.deepEqual([...new Set(problemy)], []);
});

test('pewność stoi tylko przy przypuszczeniu — tło kulturowe jej nie dostaje', async () => {
  // `{{model}}` bez `pewnosc=` to tło kulturowe (konwencja, obyczaj, znaczenie
  // słowa) i zostaje w kolorze wiedzy modelu, ale liczba nie ma tu czego szacować.
  // `{{model pewnosc=N}}` to przypuszczenie — i tam pewność jest obowiązkowa.
  const dane = await zbudujDane({ root: ROOT });
  globalThis.WWM_DATA = dane;
  const widoki = {
    scena: (await import('../src/wwm/render-scena.js')).renderScena,
    epizod: (await import('../src/wwm/render-epizod.js')).renderEpizod,
    rozdzial: (await import('../src/wwm/render-epizod.js')).renderRozdzial,
    encja: (await import('../src/wwm/render-encja.js')).renderEncja,
  };
  const problemy = [];
  for (const strona of Object.values(dane.strony)) {
    const html = (widoki[strona.typ] ?? widoki.encja)(strona.slug);
    // Interpretacja to model Z pewnością — legalna. Tło kulturowe to model bez
    // rodzaju: jeśli ma liczbę, ktoś pomylił jedno z drugim.
    for (const m of html.matchAll(/<div [^>]*class="fragment [^"]*poziom-model[^"]*"[^>]*>/g)) {
      if (!/rodzaj-interpretacja/.test(m[0]) && /data-pewnosc=/.test(m[0])) {
        problemy.push(`${strona.slug}: tło kulturowe z pewnością ${m[0].match(/data-pewnosc="(\d+)"/)?.[1]}`);
      }
    }
    // Plakietka bez liczby („pewność”) albo z pustą wartością to znak, że badge
    // dostał coś, co nie jest pewnością.
    for (const m of html.matchAll(/pewność(?![^<]{0,30}\d)/g)) {
      problemy.push(`${strona.slug}: „pewność” bez liczby`);
    }
  }
  assert.deepEqual([...new Set(problemy)], []);
});

test('tytuł boksu stoi nad podboksami, a plakietka przy podboksie', async () => {
  // Tytuł („Treść sceny”) nazywa RODZAJ treści, nie źródło — więc nie może leżeć
  // w środku kolorowanego podboksu, a plakietka „z opowieści” nie może się do niego
  // przykleić. Kolor należy do warstw, nie do nazwy boksu (ADR 0018).
  const dane = await zbudujDane({ root: ROOT });
  globalThis.WWM_DATA = dane;
  const problemy = [];
  const sceny = Object.values(dane.strony).filter((s) => s.typ === 'scena');
  const renderScena = (await import('../src/wwm/render-scena.js')).renderScena;
  for (const strona of sceny) {
    const html = renderScena(strona.slug);
    const glowna = html.slice(html.indexOf('kolumna-glowna'), html.indexOf('<aside'));
    for (const m of glowna.matchAll(/<section class="boks[^"]*"[^>]*>([\s\S]*?)<\/section>/g)) {
      const blok = m[1];
      const tytul = blok.match(/<h2>([^<]+)<\/h2>/)?.[1];
      if (!tytul) {
        problemy.push(`${strona.slug}: sekcja bez tytułu nad podboksami`);
        continue;
      }
      // Tytuł musi być pierwszym elementem sekcji — nie może leżeć w podboksie.
      if (!/^\s*<h2>/.test(blok)) {
        problemy.push(`${strona.slug}: tytuł „${tytul}” nie stoi na początku boksu`);
      }
      // Plakietka pochodzenia przyklejona do <h2> znaczy, że koloruje nazwę rodzaju.
      if (/<h2>[^<]+<\/h2>\s*<span class="poziom-plakietki">/.test(blok)) {
        problemy.push(`${strona.slug}: plakietka pochodzenia przy tytule „${tytul}”`);
      }
    }
    if (/<section class="boks boks-(dostawa|model|kwerenda|opracowanie)/.test(glowna)) {
      problemy.push(`${strona.slug}: kolor pochodzenia na samym boksie`);
    }
  }
  assert.deepEqual([...new Set(problemy)], []);
});


test('wstęp pod tytułem nie powtarza treści strony', async () => {
  // Lead ma zapowiadać, nie streszczać: jeśli ten sam akapit stoi niżej, to dubel.
  const dane = await zbudujDane({ root: ROOT });
  globalThis.WWM_DATA = dane;
  const widoki = {
    scena: (await import('../src/wwm/render-scena.js')).renderScena,
    epizod: (await import('../src/wwm/render-epizod.js')).renderEpizod,
    rozdzial: (await import('../src/wwm/render-epizod.js')).renderRozdzial,
    encja: (await import('../src/wwm/render-encja.js')).renderEncja,
  };
  const problemy = [];
  for (const strona of Object.values(dane.strony)) {
    const html = (widoki[strona.typ] ?? widoki.encja)(strona.slug);
    const wstep = html.match(/<p class="wstep">([\s\S]*?)<\/p>/)?.[1];
    if (!wstep) continue;
    const reszta = html.replace(/<p class="wstep">[\s\S]*?<\/p>/, '');
    const tekst = reszta.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    if (tekst.includes(wstep.replace(/<[^>]*>/g, '').trim())) {
      problemy.push(`${strona.slug}: wstęp powtarza się w treści`);
    }
  }
  assert.deepEqual(problemy, []);
});

test('chronologia nie powtarza nazwy epizodu przy każdej scenie', async () => {
  // Nazwa epizodu stoi nad scenami jako nagłówek; w wierszu była dublowana.
  const dane = await zbudujDane({ root: ROOT });
  globalThis.WWM_DATA = dane;
  const html = (await import('../src/wwm/chronologia.js')).renderChronologia();
  const problemy = [];
  for (const m of html.matchAll(/<li class="chrono-scena"[\s\S]*?<\/li>/g)) {
    const wiersz = m[0];
    if (/chrono-meta[^>]*>[^<]*<a /.test(wiersz)) problemy.push('wiersz sceny linkuje nazwę epizodu');
  }
  // Rozdziały startują zwinięte.
  const otwarte = [...html.matchAll(/<details[^>]*\sopen/g)];
  if (otwarte.length) problemy.push('rozdział otwarty na wejściu');
  assert.deepEqual(problemy, []);
});

test('każda strona jest osiągalna z nawigacji', async () => {
  // „Co nowego” i „Jak czytać kronikę” istniały, ale nie miały żadnego wejścia.
  const { rama } = await import('../src/wwm/render.js');
  const html = rama('glowna', 'x', '<p>treść</p>');
  for (const trasa of ['#/co-nowego', '#/o-bazie']) {
    assert.ok(html.includes(trasa), `nawigacja nie linkuje ${trasa}`);
  }
});

test('każdy odsyłacz wewnętrzny w WIDOKU ma cel — także w kolumnie bocznej', async () => {
  // Poprzednia brama patrzyła na dane strony (html/boksy/sekcje), a chip
  // interpretacji powstaje dopiero w kolumnie bocznej przy renderze. Dlatego
  // „Do kogo należy nieznajomy…” linkowało w pustkę i przeszło 75 testów.
  // Tu sprawdzamy CAŁY widok: treść, kolumnę, stopkę.
  const dane = await zbudujDane({ root: ROOT });
  globalThis.WWM_DATA = dane;
  const widoki = {
    scena: (await import('../src/wwm/render-scena.js')).renderScena,
    epizod: (await import('../src/wwm/render-epizod.js')).renderEpizod,
    rozdzial: (await import('../src/wwm/render-epizod.js')).renderRozdzial,
    encja: (await import('../src/wwm/render-encja.js')).renderEncja,
  };
  const problemy = [];
  for (const strona of Object.values(dane.strony)) {
    const html = (widoki[strona.typ] ?? widoki.encja)(strona.slug);
    const kotwice = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    for (const m of html.matchAll(/href="#([^/][^"]*)"/g)) {
      if (!kotwice.has(m[1])) problemy.push(`${strona.slug}: odsyłacz #${m[1]} bez celu w widoku`);
    }
  }
  assert.deepEqual([...new Set(problemy)], []);
});

test('goła kotwica nie jest traktowana jak trasa', async () => {
  // Router na `#hip-rola` renderował „Nie ma takiej strony” — a to skok w treści.
  const { czyKotwicaWewnetrzna } = await import('../src/wwm/router.js');
  assert.equal(czyKotwicaWewnetrzna('#hip-rola'), true);
  assert.equal(czyKotwicaWewnetrzna('#/scena/x'), false);
  assert.equal(czyKotwicaWewnetrzna('#'), false);
});
