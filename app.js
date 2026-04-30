// ==========================================
// 🌐 العقل المدبر - سيستم كاندي كلوب V2
// ==========================================

// ⚠️ حط الرابط السري بتاعك هنا
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwAYO1cCYq-qjlhj4T1jW6639AqHOAcA2ADFyP91c49KcJVLFY7TwoXmP8rewWgXOIolw/exec";

// ==========================================
// 1. نظام الإشعارات الاحترافية (Toasts)
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    // اختفاء بعد 3 ثواني
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ==========================================
// 2. التبديل بين الشاشات
// ==========================================
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

// ==========================================
// 3. النوافذ المنبثقة (Modals)
// ==========================================
function setupModal(openBtnId, modalId, closeBtnId) {
    const modal = document.getElementById(modalId);
    document.getElementById(openBtnId).addEventListener('click', () => modal.classList.add('active'));
    document.getElementById(closeBtnId).addEventListener('click', () => modal.classList.remove('active'));
}

setupModal('openZoneModalBtn', 'zoneModal', 'closeZoneModal');
setupModal('openDriverModalBtn', 'driverModal', 'closeDriverModal');

// ==========================================
// 4. تحميل الداتا الأساسية عند فتح الموقع
// ==========================================
let shippingData = {};
let productsData = [];

