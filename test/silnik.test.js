/**
 * Testy jednostkowe czystych modułów silnika (bez fs, bez DOM).
 * Nie dotykają bazy — pilnują kontraktów, na których opiera się build:
 * wikilinki, slugi, parser frontmattera i renderer markdown z poziomami.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { SLUG_RE, slugify, parseWikilinks, hrefDlaSlug, hrefListy } from '../src/wwm/links.js';
import { parseFrontmatter } from '../src/wwm/frontmatter.js';
import {
  renderMarkdown, POCHODZENIA, RODZAJE_TRESCI, POZIOMY_WYCOFANE, badgePewnosci, poziomPewnosci, czyPewnosc,
} from '../src/wwm/markdown.js';

test('slugify prowadzi polskie znaki do ASCII i nie zostawia myślników na brzegach', () => {
  assert.equal(slugify('Zwój z imieniem'), 'zwoj-z-imieniem');
  assert.equal(slugify('  Droga — bez śladów!  '), 'droga-bez-sladow');
  assert.equal(slugify('ŁÓDŹ na rzece'), 'lodz-na-rzece');
  for (const t of ['Zwój', 'Droga bez śladu', 'Ćwiczenie']) {
    assert.match(slugify(t), SLUG_RE);
  }
});

test('parseWikilinks czyta slug, etykietę i pozycję', () => {
  assert.deepEqual(
    parseWikilinks('a [[xiake]] b [[watek-pochodzenia|wątek]] c').map(({ slug, etykieta }) => ({ slug, etykieta })),
    [{ slug: 'xiake', etykieta: null }, { slug: 'watek-pochodzenia', etykieta: 'wątek' }],
  );
});

test('href strony i listy wynikają z typu', () => {
  assert.equal(hrefDlaSlug('xiake', 'kontekst'), '#/kontekst/xiake');
  assert.equal(hrefDlaSlug('zaslepka-sc01', 'scena'), '#/scena/zaslepka-sc01');
  assert.equal(hrefListy('kontekst'), '#/konteksty');
  assert.equal(hrefListy('nieznany-typ'), '#/');
});

test('frontmatter czyta skalary, tablice inline i blokowe', () => {
  const { data, body } = parseFrontmatter(`---
typ: scena
slug: przyklad
tytul: "Przykład: z dwukropkiem"
kolejnosc: 3
tagi: [a, b]
postacie:
  - x
  - y
---

Treść
`);
  assert.equal(data.typ, 'scena');
  assert.equal(data.tytul, 'Przykład: z dwukropkiem');
  assert.equal(data.kolejnosc, 3);
  assert.deepEqual(data.tagi, ['a', 'b']);
  assert.deepEqual(data.postacie, ['x', 'y']);
  assert.equal(body.trim(), 'Treść');
});

test('frontmatter obsługuje skalar blokowy — potrzebny na dosłowne brzmienie hipotezy', () => {
  const { data } = parseFrontmatter(`---
interpretacje:
  - data: "2026-11-13 10:00"
    zmiana: Skorygowano granicę sceny.
    fragment: Analiza
    poprzednio: |
      Scena kończyła się na wejściu do klasztoru.
      Druga wersja twierdziła to samo mocniej.
---

`);
  assert.equal(data.interpretacje.length, 1);
  assert.match(data.interpretacje[0].poprzednio, /Scena kończyła się na wejściu/);
  assert.match(data.interpretacje[0].poprzednio, /\n/, 'skalar blokowy zachowuje złamanie wiersza');
});

test('frontmatter czyta adresy w liście blokowej jako skalary, nie obiekty', () => {
  // Adres URL ma dwukropek, więc wygląda jak `klucz: wartość`. Bez wyjątku
  // pole `zrodla:` zamieniało link w obiekt i walidacja odrzucała własną treść.
  const { data } = parseFrontmatter('---\nzrodla:\n  - https://pl.wikipedia.org/wiki/Wuxia\ntagi: [a]\n---\n');
  assert.deepEqual(data.zrodla, ['https://pl.wikipedia.org/wiki/Wuxia']);
});

test('frontmatter odrzuca nieznaną składnię zamiast ją przełknąć', () => {
  assert.throws(() => parseFrontmatter('---\ntagi:\n  - a\n b\n---\n'), /frontmatter/);
  assert.throws(() => parseFrontmatter('---\ntytyl: a: b\n---\n'), /cudzysłów/);
});

test('renderer wymaga pochodzenia i rodzaju na każdym fragmencie treści', () => {
  const bez = renderMarkdown('Sam akapit', { wymagajPoziomu: true });
  assert.equal(bez.problemy.length, 1);
  assert.match(bez.problemy[0], /bez pochodzenia/);

  const z = renderMarkdown('{{opracowanie\n\n## Opis\n\nAkapit\n}}', { wymagajPoziomu: true });
  assert.deepEqual(z.problemy, []);
  assert.match(z.html, /data-poziom="opracowanie"/);
});

test('interpretacja bez pewności jest błędem, a z pewnością dostaje plakietkę', () => {
  const bez = renderMarkdown('{{model rodzaj=interpretacja\n\n## Analiza\n\nTekst\n}}', { wymagajPoziomu: true });
  assert.ok(bez.problemy.some((p) => /wymaga atrybutu pewnosc/.test(p)));

  const z = renderMarkdown('{{model pewnosc=85\n\n## Analiza\n\nTekst\n}}', { wymagajPoziomu: true });
  assert.deepEqual(z.problemy, []);
  assert.match(z.html, /pewność 85%/);
  assert.match(z.html, /data-pewnosc="85"/);
});

test('pewność przysługuje wyłącznie hipotezie', () => {
  const p = renderMarkdown('{{opracowanie pewnosc=50\n\nTekst\n}}', { wymagajPoziomu: true });
  assert.ok(p.problemy.some((x) => /przysługuje tylko/.test(x)));
});

test('wycofane nazwy bloków podpowiadają zamiennik', () => {
  for (const [stary, nowy] of Object.entries(POZIOMY_WYCOFANE)) {
    const r = renderMarkdown(`{{${stary}\n\nTekst\n}}`, { wymagajPoziomu: true });
    assert.ok(r.problemy.some((x) => x.includes(nowy)), `${stary} → ${nowy}`);
  }
  assert.deepEqual(POCHODZENIA, ['dostawa', 'opracowanie', 'kwerenda', 'model']);
  assert.ok(RODZAJE_TRESCI.includes('interpretacja'));
  assert.ok(RODZAJE_TRESCI.includes('kontekst'));
});

test('ten sam boks mieści warstwy o różnym pochodzeniu', () => {
  const kwerenda = renderMarkdown('{{kwerenda\n\n## Kontekst kulturowy\n\nZe źródła.\n}}', { wymagajPoziomu: true });
  const model = renderMarkdown('{{model\n\n## Kontekst kulturowy\n\nZ pamięci.\n}}', { wymagajPoziomu: true });
  assert.match(kwerenda.html, /poziom-kwerenda/);
  assert.match(model.html, /poziom-model/);
  // Ten sam tytuł warstwy, inny kolor — o to chodzi w modelu dwuosiowym.
  assert.match(kwerenda.html, /Kontekst kulturowy/);
  assert.match(model.html, /Kontekst kulturowy/);
  assert.notEqual(
    kwerenda.html.match(/class="fragment[^"]*"/)[0],
    model.html.match(/class="fragment[^"]*"/)[0],
  );
});

test('hipoteza jest zawsze wiedzą modelu', () => {
  const zle = renderMarkdown('{{kwerenda rodzaj=interpretacja pewnosc=40\n\nTekst\n}}', { wymagajPoziomu: true });
  assert.ok(zle.problemy.some((x) => /wiedzą modelu/.test(x)));
  const dobrze = renderMarkdown('{{model pewnosc=40\n\nTekst\n}}', { wymagajPoziomu: true });
  assert.deepEqual(dobrze.problemy, []);
  assert.match(dobrze.html, /rodzaj-interpretacja/);

  // Wiedza modelu bez pewności to tło kulturowe, nie hipoteza.
  const tlo = renderMarkdown('{{model\n\nTekst\n}}', { wymagajPoziomu: true });
  assert.deepEqual(tlo.problemy, []);
  assert.doesNotMatch(tlo.html, /rodzaj-interpretacja/);
});

test('martwy wikilink nie jest cichy', () => {
  const r = renderMarkdown('{{opracowanie\n\n[[nie-ma-takiej]]\n}}', {
    wymagajPoziomu: true,
    resolveLink: () => null,
  });
  assert.ok(r.problemy.some((p) => /martwy wikilink/.test(p)));
  assert.match(r.html, /class="martwy-link"/);
});

test('istniejący wikilink staje się odsyłaczem z tytułem', () => {
  const r = renderMarkdown('{{opracowanie\n\n[[xiake|wędrowny rycerz]]\n}}', {
    wymagajPoziomu: true,
    resolveLink: (slug) => (slug === 'xiake' ? { href: '#/kontekst/xiake', tytul: 'Xiake' } : null),
  });
  assert.deepEqual(r.problemy, []);
  assert.match(r.html, /href="#\/kontekst\/xiake"/);
  assert.match(r.html, /wędrowny rycerz/);
});

test('tabela z pionkiem w wikilinku nie rozjeżdża kolumn', () => {
  const r = renderMarkdown('{{opracowanie rodzaj=spis\n\n| Wątek | Ślad |\n|---|---|\n| [[a\\|Alfa]] | x |\n| [[b|Beta]] | y |\n}}', {
    wymagajPoziomu: true,
    resolveLink: (slug) => ({ href: `#/x/${slug}`, tytul: slug }),
  });
  assert.equal((r.html.match(/<tr>/g) ?? []).length, 3);
  assert.equal((r.html.match(/<td>/g) ?? []).length, 4);
});

test('blok zapisu zachowuje złamania wiersza i nie renderuje nagłówków jako sekcji', () => {
  const r = renderMarkdown('{{dostawa\n\n## Treść sceny\n\n:::zapis\n**A:** raz\ndwa\n:::\n}}', {
    wymagajPoziomu: true,
  });
  assert.match(r.html, /class="zapis-tekst"/);
  assert.match(r.html, /raz<br>|raz\ndwa/);
});

test('progi pewności mają trzy poziomy i czytelne etykiety', () => {
  assert.equal(poziomPewnosci(85).id, 'wysoka');
  assert.equal(poziomPewnosci(60).id, 'srednia');
  assert.equal(poziomPewnosci(20).id, 'niska');
  assert.equal(poziomPewnosci(0).id, 'niska');
  assert.match(badgePewnosci(85), /pewnosc-wysoka/);
  assert.equal(badgePewnosci(''), '');
  assert.equal(badgePewnosci(101), '');
  assert.ok(czyPewnosc(0) && czyPewnosc(100) && !czyPewnosc(101) && !czyPewnosc(3.5));
});

test('renderer escapuje HTML z treści', () => {
  const r = renderMarkdown('{{opracowanie\n\n<script>alert(1)</script>\n}}', { wymagajPoziomu: true });
  assert.ok(!r.html.includes('<script>'));
  assert.match(r.html, /&lt;script&gt;/);
});
