// The layout: 47 chords, and which command each one is.
//
//   npm test
//
// No browser and no CodeMirror. bindings() only ever reads names off the commands
// namespace it is handed, so the namespace here is a Proxy that answers every
// name with the same function each time — which makes the assertions identity
// checks rather than string comparisons, and means a chord pointing at the wrong
// command cannot pass.

import {test} from 'node:test';
import assert from 'node:assert';
import {bindings} from '../src/bindings.js';
import {sentenceStart, sentenceEnd} from '../src/motions.js';

const called = [];

function stubCommands() {
  const made = new Map();
  return new Proxy({}, {
    get(_, name) {
      if (!made.has(name)) {
        const fn = () => { called.push(String(name)); return true; };
        Object.defineProperty(fn, 'name', {value: String(name)});
        made.set(name, fn);
      }
      return made.get(name);
    }
  });
}

const cmds = stubCommands();
const table = bindings(cmds);

// Enough of an EditorView for a command to run against: the four option motions
// are fence-aware, so they read the document and either delegate or dispatch.
function fakeView(text, pos) {
  const dispatched = [];
  return {
    dispatched,
    state: {
      doc: {toString: () => text, length: text.length},
      selection: {main: {head: pos, anchor: pos, from: pos, to: pos}}
    },
    dispatch: spec => dispatched.push(spec)
  };
}

// What a chord did: the name of the command it delegated to, or the caret it
// moved to. Exactly one of the two.
function runChord(bindings, chord, text, pos) {
  called.length = 0;
  const view = fakeView(text, pos);
  bindings[chord](view);
  return {delegated: called[0], head: view.dispatched[0]?.selection?.head};
}

// The four that mean one thing in prose and another inside a ```clojure block.
const FENCE_AWARE = {
  'KeyJ alt': 'cursorGroupLeft',
  'KeyL alt': 'cursorGroupRight',
  'KeyI alt': 'cursorLineUp',
  'KeyK alt': 'cursorLineDown'
};

test('every chord is bound to something callable', () => {
  for (const [chord, command] of Object.entries(table)) {
    assert.strictEqual(typeof command, 'function', `${chord} is not callable`);
  }
});

test('the table is 47 chords, and no more', () => {
  assert.strictEqual(Object.keys(table).length, 47);
});

test('modifiers are spelled in the order chord() produces', () => {
  // chord() pushes alt, ctrl, meta, shift in that order, so a table key in any
  // other order is a binding that can never fire. This is the failure mode that
  // leaves no trace: the editor simply does nothing on that chord.
  const ORDER = ['alt', 'ctrl', 'meta', 'shift'];
  for (const chord of Object.keys(table)) {
    const [, mods = ''] = chord.split(' ');
    const held = mods ? mods.split('+') : [];
    const sorted = [...held].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    assert.deepStrictEqual(held, sorted, `${chord} has its modifiers out of order`);
    for (const m of held) assert.ok(ORDER.includes(m), `${chord} has an unknown modifier ${m}`);
  }
});

test('the motions are CodeMirror\'s, by identity', () => {
  assert.strictEqual(table['KeyJ meta'], cmds.cursorCharLeft);
  assert.strictEqual(table['KeyL meta'], cmds.cursorCharRight);
  assert.strictEqual(table['KeyI meta'], cmds.cursorLineUp);
  assert.strictEqual(table['KeyK meta'], cmds.cursorLineDown);
});

test('in prose, the four option motions delegate to what they always were', () => {
  // They are wrappers now, not the commands themselves, so identity cannot say
  // this — but which command they hand a prose document to can.
  for (const [chord, fallback] of Object.entries(FENCE_AWARE)) {
    const {delegated, head} = runChord(table, chord, 'just some prose here', 5);
    assert.strictEqual(delegated, fallback, chord);
    assert.strictEqual(head, undefined, chord + ' moved the caret itself');
  }
});

test('inside a ```clojure block the same four move by form instead', () => {
  const text = '```clojure\n(a b)\n```\n';
  const pos = text.indexOf('a') + 1;          // (a| b)
  const expected = {
    'KeyL alt': text.indexOf('b') + 1,        // over the next form
    'KeyJ alt': text.indexOf('a'),            // back over this one
    'KeyI alt': text.indexOf(')') + 1,        // out of the list, rightwards
    'KeyK alt': pos                           // no list within: stays
  };
  for (const chord of Object.keys(FENCE_AWARE)) {
    const {delegated, head} = runChord(table, chord, text, pos);
    assert.strictEqual(delegated, undefined, chord + ' fell back inside a fence');
    assert.strictEqual(head, expected[chord], chord);
  }
});

