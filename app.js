// ==========================================
// 🌐 العقل المدبر - سيستم كاندي كلوب (النسخة V13 - الشاملة والمحمية)
// ==========================================

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwAYO1cCYq-qjlhj4T1jW6639AqHOAcA2ADFyP91c49KcJVLFY7TwoXmP8rewWgXOIolw/exec";

// ==========================================
// 1. نظام الإشعارات (Toasts) وقفل الأزرار (Loading)
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

function setBtnLoading(btn, isLoading, originalText = "") {
    if(!btn) return;
    if(isLoading) {
        btn.disabled = true;
        btn.dataset.origText = btn.innerText;
        btn.innerText = "جاري التحميل ⏳...";
        btn.style.opacity = "0.7";
        btn.style.cursor = "not-allowed";
    } else {
        btn.disabled = false;
        btn.innerText = originalText || btn.dataset.origText;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    }
}

// ==========================================
// 2. التبديل بين الشاشات والنوافذ المنبثقة
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
// 3. تحميل الداتا الأساسية من الإكسيل (شامل الكتالوج والنواقص)
// ==========================================
let shippingData = {};
let productsData = [];
let catalogData = []; // داتا الكتالوج الجديدة
let oosData = [];     // داتا النواقص الجديدة
let orderHistoryData = [];
let currentFilterDate = new Date().toLocaleDateString('en-CA'); 

window.onload = () => {
    if(localStorage.getItem('candyDarkMode') === 'true') {
        document.body.classList.add('dark-mode');
        let toggle = document.getElementById('darkModeToggle');
        if(toggle) toggle.checked = true;
    }

    let historyDateInput = document.getElementById('historyDateFilter');
    if(historyDateInput) historyDateInput.value = currentFilterDate;

    let loadDateBtn = document.getElementById('loadDateBtn');
    if(loadDateBtn) {
        loadDateBtn.addEventListener('click', () => {
            currentFilterDate = document.getElementById('historyDateFilter').value;
            loadDataFromServer();
        });
    }

    loadDataFromServer();
    updateSuspendedCount(); 
};

