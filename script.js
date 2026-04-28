// ==========================================
// 1. الرابط السري لجوجل شيت (حطه هنا لما يجهز)
// ==========================================
const GOOGLE_SHEETS_URL = "ضع_الرابط_السري_هنا";

// ==========================================
// 2. نظام التنقل بين الشاشات (التابات)
// ==========================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // إزالة التفعيل من كل التابات
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // تفعيل التاب المطلوب
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

// ==========================================
// 3. إدارة أسعار الشحن (حفظ في المتصفح)
// ==========================================
let shippingData = JSON.parse(localStorage.getItem('candyShipping')) || {
    alex: [{name: "سموحة", price: 30}, {name: "سيدي بشر", price: 40}],
    govs: [{name: "القاهرة", price: 80}, {name: "الجيزة", price: 80}]
};

function renderShippingRows() {
    const alexContainer = document.getElementById('alexShippingContainer');
    const govContainer = document.getElementById('govShippingContainer');
    
    alexContainer.innerHTML = '';
    shippingData.alex.forEach((item, index) => {
        alexContainer.innerHTML += `
            <div class="product-row">
                <input type="text" class="product-name" value="${item.name}" placeholder="اسم المنطقة">
                <input type="number" class="product-price" value="${item.price}" placeholder="السعر">
                <button type="button" class="remove-btn" onclick="removeShipping('alex', ${index})">X</button>
            </div>`;
    });

    govContainer.innerHTML = '';
    shippingData.govs.forEach((item, index) => {
        govContainer.innerHTML += `
            <div class="product-row">
                <input type="text" class="product-name" value="${item.name}" placeholder="اسم المحافظة">
                <input type="number" class="product-price" value="${item.price}" placeholder="السعر">
                <button type="button" class="remove-btn" onclick="removeShipping('govs', ${index})">X</button>
            </div>`;
    });
    updateGovernorateDropdown();
}

function addShippingRow(type) {
    shippingData[type].push({name: "", price: 0});
    renderShippingRows();
}

function removeShipping(type, index) {
    shippingData[type].splice(index, 1);
    renderShippingRows();
}

document.getElementById('saveShippingBtn').addEventListener('click', () => {
    // تجميع البيانات من الخانات
    const alexRows = document.querySelectorAll('#alexShippingContainer .product-row');
    shippingData.alex = Array.from(alexRows).map(row => ({
        name: row.querySelector('.product-name').value,
        price: parseFloat(row.querySelector('.product-price').value) || 0
    })).filter(item => item.name !== "");

    const govRows = document.querySelectorAll('#govShippingContainer .product-row');
    shippingData.govs = Array.from(govRows).map(row => ({
        name: row.querySelector('.product-name').value,
        price: parseFloat(row.querySelector('.product-price').value) || 0
    })).filter(item => item.name !== "");

    localStorage.setItem('candyShipping', JSON.stringify(shippingData));
    alert("✅ تم حفظ أسعار الشحن بنجاح!");
    updateGovernorateDropdown();
});

// تحديث القائمة المنسدلة في شاشة الطلبات
const shippingTypeSelect = document.getElementById('shippingType');
const govSelect = document.getElementById('governorate');

function updateGovernorateDropdown() {
    let type = shippingTypeSelect.value;
    govSelect.innerHTML = '<option value="">-- اختر المنطقة --</option>';
    
    if (type === 'alex' || type === 'govs') {
        govSelect.disabled = false;
        shippingData[type].forEach(item => {
            let opt = document.createElement('option');
            opt.value = item.name;
            opt.dataset.price = item.price;
            opt.innerText = `${item.name} (${item.price} ج)`;
            govSelect.appendChild(opt);
        });
    } else {
        govSelect.disabled = true;
    }
    calculateTotal();
}
shippingTypeSelect.addEventListener('change', updateGovernorateDropdown);
govSelect.addEventListener('change', calculateTotal);

// ==========================================
// 4. إدارة اللوجو (حفظ وعرض)
// ==========================================
const logoInput = document.getElementById('logoInput');
const logoPreview = document.getElementById('logoPreview');
const clearLogoBtn = document.getElementById('clearLogoBtn');

// استرجاع اللوجو عند فتح الموقع
let savedLogo = localStorage.getItem('candyLogo');
if (savedLogo) {
    logoPreview.src = savedLogo;
    logoPreview.style.display = 'inline-block';
    clearLogoBtn.style.display = 'inline-block';
}

logoInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const base64Logo = event.target.result;
            localStorage.setItem('candyLogo', base64Logo);
            logoPreview.src = base64Logo;
            logoPreview.style.display = 'inline-block';
            clearLogoBtn.style.display = 'inline-block';
            alert('✅ تم حفظ اللوجو بنجاح!');
        };
        reader.readAsDataURL(file);
    }
});

clearLogoBtn.addEventListener('click', () => {
    localStorage.removeItem('candyLogo');
    logoPreview.src = '';
    logoPreview.style.display = 'none';
    clearLogoBtn.style.display = 'none';
    logoInput.value = '';
});

// ==========================================
// 5. المنتجات الديناميكية والحسابات
// ==========================================
const productsContainer = document.getElementById('productsContainer');
const productsTotalInput = document.getElementById('productsTotal');
const discountInput = document.getElementById('discount');
const shippingCostInput = document.getElementById('shippingCost');
const finalTotalDisplay = document.getElementById('finalTotalDisplay');
const paymentMethod = document.getElementById('paymentMethod');
const orderType = document.getElementById('orderType');

function addProductRow() {
    const row = document.createElement('div');
    row.className = 'product-row';
    row.innerHTML = `
        <input type="text" class="product-name order-product-name" placeholder="اسم المنتج (مثال: جيلي كولا)" required>
        <input type="number" class="product-price order-product-price" placeholder="السعر" required value="0" min="0">
        <button type="button" class="remove-btn" onclick="this.parentElement.remove(); calculateTotal();">X</button>
    `;
    productsContainer.appendChild(row);
    
    // ربط تغيير السعر بتحديث الإجمالي
    row.querySelector('.order-product-price').addEventListener('input', calculateTotal);
}
document.getElementById('addProductBtn').addEventListener('click', addProductRow);

function calculateTotal() {
    // حساب مجموع المنتجات
    let productsTotal = 0;
    document.querySelectorAll('.order-product-price').forEach(input => {
        productsTotal += parseFloat(input.value) || 0;
    });
    productsTotalInput.value = productsTotal;

    // جلب سعر الشحن
    let shippingCost = 0;
    if (govSelect.selectedIndex > 0) {
        shippingCost = parseFloat(govSelect.options[govSelect.selectedIndex].dataset.price) || 0;
    }
    shippingCostInput.value = shippingCost;

    let discount = parseFloat(discountInput.value) || 0;
    let finalTotal = productsTotal + shippingCost - discount;
    finalTotalDisplay.innerText = finalTotal;

    // شروط الدفع (إلغاء الكاش لو محافظات أو هدية)
    let isAlex = shippingTypeSelect.value === 'alex';
    let isGift = orderType.value === 'هدية';

    Array.from(paymentMethod.options).forEach(opt => {
        if (opt.value === 'كاش') {
            opt.disabled = (!isAlex || isGift);
            if (opt.disabled && paymentMethod.value === 'كاش') paymentMethod.value = "";
        }
    });
}
discountInput.addEventListener('input', calculateTotal);
orderType.addEventListener('change', calculateTotal);

// ==========================================
// 6. تجميع المنتجات في نص واحد (للواتساب والشيت)
// ==========================================
function getProductsText() {
    let textArray = [];
    document.querySelectorAll('#productsContainer .product-row').forEach(row => {
        let name = row.querySelector('.order-product-name').value;
        let price = row.querySelector('.order-product-price').value;
        if(name) textArray.push(`${name} (${price} ج)`);
    });
    return textArray.join(' - ');
}

// ==========================================
// 7. زر الطباعة (PVC)
// ==========================================
// إنشاء منطقة الطباعة المخفية
let printArea = document.createElement('div');
printArea.id = 'receipt-print-area';
document.body.appendChild(printArea);

