// ==========================================
// 🌐 العقل المدبر - سيستم كاندي كلوب (النسخة V13.6 - الشاملة والمحصنة)
// ==========================================

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbz6dLvyXzuXhVKKxIt4c5ajIIv8iZtHM_5YRM8bYNuX5vwfs5_wSxP7gcZYOn8xm49OIw/exec";

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
    if (!btn) return;
    if (isLoading) {
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
        if (targetElement) targetElement.classList.add('active');
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
setupModal('openFinancialsBtn', 'financialsModal', 'closeFinancialsModal');

// ==========================================
// 3. تحميل الداتا الأساسية من الإكسيل
// ==========================================
let shippingData = {};
let catalogData = [];
let oosData = [];
let orderHistoryData = [];
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

    // ⭐ زرار التحديث السريع
    let quickRefreshBtn = document.getElementById('quickRefreshBtn');
    if (quickRefreshBtn) quickRefreshBtn.addEventListener('click', () => {
        showToast("جاري تحديث البيانات...", "warning");
        loadDataFromServer();
    });

    loadDataFromServer();
    if (typeof updateSuspendedCount === 'function') updateSuspendedCount();
};

function loadDataFromServer() {
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) { syncStatus.innerText = "جاري التحميل..."; syncStatus.style.color = "#FF8C00"; }

    fetch(`${GOOGLE_SHEETS_URL}?date=${currentFilterDate}`)
        .then(res => res.json())
        .then(data => {
            if (syncStatus) { syncStatus.innerText = "متصل"; syncStatus.style.color = "#00C853"; }

            orderHistoryData = data.history || [];
            window.pendingOrdersData = data.pendingOrders || [];
            window.suspendedOrdersData = data.suspendedOrders || [];
            window.financialsData = data.financials || [];
            window.uncollectedOrdersData = data.uncollectedOrders || [];
            window.customersData = data.customers || [];
            window.driversList = data.couriers || [];

            if (typeof renderFinancials === 'function') renderFinancials(window.financialsData);

            catalogData = data.catalog || [];
            renderCatalog(catalogData);

            oosData = data.outOfStock || [];
            renderOutOfStock(oosData);

            const govSelect = document.getElementById('governorate');
            let currentGov = govSelect ? govSelect.value : "";
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
                    // ⭐ إظهار السعر بجانب اسم المنطقة
                    optgroup.innerHTML += `<option value="${z.name}">${z.name} (${z.price} ج)</option>`;
                    renderZoneItem(z, 'alex', zonesAlexList);
                });
                if (govSelect) govSelect.appendChild(optgroup);
            }
            if (data.govs && data.govs.length > 0) {
                let optgroup = document.createElement('optgroup'); optgroup.label = "🚚 المحافظات";
                data.govs.forEach(z => {
                    optgroup.innerHTML += `<option value="${z.name}">${z.name} (${z.price} ج)</option>`;
                    renderZoneItem(z, 'govs', zonesGovList);
                });
                if (govSelect) govSelect.appendChild(optgroup);
            }
            if (govSelect && currentGov) govSelect.value = currentGov;

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

            const smartProductsList = document.getElementById('smartProductsList');
            if (smartProductsList) {
                smartProductsList.innerHTML = '';
                catalogData.forEach(p => { smartProductsList.innerHTML += `<option value="${p.name}">`; });
            }

            const modSelect = document.getElementById('moderatorSelect');
            let currentMod = modSelect ? modSelect.value : "";
            const modsList = document.getElementById('moderatorsList');
            if (modSelect) modSelect.innerHTML = '<option value="">-- اختر اسمك --</option>';
            if (modsList) modsList.innerHTML = '';
            if (data.moderators && data.moderators.length > 0) {
                data.moderators.forEach(m => {
                    if (modSelect) modSelect.innerHTML += `<option value="${m}">${m}</option>`;
                    if (modsList) {
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
            if (modSelect && currentMod) modSelect.value = currentMod;

            if (document.getElementById('todayCount')) document.getElementById('todayCount').innerText = data.todayOrders || 0;
            if (document.getElementById('todaySales')) document.getElementById('todaySales').innerText = data.todaySales || 0;
            if (document.getElementById('monthSales')) document.getElementById('monthSales').innerText = data.monthSales || 0;
            if (document.getElementById('completedCount')) document.getElementById('completedCount').innerText = data.completedOrders || 0;
            if (document.getElementById('topProduct')) document.getElementById('topProduct').innerText = data.topProduct || "--";

            // إخفاء الأوردرات المشحونة حتى يتم اختيار المندوب
            let shippedCont = document.getElementById('shippedOrdersContainer');
            if (shippedCont) shippedCont.innerHTML = '<p class="empty-msg">برجاء اختيار المندوب والضغط على "عرض العهدة"</p>';

            renderHistoryList(orderHistoryData);
            renderShippingRoom(orderHistoryData);
            updateAdvancedDashboard(orderHistoryData);
            checkBookingAlerts();

        }).catch(err => {
            if (syncStatus) { syncStatus.innerText = "خطأ اتصال"; syncStatus.style.color = "red"; }
        });
}

function checkBookingAlerts() {
    let banner = document.getElementById('booking-alert-banner');
    if (!banner) return;
    let hasAlert = window.pendingOrdersData.some(o => o.orderType && o.orderType.includes('حجز'));
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
        let statusColor = f.netDue > 0 ? "#27ae60" : (f.netDue < 0 ? "#c0392b" : "#7f8c8d");

        let driverOrders = (window.uncollectedOrdersData || []).filter(o => o.driver === f.name);
        let ordersHtml = '';
        if (driverOrders.length > 0) {
            ordersHtml = `<div style="margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 10px;">
                <strong style="font-size:0.85rem; color:var(--primary);">📦 أوردرات معلقة (لم يتم تسويتها):</strong>`;
            driverOrders.forEach(o => {
                ordersHtml += `
                    <div class="financial-order-item" style="background:#fdfdfd; padding:8px; border:1px solid #eee; border-radius:6px; margin-top:5px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span style="font-weight:bold; color:var(--text-dark);">${o.id}</span><br>
                            <span style="font-size:0.75rem; color:#777;">${o.payment} | إجمالي: ${o.total}ج | شحن: ${o.shipping}ج</span><br>
                            <span style="font-size:0.85rem; font-weight:bold; color:var(--danger);">المطلوب تحصيله: ${o.remaining}ج</span>
                        </div>
                        <button class="btn-settle interactive-btn" onclick="settleDriverOrder('${o.id}', this, '${o.payment}')" style="background:var(--success); color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">تسوية 💸</button>
                    </div>
                `;
            });
            ordersHtml += `</div>`;
        }

        container.innerHTML += `
            <div class="financial-row" style="background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #eaeaea; margin-bottom: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                <div class="financial-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #f0f0f0; padding-bottom:8px; margin-bottom:10px;">
                    <span style="font-weight:bold; font-size:1.1rem; color:var(--text-dark);">🛵 ${f.name}</span>
                    <span style="font-size: 0.85rem; background:#f0f0f0; color:var(--text-dark); padding:3px 8px; border-radius:12px; font-weight:bold;">${f.ordersCount || 0} طلب</span>
                </div>
                <div class="financial-details" style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:10px;">
                    <span style="background:#e8f4f8; padding:5px 10px; border-radius:6px; color:#555;">الكاش: <strong style="color:#2980b9;">${f.cashCollected || 0}</strong> ج</span>
                    <span style="background:#f9ebea; padding:5px 10px; border-radius:6px; color:#555;">الشحن: <strong style="color:#c0392b;">${f.shippingFees || 0}</strong> ج</span>
                </div>
                <div class="financial-status" style="background: ${statusColor}15; color: ${statusColor}; padding: 8px; border-radius: 6px; text-align:center; font-weight:bold; border: 1px dashed ${statusColor};">
                    ${f.statusText || "لا توجد مديونية"} ${f.netDue !== 0 ? `( ${Math.abs(f.netDue)} ج.م )` : ''}
                </div>
                ${ordersHtml}
            </div>
        `;
    });
}

