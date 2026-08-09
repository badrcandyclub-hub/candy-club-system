const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://thqccqwdwwxitvztmigt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BtFyuDBE_0PcF1z8JNskuA_-04mjcpc';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
    const res = await supabase.from('out_of_stock').select('*');
    console.log(`out_of_stock count: ${res.data ? res.data.length : 0}`);
    if (res.data && res.data.length > 0) {
        console.log('Sample row:', res.data[0]);
    }
}
test();
