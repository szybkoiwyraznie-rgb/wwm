# 0008 — Scena jest jednostką śledzenia fabuły

**Status:** przyjęta (2026-11-13) · **Zastępuje:** — · **Zastąpiona przez:** częściowo 0013 (rama nad sceną: epizod zamiast zadania; sama scena bez zmian)

## Kontekst

W WWM nie ma misji taktycznych jak w SRW ani scen visual novel. Fabuła toczy się w otwartym
świecie: gracz chodzi, rozmawia, wchodzi w zadania, przerywa je. Potrzebna jest jednostka,
która pasuje do tego, co realnie da się zapisać po sesji.

## Decyzja

**Scena** jest podstawową jednostką bazy. Zasady:

- jedna scena = jedna jednostka rozgrywki (spotkanie, rozmowa, przejście przez miejsce),
  zamknięta w spójnym momencie,
- minimum **2 elementy treści** (kwestie/narracje) — pojedyncze zdanie dołącza się do
  sąsiedniej sceny,
- `numer_sceny` to numer w zadaniu (`"1-1"`), a `kolejnosc` — globalna pozycja w fabule,
- każda scena ma **blok `:::zapis`**, który jest **dosłownym** fragmentem archiwum
  (`rozgrywka/zapisy/`); wierność sprawdza `npm run zapis` i build,
- sekcje obowiązkowe: `## Treść sceny` i `## Analiza` z podsekcjami mapowanymi przez
  `sekcje_analizy`,
- hierarchia: rozdział → zadanie → scena; postacie, miejsca, hasła, konteksty i wątki wiszą
  na scenie.

## Konsekwencje

- Zapis z gry jest dowodem, a nie inspiracją: przeredagowany cytat nie przechodzi buildu.
- Strona sceny jest najważniejszym widokiem — z niej wychodzą wszystkie odsyłacze.
- Podział na sceny jest decyzją redakcyjną, ale musi respektować granice wymian zdań.
