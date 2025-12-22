import * as THREE from "three";
import { createWorldData } from "./world/worldData";
import { createWorldBuilder } from "./world/worldBuilder";
import { clamp } from "./utils/math";

import { createRenderer } from "./core/renderer";
import { createScene } from "./core/scene";
import { createCamera } from "./core/camera";

export function createWorldViewer(containerEl, textures, BLOCK_SIZE = 16) {
    if (!containerEl) {
        throw new Error("createWorldViewer: containerEl is required");
    }

    // =========================
    // CORE SETUP
    // =========================
    const { scene } = createScene();
    const { camera, setCamera } = createCamera();
    const { renderer, resize } = createRenderer(containerEl);

    // =========================
    // WORLD DATA
    // =========================
    const world = createWorldData();

    let activeLayer = 0;

    // =========================
    // BUILDER
    // =========================
    const builder = createWorldBuilder({
        BLOCK_SIZE,
        textures,
        getBlock: world.get,
        worldSize: world.worldSize,
        activeLayerRef: {
            get value() {
                return activeLayer;
            },
        },
    });

    console.log("WorldViewer created", { world, builder });
    console.log("Initial world data:", world.getWorld());

    // =========================
    // STATE
    // =========================
    let worldGroup = null;
    let mode = "place";
    let placeType = 1;

    // =========================
    // HOVER
    // =========================
    let hoverMesh = null;

    function createHoverMesh() {
        const geo = new THREE.BoxGeometry(
            BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
        );

        const mat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
        });

        hoverMesh = new THREE.Mesh(geo, mat);
        hoverMesh.visible = false;
        hoverMesh.renderOrder = 999;
        scene.add(hoverMesh);
    }

    function setHoverToCell(cell) {
        if (!hoverMesh) return;

        if (!cell) {
            hoverMesh.visible = false;
            return;
        }

        const { off, structCen, H } = getOffAndCenter();

        hoverMesh.position.set(
            cell.i * BLOCK_SIZE + off[0] - structCen[0],
            H * BLOCK_SIZE - cell.j * BLOCK_SIZE + off[1] - structCen[1],
            cell.k * BLOCK_SIZE + off[2] - structCen[2]
        );

        hoverMesh.visible = true;
    }

    // =========================
    // OFFSET
    // =========================
    function getOffAndCenter() {
        const { W, H, D } = world.worldSize;

        return {
            off: [BLOCK_SIZE / 2, BLOCK_SIZE / 2, BLOCK_SIZE / 2],
            structCen: [
                (W * BLOCK_SIZE) / 2,
                (H * BLOCK_SIZE) / 2,
                (D * BLOCK_SIZE) / 2,
            ],
            W,
            H,
            D,
        };
    }

    // =========================
    // BUILD
    // =========================
    function rebuildWorld() {
        if (worldGroup) scene.remove(worldGroup);

        worldGroup = new THREE.Group();
        worldGroup.add(builder.buildBlocks());
        worldGroup.add(builder.buildRedGrid());

        scene.add(worldGroup);
    }

    // =========================
    // PLACE / DESTROY
    // =========================
    function tryPlace(cell) {
        if (!cell) return;

        const { i, j, k } = cell;
        const { H } = world.worldSize;

        if (j < 0 || j >= H) return;
        if (world.get(i, j, k) !== 0) return;

        if (placeType === 1) world.set(i, j, k, 1);
        if (placeType === 2 && j > 0 && world.get(i, j - 1, k) === 1)
            world.set(i, j, k, 2);
        if (placeType === 3 && j > 0 && world.get(i, j - 1, k) === 1)
            world.set(i, j, k, 3);

        rebuildWorld();
    }

    function tryDestroy(cell) {
        if (!cell) return;
        world.set(cell.i, cell.j, cell.k, 0);
        rebuildWorld();
    }

    // =========================
    // RAYCAST
    // =========================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tmpPoint = new THREE.Vector3();

    function raycastSolids() {
        const hits = raycaster.intersectObjects(scene.children, true);
        for (const h of hits) {
            if (h.object.userData?.solid) {
                return {
                    hit: h,
                    cell: h.object.userData,
                };
            }
        }
        return null;
    }

    function getMouseNDC(ev) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function pickCellFromPlane() {
        const { off, structCen, H, W, D } = getOffAndCenter();

        const yPlane =
            H * BLOCK_SIZE -
            activeLayer * BLOCK_SIZE +
            off[1] -
            structCen[1];

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -yPlane);
        if (!raycaster.ray.intersectPlane(plane, tmpPoint)) return null;

        return {
            i: clamp(
                Math.floor((tmpPoint.x + structCen[0] - off[0]) / BLOCK_SIZE),
                0,
                W - 1
            ),
            j: activeLayer,
            k: clamp(
                Math.floor((tmpPoint.z + structCen[2] - off[2]) / BLOCK_SIZE),
                0,
                D - 1
            ),
        };
    }

    // =========================
    // INPUT
    // =========================
    let isDown = false;

    function onMove(ev) {
        getMouseNDC(ev);
        raycaster.setFromCamera(mouse, camera);

        const hit = raycastSolids();
        const target = hit ? hit.cell : pickCellFromPlane();

        setHoverToCell(target);

        if (isDown && target) tryPlace(target);
    }

    function onDown(ev) {
        isDown = true;
        getMouseNDC(ev);
        raycaster.setFromCamera(mouse, camera);

        const hit = raycastSolids();
        const target = hit ? hit.cell : pickCellFromPlane();

        if (target) tryPlace(target);
    }

    function onUp() {
        isDown = false;
    }

    // =========================
    // LOOP
    // =========================
    function loop() {
        renderer.render(scene, camera);
        requestAnimationFrame(loop);
    }

    // =========================
    // PUBLIC API
    // =========================
    function start() {
        resize(camera);
        setCamera({});
        createHoverMesh();
        rebuildWorld();
        loop();

        renderer.domElement.addEventListener("pointermove", onMove);
        renderer.domElement.addEventListener("pointerdown", onDown);
        window.addEventListener("pointerup", onUp);
    }

    return {
        start,

        // 🔥 TAMBAHKAN INI
        setCamera,

        setBrush: (t) => (placeType = t),
        setActiveLayer: (l) =>
            (activeLayer = clamp(l, 0, world.worldSize.H - 1)),
    };
}
