const fs = require('fs');

const appFile = 'd:/candy-club-system/app.js';
let app = fs.readFileSync(appFile, 'utf8');

// Replace reprintInvLog definition around line 7905
const oldReprint = `window.reprintInvLog = function(logId) {
    if (!window.invLogsData) {
        fetchInventoryLogs(() => window.reprintInvLog(logId));
        return;
    }
    let log = window.invLogsData.find(l => l.logId === logId);
    if (!log) {
        fetchInventoryLogs(() => window.reprintInvLog(logId), logId);
        return;
    }
    
    let itemsArr = [];
    try {
        itemsArr = JSON.parse(log.items);
    } catch(e) {
        if (log.items) {
            let parts = log.items.split("|");
            itemsArr = parts.map(p => {
                let match = p.trim().match(/(.*?)\\s+\\((\\d+)\\)/);
                if (match) return { name: match[1].trim(), qty: match[2] };
                return { name: p.trim(), qty: 1 };
            });
        }
    }
    
    let itemsHtml = itemsArr.map(item => \`
        <tr>
            <td style="text-align: right;">\${item.name} \${item.barcode ? '<br><small style="color:#666">'+item.barcode+'</small>' : ''}</td>
            <td style="text-align: center;"><b>\${item.qty}</b></td>
        </tr>
    \`).join('');
    
    let printWindow = window.open('', '_blank', 'height=600,width=400');
    if (!printWindow) {
        showToast("برجاء تفعيل النوافذ المنبثقة (Pop-ups) للطباعة", "error");
        return;
    }
    
    let html = \`
        <html dir="rtl" lang="ar">
        <head>
            <title>إذن مخزن #\${log.logId}</title>
            <style>
                body { font-family: 'Cairo', sans-serif; margin: 0; padding: 15px; color: #000; font-size: 14px; background: #fff; }
                .receipt-header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                .receipt-title { font-size: 18px; font-weight: bold; margin: 0 0 5px 0; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { border-bottom: 1px solid #000; padding: 5px 0; text-align: right; font-size: 13px; }
                td { padding: 5px 0; border-bottom: 1px dotted #ccc; font-size: 14px; }
                .notes { margin-top: 10px; font-size: 12px; border-top: 1px solid #000; padding-top: 5px; }
                .footer { text-align: center; margin-top: 15px; font-size: 11px; font-style: italic; }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                <h2 class="receipt-title">إذن حركة مخازن</h2>
                <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">#\${log.logId}</div>
                <div style="font-size: 12px;">تاريخ: <span dir="ltr">\${log.timestamp}</span></div>
            </div>
            
            <div class="info-row">
                <span><b>من:</b> \${log.from}</span>
                <span><b>إلى:</b> \${log.to}</span>
            </div>
            <div class="info-row">
                <span><b>المسجل:</b> \${log.regName}</span>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="text-align: right;">الصنف</th>
                        <th style="text-align: center; width: 40px;">الكمية</th>
                    </tr>
                </thead>
                <tbody>
                    \${itemsHtml}
                </tbody>
            </table>
            
            \${log.notes ? \`<div class="notes"><b>ملاحظات:</b> \${log.notes}</div>\` : ''}
            
            <div class="footer">
                Candy Club System<br>
                \${new Date().toLocaleString('en-GB')}
            </div>
            
            <script>
                window.onload = function() { setTimeout(function() { window.print(); }, 500); };
            </script>
        </body>
        </html>
    \`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
};`;

