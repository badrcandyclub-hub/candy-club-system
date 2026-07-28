const fs = require('fs');

// ============================================================
// PHASE 2: Add HR tab section to index.html
// ============================================================
let indexHtml = fs.readFileSync('index.html', 'utf8');

// Find the last tab-pane section (financials-tab) and add HR section after it
const hrSection = `
        <!-- ⭐ HR: الحضور والانصراف -->
        <section id="hr-tab" class="tab-pane">
            <div class="section-card" style="border-right: 4px solid #00897b; margin-bottom: 15px;">
                <h3 style="color: #00897b; margin: 0 0 15px;"><i class="fa-solid fa-fingerprint"></i> الحضور والانصراف</h3>
                
                <!-- GPS Status -->
                <div id="gpsStatusCard" class="hr-gps-card">
                    <div id="gpsIndicator" class="gps-dot gps-unknown"></div>
                    <span id="gpsStatusText">جاري تحديد الموقع...</span>
                </div>

                <!-- Employee View: Check-in/out buttons -->
                <div id="hrEmployeeView">
                    <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
                        <button id="checkInBtn" class="hr-action-btn hr-checkin-btn interactive-btn" onclick="handleCheckIn()" disabled>
                            <i class="fa-solid fa-right-to-bracket"></i> تسجيل حضور
                        </button>
                        <button id="checkOutBtn" class="hr-action-btn hr-checkout-btn interactive-btn" onclick="handleCheckOut()" disabled style="display:none;">
                            <i class="fa-solid fa-right-from-bracket"></i> تسجيل انصراف
                        </button>
                    </div>

                    <!-- Employee Dashboard Cards -->
                    <div class="hr-dashboard-cards">
                        <div class="hr-stat-card">
                            <div class="hr-stat-icon" style="background: #e8f5e9; color: #2e7d32;"><i class="fa-solid fa-clock"></i></div>
                            <div><span class="hr-stat-value" id="hrTodayHours">0</span><span class="hr-stat-label">ساعات اليوم</span></div>
                        </div>
                        <div class="hr-stat-card">
                            <div class="hr-stat-icon" style="background: #fff3e0; color: #ef6c00;"><i class="fa-solid fa-calendar-check"></i></div>
                            <div><span class="hr-stat-value" id="hrMonthDays">0</span><span class="hr-stat-label">أيام الحضور هذا الشهر</span></div>
                        </div>
                        <div class="hr-stat-card">
                            <div class="hr-stat-icon" style="background: #e3f2fd; color: #1565c0;"><i class="fa-solid fa-umbrella-beach"></i></div>
                            <div><span class="hr-stat-value" id="hrLeaveBalance">4</span><span class="hr-stat-label">رصيد الإجازات المدفوعة</span></div>
                        </div>
                        <div class="hr-stat-card">
                            <div class="hr-stat-icon" style="background: #fce4ec; color: #c62828;"><i class="fa-solid fa-hourglass-half"></i></div>
                            <div><span class="hr-stat-value" id="hrTotalHoursMonth">0</span><span class="hr-stat-label">إجمالي ساعات الشهر</span></div>
                        </div>
                    </div>

                    <!-- Leave Request Form -->
                    <div class="section-card" style="margin-top: 15px; border-right: 4px solid #7b1fa2;">
                        <h4 style="color: #7b1fa2; margin: 0 0 12px;"><i class="fa-solid fa-paper-plane"></i> طلب إجازة</h4>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
                            <div style="flex:1; min-width: 140px;">
                                <label style="font-size: 0.85rem; color: var(--text-muted);">التاريخ</label>
                                <input type="date" id="leaveDate" style="width:100%;">
                            </div>
                            <div style="flex:1; min-width: 140px;">
                                <label style="font-size: 0.85rem; color: var(--text-muted);">نوع الإجازة</label>
                                <select id="leaveType" style="width:100%;">
                                    <option value="إجازة مدفوعة">إجازة مدفوعة (8 ساعات)</option>
                                    <option value="إجازة بدون مرتب">إجازة بدون مرتب</option>
                                </select>
                            </div>
                            <div style="flex:1; min-width: 140px;">
                                <label style="font-size: 0.85rem; color: var(--text-muted);">ملاحظات</label>
                                <input type="text" id="leaveNotes" placeholder="اختياري" style="width:100%;">
                            </div>
                            <button class="btn-search interactive-btn" onclick="handleLeaveRequest()" style="padding: 11px 20px; white-space: nowrap;">
                                إرسال <i class="fa-solid fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Admin View: Attendance Dashboard -->
                <div id="hrAdminView" style="display:none;">
                    <div class="section-card" style="margin-bottom: 15px; border-right: 4px solid #1565c0;">
                        <h4 style="color: #1565c0; margin: 0 0 12px;"><i class="fa-solid fa-users-line"></i> متابعة حضور الموظفين</h4>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 12px;">
                            <div style="flex:1; min-width: 140px;">
                                <label style="font-size: 0.85rem;">الموظف</label>
                                <select id="hrAdminEmployeeFilter" style="width:100%;">
                                    <option value="">كل الموظفين</option>
                                </select>
                            </div>
                            <div style="flex:1; min-width: 140px;">
                                <label style="font-size: 0.85rem;">الشهر</label>
                                <input type="month" id="hrAdminMonthFilter" style="width:100%;">
                            </div>
                            <button class="btn-search interactive-btn" onclick="loadAdminAttendance()" style="padding: 11px 20px;">
                                عرض <i class="fa-solid fa-magnifying-glass"></i>
                            </button>
                            <button class="interactive-btn" onclick="exportAttendancePDF()" style="padding: 11px 20px; background: #c62828; color: white; border: none; border-radius: 8px; cursor: pointer;">
                                <i class="fa-solid fa-file-pdf"></i> تقرير PDF
                            </button>
                        </div>
                        <div id="hrAdminAttendanceTable" style="overflow-x: auto;"></div>
                    </div>

                    <!-- Admin: Add Leave -->
                    <div class="section-card" style="margin-bottom: 15px; border-right: 4px solid #00897b;">
                        <h4 style="color: #00897b; margin: 0 0 12px;"><i class="fa-solid fa-calendar-plus"></i> إضافة إجازة لموظف</h4>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
                            <div style="flex:1; min-width: 140px;">
                                <label style="font-size: 0.85rem;">الموظف</label>
                                <select id="adminLeaveEmployee" style="width:100%;"></select>
                            </div>
                            <div style="flex:1; min-width: 140px;">
                                <label style="font-size: 0.85rem;">التاريخ</label>
                                <input type="date" id="adminLeaveDate" style="width:100%;">
                            </div>
                            <div style="flex:1; min-width: 140px;">
                                <label style="font-size: 0.85rem;">النوع</label>
                                <select id="adminLeaveType" style="width:100%;">
                                    <option value="إجازة مدفوعة">إجازة مدفوعة</option>
                                    <option value="إجازة بدون مرتب">إجازة بدون مرتب</option>
                                </select>
                            </div>
                            <div style="flex:1; min-width: 140px;">
                                <label style="font-size: 0.85rem;">ملاحظات</label>
                                <input type="text" id="adminLeaveNotes" placeholder="عيد / مصيف / ..." style="width:100%;">
                            </div>
                            <button class="btn-search interactive-btn" onclick="handleAdminAddLeave()" style="padding: 11px 20px;">
                                إضافة <i class="fa-solid fa-plus"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Pending Leave Approvals -->
                    <div class="section-card" style="border-right: 4px solid #ff6f00;">
                        <h4 style="color: #ff6f00; margin: 0 0 12px;"><i class="fa-solid fa-bell"></i> طلبات الإجازات المعلقة</h4>
                        <div id="hrPendingLeaves"></div>
                    </div>
                </div>

                <!-- Attendance History (for both) -->
                <div class="section-card" style="margin-top: 15px; border-right: 4px solid #546e7a;">
                    <h4 style="color: #546e7a; margin: 0 0 12px;"><i class="fa-solid fa-list-check"></i> سجل الحضور</h4>
                    <div style="display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; align-items: flex-end;">
                        <div style="flex:1; min-width: 140px;">
                            <label style="font-size: 0.85rem;">الشهر</label>
                            <input type="month" id="hrHistoryMonth" style="width:100%;">
                        </div>
                        <button class="btn-search interactive-btn" onclick="loadMyAttendance()" style="padding: 11px 20px;">
                            عرض <i class="fa-solid fa-magnifying-glass"></i>
                        </button>
                    </div>
                    <div id="hrAttendanceHistory" style="overflow-x: auto;"></div>
                </div>
            </div>
        </section>
`;

