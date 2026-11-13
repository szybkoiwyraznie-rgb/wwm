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

## Konsekwencje

- **Brama na przyszłość:** test `jezyk.test.js` sprawdza trzy rzeczy naraz — brak slugu
  w widocznym tekście odsyłacza, każdy `#…` ma cel, brak drugiej etykiety przy tytule.
  Regresja z tych punktów wywali CI, zanim zobaczy ją czytelnik.
- **Mniej szumu w nagłówkach.** Dwa tytuły obok siebie czyta się jak błąd, nawet gdy oba
  są prawdziwe; jeden tytuł i jedna plakietka mówią to samo krócej.
- **Koszt:** informacja o rodzaju treści (np. że tabela jest spisem powiązań) znika
  z nagłówka. Zostaje w treści i w układzie; jeśli okaże się potrzebna, wróci jako opis
  w legendzie, nie jako drugi tytuł.
