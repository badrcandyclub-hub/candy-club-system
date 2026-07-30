const xlsx = require('xlsx');
const workbook = xlsx.readFile('d:\\candy-club-system\\ملف حضور شهر 7\\Combined_July.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, {header: 1, raw: false});
console.log("Headers:", data[0]);
for (let i = 1; i <= 5; i++) {
    console.log(`Row ${i}:`, data[i]);
}
