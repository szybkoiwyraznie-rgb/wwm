# 0019 — Scena to jedno wydarzenie, nie jeden wpis z ekranu

**Status:** przyjęta (2026-11-21) · **Zastępuje fragmenty 0008 i 0013** · **Zastąpiona przez:** —

## Kontekst

Pierwsza prawdziwa dostawa pokazała, że zapis z gry przychodzi pocięty po stronie techniki:
`Scena 4700037`, `Scena 4700001`, `Cutscena 30161`. To identyfikatory obiektów w grze, a nie
jednostki opowieści — jeden dialog bywa rozbity na kilkanaście takich wpisów, a bywa i tak,
że jeden wpis obejmuje dwie różne rozmowy.

ADR 0008 mówi, że scena jest jednostką opowieści, ale nie rozstrzyga, kto wyznacza jej
granicę. Przy pierwszej dostawie trzeba było odpowiedzieć wprost: dzielić po numerach
z ekranu czy po wydarzeniach.

## Decyzja

1. **Scena to jedno wydarzenie: wspólne miejsce i wspólny czas.** Granicę wyznacza zmiana
   miejsca albo przeskok czasu, nie numeracja gry. Jeden dialog przy jednym stole, jedna
   walka, jedno przeszukanie chaty — to jedna scena, nawet jeśli w zapisie ma piętnaście
   nagłówków.
2. **Numery z gry są miarą techniczną i nie trafiają do kroniki.** `Scena 4700001`,
   `Cutscena 30161` i podobne nie są ani tytułem, ani numerem sceny, ani identyfikatorem.
   Numer sceny w epizodzie (`numer_sceny`) nadaje kronika.
3. **Kilka fragmentów zapisu w jednej scenie to norma.** Scena może cytować kilka bloków
   `:::zapis` — po jednym na fragment, w kolejności zdarzeń. Cytat pozostaje dosłowny,
   a bloki nie są sklejane w jeden, bo każdy jest osobnym dowodem.
4. **Kwestia bez etykiety mówcy jest elementem sceny.** Zapis nie zawsze podaje mówcę
   (`Kiedy wreszcie pozwolisz mi zobaczyć jianghu?`). Taka linia jest kwestią, nie narracją,
   gdy kończy się znakiem zapytania, wykrzyknienia albo wielokropkiem. Inaczej dwuosobowy
   dialog bez etykiet liczyłby się jako jeden element i poprawna scena wypadałaby z bramy
   „minimum dwóch elementów” (ADR 0008).
5. **Zapas materiału dzieli się na epizody według wydarzeń.** Prologi i cutsceny, które
   pokazują dawne dzieje, tworzą epizod rodzaju `wspomnienie`; bieżące zdarzenia —
   osobny epizod. Epizod nie jest rozdziałem z dziennika zadań.

## Konsekwencje

- **Mniej scen, więcej treści w każdej.** Kronika nie oddaje struktury interfejsu gry,
  więc czytelnik nie klika przez piętnaście jednozdaniowych stron.
- **`npm run zapis` nadal widzi pokrycie.** Skoro scena cytuje kilka fragmentów, pokrycie
  archiwum liczy się per blok, nie per scena.
- **Decyzja o granicy jest redakcyjna** i musi być uzasadniona w analizie, gdy jest nieoczywista
  (np. gdy wspomnienie i przebudzenie stoją w jednym epizodzie).
- **Zmiana licznika jest zmianą bramy**, więc ma test: dialog bez etykiet musi przejść,
  a scena z jednym zdaniem — nie.
