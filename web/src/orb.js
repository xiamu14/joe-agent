import * as THREE from 'three';

import { vertexShader, fragmentShader } from './orb-shaders.js';

export function createOrb(container, initial, canvas, onError) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'default' });
  } catch {
    onError('无法显示头像，请尝试刷新。');
    return { update() {}, pause() {}, dispose() {} };
  }
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 2;
  renderer.setClearColor(0x000000, 0);
  const geometry = new THREE.PlaneGeometry(2, 2);
  // The upstream shader mixes display-space colors directly.
  const color = new THREE.Color(initial.color).convertLinearToSRGB();
  const uniforms = { u_time: { value: 0 }, u_color: { value: color.clone() } };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false });
  const fluid = new THREE.Mesh(geometry, material);
  scene.add(fluid);

  let target=initial, paused=false, previous=performance.now(), speed=initial.speed, time=0, lost=false, disposed=false;
  let lastWidth=0, lastHeight=0, lastRatio=0;

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height || lost || disposed) return;
    const ratio = Math.min(devicePixelRatio,2);
    if (width===lastWidth && height===lastHeight && ratio===lastRatio) return;
    lastWidth=width;lastHeight=height;lastRatio=ratio;
    renderer.setPixelRatio(ratio);
    renderer.setSize(width,height,false);
    const aspect = width / height;
    camera.left = -Math.max(1, aspect); camera.right = Math.max(1, aspect);
    camera.top = Math.max(1, 1 / aspect); camera.bottom = -Math.max(1, 1 / aspect);
    fluid.scale.setScalar(.9);
    camera.updateProjectionMatrix();

    if (!document.hidden) renderer.render(scene,camera);
  }
  const observer=new ResizeObserver(resize);
  observer.observe(container);
  function contextLost(event) {
    event.preventDefault();
    lost=true;
    syncLoop();
    onError('头像显示中断，请刷新。');
  }
  renderer.domElement.addEventListener('webglcontextlost',contextLost);
  function renderFrame(now) {
    if(paused || document.hidden || lost || disposed || now-previous < 1000/30-.5) return;
    const dt=Math.min((now-previous)/1000,.1);previous=now;
    const ease=1-Math.exp(-dt*3);
    speed=THREE.MathUtils.lerp(speed,target.speed,ease);
    uniforms.u_color.value.lerp(color,ease);
    time += dt * speed * 5.5;
    uniforms.u_time.value = time;
    fluid.scale.setScalar(THREE.MathUtils.lerp(fluid.scale.x, .9 + target.level * .04, ease));
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
    update(next) {
      target=next; color.set(next.color).convertLinearToSRGB();
      if (paused && !lost && !disposed) {
        uniforms.u_color.value.copy(color);
        if (!document.hidden) renderer.render(scene,camera);
      }
    },
    pause(value) {
      paused=value;
      if (paused && !lost && !disposed) {
        uniforms.u_color.value.copy(color);
        if (!document.hidden) renderer.render(scene,camera);
      }
      syncLoop();
    },
    dispose() {
      if (disposed) return;
      disposed=true;
      renderer.setAnimationLoop(null);observer.disconnect();
      document.removeEventListener('visibilitychange',syncLoop);
      renderer.domElement.removeEventListener('webglcontextlost',contextLost);
      geometry.dispose();material.dispose();
      renderer.dispose();
    },
  };
}
