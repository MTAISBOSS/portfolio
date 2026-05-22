let gameTime = 0;
let cameraShakeAmount = 0;
let cameraOriginalPosition = { x: 0, z: 0 };
const audioManager = new AudioManager();

let TOWER_SHOT_SCALE_X = 1.05;
let TOWER_SHOT_SCALE_Y = 0.95;
let TOWER_SHOT_SCALE_Z = 1.1;
let TOWER_SHOT_DURATION = 500;

const shotExplosions = [];
function createShotExplosion(tower, time) {
  const currentAngle = tower.rotation.y;
  const pos = new THREE.Vector3();
  pos.copy(tower.position);
  pos.y += 0.8;
  pos.z += Math.cos(currentAngle) * 0.9;
  pos.x += Math.sin(currentAngle) * 0.9;

  const mainGeom = new THREE.SphereGeometry(0.12, 12, 12);
  const mainMat = new THREE.MeshBasicMaterial({
    color: 0xffaa33,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
  });
  const main = new THREE.Mesh(mainGeom, mainMat);
  main.position.copy(pos);
  main.userData = { start: time, duration: 350, type: "main" };
  getSceneContainer().add(main);
  shotExplosions.push(main);

  const sparksCount = 8;
  for (let i = 0; i < sparksCount; i++) {
    const size = 0.03 + Math.random() * 0.06;
    const geom = new THREE.SphereGeometry(size, 8, 8);
    const color = Math.random() > 0.5 ? 0xffa500 : 0xffee66; // orange or yellow
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });
    const spark = new THREE.Mesh(geom, mat);
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.2,
    );
    const startPos = new THREE.Vector3().copy(pos).add(offset);
    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.2,
      Math.random() - 0.5,
    ).normalize();
    const speed = 0.0008 + Math.random() * 0.0016; // units per ms
    const vel = dir.multiplyScalar(speed);
    spark.position.copy(startPos);
    spark.userData = {
      start: time,
      duration: 500 + Math.random() * 300,
      type: "spark",
      startPos,
      vel,
    };
    getSceneContainer().add(spark);
    shotExplosions.push(spark);
  }
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function startTowerScaleAnim(tower, time, opts = {}) {
  const duration = opts.duration || TOWER_SHOT_DURATION;
  const xFactor = opts.xFactor || TOWER_SHOT_SCALE_X;
  const yFactor = opts.yFactor || TOWER_SHOT_SCALE_Y;
  const zFactor = opts.zFactor || TOWER_SHOT_SCALE_Z;
  const startScale = tower.scale.clone();
  const targetScale = new THREE.Vector3(
    startScale.x * xFactor,
    startScale.y * yFactor,
    startScale.z * zFactor,
  );
  tower.userData.scaleAnim = {
    start: time,
    duration,
    startScale,
    targetScale,
  };
}

