const fs = require('fs');
const lines = fs.readFileSync('app.js', 'utf8').split('\n');
const startIdx = 2186; // Based on previous bounds
let endIdx = startIdx;
while (endIdx < lines.length) {
    if (lines[endIdx].trim() === '}') {
        // Find the correct closing brace of buildMonthFilterOptions
        if (lines[endIdx-1].includes('sel.value = currentVal;')) {
            endIdx++; // include the brace
            break;
        }
    }
    endIdx++;
}

// Let's just do a reliable replace using start/end logic that searches for the function.
let funcStart = lines.findIndex(l => l.includes('function buildMonthFilterOptions()'));
let funcEnd = funcStart;
let braces = 0;
let foundBrace = false;
for (let i = funcStart; i < lines.length; i++) {
    if (lines[i].includes('{')) { braces++; foundBrace = true; }
    if (lines[i].includes('}')) braces--;
    if (foundBrace && braces === 0) {
        funcEnd = i;
        break;
    }
}

const newFunc = `function buildMonthFilterOptions() {
    let sel = document.getElementById('reportMonthFilter');
    if (!sel) return;
    let currentVal = sel.value;
    sel.innerHTML = '<option value="">اختر الشهر</option>';
    let arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    let now = new Date();
    // System started around May 2024
    let startYear = 2024;
    let startMonth = 4; // 0-indexed, so 4 is May
    
    let sortedMonths = [];
    let currYear = now.getFullYear();
    let currMonth = now.getMonth();
    
    while (currYear > startYear || (currYear === startYear && currMonth >= startMonth)) {
        let monthStr = currYear + '-' + String(currMonth + 1).padStart(2, '0');
        sortedMonths.push(monthStr);
        
        currMonth--;
        if (currMonth < 0) {
            currMonth = 11;
            currYear--;
        }
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

lines.splice(funcStart, funcEnd - funcStart + 1, newFunc);
fs.writeFileSync('app.js', lines.join('\n'), 'utf8');
console.log('Replaced buildMonthFilterOptions precisely.');
