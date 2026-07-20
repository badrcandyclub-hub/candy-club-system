// ==========================================
// <i class=\'fa-solid fa-globe\'></i> العقل المدبر - سيستم كاندي كلوب (النسخة V13.6 - الشاملة والمحصنة)
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
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        let targetId = btn.getAttribute('data-target');
        let targetElement = document.getElementById(targetId);
        if (targetElement) targetElement.classList.add('active');
        
        // Hide suspended button unless in create-tab
        const suspendedBtn = document.getElementById('openSuspendedBtn');
        if (suspendedBtn) {
            suspendedBtn.style.display = (targetId === 'create-tab') ? 'inline-block' : 'none';
        }

        // Load expiry data every time the tab is opened, with a custom loading screen
        if (btn.getAttribute('data-target') === 'expiry-tab') {
            const expiryBody = document.querySelector('#expiry-tab');
            if (expiryBody) expiryBody.classList.add('skeleton-mode');
            
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
        loadDataFromServer();
    });

    loadDataFromServer();
    if (typeof updateSuspendedCount === 'function') updateSuspendedCount();
    // <i class=\'fa-solid fa-star\'></i> V14.2: عداد المعلقات يُقرأ من السيرفر مباشرة بعد loadDataFromServer
};

function loadDataFromServer(customDate = null) {
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) { syncStatus.innerText = "جاري التحميل..."; syncStatus.style.color = "#FF8C00"; }

    let fetchDate = customDate || currentFilterDate;
    fetch(`${GOOGLE_SHEETS_URL}?date=${fetchDate}`)
        .then(res => res.json())
        .then(data => {
            if (syncStatus) { syncStatus.innerText = "متصل"; syncStatus.style.color = "#00C853"; }

            // <i class=\'fa-solid fa-star\'></i> Play sound on new order arrival
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
            window.orderHistoryData = orderHistoryData; // <i class=\'fa-solid fa-star\'></i> keep window ref in sync
            window.pendingOrdersData = data.pendingOrders || [];
            window.suspendedOrdersData = data.suspendedOrders || [];
            updateSuspendedCount(); // <i class=\'fa-solid fa-star\'></i> V14.2: تحديث العداد من السيرفر بعد كل تحميل
            window.financialsData = data.financials || [];
            window.uncollectedOrdersData = data.uncollectedOrders || [];
            // <i class=\'fa-solid fa-star\'></i> V15.1: تخزين بيانات العملاء فقط بدون عرضها تلقائياً (Lazy)
            window.customersData = data.customers || [];
            window.driversList = data.couriers || [];

            if (typeof renderFinancials === 'function') renderFinancials(window.financialsData);

            catalogData = data.catalog || [];
            
            // <i class=\'fa-solid fa-star\'></i> دمج منتجات Firebase في الكتالوج إذا لم تكن موجودة من الإكسل وإضافة الباركود
            if (barcodeCatalogData.length > 0) {
                const fbMap = new Map();
                barcodeCatalogData.forEach(p => fbMap.set(String(p.name).toLowerCase(), p));

                catalogData.forEach(p => {
                    let fb = fbMap.get(String(p.name).toLowerCase());
                    if (fb) {
                        if (!p.barcode) p.barcode = fb.barcode;
                        p.stock = fb.stock || 0;
                    } else {
                        p.stock = 0;
                    }
                });

                const existingNames = new Set(catalogData.map(p => String(p.name).toLowerCase()));
                barcodeCatalogData.forEach(fbProduct => {
                    if (!existingNames.has(String(fbProduct.name).toLowerCase())) {
                        catalogData.push({
                            name: fbProduct.name,
                            price: fbProduct.price,
                            isOffer: false,
                            offerPrice: 0,
                            barcode: fbProduct.barcode,
                            stock: fbProduct.stock || 0
                        });
                    }
                });
            }
            
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
                        <div class="zone-premium-card ${specialClass}">
                            <div class="zone-info-main">
                                <strong class="zone-title"><i class=\'fa-solid fa-location-dot\'></i> ${z.name}</strong>
                                <div class="zone-details-row">
                                    <span class="price-badge premium-badge"><i class=\'fa-solid fa-money-bill-wave\'></i> ${z.price} ج.م</span> 
                                    <span class="duration-badge">⏱️ ${z.duration}</span>
                                </div>
                            </div>
                            <div class="zone-actions">
                                <button type="button" class="btn-outline interactive-btn" onclick="editZoneUI('${z.name}', '${z.price}', '${z.type}', '${z.duration}')"><span class="btn-text-mobile-hide">تعديل</span> <i class=\'fa-solid fa-pencil\'></i></button>
                                <button type="button" class="btn-danger interactive-btn" onclick="deleteItem('deleteShipping', '${z.name}', '${zoneType}')"><span class="btn-text-mobile-hide">حذف</span> <i class=\'fa-solid fa-xmark\'></i></button>
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
                                <strong style="color: var(--primary); font-size: 1.05rem;"><i class=\'fa-solid fa-motorcycle\'></i> ${c.name}</strong><br>
                                <span class="phone-badge" style="margin-top: 5px; display: inline-block;"><i class=\'fa-solid fa-mobile-screen\'></i> ${c.phone}</span>
                            </div>
                            <div style="display:flex; justify-content: space-between; gap:5px; width: 100%;">
                                <button type="button" class="btn-outline interactive-btn" style="flex: 1; padding: 6px; font-size:0.8rem; border-radius: 6px;" onclick="editDriverUI('${c.name}', '${c.phone}')">تعديل <i class=\'fa-solid fa-pencil\'></i></button>
                                <button type="button" class="interactive-btn" style="flex: 1; padding: 6px; font-size:0.8rem; background:var(--danger); color:white; border:none; border-radius:6px;" onclick="deleteItem('deleteDriver', '${c.name}')">حذف <i class=\'fa-solid fa-xmark\'></i></button>
                            </div>
                        </div>`;
                });
                
                if (driverSelect) driverSelect.innerHTML = driverSelectHtml;
                if (assignDriverSelect) assignDriverSelect.innerHTML = driverSelectHtml;
                if (closeDriverSelect) closeDriverSelect.innerHTML = driverSelectHtml;
                if (driversDisplayList) driversDisplayList.innerHTML = displayListHtml;
            }

            // <i class=\'fa-solid fa-star\'></i> اقتراحات المنتجات تأتي من Firebase بدلاً من الإكسل
            updateSmartSuggestionsFromFirebase();

            const modSelect = document.getElementById('moderatorSelect');
            let currentMod = modSelect ? modSelect.value : "";
            const modsList = document.getElementById('moderatorsList');
            
            if (data.moderators && data.moderators.length > 0) {
                let modSelectHtml = '<option value="">اختر اسمك</option>';
                let modsListHtml = '';
                
                window.allModeratorsList = data.moderators;
                
                data.moderators.forEach(m => {
                    modSelectHtml += `<option value="${m}">${m}</option>`;
                    modsListHtml += `
                        <div class="data-row" style="align-items:center; padding:5px;">
                            <span style="flex:1;"><i class=\'fa-solid fa-user\'></i> ${m}</span>
                            <button type="button" class="interactive-btn" style="padding: 4px 8px; font-size:0.8rem; background:var(--danger); color:white; border:none; border-radius:8px;" onclick="deleteItem('deleteModerator', '${m}')"><i class=\'fa-solid fa-xmark\'></i></button>
                        </div>`;
                });
                
                if (modSelect) modSelect.innerHTML = modSelectHtml;
                if (modsList) modsList.innerHTML = modsListHtml;
            } else {
                if (modSelect) modSelect.innerHTML = '<option value="">اختر اسمك</option>';
                if (modsList) modsList.innerHTML = '<p class="empty-msg">لا يوجد كاشيرية مسجلين</p>';
            }
            if (modSelect && currentMod) modSelect.value = currentMod;

            // <i class=\'fa-solid fa-star\'></i> V15.1: إحصائيات اليوم (today) - تم استبدالها بالمنطق المحلي في updateAdvancedDashboard لحل مشكلة الإكسيل

            // <i class=\'fa-solid fa-star\'></i> إذا لم يكن المستخدم قد اختار شهراً معيناً للتقرير، نعرض إحصائيات الشهر الحالي في المربعات
            let reportMonthFilter = document.getElementById('reportMonthFilter');
            if (!reportMonthFilter || !reportMonthFilter.value) {
                if (document.getElementById('monthSales')) document.getElementById('monthSales').innerText = data.monthSales || 0;
                if (document.getElementById('monthCount')) document.getElementById('monthCount').innerText = data.monthOrderCount || 0;
                if (document.getElementById('completedMonthCount')) document.getElementById('completedMonthCount').innerText = data.completedMonthCount || 0;
                if (document.getElementById('returnedCount')) document.getElementById('returnedCount').innerText = data.returnedCount || 0;
            }

            // <i class=\'fa-solid fa-star\'></i> ملء فلتر الشهور في التقارير تلقائياً
            buildMonthFilterOptions();

            // <i class=\'fa-solid fa-star\'></i> المبكر هينت: عشان اللي فاتح التقارير يتحدث داتاه تلقائياً
            window.latestServerData = data;

            // <i class=\'fa-solid fa-star\'></i> أخفي الأوردرات المشحونة حتى يتم اختيار المندوب
            let shippedCont = document.getElementById('shippedOrdersContainer');
            if (shippedCont) shippedCont.innerHTML = '<p class="empty-msg">برجاء اختيار المندوب والضغط على "عرض العهدة"</p>';

            renderHistoryList(orderHistoryData);
            renderShippingRoom(orderHistoryData);
            updateAdvancedDashboard(orderHistoryData);
            checkBookingAlerts();
            if (typeof renderModeratorsDashboard === 'function') renderModeratorsDashboard();

        }).catch(err => {
            if (syncStatus) { syncStatus.innerText = "خطأ اتصال"; syncStatus.style.color = "red"; }
        });
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
    govSelect.innerHTML = '<option value="">اختر من القائمة</option>';

    if (type === 'gov_shipping') {
        if (data.govs && data.govs.length > 0) {
            let optgroup = document.createElement('optgroup'); 
            optgroup.label = "\uf48b المحافظات";
            optgroup.style.fontFamily = "'Font Awesome 6 Free', 'Cairo', sans-serif";
            optgroup.style.fontWeight = "900";
            data.govs.forEach(z => {
                optgroup.innerHTML += `<option value="${z.name}">${z.name} (${z.price} ج)</option>`;
            });
            govSelect.appendChild(optgroup);
        }
    } else {
        if (data.alex && data.alex.length > 0) {
            let optgroup = document.createElement('optgroup'); 
            optgroup.label = "\uf0c1 مناطق الإسكندرية";
            optgroup.style.fontFamily = "'Font Awesome 6 Free', 'Cairo', sans-serif";
            optgroup.style.fontWeight = "900";
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
                    container.innerHTML = '<p class="empty-msg"><i class=\'fa-solid fa-xmark\'></i> حدث خطأ في الاتصال بالإنترنت.</p>';
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
            fetch(`${GOOGLE_SHEETS_URL}?action=globalSearch&query=${phoneVal}`)
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
            let div = document.createElement('div'); div.className = 'data-row'; div.style.alignItems = 'center';
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
            if (d.prods.length > 0) d.prods.forEach(p => addProductRow(p.name, p.price, p.qty, p.confirmed, p.offer || ""));
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
    if (paymentMethod) { paymentMethod.classList.remove('locked-field'); paymentMethod.disabled = false; }
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

window.deleteItem = function (action, name, zoneType = '') {
    customConfirm(`هل أنت متأكد من حذف (${name}) نهائياً؟`, () => {
        let formData = new URLSearchParams();
        formData.append('action', action);
        formData.append('name', name);
        if (zoneType) formData.append('zoneType', zoneType);

        showToast("<i class=\'fa-solid fa-hourglass-half\'></i> جاري الحذف...", "warning");
        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("<i class=\'fa-solid fa-check\'></i> تم الحذف بنجاح!", "success");
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
        const pendingOrders = window.pendingOrdersData.filter(o => o.orderType !== 'استلام من الفرع' && (!o.orderType || !o.orderType.includes('حجز') || o.status === 'قيد التجهيز' || o.status === 'في الشحن'));
        const resOrders = window.pendingOrdersData.filter(o => o.orderType && o.orderType.includes('حجز') && o.status !== 'قيد التجهيز' && o.status !== 'في الشحن' && o.status !== 'تم التوصيل ومُحاسب');

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

        // <i class=\'fa-solid fa-star\'></i> Fix: استخدام shippedOrders المرسلة من الإكسيل مباشرة
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

    let allOrders = window.orderHistoryData || [];

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

    // <i class=\'fa-solid fa-star\'></i> Fix: جمع كل الشهور الفعلية من البيانات المتاحة
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

    // <i class=\'fa-solid fa-star\'></i> Fix: إضافة الشهر الحالي دائماً (بدون toISOString)
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
        div.style.alignItems = 'center';
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
    let vipCount = allData.filter(c => (parseInt(c.visits) || 0) >= 3).length;
    let totalOrders = allData.reduce((sum, c) => sum + (parseInt(c.count) || 0), 0);

    if(dashTotalCustomers) dashTotalCustomers.innerText = allData.length;
    if(dashVipCustomers) dashVipCustomers.innerText = vipCount;
    if(dashTotalOrders) dashTotalOrders.innerText = totalOrders;

    if (customersList.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;"><i class=\'fa-solid fa-box-open\' style=\'font-size: 3rem; margin-bottom: 10px;\'></i><p>لا يوجد عملاء مطابقين للبحث.</p></div>';
        return;
    }

    customersList.forEach(c => {
        let div = document.createElement('div');
        let isVip = (parseInt(c.visits) || 0) >= 3;
        div.className = 'dash-card';
        div.style.cssText = `background: white; border-radius: 12px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border-top: 4px solid ${isVip ? '#f1c40f' : 'var(--primary)'}; position: relative;`;
        
        let vipBadge = isVip ? '<span style="position: absolute; top: 10px; left: 10px; background: rgba(241, 196, 15, 0.2); color: #f39c12; padding: 3px 8px; border-radius: 20px; font-size: 0.75rem; font-weight: bold;"><i class=\'fa-solid fa-star\'></i> VIP</span>' : '';

        div.innerHTML = `
            ${vipBadge}
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
                <div style="width: 45px; height: 45px; border-radius: 50%; background: var(--bg); display: flex; justify-content: center; align-items: center; font-size: 1.2rem; color: var(--primary);">
                    <i class=\'fa-solid fa-user\'></i>
                </div>
                <div>
                    <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-dark);">${c.name}</h4>
                    <span style="font-size: 0.85rem; color: #7f8c8d;"><i class=\'fa-solid fa-phone\' style=\'font-size: 0.75rem;\'></i> ${c.phone}</span>
                </div>
            </div>
            <div style="font-size: 0.85rem; color: #555; display: flex; flex-direction: column; gap: 6px;">
                <span><i class=\'fa-solid fa-location-dot\' style=\'color: #e74c3c;\'></i> ${c.gov || 'غير محدد'} - ${c.address || ''}</span>
                <div style="display: flex; justify-content: space-between; background: #f9f9f9; padding: 8px; border-radius: 8px; margin-top: 5px;">
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
        filtered = filtered.filter(c => (parseInt(c.visits) || 0) >= 3);
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

let customerSearchInput = document.getElementById('customerSearchInput');
if (customerSearchInput) {
    customerSearchInput.addEventListener('input', (e) => {
        if(window._customersLoaded) applyCustomerFilters(e.target.value);
    });
}

// ==========================================
// 13. <i class=\'fa-solid fa-star\'></i> حماية زر الإكسيل بباسورد
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
            togglePasswordVisibility.innerHTML = '<i class=\'fa-solid fa-eye\'></i>';
        }
    });
}

