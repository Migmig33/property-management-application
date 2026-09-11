const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const controllerPath = path.join(root, 'WebApplication1', 'Scripts', 'Scripts', 'Controller.js');
const controllerSource = fs.readFileSync(controllerPath, 'utf8');

function createController(serviceOverrides = {}, confirmResult = true) {
    let factory;
    const browserWindow = {
        location: { href: '' },
        confirm: () => confirmResult
    };
    const context = {
        app: { controller: (_name, value) => { factory = value; } },
        console: { log: () => {} },
        window: browserWindow,
        document: {},
        sessionStorage: { setItem: () => {}, getItem: () => null, removeItem: () => {} },
        confirm: () => confirmResult,
        setTimeout: () => 0,
        clearTimeout: () => {}
    };

    vm.runInNewContext(controllerSource, context, { filename: controllerPath });
    assert.equal(typeof factory, 'function');

    const scope = {};
    const timeout = () => 0;
    timeout.cancel = () => {};
    const interval = () => 0;
    interval.cancel = () => {};
    const http = () => Promise.resolve({ data: {} });
    http.get = http.post = () => Promise.resolve({ data: {} });
    const service = new Proxy(serviceOverrides, {
        get(target, property) {
            if (property in target) return target[property];
            return () => Promise.resolve({ data: { success: true } });
        }
    });

    factory(service, scope, timeout, interval, http, { trustAsResourceUrl: value => value }, browserWindow);
    return { scope, browserWindow };
}

async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
}

test('dashboard route keys navigate to the manager and audit pages', () => {
    const { scope, browserWindow } = createController();

    scope.goTo('AdminManagers');
    assert.equal(browserWindow.location.href, '/System/AdminManagers');
    scope.goTo('AdminLogs');
    assert.equal(browserWindow.location.href, '/System/AdminLogs');

    const dashboard = fs.readFileSync(path.join(root, 'WebApplication1', 'Views', 'System', 'SuperAdmin', 'Dashboard.cshtml'), 'utf8');
    assert.doesNotMatch(dashboard, /goTo\('Managers'\)|goTo\('AuditTrail'\)/);
});

