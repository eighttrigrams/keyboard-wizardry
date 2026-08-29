// The one-line layout: what it keeps, what it drops, and what it swallows.
//
//   npm test
//
// Same trick as bindings_test.js — the commands namespace is a Proxy answering
// every name with the same function each time, so assertions are identity checks
// and a chord pointing at the wrong command cannot pass.

import {test} from 'node:test';
import assert from 'node:assert';
import {bindings, documentBindings, inputBindings, textBindings, swallow,
        DOCUMENT, INPUT, TEXT} from '../src/bindings.js';

function stubCommands() {
  const made = new Map();
  return new Proxy({}, {
    get(_, name) {
      if (!made.has(name)) {
        const fn = () => true;
        Object.defineProperty(fn, 'name', {value: String(name)});
        made.set(name, fn);
      }
      return made.get(name);
    }
  });
}

const cmds = stubCommands();
const input = bindings(cmds, {mode: INPUT});
const document_ = bindings(cmds);
const text = bindings(cmds, {mode: TEXT});

// The chords that exist because there is a second line. Input mode has none of
// them, and this is the list — spelled out rather than derived, so that adding a
// multi-line chord to the document layout and forgetting input mode is a failure
// here rather than a surprise in a search box.
const MULTI_LINE_ONLY = [
  'Enter shift', 'Enter meta',                          // open a line above / below
  'KeyI ctrl+meta', 'KeyK ctrl+meta',                   // move a line up / down
  'KeyL ctrl+meta', 'KeyJ ctrl+meta',                   // indent more / less
  'KeyP alt+meta', 'Semicolon alt+meta',                // page up / down
  'KeyP alt+ctrl+meta', 'Semicolon alt+ctrl+meta',      // document start / end
  'KeyI alt+meta+shift', 'KeyK alt+meta+shift',         // scroll the view
  'KeyI alt+meta', 'KeyK alt+meta',                     // caret + view together
  'Semicolon meta', 'Semicolon ctrl+meta'               // centring
];

const DEAD = [
  'KeyI meta', 'KeyK meta',
  'KeyI meta+shift', 'KeyK meta+shift',
  'KeyI alt', 'KeyK alt',
  'KeyI alt+shift', 'KeyK alt+shift'
];

test('the default mode is the document layout, unchanged', () => {
  // No consumer passes a mode today, and none of them should change behaviour
  // because modes now exist.
  assert.deepStrictEqual(Object.keys(bindings(cmds)).sort(),
                         Object.keys(documentBindings(cmds)).sort());
  assert.strictEqual(Object.keys(document_).length, 47);
});

test('an unknown mode throws rather than falling back', () => {
  // Falling back to the document layout would put fence scanning and line
  // motions in a one-line field and look very nearly right.
  assert.throws(() => bindings(cmds, {mode: 'inputs'}), /unknown editor mode/);
  assert.throws(() => bindings(cmds, {mode: 'Input'}), /unknown editor mode/);
});

test('the mode constants are what the strings say', () => {
  assert.strictEqual(DOCUMENT, 'document');
  assert.strictEqual(INPUT, 'input');
  assert.deepStrictEqual(Object.keys(bindings(cmds, {mode: DOCUMENT})).sort(),
                         Object.keys(document_).sort());
});

test('every chord in the one-line layout is callable', () => {
  for (const [chord, command] of Object.entries(input)) {
    assert.strictEqual(typeof command, 'function', `${chord} is not callable`);
  }
});

test('modifiers are spelled in the order chord() produces', () => {
  const ORDER = ['alt', 'ctrl', 'meta', 'shift'];
  for (const chord of Object.keys(input)) {
    const [, mods = ''] = chord.split(' ');
    const held = mods ? mods.split('+') : [];
    const sorted = [...held].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    assert.deepStrictEqual(held, sorted, `${chord} has its modifiers out of order`);
  }
});

test('input mode introduces no chord the document layout does not have', () => {
  // The point of modes is one layout on two documents. A chord that exists only
  // in a field is a second layout to learn, which is the thing this avoids.
  const extra = Object.keys(input).filter(c => !(c in document_));
  assert.deepStrictEqual(extra, []);
});

test('the multi-line-only chords are gone', () => {
  for (const chord of MULTI_LINE_ONLY) {
    assert.ok(chord in document_, `${chord} is not in the document layout — fix this test`);
    assert.ok(!(chord in input), `${chord} survived into the one-line layout`);
  }
});

test('and nothing else was dropped', () => {
  const dropped = Object.keys(document_).filter(c => !(c in input));
  assert.deepStrictEqual(dropped.sort(), [...MULTI_LINE_ONLY].sort());
});

