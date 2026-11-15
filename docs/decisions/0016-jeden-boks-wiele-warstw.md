# 0016 — Jeden boks, wiele warstw: kolor należy do źródła, nie do sekcji

**Status:** przyjęta (2026-11-13) · **Zastępuje:** 0015 i fragmenty 0004 · **Zastąpiona przez:** —

## Kontekst

Po rozdzieleniu pochodzenia od rodzaju treści (0015) powstała pokusa, żeby każde źródło
dostało własny boks. Skutek byłby widoczny natychmiast: strona sceny rozbita na
„Analiza sceny — dotychczasowa historia”, „Analiza sceny — co mówią źródła historyczne”,
„Analiza sceny — co będzie dalej”. Trzy niemal identyczne tytuły, trzy ramki, a między nimi
puste odstępy — czytelnik traci jedność myśli, którą te trzy fragmenty razem tworzą.

Właściciel wskazał właściwy układ: **jeden boks, w środku warstwy**, każda w kolorze swojego
źródła. Dodatkowo rozstrzygnął poziom źródła hipotez: hipoteza jest zawsze wiedzą modelu.

## Decyzja

1. **Boks to sekcja strony.** Tytuł boksu bierze się z nagłówka `##` w treści — nie z koloru
   i nie ze źródła. „Analiza sceny” pozostaje jedną sekcją, choćby mieściła cytat, kwerendę
   i hipotezę.
2. **Kolor należy do warstwy (`{{pochodzenie}}`), nie do boksu.** Cztery pochodzenia:
   `dostawa`, `opracowanie`, `kwerenda`, `model`. Kolor jest jednorodny w obrębie warstwy
   i nigdy nie zagnieżdża się w innym kolorze.
3. **Rodzaj treści jest atrybutem warstwy** (`rodzaj=scena|streszczenie|wnioski|watek|swiat|kontekst|interpretacja|spis`),
   a nie osobnym znakiem. Używamy go tylko wtedy, gdy tytuł boksu nie mówi sam, czym
   fragment jest — np. warstwa `wnioski` wewnątrz „Analizy”.
4. **Hipoteza = wiedza modelu.** `{{model pewnosc=NN}}`; `rodzaj=interpretacja` dopisuje się
   samo. Interpretacja nie może udawać cytatu ani kwerendy — build odrzuca
   `{{kwerenda rodzaj=interpretacja}}`. Wiedza modelu bez `pewnosc=` to tło kulturowe,
   nie hipoteza; z `pewnosc=` — hipoteza z jawnym szacunkiem (ADR 0005 zostaje w mocy).
5. **Kwerenda wymaga dowodu.** `{{kwerenda}}` bez pola `zrodla:` albo sekcji `## Źródła`
   z linkiem http(s) przerywa build: twierdzenie bez adresu nie może być niebieskie.
6. **Kolory nie są jedynym nośnikiem.** Przy każdej warstwie stoi nazwa pochodzenia,
   a przy hipotezie procent pewności — kolor pozostaje pomocą, nie informacją.
7. **Wycofane nazwy podpowiadają zamiennik**: `{{skrypt}}` → `{{dostawa}}`, `{{zrodlo}}` →
   `{{kwerenda}}`, `{{wiedza}}` → `{{model}}`, `{{hipoteza pewnosc=N}}` → `{{model pewnosc=N}}`,
   `{{pochodzenie/rodzaj}}` → `{{pochodzenie}}` + `rodzaj=`.

## Konsekwencje

- **Legenda w stopce mówi jedną rzeczą:** kolor = źródło, tytuł = treść. Znika lista siedmiu
  „poziomów”, która mieszała jedno z drugim.
- **Boks z warstwami jest wizualnie inny** (`.boks-z-warstwami`): tytuł na górze, pod nim
  warstwy z własnym tłem, bez podwójnych ramek i bez zbędnych odstępów.
- **Treść zaślepki zmigrowana** na nowy zapis; stare nazwy są nadal rozpoznawane z podpowiedzią,
  więc przyszłe wpisy z pamięci poprzedniej sesji nie wysypią buildu bez wyjaśnienia.
- **Dokumentacja i testy są częścią zmiany.** Schemat danych opisuje osie osobno, a testy
  pilnują, żeby opis nie rozjechał się z kodem (`test/dokumentacja.test.js`).
- **Koszt:** autor musi zdecydować, gdzie kończy się jeden boks. Reguła jest prosta: boks
  odpowiada jednej myśli strony („Analiza”, „Opis”, „Tło historyczne”), a nie jednemu źródłu.
