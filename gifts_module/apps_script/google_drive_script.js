/**
 * Candy Club Gifts Module - Google Apps Script Webhook
 * كود وسيط مجاني لرفع وحذف صور البوكيهات مباشرة إلى مجلد Google Drive
 * 
 * خطوات الاستخدام:
 * 1. افتح https://script.google.com بحساب Google الخاص بك
 * 2. انسخ هذا الكود كاملا والصقه في المحرر
 * 3. اضغط Deploy ثم Manage Deployments أو New Deployment
 * 4. اضبط النوع Web App و Who has access على Anyone
 * 5. اضغط Deploy وانسخ رابط الويب وضع نسخه في gifts.js
 */

var FOLDER_ID = "1KRVAHNWxZg07Yllck0v7PzMRFcBITvL";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // إذا طُلب حذف / استبدال صورة قديمة سابقة
    if (data.deleteFileId) {
      try {
        DriveApp.getFileById(data.deleteFileId).setTrashed(true);
      } catch(delErr) {
        // الاستمرار حتى لو كان الملف غير موجود أو تم حذفه مسبقاً
      }
    }
    
    // إذا كان الطلب فقط لحذف صورة
    if (data.action === "delete" && data.fileId) {
      DriveApp.getFileById(data.fileId).setTrashed(true);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        fileId: data.fileId,
        message: "File trashed"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
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
    
    // ضبط الصلاحية للعرض المباشر للجميع عبر الرابط
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // رابط العرض المباشر عالي السرعة
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
    service: "Candy Club Google Drive Image Uploader & Manager"
  })).setMimeType(ContentService.MimeType.JSON);
}
