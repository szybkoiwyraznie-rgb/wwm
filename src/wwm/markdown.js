/**
 * Renderer markdown → HTML (świadomy podzbiór, ADR 0002).
 *
 * Obsługiwane: nagłówki #..####, akapity, **pogrubienie**, *kursywa*,
 * `kod`, [link](url), [[wikilink]] i [[wikilink|etykieta]] (przez resolver),
 * listy -/1., cytaty >, tabele pipe, pozioma linia ---, obrazy ![alt](src),
 * oraz blok `:::zapis ... :::` na dosłowny tekst sceny.
 *
 * Dwie osie niezależne (ADR 0015):
 *   POCHODZENIE (kolor) — skąd wiemy: dostawa | opracowanie | kwerenda | model,
 *   RODZAJ (tytuł)     — czym fragment jest: scena | streszczenie | wątek | świat |
 *                        kontekst | interpretacja | spis.
 * Zapis: {{pochodzenie/rodzaj}} — np. {{dostawa/scena}} albo {{model/interpretacja pewnosc=40}}.
 * Pochodzenie decyduje o kolorze i jest jednorodne w całym boksie. Ten sam rodzaj może
 * wystąpić w dwóch boksach o różnym pochodzeniu (dwa boksy „Kontekst kulturowy”: jeden
 * z kwerendą, drugi z wiedzy modelu). Interpretacja wymaga pewności.
 *
 * Zasady bezpieczeństwa: cała treść jest escapowana na wejściu, dopiero
 * potem dodajemy własne tagi. Martwy wikilink NIE jest cichy — renderer
 * zgłasza problem, a build kończy się czerwono.
 */

import { SLUG_RE, WIKILINK_RE } from './links.js';

/**
 * Poziomy wiarygodności w bloku `{{...}}` (ADR 0004).
 * Kolor mówi, CZYM jest fragment; pewność mówi, JAK BARDZO w niego wierzymy.
 *
 * `struktura` to spis powiązań — tabela wątków, obsady, opcji. Nie jest prozą,
 * więc nie udaje streszczenia: czytelnik ma wiedzieć, że patrzy na indeks.
 */
export const POCHODZENIA = ['dostawa', 'opracowanie', 'kwerenda', 'model'];

/**
 * Pochodzenie → kolor. Jedyna oś koloru (ADR 0016): cztery źródła, od słów
 * opowieści po wiedzę modelu. Kolor nigdy nie mówi, o czym fragment jest.
 */
export const OPIS_POCHODZENIA = {
  dostawa: { etykieta: 'z opowieści', opis: 'słowa i obrazy wzięte wprost z historii' },
  opracowanie: { etykieta: 'opracowanie', opis: 'streszczenie i wniosek wyciągnięty wprost z tego, co powiedziano' },
  kwerenda: { etykieta: 'źródła sprawdzone', opis: 'twierdzenie potwierdzone źródłem, z adresem i datą' },
  model: { etykieta: 'wiedza modelu', opis: 'wniosek, hipoteza i tło kulturowe bez potwierdzenia w źródle' },
};

/**
 * Rodzaje treści — używane wewnątrz jednego boksu, żeby rozdzielić warstwy
 * analizy (wnioski wprost, tło historyczne, przypuszczenia o dalszym ciągu).
 * Boks ma własny tytuł; rodzaj jest etykietą warstwy, nie osobnym boksem.
 */
export const RODZAJE_TRESCI = [
  'scena', 'streszczenie', 'wnioski', 'watek', 'swiat', 'kontekst', 'interpretacja', 'spis',
];

/** Interpretacja to fragment wiedzy modelu — poziom źródła jest z góry ustalony. */
export const POCHODZENIE_INTERPRETACJI = 'model';

/** Atrybuty bloku: `pewnosc` (wiedza modelu) i `rodzaj` (warstwa w boksie). */
export const ATRYBUTY_BLOKU = ['pewnosc', 'rodzaj'];

