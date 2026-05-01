// ==========================================
// 🌐 العقل المدبر - سيستم كاندي كلوب (النسخة الكاملة والمحمية)
// ==========================================

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwAYO1cCYq-qjlhj4T1jW6639AqHOAcA2ADFyP91c49KcJVLFY7TwoXmP8rewWgXOIolw/exec";

// ==========================================
// 1. نظام الإشعارات (Toasts)
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => { 
        toast.classList.add('fade-out'); 
        setTimeout(() => toast.remove(), 400); 
    }, 3000);
}

// ==========================================
// 2. التبديل بين الشاشات
// ==========================================
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        let targetId = btn.getAttribute('data-target');
        let targetElement = document.getElementById(targetId);
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
// 4. تحميل الداتا من الإكسيل (عند فتح الموقع)
// ==========================================
let shippingData = {};
let productsData = [];
let orderHistoryData = [];

window.onload = () => {
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) {
        syncStatus.innerText = "جاري التحميل..."; 
        syncStatus.style.color = "#FF8C00";
    }

    fetch(GOOGLE_SHEETS_URL)
        .then(res => res.json())
        .then(data => {
            if (syncStatus) {
                syncStatus.innerText = "متصل"; 
                syncStatus.style.color = "#00C853";
            }

            // --- المحافظات والمناطق ---
            const govSelect = document.getElementById('governorate');
            const zonesDisplayList = document.getElementById('zonesDisplayList');
            if (zonesDisplayList) zonesDisplayList.innerHTML = '';
            
            if (data.alex && data.alex.length > 0 && govSelect) {
                let optgroup = document.createElement('optgroup'); 
                optgroup.label = "⚓ مناطق الإسكندرية";
                data.alex.forEach(z => { 
                    shippingData[z.name] = z; 
                    optgroup.innerHTML += `<option value="${z.name}">${z.name}</option>`; 
                    if (zonesDisplayList) {
                        zonesDisplayList.innerHTML += `<div class="data-row"><span>${z.name}</span><span class="price-badge">${z.price} ج.م</span></div>`;
                    }
                });
                govSelect.appendChild(optgroup);
            }
            
            if (data.govs && data.govs.length > 0 && govSelect) {
                let optgroup = document.createElement('optgroup'); 
                optgroup.label = "🚚 المحافظات";
                data.govs.forEach(z => { 
                    shippingData[z.name] = z; 
                    optgroup.innerHTML += `<option value="${z.name}">${z.name}</option>`; 
                    if (zonesDisplayList) {
                        zonesDisplayList.innerHTML += `<div class="data-row"><span>${z.name}</span><span class="price-badge">${z.price} ج.م</span></div>`;
                    }
                });
                govSelect.appendChild(optgroup);
            }

            // --- المناديب ---
            const driverSelect = document.getElementById('driverNameSelect');
            const driversDisplayList = document.getElementById('driversDisplayList');
            if (driversDisplayList) driversDisplayList.innerHTML = '';
            
            if (data.couriers && data.couriers.length > 0) {
                data.couriers.forEach(c => {
                    if (driverSelect) driverSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                    if (driversDisplayList) driversDisplayList.innerHTML += `<div class="data-row"><span>🛵 ${c.name}</span><span class="phone-badge">${c.phone}</span></div>`;
                });
            }

            // --- المنتجات ---
            const smartProductsList = document.getElementById('smartProductsList');
            if (data.products && data.products.length > 0 && smartProductsList) {
                productsData = data.products;
                productsData.forEach(p => {
                    smartProductsList.innerHTML += `<option value="${p.name}">`;
                });
            }

            // --- التقارير ---
            if (document.getElementById('todayCount')) document.getElementById('todayCount').innerText = data.todayOrders || 0;
            if (document.getElementById('completedCount')) document.getElementById('completedCount').innerText = data.completedOrders || 0;
            if (document.getElementById('todaySales')) document.getElementById('todaySales').innerText = data.todaySales || 0;
            
            // --- سجل الأوردرات ---
            if (data.history && data.history.length > 0) {
                orderHistoryData = data.history;
                renderHistoryList(orderHistoryData);
            } else {
                let historyContainer = document.getElementById('historyListContainer');
                if (historyContainer) historyContainer.innerHTML = '<p class="empty-msg">لا توجد أوردرات مسجلة.</p>';
            }
        })
        .catch(err => {
            if (syncStatus) {
                syncStatus.innerText = "خطأ اتصال"; 
                syncStatus.style.color = "red"; 
            }
            showToast("فشل الاتصال بقاعدة البيانات", "error");
        });
        
    updateSuspendedCount(); 
};

