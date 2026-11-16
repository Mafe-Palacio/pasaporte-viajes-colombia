import { Department, Municipality, TripEntry } from '../types';
import colombiaRawJson from './colombia.json';

// URL oficial de Datos Abiertos Colombia (Socrata API - JSON directo sin API Key)
export const COLOMBIA_API_URL = 'https://www.datos.gov.co/resource/xdk5-pm3f.json?$limit=5000';

// Live working endpoint on datos.gov.co with all 1,122 DIVIPOLA municipalities
export const BACKUP_COLOMBIA_API_URL = 'https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=5000';

export const DEPT_CODE_TO_ID: Record<string, string> = {
  '05': 'antioquia',
  '08': 'atlantico',
  '11': 'bogota',
  '13': 'bolivar',
  '15': 'boyaca',
  '17': 'caldas',
  '18': 'caqueta',
  '19': 'cauca',
  '20': 'cesar',
  '23': 'cordoba',
  '25': 'cundinamarca',
  '27': 'choco',
  '41': 'huila',
  '44': 'la-guajira',
  '47': 'magdalena',
  '50': 'meta',
  '52': 'narino',
  '54': 'norte-de-santander',
  '63': 'quindio',
  '66': 'risaralda',
  '68': 'santander',
  '70': 'sucre',
  '73': 'tolima',
  '76': 'valle-del-cauca',
  '81': 'arauca',
  '85': 'casanare',
  '86': 'putumayo',
  '88': 'san-andres',
  '91': 'amazonas',
  '94': 'guainia',
  '95': 'guaviare',
  '97': 'vaupes',
  '99': 'vichada'
};

export const KNOWN_ID_BY_CODE: Record<string, string> = {
  '63690': 'salento',
  '63272': 'filandia',
  '63001': 'armenia',
  '63190': 'circasia',
  '63470': 'montenegro',
  '63594': 'quimbaya',
  '63130': 'calarca',
  '63401': 'la-tebaida',
  '63302': 'genova',
  '63548': 'pijao',
  '63111': 'buenavista',
  '63212': 'cordoba',
  '05001': 'medellin',
  '05318': 'guatape',
  '05042': 'santa-fe-de-antioquia',
  '05364': 'jardin',
  '05368': 'jerico',
  '05615': 'rionegro',
  '05266': 'el-penol',
  '05674': 'san-rafael',
  '13001': 'cartagena',
  '13468': 'mompox',
  '15407': 'villa-de-leyva',
  '47001': 'santa-marta',
  '68077': 'barichara',
  '68679': 'san-gil',
  '68001': 'bucaramanga',
  '76001': 'cali',
  '76111': 'buga',
  '11001': 'bogota',
  '17001': 'manizales',
  '66001': 'pereira',
  '73001': 'ibague',
  '41001': 'neiva',
  '52001': 'pasto',
  '52356': 'ipiales',
  '25899': 'zipaquira',
  '25307': 'girardot',
  '25175': 'chia'
};

export const DEPARTMENT_NATURAL_REGION: Record<string, string> = {
  antioquia: 'Andina',
  atlantico: 'Caribe',
  bogota: 'Andina',
  bolivar: 'Caribe',
  boyaca: 'Andina',
  caldas: 'Andina',
  caqueta: 'Amazonía',
  cauca: 'Pacífica',
  cesar: 'Caribe',
  cordoba: 'Caribe',
  cundinamarca: 'Andina',
  choco: 'Pacífica',
  huila: 'Andina',
  'la-guajira': 'Caribe',
  magdalena: 'Caribe',
  meta: 'Orinoquía',
  narino: 'Pacífica',
  'norte-de-santander': 'Andina',
  quindio: 'Andina',
  risaralda: 'Andina',
  santander: 'Andina',
  sucre: 'Caribe',
  tolima: 'Andina',
  'valle-del-cauca': 'Pacífica',
  arauca: 'Orinoquía',
  casanare: 'Orinoquía',
  putumayo: 'Amazonía',
  'san-andres': 'Insular',
  amazonas: 'Amazonía',
  guainia: 'Amazonía',
  guaviare: 'Amazonía',
  vaupes: 'Amazonía',
  vichada: 'Orinoquía'
};

