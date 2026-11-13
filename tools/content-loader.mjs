/**
 * Ładowanie treści bazy — jedyne miejsce, które czyta katalogi `content/`
 * oraz `rozgrywka/` i składa surowe obiekty stron.
 *
 * Używany przez tools/build.mjs (produkcja) i testy integralności
 * (te same reguły — brak rozjazdu między buildem a testami).
 *
 * Loader NIE waliduje semantyki (to registry.js) — tylko parsuje i łączy.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../src/wwm/frontmatter.js';

/** Katalogi treści → typ strony (ADR 0003). */
export const KATALOGI = [
  { katalog: 'content/rozdzialy', typ: 'rozdzial' },
  { katalog: 'content/zadania', typ: 'zadanie' },
  { katalog: 'content/sceny', typ: 'scena' },
  { katalog: 'content/postacie', typ: 'postac' },
  { katalog: 'content/miejsca', typ: 'miejsce' },
  { katalog: 'content/pojecia', typ: 'pojecie' },
  { katalog: 'content/konteksty', typ: 'kontekst' },
  { katalog: 'content/watki', typ: 'watek' },
  { katalog: 'content/relacje', typ: 'relacja' },
];

export function wczytajPlikiMarkdown(katalog, { root = '.' } = {}) {
  const abs = path.resolve(root, katalog);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map((f) => {
      const pelna = path.join(abs, f);
      const surowy = fs.readFileSync(pelna, 'utf8');
      const { data, body } = parseFrontmatter(surowy);
      return { plik: f, sciezka: pelna, fm: data, body };
    });
}

/** Strony treściowe: content/<dział>/*.md → surowe obiekty stron. */
export function wczytajStrony({ root = '.' } = {}) {
  const strony = [];
  for (const { katalog, typ } of KATALOGI) {
    for (const plik of wczytajPlikiMarkdown(katalog, { root })) {
      const fm = plik.fm ?? {};
      if (fm.typ !== typ) {
        strony.push({ problem: `${katalog}/${plik.plik}: frontmatter.typ = "${fm.typ}", a katalog sugeruje "${typ}"` });
        continue;
      }
      strony.push({
        ...fm,
        typ: fm.typ,
        slug: fm.slug,
        tytul: fm.tytul ?? null,
        body: plik.body,
        surowy: plik.body,
        plik: `${katalog}/${plik.plik}`,
      });
    }
  }
  return strony;
}

/** Rekurencyjny spis plików (absolutne, posortowane). */
export function chodz(katalog) {
  const wyn = [];
  if (!fs.existsSync(katalog)) return wyn;
  for (const e of fs.readdirSync(katalog, { withFileTypes: true })) {
    const pelna = path.join(katalog, e.name);
    if (e.isDirectory()) wyn.push(...chodz(pelna));
    else wyn.push(pelna);
  }
  return wyn.sort();
}

/**
 * Surowy zapis rozgrywki — archiwum materiału wejściowego.
 * `rozgrywka/zapisy/*.md` to plik z tekstem scen przepisanych z gry.
 */
export function wczytajZapisy({ root = '.' } = {}) {
  const mapa = new Map();
  const baza = path.resolve(root, 'rozgrywka/zapisy');
  if (!fs.existsSync(baza)) return mapa;
  for (const pelna of chodz(baza)) {
    if (!pelna.endsWith('.md') || path.basename(pelna) === 'README.md') continue;
    const rel = path.relative(root, pelna).split(path.sep).join('/');
    mapa.set(rel, fs.readFileSync(pelna, 'utf8'));
  }
  return mapa;
}

/** Stan rozgrywki: `rozgrywka/postep.json` — granica rozegranej fabuły (ADR 0007). */
export function wczytajPostep({ root = '.' } = {}) {
  const p = path.resolve(root, 'rozgrywka/postep.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return { blad: `rozgrywka/postep.json: niepoprawny JSON — ${e.message}` };
  }
}

/**
 * Dziennik zmian: `content/co-nowego.md`.
 * Konwencja: `## RRRR-MM-DD GG:MM` otwiera wpis; punkty pod nim to zmiany.
 */
export function wczytajCoNowego({ root = '.' } = {}) {
  const p = path.resolve(root, 'content/co-nowego.md');
  if (!fs.existsSync(p)) return [];
  const surowy = fs.readFileSync(p, 'utf8');
  const { body } = parseFrontmatter(surowy);
  const wpisy = [];
  let data = null;
  let czas = null;
  let bufor = [];
  const zamknij = () => {
    if (data && bufor.length > 0) wpisy.push({ data, czas, tekst: bufor.join('\n') });
    bufor = [];
  };
  for (const linia of String(body ?? surowy).split(/\r?\n/)) {
    const naglowek = linia.match(/^##\s+(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?\s*$/);
    if (naglowek) { zamknij(); data = naglowek[1]; czas = naglowek[2] ?? null; continue; }
    if (/^##\s+/.test(linia)) continue; // inne nagłówki: dokumentacja, nie wpisy
    if (data && linia.trim() !== '') bufor.push(linia);
  }
  zamknij();
  return wpisy.sort((a, b) => `${b.data} ${b.czas ?? '00:00'}`.localeCompare(`${a.data} ${a.czas ?? '00:00'}`));
}
