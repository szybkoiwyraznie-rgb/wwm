/**
 * Dostęp do danych bazy (`globalThis.WWM_DATA` — ADR 0001, 0003).
 *
 * Moduł celowo „głupi”: zwraca bezpieczne puste struktury, gdy danych brak
 * (pusta baza ma renderować się poprawnie) i NIE waliduje nic — walidacje
 * robi build/testy przez registry.js.
 */

const porownajNumeryScen = new Intl.Collator('pl', { numeric: true, sensitivity: 'base' }).compare;

export const NAZWA_BAZY = 'Where Winds Meet — baza fabuły';

export function dajDane() {
  return globalThis.WWM_DATA ?? {
    zbudowano: '',
    postep: null,
    strony: {},
    backlinki: {},
    tagi: {},
    hipotezy: {},
    statystyki: {},
    coNowego: [],
    czasBazy: null,
  };
}

export function dajStrone(slug) {
  return dajDane().strony[slug] ?? null;
}

export function listaStron(typ) {
  return Object.values(dajDane().strony).filter((s) => s.typ === typ);
}

/** Porządek wg ostatniej aktualizacji (malejąco) — dla działów encji. */
export function porownajAktualizacje(a, b) {
  return String(b.czas?.zaktualizowano ?? '').localeCompare(String(a.czas?.zaktualizowano ?? ''))
    || String(b.czas?.utworzono ?? '').localeCompare(String(a.czas?.utworzono ?? ''))
    || String(a.tytul ?? '').localeCompare(String(b.tytul ?? ''), 'pl');
}

/** Encje posortowane od najnowszej modyfikacji. */
export function listaWedlugAktualizacji(typ) {
  return listaStron(typ).sort(porownajAktualizacje);
}

/** Lista posortowana po tytule (locale pl). */
export function listaPosortowana(typ) {
  return listaStron(typ).sort((a, b) => String(a.tytul ?? '').localeCompare(String(b.tytul ?? ''), 'pl'));
}

// ── Hierarchia fabuły ───────────────────────────────────────────────

/** Rozdziały w kolejności numerów. */
export function listaRozdzialow() {
  return listaStron('rozdzial').sort((a, b) => (a.numer ?? 0) - (b.numer ?? 0));
}

/** Zadania rozdziału w kolejności `kolejnosc`. */
export function zadaniaRozdzialu(slugRozdzialu) {
  return listaStron('zadanie')
    .filter((z) => z.rozdzial === slugRozdzialu)
    .sort((a, b) => (a.kolejnosc ?? 0) - (b.kolejnosc ?? 0));
}

/** Sceny zadania w kolejności numerycznej numeru sceny. */
export function scenyZadania(slugZadania) {
  return listaStron('scena')
    .filter((s) => s.zadanie === slugZadania)
    .sort((a, b) => porownajNumeryScen(String(a.numer_sceny ?? ''), String(b.numer_sceny ?? '')));
}

/**
 * Wszystkie rozegrane sceny jednym ciągiem — od pierwszej do ostatniej.
 * To jest osią bazy: czytelnik widzi fabułę tak, jak ją przeszedł (ADR 0007).
 */
export function listaScenChronologicznie() {
  return listaStron('scena').sort((a, b) => (a.kolejnosc ?? 0) - (b.kolejnosc ?? 0));
}

/** Ostatnia rozegrana scena — granica wiedzy o fabule (ADR 0007). */
export function ostatniaScena() {
  const scena = dajDane().postep?.ostatnia_scena;
  return scena ? dajStrone(scena) : listaScenChronologicznie().at(-1) ?? null;
}

/** Rozdział zawierający daną scenę (przez zadanie). */
export function rozdzialSceny(scena) {
  const zadanie = scena?.zadanie ? dajStrone(scena.zadanie) : null;
  return zadanie?.rozdzial ? dajStrone(zadanie.rozdzial) : null;
}

/** Postęp: ile scen rozegrano, gdzie jesteśmy, jaki procent rozdziału domknięty. */
export function dajPostep() {
  const dane = dajDane();
  const sceny = listaScenChronologicznie();
  const ostatnia = ostatniaScena();
  const rozdzial = ostatnia ? rozdzialSceny(ostatnia) : null;
  return {
    scen: sceny.length,
    ostatnia,
    rozdzial,
    postepPliku: dane.postep ?? null,
  };
}

// ── Hipotezy i dziennik ─────────────────────────────────────────────

/** Strony z co najmniej jedną hipotezą, od najnowszej modyfikacji. */
export function listaStronZHipotezami() {
  return Object.values(dajDane().strony)
    .filter((s) => Array.isArray(s.hipotezy) && s.hipotezy.length > 0)
    .sort(porownajAktualizacje);
}

/** Łączna liczba boksów hipotez (nie stron, na których leżą). */
export function liczbaHipotez() {
  return listaStronZHipotezami().reduce((n, s) => n + (s.hipotezy?.length ?? 0), 0);
}

/** Rozkład pewności hipotez — do podsumowania na stronie głównej. */
export function rozkladPewnosciHipotez() {
  const progi = { wysoka: 0, srednia: 0, niska: 0 };
  for (const s of listaStronZHipotezami()) {
    for (const h of s.hipotezy ?? []) {
      const n = Number(h.pewnosc);
      if (n >= 80) progi.wysoka += 1;
      else if (n >= 50) progi.srednia += 1;
      else progi.niska += 1;
    }
  }
  return progi;
}

export function czasStrony(slug) {
  return dajStrone(slug)?.czas ?? null;
}

export function coNowegoCzas() {
  return dajDane().coNowegoCzas ?? null;
}

export function czasBazy() {
  return dajDane().czasBazy ?? null;
}
