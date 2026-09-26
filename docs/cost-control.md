# BiCAST External API Cost Control & Optimization Strategy

This document outlines the design decisions, caching layers, sampling algorithms, and payload optimizations implemented in BiCAST to maintain high responsiveness and strict Google API cost efficiency.

---

## 1. Google Places API (New) Cost Strategy

### 1.1 FieldMask Optimization
Google Places API (New) charges substantially higher rates when unnecessary fields (such as comprehensive reviews, editorial summaries, or photos) are requested. BiCAST uses a strictly minimal field mask tailored exclusively to motorcycle routing needs:

```http
X-Goog-FieldMask: places.id,places.displayName,places.primaryType,places.types,places.location,places.formattedAddress,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.websiteUri,places.businessStatus,places.regularOpeningHours.openNow
```

- **Excluded high-cost fields**: `places.reviews`, `places.photos`, `places.editorialSummary`, `places.priceLevel`.
- **Billing SKU category**: Basic Essentials + Atmosphere / Contact.

---

## 2. Route Corridor Sampling Algorithm

Instead of querying places for every polyline coordinate (which would generate thousands of requests for a 300km journey), `RoutePlacesService` implements an adaptive corridor sampling strategy:

| Route Distance (km) | Sample Points | Typical Interval | Max API Requests |
| :--- | :--- | :--- | :--- |
| **< 30 km** (Urban) | 2 | ~15 km | 2 |
| **30 – 80 km** (Short) | 3 | ~25 km | 3 |
| **80 – 180 km** (Medium) | 5 | ~35 km | 5 |
| **180 – 350 km** (Intercity) | 7 | ~45 km | 7 |
| **> 350 km** (Cross-state) | 9 (capped) | ~50 km | 9 (Hard Cap) |

- **Max API Calls Per Search**: Capped at 9 calls maximum regardless of route length.
- **Deduplication**: Results are indexed by `placeId` in a hash map to avoid charging or displaying duplicate points returned by overlapping search circles.
- **Polyline Filtering**: Candidate places returned by the provider are strictly filtered using perpendicular distance (`minDistanceToPolyline <= maxCorridorRadius`).

---

## 3. Multi-Tiered In-Memory Caching (TTL)

BiCAST uses an in-memory TTL caching decorator layer across all external providers:

| Data Type | Cache Key Structure | TTL | Rationale |
| :--- | :--- | :--- | :--- |
| **Routing** | `route:{origin}:{dest}:{mode}:{intermediates}` | 30 minutes | Traffic and alternative geometry remains stable within a travel window. |
| **Weather** | `weather:{lat}:{lng}:{forecastHour}` | 15 minutes | Matches Open-Meteo hourly model forecast granularity. |
| **Places Along Route** | `routePlaces:{routeId}:{category}:{radius}` | 6 hours | Fuel pumps, restaurants, and hospitals along highway corridors rarely change location. |
| **Geocoding** | `geocode:{query}` | 24 hours | Addresses and city coordinates are static. |

---

## 4. On-Demand Detour Calculation

- **Approximation**: Initial places search uses geometric perpendicular distance to estimate detours (`estimatedDetourMeters = 2 * distanceFromRouteMeters`, `estimatedDetourSeconds = detourMeters / 40 km/h`).
- **No Additional Routing API Calls**: By avoiding full routing API round-trips for every candidate place marker, 30+ potential routing requests per category search are eliminated.

---

## 5. Free / Open-Source Fallbacks

BiCAST supports zero-cost open-source providers via configuration flags in `.env`:

| Service | Primary Provider | Open-Source Fallback Provider | Zero-Cost Key Required |
| :--- | :--- | :--- | :--- |
| **Places** | Google Places (New) | Overpass API (OpenStreetMap) | Yes (free default) |
| **Routing** | Google Routes | OSRM (Open Source Routing Machine) | Yes (free default) |
| **Geocoding** | Google Geocoding | Nominatim (OpenStreetMap) | Yes (free default) |
| **Weather** | Open-Meteo | Open-Meteo | Yes (free default) |

If Google API keys are missing or exceed rate limits, the system automatically falls back to Overpass / OSRM / Nominatim without application downtime.
