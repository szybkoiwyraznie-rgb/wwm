# Instrukcja dla agentów — baza fabuły Where Winds Meet

> **To jest jedyny plik startowy sesji.** Po odczytaniu go w całości wykonaj kolejno:
> **(0) uruchom stały podgląd → (1) otwórz PR z planem sesji → (2) lektura obowiązkowa →
> (3) audyt poprzedniego scalonego PR → (4) praca w pętli sceny lub pętli jakości.**
> Szczegóły: §3, ADR 0012.

## 1. Czym jest ten projekt

**Kronika opowieści** z gry *Where Winds Meet*, prowadzona równolegle z graniem: historia
wędrowca w świecie jianghu, rozdział po rozdziale i scena po scenie. Kronika rośnie w tempie
przechodzenia historii: jeden przekazany zapis = kilka nowych scen.

Czym to **nie jest**:

- nie jest encyklopedią całej gry ani serwisem fanowskim — opisujemy **tylko to, co zostało
  już opowiedziane**,
- **nie mówi o sobie** — widoczna treść opowiada świat i wydarzenia, nigdy proces ich
  powstawania (ADR 0014),
- nie jest poradnikiem, listą buildów ani bazą przedmiotów — interesuje nas fabuła, świat
  i kultura, z której gra czerpie,
- nie jest projektem tłumaczeniowym — repozytorium `wherewindsmeet` prowadzi osobną sprawę
  polskiej wersji językowej i nie dostarcza tu materiału.

Trzy zdania wyznaczające wszystkie decyzje: **właściciel gra i przekazuje zapis scen. Agent
zamienia go w opowieść. Witryna istnieje po to, żeby czytać historię i widzieć, skąd wiadomo
to, co jest w niej napisane.**

Typy stron opisują **opowieść, nie interfejs gry** (ADR 0013): rozdział, epizod, scena, wątek,
postać, sekta, kraina, miejsce, kontekst, pojęcie, relacja. Nie ma strony „zadanie” ani „mapa
postępu” — zadanie jest mechaniką gry, a mapa jest o graniu, nie o historii.

## 2. Pętla sceny (po dostawie nowego zapisu)

Materiał wejściowy: fragment zapisu rozgrywki w `rozgrywka/zapisy/<plik>.md` plus informacja,
który epizod i scena to są. Wynik pracy:

1. **Aktualizacja granicy fabuły.** `rozgrywka/postep.json` → `ostatnia_scena` wskazuje
   ostatnią scenę, którą właściciel rozegrał. **Ta zmiana idzie pierwsza**, bo dopiero ona
   otwiera drogę nowym scenom w buildzie.
2. **Wpis sceny** `content/sceny/<slug>.md` — dosłowny blok `:::zapis` z tekstem z archiwum,
   streszczenie, analiza z podsekcjami i jawnym mapowaniem `sekcje_analizy`. Strona sceny
   jest najważniejsza: z niej wynikają wszystkie odsyłacze.
3. **Wpis epizodu i rozdziału.** Nowy epizod dostaje `kolejnosc` w rozdziale; rozdział —
   numer, tytuł oboczny z poematu i listę epizodów. Numeracja musi być ciągła (build to sprawdza).
4. **Encje** — dla każdej postaci, sekty, krainy, miejsca, hasła i kontekstu kulturowego,
   który pojawia się w scenie **wprost**. Nowe encje powstają tylko z dostawy, nie z domysłu po treści innej
   encji. Encja istniejąca **nie jest duplikowana**: dopisujesz jej nowe wystąpienie w polu
   `sceny`/`postacie` i uzupełniasz treść, jeśli zapis wniósł coś nowego.
5. **Relacje** — pola frontmattera (`postacie`, `miejsca`, `watki`, `konteksty`) plus
   wikilinki w treści. Bez nich wpis jest wyspą i nie pojawi się w „Powiązaniach”.
