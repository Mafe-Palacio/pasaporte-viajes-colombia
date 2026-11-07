<script setup lang="ts">
import { ref, watch } from 'vue';
import { useTravelStore } from './useTravelStore';
import type { TripEntry, TripTransport } from '../types';

interface Props {
  trip?: TripEntry;
  municipalityName?: string;
  isHome?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  municipalityName: 'este municipio',
  isHome: false
});

const emit = defineEmits<{
  (e: 'saved', transport: TripTransport): void;
}>();

const travelStore = useTravelStore();

// Form reactive state
const roadCondition = ref<string>('Buena');
const tollCount = ref<number>(0);
const transportMode = ref<string>('Carro propio');
const notes = ref<string>('');
const isSavedFeedback = ref<boolean>(false);

const roadConditionOptions = ['Excelente', 'Buena', 'Regular', 'Mala/Destapada'];
const transportModeSuggestions = ['Carro propio', 'Moto', 'Autobús', 'Avión', 'Bicicleta'];

// Sync with prop when trip changes
watch(
  () => props.trip,
  (newTrip) => {
    if (newTrip) {
      roadCondition.value =
        newTrip.transport?.roadCondition || newTrip.roadCondition || 'Buena';
      tollCount.value =
        newTrip.transport?.tollCount ?? newTrip.tollCount ?? (newTrip.hasTolls ? 1 : 0);
      transportMode.value =
        newTrip.transport?.transportMode || newTrip.transportMode || 'Carro propio';
      notes.value =
        newTrip.transport?.notes ?? newTrip.transportNotes ?? '';
    }
  },
  { immediate: true }
);

function incrementTolls() {
  tollCount.value += 1;
}

function decrementTolls() {
  if (tollCount.value > 0) {
    tollCount.value -= 1;
  }
}

function handleSave() {
  const transportData: TripTransport = {
    roadCondition: roadCondition.value,
    tollCount: tollCount.value,
    hasTolls: tollCount.value > 0,
    transportMode: transportMode.value,
    notes: notes.value
  };

  if (props.trip) {
    travelStore.updateTripTransport(props.trip.id, transportData);
  }

  emit('saved', transportData);
  isSavedFeedback.value = true;
  setTimeout(() => {
    isSavedFeedback.value = false;
  }, 2500);
}
</script>

<template>
  <div class="bg-white rounded-3xl p-8 shadow-[0_15px_35px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h3 class="text-lg font-bold text-slate-800">
          Ruta, Vías y Peajes hacia {{ municipalityName }}
        </h3>
        <p class="text-xs text-slate-500">
          Configuración y bitácora del trayecto vial
        </p>
      </div>

      <div
        v-if="isSavedFeedback"
        class="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all"
      >
        <span>✓ ¡Cambios de ruta guardados en travelStore!</span>
      </div>
    </div>

    <!-- Banner for Home City Mobility / Base de operaciones -->
    <div
      v-if="isHome"
      class="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200 flex items-start gap-3"
    >
      <span class="text-xl">🏠</span>
      <div>
        <h4 class="text-xs font-bold text-emerald-900">
          Tu base de operaciones y residencia habitual
        </h4>
        <p class="text-xs text-emerald-700/90 mt-0.5">
          Desde aquí parte tu movilidad hacia el resto de Colombia o puedes registrar aquí tus notas de transporte urbano y movilidad local cotidiana.
        </p>
      </div>
    </div>

    <!-- Inputs Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- 1. Estado de la vía -->
      <div class="bg-[#FFFBFB] p-5 rounded-2xl border border-[#FFE4EA] space-y-3">
        <label class="text-xs font-bold text-slate-600 uppercase tracking-wide block">
          Estado de la Vía
        </label>
        <select
          v-model="roadCondition"
          class="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F44566]/25 focus:border-[#F44566]"
        >
          <option
            v-for="opt in roadConditionOptions"
            :key="opt"
            :value="opt"
          >
            {{ opt }}
          </option>
        </select>

        <!-- Pills selector -->
        <div class="flex flex-wrap gap-1.5 pt-1">
          <button
            v-for="opt in roadConditionOptions"
            :key="opt"
            type="button"
            @click="roadCondition = opt"
            :class="[
              'text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer',
              roadCondition === opt
                ? 'bg-[#F44566] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-rose-100 hover:border-rose-300'
            ]"
          >
            {{ opt }}
          </button>
        </div>
      </div>

      <!-- 2. Peajes en ruta -->
      <div class="bg-[#FFFBFB] p-5 rounded-2xl border border-[#FFE4EA] space-y-3">
        <label class="text-xs font-bold text-slate-600 uppercase tracking-wide block">
          Peajes en Ruta
        </label>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="decrementTolls"
            class="w-9 h-9 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-slate-700 font-bold text-base flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            title="Disminuir peajes"
          >
            -
          </button>
          <input
            v-model.number="tollCount"
            type="number"
            min="0"
            class="w-full text-center py-2 bg-white border border-rose-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F44566]/25 focus:border-[#F44566]"
          />
          <button
            type="button"
            @click="incrementTolls"
            class="w-9 h-9 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-slate-700 font-bold text-base flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            title="Aumentar peajes"
          >
            +
          </button>
        </div>
        <span class="text-[11px] text-slate-500 font-medium block">
          {{ tollCount === 0 ? 'Sin peajes reportados' : `${tollCount} peaje(s) cruzado(s)` }}
        </span>
      </div>

      <!-- 3. Medio utilizado -->
      <div class="bg-[#FFFBFB] p-5 rounded-2xl border border-[#FFE4EA] space-y-3">
        <label class="text-xs font-bold text-slate-600 uppercase tracking-wide block">
          Medio Utilizado
        </label>
        <input
          v-model="transportMode"
          type="text"
          list="vue-transport-modes"
          placeholder="Carro propio, Moto, Autobús..."
          class="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F44566]/25 focus:border-[#F44566]"
        />
        <datalist id="vue-transport-modes">
          <option
            v-for="sug in transportModeSuggestions"
            :key="sug"
            :value="sug"
          />
        </datalist>

        <!-- Suggestion pills -->
        <div class="flex flex-wrap gap-1.5 pt-1">
          <button
            v-for="sug in transportModeSuggestions"
            :key="sug"
            type="button"
            @click="transportMode = sug"
            :class="[
              'text-[10px] px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer',
              transportMode === sug
                ? 'bg-[#F44566] text-white shadow-sm'
                : 'bg-white text-slate-500 border border-rose-100 hover:border-rose-300'
            ]"
          >
            {{ sug }}
          </button>
        </div>
      </div>
    </div>

    <!-- Bitácora de ruta y consejos -->
    <div>
      <label class="block text-xs font-bold text-slate-700 mb-2">
        Bitácora de Ruta y Consejos
      </label>
      <textarea
        v-model="notes"
        rows="3"
        placeholder="Notas sobre el estado de la carretera, desvíos, recomendaciones y precauciones viales..."
        class="w-full p-4 bg-[#FFFBFB] border border-rose-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F44566]/25 focus:border-[#F44566] leading-relaxed resize-y"
      ></textarea>
    </div>

    <!-- Botón sutil en píldora al final -->
    <div class="flex justify-end pt-2">
      <button
        type="button"
        @click="handleSave"
        class="px-6 py-2.5 rounded-full bg-[#F44566] hover:bg-[#e03757] text-white text-xs font-bold shadow-md shadow-[#F44566]/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
      >
        <span>💾 Guardar cambios de ruta</span>
      </button>
    </div>
  </div>
</template>
