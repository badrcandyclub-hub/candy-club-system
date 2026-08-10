// =======================================================
// Automatic Cloud Sync Script (Firebase Realtime DB <-> Supabase)
// Runs standalone without any browser requirement.
// =======================================================

const SUPABASE_URL = 'https://thqccqwdwwxitvztmigt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BtFyuDBE_0PcF1z8JNskuA_-04mjcpc';
const FIREBASE_URL = 'https://candyclubsync-default-rtdb.firebaseio.com/products.json';

const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
};

async function fetchAllSupabaseExpiries() {
    let allData = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
        const url = `${SUPABASE_URL}/rest/v1/expiries?select=*&limit=${limit}&offset=${offset}`;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`Failed to fetch expiries: ${res.statusText}`);
        const data = await res.json();
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < limit) break;
        offset += limit;
    }
    return allData;
}

async function updateExpiryQty(id, newQty) {
    const url = `${SUPABASE_URL}/rest/v1/expiries?id=eq.${id}`;
    const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ qty: newQty })
    });
    if (!res.ok) console.error(`Failed to update expiry id ${id}: ${res.statusText}`);
}

async function deleteZeroQtyExpiries() {
    const url = `${SUPABASE_URL}/rest/v1/expiries?qty=eq.0`;
    const res = await fetch(url, {
        method: 'DELETE',
        headers
    });
    if (!res.ok) console.error(`Failed to delete zero qty expiries: ${res.statusText}`);
}

async function updateGlobalSyncTime() {
    const now = Date.now();
    const nowStr = now.toString();
    
    // Check if _SYNC_TIMER_ exists
    const checkUrl = `${SUPABASE_URL}/rest/v1/settings_shipping?zone_name=eq._SYNC_TIMER_&zone_type=eq.system&select=id`;
    const checkRes = await fetch(checkUrl, { headers });
    const data = await checkRes.json();

    if (data && data.length > 0) {
        const updateUrl = `${SUPABASE_URL}/rest/v1/settings_shipping?id=eq.${data[0].id}`;
        await fetch(updateUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ price: now, delivery_type: nowStr })
        });
    } else {
        const insertUrl = `${SUPABASE_URL}/rest/v1/settings_shipping`;
        await fetch(insertUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                zone_name: '_SYNC_TIMER_',
                zone_type: 'system',
                price: now,
                delivery_type: nowStr
            })
        });
    }
    return now;
}

async function runAutoSync() {
    console.log(`[${new Date().toISOString()}] Starting automatic inventory sync...`);
    
    try {
        // 1. Fetch Firebase products
        const fbResp = await fetch(FIREBASE_URL);
        if (!fbResp.ok) throw new Error(`Firebase fetch failed: ${fbResp.statusText}`);
        const fbDataRaw = await fbResp.json();
        const fbItems = Array.isArray(fbDataRaw) ? fbDataRaw : Object.values(fbDataRaw || {});
        
        const fbMap = {};
        fbItems.forEach(item => {
            if (item && item.Barcode) {
                fbMap[String(item.Barcode).trim()] = parseFloat(item.Stock) || 0;
            }
        });
        console.log(`Fetched ${Object.keys(fbMap).length} items from Firebase.`);

        // 2. Fetch Supabase expiries
        const gsData = await fetchAllSupabaseExpiries();
        console.log(`Fetched ${gsData.length} expiry records from Supabase.`);

        if (!gsData || gsData.length === 0) {
            console.log('No expiries found in Supabase.');
            await updateGlobalSyncTime();
            return;
        }

        // 3. Aggregate by barcode
        const gsMap = {};
        gsData.forEach(row => {
            const bcode = String(row.barcode || '').trim();
            if (!bcode) return;
            const qty = parseFloat(row.qty) || 0;
            if (!gsMap[bcode]) gsMap[bcode] = { totalQty: 0, rows: [] };
            gsMap[bcode].totalQty += qty;
            gsMap[bcode].rows.push({ id: row.id, qty: qty, expDate: row.expiry_date || '', name: row.product_name });
        });

        // 4. Compare and adjust
        let changesCount = 0;
        for (const bcode in gsMap) {
            const gsTotal = gsMap[bcode].totalQty;
            const fbTotal = fbMap.hasOwnProperty(bcode) ? fbMap[bcode] : null;
            if (fbTotal === null) continue;
            const diff = gsTotal - fbTotal;

            if (diff > 0) {
                // Sold - deduct using FIFO (nearest expiry date first)
                let qtyToDeduct = diff;
                const rows = gsMap[bcode].rows.sort((a, b) => new Date(a.expDate || '9999-12-31') - new Date(b.expDate || '9999-12-31'));
                for (const r of rows) {
                    if (qtyToDeduct <= 0) break;
                    if (r.qty > 0) {
                        const newQty = Math.max(0, r.qty - qtyToDeduct);
                        qtyToDeduct -= r.qty;
                        await updateExpiryQty(r.id, newQty);
                        changesCount++;
                    }
                }
            } else if (diff < 0) {
                // Returned - add to nearest expiry
                const rows = gsMap[bcode].rows.sort((a, b) => new Date(a.expDate || '9999-12-31') - new Date(b.expDate || '9999-12-31'));
                if (rows.length > 0) {
                    const newQty = rows[0].qty + Math.abs(diff);
                    await updateExpiryQty(rows[0].id, newQty);
                    changesCount++;
                }
            }
        }

        // 5. Delete empty rows (qty = 0)
        await deleteZeroQtyExpiries();

        // 6. Update sync timestamp in DB
        const newSyncTs = await updateGlobalSyncTime();

        console.log(`[${new Date().toISOString()}] Sync complete. Updated ${changesCount} items. New sync timestamp: ${newSyncTs}`);

    } catch (err) {
        console.error("Auto Sync Error:", err);
        process.exit(1);
    }
}

runAutoSync();
