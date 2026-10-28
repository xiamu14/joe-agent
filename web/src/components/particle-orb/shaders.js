export const vertexShader = `
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
export const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord-.5)*2.0;
    if (d>1.0) discard;
    float alpha = exp(-d*d*4.5)*vAlpha;
    gl_FragColor = vec4(vColor,alpha);
    #include <colorspace_fragment>
  }
`;

