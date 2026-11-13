/**
 * Listy działów: sceny, postacie, sekty, krainy, miejsca, hasła, konteksty, wątki, relacje.
 *
 * Każda lista ma własne kryterium porządku, bo każda odpowiada na inne pytanie:
 * sceny idą kolejnością opowieści (to jest jej oś), a osoby i miejsca —
 * alfabetycznie albo od ostatniej zmiany. Mieszanie tych porządków myli czytelnika.
 *
 * Filtry siedzą w adresie (`#/sceny?rozdzial=…`), więc wynik da się podlinkować.
 */

import { escapeHtml, badgePewnosci } from './markdown.js';
import { hrefDlaSlug, hrefFiltru, LISTY } from './links.js';
import {
  dajDane, dajStrone, listaStron, listaPosortowana, listaWedlugAktualizacji,
  listaRozdzialow, epizodyRozdzialu, scenyEpizodu, listaScenChronologicznie, rozdzialSceny,
} from './data.js';
import { naglowekStrony, stanPusty, okruszki, odmiana, nazwaTypu, nazwaTypuWMnogiej } from './render.js';

const TYTULY = {
  scena: ['Sceny', 'Wszystkie opowiedziane sceny, w kolejności zdarzeń.'],
  watek: ['Wątki', 'Nici fabularne biegnące przez sceny, epizody i rozdziały.'],
  postac: ['Postacie', 'Kto występuje w opowieści.'],
  sekta: ['Sekty', 'Wspólnoty, szkoły i bractwa, do których należą postacie.'],
  kraina: ['Krainy', 'Prowincje, miasta i okolice, w których toczy się historia.'],
  miejsce: ['Miejsca', 'Konkretne miejsca w krainach: świątynie, gospody, przełęcze.'],
  kontekst: ['Konteksty kulturowe', 'Nawiązania do literatury, filmu, mitów i obyczaju wuxia.'],
  pojecie: ['Hasła', 'Pojęcia świata: przedmioty, obyczaje, wydarzenia, wierzenia.'],
  relacja: ['Relacje', 'Związki między postaciami.'],
};

function wartosciRozdzialow() {
  return listaRozdzialow().map((r) => ({ wartosc: r.slug, etykieta: r.tytul }));
}

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

