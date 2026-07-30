const fs = require('fs');

const appJs = fs.readFileSync('d:\\candy-club-system\\app.js', 'utf8');
const lines = appJs.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('editAttendance') || lines[i].includes('saveAdminAttendanceEdit')) {
        console.log(`app.js Line ${i+1}: ${lines[i].trim()}`);
    }
}
