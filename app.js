// ==========================================
// 🌐 العقل المدبر - سيستم كاندي كلوب (النسخة V11 - الداشبورد المتقدمة، المودريتور، الطباعة الكاملة)
// ==========================================

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwAYO1cCYq-qjlhj4T1jW6639AqHOAcA2ADFyP91c49KcJVLFY7TwoXmP8rewWgXOIolw/exec";

// ==========================================
// 0. نظام المودريتور (الشيفت) ⭐
// ==========================================
let currentModerator = localStorage.getItem('candyModerator');
if (!currentModerator) {
    currentModerator = prompt("أهلاً بيك في كاندي كلوب 🍬\nالرجاء إدخال اسمك (كاشير الشيفت الحالي):") || "غير محدد";
    localStorage.setItem('candyModerator', currentModerator);
}

// ==========================================
// 1. نظام الإشعارات (Toasts)
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'error' ? '❌' : (type === 'warning' ? '⚠️' : '✅');
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, 3000);
}

// دالة قفل الأزرار (لمنع الضغط المزدوج) ⭐
function setBtnLoading(btn, isLoading, originalText = "") {
    if(!btn) return;
    if(isLoading) {
        btn.disabled = true;
        btn.dataset.origText = btn.innerText;
        btn.innerText = "جاري التحميل ⏳...";
        btn.style.opacity = "0.7";
    } else {
        btn.disabled = false;
        btn.innerText = originalText || btn.dataset.origText;
        btn.style.opacity = "1";
    }
}

// ==========================================
// 2. التبديل بين الشاشات
// ==========================================
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        let targetElement = document.getElementById(btn.getAttribute('data-target'));
        if(targetElement) targetElement.classList.add('active');
    });
});

// ==========================================
// 3. النوافذ المنبثقة (Modals)
// ==========================================
function setupModal(openBtnId, modalId, closeBtnId) {
    const openBtn = document.getElementById(openBtnId);
    const closeBtn = document.getElementById(closeBtnId);
    const modal = document.getElementById(modalId);
    if (openBtn && closeBtn && modal) {
        openBtn.addEventListener('click', () => modal.classList.add('active'));
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }
}
setupModal('openZoneModalBtn', 'zoneModal', 'closeZoneModal');
setupModal('openDriverModalBtn', 'driverModal', 'closeDriverModal');
setupModal('openSuspendedBtn', 'suspendedModal', 'closeSuspendedModal');

// ==========================================
// 4. تحميل الداتا الأساسية والفلترة
// ==========================================
let shippingData = {};
let productsData = [];
let orderHistoryData = [];
let currentFilterDate = new Date().toISOString().split('T')[0]; // تاريخ اليوم

window.onload = () => {
    if(localStorage.getItem('candyDarkMode') === 'true') {
        document.body.classList.add('dark-mode');
        let toggle = document.getElementById('darkModeToggle');
        if(toggle) toggle.checked = true;
    }

    // إضافة فلتر التاريخ في السجل برمجياً ⭐
    let historySection = document.getElementById('history-tab');
    if(historySection && !document.getElementById('historyDateFilter')) {
        let filterDiv = document.createElement('div');
        filterDiv.className = 'section-card';
        filterDiv.innerHTML = `
            <h3 class="section-title">📅 فلترة الأوردرات باليوم</h3>
            <div style="display:flex; gap:10px;">
                <input type="date" id="historyDateFilter" value="${currentFilterDate}" style="flex:1; margin-bottom:0;">
                <button id="loadDateBtn" class="btn-search interactive-btn">عرض الأوردرات</button>
            </div>
        `;
        historySection.insertBefore(filterDiv, historySection.children[1]); // بعد البحث السريع
        
        document.getElementById('loadDateBtn').addEventListener('click', () => {
            currentFilterDate = document.getElementById('historyDateFilter').value;
            loadDataFromServer();
        });
    }

    // زر تغيير الشيفت في الإعدادات ⭐
    let settingsSection = document.getElementById('settings-tab').querySelector('.section-card');
    if(settingsSection && !document.getElementById('changeModeratorBtn')) {
        let modDiv = document.createElement('div');
        modDiv.innerHTML = `
            <hr style="border-top: 1px dashed #eee; margin: 15px 0;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <span style="font-weight:bold; color:var(--primary);">👤 الكاشير الحالي: <span id="modNameDisplay" style="color:#333;">${currentModerator}</span></span>
                <button id="changeModeratorBtn" class="btn-outline interactive-btn" style="padding: 5px 15px;">تغيير الشيفت</button>
            </div>
        `;
        settingsSection.insertBefore(modDiv, settingsSection.children[2]);
        
        document.getElementById('changeModeratorBtn').addEventListener('click', () => {
            let newMod = prompt("أدخل اسم الكاشير الجديد:");
            if(newMod && newMod.trim() !== "") {
                currentModerator = newMod.trim();
                localStorage.setItem('candyModerator', currentModerator);
                document.getElementById('modNameDisplay').innerText = currentModerator;
                showToast(`تم تغيير الشيفت إلى: ${currentModerator}`, "success");
            }
        });
    }

    loadDataFromServer();
    updateSuspendedCount(); 
};

