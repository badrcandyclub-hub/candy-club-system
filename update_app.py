import sys

new_content = """
let ledgerCart = [];
let currentExportData = [];
let currentExportCategory = '';

// ==========================================
// 1. Ledger Modal Logic (محضر الاستلام)
// ==========================================
const openLedgerBtn = document.getElementById('openLedgerBtn');
const ledgerModal = document.getElementById('ledgerModal');

if (openLedgerBtn) {
    openLedgerBtn.addEventListener('click', () => {
        if (!document.getElementById('ledgerRegDate').value) {
            document.getElementById('ledgerRegDate').value = new Date().toISOString().split('T')[0];
        }
        ledgerModal.style.display = 'flex';
    });
}

window.closeLedgerModal = function() {
    ledgerModal.style.display = 'none';
};

// Add Item to Cart
const addLedgerItemBtn = document.getElementById('addLedgerItemBtn');
if (addLedgerItemBtn) {
    addLedgerItemBtn.addEventListener('click', () => {
        const name = document.getElementById('ledgerProdName').value;
        const qty = document.getElementById('ledgerProdQty').value;
        const date = document.getElementById('ledgerProdDate').value;
        const location = document.getElementById('ledgerProdLocation').value;
        const receiver = document.getElementById('ledgerProdReceiver').value;
        const notes = document.getElementById('ledgerProdNotes').value;

        if (!name || !qty || !date) {
            showToast("يرجى إكمال البيانات الأساسية (الاسم، الكمية، التاريخ)", "warning");
            return;
        }

        const item = {
            id: 'EXP-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            name: name,
            qty: qty,
            expiryDate: date,
            location: location,
            receiver: receiver,
            status: 'Active',
            notes: notes
        };

        ledgerCart.push(item);
        renderLedgerCart();

        // Clear item form but keep registrar info
        document.getElementById('ledgerProdName').value = '';
        document.getElementById('ledgerProdQty').value = '';
        document.getElementById('ledgerProdDate').value = '';
        document.getElementById('ledgerProdLocation').value = '';
        document.getElementById('ledgerProdReceiver').value = '';
        document.getElementById('ledgerProdNotes').value = '';
    });
}

function renderLedgerCart() {
    const tbody = document.getElementById('ledgerCartBody');
    const countSpan = document.getElementById('ledgerCartCount');
    if (!tbody) return;

    countSpan.innerText = ledgerCart.length;

    if (ledgerCart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #7f8c8d;">لا توجد منتجات مضافة حتى الآن.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    ledgerCart.forEach((item, index) => {
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;">${item.name}</td>
                <td style="padding: 8px;">${item.qty}</td>
                <td style="padding: 8px;" dir="ltr">${item.expiryDate}</td>
                <td style="padding: 8px;">${item.location || '-'}</td>
                <td style="padding: 8px; text-align: center;">
                    <button class="interactive-btn" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px;" onclick="removeLedgerItem(${index})">حذف</button>
                </td>
            </tr>
        `;
    });
}

window.removeLedgerItem = function(index) {
    ledgerCart.splice(index, 1);
    renderLedgerCart();
};

// Save Batch
const saveLedgerBtn = document.getElementById('saveLedgerBtn');
if (saveLedgerBtn) {
    saveLedgerBtn.addEventListener('click', () => {
        if (ledgerCart.length === 0) {
            showToast("السلة فارغة، يرجى إضافة منتجات أولاً.", "warning");
            return;
        }

        const regDate = document.getElementById('ledgerRegDate').value;
        const regName = document.getElementById('ledgerRegistrarName').value;

        if (!regDate || !regName) {
            showToast("يرجى إدخال تاريخ التسجيل واسم المسجل في أعلى المحضر.", "warning");
            return;
        }

        // Attach reg info to all items
        const payload = ledgerCart.map(item => ({
            ...item,
            regDate: regDate,
            registrarName: regName
        }));

        setBtnLoading(saveLedgerBtn, true, "جاري الحفظ...");

        let formData = new URLSearchParams();
        formData.append('action', 'addExpiriesBatch');
        formData.append('batchData', JSON.stringify(payload));

        fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
            .then(() => {
                showToast("✅ تم حفظ المحضر بنجاح!", "success");
                setBtnLoading(saveLedgerBtn, false);
                ledgerCart = [];
                renderLedgerCart();
                closeLedgerModal();
                loadExpiryData(); // Refresh the dashboard
            }).catch(() => {
                showToast("❌ حدث خطأ في الاتصال", "error");
                setBtnLoading(saveLedgerBtn, false);
            });
    });
}

// ==========================================
// 2. Dashboard Logic (إدارة الصلاحيات)
// ==========================================

function getDaysRemaining(expiryDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expiryDateStr);
    const timeDiff = expDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

function renderExpiryDashboard() {
    let countTotal = 0;
    let countCritical = 0;
    let countAlert = 0;
    let countAttention = 0;
    let countSafe = 0;
    let countFar = 0;

    let activeItems = expiryData.filter(item => item.status !== 'Done/Archived');
    
    activeItems.forEach(item => {
        countTotal++;
        const daysRemaining = getDaysRemaining(item.expiryDate);

        if (daysRemaining < 7 || isNaN(daysRemaining)) {
            countCritical++;
        } else if (daysRemaining < 30) {
            countAlert++;
        } else if (daysRemaining <= 90) {
            countAttention++;
        } else if (daysRemaining <= 180) {
            countSafe++;
        } else {
            countFar++;
        }
    });

    if(document.getElementById('expTotalItems')) document.getElementById('expTotalItems').innerText = countTotal;
    if(document.getElementById('expCriticalItems')) document.getElementById('expCriticalItems').innerText = countCritical;
    if(document.getElementById('expAlertItems')) document.getElementById('expAlertItems').innerText = countAlert;
    if(document.getElementById('expAttentionItems')) document.getElementById('expAttentionItems').innerText = countAttention;
    if(document.getElementById('expSafeItems')) document.getElementById('expSafeItems').innerText = countSafe;
    if(document.getElementById('expFarItems')) document.getElementById('expFarItems').innerText = countFar;
}

window.showExpiryDetails = function(category) {
    let filteredData = [];
    let title = "";

    let activeItems = expiryData.filter(item => item.status !== 'Done/Archived');

    activeItems.forEach(item => {
        const daysRemaining = getDaysRemaining(item.expiryDate);
        let matches = false;

        if (category === 'Total') {
            matches = true;
            title = "📦 إجمالي الأصناف المسجلة";
        } else if (category === 'Critical' && (daysRemaining < 7 || isNaN(daysRemaining))) {
            matches = true;
            title = "🔴 حرج جداً (أقل من 7 أيام)";
        } else if (category === 'Alert' && daysRemaining >= 7 && daysRemaining < 30) {
            matches = true;
            title = "🟠 تنبيه سريع (أقل من 30 يوم)";
        } else if (category === 'Attention' && daysRemaining >= 30 && daysRemaining <= 90) {
            matches = true;
            title = "🟡 انتباه ومراقبة (1 إلى 3 شهور)";
        } else if (category === 'Safe' && daysRemaining > 90 && daysRemaining <= 180) {
            matches = true;
            title = "🟢 مخزون آمن (3 إلى 6 شهور)";
        } else if (category === 'Far' && daysRemaining > 180) {
            matches = true;
            title = "🔵 تاريخ بعيد (أكثر من 6 شهور)";
        }

        if (matches) {
            filteredData.push({ ...item, daysRemaining });
        }
    });

    currentExportData = filteredData;
    currentExportCategory = title;

    document.getElementById('detailsTitle').innerText = title;
    const detailsList = document.getElementById('detailsList');
    
    if (filteredData.length === 0) {
        detailsList.innerHTML = '<p class="empty-msg">لا توجد أصناف في هذه الفئة.</p>';
    } else {
        detailsList.innerHTML = '';
        filteredData.forEach(item => {
            let daysColor = "";
            if (item.daysRemaining < 0) daysColor = "#c0392b";
            else if (item.daysRemaining < 7) daysColor = "#e74c3c";
            else if (item.daysRemaining < 30) daysColor = "#e67e22";
            else if (item.daysRemaining <= 90) daysColor = "#f39c12";
            else daysColor = "#27ae60";

            let daysText = item.daysRemaining < 0 ? `منتهي منذ ${Math.abs(item.daysRemaining)} يوم 🚨` : `باقي ${item.daysRemaining} يوم`;

            let rowClass = "expiry-item-row";
            let activeOfferStyle = "";
            if (item.status === 'Active Display') {
                rowClass += " active-offer";
                activeOfferStyle = 'style="border: 2px solid #ffeb3b; background: #fffde7;"';
            }

            const offerBtnText = item.status === 'Active Display' ? "إيقاف العرض ⏸" : "تشغيل العرض 🔥";
            const offerBtnColor = item.status === 'Active Display' ? "#e0e0e0" : "#fff3e0";
            const offerBtnAction = item.status === 'Active Display' ? "Active" : "Active Display";

            let formattedDate = new Date(item.expiryDate);
            formattedDate = isNaN(formattedDate.getTime()) ? item.expiryDate : formattedDate.toLocaleDateString('ar-EG');

            detailsList.innerHTML += `
                <div class="${rowClass}" ${activeOfferStyle}>
                    <h4>📦 ${item.name}</h4>
                    <div class="expiry-item-details">
                        <span>الكمية: ${item.qty}</span>
                        <span style="color: ${daysColor}; font-weight: bold;">${daysText}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: #7f8c8d; margin-bottom: 8px;">
                        📅 انتهاء: ${formattedDate} | 🏢 مكان: ${item.location || '-'}
                    </div>
                    <div class="expiry-item-actions">
                        <button class="btn-activate-offer interactive-btn" style="background: ${offerBtnColor};" onclick="changeExpiryStatus('${item.id}', '${offerBtnAction}')">${offerBtnText}</button>
                        <button class="btn-close-item interactive-btn" onclick="changeExpiryStatus('${item.id}', 'Done/Archived')">تم البيع ✖️</button>
                    </div>
                </div>
            `;
        });
    }

    document.getElementById('expiryDetailsSection').style.display = 'block';
    
    // Scroll to details gently
    setTimeout(() => {
        document.getElementById('expiryDetailsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
};

window.closeExpiryDetails = function() {
    document.getElementById('expiryDetailsSection').style.display = 'none';
};

// 3. Status Control (دورة حياة العرض)
window.changeExpiryStatus = function(id, newStatus) {
    let msg = "";
    if (newStatus === 'Active Display') msg = "هل تريد تفعيل العرض وجعل السطر فسفوري؟ 🔥";
    else if (newStatus === 'Active') msg = "هل تريد إيقاف العرض وإعادته للحالة الطبيعية؟";
    else if (newStatus === 'Done/Archived') msg = "هل تم الانتهاء من بيع هذا المنتج؟ سيتم إخفاؤه من هذه الشاشة. ✖️";

    if (!confirm(msg)) return;

    showToast("جاري التحديث...", "warning");

    let formData = new URLSearchParams();
    formData.append('action', 'updateExpiryStatus');
    formData.append('id', id);
    formData.append('status', newStatus);

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
            showToast("✅ تم تحديث الحالة بنجاح", "success");
            let item = expiryData.find(i => i.id == id);
            if(item) {
                item.status = newStatus;
            }
            renderExpiryDashboard();
            updateCatalogWithOffers();
            // Refresh details view if open
            if (document.getElementById('expiryDetailsSection').style.display === 'block') {
                closeExpiryDetails();
            }
        }).catch(() => {
            showToast("❌ خطأ في الاتصال بالإنترنت", "error");
        });
};

function updateCatalogWithOffers() {
    if (!catalogData || catalogData.length === 0) return;
    const activeOffers = expiryData.filter(item => item.status === 'Active Display').map(item => item.name);
    const catalogContainer = document.getElementById('catalogListContainer');
    if (catalogContainer) {
        const rows = catalogContainer.querySelectorAll('.data-row');
        rows.forEach(row => {
            const nameEl = row.querySelector('strong');
            if (nameEl) {
                const productName = nameEl.innerText.replace('🔥', '').replace('عرض خاص', '').trim();
                const hasOffer = activeOffers.some(offerName => productName.includes(offerName) || offerName.includes(productName));
                
                if (hasOffer) {
                    if (!nameEl.innerHTML.includes('🔥')) {
                        nameEl.innerHTML += ' <span style="background: #ffeb3b; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; color: #d35400;">عرض خاص 🔥</span>';
                        row.style.border = "2px solid #ffeb3b";
                    }
                } else {
                    if (nameEl.innerHTML.includes('عرض خاص')) {
                        nameEl.innerHTML = productName;
                        row.style.border = "none";
                    }
                }
            }
        });
    }
}

// ==========================================
// 3. Export Logic (تصدير متقدم ExcelJS)
// ==========================================

async function generateExcel(dataToExport, reportTitle) {
    if(!dataToExport || dataToExport.length === 0) {
        showToast("لا توجد بيانات للتصدير في هذه القائمة", "warning");
        return;
    }
    
    try {
        if (typeof ExcelJS === 'undefined') {
            showToast("جاري تجهيز محرك التصدير الذكي...", "warning");
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Candy Club System';
        workbook.created = new Date();

        const sheet1 = workbook.addWorksheet('البيانات التفصيلية', { views: [{ rightToLeft: true }] });
        
        sheet1.columns = [
            { header: 'ID', key: 'id', width: 15 },
            { header: 'اسم المنتج', key: 'name', width: 35 },
            { header: 'الكمية', key: 'qty', width: 12 },
            { header: 'تاريخ الانتهاء', key: 'date', width: 18 },
            { header: 'الأيام المتبقية', key: 'days', width: 15 },
            { header: 'تاريخ التسجيل', key: 'reg', width: 18 },
            { header: 'اسم المسجل', key: 'regname', width: 22 },
            { header: 'المكان / المورد', key: 'loc', width: 22 },
            { header: 'المستلم', key: 'rec', width: 18 },
            { header: 'الحالة', key: 'status', width: 18 },
            { header: 'ملاحظات', key: 'notes', width: 30 }
        ];

        sheet1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
        sheet1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
        sheet1.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        sheet1.getRow(1).height = 25;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Sort data by remaining days
        let sortedData = [...dataToExport].sort((a, b) => {
            let da = new Date(a.expiryDate).getTime();
            let db = new Date(b.expiryDate).getTime();
            return da - db;
        });

        sortedData.forEach(row => {
            const expDate = new Date(row.expiryDate);
            const timeDiff = expDate.getTime() - today.getTime();
            let daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
            let daysFormatted = isNaN(daysRemaining) ? '-' : daysRemaining;

            const newRow = sheet1.addRow({
                id: row.id || '',
                name: row.name || '',
                qty: row.qty || '',
                date: row.expiryDate || '',
                days: daysFormatted,
                reg: row.regDate || '',
                regname: row.registrarName || '',
                loc: row.location || '',
                rec: row.receiver || '',
                status: row.status || '',
                notes: row.notes || ''
            });

            newRow.alignment = { vertical: 'middle', horizontal: 'center' };
            newRow.height = 20;

            if (row.status !== 'Done/Archived' && !isNaN(daysRemaining)) {
                if (daysRemaining < 0) {
                    newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } }; 
                    newRow.font = { color: { argb: 'FFC0392B' }, bold: true };
                } else if (daysRemaining < 7) {
                    newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD6D6' } }; 
                } else if (daysRemaining < 30) {
                    newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } }; 
                } else if (daysRemaining <= 90) {
                    newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } }; 
                } else if (daysRemaining > 180) {
                    newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4E6F1' } }; 
                } else {
                    newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5F5E3' } }; 
                }
            }
            
            if (row.status === 'Done/Archived') {
                newRow.font = { color: { argb: 'FF95A5A6' }, italic: true };
                newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F4' } }; 
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        let safeTitle = reportTitle.replace(/[^a-zA-Z0-9أ-ي]/g, '_');
        link.download = `تقرير_${safeTitle}_${new Date().toLocaleDateString('en-CA')}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast("✅ تم تصدير التقرير الاحترافي بنجاح", "success");

    } catch (error) {
        console.error(error);
        showToast("❌ حدث خطأ أثناء التصدير", "error");
    }
}

// Export Current List Button (inside Details Section)
const exportCurrentListBtn = document.getElementById('exportCurrentListBtn');
if (exportCurrentListBtn) {
    exportCurrentListBtn.addEventListener('click', () => {
        setBtnLoading(exportCurrentListBtn, true, "تصدير...");
        generateExcel(currentExportData, currentExportCategory).then(() => {
            setBtnLoading(exportCurrentListBtn, false);
        });
    });
}

// Export by Month
const btnExportMonth = document.getElementById('btnExportMonth');
if (btnExportMonth) {
    btnExportMonth.addEventListener('click', () => {
        const monthVal = document.getElementById('exportMonthInput').value; // YYYY-MM
        if (!monthVal) {
            showToast("يرجى تحديد الشهر أولاً", "warning");
            return;
        }
        
        let filtered = expiryData.filter(item => {
            if (!item.expiryDate) return false;
            return item.expiryDate.startsWith(monthVal);
        });
        
        setBtnLoading(btnExportMonth, true, "تصدير...");
        generateExcel(filtered, 'شهر_' + monthVal).then(() => {
            setBtnLoading(btnExportMonth, false);
        });
    });
}

// Export by Registration Date
const btnExportDate = document.getElementById('btnExportDate');
if (btnExportDate) {
    btnExportDate.addEventListener('click', () => {
        const dateVal = document.getElementById('exportDateInput').value; // YYYY-MM-DD
        if (!dateVal) {
            showToast("يرجى تحديد يوم التسجيل أولاً", "warning");
            return;
        }
        
        let filtered = expiryData.filter(item => {
            if (!item.regDate) return false;
            // Handle date formats which might include time
            return item.regDate.includes(dateVal);
        });
        
        setBtnLoading(btnExportDate, true, "تصدير...");
        generateExcel(filtered, 'إدخالات_يوم_' + dateVal).then(() => {
            setBtnLoading(btnExportDate, false);
        });
    });
}
"""

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('function renderExpiryDashboard() {')
if start_idx != -1:
    content = content[:start_idx] + new_content
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Successfully updated app.js')
else:
    print('Error: Could not find renderExpiryDashboard in app.js')
