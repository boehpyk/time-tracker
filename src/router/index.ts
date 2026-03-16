import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Dashboard",
      component: () => import("../views/DashboardView.vue"),
    },
    {
      path: "/projects",
      name: "Projects",
      component: () => import("../views/ProjectsView.vue"),
    },
    {
      path: "/projects/:id",
      name: "ProjectDetail",
      component: () => import("../views/ProjectDetailView.vue"),
    },
    {
      path: "/entries",
      name: "Entries",
      component: () => import("../views/EntriesView.vue"),
    },
    {
      path: "/reports",
      name: "Reports",
      component: () => import("../views/ReportsView.vue"),
    },
  ],
});

export default router;
