import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, RefreshCw } from 'lucide-react';

export interface DoneButtonProps {
    dirty: boolean;
    isSaving: boolean;
    hasSyncProblem: boolean;
    onDone: () => void;
    onRetry: () => void;
}

export const DoneButton: React.FC<DoneButtonProps> = ({
    dirty,
    isSaving,
    hasSyncProblem,
    onDone,
    onRetry
}) => {
    const [showSaving, setShowSaving] = useState(false);
    const savingShownAtRef = useRef<number | null>(null);

    useEffect(() => {
        if (hasSyncProblem) {
            savingShownAtRef.current = null;
            setShowSaving(false);
            return;
        }

        if (isSaving) {
            if (showSaving) return;
            const showTimer = window.setTimeout(() => {
                savingShownAtRef.current = Date.now();
                setShowSaving(true);
            }, 400);
            return () => window.clearTimeout(showTimer);
        }

        if (showSaving) {
            const elapsed = savingShownAtRef.current ? Date.now() - savingShownAtRef.current : 600;
            const remaining = Math.max(0, 600 - elapsed);
            const hideTimer = window.setTimeout(() => {
                savingShownAtRef.current = null;
                setShowSaving(false);
            }, remaining);
            return () => window.clearTimeout(hideTimer);
        }
    }, [isSaving, hasSyncProblem, showSaving]);

    const isRetryState = hasSyncProblem;
    const isShowingSaving = !isRetryState && showSaving;
    const isWaitingFastSave = !isRetryState && !showSaving && isSaving;
    const isReadyToConfirm = !isRetryState && !showSaving && !isSaving && dirty;
    const isCleanDisabled = !isRetryState && !showSaving && !isSaving && !dirty;
    const isButtonDisabled = isShowingSaving || isWaitingFastSave || isCleanDisabled;

    return (
        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col items-center mb-14 sm:mb-0">
            <button
                type="button"
                disabled={isButtonDisabled}
                aria-disabled={isButtonDisabled}
                aria-live="polite"
                title={isCleanDisabled ? 'No hay cambios por guardar' : undefined}
                onClick={() => {
                    if (isRetryState) {
                        onRetry();
                    } else if (isReadyToConfirm) {
                        onDone();
                    }
                }}
                style={
                    isReadyToConfirm
                        ? { backgroundColor: 'var(--color-accent)', color: '#ffffff' }
                        : undefined
                }
                className={`w-full sm:w-auto sm:min-w-[220px] py-2.5 px-6 rounded-full text-xs font-bold transition-colors duration-300 flex items-center justify-center gap-2 ${
                    isRetryState
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:hover:bg-amber-900/70 dark:text-amber-200 dark:border-amber-700/70 shadow-sm cursor-pointer active:scale-[0.98]'
                        : isShowingSaving || isWaitingFastSave
                            ? 'bg-slate-200/90 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 cursor-not-allowed'
                            : isReadyToConfirm
                                ? 'hover:brightness-110 shadow-md cursor-pointer active:scale-[0.98]'
                                : 'bg-slate-100 text-slate-400 dark:bg-zinc-800/80 dark:text-zinc-500 border border-slate-200 dark:border-zinc-700/80 cursor-not-allowed'
                }`}
            >
                {isRetryState ? (
                    <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Reintentar</span>
                    </>
                ) : isShowingSaving ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando…</span>
                    </>
                ) : (
                    <>
                        <Check className={`w-4 h-4 ${isCleanDisabled || isWaitingFastSave ? 'opacity-60' : ''}`} />
                        <span>Listo</span>
                    </>
                )}
            </button>
        </div>
    );
};