export const CURATED_MUNICIPALITY_METADATA: Record<string, { description: string; tags: string[] }> = {
  'salento': {
    description: 'Valle de Cocora, palmas de cera gigantes y arquitectura colonial de bahareque.',
    tags: ['Palmas de Cera', 'Café', 'Valle de Cocora', 'Trucha al Ajillo']
  },
  'filandia': {
    description: 'Mirador Colina Iluminada, artesanías de bejuco y balcones multicolores.',
    tags: ['Mirador', 'Cestería', 'Mirador Iluminado', 'Artesanías']
  },
  'armenia': {
    description: 'Capital del Quindío, corazón de la cultura cafetera y museo del oro Quimbaya.',
    tags: ['Capital', 'Museo del Oro', 'Parque de la Vida', 'Cultura Cafetera']
  },
  'circasia': {
    description: 'Pueblo libre con su histórico Cementerio Libre y miradores hacia la cordillera central.',
    tags: ['Cementerio Libre', 'Miradores', 'Café Cordillerano']
  },
  'montenegro': {
    description: 'Cuna del Parque Nacional del Café y senderos entre cafetales ondulantes.',
    tags: ['Parque del Café', 'Montaña Rusa', 'Senderismo']
  },
  'quimbaya': {
    description: 'Famoso por el Festival de Velas y Faroles y experiencias de agroturismo en Panaca.',
    tags: ['Panaca', 'Alumbrado', 'Velas y Faroles']
  },
  'calarca': {
    description: 'Jardín Botánico del Quindío con mariposario y desfile del Yipao tradicional.',
    tags: ['Mariposario', 'Jardín Botánico', 'Yipao']
  },
  'la-tebaida': {
    description: 'El edén tropical del Quindío con clima cálido y paseos a orillas del río La Vieja.',
    tags: ['Clima Cálido', 'Río La Vieja', 'Paseo en Balsa']
  },
  'genova': {
    description: 'El rincón bello del Quindío, pueblo Slow City con arquitectura intacta y cañones de niebla.',
    tags: ['Slow City', 'Páramo', 'Cascadas']
  },
  'pijao': {
    description: 'Primera Ciudad sin Prisa de América Latina, arquitectura de bahareque y cuna de café especial.',
    tags: ['Cittaslow', 'Bahareque', 'Café Especial']
  },
  'buenavista': {
    description: 'Mirador natural sobre el valle y plataforma ideal para vuelos en parapente.',
    tags: ['Parapente', 'Mirador', 'Café San Alberto']
  },
  'cordoba': {
    description: 'Capital del bambú y la guadua, cascadas ocultas y paisajes boscosos vírgenes.',
    tags: ['Guadua', 'Cascada de Río Verde', 'Naturaleza']
  },
  'medellin': {
    description: 'La Ciudad de la Eterna Primavera, Comuna 13, Metrocable y Parque Arví.',
    tags: ['Innovación', 'Metrocable', 'Flores', 'Arte']
  },
  'guatape': {
    description: 'El pueblo de los zócalos coloridos y el imponente monolito de la Piedra del Peñol.',
    tags: ['Piedra del Peñol', 'Embalse', 'Zócalos']
  },
  'santa-fe-de-antioquia': {
    description: 'Pueblo Patrimonio colonial con calles empedradas y el monumental Puente de Occidente.',
    tags: ['Puente de Occidente', 'Patrimonio', 'Clima Cálido']
  },
  'jardin': {
    description: 'Plaza de sillas pintadas a mano, Basílica Menor y cueva del esplendor.',
    tags: ['Cafeterías de plaza', 'Flores', 'Cascadas']
  },
  'jerico': {
    description: 'Cuna de la Santa Laura Montoya y capital del auténtico carriel antioqueño.',
    tags: ['Carriel', 'Santa Laura', 'Mirador Cristo Redentor']
  },
  'cartagena': {
    description: 'La Ciudad Amurallada, Castillo de San Felipe y atardeceres sobre el Mar Caribe.',
    tags: ['Ciudad Amurallada', 'Caribe', 'Patrimonio UNESCO', 'Historia']
  },
  'santa-marta': {
    description: 'Bahía más linda de América, Parque Tayrona y Ciudad Perdida.',
    tags: ['Tayrona', 'Playas', 'Sierra Nevada']
  },
  'barichara': {
    description: 'El pueblo más lindo de Colombia, tallado en piedra amarilla con tapia pisada.',
    tags: ['Pueblo Patrimonio', 'Tapia Pisada', 'Camino Real']
  },
  'villa-de-leyva': {
    description: 'Monumental plaza mayor empedrada, fósiles prehistóricos y viñedos de altura.',
    tags: ['Plaza Mayor', 'Fósiles', 'Pueblo Patrimonio']
  },
  'bogota': {
    description: 'Distrito Capital de Colombia. Cerro de Monserrate, La Candelaria y vibrante escena cultural.',
    tags: ['Distrito Capital', 'Monserrate', 'La Candelaria', 'Museo del Oro']
  }
};

