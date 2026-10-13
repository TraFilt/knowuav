// Know UAV — shared helpers: supabase client, header/footer, toast
(function(){
  const K = window.KU;
  window.sb = window.supabase.createClient(K.SUPABASE_URL, K.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
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
  const waIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>';
  window.renderFooter = () => {
    const f = document.createElement('footer'); f.className = 'site';
    f.innerHTML = `<div class="wrap cols">
      <div><img src="/assets/logo.png" alt="Know UAV"><div>منصة تعليمية مستقلة لتعلّم أساسيات تشغيل الطائرات بدون طيار، بدروس عربية ومحاكي طيران.</div></div>
      <div><h4>الموقع</h4><a href="/about">من نحن</a><a href="/privacy">سياسة الخصوصية</a><a href="/terms">الشروط والأحكام</a><a href="/refund">سياسة الاسترجاع</a></div>
      <div><h4>الدعم</h4><a href="https://wa.me/${K.WHATSAPP}" target="_blank" rel="noopener">واتساب: <span class="ltr">${K.WHATSAPP_DISPLAY}</span></a><a href="mailto:${K.EMAIL}"><span class="ltr">${K.EMAIL}</span></a></div>
    </div><div class="wrap" style="margin-top:20px">© ${new Date().getFullYear()} Know UAV</div>`;
    document.body.appendChild(f);
    const wa = document.createElement('a'); wa.className = 'wa'; wa.href = 'https://wa.me/' + K.WHATSAPP; wa.target = '_blank'; wa.rel = 'noopener';
    wa.setAttribute('aria-label', 'تواصل عبر واتساب'); wa.innerHTML = waIcon; document.body.appendChild(wa);
  };
})();
