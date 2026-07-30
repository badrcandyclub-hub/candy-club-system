const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = 'd:\\candy-club-system\\ملف حضور شهر 7';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

files.forEach(file => {
    const workbook = xlsx.readFile(path.join(dir, file));
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, {header: 1, raw: false});
    
    console.log(`\n--- ${file} ---`);
    let offDays = [];
    for (let i = 0; i < data.length; i++) {
        if (data[i] && data[i][4] && data[i][4].match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
            let checkIn = data[i][6];
            let checkOut = data[i][7];
            let hours = data[i][8];
            if (!checkIn && !checkOut && hours) {
                offDays.push(`${data[i][3]} ${data[i][4]} (Hours: ${hours})`);
            }
        }
    }
    console.log("Possible Paid Leaves (No punch, has hours):", offDays.join(' | '));
});
