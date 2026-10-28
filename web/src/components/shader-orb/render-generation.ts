// Adapted from OrbKit. Copyright (c) 2026 zzzzshawn. MIT; see THIRD_PARTY_NOTICES.md.
import { PARAM_EASE, springOut, springStep, targetVolumes, hexToRgb, type OrbState, type OrbVariant } from './orb-state';
import { compile, VERT, ORB_GLSL_HELPERS, paramUniformDecls } from './shader-program';
import type { ShaderOrbProps } from './shader-orb';
type LiveRefs = {
    stateRef: {current: OrbState};
    paramsRef: {current: ShaderOrbProps['params']};
    colorsRef: {current: ShaderOrbProps['colors']};
    statePresetsRef: {current: ShaderOrbProps['statePresets']};
    stateColorsRef: {current: ShaderOrbProps['stateColors']};
    stateVolumesRef: {current: ShaderOrbProps['stateVolumes']};
    volumesRef: {current: ShaderOrbProps['volumes']};
    pausedRef: {current: boolean};
};
export function createRenderGeneration(canvas: HTMLCanvasElement, gl: WebGLRenderingContext, variant: OrbVariant, pauseOffscreen: boolean, maxDpr: number, refs: LiveRefs, onPaint: () => void): () => void {
    let announcedPaint = false;
    const { stateRef, paramsRef, colorsRef, statePresetsRef, stateColorsRef, stateVolumesRef, volumesRef, pausedRef } = refs;
    if (gl.isContextLost())
        return () => { };
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, ORB_GLSL_HELPERS + paramUniformDecls(variant) + variant.frag);
    const releaseShaders = () => {
        if (vs)
            gl.deleteShader(vs);
        if (fs)
            gl.deleteShader(fs);
    };
    if (!vs || !fs)
        return releaseShaders;
    const prog = gl.createProgram();
    if (!prog)
        return releaseShaders;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("[shader-orb] link error:", gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog);
        return releaseShaders;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uAnim = gl.getUniformLocation(prog, "uAnim");
    const uInput = gl.getUniformLocation(prog, "uInput");
    const uOutput = gl.getUniformLocation(prog, "uOutput");
    const paramLocs = variant.params.map((p) => ({
        def: p,
        loc: gl.getUniformLocation(prog, `uP_${p.key}`)
    }));
    const colorLocs = variant.colors.map((c) => ({
        def: c,
        loc: gl.getUniformLocation(prog, `uC_${c.key}`)
    }));
    let resScale = 1;
    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * resScale;
        const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
        const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
        }
        gl.uniform2f(uRes, w, h);
    };
    resize();
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    let visible = !pauseOffscreen;
    const intersectionObserver = pauseOffscreen && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver((entries) => {
            visible = Boolean(entries[0]?.isIntersecting);
            if (visible) {
                last = performance.now() / 1000;
            }
        }, { rootMargin: "150px 0px", threshold: 0 })
        : null;
    if (intersectionObserver) {
        intersectionObserver.observe(canvas);
    }
    else {
        visible = true;
    }
    const reduceMotion = typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tSec = 0;
    let anim = Math.random() * 100;
    let speed = 0.1;
    const cur = { in: 0, out: 0.3 };
    const presets = variant.statePresets;
    const paramCur: Record<string, number> = {};
    const paramVel: Record<string, number> = {};
    const paramClocks: Record<string, number> = {};
    const colorCur: Record<string, [
        number,
        number,
        number
    ]> = {};
    const colorVel: Record<string, [
        number,
        number,
        number
    ]> = {};
    let speedVel = 0;
    const [initialIn, initialOut] = targetVolumes(stateRef.current, 0);
    cur.in = initialIn;
    cur.out = initialOut;
    let last = performance.now() / 1000;
    let raf = 0;
    let frameEma = 1 / 60;
    const uploadAndDraw = (dt: number, snap = false) => {
        const [tin, tout] = targetVolumes(stateRef.current, tSec);
        const liveVolumes = volumesRef.current;
        const stateVolume = stateVolumesRef.current?.[stateRef.current];
        const targetIn = liveVolumes?.input ?? stateVolume?.input ?? tin;
        const targetOut = liveVolumes?.output ?? stateVolume?.output ?? tout;
        const kVol = 1 - Math.exp(-dt * 12);
        cur.in += (targetIn - cur.in) * kVol;
        cur.out += (targetOut - cur.out) * kVol;
        const targetSpeed = 0.1 + (1 - Math.pow(cur.out - 1, 2)) * 0.9;
        if (snap) {
            speed = targetSpeed;
            speedVel = 0;
        }
        else {
            springStep(speed, speedVel, targetSpeed, dt, PARAM_EASE);
            speed = springOut.x;
            speedVel = springOut.v;
        }
        anim += dt * speed;
        gl.uniform1f(uTime, tSec * 0.5);
        gl.uniform1f(uAnim, anim);
        gl.uniform1f(uInput, cur.in);
        gl.uniform1f(uOutput, cur.out);
        const liveParams = paramsRef.current;
        const statePreset = presets?.[stateRef.current];
        const overridePreset = statePresetsRef.current?.[stateRef.current];
        for (const { def, loc } of paramLocs) {
            const explicit = liveParams?.[def.key];
            const target = typeof explicit === "number"
                ? explicit
                : (overridePreset?.[def.key] ?? statePreset?.[def.key] ?? def.default);
            const curVal = paramCur[def.key] ?? target;
            let next: number;
            if (snap) {
                next = target;
                paramVel[def.key] = 0;
            }
            else {
                springStep(curVal, paramVel[def.key] ?? 0, target, dt, PARAM_EASE);
                next = springOut.x;
                paramVel[def.key] = springOut.v;
            }
            paramCur[def.key] = next;
            if (def.integrate) {
                const clock = (paramClocks[def.key] ?? (paramClocks[def.key] = Math.random() * 100)) +
                    dt * speed * next;
                paramClocks[def.key] = clock;
                gl.uniform1f(loc, clock);
            }
            else {
                gl.uniform1f(loc, next);
            }
        }
        const liveColors = colorsRef.current;
        const stateColor = variant.stateColors?.[stateRef.current];
        const overrideColor = stateColorsRef.current?.[stateRef.current];
        for (const { def, loc } of colorLocs) {
            const target = hexToRgb(liveColors?.[def.key] ??
                overrideColor?.[def.key] ??
                stateColor?.[def.key] ??
                def.default);
            const curCol = (colorCur[def.key] ??= [...target] as [
                number,
                number,
                number
            ]);
            const velCol = (colorVel[def.key] ??= [0, 0, 0]);
            for (let i = 0; i < 3; i++) {
                if (snap) {
                    curCol[i] = target[i];
                    velCol[i] = 0;
                }
                else {
                    springStep(curCol[i], velCol[i], target[i], dt, PARAM_EASE);
                    curCol[i] = springOut.x;
                    velCol[i] = springOut.v;
                }
            }
            gl.uniform3f(loc, curCol[0], curCol[1], curCol[2]);
        }
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (!announcedPaint) {
            announcedPaint = true;
            queueMicrotask(() => {
                if (gl.isContextLost())
                    return;
                onPaint();
            });
        }
    };
    const releaseGL = () => {
        resizeObserver?.disconnect();
        intersectionObserver?.disconnect();
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(buf);
    };
    if (reduceMotion) {
        tSec = 1;
        uploadAndDraw(1, true);
        return releaseGL;
    }
    const loop = () => {
        raf = requestAnimationFrame(loop);
        const now = performance.now() / 1000;
        const dt = Math.min(now - last, 0.05);
        last = now;
        if (!visible || pausedRef.current)
            return;
        tSec += dt;
        if (dt < 0.05)
            frameEma += (dt - frameEma) * 0.08;
        if (tSec > 1.5 && frameEma > 1 / 34 && resScale > 0.5) {
            resScale = Math.max(0.5, resScale * 0.8);
            frameEma = 1 / 60;
            resize();
        }
        else if (tSec > 1.5 && frameEma < 1 / 55 && resScale < 1) {
            resScale = Math.min(1, resScale / 0.8);
            frameEma = 1 / 60;
            resize();
        }
        uploadAndDraw(dt);
    };
    uploadAndDraw(1);
    loop();
    return () => {
        cancelAnimationFrame(raf);
        releaseGL();
    };
}
