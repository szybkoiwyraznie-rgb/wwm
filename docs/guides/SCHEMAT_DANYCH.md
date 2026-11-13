# Schemat danych

Jak wygląda strona w kronice, jakie pola są dozwolone i co je egzekwuje. Reguły opisane
tutaj sprawdza kod (`src/wwm/registry.js`) — build nie wypuści artefaktu, w którym któraś
z nich jest złamana.

**Zasada nadrzędna (ADR 0013):** typy stron opisują **opowieść**, nie interfejs gry.
Nie ma strony „zadanie”, „mapa postępu” ani „baza” — są rozdziały, epizody, sceny, wątki,
postacie, sekty, krainy i miejsca.

## 1. Jedna strona = jeden plik

```
content/<katalog>/<slug>.md
```

| Typ (`typ:`) | Katalog | Co opowiada |
|---|---|---|
| `rozdzial` | `content/rozdzialy/` | rozdział historii — rama epizodów |
| `epizod` | `content/epizody/` | epizod: kilka scen tworzących jedno wydarzenie |
| `scena` | `content/sceny/` | **jednostka opowieści** — dosłowne słowa i analiza |
| `watek` | `content/watki/` | nić fabularna biegnąca przez sceny i rozdziały |
| `postac` | `content/postacie/` | osoba występująca w opowieści |
| `sekta` | `content/sekty/` | szkoła walki, klan, bractwo, gildia |
| `kraina` | `content/krainy/` | prowincja, region, miasto — skala geografii opowieści |
| `miejsce` | `content/miejsca/` | konkretne miejsce: świątynia, gospoda, przełęcz |
| `kontekst` | `content/konteksty/` | nawiązanie kulturowe: księga, poemat, obyczaj wuxia |
| `pojecie` | `content/pojecia/` | hasło świata: przedmiot, obyczaj, wydarzenie |
| `relacja` | `content/relacje/` | związek między postaciami |

Typ i katalog muszą się zgadzać. Nazwa pliku **jest** slugiem (`SLUG_RE`: `[a-z0-9-]`,
bez znaków diakrytycznych i CJK). Slug jest niezmienny — zmiana zrywa cały graf.

## 2. Frontmatter: pola wspólne

| Pole | Wymagane | Znaczenie |
|---|---|---|
| `typ` | tak | jeden z typów powyżej |
| `slug` | tak | identyfikator; musi zgadzać się z nazwą pliku |
| `tytul` | tak | nazwa widoczna w kronice |
| `tytul_ja` | nie | zapis oryginalny (pismo chińskie) |
| `tytul_en` | nie | nazwa angielska |
| `tagi` | nie | lista slugów, swobodna |
| `zrodla` | nie | lista adresów http(s) potwierdzających twierdzenia |
| `utworzono` | nie | data `RRRR-MM-DD` |
| `interpretacje` | nie | historia zmian decyzji — §6 |

**Nieznane pole jest błędem.** Literówka w nazwie pola po cichu wypadałaby z grafu.
Pustą listę (`[]`) wolno zostawić — znaczy „jeszcze nie wiem”.

## 3. Pola specyficzne per typ

### `rozdzial`

| Pole | Znaczenie |
|---|---|
| `numer` | liczba ≥ 1; numeracja rozdziałów musi być ciągła |
| `tytul_oboczny` | tytuł chiński z poematu i jego polskie brzmienie |
| `epizody` | lista slugów epizodów rozdziału |
| `watki`, `krainy`, `sekty`, `postacie` | listy slugów |
| `status` | `rozegrane` / `w-toku` / `nierozpoczete` |
| `nastepny` | slug następnego rozdziału (pojedynczy) |

Sekcja obowiązkowa: `## Streszczenie`.

### `epizod`

| Pole | Znaczenie |
|---|---|
| `rozdzial` | slug rozdziału (pojedynczy) |
| `kolejnosc` | liczba ≥ 1 — pozycja w rozdziale, ciągła |
| `rodzaj` | `glowny` / `poboczny` / `spotkanie` / `zwiad` / `wspomnienie` |
| `status` | jak wyżej |
| `sceny` | lista slugów scen epizodu |
| `postacie`, `krainy`, `sekty`, `miejsca`, `watki`, `konteksty` | listy slugów |

Sekcja obowiązkowa: `## Streszczenie`.

### `scena` — najważniejszy typ

| Pole | Znaczenie |
|---|---|
| `epizod` | slug epizodu (pojedynczy) |
| `numer_sceny` | numer w obrębie epizodu jako **tekst** (`"1-1"`, `"2-7"`) |
| `kolejnosc` | globalny porządek opowieści, liczba ≥ 1, ciągła od 1 |
| `streszczenie` | jedno–dwa zdania; trafia na listy i do chronologii |
| `zapis` | nazwa pliku w `rozgrywka/zapisy/`, z którego pochodzi `:::zapis` |
| `postacie`, `krainy`, `miejsca`, `sekty`, `watki`, `konteksty` | listy slugów |
| `sekcje_analizy` | mapowanie `"Podsekcja → Nagłówek analizy"` |

