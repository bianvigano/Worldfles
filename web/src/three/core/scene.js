import * as THREE from "three";

export function createScene() {
    const scene = new THREE.Scene();

    // =========================
    // BACKGROUND
    // =========================
    scene.background = new THREE.Color(0x0b0f14);

    // =========================
    // LIGHTS
    // =========================
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);

    const sun = new THREE.DirectionalLight(0xffffff, 1.05);
    sun.position.set(120, 220, 120);
    sun.castShadow = true;

    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 800;

    const s = 220;
    sun.shadow.camera.left = -s;
    sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;
    sun.shadow.camera.bottom = -s;

    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-160, 120, -80);

    scene.add(ambient, sun, fill);

    // =========================
    // OPTIONAL HELPERS (debug)
    // =========================
    function addHelpers() {
        const sunHelper = new THREE.DirectionalLightHelper(sun, 20);
        const shadowHelper = new THREE.CameraHelper(sun.shadow.camera);
        scene.add(sunHelper, shadowHelper);
    }

    return {
        scene,
        lights: { ambient, sun, fill },
        addHelpers, // panggil manual kalau perlu debug
    };
}