function loadDataFromServer() {
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) { syncStatus.innerText = "جاري التحميل..."; syncStatus.style.color = "#FF8C00"; }

    fetch(`${GOOGLE_SHEETS_URL}?date=${currentFilterDate}`)
        .then(res => res.json())
        .then(data => {
            if (syncStatus) { syncStatus.innerText = "متصل"; syncStatus.style.color = "#00C853"; }

            // --- 1. الكتالوج والنواقص (الجديد) ---
            catalogData = data.catalog || [];
            renderCatalog(catalogData);
            
            oosData = data.outOfStock || [];
            renderOutOfStock(oosData);

            // --- 2. المحافظات والمناطق (التقسيم الجديد في V13) ---
            const govSelect = document.getElementById('governorate');
            const zonesAlexList = document.getElementById('zonesAlexList');
            const zonesGovList = document.getElementById('zonesGovList');
            
            if (zonesAlexList) zonesAlexList.innerHTML = '';
            if (zonesGovList) zonesGovList.innerHTML = '';
            if (govSelect) govSelect.innerHTML = '<option value="">-- اختر من القائمة --</option>'; 
            shippingData = {}; 

            const renderZoneItem = (z, zoneType, container) => {
                shippingData[z.name] = z;
                if (container) {
                    let specialClass = z.type === 'next_day' ? 'zone-next-day' : '';
                    container.innerHTML += `
                        <div class="data-row ${specialClass}" style="align-items:center;">
                            <div style="flex:1; text-align:right;"><strong>${z.name}</strong> <br> <span class="price-badge">${z.price} ج.م</span> <small style="color:#777;">${z.duration}</small></div>
                            <div style="display:flex; gap:5px;">
                                <button type="button" class="btn-outline interactive-btn" style="padding: 4px 8px; font-size:0.8rem;" onclick="editZoneUI('${z.name}', '${z.price}', '${z.type}', '${z.duration}')">✏️</button>
                                <button type="button" class="interactive-btn" style="padding: 4px 8px; font-size:0.8rem; background:var(--danger); color:white; border:none; border-radius:8px;" onclick="deleteItem('deleteShipping', '${z.name}', '${zoneType}')">❌</button>
                            </div>
                        </div>`;
                }
            };

            if (data.alex && data.alex.length > 0) {
                let optgroup = document.createElement('optgroup'); optgroup.label = "⚓ مناطق الإسكندرية";
                data.alex.forEach(z => { 
                    optgroup.innerHTML += `<option value="${z.name}">${z.name}</option>`; 
                    renderZoneItem(z, 'alex', zonesAlexList); 
                });
                if(govSelect) govSelect.appendChild(optgroup);
            }
            if (data.govs && data.govs.length > 0) {
                let optgroup = document.createElement('optgroup'); optgroup.label = "🚚 المحافظات";
                data.govs.forEach(z => { 
                    optgroup.innerHTML += `<option value="${z.name}">${z.name}</option>`; 
                    renderZoneItem(z, 'govs', zonesGovList); 
                });
                if(govSelect) govSelect.appendChild(optgroup);
            }

            // --- 3. المناديب ---
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
                    if (assignDriverSelect) assignDriverSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                    if (closeDriverSelect) closeDriverSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                    if (driversDisplayList) {
                        driversDisplayList.innerHTML += `
                            <div class="data-row" style="align-items:center;">
                                <div style="flex:1; text-align:right;"><strong>🛵 ${c.name}</strong> <br> <span class="phone-badge">${c.phone}</span></div>
                                <div style="display:flex; gap:5px;">
                                    <button type="button" class="btn-outline interactive-btn" style="padding: 4px 8px; font-size:0.8rem;" onclick="editDriverUI('${c.name}', '${c.phone}')">✏️</button>
                                    <button type="button" class="interactive-btn" style="padding: 4px 8px; font-size:0.8rem; background:var(--danger); color:white; border:none; border-radius:8px;" onclick="deleteItem('deleteDriver', '${c.name}')">❌</button>
                                </div>
                            </div>`;
                    }
                });
            }

            // --- 4. المنتجات والمودريتور ---
            const smartProductsList = document.getElementById('smartProductsList');
            if (smartProductsList) {
                smartProductsList.innerHTML = '';
                // ندمج المنتجات القديمة مع الكتالوج عشان الاقتراحات تكون كاملة
                catalogData.forEach(p => { smartProductsList.innerHTML += `<option value="${p.name}">`; });
            }

            const modSelect = document.getElementById('moderatorSelect');
            const modsList = document.getElementById('moderatorsList');
            if(modSelect) modSelect.innerHTML = '<option value="">-- اختر اسمك --</option>';
            if(modsList) modsList.innerHTML = '';
            if (data.moderators && data.moderators.length > 0) {
                data.moderators.forEach(m => {
                    if(modSelect) modSelect.innerHTML += `<option value="${m}">${m}</option>`;
                    if(modsList) {
                        modsList.innerHTML += `
                            <div class="data-row" style="align-items:center; padding:5px;">
                                <span style="flex:1;">👤 ${m}</span>
                                <button type="button" class="interactive-btn" style="padding: 4px 8px; font-size:0.8rem; background:var(--danger); color:white; border:none; border-radius:8px;" onclick="deleteItem('deleteModerator', '${m}')">❌</button>
                            </div>`;
                    }
                });
            } else if (modsList) {
                modsList.innerHTML = '<p class="empty-msg">لا يوجد كاشيرية مسجلين</p>';
            }

            // --- 5. التقارير والسجل ---
            if (document.getElementById('todayCount')) document.getElementById('todayCount').innerText = data.todayOrders || 0;
            if (document.getElementById('todaySales')) document.getElementById('todaySales').innerText = data.todaySales || 0;
            if (document.getElementById('monthSales')) document.getElementById('monthSales').innerText = data.monthSales || 0;
            if (document.getElementById('completedCount')) document.getElementById('completedCount').innerText = data.completedOrders || 0;
            if (document.getElementById('topProduct')) document.getElementById('topProduct').innerText = data.topProduct || "--";

            orderHistoryData = data.history || [];
            renderHistoryList(orderHistoryData);
            renderShippingRoom(orderHistoryData);
            updateAdvancedDashboard(orderHistoryData);
        }).catch(err => {
            if (syncStatus) { syncStatus.innerText = "خطأ اتصال"; syncStatus.style.color = "red"; }
        });
}

