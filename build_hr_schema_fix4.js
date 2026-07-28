const fs = require('fs');
let code = fs.readFileSync('Code.txt', 'utf8');

// fix 1
let old1 = 'status: (data[i][5] || "").toString(),\\n          notes: (data[i][6] || "").toString()';
let new1 = 'status: (data[i][5] || "").toString(),\\n          requestStatus: (data[i][6] || "").toString(),\\n          notes: (data[i][7] || "").toString()';

if(code.includes(old1)) {
    code = code.replace(old1, new1);
} else {
    old1 = old1.replace(/\\n/g, '\\r\\n');
    code = code.replace(old1, new1);
}

// fix 2
let old2 = 'if (rec.status === "إجازة مدفوعة" && rec.notes.indexOf("مرفوضة") === -1) leaveBalance.paidUsed++;\\n          if (rec.status === "إجازة بدون مرتب" && rec.notes.indexOf("مرفوضة") === -1) leaveBalance.unpaidUsed++;';
let new2 = 'if (rec.status === "إجازة مدفوعة" && rec.requestStatus === "✅ تمت الموافقة") leaveBalance.paidUsed++;\\n          if (rec.status === "إجازة بدون مرتب" && rec.requestStatus === "✅ تمت الموافقة") leaveBalance.unpaidUsed++;';

if(code.includes(old2)) {
    code = code.replace(old2, new2);
} else {
    old2 = old2.replace(/\\n/g, '\\r\\n');
    code = code.replace(old2, new2);
}

fs.writeFileSync('Code.txt', code, 'utf8');
console.log('Fixed getAttendance');
