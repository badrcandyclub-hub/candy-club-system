const fs = require('fs');
let code = fs.readFileSync('Code.txt', 'utf8');

// The missing setup lines:
let brokenSetup = "      attendanceSheet.setFrozenRows(1);\\n" +
"      attendanceSheet.setColumnWidth(1, 180);\\n" +
"      attendanceSheet.setColumnWidth(2, 140);\\n" +
"      attendanceSheet.setColumnWidth(3, 120);\\n" +
"      attendanceSheet.setColumnWidth(4, 120);\\n" +
"      attendanceSheet.setColumnWidth(5, 120);\\n" +
"      attendanceSheet.setColumnWidth(6, 140);\\n" +
"      attendanceSheet.setColumnWidth(7, 250);\\n" +
"  }";

let fixedSetup = "  var attHeaders = [\\'اسم الموظف\\', \\'التاريخ\\', \\'وقت الحضور\\', \\'وقت الانصراف\\', \\'إجمالي الساعات\\', \\'الحالة\\', \\'حالة الطلب\\', \\'ملاحظات\\'];\\n" +
"  attendanceSheet.getRange(1, 1, 1, attHeaders.length).setValues([attHeaders]).setBackground(\\'#00897b\\').setFontColor(\\'white\\').setFontFamily(headerFont).setFontSize(14).setFontWeight(\\'bold\\').setHorizontalAlignment(\\'center\\').setVerticalAlignment(\\'middle\\').setWrap(true);\\n" +
"  attendanceSheet.setRowHeight(1, 45);\\n" +
"  attendanceSheet.setFrozenRows(1);\\n" +
"  attendanceSheet.setColumnWidth(1, 180);\\n" +
"  attendanceSheet.setColumnWidth(2, 140);\\n" +
"  attendanceSheet.setColumnWidth(3, 120);\\n" +
"  attendanceSheet.setColumnWidth(4, 120);\\n" +
"  attendanceSheet.setColumnWidth(5, 120);\\n" +
"  attendanceSheet.setColumnWidth(6, 140);\\n" +
"  attendanceSheet.setColumnWidth(7, 140);\\n" +
"  attendanceSheet.setColumnWidth(8, 250);";

code = code.replace(brokenSetup, fixedSetup);
code = code.replace(brokenSetup.replace(/\\n/g, '\\r\\n'), fixedSetup);

fs.writeFileSync('Code.txt', code, 'utf8');
console.log('Fixed Code.txt successfully');
