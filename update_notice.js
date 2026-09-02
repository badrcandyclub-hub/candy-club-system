// ملف إشعار التحديث الجديد - منفصل تماماً عن النظام
// اسم الملف: update_notice.js
// يمكنك مسح هذا الملف ومسح السطر الخاص به من index.html بعد أسبوع

document.addEventListener('DOMContentLoaded', () => {

    const showUpdatePopup = () => {
        if (document.getElementById('candy-update-popup')) return;
        
        const popupHtml = `
            <div id="candy-update-popup" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 999999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); animation: fadeInPopup 0.4s ease; font-family: 'Tajawal', sans-serif;">
                <div style="background: linear-gradient(145deg, #1e1e2f, #2a2a40); border-radius: 24px; padding: 25px 20px 20px; width: 92%; max-width: 520px; box-shadow: 0 30px 60px rgba(0,0,0,0.6); text-align: center; position: relative; border: 1px solid rgba(255,255,255,0.1); animation: popInUpdate 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;">
                    
                    <!-- لوجو كاندي كلاب -->
                    <img src="favicon.png" alt="Candy Club Logo" style="width: 85px; height: 85px; border-radius: 20px; display: block; margin: -65px auto 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); border: 3px solid #2a2a40; background: #fff; object-fit: cover;">
                    
                    <h2 style="color: #ffffff; margin-top: 0; font-size: 1.5rem; font-weight: 900; margin-bottom: 8px; animation: slideDownText 0.5s ease forwards; opacity: 0; animation-delay: 0.1s;">
                        تحديث جديد وشامل <span style="color: #FFD700; background: rgba(255, 215, 0, 0.15); padding: 2px 10px; border-radius: 12px; font-size: 1.2rem; vertical-align: middle; margin-right: 5px; box-shadow: 0 0 10px rgba(255,215,0,0.2);">V1.1</span>
                    </h2>
                    
                    <p style="color: #b0bec5; font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px; font-weight: 600; animation: slideDownText 0.5s ease forwards; opacity: 0; animation-delay: 0.2s;">
                        اكتشف الإضافات الجديدة التي صممناها لتسريع وتسهيل عملك
                    </p>
                    
                    <!-- كروت المميزات الأربعة -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 25px; text-align: right; direction: rtl;">
                        
                        <!-- كارت 1: النواقص -->
                        <div class="update-card" style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 15px; border-right: 4px solid #FF5252; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05); animation-delay: 0.3s;">
                            <h4 style="margin: 0 0 8px 0; color: #FF5252; font-size: 1rem; font-weight: 800;"><i class="fa-solid fa-box-open" style="margin-left: 6px; animation: floatLogo 3s ease-in-out infinite;"></i>النواقص (جربها الآن)</h4>
                            <p style="margin: 0; font-size: 0.85rem; color: #cfd8dc; line-height: 1.5; font-weight: 600;">إضافة خانة جديدة مخصصة لتسجيل ومتابعة النواقص بكل سهولة ومرونة</p>
                        </div>
                        
                        <!-- كارت 2: المزامنة الذكية -->
                        <div class="update-card" style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 15px; border-right: 4px solid #00E676; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05); animation-delay: 0.4s;">
                            <h4 style="margin: 0 0 8px 0; color: #00E676; font-size: 1rem; font-weight: 800;"><i class="fa-solid fa-rotate" style="margin-left: 6px; animation: floatLogo 3s ease-in-out infinite; animation-delay: 0.5s;"></i>المزامنة الذكية</h4>
                            <p style="margin: 0; font-size: 0.85rem; color: #cfd8dc; line-height: 1.5; font-weight: 600;">نظام جديد يضبط أرصدتك بأثر رجعي ويصحح الأسماء المجهولة تلقائياً</p>
                        </div>

                        <!-- كارت 3: حل جذري للأخطاء -->
                        <div class="update-card" style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 15px; border-right: 4px solid #FFD740; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05); animation-delay: 0.5s;">
                            <h4 style="margin: 0 0 8px 0; color: #FFD740; font-size: 1rem; font-weight: 800;"><i class="fa-solid fa-shield-halved" style="margin-left: 6px; animation: floatLogo 3s ease-in-out infinite; animation-delay: 1s;"></i>حل جذري للأخطاء</h4>
                            <p style="margin: 0; font-size: 0.85rem; color: #cfd8dc; line-height: 1.5; font-weight: 600;">معالجة تامة لمشكلة تضارب الأسماء وعدم خصم المبيعات بشكل صحيح</p>
                        </div>
                        
                        <!-- كارت 4: تحسينات في الشكل -->
                        <div class="update-card" style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 15px; border-right: 4px solid #40C4FF; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05); animation-delay: 0.6s;">
                            <h4 style="margin: 0 0 8px 0; color: #40C4FF; font-size: 1rem; font-weight: 800;"><i class="fa-solid fa-palette" style="margin-left: 6px; animation: floatLogo 3s ease-in-out infinite; animation-delay: 1.5s;"></i>تحسينات في الشكل</h4>
                            <p style="margin: 0; font-size: 0.85rem; color: #cfd8dc; line-height: 1.5; font-weight: 600;">واجهة مريحة للعين وتجربة استخدام أسرع وأكثر استقراراً من قبل</p>
                        </div>

                    </div>
                    
                    <button id="close-update-btn" style="position: relative; overflow: hidden; background: linear-gradient(135deg, #00b09b, #96c93d); color: white; border: none; padding: 14px 40px; font-size: 1.1rem; border-radius: 30px; font-weight: bold; cursor: pointer; transition: all 0.3s; box-shadow: 0 8px 25px rgba(0, 176, 155, 0.4); font-family: 'Tajawal', sans-serif; animation: slideUpFade 0.5s ease forwards; opacity: 0; animation-delay: 0.7s;">
                        <span style="position: relative; z-index: 2;">ابدأ العمل الآن</span>
                        <div class="btn-shine"></div>
                    </button>
                </div>
            </div>
            
            <style>
                @keyframes fadeInPopup { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(10px); } }
                @keyframes popInUpdate { 0% { transform: scale(0.9) translateY(20px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
                @keyframes fadeOutPopup { from { opacity: 1; } to { opacity: 0; } }
                
                @keyframes slideDownText { from { opacity: 0; transform: translateY(-15px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUpFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                
                @keyframes floatLogo { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
                
                .update-card {
                    opacity: 0;
                    animation: slideUpFade 0.5s ease forwards;
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease, background 0.3s ease;
                }
                .update-card:hover {
                    transform: translateY(-5px);
                    background: rgba(255, 255, 255, 0.08) !important;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.2) !important;
                }
                
                #close-update-btn:hover { 
                    transform: translateY(-3px) scale(1.02); 
                    box-shadow: 0 12px 30px rgba(0, 176, 155, 0.6) !important; 
                    background: linear-gradient(135deg, #009688, #7cb342) !important; 
                }
                
                .btn-shine {
                    position: absolute;
                    top: 0; left: -100%;
                    width: 50%; height: 100%;
                    background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
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
