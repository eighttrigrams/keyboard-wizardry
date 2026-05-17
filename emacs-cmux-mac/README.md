## CIDER

For Clojure development with a REPL, jump-to-definition, and inline eval.

Usage:

- `M-x cider-jack-in-clj` — start a Clojure REPL (no cljs prompt)
- `Opt+Enter` — eval the surrounding defun (`cider-eval-defun-at-point`)
- `Ctrl+Opt+Cmd+Enter` — load whole buffer (`cider-load-buffer`)
- `C-x C-e` — eval form before cursor
- `M-m` — jump to definition (uses CIDER backend once REPL is connected, and buffer is eval'ed)
- `C-c M-n n` — sync REPL namespace to current file
