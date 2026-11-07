import type { FeatureCollection, Geometry } from 'geojson';

// Simplified GeoJSON representing Colombian departments for fast vector rendering
export const COLOMBIA_GEOJSON: FeatureCollection<Geometry, { id: string; name: string; visited: boolean; progress: number }> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'antioquia', name: 'Antioquia', visited: true, progress: 22 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-76.8, 8.8], [-76.4, 8.9], [-75.8, 8.5], [-75.2, 8.3], [-74.8, 7.8],
          [-74.4, 7.5], [-74.1, 7.0], [-74.5, 6.3], [-75.0, 5.8], [-75.4, 5.5],
          [-75.9, 5.5], [-76.2, 5.9], [-76.6, 6.3], [-77.0, 7.2], [-76.8, 8.8]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'quindio', name: 'Quindío', visited: true, progress: 67 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.85, 4.70], [-75.50, 4.72], [-75.45, 4.45], [-75.55, 4.22],
          [-75.88, 4.25], [-75.92, 4.55], [-75.85, 4.70]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'cundinamarca', name: 'Cundinamarca', visited: true, progress: 16 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-74.9, 5.8], [-74.2, 5.7], [-73.5, 5.2], [-73.6, 4.5], [-74.0, 4.0],
          [-74.6, 4.1], [-74.9, 4.7], [-74.9, 5.8]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'santander', name: 'Santander', visited: true, progress: 16 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-74.3, 7.5], [-73.4, 7.8], [-72.8, 7.2], [-72.6, 6.5], [-73.2, 5.8],
          [-73.8, 5.9], [-74.2, 6.7], [-74.3, 7.5]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'boyaca', name: 'Boyacá', visited: true, progress: 12 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-74.2, 5.7], [-73.8, 6.9], [-72.4, 7.1], [-72.0, 6.2], [-72.5, 5.2],
          [-73.5, 5.2], [-74.2, 5.7]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'tolima', name: 'Tolima', visited: true, progress: 13 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.4, 5.3], [-74.7, 5.2], [-74.5, 4.1], [-74.8, 3.2], [-75.6, 3.3],
          [-75.9, 4.2], [-75.4, 5.3]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'caldas', name: 'Caldas', visited: true, progress: 26 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.8, 5.7], [-75.1, 5.8], [-74.8, 5.3], [-75.3, 5.0], [-75.8, 5.7]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'risaralda', name: 'Risaralda', visited: true, progress: 36 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-76.2, 5.5], [-75.7, 5.5], [-75.6, 4.8], [-76.1, 4.9], [-76.2, 5.5]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'valle-del-cauca', name: 'Valle del Cauca', visited: true, progress: 26 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-77.5, 4.8], [-76.0, 5.0], [-75.8, 4.1], [-76.2, 3.2], [-77.3, 3.3], [-77.5, 4.8]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'bolivar', name: 'Bolívar', visited: true, progress: 20 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.6, 10.8], [-74.8, 10.4], [-74.2, 9.4], [-73.8, 8.2], [-74.5, 7.3],
          [-75.1, 8.3], [-75.6, 10.8]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'magdalena', name: 'Magdalena', visited: true, progress: 20 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-74.9, 11.3], [-73.8, 11.3], [-73.5, 10.2], [-74.1, 9.1], [-74.8, 10.2], [-74.9, 11.3]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'la-guajira', name: 'La Guajira', visited: true, progress: 20 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-73.5, 12.4], [-71.2, 12.4], [-71.5, 11.6], [-72.8, 10.8], [-73.5, 11.4], [-73.5, 12.4]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'meta', name: 'Meta', visited: true, progress: 14 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-74.2, 4.6], [-71.5, 4.6], [-71.2, 3.1], [-72.8, 2.0], [-74.4, 2.3], [-74.2, 4.6]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'huila', name: 'Huila', visited: true, progress: 14 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.6, 3.6], [-74.6, 3.4], [-75.2, 2.1], [-76.4, 1.8], [-76.4, 2.5], [-75.6, 3.6]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'cauca', name: 'Cauca', visited: true, progress: 7 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-77.7, 3.2], [-76.2, 3.2], [-75.9, 2.2], [-76.8, 1.5], [-77.6, 1.8], [-77.7, 3.2]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'narino', name: 'Nariño', visited: true, progress: 6 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-78.8, 2.2], [-77.3, 2.2], [-76.9, 0.8], [-78.0, 0.7], [-78.8, 2.2]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'choco', name: 'Chocó', visited: true, progress: 6 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-77.8, 8.4], [-76.8, 8.2], [-76.5, 6.2], [-76.3, 4.8], [-77.5, 4.2], [-77.8, 8.4]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'amazonas', name: 'Amazonas', visited: true, progress: 50 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-73.5, 0.0], [-69.8, -1.0], [-70.0, -4.2], [-71.5, -4.2], [-72.5, -2.5], [-73.5, 0.0]
        ]]
      }
    }
  ]
};

