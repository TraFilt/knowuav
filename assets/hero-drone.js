// Know UAV — landing hero: a quadcopter that chases your pointer, tilts into turns, kicks up sand, and flips on click.
(function(){
  const bay = document.getElementById('bay'); if(!bay || typeof THREE==='undefined') return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(2, devicePixelRatio||1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding; bay.prepend(renderer.domElement);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#0c110e', 9, 22);
  const cam = new THREE.PerspectiveCamera(40, 1, .1, 60); cam.position.set(0, 3.2, 7.2); cam.lookAt(0, 1.1, 0);
  scene.add(new THREE.HemisphereLight('#f3ead2', '#3a3020', .75));
  const sun = new THREE.DirectionalLight('#ffe9c2', 1.15); sun.position.set(-3, 8, 4); sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024); Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6}); scene.add(sun);

  // ground: sand with a faint survey grid + landing pad
  const gc = document.createElement('canvas'); gc.width = gc.height = 512; const x = gc.getContext('2d');
  x.fillStyle = '#3b3322'; x.fillRect(0,0,512,512);
  for(let i=0;i<2600;i++){ x.fillStyle = `rgba(${150+Math.random()*60},${125+Math.random()*50},${80+Math.random()*30},${Math.random()*.12})`; x.fillRect(Math.random()*512,Math.random()*512,2,2); }
  x.strokeStyle = 'rgba(216,191,134,.16)'; x.lineWidth = 1; for(let i=0;i<=512;i+=32){ x.beginPath(); x.moveTo(i,0); x.lineTo(i,512); x.stroke(); x.beginPath(); x.moveTo(0,i); x.lineTo(512,i); x.stroke(); }
  const gt = new THREE.CanvasTexture(gc); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(6,6); gt.encoding = THREE.sRGBEncoding;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40,40), new THREE.MeshStandardMaterial({map:gt, roughness:1}));
  ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);
  const pc = document.createElement('canvas'); pc.width = pc.height = 256; const p = pc.getContext('2d');
  p.fillStyle = '#20251f'; p.beginPath(); p.arc(128,128,124,0,7); p.fill(); p.strokeStyle = '#d8bf86'; p.lineWidth = 7; p.beginPath(); p.arc(128,128,104,0,7); p.stroke();
  p.fillStyle = '#d8bf86'; p.font = 'bold 120px IBM Plex Mono, monospace'; p.textAlign = 'center'; p.textBaseline = 'middle'; p.fillText('H',128,136);
  const ptex = new THREE.CanvasTexture(pc); ptex.encoding = THREE.sRGBEncoding;
  const pad = new THREE.Mesh(new THREE.CircleGeometry(.9,40), new THREE.MeshStandardMaterial({map:ptex, roughness:.9})); pad.rotation.x = -Math.PI/2; pad.position.set(0,.01,1); pad.receiveShadow = true; scene.add(pad);

  const drone = makeDrone({scale:2.2}); scene.add(drone);
  const pos = new THREE.Vector3(0, .12, 1), vel = new THREE.Vector3(), target = new THREE.Vector3(0, 1.6, 0);
  let yaw = 0, pitch = 0, roll = 0, flip = 0, flipping = false, lastMove = -10, t = 0, bat = 100, started = false;

  // dust particles (prop wash)
  const N = 260, dg = new THREE.BufferGeometry(), dp = new Float32Array(N*3), dv = []; for(let i=0;i<N;i++){ dp[i*3+1] = -5; dv.push({x:0,y:0,z:0,life:0}); }
  dg.setAttribute('position', new THREE.BufferAttribute(dp,3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({color:'#cbb07a', size:.06, transparent:true, opacity:.55, depthWrite:false})); scene.add(dust);
  let di = 0;
  function emit(n, strength){ for(let k=0;k<n;k++){ const i = di++ % N, a = Math.random()*Math.PI*2, r = .2+Math.random()*.4;
    dp[i*3] = pos.x+Math.cos(a)*r; dp[i*3+1] = .03; dp[i*3+2] = pos.z+Math.sin(a)*r;
    dv[i] = {x:Math.cos(a)*(1+Math.random()*2)*strength, y:Math.random()*.8*strength, z:Math.sin(a)*(1+Math.random()*2)*strength, life:1}; } }

  // shadow blob for depth cue
  const blob = new THREE.Mesh(new THREE.CircleGeometry(.6,24), new THREE.MeshBasicMaterial({color:'#000', transparent:true, opacity:.25, depthWrite:false}));
  blob.rotation.x = -Math.PI/2; blob.position.y = .015; scene.add(blob);

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0,0,1), 0), hit = new THREE.Vector3();
  function point(e){ const r = bay.getBoundingClientRect(); ndc.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
    ray.setFromCamera(ndc, cam); if(ray.ray.intersectPlane(plane, hit)){ target.set(THREE.MathUtils.clamp(hit.x,-3.6,3.6), THREE.MathUtils.clamp(hit.y,.5,3.4), THREE.MathUtils.clamp(-ndc.y*1.2,-1.5,1.5)); }
    lastMove = t; started = true; const h = document.getElementById('hint'); if(h) h.style.opacity = 0; }
  bay.addEventListener('pointermove', point);
  bay.addEventListener('pointerdown', e => { point(e); if(!flipping && pos.y > .8){ flipping = true; flip = 0; } });
  // page-wide follow on desktop when the pointer is near the hero
  window.addEventListener('pointermove', e => { if(e.pointerType !== 'mouse') return; const r = bay.getBoundingClientRect(); if(e.clientY < r.bottom + 40 && e.clientY > r.top - 200) point(e); }, {passive:true});

  function resize(){ const w = bay.clientWidth, h = bay.clientHeight; renderer.setSize(w,h,false); cam.aspect = w/h; cam.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(bay); resize();

  const hAlt = document.getElementById('h-alt'), hSpd = document.getElementById('h-spd'), hBat = document.getElementById('h-bat');
  let hudT = 0, visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if(visible && !raf) loop(); }).observe(bay);
  let raf = 0, last = performance.now();
  function loop(){
    const now = performance.now(), dt = Math.min(.04, (now-last)/1000); last = now; t += dt;
    // takeoff then idle pattern when the pointer is away
    if(t - lastMove > 3.5){ const k = t*.45; target.set(Math.sin(k)*2.4, 1.5 + Math.sin(k*2)*.35, Math.sin(k*2)*.8); }
    if(!started && t < 1.6) target.set(0, .12 + t*.9, 1);
    // PD chase
    const acc = target.clone().sub(pos).multiplyScalar(9).sub(vel.clone().multiplyScalar(4.6));
    acc.clampLength(0, 26); vel.addScaledVector(acc, dt); pos.addScaledVector(vel, dt); if(pos.y < .12){ pos.y = .12; vel.y = Math.max(0, vel.y); }
    // attitude from acceleration (tilt into the move) + yaw toward travel
    const tp = THREE.MathUtils.clamp(-acc.z*.045, -.6, .6), tr = THREE.MathUtils.clamp(-acc.x*.045, -.6, .6);
    pitch += (tp - pitch)*Math.min(1, dt*8); roll += (tr - roll)*Math.min(1, dt*8);
    const hs = Math.hypot(vel.x, vel.z); if(hs > .6){ const ty = Math.atan2(-vel.x, -vel.z)*.35; yaw += (ty - yaw)*Math.min(1, dt*2); } else yaw += (0 - yaw)*Math.min(1, dt*1.2);
    if(flipping){ flip += dt*9; if(flip >= Math.PI*2){ flip = 0; flipping = false; } }
    drone.position.copy(pos); drone.rotation.set(-pitch, yaw, -roll - flip, 'YXZ');
    drone.userData.spin(dt, 95 + vel.y*10);
    drone.userData.leds.forEach((l,i) => l.visible = (Math.floor(t*3 + i*.5) % 3) !== 0);
    // ground effects
    const alt = pos.y; blob.position.set(pos.x, .015, pos.z); blob.scale.setScalar(1 + alt*.35); blob.material.opacity = Math.max(.05, .35 - alt*.08);
    if(alt < 1.4 && !reduce) emit(Math.ceil((1.4-alt)*3), (1.6-alt));
    for(let i=0;i<N;i++){ const v = dv[i]; if(v.life <= 0) continue; v.life -= dt*.9; dp[i*3] += v.x*dt; dp[i*3+1] += v.y*dt; dp[i*3+2] += v.z*dt; v.x *= .97; v.z *= .97; v.y -= dt*.6; if(dp[i*3+1] < .02 || v.life <= 0){ dp[i*3+1] = -5; v.life = 0; } }
    dg.attributes.position.needsUpdate = true;
    bat = Math.max(12, 100 - t*.15);
    hudT += dt; if(hudT > .1){ hudT = 0; hAlt.textContent = Math.max(0, alt*2.5 - .3).toFixed(1); hSpd.textContent = (vel.length()*2.5).toFixed(1); hBat.textContent = Math.round(bat); }
    renderer.render(scene, cam);
    raf = (visible && !reduce) ? requestAnimationFrame(loop) : 0;
  }
  loop();
})();
