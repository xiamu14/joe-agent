// Adapted from OrbKit. Copyright (c) 2026 zzzzshawn. MIT; see THIRD_PARTY_NOTICES.md.
export type OrbState = "idle" | "thinking" | "speaking";
export const ORB_STATES = ["idle", "thinking", "speaking"] as const;
function clamp01(n: number) {
    return Math.min(1, Math.max(0, n));
}
export const PARAM_EASE = 4;
export const springOut = { x: 0, v: 0 };
export function springStep(x: number, v: number, target: number, dt: number, omega: number) {
    const f = 1 + 2 * dt * omega;
    const oo = omega * omega;
    const hoo = dt * oo;
    const hhoo = dt * hoo;
    const detInv = 1 / (f + hhoo);
    springOut.x = (f * x + dt * v + hhoo * target) * detInv;
    springOut.v = (v + hoo * (target - x)) * detInv;
}
export function targetVolumes(state: OrbState, t: number): [
    number,
    number
] {
    switch (state) {
        case "idle":
            return [0, 0.3];
        case "speaking":
            return [
                clamp01(0.65 + Math.sin(t * 4.8) * 0.22),
                clamp01(0.75 + Math.sin(t * 3.6) * 0.22)
            ];
        case "thinking": {
            const base = 0.38 + 0.07 * Math.sin(t * 0.7);
            const wander = 0.05 * Math.sin(t * 2.1) * Math.sin(t * 0.37 + 1.2);
            return [clamp01(base + wander), clamp01(0.48 + 0.12 * Math.sin(t * 1.05 + 0.6))];
        }
    }
}
export interface OrbParamDef {
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    default: number;
    integrate?: boolean;
}
export interface OrbColorDef {
    key: string;
    label: string;
    default: string;
}
export interface OrbVariant {
    key: string;
    label: string;
    note: string;
    frag: string;
    params: OrbParamDef[];
    colors: OrbColorDef[];
    statePresets?: Partial<Record<OrbState, Record<string, number>>>;
    stateColors?: Partial<Record<OrbState, Record<string, string>>>;
}
export type OrbParamValues = Partial<Record<string, number>>;
export type OrbColorValues = Partial<Record<string, string>>;
export function defaultValuesFor(variant: OrbVariant): {
    params: Record<string, number>;
    colors: Record<string, string>;
} {
    return {
        params: Object.fromEntries(variant.params.map((p) => [p.key, p.default])),
        colors: Object.fromEntries(variant.colors.map((c) => [c.key, c.default]))
    };
}
export function hexToRgb(hex: string): [
    number,
    number,
    number
] {
    let h = hex.replace("#", "").trim();
    if (h.length === 3)
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    if (h.length !== 6 || Number.isNaN(n))
        return [1, 1, 1];
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
