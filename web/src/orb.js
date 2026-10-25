import * as THREE from 'three';

import { vertexShader, fragmentShader } from './orb-shaders.js';

export function createOrb(container, initial, canvas, onError, compact = false) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'default' });
  } catch {
    onError('当前设备无法启用 3D 渲染，仍可使用状态预览。');
    return { update() {}, pause() {}, dispose() {} };
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 30);
  camera.position.z = 6.4;
  renderer.setClearColor(0x000000, 0);
  const rows = compact ? 48 : matchMedia('(max-width: 650px)').matches ? 105 : 150;
  const columns = rows*2;
  const perLayer = rows*columns;
  const count = perLayer*3;
  const positions = new Float32Array(count*3);
  const seeds = new Float32Array(count);
  const layers = new Float32Array(count);
  const goldenAngle = Math.PI*(3-Math.sqrt(5));
  const random = (i) => { const x=Math.sin(i*127.1+311.7)*43758.5453; return x-Math.floor(x); };
  for (let i=0; i<count; i++) {
    const layer = Math.floor(i/perLayer);
    const index = i%perLayer;
    const row = Math.floor(index/columns);
    const column = index%columns;
    // Slightly jittered surface samples retain the reference's woven particle texture.
    const y = layer===0 ? random(i*3+1)*2-1 : 1-2*(row+.5+(random(i+7)-.5)*.25)/rows;
    const r = Math.sqrt(1-y*y);
    const theta = layer===0 ? random(i*3+2)*Math.PI*2 : (column+(row%2)*.5+(random(i+19)-.5)*.25)/columns*Math.PI*2;
    seeds[i] = random(i*3+3);
    layers[i] = layer;
    const radius = 1.64;
    positions.set([Math.cos(theta)*r*radius,y*radius,Math.sin(theta)*r*radius],i*3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
  geometry.setAttribute('aLayer',new THREE.BufferAttribute(layers,1));
  const uniforms = {
    uTime: { value: 0 }, uJumpTime: { value: 0 }, uEnergy: { value: initial.energy }, uLevel: { value: 0 },
    uFault: { value: 0 }, uBlocked: { value: 0 }, uPixelRatio: { value: 1 },
    uColor: { value: new THREE.Color(initial.color) }, uSecondary: { value: new THREE.Color(initial.secondary) },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false });
  const particles = new THREE.Points(geometry,material);
  scene.add(particles);

  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(240*3);
  for(let i=0;i<240;i++) {
    const angle = i*goldenAngle;
    const radius = 2.2+(i%17)/17*2.5;
    starPositions.set([Math.cos(angle)*radius,Math.sin(angle)*radius,(i%13)/13*2-2],i*3);
  }
  starGeometry.setAttribute('position',new THREE.BufferAttribute(starPositions,3));
  const starMaterial = new THREE.PointsMaterial({ color:0x6986b9,size:.009,transparent:true,opacity:.3,depthWrite:false });
  const stars = new THREE.Points(starGeometry,starMaterial);
  scene.add(stars);

  let target=initial, paused=false, previous=performance.now(), speed=initial.speed, time=0, lost=false, disposed=false;
  let lastWidth=0, lastHeight=0, lastRatio=0;
  const color = new THREE.Color(initial.color), secondary = new THREE.Color(initial.secondary);
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height || lost || disposed) return;
    const ratio = Math.min(devicePixelRatio,1.25);
    if (width===lastWidth && height===lastHeight && ratio===lastRatio) return;
    lastWidth=width;lastHeight=height;lastRatio=ratio;
    renderer.setPixelRatio(ratio);
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value=ratio;
    if (!document.hidden) renderer.render(scene,camera);
  }
  const observer=new ResizeObserver(resize);
  observer.observe(container);
  function contextLost(event) {
    event.preventDefault();
    lost=true;
    syncLoop();
    onError('3D 渲染连接中断，请刷新页面恢复。');
  }
  renderer.domElement.addEventListener('webglcontextlost',contextLost);
  function renderFrame(now) {
    if(paused || document.hidden || lost || disposed || now-previous < 1000/30-.5) return;
    const dt=Math.min((now-previous)/1000,.1);previous=now;
    const ease=1-Math.exp(-dt*3);
    speed=THREE.MathUtils.lerp(speed,target.speed,ease);
    uniforms.uEnergy.value=THREE.MathUtils.lerp(uniforms.uEnergy.value,target.energy,ease);
    uniforms.uLevel.value=THREE.MathUtils.lerp(uniforms.uLevel.value,target.level,ease);
    uniforms.uFault.value=THREE.MathUtils.lerp(uniforms.uFault.value,target.state==='error'?1:0,ease);
    uniforms.uBlocked.value=THREE.MathUtils.lerp(uniforms.uBlocked.value,target.state==='blocked'?1:0,ease);
    uniforms.uColor.value.lerp(color,ease);
    uniforms.uSecondary.value.lerp(secondary,ease);
    if(!paused) {
      // Blocked motion holds periodically; faults offset bands without flashing.
      const hold=target.state==='blocked' && Math.sin(now*.0012)>.0;
      if(!hold) time+=dt*speed*2.5;
      uniforms.uTime.value=time;
      if(!hold) uniforms.uJumpTime.value+=dt;
      particles.rotation.y=time*.025;
      particles.rotation.z=Math.sin(time*.13)*.035;
      stars.rotation.z=time*.006;
    }
    renderer.render(scene,camera);
  }
  function syncLoop() {
    previous=performance.now();
    renderer.setAnimationLoop(paused || document.hidden || lost || disposed ? null : renderFrame);
  }
  document.addEventListener('visibilitychange',syncLoop);
  resize();
  syncLoop();
  return {
    update(next) { target=next;color.set(next.color);secondary.set(next.secondary); },
    pause(value) {
      paused=value;
      syncLoop();
    },
    dispose() {
      if (disposed) return;
      disposed=true;
      renderer.setAnimationLoop(null);observer.disconnect();
      document.removeEventListener('visibilitychange',syncLoop);
      renderer.domElement.removeEventListener('webglcontextlost',contextLost);
      geometry.dispose();material.dispose();starGeometry.dispose();starMaterial.dispose();
      renderer.dispose();
    },
  };
}
