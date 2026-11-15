# Rozgrywka

Materiał źródłowy i stan przejścia gry. Ten katalog jest **wejściem** bazy, nie jej częścią:
nie ma tu stron witryny, tylko dowody i granica fabuły.

## `zapisy/`

Archiwum rozgrywki: kolejne sesje gry spisane tak, jak wydarzyły się na ekranie —
kwestie dialogowe, narracja, opisy tego, co się dzieje. Jeden plik = jedna sesja.

```
rozgrywka/zapisy/2026-11-20-001.md
```

Zasady archiwum:

- **Archiwum jest nietykalne.** Nie poprawiamy literówek w kwestiach, nie skracamy zdań,
  nie porządkujemy scen. Scena w bazie cytuje archiwum dosłownie — jeśli cytat się różni,
  build pada (ADR 0008).
- **Nowe fragmenty dopisujemy na końcu pliku**, nie w środku i nie przez nadpisanie.
  Dzięki temu istniejące cytaty pozostają ważne.
- **Numeracja rośnie**: `001`, `002`, …. Nowa sesja to nowy plik, nie dopisek do starego,
  chyba że sesja została przerwana i wznowiona tego samego dnia.
- Rozdzielamy kwestie od narracji: **Postać:** kwestia, akapit bez pogrubienia to narracja.
  Ten format jest czytany przez `npm run zapis` i przez licznik elementów sceny.

## `postep.json`

Granica rozegranej fabuły (ADR 0007). Jedyne pole, które naprawdę ma znaczenie:

```json
{
  "ostatnia_scena": "nazwa-sluga-ostatniej-sceny",
  "zaktualizowano": "2026-11-20"
}
```

- `ostatnia_scena` musi wskazywać **istniejącą** scenę w `content/sceny/`.
- Build odrzuca każdą scenę o wyższym `kolejnosc` — to jest mechanizm chroniący przed
  spoilerem. Można trzymać w repozytorium materiał na przyszłość; nie da się go opublikować,
  dopóki granica nie zostanie przesunięta.
- Aktualizacja granicy to **pierwszy** krok każdej dostawy, bo dopiero ona otwiera nowym
  scenom drogę do artefaktu.

## Czego tu nie ma

- Plików `content/` — te leżą w `../content/` i są opisem, nie zapisem.
- Zrzutów ekranu, nagrań i obrazków — baza świadomie nie zawiera elementów graficznych.
- Tłumaczeń — archiwum zapisujemy w języku rozgrywki; polskie opisy powstają dopiero
  w bazie.
