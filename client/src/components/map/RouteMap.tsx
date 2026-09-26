// ============================================================
// BiCAST Interactive Route Map
// Leaflet-powered route viewer supporting multiple route alternatives,
// distinct start/dest/stop/checkpoint markers, and ETA popups
// ============================================================
import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PlannedRoute, LocationInput } from '@/types/route';
import { RouteWeatherTimeline as IRouteWeatherTimeline } from '@/types/weather';
import { RouteRiskAnalysis } from '@/types/risk';
import { Place } from '@/types/places';
import { getWeatherEmoji } from '@/services/weatherService';
import { getCategoryConfig } from '@/config/placeCategories';
import PlaceCard from '@/components/places/PlaceCard';

// Custom Marker Icons using CSS DivIcons
const createIcon = (html: string, className: string = '', size: [number, number] = [28, 28]) =>
  L.divIcon({
    html,
    className: `custom-map-icon ${className}`,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
    popupAnchor: [0, -size[1] / 2],
  });

const startIcon = createIcon(
  '<div class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-black font-bold text-xs">A</div>',
);

const destIcon = createIcon(
  '<div class="w-7 h-7 rounded-full bg-rose-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs">B</div>',
);

const createStopIcon = (num: number) =>
  createIcon(
    `<div class="w-6 h-6 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center text-black font-bold text-xs">${num}</div>`,
    '',
    [24, 24],
  );

const createCheckpointIcon = (num: number) =>
  createIcon(
    `<div class="w-5 h-5 rounded-full bg-cyan-400 border border-white/80 shadow-md flex items-center justify-center text-black font-semibold text-[10px]">${num}</div>`,
    '',
    [20, 20],
  );

const createPlaceIcon = (iconText: string) =>
  createIcon(
    `<div class="w-7 h-7 rounded-full bg-slate-900/95 border-2 border-brand-400 shadow-xl flex items-center justify-center text-xs backdrop-blur-sm transition-transform hover:scale-125 cursor-pointer">${iconText}</div>`,
    'place-marker-icon',
    [28, 28],
  );

// Helper component to auto-fit bounds
function MapBoundsUpdater({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [bounds, map]);
  return null;
}

interface RouteMapProps {
  routes: PlannedRoute[];
  selectedRouteId: string;
  startLocation: LocationInput;
  destination: LocationInput;
  stops?: LocationInput[];
  onSelectRoute: (id: string) => void;
  weatherTimeline?: IRouteWeatherTimeline | null;
  riskAnalysis?: RouteRiskAnalysis | null;
  places?: Place[];
  onAddPlaceAsStop?: (place: Place) => void;
}

