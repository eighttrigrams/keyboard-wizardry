# CodeMirror

The scheme as CodeMirror 6 bindings, so the web apps share one implementation of
it instead of a copy each. A sibling of `vscode/` and `obsidian/`: same scheme,
another editor.

**One layout, for every app** — `bindings(commands)`. It covers the *Normal
editing* section of the top-level README together with the *Markdown editing*
one: the motions and their selecting variants, the delete and line operations,
page and document navigation, viewport centring, and a hand-rolled clipboard.
47 chords on a markdown document, the same 47 on a text file, a shell script or
a Clojure source file, 31 on a one-line field. See *Five modes*.

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

## Five modes

One layout on five shapes of document, which is not the same thing as five
layouts:

```js
install(view, commands)                     // 'markdown' — the default, 47 chords
install(view, commands, {mode: 'text'})     // 'text'     — a .txt, the same 47
install(view, commands, {mode: 'shell'})    // 'shell'    — a .sh, today == text
install(view, commands, {mode: 'clojure'})  // 'clojure'  — a .clj, the same 47
install(view, commands, {mode: 'input'})    // 'input'    — one line, 31 chords
```

`'markdown'` is what every consumer had before modes existed, unchanged, and
`'document'` is still accepted as the name it went by then. What any other mode
drops or changes, it drops or changes because *the document is not that shape* —
never because a chord was reconsidered. There is no block in a `.txt`, so there
is nothing for a block motion to move between; no second line in a field, so
nothing to open or move or indent one.

| | markdown | text | shell | clojure | input |
|---|---|---|---|---|---|
| `option+j` / `option+l` | word, or form inside a Clojure fence | word, plainly | word, plainly | form, always | word, plainly |
| `option+i` / `option+k` | line, or in and out of a form | line | line | in and out of a form | swallowed |
| `ctrl+j` / `ctrl+l` | block start / end, or the line inside a shell-like fence | line start / end, then the neighbouring line | the same | block start / end — which here is the top-level form | line start / end, with no neighbouring line to reach |
| `cmd+i` / `cmd+k` | up and down | up and down | up and down | up and down | swallowed |
| lines, paging, scrolling | ✓ | ✓ | ✓ | ✓ | — |

Eight chords separate markdown from text, and the other thirty-nine are the same
command in both — by identity, and a test says so chord by chord. `ctrl+j` and
`ctrl+l` are not a second meaning: markdown's block start and end already *are*
line start and end in a document whose blocks are one line, so a text file gets
the same destination without dragging markdown's definition of a block into a
file that has none. Input mode reaches it a third time, for the same reason and
holding the very same two functions.

**Pressed again, they step to the neighbouring line.** `ctrl+j` from the start of
a line goes to the *end* of the one above — leftwards, which is where it was
already heading — and `ctrl+l` from the end of a line to the start of the one
below. CodeMirror's own `cursorLineStart` stops dead there, which makes the
second press a no-op at exactly the place it is most natural to press: your hand
is on the key because you just used it. So text and shell mode bind the
library's own motions instead (`lineStartOrPrevEnd`, `lineEndOrNextStart`), and
their shifted pair is the same motion handed to `selectTo` — one definition, so
`shift+ctrl+j` cannot select somewhere `ctrl+j` never goes.

### Two languages inside a fence, and no third

A fenced block is a document of another kind inside this one, and a chord should
mean there what it means in a file of that kind. Markdown mode knows two:

| fence | what changes | why |
|---|---|---|
| ```` ```clojure ```` (also `clj`, `cljs`, `cljc`, `edn`) | `option+j/l/i/k` move by form | there is reader syntax to move over |
| ```` ```sh ```` (also `bash`, `zsh`, `ksh`, `fish`, `shell`, `console`, `conf`, `env`, `gitignore`, `dockerignore`) | `ctrl+j` / `ctrl+l` are the ends of the *line* | a code block has no blank line in it, so "the end of this block" is the far side of the whole listing |

Everything else — ```` ```js ````, ```` ```python ````, an unlabelled fence —
keeps the prose bindings. That is the safe direction to be wrong in: block
motions in a code block are a nuisance for one keypress, where line motions in
prose would quietly lose the one thing markdown mode is for.

Both are **confined to the block**, so neither can step out onto the closing
fence: `ctrl+j` at the top line of a `sh` block stays there rather than landing
in the prose above it.

**The modes are written as differences, not as five tables.** `sharedBindings` is
everything true of any document at all; `multiLineBindings` adds what a second
line makes possible and *is* text mode entire; markdown is that plus eight
overrides, and shell is that plus nothing:

```
sharedBindings          char motions, deleting, clipboard, undo
  multiLineBindings     up and down, line ops, paging, scrolling  ← text
    markdownBindings    + blocks and fences
    shellBindings       + nothing, yet
    clojureBindings     + the same eight, the fence question answered
  inputBindings         one line, eight chords swallowed
```

So a chord is written once and every mode that has it holds the very same
function. It also means markdown's fence-aware four fall back, outside a fence,
to exactly the commands text mode binds — the two are not two behaviours that
resemble each other, in prose they are one.

### Why `'shell'` exists when it is `'text'`

