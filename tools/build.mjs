/**
 * Build bazy — jeden samowystarczalny plik HTML (ADR 0001).
 *
 * 1. Ładuje treść (content-loader) i WALIDUJE ją (registry) — build nie
 *    wypuszcza artefaktu z martwymi wikilinkami, złym schematem ani sceną
 *    za granicą rozegranej fabuły.
 * 2. Renderuje markdown stron z resolverem wikilinków, dzieli strony scen
 *    i epizodów na boksy i planuje kotwice hipotez.
 * 3. Skleja moduły ESM z `src/wwm` w jeden zasięg (tools/module-graph.mjs).
 * 4. Dzieli dane na **indeks** (metadane, graf, słowniki) i **ciała stron**
 *    (ADR 0017). Powłoka zawiera styl, kod i indeks spakowany gzip+base64;
 *    ciała leżą w `dist/data/<slug>.json` i są dociągane przy wejściu w stronę.
 *
 * Uruchomienie: node tools/build.mjs [--out dist/index.html] [--single]
 *
 * `--single` pakuje całość w jeden plik (archiwum offline, działa z file://).
 * Tryb domyślny wymaga serwera HTTP — tak publikuje Pages.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { collectModules, assertNoNameCollisions, stripModuleSyntax } from './module-graph.mjs';
import {
  wczytajStrony, wczytajZapisy, wczytajPostep, wczytajCoNowego,
} from './content-loader.mjs';
import { renderMarkdown, BLOK_OTWARCIA_RE, parsujAtrybutyBloku } from '../src/wwm/markdown.js';
import { podzielScene, podzielNaBoksy, zaplanujScene, kotwiceSekcji } from '../src/wwm/scena-sekcje.js';
import { parseWikilinks } from '../src/wwm/links.js';
import { wyciagnijHipotezy } from '../src/wwm/hipotezy.js';
import {
  zbudujRejestr, resolverLinkow, walidujStrone, policzBacklinki, policzTagi, policzStatystyki,
  sprawdzGraniceFabuly, sprawdzPorzadekEpizodow, sprawdzWiernoscSceny, odsylaczeStrony, POLA_RELACJI,
} from '../src/wwm/registry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = 'src/wwm/main.js';

const POLA_ODSYLACZY = Object.keys(POLA_RELACJI);

// ── Metadane czasu stron z historii gita ───────────────────────────
let ostrzezonoPlytki = false;
function ostrzezPlytkiKlon() {
  if (ostrzezonoPlytki) return;
  ostrzezonoPlytki = true;
  try {
    const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (shallow === 'true') {
      console.warn('UWAGA: płytki klon gita — daty stron będą niepełne. Użyj fetch-depth: 0 w workflow.');
    }
  } catch { /* poza repozytorium — fallback na mtime */ }
}

/** Zakres czasu bazy: najwcześniejsze utworzenie i najpóźniejsza modyfikacja. */
function policzCzasBazy(czasy) {
  const ok = czasy.filter((c) => c && c.utworzono && c.zaktualizowano);
  if (ok.length === 0) return null;
  const utw = ok.map((c) => c.utworzono).sort();
  const zakt = ok.map((c) => c.zaktualizowano).sort();
  return { utworzono: utw[0], zaktualizowano: zakt[zakt.length - 1] };
}

function datyGit(sciezka) {
  ostrzezPlytkiKlon();
  try {
    const wyjscie = execFileSync('git',
      ['log', '--format=%ad', '--date=format-local:%Y-%m-%d %H:%M', '--', sciezka],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, TZ: 'Europe/Warsaw' } });
    const daty = wyjscie.split('\n').filter(Boolean);
    if (daty.length > 0) return { utworzono: daty[daty.length - 1], zaktualizowano: daty[0] };
  } catch { /* git niedostępny */ }
  try {
    const st = fs.statSync(path.resolve(ROOT, sciezka));
    const f = (d) => new Date(d).toLocaleString('sv-SE', { timeZone: 'Europe/Warsaw' }).slice(0, 16);
    return { utworzono: f(st.mtime), zaktualizowano: f(st.mtime) };
  } catch { return { utworzono: null, zaktualizowano: null }; }
}

