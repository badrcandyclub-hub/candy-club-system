/**
 * Candy Club - Automated Story Publisher Backend Job
 * يعمل على GitHub Actions كل 15 دقيقة على مدار 24 ساعة بدون توقف
 * ينشر عروض المتجر تلقائياً كـ Story فقط على إنستجرام وفيسبوك كاندي كلوب
 */

const https = require('https');

// --- إعدادات Supabase ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'thqccqwdwwxitvztmigt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_BtFyuDBE_0PcF1z8JNskuA_-04mjcpc';

// --- إعدادات Meta الرسمية (Instagram & Facebook Stories) ---
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID || '28655621330773088';
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || 'IGAAhSm9eJFMFBZAGE0MUM0TFVBa05vYmVGLXkwNWpCcXVSRTVvbE9XeG1ra2NPcDU5Vmh2TW5Rek51Ti1Cci0wWEp5YnBEcFg3RGI1a2lvZA2VqSG5mbHlDQ3FpVFNvQ2EydFJaUTg0TmxQc0ptdlIxMENB';

const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID || '356148687583666';
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || 'EAAQXelKvXdEBSzmSpCpO2ggnyQZCS17F8XdcCJZCyxai0FeyYuohoSlivODXTk0OBd2ITJU6kf5K0Y9Mt0VI7rXgGGQ9HhvCLRZCrmEaoEZC3LX5CfWUMkhawymkHBc0gZAcCTZCwps0ZBZC357p2WTPcZCZC9rZAjCC7dXUXZAN2sGFWFGVyYgmBwpDU93YUsRfVPYmYKOJegqzOVPZBUSPrZATImtkpI';

// --- ضوابط الأمان والجدولة ---
const DAILY_STORY_LIMIT = parseInt(process.env.DAILY_STORY_LIMIT || '40', 10);
const MIN_SPACING_MINUTES = 12; // حد أدنى 12 دقيقة بين كل استوري والأخرى لمنع إزعاج المتابعين
const CYCLE_24H_MS = 24 * 60 * 60 * 1000;

// Helper: Supabase REST Request
function supabaseRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: SUPABASE_URL,
            port: 443,
            path: path,
            method: method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        };

        if (payload) {
            options.headers['Content-Length'] = Buffer.byteLength(payload);
        }

        const req = https.request(options, res => {
            let chunks = '';
            res.on('data', d => chunks += d);
            res.on('end', () => {
                try {
                    const parsed = chunks ? JSON.parse(chunks) : {};
                    resolve({ status: res.statusCode, data: parsed });
                } catch(e) {
                    resolve({ status: res.statusCode, data: chunks });
                }
            });
        });

        req.on('error', err => reject(err));
        if (payload) req.write(payload);
        req.end();
    });
}

