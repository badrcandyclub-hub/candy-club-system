const APP_URL = "https://script.google.com/macros/s/AKfycbwi24io7fKY7nizjIutPBpQvZHBx1O28_hu91QVcdF7PLFqTJ48dNJqFPdbqRuGDKI3Uw/exec";

async function testEdit() {
    const params = new URLSearchParams();
    params.append('action', 'editAttendance');
    params.append('employeeName', 'بدر علاء');
    params.append('date', '2026-07-02');
    params.append('hoursOverride', '12:45');
    params.append('status', 'حاضر');
    params.append('checkIn', '3:00 AM');
    params.append('checkOut', '3:30 PM');

    try {
        const response = await fetch(APP_URL, {
            method: 'POST',
            body: params
        });
        const text = await response.text();
        console.log("Response text:", text);
    } catch (e) {
        console.error("Fetch error:", e.message);
    }
}

testEdit();
