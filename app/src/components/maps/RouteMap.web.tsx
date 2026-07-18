import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

let MapContainer: any;
let TileLayer: any;
let Marker: any;
let Popup: any;
let Polyline: any;
let useMap: any;
let L: any;

if (typeof window !== 'undefined') {
  const leaflet = require('react-leaflet');
  MapContainer = leaflet.MapContainer;
  TileLayer = leaflet.TileLayer;
  Marker = leaflet.Marker;
  Popup = leaflet.Popup;
  Polyline = leaflet.Polyline;
  useMap = leaflet.useMap;
  L = require('leaflet');
}

export type RouteMapType = 'standard' | 'satellite' | 'hybrid';

export type RoutePoint = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  markerType?: 'start' | 'stop' | 'end';
  markerLabel?: string;
  markerIcon?: string;
};

export type RouteStop = RoutePoint & {
  id: string;
  sequence: number;
  address?: string;
  notes?: string;
  packages?: number;
  order?: 'first' | 'auto' | 'last';
  stopType?: 'delivery' | 'pickup';
  status?: 'pending' | 'added';
};

export type ConfirmedRoute = {
  start: RoutePoint;
  end: RoutePoint;
  stops?: RouteStop[];
  coordinates?: RoutePoint[];
};

type MapScreenProps = {
  mapType?: RouteMapType;
  centerSignal?: number;
  confirmedRoute?: ConfirmedRoute | null;
  isNavigating?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
    heading: number | null;
  } | null;
};

const FALLBACK_REGION = {
  latitude: 28.6139,
  longitude: 77.209,
};

type DisplayMarker = {
  key: string;
  type: 'start' | 'stop' | 'end';
  point: RoutePoint | RouteStop;
  coordinate: RoutePoint;
  label: string;
  icon: string;
};

