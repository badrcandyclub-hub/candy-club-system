// ملف إشعار التحديث الجديد - منفصل تماماً عن النظام
// اسم الملف: update_notice.js
// يمكنك مسح هذا الملف ومسح السطر الخاص به من index.html بعد أسبوع

document.addEventListener('DOMContentLoaded', () => {

    const showUpdatePopup = () => {
        if (document.getElementById('candy-update-popup')) return;
        
        const popupHtml = `
            <div id="candy-update-popup" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.75); z-index: 999999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); animation: fadeInPopup 0.4s ease; font-family: 'Tajawal', sans-serif;">
                <div style="background: #ffffff; border-radius: 20px; padding: 20px 15px 15px; width: 92%; max-width: 500px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); text-align: center; position: relative; border: 1px solid rgba(255,255,255,0.5); animation: popInUpdate 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;">
                    
                    <!-- لوجو كاندي كلاب بدل الصاروخ -->
                    <img src="favicon.png" alt="Candy Club Logo" style="width: 80px; height: 80px; border-radius: 18px; display: block; margin: -55px auto 10px; box-shadow: 0 8px 20px rgba(0,0,0,0.15); border: 4px solid white; background: white; object-fit: cover;">
                    
                    <h2 style="color: #1a237e; margin-top: 0; font-size: 1.4rem; font-weight: 900; margin-bottom: 5px; animation: slideDownText 0.5s ease forwards; opacity: 0; animation-delay: 0.1s;">
                        تحديث جديد وشامل
                    </h2>
                    
                    <p style="color: #666; font-size: 0.9rem; line-height: 1.4; margin-bottom: 15px; font-weight: 600; animation: slideDownText 0.5s ease forwards; opacity: 0; animation-delay: 0.2s;">
                        أهلاً بك في النسخة الأحدث والأذكى من نظام Candy Club
                    </p>
                    
                    <!-- كروت المميزات الأربعة -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; text-align: right; direction: rtl;">
                        
                        <!-- كارت 1 -->
                        <div class="update-card" style="background: linear-gradient(145deg, #FFF0F5, #ffffff); border-radius: 10px; padding: 12px; border-right: 5px solid #E91E63; box-shadow: 0 3px 10px rgba(233, 30, 99, 0.08); animation-delay: 0.3s;">
                            <h4 style="margin: 0 0 6px 0; color: #E91E63; font-size: 0.95rem;"><i class="fa-solid fa-bolt" style="margin-left: 5px; animation: wiggle 2s infinite;"></i>أسرع بـ 8.5 مرات</h4>
                            <p style="margin: 0; font-size: 0.8rem; color: #555; line-height: 1.4;">أداء خيالي وسرعة استجابة فورية للعمليات</p>
                        </div>
                        
                        <!-- كارت 2 -->
                        <div class="update-card" style="background: linear-gradient(145deg, #E8F5E9, #ffffff); border-radius: 10px; padding: 12px; border-right: 5px solid #4CAF50; box-shadow: 0 3px 10px rgba(76, 175, 80, 0.08); animation-delay: 0.4s;">
                            <h4 style="margin: 0 0 6px 0; color: #4CAF50; font-size: 0.95rem;"><i class="fa-solid fa-box-open" style="margin-left: 5px; animation: bounceIcon 2s infinite;"></i>ميزة النواقص</h4>
                            <p style="margin: 0; font-size: 0.8rem; color: #555; line-height: 1.4;">إضافة خانة جديدة لتسجيل ومتابعة النواقص</p>
                        </div>
                        
                        <!-- كارت 3 -->
                        <div class="update-card" style="background: linear-gradient(145deg, #E3F2FD, #ffffff); border-radius: 10px; padding: 12px; border-right: 5px solid #2196F3; box-shadow: 0 3px 10px rgba(33, 150, 243, 0.08); animation-delay: 0.5s;">
                            <h4 style="margin: 0 0 6px 0; color: #1976D2; font-size: 0.95rem;"><i class="fa-solid fa-palette" style="margin-left: 5px; animation: spinPulse 3s infinite;"></i>تحسينات الديزاين</h4>
                            <p style="margin: 0; font-size: 0.8rem; color: #555; line-height: 1.4;">واجهة أريح للعين وهوية بصرية ولوجو جديد</p>
                        </div>
                        
                        <!-- كارت 4 -->
                        <div class="update-card" style="background: linear-gradient(145deg, #FFF8E1, #ffffff); border-radius: 10px; padding: 12px; border-right: 5px solid #FFC107; box-shadow: 0 3px 10px rgba(255, 193, 7, 0.08); animation-delay: 0.6s;">
                            <h4 style="margin: 0 0 6px 0; color: #F57F17; font-size: 0.95rem;"><i class="fa-solid fa-bug-slash" style="margin-left: 5px; animation: shakeIcon 2.5s infinite;"></i>حل الأخطاء</h4>
                            <p style="margin: 0; font-size: 0.8rem; color: #555; line-height: 1.4;">معالجة شاملة لكل المشاكل السابقة</p>
                        </div>

                    </div>
                    
                    <button id="close-update-btn" style="position: relative; overflow: hidden; background: linear-gradient(135deg, #1a237e, #3949ab); color: white; border: none; padding: 12px 35px; font-size: 1.05rem; border-radius: 30px; font-weight: bold; cursor: pointer; transition: all 0.3s; box-shadow: 0 8px 25px rgba(26, 35, 126, 0.4); font-family: 'Tajawal', sans-serif; animation: slideUpFade 0.5s ease forwards; opacity: 0; animation-delay: 0.7s;">
                        <span style="position: relative; z-index: 2;">متابعة لصفحة العمل</span>
                        <div class="btn-shine"></div>
                    </button>
                </div>
            </div>
            
            <style>
                @keyframes fadeInPopup { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(8px); } }
                @keyframes popInUpdate { 0% { transform: scale(0.8) translateY(20px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
                @keyframes fadeOutPopup { from { opacity: 1; } to { opacity: 0; } }
                
                @keyframes slideDownText { from { opacity: 0; transform: translateY(-15px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUpFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                
                @keyframes floatLogo { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                @keyframes spinGradient { 100% { transform: rotate(360deg); } }
                
                @keyframes wiggle { 0%, 10%, 100% { transform: rotate(0deg); } 2.5% { transform: rotate(-15deg); } 7.5% { transform: rotate(15deg); } }
                @keyframes bounceIcon { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-5px); } 60% { transform: translateY(-3px); } }
                @keyframes spinPulse { 0% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.1) rotate(180deg); } 100% { transform: scale(1) rotate(360deg); } }
                @keyframes shakeIcon { 0%, 100% { transform: translateX(0); } 5%, 15%, 25% { transform: translateX(-2px); } 10%, 20% { transform: translateX(2px); } }
                
                .update-card {
                    opacity: 0;
                    animation: slideUpFade 0.5s ease forwards;
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
                }
                .update-card:hover {
                    transform: translateY(-8px) scale(1.02);
                    box-shadow: 0 12px 20px rgba(0,0,0,0.08) !important;
                }
                
                #close-update-btn:hover { 
                    transform: translateY(-3px) scale(1.03); 
                    box-shadow: 0 12px 30px rgba(26, 35, 126, 0.5) !important; 
                    background: linear-gradient(135deg, #283593, #3f51b5); 
                }
                
                .btn-shine {
                    position: absolute;
                    top: 0; left: -100%;
                    width: 50%; height: 100%;
                    background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
                    transform: skewX(-25deg);
                    animation: shineEffect 3s infinite;
                    z-index: 1;
                }
                @keyframes shineEffect { 0% { left: -100%; } 20%, 100% { left: 200%; } }
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
