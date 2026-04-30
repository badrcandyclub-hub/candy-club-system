// ==========================================
// 🌐 العقل المدبر - سيستم كاندي كلوب V2
// ==========================================

// ⚠️ الرابط السري لجوجل شيت
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwAYO1cCYq-qjlhj4T1jW6639AqHOAcA2ADFyP91c49KcJVLFY7TwoXmP8rewWgXOIolw/exec";

// ==========================================
// 1. نظام الإشعارات (Toasts)
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { 
        toast.classList.add('fade-out'); 
        setTimeout(() => toast.remove(), 400); 
    }, 3000);
}

// ==========================================
// 2. التبديل بين الشاشات والنوافذ المنبثقة
// ==========================================
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

function setupModal(openBtnId, modalId, closeBtnId) {
    const openBtn = document.getElementById(openBtnId);
    if(openBtn) {
        openBtn.addEventListener('click', () => document.getElementById(modalId).classList.add('active'));
        document.getElementById(closeBtnId).addEventListener('click', () => document.getElementById(modalId).classList.remove('active'));
    }
}
setupModal('openZoneModalBtn', 'zoneModal', 'closeZoneModal');
setupModal('openDriverModalBtn', 'driverModal', 'closeDriverModal');
setupModal('openSuspendedBtn', 'suspendedModal', 'closeSuspendedModal');

// ==========================================
// 3. تحميل الداتا الأساسية والتقارير
// ==========================================
let shippingData = {};
let productsData = [];

window.onload = () => {
    let todayDate = new Date().toISOString().split('T')[0];
    let dateFilter = document.getElementById('historyDateFilter');
    if(dateFilter) dateFilter.value = todayDate;

    const syncStatus = document.getElementById('sync-status');
    syncStatus.innerText = "جاري التحميل..."; syncStatus.style.color = "#FF8C00";

    fetch(GOOGLE_SHEETS_URL)
        .then(res => res.json())
        .then(data => {
            syncStatus.innerText = "متصل"; syncStatus.style.color = "#00C853";

            // المحافظات
            const govSelect = document.getElementById('governorate');
            const zonesDisplayList = document.getElementById('zonesDisplayList');
            if(zonesDisplayList) zonesDisplayList.innerHTML = '';
            
            if(data.alex) {
                let optgroup = document.createElement('optgroup'); optgroup.label = "⚓ الإسكندرية";
                data.alex.forEach(z => { 
                    shippingData[z.name] = z; 
                    optgroup.innerHTML += `<option value="${z.name}">${z.name}</option>`; 
                    if(zonesDisplayList) zonesDisplayList.innerHTML += `<div class="data-row"><span>${z.name}</span><span class="price-badge">${z.price} ج.م</span></div>`;
                });
                govSelect.appendChild(optgroup);
            }
            if(data.govs) {
                let optgroup = document.createElement('optgroup'); optgroup.label = "🚚 المحافظات";
                data.govs.forEach(z => { 
                    shippingData[z.name] = z; 
                    optgroup.innerHTML += `<option value="${z.name}">${z.name}</option>`; 
                    if(zonesDisplayList) zonesDisplayList.innerHTML += `<div class="data-row"><span>${z.name}</span><span class="price-badge">${z.price} ج.م</span></div>`;
                });
                govSelect.appendChild(optgroup);
            }

            // المناديب
            const driverSelect = document.getElementById('driverNameSelect');
            const driversDisplayList = document.getElementById('driversDisplayList');
            if(driversDisplayList) driversDisplayList.innerHTML = '';
            if(data.couriers) {
                data.couriers.forEach(c => {
                    driverSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                    if(driversDisplayList) driversDisplayList.innerHTML += `<div class="data-row"><span>🛵 ${c.name}</span><span class="phone-badge">${c.phone}</span></div>`;
                });
            }

            // المنتجات
            const smartProductsList = document.getElementById('smartProductsList');
            if(data.products) {
                productsData = data.products;
                productsData.forEach(p => smartProductsList.innerHTML += `<option value="${p.name}">`);
            }

            // التقارير الثلاثية الجديدة
            if(document.getElementById('todayCount')) document.getElementById('todayCount').innerText = data.todayOrders || 0;
            if(document.getElementById('completedCount')) document.getElementById('completedCount').innerText = data.completedOrders || 0;
            if(document.getElementById('todaySales')) document.getElementById('todaySales').innerText = data.todaySales || 0;
        })
        .catch(err => {
            syncStatus.innerText = "خطأ اتصال"; syncStatus.style.color = "red"; showToast("فشل الاتصال", "error");
        });
        
    updateSuspendedCount(); // تحديث عداد المعلقات
};

