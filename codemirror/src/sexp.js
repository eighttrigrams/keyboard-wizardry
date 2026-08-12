// Structural movement over Clojure forms. Pure functions of
// (text, pos, from, to) -> pos, where from/to are the bounds movement may not
// leave — in practice the body of a ```clojure fence, from fences.js.
//
// The names and senses are Calva's, because Daniel's VSCode keybindings bind
// Calva's paredit and it is the same hands using both. Calva's own code is not
// what is here: its paredit works on an EditableDocument through a LispTokenCursor
// and a lexer, which is a great deal of machinery to transplant for four motions,
// and it knows nothing about being confined to part of a markdown document.
//
// What replaces it is one pass that says, for every character, whether it is
// code, inside a string, inside a comment, or part of a character literal. Every
// motion below then only has to look at code characters. That is what keeps the
// awkward cases honest — a ; inside a string is not a comment, a paren inside a
// string is not a delimiter, \( is not a delimiter either — without a tokenizer.
//
// Known limits, all of which degrade to "moves like an atom" rather than to
// anything destructive: #_ marks the form after it as discarded and this treats
// it as an ordinary prefix, so a discarded form is still a form to move over; and
// metadata like ^{:a 1} is two forms to this, not one.

const CODE = 0, STRING = 1, COMMENT = 2, CHARLIT = 3;

const WS = ' \t\r\n\f,';        // comma is whitespace in Clojure
const OPEN = '([{';
const CLOSE = ')]}';
const PREFIX = "'`~@^#";        // reader syntax that belongs to the form after it

// One pass over the bounds, classifying every character. Cheap enough to do per
// keystroke: a fenced block is small, and correctness here is what the motions
// stand on.
function classify(text, from, to) {
  const mask = new Uint8Array(Math.max(0, to - from));
  let i = from;
  while (i < to) {
    const c = text[i];
    if (c === ';') {
      while (i < to && text[i] !== '\n') mask[i++ - from] = COMMENT;
      continue;
    }
    if (c === '"') {
      mask[i++ - from] = STRING;
      while (i < to) {
        if (text[i] === '\\') {                 // \" does not end the string
          mask[i++ - from] = STRING;
          if (i < to) mask[i++ - from] = STRING;
          continue;
        }
        const closing = text[i] === '"';
        mask[i++ - from] = STRING;
        if (closing) break;
      }
      continue;
    }
    if (c === '\\') {                           // \x, \newline, \space
      mask[i++ - from] = CHARLIT;
      if (i < to) mask[i++ - from] = CHARLIT;
      while (i < to && /[A-Za-z0-9-]/.test(text[i])) mask[i++ - from] = CHARLIT;
      continue;
    }
    mask[i++ - from] = CODE;
  }
  return mask;
}

// A scanner bound to one set of bounds, so the motions below read as prose.
function scanner(text, from, to) {
  const mask = classify(text, from, to);
  const kind = i => mask[i - from];
  const code = i => i >= from && i < to && mask[i - from] === CODE;
  const isWs = i => code(i) && WS.includes(text[i]);
  const isOpen = i => code(i) && OPEN.includes(text[i]);
  const isClose = i => code(i) && CLOSE.includes(text[i]);
  const isPrefix = i => code(i) && PREFIX.includes(text[i]);

  // Whitespace and comments are not forms; movement passes over them.
  const skipForward = i => {
    while (i < to && (kind(i) === COMMENT || isWs(i))) i++;
    return i;
  };
  const skipBackward = i => {
    while (i > from && (kind(i - 1) === COMMENT || isWs(i - 1))) i--;
    return i;
  };

  // text[i] is an opening delimiter: one past its match, or `to` if unbalanced.
  const matchForward = i => {
    let depth = 0;
    while (i < to) {
      if (isOpen(i)) depth++;
      else if (isClose(i) && --depth === 0) return i + 1;
      i++;
    }
    return to;
  };

  // text[i-1] is a closing delimiter: the index of its match, or `from`.
  const matchBackward = i => {
    let depth = 0;
    let j = i - 1;
    while (j >= from) {
      if (isClose(j)) depth++;
      else if (isOpen(j) && --depth === 0) return j;
      j--;
    }
    return from;
  };

  // One past the atom starting at i. A string or a character literal is an atom
  // whole, whatever it has inside it.
  const atomForward = i => {
    const k = kind(i);
    if (k === STRING || k === CHARLIT) {
      while (i < to && kind(i) === k) i++;
      return i;
    }
    while (i < to && code(i) && !WS.includes(text[i])
           && !OPEN.includes(text[i]) && !CLOSE.includes(text[i]) && text[i] !== ';') i++;
    return i;
  };

  // The start of the atom ending at i.
  const atomBackward = i => {
    const k = kind(i - 1);
    if (k === STRING || k === CHARLIT) {
      let j = i - 1;
      while (j > from && kind(j - 1) === k) j--;
      return j;
    }
    let j = i;
    while (j > from && code(j - 1) && !WS.includes(text[j - 1])
           && !OPEN.includes(text[j - 1]) && !CLOSE.includes(text[j - 1]) && text[j - 1] !== ';') j--;
    return j;
  };

  return {code, isOpen, isClose, isPrefix, skipForward, skipBackward,
          matchForward, matchBackward, atomForward, atomBackward};
}

