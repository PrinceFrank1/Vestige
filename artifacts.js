// ─────────────────────────────────────────
// ARTIFACTS: Loader, Model Management, Transitions, Tweens
// ─────────────────────────────────────────

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import {
    ARTIFACTS, ARTIFACT_BASE_PATH, DEFAULT_TARGET_ARTIFACT_SIZE,
    EXHIBIT_DWELL_MS, SWOOSH_DISTANCE, SPACE_ENTRY_FADE_MS,
    BLACKOUT_HOLD_MS, SPACE_ARRIVAL_LIGHT_MS,
    DEFAULT_SPOT_COLOR, DEFAULT_AUTOROTATE_SPEED, DEFAULT_CAMERA_TARGET_Y,
    DEFAULT_FILL_INTENSITY, DEFAULT_RIM_INTENSITY, DEFAULT_AMBIENT_INTENSITY,
    LIGHT_POOL_OPACITY, BEAM_OPACITY, GOLDEN_GLINT_INTENSITY,
    PRESENT_ROTATE_IN_MS, PRESENT_HOLD_MS, PRESENT_RETURN_MS,
} from './config.js';

import {
    scene, camera, controls, stageGroup, artifactRoot, ARTIFACT_ROOT_BASE_Y,
    mainSpot, rimLight, fillLight, ambient, beamMaterial, lightBeam,
    lightPool, starMaterial, goldenGlintLight,
    rebuildLightBeam,
} from './scene.js';

import {
    updateIdentityPanel, setTestimonyText, revealIdentityPanel, hideIdentityPanel, startTestimony,
} from './ui.js';

// ── GLTF / DRACO Setup ──
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// ── State ──
export let currentArtifactIndex = 0;
export let artifactMaterials = [];
export let isTransitioning = false;
export let entranceComplete = false;
export let entranceStartTime = 0;
export let autoAdvanceTimer = null;

// ── Idle State ──
export let idleMode = 'orbit';
export const ORBIT_IDLE_MODES = new Set(['orbit', 'still-then-orbit']);
export let currentPoolOpacity = LIGHT_POOL_OPACITY;
export let currentBeamOpacity = BEAM_OPACITY;
export let currentAmbientIntensity = DEFAULT_AMBIENT_INTENSITY;
export let currentStarOpacity = 0;
export let idleStartTimer = null;
export let glintTimer = null;
export let presentTimer = null;
export let presentToken = 0;

// ── Load Artifact ──
export function loadArtifact(artifactData, { autoEntrance = true } = {}) {
    const url = ARTIFACT_BASE_PATH + artifactData.file;

    return new Promise((resolve, reject) => {
        gltfLoader.load(
            url,
            (gltf) => {
                const model = gltf.scene;
                const t = artifactData.transform || { scale: 1, rotation: [0, 0, 0], position: [0, 0, 0] };

                const [rx, ry, rz] = t.rotation || [0, 0, 0];
                model.rotation.set(rx, ry, rz);

                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                const center = new THREE.Vector3();
                box.getSize(size);
                box.getCenter(center);
                const largestDimension = Math.max(size.x, size.y, size.z) || 1;

                const targetSize = t.targetSize ?? DEFAULT_TARGET_ARTIFACT_SIZE;
                const scaleFactor = (targetSize / largestDimension) * (t.scale ?? 1);
                model.scale.setScalar(scaleFactor);

                model.position.copy(center).multiplyScalar(-scaleFactor);

                const [px, py, pz] = t.position || [0, 0, 0];
                model.position.add(new THREE.Vector3(px, py, pz));

                const envIntensity = artifactData.direction?.envMapIntensity ?? 0;
                artifactMaterials = [];
                model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        if (node.material) {
                            node.material.transparent = true;
                            node.material.opacity = 0;
                            if ('envMapIntensity' in node.material) {
                                node.material.envMapIntensity = envIntensity;
                            }
                            artifactMaterials.push(node.material);
                        }
                    }
                });

                artifactRoot.add(model);

                if (autoEntrance) {
                    entranceComplete = false;
                    entranceStartTime = performance.now();
                }

                resolve(model);
            },
            undefined,
            (error) => {
                console.error(`[Vestige] Failed to load artifact "${artifactData.title}" from "${url}":`, error);
                reject(error);
            }
        );
    });
}