// ==========================================
// 4. البحث عن العميل
// ==========================================
const phoneInput = document.getElementById('customerPhone');
const phoneStatus = document.getElementById('phoneCheckStatus');

function performPhoneSearch() {
    let phoneVal = phoneInput.value.trim();
    if (phoneVal.length >= 9) {
        phoneStatus.innerText = "⏳";
        fetch(`${GOOGLE_SHEETS_URL}?action=checkPhone&phone=${phoneVal}`)
            .then(res => res.json())
            .then(data => {
                if(data.found) {
                    document.getElementById('customerName').value = data.name;
                    document.getElementById('address').value = data.address;
                    phoneStatus.innerText = "✅";
                    showToast(`أهلاً بعودتك يا ${data.name}!`, "success");
                } else {
                    phoneStatus.innerText = "🆕";
                    showToast("عميل جديد، يرجى تسجيل بياناته.", "warning");
                }
            }).catch(() => { phoneStatus.innerText = "🔍"; });
    } else {
        showToast("الرقم قصير جداً!", "warning");
    }
}
if(phoneStatus) phoneStatus.addEventListener('click', performPhoneSearch);
if(phoneInput) phoneInput.addEventListener('change', performPhoneSearch);

// ==========================================
// 5. أنواع التوصيل وحاسبة الشحن
// ==========================================
const deliveryTypeSelect = document.getElementById('deliveryType');
const addressFields = document.getElementById('addressFields');
const specialDateContainer = document.getElementById('specialDateContainer');
const govSelect = document.getElementById('governorate');

deliveryTypeSelect.addEventListener('change', () => {
    let type = deliveryTypeSelect.value;
    if(type === 'branch') {
        addressFields.classList.add('hidden-field');
        specialDateContainer.classList.add('hidden-field');
        document.getElementById('shippingCost').value = 0;
        document.querySelector('#deliveryInfo span').innerText = "استلام من الفرع 🏪";
    } else if (type === 'special_date') {
        addressFields.classList.remove('hidden-field');
        specialDateContainer.classList.remove('hidden-field');
        triggerGovCalc();
    } else {
        addressFields.classList.remove('hidden-field');
        specialDateContainer.classList.add('hidden-field');
        triggerGovCalc();
    }
    calculateTotal();
});

function triggerGovCalc() {
    let zone = govSelect.value;
    let costInput = document.getElementById('shippingCost');
    let dateDisplay = document.querySelector('#deliveryInfo span');
    
    if(!zone || !shippingData[zone]) {
        costInput.value = 0; dateDisplay.innerText = "--"; calculateTotal(); return;
    }
    let info = shippingData[zone];
    costInput.value = info.price || 0;

    let type = deliveryTypeSelect.value;
    if(type === 'special_date') {
        dateDisplay.innerText = "حسب التاريخ المختار 📅";
    } else {
        let today = new Date();
        if(info.type === "same_day") { dateDisplay.innerText = `اليوم`; } 
        else if (info.type === "next_day") { dateDisplay.innerText = `غداً`; } 
        else {
            let start = new Date(); start.setDate(start.getDate() + 1);
            let added = 0; while(added < 3) { start.setDate(start.getDate() + 1); if(start.getDay() !== 5) added++; }
            let minDate = new Date(start);
            while(added < 4) { start.setDate(start.getDate() + 1); if(start.getDay() !== 5) added++; }
            dateDisplay.innerText = `من ${minDate.toLocaleDateString('ar-EG')} لـ ${start.toLocaleDateString('ar-EG')}`;
        }
    }
    calculateTotal();
}
govSelect.addEventListener('change', triggerGovCalc);

// ==========================================
// 6. المنتجات (القفل الأخضر والهدية)
// ==========================================
const productsContainer = document.getElementById('productsContainer');

