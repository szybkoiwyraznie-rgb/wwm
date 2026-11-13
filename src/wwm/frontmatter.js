/**
 * Parser frontmattera — ŚCISŁY podzbiór YAML (ADR 0002, 0032).
 *
 * Obsługiwane (dokładnie tyle, ile wymaga schemat stron — ADR 0003):
 *   klucz: wartość            (string / liczba / true / false / null)
 *   klucz: |  (lub |-)        (wielowierszowy skalar blokowy — zachowuje puste linie i '#')
 *     wiersz 1
 *   klucz: [a, b, c]          (tablica inline)
 *   klucz:                    (tablica blokowa)
 *     - element
 *   klucz:                    (obiekt jednopoziomowy)
 *     pole: wartość
 *   klucz:                    (lista obiektów — ADR 0024, 0032, także z polami `|`)
 *     - pole: wartość
 *       pole2: |
 *         dosłowny tekst wieloakapitowy
 *   # komentarz (tylko pełna linia poza skalarem blokowym)
 *
 * Wszystko inne to BŁĄD. Nieznana składnia nie może być cicho przełknięta:
 * lepszy czerwony test niż zmutowane dane.
 *
 * Wartości bez cudzysłowów są stringami, poza literałami true/false/null
 * i liczbami. Stringi z ':' albo '#' w środku trzeba ująć w cudzysłów
 * albo zapisać jako skalar blokowy `|`.
 */

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const KEY_RE = /^[A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ][\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]*$/;
const KV_RE = /^([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ][\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]*):\s*(.*)$/;

export function parseFrontmatter(raw) {
  const m = String(raw).match(FM_RE);
  if (!m) return { data: null, body: String(raw) };
  const data = parseYamlSubset(m[1]);
  return { data, body: String(raw).slice(m[0].length) };
}

function czySkalarBlokowy(s) {
  return s === '|' || s === '|-';
}

function wczytajSkalarBlokowy(lines, start, minWciecie, key, nrLinii) {
  let k = start;
  let baza = null;
  while (k < lines.length) {
    if (lines[k].trim() === '') { k += 1; continue; }
    const ind = indentOf(lines[k]);
    if (ind === null || ind <= minWciecie) break;
    baza = ind;
    break;
  }
  if (baza === null) {
    throw new Error(`frontmatter: pusty skalar blokowy pod "${key}" (linia ${nrLinii})`);
  }

  const zebrane = [];
  let idx = start;
  while (idx < lines.length) {
    const l = lines[idx];
    if (l.trim() === '') {
      zebrane.push('');
      idx += 1;
      continue;
    }
    const ind = indentOf(l);
    if (ind === null || ind <= minWciecie) break;
    if (ind < baza) {
      throw new Error(`frontmatter: niespójne wcięcie w skalarze blokowym pod "${key}" (linia ${idx + 1})`);
    }
    zebrane.push(l.slice(baza));
    idx += 1;
  }
  while (zebrane.length > 0 && zebrane[zebrane.length - 1] === '') {
    zebrane.pop();
  }
  return { wartosc: zebrane.join('\n'), nastepny: idx };
}

