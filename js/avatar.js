/* ============================================================
   The 3D companion — a robot, with no photo on its face.

   A full-body robot pinned to the bottom-right corner: brushed
   metal chassis, glowing cyan core, antenna, and a curved visor
   screen with two glowing eyes and a small mouth line.

   It hovers, scans the room, blinks, pulses its core, sweeps a
   scan band over its face, and waves whenever the router fires
   an "avatar:wave" event. The photo in assets/images is used only
   for the About portrait, not for the robot.
   ============================================================ */

import * as THREE from "three";

const CONFIG = {
  cameraFov: 32,
};

const COMPANION = document.getElementById("avatar-companion");
const STAGE = document.getElementById("avatar-canvas");
const BUBBLE = document.getElementById("avatar-bubble");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const BASE_ROTATION = -0.12;
const WAVE_LENGTH = 2.2;

// Visor screen dimensions.
const SCREEN = { radius: 0.306, arc: 1.7, height: 0.36 };

export function initAvatar() {
  if (COMPANION && STAGE) init();
}

function init() {
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    console.warn("[avatar] WebGL unavailable — skipping the companion.", error);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  STAGE.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CONFIG.cameraFov, 1, 0.1, 100);

  // Soft daylight, with cyan rim lights to match the site accent.
  scene.add(new THREE.HemisphereLight(0xcdeeff, 0x0a1420, 1.25));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(2.5, 4, 3.5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x22d3ee, 3.4);
  rimLight.position.set(-3, 2.4, -2.5);
  scene.add(rimLight);

  const fillLight = new THREE.PointLight(0x2dd4bf, 6, 9, 1.6);
  fillLight.position.set(-1.6, 1.5, 2.6);
  scene.add(fillLight);

  const screenLight = new THREE.PointLight(0x22d3ee, 1.4, 4, 1.8);
  screenLight.position.set(0, 1.7, 1.4);
  scene.add(screenLight);

  buildEnvironment(renderer);

  const avatar = buildRobot();
  const model = avatar.group;
  model.rotation.y = BASE_ROTATION;
  scene.add(model);

  let rafId = 0;
  let bubbleTimer = 0;
  let pointerRotation = 0;
  let waveStartedAt = -1;
  let ready = false;
  let speaking = false;

  const startTime = performance.now();
  const now = () => (performance.now() - startTime) / 1000;

  fitCamera();
  renderer.render(scene, camera);

  ready = true;
  COMPANION.classList.add("is-ready");

  if (!reduceMotion.matches) startLoop();

  /* ------------------------ Environment ------------------------ */
  // A tiny emissive room so the metal chassis has something to
  // reflect. Without it, high-metalness materials render almost black.
  function buildEnvironment(theRenderer) {
    try {
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x0a1420);

      const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 14),
        new THREE.MeshBasicMaterial({ color: 0xbfe9ff })
      );
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.y = 6;
      envScene.add(ceiling);

      const cyanWall = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 8),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee })
      );
      cyanWall.position.set(-6, 2, 0);
      cyanWall.rotation.y = Math.PI / 2;
      envScene.add(cyanWall);

      const warmFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 12),
        new THREE.MeshBasicMaterial({ color: 0x1b2a38 })
      );
      warmFloor.rotation.x = -Math.PI / 2;
      warmFloor.position.y = -1;
      envScene.add(warmFloor);

      const keyPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 5),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      keyPanel.position.set(4, 4, 6);
      keyPanel.lookAt(0, 1, 0);
      envScene.add(keyPanel);

      const pmrem = new THREE.PMREMGenerator(theRenderer);
      scene.environment = pmrem.fromScene(envScene, 0.02).texture;
      pmrem.dispose();

      envScene.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
    } catch (error) {
      console.warn("[avatar] Environment map skipped.", error);
    }
  }

  /* --------------------------- Robot ---------------------------- */

  function buildRobot() {
    const group = new THREE.Group();

    const materials = {
      shell: new THREE.MeshStandardMaterial({
        color: 0x9fb0c4,
        metalness: 0.72,
        roughness: 0.32,
        flatShading: true,
      }),
      shellLight: new THREE.MeshStandardMaterial({
        color: 0xced9e6,
        metalness: 0.68,
        roughness: 0.24,
        flatShading: true,
      }),
      plate: new THREE.MeshStandardMaterial({
        color: 0x33424f,
        metalness: 0.62,
        roughness: 0.42,
        flatShading: true,
      }),
      dark: new THREE.MeshStandardMaterial({
        color: 0x0d151d,
        metalness: 0.55,
        roughness: 0.5,
      }),
      joint: new THREE.MeshStandardMaterial({
        color: 0x1b2733,
        metalness: 0.8,
        roughness: 0.36,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: 0x0e7490,
        emissive: 0x22d3ee,
        emissiveIntensity: 1.1,
        metalness: 0.2,
        roughness: 0.28,
      }),
      accentSoft: new THREE.MeshStandardMaterial({
        color: 0x155e75,
        emissive: 0x22d3ee,
        emissiveIntensity: 0.7,
        metalness: 0.1,
        roughness: 0.45,
      }),
      screenFrame: new THREE.MeshStandardMaterial({
        color: 0x0a1119,
        metalness: 0.78,
        roughness: 0.34,
      }),
    };

    /* Feet, legs and hips */

    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.145, 0.165, 0.11, 10),
        materials.plate
      );
      foot.position.set(side * 0.165, 0.075, 0.015);
      group.add(foot);

      const hoverRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.152, 0.011, 8, 32),
        materials.accent
      );
      hoverRing.rotation.x = Math.PI / 2;
      hoverRing.position.set(side * 0.165, 0.022, 0.015);
      group.add(hoverRing);

      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.074, 0.22, 8),
        materials.joint
      );
      leg.position.set(side * 0.165, 0.24, 0);
      group.add(leg);

      const kneeBand = new THREE.Mesh(
        new THREE.TorusGeometry(0.07, 0.009, 6, 20),
        materials.accentSoft
      );
      kneeBand.rotation.x = Math.PI / 2;
      kneeBand.position.set(side * 0.165, 0.3, 0);
      group.add(kneeBand);
    }

    const hips = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.13, 0.27),
      materials.plate
    );
    hips.position.y = 0.42;
    group.add(hips);

    /* Torso */

    const torso = new THREE.Group();
    group.add(torso);

    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.7, 0.42),
      materials.shell
    );
    chest.position.y = 0.86;
    torso.add(chest);

    const bellyBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.1, 0.44),
      materials.plate
    );
    bellyBand.position.y = 0.55;
    torso.add(bellyBand);

    const chestPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.36, 0.07),
      materials.dark
    );
    chestPlate.position.set(0, 0.92, 0.215);
    torso.add(chestPlate);

    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.108, 0.018, 10, 40),
      materials.accent
    );
    coreRing.position.set(0, 0.92, 0.26);
    torso.add(coreRing);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    core.position.set(0, 0.92, 0.265);
    torso.add(core);

    // Vent slats under the core.
    for (let i = 0; i < 3; i += 1) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.014, 0.02),
        materials.plate
      );
      vent.position.set(0, 0.72 - i * 0.038, 0.216);
      torso.add(vent);
    }

    // Small cyan status light on the hip.
    const hipLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.022, 0.015),
      materials.accent
    );
    hipLight.position.set(0.17, 0.62, 0.216);
    torso.add(hipLight);

    // Backpack and shoulder pads.
    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.36, 0.12),
      materials.plate
    );
    pack.position.set(0, 0.92, -0.26);
    torso.add(pack);

    for (const side of [-1, 1]) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.24, 0.02),
        materials.accentSoft
      );
      vent.position.set(side * 0.12, 0.92, -0.325);
      torso.add(vent);

      const pad = new THREE.Mesh(
        new THREE.SphereGeometry(0.145, 20, 14),
        materials.shellLight
      );
      pad.scale.set(1, 0.86, 0.92);
      pad.position.set(side * 0.4, 1.1, 0);
      torso.add(pad);
    }

    /* Neck and head */

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.095, 0.14, 12),
      materials.joint
    );
    neck.position.y = 1.26;
    group.add(neck);

    const collarRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.012, 8, 28),
      materials.accentSoft
    );
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.y = 1.22;
    group.add(collarRing);

    const headGroup = new THREE.Group();
    headGroup.position.y = 1.58;
    group.add(headGroup);

    const skull = new THREE.Mesh(
      new THREE.SphereGeometry(1, 36, 26),
      materials.shell
    );
    skull.scale.set(0.3, 0.262, 0.276);
    headGroup.add(skull);

    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(0.252, 0.018, 8, 40),
      materials.plate
    );
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 0.105;
    headGroup.add(crown);

    // Visor: dark bezel, curved photo screen, and glowing edge strips.
    const bezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.297, 0.297, 0.43, 40, 1, true, -0.94, 1.88),
      materials.screenFrame
    );
    bezel.position.y = -0.005;
    headGroup.add(bezel);

    const jawBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.29, 0.075, 32, 1, true, -0.82, 1.64),
      materials.plate
    );
    jawBand.position.y = -0.205;
    headGroup.add(jawBand);

    const topGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.299, 0.299, 0.014, 32, 1, true, -0.9, 1.8),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
    );
    topGlow.position.y = 0.19;
    headGroup.add(topGlow);

    const bottomGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.012, 32, 1, true, -0.8, 1.6),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    bottomGlow.position.y = -0.198;
    headGroup.add(bottomGlow);

    // Dark glass visor. The face is built from glowing shapes instead of a
    // photo, so no portrait is mapped onto the robot.
    const visorMaterial = new THREE.MeshStandardMaterial({
      color: 0x050d14,
      metalness: 0.82,
      roughness: 0.2,
      emissive: 0x03131c,
      emissiveIntensity: 0.7,
    });
    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(
        SCREEN.radius,
        SCREEN.radius,
        SCREEN.height,
        48,
        1,
        true,
        -SCREEN.arc / 2,
        SCREEN.arc
      ),
      visorMaterial
    );
    visor.position.y = -0.005;
    visor.renderOrder = 2;
    headGroup.add(visor);

    // Eyes, sitting just in front of the curved glass.
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(0, 0.05, 0.292);
    headGroup.add(eyeGroup);

    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xc4f9ff,
      toneMapped: false,
    });
    const eyeHaloMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 14),
        eyeMaterial
      );
      eye.scale.set(0.052, 0.031, 0.014);
      eye.position.set(side * 0.088, 0, 0.014);
      eyeGroup.add(eye);

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(1, 18, 12),
        eyeHaloMaterial
      );
      halo.scale.set(0.083, 0.058, 0.02);
      halo.position.set(side * 0.088, 0, 0.006);
      eyeGroup.add(halo);
    }

    // A small glowing mouth line, so the visor reads as a face.
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.044, 0.0055, 8, 24, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, toneMapped: false })
    );
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.052, 0.304);
    mouth.renderOrder = 3;
    headGroup.add(mouth);

    // Sweeping scan band that travels up the face while idling.
    const scanBand = new THREE.Mesh(
      new THREE.CylinderGeometry(
        SCREEN.radius + 0.004,
        SCREEN.radius + 0.004,
        0.05,
        40,
        1,
        true,
        -SCREEN.arc / 2 + 0.01,
        SCREEN.arc - 0.02
      ),
      new THREE.MeshBasicMaterial({
        color: 0xa5f3ff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    scanBand.position.y = 0.1;
    scanBand.renderOrder = 3;
    headGroup.add(scanBand);

    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(
        new THREE.BoxGeometry(0.026, 0.026, 0.018),
        new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
      );
      cheek.position.set(side * 0.238, -0.135, 0.135);
      headGroup.add(cheek);
    }

    // Ear pods with glowing rings.
    const earRings = [];
    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.078, 0.078, 0.062, 20),
        materials.plate
      );
      pod.rotation.z = Math.PI / 2;
      pod.position.set(side * 0.292, -0.005, 0);
      headGroup.add(pod);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.048, 0.008, 6, 24),
        materials.accent
      );
      ring.rotation.y = Math.PI / 2;
      ring.position.set(side * 0.327, -0.005, 0);
      headGroup.add(ring);
      earRings.push(ring);
    }

    // Antenna with a soft glowing tip.
    const antennaGroup = new THREE.Group();
    antennaGroup.position.set(0.17, 0.2, -0.02);
    antennaGroup.rotation.z = 0.18;
    headGroup.add(antennaGroup);

    const antennaRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.014, 0.25, 8),
      materials.joint
    );
    antennaRod.position.y = 0.125;
    antennaGroup.add(antennaRod);

    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
    );
    tip.position.y = 0.262;
    antennaGroup.add(tip);

    const tipHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.062, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    tipHalo.position.y = 0.262;
    antennaGroup.add(tipHalo);

    /* Arms */

    const leftArm = buildArm(-1);
    const rightArm = buildArm(1);
    group.add(leftArm.group, rightArm.group);

    function buildArm(side) {
      const armGroup = new THREE.Group();
      armGroup.position.set(side * 0.42, 1.08, 0);
      armGroup.rotation.z = side * 0.1;
      const baseRotation = side * 0.1;

      const shoulderBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.105, 20, 14),
        materials.joint
      );
      armGroup.add(shoulderBall);

      const upper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.062, 0.28, 8),
        materials.shellLight
      );
      upper.position.y = -0.17;
      armGroup.add(upper);

      const elbow = new THREE.Mesh(
        new THREE.SphereGeometry(0.068, 16, 12),
        materials.joint
      );
      elbow.position.y = -0.32;
      armGroup.add(elbow);

      const forearm = new THREE.Group();
      forearm.position.y = -0.32;
      forearm.rotation.x = -0.18;
      armGroup.add(forearm);

      const lower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.052, 0.26, 8),
        materials.shell
      );
      lower.position.y = -0.14;
      forearm.add(lower);

      const wrist = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.009, 6, 22),
        materials.accentSoft
      );
      wrist.rotation.x = Math.PI / 2;
      wrist.position.y = -0.275;
      forearm.add(wrist);

      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(1, 18, 14),
        materials.plate
      );
      hand.scale.set(0.058, 0.075, 0.05);
      hand.position.y = -0.345;
      forearm.add(hand);

      return { group: armGroup, forearm, hand, baseRotation };
    }

    return {
      group,
      torso,
      headGroup,
      leftArm,
      rightArm,
      antennaGroup,
      core,
      coreRing,
      earRings,
      visorMaterial,
      eyeGroup,
      eyeMaterial,
      eyeHaloMaterial,
      mouth,
      scanBand,
      tip,
      tipHalo,
      materials,
    };
  }

  /* ------------------------- Camera framing ------------------------- */

  function fitCamera() {
    const width = STAGE.clientWidth;
    const height = STAGE.clientHeight;
    if (!width || !height) return;

    renderer.setSize(width, height, false);

    const aspect = width / height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const distV = size.y / 2 / Math.tan(vFov / 2);
    const distH = size.x / 2 / Math.tan(hFov / 2);
    const distance = Math.max(distV, distH) * 1.16;

    const direction = new THREE.Vector3(0.24, 0.08, 1).normalize();
    const target = new THREE.Vector3(center.x, size.y * 0.5, center.z);

    camera.position.copy(target).addScaledVector(direction, distance);
    camera.near = Math.max(0.05, distance / 100);
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
    camera.lookAt(target);

    if (reduceMotion.matches || !rafId) renderer.render(scene, camera);
  }

  /* --------------------------- Animation ---------------------------- */

  function showBubble(message, duration = 2600) {
    if (!BUBBLE || !message) return;
    BUBBLE.textContent = message;
    BUBBLE.classList.add("is-visible");
    window.clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(() => {
      BUBBLE.classList.remove("is-visible");
    }, duration);
  }

  function triggerWave(message) {
    showBubble(message);
    if (reduceMotion.matches || !ready) return;

    waveStartedAt = now();
    if (!rafId) startLoop();
  }

  // Used by the chat: the robot says something without waving.
  function triggerSay(message, duration) {
    if (!message) return;
    showBubble(message, duration);
    if (!rafId && !reduceMotion.matches) startLoop();
  }

  function animate(t) {
    const {
      group,
      torso,
      headGroup,
      leftArm,
      rightArm,
      antennaGroup,
      core,
      coreRing,
      earRings,
      visorMaterial,
      eyeGroup,
      eyeHaloMaterial,
      scanBand,
      tip,
      tipHalo,
      materials,
    } = avatar;

    // Hover.
    group.position.y = 0.012 + Math.sin(t * 1.35) * 0.018;
    torso.rotation.z = Math.sin(t * 0.88) * 0.008;

    // Head scans slowly, with a light nod and tilt.
    headGroup.rotation.y = Math.sin(t * 0.48 + 0.9) * 0.07;
    headGroup.rotation.x = Math.sin(t * 0.62) * 0.018;
    headGroup.rotation.z = Math.sin(t * 0.75 + 0.3) * 0.02;

    // Antenna springs around as the head moves.
    antennaGroup.rotation.z = 0.18 + Math.sin(t * 2.1) * 0.07;
    antennaGroup.rotation.x = Math.cos(t * 1.7) * 0.05;

    // Reaction core: pulse the glow and the ring.
    const pulse = 1 + Math.sin(t * 2.4) * 0.075;
    core.scale.setScalar(pulse);
    coreRing.scale.setScalar(1 + Math.sin(t * 2.4 + 0.5) * 0.04);
    materials.accent.emissiveIntensity = 1.05 + Math.sin(t * 2.4) * 0.35;
    materials.accentSoft.emissiveIntensity = 0.6 + Math.sin(t * 1.8 + 1) * 0.22;

    // Ear rings breathe with the core.
    for (const ring of earRings) {
      ring.scale.setScalar(1 + Math.sin(t * 1.9) * 0.05);
    }

    // Eyes: glance around, then blink every few seconds.
    eyeGroup.position.x = Math.sin(t * 0.9) * 0.012;
    eyeGroup.position.y = 0.05 + Math.sin(t * 0.7 + 0.4) * 0.006;

    const blinkWindow = t % 4.4;
    eyeGroup.scale.y =
      blinkWindow < 0.16
        ? Math.max(0.1, Math.abs(Math.cos((blinkWindow / 0.16) * Math.PI)))
        : 1;
    eyeHaloMaterial.opacity = 0.22 + Math.sin(t * 2.4) * 0.08;
    visorMaterial.emissiveIntensity = 0.6 + Math.sin(t * 1.3) * 0.15;

    // Talking: the visor mouth opens and closes while the robot speaks.
    const mouthTarget = speaking ? 0.7 + Math.abs(Math.sin(t * 9)) * 0.85 : 1;
    const mouthY = avatar.mouth.scale.y + (mouthTarget - avatar.mouth.scale.y) * 0.35;
    avatar.mouth.scale.set(1 + (mouthY - 1) * 0.18, mouthY, 1);
    if (speaking) headGroup.rotation.x += Math.sin(t * 6.2) * 0.007;

    // Antenna tip blinks like a status light.
    const blink = (Math.sin(t * 3.1) + 1) / 2;
    tipHalo.scale.setScalar(0.85 + blink * 0.35);
    tipHalo.material.opacity = 0.12 + blink * 0.16;

    // Scan band sweeps up the face, then wraps around.
    const sweep = (t * 0.22) % 1;
    scanBand.position.y = -0.15 + sweep * 0.3;
    scanBand.material.opacity = 0.1 + Math.sin(sweep * Math.PI) * 0.14;

    // Idle arm sway, with slightly bent elbows.
    leftArm.group.rotation.z =
      leftArm.baseRotation + Math.sin(t * 1.12 + 0.6) * 0.03;
    rightArm.group.rotation.z =
      rightArm.baseRotation + Math.sin(t * 1.12) * 0.03;
    leftArm.forearm.rotation.x = -0.18 + Math.sin(t * 1.12 + 0.6) * 0.04;
    rightArm.forearm.rotation.x = -0.18 + Math.sin(t * 1.12) * 0.04;

    if (waveStartedAt >= 0) {
      const progress = (t - waveStartedAt) / WAVE_LENGTH;

      if (progress >= 1) {
        waveStartedAt = -1;
      } else {
        const rise = smoothstep(clamp01(progress / 0.22));
        const fall = 1 - smoothstep(clamp01((progress - 0.76) / 0.24));
        const lift = Math.min(rise, fall);
        const angle = -2.35 + Math.sin(progress * Math.PI * 8) * 0.15;

        leftArm.group.rotation.z =
          leftArm.baseRotation +
          (angle - leftArm.baseRotation) * lift;
        leftArm.group.rotation.y = -0.3 * lift;
        leftArm.forearm.rotation.x = -0.18 + 0.55 * lift;
        leftArm.forearm.rotation.z = Math.sin(progress * Math.PI * 8) * 0.22 * lift;
        headGroup.rotation.z += 0.05 * lift;
      }
    }

    group.rotation.y +=
      (BASE_ROTATION + pointerRotation - group.rotation.y) * 0.08;
  }

  function renderOnce() {
    renderer.render(scene, camera);
  }

  function startLoop() {
    if (rafId) return;

    const tick = () => {
      rafId = window.requestAnimationFrame(tick);
      animate(now());
      renderer.render(scene, camera);
    };

    rafId = window.requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (!rafId) return;
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /* ----------------------------- Events ----------------------------- */

  window.addEventListener("avatar:wave", (event) => {
    triggerWave(event.detail?.message);
  });

  window.addEventListener("avatar:say", (event) => {
    triggerSay(event.detail?.message, event.detail?.duration);
  });

  // The chat module raises this while an answer is being spoken or streamed.
  window.addEventListener("avatar:speak", (event) => {
    speaking = Boolean(event.detail?.speaking);
    if (speaking && !rafId && !reduceMotion.matches) startLoop();
  });

  if (!reduceMotion.matches) {
    window.addEventListener(
      "pointermove",
      (event) => {
        const x = event.clientX / window.innerWidth;
        pointerRotation = Math.max(-0.3, Math.min(0.3, (x - 0.5) * 0.55));
      },
      { passive: true }
    );
  }

  // Fade the companion when the pointer is near, so it never hides content
  // (contact form fields, about facts) underneath it. It is pointer-events:
  // none, so this window listener still receives moves over its area.
  let avatarRect = COMPANION.getBoundingClientRect();
  let pointerNear = false;
  let formFocused = false;
  let isDimmed = false;

  const updateDim = () => {
    const next = pointerNear || formFocused;
    if (next === isDimmed) return;
    isDimmed = next;
    COMPANION.classList.toggle("is-dimmed", next);
  };

  const measureAvatar = () => {
    avatarRect = COMPANION.getBoundingClientRect();
  };

  window.addEventListener("resize", measureAvatar, { passive: true });

  window.addEventListener(
    "pointermove",
    (event) => {
      const pad = 26;
      pointerNear =
        event.clientX >= avatarRect.left - pad &&
        event.clientX <= avatarRect.right + pad &&
        event.clientY >= avatarRect.top - pad &&
        event.clientY <= avatarRect.bottom + pad;
      updateDim();
    },
    { passive: true }
  );

  window.addEventListener("pointerleave", () => {
    pointerNear = false;
    updateDim();
  });

  // Touch screens have no hover, so the companion can never be "moved away"
  // from. Keep it semi-transparent there, and fade it almost out while the
  // page is being scrolled so it never hides text someone is reading.
  const coarsePointer = window.matchMedia("(hover: none)");
  let scrollTimer = 0;

  const syncPointerMode = () => {
    COMPANION.classList.toggle("is-touch", coarsePointer.matches);
  };

  syncPointerMode();
  coarsePointer.addEventListener?.("change", syncPointerMode);

  window.addEventListener(
    "scroll",
    () => {
      if (!coarsePointer.matches) return;
      COMPANION.classList.add("is-scrolling");
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        COMPANION.classList.remove("is-scrolling");
      }, 500);
    },
    { passive: true }
  );

  // Keep the companion out of the way while someone is using the form.
  const form = document.getElementById("contact-form");
  form?.addEventListener("focusin", () => {
    formFocused = true;
    updateDim();
  });
  form?.addEventListener("focusout", () => {
    formFocused = false;
    updateDim();
  });

  reduceMotion.addEventListener?.("change", () => {
    if (reduceMotion.matches) {
      stopLoop();
      renderOnce();
    } else {
      startLoop();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopLoop();
    } else if (!reduceMotion.matches) {
      startLoop();
    } else {
      renderOnce();
    }
  });

  const resizeObserver = new ResizeObserver(() => fitCamera());
  resizeObserver.observe(STAGE);

  fitCamera();
}

// Small helpers shared by the animation code.
function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}
