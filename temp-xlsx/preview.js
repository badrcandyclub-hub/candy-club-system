const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = 'd:\\candy-club-system\\ملف حضور';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
if (files.length > 0) {
    const workbook = xlsx.readFile(path.join(dir, files[0]));
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, {header: 1, raw: false});
    console.log("File:", files[0]);
    for (let i = 0; i < Math.min(data.length, 25); i++) {
        console.log(`Row ${i}:`, data[i]);
    }
}
