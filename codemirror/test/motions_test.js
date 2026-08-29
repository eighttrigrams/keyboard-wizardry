// Daniel's markdown "sentence" motions, ctrl+j and ctrl+l.
//
//   npm test
//
// Fixtures are written with a caret marker "|" and, where a hard break matters,
// with B for the two spaces that make one — trailing spaces are invisible in a
// source file and the first thing an editor strips.

import {test} from 'node:test';
import assert from 'node:assert';
import {sentenceStart, sentenceEnd,
        lineStartOrPrevEnd, lineEndOrNextStart} from '../src/motions.js';

const B = '  ';

// A case is two markings of the same text: where the caret is, and where it must
// land. Asserting the texts match keeps a mistyped fixture from passing.
function unmark(marked) {
  const pos = marked.indexOf('|');
  assert.notStrictEqual(pos, -1, 'fixture needs a | caret');
  return [marked.slice(0, pos) + marked.slice(pos + 1), pos];
}

function run(fn, from, to) {
  const [text, pos] = unmark(from);
  const [expectedText, want] = unmark(to);
  assert.strictEqual(text, expectedText, 'the two markings must be of the same text');
  assert.strictEqual(fn(text, pos), want);
}

const forward = (from, to) => run(sentenceEnd, from, to);
const backward = (from, to) => run(sentenceStart, from, to);

test('forward: a line ending in two spaces goes to the very next line', () => {
  forward(`alpha|${B}\nbeta\n\ngamma`, `alpha${B}\n|beta\n\ngamma`);
});

test('forward: no hard break goes to the next block, past the blank line', () => {
  forward(`alpha|\nbeta\n\ngamma`, `alpha\nbeta\n\n|gamma`);
});

test('forward: from inside the last block, to the end of the document', () => {
  forward(`alpha\n\nbeta ga|mma`, `alpha\n\nbeta gamma|`);
});

test('backward: previous line ends in two spaces, to the start of this line', () => {
  backward(`alpha${B}\nbe|ta`, `alpha${B}\n|beta`);
});

test('backward: no hard break above, to the start of the block', () => {
  backward(`alpha\n\nbeta\nga|mma`, `alpha\n\n|beta\ngamma`);
});

test('backward: pressed again at a block start, to the previous sentence', () => {
  backward(`alpha\n\n|beta`, `|alpha\n\nbeta`);
});

test('backward: repeated presses walk back through hard breaks, never jamming', () => {
  const [text] = unmark(`one${B}\ntwo${B}\nthree|`);
  const starts = [];
  let pos = text.length;
  for (let i = 0; i < 10 && pos > 0; i++) {
    const next = sentenceStart(text, pos);
    assert.ok(next < pos, `must move back from ${pos}, got ${next}`);
    starts.push(next);
    pos = next;
  }
  assert.deepStrictEqual(starts, [text.indexOf('three'), text.indexOf('two'), 0]);
});

test('one trailing space is not a hard break, two or more is', () => {
  forward(`alpha |\nbeta\n\ngamma`, `alpha \nbeta\n\n|gamma`);
  forward(`alpha${B}|\nbeta\n\ngamma`, `alpha${B}\n|beta\n\ngamma`);
  forward(`alpha   |\nbeta\n\ngamma`, `alpha   \n|beta\n\ngamma`);
});

test('several blank lines separate exactly like one', () => {
  forward(`alpha|\n\n\n\nbeta`, `alpha\n\n\n\n|beta`);
  backward(`alpha\n\n\n\nbe|ta`, `alpha\n\n\n\n|beta`);
});

test('a whitespace-only line is blank, not a hard break', () => {
  // "  " both ends in two spaces and is blank. Blank wins: it separates blocks.
  forward(`alpha|\n${B}\nbeta`, `alpha\n${B}\n|beta`);
});

test('stable at the start of the document', () => {
  backward(`|alpha\n\nbeta`, `|alpha\n\nbeta`);
  const [text] = unmark(`|alpha`);
  assert.strictEqual(sentenceStart(text, 0), 0);
});

test('stable at the end of the document', () => {
  forward(`alpha\n\nbeta|`, `alpha\n\nbeta|`);
  const [text] = unmark(`alpha|`);
  assert.strictEqual(sentenceEnd(text, text.length), text.length);
});

test('forward from a hard-broken line whose next line is the last', () => {
  forward(`alpha|${B}\nbeta`, `alpha${B}\n|beta`);
});

test('forward over a trailing newline lands at the very end', () => {
  forward(`alpha\n\nbe|ta\n`, `alpha\n\nbeta\n|`);
});

test('a caret on a blank line still moves both ways', () => {
  forward(`alpha\n|\nbeta`, `alpha\n\n|beta`);
  backward(`alpha\n|\nbeta`, `|alpha\n\nbeta`);
});

