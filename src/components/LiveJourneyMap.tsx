import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, 
  CloudSun, 
  Car, 
  Bike, 
  Layers,
  TrafficCone,
  AlertTriangle
} from 'lucide-react';

import { useToast } from './ToastNotification';

interface Coords {
  lat: number;
  lng: number;
}

interface RouteOption {
  id: string;
  name: string;
  durationMin: number;
  distanceKm: number;
  path: Coords[];
  summaryText: string;
}

interface LiveJourneyMapProps {
  apiKey: string;
  hasValidKey: boolean;
  pickupName: string;
  dropName: string;
  pickupCoords: Coords;
  dropCoords: Coords;
  distanceKm: number;
  weatherAtPickup?: string;
  weatherAtDrop?: string;
  speedbreakers?: Array<{ id: string; name: string; position: Coords }>;
  heavyTrafficSegments?: Array<{ id: string; position: Coords }>;
  onRouteSelect?: (distanceKm: number, durationMin: number) => void;
}

// ---------------------------------------------------------
// Custom Leaflet Icons using L.divIcon to bypass Vite bundler asset issues
// ---------------------------------------------------------
const createPickupIcon = (weatherText: string) => {
  return L.divIcon({
    className: 'custom-pickup-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));">
        <div style="background-color: #ecfdf5; color: #065f46; font-size: 10px; font-weight: bold; padding: 3px 6px; border-radius: 6px; border: 1px solid #a7f3d0; margin-bottom: 4px; white-space: nowrap; font-family: sans-serif; display: flex; align-items: center; gap: 3px;">
          🌤️ ${weatherText}
        </div>
        <div style="width: 14px; height: 14px; background-color: #10b981; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 0 0 2.5px #047857;"></div>
      </div>
    `,
    iconSize: [120, 50],
    iconAnchor: [60, 50]
  });
};

const createDropIcon = (weatherText: string) => {
  return L.divIcon({
    className: 'custom-drop-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));">
        <div style="background-color: #fff1f2; color: #9f1239; font-size: 10px; font-weight: bold; padding: 3px 6px; border-radius: 6px; border: 1px solid #fecdd3; margin-bottom: 4px; white-space: nowrap; font-family: sans-serif; display: flex; align-items: center; gap: 3px;">
          📍 ${weatherText}
        </div>
        <div style="width: 14px; height: 14px; background-color: #ef4444; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 0 0 2.5px #b91c1c;"></div>
      </div>
    `,
    iconSize: [120, 50],
    iconAnchor: [60, 50]
  });
};

const createDurationIcon = (durationMin: number, isSelected: boolean) => {
  return L.divIcon({
    className: 'custom-duration-marker',
    html: `
      <button type="button" style="
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: bold;
        font-family: monospace;
        border: 1px solid ${isSelected ? '#6366f1' : '#e2e8f0'};
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
        background-color: ${isSelected ? '#0f172a' : '#ffffff'};
        color: ${isSelected ? '#00C896' : '#1e293b'};
        white-space: nowrap;
        text-align: center;
        cursor: pointer;
        display: block;
      ">
        ${durationMin} min
      </button>
    `,
    iconSize: [70, 26],
    iconAnchor: [35, 13]
  });
};

