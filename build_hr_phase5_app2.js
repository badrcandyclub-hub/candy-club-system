const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// 1. Rewrite renderAttendanceTable Employee View
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
                    html += \`<td style="color:#9e9e9e;">0</td><td style="color:#9e9e9e;">0</td><td style="color:#9e9e9e;">0</td>\`;
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

// 2. Add Spinners to handleLeaveDecision (Admin)
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

// Replace onclick manually carefully using split
let chunks = appJs.split("onclick=\\"handleLeaveDecision('");
if (chunks.length > 1) {
    // We only care about the chunks that are generated dynamically in loadPendingLeaves
    for (let i = 1; i < chunks.length; i++) {
        if (chunks[i].includes(", 'approve')\\\"") || chunks[i].includes(", \\'approve\\')\\\"")) {
            chunks[i] = chunks[i].replace(", 'approve')\\\"", ", 'approve', this)\\\"");
            chunks[i] = chunks[i].replace(", \\'approve\\')\\\"", ", \\'approve\\', this)\\\"");
        }
        if (chunks[i].includes(", 'reject')\\\"") || chunks[i].includes(", \\'reject\\')\\\"")) {
            chunks[i] = chunks[i].replace(", 'reject')\\\"", ", 'reject', this)\\\"");
            chunks[i] = chunks[i].replace(", \\'reject\\')\\\"", ", \\'reject\\', this)\\\"");
        }
    }
    appJs = chunks.join("onclick=\\"handleLeaveDecision('");
}

// 3. Update quickRefreshBtn
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

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('✅ app.js updated for remaining features!');
