// Know UAV — Tuwaiq theory-test practice: section drills (instant feedback + why the pick was wrong)
// and a full mock exam (60 questions, 60 minutes, results by section). Data in tuwaiq-q.js.
(function(){
const AR = window.AR || (n => String(n));
const esc = window.esc || (s => String(s));
const shuffle = a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const KEY = 'ku_tw_best';
const best = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e){ return {}; } };
const saveBest = (id, pct) => { try { const b = best(); if(!(b[id] >= pct)){ b[id] = pct; localStorage.setItem(KEY, JSON.stringify(b)); } } catch(e){} };
const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// one question with its options shuffled; o[0] in the bank is the correct one
function prep(q, sec){
  const idx = shuffle([0, 1, 2, 3]);
  return { sec, q: q.q, x: q.x, o: idx.map(i => q.o[i]), t: idx.map(i => q.t[i] || ''), a: idx.indexOf(0) };
}

let timer = 0;
const stop = () => { clearInterval(timer); timer = 0; };

function home(el){
  stop();
  const S = window.TW_SECTIONS, b = best(), total = S.reduce((n, s) => n + s.qs.length, 0);
  el.innerHTML = `<div class="tw">
    <div class="tw-hero"><div class="eyebrow">تدريب مجاني</div><h1>تدرّب على اختبارات القبول في مجال الدرونات</h1>
      <p>${AR(total)} سؤال تدريبي في ٥ أقسام، مع شرح لكل إجابة وسبب الخطأ لو غلطت. وفي الآخر اختبار تجريبي: ٦٠ سؤال في ساعة.</p>
      <div class="tw-facts"><span>🔢 كمي ومنطق</span><span>🧭 مكاني</span><span>🔤 إنجليزي</span><span>🛩️ أساسيات الدرون</span><span>⚡ تركيز</span></div>
      <p class="note">أسئلة تدريبية من إعداد Know UAV على الأنواع الشائعة في اختبارات القبول والقدرات. وتذكّر: أغلب الاختبارات الرسمية تمنع أدوات الذكاء الاصطناعي وفتح تبويبات ثانية، فتدرّب هنا واعتمد على نفسك هناك.</p>
    </div>
    <a class="card tw-mock" href="#exam/mock"><span class="ic">🎯</span><div><b>اختبار تجريبي كامل</b><p>٦٠ سؤال من كل الأقسام، ٦٠ دقيقة، والنتيجة مفصّلة لكل قسم${b.mock != null ? ` · أفضل نتيجة ${AR(b.mock)}٪` : ''}</p></div><span class="go">ابدأ ←</span></a>
    <div class="tw-grid">${S.map(s => `<a class="card tw-sec" href="#exam/${s.id}"><div class="ic">${s.icon}</div><b>${esc(s.title)}</b><p>${esc(s.blurb)}</p>
      <div class="tw-meta"><span>${AR(s.qs.length)} سؤال</span>${b[s.id] != null ? `<span class="chip ${b[s.id] >= 80 ? 'ok' : b[s.id] >= 60 ? 'warn' : 'bad'}">أفضل ${AR(b[s.id])}٪</span>` : '<span class="chip">ابدأ</span>'}</div></a>`).join('')}</div>
    <p class="note" style="text-align:center">نصيحة: دقيقة لكل سؤال تقريباً. لو علقت في سؤال، تجاوزه وارجع له.</p>
  </div>`;
}

