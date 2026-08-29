// Which fenced code block, if any, the caret is inside.
//
//   npm test
//
// Fixtures carry the caret as "|", the same convention as motions_test.js.

import {test} from 'node:test';
import assert from 'node:assert';
import {fenceAt, clojureFenceAt, shellFenceAt} from '../src/fences.js';

function unmark(marked) {
  const pos = marked.indexOf('|');
  assert.notStrictEqual(pos, -1, 'fixture needs a | caret');
  return [marked.slice(0, pos) + marked.slice(pos + 1), pos];
}

// The fence's language, or null when the caret is not in one.
function langAt(marked) {
  const [text, pos] = unmark(marked);
  const fence = fenceAt(text, pos);
  return fence ? fence.lang : null;
}

// The text the caret's fence encloses, so the bounds are asserted as content
// rather than as numbers nobody can check by eye.
function bodyAt(marked) {
  const [text, pos] = unmark(marked);
  const fence = fenceAt(text, pos);
  return fence ? text.slice(fence.from, fence.to) : null;
}

test('inside a fenced block, the info string is the language', () => {
  assert.strictEqual(langAt('text\n```clojure\n(a |b)\n```\nmore'), 'clojure');
  assert.strictEqual(langAt('```js\nconst a| = 1\n```'), 'js');
});

test('outside any fence there is none', () => {
  assert.strictEqual(langAt('just |prose'), null);
  assert.strictEqual(langAt('```clojure\n(a b)\n```\nafter| the block'), null);
  assert.strictEqual(langAt('before| it\n```clojure\n(a b)\n```'), null);
});

test('the fence lines themselves are not inside it', () => {
  // The caret sits on the opening line here, which is not code yet.
  assert.strictEqual(langAt('```cloj|ure\n(a b)\n```'), null);
  assert.strictEqual(langAt('```clojure\n(a b)\n``|`'), null);
});

test('the body is what lies between the fence lines', () => {
  assert.strictEqual(bodyAt('```clojure\n(a |b)\n```\nafter'), '(a b)\n');
  assert.strictEqual(bodyAt('x\n\n```clj\none\ntw|o\n```\n'), 'one\ntwo\n');
});

test('an unclosed fence runs to the end of the document', () => {
  assert.strictEqual(bodyAt('```clojure\n(a |b)\n(c d)\n'), '(a b)\n(c d)\n');
});

test('a second block is its own fence', () => {
  const doc = '```clojure\n(a b)\n```\nprose\n```edn\n{:a| 1}\n```';
  assert.strictEqual(langAt(doc), 'edn');
  assert.strictEqual(bodyAt(doc), '{:a 1}\n');
});

test('language names are matched without case', () => {
  assert.strictEqual(langAt('```Clojure\n(a| b)\n```'), 'clojure');
});

test('tildes fence as well as backticks, and do not close each other', () => {
  assert.strictEqual(langAt('~~~clojure\n(a| b)\n~~~'), 'clojure');
  // A ``` inside a ~~~ block is content, not a closing fence.
  assert.strictEqual(langAt('~~~clojure\n```\n(a| b)\n~~~'), 'clojure');
});

test('a longer fence is not closed by a shorter one', () => {
  assert.strictEqual(langAt('````clojure\n```\n(a| b)\n````'), 'clojure');
});

test('an info string of nothing is a fence with no language', () => {
  assert.strictEqual(langAt('```\nplai|n\n```'), '');
});

test('up to three spaces of indent still opens a fence', () => {
  assert.strictEqual(langAt('   ```clojure\n(a| b)\n   ```'), 'clojure');
});

test('clojureFenceAt answers only for the lisp languages', () => {
  const lisp = ['clojure', 'clj', 'cljs', 'cljc', 'edn'];
  for (const lang of lisp) {
    const [text, pos] = unmark('```' + lang + '\n(a |b)\n```');
    assert.ok(clojureFenceAt(text, pos), lang + ' should count');
  }
  for (const lang of ['js', 'bash', 'python', '']) {
    const [text, pos] = unmark('```' + lang + '\n(a |b)\n```');
    assert.strictEqual(clojureFenceAt(text, pos), null, lang + ' should not count');
  }
  const [prose, at] = unmark('no fence |here');
  assert.strictEqual(clojureFenceAt(prose, at), null);
});

test('a shell-like fence is the second language, and js is not a third', () => {
  // The set mirrors the extensions that open in shell mode, so a fenced block and
  // a file holding the same text do not disagree about what ctrl+j does.
  for (const lang of ['sh', 'bash', 'zsh', 'shell', 'console', 'conf', 'gitignore']) {
    const [text, pos] = unmark('```' + lang + '\necho |a\n```');
    assert.ok(shellFenceAt(text, pos), lang + ' should count');
  }
  for (const lang of ['js', 'json', 'python', 'clojure', 'toml', 'yaml', 'c', '']) {
    const [text, pos] = unmark('```' + lang + '\necho |a\n```');
    assert.strictEqual(shellFenceAt(text, pos), null, lang + ' should not count');
  }
  const [prose, at] = unmark('no fence |here');
  assert.strictEqual(shellFenceAt(prose, at), null);
});

test('the two fence languages never claim the same block', () => {
  // They are bound to different chords, so a block answering yes to both would be
  // two different documents at once depending on which key you pressed.
  for (const lang of ['sh', 'clojure', 'edn', 'bash', 'js']) {
    const [text, pos] = unmark('```' + lang + '\n(a |b)\n```');
    assert.ok(!(shellFenceAt(text, pos) && clojureFenceAt(text, pos)), lang);
  }
});