function addProductRow(nameVal = "", priceVal = "", isConfirmed = false) {
    const div = document.createElement('div');
    div.className = 'product-row';
    if(isConfirmed) div.classList.add('confirmed');
    
    div.innerHTML = `
        <input type="text" list="smartProductsList" class="product-name-input" placeholder="اسم المنتج..." value="${nameVal}" required>
        <input type="number" class="product-price-input" placeholder="السعر" value="${priceVal}" required>
        <button type="button" class="btn-confirm-pro interactive-btn" title="تأكيد">✔️</button>
        <button type="button" class="remove-product-btn interactive-btn" title="حذف">❌</button>
    `;
    productsContainer.appendChild(div);
    
    let nameInput = div.querySelector('.product-name-input');
    let priceInput = div.querySelector('.product-price-input');
    let confirmBtn = div.querySelector('.btn-confirm-pro');
    let removeBtn = div.querySelector('.remove-product-btn');

    if(isConfirmed) confirmBtn.innerHTML = "✏️";

    nameInput.addEventListener('input', () => {
        let selected = productsData.find(p => p.name === nameInput.value);
        if(selected) { priceInput.value = selected.price; calculateTotal(); }
    });
    priceInput.addEventListener('input', calculateTotal);

    confirmBtn.addEventListener('click', () => {
        if(!nameInput.value || priceInput.value === "") { showToast("اكتب اسم المنتج وسعره!", "error"); return; }
        if(div.classList.contains('confirmed')) {
            div.classList.remove('confirmed'); confirmBtn.innerHTML = "✔️";
        } else {
            div.classList.add('confirmed'); confirmBtn.innerHTML = "✏️"; calculateTotal();
        }
    });
    removeBtn.addEventListener('click', () => { div.remove(); calculateTotal(); });
}
document.getElementById('addProductBtn').addEventListener('click', () => addProductRow());
if(productsContainer.children.length === 0) addProductRow();

// حساب الإجمالي والهدية
function calculateTotal() {
    let total = 0;
    document.querySelectorAll('.product-row.confirmed .product-price-input').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('productsTotal').value = total;
    
    let discount = parseFloat(document.getElementById('discount').value) || 0;
    let shipping = parseFloat(document.getElementById('shippingCost').value) || 0;
    let finalAmount = total + shipping - discount;
    
    let isGift = document.getElementById('isGiftCheckbox').checked;
    if(isGift) {
        document.getElementById('finalTotalDisplay').innerText = "0 (هدية 🎁)";
    } else {
        document.getElementById('finalTotalDisplay').innerText = finalAmount;
    }
}
document.getElementById('discount').addEventListener('input', calculateTotal);
document.getElementById('isGiftCheckbox').addEventListener('change', calculateTotal);

// ==========================================
// 7. تأكيد الدفع والقفل الشامل (Locked)
// ==========================================
const paymentMethod = document.getElementById('paymentMethod');
const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
let isPaymentConfirmed = false;

const upperFields = ['platform', 'customerName', 'customerPhone', 'phone2', 'deliveryType', 'specialDateInput', 'governorate', 'address'];

function toggleGlobalLock(lock) {
    upperFields.forEach(id => {
        let el = document.getElementById(id);
        if(el) {
            if(lock) el.classList.add('locked-field');
            else el.classList.remove('locked-field');
        }
    });
}

confirmPaymentBtn.addEventListener('click', () => {
    if(!paymentMethod.value) { showToast("اختر طريقة الدفع أولاً!", "error"); return; }
    if(isPaymentConfirmed) {
        isPaymentConfirmed = false;
        confirmPaymentBtn.classList.remove('confirmed'); confirmPaymentBtn.innerHTML = "تأكيد ✔️";
        paymentMethod.classList.remove('locked-field');
        toggleGlobalLock(false);
    } else {
        isPaymentConfirmed = true;
        confirmPaymentBtn.classList.add('confirmed'); confirmPaymentBtn.innerHTML = "تم التأكيد 🔒";
        paymentMethod.classList.add('locked-field');
        toggleGlobalLock(true);
    }
});

// ==========================================
// 8. ميزة تعليق الطلب (Hold)
// ==========================================
function updateSuspendedCount() {
    let drafts = JSON.parse(localStorage.getItem('candyDrafts')) || [];
    document.getElementById('suspendedCount').innerText = drafts.length;
}

