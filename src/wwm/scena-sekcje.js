/**
 * Podział strony sceny na boksy i kotwice między nimi (ADR 0008).
 *
 * Scena jest jedynym typem strony, którego treść składa się z kilku niezależnych
 * części: dosłownego zapisu rozegrania, analizy, nawiązań kulturowych i wątków.
 * Wszystkie stoją w jednym pliku pod nagłówkami `##`, więc build rozcina ciało
 * strony na sekcje i renderuje każdą osobno — dopiero wtedy można je rozłożyć
 * na dwie kolumny.
 *
 * Podsekcje analizy (`###`) prowadzą do odpowiadających im miejsc treści sceny.
 * Powiązanie jest jawne (frontmatter `sekcje_analizy`), bo tytuły po obu stronach
 * są redagowane niezależnie i kolejność nie zawsze się zgadza.
 */

import { BLOK_OTWARCIA_RE } from './markdown.js';
import { slugify } from './links.js';

/** Tytuły sekcji sceny w kolejności czytania. */
export const SEKCJE_SCENY = ['Treść sceny', 'Analiza', 'Nawiązania kulturowe', 'Wątki w scenie'];

/**
 * Dzieli ciało strony sceny na sekcje `##` wraz z otaczającym je blokiem
 * poziomu wiarygodności. Nagłówki wewnątrz `:::zapis` są dosłownym tekstem
 * rozgrywki i nie zaczynają nowej sekcji.
 */
