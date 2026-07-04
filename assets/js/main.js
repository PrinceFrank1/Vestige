// ─────────────────────────────────────────
// MAIN: Animation Loop, Idle Behaviors, Entrance Sequence, Init
// ─────────────────────────────────────────

import * as THREE from 'three';

import {
    BREATHE_AMPLITUDE, BREATHE_PERIOD_MS, DRIFT_ROTATION_SPEED,
    DRIFT_TILT_AMPLITUDE, DRIFT_POSITION_AMPLITUDE,
    IDLE_ROTATE_RESUME_MS,
} from './config.js';

import {
    scene, camera, renderer, controls, artifactRoot, ARTIFACT_ROOT_BASE_Y,
} from './scene.js';

import {
    loadArtifact, entranceComplete, entranceStartTime, artifactMaterials,
    currentArtifactIndex, idleMode, ORBIT_IDLE_MODES,
    applyDirection, beginIdleRotation, scheduleGoldenGlint, schedulePresentRotation,
    scheduleAutoAdvance, setEntranceComplete,
} from './artifacts.js';

import {
    ARTIFACTS,
} from './config.js';

import {
    updateTestimony, setWordInterval, updateIdentityPanel, setTestimonyText,
    revealIdentityPanel, hideIdentityPanel, startTestimony, updateProgress, hideLoading,
} from './ui.js';

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const elapsed = clock.getElapsedTime();

    controls.update();

    if (idleMode === 'breathe') {
        const cycle = (elapsed * 1000) % BREATHE_PERIOD_MS / BREATHE_PERIOD_MS;
        const sway = Math.sin(cycle * Math.PI * 2);
        const eased = Math.sign(sway) * Math.pow(Math.abs(sway), 0.6);
        artifactRoot.rotation.y = eased * BREATHE_AMPLITUDE;
    } else if (idleMode === 'drift') {
        artifactRoot.rotation.y = elapsed * DRIFT_ROTATION_SPEED;
        artifactRoot.rotation.x = Math.sin(elapsed * 0.05) * DRIFT_TILT_AMPLITUDE;
        artifactRoot.position.x = Math.sin(elapsed * 0.033) * DRIFT_POSITION_AMPLITUDE;
        artifactRoot.position.y = ARTIFACT_ROOT_BASE_Y +
            Math.sin(elapsed * 0.021) * DRIFT_POSITION_AMPLITUDE * 0.5;
    }

    const breatheAmplitude = camera.position.distanceTo(controls.target) * 0.003;
    camera.position.y += Math.sin(elapsed * 0.15) * breatheAmplitude;

    if (!entranceComplete && artifactMaterials.length > 0) {
        const artifact = ARTIFACTS[currentArtifactIndex];
        const entranceDuration = artifact.direction?.entranceDuration ?? 2000;
        const entranceProgress = Math.min((now - entranceStartTime) / entranceDuration, 1);
        artifactMaterials.forEach((mat) => {
            mat.opacity = entranceProgress;
        });
        if (entranceProgress >= 1) {
            artifactMaterials.forEach((mat) => {
                mat.transparent = false;
            });
            setEntranceComplete(true);
        }
    }

    updateTestimony(now);
    renderer.render(scene, camera);
}

// ── OrbitControls idle resume ──
let idleResumeTimer = null;
controls.addEventListener('start', () => {
    controls.autoRotate = false;
    clearTimeout(idleResumeTimer);
});
controls.addEventListener('end', () => {
    clearTimeout(idleResumeTimer);
    idleResumeTimer = setTimeout(() => {
        if (ORBIT_IDLE_MODES.has(idleMode)) {
            controls.autoRotate = true;
        }
    }, IDLE_ROTATE_RESUME_MS);
});

// ── Entrance Sequence ──
function startEntrance() {
    const artifact = ARTIFACTS[currentArtifactIndex];
    applyDirection(artifact.direction);
    beginIdleRotation(artifact.direction);
    if (artifact.direction.idle === 'present') {
        schedulePresentRotation(artifact.direction);
    }
    scheduleGoldenGlint(artifact.direction);
    updateIdentityPanel(artifact);
    setTestimonyText(artifact.quote);
    setWordInterval(artifact.direction.wordInterval);

    hideLoading();

    setTimeout(() => {
        revealIdentityPanel();
    }, 800);

    setTimeout(startTestimony, 2500);
    scheduleAutoAdvance(false);
}

// ── Init ──
loadArtifact(ARTIFACTS[0]);
setTimeout(startEntrance, 300);
requestAnimationFrame(updateProgress);
animate();
