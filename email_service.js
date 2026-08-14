// ==========================================
// Email Service (Powered by EmailJS)
// ==========================================

window.CANDY_EMAIL_CONFIG = {
    PUBLIC_KEY: 'F0ac0mnX_vGMKUaQX',
    SERVICE_ID: 'service_ntb2n7n',
    TEMPLATE_ID: 'template_8ph9b99',
    ADMIN_EMAIL: 'badr.candyclub@gmail.com'
};

// Initialize EmailJS
(function() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(window.CANDY_EMAIL_CONFIG.PUBLIC_KEY);
        console.log('EmailJS initialized successfully.');
    } else {
        console.error('EmailJS library not loaded.');
    }
})();

// Helper to find email by permission
window.getEmailsByPermission = function(perm) {
    var emails = [];
    if (!window.usersData) return emails;
    window.usersData.forEach(function(u) {
        if (u.permissions && u.permissions.includes(perm) && u.username && u.username.includes('@')) {
            emails.push({ email: u.username, name: u.displayName || 'Manager' });
        }
    });
    return emails;
};

// Generic send via EmailJS
window.sendEmailJS = async function({ to_email, to_name, subject, message }) {
    if (typeof emailjs === 'undefined') {
        console.error('Cannot send email. EmailJS not loaded.');
        return;
    }
    try {
        const response = await emailjs.send(
            window.CANDY_EMAIL_CONFIG.SERVICE_ID,
            window.CANDY_EMAIL_CONFIG.TEMPLATE_ID,
            {
                to_email: to_email,
                name: to_name,
                subject: subject,
                message: message
            }
        );
        console.log('Email sent successfully!', response.status, response.text);
    } catch (err) {
        console.error('EmailJS Failed:', err);
    }
};

// 1. Stock alert (0 or 1 piece) — sent to 'shortages'
window.sendStockAlertEmail = async function(productName, currentStock, location) {
    let managers = window.getEmailsByPermission('shortages');
    if (!managers || managers.length === 0) {
        managers = [{ email: window.CANDY_EMAIL_CONFIG.ADMIN_EMAIL, name: 'Admin' }];
    }
    const msg = `<div dir="rtl" style="font-family: Arial, sans-serif; background-color: #fff3f3; padding: 20px; border-radius: 10px; border: 2px solid #ff9800; max-width: 600px; margin: auto;">
        <h2 style="color: #ff9800; text-align: center;">⚠️ تنبيه نقص مخزون!</h2>
        <div style="background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <p style="font-size: 16px;"><strong>📦 المنتج:</strong> ${productName}</p>
            <p style="font-size: 16px;"><strong>🔢 الكمية الحالية:</strong> <span style="color: red; font-weight: bold;">${currentStock}</span></p>
            <p style="font-size: 16px;"><strong>📍 المكان:</strong> ${location || 'غير محدد'}</p>
        </div>
        <p style="text-align: center; margin-top: 15px; color: #666; font-size: 14px;">يرجى تعويض النواقص في أسرع وقت لضمان سير العمل.</p>
    </div>`;
    for (const m of managers) {
        await window.sendEmailJS({ to_email: m.email, to_name: m.name, subject: 'تنبيه نواقص - ' + productName, message: msg });
    }
};

// 2. Expiry alert — sent to 'expiry'
window.sendExpiryAlertEmail = async function(productName, expiryDate) {
    let managers = window.getEmailsByPermission('expiry');
    if (!managers || managers.length === 0) {
        managers = [{ email: window.CANDY_EMAIL_CONFIG.ADMIN_EMAIL, name: 'Admin' }];
    }
    const msg = `<div dir="rtl" style="font-family: Arial, sans-serif; background-color: #fff3f3; padding: 20px; border-radius: 10px; border: 2px solid #f44336; max-width: 600px; margin: auto;">
        <h2 style="color: #f44336; text-align: center;">🚨 تنبيه صلاحية قريبة!</h2>
        <div style="background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <p style="font-size: 16px;"><strong>📦 المنتج:</strong> ${productName}</p>
            <p style="font-size: 16px;"><strong>⏳ تاريخ الانتهاء:</strong> <span style="color: red; font-weight: bold;">${expiryDate}</span></p>
        </div>
        <p style="text-align: center; margin-top: 15px; color: #666; font-size: 14px;">يرجى مراجعة المنتج واتخاذ اللازم فوراً.</p>
    </div>`;
    for (const m of managers) {
        await window.sendEmailJS({ to_email: m.email, to_name: m.name, subject: 'تنبيه صلاحية قريبة - ' + productName, message: msg });
    }
};

