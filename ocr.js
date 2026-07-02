// ==========================================
// OCR Scanner Logic for Goods Receiving
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const ocrBtn = document.getElementById('startOcrScannerBtn');
    const ocrInput = document.getElementById('ocrImageInput');
    const overlay = document.getElementById('ocrProcessingOverlay');
    const reviewModal = document.getElementById('ocrReviewModal');
    const reviewList = document.getElementById('ocrReviewList');
    const confirmBtn = document.getElementById('confirmOcrBtn');
    const cancelBtn = document.getElementById('cancelOcrBtn');

    let extractedItems = [];

    if (ocrBtn && ocrInput) {
        ocrBtn.addEventListener('click', () => {
            ocrInput.value = '';
            ocrInput.click();
        });

        ocrInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            overlay.style.display = 'flex';
            
            try {
                // Initialize Tesseract worker
                const worker = await Tesseract.createWorker('ara+eng');
                
                // Recognize text
                const { data: { text } } = await worker.recognize(file);
                await worker.terminate();

                console.log("OCR Text Extracted:\n", text);
                
                // Parse text to find products and quantities
                extractedItems = parseOcrText(text);

                overlay.style.display = 'none';

                if (extractedItems.length === 0) {
                    showToast('لم يتم العثور على منتجات معروفة في الفاتورة.', 'warning');
                } else {
                    renderReviewModal(extractedItems);
                    reviewModal.style.display = 'flex';
                }

            } catch (error) {
                console.error("OCR Error:", error);
                overlay.style.display = 'none';
                showToast('حدث خطأ أثناء قراءة الصورة.', 'error');
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            reviewModal.style.display = 'none';
            extractedItems = [];
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            // Read modified data from the review modal
            const rows = document.querySelectorAll('.ocr-review-row');
            rows.forEach((row, index) => {
                const name = document.getElementById(`ocrName_${index}`).value;
                const qty = document.getElementById(`ocrQty_${index}`).value;
                
                if (name.trim() && qty > 0) {
                    // Push to ledgerCart (defined in app.js)
                    ledgerCart.push({
                        name: name.trim(),
                        qty: parseInt(qty) || 1,
                        expiryDate: '',
                        location: '',
                        notes: 'تم استخراجه بالذكاء الاصطناعي'
                    });
                }
            });
            
            // Re-render ledger cart
            if (typeof renderLedgerCart === 'function') {
                renderLedgerCart();
            }
            
            reviewModal.style.display = 'none';
            showToast('✅ تم إضافة المنتجات للمحضر بنجاح', 'success');
        });
    }

    function parseOcrText(text) {
        let items = [];
        const lines = text.split('\n');
        
        // Basic heuristic: check if line contains any known catalog product name
        // And try to find numbers in the line for quantity.
        
        const catalogNames = (window.catalogData || []).map(p => p.name);
        
        lines.forEach(line => {
            let matchedName = null;
            // 1. Try to match catalog items
            for (let name of catalogNames) {
                if (line.includes(name)) {
                    matchedName = name;
                    break;
                }
            }
            
            // 2. Extract number (qty) from the line
            let qty = 1;
            const numbers = line.match(/\d+/g);
            if (numbers && numbers.length > 0) {
                // Heuristic: usually qty is the first or last small number, or just take the first number < 1000
                for (let num of numbers) {
                    let n = parseInt(num);
                    if (n > 0 && n < 1000) {
                        qty = n;
                        break;
                    }
                }
            }

            if (matchedName) {
                items.push({ name: matchedName, qty: qty });
            } else if (line.trim().length > 4 && line.trim().length < 50) {
                // If it looks like an item but didn't match catalog perfectly
                // Only push if it has some arabic characters
                const hasArabic = /[\u0600-\u06FF]/.test(line);
                if (hasArabic) {
                    items.push({ name: line.trim(), qty: qty });
                }
            }
        });
        
        // Remove duplicates or noise (optional)
        return items.filter((item, index, self) => 
            index === self.findIndex((t) => (t.name === item.name))
        );
    }

    function renderReviewModal(items) {
        reviewList.innerHTML = '';
        items.forEach((item, index) => {
            reviewList.innerHTML += `
                <div class="ocr-review-row" style="display:flex; gap:10px; align-items:center; background:#f9f9f9; padding:10px; border-radius:8px; border:1px solid #ddd;">
                    <div style="flex: 2;">
                        <label style="font-size:0.8rem; font-weight:bold; color:var(--primary);">الصنف المستخرج:</label>
                        <input type="text" id="ocrName_${index}" value="${item.name}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:5px; margin-bottom:0;">
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size:0.8rem; font-weight:bold; color:var(--primary);">الكمية:</label>
                        <input type="number" id="ocrQty_${index}" value="${item.qty}" min="1" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:5px; margin-bottom:0;">
                    </div>
                    <button class="btn-cancel interactive-btn" onclick="this.parentElement.remove()" style="padding:8px 12px; margin-top:20px;">حذف 🗑</button>
                </div>
            `;
        });
    }
});
