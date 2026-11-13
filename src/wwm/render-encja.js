/**
 * Strona encji: postać, sekta, kraina, miejsce, hasło, kontekst kulturowy, wątek, relacja.
 *
 * Jedna strona = jedno pojęcie. Pod treścią stoi boks „Powiązania” budowany
 * z obu stron grafu (pole-relacje + wikilinki + backlinki), więc odsyłacz
 * w jedną stronę wystarcza, by obie o sobie wiedziały (ADR 0009).
 */

import { escapeHtml, badgePewnosci } from './markdown.js';
import { hrefDlaSlug, hrefFiltru } from './links.js';
import { dajDane, dajStrone, listaStron } from './data.js';
import { naglowekStrony, stanPusty, okruszki, odmiana, kolumnaBoczna, ukladDwuKolumn, nazwaRodzaju } from './render.js';
import { podzielNaBoksy } from './scena-sekcje.js';

const ETYKIETY_POL = {
  rola: 'Rola',
  przydzial: 'Przynależność',
  rodzaj: 'Rodzaj',
  region: 'Region',
  rodzaj_watku: 'Rodzaj wątku',
  stan: 'Stan',
  rodzaj_relacji: 'Rodzaj relacji',
  autor: 'Autor',
  rok: 'Rok',
  dzielo: 'Dzieło',
  pseudonim: 'Pseudonim',
};

const LISTA = 'content-encje';
const LIMIT_POWIAZAN = 50;

/**
 * Boks = tytuł strony (`##`) i wszystkie warstwy pod nim: wniosek z opowieści,
 * tło z kwerendy, przypuszczenie modelu. Kolor należy do warstwy w środku, nie
 * do boksu (ADR 0016) — dzięki temu „Analiza” jest jedną sekcją, a nie trzema
 * sekcjami o niemal tym samym tytule.
 */
function boksyEncji(strona) {
  // „Streszczenie” jest leadem pod tytułem — jako boks byłoby tym samym drugi raz.
  const boksy = (strona.boksy ?? []).filter((b) => !/^streszczenie$/i.test(String(b.tytul ?? '').trim()));
  if (boksy.length === 0) return '<p class="pusto">Ta strona nie ma jeszcze opisu.</p>';
  const rodzialy = boksy.map((b) => `<section class="boks${(b.warstwy ?? 1) > 1 ? ' boks-z-warstwami' : ''}">
    ${b.tytul ? `<h2>${escapeHtml(b.tytul)}</h2>` : ''}
    ${b.html}
  </section>`);
  return rodzialy.join('\n');
}

