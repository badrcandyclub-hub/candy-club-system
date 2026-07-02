// ==========================================
// 🌐 العقل المدبر - سيستم كاندي كلوب (النسخة V13.6 - الشاملة والمحصنة)
// ==========================================

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwi24io7fKY7nizjIutPBpQvZHBx1O28_hu91QVcdF7PLFqTJ48dNJqFPdbqRuGDKI3Uw/exec";

// ==========================================
// 1. نظام الإشعارات (Toasts) وقفل الأزرار (Loading) والصوتيات
// ==========================================
const orderAudio = new Audio('صوت اوردر.mp3');

function playOrderSound() {
    let playPromise = orderAudio.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.log('Audio play failed (maybe needs user interaction):', e);
            customAlert("🔔 يوجد أوردر جديد قيد التجهيز! \n\n(تنبيه: المتصفح منع تشغيل الصوت. يرجى الضغط في أي مكان في الشاشة لتفعيل الصوت للأوردرات القادمة)");
        });
    }
}

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

        // Load expiry data every time the tab is opened, with a custom loading screen
        if (btn.getAttribute('data-target') === 'expiry-tab') {
            let overlay = document.getElementById('expiry-loading-overlay');
            if (!overlay) {
                // Create overlay dynamically if it doesn't exist to bypass HTML caching
                overlay = document.createElement('div');
                overlay.id = 'expiry-loading-overlay';
                overlay.style.cssText = 'display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.95); z-index: 1000; flex-direction: column; justify-content: center; align-items: center; border-radius: 15px; backdrop-filter: blur(5px);';
                overlay.innerHTML = `
                    <div style="border: 6px solid #f3f3f3; border-top: 6px solid #2980b9; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite;"></div>
                    <h3 style="color: #2c3e50; margin-top: 20px; font-weight: bold;">جاري سحب بيانات الصلاحيات...</h3>
                    <p style="color: #7f8c8d; font-size: 0.95rem;">يرجى الانتظار، لا تقم بالخروج من الصفحة</p>
                    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                `;
                const expiryTab = document.getElementById('expiry-tab');
                if (expiryTab) {
                    expiryTab.style.position = 'relative';
                    expiryTab.insertBefore(overlay, expiryTab.firstChild);
                }
            }
            if (overlay) overlay.style.display = 'flex';
            
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
// ⭐ Fix: expose on window so ALL functions (printHistoryOrder, shareToWhatsApp) can access it
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

    // ⭐ زرار التحديث السريع
    let quickRefreshBtn = document.getElementById('quickRefreshBtn');
    if (quickRefreshBtn) quickRefreshBtn.addEventListener('click', () => {
        showToast("جاري تحديث البيانات...", "warning");
        loadDataFromServer();
    });

    loadDataFromServer();
    if (typeof updateSuspendedCount === 'function') updateSuspendedCount();
    // ⭐ V14.2: عداد المعلقات يُقرأ من السيرفر مباشرة بعد loadDataFromServer
};

