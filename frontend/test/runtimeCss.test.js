// Purpose: Test tu dong de bao ve behavior quan trong cua module lien quan.
import test from 'node:test';
import assert from 'node:assert/strict';

import { clearNodeCss, css, cx, setNodeCss } from '../src/lib/runtimeCss.js';

function createFakeNode() {
  const classes = new Set();
  return {
    dataset: {},
    classList: {
      add(value) {
        classes.add(value);
      },
      remove(value) {
        classes.delete(value);
      },
      contains(value) {
        return classes.has(value);
      },
    },
    classes,
  };
}

test('css returns stable generated classes for identical style bodies', () => {
  const first = css({ width: 12, flex: 1, backgroundColor: '#fff' }, 'test');
  const second = css({ width: 12, flex: 1, backgroundColor: '#fff' }, 'test');

  assert.equal(first, second);
  assert.match(first, /^rt-test-/);
});

test('css ignores empty values and returns empty class for empty styles', () => {
  assert.equal(css({ color: null, display: false }, 'empty'), '');
  assert.equal(css(null, 'empty'), '');
});

test('cx joins nested truthy classes', () => {
  assert.equal(cx('a', '', ['b', null, ['c']]), 'a b c');
});

test('setNodeCss and clearNodeCss manage runtime classes by group', () => {
  const node = createFakeNode();
  setNodeCss(node, { color: 'red' }, 'color');
  const first = node.dataset.runtimeCsscolor;

  assert.ok(first);
  assert.equal(node.classList.contains(first), true);

  setNodeCss(node, { color: 'blue' }, 'color');
  const second = node.dataset.runtimeCsscolor;

  assert.notEqual(second, first);
  assert.equal(node.classList.contains(first), false);
  assert.equal(node.classList.contains(second), true);

  clearNodeCss(node, 'color');
  assert.equal(node.classList.contains(second), false);
  assert.equal(node.dataset.runtimeCsscolor, undefined);
});
