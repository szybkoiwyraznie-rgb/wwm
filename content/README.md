# Zawartość kroniki

Ten katalog to **opowieść i świat**. Jeden plik markdown = jedna strona kroniki.
Nie ma tu kodu ani konfiguracji — tylko ludzie, miejsca, wydarzenia i związki między nimi.

## Katalogi

| Katalog | Typ strony | Co zawiera |
|---|---|---|
| `rozdzialy/` | `rozdzial` | rozdział opowieści: tytuł z poematu, rama epizodów |
| `epizody/` | `epizod` | epizod: kilka scen tworzących jedno wydarzenie |
| `sceny/` | `scena` | **jednostka opowieści** — dosłowne słowa i analiza |
| `watki/` | `watek` | nici fabularne biegnące przez sceny i rozdziały |
| `postacie/` | `postac` | osoby występujące w opowieści |
| `sekty/` | `sekta` | szkoły walki, klany, bractwa, gildie |
| `krainy/` | `kraina` | prowincje, regiony i miasta |
| `miejsca/` | `miejsce` | konkretne miejsca: świątynie, gospody, przełęcze |
| `konteksty/` | `kontekst` | nawiązania kulturowe: literatura, film, obyczaje wuxia |
| `pojecia/` | `pojecie` | hasła świata: przedmioty, obyczaje, wydarzenia |

Poza katalogami typów leżą dwa pliki:

- `co-nowego.md` — dziennik nowych rozdziałów i scen (wpisy `## RRRR-MM-DD GG:MM`,
  najnowszy na górze),
- `README.md` — ten plik (nie jest stroną bazy i nie trafia do artefaktu).

## Zasady

1. **Nazwa pliku jest slugiem.** `[a-z0-9-]`, ASCII, bez znaków diakrytycznych i CJK.
   Slug jest niezmienny, bo jest identyfikatorem w grafie.
2. **Typ musi zgadzać się z katalogiem.** Plik `content/sceny/x.md` z `typ: postac` to błąd.
3. **Nieznane pole frontmattera to błąd.** Literówka nie może po cichu wypaść z grafu.
4. **Każdy slug-relacja musi istnieć.** Martwy odsyłacz (w polu lub wikilinku `[[…]]`)
   zatrzymuje build.
5. **Granica opowieści jest twarda.** Strona może opisywać tylko to, co zostało już
   opowiedziane — pilnuje tego `rozgrywka/postep.json` (ADR 0007).
6. **Boks to sekcja, kolor to źródło.** Tytuł boksu pochodzi z nagłówka `##`; w środku
   leżą warstwy `{{dostawa`, `{{opracowanie`, `{{kwerenda`, `{{model`. Hipoteza jest
   zawsze `{{model pewnosc=NN`. Jeden boks może mieć kilka warstw (ADR 0016).
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
