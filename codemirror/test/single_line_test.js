// The document that cannot grow a second line.
//
//   npm test
//
// This one runs against a *real* EditorState, not a stub. @codemirror/state is a
// devDependency and needs no DOM, and a transaction filter is exactly the kind of
// thing a hand-rolled fake gets wrong in the direction of passing: the whole
// question is what CodeMirror does with the spec that comes back, so CodeMirror
// is what has to answer it. The theme half of singleLine() needs a view and so
// is not here — which is why noNewlines() is exported separately.

import {test} from 'node:test';
import assert from 'node:assert';
import {EditorState} from '@codemirror/state';
import {history, undo} from '@codemirror/commands';
import {noNewlines, oneLine} from '../src/single-line.js';

const single = [noNewlines(EditorState)];

function apply(doc, spec, extensions = single) {
  return EditorState.create({doc, extensions}).update(spec).state;
}

// A paste, as CodeMirror actually dispatches one: a change plus the selection it
// wants afterwards.
function paste(doc, at, text) {
  return apply(doc, {changes: {from: at, insert: text},
                     selection: {anchor: at + text.length},
                     userEvent: 'input.paste'});
}

test('oneLine flattens breaks and the whitespace against them', () => {
  assert.strictEqual(oneLine('a\nb'), 'a b');
  assert.strictEqual(oneLine('foo  \n  bar'), 'foo bar');   // a markdown hard break
  assert.strictEqual(oneLine('a\r\nb'), 'a b');             // CRLF
  assert.strictEqual(oneLine('a\n\n\nb'), 'a b');           // a blank line is one space
  assert.strictEqual(oneLine('one\ntwo\nthree'), 'one two three');
});

test('oneLine drops a break at either end rather than leaving a space', () => {
  // The case that actually happens: copying a line selects its newline too, so
  // almost every real paste ends in one.
  assert.strictEqual(oneLine('hello\n'), 'hello');
  assert.strictEqual(oneLine('\nhello'), 'hello');
  assert.strictEqual(oneLine('\n'), '');
});

test('oneLine leaves whitespace that was not against a break exactly alone', () => {
  assert.strictEqual(oneLine('  a\nb  '), '  a b  ');
  assert.strictEqual(oneLine('plain  text'), 'plain  text');
  assert.strictEqual(oneLine('  '), '  ');
});

test('typing that adds no newline passes through untouched', () => {
  const state = apply('hello', {changes: {from: 5, insert: '!'},
                                selection: {anchor: 6}, userEvent: 'input.type'});
  assert.strictEqual(state.doc.toString(), 'hello!');
  assert.strictEqual(state.selection.main.head, 6);
});

test('a pasted newline is flattened rather than refused', () => {
  // Refusing was the first version. It means the paste silently does nothing at
  // all, dropping every character the user wanted because of the one they did not.
  const state = paste('hello', 5, ' world\nand more');
  assert.strictEqual(state.doc.lines, 1);
  assert.strictEqual(state.doc.toString(), 'hello world and more');
});

test('the caret lands after the text that was pasted, not before it', () => {
  // The transaction's own selection is in coordinates that the flattening just
  // invalidated, and carrying nothing instead makes CodeMirror map the *old*
  // selection forward — which leaves the caret in front of the whole paste.
  const state = paste('hello', 5, ' a\nb  \n  c');
  assert.strictEqual(state.doc.toString(), 'hello a b c');
  assert.strictEqual(state.selection.main.head, state.doc.length);
});

test('the caret is right for a paste that is not at the end', () => {
  const state = paste('hello', 0, 'x\ny');
  assert.strictEqual(state.doc.toString(), 'x yhello');
  assert.strictEqual(state.selection.main.head, 3);   // just past "x y"
});

test('a paste over a selection replaces it and still lands one line', () => {
  const state = apply('hello', {changes: {from: 1, to: 4, insert: 'A\nB'},
                                selection: {anchor: 4}, userEvent: 'input.paste'});
  assert.strictEqual(state.doc.toString(), 'hA Bo');
  assert.strictEqual(state.selection.main.head, 4);
});

test('several changes in one transaction are all flattened, and the caret follows the last', () => {
  const state = apply('a b', {changes: [{from: 1, to: 1, insert: 'X\nY'},
                                        {from: 2, to: 2, insert: 'P\nQ'}],
                              selection: {anchor: 3}, userEvent: 'input.paste'});
  assert.strictEqual(state.doc.lines, 1);
  // "a b" with "X\nY" pushed in at 1 and "P\nQ" at 2 — the original space ends up
  // between them, so the two inserts are adjacent to it and not to each other.
  assert.strictEqual(state.doc.toString(), 'aX Y P Qb');
  assert.strictEqual(state.selection.main.head, state.doc.toString().indexOf('P Q') + 3);
});

test('a transaction that set no selection does not get one invented', () => {
  const state = apply('hello', {changes: {from: 5, insert: 'a\nb'}});
  assert.strictEqual(state.doc.toString(), 'helloa b');
  assert.strictEqual(state.selection.main.head, 0);   // mapped, as it would be
});

test('a pure selection change is not touched', () => {
  const state = apply('hello', {selection: {anchor: 2, head: 4}});
  assert.strictEqual(state.doc.toString(), 'hello');
  assert.strictEqual(state.selection.main.anchor, 2);
  assert.strictEqual(state.selection.main.head, 4);
});

test('the userEvent survives, so history still groups edits', () => {
  const state = EditorState.create({doc: 'hello', extensions: single});
  const tr = state.update({changes: {from: 5, insert: ' a\nb'},
                           selection: {anchor: 9}, userEvent: 'input.paste'});
  assert.ok(tr.isUserEvent('input.paste'), 'the annotation was dropped');
});

test('undo takes back a flattened paste in one go', () => {
  let state = EditorState.create({doc: 'hello', extensions: [noNewlines(EditorState), history()]});
  state = state.update({changes: {from: 5, insert: ' a\nb'},
                        selection: {anchor: 9}, userEvent: 'input.paste'}).state;
  assert.strictEqual(state.doc.toString(), 'hello a b');
  let undone = null;
  undo({state, dispatch: tr => { undone = tr.state; }});
  assert.strictEqual(undone.doc.toString(), 'hello');
});

test('without the filter the same paste makes two lines — so the filter is what does it', () => {
  const naive = EditorState.create({doc: 'hello'})
    .update({changes: {from: 5, insert: 'a\nb'}}).state;
  assert.strictEqual(naive.doc.lines, 2);
});

test('a state created with newlines in its doc is not saved by the filter', () => {
  // The filter only ever sees transactions. This is why oneLine() is exported:
  // the initial document has to be flattened before the state exists.
  const unsanitised = EditorState.create({doc: 'a\nb', extensions: single});
  assert.strictEqual(unsanitised.doc.lines, 2);
  const sanitised = EditorState.create({doc: oneLine('a\nb'), extensions: single});
  assert.strictEqual(sanitised.doc.lines, 1);
});
