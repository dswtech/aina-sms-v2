import assert from 'node:assert/strict';
import { test } from 'node:test';
import { benchmark, equalShare, prorata, scaled } from '../../resources/js/lib/target-allocation.ts';

test('decimal input accepts comma and rejects negatives excess precision and incomplete values', () => {
    assert.equal(scaled('17,1429'), 171429);
    for (const value of ['', '-1', '1.00001', 'NaN', '1e3', '2.']) assert.equal(scaled(value), null);
    assert.equal(scaled('0'), 0);
});

test('markup and equal division preserve coverage at four decimal places', () => {
    assert.equal(benchmark('100', '20'), 1200000);
    assert.equal(equalShare(1200000, 10), '12');
    assert.equal(equalShare(1200000, 7), '17.1429');
    assert.equal(benchmark('0.0001', '0.0001'), 2);
    assert.equal(equalShare(1200000, 0), null);
    assert.equal(benchmark('bad', '20'), null);
});

test('newcomer suggestions use the original team share and remaining weekdays', () => {
    assert.equal(prorata(1200000, 10, 8, 24), '4');
    assert.equal(prorata(1200000, 10, 0, 24), '0');
    assert.equal(prorata(1200000, 0, 8, 24), null);
});
