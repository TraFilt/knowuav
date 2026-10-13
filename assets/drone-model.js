// Know UAV — shared quadcopter model (three.js r128)
window.makeDrone = function(opts){
  opts = opts || {};
  const s = opts.scale || 1;
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({color:'#2b332e',roughness:.55,metalness:.25});
  const accent = new THREE.MeshStandardMaterial({color:'#d8bf86',roughness:.45,metalness:.2});
  const dark = new THREE.MeshStandardMaterial({color:'#151917',roughness:.7});
  const hull = new THREE.Mesh(new THREE.BoxGeometry(.28,.09,.36), body); hull.castShadow = true; g.add(hull);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(.12,20,12,0,Math.PI*2,0,Math.PI/2), accent);
  canopy.scale.set(1,.45,1.25); canopy.position.y = .045; canopy.castShadow = true; g.add(canopy);
  const cam = new THREE.Mesh(new THREE.SphereGeometry(.045,16,12), dark); cam.position.set(0,-.05,-.17); g.add(cam);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(.025,16), new THREE.MeshBasicMaterial({color:'#4a6a8a'}));
  lens.position.set(0,-.05,-.214); lens.rotation.y = Math.PI; g.add(lens);
  const armG = new THREE.CylinderGeometry(.018,.022,.36,8);
  const props = [], leds = [];
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz],i)=>{
    const arm = new THREE.Mesh(armG, body); arm.rotation.z = Math.PI/2; arm.rotation.y = Math.atan2(sz, -sx);
    arm.position.set(sx*.13, 0, sz*.13); arm.castShadow = true; g.add(arm);
    const mx = sx*.25, mz = sz*.25;
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(.04,.045,.06,14), new THREE.MeshStandardMaterial({color:'#8e8e86',metalness:.7,roughness:.3}));
    motor.position.set(mx,.02,mz); motor.castShadow = true; g.add(motor);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.09,6), dark); leg.position.set(mx,-.04,mz); g.add(leg);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(.15,32), new THREE.MeshBasicMaterial({color:'#e8e2cc',transparent:true,opacity:.0,side:THREE.DoubleSide,depthWrite:false}));
    disc.rotation.x = -Math.PI/2; disc.position.set(mx,.058,mz); g.add(disc);
    const blade = new THREE.Group();
    const bm = new THREE.MeshStandardMaterial({color:i%3===0?'#1c1f1d':'#d8bf86',roughness:.6});
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(.28,.004,.03), bm); blade.add(b1);
    blade.position.set(mx,.06,mz); g.add(blade);
    props.push({blade, disc, dir: (i===0||i===3)?1:-1});
    const led = new THREE.Mesh(new THREE.SphereGeometry(.014,8,6), new THREE.MeshBasicMaterial({color: sz<0 ? '#ff3b2f' : '#4cff7a'}));
    led.position.set(mx, -.005, mz + (sz<0?-.045:.045)); g.add(led); leds.push(led);
  });
  g.scale.setScalar(s);
  g.rotation.order = 'YXZ';
  g.userData = {props, leds, spin(dt, rpm){ props.forEach(p=>{ p.blade.rotation.y += rpm*dt*p.dir; p.disc.material.opacity = Math.min(.35, rpm/120); p.blade.visible = rpm < 70; }); }};
  return g;
};
