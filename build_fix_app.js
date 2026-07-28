const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// 1. quickRefreshBtn
let oldRefreshBtn = "if (quickRefreshBtn) quickRefreshBtn.addEventListener('click', () => {\\r\\n        showToast(\\\"جاري تحديث البيانات...\\\", \\\"warning\\\");\\r\\n        loadDataFromServer();\\r\\n    });";
// handle both \r\n and \n just in case
let oldRefreshBtnUnix = oldRefreshBtn.replace(/\\r\\n/g, '\\n');

let newRefreshBtn = \`if (quickRefreshBtn) quickRefreshBtn.addEventListener('click', () => {
        showToast("جاري تحديث البيانات...", "warning");
        loadDataFromServer();
        
        let hrTab = document.getElementById('hr-tab');
        if (hrTab && hrTab.classList.contains('active')) {
            loadMyAttendance();
        }
        let hrAdminTab = document.getElementById('hr-admin-tab');
        if (hrAdminTab && hrAdminTab.classList.contains('active')) {
            if(typeof initHrAdminTab === 'function') initHrAdminTab();
        }
    });\`;

if(appJs.includes(oldRefreshBtn)) { appJs = appJs.replace(oldRefreshBtn, newRefreshBtn); }
else if (appJs.includes(oldRefreshBtnUnix)) { appJs = appJs.replace(oldRefreshBtnUnix, newRefreshBtn); }


// 2. handleLeaveDecision function
let oldLeaveDec = \`window.handleLeaveDecision = function(employee, date, decision) {
    if (!confirm('تأكيد الإجراء؟')) return;
    let formData = new URLSearchParams();
    formData.append('action', 'updateLeaveStatus');
    formData.append('employee', employee);
    formData.append('date', date);
    formData.append('status', decision);
    
    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData, mode: 'cors' })
    .then(r => r.text())
    .then(() => {
        showToast('تم تحديث حالة الطلب بنجاح', 'success');
        if(typeof loadPendingLeaves === 'function') loadPendingLeaves();
        loadAdminAttendance();
    });
}\`;
let oldLeaveDecUnix = oldLeaveDec.replace(/\\r\\n/g, '\\n');

let newLeaveDec = \`window.handleLeaveDecision = function(employee, date, decision, btnElement = null) {
    if (!confirm('تأكيد الإجراء؟')) return;
    
    let originalHtml = '';
    if (btnElement) {
        originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';
        btnElement.disabled = true;
    }

    let formData = new URLSearchParams();
    formData.append('action', 'updateLeaveStatus');
    formData.append('employee', employee);
    formData.append('date', date);
    formData.append('status', decision);
    
    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData, mode: 'cors' })
    .then(r => r.text())
    .then(() => {
        showToast('تم تحديث حالة الطلب بنجاح', 'success');
        if(typeof loadPendingLeaves === 'function') loadPendingLeaves();
        loadAdminAttendance();
    })
    .finally(() => {
        if (btnElement) {
            btnElement.innerHTML = originalHtml;
            btnElement.disabled = false;
        }
    });
}\`;

if(appJs.includes(oldLeaveDec)) { appJs = appJs.replace(oldLeaveDec, newLeaveDec); }
else if (appJs.includes(oldLeaveDecUnix)) { appJs = appJs.replace(oldLeaveDecUnix, newLeaveDec); }


// 3. handleLeaveDecision arguments inside loadPendingLeaves
let oldApprove = "onclick=\\\"handleLeaveDecision('\" + p.employee + \"', '\" + p.date + \"', 'approve')\\\"";
let oldApproveUnix = "onclick=\\\"handleLeaveDecision('\\\\'' + p.employee + '\\\\'', \\\\'' + p.date + '\\\\'', \\\\'approve\\\\')\\\"";
// It is generated as: html += '<button ... onclick="handleLeaveDecision(\\'' + p.employee + '\\', \\'' + p.date + '\\', \\'approve\\')"
let str1 = "onclick=\\"handleLeaveDecision(\\\\\\'\" + p.employee + \"\\\\\\', \\\\\\\\'\" + p.date + \"\\\\\\', \\\\\\'approve\\\\\\')\\"";
appJs = appJs.split(str1).join("onclick=\\"handleLeaveDecision(\\\\\\'\" + p.employee + \"\\\\\\', \\\\\\\\'\" + p.date + \"\\\\\\', \\\\\\'approve\\\\\\', this)\\"");

let str2 = "onclick=\\"handleLeaveDecision(\\\\\\'\" + p.employee + \"\\\\\\', \\\\\\\\'\" + p.date + \"\\\\\\', \\\\\\'reject\\\\\\')\\"";
appJs = appJs.split(str2).join("onclick=\\"handleLeaveDecision(\\\\\\'\" + p.employee + \"\\\\\\', \\\\\\\\'\" + p.date + \"\\\\\\', \\\\\\'reject\\\\\\', this)\\"");


fs.writeFileSync('app.js', appJs, 'utf8');
console.log('✅ app.js fix deployed');
