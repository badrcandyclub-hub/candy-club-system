// ملف إشعار التحديث الجديد - منفصل تماماً عن النظام
// اسم الملف: update_notice.js
// يمكنك مسح هذا الملف ومسح السطر الخاص به من index.html بعد أسبوع

document.addEventListener('DOMContentLoaded', () => {

    const showUpdatePopup = () => {
        if (document.getElementById('candy-update-popup')) return;
        
        const popupHtml = `
            <div id="candy-update-popup" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(10, 25, 47, 0.78); z-index: 999999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); animation: fadeInPopup 0.35s ease; font-family: 'Tajawal', sans-serif; box-sizing: border-box; padding: 12px;">
                <div class="candy-modal-box" style="background-color: #f0f9ff; background-image: radial-gradient(circle at 10% 20%, rgba(2, 136, 209, 0.12) 0%, transparent 45%), radial-gradient(circle at 90% 85%, rgba(0, 188, 212, 0.15) 0%, transparent 45%), linear-gradient(145deg, #e1f5fe 0%, #f0f9ff 50%, #e0f7fa 100%); border-radius: 20px; padding: 20px 14px 14px; width: 100%; max-width: 440px; box-shadow: 0 20px 50px rgba(2, 136, 209, 0.25); text-align: center; position: relative; border: 2px solid rgba(2, 136, 209, 0.28); animation: popInUpdate 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; box-sizing: border-box;">
                    
                    <!-- لمسات ديكورية هادئة -->
                    <div style="position: absolute; top: 10px; left: 14px; font-size: 1.1rem; opacity: 0.45; pointer-events: none; animation: floatSnow 4s ease-in-out infinite;">❄️</div>
                    <div style="position: absolute; top: 16px; right: 16px; font-size: 0.9rem; opacity: 0.4; pointer-events: none; animation: floatSnow 5s ease-in-out infinite 1s;">❄️</div>
                    <div style="position: absolute; bottom: 16px; left: 16px; font-size: 0.85rem; opacity: 0.35; pointer-events: none; animation: floatSnow 4.5s ease-in-out infinite 2s;">❄️</div>
                    <div style="position: absolute; bottom: 20px; right: 18px; font-size: 0.95rem; opacity: 0.4; pointer-events: none; animation: floatSnow 6s ease-in-out infinite 0.5s;">❄️</div>

                    <!-- لوجو كاندي كلاب بتنسيق مدمج -->
                    <img src="favicon.png" alt="Candy Club Logo" style="width: 62px; height: 62px; border-radius: 16px; display: block; margin: -46px auto 8px; box-shadow: 0 8px 20px rgba(2, 136, 209, 0.25); border: 3px solid #ffffff; background: #fff; object-fit: cover; position: relative; z-index: 2;">
                    
                    <!-- عنوان التحديث مع بادج V1.5 بلون كلوب الأزرق -->
                    <h2 style="color: #0f172a; margin: 0 0 4px 0; font-size: 1.25rem; font-weight: 900; animation: slideDownText 0.4s ease forwards; opacity: 0; animation-delay: 0.1s;">
                        تحديث كاندي كلوب <span style="color: #fff; background: linear-gradient(135deg, #0288D1, #00B0FF); padding: 2px 10px; border-radius: 12px; font-size: 1rem; vertical-align: middle; margin-right: 4px; box-shadow: 0 3px 10px rgba(2,136,209,0.35); font-family: monospace; font-weight: 800;">V1.5</span>
                    </h2>
                    
                    <p style="color: #475569; font-size: 0.8rem; line-height: 1.35; margin: 0 0 12px 0; font-weight: 600; animation: slideDownText 0.4s ease forwards; opacity: 0; animation-delay: 0.15s;">
                        أحدث ميزات وتطويرات Candy Club لتجربة بيع أسرع وأكثر استقراراً
                    </p>
                    
                    <!-- كروت المميزات الأربعة المدمجة للموبايل والشاشات -->
                    <div class="candy-cards-grid" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; text-align: right; direction: rtl; width: 100%; box-sizing: border-box;">
                        
                        <!-- كارت 1: النواقص (قريباً) -->
                        <div class="update-card" style="background: rgba(255, 255, 255, 0.88); backdrop-filter: blur(4px); border-radius: 10px; padding: 8px 9px; border-right: 3px solid #00B0FF; box-shadow: 0 2px 8px rgba(0, 176, 255, 0.1); animation-delay: 0.2s; box-sizing: border-box; min-width: 0; overflow: hidden;">
                            <h4 style="margin: 0 0 3px 0; color: #0288D1; font-size: 0.82rem; font-weight: 800; display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-boxes-stacked" style="font-size: 0.85rem; animation: dropInBox 3s ease-in-out infinite;"></i>النواقص (قريباً)</h4>
                            <p style="margin: 0; font-size: 0.71rem; color: #475569; line-height: 1.35; font-weight: 600;">نظام متطور لحصر وجرد النواقص الفعلية بالمحل بدقة وسرعة</p>
                        </div>
                        
                        <!-- كارت 2: وزنة الكاندي والميزان -->
                        <div class="update-card" style="background: rgba(255, 255, 255, 0.88); backdrop-filter: blur(4px); border-radius: 10px; padding: 8px 9px; border-right: 3px solid #00E676; box-shadow: 0 2px 8px rgba(0, 230, 118, 0.1); animation-delay: 0.25s; box-sizing: border-box; min-width: 0; overflow: hidden;">
                            <h4 style="margin: 0 0 3px 0; color: #00897B; font-size: 0.82rem; font-weight: 800; display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-scale-balanced" style="font-size: 0.85rem; animation: scaleRock 3s ease-in-out infinite;"></i>وزنة الكاندي الذكية</h4>
                            <p style="margin: 0; font-size: 0.71rem; color: #475569; line-height: 1.35; font-weight: 600;">قراءة استيكر الميزان وحساب السعر والوزن (600 ج/كجم) فوراً</p>
                        </div>

                        <!-- كارت 3: قسم الهدايا والبوكيهات -->
                        <div class="update-card" style="background: rgba(255, 255, 255, 0.88); backdrop-filter: blur(4px); border-radius: 10px; padding: 8px 9px; border-right: 3px solid #7C4DFF; box-shadow: 0 2px 8px rgba(124, 77, 255, 0.1); animation-delay: 0.3s; box-sizing: border-box; min-width: 0; overflow: hidden;">
                            <h4 style="margin: 0 0 3px 0; color: #5E35B1; font-size: 0.82rem; font-weight: 800; display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-gift" style="font-size: 0.85rem; animation: giftBounce 3s ease-in-out infinite;"></i>الهدايا والبوكيهات</h4>
                            <p style="margin: 0; font-size: 0.71rem; color: #475569; line-height: 1.35; font-weight: 600;">تجميع البوكيهات وطباعة الباركود وتحويلها لفواتير فورية</p>
                        </div>

                        <!-- كارت 4: حل واستقرار شامل -->
                        <div class="update-card" style="background: rgba(255, 255, 255, 0.88); backdrop-filter: blur(4px); border-radius: 10px; padding: 8px 9px; border-right: 3px solid #0288D1; box-shadow: 0 2px 8px rgba(2, 136, 209, 0.1); animation-delay: 0.35s; box-sizing: border-box; min-width: 0; overflow: hidden;">
                            <h4 style="margin: 0 0 3px 0; color: #0277BD; font-size: 0.82rem; font-weight: 800; display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-shield-halved" style="font-size: 0.85rem; animation: shieldPulse 3s ease-in-out infinite;"></i>حل واستقرار شامل</h4>
                            <p style="margin: 0; font-size: 0.71rem; color: #475569; line-height: 1.35; font-weight: 600;">معالجة تضارب الأسماء وضمان دقة الخصم والحسابات 100%</p>
                        </div>

                    </div>
                    
                    <!-- زر الدخول بلون كلوب الأزرق -->
                    <button id="close-update-btn" style="position: relative; overflow: hidden; background: linear-gradient(135deg, #0288D1, #00B0FF); color: white; border: none; padding: 9px 34px; font-size: 0.95rem; border-radius: 25px; font-weight: 800; cursor: pointer; transition: all 0.25s; box-shadow: 0 6px 18px rgba(2, 136, 209, 0.35); font-family: 'Tajawal', sans-serif; animation: slideUpFade 0.4s ease forwards; opacity: 0; animation-delay: 0.4s;">
                        <span style="position: relative; z-index: 2;"><i class="fa-solid fa-arrow-left" style="margin-left: 6px;"></i> ابدأ العمل الآن</span>
                        <div class="btn-shine"></div>
                    </button>
                </div>
            </div>
            
            <style>
                #candy-update-popup, #candy-update-popup * {
                    box-sizing: border-box !important;
                }
                
                @keyframes fadeInPopup { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(8px); } }
                @keyframes popInUpdate { 0% { transform: scale(0.92) translateY(15px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
                @keyframes fadeOutPopup { from { opacity: 1; } to { opacity: 0; } }
                
                @keyframes slideDownText { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUpFade { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                
                @keyframes dropInBox { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
                @keyframes scaleRock { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(8deg); } 75% { transform: rotate(-8deg); } }
                @keyframes giftBounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
                @keyframes shieldPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
                @keyframes floatSnow { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-6px) rotate(15deg); } }
                
                .update-card {
                    opacity: 0;
                    animation: slideUpFade 0.4s ease forwards;
                    transition: transform 0.25s ease, box-shadow 0.25s ease;
                }
                .update-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(2, 136, 209, 0.15) !important;
                }
                
                #close-update-btn:hover { 
                    transform: translateY(-2px) scale(1.02); 
                    box-shadow: 0 10px 25px rgba(0, 176, 255, 0.5) !important; 
                    background: linear-gradient(135deg, #0277BD, #0091EA) !important; 
                }
                
                .btn-shine {
                    position: absolute;
                    top: 0; left: -100%;
                    width: 50%; height: 100%;
                    background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 100%);
                    transform: skewX(-25deg);
                    animation: shineEffect 3s infinite;
                    z-index: 1;
                }
                @keyframes shineEffect { 0% { left: -100%; } 20%, 100% { left: 200%; } }

                @media (max-width: 480px) {
                    .candy-modal-box {
                        padding: 18px 10px 12px !important;
                        width: 96% !important;
                        border-radius: 16px !important;
                    }
                    .candy-modal-box img {
                        width: 56px !important;
                        height: 56px !important;
                        margin: -42px auto 6px !important;
                    }
                    .candy-modal-box h2 {
                        font-size: 1.15rem !important;
                    }
                    .candy-cards-grid {
                        gap: 6px !important;
                    }
                    .update-card {
                        padding: 7px 7px !important;
                    }
                    .update-card h4 {
                        font-size: 0.77rem !important;
                    }
                    .update-card p {
                        font-size: 0.68rem !important;
                        line-height: 1.3 !important;
                    }
                    #close-update-btn {
                        padding: 8px 28px !important;
                        font-size: 0.88rem !important;
                    }
                }
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
