<template>
  <div 
    v-if="isOpen"
    id="roulette-modal-overlay-vue"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-in fade-in"
    @click.self="handleOverlayClick"
  >
    <div 
      id="roulette-modal-card-vue"
      class="rounded-3xl p-5 sm:p-6 pb-8 bg-white dark:bg-zinc-900 shadow-2xl max-w-md w-full text-center border border-rose-100 dark:border-zinc-800 relative transition-all max-h-[88vh] sm:max-h-[90vh] overflow-y-auto"
    >
      <!-- Close Button -->
      <button
        type="button"
        @click="closeModal"
        :disabled="isSpinning"
        class="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-rose-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 cursor-pointer"
        aria-label="Cerrar ruleta"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <!-- Header -->
      <div class="mb-3 pr-6">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#FFF0F3] dark:bg-zinc-800 text-accent-primary border border-rose-200 dark:border-zinc-700 mb-1.5">
          <span>🎲</span>
          <span>Destino Aleatorio</span>
        </div>
        <h2 class="text-lg sm:text-xl font-black text-slate-800 dark:text-zinc-100">
          {{ modalTitle }}
        </h2>
        <p class="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
          {{ mode === 'departments' ? '¿Indeciso? Deja que la suerte elija tu próxima aventura colombiana' : 'Descubre el próximo rincón mágico para sellar en tu pasaporte' }}
        </p>
      </div>

      <!-- Filtro Inteligente previo al giro: Switch / Checkbox sutil -->
      <div class="mb-2.5 flex items-center justify-center">
        <label 
          :class="[
            'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none',
            onlyPending
              ? 'bg-rose-50 dark:bg-zinc-800 border-rose-200 dark:border-zinc-700 text-rose-700 dark:text-rose-400 shadow-2xs'
              : 'bg-slate-50 dark:bg-[#1E2228] border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'
          ]"
        >
          <input
            type="checkbox"
            v-model="onlyPending"
            :disabled="isSpinning"
            @change="winner = null"
            class="w-3.5 h-3.5 text-accent-primary rounded-md focus:ring-0 border-gray-300 cursor-pointer"
          />
          <span>Solo destinos pendientes por visitar ({{ pendingCount }})</span>
        </label>
      </div>

      <!-- Filtro Desplegable de Departamentos Participantes -->
      <div class="mb-4">
        <button
          id="toggle-filter-btn-vue"
          type="button"
          @click="isFilterOpen = !isFilterOpen"
          :disabled="isSpinning"
          class="inline-flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer w-full max-w-xs mx-auto"
        >
          <span class="flex items-center gap-1.5 truncate">
            <span>🎯</span>
            <span>
              {{ mode === 'departments' 
                ? `Elegir departamentos en juego (${selectedIds.length} seleccionados)` 
                : `Elegir pueblos en juego (${selectedIds.length} seleccionados)` }}
            </span>
          </span>
          <svg 
            :class="['w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0', isFilterOpen ? 'rotate-180' : '']" 
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <!-- Contenido Desplegable del Filtro -->
        <div 
          v-if="isFilterOpen" 
          class="mt-2.5 p-3 rounded-2xl bg-slate-50/80 dark:bg-[#1E2228]/90 border border-slate-200 dark:border-zinc-700 text-left animate-in fade-in zoom-in-95 duration-150"
        >
          <!-- Botones de Acción Rápida -->
          <div class="flex flex-wrap items-center gap-1.5 mb-2.5">
            <button
              type="button"
              @click="selectAll"
              :class="[
                'px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer shadow-2xs',
                selectedIds.length === rawItems.length
                  ? 'bg-rose-500 text-white border-rose-600 dark:bg-rose-600 dark:border-rose-500'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-zinc-200 dark:border-zinc-700'
              ]"
            >
              Seleccionar todos ({{ rawItems.length }})
            </button>
            <button
              type="button"
              @click="clearAll"
              class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 transition-colors cursor-pointer shadow-2xs"
            >
              Limpiar selección
            </button>

            <!-- Tags por Región en modo Departamentos -->
            <div v-if="mode === 'departments'" class="w-full mt-1.5">
              <div class="text-xs font-semibold tracking-wider text-gray-500 dark:text-zinc-400 uppercase mb-1.5">
                Solo región:
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="(deptIds, regionName) in colombiaRegions"
                  :key="regionName"
                  type="button"
                  @click="selectRegion(deptIds)"
                  :style="isRegionSelected(deptIds) ? { backgroundColor: 'var(--color-accent, #F44566)', borderColor: 'transparent' } : undefined"
                  :class="[
                    'px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer',
                    isRegionSelected(deptIds)
                      ? 'text-white font-semibold shadow-sm'
                      : 'bg-white hover:bg-rose-50 border border-gray-200 text-gray-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:border-zinc-700 dark:text-zinc-200 hover:dark:text-white font-medium'
                  ]"
                >
                  {{ regionName }}
                </button>
              </div>
            </div>
          </div>

          <!-- Cuadrícula de Checkboxes -->
          <div class="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
            <label
              v-for="item in rawItems"
              :key="item.id"
              :class="[
                'flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-medium border transition-all cursor-pointer select-none',
                selectedIds.includes(item.id)
                  ? 'bg-white dark:bg-zinc-800 border-rose-300 dark:border-rose-900/60 text-slate-800 dark:text-zinc-100 shadow-2xs'
                  : 'bg-slate-100/70 dark:bg-[#1E2228]/60 border-slate-200 dark:border-zinc-700/80 text-slate-500 dark:text-zinc-300 opacity-85'
              ]"
            >
              <input
                type="checkbox"
                :value="item.id"
                v-model="selectedIds"
                :disabled="isSpinning"
                @change="winner = null"
                class="w-3.5 h-3.5 accent-rose-500 rounded text-accent-primary focus:ring-0 border-gray-300 cursor-pointer"
              />
              <span class="truncate">{{ item.name }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Rueda Gráfica / Contenedor de Giro -->
      <div class="relative mx-auto my-2 w-[230px] h-[230px] flex items-center justify-center">
        <!-- Flecha Indicadora Superior en color de acento -->
        <div 
          class="absolute -top-2 left-1/2 -translate-x-1/2 z-20 drop-shadow-md pointer-events-none"
          style="color: var(--color-accent, #F44566);"
        >
          <svg class="w-6 h-6 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12,22 4,6 20,6" />
          </svg>
        </div>

        <!-- Exterior Ring Frame -->
        <div class="w-full h-full rounded-full p-2 bg-gradient-to-tr from-rose-200 via-pink-100 to-rose-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 shadow-inner flex items-center justify-center">
          <!-- Rotating SVG Wheel -->
          <div
            class="w-full h-full rounded-full overflow-hidden relative shadow-md"
            :style="{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none'
            }"
          >
            <svg class="w-full h-full" viewBox="0 0 200 200">
              <template v-if="activeCandidates.length >= 2">
                <g v-for="(slice, i) in activeCandidates" :key="slice.id + i">
                  <path 
                    :d="getSlicePath(i, activeCandidates.length)" 
                    :fill="getSliceColor(i, activeCandidates.length)" 
                    stroke="#FFFFFF" 
                    :stroke-width="activeCandidates.length > 20 ? 0.75 : (activeCandidates.length > 12 ? 1 : 1.5)" 
                  />
                  <text
                    :x="100"
                    :y="getTextY(activeCandidates.length)"
                    :transform="`rotate(${getMidAngle(i, activeCandidates.length)}, 100, 100)`"
                    text-anchor="middle"
                    dominant-baseline="central"
                    :class="[getTextClass(activeCandidates.length), 'pointer-events-none select-none']"
                    style="text-shadow: 0 1px 1px rgba(255,255,255,0.85);"
                  >
                    {{ getSliceLabel(slice, activeCandidates.length) }}
                  </text>
                </g>
              </template>
              <template v-else>
                <circle cx="100" cy="100" r="100" fill="#FFE4E6" />
                <text
                  x="100"
                  y="100"
                  text-anchor="middle"
                  dominant-baseline="central"
                  class="text-[10px] font-bold fill-rose-700"
                >
                  Elige al menos 2
                </text>
              </template>
            </svg>
          </div>

          <!-- Botón Central / Hub (Sin tooltip molesto superpuesto) -->
          <button
            type="button"
            @click="spinWheel"
            :disabled="isSpinning || activeCandidates.length < 2"
            class="absolute w-14 h-14 rounded-full bg-white dark:bg-zinc-800 border-3 shadow-lg flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 z-10 disabled:opacity-50 disabled:cursor-not-allowed group"
            style="border-color: var(--color-accent, #F44566);"
          >
            <svg 
              :class="['w-4 h-4 text-accent-primary transition-transform', isSpinning ? 'animate-spin' : 'group-hover:rotate-45']" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span class="text-[8px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-200 mt-0.5">
              {{ isSpinning ? '...' : 'Girar' }}
            </span>
          </button>
        </div>
      </div>

      <!-- Spin Button or Validation Warning or Winner Card -->
      <div v-if="!winner" class="mt-4">
        <div 
          v-if="validationWarning" 
          class="w-full py-2.5 px-3.5 rounded-2xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center gap-2 text-center"
        >
          <svg class="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{{ validationWarning }}</span>
        </div>
        <button
          v-else
          type="button"
          @click="spinWheel"
          :disabled="isSpinning || activeCandidates.length < 2"
          style="background-color: var(--color-accent, #F44566); color: #ffffff;"
          class="w-full py-2.5 px-4 rounded-full text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>✨</span>
          <span>{{ isSpinning ? 'Girando la ruleta...' : '¡Girar Ruleta!' }}</span>
        </button>
      </div>

      <!-- Tarjeta Destacada con el Destino Ganador -->
      <div 
        v-else 
        class="mt-4 p-4 rounded-2xl bg-gradient-to-b from-rose-50/80 to-pink-50/30 dark:from-zinc-800/80 dark:to-[#1E2228]/90 border border-rose-200 dark:border-rose-900/40 text-center animate-in zoom-in-95 duration-300 shadow-sm"
      >
        <div class="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-accent-primary mb-1">
          <span>🏆</span>
          <span>¡Destino Seleccionado!</span>
        </div>

        <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 truncate">
          {{ winner.name }}
        </h3>

        <p v-if="winnerSubtitle" class="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-0.5">
          {{ winnerSubtitle }}
        </p>

        <div class="my-2 flex items-center justify-center gap-1.5">
          <span 
            v-if="winner.isVisited" 
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
          >
            ✓ Visitado
          </span>
          <span 
            v-else 
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
          >
            ⏱ Pendiente por explorar
          </span>
        </div>

        <!-- Botón de acción principal: ✨ ¡Vamos a explorar [Nombre]! -->
        <div class="mt-3 flex flex-col gap-2">
          <button
            type="button"
            @click="exploreWinner"
            style="background-color: var(--color-accent, #F44566); color: #ffffff;"
            class="w-full py-2.5 px-4 rounded-full text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🧭</span>
            <span>✨ ¡Vamos a explorar {{ winner.name }}!</span>
          </button>

          <button
            type="button"
            @click="spinWheel"
            class="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hover:text-accent-primary transition-colors cursor-pointer py-1"
          >
            🔄 Girar de nuevo
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import confetti from 'canvas-confetti';
import { useTravelStore } from './useTravelStore';
import type { Department, Municipality } from '../types';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    mode?: 'departments' | 'municipalities';
    title?: string;
  }>(),
  {
    mode: 'departments'
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', id: string, route: string): void;
}>();

