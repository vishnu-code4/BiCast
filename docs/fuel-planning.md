# BiCAST Motorcycle Fuel Calculator & Fuel Planning

This document details the mathematical models, safety reserve logic, station recommendation algorithms, API contracts, and motorcycle considerations implemented in the BiCAST Fuel Planning System.

---

## 1. Core Principles & Philosophy

1. **Deterministic & Transparent**: All calculations rely on verifiable formulas (`distance / mileage`). No AI, black-box guessing, or fabricated data is used.
2. **Safety Reserve Awareness**: Motorcycles typically have small fuel capacities (10–15 L) with limited reserve margins (1.5–2.0 L). The system explicitly evaluates whether a rider will breach their reserve before reaching the destination.
3. **No Dependency on Weather for Base Fuel**: Meteorological factors do not arbitrarily deduct mileage without physical telemetry.
4. **Reusing Route Infrastructure**: Fuel planning directly utilizes the existing route geometry, smart checkpoints, and the Places along Route pipeline from Prompts 3 & 6.

---

## 2. Mathematical Formulas & Precision

### 2.1 Fuel Required
$$\text{fuelRequiredLitres} = \frac{\text{routeDistanceKm}}{\text{mileageKmPerLitre}}$$
- Rounded to 2 decimal places (e.g. `3.16 L`).

### 2.2 Estimated Fuel Cost
$$\text{estimatedCostINR} = \text{round}(\text{fuelRequiredLitres} \times \text{fuelPricePerLitre})$$
- Formatted in Indian Rupees (`₹332`).

### 2.3 Total & Usable Range
$$\text{totalRangeKm} = \text{currentFuelLitres} \times \text{mileageKmPerLitre}$$
$$\text{usableRangeKm} = \max(0, (\text{currentFuelLitres} - \text{reserveLitres}) \times \text{mileageKmPerLitre})$$

### 2.4 Estimated Remaining Fuel on Arrival
$$\text{remainingFuelLitres} = \max(0, \text{currentFuelLitres} - \text{fuelRequiredLitres})$$
- Strictly clamped to $\ge 0$. Never displays negative fuel.

---

## 3. Fuel Status Levels

BiCAST defines 5 deterministic fuel status levels:

| Level | Condition | Explanation |
| :--- | :--- | :--- |
| `SUFFICIENT` | $\text{usableRangeKm} \ge \text{distanceKm}$ and arrival fuel $> \text{reserve} + 0.5\text{L}$ | Arrival fuel is safely above the reserve margin. |
| `LOW` | Arrival fuel $\le \text{reserve} + 0.5\text{L}$ but $> \text{reserve}$ | Projected arrival is close to the safety reserve. |
| `REFUEL_RECOMMENDED` | $\text{usableRangeKm} < \text{distanceKm}$ but $\text{totalRangeKm} \ge \text{distanceKm}$ | Will enter the reserve buffer before destination. Refuel advised. |
| `REFUEL_REQUIRED` | $\text{remainingFuelLitres} \le 0$ (distance exceeds total range) | Current fuel cannot reach destination. Refuelling mandatory. |
| `UNKNOWN` | Mileage or current fuel missing | Prompts rider to enter inputs. |

---

## 4. Fuel Station Recommendation Engine

Candidate fuel stations are fetched along the route corridor using `RoutePlacesService` (category: `fuel`). For each station, the following metrics are evaluated:

1. **Distance Along Polyline**:
   Calculated using `distanceAlongPolylineMetres(lat, lng, polyline)`.
2. **Estimated Arrival Time (ETA)**:
   $$\text{etaSeconds} = \left(\frac{\text{stationDist}}{\text{totalRouteDist}}\right) \times \text{totalDurationSeconds}$$
   $$\text{stationETA} = \text{departureTime} + \text{etaSeconds}$$
3. **Remaining Fuel at Station**:
   $$\text{fuelAtStation} = \text{currentFuel} - \left(\frac{\text{stationDistKm}}{\text{mileage}}\right)$$
4. **Reachability Check**:
   $$\text{isReachableBeforeReserve} = \text{stationDistKm} \le \text{usableRangeKm}$$
5. **Suitability Score (0 to 100)**:
   - Base score: 50.
   - **Sweet Spot Bonus (+25 pts)**: Stations located between 50% and 88% of the usable range are ideal refuelling targets.
   - **Reachability Penalty (-40 pts)**: Stations beyond the usable range are heavily penalized.
   - **Detour Penalty (0 to -20 pts)**: Scaled by deviation from route polyline.
   - **Google Rating Boost (0 to +10 pts)**: Scaled by 5-star rating.
   - **Open Status (+10 pts for open, -15 pts for closed)**.

---

## 5. Checkpoint Fuel Progression

For every 15–30 min smart checkpoint along the route, BiCAST calculates:
- $\text{distanceFromStartKm}$
- $\text{estimatedArrivalTime}$
- $\text{fuelConsumedLitres} = \frac{\text{distanceFromStartKm}}{\text{mileage}}$
- $\text{estimatedRemainingFuelLitres} = \max(0, \text{currentFuel} - \text{fuelConsumedLitres})$

---

## 6. Real-World Motorcycle Considerations & Caveats

Riders are informed that real-world fuel economy can deviate from nominal mileage due to:
- Sustained high highway cruising speeds vs. urban stop-and-go.
- Heavy headwinds or severe crosswinds.
- Pillion passengers, saddlebags, and panniers.
- High gradient mountain passes (Western Ghats, Himalayas).
- Tyre pressure variances.
- Traffic congestion.

The system maintains a conservative safety reserve to provide a reliable buffer against these factors.
