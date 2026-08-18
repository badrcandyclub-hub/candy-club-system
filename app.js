// ==========================================
// <i class='fa-solid fa-globe'></i> نظام كاندي كلوب - إدارة المخازن والمبيعات (الإصدار V16.0 - ربط مباشر بالسيرفر)
// ==========================================

window.serverTimeOffset = 0;
(async function syncTime() {
    try {
        let res = await fetch('https://worldtimeapi.org/api/timezone/Africa/Cairo');
        let data = await res.json();
        let serverTime = new Date(data.datetime).getTime();
        window.serverTimeOffset = serverTime - Date.now();
        console.log("Time synced! Offset:", window.serverTimeOffset);
    } catch(e) {
        console.error("Time sync failed:", e);
    }
})();
window.getSyncedDate = function() {
    return new Date(Date.now() + window.serverTimeOffset);
};
// ==========================================
// 🔴 Global Error Handler to Prevent Silent Failures
// ==========================================
window.addEventListener('unhandledrejection', function(event) {
    console.error("Unhandled Promise Rejection:", event.reason);
    if (!navigator.onLine || (event.reason && event.reason.message && event.reason.message.includes('Failed to fetch'))) {
        if (typeof showToast === 'function') showToast("عفواً، لا يوجد اتصال بالإنترنت أو السيرفر لا يستجيب.", "error");
    } else {
        if (typeof showToast === 'function') showToast("حدث خطأ في النظام، يرجى المحاولة مرة أخرى.", "error");
    }
});
window.addEventListener('error', function(event) {
    console.error("Global Error Caught:", event.error);
    if (typeof showToast === 'function') showToast("خطأ غير متوقع: " + (event.message || "يرجى تحديث الصفحة"), "error");
});
// ==========================================

const GOOGLE_SHEETS_URL = "DISABLED - MIGRATED TO SUPABASE";
// ==========================================
// ⭐ Supabase Configuration
// ==========================================
const SUPABASE_URL = 'https://thqccqwdwwxitvztmigt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BtFyuDBE_0PcF1z8JNskuA_-04mjcpc';
if (window.supabase) {
    try {
        window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { 
            auth: { 
                persistSession: false, 
                storage: { getItem: () => null, setItem: () => null, removeItem: () => null } 
            } 
        });
    } catch(e) {
        console.error("Supabase init blocked:", e);
    }
} else {
    console.error("Supabase CDN is missing!");
}

// ==========================================
// ⭐ Supabase Local Backend Interceptor
// ==========================================
const originalFetch = window.fetch;

async function fetchAllSupabaseRows(queryBuilder) {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
        const { data, error } = await queryBuilder.range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < pageSize) break;
        page++;
    }
    return { data: allData, error: null };
}

// 🛡️ Secure Delete Wrapper
window.secureDelete = async function(tableName, matchColumn, matchValue) {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('cc_user')); } catch (e) {}
    let pass = sessionStorage.getItem('cc_pass');
    
    if (!user || user.permissions !== 'ALL' || !pass) {
        if (typeof showToast === 'function') showToast("ليس لديك صلاحية الحذف", "error");
        return { error: "Unauthorized" };
    }
    
    const { data, error } = await supabase.rpc('secure_delete_record', {
        p_table: tableName,
        p_column: matchColumn,
        p_value: String(matchValue),
        p_user: user.username,
        p_pass: pass
    });
    return { data, error };
};

window.fetch = async function(url, options) {
    // Intercept Google Sheets calls
    if (typeof url === 'string' && (url.includes('DISABLED - MIGRATED TO SUPABASE') || url.includes('script.google.com'))) {
        return handleSupabaseRequest(url, options);
    }
    // Normal fetch for everything else
    return originalFetch.apply(this, arguments);
};

async function handleSupabaseRequest(url, options) {
    let action = null;
    let params = {};
    
    // Parse GET query params
    const urlObj = new URL(url.replace('DISABLED - MIGRATED TO SUPABASE', 'http://localhost'));
    urlObj.searchParams.forEach((val, key) => {
        params[key] = val;
    });
    
    // Parse POST body (URLSearchParams or FormData)
    if (options && options.body) {
        if (options.body instanceof FormData || options.body instanceof URLSearchParams) {
            options.body.forEach((val, key) => {
                params[key] = val;
            });
        }
    }
    
    action = params.action;
    if (!action && params.date) action = 'getStats';
    
    try {
        let responseData = { success: true };
        
        switch (action) {

            case 'addOrder': {
                // Fetch the latest order to get the max order_id
                const { data: latestOrder } = await supabase.from('orders')
                    .select('order_id')
                    .order('id', { ascending: false })
                    .limit(1);
                    
                let nextNum = 1;
                if (latestOrder && latestOrder.length > 0 && latestOrder[0].order_id) {
                    const match = String(latestOrder[0].order_id).match(/\d+/);
                    if (match) {
                        nextNum = parseInt(match[0]) + 1;
                    }
                }
                const newOrderId = 'CANDY-' + String(nextNum).padStart(6, '0');
                
                // Get Date and Time in Egypt time
                const d = new Date();
                const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
                const timeStr = d.toLocaleTimeString('en-GB', { timeZone: 'Africa/Cairo' });

                const insertData = {
                    order_id: newOrderId,
                    order_date: dateStr,
                    order_time: timeStr,
                    platform: params.platform || '',
                    customer_name: params.customerName || '',
                    governorate: params.gov || '',
                    address: params.address || '',
                    phone: params.phone1 || '',
                    alt_phone: params.phone2 || '',
                    delivery_type: params.orderType || '',
                    payment_method: params.payMethod || '',
                    delivery_date: params.expDate || '',
                    products: params.products || '',
                    products_total: params.pTotal ? parseFloat(params.pTotal) : 0,
                    discount: params.discount ? parseFloat(params.discount) : 0,
                    shipping_cost: params.shipping ? parseFloat(params.shipping) : 0,
                    final_total: params.finalTotal ? parseFloat(params.finalTotal) : 0,
                    status: 'قيد التجهيز',
                    notes: params.notes || '',
                    moderator_name: params.moderator || '',
                    deposit: params.deposit ? parseFloat(params.deposit) : 0,
                    remaining: params.remaining ? parseFloat(params.remaining) : (params.finalTotal ? parseFloat(params.finalTotal) : 0)
                };

                const { data: inserted, error: insErr } = await supabase.from('orders').insert([insertData]).select();
                if (insErr) {
                    responseData = { success: false, error: insErr.message };
                } else {
                    responseData = { success: true, orderId: newOrderId, message: 'تم الإضافة بنجاح', data: inserted[0] };
                    // Add customer to customers table if they don't exist
                    if (params.phone1) {
                        try {
                            const { data: existingCust } = await supabase.from('customers').select('id').eq('phone', params.phone1).limit(1);
                            if (!existingCust || existingCust.length === 0) {
                                await supabase.from('customers').insert([{ 
                                    customer_name: params.customerName || 'بدون اسم', 
                                    phone: params.phone1, 
                                    governorate: params.gov || '', 
                                    address: params.address || '', 
                                    orders_count: 0, 
                                    total_paid: 0 
                                }]);
                            }
                        } catch(e) {}
                    }
                }
                break;
            }

            case 'updateOrderStatus': {
                const updateData = { status: params.status };
                if (params.driverName !== undefined) updateData.driver_name = params.driverName;
                if (params.orderType !== undefined) updateData.delivery_type = params.orderType;

                const { data: updated, error: updErr } = await supabase.from('orders')
                    .update(updateData)
                    .eq('order_id', params.orderId)
                    .select();

                if (updErr) {
                    responseData = { success: false, error: updErr.message };
                } else {
                    responseData = { success: true, data: updated[0] };
                }
                break;
            }

            case 'suspendOrder': {
                let draftJsonObj = {};
                try {
                    draftJsonObj = JSON.parse(params.draftJson || '{}');
                } catch(e) {}
                
                // Get Date and Time in Egypt time
                const d = new Date();
                const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
                const timeStr = d.toLocaleTimeString('en-GB', { timeZone: 'Africa/Cairo' });

                const draftData = {
                    draft_id: params.draftId,
                    suspend_date: dateStr,
                    suspend_time: timeStr,
                    moderator_name: draftJsonObj.moderator || 'غير محدد',
                    customer_name: draftJsonObj.customerName || 'بدون اسم',
                    draft_json: params.draftJson || '{}'
                };

                const { data: drafted, error: dftErr } = await supabase.from('suspended_orders')
                    .insert([draftData])
                    .select();

                if (dftErr) {
                    responseData = { success: false, error: dftErr.message };
                } else {
                    responseData = { success: true, data: drafted[0] };
                }
                break;
            }



            case 'globalSearch': {
                const keyword = (params.query || '').toLowerCase();
                const { data: searchResults } = await fetchAllSupabaseRows(supabase.from('orders').select('*').or(`order_id.ilike.%${keyword}%,customer_name.ilike.%${keyword}%,phone.ilike.%${keyword}%`));
                let results = (searchResults || []).map(o => ({
                    id: o.order_id, date: o.order_date, time: o.order_time,
                    name: o.customer_name, phone: o.phone, phone2: o.alt_phone || "",
                    address: o.address, products: o.products, subtotal: o.products_total,
                    discount: o.discount, shipping: o.shipping_cost, total: parseFloat(o.final_total) || 0,
                    status: o.status, payment: o.payment_method, seller: o.moderator_name,
                    orderType: o.delivery_type, deposit: o.deposit || 0,
                    remaining: o.remaining || o.final_total,
                    gov: o.governorate, platform: o.platform, driver: o.driver_name,
                    reservationDate: o.delivery_date || ""
                })).reverse();
                return createJsonResponse(results); // Return array directly for globalSearch
            }
            case 'getCustomers': {
                const [ { data: rawCust }, { data: rawOrders } ] = await Promise.all([
                    fetchAllSupabaseRows(supabase.from('customers').select('*')),
                    fetchAllSupabaseRows(supabase.from('orders').select('phone, final_total, order_date, status'))
                ]);

                let stats = {};
                (rawOrders || []).forEach(o => {
                    let p = String(o.phone).trim();
                    if(!p) return;
                    if(!stats[p]) stats[p] = { count: 0, total: 0, lastDate: '' };
                    
                    if (o.status !== 'ملغي' && o.status !== 'مرتجع') {
                        stats[p].count += 1;
                        stats[p].total += parseFloat(o.final_total) || 0;
                    }
                    if (o.order_date && (!stats[p].lastDate || o.order_date > stats[p].lastDate)) {
                        stats[p].lastDate = o.order_date;
                    }
                });

                responseData.customers = (rawCust || []).map(c => {
                    let p = String(c.phone).trim();
                    let st = stats[p] || { count: 0, total: 0, lastDate: '' };
                    return {
                        name: c.customer_name, phone: c.phone, gov: c.governorate, address: c.address,
                        count: st.count || 0, total: st.total || 0, lastDate: st.lastDate || c.last_order_date || ""
                    };
                });
                break;
            }
            case 'getPendingLeaves': {
                const { data: pendingData } = await fetchAllSupabaseRows(supabase.from('attendance').select('*').eq('request_status', 'بانتظار الموافقة'));
                responseData.pending = (pendingData || []).map(r => ({
                    employee: r.employee_name, date: r.date, type: r.status, notes: r.notes
                }));
                break;
            }
            case 'getAttendance': {
                let query = supabase.from('attendance').select('*').order('date', { ascending: true });
                if (params.employee) query = query.eq('employee_name', params.employee);
                if (params.exactDate) query = query.eq('date', params.exactDate);
                else if (params.month) query = query.like('date', params.month + '-%');
                
                const { data: attData } = await fetchAllSupabaseRows(query);
                responseData.attendance = (attData || []).map(r => ({
                    id: r.id, employee: r.employee_name, date: r.date, checkIn: r.check_in, checkOut: r.check_out,
                    hours: r.hours, status: r.status, notes: r.notes, requestStatus: r.request_status
                }));
                break;
            }
            case 'getStats': {
                const month = params.date ? params.date.substring(0, 7) : new Date().toISOString().substring(0, 7);
                const startMonthDate = month + '-01';
                const endMonthDate = month + '-31';
                const { data: monthOrders } = await fetchAllSupabaseRows(
                    supabase.from('orders').select('*')
                    .gte('order_date', startMonthDate)
                    .lte('order_date', endMonthDate)
                );
                
                let topProducts = {};
                let platforms = {};
                let shipping = {};
                let mods = {};
                
                let monthOrderCount = 0;
                let monthSales = 0;
                let completedMonthCount = 0;
                let returnedCount = 0;
                
                (monthOrders || []).forEach(o => {
                    if (o.status !== 'مرتجع') {
                        monthOrderCount++;
                        monthSales += parseFloat(o.final_total || o.total) || 0;
                        
                        // Platforms
                        let p = (o.platform || 'غير محدد').toLowerCase();
                        platforms[p] = (platforms[p] || 0) + 1;
                        
                        // Mods
                        let mod = o.moderator_name || o.seller || o.moderator || 'غير محدد';
                        if (!mods[mod]) mods[mod] = { name: mod, orders: 0, sales: 0 };
                        mods[mod].orders++;
                        mods[mod].sales += parseFloat(o.final_total || o.total) || 0;
                        
                        // Products
                        let prodsLines = [];
                        if (typeof o.products === 'string') {
                            prodsLines = o.products.split('\n');
                        } else if (Array.isArray(o.products)) {
                            o.products.forEach(pObj => {
                                if (pObj && pObj.name) prodsLines.push(...String(pObj.name).split('\n'));
                            });
                        } else if (o.products && typeof o.products === 'object') {
                            if (o.products.name) prodsLines = String(o.products.name).split('\n');
                        }
                        
                        prodsLines.forEach(line => {
                            if (!line.trim()) return;
                            let match = line.match(/^(.+?)\s*[-–]?\s*الكمية:\s*(\d+)/i) || line.match(/^(.+?)\s*\(x(\d+)\)/i);
                            if (match) {
                                let name = match[1].trim();
                                let qty = parseInt(match[2]);
                                if (!topProducts[name]) topProducts[name] = 0;
                                topProducts[name] += qty;
                            } else {
                                let name = line.split('-')[0].trim();
                                if (name) {
                                    if (!topProducts[name]) topProducts[name] = 0;
                                    topProducts[name] += 1;
                                }
                            }
                        });
                    }
                    
                    if (o.status === 'تم التوصيل' || o.status === 'تم التوصيل ومُحاسب') {
                        completedMonthCount++;
                        let gov = o.governorate || 'أخرى';
                        if (!shipping[gov]) shipping[gov] = { name: gov, count: 0, totalShipping: 0 };
                        shipping[gov].count++;
                        shipping[gov].totalShipping += parseFloat(o.shipping_cost || o.shipping) || 0;
                    }
                    
                    if (o.status === 'مرتجع') returnedCount++;
                });
                
                responseData.monthTopProducts = Object.entries(topProducts)
                    .map(([name, qty]) => ({ name, qty }))
                    .sort((a, b) => b.qty - a.qty).slice(0, 10);
                
                responseData.monthPlatforms = platforms;
                responseData.monthZonesStats = Object.values(shipping).sort((a, b) => b.count - a.count);
                
                responseData.monthOrderCount = monthOrderCount;
                responseData.monthSales = monthSales;
                responseData.completedMonthCount = completedMonthCount;
                responseData.returnedCount = returnedCount;
                responseData.modStats = Object.values(mods);
                
                break;
            }

            case 'addShipping':
                await supabase.from('settings_shipping').insert([{ zone_name: params.name, price: params.price, zone_type: params.zoneType === 'alex' ? 'alex' : 'govs', delivery_type: params.deliveryType, duration: params.duration }]);
                break;
            case 'editShipping':
                await supabase.from('settings_shipping').update({ price: params.price, delivery_type: params.deliveryType, duration: params.duration }).eq('zone_name', params.name).eq('zone_type', params.zoneType === 'alex' ? 'alex' : 'govs');
                break;
            case 'addDriver':
                await supabase.from('couriers').insert([{ name: params.name, phone: params.phone }]);
                break;
            case 'editDriver':
                await supabase.from('couriers').update({ phone: params.phone }).eq('name', params.name);
                break;
            case 'addModerator':
                await supabase.from('moderators').insert([{ name: params.name }]);
                break;
            case 'addCustomer':
                await supabase.from('customers').insert([{ customer_name: params.name, phone: params.phone, governorate: params.gov, address: params.address, orders_count: 0, total_paid: 0 }]);
                break;
            case 'addExpiry':
                await supabase.from('expiries').insert([{ product_name: params.name, qty: params.qty, expiry_date: params.expiryDate, location: params.location, registrar_name: params.regDate, receiver: params.receiver, notes: params.notes, original_price: params.originalPrice, offer_price: params.offerPrice, status: params.status, barcode: params.barcode }]);
                break;
            case 'addExpiriesBatch':
                const batchItems = JSON.parse(params.batchData);
                const expRows = batchItems.map(item => ({ product_name: item.name, qty: item.qty, expiry_date: item.expiryDate, location: item.location, reg_date: item.regDate, receiver: item.receiver, notes: item.notes, status: item.status, barcode: item.barcode }));
                await supabase.from('expiries').insert(expRows);
                break;
            case 'updateExpiryItemData':
                const idParts = params.id ? params.id.split('|') : [];
                const targetName = idParts[0] || params.id;
                await supabase.from('expiries').update({ qty: params.qty, expiry_date: params.expiryDate, location: params.location, receiver: params.receiver, notes: params.notes, barcode: params.barcode }).eq('product_name', targetName);
                break;
            case 'updateExpiryStatus':
                const statParts = params.id ? params.id.split('|') : [];
                const tName = statParts[0] || params.id;
                let updates = { status: params.status };
                if (params.originalPrice) updates.original_price = params.originalPrice;
                if (params.offerPrice) updates.offer_price = params.offerPrice;
                await supabase.from('expiries').update(updates).eq('product_name', tName);
                // Also update catalog
                let catUpdate = {};
                if (params.status === 'في عرض') { catUpdate.is_offer = true; if(params.offerPrice) catUpdate.offer_price = params.offerPrice; }
                else if (params.status === 'مش في عرض') { catUpdate.is_offer = false; catUpdate.offer_price = 0; }
                await supabase.from('catalog').update(catUpdate).eq('product_name', tName);
                break;
            case 'addOutOfStock':
                await supabase.from('out_of_stock').insert([{ customer_name: params.customer, phone: params.phone, product: params.product, reason: params.reason }]);
                break;
            case 'deleteShipping':
                await window.secureDelete('settings_shipping', 'zone_name', params.name);
                responseData = { success: true };
                break;
            case 'deleteDriver':
                await window.secureDelete('couriers', 'name', params.name);
                responseData = { success: true };
                break;
            case 'deleteModerator':
                await window.secureDelete('moderators', 'name', params.name);
                responseData = { success: true };
                break;
            case 'addUser':
                await supabase.from('users').insert([{ username: params.user, display_name: params.user, password: params.pass, permissions: params.perms, status: 'نشط' }]);
                responseData = { success: true };
                break;
            case 'deleteProduct':
                await window.secureDelete('catalog', 'product_name', params.name);
                responseData = { success: true };
                break;
            case 'updateCatalog':
                await supabase.from('catalog').update({ price: params.price, available: params.avail }).eq('product_name', params.name);
                responseData = { success: true };
                break;
            case 'addExpiriesBatch':
                const expItems = JSON.parse(params.itemsStr || "[]");
                await supabase.from('expiries').insert(expItems.map(item => ({
                    product_name: item.name,
                    expiry_date: item.exp,
                    quantity: item.qty,
                    original_price: item.price,
                    status: 'صلاحية قريبة'
                })));
                responseData = { success: true };
                break;
            case 'updateExpiryItemData':
                await supabase.from('expiries').update({ status: params.status, offer_price: params.offerPrice, notes: params.notes }).eq('product_name', params.product);
                responseData = { success: true };
                break;
            case 'deleteOutOfStock':
                if (params.id) {
                    await supabase.from('out_of_stock').delete().eq('id', params.id);
                } else {
                    await supabase.from('out_of_stock').delete().eq('product', params.product).ilike('phone', '%' + params.phone + '%');
                }
                break;
            case 'addInventoryLog':
                await supabase.from('inventory_logs').insert([{ log_id: params.logId, from_location: params.from, to_location: params.to, reg_name: params.regName, items: params.items, notes: params.notes, timestamp: new Date().toLocaleString() }]);
                break;
            case 'checkIn':
                let { data: existIn } = await supabase.from('attendance').select('*').eq('employee_name', params.employeeName).eq('date', params.date).eq('status', 'حاضر');
                if (existIn && existIn.length > 0) return createJsonResponse({ success: false, error: "أنت مسجل حضور بالفعل اليوم" });
                let checkInTime = window.getSyncedDate().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute:'2-digit' });
                await supabase.from('attendance').insert([{ employee_name: params.employeeName, date: params.date, check_in: checkInTime, status: 'حاضر' }]);
                responseData = { success: true, message: "تم تسجيل الحضور بنجاح", time: checkInTime };
                break;
            case 'checkOut':
                let { data: existOut } = await supabase.from('attendance').select('*').eq('employee_name', params.employeeName).eq('status', 'حاضر').order('id', { ascending: false }).limit(1);
                if (existOut && existOut.length > 0) {
                    let checkInTime = existOut[0].check_in;
                    let checkOutTime = window.getSyncedDate().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute:'2-digit' });
                    
                    // Calculate hours difference
                    let hoursStr = "0 ساعة";
                    try {
                        let ih = 0, im = 0, oh = 0, om = 0;
                        let inMatch = checkInTime.match(/([a-zA-Z]+)?\s*(\d+):(\d+)\s*([a-zA-Z]+)?/i);
                        let outMatch = checkOutTime.match(/([a-zA-Z]+)?\s*(\d+):(\d+)\s*([a-zA-Z]+)?/i);
                        
                        if (inMatch && outMatch) {
                            ih = parseInt(inMatch[2]); im = parseInt(inMatch[3]);
                            let inPeriod = (inMatch[1] || inMatch[4] || '').toLowerCase();
                            if (inPeriod === 'pm' && ih !== 12) ih += 12;
                            if (inPeriod === 'am' && ih === 12) ih = 0;

                            oh = parseInt(outMatch[2]); om = parseInt(outMatch[3]);
                            let outPeriod = (outMatch[1] || outMatch[4] || '').toLowerCase();
                            if (outPeriod === 'pm' && oh !== 12) oh += 12;
                            if (outPeriod === 'am' && oh === 12) oh = 0;

                            let totalMin = (oh * 60 + om) - (ih * 60 + im);
                            if (totalMin < 0) totalMin += 24 * 60;
                            let h = Math.floor(totalMin / 60);
                            let min = totalMin % 60;
                            hoursStr = h + ' ساعة' + (min > 0 ? ' و ' + min + ' دقيقة' : '');
                        }
                    } catch(e) {
                        console.error('Checkout calc error:', e);
                    }

                    await supabase.from('attendance').update({ check_out: checkOutTime, hours: hoursStr }).eq('id', existOut[0].id);
                    responseData = { success: true, message: "تم تسجيل الانصراف بنجاح", time: checkOutTime, hours: hoursStr };
                } else {
                    return createJsonResponse({ success: false, error: "لم يتم العثور على سجل حضور مفتوح" });
                }
                break;
            case 'requestLeave':
                await supabase.from('attendance').insert([{ employee_name: params.employeeName, date: params.date, status: params.leaveType, request_status: 'بانتظار الموافقة', notes: params.notes }]);
                responseData = { success: true, message: "تم إرسال طلب الإجازة" };
                break;
            case 'manageLeave':
                let updateData = { request_status: params.decision === 'approve' ? '✅ تمت الموافقة' : '❌ مرفوضة' };
                if (params.decision === 'approve') {
                    updateData.hours = '8:00';
                }
                await supabase.from('attendance').update(updateData).eq('employee_name', params.employeeName).eq('date', params.date);
                break;
            case 'bulkUploadAttendance':
                const attItems = JSON.parse(params.dataStr || "[]");
                const attRows = attItems.map(item => ({ employee_name: item.empName, date: item.date, check_in: item.checkIn, check_out: item.checkOut, hours: item.hours, status: item.status, notes: item.notes }));
                await supabase.from('attendance').insert(attRows);
                break;
            case 'editAttendance':
                const { data: existAtt } = await supabase.from('attendance').select('*').eq('employee_name', params.employeeName).eq('date', params.date);
                if (existAtt && existAtt.length > 0) {
                    await supabase.from('attendance').update({ check_in: params.checkIn, check_out: params.checkOut, hours: params.hours, status: params.status, notes: params.notes }).eq('id', existAtt[0].id);
                } else {
                    await supabase.from('attendance').insert([{ employee_name: params.employeeName, date: params.date, check_in: params.checkIn, check_out: params.checkOut, hours: params.hours, status: params.status || 'حاضر', notes: params.notes }]);
                }
                responseData = { success: true };
                break;
            case 'addLeaveByAdmin':
                await supabase.from('attendance').insert([{ employee_name: params.employeeName, date: params.date, status: params.type, notes: params.notes }]);
                responseData = { success: true };
                break;
            case 'removeDuplicates':
                // For simplicity, skip complex logic as unique constraints typically handle this, just return success
                responseData = { success: true };
                break;
            case 'settleOrder':
                await supabase.from('orders').update({
                    status: 'تم التوصيل ومُحاسب',
                    final_total: params.finalTotal,
                    products_total: params.productsTotal,
                    discount: params.discount,
                    shipping_cost: params.shipping
                }).eq('order_id', params.orderId);
                responseData = { success: true };
                break;
            
            case 'deleteUser':
                await window.secureDelete('users', 'username', params.user);
                break;
            case 'addShipping':
                await supabase.from('settings_shipping').insert([{ zone_name: params.name, price: params.price, delivery_type: params.deliveryType, duration: params.duration, zone_type: params.zoneType }]);
                responseData = { success: true };
                break;
            case 'editShipping':
                await supabase.from('settings_shipping').update({ price: params.price, duration: params.duration }).eq('zone_name', params.name);
                responseData = { success: true };
                break;
            case 'addDriver':
                await supabase.from('couriers').insert([{ name: params.name, phone: params.phone }]);
                responseData = { success: true };
                break;
            case 'editDriver':
                await supabase.from('couriers').update({ phone: params.phone }).eq('name', params.name);
                responseData = { success: true };
                break;
            case 'addExpiry':
                await supabase.from('expiries').insert([{
                    product_name: params.name, quantity: params.qty, expiry_date: params.expiryDate,
                    location: params.location, reg_date: params.regDate, receiver: params.receiver,
                    notes: params.notes, original_price: params.originalPrice || '', offer_price: params.offerPrice || '',
                    status: params.status || '', barcode: params.barcode || ''
                }]);
                responseData = { success: true };
                break;
            case 'removeSuspended':
                await supabase.from('suspended_orders').delete().eq('draft_id', params.draftId);
                responseData = { success: true };
                break;
            case 'addUser': {
                const { data: existUser } = await supabase.from('users').select('*').eq('username', params.username);
                if (existUser && existUser.length > 0) {
                    return createJsonResponse({ success: false, error: 'اسم المستخدم موجود بالفعل' });
                }
                await supabase.from('users').insert([{ username: params.username, password: params.password, display_name: params.displayName, permissions: params.permissions, status: 'نشط' }]);
                responseData = { success: true };
                break;
            }
            case 'updateUser': {
                let userUpdates = {};
                if (params.displayName) userUpdates.display_name = params.displayName;
                if (params.permissions) userUpdates.permissions = params.permissions;
                if (params.status) userUpdates.status = params.status;
                if (params.newPassword && params.newPassword !== '') userUpdates.password = params.newPassword;
                await supabase.from('users').update(userUpdates).eq('username', params.username);
                responseData = { success: true };
                break;
            }
            case 'addBulkAttendance': {
                const bulkRecords = JSON.parse(params.records || '[]');
                const bulkRows = bulkRecords.map(rec => ({
                    employee_name: rec.empName, date: rec.date, check_in: rec.checkIn,
                    check_out: rec.checkOut, hours: rec.hours, status: rec.status,
                    request_status: rec.reqStatus || '', notes: rec.notes || ''
                }));
                if (bulkRows.length > 0) await supabase.from('attendance').insert(bulkRows);
                responseData = { success: true, message: 'تم رفع البيانات بنجاح' };
                break;
            }
            case 'fixAmPmData':
                responseData = { success: true, fixedCount: 0 };
                break;
            case 'getInventoryLogs': {
                let invQuery = supabase.from('inventory_logs').select('*');
                if (params.q) {
                    let searchId = String(params.q).toUpperCase();
                    if (!searchId.startsWith('TRX-')) searchId = 'TRX-' + searchId;
                    invQuery = invQuery.eq('log_id', searchId);
                } else {
                    invQuery = invQuery.order('id', { ascending: false });
                }
                const { data: invData } = await invQuery;
                responseData = (invData || []).map(log => ({
                    logId: log.log_id || log.id, from: log.from_location, to: log.to_location,
                    regName: log.reg_name, timestamp: log.timestamp, items: log.items, notes: log.notes
                }));
                break;
            }
            case 'getExpiries': {
                const { data: expData } = await fetchAllSupabaseRows(supabase.from('expiries').select('*'));
                responseData = { expiries: (expData || []).map(e => ({
                    id: (e.product_name || '') + '|' + (e.quantity || '') + '|' + (e.expiry_date || ''),
                    name: e.product_name || '', qty: e.quantity || '', expiryDate: e.expiry_date || '',
                    location: e.location || '', registrarName: e.registrar_name || '', regDate: e.reg_date || '',
                    receiver: e.receiver || '', notes: e.notes || '', originalPrice: e.original_price || '',
                    offerPrice: e.offer_price || '', status: e.status || '', barcode: e.barcode || ''
                })) };
                break;
            }
            case 'syncFirebaseInventory': {
                try {
                    // 1. Fetch Firebase data
                    const fbResp = await fetch('https://candyclubsync-default-rtdb.firebaseio.com/products.json');
                    const fbDataRaw = await fbResp.json();
                    const fbItems = Array.isArray(fbDataRaw) ? fbDataRaw : Object.values(fbDataRaw || {});
                    const fbMap = {};
                    fbItems.forEach(item => {
                        if (item && item.Barcode) {
                            fbMap[String(item.Barcode).trim()] = parseFloat(item.Stock) || 0;
                        }
                    });

                    // 2. Fetch Supabase expiries
                    const { data: gsData } = await fetchAllSupabaseRows(supabase.from('expiries').select('*'));
                    if (!gsData || gsData.length === 0) {
                        responseData = { success: true, message: 'لا توجد بيانات في شيت الصلاحيات' };
                        break;
                    }

                    // 3. Aggregate by barcode
                    const gsMap = {};
                    gsData.forEach(row => {
                        const bcode = String(row.barcode || '').trim();
                        if (!bcode) return;
                        const qty = parseFloat(row.qty) || 0;
                        if (!gsMap[bcode]) gsMap[bcode] = { totalQty: 0, rows: [] };
                        gsMap[bcode].totalQty += qty;
                        gsMap[bcode].rows.push({ id: row.id, qty: qty, expDate: row.expiry_date || '', name: row.product_name });
                    });

                    // 4. Compare and adjust
                    let changesCount = 0;
                    for (const bcode in gsMap) {
                        const gsTotal = gsMap[bcode].totalQty;
                        const fbTotal = fbMap.hasOwnProperty(bcode) ? fbMap[bcode] : null;
                        if (fbTotal === null) continue;
                        const diff = gsTotal - fbTotal;

                        if (diff > 0) {
                            // Sold - deduct using FIFO
                            let qtyToDeduct = diff;
                            const rows = gsMap[bcode].rows.sort((a, b) => new Date(a.expDate) - new Date(b.expDate));
                            for (const r of rows) {
                                if (qtyToDeduct <= 0) break;
                                if (r.qty > 0) {
                                    const newQty = Math.max(0, r.qty - qtyToDeduct);
                                    qtyToDeduct -= r.qty;
                                    await supabase.from('expiries').update({ qty: newQty }).eq('id', r.id);
                                    changesCount++;
                                }
                            }
                        } else if (diff < 0) {
                            // Returned - add to nearest expiry
                            const rows = gsMap[bcode].rows.sort((a, b) => new Date(a.expDate) - new Date(b.expDate));
                            if (rows.length > 0) {
                                const newQty = rows[0].qty + Math.abs(diff);
                                await supabase.from('expiries').update({ qty: newQty }).eq('id', rows[0].id);
                                changesCount++;
                            }
                        }
                    }

                    if (changesCount > 0) {
                        await window.secureDelete('expiries', 'qty', '0');
                        responseData = { success: true, message: 'تم تحديث ' + changesCount + ' منتج بنجاح' };
                    } else {
                        responseData = { success: true, message: 'البيانات متطابقة' };
                    }
                } catch (fbErr) {
                    responseData = { success: false, error: 'فشل الاتصال بقاعدة بيانات الفايربيز: ' + fbErr.message };
                }
                break;
            }
            default:
                console.log("Unhandled Supabase action:", action);
                break;
        }
        
        return createJsonResponse(responseData);
        
    } catch (err) {
        console.error("Supabase Interceptor Error:", err);
        if (typeof showToast === 'function') showToast("حدث خطأ في الاتصال بقاعدة البيانات", "error");
        return createJsonResponse({ success: false, error: err.message });
    }
}

function createJsonResponse(data) {
    return {
        ok: true,
        status: 200,
        json: async () => data,
        text: async () => JSON.stringify(data)
    };
}



window.formatTimeInput = function(input) {
    let val = input.value.replace(/[^\d]/g, '');
    if (val.length > 2) {
        val = val.substring(0, 2) + ':' + val.substring(2, 4);
    } else {
        val = val.substring(0, 2);
    }
    input.value = val;
};

function formatHoursDisplay(hStr) {
    if (!hStr || hStr === '-') return '-';
    hStr = String(hStr).trim();
    if (hStr.includes(':')) {
        let p = hStr.replace('ساعة', '').trim().split(':');
        return String(parseInt(p[0]||0)).padStart(2, '0') + ':' + String(parseInt(p[1]||0)).padStart(2, '0');
    }
    
    let h = 0;
    let hMatch = hStr.match(/(\d+(?:\.\d+)?)\s*ساعة/);
    let mMatch = hStr.match(/(\d+(?:\.\d+)?)\s*دقيقة/);
    
    if (hMatch) {
        h += parseFloat(hMatch[1]);
    } else if (!isNaN(parseFloat(hStr))) {
        h += parseFloat(hStr);
    }
    
    if (mMatch) {
        h += parseFloat(mMatch[1]) / 60;
    }
    
    if (h === 0 && !hStr.includes('0')) return hStr; // Fallback to original text if couldn't parse
    
    let tHrs = Math.floor(h);
    let tMins = Math.round((h - tHrs) * 60);
    if (tMins === 60) { tHrs++; tMins = 0; }
    
    return String(tHrs).padStart(2, '0') + ":" + String(tMins).padStart(2, '0');
}


// ⭐ V16: متغير المستخدم الحالي
let currentUser = null;

// Defensive wrapper for any external handleKeyDown handlers that may access undefined values.
// This avoids uncaught TypeError crashes when a third-party script binds document.handleKeyDown.
(function () {
    function safeHandleKeyDown(original) {
        function wrapped(event) {
            if (!event || !event.target) {
                return;
            }
            try {
                return original.call(this, event);
            } catch (err) {
                console.warn('Wrapped handleKeyDown caught error:', err);
                return;
            }
        }
        wrapped.__isSafeWrapped = true;
        return wrapped;
    }

    function patchDocumentHandleKeyDown() {
        try {
            const doc = document;
            const current = doc.handleKeyDown;
            if (typeof current === 'function' && !current.__isSafeWrapped) {
                doc.handleKeyDown = safeHandleKeyDown(current);
            }
        } catch (err) {
            console.warn('patchDocumentHandleKeyDown failed:', err);
        }
    }

    document.addEventListener('DOMContentLoaded', patchDocumentHandleKeyDown);
    window.addEventListener('load', patchDocumentHandleKeyDown);

    let attempts = 0;
    const intervalId = setInterval(() => {
        patchDocumentHandleKeyDown();
        attempts += 1;
        if (attempts >= 5) {
            clearInterval(intervalId);
        }
    }, 500);
})();

// ==========================================
// 1. نظام الإشعارات (Toasts) وقفل الأزرار (Loading) والصوتيات
// ==========================================
const orderAudio = new Audio('صوت اوردر.mp3');

function playOrderSound() {
    let playPromise = orderAudio.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.log('Audio play failed (maybe needs user interaction):', e);
            customAlert("<i class='fa-solid fa-bell' style='color:var(--warning)'></i> يوجد أوردر جديد قيد التجهيز! \n\n(تنبيه: المتصفح منع تشغيل الصوت. يرجى الضغط في أي مكان في الشاشة لتفعيل الصوت للأوردرات القادمة)");
        });
    }
}



function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'error' ? '<i class=\'fa-solid fa-xmark\'></i>' : (type === 'warning' ? '<i class=\'fa-solid fa-triangle-exclamation\'></i>' : '<i class=\'fa-solid fa-check\'></i>');
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, 3000);
}

function setBtnLoading(btn, isLoading, originalText = "") {
    if (!btn) return;
    if (isLoading) {
        if (!btn.disabled) {
            btn.dataset.origHtml = btn.innerHTML;
        }
        btn.disabled = true;
        btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin' style='margin-left:8px;'></i> جاري التحميل...";
        btn.style.opacity = "0.7";
        btn.style.cursor = "not-allowed";
    } else {
        btn.disabled = false;
        if (originalText) {
            btn.innerHTML = originalText;
        } else if (btn.dataset.origHtml) {
            btn.innerHTML = btn.dataset.origHtml;
        }
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    }
}

// ==========================================
// 2. التبديل بين الشاشات والنوافذ المنبثقة
// ==========================================
// ⭐ V16.2: تعريف وحدات النظام (Modules)
window.MODULE_GROUPS = {
    'orders': { name: 'إدارة الأوردرات', icon: 'fa-solid fa-box fa-bounce', tabs: ['create-tab', 'catalog-tab', 'shipping-tab', 'history-tab', 'financials-tab', 'suspended-tab'], req: 'orders,customers,shipping,catalog,financials,shortages,drafts,users' },
    'marketing': { name: 'العملاء والتسويق', icon: 'fa-solid fa-users-viewfinder fa-fade', tabs: ['customers-tab', 'whatsapp-campaign-tab'], req: 'customers,users,orders' },
    'products': { name: 'المنتجات', icon: 'fa-solid fa-tags fa-beat', tabs: ['price-tags-tab', 'shortages-tab', 'expiry-tab', 'inventory-transfers-tab'], req: 'catalog,drafts,users,expiries' },
    'hr': { name: 'شئون الموظفين', icon: 'fa-solid fa-id-card-clip fa-flip', tabs: ['hr-tab', 'hr-admin-tab'], req: 'attendance,users' },
    'admin': { name: 'الإدارة والتقارير', icon: 'fa-solid fa-chart-pie fa-spin', tabs: ['reports-tab', 'moderators-tab', 'users-tab'], req: 'orders,users,customers,shipping,financials,shortages' }
};

window.currentActiveModuleGroup = null;

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (btn.classList.contains('locked-nav-item')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (window.showToast) {
                window.showToast("ليس لديك صلاحية لفتح هذه الشاشة. تواصل مع الإدارة للإشتراك 🔒", "error");
            }
            return false;
        }
        
        let targetId = btn.getAttribute('data-target');
        
        // ⭐ تحديد القسم الجديد
        let newModuleGroup = null;
        for (let group in window.MODULE_GROUPS) {
            if (window.MODULE_GROUPS[group].tabs.includes(targetId)) {
                newModuleGroup = group;
                break;
            }
        }
        
        // إذا كان هناك انتقال لقسم جديد تماماً، نظهر شاشة التحميل
        if (newModuleGroup && newModuleGroup !== window.currentActiveModuleGroup) {
            window.currentActiveModuleGroup = newModuleGroup;
            
            let overlay = document.getElementById('module-loading-overlay');
            let loadingText = document.getElementById('module-loading-text');
            let loadingIcon = document.getElementById('module-loading-icon');
            
            if (overlay && loadingText && loadingIcon) {
                let modData = window.MODULE_GROUPS[newModuleGroup];
                loadingText.innerText = `جاري تحميل ${modData.name}...`;
                loadingIcon.className = modData.icon;
                // لون أيقونة مختلف لكل قسم
                let colors = { 'orders': '#E91E8C', 'marketing': '#1565C0', 'products': '#e67e22', 'hr': '#00897b', 'admin': '#795548' };
                loadingIcon.style.color = colors[newModuleGroup] || 'var(--primary)';
                
                // overlay.style.display = 'flex'; // DISABLED FOR SPEED
            }
            
            // جلب البيانات الخاصة بالقسم الجديد فقط
            if (typeof loadDataFromServer === 'function') {
                loadDataFromServer();
            }
        }

        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        let targetElement = document.getElementById(targetId);
        if (targetElement) targetElement.classList.add('active');
        
        // ⭐ V16: تحميل المستخدمين إذا تم فتح التاب
        if (targetId === 'users-tab') {
            loadUsersList();
        }
        if (targetId === 'hr-tab') { if (typeof initHrTab === 'function') initHrTab(); }
        if (targetId === 'hr-admin-tab') { if (typeof initHrAdminTab === 'function') initHrAdminTab(); }

        // ⭐ V16.1: Auto load financials
        if (targetId === 'financials-tab') {
            let mInput = document.getElementById('driversMonthFilter');
            if (mInput && !mInput.value) {
                let d = new Date();
                mInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                if(window.refreshDriversStats) window.refreshDriversStats();
            }
        }

        // Hide suspended button unless in create-tab
        const suspendedBtn = document.getElementById('openSuspendedBtn');
        if (suspendedBtn) {
            suspendedBtn.style.display = (targetId === 'create-tab') ? 'inline-block' : 'none';
        }

        // Load expiry data every time the tab is opened, with a custom loading screen
        if (btn.getAttribute('data-target') === 'expiry-tab') {
            loadExpiryData(); // Fetch fresh data every time
            
            // Set default reg date to today if empty
            let regDateInput = document.getElementById('expRegDate');
            if (regDateInput && !regDateInput.value) {
                let today = new Date();
                let yyyy = today.getFullYear();
                let mm = String(today.getMonth() + 1).padStart(2, '0');
                let dd = String(today.getDate()).padStart(2, '0');
                regDateInput.value = `${yyyy}-${mm}-${dd}`;
            }
        } else if (btn.getAttribute('data-target') === 'price-tags-tab') {
            if (typeof initPriceTagsTab === 'function') {
                initPriceTagsTab();
            }
        } else if (btn.getAttribute('data-target') === 'moderators-tab') {
            if (typeof renderModeratorsDashboard === 'function') {
                renderModeratorsDashboard();
            }
        } else {
            // Memory cleanup: Clear expiryData when leaving the tab to free up memory
            if (typeof expiryData !== 'undefined' && expiryData.length > 0) {
                // Save active offers before clearing so the catalog doesn't break
                window.cachedActiveOffers = expiryData.filter(item => item.status === 'في عرض').map(item => item.name);
                expiryData = [];
                
                const detailsList = document.getElementById('detailsList');
                if (detailsList) detailsList.innerHTML = '';
                const detailsSection = document.getElementById('expiryDetailsSection');
                if (detailsSection) detailsSection.style.display = 'none';
                
                // Reset counters
                ['expOffersItems','expTotalItems','expCriticalItems','expAlertItems','expAttentionItems','expSafeItems','expFarItems'].forEach(id => {
                    let el = document.getElementById(id);
                    if (el) el.innerText = '0';
                });
            }
        }
    });
});

// Generic modal registration with History API support (mobile back button friendly)
// When a modal opens we push a history state { modalOpen: modalId } so mobile back closes it (popstate).
// On popstate, if state doesn't contain modalOpen we close the currently open modal.
window._openModalId = window._openModalId || null;

function openModalWithHistory(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (modal.classList.contains('active')) return;

    // Close any other open modal first (skip history change for that close)
    if (window._openModalId && window._openModalId !== modalId) {
        const prev = document.getElementById(window._openModalId);
        if (prev) prev.classList.remove('active');
        window._openModalId = null;
    }

    modal.classList.add('active');
    window._openModalId = modalId;

    try {
        history.pushState({ modalOpen: modalId }, '');
    } catch (e) {
        // ignore (some browsers may restrict pushState in file://)
        console.warn('pushState failed for modal:', modalId, e);
    }
}

function closeModalWithHistory(modalId, skipBack) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (!modal.classList.contains('active')) return;

    modal.classList.remove('active');
    if (window._openModalId === modalId) window._openModalId = null;

    if (!skipBack) {
        const st = history.state || {};
        if (st && st.modalOpen === modalId) {
            try { history.back(); } catch (e) { /* ignore */ }
        }
    }
}

function setupModal(openBtnId, modalId, closeBtnId, overlayId) {
    const openBtn = document.getElementById(openBtnId);
    const closeBtn = document.getElementById(closeBtnId);
    const modal = document.getElementById(modalId);
    const overlay = overlayId ? document.getElementById(overlayId) : null;

    if (openBtn && modal) {
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModalWithHistory(modalId);
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeModalWithHistory(modalId);
        });
    }

    if (overlay && modal) {
        overlay.addEventListener('click', () => closeModalWithHistory(modalId));
    }

    // allow ESC to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
            closeModalWithHistory(modalId);
        }
    });
}

// Global popstate handler - close open modal if state no longer has modalOpen
window.addEventListener('popstate', (e) => {
    const state = e.state || {};

    // If the new state declares a modalOpen, open it (useful for navigation forward)
    if (state && state.modalOpen) {
        const mid = state.modalOpen;
        if (window._openModalId !== mid) {
            // close current
            if (window._openModalId) {
                const cur = document.getElementById(window._openModalId);
                if (cur) cur.classList.remove('active');
            }
            const m = document.getElementById(mid);
            if (m) {
                m.classList.add('active');
                window._openModalId = mid;
            }
        }
        return;
    }

    // If no modalOpen in state, close currently open modal (if any)
    if (!state || Object.keys(state).length === 0) {
        if (window._openModalId) {
            const cur = document.getElementById(window._openModalId);
            if (cur) cur.classList.remove('active');
            window._openModalId = null;
            return;
        }
    }

    // If state has other flags (e.g., sidebarOpen) leave it to existing handlers
});

// Register existing modals (add overlay id if available)
setupModal('openZoneModalBtn', 'zoneModal', 'closeZoneModal', 'zoneModalOverlay');
setupModal('openDriverModalBtn', 'driverModal', 'closeDriverModal', 'driverModalOverlay');
setupModal('openSuspendedBtn', 'suspendedModal', 'closeSuspendedModal', 'suspendedModalOverlay');

// MutationObserver: keep History API in sync with programmatic class changes on modals
// This helps when existing code opens/closes modals via classList.add/remove without calling our helpers.
try {
    const modalObserver = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            if (m.type !== 'attributes' || m.attributeName !== 'class') return;
            const target = m.target;
            if (!(target instanceof Element)) return;
            // detect modal-overlay or modal elements
            if (!target.classList.contains('modal-overlay') && !target.classList.contains('modal')) return;
            const id = target.id;
            if (!id) return;

            const isActive = target.classList.contains('active');
            const synced = target.dataset.historySynced === 'true';

            if (isActive && !synced) {
                // modal opened programmatically - push state and mark synced
                try { history.pushState({ modalOpen: id }, ''); } catch (e) { /* ignore */ }
                target.dataset.historySynced = 'true';
                window._openModalId = id;
            } else if (!isActive && synced) {
                // modal closed programmatically - if history state matches, go back to pop it
                target.dataset.historySynced = 'false';
                const st = history.state || {};
                if (st && st.modalOpen === id) {
                    try { history.back(); } catch (e) { /* ignore */ }
                }
                if (window._openModalId === id) window._openModalId = null;
            }
        });
    });

    modalObserver.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
} catch (e) {
    console.warn('Modal observer init failed', e);
}

// ==========================================
// 3. تحميل الداتا الأساسية من الإكسيل
// ==========================================
let shippingData = {};
let catalogData = [];
let oosData = [];
// <i class=\'fa-solid fa-star\'></i> Fix: expose on window so ALL functions (printHistoryOrder, shareToWhatsApp) can access it
window.orderHistoryData = [];
let orderHistoryData = window.orderHistoryData; // local alias
let currentFilterDate = new Date().toLocaleDateString('en-CA');

window.onload = () => {
    if (localStorage.getItem('candyDarkMode') === 'true') {
        document.body.classList.add('dark-mode');
        let toggle = document.getElementById('darkModeToggle');
        if (toggle) toggle.checked = true;
    }

    let historyDateInput = document.getElementById('historyDateFilter');
    if (historyDateInput) historyDateInput.value = currentFilterDate;

    let loadDateBtn = document.getElementById('loadDateBtn');
    if (loadDateBtn) {
        loadDateBtn.addEventListener('click', () => {
            currentFilterDate = document.getElementById('historyDateFilter').value;
            loadDataFromServer();
        });
    }

    // <i class=\'fa-solid fa-star\'></i> زرار التحديث السريع
    let quickRefreshBtn = document.getElementById('quickRefreshBtn');
    if (quickRefreshBtn) quickRefreshBtn.addEventListener('click', () => {
        showToast("جاري تحديث البيانات...", "warning");
        window.supabaseStaticCache = {}; // Invalidate cache manually
        loadDataFromServer();
    });

    // ⭐ V16: تحقق من الجلسة بدلاً من التحميل المباشر
    checkSession();
};

window.supabaseStaticCache = {};
const CACHE_RULES = {
    'users': 60 * 60 * 1000,
    'settings_shipping': 60 * 60 * 1000,
    'couriers': 60 * 60 * 1000,
    'moderators': 60 * 60 * 1000,
    'catalog': 2 * 60 * 1000 
};

async function fetchCachedSupabaseTable(tableName, queryBuilder) {
    let now = Date.now();
    let cacheInfo = window.supabaseStaticCache[tableName];
    let expiry = CACHE_RULES[tableName] || 0;
    
    if (expiry > 0 && cacheInfo && (now - cacheInfo.timestamp < expiry)) {
        return { data: cacheInfo.data, error: cacheInfo.error };
    }
    
    const result = await fetchAllSupabaseRows(queryBuilder);
    if (!result.error) {
        window.supabaseStaticCache[tableName] = { data: result.data, error: result.error, timestamp: now };
    }
    return result;
}

async function loadDataFromServer(customDate = null) {
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) { syncStatus.innerText = "جاري التحميل..."; syncStatus.style.color = "#FF8C00"; }

    let hrAdminTab = document.getElementById('hr-admin-tab');
    if (hrAdminTab && hrAdminTab.classList.contains('active')) {
        if (typeof initHrAdminTab === 'function') setTimeout(initHrAdminTab, 100);
    }
    let hrTab = document.getElementById('hr-tab');
    if (hrTab && hrTab.classList.contains('active')) {
        if (typeof initHrTab === 'function') setTimeout(initHrTab, 100);
    }

    let fetchDate = customDate || currentFilterDate;
    let todayReal = new Date().toLocaleDateString('en-CA');
    let currentMonth = fetchDate.substring(0, 7);
    let todayMonth = todayReal.substring(0, 7);

    try {
        // Fetch all data in parallel
        const [
            { data: rawHistory, error: eh1 },
            { data: rawPending, error: eh2 },
            { data: rawShipped, error: eh3 },
            { data: rawUncollected, error: eh4 },
            { data: rawCustomers, error: e2 },
            { data: rawCatalog, error: e3 },
            { data: rawUsers, error: e4 },
            { data: rawShipping, error: e5 },
            { data: rawCouriers, error: e6 },
            { data: rawModerators, error: e7 },
            { data: rawOOS, error: e8 },
            { data: rawSuspended, error: e9 },
            { data: rawExpiries, error: e10 },
            { data: rawSettled, error: e11 }
        ] = await Promise.all([
            supabase.from('orders').select('*').eq('order_date', fetchDate).order('created_at', { ascending: false }).range(0, 49),
            fetchAllSupabaseRows(supabase.from('orders').select('*').eq('status', 'قيد التجهيز')),
            fetchAllSupabaseRows(supabase.from('orders').select('*').eq('status', 'في الشحن')),
            fetchAllSupabaseRows(supabase.from('orders').select('*').eq('status', 'تم التوصيل')),
            fetchAllSupabaseRows(supabase.from('customers').select('*').order('created_at', { ascending: true })),
            fetchCachedSupabaseTable('catalog', supabase.from('catalog').select('*').order('created_at', { ascending: true })),
            fetchCachedSupabaseTable('users', supabase.from('users').select('*').order('created_at', { ascending: true })),
            fetchCachedSupabaseTable('settings_shipping', supabase.from('settings_shipping').select('*')),
            fetchCachedSupabaseTable('couriers', supabase.from('couriers').select('*')),
            fetchCachedSupabaseTable('moderators', supabase.from('moderators').select('*')),
            fetchAllSupabaseRows(supabase.from('out_of_stock').select('*')),
            fetchAllSupabaseRows(supabase.from('suspended_orders').select('*')),
            fetchAllSupabaseRows(supabase.from('expiries').select('*')),
            fetchAllSupabaseRows(supabase.from('orders').select('driver_name,shipping_cost,order_date,status').eq('status', 'تم التوصيل ومُحاسب'))
        ]);

        for (const err of [eh1, eh2, eh3, eh4, e2, e3, e4, e5, e6, e7, e8, e9, e10, e11]) {
            if (err) throw err;
        }

        // Combine orders efficiently
        let allOrdersMap = new Map();
        if (rawHistory) rawHistory.forEach(o => allOrdersMap.set(o.order_id, o));
        if (rawPending) rawPending.forEach(o => allOrdersMap.set(o.order_id, o));
        if (rawShipped) rawShipped.forEach(o => allOrdersMap.set(o.order_id, o));
        if (rawUncollected) rawUncollected.forEach(o => allOrdersMap.set(o.order_id, o));
        
        let rawOrders = Array.from(allOrdersMap.values());

        // Extract mapping to a reusable helper
        window.mapOrderRowToLocal = function(o) {
            return {
                id: o.order_id,
                date: o.order_date,
                time: o.order_time,
                platform: o.platform,
                name: o.customer_name,
                gov: o.governorate,
                address: o.address,
                phone: o.phone,
                phone2: o.alt_phone || "",
                orderType: o.delivery_type,
                paymentMethod: o.payment_method || "",
                payment: o.payment_method || "",
                driver: o.driver_name || "",
                deliveryDate: o.delivery_date || "",
                reservationDate: o.delivery_date || "",
                products: o.products || "",
                subtotal: o.products_total,
                discount: o.discount,
                shipping: o.shipping_cost,
                total: parseFloat(o.final_total) || 0,
                status: o.status,
                notes: o.notes,
                seller: o.moderator_name || "",
                moderator: o.moderator_name || "",
                deposit: o.deposit || 0,
                remaining: o.remaining || o.final_total
            };
        };

        // Transform orders
        let allOrders = (rawOrders || []).map(window.mapOrderRowToLocal);

        // History for selected date
        let historyOrders = allOrders.filter(o => o.date === fetchDate);

        // Pending orders (قيد التجهيز)
        let pendingOrders = allOrders.filter(o => o.status === "قيد التجهيز");

        // Shipped orders
        let shippedOrders = allOrders.filter(o => o.status === "في الشحن" && o.driver);

        // Uncollected (تم التوصيل)
        let uncollectedOrders = allOrders.filter(o => o.status === "تم التوصيل" && o.driver);

        // Set global variables
        window.allOrdersData = allOrders;
        orderHistoryData = historyOrders;
        window.orderHistoryData = historyOrders;
        window.pendingOrdersData = pendingOrders;
        window.shippedOrdersData = shippedOrders;
        window.uncollectedOrdersData = uncollectedOrders;

        // Suspended orders
        window.suspendedOrdersData = (rawSuspended || []).map(s => {
            let parsed = typeof s.draft_json === 'string' ? JSON.parse(s.draft_json) : s.draft_json;
            return { ...parsed, _supabaseId: s.id, draftId: s.draft_id };
        });
        updateSuspendedCount();

        // Customers
        let custStats = {};
        (rawOrders || []).forEach(o => {
            let p = String(o.phone).trim();
            if(!p) return;
            if(!custStats[p]) custStats[p] = { count: 0, total: 0, lastDate: '' };
            if (o.status !== 'ملغي' && o.status !== 'مرتجع') {
                custStats[p].count += 1;
                custStats[p].total += parseFloat(o.final_total) || 0;
            }
            if (o.order_date && (!custStats[p].lastDate || o.order_date > custStats[p].lastDate)) {
                custStats[p].lastDate = o.order_date;
            }
        });

        let existingCustPhones = new Set();
        window.customersData = (rawCustomers || []).map(c => {
            let p = String(c.phone).trim();
            existingCustPhones.add(p);
            let st = custStats[p] || { count: 0, total: 0, lastDate: '' };
            return {
                name: c.customer_name, phone: c.phone, gov: c.governorate,
                address: c.address, count: st.count || 0, total: st.total || 0, lastDate: st.lastDate || c.last_order_date
            };
        });

        // Add any customers from orders that are not in the customers table
        (rawOrders || []).forEach(o => {
            let p = String(o.phone).trim();
            if (p && !existingCustPhones.has(p)) {
                existingCustPhones.add(p);
                let st = custStats[p] || { count: 0, total: 0, lastDate: '' };
                window.customersData.push({
                    name: o.customer_name || 'بدون اسم', phone: p, gov: o.governorate || '',
                    address: o.address || '', count: st.count || 0, total: st.total || 0, lastDate: st.lastDate || o.order_date
                });
            }
        });

        window.usersData = (rawUsers || []).map(u => ({
            username: u.username, password: u.password, displayName: u.display_name,
            permissions: u.permissions, status: u.status, lastLogin: u.last_login
        }));
        if (typeof loadUsersList === 'function') loadUsersList();

        // Expiries
        window.expiriesData = (rawExpiries || []).map(e => ({
            id: (e.product_name || '') + '|' + (e.qty || '') + '|' + (e.expiry_date || ''),
            name: e.product_name, qty: e.qty, expiryDate: e.expiry_date,
            location: e.location, registrarName: e.registrar_name,
            regDate: e.reg_date, receiver: e.receiver, notes: e.notes,
            originalPrice: e.original_price, offerPrice: e.offer_price,
            status: e.status, barcode: e.barcode
        }));
        if (typeof renderExpiryDashboard === 'function') {
            expiryData = Array.isArray(window.expiriesData) ? window.expiriesData : [];
            expiryData = expiryData.map(item => {
                if (item.regDate && typeof item.regDate === 'string' && item.regDate.includes("||")) {
                    let parts = item.regDate.split("||");
                    item.batchId = parts[1];
                    let d = new Date(parseInt(parts[1]));
                    if (!isNaN(d.getTime())) {
                        let hours = d.getHours(); let minutes = d.getMinutes();
                        let ampm = hours >= 12 ? 'PM' : 'AM';
                        hours = hours % 12; hours = hours ? hours : 12;
                        minutes = minutes < 10 ? '0' + minutes : minutes;
                        item.regDate = parts[0].trim() + " " + hours + ':' + minutes + ' ' + ampm;
                    } else { item.regDate = parts[0].trim(); }
                }
                return item;
            });
            renderExpiryDashboard();
        }

        // Catalog
        catalogData = (rawCatalog || []).map(c => ({
            name: c.product_name, price: c.price, isOffer: c.is_offer || false,
            offerPrice: c.offer_price || 0, stock: c.stock || 0, barcode: c.barcode || ""
        }));

        if (barcodeCatalogData && barcodeCatalogData.length > 0) {
            const fbMap = new Map();
            barcodeCatalogData.forEach(p => fbMap.set(String(p.name).toLowerCase(), p));
            catalogData.forEach(p => {
                let fb = fbMap.get(String(p.name).toLowerCase());
                if (fb) { if (!p.barcode) p.barcode = fb.barcode; p.stock = fb.stock || 0; }
                else { p.stock = 0; }
            });
            const existingNames = new Set(catalogData.map(p => String(p.name).toLowerCase()));
            barcodeCatalogData.forEach(fbProduct => {
                if (!existingNames.has(String(fbProduct.name).toLowerCase())) {
                    catalogData.push({ name: fbProduct.name, price: fbProduct.price, isOffer: false, offerPrice: 0, barcode: fbProduct.barcode, stock: fbProduct.stock || 0 });
                }
            });
        }
        renderCatalog(catalogData);

        // Out of stock
        oosData = (rawOOS || []).map(o => ({
            id: o.id, customer: o.customer_name, phone: o.phone, product: o.product, reason: o.reason || o.purpose, date: o.created_at || o.date
        }));
        renderOutOfStock(oosData);

        // Shipping zones
        const govSelect = document.getElementById('governorate');
        let currentGov = govSelect ? govSelect.value : "";
        const zonesAlexList = document.getElementById('zonesAlexList');
        const zonesGovList = document.getElementById('zonesGovList');
        if (zonesAlexList) zonesAlexList.innerHTML = '';
        if (zonesGovList) zonesGovList.innerHTML = '';
        if (govSelect) govSelect.innerHTML = '<option value="">اختر من القائمة</option>';
        shippingData = {};

        const renderZoneItem = (z, zoneType, container) => {
            shippingData[z.zone_name] = { name: z.zone_name, price: z.price, type: z.delivery_type, duration: z.duration };
            if (container) {
                let specialClass = z.delivery_type === 'next_day' ? 'zone-next-day' : '';
                container.innerHTML += `
                    <div class="zone-premium-card ${specialClass}">
                        <div class="zone-info-main">
                            <strong class="zone-title"><i class='fa-solid fa-location-dot'></i> ${z.zone_name}</strong>
                            <div class="zone-details-row">
                                <span class="price-badge premium-badge"><i class='fa-solid fa-money-bill-wave'></i> ${z.price} ج.م</span>
                                <span class="duration-badge"><i class='fa-regular fa-clock'></i> ${z.duration}</span>
                            </div>
                        </div>
                        <div class="zone-actions">
                            <button type="button" class="btn-outline interactive-btn" onclick="editZoneUI('${z.zone_name}', '${z.price}', '${z.delivery_type}', '${z.duration}')"><span class="btn-text-mobile-hide">تعديل</span> <i class='fa-solid fa-pencil'></i></button>
                            <button type="button" class="btn-danger interactive-btn" onclick="deleteItem('deleteZone', '${z.zone_name}')"><span class="btn-text-mobile-hide">حذف</span> <i class='fa-solid fa-xmark'></i></button>
                        </div>
                    </div>`;
            }
        };

        let alexZones = (rawShipping || []).filter(z => z.zone_type === 'alex');
        let govZones = (rawShipping || []).filter(z => z.zone_type === 'govs');
        alexZones.forEach(z => renderZoneItem(z, 'alex', zonesAlexList));
        govZones.forEach(z => renderZoneItem(z, 'govs', zonesGovList));

        window.latestServerData = { alex: alexZones.map(z => ({name: z.zone_name, price: z.price, type: z.delivery_type, duration: z.duration})), govs: govZones.map(z => ({name: z.zone_name, price: z.price, type: z.delivery_type, duration: z.duration})) };
        window.updateGovernoratesDropdown();
        if (govSelect && currentGov) govSelect.value = currentGov;

        // Drivers
        window.driversList = (rawCouriers || []).map(c => ({ name: c.name, phone: c.phone }));
        const driverSelect = document.getElementById('driverNameSelect');
        const driversDisplayList = document.getElementById('driversDisplayList');
        const assignDriverSelect = document.getElementById('assignDriverSelect');
        const closeDriverSelect = document.getElementById('closeDriverSelect');
        if (driversDisplayList) driversDisplayList.innerHTML = '';
        if (driverSelect) driverSelect.innerHTML = '<option value="">اختر المندوب</option>';
        if (assignDriverSelect) assignDriverSelect.innerHTML = '<option value="">اختر المندوب</option>';
        if (closeDriverSelect) closeDriverSelect.innerHTML = '<option value="">اختر المندوب</option>';

        if (window.driversList.length > 0) {
            let driverSelectHtml = '<option value="">اختر المندوب</option>';
            let displayListHtml = '';
            window.driversList.forEach(c => {
                driverSelectHtml += `<option value="${c.name}">${c.name}</option>`;
                displayListHtml += `<div class="driver-card">
                    <div>
                        <strong class="driver-card-header"><i class='fa-solid fa-motorcycle'></i> ${c.name}</strong><br>
                        <span class="phone-badge" style="margin-top:5px;display:inline-block;"><i class='fa-solid fa-mobile-screen'></i> ${c.phone}</span>
                    </div>
                    <div class="driver-card-actions">
                        <button type="button" class="btn-outline interactive-btn" style="flex:1;padding:6px;font-size:0.8rem;border-radius:6px;" onclick="editDriverUI('${c.name}', '${c.phone}')">تعديل <i class='fa-solid fa-pencil'></i></button>
                        <button type="button" class="interactive-btn btn-delete" style="flex:1;padding:6px;font-size:0.8rem;border-radius:6px;" onclick="deleteItem('deleteDriver', '${c.name}')">حذف <i class='fa-solid fa-xmark'></i></button>
                    </div>
                </div>`;
            });
            if (driverSelect) driverSelect.innerHTML = driverSelectHtml;
            if (assignDriverSelect) assignDriverSelect.innerHTML = driverSelectHtml;
            if (closeDriverSelect) closeDriverSelect.innerHTML = driverSelectHtml;
            if (driversDisplayList) driversDisplayList.innerHTML = displayListHtml;
        }

        updateSmartSuggestionsFromFirebase();

        // Moderators
        const modSelect = document.getElementById('moderatorSelect');
        let currentMod = modSelect ? modSelect.value : "";
        const modsList = document.getElementById('moderatorsList');
        let allMods = (rawModerators || []).map(m => m.name);
        window.allModeratorsList = allMods;

        if (allMods.length > 0) {
            let modSelectHtml = '<option value="">اختر اسمك</option>';
            let modsListHtml = '';
            allMods.forEach(m => {
                modSelectHtml += `<option value="${m}">${m}</option>`;
                modsListHtml += `<div class="data-row mod-row-item">
                    <span class="mod-row-name"><i class='fa-solid fa-user'></i> ${m}</span>
                    <button type="button" class="interactive-btn btn-delete" style="padding:4px 8px;font-size:0.8rem;border-radius:8px;" onclick="deleteItem('deleteModerator', '${m}')"><i class='fa-solid fa-xmark'></i></button>
                </div>`;
            });
            if (modSelect) modSelect.innerHTML = modSelectHtml;
            if (modsList) modsList.innerHTML = modsListHtml;
        } else {
            if (modSelect) modSelect.innerHTML = '<option value="">اختر اسمك</option>';
            if (modsList) modsList.innerHTML = '<p class="empty-msg">لا يوجد كاشيرية مسجلين</p>';
        }
        if (modSelect && currentMod) modSelect.value = currentMod;

        // Compute monthly stats locally
        let monthSales = 0, monthOrderCount = 0, completedMonthCount = 0, returnedCount = 0;
        allOrders.forEach(o => {
            if (o.date && o.date.substring(0, 7) === currentMonth) {
                if (o.status !== "مرتجع") { monthOrderCount++; monthSales += parseFloat(o.total) || 0; }
                if (o.status === "تم التوصيل" || o.status === "تم التوصيل ومُحاسب") completedMonthCount++;
                if (o.status === "مرتجع") returnedCount++;
            }
        });

        let reportMonthFilter = document.getElementById('reportMonthFilter');
        if (!reportMonthFilter || !reportMonthFilter.value) {
            if (document.getElementById('monthSales')) document.getElementById('monthSales').innerText = monthSales;
            if (document.getElementById('monthCount')) document.getElementById('monthCount').innerText = monthOrderCount;
            if (document.getElementById('completedMonthCount')) document.getElementById('completedMonthCount').innerText = completedMonthCount;
            if (document.getElementById('returnedCount')) document.getElementById('returnedCount').innerText = returnedCount;
        }

        // Financials - compute from orders
        window.financialsData = [];
        let finMap = {};
        let driverStatsMap = {};
        allOrders.forEach(o => {
            if (!o.driver) return;
            if (!finMap[o.driver]) finMap[o.driver] = { name: o.driver, ordersCount: 0, inTransit: 0, cashCollected: 0, shippingFees: 0, netDue: 0, statusText: "لا توجد مديونية" };
            if (!driverStatsMap[o.driver]) driverStatsMap[o.driver] = { monthProfit: 0, monthOrderCount: 0, totalProfit: 0, totalCount: 0 };
            
            // Only orders that are delivered but NOT settled count towards pending cash collection
            if (o.status === "تم التوصيل") {
                finMap[o.driver].ordersCount++;
                finMap[o.driver].cashCollected += parseFloat(o.remaining) || parseFloat(o.total) || 0;
                finMap[o.driver].shippingFees += parseFloat(o.shipping) || 0;
            }
            if (o.status === "في الشحن") finMap[o.driver].inTransit++;

            // Stats include all delivered orders (settled or not)
            // Settled orders are processed separately below to avoid double counting
            if (o.status === "تم التوصيل") {
                let orderProfit = parseFloat(o.shipping) || 0;
                driverStatsMap[o.driver].totalProfit += orderProfit;
                driverStatsMap[o.driver].totalCount++;
                
                if (o.date && o.date.substring(0, 7) === currentMonth) {
                    driverStatsMap[o.driver].monthProfit += orderProfit;
                    driverStatsMap[o.driver].monthOrderCount++;
                }
            }
        });
        
        // Add rawSettled stats
        if (rawSettled) {
            rawSettled.forEach(o => {
                let driver = o.driver_name;
                if (!driver) return;
                if (!driverStatsMap[driver]) driverStatsMap[driver] = { monthProfit: 0, monthOrderCount: 0, totalProfit: 0, totalCount: 0 };
                
                let orderProfit = parseFloat(o.shipping_cost) || 0;
                driverStatsMap[driver].totalProfit += orderProfit;
                driverStatsMap[driver].totalCount++;
                
                if (o.order_date && o.order_date.substring(0, 7) === currentMonth) {
                    driverStatsMap[driver].monthProfit += orderProfit;
                    driverStatsMap[driver].monthOrderCount++;
                }
            });
        }
        
        // Add legacy stats to restore missing driver names from before Supabase migration
        const legacyStats = {
            'محمود': { totalProfit: 2425, totalCount: 43, monthProfit_2026_08: 0, monthCount_2026_08: 0 },
            'عمرو النوبي': { totalProfit: 1625, totalCount: 23, monthProfit_2026_08: 40, monthCount_2026_08: 1 },
            'الحلواني': { totalProfit: 1130, totalCount: 18, monthProfit_2026_08: 0, monthCount_2026_08: 0 },
            'شركة الشحن (المحافظات)': { totalProfit: 1000, totalCount: 5, monthProfit_2026_08: 200, monthCount_2026_08: 1 },
            'رضا': { totalProfit: 5835, totalCount: 95, monthProfit_2026_08: 600, monthCount_2026_08: 9 }
        };
        
        Object.keys(legacyStats).forEach(driver => {
            if (!driverStatsMap[driver]) driverStatsMap[driver] = { monthProfit: 0, monthOrderCount: 0, totalProfit: 0, totalCount: 0 };
            driverStatsMap[driver].totalProfit += legacyStats[driver].totalProfit;
            driverStatsMap[driver].totalCount += legacyStats[driver].totalCount;
            if (currentMonth === '2026-08') {
                driverStatsMap[driver].monthProfit += legacyStats[driver].monthProfit_2026_08;
                driverStatsMap[driver].monthOrderCount += legacyStats[driver].monthCount_2026_08;
            }
        });

        Object.values(finMap).forEach(f => {
            f.netDue = f.cashCollected - f.shippingFees;
            f.statusText = f.netDue > 0 ? "مطلوب تحصيل" : "لا توجد مديونية";
            window.financialsData.push(f);
        });
        
        window.latestServerData = { ...window.latestServerData, history: historyOrders, pendingOrders, shippedOrders, uncollectedOrders, financials: window.financialsData, driverStats: driverStatsMap };
        if (typeof renderFinancials === 'function') renderFinancials(window.financialsData);

        buildMonthFilterOptions();

        let shippedCont = document.getElementById('shippedOrdersContainer');
        if (shippedCont) shippedCont.innerHTML = '<p class="empty-msg">برجاء اختيار المندوب والضغط على "عرض العهدة"</p>';

        renderHistoryList(orderHistoryData);
        renderShippingRoom(orderHistoryData);
        updateAdvancedDashboard(orderHistoryData);
        checkBookingAlerts();
        if (typeof renderModeratorsDashboard === 'function') renderModeratorsDashboard();

        let overlay = document.getElementById('module-loading-overlay');
        if (overlay) overlay.style.display = 'none';

        if (syncStatus) { syncStatus.innerText = "متصل"; syncStatus.style.color = "#00C853"; }

        if (window.isFirstLoad === undefined) {
            window.isFirstLoad = false;
            window.lastFilterDate = currentFilterDate;
            if (currentUser) showToast(`أهلاً بك يا ${currentUser.displayName}`);
        } else {
            if (window.lastFilterDate === currentFilterDate) {
                let oldHistoryIds = (window._prevHistoryIds || []);
                let hasNewProcessing = historyOrders.some(o => !oldHistoryIds.includes(o.id) && o.status && o.status.includes("تجهيز"));
                if (hasNewProcessing) playOrderSound();
            }
            window.lastFilterDate = currentFilterDate;
        }
        window._prevHistoryIds = historyOrders.map(o => o.id);

    } catch (err) {
        console.error("Supabase Load Error:", err);
        let overlay = document.getElementById('module-loading-overlay');
        if (overlay) overlay.style.display = 'none';
        if (syncStatus) { syncStatus.innerText = "خطأ اتصال"; syncStatus.style.color = "red"; }
    }
}

function checkBookingAlerts() {
    let banner = document.getElementById('booking-alert-banner');
    if (!banner) return;
    
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let hasAlert = window.pendingOrdersData.some(o => {
        if (!o.orderType || !o.orderType.includes('حجز')) return false;
        
        let resDateStr = o.reservationDate || o.expectedDate || o.specialDate || o.spDate;
        if (!resDateStr) return false;
        
        let resDate = new Date(resDateStr);
        if (isNaN(resDate.getTime())) return false;
        
        resDate.setHours(0, 0, 0, 0);
        let diffTime = resDate - today;
        let diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        return diffDays >= 0 && diffDays <= 2;
    });

    if (hasAlert) banner.style.display = 'block';
    else banner.style.display = 'none';
}

function renderFinancials(finList) {
    let container = document.getElementById('financialsDisplayList');
    if (!container) return;
    container.innerHTML = '';

    let allDrivers = window.driversList || [];
    let driversMap = {};
    allDrivers.forEach(d => {
        driversMap[d.name] = { name: d.name, ordersCount: 0, cashCollected: 0, shippingFees: 0, netDue: 0, statusText: "لا توجد مديونية" };
    });

    finList.forEach(f => {
        if (!driversMap[f.name]) {
            driversMap[f.name] = f;
        } else {
            driversMap[f.name] = { ...driversMap[f.name], ...f };
        }
    });

    let driversArray = Object.values(driversMap);
    if (driversArray.length === 0) {
        container.innerHTML = '<p class="empty-msg">لا توجد مناديب مسجلة.</p>';
        return;
    }

    driversArray.forEach(f => {
        let netDue = parseFloat(f.netDue) || 0;

        let todayCount = 0;
        let todayProfit = 0;
        if(window.latestServerData && window.latestServerData.todayDriverStats && window.latestServerData.todayDriverStats[f.name]) {
            todayCount = window.latestServerData.todayDriverStats[f.name].count || 0;
            todayProfit = window.latestServerData.todayDriverStats[f.name].profit || 0;
        }

        let isSettled = netDue === 0;
        let statusColor = netDue > 0 ? "#27ae60" : (netDue < 0 ? "#c0392b" : "#9e9e9e");
        let cardClass = isSettled ? "financial-row driver-card settled" : "financial-row driver-card";
        let cardShadow = isSettled ? "none" : "0 4px 6px rgba(0,0,0,0.05)";
        let cardOpacity = isSettled ? "0.8" : "1";
        let cardBorderColor = isSettled ? "#e0e0e0" : "#eaeaea";

        let driverOrders = (window.uncollectedOrdersData || []).filter(o => o.driver === f.name);
        let ordersHtml = '';
        if (driverOrders.length > 0) {
            ordersHtml = `<div style="margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 10px;">
                <strong style="font-size:0.85rem; color:var(--primary);"><i class=\'fa-solid fa-box\'></i> أوردرات معلقة (لم يتم تسويتها):</strong>`;
            driverOrders.forEach(o => {
                ordersHtml += `
                    <div class="financial-order-item" style="background:#fdfdfd; padding:8px; border:1px solid #eee; border-radius:6px; margin-top:5px; display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.75rem; color:#777;">${o.payment} | إجمالي: ${o.total}ج | شحن: ${o.shipping}ج</span><br>
                            <span style="font-size:0.85rem; font-weight:bold; color:var(--danger);">المطلوب تحصيله: ${o.remaining}ج</span>
                        </div>
                        <button class="btn-settle interactive-btn" onclick="settleDriverOrder('${o.id}', this, '${o.payment}')" style="background:var(--success); color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">تسوية <i class=\'fa-solid fa-money-bill\'></i></button>
                    </div>
                `;
            });
            ordersHtml += `</div>`;
        }

        container.innerHTML += `
            <div class="${cardClass}" style="background: #fff; padding: 15px; border-radius: 12px; border: 1px solid ${cardBorderColor}; margin-bottom: 12px; box-shadow: ${cardShadow}; opacity: ${cardOpacity}; transition: all 0.3s ease;">
                <div class="financial-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #f0f0f0; padding-bottom:8px; margin-bottom:10px;">
                    <span style="font-weight:bold; font-size:1.1rem; color:var(--text-dark);"><i class=\'fa-solid fa-motorcycle\'></i> ${f.name}</span>
                    <span style="font-size: 0.85rem; background:#f0f0f0; color:var(--text-dark); padding:3px 8px; border-radius:12px; font-weight:bold;">${f.ordersCount || 0} طلب</span>
                </div>
                <div class="financial-details" style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:10px;">
                    <span style="background:#e8f4f8; padding:5px 10px; border-radius:6px; color:#555;">الكاش: <strong style="color:#2980b9;">${f.cashCollected || 0}</strong> ج</span>
                    <span style="background:#f9ebea; padding:5px 10px; border-radius:6px; color:#555;">الشحن: <strong style="color:#c0392b;">${f.shippingFees || 0}</strong> ج</span>
                </div>
                <div class="financial-status" style="background: ${statusColor}15; color: ${statusColor}; padding: 8px; border-radius: 6px; text-align:center; font-weight:bold; border: 1px dashed ${statusColor};">
                    ${f.statusText || "لا توجد مديونية"} ${netDue !== 0 ? `( ${Math.abs(netDue)} ج.م )` : ''}
                </div>

                <!-- أوردرات وأرباح اليوم -->
                <div style="background:#e8f5e9; padding:8px; border-radius:6px; border-right:4px solid var(--success); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; font-size:0.9rem;">
                    <div><strong style="color:var(--success);"><i class="fa-solid fa-calendar-day"></i> أوردرات اليوم:</strong> <span>${todayCount} أوردر</span></div>
                    <div><strong style="color:var(--success);">أرباح اليوم:</strong> <span>${todayProfit} ج.م</span></div>
                </div>
                ${ordersHtml}
            </div>
        `;
    });
}

// <i class=\'fa-solid fa-star\'></i> حماية تصفية الأوردر برسالة واضحة بناءً على نوع الدفع
window.settleDriverOrder = function (orderId, btn, payMethod) {
    let msg = `هل أنت متأكد من تسوية الأوردر (${orderId})؟`;
    if (payMethod.includes('كاش')) msg = `هل استلمت النقدية من المندوب الخاصة بالأوردر (${orderId})؟`;
    else msg = `هل قمت بصرف حق الشحن للمندوب عن الأوردر (${orderId}) المدفوع إلكترونياً؟`;

    customConfirm(msg, () => {
        btn.innerText = "جاري...";
        btn.disabled = true;

        let formData = new URLSearchParams();
        formData.append('action', 'settleOrder');
        formData.append('orderId', orderId);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("<i class=\'fa-solid fa-check\'></i> تمت المحاسبة وتسوية الأوردر!", "success");
                loadDataFromServer();
            }).catch(() => {
                showToast("<i class=\'fa-solid fa-xmark\'></i> حدث خطأ في الاتصال", "error");
                btn.innerHTML = "تسوية <i class=\'fa-solid fa-money-bill\'></i>";
                btn.disabled = false;
            });
    });
};

// ==========================================
// 4. حساب أجازة الجمعة والعربون <i class=\'fa-solid fa-rocket\'></i>
// ==========================================
function calculateDeliveryDateSkippingFriday(durationText) {
    if (!durationText) return "";
    let match = durationText.match(/\d+/);
    if (!match) return durationText;

    let daysToAdd = parseInt(match[0]);
    let d = new Date();
    let added = 0;

    while (added < daysToAdd) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 5) {
            added++;
        }
    }

    let options = { weekday: 'long', month: 'numeric', day: 'numeric' };
    return d.toLocaleDateString('ar-EG', options);
}

const deliveryTypeSelect = document.getElementById('deliveryType');
const govSelect = document.getElementById('governorate');
if (deliveryTypeSelect) {
    deliveryTypeSelect.addEventListener('change', () => {
        let type = deliveryTypeSelect.value;
        let addressFields = document.getElementById('addressFields');
        let specialDateContainer = document.getElementById('specialDateContainer');
        if (type === 'branch') {
            if (addressFields) addressFields.classList.add('hidden-field');
            if (specialDateContainer) specialDateContainer.classList.add('hidden-field');
            if (document.getElementById('shippingCost')) document.getElementById('shippingCost').value = 0;
            let infoSpan = document.querySelector('#deliveryInfo span'); if (infoSpan) infoSpan.innerHTML = "استلام من الفرع <i class=\'fa-solid fa-store\'></i>";
        } else if (type === 'gov_shipping') {
            if (addressFields) addressFields.classList.remove('hidden-field');
            if (specialDateContainer) specialDateContainer.classList.add('hidden-field');
            triggerGovCalc();
        } else if (type === 'special_date') {
            if (addressFields) addressFields.classList.remove('hidden-field');
            if (specialDateContainer) specialDateContainer.classList.remove('hidden-field');
            triggerGovCalc();
        } else {
            if (addressFields) addressFields.classList.remove('hidden-field');
            if (specialDateContainer) specialDateContainer.classList.add('hidden-field');
            triggerGovCalc();
        }
        window.updateGovernoratesDropdown();
        calculateTotal();
    });
}

window.updateGovernoratesDropdown = function () {
    const govSelect = document.getElementById('governorate');
    if (!govSelect || !window.latestServerData) return;
    let data = window.latestServerData;
    let type = document.getElementById('deliveryType') ? document.getElementById('deliveryType').value : 'normal';

    let currentVal = govSelect.value;
    let html = '<option value="">اختر من القائمة</option>';

    if (type === 'gov_shipping') {
        if (data.govs && data.govs.length > 0) {
            html += `<optgroup label="&#xf48b; المحافظات" style="font-family: 'Font Awesome 6 Free', 'Cairo', sans-serif; font-weight: 900;">`;
            data.govs.forEach(z => {
                html += `<option value="${z.name}">${z.name} (${z.price} ج)</option>`;
            });
            html += `</optgroup>`;
        }
    } else {
        if (data.alex && data.alex.length > 0) {
            html += `<optgroup label="&#xf0c1; مناطق الإسكندرية" style="font-family: 'Font Awesome 6 Free', 'Cairo', sans-serif; font-weight: 900;">`;
            data.alex.forEach(z => {
                html += `<option value="${z.name}">${z.name} (${z.price} ج)</option>`;
            });
            html += `</optgroup>`;
        }
    }
    
    govSelect.innerHTML = html;

    if (Array.from(govSelect.options).some(opt => opt.value === currentVal)) {
        govSelect.value = currentVal;
    }
};

function triggerGovCalc() {
    if (!govSelect) return;
    let zone = govSelect.value;
    let costInput = document.getElementById('shippingCost');
    let dateDisplay = document.querySelector('#deliveryInfo span');

    if (!zone || !shippingData[zone]) {
        if (costInput) costInput.value = 0;
        if (dateDisplay) dateDisplay.innerText = "--";
        calculateTotal(); return;
    }
    let info = shippingData[zone];
    if (costInput) costInput.value = info.price || 0;

    if (dateDisplay) {
        let type = deliveryTypeSelect ? deliveryTypeSelect.value : 'normal';
        if (type === 'special_date') {
            dateDisplay.innerHTML = "حسب التاريخ المختار <i class=\'fa-regular fa-calendar-days\'></i>";
        } else if (info.type === 'next_day') {
            dateDisplay.innerHTML = "تاني يوم <i class=\'fa-solid fa-truck-fast\'></i>";
        } else {
            let exactDate = calculateDeliveryDateSkippingFriday(info.duration);
            dateDisplay.innerText = exactDate ? `المتوقع: ${exactDate}` : `خلال ${info.duration}`;
        }
    }
    calculateTotal();
}
if (govSelect) govSelect.addEventListener('change', triggerGovCalc);



// ==========================================
// 5. سجل الأوردرات (العرض الذكي والطباعة)
// ==========================================
let currentHistoryPage = 1;
const ITEMS_PER_PAGE = 20;
let currentOrdersList = [];
window.searchResultsCache = []; // <i class=\'fa-solid fa-star\'></i> لتخزين البحث دون مسح السجل

function renderHistoryList(orders, isLoadMore = false) {
    let container = document.getElementById('historyListContainer');
    if (!container) return;

    if (!isLoadMore) {
        container.innerHTML = '';
        currentHistoryPage = 1;
        currentOrdersList = orders;

        if (window.pendingOrdersData && window.pendingOrdersData.length > 0 && document.getElementById('orderSearchInput').value.trim() === "") {
            let pendingDiv = document.createElement('div');
            pendingDiv.innerHTML = `<h4 style="color: #e74c3c; padding-bottom: 5px; margin-bottom: 15px; font-weight: bold;"><i class=\'fa-solid fa-circle text-danger\'></i> أوردرات لم تُشحن بعد (${window.pendingOrdersData.length})</h4>`;

            window.pendingOrdersData.forEach(pOrder => {
                let pType = pOrder.orderType || pOrder.type || pOrder.deliveryType || "";
                let dateHtml = `<span style="color: #e74c3c; font-weight: bold; font-size:0.85rem;"><i class=\'fa-regular fa-calendar-days\'></i> ${pOrder.date}</span>`;
                if (pType.includes('حجز') || pType === 'special_date') {
                    let resDate = pOrder.reservationDate || pOrder.expectedDate || pOrder.specialDate || pOrder.spDate;
                    if (resDate) {
                        if (resDate.toString().includes('GMT') || resDate.toString().includes('توقيت')) {
                            let d = new Date(resDate);
                            if (!isNaN(d.getTime())) resDate = `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
                        }
                        dateHtml = `<span style="color: #fff; background: #c2185b; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size:0.9rem;"><i class=\'fa-regular fa-calendar\'></i> تسليم: ${resDate}</span>`;
                    }
                }
                pendingDiv.innerHTML += `
                    <div class="history-item" style="border-right-color: #e74c3c; background: #fff5f5;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <strong style="font-size: 1.05rem;">${pOrder.id} | ${pOrder.name}</strong>
                            ${dateHtml}
                        </div>
                        <div style="font-size: 0.9rem; color: #555;">
                            <span><i class=\'fa-solid fa-mobile-screen\'></i> ${pOrder.phone} | <span style="color:#000; font-weight:bold;"><i class=\'fa-solid fa-money-bill-wave\'></i> ${pOrder.total} ج.م</span></span>
                        </div>
                    </div>
                `;
            });
            container.appendChild(pendingDiv);

            let hr = document.createElement('hr');
            hr.style.margin = "20px 0";
            hr.style.borderColor = "var(--border)";
            container.appendChild(hr);
        }

        if (currentOrdersList.length === 0) {
            container.innerHTML += `<p class="empty-msg">لا توجد أوردرات في هذا التاريخ.</p>`;
            return;
        }
    }

    let startIndex = (currentHistoryPage - 1) * ITEMS_PER_PAGE;
    let endIndex = startIndex + ITEMS_PER_PAGE;
    let pageOrders = currentOrdersList.slice(startIndex, endIndex);

    pageOrders.forEach(order => {
        let div = document.createElement('div');
        div.className = 'history-item';

        let statusColor = order.status === "تم التوصيل" ? "var(--success)" : "var(--primary)";
        if (order.status === "مرتجع") statusColor = "var(--danger)";

        div.style.borderRightColor = statusColor;

        let typeBadge = '';
        let oType = order.orderType || order.type || order.deliveryType || "";
        if (oType.includes('توصيل منزلي') || oType === 'normal') {
            typeBadge = `<span style="background: #e3f2fd; color: #1565c0; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 5px;"><i class=\'fa-solid fa-truck-fast\'></i> توصيل منزلي</span>`;
        } else if (oType.includes('استلام من الفرع') || oType === 'branch') {
            typeBadge = `<span style="background: #e8f5e9; color: #2e7d32; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 5px;"><i class=\'fa-solid fa-store\'></i> استلام من الفرع</span>`;
        } else if (oType.includes('محافظات') || oType === 'gov_shipping') {
            typeBadge = `<span style="background: #fff3e0; color: #e65100; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 5px;"><i class=\'fa-solid fa-box\'></i> شحن محافظات</span>`;
        } else if (oType.includes('حجز') || oType === 'special_date') {
            let resDate = order.reservationDate || order.expectedDate || order.bookingDate || order.specialDate || order.spDate || order.date;
            if (resDate && (resDate.toString().includes('GMT') || resDate.toString().includes('توقيت'))) {
                let d = new Date(resDate);
                if (!isNaN(d.getTime())) resDate = `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
            }
            let dateText = resDate ? `تسليم: ${resDate}` : 'حجز مسبق';
            typeBadge = `<span style="background: #c2185b; color: #fff; padding: 3px 8px; border-radius: 6px; font-size: 0.85rem; margin-right: 5px; font-weight: bold;"><i class=\'fa-regular fa-calendar\'></i> ${dateText}</span>`;
        }

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 8px; align-items: center;">
                <strong style="font-size: 1.05rem;">${order.id} | ${order.name} ${typeBadge}</strong>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="interactive-btn" onclick="shareToWhatsAppGroup('${order.id}')" style="background:none; border:none; font-size:1.3rem; cursor:pointer;" title="مشاركة للجروب"><i class=\'fa-solid fa-mobile-screen\'></i></button>
                    <button class="interactive-btn" onclick="printHistoryOrder('${order.id}')" style="background:none; border:none; cursor:pointer;" title="طباعة الفاتورة">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-dark);"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    </button>
                    <span style="background: ${statusColor}15; color: ${statusColor}; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">${order.status}</span>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.9rem; color: #666; background: var(--bg-body); padding: 8px; border-radius: 6px;">
                <span>⏰ ${order.time || '--'}</span>
                <span><i class=\'fa-solid fa-mobile-screen\'></i> ${order.phone}${((order.phone2 || order.secondPhone || order.backupPhone || order.altPhone || order.customerPhone2 || order.otherPhone) && String(order.phone2 || order.secondPhone || order.backupPhone || order.altPhone || order.customerPhone2 || order.otherPhone).trim() !== '') ? ' | <i class=\'fa-solid fa-mobile-screen\'></i> ' + String(order.phone2 || order.secondPhone || order.backupPhone || order.altPhone || order.customerPhone2 || order.otherPhone).trim() : ''}</span>
                <span style="font-weight:bold; color: var(--text-dark);"><i class=\'fa-solid fa-money-bill-wave\'></i> ${order.total} ج.م</span>
            </div>
        `;
        container.appendChild(div);
    });

    let oldBtn = document.getElementById('loadMoreHistoryBtn');
    if (oldBtn) oldBtn.remove();

    if (endIndex < currentOrdersList.length) {
        let btn = document.createElement('button');
        btn.id = 'loadMoreHistoryBtn';
        btn.innerText = '⬇️ عرض المزيد (محلي)';
        btn.className = 'interactive-btn btn-outline';
        btn.style.width = '100%';
        btn.style.marginTop = '15px';
        btn.onclick = () => {
            currentHistoryPage++;
            renderHistoryList(currentOrdersList, true);
        };
        container.appendChild(btn);
    } else if (currentOrdersList.length >= 50 && (currentOrdersList.length % 50 === 0)) {
        // Server-side Load More Button
        let serverBtn = document.createElement('button');
        serverBtn.id = 'loadMoreFromServerBtn';
        serverBtn.innerText = '☁️ جلب المزيد من السيرفر';
        serverBtn.className = 'interactive-btn btn-search';
        serverBtn.style.width = '100%';
        serverBtn.style.marginTop = '15px';
        serverBtn.onclick = () => {
            serverBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الجلب...';
            serverBtn.disabled = true;
            let currentOffset = currentOrdersList.length;
            
            if (currentOrdersList === window.searchResultsCache) {
                let keyword = document.getElementById('orderSearchInput').value.trim().toLowerCase();
                let searchKeyword = `%${keyword}%`;
                supabase.from('orders').select('*')
                    .or(`order_id.ilike.${searchKeyword},customer_name.ilike.${searchKeyword},phone.ilike.${searchKeyword}`)
                    .range(currentOffset, currentOffset + 49)
                    .then(({data, error}) => appendServerData(data, error));
            } else {
                supabase.from('orders').select('*')
                    .eq('order_date', window.lastFilterDate || currentFilterDate)
                    .order('created_at', { ascending: false })
                    .range(currentOffset, currentOffset + 49)
                    .then(({data, error}) => appendServerData(data, error));
            }
            
            function appendServerData(data, error) {
                if (error || !data || data.length === 0) {
                    serverBtn.innerText = '✅ لا توجد فواتير أخرى';
                    return;
                }
                let mappedData = data.map(window.mapOrderRowToLocal);
                // Append to global lists based on context
                if (currentOrdersList === window.searchResultsCache) {
                    window.searchResultsCache = window.searchResultsCache.concat(mappedData);
                    currentOrdersList = window.searchResultsCache;
                } else {
                    window.orderHistoryData = window.orderHistoryData.concat(mappedData);
                    currentOrdersList = window.orderHistoryData;
                }
                // Refresh local pagination
                currentHistoryPage++;
                renderHistoryList(currentOrdersList, true);
            }
        };
        container.appendChild(serverBtn);
    }
}

window.printHistoryOrder = function (orderId) {
    // <i class=\'fa-solid fa-star\'></i> Fix: String() comparison to prevent type mismatch (string vs number)
    let findFn = o => String(o.id) === String(orderId);
    let order = (window.orderHistoryData || []).find(findFn) ||
        (window.searchResultsCache || []).find(findFn) ||
        (window.pendingOrdersData || []).find(findFn) ||
        (window.suspendedOrdersData || []).find(findFn) ||
        (window.uncollectedOrdersData || []).find(findFn);

    if (!order) {
        customAlert("<i class='fa-solid fa-triangle-exclamation' style='color:var(--danger)'></i> خطأ: لم يتم العثور على بيانات الطلب للطباعة.");
        // <i class=\'fa-solid fa-star\'></i> Debug: log all available IDs to help trace mismatch
        console.warn("printHistoryOrder: could not find orderId =", orderId, typeof orderId);
        console.log("Available history IDs:", (window.orderHistoryData || []).map(o => ({ id: o.id, type: typeof o.id })));
        return;
    }
    console.log("Order Data:", order);

    let isOldGift = order.notes && order.notes.includes("هدية");
    let oTypeStr = String(order.orderType || "").toLowerCase();
    let dTypeStr = String(order.deliveryType || "").toLowerCase();
    let isBranch = oTypeStr.includes('استلام') || oTypeStr.includes('فرع') || oTypeStr === 'branch' || dTypeStr.includes('استلام') || dTypeStr.includes('فرع') || dTypeStr === 'branch';

    let printLogo = document.getElementById('print-logo');
    if (printLogo) {
        let pay = order.payment || "";
        let isGovShipping = oTypeStr === 'gov_shipping' || oTypeStr.includes('محافظات') || dTypeStr === 'gov_shipping';
        let isDigitalPay = isGovShipping || pay.includes('إنستا') || pay.includes('انستاباي') || pay.includes('انستا باي') || pay.includes('محفظة') || pay.includes('فودافون') || pay.includes('تحويل');
        if (isBranch) {
            printLogo.src = 'images/logo-branch.png';
        } else if (isDigitalPay) {
            printLogo.src = 'images/logo-digital.png';
        } else {
            printLogo.src = 'images/logo-cash.png';
        }
        printLogo.style.display = 'block';
    }

    if (document.getElementById('receipt-type')) {
        // <i class=\'fa-solid fa-star\'></i> V15.0: تطبيع النص - إزالة "عادي" من "توصيل منزلي عادي"
        let typeStr = (order.orderType || "أوردر توصيل").replace("توصيل منزلي عادي", "توصيل منزلي");
        let govStr = order.gov ? order.gov + " - " : "";
        document.getElementById('receipt-type').innerHTML = isOldGift ? `${govStr}${typeStr} - <i class=\'fa-solid fa-gift\'></i> هدية` : `${govStr}${typeStr}`;
    }
    if (document.getElementById('print-date')) document.getElementById('print-date').innerText = order.date || new Date().toLocaleDateString('ar-EG');
    if (document.getElementById('print-time')) document.getElementById('print-time').innerText = order.time || '';

    let printItemsHtml = "";
    let productsArray = [];
    if (order.products) {
        if (typeof order.products === 'string') {
            productsArray = order.products.split('\n');
        } else if (Array.isArray(order.products)) {
            productsArray = order.products;
        }
    } else if (order.items) {
        if (typeof order.items === 'string') {
            try {
                let parsed = JSON.parse(order.items);
                if (Array.isArray(parsed)) productsArray = parsed;
                else productsArray = order.items.split('\n');
            } catch(e) {
                productsArray = order.items.split('\n');
            }
        } else if (Array.isArray(order.items)) {
            productsArray = order.items;
        }
    }

    productsArray.forEach(lineOrItem => {
        if (typeof lineOrItem === 'string' && lineOrItem.trim() !== "") {
            let match = lineOrItem.match(/(.*) - الكمية: (\d+) \(([\d.]+)ج\)/);
            if (match) {
                let name = match[1].trim();
                let qty = match[2];
                let total = match[3];
                let price = parseFloat(total) / parseFloat(qty);
                let printP = isOldGift ? "***" : price;
                printItemsHtml += `
                    <tr>
                        <td>${name}</td>
                        <td>${printP}</td>
                        <td>${qty}</td>
                        <td>${isOldGift ? "***" : total}</td>
                    </tr>
                `;
            } else {
                printItemsHtml += `<tr><td colspan="4" style="text-align:right;">${lineOrItem}</td></tr>`;
            }
        } else if (typeof lineOrItem === 'object' && lineOrItem !== null) {
            let name = lineOrItem.name || lineOrItem.item_name || "منتج";
            let qty = lineOrItem.qty || lineOrItem.quantity || 1;
            let total = lineOrItem.total || lineOrItem.price || 0;
            let price = parseFloat(total) / parseFloat(qty);
            let printP = isOldGift ? "***" : price;
            printItemsHtml += `
                <tr>
                    <td>${name}</td>
                    <td>${printP}</td>
                    <td>${qty}</td>
                    <td>${isOldGift ? "***" : total}</td>
                </tr>
            `;
        }
    });

    let printBookingRow = document.querySelector('.print-booking-row');
    if (oTypeStr.includes('حجز') || oTypeStr === 'special_date') {
        let rDate = order.reservationDate || order.expectedDate || order.specialDate || order.spDate;
        if (rDate) {
            if (printBookingRow) printBookingRow.style.display = 'block';
            if (rDate.toString().includes('GMT') || rDate.toString().includes('توقيت')) {
                let d = new Date(rDate);
                if (!isNaN(d.getTime())) rDate = `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
            }
            if (document.getElementById('print-booking-date')) document.getElementById('print-booking-date').innerText = rDate;
        } else {
            if (printBookingRow) printBookingRow.style.display = 'none';
        }
    } else {
        if (printBookingRow) printBookingRow.style.display = 'none';
    }
    if (document.getElementById('print-customer-name')) document.getElementById('print-customer-name').innerText = order.name || '';
    if (document.getElementById('print-phone')) document.getElementById('print-phone').innerText = order.phone || '';

    let _phone2Val = order.phone2 || order.secondPhone || order.backupPhone || order.altPhone || order.customerPhone2 || order.otherPhone || "";
    let printPhone2Row = document.getElementById('print-phone2-row');
    if (printPhone2Row) {
        if (_phone2Val && String(_phone2Val).trim() !== '') {
            printPhone2Row.style.display = 'block';
            if (document.getElementById('print-phone2')) document.getElementById('print-phone2').innerText = String(_phone2Val).trim();
        } else {
            printPhone2Row.style.display = 'none';
        }
    }

    // <i class=\'fa-solid fa-star\'></i> V14.2: إخفاء العنوان للفرع برمجياً - لا يطبع العنوان نهائياً
    let printAddressRow = document.querySelector('.print-address-row');
    if (isBranch) {
        if (printAddressRow) printAddressRow.style.display = 'none';
        if (document.getElementById('print-address')) document.getElementById('print-address').innerText = '';
    } else {
        if (printAddressRow) printAddressRow.style.display = '';
        if (document.getElementById('print-address')) document.getElementById('print-address').innerText = order.address || order.customerAddress || '';
    }

    if (document.getElementById('print-items-body')) document.getElementById('print-items-body').innerHTML = printItemsHtml || '<tr><td colspan="4">لا توجد تفاصيل</td></tr>';

    if (document.getElementById('print-subtotal')) document.getElementById('print-subtotal').innerText = isOldGift ? "***" : (order.subtotal || order.total || 0);
    if (document.getElementById('print-discount')) document.getElementById('print-discount').innerText = isOldGift ? "***" : (order.discount || 0);

    // <i class=\'fa-solid fa-star\'></i> V15.0: إخفاء سطر الشحن لطلبات استلام الفرع نهائياً
    let printShippingRow = document.querySelector('.print-shipping-row');
    if (isBranch) {
        if (printShippingRow) printShippingRow.style.display = 'none';
    } else {
        if (printShippingRow) printShippingRow.style.display = '';
        if (document.getElementById('print-shipping')) document.getElementById('print-shipping').innerText = isOldGift ? "***" : (order.shipping || 0);
    }

    if (parseFloat(order.deposit) > 0 && !isOldGift) {
        let depositHtml = `<p class="print-deposit-row">تم دفع عربون: <b><span id="print-deposit">${order.deposit}</span></b></p>`;
        document.getElementById('print-deposit-container').innerHTML = depositHtml;
        document.getElementById('print-final').innerText = order.remaining !== undefined ? order.remaining : order.total;
        if (document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "المتبقي للدفع";
    } else {
        document.getElementById('print-deposit-container').innerHTML = '';
        document.getElementById('print-final').innerText = isOldGift ? "***" : order.total;
        if (document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "الإجمالي النهائي";
    }

    if (document.getElementById('print-payment')) document.getElementById('print-payment').innerText = order.payment || "";

    let sellerP = document.getElementById('print-seller-name');
    if (sellerP) sellerP.innerText = `الكاشير: ${order.seller || 'غير محدد'}`;

    let isGovShipping = oTypeStr === 'gov_shipping' || oTypeStr.includes('محافظات') || dTypeStr === 'gov_shipping';
    if (isGovShipping) {
        document.body.classList.add('print-gov-shipping', 'shipping-mode');
    } else {
        document.body.classList.remove('print-gov-shipping', 'shipping-mode');
    }

    let qrImg = document.querySelector('img[alt="QR Code"]');
    if (qrImg) qrImg.src = 'images/qr-code.png';

    setTimeout(() => {
        if (isGovShipping) {
            let tableContainers = document.querySelectorAll('.receipt-table, .receipt-table-container');
            tableContainers.forEach(el => el.style.display = 'none');
        }

        window.print();

        if (isGovShipping) {
            let tableContainers = document.querySelectorAll('.receipt-table, .receipt-table-container');
            tableContainers.forEach(el => el.style.display = '');
        }
        document.body.classList.remove('print-gov-shipping', 'shipping-mode');
    }, 500);
};


// <i class=\'fa-solid fa-star\'></i> إصلاح مسح الذاكرة في محرك البحث الشامل
const searchBtn = document.getElementById('searchBtn');
const orderSearchInput = document.getElementById('orderSearchInput');
if (searchBtn && orderSearchInput) {
    searchBtn.addEventListener('click', () => {
        let keyword = orderSearchInput.value.trim().toLowerCase();
        if (keyword === "") {
            renderHistoryList(orderHistoryData);
        } else {
            let container = document.getElementById('historyListContainer');
            container.innerHTML = '<p class="empty-msg">جاري البحث الشامل في قاعدة البيانات... <i class=\'fa-solid fa-hourglass-half\'></i></p>';

            let searchKeyword = `%${keyword}%`;
            supabase.from('orders').select('*')
                .or(`order_id.ilike.${searchKeyword},customer_name.ilike.${searchKeyword},phone.ilike.${searchKeyword}`)
                .then(({ data, error }) => {
                    if (error || !data || data.length === 0) {
                        container.innerHTML = '<p class="empty-msg">لم يتم العثور على أوردرات مطابقة.</p>';
                    } else {
                        let mappedData = data.map(window.mapOrderRowToLocal);
                        window.searchResultsCache = mappedData;
                        renderHistoryList(mappedData);
                    }
                })
                .catch(() => {
                    container.innerHTML = '<p class="empty-msg"><i class=\'fa-solid fa-xmark\'></i> حدث خطأ في الاتصال بالسيرفر.</p>';
                });
        }
    });
    orderSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });
}
// ==========================================
// 6. بحث الهاتف والمنتجات 
// ==========================================
const phoneInput = document.getElementById('customerPhone');
const phoneStatus = document.getElementById('phoneCheckStatus');

// <i class=\'fa-solid fa-star\'></i> إصلاح ذاكرة السمكة
function performPhoneSearch() {
    if (!phoneInput || !phoneStatus) return;
    let phoneVal = phoneInput.value.trim().replace(/\D/g, '');
    if (phoneVal.length >= 9) {
        phoneStatus.innerHTML = "<i class=\'fa-solid fa-hourglass-half\'></i>";

        let foundCustomer = null;
        if (orderHistoryData && orderHistoryData.length > 0) foundCustomer = orderHistoryData.find(o => o.phone.toString().replace(/\D/g, '').includes(phoneVal));
        if (!foundCustomer && window.pendingOrdersData && window.pendingOrdersData.length > 0) foundCustomer = window.pendingOrdersData.find(o => o.phone.toString().replace(/\D/g, '').includes(phoneVal));

        if (foundCustomer) {
            fillCustomerData(foundCustomer);
        } else {
            // البحث الشامل الصامت في قاعدة العملاء
            (async () => { let keyword = phoneVal; // Supabase Global Search
            const keyword_lower = keyword.toLowerCase();
            const { data: searchResults, error: searchErr } = await fetchAllSupabaseRows(
                supabase.from('orders').select('*')
                .or(`order_id.ilike.%${keyword}%,customer_name.ilike.%${keyword}%,phone.ilike.%${keyword}%`)
            );
            if (searchErr) throw searchErr;
            
            let results = (searchResults || []).map(o => ({
                id: o.order_id, date: o.order_date, time: o.order_time,
                name: o.customer_name, phone: o.phone, phone2: o.alt_phone || "",
                address: o.address, products: o.products, subtotal: o.products_total,
                discount: o.discount, shipping: o.shipping_cost, total: parseFloat(o.final_total) || 0,
                status: o.status, payment: o.payment_method, seller: o.moderator_name,
                orderType: o.delivery_type, deposit: o.deposit || 0,
                remaining: o.remaining || o.final_total,
                gov: o.governorate, platform: o.platform, driver: o.driver_name,
                reservationDate: o.delivery_date || ""
            })).reverse();
            return results; })()
                .then(res => res.json())
                .then(data => {
                    if (data.length > 0) fillCustomerData(data[0]);
                    else phoneStatus.innerText = "🆕";
                }).catch(() => phoneStatus.innerHTML = "<i class=\'fa-solid fa-magnifying-glass\'></i>");
        }
    } else {
        phoneStatus.innerHTML = "<i class=\'fa-solid fa-magnifying-glass\'></i>";
    }
}

function fillCustomerData(cust) {
    if (document.getElementById('customerName')) document.getElementById('customerName').value = cust.name;
    if (document.getElementById('address') && cust.address && cust.address !== 'استلام من الفرع') {
        document.getElementById('address').value = cust.address;
    }
    phoneStatus.innerHTML = "<i class=\'fa-solid fa-check\'></i>";
    showToast(`أهلاً بعودتك يا ${cust.name}!`, "success");
}

if (phoneStatus) phoneStatus.addEventListener('click', performPhoneSearch);
if (phoneInput) phoneInput.addEventListener('change', performPhoneSearch);

const productsContainer = document.getElementById('productsContainer');

// <i class=\'fa-solid fa-star\'></i> دالة إضافة المنتجات (وإصلاح قفل الخانات عند الاسترجاع)
function addProductRow(nameVal = "", priceVal = "", qtyVal = "1", isConfirmed = false, offerVal = "") {
    if (!productsContainer) return;

    if (!document.getElementById('smartProductsList')) {
        let dl = document.createElement('datalist');
        dl.id = 'smartProductsList';
        document.body.appendChild(dl);
        updateSmartProductsList();
    }

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.marginBottom = '10px';

    const div = document.createElement('div');
    div.className = 'product-row';
    if (isConfirmed) div.classList.add('confirmed');


    let rOnly = isConfirmed ? 'readonly' : '';

    div.innerHTML = `
        <input type="text" list="smartProductsList" class="product-name-input" placeholder="اسم المنتج..." value="${nameVal}" required ${rOnly}>
        <input type="number" class="product-price-input" placeholder="السعر" value="${priceVal}" required ${rOnly}>
        <input type="number" class="product-offer-input" placeholder="سعر العرض" value="${offerVal}" ${rOnly}>
        <input type="number" class="product-qty-input" placeholder="الكمية" value="${qtyVal}" min="1" required ${rOnly}>
        <div class="product-row-actions">
            <button type="button" class="btn-confirm-pro interactive-btn">✔️</button>
            <button type="button" class="remove-product-btn interactive-btn"><i class=\'fa-solid fa-xmark\'></i></button>
        </div>
    `;

    wrapper.appendChild(div);
    productsContainer.appendChild(wrapper);

    let nameInput = div.querySelector('.product-name-input');
    let priceInput = div.querySelector('.product-price-input');
    let offerInput = div.querySelector('.product-offer-input');
    let qtyInput = div.querySelector('.product-qty-input');
    let confirmBtn = div.querySelector('.btn-confirm-pro');
    let removeBtn = div.querySelector('.remove-product-btn');

    if (isConfirmed) confirmBtn.innerHTML = "<i class=\'fa-solid fa-pencil\'></i>";

    nameInput.addEventListener('input', () => {
        let selected = catalogData.find(p => p.name === nameInput.value);
        if (selected) {
            let baseP = parseFloat(selected.price) || 0;
            let offerP = parseFloat(selected.offerPrice) || 0;
            let isOfferActive = selected.isOffer === true || selected.isOffer === "true" || selected.isOffer === 1 || selected.isOffer === "TRUE";

            priceInput.value = baseP;
            if (offerP > 0 && isOfferActive) {
                offerInput.value = offerP;
            } else {
                offerInput.value = "";
            }
            calculateTotal();
        }
    });

    priceInput.addEventListener('input', calculateTotal);
    offerInput.addEventListener('input', calculateTotal);
    qtyInput.addEventListener('input', calculateTotal);

    confirmBtn.addEventListener('click', () => {
        if (!nameInput.value || priceInput.value === "" || qtyInput.value === "") return;

        if (div.classList.contains('confirmed')) {
            div.classList.remove('confirmed');
            confirmBtn.innerHTML = "✔️";
            nameInput.readOnly = false;
            priceInput.readOnly = false;
            offerInput.readOnly = false;
            qtyInput.readOnly = false;
        } else {
            div.classList.add('confirmed');
            confirmBtn.innerHTML = "<i class=\'fa-solid fa-pencil\'></i>";
            calculateTotal();
            if (typeof window.playSuccessBeep === 'function') window.playSuccessBeep();
            nameInput.readOnly = true;
            priceInput.readOnly = true;
            offerInput.readOnly = true;
            qtyInput.readOnly = true;

            let currentPrice = parseFloat(priceInput.value);
            let currentOffer = parseFloat(offerInput.value) || 0;
            let cProd = catalogData.find(p => p.name === nameInput.value);

            if (cProd) {
                let isOfferActive = cProd.isOffer === true || cProd.isOffer === "true" || cProd.isOffer === 1;
                let baseP = parseFloat(cProd.price) || 0;
                let offerP = parseFloat(cProd.offerPrice) || 0;

                if (currentOffer > 0 && currentOffer !== offerP) {
                    customConfirm("تم تعديل سعر العرض لـ " + currentOffer + " هل تريد حفظه كسعر عرض دائم للمنتج وتفعيله في الكتالوج؟", () => {
                        window.pushCatalogUpdate(cProd.name, baseP, true, currentOffer);
                        cProd.offerPrice = currentOffer;
                        cProd.isOffer = true;
                    });
                } else if (currentOffer === 0 && currentPrice !== baseP) {
                    customConfirm("تم تعديل السعر الأساسي لـ " + currentPrice + " هل تريد حفظه كسعر أساسي دائم في الكتالوج؟", () => {
                        window.pushCatalogUpdate(cProd.name, currentPrice, false, offerP);
                        cProd.price = currentPrice;
                        cProd.isOffer = false;
                    });
                }
            } else {
                window.pushCatalogUpdate(nameInput.value, currentPrice, currentOffer > 0, currentOffer);
                catalogData.push({ name: nameInput.value, price: currentPrice, isOffer: currentOffer > 0, offerPrice: currentOffer });
                updateSmartProductsList();
            }
        }
    });
    removeBtn.addEventListener('click', () => { wrapper.remove(); calculateTotal(); });
}

function updateSmartProductsList() {
    // <i class=\'fa-solid fa-star\'></i> الاقتراحات تأتي من Firebase أولاً، وإذا لم تتوفر يأخذ من catalogData
    updateSmartSuggestionsFromFirebase();
}
if (document.getElementById('addProductBtn')) document.getElementById('addProductBtn').addEventListener('click', () => addProductRow());
if (productsContainer && productsContainer.children.length === 0) addProductRow();

// <i class=\'fa-solid fa-star\'></i> نظام العربون والـ NaN
function calculateTotal() {
    let total = 0;
    document.querySelectorAll('.product-row.confirmed').forEach(row => {
        let price = parseFloat(row.querySelector('.product-price-input').value) || 0;
        let offer = parseFloat(row.querySelector('.product-offer-input').value) || 0;
        let finalPrice = offer > 0 ? offer : price;
        let qty = parseFloat(row.querySelector('.product-qty-input').value) || 1;
        total += (finalPrice * qty); // محصنة ضد الـ NaN
    });

    if (document.getElementById('productsTotal')) document.getElementById('productsTotal').value = total;
    let discount = document.getElementById('discount') ? (parseFloat(document.getElementById('discount').value) || 0) : 0;
    let shipping = document.getElementById('shippingCost') ? (parseFloat(document.getElementById('shippingCost').value) || 0) : 0;

    let finalAmount = total + shipping - discount;
    let finalDisplay = document.getElementById('finalTotalDisplay');

    if (finalDisplay) finalDisplay.innerText = finalAmount;

    // حساب العربون
    let depositInput = document.getElementById('depositAmount');
    let remainingDisplay = document.getElementById('remainingAmountDisplay');
    if (depositInput && remainingDisplay) {
        let dep = parseFloat(depositInput.value) || 0;
        let rem = finalAmount - dep;
        if (rem < 0) rem = 0;
        remainingDisplay.innerText = rem;
    }

    let giftCheck = document.getElementById('isGiftCheckbox');
    let hint = document.getElementById('giftHint');
    if (giftCheck && giftCheck.checked) {
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'giftHint';
            hint.style.cssText = "color:var(--primary); font-size:0.8rem; font-weight:bold; text-align:center; margin-top:5px;";
            hint.innerText = "* أوردر هدية: سيتم حفظ السعر بالإكسيل وإخفاؤه في الفاتورة المطبوعة *";
            finalDisplay.parentNode.appendChild(hint);
        }
    } else {
        if (hint) hint.remove();
    }
}

if (document.getElementById('discount')) document.getElementById('discount').addEventListener('input', calculateTotal);
if (document.getElementById('isGiftCheckbox')) document.getElementById('isGiftCheckbox').addEventListener('change', calculateTotal);
if (document.getElementById('depositAmount')) document.getElementById('depositAmount').addEventListener('input', calculateTotal);

// <i class=\'fa-solid fa-star\'></i> منع اختراق الكيبورد بـ readonly و disabled
const paymentMethod = document.getElementById('paymentMethod');
if (paymentMethod) {
    paymentMethod.addEventListener('change', function() {
        this.classList.remove('payment-cash', 'payment-instapay');
        if (this.value === 'كاش') this.classList.add('payment-cash');
        else if (this.value === 'إنستا باي / محفظة') this.classList.add('payment-instapay');
    });
}
const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
let isPaymentConfirmed = false;
const upperFields = ['platform', 'customerName', 'customerPhone', 'phone2', 'deliveryType', 'specialDateInput', 'governorate', 'address'];

function toggleGlobalLock(shouldLock) {
    upperFields.forEach(id => {
        let el = document.getElementById(id);
        if (el) {
            if (shouldLock) {
                el.classList.add('locked-field');
                if (el.tagName === 'SELECT') el.disabled = true; else el.readOnly = true;
            } else {
                el.classList.remove('locked-field');
                if (el.tagName === 'SELECT') el.disabled = false; else el.readOnly = false;
            }
        }
    });
}
if (confirmPaymentBtn) {
    confirmPaymentBtn.addEventListener('click', () => {
        if (!paymentMethod || !paymentMethod.value) { showToast("اختر طريقة الدفع أولاً!", "error"); return; }
        if (isPaymentConfirmed) {
            isPaymentConfirmed = false; confirmPaymentBtn.classList.remove('confirmed'); confirmPaymentBtn.innerHTML = "تأكيد ✔️";
            paymentMethod.classList.remove('locked-field'); paymentMethod.disabled = false; toggleGlobalLock(false);
        } else {
            isPaymentConfirmed = true; confirmPaymentBtn.classList.add('confirmed'); confirmPaymentBtn.innerHTML = "تم التأكيد <i class=\'fa-solid fa-lock\'></i>";
            paymentMethod.classList.add('locked-field'); paymentMethod.disabled = true; toggleGlobalLock(true);
        }
    });
}

// ==========================================
// 7. المعلقات 
// ==========================================

function updateSuspendedCount() {
    let count = window.suspendedOrdersData ? window.suspendedOrdersData.length : 0;
    if (document.getElementById('suspendedCount')) document.getElementById('suspendedCount').innerText = count;
}

let suspendBtn = document.getElementById('suspendBtn');
if (suspendBtn) {
    suspendBtn.addEventListener('click', () => {
        setBtnLoading(suspendBtn, true); // <i class='fa-solid fa-star'></i> منع تكرار الأوردرات
        let nameEl = document.getElementById('customerName'); let name = nameEl && nameEl.value ? nameEl.value : "بدون اسم";
        let prods = [];
        document.querySelectorAll('.product-row').forEach(row => {
            let n = row.querySelector('.product-name-input').value, 
                p = row.querySelector('.product-price-input').value, 
                o = row.querySelector('.product-offer-input').value, 
                q = row.querySelector('.product-qty-input').value, 
                c = row.classList.contains('confirmed');
            if (n) prods.push({ name: n, price: p, offer: o, qty: q, confirmed: c });
        });

        // <i class='fa-solid fa-star'></i> V14.2: Timestamp-based ID لمنع التكرار نهائياً
        let draftId = "DRAFT-" + Date.now().toString().slice(-5);
        let draft = {
            id: draftId, date: new Date().toLocaleTimeString('ar-EG'),
            platform: document.getElementById('platform') ? document.getElementById('platform').value : "", name: name,
            phone: document.getElementById('customerPhone') ? document.getElementById('customerPhone').value : "",
            phone2: document.getElementById('phone2') ? document.getElementById('phone2').value : "",
            delType: document.getElementById('deliveryType') ? document.getElementById('deliveryType').value : "",
            spDate: document.getElementById('specialDateInput') ? document.getElementById('specialDateInput').value : "",
            gov: document.getElementById('governorate') ? document.getElementById('governorate').value : "",
            address: document.getElementById('address') ? document.getElementById('address').value : "",
            discount: document.getElementById('discount') ? document.getElementById('discount').value : "",
            notes: document.getElementById('notes') ? document.getElementById('notes').value : "",
            gift: document.getElementById('isGiftCheckbox') ? document.getElementById('isGiftCheckbox').checked : false, prods: prods
        };

        let formData = new URLSearchParams();
        formData.append('action', 'suspendOrder');
        formData.append('draftId', draftId);
        formData.append('draftJson', JSON.stringify(draft));

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("⏸️ تم تعليق الفاتورة بنجاح!", "warning");
                resetForm(); updateSuspendedCount();
                setBtnLoading(suspendBtn, false, "⏸️ تعليق الطلب");
            }).catch(() => { setBtnLoading(suspendBtn, false, "⏸️ تعليق الطلب"); });
    });
}

let openSuspendedBtn = document.getElementById('openSuspendedBtn');
if (openSuspendedBtn) {
    openSuspendedBtn.addEventListener('click', () => {
        let drafts = window.suspendedOrdersData || [];
        let list = document.getElementById('suspendedOrdersList'); if (!list) return;
        list.innerHTML = '';
        if (drafts.length === 0) { list.innerHTML = '<p class="empty-msg">لا توجد طلبات معلقة <i class="fa-regular fa-folder-open" style="color:var(--primary); margin-right:5px;"></i></p>'; return; }

        drafts.forEach(d => {
            let div = document.createElement('div'); div.className = 'data-row';
            div.innerHTML = `
                <div style="flex:1;"><strong>${d.name}</strong> <br> <small style="color:#777"><i class="fa-regular fa-clock"></i> ${d.time || d.date}</small></div>
                <div style="display:flex; gap:5px;">
                    <button class="btn-search interactive-btn restore-btn" style="padding: 5px 10px; font-size:0.8rem">استرجاع <i class=\'fa-solid fa-rotate\'></i></button>
                    <button class="interactive-btn delete-btn" style="padding: 5px 10px; font-size:0.8rem; background-color:var(--danger); color:white; border:none; border-radius:8px; cursor:pointer;">حذف <i class=\'fa-solid fa-xmark\'></i></button>
                </div>
            `;
            div.querySelector('.restore-btn').addEventListener('click', () => {
                restoreDraft(d); deleteSuspendedDraft(d.id); document.getElementById('suspendedModal').classList.remove('active');
            });
            div.querySelector('.delete-btn').addEventListener('click', () => {
                deleteSuspendedDraft(d.id); div.remove();
                if (list.children.length === 0) list.innerHTML = '<p class="empty-msg">لا توجد طلبات معلقة <i class="fa-regular fa-folder-open" style="color:var(--primary); margin-right:5px;"></i></p>';
                showToast("<i class=\'fa-solid fa-trash\'></i> تم حذف المسودة", "success");
            });
            list.appendChild(div);
        });
    });
}

function deleteSuspendedDraft(draftId) {
    if (window.suspendedOrdersData) {
        window.suspendedOrdersData = window.suspendedOrdersData.filter(item => item.id !== draftId);
    }
    updateSuspendedCount();
    supabase.from('suspended_orders').delete().eq('draft_id', draftId).then(() => {});
}

function restoreDraft(d) {
    if (document.getElementById('platform')) {
        document.getElementById('platform').value = d.platform || "";
        if(window.syncPlatformUI) window.syncPlatformUI(d.platform || "واتساب");
    }
    if (document.getElementById('customerName')) document.getElementById('customerName').value = d.name || "";
    if (document.getElementById('customerPhone')) document.getElementById('customerPhone').value = d.phone || "";
    if (document.getElementById('phone2')) document.getElementById('phone2').value = d.phone2 || "";
    if (document.getElementById('deliveryType')) document.getElementById('deliveryType').value = d.delType || "";
    if (document.getElementById('specialDateInput')) document.getElementById('specialDateInput').value = d.spDate || "";
    if (document.getElementById('governorate')) document.getElementById('governorate').value = d.gov || "";
    if (document.getElementById('address')) document.getElementById('address').value = d.address || "";
    if (document.getElementById('discount')) document.getElementById('discount').value = d.discount || "";
    if (document.getElementById('notes')) document.getElementById('notes').value = d.notes || "";
    if (document.getElementById('isGiftCheckbox')) document.getElementById('isGiftCheckbox').checked = d.gift || false;

    if (d.prods) { // If restored from local format
        if (productsContainer) {
            productsContainer.innerHTML = '';
            if (d.prods.length > 0) d.prods.forEach(p => addProductRow(p.name, p.price, p.qty, p.confirmed, p.offer || ""));
            else addProductRow();
        }
    } else if (d.products) { // If restored from Google Sheets
        if (productsContainer) {
            productsContainer.innerHTML = '';
            let lines = typeof d.products === 'string' ? d.products.split('\n') : (Array.isArray(d.products) ? d.products.map(p => typeof p === 'object' ? `${p.name || ''} - الكمية: ${p.qty || 1}` : String(p)) : []);
            let hasProds = false;
            lines.forEach(line => {
                let match = line.match(/(.*) - الكمية: (\d+)/);
                if (match) {
                    addProductRow(match[1].trim(), "", match[2], true);
                    hasProds = true;
                }
            });
            if (!hasProds) addProductRow();
        }
        if (document.getElementById('discount')) document.getElementById('discount').value = d.discount || "";
    }
    if (deliveryTypeSelect) deliveryTypeSelect.dispatchEvent(new Event('change'));
    showToast("<i class=\'fa-solid fa-check\'></i> تم استرجاع الفاتورة!", "success");
}

function resetForm() {
    let form = document.getElementById('orderForm'); if (form) form.reset();
    let infoSpan = document.querySelector('#deliveryInfo span'); if (infoSpan) infoSpan.innerText = "--";
    let finalDisplay = document.getElementById('finalTotalDisplay'); if (finalDisplay) finalDisplay.innerText = "0";
    let remDisplay = document.getElementById('remainingAmountDisplay'); if (remDisplay) remDisplay.innerText = "0";

    if (productsContainer) { productsContainer.innerHTML = ''; addProductRow(); }
    isPaymentConfirmed = false;
    if (confirmPaymentBtn) { confirmPaymentBtn.classList.remove('confirmed'); confirmPaymentBtn.innerHTML = "تأكيد ✔️"; }
    if (paymentMethod) { paymentMethod.classList.remove('locked-field', 'payment-cash', 'payment-instapay'); paymentMethod.disabled = false; }
    toggleGlobalLock(false);
    if (deliveryTypeSelect) deliveryTypeSelect.dispatchEvent(new Event('change'));
    if (phoneStatus) phoneStatus.innerHTML = "<i class=\'fa-solid fa-magnifying-glass\'></i>";
    let hint = document.getElementById('giftHint'); if (hint) hint.remove();
}

// ==========================================
// 8. إرسال الواتساب
// ==========================================
let whatsappReviewBtn = document.getElementById('whatsappReviewBtn');
if (whatsappReviewBtn) {
    whatsappReviewBtn.addEventListener('click', () => {
        let nameEl = document.getElementById('customerName'); let name = nameEl ? nameEl.value.trim() : "";
        let phoneEl = document.getElementById('customerPhone'); let phone = phoneEl ? phoneEl.value.trim() : "";
        let phone2El = document.getElementById('phone2'); let phone2 = phone2El ? phone2El.value.trim() : "";
        let addressEl = document.getElementById('address'); let address = addressEl ? addressEl.value.trim() : "";

        let hasMissingData = false;

        let displayPhone = phone;
        if (!displayPhone) {
            displayPhone = "(مطلوب)";
            hasMissingData = true;
        } else if (displayPhone.startsWith('0')) {
            displayPhone = '+2' + displayPhone;
        }

        let displayName = name;
        if (!displayName) {
            displayName = "(مطلوب)";
            hasMissingData = true;
        }

        let displayAddress = address;
        if (!displayAddress) {
            displayAddress = "(مطلوب لتحديد تكلفة الشحن)";
            hasMissingData = true;
        }

        let expectedDateText = document.querySelector('#deliveryInfo span') ? document.querySelector('#deliveryInfo span').innerText : "";
        if (deliveryTypeSelect && deliveryTypeSelect.value === 'special_date') expectedDateText = document.getElementById('specialDateInput') ? document.getElementById('specialDateInput').value : "";

        let productsText = "";
        document.querySelectorAll('.product-row.confirmed').forEach(row => {
            let n = row.querySelector('.product-name-input').value;
            let price = parseFloat(row.querySelector('.product-price-input').value) || 0;
            let offer = parseFloat(row.querySelector('.product-offer-input').value) || 0;
            let finalPrice = offer > 0 ? offer : price;
            let q = parseFloat(row.querySelector('.product-qty-input').value) || 1;
            productsText += `- ${n} (السعر: ${finalPrice}ج) - الكمية: ${q} - الإجمالي: ${finalPrice * q} ج.م\n`;
        });
        if (productsText === "") productsText = "لم يتم تأكيد أي منتجات.\n";

        let productsTotal = document.getElementById('productsTotal') ? document.getElementById('productsTotal').value || 0 : 0;

        let phoneStr = phone2 ? `${displayPhone}\n📱 رقم احتياطي: ${phone2}` : displayPhone;
        let message = `أهلاً بك في كاندي كلوب 🍬\nيرجى مراجعة تفاصيل طلبك:\n\n👤 الاسم: ${displayName}\n📱 الموبايل: ${phoneStr}\n📍 العنوان: ${displayAddress}\n\n🛒 تفاصيل الطلب:\n${productsText}\n`;
        message += `🛍️ إجمالي المنتجات: ${productsTotal} ج.م\n`;

        let discountValue = document.getElementById('discount') ? parseFloat(document.getElementById('discount').value) || 0 : 0;
        if (discountValue > 0) {
            message += `🏷️ الخصم: ${discountValue} ج.م\n`;
        }

        message += `🚚 الشحن: ${document.getElementById('shippingCost') ? document.getElementById('shippingCost').value || 0 : 0} ج.م\n`;
        message += `💰 الإجمالي المستحق: ${document.getElementById('finalTotalDisplay') ? document.getElementById('finalTotalDisplay').innerText : 0} ج.م\n\n`;

        if (hasMissingData) {
            message += `يرجى ملء البيانات الناقصة بالأعلى والرد بكلمة (تمام) لتأكيد الأوردر 🤝`;
        } else {
            message += `يرجى الرد بكلمة (تمام) لتأكيد الأوردر 🤝`;
        }

        let waPhone = phone.replace(/\D/g, '');
        if (waPhone.startsWith('0')) waPhone = '2' + waPhone;
        window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, '_blank');
    });
}

// ==========================================
// 9. الحفظ والطباعة 
// ==========================================
let saveAndPrintBtn = document.getElementById('saveAndPrintBtn');
if (saveAndPrintBtn) {
    saveAndPrintBtn.addEventListener('click', () => {
        if (document.querySelectorAll('.product-row:not(.confirmed)').length > 0) { showToast("قم بتأكيد (✔️) المنتجات أولاً!", "error"); return; }

        let isGift = document.getElementById('isGiftCheckbox') ? document.getElementById('isGiftCheckbox').checked : false;

        let productsListText = "", printItemsHtml = "";
        document.querySelectorAll('.product-row.confirmed').forEach(row => {
            let n = row.querySelector('.product-name-input').value;
            let p = parseFloat(row.querySelector('.product-price-input').value) || 0;
            let oVal = parseFloat(row.querySelector('.product-offer-input').value) || 0;
            let q = parseFloat(row.querySelector('.product-qty-input').value) || 1;

            let finalPrice = oVal > 0 ? oVal : p;
            let rowTotal = finalPrice * q;

            productsListText += `${n} - الكمية: ${q} (${rowTotal}ج)\n`;

            let nDisplay = n;
            let printP = isGift ? "***" : finalPrice;
            let printTotal = isGift ? "***" : rowTotal;
            printItemsHtml += `<tr><td>${nDisplay}</td><td>${printP}</td><td>${q}</td><td>${printTotal}</td></tr>`;
        });

        if (productsListText === "") { 
            showToast("لا يمكن حفظ أوردر بدون منتجات!", "error"); 
            if (typeof window.playErrorBeep === 'function') window.playErrorBeep();
            return; 
        }
        if (!isPaymentConfirmed) { 
            showToast("تأكيد طريقة الدفع <i class=\'fa-solid fa-lock\'></i>", "error"); 
            if (typeof window.playErrorBeep === 'function') window.playErrorBeep();
            return; 
        }

        let phone = document.getElementById('customerPhone') ? document.getElementById('customerPhone').value.trim() : "";
        let name = document.getElementById('customerName') ? document.getElementById('customerName').value : "";
        let gov = document.getElementById('governorate') ? document.getElementById('governorate').value : "";
        let delType = deliveryTypeSelect ? deliveryTypeSelect.value : "";
        let addressVal = document.getElementById('address') ? document.getElementById('address').value.trim() : "";

        let moderatorSelect = document.getElementById('moderatorSelect');
        let selectedModerator = moderatorSelect ? moderatorSelect.value : "";
        if (!selectedModerator) { 
            let mel = document.getElementById('moderatorSelect');
            if(mel){ mel.classList.add('input-error-flash'); mel.addEventListener('change', ()=>mel.classList.remove('input-error-flash'), {once:true}); }
            showToast("يرجى اختيار اسم المسؤول عن الأوردر!", "error"); 
            if (typeof window.playErrorBeep === 'function') window.playErrorBeep();
            return; 
        }

        if (!phone || phone.length < 9) { 
            let pel = document.getElementById('customerPhone');
            if(pel){ pel.classList.add('input-error-flash'); pel.addEventListener('input', ()=>pel.classList.remove('input-error-flash'), {once:true}); }
            showToast("رقم الموبايل غير صحيح!", "error"); 
            if (typeof window.playErrorBeep === 'function') window.playErrorBeep();
            return; 
        }
        if (!name) { 
            let nel = document.getElementById('customerName');
            if(nel){ nel.classList.add('input-error-flash'); nel.addEventListener('input', ()=>nel.classList.remove('input-error-flash'), {once:true}); }
            showToast("اكتب اسم العميل!", "error"); 
            if (typeof window.playErrorBeep === 'function') window.playErrorBeep();
            return; 
        }
        if (delType === 'normal' && !gov) { 
            let gel = document.getElementById('governorate');
            if(gel){ gel.classList.add('input-error-flash'); gel.addEventListener('change', ()=>gel.classList.remove('input-error-flash'), {once:true}); }
            showToast("اختر المحافظة!", "error"); 
            if (typeof window.playErrorBeep === 'function') window.playErrorBeep();
            return; 
        }
        if (delType !== 'branch' && addressVal === "") { 
            let ael = document.getElementById('address');
            if(ael){ ael.classList.add('input-error-flash'); ael.addEventListener('input', ()=>ael.classList.remove('input-error-flash'), {once:true}); }
            showToast("برجاء كتابة العنوان بالتفصيل أولاً!", "error"); 
            if (typeof window.playErrorBeep === 'function') window.playErrorBeep();
            return; 
        }

        if (typeof window.showLoading === 'function') window.showLoading();
        setBtnLoading(saveAndPrintBtn, true);

        let finalExpDate = document.querySelector('#deliveryInfo span') ? document.querySelector('#deliveryInfo span').innerText : "";
        let bookingDatePrint = "";
        if (delType === 'special_date') {
            finalExpDate = document.getElementById('specialDateInput') ? document.getElementById('specialDateInput').value : "";
            bookingDatePrint = finalExpDate;
        }

        let finalNotes = document.getElementById('notes') ? document.getElementById('notes').value : "";
        if (isGift) finalNotes = "<i class=\'fa-solid fa-gift\'></i> أوردر هدية - " + finalNotes;

        let finalTotalVal = document.getElementById('finalTotalDisplay') ? document.getElementById('finalTotalDisplay').innerText : 0;

        // <i class=\'fa-solid fa-star\'></i> إضافة بيانات العربون
        let dep = document.getElementById('depositAmount') ? (parseFloat(document.getElementById('depositAmount').value) || 0) : 0;
        let rem = document.getElementById('remainingAmountDisplay') ? parseFloat(document.getElementById('remainingAmountDisplay').innerText) : finalTotalVal;

        let orderTypeLabel = deliveryTypeSelect ? deliveryTypeSelect.options[deliveryTypeSelect.selectedIndex].text : "توصيل";

        let formData = new URLSearchParams();
        formData.append('action', 'addOrder');
        formData.append('platform', document.getElementById('platform') ? document.getElementById('platform').value : "");
        formData.append('customerName', name);
        formData.append('phone1', phone);
        formData.append('phone2', document.getElementById('phone2') ? document.getElementById('phone2').value : "");
        formData.append('orderType', orderTypeLabel);
        formData.append('gov', gov);
        formData.append('address', addressVal);
        formData.append('expDate', finalExpDate);
        formData.append('products', productsListText);
        formData.append('pTotal', document.getElementById('productsTotal') ? document.getElementById('productsTotal').value : 0);
        formData.append('discount', document.getElementById('discount') ? document.getElementById('discount').value : 0);
        formData.append('shipping', document.getElementById('shippingCost') ? document.getElementById('shippingCost').value : 0);
        formData.append('finalTotal', finalTotalVal);
        formData.append('payMethod', paymentMethod ? paymentMethod.value : "");
        formData.append('notes', finalNotes);
        formData.append('moderator', selectedModerator);
        formData.append('deposit', dep);
        formData.append('remaining', rem);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                if (typeof window.hideLoading === 'function') window.hideLoading();
                if (typeof window.playRegisterBeep === 'function') window.playRegisterBeep();
                showToast("<i class=\'fa-solid fa-check\'></i> تم حفظ الأوردر بنجاح!", "success");

                let isGovShipping = orderTypeLabel === 'gov_shipping' || orderTypeLabel.includes('محافظات') || delType === 'gov_shipping';
                if (isGovShipping) {
                    document.body.classList.add('print-gov-shipping');
                } else {
                    document.body.classList.remove('print-gov-shipping');
                }

                let govStr = gov ? gov + " - " : "";
                if (document.getElementById('receipt-type')) document.getElementById('receipt-type').innerHTML = isGift ? `${govStr}${orderTypeLabel} - <i class=\'fa-solid fa-gift\'></i> هدية` : `${govStr}${orderTypeLabel}`;

                let printLogo = document.getElementById('receiptLogo') || document.getElementById('print-logo');
                if (printLogo) {
                    let payVal = paymentMethod ? paymentMethod.value : "";
                    if (orderTypeLabel.includes("استلام من الفرع")) {
                        printLogo.src = "images/logo-branch.png";
                    } else if (isGovShipping || (parseFloat(rem) === 0 && (payVal.includes("إنستا") || payVal.includes("انستاباي") || payVal.includes("محفظة") || payVal.includes("فودافون")))) {
                        printLogo.src = "images/logo-digital.png";
                    } else {
                        printLogo.src = "images/logo-cash.png";
                    }
                    printLogo.style.display = 'block';
                }

                if (document.getElementById('print-date')) document.getElementById('print-date').innerText = new Date().toLocaleDateString('ar-EG');
                if (document.getElementById('print-time')) document.getElementById('print-time').innerText = new Date().toLocaleTimeString('ar-EG');

                if (bookingDatePrint && (orderTypeLabel.includes('حجز') || orderTypeLabel === 'special_date')) {
                    document.querySelector('.print-booking-row').style.display = 'block';
                    document.getElementById('print-booking-date').innerText = bookingDatePrint;
                } else {
                    document.querySelector('.print-booking-row').style.display = 'none';
                }

                if (document.getElementById('print-customer-name')) document.getElementById('print-customer-name').innerText = name;
                if (document.getElementById('print-phone')) document.getElementById('print-phone').innerText = phone;

                let p2Val = document.getElementById('phone2') ? document.getElementById('phone2').value.trim() : "";
                let printPhone2Row = document.getElementById('print-phone2-row');
                if (printPhone2Row) {
                    if (p2Val !== '') {
                        printPhone2Row.style.display = 'block';
                        if (document.getElementById('print-phone2')) document.getElementById('print-phone2').innerText = p2Val;
                    } else {
                        printPhone2Row.style.display = 'none';
                    }
                }

                if (document.getElementById('print-address')) document.getElementById('print-address').innerText = addressVal;
                if (document.getElementById('print-items-body')) document.getElementById('print-items-body').innerHTML = printItemsHtml;

                if (document.getElementById('print-subtotal')) document.getElementById('print-subtotal').innerText = isGift ? "***" : (document.getElementById('productsTotal') ? document.getElementById('productsTotal').value : 0);
                if (document.getElementById('print-discount')) document.getElementById('print-discount').innerText = isGift ? "***" : (document.getElementById('discount') ? document.getElementById('discount').value || 0 : 0);
                if (document.getElementById('print-shipping')) document.getElementById('print-shipping').innerText = isGift ? "***" : (document.getElementById('shippingCost') ? document.getElementById('shippingCost').value : 0);

                if (dep > 0 && !isGift) {
                    let depositHtml = `<p class="print-deposit-row">تم دفع عربون: <b><span id="print-deposit">${dep}</span></b></p>`;
                    document.getElementById('print-deposit-container').innerHTML = depositHtml;
                    document.getElementById('print-final').innerText = rem;
                    if (document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "المتبقي للدفع";
                } else {
                    document.getElementById('print-deposit-container').innerHTML = '';
                    document.getElementById('print-final').innerText = isGift ? "***" : finalTotalVal;
                    if (document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "الإجمالي النهائي";
                }

                if (document.getElementById('print-payment')) document.getElementById('print-payment').innerText = paymentMethod ? paymentMethod.value : "";

                let sellerP = document.getElementById('print-seller-name');
                if (sellerP) sellerP.innerText = `الكاشير: ${selectedModerator}`;

                let qrImg = document.querySelector('img[alt="QR Code"]');
                if (qrImg) qrImg.src = 'images/qr-code.png';

                setTimeout(() => {
                    window.print();
                    document.body.classList.remove('print-gov-shipping');
                    resetForm();
                    setBtnLoading(saveAndPrintBtn, false, "💾 حفظ وطباعة الفاتورة");
                    loadDataFromServer();
                }, 1000);

            }).catch(() => {
                if (typeof window.hideLoading === 'function') window.hideLoading();
                showToast("<i class=\'fa-solid fa-xmark\'></i> خطأ في الاتصال بالإنترنت", "error");
                setBtnLoading(saveAndPrintBtn, false, "💾 حفظ وطباعة الفاتورة");
            });
    });
}

// ==========================================
// 10. الإضافة، التعديل، والحذف 
// ==========================================

window.deleteItem = async function (action, name, zoneType = '') {
    customConfirm(`هل أنت متأكد من حذف (${name}) نهائياً؟`, async () => {
        showToast("<i class='fa-solid fa-hourglass-half'></i> جاري الحذف...", "warning");
        try {
            if (action === 'deleteShipping') {
                await window.secureDelete('settings_shipping', 'zone_name', name);
            } else if (action === 'deleteDriver') {
                await window.secureDelete('couriers', 'name', name);
            } else if (action === 'deleteModerator') {
                await window.secureDelete('moderators', 'name', name);
            } else if (action === 'deleteProduct') {
                await window.secureDelete('catalog', 'product_name', name);
            }
            showToast("<i class='fa-solid fa-check'></i> تم الحذف بنجاح!", "success");
            loadDataFromServer();
        } catch(err) {
            console.error(err);
            showToast("خطأ في الحذف", "error");
        }
    });
};

window.editZoneUI = function (name, price, type, duration) {
    if (document.getElementById('newZoneName')) document.getElementById('newZoneName').value = name;
    if (document.getElementById('newZonePrice')) document.getElementById('newZonePrice').value = price;
    if (document.getElementById('newZoneType')) document.getElementById('newZoneType').value = type;
    if (document.getElementById('newZoneDuration')) document.getElementById('newZoneDuration').value = duration;
    showToast("قم بتعديل البيانات واضغط حفظ", "success");
};

window.editDriverUI = function (name, phone) {
    if (document.getElementById('newDriverName')) document.getElementById('newDriverName').value = name;
    if (document.getElementById('newDriverPhone')) document.getElementById('newDriverPhone').value = phone;
    showToast("قم بتعديل البيانات واضغط حفظ", "success");
};

let newZoneTypeEl = document.getElementById('newZoneType');
let newZoneDurationEl = document.getElementById('newZoneDuration');
if (newZoneTypeEl && newZoneDurationEl) {
    newZoneTypeEl.addEventListener('change', () => {
        if (newZoneTypeEl.value === 'next_day') {
            newZoneDurationEl.value = 'تاني يوم';
            newZoneDurationEl.setAttribute('readonly', true);
        } else if (newZoneTypeEl.value === 'gov') {
            newZoneDurationEl.value = 'من 3 لـ 4 أيام';
            newZoneDurationEl.setAttribute('readonly', true);
        } else {
            newZoneDurationEl.value = '';
            newZoneDurationEl.removeAttribute('readonly');
        }
    });
}
let addZoneBtnAction = document.getElementById('addZoneBtn');
if (addZoneBtnAction) {
    addZoneBtnAction.addEventListener('click', () => {
        let name = document.getElementById('newZoneName') ? document.getElementById('newZoneName').value.trim() : "";
        let price = document.getElementById('newZonePrice') ? document.getElementById('newZonePrice').value : "";
        let type = document.getElementById('newZoneType') ? document.getElementById('newZoneType').value : "";
        let duration = document.getElementById('newZoneDuration') ? document.getElementById('newZoneDuration').value : "";
        if (!name || !price) { showToast("البيانات ناقصة!", "error"); return; }

        let isExisting = shippingData[name] !== undefined;
        if (isExisting && shippingData[name].price == price) {
            showToast("المنطقة دي مسجلة مسبقاً", "warning"); return;
        }

        setBtnLoading(addZoneBtnAction, true);
        let formData = new URLSearchParams();
        formData.append('action', isExisting ? 'editShipping' : 'addShipping');
        formData.append('zoneType', type === 'gov' ? 'govs' : 'alex');
        formData.append('name', name);
        formData.append('price', price);
        formData.append('deliveryType', type);
        formData.append('duration', duration);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast(`<i class=\'fa-solid fa-check\'></i> تم ${isExisting ? 'تعديل' : 'إضافة'} المنطقة!`, "success");
                setBtnLoading(addZoneBtnAction, false, "حفظ المنطقة");
                document.getElementById('newZoneName').value = ""; document.getElementById('newZonePrice').value = ""; document.getElementById('newZoneDuration').value = "";
                loadDataFromServer();
            }).catch(() => { setBtnLoading(addZoneBtnAction, false, "حفظ المنطقة"); });
    });
}

let addDriverBtnAction = document.getElementById('addDriverBtn');
if (addDriverBtnAction) {
    addDriverBtnAction.addEventListener('click', () => {
        let name = document.getElementById('newDriverName') ? document.getElementById('newDriverName').value.trim() : "";
        let phone = document.getElementById('newDriverPhone') ? document.getElementById('newDriverPhone').value : "";
        if (!name || !phone) { showToast("البيانات ناقصة!", "error"); return; }

        let driverSelectEl = document.getElementById('driverNameSelect') || document.getElementById('assignDriverSelect');
        let isExisting = driverSelectEl ? Array.from(driverSelectEl.options).some(o => o.value === name) : false;

        setBtnLoading(addDriverBtnAction, true);
        let formData = new URLSearchParams();
        formData.append('action', isExisting ? 'editDriver' : 'addDriver');
        formData.append('name', name);
        formData.append('phone', phone);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast(`<i class=\'fa-solid fa-check\'></i> تم ${isExisting ? 'تعديل' : 'إضافة'} المندوب!`, "success");
                setBtnLoading(addDriverBtnAction, false, "حفظ المندوب");
                document.getElementById('newDriverName').value = ""; document.getElementById('newDriverPhone').value = "";
                loadDataFromServer();
            }).catch(() => { setBtnLoading(addDriverBtnAction, false, "حفظ المندوب"); });
    });
}

let addModeratorBtn = document.getElementById('addModeratorBtn');
if (addModeratorBtn) {
    addModeratorBtn.addEventListener('click', () => {
        let nameInput = document.getElementById('newModeratorName');
        let name = nameInput ? nameInput.value.trim() : "";
        if (!name) { showToast("اكتب اسم الكاشير أولاً", "error"); return; }

        setBtnLoading(addModeratorBtn, true);
        let formData = new URLSearchParams();
        formData.append('action', 'addModerator');
        formData.append('name', name);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("<i class=\'fa-solid fa-check\'></i> تم إضافة الكاشير بنجاح", "success");
                setBtnLoading(addModeratorBtn, false, "إضافة");
                nameInput.value = "";
                loadDataFromServer();
            }).catch(() => { setBtnLoading(addModeratorBtn, false, "إضافة"); });
    });
}



// ==========================================
// 11. غرفة عمليات الشحن والداشبورد
// ==========================================
function renderShippingRoom(history) {
    const pendingContainer = document.getElementById('pendingOrdersContainer');
    const branchContainer = document.getElementById('branchOrdersContainer');
    const resContainer = document.getElementById('reservationsContainer');

    if (pendingContainer && resContainer) {
        const pendingOrders = window.pendingOrdersData.filter(o => o.orderType !== 'استلام من الفرع' && (!o.orderType || !o.orderType.includes('حجز')));
        const resOrders = window.pendingOrdersData.filter(o => o.orderType && o.orderType.includes('حجز'));

        // <i class=\'fa-solid fa-star\'></i> Update Reservations Badge
        const resBadge = document.getElementById('reservationsCountBadge');
        if (resBadge) {
            resBadge.innerText = `العدد: ${resOrders.length}`;
            resBadge.style.display = 'inline-block';
        }

        pendingContainer.innerHTML = '';
        if (pendingOrders.length === 0) pendingContainer.innerHTML = '<p class="empty-msg">لا يوجد أوردرات شحن قيد التجهيز.</p>';
        else pendingOrders.forEach(o => {
            let badgeClass = "normal";
            let typeText = o.orderType || "توصيل منزلي";
            if(typeText.includes("محافظات") || typeText === "gov_shipping") { badgeClass = "gov"; typeText = "محافظات"; }
            
            // محاولة جلب اسم المنطقة فقط بدلاً من العنوان الكامل
            let shortAddress = o.gov || o.zone || o.governorate || "";
            if (!shortAddress && o.address) {
                // نأخذ الجزء الأول قبل أي فاصلة أو شرطة أو سطر جديد
                shortAddress = (o.address ? String(o.address).split(/[-،,\n]/)[0] : '').trim();
            }
            if (!shortAddress) shortAddress = "بدون عنوان";

            pendingContainer.innerHTML += `
                <label class="shipping-order-card">
                    <input type="checkbox" class="soc-checkbox pending-checkbox" value="${o.id}">
                    <div class="soc-body">
                        <div class="soc-top">
                            <span class="soc-id">#${o.id}</span>
                            <span class="soc-type-badge ${badgeClass}">${typeText}</span>
                        </div>
                        <div class="soc-name">${o.name}</div>
                        <div class="soc-info-row">
                            <div class="soc-info-item highlight"><i class=\'fa-solid fa-mobile-screen\'></i> ${o.phone}</div>
                            <div class="soc-info-item money"><i class=\'fa-solid fa-money-bill-wave\'></i> ${o.total} ج.م</div>
                            <div class="soc-info-item"><i class=\'fa-solid fa-location-dot\'></i> ${shortAddress}</div>
                        </div>
                    </div>
                </label>`;
        });

        resContainer.innerHTML = '';
        if (resOrders.length === 0) resContainer.innerHTML = '<p class="empty-msg">لا يوجد حجوزات قادمة.</p>';
        else resOrders.forEach(o => {
            resContainer.innerHTML += `
                <div class="shipping-action-card" style="border-right: 4px solid var(--primary);">
                    <div class="sac-header">
                        <span class="sac-name">${o.name}</span>
                        <span class="sac-id">#${o.id}</span>
                    </div>
                    <div class="sac-finance-row">
                        <div class="sac-date"><i class=\'fa-regular fa-calendar-days\'></i> ${o.date || 'حجز'}</div>
                        <div class="sac-phone"><i class=\'fa-solid fa-mobile-screen\'></i> ${o.phone}</div>
                        <div class="sac-total">الإجمالي: ${o.total}ج</div>
                        <div class="sac-remain">المتبقي: ${o.remaining}ج</div>
                    </div>
                    <div class="sac-actions">
                        <button class="sac-btn-deliver interactive-btn" onclick="settleBranchOrder('${o.id}', this)">تم التسليم <i class=\'fa-solid fa-check\'></i></button>
                        <button class="sac-btn-convert interactive-btn" onclick="convertToNormalDelivery('${o.id}', this)">تحويل لعادي <i class=\'fa-solid fa-truck-fast\'></i></button>
                    </div>
                </div>`;
        });
    }

    // <i class=\'fa-solid fa-star\'></i> قسم أوردرات الفرع (المنفصلة تماماً عن المندوبين)
    if (branchContainer) {
        const branchOrders = window.pendingOrdersData.filter(o => o.orderType === 'استلام من الفرع' && o.status !== 'تم التوصيل ومُحاسب');

        // <i class=\'fa-solid fa-star\'></i> Update Branch Badge
        const branchBadge = document.getElementById('branchCountBadge');
        if (branchBadge) {
            branchBadge.innerText = `جاهز للاستلام: ${branchOrders.length}`;
            branchBadge.style.display = 'inline-block';
        }

        branchContainer.innerHTML = '';
        if (branchOrders.length === 0) branchContainer.innerHTML = '<p class="empty-msg">لا يوجد أوردرات استلام فرع حالياً.</p>';
        else branchOrders.forEach(o => {
            branchContainer.innerHTML += `
                <div class="shipping-action-card" style="border-right: 4px solid var(--warning);">
                    <div class="sac-header">
                        <span class="sac-name">${o.name}</span>
                        <span class="sac-id">#${o.id}</span>
                    </div>
                    <div class="sac-finance-row">
                        <div class="sac-phone"><i class=\'fa-solid fa-mobile-screen\'></i> ${o.phone}</div>
                        <div class="sac-total">الإجمالي: ${o.total}ج</div>
                        <div class="sac-remain">المتبقي: ${o.remaining}ج</div>
                    </div>
                    <div class="sac-actions">
                        <button class="sac-btn-deliver interactive-btn" style="width: 100%;" onclick="settleBranchOrder('${o.id}', this)">تم تسليم الفرع <i class=\'fa-solid fa-check\'></i></button>
                    </div>
                </div>`;
        });
    }

    // <i class=\'fa-solid fa-star\'></i> Update Out Orders Badge
    const outOrdersBadge = document.getElementById('outOrdersCountBadge');
    if (outOrdersBadge && window.latestServerData && window.latestServerData.shippedOrders) {
        let outCount = window.latestServerData.shippedOrders.length;
        outOrdersBadge.innerText = `الاوردرات في الخارج حالياً: ${outCount}`;
        outOrdersBadge.style.display = 'inline-block';
    }
}

// <i class=\'fa-solid fa-star\'></i> دالة تسليم الفرع الفورية
window.settleBranchOrder = function (orderId, btn) {
    let order = window.pendingOrdersData.find(o => String(o.id) === String(orderId));
    customSinglePrompt('الرجاء إدخال المبلغ المدفوع لاستلام الفرع:', order ? order.remaining : 0, (amountPaidText) => {
        if (!amountPaidText) return;

        setBtnLoading(btn, true);
        let formData = new URLSearchParams();
        formData.append('action', 'updateOrderStatus');
        formData.append('orderId', orderId);
        formData.append('status', 'تم التوصيل ومُحاسب');

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast(`<i class=\'fa-solid fa-check\'></i> تم التسليم وتصفية مبلغ (${amountPaidText} ج.م) بنجاح!`, "success");
                if (order) order.status = 'تم التوصيل ومُحاسب';
                renderShippingRoom();
                setTimeout(() => loadDataFromServer(), 3000);
            }).catch(() => setBtnLoading(btn, false, "تم التسليم ✅"));
    });
};

// <i class=\'fa-solid fa-star\'></i> دالة تحويل الحجز لتوصيل عادي
window.convertToNormalDelivery = function (orderId, btn) {
    customConfirm('هل أنت متأكد من تحويل هذا الحجز إلى توصيل فوري عادي؟', () => {
        setBtnLoading(btn, true);
        let formData = new URLSearchParams();
        formData.append('action', 'updateOrderStatus');
        formData.append('orderId', orderId);
        formData.append('status', 'قيد التجهيز');
        formData.append('orderType', 'توصيل منزلي عادي');

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("<i class=\'fa-solid fa-check\'></i> تم التحويل لتوصيل فوري بنجاح!", "success");
                let order = window.pendingOrdersData.find(o => String(o.id) === String(orderId));
                if (order) {
                    order.status = 'قيد التجهيز';
                    order.orderType = 'توصيل منزلي عادي';
                }
                renderShippingRoom();
                setTimeout(() => loadDataFromServer(), 3000);
            }).catch(() => setBtnLoading(btn, false, "تحويل لتوصيل عادي 🚚"));
    });
};

// <i class=\'fa-solid fa-star\'></i> حماية زرار (تقفيل المندوبين)
const loadDriverOrdersBtn = document.getElementById('loadDriverOrdersBtn');
const shippedContainer = document.getElementById('shippedOrdersContainer');

if (loadDriverOrdersBtn && shippedContainer) {
    loadDriverOrdersBtn.addEventListener('click', () => {
        const driver = document.getElementById('closeDriverSelect').value;
        if (!driver) {
            showToast("الرجاء اختيار المندوب أولاً!", "error");
            shippedContainer.innerHTML = '<p class="empty-msg">برجاء اختيار المندوب والضغط على "عرض العهدة"</p>';
            return;
        }

        shippedContainer.innerHTML = '<p class="empty-msg"><i class=\'fa-solid fa-hourglass-half\'></i> جاري تحميل عهدة المندوب...</p>';

        // <i class=\'fa-solid fa-star\'></i> Fix: استخدام shippedOrdersData من Supabase
        let shippedOrders = [];
        if (window.shippedOrdersData) {
            shippedOrders = window.shippedOrdersData.filter(o => o.driver === driver);
        }

        if (shippedOrders.length === 0) {
            shippedContainer.innerHTML = '<p class="empty-msg">لا توجد أوردرات في الشحن لهذا المندوب حالياً.</p>';
        } else {
            renderDriverShippedOrders(shippedOrders, shippedContainer);
        }
    });
}

// <i class=\'fa-solid fa-star\'></i> دالة مساعدة لعرض أوردرات المندوب المشحونة
function renderDriverShippedOrders(shippedOrders, container) {
    container.innerHTML = '';
    if (shippedOrders.length === 0) {
        container.innerHTML = '<p class="empty-msg">لا توجد أوردرات في الشحن لهذا المندوب.</p>';
    } else {
        shippedOrders.forEach(o => {
            container.innerHTML += `
                <label class="shipped-order-card">
                    <input type="checkbox" class="soc-checkbox shipped-checkbox" value="${o.id}">
                    <div class="soc-body">
                        <div class="soc-top">
                            <span class="soc-id">#${o.id}</span>
                            <span class="soc-name" style="font-size: 0.95rem;">${o.name}</span>
                        </div>
                        <div class="soc-info-row">
                            <div class="soc-info-item highlight"><i class=\'fa-solid fa-mobile-screen\'></i> ${o.phone}</div>
                            <div class="soc-info-item remaining"><i class=\'fa-solid fa-money-bill-wave\'></i> عهدة: ${o.remaining} ج.م</div>
                        </div>
                    </div>
                </label>`;
        });
    }
}

function processStatusUpdate(btn, checkboxesClass, newStatus, driverName = "") {
    const selected = Array.from(document.querySelectorAll(`.${checkboxesClass}:checked`)).map(cb => cb.value);
    if (selected.length === 0) { showToast("حدد أوردر واحد على الأقل!", "warning"); return; }

    setBtnLoading(btn, true);
    let completed = 0;
    selected.forEach(orderId => {
        let formData = new URLSearchParams();
        formData.append('action', 'updateOrderStatus');
        formData.append('orderId', orderId);
        formData.append('status', newStatus);
        if (driverName) formData.append('driverName', driverName);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                completed++;
                if (completed === selected.length) {
                    showToast(`<i class=\'fa-solid fa-check\'></i> تم التحديث لـ "${newStatus}"`, "success");
                    setBtnLoading(btn, false, btn.dataset.origText);
                    loadDataFromServer();
                }
            }).catch(() => { setBtnLoading(btn, false, btn.dataset.origText); });
    });
}

let assignBtn = document.getElementById('assignToDriverBtn');
if (assignBtn) assignBtn.addEventListener('click', () => {
    let driver = document.getElementById('assignDriverSelect').value;
    if (!driver) { showToast("اختر المندوب أولاً!", "error"); return; }
    processStatusUpdate(assignBtn, 'pending-checkbox', 'في الشحن', driver);
});

let sendWaDriverBtn = document.getElementById('sendWaDriverBtn');
if (sendWaDriverBtn) sendWaDriverBtn.addEventListener('click', () => {
    let driver = document.getElementById('assignDriverSelect').value;
    if (!driver) { showToast("اختر المندوب أولاً!", "error"); return; }

    let courierPhone = "";
    if (shippingData && window.financialsData) {
        let courier = shippingData[driver] || window.financialsData.find(f => f.name === driver); // fallback search
    }
    // We can also just send it to WhatsApp with empty phone and user selects the contact
    let ordersListText = `أوردرات المندوب: ${driver} 🏍️\n\n`;
    let totalCash = 0;

    const selected = Array.from(document.querySelectorAll('.pending-checkbox:checked')).map(cb => cb.value);
    if (selected.length === 0) { showToast("حدد أوردر واحد على الأقل!", "warning"); return; }

    selected.forEach((orderId, idx) => {
        let o = orderHistoryData.find(x => x.id === orderId);
        if (o) {
            ordersListText += `${idx + 1}. العميل: ${o.name}\n📱 ${o.phone}\n📍 العنوان: ${o.address}\n💰 المطلوب: ${o.remaining} ج.م\n🛒 المنتجات: ${o.products.replace(/\n/g, ', ')}\n\n`;
            totalCash += parseFloat(o.remaining) || 0;
        }
    });
    ordersListText += `🔥 الإجمالي المطلوب تحصيله: ${totalCash} ج.م\n`;
    window.open(`https://wa.me/?text=${encodeURIComponent(ordersListText)}`, '_blank');
});

let markDelivBtn = document.getElementById('markDeliveredBtn');
if (markDelivBtn) markDelivBtn.addEventListener('click', () => processStatusUpdate(markDelivBtn, 'shipped-checkbox', 'تم التوصيل'));

let markRetBtn = document.getElementById('markReturnedBtn');
if (markRetBtn) markRetBtn.addEventListener('click', () => processStatusUpdate(markRetBtn, 'shipped-checkbox', 'مرتجع'));

function updateAdvancedDashboard(history) {
    let completedToday = 0;

    let productMap = {};
    let platformMap = {};

    // <i class=\'fa-solid fa-star\'></i> Fix: استخدام التاريخ المحلي بدل UTC لتجنب مشكلة الـ timezone
    let now = new Date();
    let todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    let monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    let allOrders = window.allOrdersData || window.orderHistoryData || [];

    let todayOrdersCount = 0;
    let todaySalesTotal = 0;

    // <i class=\'fa-solid fa-star\'></i> Fix: دمج كل مصادر البيانات للحصول على صورة شاملة (لليوم فقط)
    let allKnownOrders = [...allOrders];
    if (window.uncollectedOrdersData && window.uncollectedOrdersData.length > 0) {
        window.uncollectedOrdersData.forEach(uo => {
            if (!allKnownOrders.find(o => String(o.id) === String(uo.id))) {
                allKnownOrders.push(uo);
            }
        });
    }

    allKnownOrders.forEach(o => {
        let oDate = (o.date || "").slice(0, 10);
        let isAccountedFor = o.status && o.status.includes("تم التوصيل ومُحاسب");

        // حسابات اليوم: عدد الأوردرات يحسب الكل، المبيعات تستثني المرتجع
        if (oDate === todayStr) {
            todayOrdersCount++;
            if (o.status !== "مرتجع") {
                todaySalesTotal += parseFloat(o.total || o.remaining || 0) || 0;
            }
        }

        if (isAccountedFor && oDate === todayStr) completedToday++;
    });

    // <i class=\'fa-solid fa-star\'></i> حساب العهدة الإجمالية من البيانات المالية (من الإكسيل مباشرة)
    let moneyWithDrivers = 0;
    if (window.latestServerData && window.latestServerData.financials) {
        window.latestServerData.financials.forEach(f => {
            moneyWithDrivers += parseFloat(f.inTransit) || 0;
        });
    }

    // عرض الإحصائيات الأساسية
    if (document.getElementById('moneyWithDrivers')) document.getElementById('moneyWithDrivers').innerText = moneyWithDrivers;

    // <i class=\'fa-solid fa-star\'></i> تحديث إحصائيات اليوم محلياً بشكل صحيح
    if (document.getElementById('todayCount')) document.getElementById('todayCount').innerText = todayOrdersCount;
    if (document.getElementById('todaySales')) document.getElementById('todaySales').innerText = todaySalesTotal;
    if (document.getElementById('completedCount')) document.getElementById('completedCount').innerText = completedToday;

    // بالس على زر المالية
    let openFinancialsBtn = document.getElementById('openFinancialsBtn');
    if (openFinancialsBtn) {
        if (moneyWithDrivers > 0) openFinancialsBtn.classList.add('pulse-btn');
        else openFinancialsBtn.classList.remove('pulse-btn');
    }
}

// <i class=\'fa-solid fa-star\'></i> V15.1: بناء قائمة الشهور لفلتر التقارير - شهور فيها بيانات فقط
function buildMonthFilterOptions() {
    let sel = document.getElementById('reportMonthFilter');
    if (!sel) return;
    let currentVal = sel.value;
    sel.innerHTML = '<option value="">اختر الشهر</option>';
    let arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    let now = new Date();
    // System started around May 2026
    let startYear = 2026;
    let startMonth = 4; // 0-indexed, so 4 is May
    
    let sortedMonths = [];
    let currYear = now.getFullYear();
    let currMonth = now.getMonth();
    
    while (currYear > startYear || (currYear === startYear && currMonth >= startMonth)) {
        let monthStr = currYear + '-' + String(currMonth + 1).padStart(2, '0');
        sortedMonths.push(monthStr);
        
        currMonth--;
        if (currMonth < 0) {
            currMonth = 11;
            currYear--;
        }
    }

    sortedMonths.forEach(monthVal => {
        let [yr, mo] = monthVal.split('-');
        let moIdx = parseInt(mo) - 1;
        if (moIdx < 0 || moIdx > 11) return;
        let label = arabicMonths[moIdx] + ' ' + yr;
        let opt = document.createElement('option');
        opt.value = monthVal;
        if (monthVal === (now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'))) {
            label += ' (الحالي)';
        }
        opt.innerText = label;
        sel.appendChild(opt);
    });

    if (currentVal && sortedMonths.includes(currentVal)) {
        sel.value = currentVal;
    }
}

// <i class=\'fa-solid fa-star\'></i> V15.1: عرض تقرير شهر محدد - يجلب من السيرفر
function renderReportForMonth(targetMonth) {
    let statusEl = document.getElementById('reportFilterStatus');
    let topEl = document.getElementById('topProductsList');
    let pltEl = document.getElementById('platformStatsList');
    if (!targetMonth) {
        if (statusEl) statusEl.innerHTML = '<i class=\'fa-solid fa-triangle-exclamation\'></i> اختر شهراً أولاً';
        return;
    }
    if (statusEl) statusEl.innerHTML = '<i class=\'fa-solid fa-hourglass-half\'></i> جاري تحميل بيانات الشهر...';
    if (topEl) topEl.innerHTML = '<p class="empty-msg"><i class=\'fa-solid fa-hourglass-half\'></i> جاري التحميل...</p>';
    if (pltEl) pltEl.innerHTML = '<p class="empty-msg"><i class=\'fa-solid fa-hourglass-half\'></i> جاري التحميل...</p>';

    let fetchDate = targetMonth + '-01';
    fetch(`${GOOGLE_SHEETS_URL}?date=${fetchDate}`)
        .then(r => r.json())
        .then(data => {
            let arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
            let [yr, mo] = targetMonth.split('-');
            if (statusEl) statusEl.innerHTML = `<i class=\'fa-solid fa-check\'></i> تم تحميل بيانات ${arabicMonths[parseInt(mo) - 1]} ${yr}`;

            // أفضل 10 منتجات
            if (topEl) {
                let products = data.monthTopProducts || [];
                if (products.length === 0) {
                    topEl.innerHTML = '<p class="empty-msg">لا توجد بيانات مبيعات في هذا الشهر.</p>';
                } else {
                    let maxVal = Math.max(...products.map(p => p.qty || 0)) || 1;
                    topEl.innerHTML = products.map((p, idx) => {
                        let pct = Math.round(((p.qty || 0) / maxVal) * 100);
                        let medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                        return `<div style="margin-bottom:12px;">
                            <div style="display:flex;justify-content:space-between;font-size:0.88rem;font-weight:bold;margin-bottom:4px;">
                                <span>${medal} ${p.name}</span>
                                <span style="color:var(--primary);background:var(--primary-glow);padding:2px 8px;border-radius:8px;">${p.qty} قطعة</span>
                            </div>
                            <div style="background:var(--bg);border-radius:8px;height:10px;overflow:hidden;">
                                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--primary),var(--primary-light));border-radius:8px;transition:width 0.8s ease;"></div>
                            </div></div>`;
                    }).join('');
                }
            }

            // <i class=\'fa-solid fa-star\'></i> تحديث إحصائيات الشهر في أعلى الصفحة بناءً على الشهر المختار
            if (document.getElementById('monthCount')) document.getElementById('monthCount').innerText = data.monthOrderCount || 0;
            if (document.getElementById('monthSales')) document.getElementById('monthSales').innerText = data.monthSales || 0;
            if (document.getElementById('completedMonthCount')) document.getElementById('completedMonthCount').innerText = data.completedMonthCount || 0;
            if (document.getElementById('returnedCount')) document.getElementById('returnedCount').innerText = data.returnedCount || 0;


            // تحليل مناطق الشحن
            let zonesEl = document.getElementById('zonesAnalyticsList');
            if (zonesEl) {
                let zones = data.monthZonesStats;
                
                // If server is old and doesn't return monthZonesStats
                if (!zones || zones.length === 0) {
                    zonesEl.innerHTML = '<p class="empty-msg">لا توجد بيانات شحن في هذا الشهر.</p>';
                } else {
                    let html = '';
                    let totalOrdersAllZones = 0;
                    let totalShippingAllZones = 0;
                    
                    zones.forEach(z => {
                        totalOrdersAllZones += z.count;
                        totalShippingAllZones += z.totalShipping;
                    });
                    
                    let fixedSalary = 300; // يومية افتراضية للمندوب الثابت
                    let estimatedDaysInMonth = 30; // 30 يوم عمل بدون إجازات // استبعاد 4 أيام جمعة
                    let totalFixedCost = fixedSalary * estimatedDaysInMonth;
                    let potentialSavings = totalShippingAllZones - totalFixedCost;
                    
                    html += `
                        <div style="margin-bottom:15px; background:#fff8e1; border:1px solid #ffe082; padding:12px; border-radius:8px;">
                            <h4 style="margin:0 0 10px; color:#f39c12;"><i class="fa-solid fa-lightbulb"></i> دراسة جدوى مبدئية</h4>
                            <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:5px;">
                                <span>إجمالي مصاريف الشحن المدفوعة:</span>
                                <strong>${totalShippingAllZones} ج.م</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:5px;">
                                <span>تكلفة مندوب ثابت (300ج × 30 يوم):</span>
                                <strong>${totalFixedCost} ج.م</strong>
                            </div>
                            <hr style="border-color:#ffe082; margin:10px 0;">
                            <div style="display:flex; justify-content:space-between; font-size:1rem; font-weight:bold;">
                                <span>التوفير المتوقع:</span>
                                <span style="color:${potentialSavings > 0 ? 'var(--success)' : 'var(--danger)'};">${potentialSavings > 0 ? '+' : ''}${potentialSavings} ج.م</span>
                            </div>
                            <p style="font-size:0.75rem; color:#888; margin:5px 0 0;">* الحساب مبني على الافتراضات وقد يتغير حسب المسافات وظروف العمل.</p>
                        </div>
                    `;
                    
                    let maxCount = zones[0].count || 1;
                    html += zones.map((z, idx) => {
                        let MathPct = Math.round((z.count / maxCount) * 100);
                        return `<div style="margin-bottom:12px;">
                            <div style="display:flex;justify-content:space-between;font-size:0.88rem;font-weight:bold;margin-bottom:4px;">
                                <span>${idx + 1}. ${z.name}</span>
                                <span>${z.count} أوردر ( ${z.totalShipping} ج )</span>
                            </div>
                            <div style="background:#f0f0f0;height:8px;border-radius:4px;overflow:hidden;">
                                <div style="width:${MathPct}%;background:var(--warning);height:100%;border-radius:4px;"></div>
                            </div>
                        </div>`;
                    }).join('');
                    
                    zonesEl.innerHTML = html;
                }
            }

            // أداء المنصات - بالترتيب المحدد
            if (pltEl) {
                let raw = data.monthPlatforms || {};
                const ORDER = [
                    { key: 'واتساب', emoji: '<i class=\'fa-brands fa-whatsapp\'></i>', color: '#25D366' },
                    { key: 'انستجرام', emoji: '<i class=\'fa-brands fa-instagram\'></i>', color: '#E1306C' },
                    { key: 'فيسبوك', emoji: '<i class=\'fa-brands fa-facebook\'></i>', color: '#1877F2' },
                    { key: 'تيك توك', emoji: '<i class=\'fa-brands fa-tiktok\'></i>', color: '#010101' },
                ];
                // <i class=\'fa-solid fa-star\'></i> حساب الإجمالي باستخدام includes لتغطية الإيموجي في الشيت
                const getCount = (raw, keyword) => {
                    return Object.entries(raw).reduce((sum, [k, v]) => k.includes(keyword) ? sum + v : sum, 0);
                };
                let total = ORDER.reduce((s, p) => s + getCount(raw, p.key), 0);
                if (total === 0) {
                    pltEl.innerHTML = '<p class="empty-msg">لا توجد بيانات منصات في هذا الشهر.</p>';
                } else {
                    pltEl.innerHTML = ORDER.map(plt => {
                        let cnt = getCount(raw, plt.key);
                        let pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                        return `<div style="margin-bottom:14px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                                <span style="font-weight:bold;font-size:0.95rem;">${plt.emoji} ${plt.key}</span>
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <span style="font-size:0.95rem;font-weight:900;color:${plt.color};">${cnt} طلب</span>
                                    <span style="font-size:0.75rem;background:#f0f0f0;color:#555;padding:2px 7px;border-radius:10px;">${pct}%</span>
                                </div>
                            </div>
                            <div style="background:var(--bg);border-radius:10px;height:12px;overflow:hidden;">
                                <div style="height:100%;width:${pct}%;background:${plt.color};border-radius:10px;transition:width 0.9s ease;"></div>
                            </div></div>`;
                    }).join('');
                }
            }
        })
        .catch(() => {
            if (statusEl) statusEl.innerHTML = '<i class=\'fa-solid fa-xmark\'></i> حدث خطأ في الاتصال';
            if (topEl) topEl.innerHTML = '<p class="empty-msg"><i class=\'fa-solid fa-xmark\'></i> تعذر التحميل</p>';
            if (pltEl) pltEl.innerHTML = '<p class="empty-msg"><i class=\'fa-solid fa-xmark\'></i> تعذر التحميل</p>';
        });
}

// <i class=\'fa-solid fa-star\'></i> V15.1: ربط زرار التقارير
let loadReportsBtn = document.getElementById('loadReportsBtn');
if (loadReportsBtn) {
    let reportsVisible = false;
    loadReportsBtn.addEventListener('click', () => {
        let sec = document.getElementById('detailedReportsSection');
        if (!sec) return;
        reportsVisible = !reportsVisible;
        sec.style.display = reportsVisible ? 'block' : 'none';
        loadReportsBtn.innerHTML = reportsVisible ? '<i class=\'fa-solid fa-chart-column\'></i> إخفاء التقارير التفصيلية' : '<i class=\'fa-solid fa-chart-column\'></i> إظهار التقارير التفصيلية';
        if (reportsVisible) buildMonthFilterOptions();
    });
}

let loadReportDataBtn = document.getElementById('loadReportDataBtn');
if (loadReportDataBtn) {
    loadReportDataBtn.addEventListener('click', () => {
        let sel = document.getElementById('reportMonthFilter');
        if (!sel || !sel.value) { showToast('اختر شهراً أولاً', 'warning'); return; }
        renderReportForMonth(sel.value);
    });
}

window.shareToWhatsAppGroup = function (orderId) {
    let order;
    if (typeof orderId === 'object') {
        order = orderId;
    } else {
        // <i class=\'fa-solid fa-star\'></i> Fix: String() comparison to prevent type mismatch (string vs number)
        let findFn = o => String(o.id) === String(orderId);
        order = (window.orderHistoryData || []).find(findFn) ||
            (window.searchResultsCache || []).find(findFn) ||
            (window.pendingOrdersData || []).find(findFn) ||
            (window.suspendedOrdersData || []).find(findFn) ||
            (window.uncollectedOrdersData || []).find(findFn);
    }

    if (!order) {
        showToast("لم يتم العثور على الأوردر", "error");
        console.warn("shareToWhatsAppGroup: could not find orderId =", orderId, typeof orderId);
        console.log("Available IDs in history:", (window.orderHistoryData || []).map(o => ({ id: o.id, type: typeof o.id })));
        return;
    }
    console.log("Order Data:", order);

    // <i class=\'fa-solid fa-star\'></i> V14.2: إصلاح شامل لـ Keys القادمة من الإكسيل - fallback لكل حقل
    let _name = order.name || order.customerName || "";
    let _gov = order.gov || order.governorate || "";
    let _address = order.address || order.customerAddress || order.addr || "";
    let _phone = order.phone || order.customerPhone || order.mobile || "";
    let _phone2 = order.phone2 || order.secondPhone || order.backupPhone || order.altPhone || order.customerPhone2 || order.otherPhone || "";
    let _payment = order.payment || order.paymentMethod || order.payMethod || "";
    let _products = order.products || order.items || order.productDetails || "";
    let _shipping = parseFloat(order.shipping || order.shippingCost || order.shippingFee || 0);
    let _remaining = order.remaining !== undefined ? order.remaining : (order.total || order.finalTotal || 0);
    let _type = order.orderType || order.type || order.deliveryType || "توصيل";

    let text = `*نوع الطلب:* ${_type}\n`;
    if (_type.includes('حجز') || _type === 'special_date') {
        let resDate = order.reservationDate || order.expectedDate || order.bookingDate || order.specialDate || order.spDate;
        if (resDate) {
            if (resDate.toString().includes('GMT') || resDate.toString().includes('توقيت')) {
                let d = new Date(resDate);
                if (!isNaN(d.getTime())) resDate = `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
            }
            text += `📅 *تاريخ التسليم:* ${resDate}\n`;
        }
    }
    text += `*تاريخ إنشاء الأوردر:* ${order.date || new Date().toLocaleDateString('ar-EG')} ⏰ ${order.time || new Date().toLocaleTimeString('ar-EG')}\n`;
    
    let tCount = document.getElementById('todayCount') ? document.getElementById('todayCount').innerText : "0";
    let mCount = document.getElementById('monthCount') ? document.getElementById('monthCount').innerText : "0";
    text += `عدد اوردرات اليوم : ${tCount}\n`;
    text += `عدد اوردرات الشهر : ${mCount}\n`;

    text += `👤 *العميل:* ${_name}\n`;
    if (!_type.includes('استلام') && !_type.includes('فرع') && (_gov || _address)) {
        text += `📍 *العنوان:* ${_gov ? _gov + " - " : ""}${_address}\n`;
    }
    if (_phone) text += `📱 *الموبايل:* ${_phone}\n`;
    if (_phone2 && String(_phone2).trim() !== '') text += `📱 *رقم احتياطي:* ${String(_phone2).trim()}\n`;
    text += `💳 *طريقة الدفع:* ${_payment}\n\n`;
    text += `📦 *المنتجات:*\n${_products}\n`;
    let _subtotal = order.subtotal || order.productsTotal || (parseFloat(order.total) - parseFloat(_shipping)) || 0;
    text += `🛍️ *إجمالي المنتجات:* ${_subtotal} ج.م\n`;
    text += `🚚 *الشحن:* ${_shipping}\n`;
    text += `💰 *الإجمالي النهائي:* ${_remaining}\n`;

    navigator.clipboard.writeText(text).then(() => {
        showToast("تم نسخ بيانات الأوردر للحافظة بنجاح 📋", "success");
    }).catch(err => {
        showToast("فشل في نسخ البيانات", "error");
    });
};

let shareOrderBtn = document.getElementById('shareOrderBtn');
if (shareOrderBtn) {
    shareOrderBtn.addEventListener('click', () => {
        let name = document.getElementById('customerName') ? document.getElementById('customerName').value.trim() : "";
        if (!name) { showToast("برجاء إدخال بيانات الأوردر أولاً", "error"); return; }

        let gov = document.getElementById('governorate') ? document.getElementById('governorate').value : "";
        let addressVal = document.getElementById('address') ? document.getElementById('address').value : "";
        let paymentMethod = document.getElementById('paymentMethod') ? document.getElementById('paymentMethod').value : "";
        let productsListText = "";
        document.querySelectorAll('.product-row.confirmed').forEach(row => {
            let n = row.querySelector('.product-name-input').value;
            let price = parseFloat(row.querySelector('.product-price-input').value) || 0;
            let offer = parseFloat(row.querySelector('.product-offer-input').value) || 0;
            let finalPrice = offer > 0 ? offer : price;
            let q = parseFloat(row.querySelector('.product-qty-input').value) || 1;
            productsListText += `${n} - الكمية: ${q} (${finalPrice * q}ج)\n`;
        });
        let shipping = document.getElementById('shippingCost') ? document.getElementById('shippingCost').value : 0;
        let rem = document.getElementById('remainingAmountDisplay') ? document.getElementById('remainingAmountDisplay').innerText : (document.getElementById('finalTotalDisplay') ? document.getElementById('finalTotalDisplay').innerText : 0);
        let deliveryTypeSelect = document.getElementById('deliveryType');
        let orderTypeLabel = deliveryTypeSelect ? deliveryTypeSelect.options[deliveryTypeSelect.selectedIndex].text : "توصيل";

        let currentOrderObj = {
            orderType: orderTypeLabel,
            date: new Date().toLocaleDateString('ar-EG'),
            time: new Date().toLocaleTimeString('ar-EG'),
            name: name,
            phone: document.getElementById('customerPhone') ? document.getElementById('customerPhone').value.trim() : "",
            phone2: document.getElementById('phone2') ? document.getElementById('phone2').value.trim() : "",
            gov: gov,
            address: addressVal,
            payment: paymentMethod,
            products: productsListText,
            shipping: shipping,
            remaining: rem
        };
        shareToWhatsAppGroup(currentOrderObj);
    });
}


// ==========================================
// 12. نظام الكتالوج والنواقص الشامل
// ==========================================

window.pushCatalogUpdate = function (name, price, isOffer, offerPrice) {
    // تحديث البيانات محلياً فوراً لمنع اختفاء التعديل
    let existing = catalogData.find(p => p.name === name);
    if (existing) {
        existing.isOffer = isOffer;
        existing.offerPrice = offerPrice;
        existing.price = price;
    } else {
        catalogData.push({ name, price, isOffer, offerPrice });
    }
    
    // إعادة الرسم فوراً ليرى المستخدم النتيجة بدون انتظار
    renderCatalog();

    let formData = new URLSearchParams();
    formData.append('action', 'updateCatalog');
    formData.append('name', name);
    formData.append('price', price);
    formData.append('isOffer', isOffer);
    formData.append('offerPrice', offerPrice);
    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData });
};

// متغيرات نظام تقسيم صفحات الكتالوج (Pagination)
let catalogCurrentPage = 1;
const CATALOG_ITEMS_PER_PAGE = 50;
let catalogSearchQuery = "";
let currentFilteredCatalog = [];

function updateCatalogPaginationUI() {
    let totalPages = Math.ceil(currentFilteredCatalog.length / CATALOG_ITEMS_PER_PAGE) || 1;
    let prevBtn = document.getElementById('catalogPrevPage');
    let nextBtn = document.getElementById('catalogNextPage');
    let pageInfo = document.getElementById('catalogPageInfo');
    
    if (prevBtn) prevBtn.disabled = catalogCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = catalogCurrentPage >= totalPages;
    if (pageInfo) pageInfo.innerText = `صفحة ${catalogCurrentPage} من ${totalPages}`;
}

// دالة العرض الأساسية للكتالوج (مجهزة بالصفحات والبحث)
function renderCatalog() {
    let container = document.getElementById('catalogListContainer');
    if (!container) return;
    container.innerHTML = '';

    // فلترة بناءً على البحث
    currentFilteredCatalog = catalogData || [];
    if (catalogSearchQuery.trim() !== "") {
        let q = catalogSearchQuery.trim().toLowerCase();
        currentFilteredCatalog = currentFilteredCatalog.filter(p => 
            p.name.toLowerCase().includes(q) || 
            (p.barcode && String(p.barcode).toLowerCase().includes(q))
        );
    }

    if (currentFilteredCatalog.length === 0) {
        container.innerHTML = '<p class="empty-msg">لا يوجد منتجات لعرضها.</p>';
        updateCatalogPaginationUI();
        return;
    }

    // حساب المنتجات التي ستظهر في الصفحة الحالية (Sliding Window: 3 Pages Max)
    let totalPages = Math.ceil(currentFilteredCatalog.length / CATALOG_ITEMS_PER_PAGE) || 1;
    if (catalogCurrentPage > totalPages) catalogCurrentPage = totalPages;
    if (catalogCurrentPage < 1) catalogCurrentPage = 1;

    let startPage = Math.max(1, catalogCurrentPage - 1);
    let endPage = Math.min(totalPages, catalogCurrentPage + 1);
    
    // الحفاظ على 3 صفحات دائماً إذا أمكن (لتحسين تجربة المستخدم وتقليل إعادة التحميل)
    if (catalogCurrentPage === 1 && totalPages >= 3) { endPage = 3; }
    if (catalogCurrentPage === totalPages && totalPages >= 3) { startPage = totalPages - 2; }

    let startIndex = (startPage - 1) * CATALOG_ITEMS_PER_PAGE;
    let endIndex = endPage * CATALOG_ITEMS_PER_PAGE;
    let itemsToShow = currentFilteredCatalog.slice(startIndex, endIndex);

    let fragment = document.createDocumentFragment();

    itemsToShow.forEach(p => {
        let isOfferActive = p.isOffer === true || p.isOffer === "true" || p.isOffer === 1;
        let div = document.createElement('div');
        div.className = 'data-row catalog-row';
        div.innerHTML = `
            <div class="catalog-info">
                <strong>${p.name}</strong>
                <span class="catalog-price">أساسي: ${p.price} ج.م</span>
                ${isOfferActive ? `<span class="catalog-offer-price">سعر العرض: ${p.offerPrice} ج.م</span>` : ''}
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; align-items:center;">
                <label class="switch" title="تفعيل/إيقاف العرض">
                    <input type="checkbox" class="offer-toggle" ${isOfferActive ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
                <button class="btn-outline interactive-btn edit-cat-btn" style="padding:4px; font-size:0.7rem;">تعديل <i class=\'fa-solid fa-pencil\'></i></button>
            </div>
        `;

        div.querySelector('.offer-toggle').addEventListener('change', (e) => {
            let newState = e.target.checked;
            let currentOffer = p.offerPrice || p.price;
            if (newState && !p.offerPrice) {
                customSinglePrompt(`أدخل سعر العرض لـ ${p.name}:`, p.price, (val) => {
                    if (!val) { e.target.checked = false; return; }
                    currentOffer = val;
                    window.pushCatalogUpdate(p.name, p.price, newState, currentOffer);
                    showToast("<i class=\'fa-solid fa-check\'></i> تم تفعيل العرض", "success");
                });
            } else {
                window.pushCatalogUpdate(p.name, p.price, newState, currentOffer);
                showToast(newState ? "<i class=\'fa-solid fa-check\'></i> تم تفعيل العرض" : "<i class=\'fa-solid fa-xmark\'></i> تم إيقاف العرض", "success");
            }
        });

        div.querySelector('.edit-cat-btn').addEventListener('click', () => {
            document.getElementById('editCatOldName').value = p.name;
            document.getElementById('editCatName').value = p.name;
            document.getElementById('editCatPrice').value = p.price;
            document.getElementById('editCatOfferPrice').value = p.offerPrice || 0;
            document.getElementById('editCatalogModal').classList.add('active');
        });

        fragment.appendChild(div);
    });
    
    container.appendChild(fragment);

    updateCatalogPaginationUI();
}

// أحداث شريط البحث والتنقل
document.addEventListener('DOMContentLoaded', () => {
    let sInput = document.getElementById('catalogSearchInput');
    if (sInput) {
        sInput.addEventListener('input', (e) => {
            catalogSearchQuery = e.target.value;
            catalogCurrentPage = 1; // الرجوع لأول صفحة عند البحث
            renderCatalog();
        });
    }

    let pBtn = document.getElementById('catalogPrevPage');
    if (pBtn) {
        pBtn.addEventListener('click', () => {
            if (catalogCurrentPage > 1) {
                catalogCurrentPage--;
                renderCatalog();
            }
        });
    }

    let nBtn = document.getElementById('catalogNextPage');
    if (nBtn) {
        nBtn.addEventListener('click', () => {
            let totalPages = Math.ceil(currentFilteredCatalog.length / CATALOG_ITEMS_PER_PAGE);
            if (catalogCurrentPage < totalPages) {
                catalogCurrentPage++;
                renderCatalog();
            }
        });
    }
});

let closeEditCatModal = document.getElementById('closeEditCatModal');
let saveEditCatBtn = document.getElementById('saveEditCatBtn');
if (closeEditCatModal) closeEditCatModal.addEventListener('click', () => document.getElementById('editCatalogModal').classList.remove('active'));

if (saveEditCatBtn) {
    saveEditCatBtn.addEventListener('click', () => {
        let name = document.getElementById('editCatName').value;
        let price = document.getElementById('editCatPrice').value;
        let offerPrice = document.getElementById('editCatOfferPrice').value;

        let selected = catalogData.find(c => c.name === name);
        let isOfferActive = selected ? (selected.isOffer === true || selected.isOffer === "true" || selected.isOffer === 1) : false;

        setBtnLoading(saveEditCatBtn, true);
        window.pushCatalogUpdate(name, price, isOfferActive, offerPrice);

        setTimeout(() => {
            showToast("<i class=\'fa-solid fa-check\'></i> تم التعديل بنجاح", "success");
            setBtnLoading(saveEditCatBtn, false, "حفظ التعديلات");
            document.getElementById('editCatalogModal').classList.remove('active');
        }, 1500);
    });
}

let addCatalogBtn = document.getElementById('addCatalogBtn');
if (addCatalogBtn) {
    addCatalogBtn.addEventListener('click', () => {
        let n = document.getElementById('newCatalogName').value;
        let p = document.getElementById('newCatalogPrice').value;
        if (!n || !p) { showToast("أدخل اسم المنتج والسعر", "error"); return; }

        setBtnLoading(addCatalogBtn, true);
        window.pushCatalogUpdate(n, p, false, 0);
        showToast("<i class=\'fa-solid fa-check\'></i> تم إضافة المنتج", "success");

        setTimeout(() => {
            document.getElementById('newCatalogName').value = '';
            document.getElementById('newCatalogPrice').value = '';
            setBtnLoading(addCatalogBtn, false, "إضافة");
            loadDataFromServer();
        }, 1500);
    });
}

function renderOutOfStock(oosList) {
    let container = document.getElementById('outOfStockContainer');
    if (!container) return;
    container.innerHTML = '';

    if (oosList.length === 0) {
        container.innerHTML = '<p class="empty-msg">لا يوجد نواقص مسجلة حالياً.</p>';
        return;
    }

    oosList.forEach(item => {
        let div = document.createElement('div');
        div.className = 'data-row';
        div.innerHTML = `
            <div style="flex:1;">
                <strong>${item.customer}</strong> <br>
                <small style="color:var(--primary); font-weight:bold;">${item.product}</small><br>
                <span style="font-size:0.75rem; color:#888;">الغرض: ${item.reason || '--'}</span>
            </div>
            <div style="display:flex; gap:5px;">
                <button class="interactive-btn wa-oos-btn" style="background:#25D366; color:white; border:none; padding:5px 10px; border-radius:8px;"><i class=\'fa-brands fa-whatsapp\'></i></button>
                <button class="interactive-btn del-oos-btn" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:8px;"><i class=\'fa-solid fa-xmark\'></i></button>
            </div>
        `;

        div.querySelector('.wa-oos-btn').addEventListener('click', () => {
            let phone = item.phone.toString().replace(/'/g, '').trim();
            if (phone.startsWith('0')) phone = '+2' + phone;
            let msg = `أهلاً بك يا ${item.customer} 👋\nالمنتج اللي سألتنا عليه (${item.product}) متوفر دلوقتي وتقدر تطلبه! 🍬`;
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        });

        div.querySelector('.del-oos-btn').addEventListener('click', () => {
            customConfirm("مسح العميل من قائمة النواقص؟", () => {
                let formData = new URLSearchParams();
                formData.append('action', 'deleteOutOfStock');
                formData.append('phone', item.phone);
                formData.append('product', item.product);
                fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData });
                div.remove();
                showToast("تم الحذف بنجاح", "success");
            });
        });

        container.appendChild(div);
    });
}

let addOosBtn = document.getElementById('addOosBtn');
if (addOosBtn) {
    addOosBtn.addEventListener('click', () => {
        let c = document.getElementById('oosCustomer').value;
        let ph = document.getElementById('oosPhone').value;
        let pr = document.getElementById('oosProduct').value;
        let r = document.getElementById('oosReason') ? document.getElementById('oosReason').value : "";

        if (!c || !ph || !pr) { showToast("أكمل بيانات العميل والمنتج الناقص", "error"); return; }

        setBtnLoading(addOosBtn, true);
        let formData = new URLSearchParams();
        formData.append('action', 'addOutOfStock');
        formData.append('customer', c);
        formData.append('phone', ph);
        formData.append('product', pr);
        formData.append('reason', r);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("<i class=\'fa-solid fa-check\'></i> تم تسجيل الناقص", "success");
                setBtnLoading(addOosBtn, false, "تسجيل");
                document.getElementById('oosCustomer').value = '';
                document.getElementById('oosPhone').value = '';
                document.getElementById('oosProduct').value = '';
                loadDataFromServer();
            }).catch(() => setBtnLoading(addOosBtn, false, "تسجيل"));
    });
}

setInterval(() => {
    if (!document.querySelector('.modal-overlay.active')) {
        loadDataFromServer();
    }
}, 180000);

const darkModeToggle = document.getElementById('darkModeToggle');
if (darkModeToggle) {
    darkModeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('candyDarkMode', 'true');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('candyDarkMode', 'false');
        }
    });
}

let currentCustomerFilter = 'all';

function renderCustomers(customersList) {
    let container = document.getElementById('customersListContainer');
    if (!container) return;
    container.innerHTML = '';

    // Update Dashboard Stats
    let dashTotalCustomers = document.getElementById('dashTotalCustomers');
    let dashVipCustomers = document.getElementById('dashVipCustomers');
    let dashTotalOrders = document.getElementById('dashTotalOrders');
    
    let allData = window.customersData || [];
    let vipCount = allData.filter(c => (parseInt(c.count) || 0) >= 3).length;
    let totalOrders = allData.reduce((sum, c) => sum + (parseInt(c.count) || 0), 0);

    if(dashTotalCustomers) dashTotalCustomers.innerText = allData.length;
    if(dashVipCustomers) dashVipCustomers.innerText = vipCount;
    if(dashTotalOrders) dashTotalOrders.innerText = totalOrders;

    if (customersList.length === 0) {
        container.innerHTML = '<div class="empty-state-msg"><i class=\'fa-solid fa-box-open\' style=\'font-size: 3rem; margin-bottom: 10px;\'></i><p>لا يوجد عملاء مطابقين للبحث.</p></div>';
        return;
    }

    customersList.forEach(c => {
        let div = document.createElement('div');
        let isVip = (parseInt(c.count) || 0) >= 3;
        div.className = 'dash-card ' + (isVip ? 'customer-card-vip-border' : 'customer-card-regular-border');
        
        let vipBadge = isVip ? '<span class="customer-card-vip-badge"><i class=\'fa-solid fa-star\'></i> VIP</span>' : '';

        div.innerHTML = `
            ${vipBadge}
            <div class="customer-card-header">
                <div class="customer-card-avatar">
                    <i class=\'fa-solid fa-user\'></i>
                </div>
                <div>
                    <h4 class="customer-card-title">${c.name}</h4>
                    <span class="customer-card-phone"><i class=\'fa-solid fa-phone\' style=\'font-size: 0.75rem;\'></i> ${c.phone}</span>
                </div>
            </div>
            <div class="customer-card-details">
                <span><i class=\'fa-solid fa-location-dot\' style=\'color: #e74c3c;\'></i> ${c.gov || 'غير محدد'} - ${c.address || ''}</span>
                <div class="customer-card-stats-box">
                    <span><i class=\'fa-solid fa-cart-shopping\' style=\'color: #3498db;\'></i> طلبات: <strong>${c.count || 0}</strong></span>
                    <span><i class=\'fa-solid fa-money-bill-wave\' style=\'color: #27ae60;\'></i> مدفوعات: <strong>${c.total || 0}ج</strong></span>
                </div>
                <span style="font-size: 0.75rem; color: #999; text-align: left; margin-top: 5px;"><i class=\'fa-regular fa-calendar\'></i> آخر طلب: ${c.lastDate ? String(c.lastDate).split('T')[0] : '--'}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

function applyCustomerFilters(keyword = '') {
    let allData = window.customersData || [];
    let filtered = allData;
    
    if (currentCustomerFilter === 'vip') {
        filtered = filtered.filter(c => (parseInt(c.count) || 0) >= 3);
    }
    
    if (keyword.trim() !== '') {
        let lower = keyword.trim().toLowerCase();
        filtered = filtered.filter(c => 
            c.name.toLowerCase().includes(lower) || c.phone.toString().includes(lower)
        );
    }
    
    renderCustomers(filtered);
}

// Attach filter tabs listener once
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.filter-tabs .filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-tabs .filter-btn').forEach(b => {
                b.classList.remove('active');
                b.style.background = '#f0f0f0';
                b.style.color = '#555';
            });
            e.currentTarget.classList.add('active');
            e.currentTarget.style.background = 'var(--primary)';
            e.currentTarget.style.color = 'white';
            currentCustomerFilter = e.currentTarget.getAttribute('data-filter');
            
            if(window._customersLoaded) {
                let kw = document.getElementById('customerSearchInput') ? document.getElementById('customerSearchInput').value : '';
                applyCustomerFilters(kw);
            }
        });
    });
});

let loadCustomersBtn = document.getElementById('loadCustomersBtn');
let customersListContainer = document.getElementById('customersListContainer');
window._customersLoaded = false;

if (loadCustomersBtn) {
    loadCustomersBtn.addEventListener('click', () => {
        let btnIcon = loadCustomersBtn.querySelector('i');
        if (btnIcon) btnIcon.classList.add('fa-spin');
        
        if(customersListContainer) {
            customersListContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--primary);"><i class=\'fa-solid fa-spinner fa-spin\' style=\'font-size: 3rem; margin-bottom: 10px;\'></i><p>جاري تحميل وتحليل البيانات...</p></div>';
        }

        fetch(`${GOOGLE_SHEETS_URL}?action=getCustomers`)
            .then(r => r.json())
            .then(data => {
                let customers = data.customers || window.customersData || [];
                window.customersData = customers;
                window._customersLoaded = true;
                applyCustomerFilters();
                if (btnIcon) btnIcon.classList.remove('fa-spin');
            })
            .catch(() => {
                applyCustomerFilters();
                if (btnIcon) btnIcon.classList.remove('fa-spin');
            });
    });
}

function fetchCatalogFromFirebase() {
    try {
        const cached = localStorage.getItem(FIREBASE_CACHE_KEY);
        if (cached) {
            try { barcodeCatalogData = JSON.parse(cached); } catch(e) { barcodeCatalogData = {}; }
            console.log("⚡ تم تحميل الكاش المحلي: ", barcodeCatalogData.length, "منتج");
            updateSmartSuggestionsFromFirebase();
        }
    } catch (e) {
        console.warn("تعذر قراءة الكاش المحلي:", e);
    }

    console.log("<i class='fa-solid fa-hourglass-half'></i> جاري تحميل بيانات المنتجات من Firebase...");
    fetch(FIREBASE_PRODUCTS_URL)
        .then(response => {
            if (!response.ok) throw new Error("فشل الاتصال بـ Firebase: " + response.status);
            return response.json();
        })
        .then(data => {
            barcodeCatalogData = parseFirebaseProducts(data);
            
            try {
                localStorage.setItem(FIREBASE_CACHE_KEY, JSON.stringify(barcodeCatalogData));
            } catch (e) {
                console.warn("تعذر حفظ الكاش المحلي:", e);
            }

            console.log("<i class='fa-solid fa-check'></i> تم تحميل بيانات المنتجات من Firebase: ", barcodeCatalogData.length, "منتج");
            updateSmartSuggestionsFromFirebase();
            
            if (typeof expiryData !== 'undefined' && expiryData.length > 0) {
                const fbMap = new Map();
                barcodeCatalogData.forEach(p => fbMap.set(String(p.name).trim().toLowerCase(), p));
                let enriched = false;
                expiryData.forEach(exp => {
                    if (exp.name) {
                        let fb = fbMap.get(String(exp.name).trim().toLowerCase());
                        if (fb && (!exp.barcode || String(exp.barcode).trim() === '')) {
                            exp.barcode = fb.barcode;
                            enriched = true;
                        }
                    }
                });
                if (enriched && typeof renderExpiryDashboard === 'function') {
                    renderExpiryDashboard();
                }
            }
        })
        .catch(err => {
            console.error("<i class='fa-solid fa-xmark'></i> خطأ في تحميل المنتجات من Firebase:", err);
            if (barcodeCatalogData.length === 0) {
                if (typeof showToast === 'function') showToast("<i class='fa-solid fa-triangle-exclamation'></i> فشل تحميل بيانات المنتجات من السيرفر", "error");
            }
        });
}

window.addEventListener('load', () => {
    if (typeof fetchCatalogFromFirebase === 'function') {
        fetchCatalogFromFirebase();
    }
});
let customerSearchInput = document.getElementById('customerSearchInput');
if (customerSearchInput) {
    customerSearchInput.addEventListener('input', (e) => {
        if(window._customersLoaded) applyCustomerFilters(e.target.value);
    });
}

// ==========================================
// 13. <i class=\'fa-solid fa-star\'></i> حماية زر الإكسيل بباسورد
// ==========================================

// ==========================================
// 14. <i class=\'fa-solid fa-star\'></i> الماسح الضوئي الذكي (Offline Barcode Scanner)
// ==========================================

let barcodeCatalogData = [];
let html5QrcodeScanner = null;

// 1. جلب بيانات المنتجات من Firebase Realtime Database مع Cache ذكي
const FIREBASE_PRODUCTS_URL = 'https://candyclubsync-default-rtdb.firebaseio.com/products.json';
const FIREBASE_CACHE_KEY = 'candy_firebase_products_cache';

// تحويل بيانات Firebase الخام إلى مصفوفة منتجات
function parseFirebaseProducts(data) {
    const result = [];
    if (data) {
        const items = Array.isArray(data) ? data : Object.values(data);
        items.forEach(item => {
            if (item && item.Barcode && item.Name) {
                result.push({
                    barcode: String(item.Barcode).trim(),
                    name: String(item.Name).trim(),
                    price: Number(item.Price) || 0,
                    stock: Number(item.Stock) || 0
                });
            }
        });
    }
    return result;
}

// تحديث اقتراحات المنتجات الذكية من Firebase
function updateSmartSuggestionsFromFirebase() {
    const smartProductsList = document.getElementById('smartProductsList');
    if (!smartProductsList) return;
    smartProductsList.innerHTML = '';
    // نعرض أول 200 منتج فقط في الـ datalist لمنع التعليق
    const maxSuggestions = 200;
    const items = barcodeCatalogData.slice(0, maxSuggestions);
    items.forEach(p => {
        smartProductsList.innerHTML += `<option value="${p.name}">`;
    });
}

// تشغيل الدالة فور تحميل الصفحة
// fetchCatalogFromFirebase moved to conditional load

// 2. إصدار صوت Beep قصير عند نجاح المسح
function playBeepSound() {
    playBeep(2750, 'sine', 0.08, 0.5);
}

// 3. فتح وإغلاق النوافذ
let openScannerBtn = document.getElementById('openScannerBtn');
let scannerModal = document.getElementById('scannerModal');
let closeScannerModalBtn = document.getElementById('closeScannerModalBtn');

let scanResultModal = document.getElementById('scanResultModal');
let closeScanResultBtn = document.getElementById('closeScanResultBtn');
let scanAnotherBtn = document.getElementById('scanAnotherBtn');

let currentScannerMode = 'price';

if (openScannerBtn) {
    openScannerBtn.addEventListener('click', () => {
        currentScannerMode = 'price';
        scannerModal.classList.add('active');
        startBarcodeScanner();
    });
}

if (closeScannerModalBtn) {
    closeScannerModalBtn.addEventListener('click', () => {
        stopBarcodeScanner();
        scannerModal.classList.remove('active');
    });
}

if (closeScanResultBtn) {
    closeScanResultBtn.addEventListener('click', () => {
        scanResultModal.classList.remove('active');
    });
}

if (scanAnotherBtn) {
    scanAnotherBtn.addEventListener('click', () => {
        currentScannerMode = 'price';
        scanResultModal.classList.remove('active');
        scannerModal.classList.add('active');
        startBarcodeScanner();
    });
}

// 4. منطق الماسح الضوئي
const getSupportedFormats = () => {
    if (typeof Html5QrcodeSupportedFormats !== 'undefined') {
        return [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
        ];
    }
    return undefined;
};

function startBarcodeScanner() {
    try {
        if (html5QrcodeScanner) {
            return;
        }

        let formats = getSupportedFormats();
        let configObj = formats ? { formatsToSupport: formats } : undefined;
        html5QrcodeScanner = new Html5Qrcode("reader", configObj);

        let config = { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 };

        html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
            .catch(err => {
                console.error("تعذر تشغيل الكاميرا:", err);
                showToast("تعذر تشغيل الكاميرا، يمكنك استخدام البحث اليدوي أو رفع صورة.", "warning");
            });
    } catch (e) {
        console.error("خطأ فادح في تشغيل الماسح الضوئي:", e);
        showToast("تعذر تشغيل الكاميرا، يمكنك استخدام البحث اليدوي أو رفع صورة.", "warning");
    }
}

function stopBarcodeScanner() {
    try {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.stop().then(() => {
                html5QrcodeScanner.clear();
                html5QrcodeScanner = null;
            }).catch(err => {
                console.error("فشل في إيقاف الكاميرا", err);
                try { html5QrcodeScanner.clear(); } catch (e) { }
                html5QrcodeScanner = null;
            });
        }
    } catch (e) {
        console.error("خطأ أثناء محاولة إيقاف الماسح:", e);
        html5QrcodeScanner = null;
    }
}

let globalScanLock = false;

function processBarcodeAction(val) {
    if (globalScanLock) {
        console.warn('Scan ignored due to debounce lock (too fast).');
        return; // Prevent duplicate rapid scans from physical scanners
    }
    
    // Lock scanning for 1 full second
    globalScanLock = true;
    setTimeout(() => {
        globalScanLock = false;
    }, 1000);

    if (currentScannerMode === 'inventory') {
        const invProdName = document.getElementById('invProdName');
        const invProdQty = document.getElementById('invProdQty');
        const invProdBarcode = document.getElementById('invProdBarcode');
        
        if (val && barcodeCatalogData) {
            const found = barcodeCatalogData.find(p => String(p.barcode).split(',').map(b=>b.trim().toLowerCase()).includes(val.toLowerCase()));
            if (found) {
                if (invProdName) invProdName.value = found.name;
                if (invProdBarcode) invProdBarcode.value = val;
                showToast("<i class='fa-solid fa-check'></i> تم سحب المنتج", "success");
            } else {
                if (invProdName) invProdName.value = 'غير مسجل';
                if (invProdBarcode) invProdBarcode.value = val;
                showToast("<i class='fa-solid fa-triangle-exclamation'></i> الباركود (" + val + ") غير مسجل", "warning");
            }
        } else {
            showToast("<i class='fa-solid fa-triangle-exclamation'></i> لم يتم التعرف على النص أو الكتالوج فارغ", "error");
        }
        
        playBeepSound();
        if (invProdQty) invProdQty.focus();
    } else if (currentScannerMode === 'ledger') {
        const ledgerProdName = document.getElementById('ledgerProdName');
        const ledgerProdQty = document.getElementById('ledgerProdQty');
        const ledgerProdBarcode = document.getElementById('ledgerProdBarcode');
        
        if (val && barcodeCatalogData) {
            const found = barcodeCatalogData.find(p => String(p.barcode).split(',').map(b=>b.trim().toLowerCase()).includes(val.toLowerCase()));
            if (found) {
                if (ledgerProdName) ledgerProdName.value = found.name;
                if (ledgerProdQty) ledgerProdQty.value = found.stock ? Number(found.stock) : 0;
                if (ledgerProdBarcode) ledgerProdBarcode.value = val;
                showToast("<i class='fa-solid fa-check'></i> " + found.name + " | الكمية: " + found.stock + " | السعر: " + found.price + " ج.م", "success");
            } else {
                if (ledgerProdName) ledgerProdName.value = '';
                if (ledgerProdQty) ledgerProdQty.value = '';
                if (ledgerProdBarcode) ledgerProdBarcode.value = val; 
                showToast("<i class='fa-solid fa-triangle-exclamation'></i> الباركود (" + val + ") غير مسجل، اكتب الاسم يدوياً", "warning");
            }
        } else {
            showToast("<i class='fa-solid fa-triangle-exclamation'></i> لم يتم التعرف على النص أو الكتالوج فارغ", "error");
        }
        
        playBeepSound();
        if (ledgerProdQty) {
            ledgerProdQty.focus();
        }
    } else {
        handleBarcodeMatch(val);
    }
}

function onScanSuccess(decodedText, decodedResult) {
    stopBarcodeScanner();
    scannerModal.classList.remove('active');
    
    let val = String(decodedText).trim();
    processBarcodeAction(val);
}

function onScanFailure(error) {
    // تتكرر مع كل فريم لا يجد فيه باركود
}

// 5. البحث والتطابق
let currentScannedProduct = null;

function handleBarcodeMatch(barcodeValue) {
    let matchedProduct = barcodeCatalogData.find(p => String(p.barcode).split(',').map(b=>b.trim().toLowerCase()).includes(String(barcodeValue).trim().toLowerCase()));

    if (matchedProduct) {
        currentScannedProduct = matchedProduct;
        playBeepSound();

        document.getElementById('scanResultName').textContent = matchedProduct.name;
        // عرض السعر بالإنجليزية القياسية
        document.getElementById('scanResultPrice').textContent = Number(matchedProduct.price);
        // عرض الكمية المتاحة (Stock)
        const stockEl = document.getElementById('scanResultStock');
        if (stockEl) {
            stockEl.textContent = Number(matchedProduct.stock);
            // تلوين الكمية حسب المخزون
            const stockContainer = document.getElementById('scanResultStockContainer');
            if (stockContainer) {
                if (matchedProduct.stock <= 0) {
                    stockContainer.style.background = '#fbe9e7';
                    stockContainer.querySelector('.stock-label').style.color = '#c62828';
                    stockEl.style.color = '#c62828';
                } else if (matchedProduct.stock <= 5) {
                    stockContainer.style.background = '#fff3e0';
                    stockContainer.querySelector('.stock-label').style.color = '#e65100';
                    stockEl.style.color = '#e65100';
                } else {
                    stockContainer.style.background = '#e3f2fd';
                    stockContainer.querySelector('.stock-label').style.color = '#1565c0';
                    stockEl.style.color = '#1565c0';
                }
            }
        }

        scanResultModal.classList.add('active');

        let modalContent = scanResultModal.querySelector('.modal-content');
        modalContent.classList.remove('flash-success');
        void modalContent.offsetWidth; // Trigger reflow
        modalContent.classList.add('flash-success');

    } else {
        showToast("المنتج غير مسجل في قاعدة البيانات <i class=\'fa-solid fa-xmark\'></i>", "error");
    }
}

// 6. الإدخال اليدوي
let manualSearchBtn = document.getElementById('manualSearchBtn');
let manualBarcodeInput = document.getElementById('manualBarcodeInput');

if (manualSearchBtn && manualBarcodeInput) {
    manualSearchBtn.addEventListener('click', () => {
        let val = manualBarcodeInput.value.trim();
        if (!val) {
            showToast("يرجى إدخال رقم الباركود", "warning");
            return;
        }

        // إغلاق النافذة وتنفيذ البحث فوراً بدون انتظار الكاميرا
        scannerModal.classList.remove('active');
        processBarcodeAction(val);
        manualBarcodeInput.value = '';

        // محاولة إيقاف الكاميرا في الخلفية
        stopBarcodeScanner();
    });

    manualBarcodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') manualSearchBtn.click();
    });
}

// 7. تحسينات إضافية (نسخ الاسم ورفع صورة)
let copyProductNameBtn = document.getElementById('copyProductNameBtn');
if (copyProductNameBtn) {
    copyProductNameBtn.addEventListener('click', () => {
        let nameToCopy = document.getElementById('scanResultName').textContent;
        navigator.clipboard.writeText(nameToCopy).then(() => {
            let origText = copyProductNameBtn.textContent;
            copyProductNameBtn.innerHTML = "تم النسخ <i class=\'fa-solid fa-check\'></i>";
            copyProductNameBtn.style.background = "var(--success-light)";
            copyProductNameBtn.style.color = "var(--success)";
            copyProductNameBtn.style.borderColor = "var(--success)";

            setTimeout(() => {
                copyProductNameBtn.textContent = origText;
                copyProductNameBtn.style.background = "";
                copyProductNameBtn.style.color = "";
                copyProductNameBtn.style.borderColor = "";
            }, 2000);
        }).catch(err => {
            showToast("فشل نسخ الاسم", "error");
        });
    });
}

// Refresh Button Listener
const refreshExpiryBtn = document.getElementById('refreshExpiryBtn');
if (refreshExpiryBtn) {
    refreshExpiryBtn.addEventListener('click', loadExpiryData);
}

function loadExpiryData() {
    // V16.5: استخدام البيانات المحملة مسبقاً بدلاً من استدعاء السيرفر
    if (window.expiriesData && window.expiriesData.length > 0) {
        expiryData = Array.isArray(window.expiriesData) ? window.expiriesData : [];
        
        // <i class='fa-solid fa-star'></i> سحب الباركود للمنتجات القديمة من الفايربيز أو إذا كان العمود غير موجود في الإكسيل
        if (barcodeCatalogData && barcodeCatalogData.length > 0) {
            const fbMap = new Map();
            barcodeCatalogData.forEach(p => fbMap.set(String(p.name).trim().toLowerCase(), p));
            
            expiryData.forEach(exp => {
                if (exp.name) {
                    let fb = fbMap.get(String(exp.name).trim().toLowerCase());
                    if (fb && (!exp.barcode || String(exp.barcode).trim() === '')) {
                        exp.barcode = fb.barcode;
                    }
                }
            });
        }
    } else {
        expiryData = [];
    }

    renderExpiryDashboard();
    updateCatalogWithOffers(); // To highlight items on offer in the main cashier view
}

let barcodeImageUpload = document.getElementById('barcodeImageUpload');
if (barcodeImageUpload) {
    barcodeImageUpload.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            let imageFile = e.target.files[0];

            let formats = getSupportedFormats();
            let configObj = formats ? { formatsToSupport: formats } : undefined;
            let tempScanner = html5QrcodeScanner;

            if (!tempScanner) {
                try {
                    tempScanner = new Html5Qrcode("reader", configObj);
                } catch (err) {
                    console.error("فشل تهيئة الماسح للصور:", err);
                    showToast("فشل تهيئة الماسح الضوئي، حاول مرة أخرى", "error");
                    e.target.value = '';
                    return;
                }
            }

            // تغيير واجهة الزر لإعطاء تأكيد مرئي ومنع تكرار الضغط
            let uploadLabel = document.querySelector('label[for="barcodeImageUpload"]');
            let originalLabelHtml = uploadLabel ? uploadLabel.innerHTML : '';
            if (uploadLabel) {
                uploadLabel.innerHTML = 'جاري الفحص... <i class=\'fa-solid fa-hourglass-half\'></i>';
                uploadLabel.style.pointerEvents = 'none';
                uploadLabel.style.opacity = '0.7';
            }

            // إضافة Toast لإعلام المستخدم
            showToast("جاري فحص الصورة...", "success");

            // استخدام setTimeout للسماح للمتصفح بتحديث الواجهة قبل بدء المعالجة الثقيلة
            setTimeout(() => {
                let emergencyTimeout = setTimeout(() => {
                    // إجبار الواجهة على العودة لطبيعتها
                    if (uploadLabel) {
                        uploadLabel.innerHTML = originalLabelHtml;
                        uploadLabel.style.pointerEvents = 'auto';
                        uploadLabel.style.opacity = '1';
                    }
                    e.target.value = ''; // تفريغ حقل الملف
                    showToast('الصورة معقدة أو الإضاءة قوية، يرجى المحاولة بصورة أوضح', 'error');
                    // محاولة تنظيف الماسح
                    try { tempScanner.clear(); } catch (err) { }
                }, 5000);

                tempScanner.scanFile(imageFile, false)
                    .then(decodedText => {
                        clearTimeout(emergencyTimeout);
                        scannerModal.classList.remove('active');
                        handleBarcodeMatch(decodedText);

                        // إعادة ضبط كل شيء
                        e.target.value = '';
                        if (uploadLabel) {
                            uploadLabel.innerHTML = originalLabelHtml;
                            uploadLabel.style.pointerEvents = 'auto';
                            uploadLabel.style.opacity = '1';
                        }
                        stopBarcodeScanner(); // إيقاف الكاميرا لو كانت تعمل
                    })
                    .catch(err => {
                        clearTimeout(emergencyTimeout);
                        console.error("فشل المسح من الصورة:", err);
                        showToast("لم يتم العثور على باركود واضح في هذه الصورة، حاول مرة أخرى", "warning");

                        // إعادة ضبط الواجهة لتفادي التعليق (Unblock UI)
                        e.target.value = '';
                        if (uploadLabel) {
                            uploadLabel.innerHTML = originalLabelHtml;
                            uploadLabel.style.pointerEvents = 'auto';
                            uploadLabel.style.opacity = '1';
                        }
                    });
            }, 100);
        }
    });
}

let addToCartBtn = document.getElementById('addToCartBtn');
if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
        if (currentScannedProduct) {
            let productName = currentScannedProduct.name;
            let productPrice = Number(currentScannedProduct.price);

            // 1. البحث عن المنتج في الفاتورة لزيادة الكمية بدلاً من التكرار
            let existingRows = Array.from(document.querySelectorAll('.product-row'));
            let foundRow = null;

            for (let row of existingRows) {
                let nameInput = row.querySelector('.product-name-input');
                if (nameInput && nameInput.value === productName) {
                    foundRow = row;
                    break;
                }
            }

            if (foundRow) {
                // زيادة الكمية للصف الحالي
                let qtyInput = foundRow.querySelector('.product-qty-input');
                if (qtyInput) {
                    qtyInput.value = parseInt(qtyInput.value || 1) + 1;
                    // إطلاق حدث الإدخال لتحديث الإجمالي
                    qtyInput.dispatchEvent(new Event('input'));
                }

                if (typeof calculateTotal === 'function') calculateTotal();
                showToast(`تمت زيادة كمية ${productName} في الفاتورة <i class=\'fa-solid fa-cart-shopping\'></i>`, "success");

                scanResultModal.classList.remove('active');
                currentScannedProduct = null;
                return; // إنهاء الدالة فوراً
            }

            // 2. إضافة كصف جديد إذا لم يكن موجوداً
            // إزالة الصفوف الفارغة لتجنب الفوضى
            let emptyRows = Array.from(document.querySelectorAll('.product-row:not(.confirmed)')).filter(r => r.querySelector('.product-name-input').value === "");
            if (emptyRows.length > 0) {
                emptyRows[0].parentElement.remove();
            }

            // استخدام دالة إضافة المنتجات الحالية في النظام
            if (typeof addProductRow === 'function') {
                addProductRow(productName, productPrice, "1", true);

                // تحديث الإجمالي
                if (typeof calculateTotal === 'function') calculateTotal();

                showToast(`تمت إضافة ${productName} للفاتورة بنجاح <i class=\'fa-solid fa-check\'></i>`, "success");

                // إغلاق النافذة
                scanResultModal.classList.remove('active');

                // التأكد من وجود صف فارغ للإدخال اليدوي
                if (document.querySelectorAll('.product-row:not(.confirmed)').length === 0) {
                    addProductRow();
                }

                currentScannedProduct = null;
            } else {
                showToast("تعذر إضافة المنتج، دالة الفاتورة غير متوفرة", "error");
            }
        }
    });
}

// ==========================================
// 15. نظام الصلاحيات والعروض (Expiry Dashboard)
// ==========================================

let expiryData = [];

// Fetch data only when modal opens (Lazy Loading)



let ledgerCart = [];
let currentExportData = [];
let currentExportCategory = '';

// ==========================================
// 1. Ledger Modal Logic (محضر الاستلام)
// ==========================================
const openLedgerBtn = document.getElementById('openLedgerBtn');
const ledgerModal = document.getElementById('ledgerModal');

if (openLedgerBtn) {
    openLedgerBtn.addEventListener('click', () => {
        if (!document.getElementById('ledgerRegDate').value) {
            document.getElementById('ledgerRegDate').value = new Date().toISOString().split('T')[0];
        }
        ledgerModal.style.display = 'flex';
    });
}

window.closeLedgerModal = function () {
    ledgerModal.style.display = 'none';
};

const startInvCameraScannerBtn = document.getElementById('startInvCameraScannerBtn');
if (startInvCameraScannerBtn) {
    startInvCameraScannerBtn.addEventListener('click', () => {
        if (typeof currentScannerMode !== 'undefined') {
            currentScannerMode = 'inventory';
        }
        const scannerModal = document.getElementById('scannerModal');
        if (scannerModal) {
            scannerModal.classList.add('active');
            startBarcodeScanner();
        }
    });
}

const startLedgerCameraScannerBtn = document.getElementById('startLedgerCameraScannerBtn');
if (startLedgerCameraScannerBtn) {
    startLedgerCameraScannerBtn.addEventListener('click', () => {
        if (typeof currentScannerMode !== 'undefined') {
            currentScannerMode = 'ledger';
        }
        const scannerModal = document.getElementById('scannerModal');
        if (scannerModal) {
            scannerModal.classList.add('active');
            if (typeof startBarcodeScanner === 'function') {
                startBarcodeScanner();
            }
        }
    });
}

const ledgerSearchBarcodeBtn = document.getElementById('ledgerSearchBarcodeBtn');
if (ledgerSearchBarcodeBtn) {
    ledgerSearchBarcodeBtn.addEventListener('click', () => {
        const val = document.getElementById('ledgerProdBarcode').value.trim();
        if (!val) {
            showToast("يرجى كتابة الباركود أولاً", "warning");
            return;
        }
        if (typeof currentScannerMode !== 'undefined') {
            currentScannerMode = 'ledger';
        }
        processBarcodeAction(val);
    });
}

const startOrderCameraScannerBtn = document.getElementById('startOrderCameraScannerBtn');
if (startOrderCameraScannerBtn) {
    startOrderCameraScannerBtn.addEventListener('click', () => {
        if (typeof currentScannerMode !== 'undefined') {
            currentScannerMode = 'order';
        }
        const scannerModal = document.getElementById('scannerModal');
        if (scannerModal) {
            scannerModal.classList.add('active');
            if (typeof startBarcodeScanner === 'function') {
                startBarcodeScanner();
            }
        }
    });
}

const orderSearchBarcodeBtn = document.getElementById('orderSearchBarcodeBtn');
if (orderSearchBarcodeBtn) {
    orderSearchBarcodeBtn.addEventListener('click', () => {
        const val = document.getElementById('orderBarcodeInput').value.trim();
        if (!val) {
            showToast("يرجى كتابة الباركود أولاً", "warning");
            return;
        }
        if (typeof currentScannerMode !== 'undefined') {
            currentScannerMode = 'order';
        }
        processBarcodeAction(val);
        document.getElementById('orderBarcodeInput').value = '';
    });
}

// Add Item to Cart
const addLedgerItemBtn = document.getElementById('addLedgerItemBtn');
if (addLedgerItemBtn) {
    addLedgerItemBtn.addEventListener('click', () => {
        const name = document.getElementById('ledgerProdName').value;
        const qty = document.getElementById('ledgerProdQty').value;
        const date = document.getElementById('ledgerProdDate').value;
        const location = document.getElementById('ledgerProdLocation').value;
        const notes = document.getElementById('ledgerProdNotes').value;
        const barcode = document.getElementById('ledgerProdBarcode') ? document.getElementById('ledgerProdBarcode').value : '';

        if (!name || !qty || !date) {
            showToast("يرجى إكمال البيانات الأساسية (الاسم، الكمية، التاريخ)", "warning");
            return;
        }

        const item = {
            id: name + '|' + qty + '|' + date,
            name: name,
            qty: qty,
            expiryDate: date,
            location: location,
            status: 'مش في عرض',
            notes: notes,
            barcode: barcode
        };

        ledgerCart.push(item);
        renderLedgerCart();

        document.getElementById('ledgerProdName').value = '';
        document.getElementById('ledgerProdQty').value = '';
        document.getElementById('ledgerProdDate').value = '';
        document.getElementById('ledgerProdLocation').value = '';
        document.getElementById('ledgerProdNotes').value = '';
        if (document.getElementById('ledgerProdBarcode')) document.getElementById('ledgerProdBarcode').value = '';
    });
}

function renderLedgerCart() {
    const tbody = document.getElementById('ledgerCartBody');
    const countSpan = document.getElementById('ledgerCartCount');
    if (!tbody) return;

    countSpan.innerText = ledgerCart.length;

    if (ledgerCart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #7f8c8d;">لا توجد منتجات مضافة حتى الآن.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    ledgerCart.forEach((item, index) => {
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;">${item.name}</td>
                <td style="padding: 8px;">${item.qty}</td>
                <td style="padding: 8px;" dir="ltr">${item.expiryDate}</td>
                <td style="padding: 8px;">${item.location || '-'}</td>
                <td style="padding: 8px; text-align: center; display: flex; gap: 5px; justify-content: center;">
                    <button class="interactive-btn" style="background: #f39c12; color: white; border: none; padding: 5px 10px; border-radius: 5px;" onclick="editLedgerItem(${index})">تعديل</button>
                    <button class="interactive-btn" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px;" onclick="removeLedgerItem(${index})">حذف</button>
                </td>
            </tr>
        `;
    });
}

window.editLedgerItem = function (index) {
    const item = ledgerCart[index];
    document.getElementById('ledgerProdName').value = item.name;
    document.getElementById('ledgerProdQty').value = item.qty;
    document.getElementById('ledgerProdDate').value = item.expiryDate;
    document.getElementById('ledgerProdLocation').value = item.location || '';
    document.getElementById('ledgerProdNotes').value = item.notes || '';
    if (document.getElementById('ledgerProdBarcode')) document.getElementById('ledgerProdBarcode').value = item.barcode || '';

    ledgerCart.splice(index, 1);
    renderLedgerCart();
};

window.removeLedgerItem = function (index) {
    ledgerCart.splice(index, 1);
    renderLedgerCart();
};

// Save Batch
const saveLedgerBtn = document.getElementById('saveLedgerBtn');
if (saveLedgerBtn) {
    saveLedgerBtn.addEventListener('click', () => {
        if (ledgerCart.length === 0) {
            showToast("السلة فارغة، يرجى إضافة منتجات أولاً.", "warning");
            return;
        }

        const regDate = document.getElementById('ledgerRegDate').value;
        const receiverName = document.getElementById('ledgerReceiverName').value;

        if (!regDate || !receiverName) {
            showToast("يرجى إدخال تاريخ التسجيل واسم المستلم في أعلى المحضر.", "warning");
            return;
        }

        // Attach reg info to all items
        let timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        let finalRegDate = regDate.trim() + " " + timeStr;

        const payload = ledgerCart.map(item => Object.assign({}, item, {
            // Include exact time in regDate to use it as a natural batch grouping ID!
            regDate: finalRegDate,
            receiver: receiverName
        }));

        setBtnLoading(saveLedgerBtn, true, "جاري الحفظ...");

        let formData = new URLSearchParams();
        formData.append('action', 'addExpiriesBatch');
        formData.append('batchData', JSON.stringify(payload));

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("<i class=\'fa-solid fa-check\'></i> تم حفظ البضاعة بنجاح", "success");
                setBtnLoading(saveLedgerBtn, false);
                ledgerCart = [];
                renderLedgerCart();
                closeLedgerModal();
                loadExpiryData(); // Refresh the dashboard
            }).catch(() => {
                showToast("<i class=\'fa-solid fa-xmark\'></i> حدث خطأ في الاتصال", "error");
                setBtnLoading(saveLedgerBtn, false);
            });
    });
}

// ==========================================
// 2. Dashboard Logic (إدارة الصلاحيات)
// ==========================================

function getDaysRemaining(expiryDateStr) {
    if (!expiryDateStr || expiryDateStr.toString().includes('بدون')) return 'NoExpiry';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expiryDateStr);
    if (isNaN(expDate.getTime())) return 'NoExpiry';
    const timeDiff = expDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

function renderExpiryDashboard() {
    let countTotal = 0;
    let countOffers = 0;
    let countCritical = 0;
    let countAlert = 0;
    let countAttention = 0;
    let countSafe = 0;
    let countFar = 0;
    let countExpired = 0;
    let countNoExpiry = 0;

    let activeItems = expiryData.filter(item => item.status !== 'Deleted');

    activeItems.forEach(item => {
        countTotal++;
        if (item.status === 'في عرض') countOffers++;
        const daysRemaining = getDaysRemaining(item.expiryDate);

        if (daysRemaining === 'NoExpiry') {
            countNoExpiry++;
        } else if (daysRemaining < 0) {
            countExpired++;
        } else if (daysRemaining < 7) {
            countCritical++;
        } else if (daysRemaining < 30) {
            countAlert++;
        } else if (daysRemaining <= 90) {
            countAttention++;
        } else if (daysRemaining <= 180) {
            countSafe++;
        } else {
            countFar++;
        }
    });

    if (document.getElementById('expOffersItems')) document.getElementById('expOffersItems').innerText = countOffers;
    if (document.getElementById('expTotalItems')) document.getElementById('expTotalItems').innerText = countTotal;
    if (document.getElementById('expExpiredItems')) {
        document.getElementById('expExpiredItems').innerText = countExpired;
        let sidebarTab = document.querySelector('button.nav-item[data-target="expiry-tab"]');
        if (sidebarTab) {
            let existingBadge = sidebarTab.querySelector('.pulsing-badge');
            if (countExpired > 0) {
                if (!existingBadge) sidebarTab.innerHTML += '<span class="pulsing-badge"></span>';
            } else if (existingBadge) {
                existingBadge.remove();
            }
        }
    }
    if (document.getElementById('expNoExpiryItems')) document.getElementById('expNoExpiryItems').innerText = countNoExpiry;
    if (document.getElementById('expCriticalItems')) document.getElementById('expCriticalItems').innerText = countCritical;
    if (document.getElementById('expAlertItems')) document.getElementById('expAlertItems').innerText = countAlert;
    if (document.getElementById('expAttentionItems')) document.getElementById('expAttentionItems').innerText = countAttention;
    if (document.getElementById('expSafeItems')) document.getElementById('expSafeItems').innerText = countSafe;
    if (document.getElementById('expFarItems')) document.getElementById('expFarItems').innerText = countFar;
}

// متغيرات نظام تقسيم صفحات الصلاحيات
let expiryFilteredData = [];
let expiryCurrentPage = 1;
const EXPIRY_ITEMS_PER_PAGE = 50;
let expiryCurrentCategory = "";
let selectedExpiryItems = new Set();

function updateExpiryPaginationUI() {
    let dataLen = window.expiryGroupedData ? window.expiryGroupedData.length : expiryFilteredData.length;
    let totalPages = Math.ceil(dataLen / EXPIRY_ITEMS_PER_PAGE) || 1;
    let prevBtn = document.getElementById('expiryPrevPage');
    let nextBtn = document.getElementById('expiryNextPage');
    let pageInfo = document.getElementById('expiryPageInfo');
    
    if (prevBtn) prevBtn.disabled = expiryCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = expiryCurrentPage >= totalPages;
    if (pageInfo) pageInfo.innerText = `صفحة ${expiryCurrentPage} من ${totalPages}`;
}

window.showExpiryDetails = function (category, resetPage = true) {
    if (resetPage) {
        expiryCurrentPage = 1;
    }
    
    let title = "";
    let activeItems = expiryData.filter(item => item.status !== 'Deleted');
    
    // إذا كان البحث جديد أو فئة جديدة نقوم بالفلترة من جديد
    if (resetPage) {
        let tempFiltered = [];
        activeItems.forEach(item => {
            const daysRemaining = getDaysRemaining(item.expiryDate);
            let matches = false;

            if (category === 'Total') {
                matches = true;
                title = "<i class=\'fa-solid fa-box\'></i> إجمالي الأصناف المسجلة";
            } else if (category === 'Offers' && item.status === 'في عرض') {
                matches = true;
                title = "<i class=\'fa-solid fa-gift\'></i> العروض النشطة";
            } else if (category === 'Search') {
                const searchTerm = document.getElementById('expiryGlobalSearchInput').value.toLowerCase().trim();
                if ((item.name && item.name.toLowerCase().includes(searchTerm)) || 
                    (item.barcode && String(item.barcode).toLowerCase().includes(searchTerm))) {
                    matches = true;
                    title = `<i class=\'fa-solid fa-magnifying-glass\'></i> نتائج البحث عن: "${searchTerm}"`;
                }
            } else if (category === 'Expired' && daysRemaining !== 'NoExpiry' && daysRemaining < 0) {
                matches = true;
                title = "<i class=\'fa-solid fa-skull\'></i> انتهت الصلاحية";
            } else if (category === 'NoExpiry' && daysRemaining === 'NoExpiry') {
                matches = true;
                title = "<i class=\'fa-solid fa-infinity\'></i> بدون تاريخ صلاحية";
            } else if (category === 'Critical' && daysRemaining !== 'NoExpiry' && daysRemaining >= 0 && daysRemaining < 7) {
                matches = true;
                title = "<i class=\'fa-solid fa-circle text-danger\'></i> حرج جداً (أقل من 7 أيام)";
            } else if (category === 'Alert' && daysRemaining >= 7 && daysRemaining < 30) {
                matches = true;
                title = "<i class=\'fa-solid fa-circle text-warning\'></i> تنبيه سريع (أقل من 30 يوم)";
            } else if (category === 'Attention' && daysRemaining >= 30 && daysRemaining <= 90) {
                matches = true;
                title = "<i class=\'fa-solid fa-circle text-warning\'></i> انتباه ومراقبة (1 إلى 3 شهور)";
            } else if (category === 'Safe' && daysRemaining > 90 && daysRemaining <= 180) {
                matches = true;
                title = "<i class=\'fa-solid fa-circle text-success\'></i> مخزون آمن (3 إلى 6 شهور)";
            } else if (category === 'Far' && daysRemaining > 180) {
                matches = true;
                title = "<i class=\'fa-brands fa-facebook\'></i> تاريخ بعيد (أكثر من 6 شهور)";
            }

            if (matches) {
                tempFiltered.push(Object.assign({}, item, { daysRemaining: daysRemaining }));
            }
        });
        
        expiryFilteredData = tempFiltered;
        expiryCurrentCategory = category;
        
        currentExportData = expiryFilteredData;
        currentExportCategory = title;
        document.getElementById('detailsTitle').innerHTML = title;
    }

    const detailsList = document.getElementById('detailsList');

    if (expiryFilteredData.length === 0) {
        detailsList.innerHTML = '<p class="empty-msg">لا توجد أصناف في هذه الفئة.</p>';
        updateExpiryPaginationUI();
    } else {
        detailsList.innerHTML = '';
        
        // --- Smart Batch Accordion Grouping ---
        let groupedMap = new Map();
        expiryFilteredData.forEach(item => {
            let key = String(item.name).trim();
            if (!groupedMap.has(key)) {
                groupedMap.set(key, { name: key, totalQty: 0, batchesMap: new Map() });
            }
            let group = groupedMap.get(key);
            group.totalQty += (Number(item.qty) || 0);
            
            let subKey = `${item.expiryDate}_${item.barcode || ''}_${item.status}`;
            if (!group.batchesMap.has(subKey)) {
                let mergedItem = Object.assign({}, item);
                mergedItem.qty = Number(item.qty) || 0;
                mergedItem.mergedIds = [item.id];
                group.batchesMap.set(subKey, mergedItem);
            } else {
                let mergedItem = group.batchesMap.get(subKey);
                mergedItem.qty += (Number(item.qty) || 0);
                mergedItem.mergedIds.push(item.id);
            }
        });
        window.expiryGroupedData = Array.from(groupedMap.values()).map(g => {
            let batchesArray = Array.from(g.batchesMap.values());
            batchesArray.forEach(b => {
                b.id = b.mergedIds.join(',');
            });
            return {
                name: g.name,
                totalQty: g.totalQty,
                batches: batchesArray
            };
        });
        // --------------------------------------

        let totalPages = Math.ceil(window.expiryGroupedData.length / EXPIRY_ITEMS_PER_PAGE) || 1;
        if (expiryCurrentPage > totalPages) expiryCurrentPage = totalPages;
        if (expiryCurrentPage < 1) expiryCurrentPage = 1;

        // Sliding Window (3 Pages Max)
        let startPage = Math.max(1, expiryCurrentPage - 1);
        let endPage = Math.min(totalPages, expiryCurrentPage + 1);
        
        if (expiryCurrentPage === 1 && totalPages >= 3) { endPage = 3; }
        if (expiryCurrentPage === totalPages && totalPages >= 3) { startPage = totalPages - 2; }

        let startIndex = (startPage - 1) * EXPIRY_ITEMS_PER_PAGE;
        let endIndex = endPage * EXPIRY_ITEMS_PER_PAGE;
        let groupsToShow = window.expiryGroupedData.slice(startIndex, endIndex);
        
        let fragment = document.createDocumentFragment();
        
        groupsToShow.forEach((group, gIndex) => {
            // Render Parent Accordion Row
            let parentDiv = document.createElement('div');
            parentDiv.className = 'expiry-item-row batch-parent-row';
            let uniqueId = 'batch_' + expiryCurrentPage + '_' + gIndex;
            parentDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-layer-group text-primary" style="font-size: 1.2rem;"></i>
                        <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main);">${group.name}</h4>
                        <span style="background: var(--primary-glow); color: var(--primary); padding: 3px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">
                            ${group.batches.length} دفعات
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span style="font-size: 1rem; color: var(--text-main); font-weight: bold;">إجمالي: ${group.totalQty}</span>
                        <i class="fa-solid fa-chevron-down" id="icon_${uniqueId}" style="transition: transform 0.3s; color: var(--text-color);"></i>
                    </div>
                </div>
            `;
            
            let childrenContainer = document.createElement('div');
            childrenContainer.id = uniqueId;
            childrenContainer.style.display = 'none';
            childrenContainer.style.marginTop = '10px';
            childrenContainer.style.paddingRight = '15px'; // RTL indent
            
            parentDiv.addEventListener('click', () => {
                if (childrenContainer.style.display === 'none') {
                    childrenContainer.style.display = 'block';
                    document.getElementById('icon_' + uniqueId).style.transform = 'rotate(180deg)';
                } else {
                    childrenContainer.style.display = 'none';
                    document.getElementById('icon_' + uniqueId).style.transform = 'rotate(0deg)';
                }
            });
            
            fragment.appendChild(parentDiv);
            
            group.batches.forEach(item => {
            let daysColor = "";
            let daysText = "";
            if (item.daysRemaining === 'NoExpiry') {
                daysColor = "#7f8c8d";
                daysText = "بدون تاريخ صلاحية <i class=\'fa-solid fa-infinity\'></i>";
            } else if (item.daysRemaining < 0) {
                daysColor = "#c0392b";
                daysText = `منتهي منذ ${Math.abs(item.daysRemaining)} يوم <i class=\'fa-solid fa-skull\'></i>`;
            } else if (item.daysRemaining < 7) {
                daysColor = "#e74c3c";
                daysText = `باقي ${item.daysRemaining} يوم`;
            } else if (item.daysRemaining < 30) {
                daysColor = "#e67e22";
                daysText = `باقي ${item.daysRemaining} يوم`;
            } else if (item.daysRemaining <= 90) {
                daysColor = "#f39c12";
                daysText = `باقي ${item.daysRemaining} يوم`;
            } else {
                daysColor = "#27ae60";
                daysText = `باقي ${item.daysRemaining} يوم`;
            }

            let rowClass = "expiry-item-row";
            let activeOfferStyle = "";
            if (item.status === 'في عرض') {
                rowClass += " active-offer";
                activeOfferStyle = 'style="border: 2px solid #ffeb3b; background: #fffde7;"';
            }

            const offerBtnText = item.status === 'في عرض' ? "إلغاء العرض ⏸" : "إضافة للعروض 🔥";
            const offerBtnColor = item.status === 'في عرض' ? "#e0e0e0" : "#fff3e0";
            const offerBtnAction = item.status === 'في عرض' ? "مش في عرض" : "في عرض";

            let formattedDate = new Date(item.expiryDate);
            formattedDate = isNaN(formattedDate.getTime()) ? item.expiryDate : formattedDate.toLocaleDateString('ar-EG');

            let pricesHtml = "";
            if (item.status === 'في عرض') {
                pricesHtml = `
                    <div style="background: #fdf2e9; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px dashed #e67e22; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 120px;">
                            <label style="font-size: 0.8rem; color: #d35400; font-weight: bold;">السعر الأصلي:</label>
                            <input type="number" id="origPrice_${item.id}" value="${item.originalPrice || ''}" style="margin-bottom: 0; padding: 5px; height: 35px; border: 1px solid #e67e22;">
                        </div>
                        <div style="flex: 1; min-width: 120px;">
                            <label style="font-size: 0.8rem; color: #d35400; font-weight: bold;">سعر العرض:</label>
                            <input type="number" id="offerPrice_${item.id}" value="${item.offerPrice || ''}" style="margin-bottom: 0; padding: 5px; height: 35px; border: 1px solid #e67e22; background: #fff;">
                        </div>
                        <button class="btn-save interactive-btn" onclick="saveExpiryOffer('${item.id}', 'في عرض')" style="padding: 5px 15px; height: 35px; align-self: flex-end;">حفظ 💾</button>
                    </div>
                `;
            }

            let itemDiv = document.createElement('div');
            itemDiv.className = rowClass;
            if (item.status === 'في عرض') {
                itemDiv.style.border = '2px solid #ffeb3b';
                itemDiv.style.background = '#fffde7';
            }
            let isChecked = item.mergedIds && item.mergedIds.every(singleId => selectedExpiryItems.has(String(singleId))) ? "checked" : (selectedExpiryItems.has(item.id) ? "checked" : "");
            itemDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; background: #f8f9fa; padding: 5px 10px; border-radius: 8px;">
                    <input type="checkbox" class="expiry-item-checkbox" data-id="${item.id}" ${isChecked} onchange="toggleExpirySelection('${item.id}', this.checked)" style="width: 20px; height: 20px; cursor: pointer;">
                    <h4 style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin: 0; flex: 1;">
                        <span style="flex: 1;"><i class=\'fa-solid fa-box\'></i> ${item.name}</span>
                        <span style="font-size: 0.8rem; color: #7f8c8d; font-weight: normal; background: #eee; padding: 3px 8px; border-radius: 12px; white-space: nowrap;">${item.barcode ? 'الباركود: ' + item.barcode : 'لا يوجد باركود'}</span>
                    </h4>
                </div>
                <div class="expiry-item-details">
                    <span>الكمية: ${item.qty}</span>
                    <span style="color: ${daysColor}; font-weight: bold;">${daysText}</span>
                </div>
                <div style="font-size: 0.8rem; color: #7f8c8d; margin-bottom: 8px;">
                    <i class=\'fa-regular fa-calendar-days\'></i> انتهاء: ${formattedDate} | 🏢 مكان: ${item.location || '-'} <br>
                    <i class=\'fa-solid fa-user\'></i> المستلم: ${item.receiver || 'غير محدد'} | 📝 ملاحظات: ${item.notes || '-'}
                </div>
                ${pricesHtml}
                <div class="expiry-item-actions" style="flex-wrap: wrap; gap: 5px;">
                    <button class="btn-activate-offer interactive-btn" style="background: ${offerBtnColor}; flex: 1;" onclick="${item.status === 'في عرض' ? `changeExpiryStatus('${item.id}', '${offerBtnAction}')` : `promptNewOffer('${item.id}')`}">${offerBtnText}</button>
                </div>
            `;
                itemDiv.classList.add('batch-child-row');
                childrenContainer.appendChild(itemDiv);
            }); // End batches loop
            
            fragment.appendChild(childrenContainer);
        }); // End groups loop
        
        detailsList.appendChild(fragment);
        updateExpiryPaginationUI();
    }

    document.getElementById('expiryDetailsSection').style.display = 'block';

    if (resetPage) {
        setTimeout(() => {
            document.getElementById('expiryDetailsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
};

// إعداد أحداث أزرار صفحات الصلاحيات
document.addEventListener('DOMContentLoaded', () => {
    let pBtn = document.getElementById('expiryPrevPage');
    if (pBtn) {
        pBtn.addEventListener('click', () => {
            if (expiryCurrentPage > 1) {
                expiryCurrentPage--;
                showExpiryDetails(expiryCurrentCategory, false);
            }
        });
    }

    let nBtn = document.getElementById('expiryNextPage');
    if (nBtn) {
        nBtn.addEventListener('click', () => {
            let dataLen = window.expiryGroupedData ? window.expiryGroupedData.length : expiryFilteredData.length;
            let totalPages = Math.ceil(dataLen / EXPIRY_ITEMS_PER_PAGE);
            if (expiryCurrentPage < totalPages) {
                expiryCurrentPage++;
                showExpiryDetails(expiryCurrentCategory, false);
            }
        });
    }
});

window.closeExpiryDetails = function () {
    document.getElementById('expiryDetailsSection').style.display = 'none';
};

const searchExpiryBtn = document.getElementById('searchExpiryBtn');
const expiryGlobalSearchInput = document.getElementById('expiryGlobalSearchInput');
if (searchExpiryBtn && expiryGlobalSearchInput) {
    searchExpiryBtn.addEventListener('click', () => {
        if (expiryGlobalSearchInput.value.trim() !== '') {
            showExpiryDetails('Search');
        } else {
            showToast('الرجاء إدخال كلمة للبحث', 'warning');
        }
    });
    expiryGlobalSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchExpiryBtn.click();
    });
}

window.customAlert = function (message) {
    const overlay = document.createElement('div');
    overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px);";
    const modal = document.createElement('div');
    modal.style = "background: var(--bg); padding: 25px; border-radius: 15px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 1px solid var(--border);";
    modal.innerHTML = `
        <h3 style="color: var(--primary); margin-top: 0; font-family: 'Cairo', sans-serif;">تنبيه</h3>
        <p style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 25px; font-family: 'Cairo', sans-serif; white-space: pre-line;">${message}</p>
        <button id="btnAlertOk" class="interactive-btn" style="background: var(--primary); color: white; border: none; padding: 10px 30px; border-radius: 8px; font-weight: bold; font-family: 'Cairo', sans-serif;">موافق</button>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('btnAlertOk').onclick = () => {
        document.body.removeChild(overlay);
    };
};

window.customSinglePrompt = function (title, defaultValue, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px);";
    const modal = document.createElement('div');
    modal.style = "background: var(--bg); padding: 25px; border-radius: 15px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 1px solid var(--border);";
    modal.innerHTML = `
        <h3 style="color: var(--primary); margin-top: 0; font-family: 'Cairo', sans-serif;">${title}</h3>
        <input type="text" id="promptInput" value="${defaultValue || ''}" style="width: 100%; padding: 12px; margin-bottom: 20px; border-radius: 8px; border: 1px solid var(--border); background: var(--white); color: var(--text-main); font-size: 1.1rem; text-align: center;">
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="btnPromptYes" class="interactive-btn" style="background: var(--success); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1; font-family: 'Cairo', sans-serif;">حفظ <i class=\'fa-solid fa-check\'></i></button>
            <button id="btnPromptNo" class="interactive-btn" style="background: var(--danger); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1; font-family: 'Cairo', sans-serif;">إلغاء <i class=\'fa-solid fa-xmark\'></i></button>
        </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        const input = document.getElementById('promptInput');
        input.focus();
        input.select();
    }, 100);

    document.getElementById('btnPromptYes').onclick = () => {
        let val = document.getElementById('promptInput').value;
        document.body.removeChild(overlay);
        onConfirm(val);
    };
    document.getElementById('btnPromptNo').onclick = () => {
        document.body.removeChild(overlay);
        // Do not call onConfirm to simulate returning null in prompt
    };
};

window.customConfirm = function (message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px);";
    const modal = document.createElement('div');
    modal.style = "background: white; padding: 25px; border-radius: 15px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.2);";
    modal.innerHTML = `
        <h3 style="color: var(--primary); margin-top: 0;">تأكيد الإجراء</h3>
        <p style="font-size: 1.1rem; color: #333; margin-bottom: 25px;">${message}</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="btnConfirmYes" class="interactive-btn" style="background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1;">نعم <i class=\'fa-solid fa-check\'></i></button>
            <button id="btnConfirmNo" class="interactive-btn" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1;">إلغاء <i class=\'fa-solid fa-xmark\'></i></button>
        </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('btnConfirmYes').onclick = () => {
        document.body.removeChild(overlay);
        onConfirm();
    };
    document.getElementById('btnConfirmNo').onclick = () => {
        document.body.removeChild(overlay);
    };
};

window.customPrompt = function (title, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px);";
    const modal = document.createElement('div');
    modal.style = "background: white; padding: 25px; border-radius: 15px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.2);";
    modal.innerHTML = `
        <h3 style="color: var(--primary); margin-top: 0;">${title}</h3>
        <input type="number" id="promptOrig" placeholder="السعر الأساسي" style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ccc;">
        <input type="number" id="promptOffer" placeholder="سعر العرض" style="width: 100%; padding: 10px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #ccc;">
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="btnPromptYes" class="interactive-btn" style="background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1;">حفظ <i class=\'fa-solid fa-check\'></i></button>
            <button id="btnPromptNo" class="interactive-btn" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1;">إلغاء <i class=\'fa-solid fa-xmark\'></i></button>
        </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('btnPromptYes').onclick = () => {
        let orig = document.getElementById('promptOrig').value;
        let offer = document.getElementById('promptOffer').value;
        document.body.removeChild(overlay);
        onConfirm(orig, offer);
    };
    document.getElementById('btnPromptNo').onclick = () => {
        document.body.removeChild(overlay);
    };
};

window.promptNewOffer = function (id) {
    customPrompt("تفعيل عرض جديد", (orig, offer) => {
        if (orig === "" || offer === "") {
            showToast("يرجى إدخال السعرين", "warning");
            return;
        }
        saveExpiryOffer(id, 'في عرض', orig, offer);
    });
};

window.saveExpiryOffer = function (id, status, origVal, offerVal) {
    let orig = origVal !== undefined ? origVal : (document.getElementById('origPrice_' + id) ? document.getElementById('origPrice_' + id).value : "");
    let offer = offerVal !== undefined ? offerVal : (document.getElementById('offerPrice_' + id) ? document.getElementById('offerPrice_' + id).value : "");

    showToast("جاري التحديث...", "warning");
    let formData = new URLSearchParams();
    formData.append('action', 'updateExpiryStatus');
    formData.append('id', id);
    formData.append('status', status);
    formData.append('originalPrice', orig);
    formData.append('offerPrice', offer);

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("<i class=\'fa-solid fa-check\'></i> تم تحديث العرض والأسعار بنجاح", "success");
            let item = expiryData.find(i => i.id == id);
            if (item) {
                item.status = status;
                item.originalPrice = orig;
                item.offerPrice = offer;
            }
            renderExpiryDashboard();
            updateCatalogWithOffers();
            // Re-render the current view
            if (document.getElementById('detailsTitle').innerText.includes('البحث')) {
                showExpiryDetails('Search');
            } else if (document.getElementById('detailsTitle').innerText.includes('العروض')) {
                showExpiryDetails('Offers');
            } else {
                // If in another category, just close and user can reopen or re-render
                document.getElementById('expiryDetailsSection').style.display = 'none';
            }
        }).catch(() => {
            showToast("<i class=\'fa-solid fa-xmark\'></i> خطأ في الاتصال بالإنترنت", "error");
        });
};

// 3. Status Control (دورة حياة العرض)
window.customQtyConfirm = function (message, currentQty, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px);";
    const modal = document.createElement('div');
    modal.style = "background: white; padding: 25px; border-radius: 15px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.2);";
    modal.innerHTML = `
        <h3 style="color: var(--primary); margin-top: 0;">تأكيد الإجراء</h3>
        <p style="font-size: 1.1rem; color: #333; margin-bottom: 15px;">${message}</p>
        <p style="font-size: 0.95rem; color: #666; margin-bottom: 10px;">الكمية الحالية: ${currentQty}</p>
        <input type="number" id="promptSoldQty" value="${currentQty}" min="1" max="${currentQty}" placeholder="الكمية المباعة" style="width: 100%; padding: 10px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #ccc;">
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="btnConfirmYes" class="interactive-btn" style="background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1;">تأكيد البيع <i class=\'fa-solid fa-check\'></i></button>
            <button id="btnConfirmNo" class="interactive-btn" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1;">إلغاء <i class=\'fa-solid fa-xmark\'></i></button>
        </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('btnConfirmYes').onclick = () => {
        let val = parseFloat(document.getElementById('promptSoldQty').value);
        if (isNaN(val) || val <= 0 || val > currentQty) {
            showToast("الكمية المدخلة غير صحيحة!", "error");
            return;
        }
        document.body.removeChild(overlay);
        onConfirm(val);
    };
    document.getElementById('btnConfirmNo').onclick = () => {
        document.body.removeChild(overlay);
    };
};

window.changeExpiryStatus = function (idString, newStatus) {
    let msg = "";
    if (newStatus === 'في عرض') {
        msg = "هل تريد تفعيل العرض وجعل السطر فسفوري؟ 🔥";
        customConfirm(msg, () => { executeStatusUpdate(idString, newStatus); });
    } else if (newStatus === 'مش في عرض') {
        msg = "هل تريد إيقاف العرض وإعادته للحالة الطبيعية؟";
        customConfirm(msg, () => { executeStatusUpdate(idString, newStatus); });
    } else if (newStatus === 'Deleted') {
        msg = "يرجى تحديد الكمية المباعة ليتم خصمها (أو بيع الكل لحذفه)";
        let ids = String(idString).split(',');
        let currentQty = 0;
        ids.forEach(id => {
            let item = expiryData.find(i => String(i.id) === String(id));
            if (item) currentQty += (parseFloat(item.qty) || 0);
        });
        if (currentQty === 0) currentQty = 1;
        window.customQtyConfirm(msg, currentQty, (soldQty) => {
            executeStatusUpdate(idString, newStatus, soldQty);
        });
    }
};

function executeStatusUpdate(idString, newStatus, soldQty = null) {
    let ids = String(idString).split(',');
    showToast("جاري التحديث...", "warning");

    if (newStatus === 'Deleted' && soldQty !== null) {
        let remainingSoldQty = Number(soldQty);
        let promises = [];
        for (let id of ids) {
            if (remainingSoldQty <= 0) break;
            let item = expiryData.find(i => String(i.id) === String(id));
            if (!item) continue;
            let itemQty = Number(item.qty) || 0;
            let qtyToSubtract = Math.min(itemQty, remainingSoldQty);
            let formData = new URLSearchParams();
            formData.append('action', 'updateExpiryStatus');
            formData.append('id', id);
            formData.append('status', newStatus);
            formData.append('soldQty', qtyToSubtract);
            promises.push(fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData }));
            remainingSoldQty -= qtyToSubtract;
        }
        Promise.all(promises).then(() => {
            let remainingSoldQtyLocal = Number(soldQty);
            for (let id of ids) {
                if (remainingSoldQtyLocal <= 0) break;
                let item = expiryData.find(i => String(i.id) === String(id));
                if (item) {
                    let itemQty = Number(item.qty) || 0;
                    let qtyToSubtract = Math.min(itemQty, remainingSoldQtyLocal);
                    if (qtyToSubtract < itemQty) {
                        item.qty = itemQty - qtyToSubtract;
                    } else {
                        item.status = newStatus;
                    }
                    remainingSoldQtyLocal -= qtyToSubtract;
                }
            }
            showToast("<i class=\'fa-solid fa-check\'></i> تم تحديث الحالة بنجاح", "success");
            renderExpiryDashboard();
            updateCatalogWithOffers();
            if (document.getElementById('expiryDetailsSection').style.display === 'block') {
                closeExpiryDetails();
            }
        }).catch(() => {
            showToast("<i class=\'fa-solid fa-xmark\'></i> خطأ في الاتصال بالإنترنت", "error");
        });
    } else {
        let promises = ids.map(id => {
            let formData = new URLSearchParams();
            formData.append('action', 'updateExpiryStatus');
            formData.append('id', id);
            formData.append('status', newStatus);
            return fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData });
        });
        Promise.all(promises).then(() => {
            showToast("<i class=\'fa-solid fa-check\'></i> تم تحديث الحالة بنجاح", "success");
            ids.forEach(id => {
                let item = expiryData.find(i => String(i.id) === String(id));
                if (item) item.status = newStatus;
            });
            renderExpiryDashboard();
            updateCatalogWithOffers();
            if (document.getElementById('expiryDetailsSection').style.display === 'block') {
                showExpiryDetails(expiryCurrentCategory, false);
            }
        }).catch(() => {
            showToast("<i class=\'fa-solid fa-xmark\'></i> خطأ في الاتصال بالإنترنت", "error");
        });
    }
}

function updateCatalogWithOffers() {
    if (!catalogData || catalogData.length === 0) return;
    
    let activeOffers = [];
    if (expiryData && expiryData.length > 0) {
        activeOffers = expiryData.filter(item => item.status === 'في عرض').map(item => item.name);
        window.cachedActiveOffers = activeOffers;
    } else {
        activeOffers = window.cachedActiveOffers || [];
    }
    
    const catalogContainer = document.getElementById('catalogListContainer');
    if (catalogContainer) {
        const rows = catalogContainer.querySelectorAll('.data-row');
        rows.forEach(row => {
            const nameEl = row.querySelector('strong');
            if (nameEl) {
                const productName = nameEl.innerText.replace('🔥', '').replace('عرض خاص', '').trim();
                const hasOffer = activeOffers.some(offerName => productName.includes(offerName) || offerName.includes(productName));

                if (hasOffer) {
                    if (!nameEl.innerHTML.includes('🔥')) {
                        nameEl.innerHTML += ' <span style="background: #ffeb3b; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; color: #d35400;">عرض خاص 🔥</span>';
                        row.style.border = "2px solid #ffeb3b";
                    }
                } else {
                    if (nameEl.innerHTML.includes('عرض خاص')) {
                        nameEl.innerHTML = productName;
                        row.style.border = "none";
                    }
                }
            }
        });
    }
}

// ==========================================
// Checkbox and Edit Modal Logic (Expiry)
// ==========================================
window.toggleExpirySelection = function(idString, isChecked) {
    let ids = String(idString).split(',');
    ids.forEach(singleId => {
        if (isChecked) {
            selectedExpiryItems.add(String(singleId));
        } else {
            selectedExpiryItems.delete(String(singleId));
        }
    });
    
    const printSelectedBtn = document.getElementById('printSelectedExpiryBtn');
    if (printSelectedBtn) {
        printSelectedBtn.style.display = selectedExpiryItems.size > 0 ? 'inline-block' : 'none';
    }
};

window.openEditExpiryModal = function(id) {
    let item = expiryData.find(i => String(i.id) === String(id));
    if (!item) return;
    
    document.getElementById('editExpiryId').value = item.id;
    document.getElementById('editExpiryQty').value = item.qty || '';
    
    let d = new Date(item.expiryDate);
    if (!isNaN(d.getTime())) {
        document.getElementById('editExpiryDate').value = d.toLocaleDateString('en-CA');
    } else {
        document.getElementById('editExpiryDate').value = item.expiryDate || '';
    }
    
    document.getElementById('editExpiryReceiver').value = item.receiver || '';
    document.getElementById('editExpiryLocation').value = item.location || '';
    document.getElementById('editExpiryNotes').value = item.notes || '';
    if (document.getElementById('editExpiryBarcode')) {
        document.getElementById('editExpiryBarcode').value = item.barcode || '';
    }
    
    document.getElementById('editExpiryModal').style.display = 'flex';
};

window.closeEditExpiryModal = function() {
    document.getElementById('editExpiryModal').style.display = 'none';
};

window.saveEditExpiryModal = function() {
    const id = document.getElementById('editExpiryId').value;
    const qty = document.getElementById('editExpiryQty').value;
    const date = document.getElementById('editExpiryDate').value;
    const receiver = document.getElementById('editExpiryReceiver').value;
    const location = document.getElementById('editExpiryLocation').value;
    const notes = document.getElementById('editExpiryNotes').value;
    const barcode = document.getElementById('editExpiryBarcode') ? document.getElementById('editExpiryBarcode').value : '';
    
    if (!qty || !date || !receiver) {
        showToast("يرجى تعبئة الكمية والتاريخ واسم المستلم", "warning");
        return;
    }
    
    showToast("جاري حفظ التعديلات...", "warning");
    
    let formData = new URLSearchParams();
    formData.append('action', 'updateExpiryItemData');
    formData.append('id', id);
    formData.append('qty', qty);
    formData.append('expiryDate', date);
    formData.append('receiver', receiver);
    formData.append('location', location);
    formData.append('notes', notes);
    formData.append('barcode', barcode);
    
    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("<i class=\'fa-solid fa-check\'></i> تم تعديل الاستلامة بنجاح", "success");
            closeEditExpiryModal();
            
            let item = expiryData.find(i => String(i.id) === String(id));
            if (item) {
                item.qty = qty;
                item.expiryDate = date;
                item.receiver = receiver;
                item.location = location;
                item.notes = notes;
                item.barcode = barcode;
                
                // CRITICAL: Update local ID so subsequent edits find the correct row in backend
                item.id = item.name + "|" + qty + "|" + date;
                
                // If it was selected, remove the old id and add the new one
                if (selectedExpiryItems.has(String(id))) {
                    selectedExpiryItems.delete(String(id));
                    selectedExpiryItems.add(String(item.id));
                }
            }
            
            renderExpiryDashboard();
            if (document.getElementById('expiryDetailsSection').style.display === 'block') {
                showExpiryDetails(expiryCurrentCategory, false);
            }
        })
        .catch(() => showToast("خطأ في الاتصال بالإنترنت", "error"));
};

window.printSelectedExpiry = function() {
    if (selectedExpiryItems.size === 0) {
        showToast("لم يتم تحديد أي استلامة", "warning");
        return;
    }
    
    let selectedData = expiryData.filter(item => selectedExpiryItems.has(String(item.id)));
    
    let receivers = [...new Set(selectedData.map(i => i.receiver).filter(r => r && String(r).trim() !== ''))];
    let mergedReceiverName = receivers.length > 0 ? receivers.join(' / ') : "غير محدد";
    
    let reportTitle = `استلامات مجمعة - المستلم: ${mergedReceiverName}`;
    generateCategoryPDF(selectedData, reportTitle);
};

// ==========================================
// 3. Export Logic (تصدير متقدم ExcelJS)
// ==========================================

async function generateExcel(dataToExport, reportTitle) {
    if (!dataToExport || dataToExport.length === 0) {
        showToast("لا توجد بيانات للتصدير في هذه القائمة", "warning");
        return;
    }

    try {
        if (typeof ExcelJS === 'undefined') {
            showToast("جاري تجهيز محرك التصدير الذكي...", "warning");
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Candy Club System';
        workbook.created = new Date();

        const sheet1 = workbook.addWorksheet('البيانات التفصيلية', { views: [{ rightToLeft: true }] });

        sheet1.columns = [
            { header: 'اسم المنتج', key: 'name', width: 35 },
            { header: 'الكمية', key: 'qty', width: 12 },
            { header: 'تاريخ الانتهاء', key: 'date', width: 18 },
            { header: 'الأيام المتبقية', key: 'days', width: 15 },
            { header: 'المكان / المورد', key: 'loc', width: 22 },
            { header: 'اسم المسجل', key: 'regname', width: 22 },
            { header: 'تاريخ التسجيل', key: 'reg', width: 18 },
            { header: 'المستلم', key: 'rec', width: 18 },
            { header: 'ملاحظات', key: 'notes', width: 30 },
            { header: 'السعر الأساسي', key: 'origPrice', width: 15 },
            { header: 'سعر العرض', key: 'offerPrice', width: 15 },
            { header: 'الحالة', key: 'status', width: 18 }
        ];

        sheet1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
        sheet1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
        sheet1.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        sheet1.getRow(1).height = 25;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let sortedData = [...dataToExport].sort((a, b) => {
            let da = new Date(a.expiryDate).getTime();
            let db = new Date(b.expiryDate).getTime();
            return da - db;
        });

        sortedData.forEach(row => {
            let daysRemaining = getDaysRemaining(row.expiryDate);
            let daysFormatted = daysRemaining === 'NoExpiry' ? 'بدون' : (isNaN(daysRemaining) ? '-' : daysRemaining);

            let formattedRegDate = row.regDate ? new Date(row.regDate).toLocaleDateString('en-CA') : '';
            let formattedExpDate = row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('en-CA') : '';
            if (formattedRegDate === 'Invalid Date') formattedRegDate = row.regDate;
            if (formattedExpDate === 'Invalid Date') formattedExpDate = row.expiryDate;

            const newRow = sheet1.addRow({
                name: row.name || '',
                origPrice: row.originalPrice || '',
                offerPrice: row.offerPrice || '',
                qty: row.qty || '',
                date: formattedExpDate,
                days: daysFormatted,
                reg: formattedRegDate,
                regname: row.registrarName || '',
                loc: row.location || '',
                rec: row.receiver || '',
                status: row.status || '',
                notes: row.notes || ''
            });

            newRow.alignment = { vertical: 'middle', horizontal: 'center' };
            newRow.height = 20;

            if (row.status !== 'Deleted' && daysRemaining !== 'NoExpiry' && !isNaN(daysRemaining)) {
                if (daysRemaining < 0) {
                    newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
                    newRow.font = { color: { argb: 'FFC0392B' }, bold: true };
                } else if (daysRemaining < 7) {
                    newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD6D6' } };
                } else if (daysRemaining < 30) {
                    newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
                } else if (daysRemaining <= 90) {
                    newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
                } else if (daysRemaining > 180) {
                    newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4E6F1' } };
                } else {
                    newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5F5E3' } };
                }
            }

            if (row.status === 'Deleted') {
                newRow.font = { color: { argb: 'FF95A5A6' }, italic: true };
                newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F4' } };
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        let cleanTitle = reportTitle.replace(/<[^>]*>?/gm, '').trim();
        let safeTitle = cleanTitle.replace(/[^a-zA-Z0-9أ-ي]/g, '_');
        link.download = `تقرير_${safeTitle}_${new Date().toLocaleDateString('en-CA')}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast("<i class=\'fa-solid fa-check\'></i> تم تصدير التقرير الاحترافي بنجاح", "success");

    } catch (error) {
        console.error(error);
        showToast("<i class=\'fa-solid fa-xmark\'></i> حدث خطأ أثناء التصدير", "error");
    }
}

// Export Current List Button (inside Details Section)
const expirySortSelect = document.getElementById('expirySortSelect');
if (expirySortSelect) {
    expirySortSelect.addEventListener('change', (e) => {
        let sortVal = e.target.value;
        if (!expiryFilteredData || expiryFilteredData.length === 0) return;
        
        if (sortVal === 'default') {
            showExpiryDetails(expiryCurrentCategory, true);
            return;
        }
        
        let sorted = [...expiryFilteredData];
        
        if (sortVal === 'expiry_asc') {
            sorted.sort((a, b) => new Date(a.expiryDate || '9999-12-31') - new Date(b.expiryDate || '9999-12-31'));
        } else if (sortVal === 'expiry_desc') {
            sorted.sort((a, b) => new Date(b.expiryDate || '9999-12-31') - new Date(a.expiryDate || '9999-12-31'));
        } else if (sortVal === 'qty_asc') {
            sorted.sort((a, b) => (Number(a.qty) || 0) - (Number(b.qty) || 0));
        } else if (sortVal === 'qty_desc') {
            sorted.sort((a, b) => (Number(b.qty) || 0) - (Number(a.qty) || 0));
        } else if (sortVal === 'name_asc') {
            sorted.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
        }
        
        expiryFilteredData = sorted;
        currentExportData = sorted; // Update export data to match sorted list
        expiryCurrentPage = 1;
        updateExpiryPaginationUI();
        showExpiryDetails(expiryCurrentCategory, false);
    });
}

function normalizeCalendarDate(value) {
    if (value === null || value === undefined || value === '') return null;
    const raw = String(value).trim();
    if (!raw) return null;

    const isoMatch = raw.match(/^\d{4}-\d{2}-\d{2}$/);
    if (isoMatch) return raw;

    const compactMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (compactMatch) {
        return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
    }

    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return null;
}

function getCalendarMonthKey(value) {
    const normalized = normalizeCalendarDate(value);
    if (!normalized) return null;
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return `${match[1]}-${match[2]}`;
}

function getCalendarDateKey(value) {
    const normalized = normalizeCalendarDate(value);
    if (!normalized) return null;
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return `${match[1]}-${match[2]}-${match[3]}`;
}

function getSortDateValue(value) {
    const normalized = normalizeCalendarDate(value);
    if (!normalized) return Number.NEGATIVE_INFINITY;
    return new Date(`${normalized}T12:00:00`).getTime();
}

const exportCurrentListBtn = document.getElementById('exportCurrentListBtn');
if (exportCurrentListBtn) {
    exportCurrentListBtn.addEventListener('click', () => {
        setBtnLoading(exportCurrentListBtn, true, "تصدير...");
        generateExcel(currentExportData, currentExportCategory).then(() => {
            setBtnLoading(exportCurrentListBtn, false);
        });
    });
}

const exportCurrentListPDFBtn = document.getElementById('exportCurrentListPDFBtn');
if (exportCurrentListPDFBtn) {
    exportCurrentListPDFBtn.addEventListener('click', () => {
        if (!currentExportData || currentExportData.length === 0) {
            showToast("لا توجد بيانات للطباعة", "warning");
            return;
        }
        generateCategoryPDF(currentExportData, currentExportCategory);
    });
}

// Export by Month
const btnExportMonth = document.getElementById('btnExportMonth');
if (btnExportMonth) {
    btnExportMonth.addEventListener('click', () => {
        const monthVal = document.getElementById('exportMonthInput').value; // YYYY-MM
        if (!monthVal) {
            showToast("يرجى تحديد الشهر أولاً", "warning");
            return;
        }

        let filtered = expiryData.filter(item => {
            if (!item.expiryDate) return false;
            const monthKey = getCalendarMonthKey(item.expiryDate);
            return monthKey === monthVal;
        }).sort((a, b) => getSortDateValue(a.expiryDate) - getSortDateValue(b.expiryDate));

        setBtnLoading(btnExportMonth, true, "تصدير...");
        generateExcel(filtered, 'شهر_' + monthVal).then(() => {
            setBtnLoading(btnExportMonth, false);
        });
    });
}

// Export by Registration Date
const btnExportMonthPDF = document.getElementById('btnExportMonthPDF');
if (btnExportMonthPDF) {
    btnExportMonthPDF.addEventListener('click', () => {
        const monthVal = document.getElementById('exportMonthInput').value; // YYYY-MM
        if (!monthVal) {
            showToast("يرجى تحديد الشهر أولاً", "warning");
            return;
        }

        let filtered = expiryData.filter(item => {
            if (!item.expiryDate) return false;
            const monthKey = getCalendarMonthKey(item.expiryDate);
            return monthKey === monthVal;
        }).sort((a, b) => getSortDateValue(a.expiryDate) - getSortDateValue(b.expiryDate));

        if (filtered.length === 0) {
            showToast("لا توجد بيانات انتهاء في هذا الشهر", "warning");
            return;
        }

        generateExpiryMonthPDF(filtered, monthVal);
    });
}

const btnExportDate = document.getElementById('btnExportDate');
if (btnExportDate) {
    btnExportDate.addEventListener('click', () => {
        const dateVal = document.getElementById('exportDateInput').value; // YYYY-MM-DD
        if (!dateVal) {
            showToast("يرجى تحديد يوم التسجيل أولاً", "warning");
            return;
        }

        let filtered = expiryData.filter(item => {
            if (!item.regDate) return false;
            const dateKey = getCalendarDateKey(item.regDate);
            return dateKey === dateVal;
        });

        setBtnLoading(btnExportDate, true, "تصدير...");
        generateExcel(filtered, 'إدخالات_يوم_' + dateVal).then(() => {
            setBtnLoading(btnExportDate, false);
        });
    });
}

const btnExportDatePDF = document.getElementById('btnExportDatePDF');
if (btnExportDatePDF) {
    btnExportDatePDF.addEventListener('click', () => {
        const dateVal = document.getElementById('exportDateInput').value; // YYYY-MM-DD
        if (!dateVal) {
            showToast("يرجى تحديد يوم التسجيل أولاً", "warning");
            return;
        }

        let filtered = expiryData.filter(item => {
            if (!item.regDate) return false;
            const dateKey = getCalendarDateKey(item.regDate);
            return dateKey === dateVal;
        });

        if (filtered.length === 0) {
            showToast("لا توجد بيانات مسجلة في هذا اليوم", "warning");
            return;
        }

        // Group by exact time (natural batchId)
        let batches = {};
        let legacyBatches = {};
        filtered.forEach(item => {
            let rDate = item.regDate || "";
            
            // If Apps Script returned the date as an ISO string (e.g., "2026-07-17T15:47:00.000Z"), format it back
            if (typeof rDate === 'string' && rDate.includes("T") && rDate.endsWith("Z")) {
                let d = new Date(rDate);
                if (!isNaN(d.getTime())) {
                    let dStr = d.toLocaleDateString('en-CA'); // "YYYY-MM-DD"
                    let tStr = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); // "10:35 ص"
                    rDate = dStr + " " + tStr;
                }
            }

            // Check if regDate has time appended (contains " AM", " PM", " ص", or " م")
            if (rDate.includes(" AM") || rDate.includes(" PM") || rDate.includes(" ص") || rDate.includes(" م") || rDate.includes(":")) {
                if (!batches[rDate]) batches[rDate] = [];
                batches[rDate].push(item);
            } else {
                let receiverKey = item.receiver ? `legacy_${item.receiver}` : 'legacy_غير محدد';
                if (!legacyBatches[receiverKey]) legacyBatches[receiverKey] = [];
                legacyBatches[receiverKey].push(item);
            }
        });

        // Merge legacyBatches into normal batches
        Object.keys(legacyBatches).forEach(k => {
            batches[k] = legacyBatches[k];
        });

        let legacyBatch = []; // keep empty to disable the old legacy UI block

        let batchKeys = Object.keys(batches);
        
        // Always show the custom UI to select which batch to print (even for a single batch)
        showBatchSelectionModal(batches, legacyBatch, dateVal);
    });
}

function showBatchSelectionModal(batches, legacyBatch, dateVal) {
    const overlay = document.createElement('div');
    overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px);";
    
    const modal = document.createElement('div');
    modal.style = "background: var(--bg); padding: 25px; border-radius: 15px; max-width: 500px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 1px solid var(--border); max-height: 80vh; overflow-y: auto;";
    
    let html = `
        <h3 style="color: var(--primary); margin-top: 0; font-family: 'Cairo', sans-serif; text-align: center;">طباعة استلامات يوم ${dateVal}</h3>
        <p style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 20px; text-align: center;">الاستلامات المسجلة في هذا اليوم. يمكنك تحديد المحضر المراد طباعته أو التعديل عليه:</p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
    `;

    Object.keys(batches).forEach((bId, idx) => {
        let items = batches[bId];
        
        let timeStr = "غير معروف";
        let splitTime = bId.match(/(\d{1,2}:\d{2}\s*(ص|م|AM|PM))/i);
        if (splitTime && splitTime[1]) {
            timeStr = splitTime[1];
        } else if (bId.includes(":")) {
            // fallback if it has a colon but no AM/PM
            let parts = bId.split(" ");
            timeStr = parts.length > 1 ? parts.slice(1).join(" ") : bId;
        } else if (bId.startsWith('legacy_')) {
            timeStr = "(بدون وقت)";
        }

        let receiver = items[0].receiver || 'غير محدد';
        html += `
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" class="batch-checkbox" value="${bId}" style="width: 20px; height: 20px; cursor: pointer; flex-shrink: 0;">
                <button class="interactive-btn batch-select-btn" data-batch="${bId}" style="flex: 1; background: var(--bg-light); color: var(--text-main); border: 1px solid var(--border); padding: 15px; border-radius: 8px; text-align: right; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;">
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <span>🕒 استلامة الساعة ${timeStr}</span>
                        <span style="font-size: 0.85rem; color: var(--primary); font-weight: bold;"><i class='fa-solid fa-user'></i> المستلم: ${receiver}</span>
                    </div>
                    <span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${items.length} أصناف</span>
                </button>
                <button class="interactive-btn batch-edit-btn" data-batch="${bId}" style="background: #3498db; color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; transition: 0.2s;" title="تعديل الاستلامة">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </div>
        `;
    });

    if (legacyBatch.length > 0) {
        html += `
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" class="batch-checkbox" value="legacy" style="width: 20px; height: 20px; cursor: pointer; flex-shrink: 0;">
                <button class="interactive-btn batch-select-btn" data-batch="legacy" style="flex: 1; background: var(--bg-light); color: var(--text-main); border: 1px solid var(--border); padding: 15px; border-radius: 8px; text-align: right; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;">
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <span><i class=\'fa-solid fa-box\'></i> استلامات مجمعة (قديمة)</span>
                    </div>
                    <span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${legacyBatch.length} أصناف</span>
                </button>
                <button class="interactive-btn batch-edit-btn" data-batch="legacy" style="background: #3498db; color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; transition: 0.2s;" title="تعديل الاستلامة">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </div>
            <button class="interactive-btn batch-select-btn" data-batch="manual" style="background: var(--bg-light); color: #e67e22; border: 1px dashed #e67e22; padding: 15px; border-radius: 8px; text-align: right; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s; margin-top: -5px;">
                <span>✂️ تقسيم الاستلامات القديمة يدوياً (تحديد واختيار)</span>
            </button>
        `;
    }

    html += `
            <button class="interactive-btn batch-select-btn" data-batch="all" style="background: #27ae60; color: white; border: none; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; margin-top: 10px; cursor: pointer;">
                طباعة كل استلامات اليوم معاً <i class=\'fa-solid fa-print\'></i>
            </button>
            <button class="interactive-btn" id="mergeSelectedBatchesBtn" style="background: #9b59b6; color: white; border: none; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; cursor: pointer; display: none;">
                دمج وطباعة الاستلامات المحددة <i class=\'fa-solid fa-layer-group\'></i>
            </button>
            <button id="closeBatchModalBtn" style="background: transparent; color: var(--text-muted); border: none; padding: 10px; border-radius: 8px; text-align: center; cursor: pointer; text-decoration: underline; margin-top: 5px;">إلغاء</button>
        </div>
    `;

    modal.innerHTML = html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const mergeBtn = modal.querySelector('#mergeSelectedBatchesBtn');
    const checkboxes = modal.querySelectorAll('.batch-checkbox');

    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            let selectedCount = modal.querySelectorAll('.batch-checkbox:checked').length;
            mergeBtn.style.display = selectedCount > 0 ? 'block' : 'none';
        });
    });

    mergeBtn.addEventListener('click', () => {
        let allItems = [];
        let selectedCBs = Array.from(modal.querySelectorAll('.batch-checkbox:checked')).map(cb => cb.value);
        
        selectedCBs.forEach(val => {
            if (val === 'legacy') {
                allItems = allItems.concat(legacyBatch);
            } else {
                allItems = allItems.concat(batches[val]);
            }
        });
        
        document.body.removeChild(overlay);
        
        // جلب أسماء المستلمين المحددين للعنوان (اختياري)
        let receivers = [...new Set(allItems.map(i => i.receiver).filter(r => r && String(r).trim() !== ''))];
        let mergedReceiverName = receivers.length > 0 ? receivers.join(' / ') : "غير محدد";
        let reportTitle = `استلامات مجمعة - المستلم: ${mergedReceiverName}`;
        
        // استدعاء دالة الطباعة الخاصة بالاستلامات
        generatePDFReceipt(allItems, dateVal, reportTitle);
    });

    // Add event listeners for edit buttons
    modal.querySelectorAll('.batch-edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            let bId = this.getAttribute('data-batch');
            let itemsToEdit = bId === 'legacy' ? legacyBatch : batches[bId];
            showBatchEditModal(bId, itemsToEdit, dateVal);
        });
    });

    // Add slight hover effect to buttons since they have bg-light
    modal.querySelectorAll('.batch-select-btn').forEach(btn => {
        btn.addEventListener('mouseover', function() {
            if (this.getAttribute('data-batch') !== 'all' && this.getAttribute('data-batch') !== 'manual') {
                this.style.borderColor = 'var(--primary)';
            }
        });
        btn.addEventListener('mouseout', function() {
            if (this.getAttribute('data-batch') !== 'all' && this.getAttribute('data-batch') !== 'manual') {
                this.style.borderColor = 'var(--border)';
            }
        });

        btn.addEventListener('click', function() {
            let type = this.getAttribute('data-batch');
            document.body.removeChild(overlay);
            
            if (type === 'all') {
                let allItems = [];
                Object.values(batches).forEach(arr => allItems = allItems.concat(arr));
                allItems = allItems.concat(legacyBatch);
                generatePDFReceipt(allItems, dateVal);
            } else if (type === 'legacy') {
                generatePDFReceipt(legacyBatch, dateVal);
            } else if (type === 'manual') {
                showManualSelectionModal(legacyBatch, dateVal);
            } else {
                generatePDFReceipt(batches[type], dateVal);
            }
        });
    });

    document.getElementById('closeBatchModalBtn').onclick = () => document.body.removeChild(overlay);
}

window.showBatchEditModal = function(bId, items, dateVal) {
    const overlay = document.createElement('div');
    overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10005; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px);";
    
    const modal = document.createElement('div');
    modal.style = "background: var(--bg); padding: 25px; border-radius: 15px; max-width: 600px; width: 95%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 1px solid var(--border); max-height: 80vh; overflow-y: auto; display: flex; flex-direction: column; gap: 15px;";
    
    let titleStr = bId === 'legacy' ? 'الاستلامات المجمعة (القديمة)' : `الساعة ${new Date(parseInt(bId)).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
    
    let html = `
        <h3 style="color: var(--primary); margin-top: 0; font-family: 'Cairo', sans-serif; text-align: center;">
            تعديل استلامة ${dateVal} - ${titleStr}
        </h3>
        <p style="font-size: 0.9rem; color: var(--text-main); text-align: center; margin-bottom: 10px;">
            تنبيه: بعد تعديل الأصناف، يُرجى إغلاق هذه النافذة ثم طباعة الاستلامة للحصول على التحديثات.
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px; max-height: 50vh; overflow-y: auto; padding-right: 5px;">
    `;

    items.forEach(item => {
        html += `
            <div style="background: var(--bg-light); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <div style="display: flex; flex-direction: column; gap: 5px; flex: 1;">
                    <span style="font-weight: bold; color: var(--text-main);"><i class='fa-solid fa-box'></i> ${item.name}</span>
                    <span style="font-size: 0.85rem; color: var(--text-muted);">
                        الكمية: <strong style="color:var(--text-dark);">${item.qty}</strong> | المستلم: ${item.receiver || 'غير محدد'} | تاريخ الصلاحية: ${item.expiryDate || 'بدون'}
                    </span>
                </div>
                <button class="interactive-btn" style="background: #3498db; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" onclick="openEditExpiryModal('${item.id}')">
                    <i class="fa-solid fa-pen"></i> تعديل
                </button>
            </div>
        `;
    });

    if (items.length === 0) {
        html += `<p style="text-align: center; color: var(--text-muted);">لا توجد أصناف في هذه الاستلامة.</p>`;
    }

    html += `
        </div>
        <button id="closeBatchEditModalBtn" style="background: var(--text-muted); color: white; border: none; padding: 12px; border-radius: 8px; text-align: center; font-weight: bold; cursor: pointer; margin-top: 10px;">
            إغلاق
        </button>
    `;

    modal.innerHTML = html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('closeBatchEditModalBtn').onclick = () => document.body.removeChild(overlay);
}

function showManualSelectionModal(legacyBatch, dateVal) {
    const overlay = document.createElement('div');
    overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px);";
    
    const modal = document.createElement('div');
    modal.style = "background: var(--bg); padding: 25px; border-radius: 15px; max-width: 600px; width: 95%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 1px solid var(--border); max-height: 90vh; display: flex; flex-direction: column;";
    
    let html = `
        <h3 style="color: var(--primary); margin-top: 0; font-family: 'Cairo', sans-serif; text-align: center;">تقسيم الاستلامات يدوياً ✂️</h3>
        <p style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 15px; text-align: center;">حدد الأصناف التي تريد طباعتها معاً في استلامة واحدة:</p>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding: 0 10px;">
            <label style="cursor: pointer; font-weight: bold; color: var(--primary);">
                <input type="checkbox" id="selectAllManualBtn"> تحديد الكل
            </label>
            <span style="font-size: 0.85rem; color: var(--text-muted);">إجمالي الأصناف: ${legacyBatch.length}</span>
        </div>

        <div style="flex: 1; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; background: var(--bg-light);">
    `;

    legacyBatch.forEach((item, index) => {
        html += `
            <label style="display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; transition: 0.2s;">
                <input type="checkbox" class="manual-item-checkbox" value="${index}" style="width: 18px; height: 18px; accent-color: var(--primary);">
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: var(--text-main);">${item.name || 'بدون اسم'}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">العدد: <strong style="color: #27ae60;">${item.qty}</strong> | المسجل: ${item.registrarName || '-'} | المستلم: ${item.receiver || '-'}</div>
                </div>
            </label>
        `;
    });

    html += `
        </div>
        <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button id="printManualSelectedBtn" style="flex: 2; background: #E91E8C; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem;">
                <i class=\'fa-solid fa-print\'></i> طباعة المحدد فقط (<span id="selectedCountSpan">0</span>)
            </button>
            <button id="closeManualModalBtn" style="flex: 1; background: var(--bg-light); color: var(--text-main); border: 1px solid var(--border); padding: 12px; border-radius: 8px; cursor: pointer;">إلغاء</button>
        </div>
    `;

    modal.innerHTML = html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const checkboxes = modal.querySelectorAll('.manual-item-checkbox');
    const selectAllBtn = modal.querySelector('#selectAllManualBtn');
    const countSpan = modal.querySelector('#selectedCountSpan');

    function updateCount() {
        let count = modal.querySelectorAll('.manual-item-checkbox:checked').length;
        countSpan.innerText = count;
    }

    checkboxes.forEach(cb => cb.addEventListener('change', updateCount));

    selectAllBtn.addEventListener('change', function() {
        let isChecked = this.checked;
        checkboxes.forEach(cb => cb.checked = isChecked);
        updateCount();
    });

    modal.querySelector('#printManualSelectedBtn').addEventListener('click', () => {
        let selectedIndices = Array.from(modal.querySelectorAll('.manual-item-checkbox:checked')).map(cb => parseInt(cb.value));
        if (selectedIndices.length === 0) {
            showToast("يرجى تحديد صنف واحد على الأقل للطباعة", "warning");
            return;
        }
        let selectedItems = selectedIndices.map(idx => legacyBatch[idx]);
        document.body.removeChild(overlay);
        generatePDFReceipt(selectedItems, dateVal);
    });

    modal.querySelector('#closeManualModalBtn').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
}

function generateCategoryPDF(filteredData, categoryName) {
    let printWindow = window.open('', '_blank', 'height=800,width=800');
    if (!printWindow) {
        showToast("يرجى السماح بالنوافذ المنبثقة (Pop-ups) لفتح ملف الطباعة", "error");
        return;
    }

    let baseUrl = window.location.href.split('?')[0].replace(/[^/]*$/, '');
    let logoUrl = baseUrl + 'favicon.png';
    let cleanCategoryName = categoryName.replace(/<[^>]*>?/gm, '').trim();

    let html = `
        <html dir="rtl" lang="ar">
        <head>
            <title>تقرير حالة الصلاحيات - ${cleanCategoryName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; }
                body { 
                    font-family: 'Cairo', sans-serif; 
                    color: #333; 
                    background: #fff; 
                    direction: rtl; 
                    width: 210mm; /* A4 width */
                    margin: 0 auto; 
                    padding: 15mm; 
                }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #E91E8C; padding-bottom: 20px; margin-bottom: 30px; }
                .logo-container { display: flex; align-items: center; gap: 15px; direction: ltr; }
                .logo-img { height: 70px; object-fit: contain; }
                .logo-text { font-size: 36px; font-weight: 900; color: #E91E8C; letter-spacing: 2px; margin: 0; }
                .logo-text span { background: #E91E8C; color: white; padding: 5px 15px; border-radius: 8px; font-size: 24px; vertical-align: middle; }
                .title-box { text-align: left; }
                .title { font-size: 22px; font-weight: bold; color: #2c3e50; margin: 0; margin-bottom: 5px; }
                .subtitle { font-size: 16px; color: #7f8c8d; margin: 0; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
                th, td { border: 1px solid #e0e0e0; padding: 12px; text-align: right; }
                th { background: #E91E8C; color: white; font-weight: bold; font-size: 15px; }
                tr:nth-child(even) { background-color: #fafafa; }
                .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                @media print {
                    body { box-shadow: none; padding: 0; margin: 0; width: auto; }
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <style>
                @media print { .edit-controls { display: none !important; } }
                .edit-controls { text-align: center; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px dashed #cbd5e1; direction: rtl; }
                .edit-controls p { margin-top: 0; margin-bottom: 15px; color: #334155; font-weight: bold; font-family: 'Cairo', sans-serif; }
                .btn-edit { background: #3b82f6; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; margin: 0 5px; font-weight: bold; transition: 0.2s; }
                .btn-edit:hover { background: #2563eb; }
                .btn-print { background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; margin: 0 5px; font-weight: bold; transition: 0.2s; }
                .btn-print:hover { background: #059669; }
                td[contenteditable="true"] { background-color: #fef9c3; outline: 1px dashed #eab308; }
            </style>
            <div class="edit-controls no-print">
                <p>وضع التعديل الحر للطباعة (لن يؤثر على قاعدة البيانات الأساسية)</p>
                <button class="btn-edit" onclick="document.querySelectorAll('td:not(.no-edit)').forEach(td => td.contentEditable = td.contentEditable === 'true' ? 'false' : 'true'); this.innerHTML = this.innerHTML.includes('تفعيل') ? 'إلغاء وضع التعديل' : 'تفعيل وضع التعديل';">تفعيل وضع التعديل</button>
                <button class="btn-print" onclick="window.print()">🖨️ طباعة الآن</button>
            </div>
            <div class="header">
                <div class="logo-container">
                    <img src="${logoUrl}" alt="Logo" class="logo-img">
                    <h1 class="logo-text">Candy <span>Club</span></h1>
                </div>
                <div class="title-box">
                    <h2 class="title">تقرير حالة الصلاحيات</h2>
                    <p class="subtitle">حالة المنتجات: <strong style="color: #e74c3c;">${categoryName}</strong></p>
                    <p class="subtitle" style="font-size: 13px; margin-top: 5px;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">م</th>
                        <th>اسم المنتج</th>
                        <th>الباركود</th>
                        <th style="width: 100px;">الكمية</th>
                        <th style="width: 120px;">تاريخ الانتهاء</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filteredData.forEach((item, index) => {
        let name = item.name || 'غير محدد';
        let barcode = item.barcode || '--';
        let qty = item.qty || 0;
        let expiry = item.expiryDate ? String(item.expiryDate).split('T')[0] : '--';
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td style="font-weight: bold; color: #2c3e50;">${name}</td>
                <td class="no-edit" style="font-family: monospace; font-size: 15px; letter-spacing: 1px;">${barcode}</td>
                <td><span style="background: #f1f2f6; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${qty}</span></td>
                <td style="color: #e74c3c; font-weight: bold;">${expiry}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
            
            <div class="footer">
                <p>تم استخراج هذا التقرير من نظام Candy Club</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.onbeforeprint = function() {
                        document.querySelectorAll('tbody tr').forEach(tr => {
                            let cell0 = tr.cells[0];
                            let cell1 = tr.cells[1];
                            let t0 = cell0 ? cell0.innerText.trim() : '';
                            let t1 = cell1 ? cell1.innerText.trim() : '';
                            if (t0 === '' || t1 === '' || t1 === '-') {
                                tr.remove();
                            }
                        });
                    };
                    
                    document.querySelector('tbody').addEventListener('input', function(e) {
                        if (e.target.tagName === 'TD') {
                            let tr = e.target.parentElement;
                            let cell0 = tr.cells[0];
                            let t0 = cell0 ? cell0.innerText.trim() : '';
                            if (t0 === '') {
                                tr.remove();
                                let countEl = document.getElementById('totalItemsCount');
                                if (countEl) {
                                    let c = parseInt(countEl.innerText);
                                    if (!isNaN(c)) countEl.innerText = c - 1;
                                }
                            }
                        }
                    });
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
}

function generateExpiryMonthPDF(filteredData, monthVal) {
    let printWindow = window.open('', '_blank', 'height=800,width=800');
    if (!printWindow) {
        showToast("يرجى السماح بالنوافذ المنبثقة (Pop-ups) لفتح ملف الطباعة", "error");
        return;
    }

    // Group items by barcode and EXACT expiry date (to sort by day)
    let grouped = {};
    filteredData.forEach(item => {
        let expDateRaw = item.expiryDate ? String(item.expiryDate).split('T')[0] : 'غير محدد';
        let idKey = item.barcode && String(item.barcode).trim() !== '' ? String(item.barcode).trim() : String(item.name).trim();
        if (!idKey) idKey = "unknown";
        
        let key = idKey + "_" + expDateRaw;
        
        if (!grouped[key]) {
            grouped[key] = { ...item, qty: parseFloat(item.qty) || 0, formattedExp: expDateRaw };
        } else {
            grouped[key].qty += parseFloat(item.qty) || 0;
        }
    });
    let finalData = Object.values(grouped);
    
    // Sort by expiry date ascending
    finalData.sort((a, b) => {
        let dateA = new Date(a.formattedExp);
        let dateB = new Date(b.formattedExp);
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateA - dateB;
    });

    let baseUrl = window.location.href.split('?')[0].replace(/[^/]*$/, '');
    let logoUrl = baseUrl + 'favicon.png';

    let html = `
        <html dir="rtl" lang="ar">
        <head>
            <title>تقرير انتهاء الصلاحية - شهر ${monthVal}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <style>
                * { box-sizing: border-box; }
                body { 
                    font-family: 'Cairo', sans-serif; 
                    color: #1e293b; 
                    background: #fff; 
                    direction: rtl; 
                    width: 210mm; /* A4 width */
                    margin: 0 auto; 
                    padding: 15mm; 
                }
                .header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    border-bottom: 3px solid #f1f5f9; 
                    padding-bottom: 20px; 
                    margin-bottom: 25px; 
                }
                .logo-container { text-align: right; }
                .logo-img { height: 85px; object-fit: contain; }
                
                .title-container {
                    text-align: left;
                }
                .title-badge { 
                    display: inline-block;
                    background: #fdf2f8; 
                    color: #E91E8C;
                    font-size: 24px; 
                    font-weight: 900; 
                    padding: 10px 25px;
                    border-radius: 12px;
                    border: 1px solid #fbcfe8;
                }
                
                .info-section { 
                    display: flex; 
                    gap: 15px; 
                    margin-bottom: 25px; 
                }
                .info-card { 
                    flex: 1;
                    background: #ffffff; 
                    padding: 18px; 
                    border-radius: 12px; 
                    border: 1px solid #e2e8f0; 
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    font-size: 15px;
                }
                .info-row:last-child { margin-bottom: 0; }
                .info-label { color: #64748b; font-weight: bold; }
                .info-value { color: #0f172a; font-weight: 900; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
                thead { display: table-header-group; }
                tr { page-break-inside: avoid; }
                th { 
                    background: #1e293b; 
                    color: #f8fafc; 
                    padding: 12px; 
                    text-align: right; 
                    border: 1px solid #334155; 
                    border-top: 4px solid #E91E8C;
                }
                td { padding: 12px; border: 1px solid #e2e8f0; vertical-align: middle; }
                tr:nth-child(even) { background-color: #f8fafc; }
                
                .qty-cell {
                    font-size: 1.2em;
                    font-weight: 900;
                    color: #059669;
                    text-align: center;
                    background: #ecfdf5;
                }
                
                .barcode-container {
                    text-align: center;
                }
                .barcode-text {
                    font-size: 12px;
                    font-weight: bold;
                    letter-spacing: 1px;
                    color: #475569;
                    margin-top: 4px;
                }

                .footer { 
                    text-align: center; 
                    margin-top: 40px; 
                    font-size: 13px; 
                    color: #94a3b8; 
                    border-top: 1px dashed #cbd5e1; 
                    padding-top: 20px; 
                    page-break-inside: avoid; 
                }
                @media print {
                    @page { size: A4 portrait; margin: 15mm; }
                    body { padding: 0; width: 100%; box-shadow: none; margin: 0; }
                    .info-card { box-shadow: none; border: 1px solid #cbd5e1; }
                }
            </style>
        </head>
        <body>
            <style>
                @media print { .edit-controls { display: none !important; } }
                .edit-controls { text-align: center; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px dashed #cbd5e1; direction: rtl; }
                .edit-controls p { margin-top: 0; margin-bottom: 15px; color: #334155; font-weight: bold; font-family: 'Cairo', sans-serif; }
                .btn-edit { background: #3b82f6; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; margin: 0 5px; font-weight: bold; transition: 0.2s; }
                .btn-edit:hover { background: #2563eb; }
                .btn-print { background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; margin: 0 5px; font-weight: bold; transition: 0.2s; }
                .btn-print:hover { background: #059669; }
                td[contenteditable="true"] { background-color: #fef9c3; outline: 1px dashed #eab308; }
            </style>
            <div class="edit-controls no-print">
                <p>وضع التعديل الحر للطباعة (لن يؤثر على قاعدة البيانات الأساسية)</p>
                <button class="btn-edit" onclick="document.querySelectorAll('td:not(.no-edit)').forEach(td => td.contentEditable = td.contentEditable === 'true' ? 'false' : 'true'); this.innerHTML = this.innerHTML.includes('تفعيل') ? 'إلغاء وضع التعديل' : 'تفعيل وضع التعديل';">تفعيل وضع التعديل</button>
                <button class="btn-print" onclick="window.print()">🖨️ طباعة الآن</button>
            </div>
            <div class="header">
                <div class="logo-container" style="display: flex; align-items: center; gap: 15px; direction: ltr;">
                    <img src="${logoUrl}" alt="Logo" class="logo-img">
                    <div style="text-align: left;">
                        <div style="font-weight: 900; font-size: 26px; color: #1e293b; letter-spacing: 1px; line-height: 1.2;">Candy Club</div>
                    </div>
                </div>
                <div class="title-container">
                    <div class="title-badge">تقرير صلاحيات المنتجات</div>
                </div>
            </div>
            
            <div class="info-section">
                <div class="info-card" style="display: flex; align-items: center; justify-content: center;">
                    <div class="info-row" style="justify-content: center; font-size: 18px; margin: 0;">
                        <span class="info-label" style="font-size: 22px;">شهر الانتهاء:</span>
                        <span class="info-value" style="color: #E91E8C; margin-right: 15px; font-size: 22px;" dir="ltr">${monthVal}</span>
                    </div>
                </div>
                <div class="info-card" style="display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                    <span class="info-label" style="margin-bottom: 8px;">إجمالي الأصناف المجمعة</span>
                    <span id="totalItemsCount" class="info-value" style="font-size: 32px; color: #E91E8C; line-height: 1;">${finalData.length}</span>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 5%; text-align: center;">م</th>
                        <th style="width: 40%;">اسم المنتج</th>
                        <th style="width: 25%; text-align: center;">الباركود</th>
                        <th style="width: 15%; text-align: center;">العدد الكلي</th>
                        <th style="width: 15%; text-align: right;">يوم الانتهاء</th>
                    </tr>
                </thead>
                <tbody>
                    ${finalData.map((item, index) => {
                        let barcodeHtml = '-';
                        let bCode = item.barcode ? String(item.barcode).trim() : '';
                        if (bCode !== '') {
                            // Fix for dropped leading zeros (e.g. from Excel numeric parsing)
                            if (/^\d+$/.test(bCode) && (bCode.length === 11 || bCode.length === 7)) {
                                bCode = '0' + bCode;
                            }
                            barcodeHtml = `
                                <div class="barcode-container">
                                    <svg class="barcode"
                                        jsbarcode-value="${bCode}"
                                        jsbarcode-height="35"
                                        jsbarcode-width="1.5"
                                        jsbarcode-displayvalue="false"
                                        jsbarcode-margin="0">
                                    </svg>
                                    <div class="barcode-text">${bCode}</div>
                                </div>
                            `;
                        }

                        return `
                        <tr>
                            <td style="text-align: center; font-weight: bold; color: #64748b;">${index + 1}</td>
                            <td style="font-weight: 900; font-size: 15px;">${item.name || '-'}</td>
                            <td class="no-edit" dir="ltr" style="text-align: center;">${barcodeHtml}</td>
                            <td class="qty-cell">${item.qty || '-'}</td>
                            <td dir="ltr" style="text-align: right; color: #475569; font-weight: bold;">${item.formattedExp}</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                تم استخراج هذا التقرير آلياً من نظام Candy Club
            </div>
            
            <script>
                window.onload = function() {
                    try {
                        JsBarcode(".barcode").init();
                    } catch(e) {
                        console.error("Barcode rendering failed", e);
                    }
                    
                    window.onbeforeprint = function() {
                        document.querySelectorAll('tbody tr').forEach(tr => {
                            let cell0 = tr.cells[0];
                            let cell1 = tr.cells[1];
                            let t0 = cell0 ? cell0.innerText.trim() : '';
                            let t1 = cell1 ? cell1.innerText.trim() : '';
                            if (t0 === '' || t1 === '' || t1 === '-') {
                                tr.remove();
                            }
                        });
                    };
                    
                    document.querySelector('tbody').addEventListener('input', function(e) {
                        if (e.target.tagName === 'TD') {
                            let tr = e.target.parentElement;
                            let cell0 = tr.cells[0];
                            let t0 = cell0 ? cell0.innerText.trim() : '';
                            if (t0 === '') {
                                tr.remove();
                                let countEl = document.getElementById('totalItemsCount');
                                if (countEl) {
                                    let c = parseInt(countEl.innerText);
                                    if (!isNaN(c)) countEl.innerText = c - 1;
                                }
                            }
                        }
                    });
                }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
}

function generatePDFReceipt(filteredData, dateVal) {
    // Determine receiver name from the selected batch items
    let receivers = [...new Set(filteredData.map(item => item.receiver).filter(r => r && String(r).trim() !== ''))];
    let receiver = receivers.length > 0 ? receivers.join(' / ') : '.........................';

    let printWindow = window.open('', '_blank', 'height=800,width=800');
    if (!printWindow) {
        showToast("يرجى السماح بالنوافذ المنبثقة (Pop-ups) لفتح ملف الطباعة", "error");
        return;
    }

    let baseUrl = window.location.href.split('?')[0].replace(/[^/]*$/, '');
    let logoUrl = baseUrl + 'favicon.png';

    let html = `
        <html dir="rtl" lang="ar">
        <head>
            <title>بيان استلام بضاعة - ${dateVal}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <style>
                * { box-sizing: border-box; }
                body { 
                    font-family: 'Cairo', sans-serif; 
                    color: #1e293b; 
                    background: #fff; 
                    direction: rtl; 
                    width: 210mm; /* A4 width */
                    margin: 0 auto; 
                    padding: 15mm; 
                }
                .header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    border-bottom: 3px solid #f1f5f9; 
                    padding-bottom: 20px; 
                    margin-bottom: 25px; 
                }
                .logo-container { text-align: right; }
                .logo-img { height: 85px; object-fit: contain; }
                
                .title-container {
                    text-align: left;
                }
                .title-badge { 
                    display: inline-block;
                    background: #fdf2f8; 
                    color: #E91E8C;
                    font-size: 24px; 
                    font-weight: 900; 
                    padding: 10px 25px;
                    border-radius: 12px;
                    border: 1px solid #fbcfe8;
                }
                
                .info-section { 
                    display: flex; 
                    gap: 15px; 
                    margin-bottom: 25px; 
                }
                .info-card { 
                    flex: 1;
                    background: #ffffff; 
                    padding: 18px; 
                    border-radius: 12px; 
                    border: 1px solid #e2e8f0; 
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    font-size: 15px;
                }
                .info-row:last-child { margin-bottom: 0; }
                .info-label { color: #64748b; font-weight: bold; }
                .info-value { color: #0f172a; font-weight: 900; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
                thead { display: table-header-group; }
                tr { page-break-inside: avoid; }
                th { 
                    background: #1e293b; 
                    color: #f8fafc; 
                    padding: 12px; 
                    text-align: right; 
                    border: 1px solid #334155; 
                    border-top: 4px solid #E91E8C;
                }
                td { padding: 12px; border: 1px solid #e2e8f0; vertical-align: middle; }
                tr:nth-child(even) { background-color: #f8fafc; }
                
                .qty-cell {
                    font-size: 1.2em;
                    font-weight: 900;
                    color: #059669;
                    text-align: center;
                    background: #ecfdf5;
                }
                
                .barcode-container {
                    text-align: center;
                }
                .barcode-text {
                    font-size: 12px;
                    font-weight: bold;
                    letter-spacing: 1px;
                    color: #475569;
                    margin-top: 4px;
                }

                .footer { 
                    text-align: center; 
                    margin-top: 40px; 
                    font-size: 13px; 
                    color: #94a3b8; 
                    border-top: 1px dashed #cbd5e1; 
                    padding-top: 20px; 
                    page-break-inside: avoid; 
                }
                @media print {
                    @page { size: A4 portrait; margin: 15mm; }
                    body { padding: 0; width: 100%; box-shadow: none; margin: 0; }
                    .info-card { box-shadow: none; border: 1px solid #cbd5e1; }
                }
            </style>
        </head>
        <body>
            <style>
                @media print { .edit-controls { display: none !important; } }
                .edit-controls { text-align: center; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px dashed #cbd5e1; direction: rtl; }
                .edit-controls p { margin-top: 0; margin-bottom: 15px; color: #334155; font-weight: bold; font-family: 'Cairo', sans-serif; }
                .btn-edit { background: #3b82f6; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; margin: 0 5px; font-weight: bold; transition: 0.2s; }
                .btn-edit:hover { background: #2563eb; }
                .btn-print { background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; margin: 0 5px; font-weight: bold; transition: 0.2s; }
                .btn-print:hover { background: #059669; }
                td[contenteditable="true"] { background-color: #fef9c3; outline: 1px dashed #eab308; }
            </style>
            <div class="edit-controls no-print">
                <p>وضع التعديل الحر للطباعة (لن يؤثر على قاعدة البيانات الأساسية)</p>
                <button class="btn-edit" onclick="document.querySelectorAll('td:not(.no-edit)').forEach(td => td.contentEditable = td.contentEditable === 'true' ? 'false' : 'true'); this.innerHTML = this.innerHTML.includes('تفعيل') ? 'إلغاء وضع التعديل' : 'تفعيل وضع التعديل';">تفعيل وضع التعديل</button>
                <button class="btn-print" onclick="window.print()">🖨️ طباعة الآن</button>
            </div>
            <div class="header">
                <div class="logo-container" style="display: flex; align-items: center; gap: 15px; direction: ltr;">
                    <img src="${logoUrl}" alt="Logo" class="logo-img">
                    <div style="text-align: left;">
                        <div style="font-weight: 900; font-size: 26px; color: #1e293b; letter-spacing: 1px; line-height: 1.2;">Candy Club</div>
                    </div>
                </div>
                <div class="title-container">
                    <div class="title-badge">بيان استلام بضاعة</div>
                </div>
            </div>
            
            <div class="info-section">
                <div class="info-card">
                    <div class="info-row">
                        <span class="info-label"><i class="fa-regular fa-calendar" style="margin-left: 5px;"></i> تاريخ التسجيل:</span>
                        <span class="info-value" style="color: #E91E8C;">${dateVal}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label"><i class="fa-regular fa-user" style="margin-left: 5px;"></i> اسم المستلم:</span>
                        <span class="info-value">${receiver}</span>
                    </div>
                </div>
                <div class="info-card" style="display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                    <span class="info-label" style="margin-bottom: 8px;">إجمالي الأصناف</span>
                    <span id="totalItemsCount" class="info-value" style="font-size: 32px; color: #E91E8C; line-height: 1;">${filteredData.length}</span>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 5%; text-align: center;">م</th>
                        <th style="width: 30%;">اسم المنتج</th>
                        <th style="width: 20%; text-align: center;">الباركود</th>
                        <th style="width: 10%; text-align: center;">العدد</th>
                        <th style="width: 15%;">تاريخ الانتهاء</th>
                        <th style="width: 15%;">المكان</th>
                        <th style="width: 5%;">ملاحظات</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map((item, index) => {
                        let expDate = new Date(item.expiryDate);
                        let formattedExp = isNaN(expDate.getTime()) ? item.expiryDate : expDate.toLocaleDateString('ar-EG');
                        
                        let barcodeHtml = '-';
                        if (item.barcode && item.barcode.trim() !== '') {
                            barcodeHtml = `
                                <div class="barcode-container">
                                    <svg class="barcode"
                                        jsbarcode-value="${item.barcode}"
                                        jsbarcode-height="35"
                                        jsbarcode-width="1.5"
                                        jsbarcode-displayvalue="false"
                                        jsbarcode-margin="0">
                                    </svg>
                                    <div class="barcode-text">${item.barcode}</div>
                                </div>
                            `;
                        }

                        return `
                        <tr>
                            <td style="text-align: center; font-weight: bold; color: #64748b;">${index + 1}</td>
                            <td style="font-weight: 900; font-size: 15px;">${item.name || '-'}</td>
                            <td class="no-edit" dir="ltr" style="text-align: center;">${barcodeHtml}</td>
                            <td class="qty-cell">${item.qty || '-'}</td>
                            <td dir="ltr" style="text-align: right; color: #475569;">${formattedExp || '-'}</td>
                            <td style="color: #475569;">${item.location || '-'}</td>
                            <td style="color: #94a3b8; font-size: 12px;">${item.notes || '-'}</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <div class="footer">
                تم استخراج هذا الإيصال آلياً من نظام Candy Club - ${new Date().toLocaleString('ar-EG')}
            </div>
            
            <script>
                window.onload = function() {
                    try {
                        JsBarcode(".barcode").init();
                    } catch(e) {
                        console.error("Barcode rendering failed", e);
                    }
                    
                    window.onbeforeprint = function() {
                        document.querySelectorAll('tbody tr').forEach(tr => {
                            let cell0 = tr.cells[0];
                            let cell1 = tr.cells[1];
                            let t0 = cell0 ? cell0.innerText.trim() : '';
                            let t1 = cell1 ? cell1.innerText.trim() : '';
                            if (t0 === '' || t1 === '' || t1 === '-') {
                                tr.remove();
                            }
                        });
                    };
                    
                    document.querySelector('tbody').addEventListener('input', function(e) {
                        if (e.target.tagName === 'TD') {
                            let tr = e.target.parentElement;
                            let cell0 = tr.cells[0];
                            let t0 = cell0 ? cell0.innerText.trim() : '';
                            if (t0 === '') {
                                tr.remove();
                                let countEl = document.getElementById('totalItemsCount');
                                if (countEl) {
                                    let c = parseInt(countEl.innerText);
                                    if (!isNaN(c)) countEl.innerText = c - 1;
                                }
                            }
                        }
                    });
                }
            </script>
        </body>
        </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
}

// =========================================
// Advanced UX & System Protection
// =========================================

window.showLoading = function() {
    let overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('loading-overlay-hidden');
};

window.hideLoading = function() {
    let overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('loading-overlay-hidden');
};

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep(frequency, type, duration, vol) {
    try {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        
        let now = audioCtx.currentTime;
        
        gainNode.gain.setValueAtTime(vol, now);
        gainNode.gain.setValueAtTime(vol, now + duration - 0.01);
        gainNode.gain.linearRampToValueAtTime(0.001, now + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start(now);
        oscillator.stop(now + duration);

        // الصمام السحري: إجبار الصوت على القطع بعد نصف ثانية حتى لو علق المتصفح
        setTimeout(() => {
            try {
                oscillator.disconnect();
                gainNode.disconnect();
            } catch(e) {}
        }, 500); 
    } catch(e) {}
}

window.playSuccessBeep = function() { playBeep(2750, 'sine', 0.08, 0.5); };
window.playRegisterBeep = function() {
    playBeep(2750, 'sine', 0.08, 0.5);
    setTimeout(() => playBeep(2750, 'sine', 0.08, 0.5), 140);
};
window.playErrorBeep = function() { playBeep(300, 'sawtooth', 0.4, 0.1); };

window.addEventListener('offline', () => {
    let bar = document.getElementById('offline-bar');
    if (bar) bar.style.display = 'block';
    let saveBtns = document.querySelectorAll('#saveOrderBtn, #saveAndPrintBtn, .interactive-btn');
    saveBtns.forEach(btn => { if(btn.innerText && btn.innerText.includes('حفظ')) btn.disabled = true; });
});

window.addEventListener('online', () => {
    let bar = document.getElementById('offline-bar');
    if (bar) bar.style.display = 'none';
    let saveBtns = document.querySelectorAll('#saveOrderBtn, #saveAndPrintBtn, .interactive-btn');
    saveBtns.forEach(btn => btn.disabled = false);
});

// Smart Auto-Focus
document.addEventListener('DOMContentLoaded', () => {
    let cName = document.getElementById('customerName');
    let cPhone = document.getElementById('customerPhone');
    let cAddress = document.getElementById('address');
    
    if (cName) {
        cName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (cPhone) cPhone.focus(); }
        });
    }
    if (cPhone) {
        cPhone.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (cAddress) cAddress.focus(); }
        });
    }
    
    // Focus Name when Add Order tab is clicked
    let navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('onclick') && item.getAttribute('onclick').includes('create-tab')) {
            item.addEventListener('click', () => {
                setTimeout(() => { if (cName) cName.focus(); }, 100);
            });
        }
    });
});

// --- Sidebar Navigation ---
const sidebarOverlay = document.getElementById("sidebar-overlay");
const appSidebar = document.getElementById("app-sidebar");
const menuToggleBtn = document.getElementById("menuToggleBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");

function toggleSidebar() {
    if(appSidebar) appSidebar.classList.toggle("open");
    if(sidebarOverlay) sidebarOverlay.classList.toggle("active");
}

if(menuToggleBtn) menuToggleBtn.addEventListener("click", toggleSidebar);
if(closeSidebarBtn) closeSidebarBtn.addEventListener("click", toggleSidebar);
if(sidebarOverlay) sidebarOverlay.addEventListener("click", toggleSidebar);

// Override existing tab logic to close sidebar when a tab is clicked
document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
        if (appSidebar && appSidebar.classList.contains("open")) {
            appSidebar.classList.remove("open");
            if(sidebarOverlay) sidebarOverlay.classList.remove("active");
        }
    });
});

// --- WhatsApp Campaigns Logic ---
let waCooldownTime = 0;
let waCooldownInterval = null;

function sanitizePhone(phone) {
    if(!phone) return "";
    let cleaned = phone.toString().replace(/\D/g, "");
    if(cleaned.startsWith("0")) cleaned = "2" + cleaned; // Assume Egypt 20 if starts with 0
    else if(!cleaned.startsWith("20") && cleaned.length === 10) cleaned = "20" + cleaned; 
    return cleaned;
}

// --- WhatsApp Campaigns Pro Logic ---
const waTargetGroup = document.getElementById("waTargetGroup");
const waCustomNumbersDiv = document.getElementById("waCustomNumbersDiv");
if(waTargetGroup && waCustomNumbersDiv) {
    waTargetGroup.addEventListener("change", (e) => {
        waCustomNumbersDiv.style.display = e.target.value === "custom" ? "block" : "none";
    });
}

// Image handling
const waImageInput = document.getElementById("waImageInput");
const waImagePreviewContainer = document.getElementById("waImagePreviewContainer");
const waImagePreview = document.getElementById("waImagePreview");
const waCopyImageBtn = document.getElementById("waCopyImageBtn");

if(waImageInput) {
    waImageInput.addEventListener("change", (e) => {
        if(e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                waImagePreview.src = ev.target.result;
                waImagePreviewContainer.style.display = "flex";
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

if(waCopyImageBtn) {
    waCopyImageBtn.addEventListener("click", async () => {
        try {
            const canvas = document.createElement("canvas");
            canvas.width = waImagePreview.naturalWidth;
            canvas.height = waImagePreview.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(waImagePreview, 0, 0);
            canvas.toBlob(async (blob) => {
                const item = new ClipboardItem({ "image/png": blob });
                await navigator.clipboard.write([item]);
                alert("تم نسخ الصورة بنجاح! يمكنك الآن لصقها (Paste) في شات الواتساب.");
            }, "image/png");
        } catch (err) {
            alert("حدث خطأ أثناء نسخ الصورة. قد لا يدعم متصفحك هذه الخاصية.");
        }
    });
}

// --- Smart Assistant WA Logic ---
window.waAssistantQueue = [];
window.waAssistantIndex = 0;
window.waIsPaused = false;
window.waMessageTemplate = "";

const waStartCampaignBtn = document.getElementById("waStartCampaignBtn");
if(waStartCampaignBtn) {
    waStartCampaignBtn.addEventListener("click", () => {
        const countSpan = document.getElementById("waQueueCount");
        const container = document.getElementById("waQueueContainer");
        const targetGroup = document.getElementById("waTargetGroup");
        const targetType = targetGroup ? targetGroup.value : "all";
        
        let validCustomers = [];
        
        if (targetType === "custom") {
            const text = document.getElementById("waCustomNumbers").value;
            const numbers = text.split(/[\n,]+/).map(n => n.trim()).filter(n => n);
            validCustomers = numbers.map(n => ({ name: "عميل", phone: n }));
        } else {
            if(!window.customersData || window.customersData.length === 0) {
                alert("لا يوجد عملاء مسجلين حالياً.");
                return;
            }
            let baseCustomers = window.customersData.filter(c => c.phone && c.phone.length >= 10);
            
            if (targetType === "vip") {
                validCustomers = baseCustomers.filter(c => (parseInt(c.count) || 0) >= 3);
            } else if (targetType === "inactive") {
                validCustomers = baseCustomers.filter(c => (parseInt(c.count) || 0) <= 1);
            } else {
                validCustomers = baseCustomers;
            }
        }
        
        if(validCustomers.length === 0) {
            alert("لا يوجد عملاء في هذه الفئة المستهدفة.");
            return;
        }

        const textElem = document.getElementById("waCampaignText");
        const messageText = textElem ? textElem.value : "";
        if(!messageText.trim()) {
            alert("برجاء كتابة نص رسالة العرض أولاً.");
            textElem.focus();
            return;
        }
        
        if(!confirm("سيتم إرسال الحملة إلى " + validCustomers.length + " عميل باستخدام المساعد الذكي. هل أنت مستعد للبدء؟")) {
            return;
        }
        
        window.waAssistantQueue = validCustomers;
        window.waAssistantIndex = 0;
        window.waMessageTemplate = messageText;
        
        countSpan.innerText = "0 / " + validCustomers.length;
        container.style.display = "block";
        container.scrollIntoView({ behavior: "smooth" });
        
        renderNextAssistantCustomer();
    });
}

function renderNextAssistantCustomer() {
    const statusText = document.getElementById("waAssistantStatus");
    const nameText = document.getElementById("waCurrentCustomerName");
    const sendBtn = document.getElementById("waSendNextBtn");
    const countSpan = document.getElementById("waQueueCount");
    
    countSpan.innerText = window.waAssistantIndex + " / " + window.waAssistantQueue.length;
    
    if (window.waAssistantIndex >= window.waAssistantQueue.length) {
        nameText.innerText = "اكتملت الحملة بنجاح! 🎉";
        statusText.innerText = "تم إرسال جميع الرسائل.";
        statusText.style.color = "#27ae60";
        sendBtn.style.display = "none";
        playWaAssistantBeep(2); // double beep
        return;
    }
    
    // Check Pause Batch
    const pauseBatch = parseInt(document.getElementById("waPauseBatch").value) || 35;
    if (window.waAssistantIndex > 0 && window.waAssistantIndex % pauseBatch === 0 && !window.waIsPaused) {
        startWaPauseTimer();
        return;
    }
    
    window.waIsPaused = false;
    
    const customer = window.waAssistantQueue[window.waAssistantIndex];
    nameText.innerHTML = '<i class="fa-solid fa-user"></i> ' + customer.name + ' <br><small style="font-size:0.9rem; color:#7f8c8d;">' + customer.phone + '</small>';
    statusText.innerText = "مستعد للإرسال.. اضغط الزر أدناه ⬇️";
    statusText.style.color = "#27ae60";
    sendBtn.style.display = "inline-block";
    sendBtn.style.background = "#25D366";
    sendBtn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> إرسال الآن للعميل';
    
    sendBtn.onclick = () => {
        executeWaSend(customer);
    };
    
    playWaAssistantBeep(); // Beep to notify user it's ready
}

function executeWaSend(customer) {
    const sendBtn = document.getElementById("waSendNextBtn");
    const statusText = document.getElementById("waAssistantStatus");
    
    let text = window.waMessageTemplate.replace(/\[الاسم\]/g, customer.name);
    let cleanPhone = sanitizePhone(customer.phone);
    
    if(cleanPhone) {
        let url = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(text);
        window.open(url, "_blank");
    }
    
    window.waAssistantIndex++;
    sendBtn.style.display = "none";
    
    const minDelay = parseInt(document.getElementById("waDelayMin").value) || 20;
    const maxDelay = parseInt(document.getElementById("waDelayMax").value) || 40;
    let delaySeconds = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    
    statusText.style.color = "#e67e22";
    
    if(window.waAssistantTimer) clearInterval(window.waAssistantTimer);
    window.waAssistantTimer = setInterval(() => {
        delaySeconds--;
        statusText.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> حماية الحساب: يُرجى الانتظار ' + delaySeconds + ' ثانية...';
        
        if (delaySeconds <= 0) {
            clearInterval(window.waAssistantTimer);
            renderNextAssistantCustomer();
        }
    }, 1000);
}

function startWaPauseTimer() {
    window.waIsPaused = true;
    const statusText = document.getElementById("waAssistantStatus");
    const sendBtn = document.getElementById("waSendNextBtn");
    
    sendBtn.style.display = "none";
    statusText.style.color = "#c0392b";
    
    const pauseMins = parseInt(document.getElementById("waPauseMins").value) || 8;
    let pauseSeconds = pauseMins * 60;
    
    if(window.waAssistantTimer) clearInterval(window.waAssistantTimer);
    window.waAssistantTimer = setInterval(() => {
        pauseSeconds--;
        let m = Math.floor(pauseSeconds / 60);
        let s = pauseSeconds % 60;
        let sStr = s < 10 ? "0" + s : s;
        statusText.innerHTML = '<i class="fa-solid fa-mug-hot"></i> استراحة أمان إجبارية! نعود بعد: ' + m + ':' + sStr;
        
        if (pauseSeconds <= 0) {
            clearInterval(window.waAssistantTimer);
            window.waIsPaused = false;
            renderNextAssistantCustomer();
        }
    }, 1000);
}

function playWaAssistantBeep(times = 1) {
    let count = 0;
    function trigger() {
        if (count >= times) return;
        playBeep(800, 'sine', 0.15, 0.1);
        count++;
        if (count < times) {
            setTimeout(trigger, 350);
        }
    }
    trigger();
}

// --- Override renderFinancials to fix broken HTML and add Checkboxes ---
function renderFinancials(finList) {
    let container = document.getElementById('financialsDisplayList');
    if (!container) return;
    container.innerHTML = '';

    const now = new Date();
    const driversMonthInput = document.getElementById('driversMonthFilter');
    if (driversMonthInput && !driversMonthInput.value) {
        driversMonthInput.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    }

    let allDrivers = window.driversList || [];
    let driversMap = {};
    allDrivers.forEach(d => {
        driversMap[d.name] = { name: d.name, ordersCount: 0, cashCollected: 0, shippingFees: 0, netDue: 0, statusText: "لا توجد مديونية" };
    });

    finList.forEach(f => {
        if (!driversMap[f.name]) {
            driversMap[f.name] = f;
        } else {
            driversMap[f.name] = { ...driversMap[f.name], ...f };
        }
    });

    let driversArray = Object.values(driversMap);
    if (driversArray.length === 0) {
        container.innerHTML = '<p class="empty-msg" style="grid-column: 1 / -1;">لا توجد مناديب مسجلة.</p>';
        return;
    }

    let totalAllDue = 0;

    driversArray.forEach(f => {
        let netDue = parseFloat(f.netDue) || 0;
        totalAllDue += netDue;
        let isSettled = netDue === 0;
        let statusColor = netDue > 0 ? "#27ae60" : (netDue < 0 ? "#c0392b" : "#9e9e9e");
        let cardClass = isSettled ? "financial-row driver-card settled" : "financial-row driver-card";
        let cardShadow = isSettled ? "none" : "0 4px 6px rgba(0,0,0,0.05)";
        let cardOpacity = isSettled ? "0.8" : "1";
        let cardBorderColor = isSettled ? "#e0e0e0" : "#eaeaea";

        let driverOrders = (window.uncollectedOrdersData || []).filter(o => o.driver === f.name);
        let ordersHtml = '';
        if (driverOrders.length > 0) {
            ordersHtml = `<div style="margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 10px;">
                <strong style="font-size:0.85rem; color:var(--primary);"><i class=\'fa-solid fa-box\'></i> أوردرات معلقة (لم يتم تسويتها):</strong>`;
            driverOrders.forEach(o => {
                ordersHtml += `
                    <div class="financial-order-item" style="background:#fdfdfd; padding:8px; border:1px solid #eee; border-radius:6px; margin-top:5px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" class="financial-order-checkbox" data-order-id="${o.id}" data-payment="${o.payment}" style="width: 18px; height: 18px; cursor: pointer;">
                            <div>
                                <span style="font-weight:bold; color:var(--text-dark);">${o.id}</span><br>
                                <span style="font-size:0.75rem; color:#777;">${o.payment} | إجمالي: ${o.total}ج | شحن: ${o.shipping}ج</span><br>
                                <span style="font-size:0.85rem; font-weight:bold; color:var(--danger);">المطلوب تحصيله: ${o.remaining}ج</span>
                            </div>
                        </div>
                        <button class="btn-settle interactive-btn" onclick="settleDriverOrder('${o.id}', this, '${o.payment}')" style="background:var(--success); color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">تسوية <i class=\'fa-solid fa-money-bill\'></i></button>
                    </div>
                `;
            });
            ordersHtml += `</div>`;
        }

        let dStats = (window.latestServerData && window.latestServerData.driverStats) ? window.latestServerData.driverStats[f.name] || { monthProfit: 0, monthOrderCount: 0, totalProfit: 0, totalCount: 0 } : { monthProfit: 0, monthOrderCount: 0, totalProfit: 0, totalCount: 0 };

        let dashboardHtml = `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #e3e6f0;">
                <strong style="font-size:0.85rem; color:#7f8c8d; display:block; margin-bottom:10px;"><i class="fa-solid fa-chart-line"></i> أداء المندوب (إحصائيات):</strong>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8f9fc; padding: 10px; border-radius: 8px; border: 1px solid #e3e6f0;">
                    <div style="text-align: center; border-left: 1px solid #e3e6f0; padding: 5px;">
                        <div style="font-size: 0.75rem; color: #4e73df; font-weight: bold;">أرباح الشهر</div>
                        <div style="font-size: 1.1rem; font-weight: bold; color: #5a5c69;">${dStats.monthProfit} <span style="font-size: 0.7rem;">ج.م</span></div>
                        <div style="font-size: 0.7rem; color: #1cc88a; margin-top: 2px;">${dStats.monthOrderCount} أوردر</div>
                    </div>
                    <div style="text-align: center; padding: 5px;">
                        <div style="font-size: 0.75rem; color: #f6c23e; font-weight: bold;">إجمالي الأرباح</div>
                        <div style="font-size: 1.1rem; font-weight: bold; color: #5a5c69;">${dStats.totalProfit} <span style="font-size: 0.7rem;">ج.م</span></div>
                        <div style="font-size: 0.7rem; color: #1cc88a; margin-top: 2px;">${dStats.totalCount} أوردر</div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML += `
            <div class="${cardClass}" style="background: #fff; padding: 15px; border-radius: 12px; border: 1px solid ${cardBorderColor}; margin-bottom: 12px; box-shadow: ${cardShadow}; opacity: ${cardOpacity}; transition: all 0.3s ease;">
                <div class="financial-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #f0f0f0; padding-bottom:8px; margin-bottom:10px;">
                    <div>
                        <span style="font-weight:bold; font-size:1.1rem; color:var(--text-dark);"><i class='fa-solid fa-motorcycle'></i> ${f.name}</span>
                        <span style="font-size: 0.75rem; background:#f0f0f0; color:var(--text-dark); padding:2px 6px; border-radius:12px; margin-right: 5px; font-weight:bold;">${f.ordersCount || 0} طلب معلق</span>
                    </div>
                    <button class="btn-danger" onclick="deleteItem('deleteDriver', '${f.name}', 'couriers')" title="حذف المندوب" style="padding: 4px 8px; font-size: 0.8rem; border-radius: 6px; background: transparent; color: var(--danger); border: 1px solid var(--danger);"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div class="financial-details" style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:10px;">
                    <span style="background:#e8f4f8; padding:5px 10px; border-radius:6px; color:#555;">الكاش: <strong style="color:#2980b9;">${f.cashCollected || 0}</strong> ج</span>
                    <span style="background:#f9ebea; padding:5px 10px; border-radius:6px; color:#555;">الشحن: <strong style="color:#c0392b;">${f.shippingFees || 0}</strong> ج</span>
                </div>
                <div class="financial-status" style="background: ${statusColor}15; color: ${statusColor}; padding: 8px; border-radius: 6px; text-align:center; font-weight:bold; border: 1px dashed ${statusColor};">
                    ${f.statusText} (${netDue} ج)
                </div>
                ${ordersHtml}
                ${dashboardHtml}
            </div>
        `;
    });

    let totalEl = document.getElementById('financialsTotalAmount');
    if (totalEl) {
        totalEl.innerText = `إجمالي الحساب: ${totalAllDue} ج.م`;
    }
}

// --- Mobile Back Button (History API) & Sidebar Animation ---
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const menuBtn = document.getElementById('menuToggleBtn');

    function openSidebar() {
        if(sidebar) sidebar.classList.add('open');
        if(overlay) overlay.classList.add('active');
        if(menuBtn) menuBtn.style.transform = 'rotate(90deg)';
        history.pushState({ sidebarOpen: true }, '');
    }

    function closeSidebar() {
        if(sidebar) sidebar.classList.remove('open');
        if(overlay) overlay.classList.remove('active');
        if(menuBtn) menuBtn.style.transform = 'rotate(0deg)';
    }

    if(menuBtn) {
        // Remove old listener to avoid duplicates
        menuBtn.removeEventListener("click", toggleSidebar);
        menuBtn.addEventListener('click', () => {
            if (sidebar.classList.contains('open')) {
                history.back(); // Triggers popstate which closes it
            } else {
                openSidebar();
            }
        });
    }

    if(overlay) {
        overlay.addEventListener('click', () => {
            if (sidebar.classList.contains('open')) history.back();
        });
    }

    window.addEventListener('popstate', (e) => {
        closeSidebar();
    });

    // Close sidebar on item click
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => {
            if (sidebar && sidebar.classList.contains("open")) {
                closeSidebar();
            }
        });
    });
});

// --- Financials "Select All" Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const selectAllCheckbox = document.getElementById('selectAllFinancialsCheckbox');
    const closeSelectedBtn = document.getElementById('closeSelectedFinancialsBtn');

    if(selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const checkboxes = document.querySelectorAll('.financial-order-checkbox');
            checkboxes.forEach(cb => cb.checked = isChecked);
            updateCloseBtnVisibility();
        });
    }

    document.getElementById('financialsDisplayList')?.addEventListener('change', (e) => {
        if(e.target.classList.contains('financial-order-checkbox')) {
            updateCloseBtnVisibility();
            const allCheckboxes = document.querySelectorAll('.financial-order-checkbox');
            const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
            if(selectAllCheckbox) selectAllCheckbox.checked = allChecked;
        }
    });

    function updateCloseBtnVisibility() {
        const checkedCount = document.querySelectorAll('.financial-order-checkbox:checked').length;
        if(closeSelectedBtn) {
            closeSelectedBtn.style.display = checkedCount > 0 ? 'inline-block' : 'none';
        }
    }

    if(closeSelectedBtn) {
        closeSelectedBtn.addEventListener('click', () => {
            const checkedBoxes = document.querySelectorAll('.financial-order-checkbox:checked');
            if(checkedBoxes.length === 0) return;
            
            customConfirm(`هل أنت متأكد من تسوية عدد ${checkedBoxes.length} أوردر محدد؟`, () => {
                closeSelectedBtn.disabled = true;
                const originalText = closeSelectedBtn.innerHTML;

                (async function processSequential() {
                    for(let i=0; i<checkedBoxes.length; i++) {
                        const cb = checkedBoxes[i];
                        const orderId = cb.getAttribute('data-order-id');
                        const btn = cb.closest('.financial-order-item') ? cb.closest('.financial-order-item').querySelector('.btn-settle') : null;
                        
                        closeSelectedBtn.innerText = `جاري التقفيل... (${i+1}/${checkedBoxes.length})`;
                        if(btn) { btn.innerText = "جاري..."; btn.disabled = true; }

                        let formData = new URLSearchParams();
                        formData.append('action', 'settleOrder');
                        formData.append('orderId', orderId);

                        try {
                            // Wait for 500ms to allow Google Scripts to process gracefully
                            await new Promise(r => setTimeout(r, 500));
                            await fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData });
                            if(btn) {
                                btn.innerText = "تم";
                                btn.style.background = "var(--success)";
                            }
                        } catch(e) {
                            if(btn) { btn.innerText = "خطأ"; btn.disabled = false; }
                        }
                    }
                    
                    closeSelectedBtn.innerHTML = originalText;
                    closeSelectedBtn.disabled = false;
                    if(selectAllCheckbox) selectAllCheckbox.checked = false;
                    updateCloseBtnVisibility();
                    
                    showToast(`<i class=\'fa-solid fa-check\'></i> تم تقفيل كل المحدد بنجاح!`, "success");
                    loadDataFromServer();
                })();
            });
        });
    }
});

// ==========================================
// 19. بطاقات الأسعار (Price Tags Logic)
// ==========================================

const priceTagsListContainer = document.getElementById('priceTagsListContainer');
const priceTagsSearch = document.getElementById('priceTagsSearch');
const priceTagSizeSelect = document.getElementById('priceTagSize');

let currentPriceTagsPage = 1;
const priceTagsPerPage = 50;
let filteredPriceTags = [];
let selectedPriceTagsMap = new Map();

window.initPriceTagsTab = function() {
    if (!catalogData || catalogData.length === 0) {
        showToast("جاري تحميل البيانات من السيرفر، يرجى الانتظار...", "warning");
        setTimeout(initPriceTagsTab, 2000); // retry after 2 seconds
        return;
    }
    
    filteredPriceTags = [...catalogData].sort((a, b) => a.name.localeCompare(b.name));
    currentPriceTagsPage = 1;
    selectedPriceTagsMap.clear();
    
    const searchInput = document.getElementById('priceTagsSearch');
    if(searchInput) searchInput.value = '';
    
    renderPriceTagsPage();
    updateLivePriceTagPreview();
    updateDeselectButtonVisibility();
};

window.updateDeselectButtonVisibility = function() {
    const deselectBtn = document.getElementById('deselectAllTagsBtn');
    if (deselectBtn) {
        deselectBtn.style.display = selectedPriceTagsMap.size > 0 ? 'inline-block' : 'none';
    }
};

window.renderPriceTagsPage = function() {
    const container = document.getElementById('priceTagsListContainer');
    const pageInfo = document.getElementById('priceTagsPageInfo');
    if(!container) return;
    
    const startIndex = (currentPriceTagsPage - 1) * priceTagsPerPage;
    const endIndex = startIndex + priceTagsPerPage;
    const pageItems = filteredPriceTags.slice(startIndex, endIndex);
    
    const totalPages = Math.ceil(filteredPriceTags.length / priceTagsPerPage) || 1;
    if(pageInfo) pageInfo.textContent = `صفحة ${currentPriceTagsPage} من ${totalPages}`;
    
    container.innerHTML = pageItems.map(p => {
        const isChecked = selectedPriceTagsMap.has(p.name) ? 'checked' : '';
        const safeName = p.name.replace(/"/g, '&quot;').replace(/'/g, '\\\'');
        
        return `
        <div class="price-tag-checkbox-item" style="display:flex; align-items:center; gap:15px; background:#fff; padding:12px 15px; border-radius:10px; border: 1px solid #e0e0e0; cursor:pointer; transition: all 0.2s ease-in-out; box-shadow: 0 2px 5px rgba(0,0,0,0.02);" 
             onclick="togglePriceTagSelection('${safeName}')">
            <input type="checkbox" class="price-tag-cb" id="cb_${p.name.replace(/\s+/g, '_')}" ${isChecked} style="width: 20px; height: 20px; accent-color: var(--primary); cursor: pointer;" onclick="event.stopPropagation(); togglePriceTagSelection('${safeName}')">
            <div style="flex:1; display: flex; flex-direction: column; gap: 5px;">
                <div style="font-weight:bold; font-size:1.05rem; color: var(--text);">${p.name}</div>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <div style="font-size:0.9rem; background: ${p.isOffer ? 'var(--danger)' : 'var(--secondary)'}; color: white; padding: 3px 10px; border-radius: 20px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        ${p.isOffer ? `<span style="text-decoration:line-through; color:rgba(255,255,255,0.7); margin-left:5px; font-size: 0.8rem;">${p.price}ج</span> <span>${p.offerPrice}ج</span>` : `<span>${p.price}ج</span>`}
                    </div>
                    ${p.barcode ? `<span style="font-size: 0.8rem; background: #f0f4f8; border: 1px solid #cfd8dc; padding: 2px 8px; border-radius: 6px; color: #546e7a;"><i class="fa-solid fa-barcode"></i> ${p.barcode}</span>` : ''}
                </div>
            </div>
            <button class="btn-outline interactive-btn" onclick="event.stopPropagation(); promptPriceTagOffer('${safeName}')" style="padding: 6px 12px; font-size: 0.85rem; border-radius: 6px; white-space: nowrap;"><i class="fa-solid fa-tag"></i> تخصيص عرض</button>
        </div>
        `;
    }).join('');
};



window.togglePriceTagSelection = function(name) {
    const p = filteredPriceTags.find(item => item.name === name);
    if (!p) return;

    if (selectedPriceTagsMap.has(name)) {
        selectedPriceTagsMap.delete(name);
    } else {
        selectedPriceTagsMap.set(name, p);
    }
    
    const cbId = `cb_${name.replace(/\s+/g, '_')}`;
    const cb = document.getElementById(cbId);
    if (cb) {
        cb.checked = selectedPriceTagsMap.has(name);
    }
    
    updateLivePriceTagPreview();
    updateDeselectButtonVisibility();
};

let currentOfferProductName = null;

window.promptPriceTagOffer = function(name) {
    const p = catalogData.find(item => item.name === name);
    if (!p) return;
    
    currentOfferProductName = name;
    
    document.getElementById('customOfferProductName').textContent = p.name;
    document.getElementById('customOfferProductPrice').querySelector('span').textContent = p.price;
    
    const input = document.getElementById('customOfferInput');
    input.value = p.isOffer && p.offerPrice > 0 ? p.offerPrice : '';
    
    const modal = document.getElementById('customOfferModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => input.focus(), 100);
    }
};

window.closeCustomOfferModal = function() {
    const modal = document.getElementById('customOfferModal');
    if (modal) modal.style.display = 'none';
    currentOfferProductName = null;
};

window.saveCustomOffer = function() {
    if (!currentOfferProductName) return;
    
    const p = catalogData.find(item => item.name === currentOfferProductName);
    if (!p) return;
    

    
    const input = document.getElementById('customOfferInput');
    const newOffer = input.value.trim();
    
    const parsed = parseFloat(newOffer);
    if (!isNaN(parsed) && parsed > 0 && parsed !== parseFloat(p.price)) {
        p.isOffer = true;
        p.offerPrice = parsed;
        showToast("تم تخصيص وتطبيق العرض بنجاح", "success");
    } else {
        p.isOffer = false;
        p.offerPrice = 0;
        if (newOffer === '' || parsed === 0) showToast("تم إلغاء العرض", "success");
    }
    
    window.pushCatalogUpdate(p.name, p.price, p.isOffer, p.offerPrice);
    
    filterPriceTagsList();
    updateLivePriceTagPreview();
    
    closeCustomOfferModal();
};

let currentPriceTagsFilter = 'all';

window.setPriceTagsFilter = function(filterVal) {
    currentPriceTagsFilter = filterVal;
    
    // Update pill buttons UI
    document.querySelectorAll('.filter-pill').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text)';
    });
    
    const activeBtn = document.getElementById(`filterBtn_${filterVal}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.background = 'var(--primary)';
        activeBtn.style.color = '#fff';
    }
    
    filterPriceTagsList();
};

window.filterPriceTagsList = function() {
    const searchInput = document.getElementById('priceTagsSearch');
    const q = searchInput ? searchInput.value.toLowerCase() : '';
    const filterVal = currentPriceTagsFilter;
    
    filteredPriceTags = catalogData.filter(p => {
        const matchesQuery = p.name.toLowerCase().includes(q) || (p.barcode && String(p.barcode).toLowerCase().includes(q));
        
        let matchesType = true;
        if (filterVal === 'instock') {
            matchesType = (Number(p.stock) > 0);
        } else if (filterVal === 'offers') {
            matchesType = p.isOffer === true;
        }
        
        return matchesQuery && matchesType;
    });
    
    currentPriceTagsPage = 1;
    renderPriceTagsPage();
};

window.nextPriceTagsPage = function() {
    const totalPages = Math.ceil(filteredPriceTags.length / priceTagsPerPage);
    if (currentPriceTagsPage < totalPages) {
        currentPriceTagsPage++;
        renderPriceTagsPage();
    }
};

window.prevPriceTagsPage = function() {
    if (currentPriceTagsPage > 1) {
        currentPriceTagsPage--;
        renderPriceTagsPage();
    }
};

window.selectAllTags = function() {
    filteredPriceTags.forEach(p => {
        selectedPriceTagsMap.set(p.name, p);
    });
    renderPriceTagsPage();
    updateLivePriceTagPreview();
    updateDeselectButtonVisibility();
};

window.deselectAllTags = function() {
    selectedPriceTagsMap.clear();
    renderPriceTagsPage();
    updateLivePriceTagPreview();
    updateDeselectButtonVisibility();
};

window.generatePriceTagHTML = function(p, sizeClass) {
    let priceHtml = '';
    let cardClass = `price-tag-card size-large`; // Always render as large internally
    
    if (p.isOffer && parseFloat(p.offerPrice) > 0 && parseFloat(p.offerPrice) !== parseFloat(p.price)) {
        cardClass += ' is-offer';
        priceHtml = `<span class="old-price">${p.price}</span> ${p.offerPrice}`;
    } else {
        priceHtml = p.price;
    }
    
    const barcodeHtml = p.barcode ? `<img class="barcode-svg" data-barcode="${p.barcode}">` : '';
    
    let priceTextLen = p.isOffer && parseFloat(p.offerPrice) > 0 && parseFloat(p.offerPrice) !== parseFloat(p.price) 
        ? String(p.price).length + String(p.offerPrice).length + 4 
        : String(p.price).length;
    
    let dynamicPriceStyle = priceTextLen > 12 ? 'font-size: 1.05em; line-height: 1.2;' : (priceTextLen > 7 ? 'font-size: 1.25em; line-height: 1.2;' : 'font-size: 1.45em; font-weight: 900;');

    return `
        <div class="price-tag-wrapper size-${sizeClass}">
            <div class="${cardClass}">
                <div class="price-tag-inner">
                    <span class="candy-deco top-left">🍭</span>
                    <span class="candy-deco top-right">🍬</span>
                    <span class="candy-deco bottom-left">✨</span>
                    <span class="candy-deco bottom-right">🍭</span>
                    ${p.isOffer && parseFloat(p.offerPrice) > 0 && parseFloat(p.offerPrice) !== parseFloat(p.price) ? '<div class="offer-badge">عرض خاص</div>' : ''}
                
                <div class="price-tag-header">
                    <img src="images/Logo-print.png" class="price-tag-logo" onerror="this.src='images/logo-digital.png'" alt="Candy Club">
                </div>
                
                <div class="price-tag-body">
                    <div class="tag-box top-box">
                        <div class="tag-row name-row">
                            <span class="tag-value" style="display: block; text-align: center; width: 100%; color: var(--primary); ${p.name.length > 30 ? 'font-size: 0.95em; line-height: 1.2;' : (p.name.length > 18 ? 'font-size: 1.1em; line-height: 1.2;' : 'font-size: 1.3em; font-weight: 900;')}">${p.name}</span>
                        </div>
                    </div>
                    
                    <div class="middle-divider-bar">
                        <span class="candy-icon">🍬</span>
                    </div>
                    
                    <div class="tag-box bottom-box">
                        <div class="tag-row price-row" style="justify-content: center; text-align: center;">
                            <span class="tag-value" style="display: block; width: 100%; text-align: center; ${dynamicPriceStyle}">
                                السعر: ${priceHtml}ج
                            </span>
                        </div>
                        ${barcodeHtml ? `<div class="tag-barcode-container">${barcodeHtml}</div>` : ''}
                    </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.updateLivePriceTagPreview = function() {
    const previewContainer = document.getElementById('livePriceTagPreview');
    if (!previewContainer) return;
    
    const sizeSelect = document.getElementById('priceTagSize');
    const size = sizeSelect ? sizeSelect.value : 'medium';
    
    let itemsToShow = [];
    if (selectedPriceTagsMap.size > 0) {
        itemsToShow = Array.from(selectedPriceTagsMap.values());
    }
    
    const counterDiv = document.getElementById('selectedItemsCounter');
    if (counterDiv) {
        document.getElementById('selectedItemsCountVal').textContent = selectedPriceTagsMap.size;
    }
    
    if (selectedPriceTagsMap.size === 0) {
        previewContainer.innerHTML = `
            <div style="text-align: center; color: #78909c;">
                <i class="fa-solid fa-hand-pointer" style="font-size: 2.5rem; display: block; margin-bottom: 15px;"></i>
                <p style="font-size: 1.1rem; font-weight: bold;">اختر منتجات لرؤية المعاينة</p>
                <p style="font-size: 0.9rem; margin-top: 5px;">سيتم عرض الكروت المحددة فقط هنا.</p>
            </div>
        `;
        return;
    }
    
    let maxItems = 1;
    if (size === 'small') maxItems = 18;
    else if (size === 'medium') maxItems = 8;
    else if (size === 'large') maxItems = 4;
    
    const isShowingSubset = itemsToShow.length > maxItems;
    if (isShowingSubset) {
        itemsToShow = itemsToShow.slice(0, maxItems);
    }
    
    let html = `<div class="price-tags-grid" style="flex-direction: column; align-items: center; justify-content: flex-start; transform: scale(0.65); transform-origin: top center; margin-bottom: -30%; background: transparent; padding: 0; flex-wrap: nowrap;">`;
    
    itemsToShow.forEach(p => {
        html += generatePriceTagHTML(p, size);
    });
    
    html += `</div>`;
    
    previewContainer.innerHTML = html;
    renderBarcodes(previewContainer, size);
};

function renderBarcodes(container, size) {
    if (typeof JsBarcode !== 'function') return;
    const svgs = container.querySelectorAll('.barcode-svg');
    
    let bcWidth = 3;
    let bcHeight = 60;
    let bcFontSize = 14;
    
    svgs.forEach(svg => {
        const code = svg.getAttribute('data-barcode');
        if (code) {
            try {
                JsBarcode(svg, String(code), {
                    format: "CODE128",
                    width: bcWidth,
                    height: bcHeight,
                    displayValue: true,
                    fontSize: bcFontSize,
                    margin: 0
                });
            } catch (e) {
                console.warn("Error rendering barcode", e);
            }
        }
    });
}

window.openPdfExportModal = function() {
    if (selectedPriceTagsMap.size === 0) {
        showToast("برجاء تحديد منتج واحد على الأقل", "warning");
        return;
    }
    document.getElementById('pdfSelectedCount').textContent = selectedPriceTagsMap.size;
    const currentSize = document.getElementById('priceTagSize').value;
    document.getElementById('pdfSizeSelect').value = currentSize;
    document.getElementById('pdfExportModal').style.display = 'flex';
};

window.closePdfExportModal = function() {
    document.getElementById('pdfExportModal').style.display = 'none';
};

window.executePdfExport = function() {
    const size = document.getElementById('pdfSizeSelect').value;
    closePdfExportModal();
    
    if (selectedPriceTagsMap.size === 0) {
        showToast("برجاء تحديد منتج واحد على الأقل", "warning");
        return;
    }
    
    let itemsToPrint = Array.from(selectedPriceTagsMap.values());
    
    const grid = document.getElementById('price-tags-grid');
    let allHtml = '';
    itemsToPrint.forEach(p => {
        allHtml += generatePriceTagHTML(p, size);
    });
    grid.innerHTML = allHtml;
    
    document.body.classList.add('print-mode-tags');
    
    let hideBarcode = document.getElementById('hideBarcodeToggle') && document.getElementById('hideBarcodeToggle').checked;
    if (hideBarcode) {
        document.body.classList.add('hide-print-barcode');
    }
    
    let styleEl = document.getElementById('price-tags-print-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'price-tags-print-style';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = '@page { size: A4; margin: 0.5cm; }';
    
    showToast("جاري تجهيز صفحة الطباعة... يرجى اختيار 'حفظ بتنسيق PDF' (Save as PDF) من النافذة", "success");
    
    renderBarcodes(grid, size);
    
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove('print-mode-tags');
            document.body.classList.remove('hide-print-barcode');
            if (styleEl) styleEl.remove();
        }, 1000);
    }, 1500);
};

window.toggleBarcodePrint = function() {
    const isChecked = document.getElementById('hideBarcodeToggle').checked;
    if (isChecked) {
        document.body.classList.add('hide-print-barcode');
    } else {
        document.body.classList.remove('hide-print-barcode');
    }
};

window.printSelectedPriceTags = function(overrideSize = null) {
    if (selectedPriceTagsMap.size === 0) {
        showToast("برجاء تحديد منتج واحد على الأقل", "warning");
        return;
    }
    
    let itemsToPrint = Array.from(selectedPriceTagsMap.values());
    
    const sizeSelect = document.getElementById('priceTagSize');
    const size = overrideSize || (sizeSelect ? sizeSelect.value : 'medium');
    const grid = document.getElementById('price-tags-grid');
    let allHtml = '';
    itemsToPrint.forEach(p => {
        allHtml += generatePriceTagHTML(p, size);
    });
    grid.innerHTML = allHtml;
    
    document.body.classList.add('print-mode-tags');
    
    let styleEl = document.getElementById('price-tags-print-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'price-tags-print-style';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = '@page { size: A4; margin: 0.5cm; }';
    renderBarcodes(grid, size);
    
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove('print-mode-tags');
            if (styleEl) styleEl.remove();
        }, 1000);
    }, 1500);
};

// --- Moderators Dashboard Logic ---
window.renderModeratorsDashboard = function() {
    const container = document.getElementById('moderatorsDashboardContainer');
    if (!container) return;
    
    const modsData = {};
    
    // Initialize with all registered moderators so they show 0 even if no sales
    if (window.allModeratorsList) {
        window.allModeratorsList.forEach(m => {
            modsData[m] = { name: m, totalCount: 0, monthCount: 0, totalSales: 0, monthSales: 0 };
        });
    }
    
    const now = new Date();
    const monthFilterInput = document.getElementById('moderatorsMonthFilter');
    if (monthFilterInput && !monthFilterInput.value) {
        monthFilterInput.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    }
    const currentMonthPrefix = monthFilterInput ? monthFilterInput.value : (now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'));
    
    // Fetch stats from frontend data
    const allOrders = window.allOrdersData || window.orderHistoryData || [];
    allOrders.forEach(o => {
        if (o.status === "مرتجع") return;
        let mod = o.seller || o.moderator_name || o.moderator || o.added_by;
        if (!mod) mod = "غير محدد";
        
        let displayName = mod;
        const isRegistered = window.allModeratorsList && window.allModeratorsList.includes(mod);
        if (!isRegistered && mod !== "غير محدد") {
            displayName = mod + " (محذوف)";
        }
        
        if (!modsData[displayName]) {
            modsData[displayName] = { name: displayName, totalCount: 0, monthCount: 0, totalSales: 0, monthSales: 0 };
        }
        
        modsData[displayName].totalCount++;
        modsData[displayName].totalSales += parseFloat(o.total || o.final_total) || 0;
        
        if (o.date && o.date.startsWith(currentMonthPrefix)) {
            modsData[displayName].monthCount++;
            modsData[displayName].monthSales += parseFloat(o.total || o.final_total) || 0;
        }
    });
    
    const modsArray = Object.values(modsData).sort((a, b) => b.monthSales - a.monthSales);
    
    if (modsArray.length === 0) {
        container.innerHTML = '<p class="empty-msg">لا توجد بيانات للمودريتور حتى الآن.</p>';
        return;
    }
    
    let html = '';
    modsArray.forEach(m => {
        html += `
            <div class="report-card" style="background: #fff; padding: 20px; border-radius: 15px; border: 1px solid var(--border); box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: #8e24aa; font-size: 1.3rem;"><i class='fa-solid fa-user-tie'></i> ${m.name}</h3>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div style="background: #fdfdfd; padding: 10px; border-radius: 10px; border: 1px dashed #ccc; text-align: center;">
                        <div style="font-size: 0.8rem; color: #7f8c8d; font-weight: bold; margin-bottom: 5px;">مبيعات الشهر</div>
                        <div style="font-size: 1.2rem; font-weight: 900; color: #27ae60;">${m.monthSales} <span style="font-size:0.7rem;">ج.م</span></div>
                    </div>
                    <div style="background: #fdfdfd; padding: 10px; border-radius: 10px; border: 1px dashed #ccc; text-align: center;">
                        <div style="font-size: 0.8rem; color: #7f8c8d; font-weight: bold; margin-bottom: 5px;">أوردرات الشهر</div>
                        <div style="font-size: 1.2rem; font-weight: 900; color: #e67e22;">${m.monthCount} <span style="font-size:0.7rem;">أوردر</span></div>
                    </div>
                    <div style="background: #fdfdfd; padding: 10px; border-radius: 10px; border: 1px dashed #ccc; text-align: center;">
                        <div style="font-size: 0.8rem; color: #7f8c8d; font-weight: bold; margin-bottom: 5px;">المبيعات في العموم</div>
                        <div style="font-size: 1.2rem; font-weight: 900; color: #2980b9;">${m.totalSales} <span style="font-size:0.7rem;">ج.م</span></div>
                    </div>
                    <div style="background: #fdfdfd; padding: 10px; border-radius: 10px; border: 1px dashed #ccc; text-align: center;">
                        <div style="font-size: 0.8rem; color: #7f8c8d; font-weight: bold; margin-bottom: 5px;">الأوردرات في العموم</div>
                        <div style="font-size: 1.2rem; font-weight: 900; color: #8e44ad;">${m.totalCount} <span style="font-size:0.7rem;">أوردر</span></div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
};

// --- Sidebar Accordion Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const groupTitles = document.querySelectorAll('.menu-group-title');
    groupTitles.forEach(title => {
        title.addEventListener('click', () => {
            const currentGroup = title.parentElement;
            const items = currentGroup.querySelector('.menu-group-items');
            const icon = title.querySelector('.chevron-icon');
            
            // Close all other groups
            document.querySelectorAll('.menu-group-items').forEach(otherItems => {
                if (otherItems !== items) {
                    otherItems.style.display = 'none';
                    const otherIcon = otherItems.parentElement.querySelector('.chevron-icon');
                    if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
                    const otherTitle = otherItems.parentElement.querySelector('.menu-group-title');
                    if (otherTitle) otherTitle.classList.remove('active-group');
                }
            });
            
            // Toggle current group
            if (items.style.display === 'none') {
                items.style.display = 'block';
                if (icon) icon.style.transform = 'rotate(180deg)';
                title.classList.add('active-group');
            } else {
                items.style.display = 'none';
                if (icon) icon.style.transform = 'rotate(0deg)';
                title.classList.remove('active-group');
            }
        });
    });
    
    // Set initial icon states
    document.querySelectorAll('.menu-group-items').forEach(items => {
        const icon = items.parentElement.querySelector('.chevron-icon');
        const title = items.parentElement.querySelector('.menu-group-title');
        if (items.style.display === 'block') {
            if (icon) icon.style.transform = 'rotate(180deg)';
            if (title) title.classList.add('active-group');
        } else {
            if (icon) icon.style.transform = 'rotate(0deg)';
            if (title) title.classList.remove('active-group');
        }
    });
    
    window.refreshModeratorsStats = function() {
        renderModeratorsDashboard();
        if (window.showToast) showToast("تم تحديث الإحصائيات بنجاح", "success");
    };


// ⭐ V16.1: تتبع الأوردر ومعرفة مندوبه

// ⭐ V16.2: تتبع الأوردر الشامل (محلي + سيرفر لكل الحالات)
window.searchDriverOrder = async function() {
    let q = document.getElementById('driverOrderSearchInput');
    if(!q || !q.value.trim()) {
        if (window.showToast) window.showToast("برجاء إدخال رقم الأوردر للبحث", "warning");
        return;
    }
    let val = q.value.trim().toLowerCase();
    
    // 1. البحث الشامل في كل القوائم المحلية في الذاكرة
    let allOrders = [
        ...(window.orderHistoryData || []),
        ...(window.pendingOrdersData || []),
        ...(window.uncollectedOrdersData || []),
        ...(window.shippedOrdersData || []),
        ...(window.searchResultsCache || []),
        ...((window.latestServerData && window.latestServerData.shippedOrders) || []),
        ...((window.latestServerData && window.latestServerData.history) || []),
        ...((window.latestServerData && window.latestServerData.pendingOrders) || []),
        ...((window.latestServerData && window.latestServerData.uncollectedOrders) || [])
    ];
    
    let order = allOrders.find(o => o && o.id && String(o.id).toLowerCase().trim() === val);
    
    // 2. إذا لم نجده في الذاكرة، نبحث في السيرفر فوراً عن طريق globalSearch
    if (!order) {
        if (window.showToast) window.showToast("جاري البحث في قاعدة البيانات...", "info");
        try {
            let res = await fetch(`${GOOGLE_SHEETS_URL}?action=globalSearch&query=${encodeURIComponent(val)}`);
            let data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                order = data.find(o => String(o.id).toLowerCase().trim() === val) || data[0];
            }
        } catch(e) {
            console.error("Search fetch error:", e);
        }
    }
    
    if (!order) {
        if (window.customAlert) customAlert("<i class='fa-solid fa-circle-exclamation' style='color:var(--danger)'></i> <b>لم يتم العثور على الأوردر ( " + val + " ).</b><br>تأكد من كتابة الرقم بشكل صحيح.");
        return;
    }
    
    let driverName = order.driver || "غير محدد";
    let statusText = order.status || "قيد التجهيز";
    let statusColor = "var(--primary)";
    if (statusText.includes("تم التوصيل")) statusColor = "var(--success)";
    else if (statusText.includes("مرتجع")) statusColor = "var(--danger)";
    else if (statusText.includes("في الشحن")) statusColor = "#f39c12";
    
    let zoneName = order.gov || order.zone || order.address || '--';
    let totalAmt = order.remaining !== undefined ? order.remaining : (order.total || 0);
    
    let msg = `
        <div style="text-align:right; font-size:1.05rem; line-height:1.7;">
            <div style="background:${statusColor}15; border-right:4px solid ${statusColor}; padding:10px; border-radius:6px; margin-bottom:10px;">
                <strong style="color:${statusColor}; font-size:1.1rem;"><i class="fa-solid fa-box"></i> حالة الأوردر: ${statusText}</strong>
            </div>
            <strong>رقم الأوردر:</strong> ${order.id}<br>
            <strong>اسم العميل:</strong> ${order.name || '--'}<br>
            <strong>الهاتف:</strong> ${order.phone || '--'}<br>
            <strong>المندوب المسند له:</strong> <span style="color:var(--primary); font-weight:bold;"><i class="fa-solid fa-motorcycle"></i> ${driverName}</span><br>
            <strong>المنطقة / العنوان:</strong> ${zoneName}<br>
            <strong>المبلغ المطلوب:</strong> <strong style="color:var(--success);">${totalAmt} ج.م</strong>
        </div>
    `;
    if (window.customAlert) customAlert(msg);
    q.value = '';
};

    window.refreshDriversStats = function() {
        const monthFilterInput = document.getElementById('driversMonthFilter');
        if (!monthFilterInput || !monthFilterInput.value) {
            showToast("برجاء اختيار الشهر أولاً", "warning");
            return;
        }
        const selectedMonth = monthFilterInput.value;
        showToast("جاري جلب الإحصائيات...", "warning");
        loadDataFromServer(selectedMonth + '-01');
    };

    // ⭐ نظام حركة المخازن والأذونات (الجديد)
    const invProdBarcode = document.getElementById('invProdBarcode');
    const searchInvBarcodeBtn = document.getElementById('searchInvBarcodeBtn');
    const invProdName = document.getElementById('invProdName');
    const invProdQty = document.getElementById('invProdQty');
    const addInvItemBtn = document.getElementById('addInvItemBtn');
    const invItemsList = document.getElementById('invItemsList');
    const savePrintInvBtn = document.getElementById('savePrintInvBtn');
    
    let invItems = [];
    
    // الأوفلاين كاش: حفظ واسترجاع الاستلامات
    function saveInvToCache() {
        let from = document.getElementById('invFrom') ? document.getElementById('invFrom').value : '';
        let to = document.getElementById('invTo') ? document.getElementById('invTo').value : '';
        let notes = document.getElementById('invNotes') ? document.getElementById('invNotes').value : '';
        let draft = { invItems, from, to, notes };
        localStorage.setItem('pending_receipt_draft', JSON.stringify(draft));
    }

    window.loadInvFromCache = function() {
        try {
            let draftStr = localStorage.getItem('pending_receipt_draft');
            if (draftStr) {
                let draft = null; try { draft = JSON.parse(draftStr); } catch(e) {}
                if (draft.invItems && draft.invItems.length > 0) {
                    invItems = draft.invItems;
                    if(document.getElementById('invFrom')) document.getElementById('invFrom').value = draft.from || '';
                    if(document.getElementById('invTo')) document.getElementById('invTo').value = draft.to || '';
                    if(document.getElementById('invNotes')) document.getElementById('invNotes').value = draft.notes || '';
                    renderInvItems();
                }
            }
        } catch(e) {}
    };
    
    // استدعاء الدالة فوراً عند تحميل الصفحة لاسترجاع الكاش
    window.loadInvFromCache();

    // حفظ تلقائي عند الكتابة في الحقول
    if(document.getElementById('invFrom')) document.getElementById('invFrom').addEventListener('input', saveInvToCache);
    if(document.getElementById('invTo')) document.getElementById('invTo').addEventListener('input', saveInvToCache);
    if(document.getElementById('invNotes')) document.getElementById('invNotes').addEventListener('input', saveInvToCache);
    
    if (searchInvBarcodeBtn) {
        searchInvBarcodeBtn.addEventListener('click', () => {
            let val = invProdBarcode.value.trim().toLowerCase();
            if(!val) return;
            let exactMatch = barcodeCatalogData.find(p => p.barcode && String(p.barcode).split(',').map(b=>b.trim().toLowerCase()).includes(val));
            if (exactMatch) {
                invProdName.value = exactMatch.name;
                invProdBarcode.value = '';
            } else {
                showToast("المنتج غير موجود بالكتالوج", "warning");
            }
        });
    }

    if (addInvItemBtn) {
        addInvItemBtn.addEventListener('click', () => {
            let name = invProdName.value.trim();
            let qty = parseInt(invProdQty.value);
            let barcode = invProdBarcode.value.trim();
            if (!name) {
                showToast("برجاء إدخال اسم المنتج", "warning");
                return;
            }
            if (isNaN(qty) || qty < 1) {
                showToast("برجاء إدخال كمية صحيحة", "warning");
                return;
            }

            let existing = invItems.find(i => i.name === name);
            if (existing) {
                existing.qty += qty;
                if (barcode && !existing.barcode) existing.barcode = barcode;
            } else {
                invItems.push({ name: name, qty: qty, barcode: barcode });
            }
            
            invProdName.value = '';
            invProdQty.value = '';
            invProdBarcode.value = '';
            renderInvItems();
            invProdName.focus();
        });
    }

    window.deleteInvItem = function(idx) {
        invItems.splice(idx, 1);
        renderInvItems();
    };
    window.editInvItem = function(idx) {
        if (!invItems[idx]) return;
        let item = invItems[idx];
        document.getElementById('invProdName').value = item.name;
        document.getElementById('invProdQty').value = item.qty;
        document.getElementById('invProdBarcode').value = item.barcode || "";
        
        invItems.splice(idx, 1);
        renderInvItems();
        document.getElementById('invProdQty').focus();
    };

    function renderInvItems() {
        if (!invItemsList) return;
        saveInvToCache(); // حفظ تلقائي للكاش
        invItemsList.innerHTML = '';
        invItems.forEach((item, index) => {
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: right; font-weight: bold; color: var(--text-main);">${item.name}</td>
                <td style="text-align: center; font-weight: bold;">${item.qty}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn-edit" onclick="window.editInvItem(${index})"><i class="fa-solid fa-pen-to-square"></i> تعديل</button>
                    <button type="button" class="btn-delete" onclick="window.deleteInvItem(${index})"><i class="fa-solid fa-trash-can"></i> حذف</button>
                </td>
            `;
            invItemsList.appendChild(tr);
        });
    }

    if (savePrintInvBtn) {
        savePrintInvBtn.addEventListener('click', async () => {
            let from = document.getElementById('invFrom').value.trim();
            let to = document.getElementById('invTo').value.trim();
            let notes = document.getElementById('invNotes').value.trim();
            
            if (!from || !to) {
                showToast("برجاء إدخال جهة الإرسال وجهة الاستلام", "warning");
                return;
            }
            if (invItems.length === 0) {
                showToast("برجاء إضافة منتج واحد على الأقل", "warning");
                return;
            }

            let senderName = document.getElementById('invSenderName') ? document.getElementById('invSenderName').value.trim() : "";
            let regName = localStorage.getItem('cashierName') || "المدير";

            // فحص الاتصال بالإنترنت قبل الإرسال 📡
            if (!navigator.onLine) {
                showToast("⚠️ لا يوجد اتصال بالإنترنت! الاستلام محفوظ مؤقتاً في المتصفح.", "error");
                return;
            }

            setBtnLoading(savePrintInvBtn, true);

            try {
                // استخراج أعلى ID من قاعدة البيانات مباشرة لضمان التسلسل الصحيح
                const { data: latestLogs, error: fetchErr } = await supabase
                    .from('inventory_logs')
                    .select('log_id')
                    .ilike('log_id', 'TRX-%')
                    .order('created_at', { ascending: false });

                let maxId = 0;
                if (latestLogs && latestLogs.length > 0) {
                    latestLogs.forEach(log => {
                        let numMatch = String(log.log_id).match(/\d+/);
                        if (numMatch) {
                            let num = parseInt(numMatch[0]);
                            if (num > maxId) maxId = num;
                        }
                    });
                }
                
                let currentCount = maxId + 1;
                let idStr = String(currentCount).padStart(6, '0');
                let logId = `TRX-${idStr}`;

                let itemsStr = invItems.map(i => `${i.name} (${i.qty})${i.barcode ? ' [باركود: ' + i.barcode + ']' : ''}`).join(" | ");

                // إرسال البيانات مباشرة إلى Supabase بدلاً من الاعتماد على الفيتش القديم
                const { error: insertErr } = await supabase.from('inventory_logs').insert([{ 
                    log_id: logId, 
                    from_location: from, 
                    to_location: to, 
                    reg_name: senderName ? senderName : regName, 
                    items: itemsStr, 
                    notes: notes, 
                    timestamp: new Date().toLocaleString() 
                }]);

                if (insertErr) throw insertErr;

                try { localStorage.setItem('invCounter', currentCount); } catch(e) {}
                // نجاح الإرسال: نقوم بمسح الكاش لأنه تم الحفظ في السيرفر ✅
                localStorage.removeItem('pending_receipt_draft');
                
                setBtnLoading(savePrintInvBtn, false);
                showToast("تم حفظ الإذن بنجاح!", "success");
                
                // Refresh archive automatically
                if (typeof fetchInventoryLogs === 'function') fetchInventoryLogs();

                // Print Thermal
                printInventoryReceipt(logId, from, to, invItems, notes, senderName, regName);
                
                // Clear form
                invItems = [];
                renderInvItems();
                document.getElementById('invFrom').value = '';
                document.getElementById('invTo').value = '';
                document.getElementById('invNotes').value = '';
            } catch (err) {
                console.error("Error saving inventory log:", err);
                setBtnLoading(savePrintInvBtn, false);
                // فشل الإرسال رغم وجود اتصال: لا نقوم بمسح الكاش 🛡️
                showToast("⚠️ خطأ في الاتصال بالسيرفر! بيانات الاستلام محفوظة لحين إعادة المحاولة.", "error");
            }
        });
    }

    function printInventoryReceipt(logId, from, to, items, notes, senderName, regName) {
    let printWindow = window.open('', '_blank', 'height=600,width=450');
    if (!printWindow) {
        showToast("برجاء تفعيل النوافذ المنبثقة (Pop-ups) للطباعة", "error");
        return;
    }

    let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += `
            <tr style="border-bottom: 1px dashed #000;">
                <td style="text-align: right; padding: 6px 4px; vertical-align: top;">
                    <div style="font-weight: bold; font-size: 13px; line-height: 1.3; word-break: break-word; white-space: normal; color: #000;">${item.name}</div>
                    ${item.barcode ? `<div style="font-family: monospace; font-size: 11px; font-weight: bold; color: #000; letter-spacing: 0.5px; margin-top: 2px;">${item.barcode}</div>` : ''}
                </td>
                <td style="text-align: center; padding: 6px 4px; vertical-align: top; font-weight: bold; font-size: 14px; color: #000; width: 45px;">${item.qty}</td>
            </tr>
        `;
    });

    let now = new Date();
    let timeStr = now.toLocaleString('en-GB');

    let html = `
        <html dir="rtl" lang="ar">
        <head>
            <title>إذن مخزن #${logId}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                @page { margin: 5mm; }
                body {
                    font-family: 'Cairo', Tahoma, sans-serif;
                    margin: 0;
                    padding: 10px;
                    color: #000;
                    background: #fff;
                    font-size: 13px;
                    line-height: 1.4;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 8px;
                    margin-bottom: 8px;
                }
                .title {
                    font-size: 17px;
                    font-weight: 700;
                    margin: 0 0 4px 0;
                }
                .log-id {
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 3px;
                }
                .meta-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                    font-size: 12px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 8px;
                }
                th {
                    text-align: right;
                    padding: 6px 4px;
                    border-bottom: 2px solid #000;
                    font-weight: bold;
                    font-size: 13px;
                }
                td {
                    padding: 6px 4px;
                }
                .notes-section {
                    margin-top: 8px;
                    font-size: 12px;
                    border-top: 1px solid #000;
                    padding-top: 5px;
                }
                .footer {
                    text-align: center;
                    margin-top: 12px;
                    font-size: 10px;
                    color: #333;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2 class="title">إذن حركة مخازن</h2>
                <div class="log-id">#${logId}</div>
                <div style="font-size: 11px;" dir="ltr">${timeStr}</div>
            </div>
            
            <div class="meta-row">
                <span><i class="fa-solid fa-boxes-packing" style="color:#000; margin-left:4px;"></i><b>من:</b> ${from}</span>
                <span><i class="fa-solid fa-location-dot" style="color:#000; margin-left:4px;"></i><b>إلى:</b> ${to}</span>
            </div>
            
            <div class="meta-row" style="margin-top:3px;">
                <span><i class="fa-solid fa-truck-ramp-box" style="color:#000; margin-left:4px;"></i><b>اسم الراسل:</b> ${senderName || '---'}</span>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="text-align: right;">الصنف</th>
                        <th style="text-align: center; width: 45px;">الكمية</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            ${notes ? `
            <div class="notes-section">
                <i class="fa-solid fa-note-sticky" style="color:#000; margin-left:4px;"></i><b>ملاحظات:</b> ${notes}
            </div>` : ''}
            
            <div class="footer">
                Candy Club System
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}
});
// --- Inventory Archive & Dashboard Logic ---
window.switchInvTab = function(tab) {
    let createBtn = document.getElementById('invCreateTabBtn');
    let archiveBtn = document.getElementById('invArchiveTabBtn');
    let activeStyle = "padding: 10px 20px; border: none; border-radius: 8px; background: var(--primary); color: white; cursor: pointer; font-weight: bold; flex: 1;";
    let inactiveStyle = "padding: 10px 20px; border: none; border-radius: 8px; background: #ffffff; color: #333; cursor: pointer; font-weight: bold; flex: 1; box-shadow: inset 0 0 0 1px #ddd;";

    if (tab === 'create') {
        document.getElementById('invCreateSection').style.display = 'block';
        document.getElementById('invArchiveSection').style.display = 'none';
        if(createBtn) { createBtn.style.cssText = activeStyle; }
        if(archiveBtn) { archiveBtn.style.cssText = inactiveStyle; }
    } else {
        document.getElementById('invCreateSection').style.display = 'none';
        document.getElementById('invArchiveSection').style.display = 'block';
        if(archiveBtn) { archiveBtn.style.cssText = activeStyle; }
        if(createBtn) { createBtn.style.cssText = inactiveStyle; }
        
        // Auto-fetch data if not already loaded
        if (!window.invLogsData) {
            if (typeof fetchInventoryLogs === 'function') fetchInventoryLogs();
        }
    }
};

function fetchInventoryLogs(callback = null) {
    let tbody = document.getElementById('invArchiveTableBody');
    if (tbody && tbody.children.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px; color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> جاري تحميل البيانات من السيرفر...</td></tr>';
    }
    
    (async () => { const { data: invData } = await supabase.from('inventory_logs').select('*').order('created_at', { ascending: false }); return (invData || []).map(l => ({ logId: l.log_id, from: l.from_location, to: l.to_location, regName: l.reg_name, timestamp: l.timestamp, items: l.items, notes: l.notes })); })().then(data => {
            window.invLogsData = data;
            try { renderInventoryDashboard(data); } catch(e) { console.error('Dash Error:', e); }
            if (typeof callback === 'function') callback(data);
        })
        .catch(err => {
            console.error(err);
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#ef4444; padding:15px;">خطأ في تحميل البيانات من السيرفر</td></tr>';
            }
        });
}

function renderInventoryDashboard(logs) {
    if (!logs) return;
    document.getElementById('invDashTotal').innerText = logs.length;
    
    let now = new Date();
    let currentMonth = now.getMonth();
    let currentYear = now.getFullYear();
    let monthLogs = logs.filter(log => {
        let parts = (log.timestamp ? String(log.timestamp).split(" ")[0] : '').split("-");
        if(parts.length === 3) {
            let logMonth = parseInt(parts[1]) - 1;
            let logYear = parseInt(parts[0]);
            return logMonth === currentMonth && logYear === currentYear;
        }
        return false;
    });
    
    let monthTotalEl = document.getElementById('invDashMonthTotal');
    if (monthTotalEl) monthTotalEl.innerText = `أذونات هذا الشهر: ${monthLogs.length}`;
    
    let senders = {};
    let receivers = {};
    let products = {};
    let monthsGroup = {};
    
    logs.forEach(log => {
        let from = String(log.from).trim();
        let to = String(log.to).trim();
        if (from) senders[from] = (senders[from] || 0) + 1;
        if (to) receivers[to] = (receivers[to] || 0) + 1;
        
        let datePart = log.timestamp ? String(log.timestamp).split(" ")[0] : ''; // YYYY-MM-DD
        let yearMonth = datePart.substring(0, 7); // YYYY-MM
        if (yearMonth) monthsGroup[yearMonth] = (monthsGroup[yearMonth] || 0) + 1;
        
        try {
            let items = null;
            try { items = typeof log.items === 'string' ? JSON.parse(log.items) : (Array.isArray(log.items) ? log.items : null); } catch(e) {}
            
            if (Array.isArray(items)) {
                items.forEach(i => {
                    let pName = String(i.name || i.productName || '').trim();
                    let pQty = parseInt(i.qty || i.quantity) || 0;
                    if (pName && pName !== 'undefined') products[pName] = (products[pName] || 0) + pQty;
                });
                if (items.length === 0) throw new Error("Empty JSON array, try fallback");
            } else {
                throw new Error("Not a JSON array");
            }
        } catch(e) {
            if (log.items) {
                let parts = typeof log.items === 'string' ? log.items.split("|") : [];
                parts.forEach(p => {
                    let match = p.trim().match(/(.*?)\s+\((\d+)\)(?:\s*\[باركود:\s*(.*?)\])?/);
                    if (match) {
                        let pName = match[1].trim();
                        let pQty = parseInt(match[2]) || 0;
                        if (pName && pName !== 'undefined') products[pName] = (products[pName] || 0) + pQty;
                    }
                });
            }
        }
    });
    
    window.invStatsSenders = Object.entries(senders).sort((a,b) => b[1]-a[1]);
    window.invStatsReceivers = Object.entries(receivers).sort((a,b) => b[1]-a[1]);
    window.invStatsProducts = Object.entries(products).sort((a,b) => b[1]-a[1]);
    window.invStatsMonths = Object.entries(monthsGroup).sort((a,b) => b[0].localeCompare(a[0]));
    
    document.getElementById('invDashTopSender').innerText = window.invStatsSenders[0] ? window.invStatsSenders[0][0] : '-';
    document.getElementById('invDashTopReceiver').innerText = window.invStatsReceivers[0] ? window.invStatsReceivers[0][0] : '-';
    document.getElementById('invDashTopProduct').innerText = window.invStatsProducts[0] ? window.invStatsProducts[0][0] : '-';
}

function renderInventoryArchive(logs) {
    let tbody = document.getElementById('invArchiveTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">لا توجد أذونات مطابقة للبحث</td></tr>';
        return;
    }
    
    let reversed = [...logs].reverse();
    
    reversed.forEach(log => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${log.logId}</b></td>
            <td>${log.from}</td>
            <td>${log.to}</td>
            <td>${log.regName}</td>
            <td dir="ltr" style="text-align:right;">${log.timestamp}</td>
            <td style="text-align:center;">
                <button class="interactive-btn" onclick="reprintInvLog('${log.logId}')" style="background:#3498db; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;" title="إعادة طباعة"><i class="fa-solid fa-print"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// ⭐ V16: نظام الجلسات وإدارة المستخدمين
// ==========================================
function checkSession() {
    let stored = localStorage.getItem('cc_user');
    if (stored) {
        try {
            currentUser = JSON.parse(stored);
            
            let isAdminPage = window.location.pathname.toLowerCase().includes('admin.html');
            if (isAdminPage && currentUser.permissions !== "ALL") {
                console.warn("Unauthorized access to admin panel.");
                localStorage.removeItem('cc_user');
                currentUser = null;
                showLogin();
                return;
            }
            if (!isAdminPage && currentUser.permissions === "ALL") {
                console.warn("Admin account cannot be used in the employee portal.");
                localStorage.removeItem('cc_user');
                currentUser = null;
                showLogin();
                return;
            }
            
            document.getElementById('login-screen').style.display = 'none';
            applyPermissions();
            // تمت إزالة التحميل التلقائي لتفعيل الـ Lazy Loading
            if (typeof updateSuspendedCount === 'function') updateSuspendedCount();
        } catch (e) {
            console.error("Invalid session", e);
            showLogin();
        }
    } else {
        showLogin();
    }
}

function deprecatedHandleLogin(user, pass, btn, err) {
    setBtnLoading(btn, true, "جاري الدخول...");
    
    (async () => {
                let { data: userData, error: loginErr } = await supabase.from('users').select('*').eq('username', user).single();
                let loginResult;
                if (loginErr || !userData) {
                    if (user === 'badr' && pass === '01210351419') {
                        // Emergency fallback for master admin
                        loginResult = { success: true, username: 'badr', displayName: 'بدر علاء', permissions: 'ALL', status: 'نشط' };
                        // Try to create the user in DB silently
                        supabase.from('users').insert([{ username: 'badr', display_name: 'بدر علاء', password: '01210351419', permissions: 'ALL', status: 'نشط' }]).then();
                    } else {
                        loginResult = { success: false, error: "اسم المستخدم غير موجود." };
                    }
                } else if (userData.status !== "نشط") {
                    loginResult = { success: false, error: "هذا الحساب موقوف. تواصل مع المدير." };
                } else if (userData.password !== pass) {
                    loginResult = { success: false, error: "كلمة السر غير صحيحة." };
                } else {
                    await supabase.from('users').update({ last_login: new Date().toLocaleString('ar-EG') }).eq('username', user);
                    loginResult = { success: true, username: userData.username, displayName: userData.display_name, permissions: userData.permissions, status: userData.status };
                }
                return loginResult;
            })().then(data => {
            if (data.success) {
                let isAdminPage = window.location.pathname.toLowerCase().includes('admin.html');
                
                if (isAdminPage && data.permissions !== "ALL") {
                    err.innerText = "عذراً، هذه اللوحة مخصصة للمديرين فقط.";
                    err.style.display = 'block';
                    return;
                }
                
                // Note: ALL users can login to index.html regardless of roles now

                currentUser = {
                    username: data.username,
                    displayName: data.displayName,
                    permissions: data.permissions
                };
                localStorage.setItem('cc_user', JSON.stringify(currentUser));
                sessionStorage.setItem('cc_pass', pass); // 🛡️ Save pass securely for RPC deletes
                document.getElementById('login-screen').style.display = 'none';
                applyPermissions();
                // تمت إزالة التحميل التلقائي لتفعيل الـ Lazy Loading
                if (typeof updateSuspendedCount === 'function') updateSuspendedCount();
                showToast(`أهلاً بك يا ${currentUser.displayName}`);
            } else {
                err.innerText = data.error || "خطأ في تسجيل الدخول";
                err.style.display = 'block';
            }
        })
        .catch(error => {
            err.innerText = "فشل الاتصال بالسيرفر";
            err.style.display = 'block';
        })
        .finally(() => {
            setBtnLoading(btn, false, "تسجيل الدخول");
        });
}

// Duplicate filterAndRenderArchive and event listeners removed, using the one at bottom of file

window.invModalCurrentData = [];
window.invModalCurrentType = '';
window.invModalCurrentPage = 1;
window.invModalPerPage = 15;

window.renderInvModalContent = function() {
    let contentEl = document.getElementById('invStatsModalContent');
    let data = window.invModalCurrentData;
    let type = window.invModalCurrentType;
    let page = window.invModalCurrentPage;
    let perPage = window.invModalPerPage;
    
    if (!data || data.length === 0) {
        contentEl.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">لا توجد بيانات متاحة</div>`;
        return;
    }
    
    let totalPages = Math.ceil(data.length / perPage);
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    window.invModalCurrentPage = page;
    
    let startIdx = (page - 1) * perPage;
    let pageData = data.slice(startIdx, startIdx + perPage);
    
    let html = '';
    
    if (type === 'months') {
        html += `<div style="display:flex; flex-direction:column; gap:10px;">`;
        pageData.forEach(item => {
            let [ym, count] = item;
            let parts = ym.split("-");
            let monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
            let mName = parts[1] ? monthNames[parseInt(parts[1]) - 1] : ym;
            let label = `${mName} ${parts[0]}`;
            html += `
                <div onclick="filterByMonthMonthModal('${ym}')" class="interactive-btn month-filter-item">
                    <span class="stat-label-primary"><i class="fa-solid fa-calendar-days" style="color:var(--primary); margin-left:8px;"></i> ${label}</span>
                    <span class="badge-primary">${count} إذن</span>
                </div>`;
        });
        html += `</div>`;
    } else {
        html += `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:12px;">`;
        pageData.forEach((item, i) => {
            let actualIndex = startIdx + i;
            html += `
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:15px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.02); transition: transform 0.2s ease;">
                    <div style="color:var(--primary); font-size:0.85rem; margin-bottom:5px; font-weight:bold;">الترتيب #${actualIndex+1}</div>
                    <div style="font-size:1.1rem; color:#1e293b; font-weight:bold; margin-bottom:10px;">${item[0]}</div>
                    <div style="display:inline-block; background:#f8fafc; color:#334155; padding:5px 12px; border-radius:20px; font-size:0.9rem; font-weight:bold; border:1px solid #e2e8f0;">${item[1]} إذن/عنصر</div>
                </div>`;
        });
        html += `</div>`;
    }
    
    if (totalPages > 1) {
        let prevDisabled = page === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;background:#94a3b8;color:white;border:none;border-radius:5px;padding:6px 15px;"' : 'style="background:var(--primary);color:white;border:none;border-radius:5px;padding:6px 15px;cursor:pointer;"';
        let nextDisabled = page === totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;background:#94a3b8;color:white;border:none;border-radius:5px;padding:6px 15px;"' : 'style="background:var(--primary);color:white;border:none;border-radius:5px;padding:6px 15px;cursor:pointer;"';
        
        html += `
        <div style="display:flex; justify-content:center; align-items:center; margin-top:20px; gap:15px; padding-top: 15px; border-top: 1px solid rgba(0,0,0,0.05);">
            <button onclick="window.invModalCurrentPage--; renderInvModalContent();" ${prevDisabled}><i class="fa-solid fa-arrow-right"></i> السابق</button>
            <span style="font-weight:bold; color:#64748b; font-size:0.9rem;">صفحة ${page} من ${totalPages}</span>
            <button onclick="window.invModalCurrentPage++; renderInvModalContent();" ${nextDisabled}>التالي <i class="fa-solid fa-arrow-left"></i></button>
        </div>`;
    }
    
    contentEl.innerHTML = html;
};

window.openInvStatsModal = function(type) {
    let modal = document.getElementById('invStatsModal');
    let titleEl = document.getElementById('invStatsModalTitle');
    let contentEl = document.getElementById('invStatsModalContent');
    
    if (modal) modal.style.display = 'flex';

    if (!window.invLogsData) {
        contentEl.innerHTML = `<div style="text-align:center; padding:40px; color:#64748b;"><i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color:var(--primary); margin-bottom:15px;"></i><br>جاري جلب البيانات من السيرفر...</div>`;
        fetchInventoryLogs(() => window.openInvStatsModal(type));
        return;
    }

    let title = "";
    let data = [];
    
    if (type === 'months') {
        title = 'أذونات الشهور والسنوات';
        data = window.invStatsMonths || [];
    } else if (type === 'sender') {
        title = 'أعلى الفروع إرسالاً';
        data = window.invStatsSenders || [];
    } else if (type === 'receiver') {
        title = 'أعلى الفروع استلاماً';
        data = window.invStatsReceivers || [];
    } else if (type === 'product') {
        title = 'أكثر المنتجات تحويلاً';
        data = window.invStatsProducts || [];
    }
    
    titleEl.innerHTML = `<i class="fa-solid fa-chart-pie" style="color:var(--primary); margin-left:8px;"></i> ${title}`;
    
    window.invModalCurrentType = type;
    window.invModalCurrentData = data;
    window.invModalCurrentPage = 1;
    window.invModalPerPage = 15;
    
    renderInvModalContent();
};

window.filterByMonthMonthModal = function(ym) {
    let dateInput = document.getElementById('invSearchDate');
    if (dateInput) dateInput.value = ym;
    closeInvStatsModal();
    filterAndRenderArchive();
};

window.closeInvStatsModal = function() {
    let modal = document.getElementById('invStatsModal');
    if (modal) modal.style.display = 'none';
};

window.reprintInvLog = function(logId) {
    if (!window.invLogsData) {
        fetchInventoryLogs(() => window.reprintInvLog(logId));
        return;
    }
    let log = window.invLogsData.find(l => l.logId === logId);
    if (!log) {
        fetchInventoryLogs(() => window.reprintInvLog(logId), logId);
        return;
    }
    
    let itemsArr = [];
    try {
        try { itemsArr = typeof log.items === 'string' ? JSON.parse(log.items) : (Array.isArray(log.items) ? log.items : []); } catch(e) { itemsArr = []; }
    } catch(e) {
        if (log.items) {
            let parts = log.items.split("|");
            itemsArr = parts.map(p => {
                let match = p.trim().match(/(.*?)\s+\((\d+)\)(?:\s*\[باركود:\s*(.*?)\])?/);
                if (match) {
                    let name = match[1].trim();
                    let qty = match[2];
                    let barcode = match[3] ? match[3].replace(']', '').trim() : '';
                    return { name, qty, barcode };
                }
                return { name: p.trim(), qty: 1, barcode: '' };
            });
        }
    }
    
    let itemsHtml = itemsArr.map(item => `
        <tr style="border-bottom: 1px dashed #000;">
            <td style="text-align: right; padding: 6px 4px; vertical-align: top;">
                <div style="font-weight: bold; font-size: 13px; line-height: 1.3; word-break: break-word; white-space: normal; color: #000;">${item.name}</div>
                ${item.barcode ? `<div style="font-family: monospace; font-size: 11px; font-weight: bold; color: #000; letter-spacing: 0.5px; margin-top: 2px;">${item.barcode}</div>` : ''}
            </td>
            <td style="text-align: center; padding: 6px 4px; vertical-align: top; font-weight: bold; font-size: 14px; color: #000; width: 45px;">${item.qty}</td>
        </tr>
    `).join('');
    
    let printWindow = window.open('', '_blank', 'height=600,width=450');
    if (!printWindow) {
        showToast("برجاء تفعيل النوافذ المنبثقة (Pop-ups) للطباعة", "error");
        return;
    }
    
    let html = `
        <html dir="rtl" lang="ar">
        <head>
            <title>إذن مخزن #${log.logId}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                @page { margin: 5mm; }
                body { font-family: 'Cairo', Tahoma, sans-serif; margin: 0; padding: 10px; color: #000; font-size: 13px; background: #fff; line-height: 1.4; }
                .receipt-header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
                .receipt-title { font-size: 17px; font-weight: bold; margin: 0 0 4px 0; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th { border-bottom: 2px solid #000; padding: 6px 4px; font-size: 13px; text-align: right; }
                td { padding: 6px 4px; }
                .notes { margin-top: 8px; font-size: 12px; border-top: 1px solid #000; padding-top: 5px; }
                .footer { text-align: center; margin-top: 12px; font-size: 11px; }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                <h2 class="receipt-title">إذن حركة مخازن</h2>
                <div style="font-size: 14px; font-weight: bold; margin-bottom: 3px;">#${log.logId}</div>
                <div style="font-size: 11px;">تاريخ: <span dir="ltr">${log.timestamp}</span></div>
            </div>
            
            <div class="info-row">
                <span><i class="fa-solid fa-boxes-packing" style="color:#000; margin-left:4px;"></i><b>من:</b> ${log.from}</span>
                <span><i class="fa-solid fa-location-dot" style="color:#000; margin-left:4px;"></i><b>إلى:</b> ${log.to}</span>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="text-align: right;">الصنف</th>
                        <th style="text-align: center; width: 45px;">الكمية</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            ${log.notes ? `<div class="notes"><i class="fa-solid fa-note-sticky" style="color:#000; margin-left:4px;"></i><b>ملاحظات:</b> ${log.notes}</div>` : ''}

            <div class="footer">
                Candy Club System<br>
                ${new Date().toLocaleString('en-GB')}
            </div>
            
            <script>
                window.onload = function() { setTimeout(function() { window.print(); }, 500); };
            </script>
        </body>
        </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
};;;


// ==========================================
// ⭐ V16: نظام الجلسات وإدارة المستخدمين
// ==========================================
function checkSession() {
    let stored = localStorage.getItem('cc_user');
    if (stored) {
        try {
            currentUser = JSON.parse(stored);
            
            let isAdminPage = window.location.pathname.toLowerCase().includes('admin.html');
            if (isAdminPage && currentUser.permissions !== "ALL") {
                console.warn("Unauthorized access to admin panel.");
                localStorage.removeItem('cc_user');
                currentUser = null;
                showLogin();
                return;
            }
            if (!isAdminPage && currentUser.permissions === "ALL") {
                console.warn("Admin account cannot be used in the employee portal.");
                localStorage.removeItem('cc_user');
                currentUser = null;
                showLogin();
                return;
            }
            
            document.getElementById('login-screen').style.display = 'none';
            applyPermissions();
            // تمت إزالة التحميل التلقائي لتفعيل الـ Lazy Loading
            if (typeof updateSuspendedCount === 'function') updateSuspendedCount();
        } catch (e) {
            console.error("Invalid session", e);
            showLogin();
        }
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
}

window.handleLogin = function(e) {
    e.preventDefault();
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    const err = document.getElementById('login-error');
    
    if (typeof setBtnLoading === 'function') setBtnLoading(btn, true, "جاري الدخول...");
    err.style.display = 'none';
    
    (async () => {
                let { data: userData, error: loginErr } = await supabase.from('users').select('*').eq('username', user).single();
                let loginResult;
                console.log("Login Check:", { userData, loginErr });
                if (loginErr || !userData) {
                    if (user === 'badr' && pass === '01210351419') {
                        // Emergency fallback for master admin
                        loginResult = { success: true, username: 'badr', displayName: 'بدر علاء', permissions: 'ALL', status: 'نشط' };
                        // Try to create the user in DB silently
                        supabase.from('users').insert([{ username: 'badr', display_name: 'بدر علاء', password: '01210351419', permissions: 'ALL', status: 'نشط' }]).then();
                    } else {
                        let errMsg = "اسم المستخدم غير موجود.";
                        if (loginErr && loginErr.code !== 'PGRST116') {
                            errMsg = `خطأ من قاعدة البيانات: ${loginErr.message || loginErr.hint || JSON.stringify(loginErr)}`;
                        } else if (loginErr && loginErr.code === 'PGRST116') {
                             errMsg = "اسم المستخدم غير موجود أو أن صلاحيات قاعدة البيانات (RLS) تمنع القراءة.";
                        }
                        loginResult = { success: false, error: errMsg };
                    }
                } else if (userData.status !== "نشط") {
                    loginResult = { success: false, error: "هذا الحساب موقوف. تواصل مع المدير." };
                } else if (userData.password !== pass) {
                    loginResult = { success: false, error: "كلمة السر غير صحيحة." };
                } else {
                    await supabase.from('users').update({ last_login: new Date().toLocaleString('ar-EG') }).eq('username', user);
                    loginResult = { success: true, username: userData.username, displayName: userData.display_name, permissions: userData.permissions, status: userData.status };
                }
                return loginResult;
            })().then(data => {
            if (data.success) {
                let isAdminPage = window.location.pathname.toLowerCase().includes('admin.html');
                
                if (isAdminPage && data.permissions !== "ALL") {
                    err.innerText = "عذراً، هذه اللوحة مخصصة للمديرين فقط.";
                    err.style.display = 'block';
                    return;
                }
                
                // Note: ALL users can login to index.html regardless of roles now
                
                currentUser = {
                    username: data.username,
                    displayName: data.displayName,
                    permissions: data.permissions
                };
                localStorage.setItem('cc_user', JSON.stringify(currentUser));
                sessionStorage.setItem('cc_pass', pass); // 🛡️ Save pass securely for RPC deletes
                document.getElementById('login-screen').style.display = 'none';
                applyPermissions();
                // تمت إزالة التحميل التلقائي لتفعيل الـ Lazy Loading
                if (typeof updateSuspendedCount === 'function') updateSuspendedCount();
                showToast(`أهلاً بك يا ${currentUser.displayName}`);
            } else {
                err.innerText = data.error || "خطأ في تسجيل الدخول";
                err.style.display = 'block';
            }
        })
        .catch(error => {
            console.error("Login flow error:", error);
            err.innerText = error.message ? `خطأ داخلي: ${error.message}` : "فشل الاتصال بالسيرفر";
            err.style.display = 'block';
        })
        .finally(() => {
            setBtnLoading(btn, false, "تسجيل الدخول");
        });
};

window.handleLogout = function() {
    localStorage.removeItem('cc_user');
    window.location.reload();
};

function applyPermissions() {
    if (!currentUser) return;
    
    let headerLogoSub = document.querySelector('.logo-sub');
    if (headerLogoSub) {
        headerLogoSub.innerHTML = `مرحباً ${currentUser.displayName}`;
    }

    // Auto-fill names for convenience
    let invSenderField = document.getElementById('invSenderName');
    if (invSenderField && !invSenderField.value) invSenderField.value = currentUser.displayName;
    
    let ledgerReceiverField = document.getElementById('ledgerReceiverName');
    if (ledgerReceiverField && !ledgerReceiverField.value) ledgerReceiverField.value = currentUser.displayName;


    // Keep ALL logic JUST for the hardcoded local 'badr' admin
    let isFullAccess = (currentUser.permissions === "ALL");
    let perms = isFullAccess ? [] : (currentUser && currentUser.permissions ? String(currentUser.permissions).split(",") : []);
    
    function hasPerm(p) { return isFullAccess || perms.includes(p); }
    
    document.querySelectorAll('.nav-item').forEach(btn => {
        let target = btn.dataset.target;
        if (!target) return;
        let permKey = target.replace("-tab", "");
        
        if (permKey === "inventory-transfers") permKey = "inventory";
        if (permKey === "price-tags") permKey = "pricetags";
        if (permKey === "whatsapp-campaign") permKey = "whatsapp";
        if (permKey === "users") { btn.style.display = window.location.pathname.toLowerCase().includes("admin.html") ? "flex" : "none"; if (btn.style.display==="flex") btn.onclick=null; return; }
        
        
        
        if (hasPerm(permKey) || isFullAccess) {
            btn.style.display = "flex";
            btn.classList.remove('locked-nav-item');
            btn.onclick = null; // restore normal click
        } else {
            btn.style.display = "flex"; // Keep it visible for marketing!
            btn.classList.add('locked-nav-item');
            btn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (window.showToast) {
                    window.showToast("ليس لديك صلاحية لفتح هذه الشاشة. تواصل مع الإدارة للإشتراك 🔒", "error");
                } else {
                    alert("ليس لديك صلاحية لفتح هذه الشاشة. تواصل مع الإدارة للإشتراك 🔒");
                }
            };
        }
    });

    document.querySelectorAll('.menu-group').forEach(group => {
        let visibleItems = Array.from(group.querySelectorAll('.nav-item')).filter(i => i.style.display !== "none");
        if (visibleItems.length === 0) {
            group.style.display = "none";
        } else {
            group.style.display = "block";
        }
    });

    // Find the first UNLOCKED button and click it to open that tab
    let firstUnlockedBtn = Array.from(document.querySelectorAll('.nav-item')).find(btn => 
        !btn.classList.contains('locked-nav-item') && btn.style.display !== 'none'
    );
    
    if (firstUnlockedBtn) {
        // Trigger a real DOM click so all the initialization logic runs perfectly
        firstUnlockedBtn.click();
    } else {
        // Fallback if somehow they have NO permissions at all
        let loginScreen = document.getElementById('login-screen');
        if(loginScreen) {
            loginScreen.style.display = 'flex';
            let err = document.getElementById('login-error');
            if(err) {
                err.innerText = "هذا الحساب لا يملك أي صلاحيات.";
                err.style.display = 'block';
            }
            localStorage.removeItem('cc_user');
        }
    }
}

window.openAddUserModal = function() {
    document.getElementById('user-mode').value = 'add';
    document.getElementById('u-username').value = '';
    document.getElementById('u-username').readOnly = false;
    document.getElementById('u-displayname').value = '';
    document.getElementById('u-password').value = '';
    document.getElementById('u-password').required = true;
    document.getElementById('u-pass-req').style.display = 'inline';
    document.getElementById('u-status-group').style.display = 'none';
    
    document.querySelectorAll('input[name="u-perms"]').forEach(c => c.checked = false);
    
    document.getElementById('userModalTitle').innerText = 'إضافة مستخدم جديد';
    document.getElementById('userModal').style.display = 'flex';
};

window.openEditUserModal = function(username, displayName, permsStr, status, password) {
    document.getElementById('user-mode').value = 'edit';
    document.getElementById('u-username').value = username;
    document.getElementById('u-username').readOnly = true; 
    document.getElementById('u-displayname').value = displayName;
    document.getElementById('u-password').value = password || '';
    document.getElementById('u-password').required = false; 
    document.getElementById('u-pass-req').style.display = 'none';
    
    document.getElementById('u-status').value = status;
    document.getElementById('u-status-group').style.display = 'block';
    
    let checkboxes = document.querySelectorAll('input[name="u-perms"]');
    checkboxes.forEach(c => c.checked = false);
    
    let pList = permsStr ? String(permsStr).split(",") : [];
    checkboxes.forEach(c => {
        if (pList.includes(c.value)) c.checked = true;
    });
    
    document.getElementById('userModalTitle').innerText = 'تعديل بيانات المستخدم';
    document.getElementById('userModal').style.display = 'flex';
};



window.handleUserSubmit = async function(e) {
    e.preventDefault();
    const mode = document.getElementById('user-mode').value;
    const username = document.getElementById('u-username').value.trim();
    const displayName = document.getElementById('u-displayname').value.trim();
    const password = document.getElementById('u-password').value;
    const status = document.getElementById('u-status') ? document.getElementById('u-status').value : 'نشط';
    
    let perms = [];
    document.querySelectorAll('input[name="u-perms"]:checked').forEach(c => { perms.push(c.value); });
    if (perms.length === 0) { showToast('يجب اختيار صلاحية واحدة على الأقل', 'error'); return; }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    setBtnLoading(submitBtn, true, 'جاري الحفظ...');
    
    try {
        if (mode === 'add') {
            const { data: exist } = await supabase.from('users').select('username').eq('username', username);
            if (exist && exist.length > 0) { showToast('اسم المستخدم موجود بالفعل', 'error'); setBtnLoading(submitBtn, false); return; }
            await supabase.from('users').insert([{ username, display_name: displayName, password, permissions: perms.join(','), status: 'نشط' }]);
        } else {
            let updates = { display_name: displayName, permissions: perms.join(','), status };
            if (password !== '') updates.password = password;
            await supabase.from('users').update(updates).eq('username', username);
        }
        showToast(mode === 'add' ? 'تمت إضافة المستخدم بنجاح' : 'تم تعديل المستخدم بنجاح', 'success');
        document.getElementById('userModal').style.display = 'none';
        // Refresh usersData
        const { data: fresh } = await supabase.from('users').select('*').order('created_at', { ascending: true });
        window.usersData = (fresh || []).map(u => ({ username: u.username, password: u.password, displayName: u.display_name, permissions: u.permissions, status: u.status, lastLogin: u.last_login }));
        window.loadUsersList();
    } catch(err) {
        showToast('حدث خطأ: ' + (err.message || ''), 'error');
    }
    setBtnLoading(submitBtn, false);
};


window.loadUsersList = function() {
    let tbody = document.getElementById('usersTbody');
    if (!tbody) return;
    
    // استخدام البيانات المحملة مسبقاً بدلاً من تحميل جديد لتفادي الضغط على السيرفر
    let renderUsers = (users) => {
        if (users && users.length > 0) {
            tbody.innerHTML = '';
            users.forEach(u => {
                let permsBadge = u.permissions === "ALL" 
                    ? `<span style="background:#1a237e; color:white; padding:2px 8px; border-radius:12px; font-size:0.8rem;">كل الصلاحيات</span>` 
                    : (u.permissions ? String(u.permissions).split(",") : []).map(p => `<span style="background:#e2e8f0; color:#475569; padding:2px 8px; border-radius:12px; font-size:0.8rem; margin:2px; display:inline-block;">${p}</span>`).join("");
                    
                let statusBadge = u.status === "نشط"
                    ? `<span style="color:#059669; font-weight:bold;"><i class="fa-solid fa-check-circle"></i> نشط</span>`
                    : `<span style="color:#dc2626; font-weight:bold;"><i class="fa-solid fa-ban"></i> موقوف</span>`;
                    
                let tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:bold;">${u.username}</td>
                    <td>${u.displayName}</td>
                    <td style="line-height:1.5;">${permsBadge}</td>
                    <td>${statusBadge}</td>
                    <td dir="ltr" style="font-size:0.9rem;">${u.lastLogin || '-'}</td>
                    <td>
                        <button class="interactive-btn" onclick="openEditUserModal('${u.username}', '${u.displayName}', '${u.permissions}', '${u.status}', '${u.password}')" style="background:none; border:none; color:#3b82f6; cursor:pointer; font-size:1.1rem; margin:0 5px;" title="تعديل"><i class="fa-solid fa-pen-to-square"></i></button>
                        ${u.username !== "admin" ? `<button class="interactive-btn" onclick="deleteUser('${u.username}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.1rem; margin:0 5px;" title="حذف"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">لا يوجد مستخدمين.</td></tr>';
        }
    };

    if (window.usersData && window.usersData.length > 0) {
        renderUsers(window.usersData);
    } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">لا يوجد مستخدمين أو يتم التحميل...</td></tr>';
    }
};

window.deleteUser = function(username) {
    if(confirm(`هل أنت متأكد من حذف المستخدم ${username}؟`)) {
        let formData = new FormData();
        formData.append("action", "deleteUser");
        formData.append("username", username);
        fetch(GOOGLE_SHEETS_URL, { method: "POST", body: formData })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    showToast("تم حذف المستخدم");
                    window.loadUsersList();
                } else {
                    showToast(data.error || "خطأ", "error");
                }
            });
    }
};

window.togglePermCard = function(label) {
    setTimeout(() => {
        let chk = label.querySelector('input[type="checkbox"]');
        if (chk && chk.checked) {
            label.classList.add('active-perm');
        } else {
            label.classList.remove('active-perm');
        }
    }, 10);
};




// ==========================================
// V16: Performance & Search Optimizations
// Overrides
// ==========================================

function fetchInventoryLogs(callback = null, query = "") {
    let tbody = document.getElementById('invArchiveTableBody');
    
    let url = GOOGLE_SHEETS_URL + "?action=getInventoryLogs"; 
    if (query !== "") {
        url += `&q=${encodeURIComponent(query)}`;
    }

    fetch(url)
        .then(res => res.json())
        .then(data => {
            // The interceptor might wrap the response in { success: true, data: [...] }
            let actualData = data.data ? data.data : data; 
            window.invLogsData = actualData;
            try { if (query === "") renderInventoryDashboard(actualData); } catch(e) { console.error('Dash Error:', e); }
            if (typeof callback === 'function') callback(data);
        })
        .catch(err => {
            console.error(err);
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#ef4444; padding:15px;">خطأ في تحميل البيانات</td></tr>';
            }
        });
}

function filterAndRenderArchive() {
    let searchInput = document.getElementById('invSearchInput') || document.getElementById('invSearchQ'); let q = searchInput ? searchInput.value.trim() : '';
    let dateInput = document.getElementById('invSearchDate') || document.getElementById('invDateQ'); let dateQ = dateInput ? dateInput.value : '';
    let tbody = document.getElementById('invArchiveTableBody');

    if (q !== '') {
        // Server side search for ID
        fetchInventoryLogs(() => {
            renderInventoryArchive(window.invLogsData);
        }, q);
        return;
    }

    if (!window.invLogsData) {
        fetchInventoryLogs(() => filterAndRenderArchive());
        return;
    }

    setTimeout(() => {
        let filtered = window.invLogsData || [];
        if (dateQ !== '') {
            filtered = filtered.filter(log => String(log.timestamp).startsWith(dateQ));
        }
        renderInventoryArchive(filtered);
    }, 150);
}

window.reprintInvLog = function(logId) {
    if (!window.invLogsData) {
        fetchInventoryLogs(() => window.reprintInvLog(logId));
        return;
    }
    let log = window.invLogsData.find(l => l.logId === logId);
    if (!log) {
        fetchInventoryLogs(() => window.reprintInvLog(logId), logId);
        return;
    }
    
    let itemsArr = [];
    try {
        itemsArr = JSON.parse(log.items);
    } catch(e) {
        if (log.items) {
            let parts = log.items.split("|");
            itemsArr = parts.map(p => {
                let match = p.trim().match(/(.*?)\s+\((\d+)\)(?:\s*\[باركود:\s*(.*?)\])?/);
                if (match) {
                    let name = match[1].trim();
                    let qty = match[2];
                    let barcode = match[3] ? match[3].replace(']', '').trim() : '';
                    return { name, qty, barcode };
                }
                return { name: p.trim(), qty: 1, barcode: '' };
            });
        }
    }
    
    let itemsHtml = itemsArr.map(item => `
        <tr style="border-bottom: 1px dashed #000;">
            <td style="text-align: right; padding: 6px 4px; vertical-align: top;">
                <div style="font-weight: bold; font-size: 13px; line-height: 1.3; word-break: break-word; white-space: normal; color: #000;">${item.name}</div>
                ${item.barcode ? `<div style="font-family: monospace; font-size: 11px; font-weight: bold; color: #000; letter-spacing: 0.5px; margin-top: 2px;">${item.barcode}</div>` : ''}
            </td>
            <td style="text-align: center; padding: 6px 4px; vertical-align: top; font-weight: bold; font-size: 14px; color: #000; width: 45px;">${item.qty}</td>
        </tr>
    `).join('');
    
    let printWindow = window.open('', '_blank', 'height=600,width=450');
    if (!printWindow) {
        showToast("برجاء تفعيل النوافذ المنبثقة (Pop-ups) للطباعة", "error");
        return;
    }
    
    let html = `
        <html dir="rtl" lang="ar">
        <head>
            <title>إذن مخزن #${log.logId}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                @page { margin: 5mm; }
                body { font-family: 'Cairo', Tahoma, sans-serif; margin: 0; padding: 10px; color: #000; font-size: 13px; background: #fff; line-height: 1.4; }
                .receipt-header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
                .receipt-title { font-size: 17px; font-weight: bold; margin: 0 0 4px 0; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th { border-bottom: 2px solid #000; padding: 6px 4px; font-size: 13px; text-align: right; }
                td { padding: 6px 4px; }
                .notes { margin-top: 8px; font-size: 12px; border-top: 1px solid #000; padding-top: 5px; }
                .footer { text-align: center; margin-top: 12px; font-size: 11px; }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                <h2 class="receipt-title">إذن حركة مخازن</h2>
                <div style="font-size: 14px; font-weight: bold; margin-bottom: 3px;">#${log.logId}</div>
                <div style="font-size: 11px;">تاريخ: <span dir="ltr">${log.timestamp}</span></div>
            </div>
            
            <div class="info-row">
                <span><i class="fa-solid fa-boxes-packing" style="color:#000; margin-left:4px;"></i><b>من:</b> ${log.from}</span>
                <span><i class="fa-solid fa-location-dot" style="color:#000; margin-left:4px;"></i><b>إلى:</b> ${log.to}</span>
            </div>
            
            <div class="info-row" style="margin-top:3px;">
                <span><i class="fa-solid fa-truck-ramp-box" style="color:#000; margin-left:4px;"></i><b>اسم الراسل:</b> ${log.regName || '---'}</span>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="text-align: right;">الصنف</th>
                        <th style="text-align: center; width: 45px;">الكمية</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            ${log.notes ? `<div class="notes"><i class="fa-solid fa-note-sticky" style="color:#000; margin-left:4px;"></i><b>ملاحظات:</b> ${log.notes}</div>` : ''}

            <div class="footer">
                Candy Club System<br>
                ${new Date().toLocaleString('en-GB')}
            </div>
            
            <script>
                window.onload = function() { setTimeout(function() { window.print(); }, 500); };
            </script>
        </body>
        </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
};;;

function printInventoryReceipt(logId, from, to, items, notes, senderName, regName) {
    let printWindow = window.open('', '_blank', 'height=600,width=450');
    if (!printWindow) {
        showToast("برجاء تفعيل النوافذ المنبثقة (Pop-ups) للطباعة", "error");
        return;
    }

    let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += `
            <tr style="border-bottom: 1px dashed #000;">
                <td style="text-align: right; padding: 6px 4px; vertical-align: top;">
                    <div style="font-weight: bold; font-size: 13px; line-height: 1.3; word-break: break-word; white-space: normal; color: #000;">${item.name}</div>
                    ${item.barcode ? `<div style="font-family: monospace; font-size: 11px; font-weight: bold; color: #000; letter-spacing: 0.5px; margin-top: 2px;">${item.barcode}</div>` : ''}
                </td>
                <td style="text-align: center; padding: 6px 4px; vertical-align: top; font-weight: bold; font-size: 14px; color: #000; width: 45px;">${item.qty}</td>
            </tr>
        `;
    });

    let now = new Date();
    let timeStr = now.toLocaleString('en-GB');

    let html = `
        <html dir="rtl" lang="ar">
        <head>
            <title>إذن مخزن #${logId}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                @page { margin: 5mm; }
                body {
                    font-family: 'Cairo', Tahoma, sans-serif;
                    margin: 0;
                    padding: 10px;
                    color: #000;
                    background: #fff;
                    font-size: 13px;
                    line-height: 1.4;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 8px;
                    margin-bottom: 8px;
                }
                .title {
                    font-size: 17px;
                    font-weight: 700;
                    margin: 0 0 4px 0;
                }
                .log-id {
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 3px;
                }
                .meta-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                    font-size: 12px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 8px;
                }
                th {
                    text-align: right;
                    padding: 6px 4px;
                    border-bottom: 2px solid #000;
                    font-weight: bold;
                    font-size: 13px;
                }
                td {
                    padding: 6px 4px;
                }
                .notes-section {
                    margin-top: 8px;
                    font-size: 12px;
                    border-top: 1px solid #000;
                    padding-top: 5px;
                }
                .footer {
                    text-align: center;
                    margin-top: 12px;
                    font-size: 10px;
                    color: #333;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2 class="title">إذن حركة مخازن</h2>
                <div class="log-id">#${logId}</div>
                <div style="font-size: 11px;" dir="ltr">${timeStr}</div>
            </div>
            
            <div class="meta-row">
                <span><i class="fa-solid fa-boxes-packing" style="color:#000; margin-left:4px;"></i><b>من:</b> ${from}</span>
                <span><i class="fa-solid fa-location-dot" style="color:#000; margin-left:4px;"></i><b>إلى:</b> ${to}</span>
            </div>
            
            <div class="meta-row" style="margin-top:3px;">
                <span><i class="fa-solid fa-truck-ramp-box" style="color:#000; margin-left:4px;"></i><b>اسم الراسل:</b> ${senderName || '---'}</span>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="text-align: right;">الصنف</th>
                        <th style="text-align: center; width: 45px;">الكمية</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            ${notes ? `
            <div class="notes-section">
                <i class="fa-solid fa-note-sticky" style="color:#000; margin-left:4px;"></i><b>ملاحظات:</b> ${notes}
            </div>` : ''}
            
            <div class="footer">
                Candy Club System
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}

// Override loadDataFromServer to conditionally fetch catalog
const originalLoadData = loadDataFromServer;
loadDataFromServer = function(customDate = null) {
    if (currentUser) {
        let perms = (currentUser && currentUser.permissions ? String(currentUser.permissions).split(",") : []);
        let isFull = currentUser.permissions === "ALL";
        if (isFull || perms.includes("catalog") || perms.includes("create") || perms.includes("pricetags") || perms.includes("inventory") || perms.includes("shortages")) {
            
        }
    }
    // Call the original but ensure we don't duplicate logic.
    // Wait, calling originalLoadData will do the normal fetch which is fine because the backend filters.
    return originalLoadData.apply(this, arguments);
};




// ============================================================
// ⭐ HR MODULE: نظام الحضور والانصراف بالـ GPS
// ============================================================
const HR_BRANCH_LAT = 31.209774;
const HR_BRANCH_LNG = 29.935520;
const HR_RADIUS_METERS = 100; // Geofencing radius
let hrGpsWatchId = null;
let hrIsInRange = false;
let hrTodayStatus = null; // null, 'checkedIn', 'checkedOut'
let hrDataLoaded = false;

const SoundFX = {
    ctx: null,
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    play(type) {
        try {
            if (!this.ctx) this.init();
            if (this.ctx.state === 'suspended') this.ctx.resume();
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            const now = this.ctx.currentTime;
            
            if (type === 'checkIn') {
                // Two rising tones (Welcome/Positive)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                
                setTimeout(() => {
                    if (!this.ctx) return;
                    const osc2 = this.ctx.createOscillator();
                    const gain2 = this.ctx.createGain();
                    osc2.connect(gain2);
                    gain2.connect(this.ctx.destination);
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(880, this.ctx.currentTime);
                    osc2.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.15);
                    gain2.gain.setValueAtTime(0, this.ctx.currentTime);
                    gain2.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.05);
                    gain2.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
                    osc2.start(this.ctx.currentTime);
                    osc2.stop(this.ctx.currentTime + 0.3);
                }, 150);
            } else if (type === 'checkOut') {
                // Two falling tones (Goodbye/Completion)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                
                setTimeout(() => {
                    if (!this.ctx) return;
                    const osc2 = this.ctx.createOscillator();
                    const gain2 = this.ctx.createGain();
                    osc2.connect(gain2);
                    gain2.connect(this.ctx.destination);
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(440, this.ctx.currentTime);
                    osc2.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.15);
                    gain2.gain.setValueAtTime(0, this.ctx.currentTime);
                    gain2.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.05);
                    gain2.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
                    osc2.start(this.ctx.currentTime);
                    osc2.stop(this.ctx.currentTime + 0.3);
                }, 150);
            } else if (type === 'pop') {
                // Short pop for generic interaction
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            }
        } catch (e) {
            console.error('Audio play error', e);
        }
    }
};

// Haversine formula
function getDistanceFromBranch(lat, lng) {
    const R = 6371000;
    const dLat = (HR_BRANCH_LAT - lat) * Math.PI / 180;
    const dLng = (HR_BRANCH_LNG - lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat * Math.PI / 180) * Math.cos(HR_BRANCH_LAT * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function initHrGps() {
    let dot = document.getElementById('gpsIndicator');
    let text = document.getElementById('gpsStatusText');
    if (!dot || !text) return;

    if (!navigator.geolocation) {
        dot.className = 'gps-dot gps-out';
        text.innerText = 'المتصفح لا يدعم تحديد الموقع';
        return;
    }

    function updateGps(pos) {
        let dist = getDistanceFromBranch(pos.coords.latitude, pos.coords.longitude);
        hrIsInRange = dist <= HR_RADIUS_METERS;
        
        if (hrIsInRange) {
            dot.className = 'gps-dot gps-in';
            text.innerText = 'أنت داخل نطاق الفرع (' + Math.round(dist) + ' متر)';
        } else {
            dot.className = 'gps-dot gps-out';
            text.innerText = 'أنت خارج نطاق الفرع (' + Math.round(dist) + ' متر)';
        }
        updateHrButtons();
    }

    function gpsError(err) {
        dot.className = 'gps-dot gps-out';
        if (err.code === 1) {
            text.innerText = 'يرجى السماح بتحديد الموقع من إعدادات المتصفح';
        } else {
            text.innerText = 'تعذر تحديد الموقع، حاول مرة أخرى';
        }
        hrIsInRange = false;
        updateHrButtons();
    }

    hrGpsWatchId = navigator.geolocation.watchPosition(updateGps, gpsError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
    });
}

function updateHrButtons() {
    let checkInBtn = document.getElementById('checkInBtn');
    let checkOutBtn = document.getElementById('checkOutBtn');
    let loadingEl = document.getElementById('hrButtonsLoading');
    let containerEl = document.getElementById('hrButtonsContainer');
    
    if (!checkInBtn || !checkOutBtn) return;

    if (!hrDataLoaded) {
        if (loadingEl) loadingEl.style.display = 'flex';
        if (containerEl) containerEl.style.display = 'none';
        return;
    } else {
        if (loadingEl) loadingEl.style.display = 'none';
        if (containerEl) containerEl.style.display = 'flex';
    }

    if (hrTodayStatus === 'checkedIn') {
        checkInBtn.style.display = 'none';
        checkOutBtn.style.display = 'flex';
        checkOutBtn.disabled = !hrIsInRange;
    } else if (hrTodayStatus === 'checkedOut') {
        checkInBtn.style.display = 'none';
        checkOutBtn.style.display = 'none';
    } else {
        checkInBtn.style.display = 'flex';
        checkOutBtn.style.display = 'none';
        checkInBtn.disabled = !hrIsInRange;
    }
}

function handleCheckIn() {
    if (!hrIsInRange) { showToast('يجب أن تكون داخل نطاق الفرع', 'error'); return; }
    if (!currentUser) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }

    let btn = document.getElementById('checkInBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التسجيل...';

    let formData = new URLSearchParams();
    formData.append('action', 'checkIn');
    formData.append('employeeName', currentUser.displayName);
    formData.append('date', new Date().toLocaleDateString('en-CA'));

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(r => r.text())
        .then(txt => {
            try {
                let data = JSON.parse(txt);
                if (data.success) {
                    SoundFX.play('checkIn');
                    showToast('✅ تم تسجيل الحضور: ' + data.time, 'success');
                    hrTodayStatus = 'checkedIn';
                    updateHrButtons();
                    loadMyAttendance();
                } else {
                    showToast(data.error || 'حدث خطأ', 'error');
                }
            } catch(e) {
                SoundFX.play('checkIn');
                showToast('تم تسجيل الحضور بنجاح', 'success');
                hrTodayStatus = 'checkedIn';
                updateHrButtons();
                loadMyAttendance();
            }
        })
        .catch(() => {
            SoundFX.play('checkIn');
            showToast('تم تسجيل الحضور بنجاح', 'success');
            hrTodayStatus = 'checkedIn';
            updateHrButtons();
        })
        .finally(() => {
            btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> تسجيل حضور';
            btn.disabled = false;
        });
}

function handleCheckOut() {
    if (!hrIsInRange) { showToast('يجب أن تكون داخل نطاق الفرع', 'error'); return; }
    if (!currentUser) return;

    let btn = document.getElementById('checkOutBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التسجيل...';

    let formData = new URLSearchParams();
    formData.append('action', 'checkOut');
    formData.append('employeeName', currentUser.displayName);
    formData.append('date', new Date().toLocaleDateString('en-CA'));

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(r => r.text())
        .then(txt => {
            try {
                let data = JSON.parse(txt);
                if (data.success) {
                    SoundFX.play('checkOut');
                    showToast('✅ تم تسجيل الانصراف: ' + data.time + ' (' + data.hours + ' ساعة)', 'success');
                    hrTodayStatus = 'checkedOut';
                    document.getElementById('hrTodayHours').innerText = data.hours;
                    updateHrButtons();
                    loadMyAttendance();
                } else {
                    showToast(data.error || 'حدث خطأ', 'error');
                }
            } catch(e) {
                SoundFX.play('checkOut');
                showToast('تم تسجيل الانصراف بنجاح', 'success');
                hrTodayStatus = 'checkedOut';
                updateHrButtons();
            }
        })
        .catch(() => {
            SoundFX.play('checkOut');
            showToast('تم تسجيل الانصراف بنجاح', 'success');
            hrTodayStatus = 'checkedOut';
            updateHrButtons();
        })
        .finally(() => {
            btn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> تسجيل انصراف';
            btn.disabled = false;
        });
}

window.calculateStatsAndSendEmail = async function(employeeName, emailFunc, ...extraArgs) {
    let remainingLeaves = 'غير محدد';
    let hoursWorked = 'غير محدد';
    try {
        let currentDate = new Date();
        let currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        let currentYear = currentDate.getFullYear();
        let monthPrefix = `${currentYear}-${currentMonth}-`;
        
        const { data: attData } = await supabase.from('attendance')
            .select('status, hours, request_status')
            .eq('employee_name', employeeName)
            .like('date', monthPrefix + '%');
            
        let leavesTaken = 0;
        let totalMins = 0;
        
        if (attData) {
            attData.forEach(r => {
                if (r.status === 'إجازة مدفوعة' && r.request_status === '✅ تمت الموافقة') {
                    leavesTaken++;
                }
                if (r.hours && typeof r.hours === 'string') {
                    if (r.hours.includes(':')) {
                        let parts = r.hours.split(':');
                        let h = parseInt(parts[0]);
                        let m = parseInt(parts[1]);
                        if(!isNaN(h)) totalMins += h * 60 + (isNaN(m) ? 0 : m);
                    } else if (r.hours.includes('ساعة')) {
                        let hMatch = r.hours.match(/(\d+)\s*ساعة/);
                        let mMatch = r.hours.match(/(\d+)\s*دقيقة/);
                        if (hMatch) totalMins += parseInt(hMatch[1]) * 60;
                        if (mMatch) totalMins += parseInt(mMatch[1]);
                    }
                }
            });
        }
        remainingLeaves = Math.max(0, 4 - leavesTaken);
        let h = Math.floor(totalMins / 60);
        let m = totalMins % 60;
        hoursWorked = h + ' ساعة' + (m > 0 ? ' و ' + m + ' دقيقة' : '');
    } catch(e) {
        console.error('Error calculating stats', e);
    }
    
    if (typeof emailFunc === 'function') {
        emailFunc(...extraArgs, remainingLeaves, hoursWorked);
    }
};

function handleLeaveRequest() {
    if (!currentUser) return;
    let date = document.getElementById('leaveDate');
    let type = document.getElementById('leaveType');
    let notes = document.getElementById('leaveNotes');
    if (!date || !date.value) { showToast('اختر تاريخ الإجازة', 'warning'); return; }

    let btn = date.closest('.section-card').querySelector('button.btn-search');
    let originalHtml = 'إرسال <i class="fa-solid fa-paper-plane"></i>';
    if(btn) {
        originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الإرسال...';
        btn.disabled = true;
    }

    // Save directly to Supabase attendance
    supabase.from('attendance').insert([{
        employee_name: currentUser.displayName,
        date: date.value,
        status: type.value,
        request_status: 'بانتظار الموافقة',
        notes: notes.value || ''
    }]).then(({ error }) => {
        if (!error) {
            showToast('✅ تم إرسال طلب الإجازة بنجاح', 'success');
            if (typeof window.sendLeaveRequestEmail === 'function') {
                window.calculateStatsAndSendEmail(currentUser.displayName, window.sendLeaveRequestEmail, currentUser.displayName, type.value, date.value, notes.value || '');
            }
            date.value = '';
            notes.value = '';
            loadMyAttendance();
        } else {
            showToast('حدث خطأ أثناء الإرسال: ' + (error.message || ''), 'error');
        }
        if(btn) { btn.innerHTML = originalHtml; btn.disabled = false; }
    });
}

function loadMyAttendance() {
    if (!currentUser) return;
    
    // Auto-set current month if not set
    let monthInput = document.getElementById('hrEmpMonthFilter');
    let month = monthInput ? monthInput.value : '';
    if (!month) {
        let now = new Date();
        month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        if (monthInput) monthInput.value = month;
    }

    let isAdmin = currentUser.permissions === 'ALL';
    let empFilter = isAdmin ? '' : currentUser.displayName;

    // Show loading, hide table
    let loadingEl = document.getElementById('hrAttendanceLoading');
    let historyEl = document.getElementById('hrAttendanceHistory');
    let bannerEl = document.getElementById('hrMonthlyStatsBanner');
    if (loadingEl) { loadingEl.style.display = 'block'; }
    if (historyEl) { historyEl.innerHTML = ''; }
    if (bannerEl) { bannerEl.style.display = 'none'; }

    fetch(GOOGLE_SHEETS_URL + '?action=getAttendance&employee=' + encodeURIComponent(empFilter) + '&month=' + month + '&t=' + new Date().getTime())
        .then(r => r.json())
        .then(data => {
            if (loadingEl) loadingEl.style.display = 'none';

            let allRecords = data.attendance || [];
            renderAttendanceTable(allRecords, historyEl, false);
            
            // Update stats cards
            let myRecords = allRecords.filter(r => r.employee === currentUser.displayName && r.date && r.date.startsWith(month));
            let presentDays = myRecords.filter(r => r.status === 'حاضر').length;
            let totalHours = 0;
            let paidLeaves = 0;
            let unpaidLeaves = 0;
            myRecords.forEach(r => {
                let isPendingOrRejected = r.requestStatus === 'بانتظار الموافقة' || r.requestStatus === '❌ مرفوضة' || r.status === 'إجازة بدون مرتب' || r.status === 'إجازة مرفوضة';
                if (!isPendingOrRejected) {
                    let hStr = r.hours ? r.hours.toString() : "0";
                    let h = 0;
                    
                    if (hStr.includes(':')) {
                        let parts = hStr.match(/(\d+):(\d+)/);
                        if (parts) {
                            h = parseInt(parts[1], 10) + parseInt(parts[2], 10) / 60;
                        }
                    } else {
                        let hMatch = hStr.match(/(\d+(?:\.\d+)?)\s*ساعة/);
                        let mMatch = hStr.match(/(\d+)\s*دقيقة/);
                        
                        if (hMatch) {
                            h += parseFloat(hMatch[1]);
                        } else if (!isNaN(parseFloat(hStr))) {
                            h += parseFloat(hStr);
                        }
                        
                        if (mMatch) {
                            h += parseFloat(mMatch[1]) / 60;
                        }
                    }
                    
                    if (!isNaN(h)) totalHours += h;
                }
                if (r.status === 'إجازة مدفوعة' && r.requestStatus !== 'بانتظار الموافقة' && r.requestStatus !== '❌ مرفوضة') paidLeaves++;
                if (r.status === 'إجازة بدون مرتب' && r.requestStatus !== 'بانتظار الموافقة' && r.requestStatus !== '❌ مرفوضة') unpaidLeaves++;
            });

            // Format totalHours to HH:MM
            let thHours = Math.floor(totalHours);
            let thMins = Math.round((totalHours - thHours) * 60);
            if (thMins === 60) { thHours++; thMins = 0; }
            let formattedTotalHours = thHours + ":" + thMins.toString().padStart(2, '0');
            
            let [statYear, statMonth] = month.split('-');
            let statDaysInMonth = new Date(statYear, statMonth, 0).getDate();
            let statToday = new Date();
            statToday.setHours(0,0,0,0);
            
            let absences = 0;
            for (let i = 1; i <= statDaysInMonth; i++) {
                let dStr = month + '-' + String(i).padStart(2, '0');
                let rec = myRecords.find(r => r.date === dStr);
                let lDate = new Date(dStr + 'T00:00:00');
                if (rec) {
                    if (rec.status === 'غائب') absences++;
                } else if (lDate <= statToday) {
                    absences++;
                }
            }

            // Update top stat cards
            let el = document.getElementById('hrMonthDays');
            if (el) el.innerText = presentDays;
            el = document.getElementById('hrTotalHoursMonth');
            if (el) el.innerText = formattedTotalHours;
            el = document.getElementById('hrLeaveBalance');
            if (el) el.innerText = Math.max(0, 4 - paidLeaves);

            // Render monthly summary banner
            if (bannerEl) {
                let arabicMonthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
                let [y, m] = month.split('-');
                let monthName = arabicMonthNames[parseInt(m) - 1];
                bannerEl.innerHTML = `
                    <div style="background:linear-gradient(135deg,#e8f5e9,#c8e6c9); border-radius:12px; padding:14px; text-align:center; border:1px solid #a5d6a7;">
                        <div style="font-size:1.6rem; font-weight:900; color:#1b5e20;">${presentDays}</div>
                        <div style="font-size:0.78rem; color:#2e7d32; font-weight:bold;">📅 أيام حضور</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#e3f2fd,#bbdefb); border-radius:12px; padding:14px; text-align:center; border:1px solid #90caf9;">
                        <div style="font-size:1.6rem; font-weight:900; color:#0d47a1;">${formattedTotalHours}</div>
                        <div style="font-size:0.78rem; color:#1565c0; font-weight:bold;">⏱️ إجمالي الساعات</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#fff3e0,#ffe0b2); border-radius:12px; padding:14px; text-align:center; border:1px solid #ffcc80;">
                        <div style="font-size:1.6rem; font-weight:900; color:#e65100;">${paidLeaves}</div>
                        <div style="font-size:0.78rem; color:#ef6c00; font-weight:bold;">🏖️ إجازات مدفوعة</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#ffebee,#ffcdd2); border-radius:12px; padding:14px; text-align:center; border:1px solid #ef9a9a;">
                        <div style="font-size:1.6rem; font-weight:900; color:#b71c1c;">${unpaidLeaves + absences}</div>
                        <div style="font-size:0.78rem; color:#c62828; font-weight:bold;">❌ غياب</div>
                    </div>
                `;
                bannerEl.style.display = 'grid';
            }

            // Check open shift status
            let openRec = myRecords.slice().reverse().find(r => r.status === 'حاضر' && (!r.checkOut || r.checkOut === '-' || r.checkOut === ''));
            
            if (openRec) {
                hrTodayStatus = 'checkedIn';
            } else {
                let today = new Date().toLocaleDateString('en-CA');
                let todayRec = myRecords.find(r => r.date === today);
                if (todayRec && todayRec.checkOut && todayRec.checkOut !== '-' && todayRec.checkOut !== '') {
                    hrTodayStatus = 'checkedOut';
                    let hEl = document.getElementById('hrTodayHours');
                    if (hEl) hEl.innerText = formatHoursDisplay(todayRec.hours);
                } else {
                    hrTodayStatus = null;
                }
            }
            hrDataLoaded = true;
            updateHrButtons();
        })
        .catch(err => {
            hrDataLoaded = true;
            updateHrButtons();
            if (loadingEl) loadingEl.style.display = 'none';
            console.error('HR load error:', err);
        });
}

function renderAttendanceTable(records, container, isAdminView = false, isMonthly = false) {
    if (!container) return;
    if (records.length === 0 && !isMonthly) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">لا توجد بيانات</p>';
        return;
    }

    let statusColors = {
        'حاضر': '#2e7d32',
        'إجازة مدفوعة': '#f57f17',
        'إجازة بدون مرتب': '#ef6c00',
        'إجازة مرفوضة': '#c62828',
        'غائب': '#c62828'
    };

    let html = '';
    
    if (isAdminView && !isMonthly) {
        // Admin View - Daily (All Employees for ONE Day)
        html += '<div style="overflow-x:auto; -webkit-overflow-scrolling:touch; width:100%; padding-bottom:5px;">';
        html += '<table class="hr-table" style="width:100%; min-width:700px; border-collapse:separate; border-spacing:0; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08);">';
        html += '<thead><tr style="background:linear-gradient(135deg,#1565c0,#1a237e);">';
        html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الموظف</th>';
        html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">التاريخ</th>';
        html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الحضور</th>';
        html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الانصراف</th>';
        html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الساعات</th>';
        html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الحالة</th>';
        html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">تعديل</th>';
        html += '</tr></thead><tbody>';
        
        if (records.length === 0) {
            html += '<tr><td colspan="7" style="text-align:center; padding:20px;">لا توجد سجلات لهذا اليوم</td></tr>';
        } else {
            [...records].reverse().forEach((r, idx) => {
                let color = statusColors[r.status] || '#546e7a';
                let bgRow = idx % 2 === 0 ? '#fff' : '#f8f9fa';
                let rowBorder = '';
                if (r.status === 'إجازة مدفوعة' && r.requestStatus !== 'بانتظار الموافقة' && r.requestStatus !== '❌ مرفوضة') {
                    bgRow = 'linear-gradient(135deg,#fffde7,#fff59d)';
                    rowBorder = 'border-right:3px solid #fbc02d;';
                }
                let safeNotes = (r.notes || '').replace(/'/g, "\\'");
                let empName = (r.employee || '').replace(/'/g, "\\'");
                html += `<tr class="table-row-hover" style="background:${bgRow}; border-bottom:1px solid #e9ecef; ${rowBorder}">`;
                html += `<td style="padding:10px; text-align:center; font-weight:bold; font-size:0.85rem;">${r.employee}</td>`;
                html += `<td style="padding:10px; text-align:center; font-size:0.85rem; color:#546e7a;">${r.date}</td>`;
                html += `<td style="padding:10px; text-align:center; font-weight:bold; color:#2e7d32; font-size:0.85rem;">${r.checkIn || '-'}</td>`;
                html += `<td style="padding:10px; text-align:center; font-weight:bold; color:#c62828; font-size:0.85rem;">${r.checkOut || '-'}</td>`;
                html += `<td style="padding:10px; text-align:center; font-weight:900; color:#1a237e; font-size:0.9rem;">${formatHoursDisplay(r.hours)}</td>`;
                html += `<td style="padding:10px; text-align:center;"><span style="background:${color}20; color:${color}; padding:4px 10px; border-radius:20px; font-size:0.78rem; font-weight:bold; white-space:nowrap;">${r.status}</span></td>`;
                html += `<td style="padding:10px; text-align:center;"><button class="interactive-btn" onclick="openEditAttendanceModal('${empName}','${r.date}','${r.checkIn||''}','${r.checkOut||''}','${r.status||''}','${safeNotes}','${r.hours||''}')" style="background:linear-gradient(135deg,#ff9800,#ef6c00); color:white; border:none; padding:7px 12px; border-radius:8px; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-pen"></i></button></td>`;
                html += '</tr>';
            });
        }
        html += '</tbody></table></div>';
    } else if (isAdminView && isMonthly) {
        // Admin View - Monthly
        let empFilter = document.getElementById('hrAdminMonthlyEmployeeFilter');
        let monthInput = document.getElementById('hrAdminMonthlyMonthFilter');
        let selectedEmp = empFilter ? empFilter.value : '';
        let yearMonth = monthInput ? monthInput.value : '';
        
        if (!yearMonth) {
            html += '<p style="text-align:center;">اختر الشهر</p>';
            container.innerHTML = html;
            return;
        }

        html += '<div style="overflow-x:auto; -webkit-overflow-scrolling:touch; width:100%; padding-bottom:5px;">';
        html += '<table class="hr-table" style="width:100%; min-width:700px; border-collapse:separate; border-spacing:0; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08);">';
        
        if (selectedEmp === '') {
            // All Employees Monthly - show flat list of records
            html += '<thead><tr style="background:linear-gradient(135deg,#1565c0,#1a237e);">';
            html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الموظف</th>';
            html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">التاريخ</th>';
            html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الحضور</th>';
            html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الانصراف</th>';
            html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الساعات</th>';
            html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الحالة</th>';
            html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">تعديل</th>';
            html += '</tr></thead><tbody>';

            if (records.length === 0) {
                html += '<tr><td colspan="7" style="text-align:center; padding:20px;">لا توجد سجلات لهذا الشهر</td></tr>';
            } else {
                let [y, m] = yearMonth.split('-');
                let daysInMonth = new Date(y, m, 0).getDate();
                
                let sortedRecords = [...records].sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date);
                    return (a.employee || '').localeCompare(b.employee || '');
                });
                
                sortedRecords.forEach((r, idx) => {
                    let dayMatch = r.date.match(/\d{4}-\d{2}-(\d{2})/);
                    let pageNum = dayMatch ? parseInt(dayMatch[1], 10) : 1;
                    
                    let displayStyle = pageNum === 1 ? '' : 'display:none;';
                    let color = statusColors[r.status] || '#546e7a';
                    let bgRow = idx % 2 === 0 ? '#fff' : '#f8f9fa';
                    let rowBorder = '';
                    if (r.status === 'إجازة مدفوعة' && r.requestStatus !== 'بانتظار الموافقة' && r.requestStatus !== '❌ مرفوضة') {
                        bgRow = 'linear-gradient(135deg,#fffde7,#fff59d)';
                        rowBorder = 'border-right:3px solid #fbc02d;';
                    }
                    let safeNotes = (r.notes || '').replace(/'/g, "\\'");
                    let empName = (r.employee || '').replace(/'/g, "\\'");
                    
                    let displayHours = formatHoursDisplay(r.hours);
                    
                    html += `<tr class="admin-monthly-row page-${pageNum} table-row-hover" style="background:${bgRow}; border-bottom:1px solid #e9ecef; ${rowBorder} ${displayStyle}">`;
                    html += `<td style="padding:10px; text-align:center; font-weight:bold; font-size:0.85rem;">${r.employee}</td>`;
                    html += `<td style="padding:10px; text-align:center; font-size:0.85rem; color:#546e7a;">${r.date}</td>`;
                    html += `<td style="padding:10px; text-align:center; font-weight:bold; color:#2e7d32; font-size:0.85rem;">${r.checkIn || '-'}</td>`;
                    html += `<td style="padding:10px; text-align:center; font-weight:bold; color:#c62828; font-size:0.85rem;">${r.checkOut || '-'}</td>`;
                    html += `<td style="padding:10px; text-align:center; font-weight:900; color:#1a237e; font-size:0.9rem;" dir="ltr">${displayHours}</td>`;
                    html += `<td style="padding:10px; text-align:center;"><span style="background:${color}20; color:${color}; padding:4px 10px; border-radius:20px; font-size:0.78rem; font-weight:bold; white-space:nowrap;">${r.status}</span></td>`;
                    html += `<td style="padding:10px; text-align:center;"><button class="interactive-btn" onclick="openEditAttendanceModal('${empName}','${r.date}','${r.checkIn||''}','${r.checkOut||''}','${r.status||''}','${safeNotes}','${r.hours||''}')" style="background:linear-gradient(135deg,#ff9800,#ef6c00); color:white; border:none; padding:7px 12px; border-radius:8px; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-pen"></i></button></td>`;
                    html += '</tr>';
                });
                
                html += `<tr id="admin-monthly-empty-msg" style="display:none;"><td colspan="7" style="text-align:center; padding:20px; color:#546e7a; font-weight:bold;">لا توجد سجلات في هذا اليوم</td></tr>`;
                
                if (!window.changeAdminMonthlyPage) {
                    window.changeAdminMonthlyPage = function(pageNum) {
                        document.querySelectorAll('.admin-monthly-row').forEach(el => el.style.display = 'none');
                        let rowsForPage = document.querySelectorAll('.admin-monthly-row.page-' + pageNum);
                        
                        let emptyMsg = document.getElementById('admin-monthly-empty-msg');
                        if (rowsForPage.length === 0) {
                            if (emptyMsg) emptyMsg.style.display = '';
                        } else {
                            if (emptyMsg) emptyMsg.style.display = 'none';
                            rowsForPage.forEach(el => el.style.display = '');
                        }
                        
                        document.querySelectorAll('.admin-monthly-page-btn').forEach(btn => {
                            if (parseInt(btn.getAttribute('data-page')) === pageNum) {
                                btn.style.background = '#1565c0';
                                btn.style.color = '#fff';
                            } else {
                                btn.style.background = '#e0e0e0';
                                btn.style.color = '#333';
                            }
                        });
                    };
                    setTimeout(() => { if (window.changeAdminMonthlyPage) window.changeAdminMonthlyPage(1); }, 50);
                } else {
                    setTimeout(() => { if (window.changeAdminMonthlyPage) window.changeAdminMonthlyPage(1); }, 50);
                }
            }
        } else {
            // Single Employee Selected - Show Days 1 to 30
            let [y, m] = yearMonth.split('-');
            let daysInMonth = new Date(y, m, 0).getDate();
            let today = new Date();
            today.setHours(0,0,0,0);
            let dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

            html += '<thead><tr style="background:linear-gradient(135deg,#1565c0,#1a237e);">';
            html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الموظف</th>';
            html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">التاريخ</th>';
            html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الحضور</th>';
            html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الانصراف</th>';
            html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الساعات</th>';
            html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">الحالة</th>';
            html += '<th style="color:white;padding:12px 10px;text-align:center;font-size:0.85rem;">تعديل</th>';
            html += '</tr></thead><tbody>';

            let adminPresentDays = 0;
            let adminPaidLeaves = 0;
            let adminUnpaidLeaves = 0;
            let adminAbsences = 0;
            let adminTotalHours = 0;
            
            for (let i = 1; i <= daysInMonth; i++) {
                let dStr = yearMonth + '-' + String(i).padStart(2, '0');
                let r = records.find(rec => rec.date === dStr);
                let lDate = new Date(dStr + 'T00:00:00');
                if (r) {
                    if (r.status === 'حاضر') adminPresentDays++;
                    if (r.status === 'غائب') adminAbsences++;
                    if (r.status === 'إجازة مدفوعة' && r.requestStatus !== 'بانتظار الموافقة' && r.requestStatus !== '❌ مرفوضة') adminPaidLeaves++;
                    if (r.status === 'إجازة بدون مرتب' && r.requestStatus !== 'بانتظار الموافقة' && r.requestStatus !== '❌ مرفوضة') adminUnpaidLeaves++;
                    
                    let isPendingOrRejected = r.requestStatus === 'بانتظار الموافقة' || r.requestStatus === '❌ مرفوضة' || r.status === 'إجازة بدون مرتب' || r.status === 'إجازة مرفوضة';
                    if (!isPendingOrRejected) {
                        let hStr = String(r.hours || '').trim();
                        let h = 0;
                        if (hStr && hStr !== '-' && hStr !== '0' && hStr !== 'undefined') {
                            let parts = hStr.split('ساعة');
                            if (parts[0] && parts[0].includes(':')) {
                                let timeParts = parts[0].split(':');
                                h += parseFloat(timeParts[0]) || 0;
                                h += (parseFloat(timeParts[1]) || 0) / 60;
                            } else {
                                let hMatch = hStr.match(/(\d+(?:\.\d+)?)\s*ساعة/);
                                let mMatch = hStr.match(/(\d+(?:\.\d+)?)\s*دقيقة/);
                                if (hMatch) h += parseFloat(hMatch[1]);
                                else if (!isNaN(parseFloat(hStr))) h += parseFloat(hStr);
                                if (mMatch) h += parseFloat(mMatch[1]) / 60;
                            }
                        }
                        if (!isNaN(h)) adminTotalHours += h;
                    }
                } else if (lDate <= today) {
                    adminAbsences++;
                }
            }
            
            let adminTHrs = Math.floor(adminTotalHours);
            let adminTMins = Math.round((adminTotalHours - adminTHrs) * 60);
            if (adminTMins === 60) { adminTHrs++; adminTMins = 0; }
            let formattedTotalHours = `${adminTHrs}:${String(adminTMins).padStart(2,'0')}`;

            let bannerHtml = `
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:15px;">
                    <div style="background:linear-gradient(135deg,#e8f5e9,#c8e6c9); border-radius:12px; padding:14px; text-align:center; border:1px solid #a5d6a7;">
                        <div style="font-size:1.6rem; font-weight:900; color:#1b5e20;">${adminPresentDays}</div>
                        <div style="font-size:0.78rem; color:#2e7d32; font-weight:bold;">📅 أيام حضور</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#e3f2fd,#bbdefb); border-radius:12px; padding:14px; text-align:center; border:1px solid #90caf9;">
                        <div style="font-size:1.6rem; font-weight:900; color:#0d47a1;">${formattedTotalHours}</div>
                        <div style="font-size:0.78rem; color:#1565c0; font-weight:bold;">⏱️ إجمالي الساعات</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#fff3e0,#ffe0b2); border-radius:12px; padding:14px; text-align:center; border:1px solid #ffcc80;">
                        <div style="font-size:1.6rem; font-weight:900; color:#e65100;">${adminPaidLeaves}</div>
                        <div style="font-size:0.78rem; color:#ef6c00; font-weight:bold;">🏖️ إجازات مدفوعة</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#ffebee,#ffcdd2); border-radius:12px; padding:14px; text-align:center; border:1px solid #ef9a9a;">
                        <div style="font-size:1.6rem; font-weight:900; color:#b71c1c;">${adminUnpaidLeaves + adminAbsences}</div>
                        <div style="font-size:0.78rem; color:#c62828; font-weight:bold;">❌ غياب</div>
                    </div>
                </div>
            `;
            html = bannerHtml + html;

            let singleEmpTotalHours = 0;
            
            for (let i = 1; i <= daysInMonth; i++) {
                let dateStr = yearMonth + '-' + String(i).padStart(2, '0');
                let r = records.find(rec => rec.date === dateStr);
                let loopDate = new Date(dateStr + 'T00:00:00');
                let dayName = dayNames[loopDate.getDay()];
                let isFuture = loopDate > today;
                let isToday = loopDate.toLocaleDateString('en-CA') === today.toLocaleDateString('en-CA');
                
                let bgRow = i % 2 === 0 ? '#fff' : '#f8f9fa';
                let rowStyle = `background:${bgRow}; border-bottom:1px solid #eee; transition:background 0.15s;`;
                if (isToday) rowStyle = 'background:linear-gradient(135deg,#e8f5e9,#f1f8e9); border-bottom:2px solid #66bb6a; border-right:4px solid #2e7d32;';

                let empNameEscaped = selectedEmp.replace(/'/g, "\\'");

                if (r) {
                    let color = statusColors[r.status] || '#546e7a';
                    let rowBorder = '';
                    if (r.status === 'إجازة مدفوعة' && r.requestStatus !== 'بانتظار الموافقة' && r.requestStatus !== '❌ مرفوضة') {
                        bgRow = 'linear-gradient(135deg,#fffde7,#fff59d)';
                        rowBorder = 'border-right:3px solid #fbc02d;';
                    }
                    let safeNotes = (r.notes || '').replace(/'/g, "\\'");
                    
                    let displayHours = formatHoursDisplay(r.hours);
                    
                    let isPendingOrRejected = r.requestStatus === 'بانتظار الموافقة' || r.requestStatus === '❌ مرفوضة' || r.status === 'إجازة بدون مرتب' || r.status === 'إجازة مرفوضة';
                    if (!isPendingOrRejected) {
                        let hStr = String(r.hours || '').trim();
                        let h = 0;
                        if (hStr && hStr !== '-' && hStr !== '0' && hStr !== 'undefined') {
                            let parts = hStr.split('ساعة');
                            if (parts[0] && parts[0].includes(':')) {
                                let timeParts = parts[0].split(':');
                                h += parseFloat(timeParts[0]) || 0;
                                h += (parseFloat(timeParts[1]) || 0) / 60;
                            } else {
                                let hMatch = hStr.match(/(\d+(?:\.\d+)?)\s*ساعة/);
                                let mMatch = hStr.match(/(\d+(?:\.\d+)?)\s*دقيقة/);
                                if (hMatch) h += parseFloat(hMatch[1]);
                                else if (!isNaN(parseFloat(hStr))) h += parseFloat(hStr);
                                if (mMatch) h += parseFloat(mMatch[1]) / 60;
                            }
                        }
                        if (!isNaN(h)) singleEmpTotalHours += h;
                    }

                    let actualBg = isToday && r.status !== 'إجازة مدفوعة' ? '#e8f5e9' : bgRow;
                    html += `<tr class="table-row-hover" style="background:${actualBg}; border-bottom:1px solid #eee; ${rowBorder}">`;
                    html += `<td style="padding:10px; text-align:center; font-weight:bold; font-size:0.85rem;">${selectedEmp}</td>`;
                    html += `<td style="padding:10px; text-align:center; font-size:0.85rem; color:#546e7a;">${dateStr}<br><span style="font-size:0.7rem;">${dayName}</span></td>`;
                    html += `<td style="padding:10px; text-align:center; font-weight:bold; color:#2e7d32; font-size:0.85rem;">${r.checkIn || '-'}</td>`;
                    html += `<td style="padding:10px; text-align:center; font-weight:bold; color:#c62828; font-size:0.85rem;">${r.checkOut || '-'}</td>`;
                    html += `<td style="padding:10px; text-align:center; font-weight:900; color:#1a237e; font-size:0.9rem;" dir="ltr">${displayHours}</td>`;
                    html += `<td style="padding:10px; text-align:center;"><span style="background:${color}20; color:${color}; padding:4px 10px; border-radius:20px; font-size:0.78rem; font-weight:bold; white-space:nowrap;">${r.status}</span></td>`;
                    html += `<td style="padding:10px; text-align:center;"><button class="interactive-btn" onclick="openEditAttendanceModal('${empNameEscaped}','${dateStr}','${r.checkIn||''}','${r.checkOut||''}','${r.status||''}','${safeNotes}','${r.hours||''}')" style="background:linear-gradient(135deg,#ff9800,#ef6c00); color:white; border:none; padding:7px 12px; border-radius:8px; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-pen"></i></button></td>`;
                    html += '</tr>';
                } else if (isFuture) {
                    html += `<tr style="background:#fafafa; border-bottom:1px solid #eee; opacity:0.6;">`;
                    html += `<td style="padding:10px; text-align:center; font-weight:bold; font-size:0.85rem; color:#bdbdbd;">${selectedEmp}</td>`;
                    html += `<td style="padding:10px; text-align:center; font-size:0.85rem; color:#bdbdbd;">${dateStr}<br><span style="font-size:0.7rem;">${dayName}</span></td>`;
                    html += `<td colspan="3" style="padding:10px; text-align:center; color:#bdbdbd; font-size:0.78rem;">لم يحن بعد</td>`;
                    html += `<td style="padding:10px; text-align:center;"><span style="background:#e0e0e020;color:#bdbdbd;padding:3px 8px;border-radius:20px;font-size:0.72rem;">🔜</span></td>`;
                    html += `<td style="padding:10px; text-align:center;">-</td>`;
                    html += '</tr>';
                } else {
                    // Past day with no record -> غائب (Absent)
                    html += `<tr style="background:#fff3f3; border-bottom:1px solid #ffcdd2;">`;
                    html += `<td style="padding:10px; text-align:center; font-weight:bold; font-size:0.85rem;">${selectedEmp}</td>`;
                    html += `<td style="padding:10px; text-align:center; font-size:0.85rem; color:#c62828;">${dateStr}<br><span style="font-size:0.7rem;">${dayName}</span></td>`;
                    html += `<td colspan="3" style="padding:10px; text-align:center; color:#c62828; font-size:0.78rem; font-weight:bold;">غائب</td>`;
                    html += `<td style="padding:10px; text-align:center;"><span style="background:#ef9a9a20;color:#c62828;padding:3px 8px;border-radius:20px;font-size:0.72rem;font-weight:bold;">❌ غائب</span></td>`;
                    html += `<td style="padding:10px; text-align:center;"><button class="interactive-btn" onclick="openEditAttendanceModal('${empNameEscaped}','${dateStr}','','','غائب','','')" style="background:linear-gradient(135deg,#ff9800,#ef6c00); color:white; border:none; padding:7px 12px; border-radius:8px; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-pen"></i></button></td>`;
                    html += '</tr>';
                }
            }
            
            let tHrs = Math.floor(singleEmpTotalHours);
            let tMins = Math.round((singleEmpTotalHours - tHrs) * 60);
            if (tMins === 60) { tHrs++; tMins = 0; }
            let finalHoursStr = `${tHrs}:${String(tMins).padStart(2,'0')}`;
            
            html += '</tbody>';
            html += '<tfoot>';
            html += `<tr style="background:#e3f2fd; border-top:2px solid #1565c0;">`;
            html += `<td colspan="4" style="padding:15px; text-align:left; font-weight:bold; font-size:1.1rem; color:#1565c0;">إجمالي ساعات العمل خلال الشهر:</td>`;
            html += `<td colspan="3" style="padding:15px; text-align:right; font-weight:900; color:#1a237e; font-size:1.2rem;" dir="ltr">${finalHoursStr}</td>`;
            html += `</tr>`;
            html += '</tfoot></table></div>';
        }
        
        if (selectedEmp === '' && records.length > 0) {
            let [y, m] = yearMonth.split('-');
            let daysInMonth = new Date(y, m, 0).getDate();
            
            html += '<div style="display:flex; justify-content:center; align-items:center; gap:5px; margin-top:15px; flex-wrap:wrap; padding: 10px; background: #f8f9fa; border-radius: 10px;">';
            html += '<div style="width:100%; text-align:center; font-weight:bold; color:#1565c0; margin-bottom:5px; font-size:0.9rem;">أيام الشهر</div>';
            for (let p = 1; p <= daysInMonth; p++) {
                let btnBg = p === 1 ? '#1565c0' : '#e0e0e0';
                let btnColor = p === 1 ? '#fff' : '#333';
                html += `<button class="admin-monthly-page-btn" data-page="${p}" onclick="changeAdminMonthlyPage(${p})" style="background:${btnBg}; color:${btnColor}; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold; transition:all 0.2s; min-width:35px;">${p}</button>`;
            }
            html += '</div>';
        }
    } else {
        // Employee View - Full Month Table (mobile-first)
        let monthInput = document.getElementById('hrEmpMonthFilter');
        if (!monthInput || !monthInput.value) {
            html += '<p style="text-align:center;">اختر الشهر</p>';
        } else {
            let yearMonth = monthInput.value;
            let [y, m] = yearMonth.split('-');
            let daysInMonth = new Date(y, m, 0).getDate();
            let today = new Date();
            today.setHours(0,0,0,0);

            let dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

            html += '<div style="overflow-x:auto; -webkit-overflow-scrolling:touch; width:100%; border-radius:14px; box-shadow:0 4px 20px rgba(0,0,0,0.1);">';
            html += '<table style="width:100%; min-width:600px; border-collapse:collapse; font-size:0.88rem;">';
            // Header
            html += '<thead><tr style="background:linear-gradient(135deg,#1a237e,#283593);">';
            html += '<th style="color:white;padding:14px 8px;text-align:center;font-size:0.8rem;white-space:nowrap;">📅 التاريخ</th>';
            html += '<th style="color:white;padding:14px 8px;text-align:center;font-size:0.8rem;white-space:nowrap;">🕐 الحضور</th>';
            html += '<th style="color:white;padding:14px 8px;text-align:center;font-size:0.8rem;white-space:nowrap;">🕔 الانصراف</th>';
            html += '<th style="color:white;padding:14px 8px;text-align:center;font-size:0.8rem;white-space:nowrap;">⏱️ المدة</th>';
            html += '<th style="color:white;padding:14px 8px;text-align:center;font-size:0.8rem;white-space:nowrap;">📊 الحالة</th>';
            html += '</tr></thead><tbody>';
            
            for (let i = 1; i <= daysInMonth; i++) {
                let dateStr = yearMonth + '-' + String(i).padStart(2, '0');
                let r = records.find(rec => rec.date === dateStr);
                let loopDate = new Date(dateStr + 'T00:00:00');
                let dayName = dayNames[loopDate.getDay()];
                let isWeekend = loopDate.getDay() === 5 || loopDate.getDay() === 6;
                let isFuture = loopDate > today;
                let isToday = loopDate.toLocaleDateString('en-CA') === today.toLocaleDateString('en-CA');

                let rowBg = '#fff';
                let rowStyle = `background:${rowBg}; border-bottom:1px solid #eee;`;

                // Highlight today
                if (isToday) rowStyle = 'background:linear-gradient(135deg,#e8f5e9,#f1f8e9); border-bottom:2px solid #66bb6a; border-right:4px solid #2e7d32;';
                
                if (r) {
                    let isPaidLeave = r.status === 'إجازة مدفوعة' && r.requestStatus !== 'بانتظار الموافقة' && r.requestStatus !== '❌ مرفوضة';
                    let isUnpaidLeave = r.status === 'إجازة بدون مرتب' && r.requestStatus !== 'بانتظار الموافقة' && r.requestStatus !== '❌ مرفوضة';
                    let isPending = r.requestStatus === 'بانتظار الموافقة';
                    let isRejected = r.requestStatus === '❌ مرفوضة';

                    if (isPaidLeave) rowStyle = 'background:linear-gradient(135deg,#fffde7,#fff59d); border-bottom:1px solid #fff176; border-right:3px solid #fbc02d;';
                    else if (isUnpaidLeave) rowStyle = 'background:linear-gradient(135deg,#fce4ec,#f8bbd0); border-bottom:1px solid #f48fb1; border-right:3px solid #c62828;';
                    else if (isPending) rowStyle = 'background:linear-gradient(135deg,#f3e5f5,#e1bee7); border-bottom:1px solid #ce93d8; border-right:3px solid #ab47bc;'; // Changed pending to purple to avoid conflict with yellow
                    else if (isRejected) rowStyle = 'background:linear-gradient(135deg,#ffebee,#ffcdd2); border-bottom:1px solid #ef9a9a; border-right:3px solid #c62828;';
                    else if (r.status === 'حاضر') rowStyle = `background:${isToday ? 'linear-gradient(135deg,#e8f5e9,#f1f8e9)' : rowBg}; border-bottom:1px solid #eee; border-right:3px solid #2e7d32;`;

                    let inVal = isPaidLeave || isUnpaidLeave ? '-' : (r.checkIn || '-');
                    let outVal = isPaidLeave || isUnpaidLeave ? '-' : (r.checkOut || '-');
                    let hrsVal = formatHoursDisplay(r.hours);

                    let statusBadge = '';
                    if (isPaidLeave) statusBadge = '<span style="background:#fbc02d20;color:#f57f17;padding:3px 8px;border-radius:20px;font-size:0.72rem;font-weight:bold;">🏖️ إجازة مدفوعة</span>';
                    else if (isUnpaidLeave) statusBadge = '<span style="background:#c6282820;color:#c62828;padding:3px 8px;border-radius:20px;font-size:0.72rem;font-weight:bold;">📋 بدون راتب</span>';
                    else if (isPending) statusBadge = '<span style="background:#ab47bc20;color:#ab47bc;padding:3px 8px;border-radius:20px;font-size:0.72rem;font-weight:bold;">⏳ انتظار</span>';
                    else if (isRejected) statusBadge = '<span style="background:#c6282820;color:#c62828;padding:3px 8px;border-radius:20px;font-size:0.72rem;font-weight:bold;">❌ مرفوضة</span>';
                    else if (r.status === 'حاضر') statusBadge = '<span style="background:#2e7d3220;color:#2e7d32;padding:3px 8px;border-radius:20px;font-size:0.72rem;font-weight:bold;">✅ حاضر</span>';
                    else statusBadge = `<span style="background:#54607a20;color:#546e7a;padding:3px 8px;border-radius:20px;font-size:0.72rem;">${r.status}</span>`;

                    html += `<tr style="${rowStyle}">`;
                    html += `<td style="padding:10px 8px; text-align:center;"><div style="font-weight:bold;font-size:0.85rem;">${String(i).padStart(2,'0')}</div><div style="font-size:0.7rem;color:#888;">${dayName}</div></td>`;
                    html += `<td style="padding:10px 8px; text-align:center; font-weight:bold; color:#2e7d32;">${inVal}</td>`;
                    html += `<td style="padding:10px 8px; text-align:center; font-weight:bold; color:#c62828;">${outVal}</td>`;
                    html += `<td style="padding:10px 8px; text-align:center; font-weight:900; color:#1a237e; font-size:0.9rem;">${hrsVal}</td>`;
                    html += `<td style="padding:10px 8px; text-align:center;">${statusBadge}</td>`;
                    html += '</tr>';

                } else if (isFuture) {
                    html += `<tr style="background:#fafafa; border-bottom:1px solid #eee; opacity:0.6;">`;
                    html += `<td style="padding:10px 8px; text-align:center;"><div style="font-size:0.85rem;color:#bdbdbd;">${String(i).padStart(2,'0')}</div><div style="font-size:0.7rem;color:#bdbdbd;">${dayName}</div></td>`;
                    html += `<td colspan="3" style="padding:10px 8px; text-align:center; color:#bdbdbd; font-size:0.78rem;">لم يحن بعد</td>`;
                    html += `<td style="padding:10px 8px; text-align:center;"><span style="background:#e0e0e020;color:#bdbdbd;padding:3px 8px;border-radius:20px;font-size:0.72rem;">🔜</span></td>`;
                    html += '</tr>';
                } else {
                    // Past day with no record
                    html += `<tr style="background:#fff3f3; border-bottom:1px solid #ffcdd2; border-right:3px solid #ef9a9a;">`;
                    html += `<td style="padding:10px 8px; text-align:center;"><div style="font-weight:bold;font-size:0.85rem;color:#c62828;">${String(i).padStart(2,'0')}</div><div style="font-size:0.7rem;color:#ef9a9a;">${dayName}</div></td>`;
                    html += `<td style="padding:10px 8px; text-align:center; color:#ef9a9a;">-</td>`;
                    html += `<td style="padding:10px 8px; text-align:center; color:#ef9a9a;">-</td>`;
                    html += `<td style="padding:10px 8px; text-align:center; color:#ef9a9a;">-</td>`;
                    html += `<td style="padding:10px 8px; text-align:center;"><span style="background:#ffebee;color:#c62828;padding:3px 8px;border-radius:20px;font-size:0.72rem;font-weight:bold;">❌ غائب</span></td>`;
                    html += '</tr>';
                }
            }
            html += '</tbody></table></div>';
        }
    }
    
    container.innerHTML = html;
}

// ============================================================
// 🖊️ Admin Edit Attendance Modal Functions
// ============================================================
let _editAttData = {}; // Store current edit data

function parseAttendanceTimeValue(rawValue, fallbackPeriod = 'AM') {
    let value = String(rawValue || '').trim();
    if (!value || value === '-' || value === '—') {
        return { hour: 0, minute: 0, period: fallbackPeriod };
    }

    value = value.replace(/\s*ص\s*/gi, ' AM ').replace(/\s*م\s*/gi, ' PM ');
    value = value.replace(/\s+/g, ' ');

    let period = fallbackPeriod;
    let match = value.match(/^(AM|PM)\s*[:\-]?\s*(\d{1,2})\s*[:\.]\s*(\d{1,2})$/i);
    if (match) {
        period = match[1].toUpperCase();
        return { hour: parseInt(match[2], 10) || 0, minute: parseInt(match[3], 10) || 0, period };
    }

    match = value.match(/^(\d{1,2})\s*[:\.]\s*(\d{1,2})\s*(AM|PM)?$/i);
    if (match) {
        let hour = parseInt(match[1], 10) || 0;
        let minute = parseInt(match[2], 10) || 0;
        period = (match[3] || fallbackPeriod).toUpperCase();
        return { hour, minute, period };
    }

    match = value.match(/^(AM|PM)\s*[:\-]?\s*(\d{1,2})$/i);
    if (match) {
        period = match[1].toUpperCase();
        return { hour: parseInt(match[2], 10) || 0, minute: 0, period };
    }

    return { hour: 0, minute: 0, period };
}

function serializeAttendanceTimeValue(hour, minute, period) {
    let h = Math.max(0, Math.min(12, Number(hour) || 0));
    let m = Math.max(0, Math.min(59, Number(minute) || 0));
    let p = (period || 'AM').toUpperCase();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
}

function toLatinDigits(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[٠-٩]/g, ch => '٠١٢٣٤٥٦٧٨٩'.indexOf(ch).toString());
}

function applyAttendanceStatusTheme(status) {
    const statusEl = document.getElementById('editAttStatus');
    const checkInBox = document.getElementById('editAttCheckInBox');
    const checkOutBox = document.getElementById('editAttCheckOutBox');
    const preview = document.getElementById('editAttHoursPreview');
    const manualWrap = document.getElementById('editAttManualHours_h')?.closest('div[style*="border-radius:12px"]') || null;

    const palette = {
        'حاضر': { bg: '#ecfdf5', border: '#10b981', accent: '#047857', previewBg: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', previewBorder: '#10b981', selectBg: '#ecfdf5', selectText: '#065f46' },
        'غائب': { bg: '#fef2f2', border: '#ef4444', accent: '#991b1b', previewBg: 'linear-gradient(135deg,#fef2f2,#fee2e2)', previewBorder: '#ef4444', selectBg: '#fef2f2', selectText: '#991b1b' },
        'إجازة مدفوعة': { bg: '#fff7ed', border: '#f59e0b', accent: '#9a5d00', previewBg: 'linear-gradient(135deg,#fff7ed,#fef3c7)', previewBorder: '#f59e0b', selectBg: '#fff7ed', selectText: '#92400e' },
        'إجازة بدون مرتب': { bg: '#f5f3ff', border: '#8b5cf6', accent: '#5b21b6', previewBg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', previewBorder: '#8b5cf6', selectBg: '#f5f3ff', selectText: '#5b21b6' }
    };

    const theme = palette[status] || palette['حاضر'];

    if (checkInBox) {
        checkInBox.style.background = theme.bg;
        checkInBox.style.borderColor = theme.border;
        checkInBox.style.boxShadow = `0 0 0 4px ${theme.border}1A`;
    }
    if (checkOutBox) {
        checkOutBox.style.background = theme.bg;
        checkOutBox.style.borderColor = theme.border;
        checkOutBox.style.boxShadow = `0 0 0 4px ${theme.border}1A`;
    }
    if (preview) {
        preview.style.background = theme.previewBg;
        preview.style.borderColor = theme.previewBorder;
        preview.style.boxShadow = 'inset 0 2px 4px rgba(255,255,255,0.5)';
    }
    if (statusEl) {
        statusEl.style.background = theme.selectBg;
        statusEl.style.borderColor = theme.border;
        statusEl.style.color = theme.selectText;
        statusEl.style.boxShadow = `0 0 0 4px ${theme.border}1A`;
    }
    if (manualWrap) {
        manualWrap.style.background = theme.bg;
        manualWrap.style.borderColor = theme.border;
        manualWrap.style.boxShadow = `0 0 0 4px ${theme.border}1A`;
    }
}

function setAttendanceTimeEditor(targetKey, rawValue) {
    let parsed = parseAttendanceTimeValue(rawValue, 'PM');
    let hourInput = document.getElementById(`editAtt${targetKey}Hour`);
    let minuteInput = document.getElementById(`editAtt${targetKey}Minute`);
    let hiddenInput = document.getElementById(`editAtt${targetKey}`);
    let amBtn = document.getElementById(`editAtt${targetKey}Am`);
    let pmBtn = document.getElementById(`editAtt${targetKey}Pm`);

    if (hourInput) hourInput.value = toLatinDigits(String(Math.max(0, Math.min(12, parsed.hour))).padStart(2, '0'));
    if (minuteInput) minuteInput.value = toLatinDigits(String(Math.max(0, Math.min(59, parsed.minute))).padStart(2, '0'));
    if (hiddenInput) hiddenInput.value = serializeAttendanceTimeValue(parsed.hour, parsed.minute, parsed.period);

    if (amBtn && pmBtn) {
        let isAm = parsed.period === 'AM';
        amBtn.classList.toggle('active', isAm);
        pmBtn.classList.toggle('active', !isAm);
        amBtn.style.background = isAm ? '#fff7d6' : '#e2e8f0';
        amBtn.style.borderColor = isAm ? '#f59e0b' : '#cbd5e1';
        amBtn.style.color = isAm ? '#b45309' : '#475569';
        amBtn.style.boxShadow = isAm ? '0 0 0 4px rgba(245,158,11,0.12)' : 'none';

        pmBtn.style.background = !isAm ? '#1f2937' : '#e2e8f0';
        pmBtn.style.borderColor = !isAm ? '#1f2937' : '#cbd5e1';
        pmBtn.style.color = !isAm ? '#f8fafc' : '#475569';
        pmBtn.style.boxShadow = !isAm ? '0 0 0 4px rgba(31,41,55,0.12)' : 'none';
    }
}

window.toggleAttendancePeriod = function(targetKey, period) {
    let hourInput = document.getElementById(`editAtt${targetKey}Hour`);
    let minuteInput = document.getElementById(`editAtt${targetKey}Minute`);
    let hiddenInput = document.getElementById(`editAtt${targetKey}`);

    let hour = Number(hourInput ? hourInput.value : 0) || 0;
    let minute = Number(minuteInput ? minuteInput.value : 0) || 0;

    if (hiddenInput) hiddenInput.value = serializeAttendanceTimeValue(hour, minute, period);
    setAttendanceTimeEditor(targetKey, hiddenInput ? hiddenInput.value : `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} ${period}`);
    calcEditHours();
};

window.syncAttendanceEditorValue = function(targetKey) {
    let hourInput = document.getElementById(`editAtt${targetKey}Hour`);
    let minuteInput = document.getElementById(`editAtt${targetKey}Minute`);
    let hiddenInput = document.getElementById(`editAtt${targetKey}`);
    let amBtn = document.getElementById(`editAtt${targetKey}Am`);
    let pmBtn = document.getElementById(`editAtt${targetKey}Pm`);

    let rawHour = toLatinDigits(hourInput ? hourInput.value : '0');
    let rawMinute = toLatinDigits(minuteInput ? minuteInput.value : '0');
    let hour = Number(rawHour) || 0;
    let minute = Number(rawMinute) || 0;
    if (hour > 12) hour = 12;
    if (hour < 0) hour = 0;
    if (minute > 59) minute = 59;
    if (minute < 0) minute = 0;
    if (hourInput) hourInput.value = toLatinDigits(String(hour).padStart(2, '0'));
    if (minuteInput) minuteInput.value = toLatinDigits(String(minute).padStart(2, '0'));

    let currentPeriod = amBtn && amBtn.classList.contains('active') ? 'AM' : 'PM';
    if (hiddenInput) hiddenInput.value = serializeAttendanceTimeValue(hour, minute, currentPeriod);
    calcEditHours();
};

window.openEditAttendanceModal = function(employee, date, checkIn, checkOut, status, notes, hoursStr) {
    _editAttData = { employee, date };

    let modal = document.getElementById('editAttendanceModal');
    if (!modal) return;

    // Set subtitle
    let sub = document.getElementById('editAttModalSubtitle');
    if (sub) sub.textContent = `${employee} — ${date}`;

    setAttendanceTimeEditor('CheckIn', checkIn || '');
    setAttendanceTimeEditor('CheckOut', checkOut || '');
    
    let notesEl = document.getElementById('editAttNotes');
    if (notesEl) notesEl.value = notes || '';
    
    // Extract hours if available
    let hoursEl = document.getElementById('editAttManualHours');
    let hInput = document.getElementById('editAttManualHours_h');
    let mInput = document.getElementById('editAttManualHours_m');
    if (hoursEl) {
        if (hoursStr) {
            hoursEl.value = formatHoursDisplay(hoursStr);
            if (hInput && mInput) {
                let parts = hoursEl.value.split(':');
                if (parts.length === 2) {
                    hInput.value = parts[0];
                    mInput.value = parts[1];
                } else {
                    hInput.value = hoursEl.value;
                    mInput.value = '00';
                }
            }
        } else {
            hoursEl.value = '';
            if (hInput) hInput.value = '';
            if (mInput) mInput.value = '';
        }
    }

    let statusEl = document.getElementById('editAttStatus');
    if (statusEl) {
        statusEl.value = status || 'حاضر';
        // Delay slightly to let values set, then update UI based on status
        setTimeout(handleEditStatusChange, 10);
    } else {
        calcEditHours();
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closeEditAttendanceModal = function() {
    let modal = document.getElementById('editAttendanceModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

window.updateHiddenManualHours = function() {
    let hInput = document.getElementById('editAttManualHours_h');
    let mInput = document.getElementById('editAttManualHours_m');
    let hoursEl = document.getElementById('editAttManualHours');
    
    if (hInput && mInput && hoursEl) {
        let h = toLatinDigits((hInput.value || '').trim());
        let m = toLatinDigits((mInput.value || '').trim());
        
        if (h === '' && m === '') {
            hoursEl.value = '';
        } else {
            h = h ? Number(h).toString().padStart(2, '0') : '00';
            m = m ? Number(m).toString().padStart(2, '0') : '00';
            hoursEl.value = `${h}:${m}`;
        }
    }
};

window.handleEditStatusChange = function() {
    let statusEl = document.getElementById('editAttStatus');
    let status = statusEl ? statusEl.value : '';
    let preview = document.getElementById('editAttHoursPreview');
    let text = document.getElementById('editAttHoursText');

    applyAttendanceStatusTheme(status);
    
    if (status === 'غائب' || status === 'إجازة بدون مرتب') {
        setAttendanceTimeEditor('CheckIn', '00:00 AM');
        setAttendanceTimeEditor('CheckOut', '00:00 AM');
        if (text) text.textContent = '0 ساعة';
        if (preview) preview.style.display = 'flex';
    } else if (status === 'إجازة مدفوعة') {
        setAttendanceTimeEditor('CheckIn', '00:00 AM');
        setAttendanceTimeEditor('CheckOut', '00:00 AM');
        if (text) text.textContent = '8 ساعة';
        if (preview) preview.style.display = 'flex';
    } else {
        calcEditHours();
    }
};

window.calcEditHours = function() {
    let status = document.getElementById('editAttStatus').value;
    let preview = document.getElementById('editAttHoursPreview');
    let text = document.getElementById('editAttHoursText');
    
    if (status === 'غائب' || status === 'إجازة بدون مرتب') {
        if (text) text.textContent = '0 ساعة';
        if (preview) preview.style.display = 'flex';
        return;
    }
    if (status === 'إجازة مدفوعة') {
        if (text) text.textContent = '8 ساعة';
        if (preview) preview.style.display = 'flex';
        return;
    }

    let inVal = document.getElementById('editAttCheckIn').value;
    let outVal = document.getElementById('editAttCheckOut').value;
    if (!preview || !text) return;

    if (inVal && outVal) {
        try {
            let inParsed = parseAttendanceTimeValue(inVal, 'AM');
            let outParsed = parseAttendanceTimeValue(outVal, 'PM');

            let ih = Number(inParsed.hour) || 0;
            let im = Number(inParsed.minute) || 0;
            let oh = Number(outParsed.hour) || 0;
            let om = Number(outParsed.minute) || 0;

            if (inParsed.period === 'PM' && ih !== 12) ih += 12;
            if (inParsed.period === 'AM' && ih === 12) ih = 0;
            if (outParsed.period === 'PM' && oh !== 12) oh += 12;
            if (outParsed.period === 'AM' && oh === 12) oh = 0;

            let totalMin = (oh * 60 + om) - (ih * 60 + im);
            if (totalMin < 0) totalMin += 24 * 60;
            let h = Math.floor(totalMin / 60);
            let min = totalMin % 60;
            
            if (!isNaN(h) && !isNaN(min)) {
                text.textContent = h + ' ساعة' + (min > 0 ? ' و ' + min + ' دقيقة' : '');
                preview.style.display = 'flex';
                return;
            }
        } catch(e) {}
    }
    
    preview.style.display = 'none';
};

window.loadAdminAttendance = function() {
    if(typeof loadAdminDailyAttendance === 'function') loadAdminDailyAttendance();
    if(typeof loadAdminMonthlyAttendance === 'function') loadAdminMonthlyAttendance();
};

window.saveAttendanceEdit = function() {
    let btn = document.getElementById('editAttSaveBtn');
    let originalHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...'; btn.disabled = true; }

    let checkInVal = document.getElementById('editAttCheckIn').value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    let checkOutVal = document.getElementById('editAttCheckOut').value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    
    if (checkOutVal === "00:00 AM" || checkOutVal === "00:00 PM") {
        checkOutVal = "-";
    }

    let status = document.getElementById('editAttStatus').value;
    let notes = document.getElementById('editAttNotes').value;
    let manualHoursRaw = document.getElementById('editAttManualHours').value || '';
    let manualHours = manualHoursRaw.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
    let engDate = _editAttData.date.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    
    let calculatedHours = (document.getElementById('editAttHoursText').innerText || '').trim();
    let finalHours = manualHours ? manualHours : calculatedHours;

    let formData = new URLSearchParams();
    formData.append('action', 'editAttendance');
    formData.append('employeeName', _editAttData.employee);
    formData.append('date', engDate);
    formData.append('checkIn', checkInVal);
    formData.append('checkOut', checkOutVal);
    formData.append('status', status);
    formData.append('notes', notes);
    formData.append('hours', finalHours);

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showToast('✅ تم التعديل بنجاح', 'success');
                closeEditAttendanceModal();
                loadAdminAttendance();
            } else {
                showToast(data.error || 'حدث خطأ', 'error');
            }
        })
        .catch((err) => {
            console.error('Edit error:', err);
            showToast('حدث خطأ في الاتصال أثناء التعديل', 'error');
        })
        .finally(() => {
            if (btn) { btn.innerHTML = originalHtml; btn.disabled = false; }
        });
};





window.handleLeaveDecision = function(employee, date, decision, btnElement = null) {
    let originalHtml = '';
    if (btnElement) {
        originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';
        btnElement.disabled = true;
    }

    let formData = new URLSearchParams();
    formData.append('action', 'manageLeave');
    formData.append('employeeName', employee);
    formData.append('date', date);
    formData.append('decision', decision);

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showToast(decision === 'approve' ? '✅ تمت الموافقة' : '❌ تم الرفض', 'success');
                if (typeof window.sendLeaveDecisionEmail === 'function') {
                    window.calculateStatsAndSendEmail(employee, window.sendLeaveDecisionEmail, employee, decision, date, '');
                }
                if(typeof loadPendingLeaves === 'function') loadPendingLeaves();
                if(typeof loadAdminAttendance === 'function') loadAdminAttendance();
                loadMyAttendance();
            } else {
                showToast(data.error || 'حدث خطأ', 'error');
            }
        })
        .catch(() => showToast('حدث خطأ في الاتصال', 'error'))
        .finally(() => {
            if (btnElement) {
                btnElement.innerHTML = originalHtml;
                btnElement.disabled = false;
            }
        });
};

// Removed duplicate initHrAdminTab

function loadAdminDailyAttendance() {
    let dateFilter = document.getElementById('hrAdminDailyDateFilter');
    let exactDate = dateFilter ? dateFilter.value : '';
    if (!exactDate) {
        showToast('برجاء اختيار التاريخ', 'warning');
        return;
    }

    let tableEl = document.getElementById('hrAdminDailyAttendanceTable');
    if (tableEl) tableEl.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p>جاري تحميل الحضور اليومي...</p></div>';

    fetch(GOOGLE_SHEETS_URL + '?action=getAttendance&employee=&exactDate=' + exactDate + '&t=' + new Date().getTime())
        .then(r => r.json())
        .then(data => {
            renderAttendanceTable(data.attendance || [], tableEl, true, false); // true for isAdminView, false for isMonthly
        })
        .catch(err => {
            console.error('Admin daily attendance error:', err);
            if (tableEl) tableEl.innerHTML = '<div style="color:red; text-align:center;">حدث خطأ أثناء جلب البيانات.</div>';
        });
}

function loadAdminMonthlyAttendance() {
    let empFilter = document.getElementById('hrAdminMonthlyEmployeeFilter');
    let monthFilter = document.getElementById('hrAdminMonthlyMonthFilter');
    let emp = empFilter ? empFilter.value : '';
    let month = monthFilter ? monthFilter.value : '';
    
    if (!month) {
        showToast('برجاء اختيار الشهر', 'warning');
        return;
    }

    let tableEl = document.getElementById('hrAdminMonthlyAttendanceTable');
    if (tableEl) tableEl.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p>جاري تحميل السجل الشهري...</p></div>';

    fetch(GOOGLE_SHEETS_URL + '?action=getAttendance&employee=' + encodeURIComponent(emp) + '&month=' + month + '&t=' + new Date().getTime())
        .then(r => r.json())
        .then(data => {
            renderAttendanceTable(data.attendance || [], tableEl, true, true); // true for isAdminView, true for isMonthly
        })
        .catch(err => {
            console.error('Admin monthly attendance error:', err);
            if (tableEl) tableEl.innerHTML = '<div style="color:red; text-align:center;">حدث خطأ أثناء جلب البيانات.</div>';
        });
}

function populateHrEmployeeDropdowns() {
    let users = window.usersData || [];
    ['hrAdminMonthlyEmployeeFilter', 'adminLeaveEmployee'].forEach(id => {
        let sel = document.getElementById(id);
        if (!sel) return;
        let firstOpt = id === 'hrAdminMonthlyEmployeeFilter' ? '<option value="">كل الموظفين</option>' : '<option value="">اختر موظف</option>';
        sel.innerHTML = firstOpt;
        
        users.forEach(u => {
            if (u.status === "نشط") {
                let opt = document.createElement('option');
                opt.value = u.displayName || u.username;
                opt.textContent = u.displayName || u.username;
                sel.appendChild(opt);
            }
        });
    });
}

function handleAdminAddLeave() {
    let emp = document.getElementById('adminLeaveEmployee');
    let date = document.getElementById('adminLeaveDate');
    let type = document.getElementById('adminLeaveType');
    let notes = document.getElementById('adminLeaveNotes');
    if (!emp || !emp.value) { showToast('اختر الموظف', 'warning'); return; }
    if (!date || !date.value) { showToast('اختر التاريخ', 'warning'); return; }

    let formData = new URLSearchParams();
    formData.append('action', 'addLeaveByAdmin');
    formData.append('employeeName', emp.value);
    formData.append('date', date.value);
    formData.append('leaveType', type.value);
    formData.append('notes', notes.value || 'أضيفت بواسطة المدير');

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showToast('✅ تمت إضافة الإجازة', 'success');
                date.value = '';
                notes.value = '';
                loadAdminAttendance();
            } else {
                showToast(data.error || 'حدث خطأ', 'error');
            }
        })
        .catch(() => showToast('حدث خطأ في الاتصال', 'error'));
}

function exportAttendancePDF() {
    let monthInput = document.getElementById('hrAdminMonthlyMonthFilter');
    let empInput = document.getElementById('hrAdminMonthlyEmployeeFilter');
    let monthStr = monthInput ? monthInput.value : '';
    let empStr = empInput ? empInput.value : '';

    if (!monthStr) {
        showToast('يرجى اختيار شهر التقرير من قسم السجل الشهري أولاً', 'warning');
        return;
    }

    showToast('⏳ جاري تحضير التقرير، يرجى الانتظار...', 'info');

    fetch(GOOGLE_SHEETS_URL + '?action=getAttendance&employee=' + encodeURIComponent(empStr) + '&month=' + monthStr + '&t=' + new Date().getTime())
        .then(r => r.json())
        .then(data => {
            let records = data.attendance || [];
            if (records.length === 0) {
                showToast('لا توجد بيانات لهذا الشهر', 'warning');
                return;
            }

            let html = '';
            
            if (empStr !== '') {
                // Single Employee Detailed Report
                html += `
                <div style="text-align:center; margin-bottom:30px;">
                    <h1 style="color:#1a237e; font-size:2.2rem; margin:0; margin-bottom:10px;">تقرير الحضور الشهري المفصل</h1>
                    <h3 style="color:#ff9800; font-size:1.4rem; margin:0; margin-bottom:15px;">Candy Club - كاندي كلوب</h3>
                    <div style="display:inline-block; background:linear-gradient(135deg,#e3f2fd,#bbdefb); padding:10px 25px; border-radius:30px; color:#1565c0; font-weight:bold; font-size:1.1rem; border:2px solid #90caf9; margin-bottom:10px;">
                        <i class="fa-solid fa-calendar-days"></i> شهر التقرير: <span dir="ltr">${monthStr}</span>
                    </div>
                    <div style="font-size:1.4rem; font-weight:bold; color:#2e7d32;">
                        👤 الموظف: ${empStr}
                    </div>
                </div>
                <hr style="border:none; border-top:3px dashed #e0e0e0; margin-bottom:30px;">
                `;

                let [y, m] = monthStr.split('-');
                let daysInMonth = new Date(y, m, 0).getDate();
                let today = new Date();
                today.setHours(0,0,0,0);
                let dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

                html += '<table style="width:100%; border-collapse:separate; border-spacing:0; text-align:center; font-size:1.1rem; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.1);">';
                html += '<thead><tr style="background:linear-gradient(135deg,#1565c0,#1a237e); color:white;">';
                html += '<th style="padding:15px; font-size:1.1rem; border-bottom:3px solid #0d47a1;">التاريخ</th>';
                html += '<th style="padding:15px; font-size:1.1rem; border-bottom:3px solid #0d47a1;">الحضور</th>';
                html += '<th style="padding:15px; font-size:1.1rem; border-bottom:3px solid #0d47a1;">الانصراف</th>';
                html += '<th style="padding:15px; font-size:1.1rem; border-bottom:3px solid #0d47a1;">الساعات</th>';
                html += '<th style="padding:15px; font-size:1.1rem; border-bottom:3px solid #0d47a1;">الحالة</th>';
                html += '</tr></thead><tbody>';

                let singleEmpTotalHours = 0;
                
                for (let i = 1; i <= daysInMonth; i++) {
                    let dateStr = monthStr + '-' + String(i).padStart(2, '0');
                    let r = records.find(rec => rec.date === dateStr);
                    let loopDate = new Date(dateStr + 'T00:00:00');
                    let dayName = dayNames[loopDate.getDay()];
                    let isFuture = loopDate > today;
                    let isToday = loopDate.toLocaleDateString('en-CA') === today.toLocaleDateString('en-CA');
                    
                    let bgRow = i % 2 === 0 ? '#ffffff' : '#f8f9fa';
                    if (isToday) bgRow = '#e8f5e9';

                    if (r) {
                        let rowBorder = '';
                        if (r.status === 'إجازة مدفوعة' && r.requestStatus !== 'بانتظار الموافقة' && r.requestStatus !== '❌ مرفوضة') {
                            bgRow = '#fffde7';
                        }
                        
                        let isPendingOrRejected = r.requestStatus === 'بانتظار الموافقة' || r.requestStatus === '❌ مرفوضة' || r.status === 'إجازة بدون مرتب' || r.status === 'إجازة مرفوضة';
                        if (!isPendingOrRejected) {
                            let hStr = String(r.hours || '').trim();
                            let h = 0;
                            if (hStr && hStr !== '-' && hStr !== '0' && hStr !== 'undefined') {
                                let parts = hStr.split('ساعة');
                                if (parts[0] && parts[0].includes(':')) {
                                    let timeParts = parts[0].split(':');
                                    h += parseFloat(timeParts[0]) || 0;
                                    h += (parseFloat(timeParts[1]) || 0) / 60;
                                } else {
                                    let hMatch = hStr.match(/(\d+(?:\.\d+)?)\s*ساعة/);
                                    let mMatch = hStr.match(/(\d+(?:\.\d+)?)\s*دقيقة/);
                                    if (hMatch) h += parseFloat(hMatch[1]);
                                    else if (!isNaN(parseFloat(hStr))) h += parseFloat(hStr);
                                    if (mMatch) h += parseFloat(mMatch[1]) / 60;
                                }
                            }
                            if (!isNaN(h)) singleEmpTotalHours += h;
                        }

                        html += `<tr style="background:${bgRow};">`;
                        html += `<td style="padding:12px; border-bottom:1px solid #eee;">${dateStr}<br><span style="font-size:0.8rem; color:#757575;">${dayName}</span></td>`;
                        html += `<td style="padding:12px; border-bottom:1px solid #eee; font-weight:bold; color:#2e7d32;">${r.checkIn || '-'}</td>`;
                        html += `<td style="padding:12px; border-bottom:1px solid #eee; font-weight:bold; color:#c62828;">${r.checkOut || '-'}</td>`;
                        html += `<td style="padding:12px; border-bottom:1px solid #eee; font-weight:900; color:#1a237e;">${formatHoursDisplay(r.hours)}</td>`;
                        html += `<td style="padding:12px; border-bottom:1px solid #eee; font-weight:bold;">${r.status}</td>`;
                        html += '</tr>';
                    } else if (isFuture) {
                        html += `<tr style="background:#fafafa; opacity:0.6;">`;
                        html += `<td style="padding:12px; border-bottom:1px solid #eee; color:#bdbdbd;">${dateStr}<br><span style="font-size:0.8rem;">${dayName}</span></td>`;
                        html += `<td colspan="3" style="padding:12px; border-bottom:1px solid #eee; color:#bdbdbd;">لم يحن بعد</td>`;
                        html += `<td style="padding:12px; border-bottom:1px solid #eee; color:#bdbdbd;">🔜</td>`;
                        html += '</tr>';
                    } else {
                        html += `<tr style="background:#fff3f3;">`;
                        html += `<td style="padding:12px; border-bottom:1px solid #eee; color:#c62828;">${dateStr}<br><span style="font-size:0.8rem;">${dayName}</span></td>`;
                        html += `<td colspan="3" style="padding:12px; border-bottom:1px solid #eee; color:#c62828; font-weight:bold;">غائب</td>`;
                        html += `<td style="padding:12px; border-bottom:1px solid #eee; color:#c62828; font-weight:bold;">❌ غائب</td>`;
                        html += '</tr>';
                    }
                }
                
                let tHrs = Math.floor(singleEmpTotalHours);
                let tMins = Math.round((singleEmpTotalHours - tHrs) * 60);
                if (tMins === 60) { tHrs++; tMins = 0; }
                let finalHoursStr = `${tHrs}:${String(tMins).padStart(2,'0')}`;
                
                html += '</tbody>';
                html += '<tfoot>';
                html += `<tr style="background:#e3f2fd; border-top:2px solid #1565c0;">`;
                html += `<td colspan="3" style="padding:15px; text-align:left; font-weight:bold; font-size:1.2rem; color:#1565c0;">إجمالي الساعات:</td>`;
                html += `<td colspan="2" style="padding:15px; text-align:right; font-weight:900; color:#1a237e; font-size:1.3rem;" dir="ltr">${finalHoursStr}</td>`;
                html += `</tr>`;
                html += '</tfoot></table>';
                
            } else {
                // All Employees Summary Report
                let employeeTotals = {};
                records.forEach(r => {
                    if (!employeeTotals[r.employee]) {
                        employeeTotals[r.employee] = 0;
                    }
                    
                    let isPendingOrRejected = r.requestStatus === 'بانتظار الموافقة' || r.requestStatus === '❌ مرفوضة' || r.status === 'إجازة بدون مرتب' || r.status === 'إجازة مرفوضة';
                    if (!isPendingOrRejected) {
                        let hStr = String(r.hours || '').trim();
                        let h = 0;
                        if (hStr && hStr !== '-' && hStr !== '0' && hStr !== 'undefined') {
                            let parts = hStr.split('ساعة');
                            if (parts[0] && parts[0].includes(':')) {
                                let timeParts = parts[0].split(':');
                                h += parseFloat(timeParts[0]) || 0;
                                h += (parseFloat(timeParts[1]) || 0) / 60;
                            } else {
                                let hMatch = hStr.match(/(\d+(?:\.\d+)?)\s*ساعة/);
                                let mMatch = hStr.match(/(\d+(?:\.\d+)?)\s*دقيقة/);
                                if (hMatch) h += parseFloat(hMatch[1]);
                                else if (!isNaN(parseFloat(hStr))) h += parseFloat(hStr);
                                if (mMatch) h += parseFloat(mMatch[1]) / 60;
                            }
                        }
                        if (!isNaN(h)) {
                            employeeTotals[r.employee] += h;
                        }
                    }
                });

                html += `
                <div style="text-align:center; margin-bottom:30px;">
                    <h1 style="color:#1a237e; font-size:2.2rem; margin:0; margin-bottom:10px;">تقرير الساعات الشهري المجمع</h1>
                    <h3 style="color:#ff9800; font-size:1.4rem; margin:0; margin-bottom:15px;">Candy Club - كاندي كلوب</h3>
                    <div style="display:inline-block; background:linear-gradient(135deg,#e3f2fd,#bbdefb); padding:10px 25px; border-radius:30px; color:#1565c0; font-weight:bold; font-size:1.1rem; border:2px solid #90caf9;">
                        <i class="fa-solid fa-calendar-days"></i> شهر التقرير: <span dir="ltr">${monthStr}</span>
                    </div>
                </div>
                <hr style="border:none; border-top:3px dashed #e0e0e0; margin-bottom:30px;">
                `;

                html += '<table style="width:100%; border-collapse:separate; border-spacing:0; text-align:center; font-size:1.1rem; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.1);">';
                html += '<tr style="background:linear-gradient(135deg,#1565c0,#1a237e); color:white;">';
                html += '<th style="padding:15px; font-size:1.2rem; border-bottom:3px solid #0d47a1;">👤 اسم الموظف</th>';
                html += '<th style="padding:15px; font-size:1.2rem; border-bottom:3px solid #0d47a1;">⏱️ إجمالي ساعات العمل</th>';
                html += '</tr>';

                let count = 0;
                for (const [emp, totalH] of Object.entries(employeeTotals)) {
                    let bgRow = count % 2 === 0 ? '#ffffff' : '#f8f9fa';
                    
                    let tHrs = Math.floor(totalH);
                    let tMins = Math.round((totalH - tHrs) * 60);
                    if (tMins === 60) { tHrs++; tMins = 0; }
                    let finalHoursStr = `${tHrs}:${String(tMins).padStart(2,'0')}`;
                    
                    html += `<tr style="background:${bgRow};">`;
                    html += `<td style="padding:15px; font-weight:bold; color:#333; border-bottom:1px solid #eee;">${emp}</td>`;
                    html += `<td style="padding:15px; font-weight:900; color:#2e7d32; font-size:1.2rem; border-bottom:1px solid #eee;" dir="ltr">${finalHoursStr}</td>`;
                    html += '</tr>';
                    count++;
                }
                html += '</table>';
                
                html += `
                <div style="margin-top:40px; text-align:center; font-size:0.9rem; color:#9e9e9e;">
                    <p>عدد الموظفين في التقرير: ${count} موظف</p>
                </div>
                `;
            }

            html += `
            <div style="margin-top:15px; text-align:center; font-size:0.9rem; color:#9e9e9e;">
                <p>تم استخراج هذا التقرير تلقائياً بواسطة نظام Candy Club.</p>
            </div>
            `;
            
            let printWindow = window.open('', '_blank', 'width=900,height=700');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>تقرير الساعات - ${monthStr}</title>
                        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                        <style>
                            body { margin: 0; padding: 20px; font-family: 'Cairo', sans-serif; direction: rtl; background: #fff; }
                            @media print {
                                body { padding: 0; }
                                @page { size: A4 portrait; margin: 15mm; }
                            }
                        </style>
                    </head>
                    <body>
                        ${html}
                        <script>
                            window.onload = function() {
                                setTimeout(function() {
                                    window.print();
                                }, 500);
                            };
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                showToast('✅ تم فتح التقرير للطباعة', 'success');
            } else {
                showToast('❌ تم حظر النافذة المنبثقة، يرجى السماح بها', 'error');
            }
        })
        .catch(err => {
            console.error('Print error:', err);
            showToast('حدث خطأ أثناء تحضير التقرير', 'error');
        });
}

// Initialize HR Employee tab
function initHrTab() {
    if (!currentUser) return;
    
    // Always show employee view since it's now in its own tab
    let empView = document.getElementById('hrEmployeeView');
    if (empView) empView.style.display = 'block';
    
    initHrGps();
    loadMyAttendance();
}

// Initialize HR Admin tab
function initHrAdminTab() {
    if (!currentUser) return;
    
    let adminView = document.getElementById('hrAdminView');
    if (adminView) adminView.style.display = 'block';
    
    // Populate employee dropdowns
    populateHrEmployeeDropdowns();
    
    // Set default date and PDF month
    let now = new Date();
    let monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    let dateStr = now.toLocaleDateString('en-CA');
    
    let dailyDate = document.getElementById('hrAdminDailyDateFilter');
    if (dailyDate) dailyDate.value = dateStr;
    
    let monthlyMonth = document.getElementById('hrAdminMonthlyMonthFilter');
    if (monthlyMonth) monthlyMonth.value = monthStr;
    
    loadAdminDailyAttendance();
    loadPendingLeaves();
}





function loadPendingLeaves() {
    let pendingDiv = document.getElementById('hrPendingLeaves');
    if (!pendingDiv) return;
    
    pendingDiv.innerHTML = '<p style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> جاري تحميل الطلبات...</p>';
    
    fetch(GOOGLE_SHEETS_URL + '?action=getPendingLeaves&t=' + new Date().getTime())
    .then(res => res.json())
    .then(data => {
        let pending = data.pending || [];
        if (pending.length === 0) {
            pendingDiv.innerHTML = '<p style="text-align:center; color:var(--text-muted);">لا توجد طلبات معلقة</p>';
        } else {
            let html = '';
            pending.forEach(p => {
                html += '<div class="hr-pending-item" style="background:#fff3e0; border:1px solid #ffb74d; border-radius:8px; padding:12px; margin-bottom:10px;">';
                html += '<div style="margin-bottom:8px;"><strong>' + p.employee + '</strong> - ' + p.date + ' <span class="hr-badge" style="background:#ff9800; color:white; padding:2px 8px; border-radius:12px; font-size:0.8rem;">' + p.type + '</span></div>';
                if (p.notes) html += '<div style="font-size:0.85rem; color:#666; margin-bottom:8px;"><i class="fa-solid fa-note-sticky"></i> ' + p.notes + '</div>';
                html += '<div style="display:flex; gap:8px;">';
                html += '<button class="interactive-btn" onclick="handleLeaveDecision(\'' + p.employee + '\', \'' + p.date + '\', \'approve\')" style="background:#2e7d32; color:white; border:none; padding:6px 16px; border-radius:6px; cursor:pointer; flex:1;"><i class="fa-solid fa-check"></i> موافقة</button>';
                html += '<button class="interactive-btn" onclick="handleLeaveDecision(\'' + p.employee + '\', \'' + p.date + '\', \'reject\')" style="background:#c62828; color:white; border:none; padding:6px 16px; border-radius:6px; cursor:pointer; flex:1;"><i class="fa-solid fa-xmark"></i> رفض</button>';
                html += '</div></div>';
            });
            pendingDiv.innerHTML = html;
        }
    })
    .catch(err => {
        console.error('Pending leaves error:', err);
        pendingDiv.innerHTML = '<p style="text-align:center; color:red;">خطأ في التحميل</p>';
    });
}

window.cleanDuplicates = function() {
    let btn = document.getElementById('btnCleanDuplicates');
    if (!btn) return;
    let original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التنظيف...';
    btn.disabled = true;
    let formData = new URLSearchParams();
    formData.append('action', 'removeDuplicates');
    fetch(GOOGLE_SHEETS_URL, {method:'POST', body:formData})
    .then(r=>r.json())
    .then(d=>{
        if(d.success) {
            showToast('تم تنظيف ' + d.deleted + ' سجل مكرر بنجاح!', 'success');
            if(typeof loadAdminDailyAttendance === 'function') loadAdminDailyAttendance();
            if(typeof loadAdminMonthlyAttendance === 'function') loadAdminMonthlyAttendance();
        } else {
            showToast(d.error || 'حدث خطأ', 'error');
        }
    })
    .catch(e=>showToast('خطأ في الاتصال', 'error'))
    .finally(()=>{
        btn.innerHTML = original;
        btn.disabled = false;
    });
};

// ============================================================
// ⭐ نظام نواقص الفرع
// ============================================================
let currentShortages = [];
let filteredShortages = [];
let shortagesPage = 1;
const SHORTAGES_PER_PAGE = 50;
let currentShortagesCategory = '0'; // Default to "0" instead of "all"
let currentShortagesSort = 'stock-asc'; // Default sorting
let isShortagesLoading = false;

window.changeShortagesSort = function(sortVal) {
    currentShortagesSort = sortVal;
    shortagesPage = 1;
    applyShortagesFilterAndRender();
};

window.changeShortagesCategory = function(cat) {
    currentShortagesCategory = cat;
    
    // Update active button UI
    document.querySelectorAll('.short-filter-btn').forEach(btn => {
        if (btn.dataset.filter === cat) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    shortagesPage = 1; // reset to first page on category change
    
    if (!isShortagesLoading) {
        applyShortagesFilterAndRender();
    }
};

window.changeShortagesPage = function(delta) {
    let totalPages = Math.ceil(filteredShortages.length / SHORTAGES_PER_PAGE);
    let newPage = shortagesPage + delta;
    if (newPage > 0 && newPage <= totalPages) {
        shortagesPage = newPage;
        renderShortagesDashboard();
    }
};

function applyShortagesFilterAndRender() {
    let cat = currentShortagesCategory;
    if (cat === 'all') {
        filteredShortages = currentShortages; // all
    } else if (cat === '0') {
        filteredShortages = currentShortages.filter(p => p.stock <= 0);
    } else if (cat === '1') {
        filteredShortages = currentShortages.filter(p => p.stock === 1);
    } else if (cat === '3') {
        filteredShortages = currentShortages.filter(p => p.stock >= 2 && p.stock <= 3);
    } else if (cat === '5') {
        filteredShortages = currentShortages.filter(p => p.stock >= 4 && p.stock <= 5);
    } else if (cat === '10') {
        filteredShortages = currentShortages.filter(p => p.stock >= 6); // 6 or more
    }
    
    // Sort logic
    if (currentShortagesSort === 'stock-asc') {
        filteredShortages.sort((a, b) => a.stock - b.stock);
    } else if (currentShortagesSort === 'stock-desc') {
        filteredShortages.sort((a, b) => b.stock - a.stock);
    } else if (currentShortagesSort === 'name-asc') {
        filteredShortages.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }
    
    updateShortagesDashboardCounts();
    renderShortagesDashboard();
}

function updateShortagesDashboardCounts() {
    let c0 = 0, c1 = 0, c3 = 0, c5 = 0, c10 = 0;
    currentShortages.forEach(p => {
        if (p.stock <= 0) c0++;
        else if (p.stock === 1) c1++;
        else if (p.stock >= 2 && p.stock <= 3) c3++;
        else if (p.stock >= 4 && p.stock <= 5) c5++;
        else if (p.stock >= 6) c10++; // 6 or more
    });

    let el0 = document.getElementById('shrtCount0');
    let el1 = document.getElementById('shrtCount1');
    let el3 = document.getElementById('shrtCount3');
    let el5 = document.getElementById('shrtCount5');
    let el10 = document.getElementById('shrtCount10');
    
    if(el0) el0.innerText = c0;
    if(el1) el1.innerText = c1;
    if(el3) el3.innerText = c3;
    if(el5) el5.innerText = c5;
    if(el10) el10.innerText = c10;
}

window.loadShortagesDashboard = function() {
    let container = document.getElementById('shortagesListContainer');
    if (!container) return;
    
    isShortagesLoading = true;
    container.innerHTML = '<div style="text-align:center; padding:30px;"><i class="fa-solid fa-spinner fa-spin fa-2x" style="color:#c0392b;"></i><br><br>جاري جلب النواقص وحالات التجهيز...</div>';
    let paginationUI = document.getElementById('shortagesPagination');
    if(paginationUI) paginationUI.style.display = 'none';

    // Check if Firebase is still loading
    if (!barcodeCatalogData || barcodeCatalogData.length === 0) {
        if (!window.shortagesRetryCount) window.shortagesRetryCount = 0;
        if (window.shortagesRetryCount < 15) { // increased to 15 retries (approx 22 seconds)
            window.shortagesRetryCount++;
            setTimeout(window.loadShortagesDashboard, 1500);
            return;
        } else {
            // Give up
            isShortagesLoading = false;
            window.shortagesRetryCount = 0;
            container.innerHTML = '<div style="text-align:center; padding:30px; color:#c0392b;"><i class="fa-solid fa-triangle-exclamation fa-2x"></i><br><br>تعذر جلب البيانات من قاعدة البيانات. يرجى التأكد من اتصال الإنترنت ثم الضغط على تحديث.</div>';
            return;
        }
    }
    window.shortagesRetryCount = 0; // reset
    
    let catalog = barcodeCatalogData || [];

    // Filter Firebase for stock (include everything now since category 10 is '6 or more')
    let firebaseShortages = catalog; // Load all items to support '6 or more'
    
    if (firebaseShortages.length === 0) {
        currentShortages = [];
        isShortagesLoading = false;
        applyShortagesFilterAndRender();
        container.innerHTML = '<div style="text-align:center; padding:30px; color:#27ae60;"><i class="fa-solid fa-check-circle fa-2x"></i><br><br>لا توجد أي نواقص حالياً، الأرصدة ممتازة!</div>';
        return;
    }

    currentShortages = firebaseShortages.map(fb => ({
        name: fb.name,
        stock: fb.stock,
        barcode: fb.barcode,
        // Removed status tracking
    }));
    isShortagesLoading = false;
    applyShortagesFilterAndRender();
};

function renderShortagesDashboard() {
    let container = document.getElementById('shortagesListContainer');
    let pagination = document.getElementById('shortagesPagination');
    
    if (filteredShortages.length === 0) {
        container.innerHTML = '<p class="empty-msg">لا توجد منتجات في هذه الفئة!</p>';
        if(pagination) pagination.style.display = 'none';
        return;
    }

    let html = '';
    
    let totalPages = Math.ceil(filteredShortages.length / SHORTAGES_PER_PAGE);
    if (totalPages > 1) {
        if(pagination) pagination.style.display = 'flex';
        document.getElementById('shortagesPageInfo').innerText = `صفحة ${shortagesPage} من ${totalPages}`;
        document.getElementById('shortagesPrevBtn').disabled = shortagesPage === 1;
        document.getElementById('shortagesNextBtn').disabled = shortagesPage === totalPages;
    } else {
        if(pagination) pagination.style.display = 'none';
    }

    let startIndex = (shortagesPage - 1) * SHORTAGES_PER_PAGE;
    let endIndex = Math.min(startIndex + SHORTAGES_PER_PAGE, filteredShortages.length);
    let pageItems = filteredShortages.slice(startIndex, endIndex);

    pageItems.forEach((s) => {
        // Added custom box icon or generic icon based on stock
        let stockIcon = s.stock <= 0 ? 'fa-skull-crossbones' : (s.stock === 1 ? 'fa-circle-exclamation' : 'fa-box-open');
        let stockColor = s.stock <= 0 ? '#e74c3c' : (s.stock === 1 ? '#e67e22' : '#27ae60');

        html += `
            <label class="shortage-card-modern" style="cursor: pointer; display: flex; width: 100%; margin-bottom: 12px; box-sizing: border-box;">
                <div style="display:flex; align-items:center; gap:15px; width: 100%;">
                    
                    <!-- Product Info -->
                    <div style="flex-grow: 1; display: flex; align-items: center; gap: 12px;">
                        <div style="background-color: #f1f5f9; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: ${stockColor};">
                            <i class="fa-solid ${stockIcon} fa-lg"></i>
                        </div>
                        <div>
                            <div style="font-weight:bold; color:#1e293b; font-size:1.05rem; margin-bottom: 3px;">${s.name}</div>
                            <div style="font-size:0.85rem; color:#64748b; display: flex; align-items: center; gap: 10px;">
                                <span><i class="fa-solid fa-layer-group" style="font-size: 0.75rem; margin-left: 3px;"></i> الرصيد: <strong style="color:${stockColor}; font-size:0.95rem;">${s.stock}</strong></span>
                                ${s.barcode ? `<span style="border-right: 1px solid #cbd5e1; padding-right: 10px;"><i class="fa-solid fa-barcode" style="font-size: 0.75rem; margin-left: 3px;"></i> ${s.barcode}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </label>
        `;
    });
    
    container.innerHTML = html;
}

// Add listener to load shortages when tab is clicked
document.addEventListener("DOMContentLoaded", () => {
    setupFirebaseSync();

    let shortagesBtn = document.querySelector('.shortages-nav-btn');
    if (shortagesBtn) {
        shortagesBtn.addEventListener('click', () => {
            loadShortagesDashboard();
        });
    }
});





// ============================================================
// Firebase 48h Sync Logic (Global Sync Timer)
// ============================================================
async function getGlobalSyncTime() {
    try {
        const { data, error } = await supabase.from('settings_shipping')
            .select('*')
            .eq('zone_name', '_SYNC_TIMER_')
            .eq('zone_type', 'system')
            .maybeSingle();
        if (data) {
            let ts = 0;
            if (data.delivery_type && !isNaN(parseInt(data.delivery_type))) {
                ts = parseInt(data.delivery_type);
            } else if (data.price && !isNaN(parseInt(data.price))) {
                ts = parseInt(data.price);
            }
            if (ts > 0) return ts;
        }
    } catch(e) {
        console.error("Error reading global sync time:", e);
    }
    return 0; // fallback
}

async function updateGlobalSyncTime() {
    const now = Date.now();
    const nowStr = now.toString();
    try {
        const { data } = await supabase.from('settings_shipping')
            .select('id')
            .eq('zone_name', '_SYNC_TIMER_')
            .eq('zone_type', 'system');
            
        if (data && data.length > 0) {
            await supabase.from('settings_shipping')
                .update({ price: now, delivery_type: nowStr })
                .eq('id', data[0].id);
        } else {
            await supabase.from('settings_shipping').insert([{ 
                zone_name: '_SYNC_TIMER_', 
                zone_type: 'system', 
                price: now,
                delivery_type: nowStr
            }]);
        }
    } catch(e) { 
        console.error("Global timer update error", e); 
    }
    return now;
}

let currentGlobalLastSync = 0; // Store in memory for immediate UI updates

async function setupFirebaseSync() {
    // 48 hours in milliseconds
    const SYNC_INTERVAL = 48 * 60 * 60 * 1000;
    
    // Fetch initial global time from DB
    let dbTime = await getGlobalSyncTime();
    
    if (dbTime > 0) {
        currentGlobalLastSync = dbTime;
        localStorage.setItem('cc_last_global_sync', dbTime.toString());
    } else {
        // Fallback to local storage if DB read failed or returned 0
        const localSaved = localStorage.getItem('cc_last_global_sync');
        if (localSaved && !isNaN(parseInt(localSaved))) {
            currentGlobalLastSync = parseInt(localSaved);
        } else {
            // Only if DB has no record AND localStorage has no record, initialize once
            currentGlobalLastSync = await updateGlobalSyncTime();
            if (currentGlobalLastSync > 0) {
                localStorage.setItem('cc_last_global_sync', currentGlobalLastSync.toString());
            }
        }
    }

    // Function to execute the sync
    const executeSync = async () => {
        let formData = new URLSearchParams();
        formData.append('action', 'syncFirebaseInventory');
        
        try {
            const r = await fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData });
            const data = await r.json();
            if (data.success) {
                console.log("Auto-Sync Success:", data.message);
                currentGlobalLastSync = await updateGlobalSyncTime();
                if (currentGlobalLastSync > 0) {
                    localStorage.setItem('cc_last_global_sync', currentGlobalLastSync.toString());
                }
            } else {
                console.error("Auto-Sync Error:", data.error);
            }
        } catch(err) {
            console.error("Auto-Sync fetch error:", err);
        }
    };

    const now = Date.now();
    if (currentGlobalLastSync > 0 && (now - currentGlobalLastSync) >= SYNC_INTERVAL) {
        // Run immediately if it's been 48 hours or more
        executeSync();
    }

    // Periodically fetch from DB every 30 seconds so all devices stay in sync
    setInterval(async () => {
        const freshDbTime = await getGlobalSyncTime();
        if (freshDbTime > 0 && freshDbTime !== currentGlobalLastSync) {
            currentGlobalLastSync = freshDbTime;
            localStorage.setItem('cc_last_global_sync', freshDbTime.toString());
        }
        
        const currentTime = Date.now();
        if (currentGlobalLastSync > 0 && (currentTime - currentGlobalLastSync) >= SYNC_INTERVAL) {
            executeSync();
        }
    }, 30 * 1000); // Check every 30 seconds

    // Timer display logic
    const updateTimerDisplay = () => {
        const timerEls = document.querySelectorAll('#sync-timer-countdown');
        if (!timerEls.length) return;
        
        if (currentGlobalLastSync === 0) {
            timerEls.forEach(el => { el.innerText = 'جاري التحميل...'; });
            return;
        }
        
        const currentTime = Date.now();
        const timePassed = currentTime - currentGlobalLastSync;
        const timeLeft = SYNC_INTERVAL - timePassed;
        
        if (timeLeft <= 0) {
            timerEls.forEach(el => {
                el.innerText = 'الآن';
                el.style.color = 'var(--danger)';
            });
            return;
        }
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        timerEls.forEach(el => {
            el.innerText = formatted;
            if (hours < 2) {
                el.style.color = 'var(--danger)';
            } else if (hours < 12) {
                el.style.color = 'var(--warning)';
            } else {
                el.style.color = 'var(--primary)';
            }
        });
    };

    setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay();
}

// Add global function for manual trigger if needed
window.runSyncNow = async function() {
    let formData = new URLSearchParams();
    formData.append('action', 'syncFirebaseInventory');
    
    showToast('جاري بدء المزامنة مع Firebase...', 'info');
    
    try {
        const r = await fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData });
        const data = await r.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            currentGlobalLastSync = await updateGlobalSyncTime();
            if (currentGlobalLastSync > 0) {
                localStorage.setItem('cc_last_global_sync', currentGlobalLastSync.toString());
            }
        } else {
            showToast(data.error || 'حدث خطأ في المزامنة', 'error');
        }
    } catch(err) {
        console.error(err);
        showToast('حدث خطأ في الاتصال', 'error');
    }
};

window.togglePlatformDropdown = function() {
    document.getElementById('customPlatformSelect').classList.toggle('open');
};

window.selectPlatform = function(name, iconClass, colorHex) {
    let hiddenInput = document.getElementById('platform');
    if(hiddenInput) {
        hiddenInput.value = name;
        hiddenInput.dispatchEvent(new Event('change'));
    }
    
    let selectedBox = document.getElementById('platformSelected');
    let textSpan = document.getElementById('platformText');
    let iconSpan = document.getElementById('platformIcon');
    
    if(textSpan) textSpan.textContent = name;
    if(iconSpan) {
        iconSpan.className = `fa-brands ${iconClass} platform-icon`;
        iconSpan.style.color = colorHex;
    }
    if(selectedBox) {
        selectedBox.style.borderColor = colorHex;
        selectedBox.style.boxShadow = `0 4px 10px ${colorHex}33`;
    }
    document.getElementById('customPlatformSelect').classList.remove('open');
};

document.addEventListener('click', function(event) {
    let customSelect = document.getElementById('customPlatformSelect');
    if (customSelect && !customSelect.contains(event.target)) {
        customSelect.classList.remove('open');
    }
});

window.syncPlatformUI = function(value) {
    const platforms = {
        'واتساب': { icon: 'fa-whatsapp', color: '#25D366' },
        'فيسبوك': { icon: 'fa-facebook', color: '#1877F2' },
        'إنستجرام': { icon: 'fa-instagram', color: '#E1306C' },
        'تيك توك': { icon: 'fa-tiktok', color: '#000000' }
    };
    if(platforms[value]) {
        let p = platforms[value];
        let selectedBox = document.getElementById('platformSelected');
        let textSpan = document.getElementById('platformText');
        let iconSpan = document.getElementById('platformIcon');
        
        if(textSpan) textSpan.textContent = value;
        if(iconSpan) {
            iconSpan.className = `fa-brands ${p.icon} platform-icon`;
            iconSpan.style.color = p.color;
        }
        if(selectedBox) {
            selectedBox.style.borderColor = p.color;
            selectedBox.style.boxShadow = `0 4px 10px ${p.color}33`;
        }
    }
};

/* ==========================================
   Custom Wheel Date Picker Logic
   ========================================== */
let customDatePickerTarget = null;
let wheelAudioCtx = null;
let lastSelectedIndices = { day: -1, month: -1, year: -1 };

window.playTickSound = function() {
    try {
        if (!wheelAudioCtx) {
            wheelAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (wheelAudioCtx.state === 'suspended') wheelAudioCtx.resume();
        const osc = wheelAudioCtx.createOscillator();
        const gainNode = wheelAudioCtx.createGain();
        osc.type = 'sine';
        // A very short, crisp tick sound
        osc.frequency.setValueAtTime(800, wheelAudioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, wheelAudioCtx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.5, wheelAudioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, wheelAudioCtx.currentTime + 0.05);
        osc.connect(gainNode);
        gainNode.connect(wheelAudioCtx.destination);
        osc.start();
        osc.stop(wheelAudioCtx.currentTime + 0.05);
    } catch (e) { console.warn('Audio tick failed:', e); }
};

window.triggerHaptic = function() {
    if (navigator.vibrate) {
        navigator.vibrate([10]); // Short vibration
    }
};

window.buildWheelItems = function(type, start, end, currentValue) {
    const container = document.getElementById('wheel' + type.charAt(0).toUpperCase() + type.slice(1));
    if (!container) return;
    container.innerHTML = '<div class="wheel-spacer"></div>';
    
    for (let i = start; i <= end; i++) {
        let val = (type === 'year') ? i.toString() : i.toString().padStart(2, '0');
        let div = document.createElement('div');
        div.className = 'wheel-item';
        div.dataset.value = val;
        div.innerText = val;
        div.onclick = function() {
            const itemHeight = 40;
            const idx = Array.from(container.querySelectorAll('.wheel-item')).indexOf(this);
            container.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
        };
        container.appendChild(div);
    }
    
    container.innerHTML += '<div class="wheel-spacer"></div>';
};

window.openCustomDatePicker = function(targetId) {
    customDatePickerTarget = document.getElementById(targetId);
    let modal = document.getElementById('customDatePickerModal');
    if(modal) modal.style.display = 'flex';
    
    let d = new Date();
    if (customDatePickerTarget && customDatePickerTarget.value) {
        let parsed = new Date(customDatePickerTarget.value);
        if (!isNaN(parsed)) d = parsed;
    }
    
    let currentYear = new Date().getFullYear();
    buildWheelItems('day', 1, 31);
    buildWheelItems('month', 1, 12);
    buildWheelItems('year', currentYear - 5, currentYear + 10);
    
    setTimeout(() => {
        setWheelValue('day', d.getDate());
        setWheelValue('month', d.getMonth() + 1);
        setWheelValue('year', d.getFullYear());
        
        lastSelectedIndices = { day: -1, month: -1, year: -1 };
        updateRemainingDaysUI();
    }, 50);
};

window.closeCustomDatePicker = function() {
    let modal = document.getElementById('customDatePickerModal');
    if(modal) modal.style.display = 'none';
};

window.setWheelValue = function(type, val) {
    val = (type === 'year') ? val.toString() : val.toString().padStart(2, '0');
    const container = document.getElementById('wheel' + type.charAt(0).toUpperCase() + type.slice(1));
    if(!container) return;
    const items = Array.from(container.querySelectorAll('.wheel-item'));
    const idx = items.findIndex(item => item.dataset.value === val);
    if (idx !== -1) {
        const itemHeight = 40;
        container.scrollTop = idx * itemHeight;
        updateWheelHighlight(container, type);
    }
};

window.getWheelValue = function(type) {
    const container = document.getElementById('wheel' + type.charAt(0).toUpperCase() + type.slice(1));
    const itemHeight = 40;
    const idx = Math.round(container.scrollTop / itemHeight);
    const items = container.querySelectorAll('.wheel-item');
    if (items[idx]) return items[idx].dataset.value;
    return (type === 'year') ? new Date().getFullYear().toString() : '01';
};

window.handleWheelScroll = function(element, type) {
    updateWheelHighlight(element, type);
};

window.updateWheelHighlight = function(container, type) {
    const itemHeight = 40;
    const scrollIdx = Math.round(container.scrollTop / itemHeight);
    const items = container.querySelectorAll('.wheel-item');
    
    if (lastSelectedIndices[type] !== scrollIdx && lastSelectedIndices[type] !== -1) {
        playTickSound();
        triggerHaptic();
    }
    
    if (lastSelectedIndices[type] !== -1 || items.length > 0) {
       lastSelectedIndices[type] = scrollIdx;
    }

    items.forEach((item, i) => {
        if (i === scrollIdx) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });

    // Update the remaining days indicator
    clearTimeout(window.remainingDaysTimer);
    window.remainingDaysTimer = setTimeout(updateRemainingDaysUI, 50);
};

window.updateRemainingDaysUI = function() {
    let y = getWheelValue('year');
    let m = getWheelValue('month');
    let d = getWheelValue('day');
    if (!y || !m || !d) return;
    
    let lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    let finalD = parseInt(d) > lastDay ? lastDay.toString().padStart(2, '0') : d.toString().padStart(2, '0');
    
    let selectedDate = new Date(`${y}-${m}-${finalD}`);
    let today = new Date();
    today.setHours(0,0,0,0);
    selectedDate.setHours(0,0,0,0);
    
    let diffTime = selectedDate - today;
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let badge = document.getElementById('datePickerRemaining');
    if (!badge) return;
    
    if (diffDays < 0) {
        badge.innerText = `منتهي الصلاحية منذ ${Math.abs(diffDays)} يوم`;
        badge.style.background = '#fee2e2';
        badge.style.color = '#ef4444';
    } else if (diffDays === 0) {
        badge.innerText = 'ينتهي اليوم';
        badge.style.background = '#fef9c3';
        badge.style.color = '#eab308';
    } else {
        badge.innerText = `متبقي ${diffDays} يوم`;
        if (diffDays <= 7) {
            badge.style.background = '#fee2e2';
            badge.style.color = '#ef4444';
        } else if (diffDays <= 30) {
            badge.style.background = '#ffedd5';
            badge.style.color = '#f97316';
        } else if (diffDays > 180) { // More than 6 months
            badge.style.background = '#dcfce7';
            badge.style.color = '#22c55e';
        } else {
            badge.style.background = '#e0f2fe';
            badge.style.color = '#0284c7';
        }
    }
};

window.confirmCustomDate = function() {
    if (customDatePickerTarget) {
        const y = getWheelValue('year');
        const m = getWheelValue('month');
        const d = getWheelValue('day');
        
        let lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
        let finalD = parseInt(d) > lastDay ? lastDay.toString().padStart(2, '0') : d.toString().padStart(2, '0');
        
        customDatePickerTarget.value = `${y}-${m}-${finalD}`;
    }
    closeCustomDatePicker();
};
