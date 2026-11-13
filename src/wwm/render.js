/**
 * Rama strony: nagłówek, nawigacja, okruszki, stopka z legendą poziomów.
 *
 * Legenda stoi w stopce każdej podstrony, bo kolory bez klucza są zagadką —
 * a klucz na osobnej stronie „o bazie” czyta tylko ten, kto go szuka (ADR 0004).
 */

import { escapeHtml, PROGI_PEWNOSCI } from './markdown.js';
import { hrefDlaSlug } from './links.js';

export const NAZWA_TYPU = {
  rozdzial: ['rozdział', 'rozdziały', 'rozdziałów'],
  epizod: ['epizod', 'epizody', 'epizodów'],
  scena: ['scena', 'sceny', 'scen'],
  watek: ['wątek', 'wątki', 'wątków'],
  postac: ['postać', 'postacie', 'postaci'],
  sekta: ['sekta', 'sekty', 'sekt'],
  kraina: ['kraina', 'krainy', 'krain'],
  miejsce: ['miejsce', 'miejsca', 'miejsc'],
  kontekst: ['kontekst', 'konteksty', 'kontekstów'],
  pojecie: ['hasło', 'hasła', 'haseł'],
  relacja: ['relacja', 'relacje', 'relacji'],
};

/** Kolejność działów = kolejność opowieści (ADR 0013). */
export const KOLEJNOSC_TYPOW = [
  'rozdzial', 'epizod', 'scena', 'watek',
  'postac', 'sekta', 'kraina', 'miejsce',
  'kontekst', 'pojecie', 'relacja',
];

/** Odmiana rzeczownika: 1 scena / 2 sceny / 5 scen. */
export function odmiana(n, formy) {
  const liczba = Math.abs(Number(n) || 0);
  if (liczba === 1) return formy[0];
  const reszta = liczba % 10;
  const setki = liczba % 100;
  if (reszta >= 2 && reszta <= 4 && !(setki >= 12 && setki <= 14)) return formy[1];
  return formy[2];
}

export function nazwaTypu(typ, forma = 'jeden') {
  const formy = NAZWA_TYPU[typ];
  if (!formy) return typ ?? '';
  return forma === 'wiele' ? formy[1] : formy[0];
}

export function nazwaTypuWMnogiej(n, typ) {
  const formy = NAZWA_TYPU[typ];
  return formy ? `${n} ${odmiana(n, formy)}` : String(n);
}

const MENU = [
  { trasa: 'chronologia', etykieta: 'Chronologia' },
  { trasa: 'rozdzialy', etykieta: 'Rozdziały' },
  { trasa: 'watki', etykieta: 'Wątki' },
  { trasa: 'postacie', etykieta: 'Postacie' },
  { trasa: 'krainy', etykieta: 'Krainy' },
  { trasa: 'sekty', etykieta: 'Sekty' },
  { trasa: 'konteksty', etykieta: 'Konteksty' },
];

export function rama(aktywna, tytul, html, opcje = {}) {
  const { okruszki = '', podtytul = '', stopka = '' } = opcje;
  const nawigacja = MENU.map((m) => {
    const klasa = m.trasa === aktywna ? ' class="aktywna"' : '';
    return `<a href="#/${m.trasa}"${klasa}>${escapeHtml(m.etykieta)}</a>`;
  }).join('');

  return `<a class="przeskok" href="#tresc">Przejdź do treści</a>
<header class="naglowek">
  <div class="naglowek-wnetrze">
    <a class="logo" href="#/">
      <span class="logo-wwm">Where Winds Meet</span>
      <span class="logo-db">kronika jianghu</span>
    </a>
    <nav class="nawigacja" aria-label="Działy opowieści">${nawigacja}</nav>
    <form class="szukaj" role="search" onsubmit="return szukajZeStrony(this)">
      <input type="search" name="q" placeholder="Szukaj" aria-label="Szukaj w opowieści"
             value="${escapeHtml(opcje.szukaj ?? '')}" autocomplete="off">
    </form>
  </div>
</header>
<main class="tresc" id="tresc">
${okruszki ? `<nav class="okruszki" aria-label="Ścieżka">${okruszki}</nav>` : ''}
${podtytul ? `<p class="podtytul">${podtytul}</p>` : ''}
${html}
</main>
<footer class="stopka">
  <div class="stopka-wnetrze">
    ${legendaPoziomow()}
    ${stopka}
  </div>
</footer>`;
}

