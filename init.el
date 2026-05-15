;; MELPA — needed to install clojure-mode and paredit, which are not in GNU ELPA
(require 'package)
(add-to-list 'package-archives '("melpa" . "https://melpa.org/packages/") t)
(package-initialize)

;; Bootstrap use-package on first launch so the rest of this file works
;; on a fresh machine without manual M-x package-install steps
(unless (package-installed-p 'use-package)
  (package-refresh-contents)
  (package-install 'use-package))
(require 'use-package)
(setq use-package-always-ensure t)

;; clojure-mode: syntax + indentation for .clj/.cljs/.cljc/.edn
(use-package clojure-mode)

;; paredit: structural editing for s-expressions
;; Enabled in all common Lisp modes so parens/brackets/braces stay balanced
(use-package paredit
  :hook ((clojure-mode . paredit-mode)
         (emacs-lisp-mode . paredit-mode)
         (lisp-mode . paredit-mode)
         (scheme-mode . paredit-mode))
  :bind (:map paredit-mode-map
              ("M-k" . paredit-forward-down)
              ("M-i" . paredit-forward-up)
              ("M-b" . paredit-backward)
              ("M-f" . paredit-forward)
              ("C-M-i" . paredit-backward-up)
              ("C-M-k" . paredit-backward-down)
              ("M-DEL" . backward-kill-sexp)
              ("M-=" . kill-sexp)))

;; kkp: Kitty Keyboard Protocol support for terminal Emacs.
;; cmux is built on Ghostty which speaks the kitty protocol — kkp tells
;; emacs to negotiate CSI u so the terminal will send Cmd/super and other
;; previously-unrepresentable keys as proper modifier-bearing keypresses.
;; Without this, terminal emacs cannot see s-i / s-j / s-k / s-l at all.
(use-package kkp
  ;; tty-setup-hook is the recommended attach point: it runs once after each
  ;; new terminal frame is initialized, so kkp can negotiate CSI u with that
  ;; terminal. Calling it directly at startup is too early for daemon/server use.
  :hook (tty-setup . global-kkp-mode))

;; Cursor movement on Cmd+i/j/k/l (super-modifier on macOS).
;; Game-style WASD layout rotated: i=up, k=down, j=left, l=right.
(global-set-key (kbd "s-j") 'backward-char)
(global-set-key (kbd "s-l") 'forward-char)
(global-set-key (kbd "s-i") 'previous-line)
(global-set-key (kbd "s-k") 'next-line)

(global-set-key (kbd "C-x C-/") 'undo-redo)
(global-set-key (kbd "C-x C-_") 'undo-redo)

(global-set-key (kbd "s-9") 'save-buffer)
(global-set-key (kbd "s-0 s-0") 'save-buffers-kill-terminal)

(setq switch-to-prev-buffer-skip
      (lambda (_window buffer _bury-or-kill)
        (not (buffer-file-name buffer))))

(bind-key* "s-u" 'previous-buffer)
(bind-key* "s-o" 'next-buffer)

(defvar kw/layout-bookmarks nil
  "List of (ABS-PATH LINE DESCRIPTION-OR-NIL) for the current layout, in order.")
(defvar kw/bookmark-index 0)

(defun kw/goto-bookmark (i)
  (when kw/layout-bookmarks
    (let* ((n (length kw/layout-bookmarks))
           (idx (mod i n))
           (bm (nth idx kw/layout-bookmarks))
           (path (nth 0 bm))
           (line (nth 1 bm))
           (desc (nth 2 bm)))
      (setq kw/bookmark-index idx)
      (find-file path)
      (goto-char (point-min))
      (forward-line line)
      (message "bookmark %d/%d %s:%d%s"
               (1+ idx) n
               (file-name-nondirectory path) line
               (if desc (concat " — " desc) "")))))

(defun kw/next-bookmark () (interactive) (kw/goto-bookmark (1+ kw/bookmark-index)))
(defun kw/prev-bookmark () (interactive) (kw/goto-bookmark (1- kw/bookmark-index)))

(global-set-key (kbd "s-M-,") 'kw/prev-bookmark)
(global-set-key (kbd "s-M-.") 'kw/next-bookmark)

(load-theme 'wombat t)
(custom-set-variables
 ;; custom-set-variables was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(package-selected-packages nil))
(custom-set-faces
 ;; custom-set-faces was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 )
