/**
 * Wyszukiwanie po stronie przeglądarki (ADR 0001) — bez serwera i bez indeksu
 * zewnętrznego. Szuka w tytułach, streszczeniach i tekście stron.
 *
 * Ranking jest prosty i przewidywalny: trafienie w tytule waży więcej niż
 * w streszczeniu, a to więcej niż w treści. Czytelnik ma dostać stronę,
 * o którą mu chodzi, na górze — nie „najbardziej dopasowaną” zagadkę.
 */

import { escapeHtml } from './markdown.js';
import { hrefDlaSlug } from './links.js';
import { dajDane } from './data.js';
import { naglowekStrony, stanPusty, okruszki, odmiana, nazwaTypu } from './render.js';

const LIMIT = 60;

function normalizuj(s) {
  return String(s ?? '').toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l');
}

/** Fragment tekstu wokół trafienia — kontekst ważniejszy niż sama obecność. */
function wyimek(tekst, fraza, dlugosc = 180) {
  const zrodlo = String(tekst ?? '');
  const idx = normalizuj(zrodlo).indexOf(fraza);
  if (idx < 0) return zrodlo.slice(0, dlugosc) + (zrodlo.length > dlugosc ? '…' : '');
  const start = Math.max(0, idx - Math.floor(dlugosc / 3));
  const fragment = zrodlo.slice(start, start + dlugosc);
  return `${start > 0 ? '…' : ''}${fragment}${start + dlugosc < zrodlo.length ? '…' : ''}`;
}

export function renderSzukanie(q) {
  const zapytanie = String(q ?? '').trim();
  const naglowek = naglowekStrony({
    tytul: 'Szukaj',
    opis: 'Szuka w tytułach, streszczeniach, opisach i słowach scen.',
    sciezka: okruszki([{ etykieta: 'Szukaj' }]),
  });

  if (zapytanie === '') {
    return `${naglowek}${stanPusty('Wpisz frazę w polu u góry.', 'Szukaj imienia, miejsca albo słowa, które padło w dialogu.')}`;
  }

  const fraza = normalizuj(zapytanie);
  const dane = dajDane();
  const wyniki = [];

  for (const s of Object.values(dane.strony)) {
    const tytul = normalizuj(s.tytul);
    const tytulJa = normalizuj(s.tytul_ja ?? '');
    const tytulEn = normalizuj(s.tytul_en ?? '');
    const streszczenie = normalizuj(s.streszczenie ?? '');
    const tekst = normalizuj(s.tekst ?? '');

    let punkty = 0;
    if (tytul.includes(fraza)) punkty += 100;
    if (tytul.startsWith(fraza)) punkty += 50;
    if (tytulJa.includes(fraza) || tytulEn.includes(fraza)) punkty += 60;
    if (streszczenie.includes(fraza)) punkty += 30;
    if (tekst.includes(fraza)) punkty += 10;
    if (punkty === 0) continue;

    const zrodloWyimku = streszczenie.includes(fraza) ? s.streszczenie : (s.tekst ?? '');
    wyniki.push({ strona: s, punkty, wyimek: wyimek(zrodloWyimku, fraza) });
  }

  wyniki.sort((a, b) => b.punkty - a.punkty
    || String(a.strona.tytul).localeCompare(String(b.strona.tytul), 'pl'));

  if (wyniki.length === 0) {
    return `${naglowek}${stanPusty(`Nic nie znaleziono dla „${zapytanie}”.`, 'Spróbuj krótszej frazy albo nazwy własnej w oryginalnym zapisie.')}`;
  }

  const widoczne = wyniki.slice(0, LIMIT);
  const meta = `${wyniki.length} ${odmiana(wyniki.length, ['wynik', 'wyniki', 'wyników'])}${wyniki.length > LIMIT ? ` · pokazano ${LIMIT}` : ''}`;

  return `${naglowek}
<p class="meta">${meta} dla „${escapeHtml(zapytanie)}”</p>
<ul class="lista-wynikow">
  ${widoczne.map(({ strona, wyimek: w }) => `<li class="wynik">
    <a class="wynik-tytul" href="${hrefDlaSlug(strona.slug, strona.typ)}">${escapeHtml(strona.tytul)}</a>
    <span class="meta">${escapeHtml(nazwaTypu(strona.typ))}</span>
    <p class="wynik-wyimek">${escapeHtml(w)}</p>
  </li>`).join('')}
</ul>`;
}

/**
 * Uchwyt formularza w nagłówku. Globalna funkcja, bo formularz żyje w ramie
 * strony, poza modułami renderującymi treść.
 */
globalThis.szukajZeStrony = function (form) {
  const q = form?.querySelector?.('input[name="q"]')?.value ?? '';
  globalThis.location.hash = `#/szukaj?q=${encodeURIComponent(q)}`;
  return false;
};
