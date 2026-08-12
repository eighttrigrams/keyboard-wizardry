// The eight bindings, driven through a real browser against a real CodeMirror.
//
//   npm run e2e
//
// The unit tests in ../test cover the motion arithmetic. These cover the part
// arithmetic cannot: that a chord actually arrives, that the right command runs,
// and that nothing is typed into the document on the way.

import {test, expect} from '@playwright/test';

// Line numbers into demo/demo.js's SAMPLE. Named, because "7" in an assertion
// says nothing and "HARD_BREAK_LINE" says the whole thing.
const FIRST_BLOCK = 3;      // a three-line block, no hard breaks
const HARD_BREAK_LINE = 7;  // ends in two spaces
const LAST_OF_BLOCK = 9;    // the line the hard breaks lead into, no break itself
const NEXT_BLOCK = 11;

async function caret(page) {
  return await page.evaluate(() => {
    const state = window.ijkl.view.state;
    const head = state.selection.main.head;
    const line = state.doc.lineAt(head);
    return {head, line: line.number, col: head - line.from + 1, atLineStart: head === line.from};
  });
}

async function putCaret(page, line, col = 1) {
  await page.evaluate(({line, col}) => {
    const view = window.ijkl.view;
    const at = view.state.doc.line(line).from + (col - 1);
    view.dispatch({selection: {anchor: at, head: at}});
    view.focus();
  }, {line, col});
}

async function docLength(page) {
  return await page.evaluate(() => window.ijkl.view.state.doc.length);
}

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await expect(page.locator('.cm-content')).toBeVisible();
  await page.locator('.cm-content').click();
});

test('cmd+j and cmd+l move by one character', async ({page}) => {
  await putCaret(page, FIRST_BLOCK, 5);
  await page.keyboard.press('Meta+KeyL');
  expect((await caret(page)).col).toBe(6);
  await page.keyboard.press('Meta+KeyJ');
  expect((await caret(page)).col).toBe(5);
});

test('cmd+i and cmd+k move by line', async ({page}) => {
  await putCaret(page, FIRST_BLOCK, 3);
  await page.keyboard.press('Meta+KeyK');
  expect((await caret(page)).line).toBeGreaterThan(FIRST_BLOCK);
  await page.keyboard.press('Meta+KeyI');
  expect((await caret(page)).line).toBe(FIRST_BLOCK);
});

test('option+j and option+l move by word, and type nothing', async ({page}) => {
  const before = await docLength(page);
  // Column 3 is the "b" of "block", which runs to column 7 — so a word motion
  // lands on 8 and a character motion would land on 4. Starting at column 1
  // would prove nothing: the first word of that line is the single letter "A".
  await putCaret(page, FIRST_BLOCK, 3);

  await page.keyboard.press('Alt+KeyL');
  expect((await caret(page)).col).toBe(8);

  await page.keyboard.press('Alt+KeyJ');
  expect((await caret(page)).col).toBe(3);

  // The reason the table is keyed on e.code: with Option held, macOS composes,
  // and a binding that failed to fire here would leave "∆" in the document.
  expect(await docLength(page)).toBe(before);
});

test('ctrl+l from a plain block goes to the start of the next block', async ({page}) => {
  await putCaret(page, FIRST_BLOCK, 10);
  await page.keyboard.press('Control+KeyL');
  expect(await caret(page)).toMatchObject({line: HARD_BREAK_LINE, atLineStart: true});
});

test('ctrl+l from a hard-broken line steps one line at a time', async ({page}) => {
  await putCaret(page, HARD_BREAK_LINE, 5);
  await page.keyboard.press('Control+KeyL');
  expect(await caret(page)).toMatchObject({line: HARD_BREAK_LINE + 1, atLineStart: true});
  await page.keyboard.press('Control+KeyL');
  expect(await caret(page)).toMatchObject({line: LAST_OF_BLOCK, atLineStart: true});
  // The last line of the block has no hard break of its own, so the next press
  // leaves the block.
  await page.keyboard.press('Control+KeyL');
  expect(await caret(page)).toMatchObject({line: NEXT_BLOCK, atLineStart: true});
});

