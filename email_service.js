// ============================================================
// Candy Club Email Notification Service
// Uses Resend API directly - free up to 3000 emails/month
// ============================================================

// SETTINGS - Edit only here
window.CANDY_EMAIL_CONFIG = {
    // We will fetch the API key from Supabase to prevent GitHub from revoking it!
    RESEND_API_KEY: '',
    FROM_EMAIL: 'onboarding@resend.dev',
    FROM_NAME: 'Candy Club System',
    MANAGER_EMAIL: 'manager@example.com',
    MANAGER_NAME: 'Candy Club Manager'
};

// Fetch the API key dynamically from Supabase
(async function initEmailService() {
    if (typeof supabase !== 'undefined') {
        try {
            const { data } = await supabase.from('settings_shipping')
                .select('*').eq('zone_name', '_RESEND_KEY_').eq('zone_type', 'system').maybeSingle();
            if (data && data.delivery_type) {
                window.CANDY_EMAIL_CONFIG.RESEND_API_KEY = data.delivery_type;
                console.log('Email service initialized successfully.');
            }
        } catch(e) { console.error('Failed to init email service:', e); }
    }
})();

// Core send function — single recipient
window.sendResendEmail = async function({ to_email, to_name, subject, html_body }) {
    const cfg = window.CANDY_EMAIL_CONFIG;
    if (!cfg.RESEND_API_KEY || cfg.RESEND_API_KEY === 'RESEND_API_KEY_HERE') {
        console.warn('Email skipped: Resend API Key not configured.');
        return;
    }
    if (!to_email || !to_email.includes('@')) { console.warn('Invalid email:', to_email); return; }
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.RESEND_API_KEY },
            body: JSON.stringify({ from: cfg.FROM_NAME + ' <' + cfg.FROM_EMAIL + '>', to: [to_name + ' <' + to_email + '>'], subject: subject, html: html_body })
        });
        if (res.ok) console.log('Email sent:', subject, '->', to_email);
        else console.error('Email failed:', await res.json());
    } catch(e) { console.error('Email error:', e); }
};

// Get emails of users having a specific permission
window.getEmailsByPermission = function(perm) {
    var users = window.usersData || [];
    return users.filter(function(u) {
        // Must have the exact permission AND username must look like an email
        var hasPerm = u.permissions && u.permissions.includes(perm);
        return hasPerm && u.username && u.username.includes('@');
    }).map(function(u) {
        return { email: u.username, name: u.displayName };
    });
};

// Send email to users with specific permission
window.sendToPermission = async function(perm, subject, html_body) {
    var recipients = window.getEmailsByPermission(perm);
    if (recipients.length === 0) {
        // Fallback to config email if absolutely needed
        var cfg = window.CANDY_EMAIL_CONFIG;
        if (cfg.MANAGER_EMAIL && cfg.MANAGER_EMAIL !== 'manager@example.com') {
            await window.sendResendEmail({ to_email: cfg.MANAGER_EMAIL, to_name: cfg.MANAGER_NAME, subject: subject, html_body: html_body });
        } else {
            console.warn('No users with permission', perm, 'and valid email found. Add real emails as usernames.');
        }
        return;
    }
    for (var i = 0; i < recipients.length; i++) {
        await window.sendResendEmail({ to_email: recipients[i].email, to_name: recipients[i].name, subject: subject, html_body: html_body });
    }
};

// Get employee email by display name (username is the email)
window.getEmployeeEmail = function(displayName) {
    var users = window.usersData || [];
    var user = users.find(function(u) { return u.displayName === displayName || u.username === displayName; });
    return user ? { email: (user.username && user.username.includes('@') ? user.username : ''), name: user.displayName } : { email: '', name: displayName };
};


