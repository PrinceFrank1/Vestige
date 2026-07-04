// ─────────────────────────────────────────
// SCENE: Three.js Core, Camera, Renderer, Controls, Environment, Lights
// ─────────────────────────────────────────

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {
    DEFAULT_SPOT_COLOR, DEFAULT_AUTOROTATE_SPEED, DEFAULT_CAMERA_TARGET_Y,
    DEFAULT_FILL_COLOR, DEFAULT_FILL_INTENSITY, DEFAULT_RIM_COLOR,
    DEFAULT_RIM_INTENSITY, DEFAULT_RIM_POSITION, DEFAULT_RIM_ANGLE,
    DEFAULT_RIM_PENUMBRA, DEFAULT_RIM_DISTANCE, DEFAULT_RIM_DECAY,
    DEFAULT_AMBIENT_INTENSITY, LIGHT_POOL_OPACITY, BEAM_OPACITY, STAR_COUNT,
} from './config.js';

// ── Scene & Renderer ──
export const container = document.getElementById('canvas-container');
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0F0F0D);

const fogColor = new THREE.Color(0x111111);
scene.fog = new THREE.FogExp2(fogColor, 0.035);

export const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 1.2, 7.5);

export const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// ── Environment Map (for PBR reflections) ──
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
pmremGenerator.dispose();

// ── Controls ──
export const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, DEFAULT_CAMERA_TARGET_Y, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = DEFAULT_AUTOROTATE_SPEED;
controls.enablePan = false;
controls.minDistance = 2.8;
controls.maxDistance = 5.5;
controls.maxPolarAngle = Math.PI * 0.75;
controls.minPolarAngle = Math.PI * 0.25;
controls.update();

// ── Stage Group ──
export const stageGroup = new THREE.Group();
scene.add(stageGroup);

// ── Artifact Root ──
export const artifactRoot = new THREE.Group();
export const ARTIFACT_ROOT_BASE_Y = 0.8;
artifactRoot.position.y = ARTIFACT_ROOT_BASE_Y;
stageGroup.add(artifactRoot);

// ── Floor (shadow catcher) ──
const floorGeometry = new THREE.PlaneGeometry(50, 50);
const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.25, color: 0x000000 });
export const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
stageGroup.add(floor);

// ── Light Pool ──
const poolCanvas = document.createElement('canvas');
poolCanvas.width = 256;
poolCanvas.height = 256;
const poolCtx = poolCanvas.getContext('2d');
const poolGradient = poolCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
poolGradient.addColorStop(0, 'rgba(255, 244, 224, 0.9)');
poolGradient.addColorStop(0.5, 'rgba(255, 244, 224, 0.25)');
poolGradient.addColorStop(1, 'rgba(255, 244, 224, 0)');
poolCtx.fillStyle = poolGradient;
poolCtx.fillRect(0, 0, 256, 256);
const poolTexture = new THREE.CanvasTexture(poolCanvas);

export const lightPool = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({
        map: poolTexture,
        transparent: true,
        opacity: LIGHT_POOL_OPACITY,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    })
);
lightPool.rotation.x = -Math.PI / 2;
lightPool.position.y = 0.01;
stageGroup.add(lightPool);

// ── Starfield ──
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(STAR_COUNT * 3);
for (let i = 0; i < STAR_COUNT; i++) {
    const radius = 35 + Math.random() * 25;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.cos(phi);
    starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
export const starMaterial = new THREE.PointsMaterial({
    color: 0xF4F6FF,
    size: 0.05,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
});
export const starField = new THREE.Points(starGeometry, starMaterial);
scene.add(starField);

// ── Main Spotlight ──
export let MAIN_SPOT_INTENSITY = 160;
export const mainSpot = new THREE.SpotLight(DEFAULT_SPOT_COLOR, MAIN_SPOT_INTENSITY);
mainSpot.position.set(1.6, 7.5, 1.4);
mainSpot.target = artifactRoot;
mainSpot.angle = Math.PI / 5;
mainSpot.penumbra = 0.65;
mainSpot.decay = 2;
mainSpot.distance = 25;
mainSpot.castShadow = true;
mainSpot.shadow.mapSize.width = 2048;
mainSpot.shadow.mapSize.height = 2048;
mainSpot.shadow.bias = -0.0001;
mainSpot.shadow.radius = 8;
stageGroup.add(mainSpot);

// ── Light Beam (visible cone) ──
const beamHeight = mainSpot.position.y - artifactRoot.position.y;
function computeBeamGeometry(angle) {
    const beamRadius = beamHeight * Math.tan(angle);
    return new THREE.ConeGeometry(beamRadius, beamHeight, 48, 1, true);
}
export const beamMaterial = new THREE.MeshBasicMaterial({
    color: DEFAULT_SPOT_COLOR,
    transparent: true,
    opacity: BEAM_OPACITY,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
});
export const lightBeam = new THREE.Mesh(computeBeamGeometry(mainSpot.angle), beamMaterial);
lightBeam.position.set(
    mainSpot.position.x,
    mainSpot.position.y - beamHeight / 2,
    mainSpot.position.z
);
stageGroup.add(lightBeam);

export function rebuildLightBeam(angle) {
    lightBeam.geometry.dispose();
    lightBeam.geometry = computeBeamGeometry(angle);
}

// ── Fill Light ──
export let FILL_LIGHT_INTENSITY = DEFAULT_FILL_INTENSITY;
export const fillLight = new THREE.DirectionalLight(DEFAULT_FILL_COLOR, FILL_LIGHT_INTENSITY);
fillLight.position.set(-3, 2, 4);
stageGroup.add(fillLight);

// ── Rim Light ──
export let RIM_LIGHT_INTENSITY = DEFAULT_RIM_INTENSITY;
export const rimLight = new THREE.SpotLight(DEFAULT_RIM_COLOR, RIM_LIGHT_INTENSITY);
rimLight.position.set(...DEFAULT_RIM_POSITION);
rimLight.target = artifactRoot;
rimLight.angle = DEFAULT_RIM_ANGLE;
rimLight.penumbra = DEFAULT_RIM_PENUMBRA;
rimLight.decay = DEFAULT_RIM_DECAY;
rimLight.distance = DEFAULT_RIM_DISTANCE;
stageGroup.add(rimLight);

// ── Ambient ──
export const ambient = new THREE.AmbientLight(0x1A1815, DEFAULT_AMBIENT_INTENSITY);
scene.add(ambient);

// ── Golden Glint Light ──
export const goldenGlintLight = new THREE.SpotLight(0xFFD9A0, 0);
goldenGlintLight.position.set(-2.2, 1.6, 2.6);
goldenGlintLight.target = artifactRoot;
goldenGlintLight.angle = Math.PI / 20;
goldenGlintLight.penumbra = 0.9;
goldenGlintLight.decay = 2;
goldenGlintLight.distance = 12;
stageGroup.add(goldenGlintLight);

// ── Resize Handler ──
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
