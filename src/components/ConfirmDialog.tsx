import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Trash2 } from 'lucide-react';

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    loading?: boolean;
    loadingLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    children?: React.ReactNode;
}

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])'
].join(', ');

const EXIT_ANIMATION_MS = 200;

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    title,
    description,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    destructive = false,
    loading = false,
    loadingLabel,
    onConfirm,
    onCancel,
    children
}) => {
    const [shouldRender, setShouldRender] = useState(open);
    const [isVisible, setIsVisible] = useState(open);
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const onCancelRef = useRef(onCancel);
    onCancelRef.current = onCancel;

    const titleId = useId();
    const descId = useId();

    useEffect(() => {
        const prefersReducedMotion =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (open) {
            setShouldRender(true);
            if (prefersReducedMotion) {
                setIsVisible(true);
                return;
            }
            const raf = window.requestAnimationFrame(() => {
                setIsVisible(true);
            });
            return () => window.cancelAnimationFrame(raf);
        }

        setIsVisible(false);
        if (prefersReducedMotion) {
            setShouldRender(false);
            return;
        }
        const timer = window.setTimeout(() => {
            setShouldRender(false);
        }, EXIT_ANIMATION_MS);
        return () => window.clearTimeout(timer);
    }, [open]);

    useEffect(() => {
        if (!open || !shouldRender) return;
        const raf = window.requestAnimationFrame(() => {
            cancelButtonRef.current?.focus();
        });
        return () => window.cancelAnimationFrame(raf);
    }, [open, shouldRender]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                if (!loading) {
                    onCancelRef.current();
                }
                return;
            }

            if (e.key !== 'Tab') return;

            const container = dialogRef.current;
            if (!container) return;

            const focusable = (
                Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[]
            ).filter((el) => el.offsetParent !== null || el === document.activeElement);

            if (focusable.length === 0) {
                e.preventDefault();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement as HTMLElement | null;

            if (!active || !container.contains(active)) {
                e.preventDefault();
                first.focus();
                return;
            }

            if (e.shiftKey) {
                if (active === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else if (active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [open, loading]);

    if (!shouldRender) return null;

    const resolvedLoadingLabel = loadingLabel || (destructive ? 'Eliminando…' : 'Procesando…');

    const content = (
        <div
            onClick={() => {
                if (!loading && open) {
                    onCancel();
                }
            }}
            className={`fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${
                isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
        >
            <div
                ref={dialogRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-sm rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#1E2228] text-slate-800 dark:text-zinc-100 border border-slate-200/80 dark:border-zinc-800 shadow-2xl text-center space-y-4 transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                    isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
            >
                {destructive && (
                    <div
                        aria-hidden="true"
                        className="w-14 h-14 rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-100 dark:border-red-900/50 flex items-center justify-center mx-auto"
                    >
                        <Trash2 className="w-6 h-6" />
                    </div>
                )}

                <div className="space-y-1.5">
                    <h4
                        id={titleId}
                        className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100"
                    >
                        {title}
                    </h4>
                    <p
                        id={descId}
                        className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed"
                    >
                        {description}
                    </p>
                </div>

                {children && <div className="pt-1">{children}</div>}

                <div className="flex flex-col sm:flex-row-reverse gap-2.5 pt-2">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={onConfirm}
                        style={
                            !destructive
                                ? { backgroundColor: 'var(--color-accent)' }
                                : undefined
                        }
                        className={`w-full sm:flex-1 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1E2228] ${
                            destructive
                                ? 'bg-red-600 hover:bg-red-700 active:scale-[0.98] disabled:active:scale-100 shadow-md shadow-red-600/20 focus-visible:ring-red-500'
                                : 'hover:brightness-110 active:scale-[0.98] disabled:active:scale-100 shadow-md focus-visible:ring-[var(--color-accent)]'
                        }`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                                <span>{resolvedLoadingLabel}</span>
                            </>
                        ) : (
                            <span>{confirmLabel}</span>
                        )}
                    </button>

                    <button
                        ref={cancelButtonRef}
                        type="button"
                        disabled={loading}
                        onClick={onCancel}
                        className="w-full sm:flex-1 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#282D35] text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-zinc-500"
                    >
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(content, document.body);
    }

    return content;
};
