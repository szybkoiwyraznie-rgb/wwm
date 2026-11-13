# 0018 — Jeden tytuł boksu i odsyłacze, które mają cel

**Status:** przyjęta (2026-11-13) · **Zastępuje:** — · **Zastępuje fragmenty:** 0016 · **Zastąpiona przez:** —

## Kontekst

Po wdrożeniu warstw i kolumn (0016) właściciel przeszedł stronę sceny i wypisał pięć rzeczy,
które nie działają albo nie mają sensu:

1. chip „Interpretacja · Analiza · pewność 60%” w prawej kolumnie prowadzi do pustej strony,
2. pod tytułem sceny stoi zdanie bez etykiety — nie wiadomo, czym jest,
3. okruszki sklejają się w zbitok: `Chronologia›Rozdział pierwszy›Klasztor echa›Zwój pod bramą`,
4. w tabeli wątków widać `watek-pochodzenia` — slug zamiast nazwy,
5. boksy mają po dwa tytuły: „Analiza” + „interpretacja”, „Wątki w scenie” + „spis powiązań”.

Każdy z tych punktów to inny błąd, ale mają wspólną przyczynę: **elementy dodane dla
porządku w danych przeciekły do widoku**. Kotwica bez celu, streszczenie bez etykiety,
slug bez nazwy, rodzaj treści bez potrzeby.

## Decyzja

1. **Chip interpretacji prowadzi do kotwicy, która istnieje.** Build nadaje blokowi
   interpretacji `id` (`kotwicaInterpretacji`) z tego samego licznika, z którego powstaje
   inwentarz interpretacji — chip i cel nie mogą się rozjechać. Test sprawdza, że każdy
   odsyłacz `#…` ma cel na stronie.
2. **Interpretacje stoją w jednym miejscu.** Na stronie encji — tylko w kolumnie bocznej
   (w treści nie ma ich drugi raz). Na stronie sceny — są sekcją treści, więc kolumna ich
   nie powtarza.
3. **Tytuł strony sceny to tytuł sceny.** Streszczenie zostaje w danych (listy, chronologia,
   wyszukiwarka), ale nie pod tytułem: bez etykiety źródła wyglądało jak urwany fragment.
4. **Odsyłacz pokazuje nazwę, nie adres.** `[[slug]]` bez etykiety renderuje się jako tytuł
   strony (`Pochodzenie wędrowca`), nie jako `watek-pochodzenia`. Slug jest adresem.
5. **Okruszki mają widoczne odstępy** (spacja + separator + spacja, układ w linii), żeby
   sąsiednie ogniwa nie sklejały się w jeden wyraz.
6. **Jeden tytuł boksu.** Plakietka przy nagłówku mówi wyłącznie, skąd wiemy (pochodzenie,
   a przy interpretacji także pewność). Rodzaj treści nie jest już wypisywany obok tytułu —
   powtarzał go („Wątki w scenie” + „spis powiązań”). Atrybut `rodzaj=` zostaje w danych
   i w klasach CSS, bo odpowiada za układ warstwy, nie za napis.

## Uzupełnienie po przejściu strony „Droga bez śladów” (ten sam dzień)

Ta sama przyczyna, trzy nowe objawy — i jeden błąd, którego nie widziały żadne dane:

7. **Nagłówek nie dubluje tytułu.** `okruszki()` zwracało gołe `<span>` z tytułem
   bieżącej strony; pod streszczeniem stał więc drugi „Droga bez śladów”. Teraz
   ścieżka jest `<p class="okruszki">`, a przy jednym ogniwie nie renderuje się wcale
   (tytuł już jest w `<h1>`).
8. **Streszczenie nie jest wyciągiem z „Opisu”** (i nie ma go wcale, gdy strona nie ma
   własnego pola `streszczenie` ani sekcji `## Streszczenie`). Wcześniej build brał
   pierwsze zdanie opisu, więc pod tytułem powtarzał się dosłownie początek boksu.
9. **Metryka nie pokazuje etykiet magazynowych.** „Rodzaj: termin” nic nie mówi
   czytelnikowi; rodzaje zostają tylko tam, gdzie znaczą coś na stronie.

