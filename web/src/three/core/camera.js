import * as THREE from "three";

export function createCamera() {
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);

    // 🔥 FLIP VERTIKAL YANG BENAR
    camera.up.set(0, -1, 0);

    let ANGLE = 0;
    let RADIUS = 100;
    let CENTER_Y = 0;
    let ELEVATION = 0;

    function rotate() {
        const e = THREE.MathUtils.degToRad(ELEVATION);
        const a = THREE.MathUtils.degToRad(ANGLE);

        const x = RADIUS * Math.cos(e) * Math.cos(a);
        const y = RADIUS * Math.sin(e);
        const z = RADIUS * Math.cos(e) * Math.sin(a);

        camera.position.set(x, y, z);

        // 🔥 lookAt HARUS ke -CENTER_Y
        camera.lookAt(0, -CENTER_Y, 0);
    }

    function setCamera(opts = {}) {
        ANGLE = opts.angle ?? ANGLE;
        RADIUS = opts.radius ?? RADIUS;
        CENTER_Y = opts.height ?? CENTER_Y;
        ELEVATION = opts.elevation ?? ELEVATION;
        rotate();
    }

    return {
        camera,
        setCamera,
    };
}