// HTML template builder
window.buildEmailTemplate = function({ icon, iconBg, title, subtitle, rows, note, btnText, btnUrl, customTable }) {
    rows = rows || [];
    const rowsHtml = rows.map(r => '<tr><td style=padding:8px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;white-space:nowrap>' + r.label + '</td><td style=padding:8px 12px;color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #f3f4f6>' + r.value + '</td></tr>').join('');
    const tableSection = customTable ? customTable : (rows.length > 0 ? '<div style=background:#f9fafb;border-radius:12px;overflow:hidden;margin-bottom:16px><table style=width:100%;border-collapse:collapse>' + rowsHtml + '</table></div>' : '');
    const btnHtml = btnText ? '<div style=text-align:center;margin-top:28px><a href=' + (btnUrl || '#') + ' style=background:linear-gradient(135deg,#1a237e,#3949ab);color:#fff;text-decoration:none;padding:13px 32px;border-radius:25px;font-size:15px;font-weight:bold;display:inline-block>' + btnText + '</a></div>' : '';
    const noteHtml = note ? '<p style=margin:20px 0 0;color:#6b7280;font-size:13px;background:#f9fafb;padding:12px;border-radius:8px;border-right:3px solid #d1d5db>' + note + '</p>' : '';
    return '<!DOCTYPE html><html dir=rtl lang=ar><head><meta charset=UTF-8></head><body style=margin:0;padding:0;background:#f3f4f6;font-family:Tahoma,Arial,sans-serif><div style=max-width:600px;margin:30px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)><div style=background:linear-gradient(135deg,#1a237e 0%,#3949ab 100%);padding:28px 32px;text-align:center><div style=font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:4px>Candy Club System</div><h1 style=margin:0;color:#fff;font-size:20px>اشعار من النظام</h1></div><div style=padding:32px><div style=text-align:center;margin-bottom:24px><div style=width:64px;height:64px;border-radius:16px;background:' + iconBg + ';display:inline-flex;align-items:center;justify-content:center;font-size:30px;margin-bottom:12px>' + icon + '</div><h2 style=margin:0 0 6px;color:#111827;font-size:20px>' + title + '</h2><p style=margin:0;color:#6b7280;font-size:14px>' + subtitle + '</p></div>' + tableSection + noteHtml + btnHtml + '</div><div style=background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #f3f4f6><p style=margin:0;color:#9ca3af;font-size:12px>هذا اشعار تلقائي من نظام Candy Club</p></div></div></body></html>';
};

// 1. Stock alert (0 or 1 piece) — sent to 'shortages' (or 'catalog' logically, we'll use shortages)
window.sendStockAlertEmail = async function(productName, currentStock, location) {
    const isZero = currentStock <= 0;
    const html = window.buildEmailTemplate({
        icon: isZero ? '⚫' : '⚠️', iconBg: isZero ? '#fef2f2' : '#fff7ed',
        title: isZero ? 'نفد المخزون بالكامل!' : 'تحذير: مخزون منخفض جداً',
        subtitle: isZero ? 'منتج نفد ويحتاج اعادة توريد فوراً' : 'فضل قطعة واحدة فقط',
        rows: [
            { label: 'المنتج', value: productName },
            { label: 'الكمية', value: isZero ? '0 - نفد!' : '1 قطعة فقط' },
            { label: 'الموقع', value: location || 'غير محدد' },
            { label: 'الوقت', value: new Date().toLocaleString('ar-EG') }
        ],
        note: isZero ? 'يرجى اعادة الطلب من المورد فوراً.' : 'قريباً من النفاد - جهز الطلب.',
        btnText: 'عرض المخزون', btnUrl: window.location.origin
    });
    await window.sendToPermission('shortages', (isZero ? 'نفد المخزون - ' : 'مخزون منخفض - ') + productName, html);
};


// 3. Leave request — sent to 'hr-admin'
window.sendLeaveRequestEmail = async function(employeeName, leaveType, leaveDate, notes) {
    const html = window.buildEmailTemplate({
        icon: '🏖️', iconBg: '#fff7ed',
        title: 'طلب اجازة جديد', subtitle: 'موظف يطلب اجازة - يحتاج موافقتك',
        rows: [
            { label: 'الموظف', value: employeeName },
            { label: 'نوع الاجازة', value: leaveType },
            { label: 'التاريخ', value: leaveDate },
            { label: 'ملاحظات', value: notes || 'لا يوجد' },
            { label: 'الوقت', value: new Date().toLocaleString('ar-EG') }
        ],
        note: 'سجل دخولك على النظام للرد على هذا الطلب.',
        btnText: 'الرد على الطلب', btnUrl: window.location.origin
    });
    await window.sendToPermission('hr-admin', 'طلب اجازة - ' + employeeName + ' (' + leaveDate + ')', html);
};

