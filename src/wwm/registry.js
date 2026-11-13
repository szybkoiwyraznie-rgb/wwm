/**
 * Rejestr stron i walidacje schematów (ADR 0003).
 *
 * Czysty moduł (bez DOM/fs): używają go build (walidacja przed emisją
 * artefaktu), testy integralności i przeglądarka (backlinki, tagi, listy).
 *
 * Zasada: baza jest tak dobra, jak mocno strzeżone są jej niezmienniki.
 * Każda reguła zwraca PROBLEM (string), który build/test raportuje.
 *
 * Świadoma oszczędność: NIE ma zamkniętych list sekcji ani obowiązkowego
 * słownika tagów. Schemat pilnuje tylko tego, bez czego graf się rozjeżdża
 * (istnienie encji, poprawność odsyłaczy, pewność hipotez) i tego, bez czego
 * baza przestaje być wiarygodna (granica rozegranej fabuły, ADR 0007).
 */

import { SLUG_RE, hrefDlaSlug, slugify } from './links.js';
import { BLOK_OTWARCIA_RE, parsujAtrybutyBloku, POCHODZENIA, RODZAJE_TRESCI, czyPewnosc } from './markdown.js';

/**
 * Typy stron. Katalog `content/<dział>` musi zgadzać się z typem (ADR 0003).
 *
 * Kolejność jest kolejnością opowieści, nie interfejsu gry (ADR 0013):
 * najpierw to, czym fabuła jest opowiedziana — rozdział, epizod, scena, wątek —
 * potem ludzie i świat, w którym się to dzieje, na końcu nawiązania i relacje.
 * Nie ma typu „zadanie”: zadanie jest mechaniką gry, nie jednostką opowieści.
 */
export const TYPY_STRON = [
  'rozdzial', 'epizod', 'scena', 'watek',
  'postac', 'sekta', 'kraina', 'miejsce',
  'kontekst', 'pojecie', 'relacja',
];

/** Role postaci w rozegranym materiale. */
export const ROLE_POSTACI = [
  'protagonista', 'antagonista', 'sojusznik', 'mentor', 'drugoplanowa', 'narrator', 'inne',
];

/**
 * Rodzaj epizodu — jak opowieść jest prowadzona, nie jak gra nazywa zadanie.
 * `glowny` to wątek główny, `poboczny` — opowieść poboczna, `spotkanie`
 * i `zwiad` to krótkie historie świata, `wspomnienie` — retrospekcja.
 */
export const RODZAJE_EPIZODU = ['glowny', 'poboczny', 'spotkanie', 'zwiad', 'wspomnienie'];

/** Status rozdziału/epizodu względem rozegranej opowieści. */
export const STATUSY = ['rozegrane', 'w-toku', 'nierozpoczete'];

/** Rodzaj sekty — wspólnoty, do której należą postacie. */
export const RODZAJE_SEKTY = [
  'szkola', 'klan', 'bractwo', 'gildia', 'zakon', 'dwór', 'inne',
];

/** Rodzaj krainy — skala geografii opowieści, od prowincji po okolicę. */
export const RODZAJE_KRAINY = [
  'prowincja', 'region', 'miasto', 'dzielnica', 'kraina', 'inne',
];

/** Rodzaj hasła — warstwa świata. */
export const RODZAJE_POJECIA = [
  'organizacja', 'frakcja', 'miejscowosc', 'kultura', 'technika', 'przedmiot', 'wydarzenie', 'inne',
];

/**
 * Rodzaj źródła kontekstu kulturowego i wuxii (ADR 0010).
 * Kontekst to warstwa zewnętrzna wobec gry: księgi, poematy, filmy, sztuki walki.
 */
export const RODZAJE_KONTEKSTU = [
  'ksiega', 'poemat', 'film', 'serial', 'manga', 'gra', 'opera', 'podanie', 'termin', 'inne',
];

/** Rodzaj wątku. */
export const RODZAJE_WATKU = [
  'glowny', 'poboczny', 'motyw', 'tajemnica', 'romans', 'polityczny', 'mistyczny', 'inne',
];

/** Rodzaj relacji. */
export const RODZAJE_RELACJI = [
  'rodzina', 'przyjazn', 'romans', 'rywalizacja', 'konflikt', 'sojusz', 'mentor', 'tajemnica', 'inne',
];

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATA_CZAS_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

