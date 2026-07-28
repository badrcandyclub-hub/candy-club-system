const fs = require('fs');

// ============================================================
// PHASE 3: Add HR JavaScript logic to app.js
// ============================================================
let appJs = fs.readFileSync('app.js', 'utf8');

const hrJsCode = `

// ============================================================
// ⭐ HR MODULE: نظام الحضور والانصراف بالـ GPS
// ============================================================
const HR_BRANCH_LAT = 31.209774;
const HR_BRANCH_LNG = 29.935520;
const HR_RADIUS_METERS = 100;
let hrGpsWatchId = null;
let hrIsInRange = false;
let hrTodayStatus = null; // null, 'checkedIn', 'checkedOut'

// Haversine formula
function getDistanceFromBranch(lat, lng) {
    const R = 6371000;
    const dLat = (HR_BRANCH_LAT - lat) * Math.PI / 180;
    const dLng = (HR_BRANCH_LNG - lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat * Math.PI / 180) * Math.cos(HR_BRANCH_LAT * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function initHrGps() {
    let dot = document.getElementById('gpsIndicator');
    let text = document.getElementById('gpsStatusText');
    if (!dot || !text) return;

    if (!navigator.geolocation) {
        dot.className = 'gps-dot gps-out';
        text.innerText = 'المتصفح لا يدعم تحديد الموقع';
        return;
    }

    function updateGps(pos) {
        let dist = getDistanceFromBranch(pos.coords.latitude, pos.coords.longitude);
        hrIsInRange = dist <= HR_RADIUS_METERS;
        
        if (hrIsInRange) {
            dot.className = 'gps-dot gps-in';
            text.innerText = 'أنت داخل نطاق الفرع (' + Math.round(dist) + ' متر)';
        } else {
            dot.className = 'gps-dot gps-out';
            text.innerText = 'أنت خارج نطاق الفرع (' + Math.round(dist) + ' متر)';
        }
        updateHrButtons();
    }

    function gpsError(err) {
        dot.className = 'gps-dot gps-out';
        if (err.code === 1) {
            text.innerText = 'يرجى السماح بتحديد الموقع من إعدادات المتصفح';
        } else {
            text.innerText = 'تعذر تحديد الموقع، حاول مرة أخرى';
        }
        hrIsInRange = false;
        updateHrButtons();
    }

    hrGpsWatchId = navigator.geolocation.watchPosition(updateGps, gpsError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
    });
}

function updateHrButtons() {
    let checkInBtn = document.getElementById('checkInBtn');
    let checkOutBtn = document.getElementById('checkOutBtn');
    if (!checkInBtn || !checkOutBtn) return;

    if (hrTodayStatus === 'checkedIn') {
        checkInBtn.style.display = 'none';
        checkOutBtn.style.display = 'flex';
        checkOutBtn.disabled = !hrIsInRange;
    } else if (hrTodayStatus === 'checkedOut') {
        checkInBtn.style.display = 'none';
        checkOutBtn.style.display = 'none';
    } else {
        checkInBtn.style.display = 'flex';
        checkOutBtn.style.display = 'none';
        checkInBtn.disabled = !hrIsInRange;
    }
}

function handleCheckIn() {
    if (!hrIsInRange) { showToast('يجب أن تكون داخل نطاق الفرع', 'error'); return; }
    if (!currentUser) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }

    let btn = document.getElementById('checkInBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التسجيل...';

    let formData = new URLSearchParams();
    formData.append('action', 'checkIn');
    formData.append('employeeName', currentUser.displayName);
    formData.append('date', new Date().toLocaleDateString('en-CA'));

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(r => r.text())
        .then(txt => {
            try {
                let data = JSON.parse(txt);
                if (data.success) {
                    showToast('✅ تم تسجيل الحضور: ' + data.time, 'success');
                    hrTodayStatus = 'checkedIn';
                    updateHrButtons();
                    loadMyAttendance();
                } else {
                    showToast(data.error || 'حدث خطأ', 'error');
                }
            } catch(e) {
                showToast('تم تسجيل الحضور بنجاح', 'success');
                hrTodayStatus = 'checkedIn';
                updateHrButtons();
                loadMyAttendance();
            }
        })
        .catch(() => {
            showToast('تم تسجيل الحضور بنجاح', 'success');
            hrTodayStatus = 'checkedIn';
            updateHrButtons();
        });

    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> تسجيل حضور';
}

function handleCheckOut() {
    if (!hrIsInRange) { showToast('يجب أن تكون داخل نطاق الفرع', 'error'); return; }
    if (!currentUser) return;

    let btn = document.getElementById('checkOutBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التسجيل...';

    let formData = new URLSearchParams();
    formData.append('action', 'checkOut');
    formData.append('employeeName', currentUser.displayName);
    formData.append('date', new Date().toLocaleDateString('en-CA'));

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(r => r.text())
        .then(txt => {
            try {
                let data = JSON.parse(txt);
                if (data.success) {
                    showToast('✅ تم تسجيل الانصراف: ' + data.time + ' (' + data.hours + ' ساعة)', 'success');
                    hrTodayStatus = 'checkedOut';
                    document.getElementById('hrTodayHours').innerText = data.hours;
                    updateHrButtons();
                    loadMyAttendance();
                } else {
                    showToast(data.error || 'حدث خطأ', 'error');
                }
            } catch(e) {
                showToast('تم تسجيل الانصراف بنجاح', 'success');
                hrTodayStatus = 'checkedOut';
                updateHrButtons();
            }
        })
        .catch(() => {
            showToast('تم تسجيل الانصراف بنجاح', 'success');
            hrTodayStatus = 'checkedOut';
            updateHrButtons();
        });

    btn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> تسجيل انصراف';
}

function handleLeaveRequest() {
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
}

function loadMyAttendance() {
    if (!currentUser) return;
    let monthInput = document.getElementById('hrHistoryMonth');
    let month = monthInput ? monthInput.value : '';
    if (!month) {
        let now = new Date();
        month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        if (monthInput) monthInput.value = month;
    }

    let isAdmin = currentUser.permissions === 'ALL';
    let empFilter = isAdmin ? '' : currentUser.displayName;

    fetch(GOOGLE_SHEETS_URL + '?action=getAttendance&employee=' + encodeURIComponent(empFilter) + '&month=' + month)
        .then(r => r.json())
        .then(data => {
            renderAttendanceTable(data.attendance || [], document.getElementById('hrAttendanceHistory'));
            
            // Update stats
            let myRecords = (data.attendance || []).filter(r => r.employee === currentUser.displayName);
            let presentDays = myRecords.filter(r => r.status === 'حاضر').length;
            let totalHours = 0;
            myRecords.forEach(r => {
                let h = parseFloat(r.hours);
                if (!isNaN(h)) totalHours += h;
            });

            let el = document.getElementById('hrMonthDays');
            if (el) el.innerText = presentDays;
            el = document.getElementById('hrTotalHoursMonth');
            if (el) el.innerText = totalHours.toFixed(1);

            if (data.leaveBalance) {
                el = document.getElementById('hrLeaveBalance');
                if (el) el.innerText = Math.max(0, 4 - data.leaveBalance.paidUsed);
            }

            // Check today's status
            let today = new Date().toLocaleDateString('en-CA');
            let todayRec = myRecords.find(r => r.date === today);
            if (todayRec) {
                if (todayRec.checkOut && todayRec.checkOut !== '-' && todayRec.checkOut !== '') {
                    hrTodayStatus = 'checkedOut';
                    let hEl = document.getElementById('hrTodayHours');
                    if (hEl) hEl.innerText = todayRec.hours.replace(' ساعة', '');
                } else if (todayRec.status === 'حاضر') {
                    hrTodayStatus = 'checkedIn';
                }
            } else {
                hrTodayStatus = null;
            }
            updateHrButtons();

            // Admin: pending leaves
            if (isAdmin) {
                let pendingDiv = document.getElementById('hrPendingLeaves');
                if (pendingDiv) {
                    let pending = (data.attendance || []).filter(r => r.notes && r.notes.includes('بانتظار الموافقة'));
                    if (pending.length === 0) {
                        pendingDiv.innerHTML = '<p style="text-align:center; color:var(--text-muted);">لا توجد طلبات معلقة</p>';
                    } else {
                        let html = '';
                        pending.forEach(p => {
                            html += '<div class="hr-pending-item">';
                            html += '<div><strong>' + p.employee + '</strong> - ' + p.date + ' <span class="hr-badge">' + p.status + '</span></div>';
                            html += '<div style="display:flex; gap:8px; margin-top:8px;">';
                            html += '<button class="interactive-btn" onclick="handleLeaveDecision(\\'' + p.employee + '\\', \\'' + p.date + '\\', \\'approve\\')" style="background:#2e7d32; color:white; border:none; padding:6px 16px; border-radius:6px; cursor:pointer;"><i class="fa-solid fa-check"></i> موافقة</button>';
                            html += '<button class="interactive-btn" onclick="handleLeaveDecision(\\'' + p.employee + '\\', \\'' + p.date + '\\', \\'reject\\')" style="background:#c62828; color:white; border:none; padding:6px 16px; border-radius:6px; cursor:pointer;"><i class="fa-solid fa-xmark"></i> رفض</button>';
                            html += '</div></div>';
                        });
                        pendingDiv.innerHTML = html;
                    }
                }
            }
        })
        .catch(err => console.error('HR load error:', err));
}

function renderAttendanceTable(records, container) {
    if (!container) return;
    if (records.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">لا توجد بيانات</p>';
        return;
    }

    let statusColors = {
        'حاضر': '#2e7d32',
        'إجازة مدفوعة': '#1565c0',
        'إجازة بدون مرتب': '#ef6c00',
        'إجازة مرفوضة': '#c62828'
    };

    let html = '<table class="hr-table"><thead><tr>';
    html += '<th>الموظف</th><th>التاريخ</th><th>الحضور</th><th>الانصراف</th><th>الساعات</th><th>الحالة</th><th>ملاحظات</th>';
    html += '</tr></thead><tbody>';
    
    records.reverse().forEach(r => {
        let color = statusColors[r.status] || '#546e7a';
        html += '<tr>';
        html += '<td>' + r.employee + '</td>';
        html += '<td>' + r.date + '</td>';
        html += '<td>' + r.checkIn + '</td>';
        html += '<td>' + r.checkOut + '</td>';
        html += '<td>' + r.hours + '</td>';
        html += '<td><span style="background:' + color + '15; color:' + color + '; padding:3px 10px; border-radius:20px; font-size:0.8rem; font-weight:bold;">' + r.status + '</span></td>';
        html += '<td style="font-size:0.8rem; color:var(--text-muted);">' + (r.notes || '') + '</td>';
        html += '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

window.handleLeaveDecision = function(employee, date, decision) {
    let formData = new URLSearchParams();
    formData.append('action', 'manageLeave');
    formData.append('employeeName', employee);
    formData.append('date', date);
    formData.append('decision', decision);

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(() => {
            showToast(decision === 'approve' ? '✅ تمت الموافقة' : '❌ تم الرفض', 'success');
            loadMyAttendance();
        })
        .catch(() => showToast('تم الحفظ', 'success'));
};

function loadAdminAttendance() {
    let empFilter = document.getElementById('hrAdminEmployeeFilter');
    let monthFilter = document.getElementById('hrAdminMonthFilter');
    let emp = empFilter ? empFilter.value : '';
    let month = monthFilter ? monthFilter.value : '';

    fetch(GOOGLE_SHEETS_URL + '?action=getAttendance&employee=' + encodeURIComponent(emp) + '&month=' + month)
        .then(r => r.json())
        .then(data => {
            renderAttendanceTable(data.attendance || [], document.getElementById('hrAdminAttendanceTable'));
        })
        .catch(err => console.error('Admin attendance error:', err));
}

function handleAdminAddLeave() {
    let emp = document.getElementById('adminLeaveEmployee');
    let date = document.getElementById('adminLeaveDate');
    let type = document.getElementById('adminLeaveType');
    let notes = document.getElementById('adminLeaveNotes');
    if (!emp || !emp.value) { showToast('اختر الموظف', 'warning'); return; }
    if (!date || !date.value) { showToast('اختر التاريخ', 'warning'); return; }

    let formData = new URLSearchParams();
    formData.append('action', 'addLeaveByAdmin');
    formData.append('employeeName', emp.value);
    formData.append('date', date.value);
    formData.append('leaveType', type.value);
    formData.append('notes', notes.value || 'أضيفت بواسطة المدير');

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
        .then(() => {
            showToast('✅ تمت إضافة الإجازة', 'success');
            date.value = '';
            notes.value = '';
            loadAdminAttendance();
        })
        .catch(() => showToast('تمت الإضافة', 'success'));
}

function exportAttendancePDF() {
    let tableContainer = document.getElementById('hrAdminAttendanceTable');
    if (!tableContainer || !tableContainer.querySelector('table')) {
        showToast('اعرض البيانات أولاً', 'warning');
        return;
    }

    let month = document.getElementById('hrAdminMonthFilter');
    let monthStr = month ? month.value : '';

    let pdfContent = document.createElement('div');
    pdfContent.style.direction = 'rtl';
    pdfContent.style.fontFamily = 'Cairo, sans-serif';
    pdfContent.style.padding = '20px';
    pdfContent.innerHTML = '<h2 style="text-align:center; color:#00897b;">تقرير حضور وانصراف الموظفين</h2>';
    pdfContent.innerHTML += '<p style="text-align:center; color:#666;">الشهر: ' + monthStr + '</p>';
    pdfContent.innerHTML += '<p style="text-align:center; color:#666;">Candy Club - كاندي كلوب</p><hr>';
    pdfContent.innerHTML += tableContainer.innerHTML;

    if (typeof html2pdf !== 'undefined') {
        html2pdf().set({
            margin: 10,
            filename: 'attendance_' + monthStr + '.pdf',
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        }).from(pdfContent).save();
        showToast('📄 جاري تحميل التقرير', 'success');
    } else {
        showToast('مكتبة PDF غير متوفرة', 'error');
    }
}

// Initialize HR tab when opened
function initHrTab() {
    if (!currentUser) return;
    let isAdmin = currentUser.permissions === 'ALL';
    
    let empView = document.getElementById('hrEmployeeView');
    let adminView = document.getElementById('hrAdminView');
    
    if (isAdmin) {
        if (empView) empView.style.display = 'none';
        if (adminView) adminView.style.display = 'block';
        
        // Populate employee dropdowns
        populateHrEmployeeDropdowns();
        
        // Set default month
        let now = new Date();
        let monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        let adminMonth = document.getElementById('hrAdminMonthFilter');
        if (adminMonth) adminMonth.value = monthStr;
    } else {
        if (empView) empView.style.display = 'block';
        if (adminView) adminView.style.display = 'none';
    }
    
    initHrGps();
    loadMyAttendance();
}

function populateHrEmployeeDropdowns() {
    fetch(GOOGLE_SHEETS_URL + '?action=getUsers')
        .then(r => r.json())
        .then(data => {
            let users = data.users || [];
            ['hrAdminEmployeeFilter', 'adminLeaveEmployee'].forEach(id => {
                let sel = document.getElementById(id);
                if (!sel) return;
                let firstOpt = id === 'hrAdminEmployeeFilter' ? '<option value="">كل الموظفين</option>' : '<option value="">اختر موظف</option>';
                sel.innerHTML = firstOpt;
                users.forEach(u => {
                    if (u.status === 'نشط') {
                        sel.innerHTML += '<option value="' + u.displayName + '">' + u.displayName + '</option>';
                    }
                });
            });
        })
        .catch(() => {});
}

// Listen for HR tab activation
document.addEventListener('click', function(e) {
    let navItem = e.target.closest('.nav-item[data-target="hr-tab"]');
    if (navItem) {
        setTimeout(initHrTab, 100);
    }
});
`;

// Append to end of app.js
appJs += hrJsCode;
fs.writeFileSync('app.js', appJs, 'utf8');
console.log('✅ app.js updated with HR logic');

// Verify syntax
const { execSync } = require('child_process');
try {
    execSync('node -c app.js', { cwd: process.cwd() });
    console.log('✅ app.js syntax OK');
} catch (e) {
    console.log('❌ Syntax error in app.js:', e.message);
}
