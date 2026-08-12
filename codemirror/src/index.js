// The package surface.
//
//   install(view, commands[, table])
//                             put the bindings on a mounted EditorView. Without
//                             a table it installs markdownBindings.
//   uninstall = install(...)  take them back off
//   markdownBindings(cmds)    the eight motions — README's "Markdown editing"
//   editingBindings(cmds)     the whole of "Normal editing", 47 chords, which is
//                             what tracker uses. Differs on ctrl+j / ctrl+l.
//   chord(event)              a keydown event as a chord string, e.g. "KeyJ alt"
//   motion(fn)                a pure (text, pos) -> pos as a CodeMirror command
//   sentenceStart/sentenceEnd the markdown "sentence" motions themselves
//   fromTextarea(ta, cm)      replace a form's <textarea> with an editor on it
//   fromTextareas(root, cm)   the same for every marked textarea under root
//
// The pure functions are exported alongside the bindings on purpose: they are
// the part worth testing, and the part a future scheme (structured LISP
// editing) will grow beside, in its own module.

export {install, markdownBindings, chord, motion} from './bindings.js';
export {editingBindings} from './editing.js';
export {sentenceStart, sentenceEnd} from './motions.js';
export {fromTextarea, fromTextareas} from './textarea.js';
