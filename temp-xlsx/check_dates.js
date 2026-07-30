const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = 'd:\\candy-club-system\\ملف حضور شهر 7';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

files.forEach(file => {
    try {
        const workbook = xlsx.readFile(path.join(dir, file));
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet, {header: 1, raw: false});
        
        let firstDate = null;
        let lastDate = null;
        for(let i=0; i<data.length; i++) {
            if (data[i] && data[i][4]) {
                const val = data[i][4];
                if (val.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
                    if (!firstDate) firstDate = val;
                    lastDate = val;
                }
            }
        }
        console.log(`File: ${file} | First Date: ${firstDate} | Last Date: ${lastDate}`);
    } catch(e) {
        console.log(`File: ${file} | Error reading dates`);
    }
});