export function disposeArtifactModel() {
    while (artifactRoot.children.length > 0) {
        const child = artifactRoot.children[0];
        child.traverse((node) => {
            if (node.isMesh) {
                node.geometry?.dispose();
                const materials = Array.isArray(node.material) ? node.material : [node.material];
                materials.forEach((mat) => {
                    if (!mat) return;
                    Object.values(mat).forEach((value) => {
                        if (value && value.isTexture) value.dispose();
                    });
                    mat.dispose();
                });
            }
        });
        artifactRoot.remove(child);
    }
    artifactMaterials = [];
}

// ── Apply Direction ──
export function applyDirection(direction) {
    if (!direction) return;

    mainSpot.angle = direction.spotlight.angle;
    mainSpot.penumbra = direction.spotlight.penumbra;
    mainSpot.intensity = direction.spotlight.intensity ?? mainSpot.intensity;
    mainSpot.color.setHex(direction.spotlight.color ?? DEFAULT_SPOT_COLOR);
    beamMaterial.color.setHex(direction.spotlight.color ?? DEFAULT_SPOT_COLOR);
    rebuildLightBeam(direction.spotlight.angle);
    currentBeamOpacity = direction.beamOpacity ?? BEAM_OPACITY;

    const rim = direction.rimLight ?? {};
    rimLight.angle = rim.angle ?? Math.PI / 8;
    rimLight.penumbra = rim.penumbra ?? 0.8;
    rimLight.distance = rim.distance ?? 15;
    rimLight.decay = rim.decay ?? 2;
    rimLight.color.setHex(rim.color ?? 0xFFF5E8);
    const rimPos = rim.position ?? [4, 3, -4];
    rimLight.position.set(rimPos[0], rimPos[1], rimPos[2]);
    rimLight.intensity = rim.intensity ?? DEFAULT_RIM_INTENSITY;

    const fill = direction.fillLight ?? {};
    fillLight.color.setHex(fill.color ?? DEFAULT_FILL_COLOR);
    fillLight.intensity = fill.intensity ?? DEFAULT_FILL_INTENSITY;

    currentAmbientIntensity = direction.ambientIntensity ?? DEFAULT_AMBIENT_INTENSITY;
    currentStarOpacity = direction.starOpacity ?? 0;

    idleMode = direction.idle;
    controls.autoRotateSpeed = direction.autoRotateSpeed ?? DEFAULT_AUTOROTATE_SPEED;
    clearTimeout(idleStartTimer);
    cancelPresentRotation();
    const isOrbitFamily = ORBIT_IDLE_MODES.has(idleMode);
    const hasDelayedStart = isOrbitFamily && (direction.idleStartDelayMs || 0) > 0;
    controls.autoRotate = isOrbitFamily && !hasDelayedStart;

    artifactRoot.rotation.set(0, 0, 0);
    artifactRoot.position.set(0, ARTIFACT_ROOT_BASE_Y, 0);

    controls.minDistance = direction.cameraDistance.min;
    controls.maxDistance = direction.cameraDistance.max;
    controls.target.y = direction.cameraTargetY ?? DEFAULT_CAMERA_TARGET_Y;

    currentPoolOpacity = direction.poolOpacity ?? LIGHT_POOL_OPACITY;
}

export function beginIdleRotation(direction) {
    clearTimeout(idleStartTimer);
    if (!direction) return;
    const isOrbitFamily = ORBIT_IDLE_MODES.has(direction.idle);
    const delay = direction.idleStartDelayMs || 0;
    if (isOrbitFamily && delay > 0) {
        idleStartTimer = setTimeout(() => {
            controls.autoRotate = true;
        }, delay);
    }
}

// ── Golden Glint ──
export function scheduleGoldenGlint(direction) {
    clearTimeout(glintTimer);
    goldenGlintLight.intensity = 0;
    if (!direction?.goldenGlintDelayMs) return;
    glintTimer = setTimeout(async () => {
        await tweenLightIntensity(goldenGlintLight, GOLDEN_GLINT_INTENSITY, 600);
        await wait(500);
        await tweenLightIntensity(goldenGlintLight, 0, 1000);
    }, direction.goldenGlintDelayMs);
}

