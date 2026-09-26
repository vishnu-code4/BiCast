# BiCAST API Documentation

Base URL: `http://localhost:3001/api`

All responses follow standard JSON envelopes. Errors contain `{ error: { message: string, code?: string } }`.

---

## 1. Places Along Route & Categories (Prompt 6)

### 1.1 List Supported Place Categories
Returns metadata for all 14 motorcycle-relevant place categories including icons, default radii, and highway priority.

- **Endpoint**: `GET /api/places/categories`
- **Response**:
```json
{
  "categories": [
    {
      "id": "fuel",
      "displayName": "Petrol Pumps / Fuel Stations",
      "shortName": "Fuel",
      "icon": "⛽",
      "googleTypes": ["gas_station"],
      "defaultRadiusMeters": 5000,
      "isRoutePrimary": true,
      "importanceWeight": 9
    },
    ...
  ]
}
```

### 1.2 Search Places Along Route (Cached by Route ID)
Discovers, deduplicates, and deterministically ranks places along a route corridor.

- **Endpoint**: `GET /api/routes/:routeId/places`
- **Query Parameters**:
  - `category` *(optional, string)*: Category ID (e.g. `fuel`, `ev_charging`, `restaurant`, `hospital`, `motorcycle_service`). Default: `fuel`.
  - `categories` *(optional, string)*: Comma-separated category IDs for multi-category search.
  - `radius` *(optional, number)*: Corridor radius in meters (500 to 30,000). Default: 5000.
  - `limit` *(optional, number)*: Maximum places to return (1 to 100). Default: 30.
- **Response**:
```json
{
  "routeId": "route-0",
  "category": "fuel",
  "categories": ["fuel"],
  "radiusMeters": 5000,
  "totalFound": 8,
  "places": [
    {
      "placeId": "places/ChIJ...",
      "name": "HP Petrol Pump Highway Station",
      "category": "fuel",
      "latitude": 12.8255,
      "longitude": 77.4105,
      "address": "NH 275, Ramanagara, Karnataka",
      "rating": 4.4,
      "userRatingCount": 320,
      "openNow": true,
      "distanceFromRouteMeters": 65,
      "estimatedDetourMeters": 130,
      "estimatedDetourSeconds": 12,
      "rankScore": 92
    }
  ]
}
```

### 1.3 Search Places Along Route (Direct Geometry Body)
Alternative POST endpoint accepting route geometry directly.

- **Endpoint**: `POST /api/places/along-route` (or `POST /api/routes/places/along-route`)
- **Request Body**:
```json
{
  "route": {
    "id": "route-0",
    "geometry": [[12.9716, 77.5946], [12.8250, 77.4100], [12.2958, 76.6394]],
    "distanceMeters": 142000
  },
  "category": "hospital",
  "radius": 6000,
  "limit": 25
}
```

---

## 2. Route Planning & Checkpoints (Prompt 3)

### 2.1 Plan Route Alternatives
- **Endpoint**: `POST /api/routes/plan`
- **Request Body**:
```json
{
  "start": { "name": "Bangalore", "lat": 12.9716, "lng": 77.5946 },
  "destination": { "name": "Mysore", "lat": 12.2958, "lng": 76.6394 },
  "stops": [],
  "journeyDate": "2026-09-15",
  "departureTime": "06:30",
  "timezone": "Asia/Kolkata",
  "alternatives": true
}
```

### 2.2 Recalculate ETAs
- **Endpoint**: `POST /api/routes/recalculate-eta`

---

## 3. Route Weather & Timelines (Prompt 4)

### 3.1 Route Weather Timeline
- **Endpoint**: `POST /api/weather/route-timeline`

### 3.2 Multi-Route Weather Timelines
- **Endpoint**: `POST /api/weather/multi-route-timeline`

---

## 4. Weather Risk Engine (Prompt 5)

### 4.1 Route Risk Analysis
- **Endpoint**: `POST /api/risk/route` (or `POST /api/risk/analyze`)

### 4.2 Multi-Route Risk Comparison
- **Endpoint**: `POST /api/risk/multi-route`

---

## 5. Fuel Planning & Calculation (Prompt 7)

