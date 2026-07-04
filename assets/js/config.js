// ─────────────────────────────────────────
// CONFIG: Artifact Data & Direction Choreography
// ─────────────────────────────────────────

export const ARTIFACTS = [
    {
        title: "Triceratops Horridus",
        file: "triceratops.glb",
        period: "Late Cretaceous, 68–66 MYA",
        location: "Hell Creek Formation, Montana",
        discovery: "1887, by John Bell Hatcher",
        material: "Fossilized bone, mineralized tissue",
        quote: "I remember forests that no map ever drew.",
        transform: {
            scale: 1,
            rotation: [0, 0, 0],
            position: [0, 0, 0],
        },
        direction: {
            idle: 'orbit',
            spotlight: {
                angle: Math.PI / 5,
                penumbra: 0.65,
                intensity: 160,
            },
            cameraDistance: { min: 2.8, max: 5.5 },
            wordInterval: 320,
            entranceDuration: 2000,
            exitDuration: 400,
            dwellMs: 17000,
        },
    },
    {
        title: "Benin Bronze Plaque",
        file: "three_benin.glb",
        period: "16th–17th Century",
        location: "Kingdom of Benin, present-day Nigeria",
        discovery: "Removed 1897, British Punitive Expedition",
        material: "Cast bronze, leaded",
        quote: "I remember the hands that shaped me, and the ones that took me.",
        transform: {
            scale: 1.15,
            rotation: [0, Math.PI / 10, 0],
            position: [0, 0.15, 0],
        },
        direction: {
            idle: 'breathe',
            spotlight: {
                angle: Math.PI / 10,
                penumbra: 0.35,
                intensity: 220,
            },
            cameraDistance: { min: 3.2, max: 4.2 },
            wordInterval: 380,
            entranceDuration: 2600,
            exitDuration: 400,
        },
    },
    {
        title: "Terracotta Warrior",
        file: "terracotta.glb",
        period: "Qin Dynasty, 210–209 BCE",
        location: "Xi'an, Shaanxi, China",
        discovery: "1974, by local farmers",
        material: "Fired terracotta with original pigment traces",
        quote: "I stood guard long after the emperor fell.",
        transform: {
            scale: 1,
            rotation: [0, 0, 0],
            position: [0, 0, 0],
        },
        direction: {
            idle: 'still-then-orbit',
            idleStartDelayMs: 2000,
            autoRotateSpeed: 0.08,
            spotlight: {
                angle: Math.PI / 9,
                penumbra: 0.4,
                intensity: 190,
                color: 0xE7EEF7,
            },
            cameraDistance: { min: 3.2, max: 5.6 },
            cameraTargetY: 1.55,
            poolOpacity: 0.5,
            wordInterval: 340,
            entranceDuration: 2400,
            exitDuration: 400,
        },
    },
    {
        title: "Voyager 1",
        file: "voyager-1.glb",
        period: "Launched 1977",
        location: "Interstellar Space",
        discovery: "NASA Deep Space Exploration",
        material: [
            "Gold-plated components",
            "Scientific instruments",
            "Radioisotope power source",
        ],
        detailLabels: ['Period', 'Location', 'Mission', 'Material'],
        quote: "I carry voices from a world already behind me.",
        transform: {
            scale: 1,
            rotation: [0, 0, 0],
            position: [0, 0, 0],
        },
        direction: {
            idle: 'drift',
            spaceMode: true,
            spotlight: {
                angle: Math.PI / 9,
                penumbra: 0.4,
                intensity: 0,
            },
            rimLight: {
                intensity: 9,
                color: 0xC7DBFF,
                position: [7, 5.5, 5],
                angle: Math.PI / 5,
                penumbra: 0.55,
                distance: 60,
                decay: 1.3,
            },
            fillLight: {
                intensity: 0.12,
                color: 0x8FA6CC,
            },
            ambientIntensity: 0.05,
            envMapIntensity: 1.4,
            poolOpacity: 0,
            beamOpacity: 0,
            starOpacity: 0.4,
            cameraDistance: { min: 6.5, max: 11 },
            cameraTargetY: 0.8,
            wordInterval: 460,
            entranceDuration: 4200,
            exitDuration: 1000,
            dwellMs: 20000,
            goldenGlintDelayMs: 8000,
        },
    },
    {
        title: "The Rosetta Stone",
        file: "rosetta.glb",
        period: "196 BCE",
        location: [
            "Originally: Memphis, Egypt",
            "Currently: British Museum, London",
        ],
        discovery: [
            "Discovered in 1799",
            "Fort Julien, Rashid (Rosetta)",
        ],
        material: "Granodiorite",
        quote: "I carried three voices until humanity learned to hear one.",
        transform: {
            scale: 1,
            rotation: [0, 0, 0],
            position: [0, 0, 0],
            targetSize: 1.4,
        },
        direction: {
            idle: 'present',
            presentRotationDeg: 8,
            presentIntervalMinMs: 12000,
            presentIntervalMaxMs: 15000,
            spotlight: {
                angle: Math.PI / 7,
                penumbra: 0.5,
                intensity: 200,
                color: 0xFFF3E0,
            },
            staggeredIgnite: true,
            rimLight: {
                intensity: 8,
            },
            fillLight: {
                intensity: 0.18,
            },
            poolOpacity: 0.5,
            cameraDistance: { min: 2.6, max: 3.8 },
            cameraTargetY: 1.35,
            wordInterval: 420,
            entranceDuration: 3000,
            exitDuration: 900,
            dwellMs: 18000,
        },
    },
];