// ==========================================
// 5. سجل الأوردرات (العرض والبحث)
// ==========================================
function renderHistoryList(orders) {
    let container = document.getElementById('historyListContainer');
    if (!container) return;
    container.innerHTML = '';
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="empty-msg">لم يتم العثور على أوردرات تطابق بحثك.</p>';
        return;
    }
    
    orders.forEach(order => {
        let div = document.createElement('div');
        div.className = 'data-row';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        let statusColor = order.status === "تم التوصيل" ? "var(--success)" : "var(--primary)";
        
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 5px;">
                <strong>${order.id} | ${order.name}</strong>
                <span style="color: ${statusColor}; font-weight: bold;">${order.status}</span>
            </div>
            <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.85rem; color: #777;">
                <span>📅 ${order.date}</span>
                <span>📱 ${order.phone}</span>
                <span style="font-weight:bold; color: #333;">💰 ${order.total} ج.م</span>
            </div>
        `;
        container.appendChild(div);
    });
}

const searchBtn = document.getElementById('searchBtn');
const orderSearchInput = document.getElementById('orderSearchInput');
if (searchBtn && orderSearchInput) {
    searchBtn.addEventListener('click', () => {
        let keyword = orderSearchInput.value.trim().toLowerCase();
        if (keyword === "") {
            renderHistoryList(orderHistoryData);
        } else {
            let filtered = orderHistoryData.filter(o => 
                o.id.toLowerCase().includes(keyword) || 
                o.phone.includes(keyword) || 
                o.name.toLowerCase().includes(keyword)
            );
            renderHistoryList(filtered);
        }
    });
}

// ==========================================
// 6. البحث برقم الموبايل
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
                    phoneStatus.innerText = "✅";
                    showToast(`أهلاً بعودتك يا ${data.name}!`, "success");
                } else {
                    phoneStatus.innerText = "🆕";
                    showToast("عميل جديد، يرجى تسجيل بياناته.", "warning");
                }
            }).catch(() => { phoneStatus.innerText = "🔍"; });
    }
}
if (phoneStatus) phoneStatus.addEventListener('click', performPhoneSearch);
if (phoneInput) phoneInput.addEventListener('change', performPhoneSearch);

// ==========================================
// 7. أنواع التوصيل وحاسبة الشحن
// ==========================================
const deliveryTypeSelect = document.getElementById('deliveryType');
const govSelect = document.getElementById('governorate');

if(deliveryTypeSelect) {
    deliveryTypeSelect.addEventListener('change', () => {
        let type = deliveryTypeSelect.value;
        let addressFields = document.getElementById('addressFields');
        let specialDateContainer = document.getElementById('specialDateContainer');
        let zoneDurationInfo = document.getElementById('zoneDurationInfo');
        
        if (type === 'branch') {
            if(addressFields) addressFields.classList.add('hidden-field');
            if(specialDateContainer) specialDateContainer.classList.add('hidden-field');
            if(zoneDurationInfo) zoneDurationInfo.classList.add('hidden-field');
            if(document.getElementById('shippingCost')) document.getElementById('shippingCost').value = 0;
            let infoSpan = document.querySelector('#deliveryInfo span');
            if(infoSpan) infoSpan.innerText = "استلام من الفرع 🏪";
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
    let zoneDurationInfo = document.getElementById('zoneDurationInfo');
    
    if (!zone || !shippingData[zone]) {
        if(costInput) costInput.value = 0; 
        if(dateDisplay) dateDisplay.innerText = "--"; 
        if(zoneDurationInfo) zoneDurationInfo.classList.add('hidden-field');
        calculateTotal(); 
        return;
    }
    
    let info = shippingData[zone];
    if(costInput) costInput.value = info.price || 0;

    if (zoneDurationInfo && info.duration && info.duration.trim() !== "") {
        zoneDurationInfo.classList.remove('hidden-field');
        zoneDurationInfo.querySelector('span').innerText = info.duration;
    } else if (zoneDurationInfo) {
        zoneDurationInfo.classList.add('hidden-field');
    }

    if(dateDisplay) {
        let type = deliveryTypeSelect ? deliveryTypeSelect.value : 'normal';
        if (type === 'special_date') {
            dateDisplay.innerText = "حسب التاريخ المختار 📅";
        } else {
            dateDisplay.innerText = info.duration ? `خلال ${info.duration}` : "غير محدد";
        }
    }
    calculateTotal();
}
if(govSelect) govSelect.addEventListener('change', triggerGovCalc);

// ==========================================
// 8. المنتجات (الكمية × السعر) والقفل
// ==========================================
const productsContainer = document.getElementById('productsContainer');

function addProductRow(nameVal = "", priceVal = "", qtyVal = "1", isConfirmed = false) {
    if(!productsContainer) return;
    const div = document.createElement('div');
    div.className = 'product-row';
    if (isConfirmed) div.classList.add('confirmed');
    
    div.innerHTML = `
        <input type="text" list="smartProductsList" class="product-name-input" placeholder="اسم المنتج..." value="${nameVal}" required>
        <input type="number" class="product-price-input" placeholder="السعر" value="${priceVal}" required>
        <input type="number" class="product-qty-input" placeholder="الكمية" value="${qtyVal}" min="1" required>
        <button type="button" class="btn-confirm-pro interactive-btn" title="تأكيد">✔️</button>
        <button type="button" class="remove-product-btn interactive-btn" title="حذف">❌</button>
    `;
    
    productsContainer.appendChild(div);
    
    let nameInput = div.querySelector('.product-name-input');
    let priceInput = div.querySelector('.product-price-input');
    let qtyInput = div.querySelector('.product-qty-input');
    let confirmBtn = div.querySelector('.btn-confirm-pro');
    let removeBtn = div.querySelector('.remove-product-btn');

    if (isConfirmed) confirmBtn.innerHTML = "✏️";

    nameInput.addEventListener('input', () => {
        let selected = productsData.find(p => p.name === nameInput.value);
        if (selected) { priceInput.value = selected.price; calculateTotal(); }
    });
    
    priceInput.addEventListener('input', calculateTotal);
    qtyInput.addEventListener('input', calculateTotal);

    confirmBtn.addEventListener('click', () => {
        if (!nameInput.value || priceInput.value === "" || qtyInput.value === "") { 
            showToast("يرجى إكمال بيانات المنتج!", "error"); 
            return; 
        }
        if (div.classList.contains('confirmed')) {
            div.classList.remove('confirmed'); confirmBtn.innerHTML = "✔️";
        } else {
            div.classList.add('confirmed'); confirmBtn.innerHTML = "✏️"; calculateTotal();
        }
    });
    
    removeBtn.addEventListener('click', () => { div.remove(); calculateTotal(); });
}

let addProductBtn = document.getElementById('addProductBtn');
if(addProductBtn) addProductBtn.addEventListener('click', () => addProductRow());

if (productsContainer && productsContainer.children.length === 0) {
    addProductRow();
}

function calculateTotal() {
    let total = 0;
    document.querySelectorAll('.product-row.confirmed').forEach(row => {
        let price = parseFloat(row.querySelector('.product-price-input').value) || 0;
        let qty = parseFloat(row.querySelector('.product-qty-input').value) || 1;
        total += (price * qty);
    });
    
    let pTotal = document.getElementById('productsTotal');
    if(pTotal) pTotal.value = total;
    
    let discountInput = document.getElementById('discount');
    let shippingInput = document.getElementById('shippingCost');
    let discount = discountInput ? (parseFloat(discountInput.value) || 0) : 0;
    let shipping = shippingInput ? (parseFloat(shippingInput.value) || 0) : 0;
    
    let finalAmount = total + shipping - discount;
    let giftCheck = document.getElementById('isGiftCheckbox');
    let finalDisplay = document.getElementById('finalTotalDisplay');
    
    if(finalDisplay) {
        if (giftCheck && giftCheck.checked) {
            finalDisplay.innerText = "0";
        } else {
            finalDisplay.innerText = finalAmount;
        }
    }
}

if(document.getElementById('discount')) document.getElementById('discount').addEventListener('input', calculateTotal);
if(document.getElementById('isGiftCheckbox')) document.getElementById('isGiftCheckbox').addEventListener('change', calculateTotal);

// ==========================================
// 9. تأكيد الدفع والقفل الشامل
// ==========================================
const paymentMethod = document.getElementById('paymentMethod');
const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
let isPaymentConfirmed = false;

const upperFields = ['platform', 'customerName', 'customerPhone', 'phone2', 'deliveryType', 'specialDateInput', 'governorate', 'address'];

function toggleGlobalLock(shouldLock) {
    upperFields.forEach(id => {
        let el = document.getElementById(id);
        if (el) {
            if (shouldLock) el.classList.add('locked-field');
            else el.classList.remove('locked-field');
        }
    });
}

if(confirmPaymentBtn) {
    confirmPaymentBtn.addEventListener('click', () => {
        if (!paymentMethod || !paymentMethod.value) { 
            showToast("اختر طريقة الدفع أولاً!", "error"); return; 
        }
        if (isPaymentConfirmed) {
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
}

// ==========================================
// 10. تعليق الطلب (Hold)
// ==========================================
function updateSuspendedCount() {
    let drafts = JSON.parse(localStorage.getItem('candyDrafts')) || [];
    let countEl = document.getElementById('suspendedCount');
    if(countEl) countEl.innerText = drafts.length;
}

let suspendBtn = document.getElementById('suspendBtn');
if(suspendBtn) {
    suspendBtn.addEventListener('click', () => {
        let nameEl = document.getElementById('customerName');
        let name = nameEl && nameEl.value ? nameEl.value : "أوردر بدون اسم";
        let prods = [];
        
        document.querySelectorAll('.product-row').forEach(row => {
            let n = row.querySelector('.product-name-input').value;
            let p = row.querySelector('.product-price-input').value;
            let q = row.querySelector('.product-qty-input').value;
            let c = row.classList.contains('confirmed');
            if (n) prods.push({name: n, price: p, qty: q, confirmed: c});
        });

        let draft = {
            id: Date.now(),
            date: new Date().toLocaleTimeString('ar-EG'),
            platform: document.getElementById('platform') ? document.getElementById('platform').value : "",
            name: name,
            phone: document.getElementById('customerPhone') ? document.getElementById('customerPhone').value : "",
            phone2: document.getElementById('phone2') ? document.getElementById('phone2').value : "",
            delType: document.getElementById('deliveryType') ? document.getElementById('deliveryType').value : "",
            spDate: document.getElementById('specialDateInput') ? document.getElementById('specialDateInput').value : "",
            gov: document.getElementById('governorate') ? document.getElementById('governorate').value : "",
            address: document.getElementById('address') ? document.getElementById('address').value : "",
            discount: document.getElementById('discount') ? document.getElementById('discount').value : "",
            notes: document.getElementById('notes') ? document.getElementById('notes').value : "",
            gift: document.getElementById('isGiftCheckbox') ? document.getElementById('isGiftCheckbox').checked : false,
            prods: prods
        };

        let drafts = JSON.parse(localStorage.getItem('candyDrafts')) || [];
        drafts.push(draft);
        localStorage.setItem('candyDrafts', JSON.stringify(drafts));
        
        showToast("⏸️ تم تعليق الفاتورة بنجاح!", "warning");
        resetForm();
        updateSuspendedCount();
    });
}

let openSuspendedBtn = document.getElementById('openSuspendedBtn');
if(openSuspendedBtn) {
    openSuspendedBtn.addEventListener('click', () => {
        let drafts = JSON.parse(localStorage.getItem('candyDrafts')) || [];
        let list = document.getElementById('suspendedOrdersList');
        if(!list) return;
        list.innerHTML = '';
        
        if (drafts.length === 0) { 
            list.innerHTML = '<p class="empty-msg">لا توجد طلبات معلقة</p>'; 
            return; 
        }

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

    if(productsContainer) productsContainer.innerHTML = '';
    
    if (d.prods && d.prods.length > 0) {
        d.prods.forEach(p => addProductRow(p.name, p.price, p.qty, p.confirmed));
    } else {
        addProductRow();
    }
    
    if(deliveryTypeSelect) deliveryTypeSelect.dispatchEvent(new Event('change'));
    showToast("✅ تم استرجاع الفاتورة بنجاح!", "success");
}

function resetForm() {
    let form = document.getElementById('orderForm');
    if(form) form.reset();
    
    let infoSpan = document.querySelector('#deliveryInfo span');
    if(infoSpan) infoSpan.innerText = "--";
    
    let finalDisplay = document.getElementById('finalTotalDisplay');
    if(finalDisplay) finalDisplay.innerText = "0";
    
    if(productsContainer) {
        productsContainer.innerHTML = ''; 
        addProductRow();
    }
    
    isPaymentConfirmed = false;
    if(confirmPaymentBtn) {
        confirmPaymentBtn.classList.remove('confirmed'); 
        confirmPaymentBtn.innerHTML = "تأكيد ✔️";
    }
    if(paymentMethod) paymentMethod.classList.remove('locked-field');
    
    toggleGlobalLock(false);
    if(deliveryTypeSelect) deliveryTypeSelect.dispatchEvent(new Event('change'));
    if (phoneStatus) phoneStatus.innerText = "🔍";
}

// ==========================================
// 11. إرسال الواتساب
// ==========================================
let whatsappReviewBtn = document.getElementById('whatsappReviewBtn');
if(whatsappReviewBtn) {
    whatsappReviewBtn.addEventListener('click', () => {
        let phoneEl = document.getElementById('customerPhone');
        let phone = phoneEl ? phoneEl.value.trim() : "";
        if (!phone) { showToast("يرجى إدخال رقم هاتف العميل أولاً!", "error"); return; }
        
        if (phone.startsWith('0')) phone = '+2' + phone;

        let delType = deliveryTypeSelect ? deliveryTypeSelect.value : "";
        let infoSpan = document.querySelector('#deliveryInfo span');
        let expectedDateText = infoSpan ? infoSpan.innerText : "";
        if (delType === 'special_date') {
            let spDate = document.getElementById('specialDateInput');
            expectedDateText = spDate ? spDate.value : "";
        }

        let shipCost = document.getElementById('shippingCost');
        let shippingCost = shipCost ? shipCost.value || 0 : 0;
        let payMethod = paymentMethod ? paymentMethod.value || "غير محدد" : "غير محدد";
        let finalDisplay = document.getElementById('finalTotalDisplay');
        let finalTotal = finalDisplay ? finalDisplay.innerText : 0;
        
        let productsText = "";
        document.querySelectorAll('.product-row.confirmed').forEach(row => {
            let n = row.querySelector('.product-name-input').value;
            let p = row.querySelector('.product-price-input').value;
            let q = row.querySelector('.product-qty-input').value;
            let rowTotal = parseFloat(p) * parseFloat(q);
            productsText += `- ${n} - الكمية: ${q} (${rowTotal} ج.م)\n`;
        });

        if (productsText === "") productsText = "لم يتم تأكيد أي منتجات.\n";

        let message = `أهلاً بك في كاندي كلوب 🍬\nيرجى مراجعة تفاصيل طلبك لتأكيد الشحن:\n\n`;
        message += `📦 رقم الطلب: سيتم إصداره عند التأكيد\n📅 موعد التوصيل: ${expectedDateText}\n\n`;
        message += `🛒 تفاصيل الطلب:\n${productsText}\n`;
        message += `🚚 تكلفة الشحن: ${shippingCost} ج.م\n💳 طريقة الدفع: ${payMethod}\n💰 الإجمالي المستحق: ${finalTotal} ج.م\n\n`;
        message += `عشان نبدأ في تجهيز طلبك فوراً، يرجى الرد بكلمة (تمام) لتأكيد الأوردر 🤝`;

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    });
}

// ==========================================
// 12. الحفظ وطباعة الفاتورة (الرسيت)
// ==========================================
let saveAndPrintBtn = document.getElementById('saveAndPrintBtn');
if(saveAndPrintBtn) {
    saveAndPrintBtn.addEventListener('click', () => {
        let unconfirmedRows = document.querySelectorAll('.product-row:not(.confirmed)');
        if (unconfirmedRows.length > 0) { showToast("يرجى تأكيد (✔️) كل المنتجات أولاً!", "error"); return; }
        
        let productsListText = "";
        let printItemsHtml = ""; 
        
        document.querySelectorAll('.product-row.confirmed').forEach(row => {
            let n = row.querySelector('.product-name-input').value;
            let p = row.querySelector('.product-price-input').value;
            let q = row.querySelector('.product-qty-input').value;
            let rowTotal = parseFloat(p) * parseFloat(q);
            
            productsListText += `${n} - الكمية: ${q} (${rowTotal}ج)\n`;
            printItemsHtml += `<tr><td>${n}</td><td>${p}</td><td>${q}</td><td>${rowTotal}</td></tr>`;
        });
        
        if (productsListText === "") { showToast("لا يمكن حفظ أوردر بدون منتجات!", "error"); return; }
        if (!isPaymentConfirmed) { showToast("يرجى تأكيد طريقة الدفع 🔒", "error"); return; }

        let phoneEl = document.getElementById('customerPhone');
        let nameEl = document.getElementById('customerName');
        let govEl = document.getElementById('governorate');
        
        let phone = phoneEl ? phoneEl.value.trim() : "";
        let name = nameEl ? nameEl.value : "";
        let gov = govEl ? govEl.value : "";
        let delType = deliveryTypeSelect ? deliveryTypeSelect.value : "";

        if (!phone || phone.length < 9) { showToast("رقم الموبايل غير صحيح!", "error"); return; }
        if (!name) { showToast("يرجى كتابة اسم العميل!", "error"); return; }
        if (delType === 'normal' && !gov) { showToast("يرجى اختيار المحافظة!", "error"); return; }

        saveAndPrintBtn.innerText = "⏳ جاري الحفظ..."; 
        saveAndPrintBtn.disabled = true;

        let infoSpan = document.querySelector('#deliveryInfo span');
        let finalExpDate = infoSpan ? infoSpan.innerText : "";
        if (delType === 'special_date') {
            let spDate = document.getElementById('specialDateInput');
            finalExpDate = spDate ? spDate.value : "";
        }
        
        let giftCheck = document.getElementById('isGiftCheckbox');
        let notesEl = document.getElementById('notes');
        let isGift = giftCheck ? giftCheck.checked : false;
        let finalNotes = notesEl ? notesEl.value : "";
        if (isGift) finalNotes = "🎁 أوردر هدية - " + finalNotes;
        
        let finalDisplay = document.getElementById('finalTotalDisplay');
        let finalTotalVal = isGift ? 0 : (finalDisplay ? finalDisplay.innerText : 0);
        let orderTypeLabel = deliveryTypeSelect ? deliveryTypeSelect.options[deliveryTypeSelect.selectedIndex].text : "توصيل";

        let formData = new URLSearchParams();
        if(document.getElementById('platform')) formData.append('platform', document.getElementById('platform').value);
        formData.append('customerName', name);
        formData.append('phone1', phone);
        if(document.getElementById('phone2')) formData.append('phone2', document.getElementById('phone2').value);
        formData.append('orderType', orderTypeLabel);
        formData.append('governorate', gov);
        if(document.getElementById('address')) formData.append('address', document.getElementById('address').value);
        formData.append('expectedDate', finalExpDate);
        formData.append('products', productsListText);
        if(document.getElementById('productsTotal')) formData.append('productsTotal', document.getElementById('productsTotal').value);
        if(document.getElementById('discount')) formData.append('discount', document.getElementById('discount').value);
        if(document.getElementById('shippingCost')) formData.append('shippingCost', document.getElementById('shippingCost').value);
        formData.append('finalTotal', finalTotalVal);
        formData.append('paymentMethod', paymentMethod ? paymentMethod.value : "");
        formData.append('notes', finalNotes);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("✅ تم حفظ الأوردر! جاري الطباعة...", "success");
            
            if(document.getElementById('receipt-title')) document.getElementById('receipt-title').innerText = `طلب عميل (${orderTypeLabel})`;
            if(document.getElementById('print-date')) document.getElementById('print-date').innerText = new Date().toLocaleDateString('ar-EG') + " " + new Date().toLocaleTimeString('ar-EG');
            if(document.getElementById('print-customer-name')) document.getElementById('print-customer-name').innerText = name;
            if(document.getElementById('print-phone')) document.getElementById('print-phone').innerText = phone;
            if(document.getElementById('print-address')) document.getElementById('print-address').innerText = document.getElementById('address') ? document.getElementById('address').value || "غير مسجل" : "";
            if(document.getElementById('print-items-body')) document.getElementById('print-items-body').innerHTML = printItemsHtml;
            if(document.getElementById('print-subtotal')) document.getElementById('print-subtotal').innerText = document.getElementById('productsTotal') ? document.getElementById('productsTotal').value : 0;
            if(document.getElementById('print-discount')) document.getElementById('print-discount').innerText = document.getElementById('discount') ? document.getElementById('discount').value || 0 : 0;
            if(document.getElementById('print-shipping')) document.getElementById('print-shipping').innerText = document.getElementById('shippingCost') ? document.getElementById('shippingCost').value : 0;
            if(document.getElementById('print-final')) document.getElementById('print-final').innerText = finalTotalVal;
            if(document.getElementById('print-payment')) document.getElementById('print-payment').innerText = paymentMethod ? paymentMethod.value : "";

            setTimeout(() => {
                window.print();
                resetForm();
                saveAndPrintBtn.innerText = "💾 حفظ وطباعة الفاتورة"; 
                saveAndPrintBtn.disabled = false;
            }, 1000);
            
        }).catch(() => { 
            showToast("❌ حدث خطأ في الاتصال", "error"); 
            saveAndPrintBtn.innerText = "💾 حفظ وطباعة الفاتورة"; 
            saveAndPrintBtn.disabled = false; 
        });
    });
}

// ==========================================
// 13. نوافذ الإضافة (المناطق والمناديب) والصورة
// ==========================================
let addZoneBtnAction = document.getElementById('addZoneBtn');
if (addZoneBtnAction) {
    addZoneBtnAction.addEventListener('click', () => {
        let name = document.getElementById('newZoneName') ? document.getElementById('newZoneName').value : ""; 
        let price = document.getElementById('newZonePrice') ? document.getElementById('newZonePrice').value : ""; 
        let type = document.getElementById('newZoneType') ? document.getElementById('newZoneType').value : "";
        let duration = document.getElementById('newZoneDuration') ? document.getElementById('newZoneDuration').value : "";
        
        if (!name || !price) { showToast("البيانات ناقصة!", "error"); return; }
        
        let formData = new URLSearchParams(); 
        formData.append('action', 'addShipping'); 
        formData.append('zoneType', type === 'gov' ? 'govs' : 'alex'); 
        formData.append('name', name); 
        formData.append('price', price); 
        formData.append('deliveryType', type);
        formData.append('duration', duration);
        
        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => { 
            showToast("✅ تم إضافة المنطقة! يرجى تحديث الصفحة", "success"); 
            let zm = document.getElementById('zoneModal');
            if(zm) zm.classList.remove('active'); 
        });
    });
}

let addDriverBtnAction = document.getElementById('addDriverBtn');
if (addDriverBtnAction) {
    addDriverBtnAction.addEventListener('click', () => {
        let name = document.getElementById('newDriverName') ? document.getElementById('newDriverName').value : ""; 
        let phone = document.getElementById('newDriverPhone') ? document.getElementById('newDriverPhone').value : "";
        
        if (!name || !phone) { showToast("البيانات ناقصة!", "error"); return; }
        
        let formData = new URLSearchParams(); 
        formData.append('action', 'addDriver'); 
        formData.append('name', name); 
        formData.append('phone', phone);
        
        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => { 
            showToast("✅ تم الإضافة! يرجى تحديث الصفحة", "success"); 
            let dm = document.getElementById('driverModal');
            if(dm) dm.classList.remove('active'); 
        });
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
                    showToast("✅ تم رفع لوجو الفاتورة بنجاح", "success");
                }
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}
