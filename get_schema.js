const https = require('https');

https.get('https://thqccqwdwwxitvztmigt.supabase.co/rest/v1/', {
  headers: { 'apikey': 'sb_publishable_BtFyuDBE_0PcF1z8JNskuA_-04mjcpc' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log(JSON.stringify(json.definitions.settings_shipping, null, 2));
  });
});
