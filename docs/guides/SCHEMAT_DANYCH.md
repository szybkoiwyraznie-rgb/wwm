# Schemat danych

Jak wygląda wpis w bazie, jakie pola są dozwolone i co je egzekwuje. Reguły opisane tutaj
są sprawdzane przez kod (`src/wwm/registry.js`), a nie tylko deklarowane — build nie wypuści
artefaktu, w którym któraś z nich jest złamana.

## 1. Jedna strona = jeden plik

```
content/<katalog>/<slug>.md
```

| Typ (`typ:`) | Katalog | Co opisuje |
|---|---|---|
| `rozdzial` | `content/rozdzialy/` | rozdział gry — region i rama fabularna |
| `zadanie` | `content/zadania/` | zadanie główne lub poboczne, grupa scen |
| `scena` | `content/sceny/` | **jednostka śledzenia fabuły** — dosłowny zapis i analiza |
| `postac` | `content/postacie/` | osoba występująca w rozegranym materiale |
| `miejsce` | `content/miejsca/` | kraina, miasto, obiekt |
| `pojecie` | `content/pojecia/` | hasło świata: organizacja, technika, przedmiot, wydarzenie |
| `kontekst` | `content/konteksty/` | nawiązanie kulturowe: literatura, film, motyw wuxia |
| `watek` | `content/watki/` | nić fabularna biegnąca przez sceny i rozdziały |
| `relacja` | `content/relacje/` | związek między dwiema lub więcej postaciami |

Typ i katalog muszą się zgadzać. Nazwa pliku **jest** slugiem (`SLUG_RE`: `[a-z0-9-]`,
bez znaków diakrytycznych i CJK). Slug jest niezmienny — zmiana zrywa cały graf.

## 2. Frontmatter: pola wspólne

| Pole | Wymagane | Znaczenie |
|---|---|---|
| `typ` | tak | jeden z typów powyżej |
| `slug` | tak | identyfikator; musi zgadzać się z nazwą pliku |
| `tytul` | tak | nazwa widoczna w witrynie |
| `tytul_ja` | nie | zapis oryginalny (pismo chińskie) |
| `tytul_en` | nie | nazwa angielska z gry |
| `tagi` | nie | lista slugów, swobodna; wzorzec `[a-z0-9-]` |
| `zrodla` | nie | lista adresów http(s) potwierdzających twierdzenia |
| `utworzono` | nie | data `RRRR-MM-DD` |
| `interpretacje` | nie | historia zmian decyzji — §5 |

**Nieznane pole jest błędem.** Literówka w nazwie pola po cichu wypadałaby z grafu, więc
walidator jej nie toleruje. Pustą listę (`[]`) wolno zostawić — znaczy „jeszcze nie wiem”.

## 3. Pola specyficzne per typ

### `rozdzial`

| Pole | Znaczenie |
|---|---|
| `numer` | liczba ≥ 1; numeracja rozdziałów musi być ciągła |
| `region` | nazwa krainy w grze (tekst, np. Qinghe) |
| `zadania` | lista slugów zadań w rozdziale |
| `postacie`, `miejsca` | listy slugów występujących w rozdziale |
| `status` | `rozegrane` / `w-toku` / `nierozpoczete` |
| `nastepny` | slug następnego rozdziału (pojedynczy) |

Sekcja obowiązkowa: `## Streszczenie`.

### `zadanie`

| Pole | Znaczenie |
|---|---|
| `rozdzial` | slug rozdziału (pojedynczy) |
| `kolejnosc` | liczba ≥ 1 — pozycja w rozdziale, ciągła |
| `rodzaj` | `glowne` / `poboczne` / `spotkanie` / `eksploracja` |
| `status` | jak wyżej |
| `sceny` | lista slugów scen zadania |
| `postacie`, `miejsca`, `watki` | listy slugów |

Sekcja obowiązkowa: `## Streszczenie`.

### `scena` — najważniejszy typ

