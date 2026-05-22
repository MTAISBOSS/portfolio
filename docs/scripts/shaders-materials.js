const PostProcessShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },

    uChromaticAberration: { value: 0.0008 },

    uSaturation: { value: 1.08 },

    uVignetteIntensity: { value: 0.32 },
  },

  vertexShader: `
    varying vec2 vUv;

    void main() {

      vUv = uv;

      gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(position, 1.0);

    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;

    uniform float uTime;

    uniform float uChromaticAberration;

    uniform float uSaturation;

    uniform float uVignetteIntensity;

    varying vec2 vUv;

    vec3 adjustSaturation(
      vec3 color,
      float saturation
    ) {

      vec3 gray = vec3(
        dot(
          color,
          vec3(0.299, 0.587, 0.114)
        )
      );

      return mix(
        gray,
        color,
        saturation
      );
    }

    void main() {

      vec2 uv = vUv;

      vec2 center = vec2(0.5);

      vec2 dir = uv - center;

      float dist = length(dir);

      // ======================
      // CHROMATIC ABERRATION
      // ======================

      float aberration =
        uChromaticAberration *
        (1.0 + dist * 1.5);

      float r = texture2D(
        tDiffuse,
        uv + dir * aberration
      ).r;

      float g = texture2D(
        tDiffuse,
        uv
      ).g;

      float b = texture2D(
        tDiffuse,
        uv - dir * aberration
      ).b;

      vec3 color = vec3(r, g, b);

      // ======================
      // SATURATION
      // ======================

      color = adjustSaturation(
        color,
        uSaturation
      );

      // ======================
      // FILMIC CONTRAST
      // ======================

      color = pow(
        color,
        vec3(0.92)
      );

      // ======================
      // SNOWY COLOR GRADING
      // ======================

      color.r *= 1.01;
      color.g *= 1.03;
      color.b *= 1.08;

      color += vec3(
        0.0,
        0.005,
        0.02
      );

      // ======================
      // BRIGHTNESS BOOST
      // ======================

      color *= 1.06;

      // ======================
      // VIGNETTE
      // ======================

      float vignette =
        smoothstep(
          1.15,
          0.25,
          dist
        );

      color *= mix(
        1.0,
        vignette,
        uVignetteIntensity
      );

      gl_FragColor =
        vec4(color, 1.0);

    }
  `,
};

function createFresnelMaterial(baseColor, options = {}) {
  const {
    roughness = 0.7,
    metalness = 0.05,
    fresnelColor = 0xe0f0ff,
    fresnelIntensity = 0.35,
  } = options;

  return new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: new THREE.Color(baseColor) },
      uFresnelColor: { value: new THREE.Color(fresnelColor) },
      uFresnelIntensity: { value: fresnelIntensity },
      uRoughness: { value: roughness },
      uTime: { value: 0 },
    },
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
    fragmentShader: `
        uniform vec3 uBaseColor;
        uniform vec3 uFresnelColor;
        uniform float uFresnelIntensity;
        uniform float uRoughness;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec2 vUv;
        
        void main() {
          vec3 viewDir = normalize(vViewPosition);
          vec3 normal = normalize(vNormal);
          
          // Soft fresnel
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.5);
          fresnel *= uFresnelIntensity;
          
          // Soft diffuse lighting
          vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
          float diff = max(dot(normal, lightDir), 0.0) * 0.45 + 0.55;
          
          vec3 color = uBaseColor * diff;
          color = mix(color, uFresnelColor, fresnel * 0.5);
          
          // Subtle rim
          float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.0) * 0.15;
          color += rim * uFresnelColor * 0.35;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
  });
}

const colors = {
  snowLight: 0xf0f4ff,
  snowMid: 0xe8f0ff,
  snowDark: 0xd8e4f4,
  iceBlue: 0xc8dcf0,
  iceBlueLight: 0xe0f0ff,
  iceBlueDark: 0xb0c8e0,
  frostWhite: 0xf4f8ff,
  winterBlue: 0xa0bcd8,
  winterBlueLight: 0xc0d4ec,
  silver: 0xd8e0e8,
  silverDark: 0xc0c8d0,
  paleBlue: 0xccdcec,
  powderBlue: 0xe0ecf4,
  arcticBlue: 0xb8d0e8,
  mist: 0xe8f0f8,
  cloud: 0xf0f4fc,
  glacier: 0xc8dcec,
  frost: 0xecf4fc,
  white: 0xf8fcff,
  gray: 0xd0d8e0,
};
