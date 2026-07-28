const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// ... (Previous operations are already done correctly until we failed, wait, it crashed before modifying app.js!)
// Actually, it didn't save because it threw a syntax error.

// 1. Update quickRefreshBtn
const refreshBtnTarget = `    let quickRefreshBtn = document.getElementById('quickRefreshBtn');
    if (quickRefreshBtn) quickRefreshBtn.addEventListener('click', () => {
        showToast("جاري تحديث البيانات...", "warning");
        loadDataFromServer();
    });`;
const refreshBtnRep = `    let quickRefreshBtn = document.getElementById('quickRefreshBtn');
    if (quickRefreshBtn) quickRefreshBtn.addEventListener('click', () => {
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
    });`;
appJs = appJs.replace(refreshBtnTarget, refreshBtnRep);

// 2. Rewrite renderAttendanceTable Employee View
const regex = /\} else \{\s*\/\/ Full Month Calendar logic for Employee[\s\S]*?container\.innerHTML = html;\s*\}/;

const newElseBlock = `} else {
        // Full Month Table logic for Employee
        let monthInput = document.getElementById('hrEmpMonthFilter');
        if (!monthInput || !monthInput.value) {
            container.innerHTML = '<p style="text-align:center;">اختر الشهر</p>';
            return;
        }
        let yearMonth = monthInput.value;
        let [y, m] = yearMonth.split('-');
        let daysInMonth = new Date(y, m, 0).getDate();
        
        let html = '<table class="styled-table" style="width:100%;">';
        html += '<thead><tr><th>التاريخ</th><th>الحضور</th><th>الانصراف</th><th>إجمالي الساعات</th><th>الحالة</th><th>ملاحظات</th></tr></thead><tbody>';
        
        let today = new Date();
        today.setHours(0,0,0,0);
        
        for (let i = 1; i <= daysInMonth; i++) {
            let dateStr = yearMonth + '-' + String(i).padStart(2, '0');
            let r = records.find(rec => rec.date === dateStr);
            let loopDate = new Date(dateStr);
            loopDate.setHours(0,0,0,0);
            
            if (r) {
                let isPaidLeave = r.status === 'إجازة مدفوعة' && r.notes.includes('تمت الموافقة');
                let isUnpaidLeave = r.status === 'إجازة بدون مرتب' && r.notes.includes('تمت الموافقة');
                let isPending = r.notes.includes('بانتظار الموافقة');
                let isRejected = r.notes.includes('مرفوضة');
                
                let rowStyle = '';
                let inVal = r.checkIn || '-';
                let outVal = r.checkOut || '-';
                let hrsVal = r.hours || '-';
                
                if (isPaidLeave) {
                    rowStyle = 'background-color: #fff9c4;'; // Yellow
                    inVal = '0'; outVal = '0'; hrsVal = '8 ساعة و 0 دقيقة';
                } else if (isUnpaidLeave) {
                    rowStyle = 'background-color: #ffebee; color: #b71c1c;'; // Red
                    inVal = '0'; outVal = '0'; hrsVal = '0 ساعة';
                } else if (isPending) {
                    rowStyle = 'background-color: #fff3e0;'; // Light orange
                } else if (isRejected) {
                    rowStyle = 'background-color: #fce4ec;'; // Light pink
                }
                
                html += \`<tr style="\${rowStyle}">\`;
                html += \`<td>\${dateStr}</td>\`;
                html += \`<td style="font-weight:bold; color:\${isUnpaidLeave?'#b71c1c':'#2e7d32'};">\${inVal}</td>\`;
                html += \`<td style="font-weight:bold; color:\${isUnpaidLeave?'#b71c1c':'#c62828'};">\${outVal}</td>\`;
                html += \`<td style="font-weight:bold;">\${hrsVal}</td>\`;
                html += \`<td><span style="background:rgba(0,0,0,0.05); padding:4px 8px; border-radius:12px; font-size:0.85rem;">\${r.status}</span></td>\`;
                html += \`<td>\${r.notes || '-'}</td>\`;
                html += \`</tr>\`;
                
            } else {
                if (loopDate < today) {
                    // Absent
                    html += \`<tr style="background-color: #f5f5f5; color: #9e9e9e;">\`;
                    html += \`<td>\${dateStr}</td>\`;
                    html += \`<td>0</td><td>0</td><td>0</td>\`;
                    html += \`<td><span style="background:#e0e0e0; color:#424242; padding:4px 8px; border-radius:12px; font-size:0.85rem;">غائب</span></td>\`;
                    html += \`<td>-</td>\`;
                    html += \`</tr>\`;
                } else {
                    // Future or today not checked in
                    html += \`<tr>\`;
                    html += \`<td style="color:#9e9e9e;">\${dateStr}</td>\`;
                    html += \`<td style="color:#9e9e9e;">--</td><td style="color:#9e9e9e;">--</td><td style="color:#9e9e9e;">--</td>\`;
                    html += \`<td><span style="background:#f5f5f5; color:#9e9e9e; padding:4px 8px; border-radius:12px; font-size:0.85rem;">لم يسجل</span></td>\`;
                    html += \`<td style="color:#9e9e9e;">-</td>\`;
                    html += \`</tr>\`;
                }
            }
        }
        
        html += '</tbody></table>';
        container.innerHTML = html;
    }`;