| Pole | Znaczenie |
|---|---|
| `zadanie` | slug zadania (pojedynczy) |
| `numer_sceny` | numer w obrębie zadania jako **tekst** (`"1-1"`, `"2-7"`) |
| `kolejnosc` | globalny porządek rozegrania, liczba ≥ 1, ciągła od 1 |
| `streszczenie` | jedno–dwa zdania; wymagane, bo trafia na listy |
| `zapis` | nazwa pliku w `rozgrywka/zapisy/`, z którego pochodzi `:::zapis` |
| `postacie`, `miejsca`, `watki`, `konteksty` | listy slugów |
| `sekcje_analizy` | mapowanie `"Podsekcja → Nagłówek analizy"` |

Sekcje obowiązkowe: `## Treść sceny` i `## Analiza`. Scena musi mieć **co najmniej dwa**
elementy treści (kwestie/narracje) i **co najmniej jeden** blok `:::zapis`, który jest
dosłownym fragmentem archiwum (ADR 0008).

### `postac`

| Pole | Znaczenie |
|---|---|
| `rola` | `protagonista` / `antagonista` / `sojusznik` / `mentor` / `drugoplanowa` / `narrator` / `inne` |
| `pseudonim` | przydomek, jeśli różny od `tytul` |
| `przydzial` | krótka funkcja w świecie (np. strażnik przystani) |
| `pierwsze_wystapienie` | slug sceny pierwszego pojawienia się |
| `miejsca`, `watki`, `relacje` | listy slugów |

Sekcja obowiązkowa: `## Opis`.

### `miejsce`

| Pole | Znaczenie |
|---|---|
| `rodzaj` | swobodny tekst: miasto, klasztor, przełęcz… |
| `region` | kraina |
| `rozdzial` | slug rozdziału, w którym miejsce po raz pierwszy się pojawia |
| `postacie`, `konteksty` | listy slugów |

### `pojecie`

| Pole | Znaczenie |
|---|---|
| `rodzaj` | `organizacja` / `frakcja` / `miejscowosc` / `kultura` / `technika` / `przedmiot` / `wydarzenie` / `inne` |
| `postacie`, `miejsca`, `konteksty` | listy slugów |

### `kontekst`

| Pole | Znaczenie |
|---|---|
| `rodzaj` | `ksiega` / `poemat` / `film` / `serial` / `manga` / `gra` / `opera` / `podanie` / `termin` / `inne` |
| `dzielo` | tytuł dzieła, jeśli kontekst je wskazuje |
| `autor` | autor lub tradycja |
| `rok` | liczba całkowita (rok powstania / wydania) |
| `postacie`, `pojecia` | listy slugów |

### `watek`

| Pole | Znaczenie |
|---|---|
| `rodzaj_watku` | `glowny` / `poboczny` / `motyw` / `tajemnica` / `romans` / `polityczny` / `mistyczny` / `inne` |
| `stan` | swobodny tekst: otwarty, zamknięty, zawieszony |
| `postacie`, `sceny`, `rozdzialy` | listy slugów |

### `relacja`

| Pole | Znaczenie |
|---|---|
| `postacie` | lista ≥ 2 slugów, bez powtórzeń |
| `rodzaj_relacji` | `rodzina` / `przyjazn` / `romans` / `rywalizacja` / `konflikt` / `sojusz` / `mentor` / `tajemnica` / `inne` |
| `watki` | lista slugów |

## 4. Pola-relacje (graf)

Każde z tych pól jest sprawdzane: cel musi istnieć i mieć właściwy typ. Wartość pojedyncza,
jeśli pole nie jest listą.

| Pole | Cel | Kształt |
|---|---|---|
| `rozdzial` | rozdział | pojedynczy |
| `nastepny` | rozdział | pojedynczy |
| `zadanie` | zadanie | pojedynczy |
| `pierwsze_wystapienie` | scena | pojedynczy |
| `zadania` | zadanie | lista |
| `sceny` | scena | lista |
| `rozdzialy` | rozdział | lista |
| `postacie` | postać | lista |
| `miejsca` | miejsce | lista |
| `watki` | wątek | lista |
| `relacje` | relacja | lista |
| `konteksty` | kontekst | lista |
| `pojecia` | pojęcie | lista |

