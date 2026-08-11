// Putting the editor on a <textarea> that is already in a form.
//
// The textarea does not go away. It keeps its name and stays in the form, and
// every change to the document is written back into its value — because
// CodeMirror is a contenteditable div, and a contenteditable div serializes
// nothing at all. Nothing about how the page submits has to change.
//
// How it is hidden matters more than it looks like it should. It is made
// transparent and full-size rather than display:none, because a display:none
// field carrying `required` makes Chrome refuse to submit the form and then
// refuse to focus the field it is refusing about — which arrives as a Submit
// button that silently does nothing. Transparent and in place, the validation
// bubble still points at the editor the writing is actually in.
//
// The styling is read off the textarea's own computed style, so the editor
// inherits whatever the page already says a textarea looks like. No CSS to keep
// in sync, and it works in any project without knowing anything about its theme.

import {install} from './bindings.js';

// The subset worth carrying over. Height is taken from what the textarea
// currently renders as, so a box does not change size just because there is now
// an editor in it — and it keeps scrolling internally rather than growing the
// page, which is what a textarea did.
function themeFrom(textarea, EditorView) {
  const css = window.getComputedStyle(textarea);
  return EditorView.theme({
    '&': {
      height: css.height,
      fontFamily: css.fontFamily,
      fontSize: css.fontSize,
      color: css.color,
      backgroundColor: css.backgroundColor,
      border: css.border,
      borderRadius: css.borderRadius
    },
    '&.cm-focused': {outline: 'none', borderColor: css.borderColor},
    '.cm-scroller': {overflow: 'auto', fontFamily: css.fontFamily, lineHeight: css.lineHeight},
    '.cm-content': {padding: css.padding, fontFamily: css.fontFamily, caretColor: css.color},
    '.cm-line': {padding: '0'},
    '.cm-gutters': {display: 'none'},
    '.cm-activeLine': {backgroundColor: 'transparent'},
    '.cm-cursor': {borderLeftColor: css.color}
  });
}

const HIDDEN = {
  position: 'absolute',
  inset: '0',
  width: '100%',
  height: '100%',
  margin: '0',
  padding: '0',
  border: '0',
  opacity: '0',
  resize: 'none',
  pointerEvents: 'none'
};

// cm is the CodeMirror namespace the consumer already has:
// {EditorState, EditorView, keymap, commands}. options.extensions is appended
// last, so a caller can add a language mode or override any of the above.
export function fromTextarea(textarea, cm, options = {}) {
  const {EditorState, EditorView, keymap, commands} = cm;
  const theme = themeFrom(textarea, EditorView);

  const wrapper = document.createElement('div');
  wrapper.className = 'kw-editor';
  wrapper.style.position = 'relative';
  textarea.parentNode.insertBefore(wrapper, textarea);
  wrapper.appendChild(textarea);
  Object.assign(textarea.style, HIDDEN);

  // Mirror on every change rather than on submit alone: a page may read the
  // value for its own reasons - blog's Zen overlay does - and a value that is
  // only correct at submit time is a trap for whoever does that next.
  const mirror = EditorView.updateListener.of(update => {
    if (update.docChanged) textarea.value = update.state.doc.toString();
  });

  const view = new EditorView({
    state: EditorState.create({
      doc: textarea.value,
      extensions: [
        theme,
        EditorView.lineWrapping,
        commands.history(),
        keymap.of(commands.historyKeymap),
        keymap.of(commands.defaultKeymap),
        mirror,
        ...(options.extensions || [])
      ]
    }),
    parent: wrapper
  });

  install(view, commands);

  // Two ways focus can land on a field nobody can see: a <label for> click, and
  // Chrome focusing an invalid required field. Both would leave the caret in an
  // invisible box, where typing goes nowhere visible. Hand it to the editor.
  textarea.addEventListener('focus', () => view.focus());

  // Belt and braces. The mirror above is what keeps the value right; this is
  // what keeps it right if some extension ever changes the doc without an
  // update the listener sees.
  if (textarea.form) {
    textarea.form.addEventListener('submit', () => {
      textarea.value = view.state.doc.toString();
    });
  }

  return view;
}

// Every textarea under `root` that carries the marker attribute, as
// {name -> view}. Marking them in the markup rather than taking all of them is
// deliberate: a page can have a field that should stay a plain textarea - a
// stranger's comment box has no business being handed somebody else's keymap.
export function fromTextareas(root, cm, options = {}) {
  const attribute = options.attribute || 'data-editor';
  const views = {};
  for (const textarea of root.querySelectorAll(`textarea[${attribute}]`)) {
    views[textarea.id || textarea.name] = fromTextarea(textarea, cm, options);
  }
  return views;
}
