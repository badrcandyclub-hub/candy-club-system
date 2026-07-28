const fs = require('fs');

// ============================================================
// PHASE 1: Update Code.txt (Backend)
// ============================================================
let codeTxt = fs.readFileSync('Code.txt', 'utf8');

// 1A. Add attendance sheet creation in setupCandyClubUX()
const setupInsertPoint = '  calculateFinancials();';
const attendanceSheetCode = `  // ============================================================
  // 11. شيت الحضور والانصراف (نظام HR)
  // ============================================================
  var attendanceSheet = ss.getSheetByName("📅 سجل الحضور");
  if (!attendanceSheet) {
      attendanceSheet = ss.insertSheet("📅 سجل الحضور");
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
  }

  calculateFinancials();`;

codeTxt = codeTxt.replace(setupInsertPoint, attendanceSheetCode);

// 1B. Add HR doPost actions before the finally block
const doPostInsertPoint = `  } finally { lock.releaseLock(); }
}`;

const hrDoPostCode = `    // ============================================================
    // ⭐ HR: تسجيل حضور
    // ============================================================
    if (action === "checkIn") {
      var attSheet = ss.getSheetByName("📅 سجل الحضور");
      if (!attSheet) {
        attSheet = ss.insertSheet("📅 سجل الحضور");
        attSheet.appendRow(["اسم الموظف", "التاريخ", "وقت الحضور", "وقت الانصراف", "إجمالي الساعات", "الحالة", "ملاحظات"]);
      }
      var empName = e.parameter.employeeName || "";
      var attDate = e.parameter.date || Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd");
      var attTime = Utilities.formatDate(new Date(), "Africa/Cairo", "hh:mm a");
      
      // Check if already checked in today
      var attData = attSheet.getDataRange().getValues();
      for (var a = 1; a < attData.length; a++) {
        var existDate = "";
        try { existDate = Utilities.formatDate(new Date(attData[a][1]), "Africa/Cairo", "yyyy-MM-dd"); } catch(ex) { existDate = attData[a][1].toString(); }
        if (attData[a][0].toString().trim() === empName && existDate === attDate && attData[a][5] === "حاضر") {
          return ContentService.createTextOutput(JSON.stringify({success: false, error: "أنت مسجل حضور بالفعل اليوم"})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      attSheet.appendRow([empName, "'" + attDate, attTime, "", "", "حاضر", ""]);
      return ContentService.createTextOutput(JSON.stringify({success: true, message: "تم تسجيل الحضور بنجاح", time: attTime})).setMimeType(ContentService.MimeType.JSON);
    }

    // ============================================================
    // ⭐ HR: تسجيل انصراف
    // ============================================================
    if (action === "checkOut") {
      var attSheet = ss.getSheetByName("📅 سجل الحضور");
      if (!attSheet) return ContentService.createTextOutput(JSON.stringify({success: false, error: "شيت الحضور غير موجود"})).setMimeType(ContentService.MimeType.JSON);
      
      var empName = e.parameter.employeeName || "";
      var attDate = e.parameter.date || Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd");
      var outTime = Utilities.formatDate(new Date(), "Africa/Cairo", "hh:mm a");
      
      var attData = attSheet.getDataRange().getValues();
      for (var a = 1; a < attData.length; a++) {
        var existDate = "";
        try { existDate = Utilities.formatDate(new Date(attData[a][1]), "Africa/Cairo", "yyyy-MM-dd"); } catch(ex) { existDate = attData[a][1].toString().replace("'",""); }
        if (attData[a][0].toString().trim() === empName && existDate === attDate && attData[a][5] === "حاضر" && !attData[a][3]) {
          attSheet.getRange(a + 1, 4).setValue(outTime); // وقت الانصراف
          
          // حساب الساعات
          var inTime = attData[a][2].toString();
          var inDate = new Date("2026-01-01 " + inTime);
          var outDate = new Date("2026-01-01 " + outTime);
          var diffMs = outDate - inDate;
          if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
          var hours = (diffMs / (1000 * 60 * 60)).toFixed(1);
          
          attSheet.getRange(a + 1, 5).setValue(hours + " ساعة");
          return ContentService.createTextOutput(JSON.stringify({success: true, message: "تم تسجيل الانصراف بنجاح", time: outTime, hours: hours})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({success: false, error: "لم يتم العثور على سجل حضور مفتوح لهذا اليوم"})).setMimeType(ContentService.MimeType.JSON);
    }

    // ============================================================
    // ⭐ HR: طلب إجازة
    // ============================================================
    if (action === "requestLeave") {
      var attSheet = ss.getSheetByName("📅 سجل الحضور");
      if (!attSheet) return ContentService.createTextOutput(JSON.stringify({success: false, error: "شيت الحضور غير موجود"})).setMimeType(ContentService.MimeType.JSON);
      
      var empName = e.parameter.employeeName || "";
      var leaveDate = e.parameter.date || "";
      var leaveType = e.parameter.leaveType || "إجازة مدفوعة"; // or "إجازة بدون مرتب"
      var notes = e.parameter.notes || "";
      
      // Check if already has a record for this date
      var attData = attSheet.getDataRange().getValues();
      for (var a = 1; a < attData.length; a++) {
        var existDate = "";
        try { existDate = Utilities.formatDate(new Date(attData[a][1]), "Africa/Cairo", "yyyy-MM-dd"); } catch(ex) { existDate = attData[a][1].toString().replace("'",""); }
        if (attData[a][0].toString().trim() === empName && existDate === leaveDate) {
          return ContentService.createTextOutput(JSON.stringify({success: false, error: "يوجد سجل لهذا اليوم بالفعل"})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      var hoursCredit = leaveType === "إجازة مدفوعة" ? "8 ساعة" : "0";
      attSheet.appendRow([empName, "'" + leaveDate, "-", "-", hoursCredit, leaveType, notes + " (بانتظار الموافقة)"]);
      return ContentService.createTextOutput(JSON.stringify({success: true, message: "تم إرسال طلب الإجازة"})).setMimeType(ContentService.MimeType.JSON);
    }

    // ============================================================
    // ⭐ HR: موافقة / رفض إجازة (المدير)
    // ============================================================
    if (action === "manageLeave") {
      var attSheet = ss.getSheetByName("📅 سجل الحضور");
      if (!attSheet) return ContentService.createTextOutput(JSON.stringify({success: false, error: "شيت الحضور غير موجود"})).setMimeType(ContentService.MimeType.JSON);
      
      var empName = e.parameter.employeeName || "";
      var leaveDate = e.parameter.date || "";
      var decision = e.parameter.decision || ""; // "approve" or "reject"
      
      var attData = attSheet.getDataRange().getValues();
      for (var a = 1; a < attData.length; a++) {
        var existDate = "";
        try { existDate = Utilities.formatDate(new Date(attData[a][1]), "Africa/Cairo", "yyyy-MM-dd"); } catch(ex) { existDate = attData[a][1].toString().replace("'",""); }
        if (attData[a][0].toString().trim() === empName && existDate === leaveDate) {
          var currentStatus = attData[a][5].toString();
          if (currentStatus.indexOf("إجازة") === -1) {
            return ContentService.createTextOutput(JSON.stringify({success: false, error: "هذا السجل ليس طلب إجازة"})).setMimeType(ContentService.MimeType.JSON);
          }
          if (decision === "approve") {
            var notes = (attData[a][6] || "").toString().replace(" (بانتظار الموافقة)", "");
            attSheet.getRange(a + 1, 7).setValue(notes + " ✅ تمت الموافقة");
          } else {
            attSheet.getRange(a + 1, 5).setValue("0");
            attSheet.getRange(a + 1, 6).setValue("إجازة مرفوضة");
            var notes = (attData[a][6] || "").toString().replace(" (بانتظار الموافقة)", "");
            attSheet.getRange(a + 1, 7).setValue(notes + " ❌ مرفوضة");
          }
          return ContentService.createTextOutput(JSON.stringify({success: true, message: decision === "approve" ? "تمت الموافقة" : "تم الرفض"})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({success: false, error: "لم يتم العثور على السجل"})).setMimeType(ContentService.MimeType.JSON);
    }

    // ============================================================
    // ⭐ HR: إضافة إجازة مباشرة من المدير
    // ============================================================
    if (action === "addLeaveByAdmin") {
      var attSheet = ss.getSheetByName("📅 سجل الحضور");
      if (!attSheet) return ContentService.createTextOutput(JSON.stringify({success: false, error: "شيت الحضور غير موجود"})).setMimeType(ContentService.MimeType.JSON);
      
      var empName = e.parameter.employeeName || "";
      var leaveDate = e.parameter.date || "";
      var leaveType = e.parameter.leaveType || "إجازة مدفوعة";
      var notes = e.parameter.notes || "أضيفت بواسطة المدير";
      
      var hoursCredit = leaveType === "إجازة مدفوعة" ? "8 ساعة" : "0";
      attSheet.appendRow([empName, "'" + leaveDate, "-", "-", hoursCredit, leaveType, notes + " ✅ تمت الموافقة"]);
      return ContentService.createTextOutput(JSON.stringify({success: true, message: "تمت إضافة الإجازة"})).setMimeType(ContentService.MimeType.JSON);
    }

  } finally { lock.releaseLock(); }
}`;

