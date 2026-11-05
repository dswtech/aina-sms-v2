import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canContact } from '../../resources/js/lib/customer-contact.ts';

test('global refusal disables both contact channels regardless of preference', () => {
    for (const preference of [null, 'any', 'phone', 'whatsapp']) {
        const customer = { opt_out: true, contact_channel_preference: preference };
        assert.equal(canContact(customer, 'phone'), false);
        assert.equal(canContact(customer, 'whatsapp'), false);
    }
});

test('contact actions follow the selected channel and preserve unspecified legacy behavior', () => {
    for (const [preference, phone, whatsapp] of [[null, true, true], ['any', true, true], ['phone', true, false], ['whatsapp', false, true]]) {
        const customer = { opt_out: false, contact_channel_preference: preference };
        assert.equal(canContact(customer, 'phone'), phone);
        assert.equal(canContact(customer, 'whatsapp'), whatsapp);
    }
    assert.equal(canContact(null, 'phone'), false);
});