test('char motion, deleting, clipboard and undo are identical to document mode', () => {
  // Identity, not equivalence: these must be the very same commands, because the
  // whole claim of "one layout, two documents" rests on them not being reimplemented.
  const SHARED = ['KeyJ meta', 'KeyL meta', 'KeyJ meta+shift', 'KeyL meta+shift',
                  'KeyJ alt+shift', 'KeyL alt+shift',
                  'Equal alt', 'Equal meta', 'Backspace ctrl', 'Equal ctrl', 'Equal ctrl+meta',
                  'KeyA alt', 'Backquote alt', 'Backquote shift',
                  'KeyC alt', 'KeyV alt', 'KeyX alt'];
  for (const chord of SHARED) {
    assert.strictEqual(input[chord], document_[chord], chord + ' differs between the modes');
  }
});

test('delete-line survives, as "clear the field"', () => {
  // Deliberately kept: in one line, deleteLine empties the box.
  assert.strictEqual(input['Equal ctrl+meta'], cmds.deleteLine);
});

test('the option pair is plain word motion, not fence-aware', () => {
  // In document mode these are wrappers that scan for a ```clojure fence. A
  // one-line field cannot contain one, so asking is a document scan per keypress
  // to always answer no.
  assert.strictEqual(input['KeyJ alt'], cmds.cursorGroupLeft);
  assert.strictEqual(input['KeyL alt'], cmds.cursorGroupRight);
  assert.notStrictEqual(document_['KeyJ alt'], cmds.cursorGroupLeft,
    'document mode stopped being fence-aware');
});

test('ctrl+j and ctrl+l are the ends of the line, and their shifted pair selects there', () => {
  // The library's own line motions rather than CodeMirror's cursorLineStart, and
  // **the very same objects text mode holds** — a one-line field is a text file
  // with one line in it, so the two must not be able to drift.
  assert.strictEqual(input['KeyJ ctrl'], text['KeyJ ctrl']);
  assert.strictEqual(input['KeyL ctrl'], text['KeyL ctrl']);
  assert.strictEqual(input['KeyJ ctrl+shift'], text['KeyJ ctrl+shift']);
  assert.strictEqual(input['KeyL ctrl+shift'], text['KeyL ctrl+shift']);
  // And in document mode they are still the sentence motions, which is the
  // distinction the whole README argument was about.
  assert.notStrictEqual(document_['KeyJ ctrl'], input['KeyJ ctrl']);
});

test('the step-to-the-next-line half of them cannot fire in one line', () => {
  // Which is why sharing the commands with text mode costs nothing here. The
  // motion only leaves the line it is on when there is a line to leave it for,
  // and singleLine() is what guarantees there is not.
  const one = 'alpha beta gamma';
  const view = () => {
    const d = [];
    return {dispatched: d,
            state: {doc: {toString: () => one, length: one.length},
                    selection: {main: {head: 0, anchor: 0}}},
            dispatch: s => d.push(s)};
  };
  const v = view();
  input['KeyJ ctrl'](v);                       // already at the start of the only line
  assert.strictEqual(v.dispatched[0].selection.head, 0, 'it went somewhere there is nowhere to go');
});

test('the vertical keys are swallowed, not left unbound', () => {
  // Unbound would let each app give cmd+k a meaning of its own inside a field.
  // Bound to a no-op, install() preventDefaults it and nothing underneath sees it.
  for (const chord of DEAD) {
    assert.strictEqual(input[chord], swallow, chord + ' is not swallowed');
    assert.strictEqual(swallow(), true, 'swallow must report handled');
  }
});

test('shift selects wherever the unshifted chord moves', () => {
  const pairs = [['KeyJ meta', 'KeyJ meta+shift'], ['KeyL meta', 'KeyL meta+shift'],
                 ['KeyJ alt', 'KeyJ alt+shift'],   ['KeyL alt', 'KeyL alt+shift'],
                 ['KeyJ ctrl', 'KeyJ ctrl+shift'], ['KeyL ctrl', 'KeyL ctrl+shift']];
  for (const [move, select] of pairs) {
    assert.ok(move in input, move);
    assert.ok(select in input, select);
    assert.notStrictEqual(input[move], input[select], `${move} and ${select} are the same command`);
  }
});

test('Enter, Escape, Tab and the arrows are left entirely alone', () => {
  // install() only preventDefaults what is in the table. These have to reach the
  // app: in tracker they add an item, clear a filter and walk a result list.
  for (const chord of ['Enter ', 'Escape ', 'Tab ', 'Tab shift',
                       'ArrowUp ', 'ArrowDown ', 'ArrowLeft ', 'ArrowRight ',
                       'Enter shift', 'Enter meta']) {
    assert.ok(!(chord in input), `${chord} is bound in input mode and would be swallowed`);
  }
});

test('inputBindings and documentBindings do not share mutable state', () => {
  // Both are built by Object.assign onto a fresh sharedBindings(), and a shared
  // object would mean one mode's construction editing the other's table.
  const a = inputBindings(cmds);
  a['KeyJ meta'] = 'clobbered';
  assert.notStrictEqual(inputBindings(cmds)['KeyJ meta'], 'clobbered');
  assert.notStrictEqual(documentBindings(cmds)['KeyJ meta'], 'clobbered');
});
