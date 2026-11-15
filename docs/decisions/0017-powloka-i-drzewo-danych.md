# 0017 — Powłoka i drzewo danych: kronika, która rośnie

**Status:** przyjęta (2026-11-13) · **Zastępuje:** fragment ADR 0001 o jednym pliku · **Zastąpiona przez:** —

## Kontekst

Artefakt był jednym plikiem `dist/index.html` z całą kroniką w środku (ADR 0001).
Przy 17 zaślepkowych stronach to 177 kB — wygodne. Ale kronika rośnie razem z graniem:
każda scena to dosłowny zapis dialogów plus analiza, a rozdziałów i wątków przybywa.
Właściciel zauważył to, co w bazie VN zapisano jako ADR 0043: **jednoplikowy model jest
blokerem skalowania**. Czytelnik otwiera jedną scenę, a przeglądarka pobiera, parsuje
i trzyma w pamięci całą kronikę — łącznie z tekstami do wyszukiwania, których ta strona
nie potrzebuje.

## Decyzja

1. **Build dzieli dane na indeks i ciała stron** (`podzielDane` w `tools/build.mjs`):
   - **indeks** — metadane wszystkich stron (typ, tytuł, streszczenie, odsyłacze, numer,
     kolejność, daty, interpretacje), grafy, słowniki, statystyki;
   - **ciała stron** — `html`, `boksy`, `sekcje`; jeden plik `dist/data/<slug>.json`;
   - **teksty** — `dist/data/teksty.json` dla wyszukiwarki (dociągane przy pierwszym zapytaniu);
   - **dziennik** — `dist/data/co-nowego.json` (dociągany na starcie, bo strona główna
     pokazuje ostatnie wpisy).
2. **Domyślny artefakt to powłoka + drzewo danych.** Indeks jest pakowany gzip+base64
   (`node:zlib` w buildzie, `DecompressionStream` w przeglądarce — zero zależności).
   Powłoka nie rośnie już z liczbą scen; rośnie indeks, i to wolniej niż treść.
3. **Routing po hashu zostaje.** Adres dokumentu nigdy się nie zmienia, więc względne
   `data/<slug>.json` działa z każdego katalogu i z każdego serwera statycznego.
4. **Renderery pozostają synchroniczne.** Ciało strony dochodzi do `WWM_DATA.strony[slug]`
   przez `Object.assign`; asynchroniczny jest wyłącznie `main.js` — start i wejście w stronę,
   z tokenem, który nie pozwala starszemu renderowi nadpisać nowszego.
5. **Tryb jednoplikowy zostaje** jako `npm run build:single` (`--single`): całość w jednym
   pliku, działa z `file://`, służy jako archiwum offline i jako tryb testów.
6. **Serwer podglądu zwraca 404** dla brakującego pliku w `data/` — HTML w miejscu JSON-a
   byłby cichym błędem parsowania.
7. **Testy uruchamiają prawdziwą powłokę** z podstawionym `fetch` czytającym z `dist/data/`:
   start, dociągnięcie sceny, listy bez dociągania, wyszukiwanie na żądanie, tryb jednoplikowy.

## Konsekwencje

- **Powłoka przestaje być wąskim gardłem.** Przy 17 stronach: 133 kB powłoki zamiast 177 kB
  całości — a przy tysiącu scen różnica rośnie liniowo z treścią, nie z liczbą stron.
- **Kronika wymaga serwera HTTP** — tak samo publikuje Pages. Z `file://` działa tylko
  `--single`; komunikat błędu mówi to wprost, zamiast pokazywać pustą stronę.
- **`dist/` to katalog, nie plik.** Kopiowanie oznacza `index.html` **i** `data/`.
  Test pilnuje, że każdy slug w indeksie ma swój plik w `data/`.
- **Progi na przyszłość** (żeby nie zgadywać ich w panice): indeks po spakowaniu > 5 MB →
  podział indeksu per rozdział; `teksty.json` > 50 MB → wyszukiwanie na indeksie odwrotnym
  budowanym przez build.
- ADR 0001 traci część aktualności: „jeden artefakt” znaczy teraz jedną **powłokę**
  dokumentu, a nie jeden plik z całą treścią. Zakaz zależności npm i generatora stron
  pozostaje w mocy.
