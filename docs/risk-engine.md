# BiCAST Weather Risk, Safety Score & Alert Engine Documentation

This document describes the **deterministic, rule-based weather risk scoring model**, safety levels, route segment evaluations, alert deduplication, and rider recommendations in BiCAST.

BiCAST does **not** use AI or LLMs for safety scoring. Every score and alert is 100% explainable and directly traceable to actual forecast parameters at the rider's expected arrival time and location along the journey.

---

## 1. Safety Score & Risk Levels

The BiCAST safety score is normalized to a **0–100 scale**:
* **100**: Ideal, optimal motorcycle riding weather conditions.
* **0**: Extremely hazardous conditions (severe thunderstorms, torrential rain, gale-force winds).

### Thresholds & Color Codes

| Score Range | Risk Level | Badge Color | Meaning & Rider Guidance |
|---|---|---|---|
| **80 – 100** | **GREEN** | Emerald | **Low Risk / Safe**: Favorable conditions. Normal precautions. |
| **60 – 79** | **YELLOW** | Amber | **Moderate Risk**: Mild rain, moderate wind, or warm temps. Stay alert. |
| **40 – 59** | **ORANGE** | Orange | **High Risk / Caution**: Heavy rain, strong crosswind gusts, poor visibility. Waterproof gear, reduced speeds recommended. |
| **0 – 39** | **RED** | Rose | **Severe Hazard / Danger**: Active thunderstorm, torrential rain, or gale gusts. Consider delaying journey or seeking shelter. |

---

## 2. Risk Factors, Thresholds & Penalties

Every weather point along the route begins with a base safety score of **100**. Penalties are subtracted based on specific meteorological conditions:

$$\text{Safety Score} = \max(0, \min(100, 100 - \sum \text{Penalties}))$$

### A. Rain & Precipitation Intensity
*Motorcycles experience significant loss of traction (hydroplaning) on wet asphalt. Intensity matters far more than mere probability of trace mist.*

| Condition | Threshold | Penalty | Severity | Rationale |
|---|---|---|---|---|
| **Torrential Downpour** | $\ge 15.0\text{ mm/h}$ | $-40\text{ pts}$ | **CRITICAL** | High aquaplaning danger, zero road braking margin |
| **Heavy Rain** | $\ge 6.0\text{ mm/h}$ or $\ge 75\%\text{ prob}$ with $\ge 2\text{ mm}$ | $-28\text{ pts}$ | **HIGH** | Substantially reduced tire grip and water spray |
| **Moderate Rain** | $\ge 2.0\text{ mm/h}$ or $\ge 50\%\text{ prob}$ | $-18\text{ pts}$ | **MODERATE** | Wet road surface, extended stopping distance |
| **Light Drizzle / Shower** | $\ge 0.2\text{ mm/h}$ or $\ge 25\%\text{ prob}$ | $-8\text{ pts}$ | **LOW** | Initial slickness as road oil lifts |

*Note: Precipitation amount and probability are combined into a single unified factor to avoid double-penalizing the same rain event.*

---

### B. Thunderstorm Activity
*Lightning, sudden violent downdrafts, and localized flooding represent immediate critical hazards to riders.*

| Condition | Threshold | Penalty | Severity | Rationale |
|---|---|---|---|---|
| **Active Thunderstorm Cell** | `thunderstorm == true` or WMO codes `95, 96, 99` | $-40\text{ pts}$ | **CRITICAL** | Lightning strike risk, sudden microbursts, zero rider shelter on open highways |

---

### C. Sustained Wind & Wind Gusts
*Two-wheeled vehicles are uniquely susceptible to lateral aerodynamic deflection, especially over bridges, coastal causeways, and open plains.*

| Factor | Threshold | Penalty | Severity | Rationale |
|---|---|---|---|---|
| **Gale-Force Wind** | $\ge 52\text{ km/h sustained}$ | $-28\text{ pts}$ | **HIGH** | Constant severe lateral force destabilizing bike track |
| **Strong Wind** | $\ge 38\text{ km/h sustained}$ | $-16\text{ pts}$ | **MODERATE** | Noticeable handlebar torque and fatigue |
| **Moderate Breeze** | $\ge 25\text{ km/h sustained}$ | $-8\text{ pts}$ | **LOW** | Perceptible drag |
| **Severe Wind Gusts** | $\ge 65\text{ km/h gusts}$ | $-35\text{ pts}$ | **CRITICAL** | Sudden lateral displacement across lane markings |
| **Strong Wind Gusts** | $\ge 50\text{ km/h gusts}$ ($\Delta \ge 10\text{ km/h}$) | $-20\text{ pts}$ | **HIGH** | Requires continuous steering counter-correction |
| **Moderate Wind Gusts** | $\ge 35\text{ km/h gusts}$ ($\Delta \ge 12\text{ km/h}$) | $-10\text{ pts}$ | **MODERATE** | Noticeable buffeting around heavy vehicles |

