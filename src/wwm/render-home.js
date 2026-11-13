/**
 * Strona główna: opowieść od pierwszego zdania do miejsca, w którym czytelnik jest.
 *
 * Kolejność bloków jest kolejnością czytania, nie kolejnością metryk (ADR 0013):
 * najpierw zaproszenie w świat, potem rozdział i epizod, w których toczy się akcja,
 * dalej ostatnie sceny jako ciąg czytania, na końcu — i tylko pomocniczo —
 * działy z postaciami, krainami i kontekstem kulturowym.
 */

import { escapeHtml, badgePewnosci } from './markdown.js';
import { hrefDlaSlug } from './links.js';
import {
  dajDane, dajPostep, listaRozdzialow, epizodyRozdzialu, scenyEpizodu,
  listaScenChronologicznie, listaStronZHipotezami, rozkladPewnosciHipotez,
} from './data.js';
import { odmiana } from './render.js';

const OSTATNIE_SCEN = 5;

function kafelek(liczba, etykieta, href) {
  return `<a class="kafelek" href="${href}">
    <span class="kafelek-liczba">${liczba}</span>
    <span class="kafelek-etykieta">${escapeHtml(etykieta)}</span>
  </a>`;
}

function wierszSceny(s) {
  const epizod = s.epizod ? dajDane().strony[s.epizod] : null;
  return `<li class="scena-wiersz">
    <div class="scena-numer">${escapeHtml(String(s.numer_sceny ?? ''))}</div>
    <div class="scena-tresc">
      <a class="scena-tytul" href="${hrefDlaSlug(s.slug, 'scena')}">${escapeHtml(s.tytul)}</a>
      ${s.streszczenie ? `<p class="scena-streszczenie">${escapeHtml(s.streszczenie)}</p>` : ''}
    </div>
    <span class="wiersz-meta">${epizod ? `<a href="${hrefDlaSlug(epizod.slug, 'epizod')}">${escapeHtml(epizod.tytul)}</a>` : ''}</span>
  </li>`;
}

/** Rozdział i epizod, w których stanęła opowieść — zamiast licznika „postępu”. */
function blokMiejsca() {
  const postep = dajPostep();

  if (!postep.ostatnia) {
    return `<section class="granica granica-pusta">
  <h2>Opowieść czeka na pierwsze zdanie</h2>
  <p>Tu stanie rozdział, w którym zaczyna się historia — i scena, na której na razie
  się kończy. Dalej opowieść nie jest jeszcze opowiedziana.</p>
</section>`;
  }

  const s = postep.ostatnia;
  const rozdzial = postep.rozdzial;
  const epizod = s.epizod ? dajDane().strony[s.epizod] : null;

  // Tytuły bywają tożsame (epizod nazwany jak jego scena) — wtedy pokazujemy go raz.
  const sciezka = [...new Set([rozdzial?.tytul, epizod?.tytul, s.tytul].filter(Boolean))]
    .map(escapeHtml).join(' <span aria-hidden="true">›</span> ');

  return `<section class="granica">
  <p class="granica-etykieta">Opowieść dotarła dotąd</p>
  <h2 class="granica-tytul"><a href="${hrefDlaSlug(s.slug, 'scena')}">${escapeHtml(s.tytul)}</a></h2>
  <p class="granica-sciezka">${sciezka}</p>
  <p class="granica-opis">Dalej historia nie jest jeszcze opowiedziana. Kolejne sceny
  dochodzą wtedy, gdy zostaną przeżyte — nigdy wcześniej.</p>
</section>`;
}

