// Candy Club WhatsApp Bot Client Integration
const BOT_URL = 'http://localhost:3001';
let isBotConnected = false;
let botStatusInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    const checkBotBtn = document.getElementById('waCheckBotBtn');
    const statusText = document.getElementById('waBotStatusText');
    const statusPanel = document.getElementById('waBotStatusPanel');
    const startCampaignBtn = document.getElementById('waStartCampaignBtn');
    
    const progressContainer = document.getElementById('waBotProgress');
    const progressText = document.getElementById('waBotProgressText');
    const progressBar = document.getElementById('waBotProgressBar');
    const waitText = document.getElementById('waBotWaitText');
    const failedText = document.getElementById('waBotFailedText');
    
    async function checkBotStatus() {
        if(!checkBotBtn) return;
        try {
            checkBotBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري...';
            const res = await fetch(`${BOT_URL}/status`);
            const data = await res.json();
            
            isBotConnected = true;
            statusPanel.style.background = '#e8f5e9';
            statusPanel.style.borderColor = '#c8e6c9';
            
            if (data.status === 'READY') {
                statusText.innerHTML = 'متصل وجاهز للإرسال ✅';
                statusText.style.color = '#2e7d32';
                
                // Stop progress if it was running
                if(data.campaign && data.campaign.total > 0 && data.campaign.sent === data.campaign.total) {
                    progressText.innerText = `اكتمل الإرسال! (${data.campaign.sent} / ${data.campaign.total})`;
                    waitText.innerText = '';
                }
            } else if (data.status === 'SENDING') {
                statusText.innerHTML = 'جاري إرسال حملة حالياً 🚀';
                statusText.style.color = '#f39c12';
                updateProgressUI(data.campaign);
            } else if (data.status === 'QR_READY') {
                statusText.innerHTML = 'بانتظار مسح كود الـ QR من شاشة الأوامر 📱';
                statusText.style.color = '#e67e22';
            } else {
                statusText.innerHTML = `حالة الروبوت: ${data.status} ⏳`;
                statusText.style.color = '#e67e22';
            }
            
            checkBotBtn.innerHTML = 'تحديث الحالة <i class="fa-solid fa-rotate-right"></i>';
            
            // Auto check every 3 seconds if connected
            if(!botStatusInterval) {
                botStatusInterval = setInterval(checkBotStatus, 3000);
            }
            
        } catch (err) {
            isBotConnected = false;
            statusPanel.style.background = '#fce4e4';
            statusPanel.style.borderColor = '#f5c6c6';
            statusText.innerHTML = 'غير متصل (الرجاء تشغيل server.js) ❌';
            statusText.style.color = '#c0392b';
            checkBotBtn.innerHTML = 'تحديث الحالة <i class="fa-solid fa-rotate-right"></i>';
            
            if(botStatusInterval) {
                clearInterval(botStatusInterval);
                botStatusInterval = null;
            }
        }
    }

    function updateProgressUI(campaign) {
        if(!campaign || campaign.total === 0) return;
        
        progressContainer.style.display = 'block';
        const percent = Math.round((campaign.sent / campaign.total) * 100);
        
        progressText.innerText = `التقدم: ${campaign.sent} / ${campaign.total} رسالة`;
        progressBar.style.width = `${percent}%`;
        progressBar.innerText = `${percent}%`;
        
        if (campaign.failed > 0) {
            failedText.style.display = 'block';
            failedText.innerText = `فشل: ${campaign.failed}`;
        }
        
        if (campaign.isPaused) {
            const m = Math.floor(campaign.pauseTimeLeft / 60);
            const s = campaign.pauseTimeLeft % 60;
            waitText.innerText = `استراحة لمنع الحظر. يُستأنف بعد: ${m}د و ${s}ث`;
            waitText.style.color = '#c0392b';
        } else if (campaign.nextMessageIn > 0 && campaign.sent < campaign.total) {
            waitText.innerText = `الرسالة القادمة بعد: ${campaign.nextMessageIn} ثانية`;
            waitText.style.color = '#e67e22';
        } else if (campaign.sent === campaign.total) {
            waitText.innerText = 'تم الانتهاء بنجاح! 🎉';
            waitText.style.color = '#27ae60';
        } else {
            waitText.innerText = 'جاري المعالجة...';
            waitText.style.color = '#2980b9';
        }
    }

    if(checkBotBtn) {
        checkBotBtn.addEventListener('click', checkBotStatus);
        // Initial check
        setTimeout(checkBotStatus, 1000);
    }
    
    // Intercept the Start Campaign button
    if(startCampaignBtn) {
        // Clone and replace to strip existing app.js listener
        const newBtn = startCampaignBtn.cloneNode(true);
        startCampaignBtn.parentNode.replaceChild(newBtn, startCampaignBtn);
        
        newBtn.addEventListener("click", async () => {
            if(!isBotConnected) {
                alert('الروبوت الآلي غير متصل! يرجى تشغيل الخادم المحلي (server.js) أولاً لتتمكن من الإرسال.');
                return;
            }
            
            const targetGroup = document.getElementById("waTargetGroup");
            const targetType = targetGroup ? targetGroup.value : "all";
            let validCustomers = [];
            
            if (targetType === "custom") {
                const text = document.getElementById("waCustomNumbers").value;
                const numbers = text.split(/[\n,]+/).map(n => n.trim()).filter(n => n);
                validCustomers = numbers.map(n => ({ name: "عميل", phone: n }));
            } else {
                if(!window.customersData || window.customersData.length === 0) {
                    alert("لا يوجد عملاء مسجلين حالياً (البيانات لم تحمل بعد).");
                    return;
                }
                let baseCustomers = window.customersData.filter(c => c.phone && c.phone.length >= 10);
                
                if (targetType === "vip") {
                    validCustomers = baseCustomers.filter(c => (parseInt(c.visits) || 0) >= 3);
                } else if (targetType === "inactive") {
                    validCustomers = baseCustomers.filter(c => (parseInt(c.visits) || 0) <= 1);
                } else {
                    validCustomers = baseCustomers;
                }
            }
            
            if(validCustomers.length === 0) {
                alert("لا يوجد عملاء في هذه الفئة المستهدفة.");
                return;
            }
            
            const textElem = document.getElementById("waCampaignText");
            const messageText = textElem ? textElem.value : "";
            
            if(!messageText.trim()) {
                alert("برجاء كتابة نص رسالة العرض أولاً.");
                textElem.focus();
                return;
            }
            
            if(!confirm(`سيتم إرسال الرسالة إلى ${validCustomers.length} عميل بشكل آلي عبر الروبوت. هل أنت متأكد؟`)) {
                return;
            }
            
            // Hide old list container
            document.getElementById("waCustomerList").innerHTML = "";
            document.getElementById("waQueueContainer").style.display = "block";
            progressContainer.style.display = "block";
            progressText.innerText = "جاري تحضير الإرسال للروبوت...";
            
            try {
                const response = await fetch(`${BOT_URL}/start-campaign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customers: validCustomers,
                        messageTemplate: messageText
                    })
                });
                
                const data = await response.json();
                if(response.ok) {
                    checkBotStatus(); // This will trigger the progress UI update
                } else {
                    alert('خطأ من الروبوت: ' + data.error);
                }
            } catch (err) {
                alert('فشل الاتصال بالروبوت. تأكد أنه يعمل.');
            }
        });
    }
});
