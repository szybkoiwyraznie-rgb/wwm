/**
 * Listy działów: sceny, postacie, miejsca, hasła, konteksty, wątki, relacje.
 *
 * Każda lista ma własne kryterium porządku, bo każda odpowiada na inne pytanie:
 * sceny idą kolejnością rozgrywki (to jest oś fabuły), a encje — alfabetycznie
 * albo od ostatniej zmiany. Mieszanie tych porządków myli czytelnika.
 *
 * Filtry siedzą w adresie (`#/sceny?rozdzial=…`), więc wynik da się podlinkować.
 */

import { escapeHtml, badgePewnosci } from './markdown.js';
import { hrefDlaSlug, hrefFiltru, LISTY } from './links.js';
import {
  dajDane, dajStrone, listaStron, listaPosortowana, listaWedlugAktualizacji,
  listaRozdzialow, zadaniaRozdzialu, scenyZadania, listaScenChronologicznie, rozdzialSceny,
} from './data.js';
import { naglowekStrony, stanPusty, okruszki, odmiana, nazwaTypu, nazwaTypuWMnogiej } from './render.js';

const TYTULY = {
  scena: ['Sceny', 'Wszystkie rozegrane sceny w kolejności rozgrywki.'],
  postac: ['Postacie', 'Kto występuje w rozegranej fabule.'],
  miejsce: ['Miejsca', 'Krainy, miasta i zakątki, w których rozgrywa się akcja.'],
  pojecie: ['Hasła', 'Pojęcia świata: organizacje, przedmioty, wydarzenia, kultury.'],
  kontekst: ['Konteksty kulturowe', 'Nawiązania do literatury, filmu, mitów i terminów wuxia.'],
  watek: ['Wątki', 'Nici fabularne biegnące przez sceny.'],
  relacja: ['Relacje', 'Związki między postaciami.'],
};

function pasekFiltrow(typ, query, opcje) {
  const grupy = opcje.map(({ pole, etykieta, wartosci }) => {
    if (!wartosci || wartosci.length < 2) return '';
    const biezaca = query[pole] ?? '';
    return `<label class="filtr">
      <span class="filtr-etykieta">${escapeHtml(etykieta)}</span>
      <select name="${pole}" onchange="zmienFiltr(this)">
        <option value="">wszystkie</option>
        ${wartosci.map(({ wartosc, etykieta: e }) => `<option value="${escapeHtml(wartosc)}"${wartosc === biezaca ? ' selected' : ''}>${escapeHtml(e)}</option>`).join('')}
      </select>
    </label>`;
  }).filter(Boolean);

  if (grupy.length === 0) return '';
  return `<form class="filtry" data-lista="${escapeHtml(LISTY[typ] ?? '')}">${grupy.join('')}</form>`;
}

function wartosciRozdzialow() {
  return listaRozdzialow().map((r) => ({ wartosc: r.slug, etykieta: r.tytul }));
}

