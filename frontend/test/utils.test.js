import test from 'node:test';
import assert from 'node:assert/strict';

import { cn, formatDate, formatPrice } from '../src/lib/utils.js';

test('formatPrice renders VND and fallback contact text', () => {
  assert.equal(formatPrice(null), 'Liên hệ');
  assert.match(formatPrice(150000), /150\.000/);
  assert.match(formatPrice(150000), /₫|VND|đ/i);
});

test('formatDate renders empty for missing input and Vietnamese date parts for valid date', () => {
  assert.equal(formatDate(null), '');
  assert.match(formatDate('2026-06-15T00:00:00.000Z'), /15\/06\/2026/);
});

test('cn merges conditional and conflicting tailwind classes', () => {
  assert.equal(cn('px-2', false && 'hidden', 'px-4'), 'px-4');
  assert.equal(cn('text-sm', ['font-bold', null]), 'text-sm font-bold');
});