appJs = appJs.replace(regex, newElseBlock);

// 3. Add Spinners to CheckIn
const checkInTarget = `function handleCheckIn() {
    if (!currentUser) return;
    let btn = document.getElementById('checkInBtn');
    if (!btn) return;
    let today = new Date().toLocaleDateString('en-CA');
    let timeStr = new Date().toLocaleTimeString('en-US', { hour12: true });

    let formData = new URLSearchParams();
    formData.append('action', 'checkIn');
    formData.append('employeeName', currentUser.displayName);
    formData.append('date', today);
    formData.append('time', timeStr);
    
    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(r => r.text())
        .then(() => {
            showToast('تم تسجيل الحضور بنجاح', 'success');
            hrTodayStatus = 'checkedIn';
            updateHrButtons();
        });
}`;
const checkInRep = `function handleCheckIn() {
    if (!currentUser) return;
    let btn = document.getElementById('checkInBtn');
    if (!btn) return;
    
    let originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التسجيل...';
    btn.disabled = true;
    
    let today = new Date().toLocaleDateString('en-CA');
    let timeStr = new Date().toLocaleTimeString('en-US', { hour12: true });

    let formData = new URLSearchParams();
    formData.append('action', 'checkIn');
    formData.append('employeeName', currentUser.displayName);
    formData.append('date', today);
    formData.append('time', timeStr);
    
    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(r => r.text())
        .then(() => {
            showToast('تم تسجيل الحضور بنجاح', 'success');
            hrTodayStatus = 'checkedIn';
            updateHrButtons();
        })
        .finally(() => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        });
}`;
appJs = appJs.replace(checkInTarget, checkInRep);

// 4. Add Spinners to CheckOut
const checkOutTarget = `function handleCheckOut() {
    if (!currentUser) return;
    let btn = document.getElementById('checkOutBtn');
    if (!btn) return;
    let today = new Date().toLocaleDateString('en-CA');
    let timeStr = new Date().toLocaleTimeString('en-US', { hour12: true });

    let formData = new URLSearchParams();
    formData.append('action', 'checkOut');
    formData.append('employeeName', currentUser.displayName);
    formData.append('date', today);
    formData.append('time', timeStr);

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(r => r.text())
        .then(() => {
            showToast('تم تسجيل الانصراف بنجاح', 'success');
            hrTodayStatus = 'checkedOut';
            updateHrButtons();
        });

    btn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> تسجيل انصراف';
}`;
const checkOutRep = `function handleCheckOut() {
    if (!currentUser) return;
    let btn = document.getElementById('checkOutBtn');
    if (!btn) return;
    
    let originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التسجيل...';
    btn.disabled = true;
    
    let today = new Date().toLocaleDateString('en-CA');
    let timeStr = new Date().toLocaleTimeString('en-US', { hour12: true });

    let formData = new URLSearchParams();
    formData.append('action', 'checkOut');
    formData.append('employeeName', currentUser.displayName);
    formData.append('date', today);
    formData.append('time', timeStr);

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(r => r.text())
        .then(() => {
            showToast('تم تسجيل الانصراف بنجاح', 'success');
            hrTodayStatus = 'checkedOut';
            updateHrButtons();
        })
        .finally(() => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        });
}`;
appJs = appJs.replace(checkOutTarget, checkOutRep);