function listaScen(query = {}) {
  let sceny = listaScenChronologicznie();

  if (query.rozdzial) {
    const dozwolone = new Set(zadaniaRozdzialu(query.rozdzial).map((z) => z.slug));
    sceny = sceny.filter((s) => dozwolone.has(s.zadanie));
  }
  if (query.zadanie) sceny = sceny.filter((s) => s.zadanie === query.zadanie);

  const zadania = listaStron('zadanie');
  const filtrZadania = query.rozdzial ? zadaniaRozdzialu(query.rozdzial) : zadania;

  const filtry = pasekFiltrow('scena', query, [
    { pole: 'rozdzial', etykieta: 'Rozdział', wartosci: wartosciRozdzialow() },
    {
      pole: 'zadanie',
      etykieta: 'Zadanie',
      wartosci: filtrZadania
        .slice()
        .sort((a, b) => (a.kolejnosc ?? 0) - (b.kolejnosc ?? 0))
        .map((z) => ({ wartosc: z.slug, etykieta: z.tytul })),
    },
  ]);

  const naglowek = naglowekStrony({
    tytul: TYTULY.scena[0],
    opis: TYTULY.scena[1],
    meta: `${sceny.length} ${odmiana(sceny.length, ['scena', 'sceny', 'scen'])} · od pierwszej do ostatniej`,
    sciezka: okruszki([{ etykieta: 'Baza', href: '#/' }, { etykieta: 'Sceny' }]),
  });

  if (sceny.length === 0) {
    return `${naglowek}${filtry}${stanPusty('Brak scen spełniających kryteria.', '<a href="#/sceny">Pokaż wszystkie sceny</a>')}`;
  }

  // Grupowanie po zadaniu pozwala czytać fabułę ciągiem, nie skakać po liście.
  const grupy = [];
  for (const s of sceny) {
    const ostatnia = grupy.at(-1);
    if (ostatnia && ostatnia.zadanie === s.zadanie) ostatnia.sceny.push(s);
    else grupy.push({ zadanie: s.zadanie, sceny: [s] });
  }

  const html = grupy.map((g) => {
    const zadanie = g.zadanie ? dajStrone(g.zadanie) : null;
    const rozdzial = zadanie ? dajStrone(zadanie.rozdzial) : null;
    const naglowekGrupy = zadanie
      ? `<h2 class="grupa-tytul">${rozdzial ? `<span class="grupa-rozdzial">${escapeHtml(rozdzial.tytul)}</span>` : ''}<a href="${hrefDlaSlug(zadanie.slug, 'zadanie')}">${escapeHtml(zadanie.tytul)}</a></h2>`
      : '';
    return `<section class="grupa-scen">
      ${naglowekGrupy}
      <ol class="lista-scen-chronologia">
        ${g.sceny.map((s) => `<li class="scena-wiersz">
          <div class="scena-numer">${escapeHtml(String(s.numer_sceny ?? ''))}</div>
          <div class="scena-tresc">
            <a class="scena-tytul" href="${hrefDlaSlug(s.slug, 'scena')}">${escapeHtml(s.tytul)}</a>
            ${s.streszczenie ? `<p class="scena-streszczenie">${escapeHtml(s.streszczenie)}</p>` : ''}
          </div>
        </li>`).join('')}
      </ol>
    </section>`;
  }).join('');

  return `${naglowek}${filtry}${html}`;
}

function kartaEncji(s) {
  const opis = s.streszczenie ?? '';
  const hip = Array.isArray(s.hipotezy) ? s.hipotezy : [];
  return `<li class="karta-encji">
    <a class="karta-tytul" href="${hrefDlaSlug(s.slug, s.typ)}">${escapeHtml(s.tytul)}</a>
    ${s.tytul_ja ? `<span class="meta">${escapeHtml(s.tytul_ja)}</span>` : ''}
    ${opis ? `<p class="karta-opis">${escapeHtml(opis)}</p>` : ''}
    ${hip.length ? `<p class="karta-meta">${hip.map((h) => badgePewnosci(h.pewnosc)).join(' ')}</p>` : ''}
  </li>`;
}

function listaEncji(typ, query = {}) {
  let strony = listaPosortowana(typ);
  const filtryOpcje = [];

  if (query.rozdzial) {
    const dozwolone = new Set(zadaniaRozdzialu(query.rozdzial).map((z) => z.slug));
    strony = strony.filter((s) => {
      if (s.rozdzial === query.rozdzial) return true;
      const sceny = listaStron('scena').filter((sc) => dozwolone.has(sc.zadanie));
      const pole = typ === 'postac' ? 'postacie' : typ === 'miejsce' ? 'miejsca' : 'konteksty';
      return sceny.some((sc) => (sc[pole] ?? []).includes(s.slug));
    });
    filtryOpcje.push({ pole: 'rozdzial', etykieta: 'Rozdział', wartosci: wartosciRozdzialow() });
  }

  if (typ === 'kontekst' && query.rodzaj) strony = strony.filter((s) => s.rodzaj === query.rodzaj);

  const [tytul, opis] = TYTULY[typ];
  const naglowek = naglowekStrony({
    tytul,
    opis,
    meta: nazwaTypuWMnogiej(strony.length, typ),
    sciezka: okruszki([{ etykieta: 'Baza', href: '#/' }, { etykieta: tytul }]),
  });

  const filtry = pasekFiltrow(typ, query, filtryOpcje);

  if (strony.length === 0) {
    return `${naglowek}${filtry}${stanPusty(`Baza nie ma jeszcze żadnej strony w dziale „${tytul}”.`, 'Dział zapełnia się razem z rozegraną fabułą.')}`;
  }

  return `${naglowek}${filtry}<ul class="lista-encji lista-${typ}">${strony.map(kartaEncji).join('')}</ul>`;
}

