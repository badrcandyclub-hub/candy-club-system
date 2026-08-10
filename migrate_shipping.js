const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwi24io7fKY7nizjIutPBpQvZHBx1O28_hu91QVcdF7PLFqTJ48dNJqFPdbqRuGDKI3Uw/exec';
const supabaseUrl = 'https://thqccqwdwwxitvztmigt.supabase.co';
const supabaseKey = 'sb_publishable_BtFyuDBE_0PcF1z8JNskuA_-04mjcpc';

async function syncShipping() {
    console.log('Fetching from Google Sheets...');
    try {
        const res = await fetch(GOOGLE_SHEETS_URL + '?action=getSettings');
        const data = await res.json();
        
        console.log('First alex item:', data.alex[0]);
        console.log('First govs item:', data.govs[0]);

        const mapped = [];
        if (data.alex && data.alex.length > 0) {
            data.alex.forEach(z => {
                mapped.push({
                    zone_name: z.name || z.zone || z.zone_name,
                    price: z.price,
                    delivery_type: z.type || z.delivery_type || 'normal',
                    duration: z.duration || '',
                    zone_type: 'alex'
                });
            });
        }
        
        if (data.govs && data.govs.length > 0) {
            data.govs.forEach(z => {
                mapped.push({
                    zone_name: z.name || z.zone || z.zone_name,
                    price: z.price,
                    delivery_type: z.type || z.delivery_type || 'normal',
                    duration: z.duration || '',
                    zone_type: 'govs'
                });
            });
        }
        
        // Filter out bad entries
        const validMapped = mapped.filter(z => !!z.zone_name);

        console.log('Total valid mapped zones:', validMapped.length);
        if (validMapped.length > 0) {
            const insertRes = await fetch(supabaseUrl + '/rest/v1/settings_shipping', {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': 'Bearer ' + supabaseKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(validMapped)
            });
            const insertText = await insertRes.text();
            console.log('Insert response:', insertRes.status, insertText);
        }
    } catch(e) {
        console.error('Script Error:', e);
    }
}

syncShipping();
