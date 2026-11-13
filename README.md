# Where Winds Meet — baza fabuły

> **Agent / nowa sesja:** jedyny plik startowy to [`AGENTS.md`](AGENTS.md).
> Po jego odczytaniu: podgląd na żywo → plan → lektura obowiązkowa → praca w pętli sceny.
> Nie czekaj na osobne zlecenie rozszerzania bazy w granicach opisanych w ADR-ach.

Dziennik rozgrywki i wiki o świecie gry **Where Winds Meet** (网易 *燕云十六声*, *Yanyun
Shiliu Sheng*), prowadzone równolegle z graniem. Baza rośnie w tempie przechodzenia kolejnych
scen: nie opisuje całej gry, a tylko to, co zostało rozegrane.

**Podział pracy:** właściciel gra i przekazuje zapis scen. Agent zamienia zapis w bazę —
wpisy scen, postaci, miejsc, haseł i kontekstów kulturowych, powiązania między nimi oraz
analizy tego, skąd wzięte są poszczególne motywy. Witryna jest interfejsem do czytania
tych zależności.

**Trzy zdania, które wyznaczają wszystkie decyzje:** scena jest jednostką śledzenia fabuły.
Baza nie wyprzedza rozgrywki — nigdy. Kolor fragmentu mówi, czym on jest, a nie jak bardzo
jest pewny.

## Status

Fundamenty: struktura repozytorium, silnik witryny, walidacja integralności, build do jednego
pliku HTML, CI i publikacja na GitHub Pages. Baza zawiera **materiał zaślepkowy** — fikcyjne
sceny istniejące tylko po to, żeby szkielet miał na czym działać. Zostaną usunięte w całości
przy pierwszej prawdziwej dostawie; wszystkie mają tag `zaslepka`.

## Szybki start

```bash
npm test          # testy integralności bazy i dokumentacji
npm run build     # → dist/index.html (jeden samowystarczalny plik)
npm run serve     # podgląd na http://0.0.0.0:3000
```

Artefakt otwiera się też bezpośrednio z dysku (`file://`) — routing jest po hashu,
wyszukiwanie działa po stronie przeglądarki, zero zależności runtime. Katalog `dist/`
jest produktem buildu: nie jest wersjonowany i wolno go w każdej chwili nadpisać.

## Mapa projektu

| Ścieżka | Co to jest |
|---|---|
| `rozgrywka/zapisy/` | archiwum zapisu rozgrywki — materiał wejściowy, nietykalny |
| `rozgrywka/postep.json` | granica rozegranej fabuły; build odrzuca sceny poza nią |
| `content/rozdzialy/` | rozdziały gry |
| `content/zadania/` | zadania główne i poboczne z podziałem na sceny |
| `content/sceny/` | sceny: dosłowny zapis i analiza |
| `content/postacie/` | postacie występujące w rozegranym materiale |
| `content/miejsca/` | krainy, miasta, obiekty |
| `content/pojecia/` | hasła świata: organizacje, przedmioty, wydarzenia |
| `content/konteksty/` | nawiązania kulturowe: literatura, film, motywy wuxia |
| `content/watki/`, `content/relacje/` | nici fabularne i związki między postaciami |
| `content/co-nowego.md` | dziennik zmian widoczny w witrynie |
| `src/wwm/` | silnik witryny (ESM, zero zależności) |
| `tools/` | build, serwer podglądu, runner testów, kontrola zapisu |
| `test/` | testy integralności bazy i dokumentacji |
| `docs/` | ADR-y, przewodniki, lekcje |

## Zasady w skrócie

- **Baza jest grafem.** Rozdział → zadanie → scena → postać, miejsce, hasło, kontekst.
  Wszystko linkowane wikilinkami `[[slug]]` i polami frontmattera; build nie przepuści
  martwego odsyłacza.
- **Pochodzenie informacji jest widoczne.** `skrypt` (dosłowny zapis) / `streszczenie` /
  `menu` (opisy z ekranów gry) / `zrodlo` (sprawdzone w źródle) / `wiedza` (kontekst
  niepotwierdzony) / `hipoteza` (wniosek z pewnością 0–100) / `struktura` (spis powiązań).
- **Granica fabuły jest twarda.** Scena poza `rozgrywka/postep.json` wywala build.
  Pochodzenie informacji nie jest zgodą na spoiler.
- **Zmiana decyzji zostawia ślad.** Wpis w `interpretacje:` z dosłownym brzmieniem
  poprzedniej wersji i czasem, w którym przestała obowiązywać.
- **Slug jest niezmienny.** Zmiana identyfikatora zrywa cały graf.
- **Swoboda formy jest zaletą.** Nie ma zamkniętej listy sekcji ani słownika tagów.
- **Sesja agenta = jedna gałąź i jeden PR.** Scalanie należy do właściciela.

## Publikacja

Push do `main` → GitHub Actions (`pages.yml`) → testy → build → GitHub Pages.
Witryna jest publiczna i indeksowana.

## Pochodzenie projektu

Architektura jest hybrydą dwóch wcześniejszych baz właściciela:

- **[srw](https://github.com/szybkoiwyraznie-rgb/srw)** — poziomy wiarygodności wiedzy
  na fragmencie, boksy sekcji, walidacja grafu przy buildzie, jeden samowystarczalny
  artefakt HTML i publikacja na Pages;
- **VN Database** (repozytorium prywatne) — hipotezy z szacowaną pewnością, historia
  interpretacji w boksie, bramy pokrycia materiału i sekcje analizy powiązane z treścią.

Różnica wobec obu: jednostką jest scena gry open-world, a nie misja taktyczna ani scena
visual novel. Stąd własna hierarchia (rozdział → zadanie → scena), osobny dział kontekstów
kulturowych i twarda brama granicy rozegranej fabuły.
