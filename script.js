// ==========================================
// 1. الرابط السري لجوجل شيت (سيتم إضافته لاحقاً)
// ==========================================
const GOOGLE_SHEETS_URL = "ضع_الرابط_السري_هنا_بين_علامات_التنصيص";

// ==========================================
// 2. تعريف المتغيرات وربطها بخانات الموقع
// ==========================================
const govSelect = document.getElementById('governorate');
const orderTypeSelect = document.getElementById('orderType');
const paymentSelect = document.getElementById('paymentMethod');
const shippingInput = document.getElementById('shippingCost');
const productsTotalInput = document.getElementById('productsTotal');
const discountInput = document.getElementById('discount');
const finalTotalDisplay = document.getElementById('finalTotalDisplay');

// أسعار الشحن المبدئية (نفس التي ستكون في الشيت)
const shippingPrices = {
    "الإسكندرية - سموحة": 30,
    "الإسكندرية - سيدي بشر": 40,
    "القاهرة": 80,
    "الجيزة": 80,
    "محافظات أخرى": 100
};

// إنشاء منطقة الطباعة المخفية في الموقع برمجياً
let printArea = document.createElement('div');
printArea.id = 'receipt-print-area';
document.body.appendChild(printArea);

// ==========================================
// 3. دالة الحساب التلقائي وشروط الدفع
// ==========================================
function calculateTotal() {
    let gov = govSelect.value;
    let shipping = shippingPrices[gov] || 0;
    shippingInput.value = shipping;

    let prodTotal = parseFloat(productsTotalInput.value) || 0;
    let discount = parseFloat(discountInput.value) || 0;

    // حساب الإجمالي
    let finalTotal = prodTotal + shipping - discount;
    finalTotalDisplay.innerText = finalTotal;

    // شرط الدفع: لو خارج إسكندرية أو الطلب هدية، نلغي الكاش
    let isAlexandria = gov.includes("الإسكندرية");
    let isGift = orderTypeSelect.value === "هدية";

    for(let i = 0; i < paymentSelect.options.length; i++) {
        if(paymentSelect.options[i].value === "كاش") {
            if(!isAlexandria || isGift) {
                paymentSelect.options[i].disabled = true; // تعطيل الكاش
                if(paymentSelect.value === "كاش") paymentSelect.value = ""; // تفريغ الخانة لو كان مختار كاش
            } else {
                paymentSelect.options[i].disabled = false; // تفعيل الكاش
            }
        }
    }
}

// تشغيل الحساب التلقائي فوراً عند تغيير أي خانة
govSelect.addEventListener('change', calculateTotal);
orderTypeSelect.addEventListener('change', calculateTotal);
productsTotalInput.addEventListener('input', calculateTotal);
discountInput.addEventListener('input', calculateTotal);

// ==========================================
// 4. زر الطباعة (تجهيز الفاتورة للـ PVC)
// ==========================================
document.getElementById('printBtn').addEventListener('click', () => {
    let isGift = orderTypeSelect.value === "هدية";
    let customerName = document.getElementById('customerName').value || "غير مسجل";
    let phone1 = document.getElementById('phone1').value || "";
    let address = document.getElementById('address').value || "";
    let products = document.getElementById('products').value || "";
    let notes = document.getElementById('notes').value || "";

    // تصميم الوصل المطبوع
    let receiptHTML = `
        <div class="receipt-header">
            🍬 كاندي كلوب<br>Candy Club
        </div>
        <div class="receipt-item"><strong>العميل:</strong> ${customerName}</div>
        <div class="receipt-item"><strong>تليفون:</strong> ${phone1}</div>
        <div class="receipt-item"><strong>العنوان:</strong> ${address}</div>
        <div class="receipt-item"><strong>المنتجات:</strong> ${products}</div>
        <div class="receipt-item"><strong>ملاحظات:</strong> ${notes}</div>
    `;

    // لو مش هدية، نطبع السعر
    if(!isGift) {
        receiptHTML += `<div class="receipt-total">الإجمالي المطلوب: ${finalTotalDisplay.innerText} جنيه</div>`;
    } else {
        receiptHTML += `<div class="receipt-total">🎁 طلب هدية (مدفوع)</div>`;
    }

    // وضع التصميم في منطقة الطباعة وفتح نافذة الطباعة
    printArea.innerHTML = receiptHTML;
    window.print();
});

// ==========================================
// 5. زر إرسال واتساب (تنسيق الرسالة وفتح التطبيق)
// ==========================================
document.getElementById('whatsappBtn').addEventListener('click', () => {
    let phone = document.getElementById('phone1').value;
    
    // تنظيف وتعديل رقم التليفون ليناسب واتساب (+20)
    if(phone.startsWith('01')) {
        phone = "+20" + phone.substring(1);
    }

    let customerName = document.getElementById('customerName').value;
    let products = document.getElementById('products').value;
    let total = finalTotalDisplay.innerText;
    let shipping = shippingInput.value;

    let message = `أهلاً بك في كاندي كلوب 🍬\n\n` +
                  `تم تأكيد طلبك بنجاح يا ${customerName} 🎉\n\n` +
                  `🛍️ تفاصيل الطلب:\n${products}\n\n` +
                  `🚚 مصاريف الشحن: ${shipping} جنيه\n` +
                  `💰 الإجمالي النهائي: ${total} جنيه\n\n` +
                  `شكراً لاختيارك كاندي كلوب، يومك سكر! 🍭`;

    // إنشاء رابط واتساب وفتحه في نافذة جديدة
    let whatsappURL = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, '_blank');
});

// ==========================================
// 6. زر الحفظ (إرسال البيانات لجوجل شيت)
// ==========================================
document.getElementById('saveBtn').addEventListener('click', () => {
    let btn = document.getElementById('saveBtn');
    
    // التأكد من وضع الرابط السري أولاً
    if(GOOGLE_SHEETS_URL === "ضع_الرابط_السري_هنا_بين_علامات_التنصيص") {
        alert("برجاء وضع الرابط السري لجوجل شيت في ملف الكود أولاً!");
        return;
    }

    // جمع البيانات من الخانات
    let formData = new FormData();
    formData.append('orderId', 'CAN-' + Math.floor(Math.random() * 10000));
    formData.append('customerName', document.getElementById('customerName').value);
    formData.append('governorate', govSelect.value);
    formData.append('address', document.getElementById('address').value);
    formData.append('phone1', document.getElementById('phone1').value);
    formData.append('phone2', document.getElementById('phone2').value);
    formData.append('paymentMethod', paymentSelect.value);
    formData.append('products', document.getElementById('products').value);
    formData.append('productsTotal', productsTotalInput.value);
    formData.append('discount', discountInput.value);
    formData.append('shippingCost', shippingInput.value);
    formData.append('finalTotal', finalTotalDisplay.innerText);
    formData.append('notes', document.getElementById('notes').value);

    // تغيير شكل الزرار أثناء التحميل
    btn.innerText = "⏳ جاري الحفظ...";
    btn.disabled = true;

    // إرسال البيانات
    fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        alert("✅ تم حفظ الطلب بنجاح في جوجل شيت!");
        btn.innerText = "💾 حفظ في الشيت";
        btn.disabled = false;
        document.getElementById('orderForm').reset(); // تفريغ الخانات لطلب جديد
        finalTotalDisplay.innerText = "0";
    })
    .catch(error => {
        alert("حدث خطأ أثناء الحفظ. تأكد من اتصال الإنترنت أو الرابط السري.");
        btn.innerText = "💾 حفظ في الشيت";
        btn.disabled = false;
    });
});
