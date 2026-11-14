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

test('exactly one analytics child is active despite report filters', () => {
    const group = getNavigation('admin').find(
        (item) => item.key === 'analytics',
    );
    for (const url of [
        '/analytics',
        '/analytics?period=2026-10&mode=achievement',
        '/analytics/financing',
        '/analytics/financing?from=2026-10&to=2026-11&mode=do',
        '/analytics/mapping-area',
        '/analytics/mapping-area?from=2026-10&to=2026-11',
    ]) {
        assert.equal(isNavigationItemActive(group, url), true);
        assert.deepEqual(
            group.children.map((item) => isNavigationItemActive(item, url)),
            url.includes('/analytics/financing')
                ? [false, true, false]
                : url.includes('/analytics/mapping-area')
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

test('calendar is offered to sales and supervisors only', () => {
    for (const [role, expected] of [
        ['sales', true],
        ['supervisor', true],
        ['branch_manager', false],
        ['admin', false],
    ]) {
        const item = getNavigation(role).find((nav) => nav.key === 'calendar');
        assert.equal(!!item, expected);
        if (expected) {
            assert.equal(item.href, '/kalender');
            assert.equal(
                getMobileNavigation(role).more.some(
                    (nav) => nav.key === 'calendar',
                ),
                true,
            );
        }
    }
});
