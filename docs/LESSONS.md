# Lekcje

Wnioski z sesji, które kosztowały czas i które następna sesja powinna mieć pod ręką.
To nie są decyzje (te są w `decisions/`) ani ograniczenia środowiska (te są
w `guides/ENVIRONMENT.md`) — to pułapki, w które już ktoś wpadł.

Zasada dopisywania: **jedna lekcja = jedna konkretna sytuacja + rozpoznanie + sposób
obejścia**. Wynik testu, który przeszedł, nie jest lekcją. Lekcja to miejsce, w którym
build padł i trzeba było dojść dlaczego.

## 1. Bloki `{{…}}` otwiera się dokładnie raz

**Objaw:** kilkadziesiąt błędów `niezamknięty blok` / `zagnieżdżony blok` w jednej scenie.

**Przyczyna:** linia `{{skrypt` otwiera blok, a build sam opakowuje nim treść aż do `}}`.
Dopisanie drugiej linii otwarcia w środku (np. przed `## Analiza`) zamyka poprzedni blok
i próbuje otworzyć następny.

**Obejście:** jedno otwarcie na blok, jedno `}}` na końcu. Kolejny blok zaczyna się dopiero
po zamknięciu poprzedniego. Renderer nie zagnieżdża bloków — i to jest celowe.

## 2. Slug wyłącznie ASCII

**Objaw:** `slug "zwój-z-imieniem" nie przechodzi wzorca /^[a-z0-9-]+$/`.

**Przyczyna:** tytuł wpisany z polską diakrytyką trafił do sluga bez transliteracji.

**Obejście:** `slugify` robi translit (ą→a, ł→l, ż→z), ale nie wolno wpisywać sluga ręcznie
z polskich znaków. Tytuły chińskie trzymamy w `tytul_ja`, nigdy w identyfikatorze.

## 3. `:::zapis` musi być dosłowny — i tak jest czytany

**Objaw:** `blok :::zapis 1 nie jest dosłownym fragmentem zapisu rozgrywki`.

**Przyczyna:** trzy różne rzeczy, wszystkie wyglądają niewinnie: przeredagowanie zdania,
sklejenie dwóch fragmentów, poprawienie literówki z gry.

**Obejście:** wklejać z archiwum bez zmian. Normalizacja ignoruje różnice w białych znakach
i wcięciach, ale **nie** różnice w znakach. Jeśli cytat ma być krótszy, to znaczy, że nie
jest cytatem — użyj `{{streszczenie}}`.

## 4. `assertNoNameCollisions` w bundlu

**Objaw:** build przechodzi, a w przeglądarce jedna lista jest pusta albo podmieniona.

**Przyczyna:** dwa moduły eksportowały funkcję o tej samej nazwie (`listaScen` w dwóch
widokach); w jednym zasięgu globalnym druga definicja nadpisała pierwszą.

**Obejście:** nazwy funkcji w `src/wwm/` są globalne. Przy nowym widoku nadaj nazwę
z kontekstem (`listaScenZadania`, nie `listaScen`) albo użyj prefiksu modułu. Build
wyłapuje kolizje, ale lepiej nie doprowadzać do błędu.

## 5. Poziom `struktura` był potrzebny od początku

**Objaw:** spis powiązań renderował się jako `{{wiedza}}`, czyli twierdzenie o świecie,
którym nie jest.

**Przyczyna:** brakowało poziomu dla wyliczeń relacji. Kolor `wiedza` sugerował treść
merytoryczną, a to była tylko lista.

**Wniosek:** poziom mówi, **czym fragment jest**, nie jak bardzo jest pewny. Lista, spis
i wyliczenie mają własny poziom, bo nie są twierdzeniem.

## 6. Karty rozdziałów bez streszczenia

**Objaw:** puste karty na liście rozdziałów, mimo że wpisy miały treść.

**Przyczyna:** `streszczenie` było liczone tylko dla typów, które mają tę sekcję wymaganą.

