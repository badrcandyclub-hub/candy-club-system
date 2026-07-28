const fs = require('fs');
let code = fs.readFileSync('Code.txt', 'utf8');

// 2. getAttendance loop
let oldAtt = "          status: (data[i][5] || \\"\\").toString(),\\n" +
"          notes: (data[i][6] || \\"\\").toString()\\n" +
"        });\\n" +
"      }\\n" +
"    }\\n" +
"    \\n" +
"    // Calculate leave balance for the requested employee/month\\n" +
"    var leaveBalance = { paidUsed: 0, unpaidUsed: 0, paidMax: 4 };\\n" +
"    if (filterEmployee && filterMonth) {\\n" +
"      attendanceList.forEach(function(rec) {\\n" +
"        if (rec.date.substring(0, 7) === filterMonth && rec.employee === filterEmployee) {\\n" +
"          if (rec.status === \\"إجازة مدفوعة\\" && rec.notes.indexOf(\\"مرفوضة\\") === -1) leaveBalance.paidUsed++;\\n" +
"          if (rec.status === \\"إجازة بدون مرتب\\" && rec.notes.indexOf(\\"مرفوضة\\") === -1) leaveBalance.unpaidUsed++;\\n" +
"        }\\n" +
"      });\\n" +
"    }";

let newAtt = "          status: (data[i][5] || \\"\\").toString(),\\n" +
"          requestStatus: (data[i][6] || \\"\\").toString(),\\n" +
"          notes: (data[i][7] || \\"\\").toString()\\n" +
"        });\\n" +
"      }\\n" +
"    }\\n" +
"    \\n" +
"    // Calculate leave balance for the requested employee/month\\n" +
"    var leaveBalance = { paidUsed: 0, unpaidUsed: 0, paidMax: 4 };\\n" +
"    if (filterEmployee && filterMonth) {\\n" +
"      attendanceList.forEach(function(rec) {\\n" +
"        if (rec.date.substring(0, 7) === filterMonth && rec.employee === filterEmployee) {\\n" +
"          if (rec.status === \\"إجازة مدفوعة\\" && rec.requestStatus === \\"✅ تمت الموافقة\\") leaveBalance.paidUsed++;\\n" +
"          if (rec.status === \\"إجازة بدون مرتب\\" && rec.requestStatus === \\"✅ تمت الموافقة\\") leaveBalance.unpaidUsed++;\\n" +
"        }\\n" +
"      });\\n" +
"    }";

code = code.replace(oldAtt, newAtt);
code = code.replace(oldAtt.replace(/\\n/g, '\\r\\n'), newAtt);

// 3. getPendingLeaves loop
let oldPend = "      for (var i = 1; i < data.length; i++) {\\n" +
"        var notes = (data[i][6] || \\"\\").toString();\\n" +
"        if (notes.indexOf(\\"بانتظار الموافقة\\") !== -1) {\\n" +
"          var dateVal = \\"\\";\\n" +
"          try { dateVal = Utilities.formatDate(new Date(data[i][1]), \\"Africa/Cairo\\", \\"yyyy-MM-dd\\"); } catch(ex) { dateVal = data[i][1].toString().replace(\\"'\\",\\"\\"); }\\n" +
"          pendingList.push({\\n" +
"            employee: (data[i][0] || \\"\\").toString().trim(),\\n" +
"            date: dateVal,\\n" +
"            status: (data[i][5] || \\"\\").toString(),\\n" +
"            notes: notes\\n" +
"          });\\n" +
"        }\\n" +
"      }";
let newPend = "      for (var i = 1; i < data.length; i++) {\\n" +
"        var reqStatus = (data[i][6] || \\"\\").toString();\\n" +
"        if (reqStatus.indexOf(\\"بانتظار الموافقة\\") !== -1) {\\n" +
"          var dateVal = \\"\\";\\n" +
"          try { dateVal = Utilities.formatDate(new Date(data[i][1]), \\"Africa/Cairo\\", \\"yyyy-MM-dd\\"); } catch(ex) { dateVal = data[i][1].toString().replace(\\"'\\",\\"\\"); }\\n" +
"          pendingList.push({\\n" +
"            employee: (data[i][0] || \\"\\").toString().trim(),\\n" +
"            date: dateVal,\\n" +
"            status: (data[i][5] || \\"\\").toString(),\\n" +
"            requestStatus: reqStatus,\\n" +
"            notes: (data[i][7] || \\"\\").toString()\\n" +
"          });\\n" +
"        }\\n" +
"      }";

code = code.replace(oldPend, newPend);
code = code.replace(oldPend.replace(/\\n/g, '\\r\\n'), newPend);

fs.writeFileSync('Code.txt', code, 'utf8');
console.log('Fixed Code.txt logic successfully');