export function podzielScene(body) {
  const sekcje = [];
  let otwarcie = null;
  let wZapisie = false;
  let biezaca = null;

  const zamknij = () => {
    if (!biezaca) return;
    biezaca.tresc = biezaca.linie.join('\n').replace(/^\n+|\n+$/g, '');
    delete biezaca.linie;
    sekcje.push(biezaca);
    biezaca = null;
  };

  for (const linia of String(body ?? '').split('\n')) {
    const t = linia.trim();

    if (/^:::/.test(t)) {
      wZapisie = !wZapisie;
      if (biezaca) biezaca.linie.push(linia);
      continue;
    }
    if (wZapisie) {
      if (biezaca) biezaca.linie.push(linia);
      continue;
    }

    if (BLOK_OTWARCIA_RE.test(t)) { otwarcie = t; continue; }
    if (t === '}}') { otwarcie = null; continue; }

    const h = linia.match(/^##\s+(.+?)\s*$/);
    if (h) {
      zamknij();
      biezaca = { tytul: h[1], otwarcie, linie: [] };
      continue;
    }
    if (biezaca) biezaca.linie.push(linia);
  }
  zamknij();
  return sekcje;
}

/** Nagłówki `##`–`####` w treści sekcji, w kolejności wystąpienia. */
function naglowki(tresc) {
  const wynik = [];
  for (const linia of String(tresc ?? '').split('\n')) {
    const m = linia.match(/^(#{2,4})\s+(.+?)\s*$/);
    if (m) wynik.push({ poziom: m[1].length, tytul: m[2] });
  }
  return wynik;
}

/**
 * Dzieli ciało strony na boksy: każdy nagłówek `##` otwiera nowy boks,
 * a zmiana bloku poziomu bez nagłówka domyka poprzedni, bo blok ma własne tło
 * i nie dzieli boksy z innym. Nagłówki wewnątrz `:::zapis` są dosłownym tekstem.
 *
 * Zwraca `[{ tytul, bloki: [{ otwarcie, tresc }] }]`.
 */
export function podzielNaBoksy(body) {
  const boksy = [];
  let boks = null;
  let blok = null;
  let otwarcie = null;
  let wZapisie = false;

  const zamknijBlok = () => {
    if (!blok) return;
    blok.tresc = blok.linie.join('\n').replace(/^\n+|\n+$/g, '');
    delete blok.linie;
    if (boks && blok.tresc !== '') boks.bloki.push(blok);
    blok = null;
  };
  const zamknijBoks = () => {
    zamknijBlok();
    if (!boks) return;
    if (boks.bloki.length > 0) boksy.push(boks);
    boks = null;
  };

  for (const linia of String(body ?? '').split('\n')) {
    const t = linia.trim();

    if (/^:::/.test(t)) {
      wZapisie = !wZapisie;
      if (blok) blok.linie.push(linia);
      continue;
    }
    if (wZapisie) {
      if (blok) blok.linie.push(linia);
      continue;
    }

    const h = linia.match(/^##\s+(.+?)\s*$/);
    if (h) {
      zamknijBoks();
      boks = { tytul: h[1], bloki: [] };
      continue;
    }

    if (BLOK_OTWARCIA_RE.test(t)) {
      if (!boks) boks = { tytul: null, bloki: [] };
      // Zmiana bloku poziomu bez nagłówka domyka poprzedni: boks ma własne tło,
      // więc nie dzieli go z fragmentem o innym poziomie. Same linie otwarcia
      // i zamknięcia nie wchodzą do treści — build opakowuje ją ponownie.
      if (blok) zamknijBlok();
      otwarcie = t;
      blok = { otwarcie, linie: [] };
      continue;
    }
    if (t === '}}') {
      if (blok) zamknijBlok();
      continue;
    }

    if (blok) blok.linie.push(linia);
    else if (t !== '') {
      if (!boks) boks = { tytul: null, bloki: [] };
      blok = { otwarcie: null, linie: [linia] };
    }
  }
  zamknijBoks();
  return boksy;
}

/**
 * Plan kotwic podsekcji sceny i powiązań analiza ↔ treść.
 *
 * `sekcje_analizy` to lista par `"podsekcja analizy → podsekcja treści"`.
 * Każda podsekcja analizy dostaje odsyłacz do swojego miejsca w treści,
 * a tytuł w treści — identyfikator, do którego ten odsyłacz prowadzi.
 */
export function zaplanujScene(sekcje, pary = []) {
  const problemy = [];
  const kotwice = new Map();
  const licznik = new Map();

  const kotwica = (tytul) => {
    const baza = slugify(tytul) || 'sekcja';
    const ile = (licznik.get(baza) ?? 0) + 1;
    licznik.set(baza, ile);
    return ile === 1 ? `sc-${baza}` : `sc-${baza}-${ile}`;
  };

  const analiza = sekcje.find((s) => s.tytul === 'Analiza');
  const tresc = sekcje.find((s) => s.tytul === 'Treść sceny');

  const podsekcjeAnalizy = analiza ? naglowki(analiza.tresc).filter((n) => n.poziom === 3).map((n) => n.tytul) : [];
  const podsekcjeTresci = tresc ? naglowki(tresc.tresc).filter((n) => n.poziom === 3).map((n) => n.tytul) : [];

  for (const tytul of podsekcjeTresci) kotwice.set(`tresc:${tytul}`, kotwica(tytul));

  const mapa = new Map();
  for (const para of pary ?? []) {
    const czesci = String(para).split('→').map((x) => x.trim());
    if (czesci.length !== 2 || !czesci[0] || !czesci[1]) {
      problemy.push(`sekcje_analizy: "${para}" nie jest parą "podsekcja analizy → podsekcja treści"`);
      continue;
    }
    const [z, na] = czesci;
    if (!podsekcjeAnalizy.includes(z)) problemy.push(`sekcje_analizy: "${z}" nie jest podsekcją analizy`);
    if (!podsekcjeTresci.includes(na)) problemy.push(`sekcje_analizy: "${na}" nie jest podsekcją treści`);
    mapa.set(z, na);
  }

  // Każda podsekcja analizy musi mieć dokładnie jedno miejsce docelowe, inaczej
  // odsyłacz jest obietnicą bez celu — a to właśnie on spina scenę w całość.
  if (podsekcjeAnalizy.length > 0) {
    for (const z of podsekcjeAnalizy) {
      if (!mapa.has(z)) problemy.push(`sekcje_analizy: podsekcja analizy "${z}" nie ma pary → brak odsyłacza do treści`);
    }
  }

  return { problemy, kotwice, mapa, podsekcjeAnalizy, podsekcjeTresci };
}

/**
 * Atrybuty nagłówka w renderze sceny: kotwica treści i odsyłacz w podsekcji analizy.
 * `stan` gromadzi już nadane identyfikatory, żeby nie było dwóch o tym samym id.
 */
export function kotwiceSekcji(tytulSekcji, plan, { hrefStrony, stan = {} } = {}) {
  return (poziom, tytul) => {
    if (poziom !== 3) return null;
    if (tytulSekcji === 'Treść sceny') {
      const id = plan.kotwice.get(`tresc:${tytul}`);
      if (!id || stan[id]) return null;
      stan[id] = true;
      return { id };
    }
    if (tytulSekcji === 'Analiza') {
      const cel = plan.mapa.get(tytul);
      if (!cel) return null;
      const id = plan.kotwice.get(`tresc:${cel}`);
      if (!id) return null;
      const strzalka = '<span class="skok-do-tresci" aria-hidden="true">↦</span>';
      const href = `${hrefStrony}#${id}`;
      return {
        wewnetrzny: `<a class="skok-do-tresci" data-cel="${escapeText(id)}" href="${escapeText(href)}">${escapeText(tytul)}${strzalka}</a>`,
      };
    }
    return null;
  };
}

function escapeText(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
