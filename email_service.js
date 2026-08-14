// ==========================================
// Email Service (Powered by EmailJS)
// ==========================================

window.CANDY_EMAIL_CONFIG = {
    PUBLIC_KEY: 'F0ac0mnX_vGMKUaQX',
    SERVICE_ID: 'service_ntb2n7n',
    TEMPLATE_ID: 'template_8ph9b99'
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
    const managers = window.getEmailsByPermission('shortages');
    const msg = `تنبيه نقص مخزون!\nالمنتج: ${productName}\nالكمية الحالية: ${currentStock}\nالمكان: ${location || 'غير محدد'}\nيرجى تعويض النواقص في أسرع وقت.`;
    for (const m of managers) {
        await window.sendEmailJS({ to_email: m.email, to_name: m.name, subject: 'تنبيه نواقص - ' + productName, message: msg });
    }
};

// 2. Expiry alert — sent to 'expiry'
window.sendExpiryAlertEmail = async function(productName, expiryDate) {
    const managers = window.getEmailsByPermission('expiry');
    const msg = `تنبيه صلاحية!\nالمنتج: ${productName}\nتاريخ الانتهاء: ${expiryDate}\nيرجى مراجعة المنتج.`;
    for (const m of managers) {
        await window.sendEmailJS({ to_email: m.email, to_name: m.name, subject: 'تنبيه صلاحية قريبة - ' + productName, message: msg });
    }
};

// 3. Leave Request — sent to 'hr-admin'
window.sendLeaveRequestEmail = async function(employeeName, leaveType, leaveDate, notes) {
    const managers = window.getEmailsByPermission('hr-admin');
    const msg = `طلب إجازة جديد!\n\nالموظف: ${employeeName}\nنوع الإجازة: ${leaveType}\nتاريخ الإجازة: ${leaveDate}\nملاحظات: ${notes || 'لا يوجد'}\n\nيرجى مراجعة الطلب في النظام.`;
    for (const m of managers) {
        await window.sendEmailJS({ to_email: m.email, to_name: m.name, subject: 'طلب إجازة جديد - ' + employeeName, message: msg });
    }
};

// 4. Leave decision — sent to employee
window.sendLeaveDecisionEmail = async function(employeeName, decision, leaveDate, managerNote) {
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
    const msg = `مرحباً ${employeeName}،\n\nتم الرد على طلب إجازتك بتاريخ ${leaveDate}.\n\nحالة الطلب: ${statusText}\nملاحظة المدير: ${managerNote || 'لا يوجد'}\n\n${approved ? 'إجازة سعيدة!' : 'يرجى التواصل مع الإدارة لمزيد من التفاصيل.'}`;
    
    await window.sendEmailJS({
        to_email: empEmail,
        to_name: employeeName,
        subject: (approved ? 'تمت الموافقة على إجازتك' : 'تم رفض إجازتك') + ' - ' + leaveDate,
        message: msg
    });
};
