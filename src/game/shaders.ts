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
    transformed.x += (glitchNoise - 0.5) * 1.9 * glitchGate;
    transformed.y *= 1.0 + (glitchNoise - 0.42) * 0.72 * glitchGate;
    transformed.z += sin(aSeed * 83.0 + uGlitchSeed) * 0.95 * glitchGate;
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
  uniform vec4 uExpression;
  uniform vec4 uExpressionDetail;
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
    transformed += radial * sin(uTime * 3.2 + seed * 6.28318) * uBurn * 0.085;
    transformed.x += sin(uTime * 31.0 + seed * 51.0) * uBurn * 0.045;
    float glitchBand = floor((position.y + seed * 0.24) * 5.0);
    float glitchNoise = fract(sin(glitchBand * 77.73 + uGlitchSeed * 31.19) * 43758.5453);
    float glitchGate = step(0.48, glitchNoise) * uGlitch;
    transformed.x += (glitchNoise - 0.5) * 1.3 * glitchGate;
    transformed.y *= 1.0 + (glitchNoise - 0.46) * 0.42 * glitchGate;
    transformed.z += sin(seed * 67.0 + uGlitchSeed) * 0.62 * glitchGate;
    float front = smoothstep(-0.1, 0.58, position.z);
    float center = 1.0 - smoothstep(0.25, 1.0, abs(position.x));
    float brow = exp(-pow((position.y - 0.46) / 0.17, 2.0)) * front;
    float browLeft = brow * (1.0 - smoothstep(-0.05, 0.32, position.x));
    float browRight = brow * smoothstep(-0.32, 0.05, position.x);
    float eyes = exp(-pow((position.y - 0.25) / 0.14, 2.0)) * front;
    float mouth = exp(-pow((position.y + 0.46) / 0.14, 2.0)) * center * front;
    float upperLip = mouth * smoothstep(-0.54, -0.42, position.y);
    float lowerLip = mouth * (1.0 - smoothstep(-0.58, -0.46, position.y));
    float mouthSide = smoothstep(0.18, 0.72, abs(position.x)) * mouth;
    float jaw = (1.0 - smoothstep(-1.08, -0.38, position.y)) * front;
    transformed.y += browLeft * uExpression.x * 0.16;
    transformed.y += browRight * uExpression.y * 0.16;
    transformed.y -= eyes * uExpressionDetail.z * 0.1;
    transformed.y += mouth * uExpression.z * (position.x < 0.0 ? 1.0 : -1.0) * 0.11;
    transformed.y += upperLip * uExpressionDetail.w * 0.12;
    transformed.y -= lowerLip * (uExpressionDetail.w * 0.15 + uExpression.w * 0.08);
    transformed.x += sign(position.x) * mouthSide * uExpressionDetail.x * 0.12;
    transformed.z += mouth * uExpressionDetail.y * 0.2;
    transformed.y -= jaw * uExpression.w * 0.18;
    transformed.z += jaw * uExpression.w * 0.08;
    float cropNoise = sin(position.x * 10.7 + sin(position.z * 8.3) * 1.8) * 0.052;
    cropNoise += sin(position.z * 15.1 - position.x * 4.6) * 0.026;
    vHeadCrop = position.y - (-1.12 + cropNoise);
    float mouthHeight = 0.065 + uExpressionDetail.w * 0.13 + uExpression.w * 0.055;
    vec2 mouthPoint = vec2(position.x / 0.5, (position.y + 0.46) / mouthHeight);
    float mouthShape = dot(mouthPoint, mouthPoint);
    float openingStrength = smoothstep(0.16, 0.5, uExpressionDetail.w * 0.72 + uExpression.w * 0.58);
    vMouthAperture = (1.0 - smoothstep(0.68, 1.0, mouthShape)) * front * openingStrength;
    vMouthPoint = mouthPoint;
    vHeadMask = 1.0;
    vec4 world = modelMatrix * vec4(transformed, 1.0);
    vLocalPosition = transformed;
    vWorldPosition = world.xyz;
    vPulse = pulse;
    vUvLocal = uv;
    gl_Position = projectionMatrix * viewMatrix * world;
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
