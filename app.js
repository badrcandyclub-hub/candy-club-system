// ==========================================
// ًںŒگ ط§ظ„ط¹ظ‚ظ„ ط§ظ„ظ…ط¯ط¨ط± - ط³ظٹط³طھظ… ظƒط§ظ†ط¯ظٹ ظƒظ„ظˆط¨ (ط§ظ„ظ†ط³ط®ط© V13.6 - ط§ظ„ط´ط§ظ…ظ„ط© ظˆط§ظ„ظ…ط­طµظ†ط©)
// ==========================================

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbz6dLvyXzuXhVKKxIt4c5ajIIv8iZtHM_5YRM8bYNuX5vwfs5_wSxP7gcZYOn8xm49OIw/exec";

// ==========================================
// 1. ظ†ط¸ط§ظ… ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ (Toasts) ظˆظ‚ظپظ„ ط§ظ„ط£ط²ط±ط§ط± (Loading)
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'error' ? 'â‌Œ' : (type === 'warning' ? 'âڑ ï¸ڈ' : 'âœ…');
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, 3000);
}

function setBtnLoading(btn, isLoading, originalText = "") {
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.origText = btn.innerText;
        btn.innerText = "ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„ âڈ³...";
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
// 2. ط§ظ„طھط¨ط¯ظٹظ„ ط¨ظٹظ† ط§ظ„ط´ط§ط´ط§طھ ظˆط§ظ„ظ†ظˆط§ظپط° ط§ظ„ظ…ظ†ط¨ط«ظ‚ط©
// ==========================================
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        let targetElement = document.getElementById(btn.getAttribute('data-target'));
        if (targetElement) targetElement.classList.add('active');
        
        // Lazy load expiry data if tab is opened
        if (btn.getAttribute('data-target') === 'expiry-tab') {
            if (typeof expiryData !== 'undefined' && expiryData.length === 0) loadExpiryData();
            
            // Set default reg date to today if empty
            let regDateInput = document.getElementById('expRegDate');
            if (regDateInput && !regDateInput.value) {
                let today = new Date();
                let yyyy = today.getFullYear();
                let mm = String(today.getMonth() + 1).padStart(2, '0');
                let dd = String(today.getDate()).padStart(2, '0');
                regDateInput.value = `${yyyy}-${mm}-${dd}`;
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
// 3. طھط­ظ…ظٹظ„ ط§ظ„ط¯ط§طھط§ ط§ظ„ط£ط³ط§ط³ظٹط© ظ…ظ† ط§ظ„ط¥ظƒط³ظٹظ„
// ==========================================
let shippingData = {};
let catalogData = [];
let oosData = [];
// â­گ Fix: expose on window so ALL functions (printHistoryOrder, shareToWhatsApp) can access it
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

    // â­گ ط²ط±ط§ط± ط§ظ„طھط­ط¯ظٹط« ط§ظ„ط³ط±ظٹط¹
    let quickRefreshBtn = document.getElementById('quickRefreshBtn');
    if (quickRefreshBtn) quickRefreshBtn.addEventListener('click', () => {
        showToast("ط¬ط§ط±ظٹ طھط­ط¯ظٹط« ط§ظ„ط¨ظٹط§ظ†ط§طھ...", "warning");
        loadDataFromServer();
    });

    loadDataFromServer();
    if (typeof updateSuspendedCount === 'function') updateSuspendedCount();
    // â­گ V14.2: ط¹ط¯ط§ط¯ ط§ظ„ظ…ط¹ظ„ظ‚ط§طھ ظٹظڈظ‚ط±ط£ ظ…ظ† ط§ظ„ط³ظٹط±ظپط± ظ…ط¨ط§ط´ط±ط© ط¨ط¹ط¯ loadDataFromServer
};

function loadDataFromServer() {
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) { syncStatus.innerText = "ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„..."; syncStatus.style.color = "#FF8C00"; }

    fetch(`${GOOGLE_SHEETS_URL}?date=${currentFilterDate}`)
        .then(res => res.json())
        .then(data => {
            if (syncStatus) { syncStatus.innerText = "ظ…طھطµظ„"; syncStatus.style.color = "#00C853"; }

            orderHistoryData = data.history || [];
            window.orderHistoryData = orderHistoryData; // â­گ keep window ref in sync
            window.pendingOrdersData = data.pendingOrders || [];
            window.suspendedOrdersData = data.suspendedOrders || [];
            updateSuspendedCount(); // â­گ V14.2: طھط­ط¯ظٹط« ط§ظ„ط¹ط¯ط§ط¯ ظ…ظ† ط§ظ„ط³ظٹط±ظپط± ط¨ط¹ط¯ ظƒظ„ طھط­ظ…ظٹظ„
            window.financialsData = data.financials || [];
            window.uncollectedOrdersData = data.uncollectedOrders || [];
            // â­گ V15.1: طھط®ط²ظٹظ† ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¹ظ…ظ„ط§ط، ظپظ‚ط· ط¨ط¯ظˆظ† ط¹ط±ط¶ظ‡ط§ طھظ„ظ‚ط§ط¦ظٹط§ظ‹ (Lazy)
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
            if (govSelect) govSelect.innerHTML = '<option value="">ط§ط®طھط± ظ…ظ† ط§ظ„ظ‚ط§ط¦ظ…ط©</option>';
            shippingData = {};

            const renderZoneItem = (z, zoneType, container) => {
                shippingData[z.name] = z;
                if (container) {
                    let specialClass = z.type === 'next_day' ? 'zone-next-day' : '';
                    container.innerHTML += `
                        <div class="data-row ${specialClass}" style="align-items:center;">
                            <div style="flex:1; text-align:right;"><strong>${z.name}</strong> <br> <span class="price-badge">${z.price} ط¬.ظ…</span> <small style="color:#777;">${z.duration}</small></div>
                            <div style="display:flex; gap:5px;">
                                <button type="button" class="btn-outline interactive-btn" style="padding: 4px 8px; font-size:0.8rem;" onclick="editZoneUI('${z.name}', '${z.price}', '${z.type}', '${z.duration}')">âœڈï¸ڈ</button>
                                <button type="button" class="interactive-btn" style="padding: 4px 8px; font-size:0.8rem; background:var(--danger); color:white; border:none; border-radius:8px;" onclick="deleteItem('deleteShipping', '${z.name}', '${zoneType}')">â‌Œ</button>
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
            if (driverSelect) driverSelect.innerHTML = '<option value="">ط§ط®طھط± ط§ظ„ظ…ظ†ط¯ظˆط¨</option>';
            if (assignDriverSelect) assignDriverSelect.innerHTML = '<option value="">ط§ط®طھط± ط§ظ„ظ…ظ†ط¯ظˆط¨</option>';
            if (closeDriverSelect) closeDriverSelect.innerHTML = '<option value="">ط§ط®طھط± ط§ظ„ظ…ظ†ط¯ظˆط¨</option>';

            if (data.couriers && data.couriers.length > 0) {
                data.couriers.forEach(c => {
                    if (driverSelect) driverSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                    if (assignDriverSelect) assignDriverSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                    if (closeDriverSelect) closeDriverSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                    if (driversDisplayList) {
                        driversDisplayList.innerHTML += `
                            <div class="data-row" style="align-items:center;">
                                <div style="flex:1; text-align:right;"><strong>ًں›µ ${c.name}</strong> <br> <span class="phone-badge">${c.phone}</span></div>
                                <div style="display:flex; gap:5px;">
                                    <button type="button" class="btn-outline interactive-btn" style="padding: 4px 8px; font-size:0.8rem;" onclick="editDriverUI('${c.name}', '${c.phone}')">âœڈï¸ڈ</button>
                                    <button type="button" class="interactive-btn" style="padding: 4px 8px; font-size:0.8rem; background:var(--danger); color:white; border:none; border-radius:8px;" onclick="deleteItem('deleteDriver', '${c.name}')">â‌Œ</button>
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
            if (modSelect) modSelect.innerHTML = '<option value="">ط§ط®طھط± ط§ط³ظ…ظƒ</option>';
            if (modsList) modsList.innerHTML = '';
            if (data.moderators && data.moderators.length > 0) {
                data.moderators.forEach(m => {
                    if (modSelect) modSelect.innerHTML += `<option value="${m}">${m}</option>`;
                    if (modsList) {
                        modsList.innerHTML += `
                            <div class="data-row" style="align-items:center; padding:5px;">
                                <span style="flex:1;">ًں‘¤ ${m}</span>
                                <button type="button" class="interactive-btn" style="padding: 4px 8px; font-size:0.8rem; background:var(--danger); color:white; border:none; border-radius:8px;" onclick="deleteItem('deleteModerator', '${m}')">â‌Œ</button>
                            </div>`;
                    }
                });
            } else if (modsList) {
                modsList.innerHTML = '<p class="empty-msg">ظ„ط§ ظٹظˆط¬ط¯ ظƒط§ط´ظٹط±ظٹط© ظ…ط³ط¬ظ„ظٹظ†</p>';
            }
            if (modSelect && currentMod) modSelect.value = currentMod;

            // â­گ V15.1: ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ظٹظˆظ… (today) - طھظ… ط§ط³طھط¨ط¯ط§ظ„ظ‡ط§ ط¨ط§ظ„ظ…ظ†ط·ظ‚ ط§ظ„ظ…ط­ظ„ظٹ ظپظٹ updateAdvancedDashboard ظ„ط­ظ„ ظ…ط´ظƒظ„ط© ط§ظ„ط¥ظƒط³ظٹظ„

            // â­گ ط¥ط°ط§ ظ„ظ… ظٹظƒظ† ط§ظ„ظ…ط³طھط®ط¯ظ… ظ‚ط¯ ط§ط®طھط§ط± ط´ظ‡ط±ط§ظ‹ ظ…ط¹ظٹظ†ط§ظ‹ ظ„ظ„طھظ‚ط±ظٹط±طŒ ظ†ط¹ط±ط¶ ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ط´ظ‡ط± ط§ظ„ط­ط§ظ„ظٹ ظپظٹ ط§ظ„ظ…ط±ط¨ط¹ط§طھ
            let reportMonthFilter = document.getElementById('reportMonthFilter');
            if (!reportMonthFilter || !reportMonthFilter.value) {
                if (document.getElementById('monthSales')) document.getElementById('monthSales').innerText = data.monthSales || 0;
                if (document.getElementById('monthCount')) document.getElementById('monthCount').innerText = data.monthOrderCount || 0;
                if (document.getElementById('completedMonthCount')) document.getElementById('completedMonthCount').innerText = data.completedMonthCount || 0;
                if (document.getElementById('returnedCount')) document.getElementById('returnedCount').innerText = data.returnedCount || 0;
            }

            // â­گ ظ…ظ„ط، ظپظ„طھط± ط§ظ„ط´ظ‡ظˆط± ظپظٹ ط§ظ„طھظ‚ط§ط±ظٹط± طھظ„ظ‚ط§ط¦ظٹط§ظ‹
            buildMonthFilterOptions();

            // â­گ ط§ظ„ظ…ط¨ظƒط± ظ‡ظٹظ†طھ: ط¹ط´ط§ظ† ط§ظ„ظ„ظٹ ظپط§طھط­ ط§ظ„طھظ‚ط§ط±ظٹط± ظٹطھط­ط¯ط« ط¯ط§طھط§ظ‡ طھظ„ظ‚ط§ط¦ظٹط§ظ‹
            window.latestServerData = data;

            // â­گ ط£ط®ظپظٹ ط§ظ„ط£ظˆط±ط¯ط±ط§طھ ط§ظ„ظ…ط´ط­ظˆظ†ط© ط­طھظ‰ ظٹطھظ… ط§ط®طھظٹط§ط± ط§ظ„ظ…ظ†ط¯ظˆط¨
            let shippedCont = document.getElementById('shippedOrdersContainer');
            if (shippedCont) shippedCont.innerHTML = '<p class="empty-msg">ط¨ط±ط¬ط§ط، ط§ط®طھظٹط§ط± ط§ظ„ظ…ظ†ط¯ظˆط¨ ظˆط§ظ„ط¶ط؛ط· ط¹ظ„ظ‰ "ط¹ط±ط¶ ط§ظ„ط¹ظ‡ط¯ط©"</p>';

            renderHistoryList(orderHistoryData);
            renderShippingRoom(orderHistoryData);
            updateAdvancedDashboard(orderHistoryData);
            checkBookingAlerts();

        }).catch(err => {
            if (syncStatus) { syncStatus.innerText = "ط®ط·ط£ ط§طھطµط§ظ„"; syncStatus.style.color = "red"; }
        });
}

function checkBookingAlerts() {
    let banner = document.getElementById('booking-alert-banner');
    if (!banner) return;
    let hasAlert = window.pendingOrdersData.some(o => o.orderType && o.orderType.includes('ط­ط¬ط²'));
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
        driversMap[d.name] = { name: d.name, ordersCount: 0, cashCollected: 0, shippingFees: 0, netDue: 0, statusText: "ظ„ط§ طھظˆط¬ط¯ ظ…ط¯ظٹظˆظ†ظٹط©" };
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
        container.innerHTML = '<p class="empty-msg">ظ„ط§ طھظˆط¬ط¯ ظ…ظ†ط§ط¯ظٹط¨ ظ…ط³ط¬ظ„ط©.</p>';
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
                <strong style="font-size:0.85rem; color:var(--primary);">ًں“¦ ط£ظˆط±ط¯ط±ط§طھ ظ…ط¹ظ„ظ‚ط© (ظ„ظ… ظٹطھظ… طھط³ظˆظٹطھظ‡ط§):</strong>`;
            driverOrders.forEach(o => {
                ordersHtml += `
                    <div class="financial-order-item" style="background:#fdfdfd; padding:8px; border:1px solid #eee; border-radius:6px; margin-top:5px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span style="font-weight:bold; color:var(--text-dark);">${o.id}</span><br>
                            <span style="font-size:0.75rem; color:#777;">${o.payment} | ط¥ط¬ظ…ط§ظ„ظٹ: ${o.total}ط¬ | ط´ط­ظ†: ${o.shipping}ط¬</span><br>
                            <span style="font-size:0.85rem; font-weight:bold; color:var(--danger);">ط§ظ„ظ…ط·ظ„ظˆط¨ طھط­طµظٹظ„ظ‡: ${o.remaining}ط¬</span>
                        </div>
                        <button class="btn-settle interactive-btn" onclick="settleDriverOrder('${o.id}', this, '${o.payment}')" style="background:var(--success); color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">طھط³ظˆظٹط© ًں’¸</button>
                    </div>
                `;
            });
            ordersHtml += `</div>`;
        }

        container.innerHTML += `
            <div class="${cardClass}" style="background: #fff; padding: 15px; border-radius: 12px; border: 1px solid ${cardBorderColor}; margin-bottom: 12px; box-shadow: ${cardShadow}; opacity: ${cardOpacity}; transition: all 0.3s ease;">
                <div class="financial-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #f0f0f0; padding-bottom:8px; margin-bottom:10px;">
                    <span style="font-weight:bold; font-size:1.1rem; color:var(--text-dark);">ًں›µ ${f.name}</span>
                    <span style="font-size: 0.85rem; background:#f0f0f0; color:var(--text-dark); padding:3px 8px; border-radius:12px; font-weight:bold;">${f.ordersCount || 0} ط·ظ„ط¨</span>
                </div>
                <div class="financial-details" style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:10px;">
                    <span style="background:#e8f4f8; padding:5px 10px; border-radius:6px; color:#555;">ط§ظ„ظƒط§ط´: <strong style="color:#2980b9;">${f.cashCollected || 0}</strong> ط¬</span>
                    <span style="background:#f9ebea; padding:5px 10px; border-radius:6px; color:#555;">ط§ظ„ط´ط­ظ†: <strong style="color:#c0392b;">${f.shippingFees || 0}</strong> ط¬</span>
                </div>
                <div class="financial-status" style="background: ${statusColor}15; color: ${statusColor}; padding: 8px; border-radius: 6px; text-align:center; font-weight:bold; border: 1px dashed ${statusColor};">
                    ${f.statusText || "ظ„ط§ طھظˆط¬ط¯ ظ…ط¯ظٹظˆظ†ظٹط©"} ${netDue !== 0 ? `( ${Math.abs(netDue)} ط¬.ظ… )` : ''}
                </div>
                ${ordersHtml}
            </div>
        `;
    });
}

// â­گ ط­ظ…ط§ظٹط© طھطµظپظٹط© ط§ظ„ط£ظˆط±ط¯ط± ط¨ط±ط³ط§ظ„ط© ظˆط§ط¶ط­ط© ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ظ†ظˆط¹ ط§ظ„ط¯ظپط¹
window.settleDriverOrder = function (orderId, btn, payMethod) {
    let msg = `ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† طھط³ظˆظٹط© ط§ظ„ط£ظˆط±ط¯ط± (${orderId})طں`;
    if (payMethod.includes('ظƒط§ط´')) msg = `ظ‡ظ„ ط§ط³طھظ„ظ…طھ ط§ظ„ظ†ظ‚ط¯ظٹط© ظ…ظ† ط§ظ„ظ…ظ†ط¯ظˆط¨ ط§ظ„ط®ط§طµط© ط¨ط§ظ„ط£ظˆط±ط¯ط± (${orderId})طں`;
    else msg = `ظ‡ظ„ ظ‚ظ…طھ ط¨طµط±ظپ ط­ظ‚ ط§ظ„ط´ط­ظ† ظ„ظ„ظ…ظ†ط¯ظˆط¨ ط¹ظ† ط§ظ„ط£ظˆط±ط¯ط± (${orderId}) ط§ظ„ظ…ط¯ظپظˆط¹ ط¥ظ„ظƒطھط±ظˆظ†ظٹط§ظ‹طں`;

    if (!confirm(msg)) return;

    btn.innerText = "ط¬ط§ط±ظٹ...";
    btn.disabled = true;

    let formData = new URLSearchParams();
    formData.append('action', 'settleOrder');
    formData.append('orderId', orderId);

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("âœ… طھظ…طھ ط§ظ„ظ…ط­ط§ط³ط¨ط© ظˆطھط³ظˆظٹط© ط§ظ„ط£ظˆط±ط¯ط±!", "success");
            loadDataFromServer();
        }).catch(() => {
            showToast("â‌Œ ط­ط¯ط« ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„", "error");
            btn.innerText = "طھط³ظˆظٹط© ًں’¸";
            btn.disabled = false;
        });
};

// ==========================================
// 4. ط­ط³ط§ط¨ ط£ط¬ط§ط²ط© ط§ظ„ط¬ظ…ط¹ط© ظˆط§ظ„ط¹ط±ط¨ظˆظ† ًںڑ€
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
            let infoSpan = document.querySelector('#deliveryInfo span'); if (infoSpan) infoSpan.innerText = "ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹ ًںڈھ";
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

window.updateGovernoratesDropdown = function() {
    const govSelect = document.getElementById('governorate');
    if (!govSelect || !window.latestServerData) return;
    let data = window.latestServerData;
    let type = document.getElementById('deliveryType') ? document.getElementById('deliveryType').value : 'normal';
    
    let currentVal = govSelect.value;
    govSelect.innerHTML = '<option value="">ط§ط®طھط± ظ…ظ† ط§ظ„ظ‚ط§ط¦ظ…ط©</option>';
    
    if (type === 'gov_shipping') {
        if (data.govs && data.govs.length > 0) {
            let optgroup = document.createElement('optgroup'); optgroup.label = "ًںڑڑ ط§ظ„ظ…ط­ط§ظپط¸ط§طھ";
            data.govs.forEach(z => {
                optgroup.innerHTML += `<option value="${z.name}">${z.name} (${z.price} ط¬)</option>`;
            });
            govSelect.appendChild(optgroup);
        }
    } else {
        if (data.alex && data.alex.length > 0) {
            let optgroup = document.createElement('optgroup'); optgroup.label = "â›“ ظ…ظ†ط§ط·ظ‚ ط§ظ„ط¥ط³ظƒظ†ط¯ط±ظٹط©";
            data.alex.forEach(z => {
                optgroup.innerHTML += `<option value="${z.name}">${z.name} (${z.price} ط¬)</option>`;
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
            dateDisplay.innerText = "ط­ط³ط¨ ط§ظ„طھط§ط±ظٹط® ط§ظ„ظ…ط®طھط§ط± ًں“…";
        } else if (info.type === 'next_day') {
            dateDisplay.innerText = "طھط§ظ†ظٹ ظٹظˆظ… ًںڑڑ";
        } else {
            let exactDate = calculateDeliveryDateSkippingFriday(info.duration);
            dateDisplay.innerText = exactDate ? `ط§ظ„ظ…طھظˆظ‚ط¹: ${exactDate}` : `ط®ظ„ط§ظ„ ${info.duration}`;
        }
    }
    calculateTotal();
}
if (govSelect) govSelect.addEventListener('change', triggerGovCalc);



// ==========================================
// 5. ط³ط¬ظ„ ط§ظ„ط£ظˆط±ط¯ط±ط§طھ (ط§ظ„ط¹ط±ط¶ ط§ظ„ط°ظƒظٹ ظˆط§ظ„ط·ط¨ط§ط¹ط©)
// ==========================================
let currentHistoryPage = 1;
const ITEMS_PER_PAGE = 20;
let currentOrdersList = [];
window.searchResultsCache = []; // â­گ ظ„طھط®ط²ظٹظ† ط§ظ„ط¨ط­ط« ط¯ظˆظ† ظ…ط³ط­ ط§ظ„ط³ط¬ظ„

function renderHistoryList(orders, isLoadMore = false) {
    let container = document.getElementById('historyListContainer');
    if (!container) return;

    if (!isLoadMore) {
        container.innerHTML = '';
        currentHistoryPage = 1;
        currentOrdersList = orders;

        if (window.pendingOrdersData && window.pendingOrdersData.length > 0 && document.getElementById('orderSearchInput').value.trim() === "") {
            let pendingDiv = document.createElement('div');
            pendingDiv.innerHTML = `<h4 style="color: #e74c3c; padding-bottom: 5px; margin-bottom: 15px; font-weight: bold;">ًں”´ ط£ظˆط±ط¯ط±ط§طھ ظ„ظ… طھظڈط´ط­ظ† ط¨ط¹ط¯ (${window.pendingOrdersData.length})</h4>`;

            window.pendingOrdersData.forEach(pOrder => {
                let pType = pOrder.orderType || pOrder.type || pOrder.deliveryType || "";
                let dateHtml = `<span style="color: #e74c3c; font-weight: bold; font-size:0.85rem;">ًں“… ${pOrder.date}</span>`;
                if (pType.includes('ط­ط¬ط²') || pType === 'special_date') {
                    let resDate = pOrder.reservationDate || pOrder.expectedDate || pOrder.specialDate || pOrder.spDate;
                    if (resDate) {
                        if (resDate.toString().includes('GMT') || resDate.toString().includes('طھظˆظ‚ظٹطھ')) {
                            let d = new Date(resDate);
                            if (!isNaN(d.getTime())) resDate = `${d.getFullYear()}-${("0"+(d.getMonth()+1)).slice(-2)}-${("0"+d.getDate()).slice(-2)}`;
                        }
                        dateHtml = `<span style="color: #fff; background: #c2185b; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size:0.9rem;">ًں—“ï¸ڈ طھط³ظ„ظٹظ…: ${resDate}</span>`;
                    }
                }
                pendingDiv.innerHTML += `
                    <div class="history-item" style="border-right-color: #e74c3c; background: #fff5f5;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <strong style="font-size: 1.05rem;">${pOrder.id} | ${pOrder.name}</strong>
                            ${dateHtml}
                        </div>
                        <div style="font-size: 0.9rem; color: #555;">
                            <span>ًں“± ${pOrder.phone} | <span style="color:#000; font-weight:bold;">ًں’° ${pOrder.total} ط¬.ظ…</span></span>
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
            container.innerHTML += `<p class="empty-msg">ظ„ط§ طھظˆط¬ط¯ ط£ظˆط±ط¯ط±ط§طھ ظپظٹ ظ‡ط°ط§ ط§ظ„طھط§ط±ظٹط®.</p>`;
            return;
        }
    }

    let startIndex = (currentHistoryPage - 1) * ITEMS_PER_PAGE;
    let endIndex = startIndex + ITEMS_PER_PAGE;
    let pageOrders = currentOrdersList.slice(startIndex, endIndex);

    pageOrders.forEach(order => {
        let div = document.createElement('div');
        div.className = 'history-item';

        let statusColor = order.status === "طھظ… ط§ظ„طھظˆطµظٹظ„" ? "var(--success)" : "var(--primary)";
        if (order.status === "ظ…ط±طھط¬ط¹") statusColor = "var(--danger)";

        div.style.borderRightColor = statusColor;
        
        let typeBadge = '';
        let oType = order.orderType || order.type || order.deliveryType || "";
        if (oType.includes('طھظˆطµظٹظ„ ظ…ظ†ط²ظ„ظٹ') || oType === 'normal') {
            typeBadge = `<span style="background: #e3f2fd; color: #1565c0; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 5px;">ًںڑڑ طھظˆطµظٹظ„ ظ…ظ†ط²ظ„ظٹ</span>`;
        } else if (oType.includes('ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹') || oType === 'branch') {
            typeBadge = `<span style="background: #e8f5e9; color: #2e7d32; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 5px;">ًںڈھ ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹</span>`;
        } else if (oType.includes('ظ…ط­ط§ظپط¸ط§طھ') || oType === 'gov_shipping') {
            typeBadge = `<span style="background: #fff3e0; color: #e65100; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 5px;">ًں“¦ ط´ط­ظ† ظ…ط­ط§ظپط¸ط§طھ</span>`;
        } else if (oType.includes('ط­ط¬ط²') || oType === 'special_date') {
            let resDate = order.reservationDate || order.expectedDate || order.bookingDate || order.specialDate || order.spDate || order.date;
            if (resDate && (resDate.toString().includes('GMT') || resDate.toString().includes('طھظˆظ‚ظٹطھ'))) {
                let d = new Date(resDate);
                if (!isNaN(d.getTime())) resDate = `${d.getFullYear()}-${("0"+(d.getMonth()+1)).slice(-2)}-${("0"+d.getDate()).slice(-2)}`;
            }
            let dateText = resDate ? `طھط³ظ„ظٹظ…: ${resDate}` : 'ط­ط¬ط² ظ…ط³ط¨ظ‚';
            typeBadge = `<span style="background: #c2185b; color: #fff; padding: 3px 8px; border-radius: 6px; font-size: 0.85rem; margin-right: 5px; font-weight: bold;">ًں—“ï¸ڈ ${dateText}</span>`;
        }

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 8px; align-items: center;">
                <strong style="font-size: 1.05rem;">${order.id} | ${order.name} ${typeBadge}</strong>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="interactive-btn" onclick="shareToWhatsAppGroup('${order.id}')" style="background:none; border:none; font-size:1.3rem; cursor:pointer;" title="ظ…ط´ط§ط±ظƒط© ظ„ظ„ط¬ط±ظˆط¨">ًں“±</button>
                    <button class="interactive-btn" onclick="printHistoryOrder('${order.id}')" style="background:none; border:none; cursor:pointer;" title="ط·ط¨ط§ط¹ط© ط§ظ„ظپط§طھظˆط±ط©">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-dark);"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    </button>
                    <span style="background: ${statusColor}15; color: ${statusColor}; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">${order.status}</span>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.9rem; color: #666; background: var(--bg-body); padding: 8px; border-radius: 6px;">
                <span>âڈ° ${order.time || '--'}</span>
                <span>ًں“± ${order.phone}</span>
                <span style="font-weight:bold; color: var(--text-dark);">ًں’° ${order.total} ط¬.ظ…</span>
            </div>
        `;
        container.appendChild(div);
    });

    let oldBtn = document.getElementById('loadMoreHistoryBtn');
    if (oldBtn) oldBtn.remove();

    if (endIndex < currentOrdersList.length) {
        let btn = document.createElement('button');
        btn.id = 'loadMoreHistoryBtn';
        btn.innerText = 'â¬‡ï¸ڈ ط¹ط±ط¶ ط§ظ„ظ…ط²ظٹط¯';
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
    // â­گ Fix: String() comparison to prevent type mismatch (string vs number)
    let findFn = o => String(o.id) === String(orderId);
    let order = (window.orderHistoryData || []).find(findFn) ||
                (window.searchResultsCache || []).find(findFn) ||
                (window.pendingOrdersData || []).find(findFn) ||
                (window.suspendedOrdersData || []).find(findFn) ||
                (window.uncollectedOrdersData || []).find(findFn);
    
    if (!order) {
        alert("âڑ ï¸ڈ ط®ط·ط£: ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط·ظ„ط¨ ظ„ظ„ط·ط¨ط§ط¹ط©.");
        // â­گ Debug: log all available IDs to help trace mismatch
        console.warn("printHistoryOrder: could not find orderId =", orderId, typeof orderId);
        console.log("Available history IDs:", (window.orderHistoryData||[]).map(o=>({id:o.id,type:typeof o.id})));
        return;
    }
    console.log("Order Data:", order);

    let isOldGift = order.notes && order.notes.includes("ظ‡ط¯ظٹط©");
    let oType = order.orderType || "";

    let printLogo = document.getElementById('print-logo');
    if (printLogo) {
        let pay = order.payment || "";
        // â­گ V15.1: ظپط­طµ ط¯ظ‚ظٹظ‚ ظ„ظ†ظˆط¹ ط§ظ„ط·ظ„ط¨ - ظٹط´ظ…ظ„ ظƒظ„ طµظٹط؛ ظ…ظ…ظƒظ†ط©
        let isBranch = oType.includes('ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹') || oType === 'branch' || (order.deliveryType || '').includes('ظپط±ط¹') || (order.deliveryType || '') === 'branch';
        let isGovShipping = oType === 'gov_shipping' || oType.includes('ظ…ط­ط§ظپط¸ط§طھ') || (order.deliveryType || '') === 'gov_shipping';
        let isDigitalPay = isGovShipping || pay.includes('ط¥ظ†ط³طھط§') || pay.includes('ط§ظ†ط³طھط§ط¨ط§ظٹ') || pay.includes('ط§ظ†ط³طھط§ ط¨ط§ظٹ') || pay.includes('ظ…ط­ظپط¸ط©') || pay.includes('ظپظˆط¯ط§ظپظˆظ†') || pay.includes('طھط­ظˆظٹظ„');
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
        // â­گ V15.0: طھط·ط¨ظٹط¹ ط§ظ„ظ†طµ - ط¥ط²ط§ظ„ط© "ط¹ط§ط¯ظٹ" ظ…ظ† "طھظˆطµظٹظ„ ظ…ظ†ط²ظ„ظٹ ط¹ط§ط¯ظٹ"
        let typeStr = (oType || "ط£ظˆط±ط¯ط± طھظˆطµظٹظ„").replace("طھظˆطµظٹظ„ ظ…ظ†ط²ظ„ظٹ ط¹ط§ط¯ظٹ", "طھظˆطµظٹظ„ ظ…ظ†ط²ظ„ظٹ");
        let govStr = order.gov ? order.gov + " - " : "";
        document.getElementById('receipt-type').innerText = isOldGift ? `${govStr}${typeStr} - ًںژپ ظ‡ط¯ظٹط©` : `${govStr}${typeStr}`;
    }
    if (document.getElementById('print-date')) document.getElementById('print-date').innerText = order.date || new Date().toLocaleDateString('ar-EG');
    if (document.getElementById('print-time')) document.getElementById('print-time').innerText = order.time || '';

    let printBookingRow = document.querySelector('.print-booking-row');
    if (oType.includes('ط­ط¬ط²') || oType === 'special_date') {
        let rDate = order.reservationDate || order.expectedDate || order.specialDate || order.spDate;
        if (rDate) {
            if (printBookingRow) printBookingRow.style.display = 'block';
            if (rDate.toString().includes('GMT') || rDate.toString().includes('طھظˆظ‚ظٹطھ')) {
                let d = new Date(rDate);
                if (!isNaN(d.getTime())) rDate = `${d.getFullYear()}-${("0"+(d.getMonth()+1)).slice(-2)}-${("0"+d.getDate()).slice(-2)}`;
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

    // â­گ V14.2: ط¥ط®ظپط§ط، ط§ظ„ط¹ظ†ظˆط§ظ† ظ„ظ„ظپط±ط¹ ط¨ط±ظ…ط¬ظٹط§ظ‹ - ظ„ط§ ظٹط·ط¨ط¹ ط§ظ„ط¹ظ†ظˆط§ظ† ظ†ظ‡ط§ط¦ظٹط§ظ‹
    let printAddressRow = document.querySelector('.print-address-row');
    if (oType.includes('ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹')) {
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
                let match = line.match(/(.*) - ط§ظ„ظƒظ…ظٹط©: (\d+) \(([\d.]+)ط¬\)/);
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
        printItemsHtml = `<tr><td colspan="4">ظ„ط§ طھظˆط¬ط¯ طھظپط§طµظٹظ„</td></tr>`;
    }
    if (document.getElementById('print-items-body')) document.getElementById('print-items-body').innerHTML = printItemsHtml;

    if (document.getElementById('print-subtotal')) document.getElementById('print-subtotal').innerText = isOldGift ? "***" : (order.subtotal || order.total || 0);
    if (document.getElementById('print-discount')) document.getElementById('print-discount').innerText = isOldGift ? "***" : (order.discount || 0);

    // â­گ V15.0: ط¥ط®ظپط§ط، ط³ط·ط± ط§ظ„ط´ط­ظ† ظ„ط·ظ„ط¨ط§طھ ط§ط³طھظ„ط§ظ… ط§ظ„ظپط±ط¹ ظ†ظ‡ط§ط¦ظٹط§ظ‹
    let printShippingRow = document.querySelector('.print-shipping-row');
    if (oType.includes('ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹')) {
        if (printShippingRow) printShippingRow.style.display = 'none';
    } else {
        if (printShippingRow) printShippingRow.style.display = '';
        if (document.getElementById('print-shipping')) document.getElementById('print-shipping').innerText = isOldGift ? "***" : (order.shipping || 0);
    }

    if (parseFloat(order.deposit) > 0 && !isOldGift) {
        let depositHtml = `<p class="print-deposit-row">طھظ… ط¯ظپط¹ ط¹ط±ط¨ظˆظ†: <b><span id="print-deposit">${order.deposit}</span></b></p>`;
        document.getElementById('print-deposit-container').innerHTML = depositHtml;
        document.getElementById('print-final').innerText = order.remaining !== undefined ? order.remaining : order.total;
        if(document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "ط§ظ„ظ…طھط¨ظ‚ظٹ ظ„ظ„ط¯ظپط¹";
    } else {
        document.getElementById('print-deposit-container').innerHTML = '';
        document.getElementById('print-final').innerText = isOldGift ? "***" : order.total;
        if(document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ†ظ‡ط§ط¦ظٹ";
    }

    if (document.getElementById('print-payment')) document.getElementById('print-payment').innerText = order.payment || "";

    let sellerP = document.getElementById('print-seller-name');
    if (sellerP) sellerP.innerText = `ط§ظ„ظƒط§ط´ظٹط±: ${order.seller || 'ط؛ظٹط± ظ…ط­ط¯ط¯'}`;

    let isGovShipping = oType === 'gov_shipping' || oType.includes('ظ…ط­ط§ظپط¸ط§طھ') || (order.deliveryType || '') === 'gov_shipping' || oType.includes('ط´ط­ظ†');
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


// â­گ ط¥طµظ„ط§ط­ ظ…ط³ط­ ط§ظ„ط°ط§ظƒط±ط© ظپظٹ ظ…ط­ط±ظƒ ط§ظ„ط¨ط­ط« ط§ظ„ط´ط§ظ…ظ„
const searchBtn = document.getElementById('searchBtn');
const orderSearchInput = document.getElementById('orderSearchInput');
if (searchBtn && orderSearchInput) {
    searchBtn.addEventListener('click', () => {
        let keyword = orderSearchInput.value.trim().toLowerCase();
        if (keyword === "") {
            renderHistoryList(orderHistoryData);
        } else {
            let container = document.getElementById('historyListContainer');
            container.innerHTML = '<p class="empty-msg">ط¬ط§ط±ظٹ ط§ظ„ط¨ط­ط« ط§ظ„ط´ط§ظ…ظ„ ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ... âڈ³</p>';

            fetch(`${GOOGLE_SHEETS_URL}?action=globalSearch&query=${encodeURIComponent(keyword)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.length === 0) container.innerHTML = '<p class="empty-msg">ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط£ظˆط±ط¯ط±ط§طھ ظ…ط·ط§ط¨ظ‚ط©.</p>';
                    else {
                        window.searchResultsCache = data;
                        renderHistoryList(data);
                    }
                })
                .catch(() => {
                    container.innerHTML = '<p class="empty-msg">â‌Œ ط­ط¯ط« ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط¥ظ†طھط±ظ†طھ.</p>';
                });
        }
    });
    orderSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });
}
// ==========================================
// 6. ط¨ط­ط« ط§ظ„ظ‡ط§طھظپ ظˆط§ظ„ظ…ظ†طھط¬ط§طھ 
// ==========================================
const phoneInput = document.getElementById('customerPhone');
const phoneStatus = document.getElementById('phoneCheckStatus');

