import { test, describe } from 'node:test';
import assert from 'node:assert';
import { computeInventoryStatus } from '../src/services/inventoryService.js';

describe('Inventory Status Business Rules', () => {
  const minStock = 3;

  test('count == 0 must return OUT_OF_STOCK', () => {
    const status = computeInventoryStatus(0, minStock);
    assert.strictEqual(status, 'OUT_OF_STOCK');
  });

  test('negative count must return OUT_OF_STOCK', () => {
    const status = computeInventoryStatus(-1, minStock);
    assert.strictEqual(status, 'OUT_OF_STOCK');
  });

  test('count at min_visible_stock (3) must return LOW_STOCK', () => {
    const status = computeInventoryStatus(3, minStock);
    assert.strictEqual(status, 'LOW_STOCK');
  });

  test('count below min_visible_stock (2) must return LOW_STOCK', () => {
    const status = computeInventoryStatus(2, minStock);
    assert.strictEqual(status, 'LOW_STOCK');
  });

  test('count below min_visible_stock (1) must return LOW_STOCK', () => {
    const status = computeInventoryStatus(1, minStock);
    assert.strictEqual(status, 'LOW_STOCK');
  });

  test('count above min_visible_stock (4) must return NORMAL', () => {
    const status = computeInventoryStatus(4, minStock);
    assert.strictEqual(status, 'NORMAL');
  });

  test('count well above min_visible_stock (10) must return NORMAL', () => {
    const status = computeInventoryStatus(10, minStock);
    assert.strictEqual(status, 'NORMAL');
  });
});
