# Zawartość bazy

Ten katalog to **baza wiedzy o fabule**. Jeden plik markdown = jedna strona witryny.
Nie ma tu kodu ani konfiguracji — tylko opisy świata gry i relacje między nimi.

## Katalogi

| Katalog | Typ strony | Co zawiera |
|---|---|---|
| `rozdzialy/` | `rozdzial` | rozdział gry: region, rama fabularna, lista zadań |
| `zadania/` | `zadanie` | zadanie główne lub poboczne, grupa scen |
| `sceny/` | `scena` | **jednostka śledzenia fabuły** — dosłowny zapis z archiwum i analiza |
| `postacie/` | `postac` | osoby występujące w rozegranym materiale |
| `miejsca/` | `miejsce` | krainy, miasta, obiekty |
| `pojecia/` | `pojecie` | hasła świata: organizacje, techniki, przedmioty, wydarzenia |
| `konteksty/` | `kontekst` | nawiązania kulturowe: literatura, film, motywy wuxia |
| `watki/` | `watek` | nici fabularne biegnące przez sceny |
| `relacje/` | `relacja` | związki między postaciami |

Poza katalogami typów leżą dwa pliki:

- `co-nowego.md` — dziennik nowego pokrycia fabuły (wpisy `## RRRR-MM-DD GG:MM`,
  najnowszy na górze),
- `README.md` — ten plik (nie jest stroną bazy i nie trafia do artefaktu).

## Zasady

1. **Nazwa pliku jest slugiem.** `[a-z0-9-]`, ASCII, bez znaków diakrytycznych i CJK.
   Slug jest niezmienny, bo jest identyfikatorem w grafie.
2. **Typ musi zgadzać się z katalogiem.** Plik `content/sceny/x.md` z `typ: postac` to błąd.
3. **Nieznane pole frontmattera to błąd.** Literówka nie może po cichu wypaść z grafu.
4. **Każdy slug-relacja musi istnieć.** Martwy odsyłacz (w polu lub wikilinku `[[…]]`)
   zatrzymuje build.
5. **Granica fabuły jest twarda.** Strona może opisywać tylko to, co zostało rozegrane —
   pilnuje tego `rozgrywka/postep.json` (ADR 0007).
6. **Poziomy wiarygodności zamiast jednolitej narracji:** `{{skrypt`, `{{streszczenie`,
   `{{menu`, `{{zrodlo`, `{{wiedza`, `{{hipoteza pewnosc=NN`, `{{struktura`.
7. **Hipoteza wymaga pewności** (0–100). Zmiana twierdzenia wymaga wpisu w `interpretacje:`.
8. **Swoboda formy.** Sekcje obowiązkowe są nieliczne; reszta należy do autora wpisu.

Pełny schemat pól, przykłady i reguły walidacji:
[`../docs/guides/SCHEMAT_DANYCH.md`](../docs/guides/SCHEMAT_DANYCH.md).
Procedura dopisywania sceny:
[`../docs/guides/PRZEPLYW_SCENY.md`](../docs/guides/PRZEPLYW_SCENY.md).

## Materiał zaślepkowy

Wszystkie wpisy w tym katalogu są **zaślepką testową** (tag `zaslepka`): fikcyjne sceny,
postacie i miejsca istniejące po to, żeby szkielet miał na czym działać. Zostaną usunięte
w całości przy pierwszej prawdziwej dostawie. Lista plików do usunięcia:

```bash
grep -rl "zaslepka" content/ --include=*.md
```
