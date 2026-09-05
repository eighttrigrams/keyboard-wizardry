# Words lines & blocks editing

This file describes on ijkl combinators focusing on middle and large jump combos.

The [core](core.md) is prerequisite for basic cursor movements

# Normal editing

- ctrl+j move to beginning of line
- ctrl+l move to end of line

TODO consider ctrl+option commands to navigate sentence-wise (also for Markdown)

# Markdown editing

- option+j wordwise backward
- option+l wordwise forward
- ctrl+j move to beginning of markdown "sentence" (beginning of the line if last one ended with two spaces, otherwise move further to the beginning of the text block
- ctrl+l move to the next markdown sentence. so if a block ends with two spaces, move cursor to the next line, otherwise to the beginning of the next block

# Source file editing

- ctrl+j move to beginning of line to the begin of the indendation
    - pressing it again moves it to the beginning of the line
        - pressing it again move it to the end of the previous line
- ctrl+l move to end of line
- option+j/l moves across the equivalents of words, however the tokenisation
    - but not stop at word parts in camelCased words
- option+cmd+j/l stops at seams between camelCased words, too
- option+backspace delete last token
- option+cmd+backspace delete last token but respects camelCase

# Lisp-like Source files editing

- option+j moves one SEXP leftwards
- option+k moves on SEXP rightwards
- ctrl+j inside a SEXP, moves to its beginning
- ctrl+k inside a SEXP, moves to its end
- option+backspace delete last SEXP