const router = useRouter();
const travelStore = useTravelStore();

const onlyPending = ref(true);
const isFilterOpen = ref(false);
const selectedIds = ref<string[]>([]);
const isSpinning = ref(false);
const rotation = ref(0);
const winner = ref<Department | Municipality | null>(null);

const pastelPalette = [
  '#FFE4E6',
  '#FEF3C7',
  '#DCFCE7',
  '#E0F2FE',
  '#F3E8FF',
  '#FCE7F3',
  '#FFEDD5',
  '#EDE9FE'
];

const colombiaRegions: Record<string, string[]> = {
  'Andina': [
    'antioquia', 'boyaca', 'caldas', 'cundinamarca', 'huila',
    'norte-de-santander', 'quindio', 'risaralda', 'santander', 'tolima', 'bogota'
  ],
  'Caribe': [
    'atlantico', 'bolivar', 'cesar', 'cordoba', 'la-guajira',
    'magdalena', 'sucre', 'san-andres'
  ],
  'Pacífica': [
    'choco', 'valle-del-cauca', 'cauca', 'narino'
  ],
  'Orinoquía': [
    'arauca', 'casanare', 'meta', 'vichada'
  ],
  'Amazonía': [
    'amazonas', 'caqueta', 'guainia', 'guaviare', 'putumayo', 'vaupes'
  ]
};

