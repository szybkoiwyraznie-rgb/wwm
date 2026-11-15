/**
 * Graf zależności modułów ESM — używany przez build i testy.
 *
 * Sklejony artefakt ma jeden wspólny zasięg, więc:
 * - cykliczny import po cichu zgubiłby moduł — jest twardym błędem;
 * - kolizja nazw na najwyższym poziomie modułów nadpisałaby symbol —
 *   jest wykrywana przed sklejeniem.
 */

import fs from 'node:fs';
import path from 'node:path';

export const IMPORT_RE = /^[ \t]*import\s+(?:[\s\S]*?\s+from\s+)?['"](\.[^'"]+)['"];?[ \t]*$/gm;
export const REEXPORT_RE = /^[ \t]*export\s+\{[^}]*\}\s+from\s+['"](\.[^'"]+)['"];?[ \t]*$/gm;

function dependenciesOf(source) {
  return [...source.matchAll(IMPORT_RE), ...source.matchAll(REEXPORT_RE)].map((m) => m[1]);
}

/** Rozwiązuje graf importów w kolejności „najgłębsze pierwsze"; rzutuje przy cyklu. */
export function collectModules(entry, { rootDir = '.' } = {}) {
  const modules = [];
  const state = new Map();

  function visit(abs, stack) {
    const seen = state.get(abs);
    if (seen === 'done') return;
    if (seen === 'visiting') {
      const cycle = [...stack.slice(stack.indexOf(abs)), abs]
        .map((p) => path.relative(rootDir, p)).join(' -> ');
      throw new Error(`Wykryto cykliczny import: ${cycle}\nSklejony plik ma jeden zasięg, więc cykl po cichu zgubiłby moduł.`);
    }
    state.set(abs, 'visiting');
    const source = fs.readFileSync(abs, 'utf8');
    for (const dep of dependenciesOf(source)) {
      visit(path.resolve(path.dirname(abs), dep), [...stack, abs]);
    }
    state.set(abs, 'done');
    modules.push({ abs, source });
  }

  visit(path.resolve(rootDir, entry), []);
  return modules;
}

/** Wykrywa kolizje nazw — jeden zasięg oznacza brak izolacji modułów. */
export function assertNoNameCollisions(modules, { rootDir = '.' } = {}) {
  const declared = new Map();
  const declRe = /^(?:export\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
  const problems = [];

  for (const { abs, source } of modules) {
    for (const m of source.matchAll(declRe)) {
      const nazwa = m[1];
      const rel = path.relative(rootDir, abs).replaceAll('\\', '/');
      if (declared.has(nazwa)) {
        problems.push(`kolizja nazwy "${nazwa}" w ${rel} i ${declared.get(nazwa)}`);
      } else {
        declared.set(nazwa, rel);
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(`Kolizje nazw w sklejonym artefakcie:\n  - ${problems.join('\n  - ')}`);
  }
}

/** Usuwa składnię modułów — po sklejeniu wszystko dzieli jeden zasięg. */
export function stripModuleSyntax(source) {
  return source
    .replace(/^[ \t]*export\s+\{[^}]*\}\s*from\s*['"][^'"]+['"];?[ \t]*$/gm, '')
    .replace(/^[ \t]*import\s+(?:[\s\S]*?\s+from\s+)?['"][^'"]+['"];?[ \t]*$/gm, '')
    .replace(/^[ \t]*export\s+default\s+/gm, 'const __default__ = ')
    .replace(/^[ \t]*export\s+(async\s+function|function|const|let|var|class)\s/gm, '$1 ')
    .replace(/^[ \t]*export\s*\{[^}]*\};?[ \t]*$/gm, '');
}
