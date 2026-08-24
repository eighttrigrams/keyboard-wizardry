// The IJKL scheme, as CodeMirror 6 bindings. One table per *mode*, and two modes.
//
// It used to be two tables — blog's eight motions and tracker's 47 — which
// disagreed about ctrl+j and ctrl+l: the markdown "sentence" motions in one, line
// start and end in the other. That was tracker's own invention and appears
// nowhere in the top-level README, whose only definition of those two chords is
// the markdown one. So they are the markdown motions now, and where the two sets
// disagreed the newer behaviour won.
//
// The two tables here are not that argument coming back. They are one layout on
// two shapes of document:
//
//   'document'  the default, and what every consumer had until now: a markdown
//               document, with blocks to move between and Clojure fences to move
//               inside. 47 chords.
//   'input'     one line, and only one — a title field, a search box. 31 chords.
//
// What input mode drops, it drops because the *document* is not there, never
// because the chord was reconsidered. There is no second line, so there are no
// line motions and nothing to move a line above or below; no blocks, so no
// sentence motions; no fences, so no structural editing. What is left is
// identical to document mode, chord for chord — see sharedBindings below, which
// is literally the same object in both.
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

export const DOCUMENT = 'document';
export const INPUT = 'input';

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

// A chord that is bound to nothing happening. Not the same as an unbound chord:
// install() preventDefaults and stops anything it finds in the table, so this
// *swallows* the key, and the app underneath never sees it.
//
// It is what the four vertical keys become in input mode. Leaving them out
// instead would let each app give cmd+k a second meaning of its own in a field
// where the scheme has none — and then the same finger does two different things
// depending on which box the caret is in, which is the one thing a keyboard
// layout exists to prevent.
//
// The cost is real and worth naming: tracker binds option+i globally to "go to
// Issues", and in a field this swallows it. If that trade ever wants reversing,
// it is this list and nothing else.
export function swallow() { return true; }

const DEAD_IN_ONE_LINE = [
  'KeyI meta', 'KeyK meta',               // cursor up / down
  'KeyI meta+shift', 'KeyK meta+shift',   // ...selecting
  'KeyI alt', 'KeyK alt',                 // in prose these are up / down too
  'KeyI alt+shift', 'KeyK alt+shift'
];

// The chords that mean exactly the same thing whether the document is one line or
// a thousand. Both tables are built on this, so a change here cannot land in one
// mode and miss the other.
function sharedBindings(commands) {
  return {
    // Motion, and the same selecting
    'KeyJ meta': commands.cursorCharLeft,
    'KeyL meta': commands.cursorCharRight,
    'KeyJ meta+shift': commands.selectCharLeft,
    'KeyL meta+shift': commands.selectCharRight,
    'KeyJ alt+shift': commands.selectGroupLeft,
    'KeyL alt+shift': commands.selectGroupRight,

    // Deleting. deleteLine survives into input mode, where it empties the field —
    // which is a chord for "clear this box" and reads as one.
    'Equal alt': commands.deleteGroupForward,
    'Equal meta': commands.deleteCharForward,
    'Backspace ctrl': commands.deleteToLineStart,
    'Equal ctrl': commands.deleteToLineEnd,
    'Equal ctrl+meta': commands.deleteLine,

    // Everything else
    'KeyA alt': commands.selectAll,
    'Backquote alt': commands.undo,
    'Backquote shift': commands.redo,
    'KeyC alt': copySelection,
    'KeyV alt': pasteAtSelection,
    'KeyX alt': cutSelection
  };
}

