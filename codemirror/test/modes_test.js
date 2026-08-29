// The four modes, and what makes them four rather than four copies.
//
//   npm test
//
// Same trick as the other two binding tests — the commands namespace is a Proxy
// answering every name with the same function each time, so assertions are
// identity checks and a chord pointing at the wrong command cannot pass.
//
// What this file is really about is the *inheritance*. Two tables that happen to
// agree today are not one layout; two tables built from one are. So most of what
// is asserted here is sameness — chord for chord, by identity — and the
// interesting part is the short list of places where sameness is not expected.

import {test} from 'node:test';
import assert from 'node:assert';
import {bindings, markdownBindings, documentBindings, textBindings, shellBindings,
        inputBindings, MARKDOWN, TEXT, SHELL, INPUT, DOCUMENT} from '../src/bindings.js';

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
const markdown = bindings(cmds, {mode: MARKDOWN});
const text = bindings(cmds, {mode: TEXT});
const shell = bindings(cmds, {mode: SHELL});
const input = bindings(cmds, {mode: INPUT});

// Enough of an EditorView for a command to run against: markdown's option four
// are fence-aware, so they read the document and either delegate or dispatch,
// and the two viewport chords nudge a scroller.
function fakeView(doc, pos) {
  const dispatched = [];
  return {
    dispatched,
    scrollDOM: {scrollTop: 0, clientHeight: 0},
    state: {
      doc: {toString: () => doc, length: doc.length},
      selection: {main: {head: pos, anchor: pos, from: pos, to: pos}}
    },
    dispatch: spec => dispatched.push(spec)
  };
}

function runChord(table, chord, doc, pos) {
  called.length = 0;
  const view = fakeView(doc, pos);
  table[chord](view);
  return {delegated: called[0], head: view.dispatched[0]?.selection?.head};
}

// **Identity is the right check, and for ten chords it cannot be made.** Most of
// what a table holds is a command taken off the commands namespace, so two builds
// hold the very same function and === says so. Ten are closures the library
// *makes* while building the table — the fence-aware four, the two sentence
// motions and their selecting pair, and the two viewport nudges, which are
// `cursorViewportUp(commands)` and its mirror. Two builds of the same mode hold
// two such closures, doing the same thing and not ===.
//
// So: identity where identity exists, and where it does not, behaviour — run
// both on the same fixtures and compare everything that came out. The fixtures
// are a line of prose and a ```clojure block, which is the one document that can
// tell markdown mode's four apart from text mode's.
const FENCED = '```clojure\n(a b)\n```\n';
const FIXTURES = [['just some prose here', 5],
                  [FENCED, FENCED.indexOf('a') + 1]];

function outcome(command, doc, pos) {
  called.length = 0;
  const view = fakeView(doc, pos);
  try { command(view); } catch (e) { return {threw: String(e && e.message)}; }
  return {delegated: [...called],
          selection: view.dispatched.map(spec => spec.selection),
          scrolled: view.scrollDOM.scrollTop};
}

function sameCommand(a, b) {
  if (a === b) return true;
  return FIXTURES.every(([doc, pos]) => {
    try {
      assert.deepStrictEqual(outcome(a, doc, pos), outcome(b, doc, pos));
      return true;
    } catch (_) { return false; }
  });
}

function assertSameCommand(a, b, chord) {
  assert.ok(sameCommand(a, b), chord + ' differs between the modes');
}

// The whole of the difference between a markdown document and a text file, as
// far as the keyboard is concerned. Spelled out rather than derived, so that
// adding a ninth and not thinking about it is a failure here.
const MARKDOWN_ONLY = [
  'KeyJ alt', 'KeyL alt', 'KeyI alt', 'KeyK alt',   // by form inside a fence
  'KeyJ ctrl', 'KeyL ctrl',                         // by block, not by line
  'KeyJ ctrl+shift', 'KeyL ctrl+shift'              // ...selecting
];

test('the mode constants are what the strings say', () => {
  assert.strictEqual(MARKDOWN, 'markdown');
  assert.strictEqual(TEXT, 'text');
  assert.strictEqual(SHELL, 'shell');
  assert.strictEqual(INPUT, 'input');
});

