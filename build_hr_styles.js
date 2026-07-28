const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

const hrCss = `

/* ============================================================
   HR Module: نظام الحضور والانصراف
   ============================================================ */

/* GPS Status Card */
.hr-gps-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-radius: 12px;
    background: #f8f9fa;
    margin-bottom: 18px;
    font-weight: 600;
    font-size: 0.95rem;
    border: 1px solid #e0e0e0;
    transition: all 0.3s ease;
}

.gps-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
    position: relative;
}
.gps-dot::after {
    content: '';
    position: absolute;
    top: -4px; left: -4px;
    width: 24px; height: 24px;
    border-radius: 50%;
    animation: gpsPulse 2s infinite;
}
.gps-dot.gps-in { background: #2e7d32; }
.gps-dot.gps-in::after { background: rgba(46, 125, 50, 0.3); }
.gps-dot.gps-out { background: #c62828; }
.gps-dot.gps-out::after { background: rgba(198, 40, 40, 0.3); }
.gps-dot.gps-unknown { background: #9e9e9e; }
.gps-dot.gps-unknown::after { background: rgba(158, 158, 158, 0.3); }

@keyframes gpsPulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.5); opacity: 0.5; }
    100% { transform: scale(1); opacity: 1; }
}

/* Check-in/out Buttons */
.hr-action-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 28px;
    border-radius: 14px;
    font-size: 1.1rem;
    font-weight: 700;
    font-family: 'Cairo', sans-serif;
    cursor: pointer;
    border: none;
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    flex: 1;
    min-width: 160px;
    justify-content: center;
}
.hr-action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none !important;
}
.hr-checkin-btn {
    background: linear-gradient(135deg, #2e7d32, #43a047);
    color: white;
    box-shadow: 0 4px 15px rgba(46, 125, 50, 0.35);
}
.hr-checkin-btn:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(46, 125, 50, 0.5);
}
.hr-checkout-btn {
    background: linear-gradient(135deg, #c62828, #e53935);
    color: white;
    box-shadow: 0 4px 15px rgba(198, 40, 40, 0.35);
}
.hr-checkout-btn:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(198, 40, 40, 0.5);
}

/* Dashboard Cards */
.hr-dashboard-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 15px;
}
.hr-stat-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    border-radius: 14px;
    background: white;
    border: 1px solid #e8e8e8;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    transition: transform 0.2s;
}
.hr-stat-card:hover { transform: translateY(-2px); }
.hr-stat-icon {
    width: 48px; height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    flex-shrink: 0;
}
.hr-stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 800;
    color: #1a1a2e;
    line-height: 1;
}
.hr-stat-label {
    display: block;
    font-size: 0.78rem;
    color: #888;
    margin-top: 4px;
}

/* Attendance Table */
.hr-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
    border-radius: 10px;
    overflow: hidden;
}
.hr-table thead th {
    background: #00897b;
    color: white;
    padding: 10px 12px;
    text-align: center;
    font-weight: 700;
    font-size: 0.85rem;
    white-space: nowrap;
}
.hr-table tbody td {
    padding: 10px 12px;
    text-align: center;
    border-bottom: 1px solid #f0f0f0;
    white-space: nowrap;
}
.hr-table tbody tr:hover {
    background: #f5f5f5;
}
.hr-table tbody tr:nth-child(even) {
    background: #fafafa;
}

/* Pending Leave Items */
.hr-pending-item {
    padding: 14px;
    border: 1px solid #ffe0b2;
    border-radius: 10px;
    margin-bottom: 10px;
    background: #fff8e1;
}
.hr-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 700;
    background: #e3f2fd;
    color: #1565c0;
    margin-inline-start: 8px;
}

/* Responsive */
@media (max-width: 600px) {
    .hr-dashboard-cards { grid-template-columns: 1fr 1fr; }
    .hr-action-btn { padding: 14px 20px; font-size: 1rem; }
    .hr-table { font-size: 0.78rem; }
    .hr-table thead th, .hr-table tbody td { padding: 8px 6px; }
}
`;

css += hrCss;
fs.writeFileSync('style.css', css, 'utf8');
console.log('✅ style.css updated with HR styles');

// Update version numbers
['index.html', 'admin.html'].forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/v28\.6/g, 'v29.0');
    fs.writeFileSync(f, content, 'utf8');
});
console.log('✅ Version bumped to v29.0');
