<template>
  <h2>Login / Register</h2>

  <div style="max-width:360px; display:grid; gap:8px;">
    <input v-model="email" placeholder="email" />
    <input v-model="password" type="password" placeholder="password" />

    <div style="display:flex; gap:8px;">
      <button @click="login">Login</button>
      <button @click="register">Register</button>
    </div>

    <div style="color:#b00" v-if="err">{{ err }}</div>
    <div style="font-size:12px; opacity:.7">
      User yang register pertama kali role = user. Untuk bikin admin pertama, update role di SQLite (lihat README).
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { api } from "../api";

const email = ref("admin@example.com");
const password = ref("admin123");
const err = ref("");

async function login() {
  err.value = "";
  try {
    const { data } = await api.post("/auth/login", { email: email.value, password: password.value });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    location.href = "/";
  } catch (e) {
    err.value = e?.response?.data?.error || "Login failed";
  }
}

async function register() {
  err.value = "";
  try {
    const { data } = await api.post("/auth/register", { email: email.value, password: password.value });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    location.href = "/";
  } catch (e) {
    err.value = e?.response?.data?.error || "Register failed";
  }
}
</script>
