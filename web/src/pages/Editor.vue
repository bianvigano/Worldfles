<template>
  <div class="page">
    <div ref="viewer" class="viewer"></div>

    <div class="panel">
      <!-- BRUSH -->
      <div class="brushRow">
        <button class="brushBtn" :class="{active: brush===1}" @click="setBrush(1)">🟫 Ground</button>
        <button class="brushBtn" :class="{active: brush===2}" @click="setBrush(2)">🟦 Water</button>
        <button class="brushBtn" :class="{active: brush===3}" @click="setBrush(3)">🌾 Wheat</button>
        <button class="brushBtn danger" :class="{active: brush===0}" @click="setBrush(0)">💥 Destroy</button>
      </div>

      <div class="hint">
        Drag untuk taruh. <b>Destroy</b> untuk hapus. (Shift = erase cepat)
      </div>

      <!-- LAYER -->
      <div class="miniRow">
        <button class="miniBtn" @click="layerDown">Y -</button>
        <div class="layerInfo">Layer Y: <b>{{ activeY }}</b></div>
        <button class="miniBtn" @click="layerUp">Y +</button>
      </div>

      <!-- SAVE LOAD -->
      <div class="miniRow">
        <button class="miniBtn" @click="saveLocal">💾 Save Local</button>
        <button class="miniBtn" @click="loadLocal">📥 Load Local</button>
      </div>

      <!-- CAMERA -->
      <div class="row">
        <label>Angle</label>
        <input class="slider" type="range" min="-360" max="360"
               v-model.number="angle" @input="applyCam" />
        <input class="num" type="number"
               v-model.number="angle" @change="applyCam" />
      </div>

      <div class="row">
        <label>Distance</label>
        <input class="slider" type="range" min="1" max="400"
               v-model.number="radius" @input="applyCam" />
        <input class="num" type="number"
               v-model.number="radius" @change="applyCam" />
      </div>

      <div class="row">
        <label>Height</label>
        <input class="slider" type="range" min="-128" max="128"
               v-model.number="height" @input="applyCam" />
        <input class="num" type="number"
               v-model.number="height" @change="applyCam" />
      </div>

      <div class="row">
        <label>Elevation</label>
        <input class="slider" type="range" min="-90" max="90"
               v-model.number="elevation" @input="applyCam" />
        <input class="num" type="number"
               v-model.number="elevation" @change="applyCam" />
      </div>

      <button class="btn" @click="resetCam">Reset Camera</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { createWorldViewer } from "../three/WorldViewer.js";

const viewer = ref(null);
let app = null;

// camera
const angle = ref(0);
const radius = ref(100);
const height = ref(0);
const elevation = ref(0);

// brush
const brush = ref(1); // 1 ground, 2 water, 3 wheat, -1 destroy

// layer
const activeY = ref(0);

function applyCam() {
  app?.setCamera({
    angle: angle.value,
    radius: radius.value,
    height: height.value,
    elevation: elevation.value,
  });
}

function resetCam() {
  angle.value = 0;
  radius.value = 100;
  height.value = 0;
  elevation.value = 0;
  applyCam();
}

function setBrush(t) {
  brush.value = t;
  app?.setBrush(t);
}

function layerUp() {
  activeY.value++;
  app?.setActiveLayer(activeY.value);
}
function layerDown() {
  activeY.value = Math.max(0, activeY.value - 1);
  app?.setActiveLayer(activeY.value);
}

// SAVE / LOAD
function saveLocal() {
  const data = app?.exportWorld();
  if (!data) return;
  localStorage.setItem("world:last", JSON.stringify(data));
  alert("Saved to LocalStorage ✅");
}

function loadLocal() {
  const raw = localStorage.getItem("world:last");
  if (!raw) return alert("Belum ada save local.");
  app?.importWorld(JSON.parse(raw));
  activeY.value = app?.getActiveLayer() ?? 0;
}

onMounted(() => {
  app = createWorldViewer(viewer.value);
  app.start();
  setBrush(brush.value);
  app.setActiveLayer(activeY.value);
  applyCam();
});

onBeforeUnmount(() => app?.stop());
</script>


<style scoped>
.page { width: 100vw; height: 100vh; overflow: hidden; }
.viewer { width: 100%; height: 100%; }

.panel{
  position: fixed;
  top: 70px;
  left: 10px;
  z-index: 9999;
  background: rgba(255,255,255,0.92);
  padding: 12px;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.18);
  width: 380px;
}

.brushRow{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}
.brushBtn{
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.15);
  background: white;
  font-weight: 700;
}
.brushBtn.active{ outline: 2px solid rgba(0,0,0,0.55); }
.brushBtn.danger{ border-color: rgba(220,0,0,0.25); }
.brushBtn.danger.active{ outline: 2px solid rgba(220,0,0,0.65); }

.hint{ font-size: 12px; opacity: 0.8; margin-bottom: 10px; }

.miniRow{
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.miniBtn{
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.15);
  background: #fff;
  cursor: pointer;
  font-weight: 700;
}
.layerInfo{ flex: 1; font-size: 13px; }

.row{
  display: grid;
  grid-template-columns: 80px 1fr 70px;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
label{ font-size: 14px; white-space: nowrap; }
.slider{ width: 100%; }
.num{ width: 70px; }

.btn{
  width: 100%;
  margin-top: 4px;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.15);
  background: #fff;
  font-weight: 800;
}
</style>