test('the default mode is markdown, which is the layout that had no name', () => {
  // Every consumer that passes no mode — six of the eight — must be untouched by
  // modes existing at all.
  const byDefault = bindings(cmds);
  assert.deepStrictEqual(Object.keys(byDefault).sort(), Object.keys(markdown).sort());
  for (const chord of Object.keys(markdown)) assertSameCommand(byDefault[chord], markdown[chord], chord);
  assert.strictEqual(Object.keys(markdown).length, 47);
});

test("'document' still means markdown, and by the same function", () => {
  // It is exported, so somebody may be spelling it; and blog ships a bundle that
  // re-exports this whole surface, where an old page meets a new bundle.
  assert.strictEqual(DOCUMENT, 'document');
  assert.strictEqual(documentBindings, markdownBindings);
  const asDocument = bindings(cmds, {mode: DOCUMENT});
  for (const chord of Object.keys(markdown)) assertSameCommand(asDocument[chord], markdown[chord], chord);
});

test('an unknown mode throws, and says what the modes are', () => {
  assert.throws(() => bindings(cmds, {mode: 'markdwon'}), /unknown editor mode/);
  assert.throws(() => bindings(cmds, {mode: 'Text'}), /unknown editor mode/);
  assert.throws(() => bindings(cmds, {mode: 'sh'}), /"shell"/);
});

test('a text file has the same chords as a markdown one, all 47 of them', () => {
  // Not a smaller layout — the same one. There is nothing about a .txt that
  // takes a key away; what changes is what eight of them can mean.
  assert.deepStrictEqual(Object.keys(text).sort(), Object.keys(markdown).sort());
  assert.strictEqual(Object.keys(text).length, 47);
});

test('and 39 of them are the very same command', () => {
  const differ = Object.keys(markdown).filter(c => !sameCommand(markdown[c], text[c]));
  assert.deepStrictEqual(differ.sort(), [...MARKDOWN_ONLY].sort());
});

test('what a text file loses is blocks and fences, and nothing else', () => {
  // The option four, one at a time, so a failure names which: plain word and line
  // motion, taken straight off the commands namespace.
  assert.strictEqual(text['KeyJ alt'], cmds.cursorGroupLeft);
  assert.strictEqual(text['KeyL alt'], cmds.cursorGroupRight);
  assert.strictEqual(text['KeyI alt'], cmds.cursorLineUp);
  assert.strictEqual(text['KeyK alt'], cmds.cursorLineDown);
  // The ctrl pair is the library's own, because CodeMirror has no command for
  // "the end of the line, or the line above if I am already there".
  const doc = 'alpha\nbeta\ngamma';
  const at = i => runChord(text, 'KeyJ ctrl', doc, i).head;
  assert.strictEqual(at(doc.indexOf('beta') + 2), doc.indexOf('beta'), 'to the start of the line');
  assert.strictEqual(at(doc.indexOf('beta')), doc.indexOf('beta') - 1, 'then to the end of the one above');
  const to = i => runChord(text, 'KeyL ctrl', doc, i).head;
  assert.strictEqual(to(doc.indexOf('beta') + 2), doc.indexOf('beta') + 4, 'to the end of the line');
  assert.strictEqual(to(doc.indexOf('beta') + 4), doc.indexOf('gamma'), 'then to the start of the one below');
});

test('the ctrl pair walks the file rather than jamming at an end', () => {
  // The one thing that changed about text mode. cursorLineStart is a no-op once
  // the caret is at the start of the line — pressed twice from the middle of a
  // line it goes somewhere and then nowhere, which reads as a key that stopped
  // working. These keep going.
  const doc = 'alpha\nbeta\ngamma';
  let pos = doc.indexOf('beta') + 2;
  const walked = [];
  for (let i = 0; i < 4; i++) { pos = runChord(text, 'KeyJ ctrl', doc, pos).head; walked.push(pos); }
  assert.deepStrictEqual(walked, [6, 5, 0, 0], 'start of beta, end of alpha, start of alpha, and there it stops');
});

test('shift+ctrl selects exactly as far as ctrl moves, in every mode', () => {
  // Not a separate definition: selectTo() is handed the same pure motion motion()
  // is, so the two cannot disagree about where the chord goes.
  const doc = 'alpha\nbeta\n\ngamma';
  for (const [name, table] of [['text', text], ['shell', shell], ['markdown', markdown]]) {
    for (const [move, select] of [['KeyJ ctrl', 'KeyJ ctrl+shift'],
                                  ['KeyL ctrl', 'KeyL ctrl+shift']]) {
      const at = doc.indexOf('beta') + 2;
      assert.strictEqual(runChord(table, select, doc, at).head,
                         runChord(table, move, doc, at).head,
                         `${name}: ${select} does not select as far as ${move} moves`);
    }
  }
});

