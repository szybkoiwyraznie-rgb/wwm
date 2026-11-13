# Przepływ sceny

Procedura przy nowej dostawie zapisu rozgrywki. Kolejność ma znaczenie: krok 1 otwiera
budowę scen, krok 8 zamyka pracę zielonym buildem. Opis dla człowieka i dla agenta jest
ten sam — nie ma dwóch prawd o tym, jak baza rośnie.

## Materiał wejściowy

| Co | Gdzie |
|---|---|
| Surowy zapis sesji gry | `rozgrywka/zapisy/<RRRR-MM-DD>-<nr>.md` |
| Informacja, które zadanie/scena to są | w wiadomości właściciela lub w notatce nad sceną |
| Granica rozegranej fabuły | `rozgrywka/postep.json` |

Zapisu się nie poprawia. Archiwum jest dowodem, na którym opiera się weryfikacja
dosłowności (ADR 0008).

## Krok 0 — rozpoznanie

1. Sprawdź stan: `git rev-parse --abbrev-ref HEAD`, `git status --short`, `npm test`.
2. Zbuduj i uruchom podgląd, jeśli jeszcze nie działa (`npm run build`, `npm run serve`
   jako proces długotrwały). Pracuj z widocznym wynikiem, nie w ciemno.
3. Przeczytaj nowy materiał w całości, zanim cokolwiek napiszesz.

## Krok 1 — granica fabuły

`rozgrywka/postep.json` → `ostatnia_scena` = slug **ostatniej rozegranej** sceny,
`zaktualizowano` = dzisiejsza data. Jeśli scena dopiero powstaje, ten krok i tak idzie
pierwszy (razem z krokiem 2), bo build odrzuca sceny za granicą (ADR 0007).

## Krok 2 — podział na sceny

Podział wynika z gry, nie z wygody pisania:

- **jedna scena = jedna jednostka rozgrywki** (jedno spotkanie, jedna rozmowa, jedno
  przejście przez miejsce), zamknięta w spójnym momencie,
- minimum **2 elementy treści** (kwestie/narracje); pojedyncze zdanie dołącz do sąsiedniej
  sceny (ADR 0008),
- `numer_sceny` to numer z zadania (`"1-1"`, `"2-3"`), a `kolejnosc` — globalna liczba
  w całej bazie, **ciągła od 1**, bez dziur i duplikatów,
- granica między scenami nie może przecinać jednej wymiany zdań.

Gdy zapis jest długi, najpierw wypisz plan podziału (numery, tytuły, jedno zdanie), dopiero
potem pisz wpisy.

## Krok 3 — wpis sceny (`content/sceny/<slug>.md`)

1. Frontmatter wg `SCHEMAT_DANYCH.md` §3 — `zadanie`, `numer_sceny`, `kolejnosc`,
   `streszczenie`, `zapis`, listy `postacie`/`miejsca`/`watki`/`konteksty`.
2. `{{skrypt` + `## Treść sceny` + blok `:::zapis` — **dosłowny** fragment archiwum.
   Każdy blok `:::zapis` jest osobnym cytatem; wklejaj bez przeredagowania, bez skracania
   w środku zdania i bez poprawiania literówek.
3. `## Analiza` z podsekcjami + pole `sekcje_analizy` mapujące je na nagłówki analizy.
4. Bloki analizy według pochodzenia informacji: `{{streszczenie` (co się stało),
   `{{wiedza` (kontekst kulturowy bez potwierdzenia), `{{zrodlo` (potwierdzone, z adresem
   w `zrodla`), `{{hipoteza pewnosc=NN` (wniosek).
5. `## Nawiązania kulturowe` — gdy scena wnosi motyw z literatury, filmu lub sztuk walki.
6. `## Wątki w scenie` — co dany wątek zyskuje w tej scenie.

## Krok 4 — zadanie i rozdział

