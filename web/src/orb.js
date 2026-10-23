import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const vertexShader = `
  uniform float uTime, uJumpTime, uEnergy, uLevel, uFault, uBlocked, uPixelRatio;
  uniform vec3 uColor, uSecondary;
  attribute float aSeed, aLayer;
  varying vec3 vColor;
  varying float vAlpha;
  float field(vec3 p, float t) {
    return sin(p.x*2.6 + sin(p.y*2.3 + t*.3) + t*.22)
      * cos(p.z*2.4 - p.y*1.5 + t*.28)
      + .36*sin(p.y*4.1 + p.z*3.2 - t*.4);
  }
  void main() {
    vec3 n = normalize(position);
    float t = uTime;
    float f = field(n, t);
    float phase = t*1.4+aLayer*2.3;
    float wave = sin(n.x*3.2+sin(n.y*2.5+phase)*1.3+phase*.7)
      * cos(n.z*2.8-n.y*1.4-phase*.6);
    float curl = sin(n.y*4.4+n.z*2.2+phase*.9);
    float membrane = sin(wave*2.4+n.y*3.0+phase*.25);
    float fold = smoothstep(-.6,.8,membrane);
    float isSheet = step(.5,aLayer);
    float crease = sin(n.y*7.0+n.x*4.0+sin(n.z*4.0-phase)*1.5+phase*.8);
    float radius = 1.64 + isSheet*(-.21+wave*(.29+uEnergy*.10)+crease*.075);
    radius += (1.0-isSheet)*f*.012;
    vec3 p = n*radius;
    // Tangential motion folds coherent surfaces instead of inflating concentric shells.
    p += isSheet*(vec3(n.y,-n.x,0.0)*curl*.22
      + cross(n,vec3(.3,.8,.2))*sin(wave*3.0-phase)*.18);
    p += n*uLevel*.045*sin(n.y*6.0-t*2.0);
    float cycle = fract(uJumpTime*(.08+uEnergy*.08)+aSeed*7.0);
    float pulse = sin(clamp((cycle-.84)/.16,0.0,1.0)*3.14159265);
    float escape = (1.0-isSheet)*step(.94,aSeed)*pulse;
    p += n*escape*(.18+uEnergy*.45);
    float band = floor((n.y+1.0)*9.0);
    float tear = sin(band*7.0+floor(t*1.3));
    p.x += uFault*step(.4,tear)*.19;
    p *= 1.0-uBlocked*.045*step(.0,n.y);
    vec4 mvPosition = modelViewMatrix*vec4(p,1.0);
    float shade = .35+.65*smoothstep(-1.0,.7,n.z);
    float cyan = smoothstep(.05,.85,sin(n.x*3.0+n.y*2.7+f-t*.15));
    float lilac = smoothstep(.82,1.0,sin(f*2.8-n.y*2.0+t*.1));
    vec3 deep = uColor*.48;
    vec3 blue = uColor*1.15;
    vec3 aqua = mix(uColor,uSecondary,cyan);
    vColor = mix(deep,blue,.4+.6*fold);
    vColor = mix(vColor,aqua,cyan*(.35+.65*fold));
    vColor = mix(vColor,vec3(.55,.36,1.0),lilac*.6);
    vColor *= 1.1+fold*.95+escape*.7;
    float edge = pow(1.0-abs(normalize(normalMatrix*n).z),2.0);
    vAlpha = mix(.13,.30+fold*.23+edge*.18,isSheet)*shade;
    vAlpha *= mix(1.0,.22+.78*smoothstep(-.6,.4,wave),isSheet);
    vAlpha *= 1.0-uFault*.8*step(.35,tear);
    vAlpha *= 1.0-uBlocked*.65*step(.0,n.y)*step(.0,n.x);
    gl_PointSize = min(4.5,(2.6+aSeed*.9+escape*.5)*uPixelRatio*(3.5/-mvPosition.z));
    gl_Position = projectionMatrix*mvPosition;
  }
`;
const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord-.5)*2.0;
    if (d>1.0) discard;
    float alpha = exp(-d*d*4.5)*vAlpha;
    gl_FragColor = vec4(vColor,alpha);
  }
`;

export function createOrb(container, initial, canvas, onError) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  } catch {
    onError('当前设备无法启用 3D 渲染，仍可使用状态预览。');
    return { update() {}, pause() {}, dispose() {} };
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 30);
  camera.position.z = 6.4;
  renderer.setClearColor(0x000000, 0);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(600, 600), .7, .5, .18);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const rows = matchMedia('(max-width: 650px)').matches ? 105 : 150;
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

  let target=initial, paused=false, previous=performance.now(), speed=initial.speed, time=0, lost=false;
  const color = new THREE.Color(initial.color), secondary = new THREE.Color(initial.secondary);
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio,1.75);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width,height);
    composer.setPixelRatio(ratio);
    composer.setSize(width,height);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value=ratio;
  }
  const observer=new ResizeObserver(resize);
  observer.observe(container);
  function contextLost(event) {
    event.preventDefault();
    lost=true;
    onError('3D 渲染连接中断，请刷新页面恢复。');
  }
  renderer.domElement.addEventListener('webglcontextlost',contextLost);
  renderer.setAnimationLoop((now)=>{
    const dt=Math.min((now-previous)/1000,.05);previous=now;
    if(document.hidden || lost) return;
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
    composer.render();
  });
  return {
    update(next) { target=next;color.set(next.color);secondary.set(next.secondary); },
    pause(value) { paused=value; },
    dispose() {
      renderer.setAnimationLoop(null);observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost',contextLost);
      geometry.dispose();material.dispose();starGeometry.dispose();starMaterial.dispose();
      bloom.dispose();composer.dispose();renderer.dispose();
    },
  };
}