**Błąd w parserze, nie w widoku:** `##` w środku bloku `{{…}}` zamykał blok **razem
z jego otwarciem**. Treść po nagłówku renderowała się jako domyślne „opracowanie”
(stąd zielony boks na wiedzy modelu), a interpretacja gubiła `pewnosc=` i kotwicę
(stąd fioletowy chip bez celu). Otwarcie obowiązuje teraz do jawnego `}}`.

## Przegląd wszystkich typów stron (ten sam dzień)

Po scenie i kontekście przeszedłem każdy typ strony i każdy widok listowy tym samym
filtrem: *czy to zdanie mówi o świecie, czy o warsztacie?* Trzy klasy błędów powtarzały
się poza sceną — wszystkie naprawione u źródła, nie w pojedynczych widokach:

10. **Wartości słownikowe w widoku.** `rodzaj: glowny` wyświetlało się dosłownie
    („Rodzaj wątku: glowny”, „wątek główny” obok „rozdział:”). Jedna funkcja
    `nazwaRodzaju()` tłumaczy wartości z plików na język opowieści — korzystają z niej
    metryka encji i widok epizodu, zamiast dwóch lokalnych map.
11. **Powtórzony akapit.** Boks „Streszczenie” stał obok tego samego streszczenia pod
    tytułem (epizody, rozdziały, encje). Boks jest teraz filtrowany: streszczenie żyje
    wyłącznie jako lead.
12. **Etykiety magazynowe w metryce.** „Rodzaj: termin”, „Stan: otwarty” — notatki
    redakcyjne. Zostają tylko pola, które coś mówią o świecie.
13. **Tytuł boksu jako nazwa odczytania.** Lista interpretacji pokazywała „Analiza”
    (tytuł sekcji) zamiast pytania, na które blok odpowiada. Interpretacja ma teraz
    atrybut `pytanie=` („Kto ułożył krąg z kamieni i zostawił zwój?”); bez niego
    lista mówi „odczytanie sceny”, nigdy tytułem boksu.
14. **Nagłówki tabeli to zdania o opowieści.** `WĄTEK | ŚLAD W SCENIE` → `Co się wtedy
    porusza | Czym daje o sobie znać`.

## Pewność należy do przypuszczenia, nie do tła (decyzja właściciela)

`{{model}}` **bez** `pewnosc=` to tło kulturowe — konwencja, obyczaj, znaczenie słowa.
Zostaje w kolorze wiedzy modelu (to nadal wiedza modelu, nie źródło), ale **nie dostaje
etykiety pewności**: liczba przy zdaniu o obyczaju nie ma czego szacować i tylko
sugerowałaby, że to policzone ryzyko.

- `{{model pewnosc=N}}` = przypuszczenie; pewność jest jego cechą i stoi w plakietce.
- `{{model}}` = tło; brak liczby jest informacją, nie brakiem.
- `pytanie=` i `rodzaj=interpretacja` wymagają pewności — inaczej build zgłasza błąd.
- `pewnosc=0` nie wyświetla plakietki: zero to brak twierdzenia, nie „bardzo niepewne”.

## Konsekwencje

- **Brama na przyszłość:** testy sprawdzają to na **wyrenderowanych widokach**, nie na
  danych — każda strona renderuje się bez błędu, każdy odsyłacz `#…` ma cel, w nagłówku
  nie ma luźnego tekstu poza `<h1>`/`<p>`, przy tytule nie stoi druga etykieta, a blok
  z nagłówkiem zachowuje swoje pochodzenie. Regresja wywali CI, zanim zobaczy ją czytelnik.
- **Nowe bramy:** żaden widok nie pokazuje surowej wartości słownikowej (`glowny`,
  `tajemnica`…), a żaden akapit nie stoi na stronie dwa razy.
- **Lekcja:** bramy danych nie widzą widoku. Chip powstaje przy renderze, więc „pusty”
  odsyłacz przeszedł przez 63 testy. Każdy element generowany w widoku potrzebuje testu
  na widoku.
- **Mniej szumu w nagłówkach.** Dwa tytuły obok siebie czyta się jak błąd, nawet gdy oba
  są prawdziwe; jeden tytuł i jedna plakietka mówią to samo krócej.
- **Koszt:** informacja o rodzaju treści (np. że tabela jest spisem powiązań) znika
  z nagłówka. Zostaje w treści i w układzie; jeśli okaże się potrzebna, wróci jako opis
  w legendzie, nie jako drugi tytuł.
