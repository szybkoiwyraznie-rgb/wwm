/**
 * Strona epizodu i rozdziału.
 *
 * Epizod to jednostka opowieści: kilka scen, które razem tworzą jedno wydarzenie
 * z początkiem, przebiegiem i domknięciem. Rozdział zbiera epizody i pokazuje,
 * jak daleko dotarła historia (ADR 0013).
 *
 * Obie strony mają wspólny mianownik: ciąg scen z krótkim streszczeniem, żeby
 * dało się czytać opowieść bez klikania w każdą scenę osobno.
 */

import { escapeHtml } from './markdown.js';
import { hrefDlaSlug } from './links.js';
import { dajDane, dajStrone, listaRozdzialow, epizodyRozdzialu, scenyEpizodu } from './data.js';
import { naglowekStrony, stanPusty, okruszki, odmiana } from './render.js';

const RODZAJE_EPIZODU = {
  glowny: 'wątek główny',
  poboczny: 'opowieść poboczna',
  spotkanie: 'spotkanie',
  zwiad: 'zwiad',
  wspomnienie: 'wspomnienie',
};

function listaScenEpizodu(sceny) {
  if (sceny.length === 0) {
    return '<p class="pusto">Ten epizod nie ma jeszcze opowiedzianych scen.</p>';
  }
  return `<ol class="lista-scen-epizodu">
    ${sceny.map((s) => `<li class="scena-wiersz">
      <div class="scena-numer">${escapeHtml(String(s.numer_sceny ?? ''))}</div>
      <div class="scena-tresc">
        <a class="scena-tytul" href="${hrefDlaSlug(s.slug, 'scena')}">${escapeHtml(s.tytul)}</a>
        ${s.streszczenie ? `<p class="scena-streszczenie">${escapeHtml(s.streszczenie)}</p>` : ''}
      </div>
    </li>`).join('')}
  </ol>`;
}

function boksyStrony(strona) {
  const boksy = strona.boksy ?? [];
  if (boksy.length === 0) return '';
  return boksy.map((b) => `<section class="boks">
    ${b.tytul ? `<h2>${escapeHtml(b.tytul)}</h2>` : ''}
    ${b.html}
  </section>`).join('\n');
}

export function renderEpizod(slug) {
  const epizod = dajStrone(slug);
  const dane = dajDane();
  if (!epizod || epizod.typ !== 'epizod') {
    return stanPusty('Nie ma takiego epizodu.', '<a href="#/rozdzialy">Rozdziały</a>');
  }

  const rozdzial = epizod.rozdzial ? dane.strony[epizod.rozdzial] : null;
  const rodzenstwo = rozdzial ? epizodyRozdzialu(rozdzial.slug) : [];
  const idx = rodzenstwo.findIndex((z) => z.slug === epizod.slug);
  const nastepny = idx >= 0 ? rodzenstwo[idx + 1] : null;
  const sceny = scenyEpizodu(epizod.slug);

  const naglowek = naglowekStrony({
    tytul: epizod.tytul,
    opis: epizod.streszczenie ? escapeHtml(epizod.streszczenie) : '',
    meta: [
      rozdzial ? `rozdział: <a href="${hrefDlaSlug(rozdzial.slug, 'rozdzial')}">${escapeHtml(rozdzial.tytul)}</a>` : '',
      epizod.rodzaj ? (RODZAJE_EPIZODU[epizod.rodzaj] ?? epizod.rodzaj) : '',
      epizod.status === 'w-toku' ? 'opowieść trwa' : '',
    ].filter(Boolean).join(' · '),
    sciezka: okruszki([
      { etykieta: 'Chronologia', href: '#/chronologia' },
      ...(rozdzial ? [{ etykieta: rozdzial.tytul, href: hrefDlaSlug(rozdzial.slug, 'rozdzial') }] : []),
      { etykieta: epizod.tytul },
    ]),
  });

  const stopka = nastepny
    ? `<p class="sekcja-stopka">Dalej: <a href="${hrefDlaSlug(nastepny.slug, 'epizod')}">${escapeHtml(nastepny.tytul)}</a></p>`
    : '<p class="sekcja-stopka pusto">Dalej opowieść jeszcze nie została opowiedziana.</p>';

  return `${naglowek}
${boksyStrony(epizod)}
<section class="boks">
  <h2>Sceny po kolei</h2>
  ${listaScenEpizodu(sceny)}
  ${stopka}
</section>`;
}

