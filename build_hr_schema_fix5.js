const fs = require('fs');
let code = fs.readFileSync('Code.txt', 'utf8');

// fix 3: getPendingLeaves
let old3 = 'for (var i = 1; i < data.length; i++) {\\n        var notes = (data[i][6] || "").toString();\\n        if (notes.indexOf("بانتظار الموافقة") !== -1) {\\n          var dateVal = "";\\n          try { dateVal = Utilities.formatDate(new Date(data[i][1]), "Africa/Cairo", "yyyy-MM-dd"); } catch(ex) { dateVal = data[i][1].toString().replace("\\'",\\"\\"); }\\n          pendingList.push({\\n            employee: (data[i][0] || "").toString().trim(),\\n            date: dateVal,\\n            status: (data[i][5] || "").toString(),\\n            notes: notes\\n          });\\n        }\\n      }';
let new3 = 'for (var i = 1; i < data.length; i++) {\\n        var reqStatus = (data[i][6] || "").toString();\\n        if (reqStatus.indexOf("بانتظار الموافقة") !== -1) {\\n          var dateVal = "";\\n          try { dateVal = Utilities.formatDate(new Date(data[i][1]), "Africa/Cairo", "yyyy-MM-dd"); } catch(ex) { dateVal = data[i][1].toString().replace("\\'",\\"\\"); }\\n          pendingList.push({\\n            employee: (data[i][0] || "").toString().trim(),\\n            date: dateVal,\\n            status: (data[i][5] || "").toString(),\\n            requestStatus: reqStatus,\\n            notes: (data[i][7] || "").toString()\\n          });\\n        }\\n      }';

if(code.includes(old3)) {
    code = code.replace(old3, new3);
} else {
    old3 = old3.replace(/\\n/g, '\\r\\n');
    code = code.replace(old3, new3);
}

fs.writeFileSync('Code.txt', code, 'utf8');
console.log('Fixed getPendingLeaves');