document.getElementById('suspendBtn').addEventListener('click', () => {
    let name = document.getElementById('customerName').value || "أوردر بدون اسم";
    let prods = [];
    document.querySelectorAll('.product-row').forEach(row => {
        let n = row.querySelector('.product-name-input').value;
        let p = row.querySelector('.product-price-input').value;
        let c = row.classList.contains('confirmed');
        if(n) prods.push({name: n, price: p, confirmed: c});
    });

    let draft = {
        id: Date.now(),
        date: new Date().toLocaleTimeString('ar-EG'),
        platform: document.getElementById('platform').value,
        name: name,
        phone: document.getElementById('customerPhone').value,
        phone2: document.getElementById('phone2').value,
        delType: document.getElementById('deliveryType').value,
        spDate: document.getElementById('specialDateInput').value,
        gov: document.getElementById('governorate').value,
        address: document.getElementById('address').value,
        discount: document.getElementById('discount').value,
        notes: document.getElementById('notes').value,
        gift: document.getElementById('isGiftCheckbox').checked,
        prods: prods
    };

    let drafts = JSON.parse(localStorage.getItem('candyDrafts')) || [];
    drafts.push(draft);
    localStorage.setItem('candyDrafts', JSON.stringify(drafts));
    
    showToast("⏸️ تم تعليق الفاتورة بنجاح!", "warning");
    resetForm();
    updateSuspendedCount();
});

// عرض الطلبات المعلقة
document.getElementById('openSuspendedBtn').addEventListener('click', () => {
    let drafts = JSON.parse(localStorage.getItem('candyDrafts')) || [];
    let list = document.getElementById('suspendedOrdersList');
    list.innerHTML = '';
    if(drafts.length === 0) { list.innerHTML = '<p class="empty-msg">لا يوجد طلبات معلقة</p>'; return; }

    drafts.forEach(d => {
        let div = document.createElement('div');
        div.className = 'data-row';
        div.innerHTML = `
            <div><strong>${d.name}</strong> <br> <small style="color:#777">⏰ ${d.date}</small></div>
            <button class="btn-search interactive-btn" style="padding: 5px 15px; font-size:0.8rem">استرجاع 🔄</button>
        `;
        div.querySelector('button').addEventListener('click', () => {
            restoreDraft(d);
            drafts = drafts.filter(item => item.id !== d.id);
            localStorage.setItem('candyDrafts', JSON.stringify(drafts));
            document.getElementById('suspendedModal').classList.remove('active');
            updateSuspendedCount();
        });
        list.appendChild(div);
    });
});

function restoreDraft(d) {
    document.getElementById('platform').value = d.platform;
    document.getElementById('customerName').value = d.name;
    document.getElementById('customerPhone').value = d.phone;
    document.getElementById('phone2').value = d.phone2;
    document.getElementById('deliveryType').value = d.delType;
    document.getElementById('specialDateInput').value = d.spDate;
    document.getElementById('governorate').value = d.gov;
    document.getElementById('address').value = d.address;
    document.getElementById('discount').value = d.discount;
    document.getElementById('notes').value = d.notes;
    document.getElementById('isGiftCheckbox').checked = d.gift;

    productsContainer.innerHTML = '';
    if(d.prods && d.prods.length > 0) {
        d.prods.forEach(p => addProductRow(p.name, p.price, p.confirmed));
    } else {
        addProductRow();
    }
    
    // تشغيل الأحداث عشان الشحن يظبط
    deliveryTypeSelect.dispatchEvent(new Event('change'));
    showToast("✅ تم استرجاع الفاتورة!", "success");
}

function resetForm() {
    document.getElementById('orderForm').reset();
    document.querySelector('#deliveryInfo span').innerText = "--";
    document.getElementById('finalTotalDisplay').innerText = "0";
    productsContainer.innerHTML = ''; addProductRow();
    isPaymentConfirmed = false;
    confirmPaymentBtn.classList.remove('confirmed'); confirmPaymentBtn.innerHTML = "تأكيد ✔️";
    paymentMethod.classList.remove('locked-field');
    toggleGlobalLock(false);
    deliveryTypeSelect.dispatchEvent(new Event('change'));
}

