// The commands CodeMirror does not come with, which the IJKL layout needs: a
// clipboard of its own, opening a line above or below wherever the caret sits in
// it, nudging the view by a line, and centring.
//
// These are tracker's, moved — it had the fullest implementation of the scheme,
// and rhizome and treina each still hold a near-identical copy of the same code.
// The table that binds them is in bindings.js; this file is only the commands.
//
// One oddity came across unchanged, marked below rather than corrected: the *up*
// key is bound to scrolling the view *down*. Whether that is the intended sense
// of "move the view" or an old slip, it is what tracker has always done. A line's
// worth of scrolling is a number rather than a measurement here too, as it was
// there.

// ---- the commands CodeMirror does not come with -----------------------------

// Clipboard by hand, through navigator.clipboard, because these chords are
// option-based and never reach the browser's own cut/copy/paste.
export function copySelection(view) {
  const selection = view.state.selection.main;
  if (selection.from === selection.to) return;
  navigator.clipboard.writeText(view.state.doc.slice(selection.from, selection.to));
}

export function pasteAtSelection(view) {
  navigator.clipboard.readText().then(text => {
    const selection = view.state.selection.main;
    view.dispatch(view.state.update({
      changes: {from: selection.from, to: selection.to, insert: text}
    }));
  });
}

export function cutSelection(view) {
  const selection = view.state.selection.main;
  if (selection.from === selection.to) return;
  navigator.clipboard.writeText(view.state.doc.slice(selection.from, selection.to));
  view.dispatch(view.state.update({
    changes: {from: selection.from, to: selection.to, insert: ''}
  }));
}

// A new line under the one the caret is on, and the caret on it — wherever in the
// line the caret was, which is what makes this worth a binding of its own.
export function newLineBelow(view) {
  const state = view.state;
  const end = state.doc.lineAt(state.selection.main.head).to;
  view.dispatch(state.update({
    changes: {from: end, to: end, insert: '\n'},
    selection: {anchor: end + 1, head: end + 1}
  }));
}

// The mirror, except that the caret stays at the start of the line it was on —
// which, the new line having been pushed in above it, is the new empty line.
export function newLineAbove(view) {
  const state = view.state;
  const start = state.doc.lineAt(state.selection.main.head).from;
  view.dispatch(state.update({
    changes: {from: start, to: start, insert: '\n'},
    selection: {anchor: start, head: start}
  }));
}

// A line's worth of scrolling, as a number rather than a measurement. It was
// approximate in tracker too; kept, because these are the "nudge the view" keys
// and being exactly one line off is not what they are for.
const LINE = 20;

function scrollBy(view, delta) {
  view.scrollDOM.scrollTop = view.scrollDOM.scrollTop + delta;
}

// NOTE, and preserved deliberately: in the table below, the *up* key (KeyI) is
// bound to scrolling **down**. Whether that is the intended sense of "move the
// view" or an old slip, it is what tracker has done for as long as it has had
// these keys, so it is not being quietly reversed here.
export function scrollDown(view) { scrollBy(view, LINE); }
export function scrollUp(view) { scrollBy(view, -LINE); }

export function cursorViewportUp(commands) {
  return view => { commands.cursorLineUp(view); scrollBy(view, -LINE); };
}

export function cursorViewportDown(commands) {
  return view => { commands.cursorLineDown(view); scrollBy(view, LINE); };
}

// Move the caret to whichever line is halfway down the viewport, leaving the view
// where it is. The loop is a linear walk from line 1 asking the view where each
// line has been laid out, so it costs more the further down a long document you
// are; kept as it was, and wrapped in the same try/catch, because coordsAtPos
// answers null for anything outside the rendered range.
export function centerCaret(view) {
  try {
    const state = view.state;
    const doc = state.doc;
    const scroller = view.scrollDOM;
    const scrollTop = scroller.scrollTop;
    const middleY = scrollTop + scroller.clientHeight / 2;
    const total = doc.lines;
    let line = 1;
    while (line < total) {
      const coords = view.coordsAtPos(doc.line(line).from);
      if (coords && coords.top + scrollTop >= middleY) break;
      line++;
    }
    const at = doc.line(line).from;
    view.dispatch(state.update({selection: {anchor: at, head: at}}));
  } catch (_) { /* a view that cannot be measured is a view not to move */ }
}

// The other direction: leave the caret alone and scroll its line to the middle.
export function centerLine(view) {
  try {
    const state = view.state;
    const line = state.doc.lineAt(state.selection.main.head);
    const coords = view.coordsAtPos(line.from);
    if (!coords) return;
    const scroller = view.scrollDOM;
    const target = coords.top + scroller.scrollTop - scroller.clientHeight / 2;
    scroller.scrollTo({top: Math.max(0, target), behavior: 'smooth'});
  } catch (_) { /* as above */ }
}
