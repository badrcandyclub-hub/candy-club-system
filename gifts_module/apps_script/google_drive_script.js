/**
 * Candy Club Gifts Module - Google Apps Script Webhook
 * كود وسيط مجاني لرفع صور البوكيهات مباشرة إلى مجلد Google Drive
 * 
 * خطوات الاستخدام:
 * 1. افتح https://script.google.com بحساب Google الخاص بك
 * 2. أنشئ مشروعا جديدا والصق هذا الكود كاملا
 * 3. استبدل FOLDER_ID بمعرف المجلد المستهدف من جوجل درايف
 * 4. اضغط Deploy ثم New Deployment
 * 5. اختر النوع Web App
 * 6. اضبط Who has access على Anyone
 * 7. انسخ رابط الويب الناتج وضعه في متغير GOOGLE_DRIVE_WEBAPP_URL في gifts.js
 */

var FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var base64Data = data.image; // Base64 data string
    var fileName = data.filename || ("bouquet_" + new Date().getTime() + ".jpg");
    
    // إزالة ترويسة data:image/jpeg;base64, إن وجدت
    if (base64Data.indexOf("base64,") > -1) {
      base64Data = base64Data.split("base64,")[1];
    }
    
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, "image/jpeg", fileName);
    
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var file = folder.createFile(blob);
    
    // ضبط الصلاحية للعرض المباشر
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // رابط العرض المباشر
    var fileId = file.getId();
    var viewUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      fileId: fileId,
      url: viewUrl
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    service: "Candy Club Google Drive Image Uploader"
  })).setMimeType(ContentService.MimeType.JSON);
}
