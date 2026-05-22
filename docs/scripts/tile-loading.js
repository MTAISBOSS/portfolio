const modelData = [
  "snow-tile_Position:-2,0,0_Rotation:0,0,0", // tower pos
  "snow-tile_Position:0,0,0_Rotation:0,0,0", // tower pos
  "snow-tile-straight_Position:-1,0,0_Rotation:0,0,0", // 4
  "snow-tile_Position:1,0,0_Rotation:0,0,0",
  "snow-tile-tree-double_Position:2,0,0_Rotation:0,0,0",
  "snow-tile_Position:-2,0,1_Rotation:0,0,0",
  "snow-tile-corner-round_Position:0,0,1_Rotation:0,270,0", // 6
  "snow-tile-corner-round_Position:-1,0,1_Rotation:0,90,0", // 5
  "snow-tile-hill_Position:1,0,1_Rotation:0,0,0",
  "snow-tile_Position:2,0,1_Rotation:0,0,0",
  "snow-tile-tree-quad_Position:-2,0,-2_Rotation:0,0,0",
  "snow-tile_Position:0,0,-2_Rotation:0,0,0",
  "snow-tile_Position:-1,0,-2_Rotation:0,0,0",
  "snow-tile-straight_Position:1,0,-2_Rotation:0,0,0", // 0
  "snow-tile_Position:2,0,-2_Rotation:0,0,0", // tower pos
  "snow-tile-rock_Position:-2,0,2_Rotation:0,0,0",
  "snow-tile-straight_Position:0,0,2_Rotation:0,0,0", // 7
  "snow-tile_Position:-1,0,2_Rotation:0,0,0",
  "snow-tile_Position:1,0,2_Rotation:0,0,0",
  "snow-tile-tree-double_Position:2,0,2_Rotation:0,0,0",
  "snow-tile_Position:-2,0,-1_Rotation:0,0,0",
  "snow-tile-straight_Position:0,0,-1_Rotation:0,90,0", // 2
  "snow-tile-corner-round_Position:-1,0,-1_Rotation:0,0,0", // 3
  "snow-tile-corner-round_Position:1,0,-1_Rotation:0,180,0", // 1
  "snow-tile_Position:2,0,-1_Rotation:0,0,0",
];

let loadedModels = {};
let tileTexture = null;

function initializeTileLoading() {
  const tileTextureLoader = new THREE.TextureLoader();

  tileTextureLoader.load(
    "models/colormap.png",
    (texture) => {
      tileTexture = texture;
      tileTexture.colorSpace = THREE.SRGBColorSpace;
      console.log("Tile texture loaded successfully");
    },
    undefined,
    (err) => {
      console.error("Tile texture failed to load:", err);
      tileTexture = null;
    },
  );
}

function parseDataLine(line) {
  const nameMatch = line.match(/^([a-z-\s()0-9]+)/);
  const positionMatch = line.match(/Position:([^_]+)/);
  const rotationMatch = line.match(/Rotation:(.+)$/);

  const name = nameMatch ? nameMatch[1].trim() : "";
  const position = positionMatch
    ? positionMatch[1].split(",").map(Number)
    : [0, 0, 0];
  const rotation = rotationMatch
    ? rotationMatch[1].split(",").map(Number)
    : [0, 0, 0];

  return { name, position, rotation };
}

function loadModel(name) {
  return new Promise((resolve) => {
    if (loadedModels[name]) {
      const clone = loadedModels[name].clone();
      resolve(clone);
    } else {
      const fbxLoaderTiles = new THREE.FBXLoader();
      fbxLoaderTiles.load(
        `models/${name}.fbx`,
        (fbx) => {
          fbx.traverse((child) => {
            if (child.isMesh) {
              const newMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.4,
                metalness: 0.1,
              });
              if (tileTexture) {
                newMaterial.map = tileTexture;
                newMaterial.needsUpdate = true;
              }
              child.castShadow = true;
              child.receiveShadow = true;
              child.material = newMaterial;
            }
          });
          loadedModels[name] = fbx;
          const clone = fbx.clone();
          resolve(clone);
        },
        undefined,
        (error) => {
          console.error("Tile model load error:", name, error);
          resolve(null);
        },
      );
    }
  });
}

async function placeAllModels() {
  const container = getSceneContainer();
  for (const line of modelData) {
    const { name, position, rotation } = parseDataLine(line);
    const model = await loadModel(name);

    if (model) {
      model.position.set(
        position[0] * 1.5,
        position[1] * 1.5,
        position[2] * 1.5,
      );
      model.rotation.set(
        THREE.MathUtils.degToRad(rotation[0]),
        THREE.MathUtils.degToRad(rotation[1]),
        THREE.MathUtils.degToRad(rotation[2]),
      );
      model.scale.set(0.015, 0.015, 0.015);
      container.add(model);
    }
  }
}
