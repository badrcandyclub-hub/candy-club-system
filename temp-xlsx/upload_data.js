const xlsx = require('xlsx');

async function uploadData() {
    const workbook = xlsx.readFile('d:\\candy-club-system\\ملف حضور شهر 7\\Combined_July.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, {header: 1, raw: false});
    
    // Convert to objects
    let records = [];
    for (let i = 1; i < data.length; i++) {
        let row = data[i];
        if (!row || row.length === 0) continue;
        records.push({
            empName: row[0],
            date: row[1],
            checkIn: row[2],
            checkOut: row[3],
            hours: row[4],
            status: row[5],
            reqStatus: row[6],
            notes: row[7] || ""
        });
    }

    console.log(`Ready to upload ${records.length} records...`);

    // The endpoint expects stringified records, maybe in chunks if it's too large
    // Google Apps Script has a payload limit, so let's chunk it by 50 records
    const chunkSize = 50;
    const APP_URL = "https://script.google.com/macros/s/AKfycbwi24io7fKY7nizjIutPBpQvZHBx1O28_hu91QVcdF7PLFqTJ48dNJqFPdbqRuGDKI3Uw/exec"; 

    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        console.log(`Uploading chunk ${i / chunkSize + 1} of ${Math.ceil(records.length / chunkSize)}...`);
        
        const params = new URLSearchParams();
        params.append('action', 'addBulkAttendance');
        params.append('records', JSON.stringify(chunk));

        try {
            const response = await fetch(APP_URL, {
                method: 'POST',
                body: params
            });
            const result = await response.json();
            if (result.success) {
                console.log(`Chunk ${i / chunkSize + 1} uploaded successfully!`);
            } else {
                console.error(`Error from server for chunk ${i / chunkSize + 1}:`, result.error);
            }
        } catch (e) {
            console.error(`Failed to upload chunk ${i / chunkSize + 1}:`, e.message);
        }
    }
    console.log("Upload process completed.");
}

uploadData();
