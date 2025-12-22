import * as THREE from "three";

export function createCamera() {
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);

    // =========================
    // STATE (SAMA DENGAN KODE LAMA)
    // =========================
    let ANGLE = 0;       // azimuth (deg)
    let RADIUS = 100;    // jarak kamera
    let CENTER_Y = 0;    // lookAt Y
    let ELEVATION = 50;  // elevasi (deg)

    // =========================
    // CORE ROTATION (LEGACY MATCH)
    // =========================
    function rotateCam(angle, elevation, height, radius) {
        const e = THREE.MathUtils.degToRad(elevation);
        const a = THREE.MathUtils.degToRad(angle);

        const x = radius * Math.cos(e) * Math.cos(a);
        const y = radius * Math.sin(e);
        const z = radius * Math.cos(e) * Math.sin(a);

        camera.position.set(x, y, z);
        camera.lookAt(0, height, 0);
    }

    // =========================
    // SAFE SETTER
    // =========================
    function setCamera(opts = {}) {
        ANGLE = opts.angle ?? ANGLE;
        RADIUS = opts.radius ?? RADIUS;
        CENTER_Y = opts.height ?? CENTER_Y;
        ELEVATION = opts.elevation ?? ELEVATION;

        // clamp supaya kamera tidak flip
        ELEVATION = THREE.MathUtils.clamp(ELEVATION, -89, 89);

        rotateCam(ANGLE, ELEVATION, CENTER_Y, RADIUS);
    }

    // =========================
    // INITIAL POSITION
    // =========================
    rotateCam(ANGLE, ELEVATION, CENTER_Y, RADIUS);

    return {
        camera,

        // public API
        setCamera,

        // legacy-compatible state
        getState() {
            return {
                ANGLE,
                RADIUS,
                CENTER_Y,
                ELEVATION,
            };
        },

        // optional (kalau mau kontrol manual)
        rotateCam,
    };
}
