// Run with: node --test tests/tenant-id-upload.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const scripts = path.join(__dirname, '../WebApplication1/Scripts/Scripts');
const controller = fs.readFileSync(path.join(scripts, 'Controller.js'), 'utf8');

function loadScopeFunction(name, nextMarker, scope, globals = {}) {
    const start = controller.indexOf('$scope.' + name + ' = function');
    const end = controller.indexOf(nextMarker, start);
    assert.ok(start >= 0 && end > start);
    vm.runInNewContext(controller.slice(start, end), { $scope: scope, ...globals });
}

test('multipart request sends two large files without base64, preserving occupants and deletions', async () => {
    let service, request;
    vm.runInNewContext(fs.readFileSync(path.join(scripts, 'Service.js'), 'utf8'), {
        FormData,
        angular: { identity: value => value },
        app: { service: (_, constructor) => { service = new constructor(config => { request = config; }); } }
    });
    const bytes = Buffer.alloc(3 * 1024 * 1024, 7);
    const file = new Blob([bytes], { type: 'image/jpeg' });
    service.saveTenantService(
        { name: 'Test Tenant', leaseStart: '2026-09-07', deletedCoOccupants: [12], phone: null },
        [{ id: 8, name: 'Occupant', phone: '123', address: 'Address' }],
        [{ fileObj: file, name: 'front.jpg', url: 'data:image/jpeg;base64,unused' },
            { fileObj: file, name: 'back.jpg' }, { id: 45, url: 'data:image/png;base64,legacy' }],
        9, [44]
    );
    assert.equal(request.headers['Content-Type'], undefined);
    assert.equal(request.data.get('tenantData.name'), 'Test Tenant');
    assert.equal(request.data.get('tenantData.deletedCoOccupants[0]'), '12');
    assert.equal(request.data.get('coOccupants[0].id'), '8');
    assert.equal(request.data.get('deletedDocumentIds[0]'), '44');
    assert.equal(request.data.get('id'), '9');
    assert.equal(request.data.has('tenantData.phone'), false);
    const uploads = request.data.getAll('idUploads');
    assert.equal(uploads.length, 2);
    assert.equal(uploads[0].name, 'front.jpg');
    assert.deepEqual(Buffer.from(await uploads[0].arrayBuffer()), bytes);
    assert.equal([...request.data.keys()].some(key => /url|idFiles/.test(key)), false);
});

function saveScope(result) {
    const toasts = [];
    const scope = {
        name: 'Test Tenant', email: 'tenant@example.test', occupancyTypeId: 1, unitId: 3,
        leaseStart: new Date(2026, 8, 7), leaseEnd: new Date(2027, 8, 7),
        editorModal: true, usesCoOccupants: () => false,
        showToast: (message, type) => toasts.push({ message, type })
    };
    loadScopeFunction('saveTenant', '$scope.triggerConfirmDeleteTenant', scope, {
        service: { saveTenantService: () => result() }
    });
    return { scope, toasts };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('HTTP and server validation failures retain the form and display errors', async () => {
    for (const result of [
        () => Promise.reject({ status: 500, data: '<html>Error</html>' }),
        () => Promise.resolve({ data: { success: false, message: 'Invalid ID image' } })
    ]) {
        const { scope, toasts } = saveScope(result);
        scope.saveTenant();
        await settle();
        assert.equal(scope.editorModal, true);
        assert.equal(scope.name, 'Test Tenant');
        assert.equal(scope.savingTenant, false);
        assert.equal(toasts[0].type, 'error');
    }
});

test('successful save closes the form and refreshes tenants', async () => {
    const { scope } = saveScope(() => Promise.resolve({ data: { success: true, message: 'Saved' } }));
    let refreshed = false;
    scope.getAllTenants = () => { refreshed = true; };
    scope.saveTenant();
    await settle();
    assert.equal(scope.editorModal, false);
    assert.equal(scope.savingTenant, false);
    assert.equal(refreshed, true);
});

test('save waits for file reading and suppresses duplicate submissions', async () => {
    let calls = 0, finish;
    const { scope } = saveScope(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
    scope.readingIdFile = true;
    scope.saveTenant();
    assert.equal(calls, 0);
    scope.readingIdFile = false;
    scope.saveTenant();
    scope.saveTenant();
    assert.equal(calls, 1);
    finish({ data: { success: true } });
    await settle();
});

test('file read failures release the save guard; oversized images are rejected', () => {
    let reader;
    const toasts = [];
    const scope = { $apply: fn => fn(), showToast: message => toasts.push(message) };
    loadScopeFunction('handleIdUpload', '$scope.deletedDocumentIds =', scope, {
        FileReader: class { constructor() { reader = this; } readAsDataURL() {} },
        document: { getElementById: () => ({ value: '' }) }
    });
    scope.handleIdUpload([{ type: 'image/jpeg', name: 'large.jpg', size: 11 * 1024 * 1024 }]);
    assert.match(toasts[0], /10 MB/);
    assert.equal(reader, undefined);
    const file = { type: 'image/png', name: 'front.png', size: 123 };
    scope.handleIdUpload([file]);
    assert.equal(scope.readingIdFile, true);
    reader.onerror();
    assert.equal(scope.readingIdFile, false);
    assert.equal(scope.idFiles.length, 0);
    scope.handleIdUpload([file]);
    reader.onload({ target: { result: 'data:image/png;base64,test' } });
    assert.equal(scope.readingIdFile, false);
    assert.equal(scope.idFiles[0].fileObj, file);
});
