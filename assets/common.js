// Know UAV — shared helpers: supabase client, header/footer, toast
(function(){
  const K = window.KU;
  window.sb = window.supabase.createClient(K.SUPABASE_URL, K.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' }
  });
  window.$ = s => document.querySelector(s);
  window.$$ = s => [...document.querySelectorAll(s)];
  window.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  window.toast = (t, err) => {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = t; el.classList.toggle('err', !!err); el.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => el.hidden = true, 3200);
  };
  // limited-time offer: app_settings.offer_price + offer_until (ISO). Shows "15 ~~25~~" everywhere and a countdown bar.
  window.KU_SET = {};
  window.priceInfo = st => { st = st || window.KU_SET || {}; const base = +(st.price || K.PRICE), op = +(st.offer_price || 0), ou = st.offer_until ? new Date(st.offer_until).getTime() : 0;
    const on = op > 0 && op < base && ou > Date.now(); return on ? { now: op, was: base, on: true, until: ou } : { now: base, was: null, on: false }; };
  window.priceHTML = st => { const p = priceInfo(st); return p.on ? `${AR(p.now)} <s class="was">${AR(p.was)}</s> ريال` : `${AR(p.now)} ريال`; };
  const applyPrice = () => { const p = priceInfo(); $$('[data-price]').forEach(e => e.innerHTML = p.on ? `${AR(p.now)} <s class="was">${AR(p.was)}</s>` : AR(p.now));
    let bar = document.getElementById('offerbar');
    if (!p.on) { if (bar) bar.remove(); document.body.classList.remove('has-offer'); return; }
    if (!bar) { bar = document.createElement('a'); bar.id = 'offerbar'; bar.className = 'offerbar'; bar.href = location.pathname.startsWith('/app') ? '#pay' : '/app#signup'; document.body.prepend(bar); document.body.classList.add('has-offer'); }
    const tick = () => { const ms = p.until - Date.now(); if (ms <= 0) { clearInterval(bar._t); applyPrice(); window.dispatchEvent(new Event('ku-offer-end')); return; }
      const h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3), z = n => String(n).padStart(2, '0');
      bar.innerHTML = `<span>⏰ <b>عرض لفترة محدودة:</b> التفعيل بـ <b>${AR(p.now)} ريال</b> بدل <s>${AR(p.was)}</s></span><span class="cd">ينتهي بعد <b class="ltr">${z(h)}:${z(m)}:${z(s)}</b></span>`; };
    clearInterval(bar._t); tick(); bar._t = setInterval(tick, 1000); };
  window.loadOffer = async () => { try { const { data } = await sb.from('app_settings').select('key,value'); window.KU_SET = Object.fromEntries((data || []).map(r => [r.key, r.value])); } catch (e) {} applyPrice(); return window.KU_SET; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadOffer); else loadOffer();
  const waIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>';
  window.renderFooter = () => {
    const f = document.createElement('footer'); f.className = 'site';
    f.innerHTML = `<div class="wrap cols">
      <div><img src="/assets/logo.png" alt="Know UAV"><div>منصة تعليمية مستقلة لتعلّم أساسيات تشغيل الطائرات بدون طيار، بدروس عربية ومحاكي طيران.</div></div>
      <div><h4>الموقع</h4><a href="/about">من نحن</a><a href="/privacy">سياسة الخصوصية</a><a href="/terms">الشروط والأحكام</a><a href="/refund">سياسة الاسترجاع</a></div>
      <div><h4>الدعم</h4><a href="https://wa.me/${K.WHATSAPP}" target="_blank" rel="noopener">واتساب: <span class="ltr">${K.WHATSAPP_DISPLAY}</span></a><a href="mailto:${K.EMAIL}"><span class="ltr">${K.EMAIL}</span></a></div>
    </div><div class="wrap seller" style="margin-top:20px">© ${new Date().getFullYear()} Know UAV · ${K.SELLER || ''} · وثيقة العمل الحر رقم <span class="ltr">${K.FREELANCE_NO || ''}</span> · ${K.CITY || ''}، المملكة العربية السعودية</div>`;
    document.body.appendChild(f);
    const wa = document.createElement('a'); wa.className = 'wa'; wa.href = 'https://wa.me/' + K.WHATSAPP; wa.target = '_blank'; wa.rel = 'noopener';
    wa.setAttribute('aria-label', 'تواصل عبر واتساب'); wa.innerHTML = waIcon; document.body.appendChild(wa);
  };
})();
