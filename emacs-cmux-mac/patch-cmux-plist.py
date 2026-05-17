#!/usr/bin/env python3
import json
import os
import plistlib
import sys

PATH = os.path.expanduser("~/Library/Preferences/com.cmuxterm.app.plist")

UNBOUND = {
    "command": True, "shift": True, "option": True, "control": True,
    "chordCommand": True, "chordShift": True,
    "chordOption": True, "chordControl": True,
    "key": "f19", "chordKey": "f19",
}

ACTIONS = [
    "shortcut.showNotifications",
]

if not os.path.exists(PATH):
    print(f"plist not found: {PATH}", file=sys.stderr)
    sys.exit(1)

with open(PATH, "rb") as f:
    p = plistlib.load(f)

for key in ACTIONS:
    p[key] = json.dumps(UNBOUND).encode("utf-8")

with open(PATH, "wb") as f:
    plistlib.dump(p, f, fmt=plistlib.FMT_BINARY)

print("plist patched. Run:")
print("  killall cfprefsd")
print("  osascript -e 'quit app \"cmux\"'")
print("  open -a cmux")