/** Nazwy wycofane — build podpowiada, na co wymienić, zamiast mówić „nieznany poziom”. */
export const POZIOMY_WYCOFANE = {
  // Stare nazwy poziomów (ADR 0004) — każda wskazuje pochodzenie i podpowiada rodzaj.
  skrypt: 'dostawa',
  menu: 'dostawa',
  streszczenie: 'opracowanie',
  zrodlo: 'kwerenda',
  wiedza: 'model',
  hipoteza: 'model',
  struktura: 'opracowanie',
  notatka: 'opracowanie',
  tekst: 'dostawa',
  zrodla: 'kwerenda',
  teoria: 'model',
  // Zapis dwuosiowy z wersji pośredniej (ADR 0015): pochodzenie/rodzaj.
  'dostawa/scena': 'dostawa',
  'dostawa/swiat': 'dostawa',
  'opracowanie/streszczenie': 'opracowanie',
  'opracowanie/spis': 'opracowanie',
  'kwerenda/kontekst': 'kwerenda',
  'model/kontekst': 'model',
  'opracowanie/interpretacja': 'model',
  'model/interpretacja': 'model',
};

/** Rodzaj sugerowany przy migracji ze starej nazwy — podpowiedź, nie wymóg. */
export const RODZAJ_STAREJ_NAZWY = {
  skrypt: 'scena', menu: 'swiat', streszczenie: 'streszczenie', zrodlo: 'kontekst',
  wiedza: 'kontekst', hipoteza: 'interpretacja', struktura: 'spis', notatka: 'streszczenie',
  tekst: 'scena', zrodla: 'kontekst', teoria: 'interpretacja',
};

/** Progi etykiet pewności (ADR 0005). */
export const PROGI_PEWNOSCI = [
  { od: 80, id: 'wysoka', etykieta: 'wysoka' },
  { od: 50, id: 'srednia', etykieta: 'średnia' },
  { od: 0, id: 'niska', etykieta: 'niska' },
];

/** Klasa i etykieta progu dla wartości 0–100. */
export function poziomPewnosci(wartosc) {
  const n = Number(wartosc);
  return PROGI_PEWNOSCI.find((p) => n >= p.od) ?? PROGI_PEWNOSCI.at(-1);
}

/** Czy wartość jest poprawną pewnością (liczba całkowita 0–100). */
export function czyPewnosc(wartosc) {
  const n = Number(wartosc);
  return Number.isInteger(n) && n >= 0 && n <= 100;
}

/**
 * Plakietka pewności — wspólna dla bloków treści i historii interpretacji.
 * `null`/pusta wartość daje pusty string, więc wołający nie musi sprawdzać.
 */
export function badgePewnosci(wartosc) {
  if (wartosc === null || wartosc === undefined || wartosc === '') return '';
  if (!czyPewnosc(wartosc)) return '';
  const n = Number(wartosc);
  const prog = poziomPewnosci(n);
  return `<span class="pewnosc pewnosc-${prog.id}" data-pewnosc="${n}" title="Szacowana pewność: ${n}% (${prog.etykieta})">pewność ${n}%</span>`;
}

/**
 * Otwarcie bloku poziomu: `{{poziom}}` albo z atrybutem `pewnosc=…`,
 * np. `{{hipoteza pewnosc=85`.
 */