function tryExcelPassword() {
    let enteredPassword = excelPasswordInput ? excelPasswordInput.value.trim() : '';
    if (enteredPassword === EXCEL_PASSWORD) {
        showToast("<i class=\'fa-solid fa-check\'></i> تم التحقق بنجاح، جاري فتح قاعدة البيانات...", "success");
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

function fetchCatalogFromFirebase() {
    // ⚡ الخطوة 1: قراءة الكاش أولاً (فوري بدون انتظار)
    try {
        const cached = localStorage.getItem(FIREBASE_CACHE_KEY);
        if (cached) {
            barcodeCatalogData = JSON.parse(cached);
            console.log("⚡ تم تحميل الكاش المحلي: ", barcodeCatalogData.length, "منتج");
            updateSmartSuggestionsFromFirebase();
        }
    } catch (e) {
        console.warn("تعذر قراءة الكاش المحلي:", e);
    }

    // <i class=\'fa-solid fa-globe\'></i> الخطوة 2: جلب البيانات الطازجة من Firebase في الخلفية
    console.log("<i class=\'fa-solid fa-hourglass-half\'></i> جاري تحميل بيانات المنتجات من Firebase...");
    fetch(FIREBASE_PRODUCTS_URL)
        .then(response => {
            if (!response.ok) throw new Error("فشل الاتصال بـ Firebase: " + response.status);
            return response.json();
        })
        .then(data => {
            barcodeCatalogData = parseFirebaseProducts(data);
            
            // حفظ في الكاش المحلي
            try {
                localStorage.setItem(FIREBASE_CACHE_KEY, JSON.stringify(barcodeCatalogData));
            } catch (e) {
                console.warn("تعذر حفظ الكاش المحلي:", e);
            }

            console.log("<i class=\'fa-solid fa-check\'></i> تم تحميل بيانات المنتجات من Firebase: ", barcodeCatalogData.length, "منتج");
            updateSmartSuggestionsFromFirebase();
            
            // <i class=\'fa-solid fa-star\'></i> Re-enrich Expiry Data in case it loaded before Firebase
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
            console.error("<i class=\'fa-solid fa-xmark\'></i> خطأ في تحميل المنتجات من Firebase:", err);
            if (barcodeCatalogData.length === 0) {
                showToast("<i class=\'fa-solid fa-triangle-exclamation\'></i> فشل تحميل بيانات المنتجات من السيرفر", "error");
            }
        });
}

// تشغيل الدالة فور تحميل الصفحة
window.addEventListener('load', fetchCatalogFromFirebase);

// 2. إصدار صوت Beep قصير عند نجاح المسح
function playBeepSound() {
    try {
        if (typeof window.playSuccessBeep === 'function') {
            window.playSuccessBeep();
        } else {
            let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            let oscillator = audioCtx.createOscillator();
            let gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.value = 2750; // تردد الكاشير الحقيقي
            
            // Flat volume (sustain) then abrupt stop
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime + 0.07);
            gainNode.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.08);
        }
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

function processBarcodeAction(val) {
    if (currentScannerMode === 'inventory') {
        const invProdName = document.getElementById('invProdName');
        const invProdQty = document.getElementById('invProdQty');
        const invProdBarcode = document.getElementById('invProdBarcode');
        
        if (val && barcodeCatalogData) {
            const found = barcodeCatalogData.find(p => String(p.barcode).trim() === val);
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
            const found = barcodeCatalogData.find(p => String(p.barcode).trim() === val);
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
    let matchedProduct = barcodeCatalogData.find(p => String(p.barcode).trim() === String(barcodeValue).trim());

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
    const btn = document.getElementById('refreshExpiryBtn');
    if (btn) {
        btn.dataset.origText = btn.innerText;
        btn.innerHTML = "جاري التحميل <i class=\'fa-solid fa-hourglass-half\'></i>...";
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
            
            // <i class=\'fa-solid fa-star\'></i> سحب الباركود للمنتجات القديمة من الفايربيز أو إذا كان العمود غير موجود في الإكسيل
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

            renderExpiryDashboard();
            updateCatalogWithOffers(); // To highlight items on offer in the main cashier view
        })
        .catch(err => {
            if (btn) {
                btn.innerText = btn.dataset.origText;
                btn.style.opacity = "1";
                btn.style.pointerEvents = "auto";
            }
            showToast("<i class=\'fa-solid fa-xmark\'></i> حدث خطأ في تحميل الصلاحيات. يرجى مراجعة إعدادات Google Sheets", "error");
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
window.openExpiryDashboard = function () {
    document.getElementById('expiryDashboardModal').style.display = 'flex';
    loadExpiryData();
};

function loadExpiryData() {
    const btn = document.getElementById('openExpiryBtn');
    if (btn) {
        btn.dataset.origText = btn.innerText;
        btn.innerHTML = "جاري التحميل <i class=\'fa-solid fa-hourglass-half\'></i>...";
        btn.style.opacity = "0.7";
        btn.style.pointerEvents = "none";
    }
    
    const expiryBody = document.querySelector('#expiry-tab');
    if (expiryBody) expiryBody.classList.add('skeleton-mode');

    // Lazy load the expiries from Google Sheets
    fetch(`${GOOGLE_SHEETS_URL}?action=getExpiries`)
        .then(res => res.json())
        .then(data => {
            if (btn) {
                btn.innerText = btn.dataset.origText;
                btn.style.opacity = "1";
                btn.style.pointerEvents = "auto";
            }
            let rawData = Array.isArray(data) ? data : (data.expiries || []);
            // Extract batchId from overloaded regDate if present
            expiryData = rawData.map(item => {
                if (item.regDate && typeof item.regDate === 'string' && item.regDate.includes("||")) {
                    let parts = item.regDate.split("||");
                    item.regDate = parts[0];
                    item.batchId = parts[1];
                }
                return item;
            });

            renderExpiryDashboard();
            updateCatalogWithOffers(); // To highlight items on offer in the main cashier view
            
            const expiryBody = document.querySelector('#expiry-tab');
            if (expiryBody) expiryBody.classList.remove('skeleton-mode');
        })
        .catch(err => {
            if (btn) {
                btn.innerText = btn.dataset.origText;
                btn.style.opacity = "1";
                btn.style.pointerEvents = "auto";
            }
            showToast("<i class=\'fa-solid fa-xmark\'></i> حدث خطأ في تحميل الصلاحيات. يرجى مراجعة إعدادات Google Sheets", "error");
            // Also call render to clear the "loading" or show empty states
            renderExpiryDashboard();
            
            const expiryBody = document.querySelector('#expiry-tab');
            if (expiryBody) expiryBody.classList.remove('skeleton-mode');
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
        const regName = document.getElementById('ledgerRegistrarName').value;
        const receiverName = document.getElementById('ledgerReceiverName').value;

        if (!regDate || !regName || !receiverName) {
            showToast("يرجى إدخال تاريخ التسجيل واسم المسجل واسم المستلم في أعلى المحضر.", "warning");
            return;
        }

        // Attach reg info to all items
        let timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        let finalRegDate = regDate.trim() + " " + timeStr;

        const payload = ledgerCart.map(item => Object.assign({}, item, {
            // Include exact time in regDate to use it as a natural batch grouping ID!
            regDate: finalRegDate,
            registrarName: regName,
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
let selectedExpiryItems = new Set();

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
        
        let fragment = document.createDocumentFragment();
        
        itemsToShow.forEach(item => {
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
            let isChecked = selectedExpiryItems.has(item.id) ? "checked" : "";
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
                    <button class="btn-edit-item interactive-btn" style="background: #3498db; color: white; flex: 1;" onclick="openEditExpiryModal('${item.id}')"><i class="fa-solid fa-pen"></i> تعديل</button>
                    <button class="btn-close-item interactive-btn" style="flex: 1;" onclick="changeExpiryStatus('${item.id}', 'Deleted')">تم البيع <i class=\'fa-solid fa-xmark\'></i>️</button>
                </div>
            `;
            fragment.appendChild(itemDiv);
        });
        
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
window.changeExpiryStatus = function (id, newStatus) {
    let msg = "";
    if (newStatus === 'في عرض') msg = "هل تريد تفعيل العرض وجعل السطر فسفوري؟ 🔥";
    else if (newStatus === 'مش في عرض') msg = "هل تريد إيقاف العرض وإعادته للحالة الطبيعية؟";
    else if (newStatus === 'Deleted') msg = "تحذير: سيتم مسح المنتج بالكامل من النظام ولن يظهر مرة أخرى. هل أنت متأكد من إتمام البيع؟ <i class=\'fa-solid fa-xmark\'></i>️";

    customConfirm(msg, () => {
        showToast("جاري التحديث...", "warning");

        let formData = new URLSearchParams();
        formData.append('action', 'updateExpiryStatus');
        formData.append('id', id);
        formData.append('status', newStatus);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("<i class=\'fa-solid fa-check\'></i> تم تحديث الحالة بنجاح", "success");
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
                showToast("<i class=\'fa-solid fa-xmark\'></i> خطأ في الاتصال بالإنترنت", "error");
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
// Checkbox and Edit Modal Logic (Expiry)
// ==========================================
window.toggleExpirySelection = function(id, isChecked) {
    if (isChecked) {
        selectedExpiryItems.add(String(id));
    } else {
        selectedExpiryItems.delete(String(id));
    }
    
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
    
    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("<i class=\'fa-solid fa-check\'></i> تم تعديل الاستلامة بنجاح", "success");
            closeEditExpiryModal();
            
            let item = expiryData.find(i => String(i.id) === String(id));
            if (item) {
                // Update properties
                item.qty = qty;
                item.expiryDate = date;
                item.receiver = receiver;
                item.location = location;
                item.notes = notes;
                
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
            let d = new Date(item.expiryDate);
            if (!isNaN(d.getTime())) {
                let localStr = d.toLocaleDateString('en-CA').substring(0, 7);
                return localStr === monthVal;
            }
            return item.expiryDate.startsWith(monthVal);
        }).sort((a, b) => {
            let dA = new Date(a.expiryDate);
            let dB = new Date(b.expiryDate);
            return dA.getTime() - dB.getTime();
        });

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
            let d = new Date(item.expiryDate);
            if (!isNaN(d.getTime())) {
                let localStr = d.toLocaleDateString('en-CA').substring(0, 7);
                return localStr === monthVal;
            }
            return item.expiryDate.startsWith(monthVal);
        }).sort((a, b) => {
            let dA = new Date(a.expiryDate);
            let dB = new Date(b.expiryDate);
            return dA.getTime() - dB.getTime();
        });

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
            let d = new Date(item.regDate);
            if (!isNaN(d.getTime())) {
                let localStr = d.toLocaleDateString('en-CA');
                return localStr === dateVal;
            }
            return item.regDate.includes(dateVal);
        });

        if (filtered.length === 0) {
            showToast("لا توجد بيانات مسجلة في هذا اليوم", "warning");
            return;
        }

        // Group by exact time (natural batchId)
        let batches = {};
        let legacyBatch = [];
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
                legacyBatch.push(item);
            }
        });

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
                <td style="font-family: monospace; font-size: 15px; letter-spacing: 1px;">${barcode}</td>
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
                    window.print();
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

    let baseUrl = window.location.href.split('?')[0].replace(/[^/]*$/, '');
    let logoUrl = baseUrl + 'favicon.png';

    let html = `
        <html dir="rtl" lang="ar">
        <head>
            <title>تقرير انتهاء الصلاحية - شهر ${monthVal}</title>
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
            <div class="header">
                <div class="logo-container">
                    <img src="${logoUrl}" alt="Logo" class="logo-img">
                    <h1 class="logo-text">Candy <span>Club</span></h1>
                </div>
                <div class="title-box">
                    <h2 class="title">تقرير انتهاء الصلاحية</h2>
                    <p class="subtitle">منتجات تنتهي في شهر: <strong dir="ltr">${monthVal}</strong></p>
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
                <td style="font-family: monospace; font-size: 15px; letter-spacing: 1px;">${barcode}</td>
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
                    window.print();
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
}

function generatePDFReceipt(filteredData, dateVal) {
    // Determine receiver and registrar from the first item (assuming same batch)
    let receiver = filteredData[0].receiver || '.........................';
    let registrar = filteredData[0].registrarName || '.........................';

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
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                }
                .header { display: flex; flex-direction: column; align-items: center; border-bottom: 3px solid #E91E8C; padding-bottom: 20px; margin-bottom: 20px; }
                .logo-container { display: flex; align-items: center; gap: 15px; direction: ltr; margin-bottom: 10px; }
                .logo-img { height: 70px; object-fit: contain; }
                .logo-text { font-size: 36px; font-weight: 900; color: #E91E8C; letter-spacing: 2px; margin: 0; }
                .logo-text span { background: #E91E8C; color: white; padding: 5px 15px; border-radius: 8px; font-size: 24px; vertical-align: middle; }
                .title { font-size: 22px; font-weight: bold; color: #2c3e50; }
                .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 15px; gap: 20px; }
                .info-box { background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0; flex: 1; }
                .info-label { font-weight: bold; color: #7f8c8d; display: inline-block; width: 100px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
                thead { display: table-header-group; }
                tr { page-break-inside: avoid; }
                th { background: #E91E8C; color: white; padding: 10px; text-align: right; border: 1px solid #ddd; }
                td { padding: 8px; border: 1px solid #ddd; vertical-align: middle; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 50px; page-break-inside: avoid; }
                .sig-box { text-align: center; width: 200px; }
                .sig-line { width: 100%; border-bottom: 1px dashed #333; margin-top: 40px; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #7f8c8d; border-top: 1px solid #eee; padding-top: 15px; page-break-inside: avoid; }
                @media print {
                    @page { size: A4 portrait; margin: 15mm; }
                    body { padding: 0; width: 100%; box-shadow: none; margin: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-container">
                    <img src="${logoUrl}" alt="Logo" class="logo-img">
                    <h1 class="logo-text">Candy <span>Club</span></h1>
                </div>
                <div class="title">بيان استلام بضاعة</div>
            </div>
            
            <div class="info-section">
                <div class="info-box">
                    <div><span class="info-label">تاريخ التسجيل:</span> <span style="font-weight:bold; color:#E91E8C;">${dateVal}</span></div>
                    <div style="margin-top: 10px;"><span class="info-label">اسم المسجل:</span> <strong>${registrar}</strong></div>
                </div>
                <div class="info-box">
                    <div><span class="info-label">اسم المستلم:</span> <span style="font-weight:bold; font-size:1.1em;">${receiver}</span></div>
                    <div style="margin-top: 10px;"><span class="info-label">إجمالي الأصناف:</span> <strong>${filteredData.length}</strong></div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">م</th>
                        <th style="width: 30%;">اسم المنتج</th>
                        <th style="width: 15%;">الباركود</th>
                        <th style="width: 10%;">العدد</th>
                        <th style="width: 15%;">تاريخ الانتهاء</th>
                        <th style="width: 15%;">المكان</th>
                        <th style="width: 10%;">ملاحظات</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map((item, index) => {
                        let expDate = new Date(item.expiryDate);
                        let formattedExp = isNaN(expDate.getTime()) ? item.expiryDate : expDate.toLocaleDateString('ar-EG');
                        return `
                        <tr>
                            <td>${index + 1}</td>
                            <td style="font-weight: bold;">${item.name || '-'}</td>
                            <td dir="ltr" style="text-align: right;">${item.barcode || '-'}</td>
                            <td style="font-weight: bold; text-align: center; color: #27ae60; font-size: 1.1em;">${item.qty || '-'}</td>
                            <td dir="ltr" style="text-align: right;">${formattedExp || '-'}</td>
                            <td>${item.location || '-'}</td>
                            <td>${item.notes || '-'}</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <div class="signatures">
                <div class="sig-box">
                    <div style="font-weight: bold; color: #333;">توقيع المُسلم (المسجل)</div>
                    <div class="sig-line"></div>
                </div>
                <div class="sig-box">
                    <div style="font-weight: bold; color: #333;">توقيع المُستلم</div>
                    <div class="sig-line"></div>
                </div>
            </div>

            <div class="footer">
                تم استخراج هذا الإيصال آلياً من نظام Candy Club - ${new Date().toLocaleString('ar-EG')}
            </div>
            
            <script>
                window.onload = function() {
                    // Slight delay to ensure fonts load
                    setTimeout(function() {
                        window.print();
                        // Optional: close after printing, but better leave it open for user to review
                    }, 500);
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
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    
    // Flat volume (sustain) then abrupt stop (mimics a real scanner/piezo buzzer)
    gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(vol, audioCtx.currentTime + duration - 0.01);
    gainNode.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
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

const waStartCampaignBtn = document.getElementById("waStartCampaignBtn");
if(waStartCampaignBtn) {
    waStartCampaignBtn.addEventListener("click", () => { return; // DISABLED - replaced with Smart Assistant at end of file
        const list = document.getElementById("waCustomerList");
        const countSpan = document.getElementById("waQueueCount");
        const container = document.getElementById("waQueueContainer");
        const targetType = waTargetGroup ? waTargetGroup.value : "all";
        
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
                validCustomers = baseCustomers.filter(c => (parseInt(c.visits) || 0) >= 3);
            } else if (targetType === "inactive") {
                validCustomers = baseCustomers.filter(c => (parseInt(c.visits) || 0) <= 1);
            } else {
                validCustomers = baseCustomers;
            }
        }
        
        if(validCustomers.length === 0) {
            alert("لا يوجد عملاء في هذه الفئة المستهدفة.");
            return;
        }
        
        list.innerHTML = "";
        countSpan.innerText = validCustomers.length;
        container.style.display = "block";
        
        validCustomers.forEach((c, index) => {
            let div = document.createElement("div");
            div.className = "wa-customer-row";
            div.id = `wa-row-${index}`;
            div.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid #eee; padding: 12px 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); margin-bottom: 8px;";
            
            div.innerHTML = `
                <div>
                    <strong style="color: var(--primary);"><i class=\'fa-solid fa-user\'></i> ${c.name}</strong><br>
                    <span style="font-size:0.8rem; color:#7f8c8d;"><i class=\'fa-solid fa-phone\'></i> ${c.phone} ${c.visits !== undefined ? `| <i class=\'fa-solid fa-bag-shopping\'></i> زيارات: ${c.visits}` : ''}</span>
                </div>
                <button class="wa-send-btn interactive-btn" id="wa-btn-${index}" onclick="sendWaCampaign(${index}, '${c.name}', '${c.phone}')" style="background: #25D366; color: white; border: none; padding: 8px 15px; border-radius: 8px; font-weight: bold; cursor: pointer;">إرسال <i class=\'fa-solid fa-rocket\'></i></button>
            `;
            list.appendChild(div);
        });
        
        container.scrollIntoView({ behavior: "smooth" });
    });
}

window.sendWaCampaign = function(index, name, phone) {
    if(waCooldownTime > 0) {
        return; // DISABLED
    }
    
    let textElem = document.getElementById("waCampaignText");
    if(!textElem) return;
    
    let text = textElem.value;
    if(!text.trim()) {
        alert("برجاء كتابة نص رسالة العرض أولاً.");
        textElem.focus();
        return;
    }
    
    text = text.replace(/\[الاسم\]/g, name);
    
    let cleanPhone = sanitizePhone(phone);
    if(!cleanPhone) {
        alert("رقم الهاتف غير صالح.");
        return;
    }
    
    let url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    
    let btn = document.getElementById(`wa-btn-${index}`);
    if(btn) {
        btn.innerHTML = "تم الإرسال <i class=\'fa-solid fa-check\'></i>";
        btn.style.background = "#bdc3c7";
        btn.style.color = "#2c3e50";
        btn.disabled = true;
    }
    
    // Start Cooldown (15 seconds recommended for anti-ban)
    startWaCooldown(15); 
};

function startWaCooldown(seconds) {
    waCooldownTime = seconds;
    const timerSpan = document.getElementById("waCooldownTimer");
    if(!timerSpan) return;
    
    timerSpan.style.display = "inline";
    
    document.querySelectorAll(".wa-send-btn").forEach(b => {
        if(!b.innerHTML.includes("fa-check")) b.disabled = true;
    });
    
    if(waCooldownInterval) clearInterval(waCooldownInterval);
    
    waCooldownInterval = setInterval(() => {
        waCooldownTime--;
        timerSpan.innerHTML = `<i class=\'fa-solid fa-hourglass-half\'></i> انتظر ${waCooldownTime} ثانية لحماية حسابك...`;
        
        if(waCooldownTime <= 0) {
            clearInterval(waCooldownInterval);
            timerSpan.style.display = "none";
            document.querySelectorAll(".wa-send-btn").forEach(b => {
                if(!b.innerHTML.includes("fa-check")) b.disabled = false;
            });
        }
    }, 1000);
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
    
    // Fetch stats from backend
    if (window.latestServerData && window.latestServerData.moderatorStats) {
        const stats = window.latestServerData.moderatorStats;
        for (const mod in stats) {
            let displayName = mod;
            const isRegistered = window.allModeratorsList && window.allModeratorsList.includes(mod);
            if (!isRegistered) {
                displayName = mod + " (محذوف)";
            }
            
            if (!modsData[displayName]) {
                modsData[displayName] = { name: displayName, totalCount: 0, monthCount: 0, totalSales: 0, monthSales: 0 };
            }
            
            modsData[displayName].totalSales += stats[mod].totalSales;
            modsData[displayName].totalCount += stats[mod].totalCount;
            // The backend already calculates monthSales based on targetMonth, so we just use it
            modsData[displayName].monthSales += stats[mod].monthSales;
            modsData[displayName].monthCount += stats[mod].monthOrderCount;
        }
    }
    // Frontend loop removed since backend now calculates accurate monthly and total stats
    
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
        const monthFilterInput = document.getElementById('moderatorsMonthFilter');
        if (!monthFilterInput || !monthFilterInput.value) {
            showToast("برجاء اختيار الشهر أولاً", "warning");
            return;
        }
        const selectedMonth = monthFilterInput.value;
        showToast("جاري جلب الإحصائيات...", "warning");
        loadDataFromServer(selectedMonth + '-01');
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
    
    if (searchInvBarcodeBtn) {
        searchInvBarcodeBtn.addEventListener('click', () => {
            let val = invProdBarcode.value.trim().toLowerCase();
            if(!val) return;
            let exactMatch = barcodeCatalogData.find(p => p.barcode && String(p.barcode).toLowerCase() === val);
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
        invItemsList.innerHTML = '';
        invItems.forEach((item, index) => {
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: right; font-weight: bold; color: var(--text-main);">${item.name}</td>
                <td style="text-align: center; font-weight: bold;">${item.qty}</td>
                <td style="text-align: center;">
                    <button type="button" style="background: rgba(41, 128, 185, 0.1); color: #2980b9; border: none; padding: 6px 12px; border-radius: 8px; font-size: 0.85rem; cursor: pointer; margin-left: 5px; transition: 0.3s;" onclick="window.editInvItem(${index})" onmouseover="this.style.background='#2980b9'; this.style.color='#fff';" onmouseout="this.style.background='rgba(41, 128, 185, 0.1)'; this.style.color='#2980b9';"><i class="fa-solid fa-pen-to-square"></i> تعديل</button>
                    <button type="button" style="background: rgba(231, 76, 60, 0.1); color: #e74c3c; border: none; padding: 6px 12px; border-radius: 8px; font-size: 0.85rem; cursor: pointer; transition: 0.3s;" onclick="window.deleteInvItem(${index})" onmouseover="this.style.background='#e74c3c'; this.style.color='#fff';" onmouseout="this.style.background='rgba(231, 76, 60, 0.1)'; this.style.color='#e74c3c';"><i class="fa-solid fa-trash-can"></i> حذف</button>
                </td>
            `;
            invItemsList.appendChild(tr);
        });
    }

    if (savePrintInvBtn) {
        savePrintInvBtn.addEventListener('click', () => {
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

            // Dynamically calculate Sequential ID based on server data
            let currentCount = 1;
            if (window.invLogsData) {
                if (window.invLogsData.length > 0) {
                    let maxId = 0;
                    window.invLogsData.forEach(log => {
                        let numMatch = String(log.logId).match(/\d+/);
                        if (numMatch) {
                            let num = parseInt(numMatch[0]);
                            if (num > maxId) maxId = num;
                        }
                    });
                    currentCount = maxId + 1;
                } else {
                    currentCount = 1; // Sheet is completely empty!
                }
            } else {
                try { currentCount = parseInt(localStorage.getItem('invCounter') || "0") + 1; } catch(e) { currentCount = 1; }
            }

            let idStr = String(currentCount).padStart(6, '0');
            let logId = `TRX-${idStr}`;

            let itemsStr = invItems.map(i => `${i.name} (${i.qty})${i.barcode ? ' [باركود: ' + i.barcode + ']' : ''}`).join(" | ");

            let formData = new URLSearchParams();
            formData.append("action", "addInventoryLog");
            formData.append("logId", logId);
            formData.append("from", from);
            formData.append("to", to);
            formData.append("regName", senderName ? senderName : regName);
            formData.append("items", itemsStr);
            formData.append("notes", notes);

            setBtnLoading(savePrintInvBtn, true);

            fetch(GOOGLE_SHEETS_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            }).then(() => {
                try { localStorage.setItem('invCounter', currentCount); } catch(e) {}
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
            }).catch(err => {
                setBtnLoading(savePrintInvBtn, false);
                showToast("خطأ في الاتصال بالسيرفر", "error");
            });
        });
    }

    function printInventoryReceipt(logId, from, to, items, notes, senderName, regName) {
        let printWindow = window.open('', '_blank', 'height=600,width=400');
        if (!printWindow) {
            showToast("يرجى تفعيل النوافذ المنبثقة (Pop-ups) للطباعة", "error");
            return;
        }

        let itemsHtml = '';
        items.forEach(i => {
            itemsHtml += `
                <tr>
                    <td style="text-align: right; padding: 8px 5px; border-bottom: 1px dashed #ccc;">
                        <div style="font-weight: bold; font-size: 14px;">${i.name}</div>
                        ${i.barcode ? `<div style="font-size: 11px; color: #555; margin-top: 3px;">باركود: ${i.barcode}</div>` : ''}
                    </td>
                    <td style="text-align: center; padding: 8px 5px; border-bottom: 1px dashed #ccc; font-weight: bold; font-size: 15px;">${i.qty}</td>
                </tr>
            `;
        });

        let dateStr = new Date().toLocaleString('ar-EG');
        let senderDisplay = senderName ? senderName : regName;

        let html = `
            <html dir="rtl" lang="ar">
            <head>
                <title>إذن ${logId}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <style>
                    @page { margin: 0; }
                    body {
                        font-family: Tahoma, Arial, sans-serif;
                        color: #000;
                        width: 80mm;
                        margin: 0 auto;
                        padding: 15px;
                        font-size: 13px;
                        line-height: 1.5;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 15px;
                    }
                    .header h2 { margin: 0 0 5px 0; font-size: 20px; font-weight: bold; }
                    .header h3 { margin: 0 0 8px 0; font-size: 16px; font-weight: bold; }
                    .header p { margin: 2px 0; font-size: 12px; }
                    .divider { border-top: 2px dashed #000; margin: 10px 0; }
                    .info-box {
                        margin-bottom: 15px;
                        border: 1px solid #000;
                        padding: 10px;
                        border-radius: 5px;
                    }
                    .info-box p { margin: 4px 0; font-weight: bold; font-size: 13px; }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 15px;
                    }
                    th {
                        text-align: right;
                        padding: 5px;
                        border-top: 2px solid #000;
                        border-bottom: 2px solid #000;
                        font-weight: bold;
                        font-size: 14px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 15px;
                        font-size: 11px;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Candy Club</h2>
                    <h3>إذن حركة بضاعة</h3>
                    <p>رقم الإذن: <b style="font-size:14px;">${logId}</b></p>
                    <p>التاريخ: ${dateStr}</p>
                </div>

                <div class="divider"></div>

                <div class="info-box">
                    <p><i class="fa-solid fa-user-tie" style="margin-left: 5px;"></i> <b>الراسل:</b> ${senderDisplay}</p>
                    <p><i class="fa-solid fa-store" style="margin-left: 5px;"></i> <b>من:</b> ${from}</p>
                    <p><i class="fa-solid fa-truck-fast" style="margin-left: 5px;"></i> <b>إلى:</b> ${to}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 75%;">الصنف</th>
                            <th style="width: 25%; text-align: center;">الكمية</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                ${notes ? `<div style="margin-bottom: 15px; font-size: 13px;"><p><i class="fa-solid fa-pen-to-square" style="margin-left: 5px;"></i> <b>ملاحظات:</b> ${notes}</p></div>` : ''}

                <div class="divider"></div>

                <div class="footer">
                    <p>مسجل إلكترونياً بـ Candy Club System</p>
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
    if (tab === 'create') {
        document.getElementById('invCreateSection').style.display = 'block';
        document.getElementById('invArchiveSection').style.display = 'none';
        document.getElementById('invCreateTabBtn').style.background = 'var(--primary)';
        document.getElementById('invCreateTabBtn').style.color = 'white';
        document.getElementById('invArchiveTabBtn').style.background = '#e0e0e0';
        document.getElementById('invArchiveTabBtn').style.color = '#333';
    } else {
        document.getElementById('invCreateSection').style.display = 'none';
        document.getElementById('invArchiveSection').style.display = 'block';
        document.getElementById('invArchiveTabBtn').style.background = 'var(--primary)';
        document.getElementById('invArchiveTabBtn').style.color = 'white';
        document.getElementById('invCreateTabBtn').style.background = '#e0e0e0';
        document.getElementById('invCreateTabBtn').style.color = '#333';
    }
};

function fetchInventoryLogs(callback = null) {
    let tbody = document.getElementById('invArchiveTableBody');
    if (tbody && tbody.children.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px; color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> جاري تحميل البيانات من السيرفر...</td></tr>';
    }
    
    fetch(`${GOOGLE_SHEETS_URL}?action=getInventoryLogs&t=${new Date().getTime()}`)
        .then(res => res.json())
        .then(data => {
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
        let parts = log.timestamp.split(" ")[0].split("-");
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
        
        let datePart = log.timestamp.split(" ")[0]; // YYYY-MM-DD
        let yearMonth = datePart.substring(0, 7); // YYYY-MM
        if (yearMonth) monthsGroup[yearMonth] = (monthsGroup[yearMonth] || 0) + 1;
        
        try {
            let items = JSON.parse(log.items);
            items.forEach(i => {
                let pName = String(i.name).trim();
                let pQty = parseInt(i.qty) || 0;
                if (pName) products[pName] = (products[pName] || 0) + pQty;
            });
        } catch(e) {
            if (log.items) {
                let parts = log.items.split("|");
                parts.forEach(p => {
                    let match = p.trim().match(/(.*?)\s+\((\d+)\)/);
                    if (match) {
                        let pName = match[1].trim();
                        let pQty = parseInt(match[2]) || 0;
                        if (pName) products[pName] = (products[pName] || 0) + pQty;
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

function filterAndRenderArchive() {
    let q = document.getElementById('invSearchInput') ? document.getElementById('invSearchInput').value.trim() : '';
    let dateQ = document.getElementById('invSearchDate') ? document.getElementById('invSearchDate').value : '';
    let tbody = document.getElementById('invArchiveTableBody');

    if (q === '' && dateQ === '') {
        if (tbody) tbody.innerHTML = '';
        return;
    }

    if (!window.invLogsData) {
        fetchInventoryLogs(() => filterAndRenderArchive());
        return;
    }
    
    // Show a loading spinner to give visual feedback that search is happening
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b; font-weight:bold; font-size:1.1rem;"><i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color:var(--primary); margin-bottom:15px; display:block;"></i> جاري البحث في الأرشيف...</td></tr>`;
    }

    // Simulate a slight delay for the UI to breathe and show the spinner
    setTimeout(() => {
        let filtered = window.invLogsData.filter(log => {
            // If searching by Log ID, IGNORE the date completely!
            if (q !== '') {
                return String(log.logId).toLowerCase().includes(q.toLowerCase());
            }
            
            // Otherwise, filter by date if selected
            if (dateQ !== '') {
                return String(log.timestamp).startsWith(dateQ);
            }
            
            return true;
        });

        renderInventoryArchive(filtered);
    }, 300);
}

document.getElementById('invSearchInput')?.addEventListener('input', filterAndRenderArchive);
document.getElementById('invSearchDate')?.addEventListener('change', filterAndRenderArchive);
document.getElementById('refreshInvArchiveBtn')?.addEventListener('click', () => {
    fetchInventoryLogs(() => filterAndRenderArchive());
});

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
                <div onclick="filterByMonthMonthModal('${ym}')" class="interactive-btn" style="display:flex; justify-content:space-between; align-items:center; padding:14px 18px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; cursor:pointer; transition:all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05);" onmouseover="this.style.borderColor='var(--primary)'; this.style.background='#f1f5f9';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='#f8fafc';">
                    <span style="font-weight:bold; color:#1e293b; font-size:1rem;"><i class="fa-solid fa-calendar-days" style="color:var(--primary); margin-left:8px;"></i> ${label}</span>
                    <span style="background:var(--primary); color:white; padding:4px 12px; border-radius:20px; font-weight:bold; font-size:0.875rem;">${count} إذن</span>
                </div>`;
        });
        html += `</div>`;
    } else {
        html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
        pageData.forEach((item, i) => {
            let actualIndex = startIdx + i;
            let bg = actualIndex % 2 === 0 ? '#f8fafc' : '#ffffff';
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:${bg}; border:1px solid #f1f5f9; border-radius:10px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <span style="font-weight:bold; color:#334155;"><span style="color:var(--primary); margin-left:8px; font-size:0.9rem;">#${actualIndex+1}</span> ${item[0]}</span>
                    <span style="background:#e2e8f0; color:#1e293b; padding:3px 10px; border-radius:15px; font-weight:bold; font-size:0.85rem;">${item[1]}</span>
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
    // Purge data to free memory as requested
    window.invLogsData = null;
    window.invStatsSenders = null;
    window.invStatsReceivers = null;
    window.invStatsProducts = null;
    window.invStatsMonths = null;
};

window.reprintInvLog = function(logId) {
    if (!window.invLogsData) {
        fetchInventoryLogs(() => window.reprintInvLog(logId));
        return;
    }
    let log = window.invLogsData.find(l => l.logId === logId);
    if (!log) return;
    
    let itemsArr = [];
    try {
        itemsArr = JSON.parse(log.items);
    } catch(e) {
        if (log.items) {
            let parts = log.items.split("|");
            itemsArr = parts.map(p => {
                let match = p.trim().match(/(.*?)\s+\((\d+)\)/);
                if (match) return { name: match[1].trim(), qty: match[2] };
                return { name: p.trim(), qty: 1 };
            });
        }
    }
    
    let itemsHtml = itemsArr.map(item => `
        <tr>
            <td style="text-align: right;">${item.name}</td>
            <td style="text-align: center;"><b>${item.qty}</b></td>
        </tr>
    `).join('');
    
    let printWindow = window.open('', '_blank', 'width=400,height=600');
    let html = `
        <html dir="rtl" lang="ar">
        <head>
            <title>إذن ${log.logId}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                @page { margin: 0; }
                body {
                    font-family: Tahoma, Arial, sans-serif;
                    color: #000;
                    width: 80mm;
                    margin: 0 auto;
                    padding: 15px;
                    font-size: 13px;
                    line-height: 1.5;
                }
                .header { text-align: center; margin-bottom: 15px; }
                .header h2 { margin: 0 0 5px 0; font-size: 20px; font-weight: bold; }
                .header h3 { margin: 0 0 8px 0; font-size: 16px; font-weight: bold; }
                .header p { margin: 2px 0; font-size: 12px; }
                .divider { border-top: 2px dashed #000; margin: 10px 0; }
                .info-box { margin-bottom: 15px; border: 1px solid #000; padding: 10px; border-radius: 5px; }
                .info-box p { margin: 4px 0; font-weight: bold; font-size: 13px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                th { text-align: right; padding: 5px; border-top: 2px solid #000; border-bottom: 2px solid #000; font-weight: bold; font-size: 14px; }
                td { padding: 5px; border-bottom: 1px dashed #ccc; }
                .footer { text-align: center; margin-top: 15px; font-size: 11px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>Candy Club</h2>
                <h3>إذن حركة بضاعة <span style="font-size:10px;">(نسخة أرشيفية)</span></h3>
                <p>رقم الإذن: <b style="font-size:14px;">${log.logId}</b></p>
                <p>التاريخ: ${log.timestamp}</p>
            </div>
            <div class="divider"></div>
            <div class="info-box">
                <p><i class="fa-solid fa-user-tie" style="margin-left: 5px;"></i> <b>الراسل:</b> ${log.regName}</p>
                <p><i class="fa-solid fa-store" style="margin-left: 5px;"></i> <b>من:</b> ${log.from}</p>
                <p><i class="fa-solid fa-truck-fast" style="margin-left: 5px;"></i> <b>إلى:</b> ${log.to}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 75%;">الصنف</th>
                        <th style="width: 25%; text-align: center;">الكمية</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            ${log.notes ? `<div style="margin-bottom: 15px; font-size: 13px;"><p><i class="fa-solid fa-pen-to-square" style="margin-left: 5px;"></i> <b>ملاحظات:</b> ${log.notes}</p></div>` : ''}
            <div class="divider"></div>
            <div class="footer">
                <p>مسجل إلكترونياً بـ Candy Club System</p>
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
};

// --- Smart Assistant WA Logic ---
window.waAssistantQueue = [];
window.waAssistantIndex = 0;
window.waIsPaused = false;
window.waMessageTemplate = "";

const waStartCampaignBtnNew = document.getElementById("waStartCampaignBtn");
if(waStartCampaignBtnNew) {
    // Clone to remove all previous event listeners
    const cloneBtn = waStartCampaignBtnNew.cloneNode(true);
    waStartCampaignBtnNew.parentNode.replaceChild(cloneBtn, waStartCampaignBtnNew);
    
    cloneBtn.addEventListener("click", () => {
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
                validCustomers = baseCustomers.filter(c => (parseInt(c.visits) || 0) >= 3);
            } else if (targetType === "inactive") {
                validCustomers = baseCustomers.filter(c => (parseInt(c.visits) || 0) <= 1);
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
        playBeep(2); // double beep
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
    
    playBeep(); // Beep to notify user it's ready
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

function playBeep(times = 1) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let i = 0;
        function beep() {
            if(i >= times) return;
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = "sine";
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                i++;
                setTimeout(beep, 200);
            }, 150);
        }
        beep();
    } catch(e) {}
}