// ==========================================
// 4. حساب أجازة الجمعة أوتوماتيك (الميزة العبقرية) 🚀
// ==========================================
function calculateDeliveryDateSkippingFriday(durationText) {
    if (!durationText) return "";
    let match = durationText.match(/\d+/);
    if (!match) return durationText; 
    
    let daysToAdd = parseInt(match[0]);
    let d = new Date();
    let added = 0;
    
    while(added < daysToAdd) {
        d.setDate(d.getDate() + 1);
        if(d.getDay() !== 5) { 
            added++;
        }
    }
    
    let options = { weekday: 'long', month: 'numeric', day: 'numeric' };
    return d.toLocaleDateString('ar-EG', options);
}

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
        if (type === 'special_date') {
            dateDisplay.innerText = "حسب التاريخ المختار 📅";
        } else if (info.type === 'next_day') {
            // إخفاء المدة عشان كدة كدة إسكندرية تاني يوم ⭐
            dateDisplay.innerText = "تاني يوم 🚚";
        } else {
            let exactDate = calculateDeliveryDateSkippingFriday(info.duration);
            dateDisplay.innerText = exactDate ? `المتوقع: ${exactDate}` : `خلال ${info.duration}`;
        }
    }
    calculateTotal();
}
if(govSelect) govSelect.addEventListener('change', triggerGovCalc);

