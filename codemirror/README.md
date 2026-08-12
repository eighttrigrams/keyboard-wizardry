# CodeMirror

The scheme as CodeMirror 6 bindings, so the web apps share one implementation of
it instead of a copy each. A sibling of `vscode/` and `obsidian/`: same scheme,
another editor.

It covers two sections of the top-level README, as two named sets:

- **`markdownBindings`** — the eight chords of *Markdown editing*, and the two
  sentence motions they move by. What blog uses.
- **`editingBindings`** — the whole of *Normal editing*: 47 chords, including the
  selection variants, the delete and line operations, page and document
  navigation, viewport centring, and a hand-rolled clipboard. What tracker uses.

The two disagree about exactly one thing, and deliberately: **ctrl+j / ctrl+l**
are the markdown sentence motions in the first and line start / line end in the
second. That is what the two apps already did, and a binding is somebody's muscle
memory, so it is not a thing to unify while tidying code. A test asserts the
disagreement so it cannot be closed by accident.

Structured LISP editing is not implemented yet; when it is, it belongs beside
`src/motions.js` as its own module of pure functions.

## What it gives you

```js
import {install, markdownBindings, editingBindings,
        fromTextarea, fromTextareas} from '@eighttrigrams/kw-codemirror';

install(view, commands);                              // the eight motions
install(view, commands, editingBindings(commands));   // the whole scheme
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

Three apps in `~/Workspace/plurama.eighttrigrams`, in two different ways, because
`plurama/Dockerfile` builds with that workspace as its context and **this library
is outside it** — Docker cannot copy in what is not in the context.

- **blog** — a `file:` dependency of `blog/scripts/zen-editor`, which bundles it
  together with CodeMirror into the one vendored file blog commits. blog runs no
  npm in the image at all, so that file is what ships.
- **personalist**, **tracker** — these *do* `npm install` inside the image, from
  their lockfiles, so each carries the library **packed** (`npm pack`) in its own
  `vendor/`, depended on as `file:vendor/...tgz`.

Do not maintain those copies by hand. From the workspace root:

```bash
make editor-vendor    # re-pack, rebuild blog's bundle, refresh the lockfiles
make editor-check     # verify every committed copy matches this source
```

`make deploy` runs the check through plurama's preflight, so a stale copy cannot
ship. The `file:` path in blog's bundler assumes this checkout and
`plurama.eighttrigrams` sit side by side under `~/Workspace`.

**Bump `version` in package.json whenever the source changes.** npm keys a
`file:` dependency by its path, so at an unchanged version it reuses the entry it
already has and each consumer's lockfile keeps the *old* hash — which then fails
the install inside the image. Changing the version changes the tarball's
filename, which is the one thing npm cannot ignore. `make editor-vendor` refuses
to re-pack over a same-version tarball whose contents differ, and says so.