const deptAbbr: Record<string, string> = {
  'amazonas': 'AMA',
  'antioquia': 'ANT',
  'arauca': 'ARA',
  'atlantico': 'ATL',
  'bogota': 'BOG',
  'bolivar': 'BOL',
  'boyaca': 'BOY',
  'caldas': 'CAL',
  'caqueta': 'CAQ',
  'casanare': 'CAS',
  'cauca': 'CAU',
  'cesar': 'CES',
  'choco': 'CHO',
  'cordoba': 'COR',
  'cundinamarca': 'CUN',
  'guainia': 'GNA',
  'guaviare': 'GVR',
  'huila': 'HUI',
  'la-guajira': 'GUA',
  'magdalena': 'MAG',
  'meta': 'MET',
  'narino': 'NAR',
  'norte-de-santander': 'NDS',
  'putumayo': 'PUT',
  'quindio': 'QUI',
  'risaralda': 'RIS',
  'san-andres': 'SAP',
  'santander': 'SAN',
  'sucre': 'SUC',
  'tolima': 'TOL',
  'valle-del-cauca': 'VAL',
  'vaupes': 'VAU',
  'vichada': 'VIC'
};

const modalTitle = computed(() => {
  if (props.title) return props.title;
  return props.mode === 'departments' ? '🎰 Ruleta de Departamentos' : '🎰 Ruleta de Pueblos';
});