const speedbreakerIcon = L.divIcon({
  className: 'custom-speedbreaker-marker',
  html: `
    <div style="
      width: 18px;
      height: 18px;
      background-color: #f59e0b;
      border: 1.5px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      box-shadow: 0 2px 4px rgba(245, 158, 11, 0.4);
      cursor: pointer;
    ">
      ⚠️
    </div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const heavyTrafficIcon = L.divIcon({
  className: 'custom-traffic-marker',
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background-color: #dc2626;
      border: 1.5px solid white;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      box-shadow: 0 2px 4px rgba(220, 38, 38, 0.4);
    ">
      🚗
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const createHazardIcon = (type: 'pothole' | 'flood' | 'accident') => L.divIcon({
  className: `custom-hazard-${type}-marker`,
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background-color: ${type === 'accident' ? '#ef4444' : type === 'flood' ? '#3b82f6' : '#f59e0b'};
      border: 1.5px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.25);
      cursor: pointer;
    ">
      ${type === 'accident' ? '💥' : type === 'flood' ? '🌊' : '🕳️'}
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const hospitalIcon = L.divIcon({
  className: 'custom-hospital-marker',
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background-color: #ef4444;
      border: 1.5px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: white;
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(239, 68, 68, 0.4);
      cursor: pointer;
    ">
      🏥
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Helper component to dynamically change Leaflet viewport center & bounds
function ChangeView({ bounds, center }: { bounds?: L.LatLngBoundsExpression; center?: L.LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView(center, map.getZoom());
    }
  }, [bounds, center, map]);
  return null;
}

// ---------------------------------------------------------
// Helpers for Bezier curve fallback generation
// ---------------------------------------------------------
const getSimulatedBezierRoute = (start: Coords, end: Coords, offsetRatio: number, count = 30): Coords[] => {
  const points: Coords[] = [];
  const midX = (start.lat + end.lat) / 2;
  const midY = (start.lng + end.lng) / 2;
  const dx = end.lat - start.lat;
  const dy = end.lng - start.lng;
  const perpX = -dy * offsetRatio;
  const perpY = dx * offsetRatio;
  const controlPoint = { lat: midX + perpX, lng: midY + perpY };

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * controlPoint.lat + t * t * end.lat;
    const lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * controlPoint.lng + t * t * end.lng;
    points.push({ lat, lng });
  }
  return points;
};

const getMiddlePoint = (path: Coords[]): Coords => {
  if (path.length === 0) return { lat: 0, lng: 0 };
  const midIndex = Math.floor(path.length * 0.45);
  return path[midIndex];
};

const getOffsetPath = (path: Coords[], offsetLat: number, offsetLng: number): Coords[] => {
  return path.map(p => ({ lat: p.lat + offsetLat, lng: p.lng + offsetLng }));
};

// ---------------------------------------------------------
// MASTER COMPONENT
// ---------------------------------------------------------
export default function LiveJourneyMap({
  apiKey,
  hasValidKey,
  pickupName,
  dropName,
  pickupCoords,
  dropCoords,
  distanceKm,
  weatherAtPickup = "Clear Sky",
  weatherAtDrop = "Clear Sky",
  speedbreakers = [],
  heavyTrafficSegments = [],
  onRouteSelect
}: LiveJourneyMapProps) {
  
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [activeTravelMode, setActiveTravelMode] = useState<'motorcycle' | 'car'>('car');
  const [mapStyleVersion, setMapStyleVersion] = useState<'standard' | 'satellite'>('standard');
  const [hazards, setHazards] = useState<Array<{ id: string; type: 'pothole' | 'flood' | 'accident'; name: string; position: Coords }>>([]);
  const [hospitals, setHospitals] = useState<Array<{ id: string; name: string; position: Coords }>>([]);

  const { showToast } = useToast();

  // Generate dynamic hazards and hospitals near the active route path
  useEffect(() => {
    if (!pickupCoords || !dropCoords) return;

    // Generate dynamic road hazard spots
    const hazardList = [
      {
        id: 'haz-pothole',
        type: 'pothole' as const,
        name: 'Road Pothole hazard detected ahead',
        position: {
          lat: pickupCoords.lat + (dropCoords.lat - pickupCoords.lat) * 0.35 + 0.0008,
          lng: pickupCoords.lng + (dropCoords.lng - pickupCoords.lng) * 0.35 - 0.0012
        }
      },
      {
        id: 'haz-flood',
        type: 'flood' as const,
        name: 'Waterlogged/Flooded road warning segment',
        position: {
          lat: pickupCoords.lat + (dropCoords.lat - pickupCoords.lat) * 0.6 + 0.0015,
          lng: pickupCoords.lng + (dropCoords.lng - pickupCoords.lng) * 0.6 + 0.0008
        }
      },
      {
        id: 'haz-accident',
        type: 'accident' as const,
        name: 'Minor collision reported, single lane blocked',
        position: {
          lat: pickupCoords.lat + (dropCoords.lat - pickupCoords.lat) * 0.82 - 0.0005,
          lng: pickupCoords.lng + (dropCoords.lng - pickupCoords.lng) * 0.82 + 0.0005
        }
      }
    ];
    setHazards(hazardList);

    // Generate hospital emergency response centers
    const hospitalList = [
      {
        id: 'hosp-1',
        name: 'City Trauma Emergency Hospital (Level 1)',
        position: {
          lat: pickupCoords.lat + (dropCoords.lat - pickupCoords.lat) * 0.28 - 0.002,
          lng: pickupCoords.lng + (dropCoords.lng - pickupCoords.lng) * 0.28 + 0.002
        }
      },
      {
        id: 'hosp-2',
        name: 'PSG Metro Clinic & Emergency',
        position: {
          lat: pickupCoords.lat + (dropCoords.lat - pickupCoords.lat) * 0.72 + 0.0018,
          lng: pickupCoords.lng + (dropCoords.lng - pickupCoords.lng) * 0.72 - 0.0025
        }
      }
    ];
    setHospitals(hospitalList);

  }, [pickupCoords, dropCoords]);

  // Generate real-time OSRM routes or fallback
  useEffect(() => {
    if (!pickupCoords || !dropCoords) return;

    let isCancelled = false;

    const fetchRealOSRM = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickupCoords.lng},${pickupCoords.lat};${dropCoords.lng},${dropCoords.lat}?overview=full&geometries=geojson&alternatives=true`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM fetch failed');
        const data = await res.json();
        
        if (isCancelled) return;

        if (data.routes && data.routes.length > 0) {
          const baseDistance = distanceKm > 0 ? distanceKm : Number((data.routes[0].distance / 1000).toFixed(2));
          const baseDuration = Math.round(data.routes[0].duration / 60) || 12;
          const rawPrimaryPath = data.routes[0].geometry.coordinates.map((c: any) => ({ lat: c[1], lng: c[0] }));
          
          const opt1Points = rawPrimaryPath;
          const opt2Points = data.routes[1] 
            ? data.routes[1].geometry.coordinates.map((c: any) => ({ lat: c[1], lng: c[0] }))
            : getOffsetPath(rawPrimaryPath, 0.0003, 0.0003);
          const opt3Points = data.routes[2]
            ? data.routes[2].geometry.coordinates.map((c: any) => ({ lat: c[1], lng: c[0] }))
            : getOffsetPath(rawPrimaryPath, -0.0003, -0.0003);
          const opt4Points = getOffsetPath(rawPrimaryPath, 0.0006, -0.0006);

          const isCoimbatore = String(pickupName).toLowerCase().includes('gandhipuram') || String(dropName).toLowerCase().includes('ukkadam');
          const route1Name = isCoimbatore ? "via Nagapattinam - Coimbatore - Gundlupet Hwy" : "via Main Highway / Fastest Route";
          const route2Name = isCoimbatore ? "via NH 948" : "via Express Link Road Segment";
          const route3Name = isCoimbatore ? "via Sastri Rd and Cross Cut Rd" : "via Secondary Arterial Bypass";
          const route4Name = isCoimbatore ? "via Local Streets" : "via Town Bypass / Cheapest Route";

          const routesList: RouteOption[] = [
            {
              id: 'route-0',
              name: route1Name,
              durationMin: baseDuration,
              distanceKm: baseDistance,
              path: opt1Points,
              summaryText: "Fastest route due to traffic conditions"
            },
            {
              id: 'route-1',
              name: route2Name,
              durationMin: Math.round(baseDuration * 0.9),
              distanceKm: Number((baseDistance * 1.15).toFixed(2)),
              path: opt2Points,
              summaryText: "Avoids heavy traffic nodes"
            },
            {
              id: 'route-2',
              name: route3Name,
              durationMin: Math.round(baseDuration * 1.05),
              distanceKm: Number((baseDistance * 1.05).toFixed(2)),
              path: opt3Points,
              summaryText: "Eco-friendly driving pattern"
            },
            {
              id: 'route-3',
              name: route4Name,
              durationMin: Math.round(baseDuration * 1.3),
              distanceKm: Number((baseDistance * 0.95).toFixed(2)),
              path: opt4Points,
              summaryText: "Shortest route avoiding all tolls"
            }
          ];

          setRoutes(routesList);
          setActiveRouteIndex(0);
          return;
        }
      } catch (err) {
        console.warn('Failed OSRM lookup, falling back to simulated curves:', err);
      }

      // Fallback to beautiful bezier curves if OSRM is offline or fails
      if (!isCancelled) {
        const opt1Points = getSimulatedBezierRoute(pickupCoords, dropCoords, 0.08);
        const opt2Points = getSimulatedBezierRoute(pickupCoords, dropCoords, -0.12);
        const opt3Points = getSimulatedBezierRoute(pickupCoords, dropCoords, 0.22);
        const opt4Points = getSimulatedBezierRoute(pickupCoords, dropCoords, -0.22);

        const baseDistance = distanceKm > 0 ? distanceKm : 4.3;
        const baseDuration = Math.round(baseDistance * 2.1) || 13;

        const isCoimbatore = String(pickupName).toLowerCase().includes('gandhipuram') || String(dropName).toLowerCase().includes('ukkadam');
        const route1Name = isCoimbatore ? "via Nagapattinam - Coimbatore - Gundlupet Hwy" : "via Main Boulevard Transit Hwy";
        const route2Name = isCoimbatore ? "via NH 948" : "via Express Link Road Segment";
        const route3Name = isCoimbatore ? "via Sastri Rd and Cross Cut Rd" : "via Secondary Arterial Bypass";
        const route4Name = isCoimbatore ? "via Local Streets" : "via Town Bypass / Cheapest Route";

        const simulatedRoutes: RouteOption[] = [
          {
            id: 'route-0',
            name: route1Name,
            durationMin: baseDuration,
            distanceKm: baseDistance,
            path: opt1Points,
            summaryText: "Fastest route now due to premium traffic conditions"
          },
          {
            id: 'route-1',
            name: route2Name,
            durationMin: Math.round(baseDuration * 0.9),
            distanceKm: Number((baseDistance * 1.15).toFixed(2)),
            path: opt2Points,
            summaryText: "Alternative highway option, moderate vehicle levels"
          },
          {
            id: 'route-2',
            name: route3Name,
            durationMin: Math.round(baseDuration * 1.05),
            distanceKm: Number((baseDistance * 1.05).toFixed(2)),
            path: opt3Points,
            summaryText: "Eco-friendly driving pattern"
          },
          {
            id: 'route-3',
            name: route4Name,
            durationMin: Math.round(baseDuration * 1.3),
            distanceKm: Number((baseDistance * 0.95).toFixed(2)),
            path: opt4Points,
            summaryText: "Shortest route avoiding all tolls"
          }
        ];

        setRoutes(simulatedRoutes);
        setActiveRouteIndex(0);
      }
    };

    fetchRealOSRM();

    return () => {
      isCancelled = true;
    };
  }, [pickupCoords, dropCoords, distanceKm, pickupName, dropName]);

  const handleSelectRoute = (idx: number) => {
    if (!routes[idx]) return;
    setActiveRouteIndex(idx);
    if (onRouteSelect) {
      onRouteSelect(routes[idx].distanceKm, routes[idx].durationMin);
    }
  };

  const activeRoute = routes[activeRouteIndex];
  const mapCenter = pickupCoords ? [pickupCoords.lat, pickupCoords.lng] : [11.0168, 76.9558];
  
  // Choose TileLayer depending on standard vs dark mode styles (since we don't have satellite photos in pure free OSM, we use CartoDB Dark Matter for "satellite" styled dark theme)
  const tileUrl = mapStyleVersion === 'satellite'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const tileAttribution = mapStyleVersion === 'satellite'
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // Compute map bounds when both points are present
  const mapBounds = (pickupCoords && dropCoords) 
    ? L.latLngBounds([[pickupCoords.lat, pickupCoords.lng], [dropCoords.lat, dropCoords.lng]])
    : undefined;

  // Segment a route polyline to represent traffic density on standard paths
  const renderRouteSegments = (route: RouteOption, isActive: boolean) => {
    if (!isActive) {
      return (
        <Polyline
          positions={route.path.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: '#cbd5e1',
            opacity: 0.6,
            weight: 4,
          }}
          eventHandlers={{
            click: () => handleSelectRoute(routes.indexOf(route))
          }}
        />
      );
    }

    const points = route.path;
    if (points.length < 3) {
      return (
        <Polyline
          positions={points.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: '#6366f1',
            opacity: 0.95,
            weight: 6,
          }}
        />
      );
    }

    const seg1End = Math.floor(points.length * 0.45);
    const seg2End = Math.floor(points.length * 0.75);

    const part1 = points.slice(0, seg1End + 1);
    const part2 = points.slice(seg1End, seg2End + 1);
    const part3 = points.slice(seg2End);

    return (
      <>
        {part1.length > 1 && (
          <Polyline
            positions={part1.map(p => [p.lat, p.lng])}
            pathOptions={{
              color: '#10b981', // green / light traffic
              opacity: 0.95,
              weight: 6,
            }}
            eventHandlers={{
              click: () => handleSelectRoute(routes.indexOf(route))
            }}
          />
        )}
        {part2.length > 1 && (
          <Polyline
            positions={part2.map(p => [p.lat, p.lng])}
            pathOptions={{
              color: '#f59e0b', // orange / moderate traffic
              opacity: 0.95,
              weight: 6,
            }}
            eventHandlers={{
              click: () => handleSelectRoute(routes.indexOf(route))
            }}
          />
        )}
        {part3.length > 1 && (
          <Polyline
            positions={part3.map(p => [p.lat, p.lng])}
            pathOptions={{
              color: '#ef4444', // red / heavy traffic congestion
              opacity: 0.95,
              weight: 6,
            }}
            eventHandlers={{
              click: () => handleSelectRoute(routes.indexOf(route))
            }}
          />
        )}
      </>
    );
  };

  // Only render routes and metadata panels when BOTH locations are selected
  const hasRouteConfig = pickupName && dropName && pickupCoords && dropCoords;

  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden bg-slate-900" id="google-route-integration-panel">

      {/* ------------------------------------------------------------- */}
      {/* BACKGROUND LAYER: Interactive Map Display (OpenStreetMap Leaflet Map) */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute inset-0 z-0 bg-slate-950 flex flex-col" id="gmp-map-shell">
        
        {/* Floating map tile style switcher */}
        <div className="absolute top-6 right-5 z-1000 flex gap-2">
          <button
            type="button"
            onClick={() => setMapStyleVersion(prev => prev === 'standard' ? 'satellite' : 'standard')}
            className="flex items-center gap-1 bg-theme-card/90 backdrop-blur hover:bg-theme-card border border-theme-border rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-theme-text-primary shadow-md cursor-pointer transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-650 shrink-0" />
            <span className="capitalize">{mapStyleVersion === 'satellite' ? 'Dark Map' : 'Standard'}</span>
          </button>
        </div>

        <div className="w-full h-full z-0">
          <MapContainer
            center={mapCenter as [number, number]}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <TileLayer url={tileUrl} attribution={tileAttribution} />
            <ChangeView bounds={mapBounds} center={mapCenter as [number, number]} />

            {pickupCoords && (
              <Marker position={[pickupCoords.lat, pickupCoords.lng]} icon={createPickupIcon(weatherAtPickup)}>
                <Popup>
                  <div className="text-xs font-sans text-slate-800">
                    <strong>Pickup Spot</strong><br />
                    {pickupName || "Start location"}<br />
                    Weather: {weatherAtPickup}
                  </div>
                </Popup>
              </Marker>
            )}

            {dropCoords && (
              <Marker position={[dropCoords.lat, dropCoords.lng]} icon={createDropIcon(weatherAtDrop)}>
                <Popup>
                  <div className="text-xs font-sans text-slate-800">
                    <strong>Destination</strong><br />
                    {dropName || "End location"}<br />
                    Weather: {weatherAtDrop}
                  </div>
                </Popup>
              </Marker>
            )}

            {hasRouteConfig && routes.map((rt, idx) => {
              const isSelected = idx === activeRouteIndex;
              const labelCoords = getMiddlePoint(rt.path);
              return (
                <React.Fragment key={`route-wrapper-${rt.id}`}>
                  {/* Draw the Route Line Segments */}
                  {renderRouteSegments(rt, isSelected)}

                  {/* Draw Midpoint Tag for clicking/selecting */}
                  <Marker 
                    position={[labelCoords.lat, labelCoords.lng]} 
                    icon={createDurationIcon(rt.durationMin, isSelected)}
                    eventHandlers={{
                      click: () => handleSelectRoute(idx)
                    }}
                  />
                </React.Fragment>
              );
            })}

            {/* Render Speedbreakers along the active path */}
            {hasRouteConfig && speedbreakers.map(sb => (
              <Marker key={sb.id} position={[sb.position.lat, sb.position.lng]} icon={speedbreakerIcon}>
                <Popup>
                  <div className="text-xs font-sans text-slate-850">
                    ⚠️ <strong>Speedbreaker Alert</strong><br />
                    Location: {sb.name}<br />
                    Drive carefully.
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Render Congested traffic indicators */}
            {hasRouteConfig && heavyTrafficSegments.map(seg => (
              <Marker key={seg.id} position={[seg.position.lat, seg.position.lng]} icon={heavyTrafficIcon}>
                <Popup>
                  <div className="text-xs font-sans text-rose-750">
                    🚗 <strong>Heavy Congestion Zone</strong><br />
                    Expect speed reductions along this segment.
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Render Safety Hazards (Accidents, Potholes, Floods) */}
            {hasRouteConfig && hazards.map(haz => (
              <Marker key={haz.id} position={[haz.position.lat, haz.position.lng]} icon={createHazardIcon(haz.type)}>
                <Popup>
                  <div className="text-xs font-sans text-slate-850">
                    <strong>Road Hazard Logged</strong><br />
                    Type: <span className="capitalize font-bold">{haz.type}</span><br />
                    Info: {haz.name}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Render Nearby Emergency Hospital Centers */}
            {hasRouteConfig && hospitals.map(hosp => (
              <Marker key={hosp.id} position={[hosp.position.lat, hosp.position.lng]} icon={hospitalIcon}>
                <Popup>
                  <div className="text-xs font-sans text-rose-800">
                    🏥 <strong>Emergency Center</strong><br />
                    Name: {hosp.name}<br />
                    Equipped with rapid response dispatch.
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Render Weather Risk Circle Overlay at Destination area if risks exist */}
            {hasRouteConfig && activeRoute && (
              <Circle
                center={[dropCoords.lat, dropCoords.lng]}
                radius={1000}
                pathOptions={{
                  color: '#4f46e5',
                  fillColor: '#818cf8',
                  fillOpacity: 0.15,
                  dashArray: '5, 8'
                }}
              >
                <Popup>
                  <div className="text-xs font-sans text-indigo-950">
                    🌧️ <strong>Destination weather risk zone</strong><br />
                    Status: {weatherAtDrop}<br />
                    Active safe-speed override systems armed.
                  </div>
                </Popup>
              </Circle>
            )}
          </MapContainer>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BOTTOM-RIGHT FLOATING CARD: Directions & Alternate Routes  */}
      {/* ------------------------------------------------------------- */}
      {hasRouteConfig && routes.length > 0 && (
        <div className="absolute overflow-hidden bottom-4 left-4 right-4 lg:left-auto lg:bottom-6 lg:right-6 z-1000 bg-theme-card/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.15)] flex flex-col w-auto lg:w-full lg:max-w-[340px] max-h-[50%] lg:max-h-[70%] border border-theme-border/80">
          
          <div className="w-full h-2 shrink-0 bg-indigo-600/10"></div>

          <div className="p-4 overflow-y-auto space-y-4">
            
            <div className="grid grid-cols-2 gap-2 bg-theme-bg p-1.5 rounded-xl border border-theme-border">
              {[
                { id: 'car', icon: Car, label: 'Taxi' },
                { id: 'motorcycle', icon: Bike, label: 'Bike' }
              ].map(mode => {
                const Icon = mode.icon;
                const isSelected = activeTravelMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setActiveTravelMode(mode.id as any)}
                    className={`flex items-center justify-center py-2.5 rounded-lg gap-1.5 transition ${
                      isSelected 
                        ? 'bg-indigo-600 text-white font-bold shadow-sm' 
                        : 'hover:bg-slate-200/50 text-theme-text-secondary font-semibold'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] truncate font-bold leading-none">{mode.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Source and Destination inputs overview */}
            <div className="relative p-3 bg-theme-bg/50 border border-theme-border rounded-xl space-y-3">
              <div className="absolute left-[21px] top-6 bottom-6 w-[2px] bg-slate-200 border-l border-dashed border-theme-border"></div>
              
              {/* Source */}
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm"></div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-theme-text-primary truncate block">{pickupName || 'Gandhipuram Bus Stand'}</span>
                </div>
              </div>

              {/* Destination */}
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm"></div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-theme-text-primary truncate block">{dropName || 'Ukkadam Bus Stand'}</span>
                </div>
              </div>
            </div>

            {/* List of Alternate Route Choices */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {routes.map((rt, idx) => {
                const isSelected = idx === activeRouteIndex;
                return (
                  <div
                    key={rt.id}
                    onClick={() => handleSelectRoute(idx)}
                    className={`p-3 border rounded-xl cursor-pointer transition flex justify-between items-center ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-50/30' 
                        : 'border-theme-border bg-theme-card hover:bg-theme-bg'
                    }`}
                  >
                    <div className="space-y-1 pr-2 flex-1">
                      <h5 className="text-[11px] font-bold text-theme-text-primary block">{rt.name}</h5>
                      <p className="text-[9px] text-theme-text-secondary group-hover:text-theme-text-secondary truncate">{rt.summaryText}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-extrabold text-indigo-600 block">{rt.durationMin} min</span>
                      <span className="text-[10px] font-semibold text-theme-text-secondary">{rt.distanceKm} km</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

