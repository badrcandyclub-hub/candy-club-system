const fs = require('fs');
let lines = fs.readFileSync('admin.html', 'utf8').split('\n');

// 1. Update the Month Filter in financials-tab
let filterIdx = lines.findIndex(l => l.includes('id="driversMonthFilter"'));
if (filterIdx !== -1) {
    // Find the enclosing div
    let startIdx = filterIdx;
    while(startIdx > 0 && !lines[startIdx].includes('<div style="display: flex; gap: 5px; align-items: center; background: #FAFBFF')) {
        startIdx--;
    }
    let endIdx = filterIdx;
    while(endIdx < lines.length && !lines[endIdx].includes('</div>')) {
        endIdx++;
    }
    
    if(startIdx !== -1 && endIdx !== -1) {
        const newFilterBlock = `<!-- Filter & Search Container -->
                        <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                            <!-- Month Filter -->
                            <div style="display: flex; gap: 5px; align-items: center; background: #FAFBFF; border: 1px solid var(--border); border-radius: 8px; padding: 5px;">
                                <label for="driversMonthFilter" style="margin:0; font-size: 0.85rem; font-weight:bold; color:var(--text-main);">تصفية بالشهر:</label>
                                <input type="month" id="driversMonthFilter" style="margin-bottom:0; padding:4px; border:1px solid #ccc; border-radius:4px;">
                                <button type="button" class="btn-primary interactive-btn" onclick="refreshDriversStats()" style="padding: 4px 12px; border-radius: 6px; background: linear-gradient(135deg, var(--primary), var(--primary-light)); border: none; box-shadow: 0 2px 4px rgba(233,30,99,0.3); transition: all 0.3s; font-weight:bold;"><i class="fa-solid fa-bolt"></i> تحديث البيانات</button>
                            </div>
                            <!-- Order Search -->
                            <div style="display: flex; gap: 5px; align-items: center; background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 5px;">
                                <input type="text" id="driverOrderSearchInput" placeholder="بحث برقم الأوردر (لمعرفة مندوبه وحالته)..." style="margin-bottom:0; padding:5px; border:1px solid #ffd54f; border-radius:4px; width:260px; font-size:0.85rem;" onkeypress="if(event.key==='Enter') window.searchDriverOrder()">
                                <button type="button" class="btn-search interactive-btn" onclick="window.searchDriverOrder()" style="padding: 4px 12px; border-radius: 6px;"><i class="fa-solid fa-magnifying-glass"></i> تتبع الأوردر</button>
                            </div>
                        </div>`;
        lines.splice(startIdx, endIdx - startIdx + 1, newFilterBlock);
        console.log("Updated financials filter block.");
    }
} else {
    console.log("Could not find driversMonthFilter");
}

// 2. Add Shipping Zones Analysis in reports-tab
let topProductsIdx = lines.findIndex(l => l.includes('id="topProductsList"'));
if (topProductsIdx !== -1) {
    let startIdx = topProductsIdx;
    while(startIdx > 0 && !lines[startIdx].includes('class="section-card"')) {
        startIdx--;
    }
    
    if(startIdx !== -1) {
        const zonesAnalyticsBlock = `<!-- تحليل مناطق الشحن -->
                <div class="section-card" style="margin-bottom:12px; border-right:4px solid var(--warning);">
                    <h3 class="section-title" style="font-size:1.05rem; display:flex; justify-content:space-between; align-items:center;">
                        <span><i class="fa-solid fa-map-location-dot"></i> تحليل مناطق الشحن (لتوفير التكلفة)</span>
                    </h3>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px;">هذا القسم يحلل مصاريف الشحن لتقييم جدوى تعيين مندوب براتب ثابت.</p>
                    <div id="zonesAnalyticsList" style="padding:5px 0;">
                        <p class="empty-msg">اختر الشهر ثم اضغط عرض لترى التحليلات</p>
                    </div>
                </div>\n`;
        lines.splice(startIdx, 0, zonesAnalyticsBlock);
        console.log("Added Zones Analytics Block.");
    }
} else {
    console.log("Could not find topProductsList");
}

fs.writeFileSync('admin.html', lines.join('\n'), 'utf8');
console.log("admin.html modification complete.");
