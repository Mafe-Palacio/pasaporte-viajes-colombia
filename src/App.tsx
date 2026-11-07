/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppNavbar } from './components/AppNavbar';
import { AuthScreen } from './components/AuthScreen';
import { CountryExplorer } from './components/CountryExplorer';
import { RegionalExplorer } from './components/RegionalExplorer';
import { MunicipalityDetail } from './components/MunicipalityDetail';
import { ArchitectureModal } from './components/ArchitectureModal';
import { MemoriesWall } from './components/MemoriesWall';
import { TravelReports } from './components/TravelReports';
import { ThemeFloatingMenu } from './components/ThemeFloatingMenu';
import {
  DEPARTMENTS_MOCK,
  MUNICIPALITIES_MOCK,
  TRIPS_MOCK,
  getMunicipalitiesForDepartment,
  fetchColombiaGeoData
} from './data/colombiaData';
import { Department, Municipality, TripEntry } from './types';

export default function App() {
  // Navigation Route State: starts strictly at '/login' unless already authenticated
  const [currentRoute, setCurrentRoute] = useState<string>('/login');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('auth_token');
    }
    return false;
  });
  const [userEmail, setUserEmail] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = localStorage.getItem('auth_user');
        if (u) return JSON.parse(u).email || '';
      } catch {}
    }
    return '';
  });
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const authRef = useRef<boolean>(isAuthenticated);

  // Reactive dark mode state synced with DOM and localStorage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-mode') || localStorage.getItem('theme_mode');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isDark: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.isDark === 'boolean') {
        setIsDarkMode(customEvent.detail.isDark);
      } else if (typeof document !== 'undefined') {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
      }
    };
    window.addEventListener('theme-mode-changed', handleThemeChange);
    return () => window.removeEventListener('theme-mode-changed', handleThemeChange);
  }, []);

  useEffect(() => {
    authRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Selected entities
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('quindio');
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string>('salento');

  // Master State - Clear legacy storage on version bump so user starts with clean slate
  const [departments, setDepartments] = useState<Department[]>(() => {
    if (typeof window !== 'undefined') {
      const RESET_KEY = 'pasaporte_visited_cleared_v6_divipola';
      if (!localStorage.getItem(RESET_KEY)) {
        localStorage.removeItem('pasaporte_departments');
        localStorage.removeItem('pasaporte_municipalities');
        localStorage.removeItem('pasaporte_trips');
        localStorage.setItem(RESET_KEY, 'true');
        return DEPARTMENTS_MOCK;
      }
      const saved = localStorage.getItem('pasaporte_departments');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length >= 32) {
            return parsed.map((dept) => {
              const official = DEPARTMENTS_MOCK.find(
                (d) => d.id === dept.id || d.code === dept.code
              );
              return {
                ...dept,
                totalMunicipalities: official?.totalMunicipalities || dept.totalMunicipalities
              };
            });
          }
        } catch (e) {
          console.error('Error parsing stored departments', e);
        }
      }
    }
    return DEPARTMENTS_MOCK;
  });

  const [municipalities, setMunicipalities] = useState<Municipality[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pasaporte_municipalities');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length >= 1100) {
            return parsed;
          } else if (Array.isArray(parsed) && parsed.length > 0) {
            // Merge previously marked visited municipalities into the complete DIVIPOLA dataset
            const visitedIds = new Set(
              parsed.filter((m: Municipality) => m.isVisited).map((m: Municipality) => m.id)
            );
            return MUNICIPALITIES_MOCK.map((m) => ({
              ...m,
              isVisited: visitedIds.has(m.id) || visitedIds.has(m.code || '')
            }));
          }
        } catch (e) {
          console.error('Error parsing stored municipalities', e);
        }
      }
    }
    return MUNICIPALITIES_MOCK;
  });

  const [trips, setTrips] = useState<TripEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pasaporte_trips');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (e) {
          console.error('Error parsing stored trips', e);
        }
      }
    }
    return TRIPS_MOCK;
  });

  // Dynamic loading of DIVIPOLA dataset on application launch
  useEffect(() => {
    fetchColombiaGeoData(municipalities)
      .then(({ departments: updatedDepts, municipalities: updatedMunis }) => {
        if (updatedMunis && updatedMunis.length >= 1100) {
          setMunicipalities((prev) => {
            const visitedIds = new Set(prev.filter((m) => m.isVisited).map((m) => m.id));
            return updatedMunis.map((m) => ({
              ...m,
              isVisited: visitedIds.has(m.id) || visitedIds.has(m.code || '') || m.isVisited
            }));
          });
          setDepartments((prev) => {
            return updatedDepts.map((d) => {
              const existing = prev.find((p) => p.id === d.id);
              return existing
                ? {
                    ...d,
                    visitedMunicipalities: existing.visitedMunicipalities,
                    isVisited: existing.isVisited,
                    progressPercentage: existing.progressPercentage
                  }
                : d;
            });
          });
        }
      })
      .catch((err) =>
        console.warn('Carga remota de DIVIPOLA no disponible, utilizando dataset local completo.', err)
      );
  }, []);

  // Architecture Modal
  const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);

  // Map explorer routes where AppNavbar is strictly hidden
  const isMapExplorerRoute =
    currentRoute === '/explorador' ||
    currentRoute.startsWith('/departamento') ||
    currentRoute === 'regional';

  // Sync route and guard unauthenticated access
  useEffect(() => {
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');
    if (!isAuthenticated && !hasToken) {
      setCurrentRoute('/login');
      if (window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
    }
  }, [isAuthenticated]);

  // Sync data to localStorage
  useEffect(() => {
    localStorage.setItem('pasaporte_departments', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('pasaporte_municipalities', JSON.stringify(municipalities));
  }, [municipalities]);

  useEffect(() => {
    localStorage.setItem('pasaporte_trips', JSON.stringify(trips));
  }, [trips]);

  // Navigation router with strict authentication guard
  const navigateTo = (targetRoute: string, bypassAuthCheck = false) => {
    const isUserAuth =
      bypassAuthCheck ||
      authRef.current ||
      isAuthenticated ||
      (typeof window !== 'undefined' && !!localStorage.getItem('auth_token'));

    if (!isUserAuth && targetRoute !== '/login') {
      setCurrentRoute('/login');
      setAuthNotice('Debes iniciar sesión para acceder al mapa y bitácora.');
      window.history.replaceState(null, '', '/login');
      return;
    }

    setAuthNotice(null);
    let normalized = targetRoute;
    if (targetRoute === 'explorador' || targetRoute === 'country') {
      normalized = '/explorador';
    } else if (targetRoute === 'municipality' || targetRoute === 'bitacora') {
      normalized = `/municipio/${selectedMunicipalityId}`;
    } else if (targetRoute === 'recuerdos' || targetRoute === '/recuerdos') {
      normalized = '/recuerdos';
    } else if (targetRoute === 'reportes' || targetRoute === '/reportes') {
      normalized = '/reportes';
    }

    setCurrentRoute(normalized);
    window.history.pushState(null, '', normalized);
  };

  // Handlers
  const handleSelectDepartment = (deptId: string) => {
    if (!isAuthenticated) {
      navigateTo('/login');
      return;
    }
    setSelectedDepartmentId(deptId);
    navigateTo(`/departamento/${deptId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMunicipality = (muniId: string) => {
    if (!isAuthenticated) {
      navigateTo('/login');
      return;
    }
    setSelectedMunicipalityId(muniId);
    const m = municipalities.find((item) => item.id === muniId);
    if (m) {
      setSelectedDepartmentId(m.departmentId);
    }
    navigateTo(`/municipio/${muniId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Synchronize route if user hits a direct link or goes back
  useEffect(() => {
    if (currentRoute.startsWith('/departamento/')) {
      const deptId = currentRoute.replace('/departamento/', '').split('/')[0];
      if (deptId && deptId !== selectedDepartmentId) {
        setSelectedDepartmentId(deptId);
      }
    } else if (currentRoute.startsWith('/municipio/')) {
      const muniId = currentRoute.replace('/municipio/', '').split('/')[0];
      if (muniId && muniId !== selectedMunicipalityId) {
        setSelectedMunicipalityId(muniId);
        const m = municipalities.find((item) => item.id === muniId);
        if (m && m.departmentId !== selectedDepartmentId) {
          setSelectedDepartmentId(m.departmentId);
        }
      }
    }
  }, [currentRoute, municipalities, selectedDepartmentId, selectedMunicipalityId]);

  const handleSaveTrip = (savedTrip: TripEntry) => {
    setTrips((prev) => {
      const idx = prev.findIndex((t) => t.id === savedTrip.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedTrip;
        return next;
      }
      return [...prev, savedTrip];
    });

    // Mark municipality as visited
    setMunicipalities((prev) => {
      const exists = prev.some((m) => m.id === savedTrip.municipalityId);
      if (exists) {
        return prev.map((m) =>
          m.id === savedTrip.municipalityId ? { ...m, isVisited: true } : m
        );
      }
      return [
        ...prev,
        {
          id: savedTrip.municipalityId,
          code: savedTrip.municipalityId,
          departmentId: savedTrip.departmentName ? savedTrip.departmentName.toLowerCase().replace(/\s+/g, '-') : '',
          departmentName: savedTrip.departmentName || '',
          name: savedTrip.municipalityName,
          latitude: 4.5,
          longitude: -75.5,
          isVisited: true,
          coverPhoto: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=800&auto=format&fit=crop&q=80',
          description: `Municipio de ${savedTrip.municipalityName}`
        }
      ];
    });

    // Update department stats
    const muni = municipalities.find((m) => m.id === savedTrip.municipalityId);
    const targetDeptId = muni?.departmentId || (savedTrip.departmentName ? savedTrip.departmentName.toLowerCase().replace(/\s+/g, '-') : '');
    
    setDepartments((prev) =>
      prev.map((dept) => {
        if (dept.id === targetDeptId || dept.name.toLowerCase() === savedTrip.departmentName?.toLowerCase()) {
          const visitedCount = Math.max(1, dept.visitedMunicipalities + (muni?.isVisited ? 0 : 1));
          const totalMunis = dept.totalMunicipalities || 1;
          const pct = Math.min(100, Math.round((visitedCount / totalMunis) * 100));
          return {
            ...dept,
            isVisited: true,
            visitedMunicipalities: visitedCount,
            progressPercentage: pct
          };
        }
        return dept;
      })
    );
  };

  const handleDeleteTrip = (municipalityId: string, tripId: string) => {
    // 1. Remove trip from trips
    const nextTrips = trips.filter((t) => t.id !== tripId);
    setTrips(nextTrips);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pasaporte_trips', JSON.stringify(nextTrips));
    }

    // 2. Check if this municipality has remaining trips
    const remainingForMuni = nextTrips.filter((t) => t.municipalityId === municipalityId);

    if (remainingForMuni.length === 0) {
      // Mark municipality as not visited, clear stamp and trips
      setMunicipalities((prev) => {
        const nextMunis = prev.map((m) =>
          m.id === municipalityId || m.code === municipalityId
            ? { ...m, isVisited: false, trips: [], stamp: undefined }
            : m
        );
        if (typeof window !== 'undefined') {
          localStorage.setItem('pasaporte_municipalities', JSON.stringify(nextMunis));
        }
        return nextMunis;
      });

      // Update department statistics
      const targetMuni = municipalities.find((m) => m.id === municipalityId || m.code === municipalityId);
      const targetDeptId = targetMuni?.departmentId;

      if (targetDeptId) {
        setDepartments((prev) => {
          const nextDepts = prev.map((dept) => {
            if (dept.id === targetDeptId) {
              const visitedInDept = municipalities.filter(
                (m) => m.departmentId === targetDeptId && m.isVisited && m.id !== municipalityId && m.code !== municipalityId
              ).length;
              const totalMunis = dept.totalMunicipalities || 1;
              return {
                ...dept,
                isVisited: visitedInDept > 0,
                visitedMunicipalities: visitedInDept,
                progressPercentage: Math.round((visitedInDept / totalMunis) * 100)
              };
            }
            return dept;
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('pasaporte_departments', JSON.stringify(nextDepts));
          }
          return nextDepts;
        });
      }
    }
  };

  const [homeMunicipalityId, setHomeMunicipalityId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pasaporte_home_municipality_id');
    }
    return null;
  });

  const handleSetHomeMunicipality = (muniId: string | null) => {
    setHomeMunicipalityId(muniId);
    if (typeof window !== 'undefined') {
      if (muniId) {
        localStorage.setItem('pasaporte_home_municipality_id', muniId);
      } else {
        localStorage.removeItem('pasaporte_home_municipality_id');
      }
    }

    if (muniId) {
      // Automatically mark municipality as visited and home
      const targetMuni = municipalities.find((m) => m.id === muniId || m.code === muniId);
      setMunicipalities((prev) => {
        const next = prev.map((m) =>
          m.id === muniId || m.code === muniId
            ? { ...m, isVisited: true, isHome: true }
            : { ...m, isHome: false }
        );
        if (typeof window !== 'undefined') {
          localStorage.setItem('pasaporte_municipalities', JSON.stringify(next));
        }
        return next;
      });

      if (targetMuni) {
        setDepartments((prev) => {
          const next = prev.map((dept) => {
            if (dept.id === targetMuni.departmentId || dept.name.toLowerCase() === targetMuni.departmentName?.toLowerCase()) {
              const visitedInDept = Math.max(1, dept.visitedMunicipalities);
              return {
                ...dept,
                isVisited: true,
                visitedMunicipalities: visitedInDept,
                progressPercentage: Math.max(1, Math.round((visitedInDept / (dept.totalMunicipalities || 1)) * 100))
              };
            }
            return dept;
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('pasaporte_departments', JSON.stringify(next));
          }
          return next;
        });
      }
    } else {
      setMunicipalities((prev) => {
        const next = prev.map((m) => ({ ...m, isHome: false }));
        if (typeof window !== 'undefined') {
          localStorage.setItem('pasaporte_municipalities', JSON.stringify(next));
        }
        return next;
      });
    }
  };

  const homeDepartmentId = useMemo(() => {
    if (!homeMunicipalityId) return null;
    const m = municipalities.find((item) => item.id === homeMunicipalityId || item.code === homeMunicipalityId);
    return m?.departmentId || null;
  }, [homeMunicipalityId, municipalities]);

  const handleLogout = () => {
    authRef.current = false;
    setIsAuthenticated(false);
    setUserEmail('');
    setAuthNotice(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    navigateTo('/login', true);
  };

  const handleLoginSuccess = (email: string) => {
    authRef.current = true;
    setIsAuthenticated(true);
    setUserEmail(email);
    setAuthNotice(null);
    navigateTo('/explorador', true);
  };

  const activeDepartment =
    departments.find((d) => d.id === selectedDepartmentId) || departments[0];

  const activeDepartmentMunicipalities = useMemo(() => {
    const list = municipalities.filter((m) => m.departmentId === selectedDepartmentId);
    if (list.length > 0) return list;
    return getMunicipalitiesForDepartment(selectedDepartmentId);
  }, [municipalities, selectedDepartmentId]);

  const activeMunicipality = useMemo(() => {
    return (
      municipalities.find((m) => m.id === selectedMunicipalityId) ||
      activeDepartmentMunicipalities.find((m) => m.id === selectedMunicipalityId) ||
      activeDepartmentMunicipalities[0] ||
      municipalities[0]
    );
  }, [municipalities, selectedMunicipalityId, activeDepartmentMunicipalities]);

  const activeMunicipalityTrips = trips.filter(
    (t) => t.municipalityId === selectedMunicipalityId
  );

  return (
    <div
      id="app"
      className={`min-h-screen w-full transition-colors duration-300 ${
        isDarkMode ? 'dark bg-[#121417] text-zinc-100' : 'bg-[#FFF0F3] text-slate-800'
      } font-sans antialiased selection:bg-[#FFBDC9] selection:text-[#F44566] relative`}
      style={{
        backgroundImage: isDarkMode
          ? 'linear-gradient(180deg, rgba(30, 34, 40, 0.7) 0%, transparent 50%)'
          : 'linear-gradient(180deg, var(--color-accent-soft) 0%, transparent 45%)'
      }}
    >
      {/* Global Centered Floating Pill Navbar - ONLY visible on detail / bitácora (strictly NOT on /login, /explorador or /departamento/:id) */}
      {isAuthenticated && !isMapExplorerRoute && currentRoute !== '/login' && (
        <AppNavbar
          currentRoute={currentRoute}
          onNavigate={(route) => {
            if (route === 'bitacora' || route === 'municipality' || route.startsWith('/municipio')) {
              navigateTo(`/municipio/${selectedMunicipalityId}`);
            } else if (route === 'country' || route === 'explorador' || route === '/explorador') {
              navigateTo('/explorador');
            } else {
              navigateTo(route);
            }
          }}
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
          isArchitectureOpen={isArchitectureOpen}
        />
      )}

      {/* Screen Routing with Guard */}
      <main>
        {(!isAuthenticated || currentRoute === '/login') && (
          <AuthScreen 
            onLoginSuccess={handleLoginSuccess}
            authRequiredNotice={authNotice}
          />
        )}

        {isAuthenticated && currentRoute === '/explorador' && (
          <CountryExplorer
            departments={departments}
            homeDepartmentId={homeDepartmentId}
            onSelectDepartment={handleSelectDepartment}
            onNavigateToRecuerdos={() => navigateTo('/recuerdos')}
            onNavigateToReportes={() => navigateTo('/reportes')}
            onLogout={handleLogout}
          />
        )}

        {isAuthenticated && (currentRoute.startsWith('/departamento') || currentRoute === 'regional') && activeDepartment && (
          <RegionalExplorer
            department={activeDepartment}
            departments={departments}
            municipalities={activeDepartmentMunicipalities}
            homeMunicipalityId={homeMunicipalityId}
            onBackToCountry={() => navigateTo('/explorador')}
            onSelectMunicipality={handleSelectMunicipality}
            onSelectDepartment={handleSelectDepartment}
            onNavigateToRecuerdos={() => navigateTo('/recuerdos')}
            onNavigateToReportes={() => navigateTo('/reportes')}
            onLogout={handleLogout}
          />
        )}

        {isAuthenticated && (currentRoute.startsWith('/municipio') || currentRoute === 'municipality') && activeMunicipality && (
          <MunicipalityDetail
            municipality={activeMunicipality}
            trips={activeMunicipalityTrips}
            homeMunicipalityId={homeMunicipalityId}
            onSetHomeMunicipality={handleSetHomeMunicipality}
            onBack={() => navigateTo(`/departamento/${selectedDepartmentId}`)}
            onSaveTrip={handleSaveTrip}
            onDeleteTrip={handleDeleteTrip}
            onNavigateToReportes={() => navigateTo('/reportes')}
          />
        )}

        {isAuthenticated && (currentRoute === '/recuerdos' || currentRoute === 'recuerdos') && (
          <MemoriesWall
            trips={trips}
            municipalities={municipalities}
            departments={departments}
            onNavigateToMunicipality={handleSelectMunicipality}
            onNavigateToMap={() => navigateTo('/explorador')}
          />
        )}

        {isAuthenticated && (currentRoute === '/reportes' || currentRoute === 'reportes') && (
          <TravelReports
            departments={departments}
            municipalities={municipalities}
            trips={trips}
            homeMunicipalityId={homeMunicipalityId}
            onNavigateToMunicipality={handleSelectMunicipality}
            onNavigateToDepartment={handleSelectDepartment}
            onNavigateToMap={() => navigateTo('/explorador')}
          />
        )}
      </main>

      {/* Full Technical Architecture & Code Deliverables Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      {/* Menú Flotante Desplegable para Tema (Modo Oscuro y Paletas Pastel) */}
      <ThemeFloatingMenu />
    </div>
  );
}