function loadDataFromServer() {
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) { syncStatus.innerText = "جاري التحميل..."; syncStatus.style.color = "#FF8C00"; }

    // إرسال التاريخ المطلوب للفلترة
    fetch(`${GOOGLE_SHEETS_URL}?date=${currentFilterDate}`)
        .then(res => res.json())
        .then(data => {
            if (syncStatus) { syncStatus.innerText = "متصل"; syncStatus.style.color = "#00C853"; }

            // المحافظات
            const govSelect = document.getElementById('governorate');
            const zonesDisplayList = document.getElementById('zonesDisplayList');
            if (zonesDisplayList) zonesDisplayList.innerHTML = '';
            if (govSelect) govSelect.innerHTML = '<option value="">-- اختر من القائمة --</option>'; // تفريغ القائمة
            shippingData = {}; // تصفير الداتا

            if (data.alex && data.alex.length > 0 && govSelect) {
                let optgroup = document.createElement('optgroup'); optgroup.label = "⚓ مناطق الإسكندرية";
                data.alex.forEach(z => { 
                    shippingData[z.name] = z; 
                    optgroup.innerHTML += `<option value="${z.name}">${z.name}</option>`; 
                    if (zonesDisplayList) zonesDisplayList.innerHTML += `<div class="data-row"><span>${z.name}</span><span class="price-badge">${z.price} ج.م</span></div>`;
                });
                govSelect.appendChild(optgroup);
            }
            if (data.govs && data.govs.length > 0 && govSelect) {
                let optgroup = document.createElement('optgroup'); optgroup.label = "🚚 المحافظات";
                data.govs.forEach(z => { 
                    shippingData[z.name] = z; 
                    optgroup.innerHTML += `<option value="${z.name}">${z.name}</option>`; 
                    if (zonesDisplayList) zonesDisplayList.innerHTML += `<div class="data-row"><span>${z.name}</span><span class="price-badge">${z.price} ج.م</span></div>`;
                });
                govSelect.appendChild(optgroup);
            }

            // المناديب
            const driverSelect = document.getElementById('driverNameSelect');
            const driversDisplayList = document.getElementById('driversDisplayList');
            const assignDriverSelect = document.getElementById('assignDriverSelect');
            const closeDriverSelect = document.getElementById('closeDriverSelect');

            if (driversDisplayList) driversDisplayList.innerHTML = '';
            if (driverSelect) driverSelect.innerHTML = '<option value="">-- اختر المندوب --</option>';
            if (assignDriverSelect) assignDriverSelect.innerHTML = '<option value="">-- اختر المندوب --</option>';
            if (closeDriverSelect) closeDriverSelect.innerHTML = '<option value="">-- اختر المندوب --</option>';
            
            if (data.couriers && data.couriers.length > 0) {
                data.couriers.forEach(c => {
                    if (driverSelect) driverSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                    if (driversDisplayList) driversDisplayList.innerHTML += `<div class="data-row"><span>🛵 ${c.name}</span><span class="phone-badge">${c.phone}</span></div>`;
                    if (assignDriverSelect) assignDriverSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                    if (closeDriverSelect) closeDriverSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                });
            }

            // المنتجات
            const smartProductsList = document.getElementById('smartProductsList');
            if (data.products && smartProductsList) {
                smartProductsList.innerHTML = '';
                productsData = data.products;
                productsData.forEach(p => { smartProductsList.innerHTML += `<option value="${p.name}">`; });
            }

            // التقارير (متوافقة مع V11)
            if (document.getElementById('todayCount')) document.getElementById('todayCount').innerText = data.todayOrders || 0;
            if (document.getElementById('todaySales')) document.getElementById('todaySales').innerText = data.todaySales || 0;
            if (document.getElementById('monthSales')) document.getElementById('monthSales').innerText = data.monthSales || 0;
            if (document.getElementById('completedCount')) document.getElementById('completedCount').innerText = data.completedOrders || 0;
            if (document.getElementById('topProduct')) document.getElementById('topProduct').innerText = data.topProduct || "--";

            // السجل
            orderHistoryData = data.history || [];
            renderHistoryList(orderHistoryData);
            renderShippingRoom(orderHistoryData);
            updateAdvancedDashboard(orderHistoryData);
        }).catch(err => {
            if (syncStatus) { syncStatus.innerText = "خطأ اتصال"; syncStatus.style.color = "red"; }
        });
}

