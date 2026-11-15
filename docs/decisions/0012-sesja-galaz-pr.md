# 0012 — Jedna sesja, jedna gałąź, jeden PR

**Status:** przyjęta (2026-11-13) · **Zastępuje:** — · **Zastąpiona przez:** —

## Kontekst

Nad bazą pracuje wiele sesji agenta, często równolegle i po przerwie. Bez ustalonego rytuału
kolejna sesja nie wie, co poprzednia zrobiła, a scalanie staje się loterią. Właściciel chce
mieć jedno miejsce, w którym widzi stan pracy.

## Decyzja

- **1 sesja = 1 gałąź = 1 PR.** Opis PR jest żywym dokumentem: plan sesji, wyniki audytu
  poprzedniego PR-a, lista pozostałych luk. Aktualizowany kumulatywnie, nie przepisywany.
- Kolejność startu sesji: (0) podgląd na żywo, (1) PR z planem, (2) lektura obowiązkowa
  (wszystkie ADR-y, LESSONS, przewodniki), (3) audyt poprzedniego scalonego PR-a w trzech
  częściach: merytorycznej, kodu i pozostałych zmian, (4) praca w pętli sceny albo jakości.
- **Agent nigdy nie scala ani nie zamyka PR-a.** Scalenie to wyłączna decyzja właściciela.
- Bez force push, bez pushu do `main`. Commity często, push natychmiast po zielonym kroku.
- Domyślna zgoda dotyczy jakości bazy (treść, analizy, powiązania), nie przebudowy silnika
  ani workflowów — takie pomysły idą jako propozycja.

## Konsekwencje

- Stan pracy jest odtwarzalny po resecie środowiska: wystarczy przeczytać opis PR.
- Audyt poprzedniego PR-a jest obowiązkowy, bo zielone testy nie sprawdzają prawdy
  merytorycznej (LESSONS §12).
- Historia scalania zostaje czytelna: jeden PR = jedna intencja.
