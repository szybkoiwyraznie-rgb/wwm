/**
 * Strona encji: postać, miejsce, hasło, kontekst kulturowy, wątek, relacja.
 *
 * Jedna strona = jedno pojęcie. Pod treścią stoi boks „Powiązania” budowany
 * z obu stron grafu (pole-relacje + wikilinki + backlinki), więc odsyłacz
 * w jedną stronę wystarcza, by obie o sobie wiedziały (ADR 0009).
 */

import { escapeHtml, badgePewnosci } from './markdown.js';
import { hrefDlaSlug, hrefFiltru } from './links.js';
import { dajDane, dajStrone, listaStron } from './data.js';
import { naglowekStrony, stanPusty, okruszki, odmiana } from './render.js';
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
  pseudonim: 'Pseudonim w grze',
};

const LISTA = 'content-encje';
const LIMIT_POWIAZAN = 50;

function boksyEncji(strona) {
  const boksy = strona.boksy ?? [];
  if (boksy.length === 0) return '<p class="pusto">Wpis nie ma jeszcze treści.</p>';
  return boksy.map((b) => `<section class="boks">
    ${b.tytul ? `<h2>${escapeHtml(b.tytul)}</h2>` : ''}
    ${b.html}
  </section>`).join('\n');
}

function metryka(strona) {
  const dane = dajDane();
  const pary = [];
  for (const [pole, etykieta] of Object.entries(ETYKIETY_POL)) {
    const wartosc = strona[pole];
    if (wartosc === undefined || wartosc === null || wartosc === '') continue;
    pary.push([etykieta, Array.isArray(wartosc) ? wartosc.join(', ') : String(wartosc)]);
  }
  if (strona.rozdzial && strona.typ !== 'rozdzial') {
    const r = dane.strony[strona.rozdzial];
    if (r) pary.push(['Rozdział', `<a href="${hrefDlaSlug(r.slug, 'rozdzial')}">${escapeHtml(r.tytul)}</a>`]);
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
    const pola = ['postacie', 'miejsca', 'watki', 'konteksty', 'relacje', 'sceny', 'zadania'];
    for (const pole of pola) {
      const wartosc = cel[pole];
      if (Array.isArray(wartosc) && wartosc.includes(strona.slug)) dodaj(slug, 'powiązanie zwrotne');
      if (typeof wartosc === 'string' && wartosc === strona.slug) dodaj(slug, 'powiązanie zwrotne');
    }
  }

  if (grupy.size === 0) return '';

  const KOLEDY = ['rozdzial', 'zadanie', 'scena', 'postac', 'miejsce', 'pojecie', 'kontekst', 'watek', 'relacja'];
  const NAZWY = {
    rozdzial: 'Rozdziały', zadanie: 'Zadania', scena: 'Sceny', postac: 'Postacie',
    miejsce: 'Miejsca', pojecie: 'Hasła', kontekst: 'Konteksty', watek: 'Wątki', relacja: 'Relacje',
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
      return `<div class="powiazania-grupa">
        <h3>${NAZWY[typ] ?? typ} <span class="meta">${pozycje.length}</span></h3>
        <ul>${widoczne.map(link).join('')}</ul>
        ${ukryte}
      </div>`;
    }).join('');

  return `<section class="boks boks-powiazania">
    <h2>Powiązania</h2>
    ${bloki}
  </section>`;
}

function wystapienia(strona) {
  if (strona.typ !== 'postac' && strona.typ !== 'miejsce' && strona.typ !== 'pojecie' && strona.typ !== 'kontekst') return '';
  const dane = dajDane();
  const sceny = listaStron('scena').filter((s) => (s.postacie ?? []).includes(strona.slug)
    || (s.miejsca ?? []).includes(strona.slug)
    || (s.konteksty ?? []).includes(strona.slug));
  if (sceny.length === 0) return '';
  const posortowane = sceny.sort((a, b) => (a.kolejnosc ?? 0) - (b.kolejnosc ?? 0));
  return `<section class="boks boks-wystapienia">
    <h2>W scenach</h2>
    <ol class="lista-wystapien">
      ${posortowane.map((s) => `<li><a href="${hrefDlaSlug(s.slug, 'scena')}">${escapeHtml(s.tytul)}</a>
        <span class="meta">#${s.kolejnosc}</span></li>`).join('')}
    </ol>
  </section>`;
}

export function renderEncja(slug) {
  const strona = dajStrone(slug);
  if (!strona || ['scena', 'zadanie', 'rozdzial'].includes(strona.typ)) {
    return stanPusty('Nie ma takiej strony.', '<a href="#/">Strona główna</a>');
  }

  const sciezka = okruszki([
    { etykieta: 'Baza', href: '#/' },
    { etykieta: strona.tytul },
  ]);

  const naglowek = naglowekStrony({
    tytul: strona.tytul,
    opis: strona.streszczenie ? escapeHtml(strona.streszczenie) : '',
    meta: [
      strona.tytul_ja ? escapeHtml(strona.tytul_ja) : '',
      strona.tytul_en ? escapeHtml(strona.tytul_en) : '',
      strona.czas?.zaktualizowano ? `ostatnia zmiana: ${escapeHtml(strona.czas.zaktualizowano)}` : '',
    ].filter(Boolean).join(' · '),
    sciezka,
  });

  const hipotezy = Array.isArray(strona.hipotezy) ? strona.hipotezy : [];
  const blokHipotez = hipotezy.length > 0
    ? `<section class="boks boks-hipotezy">
        <h2>Hipotezy</h2>
        <ul class="lista-hipotez-krotka">${hipotezy.map((h) => `<li>
          <a href="#${escapeHtml(h.kotwica)}">${escapeHtml(h.sekcja)}</a> ${badgePewnosci(h.pewnosc)}
        </li>`).join('')}</ul>
      </section>`
    : '';

  return `${naglowek}
${metryka(strona)}
${boksyEncji(strona)}
${blokHipotez}
${wystapienia(strona)}
${powiazania(strona)}`;
}
