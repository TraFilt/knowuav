// Know UAV — app logic: auth, subscription, lessons, quizzes, simulator, glossary, account
(function(){
const K = window.KU;
const S = { session:null, user:null, profile:null, settings:{}, catalog:[], levels:[], progress:{}, lessons:{}, gloss:null };
const access = () => !!(S.profile && !S.profile.blocked && S.profile.active_until && new Date(S.profile.active_until) > new Date());
const fmtDate = d => new Date(d).toLocaleDateString('ar-SA-u-ca-gregory', {year:'numeric', month:'long', day:'numeric'});
let player = null, quizTimer = null;

// ---------------- boot ----------------
// NOTE: never await Supabase calls inside onAuthStateChange — it holds the auth lock and deadlocks. Defer with setTimeout.
let loading = null;
// password-recovery / email links: implicit flow puts tokens (or an error) in the URL hash
const URLX = location.hash + '&' + location.search;
let recovering = /type=recovery/.test(URLX);
const LINK_ERR = /error_code=|[#&?]error=/.test(URLX) ? (/otp_expired|expired/i.test(URLX) ? 'expired' : 'bad') : '';
function showReset(){ recovering = true; $('#boot').hidden = true; $('#nav').hidden = true; show('reset'); setTimeout(() => $('#rs-pass') && $('#rs-pass').focus(), 50); }
function start(session){
  if(loading) return loading;
  S.session = session; S.user = session.user;
  loading = (async () => {
    try { await loadUser(); }
    catch(e){ console.error(e); toast('تعذّر تحميل بياناتك. حدّث الصفحة.', 1); }
    $('#boot').hidden = true; route();
    setTimeout(() => { if(!tuwaiqNote()) welcome(); }, 400);
  })();
  return loading;
}
sb.auth.onAuthStateChange((ev, session) => {
  setTimeout(() => {
    if(ev === 'PASSWORD_RECOVERY'){ S.session = session; showReset(); return; }
    if(recovering) return;
    if((ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION') && session) start(session);
    if(ev === 'SIGNED_OUT' && S.user){ location.href = '/'; }
  }, 0);
});
(async function boot(){
  let session = null;
  try { const { data } = await Promise.race([sb.auth.getSession(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))]); session = data.session; }
  catch(e){ console.error(e); }
  if(session && recovering){ S.session = session; showReset(); return; }
  if(!session){
    $('#boot').hidden = true;
    if(LINK_ERR){
      recovering = false; history.replaceState(null, '', '/app#login'); showAuth('in');
      $('#au-err').style.color = '';
      $('#au-err').textContent = LINK_ERR === 'expired' ? 'الرابط انتهت صلاحيته أو استُخدم قبل. اكتب بريدك واضغط «نسيت كلمة المرور» ويوصلك رابط جديد.' : 'الرابط غير صالح. اكتب بريدك واضغط «نسيت كلمة المرور» ويوصلك رابط جديد.';
      return;
    }
    if(recovering){ recovering = false; history.replaceState(null, '', '/app#login'); showAuth('in'); $('#au-err').textContent = 'الرابط انتهت صلاحيته. اطلب رابطاً جديداً من «نسيت كلمة المرور».'; return; }
    if(!S.user) showAuth(location.hash === '#login' ? 'in' : 'up'); return;
  }
  start(session);
})();
addEventListener('hashchange', () => { if(recovering) return; if(S.user) route(); else showAuth(location.hash === '#login' ? 'in' : 'up'); });

async function loadUser(){
  $('#nav').hidden = false;
  const uid = S.user.id;
  const [p, st, cat, lv, pr, ss] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
    sb.from('app_settings').select('key,value'),
    sb.rpc('lesson_catalog'),
    sb.from('levels').select('*').order('id'),
    sb.from('progress').select('lesson_id,score,total'),
    sb.from('sim_scores').select('mission,best_time')
  ]);
  S.profile = p.data || { id: uid, email: S.user.email };
  S.settings = Object.fromEntries((st.data || []).map(r => [r.key, r.value]));
  S.catalog = cat.data || [];
  S.levels = lv.data || [];
  S.progress = Object.fromEntries((pr.data || []).map(r => [r.lesson_id, r]));
  window.SIM_BEST = Object.fromEntries((ss.data || []).map(r => [r.mission, r.best_time]));
  $('#nav-admin').hidden = !S.profile.is_admin;
  navAvatar();
  if(cat.error) console.error(cat.error);
}
async function refreshProfile(){ const { data } = await sb.from('profiles').select('*').eq('id', S.user.id).maybeSingle(); if(data) S.profile = data; }

window.onSimBest = async (mission, t) => {
  if(!S.user) return;
  await sb.from('sim_scores').upsert({ user_id: S.user.id, mission, best_time: t, updated_at: new Date().toISOString() });
  const rows = await loadBoard(mission);
  const me = rows && rows.find(r => r.is_me);
  const box = document.getElementById('overbox');
  if(me && box && !$('#over').hidden && !box.querySelector('.rankline'))
    box.querySelector('h3')?.insertAdjacentHTML('afterend', `<p class="rankline">🏆 ترتيبك <b>#${AR(me.rank)}</b> من ${AR(me.total)} طيّار${me.rank <= 3 ? ' · ممتاز!' : ''}</p>`);
};

// ---------------- leaderboard + avatars ----------------
const MNAME = { hover:'الإقلاع والتحويم', box:'المربع', gates:'البوابات', land:'الهبوط الدقيق', wind:'تحويم مع رياح', rth:'العودة ببطارية منخفضة', slalom:'التعرّج بين الأعمدة', orbit:'الدوران حول البرج', low:'الممر المنخفض', pads:'الهبوط على ثلاث منصات', night:'البوابات الليلية', coins:'المبنى الكبير: اجمع الكرات' };
function avatar(url, name, size = 36){
  const n = String(name || '؟').trim().charAt(0) || '؟';
  return url ? `<img class="ava" src="${esc(url)}" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px" loading="lazy">`
             : `<span class="ava ph" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.45)}px">${esc(n)}</span>`;
}
function navAvatar(){
  const a = document.querySelector('#nav a[data-r="account"]'); if(!a || !S.profile) return;
  a.innerHTML = `${avatar(S.profile.avatar_url, S.profile.full_name || S.user?.email, 22)}<span>حسابي</span>`; a.classList.add('nav-me');
}
let boardMission = null, boardSeq = 0;
async function loadBoard(mission){
  boardMission = mission; const el = document.getElementById('board'); const seq = ++boardSeq;
  if(!el) return null;
  if(!MNAME[mission]){ el.innerHTML = '<p class="note">الطيران الحر بدون ترتيب. اختر مهمة لتشوف لوحة الصدارة.</p>'; return null; }
  el.innerHTML = '<p class="note">جارٍ التحميل…</p>';
  const { data, error } = await sb.rpc('sim_leaderboard', { p_mission: mission, p_limit: 10 });
  if(seq !== boardSeq) return data;
  if(error){ el.innerHTML = '<p class="note">لوحة الصدارة غير متاحة الآن.</p>'; return null; }
  if(!data || !data.length){ el.innerHTML = `<p class="note">ما أحد أنجز «${MNAME[mission]}» للحين. كن الأول! 🥇</p>`; return data; }
  const medal = r => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : AR(r);
  el.innerHTML = `<ol class="lb">${data.map(r => `<li class="${r.is_me ? 'me' : ''}${r.rank > 10 ? ' gap' : ''}"><span class="rk">${medal(Number(r.rank))}</span>${avatar(r.avatar_url, r.name, 30)}<span class="nm">${esc(r.name)}${r.is_me ? ' <small>(أنت)</small>' : ''}</span><span class="tm">${Number(r.best_time).toFixed(1)} ث</span></li>`).join('')}</ol>
    <p class="note lbn">${AR(data[0].total)} طيّار في هذي المهمة${S.profile && !S.profile.avatar_url ? ' · <a href="#account">أضف صورتك</a>' : ''}</p>`;
  return data;
}
window.onSimMission = id => { if(document.getElementById('board')) loadBoard(id); };
async function squareImage(file, size = 256){
  const url = URL.createObjectURL(file);
  try{
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const s = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas'); c.width = c.height = size;
    c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
    let blob = await new Promise(r => c.toBlob(r, 'image/webp', .86));
    if(!blob || blob.type !== 'image/webp') blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .88));
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

// ---------------- Tuwaiq test announcement (shown once per user until the test is over) ----------------
function tuwaiqNote(){
  if(!S.user || recovering || Date.now() > Date.parse('2026-10-19T00:00:00+03:00')) return false;
  if((location.hash || '').startsWith('#exam')) return false;
  const k = 'ku_tw_note_' + S.user.id;
  try { if(localStorage.getItem(k)) return false; localStorage.setItem(k, '1'); } catch(e){ return false; }
  const d = document.createElement('div'); d.className = 'wel'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
  d.innerHTML = `<div class="wel-box"><button class="wel-x" aria-label="إغلاق">✕</button>
    <div class="wel-ic">🎯</div><h2>عندك اختبار قبول في الدرونات؟</h2>
    <p>جهّزنا لك تدريب على القدرات العامة في مجال الطائرات بدون طيار. <span class="note">(للتدريب فقط، وليس له علاقة باختبار طويق)</span></p>
    <a class="wel-opt" href="#exam"><span class="i">📝</span><span><b>تدريب على ٥ أقسام</b><small>١٠ أسئلة مجاناً من كل قسم · مع شرح الخطأ</small></span><span class="wel-go">←</span></a>
    <a class="wel-opt" href="#exam/mock"><span class="i">⏱️</span><span><b>اختبار تجريبي كامل</b><small>٦٠ سؤال في ٦٠ دقيقة مع نتيجة لكل قسم</small></span><span class="wel-go">←</span></a></div>`;
  d.onclick = e => { if(e.target === d || e.target.closest('.wel-x') || e.target.closest('.wel-opt')) d.remove(); };
  document.body.appendChild(d);
  return true;
}

// ---------------- first-visit welcome: two free ways in ----------------
function welcome(){
  if(!S.user || access() || (S.profile && S.profile.blocked) || recovering) return;
  if(Object.keys(S.progress || {}).length) return;
  const k = 'ku_welcome_' + S.user.id;
  try { if(localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch(e){ return; }
  const fl = (S.catalog || []).find(l => l.is_free) || { id: '1-1', title: 'الدرس الأول' };
  const d = document.createElement('div'); d.className = 'wel'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
  d.innerHTML = `<div class="wel-box"><button class="wel-x" aria-label="إغلاق">✕</button>
    <div class="wel-ic">🎉</div><h2>مبروك التسجيل!</h2><p>حسابك جاهز. ابدأ الحين بتجربة مجانية، اختر وحدة:</p>
    <a class="wel-opt" href="#sim/night"><span class="i">🎮</span><span><b>جرّب المحاكي</b><small>البوابات الليلية واجمع الكرات · مجاناً</small></span><span class="wel-go">←</span></a>
    <a class="wel-opt" href="#l/${esc(fl.id)}"><span class="i">📘</span><span><b>ادخل الدرس الأول</b><small>${esc(fl.title)} · مجاني</small></span><span class="wel-go">←</span></a></div>`;
  const close = () => d.remove();
  d.onclick = e => { if(e.target === d || e.target.closest('.wel-x') || e.target.closest('.wel-opt')) close(); };
  addEventListener('keydown', function esc_(e){ if(e.key === 'Escape'){ close(); removeEventListener('keydown', esc_); } });
  document.body.appendChild(d);
}

// ---------------- routing ----------------
function show(v){
  $$('.view').forEach(x => x.hidden = true);
  $('#v-' + v).hidden = false;
  const key = ({lesson:'home', final:'home', pay:'account'})[v] || v;
  $$('#nav a[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === key));
  if(v !== 'sim') window.Sim && Sim.leave();
  if(v !== 'lesson' && player){ player.destroy(); player = null; }
  if(v !== 'final') clearInterval(quizTimer);
  if(v !== 'exam' && window.KUTuwaiq) KUTuwaiq.stop();
  scrollTo(0, 0);
}
function route(){
  const h = (location.hash || '#home').slice(1);
  if(h === 'login' || h === 'signup' || h === '' || h === 'home') return vHome();
  if(h.startsWith('l/')) return vLesson(h.slice(2));
  if(h === 'final') return vFinal();
  if(h === 'pay') return vPay();
  if(h === 'account') return vAccount();
  if(h === 'glossary') return vGlossary();
  if(h === 'sim' || h.startsWith('sim/')) return vSim(h.slice(4));
  if(h === 'tuwaiq' || h.startsWith('tuwaiq/')){ location.replace('#exam' + h.slice(6)); return; }
  if(h === 'exam' || h.startsWith('exam/')){ show('exam'); return window.KUTuwaiq && KUTuwaiq.render($('#v-exam'), h.slice(5), { full: access(), price: priceHTML(S.settings) }); }
  vHome();
}

// ---------------- auth ----------------
let mode = 'up';
function showAuth(m){
  mode = m; show('auth'); $('#nav').hidden = true;
  $('#tab-up').classList.toggle('on', m === 'up'); $('#tab-in').classList.toggle('on', m === 'in');
  $('#au-title').textContent = m === 'up' ? 'أنشئ حسابك' : 'أهلاً من جديد';
  $('#au-sub').textContent = m === 'up' ? 'دقيقة واحدة وتبدأ. الدرس الأول مجاني.' : 'سجّل دخولك وكمّل من حيث وقفت.';
  $('#f-name').hidden = m !== 'up'; $('#au-forgot').hidden = m !== 'in';
  $('#au-go').textContent = m === 'up' ? 'إنشاء الحساب' : 'دخول';
  $('#au-pass').autocomplete = m === 'up' ? 'new-password' : 'current-password';
  $('#au-err').textContent = '';
}
if(!K.GOOGLE_ENABLED){ $('#g-btn').hidden = true; document.querySelector('.or').hidden = true; }
$('#tab-up').onclick = () => showAuth('up');
$('#tab-in').onclick = () => showAuth('in');
$('#g-btn').onclick = async () => {
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/app' } });
  if(error) $('#au-err').textContent = 'تعذّر الدخول بقوقل حالياً. جرّب البريد الإلكتروني.';
};
const AUTH_ERR = m => /Invalid login/i.test(m) ? 'البريد أو كلمة المرور غير صحيحة.' : /already registered|already exists/i.test(m) ? 'هذا البريد مسجّل مسبقاً. سجّل دخولك بدلاً من ذلك.' :
  /Email not confirmed/i.test(m) ? 'أكّد بريدك من الرسالة التي وصلتك ثم سجّل الدخول.' : /Password should be/i.test(m) ? 'كلمة المرور قصيرة. استخدم ٦ أحرف على الأقل.' : /rate limit/i.test(m) ? 'محاولات كثيرة. انتظر دقيقة ثم حاول.' : 'حدث خطأ: ' + m;
$('#au-form').onsubmit = async e => {
  e.preventDefault();
  const email = $('#au-email').value.trim(), password = $('#au-pass').value, name = $('#au-name').value.trim();
  if(!/^\S+@\S+\.\S+$/.test(email)) return $('#au-err').textContent = 'اكتب بريداً إلكترونياً صحيحاً.';
  if(password.length < 6) return $('#au-err').textContent = 'كلمة المرور ٦ أحرف على الأقل.';
  const b = $('#au-go'); b.disabled = true; $('#au-err').textContent = '';
  try {
    if(mode === 'up'){
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: location.origin + '/app' } });
      if(error) throw error;
      if(!data.session){ $('#au-err').style.color = 'var(--ok)'; $('#au-err').textContent = 'أرسلنا لك رابط تأكيد على بريدك. افتحه ثم سجّل الدخول.'; return; }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if(error) throw error;
    }
  } catch(err){ $('#au-err').style.color = ''; $('#au-err').textContent = AUTH_ERR(err.message || String(err)); }
  finally { b.disabled = false; }
};
$('#au-forgot').onclick = async () => {
  const email = $('#au-email').value.trim();
  if(!email) return $('#au-err').textContent = 'اكتب بريدك أولاً ثم اضغط «نسيت كلمة المرور».';
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/app' });
  $('#au-err').style.color = error ? '' : 'var(--ok)';
  $('#au-err').textContent = error ? AUTH_ERR(error.message) : 'أرسلنا رابط تغيير كلمة المرور إلى بريدك.';
};
$('#rs-form').onsubmit = async e => {
  e.preventDefault();
  const pw = $('#rs-pass').value;
  if(pw.length < 6) return $('#rs-err').textContent = 'كلمة المرور لازم تكون ٦ أحرف أو أكثر.';
  const { error } = await sb.auth.updateUser({ password: pw });
  if(error) return $('#rs-err').textContent = /session|JWT|expired/i.test(error.message) ? 'انتهت صلاحية الرابط. اطلب رابطاً جديداً من «نسيت كلمة المرور».' : AUTH_ERR(error.message);
  recovering = false; history.replaceState(null, '', '/app#home'); toast('تم تغيير كلمة المرور ✅');
  const { data } = await sb.auth.getSession(); if(data.session) start(data.session); else showAuth('in');
};

// ---------------- home ----------------
function lessonState(l){
  const p = S.progress[l.id];
  if(p && p.total && p.score / p.total >= .66) return 'done';
  if(access() || l.is_free) return 'open';
  return 'lock';
}
function statusCard(){
  const pr = S.profile;
  if(pr.blocked) return `<div class="card status blocked"><div><h2>تم إيقاف حسابك</h2><p>تم إيقاف الحساب بسبب مشكلة في إيصال التحويل. تواصل معنا لحل المشكلة.</p></div><a class="btn" href="mailto:${K.EMAIL}">راسلنا بالإيميل</a></div>`;
  if(access()){
    const done = S.catalog.filter(l => lessonState(l) === 'done').length, n = S.catalog.length || 1;
    return `<div class="card status"><div><div class="eyebrow">حسابك مفعّل</div><h2>أهلاً ${esc((pr.full_name||'').split(' ')[0] || '')}</h2><p>كل الدروس والاختبارات والمحاكي مفتوحة لك.</p></div>
      <div class="prog-ring"><svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="#26312a" stroke-width="6"/><circle cx="32" cy="32" r="27" fill="none" stroke="#d8bf86" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(done/n*169.6).toFixed(1)} 170" transform="rotate(-90 32 32)"/></svg><div><b>${AR(done)}/${AR(n)}</b><div class="note">دروس مكتملة</div></div></div></div>`;
  }
  return `<div class="card status pay"><div><div class="eyebrow">حسابك مجاني</div><h2>افتح كل الدروس والمحاكي</h2><p>فعّل حسابك بـ ${priceHTML(S.settings)} لمرة واحدة فقط. تحوّل، ترفع الإيصال، ويتفعّل فوراً.</p></div><a class="btn pri" href="#pay">فعّل حسابك</a></div>`;
}
function vHome(){
  show('home');
  const next = S.catalog.find(l => lessonState(l) === 'open') || S.catalog[0];
  const el = $('#v-home');
  el.innerHTML = statusCard() +
    `<div class="quick">
      ${next ? `<a class="card" href="#l/${next.id}"><span class="eyebrow">تابع</span><b>${esc(next.title)}</b><span>${AR(next.mins)} دقائق</span></a>` : ''}
      <a class="card" href="#sim"><span class="eyebrow">Flight Trainer</span><b>المحاكي</b><span>${access() ? AR(Object.keys(window.SIM_BEST||{}).length) + ' من ' + AR((window.MISSIONS||[]).filter(m=>m.par).length || 11) + ' مهمة منجزة' : 'تمرين مجاني متاح لك'}</span></a>
      <a class="card" href="#final"><span class="eyebrow">اختبار شامل</span><b>اختبر نفسك</b><span>${S.progress.final ? 'أفضل نتيجة ' + AR(S.progress.final.score) + '/' + AR(S.progress.final.total) : '١٥ سؤالاً · ١٠ دقائق'}</span></a>
    </div>
    <div class="levels">${S.levels.map(lv => {
      const ls = S.catalog.filter(l => l.level === lv.id);
      return `<div><div class="level-h"><span class="n">0${lv.id}</span><h3>${esc(lv.title)}</h3><span class="en">${esc(lv.en)}</span><p>${esc(lv.descr)}</p></div>
        <div class="lessons">${ls.map(l => { const st = lessonState(l), p = S.progress[l.id];
          return `<a class="lcard ${st==='lock'?'locked':''}" href="#l/${l.id}"><div class="top"><span>${AR(l.level)}.${AR(l.ord)} · ${AR(l.mins)} د</span>${st==='done' ? `<span class="chip ok">✓ ${AR(p.score)}/${AR(p.total)}</span>` : l.is_free && !access() ? '<span class="chip ok">مجاني</span>' : st==='lock' ? '<span class="chip warn">🔒 يحتاج تفعيل</span>' : ''}</div><h4>${esc(l.title)}</h4><div class="hook">${esc(l.hook||'')}</div></a>`; }).join('')}</div></div>`;
    }).join('')}</div>`;
}

// ---------------- lesson ----------------
function paywall(title){
  return `<div class="card paywall"><div class="eyebrow">يحتاج تفعيل الحساب</div><h2>${title || 'هذا المحتوى للحسابات المفعّلة'}</h2><p>تفعيل حسابك بـ ${priceHTML(S.settings)} لمرة واحدة يفتح لك كل الدروس والاختبارات والمحاكي والمصطلحات.</p><div class="row" style="justify-content:center"><a class="btn pri" href="#pay">فعّل حسابك</a><a class="btn" href="#home">الرجوع للدروس</a></div></div>`;
}
async function getLesson(id){
  if(S.lessons[id]) return S.lessons[id];
  const { data, error } = await sb.from('lessons').select('*').eq('id', id).maybeSingle();
  if(error) console.error(error);
  if(data) S.lessons[id] = data;
  return data;
}
function renderBody(body){
  return (body || []).map(([t, v]) => {
    if(t === 'p') return `<p>${v}</p>`;
    if(t === 'h') return `<h2>${v}</h2>`;
    if(t === 'ul') return `<ul>${v.map(x => `<li>${x}</li>`).join('')}</ul>`;
    if(t === 'tip') return `<div class="call"><b class="lbl">TIP · نصيحة</b>${v}</div>`;
    if(t === 'warn') return `<div class="call warn"><b class="lbl">CAUTION · تنبيه</b>${v}</div>`;
    if(t === 'w') return `<div class="wg" data-w="${v}"></div>`;
    if(t === 'cta') return v === 'sim' ? '<div class="row" style="margin:16px 0"><a class="btn" href="#sim">جرّبها في المحاكي</a></div>' : '<div class="row" style="margin:16px 0"><a class="btn" href="#final">ابدأ الاختبار الشامل</a></div>';
    return '';
  }).join('');
}
async function vLesson(id){
  if(player){ player.destroy(); player = null; }
  show('lesson');
  const el = $('#v-lesson'), meta = S.catalog.find(l => l.id === id);
  if(!meta){ el.innerHTML = '<div class="loading">الدرس غير موجود.</div>'; return; }
  if(!meta.is_free && !access()){ el.innerHTML = `<div class="crumbs"><a href="#home">الدروس</a></div>` + paywall(esc(meta.title)); return; }
  el.innerHTML = '<div class="loading">جارٍ تحميل الدرس…</div>';
  const l = await getLesson(id);
  if(!l){ el.innerHTML = paywall(esc(meta.title)); return; }
  const lv = S.levels.find(x => x.id === l.level) || {}, sib = S.catalog.filter(x => x.level === l.level);
  const idx = S.catalog.findIndex(x => x.id === id), prev = S.catalog[idx-1], next = S.catalog[idx+1];
  el.innerHTML = `<div class="lesson"><article class="sheet">
    <div class="crumbs"><a href="#home">الدروس</a> / ${esc(lv.title||'')}</div>
    <div class="eyebrow">المستوى ${AR(l.level)} · درس ${AR(l.ord)} من ${AR(sib.length)} · ${AR(l.mins)} دقائق</div>
    <h1>${esc(l.title)}</h1><p class="hookline">${esc(l.hook||'')}</p>
    <div id="mp"></div>
    ${renderBody(l.body)}
    ${meta.is_free ? `<a class="card sim-cta" href="#sim"><span class="ic">🎮</span><div><div class="eyebrow">تمرين عملي مجاني</div><b>جرّب المحاكي مجاناً</b><p>طِر في «البوابات الليلية» واجمع الكرات داخل المبنى الكبير، باللمس أو الكيبورد أو يد التحكم.</p></div><span class="go">ابدأ ←</span></a>` : ''}
    <section class="quiz" id="quiz"></section>
    <div class="pager">${prev ? `<a class="btn sm" href="#l/${prev.id}">→ ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="btn sm" href="#l/${next.id}">${esc(next.title)} ←</a>` : '<a class="btn sm" href="#final">الاختبار الشامل ←</a>'}</div>
  </article>
  <nav class="side"><div class="eyebrow">${esc(lv.title||'')}</div>${sib.map(x => `<a href="#l/${x.id}" class="${x.id===id?'on':''}"><span>${esc(x.title)}</span>${lessonState(x)==='done'?'<span style="color:var(--ok)">✓</span>':lessonState(x)==='lock'?'<span>🔒</span>':''}</a>`).join('')}</nav></div>`;
  if(player){ player.destroy(); player = null; }
  player = MotionPlayer($('#mp'), l);
  el.querySelectorAll('[data-w]').forEach(w => W[w.dataset.w] && W[w.dataset.w](w));
  runQuiz($('#quiz'), l.quiz || [], {
    title: 'اختبار الدرس',
    done: async (score, total) => {
      const prevP = S.progress[id];
      if(!prevP || score >= prevP.score){
        S.progress[id] = { lesson_id: id, score, total };
        await sb.from('progress').upsert({ user_id: S.user.id, lesson_id: id, score, total, updated_at: new Date().toISOString() });
      }
    },
    next: next ? { href: '#l/' + next.id, label: 'الدرس التالي' } : { href: '#final', label: 'الاختبار الشامل' }
  });
}

// ---------------- quiz engine ----------------
function runQuiz(el, qs, o){
  let i = 0, score = 0;
  const r = () => {
    if(i >= qs.length){
      const pct = Math.round(score / qs.length * 100), pass = pct >= 66;
      o.done && o.done(score, qs.length);
      el.innerHTML = `<div class="quiz-h"><h2>${o.title}</h2></div><div class="qcard"><div class="score">${AR(score)}/${AR(qs.length)}</div>
        <p>${pass ? (pct === 100 ? 'ممتاز! إجابات كاملة.' : 'أحسنت، اجتزت الاختبار.') : 'تحتاج مراجعة الدرس مرة ثانية. شاهد المقطع وأعد المحاولة.'}</p>
        <div class="row"><button class="btn" data-again>أعد الاختبار</button>${o.next ? `<a class="btn pri" href="${o.next.href}">${o.next.label}</a>` : ''}</div></div>`;
      el.querySelector('[data-again]').onclick = () => { i = 0; score = 0; r(); };
      return;
    }
    const q = qs[i];
    el.innerHTML = `<div class="quiz-h"><h2>${o.title}</h2><span class="mono" style="color:var(--muted)">${o.timer ? '<span id="qz-t">10:00</span> · ' : ''}${AR(i+1)}/${AR(qs.length)}</span></div>
      <div class="meter" style="margin-bottom:12px"><i style="width:${i/qs.length*100}%"></i></div>
      <div class="qcard"><div class="qn">سؤال ${AR(i+1)}</div><h3>${q.q}</h3><div class="opts">${q.o.map((x,j) => `<button data-j="${j}">${x}</button>`).join('')}</div><div class="why" hidden></div>
      <div class="row" style="margin-top:14px"><button class="btn pri" data-next hidden>${i < qs.length-1 ? 'السؤال التالي' : 'عرض النتيجة'}</button></div></div>`;
    el.querySelectorAll('[data-j]').forEach(b => b.onclick = () => {
      const j = +b.dataset.j; if(j === q.a) score++;
      el.querySelectorAll('[data-j]').forEach(x => { x.disabled = true; if(+x.dataset.j === q.a) x.classList.add('r'); });
      if(j !== q.a) b.classList.add('w');
      const w = el.querySelector('.why'); w.hidden = false; w.textContent = (j === q.a ? 'إجابة صحيحة. ' : 'الإجابة الصحيحة: ' + q.o[q.a] + '. ') + q.w;
      el.querySelector('[data-next]').hidden = false;
    });
    el.querySelector('[data-next]').onclick = () => { i++; r(); };
  };
  r();
  return { finish(){ i = qs.length; r(); } };
}

// ---------------- final exam ----------------
async function vFinal(){
  show('final');
  const el = $('#v-final');
  if(!access()){ el.innerHTML = paywall('الاختبار الشامل للحسابات المفعّلة'); return; }
  el.innerHTML = '<div class="loading">جارٍ تجهيز الأسئلة…</div>';
  const { data } = await sb.from('lessons').select('quiz');
  const pool = (data || []).flatMap(r => r.quiz || []).map(q => [Math.random(), q]).sort((a,b) => a[0]-b[0]).slice(0, 15).map(x => x[1]);
  el.innerHTML = `<div class="crumbs"><a href="#home">الدروس</a> / الاختبار الشامل</div><div class="eyebrow">١٥ سؤالاً عشوائياً من كل الدروس</div><div id="fq"></div>`;
  const t0 = Date.now();
  const q = runQuiz($('#fq'), pool, { title: 'الاختبار الشامل', timer: true,
    done: async (score, total) => { clearInterval(quizTimer); const p = S.progress.final; if(!p || score >= p.score){ S.progress.final = { lesson_id:'final', score, total }; await sb.from('progress').upsert({ user_id:S.user.id, lesson_id:'final', score, total, updated_at:new Date().toISOString() }); } },
    next: { href: '#sim', label: 'تدرّب في المحاكي' } });
  clearInterval(quizTimer);
  quizTimer = setInterval(() => { const left = 600 - Math.floor((Date.now()-t0)/1000), t = $('#qz-t');
    if(t) t.textContent = String(Math.floor(Math.max(0,left)/60)).padStart(2,'0') + ':' + String(Math.max(0,left)%60).padStart(2,'0');
    if(left <= 0){ clearInterval(quizTimer); q.finish(); } }, 1000);
}

// ---------------- simulator ----------------
function vSim(want){
  show('sim');
  const ok = access();
  $('#sim-wrap').hidden = false; $('#sim-lock').hidden = true;
  $('#pc-tip').hidden = !matchMedia('(pointer:coarse)').matches;
  const fr = $('#sim-free'); fr.hidden = ok;
  if(!ok) fr.innerHTML = `<span>🎁</span><p><b>مجاناً لك:</b> «البوابات الليلية» و«المبنى الكبير: اجمع الكرات» و«الطيران الحر». باقي المهام تنفتح مع تفعيل الحساب بـ ${priceHTML(S.settings)} لمرة واحدة.</p><a class="btn sm pri" href="#pay">فعّل حسابك</a>`;
  Sim.setLocked(!ok);
  Sim.enter();
  if(want && Sim.pickMission) Sim.pickMission(want);
  loadBoard(boardMission || 'hover');
}

// ---------------- glossary ----------------
async function vGlossary(){
  show('glossary');
  const el = $('#v-glossary');
  if(!access()){ el.innerHTML = paywall('المصطلحات للحسابات المفعّلة'); return; }
  if(!S.gloss){ el.innerHTML = '<div class="loading">جارٍ التحميل…</div>'; const { data } = await sb.from('glossary').select('term,ar,def').order('id'); S.gloss = data || []; }
  el.innerHTML = `<div class="sec-h"><div><div class="eyebrow">English for Operators</div><h2>المصطلحات</h2><p>${AR(S.gloss.length)} مصطلحاً. استخدم وضع البطاقات لتختبر نفسك.</p></div></div>
    <div class="gl-tools"><input id="gl-q" type="search" placeholder="ابحث بالعربي أو الإنجليزي" aria-label="بحث"><div class="seg" id="gl-m"><button data-m="list" class="on">قائمة</button><button data-m="cards">بطاقات</button></div></div><div class="gl" id="gl"></div>`;
  const g = $('#gl');
  const draw = () => { const q = $('#gl-q').value.trim().toLowerCase(); g.innerHTML = S.gloss.filter(t => !q || (t.term+' '+t.ar+' '+t.def).toLowerCase().includes(q)).map(t => `<button class="term"><span class="e">${esc(t.term)}</span><span class="a">${esc(t.ar)}</span><span class="d">${esc(t.def)}</span></button>`).join(''); };
  $('#gl-q').oninput = draw; draw();
  $('#gl-m').onclick = e => { const b = e.target.closest('button'); if(!b) return; $$('#gl-m button').forEach(x => x.classList.toggle('on', x === b)); g.classList.toggle('cards', b.dataset.m === 'cards'); g.querySelectorAll('.term').forEach(t => t.classList.remove('flip')); };
  g.onclick = e => { const t = e.target.closest('.term'); if(t && g.classList.contains('cards')) t.classList.toggle('flip'); };
}

// ---------------- payment ----------------
function copyBtn(v){ return `<button class="btn sm" data-copy="${esc(v)}">نسخ</button>`; }
function vPay(){
  show('pay');
  const el = $('#v-pay'), st = S.settings, price = priceInfo(st).now;
  if(S.profile.blocked){ el.innerHTML = statusCard(); return; }
  if(access()){ el.innerHTML = `<div class="card status"><div><div class="eyebrow">حسابك مفعّل</div><h2>كل شي مفتوح لك</h2><p>حسابك مفعّل، وكل الدروس والاختبارات والمحاكي متاحة لك.</p></div><a class="btn pri" href="#home">إلى الدروس</a></div>`; return; }
  const rows = [['البنك', st.bank_name], ['اسم صاحب الحساب', st.account_name], ['الآيبان IBAN', st.iban], ['STC Pay', st.stcpay]].filter(r => r[1]);
  el.innerHTML = `<div class="sec-h"><div><div class="eyebrow">تفعيل الحساب</div><h2>فعّل حسابك بـ <span id="pay-ph">${priceHTML(st)}</span></h2><p>دفعة واحدة فقط. حوّل المبلغ، ارفع الإيصال، ويتفعّل حسابك مباشرة.</p></div></div>
  <div class="pay">
    <div class="card bank"><h3 style="font-size:18px;margin-bottom:6px">١ · حوّل <span id="pay-amt">${AR(price)}</span> ريال</h3>
      <div class="promo" id="promo"><button type="button" class="promo-t" id="promo-t">عندك كود خصم؟</button>
        <div class="promo-f" id="promo-f" hidden><input id="promo-in" dir="ltr" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="30" placeholder="CODE"><button type="button" class="btn sm" id="promo-go">تطبيق</button></div>
        <div class="promo-m" id="promo-m"></div></div>
      ${rows.length ? rows.map(([k,v]) => `<div class="kv"><span>${k}</span><b>${esc(v)}</b>${copyBtn(v)}</div>`).join('') : `<p style="color:var(--muted)">بيانات التحويل تُضاف قريباً. راسلنا على <b class="mono" dir="ltr">${K.EMAIL}</b> وسنرسلها لك فوراً.</p>`}
      ${st.pay_note ? `<p class="note">${esc(st.pay_note)}</p>` : ''}
    </div>
    <form class="card" id="pay-form" style="display:grid;gap:14px" novalidate>
      <h3 style="font-size:18px">٢ · ارفع الإيصال</h3>
      <label class="field">اسم المحوِّل كما يظهر في الإيصال<input id="pay-name" autocomplete="name" required></label>
      <label class="drop" id="drop" for="pay-file"><input id="pay-file" type="file" accept="image/*,application/pdf" hidden><div id="drop-t">اضغط لاختيار صورة الإيصال أو ملف PDF<br><span class="note">حتى ٥ ميجابايت</span></div></label>
      <label class="agree"><input type="checkbox" id="pay-agree"><span>أقرّ بأن الإيصال حقيقي ويخص هذا التحويل، وأوافق على <a href="/terms" target="_blank">الشروط</a> وعلى أن <a href="/refund" target="_blank">المبلغ غير قابل للاسترجاع</a>. الإيصال غير الصحيح يؤدي لإيقاف الحساب.</span></label>
      <div class="err" id="pay-err"></div>
      <button class="btn pri block" id="pay-go" type="submit" disabled>فعّل حسابك</button>
    </form>
  </div>`;
  el.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); toast('تم النسخ'); } catch(e){ toast('انسخه يدوياً'); } });
  let file = null, promo = null;
  $('#promo-t').onclick = () => { $('#promo-f').hidden = false; $('#promo-t').hidden = true; $('#promo-in').focus(); };
  const applyPromo = async () => {
    const code = $('#promo-in').value.trim().toUpperCase(), m = $('#promo-m'), b = $('#promo-go');
    if(!code){ m.className = 'promo-m bad'; m.textContent = 'اكتب الكود.'; return; }
    b.disabled = true; m.className = 'promo-m'; m.textContent = 'جارٍ التحقق…';
    const { data, error } = await sb.rpc('check_promo', { p_code: code });
    b.disabled = false;
    if(error || data == null){ promo = null; m.className = 'promo-m bad'; m.textContent = error ? 'تعذّر التحقق، جرّب مرة ثانية.' : 'الكود غير صحيح أو منتهي.'; $('#pay-amt').textContent = AR(price); $('#pay-ph').innerHTML = priceHTML(st); return; }
    const np = +data; promo = { code, price: np };
    $('#pay-amt').textContent = AR(np);
    $('#pay-ph').innerHTML = np < price ? `${AR(np)} <s class="was">${AR(price)}</s> ريال` : priceHTML(st);
    m.className = 'promo-m ok'; m.innerHTML = np < price ? `تم تطبيق الكود <b dir="ltr">${esc(code)}</b>. المبلغ صار ${AR(np)} ريال.` : `الكود <b dir="ltr">${esc(code)}</b> صحيح، وسعرك الحالي أقل منه أو يساويه.`;
    $('#promo-in').disabled = true; b.textContent = 'إلغاء'; b.onclick = clearPromo;
  };
  const clearPromo = () => { promo = null; $('#promo-in').disabled = false; $('#promo-in').value = ''; $('#promo-m').textContent = ''; $('#pay-amt').textContent = AR(price); $('#pay-ph').innerHTML = priceHTML(st); const b = $('#promo-go'); b.textContent = 'تطبيق'; b.onclick = applyPromo; };
  $('#promo-go').onclick = applyPromo;
  $('#promo-in').onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); applyPromo(); } };
  const upd = () => { $('#pay-go').disabled = !(file && $('#pay-agree').checked && $('#pay-name').value.trim()); };
  $('#pay-file').onchange = e => {
    file = e.target.files[0] || null; $('#pay-err').textContent = '';
    if(file && file.size > 5*1024*1024){ $('#pay-err').textContent = 'حجم الملف أكبر من ٥ ميجابايت.'; file = null; }
    const d = $('#drop'); d.classList.toggle('on', !!file);
    $('#drop-t').innerHTML = file ? `<b>${esc(file.name)}</b>` + (file.type.startsWith('image/') ? `<br><img alt="معاينة الإيصال" src="${URL.createObjectURL(file)}">` : '') : 'اضغط لاختيار صورة الإيصال أو ملف PDF';
    upd();
  };
  $('#pay-agree').onchange = upd; $('#pay-name').oninput = upd;
  $('#pay-form').onsubmit = async e => {
    e.preventDefault(); if(!file) return;
    const b = $('#pay-go'); b.disabled = true; b.textContent = 'جارٍ الرفع…'; $('#pay-err').textContent = '';
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
      const path = `${S.user.id}/${Date.now()}.${ext}`;
      const up = await sb.storage.from('receipts').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
      if(up.error) throw up.error;
      const { error } = await sb.rpc('submit_receipt', Object.assign({ p_path: path, p_sender: $('#pay-name').value.trim() }, promo ? { p_code: promo.code } : {}));
      if(error) throw error;
      await refreshProfile();
      toast('تم تفعيل حسابك. بالتوفيق!');
      location.hash = '#home';
    } catch(err){
      const m = err.message || String(err);
      $('#pay-err').textContent = /blocked/.test(m) ? 'حسابك موقوف. تواصل مع الدعم.' : /already submitted/.test(m) ? 'رفعت إيصالاً قبل قليل. انتظر دقائق.' : /bad code/.test(m) ? 'كود الخصم انتهى أو ما عاد صالح. ألغِ الكود وارفع مرة ثانية.' : /mime|type/i.test(m) ? 'نوع الملف غير مدعوم. ارفع صورة أو PDF.' : 'تعذّر الرفع: ' + m;
      b.disabled = false; b.textContent = 'فعّل حسابك';
    }
  };
}