/** Rozdziały z epizodami — szkielet opowieści. */
function blokRozdzialow() {
  const rozdzialy = listaRozdzialow();
  if (rozdzialy.length === 0) return '';

  const pozycje = rozdzialy.map((r) => {
    const epizody = epizodyRozdzialu(r.slug);
    const scen = epizody.reduce((n, z) => n + scenyEpizodu(z.slug).length, 0);
    const tytulOboczny = r.tytul_oboczny
      ? `<span class="tytul-oboczny">${escapeHtml(String(r.tytul_oboczny))}</span>` : '';
    return `<li class="wiersz-rozdzialu">
      <a class="wiersz-tytul" href="${hrefDlaSlug(r.slug, 'rozdzial')}">${escapeHtml(r.tytul)}</a>
      ${tytulOboczny}
      <span class="wiersz-meta">${epizody.length} ${odmiana(epizody.length, ['epizod', 'epizody', 'epizodów'])} · ${scen} ${odmiana(scen, ['scena', 'sceny', 'scen'])}</span>
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
  <h2>Ostatnio opowiedziane</h2>
  <ol class="lista-scen-krotka">${ostatnie.map((s) => wierszSceny(s)).join('')}</ol>
  <p class="sekcja-stopka"><a href="#/chronologia">Cała opowieść w kolejności →</a></p>
</section>`;
}

function blokInterpretacji() {
  const strony = listaStronZHipotezami();
  if (strony.length === 0) return '';
  const rozklad = rozkladPewnosciHipotez();
  const razem = rozklad.wysoka + rozklad.srednia + rozklad.niska;

  const najnowsze = strony.slice(0, 4).map((s) => `<li>
    <a href="${hrefDlaSlug(s.slug, s.typ)}">${escapeHtml(s.tytul)}</a>
    <span class="meta">${(s.hipotezy ?? []).map((h) => badgePewnosci(h.pewnosc)).join(' ')}</span>
  </li>`).join('');

  return `<section class="sekcja sekcja-hipotezy">
  <h2>Interpretacje</h2>
  <p class="sekcja-wstep">Miejsca, w których opowieść pozwala na więcej niż jedno odczytanie.
  Każde ma oszacowaną pewność i zapisaną historię zmian.</p>
  <div class="hipotezy-liczby">
    <span class="pill pill-wysoka">${rozklad.wysoka} mocno uzasadnionych</span>
    <span class="pill pill-srednia">${rozklad.srednia} możliwych</span>
    <span class="pill pill-niska">${rozklad.niska} słabo uzasadnionych</span>
  </div>
  <ul class="lista-hipotez-krotka">${najnowsze}</ul>
  <p class="sekcja-stopka"><a href="#/hipotezy">Wszystkie interpretacje (${razem}) →</a></p>
</section>`;
}

function blokDzialow() {
  const dane = dajDane();
  const działy = [
    ['postac', 'Postacie', 'postacie'],
    ['sekta', 'Sekty', 'sekty'],
    ['kraina', 'Krainy', 'krainy'],
    ['miejsce', 'Miejsca', 'miejsca'],
    ['kontekst', 'Konteksty kulturowe', 'konteksty'],
    ['pojecie', 'Hasła świata', 'pojecia'],
    ['relacja', 'Relacje', 'relacje'],
  ];
  const kafelki = działy.map(([typ, etykieta, trasa]) => {
    const strony = Object.values(dane.strony).filter((s) => s.typ === typ);
    if (strony.length === 0) return '';
    return kafelek(strony.length, etykieta, `#/${trasa}`);
  }).filter(Boolean).join('');

  if (!kafelki) return '';
  return `<section class="sekcja">
  <h2>Świat opowieści</h2>
  <div class="kafli">${kafelki}</div>
</section>`;
}

export function renderGlowna() {
  const dane = dajDane();
  const st = dane.statystyki ?? {};
  const postep = dajPostep();

  const hero = `<section class="hero">
  <p class="hero-nadtytul">Jianghu · Chiny epoki Pięciu Dynastii</p>
  <h1>Kronika <em>Where Winds Meet</em>, scena po scenie</h1>
  <p class="hero-opis">Historia wędrowca w świecie, w którym miecze rozstrzygają sprawiedliwość,
  a sekty strzegą własnych prawd. Opowiedziana od pierwszego zdania do miejsca, w którym
  dotarła — z całym tłem, z którego czerpie: dawnymi księgami, poematami i obyczajem jianghu.</p>
  <div class="hero-liczby">
    ${kafelek(postep.scen, odmiana(postep.scen, ['scena', 'sceny', 'scen']), '#/chronologia')}
    ${kafelek(st.rozdzial ?? 0, odmiana(st.rozdzial ?? 0, ['rozdział', 'rozdziały', 'rozdziałów']), '#/rozdzialy')}
    ${kafelek(st.postac ?? 0, odmiana(st.postac ?? 0, ['postać', 'postacie', 'postaci']), '#/postacie')}
    ${kafelek(st.kontekst ?? 0, odmiana(st.kontekst ?? 0, ['kontekst', 'konteksty', 'kontekstów']), '#/konteksty')}
  </div>
</section>`;

  return `${hero}
${blokMiejsca()}
${blokRozdzialow()}
${blokOstatnichScen()}
${blokInterpretacji()}
${blokDzialow()}`;
}
