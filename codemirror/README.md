# CodeMirror

The scheme as CodeMirror 6 bindings, so the web apps share one implementation of
it instead of a copy each. A sibling of `vscode/` and `obsidian/`: same scheme,
another editor.

**One layout, for every app** — `bindings(commands)`. It covers the *Normal
editing* section of the top-level README together with the *Markdown editing*
one: the motions and their selecting variants, the delete and line operations,
page and document navigation, viewport centring, and a hand-rolled clipboard.
47 chords on a markdown document; 31 on a one-line field. See *Two modes*.

It was two sets for a while, because tracker had `ctrl+j` / `ctrl+l` as line start
and end while blog had them as the markdown sentence motions. That turned out to
be tracker's own invention — the top-level README defines those two chords *only*
in its Markdown editing section — so the sets were unified onto the documented
behaviour, and `ctrl+shift+j` / `ctrl+shift+l` select by sentence to match. Where
the two disagreed, the newer behaviour won.

(tracker still shows a plain textarea to users who have not turned vim keys on.
That path does not use this library at all, which is why it is not a second
layout. rhizome and treina had tables of their own, word for word the same 47
chords; they were deleted rather than merged, since there was nothing in them
this does not do.)

## Two modes

One layout on two shapes of document, which is not the same thing as two layouts:

```js
install(view, commands)                    // 'document' — the default, 47 chords
install(view, commands, {mode: 'input'})   // 'input'    — one line, 31 chords
```

`'document'` is what every consumer had before modes existed, unchanged. `'input'`
is for a title field or a search box, and what it drops it drops because *the
document is not there* — never because a chord was reconsidered. No second line,
so no line motions and nothing to open or move or indent one; no blocks, so no
sentence motions; no fences, so no structural editing. Everything that is left is
the same command in both modes, by identity — `sharedBindings` in bindings.js is
literally the same object, and a test asserts that input mode introduces no chord
document mode does not have.

Three differences, and no fourth:

| | document | input |
|---|---|---|
| `option+j` / `option+l` | word, or form inside a Clojure fence | word, plainly |
| `ctrl+j` / `ctrl+l` | markdown sentence start / end | line start / end |
| `cmd+i` `cmd+k` `option+i` `option+k` | up and down | swallowed |

`ctrl+j` and `ctrl+l` are not a second meaning for those chords. In one line the
sentence motions *already* degenerate to line start and end — no newlines means
the whole text is one block — so this is the same destination, reached without
dragging markdown's definition of a block into a field that has none.

The four vertical keys are **swallowed**, not left unbound, which is a choice
worth knowing about. Bound to a no-op, `install` still preventDefaults them, so
the app underneath never sees them; the chord is dead everywhere and no app can
quietly give `cmd+k` a second meaning in a field where the scheme has none. It
costs something real: tracker binds `option+i` globally to "go to Issues", and in
a field this swallows it. `DEAD_IN_ONE_LINE` in bindings.js is the one place to
change if that trade ever wants reversing.

What input mode does **not** touch: Enter, Escape, Tab and the arrows are in
neither table, so they are neither preventDefaulted nor stopped, and they reach
whatever the app has on the field. A single-line editor that swallowed Enter
would be useless in a form.

### The document has to be one line too

The layout says what the keys do; it cannot stop a pasted newline turning the
field into two lines with half the text hidden. That is `singleLine`:

```js
install(view, commands, {mode: 'input'});
extensions: [...singleLine(cm)]     // pair them; a field wants both
```

Newlines are **flattened, not refused**. Refusing was the first version and it is
worse than it sounds: the common way a newline reaches a single-line field is a
paste, and a rejected transaction means the paste silently does nothing at all —
every character the user wanted dropped because of the one they did not. A break
becomes a space, the whitespace that sat against it goes with it, and a break at
either end disappears rather than becoming a space (copying a line selects its
trailing newline, so almost every real paste ends in one).

The filter only ever sees transactions, so a state *created* with newlines in its
doc is two lines and nothing was asked about it. `oneLine(text)` is that same
flattening, exported for sanitising a document before it exists.

## Structural editing, inside a fenced block

Of *Structured LISP editing*, the four motions — and only inside a fenced
`clojure`, `clj`, `cljs`, `cljc` or `edn` block in the document. There the four
option keys move by form; anywhere else in the prose they are the word and line
motions they always were, and there is nothing to turn on:

| key | inside a Clojure fence | everywhere else |
|---|---|---|
| `option+l` | over the next form | word forward |
| `option+j` | back over a form | word backward |
| `option+k` | into the next list | line down |
| `option+i` | out of this list, rightwards | line up |

The senses and names are Calva's — `forwardSexp`, `backwardSexp`,
`forwardDownSexp`, `forwardUpSexp` — because that is what the VSCode keymap in
this repo binds, and it is the same hands. Calva's *code* is not here: its paredit
runs on an `EditableDocument` through a `LispTokenCursor` and a lexer, which is a
lot of machinery to transplant for four motions, and it knows nothing about being
confined to part of a markdown document.

What stands in for it, in `src/sexp.js`, is one pass that marks every character as
code, string, comment or character literal; the motions then look only at code. So
a `;` inside a string is not a comment, a paren inside a string is not a
delimiter, and `\(` is neither. Movement never leaves the block.

`backwardUpSexp` and `backwardDownSexp` are implemented and exported but not
bound to anything — one line each in the tables when they are wanted. Nothing
that *edits* structure (slurp, barf, drag, kill) is here yet.

## What it gives you

```js
import {install, bindings, singleLine, oneLine,
        fromTextarea, fromTextareas} from '@eighttrigrams/kw-codemirror';

install(view, commands);            // the layout, onto a view you already made
install(view, commands, {mode});    // ...in 'document' (default) or 'input'
bindings(commands, {mode});         // the table itself, to read or extend
singleLine(cm);                     // extensions: a doc that stays one line
oneLine(text);                      // that flattening, for a doc before it exists
fromTextarea(textarea, cm);         // an editor onto a form field
fromTextareas(document, cm);        // ...onto every textarea[data-editor]
```

An unknown mode throws rather than falling back to the document layout — falling
back would put line motions and fence scanning in a search box and look very
nearly right.

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

Six apps around `~/Workspace/plurama.eighttrigrams`, in two different ways,
because `plurama/Dockerfile` builds with that workspace as its context and **this
library is outside it** — Docker cannot copy in what is not in the context.

- **blog** — a `file:` dependency of `blog/scripts/zen-editor`, which bundles it
  together with CodeMirror into the one vendored file blog commits. blog runs no
  npm in the image at all, so that file is what ships.
- **personalist**, **tracker**, **treina**, **music**, **rhizome** — these *do*
  `npm install` inside an image, from their lockfiles, so each carries the library
  **packed** (`npm pack`) in its own `vendor/`, depended on as `file:vendor/...tgz`.

Of those, tracker and rhizome show it only to users who asked for the keyboard
scheme, in different ways: tracker keeps a plain textarea for everyone who has not
turned vim keys on, and rhizome has no toggle at all — its editor *is* this one.
music was a pair of plain textareas until it wasn't; treina, like rhizome, has no
other mode.

rhizome is a git repo of its own and ships an uberjar rather than an image, so
`make deploy` in the workspace never touches it. It is vendored and checked with
the others anyway, so the copies cannot drift apart, and its dev box carries the
tarball through `rhizome/docker/.build-stage`.

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
