(function (root, factory) { const api = factory(); if (typeof module === 'object' && module.exports)
    module.exports = api; if (root)
    root.CandyCRMModel = api; })(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';
    const VIP_MIN_ORDERS = 3;
    const text = v => String(v == null ? '' : v).trim();
    const digits = v => text(v).replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776));
    const number = v => Number.isFinite(Number(v)) ? Number(v) : 0;
    const round = v => Math.round((v + Number.EPSILON) * 100) / 100;
    function plainText(v) { return text(v).replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D\u20E3]/gu, '').trim(); }
    function escapeHTML(v) { return plainText(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
    function normalizePhone(v) { let p = digits(v).replace(/^'/, ''); if (!/^[+\d\s().-]+$/.test(p))
        return ''; p = p.replace(/[\s().-]/g, ''); if (!/^\+?\d+$/.test(p))
        return ''; p = p.replace(/^\+/, '').replace(/^00/, ''); if (/^01[0125]\d{8}$/.test(p))
        p = '2' + p;
    else if (/^1[0125]\d{8}$/.test(p))
        p = '20' + p; if (/^201/.test(p) && !/^201[0125]\d{8}$/.test(p))
        return ''; return /^[1-9]\d{7,14}$/.test(p) ? p : ''; }
    function sourceKey(v) { return plainText(v).normalize('NFKC').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N}]/gu, ''); }
    function sourcePage(v) { const k = sourceKey(v); if (['talabat', 'طلبات', 'عملاءطلبات'].includes(k))
        return 'talabat'; if (['instashop', 'انستاشوب', 'شوب', 'shop', 'عملاءانستاشوب'].includes(k))
        return 'instashop'; if (['المحل', 'محل', 'الفرع', 'فرع', 'عملاءالمحل', 'store', 'instore', 'pos', 'cashier', 'كاشير'].includes(k))
        return 'store'; if (['الهدايا', 'هدايا', 'عملاءالهدايا', 'gifts', 'دليلالهداياالمحلي'].includes(k))
        return 'gifts'; return 'online'; }
    function sources(record) { const raw = record.sources || record.source || record.platform || []; return Array.isArray(raw) ? raw : text(raw).split(/[,،|]/).filter(Boolean); }
    function preferredPage(record) { return sources(record).map(sourcePage).find(p => p !== 'online') || 'online'; }
    function readGiftContact(record) { const r = { ...record }; if (text(r.customer_name) && normalizePhone(r.customer_phone))
        return r; let t = r.timeline; if (typeof t === 'string') {
        try {
            t = JSON.parse(t);
        }
        catch (_) {
            t = [];
        }
    } const e = (Array.isArray(t) ? t : []).filter(x => /^تم بيع/.test(text(x && x.event))).at(-1); const m = text(e && e.event).match(/للعميل\s+"([^"]+)"(?:\s*\(([^)]+)\))?/); if (m) {
        if (normalizePhone(r.customer_phone) && normalizePhone(m[2]) && normalizePhone(r.customer_phone) !== normalizePhone(m[2]))
            return r;
        if (!text(r.customer_name))
            r.customer_name = m[1].trim();
        if (!text(r.customer_phone) && normalizePhone(m[2]))
            r.customer_phone = m[2].trim();
    } return r; }
    function buildDirectories(input) {
        const data = input || {}, maps = { online: new Map(), store: new Map(), gifts: new Map(), instashop: new Map(), talabat: new Map() };
        let anonymous = 0;
        function obtain(page, row, kind) { const rawPhone = text(row.phone == null ? row.customer_phone : row.phone), phone = normalizePhone(rawPhone), key = phone || kind + ':' + text(row.id || row.order_id || ++anonymous); if (!maps[page].has(key))
            maps[page].set(key, { key, phone: phone || rawPhone, name: '', gov: '', address: '', count: 0, total: 0, lastDate: '', vip: false, hasHistory: false, _orders: new Set(), _gifts: new Set() }); return maps[page].get(key); }
        function details(c, row) { for (const [key, value] of Object.entries({ name: row.customer_name || row.name, gov: row.governorate || row.gov, address: row.address }))
            if (!c[key] && text(value))
                c[key] = text(value); }
        function date(c, value) { const d = text(value); if (d && Number.isFinite(Date.parse(d)) && (!c.lastDate || Date.parse(d) > Date.parse(c.lastDate)))
            c.lastDate = d; }
        for (const raw of data.gifts || []) {
            const r = readGiftContact(raw);
            if (r.status !== 'sold' || !text(r.customer_name) && !normalizePhone(r.customer_phone))
                continue;
            const c = obtain('gifts', r, 'gift');
            details(c, { customer_name: r.customer_name });
            const id = text(r.id || ++anonymous);
            if (c._gifts.has(id))
                continue;
            c._gifts.add(id);
            c.count += r.quantity == null ? 1 : Math.max(0, number(r.quantity));
            c.total += number(r.total_price);
            c.hasHistory = true;
            date(c, r.sold_at || r.created_at);
        }
        const localSeen = new Set();
        for (const r of data.legacyGifts || []) {
            const c = obtain('gifts', r, 'gift-contact');
            details(c, r);
            const key = c.key;
            if (localSeen.has(key))
                continue;
            localSeen.add(key);
            if (number(r.totalBouquets) > 0 || Array.isArray(r.purchases) && r.purchases.length) {
                c.count = number(r.totalBouquets);
                c.total = number(r.totalSpent);
                c.hasHistory = true;
                date(c, r.lastPurchaseDate);
            }
        }
        for (const r of data.orders || []) {
            const page = sourcePage(r.platform || r.source);
            const c = obtain(page, r, 'order');
            details(c, r);
            if (page === 'gifts')
                continue;
            const id = text(r.order_id || r.id || ++anonymous);
            if (c._orders.has(id))
                continue;
            c._orders.add(id);
            if (r.status !== 'ملغي' && r.status !== 'مرتجع') {
                c.count++;
                c.total += number(r.final_total == null ? r.total : r.final_total);
                c.hasHistory = true;
                date(c, r.order_date || r.date || r.created_at);
            }
        }
        const core = ['online', 'store', 'instashop', 'talabat'];
        const profileByPhone = new Map((data.profiles || []).map(r => [normalizePhone(r.phone), r]).filter(([p]) => p));
        for (const r of data.customers || []) {
            const phone = normalizePhone(r.phone);
            const existing = phone ? core.filter(p => maps[p].has(phone)) : [];
            if (existing.length) {
                for (const p of existing)
                    details(maps[p].get(phone), r);
                continue;
            }
            if (phone && maps.gifts.has(phone) && !sources(r).length)
                continue;
            const profile = profileByPhone.get(phone);
            details(obtain(preferredPage(profile && sources(profile).length ? profile : r), r, 'customer'), r);
        }
        for (const r of data.profiles || []) {
            const phone = normalizePhone(r.phone), existing = phone ? Object.keys(maps).filter(p => maps[p].has(phone)) : [];
            if (existing.length) {
                for (const p of existing)
                    details(maps[p].get(phone), r);
            }
            else
                details(obtain(preferredPage(r), r, 'profile'), r);
        }
        return Object.fromEntries(Object.entries(maps).map(([page, map]) => [page, [...map.values()].map(c => { c.name = c.name || 'بدون اسم'; c.total = round(c.total); c.count = round(c.count); c.vip = page === 'online' && c.count >= VIP_MIN_ORDERS; delete c._orders; delete c._gifts; return c; }).sort((a, b) => String(b.lastDate).localeCompare(String(a.lastDate)) || a.name.localeCompare(b.name, 'ar'))]));
    }
    return { VIP_MIN_ORDERS, plainText, escapeHTML, normalizePhone, sourcePage, readGiftContact, buildDirectories };
});
