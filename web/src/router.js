import { createRouter, createWebHistory } from "vue-router";
import Login from "./pages/Login.vue";
import Worlds from "./pages/Worlds.vue";
import Editor from "./pages/Editor.vue";
import Admin from "./pages/Admin.vue";

function getUser() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: Login },
    { path: "/", component: Worlds },
    { path: "/world/:id", component: Editor },
    { path: "/admin", component: Admin, meta: { admin: true } }
  ]
});

router.beforeEach((to) => {
  const token = localStorage.getItem("token");
  const user = getUser();

  if (to.path !== "/login" && !token) return "/login";
  if (to.meta.admin && user?.role !== "admin") return "/";
});

export default router;
