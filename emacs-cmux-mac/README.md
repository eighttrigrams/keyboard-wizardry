Basics work on Mac Mini already, 
but need to replace the config.ghostty and cmux-settings.json
with the ones from Macbook Air.

## CIDER

For Clojure development with a REPL, jump-to-definition, and inline eval.

Added to `init.el`:

```elisp
(use-package cider
  :hook (clojure-mode . cider-mode)
  :config (setq cider-preferred-build-tool "clojure-cli"))
```

Works out of the box — `use-package-always-ensure t` (set earlier in
`init.el`) makes Emacs auto-install CIDER from MELPA on first launch.
No manual `M-x package-install` step.

Usage:

- `M-x cider-jack-in-clj` — start a Clojure REPL (no cljs prompt)
- `Opt+Enter` — eval the surrounding defun (`cider-eval-defun-at-point`)
- `Ctrl+Opt+Cmd+Enter` — load whole buffer (`cider-load-buffer`)
- `C-x C-e` — eval form before cursor
- `M-m` — jump to definition (uses CIDER backend once REPL is connected)
- `C-c M-n n` — sync REPL namespace to current file
