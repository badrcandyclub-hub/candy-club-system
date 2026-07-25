const fs = require('fs');

let content = fs.readFileSync('Code.txt', 'utf8');

let search = `// ⭐ تحليل مناطق الشحن للشهر
var zone = (ordersData[j][5] || "").toString().trim(); // عمود 6 (المنطقة/المحافظة)
if (!zone && ordersData[j][6]) {
zone = ordersData[j][6].toString().split(/[-،,\n]/)[0].trim();
}
if (!zone) zone = "غير محددة";`;

let replace = `// ⭐ تحليل مناطق الشحن للشهر
var zone = (ordersData[j][5] || "").toString().trim(); // عمود 6 (المنطقة/المحافظة)
var orderType = (ordersData[j][9] || "").toString().trim();

if (orderType === "استلام من الفرع" || orderType === "استلام من الفرع ") {
    zone = "استلام من الفرع";
} else {
    if (!zone && ordersData[j][6]) {
        zone = ordersData[j][6].toString().split(/[-،,\n]/)[0].trim();
    }
    if (!zone) zone = "غير محددة";
}`;

content = content.replace(search, replace);
fs.writeFileSync('Code.txt', content, 'utf8');

// Also fix the 26 day string in app.js
let appContent = fs.readFileSync('app.js', 'utf8');
appContent = appContent.replace('26 يوم', '30 يوم');
fs.writeFileSync('app.js', appContent, 'utf8');

console.log("Updated Code.txt and app.js");
