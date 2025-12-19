<template>
  <h2>Admin</h2>
  <button @click="refresh">Refresh Users</button>

  <table border="1" cellpadding="6" style="margin-top:10px; border-collapse: collapse;">
    <thead>
      <tr><th>ID</th><th>Email</th><th>Role</th><th>Action</th></tr>
    </thead>
    <tbody>
      <tr v-for="u in users" :key="u.id">
        <td>{{ u.id }}</td>
        <td>{{ u.email }}</td>
        <td>{{ u.role }}</td>
        <td>
          <button @click="makeAdmin(u.id)" :disabled="u.role==='admin'">Make Admin</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { api } from "../api";

const users = ref([]);

async function refresh() {
  const { data } = await api.get("/admin/users");
  users.value = data.users;
}

async function makeAdmin(userId) {
  await api.post("/admin/make-admin", { userId });
  await refresh();
}

onMounted(refresh);
</script>
