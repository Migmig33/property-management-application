// Run with: node --test tests/unit-detail-availability.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const controller = fs.readFileSync(
    path.join(__dirname, '../WebApplication1/Scripts/Scripts/Controller.js'), 'utf8');

function loadDetail(unitResponse) {
    const start = controller.indexOf('$scope.getUnitDetail = function');
    const end = controller.indexOf('$scope.setSlide = function', start);
    assert.ok(start >= 0 && end > start);

    const scope = { showToast: () => assert.fail('Unexpected error toast') };
    const service = {
        GetUnitDetailService: () => Promise.resolve({ data: unitResponse })
    };
    vm.runInNewContext(controller.slice(start, end), {
        $scope: scope,
        service,
        setTimeout: fn => fn(),
        window: {}
    });
    return scope;
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('partly filled bedspace remains bookable on the unit-detail page', async () => {
    const scope = loadDetail({
        success: true,
        occupancy: 'Bedspace · 2 slot(s) open',
        isAvailable: true,
        unit: { joinable: true, slotsOpen: 2 },
        relatedUnits: []
    });
    scope.getUnitDetail();
    await settle();
    assert.equal(scope.isAvailable, true);
    assert.equal(scope.currentUnit.joinable, true);
    assert.equal(scope.unitOccupancy, 'Bedspace · 2 slot(s) open');
});

test('full occupied unit remains unavailable on the unit-detail page', async () => {
    const scope = loadDetail({
        success: true,
        occupancy: 'Occupied',
        isAvailable: false,
        unit: { joinable: false, slotsOpen: 0 },
        relatedUnits: []
    });
    scope.getUnitDetail();
    assert.equal(scope.unitDetailLoading, true);
    await settle();
    assert.equal(scope.isAvailable, false);
    assert.equal(scope.unitDetailLoading, false);
});

test('unit-detail skeleton is shown only while the request is loading', () => {
    const view = fs.readFileSync(
        path.join(__dirname, '../WebApplication1/Views/System/Renters/UnitDetails.cshtml'),
        'utf8');

    assert.match(view, /ng-if="unitDetailLoading"[\s\S]*?animate-pulse/);
    assert.match(view, /ng-if="!unitDetailLoading && !currentUnit"/);
    assert.match(view, /ng-if="!unitDetailLoading && currentUnit"/);
});

function loadBookingState(unit, verified) {
    const start = controller.indexOf('$scope.bookingOpen = false;');
    const end = controller.indexOf('function bkStartCooldown()', start);
    assert.ok(start >= 0 && end > start);
    const scope = { currentUnit: unit };
    vm.runInNewContext(controller.slice(start, end), {
        $scope: scope,
        service: {},
        Date
    });
    scope.bkVerified = verified;
    return scope;
}

test('opening a bedspace booking requires an explicit confirmation', () => {
    const scope = loadBookingState({ joinable: true, slotsOpen: 2 }, false);
    scope.openBooking();
    assert.equal(scope.bookingOpen, true);
    assert.equal(scope.bkStep, 'bedspace-confirm');
    assert.equal(scope.bkBedspaceConfirmed, false);

    scope.bkConfirmBedspace();
    assert.equal(scope.bkBedspaceConfirmed, true);
    assert.equal(scope.bkStep, 'auth');
});

test('verified guest continues to the calendar after confirming a bedspace', () => {
    const scope = loadBookingState({ joinable: true, slotsOpen: 1 }, true);
    scope.openBooking();
    scope.bkConfirmBedspace();
    assert.equal(scope.bkStep, 'calendar');
});

test('vacant whole-unit booking does not show the bedspace confirmation', () => {
    const scope = loadBookingState({ joinable: false }, false);
    scope.openBooking();
    assert.equal(scope.bkStep, 'auth');
});

test('booking submission includes the bedspace acknowledgement', async () => {
    const start = controller.indexOf('$scope.bkSubmit = function');
    const end = controller.indexOf('$scope.bkFormatDate = function', start);
    let payload;
    const scope = {
        bkSelectedDate: '2026-09-08',
        bkSelectedSlot: '08:00 AM',
        bkNotes: '',
        bkBedspaceConfirmed: true,
        bkLoadAvailability: () => {},
        showToast: () => {}
    };
    vm.runInNewContext(controller.slice(start, end), {
        $scope: scope,
        service: {
            SubmitVisitorBookingService: value => {
                payload = value;
                return Promise.resolve({ data: { success: true } });
            }
        }
    });
    scope.bkSubmit();
    await settle();
    assert.equal(payload.bedspaceConfirmed, true);
});

test('copy link creates a stable URL that contains the unit id', async () => {
    const start = controller.indexOf('$scope.currentUnit = null;');
    const end = controller.indexOf('// 17. BOOKING MODAL', start);
    assert.ok(start >= 0 && end > start);

    let copiedText = '';
    let toast = null;
    const browserWindow = {
        location: {
            origin: 'https://rentals.example',
            protocol: 'https:',
            host: 'rentals.example'
        },
        navigator: {
            clipboard: {
                writeText: text => {
                    copiedText = text;
                    return Promise.resolve();
                }
            }
        }
    };
    const scope = {
        showToast: (message, type) => { toast = { message, type }; }
    };

    vm.runInNewContext(controller.slice(start, end), {
        $scope: scope,
        $window: browserWindow,
        window: browserWindow,
        document: {},
        service: {},
        setTimeout: () => 0,
        encodeURIComponent
    });

    scope.currentUnit = { id: 42 };
    scope.copyUnitLink();
    await settle();

    assert.equal(copiedText, 'https://rentals.example/System/RentersUnitDetails?id=42');
    assert.deepEqual(toast, {
        message: 'Unit link copied to your clipboard.',
        type: 'success'
    });
});

test('unit details removes favorites and exposes the working copy-link control', () => {
    const view = fs.readFileSync(
        path.join(__dirname, '../WebApplication1/Views/System/Renters/UnitDetails.cshtml'),
        'utf8');
    const systemController = fs.readFileSync(
        path.join(__dirname, '../WebApplication1/Controllers/SystemController.cs'),
        'utf8');

    assert.doesNotMatch(view, /ng-click="liked = !liked"|aria-label="Like unit"/);
    assert.match(view, /ng-click="copyUnitLink\(\)"/);
    assert.match(systemController, /RentersUnitDetails\(int\? id\)[\s\S]*?Session\["SelectedUid"\] = id\.Value;/);
});