document.getElementById('printBtn').addEventListener('click', () => {
    let isGift = orderType.value === "هدية";
    let customerName = document.getElementById('customerName').value || "غير مسجل";
    let phone1 = document.getElementById('phone1').value || "";
    let address = document.getElementById('address').value || "";
    let notes = document.getElementById('notes').value || "";
    let productsListHTML = "";

    document.querySelectorAll('#productsContainer .product-row').forEach(row => {
        let name = row.querySelector('.order-product-name').value;
        let price = row.querySelector('.order-product-price').value;
        if(name) {
            productsListHTML += `<div>${name} <span style="float:left;">${isGift ? '' : price + ' ج'}</span></div>`;
        }
    });

    let logoHTML = localStorage.getItem('candyLogo') ? `<div class="receipt-logo-container"><img src="${localStorage.getItem('candyLogo')}"></div>` : '';

    let receiptHTML = `
        ${logoHTML}
        <div class="receipt-header">🍬 كاندي كلوب</div>
        <div class="receipt-item"><strong>العميل:</strong> ${customerName}</div>
        <div class="receipt-item"><strong>تليفون:</strong> ${phone1}</div>
        <div class="receipt-item"><strong>العنوان:</strong> ${address}</div>
        <div class="receipt-item"><strong>المنطقة:</strong> ${govSelect.value}</div>
        
        <div class="receipt-products-list">
            <strong>المنتجات:</strong><br>
            ${productsListHTML}
        </div>
        
        <div class="receipt-item"><strong>ملاحظات:</strong> ${notes}</div>
    `;

    if(!isGift) {
        receiptHTML += `<div class="receipt-total">الإجمالي المطلوب: ${finalTotalDisplay.innerText} جنيه</div>`;
    } else {
        receiptHTML += `<div class="receipt-total">🎁 طلب هدية (مدفوع)</div>`;
    }

    printArea.innerHTML = receiptHTML;
    window.print();
});

// ==========================================
// 8. زر الواتساب
// ==========================================
document.getElementById('whatsappBtn').addEventListener('click', () => {
    let phone = document.getElementById('phone1').value;
    if(phone.startsWith('01')) phone = "+20" + phone.substring(1);

    let message = `أهلاً بك في كاندي كلوب 🍬\n\n` +
                  `تم تأكيد طلبك بنجاح يا ${document.getElementById('customerName').value} 🎉\n\n` +
                  `🛍️ تفاصيل الطلب:\n${getProductsText()}\n\n` +
                  `🚚 مصاريف الشحن: ${shippingCostInput.value} جنيه\n` +
                  `💰 الإجمالي النهائي: ${finalTotalDisplay.innerText} جنيه\n\n` +
                  `يومك سكر! 🍭`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
});

// ==========================================
// 9. زر الحفظ (جوجل شيت)
// ==========================================
document.getElementById('saveBtn').addEventListener('click', () => {
    let btn = document.getElementById('saveBtn');
    
    if(GOOGLE_SHEETS_URL === "ضع_الرابط_السري_هنا") {
        alert("⚠️ لم يتم ربط جوجل شيت بعد! (الرابط السري غير موجود)");
        return; // مؤقتاً لحد ما تجيب الرابط
    }

    let formData = new FormData();
    formData.append('orderId', 'CAN-' + Math.floor(Math.random() * 10000));
    formData.append('customerName', document.getElementById('customerName').value);
    formData.append('governorate', govSelect.value);
    formData.append('address', document.getElementById('address').value);
    formData.append('phone1', document.getElementById('phone1').value);
    formData.append('phone2', document.getElementById('phone2').value);
    formData.append('paymentMethod', paymentMethod.value);
    formData.append('products', getProductsText());
    formData.append('productsTotal', productsTotalInput.value);
    formData.append('discount', discountInput.value);
    formData.append('shippingCost', shippingCostInput.value);
    formData.append('finalTotal', finalTotalDisplay.innerText);
    formData.append('notes', document.getElementById('notes').value);

    btn.innerText = "⏳ جاري الحفظ...";
    btn.disabled = true;

    fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: formData })
    .then(response => response.json())
    .then(data => {
        alert("✅ تم حفظ الطلب في الشيت!");
        btn.innerText = "💾 حفظ في الشيت";
        btn.disabled = false;
        document.getElementById('orderForm').reset();
        productsContainer.innerHTML = '';
        addProductRow(); // إضافة سطر فارغ للطلب الجديد
        finalTotalDisplay.innerText = "0";
    }).catch(error => {
        alert("حدث خطأ أثناء الحفظ!");
        btn.innerText = "💾 حفظ في الشيت";
        btn.disabled = false;
    });
});

// تشغيل الشاشات والبيانات المبدئية عند فتح الموقع
renderShippingRows();
addProductRow();
