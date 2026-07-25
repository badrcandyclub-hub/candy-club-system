const fs = require('fs');
let lines = fs.readFileSync('app.js', 'utf8').split('\n');

// 1. Remove the fallback logic for zones and add the "old server" warning message.
let zoneIdx = lines.findIndex(l => l.includes('let zones = data.monthZonesStats || [];'));
if (zoneIdx !== -1) {
    let endIdx = zoneIdx;
    while (!lines[endIdx].includes('zonesEl.innerHTML = \'<p class="empty-msg">لا توجد بيانات شحن في هذا الشهر.</p>\';')) {
        endIdx++;
    }
    
    let newLogic = `                let zones = data.monthZonesStats;
                
                // If server is old and doesn't return monthZonesStats
                if (!zones) {
                    zonesEl.innerHTML = '<p class="empty-msg" style="color:var(--danger);"><i class="fa-solid fa-circle-exclamation"></i> يرجى تحديث كود الإكسيل وعمل "New Deployment" لظهور التحليلات بشكل صحيح.</p>';
                } else if (zones.length === 0) {
                    zonesEl.innerHTML = '<p class="empty-msg">لا توجد بيانات شحن في هذا الشهر.</p>';`;
    
    lines.splice(zoneIdx, endIdx - zoneIdx + 1, newLogic);
}

// 2. Fix the 30 days calculation
let daysIdx = lines.findIndex(l => l.includes('let estimatedDaysInMonth = 26; // استبعاد 4 أيام جمعة'));
if (daysIdx !== -1) {
    lines[daysIdx] = lines[daysIdx].replace('26;', '30; // 30 يوم عمل بدون إجازات');
    lines[daysIdx+11] = lines[daysIdx+11].replace('26 يوم', '30 يوم');
}

fs.writeFileSync('app.js', lines.join('\n'), 'utf8');
console.log('Update successful');
