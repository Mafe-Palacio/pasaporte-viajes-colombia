import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Department, Municipality, TripEntry, TripPhoto, TripTransport } from '../types';
import {
  COLOMBIA_DEPARTMENTS,
  DEPARTMENTS_MOCK,
  MUNICIPALITIES_MOCK,
  TRIPS_MOCK,
  getMunicipalitiesForDepartment,
  fetchColombiaGeoData,
  COLOMBIA_API_URL,
  BACKUP_COLOMBIA_API_URL,
  normalizeDivipolaRecord
} from '../data/colombiaData';
import colombiaRawJson from '../data/colombia.json';

export const useTravelStore = defineStore('travel', () => {
  // ----------------------------------------------------
  // State
  // ----------------------------------------------------
  const departments = ref<Department[]>(DEPARTMENTS_MOCK);
  const municipalities = ref<Municipality[]>(MUNICIPALITIES_MOCK);
  const trips = ref<TripEntry[]>(TRIPS_MOCK);
  const homeMunicipalityId = ref<string | null>(
    typeof window !== 'undefined'
      ? localStorage.getItem('pasaporte_home_municipality_id') || null
      : null
  );

  const selectedDepartmentId = ref<string | null>('quindio');
  const selectedMunicipalityId = ref<string | null>('salento');

  // Filters & Search
  const departmentSearchQuery = ref<string>('');
  const municipalitySearchQuery = ref<string>('');
  const municipalityFilter = ref<'all' | 'visited' | 'pending'>('all');
  const globalSearchQuery = ref<string>('');

  // Loading & Map state
  const isGeoDataLoading = ref<boolean>(false);
  const geoDataError = ref<string | null>(null);
  const isMapLoading = ref<boolean>(false);
  const isMapFallbackActive = ref<boolean>(false);
  const mapTimeoutSeconds = ref<number>(3);

  // ----------------------------------------------------
  // Getters / Computed
  // ----------------------------------------------------
  // Total municipalities loaded in memory (~1.122 oficial DIVIPOLA)
  const totalMunicipalitiesCount = computed(() => municipalities.value.length);

  const visitedMunicipalitiesCount = computed(() => {
    return municipalities.value.filter((m) => m.isVisited).length;
  });

  const visitedDepartmentsCount = computed(() => {
    return departments.value.filter((d) => d.isVisited).length;
  });

  const totalDepartmentsCount = computed(() => departments.value.length);

  const nationalProgressPercentage = computed(() => {
    if (totalMunicipalitiesCount.value === 0) return 0;
    return Math.round((visitedMunicipalitiesCount.value / totalMunicipalitiesCount.value) * 100);
  });

  const currentDepartment = computed(() => {
    return (
      departments.value.find((d) => d.id === selectedDepartmentId.value) ||
      departments.value[0]
    );
  });

  // Retrieves the complete list of municipalities for any department
  function departmentMunicipalities(deptId: string): Municipality[] {
    if (!deptId) return [];
    const norm = deptId.toLowerCase();
    if (norm === 'cundinamarca' || norm === '25') {
      return municipalities.value.filter((m) => m.departmentId === 'cundinamarca');
    }
    return municipalities.value.filter(
      (m) => m.departmentId === norm || m.code?.startsWith(norm)
    );
  }

  const currentDepartmentMunicipalities = computed(() => {
    if (!selectedDepartmentId.value) return [];
    const list = departmentMunicipalities(selectedDepartmentId.value);
    if (list.length > 0) return list;
    return getMunicipalitiesForDepartment(selectedDepartmentId.value);
  });

  // Search filter across the department's municipalities
  const filteredMunicipalities = computed(() => {
    return currentDepartmentMunicipalities.value.filter((m) => {
      const matchesSearch = m.name
        .toLowerCase()
        .includes(municipalitySearchQuery.value.toLowerCase());
      if (!matchesSearch) return false;

      if (municipalityFilter.value === 'visited') return m.isVisited;
      if (municipalityFilter.value === 'pending') return !m.isVisited;
      return true;
    });
  });

  // Reactive global search over the TOTALITY of loaded municipalities without truncation
  const searchedAllMunicipalities = computed(() => {
    const q = globalSearchQuery.value.trim().toLowerCase();
    if (!q) return municipalities.value;
    return municipalities.value.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.departmentName.toLowerCase().includes(q) ||
        (m.code && m.code.includes(q))
    );
  });

  const currentMunicipality = computed(() => {
    return (
      municipalities.value.find((m) => m.id === selectedMunicipalityId.value) || null
    );
  });

  const currentMunicipalityTrips = computed(() => {
    if (!selectedMunicipalityId.value) return [];
    return trips.value.filter((t) => t.municipalityId === selectedMunicipalityId.value);
  });

  // ----------------------------------------------------
  // Actions
  // ----------------------------------------------------
  async function fetchGeoData(): Promise<void> {
    isGeoDataLoading.value = true;
    geoDataError.value = null;

    try {
      let rawData: any[] = [];

      // 1. Try official user-specified Socrata endpoint
      try {
        const res = await fetch(COLOMBIA_API_URL);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 500) {
            rawData = json;
          }
        }
      } catch (err) {
        console.warn('API oficial xdk5-pm3f no disponible, probando endpoint activo.', err);
      }

      // 2. Try backup live endpoint on datos.gov.co
      if (rawData.length === 0) {
        try {
          const res = await fetch(BACKUP_COLOMBIA_API_URL);
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json) && json.length > 500) {
              rawData = json;
            }
          }
        } catch (err) {
          console.warn('Endpoint activo no disponible, usando dataset local.', err);
        }
      }

      // 3. Fallback to local colombia.json
      if (rawData.length === 0) {
        rawData = colombiaRawJson as any[];
      }

      // Map of existing user visits/trips by id and code to preserve status
      const existingMap = new Map<string, Municipality>();
      municipalities.value.forEach((m) => {
        existingMap.set(m.id, m);
        if (m.code) existingMap.set(m.code, m);
      });

      // Normalization of each municipality
      const normalized = rawData.map((item) => {
        const muni = normalizeDivipolaRecord(item);
        const existing =
          existingMap.get(muni.id) || (muni.code ? existingMap.get(muni.code) : undefined);
        if (existing) {
          muni.isVisited = existing.isVisited;
          muni.trips = existing.trips || [];
        }
        return muni;
      });

      municipalities.value = normalized;

      // Update the 32 official departments with their verified counts
      departments.value = COLOMBIA_DEPARTMENTS.map((dept) => {
        const munisInDept = normalized.filter((m) => m.departmentId === dept.id);
        const visitedInDept = munisInDept.filter((m) => m.isVisited).length;
        const total = munisInDept.length || dept.totalMunicipalities;
        const progress = total > 0 ? Math.round((visitedInDept / total) * 100) : 0;

        return {
          ...dept,
          totalMunicipalities: total,
          visitedMunicipalities: visitedInDept,
          isVisited: visitedInDept > 0,
          progressPercentage: progress
        };
      });
    } catch (err: any) {
      console.error('Error cargando división territorial de Colombia:', err);
      geoDataError.value = err?.message || 'Error al cargar DIVIPOLA';
    } finally {
      isGeoDataLoading.value = false;
    }
  }

  function selectDepartment(deptId: string) {
    selectedDepartmentId.value = deptId;
    municipalitySearchQuery.value = '';
    municipalityFilter.value = 'all';
  }

  function selectMunicipality(muniId: string) {
    selectedMunicipalityId.value = muniId;
  }

  function toggleMapFallback(forceState?: boolean) {
    isMapFallbackActive.value =
      forceState !== undefined ? forceState : !isMapFallbackActive.value;
  }

  function addOrUpdateTrip(trip: TripEntry) {
    const existingIndex = trips.value.findIndex((t) => t.id === trip.id);
    if (existingIndex >= 0) {
      trips.value[existingIndex] = trip;
    } else {
      trips.value.push(trip);
    }

    // Update Municipality isVisited
    const muni = municipalities.value.find((m) => m.id === trip.municipalityId || m.code === trip.municipalityId);
    if (muni) {
      muni.isVisited = true;

      // Update department statistics
      const dept = departments.value.find((d) => d.id === muni.departmentId);
      if (dept) {
        dept.isVisited = true;
        const visitedInDept = municipalities.value.filter(
          (m) => m.departmentId === dept.id && m.isVisited
        ).length;
        dept.visitedMunicipalities = visitedInDept;
        dept.progressPercentage = Math.round((visitedInDept / dept.totalMunicipalities) * 100);
      }
    }
  }

  function updateTripTransport(
    tripId: string,
    transport: {
      roadCondition: string;
      tollCount: number;
      hasTolls?: boolean;
      transportMode: string;
      notes: string;
    }
  ) {
    const trip = trips.value.find((t) => t.id === tripId);
    if (trip) {
      trip.transport = {
        ...transport,
        hasTolls: transport.tollCount > 0
      };
      trip.roadCondition = transport.roadCondition;
      trip.tollCount = transport.tollCount;
      trip.hasTolls = transport.tollCount > 0;
      trip.transportMode = transport.transportMode;
      trip.transportNotes = transport.notes;
      addOrUpdateTrip(trip);
    }
  }

  function addPhotosToTrip(tripId: string, newPhotos: TripPhoto[]) {
    const trip = trips.value.find((t) => t.id === tripId);
    if (trip) {
      if (!trip.photos) {
        trip.photos = [];
      }
      trip.photos.unshift(...newPhotos);
      addOrUpdateTrip(trip);
    }
  }

  function removeTrip(municipalityId: string, tripId: string) {
    const idx = trips.value.findIndex((t) => t.id === tripId);
    if (idx >= 0) {
      trips.value.splice(idx, 1);
    } else {
      trips.value = trips.value.filter((t) => t.id !== tripId);
    }

    // Check remaining trips for this municipality
    const remainingForMuni = trips.value.filter(
      (t) => t.municipalityId === municipalityId
    );

    const muni = municipalities.value.find(
      (m) => m.id === municipalityId || m.code === municipalityId
    );

    if (muni) {
      if (remainingForMuni.length === 0) {
        // If the LAST existing visit was removed:
        // Automatically mark the municipality as not visited
        muni.isVisited = false;
        muni.trips = [];
        delete (muni as any).stamp;
      } else {
        muni.isVisited = true;
        muni.trips = remainingForMuni;
      }

      // Update department statistics
      const dept = departments.value.find((d) => d.id === muni.departmentId);
      if (dept) {
        const visitedInDept = municipalities.value.filter(
          (m) => m.departmentId === dept.id && m.isVisited
        ).length;
        dept.visitedMunicipalities = visitedInDept;
        dept.isVisited = visitedInDept > 0;
        dept.progressPercentage = Math.round(
          (visitedInDept / (dept.totalMunicipalities || 1)) * 100
        );
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('pasaporte_trips', JSON.stringify(trips.value));
    }
  }

  function createTripEntry(params: {
    municipalityId: string;
    municipalityName: string;
    departmentName?: string;
    tripDate: string;
    summary?: string;
    tripNumber?: number;
  }): TripEntry {
    return {
      id: `trip-${params.municipalityId}-${Date.now()}`,
      municipalityId: params.municipalityId,
      municipalityName: params.municipalityName,
      departmentName: params.departmentName,
      userId: 'user-family-1',
      tripDate: params.tripDate,
      label: `Visita ${params.tripNumber || 1}: ${params.tripDate}`,
      rating: 5,
      summary: params.summary || `Visita a ${params.municipalityName}.`,
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
      expenses: [],
      photos: [] // Strictly empty by default - no mock photos
    };
  }

  function setHomeMunicipality(municipalityId: string | null) {
    const previousHomeId = homeMunicipalityId.value;
    homeMunicipalityId.value = municipalityId;

    if (typeof window !== 'undefined') {
      if (municipalityId) {
        localStorage.setItem('pasaporte_home_municipality_id', municipalityId);
      } else {
        localStorage.removeItem('pasaporte_home_municipality_id');
      }
    }

    // Unset previous home if different
    if (previousHomeId && previousHomeId !== municipalityId) {
      const prevMuni = municipalities.value.find(
        (m) => m.id === previousHomeId || m.code === previousHomeId
      );
      if (prevMuni) {
        prevMuni.isHome = false;
        // Check if previous had only home trip
        const otherTrips = trips.value.filter(
          (t) => t.municipalityId === previousHomeId && !t.isHomeTrip
        );
        if (otherTrips.length === 0) {
          prevMuni.isVisited = false;
          trips.value = trips.value.filter((t) => t.municipalityId !== previousHomeId);
        }
      }
    }

    // Set new home
    if (municipalityId) {
      const muni = municipalities.value.find(
        (m) => m.id === municipalityId || m.code === municipalityId
      );
      if (muni) {
        muni.isHome = true;
        muni.isVisited = true;

        // Update department stats
        const dept = departments.value.find((d) => d.id === muni.departmentId);
        if (dept) {
          const visitedInDept = municipalities.value.filter(
            (m) => m.departmentId === dept.id && m.isVisited
          ).length;
          dept.visitedMunicipalities = visitedInDept;
          dept.isVisited = true;
          dept.progressPercentage = Math.round(
            (visitedInDept / (dept.totalMunicipalities || 1)) * 100
          );
        }

        // Check if there are already trips for this municipality
        const existingTrips = trips.value.filter(
          (t) => t.municipalityId === municipalityId
        );
        if (existingTrips.length === 0) {
          const homeTrip: TripEntry = {
            id: `trip-home-${municipalityId}`,
            municipalityId: municipalityId,
            municipalityName: muni.name,
            departmentName: muni.departmentName,
            userId: 'user-family-1',
            tripDate: 'Residencia Actual',
            label: 'Ciudad Hogar / Base',
            isHomeTrip: true,
            rating: 5,
            summary: `Nuestra base de vida, hogar y operaciones en ${muni.name}.`,
            foodReview: 'Nuestras cafeterías, restaurantes y rincones gastronómicos cotidianos.',
            favoriteDish: 'Especialidades locales y de casa',
            transportNotes: 'Tu base de operaciones y residencia. No aplican peajes ni traslados turísticos.',
            roadCondition: 'Buena',
            hasTolls: false,
            tollCount: 0,
            transportMode: 'Movilidad urbana local',
            transport: {
              roadCondition: 'Buena',
              tollCount: 0,
              hasTolls: false,
              transportMode: 'Movilidad urbana local',
              notes: 'Tu base de operaciones y residencia. No aplican peajes ni traslados turísticos.'
            },
            doNotForgetNotes: 'Puntos de encuentro, mercado local y trámites cotidianos.',
            expenses: [],
            photos: []
          };
          trips.value.push(homeTrip);
        }
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('pasaporte_municipalities', JSON.stringify(municipalities.value));
      localStorage.setItem('pasaporte_departments', JSON.stringify(departments.value));
      localStorage.setItem('pasaporte_trips', JSON.stringify(trips.value));
    }
  }

  const homeMunicipality = computed(() => {
    if (!homeMunicipalityId.value) return null;
    return (
      municipalities.value.find(
        (m) => m.id === homeMunicipalityId.value || m.code === homeMunicipalityId.value
      ) || null
    );
  });

  const isHomeMunicipality = (municipalityId: string) => {
    return homeMunicipalityId.value === municipalityId;
  };

  // Trigger geo-data fetch on initialization
  fetchGeoData();

  return {
    // State
    departments,
    municipalities,
    trips,
    homeMunicipalityId,
    selectedDepartmentId,
    selectedMunicipalityId,
    departmentSearchQuery,
    municipalitySearchQuery,
    municipalityFilter,
    globalSearchQuery,
    isGeoDataLoading,
    geoDataError,
    isMapLoading,
    isMapFallbackActive,
    mapTimeoutSeconds,

    // Getters & Computed
    totalMunicipalitiesCount,
    visitedMunicipalitiesCount,
    visitedDepartmentsCount,
    totalDepartmentsCount,
    nationalProgressPercentage,
    currentDepartment,
    departmentMunicipalities,
    currentDepartmentMunicipalities,
    filteredMunicipalities,
    searchedAllMunicipalities,
    currentMunicipality,
    currentMunicipalityTrips,
    homeMunicipality,
    isHomeMunicipality,

    // Actions
    fetchGeoData,
    selectDepartment,
    selectMunicipality,
    toggleMapFallback,
    addOrUpdateTrip,
    updateTripTransport,
    addPhotosToTrip,
    removeTrip,
    createTripEntry,
    setHomeMunicipality
  };
});
