// ==========================================
// 🌐 نظام كاندي كلوب المطور - (النسخة النهائية للـ 5 شاشات)
// ==========================================

// ⚠️ حط الرابط السري بتاعك هنا (اللي آخره exec)
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwAYO1cCYq-qjlhj4T1jW6639AqHOAcA2ADFyP91c49KcJVLFY7TwoXmP8rewWgXOIolw/exec";

// ==========================================
// 1. نظام التبديل بين الشاشات (التابات الـ 5)
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
// 2. سحب البيانات من الإكسيل (لحل خطأ الاتصال)
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

            // أ- تعبئة المحافظات
            const govSelect = document.getElementById('governorate');
            govSelect.innerHTML = '<option value="">-- اختر المنطقة / المحافظة --</option>';

            if(data.alex && data.alex.length > 0) {
                let optgroup = document.createElement('optgroup');
                optgroup.label = "⚓ مناطق الإسكندرية";
                data.alex.forEach(zone => {
                    shippingData[zone.name] = { price: zone.price, type: zone.type };
                    optgroup.innerHTML += `<option value="${zone.name}">${zone.name} (${zone.price}ج)</option>`;
                });
                govSelect.appendChild(optgroup);
            }

            if(data.govs && data.govs.length > 0) {
                let optgroup = document.createElement('optgroup');
                optgroup.label = "🚚 المحافظات";
                data.govs.forEach(zone => {
                    shippingData[zone.name] = { price: zone.price, type: zone.type };
                    optgroup.innerHTML += `<option value="${zone.name}">${zone.name} (${zone.price}ج)</option>`;
                });
                govSelect.appendChild(optgroup);
            }

            // ب- تعبئة المناديب في شاشة الشحن
            const driverSelect = document.getElementById('driverNameSelect');
            driverSelect.innerHTML = '<option value="">-- اختر مندوب --</option>';
            if(data.couriers && data.couriers.length > 0) {
                data.couriers.forEach(c => {
                    driverSelect.innerHTML += `<option value="${c.name}">${c.name} (${c.phone})</option>`;
                });
            }

            // ج- تعبئة الاقتراحات الذكية للمنتجات
            const smartProductsList = document.getElementById('smartProductsList');
            smartProductsList.innerHTML = '';
            if(data.products && data.products.length > 0) {
                productsData = data.products;
                productsData.forEach(p => {
                    smartProductsList.innerHTML += `<option value="${p.name}">`;
                });
            }
        })
        .catch(err => {
            syncStatus.innerText = "خطأ في الاتصال";
            syncStatus.style.color = "red";
            console.error("Fetch Error:", err);
        });
};

// ==========================================
// 3. حاسبة مواعيد الشحن الذكية (تخطي الجمعة)
// ==========================================
function addBusinessDays(startDate, daysToAdd) {
    let date = new Date(startDate);
    let addedDays = 0;
    while (addedDays < daysToAdd) {
        date.setDate(date.getDate() + 1);
        if (date.getDay() !== 5) { // 5 = الجمعة
            addedDays++;
        }
    }
    return date;
}

const govSelect = document.getElementById('governorate');
govSelect.addEventListener('change', () => {
    let selectedZone = govSelect.value;
    let shippingCostInput = document.getElementById('shippingCost');
    let expectedDateDisplay = document.querySelector('#deliveryInfo span');
    
    if(!selectedZone || !shippingData[selectedZone]) {
        shippingCostInput.value = 0;
        expectedDateDisplay.innerText = "--";
        calculateTotal();
        return;
    }

    let info = shippingData[selectedZone];
    shippingCostInput.value = info.price || 0;

    let today = new Date();
    if(info.type === "same_day") {
        expectedDateDisplay.innerText = `اليوم (${today.toLocaleDateString('ar-EG')})`;
    } else if (info.type === "next_day") {
        today.setDate(today.getDate() + 1);
        expectedDateDisplay.innerText = `غداً (${today.toLocaleDateString('ar-EG')})`;
    } else if (info.type === "gov") {
        let startCountingDate = new Date();
        startCountingDate.setDate(startCountingDate.getDate() + 1);
        let minDate = addBusinessDays(startCountingDate, 3);
        let maxDate = addBusinessDays(startCountingDate, 4);
        expectedDateDisplay.innerText = `من ${minDate.toLocaleDateString('ar-EG')} إلى ${maxDate.toLocaleDateString('ar-EG')}`;
    }
    calculateTotal();
});

// ==========================================
// 4. نظام المنتجات الذكي
// ==========================================
const productsContainer = document.getElementById('productsContainer');

