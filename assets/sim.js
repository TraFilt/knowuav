// Know UAV — 3D flight trainer (keyboard, PlayStation/Xbox gamepad, touch)
window.MISSIONS=[
 {id:'free',title:'طيران حر',brief:'طِر بحرية في الميدان. جرّب المحاور الأربعة وأوضاع الكاميرا.',free:true,par:0},
 {id:'hover',title:'الإقلاع والتحويم',brief:'أقلع وحوّم فوق المهبط على ارتفاع ٣ أمتار لمدة ٥ ثوانٍ متصلة.',free:true,par:20},
 {id:'box',title:'المربع',brief:'مرّ على النقاط الأربع بالترتيب على ارتفاع ٤ أمتار.',par:45},
 {id:'gates',title:'البوابات',brief:'مرّ من داخل البوابات الست بالترتيب.',par:60},
 {id:'land',title:'الهبوط الدقيق',brief:'طِر إلى المهبط البعيد واهبط في مركزه بهدوء.',par:40},
 {id:'wind',title:'تحويم مع رياح',brief:'ابقَ داخل الكرة لمدة ١٥ ثانية مع رياح وهبّات متغيرة.',par:35},
 {id:'rth',title:'العودة ببطارية منخفضة',brief:'البطارية ١٨٪ وأنت بعيد. عُد واهبط على مهبط المنزل قبل نفادها.',par:50}
];
window.Sim=(()=>{
 let ok=typeof THREE!=='undefined',inited=false,running=false,raf=0;
 let renderer,scene,camera,drone,props=[],markers,clock,wind=new THREE_V(),last=0;
 function THREE_V(){return ok?new THREE.Vector3():{x:0,y:0,z:0}}
 const S={pos:null,vel:null,yaw:0,pitch:0,roll:0,armed:false,bat:100,t:0,state:'idle',onGround:true};
 const IN={thr:0,yaw:0,pitch:0,roll:0,src:'—'};
 const keys={};const kv={thr:0,yaw:0,pitch:0,roll:0};
 const touch={l:{x:0,y:0},r:{x:0,y:0}};
 let mission=MISSIONS[0],M={},padPrev=[];
 const OBST=[{x:-14,z:-6,w:5,h:7,d:5},{x:18,z:8,w:6,h:10,d:4},{x:-22,z:16,w:4,h:5,d:8},{x:6,z:26,w:8,h:4,d:3},{x:-30,z:-28,w:6,h:12,d:6},{x:32,z:-6,w:3,h:6,d:3}];
 const LAND_PAD={x:-18,z:-32},HOME={x:0,z:0};
 const opt={level:1,mode:2,cam:'chase'};
 const COARSE=matchMedia('(pointer:coarse)').matches;
 let locked=false,full=0,introShown=false;
 const hud={};

 function texGround(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#b59b6a';x.fillRect(0,0,256,256);
  for(let i=0;i<900;i++){x.fillStyle=`rgba(${80+Math.random()*60},${60+Math.random()*40},${30+Math.random()*30},${Math.random()*.18})`;x.fillRect(Math.random()*256,Math.random()*256,2+Math.random()*3,2+Math.random()*3)}
  x.strokeStyle='rgba(60,45,20,.35)';x.lineWidth=2;x.strokeRect(0,0,256,256);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(80,80);t.anisotropy=4;t.encoding=THREE.sRGBEncoding;return t}
 function texPad(label){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#2a2f2b';x.beginPath();x.arc(128,128,124,0,7);x.fill();
  x.strokeStyle='#f2ead2';x.lineWidth=8;x.beginPath();x.arc(128,128,108,0,7);x.stroke();x.fillStyle='#f2ead2';x.font='bold 120px IBM Plex Mono, monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(label,128,136);
  const tx=new THREE.CanvasTexture(c);tx.encoding=THREE.sRGBEncoding;return tx}
 function pad(px,pz,label,size=3){const m=new THREE.Mesh(new THREE.CircleGeometry(size/2,40),new THREE.MeshStandardMaterial({map:texPad(label),roughness:.9}));m.rotation.x=-Math.PI/2;m.position.set(px,0.02,pz);m.receiveShadow=true;scene.add(m);return m}

 function build(){
  const bay=$('#simbay');
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(COARSE?1.5:2,devicePixelRatio||1));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputEncoding=THREE.sRGBEncoding;bay.prepend(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color('#c9c3ad');scene.fog=new THREE.Fog('#c9c3ad',60,240);
  camera=new THREE.PerspectiveCamera(65,1,0.05,500);
  scene.add(new THREE.HemisphereLight('#e9e6dc','#7a6643',0.85));
  const sun=new THREE.DirectionalLight('#fff2d6',1.1);sun.position.set(-40,60,25);sun.castShadow=true;sun.shadow.mapSize.set(COARSE?1024:2048,COARSE?1024:2048);
  Object.assign(sun.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:200});scene.add(sun);
  const g=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({map:texGround(),roughness:1}));g.rotation.x=-Math.PI/2;g.receiveShadow=true;scene.add(g);
  // runway strip
  const rw=new THREE.Mesh(new THREE.PlaneGeometry(8,90),new THREE.MeshStandardMaterial({color:'#5b5a52',roughness:.95}));rw.rotation.x=-Math.PI/2;rw.position.set(40,0.01,-20);rw.receiveShadow=true;scene.add(rw);
  for(let i=0;i<9;i++){const d=new THREE.Mesh(new THREE.PlaneGeometry(.5,4),new THREE.MeshBasicMaterial({color:'#e8e2cc'}));d.rotation.x=-Math.PI/2;d.position.set(40,0.02,-58+i*10);scene.add(d)}
  pad(HOME.x,HOME.z,'H',3);pad(LAND_PAD.x,LAND_PAD.z,'L',2.4);
  const om=new THREE.MeshStandardMaterial({color:'#8b8471',roughness:.9});
  OBST.forEach(o=>{const b=new THREE.Mesh(new THREE.BoxGeometry(o.w,o.h,o.d),om);b.position.set(o.x,o.h/2,o.z);b.castShadow=b.receiveShadow=true;scene.add(b)});
  // scattered shrubs & masts
  const sm=new THREE.MeshStandardMaterial({color:'#6b6a3c',roughness:1});
  for(let i=0;i<70;i++){const r=20+Math.random()*120,a=Math.random()*7;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(x-40)<7&&z<30&&z>-70)continue;const s=new THREE.Mesh(new THREE.SphereGeometry(.5+Math.random()*.9,7,5),sm);s.position.set(x,.3,z);s.scale.y=.6;s.castShadow=true;scene.add(s)}
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,6,8),new THREE.MeshStandardMaterial({color:'#444'}));mast.position.set(6,3,6);scene.add(mast);
  const sock=new THREE.Mesh(new THREE.ConeGeometry(.3,1.6,10,1,true),new THREE.MeshStandardMaterial({color:'#ff8f45',side:THREE.DoubleSide}));sock.rotation.z=Math.PI/2;sock.position.set(6.8,5.8,6);sock.name='sock';scene.add(sock);
  // drone
  drone=new THREE.Group();const dm=new THREE.MeshStandardMaterial({color:'#2d3530',roughness:.6,metalness:.2});
  const body=new THREE.Mesh(new THREE.BoxGeometry(.26,.08,.32),dm);body.castShadow=true;drone.add(body);
  const top=new THREE.Mesh(new THREE.BoxGeometry(.16,.05,.2),new THREE.MeshStandardMaterial({color:'#d8bf86',roughness:.5}));top.position.y=.06;drone.add(top);
  const armG=new THREE.BoxGeometry(.62,.025,.04);
  const a1=new THREE.Mesh(armG,dm);a1.rotation.y=Math.PI/4;a1.castShadow=true;drone.add(a1);const a2=a1.clone();a2.rotation.y=-Math.PI/4;drone.add(a2);
  const motG=new THREE.CylinderGeometry(.035,.035,.05,12),motM=new THREE.MeshStandardMaterial({color:'#9a9a90',metalness:.6,roughness:.3});
  const propM=new THREE.MeshBasicMaterial({color:'#e8e2cc',transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false});
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{const p=new THREE.Vector3(sx*.22,.02,sz*.22);const m=new THREE.Mesh(motG,motM);m.position.copy(p);m.castShadow=true;drone.add(m);
   const pr=new THREE.Mesh(new THREE.CircleGeometry(.13,24),propM);pr.rotation.x=-Math.PI/2;pr.position.set(p.x,.055,p.z);drone.add(pr);
   const blade=new THREE.Mesh(new THREE.BoxGeometry(.25,.004,.025),new THREE.MeshStandardMaterial({color:'#1c1f1d'}));blade.position.set(p.x,.058,p.z);drone.add(blade);props.push(blade)});
  const fl=new THREE.Mesh(new THREE.BoxGeometry(.06,.03,.02),new THREE.MeshBasicMaterial({color:'#ff3b2f'}));fl.position.set(0,0,-.17);drone.add(fl);
  const rl=new THREE.Mesh(new THREE.BoxGeometry(.06,.03,.02),new THREE.MeshBasicMaterial({color:'#4cff7a'}));rl.position.set(0,0,.17);drone.add(rl);
  drone.rotation.order='YXZ';scene.add(drone);
  markers=new THREE.Group();scene.add(markers);
  S.pos=new THREE.Vector3();S.vel=new THREE.Vector3();wind=new THREE.Vector3();clock=new THREE.Clock();
  new ResizeObserver(resize).observe(bay);resize();
  ['alt','spd','vs','bat','batbar','t','home','obj','objst','arm','sl','sr','hzg'].forEach(k=>hud[k]=document.getElementById('h-'+k));
  setupInput();setupFull();renderMissions();keysHelp();
  start(MISSIONS[1]);intro();
 }
 function resize(){const b=$('#simbay');const w=b.clientWidth,h=b.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();touchVis()}

 /* ---- missions ---- */
 const best=()=>window.SIM_BEST||(window.SIM_BEST={});
 function renderMissions(){const b=best();$('#mlist').innerHTML=MISSIONS.map(m=>`<button class="mbtn ${m===mission?'on':''} ${isLocked(m)?'lk':''}" data-m="${m.id}"><b>${isLocked(m)?'🔒 ':''}${m.title}</b><span>${m.par?'هدف '+m.par+' ث':''}</span>${b[m.id]?`<em>أفضل وقت ${b[m.id].toFixed(1)} ث</em>`:''}</button>`).join('');
  $('#mlist').onclick=e=>{const x=e.target.closest('.mbtn');if(x){pick(MISSIONS.find(m=>m.id===x.dataset.m));x.blur()}}}
 function isLocked(m){return locked&&!m.free}
 function pick(m){if(isLocked(m))return showLocked(m);start(m);if(!full)goFull()}
 function ringAt(x,y,z,r,color='#ff8f45'){const m=new THREE.Mesh(new THREE.TorusGeometry(r,.06,8,48),new THREE.MeshBasicMaterial({color}));m.position.set(x,y,z);m.rotation.x=Math.PI/2;markers.add(m);return m}
 function ballAt(x,y,z,r,color='#ff8f45',op=.25){const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),new THREE.MeshBasicMaterial({color,transparent:true,opacity:op,depthWrite:false}));m.position.set(x,y,z);markers.add(m);return m}
 function gateAt(x,y,z,ry){const g=new THREE.Group();const mt=new THREE.MeshStandardMaterial({color:'#ff8f45',emissive:'#5a2a08'});
  const w=3,h=2.2,t=.14;[[0,h/2,w,t],[0,-h/2,w,t],[-w/2,0,t,h],[w/2,0,t,h]].forEach(([px,py,sx,sy])=>{const b=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,t),mt);b.position.set(px,py,0);b.castShadow=true;g.add(b)});
  const leg=new THREE.Mesh(new THREE.BoxGeometry(.1,y-h/2,.1),new THREE.MeshStandardMaterial({color:'#444'}));leg.position.set(0,-(y)/2-h/4+ .0,0);leg.position.y=-(h/2)-(y-h/2)/2;g.add(leg);
  g.position.set(x,y,z);g.rotation.y=ry;markers.add(g);return g}
 function clearMarkers(){while(markers.children.length)markers.remove(markers.children[0])}
 function start(m){
  if(isLocked(m))return showLocked(m);
  mission=m;M={hold:0,i:0,objs:[]};clearMarkers();S.state='fly';S.t=0;S.bat=100;S.armed=false;S.yaw=0;S.pitch=S.roll=0;S.vel.set(0,0,0);S.pos.set(0,.06,0);S.onGround=true;wind.set(0,0,0);
  $('#over').hidden=true;
  if(m.id==='hover'){M.objs.push(ringAt(0,3,0,1.5));M.objs.push(ballAt(0,3,0,.7,'#d8bf86',.12))}
  if(m.id==='box'){M.pts=[[10,4,-10],[10,4,10],[-10,4,10],[-10,4,-10]].map(p=>({p:new THREE.Vector3(...p),o:ballAt(...p,1.6)}));}
  if(m.id==='gates'){const G=[[0,3,-12,0],[8,3.5,-24,-.6],[20,4,-30,-1.4],[28,3,-18,-2.6],[22,3,-4,-3.6],[10,3.5,6,-4.6]];M.pts=G.map(g=>({p:new THREE.Vector3(g[0],g[1],g[2]),o:gateAt(...g)}))}
  if(m.id==='land'){M.objs.push(ringAt(LAND_PAD.x,.08,LAND_PAD.z,1.2,'#7cd39b'));const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,12,6),new THREE.MeshBasicMaterial({color:'#7cd39b',transparent:true,opacity:.5}));beacon.position.set(LAND_PAD.x,6,LAND_PAD.z);markers.add(beacon)}
  if(m.id==='wind'){M.objs.push(ballAt(0,4,-4,2,'#d8bf86',.15))}
  if(m.id==='rth'){S.pos.set(55,18,-60);S.onGround=false;S.armed=true;S.bat=18;S.yaw=Math.atan2(55,-60);M.objs.push(ringAt(0,.08,0,1.5,'#7cd39b'));const bc=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,20,6),new THREE.MeshBasicMaterial({color:'#7cd39b',transparent:true,opacity:.5}));bc.position.set(0,10,0);markers.add(bc)}
  markActive();renderMissions();
  {const ot=hud.obj.querySelector('.ot');ot.textContent=m.title;const ob=document.createElement('span');ob.className='ob';ob.textContent=': '+m.brief;ot.appendChild(ob);const hb=document.getElementById('h-brief');if(hb)hb.innerHTML='<b>'+m.title+'</b> · '+m.brief;}
  if(m.id!=='rth')flash('اضغط مسافة أو زر ✕ / A للتسليح');
 }
 function markActive(){if(!M.pts)return;M.pts.forEach((p,i)=>{const on=i===M.i;p.o.traverse(o=>{if(o.material&&o.material.color){o.material.color.set(i<M.i?'#7cd39b':on?'#ff8f45':'#8a7f66');if(o.material.opacity!==undefined&&o.material.transparent)o.material.opacity=on?.35:.15}})})}
 function flash(t){hud.objst.textContent=t}
 function win(){S.state='done';const t=S.t;const b=best();if(!b[mission.id]||t<b[mission.id]){b[mission.id]=t;window.onSimBest&&window.onSimBest(mission.id,t)}
  const st=mission.par?(t<=mission.par?3:t<=mission.par*1.6?2:1):3;
  over(`<div class="stars">${'★'.repeat(st)}${'☆'.repeat(3-st)}</div><h3>أُنجزت المهمة</h3><p>الزمن ${t.toFixed(1)} ثانية · البطارية المتبقية ${Math.round(S.bat)}٪</p>`);renderMissions()}
 function crash(why){if(S.state!=='fly')return;S.state='crash';S.armed=false;buzz();over(`<h3 style="color:var(--signal)">تحطّمت الطائرة</h3><p>${why}</p>`)}
 function over(html){const nx=MISSIONS[MISSIONS.indexOf(mission)+1];$('#overbox').innerHTML=html+`<div class="row" style="justify-content:center"><button class="btn pri" id="o-re">أعد المحاولة</button>${S.state==='done'&&nx?`<button class="btn" id="o-nx">المهمة التالية</button>`:''}</div><p class="note" style="margin-top:10px">${COARSE?'':'أو اضغط R / زر △ Y'}</p>`;$('#over').hidden=false;
  $('#o-re').onclick=()=>start(mission);const n=$('#o-nx');if(n)n.onclick=()=>start(nx)}

 function updMission(dt){
  const p=S.pos,id=mission.id;
  if(id==='free'){flash(S.armed?'طيران حر':'اضغط مسافة للتسليح');return}
  if(id==='hover'){const okz=Math.abs(p.y-3)<.7&&Math.hypot(p.x,p.z)<1.5;M.hold=okz?M.hold+dt:0;flash(`داخل المنطقة: ${M.hold.toFixed(1)} / 5.0 ث`);if(M.hold>=5)win()}
  if(id==='box'||id==='gates'){const tg=M.pts[M.i];const d=p.distanceTo(tg.p);flash(`النقطة ${M.i+1} من ${M.pts.length} · المسافة ${d.toFixed(0)} م`);if(d<(id==='gates'?1.3:1.6)){M.i++;markActive();if(M.i>=M.pts.length)win()}}
  if(id==='land'||id==='rth'){const P=id==='land'?LAND_PAD:HOME;const d=Math.hypot(p.x-P.x,p.z-P.z);flash(`إلى المهبط ${d.toFixed(1)} م · ارتفاع ${p.y.toFixed(1)} م`);
   if(S.onGround&&d<(id==='land'?1.2:1.5)&&S.vel.length()<.3&&S.t>1)win();
   if(id==='rth'&&S.bat<=0)crash('نفدت البطارية قبل الوصول. اختر أقصر مسار وحافظ على ارتفاع آمن.')}
  if(id==='wind'){const c=new THREE.Vector3(0,4,-4);const inz=p.distanceTo(c)<2;if(inz)M.hold+=dt;flash(`داخل الكرة: ${M.hold.toFixed(1)} / 15.0 ث · الريح ${wind.length().toFixed(1)} م/ث`);if(M.hold>=15)win()}
 }

 /* ---- input ---- */
 let padIdx=null,padName='';
 function setupInput(){
  addEventListener('keydown',e=>{if(!running)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))e.preventDefault();
   if(e.repeat)return;keys[e.code]=true;if(e.code==='Space')toggleArm();if(e.code==='KeyR')start(mission);if(e.code==='KeyC')cycleCam()});
  addEventListener('keyup',e=>{keys[e.code]=false});
  addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
  addEventListener('gamepadconnected',e=>{padIdx=e.gamepad.index;padName=e.gamepad.id;padSt()});
  addEventListener('gamepaddisconnected',e=>{if(e.gamepad.index===padIdx){padIdx=null;padSt()}});
  $('#s-level').onchange=e=>{opt.level=+e.target.value;e.target.blur()};
  $('#s-mode').onchange=e=>{opt.mode=+e.target.value;keysHelp();e.target.blur()};
  $('#s-cam').onchange=e=>{opt.cam=e.target.value;e.target.blur()};
  $('#s-touch').onchange=()=>touchVis();
  // touch sticks
  const bay=$('#simbay');
  ['l','r'].forEach(s=>{const z=document.createElement('div');z.className='touch '+s;z.innerHTML='<i></i>';z.id='t-'+s;bay.appendChild(z);
   let id=null;const knob=z.querySelector('i');
   const mv=e=>{const r=z.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2);const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}
    touch[s].x=x;touch[s].y=-y;knob.style.transform=`translate(${x*40}px,${y*40}px)`};
   z.addEventListener('pointerdown',e=>{id=e.pointerId;z.setPointerCapture(id);mv(e);e.preventDefault()});
   z.addEventListener('pointermove',e=>{if(e.pointerId===id)mv(e)});
   const up=e=>{if(e.pointerId!==id)return;id=null;touch[s].x=0;touch[s].y=0;knob.style.transform=''};z.addEventListener('pointerup',up);z.addEventListener('pointercancel',up)});
  const ab=document.createElement('button');ab.className='tbtn';ab.style.left='14px';ab.textContent='تسليح';ab.id='t-arm';ab.onclick=toggleArm;bay.appendChild(ab);
  const cb=document.createElement('button');cb.className='tbtn';cb.style.right='14px';cb.textContent='الكاميرا';cb.id='t-cam';cb.onclick=cycleCam;bay.appendChild(cb);
  touchVis();
 }
 function touchVis(){const v=$('#s-touch').value;const show=v==='on'||(v==='auto'&&matchMedia('(pointer:coarse)').matches);['t-l','t-r','t-arm','t-cam'].forEach(i=>{const e=document.getElementById(i);if(e)e.hidden=!show})}
 function padSt(){const e=$('#padst');if(padIdx!=null){e.textContent='متصلة: '+(padName.replace(/\(.*?\)/g,'').trim().slice(0,40)||'يد تحكم');e.classList.add('on')}else{e.textContent='لم تُوصل يد تحكم. وصّلها واضغط أي زر.';e.classList.remove('on')}}
 function keysHelp(){const m2=opt.mode===2;$('#keys').innerHTML=`<span class="kbd">${m2?'W / S':'↑ / ↓'}</span><span>الدفع: صعود ونزول</span><span class="kbd">A / D</span><span>الانعراج: دوران</span><span class="kbd">${m2?'↑ / ↓':'W / S'}</span><span>الميل الأمامي: تقدّم وتراجع</span><span class="kbd">← / →</span><span>الميل الجانبي</span><span class="kbd">مسافة</span><span>تسليح / فصل</span><span class="kbd">C</span><span>تبديل الكاميرا</span><span class="kbd">R</span><span>إعادة المهمة</span>`}
 function toggleArm(){if(S.state!=='fly')return;if(S.armed){if(S.onGround||S.pos.y<.4){S.armed=false}else flash('لا يمكن فصل التسليح في الجو')}else{if(S.onGround)S.armed=true}}
 function cycleCam(){const o=['chase','pilot','fpv'];opt.cam=o[(o.indexOf(opt.cam)+1)%3];$('#s-cam').value=opt.cam}
 const pbtn=[];
 function readInput(dt){
  const m2=opt.mode===2;
  const k=(a,b)=>(keys[a]?1:0)-(keys[b]?1:0);
  const tgt={thr:m2?k('KeyW','KeyS'):k('ArrowUp','ArrowDown'),yaw:k('KeyD','KeyA'),pitch:m2?k('ArrowUp','ArrowDown'):k('KeyW','KeyS'),roll:k('ArrowRight','ArrowLeft')};
  for(const a in kv){const d=tgt[a]-kv[a];kv[a]+=Math.sign(d)*Math.min(Math.abs(d),dt*(tgt[a]===0?6:3.2))}
  let g={thr:0,yaw:0,pitch:0,roll:0},gp=null;
  try{const ps=navigator.getGamepads?navigator.getGamepads():[];for(const p of ps){if(p&&p.connected){gp=p;break}}}catch(e){}
  if(gp){if(padIdx==null){padIdx=gp.index;padName=gp.id;padSt()}
   const dz=v=>Math.abs(v)<.08?0:(v-Math.sign(v)*.08)/.92;const ax=gp.axes;
   const lx=dz(ax[0]||0),ly=-dz(ax[1]||0),rx=dz(ax[2]||0),ry=-dz(ax[3]||0);
   g=m2?{thr:ly,yaw:lx,pitch:ry,roll:rx}:{pitch:ly,yaw:lx,thr:ry,roll:rx};
   const b=i=>gp.buttons[i]&&gp.buttons[i].pressed;[0,2,3,9].forEach(i=>{const p=b(i);if(p&&!pbtn[i]){if(i===0||i===9)toggleArm();if(i===2)cycleCam();if(i===3)start(mission)}pbtn[i]=p})}
  const t=m2?{thr:touch.l.y,yaw:touch.l.x,pitch:touch.r.y,roll:touch.r.x}:{pitch:touch.l.y,yaw:touch.l.x,thr:touch.r.y,roll:touch.r.x};
  const c=v=>Math.max(-1,Math.min(1,v));
  for(const a in IN)if(a!=='src')IN[a]=c(kv[a]+g[a]+t[a]);
 }

 /* ---- physics ---- */
 const q=ok?new THREE.Quaternion():null,eul=ok?new THREE.Euler(0,0,0,'YXZ'):null,up=ok?new THREE.Vector3():null,acc=ok?new THREE.Vector3():null,tmp=ok?new THREE.Vector3():null;
 function physics(dt){
  if(S.state!=='fly'){return}
  S.t+=dt;
  const lvl=opt.level,maxTilt=[.38,.6,.78][lvl];
  // wind
  if(mission.id==='wind'){const t=S.t;wind.set(2.4+Math.sin(t*.7)*1.6+Math.sin(t*2.3)*.8,Math.sin(t*1.1)*.3,Math.cos(t*.5)*1.4+Math.sin(t*1.9)*.6)}
  else if(mission.id==='rth'){wind.set(-1.2,0,1.5)}else wind.set(0,0,0);
  // attitude (angle mode)
  const tp=IN.pitch*maxTilt,tr=IN.roll*maxTilt,rate=lvl===2?9:7;
  S.pitch+=(tp-S.pitch)*Math.min(1,dt*rate);S.roll+=(tr-S.roll)*Math.min(1,dt*rate);
  if(S.armed)S.yaw-=IN.yaw*2.2*dt;
  eul.set(-S.pitch,S.yaw,-S.roll,'YXZ');q.setFromEuler(eul);up.set(0,1,0).applyQuaternion(q);
  // thrust
  let th=0;
  if(S.armed&&S.bat>0){
   if(lvl<2){const vz=IN.thr*(lvl===0?2.5:3.5);th=(9.81+(vz-S.vel.y)*4)/Math.max(.55,up.y);th=Math.max(0,Math.min(24,th))}
   else{th=IN.thr>=0?9.81+IN.thr*13:9.81*(1+IN.thr)}
   if(S.onGround&&IN.thr<=0.05&&lvl<2)th=Math.min(th,9.0);
  }
  acc.copy(up).multiplyScalar(th);acc.y-=9.81;
  tmp.copy(wind).sub(S.vel);const drag=.38;acc.addScaledVector(tmp,drag);
  // battery
  if(S.armed){const base=mission.id==='rth'?.22:.12;S.bat=Math.max(0,S.bat-dt*(base+th/24*.35))}
  S.vel.addScaledVector(acc,dt);
  S.pos.addScaledVector(S.vel,dt);
  // ground
  const gy=.06;
  if(S.pos.y<=gy){
   if(!S.onGround){const vy=-S.vel.y,h=Math.hypot(S.vel.x,S.vel.z);if(vy>2.5)return crash(`هبوط قاسٍ بسرعة نزول ${vy.toFixed(1)} م/ث. خفّف السرعة في المتر الأخير.`);if(h>3.2||Math.abs(S.pitch)>.6||Math.abs(S.roll)>.6)return crash('لامست الأرض وأنت مائل وتتحرك بسرعة.')}
   S.pos.y=gy;if(S.vel.y<0)S.vel.y=0;S.vel.x*=.6;S.vel.z*=.6;S.onGround=true;
  }else if(S.pos.y>gy+.05)S.onGround=false;
  if(S.onGround){S.pitch*=.6;S.roll*=.6}
  // obstacles & bounds
  for(const o of OBST){if(Math.abs(S.pos.x-o.x)<o.w/2+.3&&Math.abs(S.pos.z-o.z)<o.d/2+.3&&S.pos.y<o.h+.1)return crash('اصطدمت بمبنى. راقب محيطك وحافظ على مسافة آمنة.')}
  if(M.pts&&mission.id==='gates'){for(const gp of M.pts){const g=gp.o;tmp.copy(S.pos).sub(g.position).applyAxisAngle(new THREE.Vector3(0,1,0),-g.rotation.y);if(Math.abs(tmp.z)<.2&&((Math.abs(Math.abs(tmp.x)-1.5)<.2&&Math.abs(tmp.y)<1.2)||(Math.abs(Math.abs(tmp.y)-1.1)<.2&&Math.abs(tmp.x)<1.6)))return crash('اصطدمت بإطار البوابة. خفّف السرعة واستهدف المنتصف.')}}
  if(Math.hypot(S.pos.x,S.pos.z)>180)return crash('خرجت عن حدود الميدان.');
  if(S.pos.y>120){S.pos.y=120;S.vel.y=Math.min(0,S.vel.y)}
  if(S.bat<=0&&!S.onGround&&mission.id!=='rth'){S.armed=false}
  updMission(dt);
 }

 /* ---- render ---- */
 const camOff=ok?new THREE.Vector3():null,look=ok?new THREE.Vector3():null;
 function render(dt){
  drone.position.copy(S.pos);drone.rotation.set(-S.pitch,S.yaw,-S.roll,'YXZ');
  const spin=S.armed?(30+IN.thr*12):0;props.forEach((p,i)=>p.rotation.y+=spin*dt*(i%3===0?1:-1));
  const sock=scene.getObjectByName('sock');if(sock){sock.rotation.y=Math.atan2(-wind.z,wind.x);}
  if(markers)markers.children.forEach(m=>{if(m.geometry&&m.geometry.type==='TorusGeometry')m.rotation.z+=dt*.6});
  if(opt.cam==='chase'){camOff.set(0,1.3,3.4).applyAxisAngle(new THREE.Vector3(0,1,0),S.yaw);tmp.copy(S.pos).add(camOff);if(tmp.y<.3)tmp.y=.3;camera.position.lerp(tmp,1-Math.exp(-dt*5));look.copy(S.pos).y+=.25;camera.lookAt(look);camera.fov=65}
  else if(opt.cam==='pilot'){camera.position.set(0,1.7,7);camera.lookAt(S.pos);const d=camera.position.distanceTo(S.pos);camera.fov=Math.max(14,Math.min(60,60-d*.7))}
  else{camera.position.copy(S.pos);eul.set(-S.pitch+.25,S.yaw,-S.roll,'YXZ');camera.quaternion.setFromEuler(eul);camera.fov=100}
  camera.updateProjectionMatrix();
  renderer.render(scene,camera);
 }
 let hudT=0;
 function updHud(dt){hudT+=dt;if(hudT<.08)return;hudT=0;
  hud.alt.textContent=Math.max(0,S.pos.y-.06).toFixed(1);hud.spd.textContent=Math.hypot(S.vel.x,S.vel.z).toFixed(1);hud.vs.textContent=(S.vel.y>=0?'+':'')+S.vel.y.toFixed(1);
  hud.bat.textContent=Math.round(S.bat);hud.batbar.style.width=S.bat+'%';hud.batbar.style.background=S.bat<25?'var(--signal)':'var(--ok)';
  const t=Math.floor(S.t);hud.t.textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
  hud.home.textContent=Math.hypot(S.pos.x,S.pos.z).toFixed(0);
  hud.arm.textContent=S.armed?'مسلّحة':'غير مسلّحة';hud.arm.classList.toggle('on',S.armed);
  const m2=opt.mode===2;const L=m2?[IN.yaw,IN.thr]:[IN.yaw,IN.pitch],R=m2?[IN.roll,IN.pitch]:[IN.roll,IN.thr];
  hud.sl.style.transform=`translate(${L[0]*24}px,${-L[1]*24}px)`;hud.sr.style.transform=`translate(${R[0]*24}px,${-R[1]*24}px)`;
  hud.hzg.setAttribute('transform',`rotate(${S.roll*57.3}) translate(0 ${S.pitch*60})`);
 }
 function loop(){if(!running)return;const dt=Math.min(.05,clock.getDelta());readInput(dt);
  const steps=2;for(let i=0;i<steps;i++)physics(dt/steps);
  render(dt);updHud(dt);
  if(S.state!=='fly'&&padIdx!=null){/* allow R via pad */}
  raf=requestAnimationFrame(loop)}
 /* ---- full screen ---- */
 function buzz(){try{navigator.vibrate&&navigator.vibrate(180)}catch(e){}
  try{const ps=navigator.getGamepads?navigator.getGamepads():[];for(const p of ps){if(p&&p.vibrationActuator){p.vibrationActuator.playEffect('dual-rumble',{duration:260,strongMagnitude:.9,weakMagnitude:.6}).catch(()=>{})}}}catch(e){}}
 const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
 function setFullUI(){const bay=$('#simbay');bay.classList.toggle('full',full===2);document.body.classList.toggle('sim-noscroll',full===2);
  const b=document.getElementById('fs-btn');if(b){b.textContent=full?'✕ خروج':'⛶ ملء الشاشة';b.setAttribute('aria-label',full?'الخروج من ملء الشاشة':'ملء الشاشة')}
  const mb=document.getElementById('fs-menu');if(mb)mb.hidden=!full;setTimeout(resize,60)}
 function goFull(){const bay=$('#simbay');if(full)return;
  const req=bay.requestFullscreen||bay.webkitRequestFullscreen;
  const pseudo=()=>{full=2;setFullUI();rotateHint()};
  if(req){try{const p=req.call(bay,{navigationUI:'hide'});full=1;setFullUI();
    if(p&&p.then)p.then(()=>{try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})}catch(e){}}).catch(()=>{full=0;pseudo()});}catch(e){pseudo()}}
  else pseudo()}
 function exitFull(){if(full===1&&fsEl()){try{(document.exitFullscreen||document.webkitExitFullscreen).call(document)}catch(e){}}
  try{screen.orientation&&screen.orientation.unlock&&screen.orientation.unlock()}catch(e){}full=0;setFullUI()}
 function rotateHint(){if(!COARSE||innerWidth>innerHeight)return;const h=document.createElement('div');h.className='rot-hint';h.textContent='📱 أدر الجوال بالعرض لمساحة أكبر';$('#simbay').appendChild(h);setTimeout(()=>h.remove(),3200)}
 function setupFull(){const bay=$('#simbay');
  const bar=document.createElement('div');bar.className='fsbar';bar.innerHTML='<button id="fs-btn" type="button"></button><button id="fs-menu" type="button" hidden>☰ المهام</button>';bay.appendChild(bar);
  $('#fs-btn').onclick=e=>{e.currentTarget.blur();full?exitFull():goFull()};
  $('#fs-menu').onclick=e=>{e.currentTarget.blur();menu()};
  const ch=()=>{if(full===1&&!fsEl()){full=0;try{screen.orientation.unlock()}catch(e){}setFullUI()}};
  document.addEventListener('fullscreenchange',ch);document.addEventListener('webkitfullscreenchange',ch);
  addEventListener('keydown',e=>{if(e.code==='Escape'&&full===2)exitFull()});
  setFullUI()}
 function box(html){$('#overbox').innerHTML=html;$('#over').hidden=false}
 function intro(){if(introShown)return;introShown=true;
  box(`<h3>جاهز تطير؟</h3><p>${COARSE?'استخدم العصاتين على الشاشة، واضغط «تسليح» ثم ارفع العصا اليسرى. وللتجربة الأفضل: الكمبيوتر أو يد تحكم بالبلوتوث.':'لوحة المفاتيح جاهزة، ولو عندك يد بلايستيشن أو إكس بوكس وصّلها واضغط أي زر.'}${locked?'<br><b style="color:var(--sand)">التمرين المجاني: الطيران الحر والإقلاع والتحويم.</b>':''}</p>
   <div class="row" style="justify-content:center"><button class="btn pri" id="o-go">ابدأ التمرين ⛶</button><button class="btn" id="o-nofs">بدون ملء الشاشة</button></div>`);
  $('#o-go').onclick=()=>{$('#over').hidden=true;goFull();start(mission)};$('#o-nofs').onclick=()=>{$('#over').hidden=true;start(mission)}}
 function menu(){const b=best();box(`<h3>المهام</h3><div class="mlist omenu">${MISSIONS.map(m=>`<button class="mbtn ${m===mission?'on':''} ${isLocked(m)?'lk':''}" data-m="${m.id}"><b>${isLocked(m)?'🔒 ':''}${m.title}</b><span>${m.par?'هدف '+m.par+' ث':''}</span>${b[m.id]?`<em>أفضل وقت ${b[m.id].toFixed(1)} ث</em>`:''}</button>`).join('')}</div><div class="row" style="justify-content:center;margin-top:12px"><button class="btn sm" id="o-cl">رجوع</button></div>`);
  $('#overbox').querySelector('.omenu').onclick=e=>{const x=e.target.closest('.mbtn');if(x){const m=MISSIONS.find(k=>k.id===x.dataset.m);if(isLocked(m))return showLocked(m);start(m)}};
  $('#o-cl').onclick=()=>{$('#over').hidden=true}}
 function showLocked(m){box(`<h3>🔒 ${m.title}</h3><p>هذي المهمة للحسابات المفعّلة. فعّل حسابك بـ ${(window.KU&&window.KU.PRICE)||25} ريال لمرة واحدة، وتنفتح لك كل المهام والدروس.</p><div class="row" style="justify-content:center"><a class="btn pri" href="#pay" id="o-pay">فعّل حسابك</a><button class="btn" id="o-cl">رجوع</button></div>`);
  $('#o-pay').onclick=()=>exitFull();$('#o-cl').onclick=()=>{$('#over').hidden=true}}
 return{
  setLocked(v){locked=!!v;if(inited){renderMissions();if(isLocked(mission))start(MISSIONS[1])}},
  enter(){if(!ok){$('#simbay').innerHTML='<div class="over"><div class="box"><h3>تعذّر تحميل المحاكي</h3><p>تحقق من اتصالك بالإنترنت ثم أعد تحميل الصفحة.</p></div></div>';return}
   if(!inited){inited=true;build()}if(!running){running=true;clock.getDelta();loop()}},
  leave(){running=false;cancelAnimationFrame(raf);if(full)exitFull()}
 };
})();

