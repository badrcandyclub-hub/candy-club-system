const fs = require('fs');

const appFile = 'd:/candy-club-system/app.js';
let app = fs.readFileSync(appFile, 'utf8');

function getFunctionRange(src, funcName, startIndex = 0) {
    const fnIdx = src.indexOf(funcName, startIndex);
    if (fnIdx === -1) return null;
    const braceStart = src.indexOf('{', fnIdx);
    let count = 1;
    let i = braceStart + 1;
    while (i < src.length && count > 0) {
        if (src[i] === '{') count++;
        else if (src[i] === '}') count--;
        i++;
    }
    return { start: fnIdx, end: i };
}

const print1 = getFunctionRange(app, 'function printInventoryReceipt', 0);
const print2 = getFunctionRange(app, 'function printInventoryReceipt', print1.end);
const reprint1 = getFunctionRange(app, 'window.reprintInvLog = function', 0);
const reprint2 = getFunctionRange(app, 'window.reprintInvLog = function', reprint1.end);

console.log('Ranges:', { print1, print2, reprint1, reprint2 });

const newReprintFunc = `window.reprintInvLog = function(logId) {
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
        <tr style="border-bottom: 1px dashed #000;">
            <td style="text-align: right; padding: 6px 4px; vertical-align: top;">
                <div style="font-weight: bold; font-size: 13px; line-height: 1.3; word-break: break-word; white-space: normal; color: #000;">\${item.name}</div>
                \${item.barcode ? \`<div style="font-family: monospace; font-size: 11px; font-weight: bold; color: #000; letter-spacing: 0.5px; margin-top: 2px;">\${item.barcode}</div>\` : ''}
            </td>
            <td style="text-align: center; padding: 6px 4px; vertical-align: top; font-weight: bold; font-size: 14px; color: #000; width: 45px;">\${item.qty}</td>
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
                @page { margin: 5mm; }
                body { font-family: 'Cairo', Tahoma, sans-serif; margin: 0; padding: 10px; color: #000; font-size: 13px; background: #fff; line-height: 1.4; }
                .receipt-header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
                .receipt-title { font-size: 17px; font-weight: bold; margin: 0 0 4px 0; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th { border-bottom: 2px solid #000; padding: 6px 4px; font-size: 13px; text-align: right; }
                td { padding: 6px 4px; }
                .notes { margin-top: 8px; font-size: 12px; border-top: 1px solid #000; padding-top: 5px; }
                .footer { text-align: center; margin-top: 12px; font-size: 11px; }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                <h2 class="receipt-title">إذن حركة مخازن</h2>
                <div style="font-size: 14px; font-weight: bold; margin-bottom: 3px;">#\${log.logId}</div>
                <div style="font-size: 11px;">تاريخ: <span dir="ltr">\${log.timestamp}</span></div>
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
                        <th style="text-align: center; width: 45px;">الكمية</th>
                    </tr>
                </thead>
                <tbody>
                    \${itemsHtml}
                </tbody>
            </table>
            
            \${log.notes ? \`<div class="notes"><b>ملاحظات:</b> \${log.notes}</div>\` : ''}
            
            <div style="margin-top: 12px; display: flex; justify-content: space-between; font-size: 11px;">
                <div style="text-align: center;">
                    <b>توقيع المُسلم</b><br>...................
                </div>
                <div style="text-align: center;">
                    <b>توقيع المُستلم</b><br>...................
                </div>
            </div>

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

const newPrintReceiptFunc = `function printInventoryReceipt(logId, from, to, items, notes, senderName, regName) {
    let printWindow = window.open('', '_blank', 'height=600,width=450');
    if (!printWindow) {
        showToast("برجاء تفعيل النوافذ المنبثقة (Pop-ups) للطباعة", "error");
        return;
    }

    let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += \`
            <tr style="border-bottom: 1px dashed #000;">
                <td style="text-align: right; padding: 6px 4px; vertical-align: top;">
                    <div style="font-weight: bold; font-size: 13px; line-height: 1.3; word-break: break-word; white-space: normal; color: #000;">\${item.name}</div>
                    \${item.barcode ? \`<div style="font-family: monospace; font-size: 11px; font-weight: bold; color: #000; letter-spacing: 0.5px; margin-top: 2px;">\${item.barcode}</div>\` : ''}
                </td>
                <td style="text-align: center; padding: 6px 4px; vertical-align: top; font-weight: bold; font-size: 14px; color: #000; width: 45px;">\${item.qty}</td>
            </tr>
        \`;
    });

    let now = new Date();
    let timeStr = now.toLocaleString('en-GB');

    let html = \`
        <html dir="rtl" lang="ar">
        <head>
            <title>إذن مخزن #\${logId}</title>
            <style>
                @page { margin: 5mm; }
                body {
                    font-family: 'Cairo', Tahoma, sans-serif;
                    margin: 0;
                    padding: 10px;
                    color: #000;
                    background: #fff;
                    font-size: 13px;
                    line-height: 1.4;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 8px;
                    margin-bottom: 8px;
                }
                .title {
                    font-size: 17px;
                    font-weight: 700;
                    margin: 0 0 4px 0;
                }
                .log-id {
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 3px;
                }
                .meta-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                    font-size: 12px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 8px;
                }
                th {
                    text-align: right;
                    padding: 6px 4px;
                    border-bottom: 2px solid #000;
                    font-weight: bold;
                    font-size: 13px;
                }
                td {
                    padding: 6px 4px;
                }
                .notes-section {
                    margin-top: 8px;
                    font-size: 12px;
                    border-top: 1px solid #000;
                    padding-top: 5px;
                }
                .footer {
                    text-align: center;
                    margin-top: 12px;
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
            
            <div class="meta-row" style="margin-top:3px;">
                <span><b>مُسلم:</b> \${senderName || '---'}</span>
                <span><b>مُستلم:</b> .......................</span>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="text-align: right;">الصنف</th>
                        <th style="text-align: center; width: 45px;">الكمية</th>
                    </tr>
                </thead>
                <tbody>
                    \${itemsHtml}
                </tbody>
            </table>
            
            \${notes ? \`
            <div class="notes-section">
                <b>ملاحظات:</b> \${notes}
            </div>\` : ''}
            
            <div style="margin-top: 12px; display: flex; justify-content: space-between; font-size: 11px;">
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

// Replace ranges from bottom to top
let ranges = [
    { type: 'print2', start: print2.start, end: print2.end, code: newPrintReceiptFunc },
    { type: 'reprint2', start: reprint2.start, end: reprint2.end, code: newReprintFunc },
    { type: 'reprint1', start: reprint1.start, end: reprint1.end, code: newReprintFunc },
    { type: 'print1', start: print1.start, end: print1.end, code: newPrintReceiptFunc }
].sort((a, b) => b.start - a.start);

ranges.forEach(r => {
    app = app.substring(0, r.start) + r.code + app.substring(r.end);
});

fs.writeFileSync(appFile, app, 'utf8');
console.log('Brace matching replacement done!');