// ── Present Rotation (Rosetta Stone) ──
export function schedulePresentRotation(direction) {
    presentToken += 1;
    const token = presentToken;
    clearTimeout(presentTimer);

    const amplitude = ((direction.presentRotationDeg ?? 8) * Math.PI) / 180;
    const minMs = direction.presentIntervalMinMs ?? 12000;
    const maxMs = direction.presentIntervalMaxMs ?? 15000;

    async function cycle() {
        if (token !== presentToken) return;
        const delay = minMs + Math.random() * (maxMs - minMs);
        presentTimer = setTimeout(async () => {
            if (token !== presentToken) return;
            await tweenValue(PRESENT_ROTATE_IN_MS, (t) => {
                if (token !== presentToken) return;
                artifactRoot.rotation.y = amplitude * t;
            });
            if (token !== presentToken) return;
            await wait(PRESENT_HOLD_MS);
            if (token !== presentToken) return;
            await tweenValue(PRESENT_RETURN_MS, (t) => {
                if (token !== presentToken) return;
                artifactRoot.rotation.y = amplitude * (1 - t);
            });
            cycle();
        }, delay);
    }
    cycle();
}

export function cancelPresentRotation() {
    presentToken += 1;
    clearTimeout(presentTimer);
}

// ── Tween Utilities ──
export function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