A shell script — `.sh` and its family, `.conf` and `.conf.template`, a dot-rc
file, `.gitignore` — has no block a motion could move between and no fenced
language inside it, so today the two tables are identical and a test asserts it. It is
named all the same, for the reason that matters: it is where the difference goes
when there is one — structural motion over an `if`/`fi`, a word motion that does
not stop inside `$FOO`. On that day `shellBindings` grows a body and every
consumer that already says `'shell'` gets it. The alternative is finding every
caller that said `'text'` and deciding, one at a time, which of them meant a
shell script.

### `'clojure'`: the file is the fence

A `.clj`, `.cljs`, `.cljc` or `.edn`. It overrides the **same eight chords**
markdown does, and to the same things — because markdown mode already knows how
to edit Clojure, it just has to find a ```` ```clojure ```` block first. Here
there is nothing to find: the file is the block. So this is not a fifth
behaviour to learn, it is the behaviour the same hands already get inside a code
block in a README, on a document that happens to be all code.

Both halves follow from the one fact, that the document *is* Clojure:

- **the option four** move by form, over the whole file. In markdown they are
  `sexpAware()` — ask for the fence, move by form inside it, fall back to word
  and line outside. There is no outside here, so the ask is gone and the bounds
  are `0..length`. A test walks every offset of a Clojure body and asserts that
  the file and the same text inside a fence land in the same place, chord for
  chord.
- **the ctrl pair** is the *block*, which in Clojure is the top-level form.
  Markdown's is shell-fence-aware and a `.clj` has no fence, so what is left is
  the block motion itself — and that works out because a Clojure file is written
  with a blank line between top-level forms, which is exactly what `motions.js`
  calls a block boundary.

So the line motions move one modifier over: `cmd+j` / `cmd+l` are still the
character, `option+j` / `option+l` are now the form. The one thing to be told is
that `ctrl+j` is no longer the start of the *line* — coming from a `.txt` that is
the difference you feel.

Two known softnesses, both harmless. A Clojure line ending in two spaces reads as
markdown's hard break, so `ctrl+l` goes to the next line rather than past the
form — trailing whitespace, in other words. And two top-level forms with no blank
line between them are one block, which is the honest reading of a file laid out
that way: the motion is told where the blank lines are and nothing else.

Nothing that *edits* structure is bound. `option+jkli` move; slurp, barf, drag
and kill are not here, in a `.clj` any more than in a fence.

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

## Structural editing, in a fenced block or a whole file

Of *Structured LISP editing*, the four motions. In markdown mode they apply
inside a fenced `clojure`, `clj`, `cljs`, `cljc` or `edn` block and nowhere else;
anywhere else in the prose the four option keys are the word and line motions
they always were, and there is nothing to turn on. In `'clojure'` mode they apply
to the whole document, which is the same four functions with the file for
bounds — see *`'clojure'`: the file is the fence*.

| key | inside a Clojure fence, or in a .clj | everywhere else |
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
delimiter, and `\(` is neither. Movement never leaves the block — and in a
`.clj`, where the block is the file, that is the same rule with nothing to bump
into.

`backwardUpSexp` and `backwardDownSexp` are implemented and exported but not
bound to anything — one line each in the tables when they are wanted. Nothing
that *edits* structure (slurp, barf, drag, kill) is here yet.

## What it gives you

```js
import {install, bindings, singleLine, oneLine,
        fromTextarea, fromTextareas} from '@eighttrigrams/kw-codemirror';

install(view, commands);            // the layout, onto a view you already made
install(view, commands, {mode});    // ...in 'markdown' (default), 'text',
                                    //    'shell', 'clojure' or 'input'
bindings(commands, {mode});         // the table itself, to read or extend
singleLine(cm);                     // extensions: a doc that stays one line
oneLine(text);                      // that flattening, for a doc before it exists
fromTextarea(textarea, cm);         // an editor onto a form field
fromTextareas(document, cm);        // ...onto every textarea[data-editor]
```

An unknown mode throws rather than falling back to the markdown layout — falling
back would put block motions and fence scanning in a search box and look very
nearly right. Markdown is the default because it is what every caller that passes
no mode has always got, and because it is the one of the five most forgiving to
be wrong about: markdown in a text file costs a fence scan that finds nothing,
where text in a markdown file silently loses the block motions.

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

Nine apps around `~/Workspace/plurama.eighttrigrams`, in two different ways,
because `plurama/Dockerfile` builds with that workspace as its context and **this
library is outside it** — Docker cannot copy in what is not in the context.

- **blog** — a `file:` dependency of `blog/scripts/zen-editor`, which bundles it
  together with CodeMirror into the one vendored file blog commits. blog runs no
  npm in the image at all, so that file is what ships.
- **personalist**, **tracker**, **treina**, **music**, **rhizome**,
  **cookbook**, **claude-coordinator** and the day-job fork
  **claude-coordinator-lc** — these *do* `npm install` (in an image, or on the
  machine) from their lockfiles, so each carries the library **packed**
  (`npm pack`) in its own `vendor/`, depended on as `file:vendor/...tgz`.

The two coordinator panels are the reason `'clojure'` mode exists: their middle
pane edits the file the file tree is standing on, and what a coordinator stands
on all day is `.clj`. The fork requires upstream's CodeMirror wrapper straight
out of the other checkout, so it runs this library whether or not its own
`package.json` says so — which is how it once came to be two versions behind, and
why it is in the vendor script's list by path.

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
