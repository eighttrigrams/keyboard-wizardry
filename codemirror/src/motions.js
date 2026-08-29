// Markdown "sentence" motions: ctrl+j back, ctrl+l forward.
// Pure functions of (text, pos) -> pos. No CodeMirror, no DOM — that is what
// makes them testable, and test/motions_test.js is what tests them.
//
// Two definitions carry the whole scheme:
//
//   hard break  a line whose text ends in two or more spaces, markdown's line
//               break. The spaces must sit immediately before a newline, so the
//               last line of a document cannot have one.
//   block       a run of lines bounded by a blank line or by an end of the
//               document. A run of several blank lines separates just like one.
//
// This is deliberately not the punctuation rule from cljs-text-editor.

function lineStartsOf(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

function lineIndexAt(starts, pos) {
  let i = 0;
  while (i + 1 < starts.length && starts[i + 1] <= pos) i++;
  return i;
}

function isBlank(line) {
  return /^\s*$/.test(line);
}

// A blank line of two spaces is blank, not a hard break: it separates blocks.
function hasHardBreak(lines, i) {
  return i >= 0 && i < lines.length - 1 && !isBlank(lines[i]) && / {2,}$/.test(lines[i]);
}

// Where a sentence begins: the first line of a block, or a line the one above
// broke into with a hard break.
function beginsSentence(lines, i) {
  if (isBlank(lines[i])) return false;
  if (i === 0) return true;
  if (isBlank(lines[i - 1])) return true;
  return hasHardBreak(lines, i - 1);
}

function clamp(pos, text) {
  if (!(pos > 0)) return 0;
  return pos > text.length ? text.length : pos;
}

// ctrl+l. If this line ends in a hard break, the next line. Otherwise the start
// of the next block, past the blank lines rather than onto them. Past the last
// block, the end of the document.
export function sentenceEnd(text, pos) {
  pos = clamp(pos, text);
  const lines = text.split('\n');
  const starts = lineStartsOf(text);
  const i = lineIndexAt(starts, pos);
  if (hasHardBreak(lines, i)) return starts[i + 1];
  let j = i;
  while (j < lines.length && !isBlank(lines[j])) j++;
  while (j < lines.length && isBlank(lines[j])) j++;
  return j < lines.length ? starts[j] : text.length;
}

// ctrl+j: the nearest sentence beginning strictly before pos, so that repeated
// presses walk backwards instead of jamming at a block start. That single rule
// gives both of the cases the scheme asks for — the line start when the line
// above ended in a hard break, the block start when it did not.
export function sentenceStart(text, pos) {
  pos = clamp(pos, text);
  const lines = text.split('\n');
  const starts = lineStartsOf(text);
  for (let j = lineIndexAt(starts, pos); j >= 0; j--) {
    if (starts[j] < pos && beginsSentence(lines, j)) return starts[j];
  }
  return 0;
}

// --- the line motions a file with no blocks in it wants ----------------------
//
// ctrl+j and ctrl+l in text mode and in shell-like mode, and inside a shell-like
// fence in a markdown one. The plain CodeMirror `cursorLineStart` and
// `cursorLineEnd` are what these replace, and the difference is only what happens
// once you are already there: pressing again steps to the neighbouring line
// rather than doing nothing.
//
// **Pressing again has to do something.** A chord that is a no-op at the one
// place it is most natural to press it — you just walked to the start of the
// line, so your hand is on ctrl+j — reads as a chord that stopped working. The
// same rule the lens gives for wrapping its list.
//
// The end of the previous line, not its start, because that is where ctrl+j was
// heading: leftwards. ctrl+l mirrors it and lands on the start of the next.
//
// `from` and `to` bound the region, for a caret inside a fenced block: the
// motions may not step out of it, the same way the sexp ones may not. A *bounded*
// region that ends in a newline ends at that newline, because the line after it
// is the closing fence and not part of the block. A whole document ending in one
// does not get that treatment — there the line after the final newline is a real
// empty line the caret can sit on, and ctrl+l should reach it.

function bounds(text, from, to) {
  const lo = from == null ? 0 : from;
  let hi = text.length;
  if (to != null) {
    hi = to;
    if (hi > lo && text[hi - 1] === '\n') hi--;
  }
  return [lo, hi > lo ? hi : lo];
}

function within(pos, lo, hi) {
  return pos < lo ? lo : pos > hi ? hi : pos;
}

// ctrl+j: the start of this line, or — standing on it already — the end of the
// line above.
export function lineStartOrPrevEnd(text, pos, from, to) {
  const [lo, hi] = bounds(text, from, to);
  pos = within(pos, lo, hi);
  if (pos <= lo) return lo;
  const nl = text.lastIndexOf('\n', pos - 1);
  const start = nl < lo ? lo : nl + 1;
  if (pos > start) return start;
  return start > lo ? start - 1 : lo;
}

// ctrl+l: the end of this line, or — standing on it already — the start of the
// line below.
export function lineEndOrNextStart(text, pos, from, to) {
  const [lo, hi] = bounds(text, from, to);
  pos = within(pos, lo, hi);
  const nl = text.indexOf('\n', pos);
  const end = nl < 0 || nl > hi ? hi : nl;
  if (pos < end) return end;
  return end + 1 <= hi ? end + 1 : end;
}