/** Poprawność kalendarzowa daty RRRR-MM-DD (także lata przestępne). */
export function czyPoprawnaData(s) {
  if (typeof s !== 'string' || !DATA_RE.test(s)) return false;
  const [rok, miesiac, dzien] = s.split('-').map(Number);
  if (miesiac < 1 || miesiac > 12 || dzien < 1) return false;
  const dniWMiesiacu = new Date(Date.UTC(rok, miesiac, 0)).getUTCDate();
  return dzien <= dniWMiesiacu;
}

/** Poprawność RRRR-MM-DD GG:MM wraz z zakresem zegara. */
export function czyPoprawnaDataCzas(s) {
  if (typeof s !== 'string' || !DATA_CZAS_RE.test(s)) return false;
  const [data, czas] = s.split(' ');
  if (!czyPoprawnaData(data)) return false;
  const [godz, min] = czas.split(':').map(Number);
  return godz >= 0 && godz <= 23 && min >= 0 && min <= 59;
}

/**
 * Pola dozwolone per typ. Nieznane pole = błąd, bo literówka w nazwie pola
 * po cichu wypadałaby z grafu (ADR 0003).
 */
const WSPOLNE = ['typ', 'slug', 'tytul', 'tytul_ja', 'tytul_en', 'tagi', 'zrodla', 'utworzono', 'interpretacje'];

export const POLA_DOZWOLONE = {
  rozdzial: [...WSPOLNE, 'numer', 'tytul_oboczny', 'epizody', 'watki', 'krainy', 'sekty', 'postacie', 'status', 'nastepny'],
  epizod: [...WSPOLNE, 'rozdzial', 'kolejnosc', 'rodzaj', 'status', 'sceny', 'postacie', 'krainy', 'sekty', 'miejsca', 'watki', 'konteksty'],
  scena: [...WSPOLNE, 'epizod', 'numer_sceny', 'kolejnosc', 'streszczenie', 'zapis', 'postacie', 'krainy',
    'miejsca', 'sekty', 'watki', 'konteksty', 'sekcje_analizy'],
  watek: [...WSPOLNE, 'rodzaj_watku', 'stan', 'postacie', 'sceny', 'rozdzialy', 'epizody', 'konteksty'],
  postac: [...WSPOLNE, 'rola', 'przydzial', 'pierwsze_wystapienie', 'sekta', 'kraina', 'krainy',
    'miejsca', 'watki', 'relacje', 'pseudonim'],
  sekta: [...WSPOLNE, 'rodzaj', 'siedziba', 'kraina', 'postacie', 'watki', 'konteksty', 'epizody'],
  kraina: [...WSPOLNE, 'rodzaj', 'region', 'rozdzial', 'sekty', 'postacie', 'miejsca', 'watki'],
  miejsce: [...WSPOLNE, 'rodzaj', 'kraina', 'sekta', 'postacie', 'konteksty'],
  kontekst: [...WSPOLNE, 'rodzaj', 'dzielo', 'rok', 'autor', 'postacie', 'pojecia', 'watki'],
  pojecie: [...WSPOLNE, 'rodzaj', 'postacie', 'krainy', 'sekty', 'miejsca', 'konteksty'],
  relacja: [...WSPOLNE, 'postacie', 'rodzaj_relacji', 'watki'],
};

/** Pola-relacje: nazwa → typ celu i kształt wartości. */
export const POLA_RELACJI = {
  rozdzial: { typ: 'rozdzial', wiele: false },
  epizod: { typ: 'epizod', wiele: false },
  epizody: { typ: 'epizod', wiele: true },
  sceny: { typ: 'scena', wiele: true },
  krainy: { typ: 'kraina', wiele: true },
  sekty: { typ: 'sekta', wiele: true },
  miejsca: { typ: 'miejsce', wiele: true },
  postacie: { typ: 'postac', wiele: true },
  watki: { typ: 'watek', wiele: true },
  relacje: { typ: 'relacja', wiele: true },
  konteksty: { typ: 'kontekst', wiele: true },
  pojecia: { typ: 'pojecie', wiele: true },
  nastepny: { typ: 'rozdzial', wiele: false },
  pierwsze_wystapienie: { typ: 'scena', wiele: false },
  sekta: { typ: 'sekta', wiele: false },
  kraina: { typ: 'kraina', wiele: false },
  siedziba: { typ: 'miejsce', wiele: false },
};

