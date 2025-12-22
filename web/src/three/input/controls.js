//mouse + keyboard input controls
export function setupControls({
    dom,
    onMove,
    onDown,
    onUp,
    onKey,
}) {
    dom.addEventListener("pointermove", onMove);
    dom.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);

    return () => {
        dom.removeEventListener("pointermove", onMove);
        dom.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("keydown", onKey);
    };
}
