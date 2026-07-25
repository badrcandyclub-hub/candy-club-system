const fs = require('fs');
let lines = fs.readFileSync('app.js', 'utf8').split('\n');

// 1. Auto-trigger financials
let tabsLogicIdx = lines.findIndex(l => l.includes("if (targetId === 'users-tab') {"));
if (tabsLogicIdx !== -1) {
    let insertCode = `
        // ⭐ V16.1: Auto load financials
        if (targetId === 'financials-tab') {
            let mInput = document.getElementById('driversMonthFilter');
            if (mInput && !mInput.value) {
                let d = new Date();
                mInput.value = \`\${d.getFullYear()}-\${String(d.getMonth()+1).padStart(2,'0')}\`;
                if(window.refreshDriversStats) window.refreshDriversStats();
            }
        }`;
    lines.splice(tabsLogicIdx + 3, 0, insertCode);
    console.log("Added Auto-trigger financials");
}

// 2. Add searchDriverOrder function
let refreshStatsIdx = lines.findIndex(l => l.includes("window.refreshDriversStats = function() {"));
if (refreshStatsIdx !== -1) {
    let searchFuncCode = `
// ⭐ V16.1: تتبع الأوردر ومعرفة مندوبه
window.searchDriverOrder = function() {
    let q = document.getElementById('driverOrderSearchInput');
    if(!q || !q.value.trim()) {
        if (window.showToast) window.showToast("برجاء إدخال رقم الأوردر للبحث", "warning");
        return;
    }
    let val = q.value.trim().toLowerCase();
    
    // Search in history
    let order = (window.orderHistoryData || []).find(o => String(o.id).toLowerCase() === val) ||
                (window.pendingOrdersData || []).find(o => String(o.id).toLowerCase() === val) ||
                (window.uncollectedOrdersData || []).find(o => String(o.id).toLowerCase() === val);
                
    if(!order) {
        if (window.customAlert) customAlert("<i class='fa-solid fa-circle-exclamation' style='color:var(--danger)'></i> <b>لم يتم العثور على الأوردر.</b><br>تأكد من كتابة الرقم بشكل صحيح.");
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
    if (window.customAlert) customAlert(msg);
    q.value = '';
};\n`;
    lines.splice(refreshStatsIdx, 0, searchFuncCode);
    console.log("Added searchDriverOrder");
}

// 3. Render Zone Analytics
let platformSearchIdx = lines.findIndex(l => l.includes("let platforms = data.monthPlatforms || {};"));
if (platformSearchIdx !== -1) {
    let parentIf = platformSearchIdx - 1;
    let zoneAnalyticsCode = `
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
                        let MathPct = Math.round((z.count / maxCount) * 100);
                        return \`<div style="margin-bottom:12px;">
                            <div style="display:flex;justify-content:space-between;font-size:0.88rem;font-weight:bold;margin-bottom:4px;">
                                <span>\${idx + 1}. \${z.name}</span>
                                <span>\${z.count} أوردر ( \${z.totalShipping} ج )</span>
                            </div>
                            <div style="background:#f0f0f0;height:8px;border-radius:4px;overflow:hidden;">
                                <div style="width:\${MathPct}%;background:var(--warning);height:100%;border-radius:4px;"></div>
                            </div>
                        </div>\`;
                    }).join('');
                    
                    zonesEl.innerHTML = html;
                }
            }
`;
    lines.splice(parentIf, 0, zoneAnalyticsCode);
    console.log("Added Zone Analytics render");
}

// 4. Update Financials logic
let financialNetDueIdx = lines.findIndex(l => l.includes("let netDue = parseFloat(f.netDue) || 0;"));
if (financialNetDueIdx !== -1) {
    let todayCode = `
        let todayCount = 0;
        let todayProfit = 0;
        if(window.latestServerData && window.latestServerData.todayDriverStats && window.latestServerData.todayDriverStats[f.name]) {
            todayCount = window.latestServerData.todayDriverStats[f.name].count || 0;
            todayProfit = window.latestServerData.todayDriverStats[f.name].profit || 0;
        }
`;
    lines.splice(financialNetDueIdx + 1, 0, todayCode);
    console.log("Added Financials logic");
    
    // Now insert the HTML
    let statusTextIdx = lines.findIndex((l, i) => i > financialNetDueIdx && l.includes('class="financial-status"'));
    if (statusTextIdx !== -1) {
        let closingDivIdx = statusTextIdx + 2;
        let htmlCode = `
                <!-- أوردرات وأرباح اليوم -->
                <div style="background:#e8f5e9; padding:8px; border-radius:6px; border-right:4px solid var(--success); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; font-size:0.9rem;">
                    <div><strong style="color:var(--success);"><i class="fa-solid fa-calendar-day"></i> أوردرات اليوم:</strong> <span>\${todayCount} أوردر</span></div>
                    <div><strong style="color:var(--success);">أرباح اليوم:</strong> <span>\${todayProfit} ج.م</span></div>
                </div>`;
        lines.splice(closingDivIdx + 1, 0, htmlCode);
        console.log("Added Financials HTML");
    }
}


fs.writeFileSync('app.js', lines.join('\n'), 'utf8');
console.log("app.js updated successfully.");
