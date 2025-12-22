import * as THREE from "three";

export function createRaycast(camera) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tmp = new THREE.Vector3();

    function updateMouse(ev, dom) {
        const r = dom.getBoundingClientRect();
        mouse.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
        mouse.y = -(((ev.clientY - r.top) / r.height) * 2 - 1);
        raycaster.setFromCamera(mouse, camera);
    }

    function pickPlane(y) {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
        if (!raycaster.ray.intersectPlane(plane, tmp)) return null;
        return tmp.clone();
    }

    return { raycaster, updateMouse, pickPlane };
}