// Full item pool from Pinia store
const rawItems = computed(() => {
  if (props.mode === 'departments') {
    return travelStore.departments;
  }
  return travelStore.currentDepartmentMunicipalities;
});

const pendingCount = computed(() => {
  return rawItems.value.filter((i) => !i.isVisited).length;
});

// Selected pool according to checkboxes
const selectedCandidates = computed(() => {
  return rawItems.value.filter((i) => selectedIds.value.includes(i.id));
});

// Active candidates taking onlyPending into account
const activeCandidates = computed(() => {
  if (onlyPending.value) {
    return selectedCandidates.value.filter((i) => !i.isVisited);
  }
  return selectedCandidates.value;
});

const validationWarning = computed(() => {
  if (selectedIds.value.length < 2) {
    return props.mode === 'departments' 
      ? 'Selecciona al menos 2 departamentos para girar' 
      : 'Selecciona al menos 2 destinos para girar';
  }
  if (onlyPending.value && activeCandidates.value.length < 2) {
    if (activeCandidates.value.length === 0) {
      return 'Todos los departamentos seleccionados ya fueron visitados. Desmarca "Solo pendientes" o agrega más.';
    }
    return 'Solo tienes 1 departamento pendiente seleccionado. Selecciona al menos 2 o desmarca "Solo pendientes".';
  }
  return null;
});

const winnerSubtitle = computed(() => {
  if (!winner.value) return '';
  if (props.mode === 'departments') {
    const dept = winner.value as Department;
    return `Capital: ${dept.capital || 'N/A'}`;
  } else {
    const muni = winner.value as Municipality;
    const parentDept = travelStore.departments.find(d => d.id === muni.departmentId);
    return `En ${parentDept?.name || 'Departamento'}`;
  }
});

function initSelections() {
  selectedIds.value = rawItems.value.map(i => i.id);
  winner.value = null;
  isSpinning.value = false;
}

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      initSelections();
    }
  },
  { immediate: true }
);

watch(
  () => rawItems.value,
  () => {
    if (props.isOpen && selectedIds.value.length === 0) {
      initSelections();
    }
  }
);

function selectAll() {
  selectedIds.value = rawItems.value.map(i => i.id);
  winner.value = null;
}

