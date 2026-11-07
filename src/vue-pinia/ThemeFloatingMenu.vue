<template>
  <div
    ref="menuContainerRef"
    class="fixed bottom-5 right-4 sm:bottom-auto sm:top-4 sm:right-4 z-50 flex items-center gap-2 select-none"
  >
    <!-- Submenú Horizontal Desplegado en Cápsula -->
    <div
      class="transition-all duration-300 origin-right flex items-center"
      :class="[
        isOpen
          ? 'opacity-100 scale-100 translate-x-0 pointer-events-auto'
          : 'opacity-0 scale-95 translate-x-3 pointer-events-none'
      ]"
    >
      <div
        class="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-full px-3.5 py-2 shadow-lg border border-rose-100 dark:border-zinc-700 flex items-center gap-3"
      >
        <!-- Botón 1: Toggle Modo Oscuro / Claro -->
        <button
          type="button"
          @click="toggleDarkMode"
          :title="isDarkMode ? 'Cambiar a modo claro (☀️)' : 'Cambiar a modo oscuro (🌙)'"
          aria-label="Alternar modo oscuro o claro"
          class="p-1 rounded-full text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-zinc-700/80 transition-colors cursor-pointer flex items-center justify-center active:scale-95"
        >
          <span v-if="isDarkMode" class="text-base leading-none">☀️</span>
          <span v-else class="text-base leading-none">🌙</span>
        </button>

        <!-- Separador sutil vertical -->
        <div class="h-4 w-[1px] bg-gray-200 dark:bg-zinc-700" />

        <!-- Botón 2: Selector de Paletas Pastel -->
        <div class="flex items-center gap-2">
          <button
            v-for="palette in palettes"
            :key="palette.id"
            type="button"
            @click="selectPalette(palette)"
            :title="palette.name"
            :aria-label="`Seleccionar paleta ${palette.name}`"
            :style="{ backgroundColor: palette.primary }"
            class="w-5 h-5 rounded-full ring-2 ring-white dark:ring-zinc-800 shadow-sm cursor-pointer hover:scale-110 transition-all"
            :class="[
              currentPaletteId === palette.id
                ? 'scale-110 ring-offset-2 ring-offset-white dark:ring-offset-zinc-800 ring-slate-400 dark:ring-zinc-300'
                : ''
            ]"
          />
        </div>
      </div>
    </div>

    <!-- Botón Gatillo (Trigger) -->
    <button
      id="theme-trigger-btn-vue"
      type="button"
      @click="isOpen = !isOpen"
      title="Ajustes de Tema y Color"
      aria-label="Abrir ajustes de tema y color"
      class="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 shadow-lg shadow-black/10 hover:shadow-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center relative group"
    >
      <span class="text-lg transition-transform group-hover:rotate-12">🎨</span>
      <!-- Indicador del color activo -->
      <span
        class="absolute top-2 right-2 w-2 h-2 rounded-full ring-1 ring-white dark:ring-zinc-800 shadow-xs"
        :style="{ backgroundColor: currentPalette.primary }"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

interface PastelPalette {
  id: string;
  name: string;
  primary: string;
  soft: string;
  light: string;
  border: string;
  hover: string;
  ring: string;
}

const palettes: PastelPalette[] = [
  {
    id: 'rose',
    name: 'Rosa Pastel (Original)',
    primary: '#F44566',
    soft: '#FFBDC9',
    light: '#FFF5F7',
    border: '#FFE4EA',
    hover: '#E03757',
    ring: 'rgba(244, 69, 102, 0.35)'
  },
  {
    id: 'mint',
    name: 'Menta / Esmeralda Pastel',
    primary: '#48BB78',
    soft: '#C6F6D5',
    light: '#F0FDF4',
    border: '#DCFCE7',
    hover: '#38A169',
    ring: 'rgba(72, 187, 120, 0.35)'
  },
  {
    id: 'lavender',
    name: 'Lavanda Pastel',
    primary: '#9F7AEA',
    soft: '#E9D8FD',
    light: '#FAF5FF',
    border: '#F3E8FF',
    hover: '#805AD5',
    ring: 'rgba(159, 122, 234, 0.35)'
  },
  {
    id: 'peach',
    name: 'Durazno / Coral Pastel',
    primary: '#ED8936',
    soft: '#FEEBC8',
    light: '#FFFBF5',
    border: '#FFEDD5',
    hover: '#DD6B20',
    ring: 'rgba(237, 137, 54, 0.35)'
  }
];

const isOpen = ref(false);
const menuContainerRef = ref<HTMLElement | null>(null);

const isDarkMode = ref(
  typeof window !== 'undefined'
    ? localStorage.getItem('theme_mode') === 'dark' || document.documentElement.classList.contains('dark')
    : false
);

const currentPaletteId = ref(
  typeof window !== 'undefined'
    ? localStorage.getItem('theme_palette') || localStorage.getItem('theme-color') || 'rose'
    : 'rose'
);

const currentPalette = computed(() => {
  return palettes.find((p) => p.id === currentPaletteId.value) || palettes[0];
});

function applyPalette(palette: PastelPalette) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--accent-primary', palette.primary);
  root.style.setProperty('--accent-soft', palette.soft);
  root.style.setProperty('--accent-light', palette.light);
  root.style.setProperty('--accent-border', palette.border);
  root.style.setProperty('--accent-hover', palette.hover);
  root.style.setProperty('--accent-ring', palette.ring);

  localStorage.setItem('theme_palette', palette.id);
  localStorage.setItem('theme-color', palette.id);
}

function selectPalette(palette: PastelPalette) {
  currentPaletteId.value = palette.id;
  applyPalette(palette);
}

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value;
  if (typeof document !== 'undefined') {
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme_mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme_mode', 'light');
    }
  }
}

function handlePointerDown(e: MouseEvent | TouchEvent) {
  if (menuContainerRef.value && !menuContainerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark');
  }
  applyPalette(currentPalette.value);

  document.addEventListener('mousedown', handlePointerDown);
  document.addEventListener('touchstart', handlePointerDown);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handlePointerDown);
  document.removeEventListener('touchstart', handlePointerDown);
});
</script>
