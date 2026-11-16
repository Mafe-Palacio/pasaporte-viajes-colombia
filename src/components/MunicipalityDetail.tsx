import React, { useState, useMemo, useRef } from 'react';
import { trackedObjectURL } from '../services/photoFiles';
import { newId } from '../services/api';
import html2canvas from 'html2canvas';
import {
    ArrowLeft, Plus, Camera, Utensils, DollarSign,
    Car, BookMarked, Star, X, Check, Upload, ChevronRight,
    Sparkles, MapPin, Calendar, Heart, BarChart3, FileText, Share2, Download, Printer, Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Municipality, TripEntry, ExpenseLog, TripPhoto } from '../types';

interface MunicipalityDetailProps {
    municipality: Municipality;
    trips: TripEntry[];
    homeMunicipalityId?: string | null;
    onSetHomeMunicipality?: (municipalityId: string | null) => void;
    onBack: () => void;
    onSaveTrip: (trip: TripEntry) => void;
    onDeleteTrip?: (municipalityId: string, tripId: string) => void;
    onNavigateToReportes?: () => void;
}

export const MunicipalityDetail: React.FC<MunicipalityDetailProps> = ({
    municipality,
    trips,
    homeMunicipalityId,
    onSetHomeMunicipality,
    onBack,
    onSaveTrip,
    onDeleteTrip,
    onNavigateToReportes
}) => {
    const isHome = Boolean(
        municipality.isHome ||
        (homeMunicipalityId && (homeMunicipalityId === municipality.id || homeMunicipalityId === municipality.code))
    );

    const [selectedTripIndex, setSelectedTripIndex] = useState(
        trips.length > 0 ? trips.length - 1 : 0
    );
    const [activeTab, setActiveTab] = useState<'gastos' | 'fotos' | 'comida' | 'transporte' | 'noolvidar' | 'resumen'>('gastos');
    const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

    // Home city change confirmation state
    const [showHomeChangeConfirm, setShowHomeChangeConfirm] = useState(false);

    // Deletion confirmation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

    // Adjust selected index reactively if trips count changes
    React.useEffect(() => {
        if (trips.length > 0 && selectedTripIndex >= trips.length) {
            setSelectedTripIndex(Math.max(0, trips.length - 1));
        }
    }, [trips.length, selectedTripIndex]);

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
                            {municipality.description}
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
                                            <div className="flex items-center gap-1 text-[9px] tracking-[0.22em] font-black uppercase border-b border-slate-700 pb-0.5 mb-1 text-[#1E293B]">
                                                <span>★</span>
                                                <span>REPÚBLICA DE COLOMBIA</span>
                                                <span>★</span>
                                            </div>

                                            <div className="text-2xl my-0.5">🏠</div>

                                            <span className="text-[9px] font-black tracking-[0.16em] uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 mb-1 border border-slate-300">
                                                CIUDAD HOGAR / RESIDENCIA
                                            </span>

                                            <h3 className="text-xs font-black tracking-wide uppercase px-1 leading-tight text-slate-800 my-0.5">
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
                                            <h3 className="text-sm font-extrabold tracking-wide uppercase px-1 leading-tight my-1 text-slate-800">
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

                        {/* SUB-NAVBAR HORIZONTAL PILL BAR matching Screenshot 4 */}
                        <div className="flex justify-center">
                            <div className="bg-[#F6EBD0]/95 dark:bg-zinc-900/95 backdrop-blur-md p-1 rounded-full shadow-[0_10px_30px_-10px_rgba(0,0,0,0.2)] border border-[#FFE4EA] dark:border-zinc-800 flex items-center gap-1 overflow-x-auto max-w-full">
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

                        {/* TAB CONTENT: GASTOS (Shown in Screenshot 4) */}
                        {activeTab === 'gastos' && (
                            <div className="space-y-6 animate-in fade-in duration-200">
                                {/* Banner informativo de Residencia / Ciudad Hogar */}
                                {isHome && (
                                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-rose-50/50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-zinc-900 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3 shadow-xs">
                                        <span className="text-xl flex-shrink-0">🏠</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                                    Base de Operaciones y Residencia Actual
                                                </h4>
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/60">
                                                    Balance $0 COP Válido
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-zinc-300 mt-1 leading-relaxed">
                                                En tu ciudad hogar no aplican gastos turísticos obligatorios de peajes ni hospedajes. Tu balance puede permanecer en $0 COP sin considerarse incompleto. Si tienes consumos o salidas especiales, puedes registrarlas opcionalmente.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Main 2-column layout matching Screenshot 4 */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Left Column: Categorized Expenses Inputs matching Screenshot 4 */}
                                    <div className="lg:col-span-2 bg-white dark:bg-[#1E2228] rounded-3xl p-6 sm:p-8 shadow-[0_15px_35px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] dark:border-zinc-800/80 space-y-4">
                                        {['Comida', 'Peajes', 'Hospedaje', 'Otros'].map((category) => {
                                            const exp = currentTrip.expenses.find((e) => e.category === category);
                                            const amount = exp ? exp.amountCop : 0;
                                            const notes = exp ? exp.notes : '';
                                            const date = exp ? exp.date : currentTrip.tripDate;

                                            return (
                                                <div
                                                    key={category}
                                                    className="flex flex-col sm:flex-row items-center gap-3 text-xs"
                                                >
                                                    <span className="w-24 font-bold text-slate-800 dark:text-zinc-100 text-sm self-start sm:self-center">
                                                        {category}
                                                    </span>

                                                    {/* COP input */}
                                                    <div className="relative flex-1 w-full">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={amount || ''}
                                                            onChange={(e) => {
                                                                const parsed = parseFloat(e.target.value);
                                                                const newAmount = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
                                                                const updatedExpenses = exp
                                                                    ? currentTrip.expenses.map((item) =>
                                                                          item.id === exp.id
                                                                              ? { ...item, amountCop: newAmount }
                                                                              : item
                                                                      )
                                                                    : [
                                                                          ...currentTrip.expenses,
                                                                          {
                                                                              id: newId(),
                                                                              tripEntryId: currentTrip.id,
                                                                              category: category as ExpenseLog['category'],
                                                                              amountCop: newAmount,
                                                                              date: currentTrip.tripDate,
                                                                              notes: ''
                                                                          }
                                                                      ];
                                                                onSaveTrip({ ...currentTrip, expenses: updatedExpenses });
                                                            }}
                                                            placeholder="COP"
                                                            className="w-full px-4 py-2.5 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-full text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-[#F44566]"
                                                        />
                                                    </div>

                                                    {/* Date tag pill */}
                                                    <div className="px-3 py-2.5 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-full text-slate-600 dark:text-zinc-300 text-xs whitespace-nowrap min-w-[100px] text-center w-full sm:w-auto">
                                                        {date}
                                                    </div>

                                                    {/* Notes field */}
                                                    <div className="flex-1 w-full">
                                                        <input
                                                            type="text"
                                                            maxLength={500}
                                                            value={notes}
                                                            onChange={(e) => {
                                                                const newNotes = e.target.value.slice(0, 500);
                                                                const updatedExpenses = exp
                                                                    ? currentTrip.expenses.map((item) =>
                                                                          item.id === exp.id
                                                                              ? { ...item, notes: newNotes }
                                                                              : item
                                                                      )
                                                                    : [
                                                                          ...currentTrip.expenses,
                                                                          {
                                                                              id: newId(),
                                                                              tripEntryId: currentTrip.id,
                                                                              category: category as ExpenseLog['category'],
                                                                              amountCop: 0,
                                                                              date: currentTrip.tripDate,
                                                                              notes: newNotes
                                                                          }
                                                                      ];
                                                                onSaveTrip({ ...currentTrip, expenses: updatedExpenses });
                                                            }}
                                                            placeholder="Notes"
                                                            className="w-full px-4 py-2.5 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-full text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-[#F44566]"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Sección de Gastos adicionales */}
                                        {(() => {
                                            const firstOtrosExpense = currentTrip.expenses.find((e) => e.category === 'Otros');
                                            const additionalExpenses = currentTrip.expenses.filter(
                                                (e) => e.category === 'Otros' && e.id !== firstOtrosExpense?.id
                                            );

                                            const handleAddExtraExpense = () => {
                                                const nextExpenses = [...currentTrip.expenses];
                                                if (!firstOtrosExpense) {
                                                    nextExpenses.push({
                                                        id: newId(),
                                                        tripEntryId: currentTrip.id,
                                                        category: 'Otros',
                                                        amountCop: 0,
                                                        date: currentTrip.tripDate,
                                                        notes: ''
                                                    });
                                                }
                                                nextExpenses.push({
                                                    id: newId(),
                                                    tripEntryId: currentTrip.id,
                                                    category: 'Otros',
                                                    amountCop: 0,
                                                    date: currentTrip.tripDate,
                                                    notes: ''
                                                });
                                                onSaveTrip({ ...currentTrip, expenses: nextExpenses });
                                            };

                                            const handleUpdateExtraExpense = (
                                                expenseId: string,
                                                patch: Partial<Pick<ExpenseLog, 'amountCop' | 'notes'>>
                                            ) => {
                                                const updatedExpenses = currentTrip.expenses.map((item) =>
                                                    item.id === expenseId ? { ...item, ...patch } : item
                                                );
                                                onSaveTrip({ ...currentTrip, expenses: updatedExpenses });
                                            };

                                            const handleDeleteExtraExpense = (expenseId: string) => {
                                                const updatedExpenses = currentTrip.expenses.filter((item) => item.id !== expenseId);
                                                onSaveTrip({ ...currentTrip, expenses: updatedExpenses });
                                            };

                                            return (
                                                <div className="pt-4 mt-2 border-t border-[#FFE4EA] dark:border-zinc-800 space-y-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                                                                Gastos adicionales
                                                            </h4>
                                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                                                Agrega entradas, recuerdos, parqueaderos u otros gastos de esta visita
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

                                                    {additionalExpenses.length > 0 && (
                                                        <div className="space-y-2.5 pt-1">
                                                            {additionalExpenses.map((expense) => (
                                                                <div
                                                                    key={expense.id}
                                                                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-xs p-3 sm:p-0 rounded-2xl sm:rounded-none bg-[#FFFBFB]/60 sm:bg-transparent dark:bg-[#282D35]/40 sm:dark:bg-transparent border border-[#FFE4EA] sm:border-0 dark:border-zinc-800"
                                                                >
                                                                    {/* Descripción (texto, máximo 500 caracteres) */}
                                                                    <div className="flex-1 w-full">
                                                                        <input
                                                                            type="text"
                                                                            maxLength={500}
                                                                            value={expense.notes}
                                                                            onChange={(e) =>
                                                                                handleUpdateExtraExpense(expense.id, {
                                                                                    notes: e.target.value.slice(0, 500)
                                                                                })
                                                                            }
                                                                            placeholder="Descripción del gasto"
                                                                            aria-label="Descripción del gasto adicional"
                                                                            className="w-full px-4 py-2.5 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-full text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-[#F44566]"
                                                                        />
                                                                    </div>

                                                                    {/* Monto en COP (número >= 0) */}
                                                                    <div className="w-full sm:w-36">
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            value={expense.amountCop || ''}
                                                                            onChange={(e) => {
                                                                                const parsed = parseFloat(e.target.value);
                                                                                const amountCop = Number.isFinite(parsed)
                                                                                    ? Math.max(0, parsed)
                                                                                    : 0;
                                                                                handleUpdateExtraExpense(expense.id, { amountCop });
                                                                            }}
                                                                            placeholder="COP"
                                                                            aria-label="Monto en COP del gasto adicional"
                                                                            className="w-full px-4 py-2.5 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-full text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-[#F44566]"
                                                                        />
                                                                    </div>

                                                                    <div className="flex items-center justify-between sm:justify-start gap-2">
                                                                        {/* Fecha de la visita (solo informativa) */}
                                                                        <div className="px-3 py-2.5 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-full text-slate-600 dark:text-zinc-300 text-xs whitespace-nowrap min-w-[100px] text-center flex-1 sm:flex-initial">
                                                                            {expense.date || currentTrip.tripDate}
                                                                        </div>

                                                                        {/* Botón de papelera para eliminar */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteExtraExpense(expense.id)}
                                                                            title="Eliminar gasto adicional"
                                                                            aria-label="Eliminar gasto adicional"
                                                                            className="p-2.5 rounded-full bg-white dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer flex-shrink-0 active:scale-95"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Right Column: Pastel Cream Total Acumulado Card matching Screenshot 4 */}
                                    <div className="bg-[#F6EBD0] dark:bg-[#2A251D] rounded-3xl p-8 shadow-[0_15px_35px_-10px_rgba(244,69,102,0.12)] dark:shadow-none border border-[#EEDBBA] dark:border-amber-900/50 flex flex-col items-center justify-center text-center">
                                        <span className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-amber-100 mb-3 leading-snug">
                                            Total Acumulado<br />de la Visita
                                        </span>
                                        <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-amber-50 tracking-tight">
                                            COP {formatCOP(totalExpensesCop)}
                                        </span>
                                        {isHome && totalExpensesCop === 0 ? (
                                            <span className="mt-3 px-3 py-1 rounded-full bg-white/80 dark:bg-zinc-800/90 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 text-[11px] font-bold shadow-2xs">
                                                ✓ Presupuesto de hogar al día ($0 COP)
                                            </span>
                                        ) : (
                                            <p className="text-[11px] text-slate-600 dark:text-amber-200/80 mt-3 font-medium">
                                                Calculado automáticamente por categoría
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Row Widgets matching Screenshot 4: Fotos, Recomendaciones de Transporte, Quick Notes */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                                    {/* Widget 1: Fotos preview slider */}
                                    <div className="bg-white dark:bg-[#1E2228] rounded-3xl p-5 shadow-[0_10px_25px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] dark:border-zinc-800">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100">Fotos</h4>
                                            <button
                                                onClick={() => setActiveTab('fotos')}
                                                className="text-[11px] font-semibold text-[#F44566] hover:underline cursor-pointer"
                                            >
                                                Ver todas
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                            {(!currentTrip.photos || currentTrip.photos.length === 0) ? (
                                                <div
                                                    onClick={() => setActiveTab('fotos')}
                                                    className="w-full py-4 text-center text-xs text-slate-500 dark:text-zinc-400 cursor-pointer hover:text-[#F44566] transition-colors rounded-xl border border-dashed border-rose-100 dark:border-zinc-700 bg-[#FFFBFB] dark:bg-[#282D35]"
                                                >
                                                    📸 Sin fotos registradas • Haz clic para agregar
                                                </div>
                                            ) : (
                                                <>
                                                    {currentTrip.photos.map((p) => (
                                                        <img
                                                            key={p.id}
                                                            src={p.url}
                                                            alt={p.caption || 'Foto de viaje'}
                                                            onClick={() => setLightboxPhoto(p.url)}
                                                            className="w-20 h-20 rounded-2xl object-cover cursor-pointer hover:opacity-90 transition-opacity border border-slate-100 dark:border-zinc-700 flex-shrink-0"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    ))}
                                                    <button
                                                        onClick={() => setActiveTab('fotos')}
                                                        className="w-10 h-20 rounded-2xl bg-[#FFF5F7] dark:bg-zinc-800 text-[#F44566] flex items-center justify-center hover:bg-[#FFE8ED] dark:hover:bg-zinc-700 flex-shrink-0 cursor-pointer"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Widget 2: Recomendaciones de Transporte with mini map preview */}
                                    <div className="bg-white dark:bg-[#1E2228] rounded-3xl p-5 shadow-[0_10px_25px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] dark:border-zinc-800">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                                                Recomendaciones de transporte
                                            </h4>
                                            <button
                                                onClick={() => setActiveTab('transporte')}
                                                className="text-[11px] font-semibold text-[#F44566] hover:underline cursor-pointer"
                                            >
                                                Detalle
                                            </button>
                                        </div>
                                        <div className="bg-[#FFFBFB] dark:bg-[#282D35] p-3 rounded-2xl border border-[#FAD2DA]/60 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300 space-y-1.5">
                                            <p className="font-semibold text-[#F44566]">
                                                Estado: {currentTrip.roadCondition || 'Óptima (Vía pavimentada)'}
                                            </p>
                                            <p className="line-clamp-2 text-slate-600 dark:text-zinc-300 text-[11px]">
                                                {currentTrip.transportNotes || 'Ruta sin contratiempos reportados.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Widget 3: Quick notes textarea */}
                                    <div className="bg-white dark:bg-[#1E2228] rounded-3xl p-5 shadow-[0_10px_25px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] dark:border-zinc-800">
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100 mb-2">Quick notes</h4>
                                        <textarea
                                            value={currentTrip.doNotForgetNotes}
                                            onChange={(e) => {
                                                onSaveTrip({ ...currentTrip, doNotForgetNotes: e.target.value });
                                            }}
                                            placeholder="Quick notes..."
                                            className="w-full h-20 p-3 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-2xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F44566] resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB CONTENT: FOTOS (Full Lightbox & Upload) */}
                        {activeTab === 'fotos' && (
                            <div className="bg-white dark:bg-[#1E2228] rounded-3xl p-8 shadow-[0_15px_35px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] dark:border-zinc-800 space-y-6 animate-in fade-in">
                                <div className="flex items-center justify-between">
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
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files.length > 0) {
                                                        const newPhotos: TripPhoto[] = Array.from(e.target.files).map((file: File, idx: number) => ({
                                                            id: newId(),
                                                            tripEntryId: currentTrip.id,
                                                            url: trackedObjectURL(file),
                                                            caption: file.name.replace(/\.[^/.]+$/, ''),
                                                            uploadedAt: currentTrip.tripDate
                                                        }));
                                                        onSaveTrip({
                                                            ...currentTrip,
                                                            photos: [...newPhotos, ...(currentTrip.photos || [])]
                                                        });
                                                    }
                                                }}
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
                                        <label className="mt-2 cursor-pointer py-2.5 px-6 bg-[#F44566] hover:bg-[#e03757] text-white rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-[#F44566]/25 active:scale-95">
                                            <Camera className="w-4 h-4" />
                                            <span>Subir fotos</span>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files.length > 0) {
                                                        const newPhotos: TripPhoto[] = Array.from(e.target.files).map((file: File, idx: number) => ({
                                                            id: newId(),
                                                            tripEntryId: currentTrip.id,
                                                            url: trackedObjectURL(file),
                                                            caption: file.name.replace(/\.[^/.]+$/, ''),
                                                            uploadedAt: currentTrip.tripDate
                                                        }));
                                                        onSaveTrip({
                                                            ...currentTrip,
                                                            photos: [...newPhotos, ...(currentTrip.photos || [])]
                                                        });
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                ) : (
                                    /* Grid */
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {currentTrip.photos.map((photo) => (
                                            <div
                                                key={photo.id}
                                                onClick={() => setLightboxPhoto(photo.url)}
                                                className="group relative h-48 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 cursor-pointer shadow-sm hover:shadow-md transition-all"
                                            >
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
                            </div>
                        )}

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
                                                onChange={(e) => onSaveTrip({ ...currentTrip, favoriteDish: e.target.value })}
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
                                                onChange={(e) => onSaveTrip({ ...currentTrip, foodReview: e.target.value })}
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
                                        <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                                            <Check className="w-3.5 h-3.5" />
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
                                            onChange={(e) => setTransportRoadCondition(e.target.value)}
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
                                                    onClick={() => setTransportRoadCondition(cond)}
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
                                                onClick={() => setTransportTollCount((prev) => Math.max(0, prev - 1))}
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
                                                onChange={(e) => setTransportTollCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                                className="w-full text-center py-2 bg-white dark:bg-[#1E2228] border border-rose-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F44566]/25 focus:border-[#F44566]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setTransportTollCount((prev) => prev + 1)}
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
                                            onChange={(e) => setTransportMode(e.target.value)}
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
                                                    onClick={() => setTransportMode(mode)}
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
                                        onChange={(e) => setTransportNotes(e.target.value)}
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
                                    onChange={(e) => onSaveTrip({ ...currentTrip, doNotForgetNotes: e.target.value })}
                                    rows={8}
                                    className="w-full p-5 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-2xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F44566] leading-relaxed font-sans"
                                    placeholder="Escribe aquí los recuerdos que nunca deben olvidarse..."
                                />
                            </div>
                        )}

                        {/* TAB CONTENT: RESUMEN */}
                        {activeTab === 'resumen' && (
                            <div className="bg-white dark:bg-[#1E2228] rounded-3xl p-8 shadow-[0_15px_35px_-10px_rgba(244,69,102,0.12)] border border-[#FFF0F3] dark:border-zinc-800 space-y-6 animate-in fade-in">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">
                                    Calificación y Balance de la Visita
                                </h3>

                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">Puntuación General:</span>
                                    <div className="flex items-center gap-1 text-amber-400">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => onSaveTrip({ ...currentTrip, rating: star })}
                                                className="cursor-pointer hover:scale-110 transition-transform"
                                            >
                                                <Star
                                                    className={`w-6 h-6 ${star <= currentTrip.rating
                                                            ? 'fill-amber-400 text-amber-400'
                                                            : 'text-slate-300 dark:text-zinc-600'
                                                        }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-100 ml-2">
                                        {currentTrip.rating} de 5 estrellas
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-2">
                                        Balance Global del Destino
                                    </label>
                                    <textarea
                                        value={currentTrip.summary}
                                        onChange={(e) => onSaveTrip({ ...currentTrip, summary: e.target.value })}
                                        rows={4}
                                        className="w-full p-4 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-2xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F44566]"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {lightboxPhoto && (
                <div
                    onClick={() => setLightboxPhoto(null)}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <button
                            onClick={() => setLightboxPhoto(null)}
                            className="absolute -top-10 right-0 text-white hover:text-[#F44566] transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img
                            src={lightboxPhoto}
                            alt="Foto ampliada"
                            className="rounded-3xl max-h-[85vh] w-auto object-contain shadow-2xl border border-white/20"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                </div>
            )}

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
                                        <span className="text-[10px] font-extrabold tracking-widest text-[#F44566] uppercase bg-white/70 px-2.5 py-1 rounded-full border border-rose-200">
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
                                            <span className="text-[10px] font-black uppercase leading-tight">{municipality.name}</span>
                                            <span className="text-[7px] font-semibold">{municipality.departmentName}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Featured Photo */}
                                <div className="relative z-10 my-2">
                                    <div className="w-full h-44 rounded-2xl overflow-hidden shadow-lg border-2 border-white bg-slate-100">
                                        <img
                                            src={
                                                currentTrip.photos && currentTrip.photos.length > 0
                                                    ? currentTrip.photos[0].url
                                                    : municipality.coverPhoto || 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=800&auto=format&fit=crop&q=80'
                                            }
                                            alt={municipality.name}
                                            crossOrigin="anonymous"
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    <div className="mt-3 text-center">
                                        <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
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
                                <h1 className="text-3xl font-black text-slate-900 mt-1">
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
                                    <span className="text-xs font-black uppercase">{municipality.name}</span>
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
                                            <td className="p-2 text-right text-rose-600 font-black">
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
        </div>
    );
};