test('text mode is what markdown mode already does outside a fence', () => {
  // The claim the inheritance rests on: markdown's option four are wrappers whose
  // *fallback* is the command text mode binds. So the two are not two behaviours
  // that resemble each other — in prose they are one.
  const prose = 'just some prose here';
  for (const chord of ['KeyJ alt', 'KeyL alt', 'KeyI alt', 'KeyK alt']) {
    const {delegated} = runChord(markdown, chord, prose, 5);
    assert.strictEqual(text[chord].name, delegated, chord);
    assert.strictEqual(text[chord], cmds[delegated], chord);
  }
});

test('a ```clojure block in a text file is text, not code', () => {
  // The same document that makes markdown mode move by form. A .txt that happens
  // to contain three backticks is still a .txt.
  const doc = '```clojure\n(a b)\n```\n';
  const pos = doc.indexOf('a') + 1;
  const {delegated, head} = runChord(text, 'KeyL alt', doc, pos);
  assert.strictEqual(delegated, 'cursorGroupRight');
  assert.strictEqual(head, undefined, 'text mode moved the caret itself, so it scanned for a fence');
  // ...where markdown mode, on that very document, does not.
  assert.strictEqual(runChord(markdown, 'KeyL alt', doc, pos).delegated, undefined);
});

test('the ctrl pair is the ends of the line, and the block is what markdown adds', () => {
  // The caret on the second line of a two-line block: the one place where "start
  // of this line" and "start of this block" are different answers.
  const doc = 'alpha\nbeta\n\ngamma';
  const at = doc.indexOf('beta') + 2;
  assert.strictEqual(runChord(text, 'KeyJ ctrl', doc, at).head, doc.indexOf('beta'), 'text went to the line');
  assert.strictEqual(runChord(markdown, 'KeyJ ctrl', doc, at).head, 0, 'markdown went to the block');
});

test('a shell-like fence is a shell script, and the ctrl pair says so', () => {
  // The second language markdown mode understands inside a fence, and the whole
  // of what it changes. In a code block there are no blank lines, so markdown's
  // "end of this block" is the far side of the entire listing — which is the
  // wrong answer often enough to be worth a rule.
  const doc = '# title\n\n```sh\necho a\necho b\n```\n\nafter\n';
  const b = doc.indexOf('echo b');
  assert.strictEqual(runChord(markdown, 'KeyJ ctrl', doc, b + 2).head, b, 'to the start of the code line');
  assert.strictEqual(runChord(markdown, 'KeyL ctrl', doc, b + 2).head, b + 6, 'to the end of it');
});

test('and it may not step out of the block it is in', () => {
  // The same confinement the sexp motions have. A chord meaning "the neighbouring
  // line" should not, at the edge of a fence, mean "leave the code".
  const doc = '# title\n\n```sh\necho a\necho b\n```\n\nafter\n';
  const a = doc.indexOf('echo a'), b = doc.indexOf('echo b');
  assert.strictEqual(runChord(markdown, 'KeyJ ctrl', doc, a).head, a, 'up and out of the opening fence');
  assert.strictEqual(runChord(markdown, 'KeyL ctrl', doc, b + 6).head, b + 6, 'down and out of the closing one');
  // ...but inside it, the two lines are neighbours as they would be in a .sh.
  assert.strictEqual(runChord(markdown, 'KeyJ ctrl', doc, b).head, b - 1, 'to the end of the line above');
  assert.strictEqual(runChord(markdown, 'KeyL ctrl', doc, a + 6).head, b, 'to the start of the line below');
});

