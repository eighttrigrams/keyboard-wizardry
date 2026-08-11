// The package surface.
//
//   install(view, commands)   put the bindings on a mounted EditorView
//   uninstall = install(...)  take them back off
//   bindings(commands)        the chord -> command table, to read or extend
//   chord(event)              a keydown event as a chord string, e.g. "KeyJ alt"
//   motion(fn)                a pure (text, pos) -> pos as a CodeMirror command
//   sentenceStart/sentenceEnd the markdown "sentence" motions themselves
//   fromTextarea(ta, cm)      replace a form's <textarea> with an editor on it
//   fromTextareas(root, cm)   the same for every marked textarea under root
//
// The pure functions are exported alongside the bindings on purpose: they are
// the part worth testing, and the part a future scheme (structured LISP
// editing) will grow beside, in its own module.

export {install, bindings, chord, motion} from './bindings.js';
export {sentenceStart, sentenceEnd} from './motions.js';
export {fromTextarea, fromTextareas} from './textarea.js';