// ==========================================
// 5. سجل الأوردرات (العرض والطباعة الأصلية)
// ==========================================
function renderHistoryList(orders) {
    let container = document.getElementById('historyListContainer');
    if (!container) return;
    container.innerHTML = '';
    
    if (orders.length === 0) {
        container.innerHTML = `<p class="empty-msg">لا توجد أوردرات في تاريخ (${currentFilterDate}).</p>`;
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

window.printOldOrder = function(orderId) {
    let order = orderHistoryData.find(o => o.id === orderId);
    if(!order) return;
    
    if(document.getElementById('receipt-title')) document.getElementById('receipt-title').innerText = `نسخة فاتورة (${order.status})`;
    if(document.getElementById('print-date')) document.getElementById('print-date').innerText = `${order.date} ${order.time || ''}`;
    if(document.getElementById('print-customer-name')) document.getElementById('print-customer-name').innerText = order.name;
    if(document.getElementById('print-phone')) document.getElementById('print-phone').innerText = order.phone;
    if(document.getElementById('print-address')) document.getElementById('print-address').innerText = order.address || "";
    
    let printItemsHtml = "";
    if(order.products) {
        let lines = order.products.split('\n');
        lines.forEach(line => {
            if(line.trim() !== "") printItemsHtml += `<tr><td colspan="4" style="text-align:right; border-bottom:1px solid #ddd; padding:5px;">${line}</td></tr>`;
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
    
    let sellerP = document.getElementById('print-seller-name');
    if(sellerP) sellerP.innerText = `البائع: ${order.seller || 'غير محدد'}`;

    setTimeout(() => window.print(), 500);
};

const searchBtn = document.getElementById('searchBtn');
const orderSearchInput = document.getElementById('orderSearchInput');
if (searchBtn && orderSearchInput) {
    searchBtn.addEventListener('click', () => {
        let keyword = orderSearchInput.value.trim().toLowerCase();
        if (keyword === "") renderHistoryList(orderHistoryData);
        else {
            let filtered = orderHistoryData.filter(o => o.id.toLowerCase().includes(keyword) || o.phone.includes(keyword) || o.name.toLowerCase().includes(keyword));
            renderHistoryList(filtered);
        }
    });
}

// ==========================================
// 6. بحث الهاتف والمنتجات (شاملة العروض الذكية ⭐)
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

    // السحب الذكي للأسعار والعروض ⭐
    nameInput.addEventListener('input', () => {
        let selected = catalogData.find(p => p.name === nameInput.value);
        if (selected) { 
            let isOfferActive = selected.isOffer === true || selected.isOffer === "true" || selected.isOffer === 1 || selected.isOffer === "TRUE";
            if(isOfferActive && parseFloat(selected.offerPrice) > 0) {
                priceInput.value = selected.offerPrice;
                showToast("🎉 تم تطبيق سعر العرض!", "success");
            } else {
                priceInput.value = selected.price; 
            }
            calculateTotal(); 
        }
    });

    priceInput.addEventListener('input', calculateTotal); qtyInput.addEventListener('input', calculateTotal);

    // تأكيد المنتج وتحديث الكتالوج في الخلفية لو اتغير ⭐
    confirmBtn.addEventListener('click', () => {
        if (!nameInput.value || priceInput.value === "" || qtyInput.value === "") { showToast("يرجى إكمال البيانات!", "error"); return; }
        
        if (div.classList.contains('confirmed')) { 
            div.classList.remove('confirmed'); confirmBtn.innerHTML = "✔️"; 
        } else { 
            div.classList.add('confirmed'); confirmBtn.innerHTML = "✏️"; calculateTotal(); 
            
            // تحديث الكتالوج الصامت لو الكاشير عدل السعر بإيده في الفاتورة
            let currentPrice = parseFloat(priceInput.value);
            let cProd = catalogData.find(p => p.name === nameInput.value);
            
            if(cProd) {
                let isOfferActive = cProd.isOffer === true || cProd.isOffer === "true" || cProd.isOffer === 1;
                let baseP = parseFloat(cProd.price) || 0;
                let offerP = parseFloat(cProd.offerPrice) || 0;
                
                // لو العرض شغال والسعر مختلف عن العرض، حدث العرض. لو مش شغال ومختلف عن الأساسي، حدث الأساسي.
                if(isOfferActive && currentPrice !== offerP) {
                    window.pushCatalogUpdate(cProd.name, baseP, true, currentPrice);
                } else if (!isOfferActive && currentPrice !== baseP) {
                    window.pushCatalogUpdate(cProd.name, currentPrice, false, offerP);
                }
            } else {
                // منتج جديد خالص اتكتب لأول مرة، سجله في الكتالوج
                window.pushCatalogUpdate(nameInput.value, currentPrice, false, 0);
            }
        }
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
// 7. المعلقات 
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
// 8. إرسال الواتساب
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
// 9. الحفظ والطباعة (مع المودريتور وقفل الزرار) 
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
            
            // إضافة شارة عرض في الفاتورة لو المنتج ده عليه عرض
            let cProd = catalogData.find(cp => cp.name === n);
            let isOffer = cProd && (cProd.isOffer === true || cProd.isOffer === "true" || cProd.isOffer === 1);
            let nDisplay = isOffer ? `<span class="offer-badge">عرض</span> ${n}` : n;
            
            printItemsHtml += `<tr><td>${nDisplay}</td><td>${p}</td><td>${q}</td><td>${rowTotal}</td></tr>`;
        });
        
        if (productsListText === "") { showToast("لا يمكن حفظ أوردر بدون منتجات!", "error"); return; }
        if (!isPaymentConfirmed) { showToast("تأكيد طريقة الدفع 🔒", "error"); return; }

        let phone = document.getElementById('customerPhone') ? document.getElementById('customerPhone').value.trim() : "";
        let name = document.getElementById('customerName') ? document.getElementById('customerName').value : "";
        let gov = document.getElementById('governorate') ? document.getElementById('governorate').value : "";
        let delType = deliveryTypeSelect ? deliveryTypeSelect.value : "";
        
        // التحقق من المودريتور
        let moderatorSelect = document.getElementById('moderatorSelect');
        let selectedModerator = moderatorSelect ? moderatorSelect.value : "";
        if (!selectedModerator) { showToast("يرجى اختيار اسم المسؤول عن الأوردر!", "error"); return; }

        if (!phone || phone.length < 9) { showToast("رقم الموبايل غير صحيح!", "error"); return; }
        if (!name) { showToast("اكتب اسم العميل!", "error"); return; }
        if (delType === 'normal' && !gov) { showToast("اختر المحافظة!", "error"); return; }

        setBtnLoading(saveAndPrintBtn, true);

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
        formData.append('moderator', selectedModerator);

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
            
            let sellerP = document.getElementById('print-seller-name');
            if(sellerP) sellerP.innerText = `البائع: ${selectedModerator}`;

            setTimeout(() => {
                window.print();
                resetForm();
                setBtnLoading(saveAndPrintBtn, false);
                loadDataFromServer(); 
            }, 1000);
            
        }).catch(() => { 
            showToast("❌ خطأ في الاتصال بالإنترنت", "error"); 
            setBtnLoading(saveAndPrintBtn, false); 
        });
    });
}