export const ARTIFACT_BASE_PATH = './artifacts/';
export const DEFAULT_TARGET_ARTIFACT_SIZE = 2.5;
export const EXHIBIT_DWELL_MS = 14000;
export const SWOOSH_DISTANCE = 22;
export const IDLE_ROTATE_RESUME_MS = 3000;
export const SPACE_ENTRY_FADE_MS = 1400;
export const BLACKOUT_HOLD_MS = 1000;
export const SPACE_ARRIVAL_LIGHT_MS = 3200;

export const DEFAULT_SPOT_COLOR = 0xFFF8F0;
export const DEFAULT_AUTOROTATE_SPEED = 0.35;
export const DEFAULT_CAMERA_TARGET_Y = 1.3;
export const DEFAULT_FILL_COLOR = 0xE8E0D8;
export const DEFAULT_FILL_INTENSITY = 0.15;
export const DEFAULT_RIM_COLOR = 0xFFF5E8;
export const DEFAULT_RIM_INTENSITY = 12;
export const DEFAULT_RIM_POSITION = [4, 3, -4];
export const DEFAULT_RIM_ANGLE = Math.PI / 8;
export const DEFAULT_RIM_PENUMBRA = 0.8;
export const DEFAULT_RIM_DISTANCE = 15;
export const DEFAULT_RIM_DECAY = 2;
export const DEFAULT_AMBIENT_INTENSITY = 0.3;

export const LIGHT_POOL_OPACITY = 0.35;
export const BEAM_OPACITY = 0.035;
export const BREATHE_AMPLITUDE = Math.PI / 18;
export const BREATHE_PERIOD_MS = 16000;
export const DRIFT_ROTATION_SPEED = 0.008;
export const DRIFT_TILT_AMPLITUDE = 0.035;
export const DRIFT_POSITION_AMPLITUDE = 0.035;
export const GOLDEN_GLINT_INTENSITY = 3.5;
export const PRESENT_ROTATE_IN_MS = 900;
export const PRESENT_HOLD_MS = 900;
export const PRESENT_RETURN_MS = 1600;
export const STAR_COUNT = 42;
export const BAR_AUTO_HIDE_MS = 3000;
