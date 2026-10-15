// Know UAV — 3D flight trainer (keyboard, PlayStation/Xbox gamepad, touch)
window.MISSIONS=[
 {id:'free',title:'طيران حر',brief:'طِر بحرية في الميدان. جرّب المحاور الأربعة وأوضاع الكاميرا.',free:true,par:0},
 {id:'hover',title:'الإقلاع والتحويم',brief:'أقلع وحوّم فوق المهبط على ارتفاع ٣ أمتار لمدة ٥ ثوانٍ متصلة.',free:true,par:20},
 {id:'box',title:'المربع',brief:'مرّ على النقاط الأربع بالترتيب على ارتفاع ٤ أمتار.',par:45},
 {id:'gates',title:'البوابات',brief:'مرّ من داخل البوابات الست بالترتيب.',par:60},
 {id:'land',title:'الهبوط الدقيق',brief:'طِر إلى المهبط البعيد واهبط في مركزه بهدوء.',par:40},
 {id:'wind',title:'تحويم مع رياح',brief:'ابقَ داخل الكرة لمدة ١٥ ثانية مع رياح وهبّات متغيرة.',par:35},
 {id:'rth',title:'العودة ببطارية منخفضة',brief:'البطارية ١٨٪ وأنت بعيد. عُد واهبط على مهبط المنزل قبل نفادها.',par:50},
 {id:'slalom',title:'التعرّج بين الأعمدة',brief:'مرّ على النقاط يمين ويسار الأعمدة بالترتيب، ولا تلمس أي عمود.',par:40},
 {id:'orbit',title:'الدوران حول البرج',brief:'لِف دورة كاملة حول البرج على بُعد ٤ إلى ٩ أمتار وارتفاع ٢ إلى ٧ أمتار.',par:35},
 {id:'low',title:'الممر المنخفض',brief:'مرّ من الحلقات الخمس بالترتيب، ولا ترتفع فوق ٣ أمتار.',par:40},
 {id:'pads',title:'الهبوط على ثلاث منصات',brief:'اهبط على المنصات الثلاث بالترتيب، وتوقّف تماماً على كل وحدة.',par:60},
 {id:'night',title:'البوابات الليلية',brief:'البوابات الست بالليل. اعتمد على الإضاءة وخفّف سرعتك.',par:70},
 {id:'hangar',title:'المبنى الكبير: طيران حر',brief:'مستودع ضخم فيه رفوف وحاويات ودور علوي وجسر رافعة ونفق. استكشف بحرية، وجرّب تهبط فوق الحاويات والدور العلوي.',par:0,map:'hangar'},
 {id:'coins',title:'المبنى الكبير: اجمع الكرات',brief:'١٥ كرة ذهبية داخل المبنى: بين الرفوف، تحت الدور العلوي، داخل الحاوية وفوق الجسور. اجمعها كلها بأي ترتيب.',par:150,map:'hangar'}
];
window.Sim=(()=>{
 let ok=typeof THREE!=='undefined',inited=false,running=false,raf=0;
 let renderer,scene,camera,drone,props=[],markers,clock,wind=new THREE_V(),last=0;
 function THREE_V(){return ok?new THREE.Vector3():{x:0,y:0,z:0}}
 const S={pos:null,vel:null,yaw:0,pitch:0,roll:0,armed:false,bat:100,t:0,state:'idle',onGround:true,q:null,w:null,thrO:0,hdg:0,py:0};
 const IN={thr:0,yaw:0,pitch:0,roll:0,src:'—'};
 const keys={};const kv={thr:0,yaw:0,pitch:0,roll:0};
 const touch={l:{x:0,y:0},r:{x:0,y:0}};
 let mission=MISSIONS[0],M={},padPrev=[];
 let MAP='field',COLL=[],COLL_F=[],COLL_H=[],outdoor=null,hangar=null,groundM=null;
 const OBST=[{x:-14,z:-6,w:5,h:7,d:5},{x:18,z:8,w:6,h:10,d:4},{x:-22,z:16,w:4,h:5,d:8},{x:6,z:26,w:8,h:4,d:3},{x:-30,z:-28,w:6,h:12,d:6},{x:32,z:-6,w:3,h:6,d:3}];
 const LAND_PAD={x:-18,z:-32},HOME={x:0,z:0};
 const opt={level:1,mode:2,cam:'chase'};
 let hemi=null,sunL=null,headL=null;
 const COARSE=matchMedia('(pointer:coarse)').matches;
 let locked=false,full=0,introShown=false;
 const CAMS=['chase','gimbal','fpv','pilot'],CAMN={chase:'مطاردة',gimbal:'كاميرا الدرون',fpv:'FPV',pilot:'منظور الطيار'};
 let gTilt=-.12,gYaw=0,camKey='';
 const hud={};

 function texGround(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#b59b6a';x.fillRect(0,0,256,256);
  for(let i=0;i<900;i++){x.fillStyle=`rgba(${80+Math.random()*60},${60+Math.random()*40},${30+Math.random()*30},${Math.random()*.18})`;x.fillRect(Math.random()*256,Math.random()*256,2+Math.random()*3,2+Math.random()*3)}
  x.strokeStyle='rgba(60,45,20,.35)';x.lineWidth=2;x.strokeRect(0,0,256,256);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(80,80);t.anisotropy=4;t.encoding=THREE.sRGBEncoding;return t}
 function texPad(label){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#2a2f2b';x.beginPath();x.arc(128,128,124,0,7);x.fill();
  x.strokeStyle='#f2ead2';x.lineWidth=8;x.beginPath();x.arc(128,128,108,0,7);x.stroke();x.fillStyle='#f2ead2';x.font='bold 120px IBM Plex Mono, monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(label,128,136);
  const tx=new THREE.CanvasTexture(c);tx.encoding=THREE.sRGBEncoding;return tx}
 function pad(px,pz,label,size=3,par){const m=new THREE.Mesh(new THREE.CircleGeometry(size/2,40),new THREE.MeshStandardMaterial({map:texPad(label),roughness:.9}));m.rotation.x=-Math.PI/2;m.position.set(px,0.02,pz);m.receiveShadow=true;(par||scene).add(m);return m}

 function build(){
  const bay=$('#simbay');
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(COARSE?1.5:2,devicePixelRatio||1));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputEncoding=THREE.sRGBEncoding;bay.prepend(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color('#c9c3ad');scene.fog=new THREE.Fog('#c9c3ad',60,240);
  camera=new THREE.PerspectiveCamera(65,1,0.05,500);
  hemi=new THREE.HemisphereLight('#e9e6dc','#7a6643',0.85);scene.add(hemi);
  const sun=sunL=new THREE.DirectionalLight('#fff2d6',1.1);sun.position.set(-40,60,25);sun.castShadow=true;sun.shadow.mapSize.set(COARSE?1024:2048,COARSE?1024:2048);
  Object.assign(sun.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:200});sun.shadow.camera.layers.enable(1);scene.add(sun);
  const g=groundM=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({map:texGround(),roughness:1}));g.rotation.x=-Math.PI/2;g.receiveShadow=true;scene.add(g);
  outdoor=new THREE.Group();scene.add(outdoor);
  // runway strip
  const rw=new THREE.Mesh(new THREE.PlaneGeometry(8,90),new THREE.MeshStandardMaterial({color:'#5b5a52',roughness:.95}));rw.rotation.x=-Math.PI/2;rw.position.set(40,0.01,-20);rw.receiveShadow=true;outdoor.add(rw);
  for(let i=0;i<9;i++){const d=new THREE.Mesh(new THREE.PlaneGeometry(.5,4),new THREE.MeshBasicMaterial({color:'#e8e2cc'}));d.rotation.x=-Math.PI/2;d.position.set(40,0.02,-58+i*10);outdoor.add(d)}
  pad(HOME.x,HOME.z,'H',3,outdoor);pad(LAND_PAD.x,LAND_PAD.z,'L',2.4,outdoor);
  const om=new THREE.MeshStandardMaterial({color:'#8b8471',roughness:.9});
  OBST.forEach(o=>{const b=new THREE.Mesh(new THREE.BoxGeometry(o.w,o.h,o.d),om);b.position.set(o.x,o.h/2,o.z);b.castShadow=b.receiveShadow=true;outdoor.add(b);
   COLL_F.push({x:o.x,y:o.h/2,z:o.z,w:o.w,h:o.h,d:o.d,msg:'اصطدمت بمبنى. راقب محيطك وحافظ على مسافة آمنة.'})});
  // scattered shrubs & masts
  const sm=new THREE.MeshStandardMaterial({color:'#6b6a3c',roughness:1});
  for(let i=0;i<70;i++){const r=20+Math.random()*120,a=Math.random()*7;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(x-40)<7&&z<30&&z>-70)continue;const s=new THREE.Mesh(new THREE.SphereGeometry(.5+Math.random()*.9,7,5),sm);s.position.set(x,.3,z);s.scale.y=.6;s.castShadow=true;outdoor.add(s)}
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,6,8),new THREE.MeshStandardMaterial({color:'#444'}));mast.position.set(6,3,6);outdoor.add(mast);
  const sock=new THREE.Mesh(new THREE.ConeGeometry(.3,1.6,10,1,true),new THREE.MeshStandardMaterial({color:'#ff8f45',side:THREE.DoubleSide}));sock.rotation.z=Math.PI/2;sock.position.set(6.8,5.8,6);sock.name='sock';outdoor.add(sock);
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
  headL=new THREE.SpotLight('#fff6e0',0,40,.55,.5,1.2);headL.position.set(0,0,-.15);headL.target.position.set(0,-1.2,-6);drone.add(headL);drone.add(headL.target);
  drone.rotation.order='YXZ';drone.traverse(o=>o.layers.set(1));camera.layers.enable(1);scene.add(drone);
  markers=new THREE.Group();scene.add(markers);
  S.pos=new THREE.Vector3();S.vel=new THREE.Vector3();S.q=new THREE.Quaternion();S.w=new THREE.Vector3();wind=new THREE.Vector3();clock=new THREE.Clock();COLL=COLL_F;
  try{const lv=localStorage.getItem('ku_sim_level');if(lv!=null&&/^[0-3]$/.test(lv)){opt.level=+lv;$('#s-level').value=lv}}catch(e){}
  new ResizeObserver(resize).observe(bay);resize();
  ['alt','spd','vs','bat','batbar','t','home','obj','objst','arm','sl','sr','hzg'].forEach(k=>hud[k]=document.getElementById('h-'+k));
  setupInput();setupFull();renderMissions();keysHelp();
  start(MISSIONS[1]);intro();
 }
 function resize(){const b=$('#simbay');const w=b.clientWidth,h=b.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();touchVis()}

 /* ---- the big hangar: interior x -32..32, z -56..8, roof at 16 m ---- */
 const HB={x0:-32,x1:32,z0:-56,z1:8,top:16};
 function texConcrete(){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle='#a19d93';x.fillRect(0,0,512,512);
  for(let i=0;i<4000;i++){const v=110+Math.random()*60|0;x.fillStyle=`rgba(${v},${v-4},${v-10},${Math.random()*.16})`;x.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*4,1+Math.random()*4)}
  for(let i=0;i<14;i++){x.fillStyle=`rgba(60,55,45,${.05+Math.random()*.08})`;x.beginPath();x.ellipse(Math.random()*512,Math.random()*512,20+Math.random()*60,10+Math.random()*30,Math.random()*3,0,7);x.fill()}
  x.strokeStyle='rgba(50,48,42,.5)';x.lineWidth=2;x.strokeRect(0,0,512,512);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(8,8);t.anisotropy=4;t.encoding=THREE.sRGBEncoding;return t}
 function texRib(col,w=256){const c=document.createElement('canvas');c.width=w;c.height=64;const x=c.getContext('2d');x.fillStyle=col;x.fillRect(0,0,w,64);
  for(let i=0;i<w;i+=16){x.fillStyle='rgba(0,0,0,.18)';x.fillRect(i,0,5,64);x.fillStyle='rgba(255,255,255,.08)';x.fillRect(i+6,0,3,64)}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;return t}
 function texSign(){const c=document.createElement('canvas');c.width=1024;c.height=192;const x=c.getContext('2d');x.fillStyle='#1d1f1c';x.fillRect(0,0,1024,192);
  x.strokeStyle='#d8bf86';x.lineWidth=8;x.strokeRect(10,10,1004,172);x.fillStyle='#d8bf86';x.font='bold 120px IBM Plex Mono, monospace';x.textAlign='center';x.textBaseline='middle';x.fillText('KNOW UAV',512,100);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
 function buildHangar(){
  const G=hangar=new THREE.Group();scene.add(G);const C=COLL_H;
  const mat=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85,metalness:.05},o));
  const bx=(w,h,d,m,x,y,z,o={})=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);b.castShadow=o.cast!==false;b.receiveShadow=true;G.add(b);
   if(o.coll)C.push({x,y,z,w,h,d,msg:o.msg||'اصطدمت بعائق داخل المبنى. خفّف سرعتك وخذ مسافة أوسع.'});return b};
  const W=HB.x1-HB.x0,D=HB.z1-HB.z0,cx=(HB.x0+HB.x1)/2,cz=(HB.z0+HB.z1)/2,H=HB.top;
  // floor + painted lanes
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(W,D),new THREE.MeshStandardMaterial({map:texConcrete(),roughness:.95}));fl.rotation.x=-Math.PI/2;fl.position.set(cx,0,cz);fl.receiveShadow=true;G.add(fl);
  const lane=new THREE.MeshBasicMaterial({color:'#d9b13b'});
  [[-9,0],[9,0]].forEach(([x])=>{const l=new THREE.Mesh(new THREE.PlaneGeometry(.18,D-4),lane);l.rotation.x=-Math.PI/2;l.position.set(x,.012,cz);G.add(l)});
  for(let z=-6;z>HB.z0+2;z-=6){const l=new THREE.Mesh(new THREE.PlaneGeometry(18,.12),lane);l.rotation.x=-Math.PI/2;l.position.set(0,.012,z);G.add(l)}
  pad(0,0,'H',3,G);
  // walls (ribbed cladding), roof, skylight strips
  const wt=texRib('#8f8c82',512);wt.repeat.set(D/8,1);const wm=new THREE.MeshStandardMaterial({map:wt,roughness:.9});
  const wt2=texRib('#8f8c82',512);wt2.repeat.set(W/8,1);const wm2=new THREE.MeshStandardMaterial({map:wt2,roughness:.9});
  bx(.5,H,D+.5,wm,HB.x0-.25,H/2,cz,{cast:false});bx(.5,H,D+.5,wm,HB.x1+.25,H/2,cz,{cast:false});
  bx(W+.5,H,.5,wm2,cx,H/2,HB.z0-.25,{cast:false});bx(W+.5,H,.5,wm2,cx,H/2,HB.z1+.25,{cast:false});
  const band=mat('#3c3b36');bx(.52,1.2,D+.52,band,HB.x0-.24,.6,cz,{cast:false});bx(.52,1.2,D+.52,band,HB.x1+.24,.6,cz,{cast:false});bx(W+.52,1.2,.52,band,cx,.6,HB.z0-.24,{cast:false});
  const roof=new THREE.Mesh(new THREE.PlaneGeometry(W,D),mat('#45433d'));roof.rotation.x=Math.PI/2;roof.position.set(cx,H,cz);G.add(roof);
  const glow=new THREE.MeshBasicMaterial({color:'#dfe8ef'});
  for(let z=HB.z1-6;z>HB.z0+3;z-=9){bx(.1,1.6,6,glow,HB.x0+.02,12.6,z,{cast:false});bx(.1,1.6,6,glow,HB.x1-.02,12.6,z,{cast:false})}
  // roller door + sign
  const dt=texRib('#a9a294',512);dt.repeat.set(1,10);dt.rotation=Math.PI/2;bx(9,7,.12,new THREE.MeshStandardMaterial({map:dt,roughness:.8}),0,3.5,HB.z1-.02,{cast:false});
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(16,3),new THREE.MeshBasicMaterial({map:texSign()}));sg.position.set(0,11,HB.z0+.03);G.add(sg);
  // roof trusses with light fixtures (fly between them, or above them under the roof)
  const steel=mat('#59605e',{metalness:.45,roughness:.5}),lamp=new THREE.MeshBasicMaterial({color:'#fff7e2'});
  for(let z=-4;z>HB.z0;z-=8){bx(W,.6,.35,steel,cx,13.5,z,{coll:true,msg:'اصطدمت بجسر السقف. انتبه للارتفاع.'});[-18,-6,6,18].forEach(x=>bx(3.2,.12,.5,lamp,x,13.14,z,{cast:false}))}
  // columns
  const colM=mat('#c9a227');[-12,12].forEach(x=>[-12,-28,-44].forEach(z=>{bx(.8,H,.8,colM,x,H/2,z,{coll:true,msg:'اصطدمت بعمود المبنى.'});bx(.84,1.4,.84,mat('#2b2a26'),x,.7,z,{cast:false})}));
  // pallet racks: two long rows with an aisle between them
  const upM=mat('#2f5d8a',{metalness:.3}),bmM=mat('#d9682b',{metalness:.3}),deck=mat('#6f6d66'),box1=mat('#b88a5a'),box2=mat('#d8d2c0'),box3=mat('#7a8a6a');
  const rack=(x,z0,z1)=>{const len=z0-z1,zc=(z0+z1)/2;
   for(let z=z0;z>=z1-.01;z-=3)[-.95,.95].forEach(o=>bx(.12,7,.12,upM,x+o,3.5,z,{cast:false}));
   [2.4,4.8,7].forEach(y=>{[-.95,.95].forEach(o=>bx(.1,.14,len,bmM,x+o,y,zc,{cast:false}));if(y<7)bx(1.9,.05,len,deck,x,y+.07,zc,{cast:false})});
   for(let z=z0-1.5;z>z1;z-=3)[0,2.4,4.8].forEach(y=>{if(Math.random()<.78){const s=.9+Math.random()*.5,hh=.7+Math.random()*1.1;bx(s,hh,1.1+Math.random()*1.2,[box1,box2,box3][Math.random()*3|0],x+(Math.random()-.5)*.3,y+.1+hh/2,z,{})}});
   C.push({x,y:3.5,z:zc,w:2,h:7,d:len,msg:'اصطدمت بالرفوف. ممر الرفوف ضيّق، خفّف سرعتك.'})};
  rack(-24,-10,-46);rack(-17,-10,-46);
  // mezzanine deck on the right (land on it, or fly under it)
  bx(14,.4,24,mat('#5d5a52'),25,5.8,-42,{coll:true,msg:'اصطدمت بالدور العلوي.'});
  [-31,-42,-53].forEach(z=>bx(.4,5.6,.4,steel,18.6,2.8,z,{coll:true,msg:'اصطدمت بعمود الدور العلوي.'}));
  bx(.08,.08,24,mat('#d9b13b'),18.1,7,-42,{cast:false});for(let z=-30.5;z>=-53.5;z-=1.5)bx(.05,1,.05,mat('#d9b13b'),18.1,6.5,z,{cast:false});
  C.push({x:18.1,y:6.5,z:-42,w:.1,h:1,d:24,msg:'اصطدمت بحاجز الدور العلوي.'});
  bx(1.2,1.2,1.2,box1,27,6.6,-50,{coll:true});bx(1.6,1,1.2,box2,29,6.5,-35,{coll:true});
  // shipping containers (one hollow: fly through it like a tunnel)
  const cont=(col,len)=>{const t=texRib(col,256);t.repeat.set(len/2,1);return new THREE.MeshStandardMaterial({map:t,roughness:.7,metalness:.25})};
  const cm='اصطدمت بالحاوية.';
  bx(2.5,2.6,6,cont('#c8642c',6),6,1.3,-20,{coll:true,msg:cm});bx(2.5,2.6,6,cont('#2f7d7a',6),6,3.9,-20,{coll:true,msg:cm});
  bx(2.5,2.6,6,cont('#9c3b2e',6),10,1.3,-46,{coll:true,msg:cm});
  const tm=cont('#b39a5e',6);tm.side=THREE.DoubleSide;
  bx(6,.1,2.5,tm,2,2.55,-36,{coll:true,msg:'لمست سقف النفق. خلك منخفض ومستقيم.'});bx(6,2.6,.1,tm,2,1.3,-37.2,{coll:true,msg:'لمست جدار النفق.'});bx(6,2.6,.1,tm,2,1.3,-34.8,{coll:true,msg:'لمست جدار النفق.'});
  // overhead crane girder + hook
  const yel=mat('#e0b62e',{metalness:.3});bx(.8,.8,54,yel,0,10.5,-23,{coll:true,msg:'اصطدمت بجسر الرافعة.'});
  bx(1.2,.4,1.2,mat('#3a3a36'),0,9.9,-24,{cast:false});bx(.06,2.4,.06,mat('#222'),0,8.5,-24,{cast:false});bx(.5,.5,.5,mat('#c8642c'),0,7.1,-24,{coll:true,msg:'اصطدمت بخطّاف الرافعة.'});
  return G}
 function setMap(mp){MAP=mp;if(mp==='hangar'&&!hangar)buildHangar();
  outdoor.visible=groundM.visible=mp==='field';if(hangar)hangar.visible=mp==='hangar';COLL=mp==='hangar'?COLL_H:COLL_F;
  if(mp==='hangar'){scene.background.set('#3a3a35');scene.fog.color.set('#3a3a35');scene.fog.near=50;scene.fog.far=170;hemi.intensity=1.55;sunL.intensity=.75;headL.intensity=0}}
 // landing surfaces & solid obstacles (any box: containers, racks, mezzanine, rooftops)
 function groundH(x,z,y){let g=0;for(const b of COLL){const t=b.y+b.h/2;if(t>g&&Math.abs(x-b.x)<b.w/2+.1&&Math.abs(z-b.z)<b.d/2+.1&&y>=t-.02)g=t}return g}
 function hitBox(p){for(const b of COLL){const t=b.y+b.h/2;if(Math.abs(p.x-b.x)<b.w/2+.25&&Math.abs(p.z-b.z)<b.d/2+.25&&p.y<t-.02&&p.y>b.y-b.h/2-.12)return b}return null}

 /* ---- missions ---- */
 const best=()=>window.SIM_BEST||(window.SIM_BEST={});
 function renderMissions(){const b=best();$('#mlist').innerHTML=MISSIONS.map(m=>`<button class="mbtn ${m===mission?'on':''} ${isLocked(m)?'lk':''}" data-m="${m.id}"><b>${isLocked(m)?'🔒 ':''}${m.title}</b><span>${m.par?'هدف '+m.par+' ث':''}</span>${b[m.id]?`<em>أفضل وقت ${b[m.id].toFixed(1)} ث</em>`:''}</button>`).join('');
  $('#mlist').onclick=e=>{const x=e.target.closest('.mbtn');if(x){pick(MISSIONS.find(m=>m.id===x.dataset.m));x.blur()}}}
 function isLocked(m){return locked&&!m.free}
 function pick(m){if(isLocked(m))return showLocked(m);start(m);if(!full)goFull()}
 function ringAt(x,y,z,r,color='#ff8f45'){const m=new THREE.Mesh(new THREE.TorusGeometry(r,.06,8,48),new THREE.MeshBasicMaterial({color}));m.position.set(x,y,z);m.rotation.x=Math.PI/2;markers.add(m);return m}
 function ballAt(x,y,z,r,color='#ff8f45',op=.25){const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),new THREE.MeshBasicMaterial({color,transparent:true,opacity:op,depthWrite:false}));m.position.set(x,y,z);markers.add(m);return m}
 function gateAt(x,y,z,ry){const g=new THREE.Group();const mt=new THREE.MeshStandardMaterial({color:'#ff8f45',emissive:mission&&mission.id==='night'?'#b8561a':'#5a2a08'});
  const w=3,h=2.2,t=.14;[[0,h/2,w,t],[0,-h/2,w,t],[-w/2,0,t,h],[w/2,0,t,h]].forEach(([px,py,sx,sy])=>{const b=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,t),mt);b.position.set(px,py,0);b.castShadow=true;g.add(b)});
  const leg=new THREE.Mesh(new THREE.BoxGeometry(.1,y-h/2,.1),new THREE.MeshStandardMaterial({color:'#444'}));leg.position.set(0,-(y)/2-h/4+ .0,0);leg.position.y=-(h/2)-(y-h/2)/2;g.add(leg);
  g.position.set(x,y,z);g.rotation.y=ry;markers.add(g);return g}
 function setNight(on){scene.background.set(on?'#0b1220':'#c9c3ad');scene.fog.color.set(on?'#0b1220':'#c9c3ad');scene.fog.near=on?12:60;scene.fog.far=on?70:240;
  hemi.intensity=on?.12:.85;sunL.intensity=on?.05:1.1;headL.intensity=on?2.2:0}
 function pole(x,z,h=6,r=.22,col='#d9d2bd'){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),new THREE.MeshStandardMaterial({color:col,roughness:.6}));m.position.set(x,h/2,z);m.castShadow=true;markers.add(m);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(r*1.6,12,8),new THREE.MeshBasicMaterial({color:'#ff8f45'}));cap.position.set(x,h+.1,z);markers.add(cap);return {x,z,h,r}}
 function vring(x,y,z,ry,r=.9){const m=new THREE.Mesh(new THREE.TorusGeometry(r,.07,8,40),new THREE.MeshBasicMaterial({color:'#ff8f45'}));m.position.set(x,y,z);m.rotation.y=ry;markers.add(m);
  const st=new THREE.Mesh(new THREE.BoxGeometry(.08,y-r,.08),new THREE.MeshStandardMaterial({color:'#444'}));st.position.set(x,(y-r)/2,z);markers.add(st);return m}
 function padM(x,z,label){const m=new THREE.Mesh(new THREE.CircleGeometry(1.1,40),new THREE.MeshStandardMaterial({map:texPad(label),roughness:.9}));m.rotation.x=-Math.PI/2;m.position.set(x,.025,z);m.receiveShadow=true;markers.add(m);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.25,.05,8,48),new THREE.MeshBasicMaterial({color:'#8a7f66'}));ring.rotation.x=Math.PI/2;ring.position.set(x,.06,z);markers.add(ring);return ring}
 function clearMarkers(){while(markers.children.length)markers.remove(markers.children[0])}
 function start(m){
  if(isLocked(m))return showLocked(m);
  mission=m;M={hold:0,i:0,objs:[]};clearMarkers();setMap(m.map||'field');if(MAP==='field')setNight(m.id==='night');S.state='fly';S.t=0;S.bat=100;S.armed=false;S.yaw=0;S.pitch=S.roll=0;S.vel.set(0,0,0);S.pos.set(0,.06,0);S.onGround=true;wind.set(0,0,0);
  $('#over').hidden=true;gYaw=S.yaw;
  if(m.id==='hover'){M.objs.push(ringAt(0,3,0,1.5));M.objs.push(ballAt(0,3,0,.7,'#d8bf86',.12))}
  if(m.id==='box'){M.pts=[[10,4,-10],[10,4,10],[-10,4,10],[-10,4,-10]].map(p=>({p:new THREE.Vector3(...p),o:ballAt(...p,1.6)}));}
  if(m.id==='slalom'){M.poles=[];const Z=[-8,-15,-22,-29,-36];M.pts=Z.map((z,i)=>{M.poles.push(pole(0,z));const x=i%2?-2.6:2.6;return {p:new THREE.Vector3(x,2.5,z),o:ballAt(x,2.5,z,1.2)}});M.pts.push({p:new THREE.Vector3(0,2.5,-44),o:ballAt(0,2.5,-44,1.4,'#7cd39b')})}
  if(m.id==='orbit'){M.c=new THREE.Vector3(0,0,-14);M.poles=[pole(0,-14,9,.4,'#9a9488')];M.acc=0;M.last=null;
   const band=new THREE.Mesh(new THREE.RingGeometry(4,9,64),new THREE.MeshBasicMaterial({color:'#d8bf86',transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));band.rotation.x=-Math.PI/2;band.position.set(0,.04,-14);markers.add(band)}
  if(m.id==='low'){const R=[[5,1.3,-6],[11,1.2,-13],[7,1.1,-21],[0,1.2,-26],[-6,1.3,-19]];M.pts=R.map((r,i)=>{const nx=R[i+1]||[r[0]-6,r[1],r[2]+6],pv=R[i-1]||[0,1,0];const ry=Math.atan2(nx[0]-pv[0],nx[2]-pv[2]);return {p:new THREE.Vector3(...r),o:vring(r[0],r[1],r[2],ry)}})}
  if(m.id==='pads'){const P=[[8,-6,'1'],[-7,-13,'2'],[5,-22,'3']];M.pts=P.map(([x,z,l])=>({p:new THREE.Vector3(x,.06,z),o:padM(x,z,l)}))}
  if(m.id==='night'||m.id==='gates'){const G=[[0,3,-12,0],[8,3.5,-24,-.6],[20,4,-30,-1.4],[28,3,-18,-2.6],[22,3,-4,-3.6],[10,3.5,6,-4.6]];M.pts=G.map(g=>({p:new THREE.Vector3(g[0],g[1],g[2]),o:gateAt(...g)}))}
  if(m.id==='land'){M.objs.push(ringAt(LAND_PAD.x,.08,LAND_PAD.z,1.2,'#7cd39b'));const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,12,6),new THREE.MeshBasicMaterial({color:'#7cd39b',transparent:true,opacity:.5}));beacon.position.set(LAND_PAD.x,6,LAND_PAD.z);markers.add(beacon)}
  if(m.id==='wind'){M.objs.push(ballAt(0,4,-4,2,'#d8bf86',.15))}
  if(m.id==='rth'){S.pos.set(55,18,-60);S.onGround=false;S.armed=true;S.bat=18;S.yaw=Math.atan2(55,-60);M.objs.push(ringAt(0,.08,0,1.5,'#7cd39b'));const bc=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,20,6),new THREE.MeshBasicMaterial({color:'#7cd39b',transparent:true,opacity:.5}));bc.position.set(0,10,0);markers.add(bc)}
  if(m.id==='coins'){const gold=new THREE.MeshStandardMaterial({color:'#f2c14e',emissive:'#a8741a',metalness:.6,roughness:.25});
   M.orbs=ORBS.map(([x,y,z])=>{const o=new THREE.Group();const c=new THREE.Mesh(new THREE.IcosahedronGeometry(.38,1),gold);o.add(c);
    const h=new THREE.Mesh(new THREE.SphereGeometry(.85,20,14),new THREE.MeshBasicMaterial({color:'#ffd27a',transparent:true,opacity:.16,depthWrite:false}));o.add(h);
    o.position.set(x,y,z);o.userData.y=y;markers.add(o);return {p:new THREE.Vector3(x,y,z),o,got:false}});M.got=0}
  S.q.setFromEuler(eul.set(0,S.yaw,0,'YXZ'));S.w.set(0,0,0);S.thrO=0;S.hdg=S.yaw;S.py=S.pos.y;
  markActive();renderMissions();try{window.onSimMission&&window.onSimMission(m.id)}catch(e){}
  {const ot=hud.obj.querySelector('.ot');ot.textContent=m.title;const ob=document.createElement('span');ob.className='ob';ob.textContent=': '+m.brief;ot.appendChild(ob);const hb=document.getElementById('h-brief');if(hb)hb.innerHTML='<b>'+m.title+'</b> · '+m.brief;}
  if(m.id!=='rth')flash('اضغط مسافة أو زر ✕ / A للتسليح');
 }
 const ORBS=[[0,2,-8],[-20.5,3,-20],[-20.5,6,-40],[-28.5,1.5,-30],[-24,8.5,-28],[25,3,-36],[25,3,-50],[25,7.5,-46],[2,1.3,-36],[6,6,-20],[2,8.5,-24],[16,14.8,-16],[-12,4,-36],[12,2,-52],[28,12,4]];
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
  if(id==='free'||id==='hangar'){flash(S.armed?(opt.level===3?'طيران حر · وضع Acro':'طيران حر'):'اضغط مسافة للتسليح');return}
  if(id==='coins'){let nd=1e9;for(const b of M.orbs){if(b.got)continue;const d=p.distanceTo(b.p);if(d<1.1){b.got=true;b.o.visible=false;M.got++;buzzS()}else if(d<nd)nd=d}
   if(M.got>=M.orbs.length)return win();flash(`الكرات ${M.got} / ${M.orbs.length}${nd<1e8?' · أقرب كرة '+nd.toFixed(0)+' م':''}`);return}
  if(id==='hover'){const okz=Math.abs(p.y-3)<.7&&Math.hypot(p.x,p.z)<1.5;M.hold=okz?M.hold+dt:0;flash(`داخل المنطقة: ${M.hold.toFixed(1)} / 5.0 ث`);if(M.hold>=5)win()}
  if(id==='low'&&p.y>3&&S.armed&&!S.onGround)return crash('ارتفعت فوق ٣ أمتار. هذا تحدي طيران منخفض، خلك قريب من الأرض.');
  if(id==='orbit'){const dx=p.x-M.c.x,dz=p.z-M.c.z,r=Math.hypot(dx,dz),a=Math.atan2(dz,dx);const ok=r>=4&&r<=9&&p.y>=2&&p.y<=7;
   if(ok){if(M.last!=null){let d=a-M.last;if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;M.acc+=d}M.last=a}else{if(M.acc!==0&&Math.abs(M.acc)>.2)flash('خرجت من النطاق! العدّاد رجع صفر');M.acc=0;M.last=null}
   const pc=Math.min(100,Math.abs(M.acc)/(2*Math.PI)*100);if(ok)flash(`الدورة ${pc.toFixed(0)}٪ · البُعد ${r.toFixed(1)} م · الارتفاع ${p.y.toFixed(1)} م`);else if(!M.acc)flash(`ادخل النطاق: بُعد ٤–٩ م وارتفاع ٢–٧ م (الآن ${r.toFixed(1)} م / ${p.y.toFixed(1)} م)`);
   if(Math.abs(M.acc)>=2*Math.PI)win()}
  if(id==='pads'){const tg=M.pts[M.i];const d=Math.hypot(p.x-tg.p.x,p.z-tg.p.z);flash(`المنصة ${M.i+1} من ٣ · المسافة ${d.toFixed(1)} م`);
   if(S.onGround&&d<1.05&&S.vel.length()<.3&&S.t>1){M.i++;markActive();if(M.i>=M.pts.length)win();else flash('ممتاز! أقلع للمنصة التالية')}}
  if(id==='box'||id==='gates'||id==='night'||id==='slalom'||id==='low'){const tg=M.pts[M.i];const d=p.distanceTo(tg.p);flash(`النقطة ${M.i+1} من ${M.pts.length} · المسافة ${d.toFixed(0)} م`);if(d<({gates:1.3,night:1.3,slalom:1.4,low:.95})[id]||d<(id==='box'?1.6:0)){M.i++;markActive();if(M.i>=M.pts.length)win()}}
  if(id==='land'||id==='rth'){const P=id==='land'?LAND_PAD:HOME;const d=Math.hypot(p.x-P.x,p.z-P.z);flash(`إلى المهبط ${d.toFixed(1)} م · ارتفاع ${p.y.toFixed(1)} م`);
   if(S.onGround&&d<(id==='land'?1.2:1.5)&&S.vel.length()<.3&&S.t>1)win();
   if(id==='rth'&&S.bat<=0)crash('نفدت البطارية قبل الوصول. اختر أقصر مسار وحافظ على ارتفاع آمن.')}
  if(id==='wind'){const c=new THREE.Vector3(0,4,-4);const inz=p.distanceTo(c)<2;if(inz)M.hold+=dt;flash(`داخل الكرة: ${M.hold.toFixed(1)} / 15.0 ث · الريح ${wind.length().toFixed(1)} م/ث`);if(M.hold>=15)win()}
 }

 /* ---- input ---- */
 let padIdx=null,padName='';
 function setupInput(){
  addEventListener('keydown',e=>{if(!running)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))e.preventDefault();
   if(e.repeat)return;keys[e.code]=true;if(e.code==='Space')toggleArm();if(e.code==='KeyR')start(mission);if(e.code==='KeyC')cycleCam();if(e.code==='KeyV')cycleCam(-1)});
  addEventListener('keyup',e=>{keys[e.code]=false});
  addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
  addEventListener('gamepadconnected',e=>{padIdx=e.gamepad.index;padName=e.gamepad.id;padSt()});
  addEventListener('gamepaddisconnected',e=>{if(e.gamepad.index===padIdx){padIdx=null;padSt()}});
  $('#s-level').onchange=e=>{const was=opt.level;opt.level=+e.target.value;e.target.blur();try{localStorage.setItem('ku_sim_level',String(opt.level))}catch(x){}keysHelp();
   if(opt.level===3&&was!==3){setCam('fpv');setTimeout(()=>toast('وضع Acro: الطائرة ما ترجع مستوية لحالها، وتقدر تسوي قلبات ولفّات. الأفضل بيد تحكم.',3800),350)}};
  $('#s-mode').onchange=e=>{opt.mode=+e.target.value;keysHelp();e.target.blur()};
  $('#s-cam').onchange=e=>{setCam(e.target.value);e.target.blur()};
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
 function keysHelp(){const m2=opt.mode===2;$('#keys').innerHTML=`<span class="kbd">${m2?'W / S':'↑ / ↓'}</span><span>الدفع: صعود ونزول</span><span class="kbd">A / D</span><span>الانعراج: دوران</span><span class="kbd">${m2?'↑ / ↓':'W / S'}</span><span>الميل الأمامي: تقدّم وتراجع</span><span class="kbd">← / →</span><span>الميل الجانبي</span><span class="kbd">مسافة</span><span>تسليح / فصل</span><span class="kbd">C</span><span>تبديل الكاميرا</span><span class="kbd">Q / E</span><span>إمالة كاميرا الدرون</span><span class="kbd">R</span><span>إعادة المهمة</span>${opt.level===3?'<span class="kbd">Acro</span><span>العصا اليمنى تتحكم بسرعة الدوران، وعند تركها تبقى الطائرة على نفس الزاوية. منتصف عصا الدفع = تحويم.</span>':''}`}
 function toggleArm(){if(S.state!=='fly')return;if(S.armed){if(S.onGround||S.pos.y<.4){S.armed=false}else flash('لا يمكن فصل التسليح في الجو')}else{if(S.onGround)S.armed=true}}
 function cycleCam(d=1){setCam(CAMS[(CAMS.indexOf(opt.cam)+d+CAMS.length)%CAMS.length])}
 function setCam(c){opt.cam=c;const sel=$('#s-cam');if(sel)sel.value=c;gYaw=S.hdg;
  const on=c==='gimbal'||c==='fpv';camera.layers[on?'disable':'enable'](1);
  const fx=document.getElementById('camfx');if(fx){fx.hidden=!on;fx.dataset.m=c;const t=document.getElementById('cf-mode');if(t)t.textContent=c==='fpv'?'FPV':'CAM'}
  camToast(CAMN[c])}
 let ctT=0;function toast(t,ms=1300){const b=$('#simbay');let e=document.getElementById('cam-toast');if(!e){e=document.createElement('div');e.id='cam-toast';e.className='cam-toast';b.appendChild(e)}e.textContent=t;e.classList.add('on');clearTimeout(ctT);ctT=setTimeout(()=>e.classList.remove('on'),ms)}
 function camToast(t){toast('🎥 '+t)}
 const pbtn=[];
 function readInput(dt){
  const m2=opt.mode===2;
  const k=(a,b)=>(keys[a]?1:0)-(keys[b]?1:0);
  const tgt={thr:m2?k('KeyW','KeyS'):k('ArrowUp','ArrowDown'),yaw:k('KeyD','KeyA'),pitch:m2?k('ArrowUp','ArrowDown'):k('KeyW','KeyS'),roll:k('ArrowRight','ArrowLeft')};
  for(const a in kv){const d=tgt[a]-kv[a];kv[a]+=Math.sign(d)*Math.min(Math.abs(d),dt*(tgt[a]===0?6:3.2))}
  let tl=(keys.KeyQ?1:0)-(keys.KeyE?1:0);
  let g={thr:0,yaw:0,pitch:0,roll:0},gp=null;
  try{const ps=navigator.getGamepads?navigator.getGamepads():[];for(const p of ps){if(p&&p.connected){gp=p;break}}}catch(e){}
  if(gp){if(padIdx==null){padIdx=gp.index;padName=gp.id;padSt()}
   const dz=v=>Math.abs(v)<.08?0:(v-Math.sign(v)*.08)/.92;const ax=gp.axes;
   const lx=dz(ax[0]||0),ly=-dz(ax[1]||0),rx=dz(ax[2]||0),ry=-dz(ax[3]||0);
   g=m2?{thr:ly,yaw:lx,pitch:ry,roll:rx}:{pitch:ly,yaw:lx,thr:ry,roll:rx};
   const b=i=>gp.buttons[i]&&gp.buttons[i].pressed;if(b(4))tl+=1;if(b(5))tl-=1;[0,2,3,9].forEach(i=>{const p=b(i);if(p&&!pbtn[i]){if(i===0||i===9)toggleArm();if(i===2)cycleCam();if(i===3)start(mission)}pbtn[i]=p})}
  const t=m2?{thr:touch.l.y,yaw:touch.l.x,pitch:touch.r.y,roll:touch.r.x}:{pitch:touch.l.y,yaw:touch.l.x,thr:touch.r.y,roll:touch.r.x};
  if(tl)gTilt=Math.max(-1.45,Math.min(.35,gTilt+tl*dt*.9));
  const c=v=>Math.max(-1,Math.min(1,v));
  for(const a in IN)if(a!=='src')IN[a]=c(kv[a]+g[a]+t[a]);
 }

 /* ---- physics ----
   Levels 0–2: angle (self-levelling) mode with expo sticks. Level 3: Acro / rate mode like Liftoff & Betaflight:
   sticks command rotation rate, the quad keeps its attitude when you let go, throttle is direct with a mid-stick hover curve. */
 const G=9.81,TWR=4.2,HOV=1/TWR;
 const q=ok?new THREE.Quaternion():null,dq=ok?new THREE.Quaternion():null,eul=ok?new THREE.Euler(0,0,0,'YXZ'):null,up=ok?new THREE.Vector3():null,acc=ok?new THREE.Vector3():null,tmp=ok?new THREE.Vector3():null,fwd=ok?new THREE.Vector3():null;
 // Betaflight "Actual" rates: centre sensitivity, max rate (deg/s), expo
 function bfRate(x,c,mx,ex){const e=Math.abs(x)*(Math.pow(x,5)*ex+x*(1-ex));return (x*c+Math.max(0,mx-c)*e)*Math.PI/180}
 const RATES={rp:[170,640,.5],y:[160,420,.35]};
 // throttle curve: stick centre = hover, so self-centring gamepad/touch sticks work; bottom = motors idle, top = full power
 const thrCurve=x=>x<0?HOV*(1+x):HOV+(1-HOV)*x;
 const expo=(v,e)=>v*(1-e)+v*v*v*e;
 function physics(dt){
  if(S.state!=='fly'){return}
  S.t+=dt;
  const lvl=opt.level,acro=lvl===3,maxTilt=[.38,.6,.78][lvl]||.78;
  // wind
  if(mission.id==='wind'){const t=S.t;wind.set(2.4+Math.sin(t*.7)*1.6+Math.sin(t*2.3)*.8,Math.sin(t*1.1)*.3,Math.cos(t*.5)*1.4+Math.sin(t*1.9)*.6)}
  else if(mission.id==='rth'){wind.set(-1.2,0,1.5)}else wind.set(0,0,0);
  if(acro){
   // body rates follow the sticks through a short PID/motor lag; nothing pulls the quad back to level
   const k=1-Math.exp(-dt/.035);const on=S.armed?1:0;
   const tx=-bfRate(IN.pitch,...RATES.rp)*on,ty=-bfRate(IN.yaw,...RATES.y)*on,tz=-bfRate(IN.roll,...RATES.rp)*on;
   S.w.x+=(tx-S.w.x)*k;S.w.y+=(ty-S.w.y)*k;S.w.z+=(tz-S.w.z)*k;
   const ang=S.w.length()*dt;if(ang>1e-7){tmp.copy(S.w).normalize();dq.setFromAxisAngle(tmp,ang);S.q.multiply(dq).normalize()}
   if(S.onGround&&thrCurve(IN.thr)<=HOV*1.05){eul.setFromQuaternion(S.q,'YXZ');eul.x*=.7;eul.z*=.7;S.q.setFromEuler(eul);S.w.multiplyScalar(.5)}
   eul.setFromQuaternion(S.q,'YXZ');S.pitch=-eul.x;S.roll=-eul.z;S.yaw=eul.y;
  }else{
   // angle mode: stick sets the tilt angle (with expo), the controller drives toward it with a rate limit
   const tp=expo(IN.pitch,.35)*maxTilt,tr=expo(IN.roll,.35)*maxTilt,kp=[9,11,14][lvl],lim=6;
   S.pitch+=Math.max(-lim,Math.min(lim,(tp-S.pitch)*kp))*dt;S.roll+=Math.max(-lim,Math.min(lim,(tr-S.roll)*kp))*dt;
   if(S.armed)S.yaw-=bfRate(IN.yaw,100,230,.3)*dt;
   eul.set(-S.pitch,S.yaw,-S.roll,'YXZ');S.q.setFromEuler(eul);
  }
  up.set(0,1,0).applyQuaternion(S.q);
  fwd.set(0,0,-1).applyQuaternion(S.q);if(Math.hypot(fwd.x,fwd.z)>.25)S.hdg=Math.atan2(-fwd.x,-fwd.z);
  // thrust (with motor spool-up lag)
  let tc=0;const maxA=acro?TWR*G:24;
  if(S.armed&&S.bat>0){
   if(acro)tc=thrCurve(IN.thr)*TWR*G;
   else if(lvl<2){const vz=IN.thr*(lvl===0?2.5:3.5);tc=(G+(vz-S.vel.y)*4)/Math.max(.55,up.y);tc=Math.max(0,Math.min(24,tc));if(S.onGround&&IN.thr<=0.05)tc=Math.min(tc,9.0)}
   else tc=IN.thr>=0?G+IN.thr*13:G*(1+IN.thr);
  }
  S.thrO+=(tc-S.thrO)*(1-Math.exp(-dt/.03));const th=S.thrO;
  acc.copy(up).multiplyScalar(th);acc.y-=G;
  // air drag: linear + quadratic, relative to the wind, so the quad carries momentum like a real one
  tmp.copy(S.vel).sub(wind);const sp=tmp.length();acc.addScaledVector(tmp,-(.1+.05*sp));
  // battery
  if(S.armed){const base=mission.id==='rth'?.22:.12;S.bat=Math.max(0,S.bat-dt*(base+th/maxA*.35))}
  S.py=S.pos.y;
  S.vel.addScaledVector(acc,dt);
  S.pos.addScaledVector(S.vel,dt);
  // ground (floor, or the top of a container / rack / mezzanine / rooftop)
  const gy=groundH(S.pos.x,S.pos.z,Math.max(S.pos.y,S.py))+.06;
  if(S.pos.y<=gy){
   if(!S.onGround){const vy=-S.vel.y,h=Math.hypot(S.vel.x,S.vel.z);if(vy>2.5)return crash(`هبوط قاسٍ بسرعة نزول ${vy.toFixed(1)} م/ث. خفّف السرعة في المتر الأخير.`);
    if(up.y<.3)return crash('انقلبت الطائرة ولمست الأرض. في وضع Acro عدّل وضعها قبل ما تنزل.');
    if(h>3.2||up.y<.82)return crash('لامست الأرض وأنت مائل وتتحرك بسرعة.')}
   S.pos.y=gy;if(S.vel.y<0)S.vel.y=0;S.vel.x*=.6;S.vel.z*=.6;S.onGround=true;
  }else if(S.pos.y>gy+.05)S.onGround=false;
  if(S.onGround&&!acro){S.pitch*=.6;S.roll*=.6}
  // obstacles & bounds
  {const hb=hitBox(S.pos);if(hb)return crash(hb.msg)}
  if(M.poles){for(const o of M.poles){if(Math.hypot(S.pos.x-o.x,S.pos.z-o.z)<o.r+.28&&S.pos.y<o.h+.15)return crash('اصطدمت بالعمود. خفّف سرعتك وخذ مسافة أوسع.')}}
  if(M.pts&&(mission.id==='gates'||mission.id==='night')){for(const gp of M.pts){const g=gp.o;tmp.copy(S.pos).sub(g.position).applyAxisAngle(new THREE.Vector3(0,1,0),-g.rotation.y);if(Math.abs(tmp.z)<.2&&((Math.abs(Math.abs(tmp.x)-1.5)<.2&&Math.abs(tmp.y)<1.2)||(Math.abs(Math.abs(tmp.y)-1.1)<.2&&Math.abs(tmp.x)<1.6)))return crash('اصطدمت بإطار البوابة. خفّف السرعة واستهدف المنتصف.')}}
  if(MAP==='hangar'){const r=.25;if(S.pos.x<HB.x0+r||S.pos.x>HB.x1-r||S.pos.z<HB.z0+r||S.pos.z>HB.z1-r)return crash('اصطدمت بجدار المبنى. خفّف سرعتك قبل المنعطفات.');if(S.pos.y>HB.top-.2)return crash('اصطدمت بسقف المبنى.')}
  else{if(Math.hypot(S.pos.x,S.pos.z)>180)return crash('خرجت عن حدود الميدان.');if(S.pos.y>120){S.pos.y=120;S.vel.y=Math.min(0,S.vel.y)}}
  if(S.bat<=0&&!S.onGround&&mission.id!=='rth'){S.armed=false}
  updMission(dt);
 }

 /* ---- render ---- */
 const camOff=ok?new THREE.Vector3():null,look=ok?new THREE.Vector3():null,Y_AX=ok?new THREE.Vector3(0,1,0):null,tq=ok?new THREE.Quaternion():null,FPV_TILT=ok?new THREE.Quaternion().setFromEuler(new THREE.Euler(.44,0,0,'YXZ')):null;
 function render(dt){
  drone.position.copy(S.pos);drone.quaternion.copy(S.q);
  const spin=S.armed?(20+S.thrO*1.1):0;props.forEach((p,i)=>p.rotation.y+=spin*dt*(i%3===0?1:-1));
  const sock=scene.getObjectByName('sock');if(sock){sock.rotation.y=Math.atan2(-wind.z,wind.x);}
  if(markers)markers.children.forEach(m=>{if(m.geometry&&m.geometry.type==='TorusGeometry')m.rotation.z+=dt*.6});
  if(M.orbs){const tt=performance.now()/1000;M.orbs.forEach((b,i)=>{if(!b.got){b.o.rotation.y+=dt*1.6;b.o.position.y=b.o.userData.y+Math.sin(tt*2+i)*.12}})}
  if(opt.cam==='chase'){camOff.set(0,1.3,3.4).applyAxisAngle(Y_AX,S.hdg);tmp.copy(S.pos).add(camOff);if(tmp.y<.3)tmp.y=.3;
   if(MAP==='hangar'){tmp.x=Math.max(HB.x0+.4,Math.min(HB.x1-.4,tmp.x));tmp.z=Math.max(HB.z0+.4,Math.min(HB.z1-.4,tmp.z));tmp.y=Math.min(HB.top-.4,tmp.y)}
   camera.position.lerp(tmp,1-Math.exp(-dt*5));look.copy(S.pos).y+=.25;camera.lookAt(look);camera.fov=65}
  else if(opt.cam==='pilot'){camera.position.set(0,1.7,MAP==='hangar'?6:7);camera.lookAt(S.pos);const d=camera.position.distanceTo(S.pos);camera.fov=Math.max(14,Math.min(60,60-d*.7))}
  else if(opt.cam==='gimbal'){
   // stabilised 3-axis gimbal under the nose: follows heading smoothly, keeps the horizon level
   camOff.set(0,-.035,-.2).applyAxisAngle(Y_AX,S.hdg);camera.position.copy(S.pos).add(camOff);if(camera.position.y<.04)camera.position.y=.04;
   {let d=S.hdg-gYaw;d=Math.atan2(Math.sin(d),Math.cos(d));gYaw+=d*Math.min(1,dt*7)}
   const sh=S.armed?(.0006+Math.hypot(S.vel.x,S.vel.z)*.00012):0,tt=performance.now()/1000;
   eul.set(gTilt+Math.sin(tt*31)*sh,gYaw+Math.sin(tt*23)*sh,Math.sin(tt*17)*sh*.5,'YXZ');camera.quaternion.setFromEuler(eul);camera.fov=74}
  else{
   // FPV: camera fixed to the frame with 25° uptilt, so it banks and pitches with the drone
   q.copy(S.q);
   camOff.set(0,.035,-.19).applyQuaternion(q);camera.position.copy(S.pos).add(camOff);if(camera.position.y<.05)camera.position.y=.05;
   camera.quaternion.copy(q).multiply(FPV_TILT);
   if(S.armed){const v=.0012+Math.min(.004,S.thrO*.00009),tt=performance.now()/1000;eul.set(Math.sin(tt*47)*v,Math.sin(tt*41)*v,0,'YXZ');tq.setFromEuler(eul);camera.quaternion.multiply(tq)}
   camera.fov=104}
  camera.updateProjectionMatrix();
  renderer.render(scene,camera);
 }
 let hudT=0;
 function updHud(dt){hudT+=dt;if(hudT<.08)return;hudT=0;
  hud.alt.textContent=Math.max(0,S.pos.y-.06).toFixed(1);hud.spd.textContent=Math.hypot(S.vel.x,S.vel.z).toFixed(1);hud.vs.textContent=(S.vel.y>=0?'+':'')+S.vel.y.toFixed(1);
  hud.bat.textContent=Math.round(S.bat);hud.batbar.style.width=S.bat+'%';hud.batbar.style.background=S.bat<25?'var(--signal)':'var(--ok)';
  const t=Math.floor(S.t);hud.t.textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
  hud.home.textContent=Math.hypot(S.pos.x,S.pos.z).toFixed(0);
  if(opt.cam==='gimbal'||opt.cam==='fpv'){const r=document.getElementById('cf-rec');if(r)r.textContent=hud.t.textContent;const gt=document.getElementById('cf-tilt');if(gt)gt.style.top=(Math.max(0,Math.min(1,(-gTilt+.35)/1.8))*100)+'%';const h=document.getElementById('cf-hdg');if(h){let d=Math.round((-S.hdg*57.2958)%360);if(d<0)d+=360;h.textContent=String(d).padStart(3,'0')+'°'}}
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
 function buzzS(){try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}
  try{const ps=navigator.getGamepads?navigator.getGamepads():[];for(const p of ps){if(p&&p.vibrationActuator)p.vibrationActuator.playEffect('dual-rumble',{duration:80,strongMagnitude:.2,weakMagnitude:.5}).catch(()=>{})}}catch(e){}}
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