function loadDataFromServer() {
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) { syncStatus.innerText = "جاري التحميل..."; syncStatus.style.color = "#FF8C00"; }

    fetch(`${GOOGLE_SHEETS_URL}?date=${currentFilterDate}`)
        .then(res => res.json())
        .then(data => {
            if (syncStatus) { syncStatus.innerText = "متصل"; syncStatus.style.color = "#00C853"; }

            // ⭐ Play sound on new order arrival
            if (window.isFirstLoad === undefined) {
                window.isFirstLoad = false;
                window.lastFilterDate = currentFilterDate;
            } else {
                if (window.lastFilterDate === currentFilterDate) {
                    let oldHistoryIds = (window.orderHistoryData || []).map(o => o.id);
                    let newHistory = data.history || [];
                    
                    // تشغيل الصوت فقط إذا نزل الأوردر في السجل وكانت حالته "قيد التجهيز"
                    let hasNewProcessing = newHistory.some(o => 
                        !oldHistoryIds.includes(o.id) && 
                        o.status && o.status.includes("تجهيز")
                    );

                    if (hasNewProcessing) {
                        playOrderSound();
                    }
                }
                window.lastFilterDate = currentFilterDate;
            }

            orderHistoryData = data.history || [];
            window.orderHistoryData = orderHistoryData; // ⭐ keep window ref in sync
            window.pendingOrdersData = data.pendingOrders || [];
            window.suspendedOrdersData = data.suspendedOrders || [];
            updateSuspendedCount(); // ⭐ V14.2: تحديث العداد من السيرفر بعد كل تحميل
            window.financialsData = data.financials || [];
            window.uncollectedOrdersData = data.uncollectedOrders || [];
            // ⭐ V15.1: تخزين بيانات العملاء فقط بدون عرضها تلقائياً (Lazy)
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
            if (govSelect) govSelect.innerHTML = '<option value="">اختر من القائمة</option>';
            shippingData = {};

            const renderZoneItem = (z, zoneType, container) => {
                shippingData[z.name] = z;
                if (container) {
                    let specialClass = z.type === 'next_day' ? 'zone-next-day' : '';
                    container.innerHTML += `
                        <div class="data-row ${specialClass}" style="display: flex; justify-content: space-between; align-items: center; background: var(--white); padding: 10px; border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                            <div style="text-align:right;">
                                <strong style="color: var(--text-main); font-size: 0.95rem;">${z.name}</strong><br>
                                <span class="price-badge" style="margin-top: 5px; display: inline-block;">${z.price} ج.م</span> 
                                <small style="color:var(--text-muted); margin-right: 5px; font-weight: bold;">${z.duration}</small>
                            </div>
                            <div style="display:flex; flex-direction: column; gap:5px;">
                                <button type="button" class="btn-outline interactive-btn" style="padding: 4px 10px; font-size:0.8rem; border-radius: 6px;" onclick="editZoneUI('${z.name}', '${z.price}', '${z.type}', '${z.duration}')">تعديل ✏️</button>
                                <button type="button" class="interactive-btn" style="padding: 4px 10px; font-size:0.8rem; background:var(--danger); color:white; border:none; border-radius:6px;" onclick="deleteItem('deleteShipping', '${z.name}', '${zoneType}')">حذف ❌</button>
                            </div>
                        </div>`;
                }
            };

            if (data.alex && data.alex.length > 0) {
                data.alex.forEach(z => renderZoneItem(z, 'alex', zonesAlexList));
            }
            if (data.govs && data.govs.length > 0) {
                data.govs.forEach(z => renderZoneItem(z, 'govs', zonesGovList));
            }

            window.latestServerData = data;
            window.updateGovernoratesDropdown();
            if (govSelect && currentGov) govSelect.value = currentGov;

            const driverSelect = document.getElementById('driverNameSelect');
            const driversDisplayList = document.getElementById('driversDisplayList');
            const assignDriverSelect = document.getElementById('assignDriverSelect');
            const closeDriverSelect = document.getElementById('closeDriverSelect');

            if (driversDisplayList) driversDisplayList.innerHTML = '';
            if (driverSelect) driverSelect.innerHTML = '<option value="">اختر المندوب</option>';
            if (assignDriverSelect) assignDriverSelect.innerHTML = '<option value="">اختر المندوب</option>';
            if (closeDriverSelect) closeDriverSelect.innerHTML = '<option value="">اختر المندوب</option>';

            if (data.couriers && data.couriers.length > 0) {
                let driverSelectHtml = '<option value="">اختر المندوب</option>';
                let displayListHtml = '';
                
                data.couriers.forEach(c => {
                    driverSelectHtml += `<option value="${c.name}">${c.name}</option>`;
                    displayListHtml += `
                        <div class="data-row" style="display: flex; flex-direction: column; gap: 10px; background: var(--white); padding: 12px; border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); text-align: center;">
                            <div>
                                <strong style="color: var(--primary); font-size: 1.05rem;">🛵 ${c.name}</strong><br>
                                <span class="phone-badge" style="margin-top: 5px; display: inline-block;">📱 ${c.phone}</span>
                            </div>
                            <div style="display:flex; justify-content: space-between; gap:5px; width: 100%;">
                                <button type="button" class="btn-outline interactive-btn" style="flex: 1; padding: 6px; font-size:0.8rem; border-radius: 6px;" onclick="editDriverUI('${c.name}', '${c.phone}')">تعديل ✏️</button>
                                <button type="button" class="interactive-btn" style="flex: 1; padding: 6px; font-size:0.8rem; background:var(--danger); color:white; border:none; border-radius:6px;" onclick="deleteItem('deleteDriver', '${c.name}')">حذف ❌</button>
                            </div>
                        </div>`;
                });
                
                if (driverSelect) driverSelect.innerHTML = driverSelectHtml;
                if (assignDriverSelect) assignDriverSelect.innerHTML = driverSelectHtml;
                if (closeDriverSelect) closeDriverSelect.innerHTML = driverSelectHtml;
                if (driversDisplayList) driversDisplayList.innerHTML = displayListHtml;
            }

            const smartProductsList = document.getElementById('smartProductsList');
            if (smartProductsList) {
                let smartHtml = '';
                catalogData.forEach(p => { smartHtml += `<option value="${p.name}">`; });
                smartProductsList.innerHTML = smartHtml;
            }

            const modSelect = document.getElementById('moderatorSelect');
            let currentMod = modSelect ? modSelect.value : "";
            const modsList = document.getElementById('moderatorsList');
            
            if (data.moderators && data.moderators.length > 0) {
                let modSelectHtml = '<option value="">اختر اسمك</option>';
                let modsListHtml = '';
                
                data.moderators.forEach(m => {
                    modSelectHtml += `<option value="${m}">${m}</option>`;
                    modsListHtml += `
                        <div class="data-row" style="align-items:center; padding:5px;">
                            <span style="flex:1;">👤 ${m}</span>
                            <button type="button" class="interactive-btn" style="padding: 4px 8px; font-size:0.8rem; background:var(--danger); color:white; border:none; border-radius:8px;" onclick="deleteItem('deleteModerator', '${m}')">❌</button>
                        </div>`;
                });
                
                if (modSelect) modSelect.innerHTML = modSelectHtml;
                if (modsList) modsList.innerHTML = modsListHtml;
            } else {
                if (modSelect) modSelect.innerHTML = '<option value="">اختر اسمك</option>';
                if (modsList) modsList.innerHTML = '<p class="empty-msg">لا يوجد كاشيرية مسجلين</p>';
            }
            if (modSelect && currentMod) modSelect.value = currentMod;

            // ⭐ V15.1: إحصائيات اليوم (today) - تم استبدالها بالمنطق المحلي في updateAdvancedDashboard لحل مشكلة الإكسيل

            // ⭐ إذا لم يكن المستخدم قد اختار شهراً معيناً للتقرير، نعرض إحصائيات الشهر الحالي في المربعات
            let reportMonthFilter = document.getElementById('reportMonthFilter');
            if (!reportMonthFilter || !reportMonthFilter.value) {
                if (document.getElementById('monthSales')) document.getElementById('monthSales').innerText = data.monthSales || 0;
                if (document.getElementById('monthCount')) document.getElementById('monthCount').innerText = data.monthOrderCount || 0;
                if (document.getElementById('completedMonthCount')) document.getElementById('completedMonthCount').innerText = data.completedMonthCount || 0;
                if (document.getElementById('returnedCount')) document.getElementById('returnedCount').innerText = data.returnedCount || 0;
            }

            // ⭐ ملء فلتر الشهور في التقارير تلقائياً
            buildMonthFilterOptions();

            // ⭐ المبكر هينت: عشان اللي فاتح التقارير يتحدث داتاه تلقائياً
            window.latestServerData = data;

            // ⭐ أخفي الأوردرات المشحونة حتى يتم اختيار المندوب
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
        let netDue = parseFloat(f.netDue) || 0;
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
            <div class="${cardClass}" style="background: #fff; padding: 15px; border-radius: 12px; border: 1px solid ${cardBorderColor}; margin-bottom: 12px; box-shadow: ${cardShadow}; opacity: ${cardOpacity}; transition: all 0.3s ease;">
                <div class="financial-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #f0f0f0; padding-bottom:8px; margin-bottom:10px;">
                    <span style="font-weight:bold; font-size:1.1rem; color:var(--text-dark);">🛵 ${f.name}</span>
                    <span style="font-size: 0.85rem; background:#f0f0f0; color:var(--text-dark); padding:3px 8px; border-radius:12px; font-weight:bold;">${f.ordersCount || 0} طلب</span>
                </div>
                <div class="financial-details" style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:10px;">
                    <span style="background:#e8f4f8; padding:5px 10px; border-radius:6px; color:#555;">الكاش: <strong style="color:#2980b9;">${f.cashCollected || 0}</strong> ج</span>
                    <span style="background:#f9ebea; padding:5px 10px; border-radius:6px; color:#555;">الشحن: <strong style="color:#c0392b;">${f.shippingFees || 0}</strong> ج</span>
                </div>
                <div class="financial-status" style="background: ${statusColor}15; color: ${statusColor}; padding: 8px; border-radius: 6px; text-align:center; font-weight:bold; border: 1px dashed ${statusColor};">
                    ${f.statusText || "لا توجد مديونية"} ${netDue !== 0 ? `( ${Math.abs(netDue)} ج.م )` : ''}
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

    customConfirm(msg, () => {
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
    govSelect.innerHTML = '<option value="">اختر من القائمة</option>';

    if (type === 'gov_shipping') {
        if (data.govs && data.govs.length > 0) {
            let optgroup = document.createElement('optgroup'); optgroup.label = "🚚 المحافظات";
            data.govs.forEach(z => {
                optgroup.innerHTML += `<option value="${z.name}">${z.name} (${z.price} ج)</option>`;
            });
            govSelect.appendChild(optgroup);
        }
    } else {
        if (data.alex && data.alex.length > 0) {
            let optgroup = document.createElement('optgroup'); optgroup.label = "⛓ مناطق الإسكندرية";
            data.alex.forEach(z => {
                optgroup.innerHTML += `<option value="${z.name}">${z.name} (${z.price} ج)</option>`;
            });
            govSelect.appendChild(optgroup);
        }
    }

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
                let pType = pOrder.orderType || pOrder.type || pOrder.deliveryType || "";
                let dateHtml = `<span style="color: #e74c3c; font-weight: bold; font-size:0.85rem;">📅 ${pOrder.date}</span>`;
                if (pType.includes('حجز') || pType === 'special_date') {
                    let resDate = pOrder.reservationDate || pOrder.expectedDate || pOrder.specialDate || pOrder.spDate;
                    if (resDate) {
                        if (resDate.toString().includes('GMT') || resDate.toString().includes('توقيت')) {
                            let d = new Date(resDate);
                            if (!isNaN(d.getTime())) resDate = `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
                        }
                        dateHtml = `<span style="color: #fff; background: #c2185b; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size:0.9rem;">🗓️ تسليم: ${resDate}</span>`;
                    }
                }
                pendingDiv.innerHTML += `
                    <div class="history-item" style="border-right-color: #e74c3c; background: #fff5f5;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <strong style="font-size: 1.05rem;">${pOrder.id} | ${pOrder.name}</strong>
                            ${dateHtml}
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

        let typeBadge = '';
        let oType = order.orderType || order.type || order.deliveryType || "";
        if (oType.includes('توصيل منزلي') || oType === 'normal') {
            typeBadge = `<span style="background: #e3f2fd; color: #1565c0; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 5px;">🚚 توصيل منزلي</span>`;
        } else if (oType.includes('استلام من الفرع') || oType === 'branch') {
            typeBadge = `<span style="background: #e8f5e9; color: #2e7d32; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 5px;">🏪 استلام من الفرع</span>`;
        } else if (oType.includes('محافظات') || oType === 'gov_shipping') {
            typeBadge = `<span style="background: #fff3e0; color: #e65100; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 5px;">📦 شحن محافظات</span>`;
        } else if (oType.includes('حجز') || oType === 'special_date') {
            let resDate = order.reservationDate || order.expectedDate || order.bookingDate || order.specialDate || order.spDate || order.date;
            if (resDate && (resDate.toString().includes('GMT') || resDate.toString().includes('توقيت'))) {
                let d = new Date(resDate);
                if (!isNaN(d.getTime())) resDate = `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
            }
            let dateText = resDate ? `تسليم: ${resDate}` : 'حجز مسبق';
            typeBadge = `<span style="background: #c2185b; color: #fff; padding: 3px 8px; border-radius: 6px; font-size: 0.85rem; margin-right: 5px; font-weight: bold;">🗓️ ${dateText}</span>`;
        }

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 8px; align-items: center;">
                <strong style="font-size: 1.05rem;">${order.id} | ${order.name} ${typeBadge}</strong>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="interactive-btn" onclick="shareToWhatsAppGroup('${order.id}')" style="background:none; border:none; font-size:1.3rem; cursor:pointer;" title="مشاركة للجروب">📱</button>
                    <button class="interactive-btn" onclick="printHistoryOrder('${order.id}')" style="background:none; border:none; cursor:pointer;" title="طباعة الفاتورة">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-dark);"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    </button>
                    <span style="background: ${statusColor}15; color: ${statusColor}; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">${order.status}</span>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.9rem; color: #666; background: var(--bg-body); padding: 8px; border-radius: 6px;">
                <span>⏰ ${order.time || '--'}</span>
                <span>📱 ${order.phone}${((order.phone2 || order.secondPhone || order.backupPhone || order.altPhone || order.customerPhone2 || order.otherPhone) && String(order.phone2 || order.secondPhone || order.backupPhone || order.altPhone || order.customerPhone2 || order.otherPhone).trim() !== '') ? ' | 📱 ' + String(order.phone2 || order.secondPhone || order.backupPhone || order.altPhone || order.customerPhone2 || order.otherPhone).trim() : ''}</span>
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

window.printHistoryOrder = function (orderId) {
    // ⭐ Fix: String() comparison to prevent type mismatch (string vs number)
    let findFn = o => String(o.id) === String(orderId);
    let order = (window.orderHistoryData || []).find(findFn) ||
        (window.searchResultsCache || []).find(findFn) ||
        (window.pendingOrdersData || []).find(findFn) ||
        (window.suspendedOrdersData || []).find(findFn) ||
        (window.uncollectedOrdersData || []).find(findFn);

    if (!order) {
        customAlert("⚠️ خطأ: لم يتم العثور على بيانات الطلب للطباعة.");
        // ⭐ Debug: log all available IDs to help trace mismatch
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
        // ⭐ V15.0: تطبيع النص - إزالة "عادي" من "توصيل منزلي عادي"
        let typeStr = (order.orderType || "أوردر توصيل").replace("توصيل منزلي عادي", "توصيل منزلي");
        let govStr = order.gov ? order.gov + " - " : "";
        document.getElementById('receipt-type').innerText = isOldGift ? `${govStr}${typeStr} - 🎁 هدية` : `${govStr}${typeStr}`;
    }
    if (document.getElementById('print-date')) document.getElementById('print-date').innerText = order.date || new Date().toLocaleDateString('ar-EG');
    if (document.getElementById('print-time')) document.getElementById('print-time').innerText = order.time || '';

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

    // ⭐ V14.2: إخفاء العنوان للفرع برمجياً - لا يطبع العنوان نهائياً
    let printAddressRow = document.querySelector('.print-address-row');
    if (isBranch) {
        if (printAddressRow) printAddressRow.style.display = 'none';
        if (document.getElementById('print-address')) document.getElementById('print-address').innerText = '';
    } else {
        if (printAddressRow) printAddressRow.style.display = '';
        if (document.getElementById('print-address')) document.getElementById('print-address').innerText = order.address || order.customerAddress || '';
    }

    let printItemsHtml = "";
    if (order.products) {
        let lines = order.products.split('\n');
        lines.forEach(line => {
            if (line.trim() !== "") {
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

    if (document.getElementById('print-subtotal')) document.getElementById('print-subtotal').innerText = isOldGift ? "***" : (order.subtotal || order.total || 0);
    if (document.getElementById('print-discount')) document.getElementById('print-discount').innerText = isOldGift ? "***" : (order.discount || 0);

    // ⭐ V15.0: إخفاء سطر الشحن لطلبات استلام الفرع نهائياً
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

    let isGovShipping = oTypeStr === 'gov_shipping' || oTypeStr.includes('محافظات') || dTypeStr === 'gov_shipping' || oTypeStr.includes('شحن');
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
        
        <input type="number" class="product-offer-input" placeholder="عرض" style="flex:0.8; text-align:center;" ${rOnly}>

        <input type="number" class="product-qty-input" placeholder="الكمية" value="${qtyVal}" min="1" required style="flex:1; text-align:center;" ${rOnly}>
        <button type="button" class="btn-confirm-pro interactive-btn" style="flex: 0 0 36px;">✔️</button>
        <button type="button" class="remove-product-btn interactive-btn" style="flex: 0 0 36px;">❌</button>
    `;

    wrapper.appendChild(div);
    productsContainer.appendChild(wrapper);

    let nameInput = div.querySelector('.product-name-input');
    let priceInput = div.querySelector('.product-price-input');
    let offerInput = div.querySelector('.product-offer-input');
    let qtyInput = div.querySelector('.product-qty-input');
    let confirmBtn = div.querySelector('.btn-confirm-pro');
    let removeBtn = div.querySelector('.remove-product-btn');

    if (isConfirmed) confirmBtn.innerHTML = "✏️";

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
            confirmBtn.innerHTML = "✏️";
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

        // ⭐ V14.2: Timestamp-based ID لمنع التكرار نهائياً
        let draftId = "CANDY-" + Date.now().toString().slice(-5);
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
            showToast("تأكيد طريقة الدفع 🔒", "error"); 
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
                if (typeof window.hideLoading === 'function') window.hideLoading();
                if (typeof window.playRegisterBeep === 'function') window.playRegisterBeep();
                showToast("✅ تم حفظ الأوردر بنجاح!", "success");

                let isGovShipping = orderTypeLabel === 'gov_shipping' || orderTypeLabel.includes('محافظات') || delType === 'gov_shipping';
                if (isGovShipping) {
                    document.body.classList.add('print-gov-shipping');
                } else {
                    document.body.classList.remove('print-gov-shipping');
                }

                let govStr = gov ? gov + " - " : "";
                if (document.getElementById('receipt-type')) document.getElementById('receipt-type').innerText = isGift ? `${govStr}${orderTypeLabel} - 🎁 هدية` : `${govStr}${orderTypeLabel}`;

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
                showToast("❌ خطأ في الاتصال بالإنترنت", "error");
                setBtnLoading(saveAndPrintBtn, false, "💾 حفظ وطباعة الفاتورة");
            });
    });
}

// ==========================================
// 10. الإضافة، التعديل، والحذف 
// ==========================================

window.deleteItem = function (action, name, zoneType = '') {
    customConfirm(`هل أنت متأكد من حذف (${name}) نهائياً؟`, () => {
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
        const pendingOrders = window.pendingOrdersData.filter(o => o.orderType !== 'استلام من الفرع' && (!o.orderType || !o.orderType.includes('حجز')));
        const resOrders = window.pendingOrdersData.filter(o => o.orderType && o.orderType.includes('حجز'));

        // ⭐ Update Reservations Badge
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
                shortAddress = o.address.split(/[-،,\n]/)[0].trim();
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
                            <div class="soc-info-item highlight">📱 ${o.phone}</div>
                            <div class="soc-info-item money">💰 ${o.total} ج.م</div>
                            <div class="soc-info-item">📍 ${shortAddress}</div>
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
                        <div class="sac-date">📅 ${o.date || 'حجز'}</div>
                        <div class="sac-phone">📱 ${o.phone}</div>
                        <div class="sac-total">الإجمالي: ${o.total}ج</div>
                        <div class="sac-remain">المتبقي: ${o.remaining}ج</div>
                    </div>
                    <div class="sac-actions">
                        <button class="sac-btn-deliver interactive-btn" onclick="settleBranchOrder('${o.id}', this)">تم التسليم ✅</button>
                        <button class="sac-btn-convert interactive-btn" onclick="convertToNormalDelivery('${o.id}', this)">تحويل لعادي 🚚</button>
                    </div>
                </div>`;
        });
    }

    // ⭐ قسم أوردرات الفرع (المنفصلة تماماً عن المندوبين)
    if (branchContainer) {
        const branchOrders = window.pendingOrdersData.filter(o => o.orderType === 'استلام من الفرع');

        // ⭐ Update Branch Badge
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
                        <div class="sac-phone">📱 ${o.phone}</div>
                        <div class="sac-total">الإجمالي: ${o.total}ج</div>
                        <div class="sac-remain">المتبقي: ${o.remaining}ج</div>
                    </div>
                    <div class="sac-actions">
                        <button class="sac-btn-deliver interactive-btn" style="width: 100%;" onclick="settleBranchOrder('${o.id}', this)">تم تسليم الفرع ✅</button>
                    </div>
                </div>`;
        });
    }

    // ⭐ Update Out Orders Badge
    const outOrdersBadge = document.getElementById('outOrdersCountBadge');
    if (outOrdersBadge && window.latestServerData && window.latestServerData.shippedOrders) {
        let outCount = window.latestServerData.shippedOrders.length;
        outOrdersBadge.innerText = `الاوردرات في الخارج حالياً: ${outCount}`;
        outOrdersBadge.style.display = 'inline-block';
    }
}

// ⭐ دالة تسليم الفرع الفورية
window.settleBranchOrder = function (orderId, btn) {
    let order = window.pendingOrdersData.find(o => o.id === orderId);
    customSinglePrompt('الرجاء إدخال المبلغ المدفوع لاستلام الفرع:', order ? order.remaining : 0, (amountPaidText) => {
        if (!amountPaidText) return;

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
    });
};

// ⭐ دالة تحويل الحجز لتوصيل عادي
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
                showToast("✅ تم التحويل لتوصيل فوري بنجاح!", "success");
                loadDataFromServer();
            }).catch(() => setBtnLoading(btn, false, "تحويل لتوصيل عادي 🚚"));
    });
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

        shippedContainer.innerHTML = '<p class="empty-msg">⏳ جاري تحميل عهدة المندوب...</p>';

        // ⭐ Fix: استخدام shippedOrders المرسلة من الإكسيل مباشرة
        let shippedOrders = [];
        if (window.latestServerData && window.latestServerData.shippedOrders) {
            shippedOrders = window.latestServerData.shippedOrders.filter(o => o.driver === driver);
        }

        if (shippedOrders.length === 0) {
            shippedContainer.innerHTML = '<p class="empty-msg">لا توجد أوردرات في الشحن لهذا المندوب حالياً.</p>';
        } else {
            renderDriverShippedOrders(shippedOrders, shippedContainer);
        }
    });
}

