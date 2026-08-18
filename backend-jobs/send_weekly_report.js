const https = require('https');

// --- Supabase Config ---
const supabaseUrl = 'thqccqwdwwxitvztmigt.supabase.co';
const supabaseKey = 'sb_publishable_BtFyuDBE_0PcF1z8JNskuA_-04mjcpc';

// --- EmailJS Config ---
const EMAILJS_PUBLIC_KEY = 'F0ac0mnX_vGMKUaQX';
const EMAILJS_SERVICE_ID = 'service_ntb2n7n';
const EMAILJS_TEMPLATE_ID = 'template_8ph9b99';

// Helpers
const fetchAllFromSupabase = async (path) => {
    let allData = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
        const sep = path.includes('?') ? '&' : '?';
        const currentPath = `${path}${sep}limit=${limit}&offset=${offset}`;
        
        const data = await new Promise((resolve, reject) => {
            const options = {
                hostname: supabaseUrl,
                port: 443,
                path: currentPath,
                method: 'GET',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            };
            const req = https.request(options, res => {
                let chunks = '';
                res.on('data', chunk => chunks += chunk);
                res.on('end', () => resolve(JSON.parse(chunks)));
            });
            req.on('error', error => reject(error));
            req.end();
        });

        if (Array.isArray(data) && data.length > 0) {
            allData = allData.concat(data);
            if (data.length < limit) hasMore = false;
            else offset += limit;
        } else {
            hasMore = false;
        }
    }
    return allData;
};

const sendEmailJS = (toEmail, toName, subject, htmlMessage) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: {
                to_email: toEmail,
                name: toName,
                subject: subject,
                message: htmlMessage
            }
        });

        const options = {
            hostname: 'api.emailjs.com',
            port: 443,
            path: '/api/v1.0/email/send',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'Origin': 'https://candy-club.vercel.app',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        };

        const req = https.request(options, res => {
            let resData = '';
            res.on('data', chunk => resData += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: resData }));
        });

        req.on('error', error => reject(error));
        req.write(data);
        req.end();
    });
};

function parseCustomDate(dateStr) {
    if (!dateStr) return new Date(9999, 11, 31);
    let parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parts[0], parseInt(parts[1])-1, parts[2]);
    }
    return new Date(dateStr);
}