6. **Analiza i kontekst** — co pochodzi z kultury chińskiej lub konwencji wuxia, a co jest
   autorskie gry. Rozdzielaj `zrodlo` (sprawdzone w źródle) od `wiedza` (kontekst bez
   potwierdzenia).
7. **Katalogi treści:** `content/rozdzialy/`, `content/epizody/`, `content/sceny/`,
   `content/watki/`, `content/postacie/`, `content/sekty/`, `content/krainy/`,
   `content/miejsca/`, `content/konteksty/`, `content/pojecia/` —
   jeden typ strony na katalog (ADR 0003).
8. **Dziennik zmian** — nowy wpis na górze `content/co-nowego.md`, nagłówek
   `## RRRR-MM-DD GG:MM` (czas publikacji, strefa `Europe/Warsaw`).
9. **Zielono** — `npm test` i `npm run build` muszą przejść. Build nie wypuści artefaktu
   z martwym wikilinkiem, sceną bez dosłownego zapisu albo sceną poza granicą fabuły.

Szczegółowa lista kroków: `docs/guides/PRZEPLYW_SCENY.md`.

## 3. Tryb sesji (ADR 0012)

### Kolejność domyślna

0. **Uruchom podgląd i pozostaw go aktywnego.** Sprawdź gałąź i stan repozytorium; po resecie
   odzyskaj zdalną gałąź sesji. Zbuduj artefakt (`npm run build`), wystartuj `npm run serve`
   przez `start_process` i sprawdź nasłuch na `0.0.0.0:3000`. Podgląd ma działać przez całą
   sesję: nie zatrzymuj go między krokami, a po awarii uruchom ponownie. Przed końcem tury
   sprawdź, że proces żyje.
1. **Otwórz PR z planem sesji.** Pracuj wyłącznie na gałęzi przypisanej do sesji. Jeśli PR
   sesji już istnieje, kontynuuj go — nie twórz drugiego. W nowej sesji: pusty commit
   porządkowy, push gałęzi, `gh pr create`. Plan wymienia lekturę, audyt i pracę merytoryczną;
   **audyt oznacz jako do wykonania**, nie jako gotowy.
2. **Wykonaj lekturę obowiązkową.** Przeczytaj wszystkie ADR-y z `docs/decisions/` po kolei,
   potem `docs/LESSONS.md`, `docs/guides/ENVIRONMENT.md`, `docs/guides/SCHEMAT_DANYCH.md`
   i — przy nowej dostawie — `docs/guides/PRZEPLYW_SCENY.md` oraz cały materiał wejściowy.
   Każdy plik w całości; jeśli narzędzie utnie wynik, dobierz resztę.
3. **Przeprowadź audyt poprzedniego scalonego PR.** Ustal go przez
   `gh pr list --state merged --limit 3`, przeczytaj opis, listę plików i diff. Audytuj
   faktyczne zmiany, nie tylko opis. Zapisz wyniki w opisie PR sesji w trzech częściach:
   - **(3a) merytoryczny** — porównaj twierdzenia ze scen z nietykalnym zapisem i z kwerendą.
     Sprawdź, czy nic nie wyprzedza fabuły, czy poziomy wiarygodności pasują do twierdzeń,
     czy przypisanie kontekstu kulturowego jest uzasadnione. Sam działający URL nie jest
     potwierdzeniem merytorycznym.
   - **(3b) kodu** — przeczytaj zmieniony kod i testy; sprawdź regresje, walidację
     i renderowanie. Uruchom `npm test` i `npm run build`; zielony wynik nie zastępuje
     przeglądu.
   - **(3c) pozostałych zmian** — dokumentacja, konfiguracja, proces. Gdy danej kategorii nie
     było, napisz „nie dotyczy”.