// 4. Leave decision — sent to employee by looking up their email automatically
window.sendLeaveDecisionEmail = async function(employeeName, decision, leaveDate, managerNote) {
    // Look up employee email from usersData automatically
    var empInfo = window.getEmployeeEmail ? window.getEmployeeEmail(employeeName) : { email: '', name: employeeName };
    if (!empInfo.email) {
        console.warn('No email found for employee:', employeeName, '- add email in admin panel');
        return;
    }
    const approved = decision === 'approve';
    const html = window.buildEmailTemplate({
        icon: approved ? '✅' : '❌', iconBg: approved ? '#f0fdf4' : '#fef2f2',
        title: approved ? 'تمت الموافقة على اجازتك' : 'تم رفض طلب اجازتك',
        subtitle: approved ? 'طلبك قبل بنجاح' : 'نأسف لإخبارك ان طلبك لم يوافق عليه',
        rows: [
            { label: 'تاريخ الاجازة', value: leaveDate },
            { label: 'القرار', value: approved ? 'مقبولة' : 'مرفوضة' },
            { label: 'ملاحظة المدير', value: managerNote || 'لا يوجد' },
            { label: 'وقت القرار', value: new Date().toLocaleString('ar-EG') }
        ],
        note: approved ? 'استمتع باجازتك!' : 'يمكنك التواصل مع المدير لمزيد من التوضيح.'
    });
    await window.sendResendEmail({ to_email: empInfo.email, to_name: empInfo.name, subject: (approved ? 'تمت الموافقة على اجازتك - ' : 'تم رفض طلب اجازتك - ') + leaveDate, html_body: html });
};


// 5. Expiry alert
window.sendExpiryAlertEmail = async function(expiringProducts) {
    if (!expiringProducts || !expiringProducts.length) return;
    const rowsHtml = expiringProducts.map(function(p) {
        var color = p.daysLeft <= 3 ? '#dc2626' : p.daysLeft <= 7 ? '#d97706' : '#2563eb';
        return '<tr><td style=padding:10px 12px;font-size:14px;border-bottom:1px solid #f3f4f6>' + p.name + '</td><td style=padding:10px 12px;text-align:center;font-size:14px;border-bottom:1px solid #f3f4f6>' + (p.qty || '-') + '</td><td style=padding:10px 12px;text-align:center;font-size:14px;border-bottom:1px solid #f3f4f6>' + p.expiryDate + '</td><td style=padding:10px 12px;text-align:center;color:' + color + ';font-weight:700;font-size:14px;border-bottom:1px solid #f3f4f6>' + p.daysLeft + ' يوم</td></tr>';
    }).join('');
    const customTable = '<div style=background:#f9fafb;border-radius:12px;overflow:hidden;margin-bottom:16px><table style=width:100%;border-collapse:collapse><thead><tr style=background:linear-gradient(135deg,#1a237e,#3949ab)><th style=padding:12px;color:#fff;font-size:13px;text-align:right>المنتج</th><th style=padding:12px;color:#fff;font-size:13px>الكمية</th><th style=padding:12px;color:#fff;font-size:13px>تاريخ الانتهاء</th><th style=padding:12px;color:#fff;font-size:13px>الايام المتبقية</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
    const html = window.buildEmailTemplate({ icon: '⏰', iconBg: '#fffbeb', title: 'تنبيه صلاحيات - ' + expiringProducts.length + ' منتج', subtitle: 'منتجات قريبة من انتهاء الصلاحية', rows: [], customTable: customTable, note: 'يرجى مراجعة هذه المنتجات واتخاذ الاجراء المناسب.', btnText: 'عرض الصلاحيات', btnUrl: window.location.origin });
    await window.sendToPermission('expiry', 'تنبيه صلاحيات - ' + expiringProducts.length + ' منتج', html);
};

// Auto weekly expiry check
window.checkAndSendExpiryAlerts = function() {
    var expData = window.expiryData || [];
    if (!expData.length) return;
    var now = new Date();
    var expiring = expData.filter(function(p) { return p.expiryDate; }).map(function(p) {
        var daysLeft = Math.ceil((new Date(p.expiryDate) - now) / 86400000);
        return Object.assign({}, p, { daysLeft: daysLeft });
    }).filter(function(p) { return p.daysLeft >= 0 && p.daysLeft <= 14; }).sort(function(a,b) { return a.daysLeft - b.daysLeft; });
    if (expiring.length > 0) window.sendExpiryAlertEmail(expiring);
};

// Schedule weekly Sunday 9AM check
(function() {
    var now = new Date(), next = new Date(now);
    next.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7);
    next.setHours(9, 0, 0, 0);
    setTimeout(function() {
        window.checkAndSendExpiryAlerts();
        setInterval(window.checkAndSendExpiryAlerts, 7 * 24 * 60 * 60 * 1000);
    }, next - now);
})();

console.log('Email Service loaded - Candy Club');
