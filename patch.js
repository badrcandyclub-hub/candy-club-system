const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');
let startStr = 'window.executePdfExport = function() {';
let endStr = 'window.toggleBarcodePrint = function() {';
let startIdx = code.indexOf(startStr);
let endIdx = code.indexOf(endStr);
if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find start or end index');
    process.exit(1);
}

let newCode = `window.executePdfExport = function() {
    const size = document.getElementById('pdfSizeSelect').value;
    closePdfExportModal();
    
    if (selectedPriceTagsMap.size === 0) {
        showToast("برجاء تحديد منتج واحد على الأقل", "warning");
        return;
    }
    
    showToast("جاري تجهيز صفحة الطباعة الاحترافية... (بدون أي أخطاء أو استهلاك للذاكرة)", "success");
    
    let itemsToPrint = Array.from(selectedPriceTagsMap.values());
    
    // Determine how many items fit perfectly on an A4 page based on size
    let itemsPerPage = 8; // medium
    if (size === 'small') itemsPerPage = 18;
    else if (size === 'large') itemsPerPage = 4;
    
    // Chunk items into pages
    let pages = [];
    for (let i = 0; i < itemsToPrint.length; i += itemsPerPage) {
        pages.push(itemsToPrint.slice(i, i + itemsPerPage));
    }

    const logoUrl = new URL('images/Logo-print.png', window.location.href).href;
    
    // Create an invisible div in current window to render everything and generate barcodes
    const renderDiv = document.createElement('div');
    renderDiv.style.display = 'none';
    
    let allPagesHtml = '';
    
    pages.forEach((pageItems, index) => {
        let cardsHtml = '';
        pageItems.forEach(p => {
            cardsHtml += generatePriceTagHTML(p, size);
        });
        
        cardsHtml = cardsHtml.replace(/src="images\\/Logo-print\\.png"/g, \\\`src="\\${logoUrl}"\\\`)
                             .replace(/onerror="this\\.src='images\\/logo-digital\\.png'"/g, \\\`onerror="this.style.display='none'"\\\`);
                             
        allPagesHtml += \\\`
            <div class="a4-page">
                <div class="price-tags-grid" style="display:flex;flex-wrap:wrap;gap:15px;justify-content:flex-start;align-content:flex-start;width:100%;height:100%;direction:rtl;">
                    \\${cardsHtml}
                </div>
            </div>
        \\\`;
    });
    
    renderDiv.innerHTML = allPagesHtml;
    document.body.appendChild(renderDiv);
    
    // Render SVGs in the invisible container (synchronous)
    renderBarcodes(renderDiv, size);
    
    // Get the final HTML with fully rendered SVGs
    const finalHtml = renderDiv.innerHTML;
    document.body.removeChild(renderDiv);
    
    // Open Print Window
    const printWin = window.open('', '_blank');
    if (!printWin) {
        showToast("برجاء السماح بالنوافذ المنبثقة (Pop-ups) للطباعة أعلى المتصفح", "error");
        return;
    }
    
    let hideBarcode = document.getElementById('hideBarcodeToggle') && document.getElementById('hideBarcodeToggle').checked;
    let styleUrl = new URL('style.css', window.location.href).href;
    
    const printDoc = printWin.document;
    printDoc.write(\\\`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>طباعة كروت الأسعار - Candy Club</title>
            <link rel="stylesheet" href="\\${styleUrl}">
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                @page { size: A4 portrait; margin: 0; }
                body { 
                    margin: 0; padding: 0; 
                    background: white; 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact; 
                    direction: rtl; 
                    font-family: 'Cairo', sans-serif;
                }
                .a4-page {
                    width: 210mm;
                    height: 297mm;
                    padding: 10mm;
                    box-sizing: border-box;
                    page-break-after: always;
                    background: white;
                    position: relative;
                    overflow: hidden;
                }
                .a4-page:last-child {
                    page-break-after: auto;
                }
                \\${hideBarcode ? '.qr-section { display: none !important; }' : ''}
            </style>
        </head>
        <body>
            \\${finalHtml}
            <script>
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                    }, 800); // Wait for fonts and logos to load fully
                };
            </script>
        </body>
        </html>
    \\\`);
    
    printDoc.close();
};

`;
code = code.substring(0, startIdx) + newCode + code.substring(endIdx);
fs.writeFileSync('app.js', code);
console.log('done');
