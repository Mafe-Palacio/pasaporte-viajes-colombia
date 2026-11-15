import React from 'react';
import { WifiOff, AlertTriangle, X, RefreshCw, Loader2 } from 'lucide-react';

interface ConnectionBannerProps {
    online: boolean;
    pendingChanges: number;
    errorMessage: string | null;
    onRetry: () => void;
    onDismissError: () => void;
}

/** Avisos fijos arriba: servidor sin conexión, cambios sin guardar y errores del servidor. */
export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
    online,
    pendingChanges,
    errorMessage,
    onRetry,
    onDismissError
}) => {
    if (online && !errorMessage && pendingChanges === 0) return null;

    return (
        <div className="fixed top-0 inset-x-0 z-[200] flex flex-col items-center gap-2 p-2 pointer-events-none">
            {!online && (
                <div
                    role="alert"
                    className="pointer-events-auto max-w-2xl w-full bg-[#B42318] text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 text-sm"
                >
                    <WifiOff className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-bold">Sin conexión con el servidor</p>
                        <p className="text-xs opacity-90">
                            {pendingChanges > 0
                                ? `Tus últimos cambios (${pendingChanges}) aún no se han guardado. Se enviarán solos cuando el servidor responda.`
                                : 'Los cambios no se guardarán hasta que vuelva la conexión. Reintentando automáticamente…'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reintentar
                    </button>
                </div>
            )}

            {online && pendingChanges > 0 && (
                <div className="pointer-events-auto bg-white/95 dark:bg-[#1E2228] text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-full shadow-md px-4 py-1.5 flex items-center gap-2 text-xs font-semibold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Guardando cambios…
                </div>
            )}

            {errorMessage && (
                <div
                    role="alert"
                    className="pointer-events-auto max-w-2xl w-full bg-[#7A2E0E] text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 text-sm"
                >
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p className="flex-1 text-xs sm:text-sm">{errorMessage}</p>
                    <button
                        type="button"
                        onClick={onDismissError}
                        aria-label="Cerrar aviso"
                        className="p-1 rounded-full hover:bg-white/20 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};