4. **Następnie pracuj w pętli sceny** (nowa dostawa) **albo w pętli jakości** (brak nowego
   materiału): pogłębiaj wpisy, uzupełniaj powiązania, poprawiaj analizy. Dla każdego małego
   kroku: wybierz konkretną lukę, sprawdź granicę fabuły, uzupełnij wpis, zaktualizuj dziennik
   jeśli doszło pokrycie, uruchom `npm test` i `npm run build`, zacommituj, wypchnij
   i zaktualizuj opis PR.

Nie dodawaj treści dla samej objętości. Gdy nie ma kolejnego uzasadnionego uzupełnienia,
odnotuj wynik i zakończ turę.

### Reguły wspólne

- **Agent NIGDY sam nie scala PR-a i nigdy go nie zamyka.** Scalenie to wyłączna decyzja
  właściciela, wykonana jego kliknięciem. „Akceptuję” i „wygląda dobrze” nie są poleceniem
  scalenia.
- **1 sesja = 1 gałąź = 1 PR.** Opis PR jest żywym dokumentem: plan, wyniki audytu i pozostałe
  luki aktualizuj kumulatywnie.
- **Commituj często, pushuj natychmiast.** Każdy zielony krok to osobny commit. Przed commitem
  sprawdź `git rev-parse --abbrev-ref HEAD` i `git status --short`.
- **Tylko przyrostowo, nigdy force push, nigdy push do `main`.**
- **Domyślna zgoda dotyczy jakości kroniki**, nie dowolnych funkcji silnika czy przebudowy
  workflowów. Takie pomysły zgłaszaj jako propozycje.

## 4. Twarde zasady danych

- **Cała baza i dostawy po polsku.** Nazwy własne, tytuły i terminy chińskie zachowuj
  w pisowni oryginalnej (pismo chińskie, pinyin), z polskim objaśnieniem w treści.
- **Slug jest niezmienny.** Nowy slug buduj z tytułu (translit PL → ASCII, bez znaków
  diakrytycznych), a przy kolizji dopisz wyróżnik.
- **Ścieżki i odsyłacze muszą istnieć.** Build sprawdza każde pole-relację i przerywa pracę
  przy błędzie.
- **Zapisu rozgrywki nie poprawiasz.** `rozgrywka/zapisy/**` to archiwum: czytasz i zostawiasz
  bez zmian. Nowy fragment dopisuje właściciel albo agent na jego polecenie, na końcu pliku.
- **Nie wyprzedzaj opowieści.** Nie dodawaj wydarzeń, postaci ani ról ujawnianych później,
  nawet jeśli zna je źródło zewnętrzne albo pamięć modelu. Pochodzenie informacji nie jest
  zgodą na spoiler. Granicę wyznacza `rozgrywka/postep.json`.
- **Nie wymyślaj faktów.** Czego nie ma w zapisie i czego nie potwierdza źródło, tego nie
  wpisujesz jako ustalenia. Nieznany szczegół pomijasz; lukę zapisujesz wewnętrznie.
- **Kolor mówi skąd, tytuł mówi co.** Boks to sekcja `##`; w środku leżą warstwy
  `{{dostawa}}` / `{{opracowanie}}` / `{{kwerenda}}` / `{{model}}` (ADR 0016). Jeden boks
  może mieć trzy warstwy — nie rozbijaj „Analizy sceny” na trzy boksy o tym samym tytule.
- **Kwerenda bez dowodu nie istnieje.** `{{kwerenda}}` wymaga pola `zrodla:` albo sekcji
  `## Źródła` z adresem http(s). Build przerywa, gdy twierdzenie nie ma adresu.
- **Interpretacja to zawsze wiedza modelu.** `{{model pewnosc=0–100}}`; pewność jest
  szacunkiem porządkowym, nie statystyką, i nie wolno jej podnosić bez nowego dowodu.
  Wiedza modelu bez pewności to tło kulturowe, nie hipoteza.
- **Zmiana decyzji wymaga wpisu `interpretacje:`** z dosłownym brzmieniem poprzedniej wersji
  i czasem, w którym przestała obowiązywać (ADR 0006).