test('ctrl+j walks backwards without ever jamming', async ({page}) => {
  await putCaret(page, LAST_OF_BLOCK, 1);
  const seen = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Control+KeyJ');
    seen.push((await caret(page)).head);
  }
  // Strictly decreasing: that is the property the binding exists to guarantee.
  for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeLessThan(seen[i - 1]);
});

test('undo still works — the bindings do not displace the default keymap', async ({page}) => {
  await putCaret(page, FIRST_BLOCK, 1);
  await page.keyboard.type('xyz');
  const typed = await docLength(page);
  await page.keyboard.press('Meta+KeyZ');
  expect(await docLength(page)).toBeLessThan(typed);
});

test('the page shows which chord fired', async ({page}) => {
  await putCaret(page, FIRST_BLOCK, 5);
  await page.keyboard.press('Alt+KeyL');
  await expect(page.locator('#last-chord')).toHaveText('KeyL alt');
  await expect(page.locator('#cheatsheet tr.fired')).toHaveAttribute('data-chord', 'KeyL alt');
});

test('the hard breaks are drawn', async ({page}) => {
  // Scoped to the editor: the legend under it uses the same class on purpose.
  await expect(page.locator('#editor .cm-hardbreak')).toHaveCount(2);
});

/* ---- inside a ```clojure block ----------------------------------------- */

// The caret at a given occurrence of a string in the document, so these read as
// positions in the code rather than as numbers.
async function putCaretAt(page, needle, offset = 0) {
  await page.evaluate(({needle, offset}) => {
    const view = window.ijkl.view;
    const at = view.state.doc.toString().indexOf(needle) + offset;
    view.dispatch({selection: {anchor: at, head: at}});
    view.focus();
  }, {needle, offset});
}

async function charsAround(page) {
  return await page.evaluate(() => {
    const state = window.ijkl.view.state;
    const head = state.selection.main.head;
    const doc = state.doc.toString();
    return {before: doc.slice(Math.max(0, head - 12), head), after: doc.slice(head, head + 12)};
  });
}

test('option+l steps over a form, not a word', async ({page}) => {
  // Before `greet` in `(defn greet [name]`: a word motion would stop after
  // "greet", and a form motion lands in the same place — so use the vector,
  // where the two differ: over `[name]` whole, brackets and all.
  await putCaretAt(page, '[name]');
  await page.keyboard.press('Alt+KeyL');
  const {before, after} = await charsAround(page);
  expect(before.endsWith('[name]')).toBe(true);
  expect(after.startsWith('\n')).toBe(true);
});

test('option+k goes into the next list, option+i comes back out of it', async ({page}) => {
  await putCaretAt(page, '(let');
  await page.keyboard.press('Alt+KeyK');
  expect((await charsAround(page)).after.startsWith('let')).toBe(true);

  await page.keyboard.press('Alt+KeyI');
  // Out of the (let …) and no further: of the three parens that close the block,
  // two are now behind the caret — (println …)'s and (let …)'s — and the defn's
  // is still ahead. Coming out one level at a time is the point of the key.
  const {before, after} = await charsAround(page);
  expect(before.endsWith('greeting))')).toBe(true);
  expect(after.startsWith(')')).toBe(true);
});

test('option+j steps back over a whole form', async ({page}) => {
  await putCaretAt(page, '[greeting', '[greeting'.length);
  await page.keyboard.press('Alt+KeyJ');
  expect((await charsAround(page)).after.startsWith('greeting')).toBe(true);
});

test('the motions do not leave the block', async ({page}) => {
  // At the very end of the code, option+l has nowhere to go and must not walk
  // out into the prose underneath.
  await putCaretAt(page, '(println greeting)))', '(println greeting)))'.length);
  const before = await page.evaluate(() => window.ijkl.head());
  await page.keyboard.press('Alt+KeyL');
  await page.keyboard.press('Alt+KeyI');
  expect(await page.evaluate(() => window.ijkl.head())).toBe(before);
});

test('outside the block the same keys are word motions again', async ({page}) => {
  await putCaretAt(page, 'Out here again');
  await page.keyboard.press('Alt+KeyL');
  const {before} = await charsAround(page);
  expect(before.endsWith('Out')).toBe(true);
});
