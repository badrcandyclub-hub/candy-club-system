const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://thqccqwdwwxitvztmigt.supabase.co';
const supabaseKey = 'sb_publishable_BtFyuDBE_0PcF1z8JNskuA_-04mjcpc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    let empName = "بدر علاء";
    let { data: existOut, error } = await supabase.from('attendance')
        .select('*')
        .eq('employee_name', empName)
        .eq('status', 'حاضر')
        .order('id', { ascending: false })
        .limit(1);
    
    console.log(JSON.stringify(existOut, null, 2));
    console.log("Error:", error);
}
test();
