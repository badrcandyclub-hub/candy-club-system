const fs = require('fs');
let code = fs.readFileSync('Code.txt', 'utf8');

function replaceBlock(strStart, strEnd, replacement) {
    let i1 = code.indexOf(strStart);
    if (i1 === -1) { console.log('Start not found:', strStart); return; }
    let i2 = code.indexOf(strEnd, i1);
    if (i2 === -1) { console.log('End not found:', strEnd); return; }
    i2 += strEnd.length;
    
    code = code.substring(0, i1) + replacement + code.substring(i2);
    console.log('Replaced block ending with:', strEnd);
}

// 1. setupCandyClubUX
replaceBlock(
    'var attHeaders = ["اسم الموظف"',
    'attendanceSheet.setColumnWidth(7, 250);',
    'var attHeaders = ["اسم الموظف", "التاريخ", "وقت الحضور", "وقت الانصراف", "إجمالي الساعات", "الحالة", "حالة الطلب", "ملاحظات"];\\n' +
    '      attendanceSheet.getRange(1, 1, 1, attHeaders.length).setValues([attHeaders])\\n' +
    '           .setBackground("#00897b").setFontColor("white").setFontFamily(headerFont).setFontSize(14).setFontWeight("bold")\\n' +
    '           .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);\\n' +
    '      attendanceSheet.setRowHeight(1, 45);\\n' +
    '      attendanceSheet.setFrozenRows(1);\\n' +
    '      attendanceSheet.setColumnWidth(1, 180);\\n' +
    '      attendanceSheet.setColumnWidth(2, 140);\\n' +
    '      attendanceSheet.setColumnWidth(3, 120);\\n' +
    '      attendanceSheet.setColumnWidth(4, 120);\\n' +
    '      attendanceSheet.setColumnWidth(5, 120);\\n' +
    '      attendanceSheet.setColumnWidth(6, 140);\\n' +
    '      attendanceSheet.setColumnWidth(7, 140);\\n' +
    '      attendanceSheet.setColumnWidth(8, 250);'
);

// 2. getAttendance
replaceBlock(
    'status: (data[i][5] || "").toString(),',
    'notes: (data[i][6] || "").toString()',
    'status: (data[i][5] || "").toString(),\\n          requestStatus: (data[i][6] || "").toString(),\\n          notes: (data[i][7] || "").toString()'
);

replaceBlock(
    'if (rec.status === "إجازة مدفوعة" && rec.notes.indexOf("مرفوضة") === -1)',
    'if (rec.status === "إجازة بدون مرتب" && rec.notes.indexOf("مرفوضة") === -1) leaveBalance.unpaidUsed++;',
    'if (rec.status === "إجازة مدفوعة" && rec.requestStatus === "✅ تمت الموافقة") leaveBalance.paidUsed++;\\n' +
    '          if (rec.status === "إجازة بدون مرتب" && rec.requestStatus === "✅ تمت الموافقة") leaveBalance.unpaidUsed++;'
);

// 3. getPendingLeaves
replaceBlock(
    'var notes = (data[i][6] || "").toString();',
    'notes: notes',
    'var reqStatus = (data[i][6] || "").toString();\\n' +
    '        if (reqStatus.indexOf("بانتظار الموافقة") !== -1) {\\n' +
    '          var dateVal = "";\\n' +
    '          try { dateVal = Utilities.formatDate(new Date(data[i][1]), "Africa/Cairo", "yyyy-MM-dd"); } catch(ex) { dateVal = data[i][1].toString().replace("\\'",\\"\\"); }\\n' +
    '          pendingList.push({\\n' +
    '            employee: (data[i][0] || "").toString().trim(),\\n' +
    '            date: dateVal,\\n' +
    '            status: (data[i][5] || "").toString(),\\n' +
    '            requestStatus: reqStatus,\\n' +
    '            notes: (data[i][7] || "").toString()'
);

// 4. checkIn
replaceBlock(
    'attSheet.appendRow(["اسم الموظف", "التاريخ", "وقت الحضور", "وقت الانصراف", "إجمالي الساعات", "الحالة", "ملاحظات"]);',
    'attSheet.appendRow(["اسم الموظف", "التاريخ", "وقت الحضور", "وقت الانصراف", "إجمالي الساعات", "الحالة", "ملاحظات"]);',
    'attSheet.appendRow(["اسم الموظف", "التاريخ", "وقت الحضور", "وقت الانصراف", "إجمالي الساعات", "الحالة", "حالة الطلب", "ملاحظات"]);'
);

replaceBlock(
    'attSheet.appendRow([empName, "\\'" + attDate, attTime, "", "", "حاضر", ""]);',
    'attSheet.getRange(attSheet.getLastRow(), 1, 1, 7).setBackground("#e8f5e9");',
    'attSheet.appendRow([empName, "\\'" + attDate, attTime, "", "", "حاضر", "", ""]);\\n' +
    '      attSheet.getRange(attSheet.getLastRow(), 1, 1, 8).setBackground("#e8f5e9");'
);

// 5. requestLeave
replaceBlock(
    'attSheet.appendRow([empName, "\\'" + leaveDate, "-", "-", hoursCredit, leaveType, notes + " (بانتظار الموافقة)"]);',
    'attSheet.appendRow([empName, "\\'" + leaveDate, "-", "-", hoursCredit, leaveType, notes + " (بانتظار الموافقة)"]);',
    'attSheet.appendRow([empName, "\\'" + leaveDate, "-", "-", hoursCredit, leaveType, "بانتظار الموافقة", notes]);'
);

// 6. manageLeave
replaceBlock(
    'if (decision === "approve") {\\n            var notes = (attData[a][6] || "").toString().replace(" (بانتظار الموافقة)", "");',
    'attSheet.getRange(a + 1, 1, 1, 7).setBackground("#ffebee");\\n          }',
    'if (decision === "approve") {\\n' +
    '            attSheet.getRange(a + 1, 7).setValue("✅ تمت الموافقة");\\n' +
    '            attSheet.getRange(a + 1, 1, 1, 8).setBackground(attData[a][5] === "إجازة مدفوعة" ? "#e3f2fd" : "#fff3e0");\\n' +
    '          } else {\\n' +
    '            attSheet.getRange(a + 1, 5).setValue("0");\\n' +
    '            attSheet.getRange(a + 1, 6).setValue("إجازة مرفوضة");\\n' +
    '            attSheet.getRange(a + 1, 7).setValue("❌ مرفوضة");\\n' +
    '            attSheet.getRange(a + 1, 1, 1, 8).setBackground("#ffebee");\\n' +
    '          }'
);

// 7. addLeaveByAdmin
replaceBlock(
    'attSheet.appendRow([empName, "\\'" + leaveDate, "-", "-", hoursCredit, leaveType, notes + " ✅ تمت الموافقة"]);',
    'attSheet.getRange(attSheet.getLastRow(), 1, 1, 7).setBackground(leaveType === "إجازة مدفوعة" ? "#e3f2fd" : "#fff3e0");',
    'attSheet.appendRow([empName, "\\'" + leaveDate, "-", "-", hoursCredit, leaveType, "✅ تمت الموافقة", notes]);\\n' +
    '      attSheet.getRange(attSheet.getLastRow(), 1, 1, 8).setBackground(leaveType === "إجازة مدفوعة" ? "#e3f2fd" : "#fff3e0");'
);

fs.writeFileSync('Code.txt', code, 'utf8');
console.log('All HR Schema logic replaced correctly!');
