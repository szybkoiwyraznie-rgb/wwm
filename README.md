# Where Winds Meet — kronika opowieści

> **Agent / nowa sesja:** jedyny plik startowy to [`AGENTS.md`](AGENTS.md).
> Po jego odczytaniu: podgląd na żywo → plan → lektura obowiązkowa → praca w pętli sceny.
> Nie czekaj na osobne zlecenie rozszerzania kroniki w granicach opisanych w ADR-ach.

Kronika opowieści z gry **Where Winds Meet** (网易 *燕云十六声*, *Yanyun Shiliu Sheng*),
prowadzona równolegle z graniem. Historia wędrowca w świecie jianghu rośnie w tempie
przechodzenia kolejnych scen: kronika nie opisuje całej gry, a tylko to, co zostało
już opowiedziane.

**Podział pracy:** właściciel gra i przekazuje zapis scen. Agent zamienia zapis w opowieść —
sceny, postacie, sekty, krainy, miejsca, wątki i konteksty kulturowe, powiązania między nimi
oraz analizy tego, skąd wzięte są poszczególne motywy. Witryna jest miejscem, w którym tę
historię się czyta.

**Trzy zdania, które wyznaczają wszystkie decyzje:** scena jest jednostką opowieści.
Kronika nie wyprzedza historii — nigdy. Kolor fragmentu mówi, czym on jest, a nie jak bardzo
jest pewny.

**Kronika opowiada historię, nie proces jej powstawania** (ADR 0014). Nie ma w niej „bazy”,
„wpisów”, „dostaw”, „interfejsu” ani pracy redakcyjnej — jest świat, ludzie i wydarzenia.
Strzeże tego brama testowa, a nie tylko dobra wola.

## Status

Fundamenty: struktura repozytorium, silnik witryny, walidacja integralności, build do jednego
pliku HTML, CI i publikacja na GitHub Pages. Kronika zawiera **materiał zaślepkowy** — fikcyjne
sceny istniejące tylko po to, żeby szkielet miał na czym działać. Zostaną usunięte w całości
przy pierwszym prawdziwym zapisie z gry; wszystkie mają znacznik `zaslepka`.

## Szybki start

```bash
npm test          # integralność kroniki, języka i dokumentacji
npm run build     # → dist/index.html (jeden samowystarczalny plik)
npm run serve     # podgląd na http://0.0.0.0:3000
```

Witryna otwiera się też bezpośrednio z dysku (`file://`) — routing jest po hashu,
wyszukiwanie działa po stronie przeglądarki, zero zależności runtime. Katalog `dist/`
jest produktem buildu: nie jest wersjonowany i wolno go w każdej chwili nadpisać.

## Mapa projektu

| Ścieżka | Co to jest |
|---|---|
| `rozgrywka/zapisy/` | archiwum zapisu rozgrywki — materiał wejściowy, nietykalny |
| `rozgrywka/postep.json` | granica opowiedzianej historii; build odrzuca sceny poza nią |
| `content/rozdzialy/` | rozdziały opowieści |
| `content/epizody/` | epizody: kilka scen tworzących jedno wydarzenie |
| `content/sceny/` | sceny: dosłowne słowa i analiza |
| `content/watki/` | nici fabularne biegnące przez epizody i rozdziały |
| `content/postacie/` | osoby występujące w opowieści |
| `content/sekty/` | szkoły walki, klany, bractwa, gildie |
| `content/krainy/` | prowincje, regiony i miasta |
| `content/miejsca/` | konkretne miejsca w krainach |
| `content/konteksty/` | nawiązania kulturowe: literatura, film, obyczaje wuxia |
| `content/pojecia/` | hasła świata: przedmioty, obyczaje, wydarzenia |
| `content/relacje/` | związki między postaciami |
| `content/co-nowego.md` | dziennik nowych rozdziałów i scen widoczny w witrynie |
| `src/wwm/` | silnik kroniki (ESM, zero zależności) |
| `tools/` | build, serwer podglądu, runner testów, kontrola zapisu |
| `test/` | integralność kroniki, języka widocznej treści i dokumentacji |
| `docs/` | decyzje, przewodniki, lekcje |

## Zasady w skrócie

- **Kronika jest grafem.** Rozdział → epizod → scena → postać, sekta, kraina, miejsce, kontekst.
  Wszystko linkowane wikilinkami `[[slug]]` i polami frontmattera; build nie przepuści
  martwego odsyłacza.
- **Pochodzenie informacji jest widoczne.** `skrypt` (dosłowny zapis) / `streszczenie` /
  `menu` (opisy z ekranów gry) / `zrodlo` (sprawdzone w źródle) / `wiedza` (kontekst
  niepotwierdzony) / `hipoteza` (wniosek z pewnością 0–100) / `struktura` (spis powiązań).
- **Granica opowieści jest twarda.** Scena poza `rozgrywka/postep.json` wywala build.
  Pochodzenie informacji nie jest zgodą na spoiler.
- **Zmiana decyzji zostawia ślad.** Wpis w `interpretacje:` z dosłownym brzmieniem
  poprzedniej wersji i czasem, w którym przestała obowiązywać.
- **Slug jest niezmienny.** Zmiana identyfikatora zrywa cały graf.
- **Kronika nie mówi o sobie.** Żadnych „baz”, „wpisów”, „dostaw” ani opisu pracy —
  tylko świat i wydarzenia. Brama: `test/jezyk.test.js`.
- **Swoboda formy jest zaletą.** Nie ma zamkniętej listy sekcji ani słownika tagów.
- **Sesja agenta = jedna gałąź i jeden PR.** Scalanie należy do właściciela.

## Publikacja

Push do `main` → GitHub Actions (`pages.yml`) → testy → build → GitHub Pages.
Witryna jest publiczna i indeksowana.

## Pochodzenie projektu

Architektura jest hybrydą dwóch wcześniejszych kronik właściciela:

- **[srw](https://github.com/szybkoiwyraznie-rgb/srw)** — poziomy wiarygodności wiedzy
  na fragmencie, boksy sekcji, walidacja grafu przy buildzie, jeden samowystarczalny
  artefakt HTML i publikacja na Pages;
- **VN Database** (repozytorium prywatne) — hipotezy z szacowaną pewnością, historia
  interpretacji w boksie, bramy pokrycia materiału i sekcje analizy powiązane z treścią.

Różnica wobec obu: jednostką jest scena gry open-world, a nie misja taktyczna ani scena
visual novel. Stąd własna hierarchia (rozdział → epizod → scena), osobne działy sekt i krain,
osobna warstwa kontekstów kulturowych i twarda brama granicy opowiedzianej historii.

Układ działów wzięty jest z tego, jak opowieść dzieli się w samej grze: rozdziały mają
tytuły z klasycznych poematów (*踏莎行*, *西江月*), epizody grupują sceny w wydarzenia,
a świat dzieli się na krainy (Qinghe, Kaifeng, Hexi, Qingzhou) i sekty.
