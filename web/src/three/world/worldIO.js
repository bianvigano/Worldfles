export function createWorldIO({ getWorld, setWorld, worldSize, camera }) {
    function exportWorld() {
        const blocks = [];
        const arr = getWorld();

        for (let i = 0; i < worldSize.W; i++) {
            for (let j = 0; j < worldSize.H; j++) {
                for (let k = 0; k < worldSize.D; k++) {
                    const t = arr[i]?.[j]?.[k] ?? 0;
                    if (t) blocks.push({ i, j, k, t });
                }
            }
        }

        return {
            size: worldSize,
            blocks,
            camera,
        };
    }

    // function importWorld(data) {
    //     const { W, H, D } = data.size;
    //     const arr = Array.from({ length: W }, () =>
    //         Array.from({ length: H }, () => Array(D).fill(0))
    //     );

    //     for (const b of data.blocks) {
    //         arr[b.i][b.j][b.k] = b.t;
    //     }
    //     setWorld(arr);
    // }

    function importWorld(data) {
        if (!data?.size) return;

        // restore world
        world.worldSize.W = data.size.W;
        world.worldSize.H = data.size.H;
        world.worldSize.D = data.size.D;

        const arr = Array.from({ length: data.size.W }, () =>
            Array.from({ length: data.size.H }, () =>
                Array(data.size.D).fill(0)
            )
        );

        for (const b of data.blocks || []) {
            arr[b.i][b.j][b.k] = b.t;
        }

        world.setWorld(arr);

        // ✅ INI TEMPAT YANG BENAR
        if (data.camera) {
            setCamera({
                angle: data.camera.ANGLE,
                elevation: data.camera.ELEVATION,
                height: data.camera.CENTER_Y,
                radius: data.camera.RADIUS,
            });
        }

        rebuildWorld();
    }


    return { exportWorld, importWorld };
}
