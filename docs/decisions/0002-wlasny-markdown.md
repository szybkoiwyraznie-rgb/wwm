# 0002 — Własny parser markdownu i frontmattera

**Status:** przyjęta (2026-11-13) · **Zastępuje:** — · **Zastąpiona przez:** —

## Kontekst

Potrzebny jest markdown z rozszerzeniami: bloki poziomów wiarygodności (`{{…}}`), surowe
cytaty scen (`:::zapis`), wikilinki `[[slug]]`, tabele. Biblioteki (marked, remark) to
zależności, których nie chcemy, a ich rozszerzanie jest trudniejsze niż napisanie podzbioru.

## Decyzja

Piszemy **własny, świadomie wąski** parser:

- `frontmatter.js` — ścisły podzbiór YAML (skalary, listy, listy obiektów, bloki `|`),
  bo schemat stron potrzebuje tylko tego,
- `markdown.js` — nagłówki, akapity, listy, tabele, pogrubienia, kursywa, kod inline,
  wikilinki, bloki poziomów.

Nieobsługiwane konstrukcje (zagnieżdżone listy w tabelach, HTML w treści) są poza zakresem.
Parser nie renderuje `href` z atrybutów nagłówka — odsyłacz musi być gotowym HTML-em.

## Konsekwencje

- Zero zależności i pełna kontrola nad tym, co trafia do artefaktu.
- Nowa konstrukcja markdownu = zmiana w `markdown.js` + test.
- Ryzyko: autor treści użyje konstrukcji spoza podzbioru i zobaczy surowy tekst.
  Mitygacja: `docs/LESSONS.md` §10 i przykłady w schemacie danych.
