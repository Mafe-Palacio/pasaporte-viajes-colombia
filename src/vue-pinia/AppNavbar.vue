<template>
  <header class="w-full px-2 pt-2 flex flex-col items-center sticky top-2 z-40 pointer-events-none">
    <!-- Fila Superior (Barra de Utilidades en Móvil): Título a la izquierda y Botón Salir al extremo superior derecho -->
    <div class="sm:hidden w-full max-w-sm flex items-center justify-between px-2 pb-1.5 pointer-events-auto">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="text-xs font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1">
          🇨🇴 Pasaporte Colombia
        </span>
      </div>
      <button
        v-if="authStore.isAuthenticated"
        @click="handleLogout"
        class="shrink-0 whitespace-nowrap px-2.5 py-1 text-xs font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-zinc-800 rounded-full transition-all flex items-center gap-1 cursor-pointer"
        title="Cerrar sesión"
      >
        <svg class="w-3.5 h-3.5 flex-shrink-0 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>Salir</span>
      </button>
    </div>

    <!-- Fila de Navegación Principal: Cápsula horizontal exclusivamente para las tres secciones principales -->
    <nav
      class="pointer-events-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-full p-1 shadow-md sm:shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between sm:justify-start gap-1 sm:gap-2 w-full max-w-sm sm:max-w-fit mx-auto transition-colors"
      aria-label="Navegación principal"
    >
      <div class="grid grid-cols-3 gap-1 w-full sm:w-auto sm:flex sm:items-center sm:gap-1.5">
        <!-- 🧭 Explorador / Mapa País -->
        <button
          @click="navigate('country')"
          :style="isCountryActive ? { backgroundColor: 'var(--color-accent, #F44566)', color: '#ffffff' } : undefined"
          :class="[
            'shrink-0 whitespace-nowrap px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all flex items-center justify-center gap-1 cursor-pointer',
            isCountryActive
              ? 'text-white shadow-md'
              : 'text-[#777] dark:text-zinc-400 hover:text-[#F44566] dark:hover:text-zinc-100 hover:bg-[#FFF5F7] dark:hover:bg-zinc-800'
          ]"
          title="Explorador Nacional"
        >
          <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          <span>Explorador</span>
        </button>

        <!-- ❤️ Familia Palacio (Muro de Recuerdos) -->
        <button
          v-if="authStore.isAuthenticated"
          @click="navigate('/recuerdos')"
          :style="isRecuerdosActive ? { backgroundColor: 'var(--color-accent, #F44566)', color: '#ffffff' } : undefined"
          :class="[
            'shrink-0 whitespace-nowrap px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all flex items-center justify-center gap-1 cursor-pointer',
            isRecuerdosActive
              ? 'text-white shadow-md'
              : 'text-[#777] dark:text-zinc-400 hover:text-[#F44566] dark:hover:text-zinc-100 hover:bg-[#FFF5F7] dark:hover:bg-zinc-800'
          ]"
          title="Muro de Recuerdos - Familia Palacio"
        >
          <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" viewBox="0 0 24 24" :fill="isRecuerdosActive ? '#ffffff' : 'var(--color-accent, #F44566)'" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>Recuerdos</span>
        </button>

        <!-- 📊 Reportes & Métricas de Viaje -->
        <button
          v-if="authStore.isAuthenticated"
          @click="navigate('/reportes')"
          :style="isReportesActive ? { backgroundColor: 'var(--color-accent, #F44566)', color: '#ffffff' } : undefined"
          :class="[
            'shrink-0 whitespace-nowrap px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all flex items-center justify-center gap-1 cursor-pointer',
            isReportesActive
              ? 'text-white shadow-md'
              : 'text-[#777] dark:text-zinc-400 hover:text-[#F44566] dark:hover:text-zinc-100 hover:bg-[#FFF5F7] dark:hover:bg-zinc-800'
          ]"
          title="Reportes & Métricas de Viaje"
        >
          <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>Reportes</span>
        </button>

        <!-- 💻 Arquitectura & Código (Oculto en móvil con hidden sm:flex) -->
        <button
          @click="navigate('architecture')"
          :class="[
            'hidden sm:flex items-center gap-1.5 shrink-0 whitespace-nowrap px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all cursor-pointer',
            isArchitectureActive
              ? 'bg-[#FFF0F3] dark:bg-zinc-800 text-[#F44566] border border-[#FFBDC9]/80 shadow-sm'
              : 'text-[#777] dark:text-zinc-400 hover:text-[#F44566] dark:hover:text-zinc-100 hover:bg-[#FFF5F7] dark:hover:bg-zinc-800 border border-transparent'
          ]"
          title="Ver Arquitectura .NET 10, EF Core, Pinia y CI/CD"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span>Arquitectura</span>
        </button>
      </div>

      <!-- Salir en Desktop (anclado con ml-2 en pantallas sm:) -->
      <button
        v-if="authStore.isAuthenticated"
        @click="handleLogout"
        class="hidden sm:flex shrink-0 whitespace-nowrap ml-2 px-3 py-2 text-xs sm:text-sm font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-zinc-800 rounded-full transition-all items-center gap-1 cursor-pointer"
        title="Cerrar sesión"
      >
        <svg class="w-3.5 h-3.5 flex-shrink-0 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>Salir</span>
      </button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore } from './useAuthStore';

const props = defineProps<{
  currentRoute?: string;
}>();

const emit = defineEmits<{
  (e: 'navigate', route: string): void;
  (e: 'open-architecture'): void;
}>();

const authStore = useAuthStore();

// Obtener ruta inicial de props o del path actual en el navegador
const activePath = ref<string>(
  props.currentRoute || (typeof window !== 'undefined' ? window.location.pathname : 'country')
);

watch(
  () => props.currentRoute,
  (newVal) => {
    if (newVal) {
      activePath.value = newVal;
    }
  }
);

// Reactividad estricta según la ruta activa (useRoute().path / router-link-active)
const isBitacoraActive = computed(() => {
  const p = activePath.value;
  return p === 'bitacora' || p === 'municipality' || p.startsWith('/municipio');
});

const isCountryActive = computed(() => {
  const p = activePath.value;
  return p === 'country' || p === 'explorador' || p === '/explorador' || p.startsWith('/departamento') || p === 'regional';
});

const isRecuerdosActive = computed(() => {
  const p = activePath.value;
  return p === 'recuerdos' || p === '/recuerdos';
});

const isReportesActive = computed(() => {
  const p = activePath.value;
  return p === 'reportes' || p === '/reportes';
});

const isProfileActive = computed(() => {
  const p = activePath.value;
  return p === 'profile' || p === '/perfil';
});

const isArchitectureActive = computed(() => {
  const p = activePath.value;
  return p === 'architecture' || p === '/arquitectura';
});

function navigate(route: string) {
  activePath.value = route;
  if (route === 'architecture') {
    emit('open-architecture');
  }
  emit('navigate', route);
}

function handleLogout() {
  authStore.logout();
  navigate('auth');
}
</script>
