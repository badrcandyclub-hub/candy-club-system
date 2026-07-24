const fs = require('fs');

const appFile = 'd:/candy-club-system/app.js';
let app = fs.readFileSync(appFile, 'utf8');

app = app.replace(
    `let match = p.trim().match(/(.*?)\\s+\\((\\d+)\\)/);`,
    `let match = p.trim().match(/(.*?)\\s+\\((\\d+)\\)(?:\\s*\\[باركود:\\s*(.*?)\\])?/);`
);

app = app.replace(
    `<td style="text-align: right;">\${item.name} \${item.barcode ? '<br><small style="color:#666">'+item.barcode+'</small>' : ''}</td>`,
    `<td style="text-align: right; font-weight: bold;">\${item.name}</td>
            <td style="text-align: center; font-family: monospace; font-size: 11px; color: #333;">\${item.barcode || '-'}</td>`
);

app = app.replace(
    `<span>\${item.name} \${item.barcode ? '<br><small style="font-size:0.7rem; color:#666">'+item.barcode+'</small>' : ''}</span>\n                <span>\${item.qty}</span>`,
    `<span style="flex: 2; text-align: right; font-weight: bold;">\${item.name}</span>\n                <span style="flex: 1.5; text-align: center; font-family: monospace; font-size: 11px; color: #333;">\${item.barcode || '-'}</span>\n                <span style="flex: 1; text-align: center; font-weight: bold;">\${item.qty}</span>`
);

fs.writeFileSync(appFile, app, 'utf8');
console.log('Final barcode replace complete');