// Municipal boundaries for Quindío and Antioquia
export const QUINDIO_MUNICIPALITIES_GEOJSON: FeatureCollection<Geometry, { id: string; name: string; visited: boolean }> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'salento', name: 'Salento', visited: true },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.68, 4.73], [-75.45, 4.73], [-75.44, 4.58], [-75.62, 4.58], [-75.68, 4.73]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'filandia', name: 'Filandia', visited: true },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.74, 4.74], [-75.62, 4.74], [-75.62, 4.63], [-75.74, 4.63], [-75.74, 4.74]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'circasia', name: 'Circasia', visited: true },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.68, 4.65], [-75.59, 4.65], [-75.59, 4.58], [-75.68, 4.58], [-75.68, 4.65]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'armenia', name: 'Armenia', visited: true },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.74, 4.58], [-75.63, 4.58], [-75.63, 4.49], [-75.74, 4.49], [-75.74, 4.58]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'calarca', name: 'Calarcá', visited: true },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.63, 4.58], [-75.48, 4.58], [-75.52, 4.45], [-75.63, 4.45], [-75.63, 4.58]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'montenegro', name: 'Montenegro', visited: true },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.82, 4.62], [-75.71, 4.62], [-75.71, 4.53], [-75.82, 4.53], [-75.82, 4.62]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'quimbaya', name: 'Quimbaya', visited: true },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.86, 4.68], [-75.74, 4.68], [-75.74, 4.58], [-75.86, 4.58], [-75.86, 4.68]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'la-tebaida', name: 'La Tebaida', visited: false },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.86, 4.52], [-75.74, 4.52], [-75.74, 4.41], [-75.86, 4.41], [-75.86, 4.52]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'pijao', name: 'Pijao', visited: true },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.76, 4.41], [-75.62, 4.41], [-75.62, 4.29], [-75.76, 4.29], [-75.76, 4.41]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'buenavista', name: 'Buenavista', visited: false },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.79, 4.41], [-75.72, 4.41], [-75.72, 4.32], [-75.79, 4.32], [-75.79, 4.41]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'cordoba-q', name: 'Córdoba', visited: false },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.72, 4.43], [-75.62, 4.43], [-75.62, 4.35], [-75.72, 4.35], [-75.72, 4.43]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'genova', name: 'Génova', visited: false },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.85, 4.30], [-75.68, 4.30], [-75.68, 4.18], [-75.85, 4.18], [-75.85, 4.30]
        ]]
      }
    }
  ]
};

// Antioquia Municipalities GeoJSON
export const ANTIOQUIA_MUNICIPALITIES_GEOJSON: FeatureCollection<Geometry, { id: string; name: string; visited: boolean }> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'medellin', name: 'Medellín', visited: true },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.68, 6.35], [-75.48, 6.35], [-75.48, 6.15], [-75.68, 6.15], [-75.68, 6.35]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'guatape', name: 'Guatapé', visited: true },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.25, 6.32], [-75.05, 6.32], [-75.05, 6.18], [-75.25, 6.18], [-75.25, 6.32]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'santa-fe-de-antioquia', name: 'Santa Fe de Antioquia', visited: true },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.92, 6.64], [-75.72, 6.64], [-75.72, 6.45], [-75.92, 6.45], [-75.92, 6.64]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'jardin', name: 'Jardín', visited: true },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.92, 5.68], [-75.72, 5.68], [-75.72, 5.50], [-75.92, 5.50], [-75.92, 5.68]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'jerico', name: 'Jericó', visited: true },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.88, 5.89], [-75.70, 5.89], [-75.70, 5.72], [-75.88, 5.72], [-75.88, 5.89]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'rionegro', name: 'Rionegro', visited: true },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.45, 6.22], [-75.28, 6.22], [-75.28, 6.08], [-75.45, 6.08], [-75.45, 6.22]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'tamesis', name: 'Támesis', visited: false },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.78, 5.75], [-75.64, 5.75], [-75.64, 5.58], [-75.78, 5.58], [-75.78, 5.75]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'urrao', name: 'Urrao', visited: false },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-76.25, 6.45], [-76.00, 6.45], [-76.00, 6.18], [-76.25, 6.18], [-76.25, 6.45]
        ]]
      }
    }
  ]
};
