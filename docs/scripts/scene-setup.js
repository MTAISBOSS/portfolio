let scene, camera, renderer, composer, postProcessPass;
let fresnelMaterials = [];
let sceneContainer;
// Snow particle system references
let snowParticles = null;
let snowUniforms = null;

function initializeScene(canvasElement) {
  scene = new THREE.Scene();
  scene.background = null;

  function getCanvasDimensions() {
    const isMobile = window.innerWidth <= 1024;
    const width = isMobile ? window.innerWidth : window.innerWidth * 0.55;
    const height = isMobile ? window.innerHeight * 0.45 : window.innerHeight;
    return { width, height };
  }

  const dims = getCanvasDimensions();

  camera = new THREE.PerspectiveCamera(30, dims.width / dims.height, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({
    canvas: canvasElement,
    antialias: true,
    alpha: true,
  });

  renderer.setSize(dims.width, dims.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.outputEncoding = THREE.sRGBEncoding;

  composer = new THREE.EffectComposer(renderer);
  const renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);

  postProcessPass = new THREE.ShaderPass(PostProcessShader);
  postProcessPass.renderToScreen = true;
  composer.addPass(postProcessPass);

  sceneContainer = new THREE.Group();
  scene.add(sceneContainer);

  setupLighting();

  // initialize snow particles (GPU driven)
  initSnowParticles();

  camera.position.set(11, 10, 11);
  camera.lookAt(0, 0.4, 0);

  window.addEventListener("resize", () => {
    const dims = getCanvasDimensions();
    camera.aspect = dims.width / dims.height;
    camera.updateProjectionMatrix();
    renderer.setSize(dims.width, dims.height);
    composer.setSize(dims.width, dims.height);
  });

  return { scene, camera, renderer, composer, sceneContainer };
}

function setupLighting() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe0f0ff, 0.45));

  const sunLight = new THREE.DirectionalLight(0xffffff, 0.85);
  sunLight.position.set(8, 15, 8);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 40;
  sunLight.shadow.camera.left = -12;
  sunLight.shadow.camera.right = 12;
  sunLight.shadow.camera.top = 12;
  sunLight.shadow.camera.bottom = -12;
  sunLight.shadow.radius = 4;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0xd0e8ff, 0.35);
  fillLight.position.set(-5, 5, -5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xe0f0ff, 0.22);
  rimLight.position.set(0, 3, -10);
  scene.add(rimLight);
}

/* ---------------------- Snow Particles (GPU) ---------------------- */
function initSnowParticles() {
  // Parameters - tweakable
  const SNOW_COUNT = 1200;
  const AREA = 40.0; // area width/depth
  const HEIGHT = 30.0; // vertical spawn range
  const MIN_SIZE = 2.0;
  const MAX_SIZE = 6.0;

  const positions = new Float32Array(SNOW_COUNT * 3);
  const seeds = new Float32Array(SNOW_COUNT);
  const sizes = new Float32Array(SNOW_COUNT);

  for (let i = 0; i < SNOW_COUNT; i++) {
    const ix = i * 3;
    positions[ix] = (Math.random() - 0.5) * AREA;
    positions[ix + 1] = Math.random() * HEIGHT;
    positions[ix + 2] = (Math.random() - 0.5) * AREA;
    seeds[i] = Math.random();
    sizes[i] = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geom.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  snowUniforms = {
    uTime: { value: 0 },
    uArea: { value: AREA },
    uHeight: { value: HEIGHT },
    uSpeed: { value: 0.03 }, // cycles per second
    uWindAmount: { value: 0.5 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  };

  const vert = `
    uniform float uTime;
    uniform float uArea;
    uniform float uHeight;
    uniform float uSpeed;
    uniform float uWindAmount;
    uniform float uPixelRatio;
    attribute float aSeed;
    attribute float aSize;
    varying float vAlpha;
    void main() {
      vec3 startPos = position;
      float t = fract(uTime * uSpeed + aSeed);
      // falling Y from startPos.y downwards looping across height
      float y = mix(startPos.y, startPos.y - uHeight, t);
      // horizontal sway / wind
      float sway = sin((uTime * 0.4) + aSeed * 10.0 + startPos.x * 0.1) * uWindAmount;
      vec3 pos = vec3(startPos.x + sway, y, startPos.z + cos(uTime * 0.2 + aSeed * 5.0) * (uWindAmount * 0.3));
      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      // point size scales with size attribute and camera distance
      float baseSize = aSize * (150.0 / -mvPos.z) * uPixelRatio;
      gl_PointSize = clamp(baseSize, 1.0, 80.0);
      vAlpha = 1.0 - t * 0.9; // fade as it falls
      gl_Position = projectionMatrix * mvPos;
    }
  `;

  const frag = `
    precision mediump float;
    varying float vAlpha;
    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float r = length(uv);
      float alpha = smoothstep(0.5, 0.18, r) * vAlpha * 0.85;
      // soft white snow
      gl_FragColor = vec4(vec3(1.0), alpha);
    }
  `;

  const mat = new THREE.ShaderMaterial({
    uniforms: snowUniforms,
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    vertexColors: false,
  });

  snowParticles = new THREE.Points(geom, mat);
  snowParticles.frustumCulled = false;
  scene.add(snowParticles);
}

function updateSnowParticles(time) {
  if (!snowParticles || !snowUniforms) return;
  // time in seconds
  snowUniforms.uTime.value = time * 0.001;
}

function disposeSnowParticles() {
  if (!snowParticles) return;
  snowParticles.geometry.dispose();
  snowParticles.material.dispose();
  scene.remove(snowParticles);
  snowParticles = null;
  snowUniforms = null;
}

function getSceneContainer() {
  return sceneContainer;
}

function addFresnelMaterial(material) {
  fresnelMaterials.push(material);
}

function getFresnelMaterials() {
  return fresnelMaterials;
}

function getRenderer() {
  return renderer;
}

function getComposer() {
  return composer;
}

function getPostProcessPass() {
  return postProcessPass;
}

function getCamera() {
  return camera;
}

function getScene() {
  return scene;
}
