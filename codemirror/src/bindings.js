// The IJKL scheme, as CodeMirror 6 bindings. One table per *mode*, and four
// modes.
//
// It used to be two tables — blog's eight motions and tracker's 47 — which
// disagreed about ctrl+j and ctrl+l: the markdown "sentence" motions in one, line
// start and end in the other. That was tracker's own invention and appears
// nowhere in the top-level README, whose only definition of those two chords is
// the markdown one. So they are the markdown motions now, and where the two sets
// disagreed the newer behaviour won.
//
// The tables here are not that argument coming back — that argument was about
// what a chord means in *one* kind of document. These are one layout on four
// kinds:
//
//   'markdown'  the default, and what every consumer had before modes existed: a
//               markdown document, with blocks to move between and Clojure
//               fences to move inside. 47 chords.
//   'text'      a text file. The same 47 chords; eight of them do something
//               simpler, because there are no blocks and no fences. ctrl+j and
//               ctrl+l are the ends of the *line* — and, pressed again from
//               there, the end of the line above and the start of the one below —
//               and the option four are the plain word and line motions that
//               markdown mode already falls back to everywhere outside a fence.
//   'shell'     a shell script — .sh, .conf, a dot-rc file, an ignore file.
//               Exactly 'text' today, and named all the same; see shellBindings
//               for why that is not ceremony.
//   'input'     one line, and only one — a title field, a search box. 31 chords.
//
// What a mode drops or changes, it drops or changes because *the document is not
// that shape*, never because a chord was reconsidered. There is no block in a
// text file, so there is nothing for a block motion to move between; there is no
// second line in a field, so there is nothing to move a line above or below.
//
// **Built in layers, so a chord is written once and every mode that has it gets
// the same one** — by identity, not by two tables that happen to agree today:
//
//   sharedBindings         any document at all. The char motions, deleting, the
//                          clipboard, undo, select-all. cmd+j means the same
//                          thing in a search box and in a thousand-line file.
//     multiLineBindings    ...once there is a second line: vertical motion, the
//                          line operations, paging, scrolling, centring. This
//                          *is* text mode, and the base the other two documents
//                          are written as differences from.
//       markdownBindings   ...+ blocks and fences: eight chords overridden. Two
//                          languages are understood inside a fence, and only two:
//                          Clojure, where the option four move by form, and
//                          shell-like, where the ctrl pair goes back to being the
//                          ends of the line.
//       shellBindings      ...+ nothing, yet.
//     inputBindings        ...when there is not: one line, and eight chords
//                          swallowed.
//
// Nothing here imports CodeMirror. The `@codemirror/commands` namespace is
// handed in instead, for one reason that matters in practice: a bundle with two
// copies of @codemirror/state in it breaks in ways that are very hard to read,
// and a library that imports its own copy is how you get there. The consumer
// already has CodeMirror — blog on `window.CM6.commands`, a shadow-cljs app on
// its own `["@codemirror/commands" :as commands]`. It passes that in.
//
// So this package has no dependencies. That is deliberate.

import {sentenceStart, sentenceEnd,
        lineStartOrPrevEnd, lineEndOrNextStart} from './motions.js';
import {clojureFenceAt, shellFenceAt} from './fences.js';
import {forwardSexp, backwardSexp, forwardDownSexp, forwardUpSexp} from './sexp.js';
import {copySelection, pasteAtSelection, cutSelection,
        newLineBelow, newLineAbove,
        scrollDown, scrollUp, cursorViewportUp, cursorViewportDown,
        centerCaret, centerLine} from './custom-commands.js';

export const MARKDOWN = 'markdown';
export const TEXT = 'text';
export const SHELL = 'shell';
export const INPUT = 'input';

// The name markdown mode went by when it was the only document mode there was,
// kept and kept working. It is exported, so a consumer may be spelling it out —
// and blog ships a *bundle* of this library that re-exports everything on
// `window.IJKL`, where an old page and a new bundle meet. `bindings` resolves it
// to the markdown layout, which is what it always was: markdown mode is not a
// new behaviour, it is the old one with a name that says which of four it is.
export const DOCUMENT = 'document';

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
// Needed because ctrl+j and ctrl+l are not line start and end in markdown mode —
// their shifted pair had been CodeMirror's selectLineStart/End, and leaving those
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
// The fallbacks handed in below are, deliberately, the very commands text mode
// binds those keys to. So "markdown mode outside a fence" and "text mode" are
// the same key doing the same thing, and not two spellings of nearly that.
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

// The ctrl pair, once markdown has a second language it understands inside a
// fence. Composed rather than wrapped: this returns a *pure* motion, still
// (text, pos) -> pos, so motion() and selectTo() put it on the keys exactly as
// they put the sentence motions there — and shift+ctrl+j goes on selecting as far
// as ctrl+j moves without a second decision being made anywhere.
//
// The fence's own bounds are handed on, so a line motion inside a block cannot
// step out onto the closing ``` — the same confinement the sexp motions have, and
// for the same reason: a chord that means "the neighbouring line" should not, at
// the edge, mean "leave the code".
export function inShellFence(shellward, proseward) {
  return function (text, pos) {
    const fence = shellFenceAt(text, pos);
    return fence ? shellward(text, pos, fence.from, fence.to) : proseward(text, pos);
  };
}

