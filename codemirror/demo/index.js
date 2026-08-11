// The demo page: this folder on its own, with nothing else running.
//
//   npm run dev     →  http://127.0.0.1:8021
//
// It mounts a CodeMirror with the same extensions blog's Zen overlay uses, puts
// the bindings on it, and then shows two things blog cannot show you: which
// chord just fired, and where the hard breaks are. Hard breaks are trailing
// spaces, so they are invisible, and the whole ctrl+j / ctrl+l rule turns on
// them — a demo that does not draw them is not demonstrating much.
//
// Everything below the imports is demo, not library. The library is three files
// in ../src and has no dependencies.

import {EditorState, RangeSetBuilder} from '@codemirror/state';
import {EditorView, Decoration, WidgetType, ViewPlugin} from '@codemirror/view';
import {keymap} from '@codemirror/view';
import * as commands from '@codemirror/commands';
import {install, bindings} from '../src/index.js';

const B = '  '; // the two spaces that make a hard break, spelled out so an
                // editor stripping trailing whitespace cannot quietly break it

const SAMPLE = [
  '# The rule, in one page',
  '',
  'A block is a run of lines with a blank line either side. ctrl+l from anywhere',
  'inside this one lands at the start of the next block, past the blank line',
  'rather than onto it.',
  '',
  'This line ends in a hard break,' + B,
  'so ctrl+l from it steps only onto this line — not over the whole block.' + B,
  'And again, so repeated presses walk down the lines one at a time.',
  '',
  'ctrl+j is the mirror: the nearest sentence beginning strictly before the',
  'caret. Strictly, so pressing it at a block start walks to the one above',
  'instead of jamming.',
  '',
  'Word motion is option+j and option+l. Those are the two that would break if',
  'the bindings were keyed on e.key rather than e.code, because on macOS option',
  'is a compose modifier and option+j arrives as "∆".'
].join('\n');

/* ---- the editor, themed like blog's prose ------------------------------ */

const theme = EditorView.theme({
  '&': {height: '100%', fontSize: '1.0625rem', color: 'inherit', backgroundColor: 'transparent'},
  '&.cm-focused': {outline: 'none'},
  '.cm-scroller': {overflow: 'auto', fontFamily: 'inherit', lineHeight: '1.7'},
  '.cm-content': {padding: '1.25rem 1.5rem', fontFamily: 'inherit', caretColor: 'rgba(0,0,0,0.8)'},
  '.cm-line': {padding: '0'},
  '.cm-gutters': {display: 'none'},
  '.cm-activeLine': {backgroundColor: 'transparent'},
  '.cm-cursor': {borderLeftColor: 'rgba(0,0,0,0.8)'}
});

/* ---- drawing the hard breaks (demo only) ------------------------------- */

class BreakMarker extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-hardbreak';
    span.textContent = '⏎';
    return span;
  }
}

// The same two conditions the library uses: two or more trailing spaces, on a
// line that is not blank and is not the last one.
function hardBreakMarks(view) {
  const builder = new RangeSetBuilder();
  const doc = view.state.doc;
  for (let n = 1; n < doc.lines; n++) {
    const line = doc.line(n);
    if (/^\s*$/.test(line.text)) continue;
    if (/ {2,}$/.test(line.text)) {
      builder.add(line.to, line.to, Decoration.widget({widget: new BreakMarker(), side: 1}));
    }
  }
  return builder.finish();
}

const hardBreaks = ViewPlugin.fromClass(class {
  constructor(view) { this.decorations = hardBreakMarks(view); }
  update(update) {
    if (update.docChanged) this.decorations = hardBreakMarks(update.view);
  }
}, {decorations: plugin => plugin.decorations});

/* ---- the readout (demo only) ------------------------------------------- */

const el = id => document.getElementById(id);

function showCaret(state) {
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  el('caret').textContent = String(head);
  el('line').textContent = String(line.number);
  el('col').textContent = String(head - line.from + 1);
}

const readout = EditorView.updateListener.of(update => {
  if (update.docChanged || update.selectionSet) showCaret(update.state);
});

/* ---- wiring ------------------------------------------------------------ */

const view = new EditorView({
  state: EditorState.create({
    doc: SAMPLE,
    extensions: [
      theme,
      EditorView.lineWrapping,
      hardBreaks,
      readout,
      commands.history(),
      keymap.of(commands.historyKeymap),
      keymap.of(commands.defaultKeymap)
    ]
  }),
  parent: el('editor')
});

install(view, commands);

// Capture on document, which in the capture phase runs before the editor's own
// listener — so this still sees the chords the library stops from propagating.
const known = bindings(commands);
document.addEventListener('keydown', event => {
  const mods = [];
  if (event.altKey) mods.push('alt');
  if (event.ctrlKey) mods.push('ctrl');
  if (event.metaKey) mods.push('meta');
  if (event.shiftKey) mods.push('shift');
  const chord = event.code + ' ' + mods.join('+');
  if (!known[chord]) return;
  el('last-chord').textContent = chord;
  for (const row of document.querySelectorAll('#cheatsheet tr')) {
    row.classList.toggle('fired', row.dataset.chord === chord);
  }
}, true);

showCaret(view.state);
view.focus();

// For the Playwright specs in ../e2e, which need to read the caret out of the
// real editor rather than off the page.
window.ijkl = {view, head: () => view.state.selection.main.head};
