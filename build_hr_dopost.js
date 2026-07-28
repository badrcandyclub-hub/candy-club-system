const fs = require('fs');

let codeTxt = fs.readFileSync('Code.txt', 'utf8');

// The doPost actions need to go before the finally block
// The finally line is: "  } finally { lock.releaseLock(); }\r\n}\r\n"
// We need to insert our HR actions BEFORE that line

const lines = codeTxt.split('\n');
const finallyIdx = lines.findIndex(l => l.includes('finally'));

if (finallyIdx === -1) {
  console.log('ERROR: Could not find finally block');
  process.exit(1);
}

const hrActions = `
    // ============================================================
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
        try { existDate = Utilities.formatDate(new Date(attData[a][1]), "Africa/Cairo", "yyyy-MM-dd"); } catch(ex) { existDate = attData[a][1].toString().replace("'",""); }
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
          attSheet.getRange(a + 1, 4).setValue(outTime);
          
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
      var leaveType = e.parameter.leaveType || "إجازة مدفوعة";
      var notes = e.parameter.notes || "";
      
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
    // ⭐ HR: موافقة / رفض إجازة
    // ============================================================
    if (action === "manageLeave") {
      var attSheet = ss.getSheetByName("📅 سجل الحضور");
      if (!attSheet) return ContentService.createTextOutput(JSON.stringify({success: false, error: "شيت الحضور غير موجود"})).setMimeType(ContentService.MimeType.JSON);
      
      var empName = e.parameter.employeeName || "";
      var leaveDate = e.parameter.date || "";
      var decision = e.parameter.decision || "";
      
      var attData = attSheet.getDataRange().getValues();
      for (var a = 1; a < attData.length; a++) {
        var existDate = "";
        try { existDate = Utilities.formatDate(new Date(attData[a][1]), "Africa/Cairo", "yyyy-MM-dd"); } catch(ex) { existDate = attData[a][1].toString().replace("'",""); }
        if (attData[a][0].toString().trim() === empName && existDate === leaveDate) {
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

`;

// Insert before the finally line
const hrLines = hrActions.split('\n');
lines.splice(finallyIdx, 0, ...hrLines);

fs.writeFileSync('Code.txt', lines.join('\n'), 'utf8');

// Verify
let verify = fs.readFileSync('Code.txt', 'utf8');
console.log('✅ Code.txt updated');
console.log('Has checkIn:', verify.includes('action === "checkIn"'));
console.log('Has checkOut:', verify.includes('action === "checkOut"'));
console.log('Has requestLeave:', verify.includes('action === "requestLeave"'));
console.log('Has manageLeave:', verify.includes('action === "manageLeave"'));
console.log('Has addLeaveByAdmin:', verify.includes('action === "addLeaveByAdmin"'));
console.log('Has getAttendance:', verify.includes('action === "getAttendance"'));