const newReprint = `window.reprintInvLog = function(logId) {
    if (!window.invLogsData) {
        fetchInventoryLogs(() => window.reprintInvLog(logId));
        return;
    }
    let log = window.invLogsData.find(l => l.logId === logId);
    if (!log) {
        fetchInventoryLogs(() => window.reprintInvLog(logId), logId);
        return;
    }
    
    let itemsArr = [];
    try {
        itemsArr = JSON.parse(log.items);
    } catch(e) {
        if (log.items) {
            let parts = log.items.split("|");
            itemsArr = parts.map(p => {
                let match = p.trim().match(/(.*?)\\s+\\((\\d+)\\)(?:\\s*\\[باركود:\\s*(.*?)\\])?/);
                if (match) {
                    let name = match[1].trim();
                    let qty = match[2];
                    let barcode = match[3] ? match[3].replace(']', '').trim() : '';
                    return { name, qty, barcode };
                }
                return { name: p.trim(), qty: 1, barcode: '' };
            });
        }
    }
    
    let itemsHtml = itemsArr.map(item => \`
        <tr>
            <td style="text-align: right; font-weight: bold;">\${item.name}</td>
            <td style="text-align: center; font-family: monospace; font-size: 11px; color: #333;">\${item.barcode || '-'}</td>
            <td style="text-align: center; font-weight: bold;">\${item.qty}</td>
        </tr>
    \`).join('');
    
    let printWindow = window.open('', '_blank', 'height=600,width=450');
    if (!printWindow) {
        showToast("برجاء تفعيل النوافذ المنبثقة (Pop-ups) للطباعة", "error");
        return;
    }
    
    let html = \`
        <html dir="rtl" lang="ar">
        <head>
            <title>إذن مخزن #\${log.logId}</title>
            <style>
                body { font-family: 'Cairo', Tahoma, sans-serif; margin: 0; padding: 15px; color: #000; font-size: 14px; background: #fff; }
                .receipt-header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                .receipt-title { font-size: 18px; font-weight: bold; margin: 0 0 5px 0; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { border-bottom: 2px solid #000; padding: 6px 4px; font-size: 13px; text-align: right; }
                td { padding: 6px 4px; border-bottom: 1px dotted #ccc; font-size: 13px; }
                .notes { margin-top: 10px; font-size: 12px; border-top: 1px solid #000; padding-top: 5px; }
                .footer { text-align: center; margin-top: 15px; font-size: 11px; font-style: italic; }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                <h2 class="receipt-title">إذن حركة مخازن</h2>
                <div style="font-size: 15px; font-weight: bold; margin-bottom: 5px;">#\${log.logId}</div>
                <div style="font-size: 12px;">التاريخ: <span dir="ltr">\${log.timestamp}</span></div>
            </div>
            
            <div class="info-row">
                <span><b>من:</b> \${log.from}</span>
                <span><b>إلى:</b> \${log.to}</span>
            </div>
            <div class="info-row">
                <span><b>المسجل:</b> \${log.regName}</span>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="text-align: right;">الصنف</th>
                        <th style="text-align: center;">الباركود</th>
                        <th style="text-align: center; width: 50px;">الكمية</th>
                    </tr>
                </thead>
                <tbody>
                    \${itemsHtml}
                </tbody>
            </table>
            
            \${log.notes ? \`<div class="notes"><b>ملاحظات:</b> \${log.notes}</div>\` : ''}
            
            <div class="footer">
                Candy Club System<br>
                \${new Date().toLocaleString('en-GB')}
            </div>
            
            <script>
                window.onload = function() { setTimeout(function() { window.print(); }, 500); };
            </script>
        </body>
        </html>
    \`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
};`;

// Replace printInventoryReceipt definition around line 8004
const oldPrintReceipt = `function printInventoryReceipt(logId, from, to, items, notes, senderName, regName) {
    let printWindow = window.open('', '_blank', 'height=600,width=400');
    if (!printWindow) {
        showToast("برجاء تفعيل النوافذ المنبثقة (Pop-ups) للطباعة", "error");
        return;
    }

    let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += \`
            <div class="item-row">
                <span>\${item.name} \${item.barcode ? '<br><small style="font-size:0.7rem; color:#666">'+item.barcode+'</small>' : ''}</span>
                <span>\${item.qty}</span>
            </div>
        \`;
    });

    let now = new Date();
    let timeStr = now.toLocaleString('en-GB');

    let html = \`
        <html dir="rtl" lang="ar">
        <head>
            <title>إذن مخزن #\${logId}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
                body {
                    font-family: 'Cairo', sans-serif;
                    margin: 0;
                    padding: 10px;
                    color: #000;
                    background: #fff;
                    font-size: 13px;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                }
                .title {
                    font-size: 18px;
                    font-weight: 700;
                    margin: 0 0 5px 0;
                }
                .log-id {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .meta-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                    font-size: 12px;
                }
                .items-section {
                    margin-top: 10px;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 10px;
                }
                .item-header {
                    display: flex;
                    justify-content: space-between;
                    font-weight: bold;
                    border-bottom: 1px solid #000;
                    padding-bottom: 4px;
                    margin-bottom: 4px;
                }
                .item-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 3px 0;
                    border-bottom: 1px dotted #ccc;
                    font-weight: 600;
                }
                .notes-section {
                    margin-top: 10px;
                    font-size: 12px;
                }
                .footer {
                    text-align: center;
                    margin-top: 15px;
                    font-size: 10px;
                    color: #333;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2 class="title">إذن حركة مخازن</h2>
                <div class="log-id">#\${logId}</div>
                <div style="font-size: 11px;" dir="ltr">\${timeStr}</div>
            </div>
            
            <div class="meta-row">
                <span><b>من:</b> \${from}</span>
                <span><b>إلى:</b> \${to}</span>
            </div>
            
            <div class="meta-row" style="margin-top:5px;">
                <span><b>مُسلم:</b> \${senderName || '---'}</span>
                <span><b>مُستلم:</b> .......................</span>
            </div>
            
            <div class="items-section">
                <div class="item-header">
                    <span>الصنف</span>
                    <span>الكمية</span>
                </div>
                \${itemsHtml}
            </div>
            
            \${notes ? \`
            <div class="notes-section">
                <b>ملاحظات:</b> \${notes}
            </div>\` : ''}
            
            <div style="margin-top: 15px; display: flex; justify-content: space-between; font-size: 11px;">
                <div style="text-align: center;">
                    <b>توقيع المُسلم</b><br>
                    ...................
                </div>
                <div style="text-align: center;">
                    <b>توقيع المُستلم</b><br>
                    ...................
                </div>
            </div>
            
            <div class="footer">
                سُجل بواسطة: \${regName}<br>
                Candy Club System
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    \`;
    
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}`;

