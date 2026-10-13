// Know UAV — interactive lesson widgets
(function(){
const W=window.W={};
W.types=el=>{
 el.innerHTML=`<div class="wg-h">مقارنة الأنواع</div><div class="tbl-wrap"><table class="cmp"><thead><tr><th>النوع</th><th>التحويم</th><th>زمن الطيران</th><th>السرعة</th><th>الإقلاع</th></tr></thead><tbody>
 <tr><td>متعددة المراوح <span class="en">Multirotor</span></td><td class="g">ممتاز</td><td class="b">قصير</td><td class="m">متوسطة</td><td class="g">عمودي من أي مكان</td></tr>
 <tr><td>ثابتة الجناح <span class="en">Fixed-wing</span></td><td class="b">لا يحوم</td><td class="g">طويل</td><td class="g">عالية</td><td class="m">مدرج أو قاذف</td></tr>
 <tr><td>هجينة <span class="en">VTOL</span></td><td class="m">جيد</td><td class="g">طويل</td><td class="g">عالية</td><td class="g">عمودي</td></tr>
 <tr><td>مروحية <span class="en">Single-rotor</span></td><td class="g">ممتاز</td><td class="m">متوسط</td><td class="m">متوسطة</td><td class="g">عمودي</td></tr></tbody></table></div>`;
};
W.axes=el=>{
 const M=[{x:-48,y:-48,d:'CW',k:'fl'},{x:48,y:-48,d:'CCW',k:'fr'},{x:-48,y:48,d:'CCW',k:'rl'},{x:48,y:48,d:'CW',k:'rr'}];
 const A={thr:{t:'الدفع للأعلى',up:['fl','fr','rl','rr'],dn:[],x:'كل المحركات تتسارع بنفس القدر فتصعد الطائرة.'},
  pitch:{t:'تقدّم للأمام',up:['rl','rr'],dn:['fl','fr'],x:'المحركان الخلفيان أسرع، فيميل الأنف للأسفل ويتجه الدفع للأمام.'},
  roll:{t:'ميل لليمين',up:['fl','rl'],dn:['fr','rr'],x:'المحركان الأيسران أسرع، فتميل الطائرة لليمين وتنتقل يميناً.'},
  yaw:{t:'دوران مع عقارب الساعة',up:['fr','rl'],dn:['fl','rr'],x:'المحركان اللذان يدوران عكس عقارب الساعة أسرع، وعزم ردّ الفعل يلفّ الهيكل مع عقارب الساعة.'}};
 el.innerHTML=`<div class="wg-h">اختر حركة لترى تأثيرها على المحركات</div>
 <div class="seg" id="ax-seg">${Object.entries(A).map(([k,v],i)=>`<button data-k="${k}" class="${i?'':'on'}">${v.t}</button>`).join('')}</div>
 <div class="axes" style="margin-top:16px"><svg viewBox="-100 -100 200 200" aria-label="منظر علوي للطائرة الرباعية">
  <line x1="-48" y1="-48" x2="48" y2="48" stroke="#3a483d" stroke-width="7" stroke-linecap="round"/><line x1="48" y1="-48" x2="-48" y2="48" stroke="#3a483d" stroke-width="7" stroke-linecap="round"/>
  <rect x="-16" y="-20" width="32" height="40" rx="6" fill="#1b241e" stroke="#a8925f"/>
  <path d="M0 -34 L7 -24 L-7 -24 Z" fill="#ff8f45"/><text x="0" y="-80" text-anchor="middle" fill="#9ba696" font-size="11" font-family="Readex Pro">الأمام</text>
  ${M.map(m=>`<g id="ax-${m.k}"><circle cx="${m.x}" cy="${m.y}" r="26" fill="#d8bf86" fill-opacity=".08" stroke="#d8bf86" stroke-opacity=".4"/><circle class="mc" cx="${m.x}" cy="${m.y}" r="9" fill="#a8925f"/><text x="${m.x}" y="${m.y+40}" text-anchor="middle" fill="#9ba696" font-size="10" font-family="IBM Plex Mono">${m.d}</text></g>`).join('')}
 </svg><p id="ax-x" style="margin:0;color:var(--muted)"></p></div>`;
 const set=k=>{const a=A[k];M.forEach(m=>{const g=el.querySelector('#ax-'+m.k);const c=g.querySelectorAll('circle');const up=a.up.includes(m.k),dn=a.dn.includes(m.k);
  c[0].setAttribute('r',up?32:dn?20:26);c[0].setAttribute('fill-opacity',up?.28:dn?.03:.08);c[1].setAttribute('fill',up?'#d8bf86':dn?'#4a5649':'#a8925f')});
  el.querySelector('#ax-x').innerHTML='<b style="color:var(--text)">'+a.t+'</b><br>'+a.x+'<br><span class="note">الدائرة الأكبر تعني محركاً أسرع.</span>';
  el.querySelectorAll('#ax-seg button').forEach(b=>b.classList.toggle('on',b.dataset.k===k))};
 el.querySelector('#ax-seg').onclick=e=>{const b=e.target.closest('button');if(b)set(b.dataset.k)};set('thr');
};
W.parts=el=>{
 const P=[['الهيكل','Frame','يحمل كل المكوّنات. يجب أن يكون خفيفاً وصلباً، وأي شق فيه يسبب اهتزازاً.'],['المحركات','Motors','محركات بدون فرش تدور بسرعات عالية جداً. افحص أنها تدور بحرية ونظيفة من الرمل.'],['منظّم السرعة','ESC','يحوّل أوامر وحدة التحكم إلى سرعة دقيقة لكل محرك.'],['المراوح','Propellers','تولّد الرفع. لكل محرك اتجاه مروحة محدد، وتركيبها بالعكس يمنع الإقلاع أو يقلب الطائرة.'],['وحدة التحكم','Flight Controller','عقل الطائرة. تقرأ الحساسات وتعدّل سرعة المحركات مئات المرات في الثانية.'],['حساسات IMU','IMU','جيروسكوب ومقياس تسارع يقيسان الميل والدوران، وعليهما يعتمد الثبات.'],['البوصلة و GPS','GPS / Compass','تحدد الموقع والاتجاه، وتشغّل أوضاع تثبيت الموقع والعودة للمنزل.'],['المستقبِل','Receiver','يستقبل أوامر جهاز التحكم. انقطاعه يفعّل إجراء الأمان.'],['البطارية','LiPo Battery','مصدر الطاقة، وأكثر المكونات حساسية في السلامة.'],['الكاميرا والحامل','Camera / Gimbal','الحمولة الأشهر. الحامل يثبّت الصورة ضد الاهتزاز.'],['وصلة الفيديو','Video TX','ترسل الصورة الحية إلى المحطة الأرضية.']];
 el.innerHTML=`<div class="wg-h">المكوّنات</div><div class="parts">${P.map((p,i)=>`<button class="part" data-i="${i}"><b>${p[0]}</b><span class="en">${p[1]}</span></button>`).join('')}</div><div class="part-info" id="pi">اختر مكوّناً.</div>`;
 el.querySelector('.parts').onclick=e=>{const b=e.target.closest('.part');if(!b)return;el.querySelectorAll('.part').forEach(x=>x.classList.toggle('on',x===b));const p=P[b.dataset.i];el.querySelector('#pi').innerHTML='<b style="color:var(--text)">'+p[0]+'</b>: '+p[2]};
};
W.lipo=el=>{
 el.innerHTML=`<div class="wg-h">حاسبة البطارية</div><div class="calc">
 <label for="lp-s">عدد الخلايا<select id="lp-s">${[1,2,3,4,6].map(s=>`<option value="${s}" ${s==4?'selected':''}>${s}S</option>`).join('')}</select></label>
 <label for="lp-c">السعة (mAh)<input id="lp-c" type="number" value="5000" min="100" step="100"></label>
 <label for="lp-a">متوسط التيار (A)<input id="lp-a" type="number" value="20" min="1" step="1"></label></div><div class="out" id="lp-o"></div>`;
 const f=()=>{const s=+el.querySelector('#lp-s').value,c=+el.querySelector('#lp-c').value||0,a=+el.querySelector('#lp-a').value||1;
  const t=c/1000/a*60*0.8;
  el.querySelector('#lp-o').innerHTML=[[(s*3.7).toFixed(1)+' V','الجهد الاسمي'],[(s*4.2).toFixed(1)+' V','مشحونة بالكامل'],[(s*3.5).toFixed(1)+' V','حد الهبوط'],[t.toFixed(1)+' د','زمن تقريبي (٨٠٪ من السعة)']].map(x=>`<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')};
 el.oninput=f;f();
};
W.checklist=el=>{
 const G=[['البيئة',['الطقس والرياح ضمن الحدود','منطقة الطيران خالية ومصرّح بها','حدّدت مهبط الطوارئ']],['الطائرة',['الهيكل والأذرع مثبتة دون شقوق','المراوح سليمة ومركّبة بالاتجاه الصحيح','البطارية مشحونة وغير منتفخة ومثبتة']],['الأنظمة',['جهاز التحكم مشحون والوضع الصحيح مختار','إجراء الأمان Failsafe مضبوط','إشارة GPS والأقمار كافية','الكاميرا وبطاقة التخزين جاهزة']],['الإعلان',['أبلغت الطاقم: «جاهز للإقلاع»']]];
 let n=0;el.innerHTML=`<div class="wg-h">قائمة الفحص قبل الإقلاع</div><div class="check">${G.map(g=>`<div class="grp">${g[0]}</div>`+g[1].map(t=>`<label for="ck${n}"><input type="checkbox" id="ck${n++}"> <span>${t}</span></label>`).join('')).join('')}</div><div class="go" id="ck-go">0/${n} — غير جاهز</div><div class="row" style="margin-top:10px"><button class="btn sm" id="ck-r">إعادة القائمة</button></div>`;
 const u=()=>{const c=el.querySelectorAll('input:checked').length,g=el.querySelector('#ck-go');g.textContent=c===n?'جاهز للإقلاع ✓':`${c}/${n} — غير جاهز`;g.classList.toggle('ready',c===n)};
 el.onchange=u;el.querySelector('#ck-r').onclick=()=>{el.querySelectorAll('input').forEach(i=>i.checked=false);u()};
};
W.modes=el=>{
 const st=(lbl,v,h)=>`<div class="stick"><svg viewBox="-75 -75 150 150"><rect x="-60" y="-60" width="120" height="120" rx="14" fill="#0e1310" stroke="#3a483d"/><line x1="0" y1="-50" x2="0" y2="50" stroke="#d8bf86" stroke-width="2"/><line x1="-50" y1="0" x2="50" y2="0" stroke="#a8925f" stroke-width="2" stroke-dasharray="4 4"/><circle r="12" fill="#d8bf86"/><text y="-64" text-anchor="middle" fill="#d8bf86" font-size="10" font-family="IBM Plex Mono">${v}</text><text x="0" y="72" text-anchor="middle" fill="#a8925f" font-size="10" font-family="IBM Plex Mono">${h}</text></svg><div style="font-size:13px;color:var(--muted)">${lbl}</div></div>`;
 const D={2:[['العصا اليسرى','THROTTLE ↕','YAW ↔'],['العصا اليمنى','PITCH ↕','ROLL ↔']],1:[['العصا اليسرى','PITCH ↕','YAW ↔'],['العصا اليمنى','THROTTLE ↕','ROLL ↔']]};
 el.innerHTML=`<div class="wg-h">قارن بين الوضعين</div><div class="seg" id="md"><button data-m="2" class="on">Mode 2</button><button data-m="1">Mode 1</button></div><div class="sticks" id="md-s" style="margin-top:14px;direction:ltr"></div><p id="md-x" class="note" style="margin-top:8px"></p>`;
 const set=m=>{el.querySelector('#md-s').innerHTML=st(...D[m][0])+st(...D[m][1]);el.querySelectorAll('#md button').forEach(b=>b.classList.toggle('on',b.dataset.m==m));
  el.querySelector('#md-x').textContent=m==2?'الأشهر عالمياً. يدك اليمنى تحرّك الطائرة في المستوى الأفقي، واليسرى للارتفاع والاتجاه.':'منتشر في بعض المدارس القديمة. الدفع على اليد اليمنى.'};
 el.querySelector('#md').onclick=e=>{const b=e.target.closest('button');if(b)set(b.dataset.m)};set(2);
};
W.budget=el=>{
 el.innerHTML=`<div class="wg-h">ميزانية البطارية للمهمة</div><div class="calc">
 <label for="bg-t">زمن الطيران الكلي (دقيقة)<input id="bg-t" type="number" value="30" min="1"></label>
 <label for="bg-d">المسافة إلى منطقة العمل (كم)<input id="bg-d" type="number" value="3" min="0" step="0.5"></label>
 <label for="bg-v">سرعة الانتقال (م/ث)<input id="bg-v" type="number" value="12" min="1"></label>
 <label for="bg-r">الاحتياطي (٪)<input id="bg-r" type="number" value="25" min="0" max="80"></label>
 <label for="bg-w">رياح معاكسة عند العودة (م/ث)<input id="bg-w" type="number" value="4" min="0"></label></div><div class="out" id="bg-o"></div>`;
 const f=()=>{const v=k=>+el.querySelector('#bg-'+k).value||0;const T=v('t'),d=v('d')*1000,s=Math.max(1,v('v')),r=v('r'),w=v('w');
  const go=d/s/60,back=d/Math.max(0.5,s-w)/60,res=T*r/100,st=T-go-back-res;
  el.querySelector('#bg-o').innerHTML=[[go.toFixed(1)+' د','الذهاب'],[back.toFixed(1)+' د','العودة'],[res.toFixed(1)+' د','الاحتياطي']].map(x=>`<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')+`<div class="${st<3?'bad':''}"><b>${st.toFixed(1)} د</b><span>${st<3?'وقت غير كافٍ فوق الهدف':'وقت العمل فوق الهدف'}</span></div>`};
 el.oninput=f;f();
};
W.emergency=el=>{
 const S=[{q:'على بعد ٨٠٠ متر، ظهر تحذير: البطارية ٢٢٪.',o:['أكمل المهمة بسرعة','أنهي المهمة وأعود فوراً بأقصر مسار آمن','أهبط في مكاني'],a:1,w:'الاحتياطي مخصص للعودة الآمنة، والمهمة تنتهي عند الوصول له.'},
 {q:'فجأة تبدأ الطائرة بالانجراف ببطء، والشاشة تقول: GPS ٣ أقمار.',o:['أنتقل للتحكم اليدوي وأثبّتها بالعصي','أفعّل العودة للمنزل','أفصل التسليح'],a:0,w:'العودة للمنزل تحتاج GPS، فالتحكم اليدوي هو الحل.'},
 {q:'انقطعت الصورة والتحكم، والطائرة خارج الرؤية.',o:['أطفئ جهاز التحكم','أنتظر إجراء الأمان وأراقب نقطة الإقلاع وأبلغ المسؤول','أركض باتجاهها'],a:1,w:'Failsafe المضبوط سيعيدها. التبليغ الفوري واجب.'},
 {q:'دخلت منطقة الطيران طائرة مأهولة منخفضة.',o:['أصعد لأراقبها','أخفض الارتفاع وأبتعد عن مسارها وأبلغ','أكمل كأن شيئاً لم يكن'],a:1,w:'الأولوية دائماً للطائرات المأهولة.'}];
 let i=0;const r=()=>{const s=S[i];el.innerHTML=`<div class="wg-h">سيناريو ${AR(i+1)} من ${AR(S.length)}</div><div class="scn"><div class="q">${s.q}</div>${s.o.map((o,j)=>`<button data-j="${j}">${o}</button>`).join('')}<div class="fb" id="em-f"></div><div class="row"><button class="btn sm" id="em-n">${i<S.length-1?'السيناريو التالي':'من البداية'}</button></div></div>`;
  el.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>{el.querySelectorAll('[data-j]').forEach(x=>{x.disabled=true;if(+x.dataset.j===s.a)x.classList.add('r')});if(+b.dataset.j!==s.a)b.classList.add('w');el.querySelector('#em-f').textContent=s.w});
  el.querySelector('#em-n').onclick=()=>{i=(i+1)%S.length;r()}};r();
};
W.phonetic=el=>{
 const L='Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliett Kilo Lima Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform Victor Whiskey X-ray Yankee Zulu'.split(' ');
 el.innerHTML=`<div class="wg-h">الأبجدية الصوتية — اضغط لتكشف</div><div class="pho">${L.map(w=>`<button><b>${w[0]}</b><span>&nbsp;</span></button>`).join('')}</div><div class="row" style="margin-top:12px"><button class="btn sm" id="ph-all">اكشف الكل</button><button class="btn sm" id="ph-hide">أخفِ الكل</button></div>`;
 const bs=[...el.querySelectorAll('.pho button')];bs.forEach((b,i)=>b.onclick=()=>{const on=b.classList.toggle('on');b.querySelector('span').textContent=on?L[i]:' '});
 el.querySelector('#ph-all').onclick=()=>bs.forEach((b,i)=>{b.classList.add('on');b.querySelector('span').textContent=L[i]});
 el.querySelector('#ph-hide').onclick=()=>bs.forEach(b=>{b.classList.remove('on');b.querySelector('span').textContent=' '});
};


})();
