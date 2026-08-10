const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwi24io7fKY7nizjIutPBpQvZHBx1O28_hu91QVcdF7PLFqTJ48dNJqFPdbqRuGDKI3Uw/exec';
const supabaseUrl = 'https://thqccqwdwwxitvztmigt.supabase.co';
const supabaseKey = 'sb_publishable_BtFyuDBE_0PcF1z8JNskuA_-04mjcpc';

async function syncModerators() {
    console.log('Fetching from Google Sheets...');
    try {
        const res = await fetch(GOOGLE_SHEETS_URL + '?action=getSettings');
        const data = await res.json();
        
        console.log('First moderator item:', data.moderators[0]);

        const mapped = [];
        if (data.moderators && data.moderators.length > 0) {
            data.moderators.forEach(z => {
                const modName = typeof z === 'string' ? z : (z.name || z.moderator_name);
                if (modName) {
                    mapped.push({ name: modName });
                }
            });
        }
        
        console.log('Total valid mapped moderators:', mapped.length);
        if (mapped.length > 0) {
            const insertRes = await fetch(supabaseUrl + '/rest/v1/moderators', {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': 'Bearer ' + supabaseKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(mapped)
            });
            const insertText = await insertRes.text();
            console.log('Insert response:', insertRes.status, insertText);
        }
    } catch(e) {
        console.error('Script Error:', e);
    }
}

syncModerators();