// ---------------- account ----------------
async function vAccount(){
  show('account');
  const el = $('#v-account'), pr = S.profile;
  const { data: pays } = await sb.from('payments').select('id,created_at,amount,status').order('created_at', { ascending: false });
  const stLbl = { pending: '<span class="chip">قيد المراجعة</span>', approved: '<span class="chip ok">مقبول</span>', rejected: '<span class="chip bad">مرفوض</span>' };
  el.innerHTML = `<div class="sec-h"><div><h2>حسابي</h2></div><button class="btn sm" id="logout">تسجيل خروج</button></div>
    ${statusCard()}
    <div class="pay">
      <div class="card" style="display:grid;gap:12px"><h3 style="font-size:18px">ملفك التعريفي</h3>
        <div class="prof">
          <label class="prof-ava" title="تغيير الصورة">${avatar(pr.avatar_url, pr.full_name || S.user.email, 84)}<span class="cam">📷</span><input type="file" id="ava-file" accept="image/*" hidden></label>
          <div style="flex:1;display:grid;gap:8px;min-width:0">
            <label class="field">الاسم الظاهر في لوحة الصدارة<input id="prof-name" maxlength="40" value="${esc(pr.full_name || '')}" placeholder="اسمك"></label>
            <div class="row" style="gap:8px"><button class="btn sm pri" id="prof-save" type="button">حفظ</button>${pr.avatar_url ? '<button class="btn sm" id="ava-del" type="button">حذف الصورة</button>' : ''}</div>
          </div>
        </div>
        <p class="note" style="margin:0">يظهر اسمك الأول وأول حرف من اسم العائلة مع صورتك في لوحة صدارة المحاكي. الصور غير اللائقة تُحذف.</p>
        <div><span class="note">البريد</span><div class="mono" dir="ltr" style="text-align:right">${esc(S.user.email)}</div></div>
        <div><span class="note">حالة الحساب</span><div>${access() ? 'مفعّل' : pr.blocked ? 'موقوف' : 'غير مفعّل'}</div></div>
      </div>
      <div class="card"><h3 style="font-size:18px;margin-bottom:8px">المدفوعات</h3>
        ${(pays && pays.length) ? `<div class="tbl-wrap"><table class="hist"><tr><th>التاريخ</th><th>المبلغ</th><th>الحالة</th></tr>${pays.map(p => `<tr><td>${fmtDate(p.created_at)}</td><td class="mono">${AR(p.amount ?? '')} ر.س</td><td>${stLbl[p.status]||''}</td></tr>`).join('')}</table></div>` : '<p class="note">لا توجد مدفوعات بعد.</p>'}
        <p class="note" style="margin-top:12px">للدعم: <span class="mono" dir="ltr">${K.EMAIL}</span></p>
      </div>
    </div>`;
  $('#logout').onclick = async () => { await sb.auth.signOut(); location.href = '/'; };
  const saveProf = async (avatarUrl) => {
    const { error } = await sb.rpc('set_my_profile', { p_name: $('#prof-name').value, p_avatar: avatarUrl });
    if(error){ toast(/bad avatar/.test(error.message) ? 'تعذّر حفظ الصورة.' : 'تعذّر الحفظ: ' + error.message, 1); return false; }
    await refreshProfile(); navAvatar(); return true;
  };
  $('#prof-save').onclick = async () => { if(await saveProf(null)){ toast('تم الحفظ'); vAccount(); } };
  const del = $('#ava-del'); if(del) del.onclick = async () => { if(await saveProf('')){ toast('تم حذف الصورة'); vAccount(); } };
  $('#ava-file').onchange = async e => {
    const f = e.target.files[0]; if(!f) return;
    if(!/^image\//.test(f.type)) return toast('اختر صورة', 1);
    try{
      toast('جارٍ رفع الصورة…');
      const blob = await squareImage(f);
      const path = `${S.user.id}/${Date.now()}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`;
      const up = await sb.storage.from('avatars').upload(path, blob, { contentType: blob.type, upsert: false });
      if(up.error) throw up.error;
      const url = `${K.SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
      if(await saveProf(url)){ toast('تم تحديث صورتك 👌'); vAccount(); }
    } catch(err){ toast('تعذّر رفع الصورة: ' + (err.message || err), 1); }
  };
}

renderFooter();
})();
