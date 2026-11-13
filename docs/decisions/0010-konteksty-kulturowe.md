# 0010 — Konteksty kulturowe jako osobna warstwa

**Status:** przyjęta (2026-11-13) · **Zastępuje:** — · **Zastąpiona przez:** —

## Kontekst

WWM czerpie z chińskiej historii, literatury i konwencji wuxia. Wiedza zewnętrzna jest
dozwolona, ale musi być wyraźnie oddzielona od tego, co mówi gra — i zawężona do tego
zakresu: kultura Chin, wuxia, literatura, film, opera. Nie interesują nas porównania do gier
zachodnich ani publicystyka o grze.

## Decyzja

- Osobny typ strony **`kontekst`** (`content/konteksty/`) z polami `rodzaj`, `dzielo`,
  `autor`, `rok`.
- Zamknięta lista rodzajów: `ksiega`, `poemat`, `film`, `serial`, `manga`, `gra`, `opera`,
  `podanie`, `termin`, `inne`.
- Kontekst jest zawsze powiązany ze sceną, postacią albo hasłem, które go uruchamia —
  nie tworzymy wpisów „na zapas” z encyklopedycznej ciekawości.
- Twierdzenia o kontekście idą w bloku `{{wiedza` (kontekst niepotwierdzony) albo
  `{{zrodlo` z adresem w `zrodla`. Wniosek o związku z grą to `{{hipoteza`.
- Sekcja `## Nawiązania kulturowe` w scenie zbiera to, co scena wnosi.

## Konsekwencje

- Czytelnik odróżnia „gra to pokazała” od „kultura chińska zna ten motyw”.
- Konteksty nie służą do oceniania gry ani do recenzji.
- Wpis kontekstu bez powiązania z bazą jest błędem redakcyjnym, nie walidacyjnym.
