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
import { naglowekStrony, stanPusty, okruszki, odmiana, kolumnaBoczna, ukladDwuKolumn } from './render.js';
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
  const boksy = strona.boksy ?? [];
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
    pary.push([etykieta, Array.isArray(wartosc) ? wartosc.join(', ') : String(wartosc)]);
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
    if (pary[i][1] === 'termin') pary.splice(i, 1);
  }
  if (!pary.length) return '';
  return `<dl class="metryka">${pary
    .map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${v}</dd></div>`)
    .join('')}</dl>`;
}

function powiazania(strona) {
  const dane = dajDane();
  const grupy = new Map();

  const dodaj = (slug, powod) => {
    if (!slug || slug === strona.slug) return;
    const cel = dane.strony[slug];
    if (!cel) return;
    if (!grupy.has(cel.typ)) grupy.set(cel.typ, new Map());
    const grupa = grupy.get(cel.typ);
    if (!grupa.has(slug)) grupa.set(slug, new Set());
    grupa.get(slug).add(powod);
  };

  for (const slug of strona.linki ?? []) dodaj(slug, 'w treści');
  for (const b of dane.backlinki?.[strona.slug] ?? []) dodaj(b.slug, 'odsyła tutaj');

  // Relacja pokazuje obie strony, także gdy pole wypełniono tylko po jednej.
  for (const [slug, cel] of Object.entries(dane.strony)) {
    const pola = ['postacie', 'krainy', 'sekty', 'miejsca', 'watki', 'konteksty', 'relacje', 'sceny', 'epizody'];
    for (const pole of pola) {
      const wartosc = cel[pole];
      if (Array.isArray(wartosc) && wartosc.includes(strona.slug)) dodaj(slug, 'powiązanie zwrotne');
      if (typeof wartosc === 'string' && wartosc === strona.slug) dodaj(slug, 'powiązanie zwrotne');
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
      const pozycje = [...mapa.entries()];
      const widoczne = pozycje.slice(0, LIMIT_POWIAZAN);
      const reszta = pozycje.slice(LIMIT_POWIAZAN);
      const link = ([slug, powody]) => {
        const cel = dane.strony[slug];
        const tytul = cel?.tytul ?? slug;
        return `<li><a href="${hrefDlaSlug(slug, typ)}">${escapeHtml(tytul)}</a>${
          [...powody].includes('powiązanie zwrotne') && !(strona.linki ?? []).includes(slug)
            ? '<span class="meta"> — odsyła tutaj</span>' : ''}</li>`;
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
function skrotHipotez(hipotezy) {
  if (!hipotezy || hipotezy.length === 0) return '';
  return `<ul class="chipy">
    ${hipotezy.map((h) => `<li><a class="chip chip-hipoteza" href="#${escapeHtml(h.kotwica)}">${escapeHtml(h.sekcja)} ${badgePewnosci(h.pewnosc)}</a></li>`).join('')}
  </ul>`;
}

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

  const hipotezy = Array.isArray(strona.hipotezy) ? strona.hipotezy : [];

  // Kontekst z prawej: powiązania, występowanie w opowieści i spis interpretacji.
  // Wcześniej wszystko szło jedną kolumną, więc powiązania zjadały pół strony
  // i spychały treść poza pierwszy ekran (wzorzec: SRW — 3:1).
  const boczna = kolumnaBoczna([
    { tytul: 'Interpretacje', html: skrotHipotez(hipotezy) },
    { tytul: 'W opowieści', html: skrotWystapien(strona) },
    { tytul: 'Powiązania', html: skrotPowiazan(strona) },
  ], 'Kontekst strony');

  return `${naglowek}
${metryka(strona)}
${ukladDwuKolumn(boksyEncji(strona), boczna)}`;
}
