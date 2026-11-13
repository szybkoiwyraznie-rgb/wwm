/**
 * Strona główna: gdzie jesteśmy w fabule i co dalej czytać.
 *
 * Kolejność jest decyzją redakcyjną: najpierw granica rozegranej fabuły
 * (czytelnik musi wiedzieć, że dalej nic nie ma — ADR 0007), potem ostatnie
 * sceny jako wejście w lekturę, a dopiero na końcu liczby i działy.
 */

import { escapeHtml, badgePewnosci } from './markdown.js';
import { hrefDlaSlug, hrefFiltru } from './links.js';
import {
  dajDane, dajPostep, listaRozdzialow, zadaniaRozdzialu, listaScenChronologicznie,
  listaStronZHipotezami, rozkladPewnosciHipotez, listaWedlugAktualizacji,
} from './data.js';
import { naglowekStrony, odmiana, stanPusty, nazwaTypu } from './render.js';

const OSTATNIE_SCEN = 6;

function kafelek(liczba, etykieta, href = null) {
  const wewn = `<span class="kafelek-liczba">${escapeHtml(String(liczba))}</span><span class="kafelek-etykieta">${escapeHtml(etykieta)}</span>`;
  return href ? `<a class="kafelek" href="${href}">${wewn}</a>` : `<div class="kafelek">${wewn}</div>`;
}

function wierszSceny(s, { zNumerem = true } = {}) {
  const zadanie = s.zadanie ? dajDane().strony[s.zadanie] : null;
  const numer = zNumerem ? `<span class="wiersz-numer">#${s.kolejnosc}</span>` : '';
  return `<li class="wiersz-sceny">
    ${numer}
    <a class="wiersz-tytul" href="${hrefDlaSlug(s.slug, 'scena')}">${escapeHtml(s.tytul)}</a>
    <span class="wiersz-meta">${zadanie ? `<a href="${hrefDlaSlug(zadanie.slug, 'zadanie')}">${escapeHtml(zadanie.tytul)}</a>` : ''}${
      s.numer_sceny ? ` · scena ${escapeHtml(String(s.numer_sceny))}` : ''
    }</span>
  </li>`;
}

function blokPostepu() {
  const postep = dajPostep();
  const dane = dajDane();

  if (!postep.ostatnia) {
    return `<section class="granica granica-pusta">
  <h2>Baza czeka na pierwsze sceny</h2>
  <p>Nie ma jeszcze rozegranego materiału. Gdy pojawi się pierwsza scena, tutaj stanie
  znacznik granicy fabuły — miejsce, w którym kończy się to, co wiadomo.</p>
</section>`;
  }

  const s = postep.ostatnia;
  const rozdzial = postep.rozdzial;
  const zadanie = s.zadanie ? dane.strony[s.zadanie] : null;
  const sciezka = [rozdzial?.tytul, zadanie?.tytul, s.tytul].filter(Boolean).map(escapeHtml).join(' <span aria-hidden="true">›</span> ');

  return `<section class="granica">
  <p class="granica-etykieta">Granica rozegranej fabuły</p>
  <h2 class="granica-tytul"><a href="${hrefDlaSlug(s.slug, 'scena')}">${escapeHtml(s.tytul)}</a></h2>
  <p class="granica-sciezka">${sciezka}</p>
  <p class="granica-opis">Dalej opowieść nie jest jeszcze opisana. Baza nie wyprzedza rozgrywki,
  więc kolejne strony powstają dopiero po przejściu kolejnych scen.</p>
</section>`;
}

function blokRozdzialu() {
  const rozdzialy = listaRozdzialow();
  if (rozdzialy.length === 0) return '';

  const pozycje = rozdzialy.map((r) => {
    const zadania = zadaniaRozdzialu(r.slug);
    const scen = zadania.reduce((n, z) => n + listaScenChronologicznie().filter((s) => s.zadanie === z.slug).length, 0);
    const zakres = r.region ? `<span class="meta">${escapeHtml(String(r.region))}</span>` : '';
    return `<li class="wiersz-rozdzialu">
      <a class="wiersz-tytul" href="${hrefDlaSlug(r.slug, 'rozdzial')}">${escapeHtml(r.tytul)}</a>
      ${zakres}
      <span class="wiersz-meta">${scen} ${odmiana(scen, ['scena', 'sceny', 'scen'])} · ${zadania.length} ${odmiana(zadania.length, ['zadanie', 'zadania', 'zadań'])}</span>
    </li>`;
  }).join('');

  return `<section class="sekcja">
  <h2>Rozdziały</h2>
  <ol class="lista-rozdzialow">${pozycje}</ol>
</section>`;
}

