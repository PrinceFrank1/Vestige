// ─────────────────────────────────────────
// UI: Testimony, Identity Panel, Playback Controls, Keyboard, Progress
// ─────────────────────────────────────────

import {
    ARTIFACTS, EXHIBIT_DWELL_MS, BAR_AUTO_HIDE_MS,
} from './config.js';

import {
    currentArtifactIndex, entranceStartTime, isTransitioning,
    scheduleAutoAdvance, advanceToNextArtifact, goToArtifact, clearAutoAdvance,
} from './artifacts.js';

// ── Testimony ──
const testimonyContainer = document.getElementById('testimony');
let wordElements = [];
let testimonyStarted = false;
let currentWordIndex = 0;
let lastWordTime = 0;
let wordInterval = 320;

export function setTestimonyText(text) {
    testimonyContainer.innerHTML = '';
    wordElements = [];
    testimonyStarted = false;
    currentWordIndex = 0;

    text.split(' ').forEach((word) => {
        const span = document.createElement('span');
        span.className = 'testimony-word';
        span.textContent = word;
        testimonyContainer.appendChild(span);
        wordElements.push(span);
    });
}

export function startTestimony() {
    testimonyStarted = true;
    lastWordTime = performance.now();
}

export function updateTestimony(now) {
    if (!testimonyStarted) return;
    if (currentWordIndex >= wordElements.length) return;

    if (now - lastWordTime >= wordInterval) {
        wordElements[currentWordIndex].classList.add('visible');
        currentWordIndex++;
        lastWordTime = now;
    }
}

export function setWordInterval(interval) {
    wordInterval = interval;
}

// ── Identity Panel ──
const titleEl = document.getElementById('title');
const detailPeriodEl = document.getElementById('detail-period');
const detailLocationEl = document.getElementById('detail-location');
const detailDiscoveryEl = document.getElementById('detail-discovery');
const detailMaterialEl = document.getElementById('detail-material');

const DEFAULT_DETAIL_LABELS = ['Period', 'Location', 'Discovery', 'Material'];

function setDetailValue(el, value) {
    el.innerHTML = Array.isArray(value) ? value.join('<br>') : value;
}

export function updateIdentityPanel(artifactData) {
    titleEl.textContent = artifactData.title;

    const labels = artifactData.detailLabels || DEFAULT_DETAIL_LABELS;
    detailPeriodEl.previousElementSibling.textContent = labels[0];
    detailLocationEl.previousElementSibling.textContent = labels[1];
    detailDiscoveryEl.previousElementSibling.textContent = labels[2];
    detailMaterialEl.previousElementSibling.textContent = labels[3];

    setDetailValue(detailPeriodEl, artifactData.period);
    setDetailValue(detailLocationEl, artifactData.location);
    setDetailValue(detailDiscoveryEl, artifactData.discovery);
    setDetailValue(detailMaterialEl, artifactData.material);
}

export function revealIdentityPanel() {
    document.querySelectorAll('.fade-in-up').forEach((el) => {
        el.classList.add('revealed');
    });
}

export function hideIdentityPanel() {
    document.querySelectorAll('.fade-in-up').forEach((el) => {
        el.classList.remove('revealed');
    });
}

// ── Playback Controls ──
let isPaused = false;
let barOpen = false;
let barHideTimer = null;

const playbackTrigger = document.getElementById('playback-trigger');
const playbackBar = document.getElementById('playback-bar');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const progressFill = document.getElementById('progress-fill');

function updatePlayPauseIcon() {
    if (isPaused) {
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
        playbackTrigger.classList.add('paused');
    } else {
        iconPlay.style.display = 'none';
        iconPause.style.display = 'block';
        playbackTrigger.classList.remove('paused');
    }
}

function openBar() {
    barOpen = true;
    playbackBar.classList.add('open');
    playbackTrigger.classList.add('active');
    resetBarHideTimer();
}

function closeBar() {
    barOpen = false;
    playbackBar.classList.remove('open');
    playbackTrigger.classList.remove('active');
    clearTimeout(barHideTimer);
}

function toggleBar() {
    if (barOpen) closeBar();
    else openBar();
}

function resetBarHideTimer() {
    clearTimeout(barHideTimer);
    barHideTimer = setTimeout(() => {
        if (barOpen) closeBar();
    }, BAR_AUTO_HIDE_MS);
}

playbackTrigger.addEventListener('click', toggleBar);

playbackBar.addEventListener('mouseenter', () => {
    clearTimeout(barHideTimer);
});
playbackBar.addEventListener('mouseleave', resetBarHideTimer);

document.getElementById('btn-play-pause').addEventListener('click', () => {
    isPaused = !isPaused;
    window.__vestigeIsPaused = isPaused;
    updatePlayPauseIcon();
    if (isPaused) {
        clearAutoAdvance();
    } else {
        scheduleAutoAdvance(isPaused);
    }
    resetBarHideTimer();
});

document.getElementById('btn-next').addEventListener('click', () => {
    resetBarHideTimer();
    advanceToNextArtifact();
});

document.getElementById('btn-prev').addEventListener('click', () => {
    resetBarHideTimer();
    goToArtifact((currentArtifactIndex - 1 + ARTIFACTS.length) % ARTIFACTS.length, isPaused);
});

document.getElementById('btn-restart').addEventListener('click', () => {
    resetBarHideTimer();
    goToArtifact(currentArtifactIndex, isPaused);
});

// ── Keyboard Shortcuts ──
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
        advanceToNextArtifact();
    } else if (e.key === 'ArrowLeft') {
        goToArtifact((currentArtifactIndex - 1 + ARTIFACTS.length) % ARTIFACTS.length, isPaused);
    } else if (e.key === ' ') {
        e.preventDefault();
        document.getElementById('btn-play-pause').click();
    } else if (e.key === 'r' || e.key === 'R') {
        goToArtifact(currentArtifactIndex, isPaused);
    }
});

// ── Progress Bar ──
export function updateProgress() {
    if (isPaused || isTransitioning) {
        requestAnimationFrame(updateProgress);
        return;
    }
    const artifact = ARTIFACTS[currentArtifactIndex];
    const dwell = artifact.direction?.dwellMs ?? EXHIBIT_DWELL_MS;
    const elapsed = performance.now() - entranceStartTime;
    const progress = Math.min(elapsed / dwell, 1);
    progressFill.style.width = `${progress * 100}%`;
    requestAnimationFrame(updateProgress);
}

// ── Loading Screen ──
export function hideLoading() {
    setTimeout(() => {
        document.getElementById('loading').classList.add('hidden');
    }, 400);
}
