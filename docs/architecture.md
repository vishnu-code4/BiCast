# BiCAST System Architecture

## Overview

BiCAST (Route-Based Weather Intelligence and Alert System for Motorcycle Riders) is a full-stack web application that combines route planning with time-accurate weather forecasting at dynamically generated checkpoints.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          React Frontend (Vite + TypeScript)          │   │
│  │                                                     │   │
│  │  Pages: Home | Plan Trip | Trip History             │   │
│  │  Components: Map (Leaflet) | Weather Cards | Alerts  │   │
│  │  State: TanStack Query (server state cache)          │   │
│  │  Routing: React Router v6                            │   │
│  └────────────────────┬────────────────────────────────┘   │
└───────────────────────│─────────────────────────────────────┘
                        │ HTTP (proxied /api/*)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│               Express API Server (Node.js + TS)             │
│                                                             │
│  Routes: /api/health | /api/routing | /api/weather          │
│          /api/geocoding | /api/trips | /api/places          │
│                                                             │
│  Controllers → Services → Providers                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Provider Abstraction Layer              │  │
│  │                                                      │  │
│  │  RoutingProvider   → OsrmRoutingProvider             │  │
│  │  WeatherProvider   → OpenMeteoWeatherProvider        │  │
│  │  GeocodingProvider → NominatimGeocodingProvider      │  │
│  │  PlacesProvider    → OverpassPlacesProvider          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────┐                                          │
│  │  Prisma ORM  │                                          │
│  └──────┬───────┘                                          │
└─────────│───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐
│  PostgreSQL Database│
│                     │
│  Users, Trips,      │
│  TripStops,         │
│  WeatherSnapshots,  │
│  WeatherAlerts,     │
│  SavedPlaces        │
└─────────────────────┘
          ↕
┌─────────────────────────────────────────────────────────────┐
│                  External APIs                               │
│                                                             │
│  OSRM (routing)    — free, self-hostable                    │
│  Open-Meteo (wx)   — free, no key required                  │
│  Nominatim (geo)   — free, OpenStreetMap                    │
│  Overpass (places) — free, OpenStreetMap                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Technology Stack
- **React 18** — UI framework with concurrent features
- **TypeScript** — Strict typing throughout
- **Vite** — Fast HMR dev server, ESM-native bundler
- **Tailwind CSS** — Utility-first CSS with custom dark theme
- **React Router v6** — Client-side routing
- **TanStack Query v5** — Server state management, caching, background refetch
- **Leaflet + react-leaflet** — Interactive maps with OpenStreetMap tiles
- **Axios** — HTTP client with interceptors
- **Zod** — Schema validation for form inputs
- **Lucide React** — Icon library

### Directory Structure
```
client/src/
  components/
    layout/     — Header, Layout (persistent across routes)
    ui/         — Reusable UI primitives (buttons, badges, skeletons)
    map/        — Leaflet map components (Phase 2)
  pages/
    HomePage          — Landing page with feature overview
    PlanTripPage      — Core trip planning interface
    TripHistoryPage   — Saved trips and history
  features/
    trip/       — Trip planning state and components (Phase 2)
    weather/    — Weather display components (Phase 2)
  hooks/
    useGeocoding    — Geocoding search hook
    useWeather      — Weather fetch hook (Phase 2)
    useRouting      — Route calculation hook (Phase 2)
  services/
    api.ts          — Axios base client with interceptors
    geocodingService.ts
    weatherService.ts
  types/
    api.ts    — Shared API response types
    map.ts    — Routing and coordinate types
```

---

## Backend Architecture

### Technology Stack
- **Node.js 18+** — JavaScript runtime
- **Express 4** — HTTP framework
- **TypeScript** — Strict typing
- **Prisma 5** — Type-safe ORM
- **Zod** — Request validation
- **Helmet** — HTTP security headers
- **CORS** — Cross-origin request configuration
- **express-rate-limit** — API rate limiting
- **Morgan** — HTTP request logging
- **axios** — External API calls

### Directory Structure
```
server/src/
  app.ts          — Express app factory (middleware pipeline)
  index.ts        — Server entry point, graceful shutdown

  controllers/    — Route handler functions (thin, delegate to services)
  routes/         — Express Router definitions
  services/       — Business logic
    checkpointService.ts  — Time-based checkpoint generation (core algorithm)
    weatherService.ts     — Weather fetching + risk scoring
    routingService.ts     — Route retrieval
    geocodingService.ts   — Location search
  providers/      — External API implementations
    interfaces/   — TypeScript interfaces (contracts)
    routing/      — OsrmRoutingProvider
    weather/      — OpenMeteoWeatherProvider
    geocoding/    — NominatimGeocodingProvider
    places/       — OverpassPlacesProvider
    index.ts      — Registry: reads env vars, creates provider instances
  middleware/
    errorHandler.ts   — Unified error handling + AppError class
  utils/
    logger.ts     — Structured console logger
    asyncHandler.ts — async/await error forwarding wrapper
    geoMath.ts    — Haversine, polyline interpolation
    timeUtils.ts  — Date/time helpers for checkpoint calculation
```

---

## Database Architecture

**ORM**: Prisma 5 with PostgreSQL

### Schema Summary

| Model | Purpose |
|---|---|
| `User` | Application user accounts (future auth) |
| `Trip` | A planned or completed journey |
| `TripStop` | An ordered checkpoint along a trip |
| `WeatherSnapshot` | Fetched weather data for a stop at a specific time |
| `WeatherAlert` | A generated risk alert for a stop |
| `SavedPlace` | User-bookmarked locations (fuel, hospitals, etc.) |

### Key Design Decisions
- `Trip.departureDate` + `Trip.departureTime` are stored separately to preserve timezone semantics
- `WeatherSnapshot.forecastAt` represents the **expected arrival time** at that checkpoint — not fetch time
- `TripStop.sequence` is unique per trip to enforce ordering
- Cascade deletes on Trip → TripStop, WeatherSnapshot, WeatherAlert
- All primary keys use `cuid()` for URL-safe, distributed-safe IDs

---

## Provider Abstraction

All external API calls go through typed interfaces:

```typescript
interface RoutingProvider {
  getRoutes(request: RoutingRequest): Promise<RoutingResponse>;
}

interface WeatherProvider {
  getForecast(request: WeatherRequest): Promise<WeatherDataPoint>;
  getForecastBatch(requests: WeatherRequest[]): Promise<WeatherDataPoint[]>;
}

interface GeocodingProvider {
  geocode(query: string): Promise<GeocodeResult[]>;
  reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult>;
}

interface PlacesProvider {
  searchNearby(request: PlacesRequest): Promise<PlaceResult[]>;
}
```

Providers are selected at runtime via environment variables:
```
ROUTING_PROVIDER=osrm
WEATHER_PROVIDER=openmeteo
GEOCODING_PROVIDER=nominatim
PLACES_PROVIDER=overpass
```

To add a new provider (e.g., Google Routes), implement the interface and register it in `providers/index.ts`.

---

## Core Algorithm: Time-Based Checkpoint Weather

This is the key differentiator of BiCAST.

```
1. User inputs: origin, destination, departure_date, departure_time
2. Route is fetched from OSRM → polyline + total_duration
3. checkpointService.generateCheckpoints() distributes N checkpoints along polyline
   - Each checkpoint's ETA = departure_time + (fraction × total_duration)
   - Checkpoint location = interpolatePolyline(polyline, fraction)
4. weatherService.fetchWeatherForCheckpoints() calls Open-Meteo batch API
   - Each request: { lat, lng, forecastAt: checkpoint.estimatedArrival }
5. WeatherDataPoint is analysed by calcWeatherRiskScore()
6. Trip + TripStops + WeatherSnapshots + WeatherAlerts are persisted to PostgreSQL
```

The critical property: **forecast time = arrival time**, not current time.

---

## Future Phases

### Phase 2 — Route Analysis & Map
- Full trip analysis pipeline (route → checkpoints → weather → risk)
- Interactive Leaflet map with checkpoint markers
- Route comparison (multiple alternatives)
- Weather timeline visualization

### Phase 3 — Alerts & Places
- Weather alert generation with severity scoring
- Nearby places along route (fuel, hospitals)
- Fuel planning calculator

### Phase 4 — User Accounts & History
- JWT authentication
- Trip saving and history
- Saved places management

### Phase 5 — Mobile & PWA
- Progressive Web App support
- Push notifications for weather changes
- Offline route caching
