# Rejestr decyzji architektonicznych

Każda wiążąca decyzja o schemacie, procesie albo granicach projektu ma tu własny plik.
Decyzje są **numerowane i nieusuwalne**: zmiana zdania oznacza nowy ADR, który zastępuje
stary (pola `Zastępuje` / `Zastąpiona przez`), a nie edycję historii.

## Format

- nazwa pliku: `NNNN-krotki-slug.md` (`0007-granica-fabuly.md`),
- nagłówek: `# NNNN — Tytuł`,
- linia statusu: `**Status:** przyjęta (RRRR-MM-DD) · **Zastępuje:** … · **Zastąpiona przez:** …`,
- sekcje: `## Kontekst`, `## Decyzja`, `## Konsekwencje`.

Dopisywanie nowego numeru jest tańsze niż poprawianie istniejącego: historia decyzji jest
częścią wartości tego repozytorium.

## Spis

| Nr | Decyzja | Status |
|---|---|---|
| [0001](0001-jeden-artefakt-html.md) | Jeden samowystarczalny artefakt HTML | przyjęta, model publikacji zmieniony przez 0017 |
| [0002](0002-wlasny-markdown.md) | Własny parser markdownu i frontmattera | przyjęta |
| [0003](0003-jeden-typ-na-katalog.md) | Jeden typ strony na katalog, nieznane pole to błąd | przyjęta |
| [0004](0004-poziomy-wiarygodnosci.md) | Poziomy wiarygodności jako kolor fragmentu | przyjęta, słownik zmieniony przez 0016 |
| [0005](0005-hipotezy-z-pewnoscia.md) | Hipotezy z prawdopodobieństwem | przyjęta |
| [0006](0006-historia-interpretacji.md) | Historia interpretacji zamiast cichej poprawki | przyjęta |
| [0007](0007-granica-fabuly.md) | Twarda granica rozegranej fabuły | przyjęta |
| [0008](0008-scena-jednostka.md) | Scena jest jednostką śledzenia fabuły | przyjęta, rama zmieniona przez 0013 |
| [0009](0009-relacje-jako-graf.md) | Relacje w grafie dwukierunkowo | przyjęta |
| [0010](0010-konteksty-kulturowe.md) | Konteksty kulturowe jako osobna warstwa | przyjęta |
| [0011](0011-dziennik-i-o-bazie.md) | Dziennik nowego pokrycia i strona „O bazie” | przyjęta |
| [0012](0012-sesja-galaz-pr.md) | Jedna sesja, jedna gałąź, jeden PR | przyjęta |
| [0013](0013-opowiesc-przed-mechanika.md) | Opowieść przed mechaniką: nowy zestaw typów stron | przyjęta |
| [0014](0014-kronika-nie-mowi-o-sobie.md) | Kronika mówi o świecie, nie o sobie | przyjęta |
| [0015](0015-pochodzenie-i-rodzaj.md) | Pochodzenie i rodzaj treści to dwie różne osie | wycofana przez 0016 |
| [0016](0016-jeden-boks-wiele-warstw.md) | Jeden boks, wiele warstw: kolor należy do źródła | przyjęta |
| [0017](0017-powloka-i-drzewo-danych.md) | Powłoka i drzewo danych: kronika, która rośnie | przyjęta |

## Kiedy powstaje nowy ADR

- zmiana schematu danych albo zamkniętej listy wartości,
- nowy typ strony, nowy poziom wiarygodności, nowa trasa,
- zmiana modelu publikacji (artefakt, hosting, workflow),
- zmiana układu strony (kolumny, boksy, kolejność sekcji),
- decyzja o granicach projektu (co w kronice jest, a czego nie ma),
- decyzja o języku widocznej treści i jego bramie testowej,
- odejście od zasady „zero zależności”.

Drobna poprawka treści, literówka w dokumencie albo nowa scena nie wymagają ADR-a.
