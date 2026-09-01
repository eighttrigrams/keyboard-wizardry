# A handful of examples of the five modes, as things you could sit and watch
# happen. The reasoning lives beside this in different-editor-modes.md; only what
# is observable is here.
#
# There is no steps file. This is a specification to read and to check an
# implementation against, not a suite that runs — the running checks are
# codemirror/test/modes_test.js.

Feature: The different editor modes of the ijkl-editor

  The same chords on five shapes of document. What a mode changes, it changes
  because the document is not that shape — never because a chord was
  reconsidered.

  Background:
    Given the IJKL scheme is installed on the editor

  Scenario Outline: ctrl+j finds the beginning the document actually has
    Given a <kind> holding
      """
      alpha
      beta

      gamma
      """
    And the caret in the middle of "beta"
    When I press ctrl+j
    Then the caret is at the start of "<lands on>"

    Examples: the block is markdown's, and Clojure's
      | kind          | lands on |
      | markdown file | alpha    |
      | text file     | beta     |
      | shell script  | beta     |
      | clojure file  | alpha    |

  Scenario: In a one-line field there is only ever the one beginning
    Given an input field holding "alpha beta gamma"
    And the caret in the middle of "beta"
    When I press ctrl+j
    Then the caret is at the start of "alpha"
    # Not a fourth behaviour: with no newlines the block and the line are the
    # same run of characters, so every mode agrees about where this goes.

  Scenario: A fenced Clojure block moves by form, and only in markdown
    Given a markdown file holding
      """
      ```clojure
      (a b)
      ```
      """
    And the caret just after "a"
    When I press option+l
    Then the caret is just after "b"

  Scenario: The same three backticks in a text file are three backticks
    Given a text file holding
      """
      ```clojure
      (a b)
      ```
      """
    And the caret just after "a"
    When I press option+l
    Then the caret has moved forward by one word

  Scenario: A Clojure file moves by form with no fence anywhere in it
    Given a clojure file holding
      """
      (defn alpha [x]
        (inc x))
      """
    And the caret just after "inc"
    When I press option+l
    Then the caret is just after "x"
    # The same document in a text file moves one word. The same document inside
    # a ```clojure block in a markdown file moves by form, exactly as here —
    # which is the whole design: the file is the fence.

  Scenario: The top-level form is what ctrl+j finds in a Clojure file
    Given a clojure file holding
      """
      (defn alpha [x]
        (inc x))

      (defn beta [y]
        (dec y))
      """
    And the caret just after "dec"
    When I press ctrl+j
    Then the caret is at the start of "(defn beta [y]"
    # Not the start of the line, which is where a text file goes. A Clojure file
    # is written with a blank line between top-level forms, so markdown's block
    # is a top-level form and nothing new had to be defined.

  Scenario Outline: Every mode holds the same chord for the things every document has
    Given a <kind> holding "alpha beta"
    And the caret in the middle of "beta"
    When I press cmd+j
    Then the caret has moved one character left

    Examples:
      | kind          |
      | markdown file |
      | text file     |
      | shell script  |
      | clojure file  |
      | input field   |

  Scenario Outline: What a file is decides the mode it opens in
    Given a file named "<file>"
    When it opens in the editor
    Then it is in <mode> mode

    Examples: prose
      | file        | mode     |
      | README.md   | markdown |
      | notes.txt   | text     |

    Examples: the shell-likes
      | file                | mode  |
      | run.sh              | shell |
      | working-dir.conf    | shell |
      | site.conf.template  | shell |
      | .envrc              | shell |

    Examples: Clojure
      | file          | mode    |
      | core.clj      | clojure |
      | views.cljs    | clojure |
      | protocol.cljc | clojure |
      | deps.edn      | clojure |

  Scenario: A caller that names no mode gets markdown, as it always did
    Given an editor mounted without a mode
    Then it behaves exactly as it did before modes existed
    # Most consumers name no mode. Modes arriving must not be something that
    # happens to them.