// ==========================================
// 9. الحفظ والطباعة لجوجل شيت
// ==========================================
document.getElementById('saveAndPrintBtn').addEventListener('click', () => {
    let unconfirmedRows = document.querySelectorAll('.product-row:not(.confirmed)');
    if(unconfirmedRows.length > 0) { showToast("يرجى تأكيد (✔️) كل المنتجات أولاً!", "error"); return; }
    
    let productsList = "";
    document.querySelectorAll('.product-row.confirmed').forEach(row => {
        productsList += `${row.querySelector('.product-name-input').value} (${row.querySelector('.product-price-input').value}ج)\n`;
    });
    if(productsList === "") { showToast("لا يمكن حفظ أوردر بدون منتجات!", "error"); return; }
    if(!isPaymentConfirmed) { showToast("يرجى تأكيد طريقة الدفع 🔒", "error"); return; }

    let phone = document.getElementById('customerPhone').value.trim();
    let name = document.getElementById('customerName').value;
    let delType = deliveryTypeSelect.value;
    let gov = document.getElementById('governorate').value;

    if(!phone || phone.length < 9) { showToast("رقم الموبايل غير صحيح!", "error"); return; }
    if(!name) { showToast("يرجى كتابة اسم العميل!", "error"); return; }
    if(delType === 'normal' && !gov) { showToast("يرجى اختيار المحافظة!", "error"); return; }

    const btn = document.getElementById('saveAndPrintBtn');
    btn.innerText = "⏳ جاري الإرسال..."; btn.disabled = true;

    // تظبيط التاريخ والملاحظات حسب الاختيارات
    let finalExpDate = document.querySelector('#deliveryInfo span').innerText;
    if(delType === 'special_date') finalExpDate = document.getElementById('specialDateInput').value;
    
    let finalNotes = document.getElementById('notes').value;
    if(document.getElementById('isGiftCheckbox').checked) finalNotes = "🎁 أوردر هدية - " + finalNotes;

    let formData = new URLSearchParams();
    formData.append('platform', document.getElementById('platform').value);
    formData.append('customerName', name);
    formData.append('phone1', phone);
    formData.append('phone2', document.getElementById('phone2').value);
    formData.append('orderType', document.getElementById('deliveryType').options[document.getElementById('deliveryType').selectedIndex].text);
    formData.append('governorate', gov);
    formData.append('address', document.getElementById('address').value);
    formData.append('expectedDate', finalExpDate);
    formData.append('products', productsList);
    formData.append('productsTotal', document.getElementById('productsTotal').value);
    formData.append('discount', document.getElementById('discount').value);
    formData.append('shippingCost', document.getElementById('shippingCost').value);
    formData.append('finalTotal', document.getElementById('isGiftCheckbox').checked ? 0 : document.getElementById('finalTotalDisplay').innerText);
    formData.append('paymentMethod', paymentMethod.value);
    formData.append('notes', finalNotes);

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
    .then(() => {
        showToast("✅ تم حفظ الأوردر! جاري الطباعة...", "success");
        setTimeout(() => {
            window.print();
            resetForm();
            if(phoneStatus) phoneStatus.innerText = "🔍";
            btn.innerText = "💾 حفظ وطباعة الفاتورة"; btn.disabled = false;
        }, 1000);
    }).catch(() => { showToast("❌ حدث خطأ في الاتصال", "error"); btn.innerText = "💾 حفظ وطباعة الفاتورة"; btn.disabled = false; });
});

// ==========================================
// 10. إضافة مناطق ومناديب
// ==========================================
let addZoneBtn = document.getElementById('addZoneBtn');
if(addZoneBtn) {
    addZoneBtn.addEventListener('click', () => {
        let name = document.getElementById('newZoneName').value; let price = document.getElementById('newZonePrice').value; let type = document.getElementById('newZoneType').value;
        if(!name || !price) { showToast("البيانات ناقصة!", "error"); return; }
        let formData = new URLSearchParams(); formData.append('action', 'addShipping'); formData.append('zoneType', type === 'gov' ? 'govs' : 'alex'); formData.append('name', name); formData.append('price', price); formData.append('deliveryType', type);
        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData }).then(() => { showToast("✅ تم إضافة المنطقة! اعمل ريفريش", "success"); document.getElementById('zoneModal').classList.remove('active'); });
    });
}

let addDriverBtn = document.getElementById('addDriverBtn');
if(addDriverBtn) {
    addDriverBtn.addEventListener('click', () => {
        let name = document.getElementById('newDriverName').value; let phone = document.getElementById('newDriverPhone').value;
        if(!name || !phone) { showToast("البيانات ناقصة!", "error"); return; }
        let formData = new URLSearchParams(); formData.append('action', 'addDriver'); formData.append('name', name); formData.append('phone', phone);
        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData }).then(() => { showToast("✅ تم الإضافة! اعمل ريفريش", "success"); document.getElementById('driverModal').classList.remove('active'); });
    });
}
