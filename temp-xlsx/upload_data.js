const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwi24io7fKY7nizjIutPBpQvZHBx1O28_hu91QVcdF7PLFqTJ48dNJqFPdbqRuGDKI3Uw/exec";

const dir = path.join(__dirname, '..');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

let allData = [];
const nameMap = { 'بدر': 'بدر علاء' };

files.forEach(file => {
    try {
        const filePath = path.join(dir, file);
        const workbook = xlsx.readFile(filePath, { cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });
        let rawEmpName = file.replace('.xlsx', '').trim();
        let finalEmpName = nameMap[rawEmpName] || rawEmpName;
        
        data.forEach(row => {
            if (row.length > 5 && typeof row[4] === 'string' && row[4].includes('/')) {
                let dateParts = row[4].split('/');
                if (dateParts.length === 3) {
                    let m = dateParts[0].padStart(2, '0');
                    let d = dateParts[1].padStart(2, '0');
                    let y = dateParts[2].length === 2 ? '20' + dateParts[2] : dateParts[2];
                    let dateStr = `${y}-${m}-${d}`;
                    
                    let checkIn = row[6] || "";
                    let checkOut = row[7] || "";
                    let hoursStr = row[8] || "";
                    
                    let finalHours = hoursStr;
                    if (hoursStr.includes(':')) {
                       let parts = hoursStr.split(':');
                       let h = parseInt(parts[0]);
                       let min = parseInt(parts[1]);
                       if (min === 30) finalHours = h + '.5 ساعة';
                       else if (min === 0) finalHours = h + ' ساعة';
                       else finalHours = hoursStr + ' ساعة';
                    } else if (hoursStr !== "") {
                       finalHours = hoursStr + ' ساعة';
                    }

                    let status = "حاضر";
                    if (!checkIn && !checkOut) {
                        // If no checkin/checkout but hours are recorded (e.g. 8 hours), it's Paid Leave
                        if (hoursStr && hoursStr !== "0" && hoursStr !== "0:00") {
                            status = "إجازة مدفوعة";
                        } else {
                            status = "غائب";
                        }
                    }

                    allData.push({
                        empName: finalEmpName,
                        date: dateStr,
                        checkIn: checkIn,
                        checkOut: checkOut,
                        hours: finalHours,
                        status: status,
                        notes: "تم الرفع من الإكسيل"
                    });
                }
            }
        });
    } catch (e) {
        console.error('Error processing', file, e.message);
    }
});

console.log(`Extracted ${allData.length} valid attendance records.`);

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