function updateGameLogic(time) {
  updateEnemies(time, (enemyDied) => {
    if (enemyDied) {
      cameraShakeAmount = 0.5;
      audioManager.play("splash");
    }
  });

  getTowers().forEach((tower) => {
    const data = tower.userData;
    let nearestEnemy = null,
      nearestDist = Infinity;

    if (data && data.scaleAnim) {
      const anim = data.scaleAnim;
      const elapsed = time - anim.start;
      if (elapsed >= anim.duration) {
        tower.scale.copy(anim.startScale);
        delete data.scaleAnim;
      } else {
        const half = anim.duration / 2;
        let p;
        if (elapsed <= half) {
          p = easeOutBack(elapsed / half);
          tower.scale.set(
            anim.startScale.x + (anim.targetScale.x - anim.startScale.x) * p,
            anim.startScale.y + (anim.targetScale.y - anim.startScale.y) * p,
            anim.startScale.z + (anim.targetScale.z - anim.startScale.z) * p,
          );
        } else {
          p = easeOutBack((elapsed - half) / half);
          tower.scale.set(
            anim.targetScale.x + (anim.startScale.x - anim.targetScale.x) * p,
            anim.targetScale.y + (anim.startScale.y - anim.targetScale.y) * p,
            anim.targetScale.z + (anim.startScale.z - anim.targetScale.z) * p,
          );
        }
      }
    }

    getEnemies().forEach((enemy) => {
      const dist = tower.position.distanceTo(enemy.position);
      if (dist < 5 && dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    });

    if (nearestEnemy) {
      const direction = new THREE.Vector3(
        nearestEnemy.position.x - tower.position.x,
        0,
        nearestEnemy.position.z - tower.position.z,
      ).normalize();

      const targetAngle = Math.atan2(direction.x, direction.z);
      data.targetRotation = targetAngle;
      let angleDiff = data.targetRotation - tower.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      tower.rotation.y += angleDiff * 0.08;

      if (time - data.lastShot > data.fireRate) {
        const currentAngle = tower.rotation.y;
        const startPos = new THREE.Vector3();
        startPos.copy(tower.position);
        startPos.y = data.ballPos.y + 0.4;
        startPos.z += Math.cos(currentAngle) * 0.55;
        startPos.x += Math.sin(currentAngle) * 0.55;
        createProjectile(startPos, nearestEnemy);
        audioManager.play("blab");
        data.lastShot = time;
        startTowerScaleAnim(tower, time);
        createShotExplosion(tower, time);
      }
    }
  });

  updateProjectiles();

  for (let i = shotExplosions.length - 1; i >= 0; i--) {
    const s = shotExplosions[i];
    const elapsed = time - (s.userData.start || 0);
    const dur = s.userData.duration || 300;
    if (elapsed >= dur) {
      getSceneContainer().remove(s);
      shotExplosions.splice(i, 1);
    } else {
      const t = elapsed / dur;
      if (s.userData.type === "main") {
        const scale = 1 + t * 2.0; // bigger growth
        s.scale.set(scale, scale, scale);
        if (s.material && s.material.transparent) s.material.opacity = 1 - t;
      } else if (s.userData.type === "spark") {
        const startPos = s.userData.startPos;
        const vel = s.userData.vel;
        const pos = new THREE.Vector3(
          startPos.x + vel.x * elapsed,
          startPos.y + vel.y * elapsed,
          startPos.z + vel.z * elapsed,
        );
        s.position.copy(pos);
        const scale = 0.6 * (1 - t);
        s.scale.set(scale, scale, scale);
        if (s.material && s.material.transparent) s.material.opacity = 1 - t;
      } else {
        const scale = 0.5 + t * 1.5;
        s.scale.set(scale, scale, scale);
        if (s.material && s.material.transparent) s.material.opacity = 1 - t;
      }
    }
  }
}

function startGameLoop() {
  const renderer = getRenderer();
  const composer = getComposer();
  const postProcessPass = getPostProcessPass();
  const camera = getCamera();
  const sceneContainer = getSceneContainer();

  cameraOriginalPosition.x = 11;
  cameraOriginalPosition.z = 11;

  function animate() {
    requestAnimationFrame(animate);
    gameTime += 16;

    postProcessPass.uniforms.uTime.value = gameTime * 0.001;

    getFresnelMaterials().forEach((mat) => {
      if (mat.uniforms && mat.uniforms.uTime) {
        mat.uniforms.uTime.value = gameTime * 0.001;
      }
    });

    sceneContainer.rotation.y += 0.001;

    updateGameLogic(gameTime);

    if (typeof updateSnowParticles === "function")
      updateSnowParticles(gameTime);

    let targetX = cameraOriginalPosition.x + Math.sin(gameTime * 0.00025) * 0.3;
    let targetZ = cameraOriginalPosition.z + Math.cos(gameTime * 0.00025) * 0.3;

    if (cameraShakeAmount > 0) {
      targetX += (Math.random() - 0.5) * cameraShakeAmount;
      targetZ += (Math.random() - 0.5) * cameraShakeAmount;
      cameraShakeAmount *= 0.85;
    }

    camera.position.x = targetX;
    camera.position.z = targetZ;
    camera.lookAt(0, 0.4, 0);

    composer.render();
  }

  animate();
}

async function initAudio() {
  await audioManager.loadSounds({
    blab: { url: "./audio/blab.wav", volume: 0.5, loop: false },
    bloob: { url: "./audio/bloob.wav", volume: 0.5, loop: false },
    themeBackground: {
      url: "./audio/themeBackground.mp3",
      volume: 1,
      loop: true,
    },
    sneeze: { url: "./audio/sneeze.wav", volume: 0.1, loop: false },
    splash: { url: "./audio/splash.wav", volume: 0.5, loop: false },
  });

  console.log("Loaded Audios");
  audioManager.play("themeBackground");
}

async function initializeGame() {
  await initAudio();

  initializeTileLoading();

  await placeAllModels();

  initializeTurrets();

  startGameLoop();
}
