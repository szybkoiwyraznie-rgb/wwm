/**
 * Renderer markdown → HTML (świadomy podzbiór, ADR 0002).
 *
 * Obsługiwane: nagłówki #..####, akapity, **pogrubienie**, *kursywa*,
 * `kod`, [link](url), [[wikilink]] i [[wikilink|etykieta]] (przez resolver),
 * listy -/1., cytaty >, tabele pipe, pozioma linia ---, obrazy ![alt](src),
 * oraz blok `:::zapis ... :::` na dosłowny tekst sceny.
 *
 * Poziom wiarygodności (ADR 0004) zaznacza się na fragmencie, nie na stronie:
 *   {{hipoteza pewnosc=70
 *   ...treść...
 *   }}
 * gdzie nazwa to skrypt | streszczenie | menu | zrodlo | wiedza | hipoteza.
 * Hipoteza wymaga pewności — bez niej build jest czerwony.
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
export const POZIOMY_BLOKU = ['skrypt', 'streszczenie', 'menu', 'zrodlo', 'wiedza', 'hipoteza', 'struktura'];

/** Nazwy wycofane — build podpowiada, na co wymienić, zamiast mówić „nieznany poziom”. */
export const POZIOMY_WYCOFANE = {
  notatka: 'streszczenie',
  tekst: 'skrypt',
  zrodla: 'zrodlo',
  teoria: 'hipoteza',
};

/** Jedyny atrybut bloku poziomu: pewność hipotezy (ADR 0005). */
export const ATRYBUTY_BLOKU = ['pewnosc'];

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
export const BLOK_OTWARCIA_RE = /^\{\{(\w+)((?:\s+[A-Za-z][\w-]*=(?:"[^"]*"|[^\s}]+))*)\s*$/;

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
      problemy.push(`fragment treści bez poziomu wiarygodności — zaznacz blokiem {{${POZIOMY_BLOKU.join('|')}}}`);
    }
    out.push(html);
  };

  while (i < linie.length) {
    const linia = linie[i];

    if (linia.trim() === '') { i += 1; continue; }

    // blok poziomu wiarygodności {{poziom ... }}
    const otwarcie = linia.trim().match(BLOK_OTWARCIA_RE);
    if (otwarcie) {
      const poziom = otwarcie[1];
      const atrybuty = parsujAtrybutyBloku(otwarcie[2]);
      i += 1;
      const buf = [];
      while (i < linie.length && linie[i].trim() !== '}}') { buf.push(linie[i]); i += 1; }
      if (i >= linie.length) problemy.push(`niezamknięty blok {{${poziom}`);
      i += 1; // zamknięcie

      if (POZIOMY_WYCOFANE[poziom]) {
        problemy.push(`poziom {{${poziom}}} jest wycofany — użyj {{${POZIOMY_WYCOFANE[poziom]}}} (ADR 0004)`);
        continue;
      }
      if (!POZIOMY_BLOKU.includes(poziom)) {
        problemy.push(`nieznany poziom w bloku {{${poziom}: dozwolone ${POZIOMY_BLOKU.join(', ')}`);
        continue;
      }
      if (wZagniezdzeniu) {
        problemy.push(`zagnieżdżony blok {{${poziom} — bloki poziomu nie mogą się zagnieżdżać`);
        continue;
      }

      // Pewność (ADR 0005): hipoteza bez szacunku jest decyzją niedokończoną,
      // a cytat z pewnością sugerowałby istnienie wersji „mniej prawdziwej”.
      const pewnoscRaw = atrybuty.get('pewnosc');
      for (const klucz of atrybuty.keys()) {
        if (!ATRYBUTY_BLOKU.includes(klucz)) {
          problemy.push(`nieznany atrybut "${klucz}" w bloku {{${poziom}}} — dozwolone: ${ATRYBUTY_BLOKU.join(', ')}`);
        }
      }
      if (poziom === 'hipoteza' && pewnoscRaw === undefined) {
        problemy.push('blok {{hipoteza}} wymaga atrybutu pewnosc=0–100 (ADR 0005)');
      }
      if (poziom === 'hipoteza' && pewnoscRaw !== undefined && !czyPewnosc(pewnoscRaw)) {
        problemy.push(`pewność "${pewnoscRaw}" nie jest liczbą całkowitą 0–100`);
      }
      if (poziom !== 'hipoteza' && pewnoscRaw !== undefined) {
        problemy.push(`atrybut pewnosc przysługuje tylko {{hipoteza}} — {{${poziom}}} byłby niepewny z definicji`);
      }

      const trescBloku = buf.join('\n');
      const wewn = renderMarkdown(trescBloku, {
        resolveLink, wymagajPoziomu, wPoziomie: poziom, wZagniezdzeniu: true,
        atrybutyNaglowka, zachowajLamania,
      });
      problemy.push(...wewn.problemy);

      const atrybutyDom = [
        `class="fragment poziom poziom-${poziom}"`,
        `data-poziom="${poziom}"`,
        pewnoscRaw !== undefined ? `data-pewnosc="${escapeHtml(String(pewnoscRaw))}"` : '',
      ].filter(Boolean).join(' ');
      out.push(`<div ${atrybutyDom}>\n${wEtykiecie(wewn.html, poziom, pewnoscRaw)}\n</div>`);
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
      const etykieta = etykietaRaw ? etykietaRaw.trim() : slug;
      if (!resolveLink) return escapeHtml(etykieta);
      const cel = resolveLink(slug);
      if (!cel) {
        problemy.push(`martwy wikilink: [[${slug}]]`);
        return `<span class="martwy-link" data-slug="${escapeHtml(slug)}">${escapeHtml(etykieta)}</span>`;
      }
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
const ETYKIETY_POZIOMU = {
  skrypt: 'słowa opowieści',
  streszczenie: 'streszczenie',
  menu: 'interfejs gry',
  zrodlo: 'sprawdzone źródło',
  wiedza: 'wiedza o kulturze',
  hipoteza: 'hipoteza',
  struktura: 'spis powiązań',
};

function wEtykiecie(html, poziom, pewnosc) {
  const plakietka = `<span class="poziom-etykieta">${escapeHtml(ETYKIETY_POZIOMU[poziom] ?? poziom)}</span>${badgePewnosci(pewnosc)}`;
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
