// The package surface.
//
//   install(view, commands, opts)   put a layout on a mounted EditorView
//   uninstall = install(...)        take it back off
//   bindings(commands, opts)        the layout itself, to read or extend
//   MARKDOWN / TEXT / SHELL / INPUT the modes, spelled rather than typed
//   chord(event)                   a keydown event as a chord string, e.g. "KeyJ alt"
//   motion(fn)                     a pure (text, pos) -> pos as a CodeMirror command
//   selectTo(fn)                   the same, but selecting rather than moving
//   sentenceStart/sentenceEnd      the markdown "sentence" motions themselves
//   lineStartOrPrevEnd/...NextStart  the line motions text and shell mode use
//   singleLine(cm)                 extensions making a document that stays one line
//   oneLine(text)                  that same flattening, for a doc before it exists
//   fromTextarea(ta, cm)           replace a form's <textarea> with an editor on it
//   fromTextareas(root, cm)        the same for every marked textarea under root
//
// Four modes, because a title field is not a markdown document and neither is a
// shell script. `install(view, commands)` is the markdown layout, as it always
// was — every caller that passes no mode is untouched by modes existing — and
// `{mode: 'text'}`, `{mode: 'shell'}` and `{mode: 'input'}` are the other three.
// Pair the last with `singleLine(cm)`: the layout says what the keys do,
// singleLine says what the document may be, and a field wants both.
//
// `DOCUMENT` is 'markdown' under the name it had when it was the only one, kept
// working because it is exported and blog re-exports the whole surface on
// `window.IJKL`.
//
// The pure functions are exported alongside the bindings on purpose: they are
// the part worth testing, and the part a future scheme (structured LISP
// editing) will grow beside, in its own module.

export {install, bindings,
        markdownBindings, textBindings, shellBindings, inputBindings,
        documentBindings,
        chord, motion, selectTo, sexpAware, inShellFence, swallow,
        MARKDOWN, TEXT, SHELL, INPUT, DOCUMENT} from './bindings.js';
export {singleLine, noNewlines, oneLine} from './single-line.js';
export {fenceAt, clojureFenceAt, shellFenceAt} from './fences.js';
export {forwardSexp, backwardSexp, forwardDownSexp, forwardUpSexp,
        backwardUpSexp, backwardDownSexp} from './sexp.js';
export {sentenceStart, sentenceEnd,
        lineStartOrPrevEnd, lineEndOrNextStart} from './motions.js';
export {fromTextarea, fromTextareas} from './textarea.js';
