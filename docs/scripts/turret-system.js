let towers = [];
const turretModels = {};

const gridSize = 7;
const tileSize = 1.3;
const tileHeight = 0.3;
const gap = 0.06;

async function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, reject);
  });
}

async function loadFBX(url) {
  return new Promise((resolve, reject) => {
    new THREE.FBXLoader().load(url, resolve, undefined, reject);
  });
}

async function loadTurretModels() {
  const modelConfigs = {
    Tow_Cannon2: "Tow_cannon1.png",
    Tow_Acid1: "Tow_fire_acid.png",
  };

  for (const [modelName, textureName] of Object.entries(modelConfigs)) {
    const [texture, fbx] = await Promise.all([
      loadTexture(`./turrets/${textureName}`),
      loadFBX(`./turrets/${modelName}.fbx`),
    ]);

    texture.colorSpace = THREE.SRGBColorSpace;

    fbx.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        child.material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.6,
          metalness: 0.4,
        });
      }
    });

    turretModels[modelName] = fbx;
  }
}

function createTurret(x, z, baseColor, accentColor, modelType) {
  const group = new THREE.Group();
  const tileX = (x - gridSize / 2 + 0.5) * (tileSize + gap);
  const tileZ = (z - gridSize / 2 + 0.5) * (tileSize + gap);

  const baseMat = createFresnelMaterial(baseColor, {
    fresnelColor: colors.yellow,
    fresnelIntensity: 0.35,
  });
  addFresnelMaterial(baseMat);

  const modelInstance = turretModels[modelType].clone();
  modelInstance.position.y = tileHeight / 2 + 0.3;
  modelInstance.scale.set(0.5, 0.5, 0.5);

  const gridCenter = new THREE.Vector3(0, 0, 0);
  const turretPos = new THREE.Vector3(tileX, 0, tileZ);
  const direction = turretPos.clone().sub(gridCenter).normalize();
  if (direction.length() > 0.01) {
    modelInstance.rotation.y = 0;
  }

  group.add(modelInstance);
  group.userData.model = modelInstance;

  const lightMat = new THREE.MeshStandardMaterial({
    color: colors.cyan,
    emissive: colors.cyan,
    emissiveIntensity: 0.6,
  });
  const light = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.1), lightMat);
  light.position.y = tileHeight / 2 + 0.56;
  group.add(light);

  group.position.set(tileX, 0, tileZ);
  group.userData = {
    ...group.userData,
    lastShot: 0,
    fireRate: 1200 + Math.random() * 500,
    ballPos: new THREE.Vector3(tileX, tileHeight / 2 + 0.42, tileZ + 0.6),
    targetRotation: 0,
  };
  getSceneContainer().add(group);
  towers.push(group);
  return group;
}

function getTowers() {
  return towers;
}

async function initializeTurrets() {
  await loadTurretModels();

  createTurret(1, 3, colors.rust, colors.rustLight, "Tow_Cannon2");
  createTurret(5, 1, colors.stone, colors.tan, "Tow_Acid1");
  createTurret(3, 3, colors.teal, colors.cyan, "Tow_Cannon2");
}
