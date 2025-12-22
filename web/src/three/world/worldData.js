export function createWorldData() {
    // let arr3d = [];
    function makeFarmland5x5() {
        const arr = Array.from({ length: 5 }, () =>
            Array.from({ length: 1 }, () =>
                Array(5).fill(1)
            )
        );
        arr[2][0][2] = 2; // water tengah
        return arr;
    }

    let arr3d = makeFarmland5x5();
    let worldSize = { W: 5, H: 3, D: 5 };

    function ensure(i, j, k) {
        if (!arr3d[i]) arr3d[i] = [];
        if (!arr3d[i][j]) arr3d[i][j] = [];
        if (arr3d[i][j][k] == null) arr3d[i][j][k] = 0;
    }

    function get(i, j, k) {
        return arr3d[i]?.[j]?.[k] ?? 0;
    }

    function set(i, j, k, t) {
        ensure(i, j, k);
        arr3d[i][j][k] = t;
    }

    function setWorld(newArr) {
        arr3d = newArr;
    }

    function getWorld() {
        return arr3d;
    }

    return {
        get,
        set,
        ensure,
        setWorld,
        getWorld,
        worldSize,
    };
}
