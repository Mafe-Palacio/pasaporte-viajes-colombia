/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** URL base del backend en C#, ej. https://localhost:7080 o la URL de ngrok (con o sin /api). */
    readonly VITE_API_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