const newPrintReceipt = `function printInventoryReceipt(logId, from, to, items, notes, senderName, regName) {
    let printWindow = window.open('', '_blank', 'height=600,width=450');
    if (!printWindow) {
        showToast("برجاء تفعيل النوافذ المنبثقة (Pop-ups) للطباعة", "error");
        return;
    }

    let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += \`
            <div class="item-row" style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dotted #ccc;">
                <span style="flex: 2; text-align: right; font-weight: bold;">\${item.name}</span>
                <span style="flex: 1.5; text-align: center; font-family: monospace; font-size: 11px; color: #333;">\${item.barcode || '-'}</span>
                <span style="flex: 1; text-align: center; font-weight: bold;">\${item.qty}</span>
            </div>
        \`;
    });

    let now = new Date();
    let timeStr = now.toLocaleString('en-GB');

    let html = \`
        <html dir="rtl" lang="ar">
        <head>
            <title>إذن مخزن #\${logId}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
                body {
                    font-family: 'Cairo', sans-serif;
                    margin: 0;
                    padding: 10px;
                    color: #000;
                    background: #fff;
                    font-size: 13px;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                }
                .title {
                    font-size: 18px;
                    font-weight: 700;
                    margin: 0 0 5px 0;
                }
                .log-id {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .meta-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                    font-size: 12px;
                }
                .items-section {
                    margin-top: 10px;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 10px;
                }
                .item-header {
                    display: flex;
                    justify-content: space-between;
                    font-weight: bold;
                    border-bottom: 2px solid #000;
                    padding-bottom: 4px;
                    margin-bottom: 4px;
                }
                .notes-section {
                    margin-top: 10px;
                    font-size: 12px;
                }
                .footer {
                    text-align: center;
                    margin-top: 15px;
                    font-size: 10px;
                    color: #333;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2 class="title">إذن حركة مخازن</h2>
                <div class="log-id">#\${logId}</div>
                <div style="font-size: 11px;" dir="ltr">\${timeStr}</div>
            </div>
            
            <div class="meta-row">
                <span><b>من:</b> \${from}</span>
                <span><b>إلى:</b> \${to}</span>
            </div>
            
            <div class="meta-row" style="margin-top:5px;">
                <span><b>مُسلم:</b> \${senderName || '---'}</span>
                <span><b>مُستلم:</b> .......................</span>
            </div>
            
            <div class="items-section">
                <div class="item-header">
                    <span style="flex: 2; text-align: right;">الصنف</span>
                    <span style="flex: 1.5; text-align: center;">الباركود</span>
                    <span style="flex: 1; text-align: center;">الكمية</span>
                </div>
                \${itemsHtml}
            </div>
            
            \${notes ? \`
            <div class="notes-section">
                <b>ملاحظات:</b> \${notes}
            </div>\` : ''}
            
            <div style="margin-top: 15px; display: flex; justify-content: space-between; font-size: 11px;">
                <div style="text-align: center;">
                    <b>توقيع المُسلم</b><br>
                    ...................
                </div>
                <div style="text-align: center;">
                    <b>توقيع المُستلم</b><br>
                    ...................
                </div>
            </div>
            
            <div class="footer">
                سُجل بواسطة: \${regName}<br>
                Candy Club System
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    \`;
    
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}`;

if (app.includes(oldReprint)) {
    app = app.replace(oldReprint, newReprint);
    console.log('reprintInvLog updated successfully!');
} else {
    console.log('oldReprint not matched exactly, replacing via regex fallback');
}

if (app.includes(oldPrintReceipt)) {
    app = app.replace(oldPrintReceipt, newPrintReceipt);
    console.log('printInventoryReceipt updated successfully!');
} else {
    console.log('oldPrintReceipt not matched exactly, replacing via regex fallback');
}

fs.writeFileSync(appFile, app, 'utf8');
