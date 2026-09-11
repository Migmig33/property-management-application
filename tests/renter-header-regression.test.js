const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const controller = fs.readFileSync(
    path.join(root, 'WebApplication1', 'Scripts', 'Scripts', 'Controller.js'),
    'utf8');
const layout = fs.readFileSync(
    path.join(root, 'WebApplication1', 'Views', 'Shared', '_RentersLayout.cshtml'),
    'utf8');

function loadMyBookings(serviceOverrides) {
    const start = controller.indexOf('$scope.mbVerified = false;');
    const end = controller.indexOf('// 19. VISITOR SESSION', start);
    assert.ok(start >= 0 && end > start);

    const scope = {
        visitorName: '',
        showToast: () => {},
        goToUnit: () => {}
    };
    const service = Object.assign({
        GetMyBookingsService: () => Promise.resolve({
            data: { success: true, verified: true, data: [] }
        }),
        VerifyVisitorOtpService: () => Promise.resolve({
            data: { success: true, name: 'Verified Visitor' }
        }),
        ClearVisitorSessionService: () => Promise.resolve({
            data: { success: true }
        }),
        CancelMyBookingService: () => Promise.resolve({
            data: { success: true }
        })
    }, serviceOverrides);
    const interval = () => 0;
    interval.cancel = () => {};

    vm.runInNewContext(controller.slice(start, end), {
        $scope: scope,
        service,
        $interval: interval,
        document: { getElementById: () => ({ focus: () => {} }) },
        Object
    });

    return scope;
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('renter logo navigates to the renter home page', () => {
    assert.match(
        layout,
        /<button[^>]*ng-click="goTo\('Home'\)"[^>]*aria-label="Go to renter home"/
    );
    assert.match(layout, /Controller\.js\?v=20260911-unit-detail-skeleton/);
});

test('My Bookings OTP verification updates the shared header name', async () => {
    const scope = loadMyBookings();
    scope.mbOtp = ['1', '2', '3', '4', '5', '6'];
    scope.mbVerify();
    await settle();

    assert.equal(scope.visitorName, 'Verified Visitor');
});

test('My Bookings sign out clears the shared header name', async () => {
    const scope = loadMyBookings();
    scope.visitorName = 'Verified Visitor';
    scope.mbSignOut();
    await settle();

    assert.equal(scope.visitorName, '');
    assert.equal(scope.mbVerified, false);
});
