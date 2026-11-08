import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    summarizeFinancing,
    initialLeasing,
    syntheticDeals,
    updateFinancing,
} from '../../resources/js/lib/financing-preview.ts';

test('prospect and DO cohorts reconcile cash, credit, unknown and lender totals', () => {
    for (const mode of ['prospect', 'do']) {
        for (const period of ['2026-10', '2026-11', '2026-12']) {
            const result = summarizeFinancing(
                syntheticDeals,
                initialLeasing,
                period,
                mode,
            );
            assert.equal(
                result.cash + result.credit + result.unknown,
                result.total,
            );
            assert.equal(
                result.leasing.reduce((sum, row) => sum + row.count, 0),
                result.credit,
            );
        }
    }
    assert.equal(
        summarizeFinancing(
            syntheticDeals,
            initialLeasing,
            '2026-11',
            'prospect',
        ).total,
        100,
    );
    assert.equal(
        summarizeFinancing(syntheticDeals, initialLeasing, '2026-12', 'do')
            .total,
        0,
    );
});

test('other lenders and missing lenders stay separate; DO keeps its original grouping', () => {
    const rows = [
        {
            id: 1,
            prospectMonth: '2026-11',
            doMonth: '2026-11',
            financing: 'credit',
            leasingId: 'acc',
            otherName: '',
            snapshot: {
                financing: 'credit',
                leasingId: 'acc',
                leasingName: 'ACC',
                primary: true,
            },
        },
        {
            id: 2,
            prospectMonth: '2026-11',
            financing: 'credit',
            leasingId: 'other',
            otherName: 'Contoh Finance',
        },
        {
            id: 3,
            prospectMonth: '2026-11',
            financing: 'credit',
            leasingId: null,
            otherName: '',
        },
    ];
    const changedLeasing = initialLeasing.map((row) =>
        row.id === 'acc' ? { ...row, name: 'ACC baru', primary: false } : row,
    );
    const prospect = summarizeFinancing(
        rows,
        changedLeasing,
        '2026-11',
        'prospect',
    );
    assert.equal(prospect.leasing.find((row) => row.id === 'other').count, 2);
    assert.equal(
        prospect.leasing.find((row) => row.id === 'unselected').count,
        1,
    );
    const realized = summarizeFinancing(rows, changedLeasing, '2026-11', 'do');
    assert.deepEqual(
        realized.leasing.find((row) => row.id === 'acc'),
        { id: 'acc', name: 'ACC', count: 1 },
    );
});

test('editing financing clears incompatible lender values and cannot change a DO', () => {
    const row = {
        id: 1,
        prospectMonth: '2026-11',
        financing: 'credit',
        leasingId: 'other',
        otherName: 'Contoh Finance',
    };
    assert.deepEqual(updateFinancing(row, 'cash', 'other', 'Contoh Finance'), {
        ...row,
        financing: 'cash',
        leasingId: null,
        otherName: '',
    });
    assert.throws(
        () => updateFinancing(row, 'credit', 'other', '  '),
        /nama leasing/i,
    );
    assert.throws(
        () => updateFinancing({ ...row, doMonth: '2026-11' }, 'cash', null, ''),
        /DO/,
    );
    assert.equal(row.financing, 'credit');
});