- Nowe zadanie: `content/zadania/<slug>.md` z `rozdzial`, `kolejnosc` (ciągła w rozdziale),
  `rodzaj`, `status`, `sceny` i `## Streszczenie`.
- Rozdział: `content/rozdzialy/<slug>.md` z `numer`, `region`, `zadania`, `status`,
  `## Streszczenie`; `nastepny` tylko gdy następny rozdział istnieje jako strona.
- Numeracja zadań i rozdziałów musi być ciągła — build to sprawdza.

## Krok 5 — encje

Dla każdej postaci, miejsca, hasła i kontekstu, który pojawia się **wprost** w scenie:

- **istnieje** → dopisz scenę do jej pól (`sceny` u wątku, `postacie`, `miejsca`) i uzupełnij
  treść, jeśli zapis wniósł nową informację; nie zmieniaj sluga,
- **nie istnieje i jest potrzebna** → nowy plik w odpowiednim katalogu, `## Opis`,
  `pierwsze_wystapienie` (postać) lub `rozdzial` (miejsce),
- **nie istnieje i nie jest potrzebna** → nie zakładaj wpisu. Martwy wpis bez treści
  obciąża bazę i niczego nie tłumaczy.

Nie zakładaj encji na podstawie domysłu z innych stron ani z wiedzy o grze.

## Krok 6 — relacje i wątki

- Uzupełnij pola-relacje w obie strony, gdzie to naturalne (scena ↔ postać ↔ relacja).
- Relacja powstaje, gdy zapis pokazuje **konkretne** zachowanie między postaciami; pole
  `postacie` musi mieć ≥ 2 slugi, bez powtórzeń.
- Wątek aktualizuj tylko wtedy, gdy scena rzeczywiście go posuwa; `stan` zmieniaj świadomie.
- Wikilinki `[[slug]]` w treści są równie ważne jak frontmatter — z nich powstają
  „Powiązania”.

## Krok 7 — dziennik zmian

Na górze `content/co-nowego.md` nowy wpis:

```markdown
## 2026-11-13 21:40

- Scena 1-3 „…”; pierwsze wystąpienie: …
- Nowe hasło: …
```

Czas publikacji w strefie `Europe/Warsaw`, format `RRRR-MM-DD GG:MM`. Do dziennika trafia
**nowe pokrycie** fabuły; poprawki istniejących wpisów idą do `interpretacje:`.

## Krok 8 — bramki jakości

```bash
npm test          # integralność bazy i dokumentacji
npm run build     # dist/index.html
npm run zapis     # dosłowność scen + pokrycie archiwum
```

Wszystkie trzy muszą być zielone. Typowe zatrzymania:

| Komunikat | Co znaczy |
|---|---|
| `nie jest dosłownym fragmentem zapisu` | `:::zapis` został przeredagowany albo pomylono wiersze |
| `scena leży za granicą rozegranej fabuły` | `postep.json` nie został podniesiony |
| `brak sceny — porządek rozegrania musi być ciągły` | dziura w `kolejnosc` |
| `pole "X" nie należy do schematu` | literówka w nazwie pola |
| `"Y" → "Z" nie istnieje w bazie` | martwy slug w polu-relacji lub wikilinku |
| `brak obowiązkowej sekcji` | brak `## Opis` / `## Treść sceny` / `## Analiza` |

## Krok 9 — commit i podgląd

Jeden zielony krok = jeden commit z opisem, co przybyło. Push od razu. Jeśli zmiana jest
przeznaczona do oceny, odśwież artefakt (`npm run build`) — serwer podglądu czyta plik przy
każdym żądaniu, więc restart nie jest potrzebny.

## Czego nie robić w tej procedurze

- nie pisać scen „na zapas” poza granicą fabuły,
- nie uzupełniać streszczenia wiedzą o dalszej fabule,
- nie scalać scen różniących się czasem i miejscem tylko po to, żeby było ich mniej,
- nie poprawiać archiwum, żeby dopasować je do wpisu.
