const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = path.join(__dirname, '..');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

let allData = [];

files.forEach(file => {
    try {
        const filePath = path.join(dir, file);
        const workbook = xlsx.readFile(filePath, { cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON array of arrays to see raw rows
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: "yyyy-mm-dd HH:mm:ss" });
        
        // The file name is Arabic, maybe corrupted by terminal but node handles it well.
        const empName = file.replace('.xlsx', '');
        
        data.forEach(row => {
            if (row.length > 0) {
                allData.push({ empName, row });
            }
        });
    } catch (e) {
        console.error('Error processing', file, e.message);
    }
});

fs.writeFileSync(path.join(__dirname, 'output_formatted.json'), JSON.stringify(allData, null, 2));
