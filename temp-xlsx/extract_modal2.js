const fs = require('fs');
const html = fs.readFileSync('d:\\candy-club-system\\index.html', 'utf8');
const lines = html.split('\n');
let inModal = false;
let output = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('id="editAttendanceModal"')) inModal = true;
    if (inModal) {
        output.push(`Line ${i+1}: ${lines[i].trim()}`);
        if (lines[i].includes('</form>') || lines[i].includes('id="editAttSaveBtn"')) {
            output.push(`Line ${i+2}: ${lines[i+1].trim()}`);
            output.push(`Line ${i+3}: ${lines[i+2].trim()}`);
            break;
        }
    }
}
console.log(output.join('\n'));
