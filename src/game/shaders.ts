export const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uWarp;
  uniform float uChaos;
  uniform float uBurn;
  uniform float uGlitch;
  uniform float uGlitchSeed;
  attribute vec3 aHead;
  attribute float aSeed;
  varying vec3 vLocalPosition;
  varying vec3 vWorldPosition;
  varying float vPulse;
  varying vec2 vUvLocal;
  varying float vHeadMask;
  varying float vHeadCrop;
  varying float vMouthAperture;
  varying vec2 vMouthPoint;

  float waveNoise(vec3 point) {
    float first = sin(point.x * 4.2 + uTime * (1.1 + uChaos * 4.2));
    float second = sin(point.y * 5.3 - uTime * (0.8 + uChaos * 2.7));
    float third = sin(point.z * 6.1 + uTime * 1.7 + aSeed * 6.28318);
    return (first + second + third) / 3.0;
  }

  void main() {
    float morph = smoothstep(0.0, 1.0, uMorph);
    vec3 transformed = mix(position, aHead, morph);
    float noise = waveNoise(transformed);
    float pulse = sin(uTime * 1.25 + aSeed * 4.0) * 0.5 + 0.5;
    vec3 radial = normalize(transformed + vec3(0.0001));
    transformed += radial * noise * uWarp * (0.55 + pulse * 0.45);
    transformed *= 1.0 + sin(uTime * 0.72) * (0.012 + uChaos * 0.016);
    transformed.x += sin(uTime * 12.0 + aSeed * 31.0) * uChaos * 0.025;
    transformed.y += cos(uTime * 10.0 + aSeed * 23.0) * uChaos * 0.022;
    float glitchBand = floor((transformed.y + aSeed * 0.37) * 4.5);
    float glitchNoise = fract(sin(glitchBand * 91.17 + uGlitchSeed * 47.31) * 43758.5453);
    float glitchGate = step(0.38, glitchNoise) * uGlitch;
    transformed.x += (glitchNoise - 0.5) * 2.75 * glitchGate;
    transformed.y *= 1.0 + (glitchNoise - 0.42) * 0.98 * glitchGate;
    transformed.z += sin(aSeed * 83.0 + uGlitchSeed) * 1.48 * glitchGate;
    transformed += radial * sin(uTime * 34.0 + aSeed * 47.0) * uBurn * 0.075;
    vec4 world = modelMatrix * vec4(transformed, 1.0);
    vLocalPosition = transformed;
    vWorldPosition = world.xyz;
    vPulse = pulse;
    vUvLocal = uv;
    vHeadMask = 1.0;
    vHeadCrop = 1.0;
    vMouthAperture = 0.0;
    vMouthPoint = vec2(99.0);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const headVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWarp;
  uniform float uHeadWarp;
  uniform float uChaos;
  uniform float uBurn;
  uniform float uGlitch;
  uniform float uGlitchSeed;
  uniform float uFinalMorph;
  uniform float uTear;
  varying vec3 vLocalPosition;
  varying vec3 vWorldPosition;
  varying float vPulse;
  varying vec2 vUvLocal;
  varying float vHeadMask;
  varying float vHeadCrop;
  varying float vMouthAperture;
  varying vec2 vMouthPoint;

  void main() {
    float seed = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453);
    float pulse = sin(uTime * 1.25 + seed * 4.0) * 0.5 + 0.5;
    vec3 transformed = position;
    vec3 radial = normalize(transformed + vec3(0.0001));
    float slowWarp = (
      sin(position.y * 2.4 + uTime * 0.38) +
      sin(position.x * 3.1 - uTime * 0.29 + seed * 2.0) +
      sin(position.z * 3.6 + uTime * 0.23 + seed * 4.0)
    ) / 3.0;
    transformed += normalize(normal + vec3(0.0001)) * slowWarp * uHeadWarp;
    float morphWave = sin(position.y * 5.8 + uTime * 2.1 + seed * 5.0) * 0.55
      + sin(position.x * 7.2 - uTime * 1.7) * 0.3;
    transformed += normalize(normal + vec3(0.0001)) * morphWave * uFinalMorph * 0.16;
    transformed += radial * sin(uTime * 4.6 + seed * 11.0) * uFinalMorph * 0.075;
    float tearBand = step(0.72, fract((position.y + 1.5) * 3.1 + uGlitchSeed * 0.17)) * uTear;
    transformed.x += sign(position.x + 0.001) * tearBand * (0.12 + seed * 0.18);
    transformed.z += (seed - 0.5) * tearBand * 0.32;
    transformed += radial * sin(uTime * 3.2 + seed * 6.28318) * uBurn * 0.085;
    transformed.x += sin(uTime * 31.0 + seed * 51.0) * uBurn * 0.045;
    float glitchBand = floor((position.y + seed * 0.24) * 5.0);
    float glitchNoise = fract(sin(glitchBand * 77.73 + uGlitchSeed * 31.19) * 43758.5453);
    float glitchGate = step(0.48, glitchNoise) * uGlitch;
    transformed.x += (glitchNoise - 0.5) * 1.3 * glitchGate;
    transformed.y *= 1.0 + (glitchNoise - 0.46) * 0.42 * glitchGate;
    transformed.z += sin(seed * 67.0 + uGlitchSeed) * 0.62 * glitchGate;
    float cropNoise = sin(position.x * 10.7 + sin(position.z * 8.3) * 1.8) * 0.052;
    cropNoise += sin(position.z * 15.1 - position.x * 4.6) * 0.026;
    vHeadCrop = position.y - (-0.94 + cropNoise);
    vMouthAperture = 0.0;
    vMouthPoint = vec2(99.0);
    vHeadMask = 1.0;
    vec4 world = modelMatrix * vec4(transformed, 1.0);
    vLocalPosition = transformed;
    vWorldPosition = world.xyz;
    vPulse = pulse;
    vUvLocal = uv;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const skullVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWarp;
  uniform float uHeat;
  uniform float uGlitch;
  uniform float uGlitchSeed;
  uniform float uFinalMorph;
  uniform float uTear;
  varying vec3 vLocalPosition;
  varying vec3 vWorldPosition;
  varying float vPulse;
  varying vec2 vUvLocal;

  void main() {
    float seed = fract(sin(dot(position.xy + position.z, vec2(12.9898, 78.233))) * 43758.5453);
    float pulse = sin(uTime * 1.55 + seed * 6.28318) * 0.5 + 0.5;
    vec3 transformed = position;
    vec3 radial = normalize(position + vec3(0.0001));
    vec3 surfaceNormal = normalize(normal + vec3(0.0001));
    float slowWarp = (sin(position.y * 3.8 + uTime * 0.52) + sin(position.x * 4.7 - uTime * 0.37 + seed * 3.0) + sin(position.z * 5.4 + uTime * 0.31)) / 3.0;
    transformed += surfaceNormal * slowWarp * (uWarp + uHeat * 0.18);
    float morphWave = sin(position.y * 6.2 + uTime * 2.35 + seed * 5.0) * 0.62
      + sin(position.x * 8.0 - uTime * 1.85) * 0.34;
    transformed += surfaceNormal * morphWave * uFinalMorph * 0.2;
    transformed += radial * sin(uTime * 5.1 + seed * 13.0) * uFinalMorph * 0.09;
    transformed += radial * sin(uTime * 3.8 + seed * 9.0) * (uWarp * 0.22 + uHeat * 0.13);
    transformed *= 1.0 + uHeat * (0.035 + pulse * 0.025);
    transformed += surfaceNormal * sin(uTime * 42.0 + seed * 71.0) * uHeat * 0.045;
    float band = floor((position.y + seed * 0.28) * 5.5);
    float bandNoise = fract(sin(band * 83.17 + uGlitchSeed * 39.31) * 43758.5453);
    float gate = step(0.52, bandNoise) * (uGlitch * 0.34 + uHeat * 0.3);
    transformed.x += (bandNoise - 0.5) * 0.48 * gate;
    transformed.z += sin(seed * 61.0 + uGlitchSeed) * 0.3 * gate;
    float tearBand = step(0.7, fract((position.y + 1.8) * 3.4 + uGlitchSeed * 0.19)) * uTear;
    transformed.x += sign(position.x + 0.001) * tearBand * (0.15 + seed * 0.2);
    transformed.z += (seed - 0.5) * tearBand * 0.38;
    vec4 world = modelMatrix * vec4(transformed, 1.0);
    vLocalPosition = transformed;
    vWorldPosition = world.xyz;
    vPulse = pulse;
    vUvLocal = uv;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const skullFragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform vec3 uKeyDirection;
  uniform float uKeyIntensity;
  uniform float uFillIntensity;
  uniform float uRimIntensity;
  uniform float uSpecular;
  uniform float uOpacity;
  uniform float uShadow;
  uniform float uHeat;
  varying vec3 vLocalPosition;
  varying vec3 vWorldPosition;
  varying float vPulse;
  varying vec2 vUvLocal;

  void main() {
    vec3 normal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    if (!gl_FrontFacing) normal *= -1.0;
    vec3 lightDirection = normalize(uKeyDirection);
    float diffuse = max(dot(normal, lightDirection), 0.0) * uKeyIntensity;
    vec3 fillDirection = normalize(vec3(-lightDirection.x, 0.25, lightDirection.z));
    float fill = max(dot(normal, fillDirection), 0.0) * uFillIntensity;
    float rim = pow(1.0 - abs(normal.z), 2.25) * uRimIntensity * (1.0 + uHeat * 1.1);
    vec3 blend = pow(abs(normal), vec3(4.0));
    blend /= max(blend.x + blend.y + blend.z, 0.0001);
    vec3 p = vLocalPosition * 0.58;
    vec3 texel = texture2D(uTexture, p.yz).rgb * blend.x + texture2D(uTexture, p.xz).rgb * blend.y + texture2D(uTexture, p.xy).rgb * blend.z;
    float textureValue = dot(texel, vec3(0.299, 0.587, 0.114));
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 halfway = normalize(lightDirection + viewDirection);
    float highlight = pow(max(dot(normal, halfway), 0.0), 26.0) * uSpecular;
    vec3 deep = mix(vec3(0.012, 0.004, 0.02), vec3(0.018, 0.012, 0.025), uShadow);
    vec3 violet = mix(vec3(0.56, 0.08, 0.78), vec3(0.10, 0.035, 0.14), uShadow);
    vec3 color = mix(deep, violet, (diffuse * 0.68 + fill * 0.36 + rim * 0.48) * (0.42 + textureValue * 0.68));
    color += vec3(0.45, 0.86, 0.56) * highlight + vec3(0.25, 0.65, 0.42) * rim * 0.15;
    vec3 heatColor = mix(vec3(1.0, 0.12, 0.015), vec3(1.0, 0.08, 0.48), vPulse);
    color = mix(color, color * 0.22 + heatColor * (0.78 + rim), uHeat * (uShadow > 0.5 ? 0.42 : 0.9));
    gl_FragColor = vec4(color, uOpacity);
  }
`;

export const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uMorph;
  uniform float uColorPhase;
  uniform vec3 uKeyDirection;
  uniform float uKeyIntensity;
  uniform float uFillIntensity;
  uniform float uRimIntensity;
  uniform float uSpecular;
  uniform float uBurn;
  uniform float uOpacity;
  varying vec3 vLocalPosition;
  varying vec3 vWorldPosition;
  varying float vPulse;
  varying vec2 vUvLocal;
  varying float vHeadMask;
  varying float vHeadCrop;
  varying float vMouthAperture;
  varying vec2 vMouthPoint;

  void main() {
    if (vHeadMask < 0.015) discard;
    if (vHeadCrop < 0.0) discard;
    vec3 normal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    if (!gl_FrontFacing) normal *= -1.0;
    vec3 lightDirection = normalize(uKeyDirection);
    float diffuse = max(dot(normal, lightDirection), 0.0) * uKeyIntensity;
    vec3 fillDirection = normalize(vec3(-lightDirection.x, 0.25, lightDirection.z));
    float fill = max(dot(normal, fillDirection), 0.0) * uFillIntensity;
    float rim = pow(1.0 - abs(normal.z), 2.35) * uRimIntensity;
    vec3 blend = pow(abs(normal), vec3(4.0));
    blend /= max(blend.x + blend.y + blend.z, 0.0001);
    vec3 scaled = vLocalPosition * 0.48;
    vec3 projectedTexture = texture2D(uTexture, scaled.yz).rgb * blend.x;
    projectedTexture += texture2D(uTexture, scaled.xz).rgb * blend.y;
    projectedTexture += texture2D(uTexture, scaled.xy).rgb * blend.z;
    vec3 uvTexture = texture2D(uTexture, vUvLocal).rgb;
    vec3 textureColor = mix(uvTexture, projectedTexture, smoothstep(0.08, 0.72, uMorph));
    float textureValue = dot(textureColor, vec3(0.299, 0.587, 0.114));
    vec3 deep = vec3(0.008, 0.018, 0.009);
    vec3 green = vec3(0.015, 0.86, 0.075);
    vec3 bile = vec3(0.54, 0.67, 0.04);
    vec3 acidPink = vec3(0.96, 0.08, 0.48);
    vec3 bruisedViolet = vec3(0.55, 0.15, 0.78);
    vec3 accent = mix(green, bile, smoothstep(0.25, 0.95, uColorPhase));
    accent = mix(accent, acidPink, smoothstep(0.46, 0.78, uColorPhase) * (1.0 - smoothstep(0.82, 1.0, uColorPhase)));
    accent = mix(accent, bruisedViolet, smoothstep(0.78, 1.0, uColorPhase));
    float pattern = mix(0.28, 1.0, textureValue);
    pattern = mix(pattern, 0.7 + textureValue * 0.3, smoothstep(0.72, 1.0, uMorph));
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 halfway = normalize(lightDirection + viewDirection);
    float highlight = pow(max(dot(normal, halfway), 0.0), 28.0) * uSpecular;
    vec3 faceShadow = mix(deep, vec3(0.035, 0.008, 0.045), smoothstep(0.65, 1.0, uMorph));
    vec3 color = mix(faceShadow, accent, diffuse * 0.68 + fill * 0.35 + rim * 0.48);
    color *= pattern * (0.92 + vPulse * 0.14);
    color += green * rim * 0.2;
    color += vec3(0.72, 0.8, 0.57) * highlight;
    vec3 ember = mix(vec3(1.0, 0.16, 0.01), vec3(1.0, 0.92, 0.55), vPulse);
    color = mix(color, color * 0.16 + ember * (0.72 + rim), uBurn * 0.78);
    gl_FragColor = vec4(color, uOpacity * vHeadMask);
  }
`;

export const sludgeVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const sludgeFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;
  float hash(vec2 point) { return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), local.x), mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), local.x), local.y);
  }
  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.52;
    for (int i = 0; i < 4; i++) {
      value += noise(point) * amplitude;
      point = point * 2.03 + 7.17;
      amplitude *= 0.5;
    }
    return value;
  }
  void main() {
    vec2 drift = vec2(uTime * 0.025, -uTime * 0.018);
    float field = fbm(vUv * 3.2 + drift) + fbm(vUv * 6.0 - drift * 1.6) * 0.45;
    float sludge = smoothstep(0.68, 1.25, field);
    vec3 color = mix(vec3(0.0, 0.025, 0.008), vec3(0.02, 0.42, 0.075), sludge);
    gl_FragColor = vec4(color, sludge * uIntensity * 0.62);
  }
`;
