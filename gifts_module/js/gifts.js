/**
 * ================================================================
 * Candy Club Gifts Module - Core Logic & Architecture
 * منطق وتطبيق قسم الهدايا والبوكيهات بالكامل
 * ================================================================
 */

(function(window) {
    'use strict';

    const GOOGLE_DRIVE_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwx-tcJs67wcNR9adRLE70meZUjpeWSVpmDGIY1qJj5owFbIfWt5Sq8y6Kd3CYr7jdb/exec';
    const GIFTS_TABLE = 'gifts';
    const GIFTS_TEMPLATES_TABLE = 'gifts_templates';

    // مساحة الأسماء المعزولة لقسم الهدايا
    const GiftsApp = {
        state: {
            currentSubTab: 'builder',
            draft: {
                name: '',
                creator: '',
                qty: 1,
                colorTag: '#E91E8C',
                items: [],
                photoBase64: null,
                photoSizeKB: 0
            },
            catalogProducts: [],
            bouquets: [],
            templates: [],
            cameraStream: null,
            barcodeScannerInstance: null,
            isScanningBarcode: false,
            selectedFoundProduct: null,
            foundProductQty: 1,
            foundProductCustomPrice: 0,
            foundProductWeight: '',
            currentSearchResults: [],
            cloneTarget: null,
            activeShowcaseFilter: 'all',
            activeTimelineBouquetId: null,
            reportPeriod: 'this_week'
        },

        // معالجة النصوص العربية وإزالة التطويل والكشيدة والهمزات للبحث الدقيق
        normalizeArabic(text) {
            return String(text || '')
                .replace(/ـ+/g, '')
                .replace(/[إأآا]/g, 'ا')
                .replace(/[يى]/g, 'ي')
                .replace(/[ةه]/g, 'ه')
                .replace(/[\u064B-\u065F]/g, '')
                .trim()
                .toLowerCase();
        },

        // 1. التهيئة الأولية (Init)
        async init(initialSubtab = 'builder') {
            console.log("Candy Club Gifts Module: Initializing...");
            
            // تعيين اسم المصمم الافتراضي
            this.setDefaultCreator();

            // استعادة المسودة التلقائية من LocalStorage
            this.restoreDraft();

            // جلب المنتجات من Firebase المتزامن
            await this.loadCatalogProducts();

            // جلب البوكيهات والقوالب
            await this.loadBouquets();
            await this.loadTemplates();

            // تحديث شريط الإحصائيات في الترويسة
            this.updateHeaderStats();

            // فتح التاب المطلوب
            this.switchSubTab(initialSubtab);

            // تفعيل مستمعات الأحداث
            this.bindEvents();
        },

        setDefaultCreator() {
            try {
                const stored = localStorage.getItem('cc_user');
                if (stored) {
                    const user = JSON.parse(stored);
                    if (user && user.displayName && !this.state.draft.creator) {
                        this.state.draft.creator = user.displayName;
                        const input = document.getElementById('gifts-input-creator');
                        if (input) input.value = user.displayName;
                    }
                }
            } catch (e) {
                console.warn("Could not read current user name:", e);
            }
        },

        // 2. التبديل بين التبويبات الداخلية
        switchSubTab(tabName) {
            this.state.currentSubTab = tabName;

            // تحديث أزرار التنقل
            document.querySelectorAll('.gifts-subtab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeBtn = Array.from(document.querySelectorAll('.gifts-subtab-btn')).find(b => {
                const onclickAttr = b.getAttribute('onclick') || '';
                return onclickAttr.includes(`'${tabName}'`);
            });
            if (activeBtn) activeBtn.classList.add('active');

            // إظهار المحتوى المطلوب
            document.querySelectorAll('.gifts-subview').forEach(view => {
                view.classList.remove('active');
            });
            const targetView = document.getElementById(`gifts-view-${tabName}`);
            if (targetView) targetView.classList.add('active');

            // إيقاف الكاميرات إذا تم مغادرة تبويب التجميع لتوفير الرام
            if (tabName !== 'builder') {
                if (this.state.cameraStream) this.stopCamera();
                if (this.state.isScanningBarcode) this.stopCameraBarcodeScanner();
            }

            // تحديث العرض الخاص بكل قسم
            if (tabName === 'builder') {
                this.renderDraftBasket();
                this.renderRecentAddedList();
            } else if (tabName === 'showcase') {
                this.renderShowcase();
            } else if (tabName === 'analytics') {
                this.renderAnalytics();
            } else if (tabName === 'catalog') {
                this.renderCustomerCatalog();
            }
        },

        // 3. جلب كتالوج المنتجات من Firebase المتزامن
        async loadCatalogProducts() {
            const statusEl = document.getElementById('gifts-catalog-status');
            if (statusEl) statusEl.innerText = "جاري مزامنة المنتجات...";

            try {
                const parseProductEntry = (item) => {
                    if (!item || !item.Barcode || !item.Name) return null;
                    const raw = item.Barcode;
                    let parts = [];
                    if (Array.isArray(raw)) {
                        parts = raw.map(b => String(b).trim()).filter(Boolean);
                    } else {
                        parts = String(raw).split(/[,|\s/]+/).map(b => b.trim()).filter(Boolean);
                    }
                    if (parts.length === 0) return null;

                    return {
                        barcode: parts.join(', '),
                        primaryBarcode: parts[0],
                        barcodes: parts,
                        name: String(item.Name).trim(),
                        price: Number(item.Price) || 0,
                        stock: Number(item.Stock) || 0
                    };
                };

                if (window.barcodeCatalogData && Array.isArray(window.barcodeCatalogData) && window.barcodeCatalogData.length > 0) {
                    this.state.catalogProducts = window.barcodeCatalogData.map(p => {
                        const raw = p.barcode || p.Barcode;
                        let parts = [];
                        if (Array.isArray(raw)) {
                            parts = raw.map(b => String(b).trim()).filter(Boolean);
                        } else {
                            parts = String(raw || '').split(/[,|\s/]+/).map(b => b.trim()).filter(Boolean);
                        }
                        return {
                            barcode: parts.join(', ') || String(p.barcode || '').trim(),
                            primaryBarcode: parts[0] || String(p.barcode || '').trim(),
                            barcodes: parts.length > 0 ? parts : [String(p.barcode || '').trim()],
                            name: String(p.name || '').trim(),
                            price: Number(p.price) || 0,
                            stock: Number(p.stock) || 0
                        };
                    });
                } else {
                    const resp = await fetch('https://candyclubsync-default-rtdb.firebaseio.com/products.json');
                    const data = await resp.json();
                    const list = [];
                    if (data) {
                        const items = Array.isArray(data) ? data : Object.values(data);
                        items.forEach(item => {
                            const parsed = parseProductEntry(item);
                            if (parsed) list.push(parsed);
                        });
                    }
                    this.state.catalogProducts = list;
                }

                if (statusEl) statusEl.innerText = `جاهز (${this.state.catalogProducts.length} صنف)`;
            } catch (err) {
                console.error("Error fetching Firebase products:", err);
                if (statusEl) statusEl.innerText = "جاهز للمسح";
            }
        },

        // البحث الشامل عن منتج بالباركودات المتعددة أو الاسم
        findProduct(query) {
            if (!query) return null;
            const rawQ = String(query).trim();
            if (!rawQ) return null;
            const qLower = rawQ.toLowerCase();
            const qNorm = this.normalizeArabic(rawQ);
            const qNoZeros = qLower.replace(/^0+/, '');

            // 1. تطابق دقيق في قائمة الباركودات المتعددة للصنف
            let matched = this.state.catalogProducts.find(p => {
                if (p.barcodes && p.barcodes.some(b => b.toLowerCase() === qLower)) return true;
                if (qNoZeros && p.barcodes && p.barcodes.some(b => b.replace(/^0+/, '').toLowerCase() === qNoZeros)) return true;
                return false;
            });
            if (matched) return matched;

            // 2. تطابق كامل مع نص الباركود الإجمالي
            matched = this.state.catalogProducts.find(p => p.barcode && p.barcode.toLowerCase() === qLower);
            if (matched) return matched;

            // 3. تطابق دقيق مع الاسم المعياري (بدون تشكيل أو تطويل)
            matched = this.state.catalogProducts.find(p => p.name && this.normalizeArabic(p.name) === qNorm);
            if (matched) return matched;

            // 4. احتواء الباركود
            matched = this.state.catalogProducts.find(p => p.barcode && p.barcode.toLowerCase().includes(qLower));
            if (matched) return matched;

            // 5. احتواء الاسم المعياري
            matched = this.state.catalogProducts.find(p => p.name && this.normalizeArabic(p.name).includes(qNorm));
            if (matched) return matched;

            // 5b. تطابق الكلمات المتعددة في الاسم (كل كلمة من كلمات البحث موجودة في الاسم)
            const qWords = qNorm.split(/\s+/).filter(w => w.length > 1);
            if (qWords.length > 1) {
                matched = this.state.catalogProducts.find(p => {
                    if (!p.name) return false;
                    const pNorm = this.normalizeArabic(p.name);
                    return qWords.every(w => pNorm.includes(w));
                });
                if (matched) return matched;
            }

            // 6. أول نتيجة من الاقتراحات النشطة
            if (this.state.currentSearchResults && this.state.currentSearchResults.length > 0) {
                return this.state.currentSearchResults[0];
            }

            return null;
        },

        // 4. محرك البحث التفاعلي والمسح بمسدس الباركود
        onSearchInput(event) {
            const raw = (event.target.value || '').trim();
            const dropdown = document.getElementById('gifts-autocomplete-dropdown');
            if (!dropdown) return;

            if (raw.length < 1) {
                dropdown.style.display = 'none';
                dropdown.innerHTML = '';
                this.state.currentSearchResults = [];
                return;
            }

            const qLower = raw.toLowerCase();
            const qNorm = this.normalizeArabic(raw);
            const qNoZeros = qLower.replace(/^0+/, '');
            const qWords = qNorm.split(/\s+/).filter(w => w.length > 1);

            // فحص دقيق بالاسم المعياري والباركودات المتعددة
            const matches = this.state.catalogProducts.filter(p => {
                if (p.name) {
                    const pNorm = this.normalizeArabic(p.name);
                    if (pNorm.includes(qNorm)) return true;
                    if (qWords.length > 1 && qWords.every(w => pNorm.includes(w))) return true;
                }
                if (p.barcodes && p.barcodes.some(b => b.toLowerCase().includes(qLower))) return true;
                if (qNoZeros && p.barcodes && p.barcodes.some(b => b.replace(/^0+/, '').toLowerCase() === qNoZeros)) return true;
                if (p.barcode && p.barcode.toLowerCase().includes(qLower)) return true;
                return false;
            }).slice(0, 10);

            this.state.currentSearchResults = matches;

            if (matches.length === 0) {
                dropdown.innerHTML = '<div style="padding: 12px 16px; color: var(--gifts-text-muted); font-size: 0.88rem;">لا توجد أصناف مطابقة للبحث</div>';
                dropdown.style.display = 'block';
                return;
            }

            dropdown.innerHTML = matches.map((p, idx) => `
                <div class="gifts-autocomplete-item" onclick="GiftsApp.selectFoundProductByIndex(${idx})">
                    <div style="flex: 1;">
                        <div class="item-title">${p.name}</div>
                        <div class="item-meta">باركود: ${p.barcode} | متبقي بالمخزن: ${p.stock}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="item-price">${p.price > 0 ? p.price.toFixed(2) + ' ج.م' : 'سعر مخصص'}</span>
                        <button type="button" class="gifts-btn-outline" style="padding: 4px 10px; font-size: 0.8rem;">اختيار</button>
                    </div>
                </div>
            `).join('');

            dropdown.style.display = 'block';
        },

        onBarcodeEntered(barcode) {
            const clean = String(barcode || '').trim();

            // إذا كان الحقل فارغا والبطاقة معروضة، يتم تثبيت الإضافة للبوكيه مباشرة
            if (!clean) {
                if (this.state.selectedFoundProduct) {
                    this.confirmAddScannedProduct();
                }
                return;
            }

            // إذا كانت البطاقة معروضة بالفعل لنفس الصنف وتم مسح باركوده مجددا بمسدس الباركود، تزيد الكمية
            if (this.state.selectedFoundProduct) {
                const currentP = this.state.selectedFoundProduct;
                const matchesCurrent = (currentP.barcodes && currentP.barcodes.includes(clean)) || currentP.barcode === clean;
                if (matchesCurrent) {
                    this.updateFoundQty(1);
                    this.playBeepSound();
                    const input = document.getElementById('gifts-scanner-input');
                    if (input) input.value = '';
                    return;
                }
            }

            let product = this.findProduct(clean);
            if (!product && this.state.currentSearchResults && this.state.currentSearchResults.length > 0) {
                product = this.state.currentSearchResults[0];
            }
            if (product) {
                this.selectFoundProduct(product);
                const input = document.getElementById('gifts-scanner-input');
                if (input) input.value = '';
                const dropdown = document.getElementById('gifts-autocomplete-dropdown');
                if (dropdown) dropdown.style.display = 'none';
            } else {
                this.showToastNotification("لم يتم العثور على صنف مطابق لهذا الباركود أو الاسم");
            }
        },

        // اختيار الصنف عبر ترتيبه في قائمة البحث اللحظي
        selectFoundProductByIndex(idx) {
            if (this.state.currentSearchResults && this.state.currentSearchResults[idx]) {
                this.selectFoundProduct(this.state.currentSearchResults[idx]);
            }
        },

        // اختيار الصنف الممسوح وإظهار بطاقة الإضافة وتجهيز السعر والحجم
        selectFoundProduct(productOrBarcode) {
            let product = null;
            if (typeof productOrBarcode === 'object' && productOrBarcode !== null) {
                product = productOrBarcode;
            } else {
                product = this.findProduct(productOrBarcode);
            }
            if (!product) return;

            this.state.selectedFoundProduct = product;
            this.state.foundProductQty = 1;
            this.state.foundProductCustomPrice = product.price;
            this.state.foundProductWeight = '';

            const card = document.getElementById('gifts-found-card');
            const titleEl = document.getElementById('gifts-found-title');
            const barcodeEl = document.getElementById('gifts-found-barcode');
            const priceInput = document.getElementById('gifts-found-price-input');
            const weightInput = document.getElementById('gifts-found-weight-input');
            const qtyEl = document.getElementById('gifts-found-qty');
            const badgeEl = document.getElementById('gifts-found-stock-badge');
            const dropdown = document.getElementById('gifts-autocomplete-dropdown');
            const searchInput = document.getElementById('gifts-scanner-input');

            // تنظيف حقل البحث وإخفاء قائمة الاقتراحات
            if (searchInput) searchInput.value = '';
            if (dropdown) dropdown.style.display = 'none';

            if (titleEl) titleEl.innerText = product.name;
            if (barcodeEl) barcodeEl.innerText = `الباركود: ${product.barcode}`;
            if (qtyEl) qtyEl.innerText = '1';

            if (priceInput) {
                priceInput.value = product.price > 0 ? product.price : '';
                priceInput.placeholder = product.price > 0 ? '0.00' : 'أدخل السعر';
            }

            if (weightInput) {
                weightInput.value = '';
            }

            if (badgeEl) {
                if (product.stock <= 0) {
                    badgeEl.className = 'gifts-badge badge-last';
                    badgeEl.innerText = 'نفد من المخزن';
                } else if (product.stock <= 3) {
                    badgeEl.className = 'gifts-badge badge-last';
                    badgeEl.innerText = `متبقي ${product.stock} فقط`;
                } else {
                    badgeEl.className = 'gifts-badge badge-ready';
                    badgeEl.innerText = `متوفر (${product.stock} قطعة)`;
                }
            }

            if (card) {
                card.style.display = 'block';
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // تركيز المؤشر فورا على السعر إذا كان الصنف بالوزن أو سعره 0
            if (product.price === 0 && priceInput) {
                setTimeout(() => priceInput.focus(), 150);
            }

            this.playBeepSound();
        },

        onFoundPriceChanged(val) {
            const num = parseFloat(val);
            this.state.foundProductCustomPrice = (!isNaN(num) && num >= 0) ? num : 0;
        },

        onFoundWeightChanged(val) {
            const num = parseFloat(val);
            this.state.foundProductWeight = (!isNaN(num) && num > 0) ? num : '';
        },

        updateFoundQty(delta) {
            let next = this.state.foundProductQty + delta;
            if (next < 1) next = 1;
            this.state.foundProductQty = next;
            const qtyEl = document.getElementById('gifts-found-qty');
            if (qtyEl) qtyEl.innerText = next;
        },

        closeFoundCard() {
            this.state.selectedFoundProduct = null;
            this.state.foundProductCustomPrice = 0;
            this.state.foundProductWeight = '';
            const weightInput = document.getElementById('gifts-found-weight-input');
            if (weightInput) weightInput.value = '';
            const card = document.getElementById('gifts-found-card');
            if (card) card.style.display = 'none';
        },

        confirmAddScannedProduct() {
            const product = this.state.selectedFoundProduct;
            if (!product) return;

            const addQty = this.state.foundProductQty || 1;
            
            // تحديد سعر الصنف (السعر المخصص إن تم تغييره أو سعر الصنف القياسي)
            const priceInput = document.getElementById('gifts-found-price-input');
            let itemPrice = product.price || 0;
            if (priceInput && priceInput.value !== '') {
                const parsed = parseFloat(priceInput.value);
                if (!isNaN(parsed) && parsed >= 0) itemPrice = parsed;
            } else if (this.state.foundProductCustomPrice !== undefined && this.state.foundProductCustomPrice !== '') {
                const parsed = parseFloat(this.state.foundProductCustomPrice);
                if (!isNaN(parsed) && parsed >= 0) itemPrice = parsed;
            }

            // تحديد وزن الصنف بالجرامات (أرقام فقط كـ 100 أو 250)
            const weightInput = document.getElementById('gifts-found-weight-input');
            let itemWeight = '';
            if (weightInput && weightInput.value !== '') {
                const parsed = parseFloat(weightInput.value);
                if (!isNaN(parsed) && parsed > 0) itemWeight = parsed;
            } else if (this.state.foundProductWeight) {
                const parsed = parseFloat(this.state.foundProductWeight);
                if (!isNaN(parsed) && parsed > 0) itemWeight = parsed;
            }

            const cleanSingleBarcode = product.primaryBarcode || (product.barcodes && product.barcodes[0]) || product.barcode;
            const existingIndex = this.state.draft.items.findIndex(i => 
                i.barcode === product.barcode && 
                i.price === itemPrice && 
                (i.weight || '') === (itemWeight || '')
            );

            if (existingIndex > -1) {
                this.state.draft.items[existingIndex].qty += addQty;
            } else {
                this.state.draft.items.push({
                    barcode: product.barcode,
                    primaryBarcode: cleanSingleBarcode,
                    name: product.name,
                    price: itemPrice,
                    weight: itemWeight,
                    qty: addQty,
                    stock: product.stock
                });
            }

            this.state.lastAddedBarcode = product.barcode;
            this.onDraftChanged();
            this.renderDraftBasket();
            this.renderRecentAddedList();
            this.closeFoundCard();

            // تنظيف حقل البحث وإعادة التركيز عليه لمسح الصنف التالي فورا
            const input = document.getElementById('gifts-scanner-input');
            if (input) {
                input.value = '';
                input.focus();
            }

            const weightBadge = itemWeight ? ` (${itemWeight} جم)` : '';
            this.showToastNotification(`تمت إضافة (${addQty}) ${product.name}${weightBadge} إلى البوكيه`);
        },

        renderRecentAddedList() {
            const container = document.getElementById('gifts-recent-added-list');
            if (!container) return;

            const items = this.state.draft.items;
            if (items.length === 0) {
                container.innerHTML = '<div style="font-size: 0.82rem; color: var(--gifts-text-muted); padding: 6px;">لا توجد أصناف مضافة حاليا</div>';
                return;
            }

            // عرض آخر 4 أصناف مضافة
            const reversed = [...items].reverse().slice(0, 4);
            container.innerHTML = reversed.map(item => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: 1px solid var(--gifts-border-pink); border-radius: var(--gifts-radius-sm); padding: 8px 14px;">
                    <div>
                        <div style="font-size: 0.88rem; font-weight: 800; color: var(--gifts-text);">${item.name}</div>
                        <div style="font-size: 0.75rem; color: var(--gifts-text-muted);">${item.barcode}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 900; color: var(--gifts-primary-dark); font-size: 0.88rem;">${item.qty} قطعة</span>
                        <span style="font-size: 0.82rem; color: var(--gifts-text-muted);">${(item.price * item.qty).toFixed(2)} ج.م</span>
                    </div>
                </div>
            `).join('');
        },

        // 5. ماسح باركود الكاميرا المباشر (Camera Barcode Scanner)
        toggleCameraBarcodeScanner() {
            if (this.state.isScanningBarcode) {
                this.stopCameraBarcodeScanner();
            } else {
                this.startCameraBarcodeScanner();
            }
        },

        async startCameraBarcodeScanner() {
            const view = document.getElementById('gifts-barcode-scanner-view');
            const btnLabel = document.getElementById('gifts-scanner-btn-label');

            if (!window.Html5Qrcode) {
                this.showToastNotification("مكتبة الماسح الضوئي غير متوفرة حاليا، يمكنك استخدام البحث أو مسدس الباركود");
                return;
            }

            if (view) view.style.display = 'block';
            if (btnLabel) btnLabel.innerText = 'إغلاق كاميرا المسح';
            this.state.isScanningBarcode = true;

            try {
                this.state.barcodeScannerInstance = new window.Html5Qrcode("gifts-reader-box");
                const config = {
                    fps: 15,
                    qrbox: { width: 250, height: 160 },
                    aspectRatio: 1.6
                };

                await this.state.barcodeScannerInstance.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        // نجاح قراءة الباركود
                        this.stopCameraBarcodeScanner();
                        this.onBarcodeEntered(decodedText);
                    },
                    (error) => {
                        // أخطاء التوجيه أثناء البحث نتجاهلها
                    }
                );
            } catch (err) {
                console.error("Camera scanner failed:", err);
                this.stopCameraBarcodeScanner();
                this.showToastNotification("تعذر فتح كاميرا مسح الباركود، يمكنك استخدام مسدس الباركود أو البحث");
            }
        },

        stopCameraBarcodeScanner() {
            const view = document.getElementById('gifts-barcode-scanner-view');
            const btnLabel = document.getElementById('gifts-scanner-btn-label');

            if (this.state.barcodeScannerInstance) {
                this.state.barcodeScannerInstance.stop().then(() => {
                    this.state.barcodeScannerInstance.clear();
                    this.state.barcodeScannerInstance = null;
                }).catch(e => console.warn(e));
            }

            if (view) view.style.display = 'none';
            if (btnLabel) btnLabel.innerText = 'فتح كاميرا مسح الباركود';
            this.state.isScanningBarcode = false;
        },

        // صوت Beep مميز وفاخر عند مسح الباركود
        playBeepSound() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const now = ctx.currentTime;
                
                // النغمة الأولى
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(1400, now);
                gain1.gain.setValueAtTime(0.14, now);
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.start(now);
                osc1.stop(now + 0.08);

                // النغمة الثانية المرتفعة لمظهر بوتيك راقي
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(2100, now + 0.06);
                gain2.gain.setValueAtTime(0.16, now + 0.06);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start(now + 0.06);
                osc2.stop(now + 0.16);
            } catch (e) {}
        },

        // 6. إدارة سلة البوكيه الحالية (Draft Basket)
        updateBasketItemPrice(index, newPrice) {
            if (!this.state.draft.items[index]) return;
            const val = parseFloat(newPrice);
            this.state.draft.items[index].price = (!isNaN(val) && val >= 0) ? val : 0;
            this.onDraftChanged();
            this.renderDraftBasket();
            this.renderRecentAddedList();
        },

        updateBasketItemWeight(index, newWeight) {
            if (!this.state.draft.items[index]) return;
            const parsed = parseFloat(newWeight);
            this.state.draft.items[index].weight = (!isNaN(parsed) && parsed > 0) ? parsed : '';
            this.onDraftChanged();
            this.renderRecentAddedList();
        },

        updateItemQtyByIndex(index, delta) {
            if (!this.state.draft.items[index]) return;
            this.state.draft.items[index].qty += delta;
            if (this.state.draft.items[index].qty <= 0) {
                this.state.draft.items.splice(index, 1);
            }
            this.onDraftChanged();
            this.renderDraftBasket();
            this.renderRecentAddedList();
        },

        removeItemFromDraftByIndex(index) {
            if (!this.state.draft.items[index]) return;
            this.state.draft.items.splice(index, 1);
            this.onDraftChanged();
            this.renderDraftBasket();
            this.renderRecentAddedList();
        },

        updateItemQty(barcode, delta) {
            const index = this.state.draft.items.findIndex(i => i.barcode === barcode);
            if (index === -1) return;
            this.updateItemQtyByIndex(index, delta);
        },

        removeItemFromDraft(barcode) {
            this.state.draft.items = this.state.draft.items.filter(i => i.barcode !== barcode);
            this.onDraftChanged();
            this.renderDraftBasket();
            this.renderRecentAddedList();
        },

        renderDraftBasket() {
            const container = document.getElementById('gifts-basket-items');
            const countEl = document.getElementById('gifts-basket-count');
            const unitsEl = document.getElementById('gifts-total-units');
            const priceEl = document.getElementById('gifts-total-price');

            const mobileCount = document.getElementById('gifts-mobile-count-text');
            const mobilePrice = document.getElementById('gifts-mobile-price-text');

            if (!container) return;

            const items = this.state.draft.items;
            let totalUnits = 0;
            let totalPrice = 0;

            items.forEach(i => {
                totalUnits += i.qty;
                totalPrice += (i.price * i.qty);
            });

            if (countEl) countEl.innerText = `${items.length} أصناف`;
            if (unitsEl) unitsEl.innerText = `${totalUnits} قطعة`;
            if (priceEl) priceEl.innerText = `${totalPrice.toFixed(2)} ج.م`;

            if (mobileCount) mobileCount.innerText = `${items.length} أصناف (${totalUnits} قطعة)`;
            if (mobilePrice) mobilePrice.innerText = `${totalPrice.toFixed(2)} ج.م`;

            if (items.length === 0) {
                container.innerHTML = `
                    <div class="gifts-empty-state" style="padding: 24px 10px;">
                        <i class="fa-solid fa-basket-shopping" style="font-size: 2rem; color: #CBD5E1; margin-bottom: 8px;"></i>
                        <div style="font-size: 0.88rem; font-weight: 700;">لم يتم اختيار أصناف بعد، امسح الباركود أو ابحث باسم الصنف للإضافة</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = items.map((item, idx) => {
                const isJustAdded = this.state.lastAddedBarcode && (item.barcode === this.state.lastAddedBarcode);
                return `
                <div class="gifts-basket-item ${isJustAdded ? 'gifts-just-added' : ''}">
                    <div style="flex: 1; padding-left: 10px;">
                        <div class="gifts-basket-name">${item.name}</div>
                        <div class="gifts-basket-sub" style="display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap;">
                            <input type="number" class="gifts-form-control" value="${item.price}" step="any" min="0" 
                                style="width: 75px; padding: 2px 6px; font-weight: 800; font-size: 0.82rem; text-align: center; color: var(--gifts-primary-dark); border-radius: 6px; border: 1px solid var(--gifts-border-pink);" 
                                onchange="GiftsApp.updateBasketItemPrice(${idx}, this.value)" title="تعديل سعر القطعة">
                            <span style="font-size: 0.8rem;">ج.م</span>
                            <input type="number" class="gifts-form-control" value="${item.weight || ''}" placeholder="الوزن (جرام)" min="0" step="1" 
                                style="width: 85px; padding: 2px 6px; font-weight: 700; font-size: 0.8rem; text-align: center; color: var(--gifts-primary-dark); border-radius: 6px; border: 1px solid var(--gifts-border-pink); background: #FFF5F9;" 
                                onchange="GiftsApp.updateBasketItemWeight(${idx}, this.value)" title="الوزن بالجرامات">
                            <span style="font-size: 0.75rem; color: var(--gifts-text-muted);">جم</span>
                            <span style="font-size: 0.8rem;">× ${item.qty} = <strong>${(item.price * item.qty).toFixed(2)} ج.م</strong></span>
                        </div>
                    </div>
                    <div class="gifts-basket-actions">
                        <button type="button" class="gifts-stepper-btn" onclick="GiftsApp.updateItemQtyByIndex(${idx}, -1)">-</button>
                        <span class="gifts-stepper-val">${item.qty}</span>
                        <button type="button" class="gifts-stepper-btn" onclick="GiftsApp.updateItemQtyByIndex(${idx}, 1)">+</button>
                        <button type="button" class="gifts-basket-remove" title="حذف" onclick="GiftsApp.removeItemFromDraftByIndex(${idx})">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `}).join('');

            if (this.state.lastAddedBarcode) {
                setTimeout(() => { this.state.lastAddedBarcode = null; }, 1200);
            }
        },

        // الحفظ التلقائي للمسودة في LocalStorage
        onDraftChanged() {
            const nameInput = document.getElementById('gifts-input-name');
            const creatorInput = document.getElementById('gifts-input-creator');
            const qtyInput = document.getElementById('gifts-input-qty');

            if (nameInput) this.state.draft.name = nameInput.value;
            if (creatorInput) this.state.draft.creator = creatorInput.value;
            if (qtyInput) this.state.draft.qty = parseInt(qtyInput.value) || 1;

            try {
                localStorage.setItem('candy_gifts_draft', JSON.stringify({
                    name: this.state.draft.name,
                    creator: this.state.draft.creator,
                    qty: this.state.draft.qty,
                    colorTag: '#E91E8C',
                    items: this.state.draft.items,
                    photoBase64: this.state.draft.photoBase64,
                    photoSizeKB: this.state.draft.photoSizeKB
                }));
            } catch (e) {
                console.warn("Could not save draft to LocalStorage:", e);
            }
        },

        restoreDraft() {
            try {
                const saved = localStorage.getItem('candy_gifts_draft');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    this.state.draft.name = parsed.name || '';
                    this.state.draft.creator = parsed.creator || '';
                    this.state.draft.qty = parsed.qty || 1;
                    this.state.draft.colorTag = '#E91E8C';
                    this.state.draft.items = parsed.items || [];
                    this.state.draft.photoBase64 = parsed.photoBase64 || null;
                    this.state.draft.photoSizeKB = parsed.photoSizeKB || 0;

                    setTimeout(() => {
                        const nameInput = document.getElementById('gifts-input-name');
                        const creatorInput = document.getElementById('gifts-input-creator');
                        const qtyInput = document.getElementById('gifts-input-qty');
                        if (nameInput && this.state.draft.name) nameInput.value = this.state.draft.name;
                        if (creatorInput && this.state.draft.creator) creatorInput.value = this.state.draft.creator;
                        if (qtyInput && this.state.draft.qty) qtyInput.value = this.state.draft.qty;

                        if (this.state.draft.photoBase64) {
                            this.displayCompressedPhoto(this.state.draft.photoBase64, this.state.draft.photoSizeKB);
                        }
                    }, 60);
                }
            } catch (e) {
                console.warn("Could not restore draft:", e);
            }
        },

        clearDraft() {
            this.state.draft.name = '';
            this.state.draft.items = [];
            this.state.draft.qty = 1;
            this.state.draft.photoBase64 = null;
            this.state.draft.photoSizeKB = 0;

            const nameInput = document.getElementById('gifts-input-name');
            const qtyInput = document.getElementById('gifts-input-qty');
            if (nameInput) nameInput.value = '';
            if (qtyInput) qtyInput.value = '1';

            this.removePhoto();
            localStorage.removeItem('candy_gifts_draft');
            this.setDefaultCreator();
            this.renderDraftBasket();
            this.renderRecentAddedList();
            this.showToastNotification("تم إفراغ المسودة وتجهيز نموذج جديد");
        },

        scrollToDraft() {
            const el = document.querySelector('.gifts-draft-card');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        },

        // 7. تصوير البوكيه وضغط Canvas والرفع لجوجل درايف
        async startCamera() {
            const video = document.getElementById('gifts-camera-stream');
            const btnOpen = document.getElementById('gifts-btn-open-camera');
            const btnSnap = document.getElementById('gifts-btn-snap');
            const placeholder = document.getElementById('gifts-camera-placeholder');

            try {
                const constraints = {
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                this.state.cameraStream = stream;
                video.srcObject = stream;
                video.style.display = 'block';
                video.play();

                if (placeholder) placeholder.style.display = 'none';
                if (btnOpen) btnOpen.style.display = 'none';
                if (btnSnap) btnSnap.style.display = 'inline-flex';
            } catch (err) {
                console.error("Camera access failed:", err);
                this.showToastNotification("تعذر فتح الكاميرا، يمكنك اختيار صورة من جهازك");
            }
        },

        stopCamera() {
            if (this.state.cameraStream) {
                this.state.cameraStream.getTracks().forEach(track => track.stop());
                this.state.cameraStream = null;
            }
            const video = document.getElementById('gifts-camera-stream');
            const btnOpen = document.getElementById('gifts-btn-open-camera');
            const btnSnap = document.getElementById('gifts-btn-snap');
            if (video) video.style.display = 'none';
            if (btnOpen) btnOpen.style.display = 'inline-flex';
            if (btnSnap) btnSnap.style.display = 'none';
        },

        capturePhoto() {
            const video = document.getElementById('gifts-camera-stream');
            if (!video || !this.state.cameraStream) return;

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            this.stopCamera();
            this.compressCanvasImage(canvas);
        },

        handleFileUpload(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    this.compressCanvasImage(canvas);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        },

        compressCanvasImage(canvas) {
            const maxDimension = 1400;
            let targetWidth = canvas.width;
            let targetHeight = canvas.height;

            if (targetWidth > maxDimension || targetHeight > maxDimension) {
                if (targetWidth > targetHeight) {
                    targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
                    targetWidth = maxDimension;
                } else {
                    targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
                    targetHeight = maxDimension;
                }
            }

            const scaledCanvas = document.createElement('canvas');
            scaledCanvas.width = targetWidth;
            scaledCanvas.height = targetHeight;
            const scaledCtx = scaledCanvas.getContext('2d');
            scaledCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

            // جودة فائقة بحجم مثالي بين 300 إلى 500 كيلوبايت لرفعها على Google Drive
            const quality = 0.88;
            const compressedBase64 = scaledCanvas.toDataURL('image/jpeg', quality);

            const head = 'data:image/jpeg;base64,';
            const sizeInBytes = Math.round((compressedBase64.length - head.length) * 3 / 4);
            const sizeInKB = Math.round(sizeInBytes / 1024);

            this.state.draft.photoBase64 = compressedBase64;
            this.state.draft.photoSizeKB = sizeInKB;

            this.displayCompressedPhoto(compressedBase64, sizeInKB);
            this.onDraftChanged();
        },

        displayCompressedPhoto(base64, sizeInKB) {
            const preview = document.getElementById('gifts-image-preview');
            const placeholder = document.getElementById('gifts-camera-placeholder');
            const btnRemove = document.getElementById('gifts-btn-remove-photo');
            const infoBadge = document.getElementById('gifts-compression-info');

            if (preview) {
                preview.src = base64;
                preview.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
            if (btnRemove) btnRemove.style.display = 'inline-flex';
            if (infoBadge) {
                infoBadge.innerText = `حجم الصورة لجوجل درايف: ${sizeInKB} كيلوبايت (جودة فائقة)`;
                infoBadge.style.display = 'inline-block';
            }
        },

        removePhoto() {
            this.state.draft.photoBase64 = null;
            this.state.draft.photoSizeKB = 0;

            const preview = document.getElementById('gifts-image-preview');
            const placeholder = document.getElementById('gifts-camera-placeholder');
            const btnRemove = document.getElementById('gifts-btn-remove-photo');
            const infoBadge = document.getElementById('gifts-compression-info');
            const fileInput = document.getElementById('gifts-file-input');

            if (preview) {
                preview.src = '';
                preview.style.display = 'none';
            }
            if (placeholder) placeholder.style.display = 'block';
            if (btnRemove) btnRemove.style.display = 'none';
            if (infoBadge) infoBadge.style.display = 'none';
            if (fileInput) fileInput.value = '';

            this.onDraftChanged();
        },

        // رفع الصورة حصريا إلى سيرفر Google Drive عبر Web App
        async uploadPhotoToGoogleDrive(base64Image, filename) {
            if (!base64Image || !base64Image.startsWith('data:image')) {
                return null;
            }

            try {
                const response = await fetch(GOOGLE_DRIVE_WEBAPP_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        image: base64Image,
                        filename: filename || `bouquet_${Date.now()}.jpg`
                    })
                });

                const result = await response.json();
                if (result && result.status === 'success' && result.url) {
                    return result.url;
                }
            } catch (err) {
                console.warn("Google Drive upload error:", err);
            }
            return null;
        },

        // 8. حفظ البوكيه (Supabase + LocalStorage Fallback مع منع النقر المزدوج)
        async saveBouquet() {
            if (this._isSaving) return;
            const draft = this.state.draft;

            if (!draft.name || draft.name.trim() === '') {
                this.showToastNotification("يرجى إدخال اسم البوكيه قبل الحفظ");
                return;
            }

            if (!draft.items || draft.items.length === 0) {
                this.showToastNotification("يرجى إضافة صنف واحد على الأقل داخل البوكيه");
                return;
            }

            const saveBtn = document.getElementById('gifts-btn-save-bouquet');
            const saveLabel = document.getElementById('gifts-btn-save-label');
            const saveIcon = document.getElementById('gifts-btn-save-icon');

            this._isSaving = true;
            if (saveBtn) saveBtn.disabled = true;
            if (saveLabel) saveLabel.innerText = "جاري الحفظ والمزامنة...";
            if (saveIcon) saveIcon.className = "fa-solid fa-spinner fa-spin";

            try {
                const creator = draft.creator.trim() || 'موظف الهدايا';
                const qty = parseInt(draft.qty) || 1;
                const totalPrice = draft.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
                const now = new Date().toISOString();

                // رفع الصورة حصريا إلى Google Drive (لا يتم حفظ Base64 في سوبا بيز مطلقا)
                let finalImageUrl = null;
                if (draft.photoBase64) {
                    this.showToastNotification("جاري رفع الصورة إلى Google Drive...");
                    const driveUrl = await this.uploadPhotoToGoogleDrive(draft.photoBase64, `bouquet_${Date.now()}.jpg`);
                    if (driveUrl && typeof driveUrl === 'string' && driveUrl.startsWith('http')) {
                        finalImageUrl = driveUrl;
                    } else {
                        this.showToastNotification("تنبيه: لم يتم حفظ رابط الصورة لتعذر الوصول إلى Google Drive");
                    }
                }

                const bouquetRecord = {
                    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `bq_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    name: draft.name.trim(),
                    creator_name: creator,
                    color_tag: '#E91E8C',
                    quantity: qty,
                    total_price: totalPrice,
                    status: 'ready',
                    items: draft.items,
                    image_url: finalImageUrl,
                    timeline: [
                        { event: 'تم إنشاء وتجميع البوكيه', by: creator, time: now },
                        { event: `تم تسجيل كمية (${qty}) بوكيه مطابق`, by: creator, time: now }
                    ],
                    created_at: now
                };

                let syncedToSupabase = false;
                if (window.supabase) {
                    try {
                        let { error } = await window.supabase.from(GIFTS_TABLE).insert([bouquetRecord]);
                        if (error && error.code === '23502') {
                            let tempRecord = { ...bouquetRecord, code: bouquetRecord.id };
                            await window.supabase.from(GIFTS_TABLE).insert([tempRecord]);
                        }
                        if (!error) syncedToSupabase = true;
                    } catch (e) {
                        console.warn("Supabase insert error (falling back to local):", e);
                    }
                }

                this.state.bouquets.unshift(bouquetRecord);
                this.saveBouquetsToLocal();

                const syncMsg = syncedToSupabase ? " (متزامن مع السحابة)" : " (محفوظ محليا)";
                this.showToastNotification(`تم حفظ البوكيه "${bouquetRecord.name}" بنجاح${syncMsg}`);
                this.clearDraft();
                this.updateHeaderStats();
                this.printBouquetThermalReceipt(bouquetRecord.id);
                this.switchSubTab('showcase');
            } catch (err) {
                console.error("Error saving bouquet:", err);
                this.showToastNotification("حدث خطأ أثناء حفظ البوكيه");
            } finally {
                this._isSaving = false;
                if (saveBtn) saveBtn.disabled = false;
                if (saveLabel) saveLabel.innerText = "حفظ البوكيه وعرضه في المحل";
                if (saveIcon) saveIcon.className = "fa-solid fa-floppy-disk";
            }
        },

        async loadBouquets() {
            let loaded = false;
            if (window.supabase) {
                try {
                    const { data, error } = await window.supabase
                        .from(GIFTS_TABLE)
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (!error && Array.isArray(data)) {
                        this.state.bouquets = data;
                        this.saveBouquetsToLocal();
                        loaded = true;
                    } else if (error) {
                        console.warn("Supabase fetch bouquets error:", error);
                    }
                } catch (e) {
                    console.warn("Could not fetch bouquets from Supabase:", e);
                }
            }

            if (!loaded) {
                try {
                    const localData = localStorage.getItem('candy_gifts_bouquets');
                    if (localData) {
                        this.state.bouquets = JSON.parse(localData);
                    }
                } catch (e) {
                    console.warn("Could not read local bouquets:", e);
                }
            }
        },

        saveBouquetsToLocal() {
            try {
                localStorage.setItem('candy_gifts_bouquets', JSON.stringify(this.state.bouquets));
            } catch (e) {
                console.warn("Could not write bouquets to LocalStorage:", e);
            }
        },

        // 9. توليد وطباعة ريسيت الباركودات الحراري 80 مم المعزول تماما (تصميم فائق الدقة ومدمج واقتصادي)
        generateThermalReceiptHtml(bouquet) {
            const createdDate = new Date(bouquet.created_at || Date.now());
            const yyyy = createdDate.getFullYear();
            const mm = String(createdDate.getMonth() + 1).padStart(2, '0');
            const dd = String(createdDate.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}/${mm}/${dd}`;
            
            const items = bouquet.items || [];
            let totalUnits = 0;
            let subTotalPrice = 0;

            items.forEach(item => {
                const qty = parseInt(item.qty) || 1;
                const price = parseFloat(item.price) || 0;
                totalUnits += qty;
                subTotalPrice += (price * qty);
            });

            let finalTotalPrice = subTotalPrice;
            if (bouquet.total_price && !isNaN(bouquet.total_price)) {
                finalTotalPrice = parseFloat(bouquet.total_price);
            }
            const discountAmount = Math.max(0, subTotalPrice - finalTotalPrice);

            // توليد بطاقات الأصناف بحدود واضحة ومسافات ممتازة للمسح السريع
            const itemsHtml = items.map((item, idx) => {
                const cleanCode = item.primaryBarcode || (item.barcode ? String(item.barcode).split(/[,|\s/]+/)[0].trim() : '000000');
                let svgBarcodeHtml = '';

                if (window.JsBarcode && cleanCode) {
                    try {
                        const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                        window.JsBarcode(tempSvg, cleanCode, {
                            format: 'CODE128',
                            width: 1.8,
                            height: 32,
                            displayValue: true,
                            font: 'monospace',
                            fontSize: 10,
                            textMargin: 1,
                            margin: 1
                        });
                        svgBarcodeHtml = tempSvg.outerHTML;
                    } catch (e) {
                        console.warn("JsBarcode error for code " + cleanCode, e);
                        svgBarcodeHtml = `<div style="font-family: monospace; font-size: 11px; font-weight: 900; padding: 2px; letter-spacing: 1px;">${cleanCode}</div>`;
                    }
                } else {
                    svgBarcodeHtml = `<div style="font-family: monospace; font-size: 11px; font-weight: 900; padding: 2px; letter-spacing: 1px;">${cleanCode}</div>`;
                }

                const weightBadge = item.weight ? `<span class="thermal-weight-tag">${item.weight} جم</span>` : '';
                const lineTotal = ((parseFloat(item.price) || 0) * (parseInt(item.qty) || 1)).toFixed(2);

                return `
                    <div class="thermal-item-card">
                        <div class="thermal-item-header">
                            <span class="thermal-item-num">${idx + 1}.</span>
                            <span class="thermal-item-name">${item.name || 'صنف'}</span>
                            ${weightBadge}
                        </div>
                        
                        <div class="thermal-barcode-box">
                            ${svgBarcodeHtml}
                        </div>

                        <div class="thermal-item-pricing">
                            <span>السعر: <strong>${Number(item.price).toFixed(2)}</strong> ج.م × <strong>${item.qty}</strong></span>
                            <span>الإجمالي: <strong>${lineTotal}</strong> ج.م</span>
                        </div>
                    </div>
                `;
            }).join('');

            return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>إيصال مكونات بوكيه - ${bouquet.name || 'بوكيه'}</title>
    <style>
        @page {
            size: 80mm auto;
            margin: 0;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        body {
            width: 74mm;
            margin: 0 auto;
            padding: 2mm 2mm 4mm 2mm;
            background: #FFFFFF;
            color: #000000;
            font-family: 'Segoe UI', Tahoma, 'Cairo', sans-serif;
            font-size: 11px;
            line-height: 1.25;
            direction: rtl;
        }
        .thermal-header {
            text-align: center;
            border-bottom: 1.5px dashed #000000;
            padding-bottom: 4px;
            margin-bottom: 6px;
        }
        .thermal-brand {
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }
        .thermal-top-meta {
            background: #F6F6F6;
            border: 1px solid #000000;
            border-radius: 3px;
            padding: 3px 6px;
            font-size: 10px;
            text-align: right;
            margin-top: 3px;
        }
        .thermal-top-meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2px;
        }
        .thermal-top-meta-row:last-child {
            margin-bottom: 0;
        }
        .thermal-item-card {
            border: 1px solid #000000;
            border-radius: 3px;
            padding: 3px 5px;
            margin-bottom: 6px;
            page-break-inside: avoid;
            background: #FFFFFF;
        }
        .thermal-item-header {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 900;
            line-height: 1.2;
            padding-bottom: 2px;
            border-bottom: 1px dotted #CCCCCC;
        }
        .thermal-item-num {
            font-weight: 900;
            min-width: 14px;
        }
        .thermal-item-name {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .thermal-weight-tag {
            display: inline-block;
            background: #EEEEEE;
            border: 1px solid #555555;
            padding: 0 4px;
            border-radius: 2px;
            font-size: 9px;
            font-weight: 800;
            white-space: nowrap;
        }
        .thermal-barcode-box {
            text-align: center;
            margin: 2px 0;
            padding: 1px 0;
            background: #FFFFFF;
        }
        .thermal-barcode-box svg {
            max-width: 68mm;
            height: 32px;
            display: inline-block;
        }
        .thermal-item-pricing {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            padding-top: 2px;
            border-top: 1px dotted #888888;
        }
        .thermal-summary-box {
            border: 2px solid #000000;
            border-radius: 3px;
            padding: 5px 6px;
            margin-top: 8px;
            page-break-inside: avoid;
        }
        .thermal-summary-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            font-weight: 700;
            margin-bottom: 3px;
        }
        .thermal-final-total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            font-weight: 900;
            border-top: 1.5px solid #000000;
            padding-top: 4px;
            margin-top: 4px;
        }
    </style>
</head>
<body>
    <div class="thermal-header">
        <div class="thermal-brand">★ CANDY CLUB ★ - قسم الهدايا</div>
        <div class="thermal-top-meta">
            <div class="thermal-top-meta-row">
                <span>اسم البوكيه: <strong>${bouquet.name || 'بوكيه هدايا'}</strong></span>
            </div>
            <div class="thermal-top-meta-row">
                <span>المصمم: <strong>${bouquet.creator_name || 'موظف الهدايا'}</strong></span>
                <span>تاريخ التصنيع: <strong style="font-family: monospace;">${dateStr}</strong></span>
            </div>
        </div>
    </div>

    ${itemsHtml}

    <div class="thermal-summary-box">
        <div class="thermal-summary-row">
            <span>الأصناف: <strong>${items.length} صنف (${totalUnits} قطعة)</strong></span>
            <span>المجموع: <strong>${subTotalPrice.toFixed(2)} ج.م</strong></span>
        </div>
        <div class="thermal-summary-row">
            <span>الخصم:</span>
            <span>${discountAmount.toFixed(2)} ج.م</span>
        </div>
        <div class="thermal-final-total-row">
            <span>الإجمالي النهائي:</span>
            <span>${finalTotalPrice.toFixed(2)} ج.م</span>
        </div>
    </div>
</body>
</html>`;
        },

        printThermalReceipt(bouquet) {
            if (!bouquet) return;
            const htmlContent = this.generateThermalReceiptHtml(bouquet);

            let iframe = document.getElementById('gifts-print-thermal-iframe');
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.id = 'gifts-print-thermal-iframe';
                iframe.style.position = 'fixed';
                iframe.style.right = '-9999px';
                iframe.style.bottom = '-9999px';
                iframe.style.width = '80mm';
                iframe.style.height = '100px';
                iframe.style.border = 'none';
                iframe.style.visibility = 'hidden';
                document.body.appendChild(iframe);
            }

            try {
                const doc = iframe.contentWindow.document;
                doc.open();
                doc.write(htmlContent);
                doc.close();

                setTimeout(() => {
                    try {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                    } catch (err) {
                        console.warn("Iframe print failed, opening fallback window:", err);
                        this.printViaPopupFallback(htmlContent);
                    }
                }, 250);
            } catch (e) {
                console.warn("Iframe write error:", e);
                this.printViaPopupFallback(htmlContent);
            }
        },

        printViaPopupFallback(htmlContent) {
            const printWin = window.open('', '_blank', 'width=420,height=700');
            if (printWin) {
                printWin.document.open();
                printWin.document.write(htmlContent);
                printWin.document.close();
                setTimeout(() => {
                    printWin.focus();
                    printWin.print();
                }, 300);
            } else {
                this.showToastNotification("يرجى السماح بالنوافذ المنبثقة للطباعة");
            }
        },

        printDraftThermalReceipt() {
            const draft = this.state.draft;
            if (!draft.items || draft.items.length === 0) {
                this.showToastNotification("يرجى اختيار أصناف أولا لتوليد الريسيت الحراري");
                return;
            }

            const tempBouquet = {
                code: 'DRAFT',
                name: draft.name || 'بوكيه قيد التجميع',
                creator_name: draft.creator || 'المصمم',
                quantity: draft.qty || 1,
                items: draft.items,
                total_price: draft.items.reduce((s, i) => s + (i.price * i.qty), 0),
                created_at: new Date().toISOString()
            };

            this.printThermalReceipt(tempBouquet);
        },

        printBouquetThermalReceipt(bouquetId) {
            const bouquet = this.state.bouquets.find(b => b.id === bouquetId);
            if (!bouquet) {
                this.showToastNotification("لم يتم العثور على بيانات البوكيه للطباعة");
                return;
            }
            this.printThermalReceipt(bouquet);
        },

        printActiveTimelineBouquet() {
            if (!this.state.activeTimelineBouquetId) return;
            this.printBouquetThermalReceipt(this.state.activeTimelineBouquetId);
        },

        // 10. معرض البوكيهات والمخزون
        renderShowcase() {
            const container = document.getElementById('gifts-showcase-container');
            const searchInput = document.getElementById('gifts-showcase-search');
            const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
            const filter = this.state.activeShowcaseFilter;

            if (!container) return;

            let list = this.state.bouquets.filter(b => {
                if (query) {
                    const matchName = (b.name || '').toLowerCase().includes(query);
                    const matchCreator = (b.creator_name || '').toLowerCase().includes(query);
                    if (!matchName && !matchCreator) return false;
                }
                if (filter !== 'all' && b.status !== filter) return false;
                return true;
            });

            if (list.length === 0) {
                container.innerHTML = `
                    <div class="gifts-empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
                        <div class="gifts-empty-icon-wrap">
                            <i class="fa-solid fa-gift"></i>
                        </div>
                        <h4>لا توجد بوكيهات مسجلة حاليا</h4>
                        <p>يمكنك البدء بإنشاء وتجميع أول بوكيه من شاشة التجميع</p>
                    </div>
                `;
                return;
            }

            const now = Date.now();
            container.innerHTML = list.map(b => {
                let badgeHtml = '';
                const createdTime = new Date(b.created_at).getTime();
                const isNew = (now - createdTime) < (24 * 60 * 60 * 1000);

                if (b.status === 'sold') {
                    badgeHtml = '<span class="gifts-badge badge-sold">تم البيع</span>';
                } else if (b.status === 'disassembled') {
                    badgeHtml = '<span class="gifts-badge badge-disassembled">مفكك</span>';
                } else if (b.quantity === 1) {
                    badgeHtml = '<span class="gifts-badge badge-last">آخر قطعة</span>';
                } else if (isNew) {
                    badgeHtml = '<span class="gifts-badge badge-new">جديد اليوم</span>';
                } else {
                    badgeHtml = '<span class="gifts-badge badge-ready">جاهز في المحل</span>';
                }

                const imgHtml = b.image_url ?
                    `<img src="${b.image_url}" class="gifts-card-img" alt="${b.name}">` :
                    `<div class="gifts-card-img-placeholder"><i class="fa-solid fa-gift"></i></div>`;

                const itemsCount = b.items ? b.items.length : 0;
                const itemsPreview = (b.items || []).slice(0, 3).map(i => `${i.qty}× ${i.name}`).join(' ، ') + (itemsCount > 3 ? '...' : '');

                return `
                    <div class="gifts-card">
                        <div>
                            <div class="gifts-card-img-wrap">
                                ${badgeHtml}
                                ${imgHtml}
                                <span class="gifts-card-qty-chip">${b.quantity} بوكيه</span>
                            </div>
                            <div class="gifts-card-body">
                                <div class="gifts-card-header">
                                    <h4 class="gifts-card-title">${b.name}</h4>
                                </div>
                                <div class="gifts-card-creator">
                                    <i class="fa-solid fa-user-pen" style="color: var(--gifts-primary);"></i>
                                    <span>صنع بواسطة: ${b.creator_name}</span>
                                </div>
                                <div class="gifts-card-items-preview">
                                    <i class="fa-solid fa-cubes" style="margin-left: 4px; color: var(--gifts-primary);"></i>
                                    ${itemsPreview || 'لا توجد مكونات'}
                                </div>
                                <div class="gifts-card-price-row">
                                    <span style="font-size: 0.85rem; color: var(--gifts-text-muted);">سعر البيع:</span>
                                    <span class="gifts-card-price">${Number(b.total_price).toFixed(2)} ج.م</span>
                                </div>
                            </div>
                        </div>

                        <div class="gifts-card-actions">
                            <button type="button" class="gifts-card-btn" title="طباعة باركودات الأصناف" onclick="GiftsApp.printBouquetThermalReceipt('${b.id}')">
                                <i class="fa-solid fa-print"></i> طباعة
                            </button>
                            ${b.status === 'ready' ? `
                                <button type="button" class="gifts-card-btn" style="color: var(--gifts-teal);" title="تسجيل كـ مباع" onclick="GiftsApp.markBouquetSold('${b.id}')">
                                    <i class="fa-solid fa-bag-shopping"></i> بيع
                                </button>
                                <button type="button" class="gifts-card-btn" style="color: var(--gifts-amber);" title="تفكيك وإرجاع الأصناف للمخزن" onclick="GiftsApp.disassembleBouquet('${b.id}')">
                                    <i class="fa-solid fa-arrow-rotate-left"></i> تفكيك
                                </button>
                            ` : ''}
                            <button type="button" class="gifts-card-btn" title="نسخ وتعديل سريع" onclick="GiftsApp.openCloneModal('${b.id}')">
                                <i class="fa-solid fa-copy"></i> تعديل
                            </button>
                            <button type="button" class="gifts-card-btn" title="سجل حركات البوكيه" onclick="GiftsApp.openTimelineModal('${b.id}')">
                                <i class="fa-solid fa-clock-rotate-left"></i> سجل
                            </button>
                            <button type="button" class="gifts-card-btn" style="color: var(--gifts-red);" title="حذف البوكيه نهائياً" onclick="GiftsApp.deleteBouquet('${b.id}')">
                                <i class="fa-solid fa-trash-can"></i> حذف
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        },

        async deleteBouquet(id) {
            const bouquet = this.state.bouquets.find(b => b.id === id);
            if (!bouquet) return;

            if (!confirm(`هل أنت متأكد من حذف البوكيه "${bouquet.name}" نهائياً من النظام؟`)) {
                return;
            }

            if (window.supabase) {
                try {
                    await window.supabase.from(GIFTS_TABLE).delete().eq('id', id);
                } catch (e) {
                    console.warn("Supabase delete bouquet error:", e);
                }
            }

            this.state.bouquets = this.state.bouquets.filter(b => b.id !== id);
            this.saveBouquetsToLocal();
            this.updateHeaderStats();
            this.renderShowcase();
            this.showToastNotification(`تم حذف البوكيه "${bouquet.name}" بنجاح`);
        },

        setShowcaseFilter(filter, btnEl) {
            this.state.activeShowcaseFilter = filter;
            document.querySelectorAll('.gifts-showcase-toolbar .gifts-chip').forEach(c => c.classList.remove('active'));
            if (btnEl) btnEl.classList.add('active');
            this.renderShowcase();
        },

        async disassembleBouquet(id) {
            const bouquet = this.state.bouquets.find(b => b.id === id);
            if (!bouquet) return;

            const totalQty = parseInt(bouquet.quantity) || 1;
            let disQty = 1;

            if (totalQty > 1) {
                const answer = prompt(`البوكيه متوفر منه (${totalQty}) قطع.\nكم عدد القطع المراد تفكيكها وإرجاع مكوناتها للمخزن؟ (أدخل رقماً من 1 إلى ${totalQty})`, String(totalQty));
                if (answer === null) return;
                const parsed = parseInt(answer);
                if (isNaN(parsed) || parsed < 1 || parsed > totalQty) {
                    this.showToastNotification("يرجى إدخال كمية صحيحة");
                    return;
                }
                disQty = parsed;
            } else {
                if (!confirm(`هل أنت متأكد من تفكيك البوكيه "${bouquet.name}" وإرجاع جميع مكوناته إلى المخزون؟`)) {
                    return;
                }
            }

            const now = new Date().toISOString();
            const userName = this.getCurrentUserName();

            if (disQty === totalQty) {
                bouquet.status = 'disassembled';
                bouquet.disassembled_at = now;
                bouquet.timeline.push({
                    event: `تم تفكيك كامل البوكيه (${disQty} قطعة) وإرجاع كافة المكونات إلى المخزون`,
                    by: userName,
                    time: now
                });

                if (window.supabase) {
                    try {
                        await window.supabase
                            .from(GIFTS_TABLE)
                            .update({
                                status: 'disassembled',
                                disassembled_at: now,
                                timeline: bouquet.timeline
                            })
                            .eq('id', id);
                    } catch (e) {
                        console.warn("Supabase update error:", e);
                    }
                }
            } else {
                bouquet.quantity = totalQty - disQty;
                bouquet.timeline.push({
                    event: `تم تفكيك (${disQty}) بوكيه وإرجاع مكوناتها للمخزن، والمتبقي (${bouquet.quantity}) قطعة`,
                    by: userName,
                    time: now
                });

                if (window.supabase) {
                    try {
                        await window.supabase
                            .from(GIFTS_TABLE)
                            .update({
                                quantity: bouquet.quantity,
                                timeline: bouquet.timeline
                            })
                            .eq('id', id);
                    } catch (e) {
                        console.warn("Supabase update error:", e);
                    }
                }

                const disRecord = {
                    ...JSON.parse(JSON.stringify(bouquet)),
                    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `bq_dis_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    quantity: disQty,
                    status: 'disassembled',
                    disassembled_at: now,
                    timeline: [
                        { event: `تم تفكيك (${disQty}) قطعة تم فصلها من البوكيه وإرجاع مكوناتها للمخزن`, by: userName, time: now }
                    ]
                };

                if (window.supabase) {
                    try {
                        await window.supabase.from(GIFTS_TABLE).insert([disRecord]);
                    } catch (e) {
                        console.warn("Supabase insert disRecord error:", e);
                    }
                }
                this.state.bouquets.unshift(disRecord);
            }

            this.saveBouquetsToLocal();
            this.updateHeaderStats();
            this.renderShowcase();
            this.showToastNotification(`تم تفكيك (${disQty}) بوكيه وإرجاع محتوياته للمخزن بنجاح`);
        },

        async markBouquetSold(id) {
            const bouquet = this.state.bouquets.find(b => b.id === id);
            if (!bouquet) return;

            const totalQty = parseInt(bouquet.quantity) || 1;
            let soldQty = 1;

            if (totalQty > 1) {
                const answer = prompt(`البوكيه متوفر منه (${totalQty}) قطع في المحل.\nكم عدد القطع التي تم بيعها؟ (أدخل رقماً من 1 إلى ${totalQty})`, "1");
                if (answer === null) return;
                const parsed = parseInt(answer);
                if (isNaN(parsed) || parsed < 1 || parsed > totalQty) {
                    this.showToastNotification("يرجى إدخال كمية صحيحة");
                    return;
                }
                soldQty = parsed;
            }

            const now = new Date().toISOString();
            const userName = this.getCurrentUserName();

            if (soldQty === totalQty) {
                bouquet.status = 'sold';
                bouquet.sold_at = now;
                bouquet.timeline.push({
                    event: `تم بيع كامل البوكيه (${soldQty} قطعة) للعميل`,
                    by: userName,
                    time: now
                });

                if (window.supabase) {
                    try {
                        await window.supabase
                            .from(GIFTS_TABLE)
                            .update({
                                status: 'sold',
                                sold_at: now,
                                timeline: bouquet.timeline
                            })
                            .eq('id', id);
                    } catch (e) {
                        console.warn("Supabase update error:", e);
                    }
                }
            } else {
                bouquet.quantity = totalQty - soldQty;
                bouquet.timeline.push({
                    event: `تم بيع (${soldQty}) قطعة من البوكيه، والمتبقي (${bouquet.quantity}) قطعة`,
                    by: userName,
                    time: now
                });

                if (window.supabase) {
                    try {
                        await window.supabase
                            .from(GIFTS_TABLE)
                            .update({
                                quantity: bouquet.quantity,
                                timeline: bouquet.timeline
                            })
                            .eq('id', id);
                    } catch (e) {
                        console.warn("Supabase update error:", e);
                    }
                }

                const soldRecord = {
                    ...JSON.parse(JSON.stringify(bouquet)),
                    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `bq_sold_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    quantity: soldQty,
                    status: 'sold',
                    sold_at: now,
                    timeline: [
                        { event: `تم بيع (${soldQty}) قطعة تم فصلها من البوكيه الأصلي`, by: userName, time: now }
                    ]
                };

                if (window.supabase) {
                    try {
                        await window.supabase.from(GIFTS_TABLE).insert([soldRecord]);
                    } catch (e) {
                        console.warn("Supabase insert soldRecord error:", e);
                    }
                }
                this.state.bouquets.unshift(soldRecord);
            }

            this.saveBouquetsToLocal();
            this.updateHeaderStats();
            this.renderShowcase();
            this.showToastNotification(`تم تسجيل بيع (${soldQty}) بوكيه بنجاح`);
        },

        openCloneModal(id) {
            const bouquet = this.state.bouquets.find(b => b.id === id);
            if (!bouquet) return;

            this.state.cloneTarget = JSON.parse(JSON.stringify(bouquet));
            const modal = document.getElementById('gifts-modal-clone');
            const nameInput = document.getElementById('gifts-clone-name');
            const creatorInput = document.getElementById('gifts-clone-creator');

            if (nameInput) nameInput.value = `نسخة من ${bouquet.name}`;
            if (creatorInput) creatorInput.value = this.getCurrentUserName();

            this.renderCloneItems();
            if (modal) modal.classList.add('active');
        },

        renderCloneItems() {
            const container = document.getElementById('gifts-clone-items-container');
            const priceEl = document.getElementById('gifts-clone-total-price');
            if (!container || !this.state.cloneTarget) return;

            const items = this.state.cloneTarget.items || [];
            let total = 0;
            items.forEach(i => total += (i.price * i.qty));

            if (priceEl) priceEl.innerText = `${total.toFixed(2)} ج.م`;

            container.innerHTML = items.map((item, idx) => `
                <div class="gifts-basket-item">
                    <div style="flex: 1;">
                        <div class="gifts-basket-name">${item.name}</div>
                        <div class="gifts-basket-sub">${item.price.toFixed(2)} ج.م</div>
                    </div>
                    <div class="gifts-basket-actions">
                        <button type="button" class="gifts-stepper-btn" onclick="GiftsApp.updateCloneItemQty(${idx}, -1)">-</button>
                        <span class="gifts-stepper-val">${item.qty}</span>
                        <button type="button" class="gifts-stepper-btn" onclick="GiftsApp.updateCloneItemQty(${idx}, 1)">+</button>
                        <button type="button" class="gifts-basket-remove" onclick="GiftsApp.removeCloneItem(${idx})">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        },

        updateCloneItemQty(index, delta) {
            if (!this.state.cloneTarget) return;
            this.state.cloneTarget.items[index].qty += delta;
            if (this.state.cloneTarget.items[index].qty <= 0) {
                this.state.cloneTarget.items.splice(index, 1);
            }
            this.renderCloneItems();
        },

        removeCloneItem(index) {
            if (!this.state.cloneTarget) return;
            this.state.cloneTarget.items.splice(index, 1);
            this.renderCloneItems();
        },

        async confirmCloneBouquet() {
            const nameInput = document.getElementById('gifts-clone-name');
            const creatorInput = document.getElementById('gifts-clone-creator');

            const name = nameInput ? nameInput.value.trim() : '';
            const creator = creatorInput ? creatorInput.value.trim() : this.getCurrentUserName();

            if (!name) {
                this.showToastNotification("يرجى كتابة اسم البوكيه الجديد");
                return;
            }

            if (!this.state.cloneTarget.items || this.state.cloneTarget.items.length === 0) {
                this.showToastNotification("لا يمكن حفظ بوكيه فارغ من الأصناف");
                return;
            }

            const totalPrice = this.state.cloneTarget.items.reduce((s, i) => s + (i.price * i.qty), 0);
            const now = new Date().toISOString();

            const clonedBouquet = {
                id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `local_${Date.now()}`,
                name: name,
                creator_name: creator,
                color_tag: '#E91E8C',
                quantity: 1,
                total_price: totalPrice,
                status: 'ready',
                items: this.state.cloneTarget.items,
                image_url: this.state.cloneTarget.image_url,
                timeline: [
                    { event: `تم إنشاء البوكيه بالنسخ والتعديل من "${this.state.cloneTarget.name}"`, by: creator, time: now }
                ],
                created_at: now
            };

            if (window.supabase) {
                try {
                    let { error } = await window.supabase.from(GIFTS_TABLE).insert([clonedBouquet]);
                    if (error && error.code === '23502') {
                        let tempRecord = { ...clonedBouquet, code: clonedBouquet.id };
                        await window.supabase.from(GIFTS_TABLE).insert([tempRecord]);
                    }
                } catch (e) {
                    console.warn("Supabase clone error:", e);
                }
            }

            this.state.bouquets.unshift(clonedBouquet);
            this.saveBouquetsToLocal();
            this.closeModal('gifts-modal-clone');
            this.updateHeaderStats();
            this.renderShowcase();
            this.showToastNotification(`تم إنشاء البوكيه المنسوخ "${name}" بنجاح`);
        },

        openTimelineModal(id) {
            const bouquet = this.state.bouquets.find(b => b.id === id);
            if (!bouquet) return;

            this.state.activeTimelineBouquetId = id;

            const headerInfo = document.getElementById('gifts-timeline-header-info');
            const container = document.getElementById('gifts-timeline-container');
            const modal = document.getElementById('gifts-modal-timeline');

            if (headerInfo) {
                headerInfo.innerHTML = `
                    <div style="color: var(--gifts-primary-dark); font-size: 1.15rem; margin-bottom: 4px;">${bouquet.name}</div>
                    <div style="color: var(--gifts-text-muted); font-size: 0.88rem;">المسؤول عن التصميم: ${bouquet.creator_name} | السعر: ${Number(bouquet.total_price).toFixed(2)} ج.م</div>
                `;
            }

            const events = bouquet.timeline || [];
            if (container) {
                if (events.length === 0) {
                    container.innerHTML = '<div style="color: var(--gifts-text-muted); padding: 10px;">لا توجد أحداث مسجلة لهذا البوكيه</div>';
                } else {
                    container.innerHTML = events.map(ev => {
                        const dateStr = new Date(ev.time).toLocaleString('ar-EG');
                        return `
                            <div class="gifts-timeline-step">
                                <div class="gifts-timeline-dot"></div>
                                <div class="gifts-timeline-time">${dateStr}</div>
                                <div class="gifts-timeline-text">${ev.event}</div>
                                <div style="font-size: 0.78rem; color: var(--gifts-text-muted);">بواسطة: ${ev.by || 'النظام'}</div>
                            </div>
                        `;
                    }).join('');
                }
            }

            if (modal) modal.classList.add('active');
        },

        closeModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) modal.classList.remove('active');
        },

        // 11. القوالب السريعة
        async saveAsTemplate() {
            const items = this.state.draft.items;
            if (!items || items.length === 0) {
                this.showToastNotification("يرجى اختيار أصناف أولا لحفظها كقالب سريع");
                return;
            }

            const templateName = prompt("أدخل اسما لهذا القالب السريع:");
            if (!templateName || templateName.trim() === '') return;

            const newTemplate = {
                id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                template_name: templateName.trim(),
                items: items,
                estimated_price: items.reduce((s, i) => s + (i.price * i.qty), 0),
                created_by: this.getCurrentUserName(),
                created_at: new Date().toISOString()
            };

            if (window.supabase) {
                try {
                    const { error } = await window.supabase.from(GIFTS_TEMPLATES_TABLE).insert([newTemplate]);
                    if (error) {
                        console.warn("Supabase insert template error:", error);
                    }
                } catch (e) {
                    console.warn("Supabase template insert error:", e);
                }
            }

            this.state.templates.push(newTemplate);
            this.saveTemplatesToLocal();
            this.showToastNotification(`تم حفظ القالب السريع "${templateName}"`);
        },

        async loadTemplates() {
            let loaded = false;
            if (window.supabase) {
                try {
                    const { data, error } = await window.supabase
                        .from(GIFTS_TEMPLATES_TABLE)
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (!error && Array.isArray(data)) {
                        this.state.templates = data;
                        this.saveTemplatesToLocal();
                        loaded = true;
                    } else if (error) {
                        console.warn("Supabase load templates error:", error);
                    }
                } catch (e) {
                    console.warn("Supabase load templates error:", e);
                }
            }

            if (!loaded) {
                try {
                    const localTmpl = localStorage.getItem('candy_gifts_templates');
                    if (localTmpl) this.state.templates = JSON.parse(localTmpl);
                } catch (e) {
                    console.warn("Could not read local templates:", e);
                }
            }
        },

        saveTemplatesToLocal() {
            try {
                localStorage.setItem('candy_gifts_templates', JSON.stringify(this.state.templates));
            } catch (e) {
                console.warn("Could not write templates to LocalStorage:", e);
            }
        },

        openTemplatesModal() {
            const modal = document.getElementById('gifts-modal-templates');
            const searchInput = document.getElementById('gifts-template-search-input');
            if (searchInput) searchInput.value = '';
            this.state.templateSearchQuery = '';

            this.renderTemplatesList();

            if (modal) modal.classList.add('active');
        },

        filterTemplates(query) {
            this.state.templateSearchQuery = query || '';
            this.renderTemplatesList();
        },

        renderTemplatesList() {
            const container = document.getElementById('gifts-templates-list-body');
            if (!container) return;

            const templates = this.state.templates || [];
            const q = (this.state.templateSearchQuery || '').trim().toLowerCase();

            let filtered = templates;
            if (q) {
                filtered = templates.filter(t => {
                    const nameMatch = (t.template_name || '').toLowerCase().includes(q);
                    const itemsMatch = (t.items || []).some(i => (i.name || '').toLowerCase().includes(q));
                    return nameMatch || itemsMatch;
                });
            }

            if (filtered.length === 0) {
                if (templates.length === 0) {
                    container.innerHTML = `
                        <div class="gifts-empty-state" style="padding: 28px 16px;">
                            <div class="gifts-empty-icon-wrap">
                                <i class="fa-solid fa-layer-group"></i>
                            </div>
                            <h4>لا توجد قوالب محفوظة حتى الآن</h4>
                            <p>يمكنك تجميع أصناف في شاشة التجميع وحفظها كقالب، أو تحميل قوالب جاهزة مقترحة للبدء فوراً</p>
                            <div style="margin-top: 18px; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                                <button type="button" class="gifts-btn-primary" style="padding: 10px 20px; font-size: 0.9rem;" onclick="GiftsApp.loadStarterTemplates()">
                                    <i class="fa-solid fa-sparkles"></i> تحميل 3 قوالب نموذجية مقترحة
                                </button>
                            </div>
                        </div>
                    `;
                } else {
                    container.innerHTML = `
                        <div class="gifts-empty-state" style="padding: 24px 16px;">
                            <div class="gifts-empty-icon-wrap" style="background: #F1F5F9; color: #64748B; border-color: #CBD5E1;">
                                <i class="fa-solid fa-magnifying-glass"></i>
                            </div>
                            <h4>لا توجد قوالب تطابق "${this.escapeHtml(q)}"</h4>
                            <p>جرّب البحث باسم آخر أو بمكونات الصنف</p>
                            <button type="button" class="gifts-btn-outline" style="margin-top: 14px;" onclick="document.getElementById('gifts-template-search-input').value=''; GiftsApp.filterTemplates('');">
                                عرض جميع القوالب
                            </button>
                        </div>
                    `;
                }
                return;
            }

            container.innerHTML = `
                <div class="gifts-templates-list">
                    ${filtered.map(t => {
                        const items = t.items || [];
                        const totalUnits = items.reduce((s, i) => s + (Number(i.qty) || 1), 0);
                        const pills = items.map(i => `
                            <span class="gifts-template-item-pill">
                                <span class="pill-qty">${i.qty}×</span>
                                <span class="pill-name">${i.name}</span>
                                <span class="pill-price">${(Number(i.price) * Number(i.qty)).toFixed(0)} ج.م</span>
                            </span>
                        `).join('');

                        return `
                            <div class="gifts-template-card">
                                <div class="gifts-template-card-header">
                                    <div class="gifts-template-title-group">
                                        <div class="gifts-template-icon-badge">
                                            <i class="fa-solid fa-wand-magic-sparkles"></i>
                                        </div>
                                        <div>
                                            <h4 class="gifts-template-name">${t.template_name}</h4>
                                            <div class="gifts-template-meta">
                                                <span class="gifts-template-meta-item">
                                                    <i class="fa-solid fa-boxes-stacked"></i> ${totalUnits} قطعة (${items.length} أصناف)
                                                </span>
                                                ${t.created_by ? `
                                                    <span class="gifts-template-meta-item">
                                                        <i class="fa-solid fa-user"></i> ${t.created_by}
                                                    </span>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" class="gifts-template-del-btn" title="حذف القالب نهائياً" onclick="GiftsApp.deleteTemplate('${t.id}')">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                </div>

                                <div class="gifts-template-items-wrap">
                                    ${pills || '<span style="font-size: 0.8rem; color: var(--gifts-text-muted);">لا توجد مكونات</span>'}
                                </div>

                                <div class="gifts-template-footer">
                                    <div class="gifts-template-price-box">
                                        <span class="gifts-template-price-label">السعر الإجمالي التقديري</span>
                                        <span class="gifts-template-price-val">${Number(t.estimated_price).toFixed(2)} <small>ج.م</small></span>
                                    </div>
                                    <button type="button" class="gifts-btn-primary gifts-template-apply-btn" onclick="GiftsApp.applyTemplate('${t.id}')">
                                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                                        <span>تطبيق القالب في التجميع</span>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        },

        async loadStarterTemplates() {
            const starters = [
                {
                    id: 'tmpl_starter_1',
                    template_name: 'بوكيه كيندر وسعادة فاخر',
                    items: [
                        { id: 'item_st_1', name: 'شوكولاتة كيندر بوينو', qty: 3, price: 35 },
                        { id: 'item_st_2', name: 'كيندر جوي أولادي', qty: 2, price: 38 },
                        { id: 'item_st_3', name: 'تغليف وتنسيق ورد هدايا', qty: 1, price: 50 }
                    ],
                    estimated_price: 231,
                    created_by: 'النظام',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'tmpl_starter_2',
                    template_name: 'بوكس سهرة مكسرات وشوكولاتة ملكي',
                    items: [
                        { id: 'item_st_4', name: 'بوكس كاندي كلوب خشبي فاخر', qty: 1, price: 85 },
                        { id: 'item_st_5', name: 'مكسرات مشكلة محمصة (250 جم)', qty: 1, price: 120 },
                        { id: 'item_st_6', name: 'شوكولاتة جالاكسي ميني مشكل', qty: 4, price: 22 }
                    ],
                    estimated_price: 293,
                    created_by: 'النظام',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'tmpl_starter_3',
                    template_name: 'توزيعات العيد والمناسبات المميزة',
                    items: [
                        { id: 'item_st_7', name: 'أكياس هدايا ميني شيفون', qty: 10, price: 8 },
                        { id: 'item_st_8', name: 'شوكولاتة نوتيلا بي-ريدي', qty: 5, price: 25 },
                        { id: 'item_st_9', name: 'كارت إهداء كاندي كلوب', qty: 1, price: 15 }
                    ],
                    estimated_price: 220,
                    created_by: 'النظام',
                    created_at: new Date().toISOString()
                }
            ];

            this.state.templates = starters;
            this.saveTemplatesToLocal();
            if (window.supabase) {
                try {
                    await window.supabase.from(GIFTS_TEMPLATES_TABLE).upsert(starters);
                } catch (e) {
                    console.warn("Supabase upsert starter templates:", e);
                }
            }
            this.renderTemplatesList();
            this.showToastNotification("تم تحميل 3 قوالب نموذجية مقترحة بنجاح");
        },

        applyTemplate(templateId) {
            const template = this.state.templates.find(t => t.id === templateId);
            if (!template) return;

            this.state.draft.items = JSON.parse(JSON.stringify(template.items || []));
            this.state.draft.name = template.template_name;

            const nameInput = document.getElementById('gifts-input-name');
            if (nameInput) nameInput.value = template.template_name;

            this.onDraftChanged();
            this.renderDraftBasket();
            this.renderRecentAddedList();
            this.closeModal('gifts-modal-templates');
            this.showToastNotification(`تم تطبيق القالب "${template.template_name}"`);
        },

        async deleteTemplate(templateId) {
            if (!confirm("هل أنت متأكد من حذف هذا القالب؟")) return;
            if (window.supabase) {
                try {
                    await window.supabase.from(GIFTS_TEMPLATES_TABLE).delete().eq('id', templateId);
                } catch (e) {
                    console.warn("Supabase delete template error:", e);
                }
            }
            this.state.templates = this.state.templates.filter(t => t.id !== templateId);
            this.saveTemplatesToLocal();
            this.renderTemplatesList();
            this.showToastNotification("تم حذف القالب بنجاح");
        },

        // 12. التقارير ولوحة الصدارة
        onReportPeriodChanged() {
            const select = document.getElementById('gifts-report-period');
            const customDates = document.getElementById('gifts-custom-dates');
            if (!select) return;

            this.state.reportPeriod = select.value;
            if (select.value === 'custom') {
                if (customDates) customDates.style.display = 'flex';
            } else {
                if (customDates) customDates.style.display = 'none';
                this.renderAnalytics();
            }
        },

        renderAnalytics() {
            const period = this.state.reportPeriod;
            let fromDate = null;
            let toDate = new Date();

            const now = new Date();
            if (period === 'today') {
                fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            } else if (period === 'this_week') {
                const day = now.getDay();
                const daysBack = (day + 1) % 7;
                fromDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
                fromDate.setHours(0, 0, 0, 0);
            } else if (period === 'this_month') {
                fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
            } else if (period === 'custom') {
                const fInput = document.getElementById('gifts-report-from');
                const tInput = document.getElementById('gifts-report-to');
                if (fInput && fInput.value) fromDate = new Date(fInput.value);
                if (tInput && tInput.value) {
                    toDate = new Date(tInput.value);
                    toDate.setHours(23, 59, 59, 999);
                }
            }

            const filteredBouquets = this.state.bouquets.filter(b => {
                if (!fromDate) return true;
                const created = new Date(b.created_at);
                return created >= fromDate && created <= toDate;
            });

            let totalCreated = 0;
            let totalSold = 0;
            let remainingStock = 0;
            let totalRevenue = 0;

            const employeeStats = {};

            filteredBouquets.forEach(b => {
                const qty = b.quantity || 1;
                totalCreated += qty;

                const creator = b.creator_name || 'غير محدد';
                if (!employeeStats[creator]) {
                    employeeStats[creator] = { made: 0, sold: 0, salesVal: 0 };
                }
                employeeStats[creator].made += qty;

                if (b.status === 'sold') {
                    totalSold += qty;
                    totalRevenue += Number(b.total_price);
                    employeeStats[creator].sold += qty;
                    employeeStats[creator].salesVal += Number(b.total_price);
                } else if (b.status === 'ready') {
                    remainingStock += qty;
                }
            });

            const kpiCreated = document.getElementById('kpi-total-created');
            const kpiSold = document.getElementById('kpi-total-sold');
            const kpiRemaining = document.getElementById('kpi-remaining-stock');
            const kpiRevenue = document.getElementById('kpi-total-revenue');

            if (kpiCreated) kpiCreated.innerText = totalCreated;
            if (kpiSold) kpiSold.innerText = totalSold;
            if (kpiRemaining) kpiRemaining.innerText = remainingStock;
            if (kpiRevenue) kpiRevenue.innerText = `${totalRevenue.toFixed(2)} ج.م`;

            const tbody = document.getElementById('gifts-employee-tbody');
            const leaderboardList = document.getElementById('gifts-leaderboard-list');

            const employeeArray = Object.keys(employeeStats).map(name => ({
                name: name,
                made: employeeStats[name].made,
                sold: employeeStats[name].sold,
                salesVal: employeeStats[name].salesVal
            })).sort((a, b) => (b.sold - a.sold) || (b.made - a.made));

            if (tbody) {
                if (employeeArray.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gifts-text-muted); padding: 20px;">لا توجد مبيعات مسجلة في هذه الفترة</td></tr>';
                } else {
                    tbody.innerHTML = employeeArray.map((emp, idx) => {
                        let rankBadge = '<span style="color: #64748B; font-weight: bold;">نشط</span>';
                        if (idx === 0 && emp.sold > 0) rankBadge = '<span style="color: #D97706; font-weight: 900;"><i class="fa-solid fa-crown"></i> متصدر</span>';
                        else if (idx === 1 && emp.sold > 0) rankBadge = '<span style="color: #0D9488; font-weight: 900;"><i class="fa-solid fa-star"></i> متميز</span>';
                        else if (emp.sold > 0) rankBadge = '<span style="color: #BE185D; font-weight: bold;"><i class="fa-solid fa-medal"></i> منجز</span>';
                        return `
                        <tr>
                            <td style="font-weight: 900; color: var(--gifts-primary-dark);">${emp.name}</td>
                            <td>${emp.made}</td>
                            <td style="font-weight: 800; color: var(--gifts-teal);">${emp.sold}</td>
                            <td>${emp.salesVal.toFixed(2)} ج.م</td>
                            <td>${rankBadge}</td>
                        </tr>
                    `;
                    }).join('');
                }
            }

            if (leaderboardList) {
                if (employeeArray.length === 0) {
                    leaderboardList.innerHTML = '<div style="text-align: center; color: var(--gifts-text-muted); padding: 20px;">لا توجد إحصائيات للموظفين بعد</div>';
                } else {
                    leaderboardList.innerHTML = employeeArray.slice(0, 5).map((emp, idx) => `
                        <div class="gifts-rank-item ${idx === 0 ? 'rank-1' : ''}">
                            <div class="gifts-rank-badge">${idx + 1}</div>
                            <div style="flex: 1;">
                                <div style="font-weight: 900; font-size: 0.95rem; color: var(--gifts-primary-dark);">${emp.name}</div>
                                <div style="font-size: 0.8rem; color: var(--gifts-text-muted);">${emp.sold} مباع (${emp.made} مصنّع)</div>
                            </div>
                            <div style="font-weight: 900; color: var(--gifts-primary);">${emp.salesVal.toFixed(0)} ج.م</div>
                        </div>
                    `).join('');
                }
            }
        },

        exportManagementPDF() {
            const periodSelect = document.getElementById('gifts-report-period');
            const periodText = periodSelect ? periodSelect.options[periodSelect.selectedIndex].text : '';

            const bouquets = this.state.bouquets;
            const totalSold = bouquets.filter(b => b.status === 'sold').length;
            const totalReady = bouquets.filter(b => b.status === 'ready').length;
            const totalRev = bouquets.filter(b => b.status === 'sold').reduce((s, b) => s + Number(b.total_price), 0);

            const empMap = {};
            bouquets.forEach(b => {
                const name = b.creator_name || 'غير محدد';
                if (!empMap[name]) empMap[name] = { made: 0, sold: 0, rev: 0 };
                empMap[name].made += (b.quantity || 1);
                if (b.status === 'sold') {
                    empMap[name].sold += (b.quantity || 1);
                    empMap[name].rev += Number(b.total_price);
                }
            });

            const printWindow = window.open('', '_blank', 'width=1000,height=800');
            if (!printWindow) {
                this.showToastNotification("يرجى السماح بالنوافذ المنبثقة لطباعة ملف الـ PDF");
                return;
            }

            const bouquetsRows = bouquets.slice(0, 40).map(b => {
                const statusBadge = b.status === 'sold' ? 'تم البيع' : (b.status === 'ready' ? 'جاهز' : 'مفكك');
                const itemsText = (b.items || []).map(i => `${i.qty}× ${i.name}`).join(' ، ');
                const imgTag = b.image_url ? `<img src="${b.image_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">` : '-';
                return `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #FCE7F3; text-align: center;">${imgTag}</td>
                        <td style="padding: 8px; border: 1px solid #FCE7F3; font-weight: bold;">${b.name}</td>
                        <td style="padding: 8px; border: 1px solid #FCE7F3; text-align: center;">${b.creator_name}</td>
                        <td style="padding: 8px; border: 1px solid #FCE7F3; font-size: 11px;">${itemsText}</td>
                        <td style="padding: 8px; border: 1px solid #FCE7F3; text-align: center; font-weight: bold; color: #E91E8C;">${Number(b.total_price).toFixed(2)} ج.م</td>
                        <td style="padding: 8px; border: 1px solid #FCE7F3; text-align: center;">${statusBadge}</td>
                    </tr>
                `;
            }).join('');

            const empRows = Object.keys(empMap).map((name, idx) => {
                let badge = empMap[name].sold > 0 ? (idx === 0 ? 'متصدر المبيعات' : 'متميز') : 'نشط';
                return `
                <tr>
                    <td style="padding: 8px; border: 1px solid #FCE7F3; font-weight: bold;">${name}</td>
                    <td style="padding: 8px; border: 1px solid #FCE7F3; text-align: center;">${empMap[name].made}</td>
                    <td style="padding: 8px; border: 1px solid #FCE7F3; text-align: center; font-weight: bold; color: #0D9488;">${empMap[name].sold}</td>
                    <td style="padding: 8px; border: 1px solid #FCE7F3; text-align: center; font-weight: bold; color: #BE185D;">${empMap[name].rev.toFixed(2)} ج.م</td>
                    <td style="padding: 8px; border: 1px solid #FCE7F3; text-align: center; font-weight: bold; color: #E91E8C;">${badge}</td>
                </tr>
            `;
            }).join('');

            printWindow.document.write(`
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <title>تقرير قسم الهدايا والبوكيهات - كاندي كلوب</title>
                    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Cairo', sans-serif; padding: 25px; margin: 0; color: #1E293B; background: #FFF; }
                        .report-header { text-align: center; border-bottom: 3px solid #E91E8C; padding-bottom: 16px; margin-bottom: 24px; }
                        .report-title { font-size: 24px; font-weight: 900; color: #BE185D; margin: 0 0 6px 0; }
                        .report-sub { font-size: 14px; color: #64748B; margin: 0; }
                        .kpi-row { display: flex; gap: 15px; margin-bottom: 24px; }
                        .kpi-box { flex: 1; background: #FFF5F9; border: 1px solid #FCE7F3; border-radius: 8px; padding: 12px; text-align: center; }
                        .kpi-box h4 { margin: 0 0 6px 0; font-size: 13px; color: #64748B; }
                        .kpi-box div { font-size: 20px; font-weight: 900; color: #BE185D; }
                        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 25px; }
                        th { background: #E91E8C; color: #FFF; padding: 10px; text-align: center; font-weight: 800; }
                        @media print {
                            body { padding: 10mm; }
                            @page { size: A4 portrait; margin: 10mm; }
                        }
                    </style>
                </head>
                <body>
                    <div class="report-header">
                        <h1 class="report-title">تقرير قسم الهدايا والبوكيهات الرسمي</h1>
                        <p class="report-sub">كاندي كلوب Candy Club - الفترة: ${periodText} (تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')})</p>
                    </div>

                    <div class="kpi-row">
                        <div class="kpi-box"><h4>إجمالي المصنوع</h4><div>${bouquets.length} بوكيه</div></div>
                        <div class="kpi-box"><h4>إجمالي المباع</h4><div>${totalSold} بوكيه</div></div>
                        <div class="kpi-box"><h4>جاهز في المحل</h4><div>${totalReady} بوكيه</div></div>
                        <div class="kpi-box"><h4>إجمالي الإيرادات</h4><div>${totalRev.toFixed(2)} ج.م</div></div>
                    </div>

                    <h3 style="color: #BE185D; border-bottom: 2px solid #FCE7F3; padding-bottom: 6px;">مبيعات وإنجاز الموظفين</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>اسم الموظف</th>
                                <th>المصنوع</th>
                                <th>المباع</th>
                                <th>قيمة المبيعات</th>
                                <th>التقييم والتميز</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${empRows || '<tr><td colspan="5" style="text-align: center; padding: 15px;">لا توجد بيانات</td></tr>'}
                        </tbody>
                    </table>

                    <h3 style="color: #BE185D; border-bottom: 2px solid #FCE7F3; padding-bottom: 6px;">تفاصيل وسجل البوكيهات</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>الصورة</th>
                                <th>اسم البوكيه</th>
                                <th>المصمم</th>
                                <th>المحتويات</th>
                                <th>السعر</th>
                                <th>الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bouquetsRows || '<tr><td colspan="6" style="text-align: center; padding: 15px;">لا توجد بوكيهات</td></tr>'}
                        </tbody>
                    </table>

                    <div style="text-align: center; font-size: 11px; color: #94A3B8; margin-top: 30px; border-top: 1px solid #FCE7F3; padding-top: 10px;">
                        تم استخراج هذا التقرير آليا بواسطة نظام كاندي كلوب المعتمد
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
            `);
            printWindow.document.close();
        },

        // 13. كتالوج العملاء التسويقي
        renderCustomerCatalog() {
            const container = document.getElementById('gifts-customer-catalog-grid');
            if (!container) return;

            const readyBouquets = this.state.bouquets.filter(b => b.status === 'ready');

            if (readyBouquets.length === 0) {
                container.innerHTML = `
                    <div class="gifts-empty-state" style="grid-column: 1 / -1; padding: 40px;">
                        <i class="fa-solid fa-store-slash" style="font-size: 2.2rem; color: #CBD5E1; margin-bottom: 8px;"></i>
                        <h4>لا توجد بوكيهات معروضة للبيع حاليا</h4>
                        <p>قم بتجميع بوكيهات جديدة لتظهر في الكتالوج التسويقي للعملاء</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = readyBouquets.map(b => {
                const imgHtml = b.image_url ?
                    `<img src="${b.image_url}" class="gifts-card-img" alt="${b.name}">` :
                    `<div class="gifts-card-img-placeholder"><i class="fa-solid fa-gift"></i></div>`;

                const itemsList = (b.items || []).map(i => `<li>${i.qty}× ${i.name}</li>`).join('');

                return `
                    <div class="gifts-card">
                        <div class="gifts-card-img-wrap">
                            ${imgHtml}
                            <span class="gifts-badge badge-ready">متوفر في المحل</span>
                        </div>
                        <div class="gifts-card-body">
                            <h4 class="gifts-card-title">${b.name}</h4>
                            <div style="font-size: 0.85rem; font-weight: 800; color: var(--gifts-primary-dark); margin-bottom: 4px;">المحتويات:</div>
                            <ul style="margin: 0 0 12px 0; padding-right: 18px; font-size: 0.82rem; color: var(--gifts-text);">
                                ${itemsList}
                            </ul>
                            <div class="gifts-card-price-row">
                                <span style="font-size: 0.85rem; color: var(--gifts-text-muted);">السعر:</span>
                                <span class="gifts-card-price">${Number(b.total_price).toFixed(2)} ج.م</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        },

        exportCustomerCatalogPDF() {
            const readyBouquets = this.state.bouquets.filter(b => b.status === 'ready');
            if (readyBouquets.length === 0) {
                this.showToastNotification("لا توجد بوكيهات جاهزة لعرضها في كتالوج العملاء");
                return;
            }

            const printWindow = window.open('', '_blank', 'width=1000,height=800');
            if (!printWindow) {
                this.showToastNotification("يرجى السماح بالنوافذ المنبثقة لفتح الكتالوج");
                return;
            }

            const cardsHtml = readyBouquets.map(b => {
                const imgTag = b.image_url ?
                    `<img src="${b.image_url}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">` :
                    `<div style="width: 100%; height: 160px; background: #FFF0F6; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #E91E8C; border-radius: 8px; margin-bottom: 10px;"><i class="fa-solid fa-gift"></i></div>`;

                const itemsSummary = (b.items || []).map(i => `${i.qty}× ${i.name}`).join(' ، ');

                return `
                    <div style="border: 2px solid #FCE7F3; border-radius: 12px; padding: 14px; background: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; page-break-inside: avoid;">
                        <div>
                            ${imgTag}
                            <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #BE185D;">${b.name}</h3>
                            <div style="font-size: 12px; color: #334155; line-height: 1.4; margin-bottom: 12px;"><strong>المكونات:</strong> ${itemsSummary}</div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #FCE7F3; padding-top: 8px;">
                            <span style="font-size: 12px; color: #64748B;">السعر الرسمي:</span>
                            <span style="font-size: 18px; font-weight: 900; color: #E91E8C;">${Number(b.total_price).toFixed(2)} ج.م</span>
                        </div>
                    </div>
                `;
            }).join('');

            printWindow.document.write(`
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <title>كتالوج بوكيهات وهدايا كاندي كلوب</title>
                    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Cairo', sans-serif; padding: 25px; margin: 0; color: #1E293B; background: #FFFDFE; }
                        .catalog-header { text-align: center; border-bottom: 3px solid #E91E8C; padding-bottom: 16px; margin-bottom: 24px; }
                        .catalog-title { font-size: 26px; font-weight: 900; color: #BE185D; margin: 0 0 6px 0; }
                        .catalog-sub { font-size: 14px; color: #E91E8C; font-weight: 700; margin: 0; }
                        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                        @media print {
                            body { padding: 8mm; background: #FFF; }
                            @page { size: A4 portrait; margin: 8mm; }
                        }
                    </style>
                </head>
                <body>
                    <div class="catalog-header">
                        <h1 class="catalog-title">تشكيلة بوكيهات وهدايا كاندي كلوب</h1>
                        <p class="catalog-sub">Candy Club Gifts Collection - أحدث البوكيهات الفاخرة المتاحة في الفرع</p>
                    </div>

                    <div class="grid">
                        ${cardsHtml}
                    </div>

                    <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #64748B; border-top: 1px solid #FCE7F3; padding-top: 12px;">
                        للطلب والحجز والاستفسار يرجى التواصل مع خدمة عملاء كاندي كلوب
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
            `);
            printWindow.document.close();
        },

        updateHeaderStats() {
            const bouquets = this.state.bouquets;
            const readyCount = bouquets.filter(b => b.status === 'ready').reduce((s, b) => s + (b.quantity || 1), 0);
            const soldCount = bouquets.filter(b => b.status === 'sold').reduce((s, b) => s + (b.quantity || 1), 0);

            const todayStr = new Date().toISOString().split('T')[0];
            const todayCreated = bouquets.filter(b => (b.created_at || '').startsWith(todayStr)).reduce((s, b) => s + (b.quantity || 1), 0);

            const readyEl = document.getElementById('gifts-stat-ready');
            const soldEl = document.getElementById('gifts-stat-sold');
            const todayEl = document.getElementById('gifts-stat-today');

            if (readyEl) readyEl.innerText = readyCount;
            if (soldEl) soldEl.innerText = soldCount;
            if (todayEl) todayEl.innerText = todayCreated;
        },

        getCurrentUserName() {
            try {
                const stored = localStorage.getItem('cc_user');
                if (stored) {
                    const user = JSON.parse(stored);
                    if (user && user.displayName) return user.displayName;
                }
            } catch (e) {}
            return 'الموظف';
        },

        showToastNotification(message) {
            if (typeof window.showToast === 'function') {
                window.showToast(message, 'info');
            } else {
                alert(message);
            }
        },

        bindEvents() {
            window.addEventListener('click', (e) => {
                if (e.target.classList && e.target.classList.contains('gifts-modal-overlay')) {
                    e.target.classList.remove('active');
                }
                const dropdown = document.getElementById('gifts-autocomplete-dropdown');
                if (dropdown && !e.target.closest('.gifts-scanner-input-wrap')) {
                    dropdown.style.display = 'none';
                }
            });
        }
    };

    window.GiftsApp = GiftsApp;

})(window);

/**
 * ================================================================
 * ملحق: كود وسيط Google Apps Script لرفع صور البوكيهات إلى Google Drive
 * (مدمج هنا ليكون مع ملف الهدايا في مكان واحد)
 * 
 * خطوات الاستخدام عند الرغبة في تفعيله:
 * 1. افتح https://script.google.com بحساب Google الخاص بك
 * 2. أنشئ مشروعا جديدا والصق هذا الكود
 * 3. استبدل FOLDER_ID بمعرف مجلد Google Drive المطلوب
 * 4. اضغط Deploy -> New Deployment -> Web App -> Who has access: Anyone
 * 5. انسخ الرابط وضع قيمة GOOGLE_DRIVE_WEBAPP_URL في أعلى هذا الملف
 * ================================================================
 */
/*
var FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var base64Data = data.image;
    var fileName = data.filename || ("bouquet_" + new Date().getTime() + ".jpg");
    
    if (base64Data.indexOf("base64,") > -1) {
      base64Data = base64Data.split("base64,")[1];
    }
    
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, "image/jpeg", fileName);
    
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileId = file.getId();
    var viewUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      fileId: fileId,
      url: viewUrl
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    service: "Candy Club Google Drive Image Uploader"
  })).setMimeType(ContentService.MimeType.JSON);
}
*/
