# 0014 — Kronika mówi o świecie, nie o sobie

**Status:** przyjęta (2026-11-13) · **Zastępuje:** — · **Zastąpiona przez:** —

## Kontekst

Kronika opowiada historię wędrowca i świat jianghu. Tymczasem w tekstach narosło słownictwo
procesu: „baza”, „wpis”, „materiał”, „dostawa”, „interfejs”, „tagi”, a w legendzie i na stronie
„Jak czytać kronikę” — zdania o pracy redakcyjnej. Czytelnik dowiadywał się, jak kronika
powstaje, zamiast tego, co się wydarzyło. W dwóch zaprzyjaźnionych kronikach (SRW, VN) ten
problem rozwiązano twardo: treść mówi o fabule, a pilnuje tego test. Właściciel chce tej samej
sztywności tutaj.

Granica jest subtelna. Poziom wiarygodności i odsyłacz do źródła **muszą** zostać — to one
mówią, skąd wiadomo, że coś jest prawdą (ADR 0004, 0010). Ale opis *mechanizmu* oceny
(„wpis ma poziom”, „strona pokazuje tagi”) jest już meta.

## Decyzja

- **Widoczna treść mówi wyłącznie o świecie i wydarzeniach.** Opisuje osoby, miejsca, sekty,
  obyczaje, wydarzenia i ich tło kulturowe. Nie opisuje kroniki, jej układu, nawigacji,
  sposobu oznaczania ani pracy nad nią.
- **Zakazane słownictwo** w widocznym tekście: *baza*, *bazy*, *bazie*, *dostawa*, *właściciel*,
  *archiwum* (w znaczeniu projektu), *materiał*, *wpis*, *strona* i *podstrona*, *sekcja*,
  *tag*, *interfejs*, *mechanika*, *profil*, *rekord*, *numeracja*, *w scenie N*, a także
  nazwy procesu technicznego (ADR, commit, build).
- **Wyjątki są nazwane, nie domyślne:**
  - dosłowny cytat sceny (`:::zapis`) — archiwum jest nietykalne, bohater może mówić o dostawie;
  - tytuły nawigacji wymuszone funkcją („Tagi”, „Szukaj”) — techniczna etykieta, nie zdanie;
  - `docs/`, `AGENTS.md`, `README.md` — tam proces jest tematem, nie metaforą.
- **Formuła zamiast komentarza.** Zamiast „materiał nie obejmuje dalszych scen” — zdanie
  w świecie: „Dalej historia nie jest jeszcze opowiedziana. Kolejne sceny dochodzą wtedy,
  gdy zostaną przeżyte — nigdy wcześniej.”
- **Brama mechaniczna.** `test/jezyk.test.js` składa każdą widoczną stronę z tych samych
  modułów, których używa build, zdejmuje kod i znaczniki, i sprawdza tekst czytany przez
  człowieka oraz streszczenia i dziennik. Naruszenie zatrzymuje CI.
- **Brama nie zwalnia z myślenia.** Zielony test znaczy „nie ma zakazanych słów”, a nie
  „tekst jest dobry”. Nowy meta może przyjść w słowach spoza listy; wtedy listę rozszerzamy
  razem z poprawką.

## Konsekwencje

- **Poziomy i źródła zostają.** Odsyłacz do źródła to twierdzenie o świecie („tak mówi
  *Zhuangzi*”), nie komentarz o redakcji. `pewnosc=` i historia interpretacji zostają bez zmian.
- **Dziennik zmian mówi o pokryciu opowieści**, nie o pracy: „Otwarcie historii: rozdział
  pierwszy, dwa epizody i dwie sceny nad przystanią w Qinghe”, a nie „powstał szkielet bazy”.
- **Nazwy działów są nazwami świata.** „Krainy” i „Sekty” zamiast „Miejsca” i „Hasła”;
  „Interpretacje” zamiast „Hipotezy” w widocznej treści (ADR 0005 zostaje w mocy co do modelu).
- **Granica nie wyprzedza opowieści.** Test nie jest zgodą na spoilery; `rozgrywka/postep.json`
  dalej wyznacza, co wolno opisać (ADR 0007).
- **Ryzyko:** brama może ciąć uczciwe zdania ze słowem „strona” („po drugiej stronie rzeki”).
  Dlatego lista jest wąska i odmianowa; jeśli słowo okaże się potrzebne w świecie, dodajemy
  wyjątek w teście z uzasadnieniem w komentarzu, a nie osłabiamy całej reguły.
