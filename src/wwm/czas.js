/**
 * Daty kroniki: poprawność kalendarzowa `RRRR-MM-DD` i `RRRR-MM-DD GG:MM`.
 *
 * Wydzielone z rejestru, żeby renderer mógł sprawdzić datę odczytu źródła bez
 * importowania rejestru — inaczej powstawał cykl (markdown → registry → markdown),
 * a build skleja moduły w jeden plik i cykl po cichu gubiłby moduł.
 */

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