## 5. Swoboda formy jest zaletą

**Treść o świecie, nie o procedurach.** Widoczna treść opisuje wydarzenia, osoby, miejsca,
sekty i obyczaj jianghu. Nie pisz o „dostawie”, „właścicielu”, pracy agenta, „bazie”,
„wpisach”, „stronach”, „tagach” ani o działaniu witryny. Zamiast relacjonować pozyskanie
informacji, opisz przedmiot sceny. Procedury należą do dokumentacji i opisu PR — nigdy do
kroniki. Pilnuje tego `test/jezyk.test.js`; zielony test nie zastępuje wyczucia, ale
czerwony zatrzymuje build.

Różne modele i różne sesje mają prawo pisać inaczej, dlatego:

- **nie ma zamkniętej listy sekcji** — obowiązkowe są tylko `## Opis` (encje), `## Streszczenie`
  (rozdział, epizod) oraz `## Treść sceny` i `## Analiza` (scena),
- **nie ma obowiązkowego słownika tagów** — tagi są swobodne, byle slugami,
- **nie ma jednego słusznego stylu narracji** — pisz konkretnie, nie jednolicie,
- **stare wpisy można zmieniać** — poprawianie i pogłębianie jest normalną pracą, o ile nie
  łamie §4.

Jedyne, czego naprawdę pilnujemy: **graf się nie rozjeżdża, granica opowieści trzyma,
a czytelnik wie, skąd pochodzi informacja.**

## 6. Czego nie robić

- Nie pisać treści w HTML-u ani nie dotykać `dist/` (to produkt buildu, nadpisywany).
- Nie zmieniać slugów istniejących wpisów.
- Nie dodawać zależności npm — ani runtime, ani build, ani testy. To warunek działania
  artefaktu z `file://` i na Pages bez instalacji.
- Nie wypełniać pól na siłę. Pusta lista znaczy „jeszcze nie wiem” i jest w porządku.
- Nie scalać i nie zamykać PR-ów, nie pushować do `main`, nie robić force push.
- Nie czekać z commitem na koniec zadania — po każdym zielonym kroku commit i push.
- Nie usuwać testów, żeby naprawić build. Naprawia się treść albo regułę — świadomie, z ADR-em.

## 7. Komendy

```bash
npm test          # testy integralności (node --test)
npm run build     # dist/index.html — jeden samowystarczalny plik
npm run serve     # podgląd na http://0.0.0.0:3000
npm run zapis     # kontrola: czy sceny są dosłownym fragmentem archiwum
```

`npm run serve` uruchamiaj jako długotrwały proces przez `start_process`, nigdy przez
krótkotrwały proces powłoki. Serwer odczytuje bieżący `dist/index.html` przy każdym żądaniu,
więc po zmianie przeznaczonej do oceny w podglądzie wykonaj ponownie `npm run build` bez
restartowania serwera.

Publikacja dzieje się sama: push do `main` → workflow `pages.yml` → nowa wersja witryny.

## 8. Gdzie zapisać regułę, żeby nie przepadła

| Rodzaj treści | Miejsce |
|---|---|
| Wiążąca decyzja (schemat, proces, granice projektu) | `docs/decisions/NNNN-*.md` |
| Powtarzalna pułapka, lekcja z sesji | `docs/LESSONS.md` |
| Stałe ograniczenia środowiska | `docs/guides/ENVIRONMENT.md` |
| Schemat pól i przykład frontmattera | `docs/guides/SCHEMAT_DANYCH.md` |
| Lista kroków przy nowej scenie | `docs/guides/PRZEPLYW_SCENY.md` |
| Plan, audyt i stan jednej sesji | opis PR sesji — nie czat, nie pliki w `/tmp` |
| Pomysł spoza zatwierdzonego flow | propozycja w opisie PR; realizacja po zgodzie właściciela |
