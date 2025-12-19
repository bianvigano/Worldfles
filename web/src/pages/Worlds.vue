<template>
  <h2>Your Worlds</h2>

  <div style="display:flex; gap:8px; margin-bottom:10px;">
    <input v-model="newName" placeholder="New world name" />
    <button @click="createWorld">Create</button>
    <button @click="refresh">Refresh</button>
  </div>

  <ul>
    <li v-for="w in worlds" :key="w.id" style="margin-bottom:6px;">
      <router-link :to="`/world/${w.id}`">{{ w.name }}</router-link>
      <small style="opacity:.7"> (#{{ w.id }})</small>
    </li>
  </ul>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { api } from "../api";

const worlds = ref([]);
const newName = ref("My World");

async function refresh() {
  const { data } = await api.get("/worlds");
  worlds.value = data.worlds;
}

async function createWorld() {
  const defaultWorld = {
    arr3d: [
      [[0,1,1,1,1]],
      [[1,1,1,1,1]],
      [[1,1,2,1,1]],
      [[1,1,1,1,1]],
      [[1,1,1,1,1]]
    ],
    meta: { blockSize: 16 }
  };

  const { data } = await api.post("/worlds", { name: newName.value, data: defaultWorld });
  location.href = `/world/${data.id}`;
}

onMounted(refresh);
</script>