export default function RouteMap({
  routes,
  selectedRouteId,
  startLocation,
  destination,
  stops,
  onSelectRoute,
  weatherTimeline,
  riskAnalysis,
  places = [],
  onAddPlaceAsStop,
}: RouteMapProps) {
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  // Calculate bounding box for all points on active route
  const mapBounds: L.LatLngBoundsExpression | null = React.useMemo(() => {
    if (!selectedRoute || selectedRoute.geometry.length === 0) return null;
    return L.latLngBounds(selectedRoute.geometry);
  }, [selectedRoute]);

  const defaultCenter: [number, number] = [startLocation.lat, startLocation.lng];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'GREEN':
        return '#10b981';
      case 'YELLOW':
        return '#eab308';
      case 'ORANGE':
        return '#f97316';
      case 'RED':
        return '#ef4444';
      default:
        return '#f97316';
    }
  };

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden glass border border-white/10 relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={7}
        className="w-full h-full min-h-[500px]"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mapBounds && <MapBoundsUpdater bounds={mapBounds} />}

        {/* 1. Alternative Route Polylines (Background) */}
        {routes
          .filter((r) => r.id !== selectedRouteId)
          .map((r) => (
            <Polyline
              key={`alt-${r.id}`}
              positions={r.geometry}
              pathOptions={{
                color: '#94a3b8',
                weight: 4,
                opacity: 0.5,
                dashArray: '4, 8',
              }}
              eventHandlers={{
                click: () => onSelectRoute(r.id),
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold text-slate-800">{r.name}</p>
                  <p className="text-slate-600">
                    {(r.distanceMeters / 1000).toFixed(1)} km &bull; {Math.round(r.durationSeconds / 60)} min
                  </p>
                  <button
                    onClick={() => onSelectRoute(r.id)}
                    className="mt-1 text-xs font-semibold text-sky-600 underline"
                  >
                    Select this route
                  </button>
                </div>
              </Popup>
            </Polyline>
          ))}

        {/* 2. Selected Active Route Polyline Base */}
        {selectedRoute && (
          <Polyline
            key={`active-${selectedRoute.id}`}
            positions={selectedRoute.geometry}
            pathOptions={{
              color: '#334155', // Underlay casing for crisp visual separation
              weight: 8,
              opacity: 0.8,
            }}
          />
        )}

        {/* 2b. Risk-Colorized Route Segments */}
        {riskAnalysis && riskAnalysis.segments.length > 0 ? (
          riskAnalysis.segments.map((seg) => (
            <Polyline
              key={`seg-${seg.segmentIndex}-${seg.fromPointId}`}
              positions={[seg.fromCoordinates, seg.toCoordinates]}
              pathOptions={{
                color: getRiskColor(seg.level),
                weight: 6,
                opacity: 0.95,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-bold text-slate-800">
                    Segment: {seg.fromLocationName} &rarr; {seg.toLocationName}
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Safety Score: <span className="font-bold">{seg.score}/100</span> ({seg.level})
                  </p>
                  {seg.isSevereEvent && (
                    <p className="text-rose-600 font-semibold mt-1">
                      ⚠ {seg.severeEventDescription || 'Severe weather segment'}
                    </p>
                  )}
                  {seg.primaryConcern && (
                    <p className="text-slate-500 mt-0.5 text-[11px]">{seg.primaryConcern}</p>
                  )}
                </div>
              </Popup>
            </Polyline>
          ))
        ) : (
          selectedRoute && (
            <Polyline
              key={`active-color-${selectedRoute.id}`}
              positions={selectedRoute.geometry}
              pathOptions={{
                color: '#f97316',
                weight: 6,
                opacity: 0.9,
              }}
            />
          )
        )}

        {/* 3. Start Marker */}
        <Marker position={[startLocation.lat, startLocation.lng]} icon={startIcon}>
          <Popup>
            <div className="text-xs font-medium text-slate-900">
              <span className="font-bold text-emerald-600 uppercase text-[10px]">Start Location</span>
              <p className="mt-0.5">{startLocation.name}</p>
              {selectedRoute && (
                <p className="text-slate-500 mt-1">
                  Departure: {new Date(selectedRoute.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {(() => {
                const startWeather = weatherTimeline?.points.find((p) => p.pointType === 'START');
                return startWeather ? (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1">
                        <span>{getWeatherEmoji(startWeather.weatherCode, startWeather.thunderstorm)}</span>
                        <span>{Math.round(startWeather.temperature)}°C</span>
                      </span>
                      <span className={startWeather.precipitationProbability >= 30 ? 'text-rose-600' : 'text-slate-600'}>
                        {startWeather.precipitationProbability}% Rain
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {startWeather.weatherCondition} &bull; Wind {Math.round(startWeather.windSpeed)} km/h
                    </p>
                  </div>
                ) : null;
              })()}
            </div>
          </Popup>
        </Marker>

        {/* 4. User Intermediate Stops */}
        {selectedRoute?.stops.map((stop) => {
          const stopWeather = weatherTimeline?.points.find(
            (p) => p.pointType === 'STOP' && p.sequence === stop.sequence,
          );
          return (
            <Marker
              key={`stop-${stop.id}`}
              position={[stop.latitude, stop.longitude]}
              icon={createStopIcon(stop.sequence)}
            >
              <Popup>
                <div className="text-xs font-medium text-slate-900">
                  <span className="font-bold text-amber-600 uppercase text-[10px]">User Stop {stop.sequence}</span>
                  <p className="mt-0.5">{stop.name}</p>
                  {stop.estimatedArrival && (
                    <p className="text-slate-500 mt-1">
                      ETA: {new Date(stop.estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  {stopWeather && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1">
                          <span>{getWeatherEmoji(stopWeather.weatherCode, stopWeather.thunderstorm)}</span>
                          <span>{Math.round(stopWeather.temperature)}°C</span>
                        </span>
                        <span className={stopWeather.precipitationProbability >= 30 ? 'text-rose-600' : 'text-slate-600'}>
                          {stopWeather.precipitationProbability}% Rain
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {stopWeather.weatherCondition} &bull; Wind {Math.round(stopWeather.windSpeed)} km/h
                      </p>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 5. Smart Travel-Time Checkpoints */}
        {selectedRoute?.checkpoints.map((cp) => {
          const cpWeather = weatherTimeline?.points.find((p) => p.pointId === cp.id);
          return (
            <Marker
              key={`cp-${cp.id}`}
              position={[cp.latitude, cp.longitude]}
              icon={createCheckpointIcon(cp.sequence)}
            >
              <Popup>
                <div className="text-xs font-medium text-slate-900">
                  <span className="font-bold text-cyan-700 uppercase text-[10px]">
                    Checkpoint &bull; ~{Math.round(cp.elapsedTravelTimeSeconds / 60)} min
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">{cp.name}</p>
                  <p className="text-slate-500 mt-1">
                    ETA: {new Date(cp.estimatedArrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' '}&bull; {(cp.distanceFromStartMeters / 1000).toFixed(0)} km from start
                  </p>
                  {cpWeather && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1">
                          <span>{getWeatherEmoji(cpWeather.weatherCode, cpWeather.thunderstorm)}</span>
                          <span>{Math.round(cpWeather.temperature)}°C</span>
                        </span>
                        <span className={cpWeather.precipitationProbability >= 30 ? 'text-rose-600' : 'text-slate-600'}>
                          {cpWeather.precipitationProbability}% Rain
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {cpWeather.weatherCondition} &bull; Wind {Math.round(cpWeather.windSpeed)} km/h
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        Forecast matched for ~{new Date(cpWeather.forecastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {(() => {
                        const cpRisk = riskAnalysis?.checkpoints.find((c) => c.checkpointId === cp.id);
                        return cpRisk ? (
                          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-semibold">Safety Score</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                cpRisk.level === 'GREEN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : cpRisk.level === 'YELLOW'
                                  ? 'bg-amber-100 text-amber-800'
                                  : cpRisk.level === 'ORANGE'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {cpRisk.score}/100 ({cpRisk.level})
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 6. Destination Marker */}
        <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
          <Popup>
            <div className="text-xs font-medium text-slate-900">
              <span className="font-bold text-rose-600 uppercase text-[10px]">Destination</span>
              <p className="mt-0.5">{destination.name}</p>
              {selectedRoute && (
                <p className="text-slate-500 mt-1">
                  Arrival ETA: {new Date(selectedRoute.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {(() => {
                const destWeather = weatherTimeline?.points.find((p) => p.pointType === 'DESTINATION');
                return destWeather ? (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1">
                        <span>{getWeatherEmoji(destWeather.weatherCode, destWeather.thunderstorm)}</span>
                        <span>{Math.round(destWeather.temperature)}°C</span>
                      </span>
                      <span className={destWeather.precipitationProbability >= 30 ? 'text-rose-600' : 'text-slate-600'}>
                        {destWeather.precipitationProbability}% Rain
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {destWeather.weatherCondition} &bull; Wind {Math.round(destWeather.windSpeed)} km/h
                    </p>
                  </div>
                ) : null;
              })()}
            </div>
          </Popup>
        </Marker>

        {/* 7. Places Along Route Corridor */}
        {places.map((place) => {
          const catConfig = getCategoryConfig(place.category);
          const iconEmoji = catConfig?.icon ?? '📍';
          const isAlreadyStop = (stops ?? []).some(
            (s) =>
              (place.placeId && s.placeId === place.placeId) ||
              (Math.abs(s.lat - place.latitude) < 0.0015 && Math.abs(s.lng - place.longitude) < 0.0015),
          );

          return (
            <Marker
              key={`place-${place.placeId}`}
              position={[place.latitude, place.longitude]}
              icon={createPlaceIcon(iconEmoji)}
            >
              <Popup maxWidth={280} minWidth={220} className="bicast-place-popup">
                <PlaceCard
                  place={place}
                  isAlreadyStop={isAlreadyStop}
                  onAddAsStop={onAddPlaceAsStop}
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
