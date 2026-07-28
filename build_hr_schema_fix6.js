const fs = require('fs');

let lines = fs.readFileSync('Code.txt', 'utf8').split('\\n');

let start = -1;
let end = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('if (action === "getPendingLeaves") {')) {
        start = i;
    }
    if (start !== -1 && lines[i].includes('return ContentService.createTextOutput(JSON.stringify({ pending: pendingList }))')) {
        end = i;
        break;
    }
}

if (start !== -1 && end !== -1) {
    let newBlock = \`  if (action === "getPendingLeaves") {
    var attSheet = ss.getSheetByName("📅 سجل الحضور");
    var pendingList = [];
    if (attSheet && attSheet.getLastRow() > 1) {
      var data = attSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var reqStatus = (data[i][6] || "").toString();
        if (reqStatus.indexOf("بانتظار الموافقة") !== -1) {
          var dateVal = "";
          try { dateVal = Utilities.formatDate(new Date(data[i][1]), "Africa/Cairo", "yyyy-MM-dd"); } catch(ex) { dateVal = data[i][1].toString().replace("'", ""); }
          pendingList.push({
            employee: (data[i][0] || "").toString().trim(),
            date: dateVal,
            status: (data[i][5] || "").toString(),
            requestStatus: reqStatus,
            notes: (data[i][7] || "").toString()
          });
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ pending: pendingList })).setMimeType(ContentService.MimeType.JSON);\`.split('\\n');

    lines.splice(start, end - start + 1, ...newBlock);
    fs.writeFileSync('Code.txt', lines.join('\\n'), 'utf8');
    console.log('Fixed getPendingLeaves cleanly');
}