export const COLOMBIA_DEPARTMENTS: Department[] = [
  {
    id: 'antioquia',
    code: '05',
    name: 'Antioquia',
    capital: 'Medellín',
    latitude: 6.5367,
    longitude: -75.5906,
    totalMunicipalities: 125,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Tierra de montañas, café, arquitectura colonial y paisajes verdes majestuosos.'
  },
  {
    id: 'quindio',
    code: '63',
    name: 'Quindío',
    capital: 'Armenia',
    latitude: 4.4614,
    longitude: -75.6674,
    totalMunicipalities: 12,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Corazón del Eje Cafetero con el Valle de Cocora y pueblos multicolores.'
  },
  {
    id: 'cundinamarca',
    code: '25',
    name: 'Cundinamarca',
    capital: 'Bogotá',
    latitude: 4.7110,
    longitude: -74.0721,
    totalMunicipalities: 116,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Sabana andina, catedrales de sal y páramos de frailejones.'
  },
  {
    id: 'santander',
    code: '68',
    name: 'Santander',
    capital: 'Bucaramanga',
    latitude: 6.6437,
    longitude: -73.2205,
    totalMunicipalities: 87,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Cañón del Chicamocha, calles empedradas de Barichara y deportes extremos.'
  },
  {
    id: 'bolivar',
    code: '13',
    name: 'Bolívar',
    capital: 'Cartagena',
    latitude: 8.6705,
    longitude: -74.0298,
    totalMunicipalities: 46,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'La Heroica Cartagena de Indias, el río Magdalena y ciénagas costeras.'
  },
  {
    id: 'magdalena',
    code: '47',
    name: 'Magdalena',
    capital: 'Santa Marta',
    latitude: 10.4113,
    longitude: -74.4057,
    totalMunicipalities: 30,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Sierra Nevada de Santa Marta y bahías de ensueño del Parque Tayrona.'
  },
  {
    id: 'valle-del-cauca',
    code: '76',
    name: 'Valle del Cauca',
    capital: 'Cali',
    latitude: 3.8643,
    longitude: -76.5320,
    totalMunicipalities: 42,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Cañaverales, sabor a salsa en Cali y ballenas en el Pacífico.'
  },
  {
    id: 'boyaca',
    code: '15',
    name: 'Boyacá',
    capital: 'Tunja',
    latitude: 5.4545,
    longitude: -73.3620,
    totalMunicipalities: 123,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Laguna de Tota, Villa de Leyva y ruana boyacense bajo cielos estrellados.'
  },
  {
    id: 'narino',
    code: '52',
    name: 'Nariño',
    capital: 'Pasto',
    latitude: 1.2891,
    longitude: -77.3579,
    totalMunicipalities: 64,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Santuario de Las Lajas, Laguna de La Cocha y Carnaval de Negros y Blancos.'
  },
  {
    id: 'caldas',
    code: '17',
    name: 'Caldas',
    capital: 'Manizales',
    latitude: 5.3000,
    longitude: -75.4000,
    totalMunicipalities: 27,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Nevado del Ruiz, termales calientes y cafetales de altura.'
  },
  {
    id: 'risaralda',
    code: '66',
    name: 'Risaralda',
    capital: 'Pereira',
    latitude: 4.8133,
    longitude: -75.6961,
    totalMunicipalities: 14,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Santuario Otún Quimbaya y hermosas fincas tradicionales.'
  },
  {
    id: 'tolima',
    code: '73',
    name: 'Tolima',
    capital: 'Ibagué',
    latitude: 4.0925,
    longitude: -75.1545,
    totalMunicipalities: 47,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Lechona tolimense, Desierto de la Tatacoita y cañones verdes.'
  },
  {
    id: 'huila',
    code: '41',
    name: 'Huila',
    capital: 'Neiva',
    latitude: 2.5359,
    longitude: -75.5277,
    totalMunicipalities: 37,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Desierto de la Tatacoa y Parque Arqueológico de San Agustín.'
  },
  {
    id: 'cauca',
    code: '19',
    name: 'Cauca',
    capital: 'Popayán',
    latitude: 2.4448,
    longitude: -76.6147,
    totalMunicipalities: 42,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'La Ciudad Blanca de Popayán, Parque Nacional Puracé y ricas tradiciones culinarias.'
  },
  {
    id: 'atlantico',
    code: '08',
    name: 'Atlántico',
    capital: 'Barranquilla',
    latitude: 10.9685,
    longitude: -74.7813,
    totalMunicipalities: 23,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Carnaval de Barranquilla, Bocas de Ceniza y brisa del Caribe.'
  },
  {
    id: 'la-guajira',
    code: '44',
    name: 'La Guajira',
    capital: 'Riohacha',
    latitude: 11.5444,
    longitude: -72.9072,
    totalMunicipalities: 15,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Cabo de la Vela, dunas doradas de Taroa y cultura ancestral Wayúu.'
  },
  {
    id: 'cesar',
    code: '20',
    name: 'Cesar',
    capital: 'Valledupar',
    latitude: 10.4631,
    longitude: -73.2532,
    totalMunicipalities: 25,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Cuna del Festival de la Leyenda Vallenata y río Guatapurí.'
  },
  {
    id: 'cordoba',
    code: '23',
    name: 'Córdoba',
    capital: 'Montería',
    latitude: 8.7479,
    longitude: -75.8814,
    totalMunicipalities: 30,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Ronda del Sinú, sombrero vueltiao y ganaderías sabaneras.'
  },
  {
    id: 'sucre',
    code: '70',
    name: 'Sucre',
    capital: 'Sincelejo',
    latitude: 9.3047,
    longitude: -75.3978,
    totalMunicipalities: 26,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Golfo de Morrosquillo, playas de Tolú y Coveñas y festivales de fandango.'
  },
  {
    id: 'meta',
    code: '50',
    name: 'Meta',
    capital: 'Villavicencio',
    latitude: 4.1420,
    longitude: -73.6266,
    totalMunicipalities: 29,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Caño Cristales, el río de los siete colores, y cultura llanera.'
  },
  {
    id: 'casanare',
    code: '85',
    name: 'Casanare',
    capital: 'Yopal',
    latitude: 5.3378,
    longitude: -71.7456,
    totalMunicipalities: 19,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Safaris llaneros, esteros y atardeceres de fuego.'
  },
  {
    id: 'arauca',
    code: '81',
    name: 'Arauca',
    capital: 'Arauca',
    latitude: 6.7456,
    longitude: -70.7234,
    totalMunicipalities: 7,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Llanura infinita sobre la frontera con cantos de vaquería.'
  },
  {
    id: 'norte-de-santander',
    code: '54',
    name: 'Norte de Santander',
    capital: 'Cúcuta',
    latitude: 7.9463,
    longitude: -72.8988,
    totalMunicipalities: 40,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Pamplona colonial y la hermosa cordillera nororiental.'
  },
  {
    id: 'choco',
    code: '27',
    name: 'Chocó',
    capital: 'Quibdó',
    latitude: 5.6983,
    longitude: -76.6583,
    totalMunicipalities: 31,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Biodiversidad exuberante, selva tropical húmeda y playas vírgenes en Nuquí.'
  },
  {
    id: 'putumayo',
    code: '86',
    name: 'Putumayo',
    capital: 'Mocoa',
    latitude: 0.7264,
    longitude: -76.5197,
    totalMunicipalities: 13,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Cascadas del Fin del Mundo y transición andino-amazónica.'
  },
  {
    id: 'caqueta',
    code: '18',
    name: 'Caquetá',
    capital: 'Florencia',
    latitude: 1.1601,
    longitude: -74.4590,
    totalMunicipalities: 16,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Puerta de oro de la Amazonía colombiana.'
  },
  {
    id: 'guaviare',
    code: '95',
    name: 'Guaviare',
    capital: 'San José del Guaviare',
    latitude: 2.1284,
    longitude: -72.2476,
    totalMunicipalities: 4,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Pinturas rupestres de Cerro Azul y tepuyes de la serranía.'
  },
  {
    id: 'guainia',
    code: '94',
    name: 'Guainía',
    capital: 'Inírida',
    latitude: 2.5854,
    longitude: -68.5247,
    totalMunicipalities: 8,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Cerros de Mavecure alzándose sobre ríos oscuros.'
  },
  {
    id: 'vaupes',
    code: '97',
    name: 'Vaupés',
    capital: 'Mitú',
    latitude: 1.0504,
    longitude: -70.7617,
    totalMunicipalities: 6,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Cuna de etnias indígenas amazónicas y raudales majestuosos.'
  },
  {
    id: 'vichada',
    code: '99',
    name: 'Vichada',
    capital: 'Puerto Carreño',
    latitude: 4.4237,
    longitude: -69.2877,
    totalMunicipalities: 4,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Parque Nacional Natural El Tuparro sobre el río Orinoco.'
  },
  {
    id: 'amazonas',
    code: '91',
    name: 'Amazonas',
    capital: 'Leticia',
    latitude: -1.4429,
    longitude: -71.5724,
    totalMunicipalities: 11,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Pulmón verde del planeta, delfines rosados y selva profunda en Leticia.'
  },
  {
    id: 'san-andres',
    code: '88',
    name: 'San Andrés y Providencia',
    capital: 'San Andrés',
    latitude: 12.5847,
    longitude: -81.7006,
    totalMunicipalities: 2,
    visitedMunicipalities: 0,
    isVisited: false,
    progressPercentage: 0,
    description: 'Mar de los siete colores, Cayo Cangrejo y barreras coralinas caribeñas.'
  }
];

