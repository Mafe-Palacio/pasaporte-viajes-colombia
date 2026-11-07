<template>
  <div class="relative w-full h-full">
    <!-- Map Canvas Container -->
    <div 
      v-if="!isFallbackActive" 
      ref="mapContainer" 
      class="w-full h-full min-h-[500px] map-pastel-filter"
      style="filter: saturate(0.7) brightness(1.05);"
    ></div>

    <!-- Fallback Grid if map fails or timeout triggers (>3s) -->
    <div 
      v-else 
      class="w-full h-full overflow-y-auto p-6 pb-28 sm:pb-12 bg-[#FDF8F7]"
    >
      <div class="max-w-4xl mx-auto">
        <div class="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex justify-between items-center">
          <span class="text-xs text-amber-800 font-semibold">
            Modo Contingencia Activo: Despliegue de cuadrícula de tarjetas con progreso departamental.
          </span>
          <button 
            @click="retryMap"
            class="text-xs font-bold text-[#F44566] hover:underline"
          >
            Reintentar Mapa
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div 
            v-for="dept in departments" 
            :key="dept.id"
            @click="$emit('select-department', dept.id)"
            class="bg-white p-5 rounded-3xl border border-[#FFE4EA] shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <h4 class="font-bold text-slate-800">{{ dept.name }}</h4>
            <p class="text-xs text-slate-500 mb-2">Capital: {{ dept.capital }}</p>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                class="bg-gradient-to-r from-[#FEA38E] to-[#F44566] h-full"
                :style="{ width: dept.progressPercentage + '%' }"
              ></div>
            </div>
            <span class="text-[10px] text-slate-400 mt-1 block">
              {{ dept.visitedMunicipalities }} de {{ dept.totalMunicipalities }} municipios
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import type { Department } from '../types';

const props = defineProps<{
  departments: Department[];
  isFallbackActive?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-department', id: string): void;
  (e: 'fallback-triggered'): void;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
let mapInstance: L.Map | null = null;
let fallbackTimer: any = null;

onMounted(() => {
  initMap();
});

onBeforeUnmount(() => {
  cleanupMap();
});

function cleanupMap() {
  if (fallbackTimer) clearTimeout(fallbackTimer);
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
}

function retryMap() {
  cleanupMap();
  initMap();
}

function initMap() {
  if (!mapContainer.value) return;

  // Contingency fallback watchdog (3 seconds)
  fallbackTimer = setTimeout(() => {
    if (!mapInstance) {
      emit('fallback-triggered');
    }
  }, 3000);

  try {
    mapInstance = L.map(mapContainer.value, {
      center: [4.5709, -74.2973],
      zoom: 6,
      zoomControl: true,
      attributionControl: false
    });

    // Clean, open OpenStreetMap tile layer (100% free and open, no API key required)
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    tileLayer.addTo(mapInstance);

    // Add centroid circular markers for each department (exclusively 32 circular centroids)
    props.departments.forEach((dept) => {
      const isHome = dept.id === 'quindio';
      const statusClass = isHome ? 'home' : dept.isVisited ? 'visited' : 'pending';

      const customIcon = L.divIcon({
        className: 'custom-centroid-marker',
        html: `
          <div class="centroid-dot ${statusClass}" title="${dept.name} (${dept.visitedMunicipalities}/${dept.totalMunicipalities} municipios)">
            ${isHome ? '🏠' : ''}
          </div>
        `,
        iconSize: isHome ? [28, 28] : [24, 24],
        iconAnchor: isHome ? [14, 14] : [12, 12]
      });

      const marker = L.marker([dept.latitude, dept.longitude], { icon: customIcon });

      marker.on('click', () => {
        emit('select-department', dept.id);
      });

      marker.bindTooltip(
        `<strong>${dept.name}</strong>${isHome ? ' 🏠 (Hogar)' : ''}<br/>${dept.visitedMunicipalities}/${dept.totalMunicipalities} municipios visitados`,
        { direction: 'top', offset: [0, -10] }
      );

      marker.addTo(mapInstance!);
    });

    clearTimeout(fallbackTimer);
  } catch (err) {
    console.error('Error inicializando Leaflet en ColombiaMap.vue:', err);
    emit('fallback-triggered');
  }
}
</script>

<style scoped>
:deep(.custom-centroid-marker) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}

:deep(.centroid-dot) {
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transform-origin: center center;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  will-change: transform;
}

:deep(.centroid-dot.pending) {
  background-color: #ffffff;
  border: 1.5px solid #CBD5E1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

:deep(.dark .centroid-dot.pending),
:deep(html.dark .centroid-dot.pending) {
  background-color: #2a2e37 !important;
  border: 1.5px solid #475569 !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4) !important;
}

:deep(.centroid-dot.visited) {
  background-color: var(--color-accent, #F44566);
  border: 2px solid #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
}

:deep(.dark .centroid-dot.visited),
:deep(html.dark .centroid-dot.visited) {
  background-color: var(--color-accent, #F44566) !important;
  border: 2px solid #ffffff !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5) !important;
}

:deep(.centroid-dot.home) {
  background: linear-gradient(135deg, var(--color-accent-soft, #FEA38E), var(--color-accent, #F44566));
  border: 2px solid #ffffff;
  box-shadow: 0 3px 12px rgba(244, 69, 102, 0.45);
  font-size: 13px;
  line-height: 1;
}

:deep(.centroid-dot:hover) {
  transform: scale(1.2) !important;
  z-index: 9999;
}
</style>
