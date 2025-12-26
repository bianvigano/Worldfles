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

        const groundMaterials = [
            new THREE.MeshBasicMaterial({ map: textures.groundBase }),
            new THREE.MeshBasicMaterial({ map: textures.groundBase }),
            new THREE.MeshBasicMaterial({ map: textures.groundBase }),
            new THREE.MeshBasicMaterial({ map: textures.groundTop }),
            new THREE.MeshBasicMaterial({ map: textures.groundBase }),
            new THREE.MeshBasicMaterial({ map: textures.groundBase }),
        ];

        const mesh = new THREE.Mesh(geo, groundMaterials);

        mesh.position.set(
            i * BLOCK_SIZE + off[0] - cen[0],
            H * BLOCK_SIZE - j * BLOCK_SIZE + off[1] - cen[1],
            k * BLOCK_SIZE + off[2] - cen[2]
        );
        // mesh.userData = { solid: true, i, j, k };
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.userData = { solid: true, i, j, k };
        return mesh;
    }

    // =========================
    // WATER
    // =========================
    function makeWater(i, j, k, off, cen, H) {
        const geo = new THREE.BoxGeometry(
            BLOCK_SIZE,
            14,
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

        // =====================================================
        // 🔧 CONFIG UTAMA – UBAH DI SINI SAJA
        // =====================================================
        const CONFIG = {
            // Ukuran satu batang gandum
            HEIGHT: 15,      // tinggi plane
            WIDTH: 15,       // lebar plane

            // Posisi vertikal
            SINK: 16,         // seberapa dalam masuk ke tanah
            Y_OFFSET: 2,      // offset tambahan ke atas

            // Material behavior
            alphaTest: 0.3,   // potong alpha (hindari transparansi blur)
            depthWrite: false, // cegah depth glitch antar daun

            // Posisi & rotasi tiap plane (relatif ke tengah)
            // x,z = offset posisi
            // rx, ry = rotasi (radian)
            PLANES: [
                { x: 4, z: 0, ry: Math.PI / 2, rx: Math.PI }, // kanan
                { x: -4, z: 0, ry: Math.PI / 2, rx: Math.PI }, // kiri
                { x: 0, z: -6, ry: Math.PI, rx: Math.PI }, // depan
                { x: 0, z: 6, ry: Math.PI, rx: Math.PI }, // belakang
            ]
        };

        // =====================================================
        // 📐 GEOMETRY & MATERIAL
        // =====================================================
        const geo = new THREE.PlaneGeometry(CONFIG.WIDTH, CONFIG.HEIGHT);

        const mat = new THREE.MeshBasicMaterial({
            map: textures.wheat,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: CONFIG.alphaTest,
            depthWrite: CONFIG.depthWrite,
        });

        // =====================================================
        // 🌍 POSISI WORLD
        // =====================================================
        const x = i * BLOCK_SIZE + off[0] - cen[0];
        const z = k * BLOCK_SIZE + off[2] - cen[2];

        const groundTopY =
            H * BLOCK_SIZE -
            j * BLOCK_SIZE +
            off[1] -
            cen[1] +
            BLOCK_SIZE / 2;

        const baseY =
            groundTopY -
            CONFIG.SINK +
            CONFIG.HEIGHT / 2 +
            CONFIG.Y_OFFSET;

        const group = new THREE.Group();

        // =====================================================
        // 🌾 BUAT PLANE GANDUM
        // =====================================================
        CONFIG.PLANES.forEach(p => {
            const mesh = new THREE.Mesh(geo, mat);

            mesh.position.set(
                x + p.x,
                baseY,
                z + p.z
            );

            mesh.rotation.set(p.rx, p.ry, 0);

            group.add(mesh);
        });

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