test('neither motion ever stands still, anywhere in a mixed document', () => {
  const [text] = unmark(`|# Title\n\nAlpha beta.\nSecond line${B}\nthird line\n\n\nLast block here.\n`);
  for (let pos = 0; pos <= text.length; pos++) {
    const back = sentenceStart(text, pos);
    const fwd = sentenceEnd(text, pos);
    assert.ok(back < pos || pos === 0,
      `backward from ${pos} gave ${back}`);
    assert.ok(fwd > pos || pos === text.length,
      `forward from ${pos} gave ${fwd}`);
    assert.ok(back >= 0 && fwd <= text.length, 'both stay inside the document');
  }
});

// --- the line motions, ctrl+j and ctrl+l in a text file or a shell script -----
//
// Same caret convention. The whole of what these add to CodeMirror's
// cursorLineStart and cursorLineEnd is the second press: standing on the end you
// asked for, you get the neighbouring line rather than nothing at all.

function landsOn(motion, from, to, bounds) {
  const [text, pos] = unmark(from);
  const [same, want] = unmark(to);
  assert.strictEqual(text, same, 'the two fixtures are not the same text');
  const got = bounds ? motion(text, pos, bounds[0], bounds[1]) : motion(text, pos);
  assert.strictEqual(got, want,
    `${JSON.stringify(from)}\n  landed ${got}, wanted ${want}`);
}

test('ctrl+j goes to the start of the line', () => {
  landsOn(lineStartOrPrevEnd, 'alpha\nbe|ta\ngamma', 'alpha\n|beta\ngamma');
  landsOn(lineStartOrPrevEnd, 'alpha\nbeta|\ngamma', 'alpha\n|beta\ngamma');
});

test('and pressed there again, to the end of the line above', () => {
  // The end and not the start: ctrl+j was heading left, so it keeps heading left.
  landsOn(lineStartOrPrevEnd, 'alpha\n|beta\ngamma', 'alpha|\nbeta\ngamma');
  landsOn(lineStartOrPrevEnd, 'alpha\nbeta\n|gamma', 'alpha\nbeta|\ngamma');
});

test('ctrl+l goes to the end of the line, then to the start of the one below', () => {
  landsOn(lineEndOrNextStart, 'alpha\nbe|ta\ngamma', 'alpha\nbeta|\ngamma');
  landsOn(lineEndOrNextStart, 'alpha\nbeta|\ngamma', 'alpha\nbeta\n|gamma');
});

test('the two ends of the document are where they stop', () => {
  landsOn(lineStartOrPrevEnd, '|alpha\nbeta', '|alpha\nbeta');
  landsOn(lineEndOrNextStart, 'alpha\nbeta|', 'alpha\nbeta|');
});

test('a document that ends in a newline has one more line, and ctrl+l reaches it', () => {
  // Not a bounded region: the empty last line of a file is a real place for the
  // caret to be, and a motion that could not get there would be wrong about the
  // most ordinary file there is.
  landsOn(lineEndOrNextStart, 'alpha\nbeta|\n', 'alpha\nbeta\n|');
  landsOn(lineStartOrPrevEnd, 'alpha\nbeta\n|', 'alpha\nbeta|\n');
});

test('an empty line is its own start and its own end', () => {
  landsOn(lineStartOrPrevEnd, 'alpha\n|\ngamma', 'alpha|\n\ngamma');
  landsOn(lineEndOrNextStart, 'alpha\n|\ngamma', 'alpha\n\n|gamma');
});

test('given bounds, neither motion leaves them', () => {
  // What a caret inside a fenced block gets. `to` is one past the body's last
  // character, so a body ending in a newline ends *at* that newline — the line
  // after it is the closing ```, which is not the block.
  const text = '```sh\necho a\necho b\n```\n';
  const from = text.indexOf('echo a');
  const to = text.lastIndexOf('```');
  const b = text.indexOf('echo b');
  assert.strictEqual(lineStartOrPrevEnd(text, from, from, to), from, 'up and out of the opener');
  assert.strictEqual(lineEndOrNextStart(text, to - 1, from, to), to - 1, 'down and out of the closer');
  assert.strictEqual(lineStartOrPrevEnd(text, b, from, to), b - 1, 'inside, the lines are neighbours');
  assert.strictEqual(lineEndOrNextStart(text, from + 6, from, to), b, '...in both directions');
});

test('neither line motion ever moves past an end, from anywhere at all', () => {
  const text = 'alpha\n\nbeta gamma\n\n\ndelta\n';
  for (let pos = 0; pos <= text.length; pos++) {
    const back = lineStartOrPrevEnd(text, pos);
    const fwd = lineEndOrNextStart(text, pos);
    assert.ok(back <= pos, `backward from ${pos} gave ${back}`);
    assert.ok(fwd >= pos, `forward from ${pos} gave ${fwd}`);
    assert.ok(back >= 0 && fwd <= text.length, 'both stay inside the document');
    assert.ok(back < pos || pos === 0, `backward stood still at ${pos}`);
    assert.ok(fwd > pos || pos === text.length, `forward stood still at ${pos}`);
  }
});