// section drill: one question at a time, 60 s each, instant feedback
function drill(el, sec){
  stop();
  const qs = shuffle(sec.qs).map(q => prep(q, sec.id));
  let i = 0, score = 0; const wrong = [];
  const show = () => {
    stop();
    if(i >= qs.length) return end();
    const q = qs[i]; let left = 60, done = false;
    el.innerHTML = `<div class="tw"><div class="crumbs"><a href="#exam">تدريب الاختبارات</a> / ${esc(sec.title)}</div>
      <div class="quiz-h"><h2>${sec.icon} ${esc(sec.title)}</h2><span class="mono" style="color:var(--muted)">${AR(i + 1)}/${AR(qs.length)} · ✓ ${AR(score)}</span></div>
      <div class="tw-time"><i id="tw-bar"></i><span id="tw-t" class="mono">1:00</span></div>
      <div class="qcard"><h3 ${sec.id === 'english' ? 'dir="ltr" style="text-align:left"' : ''}>${esc(q.q)}</h3>
        <div class="opts">${q.o.map((x, j) => `<button data-j="${j}" ${sec.id === 'english' && /^[\x00-\x7F]+$/.test(x) ? 'dir="ltr"' : ''}>${esc(x)}</button>`).join('')}</div>
        <div class="tw-fb" hidden></div>
        <div class="row" style="margin-top:14px"><button class="btn pri" data-next hidden>${i < qs.length - 1 ? 'السؤال التالي' : 'النتيجة'}</button></div></div></div>`;
    const bar = el.querySelector('#tw-bar'), tt = el.querySelector('#tw-t');
    const answer = j => {
      if(done) return; done = true; stop();
      const ok = j === q.a; if(ok) score++; else wrong.push({ q, j });
      el.querySelectorAll('[data-j]').forEach(b => { b.disabled = true; if(+b.dataset.j === q.a) b.classList.add('r'); });
      if(j >= 0 && !ok) el.querySelector(`[data-j="${j}"]`).classList.add('w');
      const fb = el.querySelector('.tw-fb'); fb.hidden = false; fb.className = 'tw-fb ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = ok ? `<b>✓ صح</b><p>${esc(q.x)}</p>`
        : `<b>${j < 0 ? '⏱️ انتهى الوقت' : '✗ غلط'}</b>${j >= 0 && q.t[j] ? `<p><span class="lbl">ليش غلط:</span> ${esc(q.t[j])}</p>` : ''}<p><span class="lbl">الصح:</span> ${esc(q.o[q.a])}</p><p><span class="lbl">الحل:</span> ${esc(q.x)}</p>`;
      el.querySelector('[data-next]').hidden = false; el.querySelector('[data-next]').focus();
    };
    el.querySelectorAll('[data-j]').forEach(b => b.onclick = () => answer(+b.dataset.j));
    el.querySelector('[data-next]').onclick = () => { i++; show(); };
    timer = setInterval(() => { left -= .25; bar.style.width = (left / 60 * 100) + '%'; bar.classList.toggle('low', left <= 15); tt.textContent = mmss(left); if(left <= 0) answer(-1); }, 250);
  };
  const end = () => {
    stop();
    const pct = Math.round(score / qs.length * 100); saveBest(sec.id, pct);
    el.innerHTML = `<div class="tw"><div class="crumbs"><a href="#exam">تدريب الاختبارات</a> / ${esc(sec.title)}</div>
      <div class="qcard tw-res"><div class="score">${AR(score)}/${AR(qs.length)}</div><p>${pct >= 80 ? 'ممتاز، جاهز لهذا القسم 💪' : pct >= 60 ? 'زين، راجع أخطاءك تحت وأعد القسم.' : 'يحتاج مراجعة. اقرأ الشروحات تحت وأعد المحاولة.'}</p>
      <div class="row" style="justify-content:center"><button class="btn pri" data-again>أعد القسم</button><a class="btn" href="#exam">كل الأقسام</a></div></div>
      ${review(wrong)}</div>`;
    el.querySelector('[data-again]').onclick = () => drill(el, sec);
  };
  show();
}

function review(list){
  if(!list.length) return '';
  return `<h3 class="tw-rh">راجع أخطاءك (${AR(list.length)})</h3><div class="tw-rev">${list.map(({ q, j }) => `<div class="card">
    <b>${esc(q.q)}</b>
    ${j >= 0 ? `<p class="w">✗ اخترت: ${esc(q.o[j])}${q.t[j] ? ` · ${esc(q.t[j])}` : ''}</p>` : '<p class="w">⏱️ ما جاوبت</p>'}
    <p class="r">✓ الصح: ${esc(q.o[q.a])}</p><p class="note">${esc(q.x)}</p></div>`).join('')}</div>`;
}

