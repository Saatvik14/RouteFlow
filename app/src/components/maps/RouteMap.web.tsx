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
  return `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;
}

function offsetMarkerCoordinate(point: RoutePoint, index: number, total: number): RoutePoint {
  if (total <= 1) return point;

  const radiusMeters = 18;
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const latitudeOffset = (Math.sin(angle) * radiusMeters) / 111_320;
  const longitudeScale = Math.max(
    0.01,
    Math.abs(Math.cos((point.latitude * Math.PI) / 180)),
  );
  const longitudeOffset =
    (Math.cos(angle) * radiusMeters) / (111_320 * longitudeScale);

  return {
    ...point,
    latitude: point.latitude + latitudeOffset,
    longitude: point.longitude + longitudeOffset,
  };
}

function buildDisplayMarkers(route: ConfirmedRoute): DisplayMarker[] {
  const markerItems = [
    {
      key: 'start',
      type: 'start' as const,
      point: route.start,
      label: route.start.markerLabel || 'S',
      icon: route.start.markerIcon || '⌂',
    },
    ...(route.stops || []).map(stop => ({
      key: `stop-${stop.id}`,
      type: 'stop' as const,
      point: stop,
      label: stop.markerLabel || String(stop.sequence),
      icon: stop.markerIcon || (stop.stopType === 'pickup' ? '↑' : '●'),
    })),
    {
      key: 'end',
      type: 'end' as const,
      point: route.end,
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

function createRouteMarkerIcon(marker: DisplayMarker) {
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

  const svg = marker.type === 'stop'
    ? `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="42" viewBox="0 0 64 42">
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.24"/>
        </filter>
        <g filter="url(#shadow)">
          <circle cx="21" cy="21" r="17" fill="${color}" stroke="#FFFFFF" stroke-width="3"/>
          <rect x="31" y="8" width="28" height="26" rx="13" fill="${badgeColor}"/>
          <text x="21" y="26" text-anchor="middle" font-size="13" font-family="Arial, sans-serif" font-weight="800" fill="#FFFFFF">${iconText}</text>
          <text x="45" y="26" text-anchor="middle" font-size="13" font-family="Arial, sans-serif" font-weight="800" fill="#FFFFFF">${label}</text>
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
          <text x="22" y="20" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" font-weight="800" fill="${color}">${iconText}</text>
          <text x="22" y="32" text-anchor="middle" font-size="11" font-family="Arial, sans-serif" font-weight="900" fill="${color}">${label}</text>
        </g>
      </svg>
    `;

  const size = marker.type === 'stop' ? [64, 42] : [44, 44];
  const anchor = marker.type === 'stop' ? [32, 21] : [22, 22];

  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, marker.type === 'stop' ? -24 : -26],
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

    return [
      confirmedRoute.start,
      ...(confirmedRoute.stops || []),
      confirmedRoute.end,
    ];
  }, [confirmedRoute]);

  const routeCoordinates = useMemo(() => {
    if (!confirmedRoute) return [];
    if (confirmedRoute.coordinates?.length) return confirmedRoute.coordinates;
    return routePoints;
  }, [confirmedRoute, routePoints]);

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
            <Polyline
              positions={leafletRouteCoordinates}
              pathOptions={{
                color: '#4285F4',
                weight: 6,
                opacity: 0.95,
              }}
            />

            {displayMarkers.map(marker => (
              <Marker
                key={marker.key}
                position={[
                  marker.coordinate.latitude,
                  marker.coordinate.longitude,
                ]}
                icon={createRouteMarkerIcon(marker)}>
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