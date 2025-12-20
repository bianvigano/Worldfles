// web/src/three/WorldViewer.js
import * as THREE from "three";
import { TEXTURE_URIS } from "./textures";

export function createWorldViewer(containerEl) {
    // =========================
    // GLOBALS
    // =========================
    const SCENE = new THREE.Scene();
    const CAMERA = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
    containerEl.appendChild(renderer.domElement);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const textureLoader = new THREE.TextureLoader();

    let ANGLE = 0;
    let RADIUS = 100;
    let CENTER_Y = 0;
    let ELEVATION = 50;

    const BLOCK_SIZE = 16;

    // mode edit
    let mode = "place"; // "place" | "destroy"
    let placeType = 1;  // 1=ground, 2=water, 3=wheat

    // MULTI-LAYER
    let activeLayer = 0;

    // =========================
    // TEXTURE HELPERS
    // =========================
    function loadTexture(uri, { mirrorX = false } = {}) {
        const tex = textureLoader.load(uri, (t) => {
            t.minFilter = THREE.NearestFilter;
            t.magFilter = THREE.NearestFilter;
            t.generateMipmaps = false;
            t.anisotropy = renderer.capabilities.getMaxAnisotropy();
            t.colorSpace = THREE.SRGBColorSpace;
        });

        if (mirrorX) {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(-1, 1);
        }
        return tex;
    }

    const texture_farmland_dry_Base = loadTexture(TEXTURE_URIS.FARMLAND_DRY_BASE);
    const texture_farmland_dry_Top = loadTexture(TEXTURE_URIS.FARMLAND_DRY_TOP);
    const textureBasewater = loadTexture(TEXTURE_URIS.WATER);
    const textureBasew = loadTexture(TEXTURE_URIS.WHEAT);
    const textureBasewmirro = loadTexture(
        TEXTURE_URIS.WHEAT_MIRROR ?? TEXTURE_URIS.WHEAT,
        { mirrorX: true }
    );

    textureBasewater.wrapS = THREE.RepeatWrapping;
    textureBasewater.wrapT = THREE.RepeatWrapping;

    // =========================
    // MATERIALS
    // =========================
    const groundMaterials = [
        new THREE.MeshBasicMaterial({ map: texture_farmland_dry_Base }),
        new THREE.MeshBasicMaterial({ map: texture_farmland_dry_Base }),
        new THREE.MeshBasicMaterial({ map: texture_farmland_dry_Top }),
        new THREE.MeshBasicMaterial({ map: texture_farmland_dry_Base }),
        new THREE.MeshBasicMaterial({ map: texture_farmland_dry_Base }),
        new THREE.MeshBasicMaterial({ map: texture_farmland_dry_Base }),
    ];

    const waterMaterial = new THREE.MeshStandardMaterial({
        map: textureBasewater,
        transparent: true,
        opacity: 0.78,
        roughness: 0.35,
        metalness: 0,
    });

    // =========================
    // LIGHTS
    // =========================
    function setupLights() {
        SCENE.background = new THREE.Color(0x0b0f14);

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

        SCENE.add(ambient, sun, fill);
    }
    setupLights();

    // =========================
    // WORLD DATA (arr3d)
    // 0=air, 1=ground, 2=water, 3=wheat
    // =========================
    let arr3d = [
        [[1, 1, 1, 1, 1]],
        [[1, 1, 1, 1, 1]],
        [[1, 1, 2, 1, 1]],
        [[1, 1, 1, 1, 1]],
        [[1, 1, 1, 1, 1]]
    ];

    // ukuran world "tetap" supaya kalau kosong masih bisa place
    // minimal: W=5, H=4, D=5 (kamu bisa naikin)
    let worldSize = { W: 5, H: 4, D: 5 };

    // group dunia
    let worldGroup = null;

    // =========================
    // DIM HELPERS
    // =========================
    function computeStructDim(data) {
        const w = data.length || 0;
        const h = Math.max(0, ...data.map(row => Array.isArray(row) ? row.length : 0));
        const d = Math.max(
            0,
            ...data.flatMap(row =>
                (Array.isArray(row) ? row : []).map(subRow => Array.isArray(subRow) ? subRow.length : 0)
            )
        );
        return [w, h, d];
    }

    function syncWorldSizeFromArr() {
        const [w, h, d] = computeStructDim(arr3d);
        worldSize.W = Math.max(worldSize.W, w || 0, 5);
        worldSize.H = Math.max(worldSize.H, h || 0, 1);
        worldSize.D = Math.max(worldSize.D, d || 0, 5);
        activeLayer = clamp(activeLayer, 0, worldSize.H - 1);
    }

    // offset & center (ikut gaya lama kamu)
    function getOffAndCenter() {
        syncWorldSizeFromArr();

        const offset = [0, 0, 0];
        const def_off = [BLOCK_SIZE / 2, BLOCK_SIZE / 2, BLOCK_SIZE / 2];
        const off = [offset[0] + def_off[0], offset[1] + def_off[1], offset[2] + def_off[2]];

        const W = worldSize.W;
        const H = worldSize.H;
        const D = worldSize.D;

        const structCen = [
            (W * BLOCK_SIZE) / 2,
            (H * BLOCK_SIZE) / 2,
            (D * BLOCK_SIZE) / 2,
        ];

        return { off, structCen, W, H, D };
    }

    function clamp(v, a, b) {
        return Math.max(a, Math.min(b, v));
    }

    function ensureCellExists(i, j, k) {
        if (!arr3d[i]) arr3d[i] = [];
        if (!arr3d[i][j]) arr3d[i][j] = [];
        if (arr3d[i][j][k] == null) arr3d[i][j][k] = 0;
    }

    function getBlock(i, j, k) {
        return arr3d[i]?.[j]?.[k] ?? 0;
    }


    function setBlock(i, j, k, t) {
        ensureCellExists(i, j, k);
        if (getBlock(i, j, k) === t) return;
        arr3d[i][j][k] = t;
    }

    // =========================
    // WHEAT
    // =========================
    function makeWheat(i, j, k, off, structCen, H) {
        const wheatGroup = new THREE.Group();

        const wheatGeometryA = new THREE.BoxGeometry(0, 15, 14);
        const wheatGeometryB = new THREE.BoxGeometry(14, 15, 0);

        const wheatMaterialA = [
            new THREE.MeshBasicMaterial({ map: textureBasew, transparent: true }),
            new THREE.MeshBasicMaterial({ map: textureBasewmirro, transparent: true }),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
        ];

        const wheatMaterialB = [
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
            new THREE.MeshBasicMaterial({ map: textureBasew, transparent: true }),
            new THREE.MeshBasicMaterial({ map: textureBasewmirro, transparent: true }),
        ];

        const wheatMesh1 = new THREE.Mesh(wheatGeometryA, wheatMaterialA);
        const wheatMesh12 = new THREE.Mesh(wheatGeometryA, wheatMaterialA);
        const wheatMesh2 = new THREE.Mesh(wheatGeometryB, wheatMaterialB);
        const wheatMesh22 = new THREE.Mesh(wheatGeometryB, wheatMaterialB);

        const baseX = i * BLOCK_SIZE + off[0] - structCen[0];
        const baseY = H * BLOCK_SIZE - j * BLOCK_SIZE + off[1] - structCen[1];
        const baseZ = k * BLOCK_SIZE + off[2] - structCen[2];

        wheatMesh1.position.set(baseX + 4, baseY, baseZ);
        wheatMesh12.position.set(baseX - 4, baseY, baseZ);
        wheatMesh2.position.set(baseX, baseY, baseZ + 4);
        wheatMesh22.position.set(baseX, baseY, baseZ - 4);

        wheatGroup.add(wheatMesh1, wheatMesh12, wheatMesh2, wheatMesh22);
        return wheatGroup;
    }

    // =========================
    // BUILD BLOCKS
    // =========================
    function buildBlocks() {
        const structObj = new THREE.Group();
        const { off, structCen, W, H, D } = getOffAndCenter();

        for (let i = 0; i < W; i++) {
            for (let j = 0; j < H; j++) {
                const subRow = arr3d[i]?.[j] || [];
                for (let k = 0; k < D; k++) {
                    const t = subRow[k] ?? 0;
                    if (t === 0) continue;

                    if (t === 2) {
                        const geom = new THREE.BoxGeometry(BLOCK_SIZE, 15, BLOCK_SIZE);
                        const cube = new THREE.Mesh(geom, waterMaterial);
                        cube.userData = { solid: true, i, j, k };
                        cube.castShadow = true;
                        cube.receiveShadow = true;
                        cube.position.set(
                            i * BLOCK_SIZE + off[0] - structCen[0],
                            H * BLOCK_SIZE - j * BLOCK_SIZE + off[1] - 0.5 - structCen[1],
                            k * BLOCK_SIZE + off[2] - structCen[2]
                        );
                        structObj.add(cube);
                        continue;
                    }

                    if (t === 3) {
                        const wheat = makeWheat(i, j, k, off, structCen, H);
                        wheat.traverse(obj => (obj.userData = { solid: true, i, j, k }));
                        structObj.add(wheat);
                        continue;
                    }

                    // ground
                    const geom = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    const cube = new THREE.Mesh(geom, groundMaterials);
                    cube.userData = { solid: true, i, j, k };
                    cube.castShadow = true;
                    cube.receiveShadow = true;
                    cube.position.set(
                        i * BLOCK_SIZE + off[0] - structCen[0],
                        H * BLOCK_SIZE - j * BLOCK_SIZE + off[1] - structCen[1],
                        k * BLOCK_SIZE + off[2] - structCen[2]
                    );
                    structObj.add(cube);
                }
            }
        }

        return structObj;
    }

    // =========================
    // RED GRID (petunjuk area taruh) — mengikuti ACTIVE LAYER
    // =========================
    function buildRedGrid() {
        const { off, structCen, W, H, D } = getOffAndCenter();

        const mat = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 5 });
        const verts = [];

        // plane y untuk layer aktif (posisi center cell layer itu)
        const y = H * BLOCK_SIZE - activeLayer * BLOCK_SIZE + off[1] - structCen[1];

        // grid dari 0..W dan 0..D mengikuti world size (dipusatkan)
        for (let x = 0; x <= W; x++) {
            const X = x * BLOCK_SIZE + off[0] - structCen[0] - BLOCK_SIZE / 2;
            const z0 = 0 * BLOCK_SIZE + off[2] - structCen[2] - BLOCK_SIZE / 2;
            const z1 = D * BLOCK_SIZE + off[2] - structCen[2] - BLOCK_SIZE / 2;
            verts.push(X, y, z0, X, y, z1);
        }
        for (let z = 0; z <= D; z++) {
            const Z = z * BLOCK_SIZE + off[2] - structCen[2] - BLOCK_SIZE / 2;
            const x0 = 0 * BLOCK_SIZE + off[0] - structCen[0] - BLOCK_SIZE / 2;
            const x1 = W * BLOCK_SIZE + off[0] - structCen[0] - BLOCK_SIZE / 2;
            verts.push(x0, y, Z, x1, y, Z);
        }

        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        const line = new THREE.LineSegments(g, mat);
        line.userData.isGrid = true;
        return line;
    }

    // =========================
    // REBUILD WORLD
    // =========================
    function rebuildWorld() {
        if (worldGroup) SCENE.remove(worldGroup);

        worldGroup = new THREE.Group();
        worldGroup.add(buildBlocks());
        worldGroup.add(buildRedGrid());

        SCENE.add(worldGroup);
    }

    // =========================
    // CAMERA
    // =========================
    function rotateCam(azimuthAngle, elevationAngle, height, radius) {
        const elevationRadians = THREE.MathUtils.degToRad(elevationAngle);
        const azimuthRadians = THREE.MathUtils.degToRad(azimuthAngle);

        const x = radius * Math.cos(elevationRadians) * Math.cos(azimuthRadians);
        const y = radius * Math.sin(elevationRadians);
        const z = radius * Math.cos(elevationRadians) * Math.sin(azimuthRadians);

        CAMERA.position.set(x, y, z);
        CAMERA.lookAt(0, height, 0);
    }

    function setCamera({ angle, elevation, height, radius }) {
        ANGLE = angle ?? ANGLE;
        ELEVATION = elevation ?? ELEVATION;
        CENTER_Y = height ?? CENTER_Y;
        RADIUS = radius ?? RADIUS;
        rotateCam(ANGLE, ELEVATION, CENTER_Y, RADIUS);
    }

    // =========================
    // RAYCAST HELPERS
    // =========================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function getMouseNDC(ev) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
    }

    // hit block solid (bukan grid)
    function raycastSolids() {
        const solids = [];
        worldGroup?.traverse(obj => {
            if (obj.isMesh && obj.userData?.solid) solids.push(obj);
        });

        const hits = raycaster.intersectObjects(solids, true);
        if (!hits.length) return null;

        const hit = hits[0];
        const ud = hit.object.userData;
        return { hit, cell: { i: ud.i, j: ud.j, k: ud.k } };
    }

    // =========================
    // ✅ FALLBACK: ray → plane Y = activeLayer plane
    // =========================
    const tmpPoint = new THREE.Vector3();

    function pickCellFromPlane() {
        const { off, structCen, W, H, D } = getOffAndCenter();

        // plane y untuk layer aktif
        const yPlane = H * BLOCK_SIZE - activeLayer * BLOCK_SIZE + off[1] - structCen[1];
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -yPlane);

        const ok = raycaster.ray.intersectPlane(plane, tmpPoint);
        if (!ok) return null;

        // balik rumus world -> cell:
        // worldX = i*BS + off[0] - cen[0]
        // => i = floor((worldX + cen[0] - off[0]) / BS)
        const i = Math.floor((tmpPoint.x + structCen[0] - off[0]) / BLOCK_SIZE);
        const k = Math.floor((tmpPoint.z + structCen[2] - off[2]) / BLOCK_SIZE);
        const j = activeLayer;

        const ii = clamp(i, 0, W - 1);
        const kk = clamp(k, 0, D - 1);
        return { i: ii, j, k: kk };
    }

    // prevCell untuk PLACE saat hit solid
    function getPrevCellFromHit(hitInfo) {
        const { hit, cell } = hitInfo;
        const n = hit.face?.normal?.clone() || new THREE.Vector3(0, 1, 0);

        const di = Math.round(n.x);
        const dj = Math.round(-n.y); // j kebalik
        const dk = Math.round(n.z);

        return { i: cell.i + di, j: cell.j + dj, k: cell.k + dk };
    }

    // =========================
    // HOVER OUTLINE
    // =========================
    const hoverBox = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)),
        new THREE.LineBasicMaterial({ color: 0x00ff00 })
    );
    hoverBox.visible = false;
    SCENE.add(hoverBox);

    function setHoverToCell(cell) {
        if (!cell) {
            hoverBox.visible = false;
            return;
        }

        const { off, structCen, H } = getOffAndCenter();

        const x = cell.i * BLOCK_SIZE + off[0] - structCen[0];
        const y = H * BLOCK_SIZE - cell.j * BLOCK_SIZE + off[1] - structCen[1];
        const z = cell.k * BLOCK_SIZE + off[2] - structCen[2];

        hoverBox.position.set(x, y, z);
        hoverBox.visible = true;
    }

    // =========================
    // EDIT ACTIONS
    // =========================
    function inBounds(cell) {
        const { W, H, D } = getOffAndCenter();
        return (
            cell &&
            cell.i >= 0 && cell.i < W &&
            cell.j >= 0 && cell.j < H &&
            cell.k >= 0 && cell.k < D
        );
    }

    function tryPlace(cell) {
        if (!inBounds(cell)) return;

        ensureCellExists(cell.i, cell.j, cell.k);
        if (getBlock(cell.i, cell.j, cell.k) !== 0) return; // hanya kosong

        setBlock(cell.i, cell.j, cell.k, placeType, true);
        rebuildWorld();
    }

    function tryDestroy(cell) {
        if (!inBounds(cell)) return;
        ensureCellExists(cell.i, cell.j, cell.k);

        if (getBlock(cell.i, cell.j, cell.k) === 0) return;
        setBlock(cell.i, cell.j, cell.k, 0, true);
        rebuildWorld();
    }

    // =========================
    // INPUT HANDLERS
    // =========================
    let isPointerDown = false;

    function onPointerMove(ev) {
        getMouseNDC(ev);
        raycaster.setFromCamera(mouse, CAMERA);

        const hitInfo = raycastSolids();

        if (mode === "destroy") {
            setHoverToCell(hitInfo?.cell || null);
            if (isPointerDown && hitInfo) {
                tryDestroy(hitInfo.cell);
            }
            return;
        }

        // mode place
        let target = null;
        if (hitInfo) {
            target = getPrevCellFromHit(hitInfo);
        } else {
            target = pickCellFromPlane();
        }

        // kalau multi-layer: pastikan place target selalu di activeLayer (kecuali place nempel block)
        if (target && !hitInfo) target.j = activeLayer;

        setHoverToCell(target);

        if (isPointerDown) {
            // drag place
            if (ev.shiftKey) {
                // shift = destroy cepat
                if (hitInfo) tryDestroy(hitInfo.cell);
            } else {
                if (target) tryPlace(target);
            }
        }
    }

    function onPointerDown(ev) {
        isPointerDown = true;

        getMouseNDC(ev);
        raycaster.setFromCamera(mouse, CAMERA);

        const hitInfo = raycastSolids();

        if (mode === "destroy" || ev.shiftKey) {
            if (hitInfo) tryDestroy(hitInfo.cell);
            return;
        }

        // mode place
        let target = null;
        if (hitInfo) target = getPrevCellFromHit(hitInfo);
        else target = pickCellFromPlane();

        if (target && !hitInfo) target.j = activeLayer;

        tryPlace(target);
    }

    function onPointerUp() {
        isPointerDown = false;
    }

    // keyboard quick controls
    function onKeyDown(e) {
        // brush
        if (e.key === "1") placeType = 1;
        if (e.key === "2") placeType = 2;
        if (e.key === "3") placeType = 3;
        if (e.key.toLowerCase() === "p") mode = "place";
        if (e.key.toLowerCase() === "d") mode = "destroy";

        // layer
        if (e.key === "[") setActiveLayer(activeLayer - 1);
        if (e.key === "]") setActiveLayer(activeLayer + 1);
    }

    function setActiveLayer(y) {
        const { H } = getOffAndCenter();
        activeLayer = clamp(y, 0, H - 1);
        rebuildWorld(); // supaya red grid pindah layer
    }

    // =========================
    // SAVE / LOAD
    // =========================
    function exportWorld() {
        const { W, H, D } = getOffAndCenter();
        const blocks = [];

        for (let i = 0; i < W; i++) {
            for (let j = 0; j < H; j++) {
                const row = arr3d[i]?.[j] || [];
                for (let k = 0; k < D; k++) {
                    const t = row[k] ?? 0;
                    if (t !== 0) blocks.push({ i, j, k, t });
                }
            }
        }

        return {
            version: 1,
            size: { W, H, D },
            blocks,
            camera: { ANGLE, RADIUS, CENTER_Y, ELEVATION },
        };
    }

    function importWorld(data) {
        if (!data?.size) return;

        const W = Math.max(1, data.size.W | 0);
        const H = Math.max(1, data.size.H | 0);
        const D = Math.max(1, data.size.D | 0);

        worldSize = { W, H, D };
        arr3d = Array.from({ length: W }, () =>
            Array.from({ length: H }, () => Array(D).fill(0))
        );

        for (const b of data.blocks || []) {
            if (b.i < 0 || b.i >= W) continue;
            if (b.j < 0 || b.j >= H) continue;
            if (b.k < 0 || b.k >= D) continue;
            arr3d[b.i][b.j][b.k] = b.t;
        }

        if (data.camera) {
            ANGLE = data.camera.ANGLE ?? ANGLE;
            RADIUS = data.camera.RADIUS ?? RADIUS;
            CENTER_Y = data.camera.CENTER_Y ?? CENTER_Y;
            ELEVATION = data.camera.ELEVATION ?? ELEVATION;
        }

        activeLayer = clamp(activeLayer, 0, H - 1);

        rebuildWorld();
        setCamera({ angle: ANGLE, elevation: ELEVATION, height: CENTER_Y, radius: RADIUS });
    }

    // =========================
    // LOOP + RESIZE
    // =========================
    let raf = 0;
    function loop() {
        raf = requestAnimationFrame(loop);
        renderer.render(SCENE, CAMERA);
    }

    function resize() {
        const w = containerEl.clientWidth;
        const h = containerEl.clientHeight;
        CAMERA.aspect = w / h;
        CAMERA.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    // =========================
    // PUBLIC API (Vue)
    // =========================
    return {
        start() {
            resize();
            rebuildWorld();
            setCamera({ angle: ANGLE, elevation: ELEVATION, height: CENTER_Y, radius: RADIUS });
            loop();

            window.addEventListener("resize", resize);
            window.addEventListener("keydown", onKeyDown);
            renderer.domElement.addEventListener("pointermove", onPointerMove);
            renderer.domElement.addEventListener("pointerdown", onPointerDown);
            window.addEventListener("pointerup", onPointerUp);
            renderer.domElement.addEventListener("pointerleave", onPointerUp);
        },
        stop() {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
            window.removeEventListener("keydown", onKeyDown);
            renderer.domElement.removeEventListener("pointermove", onPointerMove);
            renderer.domElement.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointerup", onPointerUp);
            renderer.domElement.removeEventListener("pointerleave", onPointerUp);
            renderer.dispose();
            containerEl.innerHTML = "";
        },

        // world
        setWorld(newArr3d) {
            arr3d = newArr3d;
            rebuildWorld();
        },
        getWorld() {
            return arr3d;
        },

        // camera
        setCamera,

        // edit mode
        setMode(newMode) {
            mode = newMode; // "place" | "destroy"
        },
        setPlaceType(t) {
            placeType = t; // 1|2|3
        },
        setBrush(t) {
            if (t === -1) mode = "destroy";
            else {
                mode = "place";
                placeType = t;
            }
        },

        // layer
        setActiveLayer,
        getActiveLayer() {
            return activeLayer;
        },

        // undo/redo
        // undo,
        // redo,

        // save/load
        exportWorld,
        importWorld,
    };
}