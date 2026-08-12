// Structural movement over Clojure forms: what option+j/l/k/i do inside a
// ```clojure block.
//
//   npm test
//
// The names and the senses are Calva's, because that is what Daniel's VSCode
// keybindings bind and so what his hands expect:
//
//   forwardSexp       alt+l   over the next form
//   backwardSexp      alt+j   over the previous form
//   forwardDownSexp   alt+k   into the next list
//   forwardUpSexp     alt+i   out of this list, to the right
//   backwardUpSexp            out of this list, to the left
//   backwardDownSexp          into the previous list, from its right
//
// Fixtures mark the caret with "|". A motion that cannot go anywhere sensible
// stays put rather than guessing, so `same` is an assertion in its own right.

import {test} from 'node:test';
import assert from 'node:assert';
import {forwardSexp, backwardSexp, forwardDownSexp, forwardUpSexp,
        backwardUpSexp, backwardDownSexp} from '../src/sexp.js';

function unmark(marked) {
  const pos = marked.indexOf('|');
  assert.notStrictEqual(pos, -1, 'fixture needs a | caret');
  return [marked.slice(0, pos) + marked.slice(pos + 1), pos];
}

// from/to default to the whole string: the fence bounds are exercised separately.
function run(fn, from, to) {
  const [text, pos] = unmark(from);
  const [expectedText, want] = unmark(to);
  assert.strictEqual(text, expectedText, 'the two markings must be of the same text');
  assert.strictEqual(fn(text, pos, 0, text.length), want);
}

const fwd = (a, b) => run(forwardSexp, a, b);
const back = (a, b) => run(backwardSexp, a, b);
const down = (a, b) => run(forwardDownSexp, a, b);
const up = (a, b) => run(forwardUpSexp, a, b);
const upBack = (a, b) => run(backwardUpSexp, a, b);
const downBack = (a, b) => run(backwardDownSexp, a, b);
const same = (fn, at) => run(fn, at, at);

/* ---- forwardSexp, alt+l ------------------------------------------------- */

test('forward: over the next atom', () => {
  fwd('(|a b)', '(a| b)');
  fwd('(a| b)', '(a b|)');
});

test('forward: over a whole list, not into it', () => {
  fwd('|(a b) c', '(a b)| c');
  fwd('(|(a) b)', '((a)| b)');
});

test('forward: stops at the end of its list rather than leaving it', () => {
  same(forwardSexp, '(a b|)');
  same(forwardSexp, '(a b |)');
});

test('forward: a string is one form, spaces and parens inside it and all', () => {
  fwd('|"a (b c" d', '"a (b c"| d');
});

test('forward: a reader prefix belongs to the form it marks', () => {
  fwd("|'(a b) c", "'(a b)| c");
  fwd('|#{1 2} x', '#{1 2}| x');
  fwd('|@atom x', '@atom| x');
  fwd('|#(inc %) x', '#(inc %)| x');
});

test('forward: comments are passed over on the way', () => {
  fwd('|; note\n(a)', '; note\n(a)|');
  fwd('(a| ; note\n b)', '(a ; note\n b|)');
});

test('forward: a semicolon inside a string is not a comment', () => {
  fwd('|"; not a comment" a', '"; not a comment"| a');
});

test('forward: at the very end there is nowhere to go', () => {
  same(forwardSexp, '(a b)|');
});

/* ---- backwardSexp, alt+j ------------------------------------------------ */

test('backward: over the previous atom', () => {
  back('(a b|)', '(a |b)');
  back('(a |b)', '(|a b)');
});

test('backward: over a whole list, not into it', () => {
  back('a (b c)| d', 'a |(b c) d');
});

test('backward: stops at the start of its list rather than leaving it', () => {
  same(backwardSexp, '(|a b)');
  same(backwardSexp, '( |a b)');
});

test('backward: takes the reader prefix with the form', () => {
  back("'(a b)| c", "|'(a b) c");
  back('#{1 2}| x', '|#{1 2} x');
});

test('backward: a string is one form', () => {
  back('"a (b"| c', '|"a (b" c');
});

test('backward: at the very start there is nowhere to go', () => {
  same(backwardSexp, '|(a b)');
});

/* ---- forwardDownSexp, alt+k -------------------------------------------- */

test('down: into the next list', () => {
  down('|(a b)', '(|a b)');
  down('x |(a b)', 'x (|a b)');
});

test('down: past what is in the way, into the next list along', () => {
  down('(|a (b))', '(a (|b))');
});

test('down: does not climb out of the list it is in to find one', () => {
  same(forwardDownSexp, '(a |b) (c)');
});

test('down: with no list ahead, it stays', () => {
  same(forwardDownSexp, '(a |b c)');
});

/* ---- forwardUpSexp, alt+i ---------------------------------------------- */

test('up: out of this list, to the right of it', () => {
  up('(a |b)', '(a b)|');
  up('((a |b) c)', '((a b)| c)');
});

test('up: over what is left of the list on the way out', () => {
  up('(|a (b) c)', '(a (b) c)|');
});

test('up: at the top level there is nothing to come out of', () => {
  same(forwardUpSexp, 'a |b c');
});

/* ---- the backward pair ------------------------------------------------- */

test('backward up: out of this list, to the left of it', () => {
  upBack('(a |b)', '|(a b)');
  upBack('((a |b) c)', '(|(a b) c)');
});

test('backward down: into the previous list, at its right edge', () => {
  downBack('(a b) |', '(a b|) ');
  downBack('x (a) |y', 'x (a|) y');
});

test('the backward pair stay put with nowhere to go', () => {
  same(backwardUpSexp, 'a |b');
  same(backwardDownSexp, '|(a b)');
});

/* ---- brackets and braces are delimiters too ---------------------------- */

test('vectors and maps behave as lists do', () => {
  fwd('|[1 2] x', '[1 2]| x');
  down('|{:a 1}', '{|:a 1}');
  up('[1 |2]', '[1 2]|');
  back('[1 2]| x', '|[1 2] x');
});

/* ---- the fence bounds ------------------------------------------------- */

test('no motion crosses the bounds it is given', () => {
  // Bounds standing in for a fence: only "(a b)" is code, the rest is prose.
  const text = 'prose\n(a b)\nmore prose';
  const from = 6, to = 11;               // exactly "(a b)"
  assert.strictEqual(text.slice(from, to), '(a b)');

  // At the end of the block, forward has nowhere to go — and must not wander
  // into the prose underneath.
  assert.strictEqual(forwardSexp(text, to, from, to), to);
  assert.strictEqual(forwardUpSexp(text, to, from, to), to);
  // At the start, backward likewise.
  assert.strictEqual(backwardSexp(text, from, from, to), from);
  assert.strictEqual(backwardUpSexp(text, from, from, to), from);
  // And inside, it still works.
  assert.strictEqual(forwardSexp(text, from + 1, from, to), from + 2);
});

test('an unbalanced form does not run away or hang', () => {
  fwd('|(a b', '(a b|');
  same(forwardUpSexp, '(a |b');
  same(backwardSexp, '(|a');
});
