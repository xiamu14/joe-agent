// Adapted from OrbKit. Copyright (c) 2026 zzzzshawn. MIT; see THIRD_PARTY_NOTICES.md.
"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import type { OrbState, OrbVariant, OrbParamValues, OrbColorValues } from "./orb-state";
import { createRenderGeneration } from "./render-generation";
interface CanvasContextController {
    desired: boolean;
    start: (() => () => void) | null;
    stopGen: (() => void) | null;
}
const canvasControllers = new WeakMap<HTMLCanvasElement, CanvasContextController>();
export interface ShaderOrbProps {
    variant: OrbVariant;
    state?: OrbState;
    size?: number;
    params?: OrbParamValues;
    colors?: OrbColorValues;
    statePresets?: Partial<Record<OrbState, Record<string, number>>>;
    stateColors?: Partial<Record<OrbState, Record<string, string>>>;
    stateVolumes?: Partial<Record<OrbState, {
        input?: number;
        output?: number;
    }>>;
    volumes?: {
        input?: number;
        output?: number;
    };
    paused?: boolean;
    pauseOffscreen?: boolean;
    maxDpr?: number;
    className?: string;
    style?: CSSProperties;
    ariaLabel?: string;
}
export function ShaderOrb({ variant, state = "idle", size, params, colors, statePresets, stateColors, stateVolumes, volumes, paused = false, pauseOffscreen = true, maxDpr = 2, className, style, ariaLabel }: ShaderOrbProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [paintedKey, setPaintedKey] = useState<string | null>(null);
    const painted = paintedKey === variant.key;
    const stateRef = useRef<OrbState>(state);
    const paramsRef = useRef<OrbParamValues | undefined>(params);
    const colorsRef = useRef<OrbColorValues | undefined>(colors);
    const statePresetsRef = useRef(statePresets);
    const stateColorsRef = useRef(stateColors);
    const stateVolumesRef = useRef(stateVolumes);
    const volumesRef = useRef(volumes);
    const pausedRef = useRef(paused);
    useEffect(() => {
        stateRef.current = state;
        paramsRef.current = params;
        colorsRef.current = colors;
        statePresetsRef.current = statePresets;
        stateColorsRef.current = stateColors;
        stateVolumesRef.current = stateVolumes;
        volumesRef.current = volumes;
        pausedRef.current = paused;
    }, [state, params, colors, statePresets, stateColors, stateVolumes, volumes, paused]);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            premultipliedAlpha: true
        });
        if (!gl)
            return;
        const loseExt = gl.getExtension("WEBGL_lose_context");
        const startGeneration = () => createRenderGeneration(canvas, gl, variant, pauseOffscreen, maxDpr, { stateRef, paramsRef, colorsRef, statePresetsRef, stateColorsRef, stateVolumesRef, volumesRef, pausedRef }, () => setPaintedKey(variant.key));
        const hideNow = () => {
            canvas.style.opacity = "0";
            setPaintedKey(null);
        };
        const onContextLostHide = () => hideNow();
        canvas.addEventListener("webglcontextlost", onContextLostHide);
        const onPageHide = (event: PageTransitionEvent) => {
            if (event.persisted)
                return;
            try {
                loseExt?.loseContext();
            }
            catch {
            }
        };
        window.addEventListener("pagehide", onPageHide);
        let ctl = canvasControllers.get(canvas);
        if (!ctl) {
            const created: CanvasContextController = { desired: false, start: null, stopGen: null };
            canvas.addEventListener("webglcontextlost", (event) => {
                event.preventDefault();
                created.stopGen?.();
                created.stopGen = null;
                if (created.desired) {
                    setTimeout(() => {
                        if (!created.desired)
                            return;
                        try {
                            loseExt?.restoreContext();
                        }
                        catch {
                        }
                    }, 0);
                }
            });
            canvas.addEventListener("webglcontextrestored", () => {
                if (created.desired && created.start) {
                    created.stopGen = created.start();
                }
            });
            canvasControllers.set(canvas, created);
            ctl = created;
        }
        const controller = ctl;
        controller.desired = true;
        controller.start = startGeneration;
        if (gl.isContextLost()) {
            try {
                loseExt?.restoreContext();
            }
            catch {
            }
        }
        else {
            controller.stopGen = startGeneration();
        }
        return () => {
            hideNow();
            canvas.removeEventListener("webglcontextlost", onContextLostHide);
            window.removeEventListener("pagehide", onPageHide);
            controller.desired = false;
            controller.start = null;
            controller.stopGen?.();
            controller.stopGen = null;
            try {
                loseExt?.loseContext();
            }
            catch {
            }
        };
    }, [variant, pauseOffscreen, maxDpr]);
    return <motion.canvas key={variant.key} ref={canvasRef} className={`block ${className ?? ''}`} style={{ ...(size === undefined ? {} : { width: size, height: size }), ...(painted ? {} : { opacity: 0 }), ...style }} role={ariaLabel ? "img" : undefined} aria-label={ariaLabel} aria-hidden={ariaLabel ? undefined : true}/>;
}

export type { OrbVariant } from "./orb-state";