// â­گ ط¥طµظ„ط§ط­ ط°ط§ظƒط±ط© ط§ظ„ط³ظ…ظƒط©
function performPhoneSearch() {
    if (!phoneInput || !phoneStatus) return;
    let phoneVal = phoneInput.value.trim().replace(/\D/g, '');
    if (phoneVal.length >= 9) {
        phoneStatus.innerText = "âڈ³";

        let foundCustomer = null;
        if (orderHistoryData && orderHistoryData.length > 0) foundCustomer = orderHistoryData.find(o => o.phone.toString().replace(/\D/g, '').includes(phoneVal));
        if (!foundCustomer && window.pendingOrdersData && window.pendingOrdersData.length > 0) foundCustomer = window.pendingOrdersData.find(o => o.phone.toString().replace(/\D/g, '').includes(phoneVal));

        if (foundCustomer) {
            fillCustomerData(foundCustomer);
        } else {
            // ط§ظ„ط¨ط­ط« ط§ظ„ط´ط§ظ…ظ„ ط§ظ„طµط§ظ…طھ ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¹ظ…ظ„ط§ط،
            fetch(`${GOOGLE_SHEETS_URL}?action=globalSearch&query=${phoneVal}`)
                .then(res => res.json())
                .then(data => {
                    if (data.length > 0) fillCustomerData(data[0]);
                    else phoneStatus.innerText = "ًں†•";
                }).catch(() => phoneStatus.innerText = "ًں”چ");
        }
    } else {
        phoneStatus.innerText = "ًں”چ";
    }
}

function fillCustomerData(cust) {
    if (document.getElementById('customerName')) document.getElementById('customerName').value = cust.name;
    if (document.getElementById('address') && cust.address && cust.address !== 'ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹') {
        document.getElementById('address').value = cust.address;
    }
    phoneStatus.innerText = "âœ…";
    showToast(`ط£ظ‡ظ„ط§ظ‹ ط¨ط¹ظˆط¯طھظƒ ظٹط§ ${cust.name}!`, "success");
}

if (phoneStatus) phoneStatus.addEventListener('click', performPhoneSearch);
if (phoneInput) phoneInput.addEventListener('change', performPhoneSearch);

const productsContainer = document.getElementById('productsContainer');