// ⭐ دالة مساعدة لعرض أوردرات المندوب المشحونة
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
                            <div class="soc-info-item highlight">📱 ${o.phone}</div>
                            <div class="soc-info-item remaining">💰 عهدة: ${o.remaining} ج.م</div>
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

    // ⭐ Fix: استخدام التاريخ المحلي بدل UTC لتجنب مشكلة الـ timezone
    let now = new Date();
    let todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    let monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    let allOrders = window.orderHistoryData || [];

    let todayOrdersCount = 0;
    let todaySalesTotal = 0;

    // ⭐ Fix: دمج كل مصادر البيانات للحصول على صورة شاملة (لليوم فقط)
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

    // ⭐ حساب العهدة الإجمالية من البيانات المالية (من الإكسيل مباشرة)
    let moneyWithDrivers = 0;
    if (window.latestServerData && window.latestServerData.financials) {
        window.latestServerData.financials.forEach(f => {
            moneyWithDrivers += parseFloat(f.inTransit) || 0;
        });
    }

    // عرض الإحصائيات الأساسية
    if (document.getElementById('moneyWithDrivers')) document.getElementById('moneyWithDrivers').innerText = moneyWithDrivers;

    // ⭐ تحديث إحصائيات اليوم محلياً بشكل صحيح
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

