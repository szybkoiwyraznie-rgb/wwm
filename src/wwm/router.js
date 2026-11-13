/**
 * Router po hashu (ADR 0001): jedyny mechanizm „URL-i”, który działa
 * identycznie z file:// i przez HTTPS, bez konfiguracji serwera.
 *
 * Postać trasy: #/<nazwa>[/<param>][?zapytanie]
 * Przykłady: #/  #/scena/rozstanie-na-przystani  #/chronologia
 *            #/szukaj?q=kaifeng  #/hipotezy  #/tag/qinghe
 */

export const TRASY_ZNAWE = [
  'glowna', 'chronologia',
  'rozdzialy', 'rozdzial', 'epizody', 'epizod', 'sceny', 'scena',
  'watki', 'watek', 'postacie', 'postac', 'sekty', 'sekta',
  'krainy', 'kraina', 'miejsca', 'miejsce', 'konteksty', 'kontekst',
  'pojecia', 'pojecie', 'relacje', 'relacja',
  'hipotezy', 'tagi', 'tag', 'szukaj', 'co-nowego', 'o-bazie',
];

export function parsujHash(hash) {
  const surowy = String(hash ?? '').replace(/^#/, '');
  const [sciezka, zapytanie] = surowy.split('?');
  const segmenty = sciezka.split('/').filter((s) => s !== '').map((s) => {
    try { return decodeURIComponent(s); } catch { return s; }
  });
  const query = {};
  if (zapytanie) for (const [k, v] of new URLSearchParams(zapytanie).entries()) query[k] = v;

  if (segmenty.length === 0) return { nazwa: 'glowna', param: null, query };
  const [nazwa, ...reszta] = segmenty;
  const param = reszta.length > 0 ? reszta.join('/') : null;
  if (!TRASY_ZNAWE.includes(nazwa)) return { nazwa: 'nieznana', param, query };
  return { nazwa, param, query };
}

export function aktualnaTrasa() {
  return parsujHash(globalThis.location?.hash ?? '');
}

/**
 * Rejestruje nasłuch zmian hasha + start; zwraca funkcję stopu (testy).
 * `obejrz` może być asynchroniczny (dociąganie ciała strony, ADR 0017) — router
 * nie czeka, a błąd renderu trafia do konsoli zamiast zniknąć bez śladu.
 */
export function uruchomRouter(obejrz) {
  const zmiana = () => {
    try {
      const wynik = obejrz(aktualnaTrasa());
      if (wynik && typeof wynik.catch === 'function') {
        wynik.catch((blad) => globalThis.console?.error?.('render:', blad));
      }
    } catch (blad) {
      globalThis.console?.error?.('render:', blad);
    }
  };
  globalThis.addEventListener?.('hashchange', zmiana);
  zmiana();
  return () => globalThis.removeEventListener?.('hashchange', zmiana);
}

/** Nawigacja programowa (zachowuje historię przeglądarki). */
export function idz(hash) {
  if (globalThis.location) globalThis.location.hash = hash;
}
