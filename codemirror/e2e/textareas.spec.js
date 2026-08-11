// The editor mounted on a form's textareas: does the form still submit what you
// typed, and does the marker still decide which fields get an editor at all.
//
//   npm run e2e

import {test, expect} from '@playwright/test';

const editor = name => `#${name}`;

async function value(page, name) {
  return await page.evaluate(n => document.getElementsByName(n)[0].value, name);
}

async function setDoc(page, name, text) {
  await page.evaluate(({name, text}) => {
    const view = window.ijkl.views[name];
    view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: text}});
  }, {name, text});
}

async function caretCol(page, name) {
  return await page.evaluate(n => {
    const state = window.ijkl.views[n].state;
    const head = state.selection.main.head;
    return head - state.doc.lineAt(head).from + 1;
  }, name);
}

test.beforeEach(async ({page}) => {
  await page.goto('/textareas.html');
  await expect(page.locator('.cm-content').first()).toBeVisible();
});

test('the marker decides: two editors, and the plain textarea left alone', async ({page}) => {
  await expect(page.locator('.cm-editor')).toHaveCount(2);

  // Asserted on the computed style rather than with toBeHidden(): an opacity:0
  // element counts as visible to Playwright, and that is the whole trick here —
  // it has to stay a laid-out, focusable field for `required` to work, while
  // being invisible and unclickable to whoever is writing.
  const styles = await page.evaluate(() => {
    const of = id => {
      const css = getComputedStyle(document.getElementById(id));
      return {opacity: css.opacity, pointerEvents: css.pointerEvents};
    };
    return {content: of('content'), private: of('private'), inForm: !!document.getElementById('content').form};
  });
  expect(styles.content).toEqual({opacity: '0', pointerEvents: 'none'});
  expect(styles.private.opacity).toBe('1');
  expect(styles.inForm).toBe(true);
  await expect(page.locator(editor('private'))).toBeVisible();
});

test('typing in the editor is what the form sends', async ({page}) => {
  await setDoc(page, 'content', 'written through the editor');
  expect(await value(page, 'content')).toBe('written through the editor');

  await page.locator('button[type=submit]').click();
  await expect(page.locator('#serialized')).toContainText('written through the editor');
});

test('every field is serialized, editor-backed or not', async ({page}) => {
  await page.locator('button[type=submit]').click();
  const out = page.locator('#serialized');
  await expect(out).toContainText('title');     // a plain input
  await expect(out).toContainText('abstract');  // an editor
  await expect(out).toContainText('content');   // an editor
  await expect(out).toContainText('private');   // a plain textarea
});

test('required still blocks the submit, and blames the right field', async ({page}) => {
  await setDoc(page, 'content', '');
  await page.locator('button[type=submit]').click();

  // No submit event fired, so nothing was printed. This is the case that breaks
  // outright if the textarea is hidden with display:none.
  await expect(page.locator('#serialized')).toBeEmpty();
  expect(await page.evaluate(() => document.getElementById('content').validity.valueMissing)).toBe(true);
});

test('the bindings are live in a mounted textarea', async ({page}) => {
  await page.locator('.cm-content').first().click();
  await page.evaluate(() => {
    const view = window.ijkl.views.abstract;
    view.dispatch({selection: {anchor: 3, head: 3}});
    view.focus();
  });
  await page.keyboard.press('Meta+KeyL');
  expect(await caretCol(page, 'abstract')).toBe(5);
  await page.keyboard.press('Meta+KeyJ');
  expect(await caretCol(page, 'abstract')).toBe(4);
});

test('clicking the label focuses the editor, not the invisible textarea', async ({page}) => {
  await page.locator('label[for=content]').click();
  const focused = await page.evaluate(() => ({
    tag: document.activeElement.tagName,
    inEditor: !!document.activeElement.closest('.cm-editor')
  }));
  expect(focused.tag).not.toBe('TEXTAREA');
  expect(focused.inEditor).toBe(true);
});

test('the editor takes the size the textarea had', async ({page}) => {
  // Abstract is the short box (min-height 80px), content the tall one. If the
  // editor grew with its content instead, these would be the other way round.
  const heights = await page.evaluate(() => {
    const box = id => document.getElementById(id).closest('.kw-editor')
      .querySelector('.cm-editor').getBoundingClientRect().height;
    return {abstract: box('abstract'), content: box('content')};
  });
  expect(heights.abstract).toBeGreaterThan(60);
  expect(heights.content).toBeGreaterThan(heights.abstract);
});
