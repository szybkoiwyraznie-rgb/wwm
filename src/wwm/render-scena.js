/**
 * Strona sceny (ADR 0008) — najmniejsza jednostka śledzenia fabuły.
 *
 * Układ jest dwukolumnowy: po lewej dosłowny zapis rozegrania i analiza
 * miejsce w miejsce, po prawej kontekst (obsada, miejsce, wątki). Podsekcje
 * analizy prowadzą odsyłaczem do odpowiadającego fragmentu zapisu, bo to
 * właśnie ta korespondencja jest treścią strony.
 *
 * Kolejność scen (← poprzednia / następna →) idzie po globalnym porządku
 * rozegrania, nie po numerze w zadaniu — czytelnik przechodzi fabułę tak,
 * jak ją zagrał.
 */

import { escapeHtml, badgePewnosci, parsujAtrybutyBloku, BLOK_OTWARCIA_RE } from './markdown.js';
import { hrefDlaSlug } from './links.js';
import { dajDane, dajStrone, listaScenChronologicznie, rozdzialSceny } from './data.js';
import { naglowekStrony, stanPusty, okruszki, chipTypu } from './render.js';
import { podzielScene } from './scena-sekcje.js';

/** Sekcje sceny w kolejności czytania (lewa kolumna) i kontekst (prawa). */
const LEWA = ['Treść sceny', 'Analiza', 'Nawiązania kulturowe', 'Wątki w scenie'];

function blokSekcji(sekcja) {
  const etykieta = sekcja.otwarcie?.match(BLOK_OTWARCIA_RE);
  const poziom = etykieta?.[1] ?? 'skrypt';
  const atrybuty = parsujAtrybutyBloku(etykieta?.[2] ?? '');
  const pewnosc = atrybuty.get('pewnosc');
  return `<section class="boks boks-${escapeHtml(poziom)}" data-poziom="${escapeHtml(poziom)}">
    ${sekcja.html}
  </section>`;
}

function kolumnaKontekstu(scena) {
  const dane = dajDane();
  const grupy = [];

  const lista = (tytul, pole, typ, klasa = '') => {
    const wartosc = scena[pole];
    const slugi = Array.isArray(wartosc) ? wartosc : (wartosc ? [wartosc] : []);
    if (slugi.length === 0) return;
    const pozycje = slugi
      .map((slug) => dane.strony[slug])
      .filter(Boolean)
      .map((s) => `<li>${chipTypu(s.slug, s.typ, s.tytul, '')}</li>`)
      .join('');
    grupy.push(`<div class="kontekst-grupa ${klasa}">
      <h3>${escapeHtml(tytul)}</h3>
      <ul class="chipy">${pozycje}</ul>
    </div>`);
  };

  lista('Miejsce', 'miejsca', 'miejsce');
  lista('Postacie', 'postacie', 'postac');
  lista('Wątki', 'watki', 'watek');
  lista('Kontekst kulturowy', 'konteksty', 'kontekst');

  const hipotezy = Array.isArray(scena.hipotezy) ? scena.hipotezy : [];
  if (hipotezy.length > 0) {
    grupy.push(`<div class="kontekst-grupa">
      <h3>Hipotezy w tej scenie</h3>
      <ul class="chipy">
        ${hipotezy.map((h) => `<li><a class="chip chip-hipoteza" href="#${escapeHtml(h.kotwica)}">
          <span class="chip-typ">hipoteza</span>${escapeHtml(h.sekcja)} ${badgePewnosci(h.pewnosc)}</a></li>`).join('')}
      </ul>
    </div>`);
  }

  if (grupy.length === 0) return '';
  return `<aside class="kontekst" aria-label="Kontekst sceny">${grupy.join('')}</aside>`;
}

function nawigacjaScen(scena) {
  const wszystkie = listaScenChronologicznie();
  const idx = wszystkie.findIndex((s) => s.slug === scena.slug);
  if (idx < 0) return '';
  const poprzednia = wszystkie[idx - 1];
  const nastepna = wszystkie[idx + 1];

  return `<nav class="nawigacja-scen" aria-label="Kolejne sceny">
  ${poprzednia
    ? `<a class="nav-poprzednia" href="${hrefDlaSlug(poprzednia.slug, 'scena')}"><span class="nav-kierunek" aria-hidden="true">←</span><span class="nav-etykieta">poprzednia scena</span><span class="nav-tytul">${escapeHtml(poprzednia.tytul)}</span></a>`
    : '<span class="nav-puste">Początek rozegranej fabuły</span>'}
  ${nastepna
    ? `<a class="nav-nastepna" href="${hrefDlaSlug(nastepna.slug, 'scena')}"><span class="nav-kierunek" aria-hidden="true">→</span><span class="nav-etykieta">następna scena</span><span class="nav-tytul">${escapeHtml(nastepna.tytul)}</span></a>`
    : '<span class="nav-puste nav-granica">Tu kończy się rozegrana fabuła</span>'}
</nav>`;
}

export function renderScena(slug) {
  const scena = dajStrone(slug);
  if (!scena || scena.typ !== 'scena') return stanPusty('Nie ma takiej sceny.', '<a href="#/sceny">Wszystkie sceny</a>');

  const zadanie = scena.zadanie ? dajStrone(scena.zadanie) : null;
  const rozdzial = rozdzialSceny(scena);
  const sciezka = okruszki([
    { etykieta: 'Sceny', href: '#/sceny' },
    ...(rozdzial ? [{ etykieta: rozdzial.tytul, href: hrefDlaSlug(rozdzial.slug, 'rozdzial') }] : []),
    ...(zadanie ? [{ etykieta: zadanie.tytul, href: hrefDlaSlug(zadanie.slug, 'zadanie') }] : []),
    { etykieta: scena.tytul },
  ]);

  const naglowek = naglowekStrony({
    tytul: scena.tytul,
    opis: scena.streszczenie ? escapeHtml(scena.streszczenie) : '',
    meta: [
      scena.kolejnosc ? `scena #${scena.kolejnosc} w kolejności rozgrywki` : '',
      scena.numer_sceny ? `numer w zadaniu: ${escapeHtml(String(scena.numer_sceny))}` : '',
      scena.czas?.zaktualizowano ? `ostatnia zmiana: ${escapeHtml(scena.czas.zaktualizowano)}` : '',
    ].filter(Boolean).join(' · '),
    sciezka,
  });

  const sekcje = scena.sekcje ?? [];
  const lewa = sekcje.filter((s) => LEWA.includes(s.tytul));
  const pozostale = sekcje.filter((s) => !LEWA.includes(s.tytul));

  const tresc = sekcje.length > 0
    ? `<div class="uklad-sceny">
        <div class="kolumna-glowna">
          ${lewa.map(blokSekcji).join('\n')}
          ${pozostale.map(blokSekcji).join('\n')}
        </div>
        ${kolumnaKontekstu(scena)}
      </div>`
    : '<p class="pusto">Scena nie ma jeszcze treści.</p>';

  return `${naglowek}${tresc}${nawigacjaScen(scena)}`;
}
