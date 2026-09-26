# BiCAST — Route-Based Weather Intelligence and Alert System for Motorcycle Riders

> An MCA Mini-Project | Full-Stack Web Application

BiCAST helps motorcycle riders plan journeys by combining route alternatives, time-based checkpoints, and weather forecasts matched to the rider's **expected location and arrival time** — not just the destination's current weather.

---

## 🎯 Project Purpose

Traditional weather apps show current or hourly weather at a single location. BiCAST solves a different problem:

> *"What will the weather be like when I reach each part of my journey?"*

Given a route from A to B departing at 07:00, BiCAST:
1. Calculates how long each segment takes
2. Determines when you'll be at each checkpoint
3. Fetches the weather forecast for **that location at that exact time**
4. Generates rider-specific alerts and a safety score

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool & dev server |
| Tailwind CSS | Styling |
| React Router v6 | Client-side routing |
| TanStack Query v5 | Server state & caching |
| Leaflet + react-leaflet | Interactive maps |
| Axios | HTTP client |
| Zod | Schema validation |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|---|---|
| Node.js 18+ | Runtime |
| Express 4 | HTTP framework |
| TypeScript | Type safety |
| Prisma 5 | ORM |
| Zod | Request validation |
| Helmet | Security headers |

### Database
| Technology | Purpose |
|---|---|
| PostgreSQL | Primary database |
| Prisma | Schema & migrations |

### External APIs (Free, No API Key by Default)
| Service | Purpose |
|---|---|
| OSRM | Routing (free, open-source) |
| Open-Meteo | Weather forecasts (free, no key) |
| Nominatim (OSM) | Geocoding (free) |
| Overpass API (OSM) | Nearby places (free) |
| OpenStreetMap tiles | Map tiles (free) |

> Google Maps / Routes / Places APIs are supported via provider interfaces when keys are available.

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL database running

### 1. Clone & Install

```bash
# Install all workspace dependencies
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/bicast_db?schema=public"
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Create database and run migrations
npm run db:migrate

# (Optional) Open Prisma Studio
npm run db:studio
```

### 4. Start Development Servers

```bash
# Start both frontend and backend concurrently
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/api/health

---

## 🌐 Environment Variables

See [`.env.example`](.env.example) for all available variables.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `PORT` | No | `3001` | Backend server port |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origins |
| `ROUTING_PROVIDER` | No | `osrm` | Routing backend |
| `WEATHER_PROVIDER` | No | `openmeteo` | Weather backend |
| `GEOCODING_PROVIDER` | No | `nominatim` | Geocoding backend |
| `PLACES_PROVIDER` | No | `overpass` | Places backend |
| `GOOGLE_MAPS_API_KEY` | No | — | Google Maps (optional) |
| `GOOGLE_ROUTES_API_KEY` | No | — | Google Routes (optional) |
| `GOOGLE_PLACES_API_KEY` | No | — | Google Places (optional) |
| `GOOGLE_GEOCODING_API_KEY` | No | — | Google Geocoding (optional) |
| `JWT_SECRET` | No | — | JWT signing secret (future auth) |

---

## 🖥️ Development Commands

```bash
# Root workspace
npm run dev              # Start frontend + backend simultaneously
npm run dev:client       # Start frontend only
npm run dev:server       # Start backend only
npm run build            # Build both for production
npm run typecheck        # TypeScript check both workspaces
npm run lint             # Lint both workspaces

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations (dev)
npm run db:migrate:prod  # Run migrations (production)
npm run db:studio        # Open Prisma Studio GUI
npm run db:validate      # Validate Prisma schema
```

---

## 📁 Project Structure

```
bicast/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── layout/     # Header, Layout
│   │   │   └── ui/         # Buttons, badges, cards
│   │   ├── pages/          # Route-level page components
│   │   ├── features/       # Feature-specific modules (Phase 2+)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client + service functions
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── index.html          # HTML entry point
│
├── server/                 # Express backend
│   └── src/
│       ├── controllers/    # Request handlers
│       ├── routes/         # Express Router definitions
│       ├── services/       # Business logic
│       ├── providers/      # External API implementations
│       │   ├── interfaces/ # Provider contracts
│       │   ├── routing/    # OSRM
│       │   ├── weather/    # Open-Meteo
│       │   ├── geocoding/  # Nominatim
│       │   └── places/     # Overpass
│       ├── middleware/     # Error handling, validation
│       └── utils/          # Logger, geoMath, timeUtils
│
├── prisma/
│   └── schema.prisma       # Database schema
│
├── docs/
│   └── architecture.md     # System architecture documentation
│
├── .env.example            # Environment variable template
├── package.json            # Root workspace configuration
└── README.md               # This file
```

---

## 📡 API Endpoints (Phase 1)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/geocoding/search?q=...` | Forward geocoding |
| `GET` | `/api/geocoding/reverse?lat=&lng=` | Reverse geocoding |
| `GET` | `/api/routing/routes?originLat=&originLng=&destLat=&destLng=` | Get route(s) |
| `GET` | `/api/weather?lat=&lng=&forecastAt=` | Single point weather |
| `POST` | `/api/weather/batch` | Batch weather for checkpoints |

---

## 📊 Database Models

| Model | Description |
|---|---|
| `User` | User accounts |
| `Trip` | Journey plan (origin, destination, schedule, risk score) |
| `TripStop` | Ordered checkpoints along a trip with ETA |
| `WeatherSnapshot` | Weather data at a checkpoint at estimated arrival time |
| `WeatherAlert` | Generated risk alerts for dangerous conditions |
| `SavedPlace` | User-bookmarked locations (fuel, hospitals, etc.) |

---

## 🔄 Implementation Status

