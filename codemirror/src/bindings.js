// The IJKL scheme, as CodeMirror 6 bindings.
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

// A sentence motion as a CodeMirror command: the pure function decides, this
// only moves the caret there.
export function motion(fn) {
  return function (view) {
    const target = fn(view.state.doc.toString(), view.state.selection.main.head);
    view.dispatch({selection: {anchor: target, head: target}, scrollIntoView: true});
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

// The table, as chord string -> CodeMirror command. Eight bindings, the
// "Markdown editing" section of the README and nothing else. For the whole of
// "Normal editing" — 47 chords, what tracker uses — see editingBindings in
// editing.js. The two differ on ctrl+j / ctrl+l: sentence motions here, line
// start and end there.
export function markdownBindings(commands) {
  return {
    'KeyI meta': commands.cursorLineUp,
    'KeyK meta': commands.cursorLineDown,
    'KeyJ meta': commands.cursorCharLeft,
    'KeyL meta': commands.cursorCharRight,
    'KeyJ alt': sexpAware(backwardSexp, commands.cursorGroupLeft),
    'KeyL alt': sexpAware(forwardSexp, commands.cursorGroupRight),
    'KeyJ ctrl': motion(sentenceStart),
    'KeyL ctrl': motion(sentenceEnd),

    // Nine and ten, where there were eight. option+i and option+k were not in
    // this set at all, and inside a ```clojure block they are the two motions
    // that have no wordwise equivalent to borrow — into a form, and out of it.
    // Outside a block they do what they do in the editing set, line up and down,
    // so they are not chords that swallow a key and do nothing.
    'KeyI alt': sexpAware(forwardUpSexp, commands.cursorLineUp),
    'KeyK alt': sexpAware(forwardDownSexp, commands.cursorLineDown)
  };
}

// Capture phase on the editor element, rather than a CodeMirror keymap
// extension, so these win before CodeMirror's own keymaps see the event —
// which is also how tracker's codemirror.cljs has always done it.
//
// `table` chooses the set: markdownBindings by default, editingBindings for the
// full scheme, or any chord -> command map of your own.
//
// Returns a function that takes the bindings back off again.
export function install(view, commands, table) {
  table = table || markdownBindings(commands);
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
