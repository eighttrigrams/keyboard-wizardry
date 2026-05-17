## CIDER

For Clojure development with a REPL, jump-to-definition, and inline eval.

Usage:

- `M-x cider-jack-in-clj` — start a Clojure REPL (no cljs prompt)
- `Opt+Enter` — eval the surrounding defun (`cider-eval-defun-at-point`)
- `Ctrl+Opt+Cmd+Enter` — load whole buffer (`cider-load-buffer`)
- `C-x C-e` — eval form before cursor
- `M-m` — jump to definition (uses CIDER backend once REPL is connected, and buffer is eval'ed)
- `C-c M-n n` — sync REPL namespace to current file

## Paredit slurp / barf

- `Opt+O` — slurp right (`paredit-forward-slurp-sexp`)
- `Opt+U` — barf right (`paredit-forward-barf-sexp`)
- `Ctrl+Opt+U` — slurp left (`paredit-backward-slurp-sexp`)
- `Ctrl+Opt+O` — barf left (`paredit-backward-barf-sexp`)

## Sexp drag (like Calva's `paredit.dragSexpr*`)

- `Ctrl+Cmd+K` — drag current sexp into start of next sibling list
- `Ctrl+Cmd+I` — drag current sexp out of enclosing list, to the right
- `Ctrl+Opt+Cmd+K` — drag current sexp into end of previous sibling list
- `Ctrl+Opt+Cmd+I` — drag current sexp out of enclosing list, to the left
