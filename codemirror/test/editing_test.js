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

function stubCommands() {
  const made = new Map();
  return new Proxy({}, {
    get(_, name) {
      if (!made.has(name)) {
        const fn = () => {};
        Object.defineProperty(fn, 'name', {value: String(name)});
        made.set(name, fn);
      }
      return made.get(name);
    }
  });
}

const cmds = stubCommands();
const table = editingBindings(cmds);

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
  assert.strictEqual(table['KeyJ alt'], cmds.cursorGroupLeft);
  assert.strictEqual(table['KeyL alt'], cmds.cursorGroupRight);
});

test('shift selects wherever the unshifted chord moves', () => {
  const pairs = [
    ['KeyJ meta', 'KeyJ meta+shift', 'cursorCharLeft', 'selectCharLeft'],
    ['KeyL meta', 'KeyL meta+shift', 'cursorCharRight', 'selectCharRight'],
    ['KeyJ alt', 'KeyJ alt+shift', 'cursorGroupLeft', 'selectGroupLeft'],
    ['KeyL alt', 'KeyL alt+shift', 'cursorGroupRight', 'selectGroupRight'],
    ['KeyJ ctrl', 'KeyJ ctrl+shift', 'cursorLineStart', 'selectLineStart'],
    ['KeyL ctrl', 'KeyL ctrl+shift', 'cursorLineEnd', 'selectLineEnd']
  ];
  for (const [move, select, moveName, selectName] of pairs) {
    assert.strictEqual(table[move], cmds[moveName], move);
    assert.strictEqual(table[select], cmds[selectName], select);
  }
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
