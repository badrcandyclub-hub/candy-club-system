// ==========================================
// 🚀 نظام كاندي كلوب المطور V4 - (تنسيق العواميد والمسافات)
// ==========================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🍬 إدارة كاندي كلوب')
      .addItem('🔄 تحديث وبناء النظام (تنسيق واسع)', 'setupCandyClubUX')
      .addToUi();
}

// 1. وظيفة تأسيس الشيت بتنسيق العواميد الجديد (مسافات واسعة)
function setupCandyClubUX() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ordersSheet = ss.getSheetByName("📝 الطلبات") || ss.getSheets()[0];
  ordersSheet.setName("📝 الطلبات");
  
  var headers = [
    "رقم الطلب", "التاريخ", "المنصة", "اسم العميل", "المحافظة", "العنوان بالتفصيل", 
    "رقم التواصل", "رقم آخر", "نوع التوصيل", "طريقة الدفع", "اسم المندوب", "موعد التسليم", 
    "تفاصيل المنتجات", "إجمالي المنتجات", "الخصم", "سعر الشحن", "الإجمالي النهائي", "حالة الطلب", "ملاحظات"
  ];
  
  ordersSheet.getRange(1, 1, 1, headers.length).setValues([headers])
             .setBackground("#FF1493").setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center");
  ordersSheet.setFrozenRows(1);
  
  var settingsSheet = ss.getSheetByName("⚙️ الإعدادات والشحن") || ss.insertSheet("⚙️ الإعدادات والشحن");
  settingsSheet.clear(); // تنظيف القديم لتطبيق التنسيق الجديد
  
  // -- تنسيق العواميد (بين كل قائمة والتانية عمودين فاضيين) --
  
  // ⚓ الإسكندرية (عواميد A, B, C, D)
  settingsSheet.getRange("A1:D1").setValues([["⚓ مناطق الإسكندرية", "سعر الشحن", "نوع التوصيل", "مدة التوصيل"]]).setBackground("#1565C0").setFontColor("white");
  
  // 🚚 المحافظات (عواميد G, H, I, J) - [E, F فاضيين]
  settingsSheet.getRange("G1:J1").setValues([["🚚 المحافظات", "سعر الشحن", "نوع التوصيل", "مدة التوصيل"]]).setBackground("#2E7D32").setFontColor("white");
  
  // 🛵 المناديب (عواميد M, N) - [K, L فاضيين]
  settingsSheet.getRange("M1:N1").setValues([["🛵 اسم المندوب", "📱 رقم الموبايل"]]).setBackground("#FF8C00").setFontColor("white");

  // تظبيط عرض العواميد الفاضية
  settingsSheet.setColumnWidth(5, 30); settingsSheet.setColumnWidth(6, 30); // الفاصل الأول
  settingsSheet.setColumnWidth(11, 30); settingsSheet.setColumnWidth(12, 30); // الفاصل الثاني

  SpreadsheetApp.getUi().alert("✅ تم إعادة بناء الشيت بالتنسيق الواسع (عمودين فاصل)!");
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ordersSheet = ss.getSheetByName("📝 الطلبات");
  var settingsSheet = ss.getSheetByName("⚙️ الإعدادات والشحن");
  
  if (e.parameter.action === 'checkPhone') {
    var searchPhone = e.parameter.phone.trim();
    if (ordersSheet) {
      var lastRow = ordersSheet.getLastRow();
      if (lastRow > 1) {
        var data = ordersSheet.getRange(2, 4, lastRow - 1, 4).getValues(); 
        for (var i = data.length - 1; i >= 0; i--) {
          var rowPhone = data[i][3].toString().replace(/[^0-9]/g, ''); 
          if (rowPhone.includes(searchPhone) || searchPhone.includes(rowPhone)) {
            return ContentService.createTextOutput(JSON.stringify({ found: true, name: data[i][0], address: data[i][2] })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ found: false })).setMimeType(ContentService.MimeType.JSON);
  }

  var response = { alex: [], govs: [], couriers: [], products: [], todayOrders: 0, completedOrders: 0, todaySales: 0, history: [] };

  if (settingsSheet) {
    var sData = settingsSheet.getDataRange().getValues();
    for (var i = 1; i < sData.length; i++) {
      // قراءة الإسكندرية (A, B, C, D)
      if (sData[i][0]) response.alex.push({ name: sData[i][0], price: sData[i][1], type: sData[i][2], duration: sData[i][3] });
      // قراءة المحافظات (G, H, I, J)
      if (sData[i][6]) response.govs.push({ name: sData[i][6], price: sData[i][7], type: sData[i][8], duration: sData[i][9] });
      // قراءة المناديب (M, N)
      if (sData[i][12]) response.couriers.push({ name: sData[i][12], phone: sData[i][13].toString() });
    }
  }

  if (ordersSheet) {
    var lastRow = ordersSheet.getLastRow();
    if (lastRow > 1) {
      var todayDate = Utilities.formatDate(new Date(), "GMT+2", "yyyy-MM-dd");
      var ordersData = ordersSheet.getRange(2, 1, lastRow - 1, 18).getValues();
      var uniqueProducts = {};

      for (var j = 0; j < ordersData.length; j++) {
        var orderDate = ordersData[j][1] ? ordersData[j][1].toString().trim() : ""; 
        var status = ordersData[j][17];   
        var finalTotal = parseFloat(ordersData[j][16]) || 0;

        if (orderDate === todayDate) { response.todayOrders++; response.todaySales += finalTotal; }
        if (status === "تم التوصيل") { response.completedOrders++; }
        
        response.history.push({ id: ordersData[j][0], date: orderDate, name: ordersData[j][3], phone: ordersData[j][6].toString().replace(/'/g, ''), total: finalTotal, status: status });

        var pStr = ordersData[j][12];
        if (pStr) {
          var pParts = pStr.split('\n');
          pParts.forEach(p => {
            var match = p.match(/(.+)\s*-/);
            if (match) uniqueProducts[match[1].trim()] = 1;
          });
        }
      }
      response.history = response.history.reverse().slice(0, 100);
      for (var pName in uniqueProducts) response.products.push({ name: pName });
    }
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e.parameter.action || "addOrder";

    if (action === "addShipping") {
      var sSheet = ss.getSheetByName("⚙️ الإعدادات والشحن");
      // تحديد العمود حسب النوع (Alex = 1, Govs = 7)
      var col = e.parameter.zoneType === 'alex' ? 1 : 7;
      var last = sSheet.getRange(1, col, 100, 1).getValues().filter(String).length + 1;
      sSheet.getRange(last, col, 1, 4).setValues([[e.parameter.name, e.parameter.price, e.parameter.deliveryType, e.parameter.duration]]);
      return ContentService.createTextOutput("success");
    } 
    
    else if (action === "addDriver") {
      var sSheet = ss.getSheetByName("⚙️ الإعدادات والشحن");
      // المناديب في عمود M (رقم 13)
      var last = sSheet.getRange(1, 13, 100, 1).getValues().filter(String).length + 1;
      sSheet.getRange(last, 13, 1, 2).setValues([[e.parameter.name, "'" + e.parameter.phone]]);
      return ContentService.createTextOutput("success");
    } 
    
    else {
      var sheet = ss.getSheetByName("📝 الطلبات");
      var lastRow = sheet.getLastRow();
      var id = "CANDY-" + (100001 + (lastRow > 1 ? lastRow - 1 : 0));
      var globalDate = Utilities.formatDate(new Date(), "GMT+2", "yyyy-MM-dd");
      var p1 = e.parameter.phone1 ? "'" + e.parameter.phone1 : "";
      var p2 = e.parameter.phone2 ? "'" + e.parameter.phone2 : "";
      var rowData = [id, globalDate, e.parameter.platform, e.parameter.customerName, e.parameter.governorate, e.parameter.address, p1, p2, e.parameter.orderType || "توصيل", e.parameter.paymentMethod, "", e.parameter.expectedDate, e.parameter.products, e.parameter.productsTotal, e.parameter.discount, e.parameter.shippingCost, e.parameter.finalTotal, "قيد التجهيز", e.parameter.notes];
      sheet.appendRow(rowData);
      return ContentService.createTextOutput("success");
    }
  } finally { lock.releaseLock(); }
}
