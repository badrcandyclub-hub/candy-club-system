const fs = require('fs');

const appFile = 'd:/candy-club-system/app.js';
let app = fs.readFileSync(appFile, 'utf8');

// Fix parsing regex in reprintInvLog (lines 7399 and 7923)
app = app.replace(
    /let match = p\.trim\(\)\.match\(\/\(\.\*\?\)\\s\+\\\((\\d\+)\)\/\);/g,
    `let match = p.trim().match(/(.*?)\\s+\\((\\d+)\\)(?:\\s*\\[باركود:\\s*(.*?)\\])?/);`
);

// Fix mapping in reprintInvLog to extract barcode properly
app = app.replace(
    /if \(match\) return \{ name: match\[1\]\.trim\(\), qty: match\[2\] \};/g,
    `if (match) {
                    let name = match[1].trim();
                    let qty = match[2];
                    let barcode = match[3] ? match[3].replace(']', '').trim() : '';
                    return { name, qty, barcode };
                }`
);

// Fix reprintInvLog table row HTML
app = app.replace(
    /<td style="text-align: right;">\${item\.name} \${item\.barcode \? '<br><small style="color:#666">\'+item\.barcode\+'<\/small>' : ''}<\/td>\s*<td style="text-align: center;"><b>\${item\.qty}<\/b><\/td>/g,
    `<td style="text-align: right; font-weight: bold;">\${item.name}</td>
            <td style="text-align: center; font-family: monospace; font-size: 11px; color: #333;">\${item.barcode || '-'}</td>
            <td style="text-align: center; font-weight: bold;">\${item.qty}</td>`
);

// Fix reprintInvLog th HTML
app = app.replace(
    /<th style="text-align: right;">الصنف<\/th>\s*<th style="text-align: center; width: 40px;">الكمية<\/th>/g,
    `<th style="text-align: right;">الصنف</th>
                        <th style="text-align: center;">الباركود</th>
                        <th style="text-align: center; width: 50px;">الكمية</th>`
);

// Fix printInventoryReceipt (line 8011) itemsHtml
app = app.replace(
    /let itemsHtml = '';\s*items\.forEach\(item => \{\s*itemsHtml \+= `\s*<div class="item-row">\s*<span>\${item\.name} \${item\.barcode \? '<br><small style="font-size:0\.7rem; color:#666">\'+item\.barcode\+'<\/small>' : ''}<\/span>\s*<span>\${item\.qty}<\/span>\s*<\/div>\s*`;\s*\}\);/g,
    `let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += \`
            <div class="item-row" style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dotted #ccc;">
                <span style="flex: 2; text-align: right; font-weight: bold;">\${item.name}</span>
                <span style="flex: 1.5; text-align: center; font-family: monospace; font-size: 11px; color: #333;">\${item.barcode || '-'}</span>
                <span style="flex: 1; text-align: center; font-weight: bold;">\${item.qty}</span>
            </div>
        \`;
    });`
);

// Fix printInventoryReceipt item-header
app = app.replace(
    /<div class="item-header">\s*<span>الصنف<\/span>\s*<span>الكمية<\/span>\s*<\/div>/g,
    `<div class="item-header" style="display: flex; justify-content: space-between; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 4px;">
                    <span style="flex: 2; text-align: right;">الصنف</span>
                    <span style="flex: 1.5; text-align: center;">الباركود</span>
                    <span style="flex: 1; text-align: center;">الكمية</span>
                </div>`
);

fs.writeFileSync(appFile, app, 'utf8');
console.log('Regex barcode print replacement complete!');
