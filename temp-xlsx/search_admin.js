const fs = require('fs');
const html = fs.readFileSync('d:\\candy-club-system\\admin.html', 'utf8'); // Wait, let's try reading as utf16le just in case? Or utf8?
// Often it's utf8 but BOM causes issues for ripgrep.
let lines = html.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('السجل الشهري') || lines[i].includes('monthly-records')) {
        console.log(`Line ${i+1}: ${lines[i].trim()}`);
    }
}
