const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Note: Replace this with the NEW deployment URL once the user deploys Code.txt!
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwi24io7fKY7nizjIutPBpQvZHBx1O28_hu91QVcdF7PLFqTJ48dNJqFPdbqRuGDKI3Uw/exec";

const dir = path.join(__dirname, '..');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

let allData = [];

// Name Mapping (to match system display names)
const nameMap = {
    'بدر': 'بدر علاء'
    // others seem to match exactly
};

files.forEach(file => {
    try {
        const filePath = path.join(dir, file);
        const workbook = xlsx.readFile(filePath, { cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Read raw objects to map easily by columns if it has headers, but since the headers are weird, we use header: 1
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: "yyyy-MM-dd" });
        
        let rawEmpName = file.replace('.xlsx', '').trim();
        let finalEmpName = nameMap[rawEmpName] || rawEmpName;
        
        data.forEach(row => {
            // Check if it's a valid data row (Date usually in row[4])
            // We assume valid row if Date (row[4]) has a "-" (like 2026-06-01) and Working Hours (row[8]) is present
            if (row.length > 5 && typeof row[4] === 'string' && row[4].includes('-')) {
                // Ensure date is properly formatted yyyy-mm-dd
                let dateStr = row[4];
                let checkIn = row[6] || "";
                let checkOut = row[7] || "";
                let hoursStr = row[8] || "";
                
                // Format hours nicely (e.g. "4:00" -> "4 ساعة" or "4:30" -> "4.5 ساعة")
                let finalHours = hoursStr;
                if (hoursStr.includes(':')) {
                   let parts = hoursStr.split(':');
                   let h = parseInt(parts[0]);
                   let m = parseInt(parts[1]);
                   if (m === 30) finalHours = h + '.5 ساعة';
                   else if (m === 0) finalHours = h + ' ساعة';
                   else finalHours = hoursStr + ' ساعة';
                } else if (hoursStr !== "") {
                   finalHours = hoursStr + ' ساعة';
                }

                let status = "حاضر";
                if (!checkIn && !checkOut) status = "غائب";

                allData.push({
                    empName: finalEmpName,
                    date: dateStr,
                    checkIn: checkIn,
                    checkOut: checkOut,
                    hours: finalHours,
                    status: status,
                    notes: "تم الرفع من الإكسيل (تاريخي)"
                });
            }
        });
    } catch (e) {
        console.error('Error processing', file, e.message);
    }
});

console.log(`Extracted ${allData.length} valid attendance records.`);

// POST to Google Sheets
async function uploadData() {
    console.log("Starting bulk upload...");
    try {
        const response = await fetch(GOOGLE_SHEETS_URL + "?action=bulkUploadAttendance", {
            method: 'POST',
            body: JSON.stringify(allData)
        });
        
        const result = await response.json();
        console.log("Upload Result:", result);
    } catch (err) {
        console.error("Upload failed:", err);
    }
}

uploadData();