// ==========================================
// 10. الإضافة، التعديل، والحذف (المناطق، المناديب، المودريتور) 
// ==========================================

window.deleteItem = function(action, name, zoneType = '') {
    if(!confirm(`هل أنت متأكد من حذف (${name}) نهائياً؟`)) return;
    let formData = new URLSearchParams();
    formData.append('action', action);
    formData.append('name', name);
    if(zoneType) formData.append('zoneType', zoneType);
    
    showToast("⏳ جاري الحذف...", "warning");
    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("✅ تم الحذف بنجاح!", "success");
            loadDataFromServer();
        });
};

window.editZoneUI = function(name, price, type, duration) {
    if(document.getElementById('newZoneName')) document.getElementById('newZoneName').value = name;
    if(document.getElementById('newZonePrice')) document.getElementById('newZonePrice').value = price;
    if(document.getElementById('newZoneType')) document.getElementById('newZoneType').value = type;
    if(document.getElementById('newZoneDuration')) document.getElementById('newZoneDuration').value = duration;
    showToast("قم بتعديل البيانات واضغط حفظ", "success");
};

window.editDriverUI = function(name, phone) {
    if(document.getElementById('newDriverName')) document.getElementById('newDriverName').value = name;
    if(document.getElementById('newDriverPhone')) document.getElementById('newDriverPhone').value = phone;
    showToast("قم بتعديل البيانات واضغط حفظ", "success");
};

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
            setBtnLoading(addZoneBtnAction, false);
            document.getElementById('newZoneName').value = ""; document.getElementById('newZonePrice').value = ""; document.getElementById('newZoneDuration').value = "";
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
        
        let isExisting = Array.from(document.getElementById('driverNameSelect').options).some(o => o.value === name);

        setBtnLoading(addDriverBtnAction, true);
        let formData = new URLSearchParams(); 
        formData.append('action', isExisting ? 'editDriver' : 'addDriver'); 
        formData.append('name', name); 
        formData.append('phone', phone);
        
        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => { 
            showToast(`✅ تم ${isExisting ? 'تعديل' : 'إضافة'} المندوب!`, "success"); 
            setBtnLoading(addDriverBtnAction, false);
            document.getElementById('newDriverName').value = ""; document.getElementById('newDriverPhone').value = "";
            loadDataFromServer();
        }).catch(()=>{ setBtnLoading(addDriverBtnAction, false); });
    });
}

let addModeratorBtn = document.getElementById('addModeratorBtn');
if (addModeratorBtn) {
    addModeratorBtn.addEventListener('click', () => {
        let nameInput = document.getElementById('newModeratorName');
        let name = nameInput ? nameInput.value.trim() : "";
        if(!name) { showToast("اكتب اسم الكاشير أولاً", "error"); return; }

        setBtnLoading(addModeratorBtn, true);
        let formData = new URLSearchParams();
        formData.append('action', 'addModerator');
        formData.append('name', name);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("✅ تم إضافة الكاشير بنجاح", "success");
            setBtnLoading(addModeratorBtn, false);
            nameInput.value = "";
            loadDataFromServer();
        }).catch(() => { setBtnLoading(addModeratorBtn, false); });
    });
}

