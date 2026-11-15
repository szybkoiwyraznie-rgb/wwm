# 0009 — Relacje w grafie dwukierunkowo

**Status:** przyjęta (2026-11-13) · **Zastępuje:** — · **Zastąpiona przez:** —

## Kontekst

Strony opisują się nawzajem: scena wymienia postacie, postać wymienia sceny, relacja wymienia
postacie. Łatwo o graf, w którym jedna strona wie o drugiej, a druga nie.

## Decyzja

- **Pola-relacje** frontmattera (`POLA_RELACJI`) są walidowane: cel musi istnieć i mieć
  właściwy typ. To samo dotyczy wikilinków `[[slug]]` w treści.
- **Powiązania liczone są w obie strony**: renderer buduje backlinki z pól i z wikilinków,
  więc każda strona pokazuje, kto na nią wskazuje — nawet jeśli tamten wpis o niej milczy.
- **Relacja jako strona** (typ `relacja`) istnieje dla związków, które zasługują na własny
  opis: wymaga ≥ 2 postaci i rodzaju (`rodzaj_relacji`).
- Strona `#/hipotezy` i inwentarze encji budują się z tego samego grafu, nie z osobnych list.

## Konsekwencje

- Martwy odsyłacz zatrzymuje build — nie ma „miękkich” linków.
- Nie trzeba wpisywać relacji dwukrotnie ręcznie, ale warto: pole w obie strony poprawia
  jakość list i wyszukiwania.
- Nowa relacja to zawsze nowy plik w `content/relacje/`, nigdy pole w opisie postaci.
