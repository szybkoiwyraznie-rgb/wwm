# 0006 — Historia interpretacji zamiast cichej poprawki

**Status:** przyjęta (2026-11-13) · **Zastępuje:** — · **Zastąpiona przez:** —

## Kontekst

Wpisy o fabule zmieniają się, gdy dochodzą nowe sceny. Bez śladu zmiany czytelnik nie wie,
czy dane twierdzenie było takie od początku, czy zostało właśnie zrewidowane — a przy bazie
rosnącej w czasie to informacja kluczowa. Praktyka przejęta z VN.

## Decyzja

Każda zmiana twierdzenia wymaga wpisu w polu `interpretacje:` danej strony:

```yaml
interpretacje:
  - data: 2026-11-20 21:15
    zmiana: "Nieznajomy nie jest zjawą — scena 1-3 pokazuje go odchodzącego drogą."
    fragment: "Rola"
    poprzednio: "Możliwe, że nieznajomy jest zjawą zrodzoną z mgły nad wodą."
    pewnosc_poprzedniego: 30
```

- `data` — moment, w którym poprzednia wersja przestała obowiązywać (`RRRR-MM-DD GG:MM`),
- `poprzednio` — **dosłowne** brzmienie zastąpionego tekstu, nie streszczenie,
- `fragment` — tytuł sekcji, w której renderuje się boks „Poprzednia wersja”; musi istnieć.

## Konsekwencje

- Walidator sprawdza pola wpisu, format daty i istnienie wskazanej sekcji.
- Renderer pokazuje historię w miejscu twierdzenia, nie w osobnym archiwum — czytelnik
  widzi zmianę dokładnie tam, gdzie go interesuje.
- Brak wpisu przy zmianie to błąd procesu, nie błędu walidacji: build nie zgadnie, co autor
  miał na myśli, więc polega na dyscyplinie i audycie PR.
