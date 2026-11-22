# 0020 — Kompendium, zadania i przedmioty z dostawy są materiałem opowieści

**Status:** przyjęta (2026-11-22) · **Zastępuje:** — · **Zastąpiona przez:** —

## Kontekst

Dostawa z gry nie składa się tylko z dialogów. Każdy plik kończy się trzema sekcjami, które
właściciel przekazuje razem z zapisem:

| Sekcja | Co zawiera |
|---|---|
| `KOMPENDIUM` | opisy miejsc, obyczajów, zwierząt, chorób, rzemiosła — z cytatami z ksiąg chińskich |
| `ZADANIA` | nazwy i przebieg zdarzeń: dokąd iść, kogo szukać, co się po drodze stało |
| `PRZEDMIOTY` | rzeczy z nazwą i zdaniem o nich: broń, leki, pamiątki, waluta |

Przy pierwszej dostawie cały ten materiał trafił do kroniki jako hasła, konteksty i strony
miejsc — bo tam było widać, że jest opowieścią o świecie: *Zioła* z cytatem z Ogrodu
pouczeń, *Drzwi kratowe* z traktatu o budownictwie, *Hełm Ofiarny* z posągiem w Kaplicy.

Przy drugiej dostawie agent uznał te sekcje za towar z ekwipunku i zostawił je w archiwum,
zakładając, że zasada „opowieść nie ma zapasu” obejmuje także opisy świata. To był błąd:
właściciel przekazuje kompendium po to, żeby kronika je opowiedziała.

## Decyzja

1. **Wszystkie trzy sekcje są materiałem wejściowym, tak samo jak dialogi.** Każdy wątek,
   nawiązanie kulturowe i informacja o świecie z `KOMPENDIUM`, `ZADANIA` i `PRZEDMIOTY`
   znajduje miejsce w kronice — jako treść istniejącej strony albo jako nowa strona.
2. **Pomija się tylko to, co jest czystą mechaniką bez lore:** procenty i liczby obrażeń,
   pojemność apteczki, numer seryjny sceny, przyciski i pozycje w menu. Zdanie o świecie
   zostaje nawet wtedy, gdy stoi w opisie przedmiotu, który służy do walki.
3. **Mechanika nie znika, ale jest przełożona.** „Przywraca 20% PŻ” nie wchodzi do kroniki;
   „proszek tamujący krew, który nosi się podręcznie” — tak. Miejsce przełożenia: strona
   hasła (`content/pojecia/`) albo analiza sceny, w której rzecz się pojawia.
4. **Zadanie nie jest typem strony** (ADR 0013). Nazwy i przebieg z sekcji `ZADANIA` zasilają
   epizody, streszczenia scen i strony miejsc: cel zadania mówi, co bohater robi, a nie jak
   nazywa się wpis w dzienniku.
5. **Przedmiot z jednym zdaniem bez lore nie dostaje strony.** „Zwyczajny miecz” nic nie
   opowiada; „miecz, który przybrany ojciec nazywał prostakiem z gór i lasów” — opowiada.
   Granica jest w treści zdania, nie w kategorii przedmiotu.

## Konsekwencje

- Kronika rośnie nie tylko o sceny: druga dostawa dołożyła Dzban na wino, Kotka Liliowca,
  Zielne Bezdroża i Zastygłą Toń z tego samego pliku, z którego wyszły dialogi.
- Bilans dostawy jest sprawdzalny: `npm run zapis` pokazuje akapity archiwum poza scenami,
  więc widać, co z kompendium jeszcze czeka na swoje miejsce.
- Strony haseł mogą cytować księgi źródłowe (`{{kwerenda}}` + `{{zrodlo}}`), bo kompendium
  często podaje autora i tytuł — a wtedy cytat jest sprawdzony, nie przepisany.
