# 0011 — Dziennik nowego pokrycia i strona „O bazie”

**Status:** przyjęta (2026-11-13) · **Zastępuje:** — · **Zastąpiona przez:** częściowo 0014 (język dziennika i strony „Jak czytać kronikę”)

## Kontekst

Baza rośnie etapami. Czytelnik wracający po tygodniu chce wiedzieć, co przybyło, bez
przeglądania wszystkich list. Jednocześnie trzeba wyjaśnić, skąd pochodzą informacje i czego
w bazie nie ma.

## Decyzja

- `content/co-nowego.md` — dziennik **nowego pokrycia fabuły**: wpisy `## RRRR-MM-DD GG:MM`,
  najnowszy na górze, treść jako lista (doszła scena, postać, hasło). Poprawki istniejących
  wpisów **nie** trafiają do dziennika — mają własną historię w `interpretacje:`. Czas
  publikacji w strefie `Europe/Warsaw`.
- `#/o-bazie` — strona wyjaśniająca: co baza zawiera, czego nie zawiera (żadnych elementów
  graficznych, żadnych poradników, żadnych spoilerów), jak czytać poziomy wiarygodności,
  jak działa granica fabuły.

## Konsekwencje

- Dziennik jest krótki i rzeczowy; nie jest changelogiem kodu.
- Stopka pokazuje datę ostatniej zmiany. Osobny boks „Opowieść dotarła dotąd” zniknął
  ze strony głównej (decyzja właściciela, 2026-11-21): powtarzał to, co czytelnik ma
  o krok dalej w „Ostatnio opowiedzianych”, a nie mówił nic nowego. Zamiast niego
  pierwszy ekran pokazuje kafle wszystkich działów — z hasłami i miejscami, do których
  wcześniej nie prowadziło ani menu, ani żaden odsyłacz.
- Publikacja witryny jest publiczna i indeksowana — „O bazie” jest miejscem, w którym
  mówimy o tym wprost.
