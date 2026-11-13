/**
 * Punkt startowy witryny: montuje router i renderery.
 * Po każdym renderze domyka interakcje wymagające DOM.
 */

import { uruchomRouter } from './router.js';
import { rama, tytulStrony, nieZnalesc, nazwaTypu } from './render.js';
import { czasStrony, coNowegoCzas, czasBazy } from './data.js';
import { renderGlowna } from './render-home.js';
import { renderMapa } from './mapa.js';
import { renderEncja } from './render-encja.js';
import { renderScena } from './render-scena.js';
import { renderZadanie, renderRozdzial, renderRozdzialy } from './render-zadanie.js';
import { renderListe, renderHipotezy, renderTagi, renderTag } from './render-listy.js';
import { renderSzukanie } from './render-szukaj.js';
import { renderCoNowego, renderOBazie } from './render-o-bazie.js';

/** Mapa tras list ↔ tras encji (dla podświetlenia nawigacji). */
const LISTA_TRAS = {
  rozdzial: 'rozdzialy', zadanie: 'zadania', scena: 'sceny', postac: 'postacie',
  miejsce: 'miejsca', pojecie: 'pojecia', kontekst: 'konteksty', watek: 'watki', relacja: 'relacje',
};

function renderuj(trasa) {
  const app = globalThis.document?.getElementById('app');
  if (!app) return;

  let aktywna = trasa.nazwa;
  let tytul = 'Baza';
  let html;

  switch (trasa.nazwa) {
    case 'glowna':
      html = renderGlowna(); tytul = 'Fabuła'; aktywna = 'glowna'; break;

    case 'mapa':
      html = renderMapa(); tytul = 'Mapa postępu'; break;

    case 'rozdzial':
      html = renderRozdzial(trasa.param); tytul = 'Rozdział'; aktywna = 'rozdzialy'; break;
    case 'zadanie':
      html = renderZadanie(trasa.param); tytul = 'Zadanie'; aktywna = 'sceny'; break;
    case 'scena':
      html = renderScena(trasa.param); tytul = 'Scena'; aktywna = 'sceny'; break;
    case 'rozdzialy':
      html = renderRozdzialy(); tytul = 'Rozdziały'; break;

    case 'postac':
    case 'miejsce':
    case 'pojecie':
    case 'kontekst':
    case 'watek':
    case 'relacja':
      html = renderEncja(trasa.param);
      tytul = nazwaTypu(trasa.nazwa);
      aktywna = LISTA_TRAS[trasa.nazwa];
      break;

    case 'zadania':
    case 'sceny':
    case 'postacie':
    case 'miejsca':
    case 'pojecia':
    case 'konteksty':
    case 'watki':
    case 'relacje': {
      const typ = Object.keys(LISTA_TRAS).find((t) => LISTA_TRAS[t] === trasa.nazwa);
      html = renderListe(typ, trasa.query);
      tytul = nazwaTypu(typ, 'wiele');
      break;
    }

    case 'hipotezy': html = renderHipotezy(trasa.query); tytul = 'Hipotezy'; break;
    case 'tagi': html = renderTagi(); tytul = 'Tagi'; break;
    case 'tag': html = renderTag(trasa.param); tytul = `Tag: ${trasa.param ?? ''}`; aktywna = 'tagi'; break;
    case 'szukaj': html = renderSzukanie(trasa.query.q); tytul = 'Szukaj'; break;
    case 'co-nowego': html = renderCoNowego(); tytul = 'Co nowego'; break;
    case 'o-bazie': html = renderOBazie(); tytul = 'O bazie'; break;

    default: html = nieZnalesc(trasa.param ?? 'strona'); tytul = 'Nie znaleziono'; break;
  }

  const czas = LISTA_TRAS[trasa.nazwa]
    ? czasStrony(trasa.param)
    : trasa.nazwa === 'co-nowego' ? coNowegoCzas() : czasBazy();

  app.innerHTML = rama(aktywna, tytul, html, {
    szukaj: trasa.query?.q ?? '',
    stopka: czasStopki(czas),
  });
  tytulStrony(tytul);
  domknijInterakcje(app);
}

function czasStopki(czas) {
  if (!czas?.zaktualizowano) return '';
  const czesci = [];
  if (czas.utworzono) czesci.push(`utworzono ${czas.utworzono}`);
  czesci.push(`ostatnia zmiana ${czas.zaktualizowano}`);
  return `<p class="stopka-czas">${czesci.join(' · ')}</p>`;
}

function domknijInterakcje(app) {
  globalThis.scrollTo?.(0, 0);
  const tresc = app.querySelector('.tresc');
  if (tresc) tresc.scrollTop = 0;
}

/**
 * Odsyłacze wewnątrz strony (podsekcja analizy → miejsce w treści sceny) nie
 * mogą zmieniać trasy hashowej, więc przechwytujemy kliknięcie i przewijamy ręcznie.
 */
function podepnijSkokiWStronie() {
  const d = globalThis.document;
  if (!d?.addEventListener) return;
  d.addEventListener('click', (e) => {
    const link = e.target?.closest?.('[data-cel]');
    if (!link) return;
    const cel = d.getElementById(link.dataset.cel);
    if (!cel) return;
    e.preventDefault();
    cel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    cel.classList.remove('podswietlenie');
    void cel.offsetWidth;
    cel.classList.add('podswietlenie');
  });
}

function podepnijFiltry() {
  globalThis.zmienFiltr = function (select) {
    const form = select.closest?.('.filtry');
    const lista = form?.dataset?.lista ?? 'sceny';
    const dane = new FormData(form);
    const query = new URLSearchParams();
    for (const [k, v] of dane.entries()) if (String(v) !== '') query.set(k, String(v));
    const zapytanie = query.toString();
    globalThis.location.hash = `#/${lista}${zapytanie ? `?${zapytanie}` : ''}`;
  };
}

podepnijSkokiWStronie();
podepnijFiltry();

const stop = uruchomRouter(renderuj);
if (globalThis.__WWM_TEST__) globalThis.__WWM_STOP__ = stop;