// â­گ ط¯ط§ظ„ط© ط¥ط¶ط§ظپط© ط§ظ„ظ…ظ†طھط¬ط§طھ (ظˆط¥طµظ„ط§ط­ ظ‚ظپظ„ ط§ظ„ط®ط§ظ†ط§طھ ط¹ظ†ط¯ ط§ظ„ط§ط³طھط±ط¬ط§ط¹)
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
        <input type="text" list="smartProductsList" class="product-name-input" placeholder="ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬..." value="${nameVal}" required style="flex:3;" ${rOnly}>
        <input type="number" class="product-price-input" placeholder="ط§ظ„ط³ط¹ط±" value="${priceVal}" required style="flex:1.2; text-align:center;" ${rOnly}>
        
        <input type="number" class="product-offer-input" placeholder="ط¹ط±ط¶" style="flex:0.8; text-align:center;" ${rOnly}>

        <input type="number" class="product-qty-input" placeholder="ط§ظ„ظƒظ…ظٹط©" value="${qtyVal}" min="1" required style="flex:1; text-align:center;" ${rOnly}>
        <button type="button" class="btn-confirm-pro interactive-btn" style="flex: 0 0 36px;">âœ”ï¸ڈ</button>
        <button type="button" class="remove-product-btn interactive-btn" style="flex: 0 0 36px;">â‌Œ</button>
    `;

    wrapper.appendChild(div);
    productsContainer.appendChild(wrapper);

    let nameInput = div.querySelector('.product-name-input');
    let priceInput = div.querySelector('.product-price-input');
    let offerInput = div.querySelector('.product-offer-input');
    let qtyInput = div.querySelector('.product-qty-input');
    let confirmBtn = div.querySelector('.btn-confirm-pro');
    let removeBtn = div.querySelector('.remove-product-btn');

    if (isConfirmed) confirmBtn.innerHTML = "âœڈï¸ڈ";

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
            confirmBtn.innerHTML = "âœ”ï¸ڈ";
            nameInput.readOnly = false;
            priceInput.readOnly = false;
            offerInput.readOnly = false;
            qtyInput.readOnly = false;
        } else {
            div.classList.add('confirmed');
            confirmBtn.innerHTML = "âœڈï¸ڈ";
            calculateTotal();
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
                    if (confirm("طھظ… طھط¹ط¯ظٹظ„ ط³ط¹ط± ط§ظ„ط¹ط±ط¶ ظ„ظ€ " + currentOffer + " ظ‡ظ„ طھط±ظٹط¯ ط­ظپط¸ظ‡ ظƒط³ط¹ط± ط¹ط±ط¶ ط¯ط§ط¦ظ… ظ„ظ„ظ…ظ†طھط¬ ظˆطھظپط¹ظٹظ„ظ‡ ظپظٹ ط§ظ„ظƒطھط§ظ„ظˆط¬طں")) {
                        window.pushCatalogUpdate(cProd.name, baseP, true, currentOffer);
                        cProd.offerPrice = currentOffer;
                        cProd.isOffer = true;
                    }
                } else if (currentOffer === 0 && currentPrice !== baseP) {
                    if (confirm("طھظ… طھط¹ط¯ظٹظ„ ط§ظ„ط³ط¹ط± ط§ظ„ط£ط³ط§ط³ظٹ ظ„ظ€ " + currentPrice + " ظ‡ظ„ طھط±ظٹط¯ ط­ظپط¸ظ‡ ظƒط³ط¹ط± ط£ط³ط§ط³ظٹ ط¯ط§ط¦ظ… ظپظٹ ط§ظ„ظƒطھط§ظ„ظˆط¬طں")) {
                        window.pushCatalogUpdate(cProd.name, currentPrice, false, offerP);
                        cProd.price = currentPrice;
                        cProd.isOffer = false;
                    }
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

// â­گ ظ†ط¸ط§ظ… ط§ظ„ط¹ط±ط¨ظˆظ† ظˆط§ظ„ظ€ NaN
function calculateTotal() {
    let total = 0;
    document.querySelectorAll('.product-row.confirmed').forEach(row => {
        let price = parseFloat(row.querySelector('.product-price-input').value) || 0;
        let offer = parseFloat(row.querySelector('.product-offer-input').value) || 0;
        let finalPrice = offer > 0 ? offer : price;
        let qty = parseFloat(row.querySelector('.product-qty-input').value) || 1;
        total += (finalPrice * qty); // ظ…ط­طµظ†ط© ط¶ط¯ ط§ظ„ظ€ NaN
    });

    if (document.getElementById('productsTotal')) document.getElementById('productsTotal').value = total;
    let discount = document.getElementById('discount') ? (parseFloat(document.getElementById('discount').value) || 0) : 0;
    let shipping = document.getElementById('shippingCost') ? (parseFloat(document.getElementById('shippingCost').value) || 0) : 0;

    let finalAmount = total + shipping - discount;
    let finalDisplay = document.getElementById('finalTotalDisplay');

    if (finalDisplay) finalDisplay.innerText = finalAmount;

    // ط­ط³ط§ط¨ ط§ظ„ط¹ط±ط¨ظˆظ†
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
            hint.innerText = "* ط£ظˆط±ط¯ط± ظ‡ط¯ظٹط©: ط³ظٹطھظ… ط­ظپط¸ ط§ظ„ط³ط¹ط± ط¨ط§ظ„ط¥ظƒط³ظٹظ„ ظˆط¥ط®ظپط§ط¤ظ‡ ظپظٹ ط§ظ„ظپط§طھظˆط±ط© ط§ظ„ظ…ط·ط¨ظˆط¹ط© *";
            finalDisplay.parentNode.appendChild(hint);
        }
    } else {
        if (hint) hint.remove();
    }
}

if (document.getElementById('discount')) document.getElementById('discount').addEventListener('input', calculateTotal);
if (document.getElementById('isGiftCheckbox')) document.getElementById('isGiftCheckbox').addEventListener('change', calculateTotal);
if (document.getElementById('depositAmount')) document.getElementById('depositAmount').addEventListener('input', calculateTotal);

// â­گ ظ…ظ†ط¹ ط§ط®طھط±ط§ظ‚ ط§ظ„ظƒظٹط¨ظˆط±ط¯ ط¨ظ€ readonly ظˆ disabled
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
        if (!paymentMethod || !paymentMethod.value) { showToast("ط§ط®طھط± ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹ ط£ظˆظ„ط§ظ‹!", "error"); return; }
        if (isPaymentConfirmed) {
            isPaymentConfirmed = false; confirmPaymentBtn.classList.remove('confirmed'); confirmPaymentBtn.innerHTML = "طھط£ظƒظٹط¯ âœ”ï¸ڈ";
            paymentMethod.classList.remove('locked-field'); paymentMethod.disabled = false; toggleGlobalLock(false);
        } else {
            isPaymentConfirmed = true; confirmPaymentBtn.classList.add('confirmed'); confirmPaymentBtn.innerHTML = "طھظ… ط§ظ„طھط£ظƒظٹط¯ ًں”’";
            paymentMethod.classList.add('locked-field'); paymentMethod.disabled = true; toggleGlobalLock(true);
        }
    });
}

// ==========================================
// 7. ط§ظ„ظ…ط¹ظ„ظ‚ط§طھ 
// ==========================================

function updateSuspendedCount() {
    let count = window.suspendedOrdersData ? window.suspendedOrdersData.length : 0;
    if (document.getElementById('suspendedCount')) document.getElementById('suspendedCount').innerText = count;
}

let suspendBtn = document.getElementById('suspendBtn');
if (suspendBtn) {
    suspendBtn.addEventListener('click', () => {
        setBtnLoading(suspendBtn, true); // â­گ ظ…ظ†ط¹ طھظƒط±ط§ط± ط§ظ„ط£ظˆط±ط¯ط±ط§طھ
        let nameEl = document.getElementById('customerName'); let name = nameEl && nameEl.value ? nameEl.value : "ط¨ط¯ظˆظ† ط§ط³ظ…";
        let prods = [];
        document.querySelectorAll('.product-row').forEach(row => {
            let n = row.querySelector('.product-name-input').value, p = row.querySelector('.product-price-input').value, q = row.querySelector('.product-qty-input').value, c = row.classList.contains('confirmed');
            if (n) prods.push({ name: n, price: p, qty: q, confirmed: c });
        });

        // â­گ V14.2: Timestamp-based ID ظ„ظ…ظ†ط¹ ط§ظ„طھظƒط±ط§ط± ظ†ظ‡ط§ط¦ظٹط§ظ‹
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
                showToast("âڈ¸ï¸ڈ طھظ… طھط¹ظ„ظٹظ‚ ط§ظ„ظپط§طھظˆط±ط© ط¨ظ†ط¬ط§ط­!", "warning");
                resetForm(); updateSuspendedCount();
                setBtnLoading(suspendBtn, false, "âڈ¸ï¸ڈ طھط¹ظ„ظٹظ‚ ط§ظ„ط·ظ„ط¨");
            }).catch(() => { setBtnLoading(suspendBtn, false, "âڈ¸ï¸ڈ طھط¹ظ„ظٹظ‚ ط§ظ„ط·ظ„ط¨"); });
    });
}

let openSuspendedBtn = document.getElementById('openSuspendedBtn');
if (openSuspendedBtn) {
    openSuspendedBtn.addEventListener('click', () => {
        let drafts = window.suspendedOrdersData || []; 
        let list = document.getElementById('suspendedOrdersList'); if (!list) return;
        list.innerHTML = '';
        if (drafts.length === 0) { list.innerHTML = '<p class="empty-msg">ظ„ط§ طھظˆط¬ط¯ ط·ظ„ط¨ط§طھ ظ…ط¹ظ„ظ‚ط©</p>'; return; }

        drafts.forEach(d => {
            let div = document.createElement('div'); div.className = 'data-row'; div.style.alignItems = 'center';
            div.innerHTML = `
                <div style="flex:1;"><strong>${d.name}</strong> <br> <small style="color:#777">âڈ° ${d.time || d.date}</small></div>
                <div style="display:flex; gap:5px;">
                    <button class="btn-search interactive-btn restore-btn" style="padding: 5px 10px; font-size:0.8rem">ط§ط³طھط±ط¬ط§ط¹ ًں”„</button>
                    <button class="interactive-btn delete-btn" style="padding: 5px 10px; font-size:0.8rem; background-color:var(--danger); color:white; border:none; border-radius:8px; cursor:pointer;">ط­ط°ظپ â‌Œ</button>
                </div>
            `;
            div.querySelector('.restore-btn').addEventListener('click', () => {
                restoreDraft(d); deleteSuspendedDraft(d.id); document.getElementById('suspendedModal').classList.remove('active');
            });
            div.querySelector('.delete-btn').addEventListener('click', () => {
                deleteSuspendedDraft(d.id); div.remove();
                if (list.children.length === 0) list.innerHTML = '<p class="empty-msg">ظ„ط§ طھظˆط¬ط¯ ط·ظ„ط¨ط§طھ ظ…ط¹ظ„ظ‚ط©</p>';
                showToast("ًں—‘ï¸ڈ طھظ… ط­ط°ظپ ط§ظ„ظ…ط³ظˆط¯ط©", "success");
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
                let match = line.match(/(.*) - ط§ظ„ظƒظ…ظٹط©: (\d+)/);
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
    showToast("âœ… طھظ… ط§ط³طھط±ط¬ط§ط¹ ط§ظ„ظپط§طھظˆط±ط©!", "success");
}

function resetForm() {
    let form = document.getElementById('orderForm'); if (form) form.reset();
    let infoSpan = document.querySelector('#deliveryInfo span'); if (infoSpan) infoSpan.innerText = "--";
    let finalDisplay = document.getElementById('finalTotalDisplay'); if (finalDisplay) finalDisplay.innerText = "0";
    let remDisplay = document.getElementById('remainingAmountDisplay'); if (remDisplay) remDisplay.innerText = "0";

    if (productsContainer) { productsContainer.innerHTML = ''; addProductRow(); }
    isPaymentConfirmed = false;
    if (confirmPaymentBtn) { confirmPaymentBtn.classList.remove('confirmed'); confirmPaymentBtn.innerHTML = "طھط£ظƒظٹط¯ âœ”ï¸ڈ"; }
    if (paymentMethod) { paymentMethod.classList.remove('locked-field'); paymentMethod.disabled = false; }
    toggleGlobalLock(false);
    if (deliveryTypeSelect) deliveryTypeSelect.dispatchEvent(new Event('change'));
    if (phoneStatus) phoneStatus.innerText = "ًں”چ";
    let hint = document.getElementById('giftHint'); if (hint) hint.remove();
}

// ==========================================
// 8. ط¥ط±ط³ط§ظ„ ط§ظ„ظˆط§طھط³ط§ط¨
// ==========================================
let whatsappReviewBtn = document.getElementById('whatsappReviewBtn');
if (whatsappReviewBtn) {
    whatsappReviewBtn.addEventListener('click', () => {
        let nameEl = document.getElementById('customerName'); let name = nameEl ? nameEl.value.trim() : "";
        let phoneEl = document.getElementById('customerPhone'); let phone = phoneEl ? phoneEl.value.trim() : "";
        let addressEl = document.getElementById('address'); let address = addressEl ? addressEl.value.trim() : "";
        
        let hasMissingData = false;
        
        let displayPhone = phone;
        if (!displayPhone) {
            displayPhone = "(ظ…ط·ظ„ظˆط¨)";
            hasMissingData = true;
        } else if (displayPhone.startsWith('0')) {
            displayPhone = '+2' + displayPhone;
        }

        let displayName = name;
        if (!displayName) {
            displayName = "(ظ…ط·ظ„ظˆط¨)";
            hasMissingData = true;
        }

        let displayAddress = address;
        if (!displayAddress) {
            displayAddress = "(ظ…ط·ظ„ظˆط¨ ظ„طھط­ط¯ظٹط¯ طھظƒظ„ظپط© ط§ظ„ط´ط­ظ†)";
            hasMissingData = true;
        }

        let expectedDateText = document.querySelector('#deliveryInfo span') ? document.querySelector('#deliveryInfo span').innerText : "";
        if (deliveryTypeSelect && deliveryTypeSelect.value === 'special_date') expectedDateText = document.getElementById('specialDateInput') ? document.getElementById('specialDateInput').value : "";

        let productsText = "";
        document.querySelectorAll('.product-row.confirmed').forEach(row => {
            let n = row.querySelector('.product-name-input').value, p = row.querySelector('.product-price-input').value, q = row.querySelector('.product-qty-input').value;
            productsText += `- ${n} (ط§ظ„ط³ط¹ط±: ${parseFloat(p) || 0}ط¬) - ط§ظ„ظƒظ…ظٹط©: ${q} - ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ: ${(parseFloat(p) || 0) * (parseFloat(q) || 1)} ط¬.ظ…\n`;
        });
        if (productsText === "") productsText = "ظ„ظ… ظٹطھظ… طھط£ظƒظٹط¯ ط£ظٹ ظ…ظ†طھط¬ط§طھ.\n";

        let productsTotal = document.getElementById('productsTotal') ? document.getElementById('productsTotal').value || 0 : 0;

        let message = `ط£ظ‡ظ„ط§ظ‹ ط¨ظƒ ظپظٹ ظƒط§ظ†ط¯ظٹ ظƒظ„ظˆط¨ ًںچ¬\nظٹط±ط¬ظ‰ ظ…ط±ط§ط¬ط¹ط© طھظپط§طµظٹظ„ ط·ظ„ط¨ظƒ:\n\nًں‘¤ ط§ظ„ط§ط³ظ…: ${displayName}\nًں“± ط§ظ„ظ…ظˆط¨ط§ظٹظ„: ${displayPhone}\nًں“چ ط§ظ„ط¹ظ†ظˆط§ظ†: ${displayAddress}\n\nًں›’ طھظپط§طµظٹظ„ ط§ظ„ط·ظ„ط¨:\n${productsText}\n`;
        message += `ًں›چï¸ڈ ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ظ†طھط¬ط§طھ: ${productsTotal} ط¬.ظ…\n`;
        
        let discountValue = document.getElementById('discount') ? parseFloat(document.getElementById('discount').value) || 0 : 0;
        if (discountValue > 0) {
            message += `ًںڈ·ï¸ڈ ط§ظ„ط®طµظ…: ${discountValue} ط¬.ظ…\n`;
        }

        message += `ًںڑڑ ط§ظ„ط´ط­ظ†: ${document.getElementById('shippingCost') ? document.getElementById('shippingCost').value || 0 : 0} ط¬.ظ…\n`;
        message += `ًں’° ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط³طھط­ظ‚: ${document.getElementById('finalTotalDisplay') ? document.getElementById('finalTotalDisplay').innerText : 0} ط¬.ظ…\n\n`;
        
        if (hasMissingData) {
            message += `ظٹط±ط¬ظ‰ ظ…ظ„ط، ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ†ط§ظ‚طµط© ط¨ط§ظ„ط£ط¹ظ„ظ‰ ظˆط§ظ„ط±ط¯ ط¨ظƒظ„ظ…ط© (طھظ…ط§ظ…) ظ„طھط£ظƒظٹط¯ ط§ظ„ط£ظˆط±ط¯ط± ًں¤‌`;
        } else {
            message += `ظٹط±ط¬ظ‰ ط§ظ„ط±ط¯ ط¨ظƒظ„ظ…ط© (طھظ…ط§ظ…) ظ„طھط£ظƒظٹط¯ ط§ظ„ط£ظˆط±ط¯ط± ًں¤‌`;
        }

        let waPhone = phone.replace(/\D/g, '');
        if (waPhone.startsWith('0')) waPhone = '2' + waPhone;
        window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, '_blank');
    });
}

// ==========================================
// 9. ط§ظ„ط­ظپط¸ ظˆط§ظ„ط·ط¨ط§ط¹ط© 
// ==========================================
let saveAndPrintBtn = document.getElementById('saveAndPrintBtn');
if (saveAndPrintBtn) {
    saveAndPrintBtn.addEventListener('click', () => {
        if (document.querySelectorAll('.product-row:not(.confirmed)').length > 0) { showToast("ظ‚ظ… ط¨طھط£ظƒظٹط¯ (âœ”ï¸ڈ) ط§ظ„ظ…ظ†طھط¬ط§طھ ط£ظˆظ„ط§ظ‹!", "error"); return; }

        let isGift = document.getElementById('isGiftCheckbox') ? document.getElementById('isGiftCheckbox').checked : false;

        let productsListText = "", printItemsHtml = "";
        document.querySelectorAll('.product-row.confirmed').forEach(row => {
            let n = row.querySelector('.product-name-input').value;
            let p = parseFloat(row.querySelector('.product-price-input').value) || 0;
            let oVal = parseFloat(row.querySelector('.product-offer-input').value) || 0;
            let q = parseFloat(row.querySelector('.product-qty-input').value) || 1;
            
            let finalPrice = oVal > 0 ? oVal : p;
            let rowTotal = finalPrice * q;
            
            productsListText += `${n} - ط§ظ„ظƒظ…ظٹط©: ${q} (${rowTotal}ط¬)\n`;

            let nDisplay = n;
            let printP = isGift ? "***" : finalPrice;
            let printTotal = isGift ? "***" : rowTotal;
            printItemsHtml += `<tr><td>${nDisplay}</td><td>${printP}</td><td>${q}</td><td>${printTotal}</td></tr>`;
        });

        if (productsListText === "") { showToast("ظ„ط§ ظٹظ…ظƒظ† ط­ظپط¸ ط£ظˆط±ط¯ط± ط¨ط¯ظˆظ† ظ…ظ†طھط¬ط§طھ!", "error"); return; }
        if (!isPaymentConfirmed) { showToast("طھط£ظƒظٹط¯ ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹ ًں”’", "error"); return; }

        let phone = document.getElementById('customerPhone') ? document.getElementById('customerPhone').value.trim() : "";
        let name = document.getElementById('customerName') ? document.getElementById('customerName').value : "";
        let gov = document.getElementById('governorate') ? document.getElementById('governorate').value : "";
        let delType = deliveryTypeSelect ? deliveryTypeSelect.value : "";
        let addressVal = document.getElementById('address') ? document.getElementById('address').value.trim() : "";

        let moderatorSelect = document.getElementById('moderatorSelect');
        let selectedModerator = moderatorSelect ? moderatorSelect.value : "";
        if (!selectedModerator) { showToast("ظٹط±ط¬ظ‰ ط§ط®طھظٹط§ط± ط§ط³ظ… ط§ظ„ظ…ط³ط¤ظˆظ„ ط¹ظ† ط§ظ„ط£ظˆط±ط¯ط±!", "error"); return; }

        if (!phone || phone.length < 9) { showToast("ط±ظ‚ظ… ط§ظ„ظ…ظˆط¨ط§ظٹظ„ ط؛ظٹط± طµط­ظٹط­!", "error"); return; }
        if (!name) { showToast("ط§ظƒطھط¨ ط§ط³ظ… ط§ظ„ط¹ظ…ظٹظ„!", "error"); return; }
        if (delType === 'normal' && !gov) { showToast("ط§ط®طھط± ط§ظ„ظ…ط­ط§ظپط¸ط©!", "error"); return; }
        if (delType !== 'branch' && addressVal === "") { showToast("ط¨ط±ط¬ط§ط، ظƒطھط§ط¨ط© ط§ظ„ط¹ظ†ظˆط§ظ† ط¨ط§ظ„طھظپطµظٹظ„ ط£ظˆظ„ط§ظ‹!", "error"); return; }

        setBtnLoading(saveAndPrintBtn, true);

        let finalExpDate = document.querySelector('#deliveryInfo span') ? document.querySelector('#deliveryInfo span').innerText : "";
        let bookingDatePrint = "";
        if (delType === 'special_date') {
            finalExpDate = document.getElementById('specialDateInput') ? document.getElementById('specialDateInput').value : "";
            bookingDatePrint = finalExpDate;
        }

        let finalNotes = document.getElementById('notes') ? document.getElementById('notes').value : "";
        if (isGift) finalNotes = "ًںژپ ط£ظˆط±ط¯ط± ظ‡ط¯ظٹط© - " + finalNotes;

        let finalTotalVal = document.getElementById('finalTotalDisplay') ? document.getElementById('finalTotalDisplay').innerText : 0;

        // â­گ ط¥ط¶ط§ظپط© ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¹ط±ط¨ظˆظ†
        let dep = document.getElementById('depositAmount') ? (parseFloat(document.getElementById('depositAmount').value) || 0) : 0;
        let rem = document.getElementById('remainingAmountDisplay') ? parseFloat(document.getElementById('remainingAmountDisplay').innerText) : finalTotalVal;

        let orderTypeLabel = deliveryTypeSelect ? deliveryTypeSelect.options[deliveryTypeSelect.selectedIndex].text : "طھظˆطµظٹظ„";

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
                showToast("âœ… طھظ… ط­ظپط¸ ط§ظ„ط£ظˆط±ط¯ط± ط¨ظ†ط¬ط§ط­!", "success");

                let isGovShipping = orderTypeLabel === 'gov_shipping' || orderTypeLabel.includes('ظ…ط­ط§ظپط¸ط§طھ') || delType === 'gov_shipping';
                if (isGovShipping) {
                    document.body.classList.add('print-gov-shipping');
                } else {
                    document.body.classList.remove('print-gov-shipping');
                }

                let govStr = gov ? gov + " - " : "";
                if (document.getElementById('receipt-type')) document.getElementById('receipt-type').innerText = isGift ? `${govStr}${orderTypeLabel} - ًںژپ ظ‡ط¯ظٹط©` : `${govStr}${orderTypeLabel}`;

                let printLogo = document.getElementById('receiptLogo') || document.getElementById('print-logo');
                if (printLogo) {
                    let payVal = paymentMethod ? paymentMethod.value : "";
                    if (orderTypeLabel.includes("ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹")) {
                        printLogo.src = "images/logo-branch.png";
                    } else if (isGovShipping || (parseFloat(rem) === 0 && (payVal.includes("ط¥ظ†ط³طھط§") || payVal.includes("ط§ظ†ط³طھط§ط¨ط§ظٹ") || payVal.includes("ظ…ط­ظپط¸ط©") || payVal.includes("ظپظˆط¯ط§ظپظˆظ†")))) {
                        printLogo.src = "images/logo-digital.png";
                    } else {
                        printLogo.src = "images/logo-cash.png";
                    }
                    printLogo.style.display = 'block';
                }

                if (document.getElementById('print-date')) document.getElementById('print-date').innerText = new Date().toLocaleDateString('ar-EG');
                if (document.getElementById('print-time')) document.getElementById('print-time').innerText = new Date().toLocaleTimeString('ar-EG');

                if (bookingDatePrint && (orderTypeLabel.includes('ط­ط¬ط²') || orderTypeLabel === 'special_date')) {
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
                    let depositHtml = `<p class="print-deposit-row">طھظ… ط¯ظپط¹ ط¹ط±ط¨ظˆظ†: <b><span id="print-deposit">${dep}</span></b></p>`;
                    document.getElementById('print-deposit-container').innerHTML = depositHtml;
                    document.getElementById('print-final').innerText = rem;
                    if(document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "ط§ظ„ظ…طھط¨ظ‚ظٹ ظ„ظ„ط¯ظپط¹";
                } else {
                    document.getElementById('print-deposit-container').innerHTML = '';
                    document.getElementById('print-final').innerText = isGift ? "***" : finalTotalVal;
                    if(document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ†ظ‡ط§ط¦ظٹ";
                }

                if (document.getElementById('print-payment')) document.getElementById('print-payment').innerText = paymentMethod ? paymentMethod.value : "";

                let sellerP = document.getElementById('print-seller-name');
                if (sellerP) sellerP.innerText = `ط§ظ„ظƒط§ط´ظٹط±: ${selectedModerator}`;

                let qrImg = document.querySelector('img[alt="QR Code"]');
                if (qrImg) qrImg.src = 'images/qr-code.png';

                setTimeout(() => {
                    window.print();
                    document.body.classList.remove('print-gov-shipping');
                    resetForm();
                    setBtnLoading(saveAndPrintBtn, false, "ًں’¾ ط­ظپط¸ ظˆط·ط¨ط§ط¹ط© ط§ظ„ظپط§طھظˆط±ط©");
                    loadDataFromServer();
                }, 1000);

            }).catch(() => {
                showToast("â‌Œ ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط¥ظ†طھط±ظ†طھ", "error");
                setBtnLoading(saveAndPrintBtn, false, "ًں’¾ ط­ظپط¸ ظˆط·ط¨ط§ط¹ط© ط§ظ„ظپط§طھظˆط±ط©");
            });
    });
}

// ==========================================
// 10. ط§ظ„ط¥ط¶ط§ظپط©طŒ ط§ظ„طھط¹ط¯ظٹظ„طŒ ظˆط§ظ„ط­ط°ظپ 
// ==========================================

window.deleteItem = function (action, name, zoneType = '') {
    if (!confirm(`ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط­ط°ظپ (${name}) ظ†ظ‡ط§ط¦ظٹط§ظ‹طں`)) return;
    let formData = new URLSearchParams();
    formData.append('action', action);
    formData.append('name', name);
    if (zoneType) formData.append('zoneType', zoneType);

    showToast("âڈ³ ط¬ط§ط±ظٹ ط§ظ„ط­ط°ظپ...", "warning");
    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("âœ… طھظ… ط§ظ„ط­ط°ظپ ط¨ظ†ط¬ط§ط­!", "success");
            loadDataFromServer();
        });
};

window.editZoneUI = function (name, price, type, duration) {
    if (document.getElementById('newZoneName')) document.getElementById('newZoneName').value = name;
    if (document.getElementById('newZonePrice')) document.getElementById('newZonePrice').value = price;
    if (document.getElementById('newZoneType')) document.getElementById('newZoneType').value = type;
    if (document.getElementById('newZoneDuration')) document.getElementById('newZoneDuration').value = duration;
    showToast("ظ‚ظ… ط¨طھط¹ط¯ظٹظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ ظˆط§ط¶ط؛ط· ط­ظپط¸", "success");
};

window.editDriverUI = function (name, phone) {
    if (document.getElementById('newDriverName')) document.getElementById('newDriverName').value = name;
    if (document.getElementById('newDriverPhone')) document.getElementById('newDriverPhone').value = phone;
    showToast("ظ‚ظ… ط¨طھط¹ط¯ظٹظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ ظˆط§ط¶ط؛ط· ط­ظپط¸", "success");
};

let newZoneTypeEl = document.getElementById('newZoneType');
let newZoneDurationEl = document.getElementById('newZoneDuration');
if (newZoneTypeEl && newZoneDurationEl) {
    newZoneTypeEl.addEventListener('change', () => {
        if (newZoneTypeEl.value === 'next_day') {
            newZoneDurationEl.value = 'طھط§ظ†ظٹ ظٹظˆظ…';
            newZoneDurationEl.setAttribute('readonly', true);
        } else if (newZoneTypeEl.value === 'gov') {
            newZoneDurationEl.value = 'ظ…ظ† 3 ظ„ظ€ 4 ط£ظٹط§ظ…';
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
        if (!name || !price) { showToast("ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ†ط§ظ‚طµط©!", "error"); return; }

        let isExisting = shippingData[name] !== undefined;
        if (isExisting && shippingData[name].price == price) {
            showToast("ط§ظ„ظ…ظ†ط·ظ‚ط© ط¯ظٹ ظ…ط³ط¬ظ„ط© ظ…ط³ط¨ظ‚ط§ظ‹", "warning"); return;
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
                showToast(`âœ… طھظ… ${isExisting ? 'طھط¹ط¯ظٹظ„' : 'ط¥ط¶ط§ظپط©'} ط§ظ„ظ…ظ†ط·ظ‚ط©!`, "success");
                setBtnLoading(addZoneBtnAction, false, "ط­ظپط¸ ط§ظ„ظ…ظ†ط·ظ‚ط©");
                document.getElementById('newZoneName').value = ""; document.getElementById('newZonePrice').value = ""; document.getElementById('newZoneDuration').value = "";
                loadDataFromServer();
            }).catch(() => { setBtnLoading(addZoneBtnAction, false, "ط­ظپط¸ ط§ظ„ظ…ظ†ط·ظ‚ط©"); });
    });
}

let addDriverBtnAction = document.getElementById('addDriverBtn');
if (addDriverBtnAction) {
    addDriverBtnAction.addEventListener('click', () => {
        let name = document.getElementById('newDriverName') ? document.getElementById('newDriverName').value.trim() : "";
        let phone = document.getElementById('newDriverPhone') ? document.getElementById('newDriverPhone').value : "";
        if (!name || !phone) { showToast("ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ†ط§ظ‚طµط©!", "error"); return; }

        let driverSelectEl = document.getElementById('driverNameSelect') || document.getElementById('assignDriverSelect');
        let isExisting = driverSelectEl ? Array.from(driverSelectEl.options).some(o => o.value === name) : false;

        setBtnLoading(addDriverBtnAction, true);
        let formData = new URLSearchParams();
        formData.append('action', isExisting ? 'editDriver' : 'addDriver');
        formData.append('name', name);
        formData.append('phone', phone);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast(`âœ… طھظ… ${isExisting ? 'طھط¹ط¯ظٹظ„' : 'ط¥ط¶ط§ظپط©'} ط§ظ„ظ…ظ†ط¯ظˆط¨!`, "success");
                setBtnLoading(addDriverBtnAction, false, "ط­ظپط¸ ط§ظ„ظ…ظ†ط¯ظˆط¨");
                document.getElementById('newDriverName').value = ""; document.getElementById('newDriverPhone').value = "";
                loadDataFromServer();
            }).catch(() => { setBtnLoading(addDriverBtnAction, false, "ط­ظپط¸ ط§ظ„ظ…ظ†ط¯ظˆط¨"); });
    });
}

let addModeratorBtn = document.getElementById('addModeratorBtn');
if (addModeratorBtn) {
    addModeratorBtn.addEventListener('click', () => {
        let nameInput = document.getElementById('newModeratorName');
        let name = nameInput ? nameInput.value.trim() : "";
        if (!name) { showToast("ط§ظƒطھط¨ ط§ط³ظ… ط§ظ„ظƒط§ط´ظٹط± ط£ظˆظ„ط§ظ‹", "error"); return; }

        setBtnLoading(addModeratorBtn, true);
        let formData = new URLSearchParams();
        formData.append('action', 'addModerator');
        formData.append('name', name);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("âœ… طھظ… ط¥ط¶ط§ظپط© ط§ظ„ظƒط§ط´ظٹط± ط¨ظ†ط¬ط§ط­", "success");
                setBtnLoading(addModeratorBtn, false, "ط¥ط¶ط§ظپط©");
                nameInput.value = "";
                loadDataFromServer();
            }).catch(() => { setBtnLoading(addModeratorBtn, false, "ط¥ط¶ط§ظپط©"); });
    });
}



// ==========================================
// 11. ط؛ط±ظپط© ط¹ظ…ظ„ظٹط§طھ ط§ظ„ط´ط­ظ† ظˆط§ظ„ط¯ط§ط´ط¨ظˆط±ط¯
// ==========================================
function renderShippingRoom(history) {
    const pendingContainer = document.getElementById('pendingOrdersContainer');
    const branchContainer = document.getElementById('branchOrdersContainer');
    const resContainer = document.getElementById('reservationsContainer');

    if (pendingContainer && resContainer) {
        const pendingOrders = window.pendingOrdersData.filter(o => o.orderType !== 'ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹' && (!o.orderType || !o.orderType.includes('ط­ط¬ط²')));
        const resOrders = window.pendingOrdersData.filter(o => o.orderType && o.orderType.includes('ط­ط¬ط²'));

        pendingContainer.innerHTML = '';
        if (pendingOrders.length === 0) pendingContainer.innerHTML = '<p class="empty-msg">ظ„ط§ ظٹظˆط¬ط¯ ط£ظˆط±ط¯ط±ط§طھ ط´ط­ظ† ظ‚ظٹط¯ ط§ظ„طھط¬ظ‡ظٹط².</p>';
        else pendingOrders.forEach(o => {
            pendingContainer.innerHTML += `
                <div class="order-checkbox-row">
                    <input type="checkbox" class="order-checkbox pending-checkbox" value="${o.id}">
                    <div class="order-details-compact">
                        <span class="order-id-name">${o.id} | ${o.name}</span>
                        <span class="order-address-price">ًں“± ${o.phone} | ًں’° ${o.total} ط¬.ظ…</span>
                    </div>
                </div>`;
        });

        resContainer.innerHTML = '';
        if (resOrders.length === 0) resContainer.innerHTML = '<p class="empty-msg">ظ„ط§ ظٹظˆط¬ط¯ ط­ط¬ظˆط²ط§طھ ظ‚ط§ط¯ظ…ط©.</p>';
        else resOrders.forEach(o => {
            resContainer.innerHTML += `
                <div class="financial-order-item" style="border-right: 4px solid var(--primary); margin-bottom: 10px; padding: 10px; background: #fff; border-radius: 8px; border: 1px solid #eee;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div>
                            <span style="font-weight:bold;">${o.id} | ${o.name}</span><br>
                            <span style="font-size:0.85rem; color:var(--primary); font-weight: bold;">ًں“… ${o.date} | ًں“± ${o.phone}</span><br>
                            <span style="font-size:0.75rem; color:#777;">ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ: ${o.total}ط¬ | ط§ظ„ظ…طھط¨ظ‚ظٹ: <span style="color:var(--danger); font-weight:bold;">${o.remaining}ط¬</span></span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-settle interactive-btn" style="flex: 1; padding: 8px; font-size: 0.85rem; border-radius: 6px; border: none; background: var(--success); color: white; font-weight: bold;" onclick="settleBranchOrder('${o.id}', this)">طھظ… ط§ظ„طھط³ظ„ظٹظ… âœ…</button>
                        <button class="interactive-btn" style="flex: 1.5; padding: 8px; font-size: 0.85rem; border-radius: 6px; border: none; background: var(--secondary); color: white; font-weight: bold;" onclick="convertToNormalDelivery('${o.id}', this)">طھط­ظˆظٹظ„ ظ„طھظˆطµظٹظ„ ط¹ط§ط¯ظٹ ًںڑڑ</button>
                    </div>
                </div>`;
        });
    }

    // â­گ ظ‚ط³ظ… ط£ظˆط±ط¯ط±ط§طھ ط§ظ„ظپط±ط¹ (ط§ظ„ظ…ظ†ظپطµظ„ط© طھظ…ط§ظ…ط§ظ‹ ط¹ظ† ط§ظ„ظ…ظ†ط¯ظˆط¨ظٹظ†)
    if (branchContainer) {
        const branchOrders = window.pendingOrdersData.filter(o => o.orderType === 'ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹');
        branchContainer.innerHTML = '';
        if (branchOrders.length === 0) branchContainer.innerHTML = '<p class="empty-msg">ظ„ط§ ظٹظˆط¬ط¯ ط£ظˆط±ط¯ط±ط§طھ ط§ط³طھظ„ط§ظ… ظپط±ط¹ ط­ط§ظ„ظٹط§ظ‹.</p>';
        else branchOrders.forEach(o => {
            branchContainer.innerHTML += `
                <div class="financial-order-item" style="border-right: 4px solid var(--warning);">
                    <div>
                        <span style="font-weight:bold;">${o.id} | ${o.name}</span><br>
                        <span style="font-size:0.75rem; color:#777;">ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ: ${o.total}ط¬ | ط§ظ„ظ…طھط¨ظ‚ظٹ ظ„ظ„ط¯ظپط¹: <span style="color:var(--danger); font-weight:bold;">${o.remaining}ط¬</span></span>
                    </div>
                    <button class="btn-settle interactive-btn" onclick="settleBranchOrder('${o.id}', this)">طھظ… ط§ظ„طھط³ظ„ظٹظ… âœ…</button>
                </div>`;
        });
    }
}

// â­گ ط¯ط§ظ„ط© طھط³ظ„ظٹظ… ط§ظ„ظپط±ط¹ ط§ظ„ظپظˆط±ظٹط©
window.settleBranchOrder = function (orderId, btn) {
    let order = window.pendingOrdersData.find(o => o.id === orderId);
    let amountPaidText = prompt('ط§ظ„ط±ط¬ط§ط، ط¥ط¯ط®ط§ظ„ ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…ط¯ظپظˆط¹ ظ„ط§ط³طھظ„ط§ظ… ط§ظ„ظپط±ط¹:', order ? order.remaining : 0);
    if (amountPaidText === null) return; 

    setBtnLoading(btn, true);
    let formData = new URLSearchParams();
    formData.append('action', 'updateOrderStatus');
    formData.append('orderId', orderId);
    formData.append('status', 'طھظ… ط§ظ„طھظˆطµظٹظ„ ظˆظ…ظڈط­ط§ط³ط¨');

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast(`âœ… طھظ… ط§ظ„طھط³ظ„ظٹظ… ظˆطھطµظپظٹط© ظ…ط¨ظ„ط؛ (${amountPaidText} ط¬.ظ…) ط¨ظ†ط¬ط§ط­!`, "success");
            loadDataFromServer();
        }).catch(() => setBtnLoading(btn, false, "طھظ… ط§ظ„طھط³ظ„ظٹظ… âœ…"));
};

// â­گ ط¯ط§ظ„ط© طھط­ظˆظٹظ„ ط§ظ„ط­ط¬ط² ظ„طھظˆطµظٹظ„ ط¹ط§ط¯ظٹ
window.convertToNormalDelivery = function (orderId, btn) {
    if (!confirm('ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† طھط­ظˆظٹظ„ ظ‡ط°ط§ ط§ظ„ط­ط¬ط² ط¥ظ„ظ‰ طھظˆطµظٹظ„ ظپظˆط±ظٹ ط¹ط§ط¯ظٹطں')) return;

    setBtnLoading(btn, true);
    let formData = new URLSearchParams();
    formData.append('action', 'updateOrderStatus');
    formData.append('orderId', orderId);
    formData.append('status', 'ظ‚ظٹط¯ ط§ظ„طھط¬ظ‡ظٹط²');
    formData.append('orderType', 'طھظˆطµظٹظ„ ظ…ظ†ط²ظ„ظٹ ط¹ط§ط¯ظٹ');

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("âœ… طھظ… ط§ظ„طھط­ظˆظٹظ„ ظ„طھظˆطµظٹظ„ ظپظˆط±ظٹ ط¨ظ†ط¬ط§ط­!", "success");
            loadDataFromServer();
        }).catch(() => setBtnLoading(btn, false, "طھط­ظˆظٹظ„ ظ„طھظˆطµظٹظ„ ط¹ط§ط¯ظٹ ًںڑڑ"));
};

// â­گ ط­ظ…ط§ظٹط© ط²ط±ط§ط± (طھظ‚ظپظٹظ„ ط§ظ„ظ…ظ†ط¯ظˆط¨ظٹظ†)
const loadDriverOrdersBtn = document.getElementById('loadDriverOrdersBtn');
const shippedContainer = document.getElementById('shippedOrdersContainer');

if (loadDriverOrdersBtn && shippedContainer) {
    loadDriverOrdersBtn.addEventListener('click', () => {
        const driver = document.getElementById('closeDriverSelect').value;
        if (!driver) {
            showToast("ط§ظ„ط±ط¬ط§ط، ط§ط®طھظٹط§ط± ط§ظ„ظ…ظ†ط¯ظˆط¨ ط£ظˆظ„ط§ظ‹!", "error");
            shippedContainer.innerHTML = '<p class="empty-msg">ط¨ط±ط¬ط§ط، ط§ط®طھظٹط§ط± ط§ظ„ظ…ظ†ط¯ظˆط¨ ظˆط§ظ„ط¶ط؛ط· ط¹ظ„ظ‰ "ط¹ط±ط¶ ط§ظ„ط¹ظ‡ط¯ط©"</p>';
            return;
        }

        shippedContainer.innerHTML = '<p class="empty-msg">âڈ³ ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط¹ظ‡ط¯ط© ط§ظ„ظ…ظ†ط¯ظˆط¨...</p>';

        // â­گ Fix: ط§ط³طھط®ط¯ط§ظ… shippedOrders ط§ظ„ظ…ط±ط³ظ„ط© ظ…ظ† ط§ظ„ط¥ظƒط³ظٹظ„ ظ…ط¨ط§ط´ط±ط©
        let shippedOrders = [];
        if (window.latestServerData && window.latestServerData.shippedOrders) {
            shippedOrders = window.latestServerData.shippedOrders.filter(o => o.driver === driver);
        }

        if (shippedOrders.length === 0) {
            shippedContainer.innerHTML = '<p class="empty-msg">ظ„ط§ طھظˆط¬ط¯ ط£ظˆط±ط¯ط±ط§طھ ظپظٹ ط§ظ„ط´ط­ظ† ظ„ظ‡ط°ط§ ط§ظ„ظ…ظ†ط¯ظˆط¨ ط­ط§ظ„ظٹط§ظ‹.</p>';
        } else {
            renderDriverShippedOrders(shippedOrders, shippedContainer);
        }
    });
}

// â­گ ط¯ط§ظ„ط© ظ…ط³ط§ط¹ط¯ط© ظ„ط¹ط±ط¶ ط£ظˆط±ط¯ط±ط§طھ ط§ظ„ظ…ظ†ط¯ظˆط¨ ط§ظ„ظ…ط´ط­ظˆظ†ط©
function renderDriverShippedOrders(shippedOrders, container) {
    container.innerHTML = '';
    if (shippedOrders.length === 0) {
        container.innerHTML = '<p class="empty-msg">ظ„ط§ طھظˆط¬ط¯ ط£ظˆط±ط¯ط±ط§طھ ظپظٹ ط§ظ„ط´ط­ظ† ظ„ظ‡ط°ط§ ط§ظ„ظ…ظ†ط¯ظˆط¨.</p>';
    } else {
        shippedOrders.forEach(o => {
            container.innerHTML += `
                <div class="order-checkbox-row">
                    <input type="checkbox" class="order-checkbox shipped-checkbox" value="${o.id}">
                    <div class="order-details-compact">
                        <span class="order-id-name">${o.id} | ${o.name}</span>
                        <span class="order-address-price">ًں“± ${o.phone} | ًں’° ${o.remaining} ط¬.ظ…</span>
                    </div>
                </div>`;
        });
    }
}

function processStatusUpdate(btn, checkboxesClass, newStatus, driverName = "") {
    const selected = Array.from(document.querySelectorAll(`.${checkboxesClass}:checked`)).map(cb => cb.value);
    if (selected.length === 0) { showToast("ط­ط¯ط¯ ط£ظˆط±ط¯ط± ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„!", "warning"); return; }

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
                    showToast(`âœ… طھظ… ط§ظ„طھط­ط¯ظٹط« ظ„ظ€ "${newStatus}"`, "success");
                    setBtnLoading(btn, false, btn.dataset.origText);
                    loadDataFromServer();
                }
            }).catch(() => { setBtnLoading(btn, false, btn.dataset.origText); });
    });
}

let assignBtn = document.getElementById('assignToDriverBtn');
if (assignBtn) assignBtn.addEventListener('click', () => {
    let driver = document.getElementById('assignDriverSelect').value;
    if (!driver) { showToast("ط§ط®طھط± ط§ظ„ظ…ظ†ط¯ظˆط¨ ط£ظˆظ„ط§ظ‹!", "error"); return; }
    processStatusUpdate(assignBtn, 'pending-checkbox', 'ظپظٹ ط§ظ„ط´ط­ظ†', driver);
});

let sendWaDriverBtn = document.getElementById('sendWaDriverBtn');
if (sendWaDriverBtn) sendWaDriverBtn.addEventListener('click', () => {
    let driver = document.getElementById('assignDriverSelect').value;
    if (!driver) { showToast("ط§ط®طھط± ط§ظ„ظ…ظ†ط¯ظˆط¨ ط£ظˆظ„ط§ظ‹!", "error"); return; }
    
    let courierPhone = "";
    if (shippingData && window.financialsData) {
        let courier = shippingData[driver] || window.financialsData.find(f => f.name === driver); // fallback search
    }
    // We can also just send it to WhatsApp with empty phone and user selects the contact
    let ordersListText = `ط£ظˆط±ط¯ط±ط§طھ ط§ظ„ظ…ظ†ط¯ظˆط¨: ${driver} ًں›µ\n\n`;
    let totalCash = 0;

    const selected = Array.from(document.querySelectorAll('.pending-checkbox:checked')).map(cb => cb.value);
    if (selected.length === 0) { showToast("ط­ط¯ط¯ ط£ظˆط±ط¯ط± ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„!", "warning"); return; }

    selected.forEach((orderId, idx) => {
        let o = orderHistoryData.find(x => x.id === orderId);
        if (o) {
            ordersListText += `${idx+1}. ط§ظ„ط¹ظ…ظٹظ„: ${o.name}\nًں“± ${o.phone}\nًں“چ ط§ظ„ط¹ظ†ظˆط§ظ†: ${o.address}\nًں’° ط§ظ„ظ…ط·ظ„ظˆط¨: ${o.remaining} ط¬.ظ…\nًں›’ ط§ظ„ظ…ظ†طھط¬ط§طھ: ${o.products.replace(/\n/g, ', ')}\n\n`;
            totalCash += parseFloat(o.remaining) || 0;
        }
    });
    ordersListText += `ًں”¥ ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط·ظ„ظˆط¨ طھط­طµظٹظ„ظ‡: ${totalCash} ط¬.ظ…\n`;
    window.open(`https://wa.me/?text=${encodeURIComponent(ordersListText)}`, '_blank');
});

