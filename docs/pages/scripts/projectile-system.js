let projectiles = [];

function createProjectile(startPos, targetEnemy) {
  const projectile = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x000000,
      emissiveIntensity: 0,
    }),
  );
  projectile.position.copy(startPos);
  projectile.userData = { target: targetEnemy, speed: 0.2 };
  getSceneContainer().add(projectile);
  projectiles.push(projectile);
}

function getProjectiles() {
  return projectiles;
}

function removeProjectile(projectile) {
  const idx = projectiles.indexOf(projectile);
  if (idx > -1) {
    getSceneContainer().remove(projectile);
    projectiles.splice(idx, 1);
  }
}

function updateProjectiles() {
  projectiles.forEach((proj, projIndex) => {
    const target = proj.userData.target;
    if (target && target.parent) {
      const dir = new THREE.Vector3();
      dir.subVectors(target.position, proj.position).normalize();
      proj.position.add(dir.multiplyScalar(proj.userData.speed));

      if (proj.position.distanceTo(target.position) < 0.24) {
        removeProjectile(proj);
        target.userData.health -= 35;

        if (target.userData.health <= 0) {
          removeEnemy(target);
        }
      }
    } else {
      removeProjectile(proj);
    }
  });
}