// ==========================================
// 5. سجل الأوردرات (العرض والطباعة الأصلية)
// ==========================================
function renderHistoryList(orders) {
    let container = document.getElementById('historyListContainer');
    if (!container) return;
    container.innerHTML = '';
    
    if (orders.length === 0) {
        container.innerHTML = `<p class="empty-msg">لا يوجد أوردرات مسجلة في تاريخ (${currentFilterDate}).</p>`;
        return;
    }
    
    orders.forEach(order => {
        let div = document.createElement('div');
        div.className = 'data-row';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        let statusColor = order.status === "تم التوصيل" ? "var(--success)" : "var(--primary)";
        if (order.status === "مرتجع") statusColor = "var(--danger)";
        
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 5px; align-items: center;">
                <strong>${order.id} | ${order.name}</strong>
                <div>
                    <button class="interactive-btn" onclick="printOldOrder('${order.id}')" style="background:none; border:none; font-size:1.2rem; cursor:pointer;" title="طباعة الفاتورة الأصلية">🖨️</button>
                    <span style="color: ${statusColor}; font-weight: bold;">${order.status}</span>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.85rem; color: #777;">
                <span>⏰ ${order.time || '--'}</span>
                <span>📱 ${order.phone}</span>
                <span style="font-weight:bold; color: #333;">💰 ${order.total} ج.م</span>
            </div>
        `;
        container.appendChild(div);
    });
}

// الطباعة الأصلية من السجل (تعديل كامل) ⭐
window.printOldOrder = function(orderId) {
    let order = orderHistoryData.find(o => o.id === orderId);
    if(!order) return;
    
    if(document.getElementById('receipt-title')) document.getElementById('receipt-title').innerText = `نسخة فاتورة (${order.status})`;
    if(document.getElementById('print-date')) document.getElementById('print-date').innerText = `${order.date} ${order.time || ''}`;
    if(document.getElementById('print-customer-name')) document.getElementById('print-customer-name').innerText = order.name;
    if(document.getElementById('print-phone')) document.getElementById('print-phone').innerText = order.phone;
    if(document.getElementById('print-address')) document.getElementById('print-address').innerText = order.address || "";
    
    // تنسيق المنتجات للطباعة
    let printItemsHtml = "";
    if(order.products) {
        let lines = order.products.split('\n');
        lines.forEach(line => {
            if(line.trim() !== "") {
                printItemsHtml += `<tr><td colspan="4" style="text-align:right; border-bottom:1px solid #ddd; padding:5px;">${line}</td></tr>`;
            }
        });
    } else {
        printItemsHtml = `<tr><td colspan="4">لا توجد تفاصيل</td></tr>`;
    }
    if(document.getElementById('print-items-body')) document.getElementById('print-items-body').innerHTML = printItemsHtml;
    
    if(document.getElementById('print-subtotal')) document.getElementById('print-subtotal').innerText = order.subtotal || 0;
    if(document.getElementById('print-discount')) document.getElementById('print-discount').innerText = order.discount || 0;
    if(document.getElementById('print-shipping')) document.getElementById('print-shipping').innerText = order.shipping || 0;
    if(document.getElementById('print-final')) document.getElementById('print-final').innerText = order.total;
    if(document.getElementById('print-payment')) document.getElementById('print-payment').innerText = order.payment || "";
    
    // وضع اسم المودريتور في الفاتورة ⭐
    let sellerP = document.querySelector('.receipt-footer p:nth-child(2)');
    if(sellerP) sellerP.innerText = `البائع: ${order.seller || 'غير محدد'}`;

    setTimeout(() => window.print(), 500);
};

// ==========================================
// 6. الحسابات والتوصيل والموبايل (لم تتغير)
// ==========================================
const phoneInput = document.getElementById('customerPhone');
const phoneStatus = document.getElementById('phoneCheckStatus');
function performPhoneSearch() {
    if(!phoneInput || !phoneStatus) return;
    let phoneVal = phoneInput.value.trim();
    if (phoneVal.length >= 9) {
        phoneStatus.innerText = "⏳";
        fetch(`${GOOGLE_SHEETS_URL}?action=checkPhone&phone=${phoneVal}`)
            .then(res => res.json())
            .then(data => {
                if (data.found) {
                    if(document.getElementById('customerName')) document.getElementById('customerName').value = data.name;
                    if(document.getElementById('address')) document.getElementById('address').value = data.address;
                    phoneStatus.innerText = "✅"; showToast(`أهلاً بعودتك يا ${data.name}!`, "success");
                } else { phoneStatus.innerText = "🆕"; }
            }).catch(() => { phoneStatus.innerText = "🔍"; });
    }
}
if (phoneStatus) phoneStatus.addEventListener('click', performPhoneSearch);
if (phoneInput) phoneInput.addEventListener('change', performPhoneSearch);

const deliveryTypeSelect = document.getElementById('deliveryType');
const govSelect = document.getElementById('governorate');
if(deliveryTypeSelect) {
    deliveryTypeSelect.addEventListener('change', () => {
        let type = deliveryTypeSelect.value;
        let addressFields = document.getElementById('addressFields');
        let specialDateContainer = document.getElementById('specialDateContainer');
        if (type === 'branch') {
            if(addressFields) addressFields.classList.add('hidden-field');
            if(specialDateContainer) specialDateContainer.classList.add('hidden-field');
            if(document.getElementById('shippingCost')) document.getElementById('shippingCost').value = 0;
            let infoSpan = document.querySelector('#deliveryInfo span'); if(infoSpan) infoSpan.innerText = "استلام من الفرع 🏪";
        } else if (type === 'special_date') {
            if(addressFields) addressFields.classList.remove('hidden-field');
            if(specialDateContainer) specialDateContainer.classList.remove('hidden-field');
            triggerGovCalc();
        } else {
            if(addressFields) addressFields.classList.remove('hidden-field');
            if(specialDateContainer) specialDateContainer.classList.add('hidden-field');
            triggerGovCalc();
        }
        calculateTotal();
    });
}

function triggerGovCalc() {
    if(!govSelect) return;
    let zone = govSelect.value;
    let costInput = document.getElementById('shippingCost');
    let dateDisplay = document.querySelector('#deliveryInfo span');
    
    if (!zone || !shippingData[zone]) {
        if(costInput) costInput.value = 0; 
        if(dateDisplay) dateDisplay.innerText = "--"; 
        calculateTotal(); return;
    }
    let info = shippingData[zone];
    if(costInput) costInput.value = info.price || 0;
    if(dateDisplay) {
        let type = deliveryTypeSelect ? deliveryTypeSelect.value : 'normal';
        if (type === 'special_date') dateDisplay.innerText = "حسب التاريخ المختار 📅";
        else dateDisplay.innerText = info.duration ? `خلال ${info.duration}` : "غير محدد";
    }
    calculateTotal();
}
if(govSelect) govSelect.addEventListener('change', triggerGovCalc);

// ==========================================
// 7. المنتجات (الكمية × السعر) والقفل الشامل
// ==========================================
const productsContainer = document.getElementById('productsContainer');
function addProductRow(nameVal = "", priceVal = "", qtyVal = "1", isConfirmed = false) {
    if(!productsContainer) return;
    const div = document.createElement('div'); div.className = 'product-row'; if (isConfirmed) div.classList.add('confirmed');
    div.innerHTML = `
        <input type="text" list="smartProductsList" class="product-name-input" placeholder="اسم المنتج..." value="${nameVal}" required>
        <input type="number" class="product-price-input" placeholder="السعر" value="${priceVal}" required>
        <input type="number" class="product-qty-input" placeholder="الكمية" value="${qtyVal}" min="1" required>
        <button type="button" class="btn-confirm-pro interactive-btn">✔️</button>
        <button type="button" class="remove-product-btn interactive-btn">❌</button>
    `;
    productsContainer.appendChild(div);
    let nameInput = div.querySelector('.product-name-input'), priceInput = div.querySelector('.product-price-input');
    let qtyInput = div.querySelector('.product-qty-input'), confirmBtn = div.querySelector('.btn-confirm-pro'), removeBtn = div.querySelector('.remove-product-btn');
    if (isConfirmed) confirmBtn.innerHTML = "✏️";

    nameInput.addEventListener('input', () => {
        let selected = productsData.find(p => p.name === nameInput.value);
        if (selected) { priceInput.value = selected.price; calculateTotal(); }
    });
    priceInput.addEventListener('input', calculateTotal); qtyInput.addEventListener('input', calculateTotal);

    confirmBtn.addEventListener('click', () => {
        if (!nameInput.value || priceInput.value === "" || qtyInput.value === "") { showToast("يرجى إكمال البيانات!", "error"); return; }
        if (div.classList.contains('confirmed')) { div.classList.remove('confirmed'); confirmBtn.innerHTML = "✔️"; } 
        else { div.classList.add('confirmed'); confirmBtn.innerHTML = "✏️"; calculateTotal(); }
    });
    removeBtn.addEventListener('click', () => { div.remove(); calculateTotal(); });
}
if(document.getElementById('addProductBtn')) document.getElementById('addProductBtn').addEventListener('click', () => addProductRow());
if (productsContainer && productsContainer.children.length === 0) addProductRow();

function calculateTotal() {
    let total = 0;
    document.querySelectorAll('.product-row.confirmed').forEach(row => {
        let price = parseFloat(row.querySelector('.product-price-input').value) || 0;
        let qty = parseFloat(row.querySelector('.product-qty-input').value) || 1;
        total += (price * qty);
    });
    if(document.getElementById('productsTotal')) document.getElementById('productsTotal').value = total;
    let discount = document.getElementById('discount') ? (parseFloat(document.getElementById('discount').value) || 0) : 0;
    let shipping = document.getElementById('shippingCost') ? (parseFloat(document.getElementById('shippingCost').value) || 0) : 0;
    let finalAmount = total + shipping - discount;
    let giftCheck = document.getElementById('isGiftCheckbox');
    let finalDisplay = document.getElementById('finalTotalDisplay');
    if(finalDisplay) finalDisplay.innerText = (giftCheck && giftCheck.checked) ? "0" : finalAmount;
}
if(document.getElementById('discount')) document.getElementById('discount').addEventListener('input', calculateTotal);
if(document.getElementById('isGiftCheckbox')) document.getElementById('isGiftCheckbox').addEventListener('change', calculateTotal);

// القفل
const paymentMethod = document.getElementById('paymentMethod');
const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
let isPaymentConfirmed = false;
const upperFields = ['platform', 'customerName', 'customerPhone', 'phone2', 'deliveryType', 'specialDateInput', 'governorate', 'address'];

function toggleGlobalLock(shouldLock) {
    upperFields.forEach(id => { let el = document.getElementById(id); if (el) { if (shouldLock) el.classList.add('locked-field'); else el.classList.remove('locked-field'); }});
}
if(confirmPaymentBtn) {
    confirmPaymentBtn.addEventListener('click', () => {
        if (!paymentMethod || !paymentMethod.value) { showToast("اختر طريقة الدفع أولاً!", "error"); return; }
        if (isPaymentConfirmed) {
            isPaymentConfirmed = false; confirmPaymentBtn.classList.remove('confirmed'); confirmPaymentBtn.innerHTML = "تأكيد ✔️";
            paymentMethod.classList.remove('locked-field'); toggleGlobalLock(false);
        } else {
            isPaymentConfirmed = true; confirmPaymentBtn.classList.add('confirmed'); confirmPaymentBtn.innerHTML = "تم التأكيد 🔒";
            paymentMethod.classList.add('locked-field'); toggleGlobalLock(true);
        }
    });
}

// ==========================================
// 8. المعلقات 
// ==========================================
function updateSuspendedCount() {
    let drafts = JSON.parse(localStorage.getItem('candyDrafts')) || [];
    if(document.getElementById('suspendedCount')) document.getElementById('suspendedCount').innerText = drafts.length;
}

let suspendBtn = document.getElementById('suspendBtn');
if(suspendBtn) {
    suspendBtn.addEventListener('click', () => {
        let nameEl = document.getElementById('customerName'); let name = nameEl && nameEl.value ? nameEl.value : "بدون اسم";
        let prods = [];
        document.querySelectorAll('.product-row').forEach(row => {
            let n = row.querySelector('.product-name-input').value, p = row.querySelector('.product-price-input').value, q = row.querySelector('.product-qty-input').value, c = row.classList.contains('confirmed');
            if (n) prods.push({name: n, price: p, qty: q, confirmed: c});
        });

        let draftId = Date.now();
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

        let drafts = JSON.parse(localStorage.getItem('candyDrafts')) || []; drafts.push(draft); localStorage.setItem('candyDrafts', JSON.stringify(drafts));
        
        let formData = new URLSearchParams(); formData.append('action', 'suspendOrder'); formData.append('draftId', draftId); formData.append('draftJson', JSON.stringify(draft));
        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData });
        showToast("⏸️ تم تعليق الفاتورة بنجاح!", "warning"); resetForm(); updateSuspendedCount();
    });
}

let openSuspendedBtn = document.getElementById('openSuspendedBtn');
if(openSuspendedBtn) {
    openSuspendedBtn.addEventListener('click', () => {
        let drafts = JSON.parse(localStorage.getItem('candyDrafts')) || []; let list = document.getElementById('suspendedOrdersList'); if(!list) return;
        list.innerHTML = '';
        if (drafts.length === 0) { list.innerHTML = '<p class="empty-msg">لا توجد طلبات معلقة</p>'; return; }

        drafts.forEach(d => {
            let div = document.createElement('div'); div.className = 'data-row'; div.style.alignItems = 'center';
            div.innerHTML = `
                <div style="flex:1;"><strong>${d.name}</strong> <br> <small style="color:#777">⏰ ${d.date}</small></div>
                <div style="display:flex; gap:5px;">
                    <button class="btn-search interactive-btn restore-btn" style="padding: 5px 10px; font-size:0.8rem">استرجاع 🔄</button>
                    <button class="interactive-btn delete-btn" style="padding: 5px 10px; font-size:0.8rem; background-color:var(--danger); color:white; border:none; border-radius:8px; cursor:pointer;">حذف ❌</button>
                </div>
            `;
            div.querySelector('.restore-btn').addEventListener('click', () => {
                restoreDraft(d); deleteSuspendedDraft(d.id); document.getElementById('suspendedModal').classList.remove('active');
            });
            div.querySelector('.delete-btn').addEventListener('click', () => {
                deleteSuspendedDraft(d.id); div.remove();
                if(list.children.length === 0) list.innerHTML = '<p class="empty-msg">لا توجد طلبات معلقة</p>';
                showToast("🗑️ تم حذف المسودة", "success");
            });
            list.appendChild(div);
        });
    });
}

function deleteSuspendedDraft(draftId) {
    let drafts = JSON.parse(localStorage.getItem('candyDrafts')) || []; drafts = drafts.filter(item => item.id !== draftId); localStorage.setItem('candyDrafts', JSON.stringify(drafts)); updateSuspendedCount();
    let formData = new URLSearchParams(); formData.append('action', 'removeSuspended'); formData.append('draftId', draftId); fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData });
}

function restoreDraft(d) {
    if(document.getElementById('platform')) document.getElementById('platform').value = d.platform || "";
    if(document.getElementById('customerName')) document.getElementById('customerName').value = d.name || "";
    if(document.getElementById('customerPhone')) document.getElementById('customerPhone').value = d.phone || "";
    if(document.getElementById('phone2')) document.getElementById('phone2').value = d.phone2 || "";
    if(document.getElementById('deliveryType')) document.getElementById('deliveryType').value = d.delType || "";
    if(document.getElementById('specialDateInput')) document.getElementById('specialDateInput').value = d.spDate || "";
    if(document.getElementById('governorate')) document.getElementById('governorate').value = d.gov || "";
    if(document.getElementById('address')) document.getElementById('address').value = d.address || "";
    if(document.getElementById('discount')) document.getElementById('discount').value = d.discount || "";
    if(document.getElementById('notes')) document.getElementById('notes').value = d.notes || "";
    if(document.getElementById('isGiftCheckbox')) document.getElementById('isGiftCheckbox').checked = d.gift || false;

    if(productsContainer) {
        productsContainer.innerHTML = '';
        if (d.prods && d.prods.length > 0) d.prods.forEach(p => addProductRow(p.name, p.price, p.qty, p.confirmed));
        else addProductRow();
    }
    if(deliveryTypeSelect) deliveryTypeSelect.dispatchEvent(new Event('change'));
    showToast("✅ تم استرجاع الفاتورة!", "success");
}

function resetForm() {
    let form = document.getElementById('orderForm'); if(form) form.reset();
    let infoSpan = document.querySelector('#deliveryInfo span'); if(infoSpan) infoSpan.innerText = "--";
    let finalDisplay = document.getElementById('finalTotalDisplay'); if(finalDisplay) finalDisplay.innerText = "0";
    if(productsContainer) { productsContainer.innerHTML = ''; addProductRow(); }
    isPaymentConfirmed = false;
    if(confirmPaymentBtn) { confirmPaymentBtn.classList.remove('confirmed'); confirmPaymentBtn.innerHTML = "تأكيد ✔️"; }
    if(paymentMethod) paymentMethod.classList.remove('locked-field');
    toggleGlobalLock(false);
    if(deliveryTypeSelect) deliveryTypeSelect.dispatchEvent(new Event('change'));
    if (phoneStatus) phoneStatus.innerText = "🔍";
}

// ==========================================
// 9. إرسال الواتساب
// ==========================================
let whatsappReviewBtn = document.getElementById('whatsappReviewBtn');
if(whatsappReviewBtn) {
    whatsappReviewBtn.addEventListener('click', () => {
        let phoneEl = document.getElementById('customerPhone'); let phone = phoneEl ? phoneEl.value.trim() : "";
        if (!phone) { showToast("يرجى إدخال رقم الهاتف!", "error"); return; }
        if (phone.startsWith('0')) phone = '+2' + phone;

        let expectedDateText = document.querySelector('#deliveryInfo span') ? document.querySelector('#deliveryInfo span').innerText : "";
        if (deliveryTypeSelect && deliveryTypeSelect.value === 'special_date') expectedDateText = document.getElementById('specialDateInput') ? document.getElementById('specialDateInput').value : "";

        let productsText = "";
        document.querySelectorAll('.product-row.confirmed').forEach(row => {
            let n = row.querySelector('.product-name-input').value, p = row.querySelector('.product-price-input').value, q = row.querySelector('.product-qty-input').value;
            productsText += `- ${n} - الكمية: ${q} (${parseFloat(p) * parseFloat(q)} ج.م)\n`;
        });
        if (productsText === "") productsText = "لم يتم تأكيد أي منتجات.\n";

        let message = `أهلاً بك في كاندي كلوب 🍬\nيرجى مراجعة تفاصيل طلبك:\n\n📦 التوصيل: ${expectedDateText}\n\n🛒 تفاصيل الطلب:\n${productsText}\n`;
        message += `🚚 الشحن: ${document.getElementById('shippingCost') ? document.getElementById('shippingCost').value || 0 : 0} ج.م\n`;
        message += `💰 الإجمالي المستحق: ${document.getElementById('finalTotalDisplay') ? document.getElementById('finalTotalDisplay').innerText : 0} ج.م\n\nيرجى الرد بكلمة (تمام) لتأكيد الأوردر 🤝`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    });
}

// ==========================================
// 10. الحفظ والطباعة (مع المودريتور وقفل الزرار) ⭐
// ==========================================
let saveAndPrintBtn = document.getElementById('saveAndPrintBtn');
if(saveAndPrintBtn) {
    saveAndPrintBtn.addEventListener('click', () => {
        if (document.querySelectorAll('.product-row:not(.confirmed)').length > 0) { showToast("قم بتأكيد (✔️) المنتجات أولاً!", "error"); return; }
        
        let productsListText = "", printItemsHtml = ""; 
        document.querySelectorAll('.product-row.confirmed').forEach(row => {
            let n = row.querySelector('.product-name-input').value, p = row.querySelector('.product-price-input').value, q = row.querySelector('.product-qty-input').value;
            let rowTotal = parseFloat(p) * parseFloat(q);
            productsListText += `${n} - الكمية: ${q} (${rowTotal}ج)\n`;
            printItemsHtml += `<tr><td>${n}</td><td>${p}</td><td>${q}</td><td>${rowTotal}</td></tr>`;
        });
        
        if (productsListText === "") { showToast("لا يمكن حفظ أوردر بدون منتجات!", "error"); return; }
        if (!isPaymentConfirmed) { showToast("تأكيد طريقة الدفع 🔒", "error"); return; }

        let phone = document.getElementById('customerPhone') ? document.getElementById('customerPhone').value.trim() : "";
        let name = document.getElementById('customerName') ? document.getElementById('customerName').value : "";
        let gov = document.getElementById('governorate') ? document.getElementById('governorate').value : "";
        let delType = deliveryTypeSelect ? deliveryTypeSelect.value : "";

        if (!phone || phone.length < 9) { showToast("رقم الموبايل غير صحيح!", "error"); return; }
        if (!name) { showToast("اكتب اسم العميل!", "error"); return; }
        if (delType === 'normal' && !gov) { showToast("اختر المحافظة!", "error"); return; }

        setBtnLoading(saveAndPrintBtn, true); // قفل الزرار

        let finalExpDate = document.querySelector('#deliveryInfo span') ? document.querySelector('#deliveryInfo span').innerText : "";
        if (delType === 'special_date') finalExpDate = document.getElementById('specialDateInput') ? document.getElementById('specialDateInput').value : "";
        
        let isGift = document.getElementById('isGiftCheckbox') ? document.getElementById('isGiftCheckbox').checked : false;
        let finalNotes = document.getElementById('notes') ? document.getElementById('notes').value : "";
        if (isGift) finalNotes = "🎁 أوردر هدية - " + finalNotes;
        
        let finalTotalVal = isGift ? 0 : (document.getElementById('finalTotalDisplay') ? document.getElementById('finalTotalDisplay').innerText : 0);
        let orderTypeLabel = deliveryTypeSelect ? deliveryTypeSelect.options[deliveryTypeSelect.selectedIndex].text : "توصيل";

        let formData = new URLSearchParams();
        formData.append('action', 'addOrder');
        formData.append('platform', document.getElementById('platform') ? document.getElementById('platform').value : "");
        formData.append('customerName', name);
        formData.append('phone1', phone);
        formData.append('phone2', document.getElementById('phone2') ? document.getElementById('phone2').value : "");
        formData.append('orderType', orderTypeLabel);
        formData.append('gov', gov); 
        formData.append('address', document.getElementById('address') ? document.getElementById('address').value : "");
        formData.append('expDate', finalExpDate); 
        formData.append('products', productsListText);
        formData.append('pTotal', document.getElementById('productsTotal') ? document.getElementById('productsTotal').value : 0);
        formData.append('discount', document.getElementById('discount') ? document.getElementById('discount').value : 0);
        formData.append('shipping', document.getElementById('shippingCost') ? document.getElementById('shippingCost').value : 0); 
        formData.append('finalTotal', finalTotalVal);
        formData.append('payMethod', paymentMethod ? paymentMethod.value : ""); 
        formData.append('notes', finalNotes);
        formData.append('moderator', currentModerator); // إضافة المودريتور

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("✅ تم حفظ الأوردر بنجاح!", "success");
            
            if(document.getElementById('receipt-title')) document.getElementById('receipt-title').innerText = `طلب عميل (${orderTypeLabel})`;
            if(document.getElementById('print-date')) document.getElementById('print-date').innerText = new Date().toLocaleDateString('ar-EG') + " " + new Date().toLocaleTimeString('ar-EG');
            if(document.getElementById('print-customer-name')) document.getElementById('print-customer-name').innerText = name;
            if(document.getElementById('print-phone')) document.getElementById('print-phone').innerText = phone;
            if(document.getElementById('print-address')) document.getElementById('print-address').innerText = document.getElementById('address') ? document.getElementById('address').value || "" : "";
            if(document.getElementById('print-items-body')) document.getElementById('print-items-body').innerHTML = printItemsHtml;
            if(document.getElementById('print-subtotal')) document.getElementById('print-subtotal').innerText = document.getElementById('productsTotal') ? document.getElementById('productsTotal').value : 0;
            if(document.getElementById('print-discount')) document.getElementById('print-discount').innerText = document.getElementById('discount') ? document.getElementById('discount').value || 0 : 0;
            if(document.getElementById('print-shipping')) document.getElementById('print-shipping').innerText = document.getElementById('shippingCost') ? document.getElementById('shippingCost').value : 0;
            if(document.getElementById('print-final')) document.getElementById('print-final').innerText = finalTotalVal;
            if(document.getElementById('print-payment')) document.getElementById('print-payment').innerText = paymentMethod ? paymentMethod.value : "";
            
            // طباعة اسم المودريتور
            let sellerP = document.querySelector('.receipt-footer p:nth-child(2)');
            if(sellerP) sellerP.innerText = `البائع: ${currentModerator}`;

            setTimeout(() => {
                window.print();
                resetForm();
                setBtnLoading(saveAndPrintBtn, false); // فتح الزرار
                loadDataFromServer(); // تحديث فوري عشان الأوردر يبان في السجل
            }, 1000);
            
        }).catch(() => { 
            showToast("❌ خطأ في الاتصال بالإنترنت", "error"); 
            setBtnLoading(saveAndPrintBtn, false); 
        });
    });
}

// ==========================================
// 11. إضافة وتعديل المناطق والمناديب (منع التكرار) ⭐
// ==========================================
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
            showToast(`✅ تم ${isExisting ? 'تعديل' : 'إضافة'} المنطقة!`, "success"); 
            document.getElementById('zoneModal').classList.remove('active'); 
            setBtnLoading(addZoneBtnAction, false);
            loadDataFromServer();
        }).catch(()=>{ setBtnLoading(addZoneBtnAction, false); });
    });
}

let addDriverBtnAction = document.getElementById('addDriverBtn');
if (addDriverBtnAction) {
    addDriverBtnAction.addEventListener('click', () => {
        let name = document.getElementById('newDriverName') ? document.getElementById('newDriverName').value.trim() : ""; 
        let phone = document.getElementById('newDriverPhone') ? document.getElementById('newDriverPhone').value : "";
        if (!name || !phone) { showToast("البيانات ناقصة!", "error"); return; }
        
        // التحقق لو المندوب موجود (بالبحث في القائمة)
        let isExisting = Array.from(document.getElementById('driverNameSelect').options).some(o => o.value === name);

        setBtnLoading(addDriverBtnAction, true);
        let formData = new URLSearchParams(); 
        formData.append('action', isExisting ? 'editDriver' : 'addDriver'); 
        formData.append('name', name); 
        formData.append('phone', phone);
        
        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => { 
            showToast(`✅ تم ${isExisting ? 'تعديل' : 'إضافة'} المندوب!`, "success"); 
            document.getElementById('driverModal').classList.remove('active'); 
            setBtnLoading(addDriverBtnAction, false);
            loadDataFromServer();
        }).catch(()=>{ setBtnLoading(addDriverBtnAction, false); });
    });
}

let logoUpload = document.getElementById('logoUpload');
if(logoUpload) {
    logoUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            let reader = new FileReader();
            reader.onload = function(event) {
                let printLogo = document.getElementById('print-logo');
                if(printLogo) {
                    printLogo.src = event.target.result;
                    printLogo.style.display = 'inline-block';
                    showToast("✅ تم رفع اللوجو بنجاح", "success");
                }
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

// ==========================================
// 12. غرفة عمليات الشحن
// ==========================================
function renderShippingRoom(history) {
    const pendingContainer = document.getElementById('pendingOrdersContainer');
    const shippedContainer = document.getElementById('shippedOrdersContainer');

    if(pendingContainer) {
        const pendingOrders = history.filter(o => o.status === 'قيد التجهيز');
        pendingContainer.innerHTML = '';
        if(pendingOrders.length === 0) pendingContainer.innerHTML = '<p class="empty-msg">لا يوجد أوردرات قيد التجهيز.</p>';
        else pendingOrders.forEach(o => {
            pendingContainer.innerHTML += `
                <div class="order-checkbox-row">
                    <input type="checkbox" class="order-checkbox pending-checkbox" value="${o.id}">
                    <div class="order-details-compact">
                        <span class="order-id-name">${o.id} | ${o.name}</span>
                        <span class="order-address-price">📱 ${o.phone} | 💰 ${o.total} ج.م</span>
                    </div>
                </div>`;
        });
    }

    if(shippedContainer) {
        const shippedOrders = history.filter(o => o.status === 'في الشحن');
        shippedContainer.innerHTML = '';
        if(shippedOrders.length === 0) shippedContainer.innerHTML = '<p class="empty-msg">لا يوجد أوردرات في الشحن.</p>';
        else shippedOrders.forEach(o => {
            shippedContainer.innerHTML += `
                <div class="order-checkbox-row">
                    <input type="checkbox" class="order-checkbox shipped-checkbox" value="${o.id}">
                    <div class="order-details-compact">
                        <span class="order-id-name">${o.id} | ${o.name}</span>
                        <span class="order-address-price">📱 ${o.phone} | 💰 ${o.total} ج.م</span>
                    </div>
                </div>`;
        });
    }
}

function processStatusUpdate(btn, checkboxesClass, newStatus, driverName = "") {
    const selected = Array.from(document.querySelectorAll(`.${checkboxesClass}:checked`)).map(cb => cb.value);
    if(selected.length === 0) { showToast("حدد أوردر واحد على الأقل!", "warning"); return; }

    setBtnLoading(btn, true);
    let completed = 0;
    selected.forEach(orderId => {
        let formData = new URLSearchParams();
        formData.append('action', 'updateOrderStatus');
        formData.append('orderId', orderId);
        formData.append('status', newStatus);
        if(driverName) formData.append('driverName', driverName);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                completed++;
                if(completed === selected.length) {
                    showToast(`✅ تم التحديث لـ "${newStatus}"`, "success");
                    setBtnLoading(btn, false);
                    loadDataFromServer();
                }
            }).catch(()=>{ setBtnLoading(btn, false); });
    });
}

let assignBtn = document.getElementById('assignToDriverBtn');
if(assignBtn) assignBtn.addEventListener('click', () => {
    let driver = document.getElementById('assignDriverSelect').value;
    if(!driver) { showToast("اختر المندوب أولاً!", "error"); return; }
    processStatusUpdate(assignBtn, 'pending-checkbox', 'في الشحن', driver);
});

let markDelivBtn = document.getElementById('markDeliveredBtn');
if(markDelivBtn) markDelivBtn.addEventListener('click', () => processStatusUpdate(markDelivBtn, 'shipped-checkbox', 'تم التوصيل'));

let markRetBtn = document.getElementById('markReturnedBtn');
if(markRetBtn) markRetBtn.addEventListener('click', () => processStatusUpdate(markRetBtn, 'shipped-checkbox', 'مرتجع'));

// ==========================================
// 13. الداشبورد المتقدمة
// ==========================================
function updateAdvancedDashboard(history) {
    let moneyWithDrivers = 0, returnedCount = 0;
    history.forEach(o => {
        if(o.status === 'في الشحن') moneyWithDrivers += parseFloat(o.total) || 0;
        if(o.status === 'مرتجع') returnedCount++;
    });
    if(document.getElementById('moneyWithDrivers')) document.getElementById('moneyWithDrivers').innerText = moneyWithDrivers;
    if(document.getElementById('returnedCount')) document.getElementById('returnedCount').innerText = returnedCount;
}

// التحديث الصامت للبيانات كل دقيقة 
setInterval(loadDataFromServer, 60000);
