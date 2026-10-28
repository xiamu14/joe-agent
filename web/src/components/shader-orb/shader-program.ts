// Adapted from OrbKit. Copyright (c) 2026 zzzzshawn. MIT; see THIRD_PARTY_NOTICES.md.
import type { OrbVariant } from "./orb-state";
export const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;
export const ORB_GLSL_HELPERS = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;   // slow ambient clock (half real-time)
uniform float uAnim;   // flow clock — its speed follows the output volume
uniform float uInput;  // input volume 0..1: user speech energy
uniform float uOutput; // output volume 0..1: agent speech energy

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(11.7, 7.3);
    a *= 0.5;
  }
  return v;
}
vec2 orbUV() { return (2.0 * gl_FragCoord.xy - uRes) / min(uRes.x, uRes.y); }

// GLSL ES 1.0 has no tanh() — it arrived in ES 3.0. Shader-golf listings lean
// on it as a tone-mapper, so it ships here. Clamped against exp() overflow;
// accurate for the non-negative accumulators those shaders produce.
vec3 tanh3(vec3 x) {
  x = clamp(x, -10.0, 10.0);
  vec3 e = exp(2.0 * x);
  return (e - 1.0) / (e + 1.0);
}

`;
export function paramUniformDecls(variant: OrbVariant): string {
    return [
        ...variant.params.map((p) => `uniform float uP_${p.key};`),
        ...variant.colors.map((c) => `uniform vec3 uC_${c.key};`)
    ].join("\n");
}
export function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader)
        return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("[shader-orb] compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