// ⭐ حماية تصفية الأوردر برسالة واضحة بناءً على نوع الدفع
window.settleDriverOrder = function (orderId, btn, payMethod) {
    let msg = `هل أنت متأكد من تسوية الأوردر (${orderId})؟`;
    if (payMethod.includes('كاش')) msg = `هل استلمت النقدية من المندوب الخاصة بالأوردر (${orderId})؟`;
    else msg = `هل قمت بصرف حق الشحن للمندوب عن الأوردر (${orderId}) المدفوع إلكترونياً؟`;

    if (!confirm(msg)) return;

    btn.innerText = "جاري...";
    btn.disabled = true;

    let formData = new URLSearchParams();
    formData.append('action', 'settleOrder');
    formData.append('orderId', orderId);

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("✅ تمت المحاسبة وتسوية الأوردر!", "success");
            loadDataFromServer();
        }).catch(() => {
            showToast("❌ حدث خطأ في الاتصال", "error");
            btn.innerText = "تسوية 💸";
            btn.disabled = false;
        });
};

// ==========================================
// 4. حساب أجازة الجمعة والعربون 🚀
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
            let infoSpan = document.querySelector('#deliveryInfo span'); if (infoSpan) infoSpan.innerText = "استلام من الفرع 🏪";
        } else if (type === 'special_date') {
            if (addressFields) addressFields.classList.remove('hidden-field');
            if (specialDateContainer) specialDateContainer.classList.remove('hidden-field');
            triggerGovCalc();
        } else {
            if (addressFields) addressFields.classList.remove('hidden-field');
            if (specialDateContainer) specialDateContainer.classList.add('hidden-field');
            triggerGovCalc();
        }
        calculateTotal();
    });
}

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
            dateDisplay.innerText = "حسب التاريخ المختار 📅";
        } else if (info.type === 'next_day') {
            dateDisplay.innerText = "تاني يوم 🚚";
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
window.searchResultsCache = []; // ⭐ لتخزين البحث دون مسح السجل

function renderHistoryList(orders, isLoadMore = false) {
    let container = document.getElementById('historyListContainer');
    if (!container) return;

    if (!isLoadMore) {
        container.innerHTML = '';
        currentHistoryPage = 1;
        currentOrdersList = orders;

        if (window.pendingOrdersData && window.pendingOrdersData.length > 0 && document.getElementById('orderSearchInput').value.trim() === "") {
            let pendingDiv = document.createElement('div');
            pendingDiv.innerHTML = `<h4 style="color: #e74c3c; padding-bottom: 5px; margin-bottom: 15px; font-weight: bold;">🔴 أوردرات لم تُشحن بعد (${window.pendingOrdersData.length})</h4>`;

            window.pendingOrdersData.forEach(pOrder => {
                pendingDiv.innerHTML += `
                    <div class="history-item" style="border-right-color: #e74c3c; background: #fff5f5;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <strong style="font-size: 1.05rem;">${pOrder.id} | ${pOrder.name}</strong>
                            <span style="color: #e74c3c; font-weight: bold; font-size:0.85rem;">📅 ${pOrder.date}</span>
                        </div>
                        <div style="font-size: 0.9rem; color: #555;">
                            <span>📱 ${pOrder.phone} | <span style="color:#000; font-weight:bold;">💰 ${pOrder.total} ج.م</span></span>
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

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 8px; align-items: center;">
                <strong style="font-size: 1.05rem;">${order.id} | ${order.name}</strong>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="interactive-btn" onclick="shareToWhatsAppGroup('${order.id}')" style="background:none; border:none; font-size:1.3rem; cursor:pointer;" title="مشاركة للجروب">📱</button>
                    <button class="interactive-btn" onclick="printOldOrder('${order.id}')" style="background:none; border:none; font-size:1.3rem; cursor:pointer;" title="طباعة الفاتورة الأصلية">🖨️</button>
                    <span style="background: ${statusColor}15; color: ${statusColor}; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">${order.status}</span>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.9rem; color: #666; background: var(--bg-body); padding: 8px; border-radius: 6px;">
                <span>⏰ ${order.time || '--'}</span>
                <span>📱 ${order.phone}</span>
                <span style="font-weight:bold; color: var(--text-dark);">💰 ${order.total} ج.م</span>
            </div>
        `;
        container.appendChild(div);
    });

    let oldBtn = document.getElementById('loadMoreHistoryBtn');
    if (oldBtn) oldBtn.remove();

    if (endIndex < currentOrdersList.length) {
        let btn = document.createElement('button');
        btn.id = 'loadMoreHistoryBtn';
        btn.innerText = '⬇️ عرض المزيد';
        btn.style.cssText = 'width: 100%; padding: 12px; margin-top: 15px; background: var(--bg-body); border: 2px solid var(--border); border-radius: 8px; cursor: pointer; font-weight: bold; color: var(--text-dark); transition: 0.3s;';
        btn.onmouseover = () => btn.style.borderColor = 'var(--primary)';
        btn.onmouseout = () => btn.style.borderColor = 'var(--border)';
        btn.onclick = () => {
            currentHistoryPage++;
            renderHistoryList(currentOrdersList, true);
        };
        container.appendChild(btn);
    }
}

// ⭐ إصلاح تشوه الفاتورة المطبوعة القديمة
window.printOldOrder = function (orderId) {
    let order = orderHistoryData.find(o => o.id === orderId);
    if (!order && window.searchResultsCache) order = window.searchResultsCache.find(o => o.id === orderId);
    if (!order && window.pendingOrdersData) order = window.pendingOrdersData.find(o => o.id === orderId);
    if (!order && window.suspendedOrdersData) order = window.suspendedOrdersData.find(o => o.id === orderId);
    if (!order && window.uncollectedOrdersData) order = window.uncollectedOrdersData.find(o => o.id === orderId);
    
    if (!order) {
        showToast("تعذر العثور على بيانات الأوردر للطباعة", "error");
        return;
    }

    let isOldGift = order.notes && order.notes.includes("هدية");

    let printLogo = document.getElementById('receiptLogo') || document.getElementById('print-logo');
    if (printLogo) {
        let oType = order.orderType || "";
        let rem = parseFloat(order.remaining) || 0;
        let pay = order.payment || "";
        
        if (oType.includes("استلام من الفرع")) {
            printLogo.src = "./images/logo-branch.png";
        } else if (rem === 0 && (pay.includes("انستاباي") || pay.includes("محفظة") || pay.includes("فودافون") || pay.includes("إنستا"))) {
            printLogo.src = "./images/logo-digital.png";
        } else {
            printLogo.src = "./images/logo-cash.png";
        }
        printLogo.style.display = 'inline-block';
    }

    if (document.getElementById('receipt-type')) {
        let typeStr = oType || "أوردر توصيل";
        let govStr = order.gov ? order.gov + " - " : "";
        document.getElementById('receipt-type').innerText = isOldGift ? `${govStr}${typeStr} - 🎁 هدية` : `${govStr}${typeStr}`;
    }
    if (document.getElementById('print-date')) document.getElementById('print-date').innerText = order.date;
    if (document.getElementById('print-time')) document.getElementById('print-time').innerText = order.time || '';
    if (document.getElementById('print-customer-name')) document.getElementById('print-customer-name').innerText = order.name;
    if (document.getElementById('print-phone')) document.getElementById('print-phone').innerText = order.phone;
    if (document.getElementById('print-address')) document.getElementById('print-address').innerText = order.address || "";
    if (document.getElementById('print-status')) document.getElementById('print-status').innerText = order.status;

    let printItemsHtml = "";
    if (order.products) {
        let lines = order.products.split('\n');
        lines.forEach(line => {
            if (line.trim() !== "") {
                // تقسيم السطر بشكل ذكي ليتناسب مع الجدول الجديد
                let match = line.match(/(.*) - الكمية: (\d+) \(([\d.]+)ج\)/);
                if (match) {
                    let name = match[1].trim();
                    let qty = match[2];
                    let total = match[3];
                    let price = parseFloat(total) / parseFloat(qty);

                    let printP = isOldGift ? "***" : price;
                    let printTotal = isOldGift ? "***" : total;

                    printItemsHtml += `<tr><td>${name}</td><td>${printP}</td><td>${qty}</td><td>${printTotal}</td></tr>`;
                } else {
                    printItemsHtml += `<tr><td colspan="4" style="text-align:right;">${line}</td></tr>`;
                }
            }
        });
    } else {
        printItemsHtml = `<tr><td colspan="4">لا توجد تفاصيل</td></tr>`;
    }
    if (document.getElementById('print-items-body')) document.getElementById('print-items-body').innerHTML = printItemsHtml;

    if (document.getElementById('print-subtotal')) document.getElementById('print-subtotal').innerText = isOldGift ? "***" : (order.subtotal || 0);
    if (document.getElementById('print-discount')) document.getElementById('print-discount').innerText = isOldGift ? "***" : (order.discount || 0);
    if (document.getElementById('print-shipping')) document.getElementById('print-shipping').innerText = isOldGift ? "***" : (order.shipping || 0);

    // إظهار العربون لو فيه
    if (parseFloat(order.deposit) > 0 && !isOldGift) {
        document.querySelector('.print-deposit-row').style.display = 'block';
        document.getElementById('print-deposit').innerText = order.deposit;
        document.getElementById('print-final').innerText = order.remaining;
        if(document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "المتبقي للدفع";
    } else {
        document.querySelector('.print-deposit-row').style.display = 'none';
        document.getElementById('print-final').innerText = isOldGift ? "***" : order.total;
        if(document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "الإجمالي النهائي";
    }

    if (document.getElementById('print-payment')) document.getElementById('print-payment').innerText = order.payment || "";

    let sellerP = document.getElementById('print-seller-name');
    if (sellerP) sellerP.innerText = `الكاشير: ${order.seller || 'غير محدد'}`;

    setTimeout(() => window.print(), 500);
};

// ⭐ إصلاح مسح الذاكرة في محرك البحث الشامل
const searchBtn = document.getElementById('searchBtn');
const orderSearchInput = document.getElementById('orderSearchInput');
if (searchBtn && orderSearchInput) {
    searchBtn.addEventListener('click', () => {
        let keyword = orderSearchInput.value.trim().toLowerCase();
        if (keyword === "") {
            renderHistoryList(orderHistoryData);
        } else {
            let container = document.getElementById('historyListContainer');
            container.innerHTML = '<p class="empty-msg">جاري البحث الشامل في قاعدة البيانات... ⏳</p>';

            fetch(`${GOOGLE_SHEETS_URL}?action=globalSearch&query=${encodeURIComponent(keyword)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.length === 0) container.innerHTML = '<p class="empty-msg">لم يتم العثور على أوردرات مطابقة.</p>';
                    else {
                        window.searchResultsCache = data;
                        renderHistoryList(data);
                    }
                })
                .catch(() => {
                    container.innerHTML = '<p class="empty-msg">❌ حدث خطأ في الاتصال بالإنترنت.</p>';
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

// ⭐ إصلاح ذاكرة السمكة
function performPhoneSearch() {
    if (!phoneInput || !phoneStatus) return;
    let phoneVal = phoneInput.value.trim().replace(/\D/g, '');
    if (phoneVal.length >= 9) {
        phoneStatus.innerText = "⏳";

        let foundCustomer = null;
        if (orderHistoryData && orderHistoryData.length > 0) foundCustomer = orderHistoryData.find(o => o.phone.toString().replace(/\D/g, '').includes(phoneVal));
        if (!foundCustomer && window.pendingOrdersData && window.pendingOrdersData.length > 0) foundCustomer = window.pendingOrdersData.find(o => o.phone.toString().replace(/\D/g, '').includes(phoneVal));

        if (foundCustomer) {
            fillCustomerData(foundCustomer);
        } else {
            // البحث الشامل الصامت في قاعدة العملاء
            fetch(`${GOOGLE_SHEETS_URL}?action=globalSearch&query=${phoneVal}`)
                .then(res => res.json())
                .then(data => {
                    if (data.length > 0) fillCustomerData(data[0]);
                    else phoneStatus.innerText = "🆕";
                }).catch(() => phoneStatus.innerText = "🔍");
        }
    } else {
        phoneStatus.innerText = "🔍";
    }
}

function fillCustomerData(cust) {
    if (document.getElementById('customerName')) document.getElementById('customerName').value = cust.name;
    if (document.getElementById('address') && cust.address && cust.address !== 'استلام من الفرع') {
        document.getElementById('address').value = cust.address;
    }
    phoneStatus.innerText = "✅";
    showToast(`أهلاً بعودتك يا ${cust.name}!`, "success");
}

if (phoneStatus) phoneStatus.addEventListener('click', performPhoneSearch);
if (phoneInput) phoneInput.addEventListener('change', performPhoneSearch);

const productsContainer = document.getElementById('productsContainer');

// ⭐ دالة إضافة المنتجات (وإصلاح قفل الخانات عند الاسترجاع)
function addProductRow(nameVal = "", priceVal = "", qtyVal = "1", isConfirmed = false) {
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
    div.style.display = 'flex';
    div.style.gap = '5px';
    div.style.alignItems = 'center';

    let rOnly = isConfirmed ? 'readonly' : '';

    div.innerHTML = `
        <input type="text" list="smartProductsList" class="product-name-input" placeholder="اسم المنتج..." value="${nameVal}" required style="flex:3;" ${rOnly}>
        <input type="number" class="product-price-input" placeholder="السعر" value="${priceVal}" required style="flex:1.2; text-align:center;" ${rOnly}>
        
        <button type="button" class="btn-offer-toggle" style="display:none; flex:0.8;" title="تفعيل/إيقاف العرض">%</button>

        <input type="number" class="product-qty-input" placeholder="الكمية" value="${qtyVal}" min="1" required style="flex:1; text-align:center;" ${rOnly}>
        <button type="button" class="btn-confirm-pro interactive-btn" style="flex: 0 0 36px;">✔️</button>
        <button type="button" class="remove-product-btn interactive-btn" style="flex: 0 0 36px;">❌</button>
    `;

    wrapper.appendChild(div);
    productsContainer.appendChild(wrapper);

    let nameInput = div.querySelector('.product-name-input');
    let priceInput = div.querySelector('.product-price-input');
    let qtyInput = div.querySelector('.product-qty-input');
    let confirmBtn = div.querySelector('.btn-confirm-pro');
    let removeBtn = div.querySelector('.remove-product-btn');
    let offerBtn = div.querySelector('.btn-offer-toggle');

    if (isConfirmed) confirmBtn.innerHTML = "✏️";

    nameInput.addEventListener('input', () => {
        let selected = catalogData.find(p => p.name === nameInput.value);
        if (selected) {
            let baseP = parseFloat(selected.price) || 0;
            let offerP = parseFloat(selected.offerPrice) || 0;
            let isOfferActive = selected.isOffer === true || selected.isOffer === "true" || selected.isOffer === 1 || selected.isOffer === "TRUE";

            if (offerP > 0) {
                offerBtn.style.display = 'inline-block';
                if (isOfferActive) offerBtn.classList.add('active');
                else offerBtn.classList.remove('active');

                priceInput.value = isOfferActive ? offerP : baseP;
                priceInput.readOnly = isOfferActive;

                offerBtn.onclick = () => {
                    let willBeActive = !offerBtn.classList.contains('active');
                    if (willBeActive) {
                        offerBtn.classList.add('active');
                        priceInput.value = offerP;
                        priceInput.readOnly = true;
                    } else {
                        offerBtn.classList.remove('active');
                        priceInput.value = baseP;
                        priceInput.readOnly = false;
                    }
                    calculateTotal();
                    window.pushCatalogUpdate(selected.name, baseP, willBeActive, offerP);
                    selected.isOffer = willBeActive;
                };
            } else {
                offerBtn.style.display = 'none';
                priceInput.value = baseP;
                priceInput.readOnly = false;
            }
            calculateTotal();
        } else {
            offerBtn.style.display = 'none';
            priceInput.readOnly = false;
        }
    });

    priceInput.addEventListener('input', calculateTotal);
    qtyInput.addEventListener('input', calculateTotal);

    confirmBtn.addEventListener('click', () => {
        if (!nameInput.value || priceInput.value === "" || qtyInput.value === "") return;

        if (div.classList.contains('confirmed')) {
            div.classList.remove('confirmed');
            confirmBtn.innerHTML = "✔️";
            nameInput.readOnly = false;

            let selected = catalogData.find(p => p.name === nameInput.value);
            let isOfferActive = selected && (selected.isOffer === true || selected.isOffer === "true" || selected.isOffer === 1);
            if (!isOfferActive) priceInput.readOnly = false;

            qtyInput.readOnly = false;
        } else {
            div.classList.add('confirmed');
            confirmBtn.innerHTML = "✏️";
            calculateTotal();
            nameInput.readOnly = true;
            priceInput.readOnly = true;
            qtyInput.readOnly = true;

            let currentPrice = parseFloat(priceInput.value);
            let cProd = catalogData.find(p => p.name === nameInput.value);

            if (cProd) {
                let isOfferActive = cProd.isOffer === true || cProd.isOffer === "true" || cProd.isOffer === 1;
                let baseP = parseFloat(cProd.price) || 0;
                let offerP = parseFloat(cProd.offerPrice) || 0;

                if (isOfferActive && currentPrice !== offerP && currentPrice !== baseP) {
                    if (confirm("تم تعديل السعر لـ " + currentPrice + " هل تريد حفظه كسعر عرض دائم في الكتالوج؟")) {
                        window.pushCatalogUpdate(cProd.name, baseP, true, currentPrice);
                        cProd.offerPrice = currentPrice;
                    }
                } else if (!isOfferActive && currentPrice !== baseP) {
                    if (confirm("تم تعديل السعر لـ " + currentPrice + " هل تريد حفظه كسعر أساسي دائم في الكتالوج؟")) {
                        window.pushCatalogUpdate(cProd.name, currentPrice, false, offerP);
                        cProd.price = currentPrice;
                    }
                }
            } else {
                window.pushCatalogUpdate(nameInput.value, currentPrice, false, 0);
                catalogData.push({ name: nameInput.value, price: currentPrice, isOffer: false, offerPrice: 0 });
                updateSmartProductsList();
            }
        }
    });
    removeBtn.addEventListener('click', () => { wrapper.remove(); calculateTotal(); });
}

function updateSmartProductsList() {
    let dl = document.getElementById('smartProductsList');
    if (!dl) return;
    dl.innerHTML = '';
    catalogData.forEach(p => {
        let opt = document.createElement('option');
        opt.value = p.name;
        dl.appendChild(opt);
    });
}
if (document.getElementById('addProductBtn')) document.getElementById('addProductBtn').addEventListener('click', () => addProductRow());
if (productsContainer && productsContainer.children.length === 0) addProductRow();

// ⭐ نظام العربون والـ NaN
function calculateTotal() {
    let total = 0;
    document.querySelectorAll('.product-row.confirmed').forEach(row => {
        let price = parseFloat(row.querySelector('.product-price-input').value) || 0;
        let qty = parseFloat(row.querySelector('.product-qty-input').value) || 1;
        total += (price * qty); // محصنة ضد ה- NaN
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

// ⭐ منع اختراق الكيبورد بـ readonly و disabled
const paymentMethod = document.getElementById('paymentMethod');
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
            isPaymentConfirmed = true; confirmPaymentBtn.classList.add('confirmed'); confirmPaymentBtn.innerHTML = "تم التأكيد 🔒";
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
        setBtnLoading(suspendBtn, true); // ⭐ منع تكرار الأوردرات
        let nameEl = document.getElementById('customerName'); let name = nameEl && nameEl.value ? nameEl.value : "بدون اسم";
        let prods = [];
        document.querySelectorAll('.product-row').forEach(row => {
            let n = row.querySelector('.product-name-input').value, p = row.querySelector('.product-price-input').value, q = row.querySelector('.product-qty-input').value, c = row.classList.contains('confirmed');
            if (n) prods.push({ name: n, price: p, qty: q, confirmed: c });
        });

        let draftId = "CANDY-" + Math.floor(Math.random() * 900000 + 100000);
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
        if (drafts.length === 0) { list.innerHTML = '<p class="empty-msg">لا توجد طلبات معلقة</p>'; return; }

        drafts.forEach(d => {
            let div = document.createElement('div'); div.className = 'data-row'; div.style.alignItems = 'center';
            div.innerHTML = `
                <div style="flex:1;"><strong>${d.name}</strong> <br> <small style="color:#777">⏰ ${d.time || d.date}</small></div>
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
                if (list.children.length === 0) list.innerHTML = '<p class="empty-msg">لا توجد طلبات معلقة</p>';
                showToast("🗑️ تم حذف المسودة", "success");
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
    let formData = new URLSearchParams(); formData.append('action', 'removeSuspended'); formData.append('draftId', draftId); fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData });
}

function restoreDraft(d) {
    if (document.getElementById('platform')) document.getElementById('platform').value = d.platform || "";
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
            if (d.prods.length > 0) d.prods.forEach(p => addProductRow(p.name, p.price, p.qty, p.confirmed));
            else addProductRow();
        }
    } else if (d.products) { // If restored from Google Sheets
        if (productsContainer) {
            productsContainer.innerHTML = '';
            let lines = d.products.split('\n');
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
    showToast("✅ تم استرجاع الفاتورة!", "success");
}

function resetForm() {
    let form = document.getElementById('orderForm'); if (form) form.reset();
    let infoSpan = document.querySelector('#deliveryInfo span'); if (infoSpan) infoSpan.innerText = "--";
    let finalDisplay = document.getElementById('finalTotalDisplay'); if (finalDisplay) finalDisplay.innerText = "0";
    let remDisplay = document.getElementById('remainingAmountDisplay'); if (remDisplay) remDisplay.innerText = "0";

    if (productsContainer) { productsContainer.innerHTML = ''; addProductRow(); }
    isPaymentConfirmed = false;
    if (confirmPaymentBtn) { confirmPaymentBtn.classList.remove('confirmed'); confirmPaymentBtn.innerHTML = "تأكيد ✔️"; }
    if (paymentMethod) { paymentMethod.classList.remove('locked-field'); paymentMethod.disabled = false; }
    toggleGlobalLock(false);
    if (deliveryTypeSelect) deliveryTypeSelect.dispatchEvent(new Event('change'));
    if (phoneStatus) phoneStatus.innerText = "🔍";
    let hint = document.getElementById('giftHint'); if (hint) hint.remove();
}

// ==========================================
// 8. إرسال الواتساب
// ==========================================
let whatsappReviewBtn = document.getElementById('whatsappReviewBtn');
if (whatsappReviewBtn) {
    whatsappReviewBtn.addEventListener('click', () => {
        let phoneEl = document.getElementById('customerPhone'); let phone = phoneEl ? phoneEl.value.trim() : "";
        if (!phone) { showToast("يرجى إدخال رقم الهاتف!", "error"); return; }
        if (phone.startsWith('0')) phone = '+2' + phone;

        let expectedDateText = document.querySelector('#deliveryInfo span') ? document.querySelector('#deliveryInfo span').innerText : "";
        if (deliveryTypeSelect && deliveryTypeSelect.value === 'special_date') expectedDateText = document.getElementById('specialDateInput') ? document.getElementById('specialDateInput').value : "";

        let productsText = "";
        document.querySelectorAll('.product-row.confirmed').forEach(row => {
            let n = row.querySelector('.product-name-input').value, p = row.querySelector('.product-price-input').value, q = row.querySelector('.product-qty-input').value;
            productsText += `- ${n} - الكمية: ${q} (${(parseFloat(p) || 0) * (parseFloat(q) || 1)} ج.م)\n`;
        });
        if (productsText === "") productsText = "لم يتم تأكيد أي منتجات.\n";

        let message = `أهلاً بك في كاندي كلوب 🍬\nيرجى مراجعة تفاصيل طلبك:\n\n📦 التوصيل: ${expectedDateText}\n\n🛒 تفاصيل الطلب:\n${productsText}\n`;
        message += `🚚 الشحن: ${document.getElementById('shippingCost') ? document.getElementById('shippingCost').value || 0 : 0} ج.م\n`;
        message += `💰 الإجمالي المستحق: ${document.getElementById('finalTotalDisplay') ? document.getElementById('finalTotalDisplay').innerText : 0} ج.م\n\nيرجى الرد بكلمة (تمام) لتأكيد الأوردر 🤝`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
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
            let n = row.querySelector('.product-name-input').value, p = row.querySelector('.product-price-input').value, q = row.querySelector('.product-qty-input').value;
            let rowTotal = (parseFloat(p) || 0) * (parseFloat(q) || 1);
            productsListText += `${n} - الكمية: ${q} (${rowTotal}ج)\n`;

            let cProd = catalogData.find(cp => cp.name === n);
            let isOffer = cProd && (cProd.isOffer === true || cProd.isOffer === "true" || cProd.isOffer === 1);
            let nDisplay = n;

            let printP = isGift ? "***" : p;
            let printTotal = isGift ? "***" : rowTotal;
            printItemsHtml += `<tr><td>${nDisplay}</td><td>${printP}</td><td>${q}</td><td>${printTotal}</td></tr>`;
        });

        if (productsListText === "") { showToast("لا يمكن حفظ أوردر بدون منتجات!", "error"); return; }
        if (!isPaymentConfirmed) { showToast("تأكيد طريقة الدفع 🔒", "error"); return; }

        let phone = document.getElementById('customerPhone') ? document.getElementById('customerPhone').value.trim() : "";
        let name = document.getElementById('customerName') ? document.getElementById('customerName').value : "";
        let gov = document.getElementById('governorate') ? document.getElementById('governorate').value : "";
        let delType = deliveryTypeSelect ? deliveryTypeSelect.value : "";
        let addressVal = document.getElementById('address') ? document.getElementById('address').value.trim() : "";

        let moderatorSelect = document.getElementById('moderatorSelect');
        let selectedModerator = moderatorSelect ? moderatorSelect.value : "";
        if (!selectedModerator) { showToast("يرجى اختيار اسم المسؤول عن الأوردر!", "error"); return; }

        if (!phone || phone.length < 9) { showToast("رقم الموبايل غير صحيح!", "error"); return; }
        if (!name) { showToast("اكتب اسم العميل!", "error"); return; }
        if (delType === 'normal' && !gov) { showToast("اختر المحافظة!", "error"); return; }
        if (delType !== 'branch' && addressVal === "") { showToast("برجاء كتابة العنوان بالتفصيل أولاً!", "error"); return; }

        setBtnLoading(saveAndPrintBtn, true);

        let finalExpDate = document.querySelector('#deliveryInfo span') ? document.querySelector('#deliveryInfo span').innerText : "";
        let bookingDatePrint = "";
        if (delType === 'special_date') {
            finalExpDate = document.getElementById('specialDateInput') ? document.getElementById('specialDateInput').value : "";
            bookingDatePrint = finalExpDate;
        }

        let finalNotes = document.getElementById('notes') ? document.getElementById('notes').value : "";
        if (isGift) finalNotes = "🎁 أوردر هدية - " + finalNotes;

        let finalTotalVal = document.getElementById('finalTotalDisplay') ? document.getElementById('finalTotalDisplay').innerText : 0;

        // ⭐ إضافة بيانات العربون
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
                showToast("✅ تم حفظ الأوردر بنجاح!", "success");

                let govStr = gov ? gov + " - " : "";
                if (document.getElementById('receipt-type')) document.getElementById('receipt-type').innerText = isGift ? `${govStr}${orderTypeLabel} - 🎁 هدية` : `${govStr}${orderTypeLabel}`;

                let printLogo = document.getElementById('receiptLogo') || document.getElementById('print-logo');
                if (printLogo) {
                    let payVal = paymentMethod ? paymentMethod.value : "";
                    if (orderTypeLabel.includes("استلام من الفرع")) {
                        printLogo.src = "./images/logo-branch.png";
                    } else if (parseFloat(rem) === 0 && (payVal.includes("إنستا") || payVal.includes("انستاباي") || payVal.includes("محفظة") || payVal.includes("فودافون"))) {
                        printLogo.src = "./images/logo-digital.png";
                    } else {
                        printLogo.src = "./images/logo-cash.png";
                    }
                    printLogo.style.display = 'inline-block';
                }

                if (document.getElementById('print-date')) document.getElementById('print-date').innerText = new Date().toLocaleDateString('ar-EG');
                if (document.getElementById('print-time')) document.getElementById('print-time').innerText = new Date().toLocaleTimeString('ar-EG');

                if (bookingDatePrint) {
                    document.querySelector('.print-booking-row').style.display = 'block';
                    document.getElementById('print-booking-date').innerText = bookingDatePrint;
                } else {
                    document.querySelector('.print-booking-row').style.display = 'none';
                }

                if (document.getElementById('print-customer-name')) document.getElementById('print-customer-name').innerText = name;
                if (document.getElementById('print-phone')) document.getElementById('print-phone').innerText = phone;
                if (document.getElementById('print-address')) document.getElementById('print-address').innerText = addressVal;
                if (document.getElementById('print-items-body')) document.getElementById('print-items-body').innerHTML = printItemsHtml;

                if (document.getElementById('print-subtotal')) document.getElementById('print-subtotal').innerText = isGift ? "***" : (document.getElementById('productsTotal') ? document.getElementById('productsTotal').value : 0);
                if (document.getElementById('print-discount')) document.getElementById('print-discount').innerText = isGift ? "***" : (document.getElementById('discount') ? document.getElementById('discount').value || 0 : 0);
                if (document.getElementById('print-shipping')) document.getElementById('print-shipping').innerText = isGift ? "***" : (document.getElementById('shippingCost') ? document.getElementById('shippingCost').value : 0);

                if (dep > 0 && !isGift) {
                    document.querySelector('.print-deposit-row').style.display = 'block';
                    document.getElementById('print-deposit').innerText = dep;
                    document.getElementById('print-final').innerText = rem;
                    if(document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "المتبقي للدفع";
                } else {
                    document.querySelector('.print-deposit-row').style.display = 'none';
                    document.getElementById('print-final').innerText = isGift ? "***" : finalTotalVal;
                    if(document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "الإجمالي النهائي";
                }

                if (document.getElementById('print-payment')) document.getElementById('print-payment').innerText = paymentMethod ? paymentMethod.value : "";

                let sellerP = document.getElementById('print-seller-name');
                if (sellerP) sellerP.innerText = `الكاشير: ${selectedModerator}`;

                setTimeout(() => {
                    window.print();
                    resetForm();
                    setBtnLoading(saveAndPrintBtn, false, "💾 حفظ وطباعة الفاتورة");
                    loadDataFromServer();
                }, 1000);

            }).catch(() => {
                showToast("❌ خطأ في الاتصال بالإنترنت", "error");
                setBtnLoading(saveAndPrintBtn, false, "💾 حفظ وطباعة الفاتورة");
            });
    });
}

// ==========================================
// 10. الإضافة، التعديل، والحذف 
// ==========================================

window.deleteItem = function (action, name, zoneType = '') {
    if (!confirm(`هل أنت متأكد من حذف (${name}) نهائياً؟`)) return;
    let formData = new URLSearchParams();
    formData.append('action', action);
    formData.append('name', name);
    if (zoneType) formData.append('zoneType', zoneType);

    showToast("⏳ جاري الحذف...", "warning");
    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("✅ تم الحذف بنجاح!", "success");
            loadDataFromServer();
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
                showToast(`✅ تم ${isExisting ? 'تعديل' : 'إضافة'} المنطقة!`, "success");
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
                showToast(`✅ تم ${isExisting ? 'تعديل' : 'إضافة'} المندوب!`, "success");
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
                showToast("✅ تم إضافة الكاشير بنجاح", "success");
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
        const pendingOrders = history.filter(o => o.status === 'قيد التجهيز' && o.orderType !== 'استلام من الفرع' && !o.orderType.includes('حجز'));
        const resOrders = history.filter(o => o.status === 'قيد التجهيز' && o.orderType && o.orderType.includes('حجز'));

        pendingContainer.innerHTML = '';
        if (pendingOrders.length === 0) pendingContainer.innerHTML = '<p class="empty-msg">لا يوجد أوردرات شحن قيد التجهيز.</p>';
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

        resContainer.innerHTML = '';
        if (resOrders.length === 0) resContainer.innerHTML = '<p class="empty-msg">لا يوجد حجوزات قادمة.</p>';
        else resOrders.forEach(o => {
            resContainer.innerHTML += `
                <div class="order-checkbox-row" style="border-left: 4px solid var(--primary);">
                    <input type="checkbox" class="order-checkbox pending-checkbox" value="${o.id}">
                    <div class="order-details-compact">
                        <span class="order-id-name">${o.id} | ${o.name}</span>
                        <span class="order-address-price" style="color: var(--primary); font-weight: bold;">📅 ${o.date} | 📱 ${o.phone} | 💰 ${o.total} ج.م</span>
                    </div>
                </div>`;
        });
    }

    // ⭐ قسم أوردرات الفرع (المنفصلة تماماً عن المندوبين)
    if (branchContainer) {
        const branchOrders = window.pendingOrdersData.filter(o => o.orderType === 'استلام من الفرع');
        branchContainer.innerHTML = '';
        if (branchOrders.length === 0) branchContainer.innerHTML = '<p class="empty-msg">لا يوجد أوردرات استلام فرع حالياً.</p>';
        else branchOrders.forEach(o => {
            branchContainer.innerHTML += `
                <div class="financial-order-item" style="border-right: 4px solid var(--warning);">
                    <div>
                        <span style="font-weight:bold;">${o.id} | ${o.name}</span><br>
                        <span style="font-size:0.75rem; color:#777;">الإجمالي: ${o.total}ج | المتبقي للدفع: <span style="color:var(--danger); font-weight:bold;">${o.remaining}ج</span></span>
                    </div>
                    <button class="btn-settle interactive-btn" onclick="settleBranchOrder('${o.id}', this)">تم التسليم ✅</button>
                </div>`;
        });
    }
}

// ⭐ دالة تسليم الفرع الفورية
window.settleBranchOrder = function (orderId, btn) {
    let order = window.pendingOrdersData.find(o => o.id === orderId);
    let amountPaidText = prompt('الرجاء إدخال المبلغ المدفوع لاستلام الفرع:', order ? order.remaining : 0);
    if (amountPaidText === null) return; 

    setBtnLoading(btn, true);
    let formData = new URLSearchParams();
    formData.append('action', 'updateOrderStatus');
    formData.append('orderId', orderId);
    formData.append('status', 'تم التوصيل ومُحاسب');

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast(`✅ تم التسليم وتصفية مبلغ (${amountPaidText} ج.م) بنجاح!`, "success");
            loadDataFromServer();
        }).catch(() => setBtnLoading(btn, false, "تم التسليم ✅"));
};

// ⭐ حماية زرار (تقفيل المندوبين)
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

        // عرض أوردرات المندوب المشحونة فقط
        const shippedOrders = orderHistoryData.filter(o => o.status === 'في الشحن' && o.driver === driver);
        shippedContainer.innerHTML = '';
        if (shippedOrders.length === 0) shippedContainer.innerHTML = '<p class="empty-msg">لا توجد أوردرات في الشحن لهذا المندوب.</p>';
        else shippedOrders.forEach(o => {
            shippedContainer.innerHTML += `
                <div class="order-checkbox-row">
                    <input type="checkbox" class="order-checkbox shipped-checkbox" value="${o.id}">
                    <div class="order-details-compact">
                        <span class="order-id-name">${o.id} | ${o.name}</span>
                        <span class="order-address-price">📱 ${o.phone} | 💰 ${o.remaining} ج.م</span>
                    </div>
                </div>`;
        });
    });
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
                    showToast(`✅ تم التحديث لـ "${newStatus}"`, "success");
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
    let ordersListText = `أوردرات المندوب: ${driver} 🛵\n\n`;
    let totalCash = 0;

    const selected = Array.from(document.querySelectorAll('.pending-checkbox:checked')).map(cb => cb.value);
    if (selected.length === 0) { showToast("حدد أوردر واحد على الأقل!", "warning"); return; }

    selected.forEach((orderId, idx) => {
        let o = orderHistoryData.find(x => x.id === orderId);
        if (o) {
            ordersListText += `${idx+1}. العميل: ${o.name}\n📱 ${o.phone}\n📍 العنوان: ${o.address}\n💰 المطلوب: ${o.remaining} ج.م\n🛒 المنتجات: ${o.products.replace(/\n/g, ', ')}\n\n`;
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
    let moneyWithDrivers = 0, returnedCount = 0;
    history.forEach(o => {
        if (o.status === 'في الشحن') moneyWithDrivers += parseFloat(o.remaining) || 0;
        if (o.status === 'مرتجع') returnedCount++;
    });
    if (document.getElementById('moneyWithDrivers')) document.getElementById('moneyWithDrivers').innerText = moneyWithDrivers;
    if (document.getElementById('returnedCount')) document.getElementById('returnedCount').innerText = returnedCount;

    let openFinancialsBtn = document.getElementById('openFinancialsBtn');
    if (openFinancialsBtn) {
        if (moneyWithDrivers > 0) {
            openFinancialsBtn.classList.add('pulse-btn');
        } else {
            openFinancialsBtn.classList.remove('pulse-btn');
        }
    }
}

window.shareToWhatsAppGroup = function(orderId) {
    let order;
    if (typeof orderId === 'object') {
        order = orderId;
    } else {
        order = (window.orderHistoryData || []).find(o => o.id === orderId) ||
                (window.searchResultsCache || []).find(o => o.id === orderId) ||
                (window.pendingOrdersData || []).find(o => o.id === orderId) ||
                (window.suspendedOrdersData || []).find(o => o.id === orderId) ||
                (window.uncollectedOrdersData || []).find(o => o.id === orderId);
    }
    
    if (!order) {
        showToast("لم يتم العثور على الأوردر", "error");
        return;
    }
    
    let text = `*نوع الطلب:* ${order.orderType || "توصيل"}\n`;
    text += `*التاريخ:* ${order.date || new Date().toLocaleDateString('ar-EG')} ⏰ ${order.time || new Date().toLocaleTimeString('ar-EG')}\n`;
    text += `👤 *العميل:* ${order.name}\n`;
    text += `📍 *العنوان:* ${order.gov ? order.gov + " - " : ""}${order.address || ""}\n`;
    text += `💳 *طريقة الدفع:* ${order.payment || ""}\n\n`;
    text += `📦 *المنتجات:*\n${order.products || ""}\n`;
    text += `🚚 *الشحن:* ${order.shipping || 0}\n`;
    text += `💰 *الإجمالي النهائي:* ${order.remaining !== undefined ? order.remaining : (order.total || 0)}\n`;
    
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
            let n = row.querySelector('.product-name-input').value, p = row.querySelector('.product-price-input').value, q = row.querySelector('.product-qty-input').value;
            productsListText += `${n} - الكمية: ${q} (${(parseFloat(p) || 0) * (parseFloat(q) || 1)}ج)\n`;
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

let sendWaManagerBtn = document.getElementById('sendWaManagerBtn');
if (sendWaManagerBtn) sendWaManagerBtn.addEventListener('click', () => {
    let tCount = document.getElementById('todayCount') ? document.getElementById('todayCount').innerText : 0;
    let tSales = document.getElementById('todaySales') ? document.getElementById('todaySales').innerText : 0;
    let compCount = document.getElementById('completedCount') ? document.getElementById('completedCount').innerText : 0;
    let retCount = document.getElementById('returnedCount') ? document.getElementById('returnedCount').innerText : 0;
    let topP = document.getElementById('topProduct') ? document.getElementById('topProduct').innerText : "--";
    let oosCount = window.oosData ? window.oosData.length : 0;

    let monthSales = document.getElementById('monthSales') ? document.getElementById('monthSales').innerText : 0;

    let report = `📊 *تقرير الإدارة - Candy Club Pro*\n\n`;
    report += `📅 *إحصائيات اليوم:*\n`;
    report += `🛒 أوردرات اليوم: ${tCount}\n`;
    report += `💰 مبيعات اليوم المتوقعة: ${tSales} ج\n`;
    report += `✅ أوردرات مكتملة (محاسب): ${compCount}\n`;
    report += `🚨 مرتجعات: ${retCount}\n\n`;
    
    report += `📅 *إحصائيات الشهر:*\n`;
    report += `📈 إجمالي مبيعات الشهر: ${monthSales} ج\n\n`;
    
    report += `⚠️ منتجات ناقصة: ${oosCount}\n`;
    report += `⭐ المنتج الأكثر مبيعاً: ${topP}\n\n`;
    report += `تم الإنشاء بواسطة سيستم الإدارة الآلي ⚙️`;

    navigator.clipboard.writeText(report).then(() => {
        showToast("تم نسخ التقرير للحافظة بنجاح 📋", "success");
    }).catch(err => {
        showToast("فشل في نسخ التقرير", "error");
    });
});

// ==========================================
// 12. نظام الكتالوج والنواقص الشامل
// ==========================================

window.pushCatalogUpdate = function (name, price, isOffer, offerPrice) {
    let formData = new URLSearchParams();
    formData.append('action', 'updateCatalog');
    formData.append('name', name);
    formData.append('price', price);
    formData.append('isOffer', isOffer);
    formData.append('offerPrice', offerPrice);
    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData });
};

// عرض الكتالوج (مع ربط شاشة التعديل الاحترافية)
function renderCatalog(catalogList) {
    let container = document.getElementById('catalogListContainer');
    if (!container) return;
    container.innerHTML = '';

    if (catalogList.length === 0) {
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

        div.querySelector('.offer-toggle').addEventListener('change', (e) => {
            let newState = e.target.checked;
            let currentOffer = p.offerPrice || p.price;
            if (newState && !p.offerPrice) {
                currentOffer = prompt(`أدخل سعر العرض لـ ${p.name}:`, p.price);
                if (!currentOffer) { e.target.checked = false; return; }
            }
            window.pushCatalogUpdate(p.name, p.price, newState, currentOffer);
            showToast(newState ? "✅ تم تفعيل العرض" : "❌ تم إيقاف العرض", "success");
            // استخدمنا الـ timeout عشان الداتا تلحق تتسجل
            setTimeout(loadDataFromServer, 2000);
        });

        div.querySelector('.edit-cat-btn').addEventListener('click', () => {
            document.getElementById('editCatOldName').value = p.name;
            document.getElementById('editCatName').value = p.name;
            document.getElementById('editCatPrice').value = p.price;
            document.getElementById('editCatOfferPrice').value = p.offerPrice || 0;
            document.getElementById('editCatalogModal').classList.add('active');
        });

        container.appendChild(div);
    });
}

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
            showToast("✅ تم التعديل بنجاح", "success");
            setBtnLoading(saveEditCatBtn, false, "حفظ التعديلات");
            document.getElementById('editCatalogModal').classList.remove('active');
            loadDataFromServer();
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
        showToast("✅ تم إضافة المنتج", "success");
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
        div.style.alignItems = 'center';
        div.innerHTML = `
            <div style="flex:1;">
                <strong>${item.customer}</strong> <br>
                <small style="color:var(--primary); font-weight:bold;">${item.product}</small><br>
                <span style="font-size:0.75rem; color:#888;">الغرض: ${item.reason || '--'}</span>
            </div>
            <div style="display:flex; gap:5px;">
                <button class="interactive-btn wa-oos-btn" style="background:#25D366; color:white; border:none; padding:5px 10px; border-radius:8px;">💬</button>
                <button class="interactive-btn del-oos-btn" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:8px;">❌</button>
            </div>
        `;

        div.querySelector('.wa-oos-btn').addEventListener('click', () => {
            let phone = item.phone.toString().replace(/'/g, '').trim();
            if (phone.startsWith('0')) phone = '+2' + phone;
            let msg = `أهلاً بك يا ${item.customer} 👋\nالمنتج اللي سألتنا عليه (${item.product}) متوفر دلوقتي وتقدر تطلبه! 🍬`;
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        });

        div.querySelector('.del-oos-btn').addEventListener('click', () => {
            if (!confirm("مسح العميل من قائمة النواقص؟")) return;
            let formData = new URLSearchParams();
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
                showToast("✅ تم تسجيل الناقص", "success");
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
}, 60000);

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

function renderCustomers(customersList) {
    let container = document.getElementById('customersListContainer');
    if (!container) return;
    container.innerHTML = '';
    
    if (customersList.length === 0) {
        container.innerHTML = '<p class="empty-msg">لا يوجد عملاء مسجلين.</p>';
        return;
    }

    customersList.forEach(c => {
        let div = document.createElement('div');
        div.className = 'history-item';
        div.style.borderRightColor = 'var(--secondary)';
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 1.05rem;">👤 ${c.name}</strong>
                <span style="color: var(--secondary); font-weight: bold; font-size: 0.85rem;">📞 ${c.phone}</span>
            </div>
            <div style="font-size: 0.9rem; color: #555; margin-top: 5px;">
                <span>📍 ${c.gov} - ${c.address}</span><br>
                <span>🛒 إجمالي الطلبات: <strong style="color: var(--text-dark);">${c.ordersCount}</strong> | 💰 إجمالي المدفوعات: <strong style="color: var(--success);">${c.totalPaid} ج.م</strong></span><br>
                <span style="font-size: 0.8rem; color: #888;">📅 آخر طلب: ${c.lastOrder ? String(c.lastOrder).split('T')[0] : '--'}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

let loadCustomersBtn = document.getElementById('loadCustomersBtn');
let customersListContainer = document.getElementById('customersListContainer');
if (loadCustomersBtn && customersListContainer) {
    loadCustomersBtn.addEventListener('click', () => {
        if (customersListContainer.style.display === 'none') {
            customersListContainer.style.display = 'block';
            loadCustomersBtn.innerHTML = 'إخفاء بيانات العملاء 📂';
            loadCustomersBtn.style.background = 'var(--danger)';
            if (customersListContainer.innerHTML.includes('جاري تحميل') || customersListContainer.innerHTML.includes('لا يوجد')) {
                renderCustomers(window.customersData || []);
            }
        } else {
            customersListContainer.style.display = 'none';
            loadCustomersBtn.innerHTML = 'إظهار بيانات العملاء 📂';
            loadCustomersBtn.style.background = 'var(--secondary)';
        }
    });
}

let searchCustomerBtn = document.getElementById('searchCustomerBtn');
let customerSearchInput = document.getElementById('customerSearchInput');
if (searchCustomerBtn && customerSearchInput) {
    searchCustomerBtn.addEventListener('click', () => {
        let keyword = customerSearchInput.value.trim().toLowerCase();
        if (keyword === "") {
            renderCustomers(window.customersData || []);
        } else {
            let filtered = (window.customersData || []).filter(c => 
                c.name.toLowerCase().includes(keyword) || c.phone.toString().includes(keyword)
            );
            renderCustomers(filtered);
        }
    });
    customerSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchCustomerBtn.click();
    });
}
