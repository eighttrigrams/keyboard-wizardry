// The IJKL scheme, as CodeMirror 6 bindings. One table, for every app.
//
// It used to be two — blog's eight motions and tracker's 47 — which disagreed
// about ctrl+j and ctrl+l: the markdown "sentence" motions in one, line start and
// end in the other. That was tracker's own invention and appears nowhere in the
// top-level README, whose only definition of those two chords is the markdown
// one. So they are the markdown motions now, everywhere, and there is a single
// layout to know. Where the two sets disagreed, the newer behaviour won.
//
// (tracker still shows a plain textarea to users without vim keys turned on.
// That path does not come through here at all.)
//
// Nothing here imports CodeMirror. The `@codemirror/commands` namespace is
// handed in instead, for one reason that matters in practice: a bundle with two
// copies of @codemirror/state in it breaks in ways that are very hard to read,
// and a library that imports its own copy is how you get there. The consumer
// already has CodeMirror — blog on `window.CM6.commands`, a shadow-cljs app on
// its own `["@codemirror/commands" :as commands]`. It passes that in.
//
// So this package has no dependencies. That is deliberate.

import {sentenceStart, sentenceEnd} from './motions.js';
import {clojureFenceAt} from './fences.js';
import {forwardSexp, backwardSexp, forwardDownSexp, forwardUpSexp} from './sexp.js';
import {copySelection, pasteAtSelection, cutSelection,
        newLineBelow, newLineAbove,
        scrollDown, scrollUp, cursorViewportUp, cursorViewportDown,
        centerCaret, centerLine} from './custom-commands.js';

// Keyed on e.code, never e.key: on macOS Option is a compose modifier, so
// option+j arrives as e.key "∆". An e.key map would fail silently for
// exactly the two wordwise bindings and look fine everywhere else.
export function chord(e) {
  const mods = [];
  if (e.altKey) mods.push('alt');
  if (e.ctrlKey) mods.push('ctrl');
  if (e.metaKey) mods.push('meta');
  if (e.shiftKey) mods.push('shift');
  return e.code + ' ' + mods.join('+');
}

// A pure motion as a CodeMirror command: the function decides where, this only
// moves the caret there.
export function motion(fn) {
  return function (view) {
    const target = fn(view.state.doc.toString(), view.state.selection.main.head);
    view.dispatch({selection: {anchor: target, head: target}, scrollIntoView: true});
    return true;
  };
}

// The same motion, selecting: the anchor stays where it was and only the head
// moves, which is what makes shift+chord mean "select as far as chord would go".
// Needed because ctrl+j and ctrl+l are no longer line start and end — their
// shifted pair had been CodeMirror's selectLineStart/End, and leaving those
// behind would have meant shift+ctrl+j selecting somewhere ctrl+j never goes.
export function selectTo(fn) {
  return function (view) {
    const selection = view.state.selection.main;
    const target = fn(view.state.doc.toString(), selection.head);
    view.dispatch({selection: {anchor: selection.anchor, head: target}, scrollIntoView: true});
    return true;
  };
}

// The same chord meaning one thing in prose and another inside a ```clojure
// block — which is what makes structural editing bindable on keys that are
// already spoken for. Outside such a block the fallback runs and nothing has
// changed; inside one, movement is by form and cannot leave the block.
//
// The senses are Calva's, since that is what the VSCode keymap binds and it is
// the same hands here: option+l over the next form, option+j over the previous,
// option+k into the next list, option+i out of this one to the right.
export function sexpAware(motion, fallback) {
  return function (view) {
    const text = view.state.doc.toString();
    const pos = view.state.selection.main.head;
    const fence = clojureFenceAt(text, pos);
    if (!fence) return fallback(view);
    const target = motion(text, pos, fence.from, fence.to);
    view.dispatch({selection: {anchor: target, head: target}, scrollIntoView: true});
    return true;
  };
}

// The layout, as chord string -> CodeMirror command. Modifiers are spelled in the
// order chord() produces them — alt, ctrl, meta, shift — and a key in any other
// order can never fire, which is why a test checks it.
export function bindings(commands) {
  return {
    // Motion. The option four move by form inside a ```clojure block and by word
    // or line everywhere else; ctrl+j and ctrl+l move by markdown "sentence",
    // which is the line when the one above ended in two spaces and the block
    // otherwise.
    'KeyJ meta': commands.cursorCharLeft,
    'KeyL meta': commands.cursorCharRight,
    'KeyI meta': commands.cursorLineUp,
    'KeyK meta': commands.cursorLineDown,
    'KeyJ alt': sexpAware(backwardSexp, commands.cursorGroupLeft),
    'KeyL alt': sexpAware(forwardSexp, commands.cursorGroupRight),
    'KeyI alt': sexpAware(forwardUpSexp, commands.cursorLineUp),
    'KeyK alt': sexpAware(forwardDownSexp, commands.cursorLineDown),
    'KeyJ ctrl': motion(sentenceStart),
    'KeyL ctrl': motion(sentenceEnd),

    // The same, selecting
    'KeyJ meta+shift': commands.selectCharLeft,
    'KeyL meta+shift': commands.selectCharRight,
    'KeyI meta+shift': commands.selectLineUp,
    'KeyK meta+shift': commands.selectLineDown,
    'KeyJ alt+shift': commands.selectGroupLeft,
    'KeyL alt+shift': commands.selectGroupRight,
    'KeyI alt+shift': commands.selectLineUp,
    'KeyK alt+shift': commands.selectLineDown,
    'KeyJ ctrl+shift': selectTo(sentenceStart),
    'KeyL ctrl+shift': selectTo(sentenceEnd),

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

    // The view, with and without the caret. See the NOTE in custom-commands.js
    // about the up key scrolling down.
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

// Capture phase on the editor element, rather than a CodeMirror keymap
// extension, so these win before CodeMirror's own keymaps see the event —
// which is also how tracker's codemirror.cljs has always done it.
//
// `table` is there for a caller with a table of its own; there is one layout now,
// so no app in the suite passes it.
//
// Returns a function that takes the bindings back off again.
export function install(view, commands, table) {
  table = table || bindings(commands);
  const onKeydown = function (e) {
    const command = table[chord(e)];
    if (!command) return;
    e.preventDefault();
    e.stopPropagation();
    command(view);
  };
  view.dom.addEventListener('keydown', onKeydown, true);
  return function uninstall() {
    view.dom.removeEventListener('keydown', onKeydown, true);
  };
}