/**
 * Legenda poziomów wiarygodności (ADR 0004). Kolejność jest znacząca:
 * od słów gry do wniosku czytelnika.
 */
export function legendaPoziomow() {
  const pozycje = [
    ['skrypt', 'słowa opowieści', 'dialogi i narracja w dosłownym brzmieniu'],
    ['streszczenie', 'streszczenie', 'co się wydarzyło, opowiedziane własnymi słowami'],
    ['menu', 'kronika i księgi', 'opisy świata spisane w grze: encyklopedia, dziennik, karty postaci'],
    ['zrodlo', 'sprawdzone źródło', 'potwierdzone w źródle zewnętrznym'],
    ['wiedza', 'kontekst kulturowy', 'tło z kultury Chin i wuxia, bez potwierdzenia w źródle'],
    ['hipoteza', 'interpretacja', 'odczytanie opowieści z oszacowaną pewnością'],
    ['struktura', 'powiązania', 'kto, gdzie i kiedy — wyliczenie, nie opowieść'],
  ];
  return `<div class="legenda">
  <p class="legenda-tytul">Kolory mówią, czym jest fragment — nie, jak bardzo jest pewny</p>
  <ul class="legenda-lista">
    ${pozycje.map(([id, nazwa, opis]) => `<li><span class="legenda-probka poziom-${id}" aria-hidden="true"></span><strong>${nazwa}</strong> — ${opis}</li>`).join('')}
  </ul>
  <p class="legenda-pewnosc">Pewność interpretacji: ${PROGI_PEWNOSCI.map((p) => `${p.od}–${p.od === 80 ? 100 : p.od === 50 ? 79 : 49}% ${p.etykieta}`).join(' · ')}</p>
</div>`;
}

export function okruszki(elementy) {
  return elementy
    .map((e, i) => {
      const czesc = e.href ? `<a href="${e.href}">${escapeHtml(e.etykieta)}</a>` : `<span>${escapeHtml(e.etykieta)}</span>`;
      return i === 0 ? czesc : `<span class="okruszek-sep" aria-hidden="true">›</span>${czesc}`;
    })
    .join('');
}

export function naglowekStrony({ tytul, opis = '', meta = '', sciezka = null }) {
  return `<header class="naglowek-strony">
  <h1>${escapeHtml(tytul)}</h1>
  ${opis ? `<p class="wstep">${opis}</p>` : ''}
  ${meta ? `<p class="meta">${meta}</p>` : ''}
  ${sciezka ?? ''}
</header>`;
}

export function stanPusty(tekst, podpowiedz = '') {
  return `<div class="stan-pusty">
  <p>${escapeHtml(tekst)}</p>
  ${podpowiedz ? `<p class="meta">${podpowiedz}</p>` : ''}
</div>`;
}

export function nieZnalesc(czego) {
  return `<div class="naglowek-strony">
  <h1>Nie ma takiej strony</h1>
  <p class="wstep">Baza nie ma wpisu <span class="mono">${escapeHtml(czego ?? '')}</span>.</p>
  <p><a href="#/">Wróć na stronę główną</a> · <a href="#/szukaj">Szukaj w bazie</a></p>
</div>`;
}

export function tytulStrony(tytul) {
  const d = globalThis.document;
  if (d) d.title = `${tytul} · Where Winds Meet — baza fabuły`;
}

/** Chip do strony encji. */
export function chip(slug, typ, etykieta) {
  return `<a class="chip" href="${hrefDlaSlug(slug, typ)}">${escapeHtml(etykieta)}</a>`;
}

/** Chip typu — pokazuje, czym jest linkowana strona. */
export function chipTypu(slug, typ, etykieta, typEtykieta = nazwaTypu(typ)) {
  return `<a class="chip chip-${typ}" href="${hrefDlaSlug(slug, typ)}"><span class="chip-typ">${escapeHtml(typEtykieta)}</span>${escapeHtml(etykieta)}</a>`;
}