let markDelivBtn = document.getElementById('markDeliveredBtn');
if (markDelivBtn) markDelivBtn.addEventListener('click', () => processStatusUpdate(markDelivBtn, 'shipped-checkbox', 'طھظ… ط§ظ„طھظˆطµظٹظ„'));

let markRetBtn = document.getElementById('markReturnedBtn');
if (markRetBtn) markRetBtn.addEventListener('click', () => processStatusUpdate(markRetBtn, 'shipped-checkbox', 'ظ…ط±طھط¬ط¹'));

function updateAdvancedDashboard(history) {
    let completedToday = 0;

    let productMap = {};
    let platformMap = {};

    // â­گ Fix: ط§ط³طھط®ط¯ط§ظ… ط§ظ„طھط§ط±ظٹط® ط§ظ„ظ…ط­ظ„ظٹ ط¨ط¯ظ„ UTC ظ„طھط¬ظ†ط¨ ظ…ط´ظƒظ„ط© ط§ظ„ظ€ timezone
    let now = new Date();
    let todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    let monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    let allOrders = window.orderHistoryData || [];

    let todayOrdersCount = 0;
    let todaySalesTotal = 0;

    // â­گ Fix: ط¯ظ…ط¬ ظƒظ„ ظ…طµط§ط¯ط± ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ„ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ طµظˆط±ط© ط´ط§ظ…ظ„ط© (ظ„ظ„ظٹظˆظ… ظپظ‚ط·)
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
        let isAccountedFor = o.status && o.status.includes("طھظ… ط§ظ„طھظˆطµظٹظ„ ظˆظ…ظڈط­ط§ط³ط¨");

        // ط­ط³ط§ط¨ط§طھ ط§ظ„ظٹظˆظ…: ط¹ط¯ط¯ ط§ظ„ط£ظˆط±ط¯ط±ط§طھ ظٹط­ط³ط¨ ط§ظ„ظƒظ„طŒ ط§ظ„ظ…ط¨ظٹط¹ط§طھ طھط³طھط«ظ†ظٹ ط§ظ„ظ…ط±طھط¬ط¹
        if (oDate === todayStr) {
            todayOrdersCount++;
            if (o.status !== "ظ…ط±طھط¬ط¹") {
                todaySalesTotal += parseFloat(o.total || o.remaining || 0) || 0;
            }
        }

        if (isAccountedFor && oDate === todayStr) completedToday++;
    });

    // â­گ ط­ط³ط§ط¨ ط§ظ„ط¹ظ‡ط¯ط© ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹط© ظ…ظ† ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط§ظ„ظٹط© (ظ…ظ† ط§ظ„ط¥ظƒط³ظٹظ„ ظ…ط¨ط§ط´ط±ط©)
    let moneyWithDrivers = 0;
    if (window.latestServerData && window.latestServerData.financials) {
        window.latestServerData.financials.forEach(f => {
            moneyWithDrivers += parseFloat(f.inTransit) || 0;
        });
    }

    // ط¹ط±ط¶ ط§ظ„ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ط£ط³ط§ط³ظٹط©
    if (document.getElementById('moneyWithDrivers')) document.getElementById('moneyWithDrivers').innerText = moneyWithDrivers;
    
    // â­گ طھط­ط¯ظٹط« ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ظٹظˆظ… ظ…ط­ظ„ظٹط§ظ‹ ط¨ط´ظƒظ„ طµط­ظٹط­
    if (document.getElementById('todayCount')) document.getElementById('todayCount').innerText = todayOrdersCount;
    if (document.getElementById('todaySales')) document.getElementById('todaySales').innerText = todaySalesTotal;
    if (document.getElementById('completedCount')) document.getElementById('completedCount').innerText = completedToday;

    // ط¨ط§ظ„ط³ ط¹ظ„ظ‰ ط²ط± ط§ظ„ظ…ط§ظ„ظٹط©
    let openFinancialsBtn = document.getElementById('openFinancialsBtn');
    if (openFinancialsBtn) {
        if (moneyWithDrivers > 0) openFinancialsBtn.classList.add('pulse-btn');
        else openFinancialsBtn.classList.remove('pulse-btn');
    }
}

