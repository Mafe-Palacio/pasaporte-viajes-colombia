import React, { useState } from 'react';
import { X, Check, Copy, Code2, Database, Globe, Layers, GitBranch, Terminal } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'efcore' | 'api' | 'pinia' | 'vue' | 'cicd'>('tree');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sections = {
    tree: {
      title: '1. Estructura y Árbol de Carpetas (Clean Architecture)',
      badge: 'Solución Desacoplada',
      code: `ColombiaTravelPassport/
├── backend/                              # .NET 10 Web API (C# 13)
│   ├── ColombiaTravel.sln
│   └── ColombiaTravel.Api/
│       ├── Controllers/
│       │   ├── AuthController.cs         # JWT, Refresh Tokens & Password Recovery
│       │   ├── GeoController.cs          # Centroids, GeoJSON, Proyecciones IsVisited
│       │   └── TripsController.cs        # CRUD Multiviaje, Gastos y Fotos
│       ├── Data/
│       │   ├── AppDbContext.cs           # EF Core 10 DbContext optimizado
│       │   └── Migrations/
│       ├── Models/
│       │   └── Entities.cs               # Department, Municipality, TripEntry, ExpenseLog
│       ├── DTOs/
│       │   ├── AuthDtos.cs
│       │   └── TripDtos.cs
│       ├── Services/
│       │   ├── TokenService.cs           # Emisión y validación segura de JWT
│       │   └── CloudStorageService.cs    # Subida de fotos de viaje
│       ├── Program.cs                    # Configuración DI, Rate Limiting, JWT & CORS
│       └── appsettings.json
│
├── frontend/                             # Vue 3 (Composition API) + Pinia + Tailwind
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── AppNavbar.vue             # Barra flotante estilo cápsula (Pill Bar)
│   │   │   ├── ColombiaMap.vue           # Leaflet con centroides y fallback a 3s
│   │   │   ├── DepartmentGrid.vue        # Cuadrícula de contingencia
│   │   │   └── PassportStamp.vue         # Sello postal animado con rotación
│   │   ├── stores/
│   │   │   ├── useAuthStore.ts           # Estado de usuario, JWT y refresh
│   │   │   └── useTravelStore.ts         # Progreso 32 deptos, filtros y caché
│   │   ├── views/
│   │   │   ├── AuthView.vue              # Pantalla 1: Login/Register
│   │   │   ├── CountryExplorerView.vue   # Pantalla 2: Nivel Nacional
│   │   │   ├── RegionalExplorerView.vue  # Pantalla 3: Nivel Departamental
│   │   │   └── MunicipalityDetailView.vue# Pantalla 4: Detalle Multiviaje
│   │   ├── router/
│   │   │   └── index.ts                  # Vue Router con Navigation Guards
│   │   ├── types/
│   │   │   └── index.ts                  # Tipos TypeScript Geo & Trip
│   │   ├── App.vue
│   │   └── main.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
└── .github/
    └── workflows/
        └── ci.yml                        # CI/CD: .NET 10 tests + Vue build y auditoría`
    },
    efcore: {
      title: '2. Esquema EF Core y Consulta Optimizada de IsVisited',
      badge: '.NET 10 & PostgreSQL',
      code: `// backend/ColombiaTravel.Api/Data/AppDbContext.cs
public class AppDbContext : DbContext
{
    public DbSet<ApplicationUser> Users => Set<ApplicationUser>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Municipality> Municipalities => Set<Municipality>();
    public DbSet<TripEntry> TripEntries => Set<TripEntry>();
    public DbSet<ExpenseLog> Expenses => Set<ExpenseLog>();
    public DbSet<TripPhoto> TripPhotos => Set<TripPhoto>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Índice compuesto crítico para consultas ultrarrápidas de IsVisited
        modelBuilder.Entity<TripEntry>(entity =>
        {
            entity.HasIndex(t => new { t.UserId, t.MunicipalityId });
            entity.HasIndex(t => t.TripDate);
        });
    }

    /// <summary>
    /// Consulta Proyectada Optimizada (Cero N+1, un único round-trip SQL a Postgres)
    /// </summary>
    public async Task<List<DepartmentDto>> GetDepartmentsForUserAsync(Guid userId)
    {
        return await Departments
            .AsNoTracking()
            .Select(d => new DepartmentDto
            {
                Id = d.Id,
                DivipolaCode = d.DivipolaCode,
                Name = d.Name,
                Capital = d.Capital,
                Latitude = d.Latitude,
                Longitude = d.Longitude,
                TotalMunicipalities = d.TotalMunicipalities,
                // Subconsulta SQL EXISTS / COUNT directa en motor Postgres
                VisitedMunicipalities = d.Municipalities
                    .Count(m => m.TripEntries.Any(t => t.UserId == userId)),
                IsVisited = d.Municipalities
                    .Any(m => m.TripEntries.Any(t => t.UserId == userId)),
                ProgressPercentage = d.TotalMunicipalities > 0
                    ? (int)Math.Round((double)d.Municipalities.Count(m => m.TripEntries.Any(t => t.UserId == userId)) / d.TotalMunicipalities * 100)
                    : 0
            })
            .OrderBy(d => d.Name)
            .ToListAsync();
    }
}`
    },
    api: {
      title: '3. Endpoints de la API (.NET 10 Web API)',
      badge: 'JWT + RESTful',
      code: `// Controladores implementados en backend/ColombiaTravel.Api/Controllers/TravelControllers.cs

// AUTH
POST /api/auth/login            -> Valida credenciales con BCrypt y emite JWT + Refresh Token
POST /api/auth/register         -> Registra nueva cuenta familiar
POST /api/auth/forgot-password  -> Genera token seguro y envía email de recuperación

// GEOGRAFÍA & MAPAS (Requieren [Authorize])
GET  /api/geo/departments       -> Retorna los 32 departamentos con coordenadas centroide y progreso
GET  /api/geo/departments/{id}/municipalities -> Retorna municipios del depto con estado de visita

// BITÁCORA MULTIVIAJE & MULTIMEDIA
GET  /api/trips/municipality/{id} -> Retorna historial de visitas, gastos discriminados y fotos
POST /api/trips                  -> Registra o actualiza visita (Gastos en COP, transporte, comida)
POST /api/trips/{id}/photos      -> Subida multipart de fotografías de viaje a CDN/Storage`
    },
    pinia: {
      title: '4. Stores de Pinia (useAuthStore & useTravelStore)',
      badge: 'Vue 3 Setup Stores',
      code: `// src/vue-pinia/useTravelStore.ts
export const useTravelStore = defineStore('travel', () => {
  const departments = ref<Department[]>([]);
  const municipalities = ref<Municipality[]>([]);
  const trips = ref<TripEntry[]>([]);
  const selectedDepartmentId = ref<string | null>('quindio');
  const isMapFallbackActive = ref<boolean>(false);

  // Progreso nacional calculado de forma reactiva
  const visitedDepartmentsCount = computed(() => 
    departments.value.filter(d => d.isVisited).length
  );
  
  const nationalProgressPercentage = computed(() => 
    Math.round((visitedDepartmentsCount.value / 32) * 100)
  );

  // Activación de modo contingencia (Timeout 3s o fallo WebGL/GeoJSON)
  function triggerMapFallback() {
    isMapFallbackActive.value = true;
  }

  return {
    departments,
    municipalities,
    trips,
    visitedDepartmentsCount,
    nationalProgressPercentage,
    isMapFallbackActive,
    triggerMapFallback
  };
});`
    },
    vue: {
      title: '5. Componente Vue 3 SFC (ColombiaMap.vue & AppNavbar.vue)',
      badge: 'Composition API + Leaflet',
      code: `<!-- src/vue-pinia/AppNavbar.vue -->
<template>
  <header class="w-full px-2 pt-2 flex flex-col items-center sticky top-2 z-40 pointer-events-none">
    <!-- Fila Superior (Barra de Utilidades en Móvil): Título y Salir -->
    <div class="sm:hidden w-full max-w-sm flex items-center justify-between px-2 pb-1.5 pointer-events-auto">
      <span class="text-xs font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1">
        🇨🇴 Pasaporte Colombia
      </span>
      <button @click="handleLogout" class="shrink-0 text-xs font-medium text-rose-500 flex items-center gap-1">
        <LogOut class="w-3.5 h-3.5" /> Salir
      </button>
    </div>

    <!-- Fila de Navegación Principal: Cápsula horizontal de 3 secciones -->
    <nav class="pointer-events-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-full p-1 shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-1 w-full max-w-sm sm:max-w-fit mx-auto">
      <div class="grid grid-cols-3 gap-1 w-full sm:flex sm:items-center sm:gap-1.5">
        <button @click="navigate('country')" :class="['px-2.5 py-1.5 text-xs font-medium rounded-full flex items-center justify-center gap-1', isCountryActive ? 'bg-[#F44566] text-white' : 'text-[#777]']">
          <Compass class="w-3.5 h-3.5" /> Explorador
        </button>
        <button @click="navigate('/recuerdos')" :class="['px-2.5 py-1.5 text-xs font-medium rounded-full flex items-center justify-center gap-1', isRecuerdosActive ? 'bg-[#F44566] text-white' : 'text-[#777]']">
          <Heart class="w-3.5 h-3.5" /> Recuerdos
        </button>
        <button @click="navigate('/reportes')" :class="['px-2.5 py-1.5 text-xs font-medium rounded-full flex items-center justify-center gap-1', isReportesActive ? 'bg-[#F44566] text-white' : 'text-[#777]']">
          <BarChart3 class="w-3.5 h-3.5" /> Reportes
        </button>
      </div>
    </nav>
  </header>
</template>`
    },
    cicd: {
      title: '6. Pipeline de CI/CD (.github/workflows/ci.yml)',
      badge: 'GitHub Actions',
      code: `# .github/workflows/ci.yml
name: Colombia Travel CI/CD Pipeline
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  backend-dotnet:
    name: Build & Test Backend (.NET 10 & EF Core)
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: travelpassport_test
          POSTGRES_PASSWORD: runnerpassword
        ports: [ 5432:5432 ]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.0.x'
      - run: dotnet restore backend/ColombiaTravel.sln
      - run: dotnet test --configuration Release

  frontend-vue:
    name: Build & Audit Frontend (Vue 3 / Vite)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run lint
      - run: npm run build`
    }
  };

  const currentSection = sections[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-[#FFE4EA] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#FFF5F7] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFE8ED] flex items-center justify-center text-[#F44566]">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Arquitectura Técnica &amp; Entregables del Proyecto
              </h2>
              <p className="text-xs text-slate-500">
                .NET 10 Web API • Entity Framework Core • Vue 3 &amp; Pinia • CI/CD Pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 bg-[#FFFBFB] flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'tree', label: 'Estructura Proyecto', icon: Layers },
            { id: 'efcore', label: 'EF Core & PostgreSQL', icon: Database },
            { id: 'api', label: '.NET 10 Web API', icon: Terminal },
            { id: 'pinia', label: 'Stores Pinia', icon: Globe },
            { id: 'vue', label: 'Componentes Vue 3', icon: Code2 },
            { id: 'cicd', label: 'Pipeline CI/CD', icon: GitBranch }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#F44566] text-white shadow-md shadow-[#F44566]/25'
                    : 'bg-white text-slate-600 hover:bg-[#FFF3F5] hover:text-[#F44566] border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Code Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-900 text-slate-100 font-mono text-xs relative">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-sm text-white">
                {currentSection.title}
              </span>
              <span className="font-sans text-[10px] bg-[#F44566] text-white px-2.5 py-0.5 rounded-full font-bold">
                {currentSection.badge}
              </span>
            </div>
            <button
              onClick={() => handleCopy(currentSection.code)}
              style={
                copied
                  ? {
                      backgroundColor: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
                      color: 'var(--color-accent)',
                      borderColor: 'color-mix(in srgb, var(--color-accent) 40%, transparent)'
                    }
                  : undefined
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-sans text-xs transition-colors border cursor-pointer ${
                copied
                  ? 'font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-transparent'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar Código'}</span>
            </button>
          </div>

          <pre className="overflow-x-auto whitespace-pre leading-relaxed text-slate-300">
            <code>{currentSection.code}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Diseñado y construido con arquitectura limpia desacoplada</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#F44566] text-white rounded-full font-bold hover:bg-[#e03757] transition-all"
          >
            Cerrar Visor
          </button>
        </div>
      </div>
    </div>
  );
};
