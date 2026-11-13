/**
 * Strona sceny (ADR 0008) — najmniejsza jednostka śledzenia fabuły.
 *
 * Układ jest dwukolumnowy: po lewej dosłowny zapis rozegrania i analiza
 * miejsce w miejsce, po prawej kontekst (obsada, miejsce, wątki). Podsekcje
 * analizy prowadzą odsyłaczem do odpowiadającego fragmentu zapisu, bo to
 * właśnie ta korespondencja jest treścią strony.
 *
 * Kolejność scen (← poprzednia / następna →) idzie po porządku opowieści,
 * nie po numerze w epizodzie — czytelnik idzie historią tak, jak biegnie.
 */

import { escapeHtml, badgePewnosci, parsujAtrybutyBloku, BLOK_OTWARCIA_RE } from './markdown.js';
import { hrefDlaSlug } from './links.js';
import { dajDane, dajStrone, listaScenChronologicznie, rozdzialSceny, epizodSceny } from './data.js';
import { naglowekStrony, stanPusty, okruszki, chipTypu, kolumnaBoczna, ukladDwuKolumn } from './render.js';
import { podzielScene } from './scena-sekcje.js';

/** Sekcje sceny w kolejności czytania (lewa kolumna) i kontekst (prawa). */
const LEWA = ['Treść sceny', 'Analiza', 'Nawiązania kulturowe', 'Wątki w scenie'];

/**
 * Sekcja sceny to jeden boks; w środku leżą warstwy w kolorach pochodzenia.
 * Tytuł boksu pochodzi z `##` w treści, nie z koloru — dlatego „Analiza sceny”
 * pozostaje jedną sekcją, choćby mieściła cytat, kwerendę i hipotezę.
 */
function blokSekcji(sekcja) {
  const etykieta = sekcja.otwarcie?.match(BLOK_OTWARCIA_RE);
  const pochodzenie = etykieta?.[1] ?? 'dostawa';
  const atrybuty = parsujAtrybutyBloku(etykieta?.[2] ?? '');
  const warstwy = sekcja.warstwy ?? 1;
  return `<section class="boks boks-${escapeHtml(pochodzenie)}${warstwy > 1 ? ' boks-z-warstwami' : ''}"
    data-poziom="${escapeHtml(pochodzenie)}"${warstwy > 1 ? ` data-warstwy="${warstwy}"` : ''}>
    ${sekcja.html}
  </section>`;
}

function kolumnaKontekstu(scena) {
  const dane = dajDane();
  const grupy = [];

  const lista = (tytul, pole, typ) => {
    const wartosc = scena[pole];
    const slugi = Array.isArray(wartosc) ? wartosc : (wartosc ? [wartosc] : []);
    if (slugi.length === 0) return;
    const pozycje = slugi
      .map((slug) => dane.strony[slug])
      .filter(Boolean)
      .map((s) => `<li>${chipTypu(s.slug, s.typ, s.tytul, '')}</li>`)
      .join('');
    grupy.push({ tytul, html: `<ul class="chipy">${pozycje}</ul>` });
  };

  lista('Kraina', 'krainy', 'kraina');
  lista('Miejsce', 'miejsca', 'miejsce');
  lista('Postacie', 'postacie', 'postac');
  lista('Sekty', 'sekty', 'sekta');
  lista('Wątki', 'watki', 'watek');
  lista('Kontekst kulturowy', 'konteksty', 'kontekst');

  // Interpretacje tej sceny są sekcją w treści (z kotwicą i pewnością), więc nie
  // powtarzamy ich w kolumnie: ta sama informacja w dwóch miejscach myli.

  return kolumnaBoczna(grupy, 'Kontekst sceny');
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
    : '<span class="nav-puste">Początek opowieści</span>'}
  ${nastepna
    ? `<a class="nav-nastepna" href="${hrefDlaSlug(nastepna.slug, 'scena')}"><span class="nav-kierunek" aria-hidden="true">→</span><span class="nav-etykieta">następna scena</span><span class="nav-tytul">${escapeHtml(nastepna.tytul)}</span></a>`
    : '<span class="nav-puste nav-granica">Tu urywa się opowieść</span>'}
</nav>`;
}

export function renderScena(slug) {
  const scena = dajStrone(slug);
  if (!scena || scena.typ !== 'scena') return stanPusty('Nie ma takiej sceny.', '<a href="#/chronologia">Chronologia opowieści</a>');

  const epizod = epizodSceny(scena);
  const rozdzial = rozdzialSceny(scena);
  const sciezka = okruszki([
    { etykieta: 'Chronologia', href: '#/chronologia' },
    ...(rozdzial ? [{ etykieta: rozdzial.tytul, href: hrefDlaSlug(rozdzial.slug, 'rozdzial') }] : []),
    ...(epizod ? [{ etykieta: epizod.tytul, href: hrefDlaSlug(epizod.slug, 'epizod') }] : []),
    { etykieta: scena.tytul },
  ]);

  // Streszczenie zostaje w danych (listy, chronologia, wyszukiwarka), ale nie pod
  // tytułem: bez etykiety źródła wyglądało jak urwany fragment nie wiadomo czego.
  const naglowek = naglowekStrony({
    tytul: scena.tytul,
    meta: [
      scena.numer_sceny ? `scena ${escapeHtml(String(scena.numer_sceny))}` : '',
      epizod ? `<a href="${hrefDlaSlug(epizod.slug, 'epizod')}">${escapeHtml(epizod.tytul)}</a>` : '',
      rozdzial ? `<a href="${hrefDlaSlug(rozdzial.slug, 'rozdzial')}">${escapeHtml(rozdzial.tytul)}</a>` : '',
    ].filter(Boolean).join(' · '),
    sciezka,
  });

  const sekcje = scena.sekcje ?? [];
  const lewa = sekcje.filter((s) => LEWA.includes(s.tytul));
  const pozostale = sekcje.filter((s) => !LEWA.includes(s.tytul));

  const tresc = sekcje.length > 0
    ? ukladDwuKolumn(
      `${lewa.map(blokSekcji).join('\n')}
          ${pozostale.map(blokSekcji).join('\n')}`,
      kolumnaKontekstu(scena),
    )
    : '<p class="pusto">Ta scena nie ma jeszcze opisu.</p>';

  return `${naglowek}${tresc}${nawigacjaScen(scena)}`;
}
