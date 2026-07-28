const fs = require('fs');

let lines = fs.readFileSync('Code.txt', 'utf8').split('\\n');

let start = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('var attendanceSheet = ss.getSheetByName(')) {
        start = i;
        break;
    }
}

if (start !== -1) {
    let end = -1;
    for (let i = start; i < lines.length; i++) {
        if (lines[i].includes('var ordersSheet = ss.getSheetByName(')) {
            end = i - 3;
            break;
        }
    }
    
    if (end !== -1) {
        let newBlock = \`  var attendanceSheet = ss.getSheetByName("📅 سجل الحضور");
  if (!attendanceSheet) {
      attendanceSheet = ss.insertSheet("📅 سجل الحضور");
  }
  
  var attHeaders = ["اسم الموظف", "التاريخ", "وقت الحضور", "وقت الانصراف", "إجمالي الساعات", "الحالة", "حالة الطلب", "ملاحظات"];
  
  attendanceSheet.getRange(1, 1, 1, attHeaders.length).setValues([attHeaders])
       .setBackground("#00897b").setFontColor("white").setFontFamily(headerFont).setFontSize(14).setFontWeight("bold")
       .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
       
  attendanceSheet.setRowHeight(1, 45);
  attendanceSheet.setFrozenRows(1);
  attendanceSheet.setColumnWidth(1, 180);
  attendanceSheet.setColumnWidth(2, 140);
  attendanceSheet.setColumnWidth(3, 120);
  attendanceSheet.setColumnWidth(4, 120);
  attendanceSheet.setColumnWidth(5, 120);
  attendanceSheet.setColumnWidth(6, 140);
  attendanceSheet.setColumnWidth(7, 140);
  attendanceSheet.setColumnWidth(8, 250);\`.split('\\n');
  
        lines.splice(start, end - start + 1, ...newBlock);
        fs.writeFileSync('Code.txt', lines.join('\\n'), 'utf8');
        console.log('Fixed lines ' + start + ' to ' + end);
    }
}