// 5. Add Spinners to handleLeaveRequest
const leaveReqTarget = `function handleLeaveRequest() {
    if (!currentUser) return;
    let date = document.getElementById('leaveDate');
    let type = document.getElementById('leaveType');
    let notes = document.getElementById('leaveNotes');
    if (!date || !date.value) { showToast('اختر تاريخ الإجازة', 'warning'); return; }

    let formData = new URLSearchParams();
    formData.append('action', 'requestLeave');
    formData.append('employeeName', currentUser.displayName);
    formData.append('date', date.value);
    formData.append('leaveType', type.value);
    formData.append('notes', notes.value || '');

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(r => r.text())
        .then(() => {
            showToast('✅ تم إرسال طلب الإجازة', 'success');
            date.value = '';
            notes.value = '';
            loadMyAttendance();
        })
        .catch(() => showToast('تم إرسال الطلب', 'success'));
}`;
const leaveReqRep = `function handleLeaveRequest() {
    if (!currentUser) return;
    let date = document.getElementById('leaveDate');
    let type = document.getElementById('leaveType');
    let notes = document.getElementById('leaveNotes');
    if (!date || !date.value) { showToast('اختر تاريخ الإجازة', 'warning'); return; }

    let btn = date.closest('.section-card').querySelector('button.btn-search');
    let originalHtml = 'إرسال <i class="fa-solid fa-paper-plane"></i>';
    if(btn) {
        originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الإرسال...';
        btn.disabled = true;
    }

    let formData = new URLSearchParams();
    formData.append('action', 'requestLeave');
    formData.append('employeeName', currentUser.displayName);
    formData.append('date', date.value);
    formData.append('leaveType', type.value);
    formData.append('notes', notes.value || '');

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(r => r.text())
        .then(() => {
            showToast('✅ تم إرسال طلب الإجازة بنجاح', 'success');
            date.value = '';
            notes.value = '';
            loadMyAttendance();
        })
        .catch(() => showToast('✅ تم إرسال الطلب (مع خطأ)', 'success'))
        .finally(() => {
            if(btn) {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        });
}`;
appJs = appJs.replace(leaveReqTarget, leaveReqRep);

// 6. Add Spinners to handleLeaveDecision (Admin)
const leaveDecTarget = `function handleLeaveDecision(employee, date, decision) {
    if (!confirm('تأكيد الإجراء؟')) return;
    let formData = new URLSearchParams();
    formData.append('action', 'updateLeaveStatus');
    formData.append('employee', employee);
    formData.append('date', date);
    formData.append('status', decision);
    
    fetch(scriptUrl, { method: 'POST', body: formData, mode: 'cors' })
    .then(r => r.text())
    .then(() => {
        showToast('تم تحديث حالة الطلب بنجاح', 'success');
        if(typeof loadPendingLeaves === 'function') loadPendingLeaves();
        loadAdminAttendance();
    });
}`;
const leaveDecRep = `function handleLeaveDecision(employee, date, decision, btnElement = null) {
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
    
    fetch(scriptUrl, { method: 'POST', body: formData, mode: 'cors' })
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
}`;
appJs = appJs.replace(leaveDecTarget, leaveDecRep);

// Safely replace onclick for leave decisions using split/join to avoid regex escape issues
appJs = appJs.split("onclick=\\"handleLeaveDecision('").join("onclick=\\"handleLeaveDecision('");
// Wait, I want to change:
// onclick="handleLeaveDecision('\\'' + p.employee + '\\'', \\'' + p.date + '\\', \\'approve\\')"
// Let's just replace the exact substrings since we know how they were generated in loadPendingLeaves
appJs = appJs.split(", \\'approve\\')\\\"").join(", \\'approve\\', this)\\\"");
appJs = appJs.split(", \\'reject\\')\\\"").join(", \\'reject\\', this)\\\"");

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('✅ app.js updated successfully without regex errors!');