test('a ```js fence is prose, because the spec says two languages and no third', () => {
  // Being wrong in the safe direction: a language nobody taught it keeps the
  // markdown bindings, where guessing would quietly take the block motions away
  // from a document that is mostly prose.
  const doc = '# title\n\n```js\nlet a\nlet b\n```\n\nafter\n';
  const b = doc.indexOf('let b');
  // Past the start of its own line and all the way to the top of the block,
  // which for a fence markdown does not understand is the ```js line itself.
  assert.strictEqual(runChord(markdown, 'KeyJ ctrl', doc, b + 2).head, doc.indexOf('```js'),
                     'it moved by block, as prose does');
  // ...where a ```sh block, on the identical document, stops at the line.
  const sh = doc.replace('```js', '```sh');
  const sb = sh.indexOf('let b');
  assert.strictEqual(runChord(markdown, 'KeyJ ctrl', sh, sb).head, sb - 1,
                     'the one word of the info string is the whole of the difference');
});

test('everything above the line is inherited, so it is identical in both', () => {
  // The line operations, paging, scrolling, centring, the clipboard: written once
  // in the multi-line base, so there is no second copy to fall behind.
  const INHERITED = ['Enter shift', 'Enter meta',
                     'KeyI ctrl+meta', 'KeyK ctrl+meta', 'KeyL ctrl+meta', 'KeyJ ctrl+meta',
                     'KeyP alt+meta', 'Semicolon alt+meta',
                     'KeyP alt+ctrl+meta', 'Semicolon alt+ctrl+meta',
                     'KeyI alt+meta+shift', 'KeyK alt+meta+shift',
                     'KeyI alt+meta', 'KeyK alt+meta',
                     'Semicolon meta', 'Semicolon ctrl+meta',
                     'KeyI meta', 'KeyK meta', 'KeyI meta+shift', 'KeyK meta+shift',
                     'KeyC alt', 'KeyV alt', 'KeyX alt', 'KeyA alt', 'Backquote alt'];
  for (const chord of INHERITED) assertSameCommand(text[chord], markdown[chord], chord);
});

test('a shell script is a text file, chord for chord and command for command', () => {
  // The spec says so, and it is true today. When it stops being true, this test
  // is the one that has to be told.
  assert.deepStrictEqual(Object.keys(shell).sort(), Object.keys(text).sort());
  for (const chord of Object.keys(text)) assertSameCommand(shell[chord], text[chord], chord);
});

test('input mode reaches the same ends of the line that a text file does', () => {
  // Not a coincidence and not a third spelling: a one-line document is a text
  // file with one line in it, so the ctrl pair must be the very same commands.
  for (const chord of ['KeyJ ctrl', 'KeyL ctrl', 'KeyJ ctrl+shift', 'KeyL ctrl+shift',
                       'KeyJ alt', 'KeyL alt']) {
    assert.strictEqual(input[chord], text[chord], chord);
  }
});

test('no mode introduces a chord markdown does not have', () => {
  // The point of modes is one layout on four documents. A chord that exists only
  // in a .sh is a second layout to learn, which is the thing this avoids.
  for (const [name, table] of [['text', text], ['shell', shell], ['input', input]]) {
    const extra = Object.keys(table).filter(c => !(c in markdown));
    assert.deepStrictEqual(extra, [], name);
  }
});

test('modifiers are spelled in the order chord() produces, in every mode', () => {
  const ORDER = ['alt', 'ctrl', 'meta', 'shift'];
  for (const [name, table] of [['markdown', markdown], ['text', text],
                               ['shell', shell], ['input', input]]) {
    for (const chord of Object.keys(table)) {
      const [, mods = ''] = chord.split(' ');
      const held = mods ? mods.split('+') : [];
      const sorted = [...held].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
      assert.deepStrictEqual(held, sorted, `${name}: ${chord} has its modifiers out of order`);
    }
  }
});

test('every chord in every mode is callable', () => {
  for (const [name, table] of [['markdown', markdown], ['text', text],
                               ['shell', shell], ['input', input]]) {
    for (const [chord, command] of Object.entries(table)) {
      assert.strictEqual(typeof command, 'function', `${name}: ${chord} is not callable`);
    }
  }
});

test('the tables share no mutable state', () => {
  // Every one is built by Object.assign onto a fresh base. A base object returned
  // rather than rebuilt would mean one mode's construction editing another's
  // table — and with four modes on one base, editing three.
  const a = textBindings(cmds);
  a['KeyJ meta'] = 'clobbered';
  for (const build of [markdownBindings, textBindings, shellBindings, inputBindings]) {
    assert.notStrictEqual(build(cmds)['KeyJ meta'], 'clobbered', build.name);
  }
});
