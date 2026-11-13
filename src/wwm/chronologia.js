/**
 * Chronologia: opowieść w kolejności zdarzeń.
 *
 * To odpowiedź na pytanie, które zadaje czytelnik, a nie gracz: co wydarzyło się
 * najpierw, w którym rozdziale i krainie, i dokąd historia dotarła. Oś jest
 * jednolita — jedna scena po drugiej — a rozdziały i epizody porządkują ją tylko
 * jako śródtytuły (ADR 0013).
 *
 * Widok jest tekstowy: bez obrazków, bez map z assetami, więc działa tak samo
 * na Pages, w podglądzie i na telefonie.
 */

import { escapeHtml, badgePewnosci } from './markdown.js';
import { hrefDlaSlug } from './links.js';
import {
  dajStrone, dajPostep, listaRozdzialow, epizodyRozdzialu, scenyEpizodu,
  listaScenChronologicznie, rozdzialSceny,
} from './data.js';
import { naglowekStrony, stanPusty, okruszki, odmiana } from './render.js';

function krainyTagi(s) {
  const slugi = Array.isArray(s.krainy) ? s.krainy : [];
  return slugi
    .map((k) => dajStrone(k))
    .filter(Boolean)
    .map((k) => `<a class="chip chip-mala" href="${hrefDlaSlug(k.slug, 'kraina')}">${escapeHtml(k.tytul)}</a>`)
    .join('');
}

function wierszChronologii(s) {
  const epizod = s.epizod ? dajStrone(s.epizod) : null;
  const hipotezy = Array.isArray(s.hipotezy) ? s.hipotezy : [];
  return `<li class="chrono-scena" id="${escapeHtml(s.slug)}">
    <div class="chrono-znacznik" aria-hidden="true"></div>
    <div class="chrono-tresc">
      <a class="chrono-tytul" href="${hrefDlaSlug(s.slug, 'scena')}">${escapeHtml(s.tytul)}</a>
      <span class="chrono-meta">${s.numer_sceny ? `scena ${escapeHtml(String(s.numer_sceny))}` : ''}${
        epizod ? ` · <a href="${hrefDlaSlug(epizod.slug, 'epizod')}">${escapeHtml(epizod.tytul)}</a>` : ''
      }</span>
      ${s.streszczenie ? `<p class="chrono-streszczenie">${escapeHtml(s.streszczenie)}</p>` : ''}
      ${hipotezy.length > 0
        ? `<p class="chrono-hipotezy">${hipotezy.map((h) => `<a href="${hrefDlaSlug(s.slug, 'scena')}#${escapeHtml(h.kotwica)}">${escapeHtml(h.sekcja)}</a> ${badgePewnosci(h.pewnosc)}`).join(' ')}</p>`
        : ''}
      <p class="chrono-tagi">${krainyTagi(s)}</p>
    </div>
  </li>`;
}

export function renderChronologia() {
  const sceny = listaScenChronologicznie();
  const rozdzialy = listaRozdzialow();
  const postep = dajPostep();

  const naglowek = naglowekStrony({
    tytul: 'Chronologia',
    opis: 'Cała opowieść w kolejności zdarzeń — od pierwszej sceny do miejsca, w którym się zatrzymała.',
    meta: sceny.length > 0
      ? `${sceny.length} ${odmiana(sceny.length, ['scena', 'sceny', 'scen'])} · ${rozdzialy.length} ${odmiana(rozdzialy.length, ['rozdział', 'rozdziały', 'rozdziałów'])}`
      : '',
    sciezka: okruszki([{ etykieta: 'Chronologia' }]),
  });

  if (sceny.length === 0) {
    return `${naglowek}${stanPusty('Opowieść nie ma jeszcze żadnej sceny.', 'Chronologia zaczyna się od pierwszej przeżytej sceny.')}`;
  }

  // Grupowanie po rozdziale, wewnątrz po epizodzie: śródtytuły porządkują,
  // ale nie przerywają ciągu — numer sceny w opowieści pozostaje globalny.
  const rozdzialyZZadaniami = rozdzialy
    .map((r) => ({
      rozdzial: r,
      epizody: epizodyRozdzialu(r.slug)
        .map((z) => ({ epizod: z, sceny: scenyEpizodu(z.slug) }))
        .filter((g) => g.sceny.length > 0),
    }))
    .filter((g) => g.epizody.length > 0);

  const bezRozdzialu = sceny.filter((s) => !rozdzialSceny(s));

  const bloki = rozdzialyZZadaniami.map(({ rozdzial, epizody }) => {
    const ile = epizody.reduce((n, g) => n + g.sceny.length, 0);
    const epizodyHtml = epizody.map(({ epizod, sceny: lista }) => `<div class="chrono-epizod">
        <h3 class="chrono-epizod-tytul"><a href="${hrefDlaSlug(epizod.slug, 'epizod')}">${escapeHtml(epizod.tytul)}</a></h3>
        ${epizod.streszczenie ? `<p class="chrono-epizod-opis">${escapeHtml(epizod.streszczenie)}</p>` : ''}
        <ol class="chrono-lista">${lista.map((s) => wierszChronologii(s)).join('')}</ol>
      </div>`).join('');

    return `<section class="chrono-rozdzial">
      <h2 class="chrono-rozdzial-tytul"><a href="${hrefDlaSlug(rozdzial.slug, 'rozdzial')}">${escapeHtml(rozdzial.tytul)}</a>
        <span class="meta">${ile} ${odmiana(ile, ['scena', 'sceny', 'scen'])}</span></h2>
      ${epizodyHtml}
    </section>`;
  }).join('');

  const ogon = bezRozdzialu.length > 0
    ? `<section class="chrono-rozdzial">
        <h2 class="chrono-rozdzial-tytul">Sceny poza rozdziałami</h2>
        <ol class="chrono-lista">${bezRozdzialu.map((s) => wierszChronologii(s)).join('')}</ol>
      </section>`
    : '';

  const granica = postep.ostatnia
    ? `<p class="chrono-granica">Opowieść zatrzymuje się na scenie
       <a href="${hrefDlaSlug(postep.ostatnia.slug, 'scena')}">${escapeHtml(postep.ostatnia.tytul)}</a>.
       Dalej historia nie jest jeszcze opowiedziana.</p>`
    : '';

  return `${naglowek}${granica}<div class="chronologia">${bloki}${ogon}</div>`;
}
