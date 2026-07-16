// ==========================================
// <i class=\'fa-solid fa-globe\'></i> ط§ظ„ط¹ظ‚ظ„ ط§ظ„ظ…ط¯ط¨ط± - ط³ظٹط³طھظ… ظƒط§ظ†ط¯ظٹ ظƒظ„ظˆط¨ (ط§ظ„ظ†ط³ط®ط© V13.6 - ط§ظ„ط´ط§ظ…ظ„ط© ظˆط§ظ„ظ…ط­طµظ†ط©)
// ==========================================

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwi24io7fKY7nizjIutPBpQvZHBx1O28_hu91QVcdF7PLFqTJ48dNJqFPdbqRuGDKI3Uw/exec";

// ==========================================
// 1. ظ†ط¸ط§ظ… ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ (Toasts) ظˆظ‚ظپظ„ ط§ظ„ط£ط²ط±ط§ط± (Loading) ظˆط§ظ„طµظˆطھظٹط§طھ
// ==========================================
const orderAudio = new Audio('طµظˆطھ ط§ظˆط±ط¯ط±.mp3');

function playOrderSound() {
    let playPromise = orderAudio.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.log('Audio play failed (maybe needs user interaction):', e);
            customAlert("<i class='fa-solid fa-bell' style='color:var(--warning)'></i> ظٹظˆط¬ط¯ ط£ظˆط±ط¯ط± ط¬ط¯ظٹط¯ ظ‚ظٹط¯ ط§ظ„طھط¬ظ‡ظٹط²! \n\n(طھظ†ط¨ظٹظ‡: ط§ظ„ظ…طھطµظپط­ ظ…ظ†ط¹ طھط´ط؛ظٹظ„ ط§ظ„طµظˆطھ. ظٹط±ط¬ظ‰ ط§ظ„ط¶ط؛ط· ظپظٹ ط£ظٹ ظ…ظƒط§ظ† ظپظٹ ط§ظ„ط´ط§ط´ط© ظ„طھظپط¹ظٹظ„ ط§ظ„طµظˆطھ ظ„ظ„ط£ظˆط±ط¯ط±ط§طھ ط§ظ„ظ‚ط§ط¯ظ…ط©)");
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
        btn.disabled = true;
        btn.dataset.origText = btn.innerText;
        btn.innerHTML = "ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„ <i class=\'fa-solid fa-hourglass-half\'></i>...";
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
            let overlay = document.getElementById('expiry-loading-overlay');
            if (!overlay) {
                // Create overlay dynamically if it doesn't exist to bypass HTML caching
                overlay = document.createElement('div');
                overlay.id = 'expiry-loading-overlay';
                overlay.style.cssText = 'display: none; position: fixed; top: 130px; bottom: 80px; left: 0; right: 0; background: rgba(255, 255, 255, 0.95); z-index: 90; flex-direction: column; justify-content: center; align-items: center; border-radius: 15px; backdrop-filter: blur(5px);';
                overlay.innerHTML = `
                    <div style="border: 6px solid #f3f3f3; border-top: 6px solid #2980b9; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite;"></div>
                    <h3 style="color: #2c3e50; margin-top: 20px; font-weight: bold;">ط¬ط§ط±ظٹ ط³ط­ط¨ ط¨ظٹط§ظ†ط§طھ ط§ظ„طµظ„ط§ط­ظٹط§طھ...</h3>
                    <p style="color: #7f8c8d; font-size: 0.95rem;">ظٹط±ط¬ظ‰ ط§ظ„ط§ظ†طھط¸ط§ط±طŒ ظ„ط§ طھظ‚ظ… ط¨ط§ظ„ط®ط±ظˆط¬ ظ…ظ† ط§ظ„طµظپط­ط©</p>
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
                window.cachedActiveOffers = expiryData.filter(item => item.status === 'ظپظٹ ط¹ط±ط¶').map(item => item.name);
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
// 3. طھط­ظ…ظٹظ„ ط§ظ„ط¯ط§طھط§ ط§ظ„ط£ط³ط§ط³ظٹط© ظ…ظ† ط§ظ„ط¥ظƒط³ظٹظ„
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

    // <i class=\'fa-solid fa-star\'></i> ط²ط±ط§ط± ط§ظ„طھط­ط¯ظٹط« ط§ظ„ط³ط±ظٹط¹
    let quickRefreshBtn = document.getElementById('quickRefreshBtn');
    if (quickRefreshBtn) quickRefreshBtn.addEventListener('click', () => {
        showToast("ط¬ط§ط±ظٹ طھط­ط¯ظٹط« ط§ظ„ط¨ظٹط§ظ†ط§طھ...", "warning");
        loadDataFromServer();
    });

    loadDataFromServer();
    if (typeof updateSuspendedCount === 'function') updateSuspendedCount();
    // <i class=\'fa-solid fa-star\'></i> V14.2: ط¹ط¯ط§ط¯ ط§ظ„ظ…ط¹ظ„ظ‚ط§طھ ظٹظڈظ‚ط±ط£ ظ…ظ† ط§ظ„ط³ظٹط±ظپط± ظ…ط¨ط§ط´ط±ط© ط¨ط¹ط¯ loadDataFromServer
};

function loadDataFromServer() {
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) { syncStatus.innerText = "ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„..."; syncStatus.style.color = "#FF8C00"; }

    fetch(`${GOOGLE_SHEETS_URL}?date=${currentFilterDate}`)
        .then(res => res.json())
        .then(data => {
            if (syncStatus) { syncStatus.innerText = "ظ…طھطµظ„"; syncStatus.style.color = "#00C853"; }

            // <i class=\'fa-solid fa-star\'></i> Play sound on new order arrival
            if (window.isFirstLoad === undefined) {
                window.isFirstLoad = false;
                window.lastFilterDate = currentFilterDate;
            } else {
                if (window.lastFilterDate === currentFilterDate) {
                    let oldHistoryIds = (window.orderHistoryData || []).map(o => o.id);
                    let newHistory = data.history || [];
                    
                    // طھط´ط؛ظٹظ„ ط§ظ„طµظˆطھ ظپظ‚ط· ط¥ط°ط§ ظ†ط²ظ„ ط§ظ„ط£ظˆط±ط¯ط± ظپظٹ ط§ظ„ط³ط¬ظ„ ظˆظƒط§ظ†طھ ط­ط§ظ„طھظ‡ "ظ‚ظٹط¯ ط§ظ„طھط¬ظ‡ظٹط²"
                    let hasNewProcessing = newHistory.some(o => 
                        !oldHistoryIds.includes(o.id) && 
                        o.status && o.status.includes("طھط¬ظ‡ظٹط²")
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
            updateSuspendedCount(); // <i class=\'fa-solid fa-star\'></i> V14.2: طھط­ط¯ظٹط« ط§ظ„ط¹ط¯ط§ط¯ ظ…ظ† ط§ظ„ط³ظٹط±ظپط± ط¨ط¹ط¯ ظƒظ„ طھط­ظ…ظٹظ„
            window.financialsData = data.financials || [];
            window.uncollectedOrdersData = data.uncollectedOrders || [];
            // <i class=\'fa-solid fa-star\'></i> V15.1: طھط®ط²ظٹظ† ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¹ظ…ظ„ط§ط، ظپظ‚ط· ط¨ط¯ظˆظ† ط¹ط±ط¶ظ‡ط§ طھظ„ظ‚ط§ط¦ظٹط§ظ‹ (Lazy)
            window.customersData = data.customers || [];
            window.driversList = data.couriers || [];

            if (typeof renderFinancials === 'function') renderFinancials(window.financialsData);

            catalogData = data.catalog || [];
            
            // <i class=\'fa-solid fa-star\'></i> ط¯ظ…ط¬ ظ…ظ†طھط¬ط§طھ Firebase ظپظٹ ط§ظ„ظƒطھط§ظ„ظˆط¬ ط¥ط°ط§ ظ„ظ… طھظƒظ† ظ…ظˆط¬ظˆط¯ط© ظ…ظ† ط§ظ„ط¥ظƒط³ظ„ ظˆط¥ط¶ط§ظپط© ط§ظ„ط¨ط§ط±ظƒظˆط¯
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
            if (govSelect) govSelect.innerHTML = '<option value="">ط§ط®طھط± ظ…ظ† ط§ظ„ظ‚ط§ط¦ظ…ط©</option>';
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
                                    <span class="price-badge premium-badge"><i class=\'fa-solid fa-money-bill-wave\'></i> ${z.price} ط¬.ظ…</span> 
                                    <span class="duration-badge">âڈ±ï¸ڈ ${z.duration}</span>
                                </div>
                            </div>
                            <div class="zone-actions">
                                <button type="button" class="btn-outline interactive-btn" onclick="editZoneUI('${z.name}', '${z.price}', '${z.type}', '${z.duration}')">طھط¹ط¯ظٹظ„ <i class=\'fa-solid fa-pencil\'></i></button>
                                <button type="button" class="btn-danger interactive-btn" onclick="deleteItem('deleteShipping', '${z.name}', '${zoneType}')">ط­ط°ظپ <i class=\'fa-solid fa-xmark\'></i></button>
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
                let driverSelectHtml = '<option value="">ط§ط®طھط± ط§ظ„ظ…ظ†ط¯ظˆط¨</option>';
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
                                <button type="button" class="btn-outline interactive-btn" style="flex: 1; padding: 6px; font-size:0.8rem; border-radius: 6px;" onclick="editDriverUI('${c.name}', '${c.phone}')">طھط¹ط¯ظٹظ„ <i class=\'fa-solid fa-pencil\'></i></button>
                                <button type="button" class="interactive-btn" style="flex: 1; padding: 6px; font-size:0.8rem; background:var(--danger); color:white; border:none; border-radius:6px;" onclick="deleteItem('deleteDriver', '${c.name}')">ط­ط°ظپ <i class=\'fa-solid fa-xmark\'></i></button>
                            </div>
                        </div>`;
                });
                
                if (driverSelect) driverSelect.innerHTML = driverSelectHtml;
                if (assignDriverSelect) assignDriverSelect.innerHTML = driverSelectHtml;
                if (closeDriverSelect) closeDriverSelect.innerHTML = driverSelectHtml;
                if (driversDisplayList) driversDisplayList.innerHTML = displayListHtml;
            }

            // <i class=\'fa-solid fa-star\'></i> ط§ظ‚طھط±ط§ط­ط§طھ ط§ظ„ظ…ظ†طھط¬ط§طھ طھط£طھظٹ ظ…ظ† Firebase ط¨ط¯ظ„ط§ظ‹ ظ…ظ† ط§ظ„ط¥ظƒط³ظ„
            updateSmartSuggestionsFromFirebase();

            const modSelect = document.getElementById('moderatorSelect');
            let currentMod = modSelect ? modSelect.value : "";
            const modsList = document.getElementById('moderatorsList');
            
            if (data.moderators && data.moderators.length > 0) {
                let modSelectHtml = '<option value="">ط§ط®طھط± ط§ط³ظ…ظƒ</option>';
                let modsListHtml = '';
                
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
                if (modSelect) modSelect.innerHTML = '<option value="">ط§ط®طھط± ط§ط³ظ…ظƒ</option>';
                if (modsList) modsList.innerHTML = '<p class="empty-msg">ظ„ط§ ظٹظˆط¬ط¯ ظƒط§ط´ظٹط±ظٹط© ظ…ط³ط¬ظ„ظٹظ†</p>';
            }
            if (modSelect && currentMod) modSelect.value = currentMod;

            // <i class=\'fa-solid fa-star\'></i> V15.1: ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ظٹظˆظ… (today) - طھظ… ط§ط³طھط¨ط¯ط§ظ„ظ‡ط§ ط¨ط§ظ„ظ…ظ†ط·ظ‚ ط§ظ„ظ…ط­ظ„ظٹ ظپظٹ updateAdvancedDashboard ظ„ط­ظ„ ظ…ط´ظƒظ„ط© ط§ظ„ط¥ظƒط³ظٹظ„

            // <i class=\'fa-solid fa-star\'></i> ط¥ط°ط§ ظ„ظ… ظٹظƒظ† ط§ظ„ظ…ط³طھط®ط¯ظ… ظ‚ط¯ ط§ط®طھط§ط± ط´ظ‡ط±ط§ظ‹ ظ…ط¹ظٹظ†ط§ظ‹ ظ„ظ„طھظ‚ط±ظٹط±طŒ ظ†ط¹ط±ط¶ ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ط´ظ‡ط± ط§ظ„ط­ط§ظ„ظٹ ظپظٹ ط§ظ„ظ…ط±ط¨ط¹ط§طھ
            let reportMonthFilter = document.getElementById('reportMonthFilter');
            if (!reportMonthFilter || !reportMonthFilter.value) {
                if (document.getElementById('monthSales')) document.getElementById('monthSales').innerText = data.monthSales || 0;
                if (document.getElementById('monthCount')) document.getElementById('monthCount').innerText = data.monthOrderCount || 0;
                if (document.getElementById('completedMonthCount')) document.getElementById('completedMonthCount').innerText = data.completedMonthCount || 0;
                if (document.getElementById('returnedCount')) document.getElementById('returnedCount').innerText = data.returnedCount || 0;
            }

            // <i class=\'fa-solid fa-star\'></i> ظ…ظ„ط، ظپظ„طھط± ط§ظ„ط´ظ‡ظˆط± ظپظٹ ط§ظ„طھظ‚ط§ط±ظٹط± طھظ„ظ‚ط§ط¦ظٹط§ظ‹
            buildMonthFilterOptions();

            // <i class=\'fa-solid fa-star\'></i> ط§ظ„ظ…ط¨ظƒط± ظ‡ظٹظ†طھ: ط¹ط´ط§ظ† ط§ظ„ظ„ظٹ ظپط§طھط­ ط§ظ„طھظ‚ط§ط±ظٹط± ظٹطھط­ط¯ط« ط¯ط§طھط§ظ‡ طھظ„ظ‚ط§ط¦ظٹط§ظ‹
            window.latestServerData = data;

            // <i class=\'fa-solid fa-star\'></i> ط£ط®ظپظٹ ط§ظ„ط£ظˆط±ط¯ط±ط§طھ ط§ظ„ظ…ط´ط­ظˆظ†ط© ط­طھظ‰ ظٹطھظ… ط§ط®طھظٹط§ط± ط§ظ„ظ…ظ†ط¯ظˆط¨
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
    
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let hasAlert = window.pendingOrdersData.some(o => {
        if (!o.orderType || !o.orderType.includes('ط­ط¬ط²')) return false;
        
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
                <strong style="font-size:0.85rem; color:var(--primary);"><i class=\'fa-solid fa-box\'></i> ط£ظˆط±ط¯ط±ط§طھ ظ…ط¹ظ„ظ‚ط© (ظ„ظ… ظٹطھظ… طھط³ظˆظٹطھظ‡ط§):</strong>`;
            driverOrders.forEach(o => {
                ordersHtml += `
                    <div class="financial-order-item" style="background:#fdfdfd; padding:8px; border:1px solid #eee; border-radius:6px; margin-top:5px; display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.75rem; color:#777;">${o.payment} | ط¥ط¬ظ…ط§ظ„ظٹ: ${o.total}ط¬ | ط´ط­ظ†: ${o.shipping}ط¬</span><br>
                            <span style="font-size:0.85rem; font-weight:bold; color:var(--danger);">ط§ظ„ظ…ط·ظ„ظˆط¨ طھط­طµظٹظ„ظ‡: ${o.remaining}ط¬</span>
                        </div>
                        <button class="btn-settle interactive-btn" onclick="settleDriverOrder('${o.id}', this, '${o.payment}')" style="background:var(--success); color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">طھط³ظˆظٹط© <i class=\'fa-solid fa-money-bill\'></i></button>
                    </div>
                `;
            });
            ordersHtml += `</div>`;
        }

        container.innerHTML += `
            <div class="${cardClass}" style="background: #fff; padding: 15px; border-radius: 12px; border: 1px solid ${cardBorderColor}; margin-bottom: 12px; box-shadow: ${cardShadow}; opacity: ${cardOpacity}; transition: all 0.3s ease;">
                <div class="financial-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #f0f0f0; padding-bottom:8px; margin-bottom:10px;">
                    <span style="font-weight:bold; font-size:1.1rem; color:var(--text-dark);"><i class=\'fa-solid fa-motorcycle\'></i> ${f.name}</span>
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

// <i class=\'fa-solid fa-star\'></i> ط­ظ…ط§ظٹط© طھطµظپظٹط© ط§ظ„ط£ظˆط±ط¯ط± ط¨ط±ط³ط§ظ„ط© ظˆط§ط¶ط­ط© ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ظ†ظˆط¹ ط§ظ„ط¯ظپط¹
window.settleDriverOrder = function (orderId, btn, payMethod) {
    let msg = `ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† طھط³ظˆظٹط© ط§ظ„ط£ظˆط±ط¯ط± (${orderId})طں`;
    if (payMethod.includes('ظƒط§ط´')) msg = `ظ‡ظ„ ط§ط³طھظ„ظ…طھ ط§ظ„ظ†ظ‚ط¯ظٹط© ظ…ظ† ط§ظ„ظ…ظ†ط¯ظˆط¨ ط§ظ„ط®ط§طµط© ط¨ط§ظ„ط£ظˆط±ط¯ط± (${orderId})طں`;
    else msg = `ظ‡ظ„ ظ‚ظ…طھ ط¨طµط±ظپ ط­ظ‚ ط§ظ„ط´ط­ظ† ظ„ظ„ظ…ظ†ط¯ظˆط¨ ط¹ظ† ط§ظ„ط£ظˆط±ط¯ط± (${orderId}) ط§ظ„ظ…ط¯ظپظˆط¹ ط¥ظ„ظƒطھط±ظˆظ†ظٹط§ظ‹طں`;

    customConfirm(msg, () => {
        btn.innerText = "ط¬ط§ط±ظٹ...";
        btn.disabled = true;

        let formData = new URLSearchParams();
        formData.append('action', 'settleOrder');
        formData.append('orderId', orderId);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("<i class=\'fa-solid fa-check\'></i> طھظ…طھ ط§ظ„ظ…ط­ط§ط³ط¨ط© ظˆطھط³ظˆظٹط© ط§ظ„ط£ظˆط±ط¯ط±!", "success");
                loadDataFromServer();
            }).catch(() => {
                showToast("<i class=\'fa-solid fa-xmark\'></i> ط­ط¯ط« ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„", "error");
                btn.innerHTML = "طھط³ظˆظٹط© <i class=\'fa-solid fa-money-bill\'></i>";
                btn.disabled = false;
            });
    });
};

// ==========================================
// 4. ط­ط³ط§ط¨ ط£ط¬ط§ط²ط© ط§ظ„ط¬ظ…ط¹ط© ظˆط§ظ„ط¹ط±ط¨ظˆظ† <i class=\'fa-solid fa-rocket\'></i>
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
            let infoSpan = document.querySelector('#deliveryInfo span'); if (infoSpan) infoSpan.innerHTML = "ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹ <i class=\'fa-solid fa-store\'></i>";
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
    govSelect.innerHTML = '<option value="">ط§ط®طھط± ظ…ظ† ط§ظ„ظ‚ط§ط¦ظ…ط©</option>';

    if (type === 'gov_shipping') {
        if (data.govs && data.govs.length > 0) {
            let optgroup = document.createElement('optgroup'); optgroup.label = "<i class=\'fa-solid fa-truck-fast\'></i> ط§ظ„ظ…ط­ط§ظپط¸ط§طھ";
            data.govs.forEach(z => {
                optgroup.innerHTML += `<option value="${z.name}">${z.name} (${z.price} ط¬)</option>`;
            });
            govSelect.appendChild(optgroup);
        }
    } else {
        if (data.alex && data.alex.length > 0) {
            let optgroup = document.createElement('optgroup'); optgroup.label = "<i class=\'fa-solid fa-link\'></i> ظ…ظ†ط§ط·ظ‚ ط§ظ„ط¥ط³ظƒظ†ط¯ط±ظٹط©";
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
            dateDisplay.innerHTML = "ط­ط³ط¨ ط§ظ„طھط§ط±ظٹط® ط§ظ„ظ…ط®طھط§ط± <i class=\'fa-regular fa-calendar-days\'></i>";
        } else if (info.type === 'next_day') {
            dateDisplay.innerHTML = "طھط§ظ†ظٹ ظٹظˆظ… <i class=\'fa-solid fa-truck-fast\'></i>";
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
window.searchResultsCache = []; // <i class=\'fa-solid fa-star\'></i> ظ„طھط®ط²ظٹظ† ط§ظ„ط¨ط­ط« ط¯ظˆظ† ظ…ط³ط­ ط§ظ„ط³ط¬ظ„

function renderHistoryList(orders, isLoadMore = false) {
    let container = document.getElementById('historyListContainer');
    if (!container) return;

    if (!isLoadMore) {
        container.innerHTML = '';
        currentHistoryPage = 1;
        currentOrdersList = orders;

        if (window.pendingOrdersData && window.pendingOrdersData.length > 0 && document.getElementById('orderSearchInput').value.trim() === "") {
            let pendingDiv = document.createElement('div');
            pendingDiv.innerHTML = `<h4 style="color: #e74c3c; padding-bottom: 5px; margin-bottom: 15px; font-weight: bold;"><i class=\'fa-solid fa-circle text-danger\'></i> ط£ظˆط±ط¯ط±ط§طھ ظ„ظ… طھظڈط´ط­ظ† ط¨ط¹ط¯ (${window.pendingOrdersData.length})</h4>`;

            window.pendingOrdersData.forEach(pOrder => {
                let pType = pOrder.orderType || pOrder.type || pOrder.deliveryType || "";
                let dateHtml = `<span style="color: #e74c3c; font-weight: bold; font-size:0.85rem;"><i class=\'fa-regular fa-calendar-days\'></i> ${pOrder.date}</span>`;
                if (pType.includes('ط­ط¬ط²') || pType === 'special_date') {
                    let resDate = pOrder.reservationDate || pOrder.expectedDate || pOrder.specialDate || pOrder.spDate;
                    if (resDate) {
                        if (resDate.toString().includes('GMT') || resDate.toString().includes('طھظˆظ‚ظٹطھ')) {
                            let d = new Date(resDate);
                            if (!isNaN(d.getTime())) resDate = `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
                        }
                        dateHtml = `<span style="color: #fff; background: #c2185b; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size:0.9rem;"><i class=\'fa-regular fa-calendar\'></i> طھط³ظ„ظٹظ…: ${resDate}</span>`;
                    }
                }
                pendingDiv.innerHTML += `
                    <div class="history-item" style="border-right-color: #e74c3c; background: #fff5f5;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <strong style="font-size: 1.05rem;">${pOrder.id} | ${pOrder.name}</strong>
                            ${dateHtml}
                        </div>
                        <div style="font-size: 0.9rem; color: #555;">
                            <span><i class=\'fa-solid fa-mobile-screen\'></i> ${pOrder.phone} | <span style="color:#000; font-weight:bold;"><i class=\'fa-solid fa-money-bill-wave\'></i> ${pOrder.total} ط¬.ظ…</span></span>
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
            typeBadge = `<span style="background: #e3f2fd; color: #1565c0; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 5px;"><i class=\'fa-solid fa-truck-fast\'></i> طھظˆطµظٹظ„ ظ…ظ†ط²ظ„ظٹ</span>`;
        } else if (oType.includes('ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹') || oType === 'branch') {
            typeBadge = `<span style="background: #e8f5e9; color: #2e7d32; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 5px;"><i class=\'fa-solid fa-store\'></i> ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹</span>`;
        } else if (oType.includes('ظ…ط­ط§ظپط¸ط§طھ') || oType === 'gov_shipping') {
            typeBadge = `<span style="background: #fff3e0; color: #e65100; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 5px;"><i class=\'fa-solid fa-box\'></i> ط´ط­ظ† ظ…ط­ط§ظپط¸ط§طھ</span>`;
        } else if (oType.includes('ط­ط¬ط²') || oType === 'special_date') {
            let resDate = order.reservationDate || order.expectedDate || order.bookingDate || order.specialDate || order.spDate || order.date;
            if (resDate && (resDate.toString().includes('GMT') || resDate.toString().includes('طھظˆظ‚ظٹطھ'))) {
                let d = new Date(resDate);
                if (!isNaN(d.getTime())) resDate = `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
            }
            let dateText = resDate ? `طھط³ظ„ظٹظ…: ${resDate}` : 'ط­ط¬ط² ظ…ط³ط¨ظ‚';
            typeBadge = `<span style="background: #c2185b; color: #fff; padding: 3px 8px; border-radius: 6px; font-size: 0.85rem; margin-right: 5px; font-weight: bold;"><i class=\'fa-regular fa-calendar\'></i> ${dateText}</span>`;
        }

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 8px; align-items: center;">
                <strong style="font-size: 1.05rem;">${order.id} | ${order.name} ${typeBadge}</strong>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="interactive-btn" onclick="shareToWhatsAppGroup('${order.id}')" style="background:none; border:none; font-size:1.3rem; cursor:pointer;" title="ظ…ط´ط§ط±ظƒط© ظ„ظ„ط¬ط±ظˆط¨"><i class=\'fa-solid fa-mobile-screen\'></i></button>
                    <button class="interactive-btn" onclick="printHistoryOrder('${order.id}')" style="background:none; border:none; cursor:pointer;" title="ط·ط¨ط§ط¹ط© ط§ظ„ظپط§طھظˆط±ط©">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-dark);"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    </button>
                    <span style="background: ${statusColor}15; color: ${statusColor}; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">${order.status}</span>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.9rem; color: #666; background: var(--bg-body); padding: 8px; border-radius: 6px;">
                <span>âڈ° ${order.time || '--'}</span>
                <span><i class=\'fa-solid fa-mobile-screen\'></i> ${order.phone}${((order.phone2 || order.secondPhone || order.backupPhone || order.altPhone || order.customerPhone2 || order.otherPhone) && String(order.phone2 || order.secondPhone || order.backupPhone || order.altPhone || order.customerPhone2 || order.otherPhone).trim() !== '') ? ' | <i class=\'fa-solid fa-mobile-screen\'></i> ' + String(order.phone2 || order.secondPhone || order.backupPhone || order.altPhone || order.customerPhone2 || order.otherPhone).trim() : ''}</span>
                <span style="font-weight:bold; color: var(--text-dark);"><i class=\'fa-solid fa-money-bill-wave\'></i> ${order.total} ط¬.ظ…</span>
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
    // <i class=\'fa-solid fa-star\'></i> Fix: String() comparison to prevent type mismatch (string vs number)
    let findFn = o => String(o.id) === String(orderId);
    let order = (window.orderHistoryData || []).find(findFn) ||
        (window.searchResultsCache || []).find(findFn) ||
        (window.pendingOrdersData || []).find(findFn) ||
        (window.suspendedOrdersData || []).find(findFn) ||
        (window.uncollectedOrdersData || []).find(findFn);

    if (!order) {
        customAlert("<i class='fa-solid fa-triangle-exclamation' style='color:var(--danger)'></i> ط®ط·ط£: ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط·ظ„ط¨ ظ„ظ„ط·ط¨ط§ط¹ط©.");
        // <i class=\'fa-solid fa-star\'></i> Debug: log all available IDs to help trace mismatch
        console.warn("printHistoryOrder: could not find orderId =", orderId, typeof orderId);
        console.log("Available history IDs:", (window.orderHistoryData || []).map(o => ({ id: o.id, type: typeof o.id })));
        return;
    }
    console.log("Order Data:", order);

    let isOldGift = order.notes && order.notes.includes("ظ‡ط¯ظٹط©");
    let oTypeStr = String(order.orderType || "").toLowerCase();
    let dTypeStr = String(order.deliveryType || "").toLowerCase();
    let isBranch = oTypeStr.includes('ط§ط³طھظ„ط§ظ…') || oTypeStr.includes('ظپط±ط¹') || oTypeStr === 'branch' || dTypeStr.includes('ط§ط³طھظ„ط§ظ…') || dTypeStr.includes('ظپط±ط¹') || dTypeStr === 'branch';

    let printLogo = document.getElementById('print-logo');
    if (printLogo) {
        let pay = order.payment || "";
        let isGovShipping = oTypeStr === 'gov_shipping' || oTypeStr.includes('ظ…ط­ط§ظپط¸ط§طھ') || dTypeStr === 'gov_shipping';
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
        // <i class=\'fa-solid fa-star\'></i> V15.0: طھط·ط¨ظٹط¹ ط§ظ„ظ†طµ - ط¥ط²ط§ظ„ط© "ط¹ط§ط¯ظٹ" ظ…ظ† "طھظˆطµظٹظ„ ظ…ظ†ط²ظ„ظٹ ط¹ط§ط¯ظٹ"
        let typeStr = (order.orderType || "ط£ظˆط±ط¯ط± طھظˆطµظٹظ„").replace("طھظˆطµظٹظ„ ظ…ظ†ط²ظ„ظٹ ط¹ط§ط¯ظٹ", "طھظˆطµظٹظ„ ظ…ظ†ط²ظ„ظٹ");
        let govStr = order.gov ? order.gov + " - " : "";
        document.getElementById('receipt-type').innerHTML = isOldGift ? `${govStr}${typeStr} - <i class=\'fa-solid fa-gift\'></i> ظ‡ط¯ظٹط©` : `${govStr}${typeStr}`;
    }
    if (document.getElementById('print-date')) document.getElementById('print-date').innerText = order.date || new Date().toLocaleDateString('ar-EG');
    if (document.getElementById('print-time')) document.getElementById('print-time').innerText = order.time || '';

    let printBookingRow = document.querySelector('.print-booking-row');
    if (oTypeStr.includes('ط­ط¬ط²') || oTypeStr === 'special_date') {
        let rDate = order.reservationDate || order.expectedDate || order.specialDate || order.spDate;
        if (rDate) {
            if (printBookingRow) printBookingRow.style.display = 'block';
            if (rDate.toString().includes('GMT') || rDate.toString().includes('طھظˆظ‚ظٹطھ')) {
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

    // <i class=\'fa-solid fa-star\'></i> V14.2: ط¥ط®ظپط§ط، ط§ظ„ط¹ظ†ظˆط§ظ† ظ„ظ„ظپط±ط¹ ط¨ط±ظ…ط¬ظٹط§ظ‹ - ظ„ط§ ظٹط·ط¨ط¹ ط§ظ„ط¹ظ†ظˆط§ظ† ظ†ظ‡ط§ط¦ظٹط§ظ‹
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

    // <i class=\'fa-solid fa-star\'></i> V15.0: ط¥ط®ظپط§ط، ط³ط·ط± ط§ظ„ط´ط­ظ† ظ„ط·ظ„ط¨ط§طھ ط§ط³طھظ„ط§ظ… ط§ظ„ظپط±ط¹ ظ†ظ‡ط§ط¦ظٹط§ظ‹
    let printShippingRow = document.querySelector('.print-shipping-row');
    if (isBranch) {
        if (printShippingRow) printShippingRow.style.display = 'none';
    } else {
        if (printShippingRow) printShippingRow.style.display = '';
        if (document.getElementById('print-shipping')) document.getElementById('print-shipping').innerText = isOldGift ? "***" : (order.shipping || 0);
    }

    if (parseFloat(order.deposit) > 0 && !isOldGift) {
        let depositHtml = `<p class="print-deposit-row">طھظ… ط¯ظپط¹ ط¹ط±ط¨ظˆظ†: <b><span id="print-deposit">${order.deposit}</span></b></p>`;
        document.getElementById('print-deposit-container').innerHTML = depositHtml;
        document.getElementById('print-final').innerText = order.remaining !== undefined ? order.remaining : order.total;
        if (document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "ط§ظ„ظ…طھط¨ظ‚ظٹ ظ„ظ„ط¯ظپط¹";
    } else {
        document.getElementById('print-deposit-container').innerHTML = '';
        document.getElementById('print-final').innerText = isOldGift ? "***" : order.total;
        if (document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ†ظ‡ط§ط¦ظٹ";
    }

    if (document.getElementById('print-payment')) document.getElementById('print-payment').innerText = order.payment || "";

    let sellerP = document.getElementById('print-seller-name');
    if (sellerP) sellerP.innerText = `ط§ظ„ظƒط§ط´ظٹط±: ${order.seller || 'ط؛ظٹط± ظ…ط­ط¯ط¯'}`;

    let isGovShipping = oTypeStr === 'gov_shipping' || oTypeStr.includes('ظ…ط­ط§ظپط¸ط§طھ') || dTypeStr === 'gov_shipping' || oTypeStr.includes('ط´ط­ظ†');
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


// <i class=\'fa-solid fa-star\'></i> ط¥طµظ„ط§ط­ ظ…ط³ط­ ط§ظ„ط°ط§ظƒط±ط© ظپظٹ ظ…ط­ط±ظƒ ط§ظ„ط¨ط­ط« ط§ظ„ط´ط§ظ…ظ„
const searchBtn = document.getElementById('searchBtn');
const orderSearchInput = document.getElementById('orderSearchInput');
if (searchBtn && orderSearchInput) {
    searchBtn.addEventListener('click', () => {
        let keyword = orderSearchInput.value.trim().toLowerCase();
        if (keyword === "") {
            renderHistoryList(orderHistoryData);
        } else {
            let container = document.getElementById('historyListContainer');
            container.innerHTML = '<p class="empty-msg">ط¬ط§ط±ظٹ ط§ظ„ط¨ط­ط« ط§ظ„ط´ط§ظ…ظ„ ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ... <i class=\'fa-solid fa-hourglass-half\'></i></p>';

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
                    container.innerHTML = '<p class="empty-msg"><i class=\'fa-solid fa-xmark\'></i> ط­ط¯ط« ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط¥ظ†طھط±ظ†طھ.</p>';
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

// <i class=\'fa-solid fa-star\'></i> ط¥طµظ„ط§ط­ ط°ط§ظƒط±ط© ط§ظ„ط³ظ…ظƒط©
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
            // ط§ظ„ط¨ط­ط« ط§ظ„ط´ط§ظ…ظ„ ط§ظ„طµط§ظ…طھ ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¹ظ…ظ„ط§ط،
            fetch(`${GOOGLE_SHEETS_URL}?action=globalSearch&query=${phoneVal}`)
                .then(res => res.json())
                .then(data => {
                    if (data.length > 0) fillCustomerData(data[0]);
                    else phoneStatus.innerText = "ًں†•";
                }).catch(() => phoneStatus.innerHTML = "<i class=\'fa-solid fa-magnifying-glass\'></i>");
        }
    } else {
        phoneStatus.innerHTML = "<i class=\'fa-solid fa-magnifying-glass\'></i>";
    }
}

function fillCustomerData(cust) {
    if (document.getElementById('customerName')) document.getElementById('customerName').value = cust.name;
    if (document.getElementById('address') && cust.address && cust.address !== 'ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹') {
        document.getElementById('address').value = cust.address;
    }
    phoneStatus.innerHTML = "<i class=\'fa-solid fa-check\'></i>";
    showToast(`ط£ظ‡ظ„ط§ظ‹ ط¨ط¹ظˆط¯طھظƒ ظٹط§ ${cust.name}!`, "success");
}

if (phoneStatus) phoneStatus.addEventListener('click', performPhoneSearch);
if (phoneInput) phoneInput.addEventListener('change', performPhoneSearch);

const productsContainer = document.getElementById('productsContainer');

// <i class=\'fa-solid fa-star\'></i> ط¯ط§ظ„ط© ط¥ط¶ط§ظپط© ط§ظ„ظ…ظ†طھط¬ط§طھ (ظˆط¥طµظ„ط§ط­ ظ‚ظپظ„ ط§ظ„ط®ط§ظ†ط§طھ ط¹ظ†ط¯ ط§ظ„ط§ط³طھط±ط¬ط§ط¹)
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


    let rOnly = isConfirmed ? 'readonly' : '';

    div.innerHTML = `
        <input type="text" list="smartProductsList" class="product-name-input" placeholder="ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬..." value="${nameVal}" required ${rOnly}>
        <input type="number" class="product-price-input" placeholder="ط§ظ„ط³ط¹ط±" value="${priceVal}" required ${rOnly}>
        <input type="number" class="product-offer-input" placeholder="ط³ط¹ط± ط§ظ„ط¹ط±ط¶" ${rOnly}>
        <input type="number" class="product-qty-input" placeholder="ط§ظ„ظƒظ…ظٹط©" value="${qtyVal}" min="1" required ${rOnly}>
        <div class="product-row-actions">
            <button type="button" class="btn-confirm-pro interactive-btn">âœ”ï¸ڈ</button>
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
            confirmBtn.innerHTML = "âœ”ï¸ڈ";
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
                    customConfirm("طھظ… طھط¹ط¯ظٹظ„ ط³ط¹ط± ط§ظ„ط¹ط±ط¶ ظ„ظ€ " + currentOffer + " ظ‡ظ„ طھط±ظٹط¯ ط­ظپط¸ظ‡ ظƒط³ط¹ط± ط¹ط±ط¶ ط¯ط§ط¦ظ… ظ„ظ„ظ…ظ†طھط¬ ظˆطھظپط¹ظٹظ„ظ‡ ظپظٹ ط§ظ„ظƒطھط§ظ„ظˆط¬طں", () => {
                        window.pushCatalogUpdate(cProd.name, baseP, true, currentOffer);
                        cProd.offerPrice = currentOffer;
                        cProd.isOffer = true;
                    });
                } else if (currentOffer === 0 && currentPrice !== baseP) {
                    customConfirm("طھظ… طھط¹ط¯ظٹظ„ ط§ظ„ط³ط¹ط± ط§ظ„ط£ط³ط§ط³ظٹ ظ„ظ€ " + currentPrice + " ظ‡ظ„ طھط±ظٹط¯ ط­ظپط¸ظ‡ ظƒط³ط¹ط± ط£ط³ط§ط³ظٹ ط¯ط§ط¦ظ… ظپظٹ ط§ظ„ظƒطھط§ظ„ظˆط¬طں", () => {
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
    // <i class=\'fa-solid fa-star\'></i> ط§ظ„ط§ظ‚طھط±ط§ط­ط§طھ طھط£طھظٹ ظ…ظ† Firebase ط£ظˆظ„ط§ظ‹طŒ ظˆط¥ط°ط§ ظ„ظ… طھطھظˆظپط± ظٹط£ط®ط° ظ…ظ† catalogData
    updateSmartSuggestionsFromFirebase();
}
if (document.getElementById('addProductBtn')) document.getElementById('addProductBtn').addEventListener('click', () => addProductRow());
if (productsContainer && productsContainer.children.length === 0) addProductRow();

// <i class=\'fa-solid fa-star\'></i> ظ†ط¸ط§ظ… ط§ظ„ط¹ط±ط¨ظˆظ† ظˆط§ظ„ظ€ NaN
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

// <i class=\'fa-solid fa-star\'></i> ظ…ظ†ط¹ ط§ط®طھط±ط§ظ‚ ط§ظ„ظƒظٹط¨ظˆط±ط¯ ط¨ظ€ readonly ظˆ disabled
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
            isPaymentConfirmed = true; confirmPaymentBtn.classList.add('confirmed'); confirmPaymentBtn.innerHTML = "طھظ… ط§ظ„طھط£ظƒظٹط¯ <i class=\'fa-solid fa-lock\'></i>";
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
        setBtnLoading(suspendBtn, true); // <i class=\'fa-solid fa-star\'></i> ظ…ظ†ط¹ طھظƒط±ط§ط± ط§ظ„ط£ظˆط±ط¯ط±ط§طھ
        let nameEl = document.getElementById('customerName'); let name = nameEl && nameEl.value ? nameEl.value : "ط¨ط¯ظˆظ† ط§ط³ظ…";
        let prods = [];
        document.querySelectorAll('.product-row').forEach(row => {
            let n = row.querySelector('.product-name-input').value, p = row.querySelector('.product-price-input').value, q = row.querySelector('.product-qty-input').value, c = row.classList.contains('confirmed');
            if (n) prods.push({ name: n, price: p, qty: q, confirmed: c });
        });

        // <i class=\'fa-solid fa-star\'></i> V14.2: Timestamp-based ID ظ„ظ…ظ†ط¹ ط§ظ„طھظƒط±ط§ط± ظ†ظ‡ط§ط¦ظٹط§ظ‹
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
                    <button class="btn-search interactive-btn restore-btn" style="padding: 5px 10px; font-size:0.8rem">ط§ط³طھط±ط¬ط§ط¹ <i class=\'fa-solid fa-rotate\'></i></button>
                    <button class="interactive-btn delete-btn" style="padding: 5px 10px; font-size:0.8rem; background-color:var(--danger); color:white; border:none; border-radius:8px; cursor:pointer;">ط­ط°ظپ <i class=\'fa-solid fa-xmark\'></i></button>
                </div>
            `;
            div.querySelector('.restore-btn').addEventListener('click', () => {
                restoreDraft(d); deleteSuspendedDraft(d.id); document.getElementById('suspendedModal').classList.remove('active');
            });
            div.querySelector('.delete-btn').addEventListener('click', () => {
                deleteSuspendedDraft(d.id); div.remove();
                if (list.children.length === 0) list.innerHTML = '<p class="empty-msg">ظ„ط§ طھظˆط¬ط¯ ط·ظ„ط¨ط§طھ ظ…ط¹ظ„ظ‚ط©</p>';
                showToast("<i class=\'fa-solid fa-trash\'></i> طھظ… ط­ط°ظپ ط§ظ„ظ…ط³ظˆط¯ط©", "success");
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
    showToast("<i class=\'fa-solid fa-check\'></i> طھظ… ط§ط³طھط±ط¬ط§ط¹ ط§ظ„ظپط§طھظˆط±ط©!", "success");
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
    if (phoneStatus) phoneStatus.innerHTML = "<i class=\'fa-solid fa-magnifying-glass\'></i>";
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
        let phone2El = document.getElementById('phone2'); let phone2 = phone2El ? phone2El.value.trim() : "";
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
            let n = row.querySelector('.product-name-input').value;
            let price = parseFloat(row.querySelector('.product-price-input').value) || 0;
            let offer = parseFloat(row.querySelector('.product-offer-input').value) || 0;
            let finalPrice = offer > 0 ? offer : price;
            let q = parseFloat(row.querySelector('.product-qty-input').value) || 1;
            productsText += `- ${n} (ط§ظ„ط³ط¹ط±: ${finalPrice}ط¬) - ط§ظ„ظƒظ…ظٹط©: ${q} - ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ: ${finalPrice * q} ط¬.ظ…\n`;
        });
        if (productsText === "") productsText = "ظ„ظ… ظٹطھظ… طھط£ظƒظٹط¯ ط£ظٹ ظ…ظ†طھط¬ط§طھ.\n";

        let productsTotal = document.getElementById('productsTotal') ? document.getElementById('productsTotal').value || 0 : 0;

        let phoneStr = phone2 ? `${displayPhone}\nًں“± ط±ظ‚ظ… ط§ط­طھظٹط§ط·ظٹ: ${phone2}` : displayPhone;
        let message = `ط£ظ‡ظ„ط§ظ‹ ط¨ظƒ ظپظٹ ظƒط§ظ†ط¯ظٹ ظƒظ„ظˆط¨ ًںچ¬\nظٹط±ط¬ظ‰ ظ…ط±ط§ط¬ط¹ط© طھظپط§طµظٹظ„ ط·ظ„ط¨ظƒ:\n\nًں‘¤ ط§ظ„ط§ط³ظ…: ${displayName}\nًں“± ط§ظ„ظ…ظˆط¨ط§ظٹظ„: ${phoneStr}\nًں“چ ط§ظ„ط¹ظ†ظˆط§ظ†: ${displayAddress}\n\nًں›’ طھظپط§طµظٹظ„ ط§ظ„ط·ظ„ط¨:\n${productsText}\n`;
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

        if (productsListText === "") { 
            showToast("ظ„ط§ ظٹظ…ظƒظ† ط­ظپط¸ ط£ظˆط±ط¯ط± ط¨ط¯ظˆظ† ظ…ظ†طھط¬ط§طھ!", "error"); 
            if (typeof window.playErrorBeep === 'function') window.playErrorBeep();
            return; 
        }
        if (!isPaymentConfirmed) { 
            showToast("طھط£ظƒظٹط¯ ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹ <i class=\'fa-solid fa-lock\'></i>", "error"); 
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
            showToast("ظٹط±ط¬ظ‰ ط§ط®طھظٹط§ط± ط§ط³ظ… ط§ظ„ظ…ط³ط¤ظˆظ„ ط¹ظ† ط§ظ„ط£ظˆط±ط¯ط±!", "error"); 
            if (typeof window.playErrorBeep === 'function') window.playErrorBeep();
            return; 
        }

        if (!phone || phone.length < 9) { 
            let pel = document.getElementById('customerPhone');
            if(pel){ pel.classList.add('input-error-flash'); pel.addEventListener('input', ()=>pel.classList.remove('input-error-flash'), {once:true}); }
            showToast("ط±ظ‚ظ… ط§ظ„ظ…ظˆط¨ط§ظٹظ„ ط؛ظٹط± طµط­ظٹط­!", "error"); 
            if (typeof window.playErrorBeep === 'function') window.playErrorBeep();
            return; 
        }
        if (!name) { 
            let nel = document.getElementById('customerName');
            if(nel){ nel.classList.add('input-error-flash'); nel.addEventListener('input', ()=>nel.classList.remove('input-error-flash'), {once:true}); }
            showToast("ط§ظƒطھط¨ ط§ط³ظ… ط§ظ„ط¹ظ…ظٹظ„!", "error"); 
            if (typeof window.playErrorBeep === 'function') window.playErrorBeep();
            return; 
        }
        if (delType === 'normal' && !gov) { 
            let gel = document.getElementById('governorate');
            if(gel){ gel.classList.add('input-error-flash'); gel.addEventListener('change', ()=>gel.classList.remove('input-error-flash'), {once:true}); }
            showToast("ط§ط®طھط± ط§ظ„ظ…ط­ط§ظپط¸ط©!", "error"); 
            if (typeof window.playErrorBeep === 'function') window.playErrorBeep();
            return; 
        }
        if (delType !== 'branch' && addressVal === "") { 
            let ael = document.getElementById('address');
            if(ael){ ael.classList.add('input-error-flash'); ael.addEventListener('input', ()=>ael.classList.remove('input-error-flash'), {once:true}); }
            showToast("ط¨ط±ط¬ط§ط، ظƒطھط§ط¨ط© ط§ظ„ط¹ظ†ظˆط§ظ† ط¨ط§ظ„طھظپطµظٹظ„ ط£ظˆظ„ط§ظ‹!", "error"); 
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
        if (isGift) finalNotes = "<i class=\'fa-solid fa-gift\'></i> ط£ظˆط±ط¯ط± ظ‡ط¯ظٹط© - " + finalNotes;

        let finalTotalVal = document.getElementById('finalTotalDisplay') ? document.getElementById('finalTotalDisplay').innerText : 0;

        // <i class=\'fa-solid fa-star\'></i> ط¥ط¶ط§ظپط© ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¹ط±ط¨ظˆظ†
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
                if (typeof window.hideLoading === 'function') window.hideLoading();
                if (typeof window.playRegisterBeep === 'function') window.playRegisterBeep();
                showToast("<i class=\'fa-solid fa-check\'></i> طھظ… ط­ظپط¸ ط§ظ„ط£ظˆط±ط¯ط± ط¨ظ†ط¬ط§ط­!", "success");

                let isGovShipping = orderTypeLabel === 'gov_shipping' || orderTypeLabel.includes('ظ…ط­ط§ظپط¸ط§طھ') || delType === 'gov_shipping';
                if (isGovShipping) {
                    document.body.classList.add('print-gov-shipping');
                } else {
                    document.body.classList.remove('print-gov-shipping');
                }

                let govStr = gov ? gov + " - " : "";
                if (document.getElementById('receipt-type')) document.getElementById('receipt-type').innerHTML = isGift ? `${govStr}${orderTypeLabel} - <i class=\'fa-solid fa-gift\'></i> ظ‡ط¯ظٹط©` : `${govStr}${orderTypeLabel}`;

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
                    let depositHtml = `<p class="print-deposit-row">طھظ… ط¯ظپط¹ ط¹ط±ط¨ظˆظ†: <b><span id="print-deposit">${dep}</span></b></p>`;
                    document.getElementById('print-deposit-container').innerHTML = depositHtml;
                    document.getElementById('print-final').innerText = rem;
                    if (document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "ط§ظ„ظ…طھط¨ظ‚ظٹ ظ„ظ„ط¯ظپط¹";
                } else {
                    document.getElementById('print-deposit-container').innerHTML = '';
                    document.getElementById('print-final').innerText = isGift ? "***" : finalTotalVal;
                    if (document.getElementById('print-final-label')) document.getElementById('print-final-label').innerText = "ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ†ظ‡ط§ط¦ظٹ";
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
                if (typeof window.hideLoading === 'function') window.hideLoading();
                showToast("<i class=\'fa-solid fa-xmark\'></i> ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط¥ظ†طھط±ظ†طھ", "error");
                setBtnLoading(saveAndPrintBtn, false, "ًں’¾ ط­ظپط¸ ظˆط·ط¨ط§ط¹ط© ط§ظ„ظپط§طھظˆط±ط©");
            });
    });
}

// ==========================================
// 10. ط§ظ„ط¥ط¶ط§ظپط©طŒ ط§ظ„طھط¹ط¯ظٹظ„طŒ ظˆط§ظ„ط­ط°ظپ 
// ==========================================

window.deleteItem = function (action, name, zoneType = '') {
    customConfirm(`ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط­ط°ظپ (${name}) ظ†ظ‡ط§ط¦ظٹط§ظ‹طں`, () => {
        let formData = new URLSearchParams();
        formData.append('action', action);
        formData.append('name', name);
        if (zoneType) formData.append('zoneType', zoneType);

        showToast("<i class=\'fa-solid fa-hourglass-half\'></i> ط¬ط§ط±ظٹ ط§ظ„ط­ط°ظپ...", "warning");
        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("<i class=\'fa-solid fa-check\'></i> طھظ… ط§ظ„ط­ط°ظپ ط¨ظ†ط¬ط§ط­!", "success");
                loadDataFromServer();
            });
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
                showToast(`<i class=\'fa-solid fa-check\'></i> طھظ… ${isExisting ? 'طھط¹ط¯ظٹظ„' : 'ط¥ط¶ط§ظپط©'} ط§ظ„ظ…ظ†ط·ظ‚ط©!`, "success");
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
                showToast(`<i class=\'fa-solid fa-check\'></i> طھظ… ${isExisting ? 'طھط¹ط¯ظٹظ„' : 'ط¥ط¶ط§ظپط©'} ط§ظ„ظ…ظ†ط¯ظˆط¨!`, "success");
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
                showToast("<i class=\'fa-solid fa-check\'></i> طھظ… ط¥ط¶ط§ظپط© ط§ظ„ظƒط§ط´ظٹط± ط¨ظ†ط¬ط§ط­", "success");
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
        const pendingOrders = window.pendingOrdersData.filter(o => o.orderType !== 'ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹' && (!o.orderType || !o.orderType.includes('ط­ط¬ط²') || o.status === 'ظ‚ظٹط¯ ط§ظ„طھط¬ظ‡ظٹط²' || o.status === 'ظپظٹ ط§ظ„ط´ط­ظ†'));
        const resOrders = window.pendingOrdersData.filter(o => o.orderType && o.orderType.includes('ط­ط¬ط²') && o.status !== 'ظ‚ظٹط¯ ط§ظ„طھط¬ظ‡ظٹط²' && o.status !== 'ظپظٹ ط§ظ„ط´ط­ظ†' && o.status !== 'طھظ… ط§ظ„طھظˆطµظٹظ„ ظˆظ…ظڈط­ط§ط³ط¨');

        // <i class=\'fa-solid fa-star\'></i> Update Reservations Badge
        const resBadge = document.getElementById('reservationsCountBadge');
        if (resBadge) {
            resBadge.innerText = `ط§ظ„ط¹ط¯ط¯: ${resOrders.length}`;
            resBadge.style.display = 'inline-block';
        }

        pendingContainer.innerHTML = '';
        if (pendingOrders.length === 0) pendingContainer.innerHTML = '<p class="empty-msg">ظ„ط§ ظٹظˆط¬ط¯ ط£ظˆط±ط¯ط±ط§طھ ط´ط­ظ† ظ‚ظٹط¯ ط§ظ„طھط¬ظ‡ظٹط².</p>';
        else pendingOrders.forEach(o => {
            let badgeClass = "normal";
            let typeText = o.orderType || "طھظˆطµظٹظ„ ظ…ظ†ط²ظ„ظٹ";
            if(typeText.includes("ظ…ط­ط§ظپط¸ط§طھ") || typeText === "gov_shipping") { badgeClass = "gov"; typeText = "ظ…ط­ط§ظپط¸ط§طھ"; }
            
            // ظ…ط­ط§ظˆظ„ط© ط¬ظ„ط¨ ط§ط³ظ… ط§ظ„ظ…ظ†ط·ظ‚ط© ظپظ‚ط· ط¨ط¯ظ„ط§ظ‹ ظ…ظ† ط§ظ„ط¹ظ†ظˆط§ظ† ط§ظ„ظƒط§ظ…ظ„
            let shortAddress = o.gov || o.zone || o.governorate || "";
            if (!shortAddress && o.address) {
                // ظ†ط£ط®ط° ط§ظ„ط¬ط²ط، ط§ظ„ط£ظˆظ„ ظ‚ط¨ظ„ ط£ظٹ ظپط§طµظ„ط© ط£ظˆ ط´ط±ط·ط© ط£ظˆ ط³ط·ط± ط¬ط¯ظٹط¯
                shortAddress = o.address.split(/[-طŒ,\n]/)[0].trim();
            }
            if (!shortAddress) shortAddress = "ط¨ط¯ظˆظ† ط¹ظ†ظˆط§ظ†";

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
                            <div class="soc-info-item money"><i class=\'fa-solid fa-money-bill-wave\'></i> ${o.total} ط¬.ظ…</div>
                            <div class="soc-info-item"><i class=\'fa-solid fa-location-dot\'></i> ${shortAddress}</div>
                        </div>
                    </div>
                </label>`;
        });

        resContainer.innerHTML = '';
        if (resOrders.length === 0) resContainer.innerHTML = '<p class="empty-msg">ظ„ط§ ظٹظˆط¬ط¯ ط­ط¬ظˆط²ط§طھ ظ‚ط§ط¯ظ…ط©.</p>';
        else resOrders.forEach(o => {
            resContainer.innerHTML += `
                <div class="shipping-action-card" style="border-right: 4px solid var(--primary);">
                    <div class="sac-header">
                        <span class="sac-name">${o.name}</span>
                        <span class="sac-id">#${o.id}</span>
                    </div>
                    <div class="sac-finance-row">
                        <div class="sac-date"><i class=\'fa-regular fa-calendar-days\'></i> ${o.date || 'ط­ط¬ط²'}</div>
                        <div class="sac-phone"><i class=\'fa-solid fa-mobile-screen\'></i> ${o.phone}</div>
                        <div class="sac-total">ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ: ${o.total}ط¬</div>
                        <div class="sac-remain">ط§ظ„ظ…طھط¨ظ‚ظٹ: ${o.remaining}ط¬</div>
                    </div>
                    <div class="sac-actions">
                        <button class="sac-btn-deliver interactive-btn" onclick="settleBranchOrder('${o.id}', this)">طھظ… ط§ظ„طھط³ظ„ظٹظ… <i class=\'fa-solid fa-check\'></i></button>
                        <button class="sac-btn-convert interactive-btn" onclick="convertToNormalDelivery('${o.id}', this)">طھط­ظˆظٹظ„ ظ„ط¹ط§ط¯ظٹ <i class=\'fa-solid fa-truck-fast\'></i></button>
                    </div>
                </div>`;
        });
    }

    // <i class=\'fa-solid fa-star\'></i> ظ‚ط³ظ… ط£ظˆط±ط¯ط±ط§طھ ط§ظ„ظپط±ط¹ (ط§ظ„ظ…ظ†ظپطµظ„ط© طھظ…ط§ظ…ط§ظ‹ ط¹ظ† ط§ظ„ظ…ظ†ط¯ظˆط¨ظٹظ†)
    if (branchContainer) {
        const branchOrders = window.pendingOrdersData.filter(o => o.orderType === 'ط§ط³طھظ„ط§ظ… ظ…ظ† ط§ظ„ظپط±ط¹' && o.status !== 'طھظ… ط§ظ„طھظˆطµظٹظ„ ظˆظ…ظڈط­ط§ط³ط¨');

        // <i class=\'fa-solid fa-star\'></i> Update Branch Badge
        const branchBadge = document.getElementById('branchCountBadge');
        if (branchBadge) {
            branchBadge.innerText = `ط¬ط§ظ‡ط² ظ„ظ„ط§ط³طھظ„ط§ظ…: ${branchOrders.length}`;
            branchBadge.style.display = 'inline-block';
        }

        branchContainer.innerHTML = '';
        if (branchOrders.length === 0) branchContainer.innerHTML = '<p class="empty-msg">ظ„ط§ ظٹظˆط¬ط¯ ط£ظˆط±ط¯ط±ط§طھ ط§ط³طھظ„ط§ظ… ظپط±ط¹ ط­ط§ظ„ظٹط§ظ‹.</p>';
        else branchOrders.forEach(o => {
            branchContainer.innerHTML += `
                <div class="shipping-action-card" style="border-right: 4px solid var(--warning);">
                    <div class="sac-header">
                        <span class="sac-name">${o.name}</span>
                        <span class="sac-id">#${o.id}</span>
                    </div>
                    <div class="sac-finance-row">
                        <div class="sac-phone"><i class=\'fa-solid fa-mobile-screen\'></i> ${o.phone}</div>
                        <div class="sac-total">ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ: ${o.total}ط¬</div>
                        <div class="sac-remain">ط§ظ„ظ…طھط¨ظ‚ظٹ: ${o.remaining}ط¬</div>
                    </div>
                    <div class="sac-actions">
                        <button class="sac-btn-deliver interactive-btn" style="width: 100%;" onclick="settleBranchOrder('${o.id}', this)">طھظ… طھط³ظ„ظٹظ… ط§ظ„ظپط±ط¹ <i class=\'fa-solid fa-check\'></i></button>
                    </div>
                </div>`;
        });
    }

    // <i class=\'fa-solid fa-star\'></i> Update Out Orders Badge
    const outOrdersBadge = document.getElementById('outOrdersCountBadge');
    if (outOrdersBadge && window.latestServerData && window.latestServerData.shippedOrders) {
        let outCount = window.latestServerData.shippedOrders.length;
        outOrdersBadge.innerText = `ط§ظ„ط§ظˆط±ط¯ط±ط§طھ ظپظٹ ط§ظ„ط®ط§ط±ط¬ ط­ط§ظ„ظٹط§ظ‹: ${outCount}`;
        outOrdersBadge.style.display = 'inline-block';
    }
}

// <i class=\'fa-solid fa-star\'></i> ط¯ط§ظ„ط© طھط³ظ„ظٹظ… ط§ظ„ظپط±ط¹ ط§ظ„ظپظˆط±ظٹط©
window.settleBranchOrder = function (orderId, btn) {
    let order = window.pendingOrdersData.find(o => String(o.id) === String(orderId));
    customSinglePrompt('ط§ظ„ط±ط¬ط§ط، ط¥ط¯ط®ط§ظ„ ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…ط¯ظپظˆط¹ ظ„ط§ط³طھظ„ط§ظ… ط§ظ„ظپط±ط¹:', order ? order.remaining : 0, (amountPaidText) => {
        if (!amountPaidText) return;

        setBtnLoading(btn, true);
        let formData = new URLSearchParams();
        formData.append('action', 'updateOrderStatus');
        formData.append('orderId', orderId);
        formData.append('status', 'طھظ… ط§ظ„طھظˆطµظٹظ„ ظˆظ…ظڈط­ط§ط³ط¨');

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast(`<i class=\'fa-solid fa-check\'></i> طھظ… ط§ظ„طھط³ظ„ظٹظ… ظˆطھطµظپظٹط© ظ…ط¨ظ„ط؛ (${amountPaidText} ط¬.ظ…) ط¨ظ†ط¬ط§ط­!`, "success");
                if (order) order.status = 'طھظ… ط§ظ„طھظˆطµظٹظ„ ظˆظ…ظڈط­ط§ط³ط¨';
                renderShippingRoom();
                setTimeout(() => loadDataFromServer(), 3000);
            }).catch(() => setBtnLoading(btn, false, "طھظ… ط§ظ„طھط³ظ„ظٹظ… âœ…"));
    });
};

// <i class=\'fa-solid fa-star\'></i> ط¯ط§ظ„ط© طھط­ظˆظٹظ„ ط§ظ„ط­ط¬ط² ظ„طھظˆطµظٹظ„ ط¹ط§ط¯ظٹ
window.convertToNormalDelivery = function (orderId, btn) {
    customConfirm('ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† طھط­ظˆظٹظ„ ظ‡ط°ط§ ط§ظ„ط­ط¬ط² ط¥ظ„ظ‰ طھظˆطµظٹظ„ ظپظˆط±ظٹ ط¹ط§ط¯ظٹطں', () => {
        setBtnLoading(btn, true);
        let formData = new URLSearchParams();
        formData.append('action', 'updateOrderStatus');
        formData.append('orderId', orderId);
        formData.append('status', 'ظ‚ظٹط¯ ط§ظ„طھط¬ظ‡ظٹط²');
        formData.append('orderType', 'طھظˆطµظٹظ„ ظ…ظ†ط²ظ„ظٹ ط¹ط§ط¯ظٹ');

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("<i class=\'fa-solid fa-check\'></i> طھظ… ط§ظ„طھط­ظˆظٹظ„ ظ„طھظˆطµظٹظ„ ظپظˆط±ظٹ ط¨ظ†ط¬ط§ط­!", "success");
                let order = window.pendingOrdersData.find(o => String(o.id) === String(orderId));
                if (order) {
                    order.status = 'ظ‚ظٹط¯ ط§ظ„طھط¬ظ‡ظٹط²';
                    order.orderType = 'طھظˆطµظٹظ„ ظ…ظ†ط²ظ„ظٹ ط¹ط§ط¯ظٹ';
                }
                renderShippingRoom();
                setTimeout(() => loadDataFromServer(), 3000);
            }).catch(() => setBtnLoading(btn, false, "طھط­ظˆظٹظ„ ظ„طھظˆطµظٹظ„ ط¹ط§ط¯ظٹ ًںڑڑ"));
    });
};

// <i class=\'fa-solid fa-star\'></i> ط­ظ…ط§ظٹط© ط²ط±ط§ط± (طھظ‚ظپظٹظ„ ط§ظ„ظ…ظ†ط¯ظˆط¨ظٹظ†)
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

        shippedContainer.innerHTML = '<p class="empty-msg"><i class=\'fa-solid fa-hourglass-half\'></i> ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط¹ظ‡ط¯ط© ط§ظ„ظ…ظ†ط¯ظˆط¨...</p>';

        // <i class=\'fa-solid fa-star\'></i> Fix: ط§ط³طھط®ط¯ط§ظ… shippedOrders ط§ظ„ظ…ط±ط³ظ„ط© ظ…ظ† ط§ظ„ط¥ظƒط³ظٹظ„ ظ…ط¨ط§ط´ط±ط©
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

// <i class=\'fa-solid fa-star\'></i> ط¯ط§ظ„ط© ظ…ط³ط§ط¹ط¯ط© ظ„ط¹ط±ط¶ ط£ظˆط±ط¯ط±ط§طھ ط§ظ„ظ…ظ†ط¯ظˆط¨ ط§ظ„ظ…ط´ط­ظˆظ†ط©
function renderDriverShippedOrders(shippedOrders, container) {
    container.innerHTML = '';
    if (shippedOrders.length === 0) {
        container.innerHTML = '<p class="empty-msg">ظ„ط§ طھظˆط¬ط¯ ط£ظˆط±ط¯ط±ط§طھ ظپظٹ ط§ظ„ط´ط­ظ† ظ„ظ‡ط°ط§ ط§ظ„ظ…ظ†ط¯ظˆط¨.</p>';
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
                            <div class="soc-info-item remaining"><i class=\'fa-solid fa-money-bill-wave\'></i> ط¹ظ‡ط¯ط©: ${o.remaining} ط¬.ظ…</div>
                        </div>
                    </div>
                </label>`;
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
                    showToast(`<i class=\'fa-solid fa-check\'></i> طھظ… ط§ظ„طھط­ط¯ظٹط« ظ„ظ€ "${newStatus}"`, "success");
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
    let ordersListText = `ط£ظˆط±ط¯ط±ط§طھ ط§ظ„ظ…ظ†ط¯ظˆط¨: ${driver} ًںڈچï¸ڈ\n\n`;
    let totalCash = 0;

    const selected = Array.from(document.querySelectorAll('.pending-checkbox:checked')).map(cb => cb.value);
    if (selected.length === 0) { showToast("ط­ط¯ط¯ ط£ظˆط±ط¯ط± ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„!", "warning"); return; }

    selected.forEach((orderId, idx) => {
        let o = orderHistoryData.find(x => x.id === orderId);
        if (o) {
            ordersListText += `${idx + 1}. ط§ظ„ط¹ظ…ظٹظ„: ${o.name}\nًں“± ${o.phone}\nًں“چ ط§ظ„ط¹ظ†ظˆط§ظ†: ${o.address}\nًں’° ط§ظ„ظ…ط·ظ„ظˆط¨: ${o.remaining} ط¬.ظ…\nًں›’ ط§ظ„ظ…ظ†طھط¬ط§طھ: ${o.products.replace(/\n/g, ', ')}\n\n`;
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

    // <i class=\'fa-solid fa-star\'></i> Fix: ط§ط³طھط®ط¯ط§ظ… ط§ظ„طھط§ط±ظٹط® ط§ظ„ظ…ط­ظ„ظٹ ط¨ط¯ظ„ UTC ظ„طھط¬ظ†ط¨ ظ…ط´ظƒظ„ط© ط§ظ„ظ€ timezone
    let now = new Date();
    let todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    let monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    let allOrders = window.orderHistoryData || [];

    let todayOrdersCount = 0;
    let todaySalesTotal = 0;

    // <i class=\'fa-solid fa-star\'></i> Fix: ط¯ظ…ط¬ ظƒظ„ ظ…طµط§ط¯ط± ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ„ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ طµظˆط±ط© ط´ط§ظ…ظ„ط© (ظ„ظ„ظٹظˆظ… ظپظ‚ط·)
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

    // <i class=\'fa-solid fa-star\'></i> ط­ط³ط§ط¨ ط§ظ„ط¹ظ‡ط¯ط© ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹط© ظ…ظ† ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط§ظ„ظٹط© (ظ…ظ† ط§ظ„ط¥ظƒط³ظٹظ„ ظ…ط¨ط§ط´ط±ط©)
    let moneyWithDrivers = 0;
    if (window.latestServerData && window.latestServerData.financials) {
        window.latestServerData.financials.forEach(f => {
            moneyWithDrivers += parseFloat(f.inTransit) || 0;
        });
    }

    // ط¹ط±ط¶ ط§ظ„ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ط£ط³ط§ط³ظٹط©
    if (document.getElementById('moneyWithDrivers')) document.getElementById('moneyWithDrivers').innerText = moneyWithDrivers;

    // <i class=\'fa-solid fa-star\'></i> طھط­ط¯ظٹط« ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ظٹظˆظ… ظ…ط­ظ„ظٹط§ظ‹ ط¨ط´ظƒظ„ طµط­ظٹط­
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

// <i class=\'fa-solid fa-star\'></i> V15.1: ط¨ظ†ط§ط، ظ‚ط§ط¦ظ…ط© ط§ظ„ط´ظ‡ظˆط± ظ„ظپظ„طھط± ط§ظ„طھظ‚ط§ط±ظٹط± - ط´ظ‡ظˆط± ظپظٹظ‡ط§ ط¨ظٹط§ظ†ط§طھ ظپظ‚ط·
function buildMonthFilterOptions() {
    let sel = document.getElementById('reportMonthFilter');
    if (!sel) return;
    let currentVal = sel.value;
    sel.innerHTML = '<option value="">ط§ط®طھط± ط§ظ„ط´ظ‡ط±</option>';
    let arabicMonths = ['ظٹظ†ط§ظٹط±', 'ظپط¨ط±ط§ظٹط±', 'ظ…ط§ط±ط³', 'ط£ط¨ط±ظٹظ„', 'ظ…ط§ظٹظˆ', 'ظٹظˆظ†ظٹظˆ', 'ظٹظˆظ„ظٹظˆ', 'ط£ط؛ط³ط·ط³', 'ط³ط¨طھظ…ط¨ط±', 'ط£ظƒطھظˆط¨ط±', 'ظ†ظˆظپظ…ط¨ط±', 'ط¯ظٹط³ظ…ط¨ط±'];

    // <i class=\'fa-solid fa-star\'></i> Fix: ط¬ظ…ط¹ ظƒظ„ ط§ظ„ط´ظ‡ظˆط± ط§ظ„ظپط¹ظ„ظٹط© ظ…ظ† ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…طھط§ط­ط©
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

    // <i class=\'fa-solid fa-star\'></i> Fix: ط¥ط¶ط§ظپط© ط§ظ„ط´ظ‡ط± ط§ظ„ط­ط§ظ„ظٹ ط¯ط§ط¦ظ…ط§ظ‹ (ط¨ط¯ظˆظ† toISOString)
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

// <i class=\'fa-solid fa-star\'></i> V15.1: ط¹ط±ط¶ طھظ‚ط±ظٹط± ط´ظ‡ط± ظ…ط­ط¯ط¯ - ظٹط¬ظ„ط¨ ظ…ظ† ط§ظ„ط³ظٹط±ظپط±
function renderReportForMonth(targetMonth) {
    let statusEl = document.getElementById('reportFilterStatus');
    let topEl = document.getElementById('topProductsList');
    let pltEl = document.getElementById('platformStatsList');
    if (!targetMonth) {
        if (statusEl) statusEl.innerHTML = '<i class=\'fa-solid fa-triangle-exclamation\'></i> ط§ط®طھط± ط´ظ‡ط±ط§ظ‹ ط£ظˆظ„ط§ظ‹';
        return;
    }
    if (statusEl) statusEl.innerHTML = '<i class=\'fa-solid fa-hourglass-half\'></i> ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط´ظ‡ط±...';
    if (topEl) topEl.innerHTML = '<p class="empty-msg"><i class=\'fa-solid fa-hourglass-half\'></i> ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„...</p>';
    if (pltEl) pltEl.innerHTML = '<p class="empty-msg"><i class=\'fa-solid fa-hourglass-half\'></i> ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„...</p>';

    let fetchDate = targetMonth + '-01';
    fetch(`${GOOGLE_SHEETS_URL}?date=${fetchDate}`)
        .then(r => r.json())
        .then(data => {
            let arabicMonths = ['ظٹظ†ط§ظٹط±', 'ظپط¨ط±ط§ظٹط±', 'ظ…ط§ط±ط³', 'ط£ط¨ط±ظٹظ„', 'ظ…ط§ظٹظˆ', 'ظٹظˆظ†ظٹظˆ', 'ظٹظˆظ„ظٹظˆ', 'ط£ط؛ط³ط·ط³', 'ط³ط¨طھظ…ط¨ط±', 'ط£ظƒطھظˆط¨ط±', 'ظ†ظˆظپظ…ط¨ط±', 'ط¯ظٹط³ظ…ط¨ط±'];
            let [yr, mo] = targetMonth.split('-');
            if (statusEl) statusEl.innerHTML = `<i class=\'fa-solid fa-check\'></i> طھظ… طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ${arabicMonths[parseInt(mo) - 1]} ${yr}`;

            // ط£ظپط¶ظ„ 10 ظ…ظ†طھط¬ط§طھ
            if (topEl) {
                let products = data.monthTopProducts || [];
                if (products.length === 0) {
                    topEl.innerHTML = '<p class="empty-msg">ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ظ…ط¨ظٹط¹ط§طھ ظپظٹ ظ‡ط°ط§ ط§ظ„ط´ظ‡ط±.</p>';
                } else {
                    let maxVal = Math.max(...products.map(p => p.qty || 0)) || 1;
                    topEl.innerHTML = products.map((p, idx) => {
                        let pct = Math.round(((p.qty || 0) / maxVal) * 100);
                        let medal = idx === 0 ? 'ًں¥‡' : idx === 1 ? 'ًں¥ˆ' : idx === 2 ? 'ًں¥‰' : `${idx + 1}.`;
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

            // <i class=\'fa-solid fa-star\'></i> طھط­ط¯ظٹط« ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ط´ظ‡ط± ظپظٹ ط£ط¹ظ„ظ‰ ط§ظ„طµظپط­ط© ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط§ظ„ط´ظ‡ط± ط§ظ„ظ…ط®طھط§ط±
            if (document.getElementById('monthCount')) document.getElementById('monthCount').innerText = data.monthOrderCount || 0;
            if (document.getElementById('monthSales')) document.getElementById('monthSales').innerText = data.monthSales || 0;
            if (document.getElementById('completedMonthCount')) document.getElementById('completedMonthCount').innerText = data.completedMonthCount || 0;
            if (document.getElementById('returnedCount')) document.getElementById('returnedCount').innerText = data.returnedCount || 0;

            // ط£ط¯ط§ط، ط§ظ„ظ…ظ†طµط§طھ - ط¨ط§ظ„طھط±طھظٹط¨ ط§ظ„ظ…ط­ط¯ط¯
            if (pltEl) {
                let raw = data.monthPlatforms || {};
                const ORDER = [
                    { key: 'ظˆط§طھط³ط§ط¨', emoji: '<i class=\'fa-brands fa-whatsapp\'></i>', color: '#25D366' },
                    { key: 'ط§ظ†ط³طھط¬ط±ط§ظ…', emoji: '<i class=\'fa-brands fa-instagram\'></i>', color: '#E1306C' },
                    { key: 'ظپظٹط³ط¨ظˆظƒ', emoji: '<i class=\'fa-brands fa-facebook\'></i>', color: '#1877F2' },
                    { key: 'طھظٹظƒ طھظˆظƒ', emoji: '<i class=\'fa-brands fa-tiktok\'></i>', color: '#010101' },
                ];
                // <i class=\'fa-solid fa-star\'></i> ط­ط³ط§ط¨ ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ ط¨ط§ط³طھط®ط¯ط§ظ… includes ظ„طھط؛ط·ظٹط© ط§ظ„ط¥ظٹظ…ظˆط¬ظٹ ظپظٹ ط§ظ„ط´ظٹطھ
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
            if (statusEl) statusEl.innerHTML = '<i class=\'fa-solid fa-xmark\'></i> ط­ط¯ط« ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„';
            if (topEl) topEl.innerHTML = '<p class="empty-msg"><i class=\'fa-solid fa-xmark\'></i> طھط¹ط°ط± ط§ظ„طھط­ظ…ظٹظ„</p>';
            if (pltEl) pltEl.innerHTML = '<p class="empty-msg"><i class=\'fa-solid fa-xmark\'></i> طھط¹ط°ط± ط§ظ„طھط­ظ…ظٹظ„</p>';
        });
}

// <i class=\'fa-solid fa-star\'></i> V15.1: ط±ط¨ط· ط²ط±ط§ط± ط§ظ„طھظ‚ط§ط±ظٹط±
let loadReportsBtn = document.getElementById('loadReportsBtn');
if (loadReportsBtn) {
    let reportsVisible = false;
    loadReportsBtn.addEventListener('click', () => {
        let sec = document.getElementById('detailedReportsSection');
        if (!sec) return;
        reportsVisible = !reportsVisible;
        sec.style.display = reportsVisible ? 'block' : 'none';
        loadReportsBtn.innerHTML = reportsVisible ? '<i class=\'fa-solid fa-chart-column\'></i> ط¥ط®ظپط§ط، ط§ظ„طھظ‚ط§ط±ظٹط± ط§ظ„طھظپطµظٹظ„ظٹط©' : '<i class=\'fa-solid fa-chart-column\'></i> ط¥ط¸ظ‡ط§ط± ط§ظ„طھظ‚ط§ط±ظٹط± ط§ظ„طھظپطµظٹظ„ظٹط©';
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
        showToast("ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط§ظ„ط£ظˆط±ط¯ط±", "error");
        console.warn("shareToWhatsAppGroup: could not find orderId =", orderId, typeof orderId);
        console.log("Available IDs in history:", (window.orderHistoryData || []).map(o => ({ id: o.id, type: typeof o.id })));
        return;
    }
    console.log("Order Data:", order);

    // <i class=\'fa-solid fa-star\'></i> V14.2: ط¥طµظ„ط§ط­ ط´ط§ظ…ظ„ ظ„ظ€ Keys ط§ظ„ظ‚ط§ط¯ظ…ط© ظ…ظ† ط§ظ„ط¥ظƒط³ظٹظ„ - fallback ظ„ظƒظ„ ط­ظ‚ظ„
    let _name = order.name || order.customerName || "";
    let _gov = order.gov || order.governorate || "";
    let _address = order.address || order.customerAddress || order.addr || "";
    let _phone = order.phone || order.customerPhone || order.mobile || "";
    let _phone2 = order.phone2 || order.secondPhone || order.backupPhone || order.altPhone || order.customerPhone2 || order.otherPhone || "";
    let _payment = order.payment || order.paymentMethod || order.payMethod || "";
    let _products = order.products || order.items || order.productDetails || "";
    let _shipping = parseFloat(order.shipping || order.shippingCost || order.shippingFee || 0);
    let _remaining = order.remaining !== undefined ? order.remaining : (order.total || order.finalTotal || 0);
    let _type = order.orderType || order.type || order.deliveryType || "طھظˆطµظٹظ„";

    let text = `*ظ†ظˆط¹ ط§ظ„ط·ظ„ط¨:* ${_type}\n`;
    if (_type.includes('ط­ط¬ط²') || _type === 'special_date') {
        let resDate = order.reservationDate || order.expectedDate || order.bookingDate || order.specialDate || order.spDate;
        if (resDate) {
            if (resDate.toString().includes('GMT') || resDate.toString().includes('طھظˆظ‚ظٹطھ')) {
                let d = new Date(resDate);
                if (!isNaN(d.getTime())) resDate = `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
            }
            text += `ًں“… *طھط§ط±ظٹط® ط§ظ„طھط³ظ„ظٹظ…:* ${resDate}\n`;
        }
    }
    text += `*طھط§ط±ظٹط® ط¥ظ†ط´ط§ط، ط§ظ„ط£ظˆط±ط¯ط±:* ${order.date || new Date().toLocaleDateString('ar-EG')} âڈ° ${order.time || new Date().toLocaleTimeString('ar-EG')}\n`;
    
    let tCount = document.getElementById('todayCount') ? document.getElementById('todayCount').innerText : "0";
    let mCount = document.getElementById('monthCount') ? document.getElementById('monthCount').innerText : "0";
    text += `ط¹ط¯ط¯ ط§ظˆط±ط¯ط±ط§طھ ط§ظ„ظٹظˆظ… : ${tCount}\n`;
    text += `ط¹ط¯ط¯ ط§ظˆط±ط¯ط±ط§طھ ط§ظ„ط´ظ‡ط± : ${mCount}\n`;

    text += `ًں‘¤ *ط§ظ„ط¹ظ…ظٹظ„:* ${_name}\n`;
    if (!_type.includes('ط§ط³طھظ„ط§ظ…') && !_type.includes('ظپط±ط¹') && (_gov || _address)) {
        text += `ًں“چ *ط§ظ„ط¹ظ†ظˆط§ظ†:* ${_gov ? _gov + " - " : ""}${_address}\n`;
    }
    if (_phone) text += `ًں“± *ط§ظ„ظ…ظˆط¨ط§ظٹظ„:* ${_phone}\n`;
    if (_phone2 && String(_phone2).trim() !== '') text += `ًں“± *ط±ظ‚ظ… ط§ط­طھظٹط§ط·ظٹ:* ${String(_phone2).trim()}\n`;
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
            let n = row.querySelector('.product-name-input').value;
            let price = parseFloat(row.querySelector('.product-price-input').value) || 0;
            let offer = parseFloat(row.querySelector('.product-offer-input').value) || 0;
            let finalPrice = offer > 0 ? offer : price;
            let q = parseFloat(row.querySelector('.product-qty-input').value) || 1;
            productsListText += `${n} - ط§ظ„ظƒظ…ظٹط©: ${q} (${finalPrice * q}ط¬)\n`;
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
// 12. ظ†ط¸ط§ظ… ط§ظ„ظƒطھط§ظ„ظˆط¬ ظˆط§ظ„ظ†ظˆط§ظ‚طµ ط§ظ„ط´ط§ظ…ظ„
// ==========================================

window.pushCatalogUpdate = function (name, price, isOffer, offerPrice) {
    // طھط­ط¯ظٹط« ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ…ط­ظ„ظٹط§ظ‹ ظپظˆط±ط§ظ‹ ظ„ظ…ظ†ط¹ ط§ط®طھظپط§ط، ط§ظ„طھط¹ط¯ظٹظ„
    let existing = catalogData.find(p => p.name === name);
    if (existing) {
        existing.isOffer = isOffer;
        existing.offerPrice = offerPrice;
        existing.price = price;
    } else {
        catalogData.push({ name, price, isOffer, offerPrice });
    }
    
    // ط¥ط¹ط§ط¯ط© ط§ظ„ط±ط³ظ… ظپظˆط±ط§ظ‹ ظ„ظٹط±ظ‰ ط§ظ„ظ…ط³طھط®ط¯ظ… ط§ظ„ظ†طھظٹط¬ط© ط¨ط¯ظˆظ† ط§ظ†طھط¸ط§ط±
    renderCatalog();

    let formData = new URLSearchParams();
    formData.append('action', 'updateCatalog');
    formData.append('name', name);
    formData.append('price', price);
    formData.append('isOffer', isOffer);
    formData.append('offerPrice', offerPrice);
    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData });
};

// ظ…طھط؛ظٹط±ط§طھ ظ†ط¸ط§ظ… طھظ‚ط³ظٹظ… طµظپط­ط§طھ ط§ظ„ظƒطھط§ظ„ظˆط¬ (Pagination)
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
    if (pageInfo) pageInfo.innerText = `طµظپط­ط© ${catalogCurrentPage} ظ…ظ† ${totalPages}`;
}

// ط¯ط§ظ„ط© ط§ظ„ط¹ط±ط¶ ط§ظ„ط£ط³ط§ط³ظٹط© ظ„ظ„ظƒطھط§ظ„ظˆط¬ (ظ…ط¬ظ‡ط²ط© ط¨ط§ظ„طµظپط­ط§طھ ظˆط§ظ„ط¨ط­ط«)
function renderCatalog() {
    let container = document.getElementById('catalogListContainer');
    if (!container) return;
    container.innerHTML = '';

    // ظپظ„طھط±ط© ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط§ظ„ط¨ط­ط«
    currentFilteredCatalog = catalogData || [];
    if (catalogSearchQuery.trim() !== "") {
        let q = catalogSearchQuery.trim().toLowerCase();
        currentFilteredCatalog = currentFilteredCatalog.filter(p => 
            p.name.toLowerCase().includes(q) || 
            (p.barcode && String(p.barcode).toLowerCase().includes(q))
        );
    }

    if (currentFilteredCatalog.length === 0) {
        container.innerHTML = '<p class="empty-msg">ظ„ط§ ظٹظˆط¬ط¯ ظ…ظ†طھط¬ط§طھ ظ„ط¹ط±ط¶ظ‡ط§.</p>';
        updateCatalogPaginationUI();
        return;
    }

    // ط­ط³ط§ط¨ ط§ظ„ظ…ظ†طھط¬ط§طھ ط§ظ„طھظٹ ط³طھط¸ظ‡ط± ظپظٹ ط§ظ„طµظپط­ط© ط§ظ„ط­ط§ظ„ظٹط© (Sliding Window: 3 Pages Max)
    let totalPages = Math.ceil(currentFilteredCatalog.length / CATALOG_ITEMS_PER_PAGE) || 1;
    if (catalogCurrentPage > totalPages) catalogCurrentPage = totalPages;
    if (catalogCurrentPage < 1) catalogCurrentPage = 1;

    let startPage = Math.max(1, catalogCurrentPage - 1);
    let endPage = Math.min(totalPages, catalogCurrentPage + 1);
    
    // ط§ظ„ط­ظپط§ط¸ ط¹ظ„ظ‰ 3 طµظپط­ط§طھ ط¯ط§ط¦ظ…ط§ظ‹ ط¥ط°ط§ ط£ظ…ظƒظ† (ظ„طھط­ط³ظٹظ† طھط¬ط±ط¨ط© ط§ظ„ظ…ط³طھط®ط¯ظ… ظˆطھظ‚ظ„ظٹظ„ ط¥ط¹ط§ط¯ط© ط§ظ„طھط­ظ…ظٹظ„)
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
                <span class="catalog-price">ط£ط³ط§ط³ظٹ: ${p.price} ط¬.ظ…</span>
                ${isOfferActive ? `<span class="catalog-offer-price">ط³ط¹ط± ط§ظ„ط¹ط±ط¶: ${p.offerPrice} ط¬.ظ…</span>` : ''}
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; align-items:center;">
                <label class="switch" title="طھظپط¹ظٹظ„/ط¥ظٹظ‚ط§ظپ ط§ظ„ط¹ط±ط¶">
                    <input type="checkbox" class="offer-toggle" ${isOfferActive ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
                <button class="btn-outline interactive-btn edit-cat-btn" style="padding:4px; font-size:0.7rem;">طھط¹ط¯ظٹظ„ <i class=\'fa-solid fa-pencil\'></i></button>
            </div>
        `;

        div.querySelector('.offer-toggle').addEventListener('change', (e) => {
            let newState = e.target.checked;
            let currentOffer = p.offerPrice || p.price;
            if (newState && !p.offerPrice) {
                customSinglePrompt(`ط£ط¯ط®ظ„ ط³ط¹ط± ط§ظ„ط¹ط±ط¶ ظ„ظ€ ${p.name}:`, p.price, (val) => {
                    if (!val) { e.target.checked = false; return; }
                    currentOffer = val;
                    window.pushCatalogUpdate(p.name, p.price, newState, currentOffer);
                    showToast("<i class=\'fa-solid fa-check\'></i> طھظ… طھظپط¹ظٹظ„ ط§ظ„ط¹ط±ط¶", "success");
                });
            } else {
                window.pushCatalogUpdate(p.name, p.price, newState, currentOffer);
                showToast(newState ? "<i class=\'fa-solid fa-check\'></i> طھظ… طھظپط¹ظٹظ„ ط§ظ„ط¹ط±ط¶" : "<i class=\'fa-solid fa-xmark\'></i> طھظ… ط¥ظٹظ‚ط§ظپ ط§ظ„ط¹ط±ط¶", "success");
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

// ط£ط­ط¯ط§ط« ط´ط±ظٹط· ط§ظ„ط¨ط­ط« ظˆط§ظ„طھظ†ظ‚ظ„
document.addEventListener('DOMContentLoaded', () => {
    let sInput = document.getElementById('catalogSearchInput');
    if (sInput) {
        sInput.addEventListener('input', (e) => {
            catalogSearchQuery = e.target.value;
            catalogCurrentPage = 1; // ط§ظ„ط±ط¬ظˆط¹ ظ„ط£ظˆظ„ طµظپط­ط© ط¹ظ†ط¯ ط§ظ„ط¨ط­ط«
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
            showToast("<i class=\'fa-solid fa-check\'></i> طھظ… ط§ظ„طھط¹ط¯ظٹظ„ ط¨ظ†ط¬ط§ط­", "success");
            setBtnLoading(saveEditCatBtn, false, "ط­ظپط¸ ط§ظ„طھط¹ط¯ظٹظ„ط§طھ");
            document.getElementById('editCatalogModal').classList.remove('active');
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
        showToast("<i class=\'fa-solid fa-check\'></i> طھظ… ط¥ط¶ط§ظپط© ط§ظ„ظ…ظ†طھط¬", "success");
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
                <button class="interactive-btn wa-oos-btn" style="background:#25D366; color:white; border:none; padding:5px 10px; border-radius:8px;"><i class=\'fa-brands fa-whatsapp\'></i></button>
                <button class="interactive-btn del-oos-btn" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:8px;"><i class=\'fa-solid fa-xmark\'></i></button>
            </div>
        `;

        div.querySelector('.wa-oos-btn').addEventListener('click', () => {
            let phone = item.phone.toString().replace(/'/g, '').trim();
            if (phone.startsWith('0')) phone = '+2' + phone;
            let msg = `ط£ظ‡ظ„ط§ظ‹ ط¨ظƒ ظٹط§ ${item.customer} ًں‘‹\nط§ظ„ظ…ظ†طھط¬ ط§ظ„ظ„ظٹ ط³ط£ظ„طھظ†ط§ ط¹ظ„ظٹظ‡ (${item.product}) ظ…طھظˆظپط± ط¯ظ„ظˆظ‚طھظٹ ظˆطھظ‚ط¯ط± طھط·ظ„ط¨ظ‡! ًںچ¬`;
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        });

        div.querySelector('.del-oos-btn').addEventListener('click', () => {
            customConfirm("ظ…ط³ط­ ط§ظ„ط¹ظ…ظٹظ„ ظ…ظ† ظ‚ط§ط¦ظ…ط© ط§ظ„ظ†ظˆط§ظ‚طµطں", () => {
                let formData = new URLSearchParams();
                formData.append('action', 'deleteOutOfStock');
                formData.append('phone', item.phone);
                formData.append('product', item.product);
                fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData });
                div.remove();
                showToast("طھظ… ط§ظ„ط­ط°ظپ ط¨ظ†ط¬ط§ط­", "success");
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
                showToast("<i class=\'fa-solid fa-check\'></i> طھظ… طھط³ط¬ظٹظ„ ط§ظ„ظ†ط§ظ‚طµ", "success");
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
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;"><i class=\'fa-solid fa-box-open\' style=\'font-size: 3rem; margin-bottom: 10px;\'></i><p>ظ„ط§ ظٹظˆط¬ط¯ ط¹ظ…ظ„ط§ط، ظ…ط·ط§ط¨ظ‚ظٹظ† ظ„ظ„ط¨ط­ط«.</p></div>';
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
                <span><i class=\'fa-solid fa-location-dot\' style=\'color: #e74c3c;\'></i> ${c.gov || 'ط؛ظٹط± ظ…ط­ط¯ط¯'} - ${c.address || ''}</span>
                <div style="display: flex; justify-content: space-between; background: #f9f9f9; padding: 8px; border-radius: 8px; margin-top: 5px;">
                    <span><i class=\'fa-solid fa-cart-shopping\' style=\'color: #3498db;\'></i> ط·ظ„ط¨ط§طھ: <strong>${c.count || 0}</strong></span>
                    <span><i class=\'fa-solid fa-money-bill-wave\' style=\'color: #27ae60;\'></i> ظ…ط¯ظپظˆط¹ط§طھ: <strong>${c.total || 0}ط¬</strong></span>
                </div>
                <span style="font-size: 0.75rem; color: #999; text-align: left; margin-top: 5px;"><i class=\'fa-regular fa-calendar\'></i> ط¢ط®ط± ط·ظ„ط¨: ${c.lastDate ? String(c.lastDate).split('T')[0] : '--'}</span>
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
            customersListContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--primary);"><i class=\'fa-solid fa-spinner fa-spin\' style=\'font-size: 3rem; margin-bottom: 10px;\'></i><p>ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ظˆطھط­ظ„ظٹظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ...</p></div>';
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
// 13. <i class=\'fa-solid fa-star\'></i> ط­ظ…ط§ظٹط© ط²ط± ط§ظ„ط¥ظƒط³ظٹظ„ ط¨ط¨ط§ط³ظˆط±ط¯
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
            togglePasswordVisibility.innerHTML = '<i class=\'fa-solid fa-eye\'></i>';
        }
    });
}

function tryExcelPassword() {
    let enteredPassword = excelPasswordInput ? excelPasswordInput.value.trim() : '';
    if (enteredPassword === EXCEL_PASSWORD) {
        showToast("<i class=\'fa-solid fa-check\'></i> طھظ… ط§ظ„طھط­ظ‚ظ‚ ط¨ظ†ط¬ط§ط­طŒ ط¬ط§ط±ظٹ ظپطھط­ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ...", "success");
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
// 14. <i class=\'fa-solid fa-star\'></i> ط§ظ„ظ…ط§ط³ط­ ط§ظ„ط¶ظˆط¦ظٹ ط§ظ„ط°ظƒظٹ (Offline Barcode Scanner)
// ==========================================

let barcodeCatalogData = [];
let html5QrcodeScanner = null;

// 1. ط¬ظ„ط¨ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ†طھط¬ط§طھ ظ…ظ† Firebase Realtime Database ظ…ط¹ Cache ط°ظƒظٹ
const FIREBASE_PRODUCTS_URL = 'https://candyclubsync-default-rtdb.firebaseio.com/products.json';
const FIREBASE_CACHE_KEY = 'candy_firebase_products_cache';

// طھط­ظˆظٹظ„ ط¨ظٹط§ظ†ط§طھ Firebase ط§ظ„ط®ط§ظ… ط¥ظ„ظ‰ ظ…طµظپظˆظپط© ظ…ظ†طھط¬ط§طھ
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

// طھط­ط¯ظٹط« ط§ظ‚طھط±ط§ط­ط§طھ ط§ظ„ظ…ظ†طھط¬ط§طھ ط§ظ„ط°ظƒظٹط© ظ…ظ† Firebase
function updateSmartSuggestionsFromFirebase() {
    const smartProductsList = document.getElementById('smartProductsList');
    if (!smartProductsList) return;
    smartProductsList.innerHTML = '';
    // ظ†ط¹ط±ط¶ ط£ظˆظ„ 200 ظ…ظ†طھط¬ ظپظ‚ط· ظپظٹ ط§ظ„ظ€ datalist ظ„ظ…ظ†ط¹ ط§ظ„طھط¹ظ„ظٹظ‚
    const maxSuggestions = 200;
    const items = barcodeCatalogData.slice(0, maxSuggestions);
    items.forEach(p => {
        smartProductsList.innerHTML += `<option value="${p.name}">`;
    });
}

function fetchCatalogFromFirebase() {
    // âڑ، ط§ظ„ط®ط·ظˆط© 1: ظ‚ط±ط§ط،ط© ط§ظ„ظƒط§ط´ ط£ظˆظ„ط§ظ‹ (ظپظˆط±ظٹ ط¨ط¯ظˆظ† ط§ظ†طھط¸ط§ط±)
    try {
        const cached = localStorage.getItem(FIREBASE_CACHE_KEY);
        if (cached) {
            barcodeCatalogData = JSON.parse(cached);
            console.log("âڑ، طھظ… طھط­ظ…ظٹظ„ ط§ظ„ظƒط§ط´ ط§ظ„ظ…ط­ظ„ظٹ: ", barcodeCatalogData.length, "ظ…ظ†طھط¬");
            updateSmartSuggestionsFromFirebase();
        }
    } catch (e) {
        console.warn("طھط¹ط°ط± ظ‚ط±ط§ط،ط© ط§ظ„ظƒط§ط´ ط§ظ„ظ…ط­ظ„ظٹ:", e);
    }

    // <i class=\'fa-solid fa-globe\'></i> ط§ظ„ط®ط·ظˆط© 2: ط¬ظ„ط¨ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط·ط§ط²ط¬ط© ظ…ظ† Firebase ظپظٹ ط§ظ„ط®ظ„ظپظٹط©
    console.log("<i class=\'fa-solid fa-hourglass-half\'></i> ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ†طھط¬ط§طھ ظ…ظ† Firebase...");
    fetch(FIREBASE_PRODUCTS_URL)
        .then(response => {
            if (!response.ok) throw new Error("ظپط´ظ„ ط§ظ„ط§طھطµط§ظ„ ط¨ظ€ Firebase: " + response.status);
            return response.json();
        })
        .then(data => {
            barcodeCatalogData = parseFirebaseProducts(data);
            
            // ط­ظپط¸ ظپظٹ ط§ظ„ظƒط§ط´ ط§ظ„ظ…ط­ظ„ظٹ
            try {
                localStorage.setItem(FIREBASE_CACHE_KEY, JSON.stringify(barcodeCatalogData));
            } catch (e) {
                console.warn("طھط¹ط°ط± ط­ظپط¸ ط§ظ„ظƒط§ط´ ط§ظ„ظ…ط­ظ„ظٹ:", e);
            }

            console.log("<i class=\'fa-solid fa-check\'></i> طھظ… طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ†طھط¬ط§طھ ظ…ظ† Firebase: ", barcodeCatalogData.length, "ظ…ظ†طھط¬");
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
            console.error("<i class=\'fa-solid fa-xmark\'></i> ط®ط·ط£ ظپظٹ طھط­ظ…ظٹظ„ ط§ظ„ظ…ظ†طھط¬ط§طھ ظ…ظ† Firebase:", err);
            if (barcodeCatalogData.length === 0) {
                showToast("<i class=\'fa-solid fa-triangle-exclamation\'></i> ظپط´ظ„ طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ†طھط¬ط§طھ ظ…ظ† ط§ظ„ط³ظٹط±ظپط±", "error");
            }
        });
}

// طھط´ط؛ظٹظ„ ط§ظ„ط¯ط§ظ„ط© ظپظˆط± طھط­ظ…ظٹظ„ ط§ظ„طµظپط­ط©
window.addEventListener('load', fetchCatalogFromFirebase);

// 2. ط¥طµط¯ط§ط± طµظˆطھ Beep ظ‚طµظٹط± ط¹ظ†ط¯ ظ†ط¬ط§ط­ ط§ظ„ظ…ط³ط­
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
            oscillator.frequency.value = 2750; // طھط±ط¯ط¯ ط§ظ„ظƒط§ط´ظٹط± ط§ظ„ط­ظ‚ظٹظ‚ظٹ
            
            // Flat volume (sustain) then abrupt stop
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime + 0.07);
            gainNode.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.08);
        }
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
                try { html5QrcodeScanner.clear(); } catch (e) { }
                html5QrcodeScanner = null;
            });
        }
    } catch (e) {
        console.error("ط®ط·ط£ ط£ط«ظ†ط§ط، ظ…ط­ط§ظˆظ„ط© ط¥ظٹظ‚ط§ظپ ط§ظ„ظ…ط§ط³ط­:", e);
        html5QrcodeScanner = null;
    }
}

function processBarcodeAction(val) {
    if (currentScannerMode === 'ledger') {
        const ledgerProdName = document.getElementById('ledgerProdName');
        const ledgerProdQty = document.getElementById('ledgerProdQty');
        const ledgerProdBarcode = document.getElementById('ledgerProdBarcode');
        
        if (val && barcodeCatalogData) {
            const found = barcodeCatalogData.find(p => String(p.barcode).trim() === val);
            if (found) {
                if (ledgerProdName) ledgerProdName.value = found.name;
                if (ledgerProdQty) ledgerProdQty.value = found.stock ? Number(found.stock) : 0;
                if (ledgerProdBarcode) ledgerProdBarcode.value = val;
                showToast("<i class=\'fa-solid fa-check\'></i> " + found.name + " | ط§ظ„ظƒظ…ظٹط©: " + found.stock + " | ط§ظ„ط³ط¹ط±: " + found.price + " ط¬.ظ…", "success");
            } else {
                if (ledgerProdName) ledgerProdName.value = '';
                if (ledgerProdQty) ledgerProdQty.value = '';
                if (ledgerProdBarcode) ledgerProdBarcode.value = val; 
                showToast("<i class=\'fa-solid fa-triangle-exclamation\'></i> ط§ظ„ط¨ط§ط±ظƒظˆط¯ (" + val + ") ط؛ظٹط± ظ…ط³ط¬ظ„طŒ ط§ظƒطھط¨ ط§ظ„ط§ط³ظ… ظٹط¯ظˆظٹط§ظ‹", "warning");
            }
        } else {
            showToast("<i class=\'fa-solid fa-triangle-exclamation\'></i> ظ„ظ… ظٹطھظ… ط§ظ„طھط¹ط±ظپ ط¹ظ„ظ‰ ط§ظ„ظ†طµ ط£ظˆ ط§ظ„ظƒطھط§ظ„ظˆط¬ ظپط§ط±ط؛", "error");
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
    // طھطھظƒط±ط± ظ…ط¹ ظƒظ„ ظپط±ظٹظ… ظ„ط§ ظٹط¬ط¯ ظپظٹظ‡ ط¨ط§ط±ظƒظˆط¯
}

// 5. ط§ظ„ط¨ط­ط« ظˆط§ظ„طھط·ط§ط¨ظ‚
let currentScannedProduct = null;

function handleBarcodeMatch(barcodeValue) {
    let matchedProduct = barcodeCatalogData.find(p => String(p.barcode).trim() === String(barcodeValue).trim());

    if (matchedProduct) {
        currentScannedProduct = matchedProduct;
        playBeepSound();

        document.getElementById('scanResultName').textContent = matchedProduct.name;
        // ط¹ط±ط¶ ط§ظ„ط³ط¹ط± ط¨ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط© ط§ظ„ظ‚ظٹط§ط³ظٹط©
        document.getElementById('scanResultPrice').textContent = Number(matchedProduct.price);
        // ط¹ط±ط¶ ط§ظ„ظƒظ…ظٹط© ط§ظ„ظ…طھط§ط­ط© (Stock)
        const stockEl = document.getElementById('scanResultStock');
        if (stockEl) {
            stockEl.textContent = Number(matchedProduct.stock);
            // طھظ„ظˆظٹظ† ط§ظ„ظƒظ…ظٹط© ط­ط³ط¨ ط§ظ„ظ…ط®ط²ظˆظ†
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
        showToast("ط§ظ„ظ…ظ†طھط¬ ط؛ظٹط± ظ…ط³ط¬ظ„ ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ <i class=\'fa-solid fa-xmark\'></i>", "error");
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
        processBarcodeAction(val);
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
            copyProductNameBtn.innerHTML = "طھظ… ط§ظ„ظ†ط³ط® <i class=\'fa-solid fa-check\'></i>";
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
        btn.innerHTML = "ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„ <i class=\'fa-solid fa-hourglass-half\'></i>...";
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
            
            // <i class=\'fa-solid fa-star\'></i> ط³ط­ط¨ ط§ظ„ط¨ط§ط±ظƒظˆط¯ ظ„ظ„ظ…ظ†طھط¬ط§طھ ط§ظ„ظ‚ط¯ظٹظ…ط© ظ…ظ† ط§ظ„ظپط§ظٹط±ط¨ظٹط² ط£ظˆ ط¥ط°ط§ ظƒط§ظ† ط§ظ„ط¹ظ…ظˆط¯ ط؛ظٹط± ظ…ظˆط¬ظˆط¯ ظپظٹ ط§ظ„ط¥ظƒط³ظٹظ„
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
            showToast("<i class=\'fa-solid fa-xmark\'></i> ط­ط¯ط« ط®ط·ط£ ظپظٹ طھط­ظ…ظٹظ„ ط§ظ„طµظ„ط§ط­ظٹط§طھ. ظٹط±ط¬ظ‰ ظ…ط±ط§ط¬ط¹ط© ط¥ط¹ط¯ط§ط¯ط§طھ Google Sheets", "error");
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
                uploadLabel.innerHTML = 'ط¬ط§ط±ظٹ ط§ظ„ظپط­طµ... <i class=\'fa-solid fa-hourglass-half\'></i>';
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
                    try { tempScanner.clear(); } catch (err) { }
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
                showToast(`طھظ…طھ ط²ظٹط§ط¯ط© ظƒظ…ظٹط© ${productName} ظپظٹ ط§ظ„ظپط§طھظˆط±ط© <i class=\'fa-solid fa-cart-shopping\'></i>`, "success");

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

                showToast(`طھظ…طھ ط¥ط¶ط§ظپط© ${productName} ظ„ظ„ظپط§طھظˆط±ط© ط¨ظ†ط¬ط§ط­ <i class=\'fa-solid fa-check\'></i>`, "success");

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
window.openExpiryDashboard = function () {
    document.getElementById('expiryDashboardModal').style.display = 'flex';
    loadExpiryData();
};

function loadExpiryData() {
    const btn = document.getElementById('openExpiryBtn');
    if (btn) {
        btn.dataset.origText = btn.innerText;
        btn.innerHTML = "ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„ <i class=\'fa-solid fa-hourglass-half\'></i>...";
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
            let rawData = Array.isArray(data) ? data : (data.expiries || []);
            // Extract batchId from overloaded regDate if present
            expiryData = rawData.map(item => {
                if (item.regDate && item.regDate.includes("||")) {
                    let parts = item.regDate.split("||");
                    item.regDate = parts[0];
                    item.batchId = parts[1];
                }
                return item;
            });

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
            showToast("<i class=\'fa-solid fa-xmark\'></i> ط­ط¯ط« ط®ط·ط£ ظپظٹ طھط­ظ…ظٹظ„ ط§ظ„طµظ„ط§ط­ظٹط§طھ. ظٹط±ط¬ظ‰ ظ…ط±ط§ط¬ط¹ط© ط¥ط¹ط¯ط§ط¯ط§طھ Google Sheets", "error");
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

window.closeLedgerModal = function () {
    ledgerModal.style.display = 'none';
};

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
            showToast("ظٹط±ط¬ظ‰ ط¥ظƒظ…ط§ظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط© (ط§ظ„ط§ط³ظ…طŒ ط§ظ„ظƒظ…ظٹط©طŒ ط§ظ„طھط§ط±ظٹط®)", "warning");
            return;
        }

        const item = {
            id: name + '|' + qty + '|' + date,
            name: name,
            qty: qty,
            expiryDate: date,
            location: location,
            status: 'ظ…ط´ ظپظٹ ط¹ط±ط¶',
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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #7f8c8d;">ظ„ط§ طھظˆط¬ط¯ ظ…ظ†طھط¬ط§طھ ظ…ط¶ط§ظپط© ط­طھظ‰ ط§ظ„ط¢ظ†.</td></tr>';
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
                    <button class="interactive-btn" style="background: #f39c12; color: white; border: none; padding: 5px 10px; border-radius: 5px;" onclick="editLedgerItem(${index})">طھط¹ط¯ظٹظ„</button>
                    <button class="interactive-btn" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px;" onclick="removeLedgerItem(${index})">ط­ط°ظپ</button>
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
            showToast("ط§ظ„ط³ظ„ط© ظپط§ط±ط؛ط©طŒ ظٹط±ط¬ظ‰ ط¥ط¶ط§ظپط© ظ…ظ†طھط¬ط§طھ ط£ظˆظ„ط§ظ‹.", "warning");
            return;
        }

        const regDate = document.getElementById('ledgerRegDate').value;
        const regName = document.getElementById('ledgerRegistrarName').value;
        const receiverName = document.getElementById('ledgerReceiverName').value;

        if (!regDate || !regName || !receiverName) {
            showToast("ظٹط±ط¬ظ‰ ط¥ط¯ط®ط§ظ„ طھط§ط±ظٹط® ط§ظ„طھط³ط¬ظٹظ„ ظˆط§ط³ظ… ط§ظ„ظ…ط³ط¬ظ„ ظˆط§ط³ظ… ط§ظ„ظ…ط³طھظ„ظ… ظپظٹ ط£ط¹ظ„ظ‰ ط§ظ„ظ…ط­ط¶ط±.", "warning");
            return;
        }

        // Attach reg info to all items
        const currentBatchId = Date.now().toString();
        const payload = ledgerCart.map(item => Object.assign({}, item, {
            // Overload regDate to sneak the batchId past the Apps Script, which only writes known columns
            regDate: regDate + "||" + currentBatchId,
            registrarName: regName,
            receiver: receiverName,
            batchId: currentBatchId
        }));

        setBtnLoading(saveLedgerBtn, true, "ط¬ط§ط±ظٹ ط§ظ„ط­ظپط¸...");

        let formData = new URLSearchParams();
        formData.append('action', 'addExpiriesBatch');
        formData.append('batchData', JSON.stringify(payload));

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("<i class=\'fa-solid fa-check\'></i> طھظ… ط­ظپط¸ ط§ظ„ط¨ط¶ط§ط¹ط© ط¨ظ†ط¬ط§ط­", "success");
                setBtnLoading(saveLedgerBtn, false);
                ledgerCart = [];
                renderLedgerCart();
                closeLedgerModal();
                loadExpiryData(); // Refresh the dashboard
            }).catch(() => {
                showToast("<i class=\'fa-solid fa-xmark\'></i> ط­ط¯ط« ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„", "error");
                setBtnLoading(saveLedgerBtn, false);
            });
    });
}

// ==========================================
// 2. Dashboard Logic (ط¥ط¯ط§ط±ط© ط§ظ„طµظ„ط§ط­ظٹط§طھ)
// ==========================================

function getDaysRemaining(expiryDateStr) {
    if (!expiryDateStr || expiryDateStr.toString().includes('ط¨ط¯ظˆظ†')) return 'NoExpiry';
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
        if (item.status === 'ظپظٹ ط¹ط±ط¶') countOffers++;
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

// ظ…طھط؛ظٹط±ط§طھ ظ†ط¸ط§ظ… طھظ‚ط³ظٹظ… طµظپط­ط§طھ ط§ظ„طµظ„ط§ط­ظٹط§طھ
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
    if (pageInfo) pageInfo.innerText = `طµظپط­ط© ${expiryCurrentPage} ظ…ظ† ${totalPages}`;
}

window.showExpiryDetails = function (category, resetPage = true) {
    if (resetPage) {
        expiryCurrentPage = 1;
    }
    
    let title = "";
    let activeItems = expiryData.filter(item => item.status !== 'Deleted');
    
    // ط¥ط°ط§ ظƒط§ظ† ط§ظ„ط¨ط­ط« ط¬ط¯ظٹط¯ ط£ظˆ ظپط¦ط© ط¬ط¯ظٹط¯ط© ظ†ظ‚ظˆظ… ط¨ط§ظ„ظپظ„طھط±ط© ظ…ظ† ط¬ط¯ظٹط¯
    if (resetPage) {
        let tempFiltered = [];
        activeItems.forEach(item => {
            const daysRemaining = getDaysRemaining(item.expiryDate);
            let matches = false;

            if (category === 'Total') {
                matches = true;
                title = "<i class=\'fa-solid fa-box\'></i> ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط£طµظ†ط§ظپ ط§ظ„ظ…ط³ط¬ظ„ط©";
            } else if (category === 'Offers' && item.status === 'ظپظٹ ط¹ط±ط¶') {
                matches = true;
                title = "<i class=\'fa-solid fa-gift\'></i> ط§ظ„ط¹ط±ظˆط¶ ط§ظ„ظ†ط´ط·ط©";
            } else if (category === 'Search') {
                const searchTerm = document.getElementById('expiryGlobalSearchInput').value.toLowerCase().trim();
                if ((item.name && item.name.toLowerCase().includes(searchTerm)) || 
                    (item.barcode && String(item.barcode).toLowerCase().includes(searchTerm))) {
                    matches = true;
                    title = `<i class=\'fa-solid fa-magnifying-glass\'></i> ظ†طھط§ط¦ط¬ ط§ظ„ط¨ط­ط« ط¹ظ†: "${searchTerm}"`;
                }
            } else if (category === 'Expired' && daysRemaining !== 'NoExpiry' && daysRemaining < 0) {
                matches = true;
                title = "<i class=\'fa-solid fa-skull\'></i> ط§ظ†طھظ‡طھ ط§ظ„طµظ„ط§ط­ظٹط©";
            } else if (category === 'NoExpiry' && daysRemaining === 'NoExpiry') {
                matches = true;
                title = "<i class=\'fa-solid fa-infinity\'></i> ط¨ط¯ظˆظ† طھط§ط±ظٹط® طµظ„ط§ط­ظٹط©";
            } else if (category === 'Critical' && daysRemaining !== 'NoExpiry' && daysRemaining >= 0 && daysRemaining < 7) {
                matches = true;
                title = "<i class=\'fa-solid fa-circle text-danger\'></i> ط­ط±ط¬ ط¬ط¯ط§ظ‹ (ط£ظ‚ظ„ ظ…ظ† 7 ط£ظٹط§ظ…)";
            } else if (category === 'Alert' && daysRemaining >= 7 && daysRemaining < 30) {
                matches = true;
                title = "<i class=\'fa-solid fa-circle text-warning\'></i> طھظ†ط¨ظٹظ‡ ط³ط±ظٹط¹ (ط£ظ‚ظ„ ظ…ظ† 30 ظٹظˆظ…)";
            } else if (category === 'Attention' && daysRemaining >= 30 && daysRemaining <= 90) {
                matches = true;
                title = "<i class=\'fa-solid fa-circle text-warning\'></i> ط§ظ†طھط¨ط§ظ‡ ظˆظ…ط±ط§ظ‚ط¨ط© (1 ط¥ظ„ظ‰ 3 ط´ظ‡ظˆط±)";
            } else if (category === 'Safe' && daysRemaining > 90 && daysRemaining <= 180) {
                matches = true;
                title = "<i class=\'fa-solid fa-circle text-success\'></i> ظ…ط®ط²ظˆظ† ط¢ظ…ظ† (3 ط¥ظ„ظ‰ 6 ط´ظ‡ظˆط±)";
            } else if (category === 'Far' && daysRemaining > 180) {
                matches = true;
                title = "<i class=\'fa-brands fa-facebook\'></i> طھط§ط±ظٹط® ط¨ط¹ظٹط¯ (ط£ظƒط«ط± ظ…ظ† 6 ط´ظ‡ظˆط±)";
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
        detailsList.innerHTML = '<p class="empty-msg">ظ„ط§ طھظˆط¬ط¯ ط£طµظ†ط§ظپ ظپظٹ ظ‡ط°ظ‡ ط§ظ„ظپط¦ط©.</p>';
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
                daysText = "ط¨ط¯ظˆظ† طھط§ط±ظٹط® طµظ„ط§ط­ظٹط© <i class=\'fa-solid fa-infinity\'></i>";
            } else if (item.daysRemaining < 0) {
                daysColor = "#c0392b";
                daysText = `ظ…ظ†طھظ‡ظٹ ظ…ظ†ط° ${Math.abs(item.daysRemaining)} ظٹظˆظ… <i class=\'fa-solid fa-skull\'></i>`;
            } else if (item.daysRemaining < 7) {
                daysColor = "#e74c3c";
                daysText = `ط¨ط§ظ‚ظٹ ${item.daysRemaining} ظٹظˆظ…`;
            } else if (item.daysRemaining < 30) {
                daysColor = "#e67e22";
                daysText = `ط¨ط§ظ‚ظٹ ${item.daysRemaining} ظٹظˆظ…`;
            } else if (item.daysRemaining <= 90) {
                daysColor = "#f39c12";
                daysText = `ط¨ط§ظ‚ظٹ ${item.daysRemaining} ظٹظˆظ…`;
            } else {
                daysColor = "#27ae60";
                daysText = `ط¨ط§ظ‚ظٹ ${item.daysRemaining} ظٹظˆظ…`;
            }

            let rowClass = "expiry-item-row";
            let activeOfferStyle = "";
            if (item.status === 'ظپظٹ ط¹ط±ط¶') {
                rowClass += " active-offer";
                activeOfferStyle = 'style="border: 2px solid #ffeb3b; background: #fffde7;"';
            }

            const offerBtnText = item.status === 'ظپظٹ ط¹ط±ط¶' ? "ط¥ظ„ط؛ط§ط، ط§ظ„ط¹ط±ط¶ âڈ¸" : "ط¥ط¶ط§ظپط© ظ„ظ„ط¹ط±ظˆط¶ ًں”¥";
            const offerBtnColor = item.status === 'ظپظٹ ط¹ط±ط¶' ? "#e0e0e0" : "#fff3e0";
            const offerBtnAction = item.status === 'ظپظٹ ط¹ط±ط¶' ? "ظ…ط´ ظپظٹ ط¹ط±ط¶" : "ظپظٹ ط¹ط±ط¶";

            let formattedDate = new Date(item.expiryDate);
            formattedDate = isNaN(formattedDate.getTime()) ? item.expiryDate : formattedDate.toLocaleDateString('ar-EG');

            let pricesHtml = "";
            if (item.status === 'ظپظٹ ط¹ط±ط¶') {
                pricesHtml = `
                    <div style="background: #fdf2e9; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px dashed #e67e22; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 120px;">
                            <label style="font-size: 0.8rem; color: #d35400; font-weight: bold;">ط§ظ„ط³ط¹ط± ط§ظ„ط£طµظ„ظٹ:</label>
                            <input type="number" id="origPrice_${item.id}" value="${item.originalPrice || ''}" style="margin-bottom: 0; padding: 5px; height: 35px; border: 1px solid #e67e22;">
                        </div>
                        <div style="flex: 1; min-width: 120px;">
                            <label style="font-size: 0.8rem; color: #d35400; font-weight: bold;">ط³ط¹ط± ط§ظ„ط¹ط±ط¶:</label>
                            <input type="number" id="offerPrice_${item.id}" value="${item.offerPrice || ''}" style="margin-bottom: 0; padding: 5px; height: 35px; border: 1px solid #e67e22; background: #fff;">
                        </div>
                        <button class="btn-save interactive-btn" onclick="saveExpiryOffer('${item.id}', 'ظپظٹ ط¹ط±ط¶')" style="padding: 5px 15px; height: 35px; align-self: flex-end;">ط­ظپط¸ ًں’¾</button>
                    </div>
                `;
            }

            let itemDiv = document.createElement('div');
            itemDiv.className = rowClass;
            if (item.status === 'ظپظٹ ط¹ط±ط¶') {
                itemDiv.style.border = '2px solid #ffeb3b';
                itemDiv.style.background = '#fffde7';
            }
            let isChecked = selectedExpiryItems.has(item.id) ? "checked" : "";
            itemDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; background: #f8f9fa; padding: 5px 10px; border-radius: 8px;">
                    <input type="checkbox" class="expiry-item-checkbox" data-id="${item.id}" ${isChecked} onchange="toggleExpirySelection('${item.id}', this.checked)" style="width: 20px; height: 20px; cursor: pointer;">
                    <h4 style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin: 0; flex: 1;">
                        <span style="flex: 1;"><i class=\'fa-solid fa-box\'></i> ${item.name}</span>
                        <span style="font-size: 0.8rem; color: #7f8c8d; font-weight: normal; background: #eee; padding: 3px 8px; border-radius: 12px; white-space: nowrap;">${item.barcode ? 'ط§ظ„ط¨ط§ط±ظƒظˆط¯: ' + item.barcode : 'ظ„ط§ ظٹظˆط¬ط¯ ط¨ط§ط±ظƒظˆط¯'}</span>
                    </h4>
                </div>
                <div class="expiry-item-details">
                    <span>ط§ظ„ظƒظ…ظٹط©: ${item.qty}</span>
                    <span style="color: ${daysColor}; font-weight: bold;">${daysText}</span>
                </div>
                <div style="font-size: 0.8rem; color: #7f8c8d; margin-bottom: 8px;">
                    <i class=\'fa-regular fa-calendar-days\'></i> ط§ظ†طھظ‡ط§ط،: ${formattedDate} | ًںڈ¢ ظ…ظƒط§ظ†: ${item.location || '-'} <br>
                    <i class=\'fa-solid fa-user\'></i> ط§ظ„ظ…ط³طھظ„ظ…: ${item.receiver || 'ط؛ظٹط± ظ…ط­ط¯ط¯'} | ًں“‌ ظ…ظ„ط§ط­ط¸ط§طھ: ${item.notes || '-'}
                </div>
                ${pricesHtml}
                <div class="expiry-item-actions" style="flex-wrap: wrap; gap: 5px;">
                    <button class="btn-activate-offer interactive-btn" style="background: ${offerBtnColor}; flex: 1;" onclick="${item.status === 'ظپظٹ ط¹ط±ط¶' ? `changeExpiryStatus('${item.id}', '${offerBtnAction}')` : `promptNewOffer('${item.id}')`}">${offerBtnText}</button>
                    <button class="btn-edit-item interactive-btn" style="background: #3498db; color: white; flex: 1;" onclick="openEditExpiryModal('${item.id}')"><i class="fa-solid fa-pen"></i> طھط¹ط¯ظٹظ„</button>
                    <button class="btn-close-item interactive-btn" style="flex: 1;" onclick="changeExpiryStatus('${item.id}', 'Deleted')">طھظ… ط§ظ„ط¨ظٹط¹ <i class=\'fa-solid fa-xmark\'></i>ï¸ڈ</button>
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

// ط¥ط¹ط¯ط§ط¯ ط£ط­ط¯ط§ط« ط£ط²ط±ط§ط± طµظپط­ط§طھ ط§ظ„طµظ„ط§ط­ظٹط§طھ
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
            showToast('ط§ظ„ط±ط¬ط§ط، ط¥ط¯ط®ط§ظ„ ظƒظ„ظ…ط© ظ„ظ„ط¨ط­ط«', 'warning');
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
        <h3 style="color: var(--primary); margin-top: 0; font-family: 'Cairo', sans-serif;">طھظ†ط¨ظٹظ‡</h3>
        <p style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 25px; font-family: 'Cairo', sans-serif; white-space: pre-line;">${message}</p>
        <button id="btnAlertOk" class="interactive-btn" style="background: var(--primary); color: white; border: none; padding: 10px 30px; border-radius: 8px; font-weight: bold; font-family: 'Cairo', sans-serif;">ظ…ظˆط§ظپظ‚</button>
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
            <button id="btnPromptYes" class="interactive-btn" style="background: var(--success); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1; font-family: 'Cairo', sans-serif;">ط­ظپط¸ <i class=\'fa-solid fa-check\'></i></button>
            <button id="btnPromptNo" class="interactive-btn" style="background: var(--danger); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1; font-family: 'Cairo', sans-serif;">ط¥ظ„ط؛ط§ط، <i class=\'fa-solid fa-xmark\'></i></button>
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
        <h3 style="color: var(--primary); margin-top: 0;">طھط£ظƒظٹط¯ ط§ظ„ط¥ط¬ط±ط§ط،</h3>
        <p style="font-size: 1.1rem; color: #333; margin-bottom: 25px;">${message}</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="btnConfirmYes" class="interactive-btn" style="background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1;">ظ†ط¹ظ… <i class=\'fa-solid fa-check\'></i></button>
            <button id="btnConfirmNo" class="interactive-btn" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1;">ط¥ظ„ط؛ط§ط، <i class=\'fa-solid fa-xmark\'></i></button>
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
        <input type="number" id="promptOrig" placeholder="ط§ظ„ط³ط¹ط± ط§ظ„ط£ط³ط§ط³ظٹ" style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ccc;">
        <input type="number" id="promptOffer" placeholder="ط³ط¹ط± ط§ظ„ط¹ط±ط¶" style="width: 100%; padding: 10px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #ccc;">
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="btnPromptYes" class="interactive-btn" style="background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1;">ط­ظپط¸ <i class=\'fa-solid fa-check\'></i></button>
            <button id="btnPromptNo" class="interactive-btn" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; flex: 1;">ط¥ظ„ط؛ط§ط، <i class=\'fa-solid fa-xmark\'></i></button>
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
    customPrompt("طھظپط¹ظٹظ„ ط¹ط±ط¶ ط¬ط¯ظٹط¯", (orig, offer) => {
        if (orig === "" || offer === "") {
            showToast("ظٹط±ط¬ظ‰ ط¥ط¯ط®ط§ظ„ ط§ظ„ط³ط¹ط±ظٹظ†", "warning");
            return;
        }
        saveExpiryOffer(id, 'ظپظٹ ط¹ط±ط¶', orig, offer);
    });
};

window.saveExpiryOffer = function (id, status, origVal, offerVal) {
    let orig = origVal !== undefined ? origVal : (document.getElementById('origPrice_' + id) ? document.getElementById('origPrice_' + id).value : "");
    let offer = offerVal !== undefined ? offerVal : (document.getElementById('offerPrice_' + id) ? document.getElementById('offerPrice_' + id).value : "");

    showToast("ط¬ط§ط±ظٹ ط§ظ„طھط­ط¯ظٹط«...", "warning");
    let formData = new URLSearchParams();
    formData.append('action', 'updateExpiryStatus');
    formData.append('id', id);
    formData.append('status', status);
    formData.append('originalPrice', orig);
    formData.append('offerPrice', offer);

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("<i class=\'fa-solid fa-check\'></i> طھظ… طھط­ط¯ظٹط« ط§ظ„ط¹ط±ط¶ ظˆط§ظ„ط£ط³ط¹ط§ط± ط¨ظ†ط¬ط§ط­", "success");
            let item = expiryData.find(i => i.id == id);
            if (item) {
                item.status = status;
                item.originalPrice = orig;
                item.offerPrice = offer;
            }
            renderExpiryDashboard();
            updateCatalogWithOffers();
            // Re-render the current view
            if (document.getElementById('detailsTitle').innerText.includes('ط§ظ„ط¨ط­ط«')) {
                showExpiryDetails('Search');
            } else if (document.getElementById('detailsTitle').innerText.includes('ط§ظ„ط¹ط±ظˆط¶')) {
                showExpiryDetails('Offers');
            } else {
                // If in another category, just close and user can reopen or re-render
                document.getElementById('expiryDetailsSection').style.display = 'none';
            }
        }).catch(() => {
            showToast("<i class=\'fa-solid fa-xmark\'></i> ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط¥ظ†طھط±ظ†طھ", "error");
        });
};

// 3. Status Control (ط¯ظˆط±ط© ط­ظٹط§ط© ط§ظ„ط¹ط±ط¶)
window.changeExpiryStatus = function (id, newStatus) {
    let msg = "";
    if (newStatus === 'ظپظٹ ط¹ط±ط¶') msg = "ظ‡ظ„ طھط±ظٹط¯ طھظپط¹ظٹظ„ ط§ظ„ط¹ط±ط¶ ظˆط¬ط¹ظ„ ط§ظ„ط³ط·ط± ظپط³ظپظˆط±ظٹطں ًں”¥";
    else if (newStatus === 'ظ…ط´ ظپظٹ ط¹ط±ط¶') msg = "ظ‡ظ„ طھط±ظٹط¯ ط¥ظٹظ‚ط§ظپ ط§ظ„ط¹ط±ط¶ ظˆط¥ط¹ط§ط¯طھظ‡ ظ„ظ„ط­ط§ظ„ط© ط§ظ„ط·ط¨ظٹط¹ظٹط©طں";
    else if (newStatus === 'Deleted') msg = "طھط­ط°ظٹط±: ط³ظٹطھظ… ظ…ط³ط­ ط§ظ„ظ…ظ†طھط¬ ط¨ط§ظ„ظƒط§ظ…ظ„ ظ…ظ† ط§ظ„ظ†ط¸ط§ظ… ظˆظ„ظ† ظٹط¸ظ‡ط± ظ…ط±ط© ط£ط®ط±ظ‰. ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط¥طھظ…ط§ظ… ط§ظ„ط¨ظٹط¹طں <i class=\'fa-solid fa-xmark\'></i>ï¸ڈ";

    customConfirm(msg, () => {
        showToast("ط¬ط§ط±ظٹ ط§ظ„طھط­ط¯ظٹط«...", "warning");

        let formData = new URLSearchParams();
        formData.append('action', 'updateExpiryStatus');
        formData.append('id', id);
        formData.append('status', newStatus);

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("<i class=\'fa-solid fa-check\'></i> طھظ… طھط­ط¯ظٹط« ط§ظ„ط­ط§ظ„ط© ط¨ظ†ط¬ط§ط­", "success");
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
                showToast("<i class=\'fa-solid fa-xmark\'></i> ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط¥ظ†طھط±ظ†طھ", "error");
            });
    });
};

function updateCatalogWithOffers() {
    if (!catalogData || catalogData.length === 0) return;
    
    let activeOffers = [];
    if (expiryData && expiryData.length > 0) {
        activeOffers = expiryData.filter(item => item.status === 'ظپظٹ ط¹ط±ط¶').map(item => item.name);
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
        showToast("ظٹط±ط¬ظ‰ طھط¹ط¨ط¦ط© ط§ظ„ظƒظ…ظٹط© ظˆط§ظ„طھط§ط±ظٹط® ظˆط§ط³ظ… ط§ظ„ظ…ط³طھظ„ظ…", "warning");
        return;
    }
    
    showToast("ط¬ط§ط±ظٹ ط­ظپط¸ ط§ظ„طھط¹ط¯ظٹظ„ط§طھ...", "warning");
    
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
            showToast("<i class=\'fa-solid fa-check\'></i> طھظ… طھط¹ط¯ظٹظ„ ط§ظ„ط§ط³طھظ„ط§ظ…ط© ط¨ظ†ط¬ط§ط­", "success");
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
        .catch(() => showToast("ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط¥ظ†طھط±ظ†طھ", "error"));
};

window.printSelectedExpiry = function() {
    if (selectedExpiryItems.size === 0) {
        showToast("ظ„ظ… ظٹطھظ… طھط­ط¯ظٹط¯ ط£ظٹ ط§ط³طھظ„ط§ظ…ط©", "warning");
        return;
    }
    
    let selectedData = expiryData.filter(item => selectedExpiryItems.has(String(item.id)));
    
    let receivers = [...new Set(selectedData.map(i => i.receiver).filter(r => r && String(r).trim() !== ''))];
    let mergedReceiverName = receivers.length > 0 ? receivers.join(' / ') : "ط؛ظٹط± ظ…ط­ط¯ط¯";
    
    let reportTitle = `ط§ط³طھظ„ط§ظ…ط§طھ ظ…ط¬ظ…ط¹ط© - ط§ظ„ظ…ط³طھظ„ظ…: ${mergedReceiverName}`;
    generateCategoryPDF(selectedData, reportTitle);
};

// ==========================================
// 3. Export Logic (طھطµط¯ظٹط± ظ…طھظ‚ط¯ظ… ExcelJS)
// ==========================================

async function generateExcel(dataToExport, reportTitle) {
    if (!dataToExport || dataToExport.length === 0) {
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
            { header: 'ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬', key: 'name', width: 35 },
            { header: 'ط§ظ„ظƒظ…ظٹط©', key: 'qty', width: 12 },
            { header: 'طھط§ط±ظٹط® ط§ظ„ط§ظ†طھظ‡ط§ط،', key: 'date', width: 18 },
            { header: 'ط§ظ„ط£ظٹط§ظ… ط§ظ„ظ…طھط¨ظ‚ظٹط©', key: 'days', width: 15 },
            { header: 'ط§ظ„ظ…ظƒط§ظ† / ط§ظ„ظ…ظˆط±ط¯', key: 'loc', width: 22 },
            { header: 'ط§ط³ظ… ط§ظ„ظ…ط³ط¬ظ„', key: 'regname', width: 22 },
            { header: 'طھط§ط±ظٹط® ط§ظ„طھط³ط¬ظٹظ„', key: 'reg', width: 18 },
            { header: 'ط§ظ„ظ…ط³طھظ„ظ…', key: 'rec', width: 18 },
            { header: 'ظ…ظ„ط§ط­ط¸ط§طھ', key: 'notes', width: 30 },
            { header: 'ط§ظ„ط³ط¹ط± ط§ظ„ط£ط³ط§ط³ظٹ', key: 'origPrice', width: 15 },
            { header: 'ط³ط¹ط± ط§ظ„ط¹ط±ط¶', key: 'offerPrice', width: 15 },
            { header: 'ط§ظ„ط­ط§ظ„ط©', key: 'status', width: 18 }
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
            let daysFormatted = daysRemaining === 'NoExpiry' ? 'ط¨ط¯ظˆظ†' : (isNaN(daysRemaining) ? '-' : daysRemaining);

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
        let safeTitle = cleanTitle.replace(/[^a-zA-Z0-9ط£-ظٹ]/g, '_');
        link.download = `طھظ‚ط±ظٹط±_${safeTitle}_${new Date().toLocaleDateString('en-CA')}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast("<i class=\'fa-solid fa-check\'></i> طھظ… طھطµط¯ظٹط± ط§ظ„طھظ‚ط±ظٹط± ط§ظ„ط§ط­طھط±ط§ظپظٹ ط¨ظ†ط¬ط§ط­", "success");

    } catch (error) {
        console.error(error);
        showToast("<i class=\'fa-solid fa-xmark\'></i> ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„طھطµط¯ظٹط±", "error");
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
        setBtnLoading(exportCurrentListBtn, true, "طھطµط¯ظٹط±...");
        generateExcel(currentExportData, currentExportCategory).then(() => {
            setBtnLoading(exportCurrentListBtn, false);
        });
    });
}

const exportCurrentListPDFBtn = document.getElementById('exportCurrentListPDFBtn');
if (exportCurrentListPDFBtn) {
    exportCurrentListPDFBtn.addEventListener('click', () => {
        if (!currentExportData || currentExportData.length === 0) {
            showToast("ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ظ„ظ„ط·ط¨ط§ط¹ط©", "warning");
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
            showToast("ظٹط±ط¬ظ‰ طھط­ط¯ظٹط¯ ط§ظ„ط´ظ‡ط± ط£ظˆظ„ط§ظ‹", "warning");
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

        setBtnLoading(btnExportMonth, true, "طھطµط¯ظٹط±...");
        generateExcel(filtered, 'ط´ظ‡ط±_' + monthVal).then(() => {
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
            showToast("ظٹط±ط¬ظ‰ طھط­ط¯ظٹط¯ ط§ظ„ط´ظ‡ط± ط£ظˆظ„ط§ظ‹", "warning");
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
            showToast("ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ط§ظ†طھظ‡ط§ط، ظپظٹ ظ‡ط°ط§ ط§ظ„ط´ظ‡ط±", "warning");
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
            showToast("ظٹط±ط¬ظ‰ طھط­ط¯ظٹط¯ ظٹظˆظ… ط§ظ„طھط³ط¬ظٹظ„ ط£ظˆظ„ط§ظ‹", "warning");
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

        setBtnLoading(btnExportDate, true, "طھطµط¯ظٹط±...");
        generateExcel(filtered, 'ط¥ط¯ط®ط§ظ„ط§طھ_ظٹظˆظ…_' + dateVal).then(() => {
            setBtnLoading(btnExportDate, false);
        });
    });
}

const btnExportDatePDF = document.getElementById('btnExportDatePDF');
if (btnExportDatePDF) {
    btnExportDatePDF.addEventListener('click', () => {
        const dateVal = document.getElementById('exportDateInput').value; // YYYY-MM-DD
        if (!dateVal) {
            showToast("ظٹط±ط¬ظ‰ طھط­ط¯ظٹط¯ ظٹظˆظ… ط§ظ„طھط³ط¬ظٹظ„ ط£ظˆظ„ط§ظ‹", "warning");
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
            showToast("ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ظ…ط³ط¬ظ„ط© ظپظٹ ظ‡ط°ط§ ط§ظ„ظٹظˆظ…", "warning");
            return;
        }

        // Group by batchId
        let batches = {};
        let legacyBatch = [];
        filtered.forEach(item => {
            if (item.batchId) {
                if (!batches[item.batchId]) batches[item.batchId] = [];
                batches[item.batchId].push(item);
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
        <h3 style="color: var(--primary); margin-top: 0; font-family: 'Cairo', sans-serif; text-align: center;">ط·ط¨ط§ط¹ط© ط§ط³طھظ„ط§ظ…ط§طھ ظٹظˆظ… ${dateVal}</h3>
        <p style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 20px; text-align: center;">ط§ظ„ط§ط³طھظ„ط§ظ…ط§طھ ط§ظ„ظ…ط³ط¬ظ„ط© ظپظٹ ظ‡ط°ط§ ط§ظ„ظٹظˆظ…. ظٹظ…ظƒظ†ظƒ طھط­ط¯ظٹط¯ ط§ظ„ظ…ط­ط¶ط± ط§ظ„ظ…ط±ط§ط¯ ط·ط¨ط§ط¹طھظ‡ ط£ظˆ ط§ظ„طھط¹ط¯ظٹظ„ ط¹ظ„ظٹظ‡:</p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
    `;

    Object.keys(batches).forEach((bId, idx) => {
        let items = batches[bId];
        let d = new Date(parseInt(bId));
        let timeStr = isNaN(d.getTime()) ? 'ط؛ظٹط± ظ…ط¹ط±ظˆظپ' : d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        let receiver = items[0].receiver || 'ط؛ظٹط± ظ…ط­ط¯ط¯';
        html += `
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" class="batch-checkbox" value="${bId}" style="width: 20px; height: 20px; cursor: pointer; flex-shrink: 0;">
                <button class="interactive-btn batch-select-btn" data-batch="${bId}" style="flex: 1; background: var(--bg-light); color: var(--text-main); border: 1px solid var(--border); padding: 15px; border-radius: 8px; text-align: right; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;">
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <span>ًں•’ ط§ط³طھظ„ط§ظ…ط© ط§ظ„ط³ط§ط¹ط© ${timeStr}</span>
                        <span style="font-size: 0.85rem; color: var(--primary); font-weight: bold;"><i class='fa-solid fa-user'></i> ط§ظ„ظ…ط³طھظ„ظ…: ${receiver}</span>
                    </div>
                    <span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${items.length} ط£طµظ†ط§ظپ</span>
                </button>
                <button class="interactive-btn batch-edit-btn" data-batch="${bId}" style="background: #3498db; color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; transition: 0.2s;" title="طھط¹ط¯ظٹظ„ ط§ظ„ط§ط³طھظ„ط§ظ…ط©">
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
                        <span><i class=\'fa-solid fa-box\'></i> ط§ط³طھظ„ط§ظ…ط§طھ ظ…ط¬ظ…ط¹ط© (ظ‚ط¯ظٹظ…ط©)</span>
                    </div>
                    <span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${legacyBatch.length} ط£طµظ†ط§ظپ</span>
                </button>
                <button class="interactive-btn batch-edit-btn" data-batch="legacy" style="background: #3498db; color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; transition: 0.2s;" title="طھط¹ط¯ظٹظ„ ط§ظ„ط§ط³طھظ„ط§ظ…ط©">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </div>
            <button class="interactive-btn batch-select-btn" data-batch="manual" style="background: var(--bg-light); color: #e67e22; border: 1px dashed #e67e22; padding: 15px; border-radius: 8px; text-align: right; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s; margin-top: -5px;">
                <span>âœ‚ï¸ڈ طھظ‚ط³ظٹظ… ط§ظ„ط§ط³طھظ„ط§ظ…ط§طھ ط§ظ„ظ‚ط¯ظٹظ…ط© ظٹط¯ظˆظٹط§ظ‹ (طھط­ط¯ظٹط¯ ظˆط§ط®طھظٹط§ط±)</span>
            </button>
        `;
    }

    html += `
            <button class="interactive-btn batch-select-btn" data-batch="all" style="background: #27ae60; color: white; border: none; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; margin-top: 10px; cursor: pointer;">
                ط·ط¨ط§ط¹ط© ظƒظ„ ط§ط³طھظ„ط§ظ…ط§طھ ط§ظ„ظٹظˆظ… ظ…ط¹ط§ظ‹ <i class=\'fa-solid fa-print\'></i>
            </button>
            <button class="interactive-btn" id="mergeSelectedBatchesBtn" style="background: #9b59b6; color: white; border: none; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; cursor: pointer; display: none;">
                ط¯ظ…ط¬ ظˆط·ط¨ط§ط¹ط© ط§ظ„ط§ط³طھظ„ط§ظ…ط§طھ ط§ظ„ظ…ط­ط¯ط¯ط© <i class=\'fa-solid fa-layer-group\'></i>
            </button>
            <button id="closeBatchModalBtn" style="background: transparent; color: var(--text-muted); border: none; padding: 10px; border-radius: 8px; text-align: center; cursor: pointer; text-decoration: underline; margin-top: 5px;">ط¥ظ„ط؛ط§ط،</button>
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
        
        // ط¬ظ„ط¨ ط£ط³ظ…ط§ط، ط§ظ„ظ…ط³طھظ„ظ…ظٹظ† ط§ظ„ظ…ط­ط¯ط¯ظٹظ† ظ„ظ„ط¹ظ†ظˆط§ظ† (ط§ط®طھظٹط§ط±ظٹ)
        let receivers = [...new Set(allItems.map(i => i.receiver).filter(r => r && String(r).trim() !== ''))];
        let mergedReceiverName = receivers.length > 0 ? receivers.join(' / ') : "ط؛ظٹط± ظ…ط­ط¯ط¯";
        let reportTitle = `ط§ط³طھظ„ط§ظ…ط§طھ ظ…ط¬ظ…ط¹ط© - ط§ظ„ظ…ط³طھظ„ظ…: ${mergedReceiverName}`;
        
        // ط§ط³طھط¯ط¹ط§ط، ط¯ط§ظ„ط© ط§ظ„ط·ط¨ط§ط¹ط© ط§ظ„ط®ط§طµط© ط¨ط§ظ„ط§ط³طھظ„ط§ظ…ط§طھ
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
    
    let titleStr = bId === 'legacy' ? 'ط§ظ„ط§ط³طھظ„ط§ظ…ط§طھ ط§ظ„ظ…ط¬ظ…ط¹ط© (ط§ظ„ظ‚ط¯ظٹظ…ط©)' : `ط§ظ„ط³ط§ط¹ط© ${new Date(parseInt(bId)).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
    
    let html = `
        <h3 style="color: var(--primary); margin-top: 0; font-family: 'Cairo', sans-serif; text-align: center;">
            طھط¹ط¯ظٹظ„ ط§ط³طھظ„ط§ظ…ط© ${dateVal} - ${titleStr}
        </h3>
        <p style="font-size: 0.9rem; color: var(--text-main); text-align: center; margin-bottom: 10px;">
            طھظ†ط¨ظٹظ‡: ط¨ط¹ط¯ طھط¹ط¯ظٹظ„ ط§ظ„ط£طµظ†ط§ظپطŒ ظٹظڈط±ط¬ظ‰ ط¥ط؛ظ„ط§ظ‚ ظ‡ط°ظ‡ ط§ظ„ظ†ط§ظپط°ط© ط«ظ… ط·ط¨ط§ط¹ط© ط§ظ„ط§ط³طھظ„ط§ظ…ط© ظ„ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ط§ظ„طھط­ط¯ظٹط«ط§طھ.
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px; max-height: 50vh; overflow-y: auto; padding-right: 5px;">
    `;

    items.forEach(item => {
        html += `
            <div style="background: var(--bg-light); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <div style="display: flex; flex-direction: column; gap: 5px; flex: 1;">
                    <span style="font-weight: bold; color: var(--text-main);"><i class='fa-solid fa-box'></i> ${item.name}</span>
                    <span style="font-size: 0.85rem; color: var(--text-muted);">
                        ط§ظ„ظƒظ…ظٹط©: <strong style="color:var(--text-dark);">${item.qty}</strong> | ط§ظ„ظ…ط³طھظ„ظ…: ${item.receiver || 'ط؛ظٹط± ظ…ط­ط¯ط¯'} | طھط§ط±ظٹط® ط§ظ„طµظ„ط§ط­ظٹط©: ${item.expiryDate || 'ط¨ط¯ظˆظ†'}
                    </span>
                </div>
                <button class="interactive-btn" style="background: #3498db; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" onclick="openEditExpiryModal('${item.id}')">
                    <i class="fa-solid fa-pen"></i> طھط¹ط¯ظٹظ„
                </button>
            </div>
        `;
    });

    if (items.length === 0) {
        html += `<p style="text-align: center; color: var(--text-muted);">ظ„ط§ طھظˆط¬ط¯ ط£طµظ†ط§ظپ ظپظٹ ظ‡ط°ظ‡ ط§ظ„ط§ط³طھظ„ط§ظ…ط©.</p>`;
    }

    html += `
        </div>
        <button id="closeBatchEditModalBtn" style="background: var(--text-muted); color: white; border: none; padding: 12px; border-radius: 8px; text-align: center; font-weight: bold; cursor: pointer; margin-top: 10px;">
            ط¥ط؛ظ„ط§ظ‚
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
        <h3 style="color: var(--primary); margin-top: 0; font-family: 'Cairo', sans-serif; text-align: center;">طھظ‚ط³ظٹظ… ط§ظ„ط§ط³طھظ„ط§ظ…ط§طھ ظٹط¯ظˆظٹط§ظ‹ âœ‚ï¸ڈ</h3>
        <p style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 15px; text-align: center;">ط­ط¯ط¯ ط§ظ„ط£طµظ†ط§ظپ ط§ظ„طھظٹ طھط±ظٹط¯ ط·ط¨ط§ط¹طھظ‡ط§ ظ…ط¹ط§ظ‹ ظپظٹ ط§ط³طھظ„ط§ظ…ط© ظˆط§ط­ط¯ط©:</p>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding: 0 10px;">
            <label style="cursor: pointer; font-weight: bold; color: var(--primary);">
                <input type="checkbox" id="selectAllManualBtn"> طھط­ط¯ظٹط¯ ط§ظ„ظƒظ„
            </label>
            <span style="font-size: 0.85rem; color: var(--text-muted);">ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط£طµظ†ط§ظپ: ${legacyBatch.length}</span>
        </div>

        <div style="flex: 1; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; background: var(--bg-light);">
    `;

    legacyBatch.forEach((item, index) => {
        html += `
            <label style="display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; transition: 0.2s;">
                <input type="checkbox" class="manual-item-checkbox" value="${index}" style="width: 18px; height: 18px; accent-color: var(--primary);">
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: var(--text-main);">${item.name || 'ط¨ط¯ظˆظ† ط§ط³ظ…'}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">ط§ظ„ط¹ط¯ط¯: <strong style="color: #27ae60;">${item.qty}</strong> | ط§ظ„ظ…ط³ط¬ظ„: ${item.registrarName || '-'} | ط§ظ„ظ…ط³طھظ„ظ…: ${item.receiver || '-'}</div>
                </div>
            </label>
        `;
    });

    html += `
        </div>
        <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button id="printManualSelectedBtn" style="flex: 2; background: #E91E8C; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem;">
                <i class=\'fa-solid fa-print\'></i> ط·ط¨ط§ط¹ط© ط§ظ„ظ…ط­ط¯ط¯ ظپظ‚ط· (<span id="selectedCountSpan">0</span>)
            </button>
            <button id="closeManualModalBtn" style="flex: 1; background: var(--bg-light); color: var(--text-main); border: 1px solid var(--border); padding: 12px; border-radius: 8px; cursor: pointer;">ط¥ظ„ط؛ط§ط،</button>
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
            showToast("ظٹط±ط¬ظ‰ طھط­ط¯ظٹط¯ طµظ†ظپ ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„ ظ„ظ„ط·ط¨ط§ط¹ط©", "warning");
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
        showToast("ظٹط±ط¬ظ‰ ط§ظ„ط³ظ…ط§ط­ ط¨ط§ظ„ظ†ظˆط§ظپط° ط§ظ„ظ…ظ†ط¨ط«ظ‚ط© (Pop-ups) ظ„ظپطھط­ ظ…ظ„ظپ ط§ظ„ط·ط¨ط§ط¹ط©", "error");
        return;
    }

    let baseUrl = window.location.href.split('?')[0].replace(/[^/]*$/, '');
    let logoUrl = baseUrl + 'favicon.png';
    let cleanCategoryName = categoryName.replace(/<[^>]*>?/gm, '').trim();

    let html = `
        <html dir="rtl" lang="ar">
        <head>
            <title>طھظ‚ط±ظٹط± ط­ط§ظ„ط© ط§ظ„طµظ„ط§ط­ظٹط§طھ - ${cleanCategoryName}</title>
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
                    <h2 class="title">طھظ‚ط±ظٹط± ط­ط§ظ„ط© ط§ظ„طµظ„ط§ط­ظٹط§طھ</h2>
                    <p class="subtitle">ط­ط§ظ„ط© ط§ظ„ظ…ظ†طھط¬ط§طھ: <strong style="color: #e74c3c;">${categoryName}</strong></p>
                    <p class="subtitle" style="font-size: 13px; margin-top: 5px;">طھط§ط±ظٹط® ط§ظ„ط·ط¨ط§ط¹ط©: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">ظ…</th>
                        <th>ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬</th>
                        <th>ط§ظ„ط¨ط§ط±ظƒظˆط¯</th>
                        <th style="width: 100px;">ط§ظ„ظƒظ…ظٹط©</th>
                        <th style="width: 120px;">طھط§ط±ظٹط® ط§ظ„ط§ظ†طھظ‡ط§ط،</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filteredData.forEach((item, index) => {
        let name = item.name || 'ط؛ظٹط± ظ…ط­ط¯ط¯';
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
                <p>طھظ… ط§ط³طھط®ط±ط§ط¬ ظ‡ط°ط§ ط§ظ„طھظ‚ط±ظٹط± ظ…ظ† ظ†ط¸ط§ظ… Candy Club</p>
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
        showToast("ظٹط±ط¬ظ‰ ط§ظ„ط³ظ…ط§ط­ ط¨ط§ظ„ظ†ظˆط§ظپط° ط§ظ„ظ…ظ†ط¨ط«ظ‚ط© (Pop-ups) ظ„ظپطھط­ ظ…ظ„ظپ ط§ظ„ط·ط¨ط§ط¹ط©", "error");
        return;
    }

    let baseUrl = window.location.href.split('?')[0].replace(/[^/]*$/, '');
    let logoUrl = baseUrl + 'favicon.png';

    let html = `
        <html dir="rtl" lang="ar">
        <head>
            <title>طھظ‚ط±ظٹط± ط§ظ†طھظ‡ط§ط، ط§ظ„طµظ„ط§ط­ظٹط© - ط´ظ‡ط± ${monthVal}</title>
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
                    <h2 class="title">طھظ‚ط±ظٹط± ط§ظ†طھظ‡ط§ط، ط§ظ„طµظ„ط§ط­ظٹط©</h2>
                    <p class="subtitle">ظ…ظ†طھط¬ط§طھ طھظ†طھظ‡ظٹ ظپظٹ ط´ظ‡ط±: <strong dir="ltr">${monthVal}</strong></p>
                    <p class="subtitle" style="font-size: 13px; margin-top: 5px;">طھط§ط±ظٹط® ط§ظ„ط·ط¨ط§ط¹ط©: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">ظ…</th>
                        <th>ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬</th>
                        <th>ط§ظ„ط¨ط§ط±ظƒظˆط¯</th>
                        <th style="width: 100px;">ط§ظ„ظƒظ…ظٹط©</th>
                        <th style="width: 120px;">طھط§ط±ظٹط® ط§ظ„ط§ظ†طھظ‡ط§ط،</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filteredData.forEach((item, index) => {
        let name = item.name || 'ط؛ظٹط± ظ…ط­ط¯ط¯';
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
                <p>طھظ… ط§ط³طھط®ط±ط§ط¬ ظ‡ط°ط§ ط§ظ„طھظ‚ط±ظٹط± ظ…ظ† ظ†ط¸ط§ظ… Candy Club</p>
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
        showToast("ظٹط±ط¬ظ‰ ط§ظ„ط³ظ…ط§ط­ ط¨ط§ظ„ظ†ظˆط§ظپط° ط§ظ„ظ…ظ†ط¨ط«ظ‚ط© (Pop-ups) ظ„ظپطھط­ ظ…ظ„ظپ ط§ظ„ط·ط¨ط§ط¹ط©", "error");
        return;
    }

    let baseUrl = window.location.href.split('?')[0].replace(/[^/]*$/, '');
    let logoUrl = baseUrl + 'favicon.png';

    let html = `
        <html dir="rtl" lang="ar">
        <head>
            <title>ط¨ظٹط§ظ† ط§ط³طھظ„ط§ظ… ط¨ط¶ط§ط¹ط© - ${dateVal}</title>
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
                <div class="title">ط¨ظٹط§ظ† ط§ط³طھظ„ط§ظ… ط¨ط¶ط§ط¹ط©</div>
            </div>
            
            <div class="info-section">
                <div class="info-box">
                    <div><span class="info-label">طھط§ط±ظٹط® ط§ظ„طھط³ط¬ظٹظ„:</span> <span style="font-weight:bold; color:#E91E8C;">${dateVal}</span></div>
                    <div style="margin-top: 10px;"><span class="info-label">ط§ط³ظ… ط§ظ„ظ…ط³ط¬ظ„:</span> <strong>${registrar}</strong></div>
                </div>
                <div class="info-box">
                    <div><span class="info-label">ط§ط³ظ… ط§ظ„ظ…ط³طھظ„ظ…:</span> <span style="font-weight:bold; font-size:1.1em;">${receiver}</span></div>
                    <div style="margin-top: 10px;"><span class="info-label">ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط£طµظ†ط§ظپ:</span> <strong>${filteredData.length}</strong></div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">ظ…</th>
                        <th style="width: 30%;">ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬</th>
                        <th style="width: 15%;">ط§ظ„ط¨ط§ط±ظƒظˆط¯</th>
                        <th style="width: 10%;">ط§ظ„ط¹ط¯ط¯</th>
                        <th style="width: 15%;">طھط§ط±ظٹط® ط§ظ„ط§ظ†طھظ‡ط§ط،</th>
                        <th style="width: 15%;">ط§ظ„ظ…ظƒط§ظ†</th>
                        <th style="width: 10%;">ظ…ظ„ط§ط­ط¸ط§طھ</th>
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
                    <div style="font-weight: bold; color: #333;">طھظˆظ‚ظٹط¹ ط§ظ„ظ…ظڈط³ظ„ظ… (ط§ظ„ظ…ط³ط¬ظ„)</div>
                    <div class="sig-line"></div>
                </div>
                <div class="sig-box">
                    <div style="font-weight: bold; color: #333;">طھظˆظ‚ظٹط¹ ط§ظ„ظ…ظڈط³طھظ„ظ…</div>
                    <div class="sig-line"></div>
                </div>
            </div>

            <div class="footer">
                طھظ… ط§ط³طھط®ط±ط§ط¬ ظ‡ط°ط§ ط§ظ„ط¥ظٹطµط§ظ„ ط¢ظ„ظٹط§ظ‹ ظ…ظ† ظ†ط¸ط§ظ… Candy Club - ${new Date().toLocaleString('ar-EG')}
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
    saveBtns.forEach(btn => { if(btn.innerText && btn.innerText.includes('ط­ظپط¸')) btn.disabled = true; });
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
                alert("طھظ… ظ†ط³ط® ط§ظ„طµظˆط±ط© ط¨ظ†ط¬ط§ط­! ظٹظ…ظƒظ†ظƒ ط§ظ„ط¢ظ† ظ„طµظ‚ظ‡ط§ (Paste) ظپظٹ ط´ط§طھ ط§ظ„ظˆط§طھط³ط§ط¨.");
            }, "image/png");
        } catch (err) {
            alert("ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ظ†ط³ط® ط§ظ„طµظˆط±ط©. ظ‚ط¯ ظ„ط§ ظٹط¯ط¹ظ… ظ…طھطµظپط­ظƒ ظ‡ط°ظ‡ ط§ظ„ط®ط§طµظٹط©.");
        }
    });
}

const waStartCampaignBtn = document.getElementById("waStartCampaignBtn");
if(waStartCampaignBtn) {
    waStartCampaignBtn.addEventListener("click", () => {
        const list = document.getElementById("waCustomerList");
        const countSpan = document.getElementById("waQueueCount");
        const container = document.getElementById("waQueueContainer");
        const targetType = waTargetGroup ? waTargetGroup.value : "all";
        
        let validCustomers = [];
        
        if (targetType === "custom") {
            const text = document.getElementById("waCustomNumbers").value;
            const numbers = text.split(/[\n,]+/).map(n => n.trim()).filter(n => n);
            validCustomers = numbers.map(n => ({ name: "ط¹ظ…ظٹظ„", phone: n }));
        } else {
            if(!window.customersData || window.customersData.length === 0) {
                alert("ظ„ط§ ظٹظˆط¬ط¯ ط¹ظ…ظ„ط§ط، ظ…ط³ط¬ظ„ظٹظ† ط­ط§ظ„ظٹط§ظ‹.");
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
            alert("ظ„ط§ ظٹظˆط¬ط¯ ط¹ظ…ظ„ط§ط، ظپظٹ ظ‡ط°ظ‡ ط§ظ„ظپط¦ط© ط§ظ„ظ…ط³طھظ‡ط¯ظپط©.");
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
                    <span style="font-size:0.8rem; color:#7f8c8d;"><i class=\'fa-solid fa-phone\'></i> ${c.phone} ${c.visits !== undefined ? `| <i class=\'fa-solid fa-bag-shopping\'></i> ط²ظٹط§ط±ط§طھ: ${c.visits}` : ''}</span>
                </div>
                <button class="wa-send-btn interactive-btn" id="wa-btn-${index}" onclick="sendWaCampaign(${index}, '${c.name}', '${c.phone}')" style="background: #25D366; color: white; border: none; padding: 8px 15px; border-radius: 8px; font-weight: bold; cursor: pointer;">ط¥ط±ط³ط§ظ„ <i class=\'fa-solid fa-rocket\'></i></button>
            `;
            list.appendChild(div);
        });
        
        container.scrollIntoView({ behavior: "smooth" });
    });
}

window.sendWaCampaign = function(index, name, phone) {
    if(waCooldownTime > 0) {
        alert("ط¨ط±ط¬ط§ط، ط§ظ„ط§ظ†طھط¸ط§ط± ط­طھظ‰ ظٹظ†طھظ‡ظٹ ط§ظ„ط¹ط¯ط§ط¯ ظ„ط­ظ…ط§ظٹط© ط±ظ‚ظ…ظƒ ظ…ظ† ط§ظ„ط­ط¸ط±.");
        return;
    }
    
    let textElem = document.getElementById("waCampaignText");
    if(!textElem) return;
    
    let text = textElem.value;
    if(!text.trim()) {
        alert("ط¨ط±ط¬ط§ط، ظƒطھط§ط¨ط© ظ†طµ ط±ط³ط§ظ„ط© ط§ظ„ط¹ط±ط¶ ط£ظˆظ„ط§ظ‹.");
        textElem.focus();
        return;
    }
    
    text = text.replace(/\[ط§ظ„ط§ط³ظ…\]/g, name);
    
    let cleanPhone = sanitizePhone(phone);
    if(!cleanPhone) {
        alert("ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ط؛ظٹط± طµط§ظ„ط­.");
        return;
    }
    
    let url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    
    let btn = document.getElementById(`wa-btn-${index}`);
    if(btn) {
        btn.innerHTML = "طھظ… ط§ظ„ط¥ط±ط³ط§ظ„ <i class=\'fa-solid fa-check\'></i>";
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
        timerSpan.innerHTML = `<i class=\'fa-solid fa-hourglass-half\'></i> ط§ظ†طھط¸ط± ${waCooldownTime} ط«ط§ظ†ظٹط© ظ„ط­ظ…ط§ظٹط© ط­ط³ط§ط¨ظƒ...`;
        
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
                <strong style="font-size:0.85rem; color:var(--primary);"><i class=\'fa-solid fa-box\'></i> ط£ظˆط±ط¯ط±ط§طھ ظ…ط¹ظ„ظ‚ط© (ظ„ظ… ظٹطھظ… طھط³ظˆظٹطھظ‡ط§):</strong>`;
            driverOrders.forEach(o => {
                ordersHtml += `
                    <div class="financial-order-item" style="background:#fdfdfd; padding:8px; border:1px solid #eee; border-radius:6px; margin-top:5px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" class="financial-order-checkbox" data-order-id="${o.id}" data-payment="${o.payment}" style="width: 18px; height: 18px; cursor: pointer;">
                            <div>
                                <span style="font-weight:bold; color:var(--text-dark);">${o.id}</span><br>
                                <span style="font-size:0.75rem; color:#777;">${o.payment} | ط¥ط¬ظ…ط§ظ„ظٹ: ${o.total}ط¬ | ط´ط­ظ†: ${o.shipping}ط¬</span><br>
                                <span style="font-size:0.85rem; font-weight:bold; color:var(--danger);">ط§ظ„ظ…ط·ظ„ظˆط¨ طھط­طµظٹظ„ظ‡: ${o.remaining}ط¬</span>
                            </div>
                        </div>
                        <button class="btn-settle interactive-btn" onclick="settleDriverOrder('${o.id}', this, '${o.payment}')" style="background:var(--success); color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">طھط³ظˆظٹط© <i class=\'fa-solid fa-money-bill\'></i></button>
                    </div>
                `;
            });
            ordersHtml += `</div>`;
        }

        container.innerHTML += `
            <div class="${cardClass}" style="background: #fff; padding: 15px; border-radius: 12px; border: 1px solid ${cardBorderColor}; margin-bottom: 12px; box-shadow: ${cardShadow}; opacity: ${cardOpacity}; transition: all 0.3s ease;">
                <div class="financial-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #f0f0f0; padding-bottom:8px; margin-bottom:10px;">
                    <span style="font-weight:bold; font-size:1.1rem; color:var(--text-dark);"><i class=\'fa-solid fa-motorcycle\'></i> ${f.name}</span>
                    <span style="font-size: 0.85rem; background:#f0f0f0; color:var(--text-dark); padding:3px 8px; border-radius:12px; font-weight:bold;">${f.ordersCount || 0} ط·ظ„ط¨</span>
                </div>
                <div class="financial-details" style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:10px;">
                    <span style="background:#e8f4f8; padding:5px 10px; border-radius:6px; color:#555;">ط§ظ„ظƒط§ط´: <strong style="color:#2980b9;">${f.cashCollected || 0}</strong> ط¬</span>
                    <span style="background:#f9ebea; padding:5px 10px; border-radius:6px; color:#555;">ط§ظ„ط´ط­ظ†: <strong style="color:#c0392b;">${f.shippingFees || 0}</strong> ط¬</span>
                </div>
                <div class="financial-status" style="background: ${statusColor}15; color: ${statusColor}; padding: 8px; border-radius: 6px; text-align:center; font-weight:bold; border: 1px dashed ${statusColor};">
                    ${f.statusText} (${netDue} ط¬)
                </div>
                ${ordersHtml}
            </div>
        `;
    });

    let totalEl = document.getElementById('financialsTotalAmount');
    if (totalEl) {
        totalEl.innerText = `ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط­ط³ط§ط¨: ${totalAllDue} ط¬.ظ…`;
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
            
            customConfirm(`ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† طھط³ظˆظٹط© ط¹ط¯ط¯ ${checkedBoxes.length} ط£ظˆط±ط¯ط± ظ…ط­ط¯ط¯طں`, () => {
                closeSelectedBtn.disabled = true;
                const originalText = closeSelectedBtn.innerHTML;

                (async function processSequential() {
                    for(let i=0; i<checkedBoxes.length; i++) {
                        const cb = checkedBoxes[i];
                        const orderId = cb.getAttribute('data-order-id');
                        const btn = cb.closest('.financial-order-item') ? cb.closest('.financial-order-item').querySelector('.btn-settle') : null;
                        
                        closeSelectedBtn.innerText = `ط¬ط§ط±ظٹ ط§ظ„طھظ‚ظپظٹظ„... (${i+1}/${checkedBoxes.length})`;
                        if(btn) { btn.innerText = "ط¬ط§ط±ظٹ..."; btn.disabled = true; }

                        let formData = new URLSearchParams();
                        formData.append('action', 'settleOrder');
                        formData.append('orderId', orderId);

                        try {
                            // Wait for 500ms to allow Google Scripts to process gracefully
                            await new Promise(r => setTimeout(r, 500));
                            await fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData });
                            if(btn) {
                                btn.innerText = "طھظ…";
                                btn.style.background = "var(--success)";
                            }
                        } catch(e) {
                            if(btn) { btn.innerText = "ط®ط·ط£"; btn.disabled = false; }
                        }
                    }
                    
                    closeSelectedBtn.innerHTML = originalText;
                    closeSelectedBtn.disabled = false;
                    if(selectAllCheckbox) selectAllCheckbox.checked = false;
                    updateCloseBtnVisibility();
                    
                    showToast(`<i class=\'fa-solid fa-check\'></i> طھظ… طھظ‚ظپظٹظ„ ظƒظ„ ط§ظ„ظ…ط­ط¯ط¯ ط¨ظ†ط¬ط§ط­!`, "success");
                    loadDataFromServer();
                })();
            });
        });
    }
});

// ==========================================
// 19. ط¨ط·ط§ظ‚ط§طھ ط§ظ„ط£ط³ط¹ط§ط± (Price Tags Logic)
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
        showToast("ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ…ظ† ط§ظ„ط³ظٹط±ظپط±طŒ ظٹط±ط¬ظ‰ ط§ظ„ط§ظ†طھط¸ط§ط±...", "warning");
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
    if(pageInfo) pageInfo.textContent = `طµظپط­ط© ${currentPriceTagsPage} ظ…ظ† ${totalPages}`;
    
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
                        ${p.isOffer ? `<span style="text-decoration:line-through; color:rgba(255,255,255,0.7); margin-left:5px; font-size: 0.8rem;">${p.price}ط¬</span> <span>${p.offerPrice}ط¬</span>` : `<span>${p.price}ط¬</span>`}
                    </div>
                    ${p.barcode ? `<span style="font-size: 0.8rem; background: #f0f4f8; border: 1px solid #cfd8dc; padding: 2px 8px; border-radius: 6px; color: #546e7a;"><i class="fa-solid fa-barcode"></i> ${p.barcode}</span>` : ''}
                </div>
            </div>
            <button class="btn-outline interactive-btn" onclick="event.stopPropagation(); promptPriceTagOffer('${safeName}')" style="padding: 6px 12px; font-size: 0.85rem; border-radius: 6px; white-space: nowrap;"><i class="fa-solid fa-tag"></i> طھط®طµظٹطµ ط¹ط±ط¶</button>
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
        showToast("طھظ… طھط®طµظٹطµ ظˆطھط·ط¨ظٹظ‚ ط§ظ„ط¹ط±ط¶ ط¨ظ†ط¬ط§ط­", "success");
    } else {
        p.isOffer = false;
        p.offerPrice = 0;
        if (newOffer === '' || parsed === 0) showToast("طھظ… ط¥ظ„ط؛ط§ط، ط§ظ„ط¹ط±ط¶", "success");
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
                    <span class="candy-deco top-left">ًںچ­</span>
                    <span class="candy-deco top-right">ًںچ¬</span>
                    <span class="candy-deco bottom-left">âœ¨</span>
                    <span class="candy-deco bottom-right">ًںچ­</span>
                    ${p.isOffer && parseFloat(p.offerPrice) > 0 && parseFloat(p.offerPrice) !== parseFloat(p.price) ? '<div class="offer-badge">ط¹ط±ط¶ ط®ط§طµ</div>' : ''}
                
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
                        <span class="candy-icon">ًںچ¬</span>
                    </div>
                    
                    <div class="tag-box bottom-box">
                        <div class="tag-row price-row" style="justify-content: center; text-align: center;">
                            <span class="tag-value" style="display: block; width: 100%; text-align: center; ${dynamicPriceStyle}">
                                ط§ظ„ط³ط¹ط±: ${priceHtml}ط¬
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
                <p style="font-size: 1.1rem; font-weight: bold;">ط§ط®طھط± ظ…ظ†طھط¬ط§طھ ظ„ط±ط¤ظٹط© ط§ظ„ظ…ط¹ط§ظٹظ†ط©</p>
                <p style="font-size: 0.9rem; margin-top: 5px;">ط³ظٹطھظ… ط¹ط±ط¶ ط§ظ„ظƒط±ظˆطھ ط§ظ„ظ…ط­ط¯ط¯ط© ظپظ‚ط· ظ‡ظ†ط§.</p>
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
        showToast("ط¨ط±ط¬ط§ط، طھط­ط¯ظٹط¯ ظ…ظ†طھط¬ ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„", "warning");
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
        showToast("ط¨ط±ط¬ط§ط، طھط­ط¯ظٹط¯ ظ…ظ†طھط¬ ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„", "warning");
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
    
    showToast("ط¬ط§ط±ظٹ طھط¬ظ‡ظٹط² طµظپط­ط© ط§ظ„ط·ط¨ط§ط¹ط©... ظٹط±ط¬ظ‰ ط§ط®طھظٹط§ط± 'ط­ظپط¸ ط¨طھظ†ط³ظٹظ‚ PDF' (Save as PDF) ظ…ظ† ط§ظ„ظ†ط§ظپط°ط©", "success");
    
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
        showToast("ط¨ط±ط¬ط§ط، طھط­ط¯ظٹط¯ ظ…ظ†طھط¬ ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„", "warning");
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
    
    const allOrders = [...(window.orderHistoryData || []), ...(window.pendingOrdersData || [])];
    const modsData = {};
    
    const now = new Date();
    const currentMonthPrefix = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    
    allOrders.forEach(o => {
        const mod = o.moderator ? o.moderator.trim() : null;
        if (!mod || mod === '') return;
        
        if (!modsData[mod]) {
            modsData[mod] = { name: mod, totalCount: 0, monthCount: 0, totalSales: 0, monthSales: 0 };
        }
        
        const amount = parseFloat(o.total) || 0;
        modsData[mod].totalCount += 1;
        modsData[mod].totalSales += amount;
        
        if (o.date && o.date.startsWith(currentMonthPrefix)) {
            modsData[mod].monthCount += 1;
            modsData[mod].monthSales += amount;
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
                        <div style="font-size: 0.8rem; color: #34495e; margin-top: 3px;">${m.monthCount} أوردر</div>
                    </div>
                    <div style="background: #fdfdfd; padding: 10px; border-radius: 10px; border: 1px dashed #ccc; text-align: center;">
                        <div style="font-size: 0.8rem; color: #7f8c8d; font-weight: bold; margin-bottom: 5px;">إجمالي المبيعات (عام)</div>
                        <div style="font-size: 1.2rem; font-weight: 900; color: #2980b9;">${m.totalSales} <span style="font-size:0.7rem;">ج.م</span></div>
                        <div style="font-size: 0.8rem; color: #34495e; margin-top: 3px;">${m.totalCount} أوردر</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
};