// â­گ V15.1: ط¨ظ†ط§ط، ظ‚ط§ط¦ظ…ط© ط§ظ„ط´ظ‡ظˆط± ظ„ظپظ„طھط± ط§ظ„طھظ‚ط§ط±ظٹط± - ط´ظ‡ظˆط± ظپظٹظ‡ط§ ط¨ظٹط§ظ†ط§طھ ظپظ‚ط·
function buildMonthFilterOptions() {
    let sel = document.getElementById('reportMonthFilter');
    if (!sel) return;
    let currentVal = sel.value;
    sel.innerHTML = '<option value="">ط§ط®طھط± ط§ظ„ط´ظ‡ط±</option>';
    let arabicMonths = ['ظٹظ†ط§ظٹط±','ظپط¨ط±ط§ظٹط±','ظ…ط§ط±ط³','ط£ط¨ط±ظٹظ„','ظ…ط§ظٹظˆ','ظٹظˆظ†ظٹظˆ','ظٹظˆظ„ظٹظˆ','ط£ط؛ط³ط·ط³','ط³ط¨طھظ…ط¨ط±','ط£ظƒطھظˆط¨ط±','ظ†ظˆظپظ…ط¨ط±','ط¯ظٹط³ظ…ط¨ط±'];
    
    // â­گ Fix: ط¬ظ…ط¹ ظƒظ„ ط§ظ„ط´ظ‡ظˆط± ط§ظ„ظپط¹ظ„ظٹط© ظ…ظ† ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…طھط§ط­ط©
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

    // â­گ Fix: ط¥ط¶ط§ظپط© ط§ظ„ط´ظ‡ط± ط§ظ„ط­ط§ظ„ظٹ ط¯ط§ط¦ظ…ط§ظ‹ (ط¨ط¯ظˆظ† toISOString)
    let now = new Date();
    let currentMonthVal = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    availableMonths.add(currentMonthVal);

    // طھط±طھظٹط¨ ط§ظ„ط´ظ‡ظˆط± ظ…ظ† ط§ظ„ط£ط­ط¯ط« ظ„ظ„ط£ظ‚ط¯ظ…
    let sortedMonths = Array.from(availableMonths).sort().reverse();

    sortedMonths.forEach(monthVal => {
        let [yr, mo] = monthVal.split('-');
        let moIdx = parseInt(mo) - 1;
        if (moIdx < 0 || moIdx > 11) return;
        let label = arabicMonths[moIdx] + ' ' + yr;
        let opt = document.createElement('option');
        opt.value = monthVal;
        opt.textContent = monthVal === currentMonthVal ? label + ' (ط§ظ„ط­ط§ظ„ظٹ)' : label;
        sel.appendChild(opt);
    });
    if (currentVal) sel.value = currentVal;
}