### 5.1 Single Route Fuel Plan & Station Recommendations
- **Endpoint**: `POST /api/routes/:routeId/fuel/calculate`
- **Request Body**:
```json
{
  "fuelInput": {
    "mileageKmPerLitre": 45,
    "fuelPricePerLitre": 105,
    "currentFuelLitres": 8,
    "fuelTankCapacityLitres": 12,
    "reserveLitres": 1.5
  }
}
```
- **Response**: Returns `{ fuelPlan: RouteFuelPlan }` containing `calculation`, `checkpointEstimates`, and `recommendations`.

### 5.2 Multi-Route Fuel Comparison
- **Endpoint**: `POST /api/routes/fuel/calculate-multi` (or `POST /api/fuel/calculate-multi`)
- **Request Body**:
```json
{
  "routes": [...],
  "fuelInput": {
    "mileageKmPerLitre": 40,
    "fuelPricePerLitre": 103,
    "currentFuelLitres": 5
  }
}
```
- **Response**: Returns `{ fuelPlans: Record<string, RouteFuelPlan> }` tagging `isMostFuelEfficient: true`.

---

## 6. Trips, Saved Trips & History (Prompt 8)

### 6.1 Create / Save Trip
- **Endpoint**: `POST /api/trips`
- **Request Body**:
```json
{
  "name": "Bengaluru to Nandi Hills Sunrise Ride",
  "startLocation": { "name": "Indiranagar, Bengaluru", "latitude": 12.9784, "longitude": 77.6408 },
  "destination": { "name": "Nandi Hills", "latitude": 13.3702, "longitude": 77.6835 },
  "stops": [
    { "sequence": 1, "name": "Hebbal Fuel Stop", "latitude": 13.0358, "longitude": 77.5970, "source": "place" }
  ],
  "journeyDate": "2026-10-18",
  "departureTime": "05:00",
  "timezone": "Asia/Kolkata",
  "fuelConfig": { "mileageKmPerLitre": 38, "fuelPricePerLitre": 103, "currentFuelLitres": 8 },
  "status": "PLANNED"
}
```
- **Response**: Returns HTTP 201 with created `SavedTrip` object.

### 6.2 List Saved Trips
- **Endpoint**: `GET /api/trips`
- **Query Parameters**: `status` (`ALL`, `PLANNED`, `DRAFT`, `COMPLETED`, `CANCELLED`), `sort` (`newest`, `oldest`, `journeyDate`), `search`, `page`, `limit`.
- **Response**: Returns `{ trips: TripListItem[], total, page, limit }`.

### 6.3 Trip History & Logbook Stats
- **Endpoint**: `GET /api/trips/history`
- **Response**: Returns `{ trips: TripListItem[], total, page, limit, stats: { totalTrips, plannedTrips, completedTrips, cancelledTrips, totalDistanceKm } }`.

### 6.4 Get Trip Details
- **Endpoint**: `GET /api/trips/:tripId`
- **Response**: Returns `{ trip: SavedTrip }` with full stops array, snapshots, and evaluated `freshness`.

### 6.5 Update Trip Configuration
- **Endpoint**: `PATCH /api/trips/:tripId`
- **Request Body**: Partial trip fields (`name`, `startLocation`, `destination`, `stops`, `journeyDate`, `departureTime`, `fuelConfig`, `status`).

### 6.6 Duplicate Trip
- **Endpoint**: `POST /api/trips/:tripId/duplicate`
- **Request Body**: `{ "name": "Optional custom name" }`
- **Response**: Returns HTTP 201 with cloned trip containing independent stop records.

### 6.7 Recalculate Trip
- **Endpoint**: `POST /api/trips/:tripId/recalculate`
- **Request Body**: `{ "departureTime": "06:30", "journeyDate": "2026-10-18" }` (optional overrides).
- **Response**: Runs complete pipeline (`Route -> Checkpoints -> ETA -> Weather -> Risk -> Fuel`), updates persistent snapshots, and returns fresh trip.

### 6.8 Delete Trip
- **Endpoint**: `DELETE /api/trips/:tripId`
- **Response**: Returns HTTP 200 with `{ message: "Trip deleted successfully", id }`.


