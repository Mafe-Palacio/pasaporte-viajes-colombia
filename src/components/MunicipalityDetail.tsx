import React, { useState, useMemo, useRef, useEffect } from 'react';
import { trackedObjectURL } from '../services/photoFiles';
import { newId } from '../services/api';
import html2canvas from 'html2canvas';
import {
    ArrowLeft, Plus, Camera, DollarSign,
    BookMarked, Star, X, Check, Upload, ChevronLeft, ChevronRight,
    Sparkles, MapPin, Calendar, Heart, BarChart3, FileText, Share2, Download, Printer, Trash2,
    Image as ImageIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Municipality, TripEntry, ExpenseLog, TripPhoto } from '../types';
import { useMunicipalityImage } from '../hooks/useMunicipalityImage';
import { DoneButton } from './DoneButton';
import { ConfirmDialog } from './ConfirmDialog';
import { CarIcon, PlateIcon, MoneyIcon, NotebookIcon } from './summaryIcons';
import {
    FIXED_EXPENSE_CATEGORIES,
    isTransportCategory as isTransportExpenseCategory,
    isFixedCategory as isFixedExpenseCategory,
    normalizeCategory as normalizeExpenseCategoryName
} from '../utils/expenseCategories';

type EditableVisitTab = 'gastos' | 'fotos' | 'comida' | 'transporte' | 'noolvidar';

const EMPTY_DIRTY_TABS: Record<EditableVisitTab, boolean> = {
    gastos: false,
    fotos: false,
    comida: false,
    transporte: false,
    noolvidar: false
};

interface MunicipalityDetailProps {
    municipality: Municipality;
    trips: TripEntry[];
    homeMunicipalityId?: string | null;
    onSetHomeMunicipality?: (municipalityId: string | null) => void;
    onBack: () => void;
    onSaveTrip: (trip: TripEntry) => void;
    onDeleteTrip?: (municipalityId: string, tripId: string) => void;
    onNavigateToReportes?: () => void;
    isSaving?: boolean;
    hasSyncProblem?: boolean;
    onRetrySync?: () => void;
}