function getCoordinateKey(point: RoutePoint) {
  const lat = Number(point.latitude);
  const lon = Number(point.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return '0.0,0.0';
  }
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

function offsetMarkerCoordinate(point: RoutePoint, index: number, total: number): RoutePoint {
  if (total <= 1) return point;

  const lat = Number(point.latitude);
  const lon = Number(point.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return point;
  }

  const radiusMeters = 18;
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const latitudeOffset = (Math.sin(angle) * radiusMeters) / 111_320;
  const longitudeScale = Math.max(
    0.01,
    Math.abs(Math.cos((lat * Math.PI) / 180)),
  );
  const longitudeOffset =
    (Math.cos(angle) * radiusMeters) / (111_320 * longitudeScale);

  return {
    ...point,
    latitude: lat + latitudeOffset,
    longitude: lon + longitudeOffset,
  };
}

function buildDisplayMarkers(route: ConfirmedRoute): DisplayMarker[] {
  const markerItems = [
    {
      key: 'start',
      type: 'start' as const,
      point: {
        ...route.start,
        latitude: Number(route.start.latitude),
        longitude: Number(route.start.longitude),
      },
      label: route.start.markerLabel || 'S',
      icon: route.start.markerIcon || '⌂',
    },
    ...(route.stops || []).map(stop => ({
      key: `stop-${stop.id}`,
      type: 'stop' as const,
      point: {
        ...stop,
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
      },
      label: stop.markerLabel || String(stop.sequence),
      icon: stop.markerIcon || (stop.stopType === 'pickup' ? '↑' : '●'),
    })),
    {
      key: 'end',
      type: 'end' as const,
      point: {
        ...route.end,
        latitude: Number(route.end.latitude),
        longitude: Number(route.end.longitude),
      },
      label: route.end.markerLabel || 'E',
      icon: route.end.markerIcon || '⚑',
    },
  ];

  const grouped = markerItems.reduce<Record<string, typeof markerItems>>((acc, item) => {
    const key = getCoordinateKey(item.point);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return Object.values(grouped).flatMap(items =>
    items.map((item, index) => ({
      ...item,
      coordinate: offsetMarkerCoordinate(item.point, index, items.length),
    })),
  );
}

function getMarkerPopupText(marker: DisplayMarker) {
  return (
    marker.point.description ||
    marker.point.title ||
    (marker.type === 'start'
      ? 'Start location'
      : marker.type === 'end'
        ? 'End location'
        : `Stop ${marker.label}`)
  );
}

function createRouteMarkerIcon(marker: DisplayMarker, isOptimized: boolean) {
  if (!L) return undefined;

  const color =
    marker.type === 'start'
      ? '#2F76F6'
      : marker.type === 'end'
        ? '#22C55E'
        : '#111827';
  const badgeColor = marker.type === 'stop' ? '#2F76F6' : color;
  const label = String(marker.label || '').slice(0, 3);
  const iconText = String(marker.icon || '').slice(0, 2);

  const svg = (marker.type === 'stop' && isOptimized)
    ? `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="42" viewBox="0 0 64 42">
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.24"/>
        </filter>
        <g filter="url(#shadow)">
          <path d="M21 3C14.37 3 9 8.37 9 15c0 9 12 19.5 12 19.5s12-10.5 12-19.5c0-6.63-5.37-12-12-12z" fill="#EA4335" stroke="#FFFFFF" stroke-width="2.5"/>
          <circle cx="21" cy="15" r="4.5" fill="#B31412"/>
          <rect x="36" y="8" width="24" height="24" rx="12" fill="${badgeColor}"/>
          <text x="48" y="24" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" font-weight="800" fill="#FFFFFF">${label}</text>
        </g>
      </svg>
    `
    : marker.type === 'stop'
      ? `
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.24"/>
        </filter>
        <g filter="url(#shadow)">
          <path d="M22 2C15.37 2 10 7.37 10 14c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="#EA4335" stroke="#FFFFFF" stroke-width="2.5"/>
          <circle cx="22" cy="14" r="4.5" fill="#B31412"/>
        </g>
      </svg>
      `
      : `
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.22"/>
        </filter>
        <g filter="url(#shadow)">
          <circle cx="22" cy="22" r="19" fill="#FFFFFF" stroke="${color}" stroke-width="3"/>
          <text x="22" y="${isOptimized ? 20 : 27}" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" font-weight="800" fill="${color}">${iconText}</text>
          ${isOptimized ? `<text x="22" y="32" text-anchor="middle" font-size="11" font-family="Arial, sans-serif" font-weight="900" fill="${color}">${label}</text>` : ''}
        </g>
      </svg>
    `;

  const isStopWithBadge = marker.type === 'stop' && isOptimized;
  const size = isStopWithBadge ? [64, 42] : [44, 44];
  const anchor = isStopWithBadge ? [32, 21] : [22, 22];

  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, isStopWithBadge ? -24 : -26],
  });
}

function ChangeMapView({
  position,
  routeCoordinates,
  confirmedRoute,
  centerSignal,
  isNavigating = false,
  userLocation = null,
}: {
  position: { lat: number; lng: number };
  routeCoordinates: RoutePoint[];
  confirmedRoute?: ConfirmedRoute | null;
  centerSignal: number;
  isNavigating?: boolean;
  userLocation?: any;
}) {
  if (!useMap) return null;

  const map = useMap();

  useEffect(() => {
    if (isNavigating && userLocation) {
      map.setView([userLocation.latitude, userLocation.longitude], 17);
      return;
    }

    if (confirmedRoute && routeCoordinates.length) {
      const bounds = routeCoordinates.map(point => [
        point.latitude,
        point.longitude,
      ]);

      map.fitBounds(bounds, {
        paddingTopLeft: [70, 120],
        paddingBottomRight: [70, 390],
      });

      return;
    }

    map.setView([position.lat, position.lng], 13);
  }, [map, position.lat, position.lng, confirmedRoute, routeCoordinates, isNavigating, userLocation]);

  useEffect(() => {
    if (centerSignal > 0) {
      if (confirmedRoute && routeCoordinates.length) {
        const bounds = routeCoordinates.map(point => [
          point.latitude,
          point.longitude,
        ]);

        map.fitBounds(bounds, {
          paddingTopLeft: [70, 120],
          paddingBottomRight: [70, 390],
        });
      } else {
        map.setView([position.lat, position.lng], 13);
      }
    }
  }, [centerSignal, map, position.lat, position.lng, confirmedRoute, routeCoordinates]);

  return null;
}

