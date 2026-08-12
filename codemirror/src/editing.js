// The Normal editing section of the scheme: the whole of it, not just the eight
// motions in bindings.js.
//
// This is tracker's table, moved. tracker had the fullest implementation of the
// scheme by a distance — 47 chords against blog's 8 — and rhizome and treina each
// held a near-identical copy of it. That is what this file replaces.
//
// It is a move and not a rewrite: the chords and what they do are exactly what
// tracker did, including the two places where that is arguably not what anyone
// would design now. Both are marked below. Changing a binding here changes what
// somebody's hands already know, so it is a decision to be taken deliberately and
// not while consolidating code.
//
// The one binding that differs between apps is ctrl+j / ctrl+l. Here they are
// line start and line end, which is what tracker has always done. In
// bindings.js — what blog uses — they are the markdown "sentence" motions the
// README describes. Two named sets rather than one, because both are in use.

import {sexpAware} from './bindings.js';
import {forwardSexp, backwardSexp, forwardDownSexp, forwardUpSexp} from './sexp.js';

// ---- the commands CodeMirror does not come with -----------------------------

// Clipboard by hand, through navigator.clipboard, because these chords are
// option-based and never reach the browser's own cut/copy/paste.
function copySelection(view) {
  const selection = view.state.selection.main;
  if (selection.from === selection.to) return;
  navigator.clipboard.writeText(view.state.doc.slice(selection.from, selection.to));
}

function pasteAtSelection(view) {
  navigator.clipboard.readText().then(text => {
    const selection = view.state.selection.main;
    view.dispatch(view.state.update({
      changes: {from: selection.from, to: selection.to, insert: text}
    }));
  });
}

function cutSelection(view) {
  const selection = view.state.selection.main;
  if (selection.from === selection.to) return;
  navigator.clipboard.writeText(view.state.doc.slice(selection.from, selection.to));
  view.dispatch(view.state.update({
    changes: {from: selection.from, to: selection.to, insert: ''}
  }));
}

// A new line under the one the caret is on, and the caret on it — wherever in the
// line the caret was, which is what makes this worth a binding of its own.
function newLineBelow(view) {
  const state = view.state;
  const end = state.doc.lineAt(state.selection.main.head).to;
  view.dispatch(state.update({
    changes: {from: end, to: end, insert: '\n'},
    selection: {anchor: end + 1, head: end + 1}
  }));
}

// The mirror, except that the caret stays at the start of the line it was on —
// which, the new line having been pushed in above it, is the new empty line.
function newLineAbove(view) {
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
function scrollDown(view) { scrollBy(view, LINE); }
function scrollUp(view) { scrollBy(view, -LINE); }

function cursorViewportUp(commands) {
  return view => { commands.cursorLineUp(view); scrollBy(view, -LINE); };
}

function cursorViewportDown(commands) {
  return view => { commands.cursorLineDown(view); scrollBy(view, LINE); };
}

// Move the caret to whichever line is halfway down the viewport, leaving the view
// where it is. The loop is a linear walk from line 1 asking the view where each
// line has been laid out, so it costs more the further down a long document you
// are; kept as it was, and wrapped in the same try/catch, because coordsAtPos
// answers null for anything outside the rendered range.
function centerCaret(view) {
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
function centerLine(view) {
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

// ---- the table --------------------------------------------------------------

// Keyed the way chord() in bindings.js spells a keydown: e.code, then the
// modifiers held, in the order alt, ctrl, meta, shift.
export function editingBindings(commands) {
  return {
    // Motion
    'KeyJ meta': commands.cursorCharLeft,
    'KeyL meta': commands.cursorCharRight,
    'KeyI meta': commands.cursorLineUp,
    'KeyK meta': commands.cursorLineDown,
    // The four option motions do something else inside a ```clojure block: by
    // form rather than by word or line, confined to the block. Everywhere else
    // the fallback runs and these are the chords they always were.
    'KeyJ alt': sexpAware(backwardSexp, commands.cursorGroupLeft),
    'KeyL alt': sexpAware(forwardSexp, commands.cursorGroupRight),
    'KeyI alt': sexpAware(forwardUpSexp, commands.cursorLineUp),
    'KeyK alt': sexpAware(forwardDownSexp, commands.cursorLineDown),
    'KeyJ ctrl': commands.cursorLineStart,
    'KeyL ctrl': commands.cursorLineEnd,

    // The same, selecting
    'KeyJ meta+shift': commands.selectCharLeft,
    'KeyL meta+shift': commands.selectCharRight,
    'KeyI meta+shift': commands.selectLineUp,
    'KeyK meta+shift': commands.selectLineDown,
    'KeyJ alt+shift': commands.selectGroupLeft,
    'KeyL alt+shift': commands.selectGroupRight,
    'KeyI alt+shift': commands.selectLineUp,
    'KeyK alt+shift': commands.selectLineDown,
    'KeyJ ctrl+shift': commands.selectLineStart,
    'KeyL ctrl+shift': commands.selectLineEnd,

    // Deleting
    'Equal alt': commands.deleteGroupForward,
    'Equal meta': commands.deleteCharForward,
    'Backspace ctrl': commands.deleteToLineStart,
    'Equal ctrl': commands.deleteToLineEnd,
    'Equal ctrl+meta': commands.deleteLine,

    // Lines
    'Enter shift': newLineBelow,
    'Enter meta': newLineAbove,
    'KeyI ctrl+meta': commands.moveLineUp,
    'KeyK ctrl+meta': commands.moveLineDown,
    'KeyL ctrl+meta': commands.indentMore,
    'KeyJ ctrl+meta': commands.indentLess,

    // Pages and the whole document
    'KeyP alt+meta': commands.cursorPageUp,
    'Semicolon alt+meta': commands.cursorPageDown,
    'KeyP alt+ctrl+meta': commands.cursorDocStart,
    'Semicolon alt+ctrl+meta': commands.cursorDocEnd,

    // The view, with and without the caret. See the NOTE above about KeyI.
    'KeyI alt+meta+shift': scrollDown,
    'KeyK alt+meta+shift': scrollUp,
    'KeyI alt+meta': cursorViewportUp(commands),
    'KeyK alt+meta': cursorViewportDown(commands),
    'Semicolon meta': centerCaret,
    'Semicolon ctrl+meta': centerLine,

    // Everything else
    'KeyA alt': commands.selectAll,
    'Backquote alt': commands.undo,
    'Backquote shift': commands.redo,
    'KeyC alt': copySelection,
    'KeyV alt': pasteAtSelection,
    'KeyX alt': cutSelection
  };
}