test('manager create and edit forms keep numeric MVC role values', () => {
    const { scope } = createController();

    scope.openCreate();
    assert.equal(scope.form.role, 2);
    scope.openEdit({ id: 10, name: 'Manager', email: 'manager@example.com', role: 'property_manager' });
    assert.equal(scope.form.role, 2);
    scope.openEdit({ id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin' });
    assert.equal(scope.form.role, 1);
    scope.openEdit({ id: 12, name: 'Legacy', email: 'legacy@example.com', role: 'invalid' });
    assert.equal(scope.form.role, 2);
});

test('manager modal close controls use the manager-specific handler', () => {
    const { scope } = createController();
    scope.modalOpen = true;
    scope.selectedBooking = { id: 7 };

    scope.closeManagerModal();
    assert.equal(scope.modalOpen, false);
    assert.deepEqual(scope.selectedBooking, { id: 7 });

    const view = fs.readFileSync(path.join(root, 'WebApplication1', 'Views', 'System', 'SuperAdmin', 'Managers.cshtml'), 'utf8');
    assert.doesNotMatch(view, /ng-click="closeModal\(\)"|handleToggleStatus/);
    assert.match(view, /<option ng-value="2">Property Manager<\/option>/);
});

test('amenity mutations provide feedback and suppress duplicate requests', async () => {
    let addCalls = 0;
    let deleteCalls = 0;
    const service = {
        AddAmenityService: payload => {
            addCalls++;
            return Promise.resolve({ data: { success: true, id: 9, name: payload.name } });
        },
        DeleteAmenityService: () => {
            deleteCalls++;
            return Promise.resolve({ data: { success: false, message: 'Amenity is assigned.' } });
        }
    };
    const { scope } = createController(service);
    scope.amenities = [{ id: 1, name: 'Pool' }];

    scope.amenityForm.name = '   ';
    scope.addAmenity();
    assert.equal(addCalls, 0);
    assert.equal(scope.toast.message, 'Enter an amenity name.');

    scope.amenityForm.name = 'pool';
    scope.addAmenity();
    assert.equal(addCalls, 0);
    assert.equal(scope.toast.message, 'That amenity already exists.');

    scope.amenityForm.name = 'Gym';
    scope.addAmenity();
    await flushPromises();
    assert.equal(addCalls, 1);
    assert.equal(scope.amenities.at(-1).name, 'Gym');
    assert.equal(scope.amenityForm.name, '');
    assert.equal(scope.toast.message, 'Amenity added.');

    scope.removeItem(scope.amenities[0]);
    await flushPromises();
    assert.equal(deleteCalls, 1);
    assert.equal(scope.toast.message, 'Amenity is assigned.');
    assert.equal(scope.deletingAmenityId, null);
});

test('amenity add control submits through its dedicated handler', () => {
    const view = fs.readFileSync(path.join(root, 'WebApplication1', 'Views', 'System', 'SuperAdmin', 'Table.cshtml'), 'utf8');

    assert.match(view, /<form[^>]*class="flex gap-2 max-w-sm"[\s\S]*?ng-submit="addAmenity\(\)"/);
    assert.match(view, /ng-model="amenityForm\.name"/);
    assert.doesNotMatch(view, /ng-model="newAmenity"/);
    assert.match(view, /<button type="submit"/);
    assert.doesNotMatch(view, /ng-click="addItem\(\)"|ng-keydown=.*addItem\(\)/);
});

test('superadmin uses one top-right toast shared by managers and amenities', () => {
    const layout = fs.readFileSync(path.join(root, 'WebApplication1', 'Views', 'Shared', '_SuperAdminLayout.cshtml'), 'utf8');
    const amenities = fs.readFileSync(path.join(root, 'WebApplication1', 'Views', 'System', 'SuperAdmin', 'Table.cshtml'), 'utf8');

    assert.match(layout, /ng-show="toastShow"[\s\S]*?class="[^"]*top-4 right-4[^"]*"/);
    assert.doesNotMatch(layout, /left-1\/2|-translate-x-1\/2/);
    assert.doesNotMatch(amenities, /toast\.show/);
});

test('amenity service uses MVC form binding and includes the anti-forgery token', () => {
    const serviceSource = fs.readFileSync(path.join(root, 'WebApplication1', 'Scripts', 'Scripts', 'Service.js'), 'utf8');
    let ServiceConstructor;
    vm.runInNewContext(serviceSource, {
        FormData,
        document: { querySelector: () => ({ value: 'anti-forgery-token' }) },
        angular: {
            extend: (target, values) => Object.assign(target, values),
            identity: value => value
        },
        app: { service: (_name, value) => { ServiceConstructor = value; } }
    });

    let request;
    const service = new ServiceConstructor(config => { request = config; });
    service.AddAmenityService({ name: 'Gym' });

    assert.equal(request.headers['Content-Type'], 'application/x-www-form-urlencoded; charset=UTF-8');
    assert.match(request.data, /(?:^|&)name=Gym(?:&|$)/);
    assert.match(request.data, /(?:^|&)__RequestVerificationToken=anti-forgery-token(?:&|$)/);
});

test('superadmin data and mutation endpoints require the expected filters', () => {
    const source = fs.readFileSync(path.join(root, 'WebApplication1', 'Controllers', 'SystemController.cs'), 'utf8');
    for (const action of ['GetDashboardDataAdmin', 'GetManagers', 'GetAuditLogs']) {
        const pattern = new RegExp(`\\[CheckSession\\(AllowedRoles = new\\[\\] \\{ 1 \\}\\)\\]\\s+public (?:ActionResult|JsonResult) ${action}\\(`);
        assert.match(source, pattern, action);
    }
    for (const action of ['CreateManager', 'UpdateManager', 'DeleteManager']) {
        const pattern = new RegExp(`\\[CheckSession\\(AllowedRoles = new\\[\\] \\{ 1 \\}\\)\\]\\s+\\[ValidateJsonAntiForgeryToken\\]\\s+public JsonResult ${action}\\(`);
        assert.match(source, pattern, action);
    }
    for (const action of ['AddAmenity', 'DeleteAmenity']) {
        const pattern = new RegExp(`\\[CheckSession\\(AllowedRoles = new\\[\\] \\{ 1 \\}\\)\\]\\s+\\[ValidateAntiForgeryToken\\]\\s+public JsonResult ${action}\\(`);
        assert.match(source, pattern, action);
    }
});