function bounded(pos, from, to) {
  if (!(pos > from)) return from;
  return pos > to ? to : pos;
}

// alt+l — over the next form. Stops at the end of the list it is in rather than
// climbing out of it; that is forwardUpSexp's job.
export function forwardSexp(text, pos, from, to) {
  const at = bounded(pos, from, to);
  const s = scanner(text, from, to);
  let i = s.skipForward(at);
  if (i >= to || s.isClose(i)) return pos;
  while (i < to && s.isPrefix(i)) i++;          // the prefix goes with its form
  if (i >= to) return i;
  return s.isOpen(i) ? s.matchForward(i) : s.atomForward(i);
}

// alt+j — over the previous form, and likewise stops at the start of its list.
export function backwardSexp(text, pos, from, to) {
  const at = bounded(pos, from, to);
  const s = scanner(text, from, to);
  const i = s.skipBackward(at);
  if (i <= from || s.isOpen(i - 1)) return pos;
  let start = s.isClose(i - 1) ? s.matchBackward(i) : s.atomBackward(i);
  while (start > from && s.isPrefix(start - 1)) start--;
  return start;
}

// alt+k — into the next list. A closing delimiter first means there is no list
// left in this one, and it stays rather than climbing out to find one elsewhere.
export function forwardDownSexp(text, pos, from, to) {
  const at = bounded(pos, from, to);
  const s = scanner(text, from, to);
  for (let i = at; i < to; i++) {
    if (s.isOpen(i)) return i + 1;
    if (s.isClose(i)) return pos;
  }
  return pos;
}

// alt+i — out of this list, to the right of it. Lists met on the way are stepped
// over, not entered.
export function forwardUpSexp(text, pos, from, to) {
  const at = bounded(pos, from, to);
  const s = scanner(text, from, to);
  let i = at;
  while (i < to) {
    if (s.isOpen(i)) { i = s.matchForward(i); continue; }
    if (s.isClose(i)) return i + 1;
    i++;
  }
  return pos;
}

// Out of this list, to the left of it.
export function backwardUpSexp(text, pos, from, to) {
  const at = bounded(pos, from, to);
  const s = scanner(text, from, to);
  let j = at;
  while (j > from) {
    if (s.isClose(j - 1)) { j = s.matchBackward(j); continue; }
    if (s.isOpen(j - 1)) return j - 1;
    j--;
  }
  return pos;
}

// Into the previous list, at its right edge — the mirror of alt+k.
export function backwardDownSexp(text, pos, from, to) {
  const at = bounded(pos, from, to);
  const s = scanner(text, from, to);
  for (let j = at; j > from; j--) {
    if (s.isClose(j - 1)) return j - 1;
    if (s.isOpen(j - 1)) return pos;
  }
  return pos;
}
