// The package surface.
//
//   install(view, commands)   put the layout on a mounted EditorView
//   uninstall = install(...)  take it back off
//   bindings(commands)        the layout: one table, 47 chords, every app
//   chord(event)              a keydown event as a chord string, e.g. "KeyJ alt"
//   motion(fn)                a pure (text, pos) -> pos as a CodeMirror command
//   selectTo(fn)              the same, but selecting rather than moving
//   sentenceStart/sentenceEnd the markdown "sentence" motions themselves
//   fromTextarea(ta, cm)      replace a form's <textarea> with an editor on it
//   fromTextareas(root, cm)   the same for every marked textarea under root
//
// The pure functions are exported alongside the bindings on purpose: they are
// the part worth testing, and the part a future scheme (structured LISP
// editing) will grow beside, in its own module.

export {install, bindings, chord, motion, selectTo, sexpAware} from './bindings.js';
export {fenceAt, clojureFenceAt} from './fences.js';
export {forwardSexp, backwardSexp, forwardDownSexp, forwardUpSexp,
        backwardUpSexp, backwardDownSexp} from './sexp.js';
export {sentenceStart, sentenceEnd} from './motions.js';
export {fromTextarea, fromTextareas} from './textarea.js';