function metryka(strona) {
  const dane = dajDane();
  const pary = [];
  for (const [pole, etykieta] of Object.entries(ETYKIETY_POL)) {
    const wartosc = strona[pole];
    if (wartosc === undefined || wartosc === null || wartosc === '') continue;
    // Rodzaje przechodzą przez słownik: „Rodzaj wątku: glowny” to wartość z pliku.
    const pokaz = /^rodzaj/.test(pole) || pole === 'stan'
      ? (Array.isArray(wartosc) ? wartosc.map(nazwaRodzaju).join(', ') : nazwaRodzaju(wartosc))
      : (Array.isArray(wartosc) ? wartosc.join(', ') : String(wartosc));
    pary.push([etykieta, pokaz]);
  }
  if (strona.kraina) {
    const k = dane.strony[strona.kraina];
    if (k) pary.push(['Kraina', `<a href="${hrefDlaSlug(k.slug, 'kraina')}">${escapeHtml(k.tytul)}</a>`]);
  }
  if (strona.sekta) {
    const s = dane.strony[strona.sekta];
    if (s) pary.push(['Sekta', `<a href="${hrefDlaSlug(s.slug, 'sekta')}">${escapeHtml(s.tytul)}</a>`]);
  }
  if (strona.siedziba) {
    const s = dane.strony[strona.siedziba];
    if (s) pary.push(['Siedziba', `<a href="${hrefDlaSlug(s.slug, 'miejsce')}">${escapeHtml(s.tytul)}</a>`]);
  }
  if (strona.rozdzial && strona.typ !== 'rozdzial') {
    const r = dane.strony[strona.rozdzial];
    if (r) pary.push(['Rozdział', `<a href="${hrefDlaSlug(r.slug, 'rozdzial')}">${escapeHtml(r.tytul)}</a>`]);
  }
  // „Rodzaj: termin” nic nie mówi czytelnikowi — to etykieta magazynu, nie świat.
  // Zostają tylko rodzaje, które coś znaczą na stronie (wątek, relacja, rola).
  for (let i = pary.length - 1; i >= 0; i -= 1) {
    // „termin” to etykieta magazynu, „Stan” — notatka redakcyjna. Czytelnika
    // interesuje, co się dzieje w opowieści, nie czy wątek jest oznaczony jako otwarty.
    if (pary[i][1] === 'termin' || pary[i][0] === 'Stan') pary.splice(i, 1);
  }
  if (!pary.length) return '';
  return `<dl class="metryka">${pary
    .map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${v}</dd></div>`)
    .join('')}</dl>`;
}

function powiazania(strona) {
  const dane = dajDane();
  const grupy = new Map();

  const dodaj = (slug) => {
    if (!slug || slug === strona.slug) return;
    const cel = dane.strony[slug];
    if (!cel) return;
    if (!grupy.has(cel.typ)) grupy.set(cel.typ, new Set());
    grupy.get(cel.typ).add(slug);
  };

  for (const slug of strona.linki ?? []) dodaj(slug);
  for (const b of dane.backlinki?.[strona.slug] ?? []) dodaj(b.slug);

  // Relacja pokazuje obie strony, także gdy pole wypełniono tylko po jednej.
  for (const [slug, cel] of Object.entries(dane.strony)) {
    const pola = ['postacie', 'krainy', 'sekty', 'miejsca', 'watki', 'konteksty', 'relacje', 'sceny', 'epizody'];
    for (const pole of pola) {
      const wartosc = cel[pole];
      if (Array.isArray(wartosc) && wartosc.includes(strona.slug)) dodaj(slug);
      if (typeof wartosc === 'string' && wartosc === strona.slug) dodaj(slug);
    }
  }

  if (grupy.size === 0) return '';

  const KOLEDY = ['rozdzial', 'epizod', 'scena', 'watek', 'postac', 'sekta', 'kraina', 'miejsce', 'kontekst', 'pojecie', 'relacja'];
  const NAZWY = {
    rozdzial: 'Rozdziały', epizod: 'Epizody', scena: 'Sceny', watek: 'Wątki',
    postac: 'Postacie', sekta: 'Sekty', kraina: 'Krainy', miejsce: 'Miejsca',
    kontekst: 'Konteksty', pojecie: 'Hasła', relacja: 'Relacje',
  };

  const bloki = [...grupy.entries()]
    .sort((a, b) => KOLEDY.indexOf(a[0]) - KOLEDY.indexOf(b[0]))
    .map(([typ, mapa]) => {
      const pozycje = [...mapa].map((slug) => [slug]);
      const widoczne = pozycje.slice(0, LIMIT_POWIAZAN);
      const reszta = pozycje.slice(LIMIT_POWIAZAN);
      // Sama nazwa. Dopisek „— odsyła tutaj” nic nie wnosił: każde powiązanie
      // jest dwustronne z natury, więc etykieta stała przy większości linków.
      const link = ([slug]) => {
        const cel = dane.strony[slug];
        const tytul = cel?.tytul ?? slug;
        return `<li><a href="${hrefDlaSlug(slug, typ)}">${escapeHtml(tytul)}</a></li>`;
      };
      const ukryte = reszta.length > 0
        ? `<details class="zwijane"><summary>Pokaż pozostałe (${reszta.length})</summary><ul>${reszta.map(link).join('')}</ul></details>`
        : '';
      return `<details class="powiazania-grupa" open>
        <summary>${NAZWY[typ] ?? typ} <span class="meta">${pozycje.length}</span></summary>
        <ul>${widoczne.map(link).join('')}</ul>
        ${ukryte}
      </details>`;
    }).join('');

  return bloki;
}

function wystapienia(strona) {
  if (strona.typ !== 'postac' && strona.typ !== 'miejsce' && strona.typ !== 'pojecie' && strona.typ !== 'kontekst') return '';
  const dane = dajDane();
  const sceny = listaStron('scena').filter((s) => (s.postacie ?? []).includes(strona.slug)
    || (s.miejsca ?? []).includes(strona.slug)
    || (s.krainy ?? []).includes(strona.slug)
    || (s.sekty ?? []).includes(strona.slug)
    || (s.konteksty ?? []).includes(strona.slug));
  if (sceny.length === 0) return '';
  const posortowane = sceny.sort((a, b) => (a.kolejnosc ?? 0) - (b.kolejnosc ?? 0));
  return `<ol class="lista-wystapien">
      ${posortowane.map((s) => `<li><a href="${hrefDlaSlug(s.slug, 'scena')}">${escapeHtml(s.tytul)}</a>
        <span class="meta">${s.numer_sceny ? escapeHtml(String(s.numer_sceny)) : ''}</span></li>`).join('')}
    </ol>`;
}

/** Skrót listy interpretacji do kolumny bocznej — pełny spis stoi w treści. */
function skrotWystapien(strona) {
  const html = wystapienia(strona);
  return html;
}

function skrotPowiazan(strona) {
  return powiazania(strona);
}

export function renderEncja(slug) {
  const strona = dajStrone(slug);
  if (!strona || ['scena', 'epizod', 'rozdzial'].includes(strona.typ)) {
    return stanPusty('Nie ma takiej strony.', '<a href="#/">Strona główna</a>');
  }

  const sciezka = okruszki([{ etykieta: strona.tytul }]);

  const naglowek = naglowekStrony({
    tytul: strona.tytul,
    opis: strona.streszczenie ? escapeHtml(strona.streszczenie) : '',
    meta: [
      strona.tytul_ja ? escapeHtml(strona.tytul_ja) : '',
      strona.tytul_en ? escapeHtml(strona.tytul_en) : '',
    ].filter(Boolean).join(' · '),
    sciezka,
  });

  // Interpretacje NIE trafiają do kolumny bocznej: fragment stoi w treści, z tą
  // samą pewnością i własnym nagłówkiem. Chip obok był dublem (ADR 0018).

  // Kontekst z prawej: powiązania i występowanie w opowieści.
  // Wcześniej wszystko szło jedną kolumną, więc powiązania zjadały pół strony
  // i spychały treść poza pierwszy ekran (wzorzec: SRW — 3:1).
  const boczna = kolumnaBoczna([
    { tytul: 'W opowieści', html: skrotWystapien(strona) },
    { tytul: 'Powiązania', html: skrotPowiazan(strona) },
  ], 'Kontekst strony');

  return `${naglowek}
${metryka(strona)}
${ukladDwuKolumn(boksyEncji(strona), boczna)}`;
}