/** Sekcje wymagane w treści strony, zależnie od typu. */
export const SEKCJE_WYMAGANE = {
  rozdzial: ['Streszczenie'],
  epizod: ['Streszczenie'],
  scena: ['Treść sceny', 'Analiza'],
  postac: ['Opis'],
  sekta: ['Opis'],
  kraina: ['Opis'],
  miejsce: ['Opis'],
  pojecie: ['Opis'],
  kontekst: ['Opis'],
  watek: ['Opis'],
  relacja: ['Opis'],
};

/**
 * Pola wpisu historii interpretacji (ADR 0006).
 * `poprzednio` trzyma DOSŁOWNE brzmienie zastąpionej wersji, nie streszczenie.
 */
export const POLA_INTERPRETACJI = [
  'data', 'zmiana', 'autor', 'dotyczy', 'fragment', 'poprzednio', 'pewnosc', 'pewnosc_poprzedniego',
];

/** Wyciąga tytuły sekcji h2 z ciała markdown (poza blokami surowymi). */
export function wytnijSekcje(body) {
  const tytuly = [];
  let wZapisie = false;
  for (const linia of String(body ?? '').split('\n')) {
    const t = linia.trim();
    if (/^:::/.test(t)) { wZapisie = !wZapisie; continue; }
    if (wZapisie) continue;
    const m = linia.match(/^##\s+(.+?)\s*$/);
    if (m) tytuly.push(m[1]);
  }
  return tytuly;
}

/** Bloki treści: `[{ pochodzenie, rodzaj, atrybuty }]`, pomijając bloki surowe. */
export function wytnijBloki(body) {
  const bloki = [];
  let wZapisie = false;
  for (const linia of String(body ?? '').split('\n')) {
    const t = linia.trim();
    if (/^:::/.test(t)) { wZapisie = !wZapisie; continue; }
    if (wZapisie) continue;
    const m = t.match(BLOK_OTWARCIA_RE);
    if (m) {
      const atrybuty = parsujAtrybutyBloku(m[2]);
      const pochodzenie = m[1];
      // `{{model pewnosc=…}}` bez podanego rodzaju to interpretacja — taka sama
      // reguła jak w rendererze, żeby walidacja nie rozjechała się z widokiem.
      const rodzaj = atrybuty.get('rodzaj')
        ?? (pochodzenie === 'model' && atrybuty.has('pewnosc') ? 'interpretacja' : null);
      bloki.push({ pochodzenie, rodzaj, atrybuty });
    }
  }
  return bloki;
}

/**
 * Czy strona podaje adres źródła: pole `zrodla` albo sekcja „## Źródła” z linkiem http(s).
 * Blok `{{kwerenda/…}}` bez tego byłby twierdzeniem bez dowodu (ADR 0009, 0015).
 */
export function maBlokZrodla(body) {
  const sekcja = String(body ?? '').match(/^##\s+Źródła[ \t]*$([\s\S]*?)(?=^##\s|$(?![\s\S]))/m);
  return Boolean(sekcja && /https?:\/\//.test(sekcja[1]));
}

/** Wycina treść bloku `:::zapis … :::` (wszystkie bloki, w kolejności). */
export function wytnijBlokiZapisu(body) {
  const wynik = [];
  const linie = String(body ?? '').split('\n');
  let bufor = null;
  for (const linia of linie) {
    const t = linia.trim();
    if (bufor === null && /^:::/.test(t)) { bufor = []; continue; }
    if (bufor !== null) {
      if (/^:::\s*$/.test(t)) { wynik.push(bufor.join('\n')); bufor = null; continue; }
      bufor.push(linia);
    }
  }
  return wynik;
}

/** Normalizacja do porównania wierności: wszystkie białe znaki → pojedyncza spacja. */
export const normalizujTekst = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

/**
 * Elementy sceny: kwestie (`**Postać:** …`) i narracja (akapity poza kwestiami).
 * Brama minimalnego rozmiaru sceny liczy je, żeby nie powstawały sceny jednozdaniowe.
 */
export function policzElementySceny(body) {
  let kwestie = 0;
  let narracja = 0;
  for (const blok of wytnijBlokiZapisu(body)) {
    let wAkapicie = false;
    for (const linia of blok.split('\n')) {
      const t = linia.trim();
      if (t === '') { wAkapicie = false; continue; }
      if (/^\*\*[^*]+\*\*:/.test(t)) { kwestie += 1; wAkapicie = false; continue; }
      if (!wAkapicie) { narracja += 1; wAkapicie = true; }
    }
  }
  return { kwestie, narracja, razem: kwestie + narracja };
}

/** Waliduje jedną stronę; zwraca listę problemów (pusta = OK). */
export function walidujStrone(strona, ctx) {
  const p = [];
  const gdzie = strona?.slug ?? strona?.plik ?? '(bez sluga)';
  if (!strona || typeof strona !== 'object') return [`strona: brak obiektu (${gdzie})`];

  if (!TYPY_STRON.includes(strona.typ)) p.push(`${gdzie}: nieznany typ "${strona.typ}"`);
  if (!SLUG_RE.test(strona.slug ?? '')) p.push(`${gdzie}: slug "${strona.slug}" nie przechodzi wzorca ${SLUG_RE}`);
  if (typeof strona.tytul !== 'string' || strona.tytul.trim() === '') p.push(`${gdzie}: brak tytułu`);

  // Nieznane pola: literówka nie może po cichu wypaść z grafu.
  const dozwolone = POLA_DOZWOLONE[strona.typ];
  if (dozwolone) {
    for (const pole of Object.keys(strona)) {
      if (['plik', 'body', 'problem', 'surowy'].includes(pole)) continue;
      if (!dozwolone.includes(pole)) {
        p.push(`${gdzie}: pole "${pole}" nie należy do schematu typu "${strona.typ}" (dozwolone: ${dozwolone.join(', ')})`);
      }
    }
  }

  if (strona.utworzono !== undefined && !czyPoprawnaData(String(strona.utworzono))) {
    p.push(`${gdzie}: utworzono "${strona.utworzono}" nie jest poprawną datą YYYY-MM-DD`);
  }
  if (!Array.isArray(strona.tagi)) {
    if (strona.tagi !== undefined) p.push(`${gdzie}: tagi muszą być tablicą`);
  } else if (strona.tagi.some((t) => typeof t !== 'string' || !SLUG_RE.test(t))) {
    p.push(`${gdzie}: tagi muszą być slugami (małe litery, myślniki)`);
  }

  for (const z of strona.zrodla ?? []) {
    if (typeof z !== 'string' || !/^https?:\/\//.test(z)) {
      p.push(`${gdzie}: źródło "${z}" nie jest adresem http(s)`);
    }
  }

  // Odsyłacze: każde pole-relacja musi wskazywać istniejącą stronę właściwego typu.
  for (const [pole, { typ, wiele }] of Object.entries(POLA_RELACJI)) {
    const wartosc = strona[pole];
    if (wartosc === undefined || wartosc === null) continue;
    if (wiele && !Array.isArray(wartosc)) { p.push(`${gdzie}: "${pole}" musi być tablicą slugów`); continue; }
    if (!wiele && typeof wartosc !== 'string') { p.push(`${gdzie}: "${pole}" musi być pojedynczym slugiem`); continue; }
    for (const cel of wiele ? wartosc : [wartosc]) {
      const stronaCelu = ctx.bySlug.get(cel);
      if (!stronaCelu) p.push(`${gdzie}: "${pole}" → "${cel}" nie istnieje w bazie`);
      else if (stronaCelu.typ !== typ) p.push(`${gdzie}: "${pole}" → "${cel}" ma typ "${stronaCelu.typ}", oczekiwano "${typ}"`);
    }
    if (wiele && new Set(wartosc).size !== wartosc.length) {
      p.push(`${gdzie}: "${pole}" zawiera powtórzony slug`);
    }
  }

  // Pochodzenie (kolor) i opcjonalny rodzaj (warstwa) — interpretacja ma pewność.
  for (const blok of wytnijBloki(strona.body ?? '')) {
    if (!POCHODZENIA.includes(blok.pochodzenie)) continue; // o nieznanym pochodzeniu mówi renderer
    if (blok.rodzaj && !RODZAJE_TRESCI.includes(blok.rodzaj)) continue;
    const pewnosc = blok.atrybuty.get('pewnosc');
    if (blok.rodzaj === 'interpretacja' && pewnosc === undefined) {
      p.push(`${gdzie}: interpretacja bez pewnosc= (ADR 0005)`);
    }
    if (pewnosc !== undefined && !czyPewnosc(pewnosc)) {
      p.push(`${gdzie}: pewność "${pewnosc}" poza zakresem 0–100`);
    }
    if (pewnosc !== undefined && blok.pochodzenie !== 'model') {
      p.push(`${gdzie}: atrybut pewnosc przysługuje tylko wiedzy modelu — {{${blok.pochodzenie}}} jest pewne z definicji`);
    }
    // Kwerenda bez adresu źródła to twierdzenie bez dowodu — ten sam wymóg co pole `zrodla`.
    if (blok.pochodzenie === 'kwerenda' && !(Array.isArray(strona.zrodla) && strona.zrodla.length > 0) && !maBlokZrodla(strona.body)) {
      p.push(`${gdzie}: blok kwerendy bez adresu źródła — dodaj pole "zrodla" albo sekcję „## Źródła”`);
    }
  }

  const sekcje = wytnijSekcje(strona.body ?? '');
  for (const s of SEKCJE_WYMAGANE[strona.typ] ?? []) {
    if (!sekcje.includes(s)) p.push(`${gdzie}: brak obowiązkowej sekcji "## ${s}"`);
  }

  p.push(...walidujInterpretacje(strona, sekcje));

  switch (strona.typ) {
    case 'rozdzial': {
      if (!Number.isInteger(strona.numer) || strona.numer < 1) {
        p.push(`${gdzie}: rozdział wymaga liczbowego "numer" ≥ 1`);
      }
      if (strona.status !== undefined && !STATUSY.includes(strona.status)) {
        p.push(`${gdzie}: status "${strona.status}" poza ${STATUSY.join('/')}`);
      }
      break;
    }
    case 'epizod': {
      if (typeof strona.rozdzial !== 'string' || strona.rozdzial === '') {
        p.push(`${gdzie}: epizod wymaga pola "rozdzial"`);
      }
      if (strona.rodzaj !== undefined && !RODZAJE_EPIZODU.includes(strona.rodzaj)) {
        p.push(`${gdzie}: rodzaj "${strona.rodzaj}" poza ${RODZAJE_EPIZODU.join('/')}`);
      }
      if (!Number.isInteger(strona.kolejnosc) || strona.kolejnosc < 1) {
        p.push(`${gdzie}: epizod wymaga liczbowego "kolejnosc" ≥ 1 (kolejność w rozdziale)`);
      }
      break;
    }
    case 'scena': {
      if (typeof strona.epizod !== 'string' || strona.epizod === '') {
        p.push(`${gdzie}: scena wymaga pola "epizod"`);
      }
      if (typeof strona.numer_sceny !== 'string' || strona.numer_sceny.trim() === '') {
        p.push(`${gdzie}: "numer_sceny" musi być niepustym tekstem (numeracja zależy od epizodu)`);
      }
      if (typeof strona.streszczenie !== 'string' || strona.streszczenie.trim() === '') {
        p.push(`${gdzie}: scena wymaga niepustego pola "streszczenie"`);
      }
      if (!Number.isInteger(strona.kolejnosc) || strona.kolejnosc < 1) {
        p.push(`${gdzie}: scena wymaga liczbowego "kolejnosc" ≥ 1 (globalny porządek rozegrania, ADR 0007)`);
      }
      const elementy = policzElementySceny(strona.body ?? '');
      if (elementy.razem < 2) {
        p.push(`${gdzie}: scena ma ${elementy.razem} element(ów) — minimum to 2 kwestie/narracje; pojedyncze zdanie dołącz do sąsiedniej sceny (ADR 0008)`);
      }
      if (wytnijBlokiZapisu(strona.body ?? '').length === 0) {
        p.push(`${gdzie}: scena bez bloku :::zapis — nie ma dosłownego tekstu rozgrywki`);
      }
      break;
    }
    case 'postac': {
      if (strona.rola !== undefined && !ROLE_POSTACI.includes(strona.rola)) {
        p.push(`${gdzie}: rola "${strona.rola}" poza ${ROLE_POSTACI.join('/')}`);
      }
      if (strona.pseudonim !== undefined && strona.pseudonim === strona.tytul) {
        p.push(`${gdzie}: "pseudonim" powtarza tytuł — tytułem ma być imię postaci`);
      }
      break;
    }
    case 'sekta': {
      if (strona.rodzaj !== undefined && !RODZAJE_SEKTY.includes(strona.rodzaj)) {
        p.push(`${gdzie}: rodzaj "${strona.rodzaj}" poza ${RODZAJE_SEKTY.join('/')}`);
      }
      break;
    }
    case 'kraina': {
      if (strona.rodzaj !== undefined && !RODZAJE_KRAINY.includes(strona.rodzaj)) {
        p.push(`${gdzie}: rodzaj "${strona.rodzaj}" poza ${RODZAJE_KRAINY.join('/')}`);
      }
      break;
    }
    case 'miejsce': {
      // Miejsce stoi w krainie; dawny klucz `rozdzial` wycofano (ADR 0013).
      if (strona.rozdzial !== undefined) {
        p.push(`${gdzie}: pole "rozdzial" należy do epizodu, nie do miejsca — użyj "kraina"`);
      }
      break;
    }
    case 'pojecie': {
      if (strona.rodzaj !== undefined && !RODZAJE_POJECIA.includes(strona.rodzaj)) {
        p.push(`${gdzie}: rodzaj "${strona.rodzaj}" poza ${RODZAJE_POJECIA.join('/')}`);
      }
      break;
    }
    case 'kontekst': {
      if (strona.rodzaj !== undefined && !RODZAJE_KONTEKSTU.includes(strona.rodzaj)) {
        p.push(`${gdzie}: rodzaj "${strona.rodzaj}" poza ${RODZAJE_KONTEKSTU.join('/')}`);
      }
      if (strona.rok !== undefined && !Number.isInteger(strona.rok)) {
        p.push(`${gdzie}: "rok" musi być liczbą całkowitą`);
      }
      break;
    }
    case 'watek': {
      if (strona.rodzaj_watku !== undefined && !RODZAJE_WATKU.includes(strona.rodzaj_watku)) {
        p.push(`${gdzie}: rodzaj_watku "${strona.rodzaj_watku}" poza ${RODZAJE_WATKU.join('/')}`);
      }
      break;
    }
    case 'relacja': {
      const postacie = Array.isArray(strona.postacie) ? strona.postacie : [];
      if (postacie.length < 2) p.push(`${gdzie}: relacja wymaga co najmniej 2 postaci`);
      if (new Set(postacie).size !== postacie.length) p.push(`${gdzie}: relacja powtarza postać`);
      if (strona.rodzaj_relacji !== undefined && !RODZAJE_RELACJI.includes(strona.rodzaj_relacji)) {
        p.push(`${gdzie}: rodzaj_relacji "${strona.rodzaj_relacji}" poza ${RODZAJE_RELACJI.join('/')}`);
      }
      break;
    }
    default:
      break;
  }

  return p;
}

/**
 * Waliduje listę `interpretacje` (ADR 0006): historia decyzji, dosłowne brzmienie
 * poprzedniej wersji i czas, w którym przestała obowiązywać.
 */
export function walidujInterpretacje(strona, sekcje = wytnijSekcje(strona?.body ?? '')) {
  const gdzie = strona?.slug ?? '(bez sluga)';
  const wpisy = strona?.interpretacje;
  if (wpisy === undefined) return [];
  if (!Array.isArray(wpisy)) return [`${gdzie}: "interpretacje" musi być listą wpisów`];

  const problemy = [];
  const zbiorSekcji = new Set(sekcje);

  wpisy.forEach((wpis, indeks) => {
    const nr = indeks + 1;
    if (!wpis || typeof wpis !== 'object' || Array.isArray(wpis)) {
      problemy.push(`${gdzie}: wpis ${nr} historii interpretacji nie jest obiektem`);
      return;
    }
    for (const pole of Object.keys(wpis)) {
      if (!POLA_INTERPRETACJI.includes(pole)) {
        problemy.push(`${gdzie}: wpis ${nr} historii ma pole "${pole}" spoza schematu (${POLA_INTERPRETACJI.join(', ')})`);
      }
    }
    if (!czyPoprawnaDataCzas(String(wpis.data ?? ''))) {
      problemy.push(`${gdzie}: wpis ${nr} historii wymaga daty i godziny "data: RRRR-MM-DD GG:MM" (ADR 0006)`);
    }
    if (typeof wpis.zmiana !== 'string' || wpis.zmiana.trim() === '') {
      problemy.push(`${gdzie}: wpis ${nr} historii wymaga niepustego pola "zmiana"`);
    }
    if (wpis.poprzednio !== undefined) {
      if (typeof wpis.poprzednio !== 'string' || wpis.poprzednio.trim() === '') {
        problemy.push(`${gdzie}: wpis ${nr} historii ma puste "poprzednio" — usuń pole, jeśli nie było poprzedniej wersji`);
      }
      if (typeof wpis.fragment !== 'string' || wpis.fragment.trim() === '') {
        problemy.push(`${gdzie}: wpis ${nr} historii z "poprzednio" wymaga pola "fragment" (tytuł sekcji, w której się pokaże)`);
      } else if (!zbiorSekcji.has(wpis.fragment)) {
        problemy.push(`${gdzie}: wpis ${nr} historii wskazuje nieistniejącą sekcję "## ${wpis.fragment}"`);
      }
    }
    for (const pole of ['pewnosc', 'pewnosc_poprzedniego']) {
      if (wpis[pole] !== undefined && !czyPewnosc(wpis[pole])) {
        problemy.push(`${gdzie}: wpis ${nr} historii ma "${pole}" poza zakresem 0–100`);
      }
    }
  });

  return problemy;
}

/**
 * Wierność zapisu sceny (ADR 0008): każdy blok `:::zapis` musi być dosłownym
 * fragmentem archiwum rozgrywki. Przeredagowana scena nie przechodzi — bo
 * wtedy przestaje być dowodem, a staje się czyimś streszczeniem w cudzysłowie.
 */
export function sprawdzWiernoscSceny(strona, tekstZapisu) {
  if (strona.typ !== 'scena') return [];
  const gdzie = strona.slug;
  if (tekstZapisu == null) return [`${gdzie}: brak archiwum zapisu, nie da się sprawdzić dosłowności sceny`];
  const bloki = wytnijBlokiZapisu(strona.body);
  if (bloki.length === 0) return [`${gdzie}: brak bloku :::zapis z treścią sceny`];
  const archiwum = normalizujTekst(tekstZapisu);
  const problemy = [];
  for (const [indeks, blok] of bloki.entries()) {
    const tresc = normalizujTekst(blok);
    if (tresc === '') { problemy.push(`${gdzie}: blok :::zapis ${indeks + 1} jest pusty`); continue; }
    if (!archiwum.includes(tresc)) {
      problemy.push(`${gdzie}: blok :::zapis ${indeks + 1} nie jest dosłownym fragmentem zapisu rozgrywki (przeredagowano lub pomylono wiersze)`);
    }
  }
  return problemy;
}

/**
 * Brama granicy fabuły (ADR 0007).
 *
 * Baza rośnie w tempie grania: `rozgrywka/postep.json` podaje ostatnią
 * rozegraną scenę, a build odrzuca każdą scenę, która leży dalej. Pozwala to
 * trzymać w repozytorium materiały na przyszłość bez ryzyka spoilera.
 */
export function sprawdzGraniceFabuly(sceny, postep) {
  const problemy = [];
  if (!postep || typeof postep !== 'object') {
    return ['rozgrywka/postep.json: brak pliku postępu — bez niego nie da się pilnować granicy fabuły'];
  }
  const ostatnia = postep.ostatnia_scena;
  if (typeof ostatnia !== 'string' || ostatnia === '') {
    return ['rozgrywka/postep.json: brak pola "ostatnia_scena"'];
  }
  const granica = sceny.find((s) => s.slug === ostatnia);
  if (!granica) return [`rozgrywka/postep.json: "ostatnia_scena" → "${ostatnia}" nie jest sceną w bazie`];

  for (const s of sceny) {
    if (typeof s.kolejnosc !== 'number') continue;
    if (s.kolejnosc > granica.kolejnosc) {
      problemy.push(`${s.slug}: scena leży za granicą rozegranej fabuły (kolejnosc ${s.kolejnosc} > ${granica.kolejnosc} przy "${ostatnia}") — to spoiler (ADR 0007)`);
    }
  }

  // Globalny porządek rozegrania musi być ciągły: dziura oznacza brakującą scenę,
  // a duplikat — dwie sceny roszczące sobie to samo miejsce w fabule.
  const kolejnosc = sceny.map((s) => s.kolejnosc).filter((n) => typeof n === 'number').sort((a, b) => a - b);
  const duplikaty = kolejnosc.filter((n, i) => i > 0 && n === kolejnosc[i - 1]);
  for (const d of new Set(duplikaty)) problemy.push(`kolejnosc ${d}: więcej niż jedna scena rości sobie to miejsce w fabule`);
  const maks = kolejnosc.at(-1) ?? 0;
  for (let n = 1; n <= maks; n += 1) {
    if (!kolejnosc.includes(n)) problemy.push(`kolejnosc ${n}: brak sceny — porządek rozegrania musi być ciągły od 1`);
  }

  return problemy;
}

/**
 * Brama epizodu i rozdziału: liczby porządkowe muszą być ciągłe i zgodne
 * z relacjami, bo inaczej lista „co dalej” kłamie.
 */
export function sprawdzPorzadekEpizodow(epizody, rozdzialy) {
  const problemy = [];
  const poRozdziale = new Map();
  for (const z of epizody) {
    if (!poRozdziale.has(z.rozdzial)) poRozdziale.set(z.rozdzial, []);
    poRozdziale.get(z.rozdzial).push(z);
  }
  for (const [slugRozdzialu, lista] of poRozdziale) {
    const numery = lista.map((z) => z.kolejnosc).sort((a, b) => a - b);
    for (let n = 1; n <= (numery.at(-1) ?? 0); n += 1) {
      if (!numery.includes(n)) problemy.push(`${slugRozdzialu}: brak epizodu o kolejnosc ${n} — numeracja w rozdziale musi być ciągła`);
    }
  }
  const numeryRozdzialow = rozdzialy.map((r) => r.numer).sort((a, b) => a - b);
  for (let n = 1; n <= (numeryRozdzialow.at(-1) ?? 0); n += 1) {
    if (!numeryRozdzialow.includes(n)) problemy.push(`brak rozdziału o numerze ${n} — numeracja rozdziałów musi być ciągła`);
  }
  return problemy;
}

const porownajNumery = new Intl.Collator('pl', { numeric: true, sensitivity: 'base' }).compare;

/** Sceny w kolejności numerycznej numeru sceny (1-2 przed 1-10). */
export function sortujSceny(sceny) {
  return [...sceny].sort((a, b) => porownajNumery(String(a.numer_sceny ?? ''), String(b.numer_sceny ?? '')));
}

/** Buduje rejestr slug→strona; wykrywa duplikaty (jedna przestrzeń nazw). */
export function zbudujRejestr(strony) {
  const bySlug = new Map();
  const duplikaty = [];
  for (const s of strony) {
    if (bySlug.has(s.slug)) duplikaty.push(`${s.slug} (${bySlug.get(s.slug).plik} oraz ${s.plik})`);
    else bySlug.set(s.slug, s);
  }
  return { bySlug, duplikaty };
}

/** Resolver wikilinków dla renderera markdown. */
export function resolverLinkow(bySlug) {
  return (slug) => {
    const strona = bySlug.get(slug);
    if (!strona) return null;
    return { href: hrefDlaSlug(strona.slug, strona.typ), tytul: strona.tytul, typ: strona.typ };
  };
}

/** Backlinki: slug → posortowane [{slug, typ}] stron linkujących. */
export function policzBacklinki(strony) {
  const backlinki = {};
  for (const s of strony) {
    for (const cel of s.linki ?? []) {
      if (!backlinki[cel]) backlinki[cel] = [];
      if (!backlinki[cel].some((x) => x.slug === s.slug)) backlinki[cel].push({ slug: s.slug, typ: s.typ });
    }
  }
  for (const k of Object.keys(backlinki)) backlinki[k].sort((a, b) => a.slug.localeCompare(b.slug, 'pl'));
  return backlinki;
}

/** Indeks tagów: tag → posortowane slugi. */
export function policzTagi(strony) {
  const tagi = {};
  for (const s of strony) {
    for (const t of s.tagi ?? []) {
      if (!tagi[t]) tagi[t] = [];
      tagi[t].push(s.slug);
    }
  }
  for (const k of Object.keys(tagi)) tagi[k].sort();
  return tagi;
}

/** Wszystkie odsyłacze strony (pola-relacje + wikilinki z treści) bez duplikatów. */
export function odsylaczeStrony(strona) {
  const zbior = new Set();
  for (const [pole, { wiele }] of Object.entries(POLA_RELACJI)) {
    const wartosc = strona[pole];
    if (wiele && Array.isArray(wartosc)) for (const cel of wartosc) zbior.add(cel);
    if (!wiele && typeof wartosc === 'string' && wartosc !== '') zbior.add(wartosc);
  }
  for (const cel of strona.linki ?? []) zbior.add(cel);
  zbior.delete(strona.slug);
  return [...zbior];
}

/** Agregaty widoczne na stronie głównej i w stopce. */
export function policzStatystyki(strony) {
  const s = {
    rozdzial: 0, epizod: 0, scena: 0, watek: 0, postac: 0, sekta: 0,
    kraina: 0, miejsce: 0, kontekst: 0, pojecie: 0, relacja: 0, powiazania: 0,
  };
  for (const p of strony) {
    if (Object.prototype.hasOwnProperty.call(s, p.typ)) s[p.typ] += 1;
    s.powiazania += odsylaczeStrony(p).length;
  }
  return s;
}

export { slugify };