// ⭐ V15.1: بناء قائمة الشهور لفلتر التقارير - شهور فيها بيانات فقط
function buildMonthFilterOptions() {
    let sel = document.getElementById('reportMonthFilter');
    if (!sel) return;
    let currentVal = sel.value;
    sel.innerHTML = '<option value="">اختر الشهر</option>';
    let arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    // ⭐ Fix: جمع كل الشهور الفعلية من البيانات المتاحة
    let availableMonths = new Set();
    let allDataSources = [
        ...(window.orderHistoryData || []),
        ...(window.pendingOrdersData || []),
        ...(window.uncollectedOrdersData || [])
    ];

    allDataSources.forEach(o => {
        let d = (o.date || "").slice(0, 7); // "2026-05"
        if (d && d.length === 7 && d.includes('-')) availableMonths.add(d);
    });

    // ⭐ Fix: إضافة الشهر الحالي دائماً (بدون toISOString)
    let now = new Date();
    let currentMonthVal = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    availableMonths.add(currentMonthVal);

    // ترتيب الشهور من الأحدث للأقدم
    let sortedMonths = Array.from(availableMonths).sort().reverse();

    sortedMonths.forEach(monthVal => {
        let [yr, mo] = monthVal.split('-');
        let moIdx = parseInt(mo) - 1;
        if (moIdx < 0 || moIdx > 11) return;
        let label = arabicMonths[moIdx] + ' ' + yr;
        let opt = document.createElement('option');
        opt.value = monthVal;
        opt.textContent = monthVal === currentMonthVal ? label + ' (الحالي)' : label;
        sel.appendChild(opt);
    });
    if (currentVal) sel.value = currentVal;
}

