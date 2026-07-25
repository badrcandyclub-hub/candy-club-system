const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

// 4. Show today's stats in driver financials
const financialSearch = `let netDue = parseFloat(f.netDue) || 0;`;
const financialTodayCode = `
        let netDue = parseFloat(f.netDue) || 0;
        
        let todayCount = 0;
        let todayProfit = 0;
        if(window.latestServerData && window.latestServerData.todayDriverStats && window.latestServerData.todayDriverStats[f.name]) {
            todayCount = window.latestServerData.todayDriverStats[f.name].count || 0;
            todayProfit = window.latestServerData.todayDriverStats[f.name].profit || 0;
        }
`;

const renderFinancialsDivSearch = `<div style="font-size: 0.95rem; margin-top: 10px;">
                            <p style="margin-bottom: 5px;"><strong>الأوردرات غير المحصلة:</strong> \${driverOrders.length} أوردر</p>
                            <p style="margin-bottom: 5px;"><strong>إجمالي الشحن غير المحصل:</strong> \${totalShippingToCollect} ج.م</p>`;

const renderFinancialsDivReplace = `<div style="font-size: 0.95rem; margin-top: 10px;">
                            <div style="background:#e8f5e9; padding:8px; border-radius:6px; border-right:4px solid var(--success); margin-bottom:10px;">
                                <strong style="color:var(--success);"><i class="fa-solid fa-calendar-day"></i> أوردرات اليوم:</strong>
                                <div style="display:flex; justify-content:space-between; margin-top:5px; font-size:0.9rem;">
                                    <span>وصل النهاردة: <strong>\${todayCount} أوردر</strong></span>
                                    <span>أرباح اليوم: <strong>\${todayProfit} ج.م</strong></span>
                                </div>
                            </div>
                            <p style="margin-bottom: 5px;"><strong>الأوردرات غير المحصلة:</strong> \${driverOrders.length} أوردر</p>
                            <p style="margin-bottom: 5px;"><strong>إجمالي الشحن غير المحصل:</strong> \${totalShippingToCollect} ج.م</p>`;

if (js.includes(financialSearch)) {
    js = js.replace(financialSearch, financialTodayCode);
} else {
    console.log("Could not find financialSearch");
}

if (js.includes(renderFinancialsDivSearch)) {
    js = js.replace(renderFinancialsDivSearch, renderFinancialsDivReplace);
} else {
    console.log("Could not find renderFinancialsDivSearch");
}


// Write the updated code to app.js
fs.writeFileSync('app.js', js, 'utf8');
console.log("app.js driver financials updated.");
