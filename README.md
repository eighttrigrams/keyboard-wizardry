# keyboard-wizardry | IJKL-Editor

This repository revolves all around an amazing keyboard scheme  
I've developed around mid-2022. A couple of years prior to that 
I've read a book by design guru Don Norman in which kitchen plate
design was discussed, and how weird it is to have this 

XX
XX

be mapped to this

XXXX

with variations like

X X
 X X 

The default keybindings of Emacs for structural editing 
struck me as very odd, and VIM, which I literally learned
by the book some 15 years earlier, struck me as exactly XXXX -  
XXXX being hjkl, where you had your right index finger handling
both j and h for up and down, respectively. How odd.

The gamers knew it all along! WASD was the solution, only it should
sit on the right hand side.

Often a software, a company, or whatever is really a spelling out
of implications of an original idea, everything that follows from it.
And so every other keybinding was built around that idea and made to fit
that idea, the more marginal and edge case-y things adhering to the 
constraints by higher concerns. 

Before all of that is shown or alluded to below,
I wanted to mention especially to mention the choice and meaning of the modifier
keys. I've ended up chosing cmd to mean small step, option to mean medium step,
and ctrl to mean big step (it was the other way around, but I learned very
soon the meaning of the term emacs-pinkie. So that was that). For example,
cmd+j means a small cursor movement, by 1 place to the left. option+j a wordwise
movement to the left, and ctrl+j a jump of the cursor to the beginning of the line.

I managed to fight operating systems to make that all possible simultaneously
on MacOS as well as Ubuntu, but that is a war story for another day.

# The core

- cmd+i cursor up
- cmd+k cursor down
- cmd+j cursor left
- cmd+l cursor right
- option+j wordwise backward
- option+l wordwise forward

# Normal editing

- ^ - undo
- shift+^ - redo
- cmd+9 - save
- cmd+0 cmd+0 - save all and exit
- ctrl+option+cmd+p go to top
- ctrl+option+cmd+ö go to bottom
- option+cmd+i cursor up, scroll buffer 1 line down
- option+cmd+k cursor down, scroll buffer 1 line up
- option+ö center cursor vertically
- ctrl-option+ö center current line vertically
- cmd+p jump to line
- option+cmd+i page up, w/ cursor centered vertically
- option+cmd+k page down, w/ cursor centered vertically

# Markdown editing

- cmd+i cursor up
- cmd+k cursor down
- cmd+j cursor left
- cmd+l cursor right
- option+j wordwise backward
- option+l wordwise forward
- ctrl+j move to beginning of markdown "sentence" (beginning of the line if last one ended with two spaces, otherwise move further to the beginning of the text block
- ctrl+l move to the next markdown sentence. so if a block ends with two spaces, move cursor to the next line, otherwise to the beginning of the next block

# Structured LISP editing:

- ctrl+cmd+j move sexp leftwards
- ctrl+cmd+l move sexp rightwards
- option+k - into next SEXP (down list)
- option+i - out of SEXP, forward (forward up list)
- option+j - paredit backward
- option+l - paredit forward
- control+option+i - backward up list
- control+option+k - backward down list
- option+delete - kill form leftward (backward-kill-sexp)
- option+´ - kill form rightward (kill-sexp)

# VSCode

Install

```bash
ln -sf ~/Workspace/eighttrigrams/keyboard-wizardry/vscode/keybindings.json ~/Library/Application\ Support/Code/User/keybindings.json
```

# Emacs with Cmux

Config is at `/Users/daniel/.emacs.d/init.el`.

Save current buffer: `C-x C-s`.
Quit (prompts to save modified buffers): `C-x C-c`.
Save-all then quit in one go: `C-x s` (answer `!` to save all), then `C-x C-c`.

Reload with `Esc` then `x` (becomes `M-x` somehow) the `load-file`, Enter then `~/.emacs.d/init.el`, Enter.
`Ctrl+g` to go back to editor.

## Editor Layouts support

- cmd+u cycle to next buffer leftwards
- cmd+o cycle to next buffer rightwards
- cmd+option+, cycle bookmarks leftwards
- cmd+option+. cycle bookmarks rightwards
- cmd+option+m,cmd+option+m - create/name/remove bookmark

call `emacs-el layout-name` in a directory which has `.editor-layouts` and a layout of that name defined.

# CodeMirror

The web apps get the scheme from `codemirror/` — a small library they depend on
instead of each keeping a copy of the bindings. See `codemirror/README.md`.
