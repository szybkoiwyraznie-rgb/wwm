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

`dist/index.html` to **jeden plik**: HTML + CSS + wszystkie moduły JS + dane `WWM_DATA`.
Dzięki temu:

- otwiera się z `file://` (bez `fetch`, bez serwera),
- działa na GitHub Pages bez konfiguracji ścieżek bazowych,
- nie ma cache-bustingu ani wersjonowania podzasobów — problem zniknął wraz z podzasobami.

Cena: rozmiar rośnie liniowo z liczbą wpisów. Przy obecnej skali (setki stron) to setki kB —
akceptowalne. Gdyby miało przekroczyć kilka MB, decyzja o podziale zapada w ADR-ze, nie
w pośpiechu sesji.

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
