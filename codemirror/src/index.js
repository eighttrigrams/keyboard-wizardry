// The package surface.
//
//   install(view, commands, opts)   put a layout on a mounted EditorView
//   uninstall = install(...)        take it back off
//   bindings(commands, opts)        the layout itself, to read or extend
//   DOCUMENT / INPUT               the two modes, spelled rather than typed
//   chord(event)                   a keydown event as a chord string, e.g. "KeyJ alt"
//   motion(fn)                     a pure (text, pos) -> pos as a CodeMirror command
//   selectTo(fn)                   the same, but selecting rather than moving
//   sentenceStart/sentenceEnd      the markdown "sentence" motions themselves
//   singleLine(cm)                 extensions making a document that stays one line
//   oneLine(text)                  that same flattening, for a doc before it exists
//   fromTextarea(ta, cm)           replace a form's <textarea> with an editor on it
//   fromTextareas(root, cm)        the same for every marked textarea under root
//
// Two modes, because a title field is not a markdown document. `install(view,
// commands)` is the document layout, as it always was; `install(view, commands,
// {mode: 'input'})` is the one-line one. Pair the latter with `singleLine(cm)` —
// the layout says what the keys do, singleLine says what the document may be, and
// a field wants both.
//
// The pure functions are exported alongside the bindings on purpose: they are
// the part worth testing, and the part a future scheme (structured LISP
// editing) will grow beside, in its own module.

export {install, bindings, documentBindings, inputBindings,
        chord, motion, selectTo, sexpAware, swallow,
        DOCUMENT, INPUT} from './bindings.js';
export {singleLine, noNewlines, oneLine} from './single-line.js';
export {fenceAt, clojureFenceAt} from './fences.js';
export {forwardSexp, backwardSexp, forwardDownSexp, forwardUpSexp,
        backwardUpSexp, backwardDownSexp} from './sexp.js';
export {sentenceStart, sentenceEnd} from './motions.js';
export {fromTextarea, fromTextareas} from './textarea.js';