export function tweenValue(duration, onUpdate) {
    return new Promise((resolve) => {
        const start = performance.now();
        function step(now) {
            const t = Math.min((now - start) / duration, 1);
            onUpdate(easeOutCubic(t));
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

export function tweenLightIntensity(light, targetIntensity, duration) {
    const start = light.intensity;
    return tweenValue(duration, (t) => {
        light.intensity = start + (targetIntensity - start) * t;
    });
}

export function tweenMaterialOpacity(material, targetOpacity, duration) {
    const start = material.opacity;
    return tweenValue(duration, (t) => {
        material.opacity = start + (targetOpacity - start) * t;
    });
}

export function tweenArtifactOpacity(materials, targetOpacity, duration) {
    if (!materials.length) return Promise.resolve();
    materials.forEach((mat) => { mat.transparent = true; });
    const startOpacities = materials.map((mat) => mat.opacity);
    return tweenValue(duration, (t) => {
        materials.forEach((mat, i) => {
            mat.opacity = startOpacities[i] + (targetOpacity - startOpacities[i]) * t;
        });
    });
}

export function tweenStagePosition(targetX, duration) {
    const start = stageGroup.position.x;
    return tweenValue(duration, (t) => {
        stageGroup.position.x = start + (targetX - start) * t;
    });
}

export function tweenCameraDistance(targetDistance, duration) {
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    const startDistance = offset.length();
    const direction3 = offset.clone().normalize();
    return tweenValue(duration, (t) => {
        const d = startDistance + (targetDistance - startDistance) * t;
        camera.position.copy(controls.target).addScaledVector(direction3, d);
    });
}

// ── Silhouettes ──
export function createSilhouettes() {
    const group = new THREE.Group();
    const shapeBuilders = [
        () => new THREE.BoxGeometry(0.8, 1.6, 0.8),
        () => new THREE.SphereGeometry(0.6, 12, 12),
        () => new THREE.CylinderGeometry(0.4, 0.4, 1.8, 12),
        () => new THREE.ConeGeometry(0.5, 1.4, 10),
        () => new THREE.BoxGeometry(0.5, 2.2, 0.5),
        () => new THREE.CylinderGeometry(0.3, 0.6, 1.2, 8),
    ];

    const count = 8;
    for (let i = 0; i < count; i++) {
        const geometry = shapeBuilders[i % shapeBuilders.length]();
        const material = new THREE.MeshBasicMaterial({
            color: 0x1a1a18,
            transparent: true,
            opacity: 0.45 + Math.random() * 0.25,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            4 + i * 2.4 + Math.random() * 0.8,
            0.3 + Math.random() * 1.4,
            (Math.random() - 0.5) * 3.5
        );
        mesh.scale.setScalar(0.6 + Math.random() * 0.7);
        mesh.rotation.y = Math.random() * Math.PI;
        group.add(mesh);
    }
    return group;
}

export function disposeGroup(group) {
    group.traverse((node) => {
        if (node.isMesh) {
            node.geometry?.dispose();
            node.material?.dispose();
        }
        if (node.isSprite) {
            node.material?.map?.dispose();
            node.material?.dispose();
        }
    });
}

// ── Inscription Fragments ──
const GLYPH_DRAWERS = [
    (ctx, w, h) => {
        ctx.beginPath();
        ctx.moveTo(30, 90); ctx.quadraticCurveTo(64, 20, 98, 40);
        ctx.quadraticCurveTo(70, 55, 60, 95);
        ctx.stroke();
    },
    (ctx, w, h) => {
        ctx.beginPath();
        ctx.ellipse(64, 64, 38, 18, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(64, 64, 8, 0, Math.PI * 2);
        ctx.fill();
    },
    (ctx, w, h) => {
        ctx.beginPath();
        ctx.moveTo(20, 60);
        ctx.bezierCurveTo(40, 20, 60, 100, 80, 40);
        ctx.bezierCurveTo(90, 15, 100, 70, 112, 50);
        ctx.stroke();
    },
    (ctx, w, h) => {
        ctx.beginPath();
        ctx.moveTo(24, 40); ctx.lineTo(70, 30);
        ctx.moveTo(30, 70); ctx.lineTo(90, 60);
        ctx.moveTo(20, 100); ctx.lineTo(60, 92);
        ctx.stroke();
    },
    (ctx, w, h) => {
        ctx.font = '76px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const letters = ['Α', 'Θ', 'Ξ', 'Σ', 'Φ', 'Ω', 'Λ', 'Δ'];
        ctx.fillText(letters[Math.floor(Math.random() * letters.length)], 64, 68);
    },
];

function makeGlyphCanvas(drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    drawFn(ctx, canvas.width, canvas.height);
    return new THREE.CanvasTexture(canvas);
}

export function createInscriptionFragments() {
    const group = new THREE.Group();
    const count = 14;
    for (let i = 0; i < count; i++) {
        const drawer = GLYPH_DRAWERS[i % GLYPH_DRAWERS.length];
        const texture = makeGlyphCanvas(drawer);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            color: 0xEDE3CF,
        });
        const sprite = new THREE.Sprite(material);
        const scale = 0.5 + Math.random() * 0.6;
        sprite.scale.set(scale, scale, 1);
        sprite.position.set(
            (Math.random() - 0.5) * 9,
            0.2 + Math.random() * 3.2,
            (Math.random() - 0.5) * 3
        );
        sprite.userData.driftY = 0.06 + Math.random() * 0.08;
        sprite.userData.driftX = (Math.random() - 0.5) * 0.05;
        group.add(sprite);
    }
    return group;
}

function driftInscriptionFragments(group, deltaSeconds) {
    group.children.forEach((sprite) => {
        sprite.position.y += sprite.userData.driftY * deltaSeconds;
        sprite.position.x += sprite.userData.driftX * deltaSeconds;
    });
}

export function playInscriptionFragments(group, { holdMs = 1600, fadeInMs = 900, fadeOutMs = 1100 } = {}) {
    return new Promise((resolve) => {
        let last = performance.now();
        const start = last;
        const totalMs = fadeInMs + holdMs + fadeOutMs;

        function step(now) {
            const deltaSeconds = (now - last) / 1000;
            last = now;
            const elapsedMs = now - start;

            driftInscriptionFragments(group, deltaSeconds);

            let opacity;
            if (elapsedMs < fadeInMs) {
                opacity = (elapsedMs / fadeInMs) * 0.16;
            } else if (elapsedMs < fadeInMs + holdMs) {
                opacity = 0.16;
            } else {
                const t = (elapsedMs - fadeInMs - holdMs) / fadeOutMs;
                opacity = 0.16 * (1 - Math.min(t, 1));
            }
            group.children.forEach((sprite) => {
                sprite.material.opacity = opacity;
            });

            if (elapsedMs < totalMs) {
                requestAnimationFrame(step);
            } else {
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

// ── Auto Advance ──
export function scheduleAutoAdvance(isPaused) {
    clearTimeout(autoAdvanceTimer);
    if (isPaused) return;
    const dwell = ARTIFACTS[currentArtifactIndex].direction?.dwellMs ?? EXHIBIT_DWELL_MS;
    autoAdvanceTimer = setTimeout(() => {
        advanceToNextArtifact();
    }, dwell);
}

export function clearAutoAdvance() {
    clearTimeout(autoAdvanceTimer);
}

// ── Advance ──
export async function advanceToNextArtifact() {
    if (isTransitioning) return;
    isTransitioning = true;
    clearTimeout(autoAdvanceTimer);
    clearTimeout(glintTimer);
    goldenGlintLight.intensity = 0;

    const nextIndex = (currentArtifactIndex + 1) % ARTIFACTS.length;
    const nextData = ARTIFACTS[nextIndex];
    const enteringSpace = !!nextData.direction?.spaceMode;
    const leavingSpace = !!ARTIFACTS[currentArtifactIndex].direction?.spaceMode;

    await wait(800);

    const fadeOutDuration = (enteringSpace || leavingSpace) ? SPACE_ENTRY_FADE_MS : nextData.direction.exitDuration;
    hideIdentityPanel();
    await Promise.all([
        tweenArtifactOpacity(artifactMaterials, 0, fadeOutDuration),
        tweenLightIntensity(mainSpot, 0, fadeOutDuration),
        tweenLightIntensity(rimLight, 0, fadeOutDuration),
        tweenLightIntensity(fillLight, 0, fadeOutDuration),
        tweenLightIntensity(ambient, 0, fadeOutDuration),
        tweenMaterialOpacity(beamMaterial, 0, fadeOutDuration),
        tweenMaterialOpacity(lightPool.material, 0, fadeOutDuration),
        tweenMaterialOpacity(starMaterial, 0, fadeOutDuration),
    ]);

    disposeArtifactModel();
    applyDirection(nextData.direction);

    const loadPromise = loadArtifact(nextData, { autoEntrance: false });

    if (enteringSpace) {
        await tweenCameraDistance(
            (nextData.direction.cameraDistance.min + nextData.direction.cameraDistance.max) / 2,
            400
        );
        await wait(BLACKOUT_HOLD_MS);
    } else if (leavingSpace) {
        await tweenCameraDistance(
            (nextData.direction.cameraDistance.min + nextData.direction.cameraDistance.max) / 2,
            400
        );
        await wait(BLACKOUT_HOLD_MS);

        const fragments = createInscriptionFragments();
        scene.add(fragments);
        await playInscriptionFragments(fragments);
        disposeGroup(fragments);
        scene.remove(fragments);
    } else {
        const silhouettes = createSilhouettes();
        stageGroup.add(silhouettes);

        await Promise.all([
            tweenStagePosition(-SWOOSH_DISTANCE, 450),
            tweenCameraDistance(
                (nextData.direction.cameraDistance.min + nextData.direction.cameraDistance.max) / 2,
                450
            ),
        ]);

        stageGroup.position.x = 0;
        disposeGroup(silhouettes);
        stageGroup.remove(silhouettes);
    }

    await loadPromise.catch(() => {});

    currentArtifactIndex = nextIndex;
    updateIdentityPanel(nextData);
    setTestimonyText(nextData.quote);

    await wait(300);

    entranceComplete = false;
    entranceStartTime = performance.now();
    beginIdleRotation(nextData.direction);
    if (nextData.direction.idle === 'present') {
        schedulePresentRotation(nextData.direction);
    }
    scheduleGoldenGlint(nextData.direction);

    const igniteDuration = enteringSpace ? SPACE_ARRIVAL_LIGHT_MS : 700;
    if (nextData.direction.staggeredIgnite) {
        await Promise.all([
            tweenMaterialOpacity(lightPool.material, currentPoolOpacity, 500),
            tweenLightIntensity(ambient, currentAmbientIntensity, 500),
            tweenLightIntensity(fillLight, fillLight.intensity, 500),
        ]);
        await Promise.all([
            tweenLightIntensity(mainSpot, mainSpot.intensity, 1600),
            tweenLightIntensity(rimLight, rimLight.intensity, 1600),
            tweenMaterialOpacity(beamMaterial, currentBeamOpacity, 1600),
            tweenMaterialOpacity(starMaterial, currentStarOpacity, 1600),
        ]);
    } else {
        await Promise.all([
            tweenLightIntensity(mainSpot, mainSpot.intensity, igniteDuration),
            tweenLightIntensity(rimLight, rimLight.intensity, igniteDuration),
            tweenLightIntensity(fillLight, fillLight.intensity, igniteDuration),
            tweenLightIntensity(ambient, currentAmbientIntensity, igniteDuration),
            tweenMaterialOpacity(beamMaterial, currentBeamOpacity, igniteDuration),
            tweenMaterialOpacity(lightPool.material, currentPoolOpacity, igniteDuration),
            tweenMaterialOpacity(starMaterial, currentStarOpacity, igniteDuration),
        ]);
    }

    revealIdentityPanel();
    setTimeout(startTestimony, 600);

    isTransitioning = false;
    entranceStartTime = performance.now();
    if (!window.__vestigeIsPaused) scheduleAutoAdvance(window.__vestigeIsPaused || false);
}

// ── Go To Artifact ──
export async function goToArtifact(targetIndex, isPaused) {
    if (isTransitioning) return;
    isTransitioning = true;
    clearTimeout(autoAdvanceTimer);
    clearTimeout(glintTimer);
    goldenGlintLight.intensity = 0;

    const nextData = ARTIFACTS[targetIndex];
    const enteringSpace = !!nextData.direction?.spaceMode;
    const leavingSpace = !!ARTIFACTS[currentArtifactIndex].direction?.spaceMode;

    await wait(800);

    const fadeOutDuration = (enteringSpace || leavingSpace) ? SPACE_ENTRY_FADE_MS : nextData.direction.exitDuration;
    hideIdentityPanel();
    await Promise.all([
        tweenArtifactOpacity(artifactMaterials, 0, fadeOutDuration),
        tweenLightIntensity(mainSpot, 0, fadeOutDuration),
        tweenLightIntensity(rimLight, 0, fadeOutDuration),
        tweenLightIntensity(fillLight, 0, fadeOutDuration),
        tweenLightIntensity(ambient, 0, fadeOutDuration),
        tweenMaterialOpacity(beamMaterial, 0, fadeOutDuration),
        tweenMaterialOpacity(lightPool.material, 0, fadeOutDuration),
        tweenMaterialOpacity(starMaterial, 0, fadeOutDuration),
    ]);

    disposeArtifactModel();
    applyDirection(nextData.direction);

    const loadPromise = loadArtifact(nextData, { autoEntrance: false });

    if (enteringSpace) {
        await tweenCameraDistance(
            (nextData.direction.cameraDistance.min + nextData.direction.cameraDistance.max) / 2,
            400
        );
        await wait(BLACKOUT_HOLD_MS);
    } else if (leavingSpace) {
        await tweenCameraDistance(
            (nextData.direction.cameraDistance.min + nextData.direction.cameraDistance.max) / 2,
            400
        );
        await wait(BLACKOUT_HOLD_MS);

        const fragments = createInscriptionFragments();
        scene.add(fragments);
        await playInscriptionFragments(fragments);
        disposeGroup(fragments);
        scene.remove(fragments);
    } else {
        const silhouettes = createSilhouettes();
        stageGroup.add(silhouettes);

        await Promise.all([
            tweenStagePosition(-SWOOSH_DISTANCE, 450),
            tweenCameraDistance(
                (nextData.direction.cameraDistance.min + nextData.direction.cameraDistance.max) / 2,
                450
            ),
        ]);

        stageGroup.position.x = 0;
        disposeGroup(silhouettes);
        stageGroup.remove(silhouettes);
    }

    await loadPromise.catch(() => {});

    currentArtifactIndex = targetIndex;
    updateIdentityPanel(nextData);
    setTestimonyText(nextData.quote);

    await wait(300);

    entranceComplete = false;
    entranceStartTime = performance.now();
    beginIdleRotation(nextData.direction);
    if (nextData.direction.idle === 'present') {
        schedulePresentRotation(nextData.direction);
    }
    scheduleGoldenGlint(nextData.direction);

    const igniteDuration = enteringSpace ? SPACE_ARRIVAL_LIGHT_MS : 700;
    if (nextData.direction.staggeredIgnite) {
        await Promise.all([
            tweenMaterialOpacity(lightPool.material, currentPoolOpacity, 500),
            tweenLightIntensity(ambient, currentAmbientIntensity, 500),
            tweenLightIntensity(fillLight, fillLight.intensity, 500),
        ]);
        await Promise.all([
            tweenLightIntensity(mainSpot, mainSpot.intensity, 1600),
            tweenLightIntensity(rimLight, rimLight.intensity, 1600),
            tweenMaterialOpacity(beamMaterial, currentBeamOpacity, 1600),
            tweenMaterialOpacity(starMaterial, currentStarOpacity, 1600),
        ]);
    } else {
        await Promise.all([
            tweenLightIntensity(mainSpot, mainSpot.intensity, igniteDuration),
            tweenLightIntensity(rimLight, rimLight.intensity, igniteDuration),
            tweenLightIntensity(fillLight, fillLight.intensity, igniteDuration),
            tweenLightIntensity(ambient, currentAmbientIntensity, igniteDuration),
            tweenMaterialOpacity(beamMaterial, currentBeamOpacity, igniteDuration),
            tweenMaterialOpacity(lightPool.material, currentPoolOpacity, igniteDuration),
            tweenMaterialOpacity(starMaterial, currentStarOpacity, igniteDuration),
        ]);
    }

    revealIdentityPanel();
    setTimeout(startTestimony, 600);

    isTransitioning = false;
    if (!isPaused) scheduleAutoAdvance(isPaused);
}