export function renderRozdzial(slug) {
  const rozdzial = dajStrone(slug);
  if (!rozdzial || rozdzial.typ !== 'rozdzial') {
    return stanPusty('Nie ma takiego rozdziału.', '<a href="#/rozdzialy">Rozdziały</a>');
  }

  const epizody = epizodyRozdzialu(rozdzial.slug);
  const nastepny = rozdzial.nastepny ? dajStrone(rozdzial.nastepny) : null;
  const krainy = (rozdzial.krainy ?? []).map((k) => dajDane().strony[k]).filter(Boolean);

  const naglowek = naglowekStrony({
    tytul: rozdzial.tytul,
    opis: rozdzial.streszczenie ? escapeHtml(rozdzial.streszczenie) : '',
    meta: [
      rozdzial.tytul_oboczny ? `<span class="tytul-oboczny">${escapeHtml(String(rozdzial.tytul_oboczny))}</span>` : '',
      krainy.length > 0
        ? krainy.map((k) => `<a href="${hrefDlaSlug(k.slug, 'kraina')}">${escapeHtml(k.tytul)}</a>`).join(', ')
        : '',
      rozdzial.status === 'w-toku' ? 'opowieść trwa' : '',
    ].filter(Boolean).join(' · '),
    sciezka: okruszki([{ etykieta: 'Rozdziały', href: '#/rozdzialy' }, { etykieta: rozdzial.tytul }]),
  });

  const listaEpizodow = epizody.length > 0
    ? `<ol class="lista-epizodow">
        ${epizody.map((z) => {
          const sceny = scenyEpizodu(z.slug);
          return `<li class="epizod-wiersz">
            <a class="epizod-tytul" href="${hrefDlaSlug(z.slug, 'epizod')}">${escapeHtml(z.tytul)}</a>
            ${z.rodzaj ? `<span class="meta">${escapeHtml(RODZAJE_EPIZODU[z.rodzaj] ?? z.rodzaj)}</span>` : ''}
            <span class="epizod-sceny">${sceny.length} ${odmiana(sceny.length, ['scena', 'sceny', 'scen'])}</span>
            ${z.streszczenie ? `<p class="epizod-streszczenie">${escapeHtml(z.streszczenie)}</p>` : ''}
          </li>`;
        }).join('')}
      </ol>`
    : '<p class="pusto">W tym rozdziale nie ma jeszcze opowiedzianych epizodów.</p>';

  const stopka = nastepny
    ? `<p class="sekcja-stopka">Następny rozdział: <a href="${hrefDlaSlug(nastepny.slug, 'rozdzial')}">${escapeHtml(nastepny.tytul)}</a></p>`
    : '';

  return `${naglowek}
${boksyStrony(rozdzial)}
<section class="boks">
  <h2>Epizody</h2>
  ${listaEpizodow}
  ${stopka}
</section>`;
}

export function renderRozdzialy() {
  const rozdzialy = listaRozdzialow();
  const naglowek = naglowekStrony({
    tytul: 'Rozdziały',
    opis: 'Opowieść podzielona na rozdziały i epizody, w kolejności, w jakiej biegnie.',
    meta: `${rozdzialy.length} ${odmiana(rozdzialy.length, ['rozdział', 'rozdziały', 'rozdziałów'])}`,
    sciezka: okruszki([{ etykieta: 'Rozdziały' }]),
  });

  if (rozdzialy.length === 0) {
    return `${naglowek}${stanPusty('Nie ma jeszcze żadnego rozdziału.', 'Pierwszy rozdział otwiera się razem z pierwszą sceną.')}`;
  }

  return `${naglowek}<ol class="lista-rozdzialow-rozwinieta">
    ${rozdzialy.map((r) => {
      const epizody = epizodyRozdzialu(r.slug);
      const scen = epizody.reduce((n, z) => n + scenyEpizodu(z.slug).length, 0);
      const krainy = (r.krainy ?? []).map((k) => dajDane().strony[k]).filter(Boolean);
      return `<li class="rozdzial-karta">
        <a class="rozdzial-tytul" href="${hrefDlaSlug(r.slug, 'rozdzial')}">${escapeHtml(r.tytul)}</a>
        ${r.tytul_oboczny ? `<span class="tytul-oboczny">${escapeHtml(String(r.tytul_oboczny))}</span>` : ''}
        <p class="meta">${krainy.map((k) => escapeHtml(k.tytul)).join(' · ')}${krainy.length ? ' · ' : ''}${epizody.length} ${odmiana(epizody.length, ['epizod', 'epizody', 'epizodów'])} · ${scen} ${odmiana(scen, ['scena', 'sceny', 'scen'])}</p>
        ${r.streszczenie ? `<p>${escapeHtml(r.streszczenie)}</p>` : ''}
      </li>`;
    }).join('')}
  </ol>`;
}