function addProductRow() {
    const div = document.createElement('div');
    div.className = 'product-row';
    div.innerHTML = `
        <input type="text" list="smartProductsList" class="product-name-input" placeholder="اكتب اسم المنتج..." required>
        <input type="number" class="product-price-input" placeholder="السعر" required value="0">
        <button type="button" class="remove-product-btn">×</button>
    `;
    productsContainer.appendChild(div);
    
    let nameInput = div.querySelector('.product-name-input');
    let priceInput = div.querySelector('.product-price-input');

    nameInput.addEventListener('input', () => {
        let selectedProduct = productsData.find(p => p.name === nameInput.value);
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

document.getElementById('discount').addEventListener('input', calculateTotal);
document.getElementById('shippingCost').addEventListener('input', calculateTotal);

// ==========================================
// 5. إرسال الأوردر لجوجل شيت
// ==========================================
document.getElementById('saveBtn').addEventListener('click', () => {
    const btn = document.getElementById('saveBtn');
    let name = document.getElementById('customerName').value;
    let gov = document.getElementById('governorate').value;
    
    if(!name || !gov) {
        alert("⚠️ يرجى إدخال اسم العميل واختيار المحافظة!");
        return;
    }

    let productsList = "";
    document.querySelectorAll('.product-row').forEach(row => {
        let pName = row.querySelector('.product-name-input').value;
        let pPrice = row.querySelector('.product-price-input').value;
        if(pName) productsList += `${pName} (${pPrice}ج)\n`;
    });

    let formData = new URLSearchParams();
    formData.append('platform', document.getElementById('platform').value);
    formData.append('customerName', name);
    formData.append('phone1', document.getElementById('phone1').value);
    formData.append('phone2', document.getElementById('phone2').value);
    formData.append('governorate', gov);
    formData.append('address', document.getElementById('address').value);
    formData.append('expectedDate', document.querySelector('#deliveryInfo span').innerText);
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
        alert("✅ تم إرسال الأوردر بنجاح!");
        btn.innerText = "💾 حفظ الأوردر";
        btn.disabled = false;
        document.getElementById('orderForm').reset();
        document.querySelector('#deliveryInfo span').innerText = "--";
        document.getElementById('finalTotalDisplay').innerText = "0";
        productsContainer.innerHTML = ''; 
        addProductRow(); 
    }).catch(err => {
        alert("❌ حدث خطأ في الاتصال");
        btn.innerText = "💾 حفظ الأوردر";
        btn.disabled = false;
    });
});

// ==========================================
// 6. إدارة الشحن (إضافة مناطق ومناديب من الموقع)
// ==========================================
document.getElementById('addZoneBtn').addEventListener('click', () => {
    let name = document.getElementById('newZoneName').value;
    let price = document.getElementById('newZonePrice').value;
    let type = document.getElementById('newZoneType').value;

    if(!name || !price) {
        alert("⚠️ يرجى إدخال اسم المنطقة وسعر الشحن!");
        return;
    }

    let zoneType = type === 'gov' ? 'govs' : 'alex';
    let formData = new URLSearchParams();
    formData.append('action', 'addShipping');
    formData.append('zoneType', zoneType);
    formData.append('name', name);
    formData.append('price', price);
    formData.append('deliveryType', type);

    let btn = document.getElementById('addZoneBtn');
    btn.innerText = "⏳ جاري الإضافة...";
    
    fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
    }).then(() => {
        alert("✅ تم إضافة المنطقة! (اعمل ريفريش للصفحة لتظهر)");
        btn.innerText = "إضافة المنطقة";
        document.getElementById('newZoneName').value = "";
        document.getElementById('newZonePrice').value = "";
    });
});

document.getElementById('addDriverBtn').addEventListener('click', () => {
    let name = document.getElementById('newDriverName').value;
    let phone = document.getElementById('newDriverPhone').value;

    if(!name || !phone) {
        alert("⚠️ يرجى إدخال اسم المندوب ورقمه!");
        return;
    }

    let formData = new URLSearchParams();
    formData.append('action', 'addDriver');
    formData.append('name', name);
    formData.append('phone', phone);

    let btn = document.getElementById('addDriverBtn');
    btn.innerText = "⏳ جاري الإضافة...";
    
    fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
    }).then(() => {
        alert("✅ تم إضافة المندوب! (اعمل ريفريش للصفحة لتظهر)");
        btn.innerText = "إضافة المندوب";
        document.getElementById('newDriverName').value = "";
        document.getElementById('newDriverPhone').value = "";
    });
});
