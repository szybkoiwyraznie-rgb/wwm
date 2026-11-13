#!/usr/bin/env node
/**
 * Kontrola spójności archiwum rozgrywki z bazą — narzędzie pomocnicze sesji.
 *
 * Wypisuje, które bloki `:::zapis` w scenach nie są dosłownym fragmentem
 * archiwum, i które fragmenty archiwum nie trafiły jeszcze do żadnej sceny.
 * Build robi to samo twardo; to narzędzie pomaga przed commitem.
 *
 * Uruchomienie: node tools/sprawdz-zapis.mjs [slug-sceny]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wczytajStrony, wczytajZapisy } from './content-loader.mjs';
import { sprawdzWiernoscSceny, wytnijBlokiZapisu, normalizujTekst } from '../src/wwm/registry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filtr = process.argv[2];
const zapisy = wczytajZapisy({ root: ROOT });

if (zapisy.size === 0) {
  console.log('rozgrywka/zapisy/ jest pusta — nie ma z czym porównywać.');
  process.exit(0);
}

const strony = wczytajStrony({ root: ROOT }).filter((s) => s.typ === 'scena');
const wybrane = filtr ? strony.filter((s) => s.slug === filtr) : strony;
let problemow = 0;

for (const s of wybrane) {
  const sciezka = s.zapis ? `rozgrywka/zapisy/${path.basename(s.zapis)}` : null;
  const tekst = sciezka ? zapisy.get(sciezka) ?? null : null;
  const p = sprawdzWiernoscSceny(s, tekst);
  if (p.length > 0) {
    problemow += p.length;
    for (const x of p) console.log(`✗ ${x}`);
  } else {
    console.log(`✓ ${s.slug} — ${wytnijBlokiZapisu(s.body).length} blok(ów) zapisu, dosłowne`);
  }
}

// Pokrycie archiwum: fragmenty między nagłówkami, których nie ma w żadnej scenie.
const uzyte = new Set();
for (const s of strony) for (const b of wytnijBlokiZapisu(s.body)) uzyte.add(normalizujTekst(b));

for (const [sciezka, tekst] of zapisy) {
  const akapity = String(tekst).split(/\n{2,}/).map(normalizujTekst).filter((a) => a.length > 40);
  const pominiete = akapity.filter((a) => ![...uzyte].some((u) => u.includes(a)));
  if (pominiete.length > 0) {
    console.log(`\n${sciezka}: ${pominiete.length} akapit(ów) archiwum poza scenami:`);
    for (const a of pominiete.slice(0, 10)) console.log(`  · ${a.slice(0, 110)}…`);
    if (pominiete.length > 10) console.log(`  … i ${pominiete.length - 10} więcej`);
  }
}

process.exit(problemow > 0 ? 1 : 0);
