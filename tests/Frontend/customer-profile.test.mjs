import assert from 'node:assert/strict';
import test from 'node:test';
import {
    draftFromProfile,
    missingProfileFields,
    profilePayload,
    requiredProfileFields,
} from '../../resources/js/lib/customer-profile.ts';

test('required profile fields follow the stage', () => {
    assert.deepEqual(requiredProfileFields('lead'), []);
    assert.deepEqual(requiredProfileFields('lost'), []);
    assert.deepEqual(requiredProfileFields('prospect'), ['gender', 'address']);
    assert.deepEqual(requiredProfileFields('hot_prospect'), ['gender', 'address']);
    assert.deepEqual(requiredProfileFields('spk'), [
        'gender',
        'address',
        'occupation',
        'area',
    ]);
    assert.deepEqual(requiredProfileFields('do'), []);
});

test('only fields the saved profile lacks are asked for', () => {
    assert.deepEqual(missingProfileFields('spk', null), [
        'gender',
        'address',
        'occupation',
        'area',
    ]);
    assert.deepEqual(
        missingProfileFields('spk', {
            gender: 'L',
            address: 'Jl. A',
            occupation: 'farmer',
            region_code: '32.17',
            district_code: '32.17.08',
        }),
        [],
    );
    assert.deepEqual(
        missingProfileFields('spk', {
            gender: 'L',
            address: 'Jl. A',
            occupation: 'farmer',
            region_code: 'other',
            other_city: ' ',
        }),
        ['area'],
    );
    assert.deepEqual(
        missingProfileFields('spk', {
            gender: 'P',
            address: 'Jl. A',
            occupation: 'others',
            region_code: 'other',
            other_city: 'Garut',
        }),
        [],
    );
});

test('the stage payload carries only filled fields, with Kota Lain dropping the district', () => {
    const empty = draftFromProfile();
    assert.equal(profilePayload(empty, ['gender', 'area']), undefined);
    assert.deepEqual(
        profilePayload({ ...empty, gender: 'L', address: ' Jl. B ' }, ['gender', 'address']),
        { gender: 'L', address: 'Jl. B' },
    );
    assert.deepEqual(
        profilePayload({ ...empty, region: 'other', district: '32.17.08', city: 'Garut' }, ['area']),
        { area: { region_code: 'other', district_code: null, other_city: 'Garut' } },
    );
    assert.deepEqual(
        profilePayload({ ...empty, region: '32.17', district: '32.17.08' }, ['area']),
        { area: { region_code: '32.17', district_code: '32.17.08', other_city: null } },
    );
});
