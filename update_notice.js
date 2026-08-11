// ملف إشعار التحديث الجديد - منفصل تماماً عن النظام
// اسم الملف: update_notice.js
// يمكنك مسح هذا الملف ومسح السطر الخاص به من index.html بعد أسبوع

document.addEventListener('DOMContentLoaded', () => {

    const showUpdatePopup = () => {
        if (document.getElementById('candy-update-popup')) return;
        
        const popupHtml = `
            <div id="candy-update-popup" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.75); z-index: 999999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); animation: fadeInPopup 0.3s ease; font-family: 'Tajawal', sans-serif;">
                <div style="background: #ffffff; border-radius: 20px; padding: 35px 25px 25px; width: 90%; max-width: 520px; box-shadow: 0 20px 50px rgba(0,0,0,0.2); text-align: center; position: relative; border: 1px solid #e0e0e0; animation: popInUpdate 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;">
                    
                    <!-- لوجو كاندي كلاب بدل الصاروخ -->
                    <img src="favicon.png" alt="Candy Club Logo" style="width: 85px; height: 85px; border-radius: 50%; display: block; margin: -75px auto 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 5px solid white; background: white; object-fit: cover;">
                    
                    <h2 style="color: #1a237e; margin-top: 0; font-size: 1.6rem; font-weight: 900; margin-bottom: 8px;">
                        تحديث جديد وشامل
                    </h2>
                    
                    <p style="color: #666; font-size: 1rem; line-height: 1.5; margin-bottom: 25px; font-weight: 600;">
                        أهلاً بك في النسخة الأحدث والأذكى من نظام Candy Club
                    </p>
                    
                    <!-- كروت المميزات الأربعة -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; text-align: right; direction: rtl;">
                        
                        <!-- كارت 1 -->
                        <div style="background: #FFF0F5; border-radius: 12px; padding: 15px; border-right: 5px solid #E91E63; box-shadow: 0 2px 8px rgba(233, 30, 99, 0.05);">
                            <h4 style="margin: 0 0 8px 0; color: #E91E63; font-size: 1rem;"><i class="fa-solid fa-bolt" style="margin-left: 5px;"></i>أسرع بـ 8.5 مرات</h4>
                            <p style="margin: 0; font-size: 0.85rem; color: #555; line-height: 1.5;">أداء خيالي وسرعة استجابة فورية للعمليات</p>
                        </div>
                        
                        <!-- كارت 2 -->
                        <div style="background: #E8F5E9; border-radius: 12px; padding: 15px; border-right: 5px solid #4CAF50; box-shadow: 0 2px 8px rgba(76, 175, 80, 0.05);">
                            <h4 style="margin: 0 0 8px 0; color: #4CAF50; font-size: 1rem;"><i class="fa-solid fa-box-open" style="margin-left: 5px;"></i>ميزة النواقص</h4>
                            <p style="margin: 0; font-size: 0.85rem; color: #555; line-height: 1.5;">إضافة خانة جديدة لتسجيل ومتابعة النواقص</p>
                        </div>
                        
                        <!-- كارت 3 -->
                        <div style="background: #E3F2FD; border-radius: 12px; padding: 15px; border-right: 5px solid #2196F3; box-shadow: 0 2px 8px rgba(33, 150, 243, 0.05);">
                            <h4 style="margin: 0 0 8px 0; color: #1976D2; font-size: 1rem;"><i class="fa-solid fa-palette" style="margin-left: 5px;"></i>تحسينات الديزاين</h4>
                            <p style="margin: 0; font-size: 0.85rem; color: #555; line-height: 1.5;">واجهة أريح للعين وهوية بصرية ولوجو جديد</p>
                        </div>
                        
                        <!-- كارت 4 -->
                        <div style="background: #FFF8E1; border-radius: 12px; padding: 15px; border-right: 5px solid #FFC107; box-shadow: 0 2px 8px rgba(255, 193, 7, 0.05);">
                            <h4 style="margin: 0 0 8px 0; color: #F57F17; font-size: 1rem;"><i class="fa-solid fa-bug-slash" style="margin-left: 5px;"></i>حل الأخطاء</h4>
                            <p style="margin: 0; font-size: 0.85rem; color: #555; line-height: 1.5;">معالجة شاملة لكل المشاكل السابقة</p>
                        </div>

                    </div>
                    
                    <button id="close-update-btn" style="background: linear-gradient(135deg, #1a237e, #3949ab); color: white; border: none; padding: 14px 40px; font-size: 1.1rem; border-radius: 30px; font-weight: bold; cursor: pointer; transition: all 0.3s; box-shadow: 0 6px 20px rgba(26, 35, 126, 0.3); font-family: 'Tajawal', sans-serif;">
                        متابعة لصفحة العمل
                    </button>
                </div>
            </div>
            
            <style>
                @keyframes fadeInPopup { from { opacity: 0; } to { opacity: 1; } }
                @keyframes popInUpdate { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes fadeOutPopup { from { opacity: 1; } to { opacity: 0; } }
                #close-update-btn:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 10px 25px rgba(26, 35, 126, 0.4) !important; background: linear-gradient(135deg, #283593, #3f51b5); }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', popupHtml);
        
        document.getElementById('close-update-btn').addEventListener('click', () => {
            const popup = document.getElementById('candy-update-popup');
            popup.style.animation = 'fadeOutPopup 0.3s ease forwards';
            setTimeout(() => {
                popup.remove();
            }, 300);
        });
    };

    // نراقب ظهور التطبيق الرئيسي (app-header) للتأكد أن المستخدم قام بتسجيل الدخول
    const checkLoginInterval = setInterval(() => {
        const appHeader = document.querySelector('.app-header');
        if (appHeader && getComputedStyle(appHeader).display !== 'none') {
            clearInterval(checkLoginInterval);
            // إظهار النافذة بعد ثانية من الدخول لتكون تجربة مريحة
            setTimeout(showUpdatePopup, 1000); 
        }
    }, 1000);
});
