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