// 3. Leave Request — sent to 'hr-admin'
window.sendLeaveRequestEmail = async function(employeeName, leaveType, leaveDate, notes, remainingLeaves = 'غير محدد', hoursWorked = 'غير محدد') {
    let managers = window.getEmailsByPermission('hr-admin');
    if (!managers || managers.length === 0) {
        managers = [{ email: window.CANDY_EMAIL_CONFIG.ADMIN_EMAIL, name: 'HR Admin' }];
    }
    const msg = `<div dir="rtl" style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; border: 2px solid #e91e63; max-width: 600px; margin: auto;">
        <h2 style="color: #e91e63; text-align: center;">🏖️ طلب إجازة جديد</h2>
        <div style="background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 15px;">
            <p style="font-size: 16px;"><strong>👤 الموظف:</strong> ${employeeName}</p>
            <p style="font-size: 16px;"><strong>📋 نوع الإجازة:</strong> ${leaveType}</p>
            <p style="font-size: 16px;"><strong>📅 تاريخ الإجازة:</strong> ${leaveDate}</p>
            <p style="font-size: 16px;"><strong>📝 ملاحظات:</strong> ${notes || 'لا يوجد'}</p>
        </div>
        <div style="background-color: #fff0f5; padding: 15px; border-radius: 8px; border-right: 4px solid #e91e63;">
            <h3 style="color: #e91e63; margin-top: 0; font-size: 16px;">📊 إحصائيات الموظف (الشهر الحالي):</h3>
            <p style="font-size: 15px; margin: 5px 0;"><strong>🎁 الإجازات المتبقية:</strong> ${remainingLeaves} من أصل 4</p>
            <p style="font-size: 15px; margin: 5px 0;"><strong>⏱️ ساعات العمل الفعّالة:</strong> ${hoursWorked}</p>
        </div>
        <p style="text-align: center; margin-top: 15px; color: #666; font-size: 14px;">يرجى مراجعة الطلب في النظام لاتخاذ القرار.</p>
    </div>`;
    for (const m of managers) {
        await window.sendEmailJS({ to_email: m.email, to_name: m.name, subject: 'طلب إجازة جديد - ' + employeeName, message: msg });
    }
};

// 4. Leave decision — sent to employee
window.sendLeaveDecisionEmail = async function(employeeName, decision, leaveDate, managerNote, remainingLeaves = 'غير محدد', hoursWorked = 'غير محدد') {
    // Look up employee email from usersData
    let empEmail = '';
    if (window.usersData) {
        const u = window.usersData.find(x => x.displayName === employeeName || x.username === employeeName);
        if (u && u.username && u.username.includes('@')) {
            empEmail = u.username;
        }
    }
    if (!empEmail) {
        console.warn('No valid email found for employee:', employeeName);
        return;
    }
    const approved = decision === 'approve';
    const statusText = approved ? 'مقبولة ✅' : 'مرفوضة ❌';
    const msg = `<div dir="rtl" style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; border: 2px solid ${approved ? '#4CAF50' : '#f44336'}; max-width: 600px; margin: auto;">
        <h2 style="color: ${approved ? '#4CAF50' : '#f44336'}; text-align: center;">${approved ? '✅ تمت الموافقة على إجازتك' : '❌ عذراً، تم رفض إجازتك'}</h2>
        <div style="background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 15px;">
            <p style="font-size: 16px;">مرحباً <strong>${employeeName}</strong>،</p>
            <p style="font-size: 16px;">تم الرد على طلب إجازتك بتاريخ <strong>${leaveDate}</strong>.</p>
            <p style="font-size: 16px;"><strong>حالة الطلب:</strong> <span style="color: ${approved ? '#4CAF50' : '#f44336'}; font-weight: bold;">${statusText}</span></p>
            <p style="font-size: 16px;"><strong>💬 ملاحظة الإدارة:</strong> ${managerNote || 'لا يوجد'}</p>
        </div>
        <div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; border-right: 4px solid #2196F3;">
            <h3 style="color: #2196F3; margin-top: 0; font-size: 16px;">📊 ملخص أداءك (الشهر الحالي):</h3>
            <p style="font-size: 15px; margin: 5px 0;"><strong>🎁 رصيد إجازاتك المتبقي:</strong> ${remainingLeaves} من أصل 4</p>
            <p style="font-size: 15px; margin: 5px 0;"><strong>⏱️ ساعات عملك الفعّالة:</strong> ${hoursWorked}</p>
        </div>
        <p style="text-align: center; margin-top: 15px; font-weight: bold; font-size: 16px;">${approved ? '🏖️ إجازة سعيدة!' : 'يرجى التواصل مع الإدارة لمزيد من التفاصيل.'}</p>
    </div>`;
    
    await window.sendEmailJS({
        to_email: empEmail,
        to_name: employeeName,
        subject: (approved ? 'تمت الموافقة على إجازتك' : 'تم رفض إجازتك') + ' - ' + leaveDate,
        message: msg
    });
};
