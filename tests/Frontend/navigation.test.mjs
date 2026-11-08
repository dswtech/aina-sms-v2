import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    getNavigation,
    getMobileNavigation,
    isNavigationItemActive,
} from '../../resources/js/lib/navigation.ts';

test('analytics contains source/model and financing children for authorized roles only', () => {
    for (const role of ['admin', 'supervisor', 'branch_manager']) {
        const group = getNavigation(role).find(
            (item) => item.key === 'analytics',
        );
        assert.deepEqual(
            group.children.map((item) => item.title),
            ['Sumber & Model', 'Pembiayaan', 'Mapping Area'],
        );
    }
    assert.equal(
        getNavigation('sales').some((item) => item.key === 'analytics'),
        false,
    );
});

test('exactly one analytics child is active despite report filters and preview sub-screens', () => {
    const group = getNavigation('admin').find(
        (item) => item.key === 'analytics',
    );
    for (const url of [
        '/analytics',
        '/analytics?period=2026-10&mode=achievement',
        '/analytics?preview=financing',
        '/analytics?preview=financing&screen=leasing',
        '/analytics?preview=mapping-area',
        '/analytics?preview=mapping-area&screen=master',
    ]) {
        assert.equal(isNavigationItemActive(group, url), true);
        assert.deepEqual(
            group.children.map((item) => isNavigationItemActive(item, url)),
            url.includes('preview=financing')
                ? [false, true, false]
                : url.includes('preview=mapping-area')
                  ? [false, false, true]
                  : [true, false, false],
        );
    }
    assert.equal(isNavigationItemActive(group, '/customers'), false);
    assert.equal(
        isNavigationItemActive(
            getNavigation('admin')[0],
            '/dashboard?period=2026-10',
        ),
        true,
    );
});

test('mobile more menu keeps nested analytics reachable even with a primary analytics shortcut', () => {
    for (const role of ['admin', 'supervisor', 'branch_manager']) {
        assert.equal(
            getMobileNavigation(role).more.find(
                (item) => item.key === 'analytics',
            ).children.length,
            3,
        );
    }
});