// ⭐ V15.1: عرض تقرير شهر محدد - يجلب من السيرفر
function renderReportForMonth(targetMonth) {
    let statusEl = document.getElementById('reportFilterStatus');
    let topEl = document.getElementById('topProductsList');
    let pltEl = document.getElementById('platformStatsList');
    if (!targetMonth) {
        if (statusEl) statusEl.textContent = '⚠️ اختر شهراً أولاً';
        return;
    }
    if (statusEl) statusEl.textContent = '⏳ جاري تحميل بيانات الشهر...';
    if (topEl) topEl.innerHTML = '<p class="empty-msg">⏳ جاري التحميل...</p>';
    if (pltEl) pltEl.innerHTML = '<p class="empty-msg">⏳ جاري التحميل...</p>';

    let fetchDate = targetMonth + '-01';
    fetch(`${GOOGLE_SHEETS_URL}?date=${fetchDate}`)
        .then(r => r.json())
        .then(data => {
            let arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
            let [yr, mo] = targetMonth.split('-');
            if (statusEl) statusEl.textContent = `✅ تم تحميل بيانات ${arabicMonths[parseInt(mo) - 1]} ${yr}`;

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

            // ⭐ تحديث إحصائيات الشهر في أعلى الصفحة بناءً على الشهر المختار
            if (document.getElementById('monthCount')) document.getElementById('monthCount').innerText = data.monthOrderCount || 0;
            if (document.getElementById('monthSales')) document.getElementById('monthSales').innerText = data.monthSales || 0;
            if (document.getElementById('completedMonthCount')) document.getElementById('completedMonthCount').innerText = data.completedMonthCount || 0;
            if (document.getElementById('returnedCount')) document.getElementById('returnedCount').innerText = data.returnedCount || 0;

            // أداء المنصات - بالترتيب المحدد
            if (pltEl) {
                let raw = data.monthPlatforms || {};
                const ORDER = [
                    { key: 'واتساب', emoji: '💬', color: '#25D366' },
                    { key: 'انستجرام', emoji: '📸', color: '#E1306C' },
                    { key: 'فيسبوك', emoji: '🔵', color: '#1877F2' },
                    { key: 'تيك توك', emoji: '🎵', color: '#010101' },
                ];
                // ⭐ حساب الإجمالي باستخدام includes لتغطية الإيموجي في الشيت
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
            if (statusEl) statusEl.textContent = '❌ حدث خطأ في الاتصال';
            if (topEl) topEl.innerHTML = '<p class="empty-msg">❌ تعذر التحميل</p>';
            if (pltEl) pltEl.innerHTML = '<p class="empty-msg">❌ تعذر التحميل</p>';
        });
}

// ⭐ V15.1: ربط زرار التقارير
let loadReportsBtn = document.getElementById('loadReportsBtn');
if (loadReportsBtn) {
    let reportsVisible = false;
    loadReportsBtn.addEventListener('click', () => {
        let sec = document.getElementById('detailedReportsSection');
        if (!sec) return;
        reportsVisible = !reportsVisible;
        sec.style.display = reportsVisible ? 'block' : 'none';
        loadReportsBtn.textContent = reportsVisible ? '📊 إخفاء التقارير التفصيلية' : '📊 إظهار التقارير التفصيلية';
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
        // ⭐ Fix: String() comparison to prevent type mismatch (string vs number)
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

    // ⭐ V14.2: إصلاح شامل لـ Keys القادمة من الإكسيل - fallback لكل حقل
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
            text += `🗓️ *تاريخ التسليم:* ${resDate}\n`;
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
    currentFilteredCatalog = window.catalogData || [];
    if (catalogSearchQuery.trim() !== "") {
        let q = catalogSearchQuery.trim().toLowerCase();
        currentFilteredCatalog = currentFilteredCatalog.filter(p => p.name.toLowerCase().includes(q));
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
                <button class="btn-outline interactive-btn edit-cat-btn" style="padding:4px; font-size:0.7rem;">تعديل ✏️</button>
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
                    showToast("✅ تم تفعيل العرض", "success");
                    setTimeout(loadDataFromServer, 2000);
                });
            } else {
                window.pushCatalogUpdate(p.name, p.price, newState, currentOffer);
                showToast(newState ? "✅ تم تفعيل العرض" : "❌ تم إيقاف العرض", "success");
                setTimeout(loadDataFromServer, 2000);
            }
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
                <span>🛒 إجمالي الطلبات: <strong style="color: var(--text-dark);">${c.count || 0}</strong> | 💰 إجمالي المدفوعات: <strong style="color: var(--success);">${c.total || 0} ج.م</strong></span><br>
                <span style="font-size: 0.8rem; color: #888;">📅 آخر طلب: ${c.lastDate ? String(c.lastDate).split('T')[0] : '--'}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

let loadCustomersBtn = document.getElementById('loadCustomersBtn');
let customersListContainer = document.getElementById('customersListContainer');
let _customersLoaded = false; // ⭐ V15.1: Lazy flag - لا نحمل إلا عند الطلب

if (loadCustomersBtn && customersListContainer) {
    loadCustomersBtn.addEventListener('click', () => {
        if (customersListContainer.style.display === 'none') {
            customersListContainer.style.display = 'block';
            loadCustomersBtn.innerHTML = '\u0625\u062e\u0641\u0627\u0621 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \ud83d\udcc2';
            loadCustomersBtn.style.background = 'var(--danger)';

            if (!_customersLoaded) {
                // \u2b50 \u0623\u0648\u0644 \u0636\u063a\u0637\u0629: \u0646\u062c\u0644\u0628 \u0645\u0646 \u0627\u0644\u0633\u064a\u0631\u0641\u0631 \u0645\u062e\u0635\u0648\u0635\u0627\u064b
                customersListContainer.innerHTML = '<p class="empty-msg">\u23f3 \u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621...</p>';
                fetch(`${GOOGLE_SHEETS_URL}?action=getCustomers`)
                    .then(r => r.json())
                    .then(data => {
                        let customers = data.customers || window.customersData || [];
                        window.customersData = customers;
                        _customersLoaded = true;
                        renderCustomers(customers);
                    })
                    .catch(() => {
                        // \u0641\u0627\u0644\u0628\u0627\u0643: \u0625\u0630\u0627 \u0641\u0634\u0644 \u0627\u0644\u0637\u0644\u0628 \u0627\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0643\u0627\u0634 \u0627\u0644\u0645\u062d\u0644\u064a
                        renderCustomers(window.customersData || []);
                        _customersLoaded = true;
                    });
            }
        } else {
            customersListContainer.style.display = 'none';
            loadCustomersBtn.innerHTML = '\u0625\u0638\u0647\u0627\u0631 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \ud83d\udcc2';
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

// ==========================================
// 13. ⭐ حماية زر الإكسيل بباسورد
// ==========================================
const EXCEL_SHEET_URL = "https://docs.google.com/spreadsheets/d/1RL9fNadwDxgGMh45beymGbVzv0uQERHnR_bJrvQ8-AM/edit?gid=0#gid=0";
const EXCEL_PASSWORD = "2092006";

let openGoogleSheetBtn = document.getElementById('openGoogleSheetBtn');
let excelPasswordModal = document.getElementById('excelPasswordModal');
let closeExcelPasswordModal = document.getElementById('closeExcelPasswordModal');
let confirmExcelPassword = document.getElementById('confirmExcelPassword');
let excelPasswordInput = document.getElementById('excelPasswordInput');
let passwordError = document.getElementById('passwordError');
let togglePasswordVisibility = document.getElementById('togglePasswordVisibility');

if (openGoogleSheetBtn && excelPasswordModal) {
    openGoogleSheetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        excelPasswordModal.classList.add('active');
        if (excelPasswordInput) {
            excelPasswordInput.value = '';
            excelPasswordInput.focus();
        }
        if (passwordError) passwordError.style.display = 'none';
    });
}

if (closeExcelPasswordModal) {
    closeExcelPasswordModal.addEventListener('click', () => {
        excelPasswordModal.classList.remove('active');
        if (excelPasswordInput) excelPasswordInput.value = '';
        if (passwordError) passwordError.style.display = 'none';
    });
}

if (togglePasswordVisibility && excelPasswordInput) {
    togglePasswordVisibility.addEventListener('click', () => {
        if (excelPasswordInput.type === 'password') {
            excelPasswordInput.type = 'text';
            togglePasswordVisibility.textContent = '🙈';
        } else {
            excelPasswordInput.type = 'password';
            togglePasswordVisibility.textContent = '👁️';
        }
    });
}

function tryExcelPassword() {
    let enteredPassword = excelPasswordInput ? excelPasswordInput.value.trim() : '';
    if (enteredPassword === EXCEL_PASSWORD) {
        showToast("✅ تم التحقق بنجاح، جاري فتح قاعدة البيانات...", "success");
        excelPasswordModal.classList.remove('active');
        if (excelPasswordInput) excelPasswordInput.value = '';
        window.open(EXCEL_SHEET_URL, '_blank');
    } else {
        if (passwordError) passwordError.style.display = 'block';
        let modalContent = excelPasswordModal.querySelector('.excel-password-modal');
        if (modalContent) {
            modalContent.classList.add('shake-animation');
            setTimeout(() => modalContent.classList.remove('shake-animation'), 500);
        }
        if (excelPasswordInput) {
            excelPasswordInput.value = '';
            excelPasswordInput.focus();
        }
    }
}

if (confirmExcelPassword) {
    confirmExcelPassword.addEventListener('click', tryExcelPassword);
}

if (excelPasswordInput) {
    excelPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') tryExcelPassword();
    });
}

// ==========================================
// 14. ⭐ الماسح الضوئي الذكي (Offline Barcode Scanner)
// ==========================================

let barcodeCatalogData = [];
let html5QrcodeScanner = null;

// 1. جلب وتحليل ملف الـ CSV
const toEnglishNumber = str => {
    if (!str) return 0;
    let engStr = String(str).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    return parseFloat(engStr) || 0;
};

function fetchCatalogCSV() {
    fetch('products.csv.csv')
        .then(response => {
            if (!response.ok) throw new Error("لم يتم العثور على ملف products.csv.csv");
            return response.text();
        })
        .then(csvText => {
            let lines = csvText.split('\n');
            barcodeCatalogData = [];

            // تجاهل أول سطر إذا كان عناوين الأعمدة، لكن تحسباً سنقرأ كل السطور
            lines.forEach((line, index) => {
                let cols = line.split(',');
                if (cols.length >= 3) {
                    let barcode = cols[0].trim();
                    let name = cols[1].trim();
                    let price = toEnglishNumber(cols[2].trim()); // إجبار الأرقام الإنجليزية

                    // نتجاهل السطر لو كان فارغ
                    if (barcode && name) {
                        barcodeCatalogData.push({ barcode, name, price });
                    }
                }
            });
            console.log("تم تحميل بيانات الكتالوج للمسح الضوئي: ", barcodeCatalogData.length, "منتج");
        })
        .catch(err => console.error("خطأ في تحميل الكتالوج للباركود:", err));
}

// تشغيل الدالة فور تحميل الصفحة
window.addEventListener('load', fetchCatalogCSV);

// 2. إصدار صوت Beep قصير عند نجاح المسح
function playBeepSound() {
    try {
        let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let oscillator = audioCtx.createOscillator();
        let gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = 800; // تردد الصوت
        gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
        console.warn("Web Audio API غير مدعوم في هذا المتصفح");
    }
}

// 3. فتح وإغلاق النوافذ
let openScannerBtn = document.getElementById('openScannerBtn');
let scannerModal = document.getElementById('scannerModal');
let closeScannerModalBtn = document.getElementById('closeScannerModalBtn');

let scanResultModal = document.getElementById('scanResultModal');
let closeScanResultBtn = document.getElementById('closeScanResultBtn');
let scanAnotherBtn = document.getElementById('scanAnotherBtn');

if (openScannerBtn) {
    openScannerBtn.addEventListener('click', () => {
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

function onScanSuccess(decodedText, decodedResult) {
    stopBarcodeScanner();
    scannerModal.classList.remove('active');
    handleBarcodeMatch(decodedText);
}

function onScanFailure(error) {
    // تتكرر مع كل فريم لا يجد فيه باركود
}

// 5. البحث والتطابق
let currentScannedProduct = null;

function handleBarcodeMatch(barcodeValue) {
    let matchedProduct = barcodeCatalogData.find(p => p.barcode === barcodeValue);

    if (matchedProduct) {
        currentScannedProduct = matchedProduct;
        playBeepSound();

        document.getElementById('scanResultName').textContent = matchedProduct.name;
        // عرض السعر بالإنجليزية القياسية
        document.getElementById('scanResultPrice').textContent = Number(matchedProduct.price);

        scanResultModal.classList.add('active');

        let modalContent = scanResultModal.querySelector('.modal-content');
        modalContent.classList.remove('flash-success');
        void modalContent.offsetWidth; // Trigger reflow
        modalContent.classList.add('flash-success');

    } else {
        showToast("المنتج غير مسجل في قاعدة البيانات ❌", "error");
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
        handleBarcodeMatch(val);
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
            copyProductNameBtn.textContent = "تم النسخ ✅";
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
    const btn = document.getElementById('refreshExpiryBtn');
    if (btn) {
        btn.dataset.origText = btn.innerText;
        btn.innerText = "جاري التحميل ⏳...";
        btn.style.opacity = "0.7";
        btn.style.pointerEvents = "none";
    }

    // Lazy load the expiries from Google Sheets
    fetch(`${GOOGLE_SHEETS_URL}?action=getExpiries`)
        .then(res => res.json())
        .then(data => {
            if (btn) {
                btn.innerText = btn.dataset.origText;
                btn.style.opacity = "1";
                btn.style.pointerEvents = "auto";
            }
            // Assuming data is an array of objects: { id, name, qty, expiryDate, location, receiver, notes, status }
            expiryData = Array.isArray(data) ? data : (data.expiries || []);
            renderExpiryDashboard();
            updateCatalogWithOffers(); // To highlight items on offer in the main cashier view
        })
        .catch(err => {
            if (btn) {
                btn.innerText = btn.dataset.origText;
                btn.style.opacity = "1";
                btn.style.pointerEvents = "auto";
            }
            showToast("❌ حدث خطأ في تحميل الصلاحيات. يرجى مراجعة إعدادات Google Sheets", "error");
            // Also call render to clear the "loading" or show empty states
            renderExpiryDashboard();
        });
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
                uploadLabel.innerHTML = 'جاري الفحص... ⏳';
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
                showToast(`تمت زيادة كمية ${productName} في الفاتورة 🛒`, "success");

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

                showToast(`تمت إضافة ${productName} للفاتورة بنجاح ✅`, "success");

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
window.openExpiryDashboard = function () {
    document.getElementById('expiryDashboardModal').style.display = 'flex';
    loadExpiryData();
};

function loadExpiryData() {
    const btn = document.getElementById('openExpiryBtn');
    if (btn) {
        btn.dataset.origText = btn.innerText;
        btn.innerText = "جاري التحميل ⏳...";
        btn.style.opacity = "0.7";
        btn.style.pointerEvents = "none";
    }

    // Lazy load the expiries from Google Sheets
    fetch(`${GOOGLE_SHEETS_URL}?action=getExpiries`)
        .then(res => res.json())
        .then(data => {
            if (btn) {
                btn.innerText = btn.dataset.origText;
                btn.style.opacity = "1";
                btn.style.pointerEvents = "auto";
            }
            // Assuming data is an array of objects: { id, name, qty, expiryDate, location, receiver, notes, status }
            expiryData = Array.isArray(data) ? data : (data.expiries || []);
            renderExpiryDashboard();
            updateCatalogWithOffers(); // To highlight items on offer in the main cashier view
            
            let overlay = document.getElementById('expiry-loading-overlay');
            if (overlay) overlay.style.display = 'none';
        })
        .catch(err => {
            if (btn) {
                btn.innerText = btn.dataset.origText;
                btn.style.opacity = "1";
                btn.style.pointerEvents = "auto";
            }
            showToast("❌ حدث خطأ في تحميل الصلاحيات. يرجى مراجعة إعدادات Google Sheets", "error");
            // Also call render to clear the "loading" or show empty states
            renderExpiryDashboard();
            
            let overlay = document.getElementById('expiry-loading-overlay');
            if (overlay) overlay.style.display = 'none';
        });
}


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

// Add Item to Cart
const addLedgerItemBtn = document.getElementById('addLedgerItemBtn');
if (addLedgerItemBtn) {
    addLedgerItemBtn.addEventListener('click', () => {
        const name = document.getElementById('ledgerProdName').value;
        const qty = document.getElementById('ledgerProdQty').value;
        const date = document.getElementById('ledgerProdDate').value;
        const location = document.getElementById('ledgerProdLocation').value;
        const notes = document.getElementById('ledgerProdNotes').value;

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
            notes: notes
        };

        ledgerCart.push(item);
        renderLedgerCart();

        document.getElementById('ledgerProdName').value = '';
        document.getElementById('ledgerProdQty').value = '';
        document.getElementById('ledgerProdDate').value = '';
        document.getElementById('ledgerProdLocation').value = '';
        document.getElementById('ledgerProdNotes').value = '';
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
        const regName = document.getElementById('ledgerRegistrarName').value;
        const receiverName = document.getElementById('ledgerReceiverName').value;

        if (!regDate || !regName || !receiverName) {
            showToast("يرجى إدخال تاريخ التسجيل واسم المسجل واسم المستلم في أعلى المحضر.", "warning");
            return;
        }

        // Attach reg info to all items
        const payload = ledgerCart.map(item => Object.assign({}, item, {
            regDate: regDate,
            registrarName: regName,
            receiver: receiverName
        }));

        setBtnLoading(saveLedgerBtn, true, "جاري الحفظ...");

        let formData = new URLSearchParams();
        formData.append('action', 'addExpiriesBatch');
        formData.append('batchData', JSON.stringify(payload));

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("✅ تم حفظ البضاعة بنجاح", "success");
                setBtnLoading(saveLedgerBtn, false);
                ledgerCart = [];
                renderLedgerCart();
                closeLedgerModal();
                loadExpiryData(); // Refresh the dashboard
            }).catch(() => {
                showToast("❌ حدث خطأ في الاتصال", "error");
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
    if (document.getElementById('expExpiredItems')) document.getElementById('expExpiredItems').innerText = countExpired;
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

function updateExpiryPaginationUI() {
    let totalPages = Math.ceil(expiryFilteredData.length / EXPIRY_ITEMS_PER_PAGE) || 1;
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
                title = "📦 إجمالي الأصناف المسجلة";
            } else if (category === 'Offers' && item.status === 'في عرض') {
                matches = true;
                title = "🎁 العروض النشطة";
            } else if (category === 'Search') {
                const searchTerm = document.getElementById('expiryGlobalSearchInput').value.toLowerCase().trim();
                if (item.name && item.name.toLowerCase().includes(searchTerm)) {
                    matches = true;
                    title = `🔍 نتائج البحث عن: "${searchTerm}"`;
                }
            } else if (category === 'Expired' && daysRemaining !== 'NoExpiry' && daysRemaining < 0) {
                matches = true;
                title = "☠️ انتهت الصلاحية";
            } else if (category === 'NoExpiry' && daysRemaining === 'NoExpiry') {
                matches = true;
                title = "♾️ بدون تاريخ صلاحية";
            } else if (category === 'Critical' && daysRemaining !== 'NoExpiry' && daysRemaining >= 0 && daysRemaining < 7) {
                matches = true;
                title = "🔴 حرج جداً (أقل من 7 أيام)";
            } else if (category === 'Alert' && daysRemaining >= 7 && daysRemaining < 30) {
                matches = true;
                title = "🟠 تنبيه سريع (أقل من 30 يوم)";
            } else if (category === 'Attention' && daysRemaining >= 30 && daysRemaining <= 90) {
                matches = true;
                title = "🟡 انتباه ومراقبة (1 إلى 3 شهور)";
            } else if (category === 'Safe' && daysRemaining > 90 && daysRemaining <= 180) {
                matches = true;
                title = "🟢 مخزون آمن (3 إلى 6 شهور)";
            } else if (category === 'Far' && daysRemaining > 180) {
                matches = true;
                title = "🔵 تاريخ بعيد (أكثر من 6 شهور)";
            }

            if (matches) {
                tempFiltered.push(Object.assign({}, item, { daysRemaining: daysRemaining }));
            }
        });
        
        expiryFilteredData = tempFiltered;
        expiryCurrentCategory = category;
        
        currentExportData = expiryFilteredData;
        currentExportCategory = title;
        document.getElementById('detailsTitle').innerText = title;
    }

    const detailsList = document.getElementById('detailsList');

    if (expiryFilteredData.length === 0) {
        detailsList.innerHTML = '<p class="empty-msg">لا توجد أصناف في هذه الفئة.</p>';
        updateExpiryPaginationUI();
    } else {
        detailsList.innerHTML = '';
        
        let totalPages = Math.ceil(expiryFilteredData.length / EXPIRY_ITEMS_PER_PAGE) || 1;
        if (expiryCurrentPage > totalPages) expiryCurrentPage = totalPages;
        if (expiryCurrentPage < 1) expiryCurrentPage = 1;

        // Sliding Window (3 Pages Max)
        let startPage = Math.max(1, expiryCurrentPage - 1);
        let endPage = Math.min(totalPages, expiryCurrentPage + 1);
        
        if (expiryCurrentPage === 1 && totalPages >= 3) { endPage = 3; }
        if (expiryCurrentPage === totalPages && totalPages >= 3) { startPage = totalPages - 2; }

        let startIndex = (startPage - 1) * EXPIRY_ITEMS_PER_PAGE;
        let endIndex = endPage * EXPIRY_ITEMS_PER_PAGE;
        let itemsToShow = expiryFilteredData.slice(startIndex, endIndex);
        
        itemsToShow.forEach(item => {
            let daysColor = "";
            let daysText = "";
            if (item.daysRemaining === 'NoExpiry') {
                daysColor = "#7f8c8d";
                daysText = "بدون تاريخ صلاحية ♾️";
            } else if (item.daysRemaining < 0) {
                daysColor = "#c0392b";
                daysText = `منتهي منذ ${Math.abs(item.daysRemaining)} يوم ☠️`;
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

            detailsList.innerHTML += `
                <div class="${rowClass}" ${activeOfferStyle}>
                    <h4>📦 ${item.name}</h4>
                    <div class="expiry-item-details">
                        <span>الكمية: ${item.qty}</span>
                        <span style="color: ${daysColor}; font-weight: bold;">${daysText}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: #7f8c8d; margin-bottom: 8px;">
                        📅 انتهاء: ${formattedDate} | 🏢 مكان: ${item.location || '-'}
                    </div>
                    ${pricesHtml}
                    <div class="expiry-item-actions">
                        <button class="btn-activate-offer interactive-btn" style="background: ${offerBtnColor};" onclick="${item.status === 'في عرض' ? `changeExpiryStatus('${item.id}', '${offerBtnAction}')` : `promptNewOffer('${item.id}')`}">${offerBtnText}</button>
                        <button class="btn-close-item interactive-btn" onclick="changeExpiryStatus('${item.id}', 'Deleted')">تم البيع ✖️</button>
                    </div>
                </div>
            `;
        });
        
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
            let totalPages = Math.ceil(expiryFilteredData.length / EXPIRY_ITEMS_PER_PAGE);
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
            <button id="btnPromptYes" class="interactive-btn" style="background: var(--success); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1; font-family: 'Cairo', sans-serif;">حفظ ✅</button>
            <button id="btnPromptNo" class="interactive-btn" style="background: var(--danger); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1; font-family: 'Cairo', sans-serif;">إلغاء ❌</button>
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
            <button id="btnConfirmYes" class="interactive-btn" style="background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1;">نعم ✅</button>
            <button id="btnConfirmNo" class="interactive-btn" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1;">إلغاء ❌</button>
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
            <button id="btnPromptYes" class="interactive-btn" style="background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1;">حفظ ✅</button>
            <button id="btnPromptNo" class="interactive-btn" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1;">إلغاء ❌</button>
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
            showToast("✅ تم تحديث العرض والأسعار بنجاح", "success");
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
            showToast("❌ خطأ في الاتصال بالإنترنت", "error");
        });
};

// 3. Status Control (دورة حياة العرض)
window.changeExpiryStatus = function (id, newStatus) {
    let msg = "";
    if (newStatus === 'في عرض') msg = "هل تريد تفعيل العرض وجعل السطر فسفوري؟ 🔥";
    else if (newStatus === 'مش في عرض') msg = "هل تريد إيقاف العرض وإعادته للحالة الطبيعية؟";
    else if (newStatus === 'Deleted') msg = "تحذير: سيتم مسح المنتج بالكامل من النظام ولن يظهر مرة أخرى. هل أنت متأكد من إتمام البيع؟ ✖️";

    customConfirm(msg, () => {
        showToast("جاري التحديث...", "warning");

        let formData = new URLSearchParams();
        formData.append('action', 'updateExpiryStatus');
        formData.append('id', id);
        formData.append('status', newStatus);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("✅ تم تحديث الحالة بنجاح", "success");
                let item = expiryData.find(i => i.id == id);
                if (item) {
                    item.status = newStatus;
                }
                renderExpiryDashboard();
                updateCatalogWithOffers();
                if (document.getElementById('expiryDetailsSection').style.display === 'block') {
                    closeExpiryDetails();
                }
            }).catch(() => {
                showToast("❌ خطأ في الاتصال بالإنترنت", "error");
            });
    });
};

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
        let safeTitle = reportTitle.replace(/[^a-zA-Z0-9أ-ي]/g, '_');
        link.download = `تقرير_${safeTitle}_${new Date().toLocaleDateString('en-CA')}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast("✅ تم تصدير التقرير الاحترافي بنجاح", "success");

    } catch (error) {
        console.error(error);
        showToast("❌ حدث خطأ أثناء التصدير", "error");
    }
}

// Export Current List Button (inside Details Section)
const exportCurrentListBtn = document.getElementById('exportCurrentListBtn');
if (exportCurrentListBtn) {
    exportCurrentListBtn.addEventListener('click', () => {
        setBtnLoading(exportCurrentListBtn, true, "تصدير...");
        generateExcel(currentExportData, currentExportCategory).then(() => {
            setBtnLoading(exportCurrentListBtn, false);
        });
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
            let d = new Date(item.expiryDate);
            if (!isNaN(d.getTime())) {
                let localStr = d.toLocaleDateString('en-CA').substring(0, 7);
                return localStr === monthVal;
            }
            return item.expiryDate.startsWith(monthVal);
        });

        setBtnLoading(btnExportMonth, true, "تصدير...");
        generateExcel(filtered, 'شهر_' + monthVal).then(() => {
            setBtnLoading(btnExportMonth, false);
        });
    });
}

// Export by Registration Date
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
            // Parse the date to avoid timezone shift issues (e.g. 19T22:00:00Z matching 19 instead of 20)
            let d = new Date(item.regDate);
            if (!isNaN(d.getTime())) {
                let localStr = d.toLocaleDateString('en-CA'); // Gets YYYY-MM-DD in local time
                return localStr === dateVal;
            }
            return item.regDate.includes(dateVal);
        });

        setBtnLoading(btnExportDate, true, "تصدير...");
        generateExcel(filtered, 'إدخالات_يوم_' + dateVal).then(() => {
            setBtnLoading(btnExportDate, false);
        });
    });
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
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

window.playSuccessBeep = function() { playBeep(800, 'sine', 0.1, 0.1); };
window.playRegisterBeep = function() {
    playBeep(523.25, 'sine', 0.1, 0.1);
    setTimeout(() => playBeep(659.25, 'sine', 0.15, 0.1), 100);
    setTimeout(() => playBeep(783.99, 'sine', 0.2, 0.1), 250);
};
window.playErrorBeep = function() { playBeep(200, 'square', 0.3, 0.1); };

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