function clearAll() {
  selectedIds.value = [];
  winner.value = null;
}

function selectRegion(deptIds: string[]) {
  const available = rawItems.value.filter(i => deptIds.includes(i.id)).map(i => i.id);
  selectedIds.value = available;
  winner.value = null;
}

function isRegionSelected(deptIds: string[]): boolean {
  const available = rawItems.value.filter(i => deptIds.includes(i.id)).map(i => i.id);
  return (
    available.length > 0 &&
    selectedIds.value.length === available.length &&
    available.every(id => selectedIds.value.includes(id))
  );
}

function getSlicePath(i: number, total: number): string {
  const anglePerSlice = 360 / total;
  const startAngle = (i * anglePerSlice - 90) * (Math.PI / 180);
  const endAngle = ((i + 1) * anglePerSlice - 90) * (Math.PI / 180);
  const radius = 100;
  const cx = 100;
  const cy = 100;

  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);

  const largeArcFlag = anglePerSlice > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
}

function getSliceColor(i: number, total: number): string {
  let color = pastelPalette[i % pastelPalette.length];
  if (i === total - 1 && color === pastelPalette[0] && total > 1) {
    color = pastelPalette[1];
  }
  return color;
}

function getMidAngle(i: number, total: number): number {
  const anglePerSlice = 360 / total;
  return i * anglePerSlice + anglePerSlice / 2;
}

function getSliceLabel(item: Department | Municipality, total: number): string {
  if (total <= 8) {
    return item.name.length > 9 ? `${item.name.slice(0, 8)}…` : item.name;
  }
  if (total <= 12) {
    return item.name.length > 7 ? `${item.name.slice(0, 6)}…` : item.name;
  }
  if (deptAbbr[item.id]) {
    return deptAbbr[item.id];
  }
  const clean = item.name.replace(/^(de|del|la|los|el|san|santa)\s+/i, '').trim();
  return clean.slice(0, 3).toUpperCase();
}

function getTextY(total: number): number {
  if (total <= 8) return 100 - 58;
  if (total <= 12) return 100 - 61;
  if (total <= 20) return 100 - 65;
  return 100 - 68;
}

function getTextClass(total: number): string {
  if (total <= 8) return 'text-[9px] font-bold fill-slate-700';
  if (total <= 12) return 'text-[8px] font-bold fill-slate-700';
  if (total <= 20) return 'text-[7px] font-extrabold fill-slate-800';
  return 'text-[6px] font-black fill-slate-800';
}

function spinWheel() {
  if (isSpinning.value || activeCandidates.value.length < 2) return;

  isSpinning.value = true;
  winner.value = null;

  const N = activeCandidates.value.length;
  const winnerIndex = Math.floor(Math.random() * N);
  const chosen = activeCandidates.value[winnerIndex];

  // Calculate rotation to place chosen slice at top (0 deg)
  const anglePerSlice = 360 / N;
  const sliceMidAngle = winnerIndex * anglePerSlice + anglePerSlice / 2;
  const spins = 6;
  const currentModulo = rotation.value % 360;
  const neededOffset = (360 - sliceMidAngle - currentModulo + 360) % 360;
  const nextRotation = rotation.value + spins * 360 + neededOffset;

  rotation.value = nextRotation;

  setTimeout(() => {
    isSpinning.value = false;
    winner.value = chosen;
    try {
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 75,
          spread: 85,
          origin: { y: 0.6 },
          colors: ['#F44566', '#FEA38E', '#FFDFEC', '#FBD38D', '#93C5FD', '#A7F3D0']
        });
      }
    } catch {
      // safe ignore
    }
  }, 4000);
}

function exploreWinner() {
  if (!winner.value) return;
  const targetId = winner.value.id;
  const targetRoute = props.mode === 'departments' 
    ? `/departamento/${targetId}` 
    : `/municipio/${targetId}`;

  emit('select', targetId, targetRoute);
  closeModal();

  if (router) {
    router.push(targetRoute);
  }
}

function closeModal() {
  if (isSpinning.value) return;
  emit('close');
}

function handleOverlayClick() {
  if (!isSpinning.value) {
    closeModal();
  }
}
</script>