Sekcje obowiązkowe: `## Treść sceny` i `## Analiza`. Scena musi mieć **co najmniej dwa**
elementy treści (kwestie/narracje) i **co najmniej jeden** blok `:::zapis`, który jest
dosłownym fragmentem archiwum (ADR 0008).

### `watek`

| Pole | Znaczenie |
|---|---|
| `rodzaj_watku` | `glowny` / `poboczny` / `motyw` / `tajemnica` / `romans` / `polityczny` / `mistyczny` / `inne` |
| `stan` | swobodny tekst: otwarty, zamknięty, zawieszony |
| `postacie`, `sceny`, `rozdzialy`, `epizody`, `konteksty` | listy slugów |

### `postac`

| Pole | Znaczenie |
|---|---|
| `rola` | `protagonista` / `antagonista` / `sojusznik` / `mentor` / `drugoplanowa` / `narrator` / `inne` |
| `pseudonim` | przydomek, jeśli różny od `tytul` |
| `przydzial` | funkcja w świecie (np. strażnik przystani) |
| `pierwsze_wystapienie` | slug sceny pierwszego pojawienia się |
| `sekta`, `kraina` | pojedyncze slugi przynależności |
| `krainy`, `miejsca`, `watki`, `relacje` | listy slugów |

### `sekta`

| Pole | Znaczenie |
|---|---|
| `rodzaj` | `szkola` / `klan` / `bractwo` / `gildia` / `zakon` / `dwór` / `inne` |
| `siedziba` | slug miejsca (pojedynczy) |
| `kraina` | slug krainy |
| `postacie`, `watki`, `konteksty`, `epizody` | listy slugów |

### `kraina`

| Pole | Znaczenie |
|---|---|
| `rodzaj` | `prowincja` / `region` / `miasto` / `dzielnica` / `kraina` / `inne` |
| `region` | większa całość, jeśli kraina jest jej częścią (tekst) |
| `rozdzial` | slug rozdziału, w którym kraina się pojawia |
| `sekty`, `postacie`, `miejsca`, `watki` | listy slugów |

### `miejsce`

| Pole | Znaczenie |
|---|---|
| `rodzaj` | swobodny tekst: świątynia, gospoda, przełęcz… |
| `kraina` | slug krainy (pojedynczy) |
| `sekta` | slug sekty, do której miejsce należy |
| `postacie`, `konteksty` | listy slugów |

### `kontekst`

| Pole | Znaczenie |
|---|---|
| `rodzaj` | `ksiega` / `poemat` / `film` / `serial` / `manga` / `gra` / `opera` / `podanie` / `termin` / `inne` |
| `dzielo` | tytuł dzieła, jeśli kontekst je wskazuje |
| `autor` | autor lub tradycja |
| `rok` | liczba całkowita |
| `postacie`, `pojecia`, `watki` | listy slugów |

### `pojecie`

| Pole | Znaczenie |
|---|---|
| `rodzaj` | `organizacja` / `frakcja` / `miejscowosc` / `kultura` / `technika` / `przedmiot` / `wydarzenie` / `inne` |
| `postacie`, `krainy`, `sekty`, `miejsca`, `konteksty` | listy slugów |

### `relacja`

| Pole | Znaczenie |
|---|---|
| `postacie` | lista ≥ 2 slugów, bez powtórzeń |
| `rodzaj_relacji` | `rodzina` / `przyjazn` / `romans` / `rywalizacja` / `konflikt` / `sojusz` / `mentor` / `tajemnica` / `inne` |
| `watki` | lista slugów |

## 4. Pola-relacje (graf)

Każde z tych pól jest sprawdzane: cel musi istnieć i mieć właściwy typ.

| Pole | Cel | Kształt |
|---|---|---|
| `rozdzial` | rozdział | pojedynczy |
| `nastepny` | rozdział | pojedynczy |
| `epizod` | epizod | pojedynczy |
| `kraina` | kraina | pojedynczy |
| `sekta` | sekta | pojedynczy |
| `siedziba` | miejsce | pojedynczy |
| `pierwsze_wystapienie` | scena | pojedynczy |
| `epizody` | epizod | lista |
| `sceny` | scena | lista |
| `rozdzialy` | rozdział | lista |
| `krainy` | kraina | lista |
| `sekty` | sekta | lista |
| `miejsca` | miejsce | lista |
| `postacie` | postać | lista |
| `watki` | wątek | lista |
| `relacje` | relacja | lista |
| `konteksty` | kontekst | lista |
| `pojecia` | pojęcie | lista |

