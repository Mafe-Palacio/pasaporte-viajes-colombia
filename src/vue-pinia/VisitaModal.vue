<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#FFE4EA]">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-slate-800">
          Añadir Nueva Visita a {{ municipalityName }}
        </h3>
        <button @click="emit('close')" class="text-slate-400 hover:text-slate-600">
          ✕
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">
            Fecha del Viaje
          </label>
          <input 
            type="date" 
            v-model="tripForm.date" 
            @click="openDatePicker"
            class="w-full px-4 py-2.5 rounded-2xl border border-rose-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all cursor-pointer"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">
            Resumen o Motivo del Viaje
          </label>
          <textarea
            v-model="tripForm.summary"
            rows="3"
            placeholder="Ej: Vacaciones de mitad de año con los primos..."
            class="w-full p-3 bg-[#FFFBFB] border border-[#FAD2DA] rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F44566]"
          />
        </div>

        <div class="flex gap-2 pt-2">
          <button
            type="button"
            @click="emit('close')"
            class="flex-1 py-2.5 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="handleSubmit"
            class="flex-1 py-2.5 rounded-full bg-[#F44566] text-white text-xs font-bold shadow-md shadow-[#F44566]/25 hover:bg-[#e03757]"
          >
            Estampar Visita
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  isOpen: boolean;
  municipalityName: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', trip: { date: string; summary: string }): void;
}>();

const getTodayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const tripForm = ref({
  date: getTodayIso(),
  summary: ''
});

function openDatePicker(event: MouseEvent) {
  try {
    (event.currentTarget as HTMLInputElement).showPicker?.();
  } catch {}
}

function formatSafeDate(isoDate: string): string {
  if (!isoDate) return '08/Sep/2026';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2].padStart(2, '0');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthName = months[monthIndex] || 'Ene';
    return `${day}/${monthName}/${year}`;
  }
  return isoDate;
}

function handleSubmit() {
  const formattedDate = formatSafeDate(tripForm.value.date);
  emit('save', {
    date: formattedDate,
    summary: tripForm.value.summary
  });
  emit('close');
}
</script>