const CarouselPhotoTile: React.FC<{
    photo: TripPhoto;
    index: number;
    onOpen: () => void;
}> = ({ photo, index, onOpen }) => {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        setStatus('loading');
        if (imgRef.current && imgRef.current.complete) {
            setStatus(imgRef.current.naturalWidth > 0 ? 'loaded' : 'error');
        }
    }, [photo.url]);

    return (
        <button
            type="button"
            onClick={onOpen}
            className="group relative h-36 sm:h-40 aspect-[4/3] shrink-0 snap-start rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-[#FFE4EA] dark:border-zinc-700 transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            aria-label={photo.caption ? `Abrir foto: ${photo.caption}` : `Abrir foto ${index + 1}`}
        >
            {status === 'loading' && (
                <div className="absolute inset-0 bg-slate-200 dark:bg-zinc-700 animate-pulse" />
            )}
            {status === 'error' ? (
                <div className="w-full h-full bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex flex-col items-center justify-center gap-1 p-2">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-[10px] font-medium">No disponible</span>
                </div>
            ) : (
                <img
                    ref={imgRef}
                    src={photo.url}
                    alt={photo.caption || `Foto ${index + 1}`}
                    loading="lazy"
                    onLoad={() => setStatus('loaded')}
                    onError={() => setStatus('error')}
                    className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
                        status === 'loaded' ? 'opacity-100' : 'opacity-0'
                    }`}
                    referrerPolicy="no-referrer"
                />
            )}
        </button>
    );
};

const ResumenPhotosCarousel: React.FC<{
    photos: TripPhoto[];
    onOpenPhoto: (index: number) => void;
    onGoToPhotosTab: () => void;
}> = ({ photos, onOpenPhoto, onGoToPhotosTab }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) {
            setCanScrollLeft(false);
            setCanScrollRight(false);
            return;
        }

        const updateScrollButtons = () => {
            const maxScroll = el.scrollWidth - el.clientWidth;
            setCanScrollLeft(el.scrollLeft > 4);
            setCanScrollRight(maxScroll - el.scrollLeft > 4);
        };

        const rafId = requestAnimationFrame(updateScrollButtons);
        el.addEventListener('scroll', updateScrollButtons, { passive: true });
        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(updateScrollButtons)
            : null;
        observer?.observe(el);

        return () => {
            cancelAnimationFrame(rafId);
            el.removeEventListener('scroll', updateScrollButtons);
            observer?.disconnect();
        };
    }, [photos.length]);

    const scrollByPage = (direction: -1 | 1) => {
        const el = scrollRef.current;
        if (!el) return;
        const step = Math.max(el.clientWidth * 0.85, 220);
        el.scrollBy({ left: direction * step, behavior: 'smooth' });
    };

    if (photos.length === 0) {
        return (
            <button
                type="button"
                onClick={onGoToPhotosTab}
                className="group w-full h-36 rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-600 bg-slate-900/[0.04] hover:bg-slate-900/[0.08] dark:bg-zinc-900/80 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 px-4 cursor-pointer"
            >
                <span className="w-10 h-10 rounded-full flex items-center justify-center bg-accent-soft-tint text-accent-readable group-hover:scale-110 transition-transform shrink-0">
                    <Plus className="w-5 h-5" />
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-200">
                    Aún no hay fotos · Añadir recuerdos
                </span>
            </button>
        );
    }

    return (
        <div className="relative group/carousel">
            {canScrollLeft && (
                <button
                    type="button"
                    onClick={() => scrollByPage(-1)}
                    className="hidden md:flex absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/95 dark:bg-zinc-900/95 text-slate-800 dark:text-zinc-100 border border-rose-100 dark:border-zinc-700 shadow-lg items-center justify-center hover:scale-105 transition-all cursor-pointer"
                    aria-label="Desplazar fotos a la izquierda"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
            )}

            <div
                ref={scrollRef}
                className="flex items-stretch gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar py-1"
            >
                {photos.map((photo, idx) => (
                    <CarouselPhotoTile
                        key={photo.id}
                        photo={photo}
                        index={idx}
                        onOpen={() => onOpenPhoto(idx)}
                    />
                ))}

                <button
                    type="button"
                    onClick={onGoToPhotosTab}
                    className="group h-36 sm:h-40 aspect-[4/3] shrink-0 snap-start rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-600 bg-slate-900/[0.05] hover:bg-slate-900/[0.1] dark:bg-zinc-900/85 dark:hover:bg-zinc-800 transition-all flex flex-col items-center justify-center gap-2 p-3 text-center cursor-pointer"
                >
                    <span className="w-9 h-9 rounded-full flex items-center justify-center bg-accent-soft-tint text-accent-readable group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 leading-tight">
                        Añadir recuerdos
                    </span>
                </button>
            </div>

            {canScrollRight && (
                <button
                    type="button"
                    onClick={() => scrollByPage(1)}
                    className="hidden md:flex absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/95 dark:bg-zinc-900/95 text-slate-800 dark:text-zinc-100 border border-rose-100 dark:border-zinc-700 shadow-lg items-center justify-center hover:scale-105 transition-all cursor-pointer"
                    aria-label="Desplazar fotos a la derecha"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export const MunicipalityDetail: React.FC<MunicipalityDetailProps> = ({
    municipality,
    trips,
    homeMunicipalityId,
    onSetHomeMunicipality,
    onBack,
    onSaveTrip,
    onDeleteTrip,
    onNavigateToReportes,
    isSaving = false,
    hasSyncProblem = false,
    onRetrySync
}) => {
    const isHome = Boolean(
        municipality.isHome ||
        (homeMunicipalityId && (homeMunicipalityId === municipality.id || homeMunicipalityId === municipality.code))
    );

    const [selectedTripIndex, setSelectedTripIndex] = useState(
        trips.length > 0 ? trips.length - 1 : 0
    );
    const [activeTab, setActiveTab] = useState<'resumen' | 'gastos' | 'comida' | 'transporte' | 'noolvidar' | 'fotos'>('resumen');
    const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [dirtyTabs, setDirtyTabs] = useState<Record<EditableVisitTab, boolean>>(EMPTY_DIRTY_TABS);

    const tabsBarRef = useRef<HTMLDivElement>(null);

    const markTabDirty = (tab: EditableVisitTab) => {
        setDirtyTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
    };

    const handleTabDone = (tab: EditableVisitTab) => {
        setDirtyTabs((prev) => ({ ...prev, [tab]: false }));
        setActiveTab('resumen');
        requestAnimationFrame(() => {
            tabsBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    // Home city change confirmation state
    const [showHomeChangeConfirm, setShowHomeChangeConfirm] = useState(false);

    // Deletion confirmation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Photo deletion confirmation state
    const [photoToDelete, setPhotoToDelete] = useState<TripPhoto | null>(null);
    const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
    const photoTileRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const emptyPhotosUploadRef = useRef<HTMLLabelElement | null>(null);
    const openPhotosContextRef = useRef<{ tripId: string; photoIdsKey: string } | null>(null);
    const restorePhotoFocusRef = useRef<{ canceledId: string; deletedNextId: string | null } | null>(null);
    const sawSavingOnPhotoDeleteRef = useRef(false);

    // New visit modal state
    const getTodayIsoDate = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatSafePassportDate = (dateVal: string): string => {
        if (!dateVal) return '08/Sep/2026';
        // If already in DD/MMM/YYYY format
        if (/^\d{1,2}\/[A-Za-z]{3}\/\d{4}$/.test(dateVal)) {
            return dateVal;
        }
        // If YYYY-MM-DD from native date picker
        const parts = dateVal.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const monthIndex = parseInt(parts[1], 10) - 1;
            const day = parts[2].padStart(2, '0');
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const monthName = months[monthIndex] || 'Ene';
            return `${day}/${monthName}/${year}`;
        }
        return dateVal;
    };

    const passportToIsoDate = (dateVal?: string): string => {
        if (!dateVal) return getTodayIsoDate();
        if (/^\d{4}-\d{2}-\d{2}/.test(dateVal)) return dateVal.slice(0, 10);
        const match = dateVal.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
        if (match) {
            const day = match[1].padStart(2, '0');
            const mon = match[2].toLowerCase();
            const monthsEs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            const monthsEn = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            let idx = monthsEs.indexOf(mon);
            if (idx < 0) idx = monthsEn.indexOf(mon);
            if (idx >= 0) return `${match[3]}-${String(idx + 1).padStart(2, '0')}-${day}`;
        }
        return getTodayIsoDate();
    };

    const [showNewVisitModal, setShowNewVisitModal] = useState(false);
    const [newVisitDate, setNewVisitDate] = useState(getTodayIsoDate);
    const [newVisitSummary, setNewVisitSummary] = useState('');

    const openNewVisitModal = () => {
        setNewVisitDate(getTodayIsoDate());
        setNewVisitSummary('');
        setShowNewVisitModal(true);
    };

    // Story & PDF States
    const [showStoryModal, setShowStoryModal] = useState(false);
    const [isGeneratingStory, setIsGeneratingStory] = useState(false);
    const storyCardRef = useRef<HTMLDivElement>(null);

    // Clamp index safely
    const safeIndex = trips.length > 0 ? Math.min(selectedTripIndex, trips.length - 1) : 0;
    const currentTrip = trips[safeIndex];

    const firstTripPhotoUrl = useMemo(() => {
        if (currentTrip?.photos && currentTrip.photos.length > 0 && currentTrip.photos[0]?.url) {
            return currentTrip.photos[0].url;
        }
        const anyPhotoTrip = trips.find((t) => t.photos && t.photos.length > 0 && t.photos[0]?.url);
        return anyPhotoTrip?.photos?.[0]?.url;
    }, [currentTrip, trips]);

    const {
        ref: storyImageRef,
        imageUrl: storyImageUrl,
        description: storyDescription,
        isLoading: storyImageLoading,
        onImageError: onStoryImageError
    } = useMunicipalityImage({
        municipalityId: municipality.id,
        municipalityName: municipality.name,
        departmentName: municipality.departmentName,
        userPhotoUrl: firstTripPhotoUrl,
        curatedDescription: municipality.description,
        disabled: !showStoryModal
    });

    // Adjust selected index reactively if trips count changes
    React.useEffect(() => {
        if (trips.length > 0 && selectedTripIndex >= trips.length) {
            setSelectedTripIndex(Math.max(0, trips.length - 1));
        }
    }, [trips.length, selectedTripIndex]);

    React.useEffect(() => {
        setLightboxIndex(null);
        setLightboxPhoto(null);
    }, [currentTrip?.id]);

    useEffect(() => {
        setDirtyTabs(EMPTY_DIRTY_TABS);
    }, [activeTab, currentTrip?.id]);

    const restoreFocusAfterPhotoDialog = (wasDeleted: boolean) => {
        const info = restorePhotoFocusRef.current;
        restorePhotoFocusRef.current = null;
        requestAnimationFrame(() => {
            const targetId = wasDeleted ? info?.deletedNextId : info?.canceledId;
            if (targetId && photoTileRefs.current[targetId]) {
                photoTileRefs.current[targetId]?.focus();
            } else if (wasDeleted && emptyPhotosUploadRef.current) {
                emptyPhotosUploadRef.current.focus();
            }
        });
    };

    const requestDeletePhoto = (photo: TripPhoto, index: number) => {
        if (!currentTrip || photoToDelete || isDeletingPhoto) return;
        const photos = currentTrip.photos || [];
        const nextCandidateId =
            photos.length > 1
                ? photos[index + 1]?.id ?? photos[index - 1]?.id ?? null
                : null;
        restorePhotoFocusRef.current = {
            canceledId: photo.id,
            deletedNextId: nextCandidateId
        };
        openPhotosContextRef.current = {
            tripId: currentTrip.id,
            photoIdsKey: photos.map((p) => p.id).join('|')
        };
        setPhotoToDelete(photo);
    };

    const handleCancelDeletePhoto = () => {
        if (isDeletingPhoto) return;
        setPhotoToDelete(null);
        openPhotosContextRef.current = null;
        restoreFocusAfterPhotoDialog(false);
    };

    const handleConfirmDeletePhoto = () => {
        if (!photoToDelete || !currentTrip || isDeletingPhoto) return;
        const targetId = photoToDelete.id;
        const nextPhotos = (currentTrip.photos || []).filter((p) => p.id !== targetId);
        sawSavingOnPhotoDeleteRef.current = Boolean(isSaving);
        setIsDeletingPhoto(true);
        markTabDirty('fotos');
        onSaveTrip({
            ...currentTrip,
            photos: nextPhotos
        });
    };

    // Guard: close confirmation dialog safely if photos list changes externally while open
    useEffect(() => {
        if (!photoToDelete || isDeletingPhoto) return;
        const photos = currentTrip?.photos || [];
        const snapshot = openPhotosContextRef.current;
        const currentKey = photos.map((p) => p.id).join('|');
        if (
            activeTab !== 'fotos' ||
            !currentTrip ||
            !snapshot ||
            currentTrip.id !== snapshot.tripId ||
            currentKey !== snapshot.photoIdsKey ||
            !photos.some((p) => p.id === photoToDelete.id)
        ) {
            setPhotoToDelete(null);
            openPhotosContextRef.current = null;
            restorePhotoFocusRef.current = null;
        }
    }, [photoToDelete, isDeletingPhoto, activeTab, currentTrip]);

    // Finish deletion state cleanly (and never stay stuck loading if backend is offline)
    useEffect(() => {
        if (!isDeletingPhoto) return;

        if (isSaving) {
            sawSavingOnPhotoDeleteRef.current = true;
        }

        const finishDeleteDialog = () => {
            setIsDeletingPhoto(false);
            setPhotoToDelete(null);
            openPhotosContextRef.current = null;
            restoreFocusAfterPhotoDialog(true);
        };

        if (hasSyncProblem) {
            const offlineTimer = window.setTimeout(finishDeleteDialog, 180);
            return () => window.clearTimeout(offlineTimer);
        }

        if (sawSavingOnPhotoDeleteRef.current && !isSaving) {
            finishDeleteDialog();
            return;
        }

        const fallbackDelay = isSaving ? 4000 : 300;
        const safetyTimer = window.setTimeout(finishDeleteDialog, fallbackDelay);
        return () => window.clearTimeout(safetyTimer);
    }, [isDeletingPhoto, isSaving, hasSyncProblem]);

    const openPhotoLightbox = (index: number) => {
        const photos = currentTrip?.photos || [];
        if (index < 0 || index >= photos.length) return;
        setLightboxIndex(index);
        setLightboxPhoto(photos[index].url);
    };

    const closeLightbox = () => {
        setLightboxIndex(null);
        setLightboxPhoto(null);
    };

    useEffect(() => {
        if (!lightboxPhoto) return;
        const photos = currentTrip?.photos || [];
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeLightbox();
                return;
            }
            if (photos.length <= 1) return;
            const currentIdx =
                lightboxIndex !== null && lightboxIndex < photos.length
                    ? lightboxIndex
                    : photos.findIndex((p) => p.url === lightboxPhoto);
            if (currentIdx < 0) return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const nextIdx = (currentIdx - 1 + photos.length) % photos.length;
                setLightboxIndex(nextIdx);
                setLightboxPhoto(photos[nextIdx].url);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const nextIdx = (currentIdx + 1) % photos.length;
                setLightboxIndex(nextIdx);
                setLightboxPhoto(photos[nextIdx].url);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [lightboxPhoto, lightboxIndex, currentTrip?.photos]);

    // Handle trip deletion
    const handleDeleteTripConfirmed = () => {
        if (!currentTrip) return;
        const tripToDeleteId = currentTrip.id;
        const currentIdx = safeIndex;

        // Call onDeleteTrip callback prop
        if (onDeleteTrip) {
            onDeleteTrip(municipality.id, tripToDeleteId);
        }

        // Also invoke travelStore.removeTrip if Pinia store is mounted or globally available
        try {
            const piniaStore = (window as any).__travelStore;
            if (piniaStore && typeof piniaStore.removeTrip === 'function') {
                piniaStore.removeTrip(municipality.id, tripToDeleteId);
            }
        } catch (e) {
            console.warn('travelStore.removeTrip invocation handled', e);
        }

        setShowDeleteConfirm(false);

        // If other trips remain, automatically select the most recent previous visit
        if (trips.length > 1) {
            const nextIndex = Math.max(0, currentIdx - 1);
            setSelectedTripIndex(nextIndex);
        } else {
            setSelectedTripIndex(0);
        }
    };

    // Local state for interactive transport tab
    const [transportRoadCondition, setTransportRoadCondition] = useState<string>('Buena');
    const [transportTollCount, setTransportTollCount] = useState<number>(0);
    const [transportMode, setTransportMode] = useState<string>('Carro propio');
    const [transportNotes, setTransportNotes] = useState<string>('');
    const [isTransportSavedFeedback, setIsTransportSavedFeedback] = useState(false);

    // Synchronize local transport state with selected trip
    React.useEffect(() => {
        if (currentTrip) {
            setTransportRoadCondition(
                currentTrip.transport?.roadCondition || currentTrip.roadCondition || 'Buena'
            );
            setTransportTollCount(
                currentTrip.transport?.tollCount ?? currentTrip.tollCount ?? (currentTrip.hasTolls ? 1 : 0)
            );
            setTransportMode(
                currentTrip.transport?.transportMode || currentTrip.transportMode || 'Carro propio'
            );
            setTransportNotes(
                currentTrip.transport?.notes ?? currentTrip.transportNotes ?? ''
            );
        }
    }, [currentTrip?.id, selectedTripIndex]);

    // Save transport changes handler
    const handleSaveTransport = () => {
        if (!currentTrip) return;
        const updatedTrip: TripEntry = {
            ...currentTrip,
            roadCondition: transportRoadCondition,
            tollCount: transportTollCount,
            hasTolls: transportTollCount > 0,
            transportMode: transportMode,
            transportNotes: transportNotes,
            transport: {
                roadCondition: transportRoadCondition,
                tollCount: transportTollCount,
                hasTolls: transportTollCount > 0,
                transportMode: transportMode,
                notes: transportNotes
            }
        };
        onSaveTrip(updatedTrip);
        markTabDirty('transporte');
        setIsTransportSavedFeedback(true);
        setTimeout(() => setIsTransportSavedFeedback(false), 2500);
    };

    // Dynamic calculation of accumulated expenses
    const totalExpensesCop = useMemo(() => {
        if (!currentTrip || !currentTrip.expenses) return 0;
        return currentTrip.expenses.reduce((sum, exp) => sum + (Number(exp.amountCop) || 0), 0);
    }, [currentTrip]);

    // Formatter for Colombian Pesos (COP)
    const formatCOP = (val: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(val).replace('COP', '').trim();
    };

    const formatThousands = (val: number) => {
        return new Intl.NumberFormat('es-CO', {
            maximumFractionDigits: 0
        }).format(Math.max(0, Math.round(val || 0)));
    };

    const parseCopInput = (raw: string): number => {
        const cleaned = raw.replace(/[^\d.,]/g, '');
        if (!cleaned) return 0;
        if (/^\d{1,3}([.,]\d{3})+([.,]\d{1,2})?$/.test(cleaned)) {
            const withoutDecimals = cleaned.replace(/([.,]\d{3})[.,]\d{1,2}$/, '$1');
            return Math.max(0, parseInt(withoutDecimals.replace(/[.,]/g, ''), 10) || 0);
        }
        return Math.max(0, parseInt(cleaned.replace(/[.,]/g, ''), 10) || 0);
    };

    const [draftExtraExpenses, setDraftExtraExpenses] = useState<ExpenseLog[]>([]);
    const [extraNameDrafts, setExtraNameDrafts] = useState<Record<string, string>>({});
    const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
    const [expenseRowErrors, setExpenseRowErrors] = useState<Record<string, string>>({});
    const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState<string | null>(null);
    const pendingFocusExpenseIdRef = useRef<string | null>(null);
    const pendingFocusAmountIdRef = useRef<string | null>(null);
    const extraNameInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const extraAmountInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        setDraftExtraExpenses([]);
        setExtraNameDrafts({});
        setAmountDrafts({});
        setExpenseRowErrors({});
        setConfirmDeleteExpenseId(null);
    }, [currentTrip?.id]);

    useEffect(() => {
        const focusNameId = pendingFocusExpenseIdRef.current;
        if (focusNameId) {
            const el = extraNameInputRefs.current[focusNameId];
            if (el) {
                el.focus();
                pendingFocusExpenseIdRef.current = null;
            }
        }
        const focusAmountId = pendingFocusAmountIdRef.current;
        if (focusAmountId) {
            const el = extraAmountInputRefs.current[focusAmountId];
            if (el) {
                el.focus();
                pendingFocusAmountIdRef.current = null;
            }
        }
    }, [draftExtraExpenses, currentTrip?.expenses]);

    // Sync custom expense categories across visits for consistent suggestions
    const suggestedExtraCategories = useMemo(() => {
        const DEFAULT_SUGGESTIONS = ['Gasolina', 'Entradas', 'Parqueadero', 'Recuerdos', 'Propinas'];
        const STORAGE_KEY = 'pasaporte_expense_cats_by_trip';
        let storedByTrip: Record<string, string[]> = {};

        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    storedByTrip = parsed;
                }
            }
        } catch {
            // ignore storage errors
        }

        trips.forEach((t) => {
            const customCats = (t.expenses || [])
                .map((e) => (e.category || '').trim())
                .filter((cat) => cat.length > 0 && !isFixedExpenseCategory(cat) && cat.toLowerCase() !== 'otros')
                .map((cat) => normalizeExpenseCategoryName(cat));
            storedByTrip[t.id] = customCats;
        });

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(storedByTrip));
        } catch {
            // ignore storage errors
        }

        const counts = new Map<string, { label: string; count: number }>();
        Object.values(storedByTrip).forEach((catList) => {
            if (!Array.isArray(catList)) return;
            catList.forEach((rawCat) => {
                const label = normalizeExpenseCategoryName(rawCat);
                if (isFixedExpenseCategory(label) || label.toLowerCase() === 'otros') return;
                const key = label.toLowerCase();
                const existing = counts.get(key);
                if (existing) {
                    existing.count += 1;
                } else {
                    counts.set(key, { label, count: 1 });
                }
            });
        });

        const sortedUserNames = Array.from(counts.values())
            .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.label.localeCompare(b.label, 'es')))
            .map((entry) => entry.label);

        const seen = new Set(sortedUserNames.map((n) => n.toLowerCase()));
        const combined = [...sortedUserNames];
        DEFAULT_SUGGESTIONS.forEach((def) => {
            if (!seen.has(def.toLowerCase())) {
                seen.add(def.toLowerCase());
                combined.push(def);
            }
        });
        return combined;
    }, [trips]);

    // Trigger celebratory passport stamp animation
    const handleStampCelebration = () => {
        confetti({
            particleCount: 65,
            spread: 70,
            origin: { y: 0.25 },
            colors: ['#F44566', '#FEA38E', '#F6EBD0', '#FFBDC9']
        });
    };

    // Add new trip handler
    const handleAddNewTrip = () => {
        const newTripNumber = trips.length + 1;
        const formattedTripDate = formatSafePassportDate(newVisitDate);
        const newTripId = newId();
        const newTrip: TripEntry = {
            id: newTripId,
            municipalityId: municipality.id,
            municipalityName: municipality.name,
            departmentName: municipality.departmentName,
            userId: 'user-family-1',
            tripDate: formattedTripDate,
            label: `Visita ${newTripNumber}: ${formattedTripDate}`,
            rating: 5,
            summary: newVisitSummary || `Nueva expedición a ${municipality.name}.`,
            foodReview: 'Excelente experiencia gastronómica local.',
            favoriteDish: 'Plato tradicional de la región',
            transportNotes: '',
            roadCondition: 'Buena',
            hasTolls: false,
            tollCount: 0,
            transportMode: 'Carro propio',
            transport: {
                roadCondition: 'Buena',
                tollCount: 0,
                hasTolls: false,
                transportMode: 'Carro propio',
                notes: ''
            },
            doNotForgetNotes: '',
            expenses: [
                {
                    id: newId(),
                    tripEntryId: newTripId,
                    category: 'Comida',
                    amountCop: 50000,
                    date: formattedTripDate,
                    notes: 'Almuerzo familiar'
                }
            ],
            photos: [] // Strictly empty by default - no mock photos
        };

        onSaveTrip(newTrip);
        setShowNewVisitModal(false);
        setSelectedTripIndex(trips.length);
        handleStampCelebration();
    };

    // Print PDF handler using standard browser print with passport print style
    const handlePrintPDF = () => {
        window.print();
    };

    // Generate Instagram Story card as 9:16 PNG using html2canvas
    const handleDownloadStory = async () => {
        if (!storyCardRef.current) return;
        setIsGeneratingStory(true);
        try {
            const canvas = await html2canvas(storyCardRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: null
            });

            const dataUrl = canvas.toDataURL('image/png');

            // Check for native mobile share
            if (navigator.share && canvas.toBlob) {
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const file = new File([blob], `Historia_Colombia_${municipality.name}.png`, { type: 'image/png' });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            try {
                                await navigator.share({
                                    files: [file],
                                    title: `Pasaporte Colombia: ${municipality.name}`,
                                    text: `¡Nuestra bitácora de viaje en ${municipality.name}, ${municipality.departmentName}! 🇨🇴`
                                });
                                setIsGeneratingStory(false);
                                return;
                            } catch (e) {
                                // User aborted or canceled share, fallback to direct download
                            }
                        }
                    }
                    // Direct download fallback
                    const link = document.createElement('a');
                    link.download = `Historia_Colombia_${municipality.name}.png`;
                    link.href = dataUrl;
                    link.click();
                    setIsGeneratingStory(false);
                });
            } else {
                const link = document.createElement('a');
                link.download = `Historia_Colombia_${municipality.name}.png`;
                link.href = dataUrl;
                link.click();
                setIsGeneratingStory(false);
            }
        } catch (err) {
            console.error('Error generating Instagram story card:', err);
            setIsGeneratingStory(false);
        }
    };

    return (
        <div
            className="min-h-screen bg-[#FDF8F7] dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 pt-20 md:pt-6 pb-28 sm:pb-24 px-4 sm:px-8 print:p-0 print:bg-white transition-colors"
            style={{
                backgroundImage: 'linear-gradient(180deg, var(--color-accent-soft) 0%, transparent 45%)'
            }}
        >
            {/* Top Bar with Back Button & Share/PDF actions */}
            <div className="max-w-6xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <button
                    id="back-to-regional-btn"
                    onClick={onBack}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 rounded-full shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:text-accent-primary transition-colors border border-[#FFE4EA] dark:border-zinc-800 text-xs font-semibold cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver a {municipality.departmentName}</span>
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Botón de Ciudad Hogar en barra superior */}
                    {isHome ? (
                        <button
                            id="home-city-badge-top-btn"
                            type="button"
                            onClick={() => setShowHomeChangeConfirm(true)}
                            className="px-4 py-2 bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-zinc-700 rounded-full shadow-sm text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
                            title="Tu ciudad actual (Hogar). Haz clic si deseas cambiarla."
                        >
                            <span>🏠 Ciudad actual</span>
                            <span className="text-[11px] underline opacity-80">(Cambiar)</span>
                        </button>
                    ) : (
                        <button
                            id="set-as-home-top-btn"
                            type="button"
                            onClick={() => {
                                if (onSetHomeMunicipality) onSetHomeMunicipality(municipality.id);
                                handleStampCelebration();
                            }}
                            className="px-4 py-2 bg-white border border-rose-200 text-gray-700 hover:bg-rose-50 hover:text-rose-600 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700 rounded-full text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
                            title="Establecer este municipio como tu ciudad actual"
                        >
                            <span>🏠 Establecer como ciudad actual</span>
                        </button>
                    )}

                    {trips.length > 0 && (
                        <>
                            {/* Export to PDF Button: cápsula unificada con icono único 📄 */}
                            <button
                                id="export-pdf-btn"
                                type="button"
                                onClick={handlePrintPDF}
                                className="px-4 py-2 bg-white border border-rose-200 text-gray-700 hover:bg-rose-50 hover:text-rose-600 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700 rounded-full text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                title="Exportar ficha de bitácora municipal a PDF"
                            >
                                <span>📄 Exportar PDF</span>
                            </button>

                            {/* Share in Instagram Stories Button: cápsula unificada con icono único ✨ */}
                            <button
                                id="share-story-btn"
                                type="button"
                                onClick={() => setShowStoryModal(true)}
                                className="px-4 py-2 bg-white border border-rose-200 text-gray-700 hover:bg-rose-50 hover:text-rose-600 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700 rounded-full text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                title="Compartir en Historias de Instagram (9:16)"
                            >
                                <span>✨ Compartir en Historias</span>
                            </button>
                        </>
                    )}

                    {/* Pastilla de Ubicación con Alto Contraste */}
                    <span className="bg-white/80 border border-gray-250 dark:border-zinc-700 text-gray-800 dark:bg-zinc-800 dark:text-white font-semibold px-4 py-2 rounded-full shadow-sm text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        <span>{municipality.name}, {municipality.departmentName}</span>
                    </span>
                </div>
            </div>

            <div className="max-w-6xl mx-auto">
                {/* If Not Visited Yet */}
                {trips.length === 0 ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-10 text-center shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] border border-[#FFF0F3] dark:border-zinc-800 max-w-xl mx-auto animate-in zoom-in-95">
                        <div
                            className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                            style={{
                                backgroundColor: 'var(--color-accent-light)',
                                color: 'var(--color-accent)'
                            }}
                        >
                            {isHome ? <span className="text-3xl">🏠</span> : <MapPin className="w-10 h-10" />}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-zinc-100 mb-2">
                            {isHome
                                ? `¡Esta es tu ciudad hogar, ${municipality.name}!`
                                : `¡Aún no has registrado visitas a ${municipality.name}!`}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 mb-6 leading-relaxed">
                            {municipality.description || storyDescription}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            {/* Botón secundario en píldora: Establecer como ciudad actual */}
                            {isHome ? (
                                <button
                                    id="toggle-home-city-initial-btn"
                                    type="button"
                                    onClick={() => setShowHomeChangeConfirm(true)}
                                    className="px-4 py-2 bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-zinc-700 font-medium text-xs sm:text-sm rounded-full shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                    <span>🏠 Ciudad actual</span>
                                    <span className="text-[11px] underline opacity-80">(Cambiar)</span>
                                </button>
                            ) : (
                                <button
                                    id="set-home-city-initial-btn"
                                    type="button"
                                    onClick={() => {
                                        if (onSetHomeMunicipality) onSetHomeMunicipality(municipality.id);
                                        handleStampCelebration();
                                    }}
                                    className="px-4 py-2 bg-white border border-rose-200 text-gray-700 hover:bg-rose-50 hover:text-rose-600 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700 font-medium text-xs sm:text-sm rounded-full transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                    title="Establecer este municipio como tu ciudad actual"
                                >
                                    <span>🏠 Establecer como ciudad actual</span>
                                </button>
                            )}

                            <button
                                id="first-visit-btn"
                                onClick={openNewVisitModal}
                                style={{
                                    backgroundColor: 'var(--color-accent)',
                                    borderColor: 'var(--color-accent-soft)'
                                }}
                                className="py-2.5 px-6 text-white font-bold text-xs sm:text-sm rounded-full shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>¡Registrar visita turística!</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Visited View matching Screenshot 4 */
                    <div className="space-y-6">
                        {/* Header: Passport Stamp & Multi-trip Timeline matching Screenshot 4 */}
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-transparent py-4">

                            {/* GAMIFICATION PASSPORT STAMP matching Screenshot 4 */}
                            {isHome ? (
                                /* Sello Especial de Residencia: Siempre fondo blanco puro simulando papel físico */
                                <div
                                    id="residence-passport-stamp"
                                    onClick={handleStampCelebration}
                                    title="Emblema de Ciudad Hogar y Residencia Oficial (Haz clic para celebrar)"
                                    className="relative cursor-pointer select-none group transition-transform hover:scale-105 active:rotate-1"
                                >
                                    <div className="w-52 h-52 bg-white rounded-full p-4 shadow-lg border-2 border-dashed border-slate-700 flex items-center justify-center transform -rotate-2 transition-transform">
                                        <div className="w-full h-full rounded-full border-2 border-solid border-slate-800 flex flex-col items-center justify-center text-center p-3 text-slate-800 font-stamp">
                                            <div className="flex items-center gap-1 text-[9px] tracking-[0.22em] font-bold uppercase border-b border-slate-700 pb-0.5 mb-1 text-[#1E293B]">
                                                <span>★</span>
                                                <span>REPÚBLICA DE COLOMBIA</span>
                                                <span>★</span>
                                            </div>

                                            <div className="text-2xl my-0.5">🏠</div>

                                            <span className="text-[9px] font-bold tracking-[0.16em] uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 mb-1 border border-slate-300">
                                                CIUDAD HOGAR / RESIDENCIA
                                            </span>

                                            <h3 className="text-xs font-bold tracking-wide uppercase px-1 leading-tight text-slate-800 my-0.5">
                                                {municipality.name.toUpperCase()}, {municipality.departmentName.toUpperCase()}
                                            </h3>

                                            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                                                Base de Vida y Expediciones
                                            </div>

                                            {/* Decorative waves */}
                                            <div className="w-16 h-1 border-b-2 border-dashed border-slate-700 mt-1 opacity-80" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Sello Tradicional de Migración y Visita: Siempre fondo blanco puro simulando papel físico */
                                <div
                                    id="tourist-passport-stamp"
                                    onClick={handleStampCelebration}
                                    title="Haz clic para celebrar el sello"
                                    className="relative cursor-pointer select-none group transition-transform hover:scale-105 active:rotate-1"
                                >
                                    {/* Sello con fondo blanco puro tanto en modo claro como en modo oscuro */}
                                    <div className="w-52 h-52 bg-white rounded-full p-4 shadow-lg border-2 border-dashed border-slate-700 flex items-center justify-center transform -rotate-3 transition-transform">
                                        <div className="w-full h-full rounded-full border-2 border-solid border-slate-800 flex flex-col items-center justify-center text-center p-3 text-slate-800 font-stamp">
                                            <span className="text-[10px] tracking-[0.25em] font-bold uppercase border-b border-slate-700 pb-0.5 mb-1 text-[#1E293B]">
                                                PASSPORT STAMP
                                            </span>
                                            <h3 className="text-sm font-bold tracking-wide uppercase px-1 leading-tight my-1 text-slate-800">
                                                {municipality.name.toUpperCase()}, {municipality.departmentName.toUpperCase()}
                                            </h3>
                                            <div className="text-[10px] font-semibold space-y-0.5 my-0.5 text-slate-700">
                                                {trips.slice(0, 3).map((t, idx) => (
                                                    <div key={t.id} className="tracking-wider">
                                                        Visita {idx + 1}: {t.tripDate}
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Decorative flight waves */}
                                            <div className="w-12 h-1 border-b-2 border-dashed border-slate-700 mt-1 opacity-80" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* MULTI-TRIP TIMELINE SELECTOR */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto relative z-10">
                                {/* Selector de fecha de visita: píldora oscura */}
                                <div className="flex items-center gap-2">
                                    {trips.map((trip, idx) => {
                                        const isSelected = idx === selectedTripIndex;
                                        return (
                                            <button
                                                key={trip.id}
                                                type="button"
                                                onClick={() => setSelectedTripIndex(idx)}
                                                className={`transition-all duration-200 cursor-pointer ${isSelected
                                                        ? 'px-4 py-2 rounded-full bg-[#1E293B] dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold shadow-md shadow-slate-800/25'
                                                        : 'px-3.5 py-2 rounded-full bg-white/90 dark:bg-zinc-800 hover:bg-white dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white border border-[#FFE4EA] dark:border-zinc-700 text-xs font-semibold shadow-sm'
                                                    }`}
                                                title={`Visita ${idx + 1}: ${trip.tripDate}`}
                                            >
                                                {trip.tripDate}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* + Añadir nueva visita Pill Button */}
                                <button
                                    id="add-new-visit-btn"
                                    type="button"
                                    onClick={openNewVisitModal}
                                    style={{
                                        backgroundColor: 'var(--color-accent)',
                                        borderColor: 'var(--color-accent-soft)'
                                    }}
                                    className="relative z-10 flex items-center gap-2 px-5 py-2.5 active:scale-95 text-white text-xs font-bold rounded-full shadow-md transition-all cursor-pointer whitespace-nowrap"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Añadir nueva visita</span>
                                </button>

                                {/* 🗑️ Eliminar esta visita Button */}
                                {currentTrip && (
                                    <button
                                        id="delete-current-trip-btn"
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="relative z-10 flex items-center gap-1.5 bg-white dark:bg-zinc-800 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-zinc-700 border border-rose-200 dark:border-zinc-700 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                                        title="Eliminar esta visita"
                                    >
                                        <span>🗑️ Eliminar esta visita</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* SUB-NAVBAR HORIZONTAL PILL BAR */}
                        <div ref={tabsBarRef} className="flex justify-center scroll-mt-4">
                            <div className="bg-[#F6EBD0]/95 dark:bg-zinc-900/95 backdrop-blur-md p-1 rounded-full shadow-[0_10px_30px_-10px_rgba(0,0,0,0.2)] border border-[#FFE4EA] dark:border-zinc-800 flex items-center gap-1 overflow-x-auto max-w-full">
                                <button
                                    id="tab-resumen-btn"
                                    onClick={() => setActiveTab('resumen')}
                                    style={
                                        activeTab === 'resumen'
                                            ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                                            : undefined
                                    }
                                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${activeTab === 'resumen'
                                            ? 'text-white shadow-md'
                                            : 'text-slate-700 dark:text-zinc-300 hover:text-accent-primary'
                                        }`}
                                >
                                    Resumen
                                </button>
                                <button
                                    id="tab-gastos-btn"
                                    onClick={() => setActiveTab('gastos')}
                                    style={
                                        activeTab === 'gastos'
                                            ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                                            : undefined
                                    }
                                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${activeTab === 'gastos'
                                            ? 'text-white shadow-md'
                                            : 'text-slate-700 dark:text-zinc-300 hover:text-accent-primary'
                                        }`}
                                >
                                    Gastos
                                </button>
                                <button
                                    id="tab-comida-btn"
                                    onClick={() => setActiveTab('comida')}
                                    style={
                                        activeTab === 'comida'
                                            ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                                            : undefined
                                    }
                                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${activeTab === 'comida'
                                            ? 'text-white shadow-md'
                                            : 'text-slate-700 dark:text-zinc-300 hover:text-accent-primary'
                                        }`}
                                >
                                    Comida
                                </button>
                                <button
                                    id="tab-transporte-btn"
                                    onClick={() => setActiveTab('transporte')}
                                    style={
                                        activeTab === 'transporte'
                                            ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                                            : undefined
                                    }
                                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${activeTab === 'transporte'
                                            ? 'text-white shadow-md'
                                            : 'text-slate-700 dark:text-zinc-300 hover:text-accent-primary'
                                        }`}
                                >
                                    Transporte
                                </button>
                                <button
                                    id="tab-noolvidar-btn"
                                    onClick={() => setActiveTab('noolvidar')}
                                    style={
                                        activeTab === 'noolvidar'
                                            ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                                            : undefined
                                    }
                                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${activeTab === 'noolvidar'
                                            ? 'text-white shadow-md'
                                            : 'text-slate-700 dark:text-zinc-300 hover:text-accent-primary'
                                        }`}
                                >
                                    No Olvidar
                                </button>
                                <button
                                    id="tab-fotos-btn"
                                    onClick={() => setActiveTab('fotos')}
                                    style={
                                        activeTab === 'fotos'
                                            ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                                            : undefined
                                    }
                                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${activeTab === 'fotos'
                                            ? 'text-white shadow-md'
                                            : 'text-slate-700 dark:text-zinc-300 hover:text-accent-primary'
                                        }`}
                                >
                                    Fotos
                                </button>
                                {onNavigateToReportes && (
                                    <button
                                        id="tab-global-reportes-btn"
                                        onClick={onNavigateToReportes}
                                        className="px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap text-rose-600 bg-rose-50 hover:bg-rose-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 cursor-pointer border border-rose-200 dark:border-zinc-700"
                                        title="Ver Balance Financiero y Reportes Globales"
                                    >
                                        <BarChart3 className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Reportes</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* TAB CONTENT: GASTOS (CRUD puro de gastos de la visita) */}
                        {activeTab === 'gastos' && (
                            <div className="space-y-5 animate-in fade-in duration-200">
                                {/* Banner informativo de Residencia / Ciudad Hogar */}
                                {isHome && (
                                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-rose-50/50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-zinc-900 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3 shadow-xs">
                                        <span className="text-xl flex-shrink-0">🏠</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                                    Base de Operaciones y Residencia Actual
                                                </h4>
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/60">
                                                    Balance $0 COP Válido
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-zinc-300 mt-1 leading-relaxed">
                                                En tu ciudad hogar no aplican gastos turísticos obligatorios de peajes ni hospedajes. Tu balance puede permanecer en $0 COP sin considerarse incompleto. Si tienes consumos o salidas especiales, puedes registrarlas opcionalmente.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Tarjeta única de CRUD de Gastos */}
                                <div className="bg-white dark:bg-[#1E2228] rounded-3xl shadow-[0_15px_35px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] dark:border-zinc-800/80">
                                    {/* Cabecera fija con total de referencia */}
                                    <div className="sticky top-2 z-20 px-5 sm:px-8 py-4 rounded-t-3xl bg-white/95 dark:bg-[#1E2228]/95 backdrop-blur-md border-b border-[#FFE4EA] dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-zinc-100">
                                                Gastos de la visita
                                            </h3>
                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                                Registra gastos fijos y adicionales en pesos colombianos (COP)
                                            </p>
                                        </div>
                                        <div
                                            className="accent-feedback-badge px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap shadow-2xs tabular-nums"
                                            aria-live="polite"
                                        >
                                            Total de la visita: COP $ {formatThousands(totalExpensesCop)}
                                        </div>
                                    </div>

                                    <div className="p-4 sm:p-8 space-y-8">
                                        {/* 1) GASTOS FIJOS: Comida, Transporte, Hospedaje */}
                                        <section aria-label="Gastos fijos" className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                    Gastos fijos
                                                </h4>
                                                <span className="hidden lg:inline-block text-[11px] text-slate-400 dark:text-zinc-500">
                                                    Monto en COP • Fecha • Nota opcional
                                                </span>
                                            </div>

                                            <div className="space-y-3">
                                                {FIXED_EXPENSE_CATEGORIES.map((fixedCategory) => {
                                                    const matchingExpenses =
                                                        fixedCategory === 'Transporte'
                                                            ? currentTrip.expenses.filter((e) =>
                                                                  isTransportExpenseCategory(e.category)
                                                              )
                                                            : currentTrip.expenses.filter(
                                                                  (e) =>
                                                                      (e.category || '').trim().toLowerCase() ===
                                                                      fixedCategory.toLowerCase()
                                                              );

                                                    const primaryExp =
                                                        fixedCategory === 'Transporte'
                                                            ? matchingExpenses.find((e) => e.category === 'Transporte') ||
                                                              matchingExpenses[0]
                                                            : matchingExpenses[0];

                                                    const amount =
                                                        matchingExpenses.length > 1
                                                            ? matchingExpenses.reduce(
                                                                  (sum, item) => sum + (Number(item.amountCop) || 0),
                                                                  0
                                                              )
                                                            : primaryExp
                                                              ? Number(primaryExp.amountCop) || 0
                                                              : 0;
                                                    const notes = primaryExp ? primaryExp.notes || '' : '';
                                                    const date = primaryExp?.date || currentTrip.tripDate;
                                                    const draftKey = `fixed-${fixedCategory}`;
                                                    const displayAmount =
                                                        amountDrafts[draftKey] !== undefined
                                                            ? amountDrafts[draftKey]
                                                            : amount > 0
                                                              ? formatThousands(amount)
                                                              : '';

                                                    const upsertFixedExpense = (
                                                        patch: Partial<Pick<ExpenseLog, 'amountCop' | 'date' | 'notes'>>
                                                    ) => {
                                                        let updatedExpenses: ExpenseLog[];
                                                        if (primaryExp) {
                                                            const duplicateIds = new Set(
                                                                matchingExpenses
                                                                    .filter((m) => m.id !== primaryExp.id)
                                                                    .map((m) => m.id)
                                                            );
                                                            updatedExpenses = currentTrip.expenses
                                                                .filter((item) => !duplicateIds.has(item.id))
                                                                .map((item) =>
                                                                    item.id === primaryExp.id
                                                                        ? {
                                                                              ...item,
                                                                              category: fixedCategory,
                                                                              amountCop:
                                                                                  patch.amountCop !== undefined
                                                                                      ? patch.amountCop
                                                                                      : amount,
                                                                              date: patch.date ?? date,
                                                                              notes: patch.notes ?? notes
                                                                          }
                                                                        : item
                                                                );
                                                        } else {
                                                            updatedExpenses = [
                                                                ...currentTrip.expenses,
                                                                {
                                                                    id: newId(),
                                                                    tripEntryId: currentTrip.id,
                                                                    category: fixedCategory,
                                                                    amountCop: patch.amountCop ?? 0,
                                                                    date: patch.date ?? currentTrip.tripDate,
                                                                    notes: patch.notes ?? ''
                                                                }
                                                            ];
                                                        }
                                                        markTabDirty('gastos');
                                                        onSaveTrip({ ...currentTrip, expenses: updatedExpenses });
                                                    };

                                                    return (
                                                        <div
                                                            key={fixedCategory}
                                                            className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3 items-center p-3.5 lg:p-3 rounded-2xl bg-[#FFFBFB] dark:bg-[#282D35]/70 border border-[#FFE4EA] dark:border-zinc-700/70 text-xs"
                                                        >
                                                            {/* Nombre fijo */}
                                                            <div className="lg:col-span-2 flex items-center justify-between lg:justify-start">
                                                                <span className="font-bold text-slate-800 dark:text-zinc-100 text-sm">
                                                                    {fixedCategory}
                                                                </span>
                                                            </div>

                                                            {/* Monto en COP */}
                                                            <div className="lg:col-span-3 relative">
                                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 dark:text-zinc-500 pointer-events-none">
                                                                    $
                                                                </span>
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    aria-label={`Monto en COP para ${fixedCategory}`}
                                                                    value={displayAmount}
                                                                    onFocus={() => {
                                                                        setAmountDrafts((prev) => ({
                                                                            ...prev,
                                                                            [draftKey]:
                                                                                amount > 0 ? formatThousands(amount) : ''
                                                                        }));
                                                                    }}
                                                                    onChange={(e) => {
                                                                        const filtered = e.target.value.replace(/[^\d.,]/g, '');
                                                                        setAmountDrafts((prev) => ({
                                                                            ...prev,
                                                                            [draftKey]: filtered
                                                                        }));
                                                                        const parsed = parseCopInput(filtered);
                                                                        upsertFixedExpense({ amountCop: parsed });
                                                                    }}
                                                                    onBlur={() => {
                                                                        setAmountDrafts((prev) => {
                                                                            const next = { ...prev };
                                                                            delete next[draftKey];
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    placeholder="0"
                                                                    className="w-full pl-7 pr-11 py-2.5 bg-white dark:bg-[#1E2228] border border-[#FAD2DA] dark:border-zinc-700 rounded-xl text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F44566]"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-zinc-500 pointer-events-none">
                                                                    COP
                                                                </span>
                                                            </div>

                                                            {/* Fecha */}
                                                            <div className="lg:col-span-3">
                                                                <input
                                                                    type="date"
                                                                    aria-label={`Fecha para ${fixedCategory}`}
                                                                    value={passportToIsoDate(date)}
                                                                    onChange={(e) => {
                                                                        const nextDate = e.target.value
                                                                            ? formatSafePassportDate(e.target.value)
                                                                            : currentTrip.tripDate;
                                                                        upsertFixedExpense({ date: nextDate });
                                                                    }}
                                                                    className="w-full px-3 py-2.5 bg-white dark:bg-[#1E2228] border border-[#FAD2DA] dark:border-zinc-700 rounded-xl text-slate-700 dark:text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#F44566]"
                                                                />
                                                            </div>

                                                            {/* Nota opcional */}
                                                            <div className="lg:col-span-4">
                                                                <input
                                                                    type="text"
                                                                    maxLength={500}
                                                                    aria-label={`Nota opcional para ${fixedCategory}`}
                                                                    value={notes}
                                                                    onChange={(e) =>
                                                                        upsertFixedExpense({
                                                                            notes: e.target.value.slice(0, 500)
                                                                        })
                                                                    }
                                                                    placeholder="Nota opcional (ej. detalle)"
                                                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1E2228] border border-[#FAD2DA] dark:border-zinc-700 rounded-xl text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-[#F44566]"
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>

                                        {/* 2) GASTOS ADICIONALES (lista dinámica sin límite) */}
                                        {(() => {
                                            const persistedExtraExpenses = currentTrip.expenses.filter(
                                                (e) => !isFixedExpenseCategory(e.category)
                                            );
                                            const allExtraRows: Array<{ expense: ExpenseLog; isDraft: boolean }> = [
                                                ...persistedExtraExpenses.map((expense) => ({ expense, isDraft: false })),
                                                ...draftExtraExpenses.map((expense) => ({ expense, isDraft: true }))
                                            ];

                                            const handleAddExtraExpense = () => {
                                                const newExpenseId = newId();
                                                const newDraft: ExpenseLog = {
                                                    id: newExpenseId,
                                                    tripEntryId: currentTrip.id,
                                                    category: '',
                                                    amountCop: 0,
                                                    date: currentTrip.tripDate,
                                                    notes: ''
                                                };
                                                pendingFocusExpenseIdRef.current = newExpenseId;
                                                setDraftExtraExpenses((prev) => [...prev, newDraft]);
                                                setExtraNameDrafts((prev) => ({ ...prev, [newExpenseId]: '' }));
                                                setAmountDrafts((prev) => ({ ...prev, [newExpenseId]: '' }));
                                                setExpenseRowErrors((prev) => {
                                                    const next = { ...prev };
                                                    delete next[newExpenseId];
                                                    return next;
                                                });
                                            };

                                            const updateExtraRow = (
                                                row: ExpenseLog,
                                                isDraft: boolean,
                                                patch: Partial<Pick<ExpenseLog, 'category' | 'amountCop' | 'date' | 'notes'>>
                                            ) => {
                                                const nextNameRaw =
                                                    patch.category !== undefined
                                                        ? patch.category
                                                        : extraNameDrafts[row.id] ?? row.category;
                                                const nextAmount =
                                                    patch.amountCop !== undefined ? patch.amountCop : row.amountCop;
                                                const nextDate = patch.date !== undefined ? patch.date : row.date;
                                                const nextNotes = patch.notes !== undefined ? patch.notes : row.notes;

                                                const hasName = nextNameRaw.trim().length > 0;
                                                const hasAmount = nextAmount > 0;

                                                if (hasName || hasAmount) {
                                                    setExpenseRowErrors((prev) => {
                                                        if (!prev[row.id]) return prev;
                                                        const next = { ...prev };
                                                        delete next[row.id];
                                                        return next;
                                                    });
                                                }

                                                if (isDraft) {
                                                    if (hasName || hasAmount) {
                                                        const promoted: ExpenseLog = {
                                                            ...row,
                                                            category: hasName
                                                                ? normalizeExpenseCategoryName(nextNameRaw)
                                                                : 'Otros',
                                                            amountCop: nextAmount,
                                                            date: nextDate || currentTrip.tripDate,
                                                            notes: nextNotes || ''
                                                        };
                                                        setDraftExtraExpenses((prev) =>
                                                            prev.filter((d) => d.id !== row.id)
                                                        );
                                                        markTabDirty('gastos');
                                                        onSaveTrip({
                                                            ...currentTrip,
                                                            expenses: [...currentTrip.expenses, promoted]
                                                        });
                                                    } else {
                                                        setDraftExtraExpenses((prev) =>
                                                            prev.map((d) =>
                                                                d.id === row.id
                                                                    ? {
                                                                          ...d,
                                                                          category: nextNameRaw,
                                                                          amountCop: nextAmount,
                                                                          date: nextDate,
                                                                          notes: nextNotes
                                                                      }
                                                                    : d
                                                            )
                                                        );
                                                    }
                                                    return;
                                                }

                                                const nextCategory = hasName
                                                    ? normalizeExpenseCategoryName(nextNameRaw)
                                                    : 'Otros';
                                                const updatedExpenses = currentTrip.expenses.map((item) =>
                                                    item.id === row.id
                                                        ? {
                                                              ...item,
                                                              category: nextCategory,
                                                              amountCop: nextAmount,
                                                              date: nextDate || currentTrip.tripDate,
                                                              notes: nextNotes || ''
                                                          }
                                                        : item
                                                );
                                                markTabDirty('gastos');
                                                onSaveTrip({ ...currentTrip, expenses: updatedExpenses });
                                            };

                                            const handleDeleteExtraExpense = (expenseId: string, isDraft: boolean) => {
                                                setConfirmDeleteExpenseId(null);
                                                setExtraNameDrafts((prev) => {
                                                    const next = { ...prev };
                                                    delete next[expenseId];
                                                    return next;
                                                });
                                                setAmountDrafts((prev) => {
                                                    const next = { ...prev };
                                                    delete next[expenseId];
                                                    return next;
                                                });
                                                setExpenseRowErrors((prev) => {
                                                    const next = { ...prev };
                                                    delete next[expenseId];
                                                    return next;
                                                });
                                                if (isDraft) {
                                                    setDraftExtraExpenses((prev) => prev.filter((d) => d.id !== expenseId));
                                                    return;
                                                }
                                                const updatedExpenses = currentTrip.expenses.filter(
                                                    (item) => item.id !== expenseId
                                                );
                                                markTabDirty('gastos');
                                                onSaveTrip({ ...currentTrip, expenses: updatedExpenses });
                                            };

                                            const handlePickSuggestion = (suggestion: string) => {
                                                const cleanName = normalizeExpenseCategoryName(suggestion);
                                                // If there is an empty draft row waiting, populate it and focus its amount
                                                const emptyDraft = draftExtraExpenses.find(
                                                    (d) =>
                                                        !(extraNameDrafts[d.id] ?? d.category).trim() &&
                                                        d.amountCop === 0
                                                );
                                                if (emptyDraft) {
                                                    pendingFocusAmountIdRef.current = emptyDraft.id;
                                                    setExtraNameDrafts((prev) => ({
                                                        ...prev,
                                                        [emptyDraft.id]: cleanName
                                                    }));
                                                    updateExtraRow(emptyDraft, true, { category: cleanName });
                                                    return;
                                                }

                                                // Otherwise create a new expense directly with the suggested category and focus its amount
                                                const newExpenseId = newId();
                                                const created: ExpenseLog = {
                                                    id: newExpenseId,
                                                    tripEntryId: currentTrip.id,
                                                    category: cleanName,
                                                    amountCop: 0,
                                                    date: currentTrip.tripDate,
                                                    notes: ''
                                                };
                                                pendingFocusAmountIdRef.current = newExpenseId;
                                                setExtraNameDrafts((prev) => ({ ...prev, [newExpenseId]: cleanName }));
                                                markTabDirty('gastos');
                                                onSaveTrip({
                                                    ...currentTrip,
                                                    expenses: [...currentTrip.expenses, created]
                                                });
                                            };

                                            return (
                                                <section
                                                    aria-label="Gastos adicionales"
                                                    className="pt-6 border-t border-[#FFE4EA] dark:border-zinc-800 space-y-4"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <div>
                                                            <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                                                                Gastos adicionales
                                                            </h4>
                                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                                                Gasolina, entradas, parqueaderos, recuerdos o cualquier gasto extra
                                                            </p>
                                                        </div>
                                                        <button
                                                            id="add-extra-expense-btn"
                                                            type="button"
                                                            onClick={handleAddExtraExpense}
                                                            style={{
                                                                backgroundColor: 'var(--color-accent)',
                                                                borderColor: 'var(--color-accent-soft)'
                                                            }}
                                                            className="flex items-center gap-1.5 px-4 py-2 active:scale-95 text-white text-xs font-bold rounded-full shadow-md transition-all cursor-pointer whitespace-nowrap"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            <span>Agregar gasto</span>
                                                        </button>
                                                    </div>

                                                    {/* Sugerencias frecuentes y comunes */}
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mr-1">
                                                            Sugerencias:
                                                        </span>
                                                        {suggestedExtraCategories.slice(0, 8).map((suggestion) => (
                                                            <button
                                                                key={suggestion}
                                                                type="button"
                                                                onClick={() => handlePickSuggestion(suggestion)}
                                                                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FFF5F7] dark:bg-[#282D35] hover:bg-[#FFE4EA] dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-[#FAD2DA] dark:border-zinc-700 transition-colors cursor-pointer active:scale-95"
                                                            >
                                                                + {suggestion}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <datalist id="expense-category-suggestions">
                                                        {suggestedExtraCategories.map((suggestion) => (
                                                            <option key={suggestion} value={suggestion} />
                                                        ))}
                                                    </datalist>

                                                    {allExtraRows.length === 0 ? (
                                                        <div className="p-5 rounded-2xl border border-dashed border-[#FAD2DA] dark:border-zinc-700 bg-[#FFFBFB]/60 dark:bg-[#282D35]/40 text-center text-xs text-slate-500 dark:text-zinc-400">
                                                            Aún no hay gastos adicionales en esta visita. Pulsa{' '}
                                                            <strong className="text-slate-700 dark:text-zinc-200">
                                                                + Agregar gasto
                                                            </strong>{' '}
                                                            o elige una sugerencia arriba.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {allExtraRows.map(({ expense, isDraft }) => {
                                                                const currentNameValue =
                                                                    extraNameDrafts[expense.id] !== undefined
                                                                        ? extraNameDrafts[expense.id]
                                                                        : expense.category;
                                                                const displayExtraAmount =
                                                                    amountDrafts[expense.id] !== undefined
                                                                        ? amountDrafts[expense.id]
                                                                        : expense.amountCop > 0
                                                                          ? formatThousands(expense.amountCop)
                                                                          : '';
                                                                const rowError = expenseRowErrors[expense.id];
                                                                const isConfirmingDelete =
                                                                    confirmDeleteExpenseId === expense.id;

                                                                return (
                                                                    <div
                                                                        key={expense.id}
                                                                        className={`p-3.5 lg:p-3 rounded-2xl border transition-colors ${
                                                                            rowError
                                                                                ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                                                                                : 'bg-[#FFFBFB] dark:bg-[#282D35]/70 border-[#FFE4EA] dark:border-zinc-700/70'
                                                                        }`}
                                                                    >
                                                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3 items-center text-xs">
                                                                            {/* ¿En qué fue? (editable, máx 50 chars) */}
                                                                            <div className="lg:col-span-3">
                                                                                <input
                                                                                    ref={(el) => {
                                                                                        extraNameInputRefs.current[expense.id] = el;
                                                                                    }}
                                                                                    type="text"
                                                                                    list="expense-category-suggestions"
                                                                                    maxLength={50}
                                                                                    value={currentNameValue}
                                                                                    onChange={(e) => {
                                                                                        const rawVal = e.target.value.slice(0, 50);
                                                                                        setExtraNameDrafts((prev) => ({
                                                                                            ...prev,
                                                                                            [expense.id]: rawVal
                                                                                        }));
                                                                                        updateExtraRow(expense, isDraft, {
                                                                                            category: rawVal
                                                                                        });
                                                                                    }}
                                                                                    onBlur={() => {
                                                                                        const rawVal =
                                                                                            extraNameDrafts[expense.id] ??
                                                                                            expense.category;
                                                                                        const trimmed = rawVal.trim();
                                                                                        if (!trimmed && expense.amountCop === 0) {
                                                                                            setExpenseRowErrors((prev) => ({
                                                                                                ...prev,
                                                                                                [expense.id]:
                                                                                                    'Ingresa un nombre o un monto mayor a 0'
                                                                                            }));
                                                                                            return;
                                                                                        }
                                                                                        const normalized =
                                                                                            normalizeExpenseCategoryName(rawVal);
                                                                                        setExtraNameDrafts((prev) => ({
                                                                                            ...prev,
                                                                                            [expense.id]: normalized
                                                                                        }));
                                                                                        if (!isDraft && normalized !== expense.category) {
                                                                                            updateExtraRow(expense, false, {
                                                                                                category: normalized
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                    placeholder="¿En qué fue? (ej. Gasolina)"
                                                                                    aria-label="¿En qué fue?"
                                                                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1E2228] border border-[#FAD2DA] dark:border-zinc-700 rounded-xl text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F44566]"
                                                                                />
                                                                            </div>

                                                                            {/* Monto en COP */}
                                                                            <div className="lg:col-span-2 relative">
                                                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 dark:text-zinc-500 pointer-events-none">
                                                                                    $
                                                                                </span>
                                                                                <input
                                                                                    ref={(el) => {
                                                                                        extraAmountInputRefs.current[expense.id] = el;
                                                                                    }}
                                                                                    type="text"
                                                                                    inputMode="numeric"
                                                                                    value={displayExtraAmount}
                                                                                    onFocus={() => {
                                                                                        setAmountDrafts((prev) => ({
                                                                                            ...prev,
                                                                                            [expense.id]:
                                                                                                expense.amountCop > 0
                                                                                                    ? formatThousands(expense.amountCop)
                                                                                                    : ''
                                                                                        }));
                                                                                    }}
                                                                                    onChange={(e) => {
                                                                                        const filtered = e.target.value.replace(
                                                                                            /[^\d.,]/g,
                                                                                            ''
                                                                                        );
                                                                                        setAmountDrafts((prev) => ({
                                                                                            ...prev,
                                                                                            [expense.id]: filtered
                                                                                        }));
                                                                                        const parsed = parseCopInput(filtered);
                                                                                        updateExtraRow(expense, isDraft, {
                                                                                            amountCop: parsed
                                                                                        });
                                                                                    }}
                                                                                    onBlur={() => {
                                                                                        setAmountDrafts((prev) => {
                                                                                            const next = { ...prev };
                                                                                            delete next[expense.id];
                                                                                            return next;
                                                                                        });
                                                                                        const curName = (
                                                                                            extraNameDrafts[expense.id] ??
                                                                                            expense.category
                                                                                        ).trim();
                                                                                        if (!curName && expense.amountCop === 0) {
                                                                                            setExpenseRowErrors((prev) => ({
                                                                                                ...prev,
                                                                                                [expense.id]:
                                                                                                    'Ingresa un nombre o un monto mayor a 0'
                                                                                            }));
                                                                                        }
                                                                                    }}
                                                                                    placeholder="0"
                                                                                    aria-label="Monto en COP del gasto adicional"
                                                                                    className="w-full pl-7 pr-10 py-2.5 bg-white dark:bg-[#1E2228] border border-[#FAD2DA] dark:border-zinc-700 rounded-xl text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F44566]"
                                                                                />
                                                                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-zinc-500 pointer-events-none">
                                                                                    COP
                                                                                </span>
                                                                            </div>

                                                                            {/* Fecha */}
                                                                            <div className="lg:col-span-3">
                                                                                <input
                                                                                    type="date"
                                                                                    aria-label="Fecha del gasto adicional"
                                                                                    value={passportToIsoDate(
                                                                                        expense.date || currentTrip.tripDate
                                                                                    )}
                                                                                    onChange={(e) => {
                                                                                        const nextDate = e.target.value
                                                                                            ? formatSafePassportDate(
                                                                                                  e.target.value
                                                                                              )
                                                                                            : currentTrip.tripDate;
                                                                                        updateExtraRow(expense, isDraft, {
                                                                                            date: nextDate
                                                                                        });
                                                                                    }}
                                                                                    className="w-full px-3 py-2.5 bg-white dark:bg-[#1E2228] border border-[#FAD2DA] dark:border-zinc-700 rounded-xl text-slate-700 dark:text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#F44566]"
                                                                                />
                                                                            </div>

                                                                            {/* Nota opcional + Eliminar */}
                                                                            <div className="lg:col-span-4 flex items-center gap-2">
                                                                                <input
                                                                                    type="text"
                                                                                    maxLength={500}
                                                                                    value={expense.notes}
                                                                                    onChange={(e) =>
                                                                                        updateExtraRow(expense, isDraft, {
                                                                                            notes: e.target.value.slice(0, 500)
                                                                                        })
                                                                                    }
                                                                                    placeholder="Nota opcional"
                                                                                    aria-label="Nota opcional del gasto adicional"
                                                                                    className="flex-1 min-w-0 px-3.5 py-2.5 bg-white dark:bg-[#1E2228] border border-[#FAD2DA] dark:border-zinc-700 rounded-xl text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-[#F44566]"
                                                                                />

                                                                                {isConfirmingDelete ? (
                                                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                handleDeleteExtraExpense(
                                                                                                    expense.id,
                                                                                                    isDraft
                                                                                                )
                                                                                            }
                                                                                            className="px-2.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
                                                                                        >
                                                                                            Eliminar
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                setConfirmDeleteExpenseId(null)
                                                                                            }
                                                                                            className="px-2 py-2 rounded-xl bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 text-[11px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-700"
                                                                                        >
                                                                                            No
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            if (isDraft) {
                                                                                                handleDeleteExtraExpense(
                                                                                                    expense.id,
                                                                                                    true
                                                                                                );
                                                                                            } else {
                                                                                                setConfirmDeleteExpenseId(
                                                                                                    expense.id
                                                                                                );
                                                                                            }
                                                                                        }}
                                                                                        title="Eliminar gasto adicional"
                                                                                        aria-label="Eliminar gasto adicional"
                                                                                        className="p-2.5 rounded-xl bg-white dark:bg-[#1E2228] border border-[#FAD2DA] dark:border-zinc-700 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer flex-shrink-0 active:scale-95"
                                                                                    >
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {rowError && (
                                                                            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-2 pl-1">
                                                                                {rowError}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </section>
                                            );
                                        })()}

                                        <DoneButton
                                            dirty={dirtyTabs.gastos}
                                            isSaving={isSaving}
                                            hasSyncProblem={hasSyncProblem}
                                            onDone={() => handleTabDone('gastos')}
                                            onRetry={() => onRetrySync?.()}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB CONTENT: FOTOS (Full Lightbox & Upload) */}
                        {activeTab === 'fotos' && (() => {
                            const handlePhotosChangeInTab = (nextPhotos: TripPhoto[]) => {
                                markTabDirty('fotos');
                                onSaveTrip({
                                    ...currentTrip,
                                    photos: nextPhotos
                                });
                            };

                            const handleUploadFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
                                const files = e.target.files;
                                if (files && files.length > 0) {
                                    const newPhotos: TripPhoto[] = Array.from(files).map((file: File) => ({
                                        id: newId(),
                                        tripEntryId: currentTrip.id,
                                        url: trackedObjectURL(file),
                                        caption: file.name.replace(/\.[^/.]+$/, ''),
                                        uploadedAt: currentTrip.tripDate
                                    }));
                                    handlePhotosChangeInTab([...newPhotos, ...(currentTrip.photos || [])]);
                                }
                                e.target.value = '';
                            };

                            return (
                                <div className="bg-white dark:bg-[#1E2228] rounded-3xl p-5 sm:p-8 shadow-[0_15px_35px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] dark:border-zinc-800 space-y-6 animate-in fade-in">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">
                                                Galería Fotográfica de la Visita ({currentTrip.photos?.length || 0})
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-zinc-400">
                                                Recuerdos capturados en {municipality.name}
                                            </p>
                                        </div>
                                        {/* Upload button when photos exist */}
                                        {currentTrip.photos && currentTrip.photos.length > 0 && (
                                            <label className="cursor-pointer py-2 px-4 bg-[#F44566] text-white rounded-full text-xs font-bold hover:bg-[#e03757] transition-all flex items-center gap-1.5 shadow-md shadow-[#F44566]/25">
                                                <Upload className="w-3.5 h-3.5" />
                                                <span>Subir Fotos</span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleUploadFiles}
                                                />
                                            </label>
                                        )}
                                    </div>

                                    {/* Empty State when photos.length === 0 */}
                                    {(!currentTrip.photos || currentTrip.photos.length === 0) ? (
                                        <div className="border-2 border-dashed border-rose-200 dark:border-zinc-700 rounded-3xl p-8 text-center bg-white/50 dark:bg-[#282D35]/60 flex flex-col items-center justify-center my-6 space-y-3">
                                            <span className="text-4xl select-none" role="img" aria-label="cámara">📸</span>
                                            <h4 className="text-base font-bold text-slate-800 dark:text-zinc-100">
                                                Aún no has agregado fotos de este viaje
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm leading-relaxed">
                                                Sube las fotos familiares de tu visita para empezar a llenar tu álbum de recuerdos
                                            </p>
                                            <label
                                                ref={emptyPhotosUploadRef}
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        e.currentTarget.click();
                                                    }
                                                }}
                                                className="mt-2 cursor-pointer py-2.5 px-6 bg-[#F44566] hover:bg-[#e03757] text-white rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-[#F44566]/25 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1E2228]"
                                            >
                                                <Camera className="w-4 h-4" />
                                                <span>Subir fotos</span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleUploadFiles}
                                                />
                                            </label>
                                        </div>
                                    ) : (
                                        /* Grid */
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {currentTrip.photos.map((photo, idx) => (
                                                <div
                                                    key={photo.id}
                                                    ref={(el) => {
                                                        photoTileRefs.current[photo.id] = el;
                                                    }}
                                                    tabIndex={0}
                                                    onClick={() => setLightboxPhoto(photo.url)}
                                                    onKeyDown={(e) => {
                                                        if (e.target !== e.currentTarget) return;
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            setLightboxPhoto(photo.url);
                                                        }
                                                    }}
                                                    className="group relative h-48 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 cursor-pointer shadow-sm hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1E2228]"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            requestDeletePhoto(photo, idx);
                                                        }}
                                                        className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-black/55 hover:bg-red-600 text-white backdrop-blur-xs flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus:opacity-100 transition-all cursor-pointer shadow-sm"
                                                        title="Eliminar foto"
                                                        aria-label={`Eliminar foto ${photo.caption || ''}`.trim()}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <img
                                                        src={photo.url}
                                                        alt={photo.caption || 'Foto'}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                                        <span className="text-white text-xs font-medium truncate">
                                                            {photo.caption || 'Ver en detalle'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <DoneButton
                                        dirty={dirtyTabs.fotos}
                                        isSaving={isSaving}
                                        hasSyncProblem={hasSyncProblem}
                                        onDone={() => handleTabDone('fotos')}
                                        onRetry={() => onRetrySync?.()}
                                    />
                                </div>
                            );
                        })()}

                        {/* TAB CONTENT: COMIDA */}
                        {activeTab === 'comida' && (
                            <div className="bg-white dark:bg-[#1E2228] rounded-3xl p-8 shadow-[0_15px_35px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] dark:border-zinc-800 space-y-6 animate-in fade-in">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">
                                        Reseña Gastronómica &amp; Platos Típicos
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                                        Sabores y restaurantes degustados en {municipality.name}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                                                Plato Estrella de la Visita
                                            </label>
                                            <input
                                                type="text"
                                                value={currentTrip.favoriteDish || ''}
                                                onChange={(e) => {
                                                    markTabDirty('comida');
                                                    onSaveTrip({ ...currentTrip, favoriteDish: e.target.value });
                                                }}
                                                placeholder="Ej: Trucha al ajillo con patacón"
                                                className="w-full px-4 py-2.5 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-2xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F44566]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                                                Reseña del Restaurante y Experiencia
                                            </label>
                                            <textarea
                                                value={currentTrip.foodReview}
                                                onChange={(e) => {
                                                    markTabDirty('comida');
                                                    onSaveTrip({ ...currentTrip, foodReview: e.target.value });
                                                }}
                                                rows={5}
                                                className="w-full p-4 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-2xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F44566] leading-relaxed"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-[#F6EBD0]/70 dark:bg-[#2A251D] p-6 rounded-3xl border border-[#EEDBBA] dark:border-amber-900/50 flex flex-col justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block mb-2">
                                                Recomendación Gourmet
                                            </span>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 mb-2">
                                                {currentTrip.favoriteDish || 'Gastronomía Tradicional'}
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                                                &quot;{currentTrip.foodReview}&quot;
                                            </p>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-[#EEDBBA] dark:border-amber-900/50 flex items-center gap-1 text-[#F44566]">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star key={s} className="w-4 h-4 fill-current" />
                                            ))}
                                            <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 ml-2">5.0 / 5.0</span>
                                        </div>
                                    </div>
                                </div>

                                <DoneButton
                                    dirty={dirtyTabs.comida}
                                    isSaving={isSaving}
                                    hasSyncProblem={hasSyncProblem}
                                    onDone={() => handleTabDone('comida')}
                                    onRetry={() => onRetrySync?.()}
                                />
                            </div>
                        )}

                        {/* TAB CONTENT: TRANSPORTE */}
                        {activeTab === 'transporte' && (
                            <div className="bg-white dark:bg-[#1E2228] rounded-3xl p-8 shadow-[0_15px_35px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] dark:border-zinc-800 space-y-6 animate-in fade-in">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">
                                            {isHome
                                                ? `Movilidad Urbana y Rutas Locales en ${municipality.name}`
                                                : `Ruta, Vías y Peajes hacia ${municipality.name}`}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                                            {isHome
                                                ? 'Tu base de operaciones y residencia. No aplican peajes ni traslados turísticos.'
                                                : 'Información de acceso, peajes y recomendaciones viales'}
                                        </p>
                                    </div>
                                    {isTransportSavedFeedback && (
                                        <div
                                            role="status"
                                            aria-live="polite"
                                            className="accent-feedback-badge self-start sm:self-auto px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 animate-in fade-in"
                                        >
                                            <Check className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span>¡Cambios de ruta guardados!</span>
                                        </div>
                                    )}
                                </div>

                                {/* Banner limpio para Ciudad Hogar / Residencia */}
                                {isHome && (
                                    <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50/80 via-peach-50/50 to-amber-50/50 dark:from-rose-950/30 dark:via-zinc-900 dark:to-amber-950/20 border border-rose-200/80 dark:border-zinc-700 flex items-start gap-3 shadow-2xs">
                                        <span className="text-xl flex-shrink-0">🏠</span>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-bold text-rose-700 dark:text-rose-300">
                                                Tu base de operaciones y residencia. No aplican peajes ni traslados turísticos.
                                            </h4>
                                            <p className="text-[11px] text-slate-600 dark:text-zinc-300 mt-0.5 leading-relaxed">
                                                Utiliza este espacio para guardar notas libres de movilidad local: rutas de transporte urbano, líneas de metro, ciclorrutas, parqueaderos o atajos para moverte por tu ciudad.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* 1. Estado de la vía */}
                                    <div className="bg-[#FFFBFB] dark:bg-[#282D35] p-5 rounded-2xl border border-[#FFE4EA] dark:border-zinc-700 space-y-3">
                                        <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase tracking-wide block">
                                            {isHome ? 'Vías Urbanas y Accesos' : 'Estado de la Vía'}
                                        </label>
                                        <select
                                            id="transporte-road-condition-select"
                                            value={transportRoadCondition}
                                            onChange={(e) => {
                                                setTransportRoadCondition(e.target.value);
                                                markTabDirty('transporte');
                                            }}
                                            className="w-full px-3 py-2 bg-white dark:bg-[#1E2228] border border-rose-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F44566]/25 focus:border-[#F44566]"
                                        >
                                            <option value="Excelente">Excelente</option>
                                            <option value="Buena">Buena</option>
                                            <option value="Regular">Regular</option>
                                            <option value="Mala/Destapada">Mala/Destapada</option>
                                        </select>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {['Excelente', 'Buena', 'Regular', 'Mala/Destapada'].map((cond) => (
                                                <button
                                                    key={cond}
                                                    type="button"
                                                    onClick={() => {
                                                        setTransportRoadCondition(cond);
                                                        markTabDirty('transporte');
                                                    }}
                                                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer ${transportRoadCondition === cond
                                                            ? 'bg-[#F44566] text-white shadow-sm'
                                                            : 'bg-white dark:bg-[#1E2228] text-slate-600 dark:text-zinc-300 border border-rose-100 dark:border-zinc-700 hover:border-rose-300'
                                                        }`}
                                                >
                                                    {cond}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 2. Peajes en ruta */}
                                    <div className="bg-[#FFFBFB] dark:bg-[#282D35] p-5 rounded-2xl border border-[#FFE4EA] dark:border-zinc-700 space-y-3">
                                        <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase tracking-wide block">
                                            Peajes en Ruta
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTransportTollCount((prev) => Math.max(0, prev - 1));
                                                    markTabDirty('transporte');
                                                }}
                                                className="w-9 h-9 rounded-xl bg-white dark:bg-[#1E2228] border border-rose-200 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold text-base flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                                                title="Disminuir peajes"
                                            >
                                                -
                                            </button>
                                            <input
                                                id="transporte-toll-count-input"
                                                type="number"
                                                min="0"
                                                value={transportTollCount}
                                                onChange={(e) => {
                                                    setTransportTollCount(Math.max(0, parseInt(e.target.value, 10) || 0));
                                                    markTabDirty('transporte');
                                                }}
                                                className="w-full text-center py-2 bg-white dark:bg-[#1E2228] border border-rose-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F44566]/25 focus:border-[#F44566]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTransportTollCount((prev) => prev + 1);
                                                    markTabDirty('transporte');
                                                }}
                                                className="w-9 h-9 rounded-xl bg-white dark:bg-[#1E2228] border border-rose-200 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold text-base flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                                                title="Aumentar peajes"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium block">
                                            {isHome && transportTollCount === 0
                                                ? '0 peajes • Exento por residencia local'
                                                : transportTollCount === 0
                                                    ? 'Sin peajes cruzados'
                                                    : `${transportTollCount} peaje(s) registrado(s)`}
                                        </span>
                                    </div>

                                    {/* 3. Medio utilizado */}
                                    <div className="bg-[#FFFBFB] dark:bg-[#282D35] p-5 rounded-2xl border border-[#FFE4EA] dark:border-zinc-700 space-y-3">
                                        <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase tracking-wide block">
                                            {isHome ? 'Medio de Movilidad Habitual' : 'Medio Utilizado'}
                                        </label>
                                        <input
                                            id="transporte-mode-input"
                                            type="text"
                                            list="transporte-modes-list"
                                            value={transportMode}
                                            onChange={(e) => {
                                                setTransportMode(e.target.value);
                                                markTabDirty('transporte');
                                            }}
                                            placeholder={isHome ? "Metro, Carro, Bicicleta, Caminando..." : "Carro propio, Moto, Autobús..."}
                                            className="w-full px-3 py-2 bg-white dark:bg-[#1E2228] border border-rose-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F44566]/25 focus:border-[#F44566]"
                                        />
                                        <datalist id="transporte-modes-list">
                                            <option value="Carro propio" />
                                            <option value="Metro / Transporte masivo" />
                                            <option value="Moto" />
                                            <option value="Autobús" />
                                            <option value="Bicicleta" />
                                            <option value="Caminando" />
                                            <option value="Avión" />
                                        </datalist>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {['Carro propio', 'Metro / Transporte masivo', 'Moto', 'Bicicleta', 'Autobús'].map((mode) => (
                                                <button
                                                    key={mode}
                                                    type="button"
                                                    onClick={() => {
                                                        setTransportMode(mode);
                                                        markTabDirty('transporte');
                                                    }}
                                                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer ${transportMode === mode
                                                            ? 'bg-[#F44566] text-white shadow-sm'
                                                            : 'bg-white dark:bg-[#1E2228] text-slate-500 dark:text-zinc-300 border border-rose-100 dark:border-zinc-700 hover:border-rose-300'
                                                        }`}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Bitácora de ruta y consejos / Tips de movilidad local */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-2">
                                        {isHome
                                            ? 'Notas Libres de Movilidad Local (metro, ciclovías, atajos, transporte urbano)'
                                            : 'Bitácora de Ruta y Consejos'}
                                    </label>
                                    <textarea
                                        id="transporte-notes-textarea"
                                        value={transportNotes}
                                        onChange={(e) => {
                                            setTransportNotes(e.target.value);
                                            markTabDirty('transporte');
                                        }}
                                        rows={3}
                                        placeholder={
                                            isHome
                                                ? "Tips de movilidad urbana, estaciones cercanas, estacionamientos preferidos, rutas ciclistas y atajos de la ciudad..."
                                                : "Notas sobre el estado de la carretera, desvíos, recomendaciones y precauciones..."
                                        }
                                        className="w-full p-4 bg-[#FFFBFB] dark:bg-[#282D35] border border-rose-200 dark:border-zinc-700 rounded-2xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F44566]/25 focus:border-[#F44566] leading-relaxed resize-y"
                                    />
                                </div>

                                {/* Botón sutil en píldora al final */}
                                <div className="flex justify-end pt-2">
                                    <button
                                        id="transporte-save-btn"
                                        type="button"
                                        onClick={handleSaveTransport}
                                        className="px-6 py-2.5 rounded-full bg-[#F44566] hover:bg-[#e03757] text-white text-xs font-bold shadow-md shadow-[#F44566]/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                                    >
                                        <span>💾 Guardar cambios de ruta</span>
                                    </button>
                                </div>

                                <DoneButton
                                    dirty={dirtyTabs.transporte}
                                    isSaving={isSaving}
                                    hasSyncProblem={hasSyncProblem}
                                    onDone={() => handleTabDone('transporte')}
                                    onRetry={() => onRetrySync?.()}
                                />
                            </div>
                        )}

                        {/* TAB CONTENT: NO OLVIDAR */}
                        {activeTab === 'noolvidar' && (
                            <div className="bg-white dark:bg-[#1E2228] rounded-3xl p-8 shadow-[0_15px_35px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] dark:border-zinc-800 space-y-4 animate-in fade-in">
                                <div className="flex items-center gap-2 text-[#F44566]">
                                    <BookMarked className="w-5 h-5" />
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">
                                        No Olvidar (Libreta Familiar)
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-zinc-400">
                                    Chistes internos, hoteles recomendados, advertencias de clima o cosas para volver a hacer.
                                </p>
                                <textarea
                                    value={currentTrip.doNotForgetNotes}
                                    onChange={(e) => {
                                        markTabDirty('noolvidar');
                                        onSaveTrip({ ...currentTrip, doNotForgetNotes: e.target.value });
                                    }}
                                    rows={8}
                                    className="w-full p-5 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-2xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F44566] leading-relaxed font-sans"
                                    placeholder="Escribe aquí los recuerdos que nunca deben olvidarse..."
                                />

                                <DoneButton
                                    dirty={dirtyTabs.noolvidar}
                                    isSaving={isSaving}
                                    hasSyncProblem={hasSyncProblem}
                                    onDone={() => handleTabDone('noolvidar')}
                                    onRetry={() => onRetrySync?.()}
                                />
                            </div>
                        )}

                        {/* TAB CONTENT: RESUMEN (Tablero de lectura rápida + accesos) */}
                        {activeTab === 'resumen' && (() => {
                            const goToTab = (tab: 'resumen' | 'gastos' | 'comida' | 'transporte' | 'noolvidar' | 'fotos') => {
                                setActiveTab(tab);
                                requestAnimationFrame(() => {
                                    tabsBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                });
                            };

                            // Desglose por categoría ordenado de mayor a menor
                            const categoryTotals = new Map<string, number>();
                            (currentTrip.expenses || []).forEach((exp) => {
                                const amt = Number(exp.amountCop) || 0;
                                if (amt <= 0) return;
                                const catLabel = isTransportExpenseCategory(exp.category)
                                    ? 'Transporte'
                                    : normalizeExpenseCategoryName(exp.category || 'Otros');
                                categoryTotals.set(catLabel, (categoryTotals.get(catLabel) || 0) + amt);
                            });
                            const sortedBreakdown = Array.from(categoryTotals.entries())
                                .map(([category, total]) => ({ category, total }))
                                .sort((a, b) => b.total - a.total);
                            const visibleBreakdown = sortedBreakdown.slice(0, 4);
                            const extraCategoriesCount = Math.max(0, sortedBreakdown.length - 4);

                            // Gastos registrados significativos
                            const meaningfulExpenses = (currentTrip.expenses || []).filter(
                                (e) =>
                                    (Number(e.amountCop) || 0) > 0 ||
                                    (e.notes || '').trim().length > 0 ||
                                    !isFixedExpenseCategory(e.category)
                            );

                            // Comida
                            const favDish = (currentTrip.favoriteDish || '').trim();
                            const foodReview = (currentTrip.foodReview || '').trim();
                            const hasFoodData = Boolean(favDish || foodReview);

                            // Transporte
                            const roadCond = currentTrip.transport?.roadCondition || currentTrip.roadCondition || '';
                            const tMode = currentTrip.transport?.transportMode || currentTrip.transportMode || '';
                            const tTolls = currentTrip.transport?.tollCount ?? currentTrip.tollCount ?? 0;
                            const tNotes = (currentTrip.transport?.notes ?? currentTrip.transportNotes ?? '').trim();
                            const hasTransportData = Boolean(roadCond || tMode || tTolls > 0 || tNotes);

                            // No Olvidar
                            const notesText = (currentTrip.doNotForgetNotes || '').trim();
                            const hasDoNotForget = notesText.length > 0;

                            // Fotos
                            const photosList = currentTrip.photos || [];

                            const visitMetaLine = `${municipality.departmentName} · Visita ${safeIndex + 1} · ${currentTrip.tripDate}`;
                            const visitStatusLabel = isHome ? '🏠 Hogar · Visitado' : 'Visitado';

                            const handleCardKeyDown = (
                                e: React.KeyboardEvent<HTMLDivElement>,
                                tab: 'gastos' | 'comida' | 'transporte' | 'noolvidar' | 'fotos'
                            ) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    goToTab(tab);
                                }
                            };

                            const summaryIconMaskStyle: React.CSSProperties = {
                                maskImage: 'linear-gradient(90deg, #000 0%, #000 55%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(90deg, #000 0%, #000 55%, transparent 100%)'
                            };
                            const minimalChipClass =
                                'inline-flex items-center rounded-full border border-slate-900/[0.14] dark:border-white/[0.14] bg-transparent px-2.5 py-0.5 text-[11.5px] leading-snug text-slate-600 dark:text-zinc-300';

                            return (
                                <div className="animate-in fade-in duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                                        {/* 1) TARJETA FOTOS + ENCABEZADO DEL MUNICIPIO (compacta, 2 cols en desktop/tablet, ancho completo en móvil) */}
                                        <div className="md:col-span-2 lg:col-span-2 lg:col-start-1 lg:row-start-1 bg-white dark:bg-[#1E2228] rounded-3xl p-4 sm:p-5 shadow-[0_12px_30px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] dark:border-zinc-800 flex flex-col justify-between gap-3">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight leading-tight text-balance">
                                                        {municipality.name}
                                                    </h2>
                                                    <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium mt-0.5">
                                                        {visitMetaLine}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start">
                                                    <span className="accent-feedback-badge px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                                                        {visitStatusLabel}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => goToTab('fotos')}
                                                        className="text-xs font-bold flex items-center gap-1 hover:underline text-accent-readable cursor-pointer whitespace-nowrap"
                                                    >
                                                        <Camera className="w-3.5 h-3.5" />
                                                        <span>Fotos ({photosList.length})</span>
                                                        <span aria-hidden="true">·</span>
                                                        <span>Ver detalle</span>
                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <ResumenPhotosCarousel
                                                photos={photosList}
                                                onOpenPhoto={openPhotoLightbox}
                                                onGoToPhotosTab={() => goToTab('fotos')}
                                            />
                                        </div>

                                        {/* 2) TARJETA TOTAL ACUMULADO DE LA VISITA (arriba derecha en escritorio, compacta) */}
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => goToTab('gastos')}
                                            onKeyDown={(e) => handleCardKeyDown(e, 'gastos')}
                                            className="md:col-span-1 lg:col-span-1 lg:col-start-3 lg:row-start-1 bg-[#F6EBD0] dark:bg-[#2A251D] rounded-3xl p-4 sm:p-5 shadow-[0_12px_30px_-10px_rgba(244,69,102,0.12)] dark:shadow-none border border-[#EEDBBA] dark:border-amber-900/50 hover:border-[var(--color-accent)] transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-900/80 dark:text-amber-300">
                                                        <DollarSign className="w-3.5 h-3.5 shrink-0" />
                                                        <span className="truncate">Total Acumulado</span>
                                                    </div>
                                                    <div className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-amber-50 tracking-tight tabular-nums">
                                                        COP $ {formatThousands(totalExpensesCop)}
                                                    </div>
                                                    {isHome && totalExpensesCop === 0 && (
                                                        <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-zinc-800/90 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 text-[10px] font-bold shadow-2xs">
                                                            ✓ Presupuesto de hogar al día ($0 COP)
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        goToTab('gastos');
                                                    }}
                                                    style={{ backgroundColor: 'var(--color-accent)', color: '#ffffff' }}
                                                    className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm hover:brightness-110 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                                >
                                                    <span>{totalExpensesCop > 0 ? 'Gestionar' : 'Agregar'}</span>
                                                    <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </div>

                                            {/* Desglose compacto por categoría */}
                                            <div className="pt-2.5 border-t border-[#E6D1A8] dark:border-amber-900/40">
                                                {visibleBreakdown.length === 0 ? (
                                                    <p className="text-[11px] text-slate-600/90 dark:text-amber-200/70 italic">
                                                        Aún no has agregado gastos para esta visita.
                                                    </p>
                                                ) : (
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {visibleBreakdown.map((item) => (
                                                            <div
                                                                key={item.category}
                                                                className="px-2.5 py-1 rounded-xl bg-white/80 dark:bg-[#1E2228]/90 border border-[#EEDBBA] dark:border-zinc-700 text-[11px] flex items-center gap-1.5 shadow-2xs"
                                                            >
                                                                <span className="font-bold text-slate-700 dark:text-zinc-200 truncate max-w-[100px]">
                                                                    {item.category}
                                                                </span>
                                                                <span className="font-bold text-slate-900 dark:text-amber-200 tabular-nums">
                                                                    $ {formatThousands(item.total)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {extraCategoriesCount > 0 && (
                                                            <span className="accent-feedback-badge px-2.5 py-1 rounded-xl text-[11px] font-bold">
                                                                +{extraCategoriesCount} más
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3) TARJETA CALIFICACIÓN Y BALANCE (debajo de Total en escritorio, 3ra en móvil/tablet) */}
                                        <div className="md:col-span-1 lg:col-span-1 lg:col-start-3 lg:row-start-2 bg-white dark:bg-[#1E2228] rounded-3xl p-5 shadow-[0_12px_30px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] dark:border-zinc-800 flex flex-col gap-3">
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                                                Calificación y Balance de la Visita
                                            </h4>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className="flex items-center gap-1 text-amber-400">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => onSaveTrip({ ...currentTrip, rating: star })}
                                                            className="cursor-pointer hover:scale-110 transition-transform"
                                                            aria-label={`Calificar con ${star} estrellas`}
                                                        >
                                                            <Star
                                                                className={`w-5 h-5 ${
                                                                    star <= currentTrip.rating
                                                                        ? 'fill-amber-400 text-amber-400'
                                                                        : 'text-slate-300 dark:text-zinc-600'
                                                                }`}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 tabular-nums">
                                                    {currentTrip.rating} de 5 estrellas
                                                </span>
                                            </div>

                                            <div className="flex-1 flex flex-col min-h-0">
                                                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1.5">
                                                    Balance Global del Destino
                                                </label>
                                                <textarea
                                                    value={currentTrip.summary}
                                                    onChange={(e) => onSaveTrip({ ...currentTrip, summary: e.target.value })}
                                                    rows={3}
                                                    placeholder="Resume cómo estuvo esta visita..."
                                                    className="flex-1 min-h-[84px] w-full p-3 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-2xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F44566] leading-relaxed resize-none"
                                                />
                                            </div>
                                        </div>

                                        {/* 4) TARJETA GASTOS (sube debajo de Fotos en escritorio, col 1 row 2) */}
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => goToTab('gastos')}
                                            onKeyDown={(e) => handleCardKeyDown(e, 'gastos')}
                                            className="lg:col-span-1 lg:col-start-1 lg:row-start-2 relative overflow-hidden rounded-[28px] bg-white dark:bg-[#1E2228] border border-slate-900/[0.06] dark:border-white/[0.05] hover:border-slate-900/[0.12] dark:hover:border-white/[0.12] transition-colors cursor-pointer min-h-[210px] pt-5 pb-6 pr-5 pl-0 group"
                                        >
                                            <div
                                                aria-hidden="true"
                                                style={summaryIconMaskStyle}
                                                className="absolute left-0 top-0 bottom-0 w-[34%] md:w-[40%] flex items-center justify-center text-zinc-400/70 dark:text-zinc-400 pointer-events-none select-none"
                                            >
                                                <MoneyIcon />
                                            </div>

                                            <div className="relative z-10 ml-[36%] md:ml-[44%] flex flex-col justify-start gap-3 min-w-0">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <h4 className="text-xl font-semibold text-slate-900 dark:text-zinc-100 leading-tight truncate">
                                                        Gastos
                                                    </h4>
                                                    <span className="text-xs font-semibold flex items-center gap-0.5 shrink-0 group-hover:underline text-accent-readable whitespace-nowrap">
                                                        <span>{meaningfulExpenses.length > 0 ? 'Ver detalle' : 'Agregar'}</span>
                                                        <span aria-hidden="true">›</span>
                                                    </span>
                                                </div>

                                                <div className="space-y-1 min-w-0">
                                                    <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight tabular-nums truncate">
                                                        COP $ {formatThousands(totalExpensesCop)}
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                                                        {meaningfulExpenses.length}{' '}
                                                        {meaningfulExpenses.length === 1
                                                            ? 'gasto registrado'
                                                            : 'gastos registrados'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 5) TARJETA COMIDA (sube debajo de Fotos en escritorio, col 2 row 2) */}
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => goToTab('comida')}
                                            onKeyDown={(e) => handleCardKeyDown(e, 'comida')}
                                            className="lg:col-span-1 lg:col-start-2 lg:row-start-2 relative overflow-hidden rounded-[28px] bg-white dark:bg-[#1E2228] border border-slate-900/[0.06] dark:border-white/[0.05] hover:border-slate-900/[0.12] dark:hover:border-white/[0.12] transition-colors cursor-pointer min-h-[210px] pt-5 pb-6 pr-5 pl-0 group"
                                        >
                                            <div
                                                aria-hidden="true"
                                                style={summaryIconMaskStyle}
                                                className="absolute left-0 top-0 bottom-0 w-[34%] md:w-[40%] flex items-center justify-center text-zinc-400/70 dark:text-zinc-400 pointer-events-none select-none"
                                            >
                                                <PlateIcon />
                                            </div>

                                            <div className="relative z-10 ml-[36%] md:ml-[44%] flex flex-col justify-start gap-3 min-w-0">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <h4 className="text-xl font-semibold text-slate-900 dark:text-zinc-100 leading-tight truncate">
                                                        Comida
                                                    </h4>
                                                    <span className="text-xs font-semibold flex items-center gap-0.5 shrink-0 group-hover:underline text-accent-readable whitespace-nowrap">
                                                        <span>{hasFoodData ? 'Ver detalle' : 'Agregar'}</span>
                                                        <span aria-hidden="true">›</span>
                                                    </span>
                                                </div>

                                                <div className="flex flex-col gap-2.5 min-w-0">
                                                    <div>
                                                        <span className={`${minimalChipClass} max-w-full`}>
                                                            <span className="truncate">{favDish || 'Sin plato favorito'}</span>
                                                        </span>
                                                    </div>
                                                    {foodReview && (
                                                        <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                                            {foodReview}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 6) TARJETA TRANSPORTE */}
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => goToTab('transporte')}
                                            onKeyDown={(e) => handleCardKeyDown(e, 'transporte')}
                                            className="lg:col-span-1 lg:col-start-1 lg:row-start-3 relative overflow-hidden rounded-[28px] bg-white dark:bg-[#1E2228] border border-slate-900/[0.06] dark:border-white/[0.05] hover:border-slate-900/[0.12] dark:hover:border-white/[0.12] transition-colors cursor-pointer min-h-[210px] pt-5 pb-6 pr-5 pl-0 group"
                                        >
                                            <div
                                                aria-hidden="true"
                                                style={summaryIconMaskStyle}
                                                className="absolute left-0 top-0 bottom-0 w-[34%] md:w-[40%] flex items-center justify-center text-zinc-400/70 dark:text-zinc-400 pointer-events-none select-none"
                                            >
                                                <CarIcon />
                                            </div>

                                            <div className="relative z-10 ml-[36%] md:ml-[44%] flex flex-col justify-start gap-3 min-w-0">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <h4 className="text-xl font-semibold text-slate-900 dark:text-zinc-100 leading-tight truncate">
                                                        Transporte
                                                    </h4>
                                                    <span className="text-xs font-semibold flex items-center gap-0.5 shrink-0 group-hover:underline text-accent-readable whitespace-nowrap">
                                                        <span>{hasTransportData ? 'Ver detalle' : 'Agregar'}</span>
                                                        <span aria-hidden="true">›</span>
                                                    </span>
                                                </div>

                                                {!hasTransportData ? (
                                                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed text-left">
                                                        Aún no has agregado nada.
                                                    </p>
                                                ) : (
                                                    <div className="flex flex-col gap-2.5 min-w-0">
                                                        {(roadCond || tMode || tTolls > 0) && (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {roadCond && (
                                                                    <span className={minimalChipClass}>
                                                                        Vía: {roadCond}
                                                                    </span>
                                                                )}
                                                                {tMode && (
                                                                    <span className={minimalChipClass}>
                                                                        {tMode}
                                                                    </span>
                                                                )}
                                                                {(tTolls > 0 || roadCond || tMode) && (
                                                                    <span className={minimalChipClass}>
                                                                        {tTolls} {tTolls === 1 ? 'peaje' : 'peajes'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {tNotes && (
                                                            <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed text-left">
                                                                {tNotes}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 7) TARJETA NO OLVIDAR */}
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => goToTab('noolvidar')}
                                            onKeyDown={(e) => handleCardKeyDown(e, 'noolvidar')}
                                            className="lg:col-span-1 lg:col-start-2 lg:row-start-3 relative overflow-hidden rounded-[28px] bg-white dark:bg-[#1E2228] border border-slate-900/[0.06] dark:border-white/[0.05] hover:border-slate-900/[0.12] dark:hover:border-white/[0.12] transition-colors cursor-pointer min-h-[210px] pt-5 pb-6 pr-5 pl-0 group"
                                        >
                                            <div
                                                aria-hidden="true"
                                                style={summaryIconMaskStyle}
                                                className="absolute left-0 top-0 bottom-0 w-[34%] md:w-[40%] flex items-center justify-center text-zinc-400/70 dark:text-zinc-400 pointer-events-none select-none"
                                            >
                                                <NotebookIcon />
                                            </div>

                                            <div className="relative z-10 ml-[36%] md:ml-[44%] flex flex-col justify-start gap-3 min-w-0">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <h4 className="text-xl font-semibold text-slate-900 dark:text-zinc-100 leading-tight truncate">
                                                        No Olvidar
                                                    </h4>
                                                    <span className="text-xs font-semibold flex items-center gap-0.5 shrink-0 group-hover:underline text-accent-readable whitespace-nowrap">
                                                        <span>{hasDoNotForget ? 'Editar' : 'Agregar'}</span>
                                                        <span aria-hidden="true">›</span>
                                                    </span>
                                                </div>

                                                {!hasDoNotForget ? (
                                                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed text-left">
                                                        Aún no has agregado nada.
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-3 whitespace-pre-line leading-relaxed text-left">
                                                        {notesText}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* 8) TARJETA QUICK NOTES (edición rápida directa) */}
                                        <div className="md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-3 bg-white dark:bg-[#1E2228] rounded-3xl p-5 shadow-[0_12px_30px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] dark:border-zinc-800 flex flex-col justify-between gap-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                                                    Quick notes
                                                </h4>
                                                <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500">
                                                    Guardado automático
                                                </span>
                                            </div>
                                            <textarea
                                                value={currentTrip.doNotForgetNotes}
                                                onChange={(e) => {
                                                    onSaveTrip({ ...currentTrip, doNotForgetNotes: e.target.value });
                                                }}
                                                rows={3}
                                                placeholder="Quick notes..."
                                                className="flex-1 w-full p-3 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-2xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F44566] resize-none leading-relaxed"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Lightbox Modal (con navegación anterior/siguiente y Esc) */}
            {lightboxPhoto && (() => {
                const photos = currentTrip?.photos || [];
                const resolvedIdx =
                    lightboxIndex !== null && lightboxIndex < photos.length
                        ? lightboxIndex
                        : photos.findIndex((p) => p.url === lightboxPhoto);
                const activeUrl = resolvedIdx >= 0 ? photos[resolvedIdx]?.url : lightboxPhoto;
                const activeCaption = resolvedIdx >= 0 ? photos[resolvedIdx]?.caption : '';
                const hasMultiple = photos.length > 1 && resolvedIdx >= 0;

                const goPrev = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (!hasMultiple) return;
                    const nextIdx = (resolvedIdx - 1 + photos.length) % photos.length;
                    setLightboxIndex(nextIdx);
                    setLightboxPhoto(photos[nextIdx].url);
                };

                const goNext = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (!hasMultiple) return;
                    const nextIdx = (resolvedIdx + 1) % photos.length;
                    setLightboxIndex(nextIdx);
                    setLightboxPhoto(photos[nextIdx].url);
                };

                return (
                    <div
                        onClick={closeLightbox}
                        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 cursor-pointer animate-in fade-in"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Visor de fotos"
                    >
                        {hasMultiple && (
                            <button
                                type="button"
                                onClick={goPrev}
                                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-sm flex items-center justify-center transition-all cursor-pointer"
                                aria-label="Foto anterior"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}

                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center cursor-default"
                        >
                            <div className="w-full flex items-center justify-between gap-4 mb-3">
                                <span className="text-xs font-bold text-white/85 truncate">
                                    {hasMultiple
                                        ? `${resolvedIdx + 1} / ${photos.length}${activeCaption ? ` · ${activeCaption}` : ''}`
                                        : activeCaption || ''}
                                </span>
                                <button
                                    type="button"
                                    onClick={closeLightbox}
                                    className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                    aria-label="Cerrar visor"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <img
                                src={activeUrl}
                                alt={activeCaption || 'Foto ampliada'}
                                className="rounded-3xl max-h-[80vh] w-auto object-contain shadow-2xl border border-white/20"
                                referrerPolicy="no-referrer"
                            />
                        </div>

                        {hasMultiple && (
                            <button
                                type="button"
                                onClick={goNext}
                                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-sm flex items-center justify-center transition-all cursor-pointer"
                                aria-label="Siguiente foto"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                );
            })()}

            {/* Add New Visit Modal */}
            {showNewVisitModal && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#FFE4EA] dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">
                                Añadir Nueva Visita a {municipality.name}
                            </h3>
                            <button
                                onClick={() => setShowNewVisitModal(false)}
                                className="text-slate-400 dark:text-zinc-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                                    Fecha del Viaje
                                </label>
                                <input
                                    type="date"
                                    value={newVisitDate}
                                    onChange={(e) => setNewVisitDate(e.target.value)}
                                    onClick={(e) => {
                                        try {
                                            (e.currentTarget as HTMLInputElement).showPicker?.();
                                        } catch { }
                                    }}
                                    className="w-full px-4 py-2.5 rounded-2xl border border-rose-200 dark:border-zinc-700 bg-white dark:bg-[#282D35] text-gray-700 dark:text-zinc-100 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all cursor-pointer"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                                    Resumen o Motivo del Viaje
                                </label>
                                <textarea
                                    value={newVisitSummary}
                                    onChange={(e) => setNewVisitSummary(e.target.value)}
                                    rows={3}
                                    placeholder="Ej: Vacaciones de mitad de año con los primos..."
                                    className="w-full p-3 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-2xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F44566]"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewVisitModal(false)}
                                    className="flex-1 py-2.5 rounded-full border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-600 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddNewTrip}
                                    style={{
                                        backgroundColor: 'var(--color-accent)',
                                        borderColor: 'var(--color-accent-soft)'
                                    }}
                                    className="flex-1 py-2.5 rounded-full text-white text-xs font-bold shadow-md hover:opacity-95 cursor-pointer"
                                >
                                    Estampar Visita
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL HISTORIAS DE INSTAGRAM (9:16 Shareable Card) */}
            {showStoryModal && currentTrip && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white/95 dark:bg-zinc-900/95 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#FFE4EA] dark:border-zinc-800 flex flex-col items-center">
                        <div className="w-full flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-[#F44566]" />
                                <span>Tarjeta para Historias de Instagram (9:16)</span>
                            </h3>
                            <button
                                onClick={() => setShowStoryModal(false)}
                                className="text-slate-400 dark:text-zinc-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 9:16 Vertical Card Preview rendered with Ref for html2canvas */}
                        <div className="py-2">
                            <div
                                ref={storyCardRef}
                                className="w-[300px] h-[533px] rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl border-4 border-white select-none"
                                style={{
                                    background: 'linear-gradient(175deg, #FFBDC9 0%, #FFE8ED 45%, #FFF5F5 100%)'
                                }}
                            >
                                {/* Decorative background watermark stamp */}
                                <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full border-4 border-dashed border-[#F44566]/15 pointer-events-none" />

                                {/* Card Header: Stamp & Destination */}
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold tracking-widest text-[#F44566] uppercase bg-white/70 px-2.5 py-1 rounded-full border border-rose-200">
                                            PASAPORTE COLOMBIA
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-600 bg-white/70 px-2.5 py-1 rounded-full border border-rose-200">
                                            {currentTrip.tripDate}
                                        </span>
                                    </div>

                                    {/* Stamp Graphic */}
                                    <div className="mt-3 mx-auto w-24 h-24 rounded-full border-2 border-dashed border-[#2C3E50] p-1 flex items-center justify-center transform -rotate-6 bg-white/40">
                                        <div className="w-full h-full rounded-full border border-solid border-[#2C3E50] flex flex-col items-center justify-center text-center p-1 text-[#2C3E50]">
                                            <span className="text-[7px] font-bold tracking-widest uppercase">VISITADO</span>
                                            <span className="text-[10px] font-bold uppercase leading-tight">{municipality.name}</span>
                                            <span className="text-[7px] font-semibold">{municipality.departmentName}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Featured Photo */}
                                <div className="relative z-10 my-2">
                                    <div
                                        ref={storyImageRef}
                                        className="w-full h-44 rounded-2xl overflow-hidden shadow-lg border-2 border-white bg-white"
                                    >
                                        {storyImageLoading ? (
                                            <div className="w-full h-full animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 flex items-center justify-center">
                                                <div className="w-12 h-12 rounded-full bg-white/60" />
                                            </div>
                                        ) : storyImageUrl ? (
                                            <img
                                                src={storyImageUrl}
                                                alt={municipality.name}
                                                crossOrigin="anonymous"
                                                referrerPolicy="no-referrer"
                                                onError={onStoryImageError}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div
                                                className="w-full h-full relative flex items-center justify-center overflow-hidden select-none"
                                                style={{
                                                    background:
                                                        'linear-gradient(135deg, var(--color-accent-soft) 0%, var(--color-accent-light) 100%)'
                                                }}
                                            >
                                                <div
                                                    className="absolute -right-5 -bottom-5 w-28 h-28 rounded-full opacity-20 pointer-events-none"
                                                    style={{ backgroundColor: 'var(--color-accent)' }}
                                                />
                                                <span
                                                    className="text-7xl font-bold tracking-tight opacity-25"
                                                    style={{ color: 'var(--color-accent)' }}
                                                    aria-hidden="true"
                                                >
                                                    {municipality.name.trim().charAt(0).toUpperCase() || 'M'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-3 text-center">
                                        <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
                                            {municipality.name}
                                        </h2>
                                        <p className="text-xs font-semibold text-[#F44566]">
                                            {municipality.departmentName}, Colombia
                                        </p>

                                        {/* Stars */}
                                        <div className="flex justify-center items-center gap-0.5 mt-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`w-3.5 h-3.5 ${i < (currentTrip.rating || 5)
                                                            ? 'text-amber-400 fill-amber-400'
                                                            : 'text-slate-300'
                                                        }`}
                                                />
                                            ))}
                                        </div>

                                        <p className="text-[10px] text-slate-600 line-clamp-2 mt-1.5 px-3 italic">
                                            "{currentTrip.summary || `Explorando las maravillas de ${municipality.name}`}"
                                        </p>
                                    </div>
                                </div>

                                {/* Footer Stamp Badge */}
                                <div className="relative z-10 text-center pt-2 border-t border-rose-200/60">
                                    <span className="text-[10px] font-bold text-slate-700 bg-white/80 px-3 py-1 rounded-full shadow-xs border border-rose-100 inline-block">
                                        🇨🇴 Bitácora Familiar | Pasaporte Colombia
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="w-full flex gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() => setShowStoryModal(false)}
                                className="flex-1 py-2.5 rounded-full border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                                Cerrar
                            </button>
                            <button
                                type="button"
                                id="download-story-png-btn"
                                disabled={isGeneratingStory}
                                onClick={handleDownloadStory}
                                className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-[#F44566] to-[#FEA38E] text-white text-xs font-bold shadow-md shadow-[#F44566]/25 hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>{isGeneratingStory ? 'Generando...' : 'Descargar Imagen (PNG)'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PASSPORT PRINTABLE FICHA (Visible during window.print()) */}
            {currentTrip && (
                <div className="hidden print:block p-8 bg-white text-slate-800 max-w-4xl mx-auto font-sans">
                    <div className="border-4 border-[#2C3E50] p-6 rounded-2xl relative">

                        {/* Header with Stamp */}
                        <div className="flex items-start justify-between border-b-2 border-[#2C3E50] pb-4 mb-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-widest text-[#F44566]">
                                    PASAPORTE COLOMBIA — BITÁCORA OFICIAL
                                </span>
                                <h1 className="text-3xl font-bold text-slate-900 mt-1">
                                    {municipality.name}, {municipality.departmentName}
                                </h1>
                                <p className="text-sm font-semibold text-slate-600 mt-0.5">
                                    Fecha de la Visita: {currentTrip.tripDate} | Calificación: {currentTrip.rating || 5}/5 ★
                                </p>
                            </div>

                            {/* Passport Stamp in Corner */}
                            <div className="w-28 h-28 rounded-full border-2 border-dashed border-[#2C3E50] p-1 flex items-center justify-center text-center rotate-3 flex-shrink-0">
                                <div className="w-full h-full rounded-full border border-solid border-[#2C3E50] flex flex-col items-center justify-center p-1 text-[#2C3E50]">
                                    <span className="text-[8px] font-bold uppercase tracking-wider">SELLO OFICIAL</span>
                                    <span className="text-xs font-bold uppercase">{municipality.name}</span>
                                    <span className="text-[8px] font-semibold">{currentTrip.tripDate}</span>
                                </div>
                            </div>
                        </div>

                        {/* Travel Summary */}
                        <div className="mb-6">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Resumen del Viaje
                            </h2>
                            <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                                {currentTrip.summary || 'Expedición realizada con éxito por el territorio colombiano.'}
                            </p>
                        </div>

                        {/* Gastronomy & Transport */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Gastronomía & Plato Típico
                                </h3>
                                <p className="text-xs font-bold text-slate-800">{currentTrip.favoriteDish || 'Plato local'}</p>
                                <p className="text-xs text-slate-600 mt-1">{currentTrip.foodReview || 'Sin reseña registrada.'}</p>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Transporte & Ruta
                                </h3>
                                <p className="text-xs text-slate-600">{currentTrip.transportNotes || 'Ruta sin contratiempos.'}</p>
                                <p className="text-xs font-semibold text-slate-700 mt-1">
                                    Estado de la vía: {currentTrip.roadCondition || 'Buena'} | Peajes: {currentTrip.tollCount || 0}
                                </p>
                            </div>
                        </div>

                        {/* Expenses Summary */}
                        {currentTrip.expenses && currentTrip.expenses.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                    Balance de Gastos Registrados
                                </h3>
                                <table className="w-full text-left text-xs border border-slate-200">
                                    <thead className="bg-slate-100 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="p-2">Fecha</th>
                                            <th className="p-2">Categoría</th>
                                            <th className="p-2">Notas</th>
                                            <th className="p-2 text-right">Gasto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {currentTrip.expenses.map((exp) => (
                                            <tr key={exp.id}>
                                                <td className="p-2">{exp.date}</td>
                                                <td className="p-2">{exp.category}</td>
                                                <td className="p-2">{exp.notes || '—'}</td>
                                                <td className="p-2 text-right font-bold">$ {(Number(exp.amountCop) || 0).toLocaleString('es-CO')}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-50 font-bold">
                                            <td colSpan={3} className="p-2 text-right">Total Invertido:</td>
                                            <td className="p-2 text-right text-rose-600 font-bold tabular-nums">
                                                $ {totalExpensesCop.toLocaleString('es-CO')} COP
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="pt-4 border-t border-slate-300 text-center text-[10px] text-slate-500">
                            Pasaporte Colombia — Bitácora Familiar | Registro histórico preservado
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal for Delete Trip */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-rose-100 dark:border-zinc-800 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-zinc-800 text-rose-500 flex items-center justify-center mx-auto text-2xl">
                            🗑️
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-slate-800 dark:text-zinc-100">
                                ¿Eliminar registro de visita?
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
                                ¿Seguro que deseas eliminar el registro de esta visita ({currentTrip?.tripDate}) en {municipality.name}?
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                id="confirm-delete-trip-btn"
                                type="button"
                                onClick={handleDeleteTripConfirmed}
                                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-xs font-bold shadow-md shadow-rose-500/25 transition-all cursor-pointer active:scale-95"
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal for Changing/Unsetting Home Municipality */}
            {showHomeChangeConfirm && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-rose-100 dark:border-zinc-800 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FFF5F7] to-[#FFE8ED] dark:from-zinc-800 dark:to-zinc-800 text-rose-500 flex items-center justify-center mx-auto text-2xl shadow-inner">
                            🏠
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-slate-800 dark:text-zinc-100">
                                ¿Cambiar tu ciudad de residencia?
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-zinc-300 mt-2 leading-relaxed">
                                <span className="font-bold text-slate-800 dark:text-zinc-100">{municipality.name}</span> está configurada actualmente como tu ciudad hogar / residencia base. Si te has mudado o deseas cambiarla, puedes desmarcarla aquí o seleccionar cualquier otro municipio como tu nuevo hogar.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                id="unset-home-city-confirm-btn"
                                type="button"
                                onClick={() => {
                                    if (onSetHomeMunicipality) onSetHomeMunicipality(null);
                                    setShowHomeChangeConfirm(false);
                                }}
                                className="w-full px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-xs font-bold shadow-md shadow-rose-500/25 transition-all cursor-pointer active:scale-95"
                            >
                                Dejar de marcar como mi hogar
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowHomeChangeConfirm(false)}
                                className="w-full px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Mantener {municipality.name} como mi hogar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Confirmation Modal for Delete Photo */}
            <ConfirmDialog
                open={Boolean(photoToDelete)}
                title="¿Eliminar esta foto?"
                description="Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                destructive
                loading={isDeletingPhoto}
                loadingLabel="Eliminando…"
                onConfirm={handleConfirmDeletePhoto}
                onCancel={handleCancelDeletePhoto}
            >
                {photoToDelete && (
                    <div className="flex flex-col items-center">
                        <img
                            src={photoToDelete.url}
                            alt={photoToDelete.caption || 'Vista previa de la foto a eliminar'}
                            className="max-h-[160px] w-auto max-w-full rounded-2xl object-cover border border-slate-200/80 dark:border-zinc-700/80 shadow-sm"
                            referrerPolicy="no-referrer"
                        />
                        {photoToDelete.caption?.trim() && (
                            <p
                                className="mt-2 text-xs text-slate-500 dark:text-zinc-400 truncate max-w-full px-2"
                                title={photoToDelete.caption}
                            >
                                {photoToDelete.caption}
                            </p>
                        )}
                    </div>
                )}
            </ConfirmDialog>
        </div>
    );
};
