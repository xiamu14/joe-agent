/*
 * Shader by XorDev (https://x.com/XorDev), ported for Orbkit with the author's
 * permission. Non-commercial use only, with attribution to XorDev; keep this
 * notice with the file. Orbkit's runtime (orbkit-core.tsx) is MIT-licensed.
 */
/*
 * Deliberately not a `"use client"` module — see the note in `shdr-11.tsx`.
 *
 * Note for editors: the shader lives in a template literal, so its comments
 * must not contain backticks.
 */
import { ShaderOrb, type OrbVariant, type ShaderOrbProps } from "./shader-orb";

import { DISPERSION_FRAG } from "./dispersion-shader";

export const shdr01Orb: OrbVariant = {
  key: "shdr-01",
  label: "SHDR-01",
  note: "cut-glass orb with a dispersive, turbulent interior",
  frag: DISPERSION_FRAG,
  params: [
    { key: "speed", label: "Anim speed", min: 0.015, max: 10, step: 0.05, default: 0.5, integrate: true },
    { key: "spin", label: "Spin rate", min: 0, max: 5, step: 0.03, default: 0.25, integrate: true },
    { key: "camDist", label: "Camera distance", min: 1, max: 50, step: 0.3, default: 7 },
    { key: "focal", label: "Lens", min: 0.15, max: 15, step: 0.1, default: 2.25 },
    { key: "tilt", label: "Field tilt", min: 0, max: 4, step: 0.02, default: 0.5 },
    { key: "turb", label: "Turbulence", min: 0, max: 5, step: 0.03, default: 0.3 },
    { key: "sheets", label: "Sheet density", min: 1, max: 60, step: 0.5, default: 7 },
    { key: "disperse", label: "Dispersion", min: 0, max: 5, step: 0.03, default: 1 },
    { key: "stria", label: "Striation depth", min: 0, max: 10, step: 0.05, default: 1 },
    { key: "envRadius", label: "Envelope radius", min: 0.15, max: 15, step: 0.1, default: 2.6 },
    { key: "envCore", label: "Envelope core", min: 0.3, max: 1.02, step: 0.01, default: 1 },
    { key: "fill", label: "Body fill", min: 0, max: 100, step: 0.3, default: 1.5 },
    { key: "stepClamp", label: "Step clamp", min: 0.3, max: 300, step: 1.5, default: 20 },
    { key: "scatter", label: "Diffusion", min: 0, max: 0.5, step: 0.003, default: 0.02 },
    { key: "exposure", label: "Exposure", min: 1.5, max: 1500, step: 10, default: 60 },
    { key: "contrast", label: "Contrast", min: 0.15, max: 15, step: 0.1, default: 1 },
    { key: "saturation", label: "Saturation", min: 0, max: 4, step: 0.02, default: 1 },
    { key: "alphaGain", label: "Alpha gain", min: 0.05, max: 15, step: 0.1, default: 2 },
    { key: "edge", label: "Edge sharpness", min: 0, max: 1, step: 0.01, default: 1 },
    { key: "edgeFade", label: "Halo falloff", min: 0.1, max: 3, step: 0.015, default: 0.98 }
  ],
  colors: [{ key: "tint", label: "Tint", default: "#ffffff" }],
  statePresets: {
    idle: {
      speed: 0.5,
      spin: 0.25,
      turb: 0.3,
      disperse: 1,
      sheets: 7,
      exposure: 60,
      scatter: 0.02,
      alphaGain: 2
    },
    thinking: {
      speed: 0.6,
      spin: 0.5,
      turb: 0.35,
      disperse: 1.1,
      sheets: 7,
      exposure: 57,
      scatter: 0.019,
      alphaGain: 2.1
    },
    // loudest: fast drift, dense sheets, wide rainbow
    speaking: {
      speed: 1.2,
      spin: 0.7,
      turb: 0.55,
      disperse: 1.5,
      sheets: 5.5,
      exposure: 45,
      scatter: 0.015,
      alphaGain: 2.5
    }
  }
};

export type Shdr01Props = Omit<ShaderOrbProps, "variant">;

export function Shdr01({ size = 280, ...rest }: Shdr01Props) {
  return <ShaderOrb variant={shdr01Orb} size={size} {...rest} />;
}

export default Shdr01;
