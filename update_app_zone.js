const fs = require('fs');
let lines = fs.readFileSync('app.js', 'utf8').split('\n');

let platformSearchIdx = lines.findIndex(l => l.includes("// أداء المنصات - بالترتيب المحدد"));
if (platformSearchIdx !== -1) {
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
    lines.splice(platformSearchIdx, 0, zoneAnalyticsCode);
    console.log("Added Zone Analytics render");
    fs.writeFileSync('app.js', lines.join('\n'), 'utf8');
} else {
    console.log("Could not find the target string.");
}
