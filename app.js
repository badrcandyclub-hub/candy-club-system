// ==========================================
// 🌐 نظام كاندي كلوب المطور - (app.js) - النسخة الذكية
// ==========================================

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwAYO1cCYq-qjlhj4T1jW6639AqHOAcA2ADFyP91c49KcJVLFY7TwoXmP8rewWgXOIolw/exec";

// ==========================================
// 1. نظام التبديل بين الشاشات (التابات السفلية)
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
// 2. قاعدة بيانات مصغرة ذكية (لحل مشكلة كتابة المنتجات وأسعار الشحن)
// ==========================================

// كتالوج المنتجات (عشان نريح المدير من الكتابة) - تقدر تزود عليه براحتك
const productsCatalog = [
    { name: "كاندي فراولة 🍓 - 50 ملي", price: 150 },
    { name: "كاندي كولا 🥤 - طعم لاذع", price: 120 },
    { name: "بوكس التوفير ميكس 🎁", price: 300 },
    { name: "كاندي بطيخ 🍉 - 100 ملي", price: 200 }
];

// إنشاء قائمة منسدلة ذكية للمنتجات في الخلفية
const dataList = document.createElement('datalist');
dataList.id = "smartProducts";
productsCatalog.forEach(p => {
    dataList.innerHTML += `<option value="${p.name}" data-price="${p.price}">`;
});
document.body.appendChild(dataList);

// مناطق الشحن الذكية (بالأسعار وتصنيف المواعيد)
const shippingData = {
    "سموحة (نفس اليوم)": { price: 30, type: "same_day" },
    "ميامي (نفس اليوم)": { price: 40, type: "same_day" },
    "العجمي (تاني يوم)": { price: 50, type: "next_day" },
    "القاهرة": { price: 80, type: "gov" },
    "الجيزة": { price: 80, type: "gov" },
    "طنطا": { price: 60, type: "gov" }
};

// تعبئة قائمة المحافظات في الموقع
const govSelect = document.getElementById('governorate');
for (const [zone, info] of Object.entries(shippingData)) {
    govSelect.innerHTML += `<option value="${zone}">${zone}</option>`;
}

// ==========================================
// 3. حاسبة مواعيد الشحن الذكية (بتستثني يوم الجمعة)
// ==========================================
function addBusinessDays(startDate, daysToAdd) {
    let date = new Date(startDate);
    let addedDays = 0;
    while (addedDays < daysToAdd) {
        date.setDate(date.getDate() + 1);
        if (date.getDay() !== 5) { // رقم 5 هو يوم الجمعة
            addedDays++;
        }
    }
    return date;
}

govSelect.addEventListener('change', () => {
    let selectedZone = govSelect.value;
    let shippingCostInput = document.getElementById('shippingCost');
    let expectedDateDisplay = document.getElementById('expectedDateDisplay');
    
    if(!selectedZone) {
        shippingCostInput.value = 0;
        expectedDateDisplay.innerText = "--";
        calculateTotal();
        return;
    }

    let info = shippingData[selectedZone];
    shippingCostInput.value = info.price; // نزول السعر أوتوماتيك

    // حساب التاريخ
    let today = new Date();
    if(info.type === "same_day") {
        expectedDateDisplay.innerText = `اليوم (${today.toLocaleDateString('ar-EG')})`;
    } else if (info.type === "next_day") {
        today.setDate(today.getDate() + 1);
        expectedDateDisplay.innerText = `غداً (${today.toLocaleDateString('ar-EG')})`;
    } else if (info.type === "gov") {
        // المحافظات: يبدأ العد من بكرة، وياخد من 3 لـ 4 أيام، ويتخطى الجمعة
        let startCountingDate = new Date();
        startCountingDate.setDate(startCountingDate.getDate() + 1); // بكرة
        let minDate = addBusinessDays(startCountingDate, 3);
        let maxDate = addBusinessDays(startCountingDate, 4);
        expectedDateDisplay.innerText = `من ${minDate.toLocaleDateString('ar-EG')} إلى ${maxDate.toLocaleDateString('ar-EG')}`;
    }
    calculateTotal();
});

