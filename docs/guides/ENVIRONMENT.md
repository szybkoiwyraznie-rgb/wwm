# Środowisko — przewodnik

Ten plik jest przewodnikiem po ograniczeniach środowiska pracy. Źródłem prawdy dla
wymagań i procedur odzyskiwania jest [`../../ENVIRONMENT.md`](../../ENVIRONMENT.md);
tutaj opisane jest **dlaczego** te ograniczenia istnieją i jak je obejść.

## Node ≥ 22 i zero zależności

Silnik witryny to czyste ESM. Nie ma `node_modules`, nie ma bundlera, nie ma transpilacji.
Konsekwencje:

- **`node --test` jest jedynym runnerem** — testy to pliki `test/*.test.js`;
  `tools/run-tests.mjs` uruchamia je równolegle z limitem współbieżności,
- **kod musi działać w dwóch środowiskach**: Node (build, testy) i przeglądarka (widoki).
  Dlatego `src/wwm/*` nie dotyka `fs` ani `document`; `tools/*` nie trafia do artefaktu,
- **nowa zależność to zmiana architektury**, nie drobiazg. Jeśli rozwiązanie wymaga paczki,
  zwykle da się je napisać w ~30 liniach.

## Płytki klon

`git clone --depth 1` nie fałszuje treści, ale psuje metadane:

- strony bez historii dostają datę z mtime,
- stopka traci „utworzono”,
- build wypisuje ostrzeżenie o płytkim klonie.

Naprawa: `git fetch --unshallow`. W CI zawsze `fetch-depth: 0` — inaczej publikowana
witryna kłamie o datach.

## Podgląd

```bash
npm run build      # dist/index.html
npm run serve      # 0.0.0.0:3000
```

Serwer:

- wiąże **`0.0.0.0`**, żeby działał przez proxy środowiska i z innego urządzenia w sieci,
- czyta `dist/index.html` **przy każdym żądaniu** — po `npm run build` nie trzeba restartu,
- przy braku artefaktu buduje go raz przy starcie,
- nieznaną ścieżkę zwraca jako `index.html`, bo routing jest po hashu.

Uruchamiaj go jako proces długotrwały, nie przez pojedyncze wywołanie powłoki z limitem
czasu — inaczej tracisz kontrolę nad procesem, a podgląd znika.

## Artefakt

Domyślny build daje **powłokę i drzewo danych** (ADR 0017):

- `dist/index.html` — HTML + CSS + wszystkie moduły JS + spakowany indeks; bez ciał stron,
- `dist/data/<slug>.json` — treść strony, dociągana `fetch` przy wejściu w nią,
- `dist/data/teksty.json` — indeks wyszukiwarki, dociągany przy pierwszym zapytaniu,
- `dist/data/co-nowego.json` — dziennik, dociągany na starcie.

Dzięki temu czytelnik nie pobiera całej kroniki, żeby przeczytać jedną scenę, a powłoka
nie rośnie z liczbą scen. Konsekwencje:

- kronika **wymaga serwera HTTP** — tak samo publikuje Pages; z `file://` dociągnięcie
  ciała strony nie zadziała i widok powie o tym wprost,
- nie ma cache-bustingu ani wersjonowania podzasobów; `dist/` jest produktem buildu
  i wolno go w każdej chwili nadpisać,
- kopiowanie artefaktu oznacza **oba** elementy: `index.html` i `data/`.

`npm run build:single` daje `dist/jeden-plik.html` — całość wstrzyknięta w jeden dokument.
To archiwum offline, działa z `file://` i służy jako tryb testów jednoplikowych.

Cena modelu powłoki: rośnie indeks, nie treść. Progi podziału (indeks po spakowaniu
> 5 MB, `teksty.json` > 50 MB) są zapisane w ADR 0017; decyzja o podziale zapada w ADR-ze,
nie w pośpiechu sesji.

## GitHub Pages

Publikacja idzie przez oficjalne akcje (`configure-pages`, `upload-pages-artifact`,
`deploy-pages`), nie przez gałąź `gh-pages`. Zalety: brak zaśmieconej historii, atomowa
publikacja, testy przed wdrożeniem. Uprawnienia: `contents: read`, `pages: write`,
`id-token: write`, środowisko `github-pages`.

Pierwsze uruchomienie wymaga, by Pages był włączony jako źródło „GitHub Actions”.
`configure-pages` z `enablement: true` robi to sam; jeśli nie — Settings → Pages.

## Zmienne

| Zmienna | Domyślnie | Znaczenie |
|---|---|---|
| `PORT` | `3000` | port podglądu |
| `TEST_CONCURRENCY` | `4` | ile plików testowych naraz |
| `TZ` | `Europe/Warsaw` | strefa dat w stopce i dzienniku (build wymusza) |
