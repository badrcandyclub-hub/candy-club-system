/* CRM reads purchase records and writes only relationship metadata. */
(function (window, document) {
    'use strict';
    const M = window.CandyCRMModel;
    if (!M) return;
    const SIZE = 12;
    const life = {new:'جديد',contacted:'تم التواصل',interested:'مهتم',follow_up:'متابعة لاحقة',inactive:'متوقف'};
    const permission = {unknown:'غير محدد',allowed:'يسمح بالعروض',declined:'لا يرغب في العروض'};
    const state = {customers:[],raw:null,loading:false,loaded:false,writable:false,page:1,segment:'all',selected:new Set(),details:new Map()};
    let root;
    const $ = id => document.getElementById(id);
    const esc = value => M.escapeHTML(String(value == null ? '' : value));
    const money = value => new Intl.NumberFormat('ar-EG',{maximumFractionDigits:2}).format(Number(value)||0)+' ج.م';
    const day = value => String(value||'').slice(0,10)||'—';
    const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const tags = value => [...new Set(String(value||'').split(/[,،\n]/).map(v=>v.trim()).filter(Boolean))];
    const chip = (text,type='') => `<span class="crm-chip ${type?'crm-chip-'+type:''}">${esc(text)}</span>`;
    const options = (items,selected) => Object.entries(items).map(([v,t])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(t)}</option>`).join('');
    function credentials() {
        let user;
        try { user=JSON.parse(localStorage.getItem('cc_user')||'null'); } catch (_) {}
        const perms=String(user?.permissions||'').split(',').map(p=>p.trim());
        if (!user || !(perms.includes('ALL')||perms.includes('customers'))) throw new Error('هذه الصفحة تحتاج صلاحية قاعدة العملاء.');
        return {p_user:user.username,p_pass:sessionStorage.getItem('cc_pass')||''};
    }
    function say(text,error=false) {
        if ($('crmStatus')) { $('crmStatus').textContent=text; $('crmStatus').setAttribute('role',error?'alert':'status'); }
    }
    function errorMessage(error) {
        const code=String(error?.code||'');
        if (['40001','23505'].includes(code)) return 'البيانات اتغيرت أو الرقم موجود بالفعل. حدّث القائمة وافتح العميل من جديد؛ البيانات الحالية لم تُستبدل.';
        if (code==='42501') return 'تعذر التحقق من صلاحية الحفظ. سجّل الدخول من جديد بحساب لديه صلاحية العملاء.';
        if (['22023','22008','23514'].includes(code)) return 'راجع البيانات: الاسم حتى ١٦٠ حرفًا، المنطقة ١٠٠، الملاحظات ٤٠٠٠، و٢٠ وسمًا بحد أقصى (٨٠ حرفًا للوسم).';
        return 'لم يتم تأكيد الحفظ. احتفظ بالبيانات وحدّث القائمة قبل إعادة المحاولة.';
    }
    async function allRows(query) {
        const rows=[];
        for (let offset=0;;offset+=1000) {
            const {data,error}=await query.range(offset,offset+999);
            if (error) throw error;
            rows.push(...(data||[]));
            if (!data||data.length<1000) return rows;
        }
    }
    async function getProfiles() {
        const auth=credentials();
        if (!auth.p_pass) throw Object.assign(new Error('login'),{code:'42501'});
        const rows=[];
        for (let offset=0;;offset+=500) {
            const {data,error}=await window.supabase.rpc('crm_list_profiles',{...auth,p_offset:offset,p_limit:500});
            if (error) throw error;
            rows.push(...(data||[]));
            if (!data||data.length<500) return rows;
        }
    }
    function writeButtons() {
        for (const id of ['crmAdd','crmImport']) if ($(id)) $(id).disabled=!state.writable||state.loading;
        if ($('crmBulk')) $('crmBulk').disabled=!state.writable||state.loading||!state.selected.size;
    }
    async function load() {
        if (state.loading) return;
        try { credentials(); } catch(e) { say(e.message,true); return; }
        if (!window.supabase?.from) return say('الاتصال بقاعدة البيانات غير متاح. أعد المحاولة.',true);
        state.loading=true; state.writable=false; $('crmRefresh').disabled=true; writeButtons();
        root.setAttribute('aria-busy','true'); say('جاري قراءة العملاء وسجل المشتريات…');
        try {
            const results=await Promise.allSettled([
                allRows(window.supabase.from('customers').select('id,customer_name,phone,governorate,address,last_order_date').order('id',{ascending:true})),
                allRows(window.supabase.from('orders').select('id,order_id,customer_name,phone,governorate,address,platform,order_date,status,final_total').order('id',{ascending:true})),
                allRows(window.supabase.from('gifts').select('id,name,quantity,total_price,status,sold_at,created_at,customer_name,customer_phone').eq('status','sold').order('id',{ascending:true})),
                getProfiles()
            ]);
            if (results[0].status==='rejected') throw results[0].reason;
            if (results[1].status==='rejected') throw results[1].reason;
            const notices=[];
            if (results[2].status==='rejected') notices.push('تعذر تحديث مشتريات الهدايا؛ بيانات هذا المصدر قد تكون ناقصة. أعد التحديث.');
            state.writable=results[3].status==='fulfilled';
            if (!state.writable) {
                const code=String(results[3].reason?.code||'');
                notices.push(code==='42501'?'عرض المشتريات متاح. لتعديل المتابعة، سجّل الدخول من جديد بحساب له صلاحية العملاء.':
                    ['PGRST202','42P01','42883'].includes(code)?'سجل المتابعة الجديد غير مفعّل بعد. عرض المشتريات متاح؛ الحفظ والاستيراد يحتاجان تفعيله.':'تعذر تحديث سجل المتابعة؛ الإضافة والتعديل متوقفان مؤقتًا. أعد المحاولة.');
            }
            let legacyGifts=[];
            try { const saved=JSON.parse(localStorage.getItem('candy_gifts_customers')||'[]'); if(Array.isArray(saved)) legacyGifts=saved; } catch(_) {}
            state.raw={customers:results[0].value,orders:results[1].value,gifts:results[2].status==='fulfilled'?results[2].value:(state.raw?.gifts||[]),
                profiles:state.writable?results[3].value:(state.raw?.profiles||[]),legacyGifts};
            state.loaded=true; state.selected.clear(); state.details.clear(); rebuild();
            $('crmNotice').textContent=notices.join(' '); $('crmNotice').hidden=!notices.length;
            say(`تم تحديث ${state.customers.length} ملف عميل. بيانات الشراء للعرض فقط.`);
        } catch(_) {
            say('تعذر تحديث قاعدة العملاء. احتفظنا بآخر عرض متاح؛ أعد المحاولة.',true);
            if (!state.loaded) $('crmRows').innerHTML='<tr><td colspan="6"><div class="crm-empty">لم يتم تحميل البيانات. اضغط «تحديث» لإعادة المحاولة.</div></td></tr>';
        } finally { state.loading=false; $('crmRefresh').disabled=false; root.setAttribute('aria-busy','false'); writeButtons(); }
    }
    function rebuild() {
        state.customers=M.buildCustomers(state.raw);
        for (const [id,field] of [['crmSource','sources'],['crmInterest','interests']]) {
            const el=$(id),previous=el.value;
            const values=[...new Set(state.customers.flatMap(c=>c[field]||[]))].sort((a,b)=>a.localeCompare(b,'ar'));
            el.innerHTML='<option value="">الكل</option>'+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
            el.value=values.includes(previous)?previous:'';
        }
        render();
    }
    function filtered() {
        const query=M.normalizeText($('crmSearch').value),source=$('crmSource').value,interest=$('crmInterest').value,follow=$('crmFollow').value;
        const phone=M.normalizePhone($('crmSearch').value);
        const rows=state.customers.filter(c=>{
            if (state.segment==='customers'&&c.relationship!=='customer' || state.segment==='products'&&!c.hasProducts || state.segment==='gifts'&&!c.hasGifts || state.segment==='vip'&&!c.vip || state.segment==='prospects'&&c.relationship!=='prospect') return false;
            if (source&&!(c.sources||[]).includes(source) || interest&&!(c.interests||[]).includes(interest)) return false;
            if (follow==='due'&&!(c.next_follow_up&&c.next_follow_up<=today()) || follow==='allowed'&&c.contact_permission!=='allowed') return false;
            if (follow&&!['due','allowed'].includes(follow)&&c.lifecycle!==follow) return false;
            return !query||M.normalizeText([c.name,c.phone,c.gov,c.address,...(c.sources||[]),...(c.interests||[])].join(' ')).includes(query)||phone&&c.phone===phone;
        });
        const sort=$('crmSort').value;
        return rows.sort((a,b)=>sort==='count'?b.count-a.count:sort==='total'?b.total-a.total:sort==='giftTotal'?b.giftTotal-a.giftTotal:sort==='giftCount'?b.giftCount-a.giftCount:sort==='name'?a.name.localeCompare(b.name,'ar'):String(b.lastDate||'').localeCompare(String(a.lastDate||''))||a.name.localeCompare(b.name,'ar'));
    }
    function render() {
        const all=state.customers,rows=filtered(),pages=Math.max(1,Math.ceil(rows.length/SIZE));
        state.page=Math.max(1,Math.min(state.page,pages));
        const shown=rows.slice((state.page-1)*SIZE,state.page*SIZE);
        $('crmTotal').textContent=all.length; $('crmGiftTotal').textContent=all.filter(c=>c.hasGifts).length;
        $('crmVipTotal').textContent=all.filter(c=>c.vip).length; $('crmFollowTotal').textContent=all.filter(c=>c.next_follow_up&&c.next_follow_up<=today()).length;
        $('crmRows').innerHTML=shown.length?shown.map(c=>`<tr><td><input type="checkbox" data-select="${esc(c.key)}" aria-label="تحديد ${esc(c.name)}" ${state.selected.has(c.key)?'checked':''}></td>
            <td><span class="crm-name">${esc(c.name)} ${c.vip?chip('VIP','gold'):''}</span><span class="crm-phone">${esc(c.phone||'رقم غير مسجل')}</span></td>
            <td>${chip(c.relationship==='prospect'?'عميل محتمل':'عميل حالي',c.relationship==='prospect'?'':'green')}${c.hasGifts?chip('هدايا','pink'):''}<div>${(c.sources||[]).slice(0,2).map(s=>chip(s)).join('')}</div></td>
            <td>${(c.interests||[]).slice(0,3).map(s=>chip(s)).join('')||'<span class="crm-muted">لم تُسجل بعد</span>'}</td>
            <td><strong>${c.historicalUnavailable?'تفاصيل الشراء غير مسجلة':`${c.count} طلب · ${money(c.total)}`}</strong><div class="crm-muted">${c.hasGifts?`هدايا: ${money(c.giftTotal)} · `:''}${c.next_follow_up?`متابعة: ${esc(c.next_follow_up)}`:`آخر شراء: ${esc(day(c.lastDate))}`}</div></td>
            <td><button type="button" class="crm-btn crm-btn-soft" data-open="${esc(c.key)}">الملف</button></td></tr>`).join(''):'<tr><td colspan="6"><div class="crm-empty">لا توجد نتائج مطابقة. جرّب تغيير البحث أو الفلاتر.</div></td></tr>';
        $('crmPageLabel').textContent=`${rows.length?(state.page-1)*SIZE+1:0}–${Math.min(state.page*SIZE,rows.length)} من ${rows.length} عميل · صفحة ${state.page} من ${pages}`;
        $('crmPrev').disabled=state.page===1; $('crmNext').disabled=state.page===pages;
        const count=shown.filter(c=>state.selected.has(c.key)).length;
        $('crmSelectPage').checked=shown.length>0&&count===shown.length; $('crmSelectPage').indeterminate=count>0&&count<shown.length; $('crmSelectPage').disabled=!shown.length;
        $('crmSelectedLabel').textContent=`${state.selected.size} محدد`;
        $('crmExport').disabled=!rows.length; $('crmAudience').disabled=!rows.length; writeButtons();
        $('crmBulk').disabled=!state.writable||state.loading||!state.selected.size;
    }
    function dialog(title,content,actions='') {
        const previous=document.activeElement,el=document.createElement('dialog');
        el.className='crm-dialog'; el.setAttribute('aria-label',title);
        el.innerHTML=`<div class="crm-dialog-heading"><h2>${esc(title)}</h2><button type="button" class="crm-btn" data-close aria-label="إغلاق">✕</button></div><div class="crm-dialog-body">${content}</div>${actions?`<div class="crm-dialog-actions">${actions}</div>`:''}`;
        document.body.appendChild(el);
        el.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{if(!el.dataset.busy)el.close();}));
        el.addEventListener('cancel',e=>{if(el.dataset.busy)e.preventDefault();});
        el.addEventListener('close',()=>{el.remove();previous?.focus?.();});
        el.showModal(); return el;
    }
    function profileData(c={}) {
        return {phone:c.phone||'',customer_name:c.name||'',governorate:c.gov||'',address:c.address||'',relationship:c.relationship||'customer',sources:c.sources||[],interests:c.interests||[],
            lifecycle:c.lifecycle||'new',contact_permission:c.contact_permission||'unknown',notes:c.profile?c.notes:(c.localGiftNotes||''),next_follow_up:c.next_follow_up||null,expected_revision:c.revision||0};
    }
    async function saveRows(rows) {
        if (!state.writable) throw new Error('unavailable');
        const {data,error}=await window.supabase.rpc('crm_save_profiles',{...credentials(),p_profiles:rows});
        if(error)throw error;
        if(!Array.isArray(data?.profiles)||data.profiles.length!==rows.length)throw new Error('Unconfirmed save');
        const saved=new Map(state.raw.profiles.map(p=>[p.phone,p])); data.profiles.forEach(p=>saved.set(p.phone,p));
        state.raw.profiles=[...saved.values()]; rebuild(); return data.profiles;
    }
    function edit(c=null) {
        if(!state.writable)return say('الحفظ غير متاح حاليًا. أعد التحديث أو سجّل الدخول من جديد.',true);
        if(c&&!c.editable)return say('هذا السجل بلا رقم صالح. أضف ملفًا برقم صحيح؛ العملاء لا يُدمجون بالاسم.',true);
        const d=profileData(c||{});
        const el=dialog(c?'بيانات العميل ومتابعته':'إضافة عميل',`<form id="crmEditForm" class="crm-form-grid">
            <label>اسم العميل *<input name="customer_name" required maxlength="160" value="${esc(d.customer_name)}" autocomplete="name"></label>
            <label>رقم الموبايل *<input name="phone" type="tel" dir="ltr" required maxlength="30" value="${esc(d.phone)}" ${c?'readonly':''} autocomplete="tel"><span class="crm-form-help">${c?'الرقم ثابت للحفاظ على ربط المشتريات.':'يُقبل 01… أو +20…، وسنكتشف الرقم المكرر.'}</span></label>
            <label>العلاقة بالعميل<select name="relationship">${options({customer:'اشترى مننا بالفعل',prospect:'عميل محتمل لم يشترِ بعد'},d.relationship)}</select></label>
            <label>مصدر العميل<input name="sources" maxlength="500" list="crmSourcesList" value="${esc(d.sources.join('، '))}" placeholder="شوب، طلبات، الفرع…"><datalist id="crmSourcesList"><option value="إنستاشوب"><option value="طلبات"><option value="الفرع"><option value="واتساب"><option value="إنستجرام"></datalist><span class="crm-form-help">يمكن تسجيل أكثر من مصدر، مفصولة بفاصلة.</span></label>
            <label class="crm-form-wide">اهتمامات يذكرها العميل<input name="interests" maxlength="1000" value="${esc(d.interests.join('، '))}" placeholder="كاندي، شوكولاتة، بوكيهات، ليجو…"><span class="crm-form-help">وسوم من اختيارك. المشتريات تظهر منفصلة ولا تتحول تلقائيًا لتفضيلات.</span></label>
            <details class="crm-form-wide crm-extra-fields" ${c?'open':''}><summary>العنوان والمتابعة والملاحظات · اختياري</summary><div class="crm-form-grid">
            <label>المحافظة / المنطقة<input name="governorate" maxlength="100" value="${esc(d.governorate)}"></label>
            <label>العنوان<input name="address" maxlength="1000" value="${esc(d.address)}"></label>
            <label>حالة المتابعة<select name="lifecycle">${options(life,d.lifecycle)}</select></label>
            <label>موعد المتابعة<input name="next_follow_up" type="date" value="${esc(d.next_follow_up||'')}"></label>
            <label>استقبال العروض<select name="contact_permission">${options(permission,d.contact_permission)}</select><span class="crm-form-help">سجّل رغبة العميل في استقبال العروض.</span></label>
            <label>ملاحظات<textarea name="notes" maxlength="4000">${esc(d.notes)}</textarea></label></div></details><p id="crmFormMessage" class="crm-form-wide crm-status" role="status"></p></form>`,
            '<button type="button" class="crm-btn" data-close>إلغاء</button><button type="submit" form="crmEditForm" class="crm-btn crm-btn-primary" id="crmSave">حفظ العميل</button>');
        const form=el.querySelector('form'),msg=el.querySelector('#crmFormMessage');
        form.addEventListener('submit',async e=>{
            e.preventDefault();if(el.dataset.busy)return;
            const values=Object.fromEntries(new FormData(form)),phone=M.normalizePhone(values.phone);
            if(!phone){msg.textContent='اكتب رقم موبايل صالحًا.';return;}
            if(!String(values.customer_name).trim()){msg.textContent='اكتب اسم العميل.';return;}
            if(!c&&state.customers.some(row=>row.phone===phone)){msg.textContent='الرقم موجود بالفعل. افتح ملفه من البحث لتعديله بدل تكراره.';return;}
            const payload={...d,...values,phone,customer_name:values.customer_name.trim(),sources:tags(values.sources),interests:tags(values.interests),next_follow_up:values.next_follow_up||null};
            if(!payload.sources.length)payload.sources=['إدخال يدوي'];
            if([payload.sources,payload.interests].some(a=>a.length>20||a.some(t=>t.length>80))){msg.textContent='استخدم حتى ٢٠ وسمًا، كل وسم لا يزيد عن ٨٠ حرفًا.';return;}
            el.dataset.busy='true';el.querySelector('#crmSave').disabled=true;msg.textContent='جاري الحفظ…';
            try{await saveRows([payload]);delete el.dataset.busy;el.close();say('تم حفظ بيانات العميل ومتابعته.');}
            catch(error){msg.textContent=errorMessage(error);}
            finally{delete el.dataset.busy;if(el.isConnected)el.querySelector('#crmSave').disabled=false;}
        });
    }
    function orderHTML(orders) {
        return orders.length?orders.map(o=>`<div class="crm-history-item"><strong>${esc(o.order_id||o.id)}</strong><strong>${money(o.final_total??o.total)}</strong><span>${esc(o.status||'')}</span><span>${esc(day(o.order_date||o.date))}</span>${o.products?`<p>${esc(typeof o.products==='string'?o.products:JSON.stringify(o.products))}</p>`:''}</div>`).join(''):'<p class="crm-muted">لا توجد طلبات مسجلة بهذا الرقم.</p>';
    }
    async function openProfile(key) {
        const c=state.customers.find(c=>c.key===key);if(!c)return;
        const orders=c.orders||[],gifts=c.giftPurchases||[];
        const el=dialog(c.name,`<div class="crm-heading"><div><strong dir="ltr">${esc(c.phone||'رقم غير مسجل')}</strong><p class="crm-muted">${esc([c.gov,c.address].filter(Boolean).join(' · ')||'العنوان غير مسجل')}</p></div><div>${chip(c.relationship==='prospect'?'عميل محتمل':'عميل حالي','green')}${c.vip?chip('VIP · ٣ طلبات أو أكثر','gold'):''}</div></div>
            ${c.historicalUnavailable?'<div class="crm-notice">العميل مسجل كعميل حالي، لكن تفاصيل مشترياته القديمة غير موجودة هنا. غياب التفاصيل لا يعني عدم وجود شراء.</div>':''}
            ${c.localGiftContact?'<p class="crm-muted">يتضمن بيانات من دليل الهدايا على هذا الجهاز. احفظ بيانات العميل لإتاحتها في سجل المتابعة المشترك.</p>':''}
            <div class="crm-stats"><div class="crm-stat"><span>طلبات غير ملغاة / مرتجعة</span><strong>${c.count}</strong></div><div class="crm-stat"><span>قيمة الطلبات المسجلة</span><strong>${money(c.total)}</strong></div><div class="crm-stat"><span>قيمة سجلات بيع الهدايا</span><strong>${money(c.giftTotal)}</strong></div><div class="crm-stat"><span>آخر شراء مسجل</span><strong style="font-size:1rem">${esc(day(c.lastDate))}</strong></div></div>
            <p class="crm-muted">قيمة الطلبات تشمل الشحن حسب السجل، ولا تعني تحصيل المبلغ. الهدايا معروضة منفصلة لتجنب جمع نفس البيع مرتين.</p>
            <div class="crm-profile-meta" style="margin-top:16px"><section class="crm-profile-block"><h3>المصادر والاهتمامات</h3><p>${(c.sources||[]).map(s=>chip(s)).join('')||'المصدر غير محدد'}</p><p>${(c.interests||[]).map(s=>chip(s,'pink')).join('')||'لم تُسجل اهتمامات بعد.'}</p></section><section class="crm-profile-block"><h3>المتابعة</h3><p>${esc(life[c.lifecycle]||life.new)} · ${esc(permission[c.contact_permission]||permission.unknown)}</p><p>المتابعة القادمة: ${esc(c.next_follow_up||'غير محددة')}</p><p style="white-space:pre-wrap">${esc((c.profile?c.notes:c.localGiftNotes)||'لا توجد ملاحظات.')}</p></section></div>
            <div class="crm-detail-tabs" role="tablist" aria-label="سجل العميل"><button class="crm-segment" role="tab" id="crmOrderTab" aria-controls="crmOrderPanel" aria-selected="true" aria-pressed="true" data-history="orders">الطلبات (${orders.length})</button><button class="crm-segment" role="tab" id="crmGiftTab" aria-controls="crmGiftPanel" aria-selected="false" aria-pressed="false" tabindex="-1" data-history="gifts">الهدايا (${gifts.length})</button></div>
            <section id="crmOrderPanel" role="tabpanel" aria-labelledby="crmOrderTab"><p class="crm-muted" id="crmProductsStatus">جاري تحميل تفاصيل المنتجات…</p><div class="crm-history" id="crmOrderHistory" tabindex="0" aria-label="سجل الطلبات">${orderHTML(orders)}</div></section>
            <section id="crmGiftPanel" role="tabpanel" aria-labelledby="crmGiftTab" hidden><div class="crm-history" tabindex="0" aria-label="سجل الهدايا">${gifts.length?gifts.map(g=>`<div class="crm-history-item"><strong>${esc(g.name||'هدية')}</strong><strong>${money(g.total_price??g.total)}</strong><span>${esc(g.quantity??1)} قطعة</span><span>${esc(day(g.sold_at||g.date||g.created_at))}</span></div>`).join(''):'<p class="crm-muted">لا توجد عمليات بيع هدايا مسجلة بهذا الرقم.</p>'}</div></section>`,
            `<button class="crm-btn" data-close>إغلاق</button><button type="button" id="crmEditCustomer" class="crm-btn crm-btn-primary" ${!state.writable||!c.editable?'disabled':''}>تعديل البيانات والمتابعة</button>`);
        el.querySelector('#crmEditCustomer').addEventListener('click',()=>{el.close();edit(c);});
        const tabs=[...el.querySelectorAll('[data-history]')];
        function activate(btn){tabs.forEach(t=>{const on=t===btn;t.setAttribute('aria-selected',String(on));t.setAttribute('aria-pressed',String(on));t.tabIndex=on?0:-1;});el.querySelector('#crmOrderPanel').hidden=btn.dataset.history!=='orders';el.querySelector('#crmGiftPanel').hidden=btn.dataset.history!=='gifts';}
        tabs.forEach((t,index)=>{t.addEventListener('click',()=>activate(t));t.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=tabs[e.key==='Home'?0:e.key==='End'?1:(index+1)%2];activate(next);next.focus();}});});
        const status=el.querySelector('#crmProductsStatus');
        if(!orders.length){status.textContent='مصدر السجل: الطلبات المسجلة في النظام.';return;}
        try{
            const phones=[...new Set((c.rawPhones||[]).filter(Boolean))];if(!phones.length)phones.push(c.phone);
            if(!state.details.has(key))state.details.set(key,allRows(window.supabase.from('orders').select('id,order_id,phone,order_date,status,final_total,products').in('phone',phones).order('id',{ascending:false})));
            const detail=await state.details.get(key);
            if(el.isConnected){el.querySelector('#crmOrderHistory').innerHTML=orderHTML(detail);status.textContent='منتجات حسب سجل الطلبات؛ لا تُعامل كتفضيلات مؤكدة.';}
        }catch(_){state.details.delete(key);if(el.isConnected)status.textContent='تعذر تحميل أسماء المنتجات. ملخص الطلبات متاح؛ أعد فتح الملف للمحاولة.';}
    }
    function download(text,name){
        const blob=new Blob([text],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),link=document.createElement('a');
        link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    function template(){download(M.serializeCSV([M.CSV_HEADERS]),'candy-customers-template.csv');say('تم تنزيل قالب فارغ. اكتب الموبايل كنص والتاريخ بصيغة YYYY-MM-DD.');}
    function exportRows(marketing=false){
        let rows=filtered();if(state.selected.size)rows=rows.filter(c=>state.selected.has(c.key));
        const original=rows.length;
        if(marketing)rows=rows.filter(c=>c.contact_permission==='allowed'&&c.editable);
        if(!rows.length)return say(marketing?'لا يوجد عملاء في الاختيار مسجل لهم السماح بالعروض. سجّل الرغبة من ملف العميل.':'لا توجد بيانات للتصدير.',true);
        download(M.serializeCSV([M.CSV_HEADERS,...rows.map(c=>[c.name,c.phone,(c.sources||[]).join('، '),c.relationship==='prospect'?'محتمل':'عميل حالي',(c.interests||[]).join('، '),c.gov,c.address,life[c.lifecycle]||life.new,permission[c.contact_permission]||permission.unknown,c.next_follow_up||'',c.notes||''])]),marketing?'candy-offer-audience.csv':'candy-customers.csv');
        say(`تم تصدير ${rows.length} عميل${marketing?` واستبعاد ${original-rows.length} غير مسجل لهم السماح بالعروض. لم تُرسل رسائل`:''}.`);
    }
    function audience(){
        let rows=filtered();if(state.selected.size)rows=rows.filter(c=>state.selected.has(c.key));
        const original=rows.length;rows=rows.filter(c=>c.contact_permission==='allowed'&&c.editable);
        if(!rows.length)return say('لا يوجد عملاء في الاختيار مسجل لهم السماح بالعروض. سجّل الرغبة من ملف العميل.',true);
        const canDraft=!!($('waCustomNumbers')&&$('waTargetGroup'));
        const el=dialog('جمهور العروض', `<p>${rows.length} عميل جاهز · تم استبعاد ${original-rows.length} غير مسجل لهم السماح بالعروض.</p><p class="crm-muted">يمكن تنزيل القائمة، أو تجهيز الأرقام في مسودة الحملات. كتابة الرسالة وبدء الإرسال يتمان من صفحة الحملات.</p><div class="crm-profile-block" style="margin-top:15px"><p>${rows.slice(0,8).map(c=>esc(c.name)).join('، ')}${rows.length>8?'…':''}</p></div><p class="crm-muted">تجهيز المسودة يستبدل الأرقام المكتوبة حاليًا في خانة «أرقام مخصصة» بالجمهور المحدد.</p>`, `<button class="crm-btn" data-close>إغلاق</button><button class="crm-btn" id="crmDownloadAudience">تنزيل القائمة CSV</button>${canDraft?'<button class="crm-btn crm-btn-primary" id="crmDraftAudience">تجهيز الجمهور في الحملات</button>':''}`);
        el.querySelector('#crmDownloadAudience').addEventListener('click',()=>exportRows(true));
        el.querySelector('#crmDraftAudience')?.addEventListener('click',()=>{
            $('waTargetGroup').value='custom';$('waTargetGroup').dispatchEvent(new Event('change',{bubbles:true}));
            $('waCustomNumbers').value=rows.map(c=>c.phone).join('\n');
            el.close();say(`تم تجهيز ${rows.length} رقم في مسودة الحملات. راجع الرسالة ثم ابدأ الإرسال من هناك.`);
            document.querySelector('.nav-item[data-target="whatsapp-campaign-tab"]')?.click();
        });
    }
    function bulkEdit(){
        if(!state.writable)return;
        const chosen=state.customers.filter(c=>state.selected.has(c.key));
        if(!chosen.length)return;
        if(chosen.length>200)return say('حدد حتى ٢٠٠ عميل في الدفعة الواحدة.',true);
        if(chosen.some(c=>!c.editable))return say('الاختيار يتضمن سجلات بلا رقم صالح. ألغِ تحديدها أولًا.',true);
        const el=dialog(`تصنيف ${chosen.length} عميل`, `<form id="crmBulkForm" class="crm-form-grid"><label class="crm-form-wide">إضافة اهتمامات<input name="interests" maxlength="1000" placeholder="شوكولاتة، هدايا…"><span class="crm-form-help">تُضاف للوسوم الموجودة بدون حذفها.</span></label><label>إضافة مصدر<input name="sources" maxlength="500" placeholder="طلبات، إنستاشوب…"></label><label>حالة المتابعة<select name="lifecycle"><option value="">الاحتفاظ بالحالة الحالية</option>${options(life,'')}</select></label><p id="crmBulkMessage" class="crm-form-wide crm-status" role="status">التعديل يخص العملاء المحددين فقط.</p></form>`, '<button class="crm-btn" data-close>إلغاء</button><button type="submit" form="crmBulkForm" class="crm-btn crm-btn-primary" id="crmBulkSave">حفظ التصنيف للمحدد</button>');
        el.querySelector('form').addEventListener('submit',async e=>{
            e.preventDefault();if(el.dataset.busy)return;
            const values=Object.fromEntries(new FormData(e.target)),interests=tags(values.interests),sources=tags(values.sources),msg=el.querySelector('#crmBulkMessage');
            if(!interests.length&&!sources.length&&!values.lifecycle){msg.textContent='أضف وسمًا أو اختر حالة متابعة أولًا.';return;}
            const rows=chosen.map(c=>{const d=profileData(c);d.interests=[...new Set(d.interests.concat(interests))];d.sources=[...new Set(d.sources.concat(sources))];if(values.lifecycle)d.lifecycle=values.lifecycle;return d;});
            if(rows.some(d=>[d.sources,d.interests].some(a=>a.length>20||a.some(t=>t.length>80)))){msg.textContent='بعض العملاء سيتجاوزون حد ٢٠ وسمًا، أو يوجد وسم أطول من ٨٠ حرفًا.';return;}
            el.dataset.busy='true';el.querySelector('#crmBulkSave').disabled=true;msg.textContent='جاري حفظ التصنيفات…';
            try{await saveRows(rows);delete el.dataset.busy;el.close();say(`تم تصنيف ${rows.length} عميل.`);}catch(error){msg.textContent=errorMessage(error);}finally{delete el.dataset.busy;if(el.isConnected)el.querySelector('#crmBulkSave').disabled=false;}
        });
    }
    function importFile(){
        if(!state.writable)return;
        const el=dialog('استيراد عملاء',`<div class="crm-file-drop"><label>ملف CSV بترميز UTF-8<input id="crmImportFile" type="file" accept=".csv,text/csv"></label><p class="crm-muted">استخدم القالب الفارغ. الاسم والموبايل مطلوبان؛ النوع الافتراضي «عميل حالي». حتى ٢٠٠ صف في المرة.</p></div><p class="crm-muted">الأرقام الموجودة لن تُستبدل. راجع الأخطاء والمكرر قبل حفظ الصفوف الصحيحة.</p><p id="crmImportStatus" class="crm-status" role="status"></p><div id="crmImportPreview" class="crm-import-preview"></div><div id="crmImportErrors" class="crm-import-problems"></div>`,
            '<button class="crm-btn" data-close>إلغاء</button><button type="button" class="crm-btn crm-btn-primary" id="crmConfirmImport" disabled>حفظ الصفوف الصحيحة</button>');
        let prepared=null,version=0;
        const button=el.querySelector('#crmConfirmImport'),status=el.querySelector('#crmImportStatus');
        el.querySelector('#crmImportFile').addEventListener('change',async e=>{
            const current=++version;prepared=null;button.disabled=true;status.textContent='';el.querySelector('#crmImportPreview').innerHTML='';el.querySelector('#crmImportErrors').innerHTML='';
            const file=e.target.files?.[0];if(!file)return;
            if(file.size>2*1024*1024){status.textContent='استخدم ملفًا لا يزيد عن ٢ ميجابايت و٢٠٠ صف.';return;}
            try{
                const text=await file.text();if(current!==version||!el.isConnected)return;
                prepared=M.prepareImport(text,state.customers);
                if(prepared.totalRows>200){prepared=null;status.textContent='قسّم الملف إلى دفعات لا تتجاوز ٢٠٠ صف.';return;}
                status.textContent=`${prepared.validCount} صالح · ${prepared.duplicates.length} مكرر · ${prepared.errors.length} خطأ. الصفوف المستبعدة لن تُحفظ.`;
                el.querySelector('#crmImportPreview').innerHTML=`<table class="crm-table"><thead><tr><th>الاسم</th><th>الموبايل</th><th>المصدر</th></tr></thead><tbody>${prepared.rows.map(r=>`<tr><td>${esc(r.customer_name)}</td><td dir="ltr">${esc(r.phone)}</td><td>${esc(r.sources.join('، '))}</td></tr>`).join('')}</tbody></table>`;
                el.querySelector('#crmImportErrors').innerHTML=[...prepared.errors,...prepared.duplicates].map(r=>`<p>صف ${esc(r.row)}: ${esc(r.message)}</p>`).join('');button.disabled=!prepared.rows.length;
            }catch(_){status.textContent='تعذر قراءة الملف. تأكد من العناوين وترميز UTF-8 أو نزّل القالب.';}
        });
        button.addEventListener('click',async()=>{
            if(!prepared?.rows.length||el.dataset.busy)return;
            el.dataset.busy='true';button.disabled=true;el.querySelector('#crmImportFile').disabled=true;status.textContent='جاري حفظ الدفعة…';
            try{await saveRows(prepared.rows.map(r=>({...r,expected_revision:0})));delete el.dataset.busy;el.close();say(`تم حفظ ${prepared.rows.length} عميل جديد.`);}
            catch(error){status.textContent=errorMessage(error);}
            finally{delete el.dataset.busy;if(el.isConnected){button.disabled=false;el.querySelector('#crmImportFile').disabled=false;}}
        });
    }
    function mount(){
        root=$('crmRoot');if(!root)return;
        root.innerHTML=`<div class="crm-heading"><div><h2>قاعدة العملاء</h2><p>اعرف عميلك، نظّم اهتماماته، وتابع معاه في الوقت المناسب.</p></div><div class="crm-actions"><button class="crm-btn crm-btn-primary" id="crmAdd" disabled>＋ إضافة عميل</button><button class="crm-btn" id="crmImport" disabled>استيراد بيانات</button><button class="crm-btn" id="crmTemplate">قالب فارغ</button><button class="crm-btn" id="crmRefresh">↻ تحديث</button></div></div>
            <div id="crmNotice" class="crm-notice" role="status" hidden></div><div class="crm-stats"><div class="crm-stat"><span>كل العملاء</span><strong id="crmTotal">—</strong></div><div class="crm-stat"><span>عملاء الهدايا</span><strong id="crmGiftTotal">—</strong></div><div class="crm-stat"><span>VIP · ٣ طلبات فأكثر</span><strong id="crmVipTotal">—</strong></div><div class="crm-stat"><span>متابعات اليوم والمتأخرة</span><strong id="crmFollowTotal">—</strong></div></div>
            <nav class="crm-segments" aria-label="تقسيم العملاء">${[['all','الكل'],['customers','عملاء حاليون'],['products','عملاء المنتجات'],['gifts','عملاء الهدايا'],['vip','VIP'],['prospects','عملاء محتملون']].map(([v,t])=>`<button class="crm-segment" data-segment="${v}" aria-pressed="${v==='all'}">${t}</button>`).join('')}</nav>
            <div class="crm-filters"><label>البحث<input id="crmSearch" type="search" placeholder="الاسم، الموبايل، المنطقة أو الاهتمام…"></label><label>مصدر العميل<select id="crmSource"><option value="">الكل</option></select></label><label>الاهتمام<select id="crmInterest"><option value="">الكل</option></select></label><label>المتابعة<select id="crmFollow"><option value="">الكل</option><option value="due">متابعة مستحقة</option><option value="allowed">يسمح بالعروض</option>${options(life,'')}</select></label></div>
            <div class="crm-toolbar"><label>ترتيب العملاء<select id="crmSort"><option value="recent">آخر شراء</option><option value="count">الأكثر طلبًا</option><option value="total">أعلى قيمة طلبات</option><option value="giftTotal">أعلى قيمة هدايا</option><option value="giftCount">الأكثر شراءً للهدايا</option><option value="name">الاسم</option></select></label><button class="crm-btn" id="crmReset">مسح الفلاتر</button></div>
            <div class="crm-selection"><label><input type="checkbox" id="crmSelectPage">تحديد الصفحة <span id="crmSelectedLabel">٠ محدد</span></label><div class="crm-actions"><button class="crm-btn" id="crmBulk" disabled>تصنيف المحدد</button><button class="crm-btn" id="crmExport" disabled>تصدير البيانات</button><button class="crm-btn crm-btn-soft" id="crmAudience" disabled>قائمة جمهور العروض</button></div></div>
            <p class="crm-status" id="crmStatus" role="status" aria-live="polite">افتح الصفحة لتحميل بيانات العملاء.</p><div class="crm-table-wrap"><table class="crm-table"><thead><tr><th aria-label="تحديد"></th><th>العميل</th><th>التصنيف والمصدر</th><th>الاهتمامات</th><th>الشراء والمتابعة</th><th>التفاصيل</th></tr></thead><tbody id="crmRows"><tr><td colspan="6"><div class="crm-empty">البيانات ستظهر هنا بعد التحديث.</div></td></tr></tbody></table></div>
            <div class="crm-pagination"><span id="crmPageLabel">١٢ عميل في كل صفحة</span><div class="crm-actions"><button class="crm-btn" id="crmPrev" disabled>السابق</button><button class="crm-btn" id="crmNext" disabled>التالي</button></div></div><p class="crm-muted" style="margin-top:12px">نفس العميل قد يظهر ضمن المنتجات والهدايا. التصدير يخص المحدد، أو نتائج البحث كلها إذا لم تحدد أحدًا.</p>`;
        $('crmRefresh').addEventListener('click',load);$('crmAdd').addEventListener('click',()=>edit());$('crmTemplate').addEventListener('click',template);$('crmImport').addEventListener('click',importFile);
        $('crmExport').addEventListener('click',()=>exportRows());$('crmAudience').addEventListener('click',audience);$('crmBulk').addEventListener('click',bulkEdit);
        const resetPage=()=>{state.page=1;state.selected.clear();render();};
        ['crmSearch','crmSource','crmInterest','crmFollow','crmSort'].forEach(id=>$(id).addEventListener(id==='crmSearch'?'input':'change',resetPage));
        $('crmReset').addEventListener('click',()=>{['crmSearch','crmSource','crmInterest','crmFollow'].forEach(id=>$(id).value='');state.segment='all';root.querySelectorAll('[data-segment]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.segment==='all')));resetPage();});
        root.querySelectorAll('[data-segment]').forEach(b=>b.addEventListener('click',()=>{state.segment=b.dataset.segment;root.querySelectorAll('[data-segment]').forEach(t=>t.setAttribute('aria-pressed',String(t===b)));resetPage();}));
        $('crmPrev').addEventListener('click',()=>{state.page--;render();});$('crmNext').addEventListener('click',()=>{state.page++;render();});
        $('crmRows').addEventListener('click',e=>{const btn=e.target.closest('[data-open]');if(btn)openProfile(btn.dataset.open);});
        $('crmRows').addEventListener('change',e=>{if(e.target.matches('[data-select]')){const key=e.target.dataset.select;e.target.checked?state.selected.add(key):state.selected.delete(key);render();}});
        $('crmSelectPage').addEventListener('change',e=>{filtered().slice((state.page-1)*SIZE,state.page*SIZE).forEach(c=>e.target.checked?state.selected.add(c.key):state.selected.delete(c.key));render();});
        const tab=$('customers-tab'),autoLoad=()=>{if(tab.classList.contains('active')&&!state.loaded&&!state.loading)load();};
        new MutationObserver(autoLoad).observe(tab,{attributes:true,attributeFilter:['class']});autoLoad();
    }
    window.CandyCRM={refresh:load};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})(window,document);
