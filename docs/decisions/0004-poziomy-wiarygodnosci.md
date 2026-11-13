# 0004 — Poziomy wiarygodności jako kolor fragmentu

**Status:** przyjęta (2026-11-13) · **Zastępuje:** — · **Zastąpiona przez:** 0016 (słownik poziomów: cztery pochodzenia zamiast siedmiu; kolor należy do warstwy w boksie)

## Kontekst

Baza miesza materiał o różnym pochodzeniu: dosłowny zapis z gry, streszczenie autora, opisy
z ekranów, kontekst kulturowy, wnioski. Czytelnik musi wiedzieć, **czym fragment jest**,
bez czytania metadanych i bez zaglądania w źródło. SRW rozwiązywał to kolorami boksów.

## Decyzja

Fragmenty treści są opakowane w bloki o jawnym poziomie:

`{{skrypt` — dosłowny zapis · `{{streszczenie` — streszczenie · `{{menu` — opis z ekranu
gry · `{{zrodlo` — potwierdzone źródłem · `{{wiedza` — kontekst bez potwierdzenia ·
`{{hipoteza pewnosc=NN` — wniosek · `{{struktura` — spis powiązań.

Kolor oznacza **pochodzenie informacji, nie stopień pewności**. Legenda poziomów stoi na
górze każdej strony treści i na stronie „O bazie”.

## Konsekwencje

- Poziom `struktura` powstał później, gdy okazało się, że spisy relacji renderowane jako
  `wiedza` sugerowały twierdzenie o świecie (LESSONS §5).
- Poziomy wycofane są mapowane, nie usuwane po cichu (`POZIOMY_WYCOFANE`).
- Autor musi wybrać poziom przy każdym fragmencie; domyślnego nie ma.
