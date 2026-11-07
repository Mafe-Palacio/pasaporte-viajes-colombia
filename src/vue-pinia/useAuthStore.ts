import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface User {
  id: string;
  name: string;
  email: string;
}

export const useAuthStore = defineStore('auth', () => {
  // ----------------------------------------------------
  // State
  // ----------------------------------------------------
  const user = ref<User | null>(
    typeof window !== 'undefined' && localStorage.getItem('auth_user')
      ? (() => {
          try {
            return JSON.parse(localStorage.getItem('auth_user')!);
          } catch {
            return null;
          }
        })()
      : null
  );
  const token = ref<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  );
  const isLoading = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);

  // ----------------------------------------------------
  // Getters / Computed
  // ----------------------------------------------------
  const isAuthenticated = computed(() => {
    if (!!token.value && !!user.value) return true;
    if (typeof window !== 'undefined' && !!localStorage.getItem('auth_token')) return true;
    return false;
  });
  const userDisplayName = computed(() => user.value?.name ?? 'Viajero');

  // ----------------------------------------------------
  // Actions
  // ----------------------------------------------------
  async function login(email: string, pass: string): Promise<boolean> {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      // Simular resolución de autenticación rápida
      await new Promise((resolve) => setTimeout(resolve, 50));

      const newToken = 'jwt_token_' + Math.random().toString(36).substring(2);
      const newUser: User = {
        id: 'user-family-1',
        name: 'Familia Palacio',
        email
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
      }

      token.value = newToken;
      user.value = newUser;
      errorMessage.value = null;
      return true;
    } catch (err: any) {
      errorMessage.value = err?.message || 'Error al iniciar sesión';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function register(name: string, email: string, pass: string): Promise<boolean> {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const newToken = 'jwt_token_' + Math.random().toString(36).substring(2);
      const newUser: User = { id: 'user-' + Date.now(), name, email };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
      }

      token.value = newToken;
      user.value = newUser;
      errorMessage.value = null;
      return true;
    } catch (err: any) {
      errorMessage.value = err?.message || 'Error al registrar usuario';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    errorMessage.value = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }

  return {
    user,
    token,
    isLoading,
    errorMessage,
    isAuthenticated,
    userDisplayName,
    login,
    register,
    logout
  };
});
