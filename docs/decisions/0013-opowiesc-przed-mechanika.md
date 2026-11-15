# 0013 — Opowieść przed mechaniką: nowy zestaw typów stron

**Status:** przyjęta (2026-11-13) · **Zastępuje:** fragmenty 0003 i 0008 · **Zastąpiona przez:** —

## Kontekst

Pierwszy zestaw typów stron — `rozdzial`, `zadanie`, `scena`, `postac`, `miejsce`, `pojecie`,
`kontekst`, `watek`, `relacja` — powstał, gdy pytanie brzmiało „jak śledzić postęp w grze”.
`zadanie` było jednostką interfejsu gry, `mapa` pokazywała postęp rozgrywki, a `miejsce`
mieszało skalę krainy z konkretnym obiektem. Skutek: układ działów opowiadał o graniu,
a nie o historii — i wymuszał na czytelniku myślenie kategoriami gry.

Właściciel wskazał, że struktura ma być **fabułocentryczna**: kronika opowiada historię
i świat, a nie mechanikę. Jako wzorzec podał podział treści fabularnej z własnego projektu
tłumaczenia gry na polski (paczka tłumacza): rozdziały z tytułami poematów, epizody grupujące
sceny, osobne krainy i sekty, osobne noty o mówcach i miejscach.

## Decyzja

Typy stron opisują **opowieść**, nie interfejs gry. Nowy zestaw:

| Typ | Rola w opowieści |
|---|---|
| `rozdzial` | rama: numer, tytuł oboczny z poematu, lista epizodów |
| `epizod` | kilka scen tworzących jedno wydarzenie; `rodzaj`: główny, poboczny, spotkanie, zwiad, wspomnienie |
| `scena` | jednostka opowieści — dosłowne słowa i analiza (bez zmian wobec 0008) |
| `watek` | nić biegnąca przez sceny, epizody i rozdziały |
| `postac` | osoba; `rola`, przydział, pierwsze wystąpienie, przynależność do sekty i krainy |
| `sekta` | szkoła walki, klan, bractwo, gildia, zakon, dwór |
| `kraina` | prowincja, region, miasto, dzielnica — skala geografii opowieści |
| `miejsce` | konkretny obiekt w krainie: świątynia, gospoda, przełęcz |
| `kontekst` | nawiązanie kulturowe: księga, poemat, film, obyczaj wuxia |
| `pojecie` | hasło świata: przedmiot, obyczaj, wydarzenie |
| `relacja` | związek między postaciami |

Mapowanie starego na nowe:

| Było | Jest | Uzasadnienie |
|---|---|---|
| `zadanie` | `epizod` | zadanie to jednostka interfejsu; epizod to jednostka historii |
| `zadanie.rodzaj` | `epizod.rodzaj` | „zwiad” i „wspomnienie” zostają jako rodzaje opowieści |
| `rozdzial.zadania` | `rozdzial.epizody` | spójność nazwy z typem |
| `scena.zadanie` | `scena.epizod` | j.w. |
| `miejsce.region` | `miejsce.kraina` | region był nazwą geograficzną bez własnej strony |
| — | `kraina` | nowy typ: skala, której wcześniej nie było |
| — | `sekta` | nowy typ: przynależność jest w opowieści faktem, nie tagiem |
| trasa `#/mapa` | `#/chronologia` | mapa pokazywała postęp grania; chronologia opowiada oś zdarzeń |
| trasa `#/zadania` | `#/rozdzialy` + `#/epizod/:slug` | rozdział i epizod zamiast listy zadań |

Menu: **Chronologia · Rozdziały · Wątki · Postacie · Krainy · Sekty · Konteksty**.
Strona główna prowadzi przez opowieść: rozdziały, ostatnio opowiedziane sceny, interpretacje,
świat — bez liczników postępu, dat zmian i okruszków od „Bazy”.

## Konsekwencje

- **Graf rośnie o dwa wymiary** (kraina, sekta), więc scena mówi, *gdzie* i *w czyim świecie*
  się dzieje, a nie tylko *kiedy*.
- **Migracja dotyczy także adresów.** `#/zadanie/…` i `#/mapa` znikają; nie robimy przekierowań,
  bo kronika nie jest jeszcze publicznie zaindeksowana.
- **Dokumentacja jest częścią zmiany.** `docs/guides/SCHEMAT_DANYCH.md`, `AGENTS.md`,
  `content/README.md` i testy opisują nowy zestaw; stary opis w dokumentacji jest błędem,
  tak samo jak błąd w kodzie.
- **Nazwy własne bez zmian.** Slugi pozostają ASCII i niezmienne także przy migracji typu;
  tytuły chińskie wchodzą do `tytul_ja` i `tytul_oboczny`.
- Kolejne typy dodaje się tak samo: najpierw pytanie „czy to jest jednostka opowieści?”,
  potem kod. Typ, który opisuje interfejs gry, nie wchodzi.
