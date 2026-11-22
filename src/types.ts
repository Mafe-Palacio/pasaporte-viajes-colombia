export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Department {
  id: string;
  code: string; // DIVIPOLA
  name: string;
  capital: string;
  latitude: number;
  longitude: number;
  totalMunicipalities: number;
  visitedMunicipalities: number;
  isVisited: boolean;
  progressPercentage: number;
  description: string;
  geoJsonCoordinates?: [number, number][][]; // Simplified polygon
}

export interface Municipality {
  id: string;
  code: string; // DIVIPOLA
  departmentId: string;
  departmentName: string;
  name: string;
  latitude: number;
  longitude: number;
  lat?: number;
  lng?: number;
  isVisited: boolean;
  isHome?: boolean;
  trips?: TripEntry[];
  coverPhoto?: string;
  description?: string;
  tags?: string[];
  geoJsonCoordinates?: [number, number][][];
}

export interface ExpenseLog {
  id: string;
  tripEntryId: string;
  category: string;
  amountCop: number;
  date: string;
  notes: string;
}

export interface TripPhoto {
  id: string;
  tripEntryId: string;
  url: string;
  caption?: string;
  uploadedAt: string;
}

export interface TripTransport {
  roadCondition: string; // 'Excelente' | 'Buena' | 'Regular' | 'Mala/Destapada'
  tollCount: number;
  hasTolls?: boolean;
  transportMode: string; // 'Carro propio' | 'Moto' | 'Autobús' | 'Avión' | 'Bicicleta' | etc.
  notes: string;
}

export interface TripEntry {
  id: string;
  municipalityId: string;
  municipalityName: string;
  departmentName: string;
  userId: string;
  tripDate: string; // e.g. "10/Jul/2024"
  label: string; // e.g. "Visita 1"
  isHomeTrip?: boolean;
  rating: number; // 1-5
  summary: string;
  foodReview: string;
  favoriteDish?: string;
  transportNotes: string;
  roadCondition?: string;
  hasTolls?: boolean;
  tollCount?: number;
  transportMode?: string;
  transport?: TripTransport;
  doNotForgetNotes: string;
  climateFeeling?: 'caliente' | 'templado' | 'frio' | 'paramo' | '';
  climateNotes?: string;
  expenses: ExpenseLog[];
  photos: TripPhoto[];
}