Poza frontmatterem graf tworzą **wikilinki** w treści: `[[slug]]` albo `[[slug|etykieta]]`.
Martwy wikilink przerywa build. Sekcja „Powiązania” powstaje sama z obu źródeł.

## 5. Poziomy wiarygodności (boksy)

Treść dzieli się na boksy. Poziom mówi, **czym fragment jest**, a nie jak bardzo jest pewny.
Otwarcie bloku to linia `{{poziom`, zamknięcie — linia `}}`. Bloki nie zagnieżdżają się.

| Blok | Rola | Do czego |
|---|---|---|
| `{{skrypt` | słowa opowieści | dialogi i narracja w dosłownym brzmieniu |
| `{{streszczenie` | streszczenie | zwięzły opis wydarzeń własnymi słowami |
| `{{menu` | kronika i księgi | opisy świata spisane w grze: encyklopedia, dziennik, karty postaci |
| `{{zrodlo` | sprawdzone źródło | twierdzenie potwierdzone w źródle zewnętrznym (adres w `zrodla`) |
| `{{wiedza` | kontekst kulturowy | tło z kultury Chin i wuxia, bez potwierdzenia w źródle |
| `{{hipoteza pewnosc=NN` | interpretacja | odczytanie opowieści z jawną pewnością |
| `{{struktura` | powiązania | wyliczenie relacji, nie narracja |

Zasady:

- `pewnosc=` przysługuje **wyłącznie** `{{hipoteza}}` i jest liczbą 0–100.
- `{{hipoteza}}` bez `pewnosc=` to błąd — interpretacja bez prawdopodobieństwa nie istnieje.
- Progi opisowe: **≥ 80** mocno uzasadnione, **50–79** możliwe, **< 50** słabo uzasadnione.
  Pewność jest szacunkiem porządkowym, nie statystyką; nie podnosi się jej bez nowego dowodu.
- Poziom `skrypt` nie służy do parafrazy. Skrót to `streszczenie`.
- Blok `:::zapis` (potrójny dwukropek) to osobny mechanizm: surowy cytat archiwum wewnątrz
  sceny, sprawdzany znak po znaku przez `npm run zapis`.

## 6. Historia interpretacji

Zmiana twierdzenia wymaga wpisu w `interpretacje:`:

```yaml
interpretacje:
  - data: 2026-11-13 18:40
    zmiana: "Nieznajomy nie jest duchem przystani — scena pokazuje go odchodzącego drogą."
    fragment: "Rola"
    poprzednio: "Możliwe, że nieznajomy jest zjawą zrodzoną z mgły nad wodą."
    pewnosc_poprzedniego: 30
```

| Pole | Znaczenie |
|---|---|
| `data` | `RRRR-MM-DD GG:MM` — moment, w którym poprzednia wersja przestała obowiązywać |
| `zmiana` | co i dlaczego się zmieniło |
| `autor` | kto dokonał zmiany (opcjonalnie) |
| `dotyczy` | czego dotyczy (opcjonalnie) |
| `fragment` | tytuł sekcji, w której pokaże się boks „Poprzednia wersja” |
| `poprzednio` | **dosłowne** brzmienie zastąpionego tekstu, nie streszczenie |
| `pewnosc` | nowa pewność interpretacji |
| `pewnosc_poprzedniego` | poprzednia pewność |

`fragment` musi wskazywać istniejącą sekcję `##` w treści.

## 7. Język widocznej treści

Wszystko, co czyta człowiek — opisy, streszczenia, nagłówki, legenda, dziennik — mówi
o świecie i wydarzeniach. Nie mówi o powstawaniu kroniki, o bazie, o materiałach ani
o pracy redakcyjnej. Pilnuje tego `test/jezyk.test.js` (ADR 0014).

## 8. Minimalny przykład

```markdown
---
typ: scena
slug: przyklad-sc01
tytul: "Przykładowa scena"
epizod: epizod-1-1
numer_sceny: "1-1"
kolejnosc: 1
streszczenie: "Jedno zdanie o tym, co się wydarzyło."
zapis: przyklad-001.md
postacie: [przykladowa-postac]
krainy: [qinghe]
tagi: [przyklad]
utworzono: 2026-11-13
---

{{skrypt

## Treść sceny

:::zapis
**Postać:** Kwestia przepisana dosłownie z archiwum.
...

}}

{{hipoteza pewnosc=40

## Analiza

Wniosek z uzasadnieniem, którego nie da się potwierdzić wprost.

}}
```

Walidacja: `src/wwm/registry.js` (`walidujStrone`, `sprawdzGraniceFabuly`,
`sprawdzWiernoscSceny`). Granica opowieści: ADR 0007. Poziomy: ADR 0004. Typy: ADR 0013.
