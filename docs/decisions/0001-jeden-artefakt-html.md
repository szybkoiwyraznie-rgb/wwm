# 0001 — Jeden samowystarczalny artefakt HTML

**Status:** przyjęta (2026-11-13) · **Zastępuje:** — · **Zastąpiona przez:** —

## Kontekst

Baza fabuły ma być publikowana na GitHub Pages i czytana zarówno z sieci, jak i z dysku.
Wcześniejsze repo właściciela (SRW) dowiodło, że jeden plik HTML działa w obu trybach bez
konfiguracji. Alternatywy: statyczny generator z wieloma podstronami, framework SPA
z bundlerem, albo serwer.

## Decyzja

Build produkuje **jeden plik `dist/index.html`**, w którym znajduje się HTML, CSS, wszystkie
moduły JS i dane bazy (`globalThis.WWM_DATA`). Zero zależności, zero podzasobów, zero
`fetch`. Routing jest po hashu (`#/scena/slug`), wyszukiwanie działa po stronie przeglądarki
na danych wstrzykniętych w plik.

## Konsekwencje

- Artefakt otwiera się z `file://` i na Pages bez ustawiania ścieżek bazowych.
- Nie ma cache-bustingu, bo nie ma podzasobów.
- Rozmiar rośnie liniowo z liczbą wpisów; przy setkach stron to setki kB — akceptowalne.
- Wyszukiwanie i indeksy są liczone przy budowie, nie w czasie żądania.
- Zmiana modelu publikacji wymaga osobnego ADR-a.
