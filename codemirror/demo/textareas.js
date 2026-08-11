// The second demo page: the editor mounted on a form's textareas.
//
// The question this page exists to answer is whether the form still submits what
// you typed. So it does not navigate away — it prints what the form *would* have
// sent, read the same way a server would read it, out of FormData.

import {EditorState} from '@codemirror/state';
import {EditorView, keymap} from '@codemirror/view';
import * as commands from '@codemirror/commands';
import {fromTextareas} from '../src/index.js';

const cm = {EditorState, EditorView, keymap, commands};
const form = document.getElementById('article');
const out = document.getElementById('serialized');

const views = fromTextareas(document, cm);

// A submit event only fires once the browser's own validation has passed, so
// leaving the required field empty never reaches this — which is the point of
// hiding the textarea the way src/textarea.js hides it.
form.addEventListener('submit', event => {
  event.preventDefault();
  const lines = [];
  for (const [name, value] of new FormData(form)) {
    lines.push(`<b>${name}</b> = ${JSON.stringify(value)}`);
  }
  out.innerHTML = lines.join('\n');
});

// For the Playwright specs in ../e2e.
window.ijkl = {views, head: name => views[name].state.selection.main.head};
