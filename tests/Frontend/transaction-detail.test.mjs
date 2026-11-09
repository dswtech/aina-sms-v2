import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    areaPatch,
    clampPanelWidth,
    daysInStageLabel,
    financingPatch,
    mergeEarlier,
} from '../../resources/js/lib/transaction-detail.ts';

test('panel width keeps 160px on the right and 300px on the left', () => {
    assert.equal(clampPanelWidth(50, 1000), 160);
    assert.equal(clampPanelWidth(400, 1000), 400);
    assert.equal(clampPanelWidth(900, 1000), 700);
});

test('days in stage reads as a sentence and hides for closed stages', () => {
    assert.equal(daysInStageLabel(12), '12 hari di tahap ini');
    assert.equal(daysInStageLabel(0), 'Baru pindah tahap hari ini');
    assert.equal(daysInStageLabel(null), null);
});

test('older pages merge oldest-to-newest without duplicate keys', () => {
    const events = Array.from({ length: 25 }, (_, i) => ({ key: `k${25 - i}` })); // newest first
    const page1 = events.slice(0, 20);
    const page2 = events.slice(20);
    const shown = mergeEarlier([], page1);
    assert.equal(shown[0].key, 'k6');
    assert.equal(shown.at(-1).key, 'k25');
    const all = mergeEarlier(shown, page2);
    assert.deepEqual(
        all.map((e) => e.key),
        Array.from({ length: 25 }, (_, i) => `k${i + 1}`),
    );
    assert.equal(mergeEarlier(all, page2).length, 25);
});

test('area is only complete once the district (or the free city) is chosen', () => {
    assert.deepEqual(areaPatch([]), { area: null });
    assert.deepEqual(areaPatch(['']), { area: null });
    assert.equal(areaPatch(['32.17']), null);
    assert.deepEqual(areaPatch(['32.17', '32.17.08']), {
        area: { region_code: '32.17', district_code: '32.17.08', other_city: null },
    });
    assert.equal(areaPatch(['other']), null);
    assert.equal(areaPatch(['other', '  ']), null);
    assert.deepEqual(areaPatch(['other', 'Bandung']), {
        area: { region_code: 'other', district_code: null, other_city: 'Bandung' },
    });
});

test('financing is only complete once cash, a leasing, or the free name is chosen', () => {
    assert.deepEqual(financingPatch(['']), { financing: null });
    assert.deepEqual(financingPatch(['cash']), {
        financing: { type: 'cash', leasing_id: null, other_name: null },
    });
    assert.equal(financingPatch(['credit']), null);
    assert.deepEqual(financingPatch(['credit', '5']), {
        financing: { type: 'credit', leasing_id: '5', other_name: null },
    });
    assert.equal(financingPatch(['credit', 'other']), null);
    assert.deepEqual(financingPatch(['credit', 'other', 'Leasing X']), {
        financing: { type: 'credit', leasing_id: 'other', other_name: 'Leasing X' },
    });
});
