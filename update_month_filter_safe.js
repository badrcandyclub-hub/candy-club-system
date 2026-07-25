const fs = require('fs');
const lines = fs.readFileSync('app.js', 'utf8').split('\n');
const startIdx = 2186;
const endIdx = 2225;

const newFunc = `function buildMonthFilterOptions() {
    let sel = document.getElementById('reportMonthFilter');
    if (!sel) return;
    let currentVal = sel.value;
    sel.innerHTML = '<option value="">اختر الشهر</option>';
    let arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    let now = new Date();
    let sortedMonths = [];
    for (let i = 0; i < 24; i++) {
        let d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        let monthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        sortedMonths.push(monthStr);
    }

    sortedMonths.forEach(monthVal => {
        let [yr, mo] = monthVal.split('-');
        let moIdx = parseInt(mo) - 1;
        if (moIdx < 0 || moIdx > 11) return;
        let label = arabicMonths[moIdx] + ' ' + yr;
        let opt = document.createElement('option');
        opt.value = monthVal;
        if (monthVal === (now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'))) {
            label += ' (الحالي)';
        }
        opt.innerText = label;
        sel.appendChild(opt);
    });

    if (currentVal && sortedMonths.includes(currentVal)) {
        sel.value = currentVal;
    }
}`;

lines.splice(startIdx, endIdx - startIdx + 1, newFunc);
fs.writeFileSync('app.js', lines.join('\n'), 'utf8');
console.log('Replaced buildMonthFilterOptions');
