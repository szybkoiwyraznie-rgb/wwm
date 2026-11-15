# 0015 — Pochodzenie i rodzaj treści to dwie różne osie

**Status:** wycofana tego samego dnia przez 0016 · **Zastępuje:** — · **Zastąpiona przez:** 0016

## Kontekst

Pierwotny zapis boksu (`{{skrypt}}`, `{{zrodlo}}`, `{{hipoteza}}` …) nazywał jednym słowem
dwie różne rzeczy: **skąd wiemy** i **czym fragment jest**. Stąd siedem „poziomów” i pytania
właściciela: dlaczego „sprawdzone źródło” stoi obok „kontekstu kulturowego”, jeśli jedno jest
źródłem, a drugie rodzajem treści?

## Decyzja (wycofana)

Rozdzielono osie: pochodzenie (`dostawa|opracowanie|kwerenda|model`) dawało kolor,
a rodzaj treści (`scena|streszczenie|kontekst|interpretacja|…`) dawał tytuł. Zapis przybrał
postać `{{pochodzenie/rodzaj}}`.

## Dlaczego została wycofana

Właściciel wskazał lepsze rozwiązanie: skoro kolor i tak niesie pochodzenie, **nie trzeba
osobnych boksów na każdy poziom źródła**. Jeden boks „Analiza sceny” może mieć w środku trzy
warstwy — wniosek z dostawy, kwerendę historyczną i hipotezę — a każda z nich własny kolor.
Osie są nadal dwie, ale rodzaj nie potrzebuje własnego boksu ani własnego znaku w otwarciu:
jest atrybutem `rodzaj=`, używanym tylko wtedy, gdy tytuł boksu nie mówi tego sam.

Zapis `{{pochodzenie/rodzaj}}` jest rozpoznawany jako wycofany i podpowiada zamiennik —
nikt nie zostaje z czerwonym buildem bez wskazówki.

## Konsekwencje

- Historia zostaje w repozytorium: decyzja 0016 nie ukrywa, że model dwuosiowy był pierwszą
  próbą i co w nim nie działało.
- Słownik `RODZAJE_TRESCI` przeżył jako atrybut — bez niego warstwy w jednym boksie
  byłyby nierozróżnialne.
