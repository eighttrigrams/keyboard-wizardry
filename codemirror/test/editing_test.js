// The Normal editing table: 47 chords, and which command each one is.
//
//   npm test
//
// No browser and no CodeMirror. editingBindings only ever reads names off the
// commands namespace it is handed, so the namespace here is a Proxy that answers
// every name with the same function each time — which makes the assertions
// identity checks rather than string comparisons, and means a chord pointing at
// the wrong command cannot pass.

import {test} from 'node:test';
import assert from 'node:assert';
import {editingBindings} from '../src/editing.js';
import {markdownBindings} from '../src/bindings.js';

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
const table = editingBindings(cmds);

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

test('the table is the 47 chords tracker had, and no more', () => {
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
    ['KeyJ ctrl', 'KeyJ ctrl+shift', 'cursorLineStart', 'selectLineStart'],
    ['KeyL ctrl', 'KeyL ctrl+shift', 'cursorLineEnd', 'selectLineEnd']
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

test('ctrl+j and ctrl+l are line start and end here, not the sentence motions', () => {
  // The one binding the two sets disagree about. tracker has always had line
  // start and end on these; blog has the markdown "sentence" motions. If this
  // test ever fails, somebody has unified the two sets — which changes what
  // Daniel's hands already know in one app or the other, and is not a thing to
  // do by accident.
  assert.strictEqual(table['KeyJ ctrl'], cmds.cursorLineStart);
  assert.strictEqual(table['KeyL ctrl'], cmds.cursorLineEnd);

  const markdown = markdownBindings(cmds);
  assert.notStrictEqual(markdown['KeyJ ctrl'], table['KeyJ ctrl']);
  assert.notStrictEqual(markdown['KeyL ctrl'], table['KeyL ctrl']);
});

test('where the two sets overlap they agree, ctrl+j and ctrl+l aside', () => {
  const markdown = markdownBindings(cmds);
  for (const [chord, command] of Object.entries(markdown)) {
    if (chord === 'KeyJ ctrl' || chord === 'KeyL ctrl') continue;
    if (chord in FENCE_AWARE) {
      // Separate wrappers, so identity says nothing. What must agree is where
      // each one sends a prose document.
      assert.strictEqual(runChord(markdown, chord, 'plain prose here', 4).delegated,
                         runChord(table, chord, 'plain prose here', 4).delegated,
                         `${chord} falls back differently in the two sets`);
      continue;
    }
    assert.strictEqual(table[chord], command,
      `${chord} means different things in the two sets`);
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