// A markdown document: blocks to move between, fences to move inside, lines to
// move and open and indent. This is the layout every consumer had before there
// were modes, unchanged.
export function documentBindings(commands) {
  return Object.assign(sharedBindings(commands), {
    // The option four move by form inside a ```clojure block and by word or line
    // everywhere else; ctrl+j and ctrl+l move by markdown "sentence", which is
    // the line when the one above ended in two spaces and the block otherwise.
    'KeyI meta': commands.cursorLineUp,
    'KeyK meta': commands.cursorLineDown,
    'KeyJ alt': sexpAware(backwardSexp, commands.cursorGroupLeft),
    'KeyL alt': sexpAware(forwardSexp, commands.cursorGroupRight),
    'KeyI alt': sexpAware(forwardUpSexp, commands.cursorLineUp),
    'KeyK alt': sexpAware(forwardDownSexp, commands.cursorLineDown),
    'KeyJ ctrl': motion(sentenceStart),
    'KeyL ctrl': motion(sentenceEnd),

    // The same, selecting
    'KeyI meta+shift': commands.selectLineUp,
    'KeyK meta+shift': commands.selectLineDown,
    'KeyI alt+shift': commands.selectLineUp,
    'KeyK alt+shift': commands.selectLineDown,
    'KeyJ ctrl+shift': selectTo(sentenceStart),
    'KeyL ctrl+shift': selectTo(sentenceEnd),

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
    'Semicolon ctrl+meta': centerLine
  });
}

// One line: a title, a search box, a URL. Pair it with singleLine() from
// single-line.js, which is what stops the document becoming two lines behind the
// layout's back.
//
// Three differences from document mode, and no fourth:
//
//   the option pair    word motion, plainly. Not fence-aware — there is no
//                      fenced block in a one-line field, so asking is a document
//                      scan on every keypress to answer no.
//   ctrl+j / ctrl+l    line start and end. In one line the sentence motions
//                      *already* degenerate to exactly this — no newlines means
//                      the whole text is one block — so this is not a second
//                      meaning for the chord, it is the same destination reached
//                      without dragging markdown's definition of a block into a
//                      field that has none.
//   the vertical keys  swallowed. See DEAD_IN_ONE_LINE.
//
// Everything to do with a second line is simply absent: no new line above or
// below, no moving or indenting one, no paging, no scrolling or centring a
// viewport that is one line tall.
export function inputBindings(commands) {
  const table = Object.assign(sharedBindings(commands), {
    'KeyJ alt': commands.cursorGroupLeft,
    'KeyL alt': commands.cursorGroupRight,
    'KeyJ ctrl': commands.cursorLineStart,
    'KeyL ctrl': commands.cursorLineEnd,
    'KeyJ ctrl+shift': commands.selectLineStart,
    'KeyL ctrl+shift': commands.selectLineEnd
  });
  for (const dead of DEAD_IN_ONE_LINE) table[dead] = swallow;
  return table;
}

// The layout, as chord string -> CodeMirror command. Modifiers are spelled in the
// order chord() produces them — alt, ctrl, meta, shift — and a key in any other
// order can never fire, which is why a test checks it.
//
//   bindings(commands)                    the markdown document layout
//   bindings(commands, {mode: 'input'})   the one-line layout
export function bindings(commands, options) {
  const mode = (options && options.mode) || DOCUMENT;
  if (mode === INPUT) return inputBindings(commands);
  if (mode === DOCUMENT) return documentBindings(commands);
  // Loudly. A typo'd mode that quietly fell back to the document layout would
  // put line motions and fence scanning in a search box and look almost right.
  throw new Error(`unknown editor mode ${JSON.stringify(mode)} — ` +
                  `expected ${JSON.stringify(DOCUMENT)} or ${JSON.stringify(INPUT)}`);
}

// Capture phase on the editor element, rather than a CodeMirror keymap
// extension, so these win before CodeMirror's own keymaps see the event —
// which is also how tracker's codemirror.cljs has always done it.
//
//   install(view, commands)                    the document layout
//   install(view, commands, {mode: 'input'})   the one-line layout
//   install(view, commands, {table})           a caller's own table
//
// Note what install does *not* touch: Enter, Escape, Tab, the arrows. They are in
// neither table, so they are not preventDefaulted and not stopped, and they reach
// whatever the app has on the field — which for tracker's search boxes is "add
// this item", "clear the filter", and walking the result list. A single-line
// editor that swallowed Enter would be useless in a form.
//
// Returns a function that takes the bindings back off again.
export function install(view, commands, options) {
  options = options || {};
  const table = options.table || bindings(commands, options);
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
