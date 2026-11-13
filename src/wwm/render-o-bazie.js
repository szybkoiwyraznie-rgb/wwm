/**
 * „Co nowego” i „O bazie”.
 *
 * Dziennik mówi o nowym pokryciu fabuły, nie o pracy redakcyjnej (ADR 0011):
 * czytelnika interesuje, że doszła scena albo postać, nie że poprawiono literówkę.
 */

import { escapeHtml } from './markdown.js';
import { dajDane } from './data.js';
import { naglowekStrony, stanPusty, okruszki, legendaPoziomow, odmiana } from './render.js';

export function renderCoNowego() {
  const wpisy = dajDane().coNowego ?? [];
  const naglowek = naglowekStrony({
    tytul: 'Co nowego',
    opis: 'Kolejne sceny, postacie i hasła dopisane do bazy — najnowsze u góry.',
    sciezka: okruszki([{ etykieta: 'Baza', href: '#/' }, { etykieta: 'Co nowego' }]),
  });

  if (wpisy.length === 0) {
    return `${naglowek}${stanPusty('Dziennik jest jeszcze pusty.')}`;
  }

  return `${naglowek}<ol class="lista-dziennika">
    ${wpisy.map((w) => `<li class="wpis-dziennika">
      <p class="wpis-data"><time>${escapeHtml(w.data)}${w.czas ? ` ${escapeHtml(w.czas)}` : ''}</time></p>
      <div class="wpis-tresc">${w.html ?? escapeHtml(w.tekst ?? '')}</div>
    </li>`).join('')}
  </ol>`;
}

const ZASADY = [
  ['Scena jest jednostką', 'Fabuła rośnie scena po scenie. Scena to wymiana, która zmienia miejsce, czas albo skład rozmowy — nie pojedyncze zdanie.'],
  ['Żadnych spoilerów', 'Baza opisuje tylko to, co zostało rozegrane. Nie ma tu wydarzeń, postaci ani ról wykraczających poza widzianą fabułę, nawet jeśli są znane z innych źródeł.'],
  ['Kolor mówi, czym jest fragment', 'Białe tło to dosłowne słowa z gry. Zielone — streszczenie. Niebieskie — spis powiązań. Fioletowe — wniosek autora bazy.'],
  ['Pewność mówi, jak mocny jest wniosek', 'Każda hipoteza ma oszacowaną pewność i historię zmian. Gdy wniosek się zmienia, poprzednie brzmienie zostaje w boksie pod „Poprzednią wersją” wraz z datą, kiedy przestało obowiązywać.'],
  ['Kontekst kulturowy jest osobno', 'Nawiązania do chińskiej literatury, historii i konwencji wuxia mają własny dział i własne oznaczenie pochodzenia — bo gra czerpie z nich świadomie, ale to nie jest jeszcze fabuła gry.'],
];

export function renderOBazie() {
  const dane = dajDane();
  const st = dane.statystyki ?? {};

  const naglowek = naglowekStrony({
    tytul: 'O bazie',
    opis: 'Jak działa ta baza i skąd pochodzą informacje w niej zapisane.',
    sciezka: okruszki([{ etykieta: 'Baza', href: '#/' }, { etykieta: 'O bazie' }]),
  });

  const liczby = [
    ['scena', 'scen'],
    ['zadanie', 'zadań'],
    ['postac', 'postaci'],
    ['miejsce', 'miejsc'],
    ['pojecie', 'haseł'],
    ['kontekst', 'kontekstów'],
    ['watek', 'wątków'],
    ['relacja', 'relacji'],
  ].map(([typ, etykieta]) => `<li><strong>${st[typ] ?? 0}</strong> ${etykieta}</li>`).join('');

  return `${naglowek}
<section class="boks">
  <h2>Zasady</h2>
  <dl class="lista-zasad">
    ${ZASADY.map(([tytul, opis]) => `<div><dt>${escapeHtml(tytul)}</dt><dd>${escapeHtml(opis)}</dd></div>`).join('')}
  </dl>
</section>
<section class="boks">
  <h2>Legenda kolorów</h2>
  ${legendaPoziomow()}
</section>
<section class="boks">
  <h2>Co jest w bazie</h2>
  <ul class="liczby-bazy">${liczby}</ul>
  ${dane.czasBazy?.utworzono ? `<p class="meta">Pierwszy wpis: ${escapeHtml(dane.czasBazy.utworzono)} · ostatnia zmiana: ${escapeHtml(dane.czasBazy.zaktualizowano ?? '')}</p>` : ''}
</section>
<section class="boks">
  <h2>Skąd pochodzą informacje</h2>
  <p>Zapis rozgrywki pochodzi z samej gry. Streszczenia i analizy są pisane na jego podstawie.
  Wiedza o kulturze Chin i konwencji wuxia jest oznaczana osobno, bo bywa niepewna i wymaga
  źródła. Wnioski, których nie da się wyprowadzić wprost z tekstu, są hipotezami z pewnością —
  nigdy nie udają faktów.</p>
  <p class="meta">Baza jest nieoficjalna i niepowiązana z twórcami gry. Nazwy własne zachowują
  pisownię oryginalną.</p>
</section>`;
}