let logoUpload = document.getElementById('logoUpload');
if(logoUpload) {
    logoUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            let reader = new FileReader();
            reader.onload = function(event) {
                let printLogo = document.getElementById('print-logo');
                let logoText = document.getElementById('logoUploadText');
                if(printLogo) {
                    printLogo.src = event.target.result;
                    printLogo.style.display = 'inline-block';
                    if(logoText) logoText.innerText = "✅ تم رفع اللوجو بنجاح (سيظهر في الطباعة)";
                    showToast("✅ تم رفع اللوجو بنجاح", "success");
                }
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

// ==========================================
// 11. غرفة عمليات الشحن والداشبورد
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

function updateAdvancedDashboard(history) {
    let moneyWithDrivers = 0, returnedCount = 0;
    history.forEach(o => {
        if(o.status === 'في الشحن') moneyWithDrivers += parseFloat(o.total) || 0;
        if(o.status === 'مرتجع') returnedCount++;
    });
    if(document.getElementById('moneyWithDrivers')) document.getElementById('moneyWithDrivers').innerText = moneyWithDrivers;
    if(document.getElementById('returnedCount')) document.getElementById('returnedCount').innerText = returnedCount;
}

// ==========================================
// 12. نظام الكتالوج والنواقص الشامل (الجديد ⭐)
// ==========================================

// دالة تحديث الكتالوج الصامتة
window.pushCatalogUpdate = function(name, price, isOffer, offerPrice) {
    let formData = new URLSearchParams();
    formData.append('action', 'updateCatalog');
    formData.append('name', name);
    formData.append('price', price);
    formData.append('isOffer', isOffer);
    formData.append('offerPrice', offerPrice);
    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData });
};

