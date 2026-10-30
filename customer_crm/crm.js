/* Independent, read-only customer pages. No CRM editors, campaigns or filters. */
(function (window, document) {
    'use strict';
    const M = window.CandyCRMModel;
    if (!M)
        return;
    const titles = { online: 'عملاء الأونلاين', store: 'عملاء المحل', gifts: 'عملاء الهدايا', talabat: 'عملاء طلبات', instashop: 'عملاء إنستا شوب' };
    const PAGE_SIZE = 50;
    const sourceData = { customers: [], orders: [], profiles: [], gifts: [], legacyGifts: [] };
    const pages = new Map(), groups = { core: { loaded: false, pending: null, error: '', profilesUnavailable: false }, gifts: { loaded: false, pending: null, error: '' } };
    let activeSection = 'online', activeApp = 'talabat';
    let motionVersion = 0, runningMotion = null;
    let directories = M.buildDirectories(sourceData);
    const esc = M.escapeHTML;
    const icon = name => '<span class="customer-symbol customer-symbol-' + name + '" aria-hidden="true"></span>';
    const money = value => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(Number(value) || 0) + ' ج.م';
    const phone = value => /^201[0125]\d{8}$/.test(String(value)) ? '0' + String(value).slice(2) : M.plainText(value);
    const date = value => String(value || '').slice(0, 10) || '—';
    function allowed() {
        let u = null;
        try {
            u = JSON.parse(localStorage.getItem('cc_user') || 'null');
        }
        catch (_) { }
        const perms = String(u && u.permissions || '').split(',').map(p => p.trim());
        return u && (perms.includes('ALL') || perms.includes('customers')) ? u : null;
    }
    function localGifts() {
        try {
            const rows = JSON.parse(localStorage.getItem('candy_gifts_customers') || '[]');
            return Array.isArray(rows) ? rows : [];
        }
        catch (_) {
            return [];
        }
    }
    async function allRows(query) {
        const rows = [];
        for (let offset = 0;; offset += 1000) {
            const { data, error } = await query.range(offset, offset + 999);
            if (error)
                throw error;
            rows.push(...(data || []));
            if (!data || data.length < 1000)
                return rows;
        }
    }
    async function profiles() {
        const u = allowed(), pass = sessionStorage.getItem('cc_pass');
        if (!u || !pass)
            throw new Error('Session unavailable');
        const rows = [];
        for (let offset = 0;; offset += 500) {
            const { data, error } = await window.supabase.rpc('crm_list_profiles', { p_user: u.username, p_pass: pass, p_offset: offset, p_limit: 500 });
            if (error)
                throw error;
            rows.push(...(data || []));
            if (!data || data.length < 500)
                return rows;
        }
    }
    async function giftSales() {
        const columns = 'id,name,quantity,total_price,status,sold_at,created_at,timeline';
        try {
            return await allRows(window.supabase.from('gifts').select(columns + ',customer_name,customer_phone').eq('status', 'sold').order('id', { ascending: true }));
        }
        catch (error) {
            if (!['42703', 'PGRST204'].includes(String(error.code)))
                throw error;
            return allRows(window.supabase.from('gifts').select(columns).eq('status', 'sold').order('id', { ascending: true }));
        }
    }
    function rebuild() {
        sourceData.legacyGifts = localGifts();
        directories = M.buildDirectories(sourceData);
        for (const page of pages.keys())
            render(page);
    }
    function groupFor(page) { return page === 'gifts' ? 'gifts' : 'core'; }
    function card(c, page) {
        const gifts = page === 'gifts';
        const location = c.vip
            ? '<dl class="customer-card-location"><div><dt>المنطقة</dt><dd>' + esc(c.region || c.gov || 'غير مسجلة') + '</dd></div><div><dt>العنوان</dt><dd>' + esc(c.address || 'غير مسجل') + '</dd></div></dl>'
            : c.region || c.gov || c.address ? '<p class="customer-card-address">' + esc([c.region || c.gov, c.address].filter(Boolean).join(' · ')) + '</p>' : '';
        const frequency = c.topProduct ? c.topProduct.orders === 1 ? 'في طلب واحد' : c.topProduct.orders === 2 ? 'في طلبين' : 'في ' + c.topProduct.orders + (c.topProduct.orders <= 10 ? ' طلبات' : ' طلبًا') : '';
        const interest = c.vip ? '<div class="customer-card-interest"><span>الأكثر طلبًا</span><strong>' + esc(c.topProduct ? c.topProduct.name : 'تفاصيل المنتجات غير مسجلة') + '</strong>' + (frequency ? '<small>' + esc(frequency) + '</small>' : '') + '</div>' : '';
        return '<article class="customer-simple-card' + (c.vip ? ' is-vip' : '') + '"><div class="customer-card-top">' + icon('person') + '<div><h3>' + esc(c.name) + '</h3><p class="customer-card-phone" dir="ltr">' + esc(phone(c.phone) || 'رقم غير مسجل') + '</p>' + (c.vip && c.altPhone ? '<p class="customer-card-phone" dir="ltr">' + esc(phone(M.normalizePhone(c.altPhone) || c.altPhone)) + '</p>' : '') + '</div>' + (c.vip ? '<span class="customer-vip">VIP</span>' : '') + '</div>' + location + interest + (c.hasHistory ? '<div class="customer-card-numbers"><div><span>' + (gifts ? 'مرات شراء الهدايا' : 'الطلبات') + '</span><strong>' + esc(gifts ? c.purchaseCount == null ? '—' : c.purchaseCount : c.count) + '</strong></div><div><span>' + (gifts ? 'قيمة المشتريات' : 'قيمة الطلبات') + '</span><strong>' + money(c.total) + '</strong></div></div>' : '<p class="customer-no-history">تفاصيل الشراء غير مسجلة</p>') + '<p class="customer-card-date">' + (gifts ? 'آخر شراء: ' : 'آخر طلب: ') + esc(date(c.lastDate)) + '</p></article>';
    }
    function pagination() {
        return '<nav class="customer-pagination" aria-label="صفحات العملاء" hidden><span data-customer-page-summary aria-live="polite"></span><div><button type="button" data-customer-page-step="-1">السابق</button><span data-customer-page-position></span><button type="button" data-customer-page-step="1">التالي</button></div></nav>';
    }
    function render(page) {
        const state = pages.get(page);
        if (!state)
            return;
        const group = groups[groupFor(page)], all = directories[page] || [];
        const rows = page === 'online' ? all.filter(c => state.variant === 'vip' ? c.vip : !c.vip) : all;
        const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
        state.pageNumber = Math.min(state.pageNumber, totalPages);
        const offset = (state.pageNumber - 1) * PAGE_SIZE;
        const visible = page === activePage();
        state.root.dataset.theme = page === 'online' && state.variant === 'vip' ? 'vip' : page;
        state.root.querySelector('[data-customer-count]').textContent = group.loaded ? rows.length + ' عميل' : '';
        state.root.setAttribute('aria-busy', String(!!group.pending));
        const busy = state.root.querySelector('[data-customer-loading]');
        busy.hidden = !group.pending;
        state.root.querySelectorAll('[data-online-type]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.onlineType === state.variant)));
        const status = state.root.querySelector('[data-customer-status]');
        status.textContent = group.error || (group.profilesUnavailable && page !== 'online' ? 'تعذر تحميل بعض بيانات العملاء المضافة. أعد تسجيل الدخول ثم اضغط اسم القسم بالأعلى.' : '');
        status.hidden = !status.textContent;
        const list = state.root.querySelector('[data-customer-cards]');
        list.innerHTML = !visible ? '' : rows.length ? rows.slice(offset, offset + PAGE_SIZE).map(c => card(c, page)).join('') : '<div class="customer-simple-empty">' + (group.pending ? 'جاري تحميل البيانات…' : group.error ? 'تعذر تحميل البيانات. اضغط اسم القسم بالأعلى للمحاولة.' : group.loaded ? 'لا يوجد عملاء مسجلون هنا.' : 'البيانات تظهر تلقائيًا عند فتح القسم.') + '</div>';
        state.root.querySelectorAll('.customer-pagination').forEach(nav => {
            nav.hidden = !visible || rows.length <= PAGE_SIZE;
            nav.querySelector('[data-customer-page-summary]').textContent = 'عرض ' + (offset + 1) + '–' + Math.min(offset + PAGE_SIZE, rows.length) + ' من ' + rows.length + ' عميل';
            nav.querySelector('[data-customer-page-position]').textContent = state.pageNumber + ' / ' + totalPages;
            nav.querySelector('[data-customer-page-step="-1"]').disabled = state.pageNumber === 1;
            nav.querySelector('[data-customer-page-step="1"]').disabled = state.pageNumber === totalPages;
        });
        selectionMarker(state.root.querySelector('.customer-online-types'));
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
        render(page);
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
                    const results = await Promise.allSettled([allRows(window.supabase.from('customers').select('id,customer_name,phone,governorate,address').order('id', { ascending: true })), allRows(window.supabase.from('orders').select('id,order_id,customer_name,phone,alt_phone,governorate,address,platform,order_date,status,final_total,products').order('id', { ascending: true })), profiles()]);
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
                group.error = 'تعذر تحميل البيانات. اضغط اسم القسم بالأعلى للمحاولة مرة أخرى.';
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
    function activePage() {
        return activeSection === 'apps' ? activeApp : activeSection;
    }
    function animatePanel(panel, direction = 1) {
        if (!panel)
            return;
        panel.classList.remove('customer-panel-enter');
        panel.style.setProperty('--customer-enter-x', direction < 0 ? '-18px' : '18px');
        void panel.offsetWidth;
        panel.classList.add('customer-panel-enter');
    }
    function reduceMotion() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
    function stopMotion() {
        if (runningMotion)
            runningMotion.cancel();
        runningMotion = null;
    }
    function playMotion(panel, frames, options) {
        try {
            return panel.animate(frames, options);
        }
        catch (_) {
            return null;
        }
    }
    async function transitionContent(outgoing, update, incoming, direction = 1) {
        const version = ++motionVersion;
        stopMotion();
        const reduced = reduceMotion();
        const enabled = outgoing && !outgoing.hidden && typeof outgoing.animate === 'function';
        const shift = direction < 0 ? -1 : 1;
        if (enabled) {
            outgoing.classList.remove('customer-panel-enter');
            const exitFrames = reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(' + (-shift * 10) + 'px)' }];
            const exit = playMotion(outgoing, exitFrames, { duration: reduced ? 120 : 110, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
            runningMotion = exit;
            if (exit)
                await exit.finished.catch(() => { });
            if (version !== motionVersion)
                return;
            stopMotion();
        }
        update();
        const target = incoming();
        if (!target || version !== motionVersion)
            return;
        target.classList.remove('customer-panel-enter');
        if (enabled && typeof target.animate === 'function') {
            const enterFrames = reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateX(' + (shift * 18) + 'px) translateY(3px)' }, { opacity: 1, transform: 'translateX(0) translateY(0)' }];
            const enter = playMotion(target, enterFrames, { duration: reduced ? 220 : 270, easing: 'cubic-bezier(.16,1,.3,1)' });
            runningMotion = enter;
            if (enter)
                await enter.finished.catch(() => { });
            else animatePanel(target, direction);
            if (version === motionVersion)
                stopMotion();
        }
        else
            animatePanel(target, direction);
    }
    function selectionMarker(nav) {
        if (!nav)
            return;
        const selected = nav.querySelector('button[aria-pressed="true"]');
        if (!selected)
            return;
        let marker = nav.querySelector('.customer-tab-indicator');
        if (!marker) {
            marker = document.createElement('span');
            marker.className = 'customer-tab-indicator';
            marker.setAttribute('aria-hidden', 'true');
            nav.appendChild(marker);
        }
        const width = Number(selected.offsetWidth);
        marker.hidden = !(width > 0);
        if (marker.hidden)
            return;
        marker.style.width = Math.max(0, width - 24) + 'px';
        marker.style.transform = 'translate(' + (selected.offsetLeft + 12) + 'px,' + (selected.offsetTop + selected.offsetHeight - 2) + 'px)';
    }
    function syncMarkers() {
        document.querySelectorAll('.customer-section-nav,.customer-online-types,.customer-app-switch').forEach(selectionMarker);
    }
    function showSection(name) {
        if (!['online', 'store', 'gifts', 'apps'].includes(name))
            return;
        if (name === activeSection) {
            ++motionVersion;
            stopMotion();
            load(activePage(), true);
            return;
        }
        const direction = ['online', 'store', 'gifts', 'apps'].indexOf(name) - ['online', 'store', 'gifts', 'apps'].indexOf(activeSection);
        transitionContent(document.querySelector('[data-customer-panel="' + activeSection + '"]'), () => {
            activeSection = name;
            document.querySelectorAll('[data-customer-panel]').forEach(el => el.hidden = el.dataset.customerPanel !== name);
            document.querySelectorAll('[data-customer-section]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.customerSection === name)));
            document.getElementById('customers-tab').dataset.customerTheme = name === 'apps' ? activeApp : name;
            for (const page of pages.keys())
                render(page);
            if (name === 'apps')
                showApp(activeApp, false);
            else
                load(name, true);
            syncMarkers();
        }, () => document.querySelector('[data-customer-panel="' + name + '"]'), direction);
    }
    function showApp(name, transition = true) {
        if (!['talabat', 'instashop'].includes(name))
            return;
        const direction = name === 'instashop' ? 1 : -1;
        const update = () => {
            activeApp = name;
            document.querySelectorAll('[data-customer-app-view]').forEach(el => el.hidden = el.dataset.customerAppView !== name);
            document.querySelectorAll('[data-open-customer-app]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.openCustomerApp === name)));
            document.getElementById('customers-tab').dataset.customerTheme = name;
            for (const page of pages.keys())
                render(page);
            load(name, true);
            syncMarkers();
        };
        if (transition && name !== activeApp)
            transitionContent(document.querySelector('[data-customer-app-view="' + activeApp + '"]'), update, () => document.querySelector('[data-customer-app-view="' + name + '"]'), direction);
        else {
            if (transition) {
                ++motionVersion;
                stopMotion();
            }
            update();
        }
    }
    function mount() {
        for (const root of document.querySelectorAll('[data-customer-page]')) {
            const page = root.dataset.customerPage;
            pages.set(page, { root, variant: 'regular', pageNumber: 1 });
            root.innerHTML = '<header class="customer-simple-header"><div><h2>' + esc(titles[page]) + '</h2><span class="customer-simple-count" data-customer-count></span></div><span class="customer-loading" data-customer-loading role="status" hidden>جاري تحميل البيانات</span></header>' + (page === 'online' ? '<div class="customer-online-types" aria-label="نوع عميل الأونلاين"><button type="button" data-online-type="regular" aria-pressed="true">العاديون</button><button type="button" data-online-type="vip" aria-pressed="false">VIP</button></div>' : '') + '<p class="customer-simple-status" data-customer-status role="status" hidden></p><div class="customer-simple-cards" data-customer-cards></div>';
            root.insertAdjacentHTML('beforeend', pagination());
            root.querySelector('[data-customer-cards]').insertAdjacentHTML('beforebegin', pagination());
            root.querySelectorAll('[data-customer-page-step]').forEach(b => b.addEventListener('click', () => {
                const state = pages.get(page), step = Number(b.dataset.customerPageStep);
                if (b.disabled)
                    return;
                const list = root.querySelector('[data-customer-cards]');
                transitionContent(list, () => {
                    state.pageNumber += step;
                    render(page);
                    if (typeof root.scrollIntoView === 'function')
                        root.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
                }, () => list, step);
            }));
            root.querySelectorAll('[data-online-type]').forEach(b => b.addEventListener('click', () => {
                const state = pages.get(page);
                const update = () => { state.variant = b.dataset.onlineType; state.pageNumber = 1; render(page); };
                if (state.variant === b.dataset.onlineType) {
                    ++motionVersion;
                    stopMotion();
                    return;
                }
                transitionContent(root.querySelector('[data-customer-cards]'), update, () => root.querySelector('[data-customer-cards]'), b.dataset.onlineType === 'vip' ? 1 : -1);
            }));
            render(page);
        }
        document.querySelectorAll('[data-open-customer-app]').forEach(b => b.addEventListener('click', () => showApp(b.dataset.openCustomerApp)));
        document.querySelectorAll('[data-customer-section]').forEach(b => b.addEventListener('click', () => showSection(b.dataset.customerSection)));
        const pane = document.getElementById('customers-tab');
        const activate = () => {
            if (pane.classList.contains('active'))
                load(activePage(), true);
            else {
                ++motionVersion;
                stopMotion();
            }
            syncMarkers();
        };
        new MutationObserver(activate).observe(pane, { attributes: true, attributeFilter: ['class'] });
        activate();
        window.addEventListener('resize', syncMarkers);
        window.addEventListener('candy:gifts-customers-updated', rebuild);
        window.addEventListener('storage', e => {
            if (e.key === 'candy_gifts_customers')
                rebuild();
        });
    }
    window.CandyCRM = { refresh: () => { const page = activePage(); return page && document.getElementById('customers-tab').classList.contains('active') ? load(page, true) : Promise.resolve(); } };
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', mount);
    else
        mount();
})(window, document);