// full mock: 12 from each section, 60 minutes, answers editable until submit, results at the end
function mock(el){
  stop();
  const S = window.TW_SECTIONS;
  const qs = shuffle(S.flatMap(s => shuffle(s.qs).slice(0, 12).map(q => prep(q, s.id))));
  const ans = new Array(qs.length).fill(-1);
  let i = 0, left = 3600, ended = false;
  const draw = () => {
    const q = qs[i], sec = S.find(s => s.id === q.sec), isEn = q.sec === 'english';
    el.innerHTML = `<div class="tw"><div class="crumbs"><a href="#exam" data-leave>تدريب الاختبارات</a> / اختبار تجريبي</div>
      <div class="quiz-h"><h2>اختبار تجريبي</h2><span class="mono tw-clock" id="tw-t">${mmss(left)}</span></div>
      <div class="tw-dots">${qs.map((_, k) => `<button data-go="${k}" class="${k === i ? 'on' : ''} ${ans[k] >= 0 ? 'done' : ''}" aria-label="سؤال ${k + 1}">${k + 1}</button>`).join('')}</div>
      <div class="qcard"><div class="qn">سؤال ${AR(i + 1)} من ${AR(qs.length)} · ${esc(sec.title)}</div><h3 ${isEn ? 'dir="ltr" style="text-align:left"' : ''}>${esc(q.q)}</h3>
        <div class="opts">${q.o.map((x, j) => `<button data-j="${j}" class="${ans[i] === j ? 'pick' : ''}" ${isEn && /^[\x00-\x7F]+$/.test(x) ? 'dir="ltr"' : ''}>${esc(x)}</button>`).join('')}</div>
        <div class="row" style="margin-top:14px;justify-content:space-between"><div class="row"><button class="btn sm" data-prev ${i ? '' : 'disabled'}>→ السابق</button><button class="btn sm" data-nx ${i < qs.length - 1 ? '' : 'disabled'}>التالي ←</button></div>
        <button class="btn pri sm" data-submit>تسليم (${AR(ans.filter(a => a >= 0).length)}/${AR(qs.length)})</button></div></div></div>`;
    el.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { ans[i] = +b.dataset.j; if(i < qs.length - 1) i++; draw(); });
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { i = +b.dataset.go; draw(); });
    el.querySelector('[data-prev]').onclick = () => { i--; draw(); };
    el.querySelector('[data-nx]').onclick = () => { i++; draw(); };
    el.querySelector('[data-submit]').onclick = e => { const b = e.currentTarget, blank = ans.filter(a => a < 0).length;
      if(blank && !b.dataset.sure){ b.dataset.sure = 1; b.textContent = `باقي ${AR(blank)} بدون إجابة، تسلّم؟`; return; } finish(); };
  };
  const finish = () => {
    if(ended) return; ended = true; stop();
    const by = {}; let score = 0; const wrong = [];
    qs.forEach((q, k) => { by[q.sec] = by[q.sec] || { n: 0, ok: 0 }; by[q.sec].n++; if(ans[k] === q.a){ by[q.sec].ok++; score++; } else wrong.push({ q, j: ans[k] }); });
    const pct = Math.round(score / qs.length * 100); saveBest('mock', pct);
    const weak = S.filter(s => by[s.id] && by[s.id].ok / by[s.id].n < .7);
    el.innerHTML = `<div class="tw"><div class="crumbs"><a href="#exam">تدريب الاختبارات</a> / نتيجة الاختبار التجريبي</div>
      <div class="qcard tw-res"><div class="score">${AR(score)}/${AR(qs.length)}</div><p>${AR(pct)}٪ · ${pct >= 80 ? 'مستواك ممتاز، الله يوفقك 💪' : pct >= 60 ? 'قريب، ركّز على الأقسام الضعيفة تحت.' : 'تحتاج تدريب أكثر على الأقسام تحت.'}</p>
        <div class="tw-bars">${S.map(s => { const r = by[s.id] || { n: 0, ok: 0 }, p = r.n ? Math.round(r.ok / r.n * 100) : 0; return `<div><span>${s.icon} ${esc(s.title)}</span><div class="meter"><i style="width:${p}%"></i></div><span class="mono">${AR(r.ok)}/${AR(r.n)}</span></div>`; }).join('')}</div>
        ${weak.length ? `<p>ركّز على: ${weak.map(s => `<a href="#exam/${s.id}">${esc(s.title)}</a>`).join('، ')}</p>` : ''}
        <div class="row" style="justify-content:center"><button class="btn pri" data-again>اختبار جديد</button><a class="btn" href="#exam">كل الأقسام</a></div></div>
      ${review(wrong)}</div>`;
    el.querySelector('[data-again]').onclick = () => mock(el);
  };
  draw();
  timer = setInterval(() => { left--; const t = el.querySelector('#tw-t'); if(t){ t.textContent = mmss(left); t.classList.toggle('low', left <= 300); } if(left <= 0) finish(); }, 1000);
}

window.KUTuwaiq = {
  render(el, sub){
    const S = window.TW_SECTIONS || [];
    if(sub === 'mock') return mock(el);
    const sec = S.find(s => s.id === sub);
    if(sec) return drill(el, sec);
    home(el);
  },
  stop
};
})();
