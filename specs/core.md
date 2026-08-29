# The absolute core

Every variation of the editor, for every file type, in every circumstance,
should support this.

- cmd+i cursor up
- cmd+k cursor down
- cmd+j cursor left
- cmd+l cursor right

That is, if we are not hitting boundaries
- we are in an input field and there is no up/down
- if we are in the first or last line and can't go further up/down, respectively
- if we are at the beginning or end of a file and can't go further

Preferentially, all sorts of dialogs, where we can navigate between items
should make this scheme their first choice. The *meaning* of this scheme is really this:

- cmd+i up
- cmd+k down
- cmd+j left
- cmd+l right

When there are options of step or jump size, we go by modifiers

Small jumps

- cmd+i up
- cmd+k down
- cmd+j left
- cmd+l right

Medium jumps

- option+i up
- option+k down
- option+j left
- option+l right

Big jumps

- ctrl+i up
- ctrl+k down
- ctrl+j left
- ctrl+l right

The classic **shift** key should work as expected and when held,
mark the space between here and there, as defined per these jumps,
or extend or diminish an existing selection in the indicated direction.
