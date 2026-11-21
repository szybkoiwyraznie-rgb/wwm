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
  dajDane, listaRozdzialow, epizodyRozdzialu, scenyEpizodu,
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

/**
 * Co nowego na głównej, nad rozdziałami: czytelnik ma zobaczyć, co przybyło,
 * zanim zacznie czytać szkielet opowieści. Trzy ostatnie wpisy — reszta w dzienniku.
 */
function blokCoNowego() {
  const wpisy = dajDane().coNowego ?? [];
  if (wpisy.length === 0) return '';
  const ostatnie = wpisy.slice(0, 3).map((w) => `<li class="wpis-dziennika">
      <p class="wpis-data"><time>${escapeHtml(w.data)}${w.czas ? ` ${escapeHtml(w.czas)}` : ''}</time></p>
      <div class="wpis-tresc">${w.html ?? escapeHtml(w.tekst ?? '')}</div>
    </li>`).join('');
  return `<section class="sekcja">
  <h2>Co nowego</h2>
  <ol class="lista-dziennika">${ostatnie}</ol>
  ${wpisy.length > 3 ? `<p class="sekcja-stopka"><a href="#/co-nowego">Cały dziennik (${wpisy.length}) →</a></p>` : ''}
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

export function renderGlowna() {
  const dane = dajDane();
  const st = dane.statystyki ?? {};

  const hero = `<section class="hero">
  <p class="hero-nadtytul">Jianghu · Chiny epoki Pięciu Dynastii</p>
  <h1>Kronika <em>Where Winds Meet</em>, scena po scenie</h1>
  <p class="hero-opis">Historia wędrowca w świecie, w którym miecze rozstrzygają sprawiedliwość,
  a sekty strzegą własnych prawd. Opowiedziana od pierwszego zdania do miejsca, w którym
  dotarła — z całym tłem, z którego czerpie: dawnymi księgami, poematami i obyczajem jianghu.</p>
  <div class="hero-liczby">
    ${kafelek(st.scena ?? 0, odmiana(st.scena ?? 0, ['scena', 'sceny', 'scen']), '#/chronologia')}
    ${kafelek(st.rozdzial ?? 0, odmiana(st.rozdzial ?? 0, ['rozdział', 'rozdziały', 'rozdziałów']), '#/rozdzialy')}
    ${kafelek(st.watek ?? 0, odmiana(st.watek ?? 0, ['wątek', 'wątki', 'wątków']), '#/watki')}
    ${kafelek(st.postac ?? 0, odmiana(st.postac ?? 0, ['postać', 'postacie', 'postaci']), '#/postacie')}
    ${kafelek(st.kraina ?? 0, odmiana(st.kraina ?? 0, ['kraina', 'krainy', 'krain']), '#/krainy')}
    ${kafelek(st.sekta ?? 0, odmiana(st.sekta ?? 0, ['sekta', 'sekty', 'sekt']), '#/sekty')}
    ${kafelek(st.miejsce ?? 0, odmiana(st.miejsce ?? 0, ['miejsce', 'miejsca', 'miejsc']), '#/miejsca')}
    ${kafelek(st.pojecie ?? 0, odmiana(st.pojecie ?? 0, ['hasło', 'hasła', 'haseł']), '#/pojecia')}
    ${kafelek(st.kontekst ?? 0, odmiana(st.kontekst ?? 0, ['kontekst', 'konteksty', 'kontekstów']), '#/konteksty')}
  </div>
</section>`;

  return `${hero}
${blokCoNowego()}
${blokRozdzialow()}
${blokOstatnichScen()}
${blokInterpretacji()}`;
}
