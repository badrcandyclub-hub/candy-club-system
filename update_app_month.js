const fs = require('fs');
let lines = fs.readFileSync('app.js', 'utf8').split('\n');

// 1. Remove the fallback logic for zones and add the "old server" warning message.
let zoneIdx = lines.findIndex(l => l.includes('let zones = data.monthZonesStats || [];'));
if (zoneIdx !== -1) {
    // Replace the fallback block with the new logic
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

// 3. Add catch block to fetchMonthReport
let fetchIdx = lines.findIndex(l => l.includes('fetch(`${GOOGLE_SHEETS_URL}?date=${fetchDate}`)'));
if (fetchIdx !== -1) {
    // Find the end of the fetch chain
    let braceCount = 0;
    let foundStart = false;
    let endFetchIdx = fetchIdx;
    
    for (let i = fetchIdx; i < lines.length; i++) {
        if (lines[i].includes('{')) {
            braceCount += (lines[i].match(/\{/g) || []).length;
            foundStart = true;
        }
        if (lines[i].includes('}')) {
            braceCount -= (lines[i].match(/\}/g) || []).length;
        }
        
        if (foundStart && braceCount === 0 && lines[i].includes('})')) {
            endFetchIdx = i;
            break;
        }
    }
    
    if (endFetchIdx !== fetchIdx) {
        // Change }); to })
        lines[endFetchIdx] = lines[endFetchIdx].replace('});', '})');
        // Add catch block
        lines.splice(endFetchIdx + 1, 0, `            .catch(err => {
                console.error("fetchMonthReport error:", err);
                let statusEl = document.getElementById('reportFilterStatus');
                let topEl = document.getElementById('topProductsList');
                let pltEl = document.getElementById('platformStatsList');
                if (statusEl) statusEl.innerHTML = '<i class=\\'fa-solid fa-triangle-exclamation\\'></i> حدث خطأ أثناء تحميل التقرير، يرجى المحاولة مرة أخرى.';
                if (topEl) topEl.innerHTML = '<p class="empty-msg">فشل التحميل.</p>';
                if (pltEl) pltEl.innerHTML = '<p class="empty-msg">فشل التحميل.</p>';
            });`);
    }
}

fs.writeFileSync('app.js', lines.join('\n'), 'utf8');
console.log('Update successful');
