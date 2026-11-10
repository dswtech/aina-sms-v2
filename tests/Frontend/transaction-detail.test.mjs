import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    areaPatch,
    clampPanelWidth,
    combinePages,
    composerKey,
    daysInStageLabel,
    financingPatch,
    mergeEarlier,
    stageCutoffLabel,
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
    const events = Array.from({ length: 25 }, (_, i) => ({
        key: `k${25 - i}`,
    })); // newest first
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
        area: {
            region_code: '32.17',
            district_code: '32.17.08',
            other_city: null,
        },
    });
    assert.equal(areaPatch(['other']), null);
    assert.equal(areaPatch(['other', '  ']), null);
    assert.deepEqual(areaPatch(['other', 'Bandung']), {
        area: {
            region_code: 'other',
            district_code: null,
            other_city: 'Bandung',
        },
    });
});

test('credit financing is only complete once leasing, tenor and insurance are chosen', () => {
    assert.deepEqual(financingPatch(['']), { financing: null });
    assert.deepEqual(financingPatch(['cash']), {
        financing: {
            type: 'cash',
            leasing_id: null,
            other_name: null,
            tenor_months: null,
            insurance_type: null,
        },
    });
    assert.equal(financingPatch(['credit']), null);
    assert.equal(financingPatch(['credit', '5']), null);
    assert.equal(financingPatch(['credit', '5', '36']), null);
    assert.deepEqual(financingPatch(['credit', '5', '36', 'all_risk']), {
        financing: {
            type: 'credit',
            leasing_id: '5',
            other_name: null,
            tenor_months: 36,
            insurance_type: 'all_risk',
        },
    });
    assert.equal(financingPatch(['credit', 'other']), null);
    assert.equal(financingPatch(['credit', 'other', 'Leasing X', '24']), null);
    assert.deepEqual(
        financingPatch(['credit', 'other', 'Leasing X', '24', 'tlo']),
        {
            financing: {
                type: 'credit',
                leasing_id: 'other',
                other_name: 'Leasing X',
                tenor_months: 24,
                insurance_type: 'tlo',
            },
        },
    );
});

test('the composer remounts when switching between edit, reply and new on the same comment', () => {
    assert.equal(composerKey(null, null), 'new');
    assert.equal(composerKey({ id: 5 }, null), 'edit-5');
    assert.equal(composerKey(null, { id: 5 }), 'reply-5');
    assert.notEqual(composerKey({ id: 5 }, null), composerKey(null, { id: 5 }));
});

test('reloading loaded pages rebuilds the list oldest to newest without duplicates', () => {
    const keys = (list) => list.map((e) => e.key);
    const page = (...k) => k.map((key) => ({ key }));
    assert.deepEqual(
        keys(combinePages([page('k25', 'k24', 'k23'), page('k22', 'k21')])),
        ['k21', 'k22', 'k23', 'k24', 'k25'],
    );
    // A comment posted between the two page requests shifts the second page by one.
    assert.deepEqual(
        keys(
            combinePages([
                page('k26', 'k25', 'k24'),
                page('k24', 'k23', 'k22'),
            ]),
        ),
        ['k22', 'k23', 'k24', 'k25', 'k26'],
    );
});

test('a stage list shorter than the transaction history says how much is hidden', () => {
    assert.equal(stageCutoffLabel(3, 3), null);
    assert.equal(stageCutoffLabel(100, 100), null);
    assert.equal(
        stageCutoffLabel(100, 130),
        'Menampilkan 100 perpindahan terbaru dari 130.',
    );
});