function blokOstatnichScen() {
  const sceny = listaScenChronologicznie();
  if (sceny.length === 0) return '';
  const ostatnie = sceny.slice(-OSTATNIE_SCEN).reverse();
  return `<section class="sekcja">
  <h2>Ostatnio rozegrane</h2>
  <ol class="lista-scen-krotka">${ostatnie.map((s) => wierszSceny(s)).join('')}</ol>
  <p class="sekcja-stopka"><a href="#/sceny">Wszystkie sceny w kolejności rozgrywki →</a></p>
</section>`;
}

function blokHipotez() {
  const strony = listaStronZHipotezami();
  if (strony.length === 0) return '';
  const rozklad = rozkladPewnosciHipotez();
  const razem = rozklad.wysoka + rozklad.srednia + rozklad.niska;

  const najnowsze = strony.slice(0, 4).map((s) => `<li>
    <a href="${hrefDlaSlug(s.slug, s.typ)}">${escapeHtml(s.tytul)}</a>
    <span class="meta">${(s.hipotezy ?? []).map((h) => badgePewnosci(h.pewnosc)).join(' ')}</span>
  </li>`).join('');

  return `<section class="sekcja sekcja-hipotezy">
  <h2>Hipotezy</h2>
  <p class="sekcja-wstep">Miejsca, w których baza nie ma pewności i mówi to wprost:
  wniosek autora z oszacowaną pewnością i zapisaną historią zmian.</p>
  <div class="hipotezy-liczby">
    <span class="pill pill-wysoka">${rozklad.wysoka} wysokiej pewności</span>
    <span class="pill pill-srednia">${rozklad.srednia} średniej</span>
    <span class="pill pill-niska">${rozklad.niska} niskiej</span>
  </div>
  <ul class="lista-hipotez-krotka">${najnowsze}</ul>
  <p class="sekcja-stopka"><a href="#/hipotezy">Wszystkie hipotezy (${razem}) →</a></p>
</section>`;
}

function blokDzialow() {
  const dane = dajDane();
  const działy = [
    ['postac', 'Postacie'], ['miejsce', 'Miejsca'], ['pojecie', 'Hasła'],
    ['kontekst', 'Konteksty kulturowe'], ['watek', 'Wątki'], ['relacja', 'Relacje'],
  ];
  const kafelki = działy.map(([typ, etykieta]) => {
    const strony = Object.values(dane.strony).filter((s) => s.typ === typ);
    if (strony.length === 0) return '';
    return kafelek(strony.length, etykieta, `#/${{
      postac: 'postacie', miejsce: 'miejsca', pojecie: 'pojecia',
      kontekst: 'konteksty', watek: 'watki', relacja: 'relacje',
    }[typ]}`);
  }).filter(Boolean).join('');

  if (!kafelki) return '';
  return `<section class="sekcja">
  <h2>Działy</h2>
  <div class="kafli">${kafelki}</div>
</section>`;
}

export function renderGlowna() {
  const dane = dajDane();
  const st = dane.statystyki ?? {};
  const postep = dajPostep();

  const hero = `<section class="hero">
  <p class="hero-nadtytul">Wuxia · Chiny epoki Pięciu Dynastii</p>
  <h1>Fabuła <em>Where Winds Meet</em>, scena po scenie</h1>
  <p class="hero-opis">Baza wiedzy o świecie i opowieści gry, prowadzona równolegle z rozgrywką.
  Każda scena jest zapisana dosłownie, opatrzona streszczeniem i analizą, a każde twierdzenie
  mówi, skąd pochodzi — od słów gry po domysł autora.</p>
  <div class="hero-liczby">
    ${kafelek(postep.scen, odmiana(postep.scen, ['rozegrana scena', 'rozegrane sceny', 'rozegranych scen']), '#/sceny')}
    ${kafelek(st.rozdzial ?? 0, odmiana(st.rozdzial ?? 0, ['rozdział', 'rozdziały', 'rozdziałów']), '#/rozdzialy')}
    ${kafelek(st.postac ?? 0, odmiana(st.postac ?? 0, ['postać', 'postacie', 'postaci']), '#/postacie')}
    ${kafelek(st.kontekst ?? 0, odmiana(st.kontekst ?? 0, ['kontekst', 'konteksty', 'kontekstów']), '#/konteksty')}
  </div>
</section>`;

  return `${hero}
${blokPostepu()}
${blokOstatnichScen()}
${blokHipotez()}
${blokRozdzialu()}
${blokDzialow()}`;
}
