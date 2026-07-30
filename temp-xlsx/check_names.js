const xlsx = require('xlsx');

const workbook = xlsx.readFile('d:\\candy-club-system\\ملف حضور شهر 7\\Combined_July.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, {header: 1, raw: false});

let names = new Set();
for (let i = 1; i < data.length; i++) {
    if (data[i][0]) names.add(data[i][0]);
}
console.log("Names in Combined_July.xlsx:", Array.from(names));