test('a fence of another language is prose as far as these keys go', () => {
  const text = '```js\nconst a = 1\n```\n';
  const {delegated} = runChord(table, 'KeyL alt', text, text.indexOf('a'));
  assert.strictEqual(delegated, 'cursorGroupRight');
});

test('shift selects wherever the unshifted chord moves', () => {
  const pairs = [
    ['KeyJ meta', 'KeyJ meta+shift', 'cursorCharLeft', 'selectCharLeft'],
    ['KeyL meta', 'KeyL meta+shift', 'cursorCharRight', 'selectCharRight'],
  ];
  for (const [move, select, moveName, selectName] of pairs) {
    assert.strictEqual(table[move], cmds[moveName], move);
    assert.strictEqual(table[select], cmds[selectName], select);
  }
  // The option pair is wrapped, so only its selecting half is plain — and the
  // selecting half is deliberately *not* fence-aware: selecting a form is a
  // command of its own that this does not implement yet.
  assert.strictEqual(table['KeyJ alt+shift'], cmds.selectGroupLeft);
  assert.strictEqual(table['KeyL alt+shift'], cmds.selectGroupRight);
});

test('ctrl+j and ctrl+l are the markdown sentence motions', () => {
  // They were line start and end in tracker's table, and that was tracker's own
  // invention: the top-level README defines these two chords only in its Markdown
  // editing section, as the sentence motions. The two sets were unified onto that,
  // the newer behaviour, so there is one layout. If this fails, line start and end
  // have come back.
  // The caret on the *second* line of a two-line block, which is the only place
  // the two candidate behaviours differ: line start is the start of this line,
  // sentence start is the start of the block above it.
  const text = 'alpha\nbeta\n\ngamma';
  const at = text.indexOf('beta') + 2;

  const back = runChord(table, 'KeyJ ctrl', text, at);
  assert.strictEqual(back.delegated, undefined, 'ctrl+j delegated to a CodeMirror command');
  assert.strictEqual(back.head, sentenceStart(text, at));

  const forward = runChord(table, 'KeyL ctrl', text, at);
  assert.strictEqual(forward.head, sentenceEnd(text, at));

  // And the distinction is real here, so this fixture can tell them apart.
  assert.strictEqual(text.lastIndexOf('\n', at) + 1, text.indexOf('beta'), 'line start');
  assert.strictEqual(sentenceStart(text, at), 0, 'sentence start is the block start');
});

test('shift+ctrl+j and shift+ctrl+l select as far as ctrl+j and ctrl+l move', () => {
  // The pair had been CodeMirror's selectLineStart/End. With the unshifted chords
  // moving by sentence, those would have selected to somewhere the caret never
  // goes — so they select by sentence too, keeping the anchor where it was.
  const text = 'alpha\nbeta\n\ngamma';
  const at = text.indexOf('beta') + 2;
  for (const [chord, fn] of [['KeyJ ctrl+shift', sentenceStart],
                             ['KeyL ctrl+shift', sentenceEnd]]) {
    called.length = 0;
    const view = fakeView(text, at);
    table[chord](view);
    const spec = view.dispatched[0];
    assert.strictEqual(called.length, 0, chord + ' delegated instead of selecting');
    assert.strictEqual(spec.selection.head, fn(text, at), chord);
    assert.strictEqual(spec.selection.anchor, at,
      chord + ' moved the anchor, so it moved the caret rather than selecting');
  }
});

test('the custom commands are the library\'s own, not passed-through names', () => {
  // These are the ones CodeMirror has no command for, so they must not resolve to
  // something off the commands namespace — which is what a typo would do.
  for (const chord of ['Enter shift', 'Enter meta', 'Semicolon meta', 'Semicolon ctrl+meta',
                       'KeyI alt+meta+shift', 'KeyK alt+meta+shift',
                       'KeyI alt+meta', 'KeyK alt+meta',
                       'KeyC alt', 'KeyV alt', 'KeyX alt']) {
    const command = table[chord];
    assert.strictEqual(typeof command, 'function', chord);
    assert.notStrictEqual(command, cmds[command.name || 'nothing'], `${chord} resolves to a stub`);
  }
});
