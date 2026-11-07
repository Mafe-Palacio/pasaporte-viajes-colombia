// Type declarations for Vue 3 & Pinia code deliverables
declare module 'vue' {
  export function ref<T>(value?: T): { value: T };
  export function computed<T>(getter: () => T): { readonly value: T };
  export function onMounted(callback: () => void): void;
  export function onBeforeUnmount(callback: () => void): void;
  export function defineProps<T>(): T;
  export function defineEmits<T>(): T;
}

declare module 'pinia' {
  export function defineStore<Id extends string, SS>(id: Id, storeSetup: () => SS): () => SS;
}

declare module 'vue-router' {
  export interface RouteLocationNormalized {
    path: string;
    name?: string;
    meta?: Record<string, any>;
  }
  export interface NavigationGuardNext {
    (to?: string | false | void | { path: string }): void;
  }
  export interface Router {
    beforeEach: (guard: (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => void) => void;
    push: (to: string) => Promise<any>;
    replace: (to: string) => Promise<any>;
  }
  export function createRouter(options: any): Router;
  export function createWebHistory(base?: string): any;
  export function useRouter(): Router;
  export function useRoute(): RouteLocationNormalized;
}

declare module '*.vue' {
  const component: any;
  export default component;
}

