#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")" && pwd)"

link() {
  local src="$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  if [ -L "$dst" ] && [ "$(readlink "$dst")" = "$src" ]; then
    echo "ok    $dst"
    return
  fi
  if [ -e "$dst" ] || [ -L "$dst" ]; then
    mv "$dst" "$dst.bak.$(date +%s)"
    echo "moved $dst -> $dst.bak.*"
  fi
  ln -s "$src" "$dst"
  echo "link  $dst -> $src"
}

link "$repo/init.el"          "$HOME/.emacs.d/init.el"
link "$repo/config.ghostty"   "$HOME/Library/Application Support/com.mitchellh.ghostty/config.ghostty"
link "$repo/cmux-settings.json" "$HOME/.config/cmux/settings.json"

/usr/bin/python3 "$repo/patch-cmux-plist.py"

echo
echo "Symlinks installed. Now restart cmux to apply NSMenu changes:"
echo "  killall cfprefsd"
echo "  osascript -e 'quit app \"cmux\"'"
echo "  open -a cmux"
