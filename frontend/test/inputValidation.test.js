import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_FULL_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  isValidHttpsOrDataImageUrl,
  validateFullName,
  validatePassword,
} from '../src/utils/inputValidation.js';

test('image URL validator accepts empty, https, and data image URLs only', () => {
  assert.equal(isValidHttpsOrDataImageUrl(''), true);
  assert.equal(isValidHttpsOrDataImageUrl(' https://example.com/image.png '), true);
  assert.equal(isValidHttpsOrDataImageUrl('data:image/png;base64,abc'), true);
  assert.equal(isValidHttpsOrDataImageUrl('http://example.com/image.png'), false);
  assert.equal(isValidHttpsOrDataImageUrl('javascript:alert(1)'), false);
});

test('password validator enforces length limits', () => {
  assert.notEqual(validatePassword('short'), '');
  assert.equal(validatePassword('TicketRush123'), '');
  assert.notEqual(validatePassword('x'.repeat(MAX_PASSWORD_LENGTH + 1)), '');
});

test('full name validator trims and enforces name length limits', () => {
  assert.notEqual(validateFullName(' A '), '');
  assert.equal(validateFullName(' Nguyen Van A '), '');
  assert.notEqual(validateFullName('x'.repeat(MAX_FULL_NAME_LENGTH + 1)), '');
});
