const fs = require('fs');

const appJs = fs.readFileSync('d:\\candy-club-system\\app.js', 'utf8');
const lines = appJs.split('\n');

let inFunc = false;
let captured = [];
for(let i=0; i<lines.length; i++) {
    if (lines[i].includes('function saveAdminAttendanceEdit') || lines[i].includes('function openAdminAttendanceEdit')) {
        inFunc = true;
    }
    if (inFunc) {
        captured.push(lines[i]);
        if (lines[i].trim() === '}' && captured.length > 10) {
            inFunc = false;
            console.log(captured.join('\n'));
            captured = [];
        }
    }
}
