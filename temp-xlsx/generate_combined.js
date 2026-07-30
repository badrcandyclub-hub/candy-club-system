const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = 'd:\\candy-club-system\\ملف حضور شهر 7';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

function convertTo12h(val) {
    if (!val || val.toString().trim() === '') return "-";
    let str = val.toString().trim();
    let h, m;
    if (str.includes(':')) {
        let parts = str.split(':');
        h = parseInt(parts[0]);
        m = parseInt(parts[1] || '0');
    } else {
        let num = parseFloat(val);
        if (isNaN(num)) return val;
        h = Math.floor(num);
        m = Math.round((num - h) * 100);
    }
    
    let suffix = 'AM';
    if (h >= 12) {
        if (h < 24) suffix = 'PM';
        if (h > 12) h -= 12;
    } else if (h === 0) {
        h = 12;
    }
    return `${h}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function formatHours(val) {
    if (!val || val.toString().trim() === '') return "-";
    let num = parseFloat(val);
    if (isNaN(num)) return val;
    let h = Math.floor(num);
    let m = Math.round((num - h) * 100);
    
    if (m === 0) return `${h} ساعة`;
    if (h === 0) return `${m} دقيقة`;
    return `${h} ساعة و ${m} دقيقة`;
}

let combinedData = [];
combinedData.push(['الموظف', 'التاريخ', 'الحضور', 'الانصراف', 'الساعات', 'الحالة', 'حالة الطلب', 'ملاحظات']);

files.forEach(file => {
    try {
        const workbook = xlsx.readFile(path.join(dir, file));
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet, {header: 1, raw: false});
        
        let empName = "";
        if (data[2] && data[2][4]) empName = data[2][4].toString().trim();
        else empName = file.replace('.xlsx', '').replace(/^\d+-/, '').trim();
        
        // --- NAME CORRECTIONS ---
        if (empName === "بدر") empName = "بدر علاء";
        if (empName === "اموله" || empName === "أمولة") empName = "امل";
        if (empName === "هدى") empName = "هدى";
        if (empName === "يارا") empName = "يارا";
        
        for (let i = 0; i < data.length; i++) {
            if (data[i] && data[i][4] && data[i][4].match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
                let dateStr = data[i][4]; 
                let parts = dateStr.split('/');
                let month = parts[0].padStart(2, '0');
                let day = parts[1].padStart(2, '0');
                let year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                let formattedDate = `${year}-${month}-${day}`;
                
                if (day === '31') continue; 
                
                let checkIn = data[i][6];
                let checkOut = data[i][7];
                let hours = data[i][8];
                let notes = data[i][9] || "";
                
                let outCheckIn = convertTo12h(checkIn);
                let outCheckOut = convertTo12h(checkOut);
                let outHours = formatHours(hours);
                
                let status = "حاضر";
                // Only put Approved for Leaves
                let reqStatus = "";
                
                if (outCheckIn === "-" && outCheckOut === "-") {
                    let hNum = parseFloat(hours) || 0;
                    if (hNum > 0) {
                        status = "إجازة مدفوعة";
                        reqStatus = "✅ تمت الموافقة";
                    } else {
                        status = "غائب";
                        outHours = "0 ساعة";
                    }
                }
                
                combinedData.push([empName, formattedDate, outCheckIn, outCheckOut, outHours, status, reqStatus, notes]);
            }
        }
    } catch(e) {
        console.error(`Error processing ${file}:`, e);
    }
});

const outWorkbook = xlsx.utils.book_new();
const outSheet = xlsx.utils.aoa_to_sheet(combinedData);
xlsx.utils.book_append_sheet(outWorkbook, outSheet, "سجل الحضور");
const outPath = 'd:\\candy-club-system\\ملف حضور شهر 7\\Combined_July.xlsx';
xlsx.writeFile(outWorkbook, outPath);

console.log(`Successfully created corrected combined file at: ${outPath}`);