export function renderListe(typ, query = {}) {
  if (typ === 'scena') return listaScen(query);
  return listaEncji(typ, query);
}

export function renderHipotezy(query = {}) {
  const dane = dajDane();
  const wszystkie = Object.values(dane.strony)
    .filter((s) => Array.isArray(s.hipotezy) && s.hipotezy.length > 0)
    .sort((a, b) => (b.hipotezy.at(0)?.pewnosc ?? 0) - (a.hipotezy.at(0)?.pewnosc ?? 0));

  const razem = wszystkie.reduce((n, s) => n + s.hipotezy.length, 0);

  const naglowek = naglowekStrony({
    tytul: 'Hipotezy',
    opis: 'Miejsca, w których baza nie ma pewności. Każda hipoteza ma oszacowaną pewność i historię zmian — widać, co było twierdzone wcześniej i kiedy przestało obowiązywać.',
    meta: `${razem} ${odmiana(razem, ['hipoteza', 'hipotezy', 'hipotez'])} na ${wszystkie.length} ${odmiana(wszystkie.length, ['stronie', 'stronach', 'stronach'])}`,
    sciezka: okruszki([{ etykieta: 'Baza', href: '#/' }, { etykieta: 'Hipotezy' }]),
  });

  if (wszystkie.length === 0) {
    return `${naglowek}${stanPusty('Baza nie zawiera jeszcze żadnej hipotezy.', 'Fioletowe boksy pojawiają się tam, gdzie wniosek wykracza poza to, co mówi gra.')}`;
  }

  const html = wszystkie.map((s) => `<li class="wiersz-hipotezy">
    <div class="wiersz-hipotezy-naglowek">
      <a class="wiersz-tytul" href="${hrefDlaSlug(s.slug, s.typ)}">${escapeHtml(s.tytul)}</a>
      <span class="meta">${escapeHtml(nazwaTypu(s.typ))}${s.czas?.zaktualizowano ? ` · ${escapeHtml(s.czas.zaktualizowano)}` : ''}</span>
    </div>
    <ul class="boksy-hipotez-strony">
      ${s.hipotezy.map((h) => `<li><a class="chip-hipotezy" href="${hrefDlaSlug(s.slug, s.typ)}#${escapeHtml(h.kotwica)}">
        <span>${escapeHtml(h.sekcja)}</span>${badgePewnosci(h.pewnosc)}</a></li>`).join('')}
    </ul>
  </li>`).join('');

  return `${naglowek}<ol class="lista-hipotez">${html}</ol>`;
}

export function renderTagi() {
  const dane = dajDane();
  const tagi = Object.entries(dane.tagi ?? {}).sort((a, b) => b[1].length - a[1].length);
  const naglowek = naglowekStrony({
    tytul: 'Tagi',
    opis: 'Swobodne etykiety łączące strony niezależnie od działów.',
    meta: `${tagi.length} ${odmiana(tagi.length, ['tag', 'tagi', 'tagów'])}`,
    sciezka: okruszki([{ etykieta: 'Baza', href: '#/' }, { etykieta: 'Tagi' }]),
  });
  if (tagi.length === 0) return `${naglowek}${stanPusty('Baza nie ma jeszcze tagów.')}`;
  return `${naglowek}<ul class="chmura-tagow">${tagi.map(([tag, strony]) =>
    `<li><a class="chip" href="#/tag/${encodeURIComponent(tag)}">${escapeHtml(tag)} <span class="meta">${strony.length}</span></a></li>`).join('')}</ul>`;
}

export function renderTag(tag) {
  const dane = dajDane();
  const slugi = dane.tagi?.[tag] ?? [];
  const strony = slugi.map((s) => dane.strony[s]).filter(Boolean);
  const naglowek = naglowekStrony({
    tytul: `Tag: ${tag}`,
    meta: nazwaTypuWMnogiej(strony.length, 'scena'),
    sciezka: okruszki([{ etykieta: 'Baza', href: '#/' }, { etykieta: 'Tagi', href: '#/tagi' }, { etykieta: tag }]),
  });
  if (strony.length === 0) return `${naglowek}${stanPusty(`Nie ma stron z tagiem „${tag}”.`)}`;
  return `${naglowek}<ul class="lista-encji">${strony.map(kartaEncji).join('')}</ul>`;
}
