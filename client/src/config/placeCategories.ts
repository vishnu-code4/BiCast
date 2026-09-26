// ============================================================
// BiCAST Place Categories Configuration (Client)
// Centralized, extensible metadata for 14 rider-relevant categories
// ============================================================

export type PlaceCategoryId =
  | 'fuel'
  | 'ev_charging'
  | 'restaurant'
  | 'cafe'
  | 'hotel'
  | 'hospital'
  | 'motorcycle_service'
  | 'tyre_repair'
  | 'atm'
  | 'restroom'
  | 'parking'
  | 'tourist_attraction'
  | 'pharmacy'
  | 'convenience_store';

export interface PlaceCategoryConfig {
  id: PlaceCategoryId;
  displayName: string;
  shortName: string;
  icon: string;
  defaultRadiusMeters: number;
  isRoutePrimary: boolean;
  importanceWeight: number;
  description: string;
}

export const PLACE_CATEGORIES: Record<PlaceCategoryId, PlaceCategoryConfig> = {
  fuel: {
    id: 'fuel',
    displayName: 'Petrol Pumps / Fuel Stations',
    shortName: 'Fuel',
    icon: '⛽',
    defaultRadiusMeters: 5000,
    isRoutePrimary: true,
    importanceWeight: 9,
    description: 'Highway petrol pumps and fuel stations',
  },
  ev_charging: {
    id: 'ev_charging',
    displayName: 'EV Charging Stations',
    shortName: 'EV Charge',
    icon: '⚡',
    defaultRadiusMeters: 5000,
    isRoutePrimary: true,
    importanceWeight: 8,
    description: 'Electric vehicle charging points',
  },
  restaurant: {
    id: 'restaurant',
    displayName: 'Restaurants & Dhabas',
    shortName: 'Food',
    icon: '🍴',
    defaultRadiusMeters: 4000,
    isRoutePrimary: true,
    importanceWeight: 7,
    description: 'Highway restaurants, dhabas, and meal stops',
  },
  cafe: {
    id: 'cafe',
    displayName: 'Cafes & Coffee Stops',
    shortName: 'Cafe',
    icon: '☕',
    defaultRadiusMeters: 3000,
    isRoutePrimary: true,
    importanceWeight: 6,
    description: 'Coffee shops, tea stalls, and quick beverage stops',
  },
  hotel: {
    id: 'hotel',
    displayName: 'Hotels & Lodging',
    shortName: 'Hotels',
    icon: '🏨',
    defaultRadiusMeters: 5000,
    isRoutePrimary: true,
    importanceWeight: 6,
    description: 'Hotels, motels, and overnight stays along route',
  },
  hospital: {
    id: 'hospital',
    displayName: 'Hospitals & Medical Centres',
    shortName: 'Hospital',
    icon: '🏥',
    defaultRadiusMeters: 6000,
    isRoutePrimary: true,
    importanceWeight: 10,
    description: 'Hospitals, emergency medical services, and clinics',
  },
  motorcycle_service: {
    id: 'motorcycle_service',
    displayName: 'Bike Service & Mechanics',
    shortName: 'Bike Service',
    icon: '🔧',
    defaultRadiusMeters: 5000,
    isRoutePrimary: true,
    importanceWeight: 8,
    description: 'Motorcycle mechanics, workshops, and repair centres',
  },
  tyre_repair: {
    id: 'tyre_repair',
    displayName: 'Tyre Repair & Puncture Shops',
    shortName: 'Tyres',
    icon: '🛞',
    defaultRadiusMeters: 4000,
    isRoutePrimary: true,
    importanceWeight: 8,
    description: 'Puncture repair and tyre pressure service',
  },
  atm: {
    id: 'atm',
    displayName: 'ATMs & Cash Points',
    shortName: 'ATM',
    icon: '🏧',
    defaultRadiusMeters: 3000,
    isRoutePrimary: true,
    importanceWeight: 5,
    description: 'ATMs and bank cash dispensers',
  },
  restroom: {
    id: 'restroom',
    displayName: 'Restrooms & Rest Areas',
    shortName: 'Restroom',
    icon: '🚻',
    defaultRadiusMeters: 4000,
    isRoutePrimary: true,
    importanceWeight: 6,
    description: 'Public restrooms and highway wayside rest stops',
  },
  parking: {
    id: 'parking',
    displayName: 'Parking Areas',
    shortName: 'Parking',
    icon: '🅿',
    defaultRadiusMeters: 3000,
    isRoutePrimary: false,
    importanceWeight: 4,
    description: 'Designated vehicle parking lots',
  },
  tourist_attraction: {
    id: 'tourist_attraction',
    displayName: 'Attractions & Viewpoints',
    shortName: 'Attraction',
    icon: '📍',
    defaultRadiusMeters: 5000,
    isRoutePrimary: false,
    importanceWeight: 5,
    description: 'Scenic viewpoints, monuments, and points of interest',
  },
  pharmacy: {
    id: 'pharmacy',
    displayName: 'Pharmacies & Chemists',
    shortName: 'Pharmacy',
    icon: '💊',
    defaultRadiusMeters: 3000,
    isRoutePrimary: true,
    importanceWeight: 7,
    description: 'Medical stores, pharmacies, and first-aid supplies',
  },
  convenience_store: {
    id: 'convenience_store',
    displayName: 'Convenience Stores & Snacks',
    shortName: 'Store',
    icon: '🏪',
    defaultRadiusMeters: 3000,
    isRoutePrimary: false,
    importanceWeight: 4,
    description: 'General stores for water, snacks, and travel essentials',
  },
};

export const ALL_PLACE_CATEGORIES = Object.values(PLACE_CATEGORIES);

export const ROUTE_PRIMARY_CATEGORIES = ALL_PLACE_CATEGORIES.filter((c) => c.isRoutePrimary);

export function getCategoryConfig(id: string): PlaceCategoryConfig | undefined {
  const normalized = id.toLowerCase().trim();
  if (normalized === 'attraction') return PLACE_CATEGORIES.tourist_attraction;
  if (normalized === 'rest_area') return PLACE_CATEGORIES.restroom;
  return PLACE_CATEGORIES[normalized as PlaceCategoryId];
}
