<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTravelStore } from './useTravelStore';
import type { TripEntry, TripPhoto } from '../types';

interface Props {
  trip?: TripEntry;
  municipalityName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  municipalityName: 'este municipio'
});

const emit = defineEmits<{
  (e: 'photos-uploaded', photos: TripPhoto[]): void;
}>();

const travelStore = useTravelStore();
const lightboxPhoto = ref<string | null>(null);

const currentTrip = computed<TripEntry | undefined>(() => props.trip);

const photos = computed<TripPhoto[]>(() => {
  return currentTrip.value?.photos || [];
});

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const uploadedList: TripPhoto[] = Array.from(target.files).map((file, idx) => ({
    id: `photo-${Date.now()}-${idx}`,
    tripEntryId: currentTrip.value?.id || `trip-unknown`,
    url: URL.createObjectURL(file),
    caption: file.name.replace(/\.[^/.]+$/, ''),
    uploadedAt: currentTrip.value?.tripDate || new Date().toLocaleDateString('es-CO')
  }));

  if (currentTrip.value) {
    travelStore.addPhotosToTrip(currentTrip.value.id, uploadedList);
  }

  emit('photos-uploaded', uploadedList);
  target.value = ''; // Reset input
}

function openLightbox(url: string) {
  lightboxPhoto.value = url;
}

function closeLightbox() {
  lightboxPhoto.value = null;
}
</script>

<template>
  <div class="bg-white rounded-3xl p-8 shadow-[0_15px_35px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-800">
          Galería Fotográfica de la Visita ({{ photos.length }})
        </h3>
        <p class="text-xs text-slate-500">
          Recuerdos familiares en {{ municipalityName }}
        </p>
      </div>

      <!-- Upload button if photos already exist -->
      <label
        v-if="currentTrip?.photos && currentTrip.photos.length > 0"
        class="cursor-pointer py-2 px-4 bg-[#F44566] text-white rounded-full text-xs font-bold hover:bg-[#e03757] transition-all flex items-center gap-1.5 shadow-md shadow-[#F44566]/25"
      >
        <span>📷 Subir Fotos</span>
        <input
          type="file"
          multiple
          accept="image/*"
          class="hidden"
          @change="handleFileUpload"
        />
      </label>
    </div>

    <!-- Empty State when currentTrip.photos.length === 0 -->
    <div
      v-if="!currentTrip?.photos || currentTrip.photos.length === 0"
      class="border-2 border-dashed border-rose-200 rounded-3xl p-8 text-center bg-white/50 flex flex-col items-center justify-center my-6 space-y-3"
    >
      <span class="text-4xl select-none" role="img" aria-label="cámara">📸</span>
      <h4 class="text-base font-bold text-slate-800">
        Aún no has agregado fotos de este viaje
      </h4>
      <p class="text-xs text-slate-500 max-w-sm leading-relaxed">
        Sube las fotos familiares de tu visita para empezar a llenar tu álbum de recuerdos
      </p>
      <label class="mt-2 cursor-pointer py-2.5 px-6 bg-[#F44566] hover:bg-[#e03757] text-white rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-[#F44566]/25 active:scale-95 cursor-pointer">
        <span>📷 Subir fotos</span>
        <input
          type="file"
          multiple
          accept="image/*"
          class="hidden"
          @change="handleFileUpload"
        />
      </label>
    </div>

    <!-- Photo Gallery Grid (Only displayed when user has uploaded photos) -->
    <div
      v-else-if="currentTrip?.photos && currentTrip.photos.length > 0"
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
    >
      <div
        v-for="photo in photos"
        :key="photo.id"
        @click="openLightbox(photo.url)"
        class="group relative h-48 rounded-2xl overflow-hidden bg-slate-100 cursor-pointer shadow-sm hover:shadow-md transition-all"
      >
        <img
          :src="photo.url"
          :alt="photo.caption || 'Foto'"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <span class="text-white text-xs font-medium truncate">
            {{ photo.caption || 'Ver en detalle' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Lightbox Modal -->
    <div
      v-if="lightboxPhoto"
      class="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
      @click.self="closeLightbox"
    >
      <div class="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
        <button
          type="button"
          @click="closeLightbox"
          class="absolute -top-10 right-0 text-white font-bold text-lg hover:text-rose-400 transition-colors cursor-pointer"
        >
          ✕ Cerrar
        </button>
        <img
          :src="lightboxPhoto"
          alt="Foto ampliada"
          class="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
        />
      </div>
    </div>
  </div>
</template>
