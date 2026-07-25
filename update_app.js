const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

// 1. Auto-trigger financials
const tabsLogicSearch = `        if (targetId === 'users-tab') {
            loadUsersList();
        }`;
const tabsLogicReplace = `        if (targetId === 'users-tab') {
            loadUsersList();
        }
        
        // ⭐ V16.1: Auto load financials
        if (targetId === 'financials-tab') {
            let mInput = document.getElementById('driversMonthFilter');
            if (mInput && !mInput.value) {
                let d = new Date();
                mInput.value = \`\${d.getFullYear()}-\${String(d.getMonth()+1).padStart(2,'0')}\`;
                if(window.refreshDriversStats) window.refreshDriversStats();
            }
        }`;
js = js.replace(tabsLogicSearch, tabsLogicReplace);


// 2. Add searchDriverOrder function
const searchFuncCode = `
// ⭐ V16.1: تتبع الأوردر ومعرفة مندوبه
window.searchDriverOrder = function() {
    let q = document.getElementById('driverOrderSearchInput');
    if(!q || !q.value.trim()) {
        showToast("برجاء إدخال رقم الأوردر للبحث", "warning");
        return;
    }
    let val = q.value.trim().toLowerCase();
    
    // Search in history
    let order = (window.orderHistoryData || []).find(o => String(o.id).toLowerCase() === val) ||
                (window.pendingOrdersData || []).find(o => String(o.id).toLowerCase() === val) ||
                (window.uncollectedOrdersData || []).find(o => String(o.id).toLowerCase() === val);
                
    if(!order) {
        customAlert("<i class='fa-solid fa-circle-exclamation' style='color:var(--danger)'></i> <b>لم يتم العثور على الأوردر.</b><br>تأكد من كتابة الرقم بشكل صحيح.");
        return;
    }
    
    let driverName = order.driver || "غير محدد";
    let statusText = order.status || "غير معروفة";
    let statusColor = statusText.includes("توصيل") ? "var(--success)" : (statusText.includes("مرتجع") ? "var(--danger)" : "var(--primary)");
    
    let msg = \`
        <div style="text-align:right; font-size:1.1rem; line-height:1.6;">
            <strong>رقم الأوردر:</strong> \${order.id}<br>
            <strong>اسم العميل:</strong> \${order.name}<br>
            <strong>حالة الأوردر:</strong> <span style="background:\${statusColor}15; color:\${statusColor}; padding:3px 8px; border-radius:6px; font-weight:bold;">\${statusText}</span><br>
            <strong>المندوب الحالي:</strong> <span style="color:var(--primary); font-weight:bold;"><i class="fa-solid fa-motorcycle"></i> \${driverName}</span><br>
            <strong>المنطقة:</strong> \${order.gov || order.address || '--'}<br>
            <strong>إجمالي المطلوب:</strong> \${order.remaining || order.total} ج.م
        </div>
    \`;
    customAlert(msg);
    q.value = '';
};
`;
js = js.replace('window.refreshDriversStats = function() {', searchFuncCode + '\n    window.refreshDriversStats = function() {');


// 3. Render Zone Analytics
const platformSearch = `if (pltEl) {
                let platforms = data.monthPlatforms || {};`;
const zoneAnalyticsCode = `
            // تحليل مناطق الشحن
            let zonesEl = document.getElementById('zonesAnalyticsList');
            if (zonesEl) {
                let zones = data.monthZonesStats || [];
                if (zones.length === 0) {
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
                    let estimatedDaysInMonth = 26; // استبعاد 4 أيام جمعة
                    let totalFixedCost = fixedSalary * estimatedDaysInMonth;
                    let potentialSavings = totalShippingAllZones - totalFixedCost;
                    
                    html += \`
                        <div style="margin-bottom:15px; background:#fff8e1; border:1px solid #ffe082; padding:12px; border-radius:8px;">
                            <h4 style="margin:0 0 10px; color:#f39c12;"><i class="fa-solid fa-lightbulb"></i> دراسة جدوى مبدئية</h4>
                            <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:5px;">
                                <span>إجمالي مصاريف الشحن المدفوعة:</span>
                                <strong>\${totalShippingAllZones} ج.م</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:5px;">
                                <span>تكلفة مندوب ثابت (300ج × 26 يوم):</span>
                                <strong>\${totalFixedCost} ج.م</strong>
                            </div>
                            <hr style="border-color:#ffe082; margin:10px 0;">
                            <div style="display:flex; justify-content:space-between; font-size:1rem; font-weight:bold;">
                                <span>التوفير المتوقع:</span>
                                <span style="color:\${potentialSavings > 0 ? 'var(--success)' : 'var(--danger)'};">\${potentialSavings > 0 ? '+' : ''}\${potentialSavings} ج.م</span>
                            </div>
                            <p style="font-size:0.75rem; color:#888; margin:5px 0 0;">* الحساب مبني على الافتراضات وقد يتغير حسب المسافات وظروف العمل.</p>
                        </div>
                    \`;
                    
                    let maxCount = zones[0].count || 1;
                    html += zones.map((z, idx) => {
                        let pct = Math.round((z.count / maxCount) * 100);
                        return \`<div style="margin-bottom:12px;">
                            <div style="display:flex;justify-content:space-between;font-size:0.88rem;font-weight:bold;margin-bottom:4px;">
                                <span>\${idx + 1}. \${z.name}</span>
                                <span>\${z.count} أوردر ( \${z.totalShipping} ج )</span>
                            </div>
                            <div style="background:#f0f0f0;height:8px;border-radius:4px;overflow:hidden;">
                                <div style="width:\${pct}%;background:var(--warning);height:100%;border-radius:4px;"></div>
                            </div>
                        </div>\`;
                    }).join('');
                    
                    zonesEl.innerHTML = html;
                }
            }
`;
js = js.replace(platformSearch, zoneAnalyticsCode + '\n            ' + platformSearch);


// 4. Show today's stats in driver financials
const financialSearch = `let netDue = parseFloat(f.netDue) || 0;`;
const financialTodayCode = `
        let todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        let todayOrdersCount = 0;
        let todayShippingEarned = 0;
        
        // Calculate today's stats for this driver from all available data (shipped, history, etc)
        (window.orderHistoryData || []).forEach(o => {
            if(o.driver === f.name && String(o.date).startsWith(todayStr)) {
                if(o.status === "تم التوصيل" || o.status === "تم التوصيل ومُحاسب") {
                    todayOrdersCount++;
                    todayShippingEarned += (parseFloat(o.shipping) || 0);
                }
            }
        });
        (window.uncollectedOrdersData || []).forEach(o => {
            if(o.driver === f.name && o.status !== "مرتجع") { // Usually uncollected doesn't have date easily accessible here, but let's check history
                // already checked in history since we just fetched the whole month.
            }
        });
        
        // Wait, window.orderHistoryData has the whole month?
        // Ah, window.orderHistoryData only has ONE DAY (the selected filterDate).
        // Let's use latestServerData if we fetched the whole month.
        // Actually, the monthly report fetches data but doesn't store raw orders globally.
        // Let's rely on the fact that drivers stats from the server are updated.
        // The user wants "today's profits". We can just fetch it from the server's driverStats which we just added in Code.txt!
        
        // Actually, we modified driverStats in Code.txt to include monthProfit, monthOrderCount.
        // We can just add todayProfit and todayOrderCount in Code.txt as well!
`;

fs.writeFileSync('app.js', js, 'utf8');
console.log("app.js modified successfully.");