codeTxt = codeTxt.replace(doPostInsertPoint, hrDoPostCode);

// 1C. Add getAttendance endpoint in doGet()
const doGetInsertPoint = '  // ⭐ V16: جلب قائمة المستخدمين (للمدير)';
const hrDoGetCode = `  // ============================================================
  // ⭐ HR: جلب بيانات الحضور والانصراف
  // ============================================================
  if (action === "getAttendance") {
    var attSheet = ss.getSheetByName("📅 سجل الحضور");
    var attendanceList = [];
    var filterEmployee = e.parameter.employee || "";
    var filterMonth = e.parameter.month || "";
    
    if (attSheet && attSheet.getLastRow() > 1) {
      var data = attSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var empName = (data[i][0] || "").toString().trim();
        var dateVal = "";
        try { dateVal = Utilities.formatDate(new Date(data[i][1]), "Africa/Cairo", "yyyy-MM-dd"); } catch(ex) { dateVal = data[i][1].toString().replace("'",""); }
        
        // Apply filters
        if (filterEmployee && empName !== filterEmployee) continue;
        if (filterMonth && dateVal.substring(0, 7) !== filterMonth) continue;
        
        attendanceList.push({
          employee: empName,
          date: dateVal,
          checkIn: (data[i][2] || "").toString(),
          checkOut: (data[i][3] || "").toString(),
          hours: (data[i][4] || "").toString(),
          status: (data[i][5] || "").toString(),
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
    }
    
    return ContentService.createTextOutput(JSON.stringify({ attendance: attendanceList, leaveBalance: leaveBalance })).setMimeType(ContentService.MimeType.JSON);
  }

  // ⭐ V16: جلب قائمة المستخدمين (للمدير)`;

codeTxt = codeTxt.replace(doGetInsertPoint, hrDoGetCode);

fs.writeFileSync('Code.txt', codeTxt, 'utf8');
console.log('✅ Code.txt updated successfully with HR backend');

// Verify
let verifyCode = fs.readFileSync('Code.txt', 'utf8');
console.log('Has checkIn:', verifyCode.includes('action === "checkIn"'));
console.log('Has checkOut:', verifyCode.includes('action === "checkOut"'));
console.log('Has requestLeave:', verifyCode.includes('action === "requestLeave"'));
console.log('Has manageLeave:', verifyCode.includes('action === "manageLeave"'));
console.log('Has getAttendance:', verifyCode.includes('action === "getAttendance"'));
console.log('Has attendance sheet setup:', verifyCode.includes('📅 سجل الحضور'));