// â­گ V15.1: ط¹ط±ط¶ طھظ‚ط±ظٹط± ط´ظ‡ط± ظ…ط­ط¯ط¯ - ظٹط¬ظ„ط¨ ظ…ظ† ط§ظ„ط³ظٹط±ظپط±
function renderReportForMonth(targetMonth) {
    let statusEl = document.getElementById('reportFilterStatus');
    let topEl    = document.getElementById('topProductsList');
    let pltEl    = document.getElementById('platformStatsList');
    if (!targetMonth) {
        if (statusEl) statusEl.textContent = 'âڑ ï¸ڈ ط§ط®طھط± ط´ظ‡ط±ط§ظ‹ ط£ظˆظ„ط§ظ‹';
        return;
    }
    if (statusEl) statusEl.textContent = 'âڈ³ ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط´ظ‡ط±...';
    if (topEl) topEl.innerHTML = '<p class="empty-msg">âڈ³ ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„...</p>';
    if (pltEl) pltEl.innerHTML = '<p class="empty-msg">âڈ³ ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„...</p>';

    let fetchDate = targetMonth + '-01';
    fetch(`${GOOGLE_SHEETS_URL}?date=${fetchDate}`)
        .then(r => r.json())
        .then(data => {
            let arabicMonths = ['ظٹظ†ط§ظٹط±','ظپط¨ط±ط§ظٹط±','ظ…ط§ط±ط³','ط£ط¨ط±ظٹظ„','ظ…ط§ظٹظˆ','ظٹظˆظ†ظٹظˆ','ظٹظˆظ„ظٹظˆ','ط£ط؛ط³ط·ط³','ط³ط¨طھظ…ط¨ط±','ط£ظƒطھظˆط¨ط±','ظ†ظˆظپظ…ط¨ط±','ط¯ظٹط³ظ…ط¨ط±'];
            let [yr, mo] = targetMonth.split('-');
            if (statusEl) statusEl.textContent = `âœ… طھظ… طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ${arabicMonths[parseInt(mo)-1]} ${yr}`;

            // ط£ظپط¶ظ„ 10 ظ…ظ†طھط¬ط§طھ
            if (topEl) {
                let products = data.monthTopProducts || [];
                if (products.length === 0) {
                    topEl.innerHTML = '<p class="empty-msg">ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ظ…ط¨ظٹط¹ط§طھ ظپظٹ ظ‡ط°ط§ ط§ظ„ط´ظ‡ط±.</p>';
                } else {
                    let maxVal = Math.max(...products.map(p => p.qty || 0)) || 1;
                    topEl.innerHTML = products.map((p, idx) => {
                        let pct = Math.round(((p.qty||0) / maxVal) * 100);
                        let medal = idx===0?'ًں¥‡':idx===1?'ًں¥ˆ':idx===2?'ًں¥‰':`${idx+1}.`;
                        return `<div style="margin-bottom:12px;">
                            <div style="display:flex;justify-content:space-between;font-size:0.88rem;font-weight:bold;margin-bottom:4px;">
                                <span>${medal} ${p.name}</span>
                                <span style="color:var(--primary);background:var(--primary-glow);padding:2px 8px;border-radius:8px;">${p.qty} ظ‚ط·ط¹ط©</span>
                            </div>
                            <div style="background:var(--bg);border-radius:8px;height:10px;overflow:hidden;">
                                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--primary),var(--primary-light));border-radius:8px;transition:width 0.8s ease;"></div>
                            </div></div>`;
                    }).join('');
                }
            }

            // â­گ طھط­ط¯ظٹط« ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ط´ظ‡ط± ظپظٹ ط£ط¹ظ„ظ‰ ط§ظ„طµظپط­ط© ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط§ظ„ط´ظ‡ط± ط§ظ„ظ…ط®طھط§ط±
            if (document.getElementById('monthCount')) document.getElementById('monthCount').innerText = data.monthOrderCount || 0;
            if (document.getElementById('monthSales')) document.getElementById('monthSales').innerText = data.monthSales || 0;
            if (document.getElementById('completedMonthCount')) document.getElementById('completedMonthCount').innerText = data.completedMonthCount || 0;
            if (document.getElementById('returnedCount')) document.getElementById('returnedCount').innerText = data.returnedCount || 0;

            // ط£ط¯ط§ط، ط§ظ„ظ…ظ†طµط§طھ - ط¨ط§ظ„طھط±طھظٹط¨ ط§ظ„ظ…ط­ط¯ط¯
            if (pltEl) {
                let raw = data.monthPlatforms || {};
                const ORDER = [
                    { key: 'ظˆط§طھط³ط§ط¨',   emoji: 'ًں’¬', color: '#25D366' },
                    { key: 'ط§ظ†ط³طھط¬ط±ط§ظ…', emoji: 'ًں“¸', color: '#E1306C' },
                    { key: 'ظپظٹط³ط¨ظˆظƒ',   emoji: 'ًں”µ', color: '#1877F2' },
                    { key: 'طھظٹظƒ طھظˆظƒ',  emoji: 'ًںژµ', color: '#010101' },
                ];
                // â­گ ط­ط³ط§ط¨ ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ ط¨ط§ط³طھط®ط¯ط§ظ… includes ظ„طھط؛ط·ظٹط© ط§ظ„ط¥ظٹظ…ظˆط¬ظٹ ظپظٹ ط§ظ„ط´ظٹطھ
                const getCount = (raw, keyword) => {
                    return Object.entries(raw).reduce((sum, [k, v]) => k.includes(keyword) ? sum + v : sum, 0);
                };
                let total = ORDER.reduce((s, p) => s + getCount(raw, p.key), 0);
                if (total === 0) {
                    pltEl.innerHTML = '<p class="empty-msg">ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ظ…ظ†طµط§طھ ظپظٹ ظ‡ط°ط§ ط§ظ„ط´ظ‡ط±.</p>';
                } else {
                    pltEl.innerHTML = ORDER.map(plt => {
                        let cnt = getCount(raw, plt.key);
                        let pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                        return `<div style="margin-bottom:14px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                                <span style="font-weight:bold;font-size:0.95rem;">${plt.emoji} ${plt.key}</span>
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <span style="font-size:0.95rem;font-weight:900;color:${plt.color};">${cnt} ط·ظ„ط¨</span>
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
            if (statusEl) statusEl.textContent = 'â‌Œ ط­ط¯ط« ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„';
            if (topEl) topEl.innerHTML = '<p class="empty-msg">â‌Œ طھط¹ط°ط± ط§ظ„طھط­ظ…ظٹظ„</p>';
            if (pltEl) pltEl.innerHTML = '<p class="empty-msg">â‌Œ طھط¹ط°ط± ط§ظ„طھط­ظ…ظٹظ„</p>';
        });
}

// â­گ V15.1: ط±ط¨ط· ط²ط±ط§ط± ط§ظ„طھظ‚ط§ط±ظٹط±
let loadReportsBtn = document.getElementById('loadReportsBtn');
if (loadReportsBtn) {
    let reportsVisible = false;
    loadReportsBtn.addEventListener('click', () => {
        let sec = document.getElementById('detailedReportsSection');
        if (!sec) return;
        reportsVisible = !reportsVisible;
        sec.style.display = reportsVisible ? 'block' : 'none';
        loadReportsBtn.textContent = reportsVisible ? 'ًں“ٹ ط¥ط®ظپط§ط، ط§ظ„طھظ‚ط§ط±ظٹط± ط§ظ„طھظپطµظٹظ„ظٹط©' : 'ًں“ٹ ط¥ط¸ظ‡ط§ط± ط§ظ„طھظ‚ط§ط±ظٹط± ط§ظ„طھظپطµظٹظ„ظٹط©';
        if (reportsVisible) buildMonthFilterOptions();
    });
}

let loadReportDataBtn = document.getElementById('loadReportDataBtn');
if (loadReportDataBtn) {
    loadReportDataBtn.addEventListener('click', () => {
        let sel = document.getElementById('reportMonthFilter');
        if (!sel || !sel.value) { showToast('ط§ط®طھط± ط´ظ‡ط±ط§ظ‹ ط£ظˆظ„ط§ظ‹', 'warning'); return; }
        renderReportForMonth(sel.value);
    });
}

window.shareToWhatsAppGroup = function(orderId) {
    let order;
    if (typeof orderId === 'object') {
        order = orderId;
    } else {
        // â­گ Fix: String() comparison to prevent type mismatch (string vs number)
        let findFn = o => String(o.id) === String(orderId);
        order = (window.orderHistoryData || []).find(findFn) ||
                (window.searchResultsCache || []).find(findFn) ||
                (window.pendingOrdersData || []).find(findFn) ||
                (window.suspendedOrdersData || []).find(findFn) ||
                (window.uncollectedOrdersData || []).find(findFn);
    }
    
    if (!order) {
        showToast("ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط§ظ„ط£ظˆط±ط¯ط±", "error");
        console.warn("shareToWhatsAppGroup: could not find orderId =", orderId, typeof orderId);
        console.log("Available IDs in history:", (window.orderHistoryData||[]).map(o=>({id:o.id,type:typeof o.id})));
        return;
    }
    console.log("Order Data:", order);
    
    // â­گ V14.2: ط¥طµظ„ط§ط­ ط´ط§ظ…ظ„ ظ„ظ€ Keys ط§ظ„ظ‚ط§ط¯ظ…ط© ظ…ظ† ط§ظ„ط¥ظƒط³ظٹظ„ - fallback ظ„ظƒظ„ ط­ظ‚ظ„
    let _name     = order.name     || order.customerName  || "";
    let _gov      = order.gov      || order.governorate   || "";
    let _address  = order.address  || order.customerAddress || order.addr || "";
    let _phone    = order.phone    || order.customerPhone  || order.mobile || "";
    let _payment  = order.payment  || order.paymentMethod  || order.payMethod || "";
    let _products = order.products || order.items          || order.productDetails || "";
    let _shipping = parseFloat(order.shipping || order.shippingCost || order.shippingFee || 0);
    let _remaining = order.remaining !== undefined ? order.remaining : (order.total || order.finalTotal || 0);
    let _type     = order.orderType || order.type || order.deliveryType || "طھظˆطµظٹظ„";

    let text = `*ظ†ظˆط¹ ط§ظ„ط·ظ„ط¨:* ${_type}\n`;
    if (_type.includes('ط­ط¬ط²') || _type === 'special_date') {
        let resDate = order.reservationDate || order.expectedDate || order.bookingDate || order.specialDate || order.spDate;
        if (resDate) {
            if (resDate.toString().includes('GMT') || resDate.toString().includes('طھظˆظ‚ظٹطھ')) {
                let d = new Date(resDate);
                if (!isNaN(d.getTime())) resDate = `${d.getFullYear()}-${("0"+(d.getMonth()+1)).slice(-2)}-${("0"+d.getDate()).slice(-2)}`;
            }
            text += `ًں—“ï¸ڈ *طھط§ط±ظٹط® ط§ظ„طھط³ظ„ظٹظ…:* ${resDate}\n`;
        }
    }
    text += `*طھط§ط±ظٹط® ط¥ظ†ط´ط§ط، ط§ظ„ط£ظˆط±ط¯ط±:* ${order.date || new Date().toLocaleDateString('ar-EG')} âڈ° ${order.time || new Date().toLocaleTimeString('ar-EG')}\n`;
    text += `ًں‘¤ *ط§ظ„ط¹ظ…ظٹظ„:* ${_name}\n`;
    if (!_type.includes('ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹') && (_gov || _address)) {
        text += `ًں“چ *ط§ظ„ط¹ظ†ظˆط§ظ†:* ${_gov ? _gov + " - " : ""}${_address}\n`;
    }
    if (_phone) text += `ًں“± *ط§ظ„ظ…ظˆط¨ط§ظٹظ„:* ${_phone}\n`;
    text += `ًں’³ *ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹:* ${_payment}\n\n`;
    text += `ًں“¦ *ط§ظ„ظ…ظ†طھط¬ط§طھ:*\n${_products}\n`;
    let _subtotal = order.subtotal || order.productsTotal || (parseFloat(order.total) - parseFloat(_shipping)) || 0;
    text += `ًں›چï¸ڈ *ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ظ†طھط¬ط§طھ:* ${_subtotal} ط¬.ظ…\n`;
    text += `ًںڑڑ *ط§ظ„ط´ط­ظ†:* ${_shipping}\n`;
    text += `ًں’° *ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ†ظ‡ط§ط¦ظٹ:* ${_remaining}\n`;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast("طھظ… ظ†ط³ط® ط¨ظٹط§ظ†ط§طھ ط§ظ„ط£ظˆط±ط¯ط± ظ„ظ„ط­ط§ظپط¸ط© ط¨ظ†ط¬ط§ط­ ًں“‹", "success");
    }).catch(err => {
        showToast("ظپط´ظ„ ظپظٹ ظ†ط³ط® ط§ظ„ط¨ظٹط§ظ†ط§طھ", "error");
    });
};

let shareOrderBtn = document.getElementById('shareOrderBtn');
if (shareOrderBtn) {
    shareOrderBtn.addEventListener('click', () => {
        let name = document.getElementById('customerName') ? document.getElementById('customerName').value.trim() : "";
        if (!name) { showToast("ط¨ط±ط¬ط§ط، ط¥ط¯ط®ط§ظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط£ظˆط±ط¯ط± ط£ظˆظ„ط§ظ‹", "error"); return; }
        
        let gov = document.getElementById('governorate') ? document.getElementById('governorate').value : "";
        let addressVal = document.getElementById('address') ? document.getElementById('address').value : "";
        let paymentMethod = document.getElementById('paymentMethod') ? document.getElementById('paymentMethod').value : "";
        let productsListText = "";
        document.querySelectorAll('.product-row.confirmed').forEach(row => {
            let n = row.querySelector('.product-name-input').value, p = row.querySelector('.product-price-input').value, q = row.querySelector('.product-qty-input').value;
            productsListText += `${n} - ط§ظ„ظƒظ…ظٹط©: ${q} (${(parseFloat(p) || 0) * (parseFloat(q) || 1)}ط¬)\n`;
        });
        let shipping = document.getElementById('shippingCost') ? document.getElementById('shippingCost').value : 0;
        let rem = document.getElementById('remainingAmountDisplay') ? document.getElementById('remainingAmountDisplay').innerText : (document.getElementById('finalTotalDisplay') ? document.getElementById('finalTotalDisplay').innerText : 0);
        let deliveryTypeSelect = document.getElementById('deliveryType');
        let orderTypeLabel = deliveryTypeSelect ? deliveryTypeSelect.options[deliveryTypeSelect.selectedIndex].text : "طھظˆطµظٹظ„";

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

    let report = `ًں“ٹ *طھظ‚ط±ظٹط± ط§ظ„ط¥ط¯ط§ط±ط© - Candy Club Pro*\n\n`;
    report += `ًں“… *ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ظٹظˆظ…:*\n`;
    report += `ًں›’ ط£ظˆط±ط¯ط±ط§طھ ط§ظ„ظٹظˆظ…: ${tCount}\n`;
    report += `ًں’° ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظٹظˆظ… ط§ظ„ظ…طھظˆظ‚ط¹ط©: ${tSales} ط¬\n`;
    report += `âœ… ط£ظˆط±ط¯ط±ط§طھ ظ…ظƒطھظ…ظ„ط© (ظ…ط­ط§ط³ط¨): ${compCount}\n`;
    report += `ًںڑ¨ ظ…ط±طھط¬ط¹ط§طھ: ${retCount}\n\n`;
    
    report += `ًں“… *ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ط´ظ‡ط±:*\n`;
    report += `ًں“ˆ ط¥ط¬ظ…ط§ظ„ظٹ ظ…ط¨ظٹط¹ط§طھ ط§ظ„ط´ظ‡ط±: ${monthSales} ط¬\n\n`;
    
    report += `âڑ ï¸ڈ ظ…ظ†طھط¬ط§طھ ظ†ط§ظ‚طµط©: ${oosCount}\n`;
    report += `â­گ ط§ظ„ظ…ظ†طھط¬ ط§ظ„ط£ظƒط«ط± ظ…ط¨ظٹط¹ط§ظ‹: ${topP}\n\n`;
    report += `طھظ… ط§ظ„ط¥ظ†ط´ط§ط، ط¨ظˆط§ط³ط·ط© ط³ظٹط³طھظ… ط§ظ„ط¥ط¯ط§ط±ط© ط§ظ„ط¢ظ„ظٹ âڑ™ï¸ڈ`;

    navigator.clipboard.writeText(report).then(() => {
        showToast("طھظ… ظ†ط³ط® ط§ظ„طھظ‚ط±ظٹط± ظ„ظ„ط­ط§ظپط¸ط© ط¨ظ†ط¬ط§ط­ ًں“‹", "success");
    }).catch(err => {
        showToast("ظپط´ظ„ ظپظٹ ظ†ط³ط® ط§ظ„طھظ‚ط±ظٹط±", "error");
    });
});

// ==========================================
// 12. ظ†ط¸ط§ظ… ط§ظ„ظƒطھط§ظ„ظˆط¬ ظˆط§ظ„ظ†ظˆط§ظ‚طµ ط§ظ„ط´ط§ظ…ظ„
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

// ط¹ط±ط¶ ط§ظ„ظƒطھط§ظ„ظˆط¬ (ظ…ط¹ ط±ط¨ط· ط´ط§ط´ط© ط§ظ„طھط¹ط¯ظٹظ„ ط§ظ„ط§ط­طھط±ط§ظپظٹط©)
function renderCatalog(catalogList) {
    let container = document.getElementById('catalogListContainer');
    if (!container) return;
    container.innerHTML = '';

    if (catalogList.length === 0) {
        container.innerHTML = '<p class="empty-msg">ط§ظ„ظƒطھط§ظ„ظˆط¬ ظپط§ط±ط؛.</p>';
        return;
    }

    catalogList.forEach(p => {
        let isOfferActive = p.isOffer === true || p.isOffer === "true" || p.isOffer === 1;
        let div = document.createElement('div');
        div.className = 'data-row catalog-row';
        div.innerHTML = `
            <div class="catalog-info">
                <strong>${p.name}</strong>
                <span class="catalog-price">ط£ط³ط§ط³ظٹ: ${p.price} ط¬.ظ…</span>
                ${isOfferActive ? `<span class="catalog-offer-price">ط³ط¹ط± ط§ظ„ط¹ط±ط¶: ${p.offerPrice} ط¬.ظ…</span>` : ''}
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; align-items:center;">
                <label class="switch" title="طھظپط¹ظٹظ„/ط¥ظٹظ‚ط§ظپ ط§ظ„ط¹ط±ط¶">
                    <input type="checkbox" class="offer-toggle" ${isOfferActive ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
                <button class="btn-outline interactive-btn edit-cat-btn" style="padding:4px; font-size:0.7rem;">طھط¹ط¯ظٹظ„ âœڈï¸ڈ</button>
            </div>
        `;

        div.querySelector('.offer-toggle').addEventListener('change', (e) => {
            let newState = e.target.checked;
            let currentOffer = p.offerPrice || p.price;
            if (newState && !p.offerPrice) {
                currentOffer = prompt(`ط£ط¯ط®ظ„ ط³ط¹ط± ط§ظ„ط¹ط±ط¶ ظ„ظ€ ${p.name}:`, p.price);
                if (!currentOffer) { e.target.checked = false; return; }
            }
            window.pushCatalogUpdate(p.name, p.price, newState, currentOffer);
            showToast(newState ? "âœ… طھظ… طھظپط¹ظٹظ„ ط§ظ„ط¹ط±ط¶" : "â‌Œ طھظ… ط¥ظٹظ‚ط§ظپ ط§ظ„ط¹ط±ط¶", "success");
            // ط§ط³طھط®ط¯ظ…ظ†ط§ ط§ظ„ظ€ timeout ط¹ط´ط§ظ† ط§ظ„ط¯ط§طھط§ طھظ„ط­ظ‚ طھطھط³ط¬ظ„
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
            showToast("âœ… طھظ… ط§ظ„طھط¹ط¯ظٹظ„ ط¨ظ†ط¬ط§ط­", "success");
            setBtnLoading(saveEditCatBtn, false, "ط­ظپط¸ ط§ظ„طھط¹ط¯ظٹظ„ط§طھ");
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
        if (!n || !p) { showToast("ط£ط¯ط®ظ„ ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬ ظˆط§ظ„ط³ط¹ط±", "error"); return; }

        setBtnLoading(addCatalogBtn, true);
        window.pushCatalogUpdate(n, p, false, 0);
        showToast("âœ… طھظ… ط¥ط¶ط§ظپط© ط§ظ„ظ…ظ†طھط¬", "success");
        setTimeout(() => {
            document.getElementById('newCatalogName').value = '';
            document.getElementById('newCatalogPrice').value = '';
            setBtnLoading(addCatalogBtn, false, "ط¥ط¶ط§ظپط©");
            loadDataFromServer();
        }, 1500);
    });
}

function renderOutOfStock(oosList) {
    let container = document.getElementById('outOfStockContainer');
    if (!container) return;
    container.innerHTML = '';

    if (oosList.length === 0) {
        container.innerHTML = '<p class="empty-msg">ظ„ط§ ظٹظˆط¬ط¯ ظ†ظˆط§ظ‚طµ ظ…ط³ط¬ظ„ط© ط­ط§ظ„ظٹط§ظ‹.</p>';
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
                <span style="font-size:0.75rem; color:#888;">ط§ظ„ط؛ط±ط¶: ${item.reason || '--'}</span>
            </div>
            <div style="display:flex; gap:5px;">
                <button class="interactive-btn wa-oos-btn" style="background:#25D366; color:white; border:none; padding:5px 10px; border-radius:8px;">ًں’¬</button>
                <button class="interactive-btn del-oos-btn" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:8px;">â‌Œ</button>
            </div>
        `;

        div.querySelector('.wa-oos-btn').addEventListener('click', () => {
            let phone = item.phone.toString().replace(/'/g, '').trim();
            if (phone.startsWith('0')) phone = '+2' + phone;
            let msg = `ط£ظ‡ظ„ط§ظ‹ ط¨ظƒ ظٹط§ ${item.customer} ًں‘‹\nط§ظ„ظ…ظ†طھط¬ ط§ظ„ظ„ظٹ ط³ط£ظ„طھظ†ط§ ط¹ظ„ظٹظ‡ (${item.product}) ظ…طھظˆظپط± ط¯ظ„ظˆظ‚طھظٹ ظˆطھظ‚ط¯ط± طھط·ظ„ط¨ظ‡! ًںچ¬`;
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        });

        div.querySelector('.del-oos-btn').addEventListener('click', () => {
            if (!confirm("ظ…ط³ط­ ط§ظ„ط¹ظ…ظٹظ„ ظ…ظ† ظ‚ط§ط¦ظ…ط© ط§ظ„ظ†ظˆط§ظ‚طµطں")) return;
            let formData = new URLSearchParams();
            formData.append('action', 'deleteOutOfStock');
            formData.append('phone', item.phone);
            formData.append('product', item.product);
            fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData });
            div.remove();
            showToast("طھظ… ط§ظ„ط­ط°ظپ ط¨ظ†ط¬ط§ط­", "success");
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

        if (!c || !ph || !pr) { showToast("ط£ظƒظ…ظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¹ظ…ظٹظ„ ظˆط§ظ„ظ…ظ†طھط¬ ط§ظ„ظ†ط§ظ‚طµ", "error"); return; }

        setBtnLoading(addOosBtn, true);
        let formData = new URLSearchParams();
        formData.append('action', 'addOutOfStock');
        formData.append('customer', c);
        formData.append('phone', ph);
        formData.append('product', pr);
        formData.append('reason', r);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("âœ… طھظ… طھط³ط¬ظٹظ„ ط§ظ„ظ†ط§ظ‚طµ", "success");
                setBtnLoading(addOosBtn, false, "طھط³ط¬ظٹظ„");
                document.getElementById('oosCustomer').value = '';
                document.getElementById('oosPhone').value = '';
                document.getElementById('oosProduct').value = '';
                loadDataFromServer();
            }).catch(() => setBtnLoading(addOosBtn, false, "طھط³ط¬ظٹظ„"));
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
        container.innerHTML = '<p class="empty-msg">ظ„ط§ ظٹظˆط¬ط¯ ط¹ظ…ظ„ط§ط، ظ…ط³ط¬ظ„ظٹظ†.</p>';
        return;
    }

    customersList.forEach(c => {
        let div = document.createElement('div');
        div.className = 'history-item';
        div.style.borderRightColor = 'var(--secondary)';
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 1.05rem;">ًں‘¤ ${c.name}</strong>
                <span style="color: var(--secondary); font-weight: bold; font-size: 0.85rem;">ًں“‍ ${c.phone}</span>
            </div>
            <div style="font-size: 0.9rem; color: #555; margin-top: 5px;">
                <span>ًں“چ ${c.gov} - ${c.address}</span><br>
                <span>ًں›’ ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط·ظ„ط¨ط§طھ: <strong style="color: var(--text-dark);">${c.count || 0}</strong> | ًں’° ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط¯ظپظˆط¹ط§طھ: <strong style="color: var(--success);">${c.total || 0} ط¬.ظ…</strong></span><br>
                <span style="font-size: 0.8rem; color: #888;">ًں“… ط¢ط®ط± ط·ظ„ط¨: ${c.lastDate ? String(c.lastDate).split('T')[0] : '--'}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

let loadCustomersBtn = document.getElementById('loadCustomersBtn');
let customersListContainer = document.getElementById('customersListContainer');
let _customersLoaded = false; // â­گ V15.1: Lazy flag - ظ„ط§ ظ†ط­ظ…ظ„ ط¥ظ„ط§ ط¹ظ†ط¯ ط§ظ„ط·ظ„ط¨

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
// 13. â­گ ط­ظ…ط§ظٹط© ط²ط± ط§ظ„ط¥ظƒط³ظٹظ„ ط¨ط¨ط§ط³ظˆط±ط¯
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
            togglePasswordVisibility.textContent = 'ًں™ˆ';
        } else {
            excelPasswordInput.type = 'password';
            togglePasswordVisibility.textContent = 'ًں‘پï¸ڈ';
        }
    });
}

function tryExcelPassword() {
    let enteredPassword = excelPasswordInput ? excelPasswordInput.value.trim() : '';
    if (enteredPassword === EXCEL_PASSWORD) {
        showToast("âœ… طھظ… ط§ظ„طھط­ظ‚ظ‚ ط¨ظ†ط¬ط§ط­طŒ ط¬ط§ط±ظٹ ظپطھط­ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ...", "success");
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
// 14. â­گ ط§ظ„ظ…ط§ط³ط­ ط§ظ„ط¶ظˆط¦ظٹ ط§ظ„ط°ظƒظٹ (Offline Barcode Scanner)
// ==========================================

let barcodeCatalogData = [];
let html5QrcodeScanner = null;

// 1. ط¬ظ„ط¨ ظˆطھط­ظ„ظٹظ„ ظ…ظ„ظپ ط§ظ„ظ€ CSV
const toEnglishNumber = str => {
    if (!str) return 0;
    let engStr = String(str).replace(/[ظ -ظ©]/g, d => 'ظ ظ،ظ¢ظ£ظ¤ظ¥ظ¦ظ§ظ¨ظ©'.indexOf(d));
    return parseFloat(engStr) || 0;
};

function fetchCatalogCSV() {
    fetch('products.csv.csv')
        .then(response => {
            if (!response.ok) throw new Error("ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ظ…ظ„ظپ products.csv.csv");
            return response.text();
        })
        .then(csvText => {
            let lines = csvText.split('\n');
            barcodeCatalogData = [];
            
            // طھط¬ط§ظ‡ظ„ ط£ظˆظ„ ط³ط·ط± ط¥ط°ط§ ظƒط§ظ† ط¹ظ†ط§ظˆظٹظ† ط§ظ„ط£ط¹ظ…ط¯ط©طŒ ظ„ظƒظ† طھط­ط³ط¨ط§ظ‹ ط³ظ†ظ‚ط±ط£ ظƒظ„ ط§ظ„ط³ط·ظˆط±
            lines.forEach((line, index) => {
                let cols = line.split(',');
                if (cols.length >= 3) {
                    let barcode = cols[0].trim();
                    let name = cols[1].trim();
                    let price = toEnglishNumber(cols[2].trim()); // ط¥ط¬ط¨ط§ط± ط§ظ„ط£ط±ظ‚ط§ظ… ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط©
                    
                    // ظ†طھط¬ط§ظ‡ظ„ ط§ظ„ط³ط·ط± ظ„ظˆ ظƒط§ظ† ظپط§ط±ط؛
                    if (barcode && name) {
                        barcodeCatalogData.push({ barcode, name, price });
                    }
                }
            });
            console.log("طھظ… طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظƒطھط§ظ„ظˆط¬ ظ„ظ„ظ…ط³ط­ ط§ظ„ط¶ظˆط¦ظٹ: ", barcodeCatalogData.length, "ظ…ظ†طھط¬");
        })
        .catch(err => console.error("ط®ط·ط£ ظپظٹ طھط­ظ…ظٹظ„ ط§ظ„ظƒطھط§ظ„ظˆط¬ ظ„ظ„ط¨ط§ط±ظƒظˆط¯:", err));
}

// طھط´ط؛ظٹظ„ ط§ظ„ط¯ط§ظ„ط© ظپظˆط± طھط­ظ…ظٹظ„ ط§ظ„طµظپط­ط©
window.addEventListener('load', fetchCatalogCSV);

// 2. ط¥طµط¯ط§ط± طµظˆطھ Beep ظ‚طµظٹط± ط¹ظ†ط¯ ظ†ط¬ط§ط­ ط§ظ„ظ…ط³ط­
function playBeepSound() {
    try {
        let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let oscillator = audioCtx.createOscillator();
        let gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800; // طھط±ط¯ط¯ ط§ظ„طµظˆطھ
        gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
        console.warn("Web Audio API ط؛ظٹط± ظ…ط¯ط¹ظˆظ… ظپظٹ ظ‡ط°ط§ ط§ظ„ظ…طھطµظپط­");
    }
}

// 3. ظپطھط­ ظˆط¥ط؛ظ„ط§ظ‚ ط§ظ„ظ†ظˆط§ظپط°
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

// 4. ظ…ظ†ط·ظ‚ ط§ظ„ظ…ط§ط³ط­ ط§ظ„ط¶ظˆط¦ظٹ
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
                console.error("طھط¹ط°ط± طھط´ط؛ظٹظ„ ط§ظ„ظƒط§ظ…ظٹط±ط§:", err);
                showToast("طھط¹ط°ط± طھط´ط؛ظٹظ„ ط§ظ„ظƒط§ظ…ظٹط±ط§طŒ ظٹظ…ظƒظ†ظƒ ط§ط³طھط®ط¯ط§ظ… ط§ظ„ط¨ط­ط« ط§ظ„ظٹط¯ظˆظٹ ط£ظˆ ط±ظپط¹ طµظˆط±ط©.", "warning");
            });
    } catch (e) {
        console.error("ط®ط·ط£ ظپط§ط¯ط­ ظپظٹ طھط´ط؛ظٹظ„ ط§ظ„ظ…ط§ط³ط­ ط§ظ„ط¶ظˆط¦ظٹ:", e);
        showToast("طھط¹ط°ط± طھط´ط؛ظٹظ„ ط§ظ„ظƒط§ظ…ظٹط±ط§طŒ ظٹظ…ظƒظ†ظƒ ط§ط³طھط®ط¯ط§ظ… ط§ظ„ط¨ط­ط« ط§ظ„ظٹط¯ظˆظٹ ط£ظˆ ط±ظپط¹ طµظˆط±ط©.", "warning");
    }
}

function stopBarcodeScanner() {
    try {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.stop().then(() => {
                html5QrcodeScanner.clear();
                html5QrcodeScanner = null;
            }).catch(err => {
                console.error("ظپط´ظ„ ظپظٹ ط¥ظٹظ‚ط§ظپ ط§ظ„ظƒط§ظ…ظٹط±ط§", err);
                try { html5QrcodeScanner.clear(); } catch(e){}
                html5QrcodeScanner = null;
            });
        }
    } catch (e) {
        console.error("ط®ط·ط£ ط£ط«ظ†ط§ط، ظ…ط­ط§ظˆظ„ط© ط¥ظٹظ‚ط§ظپ ط§ظ„ظ…ط§ط³ط­:", e);
        html5QrcodeScanner = null;
    }
}

function onScanSuccess(decodedText, decodedResult) {
    stopBarcodeScanner();
    scannerModal.classList.remove('active');
    handleBarcodeMatch(decodedText);
}

function onScanFailure(error) {
    // طھطھظƒط±ط± ظ…ط¹ ظƒظ„ ظپط±ظٹظ… ظ„ط§ ظٹط¬ط¯ ظپظٹظ‡ ط¨ط§ط±ظƒظˆط¯
}

// 5. ط§ظ„ط¨ط­ط« ظˆط§ظ„طھط·ط§ط¨ظ‚
let currentScannedProduct = null;

function handleBarcodeMatch(barcodeValue) {
    let matchedProduct = barcodeCatalogData.find(p => p.barcode === barcodeValue);
    
    if (matchedProduct) {
        currentScannedProduct = matchedProduct;
        playBeepSound();
        
        document.getElementById('scanResultName').textContent = matchedProduct.name;
        // ط¹ط±ط¶ ط§ظ„ط³ط¹ط± ط¨ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط© ط§ظ„ظ‚ظٹط§ط³ظٹط©
        document.getElementById('scanResultPrice').textContent = Number(matchedProduct.price);
        
        scanResultModal.classList.add('active');
        
        let modalContent = scanResultModal.querySelector('.modal-content');
        modalContent.classList.remove('flash-success');
        void modalContent.offsetWidth; // Trigger reflow
        modalContent.classList.add('flash-success');
        
    } else {
        showToast("ط§ظ„ظ…ظ†طھط¬ ط؛ظٹط± ظ…ط³ط¬ظ„ ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ â‌Œ", "error");
    }
}

// 6. ط§ظ„ط¥ط¯ط®ط§ظ„ ط§ظ„ظٹط¯ظˆظٹ
let manualSearchBtn = document.getElementById('manualSearchBtn');
let manualBarcodeInput = document.getElementById('manualBarcodeInput');

if (manualSearchBtn && manualBarcodeInput) {
    manualSearchBtn.addEventListener('click', () => {
        let val = manualBarcodeInput.value.trim();
        if (!val) {
            showToast("ظٹط±ط¬ظ‰ ط¥ط¯ط®ط§ظ„ ط±ظ‚ظ… ط§ظ„ط¨ط§ط±ظƒظˆط¯", "warning");
            return;
        }
        
        // ط¥ط؛ظ„ط§ظ‚ ط§ظ„ظ†ط§ظپط°ط© ظˆطھظ†ظپظٹط° ط§ظ„ط¨ط­ط« ظپظˆط±ط§ظ‹ ط¨ط¯ظˆظ† ط§ظ†طھط¸ط§ط± ط§ظ„ظƒط§ظ…ظٹط±ط§
        scannerModal.classList.remove('active');
        handleBarcodeMatch(val);
        manualBarcodeInput.value = '';
        
        // ظ…ط­ط§ظˆظ„ط© ط¥ظٹظ‚ط§ظپ ط§ظ„ظƒط§ظ…ظٹط±ط§ ظپظٹ ط§ظ„ط®ظ„ظپظٹط©
        stopBarcodeScanner();
    });
    
    manualBarcodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') manualSearchBtn.click();
    });
}