export function formatMunicipalityName(rawName: string): string {
  if (!rawName) return '';
  return rawName
    .trim()
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en'].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function normalizeComparisonText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDepartmentCapital(municipalityName: string, departmentCapital?: string): boolean {
  if (!municipalityName || !departmentCapital) return false;
  const normMuni = normalizeComparisonText(municipalityName);
  const normCap = normalizeComparisonText(departmentCapital);
  if (!normMuni || !normCap) return false;

  if (normMuni === normCap) return true;
  if (normCap === 'cucuta' && normMuni === 'san jose de cucuta') return true;
  if (normCap === 'cali' && normMuni === 'santiago de cali') return true;
  if (normCap === 'cartagena' && normMuni === 'cartagena de indias') return true;
  if (normCap === 'bogota' && normMuni.startsWith('bogota')) return true;
  return false;
}

export function normalizeDivipolaRecord(item: any): Municipality {
  const deptCode = String(item.c_digo_dane_del_departamento || item.cod_dpto || '').padStart(2, '0');
  const muniCode = String(item.c_digo_dane_del_municipio || item.cod_mpio || '').padStart(5, '0');
  const deptId = DEPT_CODE_TO_ID[deptCode] || deptCode;
  
  const rawName = item.municipio || item.nom_mpio || 'Municipio';
  const name = formatMunicipalityName(rawName);

  const matchedDept = COLOMBIA_DEPARTMENTS.find((d) => d.id === deptId || d.code === deptCode);
  const deptName = matchedDept ? matchedDept.name : (item.departamento || item.dpto || 'Colombia');

  const lat = item.latitud ? parseFloat(String(item.latitud).replace(',', '.')) : (matchedDept?.latitude || 4.5);
  const lng = item.longitud ? parseFloat(String(item.longitud).replace(',', '.')) : (matchedDept?.longitude || -74.5);

  const friendlyId = KNOWN_ID_BY_CODE[muniCode] || muniCode;
  const curated = CURATED_MUNICIPALITY_METADATA[friendlyId];

  let tags: string[];
  if (curated?.tags) {
    tags = curated.tags;
  } else {
    const derivedTags: string[] = [];
    if (isDepartmentCapital(name, matchedDept?.capital)) {
      derivedTags.push('Capital');
    }
    const region = DEPARTMENT_NATURAL_REGION[deptId];
    if (region) {
      derivedTags.push(region);
    }
    tags = derivedTags.slice(0, 2);
  }

  return {
    id: friendlyId,
    code: muniCode,
    departmentId: deptId,
    departmentName: deptName,
    name: name,
    latitude: Number(lat.toFixed(5)),
    longitude: Number(lng.toFixed(5)),
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
    isVisited: false,
    trips: [],
    coverPhoto: '',
    description: curated?.description || '',
    tags
  };
}