Poza frontmatterem graf tworzą **wikilinki** w treści: `[[slug]]` albo `[[slug|etykieta]]`.
Martwy wikilink przerywa build. Sekcja „Powiązania” powstaje sama z obu źródeł.

## 5. Historia interpretacji

Zmiana twierdzenia wymaga wpisu w `interpretacje:`. To lista obiektów:

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
| `pewnosc` | nowa pewność hipotezy, jeśli dotyczy |
| `pewnosc_poprzedniego` | poprzednia pewność |

`fragment` musi wskazywać istniejącą sekcję `##` w treści. Wpis bez `poprzednio` jest
dozwolony (pierwsza wersja), ale `poprzednio` bez `fragment` — nie.

## 6. Poziomy wiarygodności (boksy)

Treść dzieli się na boksy. Poziom mówi, **czym fragment jest**, a nie jak bardzo jest pewny —
dlatego kolor jest cechą pochodzenia informacji. Otwarcie bloku to linia `{{poziom`,
zamknięcie — linia `}}`. Bloki nie zagnieżdżają się.

| Blok | Kolor / rola | Do czego |
|---|---|---|
| `{{skrypt` | dosłowny zapis | tekst sceny przepisany bez zmian z archiwum |
| `{{streszczenie` | streszczenie | zwięzły opis bez cytowania |
| `{{menu` | opis z ekranu | treść przepisana z UI gry: opisy zadań, notatki, dziennik |
| `{{zrodlo` | potwierdzone źródłem | twierdzenie sprawdzone w źródle zewnętrznym (adres w `zrodla`) |
| `{{wiedza` | kontekst niepotwierdzony | wiedza ogólna: kultura Chin, konwencja wuxia |
| `{{hipoteza pewnosc=NN` | hipoteza | wniosek z jawnym prawdopodobieństwem |
| `{{struktura` | spis powiązań | wyliczenie relacji, nie narracja |

Zasady:

- `pewnosc=` przysługuje **wyłącznie** `{{hipoteza}}` i jest liczbą 0–100.
- `{{hipoteza}}` bez `pewnosc=` to błąd — hipoteza bez prawdopodobieństwa nie istnieje.
- Progi opisowe: **≥ 80** — bardzo prawdopodobne, **50–79** — możliwe, **< 50** — słabo
  uzasadnione. Pewność jest szacunkiem porządkowym, nie statystyką; nie podnosi się jej bez
  nowego dowodu.
- Poziom `skrypt` nie służy do parafrazy. Jeśli tekst został skrócony, to jest
  `streszczenie`.
- Blok `:::zapis` (potrójny dwukropek) to osobny mechanizm: surowy cytat archiwum wewnątrz
  sceny, sprawdzany znak po znaku przez `npm run zapis`.

## 7. Sekcje i swoboda formy

Obowiązkowe są tylko sekcje wymienione przy typach. Poza nimi wolno dodawać dowolne `##` —
„Tło”, „Nawiązania kulturowe”, „Wątki w scenie”, „Sprzeczności”, „Pytania otwarte”.
Scena ma dodatkowo:

- `## Analiza` z podsekcjami mapowanymi przez `sekcje_analizy`,
- `## Nawiązania kulturowe` — gdy scena wnosi kontekst,
- `## Wątki w scenie` — gdy trzeba pokazać, co wątek tu zyskuje.

Nie ma zamkniętego słownika tagów ani jednego obowiązującego stylu narracji.

## 8. Minimalny przykład

```markdown
---
typ: scena
slug: przyklad-sc01
tytul: "Przykładowa scena"
zadanie: zadanie-1-1
numer_sceny: "1-1"
kolejnosc: 1
streszczenie: "Jedno zdanie o tym, co się wydarzyło."
zapis: przyklad-001.md
postacie: [przykladowa-postac]
miejsca: [przykladowe-miejsce]
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

Wniosek z uzasadnieniem, którego nie da się potwierdzić w zapisie.

}}
```

Walidacja: `src/wwm/registry.js` (`walidujStrone`, `sprawdzGraniceFabuly`,
`sprawdzWiernoscSceny`). Granica fabuły: ADR 0007. Poziomy: ADR 0005.
