const APP_URL = "https://script.google.com/macros/s/AKfycbwi24io7fKY7nizjIutPBpQvZHBx1O28_hu91QVcdF7PLFqTJ48dNJqFPdbqRuGDKI3Uw/exec";

async function testGet() {
    try {
        const response = await fetch(APP_URL + "?action=getAttendance");
        const json = await response.json();
        const data = json.data;
        const row = data.find(r => r[0] === 'بدر علاء' && r[1].includes('2026-07-02'));
        console.log("Row in DB:", row);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
testGet();