function listaScen(query = {}) {
  let sceny = listaScenChronologicznie();

  if (query.rozdzial) {
    const dozwolone = new Set(epizodyRozdzialu(query.rozdzial).map((z) => z.slug));
    sceny = sceny.filter((s) => dozwolone.has(s.epizod));
  }
  if (query.epizod) sceny = sceny.filter((s) => s.epizod === query.epizod);

  const epizody = listaStron('epizod');
  const filtrEpizodu = query.rozdzial ? epizodyRozdzialu(query.rozdzial) : epizody;

  const filtry = pasekFiltrow('scena', query, [
    { pole: 'rozdzial', etykieta: 'Rozdział', wartosci: wartosciRozdzialow() },
    {
      pole: 'epizod',
      etykieta: 'Epizod',
      wartosci: filtrEpizodu
        .slice()
        .sort((a, b) => (a.kolejnosc ?? 0) - (b.kolejnosc ?? 0))
        .map((z) => ({ wartosc: z.slug, etykieta: z.tytul })),
    },
  ]);

  const naglowek = naglowekStrony({
    tytul: TYTULY.scena[0],
    opis: TYTULY.scena[1],
    meta: `${sceny.length} ${odmiana(sceny.length, ['scena', 'sceny', 'scen'])} · od pierwszej do ostatniej`,
    sciezka: okruszki([{ etykieta: 'Chronologia', href: '#/chronologia' }, { etykieta: 'Sceny' }]),
  });

  if (sceny.length === 0) {
    return `${naglowek}${filtry}${stanPusty('Brak scen spełniających kryteria.', '<a href="#/sceny">Pokaż wszystkie sceny</a>')}`;
  }

  // Grupowanie po epizodzie pozwala czytać opowieść ciągiem, nie skakać po liście.
  const grupy = [];
  for (const s of sceny) {
    const ostatnia = grupy.at(-1);
    if (ostatnia && ostatnia.epizod === s.epizod) ostatnia.sceny.push(s);
    else grupy.push({ epizod: s.epizod, sceny: [s] });
  }

  const html = grupy.map((g) => {
    const epizod = g.epizod ? dajStrone(g.epizod) : null;
    const rozdzial = epizod ? dajStrone(epizod.rozdzial) : null;
    const naglowekGrupy = epizod
      ? `<h2 class="grupa-tytul">${rozdzial ? `<span class="grupa-rozdzial">${escapeHtml(rozdzial.tytul)}</span>` : ''}<a href="${hrefDlaSlug(epizod.slug, 'epizod')}">${escapeHtml(epizod.tytul)}</a></h2>`
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

  const KOLUMNA_SCENY = {
    postac: 'postacie', sekta: 'sekty', kraina: null, miejsce: 'miejsca',
    kontekst: 'konteksty', pojecie: null,
  };

  if (query.kraina) {
    const kraina = query.kraina;
    strony = strony.filter((s) => {
      if (s.kraina === kraina || (s.krainy ?? []).includes(kraina)) return true;
      if (typ === 'kraina') return false;
      const pole = KOLUMNA_SCENY[typ];
      if (!pole) return false;
      return listaStron('scena').some((sc) => (sc.krainy ?? []).includes(kraina) && (sc[pole] ?? []).includes(s.slug));
    });
    filtryOpcje.push({
      pole: 'kraina',
      etykieta: 'Kraina',
      wartosci: listaStron('kraina').map((k) => ({ wartosc: k.slug, etykieta: k.tytul })),
    });
  }

  if (typ === 'kontekst' && query.rodzaj) strony = strony.filter((s) => s.rodzaj === query.rodzaj);

  const [tytul, opis] = TYTULY[typ];
  const naglowek = naglowekStrony({
    tytul,
    opis,
    meta: nazwaTypuWMnogiej(strony.length, typ),
    sciezka: okruszki([{ etykieta: tytul }]),
  });

  const filtry = pasekFiltrow(typ, query, filtryOpcje);

  if (strony.length === 0) {
    return `${naglowek}${filtry}${stanPusty(`Nie ma tu jeszcze żadnej strony w dziale „${tytul}”.`, 'Dział zapełnia się razem z opowieścią.')}`;
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
    tytul: 'Interpretacje',
    opis: 'Miejsca, w których opowieść pozwala na więcej niż jedno odczytanie. Każde ma oszacowaną pewność i historię zmian — widać, co przyjęto wcześniej i kiedy przestało obowiązywać.',
    meta: `${razem} ${odmiana(razem, ['interpretacja', 'interpretacje', 'interpretacji'])} w ${wszystkie.length} ${odmiana(wszystkie.length, ['miejscu', 'miejscach', 'miejscach'])}`,
    sciezka: okruszki([{ etykieta: 'Interpretacje' }]),
  });

  if (wszystkie.length === 0) {
    return `${naglowek}${stanPusty('Nie ma jeszcze żadnej interpretacji.', 'Pojawiają się tam, gdzie opowieść nie mówi wprost, a wniosek da się uzasadnić.')}`;
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
  const motywy = Object.entries(dane.tagi ?? {}).sort((a, b) => b[1].length - a[1].length);
  const naglowek = naglowekStrony({
    tytul: 'Motywy',
    opis: 'Powracające motywy łączą sceny, osoby i miejsca ponad podziałem na krainy i rozdziały.',
    meta: `${motywy.length} ${odmiana(motywy.length, ['motyw', 'motywy', 'motywów'])}`,
    sciezka: okruszki([{ etykieta: 'Motywy' }]),
  });
  if (motywy.length === 0) return `${naglowek}${stanPusty('Żaden motyw nie powtórzył się jeszcze w opowieści.')}`;
  return `${naglowek}<ul class="chmura-tagow">${motywy.map(([motyw, strony]) =>
    `<li><a class="chip" href="#/tag/${encodeURIComponent(motyw)}">${escapeHtml(motyw)} <span class="meta">${strony.length}</span></a></li>`).join('')}</ul>`;
}

export function renderTag(tag) {
  const dane = dajDane();
  const slugi = dane.tagi?.[tag] ?? [];
  const strony = slugi.map((s) => dane.strony[s]).filter(Boolean);
  const naglowek = naglowekStrony({
    tytul: `Motyw: ${tag}`,
    meta: nazwaTypuWMnogiej(strony.length, 'scena'),
    sciezka: okruszki([{ etykieta: 'Motywy', href: '#/tagi' }, { etykieta: tag }]),
  });
  if (strony.length === 0) return `${naglowek}${stanPusty(`Motyw „${tag}” nie powraca jeszcze w żadnej scenie.`)}`;
  return `${naglowek}<ul class="lista-encji">${strony.map(kartaEncji).join('')}</ul>`;
}