// Insert before the closing </main>
indexHtml = indexHtml.replace('    </main>', hrSection + '\n    </main>');

// Add sidebar button in "الإدارة والتقارير" group
const sidebarInsertPoint = `                    <button class="nav-item" data-target="moderators-tab" style="color: #8e24aa;">`;
const hrSidebarBtn = `                    <button class="nav-item" data-target="hr-tab" style="color: #00897b;">
                        <span class="icon"><i class="fa-solid fa-fingerprint"></i></span><span class="label">الحضور والانصراف</span>
                    </button>
` + sidebarInsertPoint;

indexHtml = indexHtml.replace(sidebarInsertPoint, hrSidebarBtn);

fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log('✅ index.html updated with HR tab and sidebar button');

// Also add to admin.html sidebar
let adminHtml = fs.readFileSync('admin.html', 'utf8');
// No need to add HR tab content to admin.html since admin controls are in index.html
// But let's add a button link to it
console.log('✅ admin.html - no changes needed (HR is in index.html)');

// Verify
let verifyHtml = fs.readFileSync('index.html', 'utf8');
console.log('Has hr-tab section:', verifyHtml.includes('id="hr-tab"'));
console.log('Has hr sidebar btn:', verifyHtml.includes('data-target="hr-tab"'));
console.log('Has GPS indicator:', verifyHtml.includes('gpsIndicator'));
console.log('Has checkInBtn:', verifyHtml.includes('checkInBtn'));
