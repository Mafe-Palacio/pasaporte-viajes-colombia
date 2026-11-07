<template>
  <div class="relative w-full h-full min-h-[500px]">
    <!-- Map Canvas Container (Centroids only, no bounding boxes or polygons) -->
    <div 
      ref="mapContainer" 
      class="w-full h-full min-h-[500px] map-pastel-filter"
      style="filter: saturate(0.7) brightness(1.05);"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import type { Municipality, Department } from '../types';

const props = defineProps<{
  department: Department;
  municipalities: Municipality[];
  homeMunicipalityId?: string;
}>();

const emit = defineEmits<{
  (e: 'select-municipality', id: string): void;
  (e: 'back'): void;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
let mapInstance: L.Map | null = null;

onMounted(() => {
  initMap();
});

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});

function initMap() {
  if (!mapContainer.value) return;

  try {
    mapInstance = L.map(mapContainer.value, {
      center: [props.department.latitude, props.department.longitude],
      zoom: 9,
      zoomControl: true,
      attributionControl: false
    });

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    tileLayer.addTo(mapInstance);

    // Centrar usando los puntos de los municipios sin dibujar polígonos
    const validPoints = props.municipalities
      .map((m) => [m.latitude ?? m.lat, m.longitude ?? m.lng])
      .filter((pt): pt is [number, number] => pt[0] !== undefined && pt[1] !== undefined);

    if (validPoints.length > 0) {
      try {
        const bounds = L.latLngBounds(validPoints);
        mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
      } catch {
        mapInstance.setView([props.department.latitude, props.department.longitude], 9);
      }
    }

    // Marcadores exclusivamente circulares (centroides de cada municipio)
    props.municipalities.forEach((muni) => {
      const lat = muni.latitude ?? muni.lat;
      const lng = muni.longitude ?? muni.lng;
      if (lat === undefined || lng === undefined) return;

      const isHome = muni.isHome || (props.homeMunicipalityId && (props.homeMunicipalityId === muni.id || props.homeMunicipalityId === muni.code));
      const statusClass = isHome ? 'home' : muni.isVisited ? 'visited' : 'pending';

      const customIcon = L.divIcon({
        className: 'custom-centroid-marker',
        html: `
          <div class="centroid-dot muni-dot ${statusClass}" title="${muni.name}">
            ${isHome ? '🏠' : ''}
          </div>
        `,
        iconSize: isHome ? [26, 26] : [20, 20],
        iconAnchor: isHome ? [13, 13] : [10, 10]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.on('click', () => {
        emit('select-municipality', muni.id);
      });

      marker.bindTooltip(
        `<div style="font-family: system-ui, -apple-system, sans-serif; padding: 2px 4px;">
          <div style="font-weight: 800; font-size: 12px;">${isHome ? '🏠 ' : ''}${muni.name}</div>
          <div style="font-size: 10px; font-weight: 600; margin-top: 1px; color: ${muni.isVisited || isHome ? '#F44566' : '#64748b'};">
            ${isHome ? '★ Ciudad Hogar' : muni.isVisited ? '✓ Visitado' : '○ Pendiente'}
          </div>
        </div>`,
        { direction: 'top', offset: [0, isHome ? -14 : -10] }
      );

      marker.addTo(mapInstance!);
    });
  } catch (err) {
    console.error('Error inicializando Leaflet en DepartmentMap.vue:', err);
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
  width: 20px;
  height: 20px;
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
  width: 26px;
  height: 26px;
  background: linear-gradient(135deg, var(--color-accent-soft, #FEA38E), var(--color-accent, #F44566));
  border: 2px solid #ffffff;
  box-shadow: 0 3px 12px rgba(244, 69, 102, 0.45);
  font-size: 14px;
  line-height: 1;
}

:deep(.centroid-dot:hover) {
  transform: scale(1.2) !important;
  z-index: 9999;
}
</style>
