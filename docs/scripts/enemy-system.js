let enemies = [];
let lastEnemySpawn = 0;
const scaleFactor = 0.00004;
const enemySpawnRate = 2000;

const ENEMY_DEATH_JUMP = 0.4; // world units to jump up
const ENEMY_DEATH_ROT_Z = Math.PI / 2; // 90 degrees
const ENEMY_DEATH_PHASE1 = 300; // ms jump+rotate
const ENEMY_DEATH_PHASE2 = 200; // ms shrink

function easeOutQuad(t) {
  return t * (2 - t);
}

const pathPoints = [
  { x: 1.5, z: -4 },
  { x: 1.5, z: -1.5 },
  { x: -1.2, z: -1.5 },
  { x: -1.2, z: 1.5 },
  { x: -0.2, z: 1.5 },
  { x: -0.2, z: 4 },
];

let mushroomModel = null;
let mushroomTexture = null;

let mushroomLoadPromise = null;
function makeMaterialNonReflective(mat) {
  if (!mat) return;
  try {
    if ("metalness" in mat) mat.metalness = 0;
    if ("roughness" in mat) mat.roughness = 1;
    if ("envMap" in mat) mat.envMap = null;
    if ("envMapIntensity" in mat) mat.envMapIntensity = 0;
    if ("reflectivity" in mat) mat.reflectivity = 0;
    if ("specular" in mat) mat.specular = new THREE.Color(0x000000);
    if ("shininess" in mat) mat.shininess = 0;
    if ("clearcoat" in mat) mat.clearcoat = 0;
    if ("metalnessMap" in mat) mat.metalnessMap = null;
    if ("roughnessMap" in mat) mat.roughnessMap = null;
    mat.needsUpdate = true;
  } catch (e) {}
}

if (THREE && THREE.FBXLoader && THREE.TextureLoader) {
  mushroomLoadPromise = new Promise((resolve, reject) => {
    const _fbxLoader = new THREE.FBXLoader();
    const _texLoader = new THREE.TextureLoader();

    _texLoader.load(
      "models/mushroom.png",
      (tex) => {
        mushroomTexture = tex;

        _fbxLoader.load(
          "models/mushroom.fbx",
          (obj) => {
            obj.traverse((child) => {
              if (child.isMesh) {
                try {
                  child.material.map = mushroomTexture;
                  makeMaterialNonReflective(child.material);
                  child.material.needsUpdate = true;
                } catch (e) {}

                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            mushroomModel = obj;

            console.log("Mushroom loaded");

            resolve();
          },
          undefined,
          reject,
        );
      },
      undefined,
      reject,
    );
  });
}

function createEnemy() {
  if (!mushroomModel) {
    console.warn("Mushroom model not loaded yet - skipping enemy spawn");
    return;
  }

  const group = mushroomModel.clone(true);
  group.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material = child.material.clone();
      if (mushroomTexture) {
        child.material.map = mushroomTexture;
        makeMaterialNonReflective(child.material);
        child.material.needsUpdate = true;
      }
      child.castShadow = true;
      child.receiveShadow = true;
      try {
        child.material.side = THREE.DoubleSide;
      } catch (e) {}
    }
  });

  group.scale.set(scaleFactor, scaleFactor, scaleFactor);

  group.position.set(pathPoints[0].x, tileHeight / 2 + 0.06, pathPoints[0].z);
  group.userData = {
    pathIndex: 0,
    progress: 0,
    speed: 0.006 + Math.random() * 0.003,
    health: 200,
  };
  getSceneContainer().add(group);
  enemies.push(group);
}

function getEnemies() {
  return enemies;
}

function removeEnemy(enemy, onEnemyDied) {
  if (enemy.userData && enemy.userData.isDying) return;
  if (!enemy.userData) enemy.userData = {};
  enemy.userData.isDying = true;
  enemy.userData.deathStart = Date.now();
  enemy.userData.originalScale = enemy.scale
    ? enemy.scale.clone()
    : new THREE.Vector3(scaleFactor, scaleFactor, scaleFactor);
  enemy.userData.deathCallback = onEnemyDied;
}

function updateEnemies(time, onEnemyDied) {
  if (!isPlayButtonPressed) {
    return;
  }
  if (time - lastEnemySpawn > enemySpawnRate && enemies.length < 5) {
    createEnemy();
    audioManager.play("sneeze");
    lastEnemySpawn = time;
  }

  enemies.forEach((enemy, enemyIndex) => {
    const data = enemy.userData || {};
    if (data.isDying) {
      const elapsed = Date.now() - (data.deathStart || 0);
      if (elapsed <= ENEMY_DEATH_PHASE1) {
        const t = easeOutQuad(Math.min(1, elapsed / ENEMY_DEATH_PHASE1));
        enemy.position.y = tileHeight / 2 + 0.06 + ENEMY_DEATH_JUMP * t;
        enemy.rotation.z = ENEMY_DEATH_ROT_Z * t;
      } else if (elapsed <= ENEMY_DEATH_PHASE1 + ENEMY_DEATH_PHASE2) {
        const t2 = Math.min(
          1,
          (elapsed - ENEMY_DEATH_PHASE1) / ENEMY_DEATH_PHASE2,
        );
        const s = 1 - t2;
        const orig =
          data.originalScale ||
          new THREE.Vector3(scaleFactor, scaleFactor, scaleFactor);
        enemy.scale.set(orig.x * s, orig.y * s, orig.z * s);
      } else {
        const idx = enemies.indexOf(enemy);
        if (idx > -1) {
          getSceneContainer().remove(enemy);
          enemies.splice(idx, 1);
        }
        if (data.deathCallback) data.deathCallback(true);
      }
      return;
    }
    if (data.pathIndex < pathPoints.length - 1) {
      data.progress += data.speed;
      if (data.progress >= 1) {
        data.progress = 0;
        data.pathIndex++;
      }
      if (data.pathIndex < pathPoints.length - 1) {
        const curr = pathPoints[data.pathIndex],
          nxt = pathPoints[data.pathIndex + 1];
        enemy.position.x = curr.x + (nxt.x - curr.x) * data.progress;
        enemy.position.z = curr.z + (nxt.z - curr.z) * data.progress;
        const direction = new THREE.Vector3(
          nxt.x - enemy.position.x,
          0,
          nxt.z - enemy.position.z,
        ).normalize();

        const targetAngle = Math.atan2(direction.x, direction.z);
        enemy.rotation.y = targetAngle;
      }

      enemy.position.y =
        tileHeight / 2 +
        0.06 +
        Math.abs(Math.sin(time * 0.01 + enemyIndex)) * 0.5;
      enemy.scale.y =
        scaleFactor + Math.sin(time * 0.015 + enemyIndex) * 0.1 * scaleFactor;
    } else {
      getSceneContainer().remove(enemy);
      enemies.splice(enemyIndex, 1);
      if (onEnemyDied) onEnemyDied(true);
    }
  });
}
