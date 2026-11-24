import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { areaBoundaries } from '../../resources/js/lib/area-boundaries.ts';
import { areaMapLayout, districtClass, districtClasses, shortRegionName } from '../../resources/js/lib/area-map.ts';

test('every master district has a boundary', () => {
    const codes = ['bandung-raya', 'pma-regions'].flatMap((file) =>
        JSON.parse(readFileSync(new URL(`../../database/data/${file}.json`, import.meta.url), 'utf8')).districts.map((d) => d.code));
    assert.deepEqual(Object.keys(areaBoundaries).sort(), [...codes].sort());
    for (const { x, y, half, path } of Object.values(areaBoundaries)) {
        assert.ok([x, y, half].every(Number.isFinite) && half > 0);
        assert.match(path, /^(M-?\d+ -?\d+(L-?\d+ -?\d+)+Z)+$/);
    }
});

test('district classes cover 1 to the maximum without gaps or overlap', () => {
    assert.deepEqual(districtClasses(0), []);
    assert.deepEqual(districtClasses(1), [[1, 1]]);
    assert.deepEqual(districtClasses(2), [[1, 1], [2, 2]]);
    assert.deepEqual(districtClasses(4), [[1, 2], [3, 3], [4, 4]]);
    for (const max of [1, 2, 3, 4, 7, 10, 100]) {
        const classes = districtClasses(max);
        assert.equal(classes[0][0], 1);
        assert.equal(classes.at(-1)[1], max);
        classes.slice(1).forEach(([low], i) => assert.equal(low, classes[i][1] + 1));
        // The darkest fill always belongs to the top class.
        assert.equal(districtClass(max, max), 3);
        assert.equal(districtClass(0, max), 0);
    }
});

test('the map frames only the districts it draws and ignores unknown codes', () => {
    const { shapes, viewBox, unit } = areaMapLayout([
        { id: '32.17.01', name: 'Lembang', count: 3 },
        { id: '99.99.99', name: 'Tanpa batas', count: 1 },
        { id: 'other', name: 'Kecamatan lain', count: 9 },
    ]);
    assert.deepEqual(shapes.map((shape) => shape.name), ['Lembang']);
    const [x, y, width, height] = viewBox.split(' ').map(Number);
    const { x: cx, y: cy } = areaBoundaries['32.17.01'];
    assert.ok(cx > x && cx < x + width && cy > y && cy < y + height);
    assert.ok(unit > 0);
    assert.equal(areaMapLayout([]).shapes.length, 0);
});

test('region names shorten without losing which kind of region it is', () => {
    assert.equal(shortRegionName('Kabupaten Bandung Barat'), 'Kab. Bandung Barat');
    assert.equal(shortRegionName('Kota Bandung'), 'Kota Bandung');
});
