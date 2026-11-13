/**
 * „Co nowego” i „Jak czytać kronikę”.
 *
 * Dziennik mówi wyłącznie o nowym pokryciu opowieści (ADR 0011, 0014): czytelnika
 * interesuje, że doszła scena, postać albo wątek — nie to, że poprawiono zdanie
 * albo zmieniono układ strony. Poprawki mają własną historię w `interpretacje:`
 * i w boksie „Poprzednia wersja” na stronie, której dotyczą.
 */

import { escapeHtml } from './markdown.js';
import { dajDane } from './data.js';
import { naglowekStrony, stanPusty, okruszki, legendaPoziomow } from './render.js';

export function renderCoNowego() {
  const wpisy = dajDane().coNowego ?? [];
  const naglowek = naglowekStrony({
    tytul: 'Co nowego',
    opis: 'Kolejne sceny, osoby i miejsca dopisane do opowieści — najnowsze u góry.',
    sciezka: okruszki([{ etykieta: 'Co nowego' }]),
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

/**
 * Legenda poziomów i zasady czytania. Strona mówi o tym, jak czytać opowieść
 * i skąd wiadomo, co w niej jest pewne — a nie o tym, jak powstała.
 */
export function renderOBazie() {
  const naglowek = naglowekStrony({
    tytul: 'Jak czytać kronikę',
    opis: 'Świat opowieści i klucz do oznaczeń: skąd wiadomo, co jest słowami historii, a co domysłem.',
    sciezka: okruszki([{ etykieta: 'Jak czytać kronikę' }]),
  });

  return `${naglowek}
<section class="boks">
  <h2>Świat opowieści</h2>
  <p><em>Where Winds Meet</em> rozgrywa się w Chinach 962 roku, w epoce Pięciu Dynastii,
  u progu nowej dynastii Song. Jianghu — świat wędrownych mistrzów i szkół walki —
  rządzi się własnym prawem: słowem danym raz i długiem, którego nie da się spłacić.
  Historię opowiada wędrowiec szukający własnego pochodzenia.</p>
  <p>Od pierwszych scen wiadomo, że odpowiedzi nie leżą na drodze. Leżą w bocznych ścieżkach,
  w cudzych wspomnieniach i w księgach, które przechowują sekty.</p>
</section>
<section class="boks">
  <h2>Klucz do oznaczeń</h2>
  ${legendaPoziomow()}
</section>
<section class="boks">
  <h2>Skąd wiadomo, co jest prawdą opowieści</h2>
  <p>Słowa bohaterów i narrację poznajemy z samej historii. Streszczenia i powiązania
  porządkują to, co już się wydarzyło. Tło kulturowe — chińskie księgi, poematy, obyczaj
  jianghu — jest oznaczone osobno, bo należy do świata, z którego opowieść wyrasta,
  a nie do jej wydarzeń.</p>
  <p>Tam, gdzie historia nie mówi wprost, a wniosek daje się uzasadnić, stoi interpretacja
  z oszacowaną pewnością. Nigdy nie udaje faktu.</p>
</section>
<section class="boks">
  <h2>Granica opowieści</h2>
  <p>Kronika opisuje tylko to, co zostało już opowiedziane. Nie wyprzedza wydarzeń,
  nie zdradza ról ani losów postaci, które jeszcze się nie pojawiły — nawet jeśli
  historia zna je z innych źródeł. Miejsce, w którym opowieść się zatrzymuje, widać
  na stronie głównej i w chronologii.</p>
  <p class="meta">Nazwy własne zachowują pisownię oryginalną. Kronika jest nieoficjalna
  i niepowiązana z twórcami gry.</p>
</section>`;
}
