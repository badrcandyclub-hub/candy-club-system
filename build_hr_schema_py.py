import io
with io.open("Code.txt", "r", encoding="utf-8") as f:
    code = f.read()

# 1. setupCandyClubUX
old1 = """  if (attendanceSheet.getLastRow() === 0 || attendanceSheet.getRange(1, 1).getValue() === "") {
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
  }"""
new1 = """  var attHeaders = ["اسم الموظف", "التاريخ", "وقت الحضور", "وقت الانصراف", "إجمالي الساعات", "الحالة", "حالة الطلب", "ملاحظات"];
  
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
  attendanceSheet.setColumnWidth(8, 250);"""

# 2. getAttendance loop
old2 = """          status: (data[i][5] || "").toString(),
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
    }"""
new2 = """          status: (data[i][5] || "").toString(),
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
    }"""

# 3. getPendingLeaves
old3 = """      for (var i = 1; i < data.length; i++) {
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
      }"""
new3 = """      for (var i = 1; i < data.length; i++) {
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
      }"""

# 4. checkIn
old4 = """    if (action === "checkIn") {
      var attSheet = ss.getSheetByName("📅 سجل الحضور");
      if (!attSheet) {
        attSheet = ss.insertSheet("📅 سجل الحضور");
        attSheet.appendRow(["اسم الموظف", "التاريخ", "وقت الحضور", "وقت الانصراف", "إجمالي الساعات", "الحالة", "ملاحظات"]);
      }"""
new4 = """    if (action === "checkIn") {
      var attSheet = ss.getSheetByName("📅 سجل الحضور");
      if (!attSheet) {
        attSheet = ss.insertSheet("📅 سجل الحضور");
        attSheet.appendRow(["اسم الموظف", "التاريخ", "وقت الحضور", "وقت الانصراف", "إجمالي الساعات", "الحالة", "حالة الطلب", "ملاحظات"]);
      }"""

# 4.1 checkIn 2
old41 = """      attSheet.appendRow([empName, "'" + attDate, attTime, "", "", "حاضر", ""]);
      attSheet.getRange(attSheet.getLastRow(), 1, 1, 7).setBackground("#e8f5e9");"""
new41 = """      attSheet.appendRow([empName, "'" + attDate, attTime, "", "", "حاضر", "", ""]);
      attSheet.getRange(attSheet.getLastRow(), 1, 1, 8).setBackground("#e8f5e9");"""

# 5. requestLeave
old5 = """      var hoursCredit = leaveType === "إجازة مدفوعة" ? "8 ساعة" : "0";
      attSheet.appendRow([empName, "'" + leaveDate, "-", "-", hoursCredit, leaveType, notes + " (بانتظار الموافقة)"]);"""
new5 = """      var hoursCredit = leaveType === "إجازة مدفوعة" ? "8 ساعة" : "0";
      attSheet.appendRow([empName, "'" + leaveDate, "-", "-", hoursCredit, leaveType, "بانتظار الموافقة", notes]);"""

# 6. manageLeave
old6 = """        if (attData[a][0].toString().trim() === empName && existDate === leaveDate) {
          if (decision === "approve") {
            var notes = (attData[a][6] || "").toString().replace(" (بانتظار الموافقة)", "");
            attSheet.getRange(a + 1, 7).setValue(notes + " ✅ تمت الموافقة");
            attSheet.getRange(a + 1, 1, 1, 7).setBackground(attData[a][5] === "إجازة مدفوعة" ? "#e3f2fd" : "#fff3e0");
          } else {
            attSheet.getRange(a + 1, 5).setValue("0");
            attSheet.getRange(a + 1, 6).setValue("إجازة مرفوضة");
            var notes = (attData[a][6] || "").toString().replace(" (بانتظار الموافقة)", "");
            attSheet.getRange(a + 1, 7).setValue(notes + " ❌ مرفوضة");
            attSheet.getRange(a + 1, 1, 1, 7).setBackground("#ffebee");
          }
          return ContentService.createTextOutput(JSON.stringify({success: true, message: decision === "approve" ? "تمت الموافقة" : "تم الرفض"})).setMimeType(ContentService.MimeType.JSON);
        }"""
new6 = """        if (attData[a][0].toString().trim() === empName && existDate === leaveDate) {
          if (decision === "approve") {
            attSheet.getRange(a + 1, 7).setValue("✅ تمت الموافقة");
            attSheet.getRange(a + 1, 1, 1, 8).setBackground(attData[a][5] === "إجازة مدفوعة" ? "#e3f2fd" : "#fff3e0");
          } else {
            attSheet.getRange(a + 1, 5).setValue("0");
            attSheet.getRange(a + 1, 6).setValue("إجازة مرفوضة");
            attSheet.getRange(a + 1, 7).setValue("❌ مرفوضة");
            attSheet.getRange(a + 1, 1, 1, 8).setBackground("#ffebee");
          }
          return ContentService.createTextOutput(JSON.stringify({success: true, message: decision === "approve" ? "تمت الموافقة" : "تم الرفض"})).setMimeType(ContentService.MimeType.JSON);
        }"""

# 7. addLeaveByAdmin
old7 = """      var hoursCredit = leaveType === "إجازة مدفوعة" ? "8 ساعة" : "0";
      attSheet.appendRow([empName, "'" + leaveDate, "-", "-", hoursCredit, leaveType, notes + " ✅ تمت الموافقة"]);
      attSheet.getRange(attSheet.getLastRow(), 1, 1, 7).setBackground(leaveType === "إجازة مدفوعة" ? "#e3f2fd" : "#fff3e0");"""
new7 = """      var hoursCredit = leaveType === "إجازة مدفوعة" ? "8 ساعة" : "0";
      attSheet.appendRow([empName, "'" + leaveDate, "-", "-", hoursCredit, leaveType, "✅ تمت الموافقة", notes]);
      attSheet.getRange(attSheet.getLastRow(), 1, 1, 8).setBackground(leaveType === "إجازة مدفوعة" ? "#e3f2fd" : "#fff3e0");"""


replacements = [
    (old1, new1), (old2, new2), (old3, new3), (old4, new4), (old41, new41), (old5, new5), (old6, new6), (old7, new7)
]

for idx, (o, n) in enumerate(replacements):
    if o in code:
        code = code.replace(o, n)
        print("Success chunk", idx+1)
    else:
        # try normalizing line endings
        o_crlf = o.replace("\\n", "\\r\\n")
        if o_crlf in code:
            code = code.replace(o_crlf, n)
            print("Success chunk (CRLF)", idx+1)
        else:
            print("Failed chunk", idx+1)

with io.open("Code.txt", "w", encoding="utf-8") as f:
    f.write(code)
