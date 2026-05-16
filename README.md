# keyboard-wizardry | IJKL

# Normal editing

- cmd+i cursor up
- cmd+k cursor down
- cmd+j cursor left
- cmd+l cursor right
- option+j wordwise backward
- option+l wordwise forward
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

# Structured LISP editing:

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