// 1. نشر ستوري على إنستجرام كاندي كلوب
async function publishToInstagramStory(imageUrl) {
    try {
        console.log('[Instagram] Step 1: Creating media container (STORIES)...');
        const createParams = new URLSearchParams({
            image_url: imageUrl,
            media_type: 'STORIES',
            access_token: INSTAGRAM_ACCESS_TOKEN
        });

        const createRes = await fetch(`https://graph.instagram.com/v19.0/${INSTAGRAM_ACCOUNT_ID}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: createParams.toString()
        });
        const createData = await createRes.json();

        if (!createData || !createData.id) {
            console.error('[Instagram] Container error:', createData);
            return { success: false, error: createData?.error?.message || 'Instagram container creation failed' };
        }

        const creationId = createData.id;
        console.log(`[Instagram] Step 2: Waiting for container (${creationId}) processing...`);

        let isReady = false;
        for (let i = 0; i < 7; i++) {
            await new Promise(r => setTimeout(r, 1500));
            try {
                const sRes = await fetch(`https://graph.instagram.com/v19.0/${creationId}?fields=status_code,status&access_token=${INSTAGRAM_ACCESS_TOKEN}`);
                const sData = await sRes.json();
                console.log(`[Instagram] Poll ${i + 1}: ${sData.status_code}`);
                if (sData.status_code === 'FINISHED') {
                    isReady = true;
                    break;
                }
                if (sData.status_code === 'ERROR') {
                    console.error('[Instagram] Container error:', sData);
                    break;
                }
            } catch(e) {}
        }

        console.log(`[Instagram] Step 3: Publishing container (${creationId})...`);

        const pubParams = new URLSearchParams({
            creation_id: creationId,
            access_token: INSTAGRAM_ACCESS_TOKEN
        });

        const pubRes = await fetch(`https://graph.instagram.com/v19.0/${INSTAGRAM_ACCOUNT_ID}/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: pubParams.toString()
        });
        const pubData = await pubRes.json();

        if (pubData && pubData.id) {
            console.log(`[Instagram] Story published successfully! ID: ${pubData.id}`);
            return { success: true, id: pubData.id };
        } else {
            console.error('[Instagram] Publish error:', pubData);
            return { success: false, error: pubData?.error?.message || 'Instagram publish failed' };
        }
    } catch(err) {
        console.error('[Instagram] Network error:', err.message);
        return { success: false, error: err.message };
    }
}

// 2. نشر ستوري على صفحة فيسبوك كاندي كلوب (Story فقط وحصرياً - ممنوع نشر أي بوست)
async function publishToFacebookStory(imageUrl) {
    try {
        console.log('[Facebook] Step 1: Uploading unpublished photo container...');
        const uploadParams = new URLSearchParams({
            url: imageUrl,
            published: 'false',
            access_token: FACEBOOK_PAGE_ACCESS_TOKEN
        });

        const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: uploadParams.toString()
        });
        const uploadData = await uploadRes.json();

        if (!uploadData || !uploadData.id) {
            console.error('[Facebook] Photo upload failed:', uploadData);
            return { success: false, error: uploadData?.error?.message || 'Facebook photo upload failed' };
        }

        const photoId = uploadData.id;
        console.log(`[Facebook] Step 2: Publishing to Page Photo Stories (${photoId})...`);

        const storyParams = new URLSearchParams({
            photo_id: photoId,
            access_token: FACEBOOK_PAGE_ACCESS_TOKEN
        });

        const storyRes = await fetch(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/photo_stories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: storyParams.toString()
        });
        const storyData = await storyRes.json();

        if (storyData && (storyData.success || storyData.post_id || storyData.id)) {
            console.log(`[Facebook] Story published successfully! ID: ${storyData.post_id || storyData.id || photoId}`);
            return { success: true, id: storyData.post_id || storyData.id || photoId };
        } else {
            console.error('[Facebook] Story API error:', storyData);
            return { success: false, error: storyData?.error?.message || 'Facebook photo_stories failed' };
        }
    } catch(err) {
        console.error('[Facebook] Network error:', err.message);
        return { success: false, error: err.message };
    }
}

// Main Runner
async function main() {
    console.log(`=== [Candy Club Story Publisher Job] Started at: ${new Date().toISOString()} ===`);

    // 1. جلب العروض النشطة من Supabase
    const { status, data: offers } = await supabaseRequest('/rest/v1/store_offers?select=*&is_active=eq.true');

    if (status !== 200 || !Array.isArray(offers)) {
        console.error('[Supabase] Failed to fetch offers or no offers table found. Status:', status, offers);
        return;
    }

    if (offers.length === 0) {
        console.log('[Supabase] No active offers in store_offers. Nothing to publish.');
        return;
    }

    console.log(`[Supabase] Found ${offers.length} active offer(s).`);

    const now = Date.now();

    // 2. التحقق من الحد اليومي (40 استوري في آخر 24 ساعة)
    const publishedLast24h = offers.filter(o => {
        const ts = Number(o.last_story_published_at) || 0;
        return ts && (now - ts) < CYCLE_24H_MS;
    });

    console.log(`[Limit Check] Published in last 24h: ${publishedLast24h.length} / ${DAILY_STORY_LIMIT}`);
    if (publishedLast24h.length >= DAILY_STORY_LIMIT) {
        console.log('[Limit Reached] Daily story limit reached. Pausing until older stories pass 24h window.');
        return;
    }

    // 3. التحقق من الفاصل الزمني (12 دقيقة على الأقل بين كل استوري وأخرى)
    let latestPublishTs = 0;
    offers.forEach(o => {
        const ts = Number(o.last_story_published_at) || 0;
        if (ts > latestPublishTs) latestPublishTs = ts;
    });

    const elapsedSinceLast = now - latestPublishTs;
    const minSpacingMs = MIN_SPACING_MINUTES * 60 * 1000;
    if (latestPublishTs > 0 && elapsedSinceLast < minSpacingMs) {
        const remainingMinutes = Math.ceil((minSpacingMs - elapsedSinceLast) / 60000);
        console.log(`[Spacing] Only ${Math.floor(elapsedSinceLast / 60000)} mins passed since last story. Waiting ${remainingMinutes} more mins.`);
        return;
    }

    // 4. استخراج العروض المؤهلة (التي مر على آخر نشر لها 24 ساعة كاملة، أو لم تُنشر قط)
    const eligibleOffers = offers.filter(o => {
        if (!o.image_url || typeof o.image_url !== 'string' || !o.image_url.startsWith('http')) {
            return false;
        }
        const lastTs = Number(o.last_story_published_at) || 0;
        const hasPassed24h = (now - lastTs) >= CYCLE_24H_MS;
        const isScheduledDue = !o.scheduled_story_ts || Number(o.scheduled_story_ts) <= now;
        return hasPassed24h && isScheduledDue;
    });

    if (eligibleOffers.length === 0) {
        console.log('[Eligible] All active offers have already been published in the last 24 hours. Waiting for next cycle.');
        return;
    }

    // ترتيب العروض بالأقدم في آخر نشر لاختيار العرض المستحق أولاً
    eligibleOffers.sort((a, b) => (Number(a.last_story_published_at) || 0) - (Number(b.last_story_published_at) || 0));
    const targetOffer = eligibleOffers[0];

    console.log(`\n🎯 [Target Selected] Publishing Story for offer: "${targetOffer.product_name}" (ID: ${targetOffer.id})`);
    console.log(`🔗 Image URL: ${targetOffer.image_url}`);

    // 5. النشر المتزامن على إنستجرام وفيسبوك
    const [igResult, fbResult] = await Promise.all([
        publishToInstagramStory(targetOffer.image_url),
        publishToFacebookStory(targetOffer.image_url)
    ]);

    console.log(`[Results] Instagram: ${igResult.success ? 'SUCCESS' : 'FAILED'}, Facebook: ${fbResult.success ? 'SUCCESS' : 'FAILED'}`);

    // 6. إذا نجح النشر على أي منصة منهما، يتم تحديث Supabase فوراً
    if (igResult.success || fbResult.success) {
        const updatePayload = {
            last_story_published_at: now,
            story_publish_count: (Number(targetOffer.story_publish_count) || 0) + 1
        };

        const patchRes = await supabaseRequest(`/rest/v1/store_offers?id=eq.${targetOffer.id}`, 'PATCH', updatePayload);
        if (patchRes.status >= 200 && patchRes.status < 300) {
            console.log(`✅ [Supabase Updated] Offer ${targetOffer.id} timestamp updated to ${now}.`);
        } else {
            console.error('[Supabase Update Error]', patchRes);
        }
    } else {
        console.error('❌ Failed to publish to both Instagram and Facebook. Will retry next run.');
    }

    console.log(`=== [Job Completed at: ${new Date().toISOString()}] ===\n`);
}

main().catch(err => {
    console.error('Fatal job error:', err);
    process.exit(1);
});
