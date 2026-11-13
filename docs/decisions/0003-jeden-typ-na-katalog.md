# 0003 — Jeden typ strony na katalog, nieznane pole to błąd

**Status:** przyjęta (2026-11-13) · **Zastępuje:** — · **Zastąpiona przez:** —

## Kontekst

Baza ma kilka warstw (rozdział, zadanie, scena, postać, miejsce, hasło, kontekst, wątek,
relacja). Można trzymać wszystko w jednym katalogu z polem `typ`, albo rozdzielić katalogami.

## Decyzja

- **Katalog wyznacza typ**: `content/sceny/` → `typ: scena`, itd. Loader przypisuje typ
  z konfiguracji, a walidator sprawdza zgodność.
- **Zamknięty słownik pól per typ** (`POLA_DOZWOLONE`). Nieznane pole jest błędem, bo
  literówka po cichu wypadałaby z grafu.
- Sekcje obowiązkowe są minimalne (`SEKCJE_WYMAGANE`): `## Opis` dla encji,
  `## Streszczenie` dla rozdziału i zadania, `## Treść sceny` + `## Analiza` dla sceny.
- Świadomie **nie ma** zamkniętej listy sekcji ani obowiązkowego słownika tagów.

## Konsekwencje

- Nowy typ strony wymaga wpisu w `KATALOGI`, `POLA_DOZWOLONE`, `SEKCJE_WYMAGANE`,
  routingu i widoku — to zmiana architektoniczna, nie treściowa.
- Literówka w nazwie pola zatrzymuje build zamiast cicho gubić relację.
- Swoboda formy jest zachowana: autor decyduje o sekcjach dodatkowych i tagach.
