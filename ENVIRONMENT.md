# Środowisko

Stałe ograniczenia i procedury odzyskiwania. Wnioski z konkretnych sesji idą do
[`docs/LESSONS.md`](docs/LESSONS.md); ten plik opisuje to, co jest prawdą zawsze.

## Wymagania

| Element | Wymóg | Uwagi |
|---|---|---|
| Node.js | **≥ 22** | runner testów korzysta z `node --test`; build z `Intl` i `git` |
| Git | ≥ 2.30 | daty stron pochodzą z historii gita |
| Przeglądarka | aktualna | witryna nie ma transpilacji ani polyfilli |
| Zależności npm | **brak** | ani runtime, ani build, ani testy |

Klon musi mieć **pełną historię** (`fetch-depth: 0` w CI). Płytki klon nie fałszuje treści,
ale podstawia daty z mtime i gubi „utworzono” w stopce — build wypisuje wtedy ostrzeżenie.

## Komendy

```bash
npm test             # wszystkie testy (node --test), pliki test/*.test.js
npm run build        # dist/index.html — jeden samowystarczalny plik
npm run serve        # podgląd na 0.0.0.0:3000, czeka na build, jeśli go nie ma
npm run zapis        # porównanie scen z archiwum zapisu + pokrycie archiwum
node tools/build.mjs --out /tmp/podglad.html   # build w inne miejsce (testy)
```

Konkurencja testów: `TEST_CONCURRENCY=4` (domyślnie 4). Port podglądu: `PORT=3000`.

## Podgląd na żywo

Serwer wiąże `0.0.0.0` celowo: dzięki temu działa przez proxy środowiska i z innego
urządzenia w sieci. Czyta `dist/index.html` **przy każdym żądaniu**, więc:

- po zmianie treści wystarczy `npm run build` **bez restartu** serwera,
- nieznana ścieżka wraca do `index.html` (routing po hashu),
- brak buildu przy starcie powoduje jednorazowy build automatycznie.

Serwer uruchamiaj jako proces długotrwały (`start_process`), nie przez `bash` z limitem czasu.

## Publikacja

| Workflow | Kiedy | Co robi |
|---|---|---|
| `ci.yml` | push do gałęzi roboczej albo ręcznie | `npm test` → `npm run build` |
| `pages.yml` | push do `main` albo ręcznie | testy → build → GitHub Pages |

Pages jest włączane przez `configure-pages` z `enablement: true`, więc pierwsza publikacja
nie wymaga klikania w ustawieniach. Jeśli GitHub odmówi, włącz ręcznie:
**Settings → Pages → Source: GitHub Actions**.

Witryna jest **publiczna i indeksowana**. Oznacza to, że nie wolno dopisywać do niej niczego,
czego właściciel nie chciałby pokazać — w szczególności materiału wykraczającego poza
rozegraną fabułę.

## Odzyskiwanie po resecie

1. `git rev-parse --abbrev-ref HEAD` — upewnij się, że jesteś na gałęzi sesji.
2. `git fetch origin && git status --short` — sprawdź, czy nie ma niepushowanych zmian.
3. Jeśli klon jest płytki: `git fetch --unshallow`.
4. `npm run build` → `npm run serve` przez `start_process` → sprawdź port 3000.
5. Dopiero potem wracaj do pracy. Stan sesji jest w opisie PR, nie w czacie.

## Pułapki środowiska

- **`dist/` nie jest wersjonowane.** Po `git clone` artefaktu nie ma i trzeba go zbudować.
- **Brak `node_modules` jest stanem poprawnym.** Jeśli `npm install` jest potrzebny, to znak,
  że ktoś złamał zasadę zero-zależności.
- **Datownie z gita w UTC vs lokalne.** Build wymusza `TZ=Europe/Warsaw`; daty w stopce
  są lokalne, nie w UTC.
- **`file://` nie ma `fetch`.** Danych nie dociągamy z plików — wszystko jest wstrzyknięte
  w artefakt, dlatego działa też bez serwera.
- **Znaki CJK w slugach.** Slug jest ASCII; tytuły chińskie trzymaj w `tytul_ja`, a nie
  w identyfikatorze.