// 7. طھط­ط³ظٹظ†ط§طھ ط¥ط¶ط§ظپظٹط© (ظ†ط³ط® ط§ظ„ط§ط³ظ… ظˆط±ظپط¹ طµظˆط±ط©)
let copyProductNameBtn = document.getElementById('copyProductNameBtn');
if (copyProductNameBtn) {
    copyProductNameBtn.addEventListener('click', () => {
        let nameToCopy = document.getElementById('scanResultName').textContent;
        navigator.clipboard.writeText(nameToCopy).then(() => {
            let origText = copyProductNameBtn.textContent;
            copyProductNameBtn.textContent = "طھظ… ط§ظ„ظ†ط³ط® âœ…";
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
            showToast("ظپط´ظ„ ظ†ط³ط® ط§ظ„ط§ط³ظ…", "error");
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
        btn.innerText = "ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„ âڈ³...";
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
            showToast("â‌Œ ط­ط¯ط« ط®ط·ط£ ظپظٹ طھط­ظ…ظٹظ„ ط§ظ„طµظ„ط§ط­ظٹط§طھ. ظٹط±ط¬ظ‰ ظ…ط±ط§ط¬ط¹ط© ط¥ط¹ط¯ط§ط¯ط§طھ Google Sheets", "error");
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
                } catch(err) {
                    console.error("ظپط´ظ„ طھظ‡ظٹط¦ط© ط§ظ„ظ…ط§ط³ط­ ظ„ظ„طµظˆط±:", err);
                    showToast("ظپط´ظ„ طھظ‡ظٹط¦ط© ط§ظ„ظ…ط§ط³ط­ ط§ظ„ط¶ظˆط¦ظٹطŒ ط­ط§ظˆظ„ ظ…ط±ط© ط£ط®ط±ظ‰", "error");
                    e.target.value = '';
                    return;
                }
            }
            
            // طھط؛ظٹظٹط± ظˆط§ط¬ظ‡ط© ط§ظ„ط²ط± ظ„ط¥ط¹ط·ط§ط، طھط£ظƒظٹط¯ ظ…ط±ط¦ظٹ ظˆظ…ظ†ط¹ طھظƒط±ط§ط± ط§ظ„ط¶ط؛ط·
            let uploadLabel = document.querySelector('label[for="barcodeImageUpload"]');
            let originalLabelHtml = uploadLabel ? uploadLabel.innerHTML : '';
            if (uploadLabel) {
                uploadLabel.innerHTML = 'ط¬ط§ط±ظٹ ط§ظ„ظپط­طµ... âڈ³';
                uploadLabel.style.pointerEvents = 'none';
                uploadLabel.style.opacity = '0.7';
            }
            
            // ط¥ط¶ط§ظپط© Toast ظ„ط¥ط¹ظ„ط§ظ… ط§ظ„ظ…ط³طھط®ط¯ظ…
            showToast("ط¬ط§ط±ظٹ ظپط­طµ ط§ظ„طµظˆط±ط©...", "success");
            
            // ط§ط³طھط®ط¯ط§ظ… setTimeout ظ„ظ„ط³ظ…ط§ط­ ظ„ظ„ظ…طھطµظپط­ ط¨طھط­ط¯ظٹط« ط§ظ„ظˆط§ط¬ظ‡ط© ظ‚ط¨ظ„ ط¨ط¯ط، ط§ظ„ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط«ظ‚ظٹظ„ط©
            setTimeout(() => {
                let emergencyTimeout = setTimeout(() => {
                    // ط¥ط¬ط¨ط§ط± ط§ظ„ظˆط§ط¬ظ‡ط© ط¹ظ„ظ‰ ط§ظ„ط¹ظˆط¯ط© ظ„ط·ط¨ظٹط¹طھظ‡ط§
                    if (uploadLabel) {
                        uploadLabel.innerHTML = originalLabelHtml;
                        uploadLabel.style.pointerEvents = 'auto';
                        uploadLabel.style.opacity = '1';
                    }
                    e.target.value = ''; // طھظپط±ظٹط؛ ط­ظ‚ظ„ ط§ظ„ظ…ظ„ظپ
                    showToast('ط§ظ„طµظˆط±ط© ظ…ط¹ظ‚ط¯ط© ط£ظˆ ط§ظ„ط¥ط¶ط§ط،ط© ظ‚ظˆظٹط©طŒ ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ط¨طµظˆط±ط© ط£ظˆط¶ط­', 'error');
                    // ظ…ط­ط§ظˆظ„ط© طھظ†ط¸ظٹظپ ط§ظ„ظ…ط§ط³ط­
                    try { tempScanner.clear(); } catch(err){}
                }, 5000);
                
                tempScanner.scanFile(imageFile, false)
                    .then(decodedText => {
                        clearTimeout(emergencyTimeout);
                        scannerModal.classList.remove('active');
                        handleBarcodeMatch(decodedText);
                        
                        // ط¥ط¹ط§ط¯ط© ط¶ط¨ط· ظƒظ„ ط´ظٹط،
                        e.target.value = ''; 
                        if (uploadLabel) {
                            uploadLabel.innerHTML = originalLabelHtml;
                            uploadLabel.style.pointerEvents = 'auto';
                            uploadLabel.style.opacity = '1';
                        }
                        stopBarcodeScanner(); // ط¥ظٹظ‚ط§ظپ ط§ظ„ظƒط§ظ…ظٹط±ط§ ظ„ظˆ ظƒط§ظ†طھ طھط¹ظ…ظ„
                    })
                    .catch(err => {
                        clearTimeout(emergencyTimeout);
                        console.error("ظپط´ظ„ ط§ظ„ظ…ط³ط­ ظ…ظ† ط§ظ„طµظˆط±ط©:", err);
                        showToast("ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط¨ط§ط±ظƒظˆط¯ ظˆط§ط¶ط­ ظپظٹ ظ‡ط°ظ‡ ط§ظ„طµظˆط±ط©طŒ ط­ط§ظˆظ„ ظ…ط±ط© ط£ط®ط±ظ‰", "warning");
                        
                        // ط¥ط¹ط§ط¯ط© ط¶ط¨ط· ط§ظ„ظˆط§ط¬ظ‡ط© ظ„طھظپط§ط¯ظٹ ط§ظ„طھط¹ظ„ظٹظ‚ (Unblock UI)
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
            
            // 1. ط§ظ„ط¨ط­ط« ط¹ظ† ط§ظ„ظ…ظ†طھط¬ ظپظٹ ط§ظ„ظپط§طھظˆط±ط© ظ„ط²ظٹط§ط¯ط© ط§ظ„ظƒظ…ظٹط© ط¨ط¯ظ„ط§ظ‹ ظ…ظ† ط§ظ„طھظƒط±ط§ط±
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
                // ط²ظٹط§ط¯ط© ط§ظ„ظƒظ…ظٹط© ظ„ظ„طµظپ ط§ظ„ط­ط§ظ„ظٹ
                let qtyInput = foundRow.querySelector('.product-qty-input');
                if (qtyInput) {
                    qtyInput.value = parseInt(qtyInput.value || 1) + 1;
                    // ط¥ط·ظ„ط§ظ‚ ط­ط¯ط« ط§ظ„ط¥ط¯ط®ط§ظ„ ظ„طھط­ط¯ظٹط« ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ
                    qtyInput.dispatchEvent(new Event('input'));
                }
                
                if (typeof calculateTotal === 'function') calculateTotal();
                showToast(`طھظ…طھ ط²ظٹط§ط¯ط© ظƒظ…ظٹط© ${productName} ظپظٹ ط§ظ„ظپط§طھظˆط±ط© ًں›’`, "success");
                
                scanResultModal.classList.remove('active');
                currentScannedProduct = null;
                return; // ط¥ظ†ظ‡ط§ط، ط§ظ„ط¯ط§ظ„ط© ظپظˆط±ط§ظ‹
            }
            
            // 2. ط¥ط¶ط§ظپط© ظƒطµظپ ط¬ط¯ظٹط¯ ط¥ط°ط§ ظ„ظ… ظٹظƒظ† ظ…ظˆط¬ظˆط¯ط§ظ‹
                // ط¥ط²ط§ظ„ط© ط§ظ„طµظپظˆظپ ط§ظ„ظپط§ط±ط؛ط© ظ„طھط¬ظ†ط¨ ط§ظ„ظپظˆط¶ظ‰
                let emptyRows = Array.from(document.querySelectorAll('.product-row:not(.confirmed)')).filter(r => r.querySelector('.product-name-input').value === "");
                if (emptyRows.length > 0) {
                    emptyRows[0].parentElement.remove();
                }
                
                // ط§ط³طھط®ط¯ط§ظ… ط¯ط§ظ„ط© ط¥ط¶ط§ظپط© ط§ظ„ظ…ظ†طھط¬ط§طھ ط§ظ„ط­ط§ظ„ظٹط© ظپظٹ ط§ظ„ظ†ط¸ط§ظ…
                if (typeof addProductRow === 'function') {
                    addProductRow(productName, productPrice, "1", true);
                    
                    // طھط­ط¯ظٹط« ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ
                    if (typeof calculateTotal === 'function') calculateTotal();
                    
                    showToast(`طھظ…طھ ط¥ط¶ط§ظپط© ${productName} ظ„ظ„ظپط§طھظˆط±ط© ط¨ظ†ط¬ط§ط­ âœ…`, "success");
                    
                    // ط¥ط؛ظ„ط§ظ‚ ط§ظ„ظ†ط§ظپط°ط©
                    scanResultModal.classList.remove('active');
                    
                    // ط§ظ„طھط£ظƒط¯ ظ…ظ† ظˆط¬ظˆط¯ طµظپ ظپط§ط±ط؛ ظ„ظ„ط¥ط¯ط®ط§ظ„ ط§ظ„ظٹط¯ظˆظٹ
                    if (document.querySelectorAll('.product-row:not(.confirmed)').length === 0) {
                        addProductRow();
                    }
                    
                    currentScannedProduct = null;
                } else {
                    showToast("طھط¹ط°ط± ط¥ط¶ط§ظپط© ط§ظ„ظ…ظ†طھط¬طŒ ط¯ط§ظ„ط© ط§ظ„ظپط§طھظˆط±ط© ط؛ظٹط± ظ…طھظˆظپط±ط©", "error");
                }
        }
    });
}

// ==========================================
// 15. ظ†ط¸ط§ظ… ط§ظ„طµظ„ط§ط­ظٹط§طھ ظˆط§ظ„ط¹ط±ظˆط¶ (Expiry Dashboard)
// ==========================================

let expiryData = [];

// Fetch data only when modal opens (Lazy Loading)
window.openExpiryDashboard = function() {
    document.getElementById('expiryDashboardModal').style.display = 'flex';
    loadExpiryData();
};

function loadExpiryData() {
    const btn = document.getElementById('openExpiryBtn');
    if (btn) {
        btn.dataset.origText = btn.innerText;
        btn.innerText = "ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„ âڈ³...";
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
            showToast("â‌Œ ط­ط¯ط« ط®ط·ط£ ظپظٹ طھط­ظ…ظٹظ„ ط§ظ„طµظ„ط§ط­ظٹط§طھ. ظٹط±ط¬ظ‰ ظ…ط±ط§ط¬ط¹ط© ط¥ط¹ط¯ط§ط¯ط§طھ Google Sheets", "error");
            // Also call render to clear the "loading" or show empty states
            renderExpiryDashboard();
        });
}

let ledgerCart = [];
let currentExportData = [];
let currentExportCategory = '';

// ==========================================
// 1. Ledger Modal Logic (ظ…ط­ط¶ط± ط§ظ„ط§ط³طھظ„ط§ظ…)
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

window.closeLedgerModal = function() {
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
        const receiver = document.getElementById('ledgerProdReceiver').value;
        const notes = document.getElementById('ledgerProdNotes').value;

        if (!name || !qty || !date) {
            showToast("ظٹط±ط¬ظ‰ ط¥ظƒظ…ط§ظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط© (ط§ظ„ط§ط³ظ…طŒ ط§ظ„ظƒظ…ظٹط©طŒ ط§ظ„طھط§ط±ظٹط®)", "warning");
            return;
        }

        const item = {
            id: 'EXP-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            name: name,
            qty: qty,
            expiryDate: date,
            location: location,
            receiver: receiver,
            status: 'Active',
            notes: notes
        };

        ledgerCart.push(item);
        renderLedgerCart();

        document.getElementById('ledgerProdName').value = '';
        document.getElementById('ledgerProdQty').value = '';
        document.getElementById('ledgerProdDate').value = '';
        document.getElementById('ledgerProdLocation').value = '';
        document.getElementById('ledgerProdReceiver').value = '';
        document.getElementById('ledgerProdNotes').value = '';
    });
}

