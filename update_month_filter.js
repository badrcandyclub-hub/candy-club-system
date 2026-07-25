const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

let search = `    // <i class=\\'fa-solid fa-star\\'></i> Fix: جمع كل الشهور الفعلية من البيانات المتاحة
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

    // <i class=\\'fa-solid fa-star\\'></i> Fix: إضافة الشهر الحالي دائماً (بدون toISOString)
    let now = new Date();
    let currentMonthVal = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    availableMonths.add(currentMonthVal);`;

let replace = `    // <i class=\\'fa-solid fa-star\\'></i> Fix: عرض آخر 24 شهر بشكل ثابت لتجنب اختفاء الشهور
    let availableMonths = new Set();
    let now = new Date();
    for (let i = 0; i < 24; i++) {
        let d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        let monthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        availableMonths.add(monthStr);
    }`;

content = content.replace(search, replace);
fs.writeFileSync('app.js', content, 'utf8');
console.log('Updated month filter options');
