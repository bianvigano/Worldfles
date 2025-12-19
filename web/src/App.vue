<template>
  <div style="padding:12px; font-family: Arial;">
    <div style="display:flex; gap:10px; align-items:center; margin-bottom:12px;">
      <router-link to="/">Worlds</router-link>
      <router-link to="/admin" v-if="user?.role==='admin'">Admin</router-link>
      <span style="margin-left:auto;"></span>
      <span v-if="user">{{ user.email }} ({{ user.role }})</span>
      <button v-if="user" @click="logout">Logout</button>
    </div>
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const user = ref(null);

onMounted(() => {
  try { user.value = JSON.parse(localStorage.getItem("user") || "null"); } catch {}
});

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  location.href = "/login";
}
</script>