// عرض الكتالوج
function renderCatalog(catalogList) {
    let container = document.getElementById('catalogListContainer');
    if(!container) return;
    container.innerHTML = '';
    
    if(catalogList.length === 0) {
        container.innerHTML = '<p class="empty-msg">الكتالوج فارغ.</p>';
        return;
    }

    catalogList.forEach(p => {
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
                <button class="btn-outline interactive-btn edit-cat-btn" style="padding:4px; font-size:0.7rem;">تعديل ✏️</button>
            </div>
        `;

        // تفعيل وإلغاء العرض
        div.querySelector('.offer-toggle').addEventListener('change', (e) => {
            let newState = e.target.checked;
            let currentOffer = p.offerPrice || p.price;
            if(newState && !p.offerPrice) {
                currentOffer = prompt(`أدخل سعر العرض لـ ${p.name}:`, p.price);
                if(!currentOffer) { e.target.checked = false; return; }
            }
            window.pushCatalogUpdate(p.name, p.price, newState, currentOffer);
            showToast(newState ? "✅ تم تفعيل العرض" : "❌ تم إيقاف العرض", "success");
            setTimeout(loadDataFromServer, 1000);
        });

        // تعديل السعر
        div.querySelector('.edit-cat-btn').addEventListener('click', () => {
            let newPrice = prompt(`تعديل السعر الأساسي لـ ${p.name}:`, p.price);
            if(newPrice) {
                window.pushCatalogUpdate(p.name, newPrice, isOfferActive, p.offerPrice);
                showToast("✅ تم تعديل السعر", "success");
                setTimeout(loadDataFromServer, 1000);
            }
        });

        container.appendChild(div);
    });
}

// زر إضافة منتج للكتالوج
let addCatalogBtn = document.getElementById('addCatalogBtn');
if(addCatalogBtn) {
    addCatalogBtn.addEventListener('click', () => {
        let n = document.getElementById('newCatalogName').value;
        let p = document.getElementById('newCatalogPrice').value;
        if(!n || !p) { showToast("أدخل اسم المنتج والسعر", "error"); return; }
        
        setBtnLoading(addCatalogBtn, true);
        window.pushCatalogUpdate(n, p, false, 0);
        showToast("✅ تم إضافة المنتج", "success");
        setTimeout(() => {
            document.getElementById('newCatalogName').value = '';
            document.getElementById('newCatalogPrice').value = '';
            setBtnLoading(addCatalogBtn, false);
            loadDataFromServer();
        }, 1500);
    });
}

// عرض النواقص
function renderOutOfStock(oosList) {
    let container = document.getElementById('outOfStockContainer');
    if(!container) return;
    container.innerHTML = '';

    if(oosList.length === 0) {
        container.innerHTML = '<p class="empty-msg">لا يوجد نواقص مسجلة حالياً.</p>';
        return;
    }

    oosList.forEach(item => {
        let div = document.createElement('div');
        div.className = 'data-row';
        div.style.alignItems = 'center';
        div.innerHTML = `
            <div style="flex:1;">
                <strong>${item.customer}</strong> <br>
                <small style="color:var(--primary); font-weight:bold;">${item.product}</small>
            </div>
            <div style="display:flex; gap:5px;">
                <button class="interactive-btn wa-oos-btn" style="background:#25D366; color:white; border:none; padding:5px 10px; border-radius:8px;">💬</button>
                <button class="interactive-btn del-oos-btn" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:8px;">❌</button>
            </div>
        `;

        // إرسال واتساب للعميل إن المنتج توفر
        div.querySelector('.wa-oos-btn').addEventListener('click', () => {
            let phone = item.phone.toString().replace(/'/g, '').trim();
            if(phone.startsWith('0')) phone = '+2' + phone;
            let msg = `أهلاً بك يا ${item.customer} 👋\nالمنتج اللي سألتنا عليه (${item.product}) متوفر دلوقتي وتقدر تطلبه! 🍬`;
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        });

        // حذف من النواقص
        div.querySelector('.del-oos-btn').addEventListener('click', () => {
            if(!confirm("مسح العميل من قائمة النواقص؟")) return;
            let formData = newSearchParams();
            formData.append('action', 'deleteOutOfStock');
            formData.append('phone', item.phone);
            formData.append('product', item.product);
            fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData });
            div.remove();
            showToast("تم الحذف بنجاح", "success");
        });

        container.appendChild(div);
    });
}

// زر إضافة للنواقص
let addOosBtn = document.getElementById('addOosBtn');
if(addOosBtn) {
    addOosBtn.addEventListener('click', () => {
        let c = document.getElementById('oosCustomer').value;
        let ph = document.getElementById('oosPhone').value;
        let pr = document.getElementById('oosProduct').value;
        
        if(!c || !ph || !pr) { showToast("أكمل بيانات العميل والمنتج الناقص", "error"); return; }
        
        setBtnLoading(addOosBtn, true);
        let formData = new URLSearchParams();
        formData.append('action', 'addOutOfStock');
        formData.append('customer', c);
        formData.append('phone', ph);
        formData.append('product', pr);
        
        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("✅ تم تسجيل الناقص", "success");
            setBtnLoading(addOosBtn, false);
            document.getElementById('oosCustomer').value = '';
            document.getElementById('oosPhone').value = '';
            document.getElementById('oosProduct').value = '';
            loadDataFromServer();
        });
    });
}

// ==========================================
// التحديث الصامت للبيانات كل دقيقة 
// ==========================================
setInterval(() => {
    if(!document.querySelector('.modal-overlay.active')) {
        loadDataFromServer();
    }
}, 60000); 

// تفعيل الوضع الليلي
const darkModeToggle = document.getElementById('darkModeToggle');
if (darkModeToggle) {
    darkModeToggle.addEventListener('change', (e) => {
        if(e.target.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('candyDarkMode', 'true');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('candyDarkMode', 'false');
        }
    });
}