/** Tekst bez znaczników — dla wyszukiwarki po stronie przeglądarki. */
export function naTekst(md, limit = 8000) {
  let wZapisie = false;
  const bezBlokow = String(md ?? '')
    .split(/\r?\n/)
    .filter((linia) => {
      const t = linia.trim();
      if (!wZapisie && /^:::/.test(t)) { wZapisie = true; return false; }
      if (wZapisie && t === ':::') { wZapisie = false; return false; }
      if (!wZapisie && (BLOK_OTWARCIA_RE.test(t) || t === '}}')) return false;
      return true;
    })
    .join('\n');
  const t = bezBlokow
    .replace(/!\[[^\]]*\]\([^)\s]+\)/g, ' ')
    .replace(/\[\[([^\]|]+?)\|([^\]]+?)\]\]/g, '$2')
    .replace(/\[\[([^\]]+?)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
    .replace(/^:::.*$/gm, ' ')
    .replace(/^(?:-{3,}|\*{3,}|_{3,})[ \t]*$/gm, ' ')
    .replace(/^[ \t]*[-*][ \t]+/gm, ' ')
    .replace(/[#>*`|_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > limit ? t.slice(0, limit) : t;
}

/** Pierwsze zdanie (lub skrócony akapit) sekcji `## Opis` — zajawka na listach. */
const ABBR_RE = /\b(?:np|tzw|ok|dr|ds|ks|św|ul|al|im|inż|prof|mgr|hab|por|zob|ang|jap|pol|itd|itp|in)$/i;

export function wyciagnijSkrotOpisu(body, limit = 200, sekcja = 'Opis') {
  const m = String(body ?? '').match(new RegExp(`^##\\s+${sekcja}[ \\t]*\\r?\\n+([\\s\\S]*?)(?:\\r?\\n[ \\t]*\\r?\\n|\\r?\\n##\\s|\\r?\\n\\}\\}|(?![\\s\\S]))`, 'm'));
  const akapit = naTekst(m ? m[1] : '', limit * 3);
  if (!akapit) return '';
  for (const koniec of akapit.matchAll(/[.!?](?=\s|$)/g)) {
    const idx = koniec.index + 1;
    if (ABBR_RE.test(akapit.slice(0, koniec.index))) continue;
    const zdanie = akapit.slice(0, idx).trim();
    if (zdanie.length <= limit) return zdanie;
    break;
  }
  if (akapit.length <= limit) return akapit;
  const uciete = akapit.slice(0, limit).replace(/\s+\S*$/, '').replace(/[,;:\s—–-]+$/, '');
  return `${uciete || akapit.slice(0, limit)}…`;
}

/**
 * Składa dane bazy (walidacja → render markdown → WWM_DATA).
 * Wydzielone od pakowania artefaktu, żeby testy rendererów mogły
 * pracować na dokładnie tych samych danych, co witryna.
 */
export async function zbudujDane({ root = ROOT } = {}) {
  const problemy = [];

  // ── 1. Ładowanie treści ─────────────────────────────────────────
  const suroweStrony = wczytajStrony({ root });
  for (const s of suroweStrony) if (s.problem) problemy.push(s.problem);
  const strony = suroweStrony.filter((s) => !s.problem);

  const zapisy = wczytajZapisy({ root });
  const postep = wczytajPostep({ root });
  if (postep?.blad) problemy.push(postep.blad);
  const coNowegoSurowe = wczytajCoNowego({ root });

  const { bySlug, duplikaty } = zbudujRejestr(strony);
  for (const d of duplikaty) problemy.push(`zduplikowany slug: ${d}`);

  const ctx = { bySlug };
  for (const s of strony) problemy.push(...walidujStrone(s, ctx));

  // ── 2. Bramy fabularne ──────────────────────────────────────────
  const sceny = strony.filter((s) => s.typ === 'scena');
  problemy.push(...sprawdzGraniceFabuly(sceny, postep));
  problemy.push(...sprawdzPorzadekEpizodow(strony.filter((s) => s.typ === 'epizod'), strony.filter((s) => s.typ === 'rozdzial')));

  // Odsyłacz do archiwum zapisu musi istnieć w `rozgrywka/zapisy/` — inaczej
  // scena nie ma z czym porównać dosłowności i brama wierności kłamie.
  for (const s of sceny) {
    const tekst = typeof s.zapis === 'string' && s.zapis !== ''
      ? zapisy.get(`rozgrywka/zapisy/${path.basename(s.zapis)}`) ?? null
      : null;
    if (s.zapis !== undefined && tekst === null) {
      problemy.push(`${s.slug}: "zapis: ${s.zapis}" nie istnieje w rozgrywka/zapisy/`);
      continue;
    }
    problemy.push(...sprawdzWiernoscSceny(s, tekst));
  }

  // ── 3. Render markdown + odsyłacze ──────────────────────────────
  const resolver = resolverLinkow(bySlug);
  const wyrenderowane = new Map();
  const licznikiHipotez = new Map();

  for (const s of strony) {
    // Kotwice interpretacji liczymy RAZ, zanim cokolwiek się wyrenderuje: chip w kolumnie
    // bocznej i cel w treści muszą dostać ten sam identyfikator (ADR 0005, 0006).
    const hipotezy = wyciagnijHipotezy(s.body, { licznik: licznikiHipotez, tytulStrony: s.tytul });
    let licznikInterpretacji = 0;
    const kotwicaDlaBloku = (otwarcie) => {
      const m = String(otwarcie ?? '').match(BLOK_OTWARCIA_RE);
      if (!m) return null;
      const atrybuty = parsujAtrybutyBloku(m[2]);
      const rodzaj = atrybuty.get('rodzaj') ?? (m[1] === 'model' && atrybuty.has('pewnosc') ? 'interpretacja' : null);
      if (rodzaj !== 'interpretacja') return null;
      const kotwica = hipotezy[licznikInterpretacji]?.kotwica ?? null;
      licznikInterpretacji += 1;
      return kotwica;
    };

    const { html, problemy: mdProblemy } = renderMarkdown(s.body, { resolveLink: resolver, wymagajPoziomu: true });
    for (const pr of mdProblemy) problemy.push(`${s.slug}: ${pr}`);

    const linki = new Set(parseWikilinks(s.body).map((w) => w.slug));
    for (const pole of POLA_ODSYLACZY) {
      const wartosc = s[pole];
      if (Array.isArray(wartosc)) for (const cel of wartosc) linki.add(cel);
      else if (typeof wartosc === 'string' && wartosc !== '') linki.add(wartosc);
    }
    linki.delete(s.slug);

    // Scena: osobno renderowane boksy (treść, analiza, nawiązania, wątki) —
    // strona rozkłada je na dwie kolumny i wiąże podsekcje analizy z treścią.
    let sekcje = null;
    if (s.typ === 'scena') {
      const czesci = podzielScene(s.body);
      const plan = zaplanujScene(czesci, s.sekcje_analizy);
      for (const pr of plan.problemy) problemy.push(`${s.slug}: ${pr}`);
      const stanKotwic = {};
      sekcje = czesci.map((cz) => {
        // Bez `## ${cz.tytul}`: tytuł boksu renderuje widok NAD podboksami.
        // Dzięki temu plakietka pochodzenia trafia do podboksu („Otwarta brama”),
        // a nie do nazwy rodzaju treści (ADR 0018).
        const zrodlo = `${cz.otwarcie ?? '{{dostawa'}\n\n${cz.tresc}\n\n}}`;
        const wynik = renderMarkdown(zrodlo, {
          resolveLink: resolver,
          wymagajPoziomu: true,
          atrybutyNaglowka: kotwiceSekcji(cz.tytul, plan, {
            hrefStrony: `#/scena/${s.slug}`,
            stan: stanKotwic,
          }),
          kotwicaInterpretacji: kotwicaDlaBloku(cz.otwarcie),
        });
        for (const pr of wynik.problemy) problemy.push(`${s.slug} (${cz.tytul}): ${pr}`);
        // Tytuł boksu stoi NAD podboksami: „Treść sceny” nazywa rodzaj treści,
        // a warstwy w środku mówią, skąd każda z nich pochodzi (ADR 0018).
        // Dlatego z HTML-a warstwy wycinamy jej własny <h2>.
        return { tytul: cz.tytul, html: wynik.html, warstwy: cz.warstwy ?? 1 };
      });
    }

    // Zadanie, rozdział i encje: każdy nagłówek `##` to osobny boks strony.
    let boksy = null;
    if (s.typ !== 'scena') {
      boksy = podzielNaBoksy(s.body).map((b) => ({
        tytul: b.tytul,
        html: b.bloki.map((bl) => {
          const wynik = renderMarkdown(`${bl.otwarcie ?? '{{opracowanie'}\n\n${bl.tresc}\n\n}}`, {
            resolveLink: resolver,
            wymagajPoziomu: true,
            kotwicaInterpretacji: kotwicaDlaBloku(bl.otwarcie),
          });
          for (const pr of wynik.problemy) problemy.push(`${s.slug}: ${pr}`);
          return wynik.html;
        }).join('\n'),
        warstwy: b.bloki.length,
      }));
    }

    wyrenderowane.set(s.slug, { html, linki: [...linki], sekcje, boksy, hipotezy });
  }

  // ── 4. Dziennik zmian ───────────────────────────────────────────
  const coNowego = coNowegoSurowe.map((w) => {
    const { html } = renderMarkdown(w.tekst, { resolveLink: resolver });
    return { data: w.data, czas: w.czas, tekst: naTekst(w.tekst, 400), html };
  });

  if (problemy.length > 0) {
    console.error('Build przerwany — problemy integralności bazy:');
    for (const p of problemy) console.error(`  - ${p}`);
    throw new Error(`Baza ma ${problemy.length} problem(ów); artefakt nie został zbudowany.`);
  }

  // ── 5. WWM_DATA ─────────────────────────────────────────────────
  const stronyDane = {};
  for (const s of strony) {
    const r = wyrenderowane.get(s.slug);
    const { problem, body, surowy, ...pola } = s;
    const maSekcje = Array.isArray(r.sekcje) && r.sekcje.length > 0;
    const maBoksy = Array.isArray(r.boksy) && r.boksy.length > 0;

    // Streszczenie na listach: jawne pole albo sekcja `## Streszczenie`.
    // NIE wyciągamy go z „Opisu”: to dosłowny początek treści, który pod tytułem
    // dublował pierwszy akapit boksu i wyglądał jak urwany fragment (ADR 0018).
    const maOpis = /^##\s+Opis[ \t]*$/m.test(body);
    const streszczenie = pola.streszczenie
      ?? (maOpis ? '' : wyciagnijSkrotOpisu(body, 260, 'Streszczenie'))
      ?? '';

    stronyDane[s.slug] = {
      ...pola,
      ...(streszczenie ? { streszczenie } : {}),
      ...(!maSekcje && !maBoksy ? { html: r.html } : {}),
      linki: r.linki,
      tekst: naTekst(body),
      czas: datyGit(s.plik),
      hipotezy: r.hipotezy,
      ...(maSekcje ? { sekcje: r.sekcje } : {}),
      ...(maBoksy ? { boksy: r.boksy } : {}),
    };
  }

  const dane = {
    zbudowano: new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Warsaw' }).slice(0, 16).replace('T', ' '),
    postep: postep && !postep.blad ? postep : null,
    strony: stronyDane,
    backlinki: policzBacklinki(strony.map((s) => ({ slug: s.slug, typ: s.typ, linki: wyrenderowane.get(s.slug).linki }))),
    tagi: policzTagi(strony),
    statystyki: policzStatystyki(strony.map((s) => ({ ...s, linki: wyrenderowane.get(s.slug).linki }))),
    coNowego,
    coNowegoCzas: datyGit('content/co-nowego.md'),
    czasBazy: policzCzasBazy([...Object.values(stronyDane).map((s) => s.czas), datyGit('content/co-nowego.md')]),
  };

  const st = dane.statystyki;
  console.log(`Dane bazy: ${Object.keys(stronyDane).length} stron — rozdziały: ${st.rozdzial}, epizody: ${st.epizod}, sceny: ${st.scena}, wątki: ${st.watek}, postacie: ${st.postac}, sekty: ${st.sekta}, krainy: ${st.kraina}, miejsca: ${st.miejsce}, konteksty: ${st.kontekst}, hasła: ${st.pojecie}`);
  console.log(`  powiązania: ${st.powiazania}`);
  return dane;
}

/**
 * Dzieli dane na indeks i ciała stron (ADR 0017).
 *
 * Indeks to wszystko, czego potrzebują listy, chronologia, strona główna i graf:
 * typ, tytuł, streszczenie, odsyłacze, kolejność, daty, interpretacje.
 * Ciało (html, boksy, sekcje) jedzie osobno — czytelnik otwiera jedną scenę,
 * a nie całą kronikę.
 */
export function podzielDane(dane) {
  const POLA_CIALA = ['html', 'boksy', 'sekcje'];
  const indeksStron = {};
  const ciala = {};
  const teksty = {};

  for (const [slug, strona] of Object.entries(dane.strony)) {
    const indeks = { ...strona };
    const cialo = {};
    for (const pole of POLA_CIALA) {
      if (indeks[pole] !== undefined) { cialo[pole] = indeks[pole]; delete indeks[pole]; }
    }
    if (strona.tekst !== undefined) { teksty[slug] = strona.tekst; delete indeks.tekst; }
    indeksStron[slug] = indeks;
    if (Object.keys(cialo).length > 0) ciala[slug] = cialo;
  }

  return {
    indeks: { ...dane, strony: indeksStron, coNowego: [] },
    ciala,
    teksty,
    coNowego: dane.coNowego ?? [],
  };
}

export async function zbuduj({ out, root = ROOT, single = false } = {}) {
  out = out ?? path.join(root, 'dist/index.html');
  const dane = await zbudujDane({ root });

  // ── 6. Sklejanie artefaktu ──────────────────────────────────────
  const moduly = collectModules(ENTRY, { rootDir: ROOT });
  assertNoNameCollisions(moduly, { rootDir: ROOT });

  const kod = moduly
    .map(({ abs, source }) => {
      const rel = path.relative(ROOT, abs).replaceAll('\\', '/');
      return `// ===== ${rel} =====\n${stripModuleSyntax(source).trim()}`;
    })
    .join('\n\n');

  // Powłoka: indeks spakowany. Tryb jednoplikowy: całość w WWM_DATA.
  const podzial = single ? null : podzielDane(dane);
  const daneJs = single
    ? `// ===== WWM_DATA (tryb jednoplikowy) =====\nglobalThis.WWM_DATA = ${JSON.stringify(dane, null, 2)};`
    : `// ===== WWM_TRYB + indeks (gzip/base64, ADR 0017) =====\n`
      + `globalThis.WWM_TRYB = 'pliki';\n`
      + `globalThis.WWM_B64 = ${JSON.stringify(zlib.gzipSync(JSON.stringify(podzial.indeks)).toString('base64'))};`;

  const shell = fs.readFileSync(path.join(ROOT, 'src/wwm/index.html'), 'utf8');
  for (const znacznik of ['<!--STYL-->', '<!--BUNDLE-->']) {
    if (!shell.includes(znacznik)) throw new Error(`src/wwm/index.html nie zawiera ${znacznik}`);
  }
  const css = fs.readFileSync(path.join(ROOT, 'src/wwm/style.css'), 'utf8');

  // Zbezpiecznik wstrzykiwania do <script>: jedyna sekwencja kończąca blok
  // skryptu to '</script' — neutralizujemy ją w danych.
  const doSkryptu = (s) => s.replaceAll('</script', '<\\/script');

  const html = shell
    .replace('<!--STYL-->', () => `<style>\n${css}\n</style>`)
    .replace('<!--BUNDLE-->', () => `<script>\n${doSkryptu(daneJs)}\n\n${kod}\n</script>`);

  const cel = path.resolve(out);
  fs.mkdirSync(path.dirname(cel), { recursive: true });
  fs.writeFileSync(cel, html);

  if (!single) {
    const katalog = path.join(path.dirname(cel), 'data');
    fs.rmSync(katalog, { recursive: true, force: true });
    fs.mkdirSync(katalog, { recursive: true });
    const zapisz = (nazwa, wartosc) => fs.writeFileSync(path.join(katalog, nazwa), JSON.stringify(wartosc));
    for (const [slug, cialo] of Object.entries(podzial.ciala)) zapisz(`${slug}.json`, cialo);
    zapisz('teksty.json', podzial.teksty);
    zapisz('co-nowego.json', podzial.coNowego);
    const rozmiar = (p) => fs.statSync(p).size;
    const bajtyCial = Object.keys(podzial.ciala)
      .reduce((n, s) => n + rozmiar(path.join(katalog, `${s}.json`)), 0);
    console.log(`Zbudowano ${path.relative(ROOT, cel)} (powłoka ${(html.length / 1024).toFixed(1)} kB, ${moduly.length} modułów)`);
    console.log(`  data/: ${Object.keys(podzial.ciala).length} ciał stron (${(bajtyCial / 1024).toFixed(1)} kB), `
      + `teksty ${(rozmiar(path.join(katalog, 'teksty.json')) / 1024).toFixed(1)} kB, `
      + `dziennik ${(rozmiar(path.join(katalog, 'co-nowego.json')) / 1024).toFixed(1)} kB`);
  } else {
    console.log(`Zbudowano ${path.relative(ROOT, cel)} (${(html.length / 1024).toFixed(1)} kB, ${moduly.length} modułów)`);
  }
  return cel;
}

const jestMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (jestMain) {
  const i = process.argv.indexOf('--out');
  const out = i >= 0 ? process.argv[i + 1] : undefined;
  const single = process.argv.includes('--single');
  zbuduj({ out, single }).catch((e) => { console.error(e.message); process.exit(1); });
}