### Phase 1 — Foundation ✅ Complete
- [x] Monorepo structure (npm workspaces)
- [x] React + Vite + TypeScript + Tailwind CSS frontend
- [x] Express + TypeScript backend
- [x] Provider abstraction (Routing, Weather, Geocoding, Places)
- [x] OSRM routing provider (free)
- [x] Open-Meteo weather provider (free, no API key)
- [x] Nominatim geocoding provider (free)
- [x] Overpass places provider (free)
- [x] Prisma schema (User, Trip, TripStop, WeatherSnapshot, WeatherAlert, SavedPlace)
- [x] API routes: health, routing, weather, geocoding
- [x] Home page, Plan Trip page, Trip History page
- [x] Live API status badge (polls /api/health)
- [x] Geocoding autocomplete on Plan Trip page
- [x] Checkpoint generation algorithm (core BiCAST logic)
- [x] Weather risk scoring
- [x] Architecture documentation
- [x] .env.example with all variables

### Phase 2 — Route Analysis & Interactive Map ✅ Complete
- [x] Full trip analysis pipeline (route → checkpoints → weather → risk)
- [x] Interactive Leaflet map with multi-route rendering
- [x] Time-based smart checkpoints (15–30 min intervals)
- [x] Checkpoint markers with arrival ETAs and weather popups
- [x] Route alternatives comparison (duration, distance, summary)
- [x] User-defined intermediate stops with dynamic ETA recalculation
- [x] Route weather timeline visualization

### Phase 3 — Weather Risk, Safety Score & Alert Engine ✅ Complete
- [x] Deterministic 0–100 Safety Score model (No AI / LLM)
- [x] Transparent Risk Levels: Green (80-100), Yellow (60-79), Orange (40-59), Red (0-39)
- [x] Meteorological factor breakdown: Rain intensity, Thunderstorms, Sustained winds & Gusts, Visibility, Heat Index
- [x] Route segment risk scoring & map colorization (Green, Yellow, Orange, Red)
- [x] Severe weather segment detection & override protection
- [x] Spatially and temporally consolidated weather alerts (deduplication)
- [x] Deterministic motorcycle rider safety recommendations
- [x] Multi-route comparison tags (Fastest, Shortest, Safest)
- [x] Centralized configurable risk rules & documentation ([`docs/risk-engine.md`](docs/risk-engine.md))
- [x] Dynamic recalculation on departure changes and stop editing

### Phase 4 — Places Along Route + Add as Stop ✅ Complete
- [x] 14 centralized rider place categories (Fuel, EV, Food, Cafe, Hotels, Hospitals, Bike Service, Tyres, ATMs, Restrooms, Parking, Attractions, Pharmacies, Convenience Stores)
- [x] Route corridor sampling algorithm (capped at 9 requests for long trips)
- [x] Google Places API (New) integration with minimal field masking + Overpass OSM fallback
- [x] Deduplication by `placeId` and route proximity filtering
- [x] Deterministic route usefulness ranking (detour, rating, review confidence, open status, category priority)
- [x] Interactive map markers with category icons and compact PlaceCard popups
- [x] Seamless "Add as Stop" workflow with temporary staging in Edit Stops modal
- [x] Full recalculation pipeline on stop confirmation: Route → Alternatives → Checkpoints → ETA → Weather → Risk
- [x] Cost control and multi-tiered caching documentation ([`docs/cost-control.md`](docs/cost-control.md))
- [x] Comprehensive API documentation ([`docs/api.md`](docs/api.md))

### Phase 5 — Fuel Calculator & Fuel Planning Engine ✅ Complete
- [x] Deterministic fuel required and estimated cost calculations (₹/L)
- [x] Total range and usable range modeling with configurable safety reserve
- [x] Safe arrival fuel clamping (strictly non-negative)
- [x] Deterministic fuel status: `SUFFICIENT`, `LOW`, `REFUEL_RECOMMENDED`, `REFUEL_REQUIRED`
- [x] Checkpoint fuel progression (fuel consumed & remaining at every 15–30 min stop)
- [x] Reachable fuel station recommendations along route corridor
- [x] "Add Fuel Station as Stop" wired directly into the staged Edit Stops modal
- [x] Multi-route fuel comparison and `isMostFuelEfficient` tagging
- [x] Complete Fuel Planning documentation ([`docs/fuel-planning.md`](docs/fuel-planning.md))

### Phase 6 — Trip Persistence, Saved Trips & History (Completed)
- [x] Persistent trip storage with clear configuration vs. calculated snapshot separation
- [x] Dual-mode repository: Prisma PostgreSQL transactions with transparent offline JSON fallback
- [x] Checkpoint isolation: Smart checkpoints never converted into persistent `TripStop` records
- [x] Trip lifecycle state machine: `DRAFT`, `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- [x] Stale data engine: configurable freshness rules (`WEATHER_MAX_AGE_HOURS = 3`, `ROUTE_MAX_AGE_DAYS = 7`)
- [x] Recalculate trip: re-runs the full pipeline (`Route -> Checkpoints -> Weather -> Risk -> Fuel`) with updated departure
- [x] Trip duplication: creates clean clones with independent stops, copied fuel settings, and `Copy` suffix
- [x] Cascading deletion: safe deletion with confirmation, preventing orphaned stops or alerts
- [x] Dedicated UI: `/saved-trips`, `/trips/:tripId` interactive dashboard, and upgraded `/history` with logbook statistics
- [x] Complete Trip Persistence documentation ([`docs/trips.md`](docs/trips.md))

---

## 🏛️ Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full system architecture including:
- System diagram
- Frontend and backend architecture
- Database design
- Provider abstraction pattern
- Core checkpoint weather algorithm

---

## 📄 License

MIT — MCA Mini-Project by [Your Name]
