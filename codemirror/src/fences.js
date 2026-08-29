// Which fenced code block the caret is in, if any.
//
// Pure functions of (text, pos), like motions.js — no CodeMirror and no DOM, so
// test/fences_test.js can be a table of fixtures.
//
// This is what makes structural editing safe to bind on keys that mean something
// else in prose: the sexp motions apply *only* between the fence lines of a
// Clojure block, and everything outside one keeps the binding it always had.
//
// Enough of CommonMark to be right about real documents: three or more backticks
// or tildes, up to three spaces of indent, a closing run at least as long and of
// the same character, and the first word of the info string as the language. Not
// implemented, because prose does not do it: fences inside list items or block
// quotes, where the closing run may be indented to match the container.

const OPENER = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)/;

function lineBoundsOf(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

// The fence enclosing pos, as {lang, from, to}, or null. `from` is the first
// character of the body and `to` is one past its last — so the fence lines
// themselves are outside, and a caret on either of them is not in the block.
export function fenceAt(text, pos) {
  const starts = lineBoundsOf(text);
  let open = null; // {marker, lang, bodyFrom, lineFrom}

  for (let i = 0; i < starts.length; i++) {
    const from = starts[i];
    const to = i + 1 < starts.length ? starts[i + 1] - 1 : text.length;
    const line = text.slice(from, to);

    if (open) {
      // A closing run: the same character, at least as long, nothing after it.
      // A shorter run, or the other character, is content.
      const close = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
      if (close && close[1][0] === open.marker[0] && close[1].length >= open.marker.length) {
        if (pos >= open.bodyFrom && pos <= from) {
          return {lang: open.lang, from: open.bodyFrom, to: from};
        }
        open = null;
      }
      continue;
    }

    const match = OPENER.exec(line);
    if (match) {
      // The body starts on the next line; a fence whose opener is the last line
      // of the document encloses nothing.
      open = {
        marker: match[1],
        lang: match[2].toLowerCase(),
        bodyFrom: i + 1 < starts.length ? starts[i + 1] : text.length
      };
    }
  }

  // An unclosed fence runs to the end of the document, which is what an editor
  // shows while the block is still being typed.
  if (open && pos >= open.bodyFrom) {
    return {lang: open.lang, from: open.bodyFrom, to: text.length};
  }
  return null;
}

// The languages whose blocks hold Clojure's reader syntax, so the sexp motions
// mean something in them. cljs and cljc are here beside the three Daniel named
// because leaving them out would be a gap rather than a decision.
const LISP = new Set(['clojure', 'clj', 'cljs', 'cljc', 'edn']);

export function clojureFenceAt(text, pos) {
  const fence = fenceAt(text, pos);
  return fence && LISP.has(fence.lang) ? fence : null;
}

// The languages whose blocks are shell-like, so that ctrl+j and ctrl+l inside one
// are the ends of the *line* rather than of the markdown block. The list mirrors
// the file extensions that open in shell mode — .sh and its family, .conf, the
// dot-rc files, the ignore files — because a fenced block and a file holding the
// same text should not disagree about what a chord does.
//
// **Short on purpose.** The spec says Clojure and shell-like and no third, and a
// fence language that is not in either set keeps the prose bindings. That is the
// safe direction to be wrong in: the block motions in a code block are a nuisance
// for one keypress, where line motions in prose would quietly lose the one thing
// markdown mode is for.
const SHELLISH = new Set(['sh', 'bash', 'zsh', 'ksh', 'fish', 'shell', 'console',
                          'shell-session', 'shellsession', 'conf', 'env', 'dotenv',
                          'envrc', 'gitignore', 'dockerignore']);

export function shellFenceAt(text, pos) {
  const fence = fenceAt(text, pos);
  return fence && SHELLISH.has(fence.lang) ? fence : null;
}