export const BLOK_OTWARCIA_RE = /^\{\{([A-Za-z]+)((?:\s+[A-Za-z][\w-]*=(?:"[^"]*"|[^\s}]+))*)\s*$/;

/** Zamienia ciąg atrybutów (` pewnosc=85`) na mapę nazwa → wartość. */
export function parsujAtrybutyBloku(tekst) {
  const atrybuty = new Map();
  for (const m of String(tekst ?? '').matchAll(/([A-Za-z][\w-]*)=(?:"([^"]*)"|([^\s}]+))/g)) {
    atrybuty.set(m[1], m[2] ?? m[3]);
  }
  return atrybuty;
}

/**
 * Sekcje `##` wewnątrz treści bloku — każda dostaje własną kotwicę, żeby chip
 * hipotezy potrafił wskazać konkretny boks, a nie szczyt strony.
 */
export function sekcjeBloku(tresc) {
  return [...String(tresc ?? '').matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
}

export function renderMarkdown(md, {
  resolveLink, wymagajPoziomu = false, wPoziomie = null, wZagniezdzeniu = false,
  atrybutyNaglowka = null, zachowajLamania = false, kotwicaKolejna = null,
} = {}) {
  const linie = String(md).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const problemy = [];
  let i = 0;

  // każdy fragment poza blokiem poziomu jest błędem, gdy wymagajPoziomu
  const dodaj = (html) => {
    if (wymagajPoziomu && wPoziomie === null) {
      problemy.push(`fragment treści bez pochodzenia — zaznacz blokiem {{${POCHODZENIA.join('|')}}}`);
    }
    out.push(html);
  };

  while (i < linie.length) {
    const linia = linie[i];

    if (linia.trim() === '') { i += 1; continue; }

    // blok pochodzenia {{pochodzenie ...}} — kolor fragmentu w środku boksu
    const otwarcie = linia.trim().match(BLOK_OTWARCIA_RE);
    if (otwarcie) {
      const pochodzenie = otwarcie[1];
      const atrybuty = parsujAtrybutyBloku(otwarcie[2]);
      // Rodzaj jest opcjonalny. Wiedza modelu z podaną pewnością jest hipotezą,
      // bez pewności — tłem kulturowym. Sam kolor tego nie rozstrzyga, więc
      // rozstrzyga atrybut: pewnosc= znaczy „to jest przypuszczenie”.
      const rodzajRaw = atrybuty.get('rodzaj');
      const rodzaj = rodzajRaw ?? (pochodzenie === POCHODZENIE_INTERPRETACJI && atrybuty.has('pewnosc')
        ? 'interpretacja' : null);
      i += 1;
      const buf = [];
      while (i < linie.length && linie[i].trim() !== '}}') { buf.push(linie[i]); i += 1; }
      if (i >= linie.length) problemy.push(`niezamknięty blok {{${pochodzenie}${rodzaj ? `/${rodzaj}` : ''}`);
      i += 1; // zamknięcie

      const staryZapis = POZIOMY_WYCOFANE[pochodzenie];
      if (staryZapis) {
        const podpowiedzRodzaju = RODZAJ_STAREJ_NAZWY[pochodzenie];
        problemy.push(`zapis {{${pochodzenie}}} jest wycofany — użyj {{${staryZapis}}}`
          + (podpowiedzRodzaju ? ` (rodzaj dawnej nazwy: ${podpowiedzRodzaju})` : ''));
        continue;
      }
      if (!POCHODZENIA.includes(pochodzenie)) {
        problemy.push(`nieznane pochodzenie w bloku {{${pochodzenie}}: dozwolone ${POCHODZENIA.join(', ')}`);
        continue;
      }
      if (rodzajRaw !== undefined && !RODZAJE_TRESCI.includes(rodzajRaw)) {
        problemy.push(`nieznany rodzaj treści "${rodzajRaw}": dozwolone ${RODZAJE_TRESCI.join(', ')}`);
        continue;
      }
      if (wZagniezdzeniu) {
        problemy.push(`zagnieżdżony blok {{${pochodzenie}}} — kolorów nie zagnieżdżamy`);
        continue;
      }
      // Hipoteza to zawsze wiedza modelu: interpretacja nie może udawać cytatu ani kwerendy.
      if (rodzaj === 'interpretacja' && pochodzenie !== POCHODZENIE_INTERPRETACJI) {
        problemy.push(`interpretacja jest wiedzą modelu — pisz {{model pewnosc=…}}, nie {{${pochodzenie}}}`);
        continue;
      }

      // Pewność (ADR 0005): interpretacja bez szacunku jest decyzją niedokończoną,
      // a cytat z pewnością sugerowałby istnienie wersji „mniej prawdziwej”.
      const pewnoscRaw = atrybuty.get('pewnosc');
      for (const klucz of atrybuty.keys()) {
        if (!ATRYBUTY_BLOKU.includes(klucz)) {
          problemy.push(`nieznany atrybut "${klucz}" w bloku {{${pochodzenie}}} — dozwolone: ${ATRYBUTY_BLOKU.join(', ')}`);
        }
      }
      if (atrybuty.has('pewnosc') && pochodzenie !== POCHODZENIE_INTERPRETACJI) {
        problemy.push(`atrybut pewnosc przysługuje tylko wiedzy modelu — {{${pochodzenie}}} jest pewne z definicji`);
      }
      if (atrybuty.has('pewnosc') && !czyPewnosc(pewnoscRaw)) {
        problemy.push(`pewność "${pewnoscRaw}" nie jest liczbą całkowitą 0–100`);
      }
      // Wiedza modelu bez szacunku byłaby twierdzeniem nieodróżnialnym od faktu.
      if (rodzaj === 'interpretacja' && !atrybuty.has('pewnosc')) {
        problemy.push('interpretacja wymaga atrybutu pewnosc=0–100 (ADR 0005)');
      }

      const trescBloku = buf.join('\n');
      const wewn = renderMarkdown(trescBloku, {
        resolveLink, wymagajPoziomu, wPoziomie: pochodzenie, wZagniezdzeniu: true,
        atrybutyNaglowka, zachowajLamania,
      });
      problemy.push(...wewn.problemy);

      const atrybutyDom = [
        `class="fragment poziom poziom-${pochodzenie}${rodzaj ? ` rodzaj-${rodzaj}` : ''}"`,
        `data-poziom="${pochodzenie}"`,
        rodzaj ? `data-rodzaj="${rodzaj}"` : '',
        pewnoscRaw !== undefined ? `data-pewnosc="${escapeHtml(String(pewnoscRaw))}"` : '',
      ].filter(Boolean).join(' ');
      out.push(`<div ${atrybutyDom}>\n${wEtykiecie(wewn.html, pochodzenie, rodzaj, pewnoscRaw)}\n</div>`);
      continue;
    }

    // blok surowy :::zapis ... :::  (dosłowny tekst nagrania)
    if (/^:::/.test(linia.trim())) {
      const buf = [];
      i += 1;
      while (i < linie.length && !/^:::/.test(linie[i].trim())) { buf.push(linie[i]); i += 1; }
      i += 1; // zamknięcie
      const wewn = renderMarkdown(buf.join('\n'), {
        resolveLink, wymagajPoziomu, wPoziomie, wZagniezdzeniu: true, atrybutyNaglowka,
        zachowajLamania: true,
      });
      problemy.push(...wewn.problemy);
      dodaj(`<div class="zapis-tekst">\n${wewn.html}\n</div>`);
      continue;
    }

    // pozioma linia
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(linia.trim())) { out.push('<hr>'); i += 1; continue; }

    // nagłówek
    const h = linia.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const poz = h[1].length;
      const wewn = inline(h[2]);
      const opis = atrybutyNaglowka?.(poz, h[2].trim(), wewn) ?? null;
      const atrybut = opis?.id ? ` id="${escapeHtml(opis.id)}"` : '';
      out.push(`<h${poz}${atrybut}>${opis?.wewnetrzny ?? wewn}</h${poz}>`);
      i += 1; continue;
    }

    // cytat blokowy
    if (/^>\s?/.test(linia)) {
      const buf = [];
      while (i < linie.length && /^>\s?/.test(linie[i])) {
        buf.push(linie[i].replace(/^>\s?/, ''));
        i += 1;
      }
      const tresc = zachowajLamania
        ? buf.map((l) => inline(l)).join('\n')
        : inline(buf.join(' '));
      dodaj(`<blockquote><p>${tresc}</p></blockquote>`);
      continue;
    }

    // tabela pipe
    if (bezPip(linia.trim()).startsWith('|') && bezPip(linie[i + 1] ?? '').match(/^\s*\|[\s:|-]+\|\s*$/)) {
      const naglowki = podzielKomorki(linia);
      i += 2;
      const wiersze = [];
      while (i < linie.length && bezPip(linie[i].trim()).startsWith('|')) {
        wiersze.push(podzielKomorki(linie[i]));
        i += 1;
      }
      dodaj(
        '<div class="tabela-owijka"><table><thead><tr>' +
        naglowki.map((c) => `<th>${inline(c)}</th>`).join('') +
        '</tr></thead><tbody>' +
        wiersze.map((w) => '<tr>' + w.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>',
      );
      continue;
    }

    // listy
    if (/^\s*[-*]\s+/.test(linia) || /^\s*\d+\.\s+/.test(linia)) {
      const uporzadkowana = /^\s*\d+\.\s/.test(linia);
      const elementy = [];
      while (i < linie.length) {
        if (linie[i].trim() === '' && elementy.length > 0) {
          const dalej = linie.slice(i + 1).find((l) => l.trim() !== '');
          if (dalej !== undefined && /^\s*(?:[-*]|\d+\.)\s+/.test(dalej)) { i += 1; continue; }
          break;
        }
        if (!(/^\s*[-*]\s+/.test(linie[i]) || /^\s*\d+\.\s+/.test(linie[i]) || (elementy.length > 0 && sLinia(linie[i])))) break;
        if (elementy.length > 0 && !/^\s*(?:[-*]|\d+\.)\s+/.test(linie[i])) {
          elementy[elementy.length - 1] += ' ' + linie[i].trim();
        } else {
          elementy.push(linie[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ''));
        }
        i += 1;
      }
      const tag = uporzadkowana ? 'ol' : 'ul';
      dodaj(`<${tag}>${elementy.map((e) => `<li>${inline(e)}</li>`).join('')}</${tag}>`);
      continue;
    }

    // akapit
    const buf = [linia];
    i += 1;
    while (
      i < linie.length && linie[i].trim() !== '' &&
      !/^(#{1,4}\s|>\s?|\s*[-*]\s|\s*\d+\.\s|-{3,}$|:::)/.test(linie[i]) &&
      !bezPip(linie[i].trim()).startsWith('|')
    ) {
      buf.push(linie[i]);
      i += 1;
    }
    const tresc = zachowajLamania
      ? buf.map((l) => inline(l)).join('\n')
      : inline(buf.join(' '));
    dodaj(`<p>${tresc}</p>`);
  }

  return { html: out.join('\n'), problemy };

  function inline(tekst) {
    let t = escapeHtml(tekst);

    // wikilinki PRZED linkami markdown
    t = t.replace(WIKILINK_RE, (cały, slugRaw, etykietaRaw) => {
      const slug = slugRaw.trim();
      if (!resolveLink) return escapeHtml(etykietaRaw ? etykietaRaw.trim() : slug);
      const cel = resolveLink(slug);
      if (!cel) {
        problemy.push(`martwy wikilink: [[${slug}]]`);
        return `<span class="martwy-link" data-slug="${escapeHtml(slug)}">${escapeHtml(etykietaRaw ?? slug)}</span>`;
      }
      // Bez etykiety pokazujemy tytuł strony, nie slug: `[[watek-pochodzenia]]`
      // ma się czytać jako „Pochodzenie wędrowca”, bo slug jest adresem, nie nazwą.
      const etykieta = etykietaRaw ? etykietaRaw.trim() : cel.tytul;
      return `<a href="${cel.href}" title="${escapeHtml(cel.tytul)}">${escapeHtml(etykieta)}</a>`;
    });

    // obrazy ![alt](src)
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (cały, alt, src) =>
      `<button type="button" class="ilustracja-otworz" data-pelny-ekran>` +
      `<img src="${src}" alt="${alt}" loading="lazy" decoding="async"></button>`);

    // linki [tekst](url) — tylko http(s) i # (blokujemy javascript: itp.)
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (cały, tekst, url) => {
      if (!/^(https?:\/\/|[#/])/.test(url)) return tekst;
      const zewnetrzny = url.startsWith('http');
      const atrybuty = zewnetrzny ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${url}"${atrybuty}>${tekst}</a>`;
    });

    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    return t;
  }
}

/**
 * Etykieta poziomu wchodzi w wiersz tytułu sekcji razem z plakietką pewności.
 * Fragment bez nagłówka (sam akapit, tabela) zachowuje etykietę nad treścią —
 * nie ma z czym jej zestawić.
 */
const ETYKIETY_POCHODZENIA = {
  dostawa: 'z opowieści',
  opracowanie: 'opracowanie',
  kwerenda: 'źródła sprawdzone',
  model: 'wiedza modelu',
};

function wEtykiecie(html, pochodzenie, rodzaj, pewnosc) {
  // Tytuł boksu jest jeden. Plakietka mówi wyłącznie, skąd wiemy — rodzaj treści
  // powtarzał tytuł („Wątki w scenie” + „spis powiązań”) i dublował nagłówek.
  const plakietka = `<span class="pochodzenie-etykieta pochodzenie-${escapeHtml(pochodzenie)}">${escapeHtml(ETYKIETY_POCHODZENIA[pochodzenie] ?? pochodzenie)}</span>`
    + badgePewnosci(pewnosc);
  const naglowek = html.match(/^<h([2-4])(?:\s[^>]*)?>[\s\S]*?<\/h\1>/);
  if (!naglowek) return `<p class="poziom-nad-trescia">${plakietka}</p>\n${html}`;
  const reszta = html.slice(naglowek[0].length).replace(/^\n/, '');
  return `<div class="naglowek-fragmentu">${naglowek[0]}<span class="poziom-plakietki">${plakietka}</span></div>${reszta ? `\n${reszta}` : ''}`;
}

/** Linia, która może być kontynuacją poprzedniego elementu listy (nie blok). */
const sLinia = (l) =>
  String(l).trim() !== '' &&
  !/^(#{1,4}\s|>\s?|:::|-{3,}$|\*{3,}$|_{3,}$)/.test(l.trim()) &&
  !bezPip(l.trim()).startsWith('|');

/** Placeholder dla escapowanego pionka w tabelach. */
const PIPE_PLACEHOLDER = '\u0001';
const bezPip = (s) => String(s).replace(/\\\|/g, PIPE_PLACEHOLDER);
const przywrocPip = (s) => String(s).replaceAll(PIPE_PLACEHOLDER, '|');

/**
 * Dzieli wiersz tabeli na komórki. Pionek wewnątrz `[[slug|etykieta]]`
 * jest częścią odsyłacza, nie separatorem kolumn.
 */
function podzielKomorki(wiersz) {
  const t = bezPip(String(wiersz).trim()).replace(/^\|/, '').replace(/\|$/, '');
  const komorki = [];
  let biezaca = '';
  let wLinku = false;
  for (let j = 0; j < t.length; j += 1) {
    const ch = t[j];
    if (!wLinku && ch === '[' && t[j + 1] === '[') { wLinku = true; biezaca += '[['; j += 1; continue; }
    if (wLinku && ch === ']' && t[j + 1] === ']') { wLinku = false; biezaca += ']]'; j += 1; continue; }
    if (ch === '|' && !wLinku) { komorki.push(przywrocPip(biezaca.trim())); biezaca = ''; continue; }
    biezaca += ch;
  }
  komorki.push(przywrocPip(biezaca.trim()));
  return komorki;
}

export function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
