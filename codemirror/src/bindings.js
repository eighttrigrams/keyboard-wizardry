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
    'KeyJ alt': commands.cursorGroupLeft,
    'KeyL alt': commands.cursorGroupRight,
    'KeyJ ctrl': motion(sentenceStart),
    'KeyL ctrl': motion(sentenceEnd)
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