// **Built once, not once per table.** These need no `commands` namespace, so
// there is no reason for two builds of a mode to hold two closures that behave
// alike — and every reason not to: it is what lets text mode's ctrl+j and input
// mode's be the very same object, which is a claim a test can make by identity
// rather than by running both and comparing.
const lineBack = motion(lineStartOrPrevEnd);
const lineForward = motion(lineEndOrNextStart);
const selectLineBack = selectTo(lineStartOrPrevEnd);
const selectLineForward = selectTo(lineEndOrNextStart);

const proseBack = motion(inShellFence(lineStartOrPrevEnd, sentenceStart));
const proseForward = motion(inShellFence(lineEndOrNextStart, sentenceEnd));
const selectProseBack = selectTo(inShellFence(lineStartOrPrevEnd, sentenceStart));
const selectProseForward = selectTo(inShellFence(lineEndOrNextStart, sentenceEnd));

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
// a thousand, prose or a shell script. Every table here is built on this, so a
// change to one of these cannot land in one mode and miss the others.
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

// Everything that exists because there is a second line: somewhere to move up
// and down to, lines to open and move and indent, pages to turn, a viewport
// taller than the caret.
//
// This is the whole of text mode, and the base of markdown's and shell's. The
// motions here are the *plain* ones — word left and right, line up and down,
// the ends of the line — because those are what a document with no blocks and
// no fenced code in it can offer. A mode that has more says so by overriding,
// and what it overrides is exactly the list of things markdown knows and a text
// file does not.
function multiLineBindings(commands) {
  return Object.assign(sharedBindings(commands), {
    // Up and down, and the same selecting.
    'KeyI meta': commands.cursorLineUp,
    'KeyK meta': commands.cursorLineDown,
    'KeyI meta+shift': commands.selectLineUp,
    'KeyK meta+shift': commands.selectLineDown,
    'KeyI alt+shift': commands.selectLineUp,
    'KeyK alt+shift': commands.selectLineDown,

    // The option four, plainly: by word sideways, by line up and down. In
    // markdown these are the fence-aware ones and these commands are what they
    // fall back to.
    'KeyJ alt': commands.cursorGroupLeft,
    'KeyL alt': commands.cursorGroupRight,
    'KeyI alt': commands.cursorLineUp,
    'KeyK alt': commands.cursorLineDown,

    // The ends of the line. Markdown makes these the ends of the *block*; a
    // file with no blocks in it has the line, which is the same idea at the only
    // scale it has.
    //
    // Not CodeMirror's cursorLineStart/End, because those stop dead once the
    // caret is already at the end they name. These step on to the neighbouring
    // line instead — ctrl+j from the start of a line to the end of the one above,
    // ctrl+l from the end of a line to the start of the one below — so the second
    // press does something and the pair walks the file. See motions.js.
    'KeyJ ctrl': lineBack,
    'KeyL ctrl': lineForward,
    'KeyJ ctrl+shift': selectLineBack,
    'KeyL ctrl+shift': selectLineForward,

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

// A markdown document: blocks to move between, fences to move inside. The
// layout every consumer had before there were modes, and still the default.
//
// Eight chords, and no ninth. Everything else — up and down, the line
// operations, paging, the clipboard — is inherited and therefore identical, by
// identity, to what a text file gets.
export function markdownBindings(commands) {
  return Object.assign(multiLineBindings(commands), {
    // The option four move by form inside a ```clojure block and by word or line
    // everywhere else, which is exactly what they do in text mode.
    'KeyJ alt': sexpAware(backwardSexp, commands.cursorGroupLeft),
    'KeyL alt': sexpAware(forwardSexp, commands.cursorGroupRight),
    'KeyI alt': sexpAware(forwardUpSexp, commands.cursorLineUp),
    'KeyK alt': sexpAware(forwardDownSexp, commands.cursorLineDown),

    // ctrl+j and ctrl+l move by markdown "sentence" — the line when the one
    // above ended in two spaces, and the block otherwise — and their shifted
    // pair selects as far as they move.
    //
    // Except inside a shell-like fence, where they are the line motions a shell
    // script gets, confined to the block. Same idea as the option four one line
    // up: a fence is a document of another kind inside this one, and the chord
    // should mean there what it means in a file of that kind. The block motions
    // are actively wrong in a code block — no blank lines in it, so "the end of
    // this block" is the far side of the whole listing.
    'KeyJ ctrl': proseBack,
    'KeyL ctrl': proseForward,
    'KeyJ ctrl+shift': selectProseBack,
    'KeyL ctrl+shift': selectProseForward
  });
}

// The name this layout had when it was the only document layout there was. Kept
// as the same function and not as a copy, so nothing can drift between them.
export const documentBindings = markdownBindings;

// A text file: lines, and nothing above a line.
//
// It is the multi-line base with nothing added, and that is the point rather
// than a gap. `.txt` is the shape everything else here is described as a
// difference from: markdown is this plus blocks and fences, a shell script is
// this exactly, a one-line field is this minus the second line.
export function textBindings(commands) {
  return multiLineBindings(commands);
}

// A shell script, and today that is a text file — the spec says so, and it is
// true: `sh` has no block a motion could move between and no fenced language
// inside it.
//
// **Named anyway, rather than pointing .sh at 'text'.** Two reasons, and the
// second is the one that matters. It is honest: an editor asked what mode it is
// in should answer with what it is editing. And it is where the difference goes
// when there is one — structural motion over a `case`/`esac` or an `if`/`fi`,
// a word motion that does not stop inside `$FOO`, comment-aware anything. On
// that day this function grows a body and every consumer that already says
// 'shell' gets it; the alternative is finding every caller that said 'text' and
// deciding, one at a time, which of them meant a shell script.
export function shellBindings(commands) {
  return multiLineBindings(commands);
}

// One line: a title, a search box, a URL. Pair it with singleLine() from
// single-line.js, which is what stops the document becoming two lines behind the
// layout's back.
//
// Built on sharedBindings and not on the multi-line base, because what it wants
// is nearly none of that: everything to do with a second line is simply absent —
// no new line above or below, no moving or indenting one, no paging, no
// scrolling or centring a viewport that is one line tall. Written as an
// inheritance it would be a list of sixteen deletions, which is a worse way of
// saying the same thing and a much easier one to get wrong.
//
// Three differences from the multi-line modes, and no fourth:
//
//   the option pair    word motion, plainly — as in text mode, and for the same
//                      reason markdown mode would not: there is no fenced block
//                      in a one-line field, so asking is a document scan on
//                      every keypress to answer no.
//   ctrl+j / ctrl+l    line start and end. The same commands text mode binds —
//                      the same objects, not a second spelling — and in one line
//                      the step-to-the-neighbouring-line half of them can never
//                      fire, because there is no neighbouring line. In one line
//                      the markdown sentence motions *already* degenerate to
//                      exactly this destination, so this is not a second meaning
//                      for the chord; it is the same one reached without dragging
//                      markdown's definition of a block into a field that has
//                      none.
//   the vertical keys  swallowed. See DEAD_IN_ONE_LINE.
export function inputBindings(commands) {
  const table = Object.assign(sharedBindings(commands), {
    'KeyJ alt': commands.cursorGroupLeft,
    'KeyL alt': commands.cursorGroupRight,
    'KeyJ ctrl': lineBack,
    'KeyL ctrl': lineForward,
    'KeyJ ctrl+shift': selectLineBack,
    'KeyL ctrl+shift': selectLineForward
  });
  for (const dead of DEAD_IN_ONE_LINE) table[dead] = swallow;
  return table;
}

// Every mode, and the table each one builds. 'document' is in here as the old
// name of 'markdown' and resolves to the same function.
const LAYOUTS = {
  [MARKDOWN]: markdownBindings,
  [TEXT]: textBindings,
  [SHELL]: shellBindings,
  [INPUT]: inputBindings,
  [DOCUMENT]: markdownBindings
};

// The layout, as chord string -> CodeMirror command. Modifiers are spelled in the
// order chord() produces them — alt, ctrl, meta, shift — and a key in any other
// order can never fire, which is why a test checks it.
//
//   bindings(commands)                       the markdown layout
//   bindings(commands, {mode: 'text'})       a text file
//   bindings(commands, {mode: 'shell'})      a shell script
//   bindings(commands, {mode: 'input'})      a one-line field
//
// **Markdown is the default, and that is not only history.** It is what every
// caller that passes no mode has always got, so modes arriving cannot change any
// of them; and it is the most forgiving of the four to be wrong about, since it
// is the only one that adds behaviour rather than removing it — markdown in a
// text file costs a fence scan that finds nothing, where text in a markdown file
// silently loses the block motions.
export function bindings(commands, options) {
  const mode = (options && options.mode) || MARKDOWN;
  const layout = LAYOUTS[mode];
  // Loudly. A typo'd mode that quietly fell back to the markdown layout would
  // put block motions and fence scanning in a search box and look almost right.
  if (!layout) {
    throw new Error(`unknown editor mode ${JSON.stringify(mode)} — expected one of ` +
                    [MARKDOWN, TEXT, SHELL, INPUT].map(m => JSON.stringify(m)).join(', '));
  }
  return layout(commands);
}

// Capture phase on the editor element, rather than a CodeMirror keymap
// extension, so these win before CodeMirror's own keymaps see the event —
// which is also how tracker's codemirror.cljs has always done it.
//
//   install(view, commands)                    the markdown layout
//   install(view, commands, {mode: 'text'})    ...or any other mode
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
