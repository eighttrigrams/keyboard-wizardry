// A document that cannot grow a second line.
//
// This is the other half of `mode: 'input'`. The bindings decide what the keys
// mean; this decides what the document can be. Both are needed: a layout with no
// line motions in it still sits on a document that a pasted newline turns into
// two lines, and then the field is a box with hidden text in it.
//
// Newlines are *flattened*, not refused. Refusing was the first version and it is
// worse than it sounds: the overwhelmingly common way a newline reaches a
// single-line field is a paste — a title copied off a web page, a URL with the
// line break the mailer put in it — and a rejected transaction means the paste
// silently does nothing at all. Every character the user asked for is dropped
// because of the one they did not. Flattening keeps the text and loses only the
// break, which is what someone pasting a title into a title field meant.
//
// The filter is separated from the theme on purpose. `EditorView.theme` needs a
// DOM to be built against, and the filter does not — so the interesting half is
// testable in node, against a real EditorState, rather than only through a
// browser. test/single_line_test.js is what tests it.

const BREAK = /\r\n?|\n/;

// The text of one line, out of text that was several.
//
// A break becomes a space, and the whitespace that sat *against* the break goes
// with it — so "foo  \n  bar", which is what a markdown hard break plus an indent
// looks like, arrives as "foo bar" rather than "foo     bar".
//
// A break at either end of the text disappears instead of becoming a space. That
// is the case that actually shows up: copying a line out of anything selects its
// trailing newline too, so almost every real paste ends in one, and turning it
// into a space means every pasted title is saved with a trailing space on it.
// Whitespace that was not next to a break is left exactly as it was — someone
// pasting "  indented" into a field meant those two spaces.
function flatten(text) {
  if (!BREAK.test(text)) return text;
  const parts = text.split(/\r\n?|\n/);
  const last = parts.length - 1;
  return parts
    .map((part, i) => {
      if (i > 0) part = part.replace(/^[ \t]+/, '');     // a break preceded it
      if (i < last) part = part.replace(/[ \t]+$/, '');   // a break follows it
      return part;
    })
    .filter(part => part !== '')
    .join(' ');
}

// What to do with a document that is not going to be a single line. The inserted
// text is rewritten in place — not the whole document — so that undo history and
// change tracking still see one edit at the position the user made it.
//
// The caret has to be worked out rather than inherited. The transaction being
// filtered carries a selection in *its* new-document coordinates, and those are
// wrong here by exactly the number of characters the flattening removed: reuse it
// and a paste leaves the caret short of its own text, or past the end of the
// document. Carrying nothing instead is worse — CodeMirror then maps the *old*
// selection forward, which for a paste leaves the caret in front of everything
// that was just pasted, at 0 for a paste into an unfocused field. So it is
// computed: the end of the last chunk this transaction inserted, which is where a
// paste and a keystroke both want it.
function oneLineOnly(tr) {
  if (!tr.docChanged || tr.newDoc.lines === 1) return tr;
  const changes = [];
  let delta = 0;   // how far new-document positions have drifted from old ones
  let caret = null;
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    const insert = flatten(inserted.toString());
    changes.push({from: fromA, to: toA, insert});
    caret = fromA + delta + insert.length;
    delta += insert.length - (toA - fromA);
  });
  // annotations carried over so this still reads as the same transaction to
  // anything watching — the history, above all, which keys undo grouping off
  // userEvent.
  const spec = {changes, annotations: tr.annotations, scrollIntoView: tr.scrollIntoView};
  // Only when the transaction was moving the caret anyway. One that deliberately
  // left the selection alone is not second-guessed.
  if (tr.selection && caret !== null) spec.selection = {anchor: caret, head: caret};
  return spec;
}

// The filter on its own, for a caller that has @codemirror/state and no view —
// which is to say, for the tests.
export function noNewlines(EditorState) {
  return EditorState.transactionFilter.of(oneLineOnly);
}

// The text a single-line document may hold, for sanitising a doc *before* it
// becomes one. The filter above only ever sees transactions, so a state created
// with "a\nb" in it is two lines and no filter was ever asked about it.
export {flatten as oneLine};

// The extensions. `cm` is the CodeMirror namespace the consumer already has, the
// same one install() and bindings() take — nothing here imports CodeMirror, for
// the reason spelled out at the top of bindings.js.
//
// Note what is *not* here: EditorView.lineWrapping. That is the point. Without it
// the content stays on one line and the scroller pans sideways, which is what an
// input field does; with it, a long value would wrap and the box would grow.
export function singleLine(cm) {
  const {EditorState, EditorView} = cm;
  return [
    noNewlines(EditorState),
    EditorView.theme({
      '.cm-scroller': {overflowX: 'auto', overflowY: 'hidden'},
      '.cm-content': {whiteSpace: 'pre'},
      // A single-line field has one line, so "the active line" is the whole box.
      // Highlighting it is noise.
      '.cm-activeLine': {backgroundColor: 'transparent'}
    })
  ];
}
