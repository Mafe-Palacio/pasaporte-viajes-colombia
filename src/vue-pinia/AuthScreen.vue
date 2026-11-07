<template>
  <div class="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12 bg-[#FFF0F3] dark:bg-[#121417] text-slate-800 dark:text-zinc-100 relative overflow-hidden transition-colors">
    <!-- Card de Autenticación en diseño pastel minimalista -->
    <div class="w-full max-w-[430px] bg-white dark:bg-[#1E2228] rounded-3xl p-8 sm:p-10 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white dark:border-zinc-800/80 relative z-10 animate-in fade-in zoom-in-95 duration-300">
      
      <!-- Alternador Sesión / Registro -->
      <div class="flex justify-center mb-8">
        <div class="bg-[#EDEDF2] dark:bg-[#282D35] p-1.5 rounded-full flex items-center relative w-full max-w-[340px] border border-transparent dark:border-zinc-700">
          <button
            type="button"
            @click="mode = 'login'"
            :class="[
              'flex-1 py-2 px-3 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 z-10 cursor-pointer',
              mode === 'login' ? 'bg-[#F44566] text-white shadow-md shadow-[#F44566]/30' : 'text-[#7e889b] dark:bg-transparent dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
            ]"
          >
            <span>Iniciar Sesión</span>
            <span v-if="mode === 'login'" class="w-4 h-4 rounded-full bg-white shadow-sm inline-block flex-shrink-0" />
          </button>
          <button
            type="button"
            @click="mode = 'register'"
            :class="[
              'flex-1 py-2 px-3 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 z-10 cursor-pointer',
              mode === 'register' ? 'bg-[#F44566] text-white shadow-md shadow-[#F44566]/30' : 'text-[#7e889b] dark:bg-transparent dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
            ]"
          >
            <span>Registrarme</span>
            <span v-if="mode === 'register'" class="w-4 h-4 rounded-full bg-white shadow-sm inline-block flex-shrink-0" />
          </button>
        </div>
      </div>

      <!-- Formulario -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <!-- Campo Nombre (Registro) -->
        <div v-if="mode === 'register'">
          <label class="block text-xs font-semibold text-gray-700 dark:text-zinc-200 mb-1.5 ml-1">
            Nombre o Familia
          </label>
          <input
            v-model="name"
            type="text"
            placeholder="Familia Palacio"
            class="w-full px-4 py-3 bg-white dark:bg-[#282D35] border border-rose-200 dark:border-zinc-700 rounded-2xl text-gray-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 text-sm transition-all"
            required
          />
        </div>

        <!-- Campo Email -->
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-zinc-200 mb-1.5 ml-1">
            Email
          </label>
          <input
            v-model="email"
            type="email"
            placeholder="familia.viajera@colombia.co"
            class="w-full px-4 py-3 bg-white dark:bg-[#282D35] border border-rose-200 dark:border-zinc-700 rounded-2xl text-gray-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 text-sm transition-all"
            required
          />
        </div>

        <!-- Campo Contraseña con Botón de Mostrar / Ocultar -->
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-zinc-200 mb-1.5 ml-1">
            Contraseña
          </label>
          <!-- Contenedor relative flex items-center -->
          <div class="relative flex items-center">
            <!-- Input con padding derecho pr-11 y foco sutil en tonos pastel rosado -->
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Contraseña"
              class="w-full pl-4 pr-11 py-3 bg-white dark:bg-[#282D35] border border-rose-200 dark:border-zinc-700 rounded-2xl text-gray-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 text-sm transition-all"
              required
            />

            <!-- Botón para alternar visibilidad de la contraseña -->
            <button 
              type="button" 
              @click="showPassword = !showPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 transition-colors p-1 focus:outline-none"
              :title="showPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
            >
              <!-- Icono Ojo Abierto (Cuando está visible) -->
              <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <!-- Icono Ojo Tachado (Cuando está oculta) -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Botón Enviar -->
        <button
          type="submit"
          class="w-full py-3.5 px-6 rounded-full bg-[#F44566] hover:bg-[#e03757] text-white font-bold text-sm shadow-[0_15px_30px_-5px_rgba(244,69,102,0.45)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-4"
        >
          <span>{{ mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from './useAuthStore';

const authStore = useAuthStore();

// Lógica Reactiva de visibilidad de contraseña
const showPassword = ref(false);

const mode = ref<'login' | 'register'>('login');
const name = ref('');
const email = ref('');
const password = ref('');

const emit = defineEmits<{
  (e: 'success', email: string): void;
}>();

const handleLogin = async () => {
  try {
    authStore.errorMessage = null;
    if (mode.value === 'login') {
      await authStore.login(email.value, password.value);
    } else {
      await authStore.register(name.value || 'Familia Palacio', email.value, password.value);
    }
    // Limpiar alertas de error previas y navegar inmediatamente
    authStore.errorMessage = null;
    emit('success', email.value);
    if (typeof window !== 'undefined' && (window as any).$router) {
      (window as any).$router.replace('/explorador');
    }
  } catch (err: any) {
    // Mostrar error solo si las credenciales fallan realmente
    authStore.errorMessage = err?.message || 'Error al autenticar credenciales';
  }
};
</script>