export default function MapScreen({
  mapType = 'standard',
  centerSignal = 0,
  confirmedRoute = null,
  isNavigating = false,
  userLocation = null,
}: MapScreenProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number }>({
    lat: FALLBACK_REGION.latitude,
    lng: FALLBACK_REGION.longitude,
  });

  const currentLocationIcon = useMemo(() => {
    if (!L) return undefined;

    return L.divIcon({
      className: 'current-location-marker',
      html: '<div style="width:18px;height:18px;border-radius:9px;background:#2F76F6;border:3px solid #FFFFFF;box-shadow:0 2px 8px rgba(0,0,0,0.25);"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -14],
    });
  }, []);

  const routePoints = useMemo(() => {
    if (!confirmedRoute) return [];
    const points = [
      confirmedRoute.start,
      ...(confirmedRoute.stops || []),
      confirmedRoute.end,
    ];
    return points.map(p => ({
      ...p,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
    }));
  }, [confirmedRoute]);

  const routeCoordinates = useMemo(() => {
    if (!confirmedRoute) return [];
    const coords = confirmedRoute.coordinates?.length ? confirmedRoute.coordinates : routePoints;
    return coords.map(c => ({
      ...c,
      latitude: Number(c.latitude),
      longitude: Number(c.longitude),
    }));
  }, [confirmedRoute, routePoints]);

  const isOptimized = useMemo(() => {
    if (!confirmedRoute) return false;
    const pointsCount = 2 + (confirmedRoute.stops?.length || 0);
    return Boolean(confirmedRoute.coordinates && confirmedRoute.coordinates.length > pointsCount);
  }, [confirmedRoute]);

  const displayMarkers = useMemo(() => {
    if (!confirmedRoute) return [];
    return buildDisplayMarkers(confirmedRoute);
  }, [confirmedRoute]);

  const leafletRouteCoordinates = routeCoordinates.map(point => [
    point.latitude,
    point.longitude,
  ]);

  const moveToCurrentLocation = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setPosition({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.log('Location error:', error);
    }
  }, []);

  useEffect(() => {
    moveToCurrentLocation();
  }, [moveToCurrentLocation]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  const tileUrl =
    mapType === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  if (!MapContainer) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={13}
        maxZoom={18}
        style={styles.leafletMap}
        zoomControl={false}>
        <TileLayer
          url={tileUrl}
          attribution={
            mapType === 'satellite'
              ? '&copy; Esri'
              : '&copy; OpenStreetMap contributors'
          }
        />

        {confirmedRoute ? (
          <>
            {isOptimized && (
              <Polyline
                positions={leafletRouteCoordinates}
                pathOptions={{
                  color: '#4285F4',
                  weight: 6,
                  opacity: 0.95,
                }}
              />
            )}

            {displayMarkers.map(marker => (
              <Marker
                key={marker.key}
                position={[
                  marker.coordinate.latitude,
                  marker.coordinate.longitude,
                ]}
                icon={createRouteMarkerIcon(marker, isOptimized)}>
                <Popup>{getMarkerPopupText(marker)}</Popup>
              </Marker>
            ))}
          </>
        ) : (
          <Marker position={[position.lat, position.lng]} icon={currentLocationIcon}>
            <Popup>Your Location</Popup>
          </Marker>
        )}

        <ChangeMapView
          position={position}
          routeCoordinates={routeCoordinates}
          confirmedRoute={confirmedRoute}
          centerSignal={centerSignal}
          isNavigating={isNavigating}
          userLocation={userLocation}
        />
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  leafletMap: {
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: '#11151B',
  },
});