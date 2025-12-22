import * as THREE from "three";
import { createTextures } from "../textures";



export function createWorldBuilder({
    BLOCK_SIZE,
    getBlock,
    worldSize,
    activeLayerRef,
}) {

    const textures = createTextures();
    // =========================
    // OFFSET & CENTER
    // =========================
    function getOffAndCenter() {
        const { W, H, D } = worldSize;

        const off = [
            BLOCK_SIZE / 2,
            BLOCK_SIZE / 2,
            BLOCK_SIZE / 2,
        ];

        const structCen = [
            (W * BLOCK_SIZE) / 2,
            (H * BLOCK_SIZE) / 2,
            (D * BLOCK_SIZE) / 2,
        ];

        return { off, structCen, W, H, D };
    }

    // =========================
    // GROUND (FARMLAND)
    // =========================
    function makeGround(i, j, k, off, cen, H) {
        const geo = new THREE.BoxGeometry(
            BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
        );

        const mesh = new THREE.Mesh(geo, [
            textures.groundBase,
            textures.groundBase,
            textures.groundTop,
            textures.groundBase,
            textures.groundBase,
            textures.groundBase,
        ]);

        mesh.position.set(
            i * BLOCK_SIZE + off[0] - cen[0],
            H * BLOCK_SIZE - j * BLOCK_SIZE + off[1] - cen[1],
            k * BLOCK_SIZE + off[2] - cen[2]
        );

        mesh.userData = { solid: true, i, j, k };
        return mesh;
    }

    // =========================
    // WATER
    // =========================
    function makeWater(i, j, k, off, cen, H) {
        const geo = new THREE.BoxGeometry(
            BLOCK_SIZE,
            15,
            BLOCK_SIZE
        );

        const mat = new THREE.MeshStandardMaterial({
            map: textures.water,
            transparent: true,
            opacity: 0.78,
            roughness: 0.35,
            metalness: 0,
        });

        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.set(
            i * BLOCK_SIZE + off[0] - cen[0],
            H * BLOCK_SIZE - j * BLOCK_SIZE + off[1] - cen[1],
            k * BLOCK_SIZE + off[2] - cen[2]
        );

        mesh.userData = { solid: true, i, j, k };
        return mesh;
    }

    // =========================
    // WHEAT (OVERLAY)
    // =========================
    function makeWheat(i, j, k, off, cen, H) {
        const group = new THREE.Group();

        const geoA = new THREE.BoxGeometry(0, 15, 14);
        const geoB = new THREE.BoxGeometry(14, 15, 0);

        const matA = [
            new THREE.MeshBasicMaterial({ map: textures.wheat, transparent: true }),
            new THREE.MeshBasicMaterial({ map: textures.wheatMirror, transparent: true }),
            ...Array(4).fill(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
        ];

        const matB = [
            ...Array(4).fill(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            new THREE.MeshBasicMaterial({ map: textures.wheat, transparent: true }),
            new THREE.MeshBasicMaterial({ map: textures.wheatMirror, transparent: true }),
        ];

        const m1 = new THREE.Mesh(geoA, matA);
        const m2 = new THREE.Mesh(geoA, matA);
        const m3 = new THREE.Mesh(geoB, matB);
        const m4 = new THREE.Mesh(geoB, matB);

        const x = i * BLOCK_SIZE + off[0] - cen[0];
        const z = k * BLOCK_SIZE + off[2] - cen[2];

        const topY =
            H * BLOCK_SIZE -
            j * BLOCK_SIZE +
            off[1] -
            cen[1] +
            BLOCK_SIZE / 2;

        const y = topY + 0.01;

        m1.position.set(x + 4, y, z);
        m2.position.set(x - 4, y, z);
        m3.position.set(x, y, z + 4);
        m4.position.set(x, y, z - 4);

        group.add(m1, m2, m3, m4);
        return group;
    }

    // =========================
    // BUILD BLOCKS
    // =========================
    function buildBlocks() {
        const g = new THREE.Group();
        const { off, structCen, W, H, D } = getOffAndCenter();

        for (let i = 0; i < W; i++) {
            for (let j = 0; j < H; j++) {
                for (let k = 0; k < D; k++) {
                    const t = getBlock(i, j, k);
                    if (!t) continue;

                    if (t === 1) {
                        g.add(makeGround(i, j, k, off, structCen, H));
                    } else if (t === 2) {
                        g.add(makeWater(i, j, k, off, structCen, H));
                    } else if (t === 3) {
                        g.add(makeWheat(i, j, k, off, structCen, H));
                    }
                }
            }
        }
        return g;
    }

    // =========================
    // RED GRID
    // =========================
    function buildRedGrid() {
        const { off, structCen, W, H, D } = getOffAndCenter();

        const mat = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 5 });
        const verts = [];
        const j = activeLayerRef.value;
        // plane y untuk layer aktif (posisi center cell layer itu)
        const y = H * BLOCK_SIZE - j * BLOCK_SIZE + off[1] - structCen[1];

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

    return { buildBlocks, buildRedGrid };
}
