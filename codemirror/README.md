# CodeMirror

The scheme as CodeMirror 6 bindings, so the web apps share one implementation of
it instead of a copy each. A sibling of `vscode/` and `obsidian/`: same scheme,
another editor.

Right now it covers the **Markdown editing** section of the top-level README —
the eight chords — and the two motions they move by. Structured LISP editing is
not implemented yet; when it is, it belongs beside `src/motions.js` as its own
module of pure functions.

## What it gives you

```js
import {install, fromTextarea, fromTextareas} from '@eighttrigrams/kw-codemirror';

install(view, commands);            // bindings onto a view you already made
fromTextarea(textarea, cm);         // an editor onto a form field
fromTextareas(document, cm);        // ...onto every textarea[data-editor]
```

`cm` is the CodeMirror namespace *you* have:
`{EditorState, EditorView, keymap, commands}`. Nothing here imports CodeMirror —
a library that imports its own copy is how a bundle ends up with two
`@codemirror/state` in it, which breaks in ways that are very hard to read. So
this package has no dependencies at all, and a ClojureScript project can hand it
shadow-cljs's copy as easily as a JS one hands it esbuild's.

`fromTextarea` keeps the textarea in the form, keeps its name, and mirrors the
document into its value on every change — so nothing about how a page submits has
to change. It hides the field by making it transparent rather than
`display: none`, because a `display: none` field carrying `required` makes Chrome
refuse to submit *and* refuse to focus what it is refusing about, which arrives
as a Submit button that silently does nothing.

## Developing it

```bash
npm test        # the motion arithmetic, in node, no browser
npm run dev     # http://127.0.0.1:8027 — two demo pages to look at
npm run e2e     # the bindings and the form, driven through a real browser
```

`npm run dev` serves `demo/`: the bindings on their own, with the chord that
fired and the hard breaks drawn, and a second page with the editor on a form's
textareas that prints what the form would submit. `npm run e2e` drives that same
page, so the demo is the fixture — a demo that rots gets caught by the tests.

Note that `esbuild --serve` stops when its stdin closes, so `npm run dev` wants a
terminal to sit in.

## Who uses it

**blog**, so far, at `plurama.eighttrigrams/blog` — as a `file:` dependency of
`blog/scripts/zen-editor`, which bundles it together with CodeMirror into the one
vendored file blog commits. Change anything in here and that bundle needs
rebuilding, on the host, where npm is reachable:

```bash
cd ~/Workspace/plurama.eighttrigrams/blog/scripts/zen-editor && npm install && npm run build
```

The `file:` path assumes this checkout and `plurama.eighttrigrams` sit side by
side under `~/Workspace`.

That arrangement is what lets a library outside the plurama workspace be used
inside it at all: `plurama/Dockerfile` builds with the workspace root as its
context, so anything outside cannot be copied in — but blog runs no npm in the
image, because its bundle is committed. tracker, treina, music and cookbook each
`npm install` from a lockfile *inside* the image, so wiring one of those to this
library needs a different answer first: vendor a bundle the way blog does,
publish to npm, or move this inside the workspace.
