/**
 * Strona zadania i rozdziału.
 *
 * Zadanie to „rozdział fabularny” w rozumieniu serii: kilka scen, które
 * tworzą jedno wydarzenie z początkiem, przebiegiem i domknięciem. Rozdział
 * zbiera zadania i pokazuje, jak daleko doszła rozgrywka.
 *
 * Obie strony mają wspólny mianownik: listę scen w kolejności czytania
 * z krótkim streszczeniem, żeby dało się czytać fabułę bez klikania w każdą
 * scenę osobno.
 */

import { escapeHtml } from './markdown.js';
import { hrefDlaSlug } from './links.js';
import { dajDane, dajStrone, listaRozdzialow, zadaniaRozdzialu, scenyZadania } from './data.js';
import { naglowekStrony, stanPusty, okruszki, odmiana } from './render.js';
import { podzielNaBoksy } from './scena-sekcje.js';

function listaScenZadania(sceny) {
  if (sceny.length === 0) {
    return `<p class="pusto">To zadanie nie ma jeszcze rozegranych scen.</p>`;
  }
  return `<ol class="lista-scen-zadania">
    ${sceny.map((s) => `<li class="scena-wiersz">
      <div class="scena-numer">${escapeHtml(String(s.numer_sceny ?? ''))}</div>
      <div class="scena-tresc">
        <a class="scena-tytul" href="${hrefDlaSlug(s.slug, 'scena')}">${escapeHtml(s.tytul)}</a>
        ${s.streszczenie ? `<p class="scena-streszczenie">${escapeHtml(s.streszczenie)}</p>` : ''}
      </div>
      <div class="scena-meta meta">#${s.kolejnosc}</div>
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

function stopkaPostepu(sceny, nastepne) {
  const czesci = [];
  czesci.push(`<p class="meta">${sceny.length} ${odmiana(sceny.length, ['scena', 'sceny', 'scen'])} w bazie`);
  if (nastepne) czesci.push(` · następne zadanie: <a href="${hrefDlaSlug(nastepne.slug, 'zadanie')}">${escapeHtml(nastepne.tytul)}</a>`);
  czesci.push('</p>');
  return czesci.join('');
}

export function renderZadanie(slug) {
  const zadanie = dajStrone(slug);
  const dane = dajDane();
  if (!zadanie || zadanie.typ !== 'zadanie') {
    return stanPusty('Nie ma takiego zadania.', '<a href="#/rozdzialy">Rozdziały</a>');
  }

  const rozdzial = zadanie.rozdzial ? dane.strony[zadanie.rozdzial] : null;
  const rodzenstwo = rozdzial ? zadaniaRozdzialu(rozdzial.slug) : [];
  const idx = rodzenstwo.findIndex((z) => z.slug === zadanie.slug);
  const nastepne = idx >= 0 ? rodzenstwo[idx + 1] : null;
  const sceny = scenyZadania(zadanie.slug);

  const naglowek = naglowekStrony({
    tytul: zadanie.tytul,
    opis: zadanie.streszczenie ? escapeHtml(zadanie.streszczenie) : '',
    meta: [
      rozdzial ? `rozdział: <a href="${hrefDlaSlug(rozdzial.slug, 'rozdzial')}">${escapeHtml(rozdzial.tytul)}</a>` : '',
      zadanie.rodzaj ? `${zadanie.rodzaj}` : '',
      zadanie.status ? `stan: ${zadanie.status}` : '',
    ].filter(Boolean).join(' · '),
    sciezka: okruszki([
      { etykieta: 'Sceny', href: '#/sceny' },
      ...(rozdzial ? [{ etykieta: rozdzial.tytul, href: hrefDlaSlug(rozdzial.slug, 'rozdzial') }] : []),
      { etykieta: zadanie.tytul },
    ]),
  });

  return `${naglowek}
${boksyStrony(zadanie)}
<section class="boks">
  <h2>Sceny w kolejności</h2>
  ${listaScenZadania(sceny)}
  ${stopkaPostepu(sceny, nastepne)}
</section>`;
}

export function renderRozdzial(slug) {
  const rozdzial = dajStrone(slug);
  if (!rozdzial || rozdzial.typ !== 'rozdzial') {
    return stanPusty('Nie ma takiego rozdziału.', '<a href="#/rozdzialy">Rozdziały</a>');
  }

  const zadania = zadaniaRozdzialu(rozdzial.slug);
  const nastepny = rozdzial.nastepny ? dajStrone(rozdzial.nastepny) : null;

  const naglowek = naglowekStrony({
    tytul: rozdzial.tytul,
    opis: rozdzial.streszczenie ? escapeHtml(rozdzial.streszczenie) : '',
    meta: [
      `rozdział ${rozdzial.numer}`,
      rozdzial.region ? escapeHtml(String(rozdzial.region)) : '',
      rozdzial.status ? `stan: ${rozdzial.status}` : '',
    ].filter(Boolean).join(' · '),
    sciezka: okruszki([{ etykieta: 'Sceny', href: '#/sceny' }, { etykieta: rozdzial.tytul }]),
  });

  const listaZadan = zadania.length > 0
    ? `<ol class="lista-zadan">
        ${zadania.map((z) => {
          const sceny = scenyZadania(z.slug);
          return `<li class="zadanie-wiersz">
            <a class="zadanie-tytul" href="${hrefDlaSlug(z.slug, 'zadanie')}">${escapeHtml(z.tytul)}</a>
            ${z.rodzaj ? `<span class="meta">${escapeHtml(z.rodzaj)}</span>` : ''}
            <span class="zadanie-sceny">${sceny.length} ${odmiana(sceny.length, ['scena', 'sceny', 'scen'])}</span>
            ${z.streszczenie ? `<p class="zadanie-streszczenie">${escapeHtml(z.streszczenie)}</p>` : ''}
          </li>`;
        }).join('')}
      </ol>`
    : `<p class="pusto">W tym rozdziale nie ma jeszcze rozegranych zadań.</p>`;

  const stopka = nastepny
    ? `<p class="sekcja-stopka">Następny rozdział: <a href="${hrefDlaSlug(nastepny.slug, 'rozdzial')}">${escapeHtml(nastepny.tytul)}</a></p>`
    : '';

  return `${naglowek}
${boksyStrony(rozdzial)}
<section class="boks">
  <h2>Zadania</h2>
  ${listaZadan}
  ${stopka}
</section>`;
}

export function renderRozdzialy() {
  const rozdzialy = listaRozdzialow();
  const naglowek = naglowekStrony({
    tytul: 'Rozdziały',
    opis: 'Fabuła gry podzielona na rozdziały i zadania, w kolejności rozgrywki.',
    meta: `${rozdzialy.length} ${odmiana(rozdzialy.length, ['rozdział', 'rozdziały', 'rozdziałów'])}`,
    sciezka: okruszki([{ etykieta: 'Baza', href: '#/' }, { etykieta: 'Rozdziały' }]),
  });

  if (rozdzialy.length === 0) {
    return `${naglowek}${stanPusty('Baza nie ma jeszcze rozdziałów.', 'Pierwszy rozdział powstaje po rozegraniu pierwszej sceny.')}`;
  }

  return `${naglowek}<ol class="lista-rozdzialow-rozwinieta">
    ${rozdzialy.map((r) => {
      const zadania = zadaniaRozdzialu(r.slug);
      const scen = zadania.reduce((n, z) => n + scenyZadania(z.slug).length, 0);
      return `<li class="rozdzial-karta">
        <a class="rozdzial-tytul" href="${hrefDlaSlug(r.slug, 'rozdzial')}">${escapeHtml(r.tytul)}</a>
        <p class="meta">rozdział ${r.numer}${r.region ? ` · ${escapeHtml(String(r.region))}` : ''} · ${zadania.length} ${odmiana(zadania.length, ['zadanie', 'zadania', 'zadań'])} · ${scen} ${odmiana(scen, ['scena', 'sceny', 'scen'])}</p>
        ${r.streszczenie ? `<p>${escapeHtml(r.streszczenie)}</p>` : ''}
      </li>`;
    }).join('')}
  </ol>`;
}