**Obejście:** build liczy streszczenie dla **wszystkich** typów: jawne pole → sekcja
`Opis`/`Streszczenie` → skrót treści. Kolejność ma znaczenie.

## 7. Granica fabuły psuje się po cichu, jeśli nie jest pierwszą zmianą

**Objaw:** nowa scena „nie chce się zbudować” — komunikat o scenie za granicą.

**Przyczyna:** wpis sceny powstał przed podniesieniem `ostatnia_scena` w `postep.json`.

**Obejście:** granica idzie pierwsza. Zawsze. To nie jest formalność — bez niej build
traktuje nową scenę jak spoiler i ma rację.

## 8. `kolejnosc` jest globalna i ciągła

**Objaw:** `kolejnosc 4: brak sceny — porządek rozegrania musi być ciągły od 1`.

**Przyczyna:** numeracja „per zadanie” (1, 2, 1, 2) albo dziura po usunięciu sceny.

**Obejście:** `kolejnosc` to pozycja w **całej** fabule, nie w zadaniu. Numer w zadaniu to
`numer_sceny` (tekst). Po usunięciu sceny ponumeruj resztę — build tego pilnuje.

## 9. `rodzaj` ma zamknięte listy tylko tam, gdzie to konieczne

**Objaw:** `rodzaj "motyw" poza ksiega/poemat/film/...`.

**Przyczyna:** pole `rodzaj` kontekstu ma własną listę; „motyw” jest rodzajem **wątku**,
nie kontekstu.

**Wniosek:** przed dopisaniem wpisu sprawdź w `SCHEMAT_DANYCH.md`, czy pole ma listę
zamkniętą. `rodzaj` przy miejscu jest swobodnym tekstem, ale przy kontekście już nie.

## 10. Zagnieżdżony markdown w tabelach

**Objaw:** fragment renderuje się jako surowy tekst z gwiazdkami.

**Przyczyna:** renderer obsługuje podzbiór markdownu; złożone konstrukcje w komórkach
tabeli (listy, bloki) nie są interpretowane.

**Obejście:** w komórkach trzymaj prozę i pogrubienia. Listy i cytaty — poza tabelą.

## 11. `dist/` nie jest wersjonowane i nie wolno go „naprawiać”

**Objaw:** poprawka w `dist/index.html` znika po następnym buildzie.

**Przyczyna:** artefakt jest produktem, nie źródłem. Każda zmiana idzie do `src/`, `content/`
albo `tools/`.

## 12. Zielony test nie jest audytem

**Objaw:** wszystko zielone, a w bazie twierdzenie, którego scena nie wspiera.

**Przyczyna:** testy sprawdzają strukturę (istnienie plików, poprawność slugów, dosłowność
cytatu), nie prawdę merytoryczną. „Cytat jest dosłowny” nie znaczy „wniosek jest słuszny”.

**Obejście:** audyt poprzedniego PR to osobny krok sesji (AGENTS.md §3), wykonywany na
treści, nie na wyniku `npm test`.

## 13. Nie ufać własnej pamięci o grze

**Objaw:** wpis zawiera wydarzenie, którego nie ma w zapisie — „przecież tak było”.

**Przyczyna:** model zna fabułę z materiałów zewnętrznych. To jest dokładnie ten spoiler,
przed którym broni ADR 0007.

**Obejście:** każde zdanie musi mieć pokrycie w zapisie albo w źródle. Wątpliwość zapisuj
jako `{{hipoteza}}` z niską pewnością, nie jako fakt.

## 14. Sesja bez podglądu pracuje w ciemno

**Objaw:** seria poprawek CSS, z których żadna nie naprawia tego, co trzeba.

**Przyczyna:** brak uruchomionego serwera podglądu; weryfikacja przez czytanie kodu.

**Obejście:** podgląd startuje w kroku 0 sesji i działa do końca. Serwer czyta artefakt przy
każdym żądaniu, więc wystarczy `npm run build` — restart nie jest potrzebny.
