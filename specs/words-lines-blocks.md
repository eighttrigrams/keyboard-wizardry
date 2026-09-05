# Words lines & blocks editing

This file describes on ijkl combinators focusing on middle and large jump combos.

The [core](core.md) is prerequisite for basic cursor movements

# Normal text file editing

- ctrl+j move to beginning of line
- ctrl+l move to end of line

```
ctrl+j   → the start of the line
  alpha                     alpha
  be|ta                 →   |beta
  gamma                     gamma

ctrl+j   pressed there again → the end of the line above
  alpha                     alpha|
  |beta                 →   beta
  gamma                     gamma

ctrl+l   → the end of the line
  alpha                     alpha
  be|ta                 →   beta|
  gamma                     gamma

ctrl+l   pressed there again → the start of the line below
  alpha                     alpha
  beta|                 →   beta
  gamma                     |gamma

ctrl+j at the start of the document, ctrl+l at its end → they stay
  |alpha                →   |alpha
  beta|                     beta|

on an empty line the caret is at both ends already → ctrl+j leaves it
  alpha                     alpha|
  |                     →
  gamma                     gamma

...and so does ctrl+l
  alpha                     alpha
  |                     →
  gamma                     |gamma
```

TODO consider ctrl+option commands to navigate sentence-wise (also for Markdown)

# Markdown editing

## Wordwise movement

- option+j/l wordwise backward and forward

```
option+j   
  alpha beta| gamma     →   alpha |beta gamma
  alpha be|ta gamma     →   alpha |beta gamma
  alpha |beta gamma     →   |alpha beta gamma

option+l
  alpha |beta gamma     →   alpha beta| gamma
  alpha be|ta gamma     →   alpha beta| gamma
  alpha beta| gamma     →   alpha beta gamma|
```

Here, `··` is the two trailing spaces that make a hard break in markdown
which are invisible in a source file.  
A blank line is a blank line.

## Blockwise movement

- ctrl+j move to beginning of markdown "sentence" (beginning of the line if last one ended with two spaces, otherwise move further to the beginning of the text block
- ctrl+l move to the next markdown sentence. so if a block ends with two spaces, move cursor to the next line, otherwise to the beginning of the next block

```
ctrl+j   the line above ends in ·· → the start of this line
  alpha··                   alpha··
  be|ta                 →   |beta

ctrl+j   no hard break above → the start of the block
  alpha                     alpha

  beta                      |beta
  ga|mma                →   gamma

ctrl+j   standing at a block start → back into the block above
  alpha                     |alpha

  |beta                 →   beta

ctrl+l   this line ends in ·· → the start of the next line
  alpha|··              →   alpha··
  beta                      |beta

  gamma                     gamma

ctrl+l   no hard break → past the blank line, the start of the next block
  alpha|                →   alpha
  beta                      beta

  gamma                     |gamma

ctrl+l   inside the last block → the end of the document
  alpha                     alpha

  beta ga|mma           →   beta gamma|
```

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
