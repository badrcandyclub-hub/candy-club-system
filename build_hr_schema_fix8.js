const fs = require('fs');
let lines = fs.readFileSync('Code.txt', 'utf8').split('\\n');

let start1 = -1;
let end1 = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('hours: (data[i][4] || "").toString(),')) {
        start1 = i + 1;
    }
    if (start1 !== -1 && lines[i].includes('});')) {
        end1 = i - 1;
        break;
    }
}
if (start1 !== -1) {
    let block1 = [
        '          status: (data[i][5] || "").toString(),',
        '          requestStatus: (data[i][6] || "").toString(),',
        '          notes: (data[i][7] || "").toString()'
    ];
    lines.splice(start1, end1 - start1 + 1, ...block1);
    console.log('Fixed block 1');
}

let start2 = -1;
let end2 = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('attendanceList.forEach(function(rec) {')) {
        start2 = i + 2;
    }
    if (start2 !== -1 && lines[i].includes('}')) {
        // Just look for the next two lines
        end2 = start2 + 1;
        break;
    }
}

if (start2 !== -1) {
    let block2 = [
        '          if (rec.status === "إجازة مدفوعة" && rec.requestStatus === "✅ تمت الموافقة") leaveBalance.paidUsed++;',
        '          if (rec.status === "إجازة بدون مرتب" && rec.requestStatus === "✅ تمت الموافقة") leaveBalance.unpaidUsed++;'
    ];
    lines.splice(start2, end2 - start2 + 1, ...block2);
    console.log('Fixed block 2');
}

fs.writeFileSync('Code.txt', lines.join('\\n'), 'utf8');
