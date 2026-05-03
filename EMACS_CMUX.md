# Cmd+key cursor movement in terminal Emacs running inside cmux

Goal: press `Cmd+i / Cmd+j / Cmd+k / Cmd+l` in a terminal Emacs hosted inside
[cmux](https://cmux.com) and have the cursor move up / left / down / right.

This is harder than it sounds because three separate layers eat the keypress
before Emacs ever sees it. Solution requires touching all three.

---

## The three-layer chain

```
  physical Cmd+i
        │
        ▼
  ┌─────────────────────────┐
  │ macOS NSMenu (cmux)     │  ← intercepts top-level menu shortcuts
  └─────────────────────────┘
        │ (must release the key)
        ▼
  ┌─────────────────────────┐
  │ cmux app shortcuts      │  ← settings.json bindings
  └─────────────────────────┘
        │ (must release the key)
        ▼
  ┌─────────────────────────┐
  │ Ghostty (cmux's engine) │  ← needs explicit CSI u keybind
  └─────────────────────────┘
        │ (emits Kitty-protocol CSI u escape)
        ▼
  ┌─────────────────────────┐
  │ Emacs + kkp             │  ← decodes CSI u into super-modified key
  └─────────────────────────┘
        │
        ▼
   `s-i` → `previous-line`
```

If any one of these layers swallows or fails to forward the key, you get
silence (or, worse, a notifications popup).

---

## 1. Emacs side — the `kkp` package

Vanilla terminal Emacs cannot represent the super (Cmd) modifier. The
[`kkp`](https://github.com/benotn/kkp) package teaches Emacs to negotiate the
Kitty Keyboard Protocol with the terminal so Cmd-modified keys arrive as
proper modifier-bearing keypresses.

`~/.emacs.d/init.el`:

```elisp
;; MELPA — kkp is not in GNU ELPA
(require 'package)
(add-to-list 'package-archives '("melpa" . "https://melpa.org/packages/") t)
(package-initialize)

(unless (package-installed-p 'use-package)
  (package-refresh-contents)
  (package-install 'use-package))
(require 'use-package)
(setq use-package-always-ensure t)

(use-package kkp
  ;; tty-setup-hook fires after each terminal frame is initialized,
  ;; which is when kkp can negotiate the protocol with the terminal.
  :hook (tty-setup . global-kkp-mode))

(global-set-key (kbd "s-i") 'previous-line)
(global-set-key (kbd "s-j") 'backward-char)
(global-set-key (kbd "s-k") 'next-line)
(global-set-key (kbd "s-l") 'forward-char)
```

`s-` in Emacs is the super modifier — on macOS that maps to Cmd.

---

## 2. Ghostty side — explicit CSI u keybinds for unbound super combos

cmux is built on Ghostty. When Emacs negotiates KKP, Ghostty sends most
modifier-bearing keys via CSI u — but only for keys Ghostty already has a
keybind for. Unbound `super+<letter>` combinations are dropped on the floor.

To fix: add explicit Ghostty keybinds that emit the CSI u escape.

`~/Library/Application Support/com.mitchellh.ghostty/config.ghostty`:

```
keybind = performable:super+i=text:\x1b[105;9u
keybind = performable:super+l=text:\x1b[108;9u
```

CSI u encoding format: `CSI <unicode-codepoint> ; <modifiers> u`
- codepoint = ASCII of the lowercase letter (`i` = 105, `l` = 108)
- modifiers = bitmask + 1, where super = `1<<3` = 8 → unmodified-super = `9`
- `performable:` removes the keybind from Ghostty's own application menu so
  it doesn't conflict with menu shortcuts

`super+j` and `super+k` already work without explicit bindings because
Ghostty has defaults for them (`scroll_to_selection` and `clear_screen`),
which KKP transparently overrides.

Validate the config:

```bash
ghostty +validate-config
```

---

## 3. cmux side — `settings.json` shortcut overrides

Open `~/.config/cmux/settings.json` and clear (or remap) any cmux shortcut
that collides with the keys you want. Default cmux uses `cmd+l` for
`focusBrowserAddressBar`, `cmd+i` for `showNotifications`, and many more.

```jsonc
{
  "shortcuts" : {
    "bindings" : {
      "showNotifications"        : "cmd+shift+f12",
      "focusBrowserAddressBar"   : "cmd+shift+f11",
      // … set the rest of the shortcuts to "" or "none" or remap
    }
  }
}
```

After saving, run `cmux reload-config`. **Important caveat:** this only
controls cmux's *configurable* shortcut layer. macOS NSMenu items are a
separate beast — see step 4.

---

## 4. cmux side — patch the NSUserDefaults plist (the real menu shortcuts)

cmux exposes top-level menu items in the macOS menu bar (e.g. the
"Notifications" menu with `Show Notifications ⌘I`). These NSMenuItem
`keyEquivalent` values are NOT controlled by `settings.json`. They live in
the cmux app's NSUserDefaults plist:

```
~/Library/Preferences/com.cmuxterm.app.plist
```

Each is stored under a key like `shortcut.<actionName>` as a UTF-8 JSON
blob inside a Data field. Existing entries look like:

```json
{
  "command": true, "shift": true, "option": true, "control": true,
  "chordCommand": true, "chordShift": true, "chordOption": true, "chordControl": true,
  "key": "i",
  "chordKey": "i"
}
```

To unbind `Cmd+I` from `Show Notifications`, rebind it to a key no keyboard
sends — `f19` works:

```python
#!/usr/bin/env python3
import plistlib, json
PATH = '/Users/daniel/Library/Preferences/com.cmuxterm.app.plist'
override = {
    "command": True, "shift": True, "option": True, "control": True,
    "chordCommand": True, "chordShift": True,
    "chordOption": True, "chordControl": True,
    "key": "f19", "chordKey": "f19",
}
p = plistlib.load(open(PATH, 'rb'))
p['shortcut.showNotifications'] = json.dumps(override).encode('utf-8')
plistlib.dump(p, open(PATH, 'wb'), fmt=plistlib.FMT_BINARY)
```

After running, **kick the macOS prefs cache and restart cmux**:

```bash
killall cfprefsd
osascript -e 'quit app "cmux"'
open -a cmux
```

(Reload-config doesn't re-register NSMenuItem `keyEquivalent`s; only a
fresh process does.)

---

## Diagnosis order when a Cmd+key still doesn't reach Emacs

1. **Does cmux's macOS menu bar have an item with that shortcut?**
   (Use the cmux command palette to search — it shows menu items and their
   shortcuts.) If yes → patch the plist (step 4).
2. **Is it listed in `~/.config/cmux/settings.json` under
   `shortcuts.bindings`?** → override there (step 3).
3. **Is it in `ghostty +list-keybinds`?** → handled by KKP automatically
   once Emacs negotiates.
4. **None of the above** → add an explicit Ghostty `keybind` (step 2) so
   the CSI u sequence is emitted.

---

## Side note: the `global:` Ghostty prefix

Ghostty supports `keybind = global:super+i=…` to register a system-wide
hotkey that fires even when cmux is unfocused. It can sometimes win where
`performable:` loses, but the cost is that Cmd+i is then unavailable to
every other Mac app (Cmd+I in TextEdit etc. would silently misbehave).
Avoid unless you really want it.

---

## File locations summary

| Layer            | Path                                                                |
|------------------|---------------------------------------------------------------------|
| Emacs init       | `~/.emacs.d/init.el`                                                |
| Ghostty config   | `~/Library/Application Support/com.mitchellh.ghostty/config.ghostty`|
| cmux shortcuts   | `~/.config/cmux/settings.json`                                      |
| cmux NSMenu      | `~/Library/Preferences/com.cmuxterm.app.plist`                      |
