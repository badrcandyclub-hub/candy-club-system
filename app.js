// ==========================================
// 🌐 كود القلب النابض للسيستم (app.js)
// ==========================================
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwAYO1cCYq-qjlhj4T1jW6639AqHOAcA2ADFyP91c49KcJVLFY7TwoXmP8rewWgXOIolw/exec";

// تعريف العناصر
const govSelect = document.getElementById('governorate');
const shippingType = document.getElementById('shippingType');
const productsContainer = document.getElementById('productsContainer');
const finalTotalDisplay = document.getElementById('finalTotalDisplay');

// 1. نظام التبديل بين الشاشات (Tabs)
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // إزالة التفعيل من كل الزراير والشاشات
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // تفعيل الزرار والشاشة المطلوبة
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

// 2. نظام إضافة المنتجات وحساب السعر تلقائياً
function addProductRow() {
    const div = document.createElement('div');
    div.className = 'product-row';
    div.innerHTML = `
        <input type="text" class="product-name-input" placeholder="اسم المنتج" required>
        <input type="number" class="product-price-input" placeholder="السعر" required value="0">
        <button type="button" class="remove-product-btn">×</button>
    `;
    productsContainer.appendChild(div);
    
    // تشغيل دالة الحساب لما السعر يتغير
    div.querySelector('.product-price-input').addEventListener('input', calculateTotal);
    
    // زرار حذف المنتج
    div.querySelector('.remove-product-btn').addEventListener('click', () => {
        div.remove();
        calculateTotal();
    });
}

// تشغيل زرار إضافة المنتج
document.getElementById('addProductBtn').addEventListener('click', addProductRow);

// إضافة أول صف منتجات تلقائياً عند فتح الموقع
if(productsContainer.children.length === 0) addProductRow();

// دالة حساب الإجمالي
function calculateTotal() {
    let total = 0;
    // تجميع أسعار المنتجات
    document.querySelectorAll('.product-price-input').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('productsTotal').value = total;
    
    let discount = parseFloat(document.getElementById('discount').value) || 0;
    let shipping = parseFloat(document.getElementById('shippingCost').value) || 0;
    
    // الحساب النهائي
    let final = total + shipping - discount;
    finalTotalDisplay.innerText = final;
}

// 3. زر الحفظ في الشيت (الربط مع جوجل)
document.getElementById('saveBtn').addEventListener('click', () => {
    const btn = document.getElementById('saveBtn');
    
    // التأكد إن الرابط موجود
    if(!GOOGLE_SHEETS_URL || GOOGLE_SHEETS_URL === "") {
        alert("⚠️ خطأ: الرابط السري غير موجود!");
        return;
    }

    // تجميع المنتجات المكتوبة في نص واحد عشان تتبعت للإكسيل
    let productsList = "";
    document.querySelectorAll('.product-row').forEach(row => {
        let name = row.querySelector('.product-name-input').value;
        let price = row.querySelector('.product-price-input').value;
        if(name) productsList += `${name} (${price}ج) - `;
    });

    // تجميع كل البيانات من الموقع
    let formData = new URLSearchParams();
    formData.append('orderId', 'CANDY-' + Math.floor(Math.random()*10000));
    formData.append('customerName', document.getElementById('customerName').value || "");
    formData.append('governorate', govSelect.value || "");
    formData.append('address', document.getElementById('address').value || "");
    formData.append('phone1', document.getElementById('phone1').value || "");
    formData.append('phone2', document.getElementById('phone2').value || "");
    formData.append('paymentMethod', document.getElementById('paymentMethod').value || "");
    formData.append('products', productsList);
    formData.append('productsTotal', document.getElementById('productsTotal').value || 0);
    formData.append('discount', document.getElementById('discount').value || 0);
    formData.append('shippingCost', document.getElementById('shippingCost').value || 0);
    formData.append('finalTotal', finalTotalDisplay.innerText || 0);
    formData.append('notes', document.getElementById('notes').value || "");

    // تغيير شكل الزرار
    btn.innerText = "⏳ جاري الإرسال...";
    btn.disabled = true;

    // إرسال البيانات لجوجل شيت
    fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors', // لتخطي حماية جوجل في البداية
        body: formData
    }).then(() => {
        alert("✅ تم إرسال الطلب بنجاح إلى الإكسيل!");
        btn.innerText = "💾 حفظ في الشيت";
        btn.disabled = false;
        document.getElementById('orderForm').reset();
        calculateTotal(); // تصفير الحسابات
    }).catch(err => {
        alert("❌ حدث خطأ في الاتصال، حاول مرة أخرى.");
        btn.innerText = "💾 حفظ في الشيت";
        btn.disabled = false;
    });
});