window.onload = () => {
    const syncStatus = document.getElementById('sync-status');
    syncStatus.innerText = "جاري التحميل...";
    syncStatus.style.color = "#FF8C00";

    fetch(GOOGLE_SHEETS_URL)
        .then(res => res.json())
        .then(data => {
            syncStatus.innerText = "متصل";
            syncStatus.style.color = "#00C853";

            // تحميل المحافظات
            const govSelect = document.getElementById('governorate');
            if(data.alex && data.alex.length > 0) {
                let optgroup = document.createElement('optgroup');
                optgroup.label = "⚓ مناطق الإسكندرية";
                data.alex.forEach(z => { shippingData[z.name] = z; optgroup.innerHTML += `<option value="${z.name}">${z.name}</option>`; });
                govSelect.appendChild(optgroup);
            }
            if(data.govs && data.govs.length > 0) {
                let optgroup = document.createElement('optgroup');
                optgroup.label = "🚚 المحافظات";
                data.govs.forEach(z => { shippingData[z.name] = z; optgroup.innerHTML += `<option value="${z.name}">${z.name}</option>`; });
                govSelect.appendChild(optgroup);
            }

            // تحميل المناديب
            const driverSelect = document.getElementById('driverNameSelect');
            if(data.couriers) data.couriers.forEach(c => driverSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`);

            // تحميل الاقتراحات
            const smartProductsList = document.getElementById('smartProductsList');
            if(data.products) {
                productsData = data.products;
                productsData.forEach(p => smartProductsList.innerHTML += `<option value="${p.name}">`);
            }
        })
        .catch(err => {
            syncStatus.innerText = "خطأ اتصال";
            syncStatus.style.color = "red";
            showToast("فشل الاتصال بقاعدة البيانات", "error");
        });
};

// ==========================================
// 5. البحث عن العميل برقم الموبايل
// ==========================================
const phoneInput = document.getElementById('customerPhone');
const phoneStatus = document.getElementById('phoneCheckStatus');

phoneInput.addEventListener('input', () => {
    if (phoneInput.value.length === 11) {
        phoneStatus.innerText = "⏳";
        // إرسال طلب لجوجل للبحث عن العميل (هنحدث جوجل شيت عشان يفهمها)
        fetch(`${GOOGLE_SHEETS_URL}?action=checkPhone&phone=${phoneInput.value}`)
            .then(res => res.json())
            .then(data => {
                if(data.found) {
                    document.getElementById('customerName').value = data.name;
                    document.getElementById('address').value = data.address;
                    phoneStatus.innerText = "✅";
                    showToast(`أهلاً بعودتك يا ${data.name}!`, "success");
                } else {
                    phoneStatus.innerText = "🆕";
                    showToast("عميل جديد، يرجى تسجيل بياناته.", "warning");
                }
            }).catch(() => { phoneStatus.innerText = "🔍"; });
    } else {
        phoneStatus.innerText = "🔍";
    }
});

// ==========================================
// 6. حاسبة الشحن واستثناء الجمعة
// ==========================================
document.getElementById('governorate').addEventListener('change', function() {
    let zone = this.value;
    let costInput = document.getElementById('shippingCost');
    let dateDisplay = document.querySelector('#deliveryInfo span');
    
    if(!zone || !shippingData[zone]) {
        costInput.value = 0; dateDisplay.innerText = "--"; calculateTotal(); return;
    }

    let info = shippingData[zone];
    costInput.value = info.price || 0;

    let today = new Date();
    if(info.type === "same_day") {
        dateDisplay.innerText = `اليوم`;
    } else if (info.type === "next_day") {
        dateDisplay.innerText = `غداً`;
    } else {
        let start = new Date(); start.setDate(start.getDate() + 1);
        let added = 0;
        while(added < 3) { start.setDate(start.getDate() + 1); if(start.getDay() !== 5) added++; }
        let minDate = new Date(start);
        while(added < 4) { start.setDate(start.getDate() + 1); if(start.getDay() !== 5) added++; }
        dateDisplay.innerText = `من ${minDate.toLocaleDateString('ar-EG')} لـ ${start.toLocaleDateString('ar-EG')}`;
    }
    calculateTotal();
});

// ==========================================
// 7. المنتجات (نظام التأكيد والقفل ✔️ ❌)
// ==========================================
const productsContainer = document.getElementById('productsContainer');

function addProductRow() {
    const div = document.createElement('div');
    div.className = 'product-row';
    div.innerHTML = `
        <input type="text" list="smartProductsList" class="product-name-input" placeholder="اسم المنتج..." required>
        <input type="number" class="product-price-input" placeholder="السعر" required value="0">
        <button type="button" class="btn-confirm-pro interactive-btn" title="تأكيد المنتج">✔️</button>
        <button type="button" class="remove-product-btn interactive-btn" title="حذف">❌</button>
    `;
    productsContainer.appendChild(div);
    
    let nameInput = div.querySelector('.product-name-input');
    let priceInput = div.querySelector('.product-price-input');
    let confirmBtn = div.querySelector('.btn-confirm-pro');
    let removeBtn = div.querySelector('.remove-product-btn');

    nameInput.addEventListener('input', () => {
        let selected = productsData.find(p => p.name === nameInput.value);
        if(selected) priceInput.value = selected.price;
    });

    priceInput.addEventListener('input', calculateTotal);

    // زرار التأكيد والقفل
    confirmBtn.addEventListener('click', () => {
        if(!nameInput.value || priceInput.value <= 0) {
            showToast("اكتب اسم المنتج وسعره الأول!", "error");
            return;
        }
        if(div.classList.contains('confirmed')) {
            div.classList.remove('confirmed');
            confirmBtn.innerHTML = "✔️";
            nameInput.readOnly = false;
            priceInput.readOnly = false;
        } else {
            div.classList.add('confirmed');
            confirmBtn.innerHTML = "✏️";
            nameInput.readOnly = true;
            priceInput.readOnly = true;
            calculateTotal();
        }
    });

    removeBtn.addEventListener('click', () => { div.remove(); calculateTotal(); });
}

document.getElementById('addProductBtn').addEventListener('click', addProductRow);
if(productsContainer.children.length === 0) addProductRow();

function calculateTotal() {
    let total = 0;
    document.querySelectorAll('.product-row.confirmed .product-price-input').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('productsTotal').value = total;
    let discount = parseFloat(document.getElementById('discount').value) || 0;
    let shipping = parseFloat(document.getElementById('shippingCost').value) || 0;
    document.getElementById('finalTotalDisplay').innerText = total + shipping - discount;
}
document.getElementById('discount').addEventListener('input', calculateTotal);
document.getElementById('shippingCost').addEventListener('input', calculateTotal);

// ==========================================
// 8. تأكيد طريقة الدفع
// ==========================================
const paymentMethod = document.getElementById('paymentMethod');
const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
let isPaymentConfirmed = false;

confirmPaymentBtn.addEventListener('click', () => {
    if(!paymentMethod.value) {
        showToast("اختر طريقة الدفع أولاً!", "error");
        return;
    }
    if(isPaymentConfirmed) {
        isPaymentConfirmed = false;
        confirmPaymentBtn.classList.remove('confirmed');
        confirmPaymentBtn.innerHTML = "تأكيد ✔️";
        paymentMethod.disabled = false;
    } else {
        isPaymentConfirmed = true;
        confirmPaymentBtn.classList.add('confirmed');
        confirmPaymentBtn.innerHTML = "تم التأكيد 🔒";
        paymentMethod.disabled = true;
    }
});

// ==========================================
// 9. الحفظ والطباعة (الكنترول الصارم)
// ==========================================
document.getElementById('saveAndPrintBtn').addEventListener('click', () => {
    // 1. فحص المنتجات المؤكدة
    let unconfirmedRows = document.querySelectorAll('.product-row:not(.confirmed)');
    if(unconfirmedRows.length > 0) {
        showToast("يرجى تأكيد (✔️) أو حذف كل المنتجات قبل الحفظ!", "error");
        return;
    }
    
    let productsList = "";
    document.querySelectorAll('.product-row.confirmed').forEach(row => {
        productsList += `${row.querySelector('.product-name-input').value} (${row.querySelector('.product-price-input').value}ج)\n`;
    });

    if(productsList === "") {
        showToast("لا يمكن حفظ أوردر بدون منتجات!", "error");
        return;
    }

    // 2. فحص طريقة الدفع
    if(!isPaymentConfirmed) {
        showToast("يرجى تأكيد طريقة الدفع 🔒", "error");
        return;
    }

    // 3. فحص البيانات الأساسية
    let phone = document.getElementById('customerPhone').value;
    let name = document.getElementById('customerName').value;
    let gov = document.getElementById('governorate').value;
    let address = document.getElementById('address').value;

    if(!phone || phone.length !== 11) { showToast("رقم الموبايل يجب أن يكون 11 رقم!", "error"); return; }
    if(!name || !gov || !address) { showToast("يرجى إكمال بيانات العميل والمحافظة!", "error"); return; }

    const btn = document.getElementById('saveAndPrintBtn');
    btn.innerText = "⏳ جاري الإرسال وطباعة الفاتورة...";
    btn.disabled = true;

    let formData = new URLSearchParams();
    formData.append('platform', document.getElementById('platform').value);
    formData.append('customerName', name);
    formData.append('phone1', phone);
    formData.append('phone2', document.getElementById('phone2').value);
    formData.append('governorate', gov);
    formData.append('address', address);
    formData.append('expectedDate', document.querySelector('#deliveryInfo span').innerText);
    formData.append('products', productsList);
    formData.append('productsTotal', document.getElementById('productsTotal').value);
    formData.append('discount', document.getElementById('discount').value);
    formData.append('shippingCost', document.getElementById('shippingCost').value);
    formData.append('finalTotal', document.getElementById('finalTotalDisplay').innerText);
    formData.append('paymentMethod', paymentMethod.value);
    formData.append('notes', document.getElementById('notes').value);

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: formData })
    .then(() => {
        showToast("✅ تم حفظ الأوردر بنجاح! جاري الطباعة...", "success");
        setTimeout(() => {
            window.print(); // فتح شاشة الطباعة
            // إعادة ضبط الفورمة بعد الطباعة
            document.getElementById('orderForm').reset();
            document.querySelector('#deliveryInfo span').innerText = "--";
            document.getElementById('finalTotalDisplay').innerText = "0";
            productsContainer.innerHTML = ''; addProductRow();
            isPaymentConfirmed = false;
            confirmPaymentBtn.classList.remove('confirmed');
            confirmPaymentBtn.innerHTML = "تأكيد ✔️";
            paymentMethod.disabled = false;
            btn.innerText = "💾 حفظ وطباعة الفاتورة";
            btn.disabled = false;
        }, 1000);
    }).catch(() => {
        showToast("❌ حدث خطأ في الاتصال بالسيرفر", "error");
        btn.innerText = "💾 حفظ وطباعة الفاتورة";
        btn.disabled = false;
    });
});
