// Offline audit. Executes selected, unchanged application functions in isolated VMs.
// All database, network, storage and Drive APIs are mocks. No production calls.
// Run: node audit/system-audit.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const app = read('app.js');
const gifts = read('gifts_module/js/gifts.js');
const job = read('backend-jobs/publish_story_job.js');
const quiet = { log() {}, warn() {}, error() {} };
const results = [];
const controls = [];
function section(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, 'Source boundaries found');
  return source.slice(a, b);
}
function context(extra = {}) {
  return vm.createContext({ console: quiet, URL, URLSearchParams, FormData,
    Date, setTimeout, clearTimeout, window: {}, ...extra });
}
function database(resolveQuery) {
  const calls = [];
  return { calls, from(table) {
    const query = { table, op: 'select', filters: [] };
    const chain = {};
    for (const m of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'ilike', 'order', 'limit', 'range', 'single']) {
      chain[m] = (...args) => {
        if (['insert', 'update', 'upsert', 'delete'].includes(m)) { query.op = m; query.payload = args[0]; }
        if (m === 'eq' || m === 'ilike') query.filters.push([m, ...args]);
        return chain;
      };
    }
    chain.then = (ok, fail) => {
      calls.push(structuredClone(query));
      return Promise.resolve(resolveQuery(query)).then(ok, fail);
    };
    return chain;
  } };
}
const denied = () => ({ data: null, error: { message: 'MOCK permission denied' } });
const accepted = () => ({ data: [], error: null });
function interceptor(db, extra = {}) {
  const c = context({ supabase: db, updateCustomerStatsInDatabase: async () => {}, ...extra });
  vm.runInContext(section(app, 'async function handleSupabaseRequest(', 'window.formatTimeInput ='), c);
  return c;
}
async function request(c, values) {
  return (await c.handleSupabaseRequest('http://localhost', { body: new URLSearchParams(values) })).json();
}
async function test(name, fn) {
  try { await fn(); results.push({ name, status: 'REPRODUCED' }); }
  catch (e) { results.push({ name, status: 'HARNESS_FAILURE', error: e.message }); }
}
async function main() {
  const syntax = [];
  for (const f of ['app.js', 'email_service.js', 'gifts_module/js/gifts.js',
    'gifts_module/apps_script/google_drive_script.js', 'backend-jobs/publish_story_job.js', 'backend-jobs/send_weekly_report.js']) {
    new vm.Script(read(f), { filename: f }); syntax.push(f);
  }
  const html = [];
  for (const f of ['index.html', 'admin.html', 'gifts_module/html/gifts.html', 'gifts_module/html/gifts_reports.html']) {
    const s = read(f), ids = new Map(); let blocks = 0;
    for (const m of s.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)) {
      ids.set(m[1], [...(ids.get(m[1]) || []), s.slice(0, m.index).split('\n').length]);
    }
    for (const m of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      if (/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1])) continue;
      new vm.Script(m[2], { filename: f }); blocks++;
    }
    html.push({ file: f, inlineBlocksChecked: blocks, duplicateIds: [...ids].filter(([, lines]) => lines.length > 1) });
  }
  await test('A01: addShipping reports success after database denial', async () => {
    const result = await request(interceptor(database(denied)), { action: 'addShipping', name: 'MOCK' });
    assert.equal(result.success, true);
  });
  await test('A02: deleteShipping reports success after secureDelete denies deletion', async () => {
    const c = interceptor(database(accepted)); c.window.secureDelete = async () => ({ error: 'Unauthorized' });
    assert.equal((await request(c, { action: 'deleteShipping', name: 'MOCK' })).success, true);
  });
  await test('A03: unknown action reports success', async () => {
    assert.equal((await request(interceptor(database(accepted)), { action: 'MOCK_UNKNOWN_ACTION' })).success, true);
  });
  await test('A04: deleteUser ignores username supplied by its caller', async () => {
    let args; const c = interceptor(database(accepted));
    c.window.secureDelete = async (...a) => { args = a; return { error: null }; };
    await request(c, { action: 'deleteUser', username: 'MOCK_USER' });
    assert.equal(args[2], undefined);
  });
  await test('A05: simultaneous orders calculate identical order IDs', async () => {
    const inserted = [];
    const db = database(q => {
      if (q.op === 'insert') { inserted.push(q.payload[0]); return { data: [q.payload[0]], error: null }; }
      return { data: [{ order_id: 'CANDY-000100' }], error: null };
    });
    const c = interceptor(db);
    await Promise.all([request(c, { action: 'addOrder' }), request(c, { action: 'addOrder' })]);
    assert.equal(inserted.length, 2); assert.equal(inserted[0].order_id, inserted[1].order_id);
  });
  await test('A06: settlement changes total without updating outstanding balance', async () => {
    const db = database(accepted);
    await request(interceptor(db), { action: 'settleOrder', orderId: 'MOCK', finalTotal: '80' });
    const update = db.calls.find(q => q.op === 'update').payload;
    assert.equal(update.final_total, '80'); assert.equal('remaining' in update, false);
  });
  await test('A07: checkout overwrites an already closed attendance record', async () => {
    const db = database(q => q.op === 'select' ? { data: [{ id: 'MOCK', date: '2026-10-25', status: 'حاضر', check_in: '09:00 AM', check_out: '05:00 PM' }], error: null } : accepted());
    const c = interceptor(db, { calculateAttendanceHoursString: () => '10 ساعة' });
    await request(c, { action: 'checkOut', employeeName: 'MOCK', date: '2026-10-25' });
    assert(db.calls.some(q => q.op === 'update'));
  });
  await test('A08: cached session survives server response showing suspended user', async () => {
    let loginShown = false;
    const stored = JSON.stringify({ username: 'MOCK', permissions: 'create' });
    const c = context({ currentUser: null, localStorage: { getItem: () => stored, removeItem() {}, setItem() {} },
      document: { getElementById: () => ({ style: {} }) }, applyPermissions() {}, showLogin() { loginShown = true; } });
    c.window.location = { pathname: '/index.html' };
    c.window.supabase = database(() => ({ data: { status: 'موقوف', permissions: 'create' }, error: null }));
    vm.runInContext(section(app, 'function checkSession()', 'function deprecatedHandleLogin('), c);
    c.checkSession(); await new Promise(r => setImmediate(r));
    assert(c.currentUser); assert.equal(loginShown, false);
  });
  await test('A09: stale offer save upserts unrelated offers and old publication state', async () => {
    const db = database(accepted), c = context({ localStorage: { setItem() {} } });
    c.window.offersData = [{ id: 'MOCK_1', remaining_quantity: 4 }, { id: 'MOCK_2', last_story_published_at: 0 }];
    c.window.supabase = db; c.window.sanitizeOfferForSupabase = x => x;
    vm.runInContext(section(app, 'window.saveOffersDataLocallyAndRemote =', '// 3. التحقق التلقائي'), c);
    await c.window.saveOffersDataLocallyAndRemote();
    assert.equal(db.calls[0].payload.length, 2); assert.equal(db.calls[0].payload[1].last_story_published_at, 0);
  });
  const giftMethod = (start, end) => vm.runInNewContext('({' + section(gifts, start, end).trim().replace(/,$/, '') + '})',
    { console: quiet, GIFTS_TABLE: 'gifts', confirm: () => true, localStorage: { getItem: () => null } });
  await test('A10: failed cloud bouquet deletion still removes it locally', async () => {
    const c = context({ confirm: () => true, GIFTS_TABLE: 'gifts' });
    vm.runInContext('this.obj = ({' + section(gifts, 'async deleteBouquet(id)', 'setShowcaseFilter(').trim().replace(/,$/, '') + '})', c);
    c.obj.state = { bouquets: [{ id: 'MOCK', name: 'MOCK' }] }; c.obj.getSupabase = () => database(denied);
    for (const m of ['saveBouquetsToLocal', 'updateHeaderStats', 'renderShowcase', 'showToastNotification']) c.obj[m] = () => {};
    await c.obj.deleteBouquet('MOCK'); assert.equal(c.obj.state.bouquets.length, 0);
  });
  await test('A11: successful cloud reload discards unsynchronized local bouquet', async () => {
    const obj = giftMethod('async loadBouquets()', 'saveBouquetsToLocal() {');
    obj.state = { bouquets: [{ id: 'MOCK_LOCAL_ONLY' }] };
    obj.getSupabase = () => database(accepted); obj.saveBouquetsToLocal = () => {};
    await obj.loadBouquets(); assert.equal(obj.state.bouquets.length, 0);
  });
  const backendSource = job.slice(0, job.lastIndexOf('main().catch('));
  async function runStory(offer, igSuccess = true, fbSuccess = true) {
    const c = context({ require: () => ({}), process: { env: {}, exit() {} } });
    vm.runInContext(backendSource, c);
    const patches = []; let ig = 0, fb = 0;
    c.supabaseRequest = async (p, method, payload) => {
      if (method === 'PATCH') { patches.push(payload); return { status: 200, data: [] }; }
      return { status: 200, data: [offer] };
    };
    c.publishToInstagramStory = async () => { ig++; return { success: igSuccess }; };
    c.publishToFacebookStory = async () => { fb++; return { success: fbSuccess }; };
    await c.main(); return { ig, fb, patches };
  }
  await test('A12: backend publishes expired date-based offer', async () => {
    const r = await runStory({ id: 'MOCK', image_url: 'https://mock.invalid/image.jpg', expiry_type: 'date', expiry_date: '2000-01-01', is_active: true });
    assert.equal(r.ig, 1);
  });
  await test('A13: backend publishes exhausted count-based recurring story', async () => {
    const r = await runStory({ id: 'MOCK', image_url: 'https://mock.invalid/image.jpg', expiry_type: 'quantity', quantity_mode: 'publish_count', remaining_quantity: 0, is_active: true });
    assert.equal(r.ig, 1);
  });
  await test('A14: one-platform failure still advances shared publication timestamp', async () => {
    const r = await runStory({ id: 'MOCK', image_url: 'https://mock.invalid/image.jpg', is_active: true }, true, false);
    assert.equal(r.fb, 1); assert.equal(r.patches.length, 1); assert(r.patches[0].last_story_published_at > 0);
  });
  await test('A15: backend passes full Supabase URL as hostname without normalization', async () => {
    let hostname;
    const https = { request(options, cb) {
      hostname = options.hostname;
      return { on() {}, write() {}, end() { const handlers = {}; cb({ statusCode: 200, on(e, fn) { handlers[e] = fn; } }); handlers.data('[]'); handlers.end(); } };
    } };
    const c = context({ require: () => https, process: { env: { SUPABASE_URL: 'https://mock.invalid' } } });
    vm.runInContext(backendSource, c); await c.supabaseRequest('/rest/v1/mock');
    assert.equal(hostname, 'https://mock.invalid');
  });
  await test('A16: Drive handler permits unauthenticated deletion of arbitrary accessible file', async () => {
    let trashed;
    const c = context({ DriveApp: { getFileById(id) { return { setTrashed() { trashed = id; } }; } },
      ContentService: { MimeType: { JSON: 'json' }, createTextOutput(s) { return { setMimeType() { return JSON.parse(s); } }; } } });
    vm.runInContext(read('gifts_module/apps_script/google_drive_script.js'), c);
    const r = c.doPost({ postData: { contents: JSON.stringify({ action: 'delete', fileId: 'MOCK_OUTSIDE_FOLDER' }) } });
    assert.equal(trashed, 'MOCK_OUTSIDE_FOLDER'); assert.equal(r.status, 'success');
  });
  await test('A17: failed replacement upload trashes original image first', async () => {
    let deleted = false;
    const c = context({ DriveApp: { getFileById() { return { setTrashed() { deleted = true; } }; } },
      ContentService: { MimeType: { JSON: 'json' }, createTextOutput(s) { return { setMimeType() { return JSON.parse(s); } }; } } });
    vm.runInContext(read('gifts_module/apps_script/google_drive_script.js'), c);
    const r = c.doPost({ postData: { contents: JSON.stringify({ deleteFileId: 'MOCK_OLD_IMAGE' }) } });
    assert.equal(deleted, true); assert.equal(r.status, 'error');
  });
  await test('A18: fractional product quantity is truncated when deducting offer stock', async () => {
    const c = context({ document: { querySelectorAll: () => [{ dataset: { offerId: 'MOCK' }, querySelector(s) { return { value: s.includes('qty') ? '0.5' : 'MOCK' }; } }] } });
    c.window.offersData = [{ id: 'MOCK', expiry_type: 'quantity', quantity_mode: 'custom', remaining_quantity: 5 }];
    c.window.saveOffersDataLocallyAndRemote = async () => {}; c.window.updateOffersStats = () => {};
    vm.runInContext(app.slice(app.indexOf('window.decrementOffersFromOrderProducts = async function')), c);
    await c.window.decrementOffersFromOrderProducts(); assert.equal(c.window.offersData[0].remaining_quantity, 4);
  });
  await test('A19: history renderer inserts customer-provided HTML without escaping', async () => {
    const created = [], container = { innerHTML: '', appendChild(e) { created.push(e); } };
    const c = context({ currentHistoryPage: 1, ITEMS_PER_PAGE: 20, currentOrdersList: [],
      document: { getElementById(id) { return id === 'historyListContainer' ? container : null; },
        createElement() { return { style: {}, innerHTML: '' }; } } });
    const payload = '<img src=x onerror="window.MOCK_XSS=true">';
    vm.runInContext(section(app, 'function renderHistoryList(', 'function setupPhoneSanitizer('), c);
    c.renderHistoryList([{ id: 'MOCK', name: payload, status: 'قيد التجهيز', phone: 'MOCK', total: 1 }]);
    assert(created.some(el => el.innerHTML.includes(payload)));
  });
  await test('A20: users with expiry-only or inventory-only permission cannot load their base data', async () => {
    const c = context();
    vm.runInContext(section(app, 'window.shouldLoadCoreOrdersData = function', 'async function loadDataFromServer('), c);
    for (const permissions of ['expiry', 'inventory', 'waitlist', 'pricetags']) {
      c.window.currentUser = { permissions }; assert.equal(c.window.shouldLoadCoreOrdersData(), false);
    }
  });
  await test('A21: logout retains cleartext password in sessionStorage', async () => {
    let removedPassword = false;
    const c = context({ localStorage: { removeItem() {} }, sessionStorage: { removeItem() { removedPassword = true; }, clear() { removedPassword = true; } } });
    c.window.location = { reload() {} };
    vm.runInContext(section(app, 'window.handleLogout =', 'window.ensureGiftsReportsElements ='), c);
    c.window.handleLogout(); assert.equal(removedPassword, false);
  });
  await test('A22: weekly reader treats HTTP 403 as an empty successful dataset', async () => {
    const https = { request(options, cb) {
      return { on() {}, end() { const handlers = {}; cb({ statusCode: 403, on(e, fn) { handlers[e] = fn; } }); handlers.data('{"message":"MOCK denied"}'); handlers.end(); } };
    } };
    const c = context({ require: () => https });
    vm.runInContext(section(read('backend-jobs/send_weekly_report.js'), 'const https', 'const sendEmailJS =') + '\nthis.reader = fetchAllFromSupabase;', c);
    const data = await c.reader('/rest/v1/mock'); assert.equal(data.length, 0);
  });
  await test('A23: sequential publication retries after database patch failure can duplicate an existing story', async () => {
    const c = context({ require: () => ({}), process: { env: {} } });
    vm.runInContext(backendSource, c);
    let publications = 0;
    c.supabaseRequest = async (p, method) => method === 'PATCH' ? { status: 500, data: {} }
      : { status: 200, data: [{ id: 'MOCK', image_url: 'https://mock.invalid/image.jpg', is_active: true, last_story_published_at: 0 }] };
    c.publishToInstagramStory = async () => { publications++; return { success: true }; };
    c.publishToFacebookStory = async () => ({ success: false });
    await c.main(); await c.main(); assert.equal(publications, 2);
  });
  await test('A24: legacy expiry update filters quantity although active data mapping uses qty', async () => {
    const db = database(accepted);
    await request(interceptor(db), { action: 'updateExpiryItemData', id: 'MOCK_PRODUCT|10|2027-01-01', qty: '9' });
    assert(db.calls[0].filters.some(f => f[1] === 'quantity'));
    assert.equal(db.calls[0].payload.qty, '9');
  });
  // Positive and negative controls ensure the harness also recognizes working paths.
  const c = interceptor(database(q => q.op === 'insert' ? denied() : accepted()));
  assert.equal((await request(c, { action: 'addOrder' })).success, false);
  controls.push('addOrder returns success:false when insertion fails');
  assert.equal((await request(c, { action: 'checkIn', employeeName: 'MOCK' })).success, false);
  controls.push('checkIn returns success:false when insertion fails');
  const helperContext = context();
  vm.runInContext(section(app, 'function parseAttendanceTimeToMinutes(', 'function formatHoursDisplay('), helperContext);
  assert.equal(helperContext.calculateAttendanceHoursString('10:00 PM', '06:00 AM', '2026-10-24', '2026-10-25'), '8 ساعة');
  controls.push('overnight attendance duration is correctly calculated as 8 hours');
  const pagingContext = context();
  vm.runInContext(section(app, 'async function fetchAllSupabaseRows(', '// 🛡️ Secure Delete Wrapper'), pagingContext);
  const ranges = [];
  const paged = await pagingContext.fetchAllSupabaseRows({ range(a, b) { ranges.push([a, b]); return Promise.resolve({ data: Array.from({ length: a === 0 ? 1000 : 2 }, (_, i) => a + i), error: null }); } });
  assert.equal(paged.data.length, 1002); assert.equal(ranges.length, 2);
  controls.push('shared pagination helper retrieves 1002 records across two pages');
  const report = { scope: 'Offline source and isolated mocked behavior audit; no live database, messaging or publishing',
    syntaxChecked: syntax, html, scenarios: results, controls,
    counts: { reproduced: results.filter(x => x.status === 'REPRODUCED').length, harnessFailures: results.filter(x => x.status === 'HARNESS_FAILURE').length } };
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (report.counts.harnessFailures) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
