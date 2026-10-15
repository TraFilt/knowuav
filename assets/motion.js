// Know UAV — lesson motion-graphics player. Scenes are SVG + SMIL animations, timed to the narration audio.
(function(){
const C = {sand:'#d8bf86', dim:'#a8925f', sig:'#ff8f45', ok:'#7cd39b', bad:'#ff6b6b', txt:'#ece7d8', mut:'#9aa595', line:'#36443a', pan:'#19221c', bg:'#0f1511'};
const T = (x,y,s,o={}) => { if(o.dir==='rtl' && o.a==='end') o = Object.assign({}, o, {a:'start'}); return T0(x,y,s,o); };
const T0 = (x,y,s,o={}) => `<text x="${x}" y="${y}" fill="${o.c||C.txt}" font-size="${o.fs||18}" font-family="${o.mono?'IBM Plex Mono,monospace':'Readex Pro,Tahoma,sans-serif'}" text-anchor="${o.a||'middle'}" font-weight="${o.w||400}" ${o.dir?'direction="'+o.dir+'"':''}>${s}${o.anim||''}</text>`;
const fadeIn = (d=0, dur=.5) => `<animate attributeName="opacity" from="0" to="1" begin="${d}s" dur="${dur}s" fill="freeze"/>`;
const pop = (d=0) => `opacity="0"${''}`; // marker
const G = (inner, d=0, extra='') => `<g opacity="0" ${extra}>${inner}${fadeIn(d)}</g>`;

// top-view quad. hi: map motor index→'up'|'dn'. motors: 0 FL,1 FR,2 RL,3 RR
function quadTop(cx, cy, s=1, hi={}, opts={}){
  const M = [[-1,-1],[1,-1],[-1,1],[1,1]], R = 46*s, mr = 26*s;
  let g = `<g transform="translate(${cx} ${cy})">`;
  g += `<line x1="${-R}" y1="${-R}" x2="${R}" y2="${R}" stroke="${C.line}" stroke-width="${9*s}" stroke-linecap="round"/><line x1="${R}" y1="${-R}" x2="${-R}" y2="${R}" stroke="${C.line}" stroke-width="${9*s}" stroke-linecap="round"/>`;
  M.forEach(([sx,sy],i) => {
    const st = hi[i], col = st==='up' ? C.sand : st==='dn' ? '#4a5649' : C.dim;
    const r = st==='up' ? mr*1.2 : st==='dn' ? mr*.8 : mr;
    g += `<g transform="translate(${sx*R} ${sy*R})"><circle r="${r}" fill="${col}" fill-opacity="${st==='up'?.28:.1}" stroke="${col}" stroke-width="2">${st==='up'?`<animate attributeName="r" values="${r};${r*1.12};${r}" dur=".6s" repeatCount="indefinite"/>`:''}</circle>`;
    const dir = (i===0||i===3) ? 1 : -1;
    g += `<g><path d="M${-mr*.75} 0 L${mr*.75} 0" stroke="${col}" stroke-width="${4*s}" stroke-linecap="round"/><animateTransform attributeName="transform" type="rotate" from="0" to="${360*dir}" dur="${st==='up'?.25:st==='dn'?.9:.45}s" repeatCount="indefinite"/></g>`;
    if(opts.dirs) g += `<text y="${r+18*s}" fill="${C.mut}" font-size="${11*s}" font-family="IBM Plex Mono" text-anchor="middle">${dir>0?'CW':'CCW'}</text>`;
    g += `</g>`;
  });
  g += `<rect x="${-18*s}" y="${-24*s}" width="${36*s}" height="${48*s}" rx="${8*s}" fill="${C.pan}" stroke="${C.dim}" stroke-width="1.5"/><path d="M0 ${-38*s} L${8*s} ${-27*s} L${-8*s} ${-27*s}Z" fill="${C.sig}"/>`;
  return g + `</g>`;
}
// side-view quad
function quadSide(x, y, s=1, tilt=0, inner=''){
  return `<g transform="translate(${x} ${y}) rotate(${tilt})">${inner}<rect x="${-40*s}" y="${-5*s}" width="${80*s}" height="${10*s}" rx="${4*s}" fill="${C.line}"/><rect x="${-16*s}" y="${-12*s}" width="${32*s}" height="${14*s}" rx="${6*s}" fill="${C.sand}"/>`+
    [-1,1].map(k=>`<rect x="${k*40*s-3*s}" y="${-14*s}" width="${6*s}" height="${10*s}" fill="#8e8e86"/><ellipse cx="${k*40*s}" cy="${-16*s}" rx="${24*s}" ry="${3*s}" fill="${C.txt}" fill-opacity=".35"><animate attributeName="rx" values="${24*s};${6*s};${24*s}" dur=".12s" repeatCount="indefinite"/></ellipse>`).join('')+
    `<line x1="${-30*s}" y1="${5*s}" x2="${-30*s}" y2="${14*s}" stroke="${C.line}" stroke-width="${3*s}"/><line x1="${30*s}" y1="${5*s}" x2="${30*s}" y2="${14*s}" stroke="${C.line}" stroke-width="${3*s}"/></g>`;
}
const arrow = (x1,y1,x2,y2,col=C.sand,w=4,d=0) => `<g opacity="0"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" marker-end="url(#ah-${col.slice(1)})"/>${fadeIn(d,.4)}</g>`;
const defs = () => `<defs>${[C.sand,C.sig,C.ok,C.bad,C.txt,C.mut].map(c=>`<marker id="ah-${c.slice(1)}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}
 <radialGradient id="vig" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#1b241d"/><stop offset="1" stop-color="#0b100d"/></radialGradient>
 <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#d8bf86" stroke-opacity=".06"/></pattern></defs>`;
const ground = (y=300) => `<rect x="0" y="${y}" width="640" height="${360-y}" fill="#2a2519"/><line x1="0" y1="${y}" x2="640" y2="${y}" stroke="${C.dim}" stroke-opacity=".5"/>`;
const pad = (x,y,label='H',r=34) => `<g transform="translate(${x} ${y})"><ellipse rx="${r}" ry="${r*.28}" fill="#20251f" stroke="${C.sand}" stroke-width="2"/>${T(0,5,label,{fs:14,mono:1,c:C.sand,w:600})}</g>`;
const icon = {
  gcs:(x,y)=>`<g transform="translate(${x} ${y})"><rect x="-30" y="-20" width="60" height="40" rx="8" fill="${C.pan}" stroke="${C.sand}" stroke-width="2"/><circle cx="-14" cy="0" r="8" fill="none" stroke="${C.sand}" stroke-width="2"/><circle cx="14" cy="0" r="8" fill="none" stroke="${C.sand}" stroke-width="2"/><line x1="18" y1="-20" x2="26" y2="-38" stroke="${C.sand}" stroke-width="2"/></g>`,
  crew:(x,y)=>`<g transform="translate(${x} ${y})" fill="none" stroke="${C.sand}" stroke-width="2"><circle cx="0" cy="-16" r="10"/><path d="M-18 22c0-14 8-22 18-22s18 8 18 22"/></g>`,
  tower:(x,y)=>`<g transform="translate(${x} ${y})" fill="none" stroke="${C.sand}" stroke-width="2"><path d="M0 -26L-14 24M0 -26L14 24M-9 6h18"/><path d="M-12 -30a16 16 0 0 1 24 0M-18 -36a24 24 0 0 1 36 0" stroke-opacity=".6"/></g>`,
  plane:(x,y,s=1,col=C.sand)=>`<g transform="translate(${x} ${y}) scale(${s})" fill="${col}"><path d="M-40 0 L30 -4 L40 0 L30 4 Z"/><path d="M-4 -2 L-14 -34 L-4 -34 L10 -2Z M-4 2 L-14 34 L-4 34 L10 2Z"/><path d="M-36 -1 L-42 -14 L-36 -14 L-30 -1Z M-36 1 L-42 14 L-36 14 L-30 1Z"/></g>`,
  person:(x,y,col=C.txt)=>`<g transform="translate(${x} ${y})" fill="${col}"><circle cy="-22" r="7"/><rect x="-6" y="-14" width="12" height="22" rx="5"/></g>`
};

// list helper
function list(items, x=600, y=110, gap=52, opts={}){
  return items.map((s,i)=>`<g opacity="0"><rect x="${640-x-10}" y="${y+i*gap-28}" width="${x*2-640+20}" height="42" rx="10" fill="${C.pan}" stroke="${C.line}"/><circle cx="${x-6}" cy="${y+i*gap-7}" r="5" fill="${opts.col||C.sand}"/>${T(x-24,y+i*gap,s,{a:'end',fs:opts.fs||19,dir:'rtl'})}${fadeIn(.3+i*(opts.step||.7))}<animateTransform attributeName="transform" type="translate" from="-20 0" to="0 0" begin="${.3+i*(opts.step||.7)}s" dur=".4s" fill="freeze"/></g>`).join('');
}
function checks(items, title){
  return T(320,62,title,{fs:22,c:C.sand,w:600}) + items.map((s,i)=>`<g opacity="0" transform="translate(0 ${i*56})"><rect x="120" y="90" width="400" height="44" rx="10" fill="${C.pan}" stroke="${C.line}"/><rect x="474" y="100" width="24" height="24" rx="6" fill="none" stroke="${C.sand}" stroke-width="2"/><path d="M479 112l5 6 10-12" fill="none" stroke="${C.ok}" stroke-width="3" stroke-dasharray="30" stroke-dashoffset="30"><animate attributeName="stroke-dashoffset" to="0" begin="${.8+i*1.1}s" dur=".35s" fill="freeze"/></path>${T(456,118,s,{a:'end',fs:17,dir:'rtl'})}${fadeIn(.2+i*1.1)}</g>`).join('');
}
function alertCard(title, action, glyph, col=C.sig){
  return `<g opacity="0"><rect x="150" y="70" width="340" height="110" rx="16" fill="${C.pan}" stroke="${col}" stroke-width="2"/><g transform="translate(440 125)">${glyph}</g>${T(395,118,title,{a:'end',fs:22,w:600,c:col,dir:'rtl'})}${T(395,152,'تنبيه',{a:'end',fs:13,c:C.mut,dir:'rtl'})}${fadeIn(0)}<animate attributeName="stroke-opacity" values="1;.3;1" dur="1s" repeatCount="3"/></g>`+
    arrow(320,195,320,232,C.txt,3,.9)+`<g opacity="0"><rect x="150" y="245" width="340" height="70" rx="16" fill="${C.ok}" fill-opacity=".12" stroke="${C.ok}" stroke-width="2"/>${T(320,288,action,{fs:21,w:600,c:C.ok,dir:'rtl'})}${fadeIn(1.3)}</g>`;
}
function sticks(left, right, hl){
  const box = (x, v, h, act, label) => `<g transform="translate(${x} 175)"><rect x="-80" y="-80" width="160" height="160" rx="22" fill="${C.pan}" stroke="${act?C.sand:C.line}" stroke-width="2"/><line x1="0" y1="-62" x2="0" y2="62" stroke="${C.sand}" stroke-width="2" stroke-opacity=".6"/><line x1="-62" y1="0" x2="62" y2="0" stroke="${C.dim}" stroke-width="2" stroke-dasharray="5 5"/>
    <circle r="16" fill="${C.sand}">${act?`<animateTransform attributeName="transform" type="translate" values="0 0;0 -50;0 0;0 50;0 0;50 0;0 0;-50 0;0 0" dur="5s" repeatCount="indefinite"/>`:''}</circle>${T(0,-92,v,{fs:13,mono:1,c:C.sand})}${T(0,104,h,{fs:13,mono:1,c:C.dim})}${T(0,132,label,{fs:15,c:C.mut})}</g>`;
  return box(190, left[0], left[1], hl!=='r', 'العصا اليسرى') + box(450, right[0], right[1], hl!=='l', 'العصا اليمنى');
}
function pathScene(d, len, dur, label){
  return `<rect x="0" y="0" width="640" height="360" fill="url(#grid)"/><path d="${d}" fill="none" stroke="${C.line}" stroke-width="3" stroke-dasharray="8 8"/>
   <path d="${d}" fill="none" stroke="${C.sand}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${len}"><animate attributeName="stroke-dashoffset" to="0" dur="${dur}s" fill="freeze"/></path>
   <g><circle r="10" fill="${C.sig}"/><circle r="22" fill="none" stroke="${C.sig}" stroke-opacity=".4"/><animateMotion dur="${dur}s" path="${d}" rotate="auto" fill="freeze"/></g>`+(label?T(320,340,label,{fs:14,mono:1,c:C.mut}):'');
}
function battery(x, y, cells=1, fill=1, col=C.ok, label=''){
  const w = 70; let g = `<g transform="translate(${x} ${y})">`;
  for(let i=0;i<cells;i++){ const cx = (i-(cells-1)/2)*(w+14);
    g += `<g transform="translate(${cx} 0)"><rect x="${-w/2}" y="-60" width="${w}" height="120" rx="10" fill="none" stroke="${C.sand}" stroke-width="2.5"/><rect x="-12" y="-70" width="24" height="10" rx="3" fill="${C.sand}"/>
      <rect x="${-w/2+6}" y="${54-108*fill}" width="${w-12}" height="${108*fill}" rx="6" fill="${col}" fill-opacity=".55"><animate attributeName="height" from="0" to="${108*fill}" begin="${i*.35}s" dur=".7s" fill="freeze"/><animate attributeName="y" from="54" to="${54-108*fill}" begin="${i*.35}s" dur=".7s" fill="freeze"/></rect>${T(0,90,'3.7V',{fs:14,mono:1,c:C.sand})}</g>`; }
  return g + (label?T(0,130,label,{fs:20,mono:1,w:600,c:C.sand}):'') + `</g>`;
}
function gauge(){
  const y = v => 300 - (v-3.0)*200; // 3.0..4.2 → 300..60
  const m = [[4.2,'مشحونة',C.ok],[3.8,'تخزين',C.sand],[3.5,'حد الهبوط',C.sig],[3.0,'تلف',C.bad]];
  return `<rect x="300" y="60" width="40" height="240" rx="12" fill="${C.pan}" stroke="${C.line}"/><rect x="306" y="66" width="28" height="228" rx="8" fill="url(#vg)"/><defs><linearGradient id="vg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${C.bad}"/><stop offset=".4" stop-color="${C.sig}"/><stop offset=".65" stop-color="${C.sand}"/><stop offset="1" stop-color="${C.ok}"/></linearGradient></defs>`+
    m.map(([v,l,c],i)=>`<g opacity="0"><line x1="346" y1="${y(v)}" x2="380" y2="${y(v)}" stroke="${c}" stroke-width="2"/>${T(388,y(v)+6,v.toFixed(1)+'V',{a:'start',fs:16,mono:1,c})}${T(292,y(v)+6,l,{a:'end',fs:16,c,dir:'rtl'})}${fadeIn(.4+i*.9)}</g>`).join('')+
    `<g><polygon points="0,-8 14,0 0,8" fill="${C.txt}"/><animateTransform attributeName="transform" type="translate" values="282 ${y(4.2)};282 ${y(3.8)};282 ${y(3.5)};282 ${y(3.6)}" dur="4s" fill="freeze"/></g>`;
}
function windLines(n=6, dur=1.2, x0=0, gust=false){
  let s=''; for(let i=0;i<n;i++){ const y=70+i*38; s+=`<line x1="${x0}" y1="${y}" x2="${x0+70}" y2="${y}" stroke="${C.mut}" stroke-width="2" stroke-linecap="round" stroke-opacity=".7"><animate attributeName="x1" values="${x0-80};660" dur="${gust?(.5+Math.random()*1.4).toFixed(2):dur}s" begin="${(i*.17).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="x2" values="${x0-10};730" dur="${gust?(.5+Math.random()*1.4).toFixed(2):dur}s" begin="${(i*.17).toFixed(2)}s" repeatCount="indefinite"/></line>`; }
  return s;
}
function hudMock(sig){
  const box = (x,y,k,vals,a='start') => `<g transform="translate(${x} ${y})"><rect x="${a==='start'?0:-150}" y="-24" width="150" height="40" rx="8" fill="#0b100dcc" stroke="#ffffff22"/>${T(a==='start'?12:-12,4,k,{a,fs:14,mono:1,c:C.mut})}<text x="${a==='start'?138:-12}" y="4" text-anchor="end" fill="${C.sand}" font-family="IBM Plex Mono" font-size="18" font-weight="600">${vals[0]}<animate attributeName="opacity" values="1" dur="1s"/></text></g>`;
  return `<rect x="30" y="30" width="580" height="300" rx="14" fill="#33402f"/><rect x="30" y="200" width="580" height="130" fill="#5b5136"/><path d="M30 200 Q320 185 610 200" stroke="#ffffff33" fill="none"/>`+
    `<g stroke="${C.txt}" stroke-width="2"><line x1="260" y1="180" x2="300" y2="180"/><line x1="340" y1="180" x2="380" y2="180"/><circle cx="320" cy="180" r="4" fill="${C.sig}" stroke="none"/></g>`+
    (sig ? G(hudBox(60,70,'RSSI','-62dB')+hudBox(580,70,'SATS','14',1),.2)+G(`<rect x="200" y="250" width="240" height="44" rx="10" fill="${C.bad}" fill-opacity=".2" stroke="${C.bad}"/>${T(320,279,'SATS 4 · تثبيت ضعيف',{fs:16,c:C.bad,dir:'rtl'})}`,2.4)
         : G(hudBox(60,70,'ALT','12.4 m'),.2)+G(hudBox(60,120,'SPD','3.1 m/s'),.8)+G(hudBox(580,70,'BAT','78%',1),1.4)+G(hudBox(580,120,'HOME','46 m',1),2));
}
function hudBox(x,y,k,v,right){ return `<g transform="translate(${right?x-150:x} ${y})"><rect y="-26" width="150" height="40" rx="8" fill="#0b100dd9" stroke="#ffffff22"/>${T(12,1,k,{a:'start',fs:14,mono:1,c:C.mut})}${T(138,1,v,{a:'end',fs:17,mono:1,w:600,c:C.sand})}</g>`; }
function bubbles(pairs){
  return pairs.map(([en,ar],i)=>`<g opacity="0" transform="translate(0 ${i*72})"><rect x="${i%2?250:110}" y="64" width="280" height="56" rx="18" fill="${C.pan}" stroke="${i%2?C.ok:C.sand}"/>${T((i%2?250:110)+140,90,en,{fs:19,mono:1,w:600,c:i%2?C.ok:C.sand})}${T((i%2?250:110)+140,111,ar,{fs:14,c:C.mut,dir:'rtl'})}${fadeIn(.3+i*1.2)}</g>`).join('');
}

// ---------- controller grip scenes ----------
const SKIN='#c8935f', SKIN2='#8c5f3a';
function ctrlTop(cx, cy, s=1, grip='', move=true){
  const knob = (x) => `<g transform="translate(${x} -6)"><circle r="44" fill="#0f1511" stroke="${C.line}" stroke-width="2"/><g><circle r="15" fill="${C.sand}"/><circle r="7" fill="#b39a5e"/>${move?`<animateTransform attributeName="transform" type="translate" values="0 0;0 -14;0 0;10 0;0 0;0 12;0 0" dur="4s" repeatCount="indefinite"/>`:''}</g></g>`;
  const thumb = (sx) => `<g transform="translate(${sx*104} 34) rotate(${sx*-28})"><ellipse rx="17" ry="44" fill="${SKIN}" stroke="${SKIN2}" stroke-width="2"/><ellipse cx="0" cy="-28" rx="9" ry="10" fill="#e3b48a" opacity=".7"/></g>`;
  const pinch = (sx) => `<g transform="translate(${sx*96} 36) rotate(${sx*-12})"><ellipse rx="15" ry="40" fill="${SKIN}" stroke="${SKIN2}" stroke-width="2"/></g><g transform="translate(${sx*124} -56) rotate(${sx*38})"><ellipse rx="13" ry="46" fill="${SKIN}" stroke="${SKIN2}" stroke-width="2"/><ellipse cx="0" cy="34" rx="7" ry="9" fill="#e3b48a" opacity=".7"/></g>`;
  const palm = (sx) => `<ellipse cx="${sx*168}" cy="${grip==='pinch'?40:90}" rx="62" ry="58" fill="${SKIN}" stroke="${SKIN2}" stroke-width="2" opacity=".95"/>`;
  let g = `<g transform="translate(${cx} ${cy}) scale(${s})">`;
  if(grip) g += palm(-1) + palm(1);
  g += `<path d="M-150 -78 H150 A40 40 0 0 1 190 -38 V40 A60 60 0 0 1 80 70 H-80 A60 60 0 0 1 -190 40 V-38 A40 40 0 0 1 -150 -78Z" fill="${C.pan}" stroke="${C.dim}" stroke-width="2"/>`;
  g += `<rect x="-26" y="-60" width="52" height="34" rx="6" fill="#0b100d" stroke="${C.line}"/><circle cx="-12" cy="30" r="6" fill="${C.line}"/><circle cx="12" cy="30" r="6" fill="${C.line}"/>`;
  g += knob(-90) + knob(90);
  if(grip==='thumbs') g += thumb(-1) + thumb(1);
  if(grip==='pinch') g += pinch(-1) + pinch(1);
  return g + `</g>`;
}
function gripTip(){
  const k = (x, ok) => `<g transform="translate(${x} 175)"><circle r="70" fill="#0f1511" stroke="${C.line}" stroke-width="2"/><circle r="26" fill="${C.sand}"/>`+
    (ok ? `<g transform="translate(18 70) rotate(-20)"><ellipse rx="28" ry="78" fill="${SKIN}" stroke="${SKIN2}" stroke-width="2"/><ellipse cy="-58" rx="15" ry="16" fill="#e3b48a" opacity=".8"/></g>`
        : `<g transform="translate(6 30) rotate(-20)"><ellipse rx="28" ry="78" fill="${SKIN}" stroke="${SKIN2}" stroke-width="2"/><path d="M-22 -6 Q0 4 22 -6" stroke="${SKIN2}" stroke-width="2" fill="none"/></g>`)+
    `<circle cx="70" cy="-70" r="20" fill="${ok?C.ok:C.bad}" fill-opacity=".2" stroke="${ok?C.ok:C.bad}" stroke-width="2"/>`+
    (ok ? `<path d="M60 -70l7 8 13-15" fill="none" stroke="${C.ok}" stroke-width="4"/>` : `<path d="M62 -78l16 16M78 -78l-16 16" stroke="${C.bad}" stroke-width="4"/>`)+`</g>`;
  return G(k(440, true) + T(440, 320, 'طرف الإبهام', {fs:18, c:C.ok}), .2) + G(k(200, false) + T(200, 320, 'المفصل كامل', {fs:18, c:C.bad}), 1.2);
}
function gripPosture(){
  const p = `<g fill="none" stroke="${C.txt}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="250" cy="78" r="26" fill="${C.pan}"/><path d="M250 106 V250"/><path d="M250 250 L232 330 M250 250 L270 330"/>
    <path d="M252 126 L260 206 L352 186"/></g>`;
  const ctrl = `<g transform="translate(372 182) rotate(-18)"><rect x="-38" y="-16" width="76" height="32" rx="10" fill="${C.pan}" stroke="${C.sand}" stroke-width="2"/><line x1="-20" y1="-16" x2="-26" y2="-46" stroke="${C.sand}" stroke-width="3"/><line x1="20" y1="-16" x2="26" y2="-46" stroke="${C.sand}" stroke-width="3"/></g>`;
  const strap = `<path d="M262 112 Q330 120 360 168" fill="none" stroke="${C.sig}" stroke-width="3" stroke-dasharray="7 6"/>`;
  return `<rect width="640" height="360" fill="url(#grid)"/>` + p + ctrl +
    G(strap + T(345, 112, 'حبل الرقبة', {fs:15, c:C.sig, a:'start'}), .6) +
    G(`<circle cx="259" cy="206" r="13" fill="${C.ok}" fill-opacity=".25" stroke="${C.ok}" stroke-width="2"/>` + T(190, 232, 'الكوع مسنود', {fs:15, c:C.ok}), 1.4) +
    G(`<line x1="440" y1="182" x2="560" y2="182" stroke="${C.dim}" stroke-dasharray="5 5"/>` + T(500, 170, 'مستوى الصدر', {fs:15, c:C.dim}), 2.2);
}
function gripAntenna(){
  const ant = (x, y, ang=0) => `<g transform="translate(${x} ${y}) rotate(${ang})"><rect x="-30" y="0" width="60" height="26" rx="8" fill="${C.pan}" stroke="${C.sand}" stroke-width="2"/><line x1="0" y1="0" x2="0" y2="-70" stroke="${C.sand}" stroke-width="5" stroke-linecap="round"/></g>`;
  const lobes = (x, y) => `<g opacity=".5"><ellipse cx="${x+70}" cy="${y-35}" rx="70" ry="34" fill="${C.ok}" fill-opacity=".18" stroke="${C.ok}"/><ellipse cx="${x-70}" cy="${y-35}" rx="70" ry="34" fill="${C.ok}" fill-opacity=".18" stroke="${C.ok}"/><animate attributeName="opacity" values=".25;.6;.25" dur="1.6s" repeatCount="indefinite"/></g>`;
  return `<rect width="640" height="360" fill="url(#grid)"/>` + lobes(170, 260) + ant(170, 260) +
    G(quadSide(330, 225, .55) + `<path d="M310 250l7 8 13-15" fill="none" stroke="${C.ok}" stroke-width="4"/>` + T(170, 330, 'الجنب مقابل الطائرة', {fs:16, c:C.ok}), .5) +
    G(ant(470, 260) + quadSide(470, 92, .55) + `<path d="M500 120l16 16M516 120l-16 16" stroke="${C.bad}" stroke-width="4"/>` + T(470, 330, 'الراس باتجاهها = إشارة ضعيفة', {fs:15, c:C.bad}), 1.6);
}

const V = {
  title: s => `<rect width="640" height="360" fill="url(#grid)"/>`+`<g><animateTransform attributeName="transform" type="translate" from="-120 -40" to="0 0" dur="1.6s" fill="freeze"/>${quadTop(320,150,1.1)}</g>`+G(T(320,290,s.cap,{fs:30,w:700,c:C.sand}),1),
  points: s => T(320,56,s.cap,{fs:24,w:700,c:C.sand})+list(s.pts||[],560,128,62,{step:.9}),
  uas: () => G(quadTop(320,90,.55),.1)+G(icon.gcs(150,250)+T(150,300,'محطة التحكم GCS',{fs:15,dir:'rtl'}),.8)+G(icon.tower(320,250)+T(320,300,'وصلة الاتصال',{fs:15,dir:'rtl'}),1.6)+G(icon.crew(490,250)+T(490,300,'الطاقم',{fs:15}),2.4)+G(T(320,170,'الطائرة',{fs:15}),.3)+
    `<g opacity="0" stroke="${C.dim}" stroke-dasharray="5 6" stroke-width="2"><line x1="300" y1="130" x2="170" y2="220"/><line x1="320" y1="140" x2="320" y2="215"/><line x1="340" y1="130" x2="470" y2="220"/>${fadeIn(3)}</g>`,
  link: () => quadTop(470,110,.6)+icon.gcs(160,250)+
    `<path id="lk" d="M190 230 Q300 120 440 125" fill="none" stroke="${C.line}" stroke-width="2"/>`+
    [0,.7,1.4].map(d=>`<circle r="6" fill="${C.sand}"><animateMotion dur="2.1s" begin="${d}s" repeatCount="indefinite" path="M190 230 Q300 120 440 125"/></circle>`).join('')+
    [.35,1.05,1.75].map(d=>`<circle r="5" fill="${C.ok}"><animateMotion dur="2.1s" begin="${d}s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear" path="M190 230 Q300 120 440 125"/></circle>`).join('')+
    G(T(200,140,'أوامر ←',{fs:15,c:C.sand,dir:'rtl'})+T(470,215,'بيانات + فيديو',{fs:15,c:C.ok,dir:'rtl'}),.6),
  types: () => G(quadTop(130,150,.6)+T(130,270,'متعددة المراوح',{fs:16})+T(130,295,'تحوم في مكانها',{fs:13,c:C.mut}),.2)+
    G(icon.plane(320,150,1.4)+T(320,270,'ثابتة الجناح',{fs:16})+T(320,295,'مدى وسرعة',{fs:13,c:C.mut}),1.2)+
    G(icon.plane(510,150,1.1)+[-1,1].map(k=>`<circle cx="${510+k*0}" cy="${150+k*38}" r="14" fill="none" stroke="${C.sand}"/>`).join('')+T(510,270,'هجينة VTOL',{fs:16})+T(510,295,'الاثنين معاً',{fs:13,c:C.mut}),2.2),
  forces: () => quadSide(320,180,1.6)+arrow(320,150,320,60,C.ok,5,.3)+T(320,48,'الرفع',{fs:16,c:C.ok,anim:fadeIn(.3)})+arrow(320,210,320,300,C.bad,5,1)+T(320,325,'الوزن',{fs:16,c:C.bad})+arrow(400,180,500,180,C.sand,5,1.8)+T(540,186,'الدفع',{fs:16,c:C.sand})+arrow(240,180,140,180,C.mut,5,2.6)+T(100,186,'السحب',{fs:16,c:C.mut}),
  spin: () => quadTop(320,175,1.6,{},{dirs:1}),
  'axis-thr': () => `<g><animateTransform attributeName="transform" type="scale" values="1;1.08;1" dur="2s" repeatCount="indefinite" additive="sum"/>${quadTop(320,180,1.4,{0:'up',1:'up',2:'up',3:'up'})}</g>`+arrow(520,220,520,110,C.ok,5,.4)+T(520,250,'صعود',{fs:16,c:C.ok}),
  'axis-pitch': () => quadTop(320,180,1.4,{2:'up',3:'up',0:'dn',1:'dn'})+arrow(320,90,320,40,C.ok,5,.4)+T(470,60,'تتقدّم للأمام',{fs:16,c:C.ok,dir:'rtl'}),
  'axis-roll': () => quadTop(320,180,1.4,{0:'up',2:'up',1:'dn',3:'dn'})+arrow(430,180,520,180,C.ok,5,.4)+T(540,215,'ميل يمين',{fs:16,c:C.ok,dir:'rtl'}),
  'axis-yaw': () => `<g><animateTransform attributeName="transform" type="rotate" from="0 320 180" to="90 320 180" dur="3s" fill="freeze"/>${quadTop(320,180,1.4,{1:'up',2:'up',0:'dn',3:'dn'})}</g>`+`<path d="M470 110 A150 150 0 0 1 470 250" fill="none" stroke="${C.ok}" stroke-width="4" marker-end="url(#ah-7cd39b)"/>`,
  'part-fc': () => partScene('fc'), 'part-imu': () => partScene('imu'), 'part-motor': () => partScene('motor'), 'part-bat': () => partScene('bat'),
  battery: () => battery(320,170,1,1,C.ok,'LiPo'),
  cells: () => battery(320,160,4,1,C.ok)+G(T(320,300,'4S = 4 × 3.7 = 14.8V',{fs:24,mono:1,w:600,c:C.sand}),1.8),
  volt: () => gauge(),
  swell: () => `<g transform="translate(320 170)"><rect x="-60" y="-70" width="120" height="140" rx="16" fill="${C.bad}" fill-opacity=".15" stroke="${C.bad}" stroke-width="3"><animate attributeName="rx" values="16;46;16" dur="2.4s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="scale" values="1 1;1.15 1.05;1 1" dur="2.4s" repeatCount="indefinite"/></rect></g>`+G(`<g stroke="${C.bad}" stroke-width="8" stroke-linecap="round"><line x1="410" y1="90" x2="490" y2="170"/><line x1="490" y1="90" x2="410" y2="170"/></g>`,1)+G(T(320,320,'لا شحن · لا طيران · اعزلها',{fs:20,c:C.bad,dir:'rtl'}),1.6),
  vlos: () => ground(290)+icon.person(120,290)+`<g><animateTransform attributeName="transform" type="translate" values="0 0;300 -20;0 0" dur="6s" repeatCount="indefinite"/>${quadSide(250,150,.8)}</g>`+
    `<line x1="125" y1="268" x2="250" y2="150" stroke="${C.ok}" stroke-width="2" stroke-dasharray="6 6"><animate attributeName="x2" values="250;550;250" dur="6s" repeatCount="indefinite"/><animate attributeName="y2" values="150;130;150" dur="6s" repeatCount="indefinite"/><animate attributeName="stroke" values="${C.ok};${C.bad};${C.ok}" dur="6s" repeatCount="indefinite"/></line>`+T(120,330,'VLOS',{fs:16,mono:1,c:C.ok}),
  nofly: () => `<rect width="640" height="360" fill="url(#grid)"/>`+G(`<circle cx="190" cy="170" r="90" fill="${C.bad}" fill-opacity=".12" stroke="${C.bad}" stroke-width="2" stroke-dasharray="8 6"/>`+icon.plane(190,170,.8,C.bad)+T(190,290,'مطار',{fs:16,c:C.bad}),.2)+
    G(`<circle cx="450" cy="170" r="70" fill="${C.sig}" fill-opacity=".1" stroke="${C.sig}" stroke-width="2" stroke-dasharray="8 6"/>`+[-28,0,28].map(d=>icon.person(450+d,190,C.sig)).join('')+T(450,290,'تجمعات',{fs:16,c:C.sig}),1.2),
  weather: () => windLines(5,1.4)+G(`<g transform="translate(120 250)" fill="none" stroke="${C.sand}" stroke-width="3"><circle r="26"/>${[0,45,90,135,180,225,270,315].map(a=>`<line x1="${Math.cos(a*Math.PI/180)*34}" y1="${Math.sin(a*Math.PI/180)*34}" x2="${Math.cos(a*Math.PI/180)*44}" y2="${Math.sin(a*Math.PI/180)*44}"/>`).join('')}</g>`+T(120,320,'حرارة',{fs:15}),.6)+G(T(320,320,'رياح',{fs:15}),.2)+G(`<g fill="${C.dim}">${Array.from({length:40},()=>`<circle cx="${430+Math.random()*160}" cy="${200+Math.random()*90}" r="${1+Math.random()*2.5}"/>`).join('')}</g>`+T(510,320,'غبار',{fs:15}),1.2),
  checklist: () => checks(['البيئة','الطائرة','الأنظمة','الإعلان'],'Pre-flight Checklist'),
  reg: () => checks(['الدخول بالنفاذ الوطني','إنشاء ملفك في البوابة','إضافة «طائرة بدون طيار جديدة»','اختيار فئة التشغيل'],'بوابة الطائرات بدون طيار · uas.gaca.gov.sa'),
  rpc: () => `<rect width="640" height="360" fill="url(#grid)"/>`+G(`<rect x="170" y="60" width="300" height="200" rx="16" fill="${C.pan}" stroke="${C.sand}" stroke-width="2"/><rect x="182" y="72" width="276" height="176" rx="10" fill="none" stroke="${C.line}"/>`+T(320,108,'شهادة الطيار عن بعد',{fs:20,w:700,c:C.sand})+T(320,132,'Remote Pilot Certificate',{fs:12,mono:1,c:C.mut})+`<g stroke="${C.line}" stroke-width="6" stroke-linecap="round"><line x1="230" y1="170" x2="380" y2="170"/><line x1="250" y1="196" x2="380" y2="196"/></g>`,.2)+
    G(`<g transform="translate(420 214)"><circle r="30" fill="${C.ok}" fill-opacity=".15" stroke="${C.ok}" stroke-width="3"/><path d="M-12 0l8 9 16-18" fill="none" stroke="${C.ok}" stroke-width="4" stroke-linecap="round"/></g>`,1.6)+G(T(320,305,'اختبار معرفة إلكتروني ← الشهادة في حسابك',{fs:17,dir:'rtl'}),2.4),
  alt120: () => ground(310)+`<g stroke="${C.mut}" stroke-width="1.5">${[0,1,2,3,4].map(i=>`<line x1="92" y1="${310-i*50}" x2="104" y2="${310-i*50}"/>`).join('')}<line x1="98" y1="310" x2="98" y2="90"/></g>`+
    `<line x1="80" y1="100" x2="600" y2="100" stroke="${C.sig}" stroke-width="2.5" stroke-dasharray="10 7"/>`+T(560,88,'١٢٠ م ≈ ٤٠٠ قدم',{fs:17,c:C.sig,w:600,dir:'rtl'})+
    `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -165;0 -150" keyTimes="0;.75;1" dur="3s" fill="freeze"/>${quadSide(320,290,.9)}</g>`+G(T(320,346,'لا تتجاوز الحد إلا بتصريح',{fs:16,c:C.txt,dir:'rtl'}),2.6)+
    G(`<g transform="translate(530 200)" fill="none" stroke="${C.sand}" stroke-width="3"><circle r="18"/>${[0,60,120,180,240,300].map(a=>`<line x1="${Math.cos(a*Math.PI/180)*25}" y1="${Math.sin(a*Math.PI/180)*25}" x2="${Math.cos(a*Math.PI/180)*33}" y2="${Math.sin(a*Math.PI/180)*33}"/>`).join('')}</g>`+T(530,258,'نهاراً',{fs:15,c:C.sand}),1.2),
  privacy: () => `<rect width="640" height="360" fill="url(#grid)"/>`+G(`<g transform="translate(220 190)" fill="none" stroke="${C.txt}" stroke-width="3"><path d="M-70 0 L0 -60 L70 0"/><rect x="-55" y="0" width="110" height="80"/><rect x="-14" y="30" width="28" height="50"/><rect x="-44" y="14" width="22" height="18"/><rect x="22" y="14" width="22" height="18"/></g>`,.2)+
    G(`<g transform="translate(440 170)"><rect x="-46" y="-30" width="92" height="62" rx="10" fill="${C.pan}" stroke="${C.sand}" stroke-width="3"/><circle r="18" fill="none" stroke="${C.sand}" stroke-width="3"/><rect x="-18" y="-42" width="30" height="12" rx="3" fill="${C.sand}"/><circle r="64" fill="none" stroke="${C.bad}" stroke-width="7"/><line x1="-45" y1="45" x2="45" y2="-45" stroke="${C.bad}" stroke-width="7"/></g>`,1)+G(T(320,320,'لا تصوير للناس أو البيوت بدون إذن',{fs:18,dir:'rtl'}),1.8),
  'check-env': () => checks(['الطقس ضمن الحدود','المنطقة خالية ومصرّح بها','مهبط طوارئ محدد'],'١ · البيئة'),
  'check-air': () => checks(['الأذرع مثبتة','المراوح سليمة ومركّبة صح','البطارية مشحونة وغير منتفخة'],'٢ · الطائرة'),
  'check-sys': () => checks(['جهاز التحكم والوضع','Failsafe مضبوط','الأقمار كافية','«جاهز للإقلاع»'],'٣ · الأنظمة ← ٤ · الإعلان'),
  'sticks-2': () => sticks(['THROTTLE ↕','YAW ↔'],['PITCH ↕','ROLL ↔'],'l')+T(320,40,'Mode 2',{fs:22,mono:1,w:600,c:C.sand}),
  'sticks-2r': () => sticks(['THROTTLE ↕','YAW ↔'],['PITCH ↕','ROLL ↔'],'r')+T(320,40,'Mode 2',{fs:22,mono:1,w:600,c:C.sand}),
  'grip-thumbs': () => `<rect width="640" height="360" fill="url(#grid)"/>`+ctrlTop(320,200,1.15,'thumbs')+T(320,46,'مسكة الإبهام · Thumbs',{fs:22,w:600,c:C.sand}),
  'grip-pinch': () => `<rect width="640" height="360" fill="url(#grid)"/>`+ctrlTop(320,210,1.1,'pinch')+T(320,46,'مسكة القرصة · Pinch',{fs:22,w:600,c:C.sig}),
  'grip-tip': () => gripTip(),
  'grip-posture': () => gripPosture(),
  'grip-antenna': () => gripAntenna(),
  'sticks-1': () => sticks(['PITCH ↕','YAW ↔'],['THROTTLE ↕','ROLL ↔'],'r')+T(320,40,'Mode 1',{fs:22,mono:1,w:600,c:C.sand}),
  'mode-angle': () => ground(300)+`<g><animateTransform attributeName="transform" type="rotate" values="0 320 170;-25 320 170;-25 320 170;0 320 170" keyTimes="0;.25;.5;.8" dur="4s" repeatCount="indefinite"/>${quadSide(320,170,1.5)}</g>`+T(320,60,'Angle',{fs:22,mono:1,w:600,c:C.sand})+T(320,330,'تترك العصا ← ترجع مستوية',{fs:16,c:C.mut,dir:'rtl'}),
  'mode-gps': () => ground(300)+windLines(6,1)+quadSide(320,170,1.5,-12)+T(320,60,'GPS',{fs:22,mono:1,w:600,c:C.sand})+`<circle cx="320" cy="170" r="70" fill="none" stroke="${C.ok}" stroke-dasharray="6 6"/>`+T(320,330,'ريح، والطائرة ثابتة',{fs:16,c:C.mut,dir:'rtl'}),
  'mode-acro': () => ground(300)+`<g><animateTransform attributeName="transform" type="rotate" values="0 320 170;-35 320 170" dur="1.2s" fill="freeze"/>${quadSide(320,170,1.5)}</g>`+T(320,60,'Acro',{fs:22,mono:1,w:600,c:C.sig})+T(320,330,'تبقى على الزاوية',{fs:16,c:C.mut,dir:'rtl'}),
  'mode-rth': () => `<rect width="640" height="360" fill="url(#grid)"/>`+pad(140,250,'H',40)+pathScene('M520 90 C 420 90 300 150 140 245',460,3.5)+T(320,60,'RTH',{fs:22,mono:1,w:600,c:C.ok}),
  ladder: () => ['تحويم','مربع','بوابات','هبوط','رياح'].map((s,i)=>G(`<rect x="${470-i*90}" y="${270-i*42}" width="80" height="${50+i*42}" rx="8" fill="${C.pan}" stroke="${i===4?C.sand:C.line}"/>`+T(510-i*90,300-i*42,s,{fs:15,c:i===4?C.sand:C.txt}),.3+i*.6)).join(''),
  nosein: () => icon.person(320,320)+`<g transform="rotate(180 320 140)">${quadTop(320,140,1)}</g>`+arrow(260,140,180,140,C.sig,4,.6)+arrow(380,140,460,140,C.ok,4,.6)+G(T(470,100,'Roll يمين',{fs:14,mono:1,c:C.ok})+T(170,100,'تتحرك يسارك',{fs:14,c:C.sig,dir:'rtl'}),1),
  hud: () => hudMock(false), 'hud-sig': () => hudMock(true),
  takeoff: () => ground(300)+pad(320,302,'H',60)+`<line x1="120" y1="190" x2="520" y2="190" stroke="${C.ok}" stroke-dasharray="8 8"/>`+T(560,195,'3 m',{fs:15,mono:1,c:C.ok})+`<g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -105" keyTimes="0;.3;1" dur="3s" fill="freeze"/>${quadSide(320,292,1.3)}</g>`,
  hover: () => `<rect width="640" height="360" fill="url(#grid)"/><circle cx="320" cy="180" r="90" fill="${C.ok}" fill-opacity=".06" stroke="${C.ok}" stroke-dasharray="6 6"/>`+T(320,300,'⌀ 1 m',{fs:15,mono:1,c:C.ok})+`<g><animateTransform attributeName="transform" type="translate" values="0 0;14 -8;-10 6;6 10;-12 -6;0 0" dur="3s" repeatCount="indefinite"/>${quadTop(320,180,.8)}</g>`,
  'man-box': () => pathScene('M220 260 L220 100 L420 100 L420 260 Z',720,5,'BOX'),
  'man-orbit': () => `<circle cx="320" cy="180" r="8" fill="${C.sand}"/>`+pathScene('M320 60 A120 120 0 1 1 319.9 60',754,5,'ORBIT'),
  'man-eight': () => pathScene('M320 180 C 400 80 520 80 520 180 C 520 280 400 280 320 180 C 240 80 120 80 120 180 C 120 280 240 280 320 180',1000,6,'FIGURE 8'),
  land: () => ground(300)+pad(420,302,'L',60)+`<g><animateTransform attributeName="transform" type="translate" values="-260 -150;0 -150;0 -150;0 0" keyTimes="0;.45;.55;1" dur="5s" fill="freeze"/>${quadSide(420,292,1.2)}</g>`,
  'land-last': () => ground(300)+pad(320,302,'L',60)+`<rect x="200" y="240" width="240" height="58" fill="${C.sig}" fill-opacity=".08"/>`+T(470,270,'المتر الأخير',{a:'start',fs:15,c:C.sig,dir:'rtl'})+`<g><animateTransform attributeName="transform" type="translate" values="0 -150;0 -60;0 0" keyTimes="0;.4;1" dur="5s" fill="freeze"/>${quadSide(320,292,1.2)}</g>`,
  disarm: () => ground(300)+quadSide(320,288,1.4)+G(`<rect x="230" y="110" width="180" height="50" rx="12" fill="${C.ok}" fill-opacity=".15" stroke="${C.ok}"/>`+T(320,143,'DISARMED',{fs:20,mono:1,w:600,c:C.ok}),1.4),
  wind: () => windLines(7,1.1)+quadSide(340,180,1.6,-16)+T(320,330,'الطائرة تميل ضد الريح',{fs:16,c:C.mut,dir:'rtl'}),
  gust: () => windLines(7,1,0,true)+`<g><animateTransform attributeName="transform" type="translate" values="0 0;30 4;-6 0;24 -4;0 0" dur="1.8s" repeatCount="indefinite"/>${quadSide(340,180,1.6,-12)}</g>`+T(320,330,'هبّات مفاجئة',{fs:16,c:C.sig,dir:'rtl'}),
  headwind: () => pad(120,250,'H',36)+`<path d="M140 240 C 300 140 420 140 540 120" fill="none" stroke="${C.ok}" stroke-width="3" marker-end="url(#ah-7cd39b)"/>`+G(`<path d="M530 140 C 420 170 300 190 150 250" fill="none" stroke="${C.sig}" stroke-width="3" marker-end="url(#ah-ff8f45)"/>`+T(330,235,'العودة ضد الريح = وقت أطول',{fs:16,c:C.sig,dir:'rtl'}),1.2)+windLines(4,1.6),
  heat: () => `<g transform="translate(180 180)"><rect x="-14" y="-90" width="28" height="150" rx="14" fill="none" stroke="${C.sand}" stroke-width="3"/><circle cy="80" r="26" fill="${C.bad}"/><rect x="-6" y="0" width="12" height="70" fill="${C.bad}"><animate attributeName="y" from="60" to="-70" dur="2s" fill="freeze"/><animate attributeName="height" from="10" to="140" dur="2s" fill="freeze"/></rect></g>`+
    `<g>${Array.from({length:24},(_,i)=>`<circle cx="${330+(i%6)*45}" cy="${90+Math.floor(i/6)*45}" r="5" fill="${C.sand}"><animate attributeName="opacity" values="1;${i%2?.15:1}" dur="2s" fill="freeze"/></circle>`).join('')}</g>`+G(T(440,320,'هواء أخف ← دفع أكثر',{fs:16,c:C.mut,dir:'rtl'}),2),
  brief: () => ['إيجاز','تنفيذ','استخلاص'].map((s,i)=>G(`<rect x="${430-i*180}" y="140" width="150" height="80" rx="14" fill="${C.pan}" stroke="${C.sand}"/>`+T(505-i*180,188,s,{fs:20,w:600})+(i<2?arrow(425-i*180,180,390-i*180,180,C.dim,3,0):''),.3+i*.8)).join(''),
  'brief-q': () => ['الهدف؟','المنطقة؟','المسار والارتفاع؟','المخاطر؟','خطة الطوارئ؟'].map((s,i)=>G(`<rect x="${[90,330,150,380,240][i]}" y="${[70,90,170,190,270][i]}" width="${s.length*14+40}" height="46" rx="23" fill="${C.pan}" stroke="${C.sand}"/>`+T([90,330,150,380,240][i]+(s.length*14+40)/2,[70,90,170,190,270][i]+30,s,{fs:17,dir:'rtl'}),.3+i*.6)).join(''),
  budget: () => { const seg=[['ذهاب',.18,C.dim],['عودة',.22,C.sig],['احتياطي',.25,C.bad],['فوق الهدف',.35,C.ok]]; let x=560,out=''; seg.forEach(([l,w,c],i)=>{ const W=w*480; x-=W; out+=G(`<rect x="${x}" y="150" width="${W}" height="60" fill="${c}" fill-opacity=".35" stroke="${c}"/>`+T(x+W/2,186,l,{fs:15,dir:'rtl'})+T(x+W/2,236,Math.round(w*100)+'%',{fs:14,mono:1,c}),.3+i*.7); }); return out+T(320,100,'ميزانية البطارية',{fs:22,w:600,c:C.sand}); },
  'em-link': () => alertCard('انقطاع الاتصال','Failsafe ← العودة للمنزل',`<g stroke="${C.sig}" stroke-width="3" fill="none"><path d="M-14 6a20 20 0 0 1 28 0M-22-2a30 30 0 0 1 44 0"/><line x1="-20" y1="-16" x2="20" y2="20"/></g>`),
  'em-bat': () => alertCard('بطارية منخفضة','أنهِ المهمة · أقصر مسار آمن',`<g stroke="${C.sig}" stroke-width="3" fill="none"><rect x="-12" y="-20" width="24" height="40" rx="4"/><rect x="-7" y="8" width="14" height="8" fill="${C.sig}"/></g>`),
  'em-gps': () => alertCard('فقدان GPS','انتقل لليدوي وثبّت بالعصي',`<g stroke="${C.sig}" stroke-width="3" fill="none"><circle r="16"/><line x1="0" y1="-24" x2="0" y2="24"/><line x1="-24" y1="0" x2="24" y2="0"/></g>`),
  'em-fly': () => alertCard('انفلات الطائرة','غيّر الوضع · فعّل العودة · بلّغ',`<g stroke="${C.sig}" stroke-width="3" fill="none"><path d="M-16 10L0-16L16 10Z"/><line x1="0" y1="-4" x2="0" y2="4"/></g>`),
  phon: () => [['A','Alpha'],['B','Bravo'],['C','Charlie'],['D','Delta']].map(([l,w],i)=>`<g transform="translate(${110+i*140} 180)"><rect x="-55" y="-70" width="110" height="140" rx="14" fill="${C.pan}" stroke="${C.line}"/><text y="10" text-anchor="middle" font-family="IBM Plex Mono" font-size="56" font-weight="600" fill="${C.sand}">${l}<animate attributeName="opacity" to="0" begin="${.6+i*.8}s" dur=".3s" fill="freeze"/></text><text y="8" text-anchor="middle" font-family="IBM Plex Mono" font-size="22" fill="${C.ok}" opacity="0">${w}<animate attributeName="opacity" to="1" begin="${.9+i*.8}s" dur=".3s" fill="freeze"/></text></g>`).join(''),
  radio: () => bubbles([['Roger','تم الاستلام'],['Wilco','استلمت وسأنفّذ'],['Say again','أعد']]),
  overout: () => G(`<rect x="90" y="120" width="200" height="110" rx="20" fill="${C.pan}" stroke="${C.sand}"/>`+T(190,170,'Over',{fs:30,mono:1,w:600,c:C.sand})+T(190,205,'أنتظر ردك',{fs:15,c:C.mut}),.2)+G(T(320,185,'≠',{fs:44,c:C.mut}),.9)+G(`<rect x="350" y="120" width="200" height="110" rx="20" fill="${C.pan}" stroke="${C.bad}"/>`+T(450,170,'Out',{fs:30,mono:1,w:600,c:C.bad})+T(450,205,'انتهى الاتصال',{fs:15,c:C.mut}),1.4),
  eval: () => checks(['قائمة الفحص بصوت مسموع','ترتيب ثابت كل مرة','هدوء ودقة'],'التقييم العملي'),
  announce: () => ['«تسليح»','«إقلاع»','«هبوط»'].map((s,i)=>G(`<rect x="${410-i*170}" y="140" width="150" height="70" rx="35" fill="${C.pan}" stroke="${C.sand}"/>`+T(485-i*170,184,s,{fs:22,w:600,c:C.sand}),.3+i*1)).join('')
};
function partScene(k){
  const P = {fc:['وحدة التحكم','Flight Controller','العقل',[320,180]], imu:['IMU + GPS','Sensors','الإحساس',[320,150]], motor:['محركات + ESC + مراوح','Propulsion','العضلات',[452,48]], bat:['البطارية','LiPo','القلب',[320,210]]}[k];
  const [ar,en,role,[hx,hy]] = P;
  return quadTop(320,180,1.9)+`<circle cx="${hx}" cy="${hy}" r="34" fill="none" stroke="${C.sig}" stroke-width="3"><animate attributeName="r" values="28;40;28" dur="1.4s" repeatCount="indefinite"/></circle>`+
    G(`<rect x="20" y="40" width="190" height="96" rx="14" fill="${C.pan}" stroke="${C.sig}"/>`+T(115,76,ar,{fs:17,w:600,dir:'rtl'})+T(115,100,en,{fs:13,mono:1,c:C.dim})+T(115,124,'= '+role,{fs:15,c:C.sig,dir:'rtl'}),.5);
}

// ---------- player ----------
window.MotionPlayer = function(root, lesson){
  const scenes = lesson.scenes || [];
  const lens = scenes.map(s => (s.say||'').length + 8), totLen = lens.reduce((a,b)=>a+b,0) || 1;
  const audio = new Audio(); audio.preload = 'metadata';
  let hasAudio = false, duration = totLen/13.5, t = 0, playing = false, idx = -1, raf = 0, last = 0, muted = false;
  const src = lesson.audio_url || (window.KU.SUPABASE_URL + '/storage/v1/object/public/audio/' + lesson.id + '.mp3');
  root.innerHTML = `<div class="mp">
    <div class="mp-stage"><svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid meet" aria-hidden="true"></svg>
      <div class="mp-cap"></div>
      <button class="mp-big" aria-label="تشغيل"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="23" fill="#0b100dcc" stroke="#d8bf86"/><path d="M19 15l14 9-14 9z" fill="#d8bf86"/></svg><span>شاهد الدرس</span></button>
    </div>
    <div class="mp-bar">
      <button class="mp-play" aria-label="تشغيل/إيقاف"></button>
      <div class="mp-segs">${scenes.map(()=>'<i><b></b></i>').join('')}</div>
      <span class="mp-time mono">0:00</span>
      <button class="mp-mute" aria-label="كتم الصوت"></button>
      <button class="mp-sub on" aria-label="الترجمة">CC</button>
    </div></div>`;
  const svg = root.querySelector('svg'), cap = root.querySelector('.mp-cap'), big = root.querySelector('.mp-big'), segs = [...root.querySelectorAll('.mp-segs i')];
  const playB = root.querySelector('.mp-play'), muteB = root.querySelector('.mp-mute'), subB = root.querySelector('.mp-sub'), timeEl = root.querySelector('.mp-time');
  const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>', ICON_PAUSE = '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg>';
  const ICON_VOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>', ICON_MUTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  playB.innerHTML = ICON_PLAY; muteB.innerHTML = ICON_VOL;
  const bounds = () => { let acc = 0; return lens.map(l => (acc += l/totLen*duration)); };
  let B = bounds();
  audio.addEventListener('loadedmetadata', () => { if(isFinite(audio.duration) && audio.duration > 1){ hasAudio = true; duration = audio.duration; B = bounds(); } });
  audio.addEventListener('ended', () => { stop(true); });
  audio.addEventListener('error', () => { hasAudio = false; });
  audio.src = src;
  function show(i){
    if(i === idx || i < 0 || i >= scenes.length) return; idx = i; const s = scenes[i];
    const fn = V[s.v] || V.points;
    svg.innerHTML = defs() + `<rect width="640" height="360" fill="url(#vig)"/>` + fn(s);
    try { svg.setCurrentTime(0); svg.unpauseAnimations && (playing ? svg.unpauseAnimations() : svg.pauseAnimations()); } catch(e){}
    cap.textContent = (s.v === 'points' || s.v === 'title') ? '' : (s.cap || ''); 
    cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
  }
  function tick(){
    const now = performance.now();
    if(hasAudio){ t = audio.currentTime; } else { t += (now - last)/1000; }
    last = now;
    let i = B.findIndex(b => t < b); if(i < 0) i = scenes.length - 1;
    show(i);
    segs.forEach((sg, k) => { const st = k ? B[k-1] : 0, en = B[k]; sg.firstChild.style.width = Math.max(0, Math.min(1, (t-st)/(en-st)))*100 + '%'; });
    const sec = Math.floor(t); timeEl.textContent = Math.floor(sec/60) + ':' + String(sec%60).padStart(2,'0');
    if(!hasAudio && t >= duration){ stop(true); return; }
    if(playing) raf = requestAnimationFrame(tick);
  }
  function play(){
    if(t >= duration - .05){ t = 0; idx = -1; if(hasAudio) audio.currentTime = 0; }
    playing = true; big.hidden = true; playB.innerHTML = ICON_PAUSE; last = performance.now();
    if(hasAudio || audio.readyState === 0){ audio.muted = muted; audio.play().then(()=>{ hasAudio = isFinite(audio.duration) && audio.duration > 1; if(hasAudio){ duration = audio.duration; B = bounds(); } }).catch(()=>{ hasAudio = false; }); }
    try { svg.unpauseAnimations(); } catch(e){}
    cancelAnimationFrame(raf); tick();
  }
  function stop(ended){
    playing = false; playB.innerHTML = ICON_PLAY; try { audio.pause(); svg.pauseAnimations(); } catch(e){}
    cancelAnimationFrame(raf);
    if(ended){ big.hidden = false; big.querySelector('span').textContent = 'أعد المشاهدة'; segs.forEach(s => s.firstChild.style.width = '100%'); root.dispatchEvent(new CustomEvent('ended')); }
  }
  big.onclick = play;
  playB.onclick = () => playing ? stop() : play();
  muteB.onclick = () => { muted = !muted; audio.muted = muted; muteB.innerHTML = muted ? ICON_MUTE : ICON_VOL; };
  subB.onclick = () => { subB.classList.toggle('on'); cap.hidden = !subB.classList.contains('on'); };
  segs.forEach((sg, k) => sg.onclick = () => { t = k ? B[k-1] : 0; if(hasAudio) audio.currentTime = t; idx = -1; if(!playing) play(); else tick(); });
  show(0); try { svg.pauseAnimations(); } catch(e){}
  return { destroy(){ stop(); audio.src = ''; } };
};
})();
