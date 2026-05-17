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

(defvar kw/layout-paths nil
  "List of abs paths defining the cycling order for the current layout.")

(defun kw/file-buffers ()
  (if kw/layout-paths
      (delq nil (mapcar #'get-file-buffer kw/layout-paths))
    (sort (seq-filter #'buffer-file-name (buffer-list))
          (lambda (a b) (string< (buffer-name a) (buffer-name b))))))

(defun kw/cycle-buffer (dir)
  (let* ((bufs (kw/file-buffers))
         (n (length bufs)))
    (when (> n 0)
      (let* ((cur (current-buffer))
             (idx (or (cl-position cur bufs) 0))
             (next-idx (mod (+ idx dir) n)))
        (switch-to-buffer (nth next-idx bufs))))))

(defun kw/format-buffer-list (bufs cur width)
  (let ((lines '()) (current "") (sep "  "))
    (dolist (b bufs)
      (let* ((name (file-name-nondirectory (buffer-file-name b)))
             (display (if (eq b cur)
                          (propertize (concat "[" name "]")
                                      'face '(:foreground "yellow" :weight bold))
                        name))
             (candidate (if (string-empty-p current)
                            display
                          (concat current sep display))))
        (if (and (> (length candidate) width)
                 (not (string-empty-p current)))
            (progn (push current lines) (setq current display))
          (setq current candidate))))
    (unless (string-empty-p current) (push current lines))
    (string-join (nreverse lines) "\n")))

(defun kw/show-buffer-list ()
  (let* ((bufs (kw/file-buffers))
         (cur (current-buffer))
         (max-mini-window-height 0.5))
    (message "%s" (kw/format-buffer-list bufs cur (- (frame-width) 2)))))

(defun kw/next-file-buffer ()
  (interactive) (kw/cycle-buffer 1) (kw/show-buffer-list))

(defun kw/prev-file-buffer ()
  (interactive) (kw/cycle-buffer -1) (kw/show-buffer-list))

(bind-key* "s-u" 'kw/prev-file-buffer)
(bind-key* "s-o" 'kw/next-file-buffer)
(bind-key* "s-ü" 'goto-line)
(bind-key* "C-M-s-p" 'beginning-of-buffer)
(bind-key* "C-M-s-ö" 'end-of-buffer)

(defun kw/scroll-down-keep-row ()
  (interactive)
  (previous-line)
  (scroll-down-line))

(defun kw/scroll-up-keep-row ()
  (interactive)
  (next-line)
  (scroll-up-line))

(bind-key* "s-M-i" 'kw/scroll-down-keep-row)
(bind-key* "s-M-k" 'kw/scroll-up-keep-row)

(defun kw/recenter-keep-column ()
  (interactive)
  (let ((col (current-column)))
    (recenter)
    (move-to-column col)))

(defun kw/cursor-to-middle ()
  (interactive)
  (let ((col (current-column)))
    (move-to-window-line nil)
    (move-to-column col)))

(bind-key* "s-ö" 'kw/cursor-to-middle)
(bind-key* "C-s-ö" 'kw/recenter-keep-column)

(defun kw/page-up-middle ()
  (interactive)
  (let ((col (current-column)))
    (condition-case nil (scroll-down) (beginning-of-buffer nil))
    (move-to-window-line nil)
    (move-to-column col)))

(defun kw/page-down-middle ()
  (interactive)
  (let ((col (current-column)))
    (condition-case nil (scroll-up) (end-of-buffer nil))
    (move-to-window-line nil)
    (move-to-column col)))

(bind-key* "s-M-p" 'kw/page-up-middle)
(bind-key* "s-M-ö" 'kw/page-down-middle)

(defun kw/move-sexp-left () (interactive) (transpose-sexps -1))
(defun kw/move-sexp-right () (interactive) (transpose-sexps 1))

(bind-key* "C-s-j" 'kw/move-sexp-left)
(bind-key* "C-s-l" 'kw/move-sexp-right)

(global-display-line-numbers-mode 1)

(defvar kw/layout-bookmarks nil
  "List of (ABS-PATH LINE DESCRIPTION-OR-NIL) for the current layout, in order.")
(defvar kw/bookmark-index 0)
(defvar kw/layout-file nil)
(defvar kw/layout-name nil)

(defun kw/save-bookmarks ()
  (when (and kw/layout-file kw/layout-name (file-exists-p kw/layout-file))
    (require 'json)
    (let* ((json-object-type 'alist)
           (json-array-type 'list)
           (json-key-type 'symbol)
           (data (json-read-file kw/layout-file))
           (base (file-name-directory (expand-file-name kw/layout-file)))
           (now (truncate (* 1000 (float-time))))
           (new-bookmarks
            (mapcar (lambda (bm)
                      (let ((rel (file-relative-name (nth 0 bm) base))
                            (line (nth 1 bm))
                            (desc (nth 2 bm)))
                        (append `((filePath . ,rel)
                                  (line . ,line)
                                  (timestamp . ,now))
                                (when desc `((description . ,desc))))))
                    kw/layout-bookmarks)))
      (dolist (entry data)
        (when (equal (alist-get 'name entry) kw/layout-name)
          (let ((cell (assq 'bookmarks entry)))
            (if cell
                (setcdr cell new-bookmarks)
              (nconc entry (list (cons 'bookmarks new-bookmarks)))))))
      (with-temp-file kw/layout-file
        (insert (json-encode data))
        (json-pretty-print-buffer)))))

(defun kw/setup-bookmark-margin ()
  (setq left-margin-width 2)
  (dolist (win (get-buffer-window-list (current-buffer) nil t))
    (set-window-margins win 2 (cdr (window-margins win)))))

(defun kw/apply-bookmark-overlays (buffer)
  (with-current-buffer buffer
    (kw/setup-bookmark-margin)
    (remove-overlays (point-min) (point-max) 'kw/bookmark t)
    (dolist (bm kw/layout-bookmarks)
      (when (equal (nth 0 bm) (buffer-file-name))
        (save-excursion
          (goto-char (point-min))
          (forward-line (nth 1 bm))
          (let ((ov (make-overlay (line-beginning-position)
                                  (line-beginning-position))))
            (overlay-put ov 'kw/bookmark t)
            (overlay-put ov 'before-string
                         (propertize " " 'display
                                     `((margin left-margin)
                                       ,(propertize "●" 'face '(:foreground "yellow")))))))))))

(defun kw/refresh-bookmark-overlays ()
  (dolist (buf (buffer-list))
    (when (buffer-file-name buf)
      (kw/apply-bookmark-overlays buf))))

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

(defun kw/toggle-bookmark ()
  (interactive)
  (let* ((path (buffer-file-name))
         (line (1- (line-number-at-pos))))
    (unless path (user-error "buffer has no file"))
    (let ((existing (cl-find-if (lambda (bm)
                                  (and (equal (nth 0 bm) path)
                                       (= (nth 1 bm) line)))
                                kw/layout-bookmarks)))
      (if existing
          (let ((new-desc (read-string "Bookmark description (empty to remove): "
                                       (or (nth 2 existing) ""))))
            (if (string-empty-p new-desc)
                (progn
                  (setq kw/layout-bookmarks (delq existing kw/layout-bookmarks))
                  (message "bookmark removed"))
              (setf (nth 2 existing) new-desc)
              (message "bookmark renamed: %s" new-desc)))
        (setq kw/layout-bookmarks
              (append kw/layout-bookmarks (list (list path line nil))))
        (message "bookmark added at line %d" (1+ line))))
    (kw/refresh-bookmark-overlays)
    (kw/save-bookmarks)))

(bind-key* "s-M-m s-M-m" 'kw/toggle-bookmark)

(defvar-local kw/last-bookmark-line nil)

(defun kw/show-bookmark-at-point ()
  (when (and kw/layout-bookmarks (buffer-file-name))
    (let ((line (line-number-at-pos)))
      (unless (eq line kw/last-bookmark-line)
        (setq kw/last-bookmark-line line)
        (let ((bm (cl-find-if (lambda (b)
                                (and (equal (nth 0 b) (buffer-file-name))
                                     (= (nth 1 b) (1- line))
                                     (nth 2 b)))
                              kw/layout-bookmarks)))
          (when bm
            (message "● %s" (nth 2 bm))))))))

(add-hook 'post-command-hook 'kw/show-bookmark-at-point)

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
