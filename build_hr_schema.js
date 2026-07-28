const fs = require('fs');

let code = fs.readFileSync('Code.txt', 'utf8');

// 1. setupCandyClubUX
const oldSetup = \`  if (attendanceSheet.getLastRow() === 0 || attendanceSheet.getRange(1, 1).getValue() === "") {
      var attHeaders = ["اسم الموظف", "التاريخ", "وقت الحضور", "وقت الانصراف", "إجمالي الساعات", "الحالة", "ملاحظات"];
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
      attendanceSheet.setColumnWidth(7, 250);
  }\`;
const newSetup = \`  var attHeaders = ["اسم الموظف", "التاريخ", "وقت الحضور", "وقت الانصراف", "إجمالي الساعات", "الحالة", "حالة الطلب", "ملاحظات"];
  
  // Always enforce the new 8-column header structure
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
  attendanceSheet.setColumnWidth(8, 250);\`;
  
code = code.replace(oldSetup, newSetup);
code = code.replace(oldSetup.replace(/\\r\\n/g, '\\n'), newSetup);

// 2. getAttendance loop
const oldAtt = \`          status: (data[i][5] || "").toString(),
          notes: (data[i][6] || "").toString()
        });
      }
    }
    
    // Calculate leave balance for the requested employee/month
    var leaveBalance = { paidUsed: 0, unpaidUsed: 0, paidMax: 4 };
    if (filterEmployee && filterMonth) {
      attendanceList.forEach(function(rec) {
        if (rec.date.substring(0, 7) === filterMonth && rec.employee === filterEmployee) {
          if (rec.status === "إجازة مدفوعة" && rec.notes.indexOf("مرفوضة") === -1) leaveBalance.paidUsed++;
          if (rec.status === "إجازة بدون مرتب" && rec.notes.indexOf("مرفوضة") === -1) leaveBalance.unpaidUsed++;
        }
      });
    }\`;
const newAtt = \`          status: (data[i][5] || "").toString(),
          requestStatus: (data[i][6] || "").toString(),
          notes: (data[i][7] || "").toString()
        });
      }
    }
    
    // Calculate leave balance for the requested employee/month
    var leaveBalance = { paidUsed: 0, unpaidUsed: 0, paidMax: 4 };
    if (filterEmployee && filterMonth) {
      attendanceList.forEach(function(rec) {
        if (rec.date.substring(0, 7) === filterMonth && rec.employee === filterEmployee) {
          if (rec.status === "إجازة مدفوعة" && rec.requestStatus === "✅ تمت الموافقة") leaveBalance.paidUsed++;
          if (rec.status === "إجازة بدون مرتب" && rec.requestStatus === "✅ تمت الموافقة") leaveBalance.unpaidUsed++;
        }
      });
    }\`;
code = code.replace(oldAtt, newAtt);
code = code.replace(oldAtt.replace(/\\r\\n/g, '\\n'), newAtt);

// 3. getPendingLeaves loop
const oldPend = \`      for (var i = 1; i < data.length; i++) {
        var notes = (data[i][6] || "").toString();
        if (notes.indexOf("بانتظار الموافقة") !== -1) {
          var dateVal = "";
          try { dateVal = Utilities.formatDate(new Date(data[i][1]), "Africa/Cairo", "yyyy-MM-dd"); } catch(ex) { dateVal = data[i][1].toString().replace("'",""); }
          pendingList.push({
            employee: (data[i][0] || "").toString().trim(),
            date: dateVal,
            status: (data[i][5] || "").toString(),
            notes: notes
          });
        }
      }\`;
const newPend = \`      for (var i = 1; i < data.length; i++) {
        var reqStatus = (data[i][6] || "").toString();
        if (reqStatus.indexOf("بانتظار الموافقة") !== -1) {
          var dateVal = "";
          try { dateVal = Utilities.formatDate(new Date(data[i][1]), "Africa/Cairo", "yyyy-MM-dd"); } catch(ex) { dateVal = data[i][1].toString().replace("'",""); }
          pendingList.push({
            employee: (data[i][0] || "").toString().trim(),
            date: dateVal,
            status: (data[i][5] || "").toString(),
            requestStatus: reqStatus,
            notes: (data[i][7] || "").toString()
          });
        }
      }\`;
code = code.replace(oldPend, newPend);
code = code.replace(oldPend.replace(/\\r\\n/g, '\\n'), newPend);

fs.writeFileSync('Code.txt', code, 'utf8');
console.log('✅ Updated Code.txt successfully.');