function renderLedgerCart() {
    const tbody = document.getElementById('ledgerCartBody');
    const countSpan = document.getElementById('ledgerCartCount');
    if (!tbody) return;

    countSpan.innerText = ledgerCart.length;

    if (ledgerCart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #7f8c8d;">ظ„ط§ طھظˆط¬ط¯ ظ…ظ†طھط¬ط§طھ ظ…ط¶ط§ظپط© ط­طھظ‰ ط§ظ„ط¢ظ†.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    ledgerCart.forEach((item, index) => {
        tbody.innerHTML += 
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;"> + item.name + </td>
                <td style="padding: 8px;"> + item.qty + </td>
                <td style="padding: 8px;" dir="ltr"> + item.expiryDate + </td>
                <td style="padding: 8px;"> + (item.location || '-') + </td>
                <td style="padding: 8px; text-align: center;">
                    <button class="interactive-btn" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px;" onclick="removeLedgerItem( + index + )">ط­ط°ظپ</button>
                </td>
            </tr>
        ;
    });
}

window.removeLedgerItem = function(index) {
    ledgerCart.splice(index, 1);
    renderLedgerCart();
};

// Save Batch
const saveLedgerBtn = document.getElementById('saveLedgerBtn');
if (saveLedgerBtn) {
    saveLedgerBtn.addEventListener('click', () => {
        if (ledgerCart.length === 0) {
            showToast("ط§ظ„ط³ظ„ط© ظپط§ط±ط؛ط©طŒ ظٹط±ط¬ظ‰ ط¥ط¶ط§ظپط© ظ…ظ†طھط¬ط§طھ ط£ظˆظ„ط§ظ‹.", "warning");
            return;
        }

        const regDate = document.getElementById('ledgerRegDate').value;
        const regName = document.getElementById('ledgerRegistrarName').value;

        if (!regDate || !regName) {
            showToast("ظٹط±ط¬ظ‰ ط¥ط¯ط®ط§ظ„ طھط§ط±ظٹط® ط§ظ„طھط³ط¬ظٹظ„ ظˆط§ط³ظ… ط§ظ„ظ…ط³ط¬ظ„ ظپظٹ ط£ط¹ظ„ظ‰ ط§ظ„ظ…ط­ط¶ط±.", "warning");
            return;
        }

        // Attach reg info to all items
        const payload = ledgerCart.map(item => Object.assign({}, item, {
            regDate: regDate,
            registrarName: regName
        }));

        setBtnLoading(saveLedgerBtn, true, "ط¬ط§ط±ظٹ ط§ظ„ط­ظپط¸...");

        let formData = new URLSearchParams();
        formData.append('action', 'addExpiriesBatch');
        formData.append('batchData', JSON.stringify(payload));

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("âœ… طھظ… ط­ظپط¸ ط§ظ„ظ…ط­ط¶ط± ط¨ظ†ط¬ط§ط­!", "success");
                setBtnLoading(saveLedgerBtn, false);
                ledgerCart = [];
                renderLedgerCart();
                closeLedgerModal();
                loadExpiryData(); // Refresh the dashboard
            }).catch(() => {
                showToast("â‌Œ ط­ط¯ط« ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„", "error");
                setBtnLoading(saveLedgerBtn, false);
            });
    });
}

// ==========================================
// 2. Dashboard Logic (ط¥ط¯ط§ط±ط© ط§ظ„طµظ„ط§ط­ظٹط§طھ)
// ==========================================

function getDaysRemaining(expiryDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expiryDateStr);
    const timeDiff = expDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

function renderExpiryDashboard() {
    let countTotal = 0;
    let countCritical = 0;
    let countAlert = 0;
    let countAttention = 0;
    let countSafe = 0;
    let countFar = 0;

    let activeItems = expiryData.filter(item => item.status !== 'Done/Archived');
    
    activeItems.forEach(item => {
        countTotal++;
        const daysRemaining = getDaysRemaining(item.expiryDate);

        if (daysRemaining < 7 || isNaN(daysRemaining)) {
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

    if(document.getElementById('expTotalItems')) document.getElementById('expTotalItems').innerText = countTotal;
    if(document.getElementById('expCriticalItems')) document.getElementById('expCriticalItems').innerText = countCritical;
    if(document.getElementById('expAlertItems')) document.getElementById('expAlertItems').innerText = countAlert;
    if(document.getElementById('expAttentionItems')) document.getElementById('expAttentionItems').innerText = countAttention;
    if(document.getElementById('expSafeItems')) document.getElementById('expSafeItems').innerText = countSafe;
    if(document.getElementById('expFarItems')) document.getElementById('expFarItems').innerText = countFar;
}

window.showExpiryDetails = function(category) {
    let filteredData = [];
    let title = "";

    let activeItems = expiryData.filter(item => item.status !== 'Done/Archived');

    activeItems.forEach(item => {
        const daysRemaining = getDaysRemaining(item.expiryDate);
        let matches = false;

        if (category === 'Total') {
            matches = true;
            title = "ًں“¦ ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط£طµظ†ط§ظپ ط§ظ„ظ…ط³ط¬ظ„ط©";
        } else if (category === 'Critical' && (daysRemaining < 7 || isNaN(daysRemaining))) {
            matches = true;
            title = "ًں”´ ط­ط±ط¬ ط¬ط¯ط§ظ‹ (ط£ظ‚ظ„ ظ…ظ† 7 ط£ظٹط§ظ…)";
        } else if (category === 'Alert' && daysRemaining >= 7 && daysRemaining < 30) {
            matches = true;
            title = "ًںں  طھظ†ط¨ظٹظ‡ ط³ط±ظٹط¹ (ط£ظ‚ظ„ ظ…ظ† 30 ظٹظˆظ…)";
        } else if (category === 'Attention' && daysRemaining >= 30 && daysRemaining <= 90) {
            matches = true;
            title = "ًںں، ط§ظ†طھط¨ط§ظ‡ ظˆظ…ط±ط§ظ‚ط¨ط© (1 ط¥ظ„ظ‰ 3 ط´ظ‡ظˆط±)";
        } else if (category === 'Safe' && daysRemaining > 90 && daysRemaining <= 180) {
            matches = true;
            title = "ًںں¢ ظ…ط®ط²ظˆظ† ط¢ظ…ظ† (3 ط¥ظ„ظ‰ 6 ط´ظ‡ظˆط±)";
        } else if (category === 'Far' && daysRemaining > 180) {
            matches = true;
            title = "ًں”µ طھط§ط±ظٹط® ط¨ط¹ظٹط¯ (ط£ظƒط«ط± ظ…ظ† 6 ط´ظ‡ظˆط±)";
        }

        if (matches) {
            filteredData.push(Object.assign({}, item, { daysRemaining: daysRemaining }));
        }
    });

    currentExportData = filteredData;
    currentExportCategory = title;

    document.getElementById('detailsTitle').innerText = title;
    const detailsList = document.getElementById('detailsList');
    
    if (filteredData.length === 0) {
        detailsList.innerHTML = '<p class="empty-msg">ظ„ط§ طھظˆط¬ط¯ ط£طµظ†ط§ظپ ظپظٹ ظ‡ط°ظ‡ ط§ظ„ظپط¦ط©.</p>';
    } else {
        detailsList.innerHTML = '';
        filteredData.forEach(item => {
            let daysColor = "";
            if (item.daysRemaining < 0) daysColor = "#c0392b";
            else if (item.daysRemaining < 7) daysColor = "#e74c3c";
            else if (item.daysRemaining < 30) daysColor = "#e67e22";
            else if (item.daysRemaining <= 90) daysColor = "#f39c12";
            else daysColor = "#27ae60";

            let daysText = item.daysRemaining < 0 ? ظ…ظ†طھظ‡ظٹ ظ…ظ†ط°  + Math.abs(item.daysRemaining) +  ظٹظˆظ… ًںڑ¨ : ط¨ط§ظ‚ظٹ  + item.daysRemaining +  ظٹظˆظ…;

            let rowClass = "expiry-item-row";
            let activeOfferStyle = "";
            if (item.status === 'Active Display') {
                rowClass += " active-offer";
                activeOfferStyle = 'style="border: 2px solid #ffeb3b; background: #fffde7;"';
            }

            const offerBtnText = item.status === 'Active Display' ? "ط¥ظٹظ‚ط§ظپ ط§ظ„ط¹ط±ط¶ âڈ¸" : "طھط´ط؛ظٹظ„ ط§ظ„ط¹ط±ط¶ ًں”¥";
            const offerBtnColor = item.status === 'Active Display' ? "#e0e0e0" : "#fff3e0";
            const offerBtnAction = item.status === 'Active Display' ? "Active" : "Active Display";

            let formattedDate = new Date(item.expiryDate);
            formattedDate = isNaN(formattedDate.getTime()) ? item.expiryDate : formattedDate.toLocaleDateString('ar-EG');

            detailsList.innerHTML += 
                <div class=" + rowClass + "  + activeOfferStyle + >
                    <h4>ًں“¦  + item.name + </h4>
                    <div class="expiry-item-details">
                        <span>ط§ظ„ظƒظ…ظٹط©:  + item.qty + </span>
                        <span style="color:  + daysColor + ; font-weight: bold;"> + daysText + </span>
                    </div>
                    <div style="font-size: 0.8rem; color: #7f8c8d; margin-bottom: 8px;">
                        ًں“… ط§ظ†طھظ‡ط§ط،:  + formattedDate +  | ًںڈ¢ ظ…ظƒط§ظ†:  + (item.location || '-') + 
                    </div>
                    <div class="expiry-item-actions">
                        <button class="btn-activate-offer interactive-btn" style="background:  + offerBtnColor + ;" onclick="changeExpiryStatus(' + item.id + ', ' + offerBtnAction + ')"> + offerBtnText + </button>
                        <button class="btn-close-item interactive-btn" onclick="changeExpiryStatus(' + item.id + ', 'Done/Archived')">طھظ… ط§ظ„ط¨ظٹط¹ âœ–ï¸ڈ</button>
                    </div>
                </div>
            ;
        });
    }

    document.getElementById('expiryDetailsSection').style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('expiryDetailsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
};

window.closeExpiryDetails = function() {
    document.getElementById('expiryDetailsSection').style.display = 'none';
};

// 3. Status Control (ط¯ظˆط±ط© ط­ظٹط§ط© ط§ظ„ط¹ط±ط¶)
window.changeExpiryStatus = function(id, newStatus) {
    let msg = "";
    if (newStatus === 'Active Display') msg = "ظ‡ظ„ طھط±ظٹط¯ طھظپط¹ظٹظ„ ط§ظ„ط¹ط±ط¶ ظˆط¬ط¹ظ„ ط§ظ„ط³ط·ط± ظپط³ظپظˆط±ظٹطں ًں”¥";
    else if (newStatus === 'Active') msg = "ظ‡ظ„ طھط±ظٹط¯ ط¥ظٹظ‚ط§ظپ ط§ظ„ط¹ط±ط¶ ظˆط¥ط¹ط§ط¯طھظ‡ ظ„ظ„ط­ط§ظ„ط© ط§ظ„ط·ط¨ظٹط¹ظٹط©طں";
    else if (newStatus === 'Done/Archived') msg = "ظ‡ظ„ طھظ… ط§ظ„ط§ظ†طھظ‡ط§ط، ظ…ظ† ط¨ظٹط¹ ظ‡ط°ط§ ط§ظ„ظ…ظ†طھط¬طں ط³ظٹطھظ… ط¥ط®ظپط§ط¤ظ‡ ظ…ظ† ظ‡ط°ظ‡ ط§ظ„ط´ط§ط´ط©. âœ–ï¸ڈ";

    if (!confirm(msg)) return;

    showToast("ط¬ط§ط±ظٹ ط§ظ„طھط­ط¯ظٹط«...", "warning");

    let formData = new URLSearchParams();
    formData.append('action', 'updateExpiryStatus');
    formData.append('id', id);
    formData.append('status', newStatus);

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("âœ… طھظ… طھط­ط¯ظٹط« ط§ظ„ط­ط§ظ„ط© ط¨ظ†ط¬ط§ط­", "success");
            let item = expiryData.find(i => i.id == id);
            if(item) {
                item.status = newStatus;
            }
            renderExpiryDashboard();
            updateCatalogWithOffers();
            if (document.getElementById('expiryDetailsSection').style.display === 'block') {
                closeExpiryDetails();
            }
        }).catch(() => {
            showToast("â‌Œ ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط¥ظ†طھط±ظ†طھ", "error");
        });
};

function updateCatalogWithOffers() {
    if (!catalogData || catalogData.length === 0) return;
    const activeOffers = expiryData.filter(item => item.status === 'Active Display').map(item => item.name);
    const catalogContainer = document.getElementById('catalogListContainer');
    if (catalogContainer) {
        const rows = catalogContainer.querySelectorAll('.data-row');
        rows.forEach(row => {
            const nameEl = row.querySelector('strong');
            if (nameEl) {
                const productName = nameEl.innerText.replace('ًں”¥', '').replace('ط¹ط±ط¶ ط®ط§طµ', '').trim();
                const hasOffer = activeOffers.some(offerName => productName.includes(offerName) || offerName.includes(productName));
                
                if (hasOffer) {
                    if (!nameEl.innerHTML.includes('ًں”¥')) {
                        nameEl.innerHTML += ' <span style="background: #ffeb3b; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; color: #d35400;">ط¹ط±ط¶ ط®ط§طµ ًں”¥</span>';
                        row.style.border = "2px solid #ffeb3b";
                    }
                } else {
                    if (nameEl.innerHTML.includes('ط¹ط±ط¶ ط®ط§طµ')) {
                        nameEl.innerHTML = productName;
                        row.style.border = "none";
                    }
                }
            }
        });
    }
}

// ==========================================
// 3. Export Logic (طھطµط¯ظٹط± ظ…طھظ‚ط¯ظ… ExcelJS)
// ==========================================

async function generateExcel(dataToExport, reportTitle) {
    if(!dataToExport || dataToExport.length === 0) {
        showToast("ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ظ„ظ„طھطµط¯ظٹط± ظپظٹ ظ‡ط°ظ‡ ط§ظ„ظ‚ط§ط¦ظ…ط©", "warning");
        return;
    }
    
    try {
        if (typeof ExcelJS === 'undefined') {
            showToast("ط¬ط§ط±ظٹ طھط¬ظ‡ظٹط² ظ…ط­ط±ظƒ ط§ظ„طھطµط¯ظٹط± ط§ظ„ط°ظƒظٹ...", "warning");
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

        const sheet1 = workbook.addWorksheet('ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„طھظپطµظٹظ„ظٹط©', { views: [{ rightToLeft: true }] });
        
        sheet1.columns = [
            { header: 'ID', key: 'id', width: 15 },
            { header: 'ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬', key: 'name', width: 35 },
            { header: 'ط§ظ„ظƒظ…ظٹط©', key: 'qty', width: 12 },
            { header: 'طھط§ط±ظٹط® ط§ظ„ط§ظ†طھظ‡ط§ط،', key: 'date', width: 18 },
            { header: 'ط§ظ„ط£ظٹط§ظ… ط§ظ„ظ…طھط¨ظ‚ظٹط©', key: 'days', width: 15 },
            { header: 'طھط§ط±ظٹط® ط§ظ„طھط³ط¬ظٹظ„', key: 'reg', width: 18 },
            { header: 'ط§ط³ظ… ط§ظ„ظ…ط³ط¬ظ„', key: 'regname', width: 22 },
            { header: 'ط§ظ„ظ…ظƒط§ظ† / ط§ظ„ظ…ظˆط±ط¯', key: 'loc', width: 22 },
            { header: 'ط§ظ„ظ…ط³طھظ„ظ…', key: 'rec', width: 18 },
            { header: 'ط§ظ„ط­ط§ظ„ط©', key: 'status', width: 18 },
            { header: 'ظ…ظ„ط§ط­ط¸ط§طھ', key: 'notes', width: 30 }
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
            const expDate = new Date(row.expiryDate);
            const timeDiff = expDate.getTime() - today.getTime();
            let daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
            let daysFormatted = isNaN(daysRemaining) ? '-' : daysRemaining;

            const newRow = sheet1.addRow({
                id: row.id || '',
                name: row.name || '',
                qty: row.qty || '',
                date: row.expiryDate || '',
                days: daysFormatted,
                reg: row.regDate || '',
                regname: row.registrarName || '',
                loc: row.location || '',
                rec: row.receiver || '',
                status: row.status || '',
                notes: row.notes || ''
            });

            newRow.alignment = { vertical: 'middle', horizontal: 'center' };
            newRow.height = 20;

            if (row.status !== 'Done/Archived' && !isNaN(daysRemaining)) {
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
            
            if (row.status === 'Done/Archived') {
                newRow.font = { color: { argb: 'FF95A5A6' }, italic: true };
                newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F4' } }; 
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        let safeTitle = reportTitle.replace(/[^a-zA-Z0-9ط£-ظٹ]/g, '_');
        link.download = طھظ‚ط±ظٹط±_ + safeTitle + _ + new Date().toLocaleDateString('en-CA') + .xlsx;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast("âœ… طھظ… طھطµط¯ظٹط± ط§ظ„طھظ‚ط±ظٹط± ط§ظ„ط§ط­طھط±ط§ظپظٹ ط¨ظ†ط¬ط§ط­", "success");

    } catch (error) {
        console.error(error);
        showToast("â‌Œ ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„طھطµط¯ظٹط±", "error");
    }
}

// Export Current List Button (inside Details Section)
const exportCurrentListBtn = document.getElementById('exportCurrentListBtn');
if (exportCurrentListBtn) {
    exportCurrentListBtn.addEventListener('click', () => {
        setBtnLoading(exportCurrentListBtn, true, "طھطµط¯ظٹط±...");
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
            showToast("ظٹط±ط¬ظ‰ طھط­ط¯ظٹط¯ ط§ظ„ط´ظ‡ط± ط£ظˆظ„ط§ظ‹", "warning");
            return;
        }
        
        let filtered = expiryData.filter(item => {
            if (!item.expiryDate) return false;
            return item.expiryDate.startsWith(monthVal);
        });
        
        setBtnLoading(btnExportMonth, true, "طھطµط¯ظٹط±...");
        generateExcel(filtered, 'ط´ظ‡ط±_' + monthVal).then(() => {
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
            showToast("ظٹط±ط¬ظ‰ طھط­ط¯ظٹط¯ ظٹظˆظ… ط§ظ„طھط³ط¬ظٹظ„ ط£ظˆظ„ط§ظ‹", "warning");
            return;
        }
        
        let filtered = expiryData.filter(item => {
            if (!item.regDate) return false;
            // Handle date formats which might include time
            return item.regDate.includes(dateVal);
        });
        
        setBtnLoading(btnExportDate, true, "طھطµط¯ظٹط±...");
        generateExcel(filtered, 'ط¥ط¯ط®ط§ظ„ط§طھ_ظٹظˆظ…_' + dateVal).then(() => {
            setBtnLoading(btnExportDate, false);
        });
    });
}
