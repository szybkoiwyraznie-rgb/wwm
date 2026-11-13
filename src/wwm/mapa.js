/**
 * Mapa postępu: cała rozegrana fabuła jednym rzutem oka.
 *
 * To odpowiedź na pytanie, którego nie da żadna pojedyncza lista: gdzie jestem,
 * co już przeszedłem i jak duży jest rozdział. Mapa jest tekstowa (bez obrazków),
 * więc działa na Pages, w podglądzie i na telefonie, i nie wymaga assetów.
 */

import { escapeHtml } from './markdown.js';
import { hrefDlaSlug } from './links.js';
import { dajDane, listaRozdzialow, zadaniaRozdzialu, scenyZadania, dajPostep } from './data.js';
import { naglowekStrony, stanPusty, okruszki, odmiana } from './render.js';

export function renderMapa() {
  const rozdzialy = listaRozdzialow();
  const postep = dajPostep();

  const naglowek = naglowekStrony({
    tytul: 'Mapa postępu',
    opis: 'Cała rozegrana fabuła w jednym widoku: rozdziały, zadania i sceny w kolejności.',
    meta: postep.scen > 0
      ? `${postep.scen} ${odmiana(postep.scen, ['scena', 'sceny', 'scen'])} · ${rozdzialy.length} ${odmiana(rozdzialy.length, ['rozdział', 'rozdziały', 'rozdziałów'])}`
      : '',
    sciezka: okruszki([{ etykieta: 'Baza', href: '#/' }, { etykieta: 'Mapa postępu' }]),
  });

  if (rozdzialy.length === 0) {
    return `${naglowek}${stanPusty('Mapa jest pusta, bo nie ma jeszcze rozegranych scen.')}`;
  }

  const granica = postep.ostatnia;

  const bloki = rozdzialy.map((r) => {
    const zadania = zadaniaRozdzialu(r.slug);
    const zadaniaHtml = zadania.map((z) => {
      const sceny = scenyZadania(z.slug);
      return `<div class="mapa-zadanie">
        <a class="mapa-zadanie-tytul" href="${hrefDlaSlug(z.slug, 'zadanie')}">${escapeHtml(z.tytul)}</a>
        <a class="mapa-sceny" href="#/sceny?zadanie=${encodeURIComponent(z.slug)}" aria-label="Sceny zadania">
          ${sceny.length > 0
            ? sceny.map((s) => `<span class="mapa-scena${s.slug === granica?.slug ? ' mapa-scena-granica' : ''}" title="${escapeHtml(s.tytul)}"></span>`).join('')
            : '<span class="mapa-scena-pusta"></span>'}
        </a>
      </div>`;
    }).join('');

    const razem = zadania.reduce((n, z) => n + scenyZadania(z.slug).length, 0);

    return `<section class="mapa-rozdzial">
      <h2><a href="${hrefDlaSlug(r.slug, 'rozdzial')}">${escapeHtml(r.tytul)}</a>
        <span class="meta">${razem} ${odmiana(razem, ['scena', 'sceny', 'scen'])}</span></h2>
      ${zadaniaHtml || '<p class="pusto">Brak zadań.</p>'}
    </section>`;
  }).join('');

  return `${naglowek}
${granica ? `<p class="mapa-legenda"><span class="mapa-scena"></span> rozegrana scena
  <span class="mapa-scena mapa-scena-granica"></span> ostatnia rozegrana — dalej fabuła nie jest opisana</p>` : ''}
<div class="mapa">${bloki}</div>`;
}