function parseYamlSubset(text) {
  const lines = text.split(/\r?\n/);
  const out = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '' || /^\s*#/.test(line)) { i += 1; continue; }

    const kv = line.match(KV_RE);
    if (!kv) throw new Error(`frontmatter: nierozpoznana linia ${i + 1}: ${JSON.stringify(line)}`);
    const key = kv[1];
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      throw new Error(`frontmatter: zduplikowany klucz "${key}" (linia ${i + 1})`);
    }
    const rest = kv[2].trim();

    if (czySkalarBlokowy(rest)) {
      const blok = wczytajSkalarBlokowy(lines, i + 1, 0, key, i + 1);
      out[key] = blok.wartosc;
      i = blok.nastepny;
    } else if (rest === '') {
      let p = i + 1;
      while (p < lines.length && (lines[p].trim() === '' || /^\s*#/.test(lines[p]))) p += 1;
      const indent = indentOf(lines[p] ?? '');
      if (indent === null) throw new Error(`frontmatter: klucz "${key}" bez wartości (linia ${i + 1})`);
      const pozycje = [];
      let j = p;
      while (j < lines.length) {
        const l = lines[j];
        if (l.trim() === '' || /^\s*#/.test(l)) { j += 1; continue; }
        const ind = indentOf(l);
        if (ind === null || ind < indent) break;
        const trim = l.trim();
        // Sprawdź, czy pole wewnątrz bloku otwiera skalar blokowy `|` lub `|-`.
        const bezMyslnika = trim.startsWith('- ') ? trim.slice(2).trim() : (trim === '-' ? '' : trim);
        const poleKv = bezMyslnika.match(KV_RE);
        if (poleKv && czySkalarBlokowy(poleKv[2].trim())) {
          const prog = trim.startsWith('-') ? l.indexOf(bezMyslnika) : ind;
          const skalar = wczytajSkalarBlokowy(lines, j + 1, prog, `${key}.${poleKv[1]}`, j + 1);
          pozycje.push({
            tekst: trim,
            wciecie: ind,
            nr: j + 1,
            blokWartosc: skalar.wartosc,
          });
          j = skalar.nastepny;
          continue;
        }
        pozycje.push({ tekst: trim, wciecie: ind, nr: j + 1 });
        j += 1;
      }
      if (pozycje.length === 0) throw new Error(`frontmatter: pusty blok "${key}" (linia ${i + 1})`);
      out[key] = parsujBlok(pozycje, key);
      i = j;
    } else if (rest.startsWith('[')) {
      if (!rest.endsWith(']')) throw new Error(`frontmatter: niedomknięta tablica inline pod "${key}" (linia ${i + 1})`);
      const inner = rest.slice(1, -1).trim();
      out[key] = inner === '' ? [] : inner.split(',').map((s) => parseScalar(s.trim(), key, i + 1));
      i += 1;
    } else {
      out[key] = parseScalar(rest, key, i + 1);
      i += 1;
    }
  }
  return out;
}

/**
 * Blok pod kluczem: tablica skalarów, obiekt albo lista obiektów.
 * Kształt rozpoznajemy po pierwszej linii i po tym, czy wpisy listy mają
 * pola (`- data: …` + głębsze `autor: …`).
 */
function parsujBlok(pozycje, key) {
  if (pozycje[0].tekst.startsWith('- ') || pozycje[0].tekst === '-') return parsujListe(pozycje, key);

  const obiekt = {};
  for (const p of pozycje) {
    if (p.wciecie !== pozycje[0].wciecie) {
      throw new Error(`frontmatter: zbyt głębokie wcięcie (linia ${p.nr}) — obsługiwany jest tylko jeden poziom`);
    }
    const kv = p.tekst.match(KV_RE);
    if (!kv) throw new Error(`frontmatter: nierozpoznana linia ${p.nr}: ${JSON.stringify(p.tekst)}`);
    if (Object.prototype.hasOwnProperty.call(obiekt, kv[1])) {
      throw new Error(`frontmatter: zduplikowane pole "${kv[1]}" w "${key}"`);
    }
    obiekt[kv[1]] = Object.prototype.hasOwnProperty.call(p, 'blokWartosc')
      ? p.blokWartosc
      : parseScalar(kv[2].trim(), key, p.nr);
  }
  return obiekt;
}

function parsujListe(pozycje, key) {
  const grupy = [];
  for (const p of pozycje) {
    if (p.tekst.startsWith('- ') || p.tekst === '-') {
      grupy.push({
        wciecie: p.wciecie,
        linie: [{
          tekst: p.tekst.replace(/^-\s*/, ''),
          nr: p.nr,
          ...(Object.prototype.hasOwnProperty.call(p, 'blokWartosc') ? { blokWartosc: p.blokWartosc } : {}),
        }],
        nr: p.nr,
      });
      continue;
    }
    const grupa = grupy.at(-1);
    if (!grupa) throw new Error(`frontmatter: nierozpoznana linia ${p.nr}: ${JSON.stringify(p.tekst)}`);
    if (p.wciecie <= grupa.wciecie) {
      throw new Error(`frontmatter: zbyt głębokie wcięcie (linia ${p.nr}) — obsługiwany jest tylko jeden poziom`);
    }
    grupa.linie.push({
      tekst: p.tekst,
      nr: p.nr,
      ...(Object.prototype.hasOwnProperty.call(p, 'blokWartosc') ? { blokWartosc: p.blokWartosc } : {}),
    });
  }

  // Lista skalarów: żaden wpis nie ma pola ani linii kontynuacji.
  if (grupy.every((g) => g.linie.length === 1 && !KV_RE.test(g.linie[0].tekst))) {
    return grupy.map((g) => parseScalar(g.linie[0].tekst, key, g.nr));
  }

  return grupy.map((g) => {
    const obj = {};
    g.linie.forEach((wpisLinii) => {
      const kv = wpisLinii.tekst.match(KV_RE);
      if (!kv) {
        throw new Error(`frontmatter: wpis listy "${key}" ma pole bez wartości (linia ${wpisLinii.nr}): ${JSON.stringify(wpisLinii.tekst)}`);
      }
      if (Object.prototype.hasOwnProperty.call(obj, kv[1])) {
        throw new Error(`frontmatter: zduplikowane pole "${kv[1]}" w "${key}"`);
      }
      obj[kv[1]] = Object.prototype.hasOwnProperty.call(wpisLinii, 'blokWartosc')
        ? wpisLinii.blokWartosc
        : parseScalar(kv[2].trim(), key, wpisLinii.nr);
    });
    return obj;
  });
}

function indentOf(line) {
  const m = line.match(/^(\s+)\S/);
  return m ? m[1].length : null;
}

function parseScalar(s, key, lineno) {
  if (s === '') return '';
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  // Adres URL jest jednoznaczny mimo dwukropka i krzyżyka — pole `zrodla`
  // wypełnia się nimi masowo i wymaganie cudzysłowów byłoby pułapką.
  if (/^https?:\/\/\S+$/.test(s)) return s;
  if (/[:#]/.test(s)) {
    throw new Error(`frontmatter: wartość "${s}" pod "${key}\" zawiera ":" lub "#" — ujmij w cudzysłów (linia ${lineno})`);
  }
  return s;
}

export { KEY_RE };
