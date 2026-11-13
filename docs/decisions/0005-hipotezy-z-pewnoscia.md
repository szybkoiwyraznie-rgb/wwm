# 0005 — Hipotezy z prawdopodobieństwem

**Status:** przyjęta (2026-11-13) · **Zastępuje:** — · **Zastąpiona przez:** —

## Kontekst

Nie każdy wniosek o fabule da się potwierdzić. Bez jawnego prawdopodobieństwa hipotezy
zlewają się z faktami, a czytelnik nie wie, ile waży zdanie autora. VN prowadziło hipotezy
z wartościowaniem — to jedna z najlepszych praktyk tamtego repo.

## Decyzja

`{{hipoteza pewnosc=NN` — `NN` jest liczbą całkowitą 0–100 i jest **obowiązkowe**.

- Progi opisowe: **≥ 80** bardzo prawdopodobne, **50–79** możliwe, **< 50** słabo uzasadnione.
- Pewność jest szacunkiem porządkowym, nie statystyką. Nie podnosi się jej bez nowego dowodu.
- `pewnosc=` przysługuje wyłącznie blokowi hipotezy; inne poziomy z tym atrybutem to błąd.
- Zmiana pewności jest zmianą twierdzenia i wymaga wpisu w `interpretacje:` (ADR 0006).

## Konsekwencje

- Hipoteza bez pewności nie przechodzi walidacji.
- Strona `#/hipotezy` zbiera wszystkie hipotezy bazy z pewnością i linkiem do źródłowego
  wpisu — widać, gdzie baza jest mocna, a gdzie spekuluje.
- Wartościowanie jest jawne w treści, więc nie da się „przemycić” domysłu jako faktu.
