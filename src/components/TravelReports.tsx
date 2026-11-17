import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  MapPin,
  Star,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  RotateCcw,
  Compass,
  ArrowLeft,
  ChevronDown,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { Department, Municipality, TripEntry } from '../types';
import {
  FIXED_EXPENSE_CATEGORIES,
  isFixedCategory,
  normalizeCategory,
  getCategoryVisual,
  type CategoryVisual
} from '../utils/expenseCategories';

interface TravelReportsProps {
  departments: Department[];
  municipalities: Municipality[];
  trips: TripEntry[];
  homeMunicipalityId?: string | null;
  onNavigateToMunicipality: (municipalityId: string) => void;
  onNavigateToDepartment?: (departmentId: string) => void;
  onNavigateToMap: () => void;
}

interface FlattenedExpense {
  id: string;
  tripId: string;
  date: string;
  municipalityId: string;
  municipalityName: string;
  departmentId: string;
  departmentName: string;
  category: string;
  amountCop: number;
  notes: string;
}

export const TravelReports: React.FC<TravelReportsProps> = ({
  departments,
  municipalities,
  trips,
  homeMunicipalityId,
  onNavigateToMunicipality,
  onNavigateToDepartment,
  onNavigateToMap
}) => {
  // Global Filters State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Table 1 sorting: 'desc' (highest advance first) or 'asc' or 'name'
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'name'>('desc');

  // Extract all flattened expenses with normalized categories and location context
  const allExpenses: FlattenedExpense[] = useMemo(() => {
    const list: FlattenedExpense[] = [];
    trips.forEach((trip) => {
      const muni = municipalities.find((m) => m.id === trip.municipalityId);
      const deptId = muni?.departmentId || '';
      const deptName = trip.departmentName || muni?.departmentName || 'Colombia';

      if (trip.expenses && trip.expenses.length > 0) {
        trip.expenses.forEach((exp) => {
          list.push({
            id: exp.id,
            tripId: trip.id,
            date: exp.date || trip.tripDate,
            municipalityId: trip.municipalityId,
            municipalityName: trip.municipalityName,
            departmentId: deptId,
            departmentName: deptName,
            category: normalizeCategory(exp.category),
            amountCop: Number(exp.amountCop) || 0,
            notes: exp.notes
          });
        });
      }
    });

    // Sort by date descending
    return list.sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return dateB - dateA;
    });
  }, [trips, municipalities]);

  // Dynamic category filter options: Todas + 3 fixed + distinct custom categories sorted by total COP desc
  const categoryFilterOptions = useMemo(() => {
    const customTotals = new Map<string, number>();
    allExpenses.forEach((item) => {
      if (!isFixedCategory(item.category)) {
        customTotals.set(
          item.category,
          (customTotals.get(item.category) || 0) + (Number(item.amountCop) || 0)
        );
      }
    });

    const sortedCustom = Array.from(customTotals.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
      .map(([category]) => category);

    return ['all', ...FIXED_EXPENSE_CATEGORIES, ...sortedCustom];
  }, [allExpenses]);

  const effectiveSelectedCategory = categoryFilterOptions.includes(selectedCategory)
    ? selectedCategory
    : 'all';

  // Filter expenses reactively
  const filteredExpenses = useMemo(() => {
    return allExpenses.filter((item) => {
      // Date filtering
      if (startDate) {
        const itemTime = new Date(item.date).getTime();
        const startTime = new Date(startDate).getTime();
        if (!isNaN(itemTime) && !isNaN(startTime) && itemTime < startTime) {
          return false;
        }
      }

      if (endDate) {
        const itemTime = new Date(item.date).getTime();
        const endTime = new Date(endDate).getTime() + 86400000; // End of day
        if (!isNaN(itemTime) && !isNaN(endTime) && itemTime > endTime) {
          return false;
        }
      }

      // Department filtering
      if (selectedDeptFilter !== 'all') {
        const matchesDept =
          item.departmentId === selectedDeptFilter ||
          item.departmentName.toLowerCase() === selectedDeptFilter.toLowerCase();
        if (!matchesDept) return false;
      }

      // Category filtering (all categories normalized, including Peajes -> Transporte)
      if (effectiveSelectedCategory !== 'all' && item.category !== effectiveSelectedCategory) {
        return false;
      }

      return true;
    });
  }, [allExpenses, startDate, endDate, selectedDeptFilter, effectiveSelectedCategory]);

  // Total filtered expense amount
  const totalFilteredBudget = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + curr.amountCop, 0);
  }, [filteredExpenses]);

  // Full ungrouped breakdown by normalized category
  const categoryBreakdown = useMemo(() => {
    const grouped = new Map<string, { total: number; count: number }>();
    filteredExpenses.forEach((item) => {
      const prev = grouped.get(item.category) || { total: 0, count: 0 };
      grouped.set(item.category, {
        total: prev.total + (Number(item.amountCop) || 0),
        count: prev.count + 1
      });
    });

    const grandTotal = Array.from(grouped.values()).reduce((acc, val) => acc + val.total, 0);

    return Array.from(grouped.entries())
      .map(([category, stats]): {
        category: string;
        total: number;
        count: number;
        pct: number;
        visual: CategoryVisual;
      } => ({
        category,
        total: stats.total,
        count: stats.count,
        pct: grandTotal > 0 ? Math.round((stats.total / grandTotal) * 100) : 0,
        visual: getCategoryVisual(category)
      }))
      .sort(
        (a, b) =>
          b.total - a.total ||
          b.count - a.count ||
          a.category.localeCompare(b.category, 'es')
      );
  }, [filteredExpenses]);

  // Chart-only breakdown: if more than 6 categories have spend, keep top 5 + group the rest into "Otras"
  const positiveCategoryCount = useMemo(
    () => categoryBreakdown.filter((item) => item.total > 0).length,
    [categoryBreakdown]
  );

  const chartCategoryBreakdown = useMemo(() => {
    const positive = categoryBreakdown.filter((item) => item.total > 0);
    if (positive.length <= 6) {
      return positive;
    }

    const top5 = positive.slice(0, 5);
    const rest = positive.slice(5);
    const restTotal = rest.reduce((acc, item) => acc + item.total, 0);
    const restCount = rest.reduce((acc, item) => acc + item.count, 0);
    const grandTotal = positive.reduce((acc, item) => acc + item.total, 0);

    return [
      ...top5,
      {
        category: 'Otras',
        total: restTotal,
        count: restCount,
        pct: grandTotal > 0 ? Math.round((restTotal / grandTotal) * 100) : 0,
        visual: getCategoryVisual('Otras')
      }
    ];
  }, [categoryBreakdown]);

  const chartSegments = useMemo(() => {
    const chartTotal = chartCategoryBreakdown.reduce((acc, item) => acc + item.total, 0);
    if (chartTotal <= 0) return [];
    let accumulated = 0;
    return chartCategoryBreakdown.map((item) => {
      const length = (item.total / chartTotal) * 100;
      const offset = accumulated;
      accumulated += length;
      return {
        ...item,
        length,
        offset
      };
    });
  }, [chartCategoryBreakdown]);

  // KPI 1: Progreso Nacional
  // Colombia has 1,122 municipalities across 32 departments
  // Strictly reactive: accounts for visited flag or any recorded trip
  const visitedMuniIds = useMemo(() => {
    const set = new Set<string>();
    municipalities.forEach((m) => {
      if (m.isVisited) set.add(m.id);
    });
    trips.forEach((t) => {
      if (t.municipalityId) set.add(t.municipalityId);
    });
    return set;
  }, [municipalities, trips]);

  const totalVisitedCount = visitedMuniIds.size;
  const nationalTotalMunicipalities = municipalities.length > 0 ? municipalities.length : 1122;
  const nationalProgressPct = useMemo(() => {
    if (totalVisitedCount === 0) return 0;
    return Math.round((totalVisitedCount / nationalTotalMunicipalities) * 100);
  }, [totalVisitedCount]);

  // KPI 3: Departamentos Faltantes
  // Formula: 32 - (departamentos con al menos 1 municipio visitado)
  const totalDepartments = 32;
  const visitedDepartmentsCount = useMemo(() => {
    const deptsWithVisits = new Set<string>();
    municipalities.forEach((m) => {
      if (m.isVisited || visitedMuniIds.has(m.id)) {
        if (m.departmentId) deptsWithVisits.add(m.departmentId);
      }
    });
    trips.forEach((t) => {
      const muni = municipalities.find((item) => item.id === t.municipalityId);
      if (muni?.departmentId) {
        deptsWithVisits.add(muni.departmentId);
      } else if (t.departmentName) {
        const found = departments.find(
          (d) => d.name.toLowerCase() === t.departmentName.toLowerCase()
        );
        if (found) deptsWithVisits.add(found.id);
      }
    });
    return deptsWithVisits.size;
  }, [municipalities, visitedMuniIds, trips, departments]);

  const remainingDepartments = Math.max(0, totalDepartments - visitedDepartmentsCount);

  // KPI 4: Destino Mejor Calificado
  // Searches dynamically for highest rated municipality in trips. If 0 trips, returns null
  const topRatedDestination = useMemo(() => {
    if (trips.length === 0) {
      return null;
    }

    const ratingMap: Record<string, { total: number; count: number; name: string; dept: string }> = {};
    trips.forEach((t) => {
      if (!ratingMap[t.municipalityId]) {
        ratingMap[t.municipalityId] = {
          total: 0,
          count: 0,
          name: t.municipalityName,
          dept: t.departmentName || 'Colombia'
        };
      }
      ratingMap[t.municipalityId].total += (t.rating || 0);
      ratingMap[t.municipalityId].count += 1;
    });

    let bestId: string | null = null;
    let bestAvg = -1;

    Object.entries(ratingMap).forEach(([id, item]) => {
      const avg = item.count > 0 ? item.total / item.count : 0;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestId = id;
      }
    });

    if (!bestId) return null;
    const best = ratingMap[bestId];
    return {
      name: best.name,
      department: best.dept,
      rating: Number(bestAvg.toFixed(1)),
      municipalityId: bestId
    };
  }, [trips]);

  // Table 1: Cobertura por Departamento
  const departmentCoverageList = useMemo(() => {
    const list = departments.map((dept) => {
      // Find visited municipalities in this dept
      const deptMunis = municipalities.filter((m) => m.departmentId === dept.id);
      const visitedCount = deptMunis.filter((m) => m.isVisited || visitedMuniIds.has(m.id)).length;
      const totalCount = dept.totalMunicipalities || (deptMunis.length > 0 ? deptMunis.length : 12);
      const pendingCount = Math.max(0, totalCount - visitedCount);
      const advancePct = Math.min(100, Math.round((visitedCount / totalCount) * 100));

      return {
        id: dept.id,
        name: dept.name,
        totalMunicipalities: totalCount,
        visitedMunicipalities: visitedCount,
        pendingMunicipalities: pendingCount,
        advancePercentage: advancePct
      };
    });

    if (sortOrder === 'desc') {
      return list.sort((a, b) => b.advancePercentage - a.advancePercentage || b.visitedMunicipalities - a.visitedMunicipalities);
    } else if (sortOrder === 'asc') {
      return list.sort((a, b) => a.advancePercentage - b.advancePercentage);
    } else {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [departments, municipalities, visitedMuniIds, sortOrder]);

  // Currency Formatter for COP
  const formatCOP = (amount: number) => {
    return `$ ${amount.toLocaleString('es-CO')}`;
  };

  // Export to Excel (.xlsx) using SheetJS
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen de departamentos
      const deptData = departmentCoverageList.map((d) => ({
        Departamento: d.name,
        'Municipios Totales': d.totalMunicipalities,
        Visitados: d.visitedMunicipalities,
        Pendientes: d.pendingMunicipalities,
        '% Avance': `${d.advancePercentage}%`
      }));
      const ws1 = XLSX.utils.json_to_sheet(deptData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Departamentos');

      // Hoja 2: Desglose financiero completo filtrado
      const expenseData = filteredExpenses.map((exp) => ({
        Fecha: exp.date,
        Municipio: exp.municipalityName,
        Departamento: exp.departmentName,
        Categoría: normalizeCategory(exp.category),
        'Gasto (COP)': exp.amountCop,
        Notas: exp.notes || ''
      }));
      const ws2 = XLSX.utils.json_to_sheet(
        expenseData.length > 0
          ? expenseData
          : [{ Mensaje: 'Aún no hay gastos registrados en el periodo seleccionado.' }]
      );
      XLSX.utils.book_append_sheet(wb, ws2, 'Desglose Financiero');

      // Hoja 3: Totales por categoría normalizada (sin agrupar)
      const categorySummaryData = categoryBreakdown.map((item) => ({
        Categoría: item.category,
        Movimientos: item.count,
        'Gasto Total (COP)': item.total,
        '% del Total': `${item.pct}%`
      }));
      const ws3 = XLSX.utils.json_to_sheet(
        categorySummaryData.length > 0
          ? categorySummaryData
          : [{ Mensaje: 'Sin gastos registrados para resumir por categoría.' }]
      );
      XLSX.utils.book_append_sheet(wb, ws3, 'Resumen por Categoría');

      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Reporte_Viajes_Colombia_${today}.xlsx`);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDeptFilter('all');
    setSelectedCategory('all');
  };

  const hasActiveFilters =
    startDate !== '' ||
    endDate !== '' ||
    selectedDeptFilter !== 'all' ||
    effectiveSelectedCategory !== 'all';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF7EE] via-[#FFF0F4] to-[#FFDEE9] dark:from-[#121417] dark:via-[#121417] dark:to-[#181B20] text-slate-800 dark:text-zinc-100 pt-24 md:pt-8 pb-28 sm:pb-24 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title with Back button and Quick Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToMap}
              className="p-2 sm:px-3 sm:py-2 bg-white/80 dark:bg-[#1E2228] hover:bg-white dark:hover:bg-[#282D35] text-slate-700 dark:text-zinc-200 hover:text-[#F44566] rounded-full border border-rose-100 dark:border-zinc-800 shadow-sm transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Volver al Explorador"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Explorador</span>
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight flex items-center gap-2.5 flex-wrap">
                <span>Reportes Globales</span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FFE8ED] dark:bg-zinc-800 text-[#F44566] border border-rose-200 dark:border-zinc-700">
                  Métricas de Viaje
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Bitácora financiera, analíticas de cobertura y estadísticas de la Familia Palacio
              </p>
            </div>
          </div>

          {/* Quick indicator pill */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#1E2228] border border-rose-100 dark:border-zinc-800 text-xs font-medium text-slate-600 dark:text-zinc-300 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Datos en tiempo real</span>
            </span>
          </div>
        </div>

        {/* 1. BARRA DE FILTROS GLOBALES (Cápsulas Flotantes) */}
        <section
          aria-label="Filtros Globales"
          className="bg-white/95 dark:bg-[#1E2228]/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-rose-100 dark:border-zinc-800 shadow-[0_10px_25px_-5px_rgba(244,69,102,0.12)] transition-all"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            
            {/* Fechas: Desde / Hasta */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-[#FFFBFB] dark:bg-[#282D35] px-3.5 py-2 rounded-full border border-[#FAD2DA] dark:border-zinc-700 shadow-2xs">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">Desde:</span>
                <input
                  id="filter-date-desde"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs text-slate-700 dark:text-zinc-100 dark:[color-scheme:dark] bg-transparent focus:outline-none cursor-pointer"
                  placeholder="Desde"
                />
              </div>

              <span className="text-slate-400 dark:text-zinc-500 font-bold hidden sm:inline">-</span>

              <div className="flex items-center gap-2 bg-[#FFFBFB] dark:bg-[#282D35] px-3.5 py-2 rounded-full border border-[#FAD2DA] dark:border-zinc-700 shadow-2xs">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">Hasta:</span>
                <input
                  id="filter-date-hasta"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs text-slate-700 dark:text-zinc-100 dark:[color-scheme:dark] bg-transparent focus:outline-none cursor-pointer"
                  placeholder="Hasta"
                />
              </div>
            </div>

            {/* Departamento Dropdown Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                Departamento:
              </span>
              <div className="relative min-w-[160px]">
                <select
                  id="filter-department-select"
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="w-full appearance-none bg-[#FFFBFB] dark:bg-[#282D35] text-slate-700 dark:text-zinc-100 text-xs font-semibold px-4 py-2 pr-8 rounded-full border border-[#FAD2DA] dark:border-zinc-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#F44566]/30 cursor-pointer"
                >
                  <option value="all">Todos los departamentos</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Categorías de Gasto: Cápsulas dinámicas */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300 whitespace-nowrap mr-1">
                Categoría:
              </span>
              {categoryFilterOptions.map((cat) => {
                const isActive = effectiveSelectedCategory === cat;
                const label = cat === 'all' ? 'Todas' : cat;
                const slug = cat.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
                return (
                  <button
                    key={cat}
                    id={`filter-cat-${slug}`}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer max-w-[200px] truncate ${
                      isActive
                        ? 'bg-[#F44566] text-white shadow-sm shadow-[#F44566]/30'
                        : 'bg-[#F6EBD0]/60 dark:bg-[#282D35] hover:bg-[#F6EBD0] dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-[#EEDBBA] dark:border-zinc-700'
                    }`}
                    title={label}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Botón Reset */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#F44566] hover:bg-[#FFE8ED] dark:hover:bg-zinc-800 transition-all cursor-pointer self-start lg:self-center"
                title="Restablecer filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </section>

        {/* 2. TARJETAS RESUMEN (KPIs en Tonos Pasteles) */}
        <section aria-label="Tarjetas Resumen de Métricas" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* KPI 1: Progreso Nacional */}
          <div className="bg-white dark:bg-[#1E2228] rounded-3xl p-5 sm:p-6 border border-rose-100 dark:border-zinc-800 shadow-[0_10px_25px_-5px_rgba(244,69,102,0.12)] flex items-center gap-4">
            {/* Donut Chart Gauge */}
            <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#FFE4EA] dark:text-zinc-700"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#F44566] transition-all duration-1000 ease-out"
                  strokeDasharray={`${nationalProgressPct}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800 dark:text-zinc-100 tabular-nums">
                {nationalProgressPct}%
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Progreso Nacional
              </h3>
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 leading-snug">
                {nationalProgressPct}% total Colombia completado
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 font-medium tabular-nums">
                <strong className="text-slate-800 dark:text-zinc-100">{totalVisitedCount}</strong> / {nationalTotalMunicipalities} municipios visitados
              </p>
            </div>
          </div>

          {/* KPI 2: Presupuesto Total Invertido (Crema Suave #F6EBD0) */}
          <div className="bg-[#F6EBD0] dark:bg-[#2A251D] rounded-3xl p-5 sm:p-6 border border-[#EEDBBA] dark:border-amber-900/50 shadow-[0_10px_25px_-5px_rgba(238,219,186,0.5)] dark:shadow-none flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-amber-900/80 dark:text-amber-200 uppercase tracking-wider block mb-1">
                Presupuesto Total Invertido
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-amber-50 tracking-tight my-1 tabular-nums">
                {formatCOP(totalFilteredBudget)} <span className="text-xs font-bold text-amber-900/70 dark:text-amber-200/80">COP</span>
              </div>
            </div>
            <p className="text-[11px] text-amber-900/70 dark:text-amber-200/80 font-medium mt-2 flex items-center gap-1.5 tabular-nums">
              <span>📊</span>
              <span>{filteredExpenses.length} movimientos financieros</span>
            </p>
          </div>

          {/* KPI 3: Departamentos Faltantes (Rosa Suave Pastel) */}
          <div className="bg-[#FFF0F4] rounded-3xl p-5 sm:p-6 border border-[#FFE4EA] dark:border-zinc-800 shadow-[0_10px_25px_-5px_rgba(244,69,102,0.12)] flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-[#F44566] uppercase tracking-wider block mb-1">
                Departamentos Faltantes
              </span>
              <div className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight my-1 tabular-nums">
                {remainingDepartments}
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-zinc-300 font-medium">
              departamentos restantes por explorar de {totalDepartments}
            </p>
          </div>

          {/* KPI 4: Destino Mejor Calificado */}
          <div className="bg-white dark:bg-[#1E2228] rounded-3xl p-5 sm:p-6 border border-rose-100 dark:border-zinc-800 shadow-[0_10px_25px_-5px_rgba(244,69,102,0.12)] flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                Destino Mejor Calificado
              </span>
              {topRatedDestination ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800/60">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{topRatedDestination.rating}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-400 text-xs font-bold border border-slate-200 dark:border-zinc-700">
                  <Star className="w-3 h-3 fill-slate-300 dark:fill-zinc-600 text-slate-300 dark:text-zinc-600" />
                  <span>—</span>
                </span>
              )}
            </div>

            {topRatedDestination ? (
              <>
                <div className="my-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFE8ED] dark:bg-zinc-800 text-[#F44566] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100 truncate">
                      {topRatedDestination.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 truncate font-medium">
                      {topRatedDestination.department}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateToMunicipality(topRatedDestination.municipalityId)}
                  className="text-[11px] font-bold text-[#F44566] hover:underline flex items-center gap-1 cursor-pointer mt-1"
                >
                  <span>Ver bitácora de {topRatedDestination.name}</span>
                  <span>→</span>
                </button>
              </>
            ) : (
              <>
                <div className="my-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-400 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-500 dark:text-zinc-200 truncate">
                      Sin visitas aún
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-zinc-400 truncate font-medium">
                      Pendiente de explorar
                    </p>
                  </div>
                </div>

                <span className="text-[11px] text-slate-400 dark:text-zinc-400 font-medium mt-1 cursor-not-allowed">
                  Registra tu primera visita
                </span>
              </>
            )}
          </div>
        </section>

        {/* 2.5. TOTALES Y GRÁFICA POR CATEGORÍA */}
        <section
          aria-label="Totales y Gráfica por Categoría"
          className="bg-white dark:bg-[#1E2228] rounded-3xl p-5 sm:p-6 border border-rose-100 dark:border-zinc-800 shadow-[0_10px_25px_-5px_rgba(244,69,102,0.12)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#F44566]" />
                <span>Gastos por Categoría</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                Totales individuales por cada tipo de gasto según los filtros activos
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full bg-[#FFF5F7] dark:bg-[#282D35] border border-rose-100 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200 tabular-nums">
              <span>{categoryBreakdown.length} {categoryBreakdown.length === 1 ? 'categoría' : 'categorías'}</span>
              <span className="text-slate-300 dark:text-zinc-600">•</span>
              <span className="text-[#F44566]">{formatCOP(totalFilteredBudget)}</span>
            </div>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-rose-100 dark:border-zinc-800 bg-[#FFFBFB] dark:bg-[#181B20]">
              <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                No hay gastos que coincidan con los filtros seleccionados
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                Registra gastos en tus visitas o ajusta los filtros para ver el desglose por categoría.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Gráfica circular (solo agrupa en "Otras" cuando hay > 6 categorías con gasto) */}
              <div className="lg:col-span-5 bg-[#FFFBFB] dark:bg-[#181B20] rounded-2xl p-4 sm:p-5 border border-rose-100/70 dark:border-zinc-800 flex flex-col gap-4">
                {chartSegments.length > 0 ? (
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5">
                    <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" role="img" aria-label="Distribución porcentual de gastos por categoría">
                        <circle
                          cx="18"
                          cy="18"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke="currentColor"
                          strokeWidth="4.2"
                          className="text-rose-100/80 dark:text-zinc-800"
                        />
                        {chartSegments.map((seg) => (
                          <circle
                            key={seg.category}
                            cx="18"
                            cy="18"
                            r="15.91549430918954"
                            fill="transparent"
                            stroke={seg.visual.chartColor}
                            strokeWidth="4.2"
                            strokeDasharray={`${seg.length} ${Math.max(0, 100 - seg.length)}`}
                            strokeDashoffset={-seg.offset}
                            className="transition-all duration-500"
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 pointer-events-none">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
                          Total
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 leading-tight mt-0.5 tabular-nums">
                          {formatCOP(totalFilteredBudget)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full flex-1 min-w-0 space-y-2">
                      {chartCategoryBreakdown.map((item) => (
                        <div key={item.category} className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.visual.chartColor }}
                            />
                            <span className="font-semibold text-slate-700 dark:text-zinc-200 truncate" title={item.category}>
                              {item.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 text-[11px]">
                            <span className="font-bold text-slate-800 dark:text-zinc-100">
                              {item.pct}%
                            </span>
                            <span className="text-slate-500 dark:text-zinc-400 font-medium hidden sm:inline">
                              {formatCOP(item.total)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-zinc-400 text-center py-6">
                    Todos los movimientos filtrados tienen monto $ 0 COP.
                  </p>
                )}

                {positiveCategoryCount > 6 && (
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug border-t border-rose-100/70 dark:border-zinc-800 pt-2.5">
                    En la gráfica se muestran las 5 categorías principales y las {positiveCategoryCount - 5} menores agrupadas en «Otras». A la derecha ves cada categoría por separado.
                  </p>
                )}
              </div>

              {/* Listado completo por categoría (sin agrupar) */}
              <div className="lg:col-span-7 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {categoryBreakdown.map((item) => {
                  const isFiltered = effectiveSelectedCategory === item.category;
                  return (
                    <button
                      key={item.category}
                      type="button"
                      onClick={() =>
                        setSelectedCategory((prev) => (prev === item.category ? 'all' : item.category))
                      }
                      className={`w-full text-left rounded-2xl p-3 sm:p-3.5 border transition-all cursor-pointer ${
                        isFiltered
                          ? 'bg-[#FFF5F7] dark:bg-[#282D35] border-[#F44566]/50 shadow-xs'
                          : 'bg-[#FFFBFB] dark:bg-[#181B20] hover:bg-[#FFF5F7] dark:hover:bg-[#282D35]/70 border-rose-100/70 dark:border-zinc-800'
                      }`}
                      title={
                        isFiltered
                          ? 'Haz clic para quitar el filtro de esta categoría'
                          : `Filtrar por ${item.category}`
                      }
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            style={item.visual.badgeStyle}
                            className={`inline-block max-w-[180px] sm:max-w-[260px] truncate px-2.5 py-0.5 rounded-full text-[11px] font-bold ${item.visual.badgeClassName}`}
                          >
                            {item.category}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                            {item.count} {item.count === 1 ? 'mov.' : 'movs.'}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2 flex-shrink-0 tabular-nums">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                            {formatCOP(item.total)}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 w-9 text-right">
                            {item.pct}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-2 rounded-full bg-rose-100/70 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.total > 0 ? Math.max(3, item.pct) : 0}%`,
                            backgroundColor: item.visual.chartColor
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* 3. CABECERA DE TABLAS CON BOTÓN DE DESCARGA EXCEL */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight">
              Tablas de Reportes &amp; Métricas
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Detalle territorial y flujo de gastos de viaje
            </p>
          </div>

          <button
            id="export-excel-btn"
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-full bg-white dark:bg-[#1E2228] hover:bg-[#FFF5F7] dark:hover:bg-[#282D35] border border-rose-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:text-[#F44566] shadow-sm transition-all flex items-center gap-2 cursor-pointer group active:scale-95"
            title="Exportar reporte completo a Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>📥 Descargar Excel (.xlsx)</span>
          </button>
        </div>

        {/* 4. TABLAS DE DATOS MINIMALISTAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* TABLA 1: Cobertura por Departamento */}
          <section
            aria-label="Cobertura por Departamento"
            className="bg-white dark:bg-[#1E2228] rounded-3xl p-5 sm:p-6 border border-rose-100 dark:border-zinc-800 shadow-[0_10px_25px_-5px_rgba(244,69,102,0.12)] flex flex-col h-full"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-zinc-100">
                  Cobertura por Departamento
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  Avance territorial en los 32 departamentos ({departmentCoverageList.length} registrados)
                </p>
              </div>

              {/* Botón de Ordenamiento */}
              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : prev === 'asc' ? 'name' : 'desc'))}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-zinc-200 bg-slate-50 dark:bg-[#282D35] hover:bg-[#FFE8ED] dark:hover:bg-zinc-700 hover:text-[#F44566] border border-slate-200 dark:border-zinc-700 transition-all flex items-center gap-1 cursor-pointer"
                title="Cambiar orden de departamentos"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {sortOrder === 'desc' ? 'Mayor a menor %' : sortOrder === 'asc' ? 'Menor a mayor %' : 'Alfabético'}
                </span>
              </button>
            </div>

            {/* Table Container with sleek rounded styling & scrollable list */}
            <div className="overflow-x-auto rounded-2xl border border-rose-100/70 dark:border-zinc-800 max-h-[480px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#FDF2F4] dark:bg-[#282D35] text-slate-700 dark:text-zinc-200 font-bold border-b border-rose-100 dark:border-zinc-700 shadow-2xs">
                    <th className="py-3 px-3.5">Departamento</th>
                    <th className="py-3 px-2 text-center">Totales</th>
                    <th className="py-3 px-2 text-center">Visitados</th>
                    <th className="py-3 px-2 text-center">Pendientes</th>
                    <th className="py-3 px-3.5 text-right">% Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50 dark:divide-zinc-800 font-medium text-slate-700 dark:text-zinc-300">
                  {departmentCoverageList.map((dept) => {
                    const homeMuni = municipalities.find(
                      (m) => m.id === homeMunicipalityId || m.code === homeMunicipalityId
                    );
                    const isHomeDept = Boolean(homeMuni && homeMuni.departmentId === dept.id);

                    return (
                      <tr
                        key={dept.id}
                        onClick={() => onNavigateToDepartment && onNavigateToDepartment(dept.id)}
                        className="hover:bg-[#FFF5F7] dark:hover:bg-[#282D35]/70 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-3.5 font-bold text-slate-800 dark:text-zinc-100 group-hover:text-[#F44566] flex items-center gap-2">
                          <span>{dept.name}</span>
                          {isHomeDept && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-700/60 flex items-center gap-0.5" title="Departamento con tu ciudad hogar">
                              🏠 Hogar
                            </span>
                          )}
                          {dept.advancePercentage === 100 && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                          )}
                        </td>
                        <td className="py-3 px-2 text-center text-slate-500 dark:text-zinc-400 tabular-nums">{dept.totalMunicipalities}</td>
                        <td className="py-3 px-2 text-center text-slate-800 dark:text-zinc-100 font-bold tabular-nums">{dept.visitedMunicipalities}</td>
                        <td className="py-3 px-2 text-center text-slate-500 dark:text-zinc-400 tabular-nums">{dept.pendingMunicipalities}</td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 rounded-full bg-[#FFE4EA] dark:bg-zinc-700 overflow-hidden flex-shrink-0">
                              <div
                                className="h-full bg-[#F44566] rounded-full transition-all duration-500"
                                style={{ width: `${dept.advancePercentage}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 w-8 text-right tabular-nums">
                              {dept.advancePercentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2.5 text-center">
              Haz clic en cualquier departamento para abrir su explorador regional.
            </p>
          </section>

          {/* TABLA 2: Balance Financiero y Bitácora de Gastos */}
          <section
            aria-label="Balance Financiero y Bitácora de Gastos"
            className="bg-white dark:bg-[#1E2228] rounded-3xl p-5 sm:p-6 border border-rose-100 dark:border-zinc-800 shadow-[0_10px_25px_-5px_rgba(244,69,102,0.12)] flex flex-col h-full"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-zinc-100">
                  Balance Financiero y Bitácora de Gastos
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  {filteredExpenses.length} registros según los filtros activos
                </p>
              </div>

              <span className="px-3 py-1 bg-[#F6EBD0] dark:bg-[#2A251D] text-amber-900 dark:text-amber-200 rounded-full text-xs font-bold border border-[#EEDBBA] dark:border-amber-900/50 tabular-nums">
                {formatCOP(totalFilteredBudget)}
              </span>
            </div>

            {/* Table Container with sleek rounded styling & scrollable list */}
            <div className="overflow-x-auto rounded-2xl border border-rose-100/70 dark:border-zinc-800 max-h-[480px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#FDF2F4] dark:bg-[#282D35] text-slate-700 dark:text-zinc-200 font-bold border-b border-rose-100 dark:border-zinc-700 shadow-2xs">
                    <th className="py-3 px-3 whitespace-nowrap">Fecha</th>
                    <th className="py-3 px-3 whitespace-nowrap">Municipio</th>
                    <th className="py-3 px-2.5 whitespace-nowrap">Categoría</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Gasto (COP)</th>
                    <th className="py-3 px-3 whitespace-nowrap">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50 dark:divide-zinc-800 font-medium text-slate-700 dark:text-zinc-300">
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((expense) => (
                      <tr
                        key={expense.id}
                        onClick={() => onNavigateToMunicipality(expense.municipalityId)}
                        className="hover:bg-[#FFF5F7] dark:hover:bg-[#282D35]/70 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-3 text-slate-500 dark:text-zinc-400 whitespace-nowrap text-[11px]">
                          {expense.date}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-zinc-100 group-hover:text-[#F44566] whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span>{expense.municipalityName}</span>
                            {expense.municipalityId === homeMunicipalityId && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-700/60">
                                🏠 Hogar
                              </span>
                            )}
                          </div>
                          <span className="block text-[10px] text-slate-500 dark:text-zinc-400 font-normal">
                            {expense.departmentName}
                          </span>
                        </td>
                        <td className="py-3 px-2.5">
                          {(() => {
                            const visual = getCategoryVisual(expense.category);
                            return (
                              <span
                                style={visual.badgeStyle}
                                className={`inline-block max-w-[150px] truncate px-2.5 py-0.5 rounded-full text-[10px] font-bold ${visual.badgeClassName}`}
                                title={expense.category}
                              >
                                {expense.category}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-zinc-100 whitespace-nowrap tabular-nums">
                          {formatCOP(expense.amountCop)}
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-zinc-400 text-[11px] max-w-[180px] truncate" title={expense.notes}>
                          {expense.notes || '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 px-4 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <div className="w-12 h-12 rounded-full bg-[#FFE8ED] dark:bg-zinc-800 flex items-center justify-center text-[#F44566] mb-3">
                            <TrendingUp className="w-6 h-6 opacity-80" />
                          </div>
                          <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 mb-1">
                            Aún no has registrado gastos de viaje
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                            Cuando completes una visita a un municipio, tus gastos aparecerán aquí.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#FFF8FA] dark:bg-[#282D35] font-bold text-slate-900 dark:text-zinc-100 border-t-2 border-[#FAD2DA] dark:border-zinc-700">
                    <td colSpan={3} className="py-3.5 px-3 text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-200">
                      Total
                    </td>
                    <td className="py-3.5 px-3 text-right text-sm text-[#F44566] tabular-nums">
                      {formatCOP(totalFilteredBudget)}
                    </td>
                    <td className="py-3.5 px-3 text-[11px] text-slate-500 dark:text-zinc-400 font-normal tabular-nums">
                      {filteredExpenses.length} movimientos
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
};