async function runWeeklyReport() {
    try {
        console.log("Starting weekly report generation...");

        // 1. Fetch HR-Admins
        console.log("Fetching hr-admin users...");
        const users = await fetchAllFromSupabase('/rest/v1/users?select=username,display_name,permissions');
        const hrAdmins = users.filter(u => 
            u.permissions && 
            (u.permissions.includes('hr-admin') || u.permissions.includes('ALL')) &&
            u.username && u.username.includes('@')
        );
        
        if (hrAdmins.length === 0) {
            console.log("No HR-Admin emails found. Exiting.");
            return;
        }

        console.log(`Found ${hrAdmins.length} HR-Admins. Recipients: ${hrAdmins.map(u => u.username).join(', ')}`);

        // 2. Fetch last 7 days orders
        let endD = new Date();
        let startD = new Date();
        startD.setDate(startD.getDate() - 7);
        
        let startDateStr = startD.toISOString().split('T')[0];
        console.log(`Fetching orders since ${startDateStr}...`);
        const orders = await fetchAllFromSupabase(`/rest/v1/orders?order_date=gte.${startDateStr}&select=final_total,status,payment_method,order_date`);
        
        // 3. Fetch all expiries
        console.log("Fetching expiries...");
        const expiries = await fetchAllFromSupabase('/rest/v1/expiries?select=product_name,expiry_date,qty');

        // --- Calculate Stats ---
        let totalOrders = (orders || []).length;
        let totalSales = 0;
        let cashSales = 0;
        let instapaySales = 0;
        let totalReturns = 0;
        let returnedCount = 0;
        let successfulOrders = 0;
        let pendingOrders = 0;

        (orders || []).forEach(o => {
            let t = parseFloat(o.final_total) || 0;
            if (o.status === "مرتجع") {
                totalReturns += t;
                returnedCount++;
            } else {
                totalSales += t;
                if (o.payment_method && o.payment_method.includes('كاش')) {
                    cashSales += t;
                } else if (o.payment_method && (o.payment_method.includes('إنستا') || o.payment_method.includes('انستا'))) {
                    instapaySales += t;
                }
                
                if (o.status === "تم التوصيل ومُحاسب" || o.status === "تم التسليم ومُحاسب" || o.status === "تم التوصيل") {
                    successfulOrders++;
                } else if (o.status === "قيد التجهيز" || o.status === "في الشحن" || o.status === "تم الشحن") {
                    pendingOrders++;
                }
            }
        });

        // --- Filter Expiries (< 30 days) ---
        const now = new Date();
        now.setHours(0,0,0,0);
        const nextMonth = new Date(now);
        nextMonth.setDate(now.getDate() + 30);

        let urgentExpiries = (expiries || []).filter(e => {
            if (!e.expiry_date) return false;
            let expDate = parseCustomDate(e.expiry_date);
            return expDate <= nextMonth;
        });
        
        urgentExpiries.sort((a, b) => {
            return parseCustomDate(a.expiry_date) - parseCustomDate(b.expiry_date);
        });

        let expiriesHtml = urgentExpiries.map((e, index) => 
            "<tr><td style='padding:10px; border-bottom:1px solid #eee;'><strong>" + (index + 1) + "- " + e.product_name + "</strong></td>" +
            "<td style='padding:10px; border-bottom:1px solid #eee; color: #d32f2f; font-weight: bold; text-align:center;'>" + e.expiry_date + "</td>" +
            "<td style='padding:10px; border-bottom:1px solid #eee; text-align:center;'>" + e.qty + "</td></tr>"
        ).join('');

        if (urgentExpiries.length === 0) {
            expiriesHtml = "<tr><td colspan='3' style='text-align:center; color:#4caf50; padding: 20px;'>جميع المنتجات في فترة الصلاحية الآمنة</td></tr>";
        }
        
        let arStart = startD.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        let arEnd = endD.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // --- HTML EMAIL TEMPLATE ---
        // Email clients have restricted CSS support, so inline styles and table-based layouts are highly recommended.
        const htmlContent = `
        <div dir="rtl" style="font-family: Arial, Tahoma, sans-serif; background-color: #f4f6f9; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <!-- Header -->
                <div style="background: linear-gradient(90deg, #8e24aa, #ff4081); padding: 30px 20px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 28px;">Candy Club</h1>
                    <p style="margin: 5px 0 0; opacity: 0.9;">تقرير الأداء الأسبوعي للإدارة العليا</p>
                </div>

                <!-- Meta -->
                <div style="padding: 20px; background-color: #fafafa; border-bottom: 1px solid #eee; text-align: right;">
                    <p style="margin: 0; color: #555;"><strong>الفترة:</strong> من ${arStart} إلى ${arEnd}</p>
                </div>

                <div style="padding: 20px; text-align: right;">
                    <!-- Financial Summary -->
                    <h2 style="color: #8e24aa; border-bottom: 2px solid #8e24aa; display: inline-block; padding-bottom: 5px; margin-top: 0;">الملخص المالي</h2>
                    
                    <table style="width: 100%; margin-bottom: 20px; border-spacing: 10px;">
                        <tr>
                            <td style="background-color: #f3e5f5; padding: 15px; border-radius: 8px; text-align: center; width: 50%;">
                                <div style="color: #666; font-size: 13px;">المبيعات الصافية</div>
                                <div style="color: #8e24aa; font-size: 22px; font-weight: bold;">${totalSales.toLocaleString('ar-EG')} ج.م</div>
                            </td>
                            <td style="background-color: #fce4ec; padding: 15px; border-radius: 8px; text-align: center; width: 50%;">
                                <div style="color: #666; font-size: 13px;">إجمالي الأوردرات</div>
                                <div style="color: #c2185b; font-size: 22px; font-weight: bold;">${totalOrders}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; text-align: center; border-right: 3px solid #4caf50;">
                                <div style="color: #666; font-size: 13px;">نجاح التسليم</div>
                                <div style="color: #388e3c; font-size: 22px; font-weight: bold;">${totalOrders ? Math.round((successfulOrders / totalOrders) * 100) : 0}%</div>
                            </td>
                            <td style="background-color: #ffebee; padding: 15px; border-radius: 8px; text-align: center; border-right: 3px solid #f44336;">
                                <div style="color: #666; font-size: 13px;">خسائر المرتجعات</div>
                                <div style="color: #d32f2f; font-size: 22px; font-weight: bold;">${totalReturns.toLocaleString('ar-EG')} ج.م</div>
                            </td>
                        </tr>
                    </table>

                    <!-- Payment Methods -->
                    <h2 style="color: #8e24aa; border-bottom: 2px solid #8e24aa; display: inline-block; padding-bottom: 5px;">طرق الدفع (الصافي)</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #fff; border: 1px solid #eee;">
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #eee;">كاش (نقدي)</td>
                            <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #4caf50;" dir="rtl">${cashSales.toLocaleString('ar-EG')} ج.م</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px;">إنستا باي / إلكتروني</td>
                            <td style="padding: 12px; font-weight: bold; color: #2196f3;" dir="rtl">${instapaySales.toLocaleString('ar-EG')} ج.م</td>
                        </tr>
                    </table>

                    <!-- Order Movement -->
                    <h2 style="color: #8e24aa; border-bottom: 2px solid #8e24aa; display: inline-block; padding-bottom: 5px;">حركة الأوردرات</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; background-color: #fff; border: 1px solid #eee;">
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #eee;">أوردرات متوصلة</td>
                            <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #4caf50;">${successfulOrders}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #eee;">قيد التجهيز / شحن</td>
                            <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #ff9800;">${pendingOrders}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px;">مرفوض / مرتجع</td>
                            <td style="padding: 12px; font-weight: bold; color: #f44336;">${returnedCount}</td>
                        </tr>
                    </table>

                    <!-- Expiries Alert -->
                    <h2 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; display: inline-block; padding-bottom: 5px; margin-top: 10px;">تقرير الصلاحية (أقل من 30 يوم)</h2>
                    <p style="color: #d32f2f; font-weight: bold; margin-bottom: 15px;">يوجد ${urgentExpiries.length} منتج يقترب من الانتهاء:</p>
                    <table style="width: 100%; border-collapse: collapse; background-color: #fff; border: 1px solid #ffcdd2;">
                        <tr style="background-color: #ffebee; color: #d32f2f;">
                            <th style="padding: 10px; text-align: right;">المنتج</th>
                            <th style="padding: 10px; text-align: center;">التاريخ</th>
                            <th style="padding: 10px; text-align: center;">الكمية</th>
                        </tr>
                        ${expiriesHtml}
                    </table>
                </div>

                <!-- Footer -->
                <div style="background-color: #333; color: #aaa; text-align: center; padding: 15px; font-size: 12px;">
                    تم إنشاء هذا التقرير آلياً بواسطة نظام Candy Club.<br>
                    خاص فقط بالإدارة العليا.
                </div>
            </div>
        </div>`;

        // 4. Send Email to each HR Admin
        for (const admin of hrAdmins) {
            console.log(`Sending email to ${admin.display_name} (${admin.username})...`);
            const subject = `التقرير الأسبوعي: ${arStart} إلى ${arEnd}`;
            try {
                const response = await sendEmailJS(admin.username, admin.display_name, subject, htmlContent);
                console.log(`EmailJS Response Status: ${response.status}`);
                console.log(`EmailJS Response Body: ${response.data}`);
            } catch (emailErr) {
                console.error(`Failed to send to ${admin.username}:`, emailErr.message || emailErr);
            }
        }
        
        console.log("Weekly report job completed successfully.");

    } catch(err) {
        console.error("Critical Error generating report:", err);
        process.exit(1);
    }
}

runWeeklyReport();