// ==========================================
// 4. نظام إضافة المنتجات (الذكي) وحساب الإجمالي
// ==========================================
const productsContainer = document.getElementById('productsContainer');

function addProductRow() {
    const div = document.createElement('div');
    div.className = 'product-row';
    div.innerHTML = `
        <input type="text" list="smartProducts" class="product-name-input" placeholder="اكتب اسم المنتج أو اختره" required>
        <input type="number" class="product-price-input" placeholder="السعر" required value="0">
        <button type="button" class="remove-product-btn">×</button>
    `;
    productsContainer.appendChild(div);
    
    let nameInput = div.querySelector('.product-name-input');
    let priceInput = div.querySelector('.product-price-input');

    // أول ما تختار المنتج من القائمة المنسدلة، يحط السعر لوحده
    nameInput.addEventListener('input', () => {
        let selectedProduct = productsCatalog.find(p => p.name === nameInput.value);
        if(selectedProduct) {
            priceInput.value = selectedProduct.price;
            calculateTotal();
        }
    });

    priceInput.addEventListener('input', calculateTotal);
    div.querySelector('.remove-product-btn').addEventListener('click', () => {
        div.remove();
        calculateTotal();
    });
}

document.getElementById('addProductBtn').addEventListener('click', addProductRow);
if(productsContainer.children.length === 0) addProductRow();

function calculateTotal() {
    let total = 0;
    document.querySelectorAll('.product-price-input').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('productsTotal').value = total;
    
    let discount = parseFloat(document.getElementById('discount').value) || 0;
    let shipping = parseFloat(document.getElementById('shippingCost').value) || 0;
    
    let final = total + shipping - discount;
    document.getElementById('finalTotalDisplay').innerText = final;
}

// حساب عند تعديل الخصم أو الشحن يدوياً
document.getElementById('discount').addEventListener('input', calculateTotal);
document.getElementById('shippingCost').addEventListener('input', calculateTotal);

// ==========================================
// 5. إرسال الطلب لجوجل شيت
// ==========================================
document.getElementById('saveBtn').addEventListener('click', () => {
    const btn = document.getElementById('saveBtn');
    
    // تجميع المنتجات
    let productsList = "";
    document.querySelectorAll('.product-row').forEach(row => {
        let name = row.querySelector('.product-name-input').value;
        let price = row.querySelector('.product-price-input').value;
        if(name) productsList += `${name} (${price}ج)\n`;
    });

    let formData = new URLSearchParams();
    formData.append('platform', document.getElementById('platform').value);
    formData.append('customerName', document.getElementById('customerName').value);
    formData.append('phone1', document.getElementById('phone1').value);
    formData.append('phone2', document.getElementById('phone2').value);
    formData.append('governorate', document.getElementById('governorate').value);
    formData.append('address', document.getElementById('address').value);
    formData.append('expectedDate', document.getElementById('expectedDateDisplay').innerText);
    formData.append('products', productsList);
    formData.append('productsTotal', document.getElementById('productsTotal').value);
    formData.append('discount', document.getElementById('discount').value);
    formData.append('shippingCost', document.getElementById('shippingCost').value);
    formData.append('finalTotal', document.getElementById('finalTotalDisplay').innerText);
    formData.append('notes', document.getElementById('notes').value);

    btn.innerText = "⏳ جاري الإرسال...";
    btn.disabled = true;

    fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
    }).then(() => {
        alert("✅ تم إرسال الطلب بنجاح إلى الإكسيل!");
        btn.innerText = "💾 حفظ في الشيت";
        btn.disabled = false;
        document.getElementById('orderForm').reset();
        document.getElementById('expectedDateDisplay').innerText = "--";
        document.getElementById('finalTotalDisplay').innerText = "0";
        productsContainer.innerHTML = ''; 
        addProductRow(); // إضافة صف فاضي جديد
    }).catch(err => {
        alert("❌ حدث خطأ في الاتصال");
        btn.innerText = "💾 حفظ في الشيت";
        btn.disabled = false;
    });
});
