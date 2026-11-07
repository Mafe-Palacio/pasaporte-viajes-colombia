import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './useAuthStore';

export const routes = [
  {
    path: '/',
    redirect: '/explorador'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('./AuthScreen.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/explorador',
    name: 'Explorador',
    component: () => import('./ColombiaMap.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/departamento/:id',
    name: 'Departamento',
    component: () => import('./DepartmentMap.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/municipio/:id',
    name: 'Municipio',
    component: () => import('./ColombiaMap.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/recuerdos',
    name: 'Recuerdos',
    component: () => import('./Fotos.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/reportes',
    name: 'Reportes',
    component: () => import('./ColombiaMap.vue'),
    meta: { requiresAuth: true }
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});

// Guard de navegación estricto con validación síncrona del store persistido
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  // Verificar authStore.isAuthenticated directamente del store persistido para que no rebote a /login al primer intento
  const isAuth =
    authStore.isAuthenticated ||
    (typeof window !== 'undefined' && !!localStorage.getItem('auth_token'));

  if (to.meta?.requiresAuth && !isAuth) {
    next({ path: '/login' });
  } else if (to.path === '/login' && isAuth) {
    next({ path: '/explorador' });
  } else {
    // Limpiar alertas de error previas antes de navegar
    authStore.errorMessage = null;
    next();
  }
});

export default router;
