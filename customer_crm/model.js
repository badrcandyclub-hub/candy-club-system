(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.CandyCRMModel = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    const CSV_HEADERS = ['الاسم', 'الموبايل', 'المصدر', 'نوع العميل', 'الاهتمامات', 'المحافظة', 'العنوان', 'حالة المتابعة', 'التواصل التسويقي', 'موعد المتابعة', 'ملاحظات'];
    const LIFECYCLES = ['new', 'contacted', 'interested', 'follow_up', 'inactive'];
    const CONTACT_PERMISSIONS = ['unknown', 'allowed', 'declined'];
    const digits = value => String(value == null ? '' : value).replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
    const str = value => String(value == null ? '' : value).trim();
    const number = value => { const result = Number(value); return Number.isFinite(result) ? result : 0; };
    const round = value => Math.round((value + Number.EPSILON) * 100) / 100;

    function normalizeText(value) {
        return digits(value).toLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
    }

    function normalizePhone(value) {
        let phone = digits(value).trim().replace(/^'/, '');
        if (!phone || !/^[+\d\s().-]+$/.test(phone)) return '';
        phone = phone.replace(/[\s().-]/g, '');
        if (!/^\+?\d+$/.test(phone)) return '';
        phone = phone.replace(/^\+/, '').replace(/^00/, '');
        if (/^01[0125]\d{8}$/.test(phone)) phone = '20' + phone.slice(1);
        else if (/^1[0125]\d{8}$/.test(phone)) phone = '20' + phone;
        if (/^01/.test(phone)) return '';
        if (/^201/.test(phone) && !/^201[0125]\d{8}$/.test(phone)) return '';
        return /^[1-9]\d{7,14}$/.test(phone) ? phone : '';
    }

    function escapeHTML(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function list(value) {
        const entries = Array.isArray(value) ? value : str(value).split(/[|،,;]/);
        const seen = new Set();
        return entries.map(str).filter(item => { const key = normalizeText(item); if (!key || seen.has(key)) return false; seen.add(key); return true; });
    }

    function sourceName(value) {
        const source = str(value);
        const key = normalizeText(source).replace(/\s/g, '');
        if (['talabat', 'طلبات'].includes(key)) return 'طلبات';
        if (['instashop', 'انستاشوب', 'شوب', 'shop'].includes(key)) return 'إنستاشوب';
        return source;
    }

    function dateValue(value) {
        const date = str(value);
        return date && Number.isFinite(Date.parse(date)) ? date : '';
    }

    function latestDate(a, b) {
        if (!b) return a;
        return !a || Date.parse(b) > Date.parse(a) ? b : a;
    }

    function extractProducts(raw) {
        let entries = raw;
        if (typeof entries === 'string') {
            const text = entries.trim();
            if (/^[\[{]/.test(text)) {
                try { entries = JSON.parse(text); } catch (_) { entries = text.split(/\r?\n/); }
            } else entries = text.split(/\r?\n/);
        }
        if (!Array.isArray(entries)) entries = entries && typeof entries === 'object' ? [entries] : [];
        return entries.flatMap(item => {
            if (item && typeof item === 'object') {
                const name = str(item.name || item.product_name || item.productName);
                return name ? [{ name, quantity: Math.max(0, number(item.qty == null ? (item.quantity == null ? 1 : item.quantity) : item.qty)) }] : [];
            }
            const line = str(item);
            if (!line) return [];
            const match = digits(line).match(/^(.+?)\s*[-–]?\s*الكمية\s*:\s*(\d+(?:\.\d+)?)/) || digits(line).match(/^(.+?)\s*\(x\s*(\d+(?:\.\d+)?)\)/i);
            if (match) return [{ name: match[1].trim(), quantity: number(match[2]) }];
            // Unstructured product text stays visible on the order; it is not guessed into a preference.
            return [];
        });
    }

    function buildCustomers(input) {
        const data = input || {};
        const merged = new Map();
        let anonymous = 0;
        function obtain(record, kind) {
            const rawPhone = str(record.phone == null ? record.customer_phone : record.phone);
            const phone = normalizePhone(rawPhone);
            const key = phone || kind + ':' + str(record.id || record.order_id || ++anonymous);
            if (!merged.has(key)) merged.set(key, {
                key, phone: phone || rawPhone, canonicalPhone: phone, editable: !!phone,
                name: '', gov: '', address: '', relationship: 'prospect', sources: [], interests: [],
                lifecycle: 'new', contact_permission: 'unknown', notes: '', next_follow_up: '', revision: null,
                orders: [], giftPurchases: [], count: 0, total: 0, giftCount: 0, giftTotal: 0, lastDate: '', vip: false,
                purchasedProducts: [], rawPhones: [], hasProducts: false, hasGifts: false,
                historicalUnavailable: false, localGiftContact: false, localGiftNotes: '',
                profile: null, _confirmed: false, _rawCustomer: false, _productMap: new Map(), _orderIds: new Set(), _giftIds: new Set()
            });
            const customer = merged.get(key);
            if (rawPhone && !customer.rawPhones.includes(rawPhone)) customer.rawPhones.push(rawPhone);
            return customer;
        }
        function details(customer, record, override) {
            const fields = { name: record.customer_name || record.name, gov: record.governorate || record.gov, address: record.address };
            Object.entries(fields).forEach(([key, value]) => { if (str(value) && (override || !customer[key])) customer[key] = str(value); });
        }
        function addSources(customer, sources) {
            customer.sources = list(customer.sources.concat(list(sources).map(sourceName)));
        }
        (data.customers || []).forEach(record => {
            const customer = obtain(record, 'customer');
            details(customer, record);
            customer._confirmed = true;
            customer._rawCustomer = true;
            addSources(customer, record.sources || record.source);
        });
        (data.orders || []).forEach((record, index) => {
            const customer = obtain(record, 'order');
            details(customer, record);
            const id = str(record.order_id || record.id || 'row-' + index);
            if (customer._orderIds.has(id)) return;
            customer._orderIds.add(id);
            const total = number(record.final_total == null ? record.total : record.final_total);
            const date = dateValue(record.order_date || record.date || record.created_at);
            customer.orders.push({ ...record, id, date, total });
            const included = record.status !== 'ملغي' && record.status !== 'مرتجع';
            if (included) {
                customer.count += 1;
                customer.total += total;
                customer._confirmed = true;
                customer.hasProducts = true;
                extractProducts(record.products).forEach(product => {
                    const key = normalizeText(product.name);
                    if (!customer._productMap.has(key)) customer._productMap.set(key, { name: product.name, quantity: 0, orders: new Set() });
                    const evidence = customer._productMap.get(key);
                    evidence.quantity += product.quantity;
                    evidence.orders.add(id);
                });
            }
            if (included) customer.lastDate = latestDate(customer.lastDate, date);
            addSources(customer, record.platform || record.source || 'طلبات النظام');
        });
        (data.gifts || []).forEach((record, index) => {
            if (record.status !== 'sold') return;
            const customer = obtain(record, 'gift');
            details(customer, { customer_name: record.customer_name });
            const id = str(record.id || 'row-' + index);
            if (customer._giftIds.has(id)) return;
            customer._giftIds.add(id);
            const quantity = record.quantity == null ? 1 : Math.max(0, number(record.quantity));
            const total = number(record.total_price);
            const date = dateValue(record.sold_at || record.created_at);
            customer.giftPurchases.push({ ...record, id, date, quantity, total, name: str(record.name) });
            customer.giftCount += quantity;
            // Existing gift reports sum the registered record value, independently of order totals.
            customer.giftTotal += total;
            customer._confirmed = true;
            customer.hasGifts = true;
            customer.lastDate = latestDate(customer.lastDate, date);
            addSources(customer, ['الهدايا']);
        });
        (data.legacyGifts || []).forEach(record => {
            const customer = obtain(record, 'legacy-gift');
            details(customer, record);
            customer.localGiftContact = true;
            customer.hasGifts = true;
            customer.localGiftNotes = str(record.notes);
            if (number(record.totalBouquets) > 0 || (Array.isArray(record.purchases) && record.purchases.length)) {
                customer._confirmed = true;
                customer.hasGifts = true;
            }
            addSources(customer, ['دليل الهدايا المحلي']);
        });
        (data.profiles || []).forEach(record => {
            const customer = obtain(record, 'profile');
            details(customer, record, true);
            // A deliberate blank in editable profile fields must also override old contact data.
            if (Object.prototype.hasOwnProperty.call(record, 'governorate')) customer.gov = str(record.governorate);
            if (Object.prototype.hasOwnProperty.call(record, 'address')) customer.address = str(record.address);
            customer.profile = record;
            customer.revision = record.revision == null ? null : record.revision;
            customer.relationship = record.relationship === 'prospect' ? 'prospect' : 'customer';
            if (customer.relationship === 'customer') customer._confirmed = true;
            customer.interests = list(record.interests);
            customer.lifecycle = LIFECYCLES.includes(record.lifecycle) ? record.lifecycle : 'new';
            customer.contact_permission = CONTACT_PERMISSIONS.includes(record.contact_permission) ? record.contact_permission : 'unknown';
            customer.notes = str(record.notes);
            customer.next_follow_up = str(record.next_follow_up);
            addSources(customer, record.sources);
        });
        return Array.from(merged.values()).map(customer => {
            customer.relationship = customer._confirmed ? 'customer' : customer.relationship;
            customer.name = customer.name || 'عميل بدون اسم';
            customer.total = round(customer.total);
            customer.giftTotal = round(customer.giftTotal);
            customer.giftCount = round(customer.giftCount);
            customer.vip = customer.count >= 3;
            customer.historicalUnavailable = customer.relationship === 'customer' && !customer.count && !customer.giftPurchases.length;
            customer.purchasedProducts = Array.from(customer._productMap.values()).map(p => ({ name: p.name, quantity: round(p.quantity), orders: p.orders.size })).sort((a, b) => b.orders - a.orders || b.quantity - a.quantity);
            customer.orders.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
            customer.giftPurchases.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
            delete customer._confirmed; delete customer._rawCustomer; delete customer._productMap; delete customer._orderIds; delete customer._giftIds;
            return customer;
        });
    }

    function detectDelimiter(text) {
        let quoted = false;
        const counts = { ',': 0, ';': 0, '\t': 0 };
        for (let index = 0; index < text.length; index++) {
            const char = text[index];
            if (char === '"') { if (quoted && text[index + 1] === '"') index++; else quoted = !quoted; }
            else if (!quoted && (char === '\n' || char === '\r')) break;
            else if (!quoted && char in counts) counts[char]++;
        }
        return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    }

    function parseCSV(value) {
        const text = String(value == null ? '' : value).replace(/^\uFEFF/, '');
        if (!text.trim()) return [];
        const delimiter = detectDelimiter(text);
        const rows = []; let row = []; let field = ''; let quoted = false; let closedQuote = false;
        for (let index = 0; index < text.length; index++) {
            const char = text[index];
            if (quoted) {
                if (char === '"') {
                    if (text[index + 1] === '"') { field += '"'; index++; }
                    else { quoted = false; closedQuote = true; }
                } else field += char;
            } else if (char === '"') {
                if (field.length || closedQuote) throw new Error('صيغة CSV غير صحيحة: علامة تنصيص داخل حقل غير محاط بعلامات تنصيص.');
                quoted = true;
            } else if (char === delimiter) { row.push(field); field = ''; closedQuote = false; }
            else if (char === '\n' || char === '\r') {
                if (char === '\r' && text[index + 1] === '\n') index++;
                row.push(field); rows.push(row); row = []; field = ''; closedQuote = false;
            } else {
                if (closedQuote && !/\s/.test(char)) throw new Error('صيغة CSV غير صحيحة بعد نهاية حقل محاط بعلامات تنصيص.');
                if (!closedQuote) field += char;
            }
        }
        if (quoted) throw new Error('ملف CSV يحتوي على علامة تنصيص لم تُغلق.');
        if (field.length || row.length || closedQuote) { row.push(field); rows.push(row); }
        return rows.filter(cells => cells.some(cell => str(cell)));
    }

    function serializeCSV(rows) {
        return '\uFEFF' + (rows || []).map(row => row.map(value => {
            let cell = String(value == null ? '' : value);
            if (/^[\s\u0000-\u001F]*[=+\-@]/.test(cell)) cell = "'" + cell;
            return '"' + cell.replace(/"/g, '""') + '"';
        }).join(',')).join('\r\n');
    }

    function prepareImport(text, existingCustomers) {
        const result = { rows: [], errors: [], duplicates: [], totalRows: 0, validCount: 0 };
        let table;
        try { table = parseCSV(text); } catch (error) { result.errors.push({ row: 0, message: error.message }); return result; }
        if (!table.length) { result.errors.push({ row: 1, message: 'الملف فارغ. استخدم قالب العملاء.' }); return result; }
        const headers = table.shift().map(normalizeText);
        const index = new Map();
        CSV_HEADERS.forEach(header => index.set(header, headers.indexOf(normalizeText(header))));
        if (index.get('الاسم') < 0 || index.get('الموبايل') < 0) {
            result.errors.push({ row: 1, message: 'يجب أن يحتوي الملف على عمودي الاسم والموبايل. استخدم القالب الفارغ.' }); return result;
        }
        if (new Set(headers).size !== headers.length) { result.errors.push({ row: 1, message: 'الملف يحتوي على أسماء أعمدة مكررة.' }); return result; }
        const existing = new Set((existingCustomers || []).map(c => normalizePhone(typeof c === 'object' ? c.phone : c)).filter(Boolean));
        const seen = new Set();
        const aliases = {
            relationship: { customer: 'customer', prospect: 'prospect', 'عميل': 'customer', 'عميل فعلي': 'customer', 'عميل حالي': 'customer', 'عميل محتمل': 'prospect', 'محتمل': 'prospect' },
            lifecycle: { new: 'new', contacted: 'contacted', interested: 'interested', follow_up: 'follow_up', inactive: 'inactive', 'جديد': 'new', 'تم التواصل': 'contacted', 'مهتم': 'interested', 'متابعة': 'follow_up', 'متابعة لاحقة': 'follow_up', 'يحتاج متابعة': 'follow_up', 'غير نشط': 'inactive', 'متوقف': 'inactive' },
            permission: { unknown: 'unknown', allowed: 'allowed', declined: 'declined', 'غير محدد': 'unknown', 'مسموح': 'allowed', 'موافق': 'allowed', 'يسمح بالعروض': 'allowed', 'غير مسموح': 'declined', 'مرفوض': 'declined', 'لا يرغب': 'declined', 'لا يرغب في العروض': 'declined' }
        };
        function enumValue(value, category, fallback) {
            if (!str(value)) return fallback;
            const key = normalizeText(value);
            const found = Object.keys(aliases[category]).find(alias => normalizeText(alias) === key);
            return found ? aliases[category][found] : null;
        }
        result.totalRows = table.length;
        table.forEach((cells, offset) => {
            const row = offset + 2;
            const get = header => index.get(header) >= 0 ? str(cells[index.get(header)]) : '';
            if (cells.length !== headers.length) { result.errors.push({ row, message: 'عدد الخانات لا يطابق عناوين الأعمدة.' }); return; }
            const name = get('الاسم'); const phone = normalizePhone(get('الموبايل'));
            if (!name || !phone) { result.errors.push({ row, message: !name ? 'اسم العميل مطلوب.' : 'رقم الموبايل غير صحيح؛ اكتبه كاملًا مع كود البلد أو رقمًا مصريًا صحيحًا.' }); return; }
            if (existing.has(phone) || seen.has(phone)) {
                result.duplicates.push({ row, phone, message: existing.has(phone) ? 'العميل موجود بالفعل؛ لن يتم تعديل بياناته.' : 'رقم مكرر داخل الملف؛ سيُضاف أول صف صالح فقط.' }); return;
            }
            const relationship = enumValue(get('نوع العميل'), 'relationship', 'customer');
            const lifecycle = enumValue(get('حالة المتابعة'), 'lifecycle', 'new');
            const permission = enumValue(get('التواصل التسويقي'), 'permission', 'unknown');
            if (!relationship || !lifecycle || !permission) { result.errors.push({ row, message: 'قيمة نوع العميل أو حالة المتابعة أو التواصل التسويقي غير معروفة.' }); return; }
            const date = digits(get('موعد المتابعة'));
            if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !dateValue(date) || new Date(date).toISOString().slice(0, 10) !== date)) {
                result.errors.push({ row, message: 'موعد المتابعة يجب أن يكون تاريخًا صحيحًا بالصيغة YYYY-MM-DD.' }); return;
            }
            const sources = list(get('المصدر')).map(sourceName), interests = list(get('الاهتمامات'));
            if (name.length > 160 || get('المحافظة').length > 100 || get('ملاحظات').length > 4000 || get('العنوان').length > 1000) { result.errors.push({ row, message: 'الاسم أو المنطقة أو العنوان أو الملاحظات أطول من الحد المسموح.' }); return; }
            if ([sources, interests].some(items => items.length > 20 || items.some(tag => tag.length > 80))) { result.errors.push({row, message:'استخدم حتى ٢٠ وسمًا؛ كل وسم لا يزيد عن ٨٠ حرفًا.'}); return; }
            seen.add(phone);
            result.rows.push({ phone, customer_name: name, governorate: get('المحافظة'), address: get('العنوان'), relationship,
                sources: sources.length ? sources : ['استيراد يدوي'], interests, lifecycle,
                contact_permission: permission, next_follow_up: date || null, notes: get('ملاحظات') });
        });
        result.validCount = result.rows.length;
        return result;
    }

    return { CSV_HEADERS, LIFECYCLES, CONTACT_PERMISSIONS, normalizePhone, normalizeText, escapeHTML, extractProducts, buildCustomers, parseCSV, serializeCSV, prepareImport };
});