// Full combined municipalities mock constructed directly from the complete DIVIPOLA dataset (1,122 municipalities)
export const MUNICIPALITIES_MOCK: Municipality[] = (colombiaRawJson as any[]).map(normalizeDivipolaRecord);

// Aliases for flat array access
export const DEPARTMENTS_MOCK: Department[] = COLOMBIA_DEPARTMENTS;

// User starts with empty trips array; real user visits and expenses populate this state
export const TRIPS_MOCK: TripEntry[] = [];

// Function to safely retrieve municipalities for any department
export function getMunicipalitiesForDepartment(departmentId: string): Municipality[] {
  const norm = departmentId.toLowerCase();
  if (norm === 'cundinamarca' || norm === '25') {
    return MUNICIPALITIES_MOCK.filter((m) => m.departmentId === 'cundinamarca');
  }
  return MUNICIPALITIES_MOCK.filter(
    (m) => m.departmentId === norm || m.code?.startsWith(norm)
  );
}

// Fetch official DIVIPOLA dataset dynamically with fallbacks
export async function fetchColombiaGeoData(
  existingMunicipalities?: Municipality[]
): Promise<{ departments: Department[]; municipalities: Municipality[] }> {
  let rawList: any[] = [];
  
  // 1. Try official user-specified Socrata endpoint
  try {
    const res = await fetch(COLOMBIA_API_URL);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 500) {
        rawList = data;
      }
    }
  } catch (err) {
    console.warn('Official DIVIPOLA endpoint xdk5-pm3f unavailable, attempting backup endpoint.', err);
  }

  // 2. Try active working backup endpoint on datos.gov.co
  if (rawList.length === 0) {
    try {
      const res = await fetch(BACKUP_COLOMBIA_API_URL);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 500) {
          rawList = data;
        }
      }
    } catch (err) {
      console.warn('Backup DIVIPOLA endpoint gdxc-w37w unavailable, falling back to local dataset.', err);
    }
  }

  // 3. Fallback to local colombia.json
  if (rawList.length === 0) {
    rawList = colombiaRawJson as any[];
  }

  const existingMap = new Map<string, Municipality>();
  if (existingMunicipalities && existingMunicipalities.length > 0) {
    existingMunicipalities.forEach((m) => {
      existingMap.set(m.id, m);
      if (m.code) existingMap.set(m.code, m);
    });
  }

  const normalizedMunicipalities: Municipality[] = rawList.map((item) => {
    const muni = normalizeDivipolaRecord(item);
    const existing = existingMap.get(muni.id) || (muni.code ? existingMap.get(muni.code) : undefined);
    if (existing) {
      muni.isVisited = existing.isVisited;
      muni.trips = existing.trips || [];
    }
    return muni;
  });

  // Calculate updated department counts
  const updatedDepartments: Department[] = COLOMBIA_DEPARTMENTS.map((dept) => {
    const munisInDept = normalizedMunicipalities.filter((m) => m.departmentId === dept.id);
    const visitedInDept = munisInDept.filter((m) => m.isVisited).length;
    const totalInDept = munisInDept.length || dept.totalMunicipalities;
    const progress = totalInDept > 0 ? Math.round((visitedInDept / totalInDept) * 100) : 0;

    return {
      ...dept,
      totalMunicipalities: totalInDept,
      visitedMunicipalities: visitedInDept,
      isVisited: visitedInDept > 0,
      progressPercentage: progress
    };
  });

  return {
    departments: updatedDepartments,
    municipalities: normalizedMunicipalities
  };
}
