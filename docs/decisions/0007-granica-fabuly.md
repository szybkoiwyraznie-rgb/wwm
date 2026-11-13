# 0007 — Twarda granica rozegranej fabuły

**Status:** przyjęta (2026-11-13) · **Zastępuje:** — · **Zastąpiona przez:** —

## Kontekst

Baza jest publiczna i indeksowana, a gra jest opowieścią liniową. Największe ryzyko projektu
to spoiler: informacja o wydarzeniu, postaci albo roli, której właściciel jeszcze nie
rozegrał. Ryzyko jest realne także wtedy, gdy nikt nie chce zaszkodzić — wystarczy wiedza
modelu o grze albo „przecież to oczywiste z trailerów”.

## Decyzja

Granicę wyznacza plik `rozgrywka/postep.json`:

```json
{ "ostatnia_scena": "slug-ostatniej-rozegranej-sceny", "zaktualizowano": "RRRR-MM-DD" }
```

- Każda scena ma **globalny, ciągły** `kolejnosc` (1, 2, 3 … bez dziur i duplikatów).
- Build odrzuca każdą scenę o `kolejnosc` większym niż scena graniczna.
- `ostatnia_scena` musi wskazywać istniejącą scenę.
- Podniesienie granicy jest **pierwszym** krokiem każdej dostawy.

Zasada nadrzędna: **pochodzenie informacji nie jest zgodą na spoiler.** Źródło zewnętrzne
albo pamięć modelu nie uprawniają do opisania czegokolwiek poza granicą.

## Konsekwencje

- W repozytorium można trzymać materiał na przyszłość — nie da się go opublikować.
- Widok scen i strona główna liczą „ostatnią rozegraną scenę” z tego pliku.
- Brak pliku lub błędny slug zatrzymuje build: bez granicy nie da się pilnować zasady.
- Testy integralności dodatkowo sprawdzają, że poza granicą nie ma wzmianek w treści.
