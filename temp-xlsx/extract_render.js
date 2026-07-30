const fs = require('fs');
const s = fs.readFileSync('d:\\candy-club-system\\app.js', 'utf8');
const lines = s.split('\n');

let inFunc = false;
let out = [];
for(let i=0; i<lines.length; i++) {
    if (lines[i].includes('function renderAttendanceTable(')) {
        inFunc = true;
    }
    if (inFunc) {
        out.push(lines[i]);
        if (lines[i].trim() === '}' && out.length > 30) {
            console.log(out.join('\n'));
            break;
        }
    }
}
