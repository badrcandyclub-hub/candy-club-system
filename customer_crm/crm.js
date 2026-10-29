/* Independent, read-only customer pages. No CRM editors, campaigns or filters. */
(function (window, document) {
    'use strict';
    const M = window.CandyCRMModel;
    if (!M)
        return;
    const titles = { online: 'عملاء الأونلاين', store: 'عملاء المحل', gifts: 'عملاء الهدايا', talabat: 'عملاء طلبات', instashop: 'عملاء إنستا شوب' };
    const sourceData = { customers: [], orders: [], profiles: [], gifts: [], legacyGifts: [] };
    const pages = new Map(), groups = { core: { loaded: false, pending: null, error: '', profilesUnavailable: false }, gifts: { loaded: false, pending: null, error: '' } };
    let directories = M.buildDirectories(sourceData);
    const esc = M.escapeHTML;
    const icon = name => '<span class="customer-symbol customer-symbol-' + name + '" aria-hidden="true"></span>';
    const money = value => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(Number(value) || 0) + ' ج.م';
    const phone = value => /^201[0125]\d{8}$/.test(String(value)) ? '0' + String(value).slice(2) : M.plainText(value);
    const date = value => String(value || '').slice(0, 10) || '—';
    function allowed() { let u = null; try {
        u = JSON.parse(localStorage.getItem('cc_user') || 'null');
    }
    catch (_) { } const perms = String(u && u.permissions || '').split(',').map(p => p.trim()); return u && (perms.includes('ALL') || perms.includes('customers')) ? u : null; }
    function localGifts() { try {
        const rows = JSON.parse(localStorage.getItem('candy_gifts_customers') || '[]');
        return Array.isArray(rows) ? rows : [];
    }
    catch (_) {
        return [];
    } }
    async function allRows(query) { const rows = []; for (let offset = 0;; offset += 1000) {
        const { data, error } = await query.range(offset, offset + 999);
        if (error)
            throw error;
        rows.push(...(data || []));
        if (!data || data.length < 1000)
            return rows;
    } }
    async function profiles() { const u = allowed(), pass = sessionStorage.getItem('cc_pass'); if (!u || !pass)
        throw new Error('Session unavailable'); const rows = []; for (let offset = 0;; offset += 500) {
        const { data, error } = await window.supabase.rpc('crm_list_profiles', { p_user: u.username, p_pass: pass, p_offset: offset, p_limit: 500 });
        if (error)
            throw error;
        rows.push(...(data || []));
        if (!data || data.length < 500)
            return rows;
    } }
    async function giftSales() { const columns = 'id,name,quantity,total_price,status,sold_at,created_at,timeline'; try {
        return await allRows(window.supabase.from('gifts').select(columns + ',customer_name,customer_phone').eq('status', 'sold').order('id', { ascending: true }));
    }
    catch (error) {
        if (!['42703', 'PGRST204'].includes(String(error.code)))
            throw error;
        return allRows(window.supabase.from('gifts').select(columns).eq('status', 'sold').order('id', { ascending: true }));
    } }
    function rebuild() { sourceData.legacyGifts = localGifts(); directories = M.buildDirectories(sourceData); for (const page of pages.keys())
        render(page); }
    function groupFor(page) { return page === 'gifts' ? 'gifts' : 'core'; }
    function card(c, page) { const gifts = page === 'gifts'; return '<article class="customer-simple-card' + (c.vip ? ' is-vip' : '') + '"><div class="customer-card-top">' + icon('person') + '<div><h3>' + esc(c.name) + '</h3><p class="customer-card-phone" dir="ltr">' + esc(phone(c.phone) || 'رقم غير مسجل') + '</p></div>' + (c.vip ? '<span class="customer-vip">VIP</span>' : '') + '</div>' + (c.gov || c.address ? '<p class="customer-card-address">' + esc([c.gov, c.address].filter(Boolean).join(' · ')) + '</p>' : '') + (c.hasHistory ? '<div class="customer-card-numbers"><div><span>' + (gifts ? 'البوكيهات' : 'الطلبات') + '</span><strong>' + esc(c.count) + '</strong></div><div><span>' + (gifts ? 'قيمة المشتريات' : 'قيمة الطلبات') + '</span><strong>' + money(c.total) + '</strong></div></div>' : '<p class="customer-no-history">تفاصيل الشراء غير مسجلة</p>') + '<p class="customer-card-date">' + (gifts ? 'آخر شراء: ' : 'آخر طلب: ') + esc(date(c.lastDate)) + '</p></article>'; }
    function render(page) {
        const state = pages.get(page);
        if (!state)
            return;
        const group = groups[groupFor(page)], all = directories[page] || [];
        const rows = page === 'online' ? all.filter(c => state.variant === 'vip' ? c.vip : !c.vip) : all;
        state.root.dataset.theme = page === 'online' && state.variant === 'vip' ? 'vip' : page;
        state.root.querySelector('[data-customer-count]').textContent = group.loaded ? rows.length + ' عميل' : '';
        state.root.querySelector('[data-customer-refresh]').disabled = !!group.pending;
        state.root.setAttribute('aria-busy', String(!!group.pending));
        state.root.querySelectorAll('[data-online-type]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.onlineType === state.variant)));
        const status = state.root.querySelector('[data-customer-status]');
        status.textContent = group.error || (group.profilesUnavailable && page !== 'online' ? 'تعذر تحميل بعض بيانات العملاء المضافة. أعد تسجيل الدخول ثم حدّث البيانات.' : '');
        status.hidden = !status.textContent;
        const list = state.root.querySelector('[data-customer-cards]');
        list.innerHTML = rows.length ? rows.map(c => card(c, page)).join('') : '<div class="customer-simple-empty">' + (group.pending ? 'جاري تحميل البيانات…' : group.error ? 'تعذر تحميل البيانات. أعد المحاولة.' : group.loaded ? 'لا يوجد عملاء مسجلون هنا.' : 'اضغط تحديث البيانات لعرض العملاء.') + '</div>';
    }
    async function load(page, force = false) {
        const state = pages.get(page), group = groups[groupFor(page)];
        if (!state)
            return;
        if (!allowed()) {
            state.root.querySelector('[data-customer-status]').textContent = 'هذه الصفحة تحتاج صلاحية العملاء.';
            state.root.querySelector('[data-customer-status]').hidden = false;
            return;
        }
        if (group.pending)
            return group.pending;
        if (group.loaded && !force) {
            rebuild();
            return;
        }
        if (!window.supabase || !window.supabase.from) {
            group.error = 'الاتصال بقاعدة البيانات غير متاح. أعد المحاولة.';
            render(page);
            return;
        }
        group.error = '';
        group.pending = (async () => {
            try {
                if (page === 'gifts') {
                    sourceData.gifts = await giftSales();
                }
                else {
                    const results = await Promise.allSettled([allRows(window.supabase.from('customers').select('id,customer_name,phone,governorate,address').order('id', { ascending: true })), allRows(window.supabase.from('orders').select('id,order_id,customer_name,phone,governorate,address,platform,order_date,status,final_total').order('id', { ascending: true })), profiles()]);
                    if (results[0].status === 'rejected')
                        throw results[0].reason;
                    if (results[1].status === 'rejected')
                        throw results[1].reason;
                    sourceData.customers = results[0].value;
                    sourceData.orders = results[1].value;
                    group.profilesUnavailable = results[2].status === 'rejected';
                    if (!group.profilesUnavailable)
                        sourceData.profiles = results[2].value;
                }
                group.loaded = true;
                rebuild();
            }
            catch (_) {
                group.error = 'تعذر تحديث البيانات. اضغط تحديث البيانات للمحاولة مرة أخرى.';
            }
            finally {
                group.pending = null;
                rebuild();
            }
        })();
        for (const p of pages.keys())
            render(p);
        return group.pending;
    }
    function showApp(name) { document.querySelectorAll('[data-customer-app-view]').forEach(el => el.hidden = el.dataset.customerAppView !== name); const parent = document.getElementById('app-customers-tab'); parent.dataset.customerTheme = name === 'choice' ? 'apps' : name; if (name !== 'choice')
        load(name); }
    function mount() {
        for (const root of document.querySelectorAll('[data-customer-page]')) {
            const page = root.dataset.customerPage;
            pages.set(page, { root, variant: 'regular' });
            root.innerHTML = '<header class="customer-simple-header"><div><h2>' + esc(titles[page]) + '</h2><span class="customer-simple-count" data-customer-count></span></div><button type="button" class="customer-simple-refresh" data-customer-refresh>' + icon('refresh') + 'تحديث البيانات</button></header>' + (page === 'online' ? '<div class="customer-online-types" aria-label="نوع عميل الأونلاين"><button type="button" data-online-type="regular" aria-pressed="true">العاديون</button><button type="button" data-online-type="vip" aria-pressed="false">VIP</button></div>' : '') + (['talabat', 'instashop'].includes(page) ? '<div class="customer-page-wordmark">' + page + '</div>' : '') + '<p class="customer-simple-status" data-customer-status role="status" hidden></p><div class="customer-simple-cards" data-customer-cards></div>';
            root.querySelector('[data-customer-refresh]').addEventListener('click', () => load(page, true));
            root.querySelectorAll('[data-online-type]').forEach(b => b.addEventListener('click', () => { pages.get(page).variant = b.dataset.onlineType; render(page); }));
            render(page);
        }
        document.querySelectorAll('[data-open-customer-app]').forEach(b => b.addEventListener('click', () => showApp(b.dataset.openCustomerApp)));
        document.querySelectorAll('[data-customer-app-back]').forEach(b => b.addEventListener('click', () => showApp('choice')));
        const panes = [['customers-tab', 'online'], ['store-customers-tab', 'store'], ['gift-customers-tab', 'gifts']];
        for (const [id, page] of panes) {
            const pane = document.getElementById(id);
            if (!pane)
                continue;
            const activate = () => { if (pane.classList.contains('active'))
                load(page); };
            new MutationObserver(activate).observe(pane, { attributes: true, attributeFilter: ['class'] });
            activate();
        }
        const appPane = document.getElementById('app-customers-tab');
        if (appPane) {
            appPane.dataset.customerTheme = 'apps';
            new MutationObserver(() => { if (appPane.classList.contains('active')) {
                const current = [...appPane.querySelectorAll('[data-customer-app-view]')].find(el => !el.hidden);
                if (current && current.dataset.customerAppView !== 'choice')
                    load(current.dataset.customerAppView);
            } }).observe(appPane, { attributes: true, attributeFilter: ['class'] });
        }
        window.addEventListener('candy:gifts-customers-updated', rebuild);
        window.addEventListener('storage', e => { if (e.key === 'candy_gifts_customers')
            rebuild(); });
    }
    window.CandyCRM = { refresh: () => { const entry = [...pages.entries()].find(([, s]) => s.root.closest('.tab-pane.active') && !s.root.closest('[data-customer-app-view][hidden]')); return entry ? load(entry[0], true) : Promise.resolve(); } };
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', mount);
    else
        mount();
})(window, document);