---

### D. Visibility
*Clear sightlines are vital for identifying roadway potholes, stray animals, and slow-moving traffic.*

| Condition | Threshold | Penalty | Severity | Rationale |
|---|---|---|---|---|
| **Dense Fog** | $< 1.0\text{ km}$ | $-30\text{ pts}$ | **CRITICAL** | Extremely short reaction distance at highway speeds |
| **Poor Visibility** | $< 3.0\text{ km}$ | $-18\text{ pts}$ | **HIGH** | Heavy rain mist or winter morning fog |
| **Moderate Haze / Mist** | $< 7.0\text{ km}$ | $-8\text{ pts}$ | **MODERATE** | Reduced distant contrast |

---

### E. Heat Stress (Apparent Temperature / Heat Index)
*Motorcycle riders wearing helmets, armored jackets, and gloves suffer elevated physical fatigue and dehydration in high heat.*

| Condition | Threshold (Feels-like) | Penalty | Severity | Rationale |
|---|---|---|---|---|
| **Extreme Danger Heat** | $\ge 45^\circ\text{C}$ | $-24\text{ pts}$ | **HIGH** | Risk of heat exhaustion and cognitive lag |
| **High Heat Stress** | $\ge 41^\circ\text{C}$ | $-14\text{ pts}$ | **MODERATE** | Significant fluid loss requiring scheduled breaks |
| **Moderate Heat** | $\ge 37^\circ\text{C}$ | $-6\text{ pts}$ | **LOW** | Warm conditions typical of tropical summers |

---

## 3. Route Segment Risk Calculation

Risk is evaluated not only at discrete checkpoints but also across the roadway segments connecting them:

$$\text{Segment Score} = 0.6 \times \min(\text{score}_A, \text{score}_B) + 0.4 \times \left(\frac{\text{score}_A + \text{score}_B}{2}\right)$$

* By weighting the more dangerous endpoint at $60\%$, entering a severe weather zone is immediately reflected in the segment color.
* **Severe Weather Flag**: If either endpoint exhibits active thunderstorms, torrential rain, or severe gusts ($> 65$ km/h), the segment is flagged with `isSevereEvent: true`.

---

## 4. Overall Route Safety Score Aggregation

The route-level score combines journey-wide trends with peak hazard exposure:

$$\text{Calculated Score} = 0.7 \times \text{Mean}(\text{Checkpoint Scores}) + 0.3 \times \min(\text{Checkpoint Scores})$$

### Severe Weather Override
* If any segment contains a confirmed severe weather event (active thunderstorm, torrential downpour, or severe gale), the overall route score is **capped at 59 (ORANGE)**.
* This ensures that a 4-hour pleasant ride is not falsely marked **GREEN** when the rider must pass through a dangerous 30-minute thunderstorm cell.

---

## 5. Alert Deduplication & Spatial-Temporal Spanning

To avoid alert fatigue (e.g., repeating 6 identical "Rain" notifications for consecutive 15-minute checkpoints), the alert engine consolidates adjacent checkpoints:
* **Spatial grouping**: Identifies continuous spans (e.g., *"between Tindivanam and Chidambaram"*).
* **Temporal grouping**: Computes the expected arrival time span (e.g., *"approximately 08:35 AM – 10:05 AM"*).
* **Non-guaranteed language**: Phrased with meteorological uncertainty: *"Forecast"*, *"Expected"*, *"Possible"*, *"Elevated risk"*.

---

## 6. Deterministic Rider Recommendations

Actionable riding advice is generated directly from triggered risk factors:
* **Thunderstorms**: *"Seek safe covered shelter if rain intensifies or lightning is observed."*
* **Heavy Rain**: *"Wear high-visibility waterproof gear and reduce travel speed on slick tarmac."*
* **Crosswinds**: *"Relax your arms on the handlebars and maintain a stable, centered lane position."*
* **Low Visibility**: *"Turn on low-beam headlights and maintain an extended following distance."*
* **Heat Stress**: *"Carry electrolyte fluids and plan 10-minute shaded rest breaks."*
